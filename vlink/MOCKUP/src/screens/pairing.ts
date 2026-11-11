// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink-redesign buckets, 2026-11-11) — never flattened:
//   FIRMWARE       "VLink" + "v1.0.0-c6" (ui_screens.cpp:21,55-65); header geometry SPEC §3.1; the state-word
//                  band (f40, box 50–94, baseline 86, centred 160, ui_screens.cpp:88-93); the TOTP bar geometry
//                  280×4 at y 148 anchored left (:102-108) — cited, NOT illustrative
//   PRODUCT VOCAB  the commissioning vocabulary — BLE / PASE / "installs Wi-Fi credentials" / "joins the device
//                  to the fabric" / "operational: CASE session" (vlink/README.md §4); the 120 s commission
//                  window (VLINK_DEFAULT_COMMISSION_TIMEOUT_MS 120000, vlink/README.md §5); fabric label
//                  "VLink" (VLINK_FABRIC_LABEL default, vlink/README.md §5). NONE of it is firmware — it is
//                  the bridge's contract, which is why this screen is a PROPOSAL.
//   INVENTED       the layout decisions: hero words "PAIRING" / "JOINED" in the firmware's state-word band; the
//                  status line in the firmware's name row (y 24); the commission window drawn on the TOTP bar's
//                  geometry; the amber-at-≤10 % rule borrowed from SPEC §3.5 for the window's last 12 s; the
//                  modal "window takes the buttons" reading, which follows the approval window's own rule
//                  (SPEC §4.7 constraint 4)
//   ILLUSTRATIVE   the concrete frames: ssid "lab-iot" and node "…002a" (docs/SUBJECTS.md §2/§3 examples);
//                  "96 s left" (advertising) and "48 s left" (pase) are frame choices, not measured values;
//                  hint wording is mine
// VLink `pairing` — the COMMISSIONING WINDOW: what the panel shows while the omp-side VLink bridge
// commissions THIS device into the Matter fabric. PROPOSAL: the C6 firmware has no BLE/Wi-Fi/Thread code
// at all (SPEC §4.1 — radios "present but unused at runtime"), and no UX document defines this screen.
// It is drawn from the bridge's own contract (vlink/README.md §4, docs/SUBJECTS.md) so that the panel's
// grammar — one state word, one status line, one bar, one hint — carries the redesign, not a new visual
// language. The three states are the commissioning phases the README itself names, in order.
import type { Screen } from "../design/contract.js";
import { THEMES } from "../design/tokens.js";
import { rect, svgScreen, text } from "../design/primitives.js";
import { C_AMB, CX, F_LABEL, HINT_BASE, baseline, headerOf } from "./state-view-shared.js";

/** `lv_font_montserrat_40` — line 44, base 8 (SPEC §3.3), the state-word font (main.ts declares
 *  the same trio locally; state-view-shared exports only the f14/f20 pair these pages use). */
const F_CODE = { size: 40, line: 44, base: 8 } as const;

/** The state-word band and the TOTP bar, exactly as the firmware places them (SPEC §3.1/§3.2):
 *  band box 50–94 → f40 baseline 86, the panel's vertical centre; bar 280×4 at x 20, y 148. */
const BAND_TOP = 50;
const BAR = { x: 20, y: 148, w: 280, h: 4 } as const;

/** The commission window: 120 s (VLINK_DEFAULT_COMMISSION_TIMEOUT_MS, vlink/README.md §5). */
const WINDOW_S = 120;

/** Amber at ≤ 10 % remaining — the firmware's own threshold (SPEC §3.5: `pct > 10 ? GRN : AMB`),
 *  borrowed for the window's last 12 s. INVENTED (a borrow, stated as one). */
const AMBER_PCT = 10;

const STATES = ["advertising", "pase", "joined"] as const;
type State = (typeof STATES)[number];

