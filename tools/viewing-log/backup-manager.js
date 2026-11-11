(function (global) {
  "use strict";

  const DB_NAME = "viewingLog.backups.v1";
  const DB_VERSION = 1;
  const SNAPSHOTS = "snapshots";
  const SETTINGS = "settings";
  const HANDLE_KEY = "directoryHandle";
  const ROOT_DIR = "TRPG-Web-Tools-Data";
  const APP_DIR = "viewing-log";
  const FILE_NAME = "viewing-log-autobackup.json";
  const MAX_SNAPSHOTS = 30;
  const SNAPSHOT_INTERVAL = 5 * 60 * 1000;
  let dbPromise;
  let directoryHandle;
  let fileHandle;
  let backupPath = "";
  let lastSnapshotAt = 0;
  let writeTimer;
  let pendingPayload;
  let callbacks = {};

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "id", autoIncrement: true });
        if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function idbGet(store, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbPut(store, value, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const target = db.transaction(store, "readwrite").objectStore(store);
      const request = key === undefined ? target.put(value) : target.put(value, key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbDelete(store, key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store, "readwrite").objectStore(store).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function snapshots() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(SNAPSHOTS, "readonly").objectStore(SNAPSHOTS).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
      request.onerror = () => reject(request.error);
    });
  }

  function buildPayload(overrides, reason = "autosave") {
    return {
      $schema: "https://kumachansteps.github.io/trpg-web-tools/schemas/viewing-log-overrides.v1.schema.json",
      format: "kumachansteps.trpg.viewing-log-overrides",
      formatVersion: "1.0.0",
      app: "TRPG配信ログキーパー",
      version: 2,
      exportedAt: new Date().toISOString(),
      source: { app: "viewing-log", appVersion: "1.106", reason },
      ...JSON.parse(JSON.stringify(overrides || {})),
    };
  }

  function emit(status, detail = "") {
    callbacks.onStatus?.({
      status,
      detail,
      connected: Boolean(directoryHandle || fileHandle),
      supported: "showDirectoryPicker" in global,
      path: backupPath,
    });
  }

  async function saveSnapshot(payload, force) {
    if (!force && Date.now() - lastSnapshotAt < SNAPSHOT_INTERVAL) return;
    await idbPut(SNAPSHOTS, { savedAt: payload.exportedAt, payload });
    lastSnapshotAt = Date.now();
    const all = await snapshots();
    if (all.length <= MAX_SNAPSHOTS) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SNAPSHOTS, "readwrite");
      all.slice(MAX_SNAPSHOTS).forEach((item) => tx.objectStore(SNAPSHOTS).delete(item.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function permission(handle, request) {
    if (!handle) return "denied";
    let result = await handle.queryPermission({ mode: "readwrite" });
    if (result !== "granted" && request) result = await handle.requestPermission({ mode: "readwrite" });
    return result;
  }

  async function resolveTarget(parent) {
    let root = parent;
    const segments = [parent.name];
    if (parent.name !== ROOT_DIR && parent.name !== APP_DIR) {
      root = await parent.getDirectoryHandle(ROOT_DIR, { create: true });
      segments.push(ROOT_DIR);
    }
    if (root.name !== APP_DIR) {
      root = await root.getDirectoryHandle(APP_DIR, { create: true });
      segments.push(APP_DIR);
    }
    fileHandle = await root.getFileHandle(FILE_NAME, { create: true });
    backupPath = [...segments, FILE_NAME].join(" / ");
  }

  async function write(payload, requestPermission) {
    if (!fileHandle || await permission(fileHandle, requestPermission) !== "granted") {
      emit("permission-required", "外部ファイルへの再許可が必要です");
      return false;
    }
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2) + "\n");
    await writable.close();
    emit("saved", `${backupPath} に保存: ${new Date(payload.exportedAt).toLocaleString("ja-JP")}`);
    return true;
  }

  function queueWrite(payload) {
    pendingPayload = payload;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(async () => {
      const next = pendingPayload;
      pendingPayload = null;
      try { await write(next, false); }
      catch (error) { console.error(error); emit("error", "外部JSONの自動保存に失敗しました"); }
    }, 700);
  }

  async function init(options = {}) {
    callbacks = options;
    try {
      await openDb();
      directoryHandle = await idbGet(SETTINGS, HANDLE_KEY) || null;
      if (!directoryHandle) return emit("disconnected", "外部バックアップは未接続です");
      const allowed = await permission(directoryHandle, false);
      if (allowed === "granted") await resolveTarget(directoryHandle);
      emit(allowed === "granted" ? "connected" : "permission-required", allowed === "granted" ? `接続済み: ${backupPath}` : `再許可が必要です: ${directoryHandle.name}`);
    } catch (error) {
      console.error(error);
      emit("error", "バックアップ機能を初期化できませんでした");
    }
  }

  async function capture(overrides, options = {}) {
    const payload = buildPayload(overrides, options.reason);
    try { await saveSnapshot(payload, Boolean(options.forceSnapshot)); }
    catch (error) { console.error("ブラウザ内バックアップ保存失敗", error); }
    if (fileHandle) queueWrite(payload);
  }

  async function connectFolder(overrides) {
    if (!("showDirectoryPicker" in global)) return emit("unsupported", "このブラウザはフォルダ自動保存に対応していません"), false;
    try {
      directoryHandle = await global.showDirectoryPicker({ id: "trpg-viewing-log-backup", mode: "readwrite", startIn: "documents" });
      if (await permission(directoryHandle, true) !== "granted") return false;
      await resolveTarget(directoryHandle);
      await idbPut(SETTINGS, directoryHandle, HANDLE_KEY);
      await write(buildPayload(overrides, "connect"), true);
      return true;
    } catch (error) {
      if (error?.name !== "AbortError") { console.error(error); emit("error", "外部フォルダを接続できませんでした"); }
      return false;
    }
  }

  async function writeNow(overrides) {
    const payload = buildPayload(overrides, "manual");
    await saveSnapshot(payload, true);
    if (!fileHandle) return connectFolder(overrides);
    return write(payload, true);
  }

  async function disconnectFile() {
    directoryHandle = null;
    fileHandle = null;
    backupPath = "";
    clearTimeout(writeTimer);
    await idbDelete(SETTINGS, HANDLE_KEY);
    emit("disconnected", "外部バックアップを切断しました");
  }

  async function latestSnapshot() { return (await snapshots())[0]?.payload || null; }

  global.ViewingLogBackup = { init, capture, connectFolder, writeNow, disconnectFile, latestSnapshot, buildPayload };
})(window);
