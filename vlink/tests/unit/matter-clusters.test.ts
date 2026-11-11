import { describe, expect, test } from "bun:test";
import { VLinkError } from "../../src/errors.ts";
import {
  listClusters,
  resolveAttribute,
  resolveCluster,
  resolveCommand,
} from "../../src/matter/clusters.ts";

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof VLinkError) {
      return error.code;
    }
    throw error;
  }
  return undefined;
}

describe("cluster vocabulary", () => {
  test("maps every supported cluster to its behavior, client module and client export", () => {
    const expected = [
      ["onOff", "onOff", "OnOffClient", "@matter/main/behaviors/on-off"],
      ["levelControl", "levelControl", "LevelControlClient", "@matter/main/behaviors/level-control"],
      ["thermostat", "thermostat", "ThermostatClient", "@matter/main/behaviors/thermostat"],
      [
        "temperatureMeasurement",
        "temperatureMeasurement",
        "TemperatureMeasurementClient",
        "@matter/main/behaviors/temperature-measurement",
      ],
      [
        "relativeHumidityMeasurement",
        "relativeHumidityMeasurement",
        "RelativeHumidityMeasurementClient",
        "@matter/main/behaviors/relative-humidity-measurement",
      ],
      ["booleanState", "booleanState", "BooleanStateClient", "@matter/main/behaviors/boolean-state"],
      ["doorLock", "doorLock", "DoorLockClient", "@matter/main/behaviors/door-lock"],
      ["windowCovering", "windowCovering", "WindowCoveringClient", "@matter/main/behaviors/window-covering"],
    ] as const;

    for (const [name, behaviorId, clientExport, clientModule] of expected) {
      const cluster = resolveCluster(name);
      expect(cluster.name).toBe(name);
      expect(cluster.behaviorId).toBe(behaviorId);
      expect(cluster.clientExport).toBe(clientExport);
      expect(cluster.clientModule).toBe(clientModule);
      expect(cluster.title.toLowerCase()).toBe(name.toLowerCase());
    }
    expect(listClusters()).toHaveLength(expected.length);
  });

  test("accepts Matter-cased cluster names", () => {
    expect(resolveCluster("OnOff").name).toBe("onOff");
    expect(resolveCluster("Thermostat").name).toBe("thermostat");
  });

  test("maps attributes to behavior state properties", () => {
    expect(resolveAttribute("onOff", "onOff")).toEqual({ name: "onOff", property: "onOff" });
    expect(resolveAttribute("levelControl", "currentLevel").property).toBe("currentLevel");
    expect(resolveAttribute("thermostat", "LocalTemperature").name).toBe("localTemperature");
    expect(resolveAttribute("temperatureMeasurement", "measuredValue").property).toBe("measuredValue");
    expect(resolveAttribute("relativeHumidityMeasurement", "measuredValue").name).toBe("measuredValue");
    expect(resolveAttribute("booleanState", "stateValue").property).toBe("stateValue");
    expect(resolveAttribute("doorLock", "lockState").property).toBe("lockState");
    expect(resolveAttribute("windowCovering", "currentPositionLiftPercent100ths").property).toBe(
      "currentPositionLiftPercent100ths",
    );
  });

  test("maps commands and their request fields", () => {
    for (const command of ["on", "off", "toggle"]) {
      expect(resolveCommand("onOff", command).target).toBe("command");
    }
    const moveToLevel = resolveCommand("levelControl", "moveToLevel");
    expect(moveToLevel.method).toBe("moveToLevel");
    expect(moveToLevel.args).toEqual(["level", "transitionTime", "optionsMask", "optionsOverride"]);
    expect(resolveCommand("levelControl", "moveToLevelWithOnOff").method).toBe("moveToLevelWithOnOff");
    expect(resolveCommand("levelControl", "step").args).toContain("stepMode");
    expect(resolveCommand("levelControl", "stop").args).toEqual(["optionsMask", "optionsOverride"]);

    expect(resolveCommand("thermostat", "setpointRaiseLower").args).toEqual(["mode", "amount"]);
    const setSystemMode = resolveCommand("thermostat", "setSystemMode");
    expect(setSystemMode.target).toBe("attribute");
    expect(setSystemMode.attribute).toBe("systemMode");

    expect(resolveCommand("doorLock", "lockDoor").method).toBe("lockDoor");
    expect(resolveCommand("doorLock", "unlockDoor").method).toBe("unlockDoor");
    expect(resolveCommand("windowCovering", "upOrOpen").target).toBe("command");
    expect(resolveCommand("windowCovering", "downOrClose").target).toBe("command");
    expect(resolveCommand("windowCovering", "stopMotion").target).toBe("command");
  });

  test("rejects unsupported clusters with UNSUPPORTED_CLUSTER", () => {
    expect(codeOf(() => resolveCluster("colorControl"))).toBe("UNSUPPORTED_CLUSTER");
    expect(codeOf(() => resolveCluster(""))).toBe("UNSUPPORTED_CLUSTER");
  });

  test("rejects unsupported attributes with UNSUPPORTED_ATTRIBUTE", () => {
    expect(codeOf(() => resolveAttribute("onOff", "currentLevel"))).toBe("UNSUPPORTED_ATTRIBUTE");
    expect(codeOf(() => resolveAttribute("nope", "onOff"))).toBe("UNSUPPORTED_CLUSTER");
  });

  test("rejects unsupported commands with UNSUPPORTED_COMMAND", () => {
    expect(codeOf(() => resolveCommand("onOff", "moveToLevel"))).toBe("UNSUPPORTED_COMMAND");
    expect(codeOf(() => resolveCommand("temperatureMeasurement", "toggle"))).toBe("UNSUPPORTED_COMMAND");
  });
});
