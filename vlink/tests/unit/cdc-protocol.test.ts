/**
 * Unit: pure CDC protocol codecs (docs/CDC_PROTOCOL.md §1–§4). No I/O, no
 * timers — only parse/serialize behavior, malformed input, and identity.
 */

import { describe, expect, test } from "bun:test";

import {
  CDC_MAX_DEVICE_LINE_BYTES,
  CDC_MAX_HOST_LINE_BYTES,
  CDC_VERSION,
  isEchoFor,
  macToNodeId,
  parseCdcLine,
  serializeCdcMessage,
  type CdcMessage,
} from "../../src/cdc/cdc-protocol.ts";

const MESSAGES: CdcMessage[] = [
  { type: "hello", device: "vlink-c6", fw: "1.2.3", mac: "b0:a6:04:8b:58:f8" },
  { type: "button", button: "boot", press: "short" },
  { type: "button", button: "aux", press: "long" },
  { type: "state", state: "no-bus" },
  { type: "state", state: "idle" },
  { type: "state", state: "bored" },
  { type: "state", state: "working" },
  { type: "state", state: "ping" },
  { type: "state", state: "ask" },
  { type: "telemetry", key: "rssi", value: -62 },
  { type: "telemetry", key: "heap", value: 123456 },
  { type: "telemetry", key: "ssid", value: "lab-iot" },
  { type: "telemetry", key: "usbPowered", value: true },
  { type: "tick", uptimeS: 30, heapFree: 100000 },
  { type: "ack", fabric: "fabric-0000000000000001", instance: "macbook-pro" },
  { type: "render", zone: "status", id: "render-1", payload: { text: "awake · 13 friends", tone: "green" } },
  { type: "render", zone: "status", id: "render-2", payload: { text: "agent · hard to hear", tone: "amber" } },
  { type: "render", zone: "ticker", id: "render-3", payload: { text: "> onOff.toggle 42ms ok" } },
  { type: "render", zone: "creature", id: "render-4", payload: { state: "idle" } },
  { type: "render", zone: "activity", id: "render-5", payload: { fraction: 0.46, tone: "amber" } },
  { type: "render", zone: "activity", id: "render-6", payload: { fraction: 0 } },
  { type: "event", name: "build", text: "build finished in 4.2s" },
  { type: "echo", zone: "status", id: "render-1" },
  { type: "bye" },
];

function parseOk(line: string): CdcMessage {
  const result = parseCdcLine(line);
  if (!result.ok) throw new Error(`parse failed: ${result.error}`);
  return result.message;
}

describe("CDC round trips", () => {
  test("every message survives serialize → parse unchanged", () => {
    for (const message of MESSAGES) {
      const line = serializeCdcMessage(message);
      expect(line.includes("\n")).toBe(false);
      expect(parseCdcLine(line)).toEqual({ ok: true, message });
    }
  });

  test("serialized lines carry v:1 and flatten render payloads", () => {
    const line = serializeCdcMessage({
      type: "render",
      zone: "status",
      id: "render-9",
      payload: { text: "hello", tone: "amber" },
    });
    const raw = JSON.parse(line) as Record<string, unknown>;
    expect(raw.v).toBe(CDC_VERSION);
    expect(raw.type).toBe("render");
    expect(raw.zone).toBe("status");
    expect(raw.id).toBe("render-9");
    expect(raw.text).toBe("hello");
    expect(raw.tone).toBe("amber");
    expect(raw.payload).toBeUndefined();
  });

  test("parse accepts surrounding whitespace and CRLF-style noise", () => {
    const message = parseOk('  {"v":1,"type":"bye"}  ');
    expect(message).toEqual({ type: "bye" });
  });

  test("unknown types parse to the discriminated unknown variant", () => {
    expect(parseCdcLine('{"v":1,"type":" futureFeature ","x":1}')).toEqual({
      ok: true,
      message: { type: "unknown", messageType: " futureFeature " },
    });
  });

  test("protocol limits are exported per §1", () => {
    expect(CDC_MAX_DEVICE_LINE_BYTES).toBe(512);
    expect(CDC_MAX_HOST_LINE_BYTES).toBe(4096);
  });
});

