#!/usr/bin/env bash
# Build the VClaw desktop app on the remote macOS build host — the PRIMARY flow.
#
#   bash scripts/release/build-remote.sh --check                # read-only preflight
#   bash scripts/release/build-remote.sh --arm64
#   bash scripts/release/build-remote.sh --x64
#   bash scripts/release/build-remote.sh --arm64 --x64
#   bash scripts/release/build-remote.sh --arm64 --member vizmaster \
#     --member-repo ~/Documents/Chatek/VillageCity/VCC2/VizMaster \
#     --member-sha 813c2c7f4e05b02438aded6bb91c1972ca62422b
#
# A member build is the only publishable member artefact: it ships the member repo at a
# commit as a git bundle, then on the host runs provenance -> payload bundle -> integrate
# -> --check -> package, and refuses to package unless the payload layout (v2
# `product/payload`, or the v1 `vendor/<member>`) carries real member content and a
# payload BUILD.json. A `--dir`-style build of the generic tree carries a lone README.md
# there and must not be handed to a member's intake.
#
# With no arch flag a build defaults to the host's arch. Nothing is packaged on the
# workstation: this streams a git bundle of the current commit plus the OMP release
# set to the host, builds there, and pulls the .dmg and the .app .zip back
# (docs/BUILD_REMOTE.md). The host runs
# `electron-builder --mac --<arch> dmg zip --publish never --config.mac.identity=null
#  --config.mac.notarize=false`, so every artefact it produces is unsigned and
# unnotarised by construction, and `hdiutil verify` must pass on both copies of the dmg.
#
# The remote host is the only sanctioned builder. If it is unreachable this script
# FAILS — it never falls back to a local build. The local path is a separate,
# explicitly opt-in script (scripts/release/build-local.sh, docs/BUILD_LOCAL.md) and
# its output is not evidence. There is no automatic switch between them.
#
# Env overrides (all optional):
#   BUILD_HOST        ssh destination (default build@build-host.example)
#   REMOTE_ROOT       build root, relative to the remote $HOME (default build/vclaw)
#   LOCAL_OUT         local collect directory (default <repo>/release-remote)
#   ELECTRON_MIRROR   mirror electron-builder downloads from
#   ELECTRON_MIRROR_TIMEOUT  seconds for the mirror probe (default 15)
#   VCLAW_PROFILE      product profile staged as resources/product.json
#                      (default product/profile.json — the generic vclaw identity;
#                       product/<member>.json, implied by --member, for a member build)
#
# Member build arguments (all three or none):
#   --member <id>          member id == the profile id (product/<id>.json)
#   --member-repo <path>   the member git checkout the bundle is cut from
#   --member-sha <40-hex>  the member commit to ship (never the working tree)
#   --member-integrate <mode>  how the payload becomes product/payload (default integrator)
#       integrator  run the member repo's `scripts/integrate-vcclaw.mjs --vclaw <checkout>
#                   --carrier v2` and then `… --check`. Fails closed if the member repo's
#                   anchors do not match this vclaw commit.
#       v2          contract-v2 LOCAL integration, opt-in and labelled in the artefact name
#                   (`-v2local`): copy the bundled payload to product/payload and render
#                   product/profile.active.json from the payload release. NO source
#                   rewrites, NO anchor patching, NO package.json mutation. Use it when the
#                   member's integrator still patches the anchors contract v2 retired
#                   (docs/MEMBER_BUILD.md step 4) — the release body states the mode, so the
#                   artefact is never mistaken for one built by the member's pipeline.
set -Eeuo pipefail

HOST="${BUILD_HOST:-build@build-host.example}"
REMOTE_ROOT="${REMOTE_ROOT:-build/vclaw}"
MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
MIRROR_TIMEOUT="${ELECTRON_MIRROR_TIMEOUT:-15}"
PROFILE="${VCLAW_PROFILE:-product/profile.json}"
MIN_FREE_GB=20
MEMBER=""
MEMBER_REPO=""
MEMBER_SHA=""
MEMBER_INTEGRATE="${VCLAW_MEMBER_INTEGRATE:-integrator}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The tree this build ships. Defaults to the checkout the script lives in; override with
# RELEASE_REPO_ROOT to build from a clean clone/worktree at the same commit while the
# scripts themselves are still uncommitted in the lane's tree. The commit — not the tree —
# is what the host receives, and the driver still refuses anything but a commit.
REPO_ROOT="${RELEASE_REPO_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
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
  # `|| true`: this function's contract is "always return 0, report through
  # STREAM_RC". Without it a local pipeline member failing (tee cannot open $log,
  # the ssh transport dying mid-run) trips the ERR trap *after* the remote build has
  # already been paid for and aborts the run with a raw `FAILED at line …: tee "$log"`
  # dump instead of the step diagnosis below. Measured: `$log` as a directory → tee
  # exits 1 at once, the build still finishes green, driver dies at rc=1.
  {
    printf 'set -uo pipefail\n(\nset -euo pipefail\n'
    cat "$body"
    printf '\n)\nprintf %s"%%s\\n" "$?"\n' "'$RC_MARK'"
  } | tailscale ssh "$HOST" -- 'bash -s' 2>&1 | tee "$log" || true
  STREAM_RC=""
  if [ -f "$log" ]; then
    STREAM_RC="$(grep -o "${RC_MARK}[0-9]*" "$log" | tail -1 | cut -d= -f2)" || true
    grep -v -F "$RC_MARK" "$log" >"$log.clean" || true
    if [ -f "$log.clean" ]; then mv -f "$log.clean" "$log"; fi
  fi
  [ -n "$STREAM_RC" ] || STREAM_RC=255
  STREAM_RC="${STREAM_RC//[[:space:]]/}"
  return 0
}

# transfer_up <local-file> <path-relative-to-remote-$HOME> — gzip -1 stream; the marker
# proves the remote write completed, and the caller still compares sha256 on both
# sides. tailscale ssh cannot report the failure itself.
transfer_up() {
  local src="$1" rel="$2" out rc=0
  # The pipeline is expected to fail whenever the remote write does, so it must not
  # reach the ERR trap: `set -E` hands the trap to subshells and it used to fire
  # inside this command substitution, printing `FAILED at line … (rc=141)` (gzip's
  # SIGPIPE) *before* the real diagnosis. `|| rc=$?` records the status instead, and
  # ssh's stderr is folded into `out` so the remote shell's own message ("permission
  # denied: …partial") survives into the FAILED line instead of only the terminal.
  out="$(
    trap - ERR
    gzip -1 -c "$src" | tailscale ssh "$HOST" -- \
      "gunzip -c > \"\$HOME/$rel.partial\" && mv \"\$HOME/$rel.partial\" \"\$HOME/$rel\" && printf '$RC_MARK'0" 2>&1
  )" || rc=$?
  case "$out" in
    *"${RC_MARK}0") ;;
    *)
      ssh_run "rm -f \"\$HOME/$rel.partial\"" >/dev/null 2>&1 || true
      die "transfer of $(basename "$src") to $HOST:~/$rel failed (stream rc=$rc): ${out:-<no output>}"
      ;;
  esac
}

