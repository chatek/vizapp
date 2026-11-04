#!/usr/bin/env bash
# Publish a remote-built VClaw desktop app to a Forgejo release on chatek/vclaw-app.
#
#   bash scripts/release/release-forgejo.sh --arm64 --dry-run
#   bash scripts/release/release-forgejo.sh --arm64 --x64
#   bash scripts/release/release-forgejo.sh --arm64 --tag v1.1.17 --publish
#
# Compilation happens ONLY on the remote build host (scripts/release/build-remote.sh,
# docs/BUILD_REMOTE.md). This script is the workstation half: the host's tailnet does
# not contain the Forgejo box, so the workstation pulls the artefact and publishes it.
#
# Steps — every one aborts loudly, and nothing is tagged before step 6:
#
#   1. preflight  clean worktree (tracked files), HEAD == the origin tip of the branch,
#                 `build-remote.sh --check` for the requested arches, a readable token,
#                 and a reachable repo whose Releases unit is enabled
#   2. build      build-remote.sh for the requested arches
#   3. provenance commit, bytes, zip sha256 and omp digest re-read from
#                 release-remote/<arch>/BUILD.json — never re-derived here — and every
#                 arch must agree on the commit and on the omp release
#   4. signing    probed on the host: identity count + the packaged app's authority
#   5. stage      app zip, BUILD-<arch>.json, merged SHA256SUMS.txt, tuple.json
#   6. tag        annotated tag at HEAD (default v<package.json version>+<short sha>),
#                 refused if it exists anywhere at a different commit, pushed to
#                 `origin` AND `github` explicitly (this submodule has no fan-out),
#                 never forced
#   7. release    POST /api/v1/repos/chatek/vclaw-app/releases; draft unless --publish
#   8. upload     each staged asset, size-checked against the server's reply
#   9. verify     re-fetch the release: served size == local size for every asset, and
#                 SHA256SUMS.txt re-downloaded and compared byte for byte
#
# Unsigned is unmistakable: the zip asset names carry `-unsigned` and the body states
# `unsigned=yes` unless the host has a Developer ID identity AND the packaged app
# carries that authority (build-remote.sh passes --config.mac.identity=null, so every
# artefact built today is unsigned). `--dry-run` does steps 1-5 and then prints the
# exact tag commands, the release JSON payload and every upload call it would make.
#
# Env (all optional):
#   FORGEJO_REPO        owner/repo (default chatek/vclaw-app)
#   FORGEJO_URL         instance base incl. sub-path; default derived from `origin`
#   FORGEJO_TOKEN       API token; otherwise read from FORGEJO_TOKEN_FILE
#   FORGEJO_TOKEN_FILE  default <repo>/../.prime/forgejo-token
#   LOCAL_OUT           collect dir, exported to the build driver
#                       (default <repo>/release-remote)
#   API_TIMEOUT         per-request curl timeout in seconds (default 1800)
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DRIVER="$SCRIPT_DIR/build-remote.sh"
LOCAL_OUT="${LOCAL_OUT:-$REPO_ROOT/release-remote}"
export LOCAL_OUT
FORGEJO_REPO="${FORGEJO_REPO:-chatek/vclaw-app}"
TOKEN_FILE="${FORGEJO_TOKEN_FILE:-$REPO_ROOT/../.prime/forgejo-token}"
API_TIMEOUT="${API_TIMEOUT:-1800}"
NODE_VERSION="$(tr -d '[:space:]' <"$REPO_ROOT/.nvmrc")"

usage() {
  awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "${BASH_SOURCE[0]}"
  exit "${1:-0}"
}

