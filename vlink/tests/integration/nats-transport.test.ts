/**
 * Integration: real nats-server, real wire.
 *
 * Skips (does not pass) when `nats-server` is not installed. Every server is
 * private, token-authenticated, temp-stored, and stopped in `afterEach`.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

import { NatsAuthError, NatsNotConnectedError, NodeNatsTransport } from "../../src/nats/transport.ts";
import type { Logger, NatsMessage, NatsStatus, VLinkConfig } from "../../src/types.ts";
import {
  isNatsServerAvailable,
  startNatsServer,
  type NatsServerHandle,
} from "../helpers/nats-server.ts";

const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};

function makeConfig(url: string, token: string, overrides: Partial<VLinkConfig> = {}): VLinkConfig {
  return {
    natsUrl: url,
    natsName: "vlink-test",
    natsToken: token,
    natsTokenFile: undefined,
    fabricLabel: "VLinkTest",
    stateDir: "/tmp/vlink-test-state",
    matterStorage: "/tmp/vlink-test-matter",
    matterMode: "off",
    bleEnabled: false,
    commandQueue: "vlink-test",
    healthIntervalMs: 0,
    reconnectWaitMs: 50,
    logLevel: "error",
    notifyEvents: false,
    instanceId: "test-instance",
    defaultCommandTimeoutMs: 1_000,
    defaultCommissionTimeoutMs: 1_000,
    cdcEnabled: false,
    ...overrides,
  };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(text: string): Uint8Array {
  return encoder.encode(text);
}

function decode(data: Uint8Array): string {
  return decoder.decode(data);
}

// Integration tests exercise a real broker and real reconnect timers, so
// deterministic fake time cannot replace the clock here. All polls are bounded.
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000, what = "condition"): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await delay(10);
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${what}`);
}

const servers: NatsServerHandle[] = [];
const transports: NodeNatsTransport[] = [];

async function startServer(options?: { port?: number; token?: string }): Promise<NatsServerHandle> {
  const server = await startNatsServer(options);
  servers.push(server);
  return server;
}

async function startTransport(config: VLinkConfig): Promise<NodeNatsTransport> {
  const transport = new NodeNatsTransport(config, silentLogger);
  transports.push(transport);
  await transport.connect();
  return transport;
}

afterEach(async () => {
  for (const transport of transports.splice(0)) {
    await transport.close();
  }
  for (const server of servers.splice(0)) {
    await server.stop();
  }
});

const describeNats = isNatsServerAvailable() ? describe : describe.skip;

describeNats("NodeNatsTransport (real nats-server)", () => {
  test("connects with the shared token", async () => {
    const server = await startServer();
    const transport = await startTransport(makeConfig(server.url, server.token));

    expect(transport.isConnected()).toBe(true);
    expect(transport.url).toBe(server.url);
  });

  test("surfaces a wrong token as NatsAuthError", async () => {
    const server = await startServer();
    const transport = new NodeNatsTransport(makeConfig(server.url, "not-the-token"), silentLogger);
    transports.push(transport);

    await expect(transport.connect()).rejects.toBeInstanceOf(NatsAuthError);
    expect(transport.isConnected()).toBe(false);
  });

  test("publishes bytes to a subscriber and stops after unsubscribe", async () => {
    const server = await startServer();
    const transport = await startTransport(makeConfig(server.url, server.token));

    const received: NatsMessage[] = [];
    const subscription = await transport.subscribe("iot.test.pub", (_error, message) => {
      received.push(message);
    });
    await transport.flush();

    const payload = encode(JSON.stringify({ hello: "world", n: 42 }));
    transport.publish("iot.test.pub", payload);
    await transport.flush();
    await waitFor(() => received.length === 1, 2_000, "published message");

    expect(received[0].subject).toBe("iot.test.pub");
    expect(Array.from(received[0].data)).toEqual(Array.from(payload));

    subscription.unsubscribe();
    transport.publish("iot.test.pub", encode("after-unsubscribe"));
    await transport.flush();
    // Proving a message was *not* delivered requires a bounded quiet window;
    // flush only guarantees the broker saw the publish, not the absence.
    await delay(100);
    expect(received).toHaveLength(1);
  });

  test("routes a reply through msg.reply", async () => {
    const server = await startServer();
    const transport = await startTransport(makeConfig(server.url, server.token));

    await transport.subscribe("iot.test.request", (_error, message) => {
      if (message.reply) {
        transport.publish(message.reply, encode(JSON.stringify({ ok: true, echo: decode(message.data) })));
      }
    });

    const replies: NatsMessage[] = [];
    const inbox = `iot.test.inbox.${randomUUID().replace(/-/g, "")}`;
    await transport.subscribe(inbox, (_error, message) => {
      replies.push(message);
    });
    await transport.flush();

    transport.publish("iot.test.request", encode("ping"), { reply: inbox });
    await transport.flush();
    await waitFor(() => replies.length === 1, 2_000, "request reply");

    expect(JSON.parse(decode(replies[0].data))).toEqual({ ok: true, echo: "ping" });
  });

  test("delivers each message to exactly one queue-group member", async () => {
    const server = await startServer();
    const transport = await startTransport(makeConfig(server.url, server.token));

    const first: string[] = [];
    const second: string[] = [];
    await transport.subscribe("iot.test.queue", (_error, message) => first.push(decode(message.data)), {
      queue: "vlink-test",
    });
    await transport.subscribe("iot.test.queue", (_error, message) => second.push(decode(message.data)), {
      queue: "vlink-test",
    });
    await transport.flush();

    const total = 10;
    for (let index = 0; index < total; index += 1) {
      transport.publish("iot.test.queue", encode(`m${index}`));
    }
    await transport.flush();
    await waitFor(() => first.length + second.length === total, 2_000, "queue deliveries");

    const delivered = [...first, ...second];
    expect(delivered).toHaveLength(total);
    expect(new Set(delivered).size).toBe(total);
  });

  test("reconnects and re-subscribes after a server restart", async () => {
    const server = await startServer();
    const { port, token } = server;
    const transport = new NodeNatsTransport(
      makeConfig(server.url, token, { reconnectWaitMs: 50 }),
      silentLogger,
    );
    transports.push(transport);

    const statuses: NatsStatus[] = [];
    transport.onStatus((status) => statuses.push(status));
    await transport.connect();

    const received: string[] = [];
    await transport.subscribe("iot.test.reconnect", (_error, message) => received.push(decode(message.data)));
    await transport.flush();

    await server.stop();
    await waitFor(() => !transport.isConnected(), 2_000, "disconnect");
    expect(statuses.some((status) => status === "disconnected" || status === "reconnecting")).toBe(true);

    await startServer({ port, token });
    await waitFor(() => transport.isConnected(), 5_000, "reconnect");
    await transport.flush();

    transport.publish("iot.test.reconnect", encode("after-restart"));
    await transport.flush();
    await waitFor(() => received.includes("after-restart"), 2_000, "post-reconnect delivery");
    expect(statuses).toContain("connected");
  });

  test("close is terminal: no publish and no further status events", async () => {
    const server = await startServer();
    const transport = await startTransport(makeConfig(server.url, server.token));

    let statusEvents = 0;
    const seen: NatsStatus[] = [];
    const unsubscribe = transport.onStatus((status) => {
      statusEvents += 1;
      seen.push(status);
    });
    await transport.subscribe("iot.test.close", () => {});
    await transport.flush();

    await transport.close();
    expect(transport.isConnected()).toBe(false);
    expect(() => transport.publish("iot.test.close", encode("nope"))).toThrow(NatsNotConnectedError);

    // close() emits `closed` once and clears the listener set synchronously, so
    // nothing can fire after this point; no wall-clock wait is needed.
    expect(statusEvents).toBe(1);
    expect(seen).toEqual(["closed"]);
    unsubscribe();
  });
});
