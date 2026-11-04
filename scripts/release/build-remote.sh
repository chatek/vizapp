#!/usr/bin/env bash
# Build the VClaw desktop app on the remote macOS build host — the PRIMARY flow.
#
#   bash scripts/release/build-remote.sh --check                # read-only preflight
#   bash scripts/release/build-remote.sh --arm64
#   bash scripts/release/build-remote.sh --x64
#   bash scripts/release/build-remote.sh --arm64 --x64
#
# With no arch flag a build defaults to the host's arch. Nothing is packaged on the
# workstation: this streams a git bundle of the current commit plus the OMP release
# set to the host, builds there, and pulls the .app back (docs/BUILD_REMOTE.md).
#
# The remote host is the only sanctioned builder. If it is unreachable this script
# FAILS — it never falls back to a local build. The local path is a separate,
# explicitly opt-in script (scripts/release/build-local.sh, docs/BUILD_LOCAL.md) and
# its output is not evidence. There is no automatic switch between them.
#
# Env overrides (all optional):
#   BUILD_HOST        ssh destination (default BUILD_USER_REDACTED)
#   REMOTE_ROOT       build root, relative to the remote $HOME (default build/vclaw)
#   LOCAL_OUT         local collect directory (default <repo>/release-remote)
#   ELECTRON_MIRROR   mirror electron-builder downloads from
#   VCLAW_PROFILE      product profile staged as resources/product.json
#                      (default product/profile.json — the generic vclaw identity;
#                       product/vizmaster.json for a member build)
set -Eeuo pipefail

HOST="${BUILD_HOST:-BUILD_USER_REDACTED}"
REMOTE_ROOT="${REMOTE_ROOT:-build/vclaw}"
MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
MIRROR_TIMEOUT="${ELECTRON_MIRROR_TIMEOUT:-15}"
PROFILE="${VCLAW_PROFILE:-product/profile.json}"
MIN_FREE_GB=20

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENDOR_RELEASE="$(cd "$REPO_ROOT/.." && pwd)/vendors/oh-my-pi/releases/v18.16.0"
NODE_VERSION="$(tr -d '[:space:]' <"$REPO_ROOT/.nvmrc")"
LOCAL_OUT="${LOCAL_OUT:-$REPO_ROOT/release-remote}"

REMOTE_REPO="$REMOTE_ROOT/vclaw-desktop"
REMOTE_BUNDLE="$REMOTE_ROOT/src.bundle"
REMOTE_VENDORS="$REMOTE_ROOT/vendors/oh-my-pi/releases/v18.16.0"
NODE_DIR="\$HOME/$REMOTE_ROOT/../toolchain/node-v${NODE_VERSION}-darwin-arm64/bin"

# tailscale ssh exits 0 even when the remote command fails (measured: `tailscale ssh
# host -- 'exit 5'` → local rc 0). Every remote invocation therefore carries an
# in-band status marker and the status is read from that, never from the ssh exit code.
RC_MARK='__VCLAW_RC__='

usage() {
  awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "${BASH_SOURCE[0]}"
  exit "${1:-0}"
}

die() { printf 'build-remote: FATAL: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*" >&2; }

EXIT_RC=0
trap 'EXIT_RC=$?; printf "build-remote: FAILED at line %s (rc=%s): %s\n" "$LINENO" "$EXIT_RC" "$BASH_COMMAND" >&2; exit "$EXIT_RC"' ERR

# ssh_run <bash body> — runs the body on the host, echoes its combined output,
# returns the REMOTE exit status.
ssh_run() {
  local out rc
  out="$(
    {
      printf 'set -uo pipefail\n(\nset -euo pipefail\n'
      printf '%s\n' "$1"
      printf '\n)\nprintf %s"%%s\\n" "$?"\n' "'$RC_MARK'"
    } | tailscale ssh "$HOST" -- 'bash -s' 2>&1
  )" || true
  rc=255
  if [ "${out#*"$RC_MARK"}" != "$out" ]; then
    rc="${out##*"$RC_MARK"}"
    rc="${rc//[[:space:]]/}"
    out="${out%"$RC_MARK"*}"
    out="${out%$'\n'}"
  fi
  [ -z "$out" ] || printf '%s\n' "$out"
  return "$rc"
}

