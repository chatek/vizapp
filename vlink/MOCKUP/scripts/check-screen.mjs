// Self-check one screen module: render every state x theme x language, assert the
// contract (412x923 svg, correct viewBox, no external assets, no NaN/undefined).
// Usage: node scripts/check-screen.mjs src/screens/welcome.ts
import { build } from "esbuild";
import { tmpdir } from "node:os";
import path from "node:path";

const rel = process.argv[2];
if (!rel) { console.error("usage: node scripts/check-screen.mjs src/screens/<id>.ts"); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { readFileSync } = await import("node:fs");
const CFG = JSON.parse(readFileSync(path.join(root, "ui.config.json"), "utf8"));
const VB = `viewBox="0 0 ${CFG.device.w} ${CFG.device.h}"`;
const WH = [`width="${CFG.device.w}"`, `height="${CFG.device.h}"`];
const tmp = path.join(tmpdir(), `vpass-check-${process.pid}.mjs`);

await build({
  entryPoints: [path.resolve(root, rel)],
  bundle: true, format: "esm", platform: "node", target: "node20",
  outfile: tmp, logLevel: "silent",
});
const mod = await import(`file://${tmp}?t=${Date.now()}`);
const screens = Object.values(mod).filter((v) => v && typeof v === "object" && typeof v.render === "function");
if (!screens.length) { console.error("no Screen export found in " + rel); process.exit(1); }

let n = 0, bad = 0;
for (const s of screens) {
  const states = s.states?.length ? s.states : [undefined];
  for (const state of states) for (const theme of ["light", "dark"]) for (const lang of ["en", "zh"]) {
    const svg = s.render({ theme, lang, state });
    const problems = [];
    if (!svg.startsWith("<svg")) problems.push("not <svg");
    if (!svg.includes(VB)) problems.push(`viewBox (expected ${CFG.device.w}x${CFG.device.h})`);
    if (!WH.every((a) => svg.includes(a))) problems.push("size");
    if (/<image|href="http|@import/.test(svg)) problems.push("external asset");
    if (/NaN|undefined|Infinity/.test(svg)) problems.push("NaN/undefined/Infinity in output");
    if (problems.length) { bad++; console.error(`FAIL ${s.id}/${state ?? "-"}/${theme}/${lang}: ${problems.join(", ")}`); }
    n++;
  }
  const hs = s.hotspots?.({ theme: "light", lang: "en", state: states[0] }) ?? [];
  for (const h of hs) if (![h.x,h.y,h.w,h.h].every(Number.isFinite)) { bad++; console.error(`FAIL ${s.id}: bad hotspot`); }
  console.log(`  ${s.id}: states=[${states.join(", ")}] hotspots=${hs.length} bytes=${s.render({theme:"light",lang:"en",state:states[0]}).length}`);
}
console.log(`checked ${n} render(s), ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
