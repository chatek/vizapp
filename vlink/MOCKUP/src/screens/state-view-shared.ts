// Shared chrome + row geometry for the SEVEN PROPOSAL screens
// (`state-clock`, `state-accounts`, `state-provisioning`, `state-usb`,
// `state-security`, `state-firmware`, `approval`).
//
// NOT a screen: this module exports no `Screen` and is not listed in `index.ts`.
// `scripts/check-screen.mjs` is run on the seven screen modules, not on this file.
//
// WHAT IS THE DOCUMENT'S, WHAT IS THE FIRMWARE'S, WHAT IS MINE
//   Document (UX_DESIGN.md §4 / §7): the copy of every page and which fields each page
//   shows. Copied verbatim where the doc gives a literal; where it gives a template such
//   as `source: provisioned <when>` the doc's own words are kept and only the slot is
//   filled.
//   Firmware (ui_screens.cpp:55-65, SPEC §3.1/§3.3): the header row — "VLink" at x 8 and
//   the version right-aligned to x 312, both f14 / C_DIM — and the f14 line box
//   (line 16, base 3, so a baseline sits 13 px below its box top).
//   MINE (UX_DESIGN gives these pages no position for anything, and the firmware has no
//   counterpart at all — SPEC §6 D2): the row stack (4 rows from y 24, pitch 18), the
//   hint band split into [optional left note] + [right page indicator], the ">" marker
//   plus C_DRK band used to say "this is the current one", and the key/value columns.
//
// LVGL plausibility: every element here is one label or one filled rect. A row carries
// two colours without a second widget because LVGL 8 recolours inline —
// `lv_label_set_recolor(label, true)` + "#005500 source:# #00FF00 ok#".
import type { Tokens } from "../design/tokens.js";
import { metrics } from "../design/tokens.js";
import { measure, rect, text, truncate } from "../design/primitives.js";
import { t as str } from "../design/strings.js";

/** C_AMB `#FFA500` — ui_screens.h:12. It is the only firmware colour `tokens.ts` does not
 *  carry (its palette has C_BG/C_GRN/C_DIM/C_DRK plus the never-used C_RED), and tokens.ts
 *  is not this lane's to edit, so the amber warning tone is declared here with its source —
 *  the same declaration, for the same reason, as main.ts:12. Red does NOT need this: C_RED
 *  `#FF4444` is `tokens.danger`, which is how the provisioning page uses it. */
export const C_AMB = "#FFA500";

/** `lv_font_montserrat_14` — line 16, base 3 (SPEC §3.3), the font every label on these
 *  pages uses. f40 (line 44, base 8) is NOT used here and that is a measurement, not an
 *  oversight: the shortest line any page carries ("APPROVE LOGIN?", 14 chars) measures
 *  347 px at 40 px in the advance table, i.e. wider than the 320 px panel. The state view is
 *  a text page; the hero size stays on the main screen, where six digits are all it has to hold. */
export const F_LABEL = { size: 14, line: 16, base: 3 } as const;

/** `lv_font_montserrat_20` — line 22, base 4 (`lv_font_montserrat_20.c:3207-3208`), ENABLED
 *  (`CONFIG_LV_FONT_MONTSERRAT_20=y`). Used for VALUE text only: a 20 px value beside a 14 px
 *  label is the hierarchy this panel can express without inventing a colour. */
export const F_VALUE = { size: 20, line: 22, base: 4 } as const;

/** `lv_font_montserrat_14` — line 16, base 3 (SPEC §3.3), the font every label on these
 *  pages uses. f40 (line 44, base 8) is NOT used here and that is a measurement, not an
 *  oversight: the shortest line any page carries ("APPROVE LOGIN?", 14 chars) measures
 *  347 px at 40 px in the advance table, i.e. wider than the 320 px panel. The state view is
 *  a text page; the hero size stays on the main screen, where six digits are all it has to hold. *//** LVGL puts a glyph's baseline `line_height − base_line` below its line box top
 *  (vendors/lvgl/src/draw/sw/lv_draw_sw_letter.c:132) → 13 px for f14. */
export const baseline = (lineTop: number, f: { line: number; base: number }): number =>
  lineTop + f.line - f.base;

/** Panel centre (LV_ALIGN_CENTER) and the main screen's own text margins: the name row is
 *  12 … 308 in a 296 px box (SPEC §3.2). */
export const CX = metrics.canvas.w / 2;
export const LEFT = 12;
export const RIGHT = metrics.canvas.w - 12;

/** Row stack — MINE. Four f14 line boxes starting where the main screen's name row starts
 *  (y 24), pitch 18: baselines 37 / 55 / 73 / 91, last ink row ending at ~92, clear of the
 *  hint band (box 100–116). Four rows is the budget: a fifth baseline (109) collides. */
export const ROW = { top0: 24, pitch: 18 } as const;
export const rowTop = (i: number): number => ROW.top0 + i * ROW.pitch;
export const rowBase = (i: number): number => baseline(rowTop(i), F_LABEL);

/** Hint band: box 100–116, baseline 113 — the firmware's `CENTER, 0, 22` + f14 (SPEC §3.1). */
export const HINT_TOP = 100;
export const HINT_BASE = baseline(HINT_TOP, F_LABEL);