# ssh_stream <body-file> <local-log> — same contract as ssh_run but streams the
# output live through tee and sets STREAM_RC from the marker in the log.
STREAM_RC=255
ssh_stream() {
  local body="$1" log="$2"
  {
    printf 'set -uo pipefail\n(\nset -euo pipefail\n'
    cat "$body"
    printf '\n)\nprintf %s"%%s\\n" "$?"\n' "'$RC_MARK'"
  } | tailscale ssh "$HOST" -- 'bash -s' 2>&1 | tee "$log"
  STREAM_RC="$(grep -o "${RC_MARK}[0-9]*" "$log" | tail -1 | cut -d= -f2)"
  [ -n "$STREAM_RC" ] || STREAM_RC=255
  STREAM_RC="${STREAM_RC//[[:space:]]/}"
  grep -v -F "$RC_MARK" "$log" >"$log.clean" && mv "$log.clean" "$log"
  return 0
}

# transfer_up <local-file> <path-relative-to-remote-$HOME> — gzip -1 stream; the marker
# proves the remote write completed, and the caller still compares sha256 on both
# sides. tailscale ssh cannot report the failure itself.
transfer_up() {
  local src="$1" rel="$2" out
  out="$(gzip -1 -c "$src" | tailscale ssh "$HOST" -- "gunzip -c > \"\$HOME/$rel.partial\" && mv \"\$HOME/$rel.partial\" \"\$HOME/$rel\" && printf '$RC_MARK'0")" || true
  case "$out" in
    *"${RC_MARK}0") ;;
    *) die "transfer of $(basename "$src") to $HOST:~/$rel did not confirm (ssh said: ${out:-<no output>})" ;;
  esac
}

# electron-builder only suffixes the output directory for non-x64 targets:
# arm64 -> release/mac-arm64, x64 -> release/mac (measured, electron-builder 26.15.7).
out_dir_for() {
  case "$1" in
    x64) echo release/mac ;;
    *) echo "release/mac-$1" ;;
  esac
}

# The Mach-O slice name lipo reports for each electron-builder arch.
slice_for() {
  case "$1" in
    x64) echo x86_64 ;;
    *) echo "$1" ;;
  esac
}

CHECK=0
ARCHES=()
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    --arm64) ARCHES+=("arm64") ;;
    --x64) ARCHES+=("x64") ;;
    --help | -h) usage 0 ;;
    *) die "unknown argument: $arg (accepted: --check --arm64 --x64)" ;;
  esac
done

# Identity travels with the profile (package.mjs does the same): without these flags a
# member profile would ship its payload under the generic VClaw name/appId.
PROFILE_FILE="$REPO_ROOT/${PROFILE}"
PROFILE_ID="$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PROFILE_FILE" 2>/dev/null | head -1)"
PROFILE_NAME="$(sed -n 's/.*"productName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PROFILE_FILE" 2>/dev/null | head -1)"
PROFILE_APP_ID="$(sed -n 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$PROFILE_FILE" 2>/dev/null | head -1)"
APP_NAME="${PROFILE_NAME:-VClaw}"

# ok | dirty | untracked — a profile that differs from HEAD cannot be what the
# remote checkout packages, so building it would silently use the committed file.
profile_state() {
  if ! git -C "$REPO_ROOT" ls-files --error-unmatch "$PROFILE" >/dev/null 2>&1; then
    echo untracked
  elif git -C "$REPO_ROOT" diff --quiet HEAD -- "$PROFILE"; then
    echo ok
  else
    echo dirty
  fi
}

COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
BRANCH="$(git -C "$REPO_ROOT" symbolic-ref --short -q HEAD)" ||
  die "detached HEAD in $REPO_ROOT — check out the branch you intend to build"

