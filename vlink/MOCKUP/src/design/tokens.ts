// Design tokens — SOURCE OF TRUTH: pass/frontend/src/style.css
// Every colour literal below is copied verbatim from a `:root` / `html[data-theme="dark"]`
// custom property. Nothing here is invented: if style.css changes, this file must change
// with it (and SPEC.md §Tokens records the mapping).
import type { Theme } from "./contract.js";

/** Parsed `box-shadow` — SVG has no box-shadow, so cards/fab use an feDropShadow
 *  filter whose stdDeviation is half the CSS blur radius (SVG blur = 2 × σ). */
export interface ShadowSpec {
  readonly dx: number;
  readonly dy: number;
  /** CSS blur radius in px (`0 1px 3px …` → 3). */
  readonly blur: number;
  readonly color: string;
}

export interface Tokens {
  readonly name: Theme;
  /** --bg */
  readonly bg: string;
  /** --surface */
  readonly surface: string;
  /** --surface-2 */
  readonly surface2: string;
  /** --text */
  readonly text: string;
  /** --muted */
  readonly muted: string;
  /** --primary */
  readonly primary: string;
  /** --primary-text */
  readonly primaryText: string;
  /** --danger */
  readonly danger: string;
  /** --ring-track */
  readonly ringTrack: string;
  /** --border */
  readonly border: string;
  /** --shadow (exact CSS shorthand, kept for reference) */
  readonly shadow: string;
  /** --shadow parsed for feDropShadow */
  readonly shadowSpec: ShadowSpec;
  /** --radius (declared once in :root; the dark block does not override it) */
  readonly radius: string;
}

/** VLink firmware palette — ONE theme (ui_screens.h:10-15). The mockup's light and
 *  dark slots render identically on purpose (SPEC A4). Values verified by lane V1. */
const VLINK_PALETTE = {
  bg: "#000000",          // C_BG
  surface: "#000000",     // the firmware draws no cards/surfaces; bg is the only fill
  surface2: "#002200",    // C_DRK (bar track) — the only "raised" tone the firmware has
  text: "#00FF00",        // C_GRN
  muted: "#005500",       // C_DIM
  primary: "#00FF00",     // C_GRN — the single accent
  primaryText: "#000000",
  danger: "#FF4444",      // C_RED — defined in ui_screens.h, never used
  ringTrack: "#002200",   // C_DRK
  border: "#005500",      // no borders in the firmware; C_DIM is the closest declared tone
  shadow: "none",         // LVGL draws no shadows
  shadowSpec: { dx: 0, dy: 0, blur: 0, color: "rgba(0,0,0,0)" },
  radius: "0px",          // LVGL rects are square
} as const;

/** style.css `:root` — same palette (there is only one). */
export const LIGHT: Tokens = { name: "light", ...VLINK_PALETTE };

/** The firmware has ONE palette: the dark slot is identical (SPEC A4). */
export const DARK: Tokens = {
  name: "dark",
  ...VLINK_PALETTE,
};

export const THEMES: Record<Theme, Tokens> = { light: LIGHT, dark: DARK };

/** Literals in style.css that sit outside the theme variables and are therefore
 *  identical in both themes. */
export const CONST = {
  /** `.btn.danger { color: #fff }` */
  dangerInk: "#ffffff",
  /** `.switch::after { background: #fff }` */
  switchKnob: "#ffffff",
  /** `.issuer-avatar { color: #fff }` */
  avatarInk: "#ffffff",
  /** `.scrim { background: rgba(0,0,0,0.45) }` */
  scrim: "rgba(0, 0, 0, 0.45)",
  /** `.fab { box-shadow: 0 4px 12px rgba(0,0,0,0.3) }` */
  fabShadowSpec: { dx: 0, dy: 4, blur: 12, color: "rgba(0,0,0,0.3)" } as ShadowSpec,
} as const;

