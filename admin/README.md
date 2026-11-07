# Modeleur Palo (`/explore`) — P0

Interface **JS vanilla** (pas de CDN) servie par Palo sous **`/explore`**.

Cahier fonctionnel : `../cahiers des charges/modeleur-fonctionnel.md`.

## Accès (après sync des fichiers)

- http://127.0.0.1:7777/explore  
- Login same-origin : **admin / admin** (serveur qui sert la page)

## Déployer les fichiers sans rebuild `.deb`

```bash
cd admin
./deploy-local.sh
```

(copie vers `/var/lib/palo/Api/explore` — mot de passe sudo). Puis recharger le navigateur.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `index.html` | Shell login + arbre + détail |
| `css/app.css` | Styles (UI custom, sans Bootstrap) |
| `js/api.js` | Client HTTP Palo P0 |
| `js/app.js` | Modeleur (arbre PalOOCa-like) |
| `js/palo-csv.js` | Parse CSV Palo |
| `vendor/md5.js` | Hash mot de passe login |

## Périmètre

- **P0** : connexion, bases, dimensions, éléments + consolidations, cubes (shuttle ≥ 2 dims), vider cube
- **P1** : règles cube, attributs, administration (users / groupes / rôles / droits) — visible si compte admin
