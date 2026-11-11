/**
 * NATS command router.
 *
 * One subscription on `iot.cmd.matter.>` (queue group `vlink`) dispatches both
 * device commands and bridge operations. Every message with a reply subject
 * receives a `CommandResult`, including malformed input; nothing throws into
 * the nats.js callback and the process never crashes on bad payloads. The one
 * exception is the `display` cluster: those subjects are owned by the CDC
 * bridge and deliberately left unanswered here.
 */

import { asVLinkError, toErrorPayload } from "../errors.ts";
import { encodeCommandResult, parseCommandPayload } from "../payloads.ts";
import { COMMAND_WILDCARD, lowerCamel, parseCommandSubject } from "../subjects.ts";
import type {
  BridgeCommandPayload,
  BridgeOperations,
  CommandResult,
  DeviceCommandPayload,
  JsonValue,
  Logger,
  MatterAdapter,
  MatterCommandResult,
  MatterDiscoverRequest,
  MatterDiscoveredDevice,
  MatterNodeInfo,
  ParsedCommandSubject,
  VLinkErrorPayload,
  NatsMessage,
  NatsSubscription,
  NatsTransport,
} from "../types.ts";

const DEFAULT_COMMAND_TIMEOUT_MS = 5_000;
const DEFAULT_COMMISSION_TIMEOUT_MS = 120_000;
const DEFAULT_DISCOVER_TIMEOUT_MS = 30_000;

export interface CommandRouterOptions {
  transport: NatsTransport;
  matter: MatterAdapter;
  bridge: BridgeOperations;
  fabricId: string;
  logger: Logger;
  /** Queue group for the command subscription. */
  queue?: string;
  /** True when the CDC display bridge is active — display commands have an owner. */
  hasCdcDisplay?: () => boolean;
  defaultTimeoutMs?: number;
}

class RouterTimeoutError extends Error {
  readonly code = "COMMAND_TIMEOUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "RouterTimeoutError";
  }
}

class RouterStoppedError extends Error {
  readonly code = "INTERNAL_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "RouterStoppedError";
  }
}

interface InFlightGuard {
  cancel(error: Error): void;
}

type ResultFields = Partial<Omit<CommandResult, "v" | "startedAt" | "completedAt" | "durationMs">>;

export class CommandRouter {
  private readonly transport: NatsTransport;
  private readonly matter: MatterAdapter;
  private readonly bridge: BridgeOperations;
  private readonly fabricId: string;
  private readonly logger: Logger;
  private readonly queue: string | undefined;
  private readonly defaultTimeoutMs: number;
  private readonly hasCdcDisplay: (() => boolean) | undefined;
  private readonly inFlight = new Set<InFlightGuard>();
  private subscription: NatsSubscription | undefined;

  constructor(options: CommandRouterOptions) {
    this.transport = options.transport;
    this.matter = options.matter;
    this.bridge = options.bridge;
    this.fabricId = options.fabricId;
    this.logger = options.logger;
    this.queue = options.queue && options.queue.length > 0 ? options.queue : undefined;
    this.defaultTimeoutMs =
      options.defaultTimeoutMs && options.defaultTimeoutMs > 0
        ? options.defaultTimeoutMs
        : DEFAULT_COMMAND_TIMEOUT_MS;
    this.hasCdcDisplay = options.hasCdcDisplay;
  }

  async start(): Promise<void> {
    if (this.subscription) {
      return;
    }
    this.subscription = await this.transport.subscribe(
      COMMAND_WILDCARD,
      (error, message) => this.handleMessage(error, message),
      this.queue ? { queue: this.queue } : undefined,
    );
  }

