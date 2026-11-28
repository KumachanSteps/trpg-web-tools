/*
 * CoC GMセッションモニター — 保存（localStorage 1キー + JSONバックアップ）
 * キャラクターの原本・正規化データは characters（全卓共通）、HP/SAN などの卓内状態は
 * tables[].participants[].state に分けて持つ。同じキャラを別の卓に入れても状態は混ざらない。
 */
(function (root) {
  "use strict";

  var KEY = "coc-gm-session-monitor:v1";
  var SCHEMA_VERSION = 1;
  var C = root.GMCore;

  function nowIso() { return new Date().toISOString(); }

  function emptyState() {
    return { schemaVersion: SCHEMA_VERSION, revision: 0, savedAt: null, currentTableId: null, characters: {}, tables: [] };
  }

  function newTable(name) {
    var t = nowIso();
    return {
      id: C.uid("gm-table"),
      name: name || "新しい卓",
      status: "active",
      kp: "",
      slots: 4,
      createdAt: t,
      updatedAt: t,
      gameMinutes: 0,
      rules: Object.assign({}, C.DEFAULT_RULES),
      display: { hp: false, mp: true, san: true, luck: false },
      participants: [],
      events: [],
      checklist: { items: [], perChar: false, openOnly: false },
      choice: { selected: [], count: 1, secret: false, comment: "", nameMode: "name" },
      dice: { tables: [], current: null },
      report: { scenario: "", kp: "", edition: "auto", date: "" },
      ui: { pinned: [], skill: { query: "", filter: "all", sort: "category", fill: true, rare: false, starFilled: true, threshold: 70, category: "", tag: "" } }
    };
  }

  // 旧版・欠損のあるデータを現行の形にそろえる（未知フィールドは残す）
  function normalize(state) {
    if (!state || typeof state !== "object") throw new Error("データの形式が違います。");
    if (typeof state.schemaVersion !== "number") throw new Error("schemaVersion がありません。");
    if (state.schemaVersion > SCHEMA_VERSION) throw new Error("このツールより新しい版のデータです（schemaVersion " + state.schemaVersion + "）。");
    state.characters = state.characters && typeof state.characters === "object" ? state.characters : {};
    state.tables = Array.isArray(state.tables) ? state.tables : [];
    state.tables = state.tables.map(function (t) {
      var base = newTable(t.name);
      var out = Object.assign(base, t);
      out.rules = Object.assign({}, C.DEFAULT_RULES, t.rules || {});
      out.display = Object.assign({}, base.display, t.display || {});
      out.checklist = Object.assign({ items: [], perChar: false, openOnly: false }, t.checklist || {});
      out.choice = Object.assign({ selected: [], count: 1, secret: false, comment: "", nameMode: "name" }, t.choice || {});
      out.dice = Object.assign({ tables: [], current: null }, t.dice || {});
      out.report = Object.assign({ scenario: "", kp: "", edition: "auto", date: "" }, t.report || {});
      out.ui = Object.assign({ pinned: [] }, t.ui || {});
      out.ui.skill = Object.assign({}, newTable().ui.skill, (t.ui && t.ui.skill) || {});
      out.participants = (Array.isArray(t.participants) ? t.participants : []).filter(function (p) {
        return p && state.characters[p.characterId];
      });
      out.events = Array.isArray(t.events) ? t.events : [];
      return out;
    });
    if (!state.tables.some(function (t) { return t.id === state.currentTableId; })) {
      state.currentTableId = state.tables.length ? state.tables[0].id : null;
    }
    state.schemaVersion = SCHEMA_VERSION;
    return state;
  }

  var listeners = [];
  var state = null;
  var loadedRevision = 0;
  var saveTimer = null;
  var conflict = false;

  function emit(kind, detail) { listeners.forEach(function (fn) { fn(kind, detail); }); }

  function readStored() {
    var raw = null;
    try { raw = root.localStorage.getItem(KEY); } catch (e) { emit("error", "ブラウザの保存領域を読めません（プライベートブラウズ等）。このままでは保存されません。"); }
    if (!raw) return null;
    return JSON.parse(raw);
  }

  function load() {
    var stored = null;
    try { stored = readStored(); } catch (e) { emit("error", "保存データが壊れているため読み込めませんでした。上書きしないよう、保存を止めています。"); conflict = true; }
    state = stored ? normalize(stored) : emptyState();
    if (!state.tables.length) {
      var t = newTable("最初の卓");
      state.tables.push(t);
      state.currentTableId = t.id;
    }
    loadedRevision = state.revision || 0;
    return state;
  }

  function writeNow() {
    saveTimer = null;
    if (conflict) { emit("conflict"); return false; }
    try {
      var stored = readStored();
      if (stored && (stored.revision || 0) > loadedRevision) {
        conflict = true;
        emit("conflict");
        return false;
      }
    } catch (e) { /* 壊れた保存データは読み直さず上書きしない */ }
    state.revision = (state.revision || 0) + 1;
    state.savedAt = nowIso();
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      loadedRevision = state.revision;
      emit("saved", state.savedAt);
      return true;
    } catch (e) {
      state.revision -= 1;
      emit("error", "保存できませんでした（容量不足の可能性）。バックアップを保存してください。");
      return false;
    }
  }

  function save(immediate) {
    emit("dirty");
    if (saveTimer) clearTimeout(saveTimer);
    if (immediate) return writeNow();
    saveTimer = setTimeout(writeNow, 400);
    return true;
  }

  function flush() { if (saveTimer) { clearTimeout(saveTimer); writeNow(); } }

  // 他のタブで保存されたら知らせる（自動で上書きしない）
  if (root.addEventListener) {
    root.addEventListener("storage", function (e) {
      if (e.key !== KEY) return;
      conflict = true;
      emit("conflict");
    });
    root.addEventListener("beforeunload", flush);
  }

  function exportJson() {
    flush();
    return JSON.stringify(Object.assign({ format: "coc-gm-session-monitor.backup", exportedAt: nowIso() }, state), null, 2);
  }

  // 復元前の検証。成功なら { state, summary }
  function parseBackup(text) {
    var data = JSON.parse(text);
    if (data.format && data.format !== "coc-gm-session-monitor.backup") throw new Error("このツールのバックアップではありません。");
    var copy = normalize(JSON.parse(JSON.stringify(data)));
    delete copy.format; delete copy.exportedAt;
    return {
      state: copy,
      summary: { tables: copy.tables.length, characters: Object.keys(copy.characters).length, exportedAt: data.exportedAt || null }
    };
  }

  function replaceState(next) {
    next.revision = Math.max(next.revision || 0, state ? state.revision || 0 : 0);
    state = next;
    loadedRevision = state.revision;
    conflict = false;
    return save(true);
  }

  function clearAll() {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    conflict = false;
    loadedRevision = 0;
    state = emptyState();
    var t = newTable("最初の卓");
    state.tables.push(t);
    state.currentTableId = t.id;
    return save(true);
  }

  root.GMStore = {
    KEY: KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    load: load,
    save: save,
    flush: flush,
    get: function () { return state; },
    newTable: newTable,
    normalize: normalize,
    exportJson: exportJson,
    parseBackup: parseBackup,
    replaceState: replaceState,
    clearAll: clearAll,
    isConflict: function () { return conflict; },
    on: function (fn) { listeners.push(fn); },
    nowIso: nowIso
  };
})(window);
