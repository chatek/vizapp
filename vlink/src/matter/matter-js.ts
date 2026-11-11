/**
 * Matter.js 0.18 controller adapter.  The Matter stack is imported inside `start()`: simulator
 * paths must never initialize mDNS, BLE or native crypto.  `import type` references are erased.
 */

import { mkdir } from "node:fs/promises";
import { VLinkError, asVLinkError, toErrorPayload } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { toJsonValue } from "../payloads.ts";
import { lowerCamel, normalizeFabricId, normalizeNodeId } from "../subjects.ts";
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
import type * as MatterMain from "@matter/main";
import type * as MatterProtocol from "@matter/protocol";
import type * as MatterGeneral from "@matter/general";
import type { TimeUnit } from "@matter/general";
import type { ChangeNotificationService, ClientNode, Endpoint } from "@matter/node";
import type { Fabric } from "@matter/protocol";
import type { ServerNode } from "@matter/main";
import { resolveAttribute, resolveCluster, resolveCommand } from "./clusters.ts";
import type { ClusterSpec } from "./clusters.ts";

type AttributeHandler = (value: MatterAttributeValue) => void;
type EventHandler = (event: MatterEvent) => void;
type NodesChangedHandler = (nodes: MatterNodeInfo[]) => void;

const DEFAULT_DISCOVERY_TIMEOUT_MS = 5_000;
const MAX_DISCOVERY_TIMEOUT_MS = 60_000;

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function addressString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value !== "object" || value === null || !("ip" in value) || typeof value.ip !== "string") {
    return undefined;
  }
  return "port" in value && typeof value.port === "number" ? `${value.ip}:${value.port}` : value.ip;
}

function isNode(value: Endpoint): value is ClientNode | ServerNode<any> {
  return "nodeType" in value;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }
  const { promise: expired, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => reject(new VLinkError("COMMAND_TIMEOUT", `${label} timed out after ${timeoutMs}ms`)),
    timeoutMs,
  );
  try {
    return await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
}

export class MatterJsAdapter implements MatterAdapter {
  readonly kind = "matter" as const;

  readonly #config: VLinkConfig;
  readonly #logger: Logger;
  readonly #attributeHandlers = new Set<AttributeHandler>();
  readonly #eventHandlers = new Set<EventHandler>();
  readonly #nodesChangedHandlers = new Set<NodesChangedHandler>();
  readonly #lastValues = new Map<string, JsonValue>();
  readonly #lastEmitted = new Map<string, string>();

  // `any` root endpoint: the concrete type depends on `RootEndpointWithoutGroupcast.with(...)`.
  #node?: ServerNode<any>;
  #notifyObserver?: () => void;
  #seconds?: TimeUnit;
  #fabricId?: string;
  #ready = false;
  #bleAvailable = false;
  #lastError?: string;
  #starting?: Promise<void>;
  #stopping?: Promise<void>;

  constructor(config: VLinkConfig, logger: Logger) {
    this.#config = config;
    this.#logger = logger;
  }

  async start(): Promise<void> {
    if (this.#ready) return;
    if (this.#starting !== undefined) return this.#starting;
    const attempt = this.#startOnce().finally(() => {
      this.#starting = undefined;
    });
    this.#starting = attempt;
    return attempt;
  }

