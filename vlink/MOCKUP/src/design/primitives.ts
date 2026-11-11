// SVG primitives for the VPass mockups.
//
// Contract: every function is pure, takes absolute coordinates in the 412×923
// canvas, returns an SVG string, and reads colours from a `Tokens` object and
// sizes from `metrics`/`font`. The only literals in this file are geometry
// (positions, radii that are not tokens) and the glyph strings copied from app.ts.
import type { Tokens } from "./tokens.js";
import { BASELINE_RATIO, CONST, LIGHT, font, lh, metrics } from "./tokens.js";

/** Glyph strings, verbatim from app.ts (viewWelcome/viewCodes/appBar/viewSettings/
 *  showAddSheet/viewCodes empty state). */
export const GLYPH = {
  back: "‹",
  settings: "⚙",
  search: "🔍",
  plus: "+",
  clock: "⏱",
  camera: "📷",
  key: "🔑",
} as const;

// ── low level ────────────────────────────────────────────────────────────────

const XML_ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** XML-escape text content and attribute values. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML_ESC[c] ?? c);
}

/** Round to 2 decimals; keeps the emitted SVG small and stable. */
export function n(v: number): string {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "0";
}

function attrs(o: Record<string, string | number | undefined>): string {
  let out = "";
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v === undefined || v === "") continue;
    out += ` ${k}="${typeof v === "number" ? n(v) : v}"`;
  }
  return out;
}

export interface PaintOpts {
  fill?: string;
  stroke?: string;
  /** stroke-width */
  sw?: number;
  rx?: number;
  opacity?: number;
  /** e.g. `url(#vp-shadow)` — a filter reference id declared by svgRoot */
  filter?: string;
}

export function rect(x: number, y: number, w: number, h: number, o: PaintOpts = {}): string {
  return `<rect${attrs({
    x, y, width: w, height: h,
    rx: o.rx,
    fill: o.fill ?? "none",
    stroke: o.stroke,
    "stroke-width": o.sw,
    opacity: o.opacity,
    filter: o.filter,
  })}/>`;
}

export interface TextOpts {
  size?: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  opacity?: number;
  fill?: string;
  /** letter-spacing in px (CSS `0.08em` at 22px → 1.76) */
  ls?: number;
  family?: string;
}

