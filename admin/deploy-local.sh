#!/usr/bin/env bash
# Copie admin/ vers le template-directory du Palo installé (sans rebuild .deb).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-/var/lib/palo/Api/explore}"
echo "Sync $ROOT → $DEST"
sudo mkdir -p "$DEST"
sudo rsync -a --delete \
  --exclude 'README.md' \
  --exclude 'deploy-local.sh' \
  "$ROOT"/ "$DEST"/
echo "OK. Ouvrir http://127.0.0.1:7777/explore (pas besoin de redémarrer Palo pour les fichiers statiques)."