  async stop(): Promise<void> {
    if (this.#stopping !== undefined) return this.#stopping;
    this.#stopping = this.#stopOnce().finally(() => {
      this.#stopping = undefined;
    });
    return this.#stopping;
  }

  status(): MatterAdapterStatus {
    return {
      ready: this.#ready,
      fabricId: this.#fabricId,
      bleAvailable: this.#bleAvailable,
      nodeCount: this.#node === undefined ? 0 : [...this.#node.peers.commissioned].length,
      lastError: this.#lastError,
    };
  }

  async listNodes(): Promise<MatterNodeInfo[]> {
    this.#assertReady();
    const nodes: MatterNodeInfo[] = [];
    for (const peer of this.#peers()) {
      const nodeId = this.#nodeIdOf(peer);
      if (nodeId !== undefined) {
        nodes.push(this.#nodeInfo(peer, nodeId));
      }
    }
    return nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  async readAttribute(request: MatterReadRequest): Promise<MatterAttributeValue> {
    this.#assertReady();
    const peer = this.#requirePeer(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    const endpoint = this.#endpointOf(peer, request.endpointId);
    const state = endpoint.maybeStateOf(cluster.behaviorId);
    if (state === undefined) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `Endpoint ${request.endpointId} has no ${cluster.name} cluster`, {
        nodeId: request.nodeId,
        cluster: cluster.name,
      });
    }
    const value = state[attribute.property];
    if (value === undefined) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `Attribute ${cluster.name}.${attribute.name} has no value`, {
        nodeId: request.nodeId,
        endpointId: request.endpointId,
      });
    }
    return {
      fabricId: this.#fabricId!,
      nodeId: this.#nodeIdOf(peer)!,
      nodeName: this.#nodeNameOf(peer),
      endpointId: request.endpointId,
      cluster: cluster.name,
      attribute: attribute.name,
      value: toJsonValue(value),
      timestamp: Date.now(),
      source: "read",
    };
  }

  async writeAttribute(request: MatterWriteRequest): Promise<MatterAttributeValue> {
    this.#assertReady();
    const peer = this.#requirePeer(request.nodeId);
    const cluster = resolveCluster(request.cluster);
    const attribute = resolveAttribute(cluster.name, request.attribute);
    const endpoint = this.#endpointOf(peer, request.endpointId);
    const state = endpoint.maybeStateOf(cluster.behaviorId);
    if (state === undefined || !(attribute.property in state)) {
      throw new VLinkError("UNSUPPORTED_ATTRIBUTE", `Attribute ${cluster.name}.${attribute.name} is not writable`, {
        nodeId: request.nodeId,
        endpointId: request.endpointId,
        cluster: cluster.name,
        attribute: attribute.name,
      });
    }

    const previous = state[attribute.property];
    try {
      // Client behavior state writes are forwarded to the peer by Matter.js (`RemoteWriter`).
      await endpoint.setStateOf(cluster.behaviorId, { [attribute.property]: request.value });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unsupported/i.test(message)) {
        throw new VLinkError("UNSUPPORTED_ATTRIBUTE", `Device rejected write to ${cluster.name}.${attribute.name}`, {
          nodeId: request.nodeId,
          cluster: cluster.name,
          attribute: attribute.name,
        });
      }
      throw asVLinkError(error, "MATTER_COMMAND_FAILED");
    }

    const next = endpoint.maybeStateOf(cluster.behaviorId)?.[attribute.property] ?? request.value;
    return {
      fabricId: this.#fabricId!,
      nodeId: this.#nodeIdOf(peer)!,
      nodeName: this.#nodeNameOf(peer),
      endpointId: request.endpointId,
      cluster: cluster.name,
      attribute: attribute.name,
      value: toJsonValue(next),
      previousValue: previous === undefined ? undefined : toJsonValue(previous),
      timestamp: Date.now(),
      source: "read",
    };
  }

  async invokeCommand(request: MatterCommandRequest): Promise<MatterCommandResult> {
    const startedAt = Date.now();
    try {
      this.#assertReady();
      const peer = this.#requirePeer(request.nodeId);
      const cluster = resolveCluster(request.cluster);
      const command = resolveCommand(cluster.name, request.command);
      const endpoint = this.#endpointOf(peer, request.endpointId);
      const timeoutMs = request.timeoutMs ?? this.#config.defaultCommandTimeoutMs;

      const data =
        command.target === "attribute"
          ? await this.#invokeAttributeCommand(endpoint, cluster.behaviorId, command.attribute, request.args)
          : await this.#invokeBehaviorCommand(endpoint, cluster.behaviorId, command.name, request.args, timeoutMs);
      return { ok: true, data, durationMs: Date.now() - startedAt };
    } catch (error) {
      return { ok: false, error: toErrorPayload(error), durationMs: Date.now() - startedAt };
    }
  }

  async commission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    this.#assertReady();
    const pairingCode = request.pairingCode?.trim();
    if ((pairingCode === undefined || pairingCode === "") && request.passcode === undefined) {
      throw new VLinkError("COMMISSION_FAILED", "pairingCode or passcode is required");
    }
    const timeoutMs =
      request.timeoutMs !== undefined && request.timeoutMs > 0
        ? request.timeoutMs
        : this.#config.defaultCommissionTimeoutMs;
    const common = {
      autoSubscribe: true,
      discoveryCapabilities: { ble: request.transport.startsWith("ble"), onIpNetwork: true },
      regulatoryLocation: 0 as const, // GeneralCommissioning.RegulatoryLocationType.Indoor
      regulatoryCountryCode: "XX",
      timeout: this.#seconds!(timeoutMs / 1000),
      ...(request.wifi === undefined
        ? {}
        : { wifiNetwork: { wifiSsid: request.wifi.ssid, wifiCredentials: request.wifi.password } }),
      ...(request.thread === undefined
        ? {}
        : {
            threadNetwork: {
              networkName: request.thread.networkName,
              operationalDataset: request.thread.operationalDataset,
            },
          }),
    };

    try {
      const peer =
        pairingCode !== undefined && pairingCode !== ""
          ? await this.#node!.peers.commission({ ...common, pairingCode })
          : await this.#node!.peers.commission({
              ...common,
              passcode: request.passcode!,
              ...(request.discriminator === undefined ? {} : { discriminator: request.discriminator }),
            });
      const nodeId = this.#nodeIdOf(peer);
      if (nodeId === undefined) {
        throw new VLinkError("COMMISSION_FAILED", "Commissioned node has no peer address");
      }
      this.#logger.info("matter node commissioned", { nodeId, transport: request.transport });
      this.#emitNodesChanged();
      return this.#nodeInfo(peer, nodeId);
    } catch (error) {
      const wrapped = asVLinkError(error, "COMMISSION_FAILED");
      this.#logger.warn("matter commissioning failed", {
        code: wrapped.code,
        transport: request.transport,
        error: wrapped.message,
      });
      throw wrapped;
    }
  }

  async discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    this.#assertReady();
    const timeoutMs =
      request.timeoutMs !== undefined && request.timeoutMs > 0
        ? Math.min(request.timeoutMs, MAX_DISCOVERY_TIMEOUT_MS)
        : DEFAULT_DISCOVERY_TIMEOUT_MS;
    const transport = request.transport ?? "both";
    const discovery = this.#node!.peers.discover({
      timeout: this.#seconds!(timeoutMs / 1000),
      discoveryCapabilities: { ble: transport !== "ip" },
    });
    const found = new Map<string, MatterDiscoveredDevice>();
    const collect = (peer: ClientNode) => {
      const device = this.#discoveredFrom(peer);
      if (device === undefined) {
        return;
      }
      const key = [
        device.discriminator,
        device.vendorId,
        device.productId,
        device.deviceName,
        device.addresses?.join(","),
      ].join("|");
      if (!found.has(key)) {
        found.set(key, device);
      }
    };

    discovery.discovered.on(collect);
    try {
      for (const peer of await discovery) {
        collect(peer);
      }
    } catch (error) {
      throw asVLinkError(error, "DISCOVERY_FAILED");
    } finally {
      discovery.discovered.off(collect);
      try {
        discovery.stop();
      } catch {
        // Discovery already completed.
      }
    }
    return [...found.values()];
  }

  async decommission(request: MatterDecommissionRequest): Promise<void> {
    this.#assertReady();
    const peer = this.#requirePeer(request.nodeId);
    try {
      if (request.force === true) {
        await peer.delete();
      } else {
        await peer.decommission();
      }
    } catch (error) {
      throw asVLinkError(error, "MATTER_COMMAND_FAILED");
    }

    const nodeId = normalizeNodeId(request.nodeId);
    for (const key of [...this.#lastValues.keys()]) {
      if (key.startsWith(`${nodeId}/`)) {
        this.#lastValues.delete(key);
        this.#lastEmitted.delete(key);
      }
    }
    this.#logger.info("matter node decommissioned", { nodeId, force: request.force === true });
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

  async #startOnce(): Promise<void> {
    if (this.#ready) {
      return;
    }
    this.#lastError = undefined;
    let node: ServerNode<any> | undefined;

    try {
      await mkdir(this.#config.matterStorage, { recursive: true });
      // Matter's modules log through `globalThis.console` (their default destination)
      // at a default level of DEBUG from the moment they are imported — garbling the
      // host TUI. Until the structured redirect below is in place, intercept the
      // console methods and route matter-formatted lines into VLink's logger; every
      // other call passes through untouched.
      const matterLine = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} (DEBUG|INFO|NOTICE|WARN|ERROR|FATAL) /;
      const levelOf = (token: string): "debug" | "info" | "warn" | "error" =>
        token === "ERROR" || token === "FATAL" ? "error"
          : token === "WARN" ? "warn"
            : token === "DEBUG" ? "debug"
              : "info";
      const patched = (["debug", "info", "warn", "error"] as const).map((method) => {
        const original = console[method].bind(console);
        console[method] = (...args: unknown[]) => {
          const first = args.length === 1 ? args[0] : undefined;
          if (typeof first === "string") {
            const match = matterLine.exec(first);
            if (match !== null) {
              this.#logger[levelOf(match[1])](`matter: ${first.trimEnd()}`);
              return;
            }
          }
          original(...args);
        };
        return [method, original] as const;
      });

      let main: typeof MatterMain;
      let protocol: typeof MatterProtocol;
      let general: typeof MatterGeneral;
      try {
        [main, protocol, general] = await Promise.all([
          import("@matter/main"), import("@matter/protocol"), import("@matter/general"),
        ]);
        this.#seconds = general.Seconds;

        // omp's plugin loader hands extension code a duplicate module instance for
        // direct bare-specifier imports of @matter packages. Matter's environment DI
        // registers services under the classes of its own instance, so any class
        // fetched from a duplicated module fails env.get() with "Required dependency
        // … is not available". @matter/main re-exports @matter/node's (and
        // @matter/general's) bindings from the instance matter itself uses — route
        // every class-identity lookup through `main`.
        //
        // Logging: matter's Logger defaults to DEBUG → console, which garbles the host
        // TUI. Redirect it into VLink's structured logger so config.logLevel governs
        // matter's internal output too. The console interceptor above stays armed
        // until this redirect is live, then is removed by the finally below.
        main.Logger.level = this.#config.logLevel;
        main.Logger.destinations.default.write = (formatted: string, message: { level?: unknown }) => {
          const level = Number(message?.level);
          const mapped = level >= 4 ? "error" : level === 3 ? "warn" : level >= 1 ? "info" : "debug";
          this.#logger[mapped](`matter: ${formatted.trimEnd()}`);
        };
      } finally {
        for (const [method, original] of patched) {
          console[method] = original;
        }
      }

      const environment = main.Environment.default;
      environment.vars.set("path.root", this.#config.matterStorage);
      environment.vars.set("storage.path", this.#config.matterStorage);
      this.#bleAvailable = false;
      if (this.#config.bleEnabled) {
        try {
          // Platform-specific native module: static import breaks hosts without BLE support.
          await import("@matter/nodejs-ble");
          environment.vars.set("ble.enable", true);
          this.#bleAvailable = true;
          this.#logger.info("BLE central support loaded");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.#logger.warn("BLE unavailable; continuing with IP transport", { error: message });
        }
      }

      node = await main.ServerNode.create(
        main.ServerNode.RootEndpointWithoutGroupcast.with(main.ControllerBehavior),
        {
          environment, id: "vlink-controller", commissioning: { enabled: false },
          controller: { adminFabricLabel: this.#config.fabricLabel },
          network: { autoStartCommissionedPeers: false },
          subscriptions: { persistenceEnabled: false },
        },
      );

      const authority = await node.env.load(protocol.FabricAuthority);
      const fabric = await authority.defaultFabric({ adminFabricLabel: this.#config.fabricLabel });
      this.#fabricId = this.#resolveFabricId(fabric);

      const notifications = node.env.get(main.ChangeNotificationService);
      const observer = (change: ChangeNotificationService.Change) => this.#handleChange(change);
      notifications.change.on(observer);
      this.#notifyObserver = () => notifications.change.off(observer);

      this.#node = node;
      await node.start();
      this.#ready = true;
      this.#logger.info("matter controller started", {
        fabricId: this.#fabricId,
        bleAvailable: this.#bleAvailable,
        storage: this.#config.matterStorage,
      });
      this.#emitNodesChanged();
    } catch (error) {
      const wrapped = asVLinkError(error, "MATTER_NOT_READY");
      this.#lastError = `${wrapped.code}: ${wrapped.message}`;
      this.#ready = false;
      this.#node = undefined;
      try {
        this.#notifyObserver?.();
      } catch {
        // The service may already be closed.
      }
      this.#notifyObserver = undefined;
      if (node !== undefined) {
        try {
          await node.close();
        } catch {
          // Startup already failed; closing is best effort.
        }
      }
      throw wrapped;
    }
  }

  async #stopOnce(): Promise<void> {
    this.#ready = false;
    try {
      this.#notifyObserver?.();
    } catch {
      // Node teardown closes the service first in some paths.
    }
    this.#notifyObserver = undefined;
    // Detach consumers before teardown so closing cannot emit into a half-stopped bridge.
    this.#attributeHandlers.clear();
    this.#eventHandlers.clear();
    this.#nodesChangedHandlers.clear();
    this.#lastValues.clear();
    this.#lastEmitted.clear();

    const node = this.#node;
    this.#node = undefined;
    if (node !== undefined) {
      try {
        await node.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.#logger.warn("matter controller close failed", { error: message });
      }
    }
    this.#fabricId = undefined;
  }

  #resolveFabricId(fabric: Fabric): string {
    const raw: unknown = fabric.fabricId;
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "bigint") {
      try {
        return normalizeFabricId(raw);
      } catch {
        // Fall through to the configured/deterministic label.
      }
    }
    return normalizeFabricId(this.#config.fabricId ?? "0x0000000000000001");
  }

  #assertReady(): void {
    if (!this.#ready || this.#node === undefined) {
      throw new VLinkError("MATTER_NOT_READY", "Matter controller is not started", { lastError: this.#lastError ?? null });
    }
  }

  #peers(): ClientNode[] {
    return this.#node === undefined ? [] : [...this.#node.peers.commissioned];
  }

  #requirePeer(nodeId: string): ClientNode {
    let canonical: string;
    try {
      canonical = normalizeNodeId(nodeId);
    } catch {
      throw new VLinkError("NODE_NOT_FOUND", `Invalid node id "${nodeId}"`, { nodeId });
    }
    for (const peer of this.#peers()) if (this.#nodeIdOf(peer) === canonical) return peer;
    throw new VLinkError("NODE_NOT_FOUND", `Node ${canonical} is not commissioned`, { nodeId: canonical });
  }

  #endpointOf(peer: ClientNode, endpointId: number): Endpoint {
    if (!Number.isInteger(endpointId) || !peer.endpoints.has(endpointId)) {
      throw new VLinkError("ATTRIBUTE_NOT_FOUND", `Endpoint ${endpointId} is not exposed by this node`, {
        nodeId: this.#nodeIdOf(peer) ?? null,
        endpointId,
      });
    }
    return peer.endpoints.for(endpointId);
  }

  #nodeIdOf(peer: ClientNode): string | undefined {
    const address = peer.peerAddress;
    if (address === undefined) return undefined;
    try {
      return normalizeNodeId(address.nodeId);
    } catch {
      return undefined;
    }
  }

  #nodeNameOf(peer: ClientNode): string | undefined {
    return stringOrUndefined(peer.maybeStateOf("commissioning")?.deviceName);
  }

  #nodeInfo(peer: ClientNode, nodeId: string): MatterNodeInfo {
    const commissioning = peer.maybeStateOf("commissioning");
    const basic = peer.maybeStateOf("basicInformation");
    return {
      fabricId: this.#fabricId!,
      nodeId,
      nodeName: stringOrUndefined(commissioning?.deviceName),
      vendorName: stringOrUndefined(basic?.vendorName),
      productName: stringOrUndefined(basic?.productName),
      endpointIds: [...peer.endpoints].map((endpoint) => endpoint.number).sort((a, b) => a - b),
      connected: peer.lifecycle.isConnected,
      commissionedAt: numberOrUndefined(commissioning?.commissionedAt),
    };
  }

  #clientNodeFor(endpoint: Endpoint): ClientNode | undefined {
    let current: Endpoint | undefined = endpoint;
    for (let depth = 0; current !== undefined && depth < 32; depth++) {
      if (isNode(current)) return current.nodeType === "client" ? (current as ClientNode) : undefined;
      current = current.owner;
    }
    return undefined;
  }

  #handleChange(change: ChangeNotificationService.Change): void {
    if (change.kind !== "update" && change.kind !== "event") return;
    const endpoint = change.endpoint;
    const peer = this.#clientNodeFor(endpoint);
    const nodeId = peer === undefined ? undefined : this.#nodeIdOf(peer);
    if (peer === undefined || nodeId === undefined || this.#fabricId === undefined) return;

    let cluster: ClusterSpec;
    try {
      cluster = resolveCluster(change.behavior.id);
    } catch {
      return; // Cluster not part of the VLink vocabulary.
    }

    if (change.kind === "update") {
      this.#emitUpdates(peer, endpoint, nodeId, cluster.behaviorId, cluster.name, change.properties);
      return;
    }

    const event: MatterEvent = {
      fabricId: this.#fabricId,
      nodeId,
      nodeName: this.#nodeNameOf(peer),
      endpointId: endpoint.number,
      cluster: cluster.name,
      event: lowerCamel(change.event.name),
      data: change.payload === undefined ? undefined : toJsonValue(change.payload),
      timestamp: Date.now(),
    };
    for (const handler of this.#eventHandlers) {
      handler(event);
    }
  }

  #emitUpdates(
    peer: ClientNode,
    endpoint: Endpoint,
    nodeId: string,
    behaviorId: string,
    clusterName: string,
    properties: readonly string[] | undefined,
  ): void {
    const spec = resolveCluster(clusterName);
    const state = endpoint.maybeStateOf(behaviorId);
    if (state === undefined) {
      return;
    }
    const names = properties !== undefined && properties.length > 0 ? properties : Object.keys(state);
    const attributesByProperty = new Map(
      [...spec.attributes.values()].map((attribute) => [attribute.property, attribute] as const),
    );

    for (const property of names) {
      const attribute = attributesByProperty.get(property);
      const value = state[property];
      if (attribute === undefined || value === undefined) continue;
      const json = toJsonValue(value);
      const key = `${nodeId}/${endpoint.number}/${clusterName}/${attribute.name}`;
      const fingerprint = JSON.stringify(json);
      if (this.#lastEmitted.get(key) === fingerprint) continue;
      const previousValue = this.#lastValues.get(key);
      this.#lastValues.set(key, json);
      this.#lastEmitted.set(key, fingerprint);

      const update: MatterAttributeValue = {
        fabricId: this.#fabricId!,
        nodeId,
        nodeName: this.#nodeNameOf(peer),
        endpointId: endpoint.number,
        cluster: clusterName,
        attribute: attribute.name,
        value: json,
        previousValue,
        timestamp: Date.now(),
        source: "subscription",
      };
      for (const handler of this.#attributeHandlers) {
        handler(update);
      }
    }
  }

  async #invokeBehaviorCommand(
    endpoint: Endpoint,
    behaviorId: string,
    commandName: string,
    args: JsonObject | undefined,
    timeoutMs: number,
  ): Promise<JsonValue> {
    let commands: Record<string, unknown>;
    try {
      commands = endpoint.commandsOf(behaviorId);
    } catch {
      throw new VLinkError("UNSUPPORTED_COMMAND", `Endpoint ${endpoint.number} has no ${behaviorId} cluster`, {
        endpointId: endpoint.number, cluster: behaviorId,
      });
    }
    const command = commands[commandName];
    if (typeof command !== "function") {
      throw new VLinkError("UNSUPPORTED_COMMAND", `Device does not accept ${behaviorId}.${commandName}`, {
        cluster: behaviorId, command: commandName,
      });
    }
    const invocation = Promise.resolve(args !== undefined && Object.keys(args).length > 0 ? command(args) : command());
    const result = await withTimeout(invocation, timeoutMs, `Command ${behaviorId}.${commandName}`);
    return result === undefined ? null : toJsonValue(result);
  }

  async #invokeAttributeCommand(
    endpoint: Endpoint,
    behaviorId: string,
    attribute: string | undefined,
    args: JsonObject | undefined,
  ): Promise<JsonValue> {
    if (attribute === undefined) {
      throw new VLinkError("UNSUPPORTED_COMMAND", `Command on ${behaviorId} has no attribute target`);
    }
    const value = args?.mode ?? args?.value;
    if (value === undefined) {
      throw new VLinkError("MATTER_COMMAND_FAILED", `${behaviorId} command requires a mode`);
    }
    try {
      await endpoint.setStateOf(behaviorId, { [attribute]: value });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unsupported/i.test(message)) {
        throw new VLinkError("UNSUPPORTED_COMMAND", `Device does not accept ${behaviorId}.${attribute}`, {
          cluster: behaviorId, attribute,
        });
      }
      throw asVLinkError(error, "MATTER_COMMAND_FAILED");
    }
    return { [attribute]: toJsonValue(value) };
  }

  #discoveredFrom(peer: ClientNode): MatterDiscoveredDevice | undefined {
    const state = peer.maybeStateOf("commissioning");
    if (state === undefined) {
      return undefined;
    }
    const addresses = Array.isArray(state.addresses)
      ? state.addresses.map(addressString).filter((address): address is string => address !== undefined)
      : undefined;
    const transport: MatterDiscoveredDevice["transport"] =
      addresses !== undefined && addresses.length > 0 ? "ip" : this.#bleAvailable ? "ble" : "unknown";
    return {
      discriminator: numberOrUndefined(state.discriminator),
      vendorId: numberOrUndefined(state.vendorId),
      productId: numberOrUndefined(state.productId),
      deviceName: stringOrUndefined(state.deviceName),
      pairingHint: numberOrUndefined(state.pairingHint),
      pairingInstructions: stringOrUndefined(state.pairingInstructions),
      transport,
      addresses,
    };
  }

  #emitNodesChanged(): void {
    if (!this.#ready) {
      return;
    }
    void this.listNodes()
      .then((nodes) => {
        for (const handler of this.#nodesChangedHandlers) handler(nodes);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.#logger.warn("failed to list Matter nodes", { error: message });
      });
  }
}
