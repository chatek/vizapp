/**
 * OMP extension entry point.
 *
 * Loading the module registers tools and commands only. Matter/NATS work starts
 * on `session_start` for the main agent, non-blocking, and is stopped on
 * `session_shutdown` with a bounded grace period. Subagent sessions share the
 * parent process and must not create a second Matter controller.
 */
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { loadConfig } from "./config.ts";
import type { Logger } from "./logger.ts";
import { VLinkRuntime } from "./runtime.ts";
import { registerVLinkCommands } from "./omp/commands.ts";
import { registerVLinkTools } from "./omp/tools.ts";

let runtime: VLinkRuntime | undefined;
let healthTimer: Timer | undefined;
let eventUnsubscribe: (() => void) | undefined;

type OmpLogMethod = (message: string, fields?: Record<string, unknown>) => void;
interface OmpLoggerSink {
  debug: OmpLogMethod;
  info: OmpLogMethod;
  warn: OmpLogMethod;
  error: OmpLogMethod;
}

/** Adapt VLink's structured logger onto `pi.logger`, never throwing. */
export function createOmpLogger(pi: ExtensionAPI): Logger {
  const sink = pi.logger as unknown as OmpLoggerSink;

  const make = (bound: Record<string, unknown>): Logger => {
    const write = (level: keyof OmpLoggerSink) => (message: string, fields?: Record<string, unknown>) => {
      try {
        sink[level](`vlink: ${message}`, { ...bound, ...fields });
      } catch {
        // OMP's logger is best-effort; a logging failure must not break the bridge.
      }
    };
    return {
      debug: write("debug"),
      info: write("info"),
      warn: write("warn"),
      error: write("error"),
      child: (fields) => make({ ...bound, ...fields }),
    };
  };

  return make({});
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, Math.max(0, ms));
  timer.unref?.();
  return promise;
}

function armHealthTimer(ctx: ExtensionContext, current: VLinkRuntime, intervalMs: number): void {
  if (healthTimer) ctx.clearTimer(healthTimer);
  healthTimer = undefined;
  if (intervalMs > 0) {
    healthTimer = ctx.setInterval(() => {
      current.publishHealth();
    }, intervalMs);
  }
}

export default function vlinkPlugin(pi: ExtensionAPI): void {
  registerVLinkTools(pi, () => runtime);
  registerVLinkCommands(pi, () => runtime);

  pi.on("session_start", (_event, ctx) => {
    if (ctx.agent.kind !== "main") return;
    if (runtime) return;

    let logger: Logger;
    try {
      logger = createOmpLogger(pi);
    } catch {
      return;
    }

    // Sidecar mode is not wired yet. Say so and keep the in-process bridge so an
    // operator never believes they are talking to a separate process.
    if (process.env.VLINK_MODE === "sidecar") {
      logger.warn("VLINK_MODE=sidecar is not wired yet; running the in-process bridge");
    }

    let config;
    try {
      config = loadConfig();
    } catch (error) {
      logger.error("vlink config failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const current = new VLinkRuntime(config, logger);
    runtime = current;
    armHealthTimer(ctx, current, config.healthIntervalMs);

    // Matter/BLE startup can take seconds; never block session_start.
    void current
      .start()
      .then(() => {
        if (runtime !== current) return;
        current.publishHealth();
        logger.info("vlink session ready", { state: current.status().state });

        if (config.notifyEvents) {
          eventUnsubscribe?.();
          eventUnsubscribe = current.getMatter()?.onEvent((event) => {
            try {
              pi.sendMessage(
                {
                  customType: "vlink-event",
                  content: `[vlink] ${event.nodeId} ${event.cluster}.${event.event}`,
                  display: true,
                  attribution: "agent",
                },
                { deliverAs: "nextTurn", triggerTurn: false },
              );
            } catch {
              // Notification rendering is best-effort; the NATS event still published.
            }
          });
        }
      })
      .catch((error: unknown) => {
        logger.error("vlink start failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    const current = runtime;
    runtime = undefined;

    if (healthTimer) {
      try {
        ctx.clearTimer(healthTimer);
      } catch {
        // Timer may already have been cleared by the host.
      }
      healthTimer = undefined;
    }

    eventUnsubscribe?.();
    eventUnsubscribe = undefined;

    if (!current) return;

    await Promise.race([
      current.stop().catch(() => undefined),
      delay(1_500),
    ]);
  });
}
