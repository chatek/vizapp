#!/usr/bin/env node
// Generate a new UI-blueprint project from this framework.
//
//   node scripts/new-ui-design.mjs <targetDir> --title-en "X UI Mockup in SVG" \
//        --title-zh "X SVG 界面手稿" --w 320 --h 172 --port 5179 \
//        [--device "Waveshare ESP32-S3-LCD-1.47 · 320 × 172"] [--inset-top 0] [--inset-bottom 0]
//
// What it copies: the shell (two planes), the design layer (contract/tokens/primitives/strings),
// the exporter + self-check, vite/tsconfig/index.html/.gitignore. What it does NOT copy: any
// screen, the SPEC, the generated public/ output, node_modules.
//
// The generated project reads everything device-specific from its own ui.config.json, so the
// only files a new team edits are: ui.config.json, src/design/tokens.ts (palette), src/screens/*.
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const target = args.shift();
if (!target) {
  console.error("usage: new-ui-design.mjs <targetDir> --title-en .. --title-zh .. --w .. --h .. --port ..");
  process.exit(2);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const cfg = {
  productTitle: { en: opt("title-en", "UI Mockup in SVG"), zh: opt("title-zh", "SVG 界面手稿") },
  device: {
    name: opt("device", `Device · ${opt("w", "320")} × ${opt("h", "172")}`),
    w: Number(opt("w", 320)),
    h: Number(opt("h", 172)),
    insetTop: Number(opt("inset-top", 0)),
    insetBottom: Number(opt("inset-bottom", 0)),
  },
  port: Number(opt("port", 5190)),
  stringsModule: opt("strings", ""),
};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dst = path.resolve(process.cwd(), target);
await mkdir(dst, { recursive: true });

const files = ["index.html", "package.json", "tsconfig.json", ".gitignore", "vite.config.ts"];
for (const f of files) await cp(path.join(root, f), path.join(dst, f));
for (const d of ["src/design", "scripts"]) {
  await cp(path.join(root, d), path.join(dst, d), { recursive: true, force: true });
}
await mkdir(path.join(dst, "src/screens"), { recursive: true });

// A generated project gets its OWN string table: the framework must not reach into another
// product's i18n module. Replace the values with your product's copy.
await writeFile(path.join(dst, "src/design/strings.ts"), `// String table for this mockup. Replace the values with your product's own copy;
// keys are free-form (t() falls back to the key, so a missing entry is visible, not silent).
export type Lang = "en" | "zh";

const DICT = {
  en: {
    appName: ${JSON.stringify(cfg.productTitle.en)},
    ok: "OK",
    cancel: "Cancel",
    back: "Back",
  },
  zh: {
    appName: ${JSON.stringify(cfg.productTitle.zh)},
    ok: "确定",
    cancel: "取消",
    back: "返回",
  },
} as const;

let lang: Lang = "en";
export function setStringsLang(l: Lang): void { lang = l; }
export function t(key: string): string {
  const table = DICT[lang] as Record<string, string>;
  return table[key] ?? (DICT.en as Record<string, string>)[key] ?? key;
}
`);

// Title in index.html + package name follow the config.
{
  const p = path.join(dst, "index.html");
  const html = await readFile(p, "utf8");
  await writeFile(p, html.replace(/<title>.*?<\/title>/s, `<title>${cfg.productTitle.en}</title>`));
  const pkgPath = path.join(dst, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.name = path.basename(dst).toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "ui-design";
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}
await cp(path.join(root, "src/main.ts"), path.join(dst, "src/main.ts"));
await cp(path.join(root, "src/style.css"), path.join(dst, "src/style.css"));
await cp(path.join(root, "src/vite-env.d.ts"), path.join(dst, "src/vite-env.d.ts")).catch(() => {});

// The generated project owns its copy of ui.config.json.
await writeFile(path.join(dst, "ui.config.json"), JSON.stringify(cfg, null, 2) + "\n");

// Starter screen registry + one worked example at the target device size.
await writeFile(path.join(dst, "src/screens/index.ts"), `// Screen registry: the shell and the exporter read this array.
// Add one module per screen, export a Screen from ../design/contract.ts, then list it here.
import type { Screen } from "../design/contract.js";
import { example } from "./example.js";

export const SCREENS: Screen[] = [example];
`);
await writeFile(path.join(dst, "src/screens/example.ts"), `import type { Screen } from "../design/contract.js";
import { THEMES, font, metrics } from "../design/tokens.js";
import { button, card, svgScreen, text } from "../design/primitives.js";

/** A worked example at the target device size. Delete it once the real screens exist. */
export const example: Screen = {
  id: "example",
  title: "Example",
  group: "Example",
  states: ["default"],
  render({ theme }) {
    const t = THEMES[theme];
    const cx = metrics.canvas.w / 2;
    return svgScreen(t, [
      text(12, 24, "Example screen", { size: font.body, weight: 600, fill: t.text }),
      text(12, 44, "Replace me with a real screen", { size: font.small, fill: t.muted }),
      card(12, 60, metrics.canvas.w - 24, 64, t, { rx: 10 }),
      button("primary", 12, metrics.canvas.h - 56, metrics.canvas.w - 24, "OK", t, {}),
    ].join(""));
  },
  hotspots() { return []; },
};
`);

// SPEC skeleton the team fills in.
await writeFile(path.join(dst, "SPEC.md"), `# ${cfg.productTitle.en} — spec

> Replace this skeleton. It is the reverse-engineering record the mockup is graded against.

## 1. Assumptions
- Canvas ${cfg.device.w} × ${cfg.device.h} px, 1 SVG unit = 1 device px.
- ${cfg.device.name}

## 2. Tokens (from the product's own source)

| var | light | dark | used by |
|---|---|---|---|

## 3. Metrics

## 4. Screen and state inventory

## 5. Interaction map

## 6. Deviations / untraceable values
`);

const { stdout } = await import("node:process");
stdout.write(`generated ${dst}\n  device ${cfg.device.w}x${cfg.device.h}  port ${cfg.port}\n  next: cd ${target} && npm install && npm run dev\n`);
