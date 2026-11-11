/**
 * Shared VLink contracts.
 *
 * These types are deliberately transport-agnostic: the NATS layer, the Matter
 * adapters, the OMP extension, and the tests all speak them. Keep JSON payload
 * shapes stable; they are the public wire format on the shared NATS bus.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured logger used by every VLink module. Implemented by src/logger.ts. */
export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

export type VLinkState = "stopped" | "starting" | "ready" | "degraded" | "stopping";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface VLinkConfig {
  natsUrl: string;
  natsName: string;
  natsToken?: string;
  natsTokenFile?: string;
  /** Human/stable override; when omitted the Matter fabric ID is used. */
  fabricId?: string;
  fabricLabel: string;
  stateDir: string;
  matterStorage: string;
  matterMode: "matter" | "sim" | "off";
  bleEnabled: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  commandQueue: string;
  healthIntervalMs: number;
  reconnectWaitMs: number;
  logLevel: LogLevel;
  notifyEvents: boolean;
  instanceId: string;
  defaultCommandTimeoutMs: number;
  defaultCommissionTimeoutMs: number;
  /** CDC bridge to the ESP32-C6 board over USB-Serial/JTAG (CDC_PROTOCOL.md). */
  cdcEnabled: boolean;
  /** Explicit CDC device path; default is auto-discovery of USB 303a:1001. */
  cdcDevicePath?: string;
}

export interface MatterAttributePath {
  fabricId: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  attribute: string;
}

export interface MatterAttributeValue extends MatterAttributePath {
  value: JsonValue;
  previousValue?: JsonValue;
  timestamp: number;
  nodeName?: string;
  source: "subscription" | "read";
}

export interface MatterEvent {
  fabricId: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  event: string;
  data?: JsonValue;
  timestamp: number;
  nodeName?: string;
}

export interface MatterNodeInfo {
  fabricId: string;
  nodeId: string;
  nodeName?: string;
  vendorName?: string;
  productName?: string;
  endpointIds: number[];
  connected: boolean;
  commissionedAt?: number;
}

export interface MatterDiscoveredDevice {
  discriminator?: number;
  vendorId?: number;
  productId?: number;
  deviceName?: string;
  pairingHint?: number;
  pairingInstructions?: string;
  transport: "ble" | "ip" | "thread" | "unknown";
  addresses?: string[];
}

export interface MatterReadRequest extends MatterAttributePath {
  timeoutMs?: number;
}

export interface MatterWriteRequest extends MatterAttributePath {
  value: JsonValue;
  timeoutMs?: number;
}

export interface MatterCommandRequest {
  fabricId: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  command: string;
  args?: JsonObject;
  timeoutMs?: number;
}

export interface MatterCommandResult {
  ok: boolean;
  data?: JsonValue;
  error?: VLinkErrorPayload;
  durationMs?: number;
}

export interface MatterCommissionRequest {
  pairingCode?: string;
  passcode?: number;
  discriminator?: number;
  transport: "ble-wifi" | "ip" | "ble-thread";
  wifi?: { ssid: string; password: string };
  thread?: { networkName?: string; operationalDataset: string };
  nodeId?: string;
  nodeName?: string;
  timeoutMs?: number;
}

export interface MatterDiscoverRequest {
  timeoutMs?: number;
  transport?: "ble" | "ip" | "both";
}

export interface MatterDecommissionRequest {
  fabricId: string;
  nodeId: string;
  force?: boolean;
}

export interface MatterAdapterStatus {
  ready: boolean;
  fabricId?: string;
  bleAvailable: boolean;
  nodeCount: number;
  lastError?: string;
}

export interface MatterAdapter {
  readonly kind: "matter" | "sim" | "off";
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): MatterAdapterStatus;
  listNodes(): Promise<MatterNodeInfo[]>;
  readAttribute(request: MatterReadRequest): Promise<MatterAttributeValue>;
  writeAttribute(request: MatterWriteRequest): Promise<MatterAttributeValue>;
  invokeCommand(request: MatterCommandRequest): Promise<MatterCommandResult>;
  commission(request: MatterCommissionRequest): Promise<MatterNodeInfo>;
  discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]>;
  decommission(request: MatterDecommissionRequest): Promise<void>;
  onAttribute(handler: (value: MatterAttributeValue) => void): () => void;
  onEvent(handler: (event: MatterEvent) => void): () => void;
  onNodesChanged(handler: (nodes: MatterNodeInfo[]) => void): () => void;
}

