/*
 * ブラウザ内保存（IndexedDB のキー・値ストア）
 * ユーザーの記録はまずこの端末に保存する。クラウド同期（Firestore）は後で足す。
 * IndexedDB が使えない環境（一部のプライベートモード）ではメモリに置き、ページを閉じると消える。
 */
(function () {
  "use strict";

  var Hub = (window.Hub = window.Hub || {});
  var DB_NAME = "trpg-scenario-hub";
  var STORE = "kv";
  var memory = {};
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      if (!("indexedDB" in window)) return resolve(null);
      var req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
    });
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then(function (db) {
      if (!db) return fn(null);
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var req = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(req && req.result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  Hub.store = {
    get: function (key) {
      return run("readonly", function (os) { return os ? os.get(key) : null; }).then(function (v) {
        return v === undefined || v === null ? (key in memory ? memory[key] : null) : v;
      });
    },
    set: function (key, value) {
      memory[key] = value;
      return run("readwrite", function (os) { return os ? os.put(value, key) : null; }).catch(function () {
        // 保存に失敗してもメモリには残っているので画面は動く
        return null;
      });
    },
    remove: function (key) {
      delete memory[key];
      return run("readwrite", function (os) { return os ? os.delete(key) : null; });
    },
    persistent: function () {
      return open().then(function (db) { return !!db; });
    }
  };
})();
