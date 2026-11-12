/**
 * VLink maker CLI: flash — wrap esptool for the VLink ESP32-C6 board.
 *
 *   bun run vlink:flash [image.bin] [--dry-run] [--host danilab] [--port <path>] [--baud 921600] [--yes]
 *
 * Safety rails (operator rules, non-negotiable):
 *   • Before ANY write, the board's BASE MAC is read (esptool read_mac) and MUST
 *     equal b0:a6:04:8b:58:f8 — anything else is REFUSED. This is the VLink
 *     product board; vkey boards and strangers never get flashed.
 *   • Remote mode writes ONLY inside the VLink product namespace
 *     /home/debian/vlink/images/ — ~/vkey-backups is the vkey product and is
 *     never read or written here.
 *   • --dry-run prints the exact esptool invocations (verify + write) and runs
 *     nothing.
 *   • The real path asks for confirmation (y/N) before write_flash; --yes skips.
 *
 * Modes:
 *   local        esptool from $VLINK_ESPTOOL or PATH; images from $VLINK_IMAGES_DIR
 *                or ./images (newest .bin)
 *   --host NAME  ssh debian@NAME; esptool is /home/debian/esp-tools/bin/esptool.py;
 *                images from /home/debian/vlink/images/ (newest .bin)
 *
 * The image is flashed as a full-flash image at offset 0x0.
 *
 * Exit codes: 0 ok (or dry-run) · 2 no device / no image · 1 error or REFUSED.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { listCdcPorts, sshTarget } from "./cdc.ts";

/** The VLink product board (SPEC.md §4.1: BASE MAC b0:a6:04:8b:58:f8 → node-0000b0a6048b58f8). */
const EXPECTED_MAC = "b0:a6:04:8b:58:f8";

const REMOTE_ESPTOOL = "/home/debian/esp-tools/bin/esptool.py";
const REMOTE_IMAGES_DIR = "/home/debian/vlink/images/";
const CHIP = "esp32c6";
const DEFAULT_BAUD = 921600;
/**
 * The board's flash layout (vlink-esp32-c6/README.md §2, the lineage partition
 * table): bootloader at 0x0, partition table at 0x10000, factory app at 0x20000.
 * A single-image burn at 0x0 would brick the board — the three parts and their
 * offsets are the flash command, always.
 */
const FLASH_PARTS = [
  { name: "bootloader", offset: "0x0" },
  { name: "partition-table", offset: "0x10000" },
  { name: "vlink", offset: "0x20000", pattern: /^vlink-/ },
] as const;
const usage = `Usage:
  bun run vlink:flash [vlink-image.bin] [options]

Options:
  --dry-run        print the exact esptool commands; run nothing
  --host <name>    remote flash over ssh (debian@<name>, or a full user@host);
                   uses /home/debian/esp-tools/bin/esptool.py and images in
                   /home/debian/vlink/images/
  --port <path>    skip port discovery, use this CDC port
  --baud <n>       flash baud (default ${DEFAULT_BAUD})
  --yes            skip the y/N confirmation before write_flash

Image: the app image argument, or the newest vlink-*.bin in the images dir
  (local: $VLINK_IMAGES_DIR or ./images · remote: ${REMOTE_IMAGES_DIR}).
The bootloader and partition-table parts are resolved beside it (same dir:
  bootloader.bin, partition-table.bin) and the burn is the full three-part
  layout: bootloader@0x0, partition-table@0x10000, app@0x20000 — the board's
  recorded layout. A missing part is an error, never a guess.

Before flashing, the BASE MAC is verified == ${EXPECTED_MAC}; any other
board is REFUSED (product/board separation is an operator rule).

Exit codes: 0 ok/dry-run · 2 no device or no image · 1 error/REFUSED`;

function fail(message: string): never {
  console.error(`vlink:flash: ${message}`);
  process.exit(1);
}

interface Opts {
  image?: string;
  dryRun: boolean;
  host?: string;
  port?: string;
  baud: number;
  yes: boolean;
}

