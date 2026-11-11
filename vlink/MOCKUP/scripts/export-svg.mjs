// Emit every screen in every state x theme x language as standalone .svg files.
// Screens are pure TS returning SVG strings, so we bundle them with esbuild and run in Node.
import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { readFileSync } = await import("node:fs");
const CFG = JSON.parse(readFileSync(path.join(root, "ui.config.json"), "utf8"));
const VB = `viewBox="0 0 ${CFG.device.w} ${CFG.device.h}"`;
const outDir = path.join(root, "public", "screens");
const tmp = path.join(tmpdir(), `vpass-screens-${process.pid}.mjs`);

await build({
  entryPoints: [path.join(root, "src", "screens", "index.ts")],
  bundle: true, format: "esm", platform: "node", target: "node20",
  outfile: tmp, logLevel: "silent",
});

const { SCREENS } = await import(`file://${tmp}?t=${Date.now()}`);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

let n = 0;
for (const s of SCREENS) {
  const states = s.states && s.states.length ? s.states : [undefined];
  for (const state of states) {
    for (const theme of ["light", "dark"]) {
      for (const lang of ["en", "zh"]) {
        const svg = s.render({ theme, lang, state });
        if (!svg.startsWith("<svg")) throw new Error(`${s.id}: render() did not return an <svg>`);
        if (!svg.includes(VB)) throw new Error(`${s.id}: wrong viewBox (expected ${CFG.device.w}x${CFG.device.h})`);
        const name = [s.id, state, theme, lang].filter(Boolean).join("--") + ".svg";
        await writeFile(path.join(outDir, name), svg);
        n++;
      }
    }
  }
}
await rm(tmp, { force: true });

// The shell links to /SPEC.md ("Open SPEC.md"); serve the document itself.
const { copyFile } = await import("node:fs/promises");
await copyFile(path.join(root, "SPEC.md"), path.join(root, "public", "SPEC.md"));

console.log(`exported ${n} svg file(s) + public/SPEC.md from ${SCREENS.length} screen(s)`);