die() { printf 'release-forgejo: FATAL: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*" >&2; }
say() { printf '    %s\n' "$*" >&2; }
warn() { printf '    WARNING %s\n' "$*" >&2; }

CURL_CFG=""
API_BODY=""
API_CODE_FILE=""
cleanup() {
  [ -z "$CURL_CFG" ] || rm -f "$CURL_CFG"
  [ -z "$API_BODY" ] || rm -f "$API_BODY"
  [ -z "$API_CODE_FILE" ] || rm -f "$API_CODE_FILE"
}
# bash 3.2 also runs the ERR trap inside a command-substitution subshell, where the
# caller handles the status on purpose (`A="$(cmd)" || …`); report only from the shell
# that owns the script, so a handled failure never prints a "FAILED" line.
trap 'RC=$?; [ "${BASH_SUBSHELL:-0}" -eq 0 ] || exit "$RC"
printf "release-forgejo: FAILED at line %s (rc=%s): %s\n" "$LINENO" "$RC" "$BASH_COMMAND" >&2
exit "$RC"' ERR
trap cleanup EXIT

# --- arguments ---------------------------------------------------------------
ARCH_ARGS=()
TAG=""
DRAFT=1
DRY_RUN=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --arm64 | --x64)
      ARCH_ARGS+=("$1")
      shift
      ;;
    --tag)
      [ "$#" -ge 2 ] || die "--tag needs a value"
      TAG="$2"
      shift 2
      ;;
    --draft)
      DRAFT=1
      shift
      ;;
    --publish)
      DRAFT=0
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --help | -h) usage 0 ;;
    *) die "unknown argument: $1 (see --help)" ;;
  esac
done
if [ "${#ARCH_ARGS[@]}" -eq 0 ]; then
  ARCH_ARGS=(--arm64 --x64) # a release carries both arches; --arm64 alone is the quick lane
fi
ARCHES=()
for a in "${ARCH_ARGS[@]}"; do ARCHES+=("${a#--}"); done

# --- helpers -----------------------------------------------------------------
json_get() { # json_get <file|-> <dotted.path> — one leaf as text
  python3 -c '
import json, sys
node = json.load(sys.stdin if sys.argv[1] == "-" else open(sys.argv[1]))
for key in sys.argv[2].split("."):
    node = node[int(key)] if key.isdigit() else node[key]
if node is None:
    print("")
elif node is True:
    print("true")
elif node is False:
    print("false")
else:
    print(node)
' "$1" "$2"
}

urlenc() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

# The token goes into a 0600 curl config, never on curl's argv (which any `ps` can read).
curl_config() {
  local tok="$1" f
  case "$tok" in
    *'"'* | *\\* | *$'\n'*) die "the Forgejo token contains a quote, backslash or newline — refusing to write a curl config" ;;
  esac
  f="$(mktemp "${TMPDIR:-/tmp}/vclaw-forgejo-curl.XXXXXX")"
  chmod 600 "$f"
  printf 'header = "Authorization: token %s"\nsilent\nshow-error\n' "$tok" >"$f"
  printf '%s' "$f"
}

# api <method> <url> [curl args…] — body on stdout, HTTP status in API_CODE_FILE.
# Both channels go through files because callers invoke `api` in a command
# substitution: a parent-shell variable set inside it would never come back.
api() {
  local method="$1" url="$2" code
  shift 2
  code="$(curl -K "$CURL_CFG" --connect-timeout 15 --max-time "$API_TIMEOUT" \
    -X "$method" "$@" -o "$API_BODY" -w '%{http_code}' "$url")" || {
    printf '000' >"$API_CODE_FILE"
    return 1
  }
  printf '%s' "$code" >"$API_CODE_FILE"
  cat "$API_BODY"
}

api_status() { cat "$API_CODE_FILE"; }

# The commit a tag points at on a remote — peeled for annotated tags; empty if absent.
remote_tag_commit() {
  local remote="$1" tag="$2" out
  out="$(git -C "$REPO_ROOT" ls-remote --tags "$remote" "refs/tags/$tag" "refs/tags/$tag^{}" 2>/dev/null)" || return 1
  printf '%s\n' "$out" | awk '
    $2 ~ /\^\{\}$/ { peeled = $1; next }
    !plain { plain = $1 }
    END { print (peeled != "" ? peeled : plain) }'
}

stage_file() { # hardlink when the volume allows, copy otherwise
  ln -f "$1" "$2" 2>/dev/null || cp -p "$1" "$2"
}

# Published name for the arch's app zip: the unsigned suffix is part of the contract.
pub_zip() {
  local arch="$1" file
  file="$(json_get "$LOCAL_OUT/$arch/BUILD.json" artifact.file)"
  case "$file" in
    *.zip) ;;
    *) die "$LOCAL_OUT/$arch/BUILD.json artifact.file is '$file', expected *.zip" ;;
  esac
  if [ "$UNSIGNED" -eq 1 ]; then printf '%s-unsigned.zip' "${file%.zip}"; else printf '%s' "$file"; fi
}

