/**
 * Unit: CdcBridge translation (docs/CDC_PROTOCOL.md §5) against fake CDC and
 * NATS transports — device hello → ack, button → event publish, NATS display
 * command → render → echo → ok reply, timeout → DEVICE_TIMEOUT, and the
 * ack/bye lifecycle. Zero hardware.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CdcBridge, type CdcBridgeFacts } from "../../src/cdc/cdc-bridge.ts";
import type { CdcLineListener, CdcTransport } from "../../src/cdc/cdc-transport.ts";
import { serializeCdcMessage } from "../../src/cdc/cdc-protocol.ts";
import { VLinkRuntime } from "../../src/runtime.ts";
import type {
  CommandResult,
  Logger,
  MatterNodeInfo,
  NatsMessage,
  NatsStatus,
  NatsSubscription,
  NatsTransport,
  VLinkConfig,
  VLinkHealth,
} from "../../src/types.ts";
import { FakeMatterAdapter } from "../fixtures/fake-matter.ts";

const FABRIC = "fabric-0000000000000001";
const MAC = "b0:a6:04:8b:58:f8";
const NODE = "node-0000b0a6048b58f8";
const DISPLAY_SUBJECT = `iot.cmd.matter.${FABRIC}.${NODE}.1.display.>`;

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
    if (subjectTokens.length < wildcardIndex) return false;
    return patternTokens
      .slice(0, wildcardIndex)
      .every((token, index) => token === "*" || token === subjectTokens[index]);
  }
  return (
    patternTokens.length === subjectTokens.length &&
    patternTokens.every((token, index) => token === "*" || token === subjectTokens[index])
  );
}

interface Registration {
  handler: (error: Error | null, message: NatsMessage) => void;
  queue?: string;
}

class FakeNatsTransport implements NatsTransport {
  readonly url = "fake://vlink";
  readonly published: PublishedMessage[] = [];
  readonly subscriptions = new Map<string, Registration>();
  private readonly waiters: PublishWaiter[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async close(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  publish(subject: string, data: Uint8Array, options?: { reply?: string }): void {
    const message: PublishedMessage = options?.reply ? { subject, data, reply: options.reply } : { subject, data };
    this.published.push(message);
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate(message)) continue;
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    }
  }

  async subscribe(
    subject: string,
    handler: (error: Error | null, message: NatsMessage) => void,
    options?: { queue?: string },
  ): Promise<NatsSubscription> {
    this.subscriptions.set(subject, { handler, queue: options?.queue });
    return {
      unsubscribe: () => {
        this.subscriptions.delete(subject);
      },
    };
  }

  async flush(): Promise<void> {}

  onStatus(_listener: (status: NatsStatus, error?: Error) => void): () => void {
    return () => {};
  }

  nextPublish(predicate: (message: PublishedMessage) => boolean): Promise<PublishedMessage> {
    const existing = this.published.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      this.waiters.push({ predicate, resolve });
    });
  }

  deliver(subject: string, body: string | Uint8Array, reply?: string): void {
    const data = typeof body === "string" ? encoder.encode(body) : body;
    const message: NatsMessage = reply ? { subject, data, reply } : { subject, data };
    for (const [pattern, registration] of this.subscriptions) {
      if (subjectMatches(pattern, subject)) {
        registration.handler(null, message);
      }
    }
  }
}

interface WriteWaiter {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
}

class FakeCdcTransport implements CdcTransport {
  readonly written: string[] = [];
  private readonly waiters: WriteWaiter[] = [];
  private listener: CdcLineListener | undefined;
  private opened = false;
  private readonly openWaiters: Array<() => void> = [];

  constructor(private available = true) {}

  /** Simulate the board being plugged in after start(). */
  plugIn(): void {
    this.available = true;
  }

  /** Resolves after the next open() call completes. */
  nextOpen(): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.openWaiters.push(resolve);
    return promise;
  }

  async open(): Promise<boolean> {
    this.opened = this.available;
    if (this.available) {
      for (const resolve of this.openWaiters.splice(0)) resolve();
    }
    return this.available;
  }

  async close(): Promise<void> {
    this.opened = false;
  }

  isOpen(): boolean {
    return this.opened;
  }

  onLine(listener: CdcLineListener): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  writeLine(line: string): void {
    if (!this.opened) throw new Error("cdc transport is not open");
    this.written.push(line);
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate(line)) continue;
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(line);
    }
  }

  /** Device → host: deliver one CDC line into the bridge. */
  receive(line: string): void {
    this.listener?.(line);
  }

  nextWrite(predicate: (line: string) => boolean): Promise<string> {
    const existing = this.written.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      this.waiters.push({ predicate, resolve });
    });
  }
}

