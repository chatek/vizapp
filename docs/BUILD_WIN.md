# Building Windows on the ct18 KVM guest

**Operator rule (2026-11-21, binding):** the `win11` VM **and its KVM/qemu process** must be
**powered off after every build use**. The guest reserves 16 GiB of the host's 28 GiB for as
long as it runs; leaving it up silently starves ct18. Autostart is disabled on the domain so a
host reboot cannot bring it back on its own.

The only sanctioned entry point is the guard script — it starts the VM, runs the build, and
shuts the VM down on **every** exit path (success, failure, Ctrl-C):

```bash
bash scripts/release/win-vm-guard.sh status     # host, vm, state, autostart
bash scripts/release/win-vm-guard.sh run   "cmd /c node -v"
bash scripts/release/win-vm-guard.sh build      # documented chain, then poweroff
bash scripts/release/win-vm-guard.sh stop       # what the trap does
```

`run`/`build` always stop the VM in an `EXIT` trap. `--keep` exists only for an interactive
debugging session and prints a loud warning — **never** use it for a build. Stopping the VM
stops qemu, i.e. the KVM process; nothing survives except the qcow2 disk.

## Access path

| step | mechanism |
|---|---|
| hypervisor | `ssh debian@ct18` (Tailscale); `sudo -n virsh …` |
| guest command | QEMU guest agent `guest-exec` via `scripts/release/win-vm-guest-exec.py` (runs as SYSTEM; no credentials) |
| guest network | Tailscale `daniwin` (100.89.171.126); npm/forgejo/github reachable |
| console | VNC bound to the hypervisor's loopback only (`virsh screenshot` works; `virsh send-key` wakes the display) |

## Guest toolchain (measured 2026-11-21)

| item | value |
|---|---|
| OS | Windows 11 build 26300.9974, host `DANIWIN` |
| node / npm | `C:\Users\chance\build\toolchain\node-v24.15.0-win-x64` → node **v24.15.0**, npm **12.0.2** (prepend to PATH; the system node is 26/11) |
| Python | 3.12.10 at `C:\Users\chance\AppData\Local\Programs\Python\Python312` |
| native deps | node-pty / zeromq win32-x64 prebuilds are **Node-API** (symbol-verified), so `npmRebuild=false` on the QA path is safe and no Visual Studio is needed |
| Windows SDK | present (appx target builds; `--without-appx` is the only sanctioned skip) |
| checkout | `C:\Users\chance\dev\vclaw-desktop`; vendored omp beside it at `C:\Users\chance\dev\vendors` |

## Build chain (`win-vm-guard.sh build`)

1. `git fetch --all && git checkout main` in the guest checkout, with the pinned toolchain on PATH.
2. `npm ci`.
3. `npm run package:win:local-qa` — `package.mjs` mirrors every packaged file to
   `build/win-x64/` (operator visibility) and verifies the installable artefacts.
4. Report the artifact names; the VM is then powered off by the trap.

Provenance: read the embedded stamp out of the packaged app
(`win-unpacked/resources/product/payload/BUILD.json`) and compare it to the intended commit —
a stale stamp survives packaging silently (first attempt embedded the mac-era commit).

## Publishing (after the VM is off)

Windows artefacts are staged and published on the macOS channel with `--merge`; see
[`docs/lanes/2026-11-21-windows-publishing.md`](../../docs/lanes/2026-11-21-windows-publishing.md)
in the VizMaster repo. Uploads are operator-run; the VM does not participate.

## Checklist (copy into the build report)

- [ ] VM started by `win-vm-guard.sh` (not by hand)
- [ ] pinned toolchain on PATH (`node -v` = v24.15.0, `npm -v` = 12.0.2)
- [ ] artifacts in `build/win-x64/` + embedded `BUILD.json` stamp matches HEAD
- [ ] `win-vm-guard.sh status` shows **state: shut off**
- [ ] staging dir handed to the publish chain
