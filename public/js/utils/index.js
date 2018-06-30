(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

(function () {
    function toArray(arr) {
        return Array.prototype.slice.call(arr);
    }

    function promisifyRequest(request) {
        return new Promise(function (resolve, reject) {
            request.onsuccess = function () {
                resolve(request.result);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    function promisifyRequestCall(obj, method, args) {
        var request;
        var p = new Promise(function (resolve, reject) {
            request = obj[method].apply(obj, args);
            promisifyRequest(request).then(resolve, reject);
        });

        p.request = request;
        return p;
    }

    function promisifyCursorRequestCall(obj, method, args) {
        var p = promisifyRequestCall(obj, method, args);
        return p.then(function (value) {
            if (!value) return;
            return new Cursor(value, p.request);
        });
    }

    function proxyProperties(ProxyClass, targetProp, properties) {
        properties.forEach(function (prop) {
            Object.defineProperty(ProxyClass.prototype, prop, {
                get: function get() {
                    return this[targetProp][prop];
                },
                set: function set(val) {
                    this[targetProp][prop] = val;
                }
            });
        });
    }

    function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return promisifyRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return this[targetProp][prop].apply(this[targetProp], arguments);
            };
        });
    }

    function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
        properties.forEach(function (prop) {
            if (!(prop in Constructor.prototype)) return;
            ProxyClass.prototype[prop] = function () {
                return promisifyCursorRequestCall(this[targetProp], prop, arguments);
            };
        });
    }

    function Index(index) {
        this._index = index;
    }

    proxyProperties(Index, '_index', ['name', 'keyPath', 'multiEntry', 'unique']);

    proxyRequestMethods(Index, '_index', IDBIndex, ['get', 'getKey', 'getAll', 'getAllKeys', 'count']);

    proxyCursorRequestMethods(Index, '_index', IDBIndex, ['openCursor', 'openKeyCursor']);

    function Cursor(cursor, request) {
        this._cursor = cursor;
        this._request = request;
    }

    proxyProperties(Cursor, '_cursor', ['direction', 'key', 'primaryKey', 'value']);

    proxyRequestMethods(Cursor, '_cursor', IDBCursor, ['update', 'delete']);

    // proxy 'next' methods
    ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
        if (!(methodName in IDBCursor.prototype)) return;
        Cursor.prototype[methodName] = function () {
            var cursor = this;
            var args = arguments;
            return Promise.resolve().then(function () {
                cursor._cursor[methodName].apply(cursor._cursor, args);
                return promisifyRequest(cursor._request).then(function (value) {
                    if (!value) return;
                    return new Cursor(value, cursor._request);
                });
            });
        };
    });

    function ObjectStore(store) {
        this._store = store;
    }

    ObjectStore.prototype.createIndex = function () {
        return new Index(this._store.createIndex.apply(this._store, arguments));
    };

    ObjectStore.prototype.index = function () {
        return new Index(this._store.index.apply(this._store, arguments));
    };

    proxyProperties(ObjectStore, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']);

    proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, ['put', 'add', 'delete', 'clear', 'get', 'getAll', 'getKey', 'getAllKeys', 'count']);

    proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']);

    proxyMethods(ObjectStore, '_store', IDBObjectStore, ['deleteIndex']);

    function Transaction(idbTransaction) {
        this._tx = idbTransaction;
        this.complete = new Promise(function (resolve, reject) {
            idbTransaction.oncomplete = function () {
                resolve();
            };
            idbTransaction.onerror = function () {
                reject(idbTransaction.error);
            };
            idbTransaction.onabort = function () {
                reject(idbTransaction.error);
            };
        });
    }

    Transaction.prototype.objectStore = function () {
        return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
    };

    proxyProperties(Transaction, '_tx', ['objectStoreNames', 'mode']);

    proxyMethods(Transaction, '_tx', IDBTransaction, ['abort']);

    function UpgradeDB(db, oldVersion, transaction) {
        this._db = db;
        this.oldVersion = oldVersion;
        this.transaction = new Transaction(transaction);
    }

    UpgradeDB.prototype.createObjectStore = function () {
        return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
    };

    proxyProperties(UpgradeDB, '_db', ['name', 'version', 'objectStoreNames']);

    proxyMethods(UpgradeDB, '_db', IDBDatabase, ['deleteObjectStore', 'close']);

    function DB(db) {
        this._db = db;
    }

    DB.prototype.transaction = function () {
        return new Transaction(this._db.transaction.apply(this._db, arguments));
    };

    proxyProperties(DB, '_db', ['name', 'version', 'objectStoreNames']);

    proxyMethods(DB, '_db', IDBDatabase, ['close']);

    // Add cursor iterators
    // TODO: remove this once browsers do the right thing with promises
    ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
        [ObjectStore, Index].forEach(function (Constructor) {
            // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
            if (!(funcName in Constructor.prototype)) return;

            Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
                var args = toArray(arguments);
                var callback = args[args.length - 1];
                var nativeObject = this._store || this._index;
                var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
                request.onsuccess = function () {
                    callback(request.result);
                };
            };
        });
    });

    // polyfill getAll
    [Index, ObjectStore].forEach(function (Constructor) {
        if (Constructor.prototype.getAll) return;
        Constructor.prototype.getAll = function (query, count) {
            var instance = this;
            var items = [];

            return new Promise(function (resolve) {
                instance.iterateCursor(query, function (cursor) {
                    if (!cursor) {
                        resolve(items);
                        return;
                    }
                    items.push(cursor.value);

                    if (count !== undefined && items.length == count) {
                        resolve(items);
                        return;
                    }
                    cursor.continue();
                });
            });
        };
    });

    var exp = {
        open: function open(name, version, upgradeCallback) {
            var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
            var request = p.request;

            if (request) {
                request.onupgradeneeded = function (event) {
                    if (upgradeCallback) {
                        upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
                    }
                };
            }

            return p.then(function (db) {
                return new DB(db);
            });
        },
        delete: function _delete(name) {
            return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
        }
    };

    if (typeof module !== 'undefined') {
        module.exports = exp;
        module.exports.default = module.exports;
    } else {
        self.idb = exp;
    }
})();

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _idb = require('./idb');