describe("CDC malformed input", () => {
  test("rejects empty and whitespace-only lines", () => {
    expect(parseCdcLine("")).toEqual({ ok: false, error: "empty line" });
    expect(parseCdcLine("   ").ok).toBe(false);
  });

  test("rejects invalid JSON without throwing", () => {
    const result = parseCdcLine('{"v":1,"type":"bye"');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("invalid JSON");
  });

  test("rejects non-objects and arrays", () => {
    expect(parseCdcLine("42").ok).toBe(false);
    expect(parseCdcLine('"bye"').ok).toBe(false);
    expect(parseCdcLine("null").ok).toBe(false);
    expect(parseCdcLine("[1,2]").ok).toBe(false);
  });

  test("rejects wrong or missing version", () => {
    expect(parseCdcLine('{"v":2,"type":"bye"}').ok).toBe(false);
    expect(parseCdcLine('{"type":"bye"}').ok).toBe(false);
  });

  test("rejects missing or non-string type", () => {
    expect(parseCdcLine('{"v":1}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":7}').ok).toBe(false);
  });

  test("validates hello fields", () => {
    expect(parseCdcLine('{"v":1,"type":"hello","fw":"1.0.0","mac":"b0:a6:04:8b:58:f8"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"hello","device":"vlink-c6","mac":"b0:a6:04:8b:58:f8"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"hello","device":"vlink-c6","fw":"1.0.0"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"hello","device":"vlink-c6","fw":"1.0.0","mac":"not-a-mac"}').ok).toBe(false);
  });

  test("normalizes hello mac to lowercase", () => {
    const message = parseOk('{"v":1,"type":"hello","device":"vlink-c6","fw":"1.0.0","mac":"B0:A6:04:8B:58:F8"}');
    expect(message).toEqual({ type: "hello", device: "vlink-c6", fw: "1.0.0", mac: "b0:a6:04:8b:58:f8" });
  });

  test("validates button and state enums", () => {
    expect(parseCdcLine('{"v":1,"type":"button","button":"side","press":"short"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"button","button":"boot","press":"double"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"state","state":"sleepy"}').ok).toBe(false);
  });

  test("validates telemetry and tick values", () => {
    expect(parseCdcLine('{"v":1,"type":"telemetry","key":"heap","value":null}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"telemetry","value":1}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"tick","uptimeS":-1,"heapFree":10}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"tick","uptimeS":1,"heapFree":"many"}').ok).toBe(false);
  });

  test("validates render zone payloads", () => {
    expect(parseCdcLine('{"v":1,"type":"render","zone":"status","id":"r1","text":"hi","tone":"red"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"ticker","id":"r1"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"creature","id":"r1","state":"awake"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"activity","id":"r1","fraction":1.5}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"activity","id":"r1","fraction":"0.5"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"banner","id":"r1","text":"hi"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"render","zone":"ticker","text":"hi"}').ok).toBe(false);
  });

  test("validates event and echo fields", () => {
    expect(parseCdcLine('{"v":1,"type":"event","name":"","text":"hi"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"event","name":"build"}').ok).toBe(false);
    expect(parseCdcLine('{"v":1,"type":"echo","zone":"status"}').ok).toBe(false);
  });

  test("ignores unknown extra fields (forward compatibility)", () => {
    expect(parseCdcLine('{"v":1,"type":"bye","futureField":{"deep":[1]}}')).toEqual({
      ok: true,
      message: { type: "bye" },
    });
  });
});

describe("CDC identity and echo matching", () => {
  test("macToNodeId zero-pads the BASE MAC to 16 hex digits", () => {
    expect(macToNodeId("b0:a6:04:8b:58:f8")).toBe("node-0000b0a6048b58f8");
    expect(macToNodeId("00:00:00:00:00:2a")).toBe("node-000000000000002a");
  });

  test("macToNodeId rejects malformed MACs", () => {
    expect(() => macToNodeId("b0:a6:04:8b:58")).toThrow();
    expect(() => macToNodeId("zz:a6:04:8b:58:f8")).toThrow();
    expect(() => macToNodeId("")).toThrow();
  });

  test("isEchoFor matches on the render id", () => {
    const echo = { type: "echo" as const, zone: "status" as const, id: "render-7" };
    expect(isEchoFor(echo, "render-7")).toBe(true);
    expect(isEchoFor(echo, "render-8")).toBe(false);
  });
});