# pull_down <path-relative-to-remote-$HOME> <local-file> — streams one file back over
# tailscale ssh. The ssh status is not trustworthy, so every caller compares the sha256
# the host reported with the local file (a truncated stream then fails the gate).
pull_down() {
  tailscale ssh "$HOST" -- "cat \"\$HOME/$1\"" >"$2"
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

# payload_field <"key=value …"> <key> — one field of the payload assert's machine line
# (`PAYLOAD_ASSERT layout=… carrier=… release=… files=… bytes=… sha256=…`). No JSON tool.
payload_field() {
  printf '%s\n' "$1" | tr ' ' '\n' | sed -n "s/^$2=//p" | tail -1
}

CHECK=0
ARCHES=()
need_value() { # need_value <flag> <remaining-count>
  [ "$2" -ge 1 ] || die "$1 needs a value"
}
while [ "$#" -gt 0 ]; do
  arg="$1"
  case "$arg" in
    --check) CHECK=1 ;;
    --arm64) ARCHES+=("arm64") ;;
    --x64) ARCHES+=("x64") ;;
    --member)
      need_value "$arg" "$(($# - 1))"
      MEMBER="$2"
      shift
      ;;
    --member-repo)
      need_value "$arg" "$(($# - 1))"
      MEMBER_REPO="$2"
      shift
      ;;
    --member-sha)
      need_value "$arg" "$(($# - 1))"
      MEMBER_SHA="$2"
      shift
      ;;
    --member-integrate)
      need_value "$arg" "$(($# - 1))"
      MEMBER_INTEGRATE="$2"
      shift
      ;;
    --help | -h) usage 0 ;;
    *) die "unknown argument: $arg (accepted: --check --arm64 --x64 --member --member-repo --member-sha --member-integrate)" ;;
  esac
  shift
done

if [ -n "$MEMBER" ] && [ -z "${VCLAW_PROFILE:-}" ]; then
  PROFILE="product/$MEMBER.json"
fi

# ok | dirty — whether the working-tree profile is what HEAD carries. Identity is read
# from the COMMIT (below), because the host checks the commit out: a working-tree edit
# cannot be packaged, so the only honest use of it is a warning that it was ignored.
profile_state() {
  if git -C "$REPO_ROOT" diff --quiet HEAD -- "$PROFILE" 2>/dev/null; then
    echo ok
  else
    echo dirty
  fi
}

REMOTE_URL="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo unknown)"
COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
BRANCH="$(git -C "$REPO_ROOT" symbolic-ref --short -q HEAD)" ||
  die "detached HEAD in $REPO_ROOT — check out the branch you intend to build"

# Identity travels with the profile (package.mjs does the same): without these flags a
# member profile would ship its payload under the generic VClaw name/appId. Read from
# `git show <commit>:<profile>` — the identity the HOST will package — never from the
# working tree, which may hold an edit this build cannot carry.
PROFILE_JSON="$(git -C "$REPO_ROOT" show "$COMMIT:$PROFILE" 2>/dev/null || true)"
[ -n "$PROFILE_JSON" ] ||
  die "no product profile $PROFILE at ${COMMIT:0:12} — the host checks that commit out, so the
       profile this build packages must be committed (git show ${COMMIT:0:12}:$PROFILE is empty)"
PROFILE_ID="$(printf '%s\n' "$PROFILE_JSON" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
PROFILE_NAME="$(printf '%s\n' "$PROFILE_JSON" | sed -n 's/.*"productName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
PROFILE_APP_ID="$(printf '%s\n' "$PROFILE_JSON" | sed -n 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
APP_NAME="${PROFILE_NAME:-VClaw}"

