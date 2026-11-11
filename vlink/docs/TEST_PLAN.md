# VLink Test Plan

**Scope:** `vclaw-desktop/vlink` scaffold and the first ESP32 hardware bring-up.
**Rule:** a green unit suite is not evidence that a device works. Each layer below has a
different proof obligation.

---

## 1. Proof obligations

| Layer | Proves | Does not prove |
|---|---|---|
| Unit | Subject mapping, config precedence, payload validation, router dispatch, lifecycle transitions | NATS wire behavior, Matter protocol behavior |
| Integration (real NATS + simulator) | Request-reply, queue groups, telemetry publication, end-to-end command path with a deterministic device | ESP32 firmware, BLE, IPv6 link-local routing |
| Matter.js smoke | Controller/fabric/controller-node creation on this host | A commissioned device |
| Hardware | BLE commissioning, Wi-Fi operational transport, real cluster reads/commands, latency | Production certification |

The hardware layer is the only one that can close the PRD's ESP32 acceptance criteria.

---

## 2. Unit tests (`bun test tests/unit`)

### 2.1 Subject taxonomy (`subjects.test.ts`)

| Case | Assertion |
|---|---|
| Fabric ID `0x0000000000000001` | `fabric-0000000000000001` |
| Node ID `0x2a` | `node-000000000000002a` |
| Cluster `OnOff` | `onOff` |
| Attribute `LocalTemperature` | `localTemperature` |
| Telemetry subject | `iot.matter.<fabric>.<node>.<endpoint>.<cluster>.<attribute>` |
| Command subject | `iot.cmd.matter.<fabric>.<node>.<endpoint>.<cluster>.<command>` |
| Bridge subject | `iot.cmd.matter.<fabric>.bridge.<action>` |
| Parse device command | Reconstructs fabric/node/endpoint/cluster/command |
| Parse bridge command | Reconstructs action |
| Wildcard subscribe | `iot.cmd.matter.>` matches device and bridge subjects |
| Invalid token (`a.b`, `a*`, empty) | Throws `VLinkError` with `SUBJECT_TOKEN_INVALID` |
| Non-integer endpoint | Throws `ENDPOINT_INVALID` |
| Round-trip property | `parseCommandSubject(build(x))` equals `x` for generated inputs |

### 2.2 Config (`config.test.ts`)

| Case | Assertion |
|---|---|
| No env/file | Defaults: `nats://127.0.0.1:14222`, token file `~/.config/pi-a2a/server.seed`, mode `matter` |
| Env overrides file | `VLINK_NATS_URL` wins |
| File overrides default | `~/.omp/vlink/config.json` value wins |
| Token file | Read and trimmed; trailing newline removed |
| Missing token file | `undefined`, no crash; connection will fail with a named error |
| `VLINK_WIFI_PASSWORD` | Never included in `redactConfig()` output |
| Invalid mode | Throws `CONFIG_INVALID` |
| State dir creation | `ensureStateDir()` is idempotent |

### 2.3 Payload validation (`payloads.test.ts`)

| Case | Assertion |
|---|---|
| `v: 1`, `type: "command"`, required fields | Accepted |
| Missing `v` / wrong version | `PAYLOAD_INVALID` |
| Missing `nodeId` / `endpointId` / `cluster` / `command` | `PAYLOAD_INVALID` |
| Unknown bridge action | `BRIDGE_ACTION_UNKNOWN` |
| Non-object JSON | `PAYLOAD_INVALID` |
| Oversized payload (> 64 KiB) | `PAYLOAD_TOO_LARGE` |
| Unknown extra fields | Ignored (forward compatibility) |

### 2.4 Command router (`command-router.test.ts`)

Use a deterministic `FakeMatterAdapter` and a fake `NatsTransport`. No real NATS.

| Case | Assertion |
|---|---|
| Device command success | Adapter called with exact path; reply `ok:true`, `requestId` echoed |
| Device command failure | Reply `ok:false`, `error.code`, HTTP-style no throw |
| No `msg.reply` | Command still executes, no publish to undefined reply |
| Unknown node | `NODE_NOT_FOUND` |
| Timeout | `COMMAND_TIMEOUT` within bounded time |
| Bridge `status` | Health payload |
| Bridge `list` | Node list |
| Bridge `discover` | Discovery list, timeout respected |
| Bridge `commission` | Adapter called; result includes node info |
| Bridge `read` | Attribute value |
| Bridge `write` | Attribute value; unsupported write is `UNSUPPORTED_ATTRIBUTE` |
| Bridge `decommission` | Adapter called |
| Malformed JSON | `PAYLOAD_INVALID` reply, no crash |
| Concurrent commands | Each reply matches its own request; no cross-talk |

