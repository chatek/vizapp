/**
 * CDC bridge: the ESP32-C6 board's transport onto the shared NATS bus.
 *
 * Implements docs/CDC_PROTOCOL.md §5: device lines become `iot.event.matter.>`
 * / `iot.matter.>` publishes; `iot.cmd.matter.<fabric>.<node>.1.display.>`
 * requests (queue `vlink`) become `render`/`event` lines with `ok` replies
 * gated on the device `echo` (2 s → `DEVICE_TIMEOUT`). The bridge learns the
 * node id from the device `hello` (§2 MAC-derived identity), acks on open and
 * on `hello`, and says `bye` on close. A missing device degrades to
 * `cdcConnected: false` — it never throws into the OMP session.
 */

import { asVLinkError, toErrorPayload } from "../errors.ts";
import { encodeAttributeTelemetry, encodeCommandResult, encodeEventTelemetry, parseCommandPayload } from "../payloads.ts";
import { eventSubject, telemetrySubject } from "../subjects.ts";
import type {
  AttributeTelemetry,
  CommandPayload,
  CommandResult,
  EventTelemetry,
  JsonObject,
  JsonValue,
  Logger,
  NatsMessage,
  NatsSubscription,
  NatsTransport,
  VLinkErrorPayload,
} from "../types.ts";
import type { CdcTransport } from "./cdc-transport.ts";
import {
  macToNodeId,
  parseCdcLine,
  serializeCdcMessage,
  type CdcButtonMessage,
  type CdcHostMessage,
  type CdcZonePayload,
} from "./cdc-protocol.ts";

const DEFAULT_ECHO_TIMEOUT_MS = 2_000;
const DEFAULT_QUEUE = "vlink";
/** How often the supervisor re-checks the device (hot-plug rediscovery). */
const DEFAULT_SUPERVISE_MS = 5_000;
/** No device line for this long while open → the link is dead; re-discover. */
const DEFAULT_LINK_SILENCE_MS = 45_000;
/** A heartbeat older than this no longer counts the agent as live. */
const DEFAULT_HB_TTL_MS = 15_000;
const DISPLAY_ACTIONS = ["status", "ticker", "activity", "notify"] as const;
const RENDER_ZONES = ["status", "ticker", "activity"] as const;
type DisplayAction = (typeof DISPLAY_ACTIONS)[number];
type RenderZone = (typeof RENDER_ZONES)[number];

/** Named timer contract (Bun/Node interval handle). */
type Interval = ReturnType<typeof setInterval>;

/** The value when positive, else the fallback. */
function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && value > 0 ? value : fallback;
}

export interface CdcBridgeOptions {
  transport: CdcTransport;
  nats: NatsTransport;
  /** Fabric the device belongs to (told to the device in `ack`, §2). */
  fabricId: string;
  /** Host instance id, also carried in `ack`. */
  instanceId: string;
  logger: Logger;
  /** Queue group for the display subscription (§5); default `vlink`. */
  queue?: string;
  /** Supervisor re-check period for hot-plug rediscovery; default 5 s. */
  superviseMs?: number;
  /** Open-but-silent period after which the link is considered dead. */
  linkSilenceMs?: number;
  /** Period for the OMP-status → LCD sync publisher; default the same as superviseMs. */
  statusIntervalMs?: number;
  /** Heartbeat age over which a peer no longer counts as live; default 15 s. */
  heartbeatTtlMs?: number;
  /** How long to wait for the device `echo` before `DEVICE_TIMEOUT`. */
  echoTimeoutMs?: number;
}

export interface CdcBridgeStatus {
  connected: boolean;
  /** Node id learned from `hello`; undefined until the device introduces itself. */
  node?: string;
}

interface PendingRender {
  startedAt: number;
  node: string;
  action: DisplayAction;
  requestId: string | undefined;
  resolve(result: CommandResult): void;
  timer: ReturnType<typeof setTimeout>;
}

type ParsedDisplaySubject = { ok: true; action: DisplayAction } | { ok: false; error: string };

