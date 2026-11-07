/**
 * Modeleur Palo P0 — arbre + détail (réf. PalOOCa Modeller).
 * Connexion same-origin uniquement (serveur qui sert /explore).
 */
(function () {
  var ELEMENT_NUMERIC = 1;
  var ELEMENT_STRING = 2;
  var ELEMENT_CONSOLIDATED = 4;

  var state = {
    client: null,
    username: '',
    databases: [],
    selection: null, // { type, databaseId, databaseName, dimensionId?, dimensionName?, cubeId?, cubeName? }
    treeOpen: {}, // key -> bool
    elementRows: [],
    selectedElementId: null,
    modalResolve: null,
  };

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

  function openModal(title, bodyHtml, validateFn) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHtml;
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
      // P0 : masquer System (droits / users = P1)
      state.databases = dbs.filter(function (d) {
        return String(d.name_database).toLowerCase() !== 'system';
      });
      return Promise.all(
        state.databases.map(function (db) {
          return Promise.all([
            state.client.listDimensions(db.database),
            state.client.listCubes(db.database),
          ]).then(function (pair) {
            db._dimensions = pair[0].filter(function (dim) {
              var n = dim.name_dimension || '';
              return n.charAt(0) !== '#';
            });
            db._cubes = pair[1].filter(function (c) {
              var n = c.name_cube || '';
              return n.charAt(0) !== '#';
            });
          });
        })
      );
    });
  }

  function renderTree() {
    var root = $('tree');
    root.innerHTML = '';
    state.databases.forEach(function (db) {
      root.appendChild(renderDbNode(db));
    });
    if (!state.databases.length) {
      var li = document.createElement('li');
      li.className = 'muted';
      li.style.padding = '0.5rem';
      li.textContent = 'Aucune base. Créez-en une avec « + Base ».';
      root.appendChild(li);
    }
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
    panel.innerHTML =
      headerHtml(sel.databaseName, [
        '<button type="button" class="btn btn-small" id="act-rename-db">Renommer</button>',
        '<button type="button" class="btn btn-small btn-danger" id="act-del-db">Supprimer</button>',
        '<button type="button" class="btn btn-small btn-primary" id="act-new-dim">+ Dimension</button>',
        '<button type="button" class="btn btn-small btn-primary" id="act-new-cube">+ Cube</button>',
      ].join('')) +
      '<div class="panel"><h3>Base de données</h3><p class="muted">Créez des dimensions (ex. Mesures, Produits), peuplez-les d’éléments, puis créez un cube (≥ 2 dimensions).</p></div>';

    $('act-rename-db').onclick = function () {
      promptName('Renommer la base', 'Nouveau nom', sel.databaseName).then(function (name) {
        if (!name) return;
        return state.client.renameDatabase(sel.databaseId, name).then(function () {
          toast('Base renommée.', 'ok');
          return refreshAll({ type: 'database', databaseId: sel.databaseId, databaseName: name });
        });
      }).catch(showErr);
    };
    $('act-del-db').onclick = function () {
      if (!confirmAction('Supprimer la base « ' + sel.databaseName + ' » ?')) return;
      state.client
        .destroyDatabase(sel.databaseId)
        .then(function () {
          toast('Base supprimée.', 'ok');
          state.selection = null;
          return refreshAll(null);
        })
        .catch(showErr);
    };
    $('act-new-dim').onclick = function () {
      return createDimensionFlow(sel);
    };
    $('act-new-cube').onclick = function () {
      return createCubeFlow(sel);
    };
    return Promise.resolve();
  }

  function renderDimensionsFolder(panel, sel) {
    var db = findDb(sel.databaseId);
    var dims = (db && db._dimensions) || [];
    panel.innerHTML =
      headerHtml('Dimensions — ' + sel.databaseName, '<button type="button" class="btn btn-small btn-primary" id="act-new-dim">+ Dimension</button>') +
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
    $('act-new-dim').onclick = function () {
      return createDimensionFlow(sel);
    };
    return Promise.resolve();
  }

  function renderCubesFolder(panel, sel) {
    var db = findDb(sel.databaseId);
    var cubes = (db && db._cubes) || [];
    panel.innerHTML =
      headerHtml('Cubes — ' + sel.databaseName, '<button type="button" class="btn btn-small btn-primary" id="act-new-cube">+ Cube</button>') +
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
    $('act-new-cube').onclick = function () {
      return createCubeFlow(sel);
    };
    return Promise.resolve();
  }

  function renderDimensionDetail(panel, sel) {
    panel.innerHTML =
      headerHtml(sel.dimensionName, [
        '<button type="button" class="btn btn-small" id="act-rename-dim">Renommer</button>',
        '<button type="button" class="btn btn-small btn-danger" id="act-del-dim">Supprimer</button>',
        '<button type="button" class="btn btn-small btn-primary" id="act-new-el">+ Élément</button>',
        '<button type="button" class="btn btn-small" id="act-consolidate">Consolidation…</button>',
      ].join('')) +
      '<div class="panel"><h3>Éléments</h3><div id="el-host" class="muted">Chargement…</div></div>';

    $('act-rename-dim').onclick = function () {
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
    };
    $('act-del-dim').onclick = function () {
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
    };
    $('act-new-el').onclick = function () {
      return createElementFlow(sel);
    };
    $('act-consolidate').onclick = function () {
      return consolidateFlow(sel);
    };

    return state.client.listElements(sel.databaseId, sel.dimensionId).then(function (rows) {
      state.elementRows = rows;
      renderElementTree($('el-host'), rows);
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
    row.innerHTML =
      '<span class="badge">' +
      elementTypeLabel(node.type) +
      '</span><span class="tree-label"></span>' +
      '<button type="button" class="btn btn-small" data-act="rename">Renommer</button>' +
      '<button type="button" class="btn btn-small btn-danger" data-act="del">Suppr.</button>';
    row.querySelector('.tree-label').textContent = node.name_element;
    row.addEventListener('click', function (e) {
      if (e.target.getAttribute('data-act')) return;
      state.selectedElementId = node.element;
      document.querySelectorAll('.element-row.selected').forEach(function (el) {
        el.classList.remove('selected');
      });
      row.classList.add('selected');
    });
    row.querySelector('[data-act="rename"]').onclick = function (e) {
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
    row.querySelector('[data-act="del"]').onclick = function (e) {
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
    panel.innerHTML =
      headerHtml(sel.cubeName, [
        '<button type="button" class="btn btn-small" id="act-rename-cube">Renommer</button>',
        '<button type="button" class="btn btn-small btn-danger" id="act-clear-cube">Vider les valeurs</button>',
        '<button type="button" class="btn btn-small btn-danger" id="act-del-cube">Supprimer</button>',
      ].join('')) +
      '<div class="panel"><h3>Dimensions du cube</h3><ol id="cube-dims" class="meta-list"></ol><p id="cube-meta" class="muted"></p></div>';

    $('act-rename-cube').onclick = function () {
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
    };
    $('act-clear-cube').onclick = function () {
      if (!confirmAction('Vider toutes les valeurs du cube « ' + sel.cubeName + ' » ?')) return;
      state.client
        .clearCube(sel.databaseId, sel.cubeId)
        .then(function () {
          toast('Cube vidé.', 'ok');
          return renderDetail();
        })
        .catch(showErr);
    };
    $('act-del-cube').onclick = function () {
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
    };

    var db = findDb(sel.databaseId);
    return state.client.cubeInfo(sel.databaseId, sel.cubeId).then(function (info) {
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

  function consolidateFlow(sel) {
    return state.client.listElements(sel.databaseId, sel.dimensionId).then(function (rows) {
      var options = rows
        .map(function (r) {
          return '<option value="' + escapeAttr(r.element) + '">' + escapeHtml(r.name_element) + '</option>';
        })
        .join('');
      return openModal(
        'Consolidation',
        '<p class="muted">Choisir le parent consolidé et les enfants avec poids (défaut 1).</p>' +
          '<label>Parent<select id="cons-parent">' +
          options +
          '</select></label>' +
          '<label>Enfants (Ctrl+clic)<select id="cons-children" multiple size="8">' +
          options +
          '</select></label>' +
          '<label>Poids (même ordre, séparés par des virgules — optionnel)<input id="cons-weights" type="text" placeholder="1,1,1" /></label>',
        function () {
          var parent = $('cons-parent').value;
          var childrenSel = Array.prototype.slice.call($('cons-children').selectedOptions).map(function (o) {
            return o.value;
          });
          if (!parent) throw new Error('Parent requis.');
          if (!childrenSel.length) throw new Error('Sélectionnez au moins un enfant.');
          if (childrenSel.indexOf(parent) >= 0) throw new Error('Le parent ne peut pas être son propre enfant.');
          var weightsRaw = ($('cons-weights').value || '').trim();
          var weights = weightsRaw
            ? weightsRaw.split(',').map(function (s) {
                return s.trim();
              })
            : childrenSel.map(function () {
                return '1';
              });
          if (weights.length !== childrenSel.length) throw new Error('Nombre de poids ≠ nombre d’enfants.');
          return { parent: parent, children: childrenSel, weights: weights };
        }
      ).then(function (data) {
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
    toast((e && e.message) || String(e), 'err');
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
    state.selection = null;
  }

  function bindUi() {
    $('login-origin-label').textContent = 'Serveur : ' + serverBaseUrl();

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
          showApp(user);
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