/** One frame: the hero word, the status line under the header, the seconds left on the window
 *  (null = the window is over — `joined` draws no bar, like the main screen's unvouched states
 *  hide theirs), and the hint. Copy is PRODUCT VOCAB / ILLUSTRATIVE per the header comment. */
const FRAMES: Record<State, { word: string; status: string; remS: number | null; hint: string }> = {
  // BLE advertising — the commissionee is discoverable, no commissioner has connected yet.
  advertising: {
    word: "PAIRING",
    status: "BLE discoverable",            // README §4: "BLE for commissioning"; phrasing mine
    remS: 96,                              // ILLUSTRATIVE frame: 96 s of 120 left → fill 224 px
    hint: "waiting for the commissioner",  // wording mine
  },
  // PASE handshake — the commissioner is authenticating and installing Wi-Fi credentials.
  pase: {
    word: "PAIRING",
    status: "PASE · wi-fi lab-iot",        // README §4 "performs PASE … installs Wi-Fi credentials"; ssid from SUBJECTS §3
    remS: 48,                              // ILLUSTRATIVE frame: 48 s left → fill 112 px
    hint: "joining fabric VLink",          // fabric label: VLINK_FABRIC_LABEL default (README §5)
  },
  // Joined — the terminal state: on the fabric, CASE session live, operational over Wi-Fi.
  joined: {
    word: "JOINED",                        // README §4 "joins the device to the fabric"
    status: "fabric VLink · node …002a",   // node: SUBJECTS §2 example, truncated (see header)
    remS: null,                            // the window is over: no bar, like main's unvouched states
    hint: "operational over wi-fi",        // README §4 "Operational: IPv6 over Wi-Fi … CASE session"
  },
};

/** The window countdown on the TOTP bar's geometry: `fill = 280·rem/120`, integer, anchored
 *  left, amber at ≤ 10 % — the firmware's own two rules (SPEC §3.5) with 120 in place of 30. */
function windowBar(remS: number, tk: { ringTrack: string; primary: string }): string {
  const pct = Math.trunc((remS * 100) / WINDOW_S);
  const w = Math.trunc((BAR.w * pct) / 100);
  return (
    rect(BAR.x, BAR.y, BAR.w, BAR.h, { fill: tk.ringTrack }) +
    rect(BAR.x, BAR.y, w, BAR.h, { fill: pct > AMBER_PCT ? tk.primary : C_AMB })
  );
}

export const pairing: Screen = {
  id: "pairing",
  title: "Commissioning window",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC §1 A4/A5): theme and lang are accepted and ignored.
    const tk = THEMES[theme];
    const f = FRAMES[(state ?? "advertising") as State];
    const body = [
      headerOf(tk),
      // status line — the firmware's name row (y 24, centred, C_GRN, f14, :67-74)
      text(CX, baseline(24, F_LABEL), f.status, { size: F_LABEL.size, anchor: "middle", fill: tk.text }),
      // hero — the firmware's state word (f40, centred, baseline 86) in C_GRN: this is the
      // success/progress tone; amber stays the firmware's unvouched colour and is used only
      // by the borrowed ≤ 10 % bar rule below, never for the word itself.
      text(CX, baseline(BAND_TOP, F_CODE), f.word, { size: F_CODE.size, anchor: "middle", fill: tk.text }),
      // hint — the firmware's hint band (baseline 113, C_DIM, :95-100)
      text(CX, HINT_BASE, f.hint, { size: F_LABEL.size, anchor: "middle", fill: tk.muted }),
      // the commission window on the TOTP bar's geometry, when the window is still open
      f.remS !== null ? windowBar(f.remS, tk) : "",
    ];
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // The window is MODAL and takes the buttons (the approval window's own rule, SPEC §4.7
    // constraint 4): short press confirms the commissioner, doing nothing lets the 120 s
    // window expire — the timeout is the refusal, so there is no deny region.
    return [
      { x: 0, y: 0, w: 320, h: 172, to: "nodes", label: "short press · confirm commissioner" },
    ];
  },
};
