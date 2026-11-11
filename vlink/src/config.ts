/**
 * Configuration resolution for VLink.
 *
 * Precedence (highest first): explicit call-site overrides, environment
 * variables, `~/.omp/vlink/config.json`, built-in defaults. Secrets are never
 * written to or read from the JSON config file except by explicit user choice;
 * the NATS token normally lives in `pi-a2a`'s `server.seed`.
 */

import { mkdirSync, readFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";

import { VLinkError } from "./errors.ts";
import type { LogLevel, VLinkConfig } from "./types.ts";

const MATTER_MODES: readonly VLinkConfig["matterMode"][] = ["matter", "sim", "off"];
const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/** Every field can be supplied through the environment (optional fields included). */
const ENV_KEYS = {
  natsUrl: "VLINK_NATS_URL",
  natsName: "VLINK_NATS_NAME",
  natsToken: "VLINK_NATS_TOKEN",
  natsTokenFile: "VLINK_NATS_TOKEN_FILE",
  fabricId: "VLINK_FABRIC_ID",
  fabricLabel: "VLINK_FABRIC_LABEL",
  stateDir: "VLINK_STATE_DIR",
  matterStorage: "VLINK_MATTER_STORAGE",
  matterMode: "VLINK_MATTER_MODE",
  bleEnabled: "VLINK_BLE_ENABLED",
  wifiSsid: "VLINK_WIFI_SSID",
  wifiPassword: "VLINK_WIFI_PASSWORD",
  commandQueue: "VLINK_COMMAND_QUEUE",
  healthIntervalMs: "VLINK_HEALTH_INTERVAL_MS",
  reconnectWaitMs: "VLINK_RECONNECT_WAIT_MS",
  logLevel: "VLINK_LOG_LEVEL",
  notifyEvents: "VLINK_NOTIFY_EVENTS",
  instanceId: "VLINK_INSTANCE_ID",
  defaultCommandTimeoutMs: "VLINK_DEFAULT_COMMAND_TIMEOUT_MS",
  defaultCommissionTimeoutMs: "VLINK_DEFAULT_COMMISSION_TIMEOUT_MS",
  cdcEnabled: "VLINK_CDC_ENABLED",
  cdcDevicePath: "VLINK_CDC_DEVICE",
} as const satisfies Record<keyof VLinkConfig, string>;

function homeDirectory(): string {
  const fromEnv = process.env.HOME?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : homedir();
}

/** Expand a leading `~` (and `~/…`) using the same home resolution as defaults. */
function expandHome(path: string): string {
  if (path === "~") return homeDirectory();
  if (path.startsWith("~/")) return join(homeDirectory(), path.slice(2));
  return path;
}

/** Sanitize a hostname into one NATS subject token. */
function sanitizeInstanceId(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "vlink";
}

export function defaultConfigPath(): string {
  return join(homeDirectory(), ".omp", "vlink", "config.json");
}

function readConfigFile(path: string): Record<string, unknown> {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // A corrupt config file must not brick startup; defaults apply.
  }
  return {};
}

function readString(raw: Record<string, unknown>, key: keyof VLinkConfig, fallback: string): string {
  const value = raw[key];
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new VLinkError("CONFIG_INVALID", `${String(key)} must be a string`, { key: String(key) });
  }
  return value;
}

/** Trimmed, non-empty optional string; empty values mean "unset". */
function readOptionalString(raw: Record<string, unknown>, key: keyof VLinkConfig): string | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new VLinkError("CONFIG_INVALID", `${String(key)} must be a string`, { key: String(key) });
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Optional string whose whitespace is meaningful (passwords). */
function readOptionalText(raw: Record<string, unknown>, key: keyof VLinkConfig): string | undefined {
  const value = raw[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new VLinkError("CONFIG_INVALID", `${String(key)} must be a string`, { key: String(key) });
  }
  return value.length > 0 ? value : undefined;
}

function readNumber(raw: Record<string, unknown>, key: keyof VLinkConfig, fallback: number): number {
  const value = raw[key];
  if (value === undefined) return fallback;
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(numeric)) {
    throw new VLinkError("CONFIG_INVALID", `${String(key)} must be a finite number`, {
      key: String(key),
    });
  }
  return numeric;
}