# --- preflight (read-only) ---------------------------------------------------
PREFLIGHT_FAILS=0
verdict_ok() { printf '  ok    %s — %s\n' "$1" "$2"; }
verdict_fail() {
  PREFLIGHT_FAILS=$((PREFLIGHT_FAILS + 1))
  printf '  FAIL  %s — %s\n' "$1" "$2"
}

preflight() {
  PREFLIGHT_FAILS=0
  local arch node_v want expected actual free_kb code

  printf 'preflight: remote build on %s (%s)\n' "$HOST" "$REPO_ROOT"

  # 1. the host answers at all — a local build is never a fallback
  if ! ssh_run "echo ok" >/dev/null 2>&1; then
    printf '  FAIL  host — %s is unreachable over tailscale ssh\n' "$HOST"
    printf '        this script never falls back to a local build; if you truly need one:\n'
    printf '        VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64 (docs/BUILD_LOCAL.md, not evidence)\n'
    PREFLIGHT_FAILS=$((PREFLIGHT_FAILS + 1))
    return 1
  fi
  verdict_ok host "tailscale ssh answers (rc=0)"

  # 2. node exactly as .nvmrc pins it — the host's own node is v25 and stays untouched
  want="$NODE_VERSION"
  if ssh_run "test -x $NODE_DIR/node" >/dev/null 2>&1; then
    node_v="$(ssh_run "export PATH=\"$NODE_DIR:/usr/bin:/bin\"; node -v")"
    if [ "$node_v" = "v$want" ]; then
      verdict_ok node "$node_v (exactly .nvmrc) at ~/build/toolchain/node-v$want-darwin-arm64"
    else
      verdict_fail node "the pinned toolchain ~/build/toolchain/node-v$want-darwin-arm64/bin/node reports $node_v, .nvmrc pins v$want"
    fi
  else
    verdict_fail node "missing ~/build/toolchain/node-v$want-darwin-arm64/bin/node — see one-time setup in docs/BUILD_REMOTE.md"
  fi
  case "$(profile_state)" in
    ok) verdict_ok profile "$PROFILE matches HEAD (built from ${COMMIT:0:12})" ;;
    dirty) verdict_fail profile "$PROFILE differs from HEAD — the build packages the committed profile, not this edit" ;;
    untracked) verdict_fail profile "$PROFILE is not tracked — it cannot be in the commit the host builds" ;;
  esac
  verdict_ok "host node (default)" "$(ssh_run "export PATH=/opt/homebrew/bin:/usr/bin:/bin; node -v 2>/dev/null || echo 'none on PATH'") — never used for builds"

  # 3. checkout — present, and at the commit this workstation is on
  if ssh_run "test -d \"\$HOME/$REMOTE_REPO/.git\"" >/dev/null 2>&1; then
    actual="$(ssh_run "git -C \"\$HOME/$REMOTE_REPO\" rev-parse HEAD 2>/dev/null || echo none")"
    if [ "$actual" = "$COMMIT" ]; then
      verdict_ok checkout "$actual (branch $BRANCH)"
    else
      verdict_fail checkout "host has ${actual:0:12}…, workstation has ${COMMIT:0:12}… — a build will sync it"
    fi
  else
    verdict_fail checkout "no checkout at ~/$REMOTE_REPO — the first build creates it"
  fi

  # 4. OMP release set — present on the host with the digest SHA256SUMS.txt claims
  if ssh_run "test -f \"\$HOME/$REMOTE_VENDORS/SHA256SUMS.txt\"" >/dev/null 2>&1; then
    verdict_ok "SHA256SUMS.txt" "present at ~/$REMOTE_VENDORS/SHA256SUMS.txt"
  else
    verdict_fail "SHA256SUMS.txt" "missing ~/$REMOTE_VENDORS/SHA256SUMS.txt (after-pack.cjs needs it)"
  fi
  for arch in "${ARCHES[@]}"; do
    expected="$(awk -v want="omp-darwin-$arch" '$2 == want { print $1; exit }' "$VENDOR_RELEASE/SHA256SUMS.txt" 2>/dev/null || true)"
    if [ -z "$expected" ]; then
      verdict_fail "omp $arch digest" "no omp-darwin-$arch entry in $VENDOR_RELEASE/SHA256SUMS.txt"
      continue
    fi
    actual="$(ssh_run "test -f \"\$HOME/$REMOTE_VENDORS/omp-darwin-$arch\" && shasum -a 256 \"\$HOME/$REMOTE_VENDORS/omp-darwin-$arch\" | cut -d' ' -f1 || true")"
    if [ "$actual" = "$expected" ]; then
      verdict_ok "omp $arch" "$actual (matches SHA256SUMS.txt)"
    elif [ -z "$actual" ]; then
      verdict_fail "omp $arch" "missing ~/$REMOTE_VENDORS/omp-darwin-$arch — a build streams it from $VENDOR_RELEASE"
    else
      verdict_fail "omp $arch" "host has ${actual:0:12}…, SHA256SUMS.txt says ${expected:0:12}… — a build re-streams it"
    fi
  done

  # 5. disk — Electron, node_modules and a .app per arch
  free_kb="$(ssh_run "df -Pk \"\$HOME\" | awk 'NR == 2 { print \$4 }'")"
  if [ -n "$free_kb" ] && [ "$free_kb" -gt $((MIN_FREE_GB * 1024 * 1024)) ]; then
    verdict_ok disk "$(awk -v kb="$free_kb" 'BEGIN { printf "%.1f", kb / 1048576 }') GiB free in ~ (need > ${MIN_FREE_GB})"
  else
    verdict_fail disk "$(awk -v kb="${free_kb:-0}" 'BEGIN { printf "%.1f", kb / 1048576 }') GiB free in ~, need > ${MIN_FREE_GB}"
  fi

  # 6. the Electron mirror — github.com resolves to an unrouted fake-ip on this host
  code="$(ssh_run "curl -sSL -I -o /dev/null --max-time $MIRROR_TIMEOUT -w '%{http_code}' '$MIRROR' 2>/dev/null || true" || true)"
  case "$code" in
    2?? | 3??) verdict_ok "electron mirror" "$MIRROR -> HTTP $code (from host)" ;;
    '') verdict_fail "electron mirror" "$MIRROR unreachable from host within ${MIRROR_TIMEOUT}s" ;;
    *) verdict_fail "electron mirror" "$MIRROR -> HTTP $code (from host)" ;;
  esac

  # 7. toolchain for native modules (node-pty, zeromq, koffi)
  verdict_ok xcode-select "$(ssh_run "xcode-select -p")"
  verdict_ok lipo "$(ssh_run "command -v lipo")"

  echo
  if [ "$PREFLIGHT_FAILS" -eq 0 ]; then
    printf 'preflight: PASS (%s)\n' "${ARCHES[*]}"
    return 0
  fi
  printf 'preflight: FAIL — %s item(s)\n' "$PREFLIGHT_FAILS"
  return 1
}

