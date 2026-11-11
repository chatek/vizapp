/**
 * Shared CDC port helpers for the VLink maker CLI (`vlink:attach`, `vlink:stream`,
 * `vlink:flash`). No dependencies beyond node:fs and Bun.spawn — the USB-CDC device
 * is read by spawning `cat <port>` (or `ssh <host> cat <port>`), which is enough
 * for a line-oriented debug/diagnostic reader and touches no control lines
 * (no DTR/RTS pulse, so opening the port never resets the board).
 *
 * Contract: docs/CDC_PROTOCOL.md — 303a:1001, macOS /dev/cu.usbmodem*, Linux
 * /dev/ttyACM*, node id = `node-` + BASE MAC zero-padded to 16 hex.
 */
import { readdirSync, readFileSync } from "node:fs";

export const USB_VENDOR = "303a";
export const USB_PRODUCT = "1001";

/** `--host danilab` → `debian@danilab`; a value already carrying a user passes through. */
export function sshTarget(host: string): string {
  return host.includes("@") ? host : `debian@${host}`;
}

function listLocalLinux(): { path: string; vendor: string; product: string }[] {
  const names = readdirSync("/dev").filter((n) => /^ttyACM/.test(n));
  return names.map((n) => {
    let vendor = "?";
    let product = "?";
    try {
      vendor = readFileSync(`/sys/class/tty/${n}/device/../idVendor`, "utf8").trim();
      product = readFileSync(`/sys/class/tty/${n}/device/../idProduct`, "utf8").trim();
    } catch {
      // sysfs layout not readable — keep the name match, flag it
    }
    return { path: `/dev/${n}`, vendor, product };
  });
}

function listLocalDarwin(): { path: string; vendor: string; product: string }[] {
  // macOS has no stable sysfs; the cu.usbmodem* name is the discovery contract here
  // (the vendor:product check is Linux-only and stated as such in --help).
  return readdirSync("/dev")
    .filter((n) => /^cu\.usbmodem/.test(n))
    .map((n) => ({ path: `/dev/${n}`, vendor: "?", product: "?" }));
}

/** One ssh round trip: `path vendor product` per /dev/ttyACM* on the remote host. */
async function listRemote(host: string): Promise<{ path: string; vendor: string; product: string }[]> {
  const cmd =
    'for p in /dev/ttyACM*; do [ -e "$p" ] || continue; ' +
    'd="/sys/class/tty/${p#/dev/}/device"; ' +
    `v=$(cat "$d/../idVendor" 2>/dev/null || echo "?"); ` +
    `n=$(cat "$d/../idProduct" 2>/dev/null || echo "?"); ` +
    'echo "$p $v $n"; done';
  const proc = Bun.spawn(["ssh", sshTarget(host), cmd], {
    stdout: "pipe",
    stderr: "inherit",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [path, vendor, product] = l.split(/\s+/);
      return { path, vendor: vendor ?? "?", product: product ?? "?" };
    });
}

/**
 * Discover VLink CDC ports. A port whose sysfs vendor/product is readable must
 * match 303a:1001; an unreadable vendor (?) is kept (name pattern matched).
 * Never throws — an empty list means "no device".
 */
export async function listCdcPorts(host?: string): Promise<string[]> {
  const found = host ? await listRemote(host) : process.platform === "darwin" ? listLocalDarwin() : listLocalLinux();
  return found
    .filter((p) => p.vendor === "?" || p.product === "?" || (p.vendor === USB_VENDOR && p.product === USB_PRODUCT))
    .map((p) => p.path)
    .sort();
}

/** `b0:a6:04:8b:58:f8` → `node-0000b0a6048b58f8` (CDC_PROTOCOL §2: zero-padded to 16 hex). */
export function nodeIdFromMac(mac: string): string {
  const hex = mac.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (hex.length === 0 || hex.length > 16) throw new Error(`not a MAC: ${mac}`);
  return `node-${hex.padStart(16, "0")}`;
}

/** Line-split a spawned process's stdout without pulling in Bun-specific stream APIs. */
export async function* readLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        yield buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
      }
    }
    buf += decoder.decode();
    if (buf.length > 0) yield buf.replace(/\r$/, "");
  } finally {
    reader.releaseLock();
  }
}

/** The reader command for a CDC port: `cat <port>` locally, `ssh <host> cat <port>` remote. */
export function cdcReaderCmd(host: string | undefined, port: string): string[] {
  return host ? ["ssh", sshTarget(host), "cat", port] : ["cat", port];
}
