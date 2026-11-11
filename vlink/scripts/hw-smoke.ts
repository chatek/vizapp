/**
 * ESP32 hardware smoke: run tests/hardware with VLINK_HW=1 and the lab env,
 * failing loudly when the required variables are missing (the test itself
 * skips silently, which is correct for CI but not for a smoke command).
 *
 *   bun run hw:smoke
 *
 * Required: VLINK_HW_PAIRING_CODE, VLINK_HW_WIFI_SSID, VLINK_HW_WIFI_PASSWORD
 * Optional: VLINK_HW_NODE_ALIAS, VLINK_HW_EXPECTED_ENDPOINT, VLINK_HW_CLUSTER,
 *           VLINK_HW_P95_MS (latency gate, default 50)
 *
 * Values are never printed — only which variables are set.
 */
const REQUIRED = ["VLINK_HW_PAIRING_CODE", "VLINK_HW_WIFI_SSID", "VLINK_HW_WIFI_PASSWORD"] as const;
const OPTIONAL = [
  "VLINK_HW_NODE_ALIAS",
  "VLINK_HW_EXPECTED_ENDPOINT",
  "VLINK_HW_CLUSTER",
  "VLINK_HW_P95_MS",
] as const;

const missing = REQUIRED.filter((name) => {
  const value = process.env[name];
  return value === undefined || value.trim() === "";
});
if (missing.length > 0) {
  console.error(`Missing required environment: ${missing.join(", ")}`);
  console.error("See docs/ESP32_LAB.md §hardware-suite for the full procedure.");
  process.exit(1);
}

const set = [...REQUIRED, ...OPTIONAL].filter((name) => {
  const value = process.env[name];
  return value !== undefined && value.trim() !== "";
});
console.log(`Hardware smoke: env set: ${set.join(", ")}`);
console.log(`Latency gate: p95 <= ${process.env.VLINK_HW_P95_MS ?? "50"}ms (VLINK_HW_P95_MS)`);

const child = Bun.spawn({
  cmd: ["bun", "test", "tests/hardware"],
  env: { ...process.env, VLINK_HW: "1" },
  stdout: "inherit",
  stderr: "inherit",
});
const code = await child.exited;
process.exit(code);


export {};