if [ "$CHECK" -eq 1 ]; then
  if [ "${#ARCHES[@]}" -eq 0 ]; then
    ARCHES=("arm64" "x64")
  fi
  if ! preflight; then
    exit 1
  fi
  exit 0
fi

# --- build path --------------------------------------------------------------
step "preconditions"
if ! ssh_run "true" >/dev/null 2>&1; then
  die "$HOST is unreachable over tailscale ssh.
       This script only builds on the remote host and will not fall back to a local
       build. If you need one anyway it is explicit and not evidence:
       VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64  (docs/BUILD_LOCAL.md)"
fi
if ! ssh_run "test -x $NODE_DIR/node" >/dev/null 2>&1; then
  die "node v$NODE_VERSION is not installed on $HOST at \$HOME/build/toolchain/node-v$NODE_VERSION-darwin-arm64
       run the one-time setup in docs/BUILD_REMOTE.md"
fi
REMOTE_NODE="$(ssh_run "export PATH=\"$NODE_DIR:/usr/bin:/bin\"; node -v")"
[ "$REMOTE_NODE" = "v$NODE_VERSION" ] ||
  die "host node is $REMOTE_NODE, expected v$NODE_VERSION (see docs/BUILD_REMOTE.md)"
HOST_ARCH="$(ssh_run "uname -m")"