# --- 0. resolve the release identity -----------------------------------------
BRANCH="$(git -C "$REPO_ROOT" symbolic-ref --short -q HEAD)" ||
  die "detached HEAD in $REPO_ROOT — check out the branch you intend to release"
COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
SHORT="$(git -C "$REPO_ROOT" rev-parse --short=7 HEAD)"
COMMITTED_AT="$(git -C "$REPO_ROOT" show -s --format=%cI HEAD)"
VERSION="$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$REPO_ROOT/package.json" | head -1)"
[ -n "$VERSION" ] || die "cannot read the version from $REPO_ROOT/package.json"
if [ -z "$TAG" ]; then
  TAG="v$VERSION+$SHORT"
fi
case "$TAG" in
  '' | . | ..) die "tag '$TAG' is not a usable name" ;;
  -*) die "tag '$TAG' starts with a dash" ;;
  *[!A-Za-z0-9._+-]*) die "tag '$TAG' must match [A-Za-z0-9._+-] (no slashes, spaces or glob characters)" ;;
esac

ORIGIN_URL="$(git -C "$REPO_ROOT" remote get-url origin)"
FORGEJO_URL="${FORGEJO_URL:-}"
if [ -z "$FORGEJO_URL" ]; then
  FORGEJO_URL="${ORIGIN_URL%/"$FORGEJO_REPO"}"
  FORGEJO_URL="${FORGEJO_URL%.git}"
fi
case "$FORGEJO_URL" in
  http://* | https://*) ;;
  *) die "cannot derive the Forgejo base URL from origin '$ORIGIN_URL' — set FORGEJO_URL" ;;
esac
API="${FORGEJO_URL}/api/v1"
TAG_SAFE="$(printf '%s' "$TAG" | tr -c 'A-Za-z0-9._+-' '_')"
STAGE="$LOCAL_OUT/forgejo/release-$TAG_SAFE"

# --- 1. preflight ------------------------------------------------------------
step "preflight"

DIRTY="$(git -C "$REPO_ROOT" status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  printf '%s\n' "$DIRTY" | sed 's/^/        /' >&2
  die "$REPO_ROOT has uncommitted changes to tracked files — a release must come from a
       commit the host can check out. Commit or undo them, then rerun. (Untracked files
       are ignored: they never reach the bundle.)"
fi
say "worktree clean at ${COMMIT:0:12} (tracked files)"

TIP="$(git -C "$REPO_ROOT" ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | awk '{ print $1 }')" ||
  die "cannot query origin ($ORIGIN_URL)"
[ -n "$TIP" ] || die "origin has no branch '$BRANCH' — the release tag would point at a commit nobody can fetch"
[ "$TIP" = "$COMMIT" ] || die "HEAD ${COMMIT:0:12} is not the tip of origin/$BRANCH (${TIP:0:12}) — push the
       branch or check out the tip you mean to release"
say "HEAD == origin/$BRANCH (${COMMIT:0:12})"

GH_TIP="$(git -C "$REPO_ROOT" ls-remote github "refs/heads/$BRANCH" 2>/dev/null | awk '{ print $1 }')" || true
if [ -n "${GH_TIP:-}" ] && [ "$GH_TIP" != "$COMMIT" ]; then
  warn "github/$BRANCH is at ${GH_TIP:0:12}; the tag push will still name one commit on both remotes"
fi

command -v python3 >/dev/null || die "python3 is required (BUILD.json, payloads and API replies are JSON)"
command -v curl >/dev/null || die "curl is required"
command -v shasum >/dev/null || die "shasum is required"
command -v tailscale >/dev/null || die "tailscale is required (the build host is reached over tailscale ssh)"

TOKEN="${FORGEJO_TOKEN:-}"
TOKEN_SOURCE="$TOKEN_FILE"
if [ -n "$TOKEN" ]; then
  TOKEN_SOURCE="env FORGEJO_TOKEN"
else
  [ -r "$TOKEN_FILE" ] ||
    die "no Forgejo token: $TOKEN_FILE is not readable. Set FORGEJO_TOKEN or FORGEJO_TOKEN_FILE
       (the scoped token lives at <superproject>/.prime/forgejo-token)."
  TOKEN="$(tr -d '[:space:]' <"$TOKEN_FILE")"
