/**
 * Pure codecs for the VLink CDC line protocol (docs/CDC_PROTOCOL.md §1–§4).
 *
 * No I/O lives here: parsing, serialization, device identity, and echo
 * matching only. Parsing never throws — a malformed line produces an error
 * result for the caller to log, and an unknown `type` parses to a
 * discriminated `unknown` variant so newer firmware stays forward compatible
 * with an older host (§1: ignore unknown types, never error).
 */

export const CDC_VERSION = 1;

/** Max line sizes per CDC_PROTOCOL.md §1 (bytes, newline excluded). */
export const CDC_MAX_DEVICE_LINE_BYTES = 512;
export const CDC_MAX_HOST_LINE_BYTES = 4096;

export type CdcDeviceState = "no-bus" | "idle" | "bored" | "working" | "ping" | "ask";
export type CdcButtonName = "boot" | "aux";
export type CdcPressKind = "short" | "long";
export type CdcZone = "status" | "ticker" | "creature" | "activity";
export type CdcTone = "green" | "amber";

const DEVICE_STATES: readonly CdcDeviceState[] = ["no-bus", "idle", "bored", "working", "ping", "ask"];
const BUTTON_NAMES: readonly CdcButtonName[] = ["boot", "aux"];
const PRESS_KINDS: readonly CdcPressKind[] = ["short", "long"];
const ZONES: readonly CdcZone[] = ["status", "ticker", "creature", "activity"];
const TONES: readonly CdcTone[] = ["green", "amber"];
const MAC_PATTERN = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

/** Device → host: sent once after boot and again after every `host-reset`. */
export interface CdcHelloMessage {
  type: "hello";
  device: string;
  fw: string;
  mac: string;
}

/** Device → host: a completed button press (GPIO9 = boot, GPIO18 = aux). */
export interface CdcButtonMessage {
  type: "button";
  button: CdcButtonName;
  press: CdcPressKind;
}

/** Device → host: the creature's UI state changed. */
export interface CdcStateMessage {
  type: "state";
  state: CdcDeviceState;
}

/** Device → host: a zone-C measurement (heap, uptime, rssi). */
export interface CdcTelemetryMessage {
  type: "telemetry";
  key: string;
  value: number | boolean | string;
}

/** Device → host: heartbeat, every 30 s; also the boredom clock. */
export interface CdcTickMessage {
  type: "tick";
  uptimeS: number;
  heapFree: number;
}

/** Host → device: bridge is up; the device may leave `no-bus`. */
export interface CdcAckMessage {
  type: "ack";
  fabric: string;
  instance: string;
}

/** Zone payloads for `render` (§4); fields ride flat on the line. */
export interface CdcStatusPayload {
  text: string;
  tone: CdcTone;
}
export interface CdcTickerPayload {
  text: string;
}
export interface CdcCreaturePayload {
  state: CdcDeviceState;
}
export interface CdcActivityPayload {
  fraction: number;
  tone?: CdcTone;
}
export type CdcZonePayload = CdcStatusPayload | CdcTickerPayload | CdcCreaturePayload | CdcActivityPayload;

/** Host → device: paint one zone. */
export interface CdcRenderMessage {
  type: "render";
  zone: CdcZone;
  id: string;
  payload: CdcZonePayload;
}

/** Host → device: an agent-side happening (ask face + ticker text ≥ 5 s). */
export interface CdcEventMessage {
  type: "event";
  name: string;
  text: string;
}

/** Device → host: the device applied the `render` with this id. */
export interface CdcEchoMessage {
  type: "echo";
  zone: CdcZone;
  id: string;
}

/** Host → device: the bridge is going down; the device returns to `no-bus`. */
export interface CdcByeMessage {
  type: "bye";
}

/** Forward compatibility: a known-version line with an unrecognized `type`. */
export interface CdcUnknownMessage {
  type: "unknown";
  messageType: string;
}

export type CdcMessage =
  | CdcHelloMessage
  | CdcButtonMessage
  | CdcStateMessage
  | CdcTelemetryMessage
  | CdcTickMessage
  | CdcAckMessage
  | CdcRenderMessage
  | CdcEventMessage
  | CdcEchoMessage
  | CdcByeMessage
  | CdcUnknownMessage;

