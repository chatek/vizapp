/**
 * Pure formatting helpers for OMP tools and slash commands.
 *
 * Nothing here touches the runtime, the filesystem, or the process: the same
 * functions serve tools, commands, and unit tests. Every value that reaches a
 * transcript is JSON-safe and secret-redacted.
 */
import type {
  CommandResult,
  JsonObject,
  JsonValue,
  MatterAttributeValue,
  MatterCommandResult,
  MatterDiscoveredDevice,
  MatterNodeInfo,
  RuntimeStatus,
  VLinkConfig,
  VLinkErrorPayload,
  VLinkHealth,
} from "../types.ts";

/** Keys that must never appear verbatim in text or `details`. */
const SECRET_KEY = /(password|passcode|pairingcode|token|secret|credential|authorization)/i;
const REDACTED = "[redacted]";

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

/**
 * Convert an arbitrary runtime value into a JSON value, replacing secret values
 * and cycles. Objects are copied; arrays keep their order.
 */
export function redactSecrets(value: unknown): JsonValue {
  return convert(value, new WeakSet<object>());
}

function convert(value: unknown, seen: WeakSet<object>): JsonValue {
  if (value === null || value === undefined) return null;
  switch (typeof value) {
    case "string":
      return redactText(value);
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "bigint":
      return value.toString();
    case "function":
    case "symbol":
      return null;
    default:
      break;
  }

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return Array.from(value);
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (typeof value !== "object") return null;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => convert(item, seen));
  }

  const out: JsonObject = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item === undefined) continue;
    out[key] = isSecretKey(key) && item !== null ? REDACTED : convert(item, seen);
  }
  return out;
}

/** Redacted copy of the config, safe for `details` and logs. */
export function sanitizeConfig(config: VLinkConfig): JsonObject {
  const redacted = redactSecrets(config);
  return redacted !== null && typeof redacted === "object" && !Array.isArray(redacted)
    ? redacted
    : {};
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0ms";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1_000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${rest}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Scrub secret-shaped assignments from free text ("password=hunter2",
 * "token: abc"). Used on error messages that may echo a request.
 */
export function redactText(text: string): string {
  return text
    .replace(
      /\b(password|passcode|pairingCode|token|secret|credential)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi,
      "$1$2[redacted]",
    )
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[redacted]");
}

export function errorMessage(error: unknown): string {
  let text: string;
  if (error instanceof Error) text = error.message;
  else if (typeof error === "string") text = error;
  else {
    const json = redactSecrets(error);
    text = typeof json === "string" ? json : JSON.stringify(json);
  }
  return redactText(text);
}

export function formatErrorPayload(error: VLinkErrorPayload): string {
  const details =
    error.details === undefined ? "" : ` (${JSON.stringify(redactSecrets(error.details))})`;
  return `${error.code}: ${redactText(error.message)}${details}`;
}

export function formatHealth(health: VLinkHealth): string {
  const lines = [
    `state: ${health.state}`,
    `NATS: ${health.natsConnected ? "connected" : "disconnected"} (${health.natsUrl})`,
    `Matter: ${health.matterMode}${health.matterReady ? ", ready" : ", not ready"}${health.bleAvailable ? ", BLE available" : ""}`,
    `nodes: ${health.nodeCount}`,
    `uptime: ${formatDuration(health.uptimeMs)}`,
  ];
  if (health.fabricId) lines.push(`fabric: ${health.fabricId}`);
  if (health.lastError) lines.push(`last error: ${redactText(health.lastError)}`);
  return lines.join("\n");
}

export function formatStatus(status: RuntimeStatus, health: VLinkHealth): string {
  const lines = [
    `VLink ${status.state}`,
    formatHealth(health),
    `matter adapter: ${status.matter.ready ? "ready" : "not ready"}, ${status.matter.nodeCount} node(s)`,
  ];
  if (status.lastError) lines.push(`error: ${redactText(status.lastError)}`);
  return lines.join("\n");
}

