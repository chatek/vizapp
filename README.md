# VClaw Desktop

VClaw is a desktop workspace for [Pi](https://pi.dev/), [OMP](https://github.com/can1357/oh-my-pi), and [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent). It gives all three coding agents the same friendly interface on macOS, Linux, and Windows while leaving each harness in charge of its own models, logins, and saved sessions.

<img width="2234" height="1332" alt="VClaw desktop workspace" src="https://github.com/user-attachments/assets/864ff0e1-71cc-49da-955f-f226710ef890" />

## What the `vizmaster` branch adds

This branch is the long-running **VizMaster member vertical** — a self-contained world that carries the product and the build/publish flow listed below. The generic product lives on `main`, which stays the single long-lived branch for Pi / OMP / Prime Agent users and the only branch the parent repo records; `vizmaster` is related to it only through the pinned-sha snapshot relationship described in [docs/MEMBER_BUILD.md](docs/MEMBER_BUILD.md). Lane ownership is canonical in [docs/BOUNDARIES.md](docs/BOUNDARIES.md).

Relative to `main`, this branch adds — all of it exists only here, not on `main`:

**Product** (profile: [`product/vizmaster.json`](product/vizmaster.json); [docs/PRODUCT_PROFILES.md](docs/PRODUCT_PROFILES.md)):

- A marketplace home, an OMP-only harness menu, and the Catppuccin Mocha theme with its theming infrastructure (`a616c8a`).
- A `browserHome` migration so the stored browser home page beats the old default, not just the code default (`c49cc37`).
- Member posture tests pinning the above (`tests/frontend/vizmaster-posture.test.tsx`).

**Build & publish** (full flow: [docs/BUILD.md](docs/BUILD.md) and [docs/RELEASE_FLOW.md](docs/RELEASE_FLOW.md)):

- The validated OMP binary bundled into the app, with after-pack refusal of a drifted binary (`7c4c43c`) and the electron-builder numeric-arch fix (`cabbc52`).
- The remote-first build flow with a single entry point, `scripts/release/build-remote.sh` (`1b2c62b`), producing an unsigned `.dmg` and `.app` `.zip` per architecture published as one draft (`16871f5`).
- The member build path: member payload + profile, a pre-packaging assert, and explicit clean-state provenance (`babc937`, with the measured full-sha gate `346127d`/`736b96f`, source-remote provenance `4b0f901`, and the profile-must-match-HEAD refusal `f2b9a0f`).
- Ruled identity: `VClaw` / `com.vclaw.desktop` with no hand-typed release id (`5ffc361`).
- The Forgejo publish driver `scripts/release/release-forgejo.sh`, including `--skip-build` for publishing a proven build (`ee212d9` and successors).

## Three harnesses, one workspace

Use the switcher in the top-left corner to move between Pi Work, OMP Work, and Prime Work. VClaw detects the harnesses installed on your computer and shows the ones that are ready. You can refresh detection or set a custom executable path in Settings.

Each harness keeps its own projects, sessions, model list, provider visibility, and running work. Switching harnesses changes the workspace without stopping work already running in another one.

You only need one harness to get started:

- [Pi](https://pi.dev/) is the base coding-agent harness in the Pi family.
- [OMP](https://github.com/can1357/oh-my-pi) adds its own plugins, commands, and approval controls.
- [Prime Agent](https://github.com/PrimeIntellect-ai/prime-agent) adds Prime's provider integrations and native heartbeats.

## What you can do

### Work with agents

- Stream conversations with Markdown, reasoning summaries, tool activity, retries, and context compaction.
- Choose a model, reasoning level, and Fast mode when the selected model supports it.
- Queue a follow-up or steer an agent while it is working.
- Paste or drop PNG, JPEG, GIF, and WebP images into a prompt when the model supports vision.
- Resume, rename, search, and archive persistent sessions.
- See running, finished, failed, and waiting-for-input work in one Activity view, then clear items you have handled.

### Keep projects organized

- Add local folders and reopen sessions grouped by project.
- Search projects, chats, and branches from the sidebar.
- Switch between linked Git worktrees from the composer.
- Create a branch worktree and open it as a new VClaw workspace.
- Mention another top-level session with `@session`, copy its UUID, or let agents create and message model-selected sessions for parallel work.

### Use the built-in coding workspace

- Review Git status and diffs, stage or unstage files, restore changes with confirmation, and commit without leaving the app.
- Browse project files and reveal them in your system file manager.
- Open multiple terminal tabs for a session. Highlight terminal output to attach it to the next prompt.
- Open the right-hand Summary, Changes, Browser, or Files panel whenever you need it.

### Browse with shared context

- Use an isolated in-app browser with an address bar, navigation history, downloads, and an external-browser handoff.
- Point at page elements and add notes. VClaw attaches those annotations to your next message.
- Enable browser control so an agent can open and operate its own tabs. You can watch its cursor and work in the same tabs when you want to take over.

### Automate repeat work

- Create one-time or recurring schedules for the active harness.
- Pick the project or existing session, model, reasoning level, timezone, and Fast mode.
- Run a schedule immediately, pause or resume it, and inspect the result and run history.
- Manage Prime heartbeats alongside VClaw schedules when Prime Agent exposes them.
- On macOS, opt in under **Settings → General** to keep scheduled work running from the menu bar after closing the window, and optionally launch VClaw in the background at login. The packaged app also accepts `--background` to start without opening its window.

### Add capabilities

The Capabilities page brings together packages, plugins, extensions, skills, prompts, and MCP servers. VClaw can manage local stdio MCP definitions for OMP and adapter-enabled Pi. Network MCP and authentication stay under the selected harness's direct control; those entries are visible but read-only in VClaw, with bounded definition-only removal available for cleanup. MCP discovery has an independent 2,500-definition-per-settings-file limit and reports an explicit warning when that limit is exceeded, so unrelated capabilities cannot hide supported MCP rows.

VClaw also ships optional capabilities for:

- Let an agent ask you a small set of questions in a native dialog.
- Give agents controlled access to the in-app browser.
- Use TryCUA computer control when the separate CUA Driver is installed.

Ask User and computer control are off by default. You can enable, disable, or remove capabilities from the app.

### Talk instead of type

- Dictate prompts with OpenAI, Groq, Deepgram, or a local `whisper.cpp` installation.
- Open the realtime voice companion to search, discuss work, and start a task in the currently selected harness.
- Choose an animated desktop pet that reacts while an agent works and carries the realtime voice controls. VClaw includes the Orb and VClaw pets and can discover compatible Codex pets.

### Make it comfortable

- Choose a light, dark, or system theme and adjust the interface text size.
- Reduce motion, resize the workspace panels, or let them become overlays in a narrow window.
- Use keyboard navigation and the command palette for common actions.

## Get started

1. Install Pi, OMP, Prime Agent, or any combination of the three.
2. Sign in or configure a model provider through each harness's own CLI.
3. Download VClaw from the [release page](https://github.com/chatek/vclaw-desktop/releases), or run it from source.
4. Add a project folder and start a session.

> ★ 2026-11-11 — The Forgejo instance moved from a subpath to the root: `…/forgejo/<org>/<repo>` is now `…/<org>/<repo>` (e.g. `https://forgejo.internal.example/chatek/vclaw-desktop`). Browser URLs redirect, but **git does not follow the redirect** — update any `origin`/push remote with `git remote set-url` to the new scheme.

VClaw checks common install locations automatically. If a harness is missing, open **Settings → Harness** to refresh detection or choose its executable.

A release provides, per architecture, an unsigned `.dmg` installer and the `.app` `.zip`, both
built only on the project's macOS build host and named `-unsigned` until a Developer ID exists —
Gatekeeper needs an override on first launch. `docs/RELEASE_BUILD_HOST.md` is the alternative
`package.mjs` packaging path on that same host, not the source of the published dmg. Linux and
Windows packaging recipes live in [FORK.md](FORK.md) but are not published by the release flow
([docs/RELEASE_FLOW.md](docs/RELEASE_FLOW.md)). Who may ask what of whom, and what a release is
for the receiving lane, is [docs/BOUNDARIES.md](docs/BOUNDARIES.md).

Harness provider credentials stay with the harness. Optional voice keys are encrypted with the operating system's secure storage, and local `whisper.cpp` dictation needs no API key.

## Star History

<a href="https://www.star-history.com/?repos=am-will%2Fgooey-pi&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=am-will/gooey-pi&type=date&theme=dark&legend=top-left&sealed_token=Gyqf4f7-dQQMVcOLDzasYvuEMUjpCSlTbbitvVvzi1dyMJRIttzqLWN-D1cijN9r-TqFj2A-ibdETPCeMHGsKGYRJrAzd9VflC7tpdapc0tRiSBi6qrSJQ" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=am-will/gooey-pi&type=date&legend=top-left&sealed_token=Gyqf4f7-dQQMVcOLDzasYvuEMUjpCSlTbbitvVvzi1dyMJRIttzqLWN-D1cijN9r-TqFj2A-ibdETPCeMHGsKGYRJrAzd9VflC7tpdapc0tRiSBi6qrSJQ" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=am-will/gooey-pi&type=date&legend=top-left&sealed_token=Gyqf4f7-dQQMVcOLDzasYvuEMUjpCSlTbbitvVvzi1dyMJRIttzqLWN-D1cijN9r-TqFj2A-ibdETPCeMHGsKGYRJrAzd9VflC7tpdapc0tRiSBi6qrSJQ" />
  </picture>
</a>

## The `vizmaster` branch

`vizmaster` is a long-running **member-vertical branch** of this repo, kept as its own world. It carries the same generic base as `main` plus member-facing work that `main` deliberately does not carry, because `main` is the generic product:

- **Product features for the member experience** — a marketplace home, an OMP-only harness menu, the Catppuccin Mocha theme and its theming infrastructure, a `browserHome` migration, and member posture tests (`tests/frontend/vizmaster-posture.test.tsx`).
- **Member build and publish flow** — a bundled OMP binary with an after-pack refusal of a drifted one, per-architecture unsigned `.dmg` + `.app` `.zip` artifacts from `scripts/release/build-remote.sh`, the member build path (`--member`: payload + profile, pre-packaging assert, clean-state provenance), ruled `VClaw` / `com.vclaw.desktop` identity, and the Forgejo publish driver `scripts/release/release-forgejo.sh`.

`main`'s build does not bundle OMP and does not produce member artifacts. The build-flow docs ([docs/BUILD.md](docs/BUILD.md), [docs/BUILD_REMOTE.md](docs/BUILD_REMOTE.md)) exist on both branches, but only the `vizmaster` versions describe the member flow. The branch relationship is described in [docs/MEMBER_BUILD.md](docs/MEMBER_BUILD.md), and lane ownership in `docs/BOUNDARIES.md` on the `vizmaster` branch. The parent repo records only `main` commits, so `main` is the sole integration point.

## Run from source

You will need Node.js 24.15.0 or newer and npm 12.0.2 or newer. The repository pins Node.js 24.15.0 in `.nvmrc`; with [nvm](https://github.com/nvm-sh/nvm), you can select it with:

```bash
nvm install && nvm use
npm run toolchain:bootstrap
```

The bootstrap command verifies the exact size and SHA-512 of the checked-in npm archive, then installs it offline with install-time lifecycle scripts disabled into the invoked npm's configured global prefix, verifies the installed CLI and both tool versions against `package.json` and `.nvmrc`, and makes its shim available to subsequent GitHub Actions steps before dependencies are installed.

```bash
npm install
npm run dev
```

If `node_modules/electron/dist` is missing after installation, fetch Electron's platform binary before starting the app:

```bash
node node_modules/electron/install.js
npm run dev
```

`npm install --ignore-scripts` skips both Electron's platform download and the native dependency rebuild, so it is not enough on its own for running VClaw from source. If you used it, the recovery sequence below runs those two steps explicitly.

`node-pty` is a native dependency. If Electron cannot rebuild it with your default Python environment, point npm at a Python installation with the required build tools:

```bash
export npm_config_python=/path/to/python3
npm install --ignore-scripts
node node_modules/electron/install.js
npx electron-builder install-app-deps
```

## Keyboard shortcuts

Use `⌘` on macOS and `Ctrl` on Linux or Windows.

| Shortcut | Action |
|---|---|
| `⌘/Ctrl+N` | New session |
| `⌘/Ctrl+K` | Command palette |
| `⌘/Ctrl+B` | Toggle the project sidebar |
| `⌘/Ctrl+Shift+B` | Open the browser |
| `⌘/Ctrl+J` | Toggle the terminal |
| `⌘/Ctrl+,` | Open Settings |
| `Enter` | Queue a message while the agent is working |
| `⌘/Ctrl+Enter` | Steer the current turn while the agent is working |
| `Shift+Enter` | Add a new line |
| `Esc` | Close the active menu, dialog, or overlay |

The Queue and Steer shortcuts can be swapped in **Settings → Harness → Message shortcuts**.

## Local data and safety

VClaw is built around local projects and local harness sessions. It does not rewrite session history or take ownership of Pi, OMP, or Prime Agent credentials.

Remote pages open in a separate browser profile with Node access disabled. Project paths and desktop actions are checked in the main process, and third-party capabilities still run with your operating-system permissions. Review packages, commands, MCP servers, and projects before allowing them to act.

For suspected vulnerabilities, follow the [security policy](.github/SECURITY.md) and do not post sensitive details publicly. See [docs/security.md](docs/security.md) for the full technical security model.

## Development checks

Run these before submitting a code change:

```bash
npm run typecheck
npm run check
npm test
npm run test:e2e
npm run build
```

See the [validation guide](docs/validation.md) for the source-of-truth checks and reproducible commands.

To build a package, start at [docs/BUILD.md](docs/BUILD.md). macOS app builds run on the
remote build host, and a local build is a documented fallback whose output is **not evidence**.

The `npm run package:<platform>:local-qa` commands remain the unsigned local-QA path for
smoke-testing an installer on its native platform; they are not release artefacts.

## License

VClaw is released under the permissive [MIT License](LICENSE). See the [license text](LICENSE) for details.