  async stop(): Promise<void> {
    const subscription = this.subscription;
    this.subscription = undefined;
    if (subscription) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        this.logger.debug("command router unsubscribe failed", { error: this.errorText(error) });
      }
    }
    // Settle every pending timeout guard so no timer keeps the process alive
    // and no callback waits forever after shutdown.
    for (const guard of [...this.inFlight]) {
      guard.cancel(new RouterStoppedError("command router stopped"));
    }
    this.inFlight.clear();
  }

  private handleMessage(error: Error | null, message: NatsMessage): void {
    if (error) {
      this.logger.error("command subscription error", { error: error.message });
      return;
    }
    void this.handleCommand(message).catch((handlerError: unknown) => {
      // Last-resort guard: never let a rejection escape into nats.js.
      this.logger.error("command handler failed", {
        subject: message.subject,
        error: this.errorText(handlerError),
      });
    });
  }

  private async handleCommand(message: NatsMessage): Promise<void> {
    const startedAt = Date.now();
    let result: CommandResult | undefined;
    try {
      result = await this.dispatch(message, startedAt);
    } catch (error) {
      result = this.failure(startedAt, error);
    }

    if (!result) {
      // The display cluster is owned by the CDC bridge; no reply from here.
      return;
    }

    if (!message.reply) {
      this.logger.warn("command has no reply subject", { subject: message.subject });
      return;
    }
    try {
      this.transport.publish(message.reply, encodeCommandResult(result));
    } catch (error) {
      this.logger.error("failed to publish command reply", {
        subject: message.subject,
        reply: message.reply,
        error: this.errorText(error),
      });
    }
  }

  private async dispatch(message: NatsMessage, startedAt: number): Promise<CommandResult | undefined> {
    let subject: ParsedCommandSubject;
    try {
      subject = parseCommandSubject(message.subject);
    } catch (error) {
      return this.failure(startedAt, error);
    }

    if (subject.kind === "device" && lowerCamel(subject.cluster) === "display") {
      // Display commands belong to the CDC bridge (docs/CDC_PROTOCOL.md §5),
      // which holds its own always-delivered subscription on display.>. When
      // the bridge is active it replies with the echo-gated ok; when it is
      // not, answer with a structured error instead of dropping the request.
      if (this.hasCdcDisplay?.()) {
        this.logger.debug("display command left to the cdc bridge", { subject: message.subject });
        return;
      }
      return this.invalid(
        startedAt,
        "display commands need a VLink device on USB (CDC bridge not active)",
        { cluster: "display" },
      );
    }

    if (subject.fabricId !== this.fabricId) {
      return this.invalid(
        startedAt,
        `subject fabric ${subject.fabricId} does not match configured fabric ${this.fabricId}`,
        { field: "fabricId", subject: subject.fabricId, configured: this.fabricId },
      );
    }

    let payload: DeviceCommandPayload | BridgeCommandPayload;
    try {
      payload = parseCommandPayload(message.data);
    } catch (error) {
      return this.failure(startedAt, error);
    }

    if (payload.type === "command") {
      if (subject.kind !== "device") {
        return this.invalid(startedAt, `payload type "command" does not match bridge subject ${message.subject}`, {
          subject: message.subject,
          type: payload.type,
        });
      }
      return this.dispatchDevice(subject, payload, startedAt);
    }

    if (subject.kind !== "bridge") {
      return this.invalid(startedAt, `payload type "bridge" does not match device subject ${message.subject}`, {
        subject: message.subject,
        type: payload.type,
      });
    }
    if (subject.action !== payload.action) {
      return this.invalid(startedAt, `subject action ${subject.action} does not match payload action ${payload.action}`, {
        field: "action",
        subject: subject.action,
        payload: payload.action,
      });
    }
    return this.dispatchBridge(subject.action, payload, startedAt);
  }

  private async dispatchDevice(
    subject: Extract<ParsedCommandSubject, { kind: "device" }>,
    payload: DeviceCommandPayload,
    startedAt: number,
  ): Promise<CommandResult> {
    if (payload.fabricId !== undefined && payload.fabricId !== subject.fabricId) {
      return this.invalid(startedAt, `payload fabricId ${payload.fabricId} does not match subject fabric ${subject.fabricId}`, {
        field: "fabricId",
        subject: subject.fabricId,
        payload: payload.fabricId,
      });
    }
    const mismatches: Array<[string, string | number, string | number]> = [
      ["nodeId", subject.nodeId, payload.nodeId],
      ["endpointId", subject.endpointId, payload.endpointId],
      ["cluster", lowerCamel(subject.cluster), lowerCamel(payload.cluster)],
      ["command", lowerCamel(subject.command), lowerCamel(payload.command)],
    ];
    for (const [field, fromSubject, fromPayload] of mismatches) {
      if (fromSubject !== fromPayload) {
        return this.invalid(
          startedAt,
          `payload ${field} ${String(fromPayload)} does not match subject ${field} ${String(fromSubject)}`,
          { field, subject: fromSubject, payload: fromPayload },
        );
      }
    }

    const timeoutMs = payload.timeoutMs ?? this.defaultTimeoutMs;
    const cluster = lowerCamel(subject.cluster);
    const command = lowerCamel(subject.command);
    const fields: ResultFields = {
      nodeId: subject.nodeId,
      endpointId: subject.endpointId,
      cluster,
      command,
      ...(payload.requestId ? { requestId: payload.requestId } : {}),
    };

    let outcome: MatterCommandResult;
    try {
      outcome = await this.withTimeout(
        this.matter.invokeCommand({
          fabricId: subject.fabricId,
          nodeId: subject.nodeId,
          endpointId: subject.endpointId,
          cluster,
          command,
          ...(payload.args !== undefined ? { args: payload.args } : {}),
          timeoutMs,
        }),
        timeoutMs,
        `command ${cluster}.${command} on ${subject.nodeId}`,
      );
    } catch (error) {
      return this.failure(startedAt, error, fields);
    }

    if (!outcome.ok) {
      return this.result(startedAt, {
        ok: false,
        ...fields,
        error:
          outcome.error ??
          ({
            code: "MATTER_COMMAND_FAILED",
            message: `Matter command ${cluster}.${command} failed`,
          } satisfies VLinkErrorPayload),
      });
    }
    return this.result(startedAt, {
      ok: true,
      ...fields,
      ...(outcome.data !== undefined ? { data: outcome.data } : {}),
    });
  }

  private async dispatchBridge(
    action: BridgeCommandPayload["action"],
    payload: BridgeCommandPayload,
    startedAt: number,
  ): Promise<CommandResult> {
    const fields: ResultFields = {
      action,
      ...(payload.requestId ? { requestId: payload.requestId } : {}),
    };
    const timeoutMs =
      payload.timeoutMs ??
      (action === "commission"
        ? DEFAULT_COMMISSION_TIMEOUT_MS
        : action === "discover"
          ? DEFAULT_DISCOVER_TIMEOUT_MS
          : this.defaultTimeoutMs);

    try {
      switch (action) {
        case "status": {
          const health = this.bridge.health();
          return this.result(startedAt, { ok: true, ...fields, data: health });
        }
        case "list": {
          const nodes: MatterNodeInfo[] = await this.withTimeout(
            this.bridge.listNodes(),
            timeoutMs,
            "bridge list",
          );
          return this.result(startedAt, { ok: true, ...fields, data: nodes });
        }
        case "discover": {
          const request: MatterDiscoverRequest = { timeoutMs };
          if (payload.transport === "ip") {
            request.transport = "ip";
          } else if (payload.transport !== undefined) {
            request.transport = "ble";
          }
          const devices: MatterDiscoveredDevice[] = await this.withTimeout(
            this.bridge.discover(request),
            timeoutMs,
            "bridge discover",
          );
          return this.result(startedAt, { ok: true, ...fields, data: devices });
        }
        case "commission": {
          const transport =
            payload.transport ?? (payload.thread ? "ble-thread" : payload.wifi ? "ble-wifi" : "ip");
          const node: MatterNodeInfo = await this.withTimeout(
            this.bridge.commission({
              ...(payload.pairingCode !== undefined ? { pairingCode: payload.pairingCode } : {}),
              ...(payload.passcode !== undefined ? { passcode: payload.passcode } : {}),
              ...(payload.discriminator !== undefined ? { discriminator: payload.discriminator } : {}),
              transport,
              ...(payload.wifi !== undefined ? { wifi: payload.wifi } : {}),
              ...(payload.thread !== undefined ? { thread: payload.thread } : {}),
              ...(payload.nodeId !== undefined ? { nodeId: payload.nodeId } : {}),
              ...(payload.nodeName !== undefined ? { nodeName: payload.nodeName } : {}),
              timeoutMs,
            }),
            timeoutMs,
            "bridge commission",
          );
          return this.result(startedAt, { ok: true, ...fields, data: node });
        }
        case "decommission": {
          if (payload.nodeId === undefined) {
            return this.invalid(startedAt, "bridge decommission requires nodeId", { action });
          }
          const nodeId = payload.nodeId;
          await this.withTimeout(
            this.bridge.decommission({
              fabricId: this.fabricId,
              nodeId,
              force: payload.force ?? false,
            }),
            timeoutMs,
            `bridge decommission ${nodeId}`,
          );
          return this.result(startedAt, {
            ok: true,
            ...fields,
            nodeId,
            data: { nodeId, decommissioned: true },
          });
        }
        case "read": {
          const path = this.requirePath(payload);
          if (!path) {
            return this.invalid(startedAt, "bridge read requires nodeId, endpointId, cluster, attribute", { action });
          }
          const value = await this.withTimeout(
            this.bridge.read({ ...path, fabricId: this.fabricId, timeoutMs }),
            timeoutMs,
            `bridge read ${path.cluster}.${path.attribute}`,
          );
          return this.result(startedAt, {
            ok: true,
            ...fields,
            nodeId: path.nodeId,
            endpointId: path.endpointId,
            cluster: path.cluster,
            data: value,
          });
        }
        case "write": {
          const path = this.requirePath(payload);
          if (!path) {
            return this.invalid(startedAt, "bridge write requires nodeId, endpointId, cluster, attribute", { action });
          }
          if (payload.value === undefined) {
            return this.invalid(startedAt, "bridge write requires value", { action });
          }
          const value: JsonValue = payload.value;
          const written = await this.withTimeout(
            this.bridge.write({ ...path, fabricId: this.fabricId, value, timeoutMs }),
            timeoutMs,
            `bridge write ${path.cluster}.${path.attribute}`,
          );
          return this.result(startedAt, {
            ok: true,
            ...fields,
            nodeId: path.nodeId,
            endpointId: path.endpointId,
            cluster: path.cluster,
            data: written,
          });
        }
        default: {
          return this.invalid(startedAt, `unsupported bridge action: ${String(action)}`, { action });
        }
      }
    } catch (error) {
      return this.failure(startedAt, error, fields);
    }
  }

  private requirePath(
    payload: BridgeCommandPayload,
  ): { nodeId: string; endpointId: number; cluster: string; attribute: string } | undefined {
    if (
      payload.nodeId === undefined ||
      payload.endpointId === undefined ||
      payload.cluster === undefined ||
      payload.attribute === undefined
    ) {
      return undefined;
    }
    return {
      nodeId: payload.nodeId,
      endpointId: payload.endpointId,
      cluster: lowerCamel(payload.cluster),
      attribute: lowerCamel(payload.attribute),
    };
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number, what: string): Promise<T> {
    let rejectGuard: (reason: Error) => void = () => {};
    const guard = new Promise<never>((_resolve, reject) => {
      rejectGuard = reject;
    });
    const timer = setTimeout(
      () => rejectGuard(new RouterTimeoutError(`${what} timed out after ${timeoutMs}ms`)),
      Math.max(1, timeoutMs),
    );
    const entry: InFlightGuard = {
      cancel: (error) => {
        // Stop must not leave a live timer behind even if the racing dispatch
        // has not resumed yet.
        clearTimeout(timer);
        rejectGuard(error);
      },
    };
    this.inFlight.add(entry);
    try {
      return await Promise.race([operation, guard]);
    } finally {
      this.inFlight.delete(entry);
      clearTimeout(timer);
    }
  }

  private result(startedAt: number, fields: ResultFields & { ok: boolean }): CommandResult {
    const completedAt = Date.now();
    return {
      v: 1,
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
      ...fields,
    };
  }

  private failure(startedAt: number, error: unknown, fields: ResultFields = {}): CommandResult {
    if (error instanceof RouterTimeoutError) {
      return this.result(startedAt, {
        ok: false,
        ...fields,
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof RouterStoppedError) {
      return this.result(startedAt, {
        ok: false,
        ...fields,
        error: { code: error.code, message: error.message },
      });
    }
    const linkError = asVLinkError(error);
    return this.result(startedAt, {
      ok: false,
      ...fields,
      error: toErrorPayload(linkError),
    });
  }

  private invalid(startedAt: number, message: string, details?: JsonValue): CommandResult {
    return this.result(startedAt, {
      ok: false,
      error: { code: "PAYLOAD_INVALID", message, ...(details !== undefined ? { details } : {}) },
    });
  }

  private errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