if [ "${#ARCHES[@]}" -eq 0 ]; then
  case "$HOST_ARCH" in
    arm64) ARCHES=("arm64") ;;
    x86_64) ARCHES=("x64") ;;
    *) die "unknown host arch '$HOST_ARCH'; pass --arm64 and/or --x64" ;;
  esac
fi

if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
  printf 'build-remote: WARNING: %s has uncommitted changes; they are NOT in the bundle — building commit %s only\n' \
    "$REPO_ROOT" "${COMMIT:0:12}" >&2
fi

printf '    source %s @ %s\n' "$BRANCH" "${COMMIT:0:12}"
printf '    host   %s, node %s (%s), arches %s\n' "$HOST" "$REMOTE_NODE" "$HOST_ARCH" "${ARCHES[*]}"
printf '    profile %s -> resources/product.json (id %s, %s / %s)\n' \
    "$PROFILE" "${PROFILE_ID:-?}" "$APP_NAME" "${PROFILE_APP_ID:-<default appId>}"

for arch in "${ARCHES[@]}"; do
  [ -f "$VENDOR_RELEASE/omp-darwin-$arch" ] ||
    die "missing OMP release binary $VENDOR_RELEASE/omp-darwin-$arch (see docs/BUILD_REMOTE.md)"
done
[ -f "$VENDOR_RELEASE/SHA256SUMS.txt" ] || die "missing $VENDOR_RELEASE/SHA256SUMS.txt"
[ -f "$PROFILE_FILE" ] || die "no product profile at $PROFILE_FILE (VCLAW_PROFILE)"
case "$(profile_state)" in
  ok) ;;
  dirty)
    die "product profile $PROFILE has uncommitted changes, but this build packages the
       profile committed at ${COMMIT:0:12} — the artefact must come from a commit.
       Commit the profile change (or build the commit that contains it), then rerun."
    ;;
  untracked) die "$PROFILE is not tracked by git, so the remote checkout cannot contain it" ;;
esac

ssh_run "mkdir -p \"\$HOME/$REMOTE_REPO\" \"\$HOME/$REMOTE_VENDORS\""

# --- 1. sync source ----------------------------------------------------------
step "sync source $BRANCH@${COMMIT:0:12} -> $HOST:$REMOTE_REPO"
if ssh_run "test -d \"\$HOME/$REMOTE_REPO/.git\" && git -C \"\$HOME/$REMOTE_REPO\" cat-file -e '$COMMIT^{commit}'" >/dev/null 2>&1; then
  printf '    commit %s already on host — no transfer\n' "${COMMIT:0:12}"
else
  BUNDLE="$(mktemp "${TMPDIR:-/tmp}/vclaw-desktop.XXXXXX")"
  trap 'rm -f "$BUNDLE"' EXIT
  git -C "$REPO_ROOT" bundle create "$BUNDLE" "refs/heads/$BRANCH"
  BUNDLE_SUM="$(shasum -a 256 "$BUNDLE" | cut -d' ' -f1)"
  printf '    sending bundle %s (%s)\n' "$(du -h "$BUNDLE" | cut -f1)" "${BUNDLE_SUM:0:12}"
  transfer_up "$BUNDLE" "$REMOTE_BUNDLE"
  REMOTE_BUNDLE_SUM="$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_BUNDLE\" | cut -d' ' -f1")"
  [ "$BUNDLE_SUM" = "$REMOTE_BUNDLE_SUM" ] ||
    die "bundle digest mismatch: local ${BUNDLE_SUM:0:12} remote ${REMOTE_BUNDLE_SUM:0:12}"
fi

ssh_run "cd \"\$HOME/$REMOTE_REPO\"
  if [ ! -d .git ]; then git init --quiet .; fi
  if ! git cat-file -e '$COMMIT^{commit}' 2>/dev/null; then
    git fetch --quiet --force \"\$HOME/$REMOTE_BUNDLE\" 'refs/heads/*:refs/remotes/sync/*'
  fi
  git checkout --quiet --force --detach '$COMMIT'
  test \"\$(git rev-parse HEAD)\" = '$COMMIT'"
