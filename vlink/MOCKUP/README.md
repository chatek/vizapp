# VLink Mockup

UI blueprint for the **VLink maker device** — the agentic tamagotchi on the Waveshare
ESP32-C6-LCD-1.47 (ESP32-C6FH8, 8 MB, ST7789 320×172 landscape, no touch, BOOT on
GPIO9, one RGB bead).

> Branched from `vkey/UI_design` (the `pass/UI_design` framework). The VKey screen
> set was template lineage and has been retired here — the VKey record lives in the
> vkey lane. Every screen in this directory is a **PROPOSAL** for VLink milestone F1
> (README §3): no maker firmware exists yet.

```bash
cd vclaw-desktop/vlink/MOCKUP
npm install
npm run dev        # http://127.0.0.1:5180
npm run export     # every state × theme × language -> public/screens/*.svg
npm run check      # tsc --noEmit
node scripts/check-screen.mjs src/screens/<id>.ts   # contract self-check per screen
```

## The design in one paragraph

The device is a **creature on a bus**. Three zones (framework §2): **Zone A** —
connection status (NATS / fabric) in the header grammar the panel already speaks;
**Zone B** — the agent as a dot-matrix creature whose expression is the agent's
state (dozing → no bus, awake → idle, sulking → bored, busy mouth → working, wide
eyes → the BOOT ping, eyes-closed smile → the GPIO18 answer); **Zone C** — a live
telemetry ticker plus an activity bar on the panel's own 280×4 geometry. One
palette: vintage CRT phosphor green on black, amber for warnings — carried over
from the VKey lineage unchanged.

**Two buttons, two voices.** BOOT (GPIO9) is the maker's voice — short press pings
the agent (`iot.event.matter.…`), long press holds the status pages. GPIO18 is the
agent's voice — short press summons a one-line digest onto the panel, long press
turns the display off. Ignore the creature and it gets `bored`; either button is
the way back. The platform brand in all copy is **VClaw** — the maker links the
board to the VClaw agent experience.


## Screen set (all PROPOSAL)

| id | group | states | what it is |
|---|---|---|---|
| `home` | VLink | `no-bus` `idle` `bored` `working` `ping` `ask` | The tamagotchi home — the three zones, two-button conversation. |
| `nodes` | VLink | `empty` `list` | Commissioned fleet — `vlink_nodes` on the panel. |
| `fabric` | VLink | `ready` `degraded` | Fabric / network status — the operational page after pairing. |
| `pairing` | VLink | `advertising` `pase` `joined` | The commissioning window (120 s). |

## Rules that carry from the template (unchanged)

- **Provenance buckets** — every screen module opens with a COPY PROVENANCE header
  splitting its strings into FIRMWARE / PRODUCT VOCAB / INVENTED / ILLUSTRATIVE. A
  page's copy is NOT firmware unless it cites `ui_screens.cpp`. For VLink screens
  almost nothing is FIRMWARE — the header grammar and palette are; the rest is the
  bridge's contract (vlink/README.md) or design decisions.
- **Screens are pure** — given theme, language and state they return one SVG string,
  320×172, no DOM, no assets, no `fetch`.
- **Hotspots are durations, never taps** — there is no touch; a hotspot is what
  short/long BOOT does in that region.
- **One palette, one language** — light/dark and en/zh slots render identically (the
  framework has no second palette and no i18n).

`SPEC.md` is the full design record (canvas, tokens, zones, metrics, interaction
map, deviations). Edit screens in `src/`, re-run `npm run export`; do not hand-edit
`public/`.