export interface NatsMessage {
  subject: string;
  data: Uint8Array;
  reply?: string;
}

export type NatsStatus = "connected" | "disconnected" | "reconnecting" | "closed" | "error";

export interface NatsSubscription {
  unsubscribe(): void;
}

export interface NatsTransport {
  readonly url: string;
  connect(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;
  publish(subject: string, data: Uint8Array, options?: { reply?: string }): void;
  subscribe(
    subject: string,
    handler: (error: Error | null, message: NatsMessage) => void,
    options?: { queue?: string },
  ): Promise<NatsSubscription>;
  flush(): Promise<void>;
  onStatus(listener: (status: NatsStatus, error?: Error) => void): () => void;
}

export type BridgeAction = "status" | "list" | "discover" | "commission" | "decommission" | "read" | "write";

export interface AttributeTelemetry {
  v: 1;
  type: "attribute";
  fabricId: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  attribute: string;
  value: JsonValue;
  previousValue?: JsonValue;
  timestamp: number;
  nodeName?: string;
  source: "subscription" | "read";
}

export interface EventTelemetry {
  v: 1;
  type: "event";
  fabricId: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  event: string;
  data?: JsonValue;
  timestamp: number;
  nodeName?: string;
}

export interface DeviceCommandPayload {
  v: 1;
  type: "command";
  requestId?: string;
  fabricId?: string;
  nodeId: string;
  endpointId: number;
  cluster: string;
  command: string;
  args?: JsonObject;
  timeoutMs?: number;
}

export interface BridgeCommandPayload {
  v: 1;
  type: "bridge";
  requestId?: string;
  action: BridgeAction;
  pairingCode?: string;
  passcode?: number;
  discriminator?: number;
  transport?: "ble-wifi" | "ip" | "ble-thread";
  wifi?: { ssid: string; password: string };
  thread?: { networkName?: string; operationalDataset: string };
  nodeId?: string;
  nodeName?: string;
  endpointId?: number;
  cluster?: string;
  attribute?: string;
  command?: string;
  args?: JsonObject;
  value?: JsonValue;
  timeoutMs?: number;
  force?: boolean;
}

export type CommandPayload = DeviceCommandPayload | BridgeCommandPayload;

export interface VLinkErrorPayload {
  code: string;
  message: string;
  details?: JsonValue;
}

export interface CommandResult<T = unknown> {
  v: 1;
  ok: boolean;
  requestId?: string;
  action?: BridgeAction;
  nodeId?: string;
  endpointId?: number;
  cluster?: string;
  command?: string;
  data?: T;
  error?: VLinkErrorPayload;
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

export interface VLinkHealth {
  v: 1;
  instanceId: string;
  state: VLinkState;
  fabricId?: string;
  natsUrl: string;
  natsConnected: boolean;
  /** The CDC bridge has an open line to the board. */
  cdcConnected: boolean;
  /** Node id learned from the device `hello`; present when a device is attached. */
  cdcNode?: string;
  matterMode: "matter" | "sim" | "off";
  matterReady: boolean;
  bleAvailable: boolean;
  nodeCount: number;
  startedAt?: number;
  uptimeMs: number;
  lastError?: string;
}

export interface RuntimeStatus {
  state: VLinkState;
  startedAt?: number;
  lastError?: string;
  config: VLinkConfig;
  matter: MatterAdapterStatus;
  natsConnected: boolean;
}

export type ParsedCommandSubject =
  | {
      kind: "device";
      fabricId: string;
      nodeId: string;
      endpointId: number;
      cluster: string;
      command: string;
    }
  | {
      kind: "bridge";
      fabricId: string;
      action: BridgeAction;
    };

/**
 * Bridge-level operations exposed on `iot.cmd.matter.<fabric>.bridge.<action>`.
 * Implemented by VLinkRuntime; consumed by the NATS command router.
 */
export interface BridgeOperations {
  health(): VLinkHealth;
  listNodes(): Promise<MatterNodeInfo[]>;
  discover(request: MatterDiscoverRequest): Promise<MatterDiscoveredDevice[]>;
  commission(request: MatterCommissionRequest): Promise<MatterNodeInfo>;
  decommission(request: MatterDecommissionRequest): Promise<void>;
  read(request: MatterReadRequest): Promise<MatterAttributeValue>;
  write(request: MatterWriteRequest): Promise<MatterAttributeValue>;
}