/** Font scale, in px, from style.css + the UA defaults the app relies on.
 *  `body { font-size: 16px; line-height: 1.45 }` is the root of the scale
 *  (1rem = 16px), so rem-based rules are resolved here. */
export const font = {
  /** The panel renders LVGL's built-in Montserrat Medium (14 and 40 px). The mockup loads the
   *  same TTF (public/fonts, copied from vkey/vendors/lvgl/scripts/built_in_font) so digit
   *  advances match the firmware's slot math. Standalone exported SVGs fall back to system-ui
   *  unless Montserrat is installed — stated in SPEC A6. */
  stack: "Roboto, 'Segoe UI', system-ui, sans-serif",
  /** body */
  body: 17,
  /** body line-height (unitless multiplier) */
  lineHeight: 1.45,
  /** .brand-name */
  brand: 26,
  /** .appbar-title */
  appbar: 22,
  /** .code-digits */
  digitsRow: 22,
  /** .big-code-num */
  digitsDetail: 44,
  /** .value */
  value: 15,
  /** .toast / .preview-row / .confirm-copy */
  ui: 14,
  /** .label / .hint / .code-account / .seconds-left / .welcome-create */
  small: 13,
  /** .meta / .desc / .banner */
  micro: 12,
  /** .issuer-avatar (at its 44 px size) */
  avatar: 19,
  /** .iconbtn / .sheet-option-icon */
  glyph: 20,
  /** .fab */
  fab: 30,
  /** .brand-sub: 0.92rem */
  brandSub: 14.72,
  /** .confirm-secret: 0.85rem */
  secret: 13.6,
  /** .sheet-title is an <h3>: UA 1.17em of 16 */
  sheetTitle: 18.72,
  /** .empty <h2> is unclassed: UA 1.5em of 16 */
  emptyTitle: 24,
} as const;

/** The app's line-height applied to a font size (`line-height: 1.45`). */
export const lh = (size: number): number => size * font.lineHeight;

/** Composition metrics — every value is a style.css declaration, verbatim, in px.
 *  `frame`/`bar` fields are borders and strokes (always 1 or 3 px in the app). */
/** Target device: Pixel 9 Pro Fold, FOLDED (outer display).
 *  6.3" OLED 1080×2424 px at 2.625 density → 411.4 × 923.4 dp, rounded to 412 × 923
 *  (the CSS viewport Chrome reports for this panel). The unfolded panel (2076×2152
 *  → 791×820 dp) is a different layout — `.view { max-width: 640 }` caps the content
 *  column there — and is not built here (SPEC §1 A1).
 *  Safe areas: Pixel status bar 28 dp (24 dp bar + punch-hole allowance) and the
 *  gesture navigation inset 24 dp. Simulated: the app itself reads
 *  env(safe-area-inset-*), which is 0 in a non-viewport-fit WebView. */
import UICONFIG from "../../ui.config.json";

/** Target device — see ui.config.json (a generated project edits that file only). */
export const DEVICE = {
  name: UICONFIG.device.name,
  w: UICONFIG.device.w,
  h: UICONFIG.device.h,
  insetTop: UICONFIG.device.insetTop,
  insetBottom: UICONFIG.device.insetBottom,
} as const;