function deviceLine(message: Parameters<typeof serializeCdcMessage>[0]): string {
  return serializeCdcMessage(message);
}

function parseJson<T>(data: Uint8Array | string): T {
  const text = typeof data === "string" ? data : decoder.decode(data);
  return JSON.parse(text) as T;
}

function displayCommandPayload(action: string, args: Record<string, unknown>, requestId?: string): string {
  return JSON.stringify({
    v: 1,
    type: "command",
    ...(requestId !== undefined ? { requestId } : {}),
    nodeId: NODE,
    endpointId: 1,
    cluster: "display",
    command: action,
    args,
  });
}

let replySequence = 0;

function nextReplySubject(): string {
  replySequence += 1;
  return `_INBOX.vlinkcdc.${replySequence}`;
}

/** Deliver a display request; the promise resolves with the bridge's reply. */
function deliverDisplay(action: string, args: Record<string, unknown>, requestId?: string): Promise<CommandResult> {
  const reply = nextReplySubject();
  const replyPromise = nats.nextPublish((m) => m.subject === reply);
  nats.deliver(
    `iot.cmd.matter.${FABRIC}.${NODE}.1.display.${action}`,
    displayCommandPayload(action, args, requestId),
    reply,
  );
  return replyPromise.then((message) => parseJson<CommandResult>(message.data));
}

let nats: FakeNatsTransport;
let cdc: FakeCdcTransport;
let bridge: CdcBridge;

beforeEach(async () => {
  nats = new FakeNatsTransport();
  await nats.connect();
  cdc = new FakeCdcTransport(true);
  bridge = new CdcBridge({
    transport: cdc,
    nats,
    fabricId: FABRIC,
    instanceId: "test-host",
    logger: silentLogger,
    queue: "vlink",
    echoTimeoutMs: 25,
  });
});

afterEach(async () => {
  await bridge.stop();
  await nats.close();
});

async function startWithHello(): Promise<void> {
  await bridge.start();
  cdc.receive(deviceLine({ type: "hello", device: "vlink-c6", fw: "1.2.3", mac: MAC }));
}

