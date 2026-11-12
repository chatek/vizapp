// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-11) — never flattened:
//   FIRMWARE       the header grammar — "VLink" at x 8, version right-aligned to x 312, y 4, f14,
//                  C_DIM (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative. Nothing else:
//                  no maker firmware exists (README §3 F1).
//   PRODUCT VOCAB  the three zones and their content (vlink_framework.md §2 / README §1): Zone A
//                  connection status (NATS / pi-a2a), Zone B agent avatar, Zone C live telemetry
//                  ticker; BOOT (GPIO9) emits an event to the agent; the < 50 ms update target.
//                  Status vocabulary: "nats ok", "a2a … live" (pi-a2a status bar), "fabric" label
//                  (VLINK_FABRIC_LABEL default "VLink").
//   INVENTED       the zone layout (status row y 24-40, dot-matrix avatar 128×64 centered at
//                  y 48-112, activity bar on the firmware's 280×4 y 148 geometry, ticker line
//                  y 152-168); the creature itself and its four expressions; ASCII "->" for arrows
//                  (Montserrat's coverage is basic Latin — a firmware-plausible choice).
//   ILLUSTRATIVE   every frame value: "13" live agents, "42ms", ticker subjects, the 46 % activity
//                  fill, "z z" dozing marks.
// VLink `home` — THE AGENTIC TAMAGOTCHI: the idle screen the maker lives on. Three zones carry the
// whole v2 narrative (framework §2): the bus state up top, the agent as a creature in the middle,
// the device's own voice at the bottom. PROPOSAL: milestone F1 firmware does not exist; this is the
// design the firmware is to be built against.
//
// STATE "no-bus"  — powered, not yet on the bus: creature dozes dim, amber status, attach hint.
// STATE "idle"    — on the bus, agent listening: creature awake, green.
// STATE "bored"   — decay from idle after quiet minutes: half-lid eyes, flat mouth, amber nudge
//                   "press BOOT to ping" — the tamagotchi pull that makes the maker engage.
// STATE "working" — agent executing a command: busy mouth.
// STATE "ping"    — the BOOT moment (framework §3.3): button event on its way to the agent;
//                   wide eyes, open mouth, full bar. The RGB LED (GPIO8) mirrors this off-canvas.
// STATE "ask"     — the GPIO18 moment: the maker summoned the agent and the agent answers on
//                   the panel — eyes-closed smile.
// LVGL plausibility: every element is one lv_label, one lv_obj rect or one lv_canvas blit — the
// creature is a 16×8 1-bit sprite, the cheapest thing LVGL can animate at 20 fps.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { rect, text, svgScreen } from "../design/primitives.js";
import { C_AMB, F_LABEL, baseline, headerOf } from "./state-view-shared.js";

const STATES = ["no-bus", "idle", "bored", "working", "ping", "ask"] as const;
type State = (typeof STATES)[number];


/** The dot-matrix grid: 16 × 8 cells, 8 px per cell (6 px dot + 2 px gap) → 128 × 64,
 * centered on the panel (x 96…224, y 48…112). INVENTED, integer by the board lane's rule. */
const GRID = { cols: 16, rows: 8, cell: 8, dot: 6 } as const;
const GRID_X = (320 - GRID.cols * GRID.cell) / 2; // 96
const GRID_Y = 70; // face ink centered on the canvas center (ink 56..116, center 86)

/** The status line sits BELOW the face: the emotional read of the pet. */
const STATUS_BASE = baseline(140, F_LABEL); // near the bottom, clear of the face (ends y94)


const C_GRN = "#00FF00";
const C_DIM = "#005500";
const C_DRK = "#002200";

/** The creature: the CLAWD wordmark — two 5×6 block letters with hollow
 *  interiors (the emulator's "Block Clawd" model, v2.4). The letters ARE
 *  the face: eye pixels live in the letterform hollows (rows 2–4), the
 *  baseline row carries the mouth. Expressions (only eye/mouth pixels and
 *  the odd baseline accent change, so the wordmark stays readable):
 *   no-bus  eyes closed, no baseline — asleep, dim
 *   idle    dot eyes, full baseline — content (the canonical frame)
 *   bored   eyes dropped one row — sulking
 *   working eyes present, mouth gap mid-baseline — busy
 *   ping    WIDE split eyes, mouth off-center — the ping moment
 *   ask     hollowed eyes (row 2 filled), shortened smile — answering */
