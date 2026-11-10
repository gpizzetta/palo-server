# Modeleur Palo (`/`) — P0/P1

Interface **JS vanilla** (pas de CDN) servie par Palo à la **racine** du serveur HTTP.

Cahier fonctionnel : `../cahiers des charges/modeleur-fonctionnel.md`.  
Doc projet : `../documentation/admin-ui.md`.

## Accès (après sync des fichiers)

- http://127.0.0.1:7777/
- Login same-origin : **admin / admin** (serveur qui sert la page)

Les sources sont stockées sous `Api/explore/` sur le disque ; les handlers HTTP exposent `/`, `/css/...`, `/js/...` (pas `/explore` dans l’URL).

## Déployer les fichiers sans rebuild `.deb`

```bash
cd admin
./deploy-local.sh
```

(copie vers `/var/lib/palo/Api/explore` — mot de passe sudo). Puis recharger http://127.0.0.1:7777/.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `index.html` | Shell login + arbre + détail |
| `css/app.css` | Styles (UI custom, sans Bootstrap) |
| `js/api.js` | Client HTTP Palo |
| `js/i18n.js` | Traductions FR/EN |
| `js/palo-csv.js` | Parse CSV Palo |
| `js/rule-editor.js` | Édition des règles cube |
| `js/app.js` | Modeleur (arbre, filtres, UX) |
| `vendor/md5.js` | Hash mot de passe login |

## Périmètre

- **P0** : connexion, bases, dimensions, éléments + consolidations, cubes (shuttle ≥ 2 dims), vider cube
- **P1** : règles cube, attributs, administration (users / groupes / rôles / droits) — visible si compte admin
- Filtres UI (barre du haut / éléments)