describe("CdcBridge lifecycle", () => {
  test("start acks the device; hello acks again and subscribes display (no queue — the router must not steal it)", async () => {
    await bridge.start();
    expect(cdc.written).toEqual([
      serializeCdcMessage({ type: "ack", fabric: FABRIC, instance: "test-host" }),
    ]);

    cdc.receive(deviceLine({ type: "hello", device: "vlink-c6", fw: "1.2.3", mac: MAC }));
    expect(cdc.written[1]).toBe(serializeCdcMessage({ type: "ack", fabric: FABRIC, instance: "test-host" }));

    expect(nats.subscriptions.get(DISPLAY_SUBJECT)?.queue).toBeUndefined();
    expect(bridge.status()).toEqual({ connected: true, node: NODE });
  });

  test("a missing device degrades to connected:false without throwing", async () => {
    const absent = new FakeCdcTransport(false);
    const idleBridge = new CdcBridge({
      transport: absent,
      nats,
      fabricId: FABRIC,
      instanceId: "test-host",
      logger: silentLogger,
    });
    await idleBridge.start();
    expect(idleBridge.status()).toEqual({ connected: false });
    await idleBridge.stop();
  });

  test("stop sends bye, unsubscribes, and settles a pending render with DEVICE_TIMEOUT", async () => {
    await startWithHello();
    const reply = nextReplySubject();
    const replyPromise = nats.nextPublish((message) => message.subject === reply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.ticker`,
      displayCommandPayload("ticker", { text: "waiting" }),
      reply,
    );
    await cdc.nextWrite((line) => line.includes('"type":"render"'));

    const stopped = bridge.stop();
    const result = parseJson<CommandResult>((await replyPromise).data);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DEVICE_TIMEOUT");
    await stopped;

    expect(cdc.written.at(-1)).toBe(serializeCdcMessage({ type: "bye" }));
    expect(nats.subscriptions.size).toBe(0);
    expect(bridge.status()).toEqual({ connected: false });
  });
});

describe("CdcBridge hot-plug supervision and OMP-status sync", () => {
  test("a device plugged in after start is discovered by the supervisor and acked", async () => {
    const late = new FakeCdcTransport(false);
    const lateBridge = new CdcBridge({
      transport: late,
      nats,
      fabricId: FABRIC,
      instanceId: "test-host",
      logger: silentLogger,
      superviseMs: 10,
      statusIntervalMs: 10,
      heartbeatTtlMs: 10,
    });
    await lateBridge.start();
    expect(late.isOpen()).toBe(false);

    // The board appears (hot-plug): the supervisor's next pass opens and acks.
    late.plugIn();
    // Await the ack line itself, not a guessed delay: it is written
    // synchronously after the supervisor's open resolves.
    const ackLine = late.nextWrite((line) => line.includes('"type":"ack"'));
    await late.nextOpen();
    await ackLine;
    expect(late.isOpen()).toBe(true);
    expect(late.written).toContain(serializeCdcMessage({ type: "ack", fabric: FABRIC, instance: "test-host" }));
    await lateBridge.stop();
  });

  test("the status line tracks live agents from heartbeats and lands on the device", async () => {
    await startWithHello();
    // Two agents beat, one goes silent past the TTL.
    nats.deliver("agents.hb.agent1.owner1.s1", "{}");
    nats.deliver("agents.hb.agent2.owner2.s2", "{}");
    await bridge.syncStatusForTest();
    const statusRender = cdc.written.find((line) => line.includes('"zone":"status"'));
    expect(statusRender).toBeDefined();
    expect(statusRender).toContain("awake · 2 friends");
    expect(statusRender).toContain('"tone":"green"');

    // All agents silent → amber waiting line, and no duplicate render while unchanged.
    const renderCount = cdc.written.filter((line) => line.includes('"zone":"status"')).length;
    await bridge.syncStatusForTest();
    await bridge.syncStatusForTest();
    expect(cdc.written.filter((line) => line.includes('"zone":"status"')).length).toBe(renderCount);
  });
});

describe("CdcBridge device → NATS", () => {
  test("button press publishes an event on iot.event.matter", async () => {
    await startWithHello();
    cdc.receive(deviceLine({ type: "button", button: "boot", press: "short" }));
    const message = await nats.nextPublish((m) => m.subject === `iot.event.matter.${FABRIC}.${NODE}.1.button.boot`);
    const payload = parseJson<{
      v: number;
      type: string;
      event: string;
      data: { button: string };
      timestamp: number;
    }>(message.data);
    expect(payload).toMatchObject({
      v: 1,
      type: "event",
      event: "shortPress",
      data: { button: "boot" },
    });
    expect(typeof payload.timestamp).toBe("number");
  });

  test("aux long press maps to longPress on the aux subject", async () => {
    await startWithHello();
    cdc.receive(deviceLine({ type: "button", button: "aux", press: "long" }));
    const message = await nats.nextPublish((m) => m.subject === `iot.event.matter.${FABRIC}.${NODE}.1.button.aux`);
    expect(parseJson<{ event: string }>(message.data).event).toBe("longPress");
  });

  test("state, telemetry, and tick publish attributes on iot.matter", async () => {
    await startWithHello();
    cdc.receive(deviceLine({ type: "state", state: "idle" }));
    cdc.receive(deviceLine({ type: "telemetry", key: "rssi", value: -62 }));
    cdc.receive(deviceLine({ type: "tick", uptimeS: 30, heapFree: 100000 }));

    const state = await nats.nextPublish((m) => m.subject === `iot.matter.${FABRIC}.${NODE}.1.device.state`);
    expect(parseJson<{ type: string; value: unknown; source: string }>(state.data)).toMatchObject({
      type: "attribute",
      value: "idle",
      source: "subscription",
    });

    const rssi = await nats.nextPublish((m) => m.subject === `iot.matter.${FABRIC}.${NODE}.1.device.rssi`);
    expect(parseJson<{ value: unknown }>(rssi.data).value).toBe(-62);

    const heartbeat = await nats.nextPublish((m) => m.subject === `iot.matter.${FABRIC}.${NODE}.1.device.heartbeat`);
    expect(parseJson<{ value: unknown }>(heartbeat.data).value).toEqual({ uptimeS: 30, heapFree: 100000 });
  });

  test("device lines before hello are dropped silently", async () => {
    await bridge.start();
    cdc.receive(deviceLine({ type: "button", button: "boot", press: "short" }));
    expect(nats.published).toEqual([]);
  });

  test("malformed and unknown device lines never throw; the bridge keeps translating", async () => {
    await startWithHello();
    cdc.receive("this is not json");
    cdc.receive('{"v":1,"type":"fromTheFuture","x":1}');
    cdc.receive(deviceLine({ type: "button", button: "boot", press: "short" }));
    const message = await nats.nextPublish((m) => m.subject === `iot.event.matter.${FABRIC}.${NODE}.1.button.boot`);
    expect(parseJson<{ event: string }>(message.data).event).toBe("shortPress");
  });

  test("publishes are dropped while NATS is disconnected", async () => {
    await startWithHello();
    await nats.close();
    cdc.receive(deviceLine({ type: "button", button: "boot", press: "short" }));
    expect(nats.published).toEqual([]);
  });
});

describe("CdcBridge NATS → device", () => {
  test("display render command → render line with id → device echo → ok reply", async () => {
    await startWithHello();
    const reply = nextReplySubject();
    const replyPromise = nats.nextPublish((m) => m.subject === reply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.status`,
      displayCommandPayload("status", { text: "awake · 13 friends", tone: "green" }, "req-1"),
      reply,
    );

    const renderLine = await cdc.nextWrite((line) => line.includes('"type":"render"'));
    const render = parseJson<{ zone: string; text: string; tone: string; id: string }>(renderLine);
    expect(render.zone).toBe("status");
    expect(render.text).toBe("awake · 13 friends");
    expect(render.tone).toBe("green");
    expect(render.id.length).toBeGreaterThan(0);

    cdc.receive(deviceLine({ type: "echo", zone: "status", id: render.id }));
    const result = parseJson<CommandResult>((await replyPromise).data);
    expect(result.ok).toBe(true);
    expect(result.requestId).toBe("req-1");
    expect(result.command).toBe("status");
    expect(result.nodeId).toBe(NODE);
    expect(result.endpointId).toBe(1);
    expect(result.cluster).toBe("display");
  });

  test("activity and ticker renders carry their zone payloads and echo ok", async () => {
    await startWithHello();

    const activityReply = deliverDisplay("activity", { fraction: 0.46, tone: "amber" });
    const activityLine = await cdc.nextWrite((line) => line.includes('"zone":"activity"'));
    expect(parseJson<{ fraction: number; tone: string }>(activityLine)).toMatchObject({
      fraction: 0.46,
      tone: "amber",
    });
    cdc.receive(deviceLine({ type: "echo", zone: "activity", id: parseJson<{ id: string }>(activityLine).id }));
    expect((await activityReply).ok).toBe(true);

    const tickerReply = deliverDisplay("ticker", { text: "> onOff.toggle 42ms ok" });
    const tickerLine = await cdc.nextWrite((line) => line.includes('"zone":"ticker"'));
    expect(parseJson<{ text: string }>(tickerLine).text).toBe("> onOff.toggle 42ms ok");
    cdc.receive(deviceLine({ type: "echo", zone: "ticker", id: parseJson<{ id: string }>(tickerLine).id }));
    expect((await tickerReply).ok).toBe(true);
  });

  test("missing echo times out with DEVICE_TIMEOUT after the window", async () => {
    await startWithHello();
    const result = await deliverDisplay("ticker", { text: "never echoed" });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DEVICE_TIMEOUT");
    expect(result.error?.message).toContain("echo");
  });

  test("display notify sends an event line and replies ok immediately", async () => {
    await startWithHello();
    const result = await deliverDisplay("notify", { name: "build", text: "build finished in 4.2s" });
    expect(result.ok).toBe(true);
    expect(result.command).toBe("notify");
    const eventLine = await cdc.nextWrite((line) => line.includes('"type":"event"'));
    expect(parseJson<Record<string, unknown>>(eventLine)).toEqual({
      v: 1,
      type: "event",
      name: "build",
      text: "build finished in 4.2s",
    });
  });

  test("a display command after the device unplugged replies DEVICE_OFFLINE", async () => {
    await startWithHello();
    await cdc.close();
    const result = await deliverDisplay("status", { text: "hi", tone: "green" });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DEVICE_OFFLINE");
  });

  test("invalid zone payloads are rejected with PAYLOAD_INVALID", async () => {
    await startWithHello();
    const noTone = await deliverDisplay("status", { text: "hi" });
    expect(noTone.ok).toBe(false);
    expect(noTone.error?.code).toBe("PAYLOAD_INVALID");

    const badFraction = await deliverDisplay("activity", { fraction: 1.5 });
    expect(badFraction.ok).toBe(false);
    expect(badFraction.error?.code).toBe("PAYLOAD_INVALID");

    const noText = await deliverDisplay("ticker", {});
    expect(noText.ok).toBe(false);
    expect(noText.error?.code).toBe("PAYLOAD_INVALID");

    const noNotifyText = await deliverDisplay("notify", {});
    expect(noNotifyText.ok).toBe(false);
    expect(noNotifyText.error?.code).toBe("PAYLOAD_INVALID");
  });

  test("bridge-payload type mismatch and malformed subjects get error replies", async () => {
    await startWithHello();

    const reply = nextReplySubject();
    const replyPromise = nats.nextPublish((m) => m.subject === reply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.status`,
      JSON.stringify({ v: 1, type: "bridge", action: "status" }),
      reply,
    );
    const mismatch = parseJson<CommandResult>((await replyPromise).data);
    expect(mismatch.ok).toBe(false);
    expect(mismatch.error?.code).toBe("PAYLOAD_INVALID");

    const deepReply = nextReplySubject();
    const deepPromise = nats.nextPublish((m) => m.subject === deepReply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.status.extra`,
      displayCommandPayload("status", { text: "hi", tone: "green" }),
      deepReply,
    );
    const deep = parseJson<CommandResult>((await deepPromise).data);
    expect(deep.ok).toBe(false);
    expect(deep.error?.code).toBe("SUBJECT_INVALID");
  });
});

