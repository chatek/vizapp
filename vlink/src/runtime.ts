/**
 * VLinkRuntime: one start/stop lifecycle shared by the OMP extension and the
 * standalone sidecar.
 *
 * The runtime never throws a startup failure into its host. NATS and Matter are
 * independent dependencies: whichever one is available keeps working, and the
 * health payload says exactly what is down.
 *
 * No timers live here. The OMP extension schedules health publishes with
 * `ctx.setInterval`; the sidecar owns its own interval.
 */
import { join } from "node:path";
import { CdcBridge } from "./cdc/index.ts";
import { NodeCdcTransport } from "./cdc/cdc-transport.ts";
import { ensureStateDir } from "./config.ts";
import { createMatterAdapter } from "./matter/index.ts";
import { CommandRouter, NodeNatsTransport, TelemetryPublisher } from "./nats/index.ts";
import { createLogger, type Logger } from "./logger.ts";
import { VLinkError } from "./errors.ts";
import { NodeRegistry } from "./registry.ts";
import { normalizeFabricId } from "./subjects.ts";
import type {
  BridgeOperations,
  MatterAdapter,
  MatterAdapterStatus,
  MatterAttributeValue,
  MatterCommandRequest,
  MatterCommandResult,
  MatterCommissionRequest,
  MatterDecommissionRequest,
  MatterDiscoveredDevice,
  MatterDiscoverRequest,
  MatterNodeInfo,
  MatterReadRequest,
  MatterWriteRequest,
  NatsTransport,
  RuntimeStatus,
  VLinkConfig,
  VLinkHealth,
  VLinkState,
} from "./types.ts";

export interface VLinkRuntimeDeps {
  matter?: MatterAdapter;
  /** Pre-built CDC bridge; default is built from config when `cdcEnabled`. */
  cdc?: CdcBridge;
  transport?: NatsTransport;
}

export type RuntimeStateListener = (status: RuntimeStatus) => void;

const FALLBACK_FABRIC_ID = "fabric-0000000000000000";

const EMPTY_MATTER_STATUS: MatterAdapterStatus = {
  ready: false,
  bleAvailable: false,
  nodeCount: 0,
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, Math.max(0, ms));
  timer.unref?.();
  return promise;
}

export class VLinkRuntime implements BridgeOperations {
  private readonly config: VLinkConfig;
  private readonly logger: Logger;
  private readonly registry: NodeRegistry;
  private matter: MatterAdapter | undefined;
  private transport: NatsTransport | undefined;
  private router: CommandRouter | undefined;
  private cdc: CdcBridge | undefined;
  private publisher: TelemetryPublisher | undefined;
  private readonly listeners = new Set<RuntimeStateListener>();
  private state: VLinkState = "stopped";
  private startedAt: number | undefined;
  private lastError: string | undefined;
  private startPromise: Promise<void> | undefined;
  private stopPromise: Promise<void> | undefined;
  private stopRequested = false;
  private resolvedFabricId: string | undefined;

  constructor(config: VLinkConfig, logger?: Logger, deps: VLinkRuntimeDeps = {}) {
    this.config = config;
    this.logger = logger ?? createLogger(config.logLevel);
    this.registry = new NodeRegistry(join(config.stateDir, "nodes.json"));
    this.matter = deps.matter;
    this.transport = deps.transport;
    this.cdc = deps.cdc;
  }

