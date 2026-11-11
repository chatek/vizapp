import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../src/config.ts";
import { createLogger } from "../../src/logger.ts";
import { MatterJsAdapter } from "../../src/matter/matter-js.ts";

const enabled = process.env.VLINK_MATTER_SMOKE === "1";
const storage = await mkdtemp(join(tmpdir(), "vlink-matter-smoke-"));

afterAll(async () => {
  await rm(storage, { recursive: true, force: true });
});

test.skipIf(!enabled)(
  "Matter.js controller starts, reports a fabric, and stops cleanly (VLINK_MATTER_SMOKE=1)",
  async () => {
    const main = await import("@matter/main");
    expect(typeof main.ServerNode).toBe("function");
    expect(typeof main.ControllerBehavior).toBe("function");

    const config = loadConfig({
      matterMode: "matter",
      matterStorage: storage,
      fabricLabel: "VLink-Smoke",
      bleEnabled: process.env.VLINK_BLE_ENABLED === "1",
    });
    const logger = createLogger("debug", () => {});
    const adapter = new MatterJsAdapter(config, logger);

    try {
      await adapter.start();
      const status = adapter.status();
      expect(status.ready).toBe(true);
      expect(status.fabricId).toMatch(/^fabric-[0-9a-f]{16}$/);
      expect(status.nodeCount).toBe(0);
      expect(typeof status.bleAvailable).toBe("boolean");
      expect(status.lastError).toBeUndefined();

      expect(await adapter.listNodes()).toEqual([]);
    } finally {
      await adapter.stop();
      await adapter.stop();
    }

    expect(adapter.status().ready).toBe(false);
  },
  120_000,
);