/** Messages the device sends (§3) plus the `echo` reliability reply (§5). */
export type CdcDeviceMessage =
  | CdcHelloMessage
  | CdcButtonMessage
  | CdcStateMessage
  | CdcTelemetryMessage
  | CdcTickMessage
  | CdcEchoMessage;

/** Messages the host sends (§4). */
export type CdcHostMessage = CdcAckMessage | CdcRenderMessage | CdcEventMessage | CdcByeMessage;

export type CdcParseResult = { ok: true; message: CdcMessage } | { ok: false; error: string };

function invalid(error: string): CdcParseResult {
  return { ok: false, error };
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseZonePayload(zone: CdcZone, object: Record<string, unknown>): CdcZonePayload | string {
  switch (zone) {
    case "status": {
      const text = nonEmptyString(object.text);
      if (text === undefined) return "render status requires a non-empty text";
      const tone = enumValue(object.tone, TONES);
      if (tone === undefined) return "render status requires tone green|amber";
      return { text, tone };
    }
    case "ticker": {
      const text = nonEmptyString(object.text);
      if (text === undefined) return "render ticker requires a non-empty text";
      return { text };
    }
    case "creature": {
      const state = enumValue(object.state, DEVICE_STATES);
      if (state === undefined) return "render creature requires a device state";
      return { state };
    }
    case "activity": {
      const fraction = finiteNumber(object.fraction);
      if (fraction === undefined || fraction < 0 || fraction > 1) {
        return "render activity requires a fraction in [0, 1]";
      }
      const tone = object.tone === undefined ? undefined : enumValue(object.tone, TONES);
      if (tone === undefined && object.tone !== undefined) return "render activity tone must be green|amber";
      return tone === undefined ? { fraction } : { fraction, tone };
    }
  }
}

/**
 * Parse one CDC line (JSON object, `"v": 1`). Never throws: malformed input
 * yields `{ ok: false, error }`; an unknown `type` yields the `unknown`
 * variant. Unknown extra fields are ignored (forward compatibility).
 */
export function parseCdcLine(line: string): CdcParseResult {
  const text = line.trim();
  if (text.length === 0) return invalid("empty line");

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return invalid(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid("line is not a JSON object");
  }
  const object = value as Record<string, unknown>;
  if (object.v !== CDC_VERSION) {
    return invalid(`unsupported protocol version: ${JSON.stringify(object.v)}`);
  }
  const type = object.type;
  if (typeof type !== "string" || type.length === 0) {
    return invalid("missing type");
  }

  switch (type) {
    case "hello": {
      const device = nonEmptyString(object.device);
      if (device === undefined) return invalid("hello requires a non-empty device");
      const fw = nonEmptyString(object.fw);
      if (fw === undefined) return invalid("hello requires a non-empty fw");
      const mac = nonEmptyString(object.mac);
      if (mac === undefined) return invalid("hello requires a non-empty mac");
      if (!MAC_PATTERN.test(mac)) return invalid(`hello.mac is not a MAC address: ${mac}`);
      return { ok: true, message: { type: "hello", device, fw, mac: mac.toLowerCase() } };
    }
    case "button": {
      const button = enumValue(object.button, BUTTON_NAMES);
      if (button === undefined) return invalid("button requires button boot|aux");
      const press = enumValue(object.press, PRESS_KINDS);
      if (press === undefined) return invalid("button requires press short|long");
      return { ok: true, message: { type: "button", button, press } };
    }
    case "state": {
      const state = enumValue(object.state, DEVICE_STATES);
      if (state === undefined) return invalid("state requires a device state");
      return { ok: true, message: { type: "state", state } };
    }
    case "telemetry": {
      const key = nonEmptyString(object.key);
      if (key === undefined) return invalid("telemetry requires a non-empty key");
      const raw = object.value;
      if (typeof raw === "number" && !Number.isFinite(raw)) {
        return invalid("telemetry value must be a finite number, boolean, or string");
      }
      if (typeof raw !== "number" && typeof raw !== "boolean" && typeof raw !== "string") {
        return invalid("telemetry value must be a number, boolean, or string");
      }
      return { ok: true, message: { type: "telemetry", key, value: raw } };
    }
    case "tick": {
      const uptimeS = finiteNumber(object.uptimeS);
      if (uptimeS === undefined || uptimeS < 0) return invalid("tick requires a non-negative uptimeS");
      const heapFree = finiteNumber(object.heapFree);
      if (heapFree === undefined || heapFree < 0) return invalid("tick requires a non-negative heapFree");
      return { ok: true, message: { type: "tick", uptimeS, heapFree } };
    }
    case "ack": {
      const fabric = nonEmptyString(object.fabric);
      if (fabric === undefined) return invalid("ack requires a non-empty fabric");
      const instance = nonEmptyString(object.instance);
      if (instance === undefined) return invalid("ack requires a non-empty instance");
      return { ok: true, message: { type: "ack", fabric, instance } };
    }
    case "render": {
      const zone = enumValue(object.zone, ZONES);
      if (zone === undefined) return invalid("render requires zone status|ticker|creature|activity");
      const id = nonEmptyString(object.id);
      if (id === undefined) return invalid("render requires a non-empty id");
      const payload = parseZonePayload(zone, object);
      if (typeof payload === "string") return invalid(payload);
      return { ok: true, message: { type: "render", zone, id, payload } };
    }
    case "event": {
      const name = nonEmptyString(object.name);
      if (name === undefined) return invalid("event requires a non-empty name");
      const text = nonEmptyString(object.text);
      if (text === undefined) return invalid("event requires a non-empty text");
      return { ok: true, message: { type: "event", name, text } };
    }
    case "echo": {
      const zone = enumValue(object.zone, ZONES);
      if (zone === undefined) return invalid("echo requires zone status|ticker|creature|activity");
      const id = nonEmptyString(object.id);
      if (id === undefined) return invalid("echo requires a non-empty id");
      return { ok: true, message: { type: "echo", zone, id } };
    }
    case "bye": {
      return { ok: true, message: { type: "bye" } };
    }
    default: {
      return { ok: true, message: { type: "unknown", messageType: type } };
    }
  }
}

/**
 * Serialize a message to one CDC line (JSON, no newline). Zone payload fields
 * ride flat on the `render` line per §4. Throws only on the `unknown` variant,
 * which exists solely as a parse result.
 */
export function serializeCdcMessage(message: CdcMessage): string {
  const object: Record<string, unknown> = { v: CDC_VERSION, type: message.type };
  switch (message.type) {
    case "hello":
      object.device = message.device;
      object.fw = message.fw;
      object.mac = message.mac;
      break;
    case "button":
      object.button = message.button;
      object.press = message.press;
      break;
    case "state":
      object.state = message.state;
      break;
    case "telemetry":
      object.key = message.key;
      object.value = message.value;
      break;
    case "tick":
      object.uptimeS = message.uptimeS;
      object.heapFree = message.heapFree;
      break;
    case "ack":
      object.fabric = message.fabric;
      object.instance = message.instance;
      break;
    case "render":
      object.zone = message.zone;
      object.id = message.id;
      Object.assign(object, message.payload);
      break;
    case "event":
      object.name = message.name;
      object.text = message.text;
      break;
    case "echo":
      object.zone = message.zone;
      object.id = message.id;
      break;
    case "bye":
      break;
    case "unknown":
      throw new Error("cannot serialize an unknown CDC message");
  }
  return JSON.stringify(object);
}

/**
 * MAC-derived synthetic node id (§2): `node-` + the BASE MAC as 16 lowercase
 * hex digits, zero-padded on the left.
 * `b0:a6:04:8b:58:f8` → `node-0000b0a6048b58f8`.
 */
export function macToNodeId(mac: string): string {
  const hex = mac.replace(/:/g, "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(hex)) {
    throw new Error(`invalid MAC address: ${mac}`);
  }
  return `node-${hex.padStart(16, "0")}`;
}

/** True when `echo` acknowledges the render with id `renderId` (§5). */
export function isEchoFor(echo: CdcEchoMessage, renderId: string): boolean {
  return echo.id === renderId;
}
