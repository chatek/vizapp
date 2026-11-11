// VPass UI blueprint — two vertical planes:
//   LEFT  : the Pixel 9 Pro Fold screen (412×923), clickable hotspots.
//   RIGHT : everything textual — title, state, controls, and the screen's own
//           annotation parsed from SPEC.md (element tree, metrics, notes), plus
//           the hotspot map and links to the .svg / SPEC.md.
import { SCREENS } from "./screens/index.js";
import { BOM } from "./design/bom.js";
import type { Lang, Screen, Theme } from "./design/contract.js";
import SPEC_RAW from "../SPEC.md?raw";
import UICONFIG from "../ui.config.json";

const shell = document.getElementById("shell") as HTMLElement;
// The grid lives on `.shell`; keep the class even if index.html loses it.
shell.classList.add("shell");

// Deep-linkable view: /?theme=dark&lang=zh&screen=codes&state=empty
const q = new URLSearchParams(location.search);
let theme: Theme = q.get("theme") === "dark" ? "dark" : "light";
let lang: Lang = q.get("lang") === "zh" ? "zh" : "en";
let currentId = SCREENS.some((s) => s.id === q.get("screen")) ? (q.get("screen") as string) : (SCREENS[0]?.id ?? "");
const stateSel = new Map<string, string>();

const byId = (id: string): Screen | undefined => SCREENS.find((s) => s.id === id);

const CHROME = {
  en: {
    device: UICONFIG.device.name,
    title: UICONFIG.productTitle.en,
    sub: "reverse-engineered from pass/frontend · every state · both themes · both languages",
    screen: "Screen",
    themeG: "Theme",
    light: "Light",
    dark: "Dark",
    langG: "Language",
    states: "States",
    annotation: "Annotation (from SPEC.md)",
    hotspots: "Hotspots",
    files: "Files",
    openSvg: "Open this screen as .svg ↗",
    openSpec: "Open SPEC.md ↗",
    noSpec: "No SPEC section for this screen.",
    noHotspots: "This screen has no clickable regions.",
    hint: "Click a hotspot on the LCD to navigate; use the state chips to see each variant.",
    pick: "Pick a screen",
  },
  zh: {
    device: UICONFIG.device.name,
    title: UICONFIG.productTitle.zh,
    sub: "从 pass/frontend 逆向还原 · 全部状态 · 双主题 · 中英双语",
    screen: "界面",
    themeG: "主题",
    light: "浅色",
    dark: "深色",
    langG: "语言",
    states: "状态",
    annotation: "标注（摘自 SPEC.md）",
    hotspots: "热区",
    files: "文件",
    openSvg: "在 .svg 中打开此界面 ↗",
    openSpec: "打开 SPEC.md ↗",
    noSpec: "此界面没有对应的 SPEC 章节。",
    noHotspots: "此界面没有可点击区域。",
    hint: "点击手机上的热区可跳转；用状态按钮查看每种变体。",
    pick: "选择界面",
  },
} as const;

const TITLES_ZH: Record<string, string> = {
  welcome: "欢迎 / 首次启动", codes: "口令列表", detail: "账户详情", confirm: "在门户完成",
  add: "手动录入", scan: "扫描二维码", settings: "设置", lock: "锁屏",
  "add-sheet": "添加账户（浮层）", "confirm-dialog-rename": "重命名对话框",
  "confirm-dialog-remove": "删除对话框", toast: "提示条",
  "banner-signed-out": "未登录横幅", "banner-browser-mode": "浏览器模式横幅",
};
const GROUPS_ZH: Record<string, string> = {
  Onboarding: "引导", Codes: "口令", Entry: "录入", System: "系统", Overlays: "浮层",
};

