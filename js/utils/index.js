import idb from 'idb';

if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
}

function IDB() {
    this._dbPromise = this._setupDB();
}


IDB.prototype._setupDB = function () {
    if (!navigator.serviceWorker) {return Promise.reject();}

    return idb.open('converter', 1, function(upgradeDb) {
        const CurrenciesStore = upgradeDb.createObjectStore('Currencies', {
            keyPath: 'guid'
        });
        CurrenciesStore.createIndex('guid', 'guid');

        const ExchangeRate = upgradeDb.createObjectStore('ExchangeRates', {
            keyPath: 'guid'
        });
        ExchangeRate.createIndex('guid', 'guid');
    });
};


IDB.prototype.addCurrencyArray = function (dbStore, data) {
    return this._dbPromise.then( function (db) {
        const tx = db.transaction(dbStore, 'readwrite');
        const store = tx.objectStore(dbStore);
        store.put(data);
        return tx.complete;
    });
};

IDB.prototype.addCurrency = function (dbStore, key, data) {
    return this._dbPromise.then( function (db) {
        const tx = db.transaction(dbStore, 'readwrite');
        const store = tx.objectStore(dbStore);
        data.forEach(currency => store.put(currency, key));
        return tx.complete;
    });
};


IDB.prototype.search = function (dbStore, dbIndex, searchKey, searchValue) {
    let results = [];
    return this._dbPromise.then(function (db) {
        const tx = db.transaction(dbStore, 'readwrite');
        const store = tx.objectStore(dbStore);

        if ( !dbIndex ) { return store.openCursor(); }
        const index = store.index(dbIndex);
        return index.openCursor();
    })
        .then(function findItem(cursor) {
            if (!cursor) return;
            if (cursor.value[searchKey] == searchValue) {
                results.push(cursor.value);
            }
            return cursor.continue().then(findItem);
        })
        .then(function () {
            return results;
        })
};


IDB.prototype.remove = function (dbStore, dbIndex, searchKey, searchValue) {
    return this._dbPromise.then( function(db) {
        const tx = db.transaction(dbStore, 'readwrite');
        const store = tx.objectStore(dbStore);

        if ( !dbIndex ) { return store.openCursor(); }
        const index = store.index(dbIndex);
        return index.openCursor();
    })
        .then(function deleteItem(cursor) {
            if (!cursor) return;
            if ( cursor.value[searchKey] == searchValue ) {
                cursor.delete();
            }
            return cursor.continue().then(deleteItem);
        })
        .then(function() { return true; })
};

IDB.prototype.retrieve = function(dbStore, dbIndex, check) {
    return this._dbPromise.then( function(db) {
        const tx = db.transaction(dbStore);
        const store = tx.objectStore(dbStore);

        if ( !check ) { return store.getAll(); }

        const index = store.index(dbIndex);
        return index.getAll(check);
    });
};