#!/usr/bin/env bash
# Lädt die für den Import benötigten Bilder der alten Website nach ./legacy-import/images.
# Die Dateien gelten als nicht vertrauenswürdig: Der Import kodiert sie mit sharp neu.
set -euo pipefail
BASE_URL="${LEGACY_BASE_URL:-https://www.bogensport-plauen.de}"
TARGET="${LEGACY_IMAGES_DIR:-legacy-import/images}"
LIST="$(dirname "$0")/images.txt"

while IFS= read -r rel; do
  [[ -z "$rel" || "$rel" == \#* ]] && continue
  [[ "$rel" =~ ^[A-Za-z0-9_./-]+$ && "$rel" != *..* ]] || { echo "Ungültiger Pfad: $rel" >&2; exit 1; }
  out="$TARGET/$rel"
  [[ -s "$out" ]] && continue
  mkdir -p "$(dirname "$out")"
  curl --fail --silent --show-error --proto '=https' --max-filesize 20000000 -o "$out" "$BASE_URL/images/$rel"
  echo "✓ $rel"
done < "$LIST"
echo "Fertig: $(find "$TARGET" -type f | wc -l) Dateien in $TARGET"
