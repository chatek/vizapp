/**
 * Smoke test against the shared pi-a2a NATS server.
 *
 * Subscribes to iot.>, requests bridge status on the configured fabric, prints
 * the reply, and exits:
 *   0  bridge answered ok
 *   1  connection/protocol failure, or the bridge answered with an error
 *   2  no VLink bridge answered (not a pass)
 *
 * It never publishes on agents.>, a2a.>, $SRV.>, or $KV.>.
 */
import { loadConfig, readNatsToken } from "../src/config.ts";
import { createLogger } from "../src/logger.ts";
import { NodeNatsTransport } from "../src/nats/index.ts";
import { normalizeFabricId } from "../src/subjects.ts";
import type { NatsMessage } from "../src/types.ts";

const FALLBACK_FABRIC_ID = "fabric-0000000000000001";
const DEFAULT_TIMEOUT_MS = 5_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const config = loadConfig();
const fabricId = normalizeFabricId(process.argv[2]?.trim() || config.fabricId || FALLBACK_FABRIC_ID);
const subject = `iot.cmd.matter.${fabricId}.bridge.status`;
const timeoutMs = Number.parseInt(process.env.VLINK_SMOKE_TIMEOUT_MS ?? "", 10) || DEFAULT_TIMEOUT_MS;
const logger = createLogger("warn");

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  const timer = setTimeout(resolve, Math.max(0, ms));
  timer.unref?.();
  return promise;
}

async function main(): Promise<number> {
  const token = readNatsToken(config);
  if (!token) {
    console.error(
      `No NATS token. Set VLINK_NATS_TOKEN or provide ${config.natsTokenFile ?? "VLINK_NATS_TOKEN_FILE"}.`,
    );
    return 1;
  }

  const transport = new NodeNatsTransport(config, logger);
  try {
    await transport.connect();
  } catch (error) {
    console.error(
      `Cannot connect to ${config.natsUrl}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }

  const observed: string[] = [];
  const traffic = await transport.subscribe("iot.>", (_error, message: NatsMessage) => {
    if (observed.length < 20) observed.push(message.subject);
  });

  const inbox = `_INBOX.vlink.${config.instanceId}.${crypto.randomUUID()}`;
  const { promise: replied, resolve } = Promise.withResolvers<NatsMessage>();
  const replySub = await transport.subscribe(inbox, (error, message) => {
    if (!error) resolve(message);
  });

  const requestId = crypto.randomUUID();
  const payload = {
    v: 1,
    type: "bridge",
    requestId,
    action: "status",
  } satisfies Record<string, unknown>;

  console.log(`Requesting ${subject} (timeout ${timeoutMs}ms)`);
  transport.publish(subject, encoder.encode(JSON.stringify(payload)), { reply: inbox });
  await transport.flush();

  const reply = await Promise.race([replied, delay(timeoutMs).then(() => undefined)]);
  replySub.unsubscribe();
  traffic.unsubscribe();
  await transport.close();

  if (!reply) {
    console.error(
      `No VLink bridge answered on ${subject} within ${timeoutMs}ms. ` +
        "Start the sidecar (`bun run sidecar`) or an OMP session with VLink enabled. " +
        "If the bridge uses another fabric, pass it as argv[2] or set VLINK_FABRIC_ID.",
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

  if (observed.length > 0) {
    console.log(`Observed iot subjects: ${[...new Set(observed)].join(", ")}`);
  }
  console.log(JSON.stringify(parsed, null, 2));

  if (typeof parsed === "object" && parsed !== null && "ok" in parsed && parsed.ok === false) {
    console.error("Bridge answered but reported an error.");
    return 1;
  }
  return 0;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((error: unknown) => {
    console.error("NATS smoke test failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
