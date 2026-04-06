# Configuration runtime (`palo.ini`)

Le fichier de reference est `palo.ini.sample`.

## Regle d'evaluation des options

Ordre applique par `PaloOptions`:

1. options CLI,
2. puis options du fichier init (si active).

Consequence: le fichier init peut ecraser certains choix CLI, sauf options explicitement reservees a la ligne de commande (ex: changement de repertoire/data-dir dans certaines conditions).

Les options de type "toggle" inversent un etat a chaque occurrence.

## Options reseau indispensables

Le serveur exige au moins une de ces familles:

- `http <address> <port>`
- `admin <address> <port>`

Exemple simple:

```ini
http "" 7777
```

## CORS (frontend JS / navigateur)

Une option `cross-origin` existe (voir `palo.ini.sample`). Quand elle est definie, le serveur ajoute des headers CORS aux reponses HTTP et repond aux requetes de preflight `OPTIONS`.

Exemple permissif (toutes origines):

```ini
cross-origin *
```

Exemple restrictif (une origine):

```ini
cross-origin https://mon-frontend.exemple
```

## Encryption / HTTPS

Options observees:

- `encryption <none|optional|required>`
- `https <port>` (une valeur par endpoint `http/admin`)
- `key-files <ca> <private> <dh>`
- `password <private-password>`

Regles de coherence:

- si `required`, des ports HTTPS doivent etre definis;
- si encryption est `none`, les ports HTTPS sont ignores.

## Logging

- `log -` pour stdout (par defaut)
- `log <fichier>` pour fichier
- `verbose <error|warning|info|debug|trace>`

Exemple production:

```ini
log /var/log/palo/palo.log
verbose info
```

## Data et comportement serveur

Options utiles:

- `data-directory <dir>`
- `template-directory <dir>` (ressources API/doc en ligne)
- `auto-load`, `auto-commit`, `add-new-databases`
- `cache-barrier <n>`
- `session-timeout <s>`
- `maximum-return-cells <n>`
- `goalseek-limit <n>`
- `goalseek-timeout <ms>`

## Workers et extensions

- `worker <exec> <args...>`
- `workerlogin <information|authentication|authorization>`
- `use-cube-worker`
- `use-dimension-worker`
- `extensions <directory>`

Ces options activent des hooks externes pour authn/authz et traitements dedies.

## Securite minimum recommandee

- lier `http` a une interface privee ou reverse proxy;
- activer TLS (`encryption optional|required` + certificats valides);
- ecrire les logs hors stdout en production;
- limiter les droits systeme de l'utilisateur de service;
- proteger strictement `data-directory` et fichiers de cles.
