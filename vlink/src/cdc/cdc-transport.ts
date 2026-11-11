/**
 * CDC transport: line framing over the board's USB-Serial/JTAG port.
 *
 * `CdcTransport` is the seam — the bridge and tests see only lines in/out,
 * while `NodeCdcTransport` owns the real serial device (discovery of the
 * `303a:1001` interface included). A USB-CDC ACM port needs no termios setup
 * (it ignores baud), so the device file is opened directly and read/written
 * as a file descriptor. Nothing here knows the protocol beyond the framing
 * rules of docs/CDC_PROTOCOL.md §1.
 */

import { readdirSync } from "node:fs";
import { constants as fsConstants } from "node:fs";
import { open as fsOpen, type FileHandle } from "node:fs/promises";
import { platform as osPlatform } from "node:os";

/** USB vendor:product of the ESP32-C6 USB-Serial/JTAG CDC interface. */
export const CDC_USB_ID = "303a:1001";

/** Max line sizes per CDC_PROTOCOL.md §1 (bytes, newline excluded). */
const MAX_DEVICE_LINE_BYTES = 512;
const MAX_HOST_LINE_BYTES = 4096;
const READ_CHUNK_BYTES = 4096;
/** Backoff between empty non-blocking reads so the read loop never spins. */
const IDLE_READ_DELAY_MS = 10;

/** A complete CDC line (no newline). */
export type CdcLineListener = (line: string) => void;

export interface CdcTransport {
  /** Open the device. Resolves false when no device is present. */
  open(): Promise<boolean>;
  close(): Promise<void>;
  isOpen(): boolean;
  /** Register the line sink; returns a disposer. Only one listener is live. */
  onLine(listener: CdcLineListener): () => void;
  /** Send one line (newline appended). Throws when not open or too long. */
  writeLine(line: string): void;
}

/** Split a byte stream into complete `\n`-terminated lines. */
export class LineFramer {
  private buffer = "";

  /** Feed raw bytes; returns the complete lines found in order. */
  feed(data: string): string[] {
    this.buffer += data;
    const lines: string[] = [];
    let index = this.buffer.indexOf("\n");
    while (index >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      lines.push(line);
      index = this.buffer.indexOf("\n");
    }
    return lines;
  }

  /** Bytes buffered but not yet newline-terminated (for logs after close). */
  pending(): string {
    return this.buffer;
  }
}

export interface CdcDiscoveryDeps {
  /** `process.platform` value; defaults to the real platform. */
  platform?: string;
  /** Directory listing; defaults to `readdirSync`. Never throws here. */
  readDir?: (dir: string) => string[];
}

function listDirectory(dir: string, readDir: (dir: string) => string[]): string[] {
  try {
    return readDir(dir);
  } catch {
    return [];
  }
}

/**
 * Candidate device paths for the ESP32-C6 CDC interface (303a:1001), in
 * preference order. macOS exposes `/dev/cu.usbmodem*`; Linux prefers the
 * stable `/dev/serial/by-id/` symlinks (matched against the Espressif
 * vendor/product) with `/dev/ttyACM*` as fallback. An explicit override wins.
 */
export function discoverCdcDevicePaths(deviceOverride?: string, deps: CdcDiscoveryDeps = {}): string[] {
  const override = deviceOverride?.trim();
  if (override && override.length > 0) {
    return [override];
  }
  const system = deps.platform ?? osPlatform();
  const readDir = deps.readDir ?? readdirSync;

  if (system === "linux") {
    const paths: string[] = [];
    for (const name of listDirectory("/dev/serial/by-id", readDir)) {
      if (/usb-Espressif.*303a[:_-]?1001/i.test(name) || /usb-.*ESP32.*CDC/i.test(name)) {
        paths.push(`/dev/serial/by-id/${name}`);
      }
    }
    for (const name of listDirectory("/dev", readDir)) {
      if (/^ttyACM/.test(name)) {
        paths.push(`/dev/${name}`);
      }
    }
    return paths;
  }

  if (system === "darwin") {
    return listDirectory("/dev", readDir)
      .filter((name) => /^cu\.usbmodem/.test(name))
      .map((name) => `/dev/${name}`);
  }

  return [];
}

