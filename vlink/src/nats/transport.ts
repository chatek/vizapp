/**
 * NATS transport over `@nats-io/transport-node`.
 *
 * VLink never starts a broker: it dials the local server that `pi-a2a` already
 * runs and reuses that server's token. This module is the only place that
 * touches nats.js, which keeps the rest of the bridge testable with a fake.
 */

import {
  connect,
  errors,
  type Msg,
  type NatsConnection,
  type NodeConnectionOptions,
  type Status,
  type Subscription,
} from "@nats-io/transport-node";

import { readNatsToken } from "../config.ts";
import type {
  Logger,
  NatsMessage,
  NatsStatus,
  NatsSubscription,
  NatsTransport,
  VLinkConfig,
} from "../types.ts";

/** Authentication was rejected by the server (wrong/absent token). */
export class NatsAuthError extends Error {
  readonly code = "NATS_AUTH_FAILED" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NatsAuthError";
  }
}

/** The transport has no live connection, so the operation cannot be attempted. */
export class NatsNotConnectedError extends Error {
  readonly code = "NATS_NOT_CONNECTED" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NatsNotConnectedError";
  }
}

type StatusListener = (status: NatsStatus, error?: Error) => void;

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/** Never let userinfo credentials (or an inline token) reach a log line. */
function redactUrl(url: string): string {
  return url.replace(/\/\/[^@/]*@/, "//***@");
}