### 2.5 Runtime lifecycle (`runtime.test.ts`)

| Case | Assertion |
|---|---|
| `start()` twice | One NATS connect, one Matter start |
| `stop()` twice | Idempotent; subscriptions closed |
| NATS connect failure | State `degraded`, error retained, OMP-facing call does not throw |
| Matter start failure | State `degraded`, NATS status still available |
| Attribute event | Published to the exact telemetry subject |
| Device event | Published to `iot.event.matter...` |
| Health interval | Publishes `iot.bridge.vlink.<instance>.status` |
| Stop during start | Settles in `stopped`, no dangling subscriptions |
| Redaction | Token/Wi-Fi password absent from all logs and health payloads |

### 2.6 Node registry (`registry.test.ts`)

| Case | Assertion |
|---|---|
| Set alias | Persisted to `state.json` atomically |
| Reload | Alias survives process restart |
| Duplicate node | Last alias wins, one entry |
| Corrupt state file | Starts empty, does not crash |
| File mode | `0600` |

---

## 3. Integration tests (`bun test tests/integration`)

### 3.1 NATS transport (`nats-transport.test.ts`)

**Fixture:** spawn `nats-server -p <free-port> -m <free-port> --auth <token>` in a temp dir; skip
with a clear message if the binary is absent. If `nats-server` is unavailable, the suite must not
silently pass — it reports `SKIP: nats-server not installed`.

| Case | Assertion |
|---|---|
| Connect with token | `isConnected()` true |
| Connect with wrong token | Named auth error |
| Publish/subscribe | Payload bytes match |
| Request-reply | Responder publishes to `msg.reply`; requester receives |
| Queue group | 2 subscribers, 1 delivery per message |
| Reconnect | Restart server; transport reconnects and re-subscribes |
| Close | No handlers fire after close |

### 3.2 Simulator end-to-end (`sim-e2e.test.ts`)

Start `VLinkRuntime` with `matterMode: "sim"` and a real local NATS server.

| Step | Assertion |
|---|---|
| `bridge.status` request | `ok:true`, state `ready` |
| `bridge.commission` with simulator | Node appears in `bridge.list` |
| `bridge.read` `onOff.onOff` | `false` |
| Publish `onOff.toggle` with reply | Reply `ok:true`, `data.onOff === true` |
| Telemetry subscription | Receives `iot.matter.<fabric>.<node>.1.onOff.onOff` with `true` |
| `bridge.decommission` | Node removed; later command `NODE_NOT_FOUND` |
| 100 sequential commands | No lost replies; p95 latency recorded |

### 3.3 Shared `pi-a2a` NATS (`shared-nats.test.ts`, opt-in)

`VLINK_SHARED_NATS=1 bun test tests/integration/shared-nats.test.ts`

| Case | Assertion |
|---|---|
| Connect to `127.0.0.1:14222` with `server.seed` | Connected |
| Publish `iot.bridge.vlink.<instance>.probe` | Succeeds |
| Subscribe `iot.>` | Only VLink messages observed; no `agents.>`/`a2a.>` traffic |
| `pi-a2a` still healthy | `nats pub agents.hb.test` succeeds concurrently |

This test is **read-mostly** and must not publish on `agents.>` or `a2a.>`.

### 3.4 Matter.js controller smoke (`matter-smoke.test.ts`, opt-in)

`VLINK_MATTER_SMOKE=1 bun test tests/integration/matter-smoke.test.ts`

| Case | Assertion |
|---|---|
| Load `@matter/main` + `@matter/nodejs` under Bun | Imports succeed |
| Create controller `ServerNode` with `ControllerBehavior` | Starts and stops |
| Fabric authority / default fabric | Fabric ID is readable |
| Storage path | Uses temp dir, no `~/.matter` pollution |
| BLE import (if `VLINK_BLE_ENABLED`) | Import succeeds; scanner availability is reported honestly |

