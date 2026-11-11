/**
 * Deterministic Matter adapter for unit tests.
 *
 * No network, no timers, no Matter.js.  Tests register nodes/attributes/command results, inject
 * failures, and inspect recorded invocations and emitted telemetry.
 */

import { VLinkError } from "../../src/errors.ts";
import type { VLinkErrorCode } from "../../src/errors.ts";
import { normalizeFabricId, normalizeNodeId } from "../../src/subjects.ts";
import type {
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
} from "../../src/types.ts";
import { resolveAttribute, resolveCluster, resolveCommand } from "../../src/matter/clusters.ts";

export type FakeMatterOperation =
  | "start"
  | "stop"
  | "listNodes"
  | "readAttribute"
  | "writeAttribute"
  | "invokeCommand"
  | "commission"
  | "discover"
  | "decommission";

export interface FakePath {
  nodeId: string;
  endpointId: number;
  cluster: string;
  attribute: string;
}

export interface FakeCommandPath {
  nodeId: string;
  endpointId: number;
  cluster: string;
  command: string;
}

export interface FakeFailure {
  code: VLinkErrorCode;
  message?: string;
  details?: unknown;
}

export interface FakeMatterAdapterOptions {
  kind?: "matter" | "sim" | "off";
  fabricId?: string;
  bleAvailable?: boolean;
  nodes?: Array<Partial<MatterNodeInfo> & { nodeId: string }>;
  /** Keys are `nodeId/endpointId/cluster/attribute`. */
  attributes?: Record<string, JsonValue>;
  /** Keys are `nodeId/endpointId/cluster/command`. */
  commandResults?: Record<string, JsonValue>;
}

export interface FakeInvocations {
  start: number;
  stop: number;
  listNodes: number;
  status: number;
  readAttribute: MatterReadRequest[];
  writeAttribute: MatterWriteRequest[];
  invokeCommand: MatterCommandRequest[];
  commission: MatterCommissionRequest[];
  discover: MatterDiscoverRequest[];
  decommission: MatterDecommissionRequest[];
}

export interface FakeEmissions {
  attributes: MatterAttributeValue[];
  events: MatterEvent[];
  nodesChanged: MatterNodeInfo[][];
}

type AttributeHandler = (value: MatterAttributeValue) => void;
type EventHandler = (event: MatterEvent) => void;
type NodesChangedHandler = (nodes: MatterNodeInfo[]) => void;

interface PendingFailure {
  error: VLinkError | FakeFailure;
  remaining: number;
}

function pathKey(nodeId: string, endpointId: number, cluster: string, member: string): string {
  return `${normalizeNodeId(nodeId)}/${endpointId}/${cluster}/${member}`;
}

function cloneNode(node: MatterNodeInfo): MatterNodeInfo {
  return { ...node, endpointIds: [...node.endpointIds] };
}

function splitFixtureKey(key: string, expected: number): string[] {
  const parts = key.split("/");
  if (parts.length !== expected) {
    throw new VLinkError("INTERNAL_ERROR", `Fixture key "${key}" must have ${expected} segments`);
  }
  return parts;
}

export class FakeMatterAdapter implements MatterAdapter {
  readonly kind: "matter" | "sim" | "off";
  readonly fabricId: string;
  readonly nodes = new Map<string, MatterNodeInfo>();
  readonly invocations: FakeInvocations = {
    start: 0,
    stop: 0,
    listNodes: 0,
    status: 0,
    readAttribute: [],
    writeAttribute: [],
    invokeCommand: [],
    commission: [],
    discover: [],
    decommission: [],
  };
  readonly emitted: FakeEmissions = { attributes: [], events: [], nodesChanged: [] };

  readonly #bleAvailable: boolean;
  readonly #attributes = new Map<string, JsonValue>();
  readonly #commandResults = new Map<string, JsonValue>();
  readonly #failures = new Map<FakeMatterOperation, PendingFailure>();
  readonly #attributeHandlers = new Set<AttributeHandler>();
  readonly #eventHandlers = new Set<EventHandler>();
  readonly #nodesChangedHandlers = new Set<NodesChangedHandler>();

  #ready = false;
  #nextNodeId = 0x2an;