function parseArgs(): Opts {
  const args = process.argv.slice(2);
  const o: Opts = { dryRun: false, baud: DEFAULT_BAUD, yes: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--yes" || a === "-y") o.yes = true;
    else if (a === "--host") {
      o.host = args[++i];
      if (!o.host) fail("--host requires a value");
    } else if (a === "--port") {
      o.port = args[++i];
      if (!o.port) fail("--port requires a value");
    } else if (a === "--baud") {
      const b = Number(args[++i]);
      if (!Number.isInteger(b) || b <= 0) fail("--baud requires a positive integer");
      o.baud = b;
    } else if (a.startsWith("--")) {
      fail(`unknown argument: ${a} (see --help)`);
    } else {
      if (o.image) fail(`two images given: ${o.image} and ${a}`);
      o.image = a;
    }
  }
  return o;
}

/** esptool prefix as an argv array (spawned directly locally, joined over ssh). */
function esptoolCmd(o: Opts, port: string): string[] {
  const base = o.host
    ? ["ssh", sshTarget(o.host), REMOTE_ESPTOOL]
    : [process.env.VLINK_ESPTOOL ?? "esptool"];
  return [...base, "--chip", CHIP, "--port", port];
}

/** Newest vlink-*.bin (the app image) in a local dir, by mtime. */
function newestLocalBin(dir: string): string | undefined {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return undefined;
  const bins = readdirSync(dir).filter((f) => /^vlink-.*\.bin$/.test(f));
  if (bins.length === 0) return undefined;
  const sorted = bins
    .map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return join(dir, sorted[0].f);
}

