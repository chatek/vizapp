/**
 * Unit: command router against a fake transport and the shared fake Matter
 * adapter. No NATS, no Matter.js, no timers beyond the router's own deadline.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { CommandRouter } from "../../src/nats/command-router.ts";
import type {
  BridgeAction,
  BridgeCommandPayload,
  BridgeOperations,
  CommandResult,
  DeviceCommandPayload,
  Logger,
  MatterAttributeValue,
  MatterCommandResult,
  MatterCommissionRequest,
  MatterDecommissionRequest,
  MatterDiscoveredDevice,
  MatterDiscoverRequest,
  MatterNodeInfo,
  MatterReadRequest,
  MatterWriteRequest,
  NatsMessage,
  NatsStatus,
  NatsSubscription,
  NatsTransport,
  VLinkHealth,
} from "../../src/types.ts";
import { FakeMatterAdapter } from "../fixtures/fake-matter.ts";

const FABRIC = "fabric-0000000000000001";
const NODE = "node-000000000000002a";
const NODE2 = "node-000000000000002b";
const UNKNOWN_NODE = "node-00000000000000ff";

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface PublishedMessage {
  subject: string;
  data: Uint8Array;
  reply?: string;
}

interface PublishWaiter {
  predicate: (message: PublishedMessage) => boolean;
  resolve: (message: PublishedMessage) => void;
}

function subjectMatches(pattern: string, subject: string): boolean {
  const patternTokens = pattern.split(".");
  const subjectTokens = subject.split(".");
  const wildcardIndex = patternTokens.indexOf(">");
  if (wildcardIndex >= 0) {
    if (subjectTokens.length < wildcardIndex) {
      return false;
    }
    return patternTokens
      .slice(0, wildcardIndex)
      .every((token, index) => token === "*" || token === subjectTokens[index]);
  }
  return (
    patternTokens.length === subjectTokens.length &&
    patternTokens.every((token, index) => token === "*" || token === subjectTokens[index])
  );
}

class FakeNatsTransport implements NatsTransport {
  readonly url = "fake://vlink";
  readonly published: PublishedMessage[] = [];
  private readonly handlers = new Map<string, (error: Error | null, message: NatsMessage) => void>();
  private readonly waiters: PublishWaiter[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  publish(subject: string, data: Uint8Array, options?: { reply?: string }): void {
    const message: PublishedMessage = options?.reply
      ? { subject, data, reply: options.reply }
      : { subject, data };
    this.published.push(message);
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate(message)) {
        continue;
      }
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    }
  }

  async subscribe(
    subject: string,
    handler: (error: Error | null, message: NatsMessage) => void,
  ): Promise<NatsSubscription> {
    this.handlers.set(subject, handler);
    return {
      unsubscribe: () => {
        this.handlers.delete(subject);
      },
    };
  }

  async flush(): Promise<void> {}

  onStatus(_listener: (status: NatsStatus, error?: Error) => void): () => void {
    return () => {};
  }

  nextPublish(predicate: (message: PublishedMessage) => boolean): Promise<PublishedMessage> {
    const existing = this.published.find(predicate);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      this.waiters.push({ predicate, resolve });
    });
  }

  deliver(subject: string, body: string | Uint8Array, reply?: string): void {
    const data = typeof body === "string" ? encoder.encode(body) : body;
    const message: NatsMessage = reply ? { subject, data, reply } : { subject, data };
    for (const [pattern, handler] of this.handlers) {
      if (subjectMatches(pattern, subject)) {
        handler(null, message);
      }
    }
  }
}

class FakeBridge implements BridgeOperations {
  constructor(private readonly adapter: FakeMatterAdapter) {}

  health(): VLinkHealth {
    return {
      v: 1,
      instanceId: "test-instance",
      state: "ready",
      fabricId: this.adapter.fabricId,
      natsUrl: "fake://vlink",
      natsConnected: true,
      cdcConnected: false,
      matterMode: "sim",
      matterReady: true,
      bleAvailable: false,
      nodeCount: this.adapter.nodes.size,
      uptimeMs: 1,
    };
  }

  listNodes(): Promise<MatterNodeInfo[]> {
    return this.adapter.listNodes();
  }

  discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    return this.adapter.discover(request);
  }

  commission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    return this.adapter.commission(request);
  }

  decommission(request: MatterDecommissionRequest): Promise<void> {
    return this.adapter.decommission(request);
  }

  read(request: MatterReadRequest): Promise<MatterAttributeValue> {
    return this.adapter.readAttribute(request);
  }

  write(request: MatterWriteRequest): Promise<MatterAttributeValue> {
    return this.adapter.writeAttribute(request);
  }
}

function deviceSubject(command = "toggle", cluster = "onOff", nodeId = NODE, endpointId = 1): string {
  return `iot.cmd.matter.${FABRIC}.${nodeId}.${endpointId}.${cluster}.${command}`;
}

function bridgeSubject(action: BridgeAction): string {
  return `iot.cmd.matter.${FABRIC}.bridge.${action}`;
}

function encode(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

function devicePayload(overrides: Partial<DeviceCommandPayload> = {}): DeviceCommandPayload {
  return {
    v: 1,
    type: "command",
    nodeId: NODE,
    endpointId: 1,
    cluster: "onOff",
    command: "toggle",
    ...overrides,
  };
}

function bridgePayload(action: BridgeAction, extra: Partial<BridgeCommandPayload> = {}): BridgeCommandPayload {
  return { v: 1, type: "bridge", action, ...extra };
}

function parseResult(message: PublishedMessage): CommandResult {
  return JSON.parse(decoder.decode(message.data)) as CommandResult;
}

let replySequence = 0;

function nextReplySubject(): string {
  replySequence += 1;
  return `_INBOX.vlinktest.${replySequence}`;
}

let transport: FakeNatsTransport;
let adapter: FakeMatterAdapter;
let router: CommandRouter;

async function send(
  subject: string,
  body: string | Uint8Array,
  reply: string | null = nextReplySubject(),
): Promise<CommandResult | undefined> {
  if (reply === null) {
    transport.deliver(subject, body);
    return undefined;
  }
  const replyPromise = transport.nextPublish((message) => message.subject === reply);
  transport.deliver(subject, body, reply);
  return parseResult(await replyPromise);
}

beforeEach(async () => {
  transport = new FakeNatsTransport();
  await transport.connect();
  adapter = new FakeMatterAdapter({
    nodes: [{ nodeId: NODE, endpointIds: [1], connected: true, nodeName: "desk-lamp" }],
    attributes: { [`${NODE}/1/onOff/onOff`]: false },
    commandResults: { [`${NODE}/1/onOff/toggle`]: { onOff: true } },
  });
  router = new CommandRouter({
    transport,
    matter: adapter,
    bridge: new FakeBridge(adapter),
    fabricId: FABRIC,
    logger: silentLogger,
    queue: "vlink-test",
    defaultTimeoutMs: 250,
  });
  await router.start();
});

afterEach(async () => {
  await router.stop();
  await transport.close();
});

describe("CommandRouter device commands", () => {
  test("success invokes the exact path and echoes requestId", async () => {
    const result = await send(deviceSubject(), encode(devicePayload({ requestId: "req-1" })));

    expect(result?.ok).toBe(true);
    expect(result?.requestId).toBe("req-1");
    expect(result?.data).toEqual({ onOff: true });
    expect(result?.durationMs).toBeGreaterThanOrEqual(0);
    expect(adapter.invocations.invokeCommand).toHaveLength(1);
    expect(adapter.invocations.invokeCommand[0]).toMatchObject({
      fabricId: FABRIC,
      nodeId: NODE,
      endpointId: 1,
      cluster: "onOff",
      command: "toggle",
      timeoutMs: 250,
    });
    expect(result!.startedAt).toBeLessThanOrEqual(result!.completedAt);
  });

  test("adapter failure becomes ok:false with the adapter error code", async () => {
    adapter.failNext("invokeCommand", { code: "MATTER_COMMAND_FAILED", message: "device said no" });

    const result = await send(deviceSubject(), encode(devicePayload({ requestId: "req-2" })));

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("MATTER_COMMAND_FAILED");
    expect(result?.error?.message).toBe("device said no");
    expect(result?.requestId).toBe("req-2");
  });

  test("executes a command with no reply subject and publishes nothing", async () => {
    await send(deviceSubject(), encode(devicePayload()), null);
    // One macrotask drains all pending microtasks in the async dispatch chain.
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(adapter.invocations.invokeCommand).toHaveLength(1);
    expect(transport.published).toHaveLength(0);
  });

  test("unknown node replies NODE_NOT_FOUND", async () => {
    const result = await send(
      deviceSubject("toggle", "onOff", UNKNOWN_NODE),
      encode(devicePayload({ nodeId: UNKNOWN_NODE })),
    );

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("NODE_NOT_FOUND");
  });

  test("router deadline replies COMMAND_TIMEOUT in bounded time", async () => {
    adapter.invokeCommand = () => new Promise<MatterCommandResult>(() => {});

    const result = await send(deviceSubject(), encode(devicePayload({ timeoutMs: 20 })));

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("COMMAND_TIMEOUT");
    expect(result?.durationMs).toBeLessThan(1_000);
  });

  test("malformed JSON replies PAYLOAD_INVALID without crashing", async () => {
    const result = await send(deviceSubject(), "{ this is not json");

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("PAYLOAD_INVALID");
    expect(adapter.invocations.invokeCommand).toHaveLength(0);
  });

  test("subject/payload mismatch replies PAYLOAD_INVALID", async () => {
    const result = await send(deviceSubject(), encode(devicePayload({ cluster: "levelControl" })));

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("PAYLOAD_INVALID");
    expect(adapter.invocations.invokeCommand).toHaveLength(0);
  });

  test("payload fabric that disagrees with the subject is rejected", async () => {
    const result = await send(
      deviceSubject(),
      encode(devicePayload({ fabricId: "fabric-0000000000000002" })),
    );

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("PAYLOAD_INVALID");
  });

  test("subject fabric outside the configured fabric is rejected", async () => {
    const result = await send(
      `iot.cmd.matter.fabric-0000000000000002.${NODE}.1.onOff.toggle`,
      encode(devicePayload()),
    );

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("PAYLOAD_INVALID");
  });
});

describe("CommandRouter bridge actions", () => {
  test("status returns the health payload", async () => {
    const result = await send(bridgeSubject("status"), encode(bridgePayload("status")));

    expect(result?.ok).toBe(true);
    expect(result?.action).toBe("status");
    expect(result?.data).toMatchObject({ state: "ready", instanceId: "test-instance" });
  });

  test("list returns nodes", async () => {
    const result = await send(bridgeSubject("list"), encode(bridgePayload("list")));

    expect(result?.ok).toBe(true);
    expect(result?.data).toMatchObject([{ nodeId: NODE, nodeName: "desk-lamp" }]);
  });

  test("discover returns discovered devices", async () => {
    const result = await send(
      bridgeSubject("discover"),
      encode(bridgePayload("discover", { timeoutMs: 100, transport: "ip" })),
    );

    expect(result?.ok).toBe(true);
    expect(Array.isArray(result?.data)).toBe(true);
    expect(adapter.invocations.discover).toHaveLength(1);
    expect(adapter.invocations.discover[0].transport).toBe("ip");
    expect(adapter.invocations.discover[0].timeoutMs).toBe(100);
  });

  test("commission invokes the adapter and returns node info", async () => {
    const result = await send(
      bridgeSubject("commission"),
      encode(
        bridgePayload("commission", {
          pairingCode: "34970112332",
          transport: "ip",
          nodeId: NODE2,
          nodeName: "lamp-2",
        }),
      ),
    );

    expect(result?.ok).toBe(true);
    expect(result?.data).toBeDefined();
    expect(adapter.invocations.commission).toHaveLength(1);
    expect(adapter.invocations.commission[0]).toMatchObject({ transport: "ip", pairingCode: "34970112332" });
    expect(adapter.nodes.size).toBe(2);
    expect(adapter.nodes.has(NODE2)).toBe(true);
  });

  test("read returns the attribute value", async () => {
    const result = await send(
      bridgeSubject("read"),
      encode(
        bridgePayload("read", { nodeId: NODE, endpointId: 1, cluster: "onOff", attribute: "onOff" }),
      ),
    );

    expect(result?.ok).toBe(true);
    expect(result?.data).toMatchObject({ value: false, cluster: "onOff", attribute: "onOff" });
  });

  test("write returns the written attribute value", async () => {
    const result = await send(
      bridgeSubject("write"),
      encode(
        bridgePayload("write", {
          nodeId: NODE,
          endpointId: 1,
          cluster: "onOff",
          attribute: "onOff",
          value: true,
        }),
      ),
    );

    expect(result?.ok).toBe(true);
    expect(result?.data).toMatchObject({ value: true });
    expect(adapter.attributeValue({ nodeId: NODE, endpointId: 1, cluster: "onOff", attribute: "onOff" })).toBe(
      true,
    );
  });

  test("unsupported write replies UNSUPPORTED_ATTRIBUTE", async () => {
    adapter.failNext("writeAttribute", { code: "UNSUPPORTED_ATTRIBUTE", message: "read-only attribute" });

    const result = await send(
      bridgeSubject("write"),
      encode(
        bridgePayload("write", {
          nodeId: NODE,
          endpointId: 1,
          cluster: "onOff",
          attribute: "onOff",
          value: true,
        }),
      ),
    );

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("UNSUPPORTED_ATTRIBUTE");
  });

  test("decommission invokes the adapter", async () => {
    const result = await send(
      bridgeSubject("decommission"),
      encode(bridgePayload("decommission", { nodeId: NODE })),
    );

    expect(result?.ok).toBe(true);
    expect(adapter.invocations.decommission).toHaveLength(1);
    expect(adapter.nodes.has(NODE)).toBe(false);
  });

  test("bridge action that disagrees with the subject is rejected", async () => {
    const result = await send(bridgeSubject("list"), encode(bridgePayload("status")));

    expect(result?.ok).toBe(false);
    expect(result?.error?.code).toBe("PAYLOAD_INVALID");
  });
});

describe("CommandRouter concurrency", () => {
  test("concurrent commands keep their replies separate", async () => {
    const ids = ["c0", "c1", "c2", "c3", "c4"];
    const results = await Promise.all(
      ids.map((requestId) => send(deviceSubject(), encode(devicePayload({ requestId })))),
    );

    expect(results.map((result) => result?.requestId)).toEqual(ids);
    expect(results.every((result) => result?.ok === true)).toBe(true);
    expect(adapter.invocations.invokeCommand).toHaveLength(ids.length);
  });
});
