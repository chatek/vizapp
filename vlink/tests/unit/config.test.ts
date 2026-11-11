import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  defaultConfigPath,
  ensureStateDir,
  loadConfig,
  readNatsToken,
  redactConfig,
} from "../../src/config.ts";
import { VLinkError } from "../../src/errors.ts";
import type { VLinkErrorCode } from "../../src/errors.ts";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "vlink-config-"));
  tempDirs.push(dir);
  return dir;
}

/** Run `fn` with HOME pointed at a fresh temp dir and all VLINK_* env cleared. */
function withHome<T>(fn: (home: string) => T): T {
  const home = tempDir();
  const saved = new Map<string, string | undefined>();
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VLINK_")) saved.set(key, process.env[key]);
  }
  const savedHome = process.env.HOME;
  process.env.HOME = home;
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VLINK_")) delete process.env[key];
  }

  try {
    return fn(home);
  } finally {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("VLINK_")) delete process.env[key];
    }
    for (const [key, value] of saved) {
      if (value !== undefined) process.env[key] = value;
    }
    if (savedHome === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome;
  }
}

function expectCode(fn: () => unknown, code: VLinkErrorCode): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(VLinkError);
    expect((error as VLinkError).code).toBe(code);
    return;
  }
  throw new Error(`expected VLinkError ${code}`);
}

function writeConfigFile(home: string, value: unknown): void {
  mkdirSync(join(home, ".omp", "vlink"), { recursive: true });
  writeFileSync(join(home, ".omp", "vlink", "config.json"), JSON.stringify(value));
}

