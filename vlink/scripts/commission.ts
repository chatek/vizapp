/**
 * Commissioning CLI over the shared NATS bus.
 *
 * Talks to whichever VLink bridge is answering `iot.cmd.matter.<fabric>.bridge.>`
 * (the OMP in-process bridge or the sidecar) — no Matter code runs here, so the
 * script works from any terminal and never needs Bluetooth permissions.
 *
 *   bun run commission list [fabric]
 *   bun run commission status [fabric]
 *   bun run commission [fabric]                 # commission with configured creds
 *   bun run commission decommission <nodeId> [--force] [fabric]
 *
 * Secrets (pairing code, Wi-Fi password) come from the environment or a 0600 JSON
 * file (VLINK_COMMISSION_FILE, default ~/.omp/vlink/commission.local.json — the
 * `*.local.json` pattern is gitignored). They are never printed.
 *
 * Exit codes: 0 ok · 1 error (bad args, connection, or bridge error reply) ·
 * 2 no bridge answered.
 */
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig, readNatsToken } from "../src/config.ts";
import { createLogger } from "../src/logger.ts";
import { NodeNatsTransport } from "../src/nats/index.ts";
import { normalizeFabricId, normalizeNodeId } from "../src/subjects.ts";
import type { BridgeAction, NatsMessage } from "../src/types.ts";

const FALLBACK_FABRIC_ID = "fabric-0000000000000001";
const DEFAULT_COMMISSION_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 5_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface CommissionFile {
  pairingCode?: string;
  passcode?: number;
  discriminator?: number;
  nodeName?: string;
  transport?: "ble-wifi" | "ip" | "ble-thread";
  wifi?: { ssid: string; password: string };
  thread?: { networkName?: string; operationalDataset: string };
}

const usage = `Usage:
  bun run commission list [fabric]
  bun run commission status [fabric]
  bun run commission [fabric]                      commission with configured creds
  bun run commission decommission <nodeId> [fabric] [--force]

Secrets: VLINK_PAIRING_CODE / VLINK_WIFI_SSID / VLINK_WIFI_PASSWORD env, or a 0600
JSON file at VLINK_COMMISSION_FILE (default ~/.omp/vlink/commission.local.json):
  { "pairingCode": "...", "nodeName": "desk-lamp",
    "wifi": { "ssid": "lab-iot", "password": "..." } }`;


function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, Math.max(0, ms));
  timer.unref?.();
  return promise;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
