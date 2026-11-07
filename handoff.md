# Handoff — guillemets dans `name_path`

**Statut : fait** (présent dans `master`, commit `6424f1f` — *fix path with comma*, 2026-10-05). Rien à corriger côté code pour ce sujet.

## Problème (historique)

L’add-in Excel (`palo-excel-addin`) envoie les noms qui contiennent une virgule entre guillemets. Exemple :

```
name_path=01VD,TOUT,"Frais bureau, tél, port",2026,Cumulé Juin,Réalisé
```

Avant le correctif, `CMD_NAME_PATH` découpait sur chaque virgule via `fillVectorString` (sans guillemets) → 8 segments au lieu de 6 → HTTP 400 (`ERROR_INVALID_COORDINATES` / wrong number of path elements) dans `PaloJob::findPath`.

## Correction appliquée

Fichier : `Library/PaloHttpServer/PaloHttpRequest.cpp`, dans `PaloHttpRequest::parse` :

| Commande | Parseur |
|----------|---------|
| `CMD_NAME_PATH` | `fillVectorStringQuote(..., ',')` |
| `CMD_NAME_PATH_TO` | `fillVectorStringQuote(..., ',')` |
| `CMD_NAME_PATHS` | `fillVectorVectorStringQuote(..., ':', ',')` |

Même mécanisme que `name_elements` / `name_children` (`StringUtils::getNextElement(..., quote=true)`). Pas de paramètre `separator`, pas de changement de `StringUtils` ni du contrôle de taille dans `PaloJob.cpp`.

## Contrat client (inchangé)

Dans `palo-excel-addin`, `paloQuoteNamePathSegment` :

- nom sans virgule : inchangé ;
- nom avec virgule : entouré de `"`, chaque `"` interne doublé.

Le serveur retire les guillemets entourants et interprète `""` comme un `"`.

## Vérification (si besoin de rejouer)

```
/cell/value?sid=...&name_database=DWH&name_cube=PP_BUDGET&name_path=01VD,TOUT,"Frais bureau, tél, port",2026,Cumulé Juin,Réalisé
```

Attendu : plus de HTTP 400 « wrong number of path elements » ; valeur de cellule, ou erreur métier (élément introuvable). Les chemins sans guillemets restent inchangés.
