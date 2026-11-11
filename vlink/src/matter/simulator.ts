/**
 * Deterministic in-memory Matter adapter.
 *
 * Used for development, integration tests and OMP sessions without hardware.  It implements the
 * same contract as the real Matter.js adapter but never opens a socket, a BLE scanner or a timer
 * beyond the bounded discovery delay.
 */

import { VLinkError, toErrorPayload } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { normalizeFabricId, normalizeNodeId } from "../subjects.ts";
import type {
  JsonObject,
  JsonValue,
  MatterAdapter,
  MatterAdapterStatus,
  MatterAttributeValue,
  MatterCommandRequest,
  MatterCommandResult,
  MatterCommissionRequest,
  MatterDecommissionRequest,
  MatterDiscoveredDevice,
  MatterDiscoverRequest,
  MatterEvent,
  MatterNodeInfo,
  MatterReadRequest,
  MatterWriteRequest,
  VLinkConfig,
} from "../types.ts";
import { resolveAttribute, resolveCluster, resolveCommand } from "./clusters.ts";

const DEFAULT_FABRIC_NODE_ID = 0x2an;
const ROOT_ENDPOINT = 0;
const DEVICE_ENDPOINT = 1;
const DISCOVERY_DELAY_MS = 10;
const HEATING_MIN = 700;
const HEATING_MAX = 3000;

interface SimNode {
  info: MatterNodeInfo;
  attributes: Map<string, JsonValue>;
}

type AttributeHandler = (value: MatterAttributeValue) => void;
type EventHandler = (event: MatterEvent) => void;
type NodesChangedHandler = (nodes: MatterNodeInfo[]) => void;

function attributeKey(endpointId: number, cluster: string, attribute: string): string {
  return `${endpointId}/${cluster}/${attribute}`;
}

