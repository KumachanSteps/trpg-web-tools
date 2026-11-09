(function(global){
  "use strict";

  const DB_NAME = "sessionLogTool.backups.v1";
  const DB_VERSION = 1;
  const SNAPSHOT_STORE = "snapshots";
  const SETTINGS_STORE = "settings";
  const HANDLE_KEY = "externalBackupHandle";
  const DIRECTORY_HANDLE_KEY = "externalBackupDirectoryHandle";
  const DATA_ROOT_DIR = "TRPG-Web-Tools-Data";
  const APP_DIR = "session-log-tool";
  const BACKUP_FILENAME = "session-log-tool-autobackup.json";
  const MAX_SNAPSHOTS = 30;
  const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
  const WRITE_DEBOUNCE_MS = 700;

  let dbPromise = null;
  let fileHandle = null;
  let directoryHandle = null;
  let backupPath = "";
  let pendingPayload = null;
  let writeTimer = null;
  let writeChain = Promise.resolve();
  let lastSnapshotAt = 0;
  let callbacks = {};

  function openDb(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve,reject)=>{
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = ()=>{
        const db = request.result;
        if(!db.objectStoreNames.contains(SNAPSHOT_STORE)){
          db.createObjectStore(SNAPSHOT_STORE,{ keyPath:"id", autoIncrement:true }).createIndex("savedAt","savedAt");
        }
        if(!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
      };
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
    });
    return dbPromise;
  }

  async function idbGet(store,key){
    const db = await openDb();
    return new Promise((resolve,reject)=>{
      const request = db.transaction(store,"readonly").objectStore(store).get(key);
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
    });
  }

  async function idbPut(store,value,key){
    const db = await openDb();
    return new Promise((resolve,reject)=>{
      const objectStore = db.transaction(store,"readwrite").objectStore(store);
      const request = typeof key === "undefined" ? objectStore.put(value) : objectStore.put(value,key);
      request.onsuccess = ()=>resolve(request.result);
      request.onerror = ()=>reject(request.error);
    });
  }

  async function idbDelete(store,key){
    const db = await openDb();
    return new Promise((resolve,reject)=>{
      const request = db.transaction(store,"readwrite").objectStore(store).delete(key);
      request.onsuccess = ()=>resolve();
      request.onerror = ()=>reject(request.error);
    });
  }

  async function getAllSnapshots(){
    const db = await openDb();
    return new Promise((resolve,reject)=>{
      const request = db.transaction(SNAPSHOT_STORE,"readonly").objectStore(SNAPSHOT_STORE).getAll();
      request.onsuccess = ()=>resolve((request.result || []).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));
      request.onerror = ()=>reject(request.error);
    });
  }

  async function trimSnapshots(){
    const snapshots = await getAllSnapshots();
    const excess = snapshots.slice(MAX_SNAPSHOTS);
    if(!excess.length) return;
    const db = await openDb();
    await new Promise((resolve,reject)=>{
      const tx = db.transaction(SNAPSHOT_STORE,"readwrite");
      const store = tx.objectStore(SNAPSHOT_STORE);
      excess.forEach(item=>store.delete(item.id));
      tx.oncomplete = resolve;
      tx.onerror = ()=>reject(tx.error);
    });
  }

  function buildPayload(state,reason){
    return {
      $schema: "https://kumachansteps.github.io/trpg-web-tools/schemas/session-log.v1.schema.json",
      format: "kumachansteps.trpg.session-log",
      formatVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      source: { app:"session-log-tool", appVersion:global.SESSION_LOG_APP_VERSION || "unknown", reason:reason || "autosave" },
      ...JSON.parse(JSON.stringify(state))
    };
  }

  function emitStatus(status,detail){
    callbacks.onStatus?.({
      status,
      detail:detail || "",
      connected:Boolean(fileHandle || directoryHandle),
      supported:"showDirectoryPicker" in global || "showSaveFilePicker" in global,
      path:backupPath
    });
  }

  function emitError(message,error){
    console.error(message,error);
    callbacks.onError?.(message,error);
  }

  async function saveSnapshot(payload,force){
    const now = Date.now();
    if(!force && now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
    await idbPut(SNAPSHOT_STORE,{ savedAt:payload.exportedAt, payload });
    lastSnapshotAt = now;
    await trimSnapshots();
  }

  async function permission(handle,request){
    if(!handle) return "denied";
    const options = { mode:"readwrite" };
    let result = await handle.queryPermission(options);
    if(result !== "granted" && request) result = await handle.requestPermission(options);
    return result;
  }

  async function writePayload(payload,requestPermission){
    if(!fileHandle) return false;
    const allowed = await permission(fileHandle,Boolean(requestPermission));
    if(allowed !== "granted"){
      emitStatus("permission-required","外部ファイルへの再許可が必要です");
      return false;
    }
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload,null,2) + "\n");
    await writable.close();
    emitStatus("saved",`${backupPath || fileHandle.name} に保存: ${new Date(payload.exportedAt).toLocaleString("ja-JP")}`);
    return true;
  }

  async function resolveDirectoryTarget(parent,{ create=true }={}){
    if(!parent) return null;
    let appDirectory = parent;
    const segments = [parent.name].filter(Boolean);
    if(parent.name !== APP_DIR){
      let dataRoot = parent;
      if(parent.name !== DATA_ROOT_DIR){
        dataRoot = await parent.getDirectoryHandle(DATA_ROOT_DIR,{ create });
        segments.push(DATA_ROOT_DIR);
      }
      appDirectory = await dataRoot.getDirectoryHandle(APP_DIR,{ create });
      segments.push(APP_DIR);
    }
    fileHandle = await appDirectory.getFileHandle(BACKUP_FILENAME,{ create });
    backupPath = [...segments,BACKUP_FILENAME].join(" / ");
    return fileHandle;
  }

  async function pickDirectory(){
    try{
      return await global.showDirectoryPicker({ id:"trpg-session-log-backup", mode:"readwrite", startIn:"documents" });
    }catch(error){
      if(error?.name === "AbortError") throw error;
      if(error instanceof TypeError){
        return global.showDirectoryPicker({ mode:"readwrite" });
      }
      throw error;
    }
  }

  function queueExternalWrite(payload){
    pendingPayload = payload;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(()=>{
      const next = pendingPayload;
      pendingPayload = null;
      writeChain = writeChain.then(()=>writePayload(next,false)).catch(error=>{
        emitStatus("error","外部ファイルへの自動保存に失敗しました");
        emitError("外部ファイルへの自動保存に失敗しました",error);
      });
    },WRITE_DEBOUNCE_MS);
  }

  async function init(options){
    callbacks = options || {};
    try{
      await openDb();
      directoryHandle = await idbGet(SETTINGS_STORE,DIRECTORY_HANDLE_KEY) || null;
      fileHandle = await idbGet(SETTINGS_STORE,HANDLE_KEY) || null;
      if(!directoryHandle && !fileHandle){
        emitStatus("disconnected","外部バックアップは未接続です");
        return;
      }
      const targetHandle = directoryHandle || fileHandle;
      const allowed = await permission(targetHandle,false);
      if(allowed === "granted" && directoryHandle) await resolveDirectoryTarget(directoryHandle);
      if(!backupPath && fileHandle) backupPath = fileHandle.name;
      emitStatus(allowed === "granted" ? "connected" : "permission-required",
        allowed === "granted" ? `接続済み: ${backupPath}` : `保存先フォルダの再許可が必要です: ${targetHandle.name}`);
    }catch(error){
      fileHandle = null;
      emitStatus("error","ブラウザ内バックアップを初期化できませんでした");
      emitError("バックアップ機能の初期化に失敗しました",error);
    }
  }

  async function capture(state,options){
    const payload = buildPayload(state,options?.reason || "autosave");
    try{
      await saveSnapshot(payload,Boolean(options?.forceSnapshot));
    }catch(error){
      emitError("ブラウザ内スナップショットの保存に失敗しました",error);
    }
    if(fileHandle) queueExternalWrite(payload);
  }

  async function reconnectStoredTarget(state){
    const targetHandle = directoryHandle || fileHandle;
    if(!targetHandle || await permission(targetHandle,true) !== "granted") return false;
    if(directoryHandle) await resolveDirectoryTarget(directoryHandle);
    if(!backupPath && fileHandle) backupPath = fileHandle.name;
    await writePayload(buildPayload(state,"reconnect"),true);
    return true;
  }

  async function connectFolder(state,options){
    if(!("showDirectoryPicker" in global) && !("showSaveFilePicker" in global)){
      emitStatus("unsupported","このブラウザは外部ファイル自動保存に対応していません");
      return false;
    }
    try{
      if(options?.reuseExisting && await reconnectStoredTarget(state)) return true;

      if("showDirectoryPicker" in global){
        directoryHandle = await pickDirectory();
        if(await permission(directoryHandle,true) !== "granted") return false;
        await resolveDirectoryTarget(directoryHandle);
        await idbPut(SETTINGS_STORE,directoryHandle,DIRECTORY_HANDLE_KEY);
        await idbDelete(SETTINGS_STORE,HANDLE_KEY);
      }else{
        directoryHandle = null;
        fileHandle = await global.showSaveFilePicker({
          suggestedName:BACKUP_FILENAME,
          startIn:"documents",
          types:[{ description:"TRPG卓ログ JSON", accept:{ "application/json":[".json"] } }]
        });
        backupPath = fileHandle.name;
        await idbPut(SETTINGS_STORE,fileHandle,HANDLE_KEY);
      }
      await writePayload(buildPayload(state,"connect"),true);
      emitStatus("saved",`自動バックアップ接続済み: ${backupPath}`);
      return true;
    }catch(error){
      if(error?.name !== "AbortError"){
        emitStatus("error","外部ファイルを接続できませんでした");
        emitError("外部ファイルを接続できませんでした",error);
      }
      return false;
    }
  }

  async function disconnectFile(){
    fileHandle = null;
    directoryHandle = null;
    backupPath = "";
    pendingPayload = null;
    clearTimeout(writeTimer);
    await idbDelete(SETTINGS_STORE,HANDLE_KEY);
    await idbDelete(SETTINGS_STORE,DIRECTORY_HANDLE_KEY);
    emitStatus("disconnected","外部バックアップを切断しました");
  }

  async function writeNow(state){
    if(!fileHandle) return connectFolder(state,{ reuseExisting:Boolean(directoryHandle) });
    try{
      const payload = buildPayload(state,"manual");
      await saveSnapshot(payload,true);
      return await writePayload(payload,true);
    }catch(error){
      emitStatus("error","バックアップ保存に失敗しました");
      emitError("バックアップ保存に失敗しました",error);
      return false;
    }
  }

  async function latestSnapshot(){
    const snapshots = await getAllSnapshots();
    return snapshots[0]?.payload || null;
  }

  global.SessionLogBackup = {
    init,
    capture,
    connectFolder,
    connectFile:connectFolder,
    disconnectFile,
    writeNow,
    latestSnapshot,
    getAllSnapshots,
    buildPayload
  };
})(window);