  /** Start NATS and Matter. Resolves once every dependency has settled. */
  async start(): Promise<void> {
    if (this.startPromise) return this.startPromise;
    if (this.state === "ready" || this.state === "degraded") return;
    if (this.stopPromise) await this.stopPromise;

    this.stopRequested = false;
    this.startPromise = this.doStart();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = undefined;
    }
  }

  private async doStart(): Promise<void> {
    this.startedAt ??= Date.now();
    this.lastError = undefined;
    this.setState("starting");
    this.logger.info("vlink starting", {
      natsUrl: this.config.natsUrl,
      matterMode: this.config.matterMode,
    });

    let failed = false;

    try {
      ensureStateDir(this.config);
      await this.registry.load();
    } catch (error) {
      // A bad state file must not prevent the bridge from starting.
      this.logger.warn("node registry load failed", { error: errorText(error) });
    }

    if (!this.matter) {
      try {
        this.matter = createMatterAdapter(this.config, this.logger);
      } catch (error) {
        failed = true;
        this.recordError("create Matter adapter", error);
      }
    }

    if (this.matter) {
      try {
        await this.matter.start();
      } catch (error) {
        failed = true;
        this.recordError("start Matter adapter", error);
      }
    } else {
      failed = true;
    }

    this.resolvedFabricId = this.resolveFabricId();

    if (!this.transport) {
      try {
        this.transport = new NodeNatsTransport(this.config, this.logger);
      } catch (error) {
        failed = true;
        this.recordError("create NATS transport", error);
      }
    }

    let natsReady = false;
    if (this.transport) {
      try {
        await this.transport.connect();
        natsReady = this.transport.isConnected();
        if (!natsReady) {
          failed = true;
          this.recordError("connect NATS", new Error("transport is not connected"));
        }
      } catch (error) {
        failed = true;
        this.recordError("connect NATS", error);
      }
    }

    if (natsReady && this.transport && this.matter) {
      const transport = this.transport;
      const matter = this.matter;
      try {
        this.router = new CommandRouter({
          transport,
          matter,
          bridge: this,
          fabricId: this.resolvedFabricId ?? FALLBACK_FABRIC_ID,
          logger: this.logger,
          queue: this.config.commandQueue,
          defaultTimeoutMs: this.config.defaultCommandTimeoutMs,
          hasCdcDisplay: () => this.cdc?.isStarted() === true,
        });
        await this.router.start();
      } catch (error) {
        failed = true;
        this.recordError("start command router", error);
      }

      try {
        this.publisher = new TelemetryPublisher({
          transport,
          matter,
          logger: this.logger,
          instanceId: this.config.instanceId,
        });
        await this.publisher.start();
      } catch (error) {
        failed = true;
        this.recordError("start telemetry publisher", error);
      }
    }

    // The CDC bridge translates the ESP32-C6 board's lines onto the bus
    // (docs/CDC_PROTOCOL.md). It starts only once NATS is up — its display
    // replies ride the same connection — and a missing board is a normal,
    // non-fatal state (health reports cdc:false).
    if (this.config.cdcEnabled && this.transport) {
      if (!this.cdc) {
        this.cdc = new CdcBridge({
          transport: new NodeCdcTransport({ devicePath: this.config.cdcDevicePath }),
          nats: this.transport!,
          fabricId: this.resolvedFabricId ?? FALLBACK_FABRIC_ID,
          instanceId: this.config.instanceId,
          logger: this.logger,
          queue: this.config.commandQueue,
          // §4 page sync: the runtime is the facts source (listNodes with
          // aliases, health) — the same BridgeOperations the router consumes.
          facts: { listNodes: () => this.listNodes(), health: () => this.health() },
        });
      }
      try {
        await this.cdc.start();
      } catch (error) {
        // CDC start() already absorbs device absence; this is belt-and-braces
        // so an unexpected failure never degrades Matter/NATS operation.
        this.logger.warn("start cdc bridge failed", { error: errorText(error) });
      }
    }

    if (this.stopRequested) {
      this.logger.info("vlink start completed during shutdown");
      return;
    }

    this.setState(failed ? "degraded" : "ready");
    this.logger.info("vlink started", { state: this.state, lastError: this.lastError });
  }

  /** Stop every dependency. Idempotent and never throws. */
  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    this.stopPromise = this.doStop();
    try {
      await this.stopPromise;
    } finally {
      this.stopPromise = undefined;
    }
  }

  private async doStop(): Promise<void> {
    this.stopRequested = true;
    if (this.state === "stopped" && !this.startPromise) return;

    this.setState("stopping");

    if (this.startPromise) {
      try {
        await this.startPromise;
      } catch {
        // start() already contains its failures; nothing else to report.
      }
    }

    if (this.publisher) {
      try {
        this.publisher.stop();
      } catch (error) {
        this.logger.warn("stop telemetry publisher failed", { error: errorText(error) });
      }
      this.publisher = undefined;
    }

    if (this.router) {
      try {
        await this.router.stop();
      } catch (error) {
        this.logger.warn("stop command router failed", { error: errorText(error) });
      }
      this.router = undefined;
    }

    if (this.cdc) {
      try {
        await this.cdc.stop();
      } catch (error) {
        this.logger.warn("stop cdc bridge failed", { error: errorText(error) });
      }
      this.cdc = undefined;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        this.logger.warn("close NATS transport failed", { error: errorText(error) });
      }
      this.transport = undefined;
    }

    if (this.matter) {
      try {
        await this.matter.stop();
      } catch (error) {
        this.logger.warn("stop Matter adapter failed", { error: errorText(error) });
      }
    }

    this.startedAt = undefined;
    this.lastError = undefined;
    this.resolvedFabricId = undefined;
    this.setState("stopped");
    this.logger.info("vlink stopped");
  }

  /** Resolve after start/stop settles or `timeoutMs`, whichever comes first. */
  async waitUntilSettled(timeoutMs = 5_000): Promise<VLinkState> {
    const pending = this.startPromise ?? this.stopPromise;
    if (pending) {
      await Promise.race([pending.catch(() => undefined), delay(timeoutMs)]);
    }
    return this.state;
  }

  status(): RuntimeStatus {
    return {
      state: this.state,
      startedAt: this.startedAt,
      lastError: this.lastError,
      config: this.config,
      matter: this.matterStatus(),
      natsConnected: this.transport?.isConnected() ?? false,
    };
  }

  health(): VLinkHealth {
    const matter = this.matterStatus();
    return {
      v: 1,
      instanceId: this.config.instanceId,
      state: this.state,
      fabricId: this.resolvedFabricId ?? this.config.fabricId ?? matter.fabricId,
      natsUrl: this.config.natsUrl,
      natsConnected: this.transport?.isConnected() ?? false,
      cdcConnected: this.cdc?.status().connected ?? false,
      ...(this.cdc?.status().node !== undefined ? { cdcNode: this.cdc?.status().node } : {}),
      matterMode: this.config.matterMode,
      matterReady: matter.ready,
      bleAvailable: matter.bleAvailable,
      nodeCount: matter.nodeCount,
      startedAt: this.startedAt,
      uptimeMs: this.startedAt === undefined ? 0 : Math.max(0, Date.now() - this.startedAt),
      lastError: this.lastError,
    };
  }

  /** Publish the current health snapshot. No-op when NATS is not running. */
  publishHealth(): void {
    if (!this.publisher) return;
    try {
      this.publisher.publishHealth(this.health());
    } catch (error) {
      this.logger.warn("publish health failed", { error: errorText(error) });
    }
  }

  onStateChange(listener: RuntimeStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getConfig(): VLinkConfig {
    return this.config;
  }

  getMatter(): MatterAdapter | undefined {
    return this.matter;
  }

  getTransport(): NatsTransport | undefined {
    return this.transport;
  }

  // -------------------------------------------------------------------------
  // BridgeOperations
  // -------------------------------------------------------------------------

  async listNodes(): Promise<MatterNodeInfo[]> {
    const nodes = await this.matterOrThrow().listNodes();
    const remembered = new Map(this.registry.list().map((node) => [node.nodeId, node] as const));
    return nodes.map((node) => {
      const alias = remembered.get(node.nodeId)?.nodeName;
      return alias ? { ...node, nodeName: alias } : node;
    });
  }

  async discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    return this.matterOrThrow().discover(request);
  }

  async commission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    // §4: arm the adoption window before dispatch; the board shows the armed
    // adopt page while the commissioning handshake runs (cleared on settle).
    this.cdc?.onCommissionStart();
    try {
      return await this.doCommission(request);
    } finally {
      this.cdc?.onCommissionSettled();
    }
  }

  private async doCommission(request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    const node = await this.matterOrThrow().commission(request);
    const stored: MatterNodeInfo = {
      ...node,
      ...(request.nodeName ? { nodeName: request.nodeName } : {}),
    };
    try {
      await this.registry.upsert(stored);
    } catch (error) {
      this.logger.warn("node alias persistence failed", {
        nodeId: stored.nodeId,
        error: errorText(error),
      });
    }
    return stored;
  }

  async decommission(request: MatterDecommissionRequest): Promise<void> {
    await this.matterOrThrow().decommission(request);
    try {
      await this.registry.remove(request.nodeId);
    } catch (error) {
      this.logger.warn("node alias removal failed", {
        nodeId: request.nodeId,
        error: errorText(error),
      });
    }
  }

  async read(request: MatterReadRequest): Promise<MatterAttributeValue> {
    return this.matterOrThrow().readAttribute(request);
  }

  async write(request: MatterWriteRequest): Promise<MatterAttributeValue> {
    return this.matterOrThrow().writeAttribute(request);
  }

  /** Device command path shared by tools and the router. */
  async command(request: MatterCommandRequest): Promise<MatterCommandResult> {
    return this.matterOrThrow().invokeCommand(request);
  }

  // -------------------------------------------------------------------------

  private matterOrThrow(): MatterAdapter {
    if (!this.matter) {
      throw new VLinkError("MATTER_NOT_READY", "VLink Matter adapter is not initialized");
    }
    return this.matter;
  }

  private matterStatus(): MatterAdapterStatus {
    if (!this.matter) return { ...EMPTY_MATTER_STATUS };
    try {
      return this.matter.status();
    } catch (error) {
      return { ...EMPTY_MATTER_STATUS, lastError: errorText(error) };
    }
  }

  private resolveFabricId(): string | undefined {
    const raw = this.config.fabricId ?? this.matter?.status().fabricId;
    if (!raw) return undefined;
    try {
      return normalizeFabricId(raw);
    } catch {
      return undefined;
    }
  }

  private recordError(action: string, error: unknown): void {
    const message = `${action}: ${errorText(error)}`;
    this.lastError = message;
    this.logger.error("vlink dependency failed", { action, error: errorText(error) });
  }

  private setState(state: VLinkState): void {
    if (this.state === state) return;
    this.state = state;
    const snapshot = this.status();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        this.logger.warn("state listener failed", { error: errorText(error) });
      }
    }
  }
}
