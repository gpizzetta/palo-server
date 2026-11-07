# Interface modeleur JS (`admin/` → `/explore`)

Modeleur web **P0** (JS vanilla, sans CDN), servi par Palo.

- **Cahier fonctionnel** : `cahiers des charges/modeleur-fonctionnel.md`
- **Code source** : `admin/`
- **URL** : http://\<hôte\>:7777/explore

## UX

- Login **same-origin** (le serveur qui sert la page) — pas de multi-connexions.
- Navigation **arbre** (bases → Dimensions / Cubes → objets) + **panneau détail**.
- Dialogues pour création / consolidation / cube (shuttle ≥ 2 dimensions).

## P0 couvert

| Fonction | Statut |
|----------|--------|
| Login / logout | Oui |
| Bases : liste, créer, renommer, supprimer | Oui |
| Dimensions : liste, créer, renommer, supprimer | Oui |
| Éléments : arbre, créer (N/T/C), renommer, supprimer | Oui |
| Consolidation (enfants + poids) | Oui |
| Cubes : liste, créer (shuttle), renommer, supprimer, vider | Oui |

P1 (règles, attributs, users/droits) et P2 (vues/subsets) : non inclus.

## Déploiement fichiers (sans rebuild `.deb`)

```bash
cd admin && ./deploy-local.sh
```

Puis recharger http://127.0.0.1:7777/explore (admin / admin).

## Fichiers servis (handlers existants)

`index.html`, `css/app.css`, `js/app.js`, `js/api.js`, `js/palo-csv.js`, `vendor/md5.js`  
(+ `explore_root.html` pour la redirection `/explore` → `/explore/index.html`).
