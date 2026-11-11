/**
 * OMP tool surface for VLink.
 *
 * Tools never throw and never print credentials. Runtime initialization is
 * awaited with a bounded timeout so a slow Matter/BLE startup cannot stall the
 * agent turn forever.
 */
import type { AgentToolResult, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { VLinkError, toErrorPayload } from "../errors.ts";
import { normalizeFabricId } from "../subjects.ts";
import type { VLinkRuntime } from "../runtime.ts";
import type {
  JsonObject,
  MatterAttributePath,
  MatterCommandRequest,
  MatterCommissionRequest,
  MatterDecommissionRequest,
  MatterDiscoveredDevice,
  MatterNodeInfo,
  MatterReadRequest,
} from "../types.ts";
import {
  attributeDetails,
  discoveredDetails,
  errorMessage,
  formatAttribute,
  formatCommissionedNode,
  formatDiscovered,
  formatErrorPayload,
  formatMatterResult,
  formatNodes,
  formatStatus,
  matterResultDetails,
  nodesDetails,
  redactSecrets,
  statusDetails,
} from "./format.ts";

const RUNTIME_READY_TIMEOUT_MS = 15_000;

export interface VLinkOperationResult {
  text: string;
  details: JsonObject;
}

export type ProgressReporter = (message: string) => void;

export interface DiscoverToolParams {
  timeoutMs?: number;
}

export interface CommissionToolParams {
  pairingCode: string;
  transport: "ble-wifi" | "ip" | "ble-thread";
  wifiSsid?: string;
  wifiPassword?: string;
  nodeName?: string;
  timeoutMs?: number;
  threadOperationalDataset?: string;
  threadNetworkName?: string;
}

export interface ReadToolParams {
  nodeId: string;
  endpointId: number;
  cluster: string;
  attribute: string;
  timeoutMs?: number;
}

export interface CommandToolParams {
  nodeId: string;
  endpointId: number;
  cluster: string;
  command: string;
  args?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface DecommissionToolParams {
  nodeId: string;
  force?: boolean;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new VLinkError("INTERNAL_ERROR", "VLink operation cancelled");
  }
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Wait for a runtime that is starting, but never longer than `timeoutMs`. */
export async function awaitRuntime(
  getRuntime: () => VLinkRuntime | undefined,
  timeoutMs = RUNTIME_READY_TIMEOUT_MS,
): Promise<VLinkRuntime> {
  const runtime = getRuntime();
  if (!runtime) {
    throw new VLinkError(
      "NATS_NOT_CONNECTED",
      "VLink is not running in this session. Enable the VLink extension or start the sidecar.",
    );
  }

  const state = await runtime.waitUntilSettled(timeoutMs);
  if (state === "starting") {
    throw new VLinkError(
      "MATTER_NOT_READY",
      "VLink is still starting (Matter/BLE initialization). Try again in a moment.",
    );
  }
  if (state === "stopped" || state === "stopping") {
    throw new VLinkError("NATS_NOT_CONNECTED", "VLink is stopped or shutting down.");
  }
  return runtime;
}

export function resolvedFabricId(runtime: VLinkRuntime): string {
  const fabricId = runtime.getConfig().fabricId ?? runtime.health().fabricId;
  if (!fabricId) {
    throw new VLinkError(
      "MATTER_NOT_READY",
      "The Matter fabric is not available yet; wait for the controller to start.",
    );
  }
  return normalizeFabricId(fabricId);
}

function attributePath(runtime: VLinkRuntime, params: ReadToolParams): MatterAttributePath {
  return {
    fabricId: resolvedFabricId(runtime),
    nodeId: params.nodeId.trim(),
    endpointId: params.endpointId,
    cluster: params.cluster.trim(),
    attribute: params.attribute.trim(),
  };
}

function asJsonObject(value: unknown): JsonObject | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new VLinkError("PAYLOAD_INVALID", "command args must be a JSON object");
  }
  return parsed as JsonObject;
}

function nodeDetails(node: MatterNodeInfo): JsonObject {
  return { node: redactSecrets(node) as JsonObject };
}

export async function statusReport(runtime: VLinkRuntime): Promise<VLinkOperationResult> {
  const status = runtime.status();
  const health = runtime.health();
  return { text: formatStatus(status, health), details: statusDetails(status, health) };
}

export async function nodesReport(runtime: VLinkRuntime): Promise<VLinkOperationResult> {
  const nodes = await runtime.listNodes();
  return { text: formatNodes(nodes), details: nodesDetails(nodes) };
}

export async function discoverReport(
  runtime: VLinkRuntime,
  params: DiscoverToolParams = {},
  onProgress?: ProgressReporter,
): Promise<VLinkOperationResult> {
  const timeoutMs =
    params.timeoutMs === undefined ? 10_000 : clamp(params.timeoutMs, 1_000, 120_000, 10_000);
  onProgress?.(`Discovering Matter devices for ${Math.round(timeoutMs / 1000)}s...`);
  const devices: MatterDiscoveredDevice[] = await runtime.discover({ timeoutMs, transport: "both" });
  return { text: formatDiscovered(devices), details: discoveredDetails(devices) };
}

