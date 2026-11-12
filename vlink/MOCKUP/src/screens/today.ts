// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-12 pet topology) — never flattened:
//   FIRMWARE       the header grammar (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative.
//   PRODUCT VOCAB  nothing — the underlying facts (sessions needing attention, running count,
//                  context %, scheduled runs, latest message) are OMP session records; the
//                  desktop app itself surfaces exactly these (session-attention core loop,
//                  composer context dial, ScheduledPage). No aggregate cost/streak/graph data
//                  exists anywhere in the app — none is shown (do not invent).
//   INVENTED       the care-words framing ("NEEDS YOU", "brain 62%" = context usage, the
//                  note row's marker) and all copy.
//   ILLUSTRATIVE   every frame value (2 waiting, 62%, "ship the deploy hook").
// VLink `today` — THE AGENT'S DAY: what your agent did today, in care-words. The kid-facing
// daily-stats page (3/4): glanceable, on demand, never rotation.
//
// STATE "attention" — the typical day: something needs you.
// STATE "quiet"     — all clear, go play.
// STATE "empty"     — no sessions yet today.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { text, svgScreen } from "../design/primitives.js";
import { C_AMB, F_LABEL, LEFT, headerOf, hintLeft, kvRow } from "./state-view-shared.js";

const STATES = ["attention", "quiet", "empty"] as const;
type State = (typeof STATES)[number];

const C_GRN = "#00FF00";
const C_DIM = "#005500";

export const today: Screen = {
  id: "today",
  title: "Today · the agent's day",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC A4/A5): theme and lang are accepted and ignored.
    const tk: Tokens = THEMES[theme];
    const s = (state ?? "attention") as State;

    const body = [headerOf(tk)];
    if (s === "empty") {
      body.push(
        kvRow(tk, 0, "NEEDS YOU", "--", C_DIM),
        kvRow(tk, 1, "RUNNING", "--", C_DIM),
        kvRow(tk, 2, "DUE TODAY", "--", C_DIM),
        kvRow(tk, 3, "SAID", "--", C_DIM),
      );
      body.push(hintLeft(tk, "nothing yet today", C_DIM));
    } else if (s === "quiet") {
      body.push(
        kvRow(tk, 0, "NEEDS YOU", "0 · all clear", C_GRN),
        kvRow(tk, 1, "RUNNING", "1 · brain 62%", C_GRN),
        kvRow(tk, 2, "DUE TODAY", "2 done", C_GRN),
        text(LEFT, 93, '> said: "all green · 3 pass"', { size: F_LABEL.size, fill: C_DIM }),
      );
      body.push(hintLeft(tk, "all quiet · go play", C_GRN));
    } else {
      body.push(
        kvRow(tk, 0, "NEEDS YOU", "2 waiting", C_AMB),
        kvRow(tk, 1, "RUNNING", "1 · brain 62%", C_GRN),
        kvRow(tk, 2, "DUE TODAY", "2 done · 1 failed", C_AMB),
        text(LEFT, 93, '> said: "ship the deploy hook"', { size: F_LABEL.size, fill: C_DIM }),
      );
      body.push(hintLeft(tk, "what your agent did today", C_DIM));
    }
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // Page cycle: BOOT short advances to adopt, BOOT long goes home.
    return [
      { x: 0, y: 0, w: 320, h: 86, to: "adopt", label: "BOOT short · next page" },
      { x: 0, y: 86, w: 320, h: 86, to: "home", label: "BOOT long · home" },
    ];
  },
};
