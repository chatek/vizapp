/**
 * End-to-end simulator test: real local nats-server, real VLinkRuntime in
 * `matterMode: "sim"`, raw NATS client driving bridge and device requests.
 *
 * If `nats-server` is not installed the suite is reported as SKIPPED, never as
 * a pass.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Msg, NatsConnection } from "@nats-io/nats-core";
import { connect } from "@nats-io/transport-node";
import { VLinkRuntime } from "../../src/runtime.ts";
import type {
  CommandResult,
  MatterAttributeValue,
  MatterNodeInfo,
  VLinkConfig,
  VLinkHealth,
} from "../../src/types.ts";

const natsServerBin = Bun.which("nats-server");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, ms);
  timer.unref?.();
  return promise;
}

async function freePort(): Promise<number> {
  const { promise, resolve, reject } = Promise.withResolvers<number>();
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (address === null || typeof address === "string") {
      server.close(() => reject(new Error("could not allocate a free port")));
      return;
    }
    const port = address.port;
    server.close(() => resolve(port));
  });
  return promise;
}

/**
 * The fixture is an external process, so readiness is polled against the real
 * socket rather than driven by fake timers.
 */
async function waitForPort(port: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const probe = createConnection({ host: "127.0.0.1", port });
    probe.once("connect", () => {
      probe.destroy();
      resolve();
    });
    probe.once("error", reject);
    try {
      await promise;
      return;
    } catch {
      await delay(50);
    }
  }
  throw new Error(`nats-server did not listen on ${port}`);
}

async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(20);
  }
  throw new Error("timed out waiting for condition");
}

function parse<T>(message: Msg): T {
  return JSON.parse(decoder.decode(message.data)) as T;
}

const haveNatsServer = Boolean(natsServerBin);
const describeMaybe = haveNatsServer ? describe : describe.skip;

if (!haveNatsServer) {
  test.skip("sim-e2e requires nats-server on PATH", () => undefined);
}