fi
[ -n "$TOKEN" ] || die "the Forgejo token from $TOKEN_SOURCE is empty"
say "token read from $TOKEN_SOURCE"

CURL_CFG="$(curl_config "$TOKEN")"
API_BODY="$(mktemp "${TMPDIR:-/tmp}/vclaw-forgejo-api.XXXXXX")"
API_CODE_FILE="$(mktemp "${TMPDIR:-/tmp}/vclaw-forgejo-code.XXXXXX")"

REPO_JSON="$(api GET "$API/repos/$FORGEJO_REPO")" || die "cannot reach $API"
[ "$(api_status)" = "200" ] || die "GET $API/repos/$FORGEJO_REPO -> HTTP $(api_status): $REPO_JSON"
[ "$(printf '%s' "$REPO_JSON" | json_get - has_releases)" = "true" ] ||
  die "the Releases unit is disabled on $FORGEJO_REPO, so no release can be created there.
       Enable it once as an admin: PATCH $API/repos/$FORGEJO_REPO with {\"has_releases\":true}"
say "$FORGEJO_REPO reachable at $FORGEJO_URL (releases enabled)"

step "preflight: build-remote.sh --check ${ARCH_ARGS[*]}"
CHECK_OUT="$(bash "$BUILD_DRIVER" --check "${ARCH_ARGS[@]}" 2>&1)" && CHECK_RC=0 || CHECK_RC=$?
printf '%s\n' "$CHECK_OUT" >&2
if [ "$CHECK_RC" -ne 0 ]; then
  # The host's checkout, vendor sums and omp copies lag behind until a build streams
  # them, so `--check` reports those as FAIL on the first build of any new commit
  # (measured: `FAIL checkout — host has f2b9a0f…, workstation has 346127d… — a build
  # will sync it`). Those are repairable by this run; everything else is not.
  CHECK_LABELS="$(printf '%s\n' "$CHECK_OUT" | python3 -c '
import re, sys
# "  FAIL  <label> — <detail>"; the label is everything before the first separator.
for line in sys.stdin:
    m = re.match("  FAIL  (.*?) \u2014 ", line)
    if m:
        label = m.group(1)
        kind = "synced" if re.match("^(checkout|SHA256SUMS\\.txt|omp (arm64|x64))$", label) else "blocking"
        print("%s\t%s" % (kind, label))
')"
  BLOCKING="$(printf '%s\n' "$CHECK_LABELS" | awk -F'\t' '$1 == "blocking" { print $2 }')"
  SYNCED="$(printf '%s\n' "$CHECK_LABELS" | awk -F'\t' '$1 == "synced" { print $2 }')"
  [ -z "$BLOCKING" ] ||
    die "build-remote.sh --check failed on: $(printf '%s' "$BLOCKING" | tr '\n' ' ')— fix the host
       first; nothing was tagged or published"
  say "the only check failures left are the ones this build syncs: $(printf '%s' "$SYNCED" | tr '\n' ' ')"
fi

# --- 2. build ----------------------------------------------------------------
step "build on the remote host (arch: ${ARCHES[*]})"
bash "$BUILD_DRIVER" "${ARCH_ARGS[@]}" >&2 ||
  die "build-remote.sh failed — nothing was tagged or published"

# --- 3. provenance, straight from BUILD.json ---------------------------------
step "read the builder's provenance"
BUILT_AT=""
BUILT_ON=""
OMP_RELEASE=""
for arch in "${ARCHES[@]}"; do
  j="$LOCAL_OUT/$arch/BUILD.json"
  [ -f "$j" ] || die "build-remote.sh wrote no $j"
  c="$(json_get "$j" source.commit)"
  [ "$c" = "$COMMIT" ] || die "$j was built from ${c:0:12}, HEAD is ${COMMIT:0:12}"
  zip="$(json_get "$j" artifact.file)"
  [ -f "$LOCAL_OUT/$arch/$zip" ] || die "$j names '$zip' but $LOCAL_OUT/$arch/$zip does not exist"
  bytes="$(json_get "$j" artifact.bytes)"
  actual_bytes="$(stat -f '%z' "$LOCAL_OUT/$arch/$zip")"
  [ "$bytes" = "$actual_bytes" ] || die "$LOCAL_OUT/$arch/$zip is $actual_bytes bytes, BUILD.json says $bytes"
  omp="$(json_get "$j" omp.release)"
  [ -z "$OMP_RELEASE" ] || [ "$OMP_RELEASE" = "$omp" ] ||
    die "the arches disagree on the omp release ($OMP_RELEASE vs $omp)"
  OMP_RELEASE="$omp"
  host="$(json_get "$j" host)"
  [ -z "$BUILT_ON" ] || [ "$BUILT_ON" = "$host" ] ||
    die "the arches were built on different hosts ($BUILT_ON vs $host)"
  BUILT_ON="$host"
  at="$(json_get "$j" builtAt)"
  if [ -z "$BUILT_AT" ] || [[ "$at" > "$BUILT_AT" ]]; then BUILT_AT="$at"; fi
  say "$arch $actual_bytes bytes, sha256 $(json_get "$j" artifact.sha256), omp $omp"
done
PRODUCT_NAME="$(json_get "$LOCAL_OUT/${ARCHES[0]}/BUILD.json" product.name)"
[ -n "$PRODUCT_NAME" ] || PRODUCT_NAME="VClaw"

# --- 4. signing state --------------------------------------------------------
step "signing state on $BUILT_ON"
HOST_IDS=0
APPS_SIGNED=0
for arch in "${ARCHES[@]}"; do
  app_path="$(json_get "$LOCAL_OUT/$arch/BUILD.json" app.path)"
  # tailscale ssh reports rc 0 even when the remote command fails, so the probe is
  # judged by whether it printed both fields — never by the ssh exit status.
  # shellcheck disable=SC2016 # these single-quoted lines are the script the HOST runs
  probe="$(
    {
      printf 'ids=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "Developer ID Application" || true)\n'
      printf 'auth=$(codesign -dv --verbose=2 %s 2>&1 | grep -c "^Authority=Developer ID Application" || true)\n' \
        "$(printf '%q' "$app_path")"
      printf 'printf "identities=%%s app_authority=%%s\\n" "${ids:-?}" "${auth:-?}"\n'
    } | tailscale ssh "$BUILT_ON" -- 'bash -s' 2>&1
  )" || true
  ids="$(printf '%s\n' "$probe" | sed -n 's/.*identities=\([0-9][0-9]*\).*/\1/p' | tail -1)"
  auth="$(printf '%s\n' "$probe" | sed -n 's/.*app_authority=\([0-9][0-9]*\).*/\1/p' | tail -1)"
  [ -n "$ids" ] && [ -n "$auth" ] ||
    die "cannot determine the signing state on $BUILT_ON (probe said: ${probe:-<no output>}) —
       refusing to guess whether the artefact is signed"
  [ "$ids" -le "$HOST_IDS" ] || HOST_IDS="$ids"
  [ "$auth" -eq 0 ] || APPS_SIGNED=$((APPS_SIGNED + 1))
  say "$arch host identities=$ids, packaged app authority=$auth"
