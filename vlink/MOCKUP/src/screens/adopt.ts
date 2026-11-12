// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-12 pet topology) — never flattened:
//   FIRMWARE       the header grammar (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative.
//   PRODUCT VOCAB  the transport name BLUETOOTH (kept real — the teaching word); the 120 s
//                  window is bridge-owned (VLINK_DEFAULT_COMMISSION_TIMEOUT_MS, README §7).
//   INVENTED       the adoption noun system (operator ruling 2026-11-12 — "fabric" dies):
//                  adopting, the SECRET row (PASE → "just between us"), the HOME WORD row
//                  (Wi-Fi credentials), the NAME row (the pet gets its name and moves in),
//                  the state names and all teaching copy.
//   ILLUSTRATIVE   every frame value ("millie moved in", "113s left").
// VLink `adopt` — A NEW PET IS COMING: the 120 s window as four named phases. The kid learns
// WHAT happens: the agent calls on bluetooth, shares a secret, teaches the home word, and the
// pet gets its name and moves in.
//
// STATE "calling"  — bluetooth calling, waiting for an answer.
// STATE "secret"   — the pairing code becomes trust, just between agent and pet.
// STATE "homeword" — the home word travels inside the secret.
// STATE "home"     — all done: say hi to the new pet. Ends itself after 10 s.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { svgScreen } from "../design/primitives.js";
import { C_AMB, headerOf, hintLeft, kvRow } from "./state-view-shared.js";

const STATES = ["calling", "secret", "homeword", "home"] as const;
type State = (typeof STATES)[number];

const C_GRN = "#00FF00";
const C_DIM = "#005500";

/** [in-flight value, done value] per row; phases before/after shown dim `--`. */
const PHASES: Record<State, Array<{ inflight: string; done: string }>> = {
  calling: [
    { inflight: "calling…", done: "answered!" },
    { inflight: "sharing it…", done: "just between us" },
    { inflight: "home word…", done: "home word in" },
    { inflight: "choosing…", done: "millie moved in" },
  ],
  secret: [
    { inflight: "calling…", done: "answered!" },
    { inflight: "sharing it…", done: "just between us" },
    { inflight: "home word…", done: "home word in" },
    { inflight: "choosing…", done: "millie moved in" },
  ],
  homeword: [
    { inflight: "calling…", done: "answered!" },
    { inflight: "sharing it…", done: "just between us" },
    { inflight: "home word…", done: "home word in" },
    { inflight: "choosing…", done: "millie moved in" },
  ],
  home: [
    { inflight: "calling…", done: "answered!" },
    { inflight: "sharing it…", done: "just between us" },
    { inflight: "home word…", done: "home word in" },
    { inflight: "choosing…", done: "millie moved in" },
  ],
};

/** Which rows are done (green) / in-flight (amber) / not-yet (dim) per state. */
const STAGE: Record<State, number> = { calling: 0, secret: 1, homeword: 2, home: 4 };

const KEYS = ["BLUETOOTH", "SECRET", "WI-FI", "NAME"] as const;

const HINTS: Record<State, { text: string; amber: boolean }> = {
  calling: { text: "calling · 113s left", amber: true },
  secret: { text: "the code becomes a secret", amber: true },
  homeword: { text: "the home word travels in secret", amber: true },
  home: { text: "say hi to millie!", amber: false },
};

const TONE = { green: C_GRN, amber: C_AMB, dim: C_DIM } as const;

export const adopt: Screen = {
  id: "adopt",
  title: "Adopt · a new pet is coming",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC A4/A5): theme and lang are accepted and ignored.
    const tk: Tokens = THEMES[theme];
    const s = (state ?? "calling") as State;
    const stage = STAGE[s];
    const hint = HINTS[s];

    const body = [headerOf(tk)];
    KEYS.forEach((key, i) => {
      const phase = PHASES[s][i];
      if (i < stage) {
        body.push(kvRow(tk, i, key, phase.done, TONE.green));
      } else if (i === stage) {
        body.push(kvRow(tk, i, key, phase.inflight, TONE.amber));
      } else {
        body.push(kvRow(tk, i, key, "--", TONE.dim));
      }
    });
    body.push(hintLeft(tk, hint.text, hint.amber ? C_AMB : C_GRN));
    return svgScreen(tk, body.join(""));
  },
  hotspots({ state }) {
    // Modal while a window is armed (calling/secret/homeword): BOOT short = say yes to the
    // new pet (the maker consents on the device), GPIO18 short = not now (cancel). Idle
    // (home): BOOT short wraps the page cycle.
    const armed = state !== "home";
    return [
      {
        x: 0, y: 0, w: 320, h: 86,
        to: armed ? "adopt" : "pets",
        label: armed ? "BOOT short · say yes to the new pet" : "BOOT short · next page",
      },
      {
        x: 0, y: 86, w: 320, h: 86,
        to: armed ? "adopt" : "home",
        label: armed ? "GPIO18 short · not now" : "BOOT long · home",
      },
    ];
  },
};
