/**
 * Wire codecs for the shared NATS bus.
 *
 * Every payload is UTF-8 JSON with `"v": 1`. Parsing is strict about the
 * version, type, and required fields, and deliberately ignores unknown extra
 * fields so a newer publisher can add data without breaking older bridges.
 */

import { VLinkError } from "./errors.ts";
import { isBridgeAction } from "./subjects.ts";
import type {
  AttributeTelemetry,
  BridgeCommandPayload,
  CommandPayload,
  CommandResult,
  DeviceCommandPayload,
  EventTelemetry,
  JsonObject,
  JsonValue,
  VLinkHealth,
} from "./types.ts";

export const MAX_PAYLOAD_BYTES = 64 * 1024;

const TRANSPORTS = ["ble-wifi", "ip", "ble-thread"] as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new VLinkError("PAYLOAD_INVALID", "payload is not valid JSON");
  }
}

function requiredString(object: Record<string, unknown>, key: string): string {
  const value = object[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new VLinkError("PAYLOAD_INVALID", `payload field "${key}" must be a non-empty string`, {
      field: key,
    });
  }
  return value;
}

function optionalString(object: Record<string, unknown>, key: string): string | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new VLinkError("PAYLOAD_INVALID", `payload field "${key}" must be a string`, { field: key });
  }
  return value;
}

function readInteger(object: Record<string, unknown>, key: string, min: number): number | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
    throw new VLinkError("PAYLOAD_INVALID", `payload field "${key}" must be an integer >= ${min}`, {
      field: key,
    });
  }
  return value;
}

function requiredInteger(object: Record<string, unknown>, key: string, min: number): number {
  const value = readInteger(object, key, min);
  if (value === undefined) {
    throw new VLinkError("PAYLOAD_INVALID", `payload field "${key}" is required`, { field: key });
  }
  return value;
}

function readWifi(object: Record<string, unknown>): { ssid: string; password: string } | undefined {
  const value = object.wifi;
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VLinkError("PAYLOAD_INVALID", 'payload field "wifi" must be an object', {
      field: "wifi",
    });
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.ssid !== "string" || typeof candidate.password !== "string") {
    throw new VLinkError("PAYLOAD_INVALID", 'payload field "wifi" requires string ssid and password', {
      field: "wifi",
    });
  }
  return { ssid: candidate.ssid, password: candidate.password };
}

function readThread(
  object: Record<string, unknown>,
): { networkName?: string; operationalDataset: string } | undefined {
  const value = object.thread;
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new VLinkError("PAYLOAD_INVALID", 'payload field "thread" must be an object', {
      field: "thread",
    });
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.operationalDataset !== "string" || candidate.operationalDataset.length === 0) {
    throw new VLinkError("PAYLOAD_INVALID", 'payload field "thread" requires an operationalDataset', {
      field: "thread",
    });
  }
  return typeof candidate.networkName === "string"
    ? { networkName: candidate.networkName, operationalDataset: candidate.operationalDataset }
    : { operationalDataset: candidate.operationalDataset };
}

function readArgs(object: Record<string, unknown>): JsonObject | undefined {
  if (object.args === undefined) return undefined;
  const args = toJsonValue(object.args);
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new VLinkError("PAYLOAD_INVALID", 'payload field "args" must be a JSON object', {
      field: "args",
    });
  }
  return args as JsonObject;
}

function parseDeviceCommand(object: Record<string, unknown>): DeviceCommandPayload {
  const payload: DeviceCommandPayload = {
    v: 1,
    type: "command",
    nodeId: requiredString(object, "nodeId"),
    endpointId: requiredInteger(object, "endpointId", 0),
    cluster: requiredString(object, "cluster"),
    command: requiredString(object, "command"),
  };

  const requestId = optionalString(object, "requestId");
  if (requestId !== undefined) payload.requestId = requestId;
  const fabricId = optionalString(object, "fabricId");
  if (fabricId !== undefined) payload.fabricId = fabricId;
  const timeoutMs = readInteger(object, "timeoutMs", 1);
  if (timeoutMs !== undefined) payload.timeoutMs = timeoutMs;
  const args = readArgs(object);
  if (args !== undefined) payload.args = args;

  return payload;
}

