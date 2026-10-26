/* TRPG背景サジェストツール — 保存（IndexedDB）とフォルダの読み書き
 * ・libraries: フォルダ名ごとのタグデータ
 * ・thumbs: 画像ごとのサムネイルと色解析の結果（サイズと更新日時が変わったら作り直す）
 * ・handles: 前回開いたフォルダ（Chrome・Edge のみ） */
(function (global) {
  'use strict';

  const DB_NAME = 'haikei-suggest';
  const DB_VERSION = 1;
  const TAG_FILE = 'haikei-tags.json';
  const { IMAGE_EXT } = global.HaikeiEngine;

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      let request;
      try { request = indexedDB.open(DB_NAME, DB_VERSION); } catch (error) { resolve(null); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        ['libraries', 'thumbs', 'handles'].forEach((name) => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return dbPromise;
  }

  async function idb(storeName, mode, run) {
    const db = await openDb();
    if (!db) return undefined;
    return new Promise((resolve) => {
      let result;
      try {
        const tx = db.transaction(storeName, mode);
        const req = run(tx.objectStore(storeName));
        if (req) req.onsuccess = () => { result = req.result; };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => resolve(undefined);
        tx.onabort = () => resolve(undefined);
      } catch (error) {
        resolve(undefined);
      }
    });
  }

  const get = (store, key) => idb(store, 'readonly', (s) => s.get(key));
  const put = (store, key, value) => idb(store, 'readwrite', (s) => s.put(value, key));

  // ---------- フォルダの読み込み ----------

  const canPickDirectory = typeof global.showDirectoryPicker === 'function';

  // showDirectoryPicker で開いたフォルダを再帰的にたどる
  async function walkHandle(dir, prefix, out, onProgress) {
    for await (const [name, handle] of dir.entries()) {
      if (name.startsWith('.')) continue;
      const path = prefix ? prefix + '/' + name : name;
      if (handle.kind === 'directory') {
        await walkHandle(handle, path, out, onProgress);
      } else if (IMAGE_EXT.test(name)) {
        try {
          const file = await handle.getFile();
          out.push({ path, file });
          if (onProgress && out.length % 25 === 0) onProgress(out.length);
        } catch (error) { /* 読めないファイルは飛ばす */ }
      }
    }
    return out;
  }

  async function scanHandle(root, onProgress) {
    const files = await walkHandle(root, '', [], onProgress);
    let tagFile = null;
    try {
      const handle = await root.getFileHandle(TAG_FILE);
      tagFile = JSON.parse(await (await handle.getFile()).text());
    } catch (error) { tagFile = null; }
    return { name: root.name, files, tagFile };
  }

  // <input webkitdirectory> で選んだファイル一覧から読み込む（書き込みはできない）
  async function scanFileList(list) {
    const all = Array.from(list || []);
    if (!all.length) return null;
    const rootName = (all[0].webkitRelativePath || all[0].name).split('/')[0];
    const files = [];
    let tagFile = null;
    for (const file of all) {
      const rel = (file.webkitRelativePath || file.name).split('/').slice(1).join('/') || file.name;
      if (rel.split('/').some((part) => part.startsWith('.'))) continue;
      if (rel === TAG_FILE) {
        try { tagFile = JSON.parse(await file.text()); } catch (error) { tagFile = null; }
      } else if (IMAGE_EXT.test(rel)) {
        files.push({ path: rel, file });
      }
    }
    return { name: rootName, files, tagFile };
  }

  async function ensurePermission(handle, mode) {
    if (!handle || typeof handle.queryPermission !== 'function') return false;
    const opts = { mode };
    try {
      if ((await handle.queryPermission(opts)) === 'granted') return true;
      return (await handle.requestPermission(opts)) === 'granted';
    } catch (error) {
      return false;
    }
  }

  // 確認ダイアログを出さずに、許可済みかどうかだけを調べる
  async function hasPermission(handle, mode) {
    if (!handle || typeof handle.queryPermission !== 'function') return false;
    try { return (await handle.queryPermission({ mode })) === 'granted'; } catch (error) { return false; }
  }

  async function writeTagFile(root, data) {
    const handle = await root.getFileHandle(TAG_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 1));
    await writable.close();
  }

  global.HaikeiStore = {
    TAG_FILE,
    canPickDirectory,
    loadLibrary: (id) => get('libraries', id),
    saveLibrary: (id, data) => put('libraries', id, data),
    loadThumb: (key) => get('thumbs', key),
    saveThumb: (key, value) => put('thumbs', key, value),
    loadLastHandle: () => get('handles', 'last'),
    loadLibIndex: () => get('handles', 'index'),
    saveLibIndex: (index) => put('handles', 'index', index),
    saveLastHandle: (handle) => put('handles', 'last', handle),
    scanHandle,
    scanFileList,
    ensurePermission,
    hasPermission,
    writeTagFile
  };
})(window);
