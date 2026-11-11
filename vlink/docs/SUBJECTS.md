# VLink Subject Specification

VLink shares `pi-a2a`'s local NATS server. This document is the namespace contract between
VLink, `pi-a2a`, and any agent that wants to read or actuate Matter devices.

**Server:** `nats://127.0.0.1:14222`
**Auth:** token in `~/.config/pi-a2a/server.seed`
**Ownership:** `iot.>` is VLink's. `agents.>`, `a2a.>`, `$SRV.>`, `$KV.>` are `pi-a2a`'s.

---

## 1. Tokens

| Token | Source | Format |
|---|---|---|
| `<fabric>` | Matter fabric ID, or `VLINK_FABRIC_ID` override | `fabric-` + 16 lowercase hex |
| `<node>` | Matter node ID | `node-` + 16 lowercase hex |
| `<endpoint>` | Matter endpoint number | decimal integer |
| `<cluster>` | Matter cluster name | lower camel (`OnOff` → `onOff`) |
| `<attribute>` | Matter attribute name | lower camel (`LocalTemperature` → `localTemperature`) |
| `<command>` | Matter command name | lower camel (`MoveToLevel` → `moveToLevel`) |
| `<event>` | Matter event name | lower camel |
| `<instance>` | VLink instance ID | sanitized hostname |

Concrete tokens must not contain `.`, `*`, `>`, or whitespace. A human node alias is metadata
(`nodeName`), never part of the subject.

---

## 2. Subjects

### 2.1 Telemetry (VLink publishes)

```
iot.matter.<fabric>.<node>.<endpoint>.<cluster>.<attribute>
```

Example:

```
iot.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.onOff
```

Payload: `AttributeTelemetry` (`src/types.ts`).

### 2.2 Events (VLink publishes)

```
iot.event.matter.<fabric>.<node>.<endpoint>.<cluster>.<event>
```

Payload: `EventTelemetry`.

### 2.3 Device commands (VLink subscribes, queue group `vlink`)

```
iot.cmd.matter.<fabric>.<node>.<endpoint>.<cluster>.<command>
```

Example:

```
iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.toggle
```

Payload: `DeviceCommandPayload`. Reply: `CommandResult`.

The subject is authoritative. If the payload repeats `fabricId`, `nodeId`, `endpointId`,
`cluster`, or `command`, it must agree with the subject; a mismatch is `PAYLOAD_INVALID`.

### 2.4 Bridge commands (VLink subscribes, queue group `vlink`)

```
iot.cmd.matter.<fabric>.bridge.<action>
```

Actions: `status`, `list`, `discover`, `commission`, `decommission`, `read`, `write`.

Examples:

```
iot.cmd.matter.fabric-0000000000000001.bridge.status
iot.cmd.matter.fabric-0000000000000001.bridge.list
iot.cmd.matter.fabric-0000000000000001.bridge.commission
```

Payload: `BridgeCommandPayload`. Reply: `CommandResult`.

### 2.5 Bridge health (VLink publishes)

```
iot.bridge.vlink.<instance>.status
```

Payload: `VLinkHealth`. Published at `VLINK_HEALTH_INTERVAL_MS` and on state transitions.

---

## 3. Agent recipes

### Toggle a light and wait for the ACK

```bash
TOKEN=$(tr -d '\n' < ~/.config/pi-a2a/server.seed)
nats --server nats://127.0.0.1:14222 --user "$TOKEN" request \
  iot.cmd.matter.fabric-0000000000000001.node-000000000000002a.1.onOff.toggle \
  '{"v":1,"type":"command","requestId":"demo-1"}' --timeout 5s
```

### Subscribe to all telemetry

```bash
nats --server nats://127.0.0.1:14222 --user "$TOKEN" sub 'iot.matter.>'
```

### Commission over BLE + Wi-Fi

```bash
nats --server nats://127.0.0.1:14222 --user "$TOKEN" request \
  iot.cmd.matter.fabric-0000000000000001.bridge.commission \
  '{"v":1,"type":"bridge","action":"commission","pairingCode":"34970112332","transport":"ble-wifi","wifi":{"ssid":"lab-iot","password":"..."},"timeoutMs":120000}' \
  --timeout 130s
```

Do not put real Wi-Fi passwords in shell history on a shared machine. Use the OMP tool with
`VLINK_WIFI_*` environment variables, or a 0600 local file.

---

## 4. Compatibility rules

- Payloads are versioned with `"v": 1`. Additive fields are allowed; consumers must ignore
  unknown fields.
- A new mandatory field requires `v: 2`.
- VLink never publishes on `agents.>`, `a2a.>`, `$SRV.>`, or `$KV.>`.
- VLink never creates JetStream streams, consumers, or KV buckets in v1.
- Queue group `vlink` guarantees one execution per command across multiple VLink instances.