printf '    checkout %s ok\n' "${COMMIT:0:12}"

# --- 2. sync the OMP release set --------------------------------------------
step "sync OMP release set -> $HOST:$REMOTE_VENDORS"
sync_file() { # sync_file <local> <remote-relative>
  local src="$1" dst="$2" sum remote_sum
  sum="$(shasum -a 256 "$src" | cut -d' ' -f1)"
  remote_sum="$(ssh_run "if [ -f \"\$HOME/$dst\" ]; then shasum -a 256 \"\$HOME/$dst\" | cut -d' ' -f1; fi")"
  if [ "$sum" = "$remote_sum" ]; then
    printf '    %-22s present (%s)\n' "$(basename "$src")" "${sum:0:12}"
    return
  fi
  printf '    %-22s sending %s\n' "$(basename "$src")" "$(du -h "$src" | cut -f1)"
  transfer_up "$src" "$dst"
  remote_sum="$(ssh_run "shasum -a 256 \"\$HOME/$dst\" | cut -d' ' -f1")"
  [ "$sum" = "$remote_sum" ] || die "$(basename "$src"): digest mismatch local ${sum:0:12} remote ${remote_sum:0:12}"
}
sync_file "$VENDOR_RELEASE/SHA256SUMS.txt" "$REMOTE_VENDORS/SHA256SUMS.txt"

# --- 3. build + verify + collect, per arch ----------------------------------
for arch in "${ARCHES[@]}"; do
  sync_file "$VENDOR_RELEASE/omp-darwin-$arch" "$REMOTE_VENDORS/omp-darwin-$arch"

  step "npm ci + electron-vite build + electron-builder --mac --$arch --dir (on $HOST)"
  mkdir -p "$LOCAL_OUT/$arch"
  LOG="$LOCAL_OUT/$arch/build.log"
  BUILD_BODY="$(mktemp "${TMPDIR:-/tmp}/vclaw-build-body.XXXXXX")"
  # electronDist is a single-arch Electron tree: use the one npm ci installed only
  # when the build arch equals the host arch, otherwise let electron-builder fetch the
  # matching arch through ELECTRON_MIRROR (github.com is not routable here).
  EXTRA=""
  case "$arch:$HOST_ARCH" in
    arm64:arm64 | x64:x86_64) EXTRA="--config.electronDist=\"\$HOME/$REMOTE_REPO/node_modules/electron/dist\"" ;;
  esac
  IDENTITY_ARGS=""
  [ -z "$PROFILE_NAME" ] || IDENTITY_ARGS="--config.productName=\"$PROFILE_NAME\""
  [ -z "$PROFILE_APP_ID" ] || IDENTITY_ARGS="$IDENTITY_ARGS --config.appId=\"$PROFILE_APP_ID\""
  OUT_DIR="$(out_dir_for "$arch")"
  cat >"$BUILD_BODY" <<EOF
export PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin"
export ELECTRON_MIRROR="$MIRROR"
cd "\$HOME/$REMOTE_REPO"
node -v; npm -v
npm ci --no-audit --no-fund
npm run build:bundle
test -f out/main/index.js || { echo 'electron-vite produced no out/main/index.js' >&2; exit 1; }
# electron-builder copies product/profile.active.json to resources/product.json;
# package.mjs stages it from the chosen profile, so stage it here too and remove it
# afterwards (the checkout must stay at the commit).
cp "$PROFILE" product/profile.active.json
trap 'rm -f product/profile.active.json' EXIT
rm -rf "${OUT_DIR:?}"
./node_modules/.bin/electron-builder --mac --$arch --dir --publish never \\
  --config.mac.identity=null --config.mac.notarize=false $IDENTITY_ARGS $EXTRA
