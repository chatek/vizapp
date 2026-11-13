# VLink CDC line protocol — device ⇄ host bridge contract

> The shared interface between the **vlink-esp32-c6 firmware** (`vkey/vlink-esp32-c6/`)
> and the **host CDC bridge** (`vclaw-desktop/vlink/src/cdc/`). The host bridge is the
> device's transport: it translates this protocol to/from the shared NATS bus's `iot.>`
> namespace (README §5), exactly as the Matter adapter translates for esp-matter nodes.
> v1 transport is USB-CDC because the pi-a2a NATS server binds 127.0.0.1 only — a Wi-Fi
> link from the device would need server-side changes that are out of scope.

## 1. Framing

- One JSON object per line, UTF-8, `\n`-terminated, over USB-Serial/JTAG CDC
  (`303a:1001`, 115200 default — CDC is not baud-sensitive but the port opens at 115200).
- Max line: 512 bytes device→host, 4 KB host→device (ticker strings can be long).
- Every object carries `"v": 1`. Unknown `type` on either side: ignore the line
  (forward compatibility), never error.

## 2. Device identity

The device has no Matter node id; it uses a MAC-derived synthetic identity:

- `node`: `node-` + 16 lowercase hex, the BASE MAC zero-padded left:
  `b0:a6:04:8b:58:f8` → `node-0000b0a6048b58f8`
- `fabric`: the configured `VLINK_FABRIC_ID` on the host (default from the bridge's
  resolved fabric); the device never hardcodes it — the host tells it in `ack`.

## 3. Device → host

| type | fields | meaning |
|---|---|---|
| `hello` | `device:"vlink-c6"`, `fw:"<semver>"`, `mac:"<aa:bb:cc:dd:ee:ff>"` | sent once ~200 ms after boot and again after every `host-reset` |
| `button` | `button:"boot"\|"aux"`, `press:"short"\|"long"` | a completed press (GPIO9 = boot, GPIO18 = aux) |
| `state` | `state:"no-bus"\|"idle"\|"bored"\|"working"\|"ping"\|"ask"` | the creature's UI state changed |
| `telemetry` | `key:string`, `value:number\|boolean\|string` | a zone-C measurement (heap, uptime, rssi) |
| `tick` | `uptimeS:number`, `heapFree:number` | heartbeat, every 30 s; also the boredom clock |

## 4. Host → device

| type | fields | meaning |
|---|---|---|
| `ack` | `fabric:"<fabric-…>"`, `instance:"<host instance>"` | host bridge is up; device may leave `no-bus` |
| `render` | `zone:"status"\|"ticker"\|"creature"\|"activity"\|"page"`, plus zone payload (below) | paint one zone (`page` = the pet-topology screens, below) |
| `event` | `name:string`, `text:string` | an agent-side happening: device shows the `ask` face + `text` on the ticker for ≥ 5 s. Named events `adopt-start` / `adopt-end` arm/clear the adoption window instead (below) |
| `bye` | — | host bridge is going down; device returns to `no-bus` |

`render` zone payloads:

- `status`: `{"text":"nats ok · a2a 13 live","tone":"green"|"amber"}`
- `ticker`: `{"text":"> onOff.toggle 42ms ok"}`
- `creature`: `{"state":"idle"}` — same enum as the `state` message
- `activity`: `{"fraction":0.46,"tone":"green"|"amber"}` (0 hides the fill)
- `page` — the pet-topology screens (pets / roads / today / adopt):
  `{"screen":"pets"|"roads"|"today"|"adopt","state":"…","rows":[{"key":"USB-C","value":"plugged in","tone":"green"|"amber"|"dim"}]}`
  — up to 4 rows, each value ≤ 24 chars. The device applies the rows to the
  named screen (creating its state; unknown screens/states are ignored for
  forward compat), echoes with the render `id` like any render, and repaints
  immediately if that page is currently displayed. A page render is data
  sync, not a creature command: it does NOT drive the `working` overlay.
  The host bridge pushes pets/roads on change (§7 cadence); the device side is live. Per-screen
  state enums: pets `empty|list`; roads `fresh|talking|adopting|free`;
  today `attention|quiet|empty`; adopt `calling|secret|homeword|home`.
  On `today`, the 4th row renders as the full-width note `> said: "…"`
  (unless its value is `--`).

