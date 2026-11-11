/**
 * VLink maker CLI: attach — find the board, open CDC, wait for the `hello` line.
 *
 *   bun run vlink:attach [--port <path>] [--host danilab]
 *
 * Discovery: USB 303a:1001 — macOS /dev/cu.usbmodem* (name pattern; macOS has no
 * sysfs vendor check), Linux /dev/ttyACM* (vendor verified via sysfs when readable).
 * `--host danilab` runs discovery and the read over ssh (debian@danilab).
 *
 * The device sends `hello` ~200 ms after boot and re-hellos every 5 s while
 * unacked (docs/CDC_PROTOCOL.md §7). If the host bridge already acked it, no
 * hello will arrive — attach expects a booting/unattached device.
 *
 * Reading is `cat <port>` (or `ssh … cat <port>`): no control lines are touched,
 * so opening the port never resets the board.
 *
 * Exit codes: 0 hello received · 2 no device (none found, or no hello within
 * the 5 s window + 5 s retry) · 1 error.
 */
import { cdcReaderCmd, listCdcPorts, nodeIdFromMac, readLines } from "./cdc.ts";

const HELLO_WINDOW_MS = 5_000; // per CDC_PROTOCOL §7: unacked device re-hellos every 5 s
const RETRIES = 1; // one retry: 5 s window, 5 s retry, 10 s total

const usage = `Usage:
  bun run vlink:attach [--port <path>] [--host danilab]

  --port <path>   skip discovery, open this CDC port
  --host <name>   remote host (ssh debian@<name>; or a full user@host)

Prints the device id, firmware version and resolved node id
(node-<BASE MAC zero-padded to 16 hex>) from the hello line.

Exit codes: 0 hello · 2 no device / no hello in 10 s · 1 error`;

interface HelloLine {
  v?: number;
  type?: string;
  device?: string;
  fw?: string;
  mac?: string;
}

function fail(message: string): never {
  console.error(`vlink:attach: ${message}`);
  process.exit(1);
}

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, Math.max(0, ms));
  timer.unref?.();
  return promise;
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
        `vlink:attach: no VLink CDC device found${host ? ` on ${host}` : ""} ` +
          `(looked for 303a:1001; ${process.platform === "darwin" ? "/dev/cu.usbmodem*" : "/dev/ttyACM*"})`,
      );
      return 2;
    }
    if (found.length > 1) {
      console.error(`vlink:attach: multiple CDC devices, pass --port: ${found.join(", ")}`);
      return 1;
    }
    port = found[0];
  }
  console.error(`listening on ${port}${host ? ` (${host})` : ""} …`);

  const proc = Bun.spawn({ cmd: cdcReaderCmd(host, port), stdout: "pipe", stderr: "inherit" });
  const stdout = proc.stdout;
  if (!stdout) fail(`could not open a reader on ${port}`);

  const deadline = Date.now() + HELLO_WINDOW_MS * (RETRIES + 1);
  let ignored = 0;
  try {
    const lines = readLines(stdout)[Symbol.asyncIterator]();
    for (;;) {
      const next = await Promise.race([
        lines.next().then((r) => ({ line: r as IteratorResult<string> })),
        delay(deadline - Date.now()).then(() => ({ timeout: true as const })),
      ]);
      if ("timeout" in next) {
        console.error(
          `vlink:attach: no hello within ${(HELLO_WINDOW_MS * (RETRIES + 1)) / 1000} s ` +
            `(device present but silent — already acked by the host bridge? CDC_PROTOCOL §7)`,
        );
        return 2;
      }
      if (next.line.done) {
        // stream ended (device unplugged / ssh dropped) before hello
        console.error(`vlink:attach: port closed before hello (${ignored} non-JSON lines ignored)`);
        return 2;
      }
      const line: string = next.line.value;
      if (line.trim() === "") continue;
      let msg: HelloLine | undefined;
      try {
        msg = JSON.parse(line) as HelloLine;
      } catch {
        ignored++; // non-JSON noise on the console — not an error
        continue;
      }
      if (msg.type === "hello") {
        const mac = msg.mac ?? "?";
        let node: string;
        try {
          node = nodeIdFromMac(mac);
        } catch {
          node = "node-<invalid mac>";
        }
        console.log(`hello  device=${msg.device ?? "?"} fw=${msg.fw ?? "?"} mac=${mac}`);
        console.log(`       node=${node} (${port})`);
        return 0;
      }
      // other protocol lines before hello (tick, state) are fine — keep waiting
    }
  } finally {
    proc.kill();
    await proc.exited;
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error(`vlink:attach: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });

export {};
