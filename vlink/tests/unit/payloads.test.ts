import { describe, expect, test } from "bun:test";

import { VLinkError } from "../../src/errors.ts";
import type { VLinkErrorCode } from "../../src/errors.ts";
import {
  MAX_PAYLOAD_BYTES,
  encodeAttributeTelemetry,
  encodeCommandResult,
  encodeEventTelemetry,
  encodeHealth,
  isJsonValue,
  parseCommandPayload,
  toJsonValue,
} from "../../src/payloads.ts";
import type {
  AttributeTelemetry,
  BridgeCommandPayload,
  CommandResult,
  EventTelemetry,
  VLinkHealth,
} from "../../src/types.ts";

function expectCode(fn: () => unknown, code: VLinkErrorCode): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(VLinkError);
    expect((error as VLinkError).code).toBe(code);
    return;
  }
  throw new Error(`expected VLinkError ${code}`);
}

function decode(bytes: Uint8Array): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

const deviceCommand = {
  v: 1,
  type: "command",
  requestId: "01J9TEST",
  fabricId: "fabric-0000000000000001",
  nodeId: "node-000000000000002a",
  endpointId: 1,
  cluster: "onOff",
  command: "toggle",
  args: {},
  timeoutMs: 5000,
};

const bridgeCommand = {
  v: 1,
  type: "bridge",
  requestId: "01J9BRIDGE",
  action: "commission",
  pairingCode: "34970112332",
  transport: "ble-wifi",
  wifi: { ssid: "lab-iot", password: "wifi-pass" },
  timeoutMs: 120000,
};

describe("parseCommandPayload acceptance", () => {
  test("accepts a valid device command as an object", () => {
    const parsed = parseCommandPayload(deviceCommand);
    expect(parsed).toMatchObject(deviceCommand);
  });

  test("accepts a valid device command as JSON text", () => {
    const parsed = parseCommandPayload(JSON.stringify(deviceCommand));
    expect(parsed.type).toBe("command");
    if (parsed.type === "command") {
      expect(parsed.requestId).toBe("01J9TEST");
      expect(parsed.nodeId).toBe("node-000000000000002a");
      expect(parsed.endpointId).toBe(1);
      expect(parsed.cluster).toBe("onOff");
      expect(parsed.command).toBe("toggle");
    }
  });

  test("accepts UTF-8 bytes", () => {
    const parsed = parseCommandPayload(new TextEncoder().encode(JSON.stringify(bridgeCommand)));
    expect(parsed.type).toBe("bridge");
  });

  test("accepts the bridge form and preserves Wi-Fi fields", () => {
    const parsed = parseCommandPayload(bridgeCommand) as BridgeCommandPayload;
    expect(parsed.action).toBe("commission");
    expect(parsed.wifi).toEqual({ ssid: "lab-iot", password: "wifi-pass" });
    expect(parsed.timeoutMs).toBe(120000);
  });

  test("ignores unknown extra fields", () => {
    const parsed = parseCommandPayload({ ...deviceCommand, futureField: { nested: true } });
    expect("futureField" in parsed).toBe(false);
  });
});

describe("parseCommandPayload rejection", () => {
  test("missing or wrong version is PAYLOAD_INVALID", () => {
    const missingV: Record<string, unknown> = { ...deviceCommand };
    delete missingV.v;
    expectCode(() => parseCommandPayload(missingV), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload({ ...deviceCommand, v: 2 }), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload({ ...deviceCommand, v: "1" }), "PAYLOAD_INVALID");
  });

  test("missing required device fields are PAYLOAD_INVALID", () => {
    for (const field of ["nodeId", "endpointId", "cluster", "command"]) {
      const payload: Record<string, unknown> = { ...deviceCommand };
      delete payload[field];
      expectCode(() => parseCommandPayload(payload), "PAYLOAD_INVALID");
    }
  });

  test("bad field types are PAYLOAD_INVALID", () => {
    expectCode(() => parseCommandPayload({ ...deviceCommand, endpointId: -1 }), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload({ ...deviceCommand, endpointId: 1.5 }), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload({ ...deviceCommand, nodeId: 42 }), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload({ ...deviceCommand, cluster: "" }), "PAYLOAD_INVALID");
  });

  test("unknown bridge action is BRIDGE_ACTION_UNKNOWN", () => {
    expectCode(() => parseCommandPayload({ ...bridgeCommand, action: "explode" }), "BRIDGE_ACTION_UNKNOWN");
  });

  test("non-object JSON is PAYLOAD_INVALID", () => {
    for (const text of ["null", "42", '"hello"', "[1,2,3]", "true"]) {
      expectCode(() => parseCommandPayload(text), "PAYLOAD_INVALID");
    }
    expectCode(() => parseCommandPayload(new Uint8Array([0xff, 0xfe, 0x00])), "PAYLOAD_INVALID");
    expectCode(() => parseCommandPayload("{not json"), "PAYLOAD_INVALID");
  });

  test("oversized payloads are PAYLOAD_TOO_LARGE", () => {
    const bytes = new Uint8Array(MAX_PAYLOAD_BYTES + 1).fill(0x20);
    expectCode(() => parseCommandPayload(bytes), "PAYLOAD_TOO_LARGE");
    expectCode(() => parseCommandPayload(" ".repeat(MAX_PAYLOAD_BYTES + 1)), "PAYLOAD_TOO_LARGE");
  });

  test("unknown payload type is PAYLOAD_INVALID", () => {
    expectCode(() => parseCommandPayload({ ...deviceCommand, type: "telemetry" }), "PAYLOAD_INVALID");
  });
});

