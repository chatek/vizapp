#!/usr/bin/env bash
# LOCAL FALLBACK build of the VClaw desktop app (-dir, unsigned, arm64/x64).
#
# The sanctioned builder is the remote host build-host.example; use
# scripts/release/build-remote.sh and docs/BUILD_REMOTE.md for every real release.
# This script exists only for when that host is unavailable. Its output is NOT
# evidence: it proves the tree packages and the bundled omp verifies, nothing more.
#
#   bash scripts/release/build-local.sh --check              # read-only preflight
#   VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
#   VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64 --x64
#
# Without VCLAW_ALLOW_LOCAL_BUILD=1 (and without --check) the script refuses to run.
# The build uses the ACTIVE node toolchain; it never calls nvm. It aborts unless
# that node's major is 24 (docs/BUILD_LOCAL.md, trap 1).
#
# Env overrides (all optional):
#   ELECTRON_MIRROR           electron download mirror (default npmmirror)
#   ELECTRON_MIRROR_TIMEOUT   seconds for the mirror probe (default 15)
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENDOR_RELEASE="$(cd "$REPO_ROOT/.." && pwd)/vendors/oh-my-pi/releases/v18.16.0"
NVMRC="$REPO_ROOT/.nvmrc"
OUTPUT_DIR="$REPO_ROOT/release"
MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
MIRROR_TIMEOUT="${ELECTRON_MIRROR_TIMEOUT:-15}"
MIN_FREE_GB=20

usage() {
  sed -n '2,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 1
}

die() { printf 'build-local: FATAL: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*" >&2; }
warn() { printf 'build-local: WARNING: %s\n' "$*" >&2; }

PREFLIGHT_FAILS=0
verdict_ok() { printf '  ok    %s — %s\n' "$1" "$2"; }
verdict_fail() {
  PREFLIGHT_FAILS=$((PREFLIGHT_FAILS + 1))
  printf '  FAIL  %s — %s\n' "$1" "$2"
}

host_arch() {
  case "$(uname -m)" in
    arm64) echo arm64 ;;
    x86_64 | i386) echo x64 ;;
    *) echo "unknown($(uname -m))" ;;
  esac
}

# The Mach-O slice name lipo reports for each electron-builder arch.
slice_for() {
  case "$1" in
    x64) echo x86_64 ;;
    *) echo "$1" ;;
  esac
}

sums_entry() { # sums_entry <arch> -> expected sha256 or empty
  local arch="$1" sums="$VENDOR_RELEASE/SHA256SUMS.txt" line
  [ -f "$sums" ] || return 0
  line="$(awk -v want="omp-darwin-$arch" '$2 == want { print $1; exit }' "$sums")"
  printf '%s' "$line"
}

file_sha256() { shasum -a 256 "$1" | awk '{ print $1 }'; }

CHECK=0
ARCHES=()
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    --arm64) ARCHES+=("arm64") ;;
    --x64) ARCHES+=("x64") ;;
    --help | -h) usage ;;
    *) die "unknown argument: $arg (accepted: --check --arm64 --x64)" ;;
  esac
done
if [ "${#ARCHES[@]}" -eq 0 ]; then
  ARCHES+=("$(host_arch)")
fi

