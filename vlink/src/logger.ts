/**
 * Minimal structured logger. One JSON object per line, always on stderr by
 * default. Secret-shaped keys are redacted before serialization, and the
 * logger never throws into the caller — a broken sink must not break the bridge.
 */

import type { Logger, LogLevel } from "./types.ts";

export type { Logger } from "./types.ts";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Keys matching this pattern are replaced wholesale; values are never inspected. */
const SECRET_KEY = /token|password|secret|seed|wifi.*password/i;
const REDACTED = "[redacted]";
const MAX_DEPTH = 6;

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;

  if (depth >= MAX_DEPTH) return "[truncated]";

  if (value instanceof Error) {
    return { name: value.name, message: redactValue(value.message, depth + 1, seen) };
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const object = value as object;
  if (seen.has(object)) return "[circular]";
  seen.add(object);

  try {
    if (Array.isArray(object)) {
      return object.map((item) => redactValue(item, depth + 1, seen));
    }
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(object as Record<string, unknown>)) {
      out[key] = SECRET_KEY.test(key) ? REDACTED : redactValue(entry, depth + 1, seen);
    }
    return out;
  } catch {
    return "[unserializable]";
  } finally {
    seen.delete(object);
  }
}

function redactFields(fields: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!fields) return {};
  const redacted = redactValue(fields, 0, new WeakSet<object>());
  if (redacted && typeof redacted === "object" && !Array.isArray(redacted)) {
    return redacted as Record<string, unknown>;
  }
  return {};
}

function defaultSink(line: string): void {
  try {
    process.stderr.write(`${line}\n`);
  } catch {
    // stderr closed; nothing sensible left to do.
  }
}

/**
 * Create a logger at `level`. Messages below the level are dropped before any
 * field processing. `sink` receives one serialized line, without the newline.
 */
export function createLogger(
  level: LogLevel,
  sink: (line: string) => void = defaultSink,
): Logger {
  const threshold = LEVEL_ORDER[level] ?? LEVEL_ORDER.info;

  const build = (baseFields: Record<string, unknown>): Logger => {
    const write = (messageLevel: LogLevel, message: string, fields?: Record<string, unknown>): void => {
      if (LEVEL_ORDER[messageLevel] < threshold) return;

      let line: string;
      try {
        const record: Record<string, unknown> = {
          ts: new Date().toISOString(),
          level: messageLevel,
          msg: String(message),
          ...redactFields(baseFields),
          ...redactFields(fields),
        };
        line = JSON.stringify(record);
      } catch {
        try {
          line = JSON.stringify({ ts: Date.now(), level: messageLevel, msg: String(message) });
        } catch {
          line = `[vlink] ${messageLevel}: log serialization failed`;
        }
      }

      try {
        sink(line);
      } catch {
        // A failing sink must never surface as a bridge error.
      }
    };

    return {
      debug: (message, fields) => write("debug", message, fields),
      info: (message, fields) => write("info", message, fields),
      warn: (message, fields) => write("warn", message, fields),
      error: (message, fields) => write("error", message, fields),
      child: (fields) => build({ ...baseFields, ...redactFields(fields) }),
    };
  };

  return build({});
}