function writeTokenFile(home: string, contents: string): string {
  mkdirSync(join(home, ".config", "pi-a2a"), { recursive: true });
  const path = join(home, ".config", "pi-a2a", "server.seed");
  writeFileSync(path, contents);
  return path;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("loadConfig defaults", () => {
  test("no env or file yields the documented defaults", () => {
    withHome((home) => {
      const config = loadConfig();
      expect(config.natsUrl).toBe("nats://127.0.0.1:14222");
      expect(config.natsName).toBe("vlink");
      expect(config.natsTokenFile).toBe(join(home, ".config", "pi-a2a", "server.seed"));
      expect(config.fabricLabel).toBe("VLink");
      expect(config.stateDir).toBe(join(home, ".omp", "vlink"));
      expect(config.matterStorage).toBe(join(home, ".omp", "vlink", "matter"));
      expect(config.matterMode).toBe("matter");
      expect(config.bleEnabled).toBe(true);
      expect(config.commandQueue).toBe("vlink");
      expect(config.healthIntervalMs).toBe(30000);
      expect(config.reconnectWaitMs).toBe(2000);
      expect(config.logLevel).toBe("info");
      expect(config.notifyEvents).toBe(false);
      expect(config.defaultCommandTimeoutMs).toBe(5000);
      expect(config.defaultCommissionTimeoutMs).toBe(120000);
      expect(config.instanceId.length).toBeGreaterThan(0);
      expect(config.instanceId).toMatch(/^[a-z0-9_-]+$/);
      expect(config.natsToken).toBeUndefined();
    });
  });

  test("defaultConfigPath follows HOME", () => {
    withHome((home) => {
      expect(defaultConfigPath()).toBe(join(home, ".omp", "vlink", "config.json"));
    });
  });
});

describe("precedence", () => {
  test("config file overrides defaults", () => {
    withHome((home) => {
      writeConfigFile(home, { natsUrl: "nats://127.0.0.1:19999", healthIntervalMs: 1234 });
      const config = loadConfig();
      expect(config.natsUrl).toBe("nats://127.0.0.1:19999");
      expect(config.healthIntervalMs).toBe(1234);
    });
  });

  test("environment overrides the config file", () => {
    withHome((home) => {
      writeConfigFile(home, { natsUrl: "nats://127.0.0.1:19999" });
      process.env.VLINK_NATS_URL = "nats://127.0.0.1:18888";
      expect(loadConfig().natsUrl).toBe("nats://127.0.0.1:18888");
    });
  });

  test("explicit overrides win over environment", () => {
    withHome(() => {
      process.env.VLINK_NATS_URL = "nats://127.0.0.1:18888";
      expect(loadConfig({ natsUrl: "nats://127.0.0.1:17777" }).natsUrl).toBe("nats://127.0.0.1:17777");
    });
  });

  test("boolean and numeric env values are parsed", () => {
    withHome(() => {
      process.env.VLINK_BLE_ENABLED = "false";
      process.env.VLINK_NOTIFY_EVENTS = "1";
      process.env.VLINK_HEALTH_INTERVAL_MS = "0";
      const config = loadConfig();
      expect(config.bleEnabled).toBe(false);
      expect(config.notifyEvents).toBe(true);
      expect(config.healthIntervalMs).toBe(0);
    });
  });

  test("state paths expand a leading tilde", () => {
    withHome((home) => {
      process.env.VLINK_STATE_DIR = "~/alt-vlink";
      expect(loadConfig().stateDir).toBe(join(home, "alt-vlink"));
    });
  });
});

describe("NATS token", () => {
  test("reads and trims the token file", () => {
    withHome((home) => {
      writeTokenFile(home, "  s3cret-token\n\n");
      expect(readNatsToken(loadConfig())).toBe("s3cret-token");
    });
  });

  test("missing token file is undefined and does not throw", () => {
    withHome(() => {
      expect(readNatsToken(loadConfig())).toBeUndefined();
    });
  });

  test("explicit natsToken wins over the file", () => {
    withHome((home) => {
      writeTokenFile(home, "file-token");
      const config = loadConfig({ natsToken: "inline-token" });
      expect(readNatsToken(config)).toBe("inline-token");
    });
  });

  test("VLINK_NATS_TOKEN_FILE overrides the default path", () => {
    withHome(() => {
      const dir = tempDir();
      const path = join(dir, "custom.seed");
      writeFileSync(path, "custom-token\n");
      process.env.VLINK_NATS_TOKEN_FILE = path;
      const config = loadConfig();
      expect(config.natsTokenFile).toBe(path);
      expect(readNatsToken(config)).toBe("custom-token");
    });
  });
});

describe("redaction", () => {
  test("never includes the NATS token or Wi-Fi password", () => {
    withHome(() => {
      process.env.VLINK_NATS_TOKEN = "super-secret-token";
      process.env.VLINK_WIFI_PASSWORD = "hunter2-wifi";
      const config = loadConfig();
      const serialized = JSON.stringify(redactConfig(config));
      expect(serialized).not.toContain("super-secret-token");
      expect(serialized).not.toContain("hunter2-wifi");
      expect(serialized).not.toContain('"natsToken":');
      expect(serialized).not.toContain('"wifiPassword":');
      expect(serialized).toContain("nats://127.0.0.1:14222");
    });
  });
});

describe("validation", () => {
  test("invalid matter mode throws CONFIG_INVALID", () => {
    withHome(() => {
      process.env.VLINK_MATTER_MODE = "bogus";
      expectCode(() => loadConfig(), "CONFIG_INVALID");
    });
  });

  test("invalid log level throws CONFIG_INVALID", () => {
    withHome(() => {
      process.env.VLINK_LOG_LEVEL = "verbose";
      expectCode(() => loadConfig(), "CONFIG_INVALID");
    });
  });

  test("empty or malformed NATS URL throws CONFIG_INVALID", () => {
    withHome(() => {
      expectCode(() => loadConfig({ natsUrl: "" }), "CONFIG_INVALID");
      expectCode(() => loadConfig({ natsUrl: "not a url" }), "CONFIG_INVALID");
    });
  });

  test("bad intervals throw CONFIG_INVALID", () => {
    withHome(() => {
      expectCode(() => loadConfig({ reconnectWaitMs: 0 }), "CONFIG_INVALID");
      expectCode(() => loadConfig({ healthIntervalMs: -1 }), "CONFIG_INVALID");
      expectCode(() => loadConfig({ defaultCommandTimeoutMs: 1.5 }), "CONFIG_INVALID");
      expectCode(() => loadConfig({ defaultCommissionTimeoutMs: -5 }), "CONFIG_INVALID");
    });
  });

  test("non-boolean env booleans throw CONFIG_INVALID", () => {
    withHome(() => {
      process.env.VLINK_BLE_ENABLED = "maybe";
      expectCode(() => loadConfig(), "CONFIG_INVALID");
    });
  });
});

describe("ensureStateDir", () => {
  test("creates both directories and is idempotent", () => {
    withHome((home) => {
      const config = loadConfig({
        stateDir: join(home, "state", "nested"),
        matterStorage: join(home, "state", "nested", "matter"),
      });
      ensureStateDir(config);
      ensureStateDir(config);
      expect(statSync(config.stateDir).isDirectory()).toBe(true);
      expect(statSync(config.matterStorage).isDirectory()).toBe(true);
    });
  });
});
