# VLink maker UI — SPEC

> Design record for the **VLink** device screen on the Waveshare **ESP32-C6-LCD-1.47**
> (ESP32-C6FH8, QFN32 rev v0.2, 8 MB flash, no RTC; ST7789 native 172×320 driven
> landscape 320×172 via MADCTL `0x70`, gap 34; no touch; BOOT on GPIO9, GPIO18 wired
> for expansion; one addressable RGB bead; USB-CDC `303a:1001`).
>
> **Lineage.** This mockup was branched from `vkey/UI_design` (the `pass/UI_design`
> framework). The VKey screen set (code display, six state pages, FIDO2 approval) was
> template content and is retired from this project — the VKey record lives in the vkey
> lane, including the full reverse-engineering SPEC it came from. What this project
> keeps from that lineage: the canvas, the palette, the fonts, the header grammar, the
> 280×4 bar geometry, and the framework's rules (provenance buckets, pure screens,
> duration hotspots).
>
> **Status.** Every screen here is a **PROPOSAL** for milestone F1
> (`vlink/README.md` §3): the C6 currently runs VKey-lineage firmware and has no
> VLink/LVGL-maker code. This document is the design the firmware is to be built
> against.

---

## 1. Assumptions (explicit)

| # | Assumption | Why |
|---|---|---|
| A1 | Canvas is **320 × 172**, `viewBox="0 0 320 172"`, **1 SVG unit = 1 LCD px**, landscape, origin top-left. | Carried from the VKey lineage record (its `app_main.cpp` hres/vres and the BSP's MADCTL rotation); the panel is the same part. |
| A2 | **No touch.** BOOT (GPIO9) is the only primary input. | Board fact; the framework's hotspot rule follows from it. |
| A3 | **No system chrome.** Only what the app draws. | Same lineage: nothing draws a status bar or clock. |
| A4 | **One palette, no themes.** Light and dark slots render identically. | The lineage palette is the product aesthetic (CRT phosphor); no second surface exists. |
| A5 | **One language: `en`.** The `zh` slot renders identically. | No i18n table; strings are compile-time literals. |
| A6 | Fonts are **LVGL Montserrat 14** (line 16, base 3), **20** (line 22, base 4), **40** (line 44, base 8) — all enabled in the lineage sdkconfig. | The three sizes this panel can afford; f40 is hero-only (a 14-char line at 40 px overruns 320). |
| A7 | **Static frames.** No animation in the mockups; the firmware animates the creature at its own frame budget. | Mockups are contract artifacts, not motion demos. |
| A8 | The **RGB LED (GPIO8)** is a board fact drawn nowhere on the canvas; the design assigns it the same moments as the amber tone (waiting, BOOT ping). | Off-canvas channel; noted so F1 wires it deliberately. |
| A9 | Text widths are advance sums from the LVGL font tables, kerning ignored (±2 px). | Same estimate rule as the lineage SPEC. |

## 2. Tokens — one palette, carried verbatim from the lineage

| semantic | hex | used by |
|---|---|---|
| **bg** | `#000000` | screen background |
| **text / accent / ok** | `#00FF00` | status tokens, creature dots awake, bar fill, list state `on` |
| **muted** | `#005500` | header, ticker prose, dozing creature |
| **warn** | `#FFA500` | no-bus status, empty-fleet page, degraded values, the ping flash |
| **bar-track** | `#002200` | activity bar track |

Contrast on black (record, not proposal): `#00FF00` 15.30:1, `#FFA500` 10.63:1,
`#005500` 2.30:1 — muted is prose the eye should not chase, never a value a page
exists to show (the lineage contrast rule, kept).

## 3. The three zones (framework §2, made concrete)

| zone | band (y) | contents | geometry source |
|---|---|---|---|
| header | 4 – 20 | `VLink` left x 8 · version right x 312, f14, muted | FIRMWARE grammar (`ui_screens.cpp:55-65`) |
| **A · status** | 24 – 40 | 4×4 state square + status tokens, f14 | the lineage name-row geometry |
| **B · avatar** | 48 – 112 | dot-matrix creature, 16×8 grid of 6 px dots in 8 px cells → 128×64, centered x 96–224 | INVENTED |
| **C · ticker** | 148 – 168 | 280×4 activity bar at x 20 y 148 + one f14 ticker line, baseline 165 | bar geometry FIRMWARE (`ui_screens.cpp:102-108`); its reuse as a bus-activity meter is INVENTED |

Pages (`nodes`, `fabric`, `pairing`) use the lineage state-view grid: f14 keys /
f20 values, fixed integer x columns, row pitch 24, hint band 100–116 (its §3.5b
rules, carried whole).

## 4. Screen and state inventory — 4 screens, 13 states, all PROPOSAL

| id | states | short title |
|---|---|---|
| `home` | `no-bus` · `idle` · `bored` · `working` · `ping` · `ask` | The agentic tamagotchi |
| `nodes` | `empty` · `list` | Commissioned fleet |
| `fabric` | `ready` · `degraded` | Fabric / network |
| `pairing` | `advertising` · `pase` · `joined` | Commissioning window |

### 4.1 `home` — the creature

The creature is a 16×8 1-bit sprite (one `lv_canvas` blit — the cheapest thing LVGL
animates). Expressions change only eyes and mouth, so the silhouette stays one
creature:

| state | eyes | mouth | dots | zone A | zone C |
|---|---|---|---|---|---|
| `no-bus` | closed (1 row) | — | muted | amber `waiting for bus` | `> plug in · vclaw vlink attach` |
| `idle` | 2×2 | smile | green | `nats ok · a2a 13 live` | `> heartbeat 30s` |
| `bored` | 1 row (half-lid) | 2-dot flat | green | amber `bored · 5 min quiet` | `> press BOOT to ping` |
| `working` | 2×2 | flat | green | `agent working` | bar 46 %, `> onOff.toggle 42ms ok` |
| `ping` | 3×3 | open O | green + amber flash | amber `BOOT -> agent` | bar full amber, `> button event sent` |
| `ask` | closed (happy) | smile | green | `agent says:` | `> all green · 3 tests pass` |

Dozing marks (`z z`) are two 2×2 dots above the creature's right corner (`no-bus`
only). `bored` is the tamagotchi decay: idle with no events for N minutes (5 in the
mock; the firmware owns the real timer) sulks — half-lid eyes, flat mouth, amber
nudge — and any bus activity or button press ends it.

