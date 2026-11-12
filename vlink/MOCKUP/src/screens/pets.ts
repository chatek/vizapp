// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink buckets, 2026-11-12 pet topology) — never flattened:
//   FIRMWARE       the header grammar (ui_screens.cpp:55-65, SPEC §3.1) — cited, NOT illustrative.
//                  Nothing else: no maker firmware exists (README §3 F1).
//   PRODUCT VOCAB  the transport badge vocabulary (usb/wifi/ble — the real transport names the
//                  widget teaches); the underlying facts are the bridge's node list + heartbeat
//                  reachability (README §5.1: subject identity is node-<hex>, aliases only).
//   INVENTED       the pet noun system (operator ruling 2026-11-12: the agent owns pets; kids
//                  never meet fabric/nodes/fleet): "no pets yet", awake / misses you / asleep,
//                  "this is me!" self-row, the row order.
//   ILLUSTRATIVE   the pet names ("millie", "hallway", "desk-2") and their states.
// VLink `pets` — WHO LIVES HERE: the family list, one row per pet with its ride (transport
// badge) and mood (reachability). The widget lists itself as the agent's first pet.
//
// STATE "empty" — no pets yet: the page a fresh board pairs with `adopt`.
// STATE "list"  — the family: awake, missing you, the widget itself, asleep.
import type { Screen } from "../design/contract.js";
import type { Tokens } from "../design/tokens.js";
import { THEMES } from "../design/tokens.js";
import { text, svgScreen } from "../design/primitives.js";
import { C_AMB, F_LABEL, headerOf, hintLeft, listLine, rowBase } from "./state-view-shared.js";

const STATES = ["empty", "list"] as const;
type State = (typeof STATES)[number];

const C_GRN = "#00FF00";
const C_DIM = "#005500";

export const pets: Screen = {
  id: "pets",
  title: "Pets · who lives here",
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
        text(26, rowBase(0), "no pets yet", { size: F_LABEL.size, fill: C_AMB }),
        text(26, rowBase(1), "they arrive by bluetooth", { size: F_LABEL.size, fill: C_DIM }),
        text(26, rowBase(2), "and live on wi-fi", { size: F_LABEL.size, fill: C_DIM }),
      );
      body.push(hintLeft(tk, "ask your agent to adopt one", C_AMB));
    } else {
      body.push(
        listLine(tk, 0, "millie    wifi · awake", { current: true }),
        listLine(tk, 1, "hallway   wifi · misses you"),
        listLine(tk, 2, "vlink     usb · this is me!"),
        listLine(tk, 3, "desk-2    wifi · asleep"),
      );
      body.push(hintLeft(tk, "the family · 3 awake", C_GRN));
    }
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // SPEC §5 page cycle: BOOT short advances to roads, BOOT long goes home.
    return [
      { x: 0, y: 0, w: 320, h: 86, to: "roads", label: "BOOT short · next page" },
      { x: 0, y: 86, w: 320, h: 86, to: "home", label: "BOOT long · home" },
    ];
  },
};