interface DisplayResultFields {
  ok: boolean;
  node?: string;
  action?: DisplayAction;
  requestId?: string;
  error?: VLinkErrorPayload;
}

function displayResult(startedAt: number, fields: DisplayResultFields): CommandResult {
  const completedAt = Date.now();
  return {
    v: 1,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    ok: fields.ok,
    ...(fields.node !== undefined ? { nodeId: fields.node, endpointId: 1, cluster: "display" } : {}),
    ...(fields.action !== undefined ? { command: fields.action } : {}),
    ...(fields.requestId !== undefined ? { requestId: fields.requestId } : {}),
    ...(fields.error !== undefined ? { error: fields.error } : {}),
  };
}

function deviceTimeout(startedAt: number, node: string, action: DisplayAction, requestId: string | undefined, why: string): CommandResult {
  return displayResult(startedAt, { ok: false, node, action, requestId, error: { code: "DEVICE_TIMEOUT", message: why } });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nonEmptyString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export class CdcBridge {
  private readonly transport: CdcTransport;
  private readonly nats: NatsTransport;
  private readonly fabricId: string;
  private readonly instanceId: string;
  private readonly logger: Logger;
  private readonly queue: string | undefined;
  private readonly echoTimeoutMs: number;
  private readonly superviseMs: number;
  private readonly linkSilenceMs: number;
  private readonly statusIntervalMs: number;
  private readonly heartbeatTtlMs: number;
  private readonly pending = new Map<string, PendingRender>();
  private subscription: NatsSubscription | undefined;
  private hbSubscription: NatsSubscription | undefined;
  private disposeLines: (() => void) | undefined;
  private nodeId: string | undefined;
  private started = false;
  private renderCounter = 0;
  private lastDeviceLineAt = 0;
  private superviseTimer: Interval | undefined;
  /** Live agent names from `agents.hb.>` heartbeats, with the time of the last beat. */
  private readonly hbSeen = new Map<string, number>();
  private hbTimer: Interval | undefined;
  private lastStatusText: string | undefined;
  private lastStatusAmber: boolean | undefined;

  constructor(options: CdcBridgeOptions) {
    this.transport = options.transport;
    this.nats = options.nats;
    this.fabricId = options.fabricId;
    this.instanceId = options.instanceId;
    this.logger = options.logger;
    this.queue = options.queue && options.queue.length > 0 ? options.queue : DEFAULT_QUEUE;
    this.echoTimeoutMs = options.echoTimeoutMs && options.echoTimeoutMs > 0 ? options.echoTimeoutMs : DEFAULT_ECHO_TIMEOUT_MS;
    this.superviseMs = positiveOr(options.superviseMs, DEFAULT_SUPERVISE_MS);
    this.linkSilenceMs = positiveOr(options.linkSilenceMs, DEFAULT_LINK_SILENCE_MS);
    this.statusIntervalMs = positiveOr(options.statusIntervalMs, this.superviseMs);
    this.heartbeatTtlMs = positiveOr(options.heartbeatTtlMs, DEFAULT_HB_TTL_MS);
  }

  /** True between start() and stop() — lets the router know display commands have an owner. */
  isStarted(): boolean {
    return this.started;
  }

  /**
   * Open the device and wire the translation. A missing device resolves
   * normally (logged, `status().connected === false`): absence is a normal
   * deployment state — and the supervisor keeps rediscovering so a board
   * plugged in later is picked up.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.lastDeviceLineAt = Date.now();
    this.disposeLines = this.transport.onLine((line) => this.handleLine(line));
    await this.tryOpen();

    // Hot-plug + link supervision: re-check the device every superviseMs.
    // Covers board-absent-at-start (rediscovery) and unplugged-while-open
    // (silence watchdog) — the daily-use "plug in whenever" flow.
    this.superviseTimer = setInterval(() => void this.supervise(), this.superviseMs);
    this.superviseTimer.unref?.();

    // OMP-status → LCD sync: count live agents from the pi-a2a heartbeat
    // plane and push the status line whenever it changes.
    this.hbSubscription = await this.subscribeHeartbeats();
    this.hbTimer = setInterval(() => this.syncStatus(), this.statusIntervalMs);
    this.hbTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    if (this.superviseTimer) {
      clearInterval(this.superviseTimer);
      this.superviseTimer = undefined;
    }
    if (this.hbTimer) {
      clearInterval(this.hbTimer);
      this.hbTimer = undefined;
    }
    this.hbSubscription?.unsubscribe();
    this.hbSubscription = undefined;
    this.hbSeen.clear();
    this.lastStatusText = undefined;
    this.lastStatusAmber = undefined;

    if (this.transport.isOpen()) {
      this.writeMessage({ type: "bye" });
    }

    const subscription = this.subscription;
    this.subscription = undefined;
    if (subscription) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        this.logger.debug("cdc display unsubscribe failed", { error: errorText(error) });
      }
    }

    // Settle pending renders so no requestor and no timer outlives the bridge.
    for (const [id, entry] of [...this.pending]) {
      clearTimeout(entry.timer);
      this.pending.delete(id);
      entry.resolve(
        deviceTimeout(entry.startedAt, entry.node, entry.action, entry.requestId, "cdc bridge stopped before the device echoed"),
      );
    }

    this.disposeLines?.();
    this.disposeLines = undefined;
    try {
      await this.transport.close();
    } catch (error) {
      this.logger.warn("cdc transport close failed", { error: errorText(error) });
    }
    this.nodeId = undefined;
  }

  /** One supervisor pass: open if closed, respawn the link if silent-dead. */
  private async supervise(): Promise<void> {
    if (!this.started) return;
    if (!this.transport.isOpen()) {
      await this.tryOpen();
      return;
    }
    if (this.lastDeviceLineAt > 0 && Date.now() - this.lastDeviceLineAt > this.linkSilenceMs) {
      // The device ticks every 30 s; past the silence window the link is a
      // zombie (an unplug can leave the fd readable-but-EOF). Close and
      // rediscover; the device re-hellos and everything rejoins.
      this.logger.info("cdc link silent; rediscovering", { node: this.nodeId });
      await this.transport.close().catch(() => {});
      await this.tryOpen();
    }
  }

  /** Open + ack; absence is a normal state, logged at debug to keep the log quiet. */
  private async tryOpen(): Promise<void> {
    let opened = false;
    try {
      opened = await this.transport.open();
    } catch (error) {
      this.logger.warn("cdc transport open failed", { error: errorText(error) });
    }
    if (!opened) {
      this.logger.debug("cdc device not found; will retry", { fabricId: this.fabricId });
      return;
    }
    this.lastDeviceLineAt = Date.now();
    this.logger.info("cdc device opened", { fabricId: this.fabricId });
    // §7: the device may already be waiting from a previous session — an ack
    // is harmless when it is not, and re-acks a dozing device back to idle.
    this.sendAck();
  }

  status(): CdcBridgeStatus {
    return {
      connected: this.transport.isOpen(),
      ...(this.nodeId !== undefined ? { node: this.nodeId } : {}),
    };
  }

  // -------------------------------------------------------------------------
  // Device → NATS (§5 table 1)
  // -------------------------------------------------------------------------

  private handleLine(line: string): void {
    this.lastDeviceLineAt = Date.now();
    const parsed = parseCdcLine(line);
    if (!parsed.ok) {
      this.logger.warn("cdc line dropped", { error: parsed.error, line: line.slice(0, 120) });
      return;
    }
    const message = parsed.message;
    if (message.type === "unknown") {
      // §1: unknown types are ignored for forward compatibility.
      this.logger.debug("cdc unknown type ignored", { type: message.messageType });
      return;
    }
    if (message.type === "hello") {
      this.handleHello(message.mac, message.fw);
      return;
    }
    if (message.type === "echo") {
      this.handleEcho(message.id);
      return;
    }
    if (this.nodeId === undefined) {
      // Without the hello-derived identity there is no subject to publish on.
      this.logger.debug("cdc line before hello ignored", { type: message.type });
      return;
    }
    switch (message.type) {
      case "button":
        this.publishButton(message);
        break;
      case "state":
        this.publishAttribute("state", message.state);
        break;
      case "telemetry":
        this.publishAttribute(message.key, message.value);
        break;
      case "tick":
        this.publishAttribute("heartbeat", { uptimeS: message.uptimeS, heapFree: message.heapFree });
        break;
    }
  }

  private handleHello(mac: string, fw: string): void {
    let node: string;
    try {
      node = macToNodeId(mac);
    } catch (error) {
      this.logger.warn("cdc hello with unusable mac", { mac, error: errorText(error) });
      return;
    }
    const known = this.nodeId === node;
    this.nodeId = node;
    this.logger.info("cdc device hello", { node, fw, fabricId: this.fabricId });
    this.sendAck();
    if (!known) {
      void this.subscribeDisplay(node);
    }
  }

  private sendAck(): void {
    if (!this.transport.isOpen()) return;
    this.writeMessage({ type: "ack", fabric: this.fabricId, instance: this.instanceId });
  }

  /**
   * The OMP-status source: pi-a2a's heartbeat plane (`agents.hb.>`), the
   * same traffic its own status bar counts. One entry per agent, refreshed
   * by every beat; `syncStatus` expires stale ones.
   */
  private async subscribeHeartbeats(): Promise<NatsSubscription | undefined> {
    try {
      return await this.nats.subscribe("agents.hb.>", (error, message) => {
        if (error) return;
        // Subject: agents.hb.<agent>.<owner>.<name> — the tail identifies the peer.
        this.hbSeen.set(message.subject, Date.now());
      });
    } catch (error) {
      this.logger.warn("cdc hb subscribe failed (status sync degraded)", { error: errorText(error) });
      return undefined;
    }
  }

  /** Push the OMP status line to the LCD when it changes (§ daily-use sync). */
  private syncStatus(): void {
    if (!this.started || !this.transport.isOpen()) return;
    const now = Date.now();
    for (const [agent, seenAt] of [...this.hbSeen]) {
      if (now - seenAt > this.heartbeatTtlMs) this.hbSeen.delete(agent);
    }
    const live = this.hbSeen.size;
    // Kid voice (operator ruling 2026-11-12, pet topology): friends = live agents.
    // The mockup's Home idle line renders the same words.
    const text = live > 0 ? `awake · ${live} friends` : "sleeping · plug me in";
    const amber = live === 0;
    if (text === this.lastStatusText && amber === this.lastStatusAmber) return;
    this.lastStatusText = text;
    this.lastStatusAmber = amber;
    this.writeMessage({ type: "render", zone: "status", id: `status-${++this.renderCounter}`, payload: { text, tone: amber ? "amber" : "green" } });
  }

  /** Test hook: run one status-sync pass immediately (timer paths are covered by lifecycle tests). */
  syncStatusForTest(): void {
    this.syncStatus();
  }

  private publishButton(message: CdcButtonMessage): void {
    const node = this.nodeId!;
    this.publish(
      eventSubject({ fabricId: this.fabricId, nodeId: node, endpointId: 1, cluster: "button", event: message.button }),
      encodeEventTelemetry({
        v: 1,
        type: "event",
        fabricId: this.fabricId,
        nodeId: node,
        endpointId: 1,
        cluster: "button",
        event: message.press === "short" ? "shortPress" : "longPress",
        data: { button: message.button },
        timestamp: Date.now(),
      }),
    );
  }

  private publishAttribute(attribute: string, value: JsonValue): void {
    const node = this.nodeId!;
    this.publish(
      telemetrySubject({ fabricId: this.fabricId, nodeId: node, endpointId: 1, cluster: "device", attribute }),
      encodeAttributeTelemetry({
        v: 1,
        type: "attribute",
        fabricId: this.fabricId,
        nodeId: node,
        endpointId: 1,
        cluster: "device",
        attribute,
        value,
        timestamp: Date.now(),
        source: "subscription",
      }),
    );
  }

  private publish(subject: string, data: Uint8Array): void {
    if (!this.nats.isConnected()) {
      this.logger.debug("cdc publish skipped: nats disconnected", { subject });
      return;
    }
    try {
      this.nats.publish(subject, data);
    } catch (error) {
      this.logger.warn("cdc publish failed", { subject, error: errorText(error) });
    }
  }

  // -------------------------------------------------------------------------
  // NATS → device (§5 table 2)
  // -------------------------------------------------------------------------

  private async subscribeDisplay(node: string): Promise<void> {
    if (this.subscription || !this.started) return;
    const subject = `iot.cmd.matter.${this.fabricId}.${node}.1.display.>`;
    try {
      // Deliberately NOT in the `vlink` queue group: the command router's
      // `iot.cmd.matter.>` wildcard already sits in that queue, and a queue
      // member receives each display message only probabilistically — the
      // router would win ~half of them and drop them. A plain subscription
      // is always delivered; the router sees its own copy and yields.
      this.subscription = await this.nats.subscribe(
        subject,
        (error, message) => this.handleDisplayMessage(error, message),
      );
      this.logger.info("cdc display subscription ready", { subject });
    } catch (error) {
      this.logger.warn("cdc display subscribe failed", { subject, error: errorText(error) });
    }
  }

  private handleDisplayMessage(error: Error | null, message: NatsMessage): void {
    if (error) {
      this.logger.error("cdc display subscription error", { error: error.message });
      return;
    }
    void this.handleDisplay(message).catch((handlerError: unknown) => {
      this.logger.error("cdc display handler failed", { subject: message.subject, error: errorText(handlerError) });
    });
  }

  private async handleDisplay(message: NatsMessage): Promise<void> {
    const startedAt = Date.now();
    const parsed = this.parseDisplaySubject(message.subject);
    if (!parsed.ok) {
      this.reply(message, displayResult(startedAt, { ok: false, error: { code: "SUBJECT_INVALID", message: parsed.error } }));
      return;
    }
    const action = parsed.action;
    const node = this.nodeId;

    if (message.reply === undefined) {
      this.logger.warn("cdc display command has no reply subject", { subject: message.subject });
      return;
    }

    let payload: CommandPayload;
    try {
      payload = parseCommandPayload(message.data);
    } catch (error) {
      this.reply(message, this.failureResult(startedAt, action, error, node));
      return;
    }
    if (payload.type !== "command") {
      this.reply(
        message,
        displayResult(startedAt, {
          ok: false,
          node,
          action,
          error: { code: "PAYLOAD_INVALID", message: `payload type "${payload.type}" does not match a display command` },
        }),
      );
      return;
    }
    const requestId = typeof payload.requestId === "string" ? payload.requestId : undefined;
    const args = payload.args ?? {};

    if (node === undefined || !this.transport.isOpen()) {
      this.reply(
        message,
        displayResult(startedAt, {
          ok: false,
          node,
          action,
          requestId,
          error: { code: "DEVICE_OFFLINE", message: "cdc device is not attached" },
        }),
      );
      return;
    }

    if (action === "notify") {
      const text = nonEmptyString(args.text);
      if (text === undefined) {
        this.reply(
          message,
          displayResult(startedAt, {
            ok: false,
            node,
            action,
            requestId,
            error: { code: "PAYLOAD_INVALID", message: "display notify requires args.text" },
          }),
        );
        return;
      }
      const name = nonEmptyString(args.name) ?? "notify";
      this.writeMessage({ type: "event", name, text });
      // §5: notify replies ok immediately — no echo round-trip.
      this.reply(message, displayResult(startedAt, { ok: true, node, action, requestId }));
      return;
    }

    const zonePayload = this.zonePayload(action, args);
    if (typeof zonePayload === "string") {
      this.reply(
        message,
        displayResult(startedAt, { ok: false, node, action, requestId, error: { code: "PAYLOAD_INVALID", message: zonePayload } }),
      );
      return;
    }

    const renderId = `render-${++this.renderCounter}`;
    this.writeMessage({ type: "render", zone: action, id: renderId, payload: zonePayload });
    const result = await this.awaitEcho(renderId, startedAt, node, action, requestId);
    this.reply(message, result);
  }

  /** `iot.cmd.matter.<fabric>.<node>.1.display.<action>` → the action token. */
  private parseDisplaySubject(subject: string): ParsedDisplaySubject {
    const tokens = subject.split(".");
    if (tokens.length !== 8) {
      return { ok: false, error: `display subject must have 8 tokens: ${subject}` };
    }
    const [iot, cmd, matter, fabric, , endpoint, cluster, action] = tokens;
    if (iot !== "iot" || cmd !== "cmd" || matter !== "matter") {
      return { ok: false, error: `not a matter command subject: ${subject}` };
    }
    if (fabric !== this.fabricId) {
      return { ok: false, error: `subject fabric ${fabric} does not match configured fabric ${this.fabricId}` };
    }
    if (endpoint !== "1") {
      return { ok: false, error: `display endpoint must be 1: ${subject}` };
    }
    if (cluster !== "display") {
      return { ok: false, error: `cluster must be display: ${subject}` };
    }
    if (!(DISPLAY_ACTIONS as readonly string[]).includes(action)) {
      return { ok: false, error: `unknown display action: ${action}` };
    }
    return { ok: true, action: action as DisplayAction };
  }

  /** Build the §4 zone payload from command args; a string is an error. */
  private zonePayload(zone: RenderZone, args: JsonObject): CdcZonePayload | string {
    switch (zone) {
      case "status": {
        const text = nonEmptyString(args.text);
        if (text === undefined) return "display status requires args.text";
        const tone = args.tone;
        if (tone !== "green" && tone !== "amber") return "display status requires args.tone green|amber";
        return { text, tone };
      }
      case "ticker": {
        const text = nonEmptyString(args.text);
        if (text === undefined) return "display ticker requires args.text";
        return { text };
      }
      case "activity": {
        const fraction = args.fraction;
        if (typeof fraction !== "number" || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
          return "display activity requires args.fraction in [0, 1]";
        }
        const tone = args.tone;
        if (tone !== undefined && tone !== "green" && tone !== "amber") {
          return "display activity args.tone must be green|amber";
        }
        return tone === undefined ? { fraction } : { fraction, tone };
      }
    }
  }

  /** Register the echo wait; resolves ok on `echo`, `DEVICE_TIMEOUT` after 2 s. */
  private awaitEcho(
    renderId: string,
    startedAt: number,
    node: string,
    action: DisplayAction,
    requestId: string | undefined,
  ): Promise<CommandResult> {
    const { promise, resolve } = Promise.withResolvers<CommandResult>();
    const timer = setTimeout(() => {
      this.pending.delete(renderId);
      resolve(deviceTimeout(startedAt, node, action, requestId, `device did not echo render ${renderId} within ${this.echoTimeoutMs}ms`));
    }, this.echoTimeoutMs);
    timer.unref?.();
    this.pending.set(renderId, { startedAt, node, action, requestId, resolve, timer });
    return promise;
  }

  private handleEcho(renderId: string): void {
    const entry = this.pending.get(renderId);
    if (entry === undefined) {
      this.logger.debug("cdc echo with no pending render", { id: renderId });
      return;
    }
    clearTimeout(entry.timer);
    this.pending.delete(renderId);
    entry.resolve(displayResult(entry.startedAt, { ok: true, node: entry.node, action: entry.action, requestId: entry.requestId }));
  }

  private failureResult(
    startedAt: number,
    action: DisplayAction,
    error: unknown,
    node: string | undefined,
    requestId?: string,
  ): CommandResult {
    const linkError = asVLinkError(error);
    return displayResult(startedAt, { ok: false, node, action, requestId, error: toErrorPayload(linkError) });
  }

  private reply(message: NatsMessage, result: CommandResult): void {
    if (message.reply === undefined) return;
    try {
      this.nats.publish(message.reply, encodeCommandResult(result));
    } catch (error) {
      this.logger.error("cdc reply publish failed", { reply: message.reply, error: errorText(error) });
    }
  }

  private writeMessage(message: CdcHostMessage): void {
    try {
      this.transport.writeLine(serializeCdcMessage(message));
    } catch (error) {
      this.logger.warn("cdc write failed", { type: message.type, error: errorText(error) });
    }
  }
}
