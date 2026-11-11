/**
 * Spawns a throwaway `nats-server` for integration tests.
 *
 * The binary is optional on developer machines: when it is absent the helper
 * throws `NatsServerUnavailableError` so tests can skip honestly instead of
 * passing on an unproven code path. Ports are always allocated at runtime.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class NatsServerUnavailableError extends Error {
  readonly code = "NATS_SERVER_UNAVAILABLE" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NatsServerUnavailableError";
  }
}

export interface NatsServerHandle {
  url: string;
  token: string;
  port: number;
  storeDir: string;
  stop(): Promise<void>;
}

export interface StartNatsServerOptions {
  /** Reuse a specific port (only for restart/reconnect tests). */
  port?: number;
  token?: string;
  readyTimeoutMs?: number;
}

export function natsServerBinary(): string | undefined {
  const configured = process.env.NATS_SERVER_BIN?.trim();
  if (configured) {
    return configured;
  }
  return Bun.which("nats-server") ?? undefined;
}

export function isNatsServerAvailable(): boolean {
  return natsServerBinary() !== undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  if (port === 0) {
    throw new NatsServerUnavailableError("could not allocate a free port for nats-server");
  }
  return port;
}

function probe(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

async function waitForReady(
  child: ChildProcess,
  port: number,
  stderr: () => string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new NatsServerUnavailableError(
        `nats-server exited with code ${child.exitCode}: ${stderr().trim() || "no stderr"}`,
      );
    }
    try {
      await probe(port);
      return;
    } catch (error) {
      lastError = error;
      await delay(25);
    }
  }
  child.kill("SIGKILL");
  throw new NatsServerUnavailableError(
    `nats-server did not become ready on 127.0.0.1:${port}: ${stderr().trim() || String(lastError)}`,
    { cause: lastError },
  );
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      child.off("exit", finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    child.once("exit", finish);
  });
}

/**
 * Start a private nats-server with token auth and a temp JetStream store dir.
 * The caller owns the handle and must call `stop()`.
 */
export async function startNatsServer(options: StartNatsServerOptions = {}): Promise<NatsServerHandle> {
  const binary = natsServerBinary();
  if (!binary) {
    throw new NatsServerUnavailableError(
      "nats-server binary not found; install nats-server or set NATS_SERVER_BIN",
    );
  }

  const port = options.port ?? (await reservePort());
  const token = options.token ?? randomUUID().replace(/-/g, "");
  const storeDir = await mkdtemp(join(tmpdir(), "vlink-nats-"));
  let stderr = "";
  let stopped = false;

  const child = spawn(
    binary,
    ["-p", String(port), "-a", "127.0.0.1", "--auth", token, "-sd", storeDir],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr += chunk.toString();
    if (stderr.length > 16_384) {
      stderr = stderr.slice(-16_384);
    }
  });
  child.stdout?.on("data", () => {
    // Drain so the server cannot block on a full pipe.
  });

  await waitForReady(child, port, () => stderr, options.readyTimeoutMs ?? 5_000);

  return {
    url: `nats://127.0.0.1:${port}`,
    token,
    port,
    storeDir,
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        await waitForExit(child, 2_000);
      }
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await waitForExit(child, 1_000);
      }
      await rm(storeDir, { recursive: true, force: true });
    },
  };
}