# --- preflight (read-only) ---------------------------------------------------
preflight() {
  PREFLIGHT_FAILS=0
  local want node_v node_major arch bin expected actual slices free_kb code xcode

  printf 'preflight: local fallback on %s (%s)\n' "$(uname -m)" "$REPO_ROOT"

  # 1. node major 24 — the pinned toolchain, honoured only when already active
  want="$(tr -d '[:space:]' <"$NVMRC" 2>/dev/null || true)"
  if command -v node >/dev/null 2>&1; then
    node_v="$(node -v)"
    node_major="${node_v#v}"
    node_major="${node_major%%.*}"
    if [ "$node_v" = "v$want" ]; then
      verdict_ok node "$node_v (exactly .nvmrc)"
    elif [ "$node_major" = "24" ]; then
      verdict_ok node "$node_v (major 24; .nvmrc pins v$want — active toolchain kept, not switched)"
    else
      verdict_fail node "$node_v — major must be 24 (.nvmrc: v$want); activate one, e.g. nvm install 24 && nvm use 24"
    fi
  else
    verdict_fail node "node is not on PATH (need major 24, .nvmrc: v$want)"
  fi

  # 2. dependencies installed, and the electron-builder entrypoint with them
  if [ -x "$REPO_ROOT/node_modules/.bin/electron-builder" ]; then
    verdict_ok node_modules "present, node_modules/.bin/electron-builder executable"
  elif [ -d "$REPO_ROOT/node_modules" ]; then
    verdict_fail node_modules "directory exists but node_modules/.bin/electron-builder is missing/inert — run: npm ci"
  else
    verdict_fail node_modules "missing — run: npm ci"
  fi

  # 3. bundled omp: present, digest equal to SHA256SUMS.txt, slice matches the arch
  for arch in "${ARCHES[@]}"; do
    bin="$VENDOR_RELEASE/omp-darwin-$arch"
    expected="$(sums_entry "$arch")"
    if [ -z "$expected" ]; then
      verdict_fail "omp $arch digest" "no omp-darwin-$arch entry in $VENDOR_RELEASE/SHA256SUMS.txt"
    fi
    if [ ! -f "$bin" ]; then
      verdict_fail "omp $arch binary" "missing $bin — a fresh clone has no release binaries (docs/BUILD_LOCAL.md)"
      verdict_fail "omp $arch digest" "cannot hash a missing binary"
      verdict_fail "omp $arch slice" "cannot inspect a missing binary"
      continue
    fi
    verdict_ok "omp $arch binary" "$bin ($(stat -f '%z' "$bin") B)"
    actual="$(file_sha256 "$bin")"
    if [ -n "$expected" ] && [ "$actual" = "$expected" ]; then
      verdict_ok "omp $arch digest" "$actual matches SHA256SUMS.txt"
    elif [ -n "$expected" ]; then
      verdict_fail "omp $arch digest" "expected ${expected:0:12}…, got ${actual:0:12}… — delete and re-fetch the binary"
    fi
    if command -v lipo >/dev/null 2>&1; then
      slices="$(lipo -archs "$bin" 2>/dev/null || true)"
      case " $slices " in
        *" $(slice_for "$arch") "*) verdict_ok "omp $arch slice" "lipo: ${slices:-?}" ;;
        *) verdict_fail "omp $arch slice" "lipo reports '${slices:-?}', need $(slice_for "$arch")" ;;
      esac
    fi
  done

  # 4. mirror reachability — github.com is not routable from this workstation
  if ! command -v curl >/dev/null 2>&1; then
    verdict_fail "electron mirror" "curl not found, cannot probe $MIRROR"
  else
    code="$(curl -sSL -I -o /dev/null --max-time "$MIRROR_TIMEOUT" -w '%{http_code}' "$MIRROR" 2>/dev/null || true)"
    case "$code" in
      2?? | 3??) verdict_ok "electron mirror" "$MIRROR -> HTTP $code" ;;
      '') verdict_fail "electron mirror" "$MIRROR unreachable within ${MIRROR_TIMEOUT}s" ;;
      *) verdict_fail "electron mirror" "$MIRROR -> HTTP $code" ;;
    esac
  fi

  # 5. compiler toolchain (native modules: node-pty, zeromq, koffi)
  if xcode="$(xcode-select -p 2>/dev/null)"; then
    verdict_ok "xcode-select" "$xcode"
  else
    verdict_fail "xcode-select" "no developer directory selected (xcode-select --install)"
  fi
  if command -v lipo >/dev/null 2>&1; then
    verdict_ok lipo "$(command -v lipo)"
  else
    verdict_fail lipo "lipo not found — install the Xcode Command Line Tools"
  fi

  # 6. free disk on the volume that will hold release/
  free_kb="$(df -Pk "$REPO_ROOT" | awk 'NR == 2 { print $4 }')"
  if [ -n "$free_kb" ] && [ "$free_kb" -gt $((MIN_FREE_GB * 1024 * 1024)) ]; then
    verdict_ok disk "$(awk -v kb="$free_kb" 'BEGIN { printf "%.1f", kb / 1048576 }') GiB free (need > ${MIN_FREE_GB})"
  else
    verdict_fail disk "$(awk -v kb="${free_kb:-0}" 'BEGIN { printf "%.1f", kb / 1048576 }') GiB free, need > ${MIN_FREE_GB}"
  fi

  # 7. arch support — native modules are built for the host arch only
  for arch in "${ARCHES[@]}"; do
    if [ "$arch" = "$(host_arch)" ]; then
      verdict_ok "arch $arch" "matches host $(uname -m)"
    else
      verdict_fail "arch $arch" "host is $(host_arch) — cross-arch local builds are unsupported (node-pty/zeromq/koffi are host-arch); use the remote flow"
    fi
  done

  echo
  if [ "$PREFLIGHT_FAILS" -eq 0 ]; then
    printf 'preflight: PASS (%s)\n' "${ARCHES[*]}"
    return 0
  fi
  printf 'preflight: FAIL — %s item(s)\n' "$PREFLIGHT_FAILS"
  return 1
}