export function statusDetails(status: RuntimeStatus, health: VLinkHealth): JsonObject {
  return {
    status: {
      state: status.state,
      startedAt: status.startedAt ?? null,
      lastError: status.lastError ?? null,
      natsConnected: status.natsConnected,
      matter: redactSecrets(status.matter),
      config: sanitizeConfig(status.config),
    },
    health: redactSecrets(health) as JsonObject,
  };
}

export function formatNode(node: MatterNodeInfo): string {
  const name = node.nodeName ? `${node.nodeName} (${node.nodeId})` : node.nodeId;
  const endpoints = node.endpointIds.length > 0 ? node.endpointIds.join(",") : "none";
  const state = node.connected ? "connected" : "offline";
  return `${name}: endpoints ${endpoints}, ${state}`;
}

export function formatNodes(nodes: MatterNodeInfo[]): string {
  if (nodes.length === 0) return "No commissioned nodes.";
  return nodes.map(formatNode).join("\n");
}

export function nodesDetails(nodes: MatterNodeInfo[]): JsonObject {
  return { nodes: nodes.map((node) => redactSecrets(node)) };
}

export function formatDiscoveredDevice(device: MatterDiscoveredDevice): string {
  const bits: string[] = [device.transport];
  if (device.deviceName) bits.push(device.deviceName);
  if (device.discriminator !== undefined) bits.push(`discriminator ${device.discriminator}`);
  if (device.vendorId !== undefined) bits.push(`vendor ${device.vendorId}`);
  if (device.productId !== undefined) bits.push(`product ${device.productId}`);
  if (device.addresses && device.addresses.length > 0) bits.push(device.addresses.join(", "));
  return bits.join(" | ");
}

export function formatDiscovered(devices: MatterDiscoveredDevice[]): string {
  if (devices.length === 0) return "No commissionable devices found.";
  return devices.map((device, index) => `${index + 1}. ${formatDiscoveredDevice(device)}`).join("\n");
}

export function discoveredDetails(devices: MatterDiscoveredDevice[]): JsonObject {
  return { devices: devices.map((device) => redactSecrets(device)) };
}

export function formatAttribute(value: MatterAttributeValue): string {
  const target = `${value.nodeId} endpoint ${value.endpointId} ${value.cluster}.${value.attribute}`;
  return `${target} = ${JSON.stringify(value.value)} (source: ${value.source})`;
}

export function attributeDetails(value: MatterAttributeValue): JsonObject {
  return { attribute: redactSecrets(value) as JsonObject };
}

export function formatMatterResult(result: MatterCommandResult): string {
  if (!result.ok) {
    return result.error
      ? `failed: ${formatErrorPayload(result.error)}`
      : "failed: unknown Matter error";
  }
  const duration = result.durationMs === undefined ? "" : ` in ${formatDuration(result.durationMs)}`;
  return `ok${duration}${result.data === undefined ? "" : `: ${JSON.stringify(result.data)}`}`;
}

export function matterResultDetails(result: MatterCommandResult): JsonObject {
  return { result: redactSecrets(result) as JsonObject };
}

export function formatCommandResult(result: CommandResult<unknown>): string {
  if (!result.ok) {
    return result.error
      ? `failed: ${formatErrorPayload(result.error)}`
      : "failed: unknown VLink error";
  }
  const target = [result.nodeId, result.endpointId, result.cluster, result.command]
    .filter((part) => part !== undefined)
    .join(" ");
  return `ok ${target} in ${formatDuration(result.durationMs)}${
    result.data === undefined ? "" : `: ${JSON.stringify(redactSecrets(result.data))}`
  }`;
}

export function commandResultDetails(result: CommandResult<unknown>): JsonObject {
  return { result: redactSecrets(result) as JsonObject };
}

export function formatCommissionedNode(node: MatterNodeInfo): string {
  return `commissioned ${formatNode(node)}`;
}
