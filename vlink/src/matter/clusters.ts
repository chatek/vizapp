/**
 * Cluster vocabulary for the Matter adapters.
 *
 * VLink addresses clusters and their members by lower-camel Matter names on the NATS bus.
 * Matter.js speaks behavior ids and command method names, so this module is the single
 * translation table.  It deliberately has no runtime dependency on Matter.js: the client
 * behavior class behind each cluster is loaded lazily by {@link ClusterSpec.loadClient}, which
 * keeps simulator/unit paths free of the Matter stack.
 */

import { VLinkError } from "../errors.ts";
import { lowerCamel } from "../subjects.ts";

/** Structural view of a Matter.js cluster namespace (`Behavior.Type.cluster`). */
export interface MatterClusterLike {
  readonly id: number;
  readonly name: string;
  readonly attributes?: Record<string, unknown>;
  readonly commands?: Record<string, unknown>;
}

/** Structural view of a Matter.js cluster client behavior class. */
export interface MatterClientBehavior {
  readonly id?: string;
  readonly cluster: MatterClusterLike;
}

export type ClientBehaviorLoader = () => Promise<MatterClientBehavior>;

export interface ClusterAttributeSpec {
  /** Lower-camel attribute name used on the wire. */
  readonly name: string;
  /** Property name in the Matter.js behavior state (and `Behavior.cluster.attributes`). */
  readonly property: string;
}

/**
 * A command VLink accepts for a cluster.
 *
 * `target: "attribute"` covers members that agents expect as commands but Matter models as a
 * writable attribute (Thermostat `systemMode` in Matter.js 0.18 has no `SetSystemMode` command).
 */
export interface ClusterCommandSpec {
  /** Lower-camel command name used on the wire. */
  readonly name: string;
  /** Matter.js command method, or attribute property for `target: "attribute"`. */
  readonly method: string;
  readonly target: "command" | "attribute";
  /** Attribute property written when {@link target} is `"attribute"`. */
  readonly attribute?: string;
  /** Request fields the command accepts, in Matter.js order. */
  readonly args: readonly string[];
}

export interface ClusterSpec {
  /** Canonical lower-camel cluster name (`onOff`). */
  readonly name: string;
  /** Matter cluster name (`OnOff`). */
  readonly title: string;
  /** Matter.js behavior id (`onOff`), valid for `stateOf()`/`commandsOf()`. */
  readonly behaviorId: string;
  /** Module path that exports the client behavior (`@matter/main/behaviors/on-off`). */
  readonly clientModule: string;
  /** Named export of the client behavior (`OnOffClient`). */
  readonly clientExport: string;
  readonly attributes: ReadonlyMap<string, ClusterAttributeSpec>;
  readonly commands: ReadonlyMap<string, ClusterCommandSpec>;
  /** Load the Matter.js client behavior.  Only called on the real Matter path. */
  readonly loadClient: ClientBehaviorLoader;
}

interface ClusterInput {
  name: string;
  title: string;
  behaviorId: string;
  clientModule: string;
  clientExport: string;
  attributes: Record<string, string>;
  commands?: Record<string, CommandInput>;
}

interface CommandInput {
  method?: string;
  target?: "command" | "attribute";
  attribute?: string;
  args?: readonly string[];
}

const COMMAND_ARGS = {
  moveToLevel: ["level", "transitionTime", "optionsMask", "optionsOverride"],
  step: ["stepMode", "stepSize", "transitionTime", "optionsMask", "optionsOverride"],
  stop: ["optionsMask", "optionsOverride"],
  setpointRaiseLower: ["mode", "amount"],
} as const;

const CLUSTER_INPUTS: readonly ClusterInput[] = [
  {
    name: "onOff",
    title: "OnOff",
    behaviorId: "onOff",
    clientModule: "@matter/main/behaviors/on-off",
    clientExport: "OnOffClient",
    attributes: { onOff: "onOff" },
    commands: { on: {}, off: {}, toggle: {} },
  },
  {
    name: "levelControl",
    title: "LevelControl",
    behaviorId: "levelControl",
    clientModule: "@matter/main/behaviors/level-control",
    clientExport: "LevelControlClient",
    attributes: {
      currentLevel: "currentLevel",
      minLevel: "minLevel",
      maxLevel: "maxLevel",
    },
    commands: {
      moveToLevel: { args: COMMAND_ARGS.moveToLevel },
      moveToLevelWithOnOff: { args: COMMAND_ARGS.moveToLevel },
      step: { args: COMMAND_ARGS.step },
      stop: { args: COMMAND_ARGS.stop },
    },
  },
  {
    name: "thermostat",
    title: "Thermostat",
    behaviorId: "thermostat",
    clientModule: "@matter/main/behaviors/thermostat",
    clientExport: "ThermostatClient",
    attributes: {
      localTemperature: "localTemperature",
      occupiedHeatingSetpoint: "occupiedHeatingSetpoint",
      occupiedCoolingSetpoint: "occupiedCoolingSetpoint",
      systemMode: "systemMode",
    },
    commands: {
      setpointRaiseLower: { args: COMMAND_ARGS.setpointRaiseLower },
      // Matter models this as a writable attribute; expose the agent-friendly command name.
      setSystemMode: { target: "attribute", attribute: "systemMode", args: ["mode"] },
    },
  },
  {
    name: "temperatureMeasurement",
    title: "TemperatureMeasurement",
    behaviorId: "temperatureMeasurement",
    clientModule: "@matter/main/behaviors/temperature-measurement",
    clientExport: "TemperatureMeasurementClient",
    attributes: { measuredValue: "measuredValue" },
  },
  {
    name: "relativeHumidityMeasurement",
    title: "RelativeHumidityMeasurement",
    behaviorId: "relativeHumidityMeasurement",
    clientModule: "@matter/main/behaviors/relative-humidity-measurement",
    clientExport: "RelativeHumidityMeasurementClient",
    attributes: { measuredValue: "measuredValue" },
  },
  {
    name: "booleanState",
    title: "BooleanState",
    behaviorId: "booleanState",
    clientModule: "@matter/main/behaviors/boolean-state",
    clientExport: "BooleanStateClient",
    attributes: { stateValue: "stateValue" },
  },
  {
    name: "doorLock",
    title: "DoorLock",
    behaviorId: "doorLock",
    clientModule: "@matter/main/behaviors/door-lock",
    clientExport: "DoorLockClient",
    attributes: { lockState: "lockState" },
    commands: { lockDoor: {}, unlockDoor: {} },
  },
  {
    name: "windowCovering",
    title: "WindowCovering",
    behaviorId: "windowCovering",
    clientModule: "@matter/main/behaviors/window-covering",
    clientExport: "WindowCoveringClient",
    attributes: { currentPositionLiftPercent100ths: "currentPositionLiftPercent100ths" },
    commands: { upOrOpen: {}, downOrClose: {}, stopMotion: {} },
  },
];

