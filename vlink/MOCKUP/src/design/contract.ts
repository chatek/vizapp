// The contract every screen module implements. Screens are pure: given a theme,
// a language and (optionally) one of their declared states they return one SVG
// string. No DOM, no module-level state, no external assets, no `fetch`.
//
// Hard requirements (checked by scripts/check-screen.mjs and scripts/export-svg.mjs,
// both reading ui.config.json):
//   • the string starts with "<svg"
//   • it carries viewBox="0 0 320 172"
//   • it is exactly 320×172 px
//   • it contains no <image>, no <use href="http…"> and no @import

export type Theme = "light" | "dark";
export type Lang = "en" | "zh";

export interface Hotspot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Id of the screen this region navigates to (see SPEC.md §Interaction map). */
  to: string;
  label: string;
}

export interface Screen {
  id: string;
  title: string;
  group: string;
  /** true = the product does NOT implement this screen yet; it is drawn from the design
   *  document only. The shell shows a PROPOSAL badge so it can never pass for shipped UI. */
  proposal?: boolean;
  /** Declared states; `render({ state })` must accept every id in this list.
   *  Screens with a single presentation may omit it (treated as ["default"]). */
  states?: string[];
  render(o: { theme: Theme; lang: Lang; state?: string }): string;
  hotspots?(o: { theme: Theme; lang: Lang; state?: string }): Hotspot[];
}

/** The mockup canvas every screen must paint into: the Waveshare ESP32-C6-LCD-1.47
 *  panel driven landscape (ST7789, MADCTL 0x70; SPEC §1 A1). 1 SVG unit = 1 LCD px.
 *  Same values as ui.config.json — the scripts read that file, this is the in-src mirror. */
export const CANVAS = { w: 320, h: 172 } as const;
export const VIEWBOX = "0 0 320 172" as const;