const MASKS: Record<State, readonly string[]> = {
  "no-bus": [
    "..###.....###...",
    ".#...#...#...#..",
    ".#..###..#..###.",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#####...#####..",
    "................",
    "................",
  ],
  idle: [
    "..###.....###...",
    ".#...#...#...#..",
    ".#.###...#.###..",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#####...#####..",
    "...............#",
    "..############..",
  ],
  bored: [
    "..###.....###...",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#.###...#.###..",
    ".#...#...#...#..",
    ".#####...#####..",
    "................",
    "..############..",
  ],
  working: [
    "..###.....###...",
    ".#.##....#.##...",
    ".#.###...#.###..",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#####...#####..",
    "......###.......",
    "..############..",
  ],
  ping: [
    ".#.#.#...#.#.#..",
    ".#.#.#...#.#.#..",
    "..........##.#..",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#####...#####..",
    "...............#",
    "..############..",
  ],
  ask: [
    "..###.....###...",
    ".#...#...#...#..",
    ".#####...#####..",
    ".#...#...#...#..",
    ".#...#...#...#..",
    ".#####...#####..",
    "...#.......#....",
    "...#########....",
  ],
};

/** Zone A + C content per state. PRODUCT VOCAB names; ILLUSTRATIVE values. */
const FRAMES: Record<
  State,
  { square: string; status: string; statusFill: string; doze: boolean }
> = {
  "no-bus": {
    square: C_AMB,
    status: "sleeping, plug me in",        // pet voice (operator ruling: no "bus" jargon)
    statusFill: C_AMB,
    doze: true,
  },
  idle: {
    square: C_GRN,                          // awake and connected
    status: "awake, 13 friends online",           // friends = live agents (heartbeat count); 13 illustrative
    statusFill: C_GRN,
    doze: false,
  },
  bored: {
    square: C_AMB,                          // a nudge, not a fault: still connected, just quiet
    status: "bored, 5 min quiet",          // decay from idle; 5 min is ILLUSTRATIVE
    statusFill: C_AMB,
    doze: false,
  },
  working: {
    square: C_GRN,
    status: "agent working",
    statusFill: C_GRN,
    doze: false,
  },
  ping: {
    square: C_AMB,                          // the flash the RGB LED also makes (framework §3.3)
    status: "BOOT -> agent",                // ASCII arrow: Montserrat basic-Latin coverage
    statusFill: C_AMB,
    doze: false,
  },
  ask: {
    square: C_GRN,                          // GPIO18 short: the agent answers on the panel
    status: "agent says:",                  // the summon (GPIO18) asked; this is the reply
    statusFill: C_GRN,
    doze: false,
  },
};
/** "z z" dozing marks above the lores creature at row `y0` — two 2×2 dots. */
function dozeMarksAt(dot: string, y0: number): string {
  return (
    rect(GRID_X + 15 * GRID.cell, y0 - 8, 2, 2, { fill: dot }) +
    rect(GRID_X + 13 * GRID.cell, y0 - 14, 2, 2, { fill: dot })
  );
}

function creature(mask: readonly string[], dot: string, y0 = GRID_Y): string {
  const parts: string[] = [];
  mask.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "#") continue;
      parts.push(
        rect(GRID_X + c * GRID.cell, y0 + r * GRID.cell, GRID.dot, GRID.dot, { fill: dot }),
      );
    }
  });
  return parts.join("");
}

export const home: Screen = {
  id: "home",
  title: "Home · the agentic tamagotchi",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC A4/A5): theme and lang are accepted and ignored.
    const tk: Tokens = THEMES[theme];
    const s = (state ?? "idle") as State;
    const f = FRAMES[s];
    const dot = f.doze ? C_DIM : C_GRN;

    const body = [
      headerOf(tk),
      // The face first — the wordmark Clawd, centered.
      creature(MASKS[s], dot),
      ...(f.doze ? [dozeMarksAt(C_DIM, GRID_Y)] : []),
      // The single caption — one natural sentence per state, centered, near the bottom.
      text(160, STATUS_BASE, f.status, { size: F_LABEL.size, fill: f.statusFill, anchor: "middle" }),
    ];
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // SPEC §5 — the two-button grammar. BOOT (GPIO9) is the maker's voice: short press
    // pings the agent (event out; the `ping` STATE is its static inspection), long press
    // holds the status pages. GPIO18 is the agent's channel back: short press summons a
    // one-line digest (the `ask` STATE), long press toggles the display (lineage rule).
    // The hotspot model carries one button's durations; the full table lives in SPEC §5.
    return [
      { x: 0, y: 0, w: 320, h: 86, to: "nodes", label: "BOOT short · ping the agent" },
      { x: 0, y: 86, w: 320, h: 86, to: "fabric", label: "BOOT long · status pages" },
    ];
  },
};
