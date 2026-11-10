# Cahier des charges fonctionnel — Modeleur Palo

Référence produit : **PalOOCa** (extension LibreOffice/OpenOffice Calc pour Jedox/Palo), module **Modeller** et dialogues associés  
Source : [sourceforge.net/p/palooca](https://sourceforge.net/p/palooca/code/HEAD/tree/trunk/AddIn/src/org/palooca/dialogs/) (`Modeller`, `CreateCubeDialog`, etc.)

Ce document décrit **ce que l’utilisateur doit pouvoir faire**, indépendamment de la techno cible (web à `/`, panneau Excel, autre). Il sert de base pour prioriser MVP et évolutions.

---

## 1. Contexte et objectifs

### 1.1 Problème

Administrer un serveur Palo (bases, dimensions, éléments/mesures, cubes, règles, droits) sans passer uniquement par l’API HTTP ou la ligne de commande. Les utilisateurs métier / contrôleurs ont besoin d’une **interface de modélisation** claire, comme le Modeler PalOOCa / l’add-in Excel Jedox historique.

### 1.2 Objectifs

- Connecter un ou plusieurs serveurs Palo et gérer les sessions.
- Créer et maintenir le **modèle OLAP** : bases → dimensions → éléments (y compris consolidations) → cubes → règles.
- Gérer les **utilisateurs / groupes / rôles** (droits).
- Préparer l’usage tableur (vues, subsets) sans en faire le cœur du MVP modeleur.

### 1.3 Utilisateurs cibles

| Profil | Besoin principal |
|--------|------------------|
| Administrateur Palo | Modèle complet, users/droits, règles |
| Contrôleur / analyste | Explorer, créer dims/éléments/cubes simples |
| Développeur | Valider l’API et le modèle sans scripts |

### 1.4 Cibles d’implémentation (hors détail technique)

- **Court terme** : enrichir l’UI web déjà servie à **`/`**.
- **Moyen terme** : panneau modeleur dans **`palo-excel-addin`** (même comportements fonctionnels).
- Les deux cibles doivent partager le **même périmètre fonctionnel** décrit ici (écarts explicités en §8).

---

## 2. Principes UX (repris de PalOOCa)

1. **Arbre de navigation** (overview) : connexions → bases → dossiers Dimensions / Cubes / Users / Groups / Roles → objets.
2. **Sélection d’un nœud** → panneau de détail / actions contextuelles (créer, renommer, supprimer, éditer).
3. **Dialogues modaux** pour les opérations structurantes (nouveau cube, consolidation, connexion…).
4. **Feedback** : messages d’erreur métier (nom déjà utilisé, pas assez de dimensions, etc.) et confirmations avant suppressions destructives.
5. **Connexion explicite** : pouvoir se connecter / déconnecter sans confondre « serveur enregistré » et « session active ».

---

## 3. Périmètre fonctionnel

### 3.1 MVP (priorité P0) — aligné sur le cœur du Modeler

| ID | Fonction | Description |
|----|----------|-------------|
| **C-01** | Gestion des connexions | Créer / éditer / supprimer une connexion (nom, hôte, port, user, mot de passe optionnel, option « login au démarrage »). Tester la connexion. |
| **C-02** | Login / logout | Se connecter à un serveur, afficher l’état connecté, se déconnecter. |
| **B-01** | Lister les bases | Afficher les bases du serveur connecté. |
| **B-02** | Créer une base | Saisir un nom ; créer via API ; rafraîchir l’arbre. |
| **B-03** | Supprimer une base | Confirmation obligatoire ; interdit ou bloqué si non autorisé. |
| **D-01** | Lister les dimensions | Dimensions « normales » d’une base (hors système sauf mode avancé). |
| **D-02** | Créer une dimension | Nom unique dans la base. |
| **D-03** | Renommer / supprimer une dimension | Avec confirmation à la suppression. |
| **E-01** | Arbre d’éléments | Afficher la hiérarchie (feuilles + consolidés). |
| **E-02** | Créer un élément | Types : **numérique**, **texte**, **consolidé** (vide puis peuplé). |
| **E-03** | Renommer / supprimer un élément | Confirmation à la suppression. |
| **E-04** | Consolidation | Choisir un parent consolidé ; ajouter / retirer des enfants ; **poids** (facteurs) ; valider. |
| **K-01** | Lister les cubes | Cubes d’une base. |
| **K-02** | Créer un cube | Nom + sélection ordonnée d’**au moins 2** dimensions normales (shuttle listes gauche/droite + monter/descendre). Contrôles : nom non vide, nom libre, ≥ 2 dims. |
| **K-03** | Renommer / supprimer un cube | Confirmation à la suppression. |
| **K-04** | Vider les valeurs d’un cube | Action destructive explicite (clear cells) avec confirmation. |

> **Mesures** : dans Palo, les « mesures » sont en pratique des **éléments** d’une dimension dédiée (souvent appelée Mesures / Measures). Le modeleur ne crée pas un type d’objet « mesure » distinct : il crée une dimension + éléments numériques (et éventuellement consolidés).

### 3.2 Priorité P1 — règles, attributs, droits

| ID | Fonction | Description |
|----|----------|-------------|
| **R-01** | Lister les règles d’un cube | Affichage définition / commentaire / actif. |
| **R-02** | Créer / modifier / supprimer une règle | Éditeur texte ; contrôle syntaxique si disponible (`check`). |
| **R-03** | Réordonner les règles | Monter / descendre. |
| **A-01** | Attributs de dimension | Créer attribut numérique / texte ; éditer / supprimer ; saisir valeurs d’attributs sur les éléments. |
| **U-01** | Utilisateurs | Lister / créer / renommer / supprimer ; mot de passe. |
| **U-02** | Groupes | CRUD groupes ; affectation users ↔ groupes. |
| **U-03** | Rôles | CRUD rôles ; liens groupes ↔ rôles. |
| **U-04** | Droits dim / cube | Édition des droits (lecture/écriture) sur dimensions et cubes (vues « rights » du Modeler). |

### 3.3 Priorité P2 — tableur & subsets (héritage PalOOCa)

| ID | Fonction | Description |
|----|----------|-------------|
| **V-01** | Paste / View | Composer une vue (cube + axes / filtres) et coller dans la feuille (Excel / Calc). |
| **S-01** | Subset modeller | Définir / enregistrer des subsets de dimension. |
| **I-01** | Import de données | Dialogues d’import (fichiers / fonctions) — hors MVP modeleur structure. |

---

## 4. Détail des flux principaux

### 4.1 Connexion

1. L’utilisateur ouvre le modeleur.
2. Il crée ou sélectionne une connexion (hôte, port, identifiants).
3. Action **Connect** → session Palo ; en cas d’échec, message explicite.
4. L’arbre se remplit avec les bases (et éventuellement System si droits admin).

### 4.2 Créer une dimension et des éléments (« mesures »)

1. Sélection d’une base → dossier Dimensions → **Créer dimension**.
2. Ouverture de la dimension → **Nouvel élément** (numérique pour une mesure, texte sinon).
3. Pour une hiérarchie : élément consolidé → mode consolidation → sélection enfants + poids → OK.

### 4.3 Créer un cube (comportement PalOOCa `CreateCubeDialog`)

1. Sur une base : **Créer cube**.
2. Saisie du **nom**.
3. Liste de gauche : dimensions normales disponibles ; liste de droite : dimensions du cube.
4. Transfert ← → ; réordonnancement ↑ ↓ (l’ordre = ordre des axes du cube).
5. Validation :
   - nom non vide ;
   - au moins **2** dimensions ;
   - nom non déjà utilisé (comme dim/cube selon règles serveur).
6. Création API ; rafraîchissement de l’arbre.

### 4.4 Suppressions

Toute suppression de base, dimension, cube, élément, user, etc. demande une **confirmation** explicite. Les objets système (System, dimensions `#_…`) ne sont pas créés/supprimés comme des objets métier (affichage admin optionnel).

---

## 5. Règles métier & contraintes

- Noms uniques dans leur périmètre (base / dimension / cube / élément) selon l’API Palo.
- Cube : minimum **2** dimensions d’axe.
- Seules les dimensions de type **normale** entrent dans un cube (pas les dims d’attributs / système).
- Consolidation : le parent doit être (ou devenir) de type consolidé ; les poids sont numériques.
- Les opérations d’écriture exigent une session valide ; en cas de jeton périmé / session expirée → reconnecter et message clair.
- Les comptes réservés (`admin`, etc.) ne sont pas supprimables comme un user métier.

---

## 6. Exigences non fonctionnelles (fonctionnelles « qualité »)

| ID | Exigence |
|----|----------|
| **NF-01** | Temps de réponse perçu : listes et arbres utilisables jusqu’à des milliers d’éléments (pagination ou chargement progressif si besoin). |
| **NF-02** | Messages d’erreur en français (cible produit) ; codes/erreurs Palo lisibles. |
| **NF-03** | Pas de perte silencieuse : échec API → toast / dialogue, pas de faux succès. |
| **NF-04** | Même comportement fonctionnel web et Excel pour le MVP P0 (écarts documentés). |
| **NF-05** | Compatible serveur Palo du dépôt `palo-server` (API HTTP existante). |

---

## 7. Hors périmètre (pour ce cahier)

- Moteur de formules tableur complet (`PALO.DATA`, etc.) — cahier add-in Excel séparé.
- ETL / import massif type PalOOCa `dataimport` (P2 seulement).
- Compatibilité XMLA / autres moteurs OLAP (PalOOCa le faisait en lecture ; hors scope Palo-only).
- Recréation pixel-perfect du Look & Feel Swing PalOOCa.

---

## 8. Cartographie avec l’existant

| Fonction PalOOCa / CDC | UI web `/` (admin JS) aujourd’hui | Excel add-in |
|------------------------|-----------------------------------|--------------|
| Connexions multi-serveurs | URL saisie à la connexion (1 serveur) | Panneau connexion (à aligner) |
| Bases CRUD | Liste + création (pas delete/rename) | À faire |
| Dimensions CRUD | Création + destroy | À faire |
| Éléments + arbre + consolidations | Oui (MVP avancé) | À faire |
| Cubes création shuttle + ordre | Création simplifiée | À faire |
| Règles | Create/destroy | À faire |
| Users / groupes / rôles | Users basique (System) | À faire |
| View / Subset / Paste | Non | Cible Excel P2 |

Écarts UI web à combler en priorité pour coller au P0 : **rename**, **delete base**, **UI création cube type shuttle** (ordre des dims), **gestion connexions enregistrées** (optionnel).

---

## 9. Critères d’acceptation (recette MVP P0)

1. Je peux enregistrer une connexion, me connecter et voir la liste des bases.
2. Je crée une base `demo`, une dimension `Mesures` avec éléments `CA` et `Quantité` (numériques), une dimension `Produits` avec une consolidation, un cube `Ventes` sur ces 2+ dimensions : succès sans erreur API.
3. L’arbre reflète la hiérarchie d’éléments après consolidation.
4. Je renomme un élément et un cube ; je supprime un élément vide de données avec confirmation.
5. Tentative de cube avec 1 seule dimension → refus avec message clair.
6. Nom de cube déjà pris → refus avec message clair.
7. Déconnexion puis reconnexion : l’UI redevient opérationnelle.

---

## 10. Livrables attendus

- Implémentation UI (web et/ou Excel) couvrant §3.1.
- Mise à jour de `documentation/admin-ui.md` (cases TODO → fait) au fur et à mesure.
- Jeu de recette manuel basé sur §9.

---

## 11. Références

- PalOOCa Modeler : `org.palooca.dialogs.Modeller` + `CreateCubeDialog`, `ConsolidationFactorDialog`, `InsertElementDialog`, nœuds `dialogs/nodes/*`
- Projet : https://sourceforge.net/p/palooca/
- UI web actuelle : `admin/`, URL `/` (fichiers sous `Api/explore/`)
- Spec admin historique (plus large / lacunaire) : `cahiers des charges/README.md`

---

*Document rédigé à partir de l’analyse fonctionnelle du code PalOOCa (r86) — à faire évoluer par dictée / priorisation produit.*
