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

# Secours si le binaire Palo n’a pas encore le handler /explore/js/rule-editor.js :
# préfixer rule-editor.js dans app.js (app.js est toujours enregistré).
# PaloRuleEditor défini 2× si le handler existe déjà + script séparé : inoffensif.
if [[ -f "$ROOT/js/rule-editor.js" && -f "$DEST/js/app.js" ]]; then
  cat "$ROOT/js/rule-editor.js" "$ROOT/js/app.js" > "$DEST/js/app.js"
  echo "Note: rule-editor.js préfixé dans app.js (compat handler manquant)."
fi

echo "OK. Ouvrir http://127.0.0.1:7777/explore (pas besoin de redémarrer Palo pour les fichiers statiques)."