# --- build -------------------------------------------------------------------
# electron-builder appends the arch to the output dir only for non-x64 targets:
# arm64 -> release/mac-arm64, x64 -> release/mac.
app_bundle() { # app_bundle <arch>
  local arch="$1"
  if [ -d "$OUTPUT_DIR/mac-$arch" ]; then
    printf '%s' "$OUTPUT_DIR/mac-$arch/VClaw.app"
  elif [ "$arch" = "x64" ] && [ -d "$OUTPUT_DIR/mac" ]; then
    printf '%s' "$OUTPUT_DIR/mac/VClaw.app"
  else
    printf '%s' "$OUTPUT_DIR/mac-$arch/VClaw.app"
  fi
}

verify_artefact() { # verify_artefact <arch>
  local arch="$1"
  local app omp exe expected actual app_archs omp_archs

  app="$(app_bundle "$arch")"
  omp="$app/Contents/Resources/harness/bin/omp"
  exe="$app/Contents/MacOS/VClaw"

  [ -d "$app" ] || die "expected app bundle not found: $app"
  [ -f "$omp" ] || die "packaged omp missing: $omp — after-pack should have failed the build"
  # The vendored binary is mode 0644; only after-pack's chmod makes it 0755. Digest and
  # slice both survive a lost exec bit, so assert it here rather than trust the packaging.
  [ -x "$omp" ] ||
    die "packaged omp is not executable (mode $(stat -f '%Lp' "$omp")) — after-pack must chmod it 0755"
  expected="$(sums_entry "$arch")"
  [ -n "$expected" ] || die "no SHA256SUMS entry for omp-darwin-$arch"
  actual="$(file_sha256 "$omp")"
  [ "$actual" = "$expected" ] ||
    die "packaged omp sha256 ${actual:0:12}… != ${expected:0:12}… for $arch"
  app_archs="$(lipo -archs "$exe" 2>/dev/null || true)"
  omp_archs="$(lipo -archs "$omp" 2>/dev/null || true)"
  case " $app_archs " in
    *" $(slice_for "$arch") "*) ;;
    *) die "app binary slices '${app_archs:-?}' do not include $(slice_for "$arch")" ;;
  esac
  case " $omp_archs " in
    *" $(slice_for "$arch") "*) ;;
    *) die "packaged omp slices '${omp_archs:-?}' do not include $(slice_for "$arch")" ;;
  esac

  printf '  app      %s\n' "$app"
  printf '  omp      %s B, mode %s, slices %s\n' \
    "$(stat -f '%z' "$omp")" "$(stat -f '%Lp' "$omp")" "$omp_archs"
  printf '  verified sha256 == SHA256SUMS.txt (%s)\n' "${actual:0:12}…"
  printf 'ARTEFACT(not-evidence): %s %s %s\n' "$app" "$actual" "$app_archs"
}

build() {
  local arch rc=0

  trap 'rc=$?; printf "build-local: FAILED at line %s (rc=%s): %s\n" "$LINENO" "$rc" "$BASH_COMMAND" >&2; exit $rc' ERR

  step "preflight"
  preflight || die "preflight failed; nothing was built"

  if [ -n "$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null)" ]; then
    warn "$REPO_ROOT has uncommitted changes; this build is NOT a reproducible artefact"
  fi
  warn "local artefacts are NOT evidence — the remote host is the sanctioned builder (docs/BUILD_REMOTE.md)"

  export ELECTRON_MIRROR="$MIRROR"

  step "npm run build"
  (cd "$REPO_ROOT" && npm run build)

  for arch in "${ARCHES[@]}"; do
    step "electron-builder --mac --$arch --dir (ELECTRON_MIRROR=$ELECTRON_MIRROR)"
    rm -rf "$OUTPUT_DIR/mac-$arch"
    if [ "$arch" = "x64" ]; then rm -rf "$OUTPUT_DIR/mac"; fi
    (cd "$REPO_ROOT" && ./node_modules/.bin/electron-builder --mac --"$arch" --dir --publish never)

    step "verify the packaged $arch binary"
    verify_artefact "$arch"
    warn "unsigned/adhoc: this .app runs locally only; it is not a release artefact"
  done

  step "done"
  printf '    output under %s (throwaway; delete when finished)\n' "$OUTPUT_DIR"
}

# --- entry -------------------------------------------------------------------
if [ "$CHECK" -eq 1 ]; then
  if preflight; then exit 0; else exit 1; fi
fi

if [ "${VCLAW_ALLOW_LOCAL_BUILD:-}" != "1" ]; then
  cat >&2 <<'REFUSED'
build-local: REFUSED — the sanctioned builder is the remote host
             build-host.example (docs/BUILD_REMOTE.md).

             Remote build:  bash scripts/release/build-remote.sh --arm64 --x64
             Preflight only: bash scripts/release/build-local.sh --check

             A local build is a documented fallback for when that host is
             unavailable, and its artefacts are not evidence. To proceed anyway:

             VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
REFUSED
  exit 2
fi

build
