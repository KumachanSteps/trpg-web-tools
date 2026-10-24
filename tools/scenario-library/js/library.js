(function () {
  "use strict";

  var Hub = window.Hub;
  var PAGE = 60;
  var NEW_DAYS = 30;

  var els = {};
  var catalog = null;
  var shelf = null;
  var owned = {};
  var folderOwned = {};
  var plays = {};
  var state = { q: "", sys: "", pl: "", time: "", price: "", ho: false, notOwned: false, sort: "relevance", selected: null, limit: PAGE };

  function $(id) { return document.getElementById(id); }
  var esc = Hub.escape;

  function init() {
    ["qInput", "sortSelect", "systemChips", "plSelect", "timeSelect", "priceSelect", "hoCheck", "notOwnedCheck", "resetBtn",
      "countLine", "resultGrid", "emptyState", "errorState", "moreBtn", "detail", "detailCover", "detailPills", "detailTitle",
      "detailBy", "detailPrice", "detailSource", "detailAliases", "detailTags", "mineShelf", "mineLog", "sourceLink", "shelfBtn",
      "suggestLink", "sampleBanner", "statWorks", "statWriters", "statNew", "statShelf", "usageBtn", "usagePanel", "attribution"
    ].forEach(function (id) { els[id] = $(id); });

    var params = new URLSearchParams(location.search);
    state.q = params.get("q") || "";
    state.selected = params.get("id");
    els.qInput.value = state.q;

    var timer = null;
    els.qInput.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = els.qInput.value; state.limit = PAGE; render(); }, 120);
    });
    els.sortSelect.addEventListener("change", function () { state.sort = els.sortSelect.value; render(); });
    els.plSelect.addEventListener("change", function () { state.pl = els.plSelect.value; state.limit = PAGE; render(); });
    els.timeSelect.addEventListener("change", function () { state.time = els.timeSelect.value; state.limit = PAGE; render(); });
    els.priceSelect.addEventListener("change", function () { state.price = els.priceSelect.value; state.limit = PAGE; render(); });
    els.hoCheck.addEventListener("change", function () { state.ho = els.hoCheck.checked; state.limit = PAGE; render(); });
    els.notOwnedCheck.addEventListener("change", function () { state.notOwned = els.notOwnedCheck.checked; state.limit = PAGE; render(); });
    els.resetBtn.addEventListener("click", reset);
    els.moreBtn.addEventListener("click", function () { state.limit += PAGE; render(); });
    els.shelfBtn.addEventListener("click", toggleShelf);
    els.usageBtn.addEventListener("click", function () {
      var open = els.usagePanel.hidden;
      els.usagePanel.hidden = !open;
      els.usageBtn.setAttribute("aria-expanded", String(open));
    });
    els.resultGrid.addEventListener("click", function (e) {
      var card = e.target.closest("[data-id]");
      if (!card) return;
      state.selected = card.getAttribute("data-id");
      render();
      if (window.matchMedia("(max-width: 760px)").matches) els.detail.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    Promise.all([Hub.loadCatalog(), Hub.shelf.load()])
      .then(function (res) {
        catalog = res[0];
        shelf = res[1];
        refreshOwned();
        plays = Hub.countPlays(catalog);
        renderChrome();
        render();
      })
      .catch(function (err) {
        els.countLine.textContent = "";
        els.errorState.hidden = false;
        els.errorState.textContent = "カタログを読み込めませんでした。通信状況を確認して再読み込みしてください。（" + err.message + "）";
      });
  }

  function refreshOwned() {
    owned = Hub.shelf.ownedIds(shelf);
    folderOwned = {};
    shelf.items.forEach(function (it) { if (it.scenarioId) folderOwned[it.scenarioId] = true; });
  }

  function reset() {
    state = { q: "", sys: "", pl: "", time: "", price: "", ho: false, notOwned: false, sort: state.sort, selected: state.selected, limit: PAGE };
    els.qInput.value = "";
    els.plSelect.value = "";
    els.timeSelect.value = "";
    els.priceSelect.value = "";
    els.hoCheck.checked = false;
    els.notOwnedCheck.checked = false;
    render();
  }

  function renderChrome() {
    var m = catalog.manifest;
    els.sampleBanner.hidden = !m.sample;
    if (m.offline) {
      els.sampleBanner.hidden = false;
      els.sampleBanner.textContent = "オフラインのため、前回読み込んだカタログを表示しています。";
    }
    if (m.attribution) {
      els.attribution.textContent = m.attribution + "。配布ページの公開情報をもとに作成し、表紙画像は配布元から直接表示しています（保存・再配布はしません）。";
    }
    var writers = {};
    var now = Date.now();
    var fresh = 0;
    catalog.scenarios.forEach(function (sc) {
      (sc.writers || []).forEach(function (w) { writers[w] = true; });
      if (sc.circle && sc.circle.name) writers[sc.circle.name] = true;
      var seen = sc.published_at || sc.first_seen_at;
      if (seen && now - Date.parse(seen) <= NEW_DAYS * 864e5) fresh++;
    });
    els.statWorks.textContent = catalog.scenarios.length.toLocaleString("ja-JP");
    els.statWriters.textContent = Object.keys(writers).length.toLocaleString("ja-JP");
    els.statNew.textContent = fresh.toLocaleString("ja-JP");
    renderShelfStat();

    var present = {};
    catalog.scenarios.forEach(function (sc) { present[sc.system || "UNKNOWN"] = true; });
    var order = ["COC6", "COC7", "EMOKLORE", "MADAMIS", "OTHER", "UNKNOWN"];
    var chips = [{ v: "", label: "すべて" }].concat(order.filter(function (k) { return present[k]; }).map(function (k) { return { v: k, label: Hub.SYSTEMS[k] }; }));
    els.systemChips.innerHTML = chips.map(function (c) {
      return '<button type="button" class="hub-chip" data-sys="' + c.v + '" aria-pressed="false">' + esc(c.label) + "</button>";
    }).join("");
    els.systemChips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sys]");
      if (!b) return;
      state.sys = b.getAttribute("data-sys");
      state.limit = PAGE;
      render();
    });
  }

  function renderShelfStat() {
    var n = 0;
    catalog.scenarios.forEach(function (sc) { if (owned[sc.id]) n++; });
    els.statShelf.textContent = n.toLocaleString("ja-JP");
  }

  function score(sc, q) {
    if (!q) return 0;
    var t = Hub.normalizeTitle(sc.title);
    if (t === q) return 100;
    if (t.indexOf(q) === 0) return 80;
    if (t.indexOf(q) >= 0) return 60;
    return 20;
  }

  function filtered() {
    var q = Hub.normalizeTitle(state.q);
    var range = state.time ? state.time.split("-").map(Number) : null;
    var list = catalog.scenarios.filter(function (sc) {
      if (q && sc._search.indexOf(q) < 0) return false;
      if (state.sys && sc.system !== state.sys) return false;
      if (state.pl) {
        var p = sc.players || {};
        var want = Number(state.pl);
        var min = p.min == null ? null : p.min;
        var max = p.max == null ? min : p.max;
        if (min == null) return false;
        if (want === 4 ? max < 4 : (want < min || want > max)) return false;
      }
      if (range) {
        var d = sc.duration || {};
        var mins = d.min == null ? d.max : d.min;
        if (mins == null || mins < range[0] || mins >= range[1]) return false;
      }
      if (state.price === "free" && !(sc.price && sc.price.min === 0)) return false;
      if (state.price === "paid" && !(sc.price && sc.price.max > 0)) return false;
      if (state.ho && sc.secret_ho !== true) return false;
      if (state.notOwned && owned[sc.id]) return false;
      return true;
    });
    var dateOf = function (sc) { return String(sc.published_at || sc.first_seen_at || ""); };
    var byNew = function (a, b) { return dateOf(b).localeCompare(dateOf(a)); };
    if (state.sort === "new" || (state.sort === "relevance" && !q)) list.sort(byNew);
    else if (state.sort === "short") list.sort(function (a, b) { return ((a.duration || {}).min || 1e9) - ((b.duration || {}).min || 1e9); });
    else if (state.sort === "title") list.sort(function (a, b) { return a.title.localeCompare(b.title, "ja"); });
    else list.sort(function (a, b) { return score(b, q) - score(a, q) || byNew(a, b); });
    return list;
  }

  function mineBadge(sc) {
    var n = plays[sc.id] || 0;
    if (n) return '<span class="hub-pill lib-card-mine">通過済み</span>';
    if (owned[sc.id]) return '<span class="hub-pill is-note lib-card-mine">本棚にあり</span>';
    return "";
  }

  function cover(sc, cls, label) {
    var img = sc.cover_url ? '<img src="' + esc(sc.cover_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" />' : "";
    return '<span class="hub-cover sys-' + esc(sc.system) + " " + cls + '">' + label + img + "</span>";
  }

  function pills(sc) {
    return '<span class="hub-pill sys-' + esc(sc.system) + '">' + esc(Hub.SYSTEMS[sc.system] || "不明") + "</span>" +
      '<span class="hub-pill">' + esc(Hub.playersLabel(sc.players)) + "</span>" +
      '<span class="hub-pill">' + esc(Hub.durationLabel(sc.duration)) + "</span>";
  }

  function hoLabel(sc) {
    return sc.secret_ho === true ? "秘匿HOあり" : sc.secret_ho === false ? "秘匿HOなし" : "秘匿HO不明";
  }

  function byLine(sc) {
    var parts = [];
    if (sc.writers && sc.writers.length) parts.push(sc.writers.join("、"));
    if (sc.circle && sc.circle.name) parts.push(sc.circle.name);
    return parts.join(" ・ ") || "作者不明";
  }

  function render() {
    if (!catalog) return;
    Array.prototype.forEach.call(els.systemChips.querySelectorAll("[data-sys]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-sys") === state.sys));
    });
    var list = filtered();
    var shown = list.slice(0, state.limit);
    var total = catalog.scenarios.length;
    els.countLine.textContent = list.length === total
      ? total.toLocaleString("ja-JP") + " 件中 " + shown.length + " 件を表示"
      : list.length.toLocaleString("ja-JP") + " 件が見つかりました";
    els.emptyState.hidden = list.length > 0;
    els.moreBtn.hidden = list.length <= state.limit;

    if (!state.selected || !catalog.byId[state.selected]) state.selected = shown.length ? shown[0].id : null;

    els.resultGrid.innerHTML = shown.map(function (sc) {
      return '<button type="button" class="lib-card" data-id="' + esc(sc.id) + '" aria-pressed="' + (sc.id === state.selected) + '">' +
        cover(sc, "", '<span class="lib-card-source">' + esc((sc.source && sc.source.site) || "—") + "</span>" + mineBadge(sc) + "<span>表紙</span>") +
        '<span class="lib-card-body">' +
        '<span class="lib-card-title">' + esc(sc.title) + "</span>" +
        '<span class="lib-card-by">' + esc(byLine(sc)) + "</span>" +
        '<span class="lib-pills">' + pills(sc) + "</span>" +
        '<span class="lib-card-foot"><span>' + esc(Hub.priceLabel(sc.price)) + "</span><span>" + hoLabel(sc) + "</span></span>" +
        "</span></button>";
    }).join("");

    renderDetail(state.selected ? catalog.byId[state.selected] : null);
  }

  function renderDetail(sc) {
    els.detail.hidden = !sc;
    if (!sc) return;
    els.detailCover.className = "hub-cover lib-detail-cover sys-" + sc.system;
    els.detailCover.innerHTML = "<span>表紙（配布元から直接表示）</span>" +
      (sc.cover_url ? '<img src="' + esc(sc.cover_url) + '" alt="" referrerpolicy="no-referrer" />' : "");
    els.detailPills.innerHTML = pills(sc) + '<span class="hub-pill">' + hoLabel(sc) + "</span>";
    els.detailTitle.textContent = sc.title;
    els.detailBy.textContent = byLine(sc);
    els.detailPrice.textContent = Hub.priceLabel(sc.price);
    var src = sc.source || {};
    els.detailSource.textContent = (src.site || "不明") +
      (sc.published_at ? " ・ " + sc.published_at + " 公開" : sc.first_seen_at ? " ・ " + sc.first_seen_at + " 収録" : "");
    els.detailAliases.textContent = (sc.aliases && sc.aliases.length) ? sc.aliases.join(" / ") : "—";
    els.detailTags.textContent = (sc.tags && sc.tags.length) ? sc.tags.join("、") : "—";
    els.mineShelf.textContent = owned[sc.id] ? "あり" : "なし";
    els.mineLog.textContent = (plays[sc.id] || 0) + " 回";

    if (src.url) {
      els.sourceLink.href = src.url;
      els.sourceLink.removeAttribute("aria-disabled");
      els.sourceLink.hidden = false;
    } else {
      els.sourceLink.hidden = true;
    }

    var manual = shelf.manual.some(function (m) { return m.scenarioId === sc.id; });
    if (folderOwned[sc.id]) {
      els.shelfBtn.textContent = "本棚にあり（フォルダ）";
      els.shelfBtn.disabled = true;
    } else {
      els.shelfBtn.disabled = false;
      els.shelfBtn.textContent = manual ? "本棚から外す" : "本棚に追加";
    }

    var params = new URLSearchParams({
      toolId: "scenario-library",
      toolName: "シナリオライブラリ",
      version: "v0.1.0",
      updated: "2026.10.24",
      sourceUrl: location.origin + location.pathname + "?id=" + encodeURIComponent(sc.id)
    });
    els.suggestLink.href = "../../report/?" + params.toString();
  }

  function toggleShelf() {
    var sc = catalog.byId[state.selected];
    if (!sc) return;
    var manual = shelf.manual.some(function (m) { return m.scenarioId === sc.id; });
    var op = manual ? Hub.shelf.removeManual(sc.id) : Hub.shelf.addManual(sc.id);
    op.then(function (data) {
      shelf = data;
      refreshOwned();
      renderShelfStat();
      render();
      Hub.toast(manual ? "「" + sc.title + "」を本棚から外しました" : "「" + sc.title + "」を本棚に追加しました");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
