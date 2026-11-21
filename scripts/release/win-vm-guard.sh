#!/usr/bin/env bash
# Windows build host lifecycle for the ct18 `win11` KVM guest.
#
# OPERATOR RULE (2026-11-21): the win11 VM must be POWERED OFF after every build
# use. This script is the only sanctioned way to run a Windows build: it starts
# the VM, runs the command, and shuts the VM down again even when the build
# fails. Autostart is disabled on the domain so a host reboot cannot leave the
# guest holding 16 GiB of RAM.
#
#   bash scripts/release/win-vm-guard.sh status
#   bash scripts/release/win-vm-guard.sh start
#   bash scripts/release/win-vm-guard.sh stop
#   bash scripts/release/win-vm-guard.sh exec "node -v"
#   bash scripts/release/win-vm-guard.sh run  "cmd /c dir C:\\Users"
#   bash scripts/release/win-vm-guard.sh build        # documented build chain, see docs/BUILD_WIN.md
#
# `run` and `build` ALWAYS stop the VM afterwards (EXIT trap). `--keep` exists
# only for an interactive debugging session and prints a loud warning; never use
# it for a build.
set -Eeuo pipefail

HOST="${WINVM_SSH:-debian@ct18}"
NAME="${WINVM_NAME:-win11}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_LOCAL="$HERE/win-vm-guest-exec.py"
HELPER_REMOTE="/tmp/win-vm-guest-exec.py"
TOOLCHAIN='C:\Users\chance\build\toolchain\node-v24.15.0-win-x64'
KEEP=0

log() { printf 'win-vm: %s\n' "$*" >&2; }
die() { log "FATAL: $*"; exit 1; }

remote() { ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "$@"; }
virsh() { remote "sudo -n virsh $*"; }

state() { virsh "domstate $NAME" | tr -d '\r'; }

agent_ready() {
  remote "sudo -n virsh qemu-agent-command $NAME '{\"execute\":\"guest-ping\"}'" >/dev/null 2>&1
}

ensure_helper() {
  scp -q -o BatchMode=yes "$HELPER_LOCAL" "$HOST:$HELPER_REMOTE" ||
    die "cannot copy the guest-exec helper to $HOST"
}

start_vm() {
  [ "$(state)" = "running" ] || {
    log "starting $NAME"
    virsh "start $NAME" >/dev/null
  }
  for _ in $(seq 1 90); do
    if agent_ready; then
      log "$NAME running, guest agent ready"
      return 0
    fi
    sleep 2
  done
  die "guest agent did not answer within 180 s"
}

stop_vm() {
  if [ "$(state)" != "running" ]; then
    log "$NAME already off"
    return 0
  fi
  log "shutting $NAME down (operator rule: the VM is off after every build)"
  virsh "shutdown $NAME" >/dev/null || true
  for _ in $(seq 1 90); do
    if [ "$(state)" = "shut off" ]; then
      log "$NAME off"
      return 0
    fi
    sleep 2
  done
  log "WARNING: $NAME did not shut down within 180 s — inspect it; do NOT leave it running"
  return 1
}

guest_exec() {
  remote "python3 $HELPER_REMOTE --name $NAME $(printf '%q' "$1")"
}

cleanup() {
  local rc=$?
  if [ "$KEEP" = "1" ]; then
    log "WARNING: --keep used; $NAME LEFT RUNNING (debugging only, never for builds)"
    return $rc
  fi
  stop_vm || true
  return $rc
}

guarded() {
  ensure_helper
  start_vm
  trap cleanup EXIT
  "$@"
}

build_chain() {
  # Measured chain (docs/BUILD_WIN.md). Everything runs through the guest agent.
  log "step 1/4: sync checkout + pinned toolchain"
  guest_exec "cd /d C:\\Users\\chance\\dev\\vclaw-desktop && set PATH=$TOOLCHAIN;%PATH% && git fetch --all && git checkout main && git rev-parse --short HEAD" || die "checkout sync failed"
  log "step 2/4: npm ci with the pinned toolchain"
  guest_exec "cd /d C:\\Users\\chance\\dev\\vclaw-desktop && set PATH=$TOOLCHAIN;%PATH% && npm ci" || die "npm ci failed"
  log "step 3/4: QA package (nsis + zip + appx when the SDK is present)"
  guest_exec "cd /d C:\\Users\\chance\\dev\\vclaw-desktop && set PATH=$TOOLCHAIN;%PATH% && npm run package:win:local-qa" || die "packaging failed"
  log "step 4/4: report artifacts"
  guest_exec "dir /b C:\\Users\\chance\\dev\\vclaw-desktop\\build\\win-x64" || true
}

main() {
  local command="${1:-status}"
  case "$command" in
    status)
      printf 'host: %s\nvm: %s\nstate: %s\nautostart: %s\n' \
        "$HOST" "$NAME" "$(state)" "$(virsh "dominfo $NAME" | awk -F': *' '/Autostart:/{print $2}')"
      ;;
    start) ensure_helper; start_vm ;;
    stop) stop_vm ;;
    exec) ensure_helper; guest_exec "${2:?usage: exec \"<cmd>\"}" ;;
    run)
      shift
      [ $# -ge 1 ] || die 'usage: run "<cmd>" [--keep]'
      [ "${*: -1}" = "--keep" ] && { KEEP=1; set -- "${@:1:$#-1}"; }
      guarded guest_exec "$1"
      ;;
    build)
      shift || true
      [ "${1:-}" = "--keep" ] && { KEEP=1; shift; }
      guarded build_chain
      ;;
    *) die "unknown command: $command (status|start|stop|exec|run|build)" ;;
  esac
}

main "$@"
