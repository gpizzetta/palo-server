#!/usr/bin/env bash
# Copie admin/ vers le template-directory du Palo installé (sans rebuild .deb).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-/var/lib/palo/Api/explore}"
echo "Sync $ROOT → $DEST"
mkdir -p "$DEST"
rsync -a --delete \
  --exclude 'README.md' \
  --exclude 'deploy-local.sh' \
  "$ROOT"/ "$DEST"/

# Préfixer i18n + rule-editor dans app.js (handlers séparés optionnels après rebuild).
if [[ -f "$ROOT/js/app.js" ]]; then
  parts=()
  [[ -f "$ROOT/js/i18n.js" ]] && parts+=("$ROOT/js/i18n.js")
  [[ -f "$ROOT/js/rule-editor.js" ]] && parts+=("$ROOT/js/rule-editor.js")
  parts+=("$ROOT/js/app.js")
  cat "${parts[@]}" > "$DEST/js/app.js"
  echo "Note: préfixe ${#parts[@]} fichier(s) → js/app.js"
fi

echo "OK. UI à http://127.0.0.1:7777/ — rebuild+restart Palo si handlers HTTP ont changé."
