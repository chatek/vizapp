// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-12 pet topology) — never flattened:
//   FIRMWARE       the header grammar (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative.
//   PRODUCT VOCAB  the transport names themselves (USB-C / BLUETOOTH / WI-FI — the real words
//                  the widget teaches, operator ruling: keep them); the AGENT row's values map
//                  to bridge health (listening / hard to hear = ready / degraded, from
//                  iot.bridge.vlink.<instance>.status — README §5.1).
//   INVENTED       the pet noun system (operator ruling 2026-11-12): "plugged in", "saying
//                  hi…", "calling…", "answered", "home word", "flying free" [F2], the state
//                  names and all teaching copy.
//   ILLUSTRATIVE   every frame value ("1 answered", "2 pets on", the today-teaser counts).
// VLink `roads` — HOW WE CONNECT: the transport ladder as a live checklist. Rows 0-1 are the
// widget's own today-truth (the wire, the agent on it); rows 2-3 are the wireless ladder the
// maker climbs next. Absorbs the retired fabric page's data (the AGENT row carries health).
//
// STATE "fresh"      — wire in, agent not answering yet.
// STATE "talking"    — agent listening; the hint pays off with the today teaser.
// STATE "adopting"   — bluetooth calling, a new pet answering; jump to adopt.
// STATE "free" [F2]  — the widget itself off the wire, flying on wi-fi.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { svgScreen } from "../design/primitives.js";
import { C_AMB, F_LABEL, headerOf, hintLeft, kvRow } from "./state-view-shared.js";

const STATES = ["fresh", "talking", "adopting", "free"] as const;
type State = (typeof STATES)[number];

const C_GRN = "#00FF00";
const C_DIM = "#005500";

/** Rows per state: [value, tone] per rung; null = `--` absence (dim). */
const ROWS: Record<State, Array<[string, "green" | "amber" | "dim"] | null>> = {
  fresh: [
    ["plugged in", "green"],
    ["saying hi…", "amber"],
    null,
    null,
  ],
  talking: [
    ["plugged in", "green"],
    ["listening", "green"],
    null,
    ["2 pets on", "green"],
  ],
  adopting: [
    ["plugged in", "green"],
    ["listening", "green"],
    ["calling…", "amber"],
    ["home word…", "amber"],
  ],
  free: [
    ["plugged in", "green"],
    ["listening", "green"],
    null,
    ["flying free", "green"],
  ],
};

const KEYS = ["USB-C", "AGENT", "BLUETOOTH", "WI-FI"] as const;

const HINTS: Record<State, { text: string; amber: boolean }> = {
  fresh: { text: "plug in · then we talk", amber: true },
  talking: { text: "today: 2 need you · 1 running", amber: false },
  adopting: { text: "a new pet! -> page 4", amber: true },
  free: { text: "no wires · just wi-fi", amber: false },
};

const TONE = { green: C_GRN, amber: C_AMB, dim: C_DIM } as const;

export const roads: Screen = {
  id: "roads",
  title: "Roads · how we connect",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC A4/A5): theme and lang are accepted and ignored.
    const tk: Tokens = THEMES[theme];
    const s = (state ?? "talking") as State;
    const rows = ROWS[s];
    const hint = HINTS[s];

    const body = [headerOf(tk)];
    KEYS.forEach((key, i) => {
      const row = rows[i];
      if (row === null) {
        body.push(kvRow(tk, i, key, "--", TONE.dim));
      } else {
        body.push(kvRow(tk, i, key, row[0], TONE[row[1]]));
      }
    });
    body.push(hintLeft(tk, hint.text, hint.amber ? C_AMB : C_GRN));
    return svgScreen(tk, body.join(""));
  },
  hotspots({ state }) {
    // Page cycle; during adopting, BOOT short jumps straight to adopt (the hint says so).
    const next = state === "adopting" ? "adopt" : "today";
    return [
      { x: 0, y: 0, w: 320, h: 86, to: next, label: "BOOT short · next page" },
      { x: 0, y: 86, w: 320, h: 86, to: "home", label: "BOOT long · home" },
    ];
  },
};
