/**
 * Éditeur de règles Palo — textarea + 2 combobox d’insertion.
 * Références : toutes databases/cubes ; cube courant → ['Dim':'Élément'],
 * autre cube → PALO.DATA("db","cube",…).
 */
(function (global) {
  var OPERATORS = [
    { label: '=  égalité', insert: ' = ' },
    { label: '+  addition', insert: ' + ' },
    { label: '−  soustraction', insert: ' - ' },
    { label: '×  multiplication', insert: ' * ' },
    { label: '÷  division', insert: ' / ' },
    { label: '( )  parenthèses', insert: '()', cursor: -1 },
    { label: '<  inférieur', insert: ' < ' },
    { label: '>  supérieur', insert: ' > ' },
    { label: '<=  inférieur ou égal', insert: ' <= ' },
    { label: '>=  supérieur ou égal', insert: ' >= ' },
    { label: '<>  différent', insert: ' <> ' },
    { label: 'IF(…)', insert: 'IF(, )', cursor: -3 },
    { label: 'STET()', insert: 'STET()' },
    { label: 'CONTINUE()', insert: 'CONTINUE()' },
    { label: 'PALO.DATA(…)', insert: 'PALO.DATA(, )', cursor: -3 },
    { label: 'ABS(…)', insert: 'ABS()', cursor: -1 },
    { label: 'MIN(…)', insert: 'MIN(, )', cursor: -3 },
    { label: 'MAX(…)', insert: 'MAX(, )', cursor: -3 },
    { label: 'ROUND(…)', insert: 'ROUND(, )', cursor: -3 },
  ];

  function quotePalo(name) {
    return String(name || '').replace(/'/g, "''");
  }

  function quoteDq(name) {
    return String(name || '').replace(/"/g, '""');
  }

  function pathLabel(parts) {
    return parts
      .filter(function (p) {
        return p != null && String(p).length;
      })
      .join(' : ');
  }

  /** Référence d’un autre cube : PALO.DATA("db","cube", …) avec élément fixé et !'Dim' ailleurs. */
  function buildPaloDataInsert(dbName, cube, dimName, elName) {
    var args = ['"' + quoteDq(dbName) + '"', '"' + quoteDq(cube.name) + '"'];
    (cube.dims || []).forEach(function (d) {
      if (d.name === dimName) {
        args.push('"' + quoteDq(elName) + '"');
      } else {
        args.push("!'" + quotePalo(d.name) + "'");
      }
    });
    return 'PALO.DATA(' + args.join(',') + ')';
  }

  function PaloRuleEditor(opts) {
    this.root = opts.root;
    this.ta = opts.textarea;
    this.refTree = opts.refTree || { databaseName: '', databases: [], cubes: [] };
    // Compat anciens appels { dims, cubeName, databaseName, cubes }
    if (!opts.refTree && opts.dims) {
      this.refTree = {
        databaseName: opts.databaseName || '',
        currentDatabaseName: opts.databaseName || '',
        currentCubeName: opts.cubeName || '',
        databases: [
          {
            name: opts.databaseName || '',
            cubes: [
              {
                name: opts.cubeName || '',
                dims: opts.dims || [],
              },
            ],
          },
        ],
        cubes: [
          {
            name: opts.cubeName || '',
            dims: opts.dims || [],
          },
        ],
      };
    }
    this._refItems = {};
    this._opItems = {};
    this._buildChrome();
    this._bind();
    if (opts.definition) this.ta.value = opts.definition;
  }

  PaloRuleEditor.prototype.getDefinition = function () {
    return (this.ta.value || '').trim();
  };

  PaloRuleEditor.prototype.setDefinition = function (def) {
    this.ta.value = def || '';
  };

  PaloRuleEditor.prototype.insertAtCursor = function (text, cursorOffset) {
    var ta = this.ta;
    ta.focus();
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var v = ta.value;
    ta.value = v.slice(0, start) + text + v.slice(end);
    var pos = start + text.length + (cursorOffset || 0);
    ta.setSelectionRange(pos, pos);
  };

  PaloRuleEditor.prototype._buildChrome = function () {
    var root = this.root;
    var ta = this.ta;

    var pick = document.createElement('div');
    pick.className = 'rule-pick';
    pick.innerHTML =
      '<label>Référence (database : cube : dimension : élément)' +
      '<select id="rule-ref"><option value="">— choisir —</option></select>' +
      '</label>' +
      '<label>Opérateur / fonction' +
      '<select id="rule-op"><option value="">— choisir —</option></select>' +
      '</label>';
    root.insertBefore(pick, ta);

    this._refSel = pick.querySelector('#rule-ref');
    this._opSel = pick.querySelector('#rule-op');
    this._populateRefCombo();
    this._populateOpCombo();

    ta.classList.add('rule-ta-simple');
    ta.setAttribute('spellcheck', 'false');
    ta.setAttribute('rows', '8');

    var hint = document.createElement('p');
    hint.className = 'muted rule-hint';
    hint.textContent =
      'Cube courant → [\'Dim\':\'Élément\']. Autre cube → PALO.DATA("db","cube",…). [] = tout le cube courant.';
    root.appendChild(hint);
  };

  PaloRuleEditor.prototype._populateRefCombo = function () {
    var sel = this._refSel;
    var items = {};
    var n = 0;
    var tree = this.refTree || {};
    var currentDb = tree.currentDatabaseName || tree.databaseName || '';
    var currentCube = tree.currentCubeName || '';
    var databases = tree.databases;
    var IND = '\u00a0\u00a0';

    if (!databases || !databases.length) {
      databases = [
        {
          name: currentDb,
          cubes: tree.cubes || [],
        },
      ];
    }

    function addOpt(parent, text, insert, cursor) {
      var key = 'r' + n++;
      var o = document.createElement('option');
      o.value = key;
      o.textContent = text;
      parent.appendChild(o);
      items[key] = { insert: insert, cursor: cursor || 0 };
    }

    function addDimHeader(parent, dimName) {
      var o = document.createElement('option');
      o.disabled = true;
      o.value = '';
      o.textContent = '— ' + dimName + ' —';
      parent.appendChild(o);
    }

    databases.forEach(function (db) {
      var dbName = db.name || '';
      if (!dbName && !(db.cubes || []).length) return;

      (db.cubes || []).forEach(function (cube) {
        var sameCube = dbName === currentDb && cube.name === currentCube;
        // Un seul libellé database/cube pour tout le sous-menu
        var g = document.createElement('optgroup');
        g.label = pathLabel([dbName, cube.name]) + (sameCube ? ' (courant)' : '');
        sel.appendChild(g);

        if (sameCube) {
          addOpt(g, '(tout le cube)', '[]', 0);
        }

        (cube.dims || []).forEach(function (d) {
          addDimHeader(g, d.name || '(dimension)');
          (d.elements || []).forEach(function (el) {
            var insert = sameCube
              ? "['" + quotePalo(d.name) + "':'" + quotePalo(el.name_element) + "']"
              : buildPaloDataInsert(dbName, cube, d.name, el.name_element);
            // Seulement le nom d’élément (db/cube déjà dans l’optgroup)
            addOpt(g, IND + IND + (el.name_element || ''), insert, 0);
          });
        });
      });
    });

    this._refItems = items;
  };

  PaloRuleEditor.prototype._populateOpCombo = function () {
    var sel = this._opSel;
    var items = {};
    OPERATORS.forEach(function (op, i) {
      var key = 'o' + i;
      var o = document.createElement('option');
      o.value = key;
      o.textContent = op.label;
      sel.appendChild(o);
      items[key] = { insert: op.insert, cursor: op.cursor || 0 };
    });
    this._opItems = items;
  };

  PaloRuleEditor.prototype._bind = function () {
    var self = this;
    var ta = this.ta;

    function applyCombo(combo, map) {
      var key = combo.value;
      if (!key || !map[key]) return;
      var it = map[key];
      self.insertAtCursor(it.insert, it.cursor);
      combo.value = '';
      ta.focus();
    }

    this._refSel.onchange = function () {
      applyCombo(self._refSel, self._refItems);
    };
    this._opSel.onchange = function () {
      applyCombo(self._opSel, self._opItems);
    };
  };

  global.PaloRuleEditor = PaloRuleEditor;
})(typeof window !== 'undefined' ? window : globalThis);
