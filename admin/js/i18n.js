/**
 * i18n Modeleur Palo — fr / en / de
 * Clés = texte français (fallback si traduction absente).
 * Usage : t('Base créée.')  |  t('Supprimer « {name} » ?', { name: x })
 */
(function (global) {
  var STORAGE_KEY = 'palo.ui.locale';
  var SUPPORTED = ['fr', 'en', 'de'];

  var LOCALES = {
    fr: {},
    en: {
      'Modeleur Palo': 'Palo Modeller',
      'Serveur\u00a0: …': 'Server: …',
      'Serveur\u00a0: ': 'Server: ',
      Identifiant: 'Username',
      'Mot de passe': 'Password',
      Connexion: 'Sign in',
      Déconnexion: 'Sign out',
      'Documentation API': 'API documentation',
      Rafraîchir: 'Refresh',
      'Nouvelle base': 'New database',
      'Sélectionnez une base, une dimension ou un cube dans l’arbre.':
        'Select a database, dimension or cube in the tree.',
      Annuler: 'Cancel',
      Fermer: 'Close',
      'Session expirée': 'Session expired',
      'La connexion au serveur Palo a expiré (inactivité). Reconnectez-vous pour continuer.':
        'The Palo server session has expired (inactivity). Sign in again to continue.',
      'Se reconnecter': 'Sign in again',
      Langue: 'Language',
      '— défaut': '— default',
      'N — aucun': 'N — none',
      'R — lire': 'R — read',
      'W — écrire': 'W — write',
      'D — supprimer': 'D — delete',
      'S — splash': 'S — splash',
      'Nom requis.': 'Name required.',
      'Base de données': 'Database',
      'Pour ajouter une dimension ou un cube, utilisez le « + » sur les dossiers <strong>Dimensions</strong> / <strong>Cubes</strong> dans l’arbre.':
        'To add a dimension or cube, use « + » on the <strong>Dimensions</strong> / <strong>Cubes</strong> folders in the tree.',
      'Renommer la base': 'Rename database',
      'Supprimer la base': 'Delete database',
      'Renommer la base': 'Rename database',
      'Nouveau nom': 'New name',
      'Base renommée.': 'Database renamed.',
      'Supprimer la base « {name} » ?': 'Delete database “{name}”?',
      'Base supprimée.': 'Database deleted.',
      Dimensions: 'Dimensions',
      Cubes: 'Cubes',
      'Nouvelle dimension': 'New dimension',
      'Nouveau cube': 'New cube',
      'Aucune dimension.': 'No dimensions.',
      'Aucun cube.': 'No cubes.',
      'Renommer la dimension': 'Rename dimension',
      'Supprimer la dimension': 'Delete dimension',
      'Nouvel élément': 'New element',
      Éléments: 'Elements',
      Attributs: 'Attributes',
      Chargement: 'Loading',
      'Chargement…': 'Loading…',
      'Dimension renommée.': 'Dimension renamed.',
      'Supprimer la dimension « {name} » ?': 'Delete dimension “{name}”?',
      'Dimension supprimée.': 'Dimension deleted.',
      'Pas de dimension d’attributs pour cette dimension.': 'No attribute dimension for this dimension.',
      'Nouvel attribut': 'New attribute',
      Supprimer: 'Delete',
      'Supprimer l’attribut « {name} » ?': 'Delete attribute “{name}”?',
      'Attribut supprimé.': 'Attribute deleted.',
      'Aucun attribut.': 'No attributes.',
      'Attribut créé.': 'Attribute created.',
      'Les attributs Palo sont portés par une dimension sœur #_… ; les valeurs se gèrent dans le cube d’attributs.':
        'Palo attributes are carried by a sibling #_… dimension; values are managed in the attribute cube.',
      'Aucun élément. Les « mesures » sont des éléments numériques d’une dimension (ex. Mesures).':
        'No elements. “Measures” are numeric elements of a dimension (e.g. Measures).',
      'Consolidation…': 'Consolidation…',
      Renommer: 'Rename',
      'Élément renommé.': 'Element renamed.',
      'Supprimer l’élément « {name} » ?': 'Delete element “{name}”?',
      'Élément créé.': 'Element created.',
      'Élément supprimé.': 'Element deleted.',
      'Renommer le cube': 'Rename cube',
      'Vider les valeurs': 'Clear values',
      'Supprimer le cube': 'Delete cube',
      'Dimensions du cube': 'Cube dimensions',
      'Les axes d’un cube sont fixés à la création (API Palo) : on ne peut pas en ajouter ni en retirer ensuite. Pour changer le modèle, créer un nouveau cube.':
        'Cube axes are fixed at creation (Palo API): you cannot add or remove them later. To change the model, create a new cube.',
      Règles: 'Rules',
      'Nouvelle règle': 'New rule',
      'Cube renommé.': 'Cube renamed.',
      'Vider toutes les valeurs du cube « {name} » ?': 'Clear all values of cube “{name}”?',
      'Cube vidé.': 'Cube cleared.',
      'Supprimer le cube « {name} » ?': 'Delete cube “{name}”?',
      'Cube créé.': 'Cube created.',
      'Cube supprimé.': 'Cube deleted.',
      'Aucune règle. Utilisez le bouton « + » à côté de Règles.':
        'No rules. Use the « + » button next to Rules.',
      'Éditer la règle': 'Edit rule',
      Monter: 'Move up',
      Descendre: 'Move down',
      'Règle activée.': 'Rule enabled.',
      'Règle désactivée.': 'Rule disabled.',
      'Supprimer cette règle ?': 'Delete this rule?',
      'Règle supprimée.': 'Rule deleted.',
      'Modifier la règle': 'Edit rule',
      'Nouvelle règle': 'New rule',
      Définition: 'Definition',
      Commentaire: 'Comment',
      Vérifier: 'Check',
      'Définition vide.': 'Empty definition.',
      'Vérification…': 'Checking…',
      OK: 'OK',
      'Définition requise.': 'Definition required.',
      'Règle mise à jour.': 'Rule updated.',
      'Règle créée.': 'Rule created.',
      Administration: 'Administration',
      'Utilisateurs, groupes, rôles et droits — associations et permissions en sous-menus.':
        'Users, groups, roles and rights — associations and permissions in submenus.',
      'Utilisateurs': 'Users',
      'Groupes': 'Groups',
      'Rôles': 'Roles',
      'Appartenance groupes': 'Group membership',
      'Rôles des groupes': 'Group roles',
      'Droits databases': 'Database rights',
      'Droits cubes': 'Cube rights',
      'Droits dimensions': 'Dimension rights',
      'Droits des rôles': 'Role rights',
      'Utilisateurs</strong> : liste ; sous-menu <em>Appartenance groupes</em>':
        'Users</strong>: list; submenu <em>Group membership</em>',
      'Groupes</strong> : liste ; sous-menus <em>Rôles</em> et <em>Droits</em> (databases / cubes / dimensions)':
        'Groups</strong>: list; submenus <em>Roles</em> and <em>Rights</em> (databases / cubes / dimensions)',
      'Rôles</strong> : liste ; sous-menu <em>Droits des rôles</em> (par type d’objet)':
        'Roles</strong>: list; submenu <em>Role rights</em> (by object type)',
      'Base System introuvable.': 'System database not found.',
      'Aucune donnée à afficher.': 'No data to display.',
      Accès: 'Access',
      'Dimension #_USER_ absente.': '#_USER_ dimension missing.',
      'Droit insuffisant pour lister les utilisateurs.': 'Insufficient rights to list users.',
      'Droit insuffisant.': 'Insufficient rights.',
      'Nouvel utilisateur': 'New user',
      'Mot de passe initial': 'Initial password',
      'Identifiant requis.': 'Username required.',
      'Mot de passe requis.': 'Password required.',
      'Identifiant réservé.': 'Reserved username.',
      'Utilisateur créé.': 'User created.',
      'Mot de passe — {name}': 'Password — {name}',
      'Nouveau mot de passe': 'New password',
      'Mot de passe mis à jour.': 'Password updated.',
      'Supprimer l’utilisateur « {name} » ?': 'Delete user “{name}”?',
      'Utilisateur supprimé.': 'User deleted.',
      'Utilisateurs → groupes': 'Users → groups',
      'Association utilisateur ↔ groupe. Lignes = utilisateurs, colonnes = groupes.':
        'User ↔ group association. Rows = users, columns = groups.',
      'Groupe associé.': 'Group linked.',
      'Groupe retiré.': 'Group removed.',
      'Dimension #_GROUP_ absente.': '#_GROUP_ dimension missing.',
      Groupe: 'Group',
      'Groupes → rôles': 'Groups → roles',
      'Association groupe ↔ rôle. Lignes = rôles, colonnes = groupes.':
        'Group ↔ role association. Rows = roles, columns = groups.',
      'Rôle associé.': 'Role linked.',
      'Rôle retiré.': 'Role removed.',
      'Dimension #_ROLE_ absente.': '#_ROLE_ dimension missing.',
      Rôle: 'Role',
      'Droit insuffisant pour lire les droits.': 'Insufficient rights to read permissions.',
      'Rôles → droits': 'Roles → rights',
      'Droits par type d’objet. Lignes = accès, colonnes = rôles. ':
        'Rights by object type. Rows = access, columns = roles. ',
      'Niveaux : <code>N</code> none, <code>R</code> read, <code>W</code> write, <code>D</code> delete, <code>S</code> splash.':
        'Levels: <code>N</code> none, <code>R</code> read, <code>W</code> write, <code>D</code> delete, <code>S</code> splash.',
      'Droit « {val} » enregistré.': 'Right “{val}” saved.',
      'Groupes → databases': 'Groups → databases',
      'Chemin <strong>Groupe → database</strong>. Lignes = groupes, colonnes = databases. ':
        'Path <strong>Group → database</strong>. Rows = groups, columns = databases. ',
      'Niveaux N/R/W/D/S ; <code>—</code> = défaut serveur.':
        'Levels N/R/W/D/S; <code>—</code> = server default.',
      'Droit database « {val} ».': 'Database right “{val}”.',
      'Droit database remis au défaut.': 'Database right reset to default.',
      'Accès cubes': 'Cube access',
      'Aucune database.': 'No database.',
      'Groupes → cubes': 'Groups → cubes',
      Database: 'Database',
      'Chemin <strong>Groupe → cube</strong>. Lignes = groupes, colonnes = cubes ':
        'Path <strong>Group → cube</strong>. Rows = groups, columns = cubes ',
      'Droit cube « {val} ».': 'Cube right “{val}”.',
      'Droit cube remis au défaut.': 'Cube right reset to default.',
      'Accès dimensions': 'Dimension access',
      'Groupes → dimensions': 'Groups → dimensions',
      Dimension: 'Dimension',
      'Chemin <strong>Groupe → élément</strong>. Lignes = groupes, colonnes = éléments ':
        'Path <strong>Group → element</strong>. Rows = groups, columns = elements ',
      '(aucune dimension)': '(no dimension)',
      'Choisissez une dimension.': 'Choose a dimension.',
      'Dimension introuvable.': 'Dimension not found.',
      'Droit élément « {val} ».': 'Element right “{val}”.',
      'Droit élément remis au défaut.': 'Element right reset to default.',
      'Nom de la dimension': 'Dimension name',
      'Dimension créée.': 'Dimension created.',
      'Numérique (mesure)': 'Numeric (measure)',
      Texte: 'Text',
      Consolidé: 'Consolidated',
      Type: 'Type',
      Nom: 'Name',
      'Sélectionnez un élément (bouton consolidation sur sa ligne).':
        'Select an element (consolidation button on its row).',
      'Aucun enfant — ajoutez-en via le menu.': 'No children — add some via the menu.',
      'Chaque poids doit être un nombre.': 'Each weight must be a number.',
      '— choisir un élément —': '— choose an element —',
      'Choisissez un enfant à ajouter.': 'Choose a child to add.',
      'Cet enfant est déjà dans la liste.': 'This child is already in the list.',
      'Consolidation enregistrée.': 'Consolidation saved.',
      'Il faut au moins 2 dimensions dans la base avant de créer un cube.':
        'At least 2 dimensions are required in the database before creating a cube.',
      'Dimensions disponibles': 'Available dimensions',
      'Dimensions du cube (ordre = axes)': 'Cube dimensions (order = axes)',
      'Sélectionnez au moins 2 dimensions.': 'Select at least 2 dimensions.',
      'Identifiant et mot de passe requis.': 'Username and password required.',
      'Droit insuffisant pour créer une base.': 'Insufficient rights to create a database.',
      'Nom de la base': 'Database name',
      'Base créée.': 'Database created.',
      'Aucune base. Créez-en une avec le bouton « + » de la barre latérale.':
        'No database. Create one with the « + » button in the sidebar.',
      'Reconnecté.': 'Signed in again.',
      'Insérer [ ] puis les éléments \'Dim\':\'Élément\' (sans crochets). Plusieurs éléments : séparer par des virgules. Autre cube → PALO.DATA.':
        'Insert [ ] then elements \'Dim\':\'Element\' (without brackets). Multiple elements: separate with commas. Other cube → PALO.DATA.',
      'Référence (database : cube : dimension : élément)':
        'Reference (database : cube : dimension : element)',
      'Opérateur / fonction': 'Operator / function',
      '— choisir —': '— choose —',
      '(courant)': '(current)',
      '[ ]  zone': '[ ]  area',
      '=  égalité': '=  equality',
      '+  addition': '+  addition',
      '−  soustraction': '−  subtraction',
      '×  multiplication': '×  multiplication',
      '÷  division': '÷  division',
      '( )  parenthèses': '( )  parentheses',
      '<  inférieur': '<  less than',
      '>  supérieur': '>  greater than',
      '<=  inférieur ou égal': '<=  less or equal',
      '>=  supérieur ou égal': '>=  greater or equal',
      '<>  différent': '<>  not equal',
      'Utilisateurs</strong> : liste ; sous-menu <em>Appartenance groupes</em></li>':
        'Users</strong>: list; submenu <em>Group membership</em></li>',
      'créé.': 'created.',
      'Renommé.': 'Renamed.',
      'Supprimé.': 'Deleted.',
      'Supprimer « {name} » ?': 'Delete “{name}”?',
      'Nouveau — {label}': 'New — {label}',
      'Droit insuffisant pour les droits par instance.': 'Insufficient rights for instance permissions.',
      'Cube #_USER_GROUP ou dimensions utilisateur/groupe introuvables.':
        '#_USER_GROUP cube or user/group dimensions not found.',
      'Cube #_GROUP_ROLE ou dimensions groupe/rôle introuvables.':
        '#_GROUP_ROLE cube or group/role dimensions not found.',
      'Cube #_ROLE_RIGHT_OBJECT ou dimensions introuvables.':
        '#_ROLE_RIGHT_OBJECT cube or dimensions not found.',
      'Cube #_GROUP_DATABASE_DATA ou dimensions #_DATABASE_ / #_GROUP_ introuvables.':
        '#_GROUP_DATABASE_DATA cube or #_DATABASE_ / #_GROUP_ dimensions not found.',
      'Utilisateurs</strong> : liste ; sous-menu <em>Appartenance groupes</em>':
        'Users</strong>: list; submenu <em>Group membership</em>',
      'Liste ; sous-menu': 'List; submenu',
      'cellules': 'cells',
      'remplies': 'filled',
      'Aucune donnée à afficher.': 'No data to display.',
      'Les valeurs d’attributs se saisissent dans le cube d’attributs (#{id}). Édition cellule par cellule prévue en raffinement.': 'Attribute values are entered in the attribute cube (#{id}). Cell-by-cell editing is planned as a refinement.',
      'liste ; sous-menu <em>Appartenance groupes</em>': 'list; submenu <em>Group membership</em>',
      'liste ; sous-menus <em>Rôles</em> et <em>Droits</em> (databases / cubes / dimensions)': 'list; submenus <em>Roles</em> and <em>Rights</em> (databases / cubes / dimensions)',
      'liste ; sous-menu <em>Droits des rôles</em> (par type d’objet)': 'list; submenu <em>Role rights</em> (by object type)',
      'Chemin <strong>Groupe → cube</strong>. Lignes = groupes, colonnes = cubes (<code>#_GROUP_CUBE_DATA</code>). <code>—</code> = défaut.': 'Path <strong>Group → cube</strong>. Rows = groups, columns = cubes (<code>#_GROUP_CUBE_DATA</code>). <code>—</code> = default.',
      'Chemin <strong>Groupe → élément</strong>. Lignes = groupes, colonnes = éléments (<code>#_GROUP_DIMENSION_DATA_&lt;Dim&gt;</code>). <code>—</code> = défaut.': 'Path <strong>Group → element</strong>. Rows = groups, columns = elements (<code>#_GROUP_DIMENSION_DATA_&lt;Dim&gt;</code>). <code>—</code> = default.',
      '#_GROUP_CUBE_DATA / #_CUBE_ / #_GROUP_ introuvables dans cette database.': '#_GROUP_CUBE_DATA / #_CUBE_ / #_GROUP_ not found in this database.',
      'Cube <code>{name}</code> ou dimension <code>#_GROUP_</code> introuvable.': 'Cube <code>{name}</code> or dimension <code>#_GROUP_</code> not found.',
      'Consolidation — {name}': 'Consolidation — {name}',
      'Parent :': 'Parent:',
      'Ajouter un enfant': 'Add a child',
      'Ajouter': 'Add',
      'Enfants (poids modifiables) :': 'Children (editable weights):',
      'Ajoutez au moins un enfant.': 'Add at least one child.',
      'Poids': 'Weight',
      'Retirer': 'Remove',
      'Consolidation cyclique interdite.': 'Cyclic consolidation is not allowed.',
      'Cellules remplies : {filled} / {total}': 'Filled cells: {filled} / {total}',
      'Désactiver la règle': 'Disable rule',
      'Activer la règle': 'Enable rule',
      '[\'Dim\':\'Élément\'] = [\'Dim\':\'Élément\'] * 1': '[\'Dim\':\'Element\'] = [\'Dim\':\'Element\'] * 1',
      'Les attributs Palo sont portés par une dimension sœur #_… ; les valeurs se gèrent dans le cube d’attributs.': 'Palo attributes are carried by a sibling #_… dimension; values are managed in the attribute cube.',
      'Renommer l’élément': 'Rename element',
      'Identifiant': 'Username',
      'Ouvrez Dimensions ou Cubes pour explorer et modifier le contenu de cette base.': 'Open Dimensions or Cubes to browse and edit this database.',
      'Liste des dimensions de la base. Cliquez une ligne pour gérer ses éléments.': 'Dimensions in this database. Click a row to manage its elements.',
      'Liste des cubes de la base. Cliquez une ligne pour voir les axes et les règles.': 'Cubes in this database. Click a row to see axes and rules.',
      'Valeurs possibles de cette dimension (y compris les mesures). Ajoutez, renommez ou consolidez ici.': 'Possible values for this dimension (including measures). Add, rename or consolidate them here.',
      'Propriétés associées aux éléments (par ex. une description ou un code).': 'Properties attached to elements (for example a description or a code).',
      'Les valeurs se renseignent ensuite dans le cube d’attributs associé (#{id}).': 'Values are then entered in the related attribute cube (#{id}).',
      'Aucun élément pour l’instant. Ajoutez-en avec le bouton +.': 'No elements yet. Add some with the + button.',
      'Ces dimensions forment les axes du cube ; elles sont fixées à la création.': 'These dimensions are the cube axes; they are fixed at creation.',
      'Les règles calculent automatiquement certaines cellules du cube.': 'Rules automatically calculate some cells of the cube.',
      'Aucune règle pour l’instant. Créez-en une avec le bouton +.': 'No rules yet. Create one with the + button.',
      'Gérez les comptes, les groupes et les permissions d’accès.': 'Manage accounts, groups and access permissions.',
      'Comptes pouvant se connecter. Créez un utilisateur, changez un mot de passe ou supprimez un compte.': 'Accounts that can sign in. Create a user, change a password or delete an account.',
      'Cochez les cases pour indiquer à quels groupes appartient chaque utilisateur.': 'Tick the boxes to set which groups each user belongs to.',
      'Les groupes rassemblent des utilisateurs pour leur donner les mêmes droits.': 'Groups gather users so they share the same rights.',
      'Les rôles définissent ce que les utilisateurs ont le droit de faire.': 'Roles define what users are allowed to do.',
      'Cochez les cases pour associer un rôle (permissions) à chaque groupe.': 'Tick the boxes to assign a role (permissions) to each group.',
      'Pour chaque rôle, choisissez le niveau d’accès : aucun, lire, écrire, supprimer ou splash.': 'For each role, choose the access level: none, read, write, delete or splash.',
      'Indiquez, pour chaque groupe, ce qu’il peut faire sur chaque base de données. Le tiret laisse le défaut.': 'For each group, set what it can do on each database. A dash keeps the default.',
      'Choisissez une base, puis indiquez ce que chaque groupe peut faire sur ses cubes. Le tiret laisse le défaut.': 'Pick a database, then set what each group can do on its cubes. A dash keeps the default.',
      'Choisissez une base et une dimension, puis indiquez ce que chaque groupe peut faire sur ses éléments. Le tiret laisse le défaut.': 'Pick a database and a dimension, then set what each group can do on its elements. A dash keeps the default.',
      'Ces droits ne sont pas accessibles avec votre compte (lecture réservée aux rôles ayant le droit « rights »).': 'These rights are not available with your account (read requires the “rights” role privilege).',
      'Ces droits sont réservés aux membres du groupe admin.': 'These rights are reserved for members of the admin group.',
    },
    de: {
      'Modeleur Palo': 'Palo Modellierer',
      'Serveur\u00a0: …': 'Server: …',
      'Serveur\u00a0: ': 'Server: ',
      Identifiant: 'Benutzername',
      'Mot de passe': 'Passwort',
      Connexion: 'Anmelden',
      Déconnexion: 'Abmelden',
      'Documentation API': 'API-Dokumentation',
      Rafraîchir: 'Aktualisieren',
      'Nouvelle base': 'Neue Datenbank',
      'Sélectionnez une base, une dimension ou un cube dans l’arbre.':
        'Wählen Sie eine Datenbank, Dimension oder einen Würfel im Baum.',
      Annuler: 'Abbrechen',
      Fermer: 'Schließen',
      'Session expirée': 'Sitzung abgelaufen',
      'La connexion au serveur Palo a expiré (inactivité). Reconnectez-vous pour continuer.':
        'Die Verbindung zum Palo-Server ist abgelaufen (Inaktivität). Melden Sie sich erneut an.',
      'Se reconnecter': 'Erneut anmelden',
      Langue: 'Sprache',
      '— défaut': '— Standard',
      'N — aucun': 'N — keine',
      'R — lire': 'R — lesen',
      'W — écrire': 'W — schreiben',
      'D — supprimer': 'D — löschen',
      'S — splash': 'S — splash',
      'Nom requis.': 'Name erforderlich.',
      'Base de données': 'Datenbank',
      'Pour ajouter une dimension ou un cube, utilisez le « + » sur les dossiers <strong>Dimensions</strong> / <strong>Cubes</strong> dans l’arbre.':
        'Zum Hinzufügen einer Dimension oder eines Würfels verwenden Sie « + » bei <strong>Dimensions</strong> / <strong>Cubes</strong> im Baum.',
      'Renommer la base': 'Datenbank umbenennen',
      'Supprimer la base': 'Datenbank löschen',
      'Nouveau nom': 'Neuer Name',
      'Base renommée.': 'Datenbank umbenannt.',
      'Supprimer la base « {name} » ?': 'Datenbank „{name}“ löschen?',
      'Base supprimée.': 'Datenbank gelöscht.',
      Dimensions: 'Dimensionen',
      Cubes: 'Würfel',
      'Nouvelle dimension': 'Neue Dimension',
      'Nouveau cube': 'Neuer Würfel',
      'Aucune dimension.': 'Keine Dimensionen.',
      'Aucun cube.': 'Keine Würfel.',
      'Renommer la dimension': 'Dimension umbenennen',
      'Supprimer la dimension': 'Dimension löschen',
      'Nouvel élément': 'Neues Element',
      Éléments: 'Elemente',
      Attributs: 'Attribute',
      'Chargement…': 'Laden…',
      'Dimension renommée.': 'Dimension umbenannt.',
      'Supprimer la dimension « {name} » ?': 'Dimension „{name}“ löschen?',
      'Dimension supprimée.': 'Dimension gelöscht.',
      'Pas de dimension d’attributs pour cette dimension.': 'Keine Attributdimension für diese Dimension.',
      'Nouvel attribut': 'Neues Attribut',
      Supprimer: 'Löschen',
      'Supprimer l’attribut « {name} » ?': 'Attribut „{name}“ löschen?',
      'Attribut supprimé.': 'Attribut gelöscht.',
      'Aucun attribut.': 'Keine Attribute.',
      'Attribut créé.': 'Attribut erstellt.',
      'Aucun élément. Les « mesures » sont des éléments numériques d’une dimension (ex. Mesures).':
        'Keine Elemente. „Kennzahlen“ sind numerische Elemente einer Dimension (z. B. Measures).',
      'Consolidation…': 'Konsolidierung…',
      Renommer: 'Umbenennen',
      'Élément renommé.': 'Element umbenannt.',
      'Supprimer l’élément « {name} » ?': 'Element „{name}“ löschen?',
      'Élément créé.': 'Element erstellt.',
      'Élément supprimé.': 'Element gelöscht.',
      'Renommer le cube': 'Würfel umbenennen',
      'Vider les valeurs': 'Werte leeren',
      'Supprimer le cube': 'Würfel löschen',
      'Dimensions du cube': 'Würfeldimensionen',
      'Les axes d’un cube sont fixés à la création (API Palo) : on ne peut pas en ajouter ni en retirer ensuite. Pour changer le modèle, créer un nouveau cube.':
        'Würfelachsen werden bei der Erstellung festgelegt (Palo-API): danach nicht änderbar. Für ein neues Modell einen neuen Würfel anlegen.',
      Règles: 'Regeln',
      'Nouvelle règle': 'Neue Regel',
      'Cube renommé.': 'Würfel umbenannt.',
      'Vider toutes les valeurs du cube « {name} » ?': 'Alle Werte des Würfels „{name}“ leeren?',
      'Cube vidé.': 'Würfel geleert.',
      'Supprimer le cube « {name} » ?': 'Würfel „{name}“ löschen?',
      'Cube créé.': 'Würfel erstellt.',
      'Cube supprimé.': 'Würfel gelöscht.',
      'Aucune règle. Utilisez le bouton « + » à côté de Règles.':
        'Keine Regeln. Verwenden Sie die Schaltfläche « + » neben Regeln.',
      'Éditer la règle': 'Regel bearbeiten',
      Monter: 'Nach oben',
      Descendre: 'Nach unten',
      'Règle activée.': 'Regel aktiviert.',
      'Règle désactivée.': 'Regel deaktiviert.',
      'Supprimer cette règle ?': 'Diese Regel löschen?',
      'Règle supprimée.': 'Regel gelöscht.',
      'Modifier la règle': 'Regel bearbeiten',
      Définition: 'Definition',
      Commentaire: 'Kommentar',
      Vérifier: 'Prüfen',
      'Définition vide.': 'Leere Definition.',
      'Vérification…': 'Prüfung…',
      'Définition requise.': 'Definition erforderlich.',
      'Règle mise à jour.': 'Regel aktualisiert.',
      'Règle créée.': 'Regel erstellt.',
      Administration: 'Administration',
      'Utilisateurs, groupes, rôles et droits — associations et permissions en sous-menus.':
        'Benutzer, Gruppen, Rollen und Rechte — Zuordnungen und Berechtigungen in Untermenüs.',
      Utilisateurs: 'Benutzer',
      Groupes: 'Gruppen',
      Rôles: 'Rollen',
      'Appartenance groupes': 'Gruppenmitgliedschaft',
      'Rôles des groupes': 'Gruppenrollen',
      'Droits databases': 'Datenbankrechte',
      'Droits cubes': 'Würfelrechte',
      'Droits dimensions': 'Dimensionsrechte',
      'Droits des rôles': 'Rollenrechte',
      'Base System introuvable.': 'System-Datenbank nicht gefunden.',
      'Aucune donnée à afficher.': 'Keine Daten vorhanden.',
      Accès: 'Zugriff',
      'Dimension #_USER_ absente.': 'Dimension #_USER_ fehlt.',
      'Droit insuffisant pour lister les utilisateurs.': 'Unzureichende Rechte zum Auflisten der Benutzer.',
      'Droit insuffisant.': 'Unzureichende Rechte.',
      'Nouvel utilisateur': 'Neuer Benutzer',
      'Mot de passe initial': 'Initiales Passwort',
      'Identifiant requis.': 'Benutzername erforderlich.',
      'Mot de passe requis.': 'Passwort erforderlich.',
      'Identifiant réservé.': 'Reservierter Benutzername.',
      'Utilisateur créé.': 'Benutzer erstellt.',
      'Mot de passe — {name}': 'Passwort — {name}',
      'Nouveau mot de passe': 'Neues Passwort',
      'Mot de passe mis à jour.': 'Passwort aktualisiert.',
      'Supprimer l’utilisateur « {name} » ?': 'Benutzer „{name}“ löschen?',
      'Utilisateur supprimé.': 'Benutzer gelöscht.',
      'Utilisateurs → groupes': 'Benutzer → Gruppen',
      'Association utilisateur ↔ groupe. Lignes = utilisateurs, colonnes = groupes.':
        'Zuordnung Benutzer ↔ Gruppe. Zeilen = Benutzer, Spalten = Gruppen.',
      'Groupe associé.': 'Gruppe verknüpft.',
      'Groupe retiré.': 'Gruppe entfernt.',
      'Dimension #_GROUP_ absente.': 'Dimension #_GROUP_ fehlt.',
      Groupe: 'Gruppe',
      'Groupes → rôles': 'Gruppen → Rollen',
      'Association groupe ↔ rôle. Lignes = rôles, colonnes = groupes.':
        'Zuordnung Gruppe ↔ Rolle. Zeilen = Rollen, Spalten = Gruppen.',
      'Rôle associé.': 'Rolle verknüpft.',
      'Rôle retiré.': 'Rolle entfernt.',
      'Dimension #_ROLE_ absente.': 'Dimension #_ROLE_ fehlt.',
      Rôle: 'Rolle',
      'Droit insuffisant pour lire les droits.': 'Unzureichende Rechte zum Lesen der Berechtigungen.',
      'Rôles → droits': 'Rollen → Rechte',
      'Droits par type d’objet. Lignes = accès, colonnes = rôles. ':
        'Rechte nach Objekttyp. Zeilen = Zugriff, Spalten = Rollen. ',
      'Niveaux : <code>N</code> none, <code>R</code> read, <code>W</code> write, <code>D</code> delete, <code>S</code> splash.':
        'Stufen: <code>N</code> none, <code>R</code> read, <code>W</code> write, <code>D</code> delete, <code>S</code> splash.',
      'Droit « {val} » enregistré.': 'Recht „{val}“ gespeichert.',
      'Groupes → databases': 'Gruppen → Datenbanken',
      'Chemin <strong>Groupe → database</strong>. Lignes = groupes, colonnes = databases. ':
        'Pfad <strong>Gruppe → Datenbank</strong>. Zeilen = Gruppen, Spalten = Datenbanken. ',
      'Niveaux N/R/W/D/S ; <code>—</code> = défaut serveur.':
        'Stufen N/R/W/D/S; <code>—</code> = Serverstandard.',
      'Droit database « {val} ».': 'Datenbankrecht „{val}“.',
      'Droit database remis au défaut.': 'Datenbankrecht auf Standard zurückgesetzt.',
      'Accès cubes': 'Würfelzugriff',
      'Aucune database.': 'Keine Datenbank.',
      'Groupes → cubes': 'Gruppen → Würfel',
      Database: 'Datenbank',
      'Chemin <strong>Groupe → cube</strong>. Lignes = groupes, colonnes = cubes ':
        'Pfad <strong>Gruppe → Würfel</strong>. Zeilen = Gruppen, Spalten = Würfel ',
      'Droit cube « {val} ».': 'Würfelrecht „{val}“.',
      'Droit cube remis au défaut.': 'Würfelrecht auf Standard zurückgesetzt.',
      'Accès dimensions': 'Dimensionszugriff',
      'Groupes → dimensions': 'Gruppen → Dimensionen',
      Dimension: 'Dimension',
      'Chemin <strong>Groupe → élément</strong>. Lignes = groupes, colonnes = éléments ':
        'Pfad <strong>Gruppe → Element</strong>. Zeilen = Gruppen, Spalten = Elemente ',
      '(aucune dimension)': '(keine Dimension)',
      'Choisissez une dimension.': 'Dimension wählen.',
      'Dimension introuvable.': 'Dimension nicht gefunden.',
      'Droit élément « {val} ».': 'Elementrecht „{val}“.',
      'Droit élément remis au défaut.': 'Elementrecht auf Standard zurückgesetzt.',
      'Nom de la dimension': 'Dimensionsname',
      'Dimension créée.': 'Dimension erstellt.',
      'Numérique (mesure)': 'Numerisch (Kennzahl)',
      Texte: 'Text',
      Consolidé: 'Konsolidiert',
      Type: 'Typ',
      Nom: 'Name',
      'Sélectionnez un élément (bouton consolidation sur sa ligne).':
        'Element auswählen (Konsolidierungsschaltfläche in der Zeile).',
      'Aucun enfant — ajoutez-en via le menu.': 'Keine Kinder — über das Menü hinzufügen.',
      'Chaque poids doit être un nombre.': 'Jedes Gewicht muss eine Zahl sein.',
      '— choisir un élément —': '— Element wählen —',
      'Choisissez un enfant à ajouter.': 'Kind zum Hinzufügen wählen.',
      'Cet enfant est déjà dans la liste.': 'Dieses Kind ist bereits in der Liste.',
      'Consolidation enregistrée.': 'Konsolidierung gespeichert.',
      'Il faut au moins 2 dimensions dans la base avant de créer un cube.':
        'Mindestens 2 Dimensionen in der Datenbank erforderlich, bevor ein Würfel erstellt wird.',
      'Dimensions disponibles': 'Verfügbare Dimensionen',
      'Dimensions du cube (ordre = axes)': 'Würfeldimensionen (Reihenfolge = Achsen)',
      'Sélectionnez au moins 2 dimensions.': 'Mindestens 2 Dimensionen auswählen.',
      'Identifiant et mot de passe requis.': 'Benutzername und Passwort erforderlich.',
      'Droit insuffisant pour créer une base.': 'Unzureichende Rechte zum Erstellen einer Datenbank.',
      'Nom de la base': 'Datenbankname',
      'Base créée.': 'Datenbank erstellt.',
      'Aucune base. Créez-en une avec le bouton « + » de la barre latérale.':
        'Keine Datenbank. Erstellen Sie eine mit der Schaltfläche « + » in der Seitenleiste.',
      'Reconnecté.': 'Erneut angemeldet.',
      'Insérer [ ] puis les éléments \'Dim\':\'Élément\' (sans crochets). Plusieurs éléments : séparer par des virgules. Autre cube → PALO.DATA.':
        '[ ] einfügen, dann Elemente \'Dim\':\'Element\' (ohne Klammern). Mehrere Elemente: durch Kommas trennen. Anderer Würfel → PALO.DATA.',
      'Référence (database : cube : dimension : élément)':
        'Referenz (database : cube : dimension : element)',
      'Opérateur / fonction': 'Operator / Funktion',
      '— choisir —': '— wählen —',
      '(courant)': '(aktuell)',
      '[ ]  zone': '[ ]  Bereich',
      'Renommé.': 'Umbenannt.',
      'Supprimé.': 'Gelöscht.',
      'Supprimer « {name} » ?': '„{name}“ löschen?',
      'Nouveau — {label}': 'Neu — {label}',
      'créé.': 'erstellt.',
      'Les valeurs d’attributs se saisissent dans le cube d’attributs (#{id}). Édition cellule par cellule prévue en raffinement.': 'Attributwerte werden im Attributwürfel (#{id}) erfasst. Zellweise Bearbeitung ist als Verfeinerung geplant.',
      'liste ; sous-menu <em>Appartenance groupes</em>': 'Liste; Untermenü <em>Gruppenmitgliedschaft</em>',
      'liste ; sous-menus <em>Rôles</em> et <em>Droits</em> (databases / cubes / dimensions)': 'Liste; Untermenüs <em>Rollen</em> und <em>Rechte</em> (Datenbanken / Würfel / Dimensionen)',
      'liste ; sous-menu <em>Droits des rôles</em> (par type d’objet)': 'Liste; Untermenü <em>Rollenrechte</em> (nach Objekttyp)',
      'Chemin <strong>Groupe → cube</strong>. Lignes = groupes, colonnes = cubes (<code>#_GROUP_CUBE_DATA</code>). <code>—</code> = défaut.': 'Pfad <strong>Gruppe → Würfel</strong>. Zeilen = Gruppen, Spalten = Würfel (<code>#_GROUP_CUBE_DATA</code>). <code>—</code> = Standard.',
      'Chemin <strong>Groupe → élément</strong>. Lignes = groupes, colonnes = éléments (<code>#_GROUP_DIMENSION_DATA_&lt;Dim&gt;</code>). <code>—</code> = défaut.': 'Pfad <strong>Gruppe → Element</strong>. Zeilen = Gruppen, Spalten = Elemente (<code>#_GROUP_DIMENSION_DATA_&lt;Dim&gt;</code>). <code>—</code> = Standard.',
      '#_GROUP_CUBE_DATA / #_CUBE_ / #_GROUP_ introuvables dans cette database.': '#_GROUP_CUBE_DATA / #_CUBE_ / #_GROUP_ in dieser Datenbank nicht gefunden.',
      'Cube <code>{name}</code> ou dimension <code>#_GROUP_</code> introuvable.': 'Würfel <code>{name}</code> oder Dimension <code>#_GROUP_</code> nicht gefunden.',
      'Consolidation — {name}': 'Konsolidierung — {name}',
      'Parent :': 'Eltern:',
      'Ajouter un enfant': 'Kind hinzufügen',
      'Ajouter': 'Hinzufügen',
      'Enfants (poids modifiables) :': 'Kinder (änderbare Gewichte):',
      'Ajoutez au moins un enfant.': 'Mindestens ein Kind hinzufügen.',
      'Poids': 'Gewicht',
      'Retirer': 'Entfernen',
      'Consolidation cyclique interdite.': 'Zyklische Konsolidierung ist nicht erlaubt.',
      'Cellules remplies : {filled} / {total}': 'Gefüllte Zellen: {filled} / {total}',
      'Désactiver la règle': 'Regel deaktivieren',
      'Activer la règle': 'Regel aktivieren',
      '[\'Dim\':\'Élément\'] = [\'Dim\':\'Élément\'] * 1': '[\'Dim\':\'Element\'] = [\'Dim\':\'Element\'] * 1',
      'Les attributs Palo sont portés par une dimension sœur #_… ; les valeurs se gèrent dans le cube d’attributs.': 'Palo-Attribute liegen in einer Schwesterdimension #_…; Werte werden im Attributwürfel verwaltet.',
      'Renommer l’élément': 'Element umbenennen',
      'Cube #_USER_GROUP ou dimensions utilisateur/groupe introuvables.': 'Würfel #_USER_GROUP oder Benutzer-/Gruppendimensionen nicht gefunden.',
      'Cube #_GROUP_ROLE ou dimensions groupe/rôle introuvables.': 'Würfel #_GROUP_ROLE oder Gruppen-/Rollendimensionen nicht gefunden.',
      'Cube #_ROLE_RIGHT_OBJECT ou dimensions introuvables.': 'Würfel #_ROLE_RIGHT_OBJECT oder Dimensionen nicht gefunden.',
      'Cube #_GROUP_DATABASE_DATA ou dimensions #_DATABASE_ / #_GROUP_ introuvables.': 'Würfel #_GROUP_DATABASE_DATA oder Dimensionen #_DATABASE_ / #_GROUP_ nicht gefunden.',
      'Droit insuffisant pour les droits par instance.': 'Unzureichende Rechte für Instanzberechtigungen.',
      '=  égalité': '=  Gleichheit',
      '+  addition': '+  Addition',
      '−  soustraction': '−  Subtraktion',
      '×  multiplication': '×  Multiplikation',
      '÷  division': '÷  Division',
      '( )  parenthèses': '( )  Klammern',
      '<  inférieur': '<  kleiner',
      '>  supérieur': '>  größer',
      '<=  inférieur ou égal': '<=  kleiner oder gleich',
      '>=  supérieur ou égal': '>=  größer oder gleich',
      '<>  différent': '<>  ungleich',
      'Identifiant': 'Benutzername',
      'Ouvrez Dimensions ou Cubes pour explorer et modifier le contenu de cette base.': 'Öffnen Sie Dimensionen oder Würfel, um den Inhalt dieser Datenbank zu bearbeiten.',
      'Liste des dimensions de la base. Cliquez une ligne pour gérer ses éléments.': 'Dimensionen dieser Datenbank. Klicken Sie eine Zeile, um ihre Elemente zu verwalten.',
      'Liste des cubes de la base. Cliquez une ligne pour voir les axes et les règles.': 'Würfel dieser Datenbank. Klicken Sie eine Zeile, um Achsen und Regeln zu sehen.',
      'Valeurs possibles de cette dimension (y compris les mesures). Ajoutez, renommez ou consolidez ici.': 'Mögliche Werte dieser Dimension (einschließlich Kennzahlen). Hier hinzufügen, umbenennen oder konsolidieren.',
      'Propriétés associées aux éléments (par ex. une description ou un code).': 'Eigenschaften der Elemente (z. B. Beschreibung oder Code).',
      'Les valeurs se renseignent ensuite dans le cube d’attributs associé (#{id}).': 'Werte werden anschließend im zugehörigen Attributwürfel (#{id}) erfasst.',
      'Aucun élément pour l’instant. Ajoutez-en avec le bouton +.': 'Noch keine Elemente. Fügen Sie welche mit der Schaltfläche + hinzu.',
      'Ces dimensions forment les axes du cube ; elles sont fixées à la création.': 'Diese Dimensionen bilden die Würfelachsen; sie werden bei der Erstellung festgelegt.',
      'Les règles calculent automatiquement certaines cellules du cube.': 'Regeln berechnen automatisch bestimmte Zellen des Würfels.',
      'Aucune règle pour l’instant. Créez-en une avec le bouton +.': 'Noch keine Regeln. Erstellen Sie eine mit der Schaltfläche +.',
      'Gérez les comptes, les groupes et les permissions d’accès.': 'Verwalten Sie Konten, Gruppen und Zugriffsrechte.',
      'Comptes pouvant se connecter. Créez un utilisateur, changez un mot de passe ou supprimez un compte.': 'Konten, die sich anmelden können. Benutzer anlegen, Passwort ändern oder Konto löschen.',
      'Cochez les cases pour indiquer à quels groupes appartient chaque utilisateur.': 'Markieren Sie, zu welchen Gruppen jeder Benutzer gehört.',
      'Les groupes rassemblent des utilisateurs pour leur donner les mêmes droits.': 'Gruppen fassen Benutzer zusammen, damit sie dieselben Rechte haben.',
      'Les rôles définissent ce que les utilisateurs ont le droit de faire.': 'Rollen legen fest, was Benutzer tun dürfen.',
      'Cochez les cases pour associer un rôle (permissions) à chaque groupe.': 'Markieren Sie, welche Rolle (Berechtigungen) jeder Gruppe zugeordnet ist.',
      'Pour chaque rôle, choisissez le niveau d’accès : aucun, lire, écrire, supprimer ou splash.': 'Wählen Sie für jede Rolle die Zugriffsstufe: keine, lesen, schreiben, löschen oder splash.',
      'Indiquez, pour chaque groupe, ce qu’il peut faire sur chaque base de données. Le tiret laisse le défaut.': 'Legen Sie fest, was jede Gruppe auf jeder Datenbank darf. Der Strich behält den Standard.',
      'Choisissez une base, puis indiquez ce que chaque groupe peut faire sur ses cubes. Le tiret laisse le défaut.': 'Wählen Sie eine Datenbank und legen Sie fest, was jede Gruppe auf ihren Würfeln darf. Der Strich behält den Standard.',
      'Choisissez une base et une dimension, puis indiquez ce que chaque groupe peut faire sur ses éléments. Le tiret laisse le défaut.': 'Wählen Sie Datenbank und Dimension und legen Sie fest, was jede Gruppe auf den Elementen darf. Der Strich behält den Standard.',
      'Ces droits ne sont pas accessibles avec votre compte (lecture réservée aux rôles ayant le droit « rights »).': 'Diese Rechte sind mit Ihrem Konto nicht verfügbar (Lesen erfordert das Rollenrecht „rights“).',
      'Ces droits sont réservés aux membres du groupe admin.': 'Diese Rechte sind Mitgliedern der Admin-Gruppe vorbehalten.',
    },
  };

  var locale = 'fr';

  function detectLocale() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
    if (nav.indexOf('de') === 0) return 'de';
    if (nav.indexOf('en') === 0) return 'en';
    return 'fr';
  }

  function setLocale(code) {
    if (SUPPORTED.indexOf(code) < 0) code = 'fr';
    locale = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {}
    if (document.documentElement) document.documentElement.lang = code;
    applyDom();
    if (typeof global.dispatchEvent === 'function') {
      try {
        global.dispatchEvent(new CustomEvent('palo:locale', { detail: { locale: code } }));
      } catch (e2) {}
    }
    return locale;
  }

  function getLocale() {
    return locale;
  }

  function t(key, vars) {
    if (key == null || key === '') return '';
    var dict = LOCALES[locale] || {};
    var out = dict[key];
    if (out == null) out = key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        out = String(out).split('{' + k + '}').join(String(vars[k]));
      });
    }
    return out;
  }

  function applyDom(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var attr = el.getAttribute('data-i18n-attr');
      var val = t(key);
      if (attr) {
        el.setAttribute(attr, val);
      } else if (el.getAttribute('data-i18n-html') === '1') {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', t(el.getAttribute('data-i18n-title')));
    });
    var titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) document.title = t(titleEl.getAttribute('data-i18n'));
  }

  locale = detectLocale();
  if (document.documentElement) document.documentElement.lang = locale;

  global.PaloI18n = {
    t: t,
    setLocale: setLocale,
    getLocale: getLocale,
    applyDom: applyDom,
    supported: SUPPORTED.slice(),
    LOCALES: LOCALES,
  };
  global.t = t;
})(typeof window !== 'undefined' ? window : globalThis);
