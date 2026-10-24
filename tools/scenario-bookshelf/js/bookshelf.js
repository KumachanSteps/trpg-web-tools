(function () {
  "use strict";

  var Hub = window.Hub;
  var esc = Hub.escape;
  var DEFAULT_TPL = "[{system}_{pl}PL][{writer}] {title}";
  var TPL_KEY = "bookshelf-template";
  var FILE_EXT = /\.(pdf|zip|rar|7z|lzh)$/i;
  var STATES = [
    { id: "", label: "すべて" },
    { id: "stack", label: "積み" },
    { id: "played", label: "通過済み" },
    { id: "ambiguous", label: "照合待ち" },
    { id: "none", label: "未登録" }
  ];
  var STATE_PILL = {
    stack: '<span class="hub-pill is-note">積み</span>',
    played: '<span class="hub-pill">通過済み</span>',
    ambiguous: '<span class="hub-pill is-warn">照合待ち</span>',
    none: '<span class="hub-pill is-plain">未登録</span>'
  };

  var els = {};
  var catalog = null;
  var shelf = null;
  var plays = {};
  var rows = [];
  var ui = { q: "", filter: "", foldersOpen: null, renameOpen: false, tpl: DEFAULT_TPL, unchecked: {}, rescanTarget: null };

  function $(id) { return document.getElementById(id); }

  function init() {
    ["usageBtn", "usagePanel", "saveState", "statOwned", "statStack", "statPlayed", "statPending", "foldersToggle", "foldersMark",
      "foldersTitle", "foldersMeta", "foldersBody", "folderList", "addFolderBtn", "folderInput", "importInput", "importBtn",
      "renameToggle", "exportBtn", "renamePanel", "tplInput", "tokenList", "tplReset", "previewBody", "scriptWinBtn", "scriptMacBtn",
      "undoBtn", "renameNote", "qInput", "filterChips", "shelfBody", "emptyState", "attribution"
    ].forEach(function (id) { els[id] = $(id); });

    try { ui.tpl = localStorage.getItem(TPL_KEY) || DEFAULT_TPL; } catch (e) { ui.tpl = DEFAULT_TPL; }
    els.tplInput.value = ui.tpl;
    els.tokenList.innerHTML = Hub.TEMPLATE_TOKENS.map(function (t) {
      return '<button type="button" class="hub-chip" data-token="' + t + '">' + t + "</button>";
    }).join("");

    els.usageBtn.addEventListener("click", function () {
      var open = els.usagePanel.hidden;
      els.usagePanel.hidden = !open;
      els.usageBtn.setAttribute("aria-expanded", String(open));
    });
    els.foldersToggle.addEventListener("click", function () { ui.foldersOpen = !foldersOpen(); renderFolders(); });
    els.addFolderBtn.addEventListener("click", function () { addFolder(null); });
    els.folderInput.addEventListener("change", onFolderInput);
    els.importBtn.addEventListener("click", function () { els.importInput.click(); });
    els.importInput.addEventListener("change", onImport);
    els.exportBtn.addEventListener("click", exportJson);
    els.renameToggle.addEventListener("click", function () { ui.renameOpen = !ui.renameOpen; renderRename(); });
    els.tplInput.addEventListener("input", function () { setTpl(els.tplInput.value); });
    els.tplReset.addEventListener("click", function () { els.tplInput.value = DEFAULT_TPL; setTpl(DEFAULT_TPL); });
    els.tokenList.addEventListener("click", function (e) {
      var b = e.target.closest("[data-token]");
      if (!b) return;
      var input = els.tplInput;
      var pos = input.selectionStart == null ? input.value.length : input.selectionStart;
      input.value = input.value.slice(0, pos) + b.getAttribute("data-token") + input.value.slice(input.selectionEnd || pos);
      setTpl(input.value);
      input.focus();
    });
    els.previewBody.addEventListener("change", function (e) {
      var cb = e.target.closest("[data-key]");
      if (!cb) return;
      ui.unchecked[cb.getAttribute("data-key")] = !cb.checked;
      renderRenameNote();
    });
    els.scriptWinBtn.addEventListener("click", function () { downloadScripts("ps1", false); });
    els.scriptMacBtn.addEventListener("click", function () { downloadScripts("sh", false); });
    els.undoBtn.addEventListener("click", downloadUndo);
    els.qInput.addEventListener("input", function () { ui.q = els.qInput.value; renderTable(); });
    els.filterChips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b) return;
      ui.filter = b.getAttribute("data-filter");
      renderTable();
    });
    els.folderList.addEventListener("click", onFolderAction);
    els.shelfBody.addEventListener("change", onPick);
    els.shelfBody.addEventListener("click", onRowAction);

    Hub.store.persistent().then(function (ok) {
      if (!ok) {
        els.saveState.className = "hub-pill is-warn";
        els.saveState.textContent = "保存できません（閉じると消えます）";
        els.saveState.hidden = false;
      }
    });

    Promise.all([Hub.loadCatalog(), Hub.shelf.load()])
      .then(function (res) {
        catalog = res[0];
        shelf = res[1];
        if (!shelf.pins) shelf.pins = {};
        plays = Hub.countPlays(catalog);
        if (catalog.manifest.attribution) {
          els.attribution.textContent = catalog.manifest.attribution + (catalog.manifest.sample ? "（サンプルデータ）" : "");
        }
        rematchAll();
        renderAll();
      })
      .catch(function (err) {
        els.emptyState.hidden = false;
        els.emptyState.firstElementChild.textContent = "カタログを読み込めませんでした。再読み込みしてください。（" + err.message + "）";
      });
  }

  // ---------- 照合 ----------
  function matchEntry(item) {
    var base = item.kind === "file" ? item.entryName.replace(/\.[^.]+$/, "") : item.entryName;
    var pinned = shelf.pins[pinKey(item)];
    if (pinned && catalog.byId[pinned]) {
      item.status = "matched";
      item.scenarioId = pinned;
      item.candidates = [];
      return;
    }
    var m = Hub.matchText(base, catalog.matchIndex, Hub.detectSystem(base));
    item.status = m.status;
    item.scenarioId = m.scenario ? m.scenario.id : null;
    item.candidates = m.status === "ambiguous" ? m.candidates.map(function (s) { return s.id; }) : [];
  }

  function rematchAll() { shelf.items.forEach(matchEntry); }

  // 候補の選択はフォルダごとに覚える（別フォルダの同名エントリーに波及させない）
  function pinKey(item) { return item.folderId + "/" + item.entryName; }

  function buildRows() {
    var out = [];
    var seen = {};
    shelf.items.forEach(function (it) {
      var folder = shelf.folders.filter(function (f) { return f.id === it.folderId; })[0];
      var sc = it.scenarioId ? catalog.byId[it.scenarioId] : null;
      if (sc) seen[sc.id] = true;
      out.push({ key: it.folderId + "/" + it.entryName, item: it, folder: folder, sc: sc, state: rowState(sc, it.status) });
    });
    shelf.manual.forEach(function (m) {
      var sc = catalog.byId[m.scenarioId];
      if (!sc || seen[sc.id]) return;
      out.push({ key: "manual/" + sc.id, manual: true, sc: sc, state: rowState(sc, "matched") });
    });
    return out;
  }

  function rowState(sc, status) {
    if (sc) return plays[sc.id] ? "played" : "stack";
    return status === "ambiguous" ? "ambiguous" : "none";
  }

  // ---------- 描画 ----------
  function renderAll() {
    rows = buildRows();
    renderStats();
    renderFolders();
    renderTable();
    renderRename();
  }

  function renderStats() {
    var owned = {};
    var played = 0;
    var stack = 0;
    var pending = 0;
    rows.forEach(function (r) {
      if (r.sc && !owned[r.sc.id]) {
        owned[r.sc.id] = true;
        if (r.state === "played") played++; else stack++;
      }
      if (!r.sc) pending++;
    });
    els.statOwned.textContent = Object.keys(owned).length;
    els.statStack.textContent = stack;
    els.statPlayed.textContent = played;
    els.statPending.textContent = pending;
  }

  function foldersOpen() {
    if (ui.foldersOpen !== null) return ui.foldersOpen;
    return shelf.folders.length === 0 && shelf.manual.length === 0;
  }

  function fmtDate(iso) {
    if (!iso) return "未スキャン";
    var d = new Date(iso);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function renderFolders() {
    var open = foldersOpen();
    els.foldersBody.hidden = !open;
    els.foldersMark.textContent = open ? "−" : "+";
    els.foldersToggle.setAttribute("aria-expanded", String(open));
    els.foldersTitle.textContent = "フォルダ " + shelf.folders.length;
    var pending = rows.filter(function (r) { return r.state === "ambiguous"; }).length;
    var none = rows.filter(function (r) { return r.state === "none"; }).length;
    var last = shelf.folders.map(function (f) { return f.scannedAt || ""; }).sort().pop();
    els.foldersMeta.innerHTML = shelf.folders.length
      ? "<span>" + esc(fmtDate(last)) + "</span>" +
        (pending ? '<span class="hub-pill is-warn">照合待ち ' + pending + "</span>" : "") +
        (none ? '<span class="hub-pill is-plain">未登録 ' + none + "</span>" : "")
      : "";
    els.folderList.innerHTML = shelf.folders.map(function (f) {
      var count = shelf.items.filter(function (it) { return it.folderId === f.id; }).length;
      return '<div class="bs-folder"><strong>' + esc(f.name) + "<small>" + count + " 件 ・ " + esc(fmtDate(f.scannedAt)) + "</small></strong>" +
        '<span class="bs-folder-btns"><button type="button" class="hub-btn" data-rescan="' + esc(f.id) + '">再スキャン</button>' +
        '<button type="button" class="hub-btn" data-remove-folder="' + esc(f.id) + '">登録を解除</button></span></div>';
    }).join("");
  }

  function matchesQuery(r, q) {
    if (!q) return true;
    var hay = Hub.normalizeTitle([
      r.sc ? r.sc.title : "",
      r.sc ? (r.sc.writers || []).join(" ") : "",
      r.sc && r.sc.circle ? r.sc.circle.name : "",
      r.item ? r.item.entryName : ""
    ].join(" "));
    return hay.indexOf(q) >= 0;
  }

  function renderTable() {
    var counts = {};
    rows.forEach(function (r) { counts[r.state] = (counts[r.state] || 0) + 1; });
    els.filterChips.innerHTML = STATES.map(function (s) {
      var n = s.id ? (counts[s.id] || 0) : rows.length;
      return '<button type="button" class="hub-chip" data-filter="' + s.id + '" aria-pressed="' + (ui.filter === s.id) + '">' + s.label + " " + n + "</button>";
    }).join("");

    var q = Hub.normalizeTitle(ui.q);
    var list = rows.filter(function (r) { return (!ui.filter || r.state === ui.filter) && matchesQuery(r, q); });
    var order = { ambiguous: 0, none: 1, stack: 2, played: 3 };
    list.sort(function (a, b) {
      return order[a.state] - order[b.state] || (a.sc ? a.sc.title : a.item.entryName).localeCompare(b.sc ? b.sc.title : b.item.entryName, "ja");
    });

    els.emptyState.hidden = rows.length > 0;
    els.shelfBody.innerHTML = list.map(rowHtml).join("") ||
      (rows.length ? '<tr><td colspan="7" class="bs-hint">条件に合う作品はありません。</td></tr>' : "");
  }

  function rowHtml(r) {
    var sc = r.sc;
    var sys = sc ? sc.system : Hub.detectSystem(r.item.entryName);
    var thumb = '<span class="hub-cover bs-thumb sys-' + esc(sys || "OTHER") + '">' +
      (sc && sc.cover_url ? '<img src="' + esc(sc.cover_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer" />' : "") + "</span>";
    var title;
    if (sc) {
      title = '<a class="hub-cell-title" href="../scenario-library/index.html?id=' + encodeURIComponent(sc.id) + '">' + esc(sc.title) + "</a>" +
        '<span class="hub-cell-sub">' + esc((sc.writers || []).join("、") || (sc.circle && sc.circle.name) || "作者不明") + "</span>";
    } else if (r.state === "ambiguous") {
      title = '<span class="hub-cell-title">' + esc(r.item.entryName) + "</span>" +
        '<select class="hub-select bs-pick" data-pick="' + esc(r.key) + '" aria-label="候補から選ぶ"><option value="">候補から選ぶ（' + r.item.candidates.length + " 件）</option>" +
        r.item.candidates.map(function (id) {
          var c = catalog.byId[id];
          return c ? '<option value="' + esc(id) + '">' + esc(c.title + " ／ " + (c.writers || []).join("、") + " ／ " + (Hub.SYSTEMS[c.system] || "")) + "</option>" : "";
        }).join("") + "</select>";
    } else {
      var q = r.item.entryName.replace(FILE_EXT, "").replace(/【[^】]*】|\[[^\]]*\]/g, " ").trim();
      title = '<span class="hub-cell-title">' + esc(r.item.entryName) + "</span>" +
        '<span class="bs-row-actions"><a class="hub-linkbtn" href="../scenario-library/index.html?q=' + encodeURIComponent(q) + '">ライブラリで探す</a></span>';
    }
    var folder = r.manual
      ? '<span class="hub-cell-sub">手動で追加</span><button type="button" class="hub-linkbtn" data-remove-manual="' + esc(sc.id) + '">本棚から外す</button>'
      : '<span class="hub-mono">' + esc(r.item.entryName) + '</span><span class="hub-cell-sub">' + esc(r.folder ? r.folder.name : "") + "</span>" +
        (shelf.pins[r.key] ? '<button type="button" class="hub-linkbtn" data-unpin="' + esc(r.key) + '">照合を選び直す</button>' : "");
    return "<tr><td>" + thumb + "</td><td>" + title + "</td>" +
      "<td>" + (sys ? '<span class="hub-pill sys-' + esc(sys) + '">' + esc(Hub.SYSTEMS[sys]) + "</span>" : "—") + "</td>" +
      "<td>" + (sc ? esc(Hub.playersLabel(sc.players)) : "—") + "</td>" +
      "<td>" + (sc ? esc(Hub.durationLabel(sc.duration)) : "—") + "</td>" +
      "<td>" + STATE_PILL[r.state] + "</td><td>" + folder + "</td></tr>";
  }

  // ---------- 命名ルール ----------
  function setTpl(v) {
    ui.tpl = v;
    try { localStorage.setItem(TPL_KEY, v); } catch (e) { /* 保存できなくても続ける */ }
    renderRename();
  }

  function renamePlan() {
    var plan = [];
    var taken = {};
    shelf.items.forEach(function (it) { taken[it.folderId + "/" + it.entryName] = true; });
    var used = {};
    shelf.items.forEach(function (it) {
      if (!it.scenarioId) return;
      var sc = catalog.byId[it.scenarioId];
      if (!sc) return;
      var ext = it.kind === "file" ? (it.entryName.match(/\.[^.]+$/) || [""])[0] : "";
      var to = Hub.fillTemplate(ui.tpl, sc) + ext;
      var key = it.folderId + "/" + it.entryName;
      var conflict = (to !== it.entryName && taken[it.folderId + "/" + to]) || used[it.folderId + "/" + to];
      used[it.folderId + "/" + to] = true;
      plan.push({ key: key, item: it, from: it.entryName, to: to, same: to === it.entryName, conflict: !!conflict });
    });
    return plan;
  }

  function selectedPlan() {
    return renamePlan().filter(function (p) { return !p.same && !p.conflict && !ui.unchecked[p.key]; });
  }

  function renderRename() {
    els.renamePanel.hidden = !ui.renameOpen;
    els.renameToggle.textContent = ui.renameOpen ? "整理を閉じる" : "フォルダ名を整理";
    els.renameToggle.setAttribute("aria-expanded", String(ui.renameOpen));
    if (!ui.renameOpen || !catalog) return;
    var plan = renamePlan();
    var unmatched = shelf.items.filter(function (it) { return !it.scenarioId; }).length;
    els.previewBody.innerHTML = plan.map(function (p) {
      var note = p.same ? '<span class="is-same">変更なし</span>' : p.conflict ? '<span class="hub-pill is-warn">同じ名前があります</span> ' + esc(p.to) : esc(p.to);
      return '<tr><td><input type="checkbox" data-key="' + esc(p.key) + '" aria-label="変更する"' + (p.same || p.conflict ? " disabled" : "") +
        (!ui.unchecked[p.key] && !p.same && !p.conflict ? " checked" : "") + ' /></td><td class="hub-mono">' + esc(p.from) +
        '</td><td aria-hidden="true">→</td><td class="hub-cell-title">' + note + "</td></tr>";
    }).join("") + (unmatched ? '<tr><td></td><td colspan="3" class="bs-hint">照合待ち・未登録の ' + unmatched + " 件は変更しません。</td></tr>" : "") +
      "";
    renderRenameNote();
  }

  function renderRenameNote() {
    var n = selectedPlan().length;
    els.renameNote.textContent = n
      ? n + " 件"
      : "";
    els.scriptWinBtn.disabled = els.scriptMacBtn.disabled = n === 0;
    // 実行・再スキャン後は次の変更が無くなるので、元に戻すは履歴があれば使えるようにする
    els.undoBtn.disabled = n === 0 && shelf.renames.length === 0;
  }

  function psQuote(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
  function shQuote(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

  function scriptFor(kind, pairs, folderName, undo) {
    var title = (undo ? "元に戻す" : "フォルダ名の変更") + "（" + pairs.length + " 件）";
    if (kind === "ps1") {
      return "﻿# マイ本棚: " + title + "\r\n# このファイルを「" + folderName + "」フォルダの中に置き、右クリック →「PowerShell で実行」してください。\r\n" +
        "$ErrorActionPreference = 'Continue'\r\nSet-Location -LiteralPath $PSScriptRoot\r\n" +
        pairs.map(function (p) {
          return "if (Test-Path -LiteralPath " + psQuote(p.from) + ") { if (Test-Path -LiteralPath " + psQuote(p.to) + ") { Write-Host 'skip: ' " + psQuote(p.to) +
            " } else { Rename-Item -LiteralPath " + psQuote(p.from) + " -NewName " + psQuote(p.to) + " } }";
        }).join("\r\n") + "\r\nWrite-Host '完了しました'\r\n";
    }
    return "#!/bin/sh\n# マイ本棚: " + title + "\n# このファイルを「" + folderName + "」フォルダの中に置き、ターミナルで sh ファイル名 を実行してください。\n" +
      'cd "$(dirname "$0")" || exit 1\n' +
      pairs.map(function (p) {
        return "if [ -e " + shQuote(p.from) + " ] && [ ! -e " + shQuote(p.to) + " ]; then mv -- " + shQuote(p.from) + " " + shQuote(p.to) + "; fi";
      }).join("\n") + "\necho '完了しました'\n";
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function groupByFolder(plan) {
    var groups = {};
    plan.forEach(function (p) {
      (groups[p.item.folderId] = groups[p.item.folderId] || []).push(p);
    });
    return groups;
  }

  function downloadScripts(kind) {
    var plan = selectedPlan();
    if (!plan.length) return;
    var groups = groupByFolder(plan);
    Object.keys(groups).forEach(function (fid) {
      var folder = shelf.folders.filter(function (f) { return f.id === fid; })[0];
      var name = folder ? folder.name : "本棚";
      download("rename-" + safeFile(name) + "." + kind, scriptFor(kind, groups[fid], name, false));
    });
    // 名前を変えたあとも選んだ照合を覚えておく
    plan.forEach(function (p) {
      var from = p.item.folderId + "/" + p.from;
      if (shelf.pins[from]) shelf.pins[p.item.folderId + "/" + p.to] = shelf.pins[from];
    });
    shelf.renames.push({ at: new Date().toISOString(), pairs: plan.map(function (p) { return { folderId: p.item.folderId, from: p.from, to: p.to }; }) });
    shelf.lastScriptKind = kind;
    Hub.shelf.save(shelf);
    Hub.toast("スクリプトを書き出しました。実行後に「再スキャン」してください。");
  }

  function downloadUndo() {
    var last = shelf.renames[shelf.renames.length - 1];
    var pairs = last ? last.pairs : selectedPlan().map(function (p) { return { folderId: p.item.folderId, from: p.from, to: p.to }; });
    if (!pairs.length) return;
    var kind = shelf.lastScriptKind || (/Win/i.test(navigator.platform) ? "ps1" : "sh");
    var groups = {};
    pairs.forEach(function (p) { (groups[p.folderId] = groups[p.folderId] || []).push({ from: p.to, to: p.from }); });
    Object.keys(groups).forEach(function (fid) {
      var folder = shelf.folders.filter(function (f) { return f.id === fid; })[0];
      var name = folder ? folder.name : "本棚";
      download("undo-rename-" + safeFile(name) + "." + kind, scriptFor(kind, groups[fid], name, true));
    });
    Hub.toast(last ? "直前に書き出した変更を元に戻すスクリプトです。" : "この変更を元に戻すスクリプトです。");
  }

  function safeFile(s) { return String(s).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40); }

  // ---------- フォルダ登録 ----------
  function newId() { return "f_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function addFolder(targetId) {
    ui.rescanTarget = targetId;
    if (window.showDirectoryPicker) {
      window.showDirectoryPicker({ id: "bookshelf", mode: "read" }).then(function (handle) {
        return findSameFolder(handle).then(function (sameId) {
          return scanHandle(handle).then(function (entries) { applyScan(targetId || sameId, handle.name, entries, "handle", handle); });
        });
      }).catch(function (err) {
        if (err && err.name !== "AbortError") els.folderInput.click();
      });
    } else {
      els.folderInput.value = "";
      els.folderInput.click();
    }
  }

  // 同じフォルダを選び直したときだけ既存の登録を使う（名前が同じ別フォルダは別登録）
  function findSameFolder(handle) {
    var withHandle = shelf.folders.filter(function (f) { return f.handle && f.handle.isSameEntry; });
    return Promise.all(withHandle.map(function (f) {
      return f.handle.isSameEntry(handle).catch(function () { return false; });
    })).then(function (same) {
      var i = same.indexOf(true);
      return i >= 0 ? withHandle[i].id : null;
    });
  }

  function scanHandle(handle) {
    var entries = [];
    var it = handle.values();
    function step() {
      return it.next().then(function (r) {
        if (r.done) return entries;
        var h = r.value;
        if (h.name.charAt(0) !== ".") {
          if (h.kind === "directory") entries.push({ entryName: h.name, kind: "dir" });
          else if (FILE_EXT.test(h.name)) entries.push({ entryName: h.name, kind: "file" });
        }
        return step();
      });
    }
    return step();
  }

  function onFolderInput() {
    var files = Array.prototype.slice.call(els.folderInput.files || []);
    if (!files.length) return;
    var root = null;
    var seen = {};
    var entries = [];
    files.forEach(function (f) {
      var parts = (f.webkitRelativePath || f.name).split("/");
      root = root || parts[0];
      if (parts.length >= 3 && parts[1].charAt(0) !== ".") {
        if (!seen["d/" + parts[1]]) { seen["d/" + parts[1]] = true; entries.push({ entryName: parts[1], kind: "dir" }); }
      } else if (parts.length === 2 && FILE_EXT.test(parts[1]) && !seen["f/" + parts[1]]) {
        seen["f/" + parts[1]] = true;
        entries.push({ entryName: parts[1], kind: "file" });
      }
    });
    applyScan(ui.rescanTarget, root || "フォルダ", entries, "input", null);
    els.folderInput.value = "";
  }

  function applyScan(targetId, name, entries, method, handle) {
    var folder = targetId ? shelf.folders.filter(function (f) { return f.id === targetId; })[0] : null;
    if (!folder) {
      folder = { id: newId(), name: name };
      shelf.folders.push(folder);
    }
    folder.name = name;
    folder.method = method;
    folder.handle = handle || null;
    folder.scannedAt = new Date().toISOString();
    shelf.items = shelf.items.filter(function (it) { return it.folderId !== folder.id; }).concat(entries.map(function (e) {
      var item = { folderId: folder.id, entryName: e.entryName, kind: e.kind };
      matchEntry(item);
      return item;
    }));
    ui.rescanTarget = null;
    ui.foldersOpen = false;
    save();
    renderAll();
    var matched = entries.filter(function (e, i) { return shelf.items.some(function (it) { return it.folderId === folder.id && it.entryName === e.entryName && it.scenarioId; }); }).length;
    Hub.toast("「" + name + "」から " + entries.length + " 件を読み込み、" + matched + " 件を照合しました");
  }

  function onFolderAction(e) {
    var rescan = e.target.closest("[data-rescan]");
    var remove = e.target.closest("[data-remove-folder]");
    if (rescan) {
      var f = shelf.folders.filter(function (x) { return x.id === rescan.getAttribute("data-rescan"); })[0];
      if (!f) return;
      if (f.handle && f.handle.requestPermission) {
        f.handle.requestPermission({ mode: "read" }).then(function (perm) {
          if (perm !== "granted") throw new Error("denied");
          return scanHandle(f.handle).then(function (entries) { applyScan(f.id, f.handle.name, entries, "handle", f.handle); });
        }).catch(function () { addFolder(f.id); });
      } else {
        addFolder(f.id);
      }
    }
    if (remove) {
      var id = remove.getAttribute("data-remove-folder");
      var folder = shelf.folders.filter(function (x) { return x.id === id; })[0];
      if (!folder || !window.confirm("「" + folder.name + "」の登録を解除し、このフォルダの作品を本棚から外しますか？（フォルダ自体は消えません）")) return;
      shelf.folders = shelf.folders.filter(function (x) { return x.id !== id; });
      shelf.items = shelf.items.filter(function (it) { return it.folderId !== id; });
      save();
      renderAll();
    }
  }

  function onPick(e) {
    var sel = e.target.closest("[data-pick]");
    if (!sel || !sel.value) return;
    var key = sel.getAttribute("data-pick");
    var item = shelf.items.filter(function (it) { return it.folderId + "/" + it.entryName === key; })[0];
    if (!item) return;
    shelf.pins[pinKey(item)] = sel.value;
    matchEntry(item);
    save();
    renderAll();
    Hub.toast("「" + catalog.byId[sel.value].title + "」として登録しました");
  }

  function onRowAction(e) {
    var rm = e.target.closest("[data-remove-manual]");
    var unpin = e.target.closest("[data-unpin]");
    if (rm) {
      Hub.shelf.removeManual(rm.getAttribute("data-remove-manual")).then(function (data) {
        shelf.manual = data.manual;
        renderAll();
      });
    }
    if (unpin) {
      var key = unpin.getAttribute("data-unpin");
      delete shelf.pins[key];
      shelf.items.forEach(function (it) { if (pinKey(it) === key) matchEntry(it); });
      save();
      renderAll();
    }
  }

  function save() { Hub.shelf.save(shelf); }

  // ---------- JSON ----------
  function exportJson() {
    var data = {
      schema: "bookshelf/v1",
      exportedAt: new Date().toISOString(),
      folders: shelf.folders.map(function (f) { return { id: f.id, name: f.name, scannedAt: f.scannedAt }; }),
      items: shelf.items.map(function (it) { return { folderId: it.folderId, entryName: it.entryName, kind: it.kind, scenarioId: it.scenarioId || null }; }),
      manual: shelf.manual,
      pins: shelf.pins
    };
    download("my-bookshelf.json", JSON.stringify(data, null, 2), "application/json");
  }

  function onImport() {
    var file = els.importInput.files && els.importInput.files[0];
    if (!file) return;
    file.text().then(function (text) {
      var data = JSON.parse(text);
      if (data.schema !== "bookshelf/v1") throw new Error("マイ本棚の JSON ではありません");
      if ((shelf.folders.length || shelf.manual.length) && !window.confirm("今の本棚を、読み込んだ内容で置き換えますか？")) return;
      shelf.folders = (data.folders || []).map(function (f) { return { id: f.id, name: f.name, scannedAt: f.scannedAt, method: "input" }; });
      shelf.items = (data.items || []).map(function (it) { return { folderId: it.folderId, entryName: it.entryName, kind: it.kind }; });
      shelf.manual = data.manual || [];
      shelf.pins = data.pins || {};
      rematchAll();
      save();
      renderAll();
      Hub.toast("本棚を読み込みました");
    }).catch(function (err) {
      Hub.toast("読み込めませんでした：" + err.message);
    }).then(function () { els.importInput.value = ""; });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