function readBoolean(raw: Record<string, unknown>, key: keyof VLinkConfig, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  throw new VLinkError("CONFIG_INVALID", `${String(key)} must be a boolean`, { key: String(key) });
}

function validateConfig(config: VLinkConfig): void {
  if (!MATTER_MODES.includes(config.matterMode)) {
    throw new VLinkError(
      "CONFIG_INVALID",
      `matterMode must be one of ${MATTER_MODES.join(", ")}`,
      { matterMode: config.matterMode },
    );
  }
  if (!LOG_LEVELS.includes(config.logLevel)) {
    throw new VLinkError("CONFIG_INVALID", `logLevel must be one of ${LOG_LEVELS.join(", ")}`, {
      logLevel: config.logLevel,
    });
  }
  if (config.natsUrl.trim().length === 0) {
    throw new VLinkError("CONFIG_INVALID", "natsUrl must not be empty");
  }
  try {
    new URL(config.natsUrl);
  } catch {
    throw new VLinkError("CONFIG_INVALID", `natsUrl is not a valid URL: ${config.natsUrl}`, {
      natsUrl: config.natsUrl,
    });
  }

  for (const [key, value] of [
    ["natsName", config.natsName],
    ["fabricLabel", config.fabricLabel],
    ["commandQueue", config.commandQueue],
    ["stateDir", config.stateDir],
    ["matterStorage", config.matterStorage],
    ["instanceId", config.instanceId],
  ] as const) {
    if (value.trim().length === 0) {
      throw new VLinkError("CONFIG_INVALID", `${key} must not be empty`, { key });
    }
  }

  for (const [key, value] of [
    ["commandQueue", config.commandQueue],
    ["instanceId", config.instanceId],
    ...(config.fabricId ? ([["fabricId", config.fabricId]] as const) : []),
  ] as const) {
    if (/[.*>\s]/.test(value)) {
      throw new VLinkError(
        "CONFIG_INVALID",
        `${key} must be a single NATS subject token (no '.', '*', '>', or whitespace)`,
        { key, value },
      );
    }
  }

  if (!Number.isInteger(config.healthIntervalMs) || config.healthIntervalMs < 0) {
    throw new VLinkError("CONFIG_INVALID", "healthIntervalMs must be a non-negative integer", {
      healthIntervalMs: config.healthIntervalMs,
    });
  }
  for (const [key, value] of [
    ["reconnectWaitMs", config.reconnectWaitMs],
    ["defaultCommandTimeoutMs", config.defaultCommandTimeoutMs],
    ["defaultCommissionTimeoutMs", config.defaultCommissionTimeoutMs],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new VLinkError("CONFIG_INVALID", `${key} must be a positive integer`, { key, value });
    }
  }
}