var _idb2 = _interopRequireDefault(_idb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// if (!window.indexedDB) {
//     window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
// }

var dbPromise = _idb2.default.open('converter', 1, function (upgradeDb) {
    var CurrenciesStore = upgradeDb.createObjectStore('Currencies', {
        keyPath: 'guid'
    });
    CurrenciesStore.createIndex('guid', 'guid');

    var ExchangeRate = upgradeDb.createObjectStore('ExchangeRates', {
        keyPath: 'guid'
    });
    ExchangeRate.createIndex('guid', 'guid');
});

var Database = function () {
    function Database() {
        _classCallCheck(this, Database);
    }

    _createClass(Database, null, [{
        key: 'addCurrencyArray',
        value: function addCurrencyArray(dbStore, data) {
            return dbPromise.then(function (db) {
                var tx = db.transaction(dbStore, 'readwrite');
                var store = tx.objectStore(dbStore);
                store.put(data);
                return tx.complete;
            });
        }
    }, {
        key: 'addCurrency',
        value: function addCurrency(dbStore, key, data) {
            return dbPromise.then(function (db) {
                var tx = db.transaction(dbStore, 'readwrite');
                var store = tx.objectStore(dbStore);
                data.forEach(function (currency) {
                    return store.put(currency, key);
                });
                return tx.complete;
            });
        }
    }, {
        key: 'retrieve',
        value: function retrieve(dbStore, dbIndex) {
            return dbPromise.then(function (db) {
                var tx = db.transaction(dbStore);
                var store = tx.objectStore(dbStore);

                return store.get(dbIndex);
            });
        }
    }, {
        key: 'search',
        value: function search(dbStore, dbIndex, searchKey, searchValue) {
            var results = [];
            return dbPromise.then(function (db) {
                var tx = db.transaction(dbStore, 'readwrite');
                var store = tx.objectStore(dbStore);

                if (!dbIndex) {
                    return store.openCursor();
                }
                var index = store.index(dbIndex);
                return index.openCursor();
            }).then(function findItem(cursor) {
                if (!cursor) return;
                if (cursor.value[searchKey] === searchValue) {
                    results.push(cursor.value);
                }
                return cursor.continue().then(findItem);
            }).then(function () {
                return results;
            });
        }
    }, {
        key: 'remove',
        value: function remove(dbStore, dbIndex, searchKey, searchValue) {
            return dbPromise.then(function (db) {
                var tx = db.transaction(dbStore, 'readwrite');
                var store = tx.objectStore(dbStore);

                if (!dbIndex) {
                    return store.openCursor();
                }
                var index = store.index(dbIndex);
                return index.openCursor();
            }).then(function deleteItem(cursor) {
                if (!cursor) return;
                if (cursor.value[searchKey] === searchValue) {
                    cursor.delete();
                }
                return cursor.continue().then(deleteItem);
            }).then(function () {
                return true;
            });
        }
    }]);

    return Database;
}();

exports.default = Database;

},{"./idb":1}]},{},[2]);