done
UNSIGNED=1
if [ "$HOST_IDS" -gt 0 ] && [ "$APPS_SIGNED" -eq "${#ARCHES[@]}" ]; then
  UNSIGNED=0
elif [ "$HOST_IDS" -gt 0 ]; then
  warn "the host has $HOST_IDS Developer ID identities but $APPS_SIGNED/${#ARCHES[@]} packaged app(s) carry that authority"
  warn "build-remote.sh passes --config.mac.identity=null, so the release is labelled unsigned"
fi
if [ "$UNSIGNED" -eq 1 ]; then
  SIGN_LABEL="unsigned"
  # shellcheck disable=SC2016 # markdown backticks are literal
  SIGN_BODY='- **unsigned=yes** — no Developer ID identity on the host and no Developer ID authority on the app, and no notarisation. Gatekeeper refuses it unless the download is un-quarantined (`xattr -d com.apple.quarantine`) or re-signed.'
else
  SIGN_LABEL="signed"
  SIGN_BODY='- **signed** — a Developer ID Application identity is present on the host and carried by the packaged app (notarisation is not claimed here).'
fi
say "unsigned=$([ "$UNSIGNED" -eq 1 ] && echo yes || echo no)"

# --- 5. stage the assets -----------------------------------------------------
step "stage the release assets"
case "$STAGE" in
  "$LOCAL_OUT"/forgejo/release-?*) ;;
  *) die "refusing to use the staging path '$STAGE'" ;;