function buildCluster(input: ClusterInput): ClusterSpec {
  const attributes = new Map<string, ClusterAttributeSpec>();
  for (const [name, property] of Object.entries(input.attributes)) {
    const canonical = lowerCamel(name);
    attributes.set(canonical, Object.freeze({ name: canonical, property }));
  }

  const commands = new Map<string, ClusterCommandSpec>();
  for (const [name, command] of Object.entries(input.commands ?? {})) {
    const canonical = lowerCamel(name);
    const target = command.target ?? "command";
    const spec: ClusterCommandSpec = Object.freeze({
      name: canonical,
      method: command.method ?? canonical,
      target,
      args: Object.freeze([...(command.args ?? [])]),
      ...(target === "attribute" ? { attribute: command.attribute ?? canonical } : {}),
    });
    commands.set(canonical, spec);
  }

  const spec: ClusterSpec = {
    name: input.name,
    title: input.title,
    behaviorId: input.behaviorId,
    clientModule: input.clientModule,
    clientExport: input.clientExport,
    attributes,
    commands,
    loadClient: async () => {
      // Static import cannot work: simulator/unit paths must not load the Matter stack.  The
      // specifier is chosen from this fixed per-cluster registry, not from external input.
      const module = (await import(input.clientModule)) as Record<string, unknown>;
      const client = module[input.clientExport];
      if (client === undefined) {
        throw new VLinkError("UNSUPPORTED_CLUSTER", `Matter.js has no ${input.clientExport} export`, {
          cluster: input.name,
          clientModule: input.clientModule,
          clientExport: input.clientExport,
        });
      }
      return client as MatterClientBehavior;
    },
  };

  return Object.freeze(spec);
}

const CLUSTERS: ReadonlyMap<string, ClusterSpec> = new Map(
  CLUSTER_INPUTS.map((input) => [input.name, buildCluster(input)] as const),
);

/** Every cluster VLink can address, in registration order. */
export function listClusters(): readonly ClusterSpec[] {
  return [...CLUSTERS.values()];
}

function canonicalClusterName(name: string): string {
  if (typeof name !== "string" || name.trim() === "") {
    throw new VLinkError("UNSUPPORTED_CLUSTER", "Cluster name is required", { cluster: String(name) });
  }
  return lowerCamel(name.trim());
}

/** Resolve a lower-camel (or Matter-cased) cluster name. */
export function resolveCluster(name: string): ClusterSpec {
  const canonical = canonicalClusterName(name);
  const cluster = CLUSTERS.get(canonical);
  if (cluster === undefined) {
    throw new VLinkError("UNSUPPORTED_CLUSTER", `Unsupported cluster "${name}"`, {
      cluster: canonical,
      supported: [...CLUSTERS.keys()],
    });
  }
  return cluster;
}

/** Resolve an attribute within a cluster. */
export function resolveAttribute(cluster: string, name: string): ClusterAttributeSpec {
  const spec = resolveCluster(cluster);
  const canonical = lowerCamel(String(name ?? "").trim());
  const attribute = spec.attributes.get(canonical);
  if (attribute === undefined) {
    throw new VLinkError("UNSUPPORTED_ATTRIBUTE", `Unsupported attribute "${name}" on ${spec.name}`, {
      cluster: spec.name,
      attribute: canonical,
      supported: [...spec.attributes.keys()],
    });
  }
  return attribute;
}

/** Resolve a command within a cluster. */
export function resolveCommand(cluster: string, name: string): ClusterCommandSpec {
  const spec = resolveCluster(cluster);
  const canonical = lowerCamel(String(name ?? "").trim());
  const command = spec.commands.get(canonical);
  if (command === undefined) {
    throw new VLinkError("UNSUPPORTED_COMMAND", `Unsupported command "${name}" on ${spec.name}`, {
      cluster: spec.name,
      command: canonical,
      supported: [...spec.commands.keys()],
    });
  }
  return command;
}
