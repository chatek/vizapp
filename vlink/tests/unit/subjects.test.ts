import { describe, expect, test } from "bun:test";

import { VLinkError } from "../../src/errors.ts";
import type { VLinkErrorCode } from "../../src/errors.ts";
import {
  assertEndpointId,
  assertSubjectToken,
  bridgeCommandSubject,
  commandSubject,
  COMMAND_WILDCARD,
  eventSubject,
  healthSubject,
  isBridgeAction,
  lowerCamel,
  normalizeFabricId,
  normalizeNodeId,
  parseCommandSubject,
  telemetrySubject,
} from "../../src/subjects.ts";

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

/** Minimal NATS subject matcher: supports `*` and a trailing `>`. */
function matches(subject: string, wildcard: string): boolean {
  const parts = subject.split(".");
  const pattern = wildcard.split(".");
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] === ">") return i < parts.length;
    if (parts[i] === undefined) return false;
    if (pattern[i] !== "*" && pattern[i] !== parts[i]) return false;
  }
  return parts.length === pattern.length;
}

describe("identity normalization", () => {
  test("fabric id hex, decimal string, number, and bigint normalize to 16 hex digits", () => {
    expect(normalizeFabricId("0x0000000000000001")).toBe("fabric-0000000000000001");
    expect(normalizeFabricId("fabric-0000000000000001")).toBe("fabric-0000000000000001");
    expect(normalizeFabricId(1)).toBe("fabric-0000000000000001");
    expect(normalizeFabricId(1n)).toBe("fabric-0000000000000001");
    expect(normalizeFabricId("1")).toBe("fabric-0000000000000001");
  });

  test("node id 0x2a and 42 both normalize to 0x2a", () => {
    expect(normalizeNodeId("0x2a")).toBe("node-000000000000002a");
    expect(normalizeNodeId(0x2a)).toBe("node-000000000000002a");
    expect(normalizeNodeId(42)).toBe("node-000000000000002a");
    expect(normalizeNodeId("42")).toBe("node-000000000000002a");
    expect(normalizeNodeId(42n)).toBe("node-000000000000002a");
  });

  test("non-canonical or negative ids are rejected", () => {
    expectCode(() => normalizeFabricId(""), "SUBJECT_TOKEN_INVALID");
    expectCode(() => normalizeNodeId(-1), "SUBJECT_TOKEN_INVALID");
    expectCode(() => normalizeNodeId(1.5), "SUBJECT_TOKEN_INVALID");
    expectCode(() => normalizeNodeId("not-hex"), "SUBJECT_TOKEN_INVALID");
  });

  test("lowerCamel handles Matter names and is idempotent", () => {
    expect(lowerCamel("OnOff")).toBe("onOff");
    expect(lowerCamel("LocalTemperature")).toBe("localTemperature");
    expect(lowerCamel("onOff")).toBe("onOff");
    expect(lowerCamel("localTemperature")).toBe("localTemperature");
  });
});

describe("subject builders", () => {
  test("telemetry subject follows the documented shape", () => {
    expect(
      telemetrySubject({
        fabricId: 1,
        nodeId: 0x2a,
        endpointId: 1,
        cluster: "OnOff",
        attribute: "OnOff",
      }),
    ).toBe("iot.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.onOff");
  });

  test("event subject follows the documented shape", () => {
    expect(
      eventSubject({
        fabricId: "fabric-0000000000000001",
        nodeId: "node-000000000000002a",
        endpointId: 1,
        cluster: "Switch",
        event: "LatchSwitch",
      }),
    ).toBe("iot.event.matter.fabric-0000000000000001.node-000000000000002a.1.switch.latchSwitch");
  });

  test("command subject follows the documented shape", () => {
    expect(
      commandSubject({
        fabricId: 1,
        nodeId: 0x2a,
        endpointId: 1,
        cluster: "OnOff",
        command: "Toggle",
      }),
    ).toBe("iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.toggle");
  });

  test("bridge command and health subjects", () => {
    expect(bridgeCommandSubject(1, "commission")).toBe(
      "iot.cmd.matter.fabric-0000000000000001.bridge.commission",
    );
    expect(healthSubject("local")).toBe("iot.bridge.vlink.local.status");
  });

  test("bridge subject rejects unknown actions", () => {
    expectCode(() => bridgeCommandSubject(1, "explode"), "BRIDGE_ACTION_UNKNOWN");
    expect(isBridgeAction("status")).toBe(true);
    expect(isBridgeAction("explode")).toBe(false);
  });
});