export async function commissionReport(
  runtime: VLinkRuntime,
  params: CommissionToolParams,
  onProgress?: ProgressReporter,
): Promise<VLinkOperationResult> {
  const config = runtime.getConfig();
  const pairingCode = params.pairingCode.trim();
  if (!pairingCode) {
    throw new VLinkError("CONFIG_INVALID", "pairingCode is required");
  }

  let wifi: MatterCommissionRequest["wifi"];
  if (params.transport === "ble-wifi") {
    const ssid = params.wifiSsid?.trim() || config.wifiSsid?.trim();
    const password = params.wifiPassword ?? config.wifiPassword;
    if (!ssid || !password) {
      throw new VLinkError(
        "CONFIG_INVALID",
        "BLE+Wi-Fi commissioning needs wifiSsid and wifiPassword (or VLINK_WIFI_SSID / VLINK_WIFI_PASSWORD).",
      );
    }
    wifi = { ssid, password };
  }

  let thread: MatterCommissionRequest["thread"];
  if (params.transport === "ble-thread") {
    const operationalDataset = params.threadOperationalDataset?.trim();
    if (!operationalDataset) {
      throw new VLinkError(
        "CONFIG_INVALID",
        "Thread commissioning needs threadOperationalDataset.",
      );
    }
    thread = {
      networkName: params.threadNetworkName?.trim() || undefined,
      operationalDataset,
    };
  }

  const request: MatterCommissionRequest = {
    pairingCode,
    transport: params.transport,
    wifi,
    thread,
    nodeName: params.nodeName?.trim() || undefined,
    timeoutMs: clamp(
      params.timeoutMs,
      5_000,
      600_000,
      config.defaultCommissionTimeoutMs,
    ),
  };

  onProgress?.(`Commissioning over ${params.transport}...`);
  const node = await runtime.commission(request);
  onProgress?.("Commissioning complete.");
  return { text: formatCommissionedNode(node), details: nodeDetails(node) };
}

export async function readReport(
  runtime: VLinkRuntime,
  params: ReadToolParams,
): Promise<VLinkOperationResult> {
  const request: MatterReadRequest = {
    ...attributePath(runtime, params),
    timeoutMs: clamp(params.timeoutMs, 100, 60_000, runtime.getConfig().defaultCommandTimeoutMs),
  };
  const value = await runtime.read(request);
  return { text: formatAttribute(value), details: attributeDetails(value) };
}

export async function commandReport(
  runtime: VLinkRuntime,
  params: CommandToolParams,
): Promise<VLinkOperationResult> {
  const request: MatterCommandRequest = {
    fabricId: resolvedFabricId(runtime),
    nodeId: params.nodeId.trim(),
    endpointId: params.endpointId,
    cluster: params.cluster.trim(),
    command: params.command.trim(),
    args: asJsonObject(params.args),
    timeoutMs: clamp(
      params.timeoutMs,
      100,
      60_000,
      runtime.getConfig().defaultCommandTimeoutMs,
    ),
  };
  const result = await runtime.command(request);
  return {
    text: formatMatterResult(result),
    details: matterResultDetails(result),
  };
}

export async function decommissionReport(
  runtime: VLinkRuntime,
  params: DecommissionToolParams,
): Promise<VLinkOperationResult> {
  const request: MatterDecommissionRequest = {
    fabricId: resolvedFabricId(runtime),
    nodeId: params.nodeId.trim(),
    force: params.force,
  };
  await runtime.decommission(request);
  return {
    text: `decommissioned ${request.nodeId}`,
    details: { nodeId: request.nodeId, force: request.force ?? false },
  };
}

function success(text: string, details: JsonObject): AgentToolResult<JsonObject> {
  return { content: [{ type: "text", text }], details };
}

function failure(error: unknown): AgentToolResult<JsonObject> {
  const payload = toErrorPayload(error);
  return {
    content: [
      {
        type: "text",
        text: `VLink error: ${formatErrorPayload(payload)}`,
      },
    ],
    details: { error: redactSecrets(payload) as JsonObject },
    isError: true,
  };
}

async function run(
  operation: () => Promise<VLinkOperationResult>,
): Promise<AgentToolResult<JsonObject>> {
  try {
    const result = await operation();
    return success(result.text, result.details);
  } catch (error) {
    return failure(error);
  }
}