/** Resolve the full configuration. Throws `CONFIG_INVALID` on bad input. */
export function loadConfig(overrides: Partial<VLinkConfig> = {}): VLinkConfig {
  const home = homeDirectory();
  const defaults: VLinkConfig = {
    natsUrl: "nats://127.0.0.1:14222",
    natsName: "vlink",
    natsTokenFile: join(home, ".config", "pi-a2a", "server.seed"),
    fabricLabel: "VLink",
    stateDir: join(home, ".omp", "vlink"),
    matterStorage: join(home, ".omp", "vlink", "matter"),
    matterMode: "matter",
    bleEnabled: true,
    commandQueue: "vlink",
    healthIntervalMs: 30000,
    reconnectWaitMs: 2000,
    logLevel: "info",
    notifyEvents: false,
    instanceId: sanitizeInstanceId(hostname()),
    defaultCommandTimeoutMs: 5000,
    defaultCommissionTimeoutMs: 120000,
    cdcEnabled: true,
  };

  const explicitConfigPath = process.env.VLINK_CONFIG_FILE?.trim() || process.env.VLINK_CONFIG?.trim();
  const raw: Record<string, unknown> = {
    ...readConfigFile(explicitConfigPath || defaultConfigPath()),
  };
  for (const [key, envKey] of Object.entries(ENV_KEYS)) {
    const value = process.env[envKey];
    if (value !== undefined) raw[key] = value;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) raw[key] = value;
  }

  const configuredTokenFile = readOptionalString(raw, "natsTokenFile");
  const config: VLinkConfig = {
    natsUrl: readString(raw, "natsUrl", defaults.natsUrl).trim(),
    natsName: readString(raw, "natsName", defaults.natsName).trim(),
    natsTokenFile: configuredTokenFile ? expandHome(configuredTokenFile) : defaults.natsTokenFile,
    fabricLabel: readString(raw, "fabricLabel", defaults.fabricLabel).trim(),
    stateDir: expandHome(readString(raw, "stateDir", defaults.stateDir).trim()),
    matterStorage: expandHome(readString(raw, "matterStorage", defaults.matterStorage).trim()),
    matterMode: readString(raw, "matterMode", defaults.matterMode).trim() as VLinkConfig["matterMode"],
    bleEnabled: readBoolean(raw, "bleEnabled", defaults.bleEnabled),
    commandQueue: readString(raw, "commandQueue", defaults.commandQueue).trim(),
    healthIntervalMs: readNumber(raw, "healthIntervalMs", defaults.healthIntervalMs),
    reconnectWaitMs: readNumber(raw, "reconnectWaitMs", defaults.reconnectWaitMs),
    logLevel: readString(raw, "logLevel", defaults.logLevel).trim() as LogLevel,
    notifyEvents: readBoolean(raw, "notifyEvents", defaults.notifyEvents),
    instanceId: sanitizeInstanceId(readString(raw, "instanceId", defaults.instanceId)),
    defaultCommandTimeoutMs: readNumber(raw, "defaultCommandTimeoutMs", defaults.defaultCommandTimeoutMs),
    defaultCommissionTimeoutMs: readNumber(
      raw,
      "defaultCommissionTimeoutMs",
      defaults.defaultCommissionTimeoutMs,
    ),
    cdcEnabled: readBoolean(raw, "cdcEnabled", defaults.cdcEnabled),
  };

  const natsToken = readOptionalString(raw, "natsToken");
  if (natsToken !== undefined) config.natsToken = natsToken;
  const fabricId = readOptionalString(raw, "fabricId");
  if (fabricId !== undefined) config.fabricId = fabricId;
  const wifiSsid = readOptionalString(raw, "wifiSsid");
  if (wifiSsid !== undefined) config.wifiSsid = wifiSsid;
  const wifiPassword = readOptionalText(raw, "wifiPassword");
  if (wifiPassword !== undefined) config.wifiPassword = wifiPassword;
  const cdcDevicePath = readOptionalString(raw, "cdcDevicePath");
  if (cdcDevicePath !== undefined) config.cdcDevicePath = cdcDevicePath;
  validateConfig(config);
  return config;
}

/**
 * Resolve the NATS auth token: an explicit `natsToken` wins, otherwise the
 * token file is read and trimmed. A missing/unreadable file yields `undefined`
 * so the connection layer can report `NATS_NOT_CONNECTED` with a real reason.
 */
export function readNatsToken(config: VLinkConfig): string | undefined {
  const inline = config.natsToken?.trim();
  if (inline && inline.length > 0) return inline;
  if (!config.natsTokenFile) return undefined;

  try {
    const token = readFileSync(expandHome(config.natsTokenFile), "utf8").trim();
    return token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}

/** Configuration safe for logs/health: secrets are omitted entirely. */
export function redactConfig(config: VLinkConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === "natsToken" || key === "wifiPassword") continue;
    out[key] = value;
  }
  return out;
}

/** Create `stateDir` and `matterStorage`; idempotent. */
export function ensureStateDir(config: VLinkConfig): void {
  for (const dir of [config.stateDir, config.matterStorage]) {
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    } catch (error) {
      throw new VLinkError("CONFIG_INVALID", `cannot create state directory: ${dir}`, {
        dir,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
