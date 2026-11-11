/**
 * Development bridge without hardware: simulator Matter adapter + the shared
 * local NATS server (or none, in which case health shows degraded).
 *
 *   bun run dev:sim
 */
import { loadConfig } from "../src/config.ts";
import { VLinkRuntime } from "../src/runtime.ts";

const config = loadConfig({
  matterMode: "sim",
  bleEnabled: false,
  natsUrl: process.env.VLINK_NATS_URL?.trim() || "nats://127.0.0.1:14222",
});

const runtime = new VLinkRuntime(config);
let keepAlive: Timer | undefined;
let stopping = false;

function printHealth(reason: string): void {
  const health = runtime.health();
  console.log(JSON.stringify({ event: "vlink.sim.health", reason, ...health }, null, 2));
}

async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  if (keepAlive) {
    clearInterval(keepAlive);
    keepAlive = undefined;
  }
  await runtime.stop();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

try {
  await runtime.start();
  printHealth("startup");
  runtime.publishHealth();

  if (runtime.status().state !== "ready") {
    console.error(
      "VLink simulator is degraded; check the NATS URL/token and the lastError above.",
    );
  }

  const interval = Math.max(config.healthIntervalMs, 5_000);
  keepAlive = setInterval(() => {
    runtime.publishHealth();
    printHealth("interval");
  }, interval);
} catch (error) {
  console.error("VLink simulator failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