function isAuthFailure(error: unknown): boolean {
  if (error instanceof errors.AuthorizationError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /authorization violation|authentication (?:expired|timeout)|bad authentication/i.test(message);
}

function mapStatus(status: Status): NatsStatus | undefined {
  switch (status.type) {
    case "disconnect":
      return "disconnected";
    case "reconnecting":
      return "reconnecting";
    case "reconnect":
      return "connected";
    case "error":
      return "error";
    case "close":
      return "closed";
    default:
      return undefined;
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return false;
  }
  return "then" in value && typeof value.then === "function";
}

export class NodeNatsTransport implements NatsTransport {
  private readonly config: VLinkConfig;
  private readonly logger: Logger;
  private readonly listeners = new Set<StatusListener>();
  private readonly subscriptions = new Set<Subscription>();
  private connection: NatsConnection | undefined;
  private connectPromise: Promise<void> | undefined;
  private shuttingDown = false;
  private linkUp = false;

  constructor(config: VLinkConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  get url(): string {
    return this.config.natsUrl;
  }

  isConnected(): boolean {
    // `isClosed()` stays false while nats.js is reconnecting; the status pump
    // owns the real link state so callers do not publish into a dead link.
    return this.connection !== undefined && this.linkUp && !this.connection.isClosed();
  }

  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = undefined;
    });
    return this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    this.shuttingDown = false;
    const token = readNatsToken(this.config);
    const options: NodeConnectionOptions = {
      servers: [this.config.natsUrl],
      name: this.config.natsName,
      reconnect: true,
      waitOnFirstConnect: false,
      reconnectTimeWait: this.config.reconnectWaitMs,
      // Keep trying forever: the bridge is a long-lived local service.
      maxReconnectAttempts: -1,
      ...(token ? { token } : {}),
    };

    let connection: NatsConnection;
    try {
      connection = await connect(options);
    } catch (error) {
      if (isAuthFailure(error)) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error("nats authentication failed", { url: redactUrl(this.config.natsUrl) });
        throw new NatsAuthError(`NATS authentication failed: ${message}`, { cause: error });
      }
      throw toError(error);
    }

    if (this.shuttingDown) {
      await connection.close();
      return;
    }

    this.connection = connection;
    this.linkUp = true;
    // nats.js re-creates subscriptions itself on reconnect, so the status pump
    // only has to translate its status stream for callers.
    void this.pumpStatus(connection);
    this.emitStatus("connected");
    this.logger.info("nats connected", { url: redactUrl(this.config.natsUrl), name: this.config.natsName });
  }

  private async pumpStatus(connection: NatsConnection): Promise<void> {
    try {
      for await (const status of connection.status()) {
        if (this.connection !== connection) {
          break;
        }
        const mapped = mapStatus(status);
        if (!mapped) {
          continue;
        }
        if (status.type === "error") {
          this.emitStatus("error", status.error);
          continue;
        }
        if (mapped === "connected") {
          this.linkUp = true;
        } else if (mapped === "disconnected" || mapped === "reconnecting" || mapped === "closed") {
          this.linkUp = false;
        }
        this.emitStatus(mapped);
        if (mapped === "closed") {
          break;
        }
      }
    } catch (error) {
      if (this.connection === connection) {
        this.emitStatus("error", toError(error));
      }
    }
  }

  private emitStatus(status: NatsStatus, error?: Error): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(status, error);
      } catch (listenerError) {
        this.logger.error("nats status listener threw", { error: toError(listenerError).message });
      }
    }
    if (status === "disconnected" || status === "reconnecting") {
      this.logger.debug("nats link down", { status });
    }
  }

  publish(subject: string, data: Uint8Array, options?: { reply?: string }): void {
    const connection = this.requireConnection();
    try {
      connection.publish(subject, data, options?.reply ? { reply: options.reply } : undefined);
    } catch (error) {
      throw toError(error);
    }
  }

  async subscribe(
    subject: string,
    handler: (error: Error | null, message: NatsMessage) => void,
    options?: { queue?: string },
  ): Promise<NatsSubscription> {
    const connection = this.requireConnection();
    let subscription: Subscription;
    try {
      subscription = connection.subscribe(subject, {
        ...(options?.queue ? { queue: options.queue } : {}),
        callback: (error: Error | null, msg: Msg) => {
          if (error) {
            this.logger.error("nats subscription error", { subject, error: error.message });
            try {
              handler(error, { subject, data: new Uint8Array() });
            } catch (handlerError) {
              this.logger.error("nats message handler threw", {
                subject,
                error: toError(handlerError).message,
              });
            }
            return;
          }
          const message: NatsMessage = msg.reply
            ? { subject: msg.subject, data: msg.data, reply: msg.reply }
            : { subject: msg.subject, data: msg.data };
          try {
            const result: unknown = handler(null, message);
            if (isPromiseLike(result)) {
              void Promise.resolve(result).catch((handlerError: unknown) => {
                this.logger.error("nats message handler rejected", {
                  subject: msg.subject,
                  error: toError(handlerError).message,
                });
              });
            }
          } catch (handlerError) {
            this.logger.error("nats message handler threw", {
              subject: msg.subject,
              error: toError(handlerError).message,
            });
          }
        },
      });
    } catch (error) {
      throw toError(error);
    }

    this.subscriptions.add(subscription);
    return {
      unsubscribe: () => {
        if (!this.subscriptions.delete(subscription)) {
          return;
        }
        try {
          subscription.unsubscribe();
        } catch (error) {
          this.logger.debug("nats unsubscribe failed", { subject, error: toError(error).message });
        }
      },
    };
  }

  async flush(): Promise<void> {
    const connection = this.requireConnection();
    try {
      await connection.flush();
    } catch (error) {
      throw toError(error);
    }
  }

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async close(): Promise<void> {
    const connection = this.connection;
    if (connection && !connection.isClosed()) {
      this.emitStatus("closed");
    }
    this.shuttingDown = true;
    this.linkUp = false;
    this.connection = undefined;
    // No handler may fire after close: drop listeners before tearing down.
    this.listeners.clear();
    for (const subscription of this.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch {
        // Connection teardown below also closes them.
      }
    }
    this.subscriptions.clear();

    if (connection && !connection.isClosed()) {
      try {
        await connection.close();
      } catch (error) {
        this.logger.debug("nats close failed", { error: toError(error).message });
      }
    }
  }

  private requireConnection(): NatsConnection {
    if (!this.connection || this.connection.isClosed()) {
      throw new NatsNotConnectedError(`NATS transport is not connected (${redactUrl(this.config.natsUrl)})`);
    }
    return this.connection;
  }
}