describeMaybe("simulator end-to-end", () => {
  let serverProcess: Bun.Subprocess | undefined;
  let runtime: VLinkRuntime | undefined;
  let client: NatsConnection | undefined;
  let fabricId: string;
  let serverOutput = "";

  async function request<T>(subject: string, payload: unknown): Promise<CommandResult<T>> {
    if (!client) throw new Error("NATS client not connected");
    const reply = await client.request(subject, encoder.encode(JSON.stringify(payload)), {
      timeout: 8_000,
    });
    return parse<CommandResult<T>>(reply);
  }

  beforeAll(async () => {
    if (!natsServerBin) return;
    const port = await freePort();
    const token = `vlink-sim-${crypto.randomUUID()}`;

    serverProcess = Bun.spawn(
      [natsServerBin, "-a", "127.0.0.1", "-p", String(port), "--auth", token],
      { stdout: "pipe", stderr: "pipe" },
    );
    void (async () => {
      if (!serverProcess) return;
      const stderr = serverProcess.stderr;
      if (!stderr || typeof stderr === "number") return;
      const reader = stderr.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        serverOutput += decoder.decode(value);
      }
    })();

    try {
      await waitForPort(port);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\n${serverOutput}`);
    }

    const natsUrl = `nats://127.0.0.1:${port}`;
    const stateDir = await mkdtemp(join(tmpdir(), "vlink-sim-"));
    fabricId = "fabric-0000000000000001";
    const config: VLinkConfig = {
      natsUrl,
      natsName: "vlink-sim-e2e",
      natsToken: token,
      fabricId,
      fabricLabel: "VLinkSim",
      stateDir,
      matterStorage: join(stateDir, "matter"),
      matterMode: "sim",
      bleEnabled: false,
      commandQueue: "vlink-sim-e2e",
      healthIntervalMs: 0,
      reconnectWaitMs: 250,
      logLevel: "error",
      notifyEvents: false,
      instanceId: "sim-e2e",
      defaultCommandTimeoutMs: 2_000,
      defaultCommissionTimeoutMs: 10_000,
      cdcEnabled: false,
    };

    runtime = new VLinkRuntime(config);
    await runtime.start();
    expect(runtime.status().state).toBe("ready");

    client = await connect({ servers: natsUrl, token });
  }, 30_000);

  afterAll(async () => {
    await runtime?.stop();
    await client?.close();
    if (serverProcess) {
      serverProcess.kill();
      await serverProcess.exited;
    }
  });

  test("bridge status reports ready", async () => {
    const result = await request<VLinkHealth>(`iot.cmd.matter.${fabricId}.bridge.status`, {
      v: 1,
      type: "bridge",
      requestId: crypto.randomUUID(),
      action: "status",
    });
    expect(result.ok).toBe(true);
    expect(result.data?.state).toBe("ready");
    expect(result.data?.natsConnected).toBe(true);
  }, 10_000);

  test("commission, list, read, command, telemetry, decommission", async () => {
    if (!client || !runtime) throw new Error("suite not initialized");

    const telemetry: Array<{ subject: string; data: MatterAttributeValue }> = [];
    const subscription = client.subscribe("iot.matter.>");
    void (async () => {
      for await (const message of subscription) {
        telemetry.push({ subject: message.subject, data: parse<MatterAttributeValue>(message) });
      }
    })();

    const commissioned = await request<MatterNodeInfo>(
      `iot.cmd.matter.${fabricId}.bridge.commission`,
      {
        v: 1,
        type: "bridge",
        requestId: crypto.randomUUID(),
        action: "commission",
        pairingCode: "34970112332",
        transport: "ip",
        nodeName: "sim-lamp",
        timeoutMs: 5_000,
      },
    );
    expect(commissioned.ok).toBe(true);
    const nodeId = commissioned.data?.nodeId;
    expect(nodeId?.startsWith("node-")).toBe(true);
    if (!nodeId) throw new Error("commissioning did not return a node id");

    const listed = await request<MatterNodeInfo[]>(
      `iot.cmd.matter.${fabricId}.bridge.list`,
      { v: 1, type: "bridge", requestId: crypto.randomUUID(), action: "list" },
    );
    expect(listed.ok).toBe(true);
    expect(listed.data?.map((node) => node.nodeId)).toContain(nodeId);
    expect(listed.data?.find((node) => node.nodeId === nodeId)?.nodeName).toBe("sim-lamp");

    const read = await request<MatterAttributeValue>(
      `iot.cmd.matter.${fabricId}.bridge.read`,
      {
        v: 1,
        type: "bridge",
        requestId: crypto.randomUUID(),
        action: "read",
        nodeId,
        endpointId: 1,
        cluster: "onOff",
        attribute: "onOff",
      },
    );
    expect(read.ok).toBe(true);
    expect(read.data?.value).toBe(false);

    const command = await request<{ onOff?: boolean }>(
      `iot.cmd.matter.${fabricId}.${nodeId}.1.onOff.toggle`,
      {
        v: 1,
        type: "command",
        requestId: crypto.randomUUID(),
        nodeId,
        endpointId: 1,
        cluster: "onOff",
        command: "toggle",
        timeoutMs: 2_000,
      },
    );
    expect(command.ok).toBe(true);
    expect(command.data?.onOff).toBe(true);

    await waitFor(() =>
      telemetry.some(
        (entry) =>
          entry.subject === `iot.matter.${fabricId}.${nodeId}.1.onOff.onOff` &&
          entry.data.value === true,
      ),
    );

    const decommissioned = await request<{ nodeId: string; decommissioned: boolean }>(
      `iot.cmd.matter.${fabricId}.bridge.decommission`,
      {
        v: 1,
        type: "bridge",
        requestId: crypto.randomUUID(),
        action: "decommission",
        nodeId,
        force: true,
      },
    );
    expect(decommissioned.ok).toBe(true);

    const after = await request<MatterNodeInfo[]>(
      `iot.cmd.matter.${fabricId}.bridge.list`,
      { v: 1, type: "bridge", requestId: crypto.randomUUID(), action: "list" },
    );
    expect(after.data?.map((node) => node.nodeId) ?? []).not.toContain(nodeId);

    const gone = await request<unknown>(
      `iot.cmd.matter.${fabricId}.${nodeId}.1.onOff.toggle`,
      {
        v: 1,
        type: "command",
        requestId: crypto.randomUUID(),
        nodeId,
        endpointId: 1,
        cluster: "onOff",
        command: "toggle",
        timeoutMs: 1_000,
      },
    );
    expect(gone.ok).toBe(false);
    expect(gone.error?.code).toBe("NODE_NOT_FOUND");

    subscription.unsubscribe();
  }, 20_000);
});