export function registerVLinkTools(
  pi: ExtensionAPI,
  getRuntime: () => VLinkRuntime | undefined,
): void {
  const z = pi.zod;

  pi.registerTool({
    name: "vlink_status",
    label: "VLink Status",
    description:
      "Show VLink bridge state: NATS connectivity, Matter mode, BLE availability, fabric, and commissioned node count.",
    parameters: z.object({}),
    approval: "read",
    execute: async () => run(async () => statusReport(await awaitRuntime(getRuntime))),
  });

  pi.registerTool({
    name: "vlink_nodes",
    label: "VLink Nodes",
    description: "List commissioned Matter nodes with node ID, alias, endpoints, and connection state.",
    parameters: z.object({}),
    approval: "read",
    execute: async () => run(async () => nodesReport(await awaitRuntime(getRuntime))),
  });

  pi.registerTool({
    name: "vlink_discover",
    label: "VLink Discover",
    description:
      "Discover commissionable Matter devices over BLE and IP for a bounded number of seconds.",
    parameters: z.object({
      timeoutMs: z
        .number()
        .int()
        .positive()
        .max(120_000)
        .optional()
        .describe("Discovery window in milliseconds (1000-120000, default 10000)."),
    }),
    approval: "read",
    execute: async (_toolCallId, params: DiscoverToolParams, signal, onUpdate) =>
      run(async () => {
        throwIfAborted(signal);
        const runtime = await awaitRuntime(getRuntime);
        return discoverReport(runtime, params, (message) => {
          onUpdate?.({ content: [{ type: "text", text: message }] });
        });
      }),
  });

  pi.registerTool({
    name: "vlink_commission",
    label: "VLink Commission",
    description:
      "Commission a Matter device. BLE+Wi-Fi installs Wi-Fi credentials; IP commissions a device already on the LAN.",
    parameters: z.object({
      pairingCode: z.string().min(1).describe("Matter pairing code from the device label or QR code."),
      transport: z
        .enum(["ble-wifi", "ip", "ble-thread"])
        .describe("Commissioning transport: BLE then Wi-Fi, IP, or BLE then Thread."),
      wifiSsid: z.string().optional().describe("Wi-Fi SSID; defaults to VLINK_WIFI_SSID."),
      wifiPassword: z
        .string()
        .optional()
        .describe("Wi-Fi password; defaults to VLINK_WIFI_PASSWORD. Never echoed."),
      nodeName: z.string().optional().describe("Human alias for the node."),
      timeoutMs: z
        .number()
        .int()
        .positive()
        .max(600_000)
        .optional()
        .describe("Commissioning timeout in milliseconds (default from config)."),
      threadOperationalDataset: z
        .string()
        .optional()
        .describe("Thread operational dataset (needed for ble-thread)."),
      threadNetworkName: z.string().optional().describe("Thread network name."),
    }),
    approval: "write",
    execute: async (_toolCallId, params: CommissionToolParams, signal, onUpdate) =>
      run(async () => {
        throwIfAborted(signal);
        const runtime = await awaitRuntime(getRuntime);
        return commissionReport(runtime, params, (message) => {
          onUpdate?.({ content: [{ type: "text", text: message }] });
        });
      }),
  });

  pi.registerTool({
    name: "vlink_read",
    label: "VLink Read",
    description: "Read one Matter cluster attribute from a commissioned node.",
    parameters: z.object({
      nodeId: z.string().min(1).describe("Matter node id, e.g. node-000000000000002a."),
      endpointId: z.number().int().nonnegative().describe("Matter endpoint number."),
      cluster: z.string().min(1).describe("Cluster name in lower camel case, e.g. onOff."),
      attribute: z.string().min(1).describe("Attribute name in lower camel case, e.g. onOff."),
      timeoutMs: z.number().int().positive().max(60_000).optional().describe("Read timeout."),
    }),
    approval: "read",
    execute: async (_toolCallId, params: ReadToolParams, signal) =>
      run(async () => {
        throwIfAborted(signal);
        return readReport(await awaitRuntime(getRuntime), params);
      }),
  });

  pi.registerTool({
    name: "vlink_command",
    label: "VLink Command",
    description:
      "Invoke a Matter cluster command on a commissioned node and return the device ACK or a structured error.",
    parameters: z.object({
      nodeId: z.string().min(1).describe("Matter node id."),
      endpointId: z.number().int().nonnegative().describe("Matter endpoint number."),
      cluster: z.string().min(1).describe("Cluster name in lower camel case, e.g. onOff."),
      command: z.string().min(1).describe("Command name in lower camel case, e.g. toggle."),
      args: z.record(z.unknown()).optional().describe("Optional JSON object of command arguments."),
      timeoutMs: z.number().int().positive().max(60_000).optional().describe("Command timeout."),
    }),
    approval: "write",
    execute: async (_toolCallId, params: CommandToolParams, signal) =>
      run(async () => {
        throwIfAborted(signal);
        return commandReport(await awaitRuntime(getRuntime), params);
      }),
  });

  pi.registerTool({
    name: "vlink_decommission",
    label: "VLink Decommission",
    description: "Remove a Matter node from the VLink fabric.",
    parameters: z.object({
      nodeId: z.string().min(1).describe("Matter node id to remove."),
      force: z.boolean().optional().describe("Force removal even when the device is offline."),
    }),
    approval: "write",
    execute: async (_toolCallId, params: DecommissionToolParams, signal) =>
      run(async () => {
        throwIfAborted(signal);
        return decommissionReport(await awaitRuntime(getRuntime), params);
      }),
  });
}

/** Shared error text for slash commands (`ui.notify`). */
export function commandErrorText(error: unknown): string {
  return `VLink: ${errorMessage(error)}`;
}