/** List-line columns — MINE: a 14 px marker gutter, then the text column at 26. The text
 *  column is 282 px wide, i.e. narrower than the main screen's 296 px name row, which is
 *  why a label the main screen cuts with `…` wraps here instead. */
export const MARK_X = 14;
export const LABEL_X = 26;

/** The header every page keeps: `VLink` at x 8, the version right-aligned to x 312, y 4,
 *  f14, C_DIM — verbatim from ui_screens.cpp:55-65 (main.ts draws the same two labels). */
export function headerOf(tk: Tokens): string {
  const y = baseline(4, F_LABEL);
  return (
    text(8, y, str("vlink"), { size: F_LABEL.size, fill: tk.muted }) +
    text(metrics.canvas.w - 8, y, str("version"), { size: F_LABEL.size, anchor: "end", fill: tk.muted })
  );
}

/** "1/6" … "6/6" in the hint band, right-aligned — MINE. The doc names six ordered pages
 *  (UX_DESIGN.md:94-107) but draws no index, so the position and the "n/6" form are mine;
 *  C_DIM is what the firmware uses for prose the eye should not chase (SPEC §3.2). */
export function pageIndicator(tk: Tokens, page: number, of = 6): string {
  return text(RIGHT, HINT_BASE, `${page}/${of}`, {
    size: F_LABEL.size, anchor: "end", fill: tk.muted,
  });
}

/** Space kept clear on the right of the hint band for the page indicator: the widest one
 *  ("6/6") measures 20.2 px at f14, so 40 px leaves the gap the header's two labels have. */
const INDICATOR_RESERVE = 40;

/** Optional left half of the hint band — MINE (same band the firmware puts its hints in). */
export function hintLeft(tk: Tokens, s: string, fill?: string): string {
  return text(LEFT, HINT_BASE, truncate(s, RIGHT - LEFT - INDICATOR_RESERVE, F_LABEL.size), {
    size: F_LABEL.size, fill: fill ?? tk.muted,
  });
}

/** key/value pages: a FIXED integer value column and a shared baseline.
 *
 *  REFINED 2026-10-31 — the first cut let the value follow the key ("key: value" with one
 *  space), which produced fractional x positions (63.1 / 41.26 / 55.82) and a ragged column
 *  on every page. LVGL positions a label at INTEGER coordinates, so a column that is not
 *  fixed is a column the firmware cannot reproduce.
 *
 *  Now: keys UPPERCASE at x 12 (f14, letter-space 1), values at x 104 (f20) — two integer
 *  columns, one shared baseline, everything expressible as two lv_labels per row. */
export const KV = { top0: 26, pitch: 24, valueX: 104 } as const;
/** Shared baseline for both cells: the f20 baseline of the row (top + 18), so a 14 px key
 *  and a 20 px value sit on ONE line, the way LVGL's own baseline alignment does it. */
export const kvBase = (i: number): number => KV.top0 + i * KV.pitch + F_VALUE.line - F_VALUE.base;

export function kvRow(tk: Tokens, i: number, key: string, value: string, fill?: string): string {
  const y = kvBase(i);
  const label = key.replace(/:$/, "").toUpperCase();
  return (
    text(LEFT, y, label, { size: F_LABEL.size, ls: 1, fill: tk.text }) +
    text(KV.valueX, y, truncate(value, RIGHT - KV.valueX, F_VALUE.size), { size: F_VALUE.size, fill: fill ?? tk.text })
  );
}

/** A bare sentence on a row, no key — MINE (a consequence/reason line, which UX_DESIGN §4
 *  asks for on two pages but gives no literal for). */
export function noteRow(tk: Tokens, i: number, s: string, fill?: string): string {
  return text(LEFT, rowBase(i), truncate(s, RIGHT - LEFT, F_LABEL.size), {
    size: F_LABEL.size, fill: fill ?? tk.muted,
  });
}

/** One line of a vertical list (`accounts`, `usb`): optional C_DRK band behind the row, a
 *  ">" marker in the 14 px gutter when the line is the current one, then the label.
 *  Marker + band + columns are MINE; colour alone cannot mark a row on this panel because
 *  C_DIM is 2.30 : 1 on black (SPEC §2), so the marker is a glyph, not a tone. */
export function listLine(
  tk: Tokens,
  i: number,
  label: string,
  o: { current?: boolean; cont?: boolean } = {},
): string {
  const y = rowBase(i);
  const out: string[] = [];
  if (o.current) out.push(rect(8, rowTop(i) - 2, metrics.canvas.w - 16, F_LABEL.line + 4, { fill: tk.ringTrack }));
  if (o.current && !o.cont) out.push(text(MARK_X, y, ">", { size: F_LABEL.size, fill: tk.text }));
  out.push(text(LABEL_X, y, truncate(label, RIGHT - LABEL_X, F_LABEL.size), {
    size: F_LABEL.size, fill: tk.text,
  }));
  return out.join("");
}

/** Width a list line has for its text — exported so a page can wrap a label itself and
 *  count the rows it consumes. */
export const LIST_W = RIGHT - LABEL_X;