function parseBridgeCommand(object: Record<string, unknown>): BridgeCommandPayload {
  const action = requiredString(object, "action");
  if (!isBridgeAction(action)) {
    throw new VLinkError("BRIDGE_ACTION_UNKNOWN", `unknown bridge action: ${action}`, { action });
  }

  const payload: BridgeCommandPayload = { v: 1, type: "bridge", action };

  const requestId = optionalString(object, "requestId");
  if (requestId !== undefined) payload.requestId = requestId;
  const pairingCode = optionalString(object, "pairingCode");
  if (pairingCode !== undefined) payload.pairingCode = pairingCode;
  const nodeId = optionalString(object, "nodeId");
  if (nodeId !== undefined) payload.nodeId = nodeId;
  const nodeName = optionalString(object, "nodeName");
  if (nodeName !== undefined) payload.nodeName = nodeName;
  const cluster = optionalString(object, "cluster");
  if (cluster !== undefined) payload.cluster = cluster;
  const attribute = optionalString(object, "attribute");
  if (attribute !== undefined) payload.attribute = attribute;
  const command = optionalString(object, "command");
  if (command !== undefined) payload.command = command;

  const passcode = readInteger(object, "passcode", 0);
  if (passcode !== undefined) payload.passcode = passcode;
  const discriminator = readInteger(object, "discriminator", 0);
  if (discriminator !== undefined) payload.discriminator = discriminator;
  const endpointId = readInteger(object, "endpointId", 0);
  if (endpointId !== undefined) payload.endpointId = endpointId;
  const timeoutMs = readInteger(object, "timeoutMs", 1);
  if (timeoutMs !== undefined) payload.timeoutMs = timeoutMs;

  const transport = optionalString(object, "transport");
  if (transport !== undefined) {
    if (!(TRANSPORTS as readonly string[]).includes(transport)) {
      throw new VLinkError("PAYLOAD_INVALID", `unsupported transport: ${transport}`, {
        field: "transport",
      });
    }
    payload.transport = transport as (typeof TRANSPORTS)[number];
  }

  const wifi = readWifi(object);
  if (wifi !== undefined) payload.wifi = wifi;
  const thread = readThread(object);
  if (thread !== undefined) payload.thread = thread;

  if (object.force !== undefined) {
    if (typeof object.force !== "boolean") {
      throw new VLinkError("PAYLOAD_INVALID", 'payload field "force" must be a boolean', {
        field: "force",
      });
    }
    payload.force = object.force;
  }

  const args = readArgs(object);
  if (args !== undefined) payload.args = args;
  if (object.value !== undefined) payload.value = toJsonValue(object.value);

  return payload;
}

/**
 * Decode and validate a command payload from raw bytes, a JSON string, or an
 * already-parsed value. Throws `VLinkError` with `PAYLOAD_INVALID`,
 * `PAYLOAD_TOO_LARGE`, or `BRIDGE_ACTION_UNKNOWN`.
 */
