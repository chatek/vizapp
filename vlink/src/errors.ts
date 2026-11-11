/**
 * VLink error taxonomy and serialization helpers.
 *
 * Every failure that crosses a boundary (NATS reply, health payload, OMP tool
 * result) is reduced to a {@link VLinkErrorPayload}; internal code throws a
 * {@link VLinkError} so the code survives that reduction.
 */

import type { JsonValue, VLinkErrorPayload } from "./types.ts";

export type VLinkErrorCode =
  | "CONFIG_INVALID"
  | "SUBJECT_INVALID"
  | "SUBJECT_TOKEN_INVALID"
  | "ENDPOINT_INVALID"
  | "PAYLOAD_INVALID"
  | "PAYLOAD_TOO_LARGE"
  | "BRIDGE_ACTION_UNKNOWN"
  | "NODE_NOT_FOUND"
  | "NODE_EXISTS"
  | "ATTRIBUTE_NOT_FOUND"
  | "UNSUPPORTED_ATTRIBUTE"
  | "UNSUPPORTED_CLUSTER"
  | "UNSUPPORTED_COMMAND"
  | "COMMAND_TIMEOUT"
  | "COMMISSION_FAILED"
  | "DISCOVERY_FAILED"
  | "DEVICE_OFFLINE"
  | "MATTER_NOT_READY"
  | "NATS_NOT_CONNECTED"
  | "MATTER_COMMAND_FAILED"
  | "INTERNAL_ERROR";

const MAX_DETAIL_DEPTH = 8;

/** Recursively coerce arbitrary details into JSON without throwing. */
function toJsonDetails(value: unknown, depth = 0, seen = new WeakSet<object>()): JsonValue {
  if (value === null || value === undefined) return null;

  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? value : null;
    case "bigint":
      return value.toString();
    case "function":
    case "symbol":
      return null;
    case "object":
      break;
  }

  if (depth >= MAX_DETAIL_DEPTH) return null;

  const object = value as object;
  if (seen.has(object)) return null;
  seen.add(object);

  try {
    if (object instanceof Error) {
      return { name: object.name, message: object.message };
    }
    if (Array.isArray(object)) {
      return object.map((item) => toJsonDetails(item, depth + 1, seen));
    }
    if (object instanceof Date) {
      return Number.isNaN(object.getTime()) ? null : object.toISOString();
    }
    const out: { [key: string]: JsonValue } = {};
    for (const [key, entry] of Object.entries(object as Record<string, unknown>)) {
      out[key] = toJsonDetails(entry, depth + 1, seen);
    }
    return out;
  } catch {
    return null;
  } finally {
    seen.delete(object);
  }
}

/**
 * Error raised anywhere inside VLink. `code` is the stable wire identifier;
 * `details` is optional structured context that is safe to publish.
 */
export class VLinkError extends Error {
  readonly code: VLinkErrorCode;
  readonly details?: JsonValue;

  constructor(code: VLinkErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "VLinkError";
    this.code = code;
    if (details !== undefined) {
      this.details = toJsonDetails(details);
    }
  }
}

/** True when `error` is a {@link VLinkError} (survives cross-realm-ish checks). */
export function isVLinkError(error: unknown): error is VLinkError {
  return error instanceof VLinkError;
}

/**
 * Normalize any thrown value into a {@link VLinkError}. Non-`Error` values get
 * their string form; unknown errors are tagged with `fallbackCode`.
 */
export function asVLinkError(error: unknown, fallbackCode: VLinkErrorCode = "INTERNAL_ERROR"): VLinkError {
  if (error instanceof VLinkError) return error;

  if (error instanceof Error) {
    const normalized = new VLinkError(fallbackCode, error.message || error.name);
    if (error.stack) normalized.stack = error.stack;
    return normalized;
  }

  let message: string;
  try {
    message = typeof error === "string" ? error : JSON.stringify(error) ?? String(error);
  } catch {
    message = String(error);
  }
  return new VLinkError(fallbackCode, message);
}

/** Convert any thrown value into the serializable wire payload. */
export function toErrorPayload(error: unknown): VLinkErrorPayload {
  const normalized = asVLinkError(error);
  const payload: VLinkErrorPayload = {
    code: normalized.code,
    message: normalized.message,
  };
  if (normalized.details !== undefined) payload.details = normalized.details;
  return payload;
}