describe("encoders", () => {
  test("attribute telemetry is JSON with v:1", () => {
    const value: AttributeTelemetry = {
      v: 1,
      type: "attribute",
      fabricId: "fabric-0000000000000001",
      nodeId: "node-000000000000002a",
      endpointId: 1,
      cluster: "onOff",
      attribute: "onOff",
      value: true,
      previousValue: false,
      timestamp: 1762819200000,
      source: "subscription",
    };
    const decoded = decode(encodeAttributeTelemetry(value));
    expect(decoded.v).toBe(1);
    expect(decoded.type).toBe("attribute");
    expect(decoded.value).toBe(true);
    expect(decoded.attribute).toBe("onOff");
  });

  test("event telemetry is JSON with v:1", () => {
    const value: EventTelemetry = {
      v: 1,
      type: "event",
      fabricId: "fabric-0000000000000001",
      nodeId: "node-000000000000002a",
      endpointId: 1,
      cluster: "switch",
      event: "latchSwitch",
      timestamp: 1762819200000,
    };
    const decoded = decode(encodeEventTelemetry(value));
    expect(decoded.v).toBe(1);
    expect(decoded.type).toBe("event");
    expect(decoded.event).toBe("latchSwitch");
  });

  test("command result includes reply fields and v:1", () => {
    const result: CommandResult = {
      v: 1,
      ok: true,
      requestId: "01J9TEST",
      nodeId: "node-000000000000002a",
      endpointId: 1,
      cluster: "onOff",
      command: "toggle",
      data: { onOff: true },
      startedAt: 1762819200000,
      completedAt: 1762819200042,
      durationMs: 42,
    };
    const decoded = decode(encodeCommandResult(result));
    expect(decoded.v).toBe(1);
    expect(decoded.ok).toBe(true);
    expect(decoded.requestId).toBe("01J9TEST");
    expect(decoded.data).toEqual({ onOff: true });
  });

  test("health payload includes v:1 even if the input object omitted it", () => {
    const health = {
      instanceId: "local",
      state: "ready",
      natsUrl: "nats://127.0.0.1:14222",
      natsConnected: true,
      matterMode: "sim",
      matterReady: true,
      bleAvailable: false,
      nodeCount: 1,
      uptimeMs: 10,
    } as unknown as VLinkHealth;
    expect(decode(encodeHealth(health)).v).toBe(1);
  });

  test("non-serializable values throw PAYLOAD_INVALID", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expectCode(() => encodeCommandResult(cyclic as unknown as CommandResult), "PAYLOAD_INVALID");
    expectCode(
      () => encodeCommandResult({ v: 1, ok: true, data: 1n } as unknown as CommandResult),
      "PAYLOAD_INVALID",
    );
  });
});

describe("JSON helpers", () => {
  test("toJsonValue never throws and maps undefined to null", () => {
    expect(toJsonValue(undefined)).toBeNull();
    expect(toJsonValue(Number.NaN)).toBeNull();
    expect(toJsonValue(10n)).toBe("10");
    expect(toJsonValue({ a: undefined, b: [1, "two", null] })).toEqual({
      a: null,
      b: [1, "two", null],
    });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => toJsonValue(cyclic)).not.toThrow();
  });

  test("isJsonValue recognizes JSON and rejects runtime-only values", () => {
    expect(isJsonValue({ a: [1, "x", null, true] })).toBe(true);
    expect(isJsonValue("text")).toBe(true);
    expect(isJsonValue(undefined)).toBe(false);
    expect(isJsonValue(() => 1)).toBe(false);
    expect(isJsonValue(Number.POSITIVE_INFINITY)).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonValue(cyclic)).toBe(false);
  });
});
