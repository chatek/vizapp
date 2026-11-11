/**
 * Matter → NATS telemetry fan-out.
 *
 * The publisher is a thin adapter: Matter emits attribute/event notifications,
 * the publisher maps them onto the shared subject taxonomy and JSON contract.
 * It never throws into the Matter layer and drops messages while disconnected.
 */

import { encodeAttributeTelemetry, encodeEventTelemetry, encodeHealth } from "../payloads.ts";
import { eventSubject, healthSubject, telemetrySubject } from "../subjects.ts";
import type {
  AttributeTelemetry,
  EventTelemetry,
  Logger,
  MatterAdapter,
  MatterAttributeValue,
  MatterEvent,
  NatsTransport,
  VLinkHealth,
} from "../types.ts";

export interface TelemetryPublisherOptions {
  transport: NatsTransport;
  matter: MatterAdapter;
  logger: Logger;
  instanceId: string;
}

export class TelemetryPublisher {
  private readonly transport: NatsTransport;
  private readonly matter: MatterAdapter;
  private readonly logger: Logger;
  private readonly instanceId: string;
  private disposers: Array<() => void> = [];
  private started = false;

  constructor(options: TelemetryPublisherOptions) {
    this.transport = options.transport;
    this.matter = options.matter;
    this.logger = options.logger;
    this.instanceId = options.instanceId;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    try {
      this.disposers.push(this.matter.onAttribute((value) => this.publishAttribute(value)));
      this.disposers.push(this.matter.onEvent((event) => this.publishEvent(event)));
    } catch (error) {
      this.stop();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  stop(): void {
    this.started = false;
    for (const dispose of this.disposers.splice(0)) {
      try {
        dispose();
      } catch (error) {
        this.logger.debug("telemetry listener dispose failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  publishHealth(health: VLinkHealth): void {
    if (!this.transport.isConnected()) {
      this.logger.debug("health publish skipped: nats disconnected", { instanceId: this.instanceId });
      return;
    }
    try {
      this.transport.publish(healthSubject(this.instanceId), encodeHealth(health));
    } catch (error) {
      this.logger.warn("health publish failed", {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private publishAttribute(value: MatterAttributeValue): void {
    if (!this.transport.isConnected()) {
      this.logger.debug("attribute telemetry skipped: nats disconnected", {
        nodeId: value.nodeId,
        cluster: value.cluster,
        attribute: value.attribute,
      });
      return;
    }
    const telemetry: AttributeTelemetry = {
      v: 1,
      type: "attribute",
      fabricId: value.fabricId,
      nodeId: value.nodeId,
      endpointId: value.endpointId,
      cluster: value.cluster,
      attribute: value.attribute,
      value: value.value,
      ...(value.previousValue !== undefined ? { previousValue: value.previousValue } : {}),
      timestamp: value.timestamp,
      ...(value.nodeName !== undefined ? { nodeName: value.nodeName } : {}),
      source: value.source,
    };
    try {
      this.transport.publish(telemetrySubject(value), encodeAttributeTelemetry(telemetry));
    } catch (error) {
      this.logger.warn("attribute telemetry publish failed", {
        nodeId: value.nodeId,
        cluster: value.cluster,
        attribute: value.attribute,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private publishEvent(event: MatterEvent): void {
    if (!this.transport.isConnected()) {
      this.logger.debug("event telemetry skipped: nats disconnected", {
        nodeId: event.nodeId,
        cluster: event.cluster,
        event: event.event,
      });
      return;
    }
    const telemetry: EventTelemetry = {
      v: 1,
      type: "event",
      fabricId: event.fabricId,
      nodeId: event.nodeId,
      endpointId: event.endpointId,
      cluster: event.cluster,
      event: event.event,
      ...(event.data !== undefined ? { data: event.data } : {}),
      timestamp: event.timestamp,
      ...(event.nodeName !== undefined ? { nodeName: event.nodeName } : {}),
    };
    try {
      this.transport.publish(eventSubject(event), encodeEventTelemetry(telemetry));
    } catch (error) {
      this.logger.warn("event telemetry publish failed", {
        nodeId: event.nodeId,
        cluster: event.cluster,
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