# --- member build identity ---------------------------------------------------
# A member build ships the member repo AT A COMMIT, exactly like this checkout: a git
# bundle of the refs that carry <sha> streams to the host, which checks that commit out
# detached. The member's working tree is never shipped, so local edits (and untracked
# files) cannot leak into the payload — only the commit can.
if [ -n "$MEMBER$MEMBER_REPO$MEMBER_SHA" ]; then
  [ -n "$MEMBER" ] && [ -n "$MEMBER_REPO" ] && [ -n "$MEMBER_SHA" ] ||
    die "--member, --member-repo and --member-sha are one unit: pass all three (or none of them)"
  case "$MEMBER" in
    [a-z0-9]*) ;;
    *) die "--member '$MEMBER' must start with [a-z0-9] (the profile id is a package-safe name)" ;;
  esac
  case "$MEMBER" in
    *[!a-z0-9-]*) die "--member '$MEMBER' must match [a-z0-9][a-z0-9-]* (example: vizmaster)" ;;
  esac
  case "$MEMBER_SHA" in
    *[!0-9a-f]*) die "--member-sha must be 40 lowercase hex characters (got '$MEMBER_SHA')" ;;
  esac
  [ "${#MEMBER_SHA}" -eq 40 ] || die "--member-sha must be 40 lowercase hex characters (got ${#MEMBER_SHA})"
  case "$MEMBER_INTEGRATE" in
    integrator | v2) ;;
    *) die "--member-integrate must be 'integrator' or 'v2' (got '$MEMBER_INTEGRATE')" ;;
  esac
  case "$MEMBER_REPO" in
    /*) ;;
    *) MEMBER_REPO="$(cd "$MEMBER_REPO" 2>/dev/null && pwd)" ||
      die "--member-repo '$MEMBER_REPO' is not a directory" ;;
  esac
  git -C "$MEMBER_REPO" rev-parse --git-dir >/dev/null 2>&1 ||
    die "--member-repo $MEMBER_REPO is not a git repository"
  git -C "$MEMBER_REPO" cat-file -e "$MEMBER_SHA^{commit}" 2>/dev/null ||
    die "$MEMBER_REPO has no commit $MEMBER_SHA — fetch it first; the bundle can only carry what the repo has"
  MEMBER_REFS="$(git -C "$MEMBER_REPO" for-each-ref --contains "$MEMBER_SHA" --format='%(refname)' refs/heads 2>/dev/null || true)"
  [ -n "$MEMBER_REFS" ] ||
    MEMBER_REFS="$(git -C "$MEMBER_REPO" for-each-ref --format='%(refname)' refs/heads 2>/dev/null || true)"
  [ -n "$MEMBER_REFS" ] ||
    die "$MEMBER_REPO has no local branch carrying $MEMBER_SHA — a bundle can only be cut from refs"
  MEMBER_REMOTE_URL="$(git -C "$MEMBER_REPO" remote get-url origin 2>/dev/null || printf '%s' "$MEMBER_REPO")"
  MEMBER_DIRTY="$(git -C "$MEMBER_REPO" status --porcelain --untracked-files=no | head -10)"
  [ -z "$MEMBER_DIRTY" ] ||
    printf 'build-remote: NOTE: %s has uncommitted tracked changes; they are NOT in the bundle — the payload is commit %s only\n' \
      "$MEMBER_REPO" "${MEMBER_SHA:0:12}" >&2
  [ "$PROFILE_ID" = "$MEMBER" ] ||
    die "--member $MEMBER but profile $PROFILE has id '${PROFILE_ID:-<none>}' — the profile decides the product;
       pass VCLAW_PROFILE=product/$MEMBER.json (or fix the profile) so the artefact and its name agree"
  REMOTE_MEMBER="$REMOTE_ROOT/member-$MEMBER"
  REMOTE_MEMBER_BUNDLE="$REMOTE_ROOT/member-$MEMBER.bundle"
  LOCAL_ASSERT="$LOCAL_OUT/.member-payload-assert.cjs"
fi

# --- preflight (read-only) ---------------------------------------------------
PREFLIGHT_FAILS=0
verdict_ok() { printf '  ok    %s — %s\n' "$1" "$2"; }
verdict_note() { printf '  note  %s — %s\n' "$1" "$2"; }
verdict_fail() {
  PREFLIGHT_FAILS=$((PREFLIGHT_FAILS + 1))
  printf '  FAIL  %s — %s\n' "$1" "$2"
}

preflight() {
  PREFLIGHT_FAILS=0
  local arch node_v want expected actual free_kb code

  printf 'preflight: remote build on %s (%s; scripts from %s)\n' "$HOST" "$REPO_ROOT" "$SCRIPT_DIR"

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
    ok) verdict_ok profile "$PROFILE is in ${COMMIT:0:12} (identity read from the commit)" ;;
    dirty) verdict_note profile "$PROFILE differs from HEAD — this build packages the COMMITTED profile, not this working-tree edit" ;;
  esac
  verdict_ok "host node (default)" "$(ssh_run "export PATH=/opt/homebrew/bin:/usr/bin:/bin; node -v 2>/dev/null || echo 'none on PATH'") — never used for builds"

  # 2b. member source + its checkout on the host (member builds only)
  if [ -n "$MEMBER" ]; then
    verdict_ok "member source" "$MEMBER @ ${MEMBER_SHA:0:12} in $MEMBER_REPO ($(printf '%s\n' "$MEMBER_REFS" | grep -c .) branch(es) carry it)"
    if ssh_run "test -d \"\$HOME/$REMOTE_MEMBER/.git\" && git -C \"\$HOME/$REMOTE_MEMBER\" cat-file -e '$MEMBER_SHA^{commit}'" >/dev/null 2>&1; then
      actual="$(ssh_run "git -C \"\$HOME/$REMOTE_MEMBER\" rev-parse HEAD 2>/dev/null || echo none")"
      if [ "$actual" = "$MEMBER_SHA" ]; then
        verdict_ok "member checkout" "$actual (member $MEMBER, at ~/$REMOTE_MEMBER)"
      else
        verdict_fail "member checkout" "host has ${actual:0:12}…, this workstation ships ${MEMBER_SHA:0:12}… — a build will sync it"
      fi
    else
      verdict_fail "member checkout" "no member checkout at ~/$REMOTE_MEMBER carrying ${MEMBER_SHA:0:12} — a member build creates it"
    fi
  fi

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
if [ -n "$MEMBER" ]; then
  printf '    member %s @ %s from %s\n' "$MEMBER" "${MEMBER_SHA:0:12}" "$MEMBER_REMOTE_URL"
  printf '    integrate %s%s\n' "$MEMBER_INTEGRATE" \
    "$([ "$MEMBER_INTEGRATE" = v2 ] && echo ' (payload + rendered profile only; the member repo integrator is NOT used)' || echo ' (the member repo integrator, then --check)')"
fi

for arch in "${ARCHES[@]}"; do
  [ -f "$VENDOR_RELEASE/omp-darwin-$arch" ] ||
    die "missing OMP release binary $VENDOR_RELEASE/omp-darwin-$arch (see docs/BUILD_REMOTE.md)"
done
[ -f "$VENDOR_RELEASE/SHA256SUMS.txt" ] || die "missing $VENDOR_RELEASE/SHA256SUMS.txt"
# The identity came from `git show`; a working-tree edit is simply not in this build.
if [ "$(profile_state)" = dirty ]; then
  printf 'build-remote: WARNING: %s differs from HEAD; packing the COMMITTED profile (%s), not that edit\n' \
    "$PROFILE" "${COMMIT:0:12}" >&2
fi

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
# An earlier integrate leaves untracked files (product/payload content, the overlay
# modules, product/profile.active.json). `checkout --force` cannot remove those, and a
# stale payload would otherwise be asserted as if this run had written it.
ssh_run "cd \"\$HOME/$REMOTE_REPO\" && git clean -fdx -q -- product electron/main/defaultProject.ts electron/main/vizshare" >/dev/null

# --- 2. member: ship the member repo at <sha>, prepare and integrate the payload ---
if [ -n "$MEMBER" ]; then
  step "sync member $MEMBER@${MEMBER_SHA:0:12} -> $HOST:$REMOTE_MEMBER"
  ssh_run "mkdir -p \"\$HOME/$REMOTE_MEMBER\"" >/dev/null
  if ssh_run "test -d \"\$HOME/$REMOTE_MEMBER/.git\" && git -C \"\$HOME/$REMOTE_MEMBER\" cat-file -e '$MEMBER_SHA^{commit}'" >/dev/null 2>&1; then
    printf '    commit %s already on host — no transfer\n' "${MEMBER_SHA:0:12}"
  else
    MEMBER_BUNDLE="$(mktemp "${TMPDIR:-/tmp}/vclaw-member.XXXXXX")"
    # shellcheck disable=SC2086 # MEMBER_REFS is the newline-separated ref list a bundle needs
    git -C "$MEMBER_REPO" bundle create "$MEMBER_BUNDLE" $MEMBER_REFS
    MEMBER_BUNDLE_SUM="$(shasum -a 256 "$MEMBER_BUNDLE" | cut -d' ' -f1)"
    printf '    sending member bundle %s (%s)\n' "$(du -h "$MEMBER_BUNDLE" | cut -f1)" "${MEMBER_BUNDLE_SUM:0:12}"
    transfer_up "$MEMBER_BUNDLE" "$REMOTE_MEMBER_BUNDLE"
    rm -f "$MEMBER_BUNDLE"
    MEMBER_BUNDLE_REMOTE_SUM="$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_MEMBER_BUNDLE\" | cut -d' ' -f1")"
    [ "$MEMBER_BUNDLE_SUM" = "$MEMBER_BUNDLE_REMOTE_SUM" ] ||
      die "member bundle digest mismatch: local ${MEMBER_BUNDLE_SUM:0:12} remote ${MEMBER_BUNDLE_REMOTE_SUM:0:12}"
  fi
  ssh_run "cd \"\$HOME/$REMOTE_MEMBER\"
  if [ ! -d .git ]; then git init --quiet .; fi
  if ! git cat-file -e '$MEMBER_SHA^{commit}' 2>/dev/null; then
    git fetch --quiet --force \"\$HOME/$REMOTE_MEMBER_BUNDLE\" 'refs/heads/*:refs/remotes/member/*'
  fi
  git cat-file -e '$MEMBER_SHA^{commit}'
  git checkout --quiet --force --detach '$MEMBER_SHA'
# ★ 2026-11-13: vizmaster 21642a5 renamed app/build -> release/out across its
# toolchain (handoff.json.paths, bundler, build-info, integrator). The stale
# app/build literals in this driver broke provenance emission on the first
# post-rename member run. These paths are the member repo's contract — keep
# them in sync with its release/handoff.json paths.artifactDir.
rm -rf release/out
  test \"\$(git rev-parse HEAD)\" = '$MEMBER_SHA'
  test -z \"\$(git status --porcelain --untracked-files=no)\""
  printf '    member checkout %s ok (clean tracked tree)\n' "${MEMBER_SHA:0:12}"

  # The payload assert runs twice: here (before packaging, so a missing/early integrate
  # cannot be packaged) and against the packaged .app (so the bytes in the artefact, not
  # just the checkout, are proven). Same script locally on the pulled zip.
  mkdir -p "$LOCAL_OUT"
  cat >"$LOCAL_ASSERT" <<'ASSERT'
#!/usr/bin/env node
/*
 * Member payload assert — shipped to the build host by scripts/release/build-remote.sh and
 * re-run on the workstation against the pulled .app.
 *
 *   node member-payload-assert.cjs <root> <member> [--profile <relpath-under-root>]
 *
 * <root> is a vclaw checkout (pre-packaging) or an app's Contents/Resources (post-package).
 * Exit 0 only when the payload carries real member content (something other than README.md),
 * a payload BUILD.json with a release id, and dist/; with --profile, the staged profile must
 * stamp that same release id (one artefact must not carry two release ids).
 */
