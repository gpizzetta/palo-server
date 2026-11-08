/**
 * Éditeur de règles Palo — textarea + 2 combobox d’insertion.
 * Éléments cube courant → 'Dim':'Élément' (sans []) ; zone via opérateur [ ].
 * Autre cube → PALO.DATA("db","cube",…).
 */
(function (global) {
  function tr(key) {
    return typeof global.t === 'function' ? global.t(key) : key;
  }

  function operators() {
    return [
      { label: tr('[ ]  zone'), insert: '[]', cursor: -1 },
      { label: tr('=  égalité'), insert: ' = ' },
      { label: tr('+  addition'), insert: ' + ' },
      { label: tr('−  soustraction'), insert: ' - ' },
      { label: tr('×  multiplication'), insert: ' * ' },
      { label: tr('÷  division'), insert: ' / ' },
      { label: tr('( )  parenthèses'), insert: '()', cursor: -1 },
      { label: tr('<  inférieur'), insert: ' < ' },
      { label: tr('>  supérieur'), insert: ' > ' },
      { label: tr('<=  inférieur ou égal'), insert: ' <= ' },
      { label: tr('>=  supérieur ou égal'), insert: ' >= ' },
      { label: tr('<>  différent'), insert: ' <> ' },
      { label: 'IF(…)', insert: 'IF(, )', cursor: -3 },
      { label: 'STET()', insert: 'STET()' },
      { label: 'CONTINUE()', insert: 'CONTINUE()' },
      { label: 'PALO.DATA(…)', insert: 'PALO.DATA(, )', cursor: -3 },
      { label: 'ABS(…)', insert: 'ABS()', cursor: -1 },
      { label: 'MIN(…)', insert: 'MIN(, )', cursor: -3 },
      { label: 'MAX(…)', insert: 'MAX(, )', cursor: -3 },
      { label: 'ROUND(…)', insert: 'ROUND(, )', cursor: -3 },
    ];
  }

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
      '<label>' +
      tr('Référence (database : cube : dimension : élément)') +
      '<select id="rule-ref"><option value="">' +
      tr('— choisir —') +
      '</option></select>' +
      '</label>' +
      '<label>' +
      tr('Opérateur / fonction') +
      '<select id="rule-op"><option value="">' +
      tr('— choisir —') +
      '</option></select>' +
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
    hint.textContent = tr(
      "Insérer [ ] puis les éléments 'Dim':'Élément' (sans crochets). Plusieurs éléments : séparer par des virgules. Autre cube → PALO.DATA."
    );
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
        g.label = pathLabel([dbName, cube.name]) + (sameCube ? ' ' + tr('(courant)') : '');
        sel.appendChild(g);

        (cube.dims || []).forEach(function (d) {
          addDimHeader(g, d.name || '(dimension)');
          (d.elements || []).forEach(function (el) {
            // Sans [] : à placer dans une zone [ ] (opérateur) ou à compléter à la main
            var insert = sameCube
              ? "'" + quotePalo(d.name) + "':'" + quotePalo(el.name_element) + "'"
              : buildPaloDataInsert(dbName, cube, d.name, el.name_element);
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
    operators().forEach(function (op, i) {
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
