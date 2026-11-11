// COPY PROVENANCE (vclaw-worker1 rule, 2026-10-31; VLink-redesign buckets, 2026-11-11) — never flattened:
//   FIRMWARE       "VLink" + "v1.0.0-c6" (ui_screens.cpp:21,55-65); header geometry SPEC §3.1; the hint band
//                  and the key/value row grid (SPEC §3.5b — the board lane's own integer-x rule) — cited,
//                  NOT illustrative
//   PRODUCT VOCAB  every field name and value: FABRIC label "VLink" (VLINK_FABRIC_LABEL default,
//                  vlink/README.md §5); NODE "node-000000000000002a" (docs/SUBJECTS.md §2's example node,
//                  shown truncated — see ILLUSTRATIVE); TRANSPORT "wi-fi" (vlink/README.md §4 "Operational:
//                  IPv6 over Wi-Fi"); BRIDGE "ready | degraded" (docs/ARCHITECTURE.md §2's two live health
//                  states); "CASE session" and "one dependency is down" (vlink/README.md §4 / ARCHITECTURE §2).
//                  NONE of it is firmware — the C6 firmware has no fabric, no transport and no bridge.
//   INVENTED       the page itself — which four fields a fabric status page carries, their order, and the
//                  omission of a page indicator (this is not one of the six S3 state-view pages, SPEC §4.2–4.5)
//   ILLUSTRATIVE   the truncated node id "node-…002a" (the full SUBJECTS example is 22 chars ≈ 235 px at f20,
//                  wider than the 204 px value column — a real node id will need the firmware's own LONG_DOT
//                  rule, which is why the truncation is drawn, not just asserted); the note wording
// VLink `fabric` — FABRIC / NETWORK STATUS: the operational page after `pairing` succeeds. PROPOSAL: no
// UX document defines it and no firmware implements it (SPEC §4.1). Drawn on the state view's own row
// grid so it reads as page 7 of the same grammar, and it borrows that grid's contrast rule (SPEC §3.5b:
// keys C_GRN, values f20) — the value a page exists to show is never the dim one.
//
// STATE "ready"     — ARCHITECTURE §2 `ready`: "NATS subscribed, Matter controller online". On the
//                     device side that is: on the fabric, CASE session live.
// STATE "degraded"  — ARCHITECTURE §2 `degraded`: "one dependency is down … NATS remains available".
//                     Amber value + amber note (C_AMB is the firmware's own warning tone, SPEC §2);
//                     the page still shows the fabric rows — degraded is a state, not an error page.
import type { Screen } from "../design/contract.js";
import { THEMES } from "../design/tokens.js";
import { svgScreen } from "../design/primitives.js";
import { C_AMB, headerOf, hintLeft, kvRow } from "./state-view-shared.js";

const STATES = ["ready", "degraded"] as const;
type State = (typeof STATES)[number];

/** ILLUSTRATIVE values (SUBJECTS.md §2's own example fabric/node; truncated node per the header).
 *  `bridge` is the only field that changes between the two states — the fabric rows are the
 *  page's constants, exactly like `state-clock`'s source/age vs its trust field. */
const MOCK: Record<State, { bridge: string; note: string }> = {
  ready: {
    bridge: "ready",          // ARCHITECTURE §2
    note: "CASE session up",  // README §4 "Operational: … CASE session"; wording mine
  },
  degraded: {
    bridge: "degraded",       // ARCHITECTURE §2
    note: "one dependency down",  // ARCHITECTURE §2 "one dependency is down"; wording mine
  },
};

export const fabric: Screen = {
  id: "fabric",
  title: "Fabric / network",
  group: "VLink",
  proposal: true,
  states: [...STATES],
  render({ theme, state }) {
    // One palette, one language (SPEC §1 A4/A5): theme and lang are accepted and ignored.
    const tk = THEMES[theme];
    const f = MOCK[(state ?? "ready") as State];
    const body = [
      headerOf(tk),
      kvRow(tk, 0, "fabric:", "VLink"),            // VLINK_FABRIC_LABEL default (README §5)
      kvRow(tk, 1, "node:", "node-…002a"),         // SUBJECTS §2 example, truncated (header comment)
      kvRow(tk, 2, "transport:", "wi-fi"),         // README §4 operational transport
      kvRow(tk, 3, "bridge:", f.bridge, f.bridge === "ready" ? undefined : C_AMB),
      hintLeft(tk, f.note, f.bridge === "ready" ? undefined : C_AMB),
    ];
    return svgScreen(tk, body.join(""));
  },
  hotspots() {
    // SPEC §5: a hotspot is a duration on the whole device, never a tap on a control. This
    // page is not one of the six S3 pages, so there is no "next page": both durations leave.
    return [
      { x: 0, y: 0, w: 320, h: 86, to: "home", label: "short press · home" },
      { x: 0, y: 86, w: 320, h: 86, to: "home", label: "long press · home" },
    ];
  },
};
