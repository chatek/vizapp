import { describe, expect, test } from "bun:test";
import * as z from "@oh-my-pi/omptype/zod";
import type {
  AgentToolResult,
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@oh-my-pi/pi-coding-agent";
import vlinkPlugin from "../../src/index.ts";
import { registerVLinkCommands } from "../../src/omp/commands.ts";
import { registerVLinkTools } from "../../src/omp/tools.ts";
import {
  redactSecrets,
  redactText,
  sanitizeConfig,
  statusDetails,
} from "../../src/omp/format.ts";
import type { RuntimeStatus, VLinkConfig, VLinkHealth } from "../../src/types.ts";

interface CapturedSchema {
  safeParse(value: unknown): { success: boolean };
}

interface CapturedTool {
  name: string;
  description: string;
  parameters: CapturedSchema;
  execute(
    toolCallId: string,
    params: unknown,
    signal: AbortSignal | undefined,
    onUpdate: ((partial: AgentToolResult<unknown>) => void) | undefined,
    ctx: ExtensionContext,
  ): Promise<AgentToolResult<unknown>>;
}

interface CapturedCommand {
  name: string;
  description?: string;
  handler(args: string, ctx: ExtensionCommandContext): Promise<void>;
}

function makeFakePi(): {
  pi: ExtensionAPI;
  tools: CapturedTool[];
  commands: CapturedCommand[];
  events: string[];
} {
  const tools: CapturedTool[] = [];
  const commands: CapturedCommand[] = [];
  const events: string[] = [];

  const pi = {
    zod: z,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    registerTool: (tool: unknown) => {
      tools.push(tool as CapturedTool);
    },
    registerCommand: (name: string, options: unknown) => {
      commands.push({ name, ...(options as Omit<CapturedCommand, "name">) });
    },
    on: (event: string) => {
      events.push(event);
    },
  } as unknown as ExtensionAPI;

  return { pi, tools, commands, events };
}

function toolByName(tools: CapturedTool[], name: string): CapturedTool {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`missing tool ${name}`);
  return tool;
}

const noRuntime = (): undefined => undefined;

function commandContext(): { ctx: ExtensionCommandContext; notifications: Array<[string, string | undefined]> } {
  const notifications: Array<[string, string | undefined]> = [];
  const ctx = {
    ui: {
      notify: (message: string, type?: string) => {
        notifications.push([message, type]);
      },
    },
    agent: { kind: "main" },
  } as unknown as ExtensionCommandContext;
  return { ctx, notifications };
}

const baseConfig: VLinkConfig = {
  natsUrl: "nats://127.0.0.1:14222",
  natsName: "vlink-test",
  natsToken: "super-secret-token",
  fabricId: "fabric-0000000000000001",
  fabricLabel: "VLink",
  stateDir: "/tmp/vlink-state",
  matterStorage: "/tmp/vlink-matter",
  matterMode: "sim",
  bleEnabled: false,
  wifiPassword: "hunter2",
  commandQueue: "vlink",
  healthIntervalMs: 0,
  reconnectWaitMs: 2000,
  logLevel: "info",
  notifyEvents: false,
  instanceId: "test",
  defaultCommandTimeoutMs: 5000,
  defaultCommissionTimeoutMs: 120000,
  cdcEnabled: false,
};

function baseHealth(): VLinkHealth {
  return {
    v: 1,
    instanceId: "test",
    state: "ready",
    fabricId: "fabric-0000000000000001",
    natsUrl: baseConfig.natsUrl,
    natsConnected: true,
    cdcConnected: false,
    matterMode: "sim",
    matterReady: true,
    bleAvailable: false,
    nodeCount: 1,
    startedAt: Date.now() - 1000,
    uptimeMs: 1000,
  };
}

function baseStatus(): RuntimeStatus {
  return {
    state: "ready",
    startedAt: Date.now() - 1000,
    config: baseConfig,
    matter: { ready: true, fabricId: baseConfig.fabricId, bleAvailable: false, nodeCount: 1 },
    natsConnected: true,
  };
}

describe("VLink OMP registration", () => {
  test("registers 7 tools and 4 commands", () => {
    const { pi, tools, commands } = makeFakePi();
    registerVLinkTools(pi, noRuntime);
    registerVLinkCommands(pi, noRuntime);

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "vlink_command",
      "vlink_commission",
      "vlink_decommission",
      "vlink_discover",
      "vlink_nodes",
      "vlink_read",
      "vlink_status",
    ]);
    expect(commands.map((command) => command.name).sort()).toEqual([
      "vlink-commission",
      "vlink-discover",
      "vlink-nodes",
      "vlink-status",
    ]);
  });

  test("plugin factory registers lifecycle handlers without starting the bridge", () => {
    const { pi, tools, commands, events } = makeFakePi();
    expect(() => vlinkPlugin(pi)).not.toThrow();
    expect(tools).toHaveLength(7);
    expect(commands).toHaveLength(4);
    expect(events).toContain("session_start");
    expect(events).toContain("session_shutdown");
  });
});