`event` examples (adoption window):

- `{"v":1,"type":"event","name":"adopt-start"}` — an adoption window is
  active: the device enters the armed `adopt` page (modal; BOOT short =
  confirm — the `button` line still fires and the host interprets it —
  GPIO18 short = cancel). **No `state` line is emitted for the arming**:
  it is a page navigation, not a creature state change — the tamagotchi
  stays `idle` underneath (verified on-device 2026-11-12; do not flag the
  missing transition).
- `{"v":1,"type":"event","name":"adopt-end"}` — the window closed; the
  device clears the armed state and, if it was on `adopt`, moves to `pets`.
  On success the host follows with a `render zone:"page"` for `pets` so the
  family list refreshes.

Device-side page navigation (local side effect of the buttons; every press
still emits its `button` line): BOOT long from home enters the page cycle
(`home → pets → roads → today → adopt → pets`), BOOT short advances it,
BOOT long or GPIO18 short from any page returns home, GPIO18 long toggles
the display. While on a page, `render`s for the home zones keep updating
zone content (visible on return to home).

## 5. NATS mapping (host bridge)

Device line → NATS publish:

| device line | NATS subject | payload |
|---|---|---|
| `button` | `iot.event.matter.<fabric>.<node>.1.button.<boot\|aux>` | `{"v":1,"type":"event","event":"shortPress"\|"longPress","button":…,"timestamp":…}` |
| `telemetry` | `iot.matter.<fabric>.<node>.1.device.<key>` | `{"v":1,"type":"attribute","value":…,"timestamp":…,"source":"subscription"}` |
| `state` / `tick` | `iot.matter.<fabric>.<node>.1.device.<state\|heartbeat>` | same attribute shape |

NATS request → device (the bridge owns the reply):

| NATS subject | device lines | reply |
|---|---|---|
| `iot.cmd.matter.<fabric>.<node>.1.display.<status\|ticker\|activity>` | one `render` | `ok:true` after the device `echo` (below) or 2 s timeout |
| `iot.cmd.matter.<fabric>.<node>.1.display.notify` | one `event` | `ok:true` immediately |
| `iot.cmd.matter.<fabric>.bridge.<action>` | unchanged — the existing router handles bridge ops | — |

Device `echo` (reliability): after applying a `render`, the device sends
`{"v":1,"type":"echo","zone":"…","id":"<render id>"}` — the host adds `"id"` to every
`render` and matches it. Without `echo` within 2 s the command reply is `ok:false`,
code `DEVICE_TIMEOUT`.

## 6. The tamagotchi state machine (device-owned)

```
        hello -----> no-bus
        ack ----------> idle <----------------+
                        |  \ 5 min no tick    |
                        v   `---------> bored | any button/bus event
     button boot --> ping ---(2 s)--> idle    |
     event/render --> ask ---(5 s)--> idle    |
     host cmd ----> working --(cmd done)--> idle
        bye ----------> no-bus
```

- `ping`/`ask`/`working` are transient overlays; the base state is `idle` or `bored`.
- Boredom: 5 min without host traffic (`render`/`event`/`ack`) or button presses.
- Both buttons always reach the agent (`iot.event.…`); GPIO18 short ALSO asks the host
  for a digest — the host turns that into an agent-facing request and the agent's
  reply comes back as `event` (device shows `ask`).

## 7. Boot / reattach

1. Device boots → `hello` → waits (creature dozes, `no-bus`).
2. Host bridge opens the port (or notices `hello` on an open port) → sends `ack` →
   device → `idle`.
3. Host bridge subscribes `iot.cmd.matter.<fabric>.<node>.1.display.>` (queue group
   `vlink`) and starts translating.
4. On serial error/close: bridge unsubscribes, device (after ~10 s of silence)
   returns to `no-bus` and re-`hello`s every 5 s until re-acked.

Host-side supervision (no wire element, recorded so the next reader does not
hunt for a protocol change): the bridge re-runs device discovery every 5 s
(hot-plug) and treats 45 s without any device line as a dead link (close +
rediscover); it also counts live agents from the pi-a2a heartbeat plane and
pushes the OMP status line via `render zone:"status"` whenever it changes.
All of this rides the messages above — nothing in this document changed.