'use strict'
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const argv = process.argv.slice(2)
let profileRel = ''
const positional = []
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--profile') {
    profileRel = argv[i + 1] || ''
    i += 1
  } else {
    positional.push(argv[i])
  }
}
const [root, member] = positional
if (!root || !member) {
  console.error('member-payload-assert: usage: <root> <member> [--profile <relpath>]')
  process.exit(2)
}

const IGNORED = new Set(['README.md', '.DS_Store'])

function walk(dir) {
  const files = []
  let bytes = 0
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(abs)
      else if (entry.isFile()) {
        files.push(path.relative(dir, abs).split(path.sep).join('/'))
        bytes += fs.statSync(abs).size
      }
    }
  }
  files.sort()
  return { files, bytes }
}

function treeDigest(dir, files) {
  const hash = crypto.createHash('sha256')
  for (const file of files) {
    hash.update(`${file}\0`)
    hash.update(fs.readFileSync(path.join(dir, file)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

const candidates = [
  { carrier: 'v2', rel: 'product/payload' },
  { carrier: 'v1', rel: `vendor/${member}` },
]
const found = []
for (const candidate of candidates) {
  const abs = path.join(root, candidate.rel)
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue
  const { files, bytes } = walk(abs)
  const content = files.filter((file) => !IGNORED.has(path.posix.basename(file)))
  const reasons = []
  if (content.length === 0) reasons.push('nothing but README.md — this is the placeholder payload the generic tree ships')
  if (!files.includes('BUILD.json')) reasons.push('no payload BUILD.json — the member provenance was never emitted into it')
  if (!fs.existsSync(path.join(abs, 'dist'))) reasons.push('no dist/ — the member bundle ran without --with-dist')
  let info = null
  if (files.includes('BUILD.json')) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(abs, 'BUILD.json'), 'utf8'))
      if (typeof parsed.release !== 'string' || parsed.release.trim() === '') reasons.push('BUILD.json carries no release id')
      else info = parsed
    } catch (error) {
      reasons.push(`BUILD.json is not JSON (${error instanceof Error ? error.message : String(error)})`)
    }
  }
  found.push({ ...candidate, abs, files, bytes, content, info, reasons })
}

if (found.length === 0) {
  console.error(`member-payload-assert: NEITHER product/payload (v2) nor vendor/${member} (v1) exists under ${root}`)
  process.exit(1)
}
const usable = found.filter((entry) => entry.reasons.length === 0)
if (usable.length === 0) {
  for (const entry of found) {
    console.error(`member-payload-assert: ${entry.rel} (${entry.carrier}) REFUSED — ${entry.reasons.join('; ')}`)
  }
  console.error('member-payload-assert: refusing to package a member build without a real payload')
  process.exit(1)
}
const pick = usable.find((entry) => entry.carrier === 'v2') || usable[0]
const sha256 = treeDigest(pick.abs, pick.files)
const distIndex = fs.existsSync(path.join(pick.abs, 'dist', 'index.html'))

let profileNote = ''
if (profileRel) {
  const profilePath = path.join(root, profileRel)
  if (!fs.existsSync(profilePath)) {
    console.error(`member-payload-assert: ${profileRel} does not exist under ${root} — the staged profile is missing`)
    process.exit(1)
  }
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
  if (profile.defaultProject) {
    const staged = profile.defaultProject.version
    if (staged !== pick.info.release) {
      console.error(
        `member-payload-assert: ${profileRel} defaultProject.version is '${staged}', the payload release is '${pick.info.release}' — one artefact would carry two release ids`,
      )
      process.exit(1)
    }
    profileNote = `, ${profileRel} defaultProject.version=${staged}`
  }
}

