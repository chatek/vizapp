// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-11) — never flattened:
//   FIRMWARE       the header grammar (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative.
//                  Nothing else: no maker firmware exists (README §3 F1).
//   PRODUCT VOCAB  the page's fields — node alias, endpoints, connection state — are the
//                  `vlink_nodes` tool's own columns (README §9: "node ID, alias, endpoints,
//                  connection state"); "no nodes" + commissioning is the vlink_commission flow.
//   INVENTED       the page itself on the state view's row grid (SPEC §3.5b integer-x rule):
//                  the "on/off" connection suffix as C_GRN/C_AMB text (colour alone cannot mark
//                  a row on this panel, so state rides the label, not a tone), and the row order.
//   ILLUSTRATIVE   the node names ("desk-lamp", "esp-light", "sensor-th") and their states.
// VLink `nodes` — COMMISSIONED NODES: the fleet page, what `vlink_nodes` returns drawn on the
// panel. PROPOSAL: F1 firmware does not exist; the grammar is the state view's own row stack so
// it reads as a page of the same book as `fabric`.
//
// STATE "empty" — nothing commissioned yet: the page a fresh board pairs with `pairing`.
// STATE "list"  — three nodes, first current: the steady state the ticker on `home` summarizes.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { text, svgScreen } from "../design/primitives.js";
import { C_AMB, F_LABEL, headerOf, hintLeft, listLine, rowBase } from "./state-view-shared.js";

const STATES = ["empty", "list"] as const;
type State = (typeof STATES)[number];

const C_GRN = "#00FF00";

export const nodes: Screen = {
  id: "nodes",
  title: "Nodes · commissioned fleet",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC A4/A5): theme and lang are accepted and ignored.
    const tk: Tokens = THEMES[theme];
    const s = (state ?? "list") as State;

    const body = [headerOf(tk)];
    if (s === "empty") {
      body.push(
        text(26, rowBase(0), "no nodes", { size: F_LABEL.size, fill: C_AMB }),
        text(26, rowBase(1), "nothing on the fabric yet", { size: F_LABEL.size, fill: "#005500" }),
      );
      body.push(hintLeft(tk, "commission from vclaw · /vlink-commission", C_AMB));
    } else {
      body.push(
        listLine(tk, 0, "desk-lamp  ep1 · on", { current: true }),
        listLine(tk, 1, "esp-light  ep1 · on"),
        listLine(tk, 2, "sensor-th  ep1 · off"),
      );
      body.push(hintLeft(tk, "3 nodes · 2 online", C_GRN));
    }
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // SPEC §Interaction: short press cycles pages, long press goes home.
    return [
      { x: 0, y: 0, w: 320, h: 86, to: "fabric", label: "short press · fabric page" },
      { x: 0, y: 86, w: 320, h: 86, to: "home", label: "long press · home" },
    ];
  },
};

