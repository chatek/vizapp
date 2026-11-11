/**
 * VLink maker CLI: stream — open CDC and pretty-print every protocol line.
 *
 *   bun run vlink:stream [--port <path>] [--host danilab]
 *
 * Each device→host line (docs/CDC_PROTOCOL.md §3) is validated as JSON and
 * printed with a direction arrow (`◀ device`); non-JSON lines are printed raw
 * and marked. Ctrl-C exits cleanly (exit 0).
 *
 * Reading is `cat <port>` (or `ssh … cat <port>`): no control lines are touched,
 * so opening the port never resets the board.
 *
 * Exit codes: 0 closed cleanly (Ctrl-C or EOF) · 2 no device found · 1 error.
 */
import { cdcReaderCmd, listCdcPorts, readLines } from "./cdc.ts";

const usage = `Usage:
  bun run vlink:stream [--port <path>] [--host danilab]

  --port <path>   skip discovery, open this CDC port
  --host <name>   remote host (ssh debian@<name>; or a full user@host)

Pretty-prints every CDC line: ◀ = device → host, JSON-validated.
Ctrl-C exits cleanly.

Exit codes: 0 clean exit · 2 no device · 1 error`;

function fail(message: string): never {
  console.error(`vlink:stream: ${message}`);
  process.exit(1);
}

function stamp(): string {
  return new Date().toISOString().slice(11, 19); // HH:MM:SS
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  let port: string | undefined;
  let host: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      console.log(usage);
      return 0;
    }
    if (args[i] === "--port") {
      port = args[++i];
      if (!port) fail("--port requires a value");
    } else if (args[i] === "--host") {
      host = args[++i];
      if (!host) fail("--host requires a value");
    } else fail(`unknown argument: ${args[i]} (see --help)`);
  }

  if (!port) {
    const found = await listCdcPorts(host);
    if (found.length === 0) {
      console.error(
        `vlink:stream: no VLink CDC device found${host ? ` on ${host}` : ""} ` +
          `(looked for 303a:1001; ${process.platform === "darwin" ? "/dev/cu.usbmodem*" : "/dev/ttyACM*"})`,
      );
      return 2;
    }
    if (found.length > 1) {
      console.error(`vlink:stream: multiple CDC devices, pass --port: ${found.join(", ")}`);
      return 1;
    }
    port = found[0];
  }
  console.error(`streaming ${port}${host ? ` (${host})` : ""} — Ctrl-C to stop`);

  const proc = Bun.spawn({ cmd: cdcReaderCmd(host, port), stdout: "pipe", stderr: "inherit" });
  const stdout = proc.stdout;
  if (!stdout) fail(`could not open a reader on ${port}`);

  let closed = false;
  const cleanExit = (): void => {
    if (closed) return;
    closed = true;
    proc.kill();
    console.error("\nvlink:stream: closed");
    process.exit(0);
  };
  process.on("SIGINT", cleanExit);

  try {
    for await (const line of readLines(stdout)) {
      if (line.trim() === "") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        console.log(`${stamp()}  ✗ not-JSON  ${line}`);
        continue;
      }
      console.log(`${stamp()}  ◀ device   ${JSON.stringify(parsed)}`);
    }
  } finally {
    if (!closed) {
      closed = true;
      proc.kill();
      await proc.exited;
      console.error("\nvlink:stream: port closed");
    }
  }
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error(`vlink:stream: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

export {};