No device is required. This test catches API drift in Matter.js before a lab session.

---

## 4. Hardware tests (`VLINK_HW=1 bun test tests/hardware`)

**Required:** one ESP32-C3 or ESP32-S3 running an `esp-matter` example (light or thermostat),
2.4 GHz Wi-Fi, a host with working BLE, and the `pi-a2a` NATS server. A second device is optional
for multi-node tests.

Configuration is supplied by environment variables; never commit them:

```bash
export VLINK_HW_PAIRING_CODE=34970112332
export VLINK_HW_WIFI_SSID=lab-iot
export VLINK_HW_WIFI_PASSWORD='...'
export VLINK_HW_NODE_ALIAS=desk-lamp
export VLINK_HW_EXPECTED_ENDPOINT=1
export VLINK_HW_CLUSTER=onOff
export VLINK_HW_P95_MS=50   # optional; the suite's p95 gate
```

| ID | Test | Pass condition |
|---|---|---|
| HW-01 | BLE discovery | Device appears with matching discriminator/vendor before timeout |
| HW-02 | BLE + Wi-Fi commissioning | `bridge.commission` returns a node ID; device joins Wi-Fi |
| HW-03 | Node listing | Node ID, alias, endpoint 1, connected state |
| HW-04 | Read `onOff` | `false` (or firmware's documented initial state) |
| HW-05 | Toggle | Reply `ok:true`; device physically changes; telemetry follows |
| HW-06 | Telemetry subject | Exact `iot.matter.<fabric>.<node>.1.onOff.onOff` message |
| HW-07 | Latency | 20 toggles; p95 agent→NATS→VLink→device ACK ≤ `VLINK_HW_P95_MS` (default 50 ms) on LAN; record min/median/p95/max |
| HW-08 | Agent path | Publish from a separate NATS client (simulating `pi-a2a`); reply received |
| HW-09 | Disconnect/reconnect | Power-cycle device; node reconnects; telemetry resumes |
| HW-10 | IP commissioning fallback | Commission a second device with `transport: "ip"` |
| HW-11 | Decommission | Device removed; command returns `NODE_NOT_FOUND`; device leaves fabric |
| HW-12 | BLE unavailable | With BLE disabled, status reports `bleAvailable:false`; IP path still works |
| HW-13 | No secret leakage | Transcript, logs, health payloads contain no Wi-Fi password or token |

**Evidence to capture:** firmware version/commit, ESP32 model, host OS, Matter.js version,
commissioning log excerpt (secrets redacted), latency table, and the exact NATS subjects observed.

### 4.1 Failure-mode tests

| Case | Expected |
|---|---|
| Wrong pairing code | `COMMISSION_FAILED` with Matter status; no partial node |
| Wrong Wi-Fi password | Commissioning fails before `CommissioningComplete`; device returns to commissionable |
| Device offline | Command replies `DEVICE_OFFLINE`; no hang |
| NATS down | VLink state `degraded`; OMP session stays alive |
| VLink sidecar killed | OMP tools report bridge unavailable; restart recovers |
| Duplicate VLink instances | Queue group ensures one command execution |

---

## 5. OMP plugin verification

| Step | Command | Pass condition |
|---|---|---|
| Link | `omp plugin link "$PWD"` | `omp plugin list` shows `@chatek/vlink` enabled |
| Load | restart OMP | No extension-load error in `~/.omp/logs/` |
| Status | `/vlink-status` | Shows NATS connected, Matter mode, node count |
| Tool discovery | ask OMP to call `vlink_status` | Structured result, no session crash |
| Shutdown | `/exit` then restart | Bridge stops; no orphaned NATS subscriptions |
| Sidecar mode | `VLINK_MODE=sidecar` | OMP tools reach the sidecar; killing sidecar does not kill OMP |

---

## 6. Exit criteria

The scaffold is **hardware-ready** when:

1. `bun run typecheck` passes.
2. Unit and integration suites pass locally, with no skipped test presented as a pass.
3. NATS smoke test passes against the live `pi-a2a` server.
4. OMP loads the extension and `/vlink-status` answers.
5. HW-01 through HW-07 pass on at least one ESP32-C3/S3; HW-08 through HW-13 are recorded
   as pass or explicitly blocked with evidence.

The scaffold is **complete for the initial install** when 1–4 pass. Hardware closure requires 5.