esac
rm -rf "$STAGE"
mkdir -p "$STAGE"
ASSETS=()
for arch in "${ARCHES[@]}"; do
  name="$(pub_zip "$arch")"
  stage_file "$LOCAL_OUT/$arch/$(json_get "$LOCAL_OUT/$arch/BUILD.json" artifact.file)" "$STAGE/$name"
  cp "$LOCAL_OUT/$arch/BUILD.json" "$STAGE/BUILD-$arch.json"
  ASSETS+=("$name" "BUILD-$arch.json")
done
: >"$STAGE/SHA256SUMS.txt"
for name in "${ASSETS[@]}"; do
  printf '%s  %s\n' "$(shasum -a 256 "$STAGE/$name" | cut -d' ' -f1)" "$name" >>"$STAGE/SHA256SUMS.txt"
done
TUPLE_ARGS=()
for arch in "${ARCHES[@]}"; do TUPLE_ARGS+=("$arch=$(pub_zip "$arch")"); done
python3 -c '
import json, sys
commit, branch, built_at, sums_path = sys.argv[1:5]
sums = {}
for line in open(sums_path):
    digest, name = line.split()
    sums[name] = digest
arches = {}
for pair in sys.argv[5:]:
    arch, name = pair.split("=", 1)
    arches[arch] = {"zip": name, "sha256": sums[name]}
print(json.dumps({"commit": commit, "branch": branch, "dirty": False,
                  "builtAt": built_at, "arches": arches}, indent=2))
' "$COMMIT" "$BRANCH" "$BUILT_AT" "$STAGE/SHA256SUMS.txt" "${TUPLE_ARGS[@]}" >"$STAGE/tuple.json"
ASSETS+=("SHA256SUMS.txt" "tuple.json")

RELEASE_NAME="$PRODUCT_NAME v$VERSION (${ARCHES[*]}, $SIGN_LABEL)"
BODY_FILE="$STAGE/release-body.md"
# shellcheck disable=SC2016 # every backtick below is literal markdown
{
  printf 'Built on the remote macOS build host from committed code — no local build, no dirty tree.\n\n'
  printf -- '- source: `%s` branch `%s` at commit `%s` (committed %s)\n' \
    "$FORGEJO_REPO" "$BRANCH" "$COMMIT" "$COMMITTED_AT"
  printf -- '- builder: `%s`, node v%s (the pinned toolchain); the artefacts were pulled back and re-verified on the workstation\n' \
    "$BUILT_ON" "$NODE_VERSION"
  printf -- '- built: %s\n' "$BUILT_AT"
  printf -- '- arches: %s\n' "${ARCHES[*]}"
  printf -- '- omp: release %s, shipped as `Contents/Resources/harness/bin/omp`\n' "$OMP_RELEASE"
  printf -- '%s\n\n' "$SIGN_BODY"
  printf '| arch | asset | bytes | sha256 |\n|---|---|---|---|\n'
  for arch in "${ARCHES[@]}"; do
    name="$(pub_zip "$arch")"
    printf '| %s | `%s` | %s | `%s` |\n' "$arch" "$name" \
      "$(stat -f '%z' "$STAGE/$name")" \
      "$(awk -v n="$name" '$2 == n { print $1 }' "$STAGE/SHA256SUMS.txt")"
  done
  printf '\n'
  for arch in "${ARCHES[@]}"; do
    printf -- '- omp %s: `%s` sha256 `%s`\n' "$arch" \
      "$(json_get "$LOCAL_OUT/$arch/BUILD.json" omp.binary)" \
      "$(json_get "$LOCAL_OUT/$arch/BUILD.json" omp.sha256)"
  done
  printf '\n`SHA256SUMS.txt` carries those digests — `shasum -a 256 -c SHA256SUMS.txt` (or `sha256sum -c`).\n'
  printf '`BUILD-<arch>.json` is the builder'"'"'s own provenance record; `tuple.json` is the flat\n'
  printf '`{commit, branch, dirty, builtAt, arches}` pin for a consumer.\n'
  if [ "$DRAFT" -eq 1 ]; then
    printf '\nThis release is a **draft**: the assets stay visible to the token holder until it is published.\n'
  fi
} >"$BODY_FILE"