/** Newest vlink-*.bin in the remote images dir over one ssh round trip. */
async function newestRemoteBin(o: Opts): Promise<string | undefined> {
  const cmd = `ls -t ${REMOTE_IMAGES_DIR}vlink-*.bin 2>/dev/null | head -1`;
  const proc = Bun.spawn(["ssh", sshTarget(o.host!), cmd], { stdout: "pipe", stderr: "inherit" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const first = out.split("\n").map((l) => l.trim()).find(Boolean);
  return first;
}

/** The other two parts beside the app image; presence is checked per-mode. */
function siblingPath(image: string, name: string): string {
  return join(image, "..", `${name}.bin`);
}

/** Local: all three parts must exist on disk. Remote: one ssh stat round trip. */
async function resolveParts(o: Opts, image: string): Promise<Record<string, string> | undefined> {
  const parts: Record<string, string> = { vlink: image };
  if (!o.host) {
    for (const p of FLASH_PARTS) {
      if (p.name === "vlink") continue;
      const path = siblingPath(image, p.name);
      if (!existsSync(path)) {
        console.error(`vlink:flash: missing ${p.name} part beside the app image: ${path}`);
        return undefined;
      }
      parts[p.name] = path;
    }
    return parts;
  }
  const cmd = `cd $(dirname ${image}) && for f in bootloader.bin partition-table.bin; do [ -f "$f" ] && echo "$f" || echo "MISSING:$f"; done`;
  const proc = Bun.spawn(["ssh", sshTarget(o.host), cmd], { stdout: "pipe", stderr: "inherit" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.some((l) => l.startsWith("MISSING:"))) {
    for (const l of lines.filter((x) => x.startsWith("MISSING:"))) {
      console.error(`vlink:flash: missing ${l.slice("MISSING:".length)} beside the app image on ${o.host}`);
    }
    return undefined;
  }
  const dir = image.replace(/[^/]*$/, "");
  const byName = new Map(lines.map((l) => [l.replace(/\.bin$/, ""), dir + l]));
  for (const p of FLASH_PARTS) {
    if (p.name === "vlink") continue;
    const path = byName.get(p.name);
    if (!path) {
      console.error(`vlink:flash: could not resolve ${p.name} on ${o.host}`);
      return undefined;
    }
    parts[p.name] = path;
  }
  return parts;
}

async function findPort(o: Opts): Promise<string | undefined> {
  if (o.port) return o.port;
  const found = await listCdcPorts(o.host);
  if (found.length === 0) {
    console.error(
      `vlink:flash: no VLink CDC device found${o.host ? ` on ${o.host}` : ""} ` +
        `(looked for 303a:1001; ${process.platform === "darwin" ? "/dev/cu.usbmodem*" : "/dev/ttyACM*"})`,
    );
  }
  if (found.length > 1) {
    console.error(`vlink:flash: multiple CDC devices, pass --port: ${found.join(", ")}`);
    return undefined;
  }
  return found[0];
}

async function confirm(prompt: string): Promise<boolean> {
  process.stdout.write(`${prompt} `);
  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  reader.releaseLock();
  const answer = value ? new TextDecoder().decode(value).trim().toLowerCase() : "";
  return answer === "y" || answer === "yes";
}

async function main(): Promise<number> {
  const o = parseArgs();

  // 1. app image — argument first, else newest vlink-*.bin in the images dir
  let image = o.image;
  if (!image) {
    if (o.host) {
      image = await newestRemoteBin(o);
    } else {
      const dir = process.env.VLINK_IMAGES_DIR ?? "./images";
      image = newestLocalBin(dir);
    }
    if (!image) {
      console.error(
        `vlink:flash: no image given and no vlink-*.bin found in ` +
          `${o.host ? REMOTE_IMAGES_DIR + " (remote)" : process.env.VLINK_IMAGES_DIR ?? "./images"}`,
      );
      return 2;
    }
    console.log(`image: ${image} (newest vlink-*.bin)`);
  } else if (!o.host) {
    // local image path must exist; remote paths are trusted to the remote run
    if (!existsSync(image)) {
      console.error(`vlink:flash: image not found: ${image}`);
      return 2;
    }
  }

  // 2. the full three-part layout beside the app image
  const parts = await resolveParts(o, image);
  if (!parts) return 2;

  // 3. port
  const port = await findPort(o);
  if (!port) return 2;

  // 4. esptool invocations
  const verifyCmd = [...esptoolCmd(o, port), "read_mac"];
  const flashArgs = ["--baud", String(o.baud), "write_flash"];
  for (const p of FLASH_PARTS) flashArgs.push(p.offset, parts[p.name]);
  const flashCmd = [...esptoolCmd(o, port), ...flashArgs];

  if (o.dryRun) {
    console.log(`port:    ${port}${o.host ? ` (${o.host})` : ""}`);
    console.log(`parts:   ${FLASH_PARTS.map((p) => `${parts[p.name]} @ ${p.offset}`).join("\n         ")}`);
    console.log(`\n[DRY RUN] step 1 — verify BASE MAC == ${EXPECTED_MAC}:`);
    console.log(`  ${verifyCmd.join(" ")}`);
    console.log(`\n[DRY RUN] step 2 — flash (only run if step 1 matches):`);
    console.log(`  ${flashCmd.join(" ")}`);
    console.log(`\nnothing was executed.`);
    return 0;
  }

  // 5. real path: verify MAC first, refuse anything else
  console.log(`reading BASE MAC from ${port} …`);
  const verify = Bun.spawn({ cmd: verifyCmd, stdout: "pipe", stderr: "inherit" });
  const out = await new Response(verify.stdout).text();
  const rc = await verify.exited;
  if (rc !== 0) {
    console.error(`vlink:flash: read_mac failed (exit ${rc}) — nothing was flashed`);
    return 1;
  }
  // esptool prints several MACs; the gate keys on the BASE MAC line (the
  // eFuse identity the board is bound by). The first generic "MAC:" line is
  // the USB interface MAC (base + ff:fe) and must NOT be used — it mismatched
  // once and refused a legitimate board.
  const baseMac = out.match(/BASE MAC:\s*((?:[0-9a-f]{2}:){5}[0-9a-f]{2})/i)?.[1];
  const norm = (m: string): string => m.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (!baseMac) {
    console.error(`vlink:flash: could not parse a BASE MAC from esptool output — REFUSING (nothing flashed)`);
    return 1;
  }
  if (norm(baseMac) !== norm(EXPECTED_MAC)) {
    console.error(`vlink:flash: REFUSED — board BASE MAC ${baseMac} != VLink board ${EXPECTED_MAC}`);
    console.error(`vlink:flash: product/board separation is an operator rule; nothing was flashed.`);
    return 1;
  }
  console.log(`BASE MAC ${baseMac} ✓ (node-0000${norm(baseMac)})`);

  // 6. flash, after confirmation
  if (!o.yes) {
    const ok = await confirm(`flash all three parts to ${port}? [y/N]`);
    if (!ok) {
      console.error("vlink:flash: aborted — nothing was flashed");
      return 1;
    }
  }
  console.log(`flashing ${image} + bootloader + partition table …`);
  const flashProc = Bun.spawn({ cmd: flashCmd, stdout: "inherit", stderr: "inherit" });
  const code = await flashProc.exited;
  if (code !== 0) console.error(`vlink:flash: write_flash failed (exit ${code})`);
  return code;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error(`vlink:flash: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

export {};
