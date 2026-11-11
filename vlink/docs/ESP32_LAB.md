# ESP32 Hardware Lab

This is the bring-up procedure for the first VLink hardware test: one ESP32-C3 or ESP32-S3
running an Espressif `esp-matter` example, commissioned over BLE, operated over Wi-Fi, and
controlled through the shared `pi-a2a` NATS bus.

**What this proves:** BLE commissioning, Wi-Fi operational transport, Matter attribute
subscriptions, command request-reply, and the end-to-end latency target.

**What it does not prove:** Matter certification, production provisioning, Thread, OTA, or
multi-fabric isolation.

---

## 1. Bill of materials

| Item | Notes |
|---|---|
| ESP32-C3-DevKitM-1 or ESP32-S3-DevKitC-1 | 4 MB flash minimum; C3 is the low-cost reference. |
| USB data cable | Power-only cables are a common false failure. |
| 2.4 GHz Wi-Fi AP | ESP32 Matter examples do not join 5 GHz-only SSIDs. |
| macOS host with Bluetooth | For BLE commissioning. Linux works with noble prerequisites. |
| `pi-a2a` local NATS server | `nats://127.0.0.1:14222`, token at `~/.config/pi-a2a/server.seed`. |
| Second machine or terminal | To publish commands as an agent while VLink runs. |

Keep the device within BLE range during commissioning. Once commissioned, it only needs Wi-Fi.

---

## 2. Toolchain

`esp-matter` pins its own ESP-IDF and connectedhomeip versions. Follow the versions in the
`esp-matter` README for the branch you use; do not mix a random ESP-IDF.

```bash
# Outside this repo
git clone --recursive https://github.com/espressif/esp-matter.git
cd esp-matter
./install.sh
. ./export.sh
```

Verify:

```bash
idf.py --version
echo "$IDF_PATH"
```

The `light` example uses a custom partition table and enables NimBLE for commissioning:

```bash
cd examples/light
idf.py set-target esp32c3      # or esp32s3
idf.py build
idf.py -p /dev/cu.usbmodemXXXX flash monitor
```

On macOS the serial device is usually `/dev/cu.usbmodem*`; on Linux `/dev/ttyUSB*` or
`/dev/ttyACM*`. Add the user to `dialout` on Linux if flashing is denied.

### 2.1 What the serial log must show

- `SetupQRCode: [MT:...]`
- `Manual pairing code: [34970112332]` (the value differs per build)
- BLE advertising starts (`BLE advertising started` or equivalent)
- No repeated `NimBLE` allocation failures

Record the **manual pairing code**. That is what VLink consumes. Do not commit it.

### 2.2 Optional: a thermostat image

Repeat with `examples/thermostat` if your board supports it, or use the light for v1 and add
the thermostat after the light path is green. One working device is enough to close HW-01–HW-07;
a second device is for multi-node and IP-commissioning tests.

---

## 3. Host prerequisites

### 3.1 NATS

The `pi-a2a` server should already be running:

```bash
lsof -nP -iTCP:14222 -sTCP:LISTEN
ls -l ~/.config/pi-a2a/server.seed
```

If it is not running, start it the same way `pi-a2a` does (launchd on macOS or the project's
setup script). Do **not** start a second broker on 4222 for VLink.

### 3.2 Bluetooth permission (macOS)

The first BLE scan triggers a macOS Bluetooth permission prompt for the terminal/OMP process.
Grant it, then restart the process. If BLE still fails:

```bash
# Check the controller is visible to the OS
system_profiler SPBluetoothDataType | head -40
```

`@matter/nodejs-ble` uses noble as the central. BLE commissioning from a headless SSH session
or a sandboxed app may be blocked; use IP commissioning as the fallback.

### 3.3 Build and test the scaffold

```bash
cd vclaw-desktop/vlink
bun install
bun run typecheck
bun test
```

Then link the OMP plugin:

```bash
omp plugin link "$PWD"
omp plugin list
```

Restart OMP and run `/vlink-status`.

---

## 4. Commissioning

### 4.1 Via OMP tool (recommended)

Set the Wi-Fi credentials in the environment so they are not in the tool-call transcript:

```bash
export VLINK_WIFI_SSID='lab-iot'
export VLINK_WIFI_PASSWORD='...'
```

Then ask OMP to run `vlink_commission` with:

```json
{
  "pairingCode": "34970112332",
  "transport": "ble-wifi",
  "nodeName": "desk-lamp",
  "timeoutMs": 120000
}
```

Expected: the tool reports progress, then returns the Matter node ID and endpoint list. The
device reboots onto Wi-Fi and appears in `vlink_nodes`.

### 4.2 Via NATS directly