PAYLOAD="$STAGE/release-payload.json"
python3 -c '
import json, sys
tag, name, body_path, draft = sys.argv[1:5]
print(json.dumps({"tag_name": tag, "name": name, "body": open(body_path).read(),
                  "draft": draft == "1"}, indent=2))
' "$TAG" "$RELEASE_NAME" "$BODY_FILE" "$DRAFT" >"$PAYLOAD"

printf '    tag      %s\n' "$TAG"
printf '    name     %s\n' "$RELEASE_NAME"
printf '    stage    %s\n' "$STAGE"
for name in "${ASSETS[@]}"; do
  printf '    %-42s %12s bytes\n' "$name" "$(stat -f '%z' "$STAGE/$name")"
done

# --- 6. dry run --------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  step "dry run — nothing was tagged, created or uploaded"
  printf 'tag (annotated, at HEAD %s)\n' "$COMMIT"
  printf '  git -C %s tag -a %s -m %s %s\n' "$REPO_ROOT" "$TAG" \
    "'vclaw-desktop $VERSION $SIGN_LABEL from $COMMIT on $BRANCH'" "$COMMIT"
  for remote in origin github; do
    printf '  git -C %s push %s refs/tags/%s:refs/tags/%s\n' "$REPO_ROOT" "$remote" "$TAG" "$TAG"
  done
  printf '\nrelease (draft=%s)\n' "$([ "$DRAFT" -eq 1 ] && echo true || echo false)"
  printf '  POST %s/repos/%s/releases\n' "$API" "$FORGEJO_REPO"
  printf '  Content-Type: application/json\n'
  sed 's/^/  /' "$PAYLOAD"
  printf '\nassets (in order)\n'
  for name in "${ASSETS[@]}"; do
    printf '  POST %s/repos/%s/releases/{id}/assets?name=%s\n' "$API" "$FORGEJO_REPO" "$(urlenc "$name")"
    printf '    -F attachment=@%s/%s   (%s bytes)\n' "$STAGE" "$name" "$(stat -f '%z' "$STAGE/$name")"
  done
  printf '\nverify — skipped: nothing was uploaded\n'
  printf '\nrendered body\n'
  sed 's/^/  | /' "$BODY_FILE"
  step "dry run complete — rerun without --dry-run to publish"
  exit 0
fi

# --- 7. tag ------------------------------------------------------------------
step "tag $TAG"
TAG_MESSAGE="vclaw-desktop $VERSION $SIGN_LABEL from $COMMIT on $BRANCH, built on $BUILT_ON"
LOCAL_TAG="$(git -C "$REPO_ROOT" rev-parse -q --verify "refs/tags/$TAG^{}" 2>/dev/null || true)"
if [ -n "$LOCAL_TAG" ]; then
  [ "$LOCAL_TAG" = "$COMMIT" ] ||
    die "the local tag $TAG points at ${LOCAL_TAG:0:12}, not ${COMMIT:0:12} — refusing to move it"
  say "local tag $TAG already at ${COMMIT:0:12}"
else
  git -C "$REPO_ROOT" tag -a "$TAG" -m "$TAG_MESSAGE" "$COMMIT" || die "creating tag $TAG failed"
  say "created annotated tag $TAG"
fi
for remote in origin github; do
  at="$(remote_tag_commit "$remote" "$TAG")" || die "cannot list tags on $remote"
  if [ -n "$at" ]; then
    [ "$at" = "$COMMIT" ] ||
      die "$remote already has $TAG at ${at:0:12}, HEAD is ${COMMIT:0:12} — tags are never rewritten; pick another --tag"
    say "$remote already has $TAG at ${COMMIT:0:12}"
    continue
  fi
  git -C "$REPO_ROOT" push "$remote" "refs/tags/$TAG:refs/tags/$TAG" || die "pushing $TAG to $remote failed"
  say "pushed $TAG -> $remote"
done

# --- 8. release --------------------------------------------------------------
step "create the release"
EXISTING="$(api GET "$API/repos/$FORGEJO_REPO/releases/tags/$(urlenc "$TAG")")"
case "$(api_status)" in
  200)
    die "a release for $TAG already exists ($(printf '%s' "$EXISTING" | json_get - html_url)) — this
       script never edits or re-uploads into an existing release. Delete it or pick another --tag"
    ;;
  404) ;;
  000) die "cannot query $API/repos/$FORGEJO_REPO/releases/tags/$TAG" ;;
  *) die "GET releases/tags/$TAG -> HTTP $(api_status): $EXISTING" ;;