EOF
  ssh_stream "$BUILD_BODY" "$LOG"
  rm -f "$BUILD_BODY"
  [ "$STREAM_RC" = "0" ] || die "build of $arch failed (remote rc=$STREAM_RC, log: $LOG)"
  grep -qF 'after-pack: bundled omp verified' "$LOG" ||
    die "after-pack verification line missing from $LOG — the omp bundle was not verified"
  grep -F 'after-pack: bundled omp verified' "$LOG" | tail -1 | sed 's/^/    /'
  printf '    rc=0\n'

  # --- verification gates, on the host --------------------------------------
  step "verify the $arch artefact on $HOST"
  APP_REL="$OUT_DIR/$APP_NAME.app"
  APP_PATH="$(ssh_run "printf '%s' \"\$HOME/$REMOTE_REPO/$APP_REL\"")"
  ssh_run "test -f \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Info.plist\"" >/dev/null 2>&1 ||
    die "no app bundle at $APP_PATH on $HOST"
  EXE_NAME="$(ssh_run "plutil -extract CFBundleExecutable raw \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Info.plist\"")"
  EXE_SLICE="$(ssh_run "lipo -archs \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/MacOS/$EXE_NAME\"")"
  OMP_SUM_HOST="$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Resources/harness/bin/omp\" | cut -d' ' -f1")"
  OMP_SLICE="$(ssh_run "lipo -archs \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Resources/harness/bin/omp\"")"
  APP_ID="$(ssh_run "plutil -extract CFBundleIdentifier raw \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Info.plist\"")"
  tailscale ssh "$HOST" -- "cat \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Resources/product.json\"" >"$LOCAL_OUT/$arch/product.json"
  PRODUCT_ID="$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$LOCAL_OUT/$arch/product.json" | head -1)"
  ELECTRON_VERSION="$(grep -o 'electron=[0-9][0-9.]*' "$LOG" | tail -1 | cut -d= -f2)"

  {
    printf 'app      = %s\n' "$APP_PATH"
    printf 'exe      = %s (%s)\n' "$EXE_NAME" "$EXE_SLICE"
    printf 'omp      = %s\n' "$OMP_SUM_HOST"
    printf 'omp-lipo = %s\n' "$OMP_SLICE"
    printf 'product  = %s\n' "$PRODUCT_ID"
    printf 'app_id   = %s\n' "$APP_ID"
    printf 'electron = %s\n' "$ELECTRON_VERSION"
  } | tee "$LOCAL_OUT/$arch/verify.txt"

  if [ -n "$PROFILE_APP_ID" ] && [ "$APP_ID" != "$PROFILE_APP_ID" ]; then
    die "packaged CFBundleIdentifier is '$APP_ID', profile $PROFILE says '$PROFILE_APP_ID'"
  fi
  if [ -n "$PROFILE_ID" ] && [ "$PRODUCT_ID" != "$PROFILE_ID" ]; then
    die "packaged product.json id is '$PRODUCT_ID', profile $PROFILE says '$PROFILE_ID'"
  fi

  EXPECTED_SLICE="$(slice_for "$arch")"
  [ "$OMP_SLICE" = "$EXPECTED_SLICE" ] ||
    die "packaged omp slice is '$OMP_SLICE', expected $EXPECTED_SLICE"
  case " $EXE_SLICE " in
    *" $EXPECTED_SLICE "*) ;;
    *) die "app executable slices are '$EXE_SLICE', expected $EXPECTED_SLICE" ;;
  esac
  grep -q "^$OMP_SUM_HOST .*omp-darwin-$arch\$" "$VENDOR_RELEASE/SHA256SUMS.txt" ||
    die "packaged omp sha256 $OMP_SUM_HOST is not in SHA256SUMS.txt for omp-darwin-$arch"

  # --- collect --------------------------------------------------------------
  step "collect the $arch app bundle"
  ZIP="$APP_NAME-$arch-app.zip"
  REMOTE_SUM="$(ssh_run "cd \"\$HOME/$REMOTE_REPO/$OUT_DIR\" && rm -f /tmp/$ZIP && ditto -c -k --sequesterRsrc --keepParent \"$APP_NAME.app\" /tmp/$ZIP && shasum -a 256 /tmp/$ZIP | cut -d' ' -f1")"
  printf '    pulling %s\n' "$ZIP"
  tailscale ssh "$HOST" -- "cat /tmp/$ZIP" >"$LOCAL_OUT/$arch/$ZIP"
  LOCAL_SUM="$(shasum -a 256 "$LOCAL_OUT/$arch/$ZIP" | cut -d' ' -f1)"
  [ "$LOCAL_SUM" = "$REMOTE_SUM" ] || die "$ZIP: transfer digest mismatch (local ${LOCAL_SUM:0:12} remote ${REMOTE_SUM:0:12})"
  printf '    %s\n' "$LOCAL_OUT/$arch/$ZIP"
  printf '    sha256 %s\n' "$LOCAL_SUM"

  # Machine-readable provenance for pinning: the commit the artefact was built from
  # and the digests a release manifest can carry. No jq, no extra deps.
  cat >"$LOCAL_OUT/$arch/BUILD.json" <<EOF
{
  "schema": 1,
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "$HOST",
  "source": {
    "repo": "vclaw-desktop",
    "branch": "$BRANCH",
    "commit": "$COMMIT"
  },
  "arch": "$arch",
  "product": {
    "id": "$PRODUCT_ID",
    "name": "$APP_NAME",
    "appId": "$APP_ID"
  },
  "artifact": {
    "file": "$ZIP",
    "bytes": $(stat -f '%z' "$LOCAL_OUT/$arch/$ZIP"),
    "sha256": "$LOCAL_SUM"
  },
  "app": {
    "path": "$APP_PATH",
    "executable": "$EXE_NAME",
    "executableSlices": "$EXE_SLICE"
  },
  "omp": {
    "release": "v18.16.0",
    "binary": "omp-darwin-$arch",
    "sha256": "$OMP_SUM_HOST",
    "slices": "$OMP_SLICE"
  },
  "electron": "$ELECTRON_VERSION",
  "signing": null
}
EOF
  printf '    provenance %s\n' "$LOCAL_OUT/$arch/BUILD.json"