### 4.2 `nodes` — the fleet

`empty`: amber `no nodes` + hint `commission from vclaw · /vlink-commission`.
`list`: three rows on the state-view stack, `>` marks the current one, state rides
the label (`ep1 · on` / `ep1 · off`) because colour alone cannot mark a row on this
panel (muted is 2.30:1).

### 4.3 `fabric`, 4.4 `pairing`

Carried from the 2026-11-11 redesign round unchanged (their module headers carry
their own provenance): the fabric page draws the bridge's own health states; the
pairing window borrows the state-word band and the 280×4 geometry for the 120 s
commission window, amber at ≤ 10 %.

## 5. The two buttons — maker's voice, agent's voice

The board has **two** buttons (board facts: BOOT on GPIO9, the second on GPIO18,
wired for external expansion; both were symmetric cycling inputs in the VKey
lineage). The design gives each one direction of the conversation:

| button | short press | long press |
|---|---|---|
| **BOOT (GPIO9) — the maker's voice** | **Ping the agent**: emits `iot.event.matter.…<button>`; creature `ping` flash, RGB LED blinks; the agent's reaction lands on the ticker | hold to enter the status pages (`nodes` → `fabric` → `pairing`) |
| **GPIO18 — the agent's voice** | **Summon**: asks the agent for a one-line digest (status, last build, "what's up"); the reply is the `ask` state — eyes-closed smile, answer on the ticker | toggle the display (lineage rule: long-press backlight) |

Per-screen map (BOOT short / GPIO18 short on non-home screens):

| screen | BOOT short | BOOT long | GPIO18 short | GPIO18 long |
|---|---|---|---|---|
| `home` | ping the agent | status pages | summon digest | display off |
| `nodes` | → `fabric` | → `home` | → `home` | display off |
| `fabric` | → `pairing` | → `home` | → `home` | display off |
| `pairing` | confirm commissioner | modal: takes the buttons | modal: takes the buttons | modal: takes the buttons |

Rules:

- **A press is a duration, never a tap** (no touch panel) — the lineage rule, now
  with two sources.
- **Every press reaches the agent** (`iot.event.matter.…`); the difference is the
  expected reply: BOOT's ping is a nudge (the agent chooses what to do), GPIO18's
  summon asks for a digest (the agent must answer on the panel).
- The **`bored`** decay is what makes the loop a tamagotchi: ignore the creature
  and it sulks; either button is the way back.
- **VClaw is the platform brand** in all product copy (`vclaw vlink attach`,
  `commission from vclaw`): the maker links the board to the VClaw agent
  experience, not to a runtime's internals.

## 6. Copy provenance (the rule, kept from the lineage)

Every screen module opens with a COPY PROVENANCE header with four buckets:

| bucket | test | how it must be cited |
|---|---|---|
| **FIRMWARE** | exists in `ui_screens.cpp` (lineage) | cite `file:line`; not illustrative |
| **PRODUCT VOCAB** | the bridge's contract (`vlink/README.md`, `docs/SUBJECTS.md`, framework) | cite the doc section |
| **INVENTED** | layout decisions this design owns | named in the header |
| **ILLUSTRATIVE** | frame values (counts, ms, node names) | labelled; never a measured value |

For VLink screens, FIRMWARE is only the header grammar, the palette and the bar
geometry — everything else is PRODUCT VOCAB at best. A later lane needing a value
from these pages cites the mock's module, never "the firmware".

## 7. Deviations & open decisions

- **D1 — the ticker's arrow is ASCII `->`**, not `→`: Montserrat's coverage is basic
  Latin; a firmware-plausible choice.
- **D2 — the version string** in the header (`v1.0.0-c6`) is the lineage literal via
  `strings.ts`; F1 will mint VLink's own version scheme. ILLUSTRATIVE until then.
- **D3 — creature art** is this design's own (INVENTED); nothing in the framework
  prescribes it. It must stay a 16×8 1-bit sprite so the firmware can blit it.
- **D4 — ticker content** is ILLUSTRATIVE; the real line is the last
  `iot.matter.>` / `iot.event.matter.>` payload, truncated by the lineage LONG_DOT
  rule.
- **D5 — latency** (< 50 ms agent→LVGL, framework §5) is a firmware/test assertion,
  not drawable; recorded so F4 can gate it.

## 8. Ground truth for F1 (where each number comes from)

| file | what it gives |
|---|---|
| `vkey/firmware-ESP32-C3…/main/ui/ui_screens.{cpp,h}` (lineage) | header grammar, palette, bar geometry, LVGL usage patterns |
| `vlink/README.md` §1/§3/§5/§9 | the narrative, the milestones, the subject taxonomy, the tool vocabulary |
| `vlink_framework.md` §2/§3/§5 | the three zones, the maker journey, the latency targets |
| `vclaw-desktop/vlink/docs/ARCHITECTURE.md` | bridge health states (`ready`/`degraded`) the fabric page mirrors |