export const metrics = {
  canvas: { w: DEVICE.w, h: DEVICE.h },
  safe: { top: DEVICE.insetTop, bottom: DEVICE.insetBottom },
  view: { padX: 16, padBottom: 24, maxWidth: 640 },
  appbar: { padTop: 10, padX: 2, padBottom: 6, gap: 6, icon: 44, iconRadius: 999 },
  btn: {
    h: 48, radius: 999, padX: 20, gap: 8,
    /** .btn.wide { margin-top: 10px } */
    wideTop: 10,
    /** .form .btn { margin-top: 18px } */
    formTop: 18,
    /** .view.detail > .btn / .view.scan .btn { margin-top: 12px } */
    afterCard: 12,
    /** .welcome .btn.wide, .lock .btn.wide { max-width: 320px } */
    maxW: 320,
  },
  fab: { size: 60, right: 22, bottom: 22 },
  codeRow: {
    minH: 76, pad: 14, gap: 14, radius: 18, gapAfter: 10,
    avatar: 44, rightGap: 5, barW: 64, barH: 3, barR: 2, listTop: 6,
  },
  detail: {
    cardTop: 8, cardPadY: 24, cardPadX: 16,
    bigCode: 180, bigCodeGap: 16, ringStroke: 8,
    secondsTop: 4, metaTop: 10,
  },
  empty: { padY: 64, padX: 16, icon: 44, iconGap: 8 },
  field: { gapY: 14, labelGap: 6, inputH: 48, inputRadius: 14, inputPadX: 14, previewTop: 8 },
  settings: {
    listTop: 8, rowRadius: 14, rowPad: 14, rowGap: 10, gap: 12,
    switchW: 52, switchH: 32, knob: 26, knobInset: 3,
  },
  sheet: {
    radiusTop: 22, pad: 18, titleGap: 6, actionsGap: 10, actionsTop: 16,
    optionH: 56, optionPadY: 8, optionPadX: 10, optionGap: 16,
    optionRadius: 14, optionIcon: 40, optionStackGap: 2,
  },
  toast: { topOffset: 16, padY: 10, padX: 18 },
  banner: { top: 4 },
  /** .scan-stage { min-height: 44vh } → 0.44 × canvas height (923) = 406.12 */
  scan: { stageMinH: Math.round(DEVICE.h * 0.44 * 100) / 100, padY: 24, padX: 12, hintMaxCh: 36 },
  brand: { mark: 88, markSmall: 56 },
} as const;

/** Absolute anchors for the 412×923 canvas (Pixel 9 Pro Fold, folded), derived from `metrics`.
 *  These are the numbers screen modules should start from. */
export const layout = {
  /** .view horizontal padding */
  contentX: metrics.view.padX,
  contentRight: metrics.canvas.w - metrics.view.padX,
  contentW: metrics.canvas.w - metrics.view.padX * 2,
  /** appbar: safe.top + padTop = 54 is where the appbar's content row starts… */
  appbarTop: metrics.safe.top + metrics.appbar.padTop,
  /** …and 54 + 44 (icon height) + 6 (padBottom) = 104 is where the view content starts
   *  on every screen that has an appbar with a back or trailing 44 px icon button. */
  appbarBottom: metrics.safe.top + metrics.appbar.padTop + metrics.appbar.icon + metrics.appbar.padBottom,
  /** Title x when a 44 px back button precedes it: 16 + 2 + 44 + 6. */
  titleXWithBack: metrics.view.padX + metrics.appbar.padX + metrics.appbar.icon + metrics.appbar.gap,
  /** Title x without a back button: 16 + 2. */
  titleX: metrics.view.padX + metrics.appbar.padX,
  /** .codes-list margin-top 6 under the appbar → first row top. */
  firstRowY: metrics.safe.top + metrics.appbar.padTop + metrics.appbar.icon + metrics.appbar.padBottom + metrics.codeRow.listTop,
  /** .fab: right 22, bottom safe+22 → its 60×60 box. */
  fabX: metrics.canvas.w - metrics.fab.right - metrics.fab.size,
  fabY: metrics.canvas.h - (metrics.safe.bottom + metrics.fab.bottom) - metrics.fab.size,
  /** Toast pill centre line: #toast-root top = safe.top + 16. */
  toastTop: metrics.safe.top + metrics.toast.topOffset,
} as const;

/** Baseline offset for text that is vertically centred in a box: the app's font
 *  stack has a cap-height of roughly 0.7em, so the baseline sits this fraction of
 *  the font size below the optical centre. Approximation (±0.5 px at 16 px). */
export const BASELINE_RATIO = 0.35;
export const baselineIn = (centreY: number, size: number): number => centreY + size * BASELINE_RATIO;
