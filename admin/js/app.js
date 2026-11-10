/**
 * Modeleur Palo P0+P1 — arbre + détail (réf. PalOOCa Modeller).
 * Connexion same-origin uniquement (UI servie à /).
 */
(function () {
  var ELEMENT_NUMERIC = 1;
  var ELEMENT_STRING = 2;
  var ELEMENT_CONSOLIDATED = 4;

  var BUILTIN_USERS = { admin: 1, _internal_suite: 1, poweruser: 1, editor: 1, viewer: 1 };

  /** Ordre Palo : N < R < W < D < S */
  var PERM_RANK = { N: 0, R: 1, W: 2, D: 3, S: 4 };

  /** Libellés des niveaux de droit (combobox) — i18n. */
  function rightLabels() {
    return {
      '': t('— défaut'),
      N: t('N — aucun'),
      R: t('R — lire'),
      W: t('W — écrire'),
      D: t('D — supprimer'),
      S: t('S — splash'),
    };
  }

  var state = {
    client: null,
    username: '',
    isAdmin: false,
    groups: [],
    rights: {}, // droits de rôle (user_info show_permission)
    databases: [],
    system: null, // { databaseId, usersDim, groupsDim, rolesDim, userGroupCube, groupRoleCube, roleRightCube, … }
    selection: null,
    treeOpen: {},
    elementRows: [],
    selectedElementId: null,
    modalResolve: null,
    reauthOpen: false,
    accessCubeDbId: null, // database sélectionnée pour Accès cubes
    accessDimDbId: null, // database sélectionnée pour Accès dimensions
    accessDimId: null, // dimension sélectionnée pour Accès dimensions
  };

  function permRank(letter) {
    var k = String(letter || 'N').toUpperCase();
    return PERM_RANK[k] != null ? PERM_RANK[k] : 0;
  }

  /** Droit de rôle sur un objet (database, cube, dimension, dimension element, rule, user, …). */
  function roleCan(objectKey, need) {
    return permRank(state.rights[objectKey]) >= permRank(need);
  }

  /** Droit effectif sur un objet listé (permission trailing de l’API). */
  function objCan(permission, need) {
    return permRank(permission) >= permRank(need);
  }

  function canBoth(roleKey, objectPerm, need) {
    return roleCan(roleKey, need) && objCan(objectPerm, need);
  }

  function isNormalDatabase(db) {
    return db && String(db.type) === '0';
  }

  function canSeeAdmin() {
    return roleCan('user', 'R') || roleCan('group', 'R') || roleCan('rights', 'R') || roleCan('password', 'R');
  }

  /** Membre du groupe Palo « admin » (pas seulement le rôle poweruser). */
  function isAdminGroupMember() {
    return (state.groups || []).indexOf('admin') >= 0;
  }

  /**
   * #_GROUP_DATABASE_DATA est réservé au groupe admin côté serveur Palo.
   * On aligne l’UI : menu + écran uniquement si le cube est listé ET groupe admin.
   */
  function canAccessGroupDatabaseRights() {
    return isAdminGroupMember() && !!(state.system && state.system.groupDatabaseCube);
  }

  function applySessionInfo(info, user) {
    state.rights = (info && info.rights) || {};
    state.groups = (info && info.groups) || [];
    state.isAdmin = isAdminGroupMember() || !!(info && info.isAdmin);
    var label = (user || state.username || '') + (state.isAdmin ? ' (admin)' : '');
    return label;
  }

  /** Icônes SVG inline (currentColor) — pas de CDN. */
  var ICONS = {
    add:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>',
    edit:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M11.013 1.427a1.75 1.75 0 0 1 2.475 2.475L5.38 12.01a1.75 1.75 0 0 1-.792.45l-2.57.686a.75.75 0 0 1-.917-.917l.686-2.57a1.75 1.75 0 0 1 .45-.792l8.776-8.44zm1.414 1.061a.25.25 0 0 0-.354 0L3.94 10.62a.25.25 0 0 0-.064.113l-.34 1.274 1.274-.34a.25.25 0 0 0 .113-.064l8.158-8.133a.25.25 0 0 0 0-.354z"/></svg>',
    del:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.5 1.75A.75.75 0 0 1 7.25 1h1.5a.75.75 0 0 1 .75.75V3h3.5a.75.75 0 0 1 0 1.5h-.564l-.647 8.097A1.75 1.75 0 0 1 10.045 14H5.955a1.75 1.75 0 0 1-1.744-1.403L3.564 4.5H3a.75.75 0 0 1 0-1.5h3.5V1.75zm1 .75v.5h1v-.5h-1zM5.074 4.5l.63 7.877a.25.25 0 0 0 .25.223h4.09a.25.25 0 0 0 .25-.223l.63-7.877H5.074z"/></svg>',
    consolidate:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 2.75a1.75 1.75 0 1 0-1.25 2.98V7.5c0 .69.56 1.25 1.25 1.25h5.5c.69 0 1.25.56 1.25 1.25v1.77a1.75 1.75 0 1 0 1.25-.02V10c0-1.38-1.12-2.5-2.5-2.5h-5.5A.75.75 0 0 1 5 6.75V5.73A1.75 1.75 0 0 0 5 2.75zM3.75 3.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0zM11.75 12.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/></svg>',
    clear:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5.28 2.22a.75.75 0 0 1 1.06 0L8 3.88l1.66-1.66a.75.75 0 1 1 1.06 1.06L9.06 4.94l1.66 1.66a.75.75 0 1 1-1.06 1.06L8 6l-1.66 1.66a.75.75 0 0 1-1.06-1.06L6.94 4.94 5.28 3.28a.75.75 0 0 1 0-1.06zM2.5 9.75c0-.41.34-.75.75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75zm0 3c0-.41.34-.75.75-.75h9.5a.75.75 0 0 1 0 1.5H3.25a.75.75 0 0 1-.75-.75z"/></svg>',
    password:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5A3.5 3.5 0 0 0 4.5 5v1H4A1.5 1.5 0 0 0 2.5 7.5v5A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 6h-.5V5A3.5 3.5 0 0 0 8 1.5zM6 5a2 2 0 1 1 4 0v1H6V5zm-2.5 2.5h9v5h-9v-5z"/></svg>',
    power:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8.75 1.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5zM4.28 4.22a.75.75 0 0 0-1.06 1.06 5.25 5.25 0 1 0 9.56 0 .75.75 0 1 0-1.06-1.06 3.75 3.75 0 1 1-7.44 0z"/></svg>',
    up:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 3.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 5.81V12.5a.75.75 0 0 1-1.5 0V5.81L4.53 8.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.5z"/></svg>',
    down:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 12.5a.75.75 0 0 1-.53-.22l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.5a.75.75 0 0 1 1.5 0v6.44l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4A.75.75 0 0 1 8 12.5z"/></svg>',
    refresh:
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 0-4.66 2.56.75.75 0 1 1-1.27-.8A7 7 0 0 1 14.5 8h1.1a.75.75 0 0 1 .53 1.28l-2 2a.75.75 0 0 1-1.06 0l-2-2A.75.75 0 0 1 11.6 8H13A5.5 5.5 0 0 0 8 2.5zm5.93 6.64a.75.75 0 0 1 .8 1.27A7 7 0 0 1 1.5 8H.4a.75.75 0 0 1-.53-1.28l2-2a.75.75 0 0 1 1.06 0l2 2A.75.75 0 0 1 4.4 8H3a5.5 5.5 0 0 0 10.93 1.14z"/></svg>',
  };

  /**
   * Bouton icône. opts: { id, dataAct, icon, title, extraClass, allowed }
   * allowed défaut true ; false ⇒ chaîne vide.
   */
  function iconBtn(opts) {
    if (opts.allowed === false) return '';
    var cls =
      'btn btn-small' +
      (opts.text ? '' : ' btn-icon') +
      (opts.extraClass ? ' ' + opts.extraClass : '');
    var attrs =
      'type="button" class="' +
      cls +
      '" title="' +
      escapeAttr(opts.title || opts.text || '') +
      '" aria-label="' +
      escapeAttr(opts.title || opts.text || '') +
      '"';
    if (opts.id) attrs += ' id="' + opts.id + '"';
    if (opts.dataAct) attrs += ' data-act="' + opts.dataAct + '"';
    var content = (ICONS[opts.icon] || '') + (opts.text ? '<span class="btn-label">' + escapeHtml(opts.text) + '</span>' : '');
    return '<button ' + attrs + '>' + content + '</button>';
  }

  /** Rétrocompat : libellé texte (modales / actions non icônisées). */
  function btnHtml(id, label, extraClass, allowed) {
    if (!allowed) return '';
    return (
      '<button type="button" class="btn ' +
      (extraClass || 'btn-small') +
      '" id="' +
      id +
      '">' +
      label +
      '</button>'
    );
  }

  function onClickIf(id, fn) {
    var el = $(id);
    if (el) el.onclick = fn;
  }

  function findDim(dbId, dimId) {
    var db = findDb(dbId);
    if (!db) return null;
    return ((db._dimensions || []).find(function (d) {
      return String(d.dimension) === String(dimId);
    }) || null);
  }

  function findCube(dbId, cubeId) {
    var db = findDb(dbId);
    if (!db) return null;
    return ((db._cubes || []).find(function (c) {
      return String(c.cube) === String(cubeId);
    }) || null);
  }

  function updateToolbarPermissions() {
    var btn = $('btn-new-database');
    if (btn) btn.classList.toggle('hidden', !roleCan('database', 'W'));
  }

  function $(id) {
    return document.getElementById(id);
  }

  function serverBaseUrl() {
    if (location.protocol.indexOf('http') === 0 && location.host) {
      return location.origin;
    }
    return 'http://127.0.0.1:7777';
  }

  function toast(msg, kind) {
    var el = $('toast');
    el.textContent = msg;
    el.className = 'toast ' + (kind || '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.add('hidden');
    }, 4200);
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function openModal(title, bodyHtml, validateFn, opts) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHtml;
    var card = $('modal').querySelector('.modal-card');
    if (card) card.classList.toggle('modal-card--wide', !!(opts && opts.wide));
    $('modal').classList.remove('hidden');
    $('modal').setAttribute('aria-hidden', 'false');
    var first = $('modal-body').querySelector('input, select, textarea');
    if (first) setTimeout(function () {
      first.focus();
      if (first.select) first.select();
    }, 30);

    return new Promise(function (resolve) {
      state.modalResolve = function (ok) {
        if (!ok) {
          closeModal();
          resolve(null);
          return;
        }
        var result;
        try {
          result = validateFn ? validateFn() : true;
        } catch (e) {
          toast(e.message || String(e), 'err');
          return;
        }
        if (result && typeof result.then === 'function') {
          result.then(function (r) {
            if (r == null) return;
            closeModal();
            resolve(r);
          }).catch(function (e) {
            toast((e && e.message) || String(e), 'err');
          });
          return;
        }
        if (result == null) return;
        closeModal();
        resolve(result);
      };
    });
  }

  function closeModal() {
    $('modal').classList.add('hidden');
    $('modal').setAttribute('aria-hidden', 'true');
    $('modal-body').innerHTML = '';
    var card = $('modal').querySelector('.modal-card');
    if (card) card.classList.remove('modal-card--wide');
    state.modalResolve = null;
  }

  function promptName(title, label, defaultValue) {
    return openModal(
      title,
      '<label>' +
        label +
        '<input id="modal-name" type="text" value="' +
        escapeAttr(defaultValue || '') +
        '" /></label>',
      function () {
        var v = ($('modal-name').value || '').trim();
        if (!v) throw new Error(t('Nom requis.'));
        return v;
      }
    );
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function treeKey(parts) {
    return parts.join('/');
  }

  function isOpen(key) {
    return state.treeOpen[key] !== false; // default open for databases
  }

  function setOpen(key, open) {
    state.treeOpen[key] = open;
  }

  function selectionEquals(a, b) {
    if (!a || !b) return false;
    return (
      a.type === b.type &&
      a.databaseId === b.databaseId &&
      a.dimensionId === b.dimensionId &&
      a.cubeId === b.cubeId &&
      a.folder === b.folder
    );
  }

  function selectNode(sel) {
    state.selection = sel;
    state.selectedElementId = null;
    renderTree();
    return renderDetail();
  }

  /* ---------- Tree ---------- */

  function loadTree() {
    return state.client.listDatabases().then(function (dbs) {
      // Modeleur : bases normales (type 0) avec au moins lecture ; System/Config exclus.
      state.databases = dbs.filter(function (d) {
        return isNormalDatabase(d) && objCan(d.permission, 'R');
      });
      var sys = dbs.find(function (d) {
        return String(d.name_database).toLowerCase() === 'system';
      });
      var loadNormal = Promise.all(
        state.databases.map(function (db) {
          return Promise.all([
            state.client.listDimensions(db.database),
            state.client.listCubes(db.database),
          ]).then(function (pair) {
            db._dimensions = pair[0].filter(function (dim) {
              var n = dim.name_dimension || '';
              return n.charAt(0) !== '#' && objCan(dim.permission, 'R');
            });
            db._cubes = pair[1].filter(function (c) {
              var n = c.name_cube || '';
              return n.charAt(0) !== '#' && objCan(c.permission, 'R');
            });
          });
        })
      );
      var loadSys = Promise.resolve();
      if (sys) {
        loadSys = Promise.all([
          state.client.listDimensions(sys.database, {
            show_normal: '1',
            show_system: '1',
            show_attribute: '1',
            show_info: '1',
          }),
          state.client.listCubes(sys.database, {
            show_normal: '1',
            show_system: '1',
            show_attribute: '1',
            show_info: '1',
          }),
        ]).then(function (pair) {
          function findDim(name) {
            return pair[0].find(function (d) {
              return d.name_dimension === name;
            });
          }
          function findCube(name) {
            return pair[1].find(function (c) {
              return c.name_cube === name;
            });
          }
          state.system = {
            databaseId: sys.database,
            databaseName: sys.name_database,
            usersDim: findDim('#_USER_'),
            groupsDim: findDim('#_GROUP_'),
            rolesDim: findDim('#_ROLE_'),
            rightObjDim: findDim('#_RIGHT_OBJECT_'),
            databaseDim: findDim('#_DATABASE_'),
            userGroupCube: findCube('#_USER_GROUP'),
            groupRoleCube: findCube('#_GROUP_ROLE'),
            roleRightCube: findCube('#_ROLE_RIGHT_OBJECT'),
            groupDatabaseCube: findCube('#_GROUP_DATABASE_DATA'),
          };
        });
      } else {
        state.system = null;
      }
      return Promise.all([loadNormal, loadSys]);
    });
  }

  function renderTree() {
    var root = $('tree');
    root.innerHTML = '';
    state.databases.forEach(function (db) {
      root.appendChild(renderDbNode(db));
    });
    if (state.system && canSeeAdmin()) {
      root.appendChild(renderAdminNode());
    }
    if (!state.databases.length) {
      var li = document.createElement('li');
      li.className = 'muted';
      li.style.padding = '0.5rem';
      li.textContent = t('Aucune base. Créez-en une avec le bouton « + » de la barre latérale.');
      root.appendChild(li);
    }
  }

  function renderAdminNode() {
    var key = 'admin';
    var open = isOpen(key);
    var li = document.createElement('li');
    var row = document.createElement('div');
    row.className = 'tree-item';
    if (state.selection && state.selection.type === 'admin-root') row.classList.add('active');
    row.innerHTML =
      '<button type="button" class="tree-twist">' +
      (open ? '▼' : '▶') +
      '</button><span class="tree-icon">🔐</span><span class="tree-label">' + t('Administration') + '</span>';
    row.querySelector('.tree-twist').addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(key, !open);
      renderTree();
    });
    row.addEventListener('click', function () {
      selectNode({ type: 'admin-root' });
    });
    li.appendChild(row);
    if (open) {
      var ul = document.createElement('ul');
      var topFolders = [
        {
          folder: 'users',
          label: t('Utilisateurs'),
          icon: '👤',
          right: 'user',
          children: [
            { folder: 'user-groups', label: t('Appartenance groupes'), icon: '🔗', right: 'user' },
          ],
        },
        {
          folder: 'groups',
          label: t('Groupes'),
          icon: '👥',
          right: 'group',
          children: [
            { folder: 'group-roles', label: t('Rôles des groupes'), icon: '🎭', right: 'group' },
            {
              folder: 'access-db',
              label: t('Droits databases'),
              icon: '🗄️',
              right: 'rights',
              adminGroupOnly: true,
            },
            { folder: 'access-cube', label: t('Droits cubes'), icon: '📦', right: 'rights' },
            { folder: 'access-dim', label: t('Droits dimensions'), icon: '📐', right: 'rights' },
          ],
        },
        {
          folder: 'roles',
          label: t('Rôles'),
          icon: '🎭',
          right: 'rights',
          children: [
            { folder: 'role-rights', label: t('Droits des rôles'), icon: '🔐', right: 'rights' },
          ],
        },
      ].filter(function (f) {
        return roleCan(f.right, 'R');
      });

      var selFolder = state.selection && state.selection.type === 'admin-folder' ? state.selection.folder : null;
      var expandParent = {
        'user-groups': 'admin:users',
        'group-roles': 'admin:groups',
        'access-db': 'admin:groups',
        'access-cube': 'admin:groups',
        'access-dim': 'admin:groups',
        'role-rights': 'admin:roles',
      };
      if (selFolder && expandParent[selFolder]) {
        setOpen(expandParent[selFolder], true);
      }

      topFolders.forEach(function (f) {
        var child = document.createElement('li');
        var hasKids = f.children && f.children.length;
        var gKey = 'admin:' + f.folder;
        var gOpen = hasKids && isOpen(gKey);
        var crow = document.createElement('div');
        crow.className = 'tree-item';
        if (selFolder === f.folder) crow.classList.add('active');
        crow.innerHTML =
          (hasKids
            ? '<button type="button" class="tree-twist">' + (gOpen ? '▼' : '▶') + '</button>'
            : '<span class="tree-twist"></span>') +
          '<span class="tree-icon">' +
          f.icon +
          '</span><span class="tree-label">' +
          f.label +
          '</span>';
        if (hasKids) {
          crow.querySelector('.tree-twist').addEventListener('click', function (e) {
            e.stopPropagation();
            setOpen(gKey, !gOpen);
            renderTree();
          });
        }
        crow.addEventListener('click', function (e) {
          e.stopPropagation();
          selectNode({ type: 'admin-folder', folder: f.folder });
        });
        child.appendChild(crow);

        if (hasKids && gOpen) {
          var sub = document.createElement('ul');
          f.children
            .filter(function (c) {
              if (!roleCan(c.right, 'R')) return false;
              if (c.adminGroupOnly && !canAccessGroupDatabaseRights()) return false;
              return true;
            })
            .forEach(function (c) {
              var subLi = document.createElement('li');
              var srow = document.createElement('div');
              srow.className = 'tree-item';
              if (selFolder === c.folder) srow.classList.add('active');
              srow.innerHTML =
                '<span class="tree-twist"></span><span class="tree-icon">' +
                c.icon +
                '</span><span class="tree-label">' +
                c.label +
                '</span>';
              srow.addEventListener('click', function (e) {
                e.stopPropagation();
                setOpen(gKey, true);
                selectNode({ type: 'admin-folder', folder: c.folder });
              });
              subLi.appendChild(srow);
              sub.appendChild(subLi);
            });
          child.appendChild(sub);
        }
        ul.appendChild(child);
      });
      li.appendChild(ul);
    }
    return li;
  }

  function renderDbNode(db) {
    var key = treeKey(['db', db.database]);
    var open = isOpen(key);
    var li = document.createElement('li');

    var row = document.createElement('div');
    row.className = 'tree-item';
    if (state.selection && state.selection.type === 'database' && state.selection.databaseId === db.database) {
      row.classList.add('active');
    }
    row.innerHTML =
      '<button type="button" class="tree-twist">' +
      (open ? '▼' : '▶') +
      '</button>' +
      '<span class="tree-icon">🗄</span>' +
      '<span class="tree-label"></span>';
    row.querySelector('.tree-label').textContent = db.name_database;
    row.querySelector('.tree-twist').addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(key, !open);
      renderTree();
    });
    row.addEventListener('click', function () {
      selectNode({
        type: 'database',
        databaseId: db.database,
        databaseName: db.name_database,
      });
    });
    li.appendChild(row);

    if (open) {
      var kids = document.createElement('ul');
      kids.appendChild(
        renderFolderNode(db, 'dimensions', t('Dimensions'), '📐', db._dimensions || [], function (dim) {
          return {
            type: 'dimension',
            databaseId: db.database,
            databaseName: db.name_database,
            dimensionId: dim.dimension,
            dimensionName: dim.name_dimension,
          };
        })
      );
      kids.appendChild(
        renderFolderNode(db, 'cubes', t('Cubes'), '📦', db._cubes || [], function (cube) {
          return {
            type: 'cube',
            databaseId: db.database,
            databaseName: db.name_database,
            cubeId: cube.cube,
            cubeName: cube.name_cube,
          };
        })
      );
      li.appendChild(kids);
    }
    return li;
  }

  function renderFolderNode(db, folder, label, icon, items, toSel) {
    var key = treeKey(['db', db.database, folder]);
    var open = isOpen(key);
    var li = document.createElement('li');
    var row = document.createElement('div');
    row.className = 'tree-item';
    if (
      state.selection &&
      state.selection.type === 'folder' &&
      state.selection.databaseId === db.database &&
      state.selection.folder === folder
    ) {
      row.classList.add('active');
    }
    row.innerHTML =
      '<button type="button" class="tree-twist">' +
      (open ? '▼' : '▶') +
      '</button>' +
      '<span class="tree-icon">' +
      icon +
      '</span>' +
      '<span class="tree-label"></span>';
    row.querySelector('.tree-label').textContent = label + ' (' + items.length + ')';
    row.querySelector('.tree-twist').addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(key, !open);
      renderTree();
    });
    row.addEventListener('click', function () {
      selectNode({
        type: 'folder',
        folder: folder,
        databaseId: db.database,
        databaseName: db.name_database,
      });
    });
    li.appendChild(row);

    if (open) {
      var ul = document.createElement('ul');
      items.forEach(function (it) {
        var child = document.createElement('li');
        var crow = document.createElement('div');
        crow.className = 'tree-item';
        var sel = toSel(it);
        if (selectionEquals(state.selection, sel)) crow.classList.add('active');
        crow.innerHTML = '<span class="tree-twist"></span><span class="tree-icon">•</span><span class="tree-label"></span>';
        crow.querySelector('.tree-label').textContent =
          folder === 'dimensions' ? it.name_dimension : it.name_cube;
        crow.addEventListener('click', function (e) {
          e.stopPropagation();
          selectNode(sel);
        });
        child.appendChild(crow);
        ul.appendChild(child);
      });
      li.appendChild(ul);
    }
    return li;
  }

  /* ---------- Detail ---------- */

  function renderDetail() {
    var empty = $('detail-empty');
    var panel = $('detail-panel');
    var sel = state.selection;
    if (!sel) {
      empty.classList.remove('hidden');
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return Promise.resolve();
    }
    empty.classList.add('hidden');
    panel.classList.remove('hidden');

    if (sel.type === 'database') return renderDatabaseDetail(panel, sel);
    if (sel.type === 'folder' && sel.folder === 'dimensions') return renderDimensionsFolder(panel, sel);
    if (sel.type === 'folder' && sel.folder === 'cubes') return renderCubesFolder(panel, sel);
    if (sel.type === 'dimension') return renderDimensionDetail(panel, sel);
    if (sel.type === 'cube') return renderCubeDetail(panel, sel);
    if (sel.type === 'admin-root') return renderAdminRoot(panel);
    if (sel.type === 'admin-folder') return renderAdminFolder(panel, sel);
    panel.innerHTML = '';
    return Promise.resolve();
  }

  function headerHtml(title, actionsHtml) {
    return (
      '<div class="detail-header"><h2>' +
      escapeHtml(title) +
      '</h2><div class="detail-actions">' +
      (actionsHtml || '') +
      '</div></div>'
    );
  }

  /** Phrase d’aide utilisateur sous le titre (HTML déjà traduit). */
  function introHtml(text) {
    if (!text) return '';
    return '<p class="panel-intro muted">' + text + '</p>';
  }

  function renderDatabaseDetail(panel, sel) {
    var db = findDb(sel.databaseId);
    var dbPerm = (db && db.permission) || 'N';
    var mutable = isNormalDatabase(db);
    var dimCount = ((db && db._dimensions) || []).length;
    var cubeCount = ((db && db._cubes) || []).length;
    panel.innerHTML =
      headerHtml(
        sel.databaseName,
        [
          iconBtn({ id: 'act-rename-db', icon: 'edit', title: t('Renommer la base'), allowed: mutable && canBoth('database', dbPerm, 'W') }),
          iconBtn({ id: 'act-del-db', icon: 'del', title: t('Supprimer la base'), extraClass: 'btn-danger', allowed: mutable && canBoth('database', dbPerm, 'D') }),
        ].join('')
      ) +
      '<div class="panel">' +
      introHtml(t('Ouvrez Dimensions ou Cubes pour explorer et modifier le contenu de cette base.')) +
      '<ul class="meta-list" id="db-folder-list"></ul></div>';

    var ul = $('db-folder-list');
    [
      { folder: 'dimensions', label: t('Dimensions'), count: dimCount },
      { folder: 'cubes', label: t('Cubes'), count: cubeCount },
    ].forEach(function (entry) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = entry.label + ' (' + entry.count + ')';
      a.onclick = function (e) {
        e.preventDefault();
        setOpen(treeKey(['db', sel.databaseId]), true);
        setOpen(treeKey(['db', sel.databaseId, entry.folder]), true);
        selectNode({
          type: 'folder',
          folder: entry.folder,
          databaseId: sel.databaseId,
          databaseName: sel.databaseName,
        });
      };
      li.appendChild(a);
      ul.appendChild(li);
    });

    onClickIf('act-rename-db', function () {
      promptName(t('Renommer la base'), t('Nouveau nom'), sel.databaseName).then(function (name) {
        if (!name) return;
        return state.client.renameDatabase(sel.databaseId, name).then(function () {
          toast(t('Base renommée.'), 'ok');
          return refreshAll({ type: 'database', databaseId: sel.databaseId, databaseName: name });
        });
      }).catch(showErr);
    });
    onClickIf('act-del-db', function () {
      if (!confirmAction(t('Supprimer la base « {name} » ?', { name: sel.databaseName }))) return;
      state.client
        .destroyDatabase(sel.databaseId)
        .then(function () {
          toast(t('Base supprimée.'), 'ok');
          state.selection = null;
          return refreshAll(null);
        })
        .catch(showErr);
    });
    return Promise.resolve();
  }

  function renderDimensionsFolder(panel, sel) {
    var db = findDb(sel.databaseId);
    var dims = (db && db._dimensions) || [];
    var canCreate = isNormalDatabase(db) && canBoth('dimension', (db && db.permission) || 'N', 'W');
    panel.innerHTML =
      headerHtml(
        t('Dimensions') + ' — ' + sel.databaseName,
        iconBtn({ id: 'act-new-dim', icon: 'add', title: t('Nouvelle dimension'), extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel">' +
      introHtml(t('Liste des dimensions de la base. Cliquez une ligne pour gérer ses éléments.')) +
      '<ul class="meta-list" id="dim-list"></ul></div>';
    var ul = $('dim-list');
    dims.forEach(function (d) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = d.name_dimension;
      a.onclick = function (e) {
        e.preventDefault();
        selectNode({
          type: 'dimension',
          databaseId: sel.databaseId,
          databaseName: sel.databaseName,
          dimensionId: d.dimension,
          dimensionName: d.name_dimension,
        });
      };
      li.appendChild(a);
      ul.appendChild(li);
    });
    if (!dims.length) ul.innerHTML = '<li class="muted">' + t('Aucune dimension.') + '</li>';
    onClickIf('act-new-dim', function () {
      return createDimensionFlow(sel);
    });
    return Promise.resolve();
  }

  function renderCubesFolder(panel, sel) {
    var db = findDb(sel.databaseId);
    var cubes = (db && db._cubes) || [];
    var canCreate = isNormalDatabase(db) && canBoth('cube', (db && db.permission) || 'N', 'W');
    panel.innerHTML =
      headerHtml(
        t('Cubes') + ' — ' + sel.databaseName,
        iconBtn({ id: 'act-new-cube', icon: 'add', title: t('Nouveau cube'), extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel">' +
      introHtml(t('Liste des cubes de la base. Cliquez une ligne pour voir les axes et les règles.')) +
      '<ul class="meta-list" id="cube-list"></ul></div>';
    var ul = $('cube-list');
    cubes.forEach(function (c) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = c.name_cube;
      a.onclick = function (e) {
        e.preventDefault();
        selectNode({
          type: 'cube',
          databaseId: sel.databaseId,
          databaseName: sel.databaseName,
          cubeId: c.cube,
          cubeName: c.name_cube,
        });
      };
      li.appendChild(a);
      ul.appendChild(li);
    });
    if (!cubes.length) ul.innerHTML = '<li class="muted">' + t('Aucun cube.') + '</li>';
    onClickIf('act-new-cube', function () {
      return createCubeFlow(sel);
    });
    return Promise.resolve();
  }

  function renderDimensionDetail(panel, sel) {
    var dim = findDim(sel.databaseId, sel.dimensionId);
    var dimPerm = (dim && dim.permission) || 'N';
    var canNewEl = canBoth('dimension element', dimPerm, 'W');
    panel.innerHTML =
      headerHtml(
        sel.dimensionName,
        [
          iconBtn({ id: 'act-rename-dim', icon: 'edit', title: t('Renommer la dimension'), allowed: canBoth('dimension', dimPerm, 'W') }),
          iconBtn({ id: 'act-del-dim', icon: 'del', title: t('Supprimer la dimension'), extraClass: 'btn-danger', allowed: canBoth('dimension', dimPerm, 'D') }),
        ].join('')
      ) +
      '<div class="panel">' +
      '<div class="panel-heading"><h3>' + t('Éléments') + '</h3>' +
      iconBtn({ id: 'act-new-el', icon: 'add', title: t('Nouvel élément'), extraClass: 'btn-primary', allowed: canNewEl }) +
      '</div>' +
      introHtml(t('Valeurs possibles de cette dimension (y compris les mesures). Ajoutez, renommez ou consolidez ici.')) +
      '<div id="el-host" class="muted">' + t('Chargement…') + '</div></div>';

    onClickIf('act-rename-dim', function () {
      promptName(t('Renommer la dimension'), t('Nouveau nom'), sel.dimensionName).then(function (name) {
        if (!name) return;
        return state.client.renameDimension(sel.databaseId, sel.dimensionId, name).then(function () {
          toast(t('Dimension renommée.'), 'ok');
          return refreshAll({
            type: 'dimension',
            databaseId: sel.databaseId,
            databaseName: sel.databaseName,
            dimensionId: sel.dimensionId,
            dimensionName: name,
          });
        });
      }).catch(showErr);
    });
    onClickIf('act-del-dim', function () {
      if (!confirmAction(t('Supprimer la dimension « {name} » ?', { name: sel.dimensionName }))) return;
      state.client
        .destroyDimension(sel.databaseId, sel.dimensionId)
        .then(function () {
          toast(t('Dimension supprimée.'), 'ok');
          return refreshAll({
            type: 'folder',
            folder: 'dimensions',
            databaseId: sel.databaseId,
            databaseName: sel.databaseName,
          });
        })
        .catch(showErr);
    });
    onClickIf('act-new-el', function () {
      return createElementFlow(sel);
    });

    return state.client.listElements(sel.databaseId, sel.dimensionId).then(function (rows) {
      state.elementRows = rows;
      renderElementTree($('el-host'), rows);
      return renderAttributesPanel(sel);
    });
  }

  function renderAttributesPanel(sel) {
    var host = document.createElement('div');
    host.className = 'panel';
    host.id = 'attr-panel';
    host.innerHTML =
      '<div class="panel-heading"><h3>' + t('Attributs') + '</h3><span id="attr-heading-actions"></span></div>' +
      introHtml(t('Propriétés associées aux éléments (par ex. une description ou un code).')) +
      '<div id="attr-host" class="muted">' + t('Chargement…') + '</div>';
    $('detail-panel').appendChild(host);
    return state.client.dimensionInfo(sel.databaseId, sel.dimensionId).then(function (info) {
      var attrDim = info.attributes_dimension;
      var attrCube = info.attributes_cube;
      if (!attrDim || attrDim === '' || attrDim === '-1') {
        $('attr-host').innerHTML = '<p class="muted">' + t('Pas de dimension d’attributs pour cette dimension.') + '</p>';
        return;
      }
      return state.client.listElements(sel.databaseId, attrDim).then(function (attrs) {
        var canWriteAttr = roleCan('dimension element', 'W');
        var canDelAttr = roleCan('dimension element', 'D');
        var actions = $('attr-heading-actions');
        if (actions) {
          actions.innerHTML = iconBtn({
            id: 'act-new-attr',
            icon: 'add',
            title: t('Nouvel attribut'),
            extraClass: 'btn-primary',
            allowed: canWriteAttr,
          });
        }
        var html = '<ul class="element-tree" id="attr-list"></ul>';
        $('attr-host').innerHTML = html;
        var ul = $('attr-list');
        attrs.forEach(function (a) {
          var li = document.createElement('li');
          var row = document.createElement('div');
          row.className = 'element-row';
          var canDelThis = canDelAttr && objCan(a.permission, 'D');
          row.innerHTML =
            '<span class="badge">' +
            elementTypeLabel(a.type) +
            '</span><span class="tree-label"></span>' +
            iconBtn({ dataAct: 'del', icon: 'del', title: t('Supprimer'), extraClass: 'btn-danger', allowed: canDelThis });
          row.querySelector('.tree-label').textContent = a.name_element;
          var delBtn = row.querySelector('[data-act="del"]');
          if (delBtn) {
            delBtn.onclick = function () {
              if (!confirmAction(t('Supprimer l’attribut « {name} » ?', { name: a.name_element }))) return;
              state.client
                .destroyElement(sel.databaseId, attrDim, a.element)
                .then(function () {
                  toast(t('Attribut supprimé.'), 'ok');
                  return renderDetail();
                })
                .catch(showErr);
            };
          }
          li.appendChild(row);
          ul.appendChild(li);
        });
        if (!attrs.length) ul.innerHTML = '<li class="muted">' + t('Aucun attribut.') + '</li>';
        onClickIf('act-new-attr', function () {
          openModal(
            'Nouvel attribut',
            '<label>Nom<input id="attr-name" type="text" /></label>' +
              '<label>Type<select id="attr-type"><option value="1">Numérique</option><option value="2">Texte</option></select></label>',
            function () {
              var name = ($('attr-name').value || '').trim();
              if (!name) throw new Error(t('Nom requis.'));
              return { name: name, type: parseInt($('attr-type').value, 10) };
            }
          )
            .then(function (data) {
              if (!data) return;
              return state.client.createElement(sel.databaseId, attrDim, data.name, data.type).then(function () {
                toast(t('Attribut créé.'), 'ok');
                return renderDetail();
              });
            })
            .catch(showErr);
        });
        // note attr cube for values editing later
        if (attrCube) {
          var note = document.createElement('p');
          note.className = 'muted';
          note.textContent = t(
            'Les valeurs se renseignent ensuite dans le cube d’attributs associé (#{id}).',
            { id: attrCube }
          );
          $('attr-host').appendChild(note);
        }
      });
    }).catch(function (e) {
      $('attr-host').textContent = e.message || String(e);
    });
  }

  function elementTypeLabel(t) {
    if (t === ELEMENT_NUMERIC) return 'N';
    if (t === ELEMENT_STRING) return 'T';
    if (t === ELEMENT_CONSOLIDATED) return 'C';
    return String(t);
  }

  function buildElementForest(rows) {
    var byId = {};
    rows.forEach(function (r) {
      byId[r.element] = Object.assign({}, r, { _children: [] });
    });
    var roots = [];
    rows.forEach(function (r) {
      var parents = String(r.parents || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (!parents.length) {
        roots.push(byId[r.element]);
      } else {
        parents.forEach(function (pid) {
          if (byId[pid]) byId[pid]._children.push(byId[r.element]);
          else roots.push(byId[r.element]);
        });
      }
    });
    // dedupe roots
    var seen = {};
    return roots.filter(function (n) {
      if (seen[n.element]) return false;
      seen[n.element] = true;
      return true;
    });
  }

  function filterElementForest(forest, query) {
    var q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q) return forest;

    function filterNode(n) {
      var selfMatch = String(n.name_element || '')
        .toLowerCase()
        .indexOf(q) >= 0;
      var childSrc = n._children || [];
      var kids = selfMatch
        ? childSrc.slice()
        : childSrc.map(filterNode).filter(Boolean);
      if (!selfMatch && !kids.length) return null;
      var copy = Object.assign({}, n);
      copy._children = kids;
      return copy;
    }

    return forest.map(filterNode).filter(Boolean);
  }

  function countForestNodes(forest) {
    var n = 0;
    function walk(nodes) {
      (nodes || []).forEach(function (node) {
        n += 1;
        walk(node._children);
      });
    }
    walk(forest);
    return n;
  }

  function renderElementTree(host, rows) {
    if (!rows.length) {
      host.innerHTML = '<p class="muted">' + t('Aucun élément pour l’instant. Ajoutez-en avec le bouton +.') + '</p>';
      return;
    }
    var forest = buildElementForest(rows);
    var total = rows.length;
    host.innerHTML = '';
    host.classList.remove('muted');

    var toolbar = document.createElement('div');
    toolbar.className = 'el-filter-bar';
    toolbar.innerHTML =
      '<input type="search" id="el-filter" class="el-filter" placeholder="' +
      escapeAttr(t('Filtrer les éléments…')) +
      '" autocomplete="off" />' +
      '<span class="el-filter-count muted" id="el-filter-count"></span>';
    host.appendChild(toolbar);

    var listHost = document.createElement('div');
    listHost.className = 'el-tree-host';
    host.appendChild(listHost);

    function paint(query) {
      var filtered = filterElementForest(forest, query);
      var shown = countForestNodes(filtered);
      var countEl = $('el-filter-count');
      if (countEl) {
        countEl.textContent = query
          ? t('{shown} sur {total}', { shown: shown, total: total })
          : t('{total} éléments', { total: total });
      }
      listHost.innerHTML = '';
      if (!filtered.length) {
        listHost.innerHTML =
          '<p class="muted">' + t('Aucun élément ne correspond.') + '</p>';
        return;
      }
      var ul = document.createElement('ul');
      ul.className = 'element-tree';
      filtered.forEach(function (n) {
        ul.appendChild(renderElementNode(n));
      });
      listHost.appendChild(ul);
    }

    var inp = $('el-filter');
    if (inp) {
      inp.addEventListener('input', function () {
        paint(inp.value);
      });
    }
    paint('');
  }

  function renderElementNode(node) {
    var li = document.createElement('li');
    var row = document.createElement('div');
    row.className = 'element-row';
    if (state.selectedElementId === node.element) row.classList.add('selected');
    var canRen = canBoth('dimension element', node.permission, 'W');
    var canDel = canBoth('dimension element', node.permission, 'D');
    var canCons = canBoth('dimension element', node.permission, 'W');
    row.innerHTML =
      '<span class="badge">' +
      elementTypeLabel(node.type) +
      '</span><span class="tree-label"></span>' +
      iconBtn({ dataAct: 'cons', icon: 'consolidate', title: t('Consolidation…'), allowed: canCons }) +
      iconBtn({ dataAct: 'rename', icon: 'edit', title: t('Renommer'), allowed: canRen }) +
      iconBtn({ dataAct: 'del', icon: 'del', title: t('Supprimer'), extraClass: 'btn-danger', allowed: canDel });
    row.querySelector('.tree-label').textContent = node.name_element;
    row.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-act]')) return;
      state.selectedElementId = node.element;
      document.querySelectorAll('.element-row.selected').forEach(function (el) {
        el.classList.remove('selected');
      });
      row.classList.add('selected');
    });
    var consBtn = row.querySelector('[data-act="cons"]');
    if (consBtn) {
      consBtn.onclick = function (e) {
        e.stopPropagation();
        state.selectedElementId = node.element;
        document.querySelectorAll('.element-row.selected').forEach(function (el) {
          el.classList.remove('selected');
        });
        row.classList.add('selected');
        return consolidateFlow(state.selection, node);
      };
    }
    var renBtn = row.querySelector('[data-act="rename"]');
    if (renBtn) {
      renBtn.onclick = function (e) {
        e.stopPropagation();
        var sel = state.selection;
        promptName(t('Renommer l’élément'), t('Nouveau nom'), node.name_element).then(function (name) {
          if (!name) return;
          return state.client.renameElement(sel.databaseId, sel.dimensionId, node.element, name).then(function () {
            toast(t('Élément renommé.'), 'ok');
            return renderDetail();
          });
        }).catch(showErr);
      };
    }
    var delBtn = row.querySelector('[data-act="del"]');
    if (delBtn) {
      delBtn.onclick = function (e) {
        e.stopPropagation();
        if (!confirmAction(t('Supprimer l’élément « {name} » ?', { name: node.name_element }))) return;
        var sel = state.selection;
        state.client
          .destroyElement(sel.databaseId, sel.dimensionId, node.element)
          .then(function () {
            toast(t('Élément supprimé.'), 'ok');
            return renderDetail();
          })
          .catch(showErr);
      };
    }
    li.appendChild(row);
    if (node._children && node._children.length) {
      var ul = document.createElement('ul');
      node._children.forEach(function (c) {
        ul.appendChild(renderElementNode(c));
      });
      li.appendChild(ul);
    }
    return li;
  }

  function renderCubeDetail(panel, sel) {
    var cube = findCube(sel.databaseId, sel.cubeId);
    var cubePerm = (cube && cube.permission) || 'N';
    var canClear =
      canBoth('cube', cubePerm, 'W') ||
      (roleCan('cell data', 'W') && objCan(cubePerm, 'W'));
    // Droit « rule » du rôle ; si le cube n’est pas trouvé en cache, ne pas bloquer la création
    var canNewRule = roleCan('rule', 'W') && (!cube || objCan(cubePerm, 'W') || objCan(cubePerm, 'D'));
    panel.innerHTML =
      headerHtml(
        sel.cubeName,
        [
          iconBtn({ id: 'act-rename-cube', icon: 'edit', title: t('Renommer le cube'), allowed: canBoth('cube', cubePerm, 'W') }),
          iconBtn({ id: 'act-clear-cube', icon: 'clear', title: t('Vider les valeurs'), extraClass: 'btn-danger', allowed: canClear }),
          iconBtn({ id: 'act-del-cube', icon: 'del', title: t('Supprimer le cube'), extraClass: 'btn-danger', allowed: canBoth('cube', cubePerm, 'D') }),
        ].join('')
      ) +
      '<div class="panel"><h3>' + t('Dimensions du cube') + '</h3>' +
      introHtml(t('Ces dimensions forment les axes du cube ; elles sont fixées à la création.')) +
      '<ol id="cube-dims" class="meta-list"></ol><p id="cube-meta" class="muted"></p></div>' +
      '<div class="panel">' +
      '<div class="panel-heading"><h3>' + t('Règles') + '</h3>' +
      iconBtn({
        id: 'act-new-rule',
        icon: 'add',
        title: t('Nouvelle règle'),
        extraClass: 'btn-primary',
        allowed: canNewRule,
      }) +
      '</div>' +
      introHtml(t('Les règles calculent automatiquement certaines cellules du cube.')) +
      '<div id="rules-host" class="muted">' + t('Chargement…') + '</div></div>';

    onClickIf('act-rename-cube', function () {
      promptName(t('Renommer le cube'), t('Nouveau nom'), sel.cubeName).then(function (name) {
        if (!name) return;
        return state.client.renameCube(sel.databaseId, sel.cubeId, name).then(function () {
          toast(t('Cube renommé.'), 'ok');
          return refreshAll({
            type: 'cube',
            databaseId: sel.databaseId,
            databaseName: sel.databaseName,
            cubeId: sel.cubeId,
            cubeName: name,
          });
        });
      }).catch(showErr);
    });
    onClickIf('act-clear-cube', function () {
      if (!confirmAction(t('Vider toutes les valeurs du cube « {name} » ?', { name: sel.cubeName }))) return;
      state.client
        .clearCube(sel.databaseId, sel.cubeId)
        .then(function () {
          toast(t('Cube vidé.'), 'ok');
          return renderDetail();
        })
        .catch(showErr);
    });
    onClickIf('act-new-rule', function () {
      return ruleEditFlow(sel, null);
    });
    onClickIf('act-del-cube', function () {
      if (!confirmAction(t('Supprimer le cube « {name} » ?', { name: sel.cubeName }))) return;
      state.client
        .destroyCube(sel.databaseId, sel.cubeId)
        .then(function () {
          toast(t('Cube supprimé.'), 'ok');
          return refreshAll({
            type: 'folder',
            folder: 'cubes',
            databaseId: sel.databaseId,
            databaseName: sel.databaseName,
          });
        })
        .catch(showErr);
    });

    var db = findDb(sel.databaseId);
    return Promise.all([
      state.client.cubeInfo(sel.databaseId, sel.cubeId),
      state.client.listRules(sel.databaseId, sel.cubeId),
    ]).then(function (pair) {
      var info = pair[0];
      var rules = pair[1];
      var ids = String(info.dimensions || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      var ol = $('cube-dims');
      ol.innerHTML = '';
      ids.forEach(function (id) {
        var dim = ((db && db._dimensions) || []).find(function (d) {
          return String(d.dimension) === String(id);
        });
        var li = document.createElement('li');
        li.textContent = dim ? dim.name_dimension : 'dimension #' + id;
        ol.appendChild(li);
      });
      $('cube-meta').textContent = t('Cellules remplies : {filled} / {total}', {
        filled: info.number_filled_cells != null ? info.number_filled_cells : '—',
        total: info.number_cells != null ? info.number_cells : '—',
      });
      renderRulesList(sel, rules);
    });
  }

  function renderRulesList(sel, rules) {
    var host = $('rules-host');
    var canWrite = roleCan('rule', 'W');
    var canDelete = roleCan('rule', 'D');
    if (!rules.length) {
      host.innerHTML =
        '<p class="muted">' + t('Aucune règle pour l’instant. Créez-en une avec le bouton +.') + '</p>';
      return;
    }
    var sorted = rules.slice().sort(function (a, b) {
      return parseFloat(a.position || 0) - parseFloat(b.position || 0);
    });
    host.innerHTML = '';
    sorted.forEach(function (rule, idx) {
      var row = document.createElement('div');
      row.className = 'element-row';
      row.style.flexWrap = 'wrap';
      var isActive = rule.active === '1' || rule.active === 1;
      row.innerHTML =
        '<code class="tree-label" style="font-size:0.85rem"></code>' +
        '<label class="switch" title="' +
        escapeAttr(isActive ? t('Désactiver la règle') : t('Activer la règle')) +
        '">' +
        '<input type="checkbox" data-act="tog"' +
        (isActive ? ' checked' : '') +
        (canWrite ? '' : ' disabled') +
        ' />' +
        '<span class="switch-slider"></span>' +
        '</label>' +
        iconBtn({ dataAct: 'edit', icon: 'edit', title: t('Éditer la règle'), allowed: canWrite }) +
        iconBtn({ dataAct: 'up', icon: 'up', title: t('Monter'), allowed: canWrite }) +
        iconBtn({ dataAct: 'down', icon: 'down', title: t('Descendre'), allowed: canWrite }) +
        iconBtn({ dataAct: 'del', icon: 'del', title: t('Supprimer'), extraClass: 'btn-danger', allowed: canDelete });
      row.querySelector('code').textContent = rule.definition;
      var editBtn = row.querySelector('[data-act="edit"]');
      if (editBtn) {
        editBtn.onclick = function () {
          ruleEditFlow(sel, rule);
        };
      }
      var togInp = row.querySelector('input[data-act="tog"]');
      if (togInp) {
        togInp.onchange = function () {
          var wantOn = togInp.checked;
          togInp.disabled = true;
          state.client
            .modifyRule(sel.databaseId, sel.cubeId, rule.rule, { activate: '2' })
            .then(function () {
              toast(wantOn ? 'Règle activée.' : 'Règle désactivée.', 'ok');
              return renderDetail();
            })
            .catch(function (e) {
              togInp.checked = !wantOn;
              showErr(e);
            })
            .then(function () {
              togInp.disabled = !canWrite;
            });
        };
      }
      var upBtn = row.querySelector('[data-act="up"]');
      if (upBtn) {
        upBtn.onclick = function () {
          if (idx === 0) return;
          var prev = sorted[idx - 1];
          var pos = prev.position != null ? prev.position : idx;
          state.client
            .moveRule(sel.databaseId, sel.cubeId, rule.rule, pos)
            .then(function () {
              return renderDetail();
            })
            .catch(showErr);
        };
      }
      var downBtn = row.querySelector('[data-act="down"]');
      if (downBtn) {
        downBtn.onclick = function () {
          if (idx >= sorted.length - 1) return;
          var next = sorted[idx + 1];
          var pos = next.position != null ? parseFloat(next.position) + 1 : idx + 2;
          state.client
            .moveRule(sel.databaseId, sel.cubeId, rule.rule, pos)
            .then(function () {
              return renderDetail();
            })
            .catch(showErr);
        };
      }
      var delRuleBtn = row.querySelector('[data-act="del"]');
      if (delRuleBtn) {
        delRuleBtn.onclick = function () {
          if (!confirmAction(t('Supprimer cette règle ?'))) return;
          state.client
            .destroyRule(sel.databaseId, sel.cubeId, rule.rule)
            .then(function () {
              toast(t('Règle supprimée.'), 'ok');
              return renderDetail();
            })
            .catch(showErr);
        };
      }
      host.appendChild(row);
    });
  }

  /** Arbre toutes databases → cubes → dimensions → éléments pour l’éditeur de règles. */
  function loadRuleRefTree(sel) {
    var currentDbName = sel.databaseName || ((findDb(sel.databaseId) || {}).name_database) || '';
    var databases = (state.databases || []).filter(isNormalDatabase);
    if (!databases.length && sel.databaseId) {
      var fallback = findDb(sel.databaseId);
      if (fallback) databases = [fallback];
    }

    function loadCubeDims(db, cube) {
      return state.client.cubeInfo(db.database, cube.cube).then(function (info) {
        var ids = String(info.dimensions || '')
          .split(',')
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
        return Promise.all(
          ids.map(function (id) {
            var dimMeta = ((db._dimensions || [])).find(function (d) {
              return String(d.dimension) === String(id);
            });
            var name = dimMeta ? dimMeta.name_dimension : 'dimension #' + id;
            return state.client.listElements(db.database, id).then(function (els) {
              return { id: id, name: name, elements: els };
            });
          })
        ).then(function (dims) {
          return {
            id: cube.cube,
            name: cube.name_cube || '#' + cube.cube,
            dims: dims,
          };
        });
      });
    }

    function loadDatabase(db) {
      var cubes = (db._cubes || []).slice();
      if (
        String(db.database) === String(sel.databaseId) &&
        sel.cubeId &&
        !cubes.some(function (c) {
          return String(c.cube) === String(sel.cubeId);
        })
      ) {
        cubes = cubes.concat([{ cube: sel.cubeId, name_cube: sel.cubeName || '#' + sel.cubeId }]);
      }
      return Promise.all(cubes.map(function (cube) {
        return loadCubeDims(db, cube);
      })).then(function (cubeTrees) {
        return {
          name: db.name_database || '#' + db.database,
          cubes: cubeTrees,
        };
      });
    }

    return Promise.all(databases.map(loadDatabase)).then(function (dbTrees) {
      // Compat éditeur : aplatir aussi en .cubes du db courant
      var current = dbTrees.find(function (d) {
        return d.name === currentDbName;
      }) || dbTrees[0] || { name: currentDbName, cubes: [] };
      return {
        databaseName: currentDbName,
        currentDatabaseName: currentDbName,
        currentCubeId: sel.cubeId,
        currentCubeName: sel.cubeName,
        databases: dbTrees,
        cubes: current.cubes || [],
      };
    });
  }

  function ruleEditFlow(sel, existing) {
    var def = existing ? existing.definition : '';
    var comment = existing ? existing.comment || '' : '';
    var editor = null;

    function runParse(definition, outEl) {
      if (!outEl) return Promise.resolve(false);
      var d = (definition || '').trim();
      if (!d) {
        outEl.className = 'muted rule-check-out';
        outEl.textContent = t('Définition vide.');
        return Promise.resolve(false);
      }
      outEl.className = 'muted rule-check-out';
      outEl.textContent = t('Vérification…');
      return state.client
        .parseRule(sel.databaseId, sel.cubeId, d)
        .then(function () {
          outEl.className = 'rule-check-out ok';
          outEl.textContent = t('OK');
          return true;
        })
        .catch(function (e) {
          outEl.className = 'rule-check-out err';
          outEl.textContent = e.message || String(e);
          return false;
        });
    }

    return loadRuleRefTree(sel)
      .catch(function () {
        return {
          databaseName: sel.databaseName || '',
          currentDatabaseName: sel.databaseName || '',
          currentCubeId: sel.cubeId,
          currentCubeName: sel.cubeName,
          databases: [],
          cubes: [],
        };
      })
      .then(function (refTree) {
        var p = openModal(
          existing ? t('Modifier la règle') : t('Nouvelle règle'),
          '<div class="rule-editor-root" id="rule-editor-root">' +
            '<div class="muted" style="font-size:0.9rem">' +
            t('Définition') +
            '</div>' +
            '<textarea id="rule-def" rows="7" placeholder="' +
            escapeAttr(t('[\'Dim\':\'Élément\'] = [\'Dim\':\'Élément\'] * 1')) +
            '"></textarea>' +
            '</div>' +
            '<label>' +
            t('Commentaire') +
            '<input id="rule-comment" type="text" /></label>' +
            '<div class="detail-actions">' +
            '<button type="button" class="btn btn-small" id="rule-check">' +
            t('Vérifier') +
            '</button>' +
            '</div>' +
            '<p id="rule-check-out" class="muted rule-check-out"></p>',
          function () {
            var definition = editor ? editor.getDefinition() : ($('rule-def').value || '').trim();
            if (!definition) throw new Error(t('Définition requise.'));
            var comment = ($('rule-comment').value || '').trim();
            var outEl = $('rule-check-out');
            return runParse(definition, outEl).then(function (ok) {
              if (!ok) return null;
              return { definition: definition, comment: comment };
            });
          },
          { wide: true }
        );

        setTimeout(function () {
          if ($('rule-comment')) $('rule-comment').value = comment;
          var ta = $('rule-def');
          var root = $('rule-editor-root');
          try {
            if (ta && root && globalThis.PaloRuleEditor) {
              editor = new PaloRuleEditor({
                root: root,
                textarea: ta,
                refTree: refTree,
                definition: def,
              });
            } else if (ta) {
              ta.value = def;
            }
          } catch (e) {
            if (ta) ta.value = def;
            toast((e && e.message) || String(e), 'err');
          }
          if ($('rule-check')) {
            $('rule-check').onclick = function () {
              var definition = editor ? editor.getDefinition() : ($('rule-def').value || '').trim();
              runParse(definition, $('rule-check-out'));
            };
          }
        }, 0);

        return p.then(function (data) {
          if (!data) return;
          var req;
          if (existing) {
            req = state.client.modifyRule(sel.databaseId, sel.cubeId, existing.rule, {
              definition: data.definition,
              comment: data.comment,
            });
          } else {
            req = state.client.createRule(sel.databaseId, sel.cubeId, data.definition, data.comment, '1');
          }
          return req.then(function () {
            toast(existing ? 'Règle mise à jour.' : 'Règle créée.', 'ok');
            return renderDetail();
          });
        });
      })
      .catch(showErr);
  }

  function renderAdminRoot(panel) {
    panel.innerHTML =
      headerHtml(t('Administration')) +
      '<div class="panel">' +
      introHtml(t('Gérez les comptes, les groupes et les permissions d’accès.')) +
      '<ul class="meta-list" id="admin-root-list"></ul></div>';
    var ul = $('admin-root-list');
    [
      { folder: 'users', label: t('Utilisateurs'), right: 'user' },
      { folder: 'groups', label: t('Groupes'), right: 'group' },
      { folder: 'roles', label: t('Rôles'), right: 'rights' },
    ]
      .filter(function (entry) {
        return roleCan(entry.right, 'R');
      })
      .forEach(function (entry) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#';
        a.textContent = entry.label;
        a.onclick = function (e) {
          e.preventDefault();
          setOpen('admin', true);
          setOpen('admin:' + entry.folder, true);
          selectNode({ type: 'admin-folder', folder: entry.folder });
        };
        li.appendChild(a);
        ul.appendChild(li);
      });
    return Promise.resolve();
  }

  function renderAdminFolder(panel, sel) {
    var sys = state.system;
    if (!sys) {
      panel.innerHTML = '<p class="error">' + t('Base System introuvable.') + '</p>';
      return Promise.resolve();
    }
    if (sel.folder === 'users') return renderAdminUsers(panel, sys);
    if (sel.folder === 'user-groups') return renderAdminUserGroups(panel, sys);
    if (sel.folder === 'groups') return renderAdminGroups(panel, sys);
    if (sel.folder === 'group-roles') return renderAdminGroupRoles(panel, sys);
    if (sel.folder === 'roles' || sel.folder === 'rights') return renderAdminRoles(panel, sys);
    if (sel.folder === 'role-rights') return renderAdminRoleRights(panel, sys);
    if (sel.folder === 'access-db') return renderAdminAccessDatabases(panel, sys);
    if (sel.folder === 'access-cube') return renderAdminAccessCubes(panel, sys);
    if (sel.folder === 'access-dim') return renderAdminAccessDimensions(panel, sys);
    panel.innerHTML = '';
    return Promise.resolve();
  }

  function isMembershipOn(val) {
    if (val == null || val === '') return false;
    var s = String(val).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'x' || parseFloat(s) > 0;
  }

  /** Matrice cases à cocher. pathFn(rowEl, colEl) → path cube. */
  function renderCheckboxMatrix(host, opts) {
    var rows = opts.rows || [];
    var cols = opts.cols || [];
    var cellMap = opts.cellMap || {};
    var canWrite = !!opts.canWrite;
    var pathFn = opts.pathFn;
    var onToggle = opts.onToggle;

    if (!rows.length || !cols.length) {
      host.innerHTML = '<p class="muted">' + t('Aucune donnée à afficher.') + '</p>';
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'rights-matrix-wrap';
    var table = document.createElement('table');
    table.className = 'rights-matrix';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    hr.innerHTML = '<th class="row-head"></th>';
    cols.forEach(function (c) {
      var th = document.createElement('th');
      th.textContent = c.name_element;
      th.title = c.name_element;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var th = document.createElement('td');
      th.className = 'row-head';
      th.textContent = r.name_element;
      th.title = r.name_element;
      tr.appendChild(th);
      cols.forEach(function (c) {
        var td = document.createElement('td');
        var path = pathFn(r, c);
        var checked = isMembershipOn(cellMap[path]);
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = checked;
        cb.disabled = !canWrite;
        cb.title = r.name_element + ' × ' + c.name_element;
        cb.onchange = function () {
          var next = cb.checked;
          cb.disabled = true;
          Promise.resolve(onToggle(path, next, r, c))
            .then(function () {
              cellMap[path] = next ? '1' : '';
            })
            .catch(function (e) {
              cb.checked = !next;
              showErr(e);
            })
            .then(function () {
              cb.disabled = !canWrite;
            });
        };
        td.appendChild(cb);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    host.innerHTML = '';
    host.appendChild(wrap);
  }

  /** Matrice droits N/R/W/D/S — lignes × colonnes (éléments name_element / element). */
  function renderRightsLevelMatrix(host, opts) {
    var objs = opts.rows || [];
    var cols = opts.cols || [];
    var cellMap = opts.cellMap || {};
    var canWrite = !!opts.canWrite;
    var pathFn = opts.pathFn;
    var onChange = opts.onChange;
    var rowHead = opts.rowHead != null ? opts.rowHead : 'Accès';
    var allowEmpty = !!opts.allowEmpty;
    var levels = allowEmpty ? ['', 'N', 'R', 'W', 'D', 'S'] : ['N', 'R', 'W', 'D', 'S'];

    if (!objs.length || !cols.length) {
      host.innerHTML = '<p class="muted">' + t('Aucune donnée à afficher.') + '</p>';
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'rights-matrix-wrap';
    var table = document.createElement('table');
    table.className = 'rights-matrix';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    hr.innerHTML = '<th class="row-head">' + escapeHtml(rowHead) + '</th>';
    cols.forEach(function (c) {
      var th = document.createElement('th');
      th.textContent = c.name_element;
      th.title = c.name_element;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    objs.forEach(function (obj) {
      var tr = document.createElement('tr');
      var th = document.createElement('td');
      th.className = 'row-head';
      th.textContent = obj.name_element;
      th.title = obj.name_element;
      tr.appendChild(th);
      cols.forEach(function (col) {
        var td = document.createElement('td');
        var path = pathFn(obj, col);
        var raw = cellMap[path];
        var cur =
          raw == null || raw === ''
            ? allowEmpty
              ? ''
              : 'N'
            : String(raw).toUpperCase();
        if (cur && levels.indexOf(cur) < 0) cur = allowEmpty ? '' : 'N';
        var sel = document.createElement('select');
        sel.className = 'right-level';
        sel.disabled = !canWrite;
        levels.forEach(function (lv) {
          var o = document.createElement('option');
          o.value = lv;
          o.textContent = rightLabels()[lv] != null ? rightLabels()[lv] : lv;
          if (lv === cur) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () {
          var next = sel.value;
          var prev = cur;
          sel.disabled = true;
          Promise.resolve(onChange(path, next, obj, col))
            .then(function () {
              cur = next;
              cellMap[path] = next;
            })
            .catch(function (e) {
              sel.value = prev;
              showErr(e);
            })
            .then(function () {
              sel.disabled = !canWrite;
            });
        };
        td.appendChild(sel);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    host.innerHTML = '';
    host.appendChild(wrap);
  }

  function setMembershipCell(sys, cubeMeta, path, on) {
    return state.client.replaceCell(sys.databaseId, cubeMeta.cube, path, on ? '1' : '');
  }

  function renderAdminUsers(panel, sys) {
    if (!sys.usersDim) {
      panel.innerHTML = '<p class="error">' + t('Dimension #_USER_ absente.') + '</p>';
      return Promise.resolve();
    }
    if (!roleCan('user', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant pour lister les utilisateurs.') + '</p>';
      return Promise.resolve();
    }
    var canCreate = roleCan('user', 'W');
    var canPwd = roleCan('password', 'W');
    var canDel = roleCan('user', 'D');
    panel.innerHTML =
      headerHtml(
        t('Utilisateurs'),
        iconBtn({ id: 'act-new-user', icon: 'add', title: t('Nouvel utilisateur'), extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel">' +
      introHtml(t('Comptes pouvant se connecter. Créez un utilisateur, changez un mot de passe ou supprimez un compte.')) +
      '<div id="users-host" class="muted">' + t('Chargement…') + '</div></div>';
    onClickIf('act-new-user', function () {
      openModal(
        t('Nouvel utilisateur'),
        '<label>Identifiant<input id="u-name" type="text" /></label>' +
          '<label>Mot de passe initial<input id="u-pass" type="password" /></label>',
        function () {
          var name = ($('u-name').value || '').trim();
          var pass = $('u-pass').value;
          if (!name) throw new Error(t('Identifiant requis.'));
          if (!pass) throw new Error(t('Mot de passe requis.'));
          if (BUILTIN_USERS[name.toLowerCase()]) throw new Error(t('Identifiant réservé.'));
          return { name: name, pass: pass };
        }
      )
        .then(function (data) {
          if (!data) return;
          return state.client
            .createElement(sys.databaseId, sys.usersDim.dimension, data.name, ELEMENT_STRING)
            .then(function () {
              return state.client.changePassword(data.name, data.pass);
            })
            .then(function () {
              toast(t('Utilisateur créé.'), 'ok');
              return renderDetail();
            });
        })
        .catch(showErr);
    });
    return state.client.listElements(sys.databaseId, sys.usersDim.dimension).then(function (users) {
      var host = $('users-host');
      host.innerHTML = '';
      users.forEach(function (u) {
        var row = document.createElement('div');
        row.className = 'element-row';
        var builtin = !!BUILTIN_USERS[String(u.name_element).toLowerCase()];
        row.innerHTML =
          '<span class="tree-label"></span>' +
          iconBtn({ dataAct: 'pwd', icon: 'password', title: t('Mot de passe'), allowed: canPwd }) +
          iconBtn({
            dataAct: 'del',
            icon: 'del',
            title: t('Supprimer'),
            extraClass: 'btn-danger',
            allowed: !builtin && canDel && objCan(u.permission, 'D'),
          });
        row.querySelector('.tree-label').textContent = u.name_element;
        var pwdBtn = row.querySelector('[data-act="pwd"]');
        if (pwdBtn) {
          pwdBtn.onclick = function () {
            openModal(
              t('Mot de passe — {name}', { name: u.name_element }),
              '<label>Nouveau mot de passe<input id="u-pass" type="password" /></label>',
              function () {
                var pass = $('u-pass').value;
                if (!pass) throw new Error(t('Mot de passe requis.'));
                return pass;
              }
            )
              .then(function (pass) {
                if (!pass) return;
                return state.client.changePassword(u.name_element, pass).then(function () {
                  toast(t('Mot de passe mis à jour.'), 'ok');
                });
              })
              .catch(showErr);
          };
        }
        var del = row.querySelector('[data-act="del"]');
        if (del) {
          del.onclick = function () {
            if (!confirmAction(t('Supprimer l’utilisateur « {name} » ?', { name: u.name_element }))) return;
            state.client
              .destroyElement(sys.databaseId, sys.usersDim.dimension, u.element)
              .then(function () {
                toast(t('Utilisateur supprimé.'), 'ok');
                return renderDetail();
              })
              .catch(showErr);
          };
        }
        host.appendChild(row);
      });
    });
  }

  /** Sous-menu Utilisateurs → Appartenance groupes (user ↔ groupe). */
  function renderAdminUserGroups(panel, sys) {
    if (!roleCan('user', 'R') && !roleCan('group', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant.') + '</p>';
      return Promise.resolve();
    }
    if (!sys.usersDim || !sys.groupsDim || !sys.userGroupCube) {
      panel.innerHTML =
        '<p class="error">' + t('Cube #_USER_GROUP ou dimensions utilisateur/groupe introuvables.') + '</p>';
      return Promise.resolve();
    }
    panel.innerHTML =
      headerHtml(t('Utilisateurs → groupes')) +
      '<div class="panel">' +
      introHtml(t('Cochez les cases pour indiquer à quels groupes appartient chaque utilisateur.')) +
      '<div id="user-group-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    return Promise.all([
      state.client.listElements(sys.databaseId, sys.usersDim.dimension),
      state.client.listElements(sys.databaseId, sys.groupsDim.dimension),
      state.client.exportCells(sys.databaseId, sys.userGroupCube.cube),
    ]).then(function (triple) {
      var canWriteUg = roleCan('user', 'W') || roleCan('group', 'W');
      renderCheckboxMatrix($('user-group-matrix'), {
        rows: triple[0],
        cols: triple[1],
        cellMap: triple[2],
        canWrite: canWriteUg,
        pathFn: function (user, group) {
          return user.element + ',' + group.element;
        },
        onToggle: function (path, on) {
          return setMembershipCell(sys, sys.userGroupCube, path, on).then(function () {
            toast(on ? t('Groupe associé.') : t('Groupe retiré.'), 'ok');
          });
        },
      });
    });
  }

  function renderAdminNamedDim(panel, title, dim, createLabel, rightKey, intro) {
    if (!roleCan(rightKey, 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant.') + '</p>';
      return Promise.resolve();
    }
    var canCreate = roleCan(rightKey, 'W');
    var canRen = roleCan(rightKey, 'W');
    var canDel = roleCan(rightKey, 'D');
    panel.innerHTML =
      headerHtml(
        t(title),
        iconBtn({
          id: 'act-new-named',
          icon: 'add',
          title: t('Nouveau — {label}', { label: t(createLabel) }),
          extraClass: 'btn-primary',
          allowed: canCreate,
        })
      ) +
      '<div class="panel">' +
      introHtml(intro || '') +
      '<div id="named-host" class="muted">' + t('Chargement…') + '</div></div>';
    onClickIf('act-new-named', function () {
      promptName(t('Nouveau — {label}', { label: createLabel }), t('Nom'), '').then(function (name) {
        if (!name) return;
        return state.client.createElement(state.system.databaseId, dim.dimension, name, ELEMENT_STRING).then(function () {
          toast(createLabel + ' créé.', 'ok');
          return renderDetail();
        });
      }).catch(showErr);
    });
    return state.client.listElements(state.system.databaseId, dim.dimension).then(function (rows) {
      var host = $('named-host');
      host.innerHTML = '';
      rows.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'element-row';
        var builtin = !!BUILTIN_USERS[String(r.name_element).toLowerCase()];
        row.innerHTML =
          '<span class="tree-label"></span>' +
          iconBtn({
            dataAct: 'ren',
            icon: 'edit',
            title: t('Renommer'),
            allowed: canRen && objCan(r.permission, 'W'),
          }) +
          iconBtn({
            dataAct: 'del',
            icon: 'del',
            title: t('Supprimer'),
            extraClass: 'btn-danger',
            allowed: !builtin && canDel && objCan(r.permission, 'D'),
          });
        row.querySelector('.tree-label').textContent = r.name_element;
        var ren = row.querySelector('[data-act="ren"]');
        if (ren) {
          ren.onclick = function () {
            promptName(t('Renommer'), t('Nouveau nom'), r.name_element).then(function (name) {
              if (!name) return;
              return state.client
                .renameElement(state.system.databaseId, dim.dimension, r.element, name)
                .then(function () {
                  toast(t('Renommé.'), 'ok');
                  return renderDetail();
                });
            }).catch(showErr);
          };
        }
        var del = row.querySelector('[data-act="del"]');
        if (del) {
          del.onclick = function () {
            if (!confirmAction(t('Supprimer « {name} » ?', { name: r.name_element }))) return;
            state.client
              .destroyElement(state.system.databaseId, dim.dimension, r.element)
              .then(function () {
                toast(t('Supprimé.'), 'ok');
                return renderDetail();
              })
              .catch(showErr);
          };
        }
        host.appendChild(row);
      });
    });
  }

  function renderAdminGroups(panel, sys) {
    if (!sys.groupsDim) {
      panel.innerHTML = '<p class="error">' + t('Dimension #_GROUP_ absente.') + '</p>';
      return Promise.resolve();
    }
    return renderAdminNamedDim(
      panel,
      'Groupes',
      sys.groupsDim,
      'Groupe',
      'group',
      t('Les groupes rassemblent des utilisateurs pour leur donner les mêmes droits.')
    );
  }

  /** Sous-menu Groupes → Rôles des groupes (groupe ↔ rôle). */
  function renderAdminGroupRoles(panel, sys) {
    if (!roleCan('group', 'R') && !roleCan('rights', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant.') + '</p>';
      return Promise.resolve();
    }
    if (!sys.groupsDim || !sys.rolesDim || !sys.groupRoleCube) {
      panel.innerHTML =
        '<p class="error">' + t('Cube #_GROUP_ROLE ou dimensions groupe/rôle introuvables.') + '</p>';
      return Promise.resolve();
    }
    panel.innerHTML =
      headerHtml(t('Groupes → rôles')) +
      '<div class="panel">' +
      introHtml(t('Cochez les cases pour associer un rôle (permissions) à chaque groupe.')) +
      '<div id="group-role-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    return Promise.all([
      state.client.listElements(sys.databaseId, sys.rolesDim.dimension),
      state.client.listElements(sys.databaseId, sys.groupsDim.dimension),
      state.client.exportCells(sys.databaseId, sys.groupRoleCube.cube),
    ]).then(function (triple) {
      var canWriteGr = roleCan('group', 'W') || roleCan('rights', 'W');
      renderCheckboxMatrix($('group-role-matrix'), {
        rows: triple[0],
        cols: triple[1],
        cellMap: triple[2],
        canWrite: canWriteGr,
        pathFn: function (role, group) {
          return group.element + ',' + role.element;
        },
        onToggle: function (path, on) {
          return setMembershipCell(sys, sys.groupRoleCube, path, on).then(function () {
            toast(on ? t('Rôle associé.') : t('Rôle retiré.'), 'ok');
          });
        },
      });
    });
  }

  function renderAdminRoles(panel, sys) {
    if (!sys.rolesDim) {
      panel.innerHTML = '<p class="error">' + t('Dimension #_ROLE_ absente.') + '</p>';
      return Promise.resolve();
    }
    return renderAdminNamedDim(
      panel,
      'Rôles',
      sys.rolesDim,
      'Rôle',
      'rights',
      t('Les rôles définissent ce que les utilisateurs ont le droit de faire.')
    );
  }

  /** Sous-menu Rôles → Droits des rôles (rôle ↔ type d’objet). */
  function renderAdminRoleRights(panel, sys) {
    if (!roleCan('rights', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant pour lire les droits.') + '</p>';
      return Promise.resolve();
    }
    if (!sys.rolesDim || !sys.roleRightCube || !sys.rightObjDim) {
      panel.innerHTML =
        '<p class="error">' + t('Cube #_ROLE_RIGHT_OBJECT ou dimensions introuvables.') + '</p>';
      return Promise.resolve();
    }
    var canWrite = roleCan('rights', 'W');
    panel.innerHTML =
      headerHtml(t('Rôles → droits')) +
      '<div class="panel">' +
      introHtml(
        t('Pour chaque rôle, choisissez le niveau d’accès : aucun, lire, écrire, supprimer ou splash.')
      ) +
      '<div id="role-right-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    return Promise.all([
      state.client.listElements(sys.databaseId, sys.rightObjDim.dimension),
      state.client.listElements(sys.databaseId, sys.rolesDim.dimension),
      state.client.exportCells(sys.databaseId, sys.roleRightCube.cube),
    ]).then(function (triple) {
      renderRightsLevelMatrix($('role-right-matrix'), {
        rows: triple[0],
        cols: triple[1],
        cellMap: triple[2],
        canWrite: canWrite,
        pathFn: function (obj, role) {
          return role.element + ',' + obj.element;
        },
        onChange: function (path, val) {
          return state.client.replaceCell(sys.databaseId, sys.roleRightCube.cube, path, val).then(function () {
            toast(t('Droit « {val} » enregistré.', { val: val }), 'ok');
          });
        },
      });
    });
  }

  /** Droits groupe × database — cube System #_GROUP_DATABASE_DATA (groupe admin uniquement). */
  function renderAdminAccessDatabases(panel, sys) {
    if (!canAccessGroupDatabaseRights()) {
      panel.innerHTML =
        headerHtml(t('Groupes → databases')) +
        '<div class="panel"><p class="error">' +
        t('Ces droits sont réservés aux membres du groupe admin.') +
        '</p></div>';
      return Promise.resolve();
    }
    if (!sys.databaseDim || !sys.groupsDim) {
      panel.innerHTML =
        '<p class="error">' +
        t('Cube #_GROUP_DATABASE_DATA ou dimensions #_DATABASE_ / #_GROUP_ introuvables.') +
        '</p>';
      return Promise.resolve();
    }
    var canWrite = isAdminGroupMember() && roleCan('rights', 'W');
    panel.innerHTML =
      headerHtml(t('Groupes → databases')) +
      '<div class="panel">' +
      introHtml(
        t('Indiquez, pour chaque groupe, ce qu’il peut faire sur chaque base de données. Le tiret laisse le défaut.')
      ) +
      '<div id="access-db-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    return Promise.all([
      state.client.listElements(sys.databaseId, sys.databaseDim.dimension),
      state.client.listElements(sys.databaseId, sys.groupsDim.dimension),
      state.client.exportCells(sys.databaseId, sys.groupDatabaseCube.cube),
    ]).then(function (triple) {
      var databases = triple[0];
      var groups = triple[1];
      var cellMap = triple[2];
      // #_GROUP_DATABASE_DATA : group, database → path = groupId,dbId
      renderRightsLevelMatrix($('access-db-matrix'), {
        rows: groups,
        cols: databases,
        cellMap: cellMap,
        canWrite: canWrite,
        allowEmpty: true,
        rowHead: t('Groupe'),
        pathFn: function (group, dbEl) {
          return group.element + ',' + dbEl.element;
        },
        onChange: function (path, val) {
          return state.client.replaceCell(sys.databaseId, sys.groupDatabaseCube.cube, path, val).then(function () {
            toast(
              val ? t('Droit database « {val} ».', { val: val }) : t('Droit database remis au défaut.'),
              'ok'
            );
          });
        },
      });
    });
  }

  /** Droits groupe × cube — #_GROUP_CUBE_DATA dans chaque database normale. */
  function renderAdminAccessCubes(panel, sys) {
    if (!roleCan('rights', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant pour lire les droits.') + '</p>';
      return Promise.resolve();
    }
    var canWrite = roleCan('rights', 'W');
    var dbs = (state.databases || []).filter(isNormalDatabase);
    if (!dbs.length) {
      panel.innerHTML =
        headerHtml(t('Accès cubes')) +
        '<div class="panel"><p class="muted">' + t('Aucune database.') + '</p></div>';
      return Promise.resolve();
    }
    if (!state.accessCubeDbId || !dbs.some(function (d) {
      return String(d.database) === String(state.accessCubeDbId);
    })) {
      state.accessCubeDbId = dbs[0].database;
    }

    panel.innerHTML =
      headerHtml(t('Groupes → cubes')) +
      '<div class="panel">' +
      introHtml(
        t('Choisissez une base, puis indiquez ce que chaque groupe peut faire sur ses cubes. Le tiret laisse le défaut.')
      ) +
      '<label>' + t('Database') + '<select id="access-cube-db"></select></label>' +
      '<div id="access-cube-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    var sel = $('access-cube-db');
    dbs.forEach(function (db) {
      var o = document.createElement('option');
      o.value = db.database;
      o.textContent = db.name_database;
      if (String(db.database) === String(state.accessCubeDbId)) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () {
      state.accessCubeDbId = sel.value;
      loadAccessCubeMatrix($('access-cube-matrix'), state.accessCubeDbId, canWrite);
    };

    return loadAccessCubeMatrix($('access-cube-matrix'), state.accessCubeDbId, canWrite);
  }

  function loadAccessCubeMatrix(host, databaseId, canWrite) {
    if (!host) return Promise.resolve();
    host.className = 'muted';
    host.textContent = t('Chargement…');

    var sysOpts = {
      show_normal: '1',
      show_system: '1',
      show_attribute: '0',
      show_info: '0',
    };

    return Promise.all([
      state.client.listCubes(databaseId, sysOpts),
      state.client.listDimensions(databaseId, sysOpts),
    ])
      .then(function (pair) {
        var cubes = pair[0];
        var dims = pair[1];
        var rightsCube = cubes.find(function (c) {
          return c.name_cube === '#_GROUP_CUBE_DATA';
        });
        var cubeDim = dims.find(function (d) {
          return d.name_dimension === '#_CUBE_';
        });
        var groupDim = dims.find(function (d) {
          return d.name_dimension === '#_GROUP_';
        });
        if (!rightsCube || !cubeDim || !groupDim) {
          host.innerHTML =
            '<p class="error">' +
            t('#_GROUP_CUBE_DATA / #_CUBE_ / #_GROUP_ introuvables dans cette database.') +
            '</p>';
          return;
        }
        return Promise.all([
          state.client.listElements(databaseId, cubeDim.dimension),
          state.client.listElements(databaseId, groupDim.dimension),
          state.client.exportCells(databaseId, rightsCube.cube),
        ]).then(function (triple) {
          var cubeEls = triple[0];
          var groups = triple[1];
          var cellMap = triple[2];
          // #_GROUP_CUBE_DATA : group, cube → path = groupId,cubeElId
          renderRightsLevelMatrix(host, {
            rows: groups,
            cols: cubeEls,
            cellMap: cellMap,
            canWrite: canWrite,
            allowEmpty: true,
            rowHead: t('Groupe'),
            pathFn: function (group, cubeEl) {
              return group.element + ',' + cubeEl.element;
            },
            onChange: function (path, val) {
              return state.client.replaceCell(databaseId, rightsCube.cube, path, val).then(function () {
                toast(
                  val ? t('Droit cube « {val} ».', { val: val }) : t('Droit cube remis au défaut.'),
                  'ok'
                );
              });
            },
          });
        });
      })
      .catch(function (e) {
        host.innerHTML = '<p class="error">' + escapeHtml(e.message || String(e)) + '</p>';
      });
  }

  /**
   * Droits groupe × élément de dimension — cube #_GROUP_DIMENSION_DATA_<Dim>.
   * (C’est le modèle Palo pour les « droits sur une dimension ».)
   */
  function renderAdminAccessDimensions(panel, sys) {
    if (!roleCan('rights', 'R')) {
      panel.innerHTML = '<p class="error">' + t('Droit insuffisant pour lire les droits.') + '</p>';
      return Promise.resolve();
    }
    var canWrite = roleCan('rights', 'W');
    var dbs = (state.databases || []).filter(isNormalDatabase);
    if (!dbs.length) {
      panel.innerHTML =
        headerHtml(t('Accès dimensions')) +
        '<div class="panel"><p class="muted">' + t('Aucune database.') + '</p></div>';
      return Promise.resolve();
    }
    if (!state.accessDimDbId || !dbs.some(function (d) {
      return String(d.database) === String(state.accessDimDbId);
    })) {
      state.accessDimDbId = dbs[0].database;
      state.accessDimId = null;
    }

    panel.innerHTML =
      headerHtml(t('Groupes → dimensions')) +
      '<div class="panel">' +
      introHtml(
        t('Choisissez une base et une dimension, puis indiquez ce que chaque groupe peut faire sur ses éléments. Le tiret laisse le défaut.')
      ) +
      '<label>' + t('Database') + '<select id="access-dim-db"></select></label>' +
      '<label>' + t('Dimension') + '<select id="access-dim-dim"></select></label>' +
      '<div id="access-dim-matrix" class="muted">' + t('Chargement…') + '</div></div>';

    var dbSel = $('access-dim-db');
    dbs.forEach(function (db) {
      var o = document.createElement('option');
      o.value = db.database;
      o.textContent = db.name_database;
      if (String(db.database) === String(state.accessDimDbId)) o.selected = true;
      dbSel.appendChild(o);
    });

    function refreshDimSelectThenMatrix() {
      return populateAccessDimSelect($('access-dim-dim'), state.accessDimDbId).then(function () {
        return loadAccessDimMatrix(
          $('access-dim-matrix'),
          state.accessDimDbId,
          state.accessDimId,
          canWrite
        );
      });
    }

    dbSel.onchange = function () {
      state.accessDimDbId = dbSel.value;
      state.accessDimId = null;
      refreshDimSelectThenMatrix();
    };
    $('access-dim-dim').onchange = function () {
      state.accessDimId = $('access-dim-dim').value || null;
      loadAccessDimMatrix($('access-dim-matrix'), state.accessDimDbId, state.accessDimId, canWrite);
    };

    return refreshDimSelectThenMatrix();
  }

  function populateAccessDimSelect(sel, databaseId) {
    sel.innerHTML = '';
    var db = findDb(databaseId);
    var dims = ((db && db._dimensions) || []).slice();
    if (!dims.length) {
      var o = document.createElement('option');
      o.value = '';
      o.textContent = t('(aucune dimension)');
      sel.appendChild(o);
      state.accessDimId = null;
      return Promise.resolve();
    }
    if (!state.accessDimId || !dims.some(function (d) {
      return String(d.dimension) === String(state.accessDimId);
    })) {
      state.accessDimId = dims[0].dimension;
    }
    dims.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.dimension;
      o.textContent = d.name_dimension;
      if (String(d.dimension) === String(state.accessDimId)) o.selected = true;
      sel.appendChild(o);
    });
    return Promise.resolve();
  }

  function loadAccessDimMatrix(host, databaseId, dimensionId, canWrite) {
    if (!host) return Promise.resolve();
    host.className = 'muted';
    host.textContent = t('Chargement…');
    if (!dimensionId) {
      host.innerHTML = '<p class="muted">' + t('Choisissez une dimension.') + '</p>';
      return Promise.resolve();
    }

    var db = findDb(databaseId);
    var dimMeta = ((db && db._dimensions) || []).find(function (d) {
      return String(d.dimension) === String(dimensionId);
    });
    var dimName = dimMeta ? dimMeta.name_dimension : null;
    if (!dimName) {
      host.innerHTML = '<p class="error">' + t('Dimension introuvable.') + '</p>';
      return Promise.resolve();
    }

    var rightsCubeName = '#_GROUP_DIMENSION_DATA_' + dimName;
    var sysOpts = {
      show_normal: '1',
      show_system: '1',
      show_attribute: '0',
      show_info: '0',
    };

    return Promise.all([
      state.client.listCubes(databaseId, sysOpts),
      state.client.listDimensions(databaseId, sysOpts),
      state.client.listElements(databaseId, dimensionId),
    ])
      .then(function (triple) {
        var cubes = triple[0];
        var dims = triple[1];
        var elements = triple[2];
        var rightsCube = cubes.find(function (c) {
          return c.name_cube === rightsCubeName;
        });
        var groupDim = dims.find(function (d) {
          return d.name_dimension === '#_GROUP_';
        });
        if (!rightsCube || !groupDim) {
          host.innerHTML =
            '<p class="error">' +
            t('Cube <code>{name}</code> ou dimension <code>#_GROUP_</code> introuvable.', {
              name: escapeHtml(rightsCubeName),
            }) +
            '</p>';
          return;
        }
        return Promise.all([
          state.client.listElements(databaseId, groupDim.dimension),
          state.client.exportCells(databaseId, rightsCube.cube),
        ]).then(function (pair) {
          var groups = pair[0];
          var cellMap = pair[1];
          // #_GROUP_DIMENSION_DATA_<Dim> : group, element → path = groupId,elementId
          renderRightsLevelMatrix(host, {
            rows: groups,
            cols: elements,
            cellMap: cellMap,
            canWrite: canWrite,
            allowEmpty: true,
            rowHead: t('Groupe'),
            pathFn: function (group, el) {
              return group.element + ',' + el.element;
            },
            onChange: function (path, val) {
              return state.client.replaceCell(databaseId, rightsCube.cube, path, val).then(function () {
                toast(
                  val
                    ? t('Droit élément « {val} ».', { val: val })
                    : t('Droit élément remis au défaut.'),
                  'ok'
                );
              });
            },
          });
        });
      })
      .catch(function (e) {
        host.innerHTML = '<p class="error">' + escapeHtml(e.message || String(e)) + '</p>';
      });
  }

  function findDb(id) {
    return state.databases.find(function (d) {
      return String(d.database) === String(id);
    });
  }

  /* ---------- Flows ---------- */

  function createDimensionFlow(sel) {
    return promptName(t('Nouvelle dimension'), t('Nom de la dimension'), '').then(function (name) {
      if (!name) return;
      return state.client.createDimension(sel.databaseId, name).then(function (created) {
        toast(t('Dimension créée.'), 'ok');
        setOpen(treeKey(['db', sel.databaseId]), true);
        setOpen(treeKey(['db', sel.databaseId, 'dimensions']), true);
        return refreshAll({
          type: 'dimension',
          databaseId: sel.databaseId,
          databaseName: sel.databaseName,
          dimensionId: created.dimension,
          dimensionName: created.name_dimension || name,
        });
      });
    }).catch(showErr);
  }

  function createElementFlow(sel) {
    return openModal(
      t('Nouvel élément'),
      '<label>Nom<input id="el-name" type="text" /></label>' +
        '<label>Type<select id="el-type">' +
        '<option value="1">Numérique (mesure)</option>' +
        '<option value="2">Texte</option>' +
        '<option value="4">Consolidé</option>' +
        '</select></label>',
      function () {
        var name = ($('el-name').value || '').trim();
        if (!name) throw new Error(t('Nom requis.'));
        return { name: name, type: parseInt($('el-type').value, 10) };
      }
    ).then(function (data) {
      if (!data) return;
      return state.client.createElement(sel.databaseId, sel.dimensionId, data.name, data.type).then(function () {
        toast(t('Élément créé.'), 'ok');
        return renderDetail();
      });
    }).catch(showErr);
  }

  /** Ancêtres d’un élément (via champ parents), pour interdire les cycles. */
  function elementAncestors(rows, elementId) {
    var byId = {};
    rows.forEach(function (r) {
      byId[String(r.element)] = r;
    });
    var seen = {};
    var stack = [String(elementId)];
    var out = {};
    while (stack.length) {
      var id = stack.pop();
      var row = byId[id];
      if (!row) continue;
      String(row.parents || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
        .forEach(function (pid) {
          if (seen[pid]) return;
          seen[pid] = true;
          out[pid] = true;
          stack.push(pid);
        });
    }
    return out;
  }

  function consolidateFlow(sel, parentNode) {
    if (!parentNode || parentNode.element == null) {
      toast('Sélectionnez un élément (bouton consolidation sur sa ligne).', 'err');
      return Promise.resolve();
    }
    return state.client.listElements(sel.databaseId, sel.dimensionId).then(function (rows) {
      var byId = {};
      rows.forEach(function (r) {
        byId[String(r.element)] = r;
      });
      var parentId = String(parentNode.element);
      var parentRow = byId[parentId] || parentNode;
      var parentName = parentRow.name_element || parentNode.name_element || parentId;

      var forbidden = elementAncestors(rows, parentId);
      forbidden[parentId] = true;

      // Enfants déjà consolidés sur ce parent
      var childEntries = [];
      var existingIds = String(parentRow.children || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      var existingWeights = String(parentRow.weights || '')
        .split(',')
        .map(function (s) {
          return s.trim();
        });
      existingIds.forEach(function (cid, i) {
        var el = byId[cid];
        childEntries.push({
          id: cid,
          name: el ? el.name_element : '#' + cid,
          weight: existingWeights[i] != null && existingWeights[i] !== '' ? existingWeights[i] : '1',
        });
      });

      var p = openModal(
        t('Consolidation — {name}', { name: parentName }),
        '<p class="cons-parent-line muted">' +
          t('Parent :') +
          ' <strong id="cons-parent-name"></strong></p>' +
          '<div class="cons-add-row">' +
          '<label>' +
          t('Ajouter un enfant') +
          '<select id="cons-pick"></select></label>' +
          '<button type="button" class="btn btn-small btn-primary" id="cons-add">' +
          t('Ajouter') +
          '</button>' +
          '</div>' +
          '<p class="muted" style="margin:0.35rem 0 0">' +
          t('Enfants (poids modifiables) :') +
          '</p>' +
          '<ul class="cons-children-list" id="cons-list"></ul>' +
          '<p id="cons-empty" class="muted">' +
          t('Aucun enfant — ajoutez-en via le menu.') +
          '</p>',
        function () {
          if (!childEntries.length) throw new Error(t('Ajoutez au moins un enfant.'));
          var children = [];
          var weights = [];
          var bad = false;
          childEntries.forEach(function (c) {
            children.push(c.id);
            var w = String(c.weight).trim();
            if (w === '' || isNaN(Number(w))) bad = true;
            weights.push(w === '' ? '1' : w);
          });
          if (bad) throw new Error(t('Chaque poids doit être un nombre.'));
          return { parent: parentId, children: children, weights: weights };
        },
        { wide: true }
      );

      setTimeout(function () {
        if ($('cons-parent-name')) $('cons-parent-name').textContent = parentName;
        var pick = $('cons-pick');
        var list = $('cons-list');
        var empty = $('cons-empty');
        if (!pick || !list) return;

        function inList(id) {
          return childEntries.some(function (c) {
            return String(c.id) === String(id);
          });
        }

        function refreshPick() {
          pick.innerHTML = '';
          var placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = t('— choisir un élément —');
          pick.appendChild(placeholder);
          rows.forEach(function (r) {
            if (forbidden[String(r.element)]) return;
            if (inList(r.element)) return;
            var o = document.createElement('option');
            o.value = r.element;
            o.textContent = r.name_element;
            pick.appendChild(o);
          });
        }

        function renderList() {
          list.innerHTML = '';
          empty.classList.toggle('hidden', childEntries.length > 0);
          childEntries.forEach(function (c, idx) {
            var li = document.createElement('li');
            li.className = 'cons-child-row';
            li.innerHTML =
              '<span class="cons-child-name"></span>' +
              '<input type="number" step="any" class="cons-weight" title="' +
              escapeAttr(t('Poids')) +
              '" />' +
              iconBtn({ dataAct: 'rm', icon: 'del', title: t('Retirer'), extraClass: 'btn-danger', allowed: true });
            li.querySelector('.cons-child-name').textContent = c.name;
            var wInp = li.querySelector('.cons-weight');
            wInp.value = c.weight;
            wInp.oninput = function () {
              c.weight = wInp.value;
            };
            li.querySelector('[data-act="rm"]').onclick = function () {
              childEntries.splice(idx, 1);
              renderList();
              refreshPick();
            };
            list.appendChild(li);
          });
        }

        $('cons-add').onclick = function () {
          var id = pick.value;
          if (!id) {
            toast(t('Choisissez un enfant à ajouter.'), 'err');
            return;
          }
          if (forbidden[String(id)]) {
            toast(t('Consolidation cyclique interdite.'), 'err');
            return;
          }
          if (inList(id)) {
            toast(t('Cet enfant est déjà dans la liste.'), 'err');
            return;
          }
          var el = byId[id];
          childEntries.push({
            id: id,
            name: el ? el.name_element : '#' + id,
            weight: '1',
          });
          renderList();
          refreshPick();
        };

        refreshPick();
        renderList();
      }, 0);

      return p.then(function (data) {
        if (!data) return;
        return state.client
          .replaceElement(
            sel.databaseId,
            sel.dimensionId,
            data.parent,
            ELEMENT_CONSOLIDATED,
            data.children.join(','),
            data.weights.join(',')
          )
          .then(function () {
            toast(t('Consolidation enregistrée.'), 'ok');
            return renderDetail();
          });
      });
    }).catch(showErr);
  }

  function createCubeFlow(sel) {
    var db = findDb(sel.databaseId);
    var dims = (db && db._dimensions) || [];
    if (dims.length < 2) {
      toast(t('Il faut au moins 2 dimensions dans la base avant de créer un cube.'), 'err');
      return Promise.resolve();
    }
    var leftOpts = dims
      .map(function (d) {
        return '<option value="' + escapeAttr(d.dimension) + '">' + escapeHtml(d.name_dimension) + '</option>';
      })
      .join('');

    var p = openModal(
      t('Nouveau cube'),
      '<label>' +
        t('Nom') +
        '<input id="cube-name" type="text" /></label>' +
        '<div class="shuttle">' +
        '<div class="shuttle-col"><span class="muted">' +
        t('Dimensions disponibles') +
        '</span>' +
        '<select id="cube-left" multiple size="10">' +
        leftOpts +
        '</select></div>' +
        '<div class="shuttle-buttons">' +
        '<button type="button" class="btn btn-small" id="sh-right">→</button>' +
        '<button type="button" class="btn btn-small" id="sh-left">←</button>' +
        '</div>' +
        '<div class="shuttle-col"><span class="muted">' +
        t('Dimensions du cube (ordre = axes)') +
        '</span>' +
        '<select id="cube-right" multiple size="10"></select></div>' +
        '<div class="shuttle-order">' +
        '<button type="button" class="btn btn-small" id="sh-up">↑</button>' +
        '<button type="button" class="btn btn-small" id="sh-down">↓</button>' +
        '</div></div>',
      function () {
        var name = ($('cube-name').value || '').trim();
        if (!name) throw new Error(t('Nom requis.'));
        var right = $('cube-right');
        if (right.options.length < 2) throw new Error(t('Sélectionnez au moins 2 dimensions.'));
        var ids = Array.prototype.map.call(right.options, function (o) {
          return o.value;
        });
        return { name: name, dimensionIds: ids };
      }
    );

    // Bind shuttle after DOM inserted
    setTimeout(function () {
      wireShuttle();
    }, 0);

    return p
      .then(function (data) {
        if (!data) return;
        return state.client.createCube(sel.databaseId, data.name, data.dimensionIds.join(',')).then(function (created) {
          toast(t('Cube créé.'), 'ok');
          setOpen(treeKey(['db', sel.databaseId]), true);
          setOpen(treeKey(['db', sel.databaseId, 'cubes']), true);
          return refreshAll({
            type: 'cube',
            databaseId: sel.databaseId,
            databaseName: sel.databaseName,
            cubeId: created.cube,
            cubeName: created.name_cube || data.name,
          });
        });
      })
      .catch(showErr);
  }

  function wireShuttle() {
    var left = $('cube-left');
    var right = $('cube-right');
    if (!left || !right) return;

    function moveSelected(from, to) {
      Array.prototype.slice.call(from.selectedOptions).forEach(function (opt) {
        to.appendChild(opt);
      });
    }

    function moveOrder(dir) {
      var opts = Array.prototype.slice.call(right.selectedOptions);
      if (!opts.length) return;
      if (dir < 0) {
        opts.forEach(function (opt) {
          if (opt.previousElementSibling) right.insertBefore(opt, opt.previousElementSibling);
        });
      } else {
        opts.reverse().forEach(function (opt) {
          if (opt.nextElementSibling) right.insertBefore(opt.nextElementSibling, opt);
        });
      }
    }

    $('sh-right').onclick = function () {
      moveSelected(left, right);
    };
    $('sh-left').onclick = function () {
      moveSelected(right, left);
    };
    $('sh-up').onclick = function () {
      moveOrder(-1);
    };
    $('sh-down').onclick = function () {
      moveOrder(1);
    };
  }

  /* ---------- Refresh / errors ---------- */

  function showErr(e) {
    if (e && (e.sessionExpired || (window.PaloClient && PaloClient.isSessionExpiredError(e)))) {
      openReauthModal();
      return;
    }
    toast((e && e.message) || String(e), 'err');
  }

  function openReauthModal() {
    if (state.reauthOpen) return;
    if ($('app').classList.contains('hidden')) return;
    state.reauthOpen = true;
    // Fermer une éventuelle autre modale
    if (state.modalResolve) {
      try {
        state.modalResolve(false);
      } catch (ignore) {}
    }
    $('reauth-error').classList.add('hidden');
    $('reauth-user').value = state.username || $('inp-user').value || 'admin';
    $('reauth-pass').value = '';
    $('reauth-modal').classList.remove('hidden');
    $('reauth-modal').setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      $('reauth-pass').focus();
    }, 50);
  }

  function closeReauthModal() {
    state.reauthOpen = false;
    $('reauth-modal').classList.add('hidden');
    $('reauth-modal').setAttribute('aria-hidden', 'true');
    $('reauth-pass').value = '';
  }

  function bindReauth() {
    if (window.PaloClient && PaloClient.setSessionExpiredHandler) {
      PaloClient.setSessionExpiredHandler(function () {
        openReauthModal();
      });
    }

    $('reauth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var user = ($('reauth-user').value || '').trim();
      var pass = $('reauth-pass').value;
      if (!user || !pass) {
        $('reauth-error').textContent = 'Identifiant et mot de passe requis.';
        $('reauth-error').classList.remove('hidden');
        return;
      }
      $('reauth-ok').disabled = true;
      $('reauth-error').classList.add('hidden');
      var client = new PaloClient(serverBaseUrl());
      client
        .login(user, pass)
        .then(function () {
          return client.userInfo().catch(function () {
            return { isAdmin: user.toLowerCase() === 'admin', rights: {} };
          });
        })
        .then(function (info) {
          state.client = client;
          state.username = user;
          var label = applySessionInfo(info, user);
          $('session-label').textContent = label + ' @ ' + serverBaseUrl();
          closeReauthModal();
          toast(t('Reconnecté.'), 'ok');
          return refreshAll(state.selection);
        })
        .catch(function (err) {
          $('reauth-error').textContent = err.message || String(err);
          $('reauth-error').classList.remove('hidden');
        })
        .then(function () {
          $('reauth-ok').disabled = false;
        });
    });
  }

  function refreshAll(nextSelection) {
    return loadTree()
      .then(function () {
        if (nextSelection) state.selection = nextSelection;
        // fix databaseName if only id known
        if (state.selection && state.selection.databaseId) {
          var db = findDb(state.selection.databaseId);
          if (db) state.selection.databaseName = db.name_database;
        }
        // Si la sélection admin n’est plus autorisée, revenir à la racine admin ou vide
        if (state.selection && state.selection.type === 'admin-folder') {
          var folderRight = {
            users: 'user',
            'user-groups': 'user',
            groups: 'group',
            'group-roles': 'group',
            roles: 'rights',
            rights: 'rights',
            'role-rights': 'rights',
            'access-db': 'rights',
            'access-cube': 'rights',
            'access-dim': 'rights',
          }[state.selection.folder];
          if (state.selection.folder === 'rights') {
            state.selection = { type: 'admin-folder', folder: 'role-rights' };
          } else if (state.selection.folder === 'access-db' && !canAccessGroupDatabaseRights()) {
            state.selection = canSeeAdmin() ? { type: 'admin-folder', folder: 'groups' } : null;
          } else if (folderRight && !roleCan(folderRight, 'R')) {
            state.selection = canSeeAdmin() ? { type: 'admin-root' } : null;
          }
        }
        if (state.selection && state.selection.type === 'admin-root' && !canSeeAdmin()) {
          state.selection = null;
        }
        updateToolbarPermissions();
        renderTree();
        return renderDetail();
      })
      .catch(showErr);
  }

  /* ---------- Auth ---------- */

  function showApp(user) {
    $('login-view').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('session-label').textContent = user + ' @ ' + serverBaseUrl();
  }

  function showLogin() {
    $('app').classList.add('hidden');
    $('login-view').classList.remove('hidden');
    state.client = null;
    state.databases = [];
    state.system = null;
    state.isAdmin = false;
    state.groups = [];
    state.rights = {};
    state.selection = null;
  }

  function bindUi() {
    $('login-origin-label').textContent = t('Serveur\u00a0: ') + serverBaseUrl();
    bindReauth();

    $('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var user = $('inp-user').value.trim();
      var pass = $('inp-pass').value;
      $('login-error').classList.add('hidden');
      $('btn-login').disabled = true;
      var client = new PaloClient(serverBaseUrl());
      client
        .login(user, pass)
        .then(function () {
          state.client = client;
          state.username = user;
          return client.userInfo().catch(function () {
            return { isAdmin: user.toLowerCase() === 'admin', rights: {} };
          });
        })
        .then(function (info) {
          showApp(applySessionInfo(info, user));
          return refreshAll(null);
        })
        .catch(function (err) {
          $('login-error').textContent = err.message || String(err);
          $('login-error').classList.remove('hidden');
        })
        .then(function () {
          $('btn-login').disabled = false;
        });
    });

    $('btn-logout').onclick = function () {
      var c = state.client;
      showLogin();
      if (c) c.logout();
    };

    $('btn-refresh-tree').onclick = function () {
      refreshAll(state.selection);
    };

    $('btn-new-database').onclick = function () {
      if (!roleCan('database', 'W')) {
        toast(t('Droit insuffisant pour créer une base.'), 'err');
        return;
      }
      promptName(t('Nouvelle base'), t('Nom de la base'), '').then(function (name) {
        if (!name) return;
        return state.client.createDatabase(name).then(function (created) {
          toast(t('Base créée.'), 'ok');
          setOpen(treeKey(['db', created.database]), true);
          return refreshAll({
            type: 'database',
            databaseId: created.database,
            databaseName: created.name_database || name,
          });
        });
      }).catch(showErr);
    };

    $('modal').addEventListener('click', function (e) {
      if (e.target.getAttribute('data-close')) {
        if (state.modalResolve) state.modalResolve(false);
      }
    });
    $('modal-ok').onclick = function () {
      if (state.modalResolve) state.modalResolve(true);
    };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) {
        if (state.modalResolve) state.modalResolve(false);
      }
    });
  }

  function syncLangSelects() {
    var code = (globalThis.PaloI18n && PaloI18n.getLocale()) || 'fr';
    ['login-lang', 'app-lang'].forEach(function (id) {
      var el = $(id);
      if (el) el.value = code;
    });
  }

  function onLocaleChange(code) {
    if (globalThis.PaloI18n) PaloI18n.setLocale(code);
    syncLangSelects();
    var origin = $('login-origin-label');
    if (origin && !$('login-view').classList.contains('hidden')) {
      origin.textContent = t('Serveur\u00a0: ') + serverBaseUrl();
    }
    if (state.client && !$('app').classList.contains('hidden')) {
      refreshAll(state.selection);
    }
  }

  function bindLangSelectors() {
    syncLangSelects();
    if (globalThis.PaloI18n) PaloI18n.applyDom();
    ['login-lang', 'app-lang'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.onchange = function () {
        onLocaleChange(el.value);
      };
    });
  }

  bindLangSelectors();
  bindUi();
})();
