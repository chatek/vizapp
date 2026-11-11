/**
 * NATS subject taxonomy for VLink.
 *
 * Concrete subjects are canonical and token-safe:
 *   iot.matter.<fabric>.<node>.<endpoint>.<cluster>.<attribute>
 *   iot.event.matter.<fabric>.<node>.<endpoint>.<cluster>.<event>
 *   iot.cmd.matter.<fabric>.<node>.<endpoint>.<cluster>.<command>
 *   iot.cmd.matter.<fabric>.bridge.<action>
 *   iot.bridge.vlink.<instance>.status
 *
 * Only subscriptions use wildcards. Fabric/node identity lives in the subject;
 * aliases are metadata and never appear there.
 */

import { VLinkError } from "./errors.ts";
import type { BridgeAction, ParsedCommandSubject } from "./types.ts";

export const TELEMETRY_WILDCARD = "iot.matter.>";
export const COMMAND_WILDCARD = "iot.cmd.matter.>";
export const EVENT_WILDCARD = "iot.event.matter.>";

export const BRIDGE_ACTIONS = [
  "status",
  "list",
  "discover",
  "commission",
  "decommission",
  "read",
  "write",
] as const satisfies readonly BridgeAction[];

export function isBridgeAction(value: unknown): value is BridgeAction {
  return typeof value === "string" && (BRIDGE_ACTIONS as readonly string[]).includes(value);
}

const ID_PREFIX = {
  fabric: "fabric",
  node: "node",
} as const;

type IdKind = keyof typeof ID_PREFIX;

const MAX_ID = (1n << 64n) - 1n;

function invalidId(kind: IdKind, value: unknown, reason: string): VLinkError {
  return new VLinkError("SUBJECT_TOKEN_INVALID", `invalid ${kind} id: ${reason}`, {
    kind,
    value: typeof value === "bigint" ? value.toString() : value,
  });
}

function parseIdBigInt(kind: IdKind, value: string | number | bigint): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) throw invalidId(kind, value, "must be non-negative");
    if (value > MAX_ID) throw invalidId(kind, value, "exceeds 64 bits");
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw invalidId(kind, value, "must be a non-negative integer");
    }
    const numeric = BigInt(value);
    if (numeric > MAX_ID) throw invalidId(kind, value, "exceeds 64 bits");
    return numeric;
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) throw invalidId(kind, value, "empty");

  const prefixed = `${kind}-`;
  let digits: string;
  let radix: 10 | 16;

  if (trimmed.startsWith(prefixed)) {
    // Already a canonical subject token: the remainder is always hex.
    digits = trimmed.slice(prefixed.length);
    radix = 16;
  } else if (trimmed.startsWith("0x")) {
    digits = trimmed.slice(2);
    radix = 16;
  } else if (/^[0-9]+$/.test(trimmed)) {
    digits = trimmed;
    radix = 10;
  } else if (/^[0-9a-f]+$/.test(trimmed)) {
    digits = trimmed;
    radix = 16;
  } else {
    throw invalidId(kind, value, "expected hex, decimal, or an existing subject token");
  }

  if (digits.length === 0) throw invalidId(kind, value, "empty");
  const numeric = BigInt(`${radix === 16 ? "0x" : ""}${digits}`);
  if (numeric > MAX_ID) throw invalidId(kind, value, "exceeds 64 bits");
  return numeric;
}

function normalizeId(kind: IdKind, value: string | number | bigint): string {
  const numeric = parseIdBigInt(kind, value);
  return `${ID_PREFIX[kind]}-${numeric.toString(16).padStart(16, "0")}`;
}

/** Canonical `fabric-<16 lowercase hex>` token. */
export function normalizeFabricId(value: string | number | bigint): string {
  return normalizeId("fabric", value);
}

/** Canonical `node-<16 lowercase hex>` token. */
export function normalizeNodeId(value: string | number | bigint): string {
  return normalizeId("node", value);
}

/**
 * Matter cluster/attribute/command names are lower-camel on the wire:
 * `OnOff` -> `onOff`, `LocalTemperature` -> `localTemperature`. Idempotent.
 */
export function lowerCamel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  return trimmed[0].toLowerCase() + trimmed.slice(1);
}

/**
 * A concrete subject token must be non-empty and free of the characters that
 * give NATS structural meaning. Throws `SUBJECT_TOKEN_INVALID`.
 */
export function assertSubjectToken(token: string, what = "subject token"): void {
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new VLinkError("SUBJECT_TOKEN_INVALID", `${what} must be a non-empty string`, { what });
  }
  if (/[.*>\s]/.test(token)) {
    throw new VLinkError(
      "SUBJECT_TOKEN_INVALID",
      `${what} must not contain '.', '*', '>', or whitespace`,
      { what, token },
    );
  }
}

/** Endpoint ids are non-negative integers; throws `ENDPOINT_INVALID`. */
export function assertEndpointId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new VLinkError("ENDPOINT_INVALID", "endpoint id must be a non-negative integer", {
      endpointId: typeof value === "number" ? value : String(value),
    });
  }
  return value;
}