const mib = (pick.bytes / 1048576).toFixed(1)
console.log(
  `layout ${pick.rel} (${pick.carrier}) — ${pick.files.length} files (${pick.content.length} payload), ${mib} MiB, ` +
    `dist/index.html=${distIndex ? 'yes' : 'no'}, payload BUILD.json release=${pick.info.release}${profileNote}`,
)
// Machine-readable record: one line of space-separated key=value pairs (no spaces in any
// value), so the bash driver parses it with sed and needs no JSON tool.
console.log(
  `PAYLOAD_ASSERT layout=${pick.rel} carrier=${pick.carrier} release=${pick.info.release} ` +
    `files=${pick.files.length} bytes=${pick.bytes} sha256=${sha256}`,
)
ASSERT
  transfer_up "$LOCAL_ASSERT" "$REMOTE_ROOT/member-payload-assert.cjs"
  ASSERT_SUM="$(shasum -a 256 "$LOCAL_ASSERT" | cut -d' ' -f1)"
  [ "$ASSERT_SUM" = "$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_ROOT/member-payload-assert.cjs\" | cut -d' ' -f1")" ] ||
    die "the payload assert script did not transfer intact"

  # contract-v2 LOCAL integration (--member-integrate v2): payload + rendered profile, and
  # nothing else. Opt-in, and the artefact name says so (`-v2local`).
  LOCAL_INTEGRATE=""
  if [ "$MEMBER_INTEGRATE" = v2 ]; then
    LOCAL_INTEGRATE="$LOCAL_OUT/.member-integrate-v2.cjs"
    cat >"$LOCAL_INTEGRATE" <<'INTEGRATE'