describe("token validation", () => {
  test("invalid tokens throw SUBJECT_TOKEN_INVALID", () => {
    for (const bad of ["", "   ", "a.b", "a*", "a>", "a b", "a\tb"]) {
      expectCode(() => assertSubjectToken(bad), "SUBJECT_TOKEN_INVALID");
    }
    expectCode(
      () =>
        commandSubject({
          fabricId: 1,
          nodeId: 1,
          endpointId: 1,
          cluster: "on.off",
          command: "toggle",
        }),
      "SUBJECT_TOKEN_INVALID",
    );
  });

  test("accepts a normal token", () => {
    expect(() => assertSubjectToken("onOff")).not.toThrow();
  });
});

describe("command subject parsing", () => {
  test("parses the device form", () => {
    expect(
      parseCommandSubject("iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.toggle"),
    ).toEqual({
      kind: "device",
      fabricId: "fabric-0000000000000001",
      nodeId: "node-000000000000002a",
      endpointId: 1,
      cluster: "onOff",
      command: "toggle",
    });
  });

  test("parses the bridge form", () => {
    expect(parseCommandSubject("iot.cmd.matter.fabric-0000000000000001.bridge.commission")).toEqual({
      kind: "bridge",
      fabricId: "fabric-0000000000000001",
      action: "commission",
    });
  });

  test("wildcard subscribes to both device and bridge subjects", () => {
    const device = "iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.toggle";
    const bridge = "iot.cmd.matter.fabric-0000000000000001.bridge.status";
    expect(matches(device, COMMAND_WILDCARD)).toBe(true);
    expect(matches(bridge, COMMAND_WILDCARD)).toBe(true);
    expect(matches("iot.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.onOff", COMMAND_WILDCARD)).toBe(
      false,
    );
  });

  test("non-integer and negative endpoints throw ENDPOINT_INVALID", () => {
    expectCode(
      () => parseCommandSubject("iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.one.onOff.toggle"),
      "ENDPOINT_INVALID",
    );
    expectCode(() => assertEndpointId(-1), "ENDPOINT_INVALID");
    expectCode(() => assertEndpointId(1.5), "ENDPOINT_INVALID");
    expectCode(() => assertEndpointId("1"), "ENDPOINT_INVALID");
  });

  test("unrecognized shapes throw SUBJECT_INVALID", () => {
    for (const bad of [
      "",
      "iot.matter.fabric-1.node-1.1.onOff.onOff",
      "iot.cmd.matter",
      "iot.cmd.matter.fabric-1.bridge.explode",
      "iot.cmd.matter.fabric-1.node-1.1.onOff",
      "agents.cmd.matter.fabric-1.node-1.1.onOff.toggle",
    ]) {
      expectCode(() => parseCommandSubject(bad), "SUBJECT_INVALID");
    }
  });

  test("round-trips generated subjects through build/parse", () => {
    const fabrics: Array<string | number | bigint> = [1, 0x2a, "0x10", 42n];
    const nodes: Array<string | number | bigint> = [1, 0x2a, "node-0000000000000007"];
    const endpoints = [0, 1, 2, 65535];
    const clusters = ["onOff", "levelControl"];
    const commands = ["toggle", "moveToLevel"];

    for (const fabricId of fabrics) {
      for (const nodeId of nodes) {
        for (const endpointId of endpoints) {
          for (const cluster of clusters) {
            for (const command of commands) {
              const subject = commandSubject({ fabricId, nodeId, endpointId, cluster, command });
              expect(parseCommandSubject(subject)).toEqual({
                kind: "device",
                fabricId: normalizeFabricId(fabricId),
                nodeId: normalizeNodeId(nodeId),
                endpointId,
                cluster,
                command,
              });
            }
          }
        }
      }
    }
  });
});
