import idb from './idb';

// if (!window.indexedDB) {
//     window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
// }

const dbPromise = idb.open('converter', 1, upgradeDb => {
    const CurrenciesStore = upgradeDb.createObjectStore('Currencies', {
        keyPath: 'guid'
    });
    CurrenciesStore.createIndex('guid', 'guid');

    const ExchangeRate = upgradeDb.createObjectStore('ExchangeRates', {
        keyPath: 'guid'
    });
    ExchangeRate.createIndex('guid', 'guid');
});


export default class Database {
    static addCurrencyArray (dbStore, data) {
        return dbPromise.then( db => {
            const tx = db.transaction(dbStore, 'readwrite');
            const store = tx.objectStore(dbStore);
            store.put(data);
            return tx.complete;
        });
    };

    static addCurrency(dbStore, key, data) {
        return dbPromise.then( db => {
            const tx = db.transaction(dbStore, 'readwrite');
            const store = tx.objectStore(dbStore);
            data.forEach(currency => store.put(currency, key));
            return tx.complete;
        });
    };

    static retrieve(dbStore, dbIndex) {
        return dbPromise.then( db => {
            const tx = db.transaction(dbStore);
            const store = tx.objectStore(dbStore);

            return store.get(dbIndex);
        });
    };

    static search (dbStore, dbIndex, searchKey, searchValue) {
        let results = [];
        return dbPromise.then(db => {
            const tx = db.transaction(dbStore, 'readwrite');
            const store = tx.objectStore(dbStore);

            if ( !dbIndex ) { return store.openCursor(); }
            const index = store.index(dbIndex);
            return index.openCursor();
        })
            .then(function findItem(cursor) {
                if (!cursor) return;
                if (cursor.value[searchKey] === searchValue) {
                    results.push(cursor.value);
                }
                return cursor.continue().then(findItem);
            })
            .then(function () {
                return results;
            })
    };

    static remove(dbStore, dbIndex, searchKey, searchValue) {
        return dbPromise.then( db => {
            const tx = db.transaction(dbStore, 'readwrite');
            const store = tx.objectStore(dbStore);

            if ( !dbIndex ) { return store.openCursor(); }
            const index = store.index(dbIndex);
            return index.openCursor();
        })
            .then(function deleteItem(cursor) {
                if (!cursor) return;
                if ( cursor.value[searchKey] === searchValue ) {
                    cursor.delete();
                }
                return cursor.continue().then(deleteItem);
            })
            .then(function() { return true; })
    };

}