describe("CdcBridge §4 page sender", () => {
  const health = {
    v: 1,
    instanceId: "test-host",
    state: "ready",
    fabricId: FABRIC,
    natsUrl: "nats://127.0.0.1:14222",
    natsConnected: true,
    cdcConnected: true,
    matterMode: "sim",
    matterReady: true,
    bleAvailable: true,
    nodeCount: 0,
    startedAt: 0,
    uptimeMs: 1,
  } as const;

  function pageFacts(nodes: MatterNodeInfo[]): CdcBridgeFacts {
    return {
      listNodes: async () => nodes,
      health: () => health,
    };
  }

  /** Parse a written line as JSON (page renders are serialized CdcRenderMessage). */
  function writtenJson(line: string): { zone: string; id: string; screen?: string; state?: string } {
    return JSON.parse(line);
  }

  test("hello pushes pets + roads pages, echo-gated; re-push on change only", async () => {
    const facts = pageFacts([
      { fabricId: FABRIC, nodeId: "node-000000000000002a", nodeName: "millie", endpointIds: [1], connected: true },
    ]);
    bridge = new CdcBridge({
      transport: cdc,
      nats,
      fabricId: FABRIC,
      instanceId: "test-host",
      logger: silentLogger,
      queue: "vlink",
      echoTimeoutMs: 25,
      facts,
    });
    await bridge.start();
    // One live agent heartbeat BEFORE the hello: the AGENT road reads
    // "listening" (the syncPages pass triggered by hello must see it).
    nats.deliver("agents.hb.vizmaster.chance.vizmaster", encoder.encode("{}"));
    cdc.receive(deviceLine({ type: "hello", device: "vlink-c6", fw: "1.2.3", mac: MAC }));

    const petsLine = await cdc.nextWrite((line) => line.includes('"zone":"page"') && line.includes('"screen":"pets"'));
    const pets = writtenJson(petsLine);
    expect(pets.state).toBe("list");
    expect(petsLine).toContain('"key":"vlink"');
    expect(petsLine).toContain('"key":"millie"');
    expect(petsLine).toContain("usb · saying hi…");
    expect(petsLine).toContain("wifi · awake");
    // Echo it: no timeout warning path taken.
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: pets.id }));

    const roadsLine = await cdc.nextWrite((line) => line.includes('"zone":"page"') && line.includes('"screen":"roads"'));
    const roads = writtenJson(roadsLine);
    expect(roads.state).toBe("talking");
    expect(roadsLine).toContain('"key":"USB-C","value":"plugged in"');
    expect(roadsLine).toContain('"key":"AGENT","value":"listening"');
    expect(roadsLine).toContain('"key":"BLUETOOTH"');
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: roads.id }));

    // A tick makes the widget itself alive → pets page changes → re-pushed.
    cdc.receive(deviceLine({ type: "tick", uptimeS: 1, heapFree: 1000 }));
    const petsLine2 = await cdc.nextWrite(
      (line) => line.includes('"zone":"page"') && line.includes('"screen":"pets"') && line.includes("this is me!"),
    );
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: writtenJson(petsLine2).id }));
  });

  test("adopt window arms on commission start and clears on settle with a pets refresh", async () => {
    bridge = new CdcBridge({
      transport: cdc,
      nats,
      fabricId: FABRIC,
      instanceId: "test-host",
      logger: silentLogger,
      queue: "vlink",
      echoTimeoutMs: 25,
      facts: pageFacts([]),
    });
    await startWithHello();
    // Drain the initial page pushes.
    await cdc.nextWrite((line) => line.includes('"screen":"pets"'));
    await cdc.nextWrite((line) => line.includes('"screen":"roads"'));

    bridge.onCommissionStart();
    expect(cdc.written.at(-1)).toBe(serializeCdcMessage({ type: "event", name: "adopt-start" }));

    // While armed, roads re-renders as adopting (BLUETOOTH calling…).
    const adoptingLine = await cdc.nextWrite(
      (line) => line.includes('"screen":"roads"') && line.includes('"state":"adopting"'),
    );
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: writtenJson(adoptingLine).id }));

    bridge.onCommissionSettled();
    expect(cdc.written.at(-1)).toBe(serializeCdcMessage({ type: "event", name: "adopt-end" }));
    // Followed by a pets page push (§4: family list refresh on success).
    const petsRefresh = await cdc.nextWrite((line) => line.includes('"screen":"pets"'));
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: writtenJson(petsRefresh).id }));
  });

  test("NATS display.page command round-trips through the §4 codec", async () => {
    await startWithHello();
    const reply = nextReplySubject();
    const replyPromise = nats.nextPublish((message) => message.subject === reply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.page`,
      displayCommandPayload("page", {
        screen: "today",
        state: "quiet",
        rows: [{ key: "TODAY", value: "all quiet", tone: "green" }],
      }),
      reply,
    );
    const renderLine = await cdc.nextWrite((line) => line.includes('"zone":"page"'));
    expect(renderLine).toContain('"screen":"today"');
    cdc.receive(deviceLine({ type: "echo", zone: "page", id: writtenJson(renderLine).id }));
    const result = parseJson<CommandResult>((await replyPromise).data);
    expect(result.ok).toBe(true);

    // An invalid state is rejected before the wire.
    const badReply = nextReplySubject();
    const badPromise = nats.nextPublish((message) => message.subject === badReply);
    nats.deliver(
      `iot.cmd.matter.${FABRIC}.${NODE}.1.display.page`,
      displayCommandPayload("page", { screen: "pets", state: "nonsense", rows: [] }),
      badReply,
    );
    const bad = parseJson<CommandResult>((await badPromise).data);
    expect(bad.ok).toBe(false);
    expect(bad.error?.code).toBe("PAYLOAD_INVALID");
  });
});

describe("VLinkRuntime CDC wiring", () => {
  test("health reflects the bridge; stop is ordered before NATS closes", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "vlink-cdc-runtime-"));
    try {
      const config: VLinkConfig = {
        natsUrl: "nats://127.0.0.1:14222",
        natsName: "vlink-cdc-test",
        fabricId: FABRIC,
        fabricLabel: "VLink",
        stateDir,
        matterStorage: join(stateDir, "matter"),
        matterMode: "sim",
        bleEnabled: false,
        commandQueue: "vlink",
        healthIntervalMs: 0,
        reconnectWaitMs: 50,
        logLevel: "error",
        notifyEvents: false,
        instanceId: "cdc-runtime-test",
        defaultCommandTimeoutMs: 1_000,
        defaultCommissionTimeoutMs: 1_000,
        cdcEnabled: true,
      };
      const runtimeNats = new FakeNatsTransport();
      await runtimeNats.connect();
      const runtimeCdc = new FakeCdcTransport(true);
      const runtimeBridge = new CdcBridge({
        transport: runtimeCdc,
        nats: runtimeNats,
        fabricId: FABRIC,
        instanceId: config.instanceId,
        logger: silentLogger,
        queue: "vlink",
        echoTimeoutMs: 25,
      });
      const adapter = new FakeMatterAdapter({
        nodes: [{ nodeId: "node-000000000000002a", endpointIds: [1], connected: true }],
      });
      const runtime = new VLinkRuntime(config, silentLogger, {
        matter: adapter,
        transport: runtimeNats,
        cdc: runtimeBridge,
      });
      await runtime.start();

      const before: VLinkHealth = runtime.health();
      expect(before.cdcConnected).toBe(true);
      expect(before.cdcNode).toBeUndefined();

      runtimeCdc.receive(deviceLine({ type: "hello", device: "vlink-c6", fw: "1.2.3", mac: MAC }));
      const after: VLinkHealth = runtime.health();
      expect(after.cdcConnected).toBe(true);
      expect(after.cdcNode).toBe(NODE);

      await runtime.stop();
      expect(runtime.health().cdcConnected).toBe(false);
      expect(runtimeCdc.written.at(-1)).toBe(serializeCdcMessage({ type: "bye" }));
      expect(runtimeNats.isConnected()).toBe(false);
    } finally {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });

  test("an absent device leaves health at cdcConnected:false and the runtime ready", async () => {
    const stateDir = mkdtempSync(join(tmpdir(), "vlink-cdc-runtime-"));
    try {
      const config: VLinkConfig = {
        natsUrl: "nats://127.0.0.1:14222",
        natsName: "vlink-cdc-test",
        fabricId: FABRIC,
        fabricLabel: "VLink",
        stateDir,
        matterStorage: join(stateDir, "matter"),
        matterMode: "sim",
        bleEnabled: false,
        commandQueue: "vlink",
        healthIntervalMs: 0,
        reconnectWaitMs: 50,
        logLevel: "error",
        notifyEvents: false,
        instanceId: "cdc-runtime-test",
        defaultCommandTimeoutMs: 1_000,
        defaultCommissionTimeoutMs: 1_000,
        cdcEnabled: true,
      };
      const runtimeNats = new FakeNatsTransport();
      await runtimeNats.connect();
      const runtimeBridge = new CdcBridge({
        transport: new FakeCdcTransport(false),
        nats: runtimeNats,
        fabricId: FABRIC,
        instanceId: config.instanceId,
        logger: silentLogger,
      });
      const adapter = new FakeMatterAdapter({
        nodes: [{ nodeId: "node-000000000000002a", endpointIds: [1], connected: true }],
      });
      const runtime = new VLinkRuntime(config, silentLogger, {
        matter: adapter,
        transport: runtimeNats,
        cdc: runtimeBridge,
      });
      await runtime.start();
      expect(runtime.status().state).toBe("ready");
      const health = runtime.health();
      expect(health.cdcConnected).toBe(false);
      expect(health.cdcNode).toBeUndefined();
      await runtime.stop();
    } finally {
      rmSync(stateDir, { recursive: true, force: true });
    }
  });
});