/** Read the optional 0600 credentials file; a missing file is fine (env-only). */
function readCommissionFile(path: string): CommissionFile {
  let raw: string;
  try {
    const stats = statSync(path);
    if (stats.mode & 0o077) {
      fail(`Commission file ${path} is group/world accessible (mode ${stats.mode.toString(8)}). Run: chmod 600 ${path}`);
    }
    raw = readFileSync(path, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    fail(`Cannot read commission file ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) fail(`Commission file ${path} is not a JSON object.`);
    return parsed as CommissionFile;
  } catch {
    fail(`Commission file ${path} is not valid JSON.`);
  }
}

function requestOnce(
  transport: NodeNatsTransport,
  subject: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<NatsMessage | undefined> {
  return (async () => {
    const inbox = `_INBOX.vlink-commission.${crypto.randomUUID()}`;
    const { promise: replied, resolve } = Promise.withResolvers<NatsMessage>();
    const subscription = await transport.subscribe(inbox, (error, message) => {
      if (!error) resolve(message);
    });
    transport.publish(subject, encoder.encode(JSON.stringify(payload)), { reply: inbox });
    await transport.flush();
    const reply = await Promise.race([replied, delay(timeoutMs).then(() => undefined)]);
    subscription.unsubscribe();
    return reply;
  })();
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  const positional = argv.filter((arg) => !arg.startsWith("--"));

  if (flags.has("--help") || flags.has("-h")) {
    console.log(usage);
    return 0;
  }
  const command = positional[0] ?? "commission";
  if (command !== "list" && command !== "status" && command !== "commission" && command !== "decommission") {
    console.error(`Unknown operation "${command}".\n\n${usage}`);
    return 1;
  }

  const config = loadConfig();
  const commissionFilePath =
    process.env.VLINK_COMMISSION_FILE?.trim() ||
    join(homedir(), ".omp", "vlink", "commission.local.json");
  const commissionFile = readCommissionFile(commissionFilePath);

  const fabricArg = command === "decommission" ? positional[2] : positional[1];
  const fabricId = normalizeFabricId(fabricArg || config.fabricId || FALLBACK_FABRIC_ID);

  const token = readNatsToken(config);
  if (!token) {
    console.error(
      `No NATS token. Set VLINK_NATS_TOKEN or provide ${config.natsTokenFile ?? "VLINK_NATS_TOKEN_FILE"}.`,
    );
    return 1;
  }

  const transport = new NodeNatsTransport(config, createLogger("warn"));
  try {
    await transport.connect();
  } catch (error) {
    console.error(
      `Cannot connect to ${config.natsUrl}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }

  try {
    const action = command as BridgeAction;
    const subject = `iot.cmd.matter.${fabricId}.bridge.${action}`;

    let payload: Record<string, unknown>;
    let timeoutMs: number;
    if (command === "decommission") {
      const nodeIdArg = positional[1];
      if (!nodeIdArg) {
        console.error(`Decommission needs a node id.\n\n${usage}`);
        return 1;
      }
      const nodeId = normalizeNodeId(nodeIdArg);
      payload = {
        v: 1,
        type: "bridge",
        action: "decommission",
        nodeId,
        ...(flags.has("--force") ? { force: true } : {}),
      };
      timeoutMs = DEFAULT_TIMEOUT_MS;
      console.log(`Requesting decommission of ${nodeId}${flags.has("--force") ? " (force)" : ""} on fabric ${fabricId}`);
    } else if (command === "commission") {
      const pairingCode = process.env.VLINK_PAIRING_CODE?.trim() || commissionFile.pairingCode?.trim();
      const passcode = commissionFile.passcode;
      if (pairingCode === undefined || pairingCode === "") {
        if (passcode === undefined) {
          console.error(
            `Commissioning needs a pairing code (VLINK_PAIRING_CODE or "${commissionFilePath}").`,
          );
          return 1;
        }
      }
      const configuredTransport = process.env.VLINK_COMMISSION_TRANSPORT?.trim() || commissionFile.transport;
      const wifiSsid = process.env.VLINK_WIFI_SSID?.trim() || commissionFile.wifi?.ssid;
      const wifiPassword = process.env.VLINK_WIFI_PASSWORD || commissionFile.wifi?.password;
      const mode: "ble-wifi" | "ip" | "ble-thread" =
        configuredTransport === "ip" || configuredTransport === "ble-thread" ? configuredTransport : "ble-wifi";
      if (mode === "ble-wifi" && (!wifiSsid || !wifiPassword)) {
        console.error(
          "ble-wifi commissioning needs VLINK_WIFI_SSID and VLINK_WIFI_PASSWORD (or the commission file's wifi block).",
        );
        return 1;
      }
      payload = {
        v: 1,
        type: "bridge",
        action: "commission",
        ...(pairingCode ? { pairingCode } : { passcode, discriminator: commissionFile.discriminator }),
        transport: mode,
        ...(wifiSsid && wifiPassword ? { wifi: { ssid: wifiSsid, password: wifiPassword } } : {}),
        ...(commissionFile.thread ? { thread: commissionFile.thread } : {}),
        ...(commissionFile.nodeName ? { nodeName: commissionFile.nodeName } : {}),
        timeoutMs: DEFAULT_COMMISSION_TIMEOUT_MS,
      };
      timeoutMs = DEFAULT_COMMISSION_TIMEOUT_MS + 10_000;
      console.log(
        `Requesting commissioning on fabric ${fabricId} (transport ${mode}, timeout ${DEFAULT_COMMISSION_TIMEOUT_MS}ms)`,
      );
    } else {
      payload = { v: 1, type: "bridge", action };
      timeoutMs = DEFAULT_TIMEOUT_MS;
      console.log(`Requesting bridge ${action} on fabric ${fabricId}`);
    }

    const reply = await requestOnce(transport, subject, payload, timeoutMs);
    if (!reply) {
      console.error(
        `No VLink bridge answered on ${subject} within ${timeoutMs}ms. ` +
          "Start the sidecar (`bun run sidecar`) or an OMP session with VLink enabled.",
      );
      return 2;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoder.decode(reply.data));
    } catch {
      console.error(`Bridge replied with non-JSON on ${subject}: ${decoder.decode(reply.data)}`);
      return 1;
    }
    console.log(JSON.stringify(parsed, null, 2));

    if (typeof parsed === "object" && parsed !== null && "ok" in parsed && parsed.ok === false) {
      console.error("Bridge answered but reported an error.");
      return 1;
    }
    return 0;
  } finally {
    await transport.close();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error("Commission CLI failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