done

# --- 4. prove the pulled artefacts ------------------------------------------
step "verify collected artefacts locally"
for arch in "${ARCHES[@]}"; do
  ZIP="$LOCAL_OUT/$arch/$APP_NAME-$arch-app.zip"
  rm -rf "$LOCAL_OUT/$arch/unpacked"
  mkdir -p "$LOCAL_OUT/$arch/unpacked"
  ditto -x -k "$ZIP" "$LOCAL_OUT/$arch/unpacked"
  EXE_NAME="$(plutil -extract CFBundleExecutable raw "$LOCAL_OUT/$arch/unpacked/$APP_NAME.app/Contents/Info.plist")"
  EXE="$LOCAL_OUT/$arch/unpacked/$APP_NAME.app/Contents/MacOS/$EXE_NAME"
  OMP="$LOCAL_OUT/$arch/unpacked/$APP_NAME.app/Contents/Resources/harness/bin/omp"
  WANT="$(slice_for "$arch")"
  lipo -archs "$EXE" | grep -qw "$WANT" || die "pulled $arch exe is not $WANT: $(lipo -archs "$EXE")"
  lipo -archs "$OMP" | grep -qw "$WANT" || die "pulled $arch omp is not $WANT: $(lipo -archs "$OMP")"
  OMP_SUM="$(shasum -a 256 "$OMP" | cut -d' ' -f1)"
  grep -q "^$OMP_SUM .*omp-darwin-$arch\$" "$VENDOR_RELEASE/SHA256SUMS.txt" ||
    die "pulled $arch omp sha256 $OMP_SUM is not in SHA256SUMS.txt"
  printf '    %s: exe %s, omp %s (%s…)\n' "$arch" "$(lipo -archs "$EXE")" "$(lipo -archs "$OMP")" "${OMP_SUM:0:12}"
done

step "done"
printf '    artefacts + logs under %s\n' "$LOCAL_OUT"