describe("tool schemas", () => {
  test("vlink_read accepts a full attribute path and rejects bad fields", () => {
    const { pi, tools } = makeFakePi();
    registerVLinkTools(pi, noRuntime);
    const schema = toolByName(tools, "vlink_read").parameters;

    expect(
      schema.safeParse({
        nodeId: "node-000000000000002a",
        endpointId: 1,
        cluster: "onOff",
        attribute: "onOff",
      }).success,
    ).toBe(true);

    expect(schema.safeParse({ endpointId: 1, cluster: "onOff", attribute: "onOff" }).success).toBe(false);
    expect(
      schema.safeParse({
        nodeId: "node-000000000000002a",
        endpointId: 1.5,
        cluster: "onOff",
        attribute: "onOff",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        nodeId: "node-000000000000002a",
        endpointId: -1,
        cluster: "onOff",
        attribute: "onOff",
      }).success,
    ).toBe(false);
  });

  test("vlink_command validates required fields and optional args", () => {
    const { pi, tools } = makeFakePi();
    registerVLinkTools(pi, noRuntime);
    const schema = toolByName(tools, "vlink_command").parameters;

    expect(
      schema.safeParse({
        nodeId: "node-000000000000002a",
        endpointId: 1,
        cluster: "onOff",
        command: "toggle",
        args: { reason: "test" },
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ nodeId: "n", endpointId: 1, cluster: "onOff" }).success).toBe(false);
  });

  test("vlink_commission validates transport and pairing code", () => {
    const { pi, tools } = makeFakePi();
    registerVLinkTools(pi, noRuntime);
    const schema = toolByName(tools, "vlink_commission").parameters;

    expect(
      schema.safeParse({ pairingCode: "34970112332", transport: "ble-wifi" }).success,
    ).toBe(true);
    expect(schema.safeParse({ pairingCode: "34970112332", transport: "zigbee" }).success).toBe(false);
    expect(schema.safeParse({ pairingCode: "", transport: "ip" }).success).toBe(false);
  });
});

describe("tool behavior without a runtime", () => {
  test("vlink_status returns a structured error instead of throwing", async () => {
    const { pi, tools } = makeFakePi();
    registerVLinkTools(pi, noRuntime);
    const result = await toolByName(tools, "vlink_status").execute(
      "call-1",
      {},
      undefined,
      undefined,
      {} as ExtensionContext,
    );

    expect(result.isError).toBe(true);
    const first = result.content[0];
    expect(first?.type).toBe("text");
    const text = first?.type === "text" ? first.text : "";
    expect(text).toContain("VLink");
    expect(text.length).toBeGreaterThan(0);
  });

  test("commands notify an error instead of throwing", async () => {
    const { pi, commands } = makeFakePi();
    registerVLinkCommands(pi, noRuntime);
    const { ctx, notifications } = commandContext();
    const status = commands.find((command) => command.name === "vlink-status");
    if (!status) throw new Error("missing vlink-status");

    await expect(status.handler("", ctx)).resolves.toBeUndefined();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.[1]).toBe("error");
  });
});

describe("formatter redaction", () => {
  test("redacts secrets recursively", () => {
    const redacted = redactSecrets({
      password: "hunter2",
      natsToken: "abc123",
      nested: { wifiPassword: "letmein", ok: true },
    });
    expect(redacted).toEqual({
      password: "[redacted]",
      natsToken: "[redacted]",
      nested: { wifiPassword: "[redacted]", ok: true },
    });
  });

  test("redacts password and bearer text", () => {
    expect(redactText("connect with password=hunter2 failed")).not.toContain("hunter2");
    expect(redactText("Authorization: Bearer abc.def.ghi")).not.toContain("abc.def.ghi");
  });

  test("sanitized config and status details never expose credentials", () => {
    const config = sanitizeConfig(baseConfig);
    expect(config.natsToken).toBe("[redacted]");
    expect(config.wifiPassword).toBe("[redacted]");

    const serialized = JSON.stringify(statusDetails(baseStatus(), baseHealth()));
    expect(serialized).not.toContain("super-secret-token");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).toContain("[redacted]");
  });
});
