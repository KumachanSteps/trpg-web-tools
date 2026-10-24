/*
 * シナリオカタログの読み込み（catalog/v1）
 * GitHub Pages の data/catalog/v1/manifest.json と分割 JSON を読み、版が同じなら IndexedDB のキャッシュを使う。
 * カタログは CC BY 4.0。再利用時は manifest.attribution の出典表記が必要。
 */
(function () {
  "use strict";

  var Hub = (window.Hub = window.Hub || {});
  var CACHE_KEY = "catalog-v1";
  var loading = null;

  function fetchJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(url + " を読み込めませんでした（" + res.status + "）");
      return res.json();
    });
  }

  function prepare(manifest, scenarios) {
    scenarios.forEach(function (sc) {
      sc._search = Hub.normalizeTitle(
        [sc.title].concat(sc.aliases || [], sc.writers || [], sc.circle ? [sc.circle.name] : []).join(" ")
      );
    });
    var byId = {};
    scenarios.forEach(function (sc) { byId[sc.id] = sc; });
    return { manifest: manifest, scenarios: scenarios, byId: byId, matchIndex: Hub.buildMatchIndex(scenarios) };
  }

  // baseUrl はツールのページから見た catalog/v1 フォルダ
  Hub.loadCatalog = function (baseUrl) {
    if (loading) return loading;
    var base = (baseUrl || "../../data/catalog/v1/").replace(/\/?$/, "/");
    loading = fetchJson(base + "manifest.json")
      .then(function (manifest) {
        return Hub.store.get(CACHE_KEY).then(function (cached) {
          if (cached && cached.version === manifest.version && cached.scenarios) {
            return prepare(manifest, cached.scenarios);
          }
          return Promise.all(manifest.shards.map(function (s) { return fetchJson(base + s.path); })).then(function (parts) {
            var scenarios = [];
            parts.forEach(function (p) { scenarios = scenarios.concat(p.scenarios || []); });
            Hub.store.set(CACHE_KEY, { version: manifest.version, scenarios: scenarios });
            return prepare(manifest, scenarios);
          });
        });
      })
      .catch(function (err) {
        loading = null;
        // 通信できないときは前回のキャッシュで動かす
        return Hub.store.get(CACHE_KEY).then(function (cached) {
          if (cached && cached.scenarios) {
            return prepare({ version: cached.version, offline: true, shards: [] }, cached.scenarios);
          }
          throw err;
        });
      });
    return loading;
  };
})();