function cloneNode(node: MatterNodeInfo): MatterNodeInfo {
  return { ...node, endpointIds: [...node.endpointIds] };
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

export class SimulatorAdapter implements MatterAdapter {
  readonly kind = "sim" as const;

  readonly #config: VLinkConfig;
  readonly #logger: Logger;
  readonly #nodes = new Map<string, SimNode>();
  readonly #attributeHandlers = new Set<AttributeHandler>();
  readonly #eventHandlers = new Set<EventHandler>();
  readonly #nodesChangedHandlers = new Set<NodesChangedHandler>();

  #fabricId?: string;
  #ready = false;
  #lastError?: string;
  #nextNodeId = DEFAULT_FABRIC_NODE_ID;

  constructor(config: VLinkConfig, logger: Logger) {
    this.#config = config;
    this.#logger = logger;
  }

  async start(): Promise<void> {
    if (this.#ready) {
      return;
    }
    this.#fabricId = normalizeFabricId(this.#config.fabricId ?? "0x0000000000000001");
    this.#ready = true;
    this.#lastError = undefined;
    this.#logger.info("simulator matter adapter started", {
      fabricId: this.#fabricId,
      nodeCount: this.#nodes.size,
    });
  }

  async stop(): Promise<void> {
    if (
      !this.#ready &&
      this.#nodes.size === 0 &&
      this.#attributeHandlers.size === 0 &&
      this.#eventHandlers.size === 0 &&
      this.#nodesChangedHandlers.size === 0
    ) {
      return;
    }
    this.#nodes.clear();
    this.#attributeHandlers.clear();
    this.#eventHandlers.clear();
    this.#nodesChangedHandlers.clear();
    this.#nextNodeId = DEFAULT_FABRIC_NODE_ID;
    this.#ready = false;
    this.#logger.info("simulator matter adapter stopped");
  }

  status(): MatterAdapterStatus {
    return {
      ready: this.#ready,
      fabricId: this.#fabricId,
      bleAvailable: false,
      nodeCount: this.#nodes.size,
      lastError: this.#lastError,
    };
  }

  async listNodes(): Promise<MatterNodeInfo[]> {
    this.#assertReady();
    return [...this.#nodes.values()].map((node) => cloneNode(node.info));
  }

  async readAttribute(request: MatterReadRequest): Promise<MatterAttributeValue> {
    this.#assertReady();
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    this.#requireEndpoint(node, request.endpointId, attribute.name);

    const key = attributeKey(request.endpointId, cluster.name, attribute.name);
    const value = node.attributes.get(key);
    if (value === undefined) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `Attribute ${cluster.name}.${attribute.name} has no value`, {
        nodeId: node.info.nodeId,
        endpointId: request.endpointId,
      });
    }

    return {
      fabricId: this.#fabricId!,
      nodeId: node.info.nodeId,
      nodeName: node.info.nodeName,
      endpointId: request.endpointId,
      cluster: cluster.name,
      attribute: attribute.name,
      value,
      timestamp: Date.now(),
      source: "read",
    };
  }

  async writeAttribute(request: MatterWriteRequest): Promise<MatterAttributeValue> {
    this.#assertReady();
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    this.#requireEndpoint(node, request.endpointId, attribute.name);

    return this.#applyAttribute(node, request.endpointId, cluster.name, attribute.name, request.value, "read");
  }

  async invokeCommand(request: MatterCommandRequest): Promise<MatterCommandResult> {
    this.#assertReady();
    const startedAt = Date.now();
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const command = resolveCommand(cluster.name, request.command);
    this.#requireEndpoint(node, request.endpointId, command.name);

    try {
      const data = this.#execute(node, request, cluster.name, command.name, request.args ?? {});
      return { ok: true, data, durationMs: Date.now() - startedAt };
    } catch (error) {
      if (error instanceof VLinkError && error.code === "NODE_NOT_FOUND") {
        throw error;
      }
      const payload = toErrorPayload(error);
      return { ok: false, error: payload, durationMs: Date.now() - startedAt };
    }
  }

  async commission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    this.#assertReady();
    this.#validatePairing(request);

    const nodeId = request.nodeId
      ? normalizeNodeId(request.nodeId)
      : normalizeNodeId(this.#nextNodeId++);
    if (this.#nodes.has(nodeId)) {
      throw new VLinkError("COMMISSION_FAILED", `Node ${nodeId} is already commissioned`, { nodeId });
    }

    const info: MatterNodeInfo = {
      fabricId: this.#fabricId!,
      nodeId,
      nodeName: request.nodeName,
      vendorName: "VLink",
      productName: "Simulated Matter device",
      endpointIds: [ROOT_ENDPOINT, DEVICE_ENDPOINT],
      connected: true,
      commissionedAt: Date.now(),
    };

    const node: SimNode = { info, attributes: new Map() };
    this.#seedAttributes(node);
    this.#nodes.set(nodeId, node);
    this.#logger.info("simulator node commissioned", {
      nodeId,
      nodeName: request.nodeName,
      transport: request.transport,
    });
    this.#emitNodesChanged();
    return cloneNode(info);
  }

  async discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    this.#assertReady();
    // Bounded, deterministic discovery: one always-available fake device.
    await sleep(Math.min(DISCOVERY_DELAY_MS, Math.max(1, request.timeoutMs ?? DISCOVERY_DELAY_MS)));
    const transport: MatterDiscoveredDevice["transport"] =
      request.transport === "ble" ? "ble" : request.transport === "ip" ? "ip" : "ip";
    return [
      {
        discriminator: 3840,
        vendorId: 0xfff1,
        productId: 0x8001,
        deviceName: "vlink-sim-device",
        pairingHint: 0,
        pairingInstructions: "Simulated Matter device (no hardware)",
        transport,
        addresses: ["sim://vlink"],
      },
    ];
  }

  async decommission(request: MatterDecommissionRequest): Promise<void> {
    this.#assertReady();
    const nodeId = normalizeNodeId(request.nodeId);
    if (!this.#nodes.delete(nodeId)) {
      throw new VLinkError("NODE_NOT_FOUND", `Node ${nodeId} is not commissioned`, { nodeId });
    }
    this.#logger.info("simulator node decommissioned", { nodeId, force: request.force === true });
    this.#emitNodesChanged();
  }

  onAttribute(handler: AttributeHandler): () => void {
    this.#attributeHandlers.add(handler);
    return () => this.#attributeHandlers.delete(handler);
  }

  onEvent(handler: EventHandler): () => void {
    this.#eventHandlers.add(handler);
    return () => this.#eventHandlers.delete(handler);
  }

  onNodesChanged(handler: NodesChangedHandler): () => void {
    this.#nodesChangedHandlers.add(handler);
    return () => this.#nodesChangedHandlers.delete(handler);
  }

  #assertReady(): void {
    if (!this.#ready) {
      throw new VLinkError("MATTER_NOT_READY", "Simulator adapter is not started");
    }
  }

  #requireNode(nodeId: string): SimNode {
    const canonical = normalizeNodeId(nodeId);
    const node = this.#nodes.get(canonical);
    if (node === undefined) {
      throw new VLinkError("NODE_NOT_FOUND", `Node ${canonical} is not commissioned`, { nodeId: canonical });
    }
    return node;
  }

  #requireEndpoint(node: SimNode, endpointId: number, member: string): void {
    if (!isInteger(endpointId) || !node.info.endpointIds.includes(endpointId)) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `Endpoint ${endpointId} does not expose ${member}`, {
        nodeId: node.info.nodeId,
        endpointId,
      });
    }
  }

  #validatePairing(request: MatterCommissionRequest): void {
    const pairingCode = request.pairingCode?.trim();
    if (pairingCode) {
      const manual = /^\d{11}$/.test(pairingCode);
      const qr = pairingCode.startsWith("MT:") && pairingCode.length > 3;
      if (!manual && !qr) {
        throw new VLinkError("COMMISSION_FAILED", "pairingCode is not a valid manual or QR code");
      }
      return;
    }

    if (request.passcode !== undefined) {
      if (!isInteger(request.passcode) || request.passcode < 1 || request.passcode > 99_999_998) {
        throw new VLinkError("COMMISSION_FAILED", "passcode must be an integer between 1 and 99999998", {
          passcode: request.passcode,
        });
      }
      return;
    }

    throw new VLinkError("COMMISSION_FAILED", "pairingCode or passcode is required");
  }

  #seedAttributes(node: SimNode): void {
    const values: Array<[number, string, string, JsonValue]> = [
      [DEVICE_ENDPOINT, "onOff", "onOff", false],
      [DEVICE_ENDPOINT, "levelControl", "currentLevel", 0],
      [DEVICE_ENDPOINT, "levelControl", "minLevel", 1],
      [DEVICE_ENDPOINT, "levelControl", "maxLevel", 254],
      [DEVICE_ENDPOINT, "thermostat", "localTemperature", 2100],
      [DEVICE_ENDPOINT, "thermostat", "occupiedHeatingSetpoint", 2000],
      [DEVICE_ENDPOINT, "thermostat", "occupiedCoolingSetpoint", 2400],
      [DEVICE_ENDPOINT, "thermostat", "systemMode", 0],
      [DEVICE_ENDPOINT, "temperatureMeasurement", "measuredValue", 2100],
      [DEVICE_ENDPOINT, "relativeHumidityMeasurement", "measuredValue", 4500],
      [DEVICE_ENDPOINT, "booleanState", "stateValue", false],
      [DEVICE_ENDPOINT, "doorLock", "lockState", 1],
      [DEVICE_ENDPOINT, "windowCovering", "currentPositionLiftPercent100ths", 0],
    ];
    for (const [endpointId, cluster, attribute, value] of values) {
      node.attributes.set(attributeKey(endpointId, cluster, attribute), value);
    }
  }

  #execute(
    node: SimNode,
    request: MatterCommandRequest,
    cluster: string,
    command: string,
    args: JsonObject,
  ): JsonValue {
    switch (cluster) {
      case "onOff":
        return this.#executeOnOff(node, request.endpointId, command);
      case "levelControl":
        return this.#executeLevelControl(node, request.endpointId, command, args);
      case "thermostat":
        return this.#executeThermostat(node, request.endpointId, command, args);
      default:
        throw new VLinkError("UNSUPPORTED_COMMAND", `Command ${cluster}.${command} is not simulated`, {
          cluster,
          command,
        });
    }
  }

  #executeOnOff(node: SimNode, endpointId: number, command: string): JsonValue {
    const key = attributeKey(endpointId, "onOff", "onOff");
    const current = node.attributes.get(key) === true;
    let next: boolean;
    switch (command) {
      case "on":
        next = true;
        break;
      case "off":
        next = false;
        break;
      case "toggle":
        next = !current;
        break;
      default:
        throw new VLinkError("UNSUPPORTED_COMMAND", `Command onOff.${command} is not simulated`, {
          cluster: "onOff",
          command,
        });
    }
    const value = this.#applyAttribute(node, endpointId, "onOff", "onOff", next, "subscription");
    return { onOff: value.value };
  }

  #executeLevelControl(
    node: SimNode,
    endpointId: number,
    command: string,
    args: JsonObject,
  ): JsonValue {
    if (command !== "moveToLevel" && command !== "moveToLevelWithOnOff") {
      throw new VLinkError("UNSUPPORTED_COMMAND", `Command levelControl.${command} is not simulated`, {
        cluster: "levelControl",
        command,
      });
    }
    const level = args.level;
    if (!isInteger(level) || level < 0 || level > 254) {
      throw new VLinkError("MATTER_COMMAND_FAILED", "levelControl level must be an integer 0..254", {
        level: toErrorPayloadDetails(level),
      });
    }
    const value = this.#applyAttribute(node, endpointId, "levelControl", "currentLevel", level, "subscription");
    return { currentLevel: value.value };
  }

  #executeThermostat(
    node: SimNode,
    endpointId: number,
    command: string,
    args: JsonObject,
  ): JsonValue {
    if (command === "setSystemMode") {
      const mode = args.mode;
      if (!isInteger(mode) || mode < 0 || mode > 9) {
        throw new VLinkError("MATTER_COMMAND_FAILED", "thermostat mode must be an integer 0..9", {
          mode: toErrorPayloadDetails(mode),
        });
      }
      const value = this.#applyAttribute(node, endpointId, "thermostat", "systemMode", mode, "subscription");
      return { systemMode: value.value };
    }

    if (command !== "setpointRaiseLower") {
      throw new VLinkError("UNSUPPORTED_COMMAND", `Command thermostat.${command} is not simulated`, {
        cluster: "thermostat",
        command,
      });
    }

    const mode = args.mode;
    const amount = args.amount;
    if (!isInteger(mode) || mode < 0 || mode > 2) {
      throw new VLinkError("MATTER_COMMAND_FAILED", "setpointRaiseLower mode must be 0 (heat), 1 (cool) or 2 (both)");
    }
    if (!isInteger(amount)) {
      throw new VLinkError("MATTER_COMMAND_FAILED", "setpointRaiseLower amount must be an integer");
    }

    const data: Record<string, JsonValue> = {};
    if (mode === 0 || mode === 2) {
      data.occupiedHeatingSetpoint = this.#raiseSetpoint(node, endpointId, "occupiedHeatingSetpoint", amount);
    }
    if (mode === 1 || mode === 2) {
      data.occupiedCoolingSetpoint = this.#raiseSetpoint(node, endpointId, "occupiedCoolingSetpoint", amount);
    }
    return data;
  }

  #raiseSetpoint(node: SimNode, endpointId: number, attribute: string, amount: number): JsonValue {
    const key = attributeKey(endpointId, "thermostat", attribute);
    const current = node.attributes.get(key);
    const base = typeof current === "number" ? current : 2000;
    const next = Math.min(HEATING_MAX, Math.max(HEATING_MIN, base + amount));
    return this.#applyAttribute(node, endpointId, "thermostat", attribute, next, "subscription").value;
  }

  #applyAttribute(
    node: SimNode,
    endpointId: number,
    cluster: string,
    attribute: string,
    value: JsonValue,
    source: "subscription" | "read",
  ): MatterAttributeValue {
    const key = attributeKey(endpointId, cluster, attribute);
    const previousValue = node.attributes.get(key);
    node.attributes.set(key, value);
    const update: MatterAttributeValue = {
      fabricId: this.#fabricId!,
      nodeId: node.info.nodeId,
      nodeName: node.info.nodeName,
      endpointId,
      cluster,
      attribute,
      value,
      previousValue,
      timestamp: Date.now(),
      source,
    };
    this.#emitAttribute(update);
    return update;
  }

  #emitAttribute(value: MatterAttributeValue): void {
    for (const handler of this.#attributeHandlers) {
      handler(value);
    }
  }

  #emitNodesChanged(): void {
    const nodes = [...this.#nodes.values()].map((node) => cloneNode(node.info));
    for (const handler of this.#nodesChangedHandlers) {
      handler(nodes);
    }
  }
}

function toErrorPayloadDetails(value: unknown): JsonValue {
  if (typeof value === "boolean" || typeof value === "string" || value === null) {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}
