/**
 * Standalone VLink bridge process: Matter + NATS, no OMP dependency.
 *
 *   bun run src/sidecar.ts
 *
 * The sidecar owns the health interval; the OMP extension does not import this
 * module and keeps its own `ctx.setInterval` timer.
 */
import { loadConfig } from "./config.ts";
import { createLogger } from "./logger.ts";
import { VLinkRuntime } from "./runtime.ts";
import type { VLinkConfig } from "./types.ts";

const SHUTDOWN_GRACE_MS = 5_000;

function loadConfigOrExit(): VLinkConfig {
  try {
    return loadConfig();
  } catch (error) {
    console.error(
      "VLink configuration is invalid:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

const config = loadConfigOrExit();
const logger = createLogger(config.logLevel);
const runtime = new VLinkRuntime(config, logger);

let healthTimer: Timer | undefined;
let stopping = false;

function logHealth(reason: string): void {
  const health = runtime.health();
  logger.info(`vlink health (${reason})`, { ...health });
}

async function stopAndExit(code: number, reason: string): Promise<void> {
  if (stopping) return;
  stopping = true;

  if (healthTimer) {
    clearInterval(healthTimer);
    healthTimer = undefined;
  }

  logger.info("vlink sidecar stopping", { reason });
  const { promise: timeout, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, SHUTDOWN_GRACE_MS);
  timer.unref?.();
  await Promise.race([runtime.stop().catch(() => undefined), timeout]);
  process.exit(code);
}

async function main(): Promise<void> {
  logger.info("vlink sidecar starting", {
    natsUrl: config.natsUrl,
    matterMode: config.matterMode,
    instanceId: config.instanceId,
  });

  await runtime.start();
  logHealth("startup");
  runtime.publishHealth();

  if (config.healthIntervalMs > 0) {
    healthTimer = setInterval(() => {
      logHealth("interval");
      runtime.publishHealth();
    }, config.healthIntervalMs);
    healthTimer.unref?.();
  }
}

process.on("SIGINT", () => {
  void stopAndExit(0, "SIGINT");
});
process.on("SIGTERM", () => {
  void stopAndExit(0, "SIGTERM");
});

main().catch((error: unknown) => {
  logger.error("vlink sidecar failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