const titleOf = (s: Screen): string => (lang === "zh" ? TITLES_ZH[s.id] ?? s.title : s.title);
const groupOf = (g: string): string => (lang === "zh" ? GROUPS_ZH[g] ?? g : g);
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// ── SPEC.md → per-screen annotation ─────────────────────────────────────────
interface SpecSection { title: string; body: string }
const SPEC = (() => {
  const map = new Map<string, SpecSection>();
  let cur: { ids: string[]; title: string; body: string[] } | null = null;
  const flush = (): void => {
    if (!cur) return;
    const body = cur.body.join("\n").trim();
    for (const id of cur.ids) map.set(id, { title: cur.title, body });
    cur = null;
  };
  for (const line of SPEC_RAW.split("\n")) {
    const h = /^###\s+(\d+\.\d+)\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const ids = [...h[2].matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
      cur = { ids, title: `${h[1]} · ${h[2].replace(/`/g, "")}`, body: [] };
      continue;
    }
    if (/^##\s/.test(line)) { flush(); continue; }
    cur?.body.push(line);
  }
  flush();
  return map;
})();

/** Render a SPEC section body: fenced blocks → <pre>, bullets → <ul>, prose → <p>. */
function renderSpecBody(body: string): string {
  const out: string[] = [];
  let pre: string[] | null = null;
  let list: string[] | null = null;
  const flushList = (): void => { if (list) { out.push(`<ul>${list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`); list = null; } };
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) {
      if (pre) { out.push(`<pre>${esc(pre.join("\n"))}</pre>`); pre = null; } else { flushList(); pre = []; }
      continue;
    }
    if (pre) { pre.push(line); continue; }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) { (list ??= []).push(bullet[1]); continue; }
    flushList();
    if (line.trim() === "") continue;
    if (/^\|/.test(line)) { out.push(`<pre class="table">${esc(line)}</pre>`); continue; }
    out.push(`<p>${esc(line)}</p>`);
  }
  if (pre) out.push(`<pre>${esc((pre as string[]).join("\n"))}</pre>`);
  flushList();
  return out.join("");
}

function applyShell(): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

function svgHref(s: Screen, state: string | undefined): string {
  const states = s.states ?? [];
  const name = [s.id, states.length ? state : undefined, theme, lang].filter(Boolean).join("--");
  return `/screens/${name}.svg`;
}

// ── render ──────────────────────────────────────────────────────────────────
function controls(c: (typeof CHROME)["en"] | (typeof CHROME)["zh"], states: string[], state: string | undefined): string {
  const chips = states.length > 1
    ? `<div class="chips" role="group" aria-label="${c.states}">${states
        .map((st) => `<button data-state="${st}" aria-pressed="${st === state}">${st}</button>`)
        .join("")}</div>`
    : "";
  return `
    <div class="ctl-row">
      <div class="seg" role="group" aria-label="${c.themeG}">
        <button data-theme="light" aria-pressed="${theme === "light"}">${c.light}</button>
        <button data-theme="dark" aria-pressed="${theme === "dark"}">${c.dark}</button>
      </div>
      <div class="seg" role="group" aria-label="${c.langG}">
        <button data-lang="en" aria-pressed="${lang === "en"}">EN</button>
        <button data-lang="zh" aria-pressed="${lang === "zh"}">中文</button>
      </div>
    </div>
    ${chips}`;
}

function picker(c: (typeof CHROME)["en"] | (typeof CHROME)["zh"]): string {
  const groups = new Map<string, Screen[]>();
  for (const s of SCREENS) { const g = groups.get(s.group) ?? []; g.push(s); groups.set(s.group, g); }
  const opts = [...groups.entries()].map(([g, ss]) =>
    `<optgroup label="${esc(groupOf(g))}">${ss
      .map((s) => `<option value="${s.id}"${s.id === currentId ? " selected" : ""}>${esc(titleOf(s))}</option>`)
      .join("")}</optgroup>`).join("");
  return `<label class="pick"><span>${c.pick}</span><select id="screen-pick">${opts}</select></label>`;
}

function renderLeft(s: Screen | undefined, state: string | undefined, c: (typeof CHROME)["en"] | (typeof CHROME)["zh"]): HTMLElement {
  const left = document.createElement("section");
  left.className = "plane plane-left";
  if (!s) { left.textContent = c.noSpec; return left; }

  const wrap = document.createElement("div");
  wrap.className = "device-wrap";
  const device = document.createElement("div");
  device.className = "device";
  const screen = document.createElement("div");
  screen.className = "screen";
  screen.innerHTML = s.render({ theme, lang, state });
  device.appendChild(screen);
  for (const hs of s.hotspots?.({ theme, lang, state }) ?? []) {
    const b = document.createElement("button");
    b.className = "hotspot";
    b.style.left = `${hs.x}px`; b.style.top = `${hs.y}px`;
    b.style.width = `${hs.w}px`; b.style.height = `${hs.h}px`;
    b.dataset.label = `${hs.label} → ${hs.to}`;
    b.setAttribute("aria-label", `${hs.label} (go to ${hs.to})`);
    b.addEventListener("click", () => { currentId = hs.to; render(); });
    device.appendChild(b);
  }
  wrap.appendChild(device);

  const cap = document.createElement("div");
  cap.className = "device-cap";
  cap.textContent = c.device;
  left.append(wrap, cap);
  return left;
}

function renderRight(s: Screen | undefined, state: string | undefined, c: (typeof CHROME)["en"] | (typeof CHROME)["zh"]): HTMLElement {
  const right = document.createElement("section");
  right.className = "plane plane-right";
  const head = `
    <header class="r-head">
      <h1>${esc(c.title)}</h1>
      <p class="sub">${esc(c.sub)}</p>
      ${s?.proposal ? `<p class="proposal">PROPOSAL · not implemented in the firmware</p>` : ""}
      ${s ? `<div class="eyebrow">${lang === "zh" ? "界面" : "Screen"}</div><h2 class="screen-name">${esc(titleOf(s))}</h2>` : ""}
      ${s ? `<p class="meta"><span>${esc(s.id)}</span><span>${esc(groupOf(s.group))}</span>${state ? `<span>${esc(state)}</span>` : ""}<span>${theme}</span><span>${lang}</span></p>` : ""}
      <div class="ctl-row">${controls(c, s?.states ?? [], state)}</div>
      ${picker(c)}
    </header>`;

  let body = "";
  if (s) {
    const sec = SPEC.get(s.id);
    const hotspots = s.hotspots?.({ theme, lang, state }) ?? [];
    body = `
      <section class="block">
        <h2>${c.annotation}</h2>
        ${sec ? `<p class="spec-title">${esc(sec.title)}</p>${renderSpecBody(sec.body)}` : `<p class="muted">${c.noSpec}</p>`}
      </section>
      <section class="block">
        <h2>${c.hotspots}</h2>
        ${hotspots.length
          ? `<table class="hs"><thead><tr><th>x</th><th>y</th><th>w</th><th>h</th><th>${lang === "zh" ? "动作" : "action"}</th></tr></thead><tbody>${hotspots
              .map((h) => `<tr><td>${h.x}</td><td>${h.y}</td><td>${h.w}</td><td>${h.h}</td><td><button data-goto="${h.to}">${esc(h.label)} → <code>${esc(h.to)}</code></button></td></tr>`)
              .join("")}</tbody></table>`
          : `<p class="muted">${c.noHotspots}</p>`}
      </section>
      <section class="block">
        <h2>${c.files}</h2>
        <p><a href="${svgHref(s, state)}" target="_blank" rel="noreferrer">${c.openSvg}</a></p>
        <p><a href="/SPEC.md" target="_blank" rel="noreferrer">${c.openSpec}</a></p>
        <p class="hint">${c.hint}</p>
      </section>`;
  } else {
    body = `<p class="muted">${c.noSpec}</p>`;
  }

  right.innerHTML = head + body;
  /* THE FIRMWARE BOM — the one panel unique to the board team's harness, now here beside the
   * SPEC so there is one review surface (2026-10-31). Rendered with this shell's own type:
   * block + h2 + ul/li, no new components. */
  {
    const bom = document.createElement("section");
    bom.className = "block bom";
    const rows = (rs: Array<[string, string]>) =>
      `<ul>${rs.map(([k, v]) => `<li><code>${esc(k)}</code> — ${esc(v)}</li>`).join("")}</ul>`;
    bom.innerHTML = `
      <h2>${esc(BOM.title)}</h2>
      <p class="muted">${esc(BOM.subtitle)}</p>
      ${BOM.sections.map((s) => `<h3 class="bom-h">${esc(s.h)}</h3>${rows(s.rows)}`).join("")}
      <h3 class="bom-h">BOM.md defects found in review</h3>
      <ul>${BOM.defects.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`;
    right.appendChild(bom);
  }

  right.querySelectorAll<HTMLButtonElement>("button[data-theme]").forEach((b) =>
    b.addEventListener("click", () => { theme = b.dataset.theme as Theme; render(); }));
  right.querySelectorAll<HTMLButtonElement>("button[data-lang]").forEach((b) =>
    b.addEventListener("click", () => { lang = b.dataset.lang as Lang; render(); }));
  right.querySelectorAll<HTMLButtonElement>("button[data-state]").forEach((b) =>
    b.addEventListener("click", () => { if (s) stateSel.set(s.id, b.dataset.state as string); render(); }));
  right.querySelectorAll<HTMLButtonElement>("button[data-goto]").forEach((b) =>
    b.addEventListener("click", () => { currentId = b.dataset.goto as string; render(); }));
  const sel = right.querySelector<HTMLSelectElement>("#screen-pick");
  sel?.addEventListener("change", () => { currentId = sel.value; render(); });
  return right;
}

/** Scale the device (from ui.config.json) so it always fits the left pane. */
function fitDevice(): void {
  const left = document.querySelector<HTMLElement>(".plane-left");
  if (!left) return;
  const devW = UICONFIG.device.w + 20;
  const devH = UICONFIG.device.h + 20;
  document.documentElement.style.setProperty("--dev-w", String(UICONFIG.device.w));
  document.documentElement.style.setProperty("--dev-h", String(UICONFIG.device.h));
  const pad = 44;
  const fit = Math.max(0.3, Math.min(1, (left.clientWidth - pad) / devW, (left.clientHeight - pad) / devH));
  document.documentElement.style.setProperty("--fit", fit.toFixed(4));
}

const SPLIT_KEY = "vlink-ui-left";
function applySplit(pct: number): void {
  const clamped = Math.min(78, Math.max(22, pct));
  document.documentElement.style.setProperty("--left", clamped.toFixed(2) + "%");
  fitDevice();
}
/** 9 px draggable boundary between the planes; integer layout, percentage split, persisted. */
function splitterEl(): HTMLElement {
  const sp = document.createElement("div");
  sp.className = "splitter";
  sp.setAttribute("role", "separator");
  sp.setAttribute("aria-orientation", "vertical");
  sp.setAttribute("aria-label", "Resize the annotation pane");
  sp.tabIndex = 0;
  sp.title = "drag to resize · double-click to reset · arrow keys when focused";
  let dragging = false;
  sp.addEventListener("pointerdown", (e: PointerEvent) => { dragging = true; sp.classList.add("dragging"); sp.setPointerCapture(e.pointerId); });
  sp.addEventListener("pointermove", (e: PointerEvent) => { if (dragging) applySplit((e.clientX / window.innerWidth) * 100); });
  sp.addEventListener("pointerup", (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false; sp.classList.remove("dragging"); sp.releasePointerCapture(e.pointerId);
    const v = document.documentElement.style.getPropertyValue("--left");
    if (v) localStorage.setItem(SPLIT_KEY, v);
  });
  sp.addEventListener("dblclick", () => { document.documentElement.style.removeProperty("--left"); localStorage.removeItem(SPLIT_KEY); fitDevice(); });
  sp.addEventListener("keydown", (e: KeyboardEvent) => {
    const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--left")) || 46;
    if (e.key === "ArrowLeft") { applySplit(cur - 2); localStorage.setItem(SPLIT_KEY, document.documentElement.style.getPropertyValue("--left")); e.preventDefault(); }
    if (e.key === "ArrowRight") { applySplit(cur + 2); localStorage.setItem(SPLIT_KEY, document.documentElement.style.getPropertyValue("--left")); e.preventDefault(); }
  });
  return sp;
}

function render(): void {
  applyShell();
  fitDevice();
  const s = byId(currentId);
  const c = CHROME[lang];
  const states = s?.states ?? [];
  const state = s ? stateSel.get(s.id) ?? states[0] : undefined;
  shell.replaceChildren(renderLeft(s, state, c), splitterEl(), renderRight(s, state, c));
}

const qState = q.get("state");
if (qState) stateSel.set(currentId, qState);

{
  const saved = localStorage.getItem(SPLIT_KEY);
  if (saved) document.documentElement.style.setProperty("--left", saved);
}
render();
window.addEventListener("resize", () => fitDevice());
