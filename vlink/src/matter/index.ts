/**
 * Matter adapter factory.
 *
 * `off` keeps VLink's NATS/health surface alive without touching the Matter stack; `sim` is the
 * deterministic in-memory device; `matter` is the Matter.js controller.
 */

import { VLinkError } from "../errors.ts";
import type { Logger } from "../logger.ts";
import type {
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
  VLinkErrorPayload,
} from "../types.ts";
import { MatterJsAdapter } from "./matter-js.ts";
import { SimulatorAdapter } from "./simulator.ts";

type AttributeHandler = (value: MatterAttributeValue) => void;
type EventHandler = (event: MatterEvent) => void;
type NodesChangedHandler = (nodes: MatterNodeInfo[]) => void;

/**
 * Disabled adapter: satisfies the interface so status/health stay available, but every Matter
 * operation fails with `MATTER_NOT_READY` instead of crashing the bridge.
 */
export class OffAdapter implements MatterAdapter {
  readonly kind = "off" as const;

  readonly #attributeHandlers = new Set<AttributeHandler>();
  readonly #eventHandlers = new Set<EventHandler>();
  readonly #nodesChangedHandlers = new Set<NodesChangedHandler>();
  #stopped = true;

  async start(): Promise<void> {
    this.#stopped = false;
  }

  async stop(): Promise<void> {
    this.#stopped = true;
    this.#attributeHandlers.clear();
    this.#eventHandlers.clear();
    this.#nodesChangedHandlers.clear();
  }

  status(): MatterAdapterStatus {
    return { ready: false, bleAvailable: false, nodeCount: 0 };
  }

  async listNodes(): Promise<MatterNodeInfo[]> {
    throw this.#unavailable();
  }

  async readAttribute(_request: MatterReadRequest): Promise<MatterAttributeValue> {
    throw this.#unavailable();
  }

  async writeAttribute(_request: MatterWriteRequest): Promise<MatterAttributeValue> {
    throw this.#unavailable();
  }

  async invokeCommand(_request: MatterCommandRequest): Promise<MatterCommandResult> {
    const error: VLinkErrorPayload = {
      code: "MATTER_NOT_READY",
      message: "Matter is disabled (matterMode: off)",
    };
    return { ok: false, error };
  }

  async commission(_request: MatterCommissionRequest): Promise<MatterNodeInfo> {
    throw this.#unavailable();
  }

  async discover(_request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]> {
    throw this.#unavailable();
  }

  async decommission(_request: MatterDecommissionRequest): Promise<void> {
    throw this.#unavailable();
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

  #unavailable(): VLinkError {
    return new VLinkError("MATTER_NOT_READY", "Matter is disabled (matterMode: off)", {
      stopped: this.#stopped,
    });
  }
}

/** Create the adapter selected by `config.matterMode`.  Construction is synchronous. */
export function createMatterAdapter(config: VLinkConfig, logger: Logger): MatterAdapter {
  switch (config.matterMode) {
    case "off":
      return new OffAdapter();
    case "sim":
      return new SimulatorAdapter(config, logger);
    case "matter":
      return new MatterJsAdapter(config, logger);
    default: {
      const mode: never = config.matterMode;
      throw new VLinkError("CONFIG_INVALID", `Unknown matter mode "${String(mode)}"`);
    }
  }
}

export { MatterJsAdapter } from "./matter-js.ts";
export { SimulatorAdapter } from "./simulator.ts";
export { listClusters, resolveAttribute, resolveCluster, resolveCommand } from "./clusters.ts";
export type {
  ClusterAttributeSpec,
  ClusterCommandSpec,
  ClusterSpec,
  MatterClientBehavior,
  MatterClusterLike,
} from "./clusters.ts";
