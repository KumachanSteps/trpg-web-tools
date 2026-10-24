/*
 * マイ本棚のデータと、他ツールの記録の読み取り
 * - 本棚: IndexedDB の "bookshelf" に保存（フォルダ・作品・手動追加）
 * - 卓ログ: 卓ログトラッカーの localStorage（sessionLogTool.state.v1）を読み取り専用で参照
 */
(function () {
  "use strict";

  var Hub = (window.Hub = window.Hub || {});
  var SHELF_KEY = "bookshelf";
  var LOG_KEY = "sessionLogTool.state.v1";

  function empty() {
    return { version: 1, folders: [], items: [], manual: [], renames: [] };
  }

  Hub.shelf = {
    load: function () {
      return Hub.store.get(SHELF_KEY).then(function (v) {
        var data = v || empty();
        ["folders", "items", "manual", "renames"].forEach(function (k) { if (!Array.isArray(data[k])) data[k] = []; });
        return data;
      });
    },
    save: function (data) {
      data.updatedAt = new Date().toISOString();
      return Hub.store.set(SHELF_KEY, data);
    },
    // 本棚にある scenario_id の集合（フォルダ照合済み＋手動追加）
    ownedIds: function (data) {
      var ids = {};
      data.items.forEach(function (it) { if (it.scenarioId) ids[it.scenarioId] = true; });
      data.manual.forEach(function (m) { ids[m.scenarioId] = true; });
      return ids;
    },
    addManual: function (scenarioId) {
      return Hub.shelf.load().then(function (data) {
        if (!data.manual.some(function (m) { return m.scenarioId === scenarioId; })) {
          data.manual.push({ scenarioId: scenarioId, addedAt: new Date().toISOString() });
        }
        return Hub.shelf.save(data).then(function () { return data; });
      });
    },
    removeManual: function (scenarioId) {
      return Hub.shelf.load().then(function (data) {
        data.manual = data.manual.filter(function (m) { return m.scenarioId !== scenarioId; });
        return Hub.shelf.save(data).then(function () { return data; });
      });
    }
  };

  // 卓ログトラッカーの行（サンプル行は除く）
  Hub.readSessionLog = function () {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      if (!raw) return [];
      var state = JSON.parse(raw);
      return (state.rows || []).filter(function (r) { return r && !r.sample && r.scenario; });
    } catch (e) {
      return [];
    }
  };

  // scenario_id → 卓ログでの回数
  Hub.countPlays = function (catalog) {
    var counts = {};
    Hub.readSessionLog().forEach(function (row) {
      var m = Hub.matchText(row.scenario, catalog.matchIndex, Hub.detectSystem(row.system));
      if (m.status === "matched") counts[m.scenario.id] = (counts[m.scenario.id] || 0) + 1;
    });
    return counts;
  };
})();