export function parseCommandPayload(input: string | Uint8Array | unknown): CommandPayload {
  let decoded: unknown;

  if (typeof input === "string") {
    if (encoder.encode(input).byteLength > MAX_PAYLOAD_BYTES) {
      throw new VLinkError("PAYLOAD_TOO_LARGE", `payload exceeds ${MAX_PAYLOAD_BYTES} bytes`, {
        limit: MAX_PAYLOAD_BYTES,
      });
    }
    decoded = parseJsonText(input);
  } else if (input instanceof Uint8Array) {
    if (input.byteLength > MAX_PAYLOAD_BYTES) {
      throw new VLinkError("PAYLOAD_TOO_LARGE", `payload exceeds ${MAX_PAYLOAD_BYTES} bytes`, {
        limit: MAX_PAYLOAD_BYTES,
        size: input.byteLength,
      });
    }
    let text: string;
    try {
      text = decoder.decode(input);
    } catch {
      throw new VLinkError("PAYLOAD_INVALID", "payload is not valid UTF-8");
    }
    decoded = parseJsonText(text);
  } else {
    decoded = input;
  }

  if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new VLinkError("PAYLOAD_INVALID", "payload must be a JSON object");
  }
  const object = decoded as Record<string, unknown>;
  if (object.v !== 1) {
    throw new VLinkError("PAYLOAD_INVALID", "unsupported payload version (expected v: 1)", {
      v: toJsonValue(object.v),
    });
  }

  switch (object.type) {
    case "command":
      return parseDeviceCommand(object);
    case "bridge":
      return parseBridgeCommand(object);
    default:
      throw new VLinkError("PAYLOAD_INVALID", 'payload field "type" must be "command" or "bridge"', {
        type: toJsonValue(object.type),
      });
  }
}

function encodeJson(value: unknown): Uint8Array {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch (error) {
    throw new VLinkError("PAYLOAD_INVALID", "payload is not JSON-serializable", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  if (text === undefined) {
    throw new VLinkError("PAYLOAD_INVALID", "payload is not JSON-serializable");
  }
  return encoder.encode(text);
}

/** Reply payload for NATS request-reply. */
export function encodeCommandResult(result: CommandResult): Uint8Array {
  return encodeJson({ ...result, v: 1 });
}

/** Attribute telemetry on `iot.matter.…`. */
export function encodeAttributeTelemetry(value: AttributeTelemetry): Uint8Array {
  return encodeJson({ ...value, v: 1 });
}

/** Device event telemetry on `iot.event.matter.…`. */
export function encodeEventTelemetry(value: EventTelemetry): Uint8Array {
  return encodeJson({ ...value, v: 1 });
}

/** Bridge health on `iot.bridge.vlink.<instance>.status`. */
export function encodeHealth(value: VLinkHealth): Uint8Array {
  return encodeJson({ ...value, v: 1 });
}

const MAX_JSON_DEPTH = 64;

function checkJsonValue(value: unknown, depth: number, seen: WeakSet<object>): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      break;
    default:
      return false;
  }

  if (depth >= MAX_JSON_DEPTH) return false;
  const object = value as object;
  if (seen.has(object)) return false;
  seen.add(object);
  try {
    if (Array.isArray(object)) {
      return object.every((item) => checkJsonValue(item, depth + 1, seen));
    }
    return Object.values(object as Record<string, unknown>).every((entry) =>
      checkJsonValue(entry, depth + 1, seen),
    );
  } finally {
    seen.delete(object);
  }
}

/** True when `value` survives `JSON.stringify` / `JSON.parse` unchanged. */
export function isJsonValue(value: unknown): value is JsonValue {
  return checkJsonValue(value, 0, new WeakSet<object>());
}

function convertJsonValue(value: unknown, depth: number, seen: WeakSet<object>): JsonValue {
  if (value === null || value === undefined) return null;

  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? value : null;
    case "bigint":
      return value.toString();
    case "object":
      break;
    default:
      return null;
  }

  if (depth >= MAX_JSON_DEPTH) return null;
  const object = value as object;
  if (seen.has(object)) return null;
  seen.add(object);

  try {
    if (Array.isArray(object)) {
      return object.map((item) => convertJsonValue(item, depth + 1, seen));
    }
    if (object instanceof Date) {
      return Number.isNaN(object.getTime()) ? null : object.toISOString();
    }
    const out: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(object as Record<string, unknown>)) {
      out[key] = convertJsonValue(entry, depth + 1, seen);
    }
    return out;
  } catch {
    return null;
  } finally {
    seen.delete(object);
  }
}

/**
 * Coerce arbitrary runtime state into a JSON value. Never throws: `undefined`,
 * non-finite numbers, functions, and cycles become `null`.
 */
export function toJsonValue(value: unknown): JsonValue {
  return convertJsonValue(value, 0, new WeakSet<object>());
}
