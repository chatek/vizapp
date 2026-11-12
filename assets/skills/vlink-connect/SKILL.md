---
name: vlink-connect
description: Guide the VLink board from USB-C plug-in to a listening agent, adopting a new pet over BLUETOOTH, and WI-FI operation, with troubleshooting. Use when the widget says "plug me in", won't talk, or the user wants to adopt a pet.
---

# VLink connect — the journey

The roads page order is the whole story: USB-C → agent listening → BLUETOOTH adopt → WI-FI.

1. **USB-C.** Plug the board into the computer (USB-Serial/JTAG, `303a:1001`). It boots,
   says hello, and dozes showing "sleeping · plug me in" / "> usb-c wakes me up" until the
   host bridge acks it. No other step needed — the bridge hot-plugs and re-scans every
   5 s.
2. **Listening.** Once acked, the creature wakes: status "awake · N friends", ticker
   "> listening for you". Confirm with `vlink_status` (NATS connectivity, bridge state).
   "Hard to hear" or a missing bridge means not talking yet — see troubleshooting.
3. **BLUETOOTH — adopting a new pet.** When the user wants a new pet:
   - `vlink_discover` (default 10 s window) to find commissionable devices nearby.
   - Take the pairing code from the device's label or QR code.
   - `vlink_commission` with the pairing code, transport `"ble-wifi"` for a new device
     (`"ip"` only if it is already on the LAN), and `nodeName` — the pet's name.
   - The 120 s window, in kid words: "calling…" → the code becomes a secret, "just
     between us" → the home word (the Wi-Fi credentials) travels inside the secret →
     "millie moved in". On the device's adopt page: BOOT short = say yes to the new pet,
     GPIO18 short = not now.
4. **WI-FI.** After adoption the pet lives on Wi-Fi — "no wires · just wi-fi". SSID and
   password default from `VLINK_WIFI_SSID` / `VLINK_WIFI_PASSWORD`; pass them only if the
   user gives different ones, and never echo the password.

## Troubleshooting

- Still "sleeping · plug me in" after plugging in: the bridge has not acked yet — check
  `vlink_status`, wait ~10 s, then replug the USB-C cable.
- Adoption times out: the pet must be in pairing mode (its label says how), stay close
  for BLUETOOTH, then retry `vlink_discover`.
- A pet "misses you" or is "asleep": it is unreachable — check its power and Wi-Fi, then
  confirm with `vlink_read`.
- The link dies after 45 s of silence: the bridge closes and rediscovers on its own;
  replug if it stays down.
