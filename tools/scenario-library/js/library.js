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
  var favs = {};
  var FAV_KEY = "library.favorites";
  var VIEW_KEY = "scenarioLibrary.view";
  var VERSION = { version: "v0.3.2", updated: "2026.11.15" };
  var state = { q: "", author: "", sys: "", pl: "", time: "", price: "", ho: false, notOwned: false, fav: false, sort: "relevance", selected: null, limit: PAGE };
  var view = "grid";
  try { if (localStorage.getItem(VIEW_KEY) === "table") view = "table"; } catch (e) { /* 保存できない環境では毎回カード表示 */ }

  function $(id) { return document.getElementById(id); }
  var esc = Hub.escape;

  function init() {
    ["qInput", "sortSelect", "systemChips", "plSelect", "timeSelect", "priceSelect", "hoCheck", "notOwnedCheck", "resetBtn",
      "countLine", "resultGrid", "emptyState", "errorState", "moreBtn", "detail", "detailCover", "detailPills", "detailTitle",
      "detailBy", "authorFilter", "detailList", "detailFav", "detailBadges", "favCheck", "resultTable", "sourceLink", "shelfBtn",
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
    els.favCheck.addEventListener("change", function () { state.fav = els.favCheck.checked; state.limit = PAGE; render(); });
    Array.prototype.forEach.call(document.querySelectorAll(".lib-view-btn"), function (b) {
      b.addEventListener("click", function () {
        view = b.getAttribute("data-view");
        try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* 表示形式の保存は任意 */ }
        render();
      });
    });
    els.detailFav.addEventListener("click", function () { if (state.selected) toggleFav(state.selected); });
    // 作者・サークル名をクリックするとその名前で絞り込み、もう一度クリックすると外す
    els.detailBy.addEventListener("click", function (e) {
      var b = e.target.closest("[data-author]");
      if (!b) return;
      var name = b.getAttribute("data-author");
      setAuthor(state.author === name ? "" : name);
    });
    els.authorFilter.addEventListener("click", function (e) {
      if (e.target.closest("[data-clear-author]")) setAuthor("");
    });
    els.resetBtn.addEventListener("click", reset);
    els.moreBtn.addEventListener("click", function () { state.limit += PAGE; render(); });
    els.shelfBtn.addEventListener("click", toggleShelf);
    els.usageBtn.addEventListener("click", function () {
      var open = els.usagePanel.hidden;
      els.usagePanel.hidden = !open;
      els.usageBtn.setAttribute("aria-expanded", String(open));
    });
    var pick = function (e) {
      var fav = e.target.closest("[data-fav]");
      if (fav) { toggleFav(fav.getAttribute("data-fav")); return; }
      var card = e.target.closest("[data-id]");
      if (!card) return;
      state.selected = card.getAttribute("data-id");
      render();
      if (window.matchMedia("(max-width: 760px)").matches) els.detail.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    els.resultGrid.addEventListener("click", pick);
    els.resultTable.addEventListener("click", pick);
    els.resultTable.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-id]")) { e.preventDefault(); pick(e); }
    });

    Promise.all([Hub.loadCatalog(), Hub.shelf.load(), Hub.store.get(FAV_KEY)])
      .then(function (res) {
        catalog = res[0];
        shelf = res[1];
        (res[2] || []).forEach(function (id) { favs[id] = true; });
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
    state = { q: "", author: "", sys: "", pl: "", time: "", price: "", ho: false, notOwned: false, fav: false, sort: state.sort, selected: state.selected, limit: PAGE };
    els.qInput.value = "";
    els.plSelect.value = "";
    els.timeSelect.value = "";
    els.priceSelect.value = "";
    els.hoCheck.checked = false;
    els.notOwnedCheck.checked = false;
    els.favCheck.checked = false;
    render();
  }

  function setAuthor(name) {
    state.author = name;
    state.limit = PAGE;
    render();
  }

  function authorsOf(sc) {
    var names = (sc.writers || []).slice();
    if (sc.circle && sc.circle.name) names.push(sc.circle.name);
    return names;
  }

  function toggleFav(id) {
    if (favs[id]) delete favs[id];
    else favs[id] = true;
    Hub.store.set(FAV_KEY, Object.keys(favs));
    render();
  }

  function renderChrome() {
    var m = catalog.manifest;
    els.sampleBanner.hidden = !m.sample;
    if (m.offline) {
      els.sampleBanner.hidden = false;
      els.sampleBanner.textContent = "オフライン（前回のカタログ）";
    }
    if (m.attribution) {
      els.attribution.textContent = m.attribution;
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
    var order = ["COC6", "COC7", "EMOKLORE", "MADAMIS", "STORYPLAYING", "OTHER", "UNKNOWN"];
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
      if (state.author && authorsOf(sc).indexOf(state.author) < 0) return false;
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
      if (state.fav && !favs[sc.id]) return false;
      return true;
    });
    var dateOf = function (sc) { return String(sc.published_at || sc.first_seen_at || ""); };
    var byNew = function (a, b) { return dateOf(b).localeCompare(dateOf(a)); };
    if (state.sort === "new" || (state.sort === "relevance" && !q)) list.sort(byNew);
    else if (state.sort === "short") list.sort(function (a, b) { return ((a.duration || {}).min || 1e9) - ((b.duration || {}).min || 1e9); });
    else if (state.sort === "likes") list.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0) || byNew(a, b); });
    else if (state.sort === "title") list.sort(function (a, b) { return a.title.localeCompare(b.title, "ja"); });
    else list.sort(function (a, b) { return score(b, q) - score(a, q) || byNew(a, b); });
    return list;
  }

  // 所持・未所持・プレイ済みのバッジ（表紙の右下）
  function badges(sc, withUnowned) {
    var out = "";
    if (plays[sc.id]) out += '<span class="lib-badge is-played">プレイ済み</span>';
    if (owned[sc.id]) out += '<span class="lib-badge is-owned">所持</span>';
    else if (withUnowned) out += '<span class="lib-badge">未所持</span>';
    return out;
  }

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';

  function favButton(sc, cls) {
    var on = !!favs[sc.id];
    return '<button type="button" class="lib-fav' + (cls ? " " + cls : "") + '" data-fav="' + esc(sc.id) + '" aria-pressed="' + on +
      '" aria-label="お気に入り" title="お気に入り">' + STAR + "</button>";
  }

  function likesLabel(sc) {
    return sc.likes == null ? "—" : "♥ " + Number(sc.likes).toLocaleString("ja-JP");
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
      ? shown.length + " / " + total.toLocaleString("ja-JP")
      : list.length.toLocaleString("ja-JP") + " 件";
    els.authorFilter.hidden = !state.author;
    els.authorFilter.innerHTML = state.author
      ? '<span class="lib-author-chip">' + esc(state.author) + '<button type="button" data-clear-author aria-label="作者の絞り込みを外す">×</button></span>'
      : "";
    els.emptyState.hidden = list.length > 0;
    els.moreBtn.hidden = list.length <= state.limit;

    if (!state.selected || !catalog.byId[state.selected]) state.selected = shown.length ? shown[0].id : null;

    Array.prototype.forEach.call(document.querySelectorAll(".lib-view-btn"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view));
    });
    els.resultGrid.hidden = view !== "grid";
    els.resultTable.hidden = view !== "table";
    if (view === "grid") {
      els.resultTable.innerHTML = "";
      els.resultGrid.innerHTML = shown.map(function (sc) {
        return '<div class="lib-card-wrap"><button type="button" class="lib-card" data-id="' + esc(sc.id) + '" aria-pressed="' + (sc.id === state.selected) + '">' +
          cover(sc, "", '<span class="lib-badges">' + badges(sc, false) + "</span>") +
          '<span class="lib-card-body">' +
          '<span class="lib-card-title">' + esc(sc.title) + "</span>" +
          '<span class="lib-card-by">' + esc(byLine(sc)) + "</span>" +
          '<span class="lib-pills">' + pills(sc) + "</span>" +
          '<span class="lib-card-foot"><span>' + esc(Hub.priceLabel(sc.price)) + "</span><span>" + hoLabel(sc) + "</span></span>" +
          "</span></button>" + favButton(sc, "on-card") + "</div>";
      }).join("");
    } else {
      els.resultGrid.innerHTML = "";
      els.resultTable.innerHTML = '<table class="lib-table"><thead><tr>' +
        '<th class="lib-col-fav"><span class="lib-sr">お気に入り</span></th><th>タイトル</th><th>作者・サークル</th><th>システム</th>' +
        '<th>人数</th><th>時間</th><th>価格</th><th>いいね</th><th>状態</th></tr></thead><tbody>' +
        shown.map(function (sc) {
          return '<tr data-id="' + esc(sc.id) + '" tabindex="0" aria-selected="' + (sc.id === state.selected) + '">' +
            '<td class="lib-col-fav">' + favButton(sc, "") + "</td>" +
            '<td class="lib-col-title">' + esc(sc.title) + "</td>" +
            '<td class="lib-col-by">' + esc(byLine(sc)) + "</td>" +
            '<td><span class="hub-pill sys-' + esc(sc.system) + '">' + esc(Hub.SYSTEMS[sc.system] || "不明") + "</span></td>" +
            "<td>" + esc(Hub.playersLabel(sc.players)) + "</td>" +
            "<td>" + esc(Hub.durationLabel(sc.duration)) + "</td>" +
            "<td>" + esc(Hub.priceLabel(sc.price)) + "</td>" +
            '<td class="lib-col-num">' + esc(likesLabel(sc)) + "</td>" +
            '<td class="lib-col-badges">' + badges(sc, false) + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    renderDetail(state.selected ? catalog.byId[state.selected] : null);
  }

  function renderDetail(sc) {
    els.detail.hidden = !sc;
    if (!sc) return;
    els.detailCover.className = "hub-cover lib-detail-cover sys-" + sc.system;
    els.detailCover.innerHTML = (sc.cover_url ? '<img src="' + esc(sc.cover_url) + '" alt="" referrerpolicy="no-referrer" />' : "");
    var fav = !!favs[sc.id];
    els.detailFav.setAttribute("aria-pressed", String(fav));
    els.detailBadges.innerHTML = badges(sc, true);
    els.detailPills.innerHTML = pills(sc) + '<span class="hub-pill">' + hoLabel(sc) + "</span>";
    els.detailTitle.textContent = sc.title;
    var names = authorsOf(sc);
    els.detailBy.innerHTML = names.length
      ? names.map(function (n) {
        var on = state.author === n;
        return '<button type="button" class="lib-author" data-author="' + esc(n) + '" aria-pressed="' + on + '" title="' +
          (on ? "絞り込みを外す" : "この名前で絞り込む") + '">' + esc(n) + "</button>";
      }).join(" ・ ")
      : "作者不明";
    var src = sc.source || {};
    var rows = [
      ["価格", Hub.priceLabel(sc.price)],
      ["いいね", sc.likes == null ? "" : Number(sc.likes).toLocaleString("ja-JP")],
      [sc.published_at ? "公開" : "収録", sc.published_at || sc.first_seen_at || ""],
      ["別名", (sc.aliases || []).join(" / ")],
      ["タグ", (sc.tags || []).join("、")]
    ].filter(function (r) { return r[1]; });
    els.detailList.innerHTML = rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    els.detailList.hidden = !rows.length;

    if (src.url) {
      els.sourceLink.href = src.url;
      els.sourceLink.removeAttribute("aria-disabled");
      els.sourceLink.hidden = false;
    } else {
      els.sourceLink.hidden = true;
    }

    var manual = shelf.manual.some(function (m) { return m.scenarioId === sc.id; });
    if (folderOwned[sc.id]) {
      els.shelfBtn.textContent = "本棚にあり";
      els.shelfBtn.disabled = true;
    } else {
      els.shelfBtn.disabled = false;
      els.shelfBtn.textContent = manual ? "本棚から外す" : "本棚に追加";
    }

    var params = new URLSearchParams({
      toolId: "scenario-library",
      toolName: "シナリオライブラリ",
      version: VERSION.version,
      updated: VERSION.updated,
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
