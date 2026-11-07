/**
 * Client HTTP Palo (same-origin ou baseUrl explicite).
 * Réponses text/plain CSV « ; » — voir palo-csv.js.
 */
(function (global) {
  function md5PasswordHex(password) {
    if (global.CryptoJS && global.CryptoJS.MD5) {
      return global.CryptoJS.MD5(String(password)).toString();
    }
    throw new Error('MD5 indisponible (vendor/md5.js)');
  }

  function PaloClient(baseUrl) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.sid = null;
  }

  PaloClient.prototype._url = function (path, params) {
    var p = Object.assign({}, params || {});
    if (this.sid) p.sid = this.sid;
    var sp = new URLSearchParams();
    Object.keys(p).forEach(function (k) {
      if (p[k] != null && p[k] !== '') sp.set(k, String(p[k]));
    });
    var q = sp.toString();
    return this.baseUrl + path + (q ? '?' + q : '');
  };

  /**
   * Ne pas envoyer X-PALO-SV/DB/DIM/CB : le serveur accepte l’absence de jeton,
   * mais répond 400 « database token outdated » si le jeton est périmé
   * (fréquent après listes / écritures qui changent le token base).
   * Le sid suffit pour le modeleur.
   */
  PaloClient.prototype._fetch = function (path, params) {
    var self = this;
    return fetch(this._url(path, params), { credentials: 'omit' })
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) {
            var err = global.PaloCsv.parseError(text);
            var e = new Error(err.message || text || 'HTTP ' + r.status);
            e.code = err.code;
            e.status = r.status;
            throw e;
          }
          return text;
        });
      })
      .catch(function (e) {
        if (e && e.name === 'TypeError') {
          throw new Error(
            'Impossible de joindre le serveur Palo (' +
              self.baseUrl +
              '). Vérifiez qu’il tourne et CORS si l’UI est sur une autre origine.'
          );
        }
        throw e;
      });
  };

  PaloClient.prototype.login = function (user, password) {
    var self = this;
    this.sid = null;
    var params = { user: user, password: md5PasswordHex(password) };
    return fetch(this._url('/server/login', params), { credentials: 'omit' })
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) {
            var err = global.PaloCsv.parseError(text);
            throw new Error(err.message || 'Login échoué');
          }
          var rows = global.PaloCsv.parseBody(text);
          if (!rows.length) throw new Error('Réponse login vide');
          self.sid = rows[0][0];
          return { sid: self.sid };
        });
      });
  };

  PaloClient.prototype.logout = function () {
    var self = this;
    if (!this.sid) return Promise.resolve();
    return this._fetch('/server/logout', {})
      .catch(function () {})
      .then(function () {
        self.sid = null;
      });
  };

  PaloClient.prototype.listDatabases = function () {
    return this._fetch('/server/databases', { show_normal: '1', show_system: '1', show_user_info: '1' }).then(
      function (text) {
        return global.PaloCsv.parseBody(text)
          .filter(function (f) {
            return f.length >= 2;
          })
          .map(function (fields) {
            return {
              database: fields[0],
              name_database: fields[1],
              number_dimensions: fields[2],
              number_cubes: fields[3],
              status: fields[4],
              type: fields[5],
              database_token: fields[6],
            };
          });
      }
    );
  };

  PaloClient.prototype.createDatabase = function (newName) {
    return this._fetch('/database/create', { new_name: newName }).then(function (text) {
      var f = global.PaloCsv.parseBody(text)[0] || [];
      return { database: f[0], name_database: f[1] || newName };
    });
  };

  PaloClient.prototype.destroyDatabase = function (databaseId) {
    return this._fetch('/database/destroy', { database: databaseId });
  };

  PaloClient.prototype.renameDatabase = function (databaseId, newName) {
    return this._fetch('/database/rename', { database: databaseId, new_name: newName });
  };

  PaloClient.prototype.listDimensions = function (databaseId, extra) {
    var p = Object.assign({ database: databaseId, show_normal: '1', show_system: '0', show_attribute: '0', show_info: '0' }, extra || {});
    return this._fetch('/database/dimensions', p).then(function (text) {
      return global.PaloCsv.parseBody(text)
        .filter(function (f) {
          return f.length >= 2;
        })
        .map(function (fields) {
          return {
            dimension: fields[0],
            name_dimension: fields[1],
            number_elements: fields[2],
            type: fields[6] != null ? fields[6] : fields[3],
            dimension_token: fields[7],
          };
        });
    });
  };

  PaloClient.prototype.createDimension = function (databaseId, newName) {
    return this._fetch('/dimension/create', { database: databaseId, new_name: newName }).then(function (text) {
      var f = global.PaloCsv.parseBody(text)[0] || [];
      return { dimension: f[0], name_dimension: f[1] || newName };
    });
  };

  PaloClient.prototype.destroyDimension = function (databaseId, dimensionId) {
    return this._fetch('/dimension/destroy', { database: databaseId, dimension: dimensionId });
  };

  PaloClient.prototype.renameDimension = function (databaseId, dimensionId, newName) {
    return this._fetch('/dimension/rename', { database: databaseId, dimension: dimensionId, new_name: newName });
  };

  PaloClient.prototype.listCubes = function (databaseId, extra) {
    var p = Object.assign({ database: databaseId, show_normal: '1', show_system: '0', show_attribute: '0', show_info: '0' }, extra || {});
    return this._fetch('/database/cubes', p).then(function (text) {
      return global.PaloCsv.parseBody(text)
        .filter(function (f) {
          return f.length >= 2;
        })
        .map(function (fields) {
          return {
            cube: fields[0],
            name_cube: fields[1],
            number_dimensions: fields[2],
            dimensions: fields[3],
            type: fields[6],
            cube_token: fields[7],
          };
        });
    });
  };

  PaloClient.prototype.createCube = function (databaseId, newName, dimensionIdsComma) {
    return this._fetch('/cube/create', {
      database: databaseId,
      new_name: newName,
      dimensions: dimensionIdsComma,
    }).then(function (text) {
      var f = global.PaloCsv.parseBody(text)[0] || [];
      return { cube: f[0], name_cube: f[1] || newName };
    });
  };

  PaloClient.prototype.destroyCube = function (databaseId, cubeId) {
    return this._fetch('/cube/destroy', { database: databaseId, cube: cubeId });
  };

  PaloClient.prototype.renameCube = function (databaseId, cubeId, newName) {
    return this._fetch('/cube/rename', { database: databaseId, cube: cubeId, new_name: newName });
  };

  PaloClient.prototype.clearCube = function (databaseId, cubeId) {
    return this._fetch('/cube/clear', { database: databaseId, cube: cubeId, complete: '1' });
  };

  PaloClient.prototype.cubeInfo = function (databaseId, cubeId) {
    return this._fetch('/cube/info', { database: databaseId, cube: cubeId }).then(function (text) {
      var f = global.PaloCsv.parseBody(text)[0] || [];
      return {
        cube: f[0],
        name_cube: f[1],
        number_dimensions: f[2],
        dimensions: f[3],
        number_cells: f[4],
        number_filled_cells: f[5],
        status: f[6],
        type: f[7],
      };
    });
  };

  PaloClient.prototype.listElements = function (databaseId, dimensionId) {
    return this._fetch('/dimension/elements', { database: databaseId, dimension: dimensionId }).then(function (text) {
      return global.PaloCsv.parseBody(text)
        .filter(function (f) {
          return f.length >= 2;
        })
        .map(function (fields) {
          return {
            element: fields[0],
            name_element: fields[1],
            position: fields[2],
            level: fields[3],
            indent: fields[4],
            depth: fields[5],
            type: parseInt(fields[6], 10),
            number_parents: fields[7],
            parents: fields[8],
            number_children: fields[9],
            children: fields[10],
            weights: fields[11],
          };
        });
    });
  };

  /** type: 1=numeric, 2=string, 4=consolidated */
  PaloClient.prototype.createElement = function (databaseId, dimensionId, newName, typeNum, childrenCsv, weightsCsv) {
    var params = {
      database: databaseId,
      dimension: dimensionId,
      new_name: newName,
      type: typeNum,
    };
    if (typeNum === 4 && childrenCsv) params.children = childrenCsv;
    if (weightsCsv) params.weights = weightsCsv;
    return this._fetch('/element/create', params).then(function (text) {
      var f = global.PaloCsv.parseBody(text)[0] || [];
      return { element: f[0], name_element: f[1] || newName };
    });
  };

  PaloClient.prototype.destroyElement = function (databaseId, dimensionId, elementId) {
    return this._fetch('/element/destroy', { database: databaseId, dimension: dimensionId, element: elementId });
  };

  PaloClient.prototype.renameElement = function (databaseId, dimensionId, elementId, newName) {
    return this._fetch(
      '/element/rename',
      { database: databaseId, dimension: dimensionId, element: elementId, new_name: newName },
      true
    );
  };

  /** Remplace les enfants d’un consolidé (type 4). */
  PaloClient.prototype.replaceElement = function (databaseId, dimensionId, elementId, typeNum, childrenCsv, weightsCsv) {
    var params = {
      database: databaseId,
      dimension: dimensionId,
      element: elementId,
      type: typeNum,
    };
    if (childrenCsv != null) params.children = childrenCsv;
    if (weightsCsv != null) params.weights = weightsCsv;
    return this._fetch('/element/replace', params);
  };

  PaloClient.prototype.elementAppend = function (databaseId, dimensionId, elementId, childrenCsv, weightsCsv) {
    var params = {
      database: databaseId,
      dimension: dimensionId,
      element: elementId,
      children: childrenCsv,
    };
    if (weightsCsv) params.weights = weightsCsv;
    return this._fetch('/element/append', params);
  };

  global.PaloClient = PaloClient;
})(typeof window !== 'undefined' ? window : globalThis);