export interface NodeCdcTransportOptions {
  /** Explicit device path (skips discovery). */
  devicePath?: string;
  /** Candidate paths; defaults to {@link discoverCdcDevicePaths}. */
  discoverPaths?: () => string[];
}

/**
 * Real transport over the USB CDC device file. Opens the first candidate that
 * answers `open()`, reads it continuously in a non-blocking loop, frames
 * incoming bytes into lines, and enforces the §1 line limits. Device absence
 * is not an error — `open()` simply resolves false.
 */
export class NodeCdcTransport implements CdcTransport {
  private readonly discoverPaths: () => string[];
  private readonly framer = new LineFramer();
  private handle: FileHandle | undefined;
  private listener: CdcLineListener | undefined;
  private readRunning = false;
  private openPath: string | undefined;
  private writeChain: Promise<void> = Promise.resolve();
  constructor(options: NodeCdcTransportOptions = {}) {
    this.discoverPaths = options.discoverPaths ?? (() => discoverCdcDevicePaths(options.devicePath));
  }

  /** The path of the open device, for logs. */
  get path(): string | undefined {
    return this.openPath;
  }

  async open(): Promise<boolean> {
    if (this.handle) return true;
    for (const path of this.discoverPaths()) {
      let handle: FileHandle;
      try {
        handle = await fsOpen(path, fsConstants.O_RDWR | fsConstants.O_NOCTTY | fsConstants.O_NONBLOCK);
      } catch {
        // Wrong or busy candidate: try the next one.
        continue;
      }
      this.handle = handle;
      this.openPath = path;
      this.readRunning = true;
      void this.readLoop(handle);
      return true;
    }
    return false;
  }

  async close(): Promise<void> {
    const handle = this.handle;
    this.handle = undefined;
    this.openPath = undefined;
    this.readRunning = false;
    if (handle) {
      // Let queued writes flush to the device before the handle goes away.
      await this.writeChain.catch(() => {});
      try {
        await handle.close();
      } catch {
        // Closing a vanished device is success for our purposes.
      }
    }
  }

  isOpen(): boolean {
    return this.handle !== undefined;
  }

  onLine(listener: CdcLineListener): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  writeLine(line: string): void {
    const handle = this.handle;
    if (!handle) throw new Error("CDC transport is not open");
    if (line.length > MAX_HOST_LINE_BYTES) {
      throw new Error(`CDC line exceeds the ${MAX_HOST_LINE_BYTES}-byte host limit: ${line.length}`);
    }
    // Writes are chained: two rapid writeLine calls must never interleave
    // on the device, and FileHandle.write is not atomic across promises.
    this.writeChain = this.writeChain.then(async () => {
      await handle.write(`${line}\n`);
    });
    this.writeChain.catch(() => this.close().catch(() => {}));
  }

  private async readLoop(handle: FileHandle): Promise<void> {
    const buffer = Buffer.alloc(READ_CHUNK_BYTES);
    while (this.readRunning && this.handle === handle) {
      let bytesRead: number;
      try {
        const result = await handle.read(buffer, 0, buffer.length, null);
        bytesRead = result.bytesRead;
      } catch {
        break;
      }
      if (bytesRead === 0) {
        // Non-blocking read with no data available: back off briefly.
        const { promise: idle, resolve: resume } = Promise.withResolvers<void>();
        const timer = setTimeout(resume, IDLE_READ_DELAY_MS);
        timer.unref?.();
        await idle;
        continue;
      }
      this.handleChunk(buffer.toString("utf8", 0, bytesRead));
    }
  }

  private handleChunk(chunk: string): void {
    for (const line of this.framer.feed(chunk)) {
      if (line.length === 0) continue;
      if (line.length > MAX_DEVICE_LINE_BYTES) {
        // Oversized device lines are dropped, not fatal (§1 forward compat).
        continue;
      }
      this.listener?.(line);
    }
  }
}