export function text(x: number, y: number, s: string, o: TextOpts = {}): string {
  return `<text${attrs({
    x, y,
    "font-family": o.family ?? font.stack,
    "font-size": o.size ?? font.body,
    "font-weight": o.weight ?? 400,
    "text-anchor": o.anchor ?? "start",
    "letter-spacing": o.ls,
    fill: o.fill ?? "currentColor",
    opacity: o.opacity,
  })}>${esc(s)}</text>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, o: { stroke?: string; sw?: number; opacity?: number } = {}): string {
  return `<line${attrs({
    x1, y1, x2, y2,
    stroke: o.stroke ?? "currentColor",
    "stroke-width": o.sw ?? 1,
    opacity: o.opacity,
  })}/>`;
}

export function circle(cx: number, cy: number, r: number, o: PaintOpts = {}): string {
  return `<circle${attrs({
    cx, cy, r,
    fill: o.fill ?? "none",
    stroke: o.stroke,
    "stroke-width": o.sw,
    opacity: o.opacity,
  })}/>`;
}

// ── text measurement (approximation) ─────────────────────────────────────────
// The mockups must fit real strings into fixed boxes (ellipsis on .code-issuer,
// wrapping banners). SVG cannot measure text, and the app's font stack resolves
// to different faces per platform, so widths are estimated from per-character
// advance factors. Accuracy is ±5 % for Latin, ±2 % for CJK — enough for
// truncation and wrapping, not for pixel-exact kerning.

const ADV: Record<string, number> = {
  " ": 0.26, ".": 0.27, ",": 0.27, ":": 0.27, ";": 0.27, "·": 0.3, "|": 0.24,
  "(": 0.33, ")": 0.33, "[": 0.33, "]": 0.33, "@": 0.93, "/": 0.3, "-": 0.33,
  "—": 0.9, "–": 0.5, "…": 0.9, "‹": 0.4, "›": 0.4, "%": 0.9, "+": 0.6, "?": 0.5,
  "!": 0.28, "'": 0.22, '"': 0.36, "&": 0.7,
};

function advance(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  // CJK, kana, hangul, fullwidth forms
  if ((cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xff60)) return 1;
  const a = ADV[ch];
  if (a !== undefined) return a;
  if (ch >= "0" && ch <= "9") return 0.57;
  if (ch >= "A" && ch <= "Z") return 0.66;
  if (ch >= "a" && ch <= "z") return 0.52;
  return 0.5;
}

/** Estimated advance width in px. `ls` is letter-spacing in px, applied per char
 *  (CSS adds it after every character, including the last). */
export function measure(s: string, size: number, weight = 400, ls = 0): number {
  let w = 0;
  let count = 0;
  for (const ch of s) {
    w += advance(ch);
    count++;
  }
  return w * size * (weight >= 600 ? 1.03 : 1) + ls * count;
}

/** Truncate with a single-character ellipsis so the result fits `maxW`. */
export function truncate(s: string, maxW: number, size: number, weight = 400, ls = 0): string {
  if (measure(s, size, weight, ls) <= maxW) return s;
  const chars = [...s];
  for (let keep = chars.length - 1; keep > 0; keep--) {
    const cand = chars.slice(0, keep).join("").trimEnd() + "…";
    if (measure(cand, size, weight, ls) <= maxW) return cand;
  }
  return "…";
}

const CJK = /[\u2e80-\u9fff\uac00-\ud7a3\uf900-\ufaff\uff00-\uff60]/;

/** Greedy wrap to `maxW` px. Latin text breaks on spaces, CJK per character
 *  (the app relies on the browser's default `word-break: normal`). */
export function wrapText(s: string, maxW: number, size: number, weight = 400, ls = 0): string[] {
  const cjk = CJK.test(s);
  const units = cjk ? [...s] : s.split(/(\s+)/).filter((u) => u !== "");
  const lines: string[] = [];
  let cur = "";
  for (const u of units) {
    const cand = cur + u;
    if (cur !== "" && measure(cand, size, weight, ls) > maxW) {
      lines.push(cur.trimEnd());
      cur = cjk ? u : u.trimStart();
    } else {
      cur = cand;
    }
  }
  if (cur.trim() !== "") lines.push(cur.trimEnd());
  return lines.length > 0 ? lines : [""];
}

// ── root ─────────────────────────────────────────────────────────────────────

export interface RootOpts {
  /** CSS `color` for the document: the default fill of every text() call. */
  color?: string;
  shadow?: { dx: number; dy: number; blur: number; color: string };
  fabShadow?: { dx: number; dy: number; blur: number; color: string };
  body?: string;
}

function dropShadow(id: string, s: RootOpts["shadow"]): string {
  return `<filter id="${id}"><feDropShadow dx="${n(s?.dx ?? 0)}" dy="${n(s?.dy ?? 1)}" stdDeviation="${n((s?.blur ?? 3) / 2)}" flood-color="${s?.color ?? LIGHT.shadowSpec.color}"/></filter>`;
}

/** SVG root. The two filters (`#vp-shadow`, `#vp-fab-shadow`) are always
 *  declared: filters are inert until referenced, and every card/fab in this app
 *  carries the same box-shadow, so a per-call defs switch buys nothing. */
export function svgRoot(w: number, h: number, bg: string, o: RootOpts = {}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}"` +
    ` style="color:${esc(o.color ?? LIGHT.text)}" font-family="${esc(font.stack)}">` +
    `<defs>${dropShadow("vp-shadow", o.shadow)}${dropShadow("vp-fab-shadow", o.fabShadow ?? CONST.fabShadowSpec)}</defs>` +
    rect(0, 0, w, h, { fill: bg }) +
    (o.body ?? "") +
    "</svg>"
  );
}