  constructor(options: FakeMatterAdapterOptions = {}) {
    this.kind = options.kind ?? "sim";
    this.fabricId = normalizeFabricId(options.fabricId ?? "0x0000000000000001");
    this.#bleAvailable = options.bleAvailable ?? true;

    for (const node of options.nodes ?? []) {
      this.addNode(node);
    }
    for (const [key, value] of Object.entries(options.attributes ?? {})) {
      const [nodeId, endpointId, cluster, attribute] = splitFixtureKey(key, 4);
      this.setAttribute({ nodeId, endpointId: Number(endpointId), cluster, attribute }, value);
    }
    for (const [key, value] of Object.entries(options.commandResults ?? {})) {
      const [nodeId, endpointId, cluster, command] = splitFixtureKey(key, 4);
      this.setCommandResult({ nodeId, endpointId: Number(endpointId), cluster, command }, value);
    }
  }

  addNode(input: Partial<MatterNodeInfo> & { nodeId: string }): MatterNodeInfo {
    const info: MatterNodeInfo = {
      fabricId: input.fabricId ?? this.fabricId,
      nodeId: normalizeNodeId(input.nodeId),
      nodeName: input.nodeName,
      vendorName: input.vendorName,
      productName: input.productName,
      endpointIds: input.endpointIds === undefined ? [0, 1] : [...input.endpointIds],
      connected: input.connected ?? true,
      commissionedAt: input.commissionedAt,
    };
    this.nodes.set(info.nodeId, info);
    return cloneNode(info);
  }

  removeNode(nodeId: string): boolean {
    return this.nodes.delete(normalizeNodeId(nodeId));
  }

  setAttribute(path: FakePath, value: JsonValue): this {
    const cluster = resolveCluster(path.cluster);
    const attribute = resolveAttribute(cluster.name, path.attribute);
    this.#requireNode(path.nodeId);
    this.#attributes.set(pathKey(path.nodeId, path.endpointId, cluster.name, attribute.name), value);
    return this;
  }

  attributeValue(path: FakePath): JsonValue | undefined {
    const cluster = resolveCluster(path.cluster);
    const attribute = resolveAttribute(cluster.name, path.attribute);
    return this.#attributes.get(pathKey(path.nodeId, path.endpointId, cluster.name, attribute.name));
  }

  setCommandResult(path: FakeCommandPath, data: JsonValue): this {
    const cluster = resolveCluster(path.cluster);
    const command = resolveCommand(cluster.name, path.command);
    this.#requireNode(path.nodeId);
    this.#commandResults.set(pathKey(path.nodeId, path.endpointId, cluster.name, command.name), data);
    return this;
  }

  failNext(operation: FakeMatterOperation, error: VLinkError | FakeFailure, count = 1): this {
    this.#failures.set(operation, { error, remaining: Math.max(1, count) });
    return this;
  }

  emitAttribute(value: MatterAttributeValue): void {
    this.emitted.attributes.push(value);
    for (const handler of this.#attributeHandlers) {
      handler(value);
    }
  }

  emitEvent(event: MatterEvent): void {
    this.emitted.events.push(event);
    for (const handler of this.#eventHandlers) {
      handler(event);
    }
  }

  emitNodesChanged(nodes?: MatterNodeInfo[]): void {
    const list = (nodes ?? [...this.nodes.values()]).map(cloneNode);
    this.emitted.nodesChanged.push(list);
    for (const handler of this.#nodesChangedHandlers) {
      handler(list);
    }
  }

  async start(): Promise<void> {
    this.invocations.start += 1;
    this.#checkFailure("start");
    this.#ready = true;
  }

  async stop(): Promise<void> {
    this.invocations.stop += 1;
    this.#checkFailure("stop");
    this.#ready = false;
    this.#attributeHandlers.clear();
    this.#eventHandlers.clear();
    this.#nodesChangedHandlers.clear();
  }

  status(): MatterAdapterStatus {
    this.invocations.status += 1;
    return {
      ready: this.#ready,
      fabricId: this.fabricId,
      bleAvailable: this.#bleAvailable,
      nodeCount: this.nodes.size,
    };
  }

