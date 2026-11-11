/**
 * Unit: CDC transport framing and device discovery. No hardware: discovery
 * runs against a fake directory listing, and the only real file the transport
 * touches is a plain temp file standing in for the CDC device node.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CDC_USB_ID,
  LineFramer,
  NodeCdcTransport,
  discoverCdcDevicePaths,
} from "../../src/cdc/cdc-transport.ts";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "vlink-cdc-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("LineFramer", () => {
  test("emits complete lines and keeps partial tails", () => {
    const framer = new LineFramer();
    expect(framer.feed('{"v":1,"type":"hel')).toEqual([]);
    expect(framer.feed('lo"}\n{"v":1,"type":"by')).toEqual(['{"v":1,"type":"hello"}']);
    expect(framer.feed('e"}\n')).toEqual(['{"v":1,"type":"bye"}']);
    expect(framer.pending()).toBe("");
  });

  test("strips CR from CRLF framing", () => {
    const framer = new LineFramer();
    expect(framer.feed('{"v":1,"type":"bye"}\r\n')).toEqual(['{"v":1,"type":"bye"}']);
  });

  test("preserves empty lines as empty strings", () => {
    const framer = new LineFramer();
    expect(framer.feed("\n\n")).toEqual(["", ""]);
  });

  test("pending reports the unterminated remainder", () => {
    const framer = new LineFramer();
    framer.feed("tail-without-newline");
    expect(framer.pending()).toBe("tail-without-newline");
  });
});

describe("discoverCdcDevicePaths", () => {
  test("an explicit override wins and is trimmed", () => {
    expect(discoverCdcDevicePaths("  /dev/cu.usbmodem3131  ")).toEqual(["/dev/cu.usbmodem3131"]);
  });

  test("macOS: only cu.usbmodem* candidates", () => {
    const paths = discoverCdcDevicePaths(undefined, {
      platform: "darwin",
      readDir: () => ["cu.usbmodem303AC6-01", "tty.usbmodem303AC6-01", "cu.Bluetooth-Incoming-Port"],
    });
    expect(paths).toEqual(["/dev/cu.usbmodem303AC6-01"]);
  });

  test("Linux: by-id Espressif match first, ttyACM fallback after", () => {
    const paths = discoverCdcDevicePaths(undefined, {
      platform: "linux",
      readDir: (dir) =>
        dir === "/dev/serial/by-id"
          ? ["usb-Espressif_USB_JTAG-serial-303a_1001-if00", "usb-Other_Device-if00"]
          : ["ttyACM0", "ttyS0", "ttyUSB0"],
    });
    expect(paths).toEqual(["/dev/serial/by-id/usb-Espressif_USB_JTAG-serial-303a_1001-if00", "/dev/ttyACM0"]);
  });

  test("Linux: ESP32 CDC by-id names also match", () => {
    const paths = discoverCdcDevicePaths(undefined, {
      platform: "linux",
      readDir: (dir) => (dir === "/dev/serial/by-id" ? ["usb-ESP32-C6_CDC-if00"] : []),
    });
    expect(paths).toEqual(["/dev/serial/by-id/usb-ESP32-C6_CDC-if00"]);
  });

  test("unknown platforms and unreadable /dev yield no candidates", () => {
    expect(discoverCdcDevicePaths(undefined, { platform: "win32", readDir: () => [] })).toEqual([]);
    expect(
      discoverCdcDevicePaths(undefined, {
        platform: "linux",
        readDir: () => {
          throw new Error("ENOENT");
        },
      }),
    ).toEqual([]);
  });

  test("the USB id constant matches the CDC interface", () => {
    expect(CDC_USB_ID).toBe("303a:1001");
  });
});

describe("NodeCdcTransport (temp file as device node)", () => {
  test("open resolves false with no candidates and never throws", async () => {
    const transport = new NodeCdcTransport({ discoverPaths: () => [] });
    expect(await transport.open()).toBe(false);
    expect(transport.isOpen()).toBe(false);
    expect(transport.path).toBeUndefined();
  });

  test("open resolves false when every candidate is missing, then tries the next list", async () => {
    const transport = new NodeCdcTransport({
      discoverPaths: () => ["/nonexistent/vlink-cdc-0", "/nonexistent/vlink-cdc-1"],
    });
    expect(await transport.open()).toBe(false);
  });

  test("opens a present candidate and writes newline-terminated lines", async () => {
    const dir = tempDir();
    const devicePath = join(dir, "cu.usbmodemFAKE");
    writeFileSync(devicePath, "");
    const transport = new NodeCdcTransport({
      discoverPaths: () => ["/nonexistent/vlink-cdc-0", devicePath],
    });
    expect(await transport.open()).toBe(true);
    expect(transport.isOpen()).toBe(true);
    expect(transport.path).toBe(devicePath);

    transport.writeLine('{"v":1,"type":"ack","fabric":"fabric-0000000000000001","instance":"test"}');
    transport.writeLine('{"v":1,"type":"bye"}');
    await transport.close();

    const written = readFileSync(devicePath, "utf8");
    expect(written).toBe(
      '{"v":1,"type":"ack","fabric":"fabric-0000000000000001","instance":"test"}\n{"v":1,"type":"bye"}\n',
    );
    expect(transport.isOpen()).toBe(false);
  });

  test("writeLine throws when not open", () => {
    const transport = new NodeCdcTransport({ discoverPaths: () => [] });
    expect(() => transport.writeLine('{"v":1,"type":"bye"}')).toThrow("not open");
  });

  test("writeLine rejects lines over the 4 KB host limit", async () => {
    const dir = tempDir();
    const devicePath = join(dir, "cu.usbmodemFAKE");
    writeFileSync(devicePath, "");
    const transport = new NodeCdcTransport({ discoverPaths: () => [devicePath] });
    await transport.open();
    expect(() => transport.writeLine("x".repeat(4097))).toThrow(/4096/);
    await transport.close();
  });

  test("delivers framed lines to the onLine listener", async () => {
    const dir = tempDir();
    const devicePath = join(dir, "cu.usbmodemFAKE");
    // Pre-seed the "device" with a line: the read loop consumes it on open,
    // so the test awaits the delivery event itself — no timed sleep.
    writeFileSync(devicePath, '{"v":1,"type":"hello","device":"vlink-c6","fw":"1.0.0","mac":"b0:a6:04:8b:58:f8"}\n');
    const transport = new NodeCdcTransport({ discoverPaths: () => [devicePath] });
    const { promise, resolve } = Promise.withResolvers<string>();
    const dispose = transport.onLine(resolve);
    await transport.open();
    const line = await promise;
    dispose();
    await transport.close();
    expect(line).toBe('{"v":1,"type":"hello","device":"vlink-c6","fw":"1.0.0","mac":"b0:a6:04:8b:58:f8"}');
  });

  test("close is idempotent", async () => {
    const transport = new NodeCdcTransport({ discoverPaths: () => [] });
    await transport.close();
    await transport.close();
    expect(transport.isOpen()).toBe(false);
  });
});