/** The standard 412×923 screen frame for a theme (Pixel 9 Pro Fold, folded). Screen modules should render
 *  their body and pass it here; this is what makes `bg`, the text colour and the
 *  two shadows follow the theme automatically. */
export function svgScreen(t: Tokens, body: string): string {
  return svgRoot(metrics.canvas.w, metrics.canvas.h, t.bg, {
    color: t.text,
    shadow: t.shadowSpec,
    fabShadow: CONST.fabShadowSpec,
    body,
  });
}

// ── atoms ────────────────────────────────────────────────────────────────────

/** Port of app.ts avatarHue(): `hsl(H 62% 46%)`. */
export function avatarHue(seed: string): string {
  let hh = 0;
  for (let i = 0; i < seed.length; i++) hh = (hh * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${hh} 62% 46%)`;
}

export interface AvatarOpts {
  x: number;
  y: number;
  size?: number;
  /** defaults to the first character of the seed, upper-cased (app.ts behaviour) */
  label?: string;
}

/** `.issuer-avatar` — 44×44 circle, white 600 ink, hue from the issuer. */
export function avatar(seed: string, o: AvatarOpts): string {
  const size = o.size ?? metrics.codeRow.avatar;
  const label = o.label ?? ((seed || "?").slice(0, 1).toUpperCase() || "?");
  const fs = (font.avatar * size) / metrics.codeRow.avatar;
  return (
    `<g>` +
    circle(o.x + size / 2, o.y + size / 2, size / 2, { fill: avatarHue(seed) }) +
    text(o.x + size / 2, o.y + size / 2 + fs * BASELINE_RATIO, label, {
      size: fs, weight: 600, anchor: "middle", fill: CONST.avatarInk,
    }) +
    `</g>`
  );
}

export interface CardOpts {
  rx?: number;
  fill?: string;
  stroke?: string;
  shadow?: boolean;
}

/** Surface card: `.detail-card`, `.code-row`, `.settings-row`, `.sheet`. */
export function card(x: number, y: number, w: number, h: number, t: Tokens, o: CardOpts = {}): string {
  return rect(x, y, w, h, {
    fill: o.fill ?? t.surface,
    stroke: o.stroke ?? t.border,
    sw: 1,
    rx: o.rx ?? Number.parseFloat(t.radius),
    filter: o.shadow === false ? undefined : "url(#vp-shadow)",
  });
}

export type ButtonKind = "primary" | "ghost" | "danger" | "wide";

export interface ButtonOpts {
  h?: number;
  size?: number;
}

/** `.btn` — 48 px tall pill, 20 px side padding, 16 px label.
 *  kind = the CSS class: `.primary`, `.ghost`, `.danger`, or bare `.btn.wide`
 *  (no colour class → transparent with inherited text colour). */
export function button(kind: ButtonKind, x: number, y: number, w: number, label: string, t: Tokens, o: ButtonOpts = {}): string {
  const h = o.h ?? metrics.btn.h;
  const size = o.size ?? font.body;
  const skin: PaintOpts =
    kind === "primary" ? { fill: t.primary }
    : kind === "ghost" ? { fill: "none", stroke: t.border, sw: 1 }
    : kind === "danger" ? { fill: t.danger }
    : { fill: "none" };
  const ink =
    kind === "primary" ? t.primaryText
    : kind === "ghost" ? t.primary
    : kind === "danger" ? CONST.dangerInk
    : t.text;
  return (
    rect(x, y, w, h, { ...skin, rx: h / 2 }) +
    text(x + w / 2, y + h / 2 + size * BASELINE_RATIO, truncate(label, w - metrics.btn.padX * 2, size), {
      size, anchor: "middle", fill: ink,
    })
  );
}

/** Natural width of a `.btn` that is not `.wide`: label + 20 px padding on each
 *  side. The confirm dialog's Cancel/OK buttons are sized this way. */
export function buttonWidth(label: string, size: number = font.body): number {
  return measure(label, size) + metrics.btn.padX * 2;
}

/** `.iconbtn` — a 44×44 transparent 50 %-radius hit target with a 20 px glyph.
 *  The box itself is invisible (background: transparent). */
export function iconbtn(x: number, y: number, glyph: string, t: Tokens, o: { size?: number; color?: string } = {}): string {
  const size = o.size ?? font.glyph;
  return text(x + metrics.appbar.icon / 2, y + metrics.appbar.icon / 2 + size * BASELINE_RATIO, glyph, {
    size, anchor: "middle", fill: o.color ?? t.text,
  });
}

export interface AppbarOpts {
  t: Tokens;
  /** draw the 44 px back button (`.iconbtn` "‹") and indent the title */
  back?: boolean;
  /** draw a trailing 44 px icon button with this glyph (codes uses "⚙") */
  trailing?: string;
  /** appbar content row top; defaults to safe.top (44) */
  top?: number;
  titleX?: number;
}

/** `.appbar` — flex row, gap 6, padding safe-top+10 / 2 / 6, 22 px title. */
export function appbar(title: string, o: AppbarOpts): string {
  const t = o.t;
  const top = o.top ?? metrics.safe.top;
  const rowY = top + metrics.appbar.padTop;
  const cy = rowY + metrics.appbar.icon / 2;
  const out: string[] = [];
  if (o.back) out.push(iconbtn(metrics.view.padX + metrics.appbar.padX, rowY, GLYPH.back, t));
  const titleX = o.titleX ?? (o.back
    ? metrics.view.padX + metrics.appbar.padX + metrics.appbar.icon + metrics.appbar.gap
    : metrics.view.padX + metrics.appbar.padX);
  // .appbar-title is an <h1>: UA stylesheet gives it font-weight 700 and the
  // project CSS only overrides size/margin (measured: style.css has no
  // font-weight on .appbar-title). Lane B caught this as a 400-weight title.
  out.push(text(titleX, cy + font.appbar * BASELINE_RATIO, title, { size: font.appbar, weight: 700 }));
  if (o.trailing) {
    const x = metrics.canvas.w - metrics.view.padX - metrics.appbar.padX - metrics.appbar.icon;
    out.push(iconbtn(x, rowY, o.trailing, t));
  }
  return `<g>${out.join("")}</g>`;
}

// ── codes list ───────────────────────────────────────────────────────────────

export interface CodeRowOpts {
  t: Tokens;
  issuer: string;
  account: string;
  /** the 6-digit code, or "······" while it is being computed */
  digits: string;
  /** remaining fraction of the 30 s period, 0..1 (drives `.code-bar`) */
  fraction?: number;
}

/** `.code-row` — 76 px min-height card: avatar · issuer/account · digits/bar.
 *  Internal offsets are derived from the CSS box model (border 1 + padding 14):
 *  content starts at +15, digits baseline +41.7, bar top +55, issuer baseline
 *  +34.2, account baseline +54.2. */
export function codeRow(x: number, y: number, w: number, o: CodeRowOpts): string {
  const t = o.t;
  const m = metrics.codeRow;
  const pad = m.pad + 1; // border + padding
  const inner = w - pad * 2;
  const digitsW = measure(o.digits, font.digitsRow, 500, 0.08 * font.digitsRow);
  const rightW = Math.max(digitsW, m.barW);
  const rightX = x + w - pad;
  const bodyX = x + pad + m.avatar + m.gap;
  const bodyW = rightX - rightW - m.gap - bodyX;
  const out: string[] = [
    card(x, y, w, m.minH, t, { rx: m.radius }),
    avatar(o.issuer || o.account, { x: x + pad, y: y + 16 }),
    text(bodyX, y + 34.2, truncate(o.issuer || o.account, bodyW, font.body, 600), { size: font.body, weight: 600 }),
    text(bodyX, y + 54.2, truncate(o.account, bodyW, font.small), { size: font.small, fill: t.muted }),
    text(rightX, y + 41.7, o.digits, { size: font.digitsRow, weight: 500, anchor: "end", ls: 0.08 * font.digitsRow }),
    // `.code-right` is a flex column whose width is max(digits, 64); the tick sets
    // the bar's INLINE width to a percentage, i.e. 100% of that column at
    // fraction 1 (measured 92.23 for "482913"). Passing `rightW` reproduces it.
    codeBar(rightX - rightW, y + 55, t, o.fraction ?? 1, rightW),
  ];
  return `<g>${out.join("")}</g>`;
}

/** `.code-bar` — 64×3 track with a primary fill. NOTE (SPEC §Deviations): app.ts
 *  assigns the shrinking width to the track element itself, so in the live DOM
 *  the track is covered by the fill at all times. The mockups draw the
 *  CSS-declared track plus fill, which is the intended design and identical to
 *  the app at fraction = 1. */
export function codeBar(x: number, y: number, t: Tokens, fraction = 1, width: number = metrics.codeRow.barW): string {
  const m = metrics.codeRow;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    rect(x, y, width, m.barH, { fill: t.ringTrack, rx: m.barR }) +
    rect(x, y, width * f, m.barH, { fill: t.primary, rx: m.barR })
  );
}

// ── detail ───────────────────────────────────────────────────────────────────

/** `.ring` — conic-gradient ring with an 8 px mask, drawn as a stroked circle
 *  with a dash offset so `fraction` of the circumference is primary (elapsed
 *  fraction, clockwise from 12 o'clock, exactly like the CSS). */
export function ring(
  diameter: number,
  strokeWidth: number,
  fraction: number,
  color: string,
  track: string,
  o: { cx?: number; cy?: number } = {},
): string {
  const cx = o.cx ?? diameter / 2;
  const cy = o.cy ?? diameter / 2;
  const r = (diameter - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    circle(cx, cy, r, { fill: "none", stroke: track, sw: strokeWidth }) +
    `<circle${attrs({
      cx, cy, r,
      fill: "none",
      stroke: color,
      "stroke-width": strokeWidth,
      "stroke-dasharray": `${n(c * f)} ${n(c)}`,
      transform: `rotate(-90 ${n(cx)} ${n(cy)})`,
    })}/>`
  );
}

// ── controls ─────────────────────────────────────────────────────────────────

/** `.switch.on` — 52×32 pill, primary, 26 px knob at left 23. */
export function switchOn(x: number, y: number, t: Tokens): string {
  const m = metrics.settings;
  return (
    rect(x, y, m.switchW, m.switchH, { fill: t.primary, rx: m.switchH / 2 }) +
    circle(x + 23 + m.knob / 2, y + m.switchH / 2, m.knob / 2, { fill: CONST.switchKnob })
  );
}

/** `.switch` — 52×32 pill on --border, 26 px knob at left 3. */
export function switchOff(x: number, y: number, t: Tokens): string {
  const m = metrics.settings;
  return (
    rect(x, y, m.switchW, m.switchH, { fill: t.border, rx: m.switchH / 2 }) +
    circle(x + m.knobInset + m.knob / 2, y + m.switchH / 2, m.knob / 2, { fill: CONST.switchKnob })
  );
}

/** `.fab` — 60 px primary circle with a 30 px "+". Defaults to the CSS position
 *  (right 22, bottom safe+22). */
export function fab(t: Tokens, o: { x?: number; y?: number; glyph?: string } = {}): string {
  const m = metrics.fab;
  const x = o.x ?? metrics.canvas.w - m.right - m.size;
  const y = o.y ?? metrics.canvas.h - (metrics.safe.bottom + m.bottom) - m.size;
  const glyph = o.glyph ?? GLYPH.plus;
  return (
    `<g filter="url(#vp-fab-shadow)">` +
    circle(x + m.size / 2, y + m.size / 2, m.size / 2, { fill: t.primary }) +
    `</g>` +
    text(x + m.size / 2, y + m.size / 2 + font.fab * BASELINE_RATIO, glyph, {
      size: font.fab, anchor: "middle", fill: t.primaryText,
    })
  );
}

// ── overlays ─────────────────────────────────────────────────────────────────

/** `.scrim` — full-canvas 45 % black. */
export function scrim(w: number, h: number): string {
  return rect(0, 0, w, h, { fill: CONST.scrim });
}

/** `.sheet` — surface panel anchored to the bottom with 22 px top corners. */
export function sheet(x: number, y: number, w: number, h: number, t: Tokens): string {
  const r = metrics.sheet.radiusTop;
  const d =
    `M${n(x)} ${n(y + h)} L${n(x)} ${n(y + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)} ` +
    `L${n(x + w - r)} ${n(y)} A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)} ` +
    `L${n(x + w)} ${n(y + h)} Z`;
  return `<path d="${d}" fill="${t.surface}"/>`;
}

/** `.sheet-option` — 56 px row: 40 px icon circle (surface-2 bg, primary glyph)
 *  then the label at gap 16. */
export function sheetOption(x: number, y: number, w: number, icon: string, label: string, t: Tokens): string {
  const m = metrics.sheet;
  const ix = x + m.optionPadX;
  const iy = y + (m.optionH - m.optionIcon) / 2;
  const tx = ix + m.optionIcon + m.optionGap;
  return (
    `<g>` +
    circle(ix + m.optionIcon / 2, iy + m.optionIcon / 2, m.optionIcon / 2, { fill: t.surface2 }) +
    text(ix + m.optionIcon / 2, iy + m.optionIcon / 2 + font.glyph * BASELINE_RATIO, icon, {
      size: font.glyph, anchor: "middle", fill: t.primary,
    }) +
    text(tx, y + m.optionH / 2 + font.body * BASELINE_RATIO, truncate(label, x + w - tx, font.body), { size: font.body }) +
    `</g>`
  );
}

/** `.toast` — pill centred on `cx`, top edge at `y`. Width comes from the text. */
export function toast(cx: number, y: number, label: string, t: Tokens): string {
  const m = metrics.toast;
  const w = measure(label, font.ui) + m.padX * 2;
  const h = lh(font.ui) + m.padY * 2;
  return (
    `<g filter="url(#vp-shadow)">` +
    rect(cx - w / 2, y, w, h, { fill: t.surface2, rx: h / 2 }) +
    `</g>` +
    text(cx, y + h / 2 + font.ui * BASELINE_RATIO, label, { size: font.ui, anchor: "middle" })
  );
}

/** `.banner` — 12 px muted note, centred and wrapped to `w`. */
export function banner(x: number, y: number, w: number, label: string, t: Tokens): string {
  const lines = wrapText(label, w, font.micro);
  const pitch = lh(font.micro);
  return `<g>${lines
    // baseline inside the line box: top + lh/2 + BASELINE_RATIO*size (was
    // y + 0.8*size = 9.6, i.e. 3.3 px high — lane D measured it against §4 rule 4).
    .map((L, i) => text(x + w / 2, y + i * pitch + lh(font.micro) / 2 + font.micro * BASELINE_RATIO, L, { size: font.micro, anchor: "middle", fill: t.muted }))
    .join("")}</g>`;
}

// ── brand marks (verbatim from app.ts) ───────────────────────────────────────

function mark(x: number, y: number, size: number, inner: string, color: string): string {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(size / 64)})" fill="${color}" stroke="${color}">${inner}</g>`;
}

/** viewWelcome's `.brand-mark` inner SVG:
 *  <circle cx=32 cy=32 r=26 fill=none stroke=currentColor stroke-width=3/>
 *  <circle cx=32 cy=32 r=13 fill=currentColor/> */
export function brandMark(x: number, y: number, size: number, color: string): string {
  return mark(
    x, y, size,
    `<circle cx="32" cy="32" r="26" fill="none" stroke-width="3"/><circle cx="32" cy="32" r="13" stroke="none"/>`,
    color,
  );
}

/** lockScreen's `.brand-mark.small` inner SVG: same ring plus a keyhole rect.
 *  <rect x=22 y=28 width=20 height=16 rx=3 fill=currentColor/> */
export function lockMark(x: number, y: number, size: number, color: string): string {
  return mark(
    x, y, size,
    `<circle cx="32" cy="32" r="26" fill="none" stroke-width="3"/><rect x="22" y="28" width="20" height="16" rx="3" stroke="none"/>`,
    color,
  );
}

