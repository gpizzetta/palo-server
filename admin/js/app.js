/**
 * Modeleur Palo P0+P1 — arbre + détail (réf. PalOOCa Modeller).
 * Connexion same-origin uniquement (serveur qui sert /explore).
 */
(function () {
  var ELEMENT_NUMERIC = 1;
  var ELEMENT_STRING = 2;
  var ELEMENT_CONSOLIDATED = 4;

  var BUILTIN_USERS = { admin: 1, _internal_suite: 1, poweruser: 1, editor: 1, viewer: 1 };

  /** Ordre Palo : N < R < W < D < S */
  var PERM_RANK = { N: 0, R: 1, W: 2, D: 3, S: 4 };

  var state = {
    client: null,
    username: '',
    isAdmin: false,
    rights: {}, // droits de rôle (user_info show_permission)
    databases: [],
    system: null, // { databaseId, usersDim, groupsDim, rolesDim, userGroupCube, groupRoleCube, roleRightCube, … }
    selection: null,
    treeOpen: {},
    elementRows: [],
    selectedElementId: null,
    modalResolve: null,
    reauthOpen: false,
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

  function applySessionInfo(info, user) {
    state.rights = (info && info.rights) || {};
    state.isAdmin = !!(info && info.isAdmin) || canSeeAdmin();
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
        if (!v) throw new Error('Nom requis.');
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
            userGroupCube: findCube('#_USER_GROUP'),
            groupRoleCube: findCube('#_GROUP_ROLE'),
            roleRightCube: findCube('#_ROLE_RIGHT_OBJECT'),
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
      li.textContent = 'Aucune base. Créez-en une avec le bouton « + » de la barre latérale.';
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
      '</button><span class="tree-icon">🔐</span><span class="tree-label">Administration</span>';
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
      [
        { folder: 'users', label: 'Utilisateurs', icon: '👤', right: 'user' },
        { folder: 'groups', label: 'Groupes', icon: '👥', right: 'group' },
        { folder: 'roles', label: 'Rôles', icon: '🎭', right: 'rights' },
      ]
        .filter(function (f) {
          return roleCan(f.right, 'R');
        })
        .forEach(function (f) {
          var child = document.createElement('li');
          var crow = document.createElement('div');
          crow.className = 'tree-item';
          if (state.selection && state.selection.type === 'admin-folder' && state.selection.folder === f.folder) {
            crow.classList.add('active');
          }
          crow.innerHTML =
            '<span class="tree-twist"></span><span class="tree-icon">' +
            f.icon +
            '</span><span class="tree-label">' +
            f.label +
            '</span>';
          crow.addEventListener('click', function (e) {
            e.stopPropagation();
            selectNode({ type: 'admin-folder', folder: f.folder });
          });
          child.appendChild(crow);
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
        renderFolderNode(db, 'dimensions', 'Dimensions', '📐', db._dimensions || [], function (dim) {
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
        renderFolderNode(db, 'cubes', 'Cubes', '📦', db._cubes || [], function (cube) {
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

  function renderDatabaseDetail(panel, sel) {
    var db = findDb(sel.databaseId);
    var dbPerm = (db && db.permission) || 'N';
    var mutable = isNormalDatabase(db);
    panel.innerHTML =
      headerHtml(
        sel.databaseName,
        [
          iconBtn({ id: 'act-rename-db', icon: 'edit', title: 'Renommer la base', allowed: mutable && canBoth('database', dbPerm, 'W') }),
          iconBtn({ id: 'act-del-db', icon: 'del', title: 'Supprimer la base', extraClass: 'btn-danger', allowed: mutable && canBoth('database', dbPerm, 'D') }),
          iconBtn({ id: 'act-new-dim', icon: 'add', title: 'Nouvelle dimension', extraClass: 'btn-primary', allowed: mutable && canBoth('dimension', dbPerm, 'W') }),
          iconBtn({ id: 'act-new-cube', icon: 'add', title: 'Nouveau cube', extraClass: 'btn-primary', allowed: mutable && canBoth('cube', dbPerm, 'W') }),
        ].join('')
      ) +
      '<div class="panel"><h3>Base de données</h3><p class="muted">Créez des dimensions (ex. Mesures, Produits), peuplez-les d’éléments, puis créez un cube (≥ 2 dimensions).</p></div>';

    onClickIf('act-rename-db', function () {
      promptName('Renommer la base', 'Nouveau nom', sel.databaseName).then(function (name) {
        if (!name) return;
        return state.client.renameDatabase(sel.databaseId, name).then(function () {
          toast('Base renommée.', 'ok');
          return refreshAll({ type: 'database', databaseId: sel.databaseId, databaseName: name });
        });
      }).catch(showErr);
    });
    onClickIf('act-del-db', function () {
      if (!confirmAction('Supprimer la base « ' + sel.databaseName + ' » ?')) return;
      state.client
        .destroyDatabase(sel.databaseId)
        .then(function () {
          toast('Base supprimée.', 'ok');
          state.selection = null;
          return refreshAll(null);
        })
        .catch(showErr);
    });
    onClickIf('act-new-dim', function () {
      return createDimensionFlow(sel);
    });
    onClickIf('act-new-cube', function () {
      return createCubeFlow(sel);
    });
    return Promise.resolve();
  }

  function renderDimensionsFolder(panel, sel) {
    var db = findDb(sel.databaseId);
    var dims = (db && db._dimensions) || [];
    var canCreate = isNormalDatabase(db) && canBoth('dimension', (db && db.permission) || 'N', 'W');
    panel.innerHTML =
      headerHtml(
        'Dimensions — ' + sel.databaseName,
        iconBtn({ id: 'act-new-dim', icon: 'add', title: 'Nouvelle dimension', extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel"><ul class="meta-list" id="dim-list"></ul></div>';
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
    if (!dims.length) ul.innerHTML = '<li class="muted">Aucune dimension.</li>';
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
        'Cubes — ' + sel.databaseName,
        iconBtn({ id: 'act-new-cube', icon: 'add', title: 'Nouveau cube', extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel"><ul class="meta-list" id="cube-list"></ul></div>';
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
    if (!cubes.length) ul.innerHTML = '<li class="muted">Aucun cube.</li>';
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
          iconBtn({ id: 'act-rename-dim', icon: 'edit', title: 'Renommer la dimension', allowed: canBoth('dimension', dimPerm, 'W') }),
          iconBtn({ id: 'act-del-dim', icon: 'del', title: 'Supprimer la dimension', extraClass: 'btn-danger', allowed: canBoth('dimension', dimPerm, 'D') }),
        ].join('')
      ) +
      '<div class="panel">' +
      '<div class="panel-heading"><h3>Éléments</h3>' +
      iconBtn({ id: 'act-new-el', icon: 'add', title: 'Nouvel élément', extraClass: 'btn-primary', allowed: canNewEl }) +
      '</div>' +
      '<div id="el-host" class="muted">Chargement…</div></div>';

    onClickIf('act-rename-dim', function () {
      promptName('Renommer la dimension', 'Nouveau nom', sel.dimensionName).then(function (name) {
        if (!name) return;
        return state.client.renameDimension(sel.databaseId, sel.dimensionId, name).then(function () {
          toast('Dimension renommée.', 'ok');
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
      if (!confirmAction('Supprimer la dimension « ' + sel.dimensionName + ' » ?')) return;
      state.client
        .destroyDimension(sel.databaseId, sel.dimensionId)
        .then(function () {
          toast('Dimension supprimée.', 'ok');
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
      '<div class="panel-heading"><h3>Attributs</h3><span id="attr-heading-actions"></span></div>' +
      '<div id="attr-host" class="muted">Chargement…</div>';
    $('detail-panel').appendChild(host);
    return state.client.dimensionInfo(sel.databaseId, sel.dimensionId).then(function (info) {
      var attrDim = info.attributes_dimension;
      var attrCube = info.attributes_cube;
      if (!attrDim || attrDim === '' || attrDim === '-1') {
        $('attr-host').innerHTML = '<p class="muted">Pas de dimension d’attributs pour cette dimension.</p>';
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
            title: 'Nouvel attribut',
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
            iconBtn({ dataAct: 'del', icon: 'del', title: 'Supprimer', extraClass: 'btn-danger', allowed: canDelThis });
          row.querySelector('.tree-label').textContent = a.name_element;
          var delBtn = row.querySelector('[data-act="del"]');
          if (delBtn) {
            delBtn.onclick = function () {
              if (!confirmAction('Supprimer l’attribut « ' + a.name_element + ' » ?')) return;
              state.client
                .destroyElement(sel.databaseId, attrDim, a.element)
                .then(function () {
                  toast('Attribut supprimé.', 'ok');
                  return renderDetail();
                })
                .catch(showErr);
            };
          }
          li.appendChild(row);
          ul.appendChild(li);
        });
        if (!attrs.length) ul.innerHTML = '<li class="muted">Aucun attribut.</li>';
        onClickIf('act-new-attr', function () {
          openModal(
            'Nouvel attribut',
            '<label>Nom<input id="attr-name" type="text" /></label>' +
              '<label>Type<select id="attr-type"><option value="1">Numérique</option><option value="2">Texte</option></select></label>',
            function () {
              var name = ($('attr-name').value || '').trim();
              if (!name) throw new Error('Nom requis.');
              return { name: name, type: parseInt($('attr-type').value, 10) };
            }
          )
            .then(function (data) {
              if (!data) return;
              return state.client.createElement(sel.databaseId, attrDim, data.name, data.type).then(function () {
                toast('Attribut créé.', 'ok');
                return renderDetail();
              });
            })
            .catch(showErr);
        });
        // note attr cube for values editing later
        if (attrCube) {
          var note = document.createElement('p');
          note.className = 'muted';
          note.textContent =
            'Les valeurs d’attributs se saisissent dans le cube d’attributs (#' +
            attrCube +
            '). Édition cellule par cellule prévue en raffinement.';
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

  function renderElementTree(host, rows) {
    if (!rows.length) {
      host.innerHTML = '<p class="muted">Aucun élément. Les « mesures » sont des éléments numériques d’une dimension (ex. Mesures).</p>';
      return;
    }
    var forest = buildElementForest(rows);
    var ul = document.createElement('ul');
    ul.className = 'element-tree';
    forest.forEach(function (n) {
      ul.appendChild(renderElementNode(n));
    });
    host.innerHTML = '';
    host.appendChild(ul);
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
      iconBtn({ dataAct: 'cons', icon: 'consolidate', title: 'Consolidation…', allowed: canCons }) +
      iconBtn({ dataAct: 'rename', icon: 'edit', title: 'Renommer', allowed: canRen }) +
      iconBtn({ dataAct: 'del', icon: 'del', title: 'Supprimer', extraClass: 'btn-danger', allowed: canDel });
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
        promptName('Renommer l’élément', 'Nouveau nom', node.name_element).then(function (name) {
          if (!name) return;
          return state.client.renameElement(sel.databaseId, sel.dimensionId, node.element, name).then(function () {
            toast('Élément renommé.', 'ok');
            return renderDetail();
          });
        }).catch(showErr);
      };
    }
    var delBtn = row.querySelector('[data-act="del"]');
    if (delBtn) {
      delBtn.onclick = function (e) {
        e.stopPropagation();
        if (!confirmAction('Supprimer l’élément « ' + node.name_element + ' » ?')) return;
        var sel = state.selection;
        state.client
          .destroyElement(sel.databaseId, sel.dimensionId, node.element)
          .then(function () {
            toast('Élément supprimé.', 'ok');
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
          iconBtn({ id: 'act-rename-cube', icon: 'edit', title: 'Renommer le cube', allowed: canBoth('cube', cubePerm, 'W') }),
          iconBtn({ id: 'act-clear-cube', icon: 'clear', title: 'Vider les valeurs', extraClass: 'btn-danger', allowed: canClear }),
          iconBtn({ id: 'act-del-cube', icon: 'del', title: 'Supprimer le cube', extraClass: 'btn-danger', allowed: canBoth('cube', cubePerm, 'D') }),
        ].join('')
      ) +
      '<div class="panel"><h3>Dimensions du cube</h3>' +
      '<p class="muted">Les axes d’un cube sont fixés à la création (API Palo) : on ne peut pas en ajouter ni en retirer ensuite. Pour changer le modèle, créer un nouveau cube.</p>' +
      '<ol id="cube-dims" class="meta-list"></ol><p id="cube-meta" class="muted"></p></div>' +
      '<div class="panel">' +
      '<div class="panel-heading"><h3>Règles</h3>' +
      iconBtn({
        id: 'act-new-rule',
        icon: 'add',
        title: 'Nouvelle règle',
        extraClass: 'btn-primary',
        allowed: canNewRule,
      }) +
      '</div>' +
      '<div id="rules-host" class="muted">Chargement…</div></div>';

    onClickIf('act-rename-cube', function () {
      promptName('Renommer le cube', 'Nouveau nom', sel.cubeName).then(function (name) {
        if (!name) return;
        return state.client.renameCube(sel.databaseId, sel.cubeId, name).then(function () {
          toast('Cube renommé.', 'ok');
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
      if (!confirmAction('Vider toutes les valeurs du cube « ' + sel.cubeName + ' » ?')) return;
      state.client
        .clearCube(sel.databaseId, sel.cubeId)
        .then(function () {
          toast('Cube vidé.', 'ok');
          return renderDetail();
        })
        .catch(showErr);
    });
    onClickIf('act-new-rule', function () {
      return ruleEditFlow(sel, null);
    });
    onClickIf('act-del-cube', function () {
      if (!confirmAction('Supprimer le cube « ' + sel.cubeName + ' » ?')) return;
      state.client
        .destroyCube(sel.databaseId, sel.cubeId)
        .then(function () {
          toast('Cube supprimé.', 'ok');
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
      $('cube-meta').textContent =
        'Cellules remplies : ' +
        (info.number_filled_cells != null ? info.number_filled_cells : '—') +
        ' / ' +
        (info.number_cells != null ? info.number_cells : '—');
      renderRulesList(sel, rules);
    });
  }

  function renderRulesList(sel, rules) {
    var host = $('rules-host');
    var canWrite = roleCan('rule', 'W');
    var canDelete = roleCan('rule', 'D');
    if (!rules.length) {
      host.innerHTML =
        '<p class="muted">Aucune règle. Utilisez le bouton « + » à côté de Règles.</p>';
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
        (isActive ? 'Désactiver la règle' : 'Activer la règle') +
        '">' +
        '<input type="checkbox" data-act="tog"' +
        (isActive ? ' checked' : '') +
        (canWrite ? '' : ' disabled') +
        ' />' +
        '<span class="switch-slider"></span>' +
        '</label>' +
        iconBtn({ dataAct: 'edit', icon: 'edit', title: 'Éditer la règle', allowed: canWrite }) +
        iconBtn({ dataAct: 'up', icon: 'up', title: 'Monter', allowed: canWrite }) +
        iconBtn({ dataAct: 'down', icon: 'down', title: 'Descendre', allowed: canWrite }) +
        iconBtn({ dataAct: 'del', icon: 'del', title: 'Supprimer', extraClass: 'btn-danger', allowed: canDelete });
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
          if (!confirmAction('Supprimer cette règle ?')) return;
          state.client
            .destroyRule(sel.databaseId, sel.cubeId, rule.rule)
            .then(function () {
              toast('Règle supprimée.', 'ok');
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
        outEl.textContent = 'Définition vide.';
        return Promise.resolve(false);
      }
      outEl.className = 'muted rule-check-out';
      outEl.textContent = 'Vérification…';
      return state.client
        .parseRule(sel.databaseId, sel.cubeId, d)
        .then(function () {
          outEl.className = 'rule-check-out ok';
          outEl.textContent = 'OK';
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
          existing ? 'Modifier la règle' : 'Nouvelle règle',
          '<div class="rule-editor-root" id="rule-editor-root">' +
            '<div class="muted" style="font-size:0.9rem">Définition</div>' +
            '<textarea id="rule-def" rows="7" placeholder="[\'Dim\':\'Élément\'] = [\'Dim\':\'Élément\'] * 1"></textarea>' +
            '</div>' +
            '<label>Commentaire<input id="rule-comment" type="text" /></label>' +
            '<div class="detail-actions">' +
            '<button type="button" class="btn btn-small" id="rule-check">Vérifier</button>' +
            '</div>' +
            '<p id="rule-check-out" class="muted rule-check-out"></p>',
          function () {
            var definition = editor ? editor.getDefinition() : ($('rule-def').value || '').trim();
            if (!definition) throw new Error('Définition requise.');
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
      headerHtml('Administration') +
      '<div class="panel"><p>Utilisateurs, groupes, rôles et droits (base System) — matrices d’appartenance et de permissions.</p>' +
      '<ul class="meta-list">' +
      '<li><strong>Utilisateurs</strong> : appartenance aux groupes</li>' +
      '<li><strong>Groupes</strong> : rôles affectés aux groupes</li>' +
      '<li><strong>Rôles</strong> : niveaux d’accès (N/R/W/D/S) par rôle</li>' +
      '</ul></div>';
    return Promise.resolve();
  }

  function renderAdminFolder(panel, sel) {
    var sys = state.system;
    if (!sys) {
      panel.innerHTML = '<p class="error">Base System introuvable.</p>';
      return Promise.resolve();
    }
    if (sel.folder === 'users') return renderAdminUsers(panel, sys);
    if (sel.folder === 'groups') return renderAdminGroups(panel, sys);
    if (sel.folder === 'roles' || sel.folder === 'rights') return renderAdminRoles(panel, sys);
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
      host.innerHTML = '<p class="muted">Aucune donnée à afficher.</p>';
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

  /** Matrice droits N/R/W/D/S — objets en lignes, rôles en colonnes. */
  function renderRightsLevelMatrix(host, opts) {
    var objs = opts.rows || [];
    var roles = opts.cols || [];
    var cellMap = opts.cellMap || {};
    var canWrite = !!opts.canWrite;
    var pathFn = opts.pathFn;
    var onChange = opts.onChange;
    var levels = ['N', 'R', 'W', 'D', 'S'];

    if (!objs.length || !roles.length) {
      host.innerHTML = '<p class="muted">Aucune donnée à afficher.</p>';
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'rights-matrix-wrap';
    var table = document.createElement('table');
    table.className = 'rights-matrix';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    hr.innerHTML = '<th class="row-head">Accès</th>';
    roles.forEach(function (c) {
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
      roles.forEach(function (role) {
        var td = document.createElement('td');
        var path = pathFn(obj, role);
        var cur = String(cellMap[path] || 'N').toUpperCase();
        if (levels.indexOf(cur) < 0) cur = 'N';
        var sel = document.createElement('select');
        sel.className = 'right-level';
        sel.disabled = !canWrite;
        levels.forEach(function (lv) {
          var o = document.createElement('option');
          o.value = lv;
          o.textContent = lv;
          if (lv === cur) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = function () {
          var next = sel.value;
          var prev = cur;
          sel.disabled = true;
          Promise.resolve(onChange(path, next, obj, role))
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
      panel.innerHTML = '<p class="error">Dimension #_USER_ absente.</p>';
      return Promise.resolve();
    }
    if (!roleCan('user', 'R')) {
      panel.innerHTML = '<p class="error">Droit insuffisant pour lister les utilisateurs.</p>';
      return Promise.resolve();
    }
    var canCreate = roleCan('user', 'W');
    var canPwd = roleCan('password', 'W');
    var canDel = roleCan('user', 'D');
    panel.innerHTML =
      headerHtml(
        'Utilisateurs',
        iconBtn({ id: 'act-new-user', icon: 'add', title: 'Nouvel utilisateur', extraClass: 'btn-primary', allowed: canCreate })
      ) +
      '<div class="panel"><div id="users-host" class="muted">Chargement…</div></div>';
    onClickIf('act-new-user', function () {
      openModal(
        'Nouvel utilisateur',
        '<label>Identifiant<input id="u-name" type="text" /></label>' +
          '<label>Mot de passe initial<input id="u-pass" type="password" /></label>',
        function () {
          var name = ($('u-name').value || '').trim();
          var pass = $('u-pass').value;
          if (!name) throw new Error('Identifiant requis.');
          if (!pass) throw new Error('Mot de passe requis.');
          if (BUILTIN_USERS[name.toLowerCase()]) throw new Error('Identifiant réservé.');
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
              toast('Utilisateur créé.', 'ok');
              return renderDetail();
            });
        })
        .catch(showErr);
    });
    panel.querySelector('#users-host').parentElement.insertAdjacentHTML(
      'afterend',
      '<div class="panel"><h3 class="admin-section-title">Appartenance aux groupes</h3>' +
        '<p class="muted">Lignes = utilisateurs, colonnes = groupes. Case cochée = membre du groupe.</p>' +
        '<div id="user-group-matrix" class="muted">Chargement…</div></div>'
    );

    return Promise.all([
      state.client.listElements(sys.databaseId, sys.usersDim.dimension),
      sys.groupsDim
        ? state.client.listElements(sys.databaseId, sys.groupsDim.dimension)
        : Promise.resolve([]),
      sys.userGroupCube
        ? state.client.exportCells(sys.databaseId, sys.userGroupCube.cube)
        : Promise.resolve({}),
    ]).then(function (triple) {
      var users = triple[0];
      var groups = triple[1];
      var cellMap = triple[2];
      var host = $('users-host');
      host.innerHTML = '';
      users.forEach(function (u) {
        var row = document.createElement('div');
        row.className = 'element-row';
        var builtin = !!BUILTIN_USERS[String(u.name_element).toLowerCase()];
        row.innerHTML =
          '<span class="tree-label"></span>' +
          iconBtn({ dataAct: 'pwd', icon: 'password', title: 'Mot de passe', allowed: canPwd }) +
          iconBtn({
            dataAct: 'del',
            icon: 'del',
            title: 'Supprimer',
            extraClass: 'btn-danger',
            allowed: !builtin && canDel && objCan(u.permission, 'D'),
          });
        row.querySelector('.tree-label').textContent = u.name_element;
        var pwdBtn = row.querySelector('[data-act="pwd"]');
        if (pwdBtn) {
          pwdBtn.onclick = function () {
            openModal(
              'Mot de passe — ' + u.name_element,
              '<label>Nouveau mot de passe<input id="u-pass" type="password" /></label>',
              function () {
                var pass = $('u-pass').value;
                if (!pass) throw new Error('Mot de passe requis.');
                return pass;
              }
            )
              .then(function (pass) {
                if (!pass) return;
                return state.client.changePassword(u.name_element, pass).then(function () {
                  toast('Mot de passe mis à jour.', 'ok');
                });
              })
              .catch(showErr);
          };
        }
        var del = row.querySelector('[data-act="del"]');
        if (del) {
          del.onclick = function () {
            if (!confirmAction('Supprimer l’utilisateur « ' + u.name_element + ' » ?')) return;
            state.client
              .destroyElement(sys.databaseId, sys.usersDim.dimension, u.element)
              .then(function () {
                toast('Utilisateur supprimé.', 'ok');
                return renderDetail();
              })
              .catch(showErr);
          };
        }
        host.appendChild(row);
      });

      var matrixHost = $('user-group-matrix');
      if (!sys.userGroupCube || !sys.groupsDim) {
        matrixHost.innerHTML = '<p class="error">Cube #_USER_GROUP introuvable.</p>';
        return;
      }
      var canWriteUg = roleCan('user', 'W') || roleCan('group', 'W');
      renderCheckboxMatrix(matrixHost, {
        rows: users,
        cols: groups,
        cellMap: cellMap,
        canWrite: canWriteUg,
        pathFn: function (user, group) {
          return user.element + ',' + group.element;
        },
        onToggle: function (path, on) {
          return setMembershipCell(sys, sys.userGroupCube, path, on).then(function () {
            toast(on ? 'Groupe associé.' : 'Groupe retiré.', 'ok');
          });
        },
      });
    });
  }

  function renderAdminNamedDim(panel, title, dim, createLabel, rightKey) {
    if (!roleCan(rightKey, 'R')) {
      panel.innerHTML = '<p class="error">Droit insuffisant.</p>';
      return Promise.resolve();
    }
    var canCreate = roleCan(rightKey, 'W');
    var canRen = roleCan(rightKey, 'W');
    var canDel = roleCan(rightKey, 'D');
    panel.innerHTML =
      headerHtml(
        title,
        iconBtn({
          id: 'act-new-named',
          icon: 'add',
          title: 'Nouveau — ' + createLabel,
          extraClass: 'btn-primary',
          allowed: canCreate,
        })
      ) +
      '<div class="panel"><div id="named-host" class="muted">Chargement…</div></div>';
    onClickIf('act-new-named', function () {
      promptName('Nouveau — ' + createLabel, 'Nom', '').then(function (name) {
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
            title: 'Renommer',
            allowed: canRen && objCan(r.permission, 'W'),
          }) +
          iconBtn({
            dataAct: 'del',
            icon: 'del',
            title: 'Supprimer',
            extraClass: 'btn-danger',
            allowed: !builtin && canDel && objCan(r.permission, 'D'),
          });
        row.querySelector('.tree-label').textContent = r.name_element;
        var ren = row.querySelector('[data-act="ren"]');
        if (ren) {
          ren.onclick = function () {
            promptName('Renommer', 'Nouveau nom', r.name_element).then(function (name) {
              if (!name) return;
              return state.client
                .renameElement(state.system.databaseId, dim.dimension, r.element, name)
                .then(function () {
                  toast('Renommé.', 'ok');
                  return renderDetail();
                });
            }).catch(showErr);
          };
        }
        var del = row.querySelector('[data-act="del"]');
        if (del) {
          del.onclick = function () {
            if (!confirmAction('Supprimer « ' + r.name_element + ' » ?')) return;
            state.client
              .destroyElement(state.system.databaseId, dim.dimension, r.element)
              .then(function () {
                toast('Supprimé.', 'ok');
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
      panel.innerHTML = '<p class="error">Dimension #_GROUP_ absente.</p>';
      return Promise.resolve();
    }
    return renderAdminNamedDim(panel, 'Groupes', sys.groupsDim, 'Groupe', 'group').then(function () {
      var extra = document.createElement('div');
      extra.className = 'panel';
      extra.innerHTML =
        '<h3 class="admin-section-title">Rôles des groupes</h3>' +
        '<p class="muted">Lignes = rôles, colonnes = groupes. Case cochée = le groupe possède ce rôle.</p>' +
        '<div id="group-role-matrix" class="muted">Chargement…</div>';
      panel.appendChild(extra);
      if (!sys.groupRoleCube || !sys.rolesDim) {
        $('group-role-matrix').innerHTML = '<p class="error">Cube #_GROUP_ROLE introuvable.</p>';
        return;
      }
      return Promise.all([
        state.client.listElements(sys.databaseId, sys.rolesDim.dimension),
        state.client.listElements(sys.databaseId, sys.groupsDim.dimension),
        state.client.exportCells(sys.databaseId, sys.groupRoleCube.cube),
      ]).then(function (triple) {
        var roles = triple[0];
        var groups = triple[1];
        var cellMap = triple[2];
        var canWriteGr = roleCan('group', 'W') || roleCan('rights', 'W');
        // Cube #_GROUP_ROLE : dimensions groupe, rôle → path = groupId,roleId
        renderCheckboxMatrix($('group-role-matrix'), {
          rows: roles,
          cols: groups,
          cellMap: cellMap,
          canWrite: canWriteGr,
          pathFn: function (role, group) {
            return group.element + ',' + role.element;
          },
          onToggle: function (path, on) {
            return setMembershipCell(sys, sys.groupRoleCube, path, on).then(function () {
              toast(on ? 'Rôle associé.' : 'Rôle retiré.', 'ok');
            });
          },
        });
      });
    });
  }

  function renderAdminRoles(panel, sys) {
    if (!sys.rolesDim) {
      panel.innerHTML = '<p class="error">Dimension #_ROLE_ absente.</p>';
      return Promise.resolve();
    }
    return renderAdminNamedDim(panel, 'Rôles', sys.rolesDim, 'Rôle', 'rights').then(function () {
      var extra = document.createElement('div');
      extra.className = 'panel';
      extra.innerHTML =
        '<h3 class="admin-section-title">Droits des rôles</h3>' +
        '<p class="muted">Lignes = accès possibles, colonnes = rôles. Niveaux : ' +
        '<code>N</code> none, <code>R</code> read, <code>W</code> write, <code>D</code> delete, <code>S</code> splash (cell data).</p>' +
        '<div id="role-right-matrix" class="muted">Chargement…</div>';
      panel.appendChild(extra);

      if (!sys.roleRightCube || !sys.rightObjDim) {
        $('role-right-matrix').innerHTML = '<p class="error">Cube #_ROLE_RIGHT_OBJECT introuvable.</p>';
        return;
      }
      if (!roleCan('rights', 'R')) {
        $('role-right-matrix').innerHTML = '<p class="error">Droit insuffisant pour lire les droits.</p>';
        return;
      }
      var canWrite = roleCan('rights', 'W');
      return Promise.all([
        state.client.listElements(sys.databaseId, sys.rightObjDim.dimension),
        state.client.listElements(sys.databaseId, sys.rolesDim.dimension),
        state.client.exportCells(sys.databaseId, sys.roleRightCube.cube),
      ]).then(function (triple) {
        var objs = triple[0];
        var roles = triple[1];
        var cellMap = triple[2];
        // Cube #_ROLE_RIGHT_OBJECT : dimensions rôle, objet → path = roleId,objectId
        renderRightsLevelMatrix($('role-right-matrix'), {
          rows: objs,
          cols: roles,
          cellMap: cellMap,
          canWrite: canWrite,
          pathFn: function (obj, role) {
            return role.element + ',' + obj.element;
          },
          onChange: function (path, val) {
            return state.client.replaceCell(sys.databaseId, sys.roleRightCube.cube, path, val).then(function () {
              toast('Droit « ' + val + ' » enregistré.', 'ok');
            });
          },
        });
      });
    });
  }

  function findDb(id) {
    return state.databases.find(function (d) {
      return String(d.database) === String(id);
    });
  }

  /* ---------- Flows ---------- */

  function createDimensionFlow(sel) {
    return promptName('Nouvelle dimension', 'Nom de la dimension', '').then(function (name) {
      if (!name) return;
      return state.client.createDimension(sel.databaseId, name).then(function (created) {
        toast('Dimension créée.', 'ok');
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
      'Nouvel élément',
      '<label>Nom<input id="el-name" type="text" /></label>' +
        '<label>Type<select id="el-type">' +
        '<option value="1">Numérique (mesure)</option>' +
        '<option value="2">Texte</option>' +
        '<option value="4">Consolidé</option>' +
        '</select></label>',
      function () {
        var name = ($('el-name').value || '').trim();
        if (!name) throw new Error('Nom requis.');
        return { name: name, type: parseInt($('el-type').value, 10) };
      }
    ).then(function (data) {
      if (!data) return;
      return state.client.createElement(sel.databaseId, sel.dimensionId, data.name, data.type).then(function () {
        toast('Élément créé.', 'ok');
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
        'Consolidation — ' + parentName,
        '<p class="cons-parent-line muted">Parent : <strong id="cons-parent-name"></strong></p>' +
          '<div class="cons-add-row">' +
          '<label>Ajouter un enfant<select id="cons-pick"></select></label>' +
          '<button type="button" class="btn btn-small btn-primary" id="cons-add">Ajouter</button>' +
          '</div>' +
          '<p class="muted" style="margin:0.35rem 0 0">Enfants (poids modifiables) :</p>' +
          '<ul class="cons-children-list" id="cons-list"></ul>' +
          '<p id="cons-empty" class="muted">Aucun enfant — ajoutez-en via le menu.</p>',
        function () {
          if (!childEntries.length) throw new Error('Ajoutez au moins un enfant.');
          var children = [];
          var weights = [];
          var bad = false;
          childEntries.forEach(function (c) {
            children.push(c.id);
            var w = String(c.weight).trim();
            if (w === '' || isNaN(Number(w))) bad = true;
            weights.push(w === '' ? '1' : w);
          });
          if (bad) throw new Error('Chaque poids doit être un nombre.');
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
          placeholder.textContent = '— choisir un élément —';
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
              '<input type="number" step="any" class="cons-weight" title="Poids" />' +
              iconBtn({ dataAct: 'rm', icon: 'del', title: 'Retirer', extraClass: 'btn-danger', allowed: true });
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
            toast('Choisissez un enfant à ajouter.', 'err');
            return;
          }
          if (forbidden[String(id)]) {
            toast('Consolidation cyclique interdite.', 'err');
            return;
          }
          if (inList(id)) {
            toast('Cet enfant est déjà dans la liste.', 'err');
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
            toast('Consolidation enregistrée.', 'ok');
            return renderDetail();
          });
      });
    }).catch(showErr);
  }

  function createCubeFlow(sel) {
    var db = findDb(sel.databaseId);
    var dims = (db && db._dimensions) || [];
    if (dims.length < 2) {
      toast('Il faut au moins 2 dimensions dans la base avant de créer un cube.', 'err');
      return Promise.resolve();
    }
    var leftOpts = dims
      .map(function (d) {
        return '<option value="' + escapeAttr(d.dimension) + '">' + escapeHtml(d.name_dimension) + '</option>';
      })
      .join('');

    var p = openModal(
      'Nouveau cube',
      '<label>Nom<input id="cube-name" type="text" /></label>' +
        '<div class="shuttle">' +
        '<div class="shuttle-col"><span class="muted">Dimensions disponibles</span>' +
        '<select id="cube-left" multiple size="10">' +
        leftOpts +
        '</select></div>' +
        '<div class="shuttle-buttons">' +
        '<button type="button" class="btn btn-small" id="sh-right">→</button>' +
        '<button type="button" class="btn btn-small" id="sh-left">←</button>' +
        '</div>' +
        '<div class="shuttle-col"><span class="muted">Dimensions du cube (ordre = axes)</span>' +
        '<select id="cube-right" multiple size="10"></select></div>' +
        '<div class="shuttle-order">' +
        '<button type="button" class="btn btn-small" id="sh-up">↑</button>' +
        '<button type="button" class="btn btn-small" id="sh-down">↓</button>' +
        '</div></div>',
      function () {
        var name = ($('cube-name').value || '').trim();
        if (!name) throw new Error('Nom requis.');
        var right = $('cube-right');
        if (right.options.length < 2) throw new Error('Sélectionnez au moins 2 dimensions.');
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
          toast('Cube créé.', 'ok');
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
          toast('Reconnecté.', 'ok');
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
          var folderRight = { users: 'user', groups: 'group', roles: 'rights', rights: 'rights' }[
            state.selection.folder
          ];
          if (state.selection.folder === 'rights') {
            state.selection = { type: 'admin-folder', folder: 'roles' };
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
    state.rights = {};
    state.selection = null;
  }

  function bindUi() {
    $('login-origin-label').textContent = 'Serveur : ' + serverBaseUrl();
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
        toast('Droit insuffisant pour créer une base.', 'err');
        return;
      }
      promptName('Nouvelle base', 'Nom de la base', '').then(function (name) {
        if (!name) return;
        return state.client.createDatabase(name).then(function (created) {
          toast('Base créée.', 'ok');
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

  bindUi();
})();
