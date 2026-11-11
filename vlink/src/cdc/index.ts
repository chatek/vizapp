/**
 * Public surface of the VLink CDC layer.
 *
 * `CdcBridge` composes a `CdcTransport` (real device or test fake) with a
 * `NatsTransport` per docs/CDC_PROTOCOL.md §5.
 */

export { CdcBridge, type CdcBridgeOptions, type CdcBridgeStatus } from "./cdc-bridge.ts";
export {
  CDC_USB_ID,
  LineFramer,
  NodeCdcTransport,
  discoverCdcDevicePaths,
  type CdcDiscoveryDeps,
  type CdcLineListener,
  type CdcTransport,
  type NodeCdcTransportOptions,
} from "./cdc-transport.ts";
export {
  CDC_MAX_DEVICE_LINE_BYTES,
  CDC_MAX_HOST_LINE_BYTES,
  CDC_VERSION,
  isEchoFor,
  macToNodeId,
  parseCdcLine,
  serializeCdcMessage,
  type CdcAckMessage,
  type CdcButtonMessage,
  type CdcByeMessage,
  type CdcDeviceMessage,
  type CdcDeviceState,
  type CdcEchoMessage,
  type CdcEventMessage,
  type CdcHelloMessage,
  type CdcHostMessage,
  type CdcMessage,
  type CdcParseResult,
  type CdcPressKind,
  type CdcRenderMessage,
  type CdcStateMessage,
  type CdcTelemetryMessage,
  type CdcTickMessage,
  type CdcZone,
  type CdcZonePayload,
} from "./cdc-protocol.ts";