#!/usr/bin/env node
/*
 * Contract-v2 LOCAL member integration (--member-integrate v2).
 *
 *   node member-integrate-v2.cjs <vclaw-checkout> <member> <payload-base>
 *
 * Copies the bundled member payload to <vclaw>/product/payload and renders
 * <vclaw>/product/profile.active.json from the payload BUILD.json release. Nothing else:
 * no source rewrite, no anchor patch, no package.json mutation. `docs/MEMBER_BUILD.md`
 * step 4 records that contract v2 retired those edits; the member repo's integrator still
 * patches them, which is exactly why this mode exists and is labelled in the artefact name.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')

function fail(message) {
  console.error(`member-integrate-v2: ${message}`)
  process.exit(1)
}

function measure(dir) {
  let files = 0
  let bytes = 0
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(abs)
      else if (entry.isFile()) {
        files += 1
        bytes += fs.statSync(abs).size
      }
    }
  }
  return { files, bytes }
}

const [vclawRoot, member, payloadBase] = process.argv.slice(2)
if (!vclawRoot || !member || !payloadBase) {
  console.error('member-integrate-v2: usage: <vclaw-checkout> <member> <payload-base>')
  process.exit(2)
}
const checkout = path.resolve(vclawRoot)
const base = path.resolve(payloadBase)
if (!fs.existsSync(path.join(checkout, 'package.json'))) fail(`not a vclaw checkout (no package.json): ${checkout}`)
if (!fs.existsSync(base)) fail(`payload base does not exist: ${base} (run bundle-vizmaster.mjs --with-dist first)`)

const bundled = fs
  .readdirSync(base, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(base, entry.name, 'package.json')))
if (bundled.length !== 1) {
  fail(`expected exactly one bundled payload under ${base}, found ${bundled.map((entry) => entry.name).join(', ') || 'none'}`)
}
const payloadDir = path.join(base, bundled[0].name)
const buildInfoPath = path.join(payloadDir, 'BUILD.json')
if (!fs.existsSync(buildInfoPath)) fail(`no payload BUILD.json at ${buildInfoPath} — provenance is emitted before the bundle, never after`)
if (!fs.existsSync(path.join(payloadDir, 'dist'))) fail(`no dist/ in ${payloadDir} — the bundle ran without --with-dist`)
const release = (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'))
    return typeof parsed.release === 'string' ? parsed.release.trim() : ''
  } catch (error) {
    fail(`${buildInfoPath} is not JSON (${error instanceof Error ? error.message : String(error)})`)
  }
})()
if (release === '') fail(`${buildInfoPath} carries no release id — refusing to stage a placeholder profile`)

const profilePath = path.join(checkout, 'product', `${member}.json`)
if (!fs.existsSync(profilePath)) fail(`no profile at ${profilePath} — the build packages the COMMITTED profile`)
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
if (profile.id !== member) fail(`${profilePath} has id '${profile.id}', expected '${member}'`)
if (!profile.defaultProject) fail(`${profilePath} has no defaultProject — a member profile seeds from product/payload`)
if (profile.defaultProject.from !== 'product/payload') {
  fail(`${profilePath} seeds from '${profile.defaultProject.from}'; contract v2 ships the payload at product/payload`)
}

const target = path.join(checkout, 'product', 'payload')
fs.rmSync(target, { recursive: true, force: true })
fs.mkdirSync(target, { recursive: true })
fs.cpSync(payloadDir, target, { recursive: true })

const staged = { ...profile, defaultProject: { ...profile.defaultProject, version: release } }
const stagedPath = path.join(checkout, 'product', 'profile.active.json')
fs.writeFileSync(stagedPath, `${JSON.stringify(staged, null, 2)}\n`)

const summary = measure(target)
console.log(`member-integrate-v2: payload -> ${target} (${summary.files} files, ${summary.bytes} bytes)`)
console.log(`member-integrate-v2: profile -> ${stagedPath} (defaultProject.version=${release})`)
console.log(`MEMBER_INTEGRATE_V2 release=${release} files=${summary.files} bytes=${summary.bytes} payload=${bundled[0].name}`)
INTEGRATE
    transfer_up "$LOCAL_INTEGRATE" "$REMOTE_ROOT/member-integrate-v2.cjs"
    [ "$(shasum -a 256 "$LOCAL_INTEGRATE" | cut -d' ' -f1)" = "$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_ROOT/member-integrate-v2.cjs\" | cut -d' ' -f1")" ] ||
      die "the v2 integrate helper did not transfer intact"
  fi

  if [ "$MEMBER_INTEGRATE" = v2 ]; then
    INTEGRATE_STEPS="# contract-v2 LOCAL integration (--member-integrate v2): payload + rendered profile
# ONLY. No source rewrites, no anchor patching, no package.json mutation, and the member
# repo's own integrator is deliberately NOT run (it still patches the anchors contract v2
# retired — docs/MEMBER_BUILD.md step 4).
node \"\$HOME/$REMOTE_ROOT/member-integrate-v2.cjs\" \"\$HOME/$REMOTE_REPO\" $MEMBER release/out/payload"
  else
    INTEGRATE_STEPS="# v2 carrier: payload -> product/payload (the static extraResources row), pipeline
# render of product/profile.active.json, defaultProject.ts + vizshare into electron/main.
node scripts/integrate-vcclaw.mjs --vclaw \"\$HOME/$REMOTE_REPO\" --carrier v2
# Read back what integrate wrote, touching nothing — before spending the package.
node scripts/integrate-vcclaw.mjs --vclaw \"\$HOME/$REMOTE_REPO\" --carrier v2 --check"
  fi
  step "member payload on $HOST: provenance -> bundle -> integrate ($MEMBER_INTEGRATE)"
  MEMBER_BODY="$(mktemp "${TMPDIR:-/tmp}/vclaw-member-body.XXXXXX")"
  MEMBER_LOG="$LOCAL_OUT/member.log"
  cat >"$MEMBER_BODY" <<EOF
export PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin"
export ELECTRON_MIRROR="$MIRROR"
cd "\$HOME/$REMOTE_MEMBER"
node -v; npm -v
npm ci --no-audit --no-fund
rm -rf release/out
# Workspace dependencies first: the dashboard imports @vizmaster/schema, whose exports point
# at dist/ — without this the dashboard build dies on "'Cannot find module' @vizmaster/schema"
# (measured on the first member run, rc=1). --if-present keeps the hook optional for a member
# that does not declare one.
npm run schema:build --if-present
# Provenance BEFORE integrate: integrate deliberately dirties the vclaw checkout, and
# build-info reads that checkout's tracked state (vclawDirty). Emitting afterwards would
# stamp vclawDirty: true on an otherwise clean build and fail the mounted-dmg assert.
VCLAW_SRC="\$HOME/$REMOTE_REPO" node scripts/build-info.mjs --out release/out
# Payload = tracked dashboard/ + dashboard/dist + the BUILD.json above (fail-closed on a
# missing provenance). --with-dist is what makes the packaged payload usable.
node scripts/bundle-vizmaster.mjs --with-dist
$INTEGRATE_STEPS
EOF
  ssh_stream "$MEMBER_BODY" "$MEMBER_LOG"
  rm -f "$MEMBER_BODY"
  [ "$STREAM_RC" = "0" ] ||
    die "preparing the member payload failed (remote rc=$STREAM_RC, log: $MEMBER_LOG)
       rc=255 means the run produced no in-band status marker at all (transport/log), not
       a build failure; anything else is the remote bash status.
       If the log ends in 'anchor not found — VClaw fork drifted', the member repo's
       integrator targets a vclaw tree older than this commit (contract v2 retired three of
       its behavioural edits: docs/MEMBER_BUILD.md step 4, docs/BUILD_REMOTE.md §member builds).
       That is a cross-repo pin, not a driver fault: nothing was packaged."
  printf '    rc=0 (log: %s)\n' "$MEMBER_LOG"

  step "pre-packaging payload assert"
  ASSERT_OUT="$(ssh_run "cd \"\$HOME/$REMOTE_REPO\" && node \"\$HOME/$REMOTE_ROOT/member-payload-assert.cjs\" . $MEMBER --profile product/profile.active.json")" ||
    die "the member payload is not packagable — see the refused layout above.
       Nothing was packaged: a member artefact without a real payload is not a member artefact."
  printf '%s\n' "$ASSERT_OUT" | grep -v '^PAYLOAD_ASSERT ' | sed 's/^/    /'
  PAYLOAD_LINE="$(printf '%s\n' "$ASSERT_OUT" | sed -n 's/^PAYLOAD_ASSERT //p' | tail -1)"
  [ -n "$PAYLOAD_LINE" ] || die "the payload assert printed no machine-readable line: $(printf '%s' "$ASSERT_OUT")"
  PAYLOAD_RELEASE="$(payload_field "$PAYLOAD_LINE" release)"
  printf '    payload release %s\n' "$PAYLOAD_RELEASE"
fi

# --- 3. sync the OMP release set --------------------------------------------
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

# --- 4. build + verify + collect, per arch ----------------------------------
# A v2-local member artefact carries the mode in its own file name: nobody should later
# mistake it for one built by the member repo's pipeline.
ART_SUFFIX=""
INTEGRATE_MODE="integrator"
if [ -n "$MEMBER" ] && [ "$MEMBER_INTEGRATE" = v2 ]; then
  ART_SUFFIX="-v2local"
  INTEGRATE_MODE="v2-local"
fi
for arch in "${ARCHES[@]}"; do
  sync_file "$VENDOR_RELEASE/omp-darwin-$arch" "$REMOTE_VENDORS/omp-darwin-$arch"

  step "npm ci + electron-vite build + electron-builder --mac --$arch dmg zip (on $HOST)"
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
  # SINGLE quotes in the generated body: electron-builder must receive ${version}/${ext}
  # literally, so the remote shell must not expand them (double quotes there made bash read
  # \${version} as an unbound variable — measured on the first v2 run).
  ARTIFACT_ARGS=""
  [ -z "$ART_SUFFIX" ] ||
    ARTIFACT_ARGS="--config.mac.artifactName='$APP_NAME-\${version}-\${arch}$ART_SUFFIX.\${ext}'"
  OUT_DIR="$(out_dir_for "$arch")"
  if [ -n "$MEMBER" ]; then
    # The v2 integrator already rendered product/profile.active.json with the payload's
    # release id; packaging THAT is what keeps one release id per artefact. Copying the
    # checked-in profile here (the generic behaviour) would overwrite it with the
    # 0.0.0+unrendered placeholder.
    STAGE_PROFILE="# integrate-vcclaw.mjs (v2) already rendered product/profile.active.json from the
# payload BUILD.json release — package it as-is, never the checked-in placeholder.
test -f product/profile.active.json || { echo 'integrate did not render product/profile.active.json' >&2; exit 1; }
trap 'rm -f product/profile.active.json' EXIT"
  else
    STAGE_PROFILE="# electron-builder copies product/profile.active.json to resources/product.json;
# package.mjs stages it from the chosen profile, so stage it here too and remove it
# afterwards (the checkout must stay at the commit).
cp \"$PROFILE\" product/profile.active.json
trap 'rm -f product/profile.active.json' EXIT"
  fi
  cat >"$BUILD_BODY" <<EOF
export PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin"
export ELECTRON_MIRROR="$MIRROR"
cd "\$HOME/$REMOTE_REPO"
node -v; npm -v
npm ci --no-audit --no-fund
npm run build:bundle
test -f out/main/index.js || { echo 'electron-vite produced no out/main/index.js' >&2; exit 1; }
$STAGE_PROFILE
rm -rf "${OUT_DIR:?}"
# Artifacts are written to the project output dir (release/<product>-<version>-<arch>.<ext>),
# not into the per-arch app dir; a stale one from an earlier run must not be collectable.
rm -f release/*-$arch.dmg release/*-$arch.zip release/*-$arch.dmg.blockmap release/*-$arch.zip.blockmap
./node_modules/.bin/electron-builder --mac dmg zip --$arch --publish never \\
  --config.mac.identity=null --config.mac.notarize=false $IDENTITY_ARGS $ARTIFACT_ARGS $EXTRA
EOF
  ssh_stream "$BUILD_BODY" "$LOG"
  rm -f "$BUILD_BODY"
  [ "$STREAM_RC" = "0" ] ||
    die "build of $arch failed (remote rc=$STREAM_RC, log: $LOG)
       rc=255 means the run produced no in-band status marker at all — the transport or
       the log file failed, not the build; anything else is the remote bash status."
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
  APP_VERSION="$(ssh_run "plutil -extract CFBundleShortVersionString raw \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Info.plist\"")"
  [ -n "$APP_VERSION" ] || die "cannot read CFBundleShortVersionString from $APP_PATH — electron-builder names its artefacts <product>-<version>-<arch>.<ext>"
  tailscale ssh "$HOST" -- "cat \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Resources/product.json\"" >"$LOCAL_OUT/$arch/product.json"
  PRODUCT_ID="$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$LOCAL_OUT/$arch/product.json" | head -1)"
  ELECTRON_VERSION="$(grep -o 'electron=[0-9][0-9.]*' "$LOG" | tail -1 | cut -d= -f2)"

  # The payload that matters is the one inside the .app: prove the packaged bytes are the
  # payload asserted before packaging (same digest), not just that the checkout had one.
  PAYLOAD_LAYOUT=""
  PAYLOAD_SHA256=""
  PAYLOAD_FILES=""
  PAYLOAD_BYTES=""
  PAYLOAD_CARRIER=""
  PAYLOAD_RELEASE_APP=""
  if [ -n "$MEMBER" ]; then
    APP_ASSERT="$(ssh_run "node \"\$HOME/$REMOTE_ROOT/member-payload-assert.cjs\" \"\$HOME/$REMOTE_REPO/$APP_REL/Contents/Resources\" $MEMBER --profile product.json")" ||
      die "the packaged app at $APP_PATH carries no valid $MEMBER payload (assert failed above).
       The pre-packaging assert passed, so the packaging step dropped or replaced it."
    printf '%s\n' "$APP_ASSERT" | grep -v '^PAYLOAD_ASSERT ' | sed 's/^/    /'
    APP_PAYLOAD_LINE="$(printf '%s\n' "$APP_ASSERT" | sed -n 's/^PAYLOAD_ASSERT //p' | tail -1)"
    [ -n "$APP_PAYLOAD_LINE" ] || die "the packaged-app assert printed no machine-readable line"
    PAYLOAD_LAYOUT="$(payload_field "$APP_PAYLOAD_LINE" layout)"
    PAYLOAD_CARRIER="$(payload_field "$APP_PAYLOAD_LINE" carrier)"
    PAYLOAD_SHA256="$(payload_field "$APP_PAYLOAD_LINE" sha256)"
    PAYLOAD_FILES="$(payload_field "$APP_PAYLOAD_LINE" files)"
    PAYLOAD_BYTES="$(payload_field "$APP_PAYLOAD_LINE" bytes)"
    PAYLOAD_RELEASE_APP="$(payload_field "$APP_PAYLOAD_LINE" release)"
    [ "$PAYLOAD_SHA256" = "$(payload_field "$PAYLOAD_LINE" sha256)" ] ||
      die "the payload inside the app hashes to $PAYLOAD_SHA256, the payload asserted before
       packaging hashed to $(payload_field "$PAYLOAD_LINE" sha256) — the artefact is not the
       payload this build proved"
    printf '    payload %s (%s) in the app: %s files, %s bytes, sha256 %s\n' \
      "$PAYLOAD_LAYOUT" "$PAYLOAD_CARRIER" "$PAYLOAD_FILES" "$PAYLOAD_BYTES" "$PAYLOAD_SHA256"
  fi

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
  # electron-builder names both artefacts from mac.artifactName
  # (${productName}-${version}-${arch}.${ext}) and writes them to the project output
  # dir `release/`, one level above the per-arch app dir. The version comes from the
  # packaged Info.plist, so a profile/version change cannot silently pick up a stale file.
  step "collect the $arch dmg + app zip"
  ZIP="$APP_NAME-$APP_VERSION-$arch$ART_SUFFIX.zip"
  DMG="$APP_NAME-$APP_VERSION-$arch$ART_SUFFIX.dmg"
  ART_DIR="release"
  for f in "$ZIP" "$DMG"; do
    ssh_run "test -f \"\$HOME/$REMOTE_REPO/$ART_DIR/$f\"" >/dev/null 2>&1 ||
      die "electron-builder produced no $ART_DIR/$f on $HOST — see $LOG"
  done
  ZIP_SUM_REMOTE="$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_REPO/$ART_DIR/$ZIP\" | cut -d' ' -f1")"
  DMG_SUM_REMOTE="$(ssh_run "shasum -a 256 \"\$HOME/$REMOTE_REPO/$ART_DIR/$DMG\" | cut -d' ' -f1")"
  DMG_VERIFY_OUT="$(ssh_run "hdiutil verify \"\$HOME/$REMOTE_REPO/$ART_DIR/$DMG\" 2>&1 | tail -2 | tr '\n' ' '")"
  case "$DMG_VERIFY_OUT" in
    *VALID*) DMG_VERIFY_REMOTE=VALID ;;
    *) DMG_VERIFY_REMOTE=INVALID ;;
  esac
  [ "$DMG_VERIFY_REMOTE" = VALID ] ||
    die "hdiutil verify of $DMG on $HOST did not report VALID: ${DMG_VERIFY_OUT:-<no output>}"
  printf '    hdiutil verify (host)  %s\n' "$DMG_VERIFY_OUT"

  for f in "$ZIP" "$DMG"; do
    printf '    pulling %s\n' "$f"
    pull_down "$REMOTE_REPO/$ART_DIR/$f" "$LOCAL_OUT/$arch/$f"
  done
  LOCAL_SUM="$(shasum -a 256 "$LOCAL_OUT/$arch/$ZIP" | cut -d' ' -f1)"
  [ "$LOCAL_SUM" = "$ZIP_SUM_REMOTE" ] || die "$ZIP: transfer digest mismatch (local ${LOCAL_SUM:0:12} remote ${ZIP_SUM_REMOTE:0:12})"
  LOCAL_DMG_SUM="$(shasum -a 256 "$LOCAL_OUT/$arch/$DMG" | cut -d' ' -f1)"
  [ "$LOCAL_DMG_SUM" = "$DMG_SUM_REMOTE" ] || die "$DMG: transfer digest mismatch (local ${LOCAL_DMG_SUM:0:12} remote ${DMG_SUM_REMOTE:0:12})"
  # The pulled dmg is the file a user mounts, so it is verified here too — not only on
  # the host whose sha256 we just compared. A stream that preserved the digest but
  # produced a structurally broken image cannot happen, but this is the cheap proof.
  DMG_VERIFY_LOCAL_OUT="$(hdiutil verify "$LOCAL_OUT/$arch/$DMG" 2>&1 | tail -2 | tr '\n' ' ')"
  case "$DMG_VERIFY_LOCAL_OUT" in
    *VALID*) ;;
    *) die "hdiutil verify of the pulled $DMG failed: ${DMG_VERIFY_LOCAL_OUT:-<no output>}" ;;
  esac
  printf '    hdiutil verify (local) %s\n' "$DMG_VERIFY_LOCAL_OUT"
  printf '    %s\n    sha256 %s\n' "$LOCAL_OUT/$arch/$ZIP" "$LOCAL_SUM"
  printf '    %s\n    sha256 %s\n' "$LOCAL_OUT/$arch/$DMG" "$LOCAL_DMG_SUM"

  # Machine-readable provenance for pinning: the commit the artefact was built from
  # and the digests a release manifest can carry. No jq, no extra deps.
  #
  # The clean-state verdict is EXPLICIT: `dirty: false` plus `source.worktree` — a
  # consumer that reads an absent `dirty` as "true" (a real intake did) would otherwise
  # refuse a build that was cut from a bundle and never saw a working-tree edit.
  if [ -n "$MEMBER" ]; then
    [ -n "$PAYLOAD_SHA256" ] && [ -n "$PAYLOAD_LAYOUT" ] ||
      die "member payload digest missing — refusing to write provenance without it"
    MEMBER_BLOCK=",
  \"build\": \"member\",
  \"member\": {
    \"id\": \"$MEMBER\",
    \"repo\": \"$MEMBER_REMOTE_URL\",
    \"sha\": \"$MEMBER_SHA\",
    \"payload_sha256\": \"$PAYLOAD_SHA256\",
    \"layout\": \"$PAYLOAD_LAYOUT\",
    \"carrier\": \"$PAYLOAD_CARRIER\",
    \"integrate\": \"$INTEGRATE_MODE\",
    \"release\": \"$PAYLOAD_RELEASE_APP\",
    \"files\": $PAYLOAD_FILES,
    \"bytes\": $PAYLOAD_BYTES,
    \"bundle\": \"git bundle at $MEMBER_SHA\"
  }"
  else
    MEMBER_BLOCK=",
  \"build\": \"generic\""
  fi
  cat >"$LOCAL_OUT/$arch/BUILD.json" <<EOF
{
  "schema": 1,
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "$HOST",
  "dirty": false,
  "source": {
    "repo": "vclaw-desktop",
    "remote": "$REMOTE_URL",
    "branch": "$BRANCH",
    "commit": "$COMMIT",
    "worktree": {
      "clean": true,
      "from": "git bundle at $COMMIT"
    }
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
  "dmg": {
    "file": "$DMG",
    "bytes": $(stat -f '%z' "$LOCAL_OUT/$arch/$DMG"),
    "sha256": "$LOCAL_DMG_SUM",
    "hdiutilVerify": "$DMG_VERIFY_REMOTE"
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
  "signing": null$MEMBER_BLOCK
}
EOF
  printf '    provenance %s\n' "$LOCAL_OUT/$arch/BUILD.json"
done

# --- 5. prove the pulled artefacts ------------------------------------------
step "verify collected artefacts locally"
for arch in "${ARCHES[@]}"; do
  ZIP="$LOCAL_OUT/$arch/$APP_NAME-$APP_VERSION-$arch$ART_SUFFIX.zip"
  DMG="$LOCAL_OUT/$arch/$APP_NAME-$APP_VERSION-$arch$ART_SUFFIX.dmg"
  [ -f "$ZIP" ] || die "no pulled app zip at $ZIP"
  [ -f "$DMG" ] || die "no pulled dmg at $DMG"
  hdiutil verify "$DMG" >/dev/null 2>&1 || die "hdiutil verify failed for the pulled $DMG"
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
  printf '    %s: exe %s, omp %s (%s…), dmg hdiutil verify VALID\n' \
    "$arch" "$(lipo -archs "$EXE")" "$(lipo -archs "$OMP")" "${OMP_SUM:0:12}"
  # The pulled zip is what a member's intake unpacks: prove ITS payload, and that it is
  # the payload the builder asserted (same digest), from bytes that crossed the wire.
  if [ -n "$MEMBER" ]; then
    RES="$LOCAL_OUT/$arch/unpacked/$APP_NAME.app/Contents/Resources"
    LOCAL_ASSERT_OUT="$(node "$LOCAL_ASSERT" "$RES" "$MEMBER" --profile product.json)" ||
      die "the payload inside the pulled $arch zip failed the assert — do not publish it"
    printf '%s\n' "$LOCAL_ASSERT_OUT" | grep -v '^PAYLOAD_ASSERT ' | sed 's/^/    /'
    LOCAL_PAYLOAD_LINE="$(printf '%s\n' "$LOCAL_ASSERT_OUT" | sed -n 's/^PAYLOAD_ASSERT //p' | tail -1)"
    LOCAL_PAYLOAD_SUM="$(payload_field "$LOCAL_PAYLOAD_LINE" sha256)"
    BUILT_PAYLOAD_SUM="$(sed -n 's/.*"payload_sha256"[[:space:]]*:[[:space:]]*"\([0-9a-f]*\)".*/\1/p' "$LOCAL_OUT/$arch/BUILD.json" | head -1)"
    [ -n "$BUILT_PAYLOAD_SUM" ] || die "$LOCAL_OUT/$arch/BUILD.json records no member.payload_sha256"
    [ "$LOCAL_PAYLOAD_SUM" = "$BUILT_PAYLOAD_SUM" ] ||
      die "payload digest mismatch: pulled zip ${LOCAL_PAYLOAD_SUM:0:12}…, BUILD.json ${BUILT_PAYLOAD_SUM:0:12}…"
    printf '    %s: payload %s sha256 %s (matches BUILD.json)\n' \
      "$arch" "$(payload_field "$LOCAL_PAYLOAD_LINE" layout)" "$LOCAL_PAYLOAD_SUM"
  fi
done

[ -z "$MEMBER" ] || rm -f "$LOCAL_ASSERT"
[ -z "${LOCAL_INTEGRATE:-}" ] || rm -f "$LOCAL_INTEGRATE"

step "done"
printf '    artefacts + logs under %s\n' "$LOCAL_OUT"
