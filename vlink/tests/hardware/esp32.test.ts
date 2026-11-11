/**
 * ESP32 hardware bring-up (opt-in: VLINK_HW=1).
 *
 * Required environment:
 *   VLINK_HW_PAIRING_CODE, VLINK_HW_WIFI_SSID, VLINK_HW_WIFI_PASSWORD
 * Optional: VLINK_HW_NODE_ALIAS, VLINK_HW_EXPECTED_ENDPOINT (default 1), VLINK_HW_CLUSTER (default onOff)
 *
 * The test never prints the pairing code or Wi-Fi password; its final assertions check that its
 * own log sink stayed clean as well.
 */

import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../src/config.ts";
import { createLogger } from "../../src/logger.ts";
import { MatterJsAdapter } from "../../src/matter/matter-js.ts";
import { resolveCluster } from "../../src/matter/clusters.ts";

const pairingCode = process.env.VLINK_HW_PAIRING_CODE;
const wifiSsid = process.env.VLINK_HW_WIFI_SSID;
const wifiPassword = process.env.VLINK_HW_WIFI_PASSWORD;
const nodeAlias = process.env.VLINK_HW_NODE_ALIAS ?? "esp32-vlink";
const endpointId = Number(process.env.VLINK_HW_EXPECTED_ENDPOINT ?? "1");
const clusterName = process.env.VLINK_HW_CLUSTER ?? "onOff";
const p95TargetMs = Number(process.env.VLINK_HW_P95_MS ?? "50");

const enabled =
  process.env.VLINK_HW === "1" &&
  pairingCode !== undefined &&
  pairingCode !== "" &&
  wifiSsid !== undefined &&
  wifiPassword !== undefined;

function percentile(samples: number[], fraction: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index];
}

test.skipIf(!enabled)(
  "ESP32 BLE commissioning, read, toggle, latency, decommission (VLINK_HW=1)",
  async () => {
    const storage = await mkdtemp(join(tmpdir(), "vlink-hw-"));
    const lines: string[] = [];
    const logger = createLogger("debug", (line) => lines.push(line));
    const config = loadConfig({
      matterMode: "matter",
      matterStorage: storage,
      fabricLabel: "VLink-HW",
      bleEnabled: true,
      defaultCommissionTimeoutMs: 180_000,
      defaultCommandTimeoutMs: 10_000,
    });
    const adapter = new MatterJsAdapter(config, logger);
    const cluster = resolveCluster(clusterName);
    const attribute = [...cluster.attributes.values()][0]?.name ?? "onOff";
    let nodeId: string | undefined;

    try {
      await adapter.start();
      const started = adapter.status();
      expect(started.ready).toBe(true);
      expect(started.bleAvailable).toBe(true);

      const node = await adapter.commission({
        transport: "ble-wifi",
        pairingCode,
        wifi: { ssid: wifiSsid!, password: wifiPassword! },
        nodeName: nodeAlias,
        timeoutMs: 180_000,
      });
      nodeId = node.nodeId;
      expect(node.nodeId).toMatch(/^node-[0-9a-f]{16}$/);

      const listed = await adapter.listNodes();
      expect(listed.map((entry) => entry.nodeId)).toContain(node.nodeId);

      const read = await adapter.readAttribute({
        fabricId: node.fabricId,
        nodeId: node.nodeId,
        endpointId,
        cluster: cluster.name,
        attribute,
      });
      expect(read.nodeId).toBe(node.nodeId);
      expect(read.attribute).toBe(attribute);

      const durations: number[] = [];
      for (let attempt = 0; attempt < 20; attempt++) {
        const commandStarted = performance.now();
        const result = await adapter.invokeCommand({
          fabricId: node.fabricId,
          nodeId: node.nodeId,
          endpointId,
          cluster: "onOff",
          command: "toggle",
          timeoutMs: 10_000,
        });
        durations.push(performance.now() - commandStarted);
        expect(result.error).toBeUndefined();
        expect(result.ok).toBe(true);
      }

      const latency = {
        count: durations.length,
        minMs: Math.round(Math.min(...durations) * 100) / 100,
        medianMs: Math.round(percentile(durations, 0.5) * 100) / 100,
        p95Ms: Math.round(percentile(durations, 0.95) * 100) / 100,
        maxMs: Math.round(Math.max(...durations) * 100) / 100,
      };
      logger.info("hardware command latency", latency);
      expect(latency.p95Ms).toBeLessThanOrEqual(p95TargetMs);
    } finally {
      if (nodeId !== undefined) {
        try {
          await adapter.decommission({
            fabricId: adapter.status().fabricId ?? config.fabricId ?? "fabric-0000000000000001",
            nodeId,
          });
          expect((await adapter.listNodes()).map((entry) => entry.nodeId)).not.toContain(nodeId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn("hardware decommission failed", { error: message });
        }
      }
      await adapter.stop();
      await rm(storage, { recursive: true, force: true });
    }

    const transcript = lines.join("\n");
    expect(transcript).not.toContain(pairingCode!);
    expect(transcript).not.toContain(wifiPassword!);
  },
  300_000,
);