  async listNodes(): Promise<MatterNodeInfo[]> {
    this.invocations.listNodes += 1;
    this.#checkFailure("listNodes");
    return [...this.nodes.values()].map(cloneNode);
  }

  async readAttribute(request: MatterReadRequest): Promise<MatterAttributeValue> {
    this.invocations.readAttribute.push(request);
    this.#checkFailure("readAttribute");
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    const value = this.#attributes.get(pathKey(node.nodeId, request.endpointId, cluster.name, attribute.name));
    if (value === undefined) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `No fake value for ${cluster.name}.${attribute.name}`, {
        nodeId: node.nodeId,
        endpointId: request.endpointId,
      });
    }
    return {
      fabricId: node.fabricId,
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      endpointId: request.endpointId,
      cluster: cluster.name,
      attribute: attribute.name,
      value,
      timestamp: 0,
      source: "read",
    };
  }

  async writeAttribute(request: MatterWriteRequest): Promise<MatterAttributeValue> {
    this.invocations.writeAttribute.push(request);
    this.#checkFailure("writeAttribute");
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    const key = pathKey(node.nodeId, request.endpointId, cluster.name, attribute.name);
    const previousValue = this.#attributes.get(key);
    this.#attributes.set(key, request.value);
    const update: MatterAttributeValue = {
      fabricId: node.fabricId,
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      endpointId: request.endpointId,
      cluster: cluster.name,
      attribute: attribute.name,
      value: request.value,
      previousValue,
      timestamp: 0,
      source: "read",
    };
    this.emitAttribute(update);
    return update;
  }

  async invokeCommand(request: MatterCommandRequest): Promise<MatterCommandResult> {
    this.invocations.invokeCommand.push(request);
    this.#checkFailure("invokeCommand");
    const node = this.#requireNode(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const command = resolveCommand(cluster.name, request.command);
    const data = this.#commandResults.get(pathKey(node.nodeId, request.endpointId, cluster.name, command.name));
    return {
      ok: true,
      data: data ?? null,
      durationMs: 0,
    };
  }

  async commission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    this.invocations.commission.push(request);
    this.#checkFailure("commission");
    const nodeId = request.nodeId ? normalizeNodeId(request.nodeId) : normalizeNodeId(this.#nextNodeId++);
    const info = this.addNode({
      nodeId,
      nodeName: request.nodeName,
      endpointIds: [0, 1],
      connected: true,
      commissionedAt: 0,
    });
    this.emitNodesChanged();
    return info;
  }

  async discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    this.invocations.discover.push(request);
    this.#checkFailure("discover");
    return [
      {
        discriminator: 3840,
        vendorId: 0xfff1,
        productId: 0x8001,
        deviceName: "fake-matter-device",
        pairingHint: 0,
        pairingInstructions: "Fake Matter device",
        transport: request.transport === "ble" ? "ble" : "ip",
        addresses: ["fake://matter"],
      },
    ];
  }

  async decommission(request: MatterDecommissionRequest): Promise<void> {
    this.invocations.decommission.push(request);
    this.#checkFailure("decommission");
    const nodeId = normalizeNodeId(request.nodeId);
    if (!this.nodes.delete(nodeId)) {
      throw new VLinkError("NODE_NOT_FOUND", `Node ${nodeId} is not commissioned`, { nodeId });
    }
    this.emitNodesChanged();
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

  #requireNode(nodeId: string): MatterNodeInfo {
    const canonical = normalizeNodeId(nodeId);
    const node = this.nodes.get(canonical);
    if (node === undefined) {
      throw new VLinkError("NODE_NOT_FOUND", `Node ${canonical} is not commissioned`, { nodeId: canonical });
    }
    return node;
  }

  #checkFailure(operation: FakeMatterOperation): void {
    const pending = this.#failures.get(operation);
    if (pending === undefined) {
      return;
    }
    pending.remaining -= 1;
    if (pending.remaining <= 0) {
      this.#failures.delete(operation);
    }
    throw pending.error instanceof VLinkError
      ? pending.error
      : new VLinkError(
          pending.error.code,
          pending.error.message ?? `Injected ${operation} failure`,
          pending.error.details,
        );
  }
}