```bash
TOKEN=$(tr -d '\n' < ~/.config/pi-a2a/server.seed)
nats --server nats://127.0.0.1:14222 --user "$TOKEN" request \
  iot.cmd.matter.fabric-0000000000000001.bridge.commission \
  '{"v":1,"type":"bridge","action":"commission","pairingCode":"34970112332","transport":"ble-wifi","wifi":{"ssid":"lab-iot","password":"..."},"nodeName":"desk-lamp","timeoutMs":120000}' \
  --timeout 130s
```

The reply is a `CommandResult`. A failure reply includes a Matter status or a VLink error code;
it does not hang.

### 4.3 IP fallback

If the device is already on Wi-Fi (for example, commissioned once and factory-reset without
clearing Wi-Fi), or BLE is unavailable:

```json
{
  "pairingCode": "34970112332",
  "transport": "ip",
  "nodeName": "desk-lamp"
}
```

If discovery does not find it, pass the device IP in a future `knownAddress` option; v1's
discovery is mDNS/BLE based.

---

## 5. Verification

Replace `<fabric>` and `<node>` with the values from `vlink_nodes`.

### 5.1 Read state

```bash
nats --server nats://127.0.0.1:14222 --user "$TOKEN" request \
  iot.cmd.matter.<fabric>.bridge.read \
  '{"v":1,"type":"bridge","action":"read","nodeId":"<node>","endpointId":1,"cluster":"onOff","attribute":"onOff"}' \
  --timeout 5s
```

### 5.2 Toggle and observe telemetry

Terminal A:

```bash
nats --server nats://127.0.0.1:14222 --user "$TOKEN" sub 'iot.matter.>'
```

Terminal B:

```bash
nats --server nats://127.0.0.1:14222 --user "$TOKEN" request \
  iot.cmd.matter.<fabric>.<node>.1.onOff.toggle \
  '{"v":1,"type":"command","requestId":"lab-toggle-1"}' --timeout 5s
```

Expected: the request returns `ok:true`; the subscription prints a telemetry message on
`iot.matter.<fabric>.<node>.1.onOff.onOff` with the new value.

### 5.3 Automated hardware suite

```bash
export VLINK_HW=1
export VLINK_HW_PAIRING_CODE=34970112332
export VLINK_HW_WIFI_SSID='lab-iot'
export VLINK_HW_WIFI_PASSWORD='...'
export VLINK_HW_NODE_ALIAS='desk-lamp'
export VLINK_HW_EXPECTED_ENDPOINT=1
export VLINK_HW_CLUSTER=onOff
bun run test:hw
```

The suite records min/median/p95/max for 20 toggles. The PRD target is p95 < 50 ms on a LAN;
record the actual numbers rather than asserting only "fast".

---

## 6. Failure triage

| Symptom | Likely cause | Check |
|---|---|---|
| No BLE scan results | macOS permission, noble failure, device not advertising | `vlink_status` → `bleAvailable`; serial log; Bluetooth permission |
| Commissioning times out at PASE | Wrong pairing code, device already commissioned, BLE collision | Serial log; factory reset; one BLE central at a time |
| Commissioning succeeds, node offline | Wrong Wi-Fi credentials, 5 GHz-only AP, IPv6/mDNS blocked | Serial log; AP band; `ping6`/mDNS; try IP path |
| `vlink_status` says NATS disconnected | `pi-a2a` server down or token rotated | `lsof :14222`; token file mtime; `nats pub` smoke |
| Commands return `DEVICE_OFFLINE` | Device asleep/off Wi-Fi | Power-cycle; check Wi-Fi; keep device awake |
| Telemetry never appears | Subscription failed or cluster unsupported | `vlink_nodes`; Matter.js logs; try `bridge.read` first |
| OMP session crashes on start | Matter/BLE native failure in-process | Run `bun run sidecar` as a separate process; OMP-side sidecar supervision is not wired yet |
| Two VLink instances both execute | Queue group not set | Check `VLINK_COMMAND_QUEUE`; `vlink_status` instance ID |

### 6.1 Reset a device

Factory reset procedure depends on the example/board (usually hold the button for 5–10 s).
After reset, the device advertises again with the same or a new pairing code; re-commission it.
To remove the controller-side peer without the device present:

```json
{ "v": 1, "type": "bridge", "action": "decommission", "nodeId": "<node>", "force": true }
```

`force: true` deletes the local peer; the device may need a manual factory reset.

---

## 7. Evidence to capture

Store evidence outside the repo (or in a local `lab-results/` ignored directory):

- `esp-matter` commit, ESP-IDF version, board model, flash size
- VLink commit/scaffold version, Matter.js version, host OS
- commissioning log excerpt with pairing code and Wi-Fi password redacted
- `vlink_status` JSON
- node list with fabric/node IDs
- telemetry subject + payload sample
- 20-run latency table (min/median/p95/max)
- failure cases exercised (wrong code, offline, BLE disabled)

Never commit the NATS token, Wi-Fi password, or an unredacted commissioning log.
