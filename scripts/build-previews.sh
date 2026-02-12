#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-Tchoumi}"
OUT_DIR="${2:-assets/previews}"

mkdir -p "$OUT_DIR"

if ! command -v sips >/dev/null 2>&1; then
  echo "sips not found. Cannot generate previews." >&2
  exit 1
fi

count=0
failed=0

for pdf in "$SOURCE_DIR"/*.pdf; do
  [ -e "$pdf" ] || continue

  base="$(basename "$pdf" .pdf)"
  out="$OUT_DIR/$base.jpg"

  if sips -s format jpeg "$pdf" --out "$out" >/dev/null 2>&1; then
    count=$((count + 1))
  else
    echo "Failed: $pdf" >&2
    failed=$((failed + 1))
  fi

done

echo "Generated previews: $count"
if [ "$failed" -gt 0 ]; then
  echo "Failed conversions: $failed" >&2
  exit 2
fi