esac
REL_JSON="$(api POST "$API/repos/$FORGEJO_REPO/releases" -H 'Content-Type: application/json' --data @"$PAYLOAD")" ||
  die "creating the release failed"
case "$(api_status)" in
  200 | 201) ;;
  *) die "POST releases -> HTTP $(api_status): $REL_JSON" ;;
esac
REL_ID="$(printf '%s' "$REL_JSON" | json_get - id)"
[ -n "$REL_ID" ] || die "the release response carries no id: $REL_JSON"
RELEASE_URL="$(printf '%s' "$REL_JSON" | json_get - html_url)"
say "release #$REL_ID (draft=$([ "$DRAFT" -eq 1 ] && echo true || echo false)) $RELEASE_URL"

# --- 9. upload ---------------------------------------------------------------
step "upload ${#ASSETS[@]} assets"
for name in "${ASSETS[@]}"; do
  body="$(api POST "$API/repos/$FORGEJO_REPO/releases/$REL_ID/assets?name=$(urlenc "$name")" \
    -F "attachment=@$STAGE/$name")" || die "uploading $name failed"
  case "$(api_status)" in
    200 | 201) ;;
    *) die "upload of $name -> HTTP $(api_status): $body" ;;
  esac
  served="$(printf '%s' "$body" | json_get - size)"
  local_bytes="$(stat -f '%z' "$STAGE/$name")"
  [ "$served" = "$local_bytes" ] ||
    die "$name: the server stored $served bytes, the local file is $local_bytes"
  printf '    %-42s %12s bytes  ok\n' "$name" "$served"
done

# --- 10. verify by re-fetch --------------------------------------------------
step "verify by re-fetching from $FORGEJO_URL"
SERVED_JSON="$(api GET "$API/repos/$FORGEJO_REPO/releases/$REL_ID")" || die "cannot re-read the release"
[ "$(api_status)" = "200" ] || die "GET releases/$REL_ID -> HTTP $(api_status)"
asset_size() {
  printf '%s' "$SERVED_JSON" | python3 -c '
import json, sys
want = sys.argv[1]
for a in json.load(sys.stdin).get("assets") or []:
    if a["name"] == want:
        print(a["size"]); break
' "$1"
}
printf '  %-42s %12s %12s  %s\n' "asset" "served" "local" "sha256"
for name in "${ASSETS[@]}"; do
  served="$(asset_size "$name")"
  [ -n "$served" ] || die "the release does not list asset $name after upload"
  local_bytes="$(stat -f '%z' "$STAGE/$name")"
  [ "$served" = "$local_bytes" ] || die "$name: served size $served != local $local_bytes"
  printf '  %-42s %12s %12s  %s\n' "$name" "$served" "$local_bytes" \
    "$(awk -v n="$name" '$2 == n { print $1; exit }' "$STAGE/SHA256SUMS.txt" | cut -c1-16)"
done
SUMS_URL="$(printf '%s' "$SERVED_JSON" | python3 -c '
import json, sys
for a in json.load(sys.stdin).get("assets") or []:
    if a["name"] == "SHA256SUMS.txt":
        print(a["browser_download_url"]); break
')"
[ -n "$SUMS_URL" ] || die "the release lists no SHA256SUMS.txt download URL"
SERVED_SUMS="$STAGE/.served-SHA256SUMS.txt"
curl -K "$CURL_CFG" -sSL --max-time 300 --retry 2 -o "$SERVED_SUMS" "$SUMS_URL" ||
  die "cannot re-download SHA256SUMS.txt from $SUMS_URL"
cmp -s "$STAGE/SHA256SUMS.txt" "$SERVED_SUMS" ||
  die "the served SHA256SUMS.txt differs from the local one — do not trust this release"
rm -f "$SERVED_SUMS"
say "SHA256SUMS.txt re-downloaded and identical (cmp)"

step "done"
printf '    release  %s\n' "$RELEASE_URL" >&2
if [ "$DRAFT" -eq 1 ]; then
  printf '    draft    publish it in the UI, or DELETE %s/repos/%s/releases/%s to discard\n' \
    "$API" "$FORGEJO_REPO" "$REL_ID" >&2
fi
