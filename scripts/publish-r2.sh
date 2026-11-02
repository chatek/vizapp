#!/usr/bin/env bash
# publish-r2.sh — upload an electron-builder output to R2 and prove the updater feed is fetchable.
#
# WHY A SCRIPT AND NOT electron-builder's `--publish always`: the `generic` provider has NO UPLOADER. It only
# writes `app-update.yml` (into the app) and `latest*.yml` (into dist/); hosting is the caller's job. That is the
# right split here — R2 is ours — but it means "publish" is this file, not a flag.
#
# BUCKET: vclawhub-assets, prefix `vclaw-desktop/` (parent repo: docs/ASSET_HOSTING.md).
# FEED:   https://assets.vclawhub.com/vclaw-desktop/latest.yml   (latest-mac.yml / latest-linux.yml likewise)
#
# NAMING: artefacts carry `${productName}-${version}-...`, so a new build never overwrites an old one. The
# `latest*.yml` files ARE reused by design — they are the feed pointer — and the domain serves
# `cache-control: max-age=14400`, which is why electron-updater requests them with a `?noCache=` suffix. Never
# serve the feed from a path that strips the query string.
#
# Usage: vclaw-desktop/scripts/publish-r2.sh [dist-dir]   (default: dist)
set -uo pipefail
dist="${1:-dist}"
[ -d "$dist" ] || { echo "no $dist/ — run the build first" >&2; exit 1; }

root="$(cd "$(dirname "$0")/.." && pwd)"
set -a; . "$root/../.env"; set +a
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
aws() { command aws --endpoint-url "$R2_ENDPOINT" "$@"; }

ctype() { case "${1##*.}" in
  dmg) echo application/x-apple-diskimage ;;
  zip) echo application/zip ;;
  exe) echo application/vnd.microsoft.portable-executable ;;
  appx) echo application/vnd.ms-appx ;;
  AppImage) echo application/x-executable ;;
  deb) echo application/vnd.debian.binary-package ;;
  yml|yaml) echo text/yaml ;;
  json) echo application/json ;;
  blockmap) echo application/octet-stream ;;
  *) echo application/octet-stream ;;
esac; }

n=0; fail=0
while IFS= read -r f; do
    base="$(basename "$f")"
    aws s3 cp "$f" "s3://$R2_BUCKET/vclaw-desktop/$base" --content-type "$(ctype "$f")" --only-show-errors \
        || { echo "  FAIL upload $base" >&2; fail=1; continue; }
    n=$((n+1))
    echo "  up   $base"
done < <(find "$dist" -maxdepth 1 -type f \( -name '*.dmg' -o -name '*.zip' -o -name '*.exe' -o -name '*.appx' \
        -o -name '*.AppImage' -o -name '*.deb' -o -name '*.blockmap' -o -name 'latest*.yml' \) -print)

[ "$fail" = 0 ] || { echo "one or more uploads failed" >&2; exit 1; }

echo "verifying the feed over the public domain:"
for yml in latest.yml latest-mac.yml latest-linux.yml; do
    [ -f "$dist/$yml" ] || continue
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://assets.vclawhub.com/vclaw-desktop/$yml")"
    printf "  %-16s %s\n" "$yml" "$code"
    [ "$code" = "200" ] || { echo "  feed not fetchable: $yml" >&2; fail=1; }
done
[ "$fail" = 0 ] && echo "published $n file(s); feed = https://assets.vclawhub.com/vclaw-desktop/latest.yml"
exit "$fail"
