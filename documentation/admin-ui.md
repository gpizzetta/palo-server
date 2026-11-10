# Interface modeleur JS (`admin/` → `/`)

Modeleur web **P0/P1** (JS vanilla, sans CDN), servi par Palo.

- **Cahier fonctionnel** : `cahiers des charges/modeleur-fonctionnel.md`
- **Code source** : `admin/`
- **URL** : http://\<hôte\>:7777/ (racine du serveur HTTP Palo)

Les fichiers sont installés sous `Api/explore/` (data-directory), mais les handlers HTTP exposent l’UI à **`/`** (`/css/...`, `/js/...`), pas sous le chemin `/explore`.

## UX

- Login **same-origin** (le serveur qui sert la page) — pas de multi-connexions.
- Navigation **arbre** (bases → Dimensions / Cubes → objets) + **panneau détail**.
- Filtres (barre du haut / éléments).
- Dialogues pour création / consolidation / cube (shuttle ≥ 2 dimensions).
- i18n (FR/EN via `js/i18n.js`).

## P0 couvert

| Fonction | Statut |
|----------|--------|
| Login / logout | Oui |
| Bases : liste, créer, renommer, supprimer | Oui |
| Dimensions : liste, créer, renommer, supprimer | Oui |
| Éléments : arbre, créer (N/T/C), renommer, supprimer | Oui |
| Consolidation (enfants + poids) | Oui |
| Cubes : liste, créer (shuttle), renommer, supprimer, vider | Oui |

## P1 couvert

| Fonction | Statut |
|----------|--------|
| Règles cube : liste, créer, éditer, activer, supprimer, ↑↓ | Oui |
| Attributs de dimension : liste, créer, supprimer | Oui (valeurs cellules = raffinement) |
| Utilisateurs / groupes / rôles (System, admin) | Oui |
| Droits rôles (`#_ROLE_RIGHT_OBJECT`) | Oui (édition cellule) |

P2 (vues / subsets tableur) : non inclus.

## Déploiement fichiers (sans rebuild `.deb`)

```bash
cd admin && ./deploy-local.sh
```

Puis recharger http://127.0.0.1:7777/ (admin / admin).

Le script copie vers `/var/lib/palo/Api/explore`. Le packaging `.deb` fait la même chose et peut concaténer `i18n.js` + `rule-editor.js` + `app.js` en un seul `/js/app.js` servi.

## Fichiers servis (handlers)

| Fichier source (`admin/`) | URL HTTP |
|---------------------------|----------|
| `index.html` | `/` |
| `css/app.css` | `/css/app.css` |
| `js/api.js` | `/js/api.js` |
| `js/i18n.js` | `/js/i18n.js` (ou fusionné dans `app.js` selon packaging) |
| `js/palo-csv.js` | `/js/palo-csv.js` |
| `js/rule-editor.js` | `/js/rule-editor.js` (ou fusionné) |
| `js/app.js` | `/js/app.js` |
| `vendor/md5.js` | `/vendor/md5.js` |