/** Matter names are lower-camel on the wire and must be token-safe. */
function matterName(value: string, what: string): string {
  const normalized = lowerCamel(value);
  assertSubjectToken(normalized, what);
  return normalized;
}

export interface AttributeSubjectInput {
  fabricId: string | number | bigint;
  nodeId: string | number | bigint;
  endpointId: number;
  cluster: string;
  attribute: string;
}

export interface EventSubjectInput {
  fabricId: string | number | bigint;
  nodeId: string | number | bigint;
  endpointId: number;
  cluster: string;
  event: string;
}

export interface CommandSubjectInput {
  fabricId: string | number | bigint;
  nodeId: string | number | bigint;
  endpointId: number;
  cluster: string;
  command: string;
}

/** `iot.matter.<fabric>.<node>.<endpoint>.<cluster>.<attribute>` */
export function telemetrySubject(input: AttributeSubjectInput): string {
  return [
    "iot",
    "matter",
    normalizeFabricId(input.fabricId),
    normalizeNodeId(input.nodeId),
    String(assertEndpointId(input.endpointId)),
    matterName(input.cluster, "cluster"),
    matterName(input.attribute, "attribute"),
  ].join(".");
}

/** `iot.event.matter.<fabric>.<node>.<endpoint>.<cluster>.<event>` */
export function eventSubject(input: EventSubjectInput): string {
  return [
    "iot",
    "event",
    "matter",
    normalizeFabricId(input.fabricId),
    normalizeNodeId(input.nodeId),
    String(assertEndpointId(input.endpointId)),
    matterName(input.cluster, "cluster"),
    matterName(input.event, "event"),
  ].join(".");
}

/** `iot.cmd.matter.<fabric>.<node>.<endpoint>.<cluster>.<command>` */
export function commandSubject(input: CommandSubjectInput): string {
  return [
    "iot",
    "cmd",
    "matter",
    normalizeFabricId(input.fabricId),
    normalizeNodeId(input.nodeId),
    String(assertEndpointId(input.endpointId)),
    matterName(input.cluster, "cluster"),
    matterName(input.command, "command"),
  ].join(".");
}

/** `iot.cmd.matter.<fabric>.bridge.<action>` */
export function bridgeCommandSubject(fabricId: string | number | bigint, action: BridgeAction | string): string {
  if (!isBridgeAction(action)) {
    throw new VLinkError("BRIDGE_ACTION_UNKNOWN", `unknown bridge action: ${String(action)}`, {
      action: String(action),
    });
  }
  return ["iot", "cmd", "matter", normalizeFabricId(fabricId), "bridge", action].join(".");
}

/** `iot.bridge.vlink.<instance>.status` */
export function healthSubject(instanceId: string): string {
  assertSubjectToken(instanceId, "instance id");
  return ["iot", "bridge", "vlink", instanceId, "status"].join(".");
}

/**
 * Parse a concrete command subject. Accepts the device form and the bridge
 * form; anything else is `SUBJECT_INVALID` (bad endpoints are `ENDPOINT_INVALID`).
 */
export function parseCommandSubject(subject: string): ParsedCommandSubject {
  if (typeof subject !== "string" || subject.length === 0) {
    throw new VLinkError("SUBJECT_INVALID", "command subject must be a non-empty string");
  }

  const parts = subject.split(".");
  if (parts.length < 5 || parts[0] !== "iot" || parts[1] !== "cmd" || parts[2] !== "matter") {
    throw new VLinkError("SUBJECT_INVALID", `not a VLink command subject: ${subject}`, { subject });
  }

  const fabricId = parts[3];
  if (!fabricId) {
    throw new VLinkError("SUBJECT_INVALID", "command subject is missing a fabric id", { subject });
  }

  if (parts.length === 6 && parts[4] === "bridge") {
    const action = parts[5];
    if (!action || !isBridgeAction(action)) {
      throw new VLinkError("SUBJECT_INVALID", `unknown bridge action in subject: ${action ?? ""}`, {
        subject,
        action: action ?? null,
      });
    }
    return { kind: "bridge", fabricId, action };
  }

  if (parts.length === 8) {
    const nodeId = parts[4];
    const endpointRaw = parts[5];
    const cluster = parts[6];
    const command = parts[7];

    if (!nodeId || !cluster || !command) {
      throw new VLinkError("SUBJECT_INVALID", `malformed device command subject: ${subject}`, {
        subject,
      });
    }
    if (!/^[0-9]+$/.test(endpointRaw)) {
      throw new VLinkError("ENDPOINT_INVALID", `endpoint is not a non-negative integer: ${endpointRaw}`, {
        subject,
        endpointId: endpointRaw,
      });
    }
    const endpointId = Number(endpointRaw);
    if (!Number.isSafeInteger(endpointId)) {
      throw new VLinkError("ENDPOINT_INVALID", `endpoint out of range: ${endpointRaw}`, {
        subject,
        endpointId: endpointRaw,
      });
    }
    return { kind: "device", fabricId, nodeId, endpointId, cluster, command };
  }

  throw new VLinkError("SUBJECT_INVALID", `unrecognized command subject shape: ${subject}`, { subject });
}
