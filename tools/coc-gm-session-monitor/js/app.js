/*
 * CoC GMセッションモニター — 画面
 * 文字列は textContent で入れる（innerHTML に利用者のデータを入れない）。
 */
(function () {
  "use strict";

  var C = window.GMCore;
  var Store = window.GMStore;
  var Parser = window.ChatPaletteParser;
  var Schema = window.ChatPaletteSchema;
  var TABLES = { INITIAL_6E: Parser.INITIAL_6E, INITIAL_7E: Parser.INITIAL_7E, categorize: Parser.categorize };

  var REPORT_PENDING_IMPORT_KEY = "trpgWebTools.sessionReportGenerator.pendingImport";
  var SESSION_LOG_TRANSFER_KEY = "trpg-web-tools:session-log-transfer";
  var COLORS = ["#e9c46a", "#e07a6f", "#6fa8dc", "#8fc18f", "#c39bd3", "#f4a261", "#76c7c0", "#d4a5a5", "#b5b5b5", "#a3c4f3"];
  var STAT_LABELS = { hp: "HP", mp: "MP", san: "正気度", luck: "幸運" };
  var ROLE_LABELS = { PC: "PC", KPC: "KPC", NPC: "NPC", enemy: "敵対者" };
  var EDITION_LABELS = { "6e": "6版", "7e": "7版", unknown: "版不明" };

  var $ = function (id) { return document.getElementById(id); };
  var state;

  /* ---------- 小道具 ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "text") node.textContent = v;
        else if (k === "class") node.className = v;
        else if (k === "style") node.setAttribute("style", v);
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
        else if (k === "value") node.value = v;
        else if (k === "checked" || k === "disabled" || k === "selected" || k === "open") node[k] = !!v;
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  function toast(message, kind, action) {
    var t = el("div", { class: "toast " + (kind || ""), role: kind === "error" ? "alert" : "status" }, [el("span", { text: message })]);
    if (action) t.appendChild(el("button", { type: "button", class: "btn small", text: action.label, onclick: function () { action.run(); t.remove(); } }));
    t.appendChild(el("button", { type: "button", class: "toast-close", "aria-label": "閉じる", text: "×", onclick: function () { t.remove(); } }));
    $("toasts").appendChild(t);
    if (kind !== "error" && String(kind || "").indexOf("conflict") < 0) setTimeout(function () { t.remove(); }, action ? 9000 : 3600);
  }

  function copyText(text, label) {
    if (!text) { toast("コピーする内容がありません。", "warn"); return; }
    function fallback() {
      var ta = el("textarea", { value: text, style: "position:fixed;left:-9999px" });
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? (label || "コピーしました") : "コピーできませんでした。手動で選択してください。", ok ? "" : "error");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(label || "コピーしました"); }, fallback);
    } else fallback();
  }

  var dialogResolve = null;
  var dialogReturnFocus = null;
  // actions: [{ label, value, kind }]。value が "cancel" のものは検証しない。
  function openDialog(title, body, actions, onSubmit) {
    var dlg = $("dialog");
    dialogReturnFocus = document.activeElement;
    $("dialogTitle").textContent = title;
    clear($("dialogBody")).appendChild(body);
    var box = clear($("dialogActions"));
    (actions || [{ label: "閉じる", value: "cancel" }]).forEach(function (a) {
      box.appendChild(el("button", { type: "submit", value: a.value, class: "btn " + (a.kind || (a.value === "cancel" ? "ghost" : "")), text: a.label, formnovalidate: a.value === "cancel" }));
    });
    return new Promise(function (resolve) {
      $("dialog").returnValue = "";
      dialogResolve = function (value) {
        if (onSubmit && value !== "cancel") {
          var err = onSubmit(value);
          if (err) { toast(err, "error"); return false; }
        }
        resolve(value);
        return true;
      };
      dlg.showModal();
    });
  }

  $("dialogForm").addEventListener("submit", function (e) {
    var value = e.submitter ? e.submitter.value : "cancel";
    if (dialogResolve && !dialogResolve(value)) { e.preventDefault(); return; }
  });
  // Enter での暗黙の送信は「先頭のボタン」（やめる／卓から外す 等）になるので止める
  $("dialogForm").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
  });
  $("dialog").addEventListener("close", function () {
    // 続けて別のダイアログを開いた場合は、そちらの待ち受けを消さない
    if ($("dialog").open) return;
    if (dialogResolve && $("dialog").returnValue === "") dialogResolve("cancel");
    dialogResolve = null;
    if (dialogReturnFocus && dialogReturnFocus.focus) dialogReturnFocus.focus();
  });

  function confirmDialog(title, message, okLabel, danger) {
    return openDialog(title, el("p", { text: message }), [
      { label: "やめる", value: "cancel" },
      { label: okLabel || "OK", value: "ok", kind: danger ? "danger-btn" : "" }
    ]).then(function (v) { return v === "ok"; });
  }

  function field(label, input, hint) {
    return el("label", { class: "field" }, [el("span", { text: label }), input, hint ? el("small", { class: "muted", text: hint }) : null]);
  }

  function numInput(value, attrs) {
    return el("input", Object.assign({ type: "number", value: value === null || value === undefined ? "" : String(value), inputmode: "numeric" }, attrs || {}));
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "application/json" });
    var a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function pickJsonFile() {
    return new Promise(function (resolve) {
      var input = $("hiddenFile");
      input.value = "";
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) return resolve(null);
        if (f.size > 20 * 1024 * 1024) { toast("ファイルが大きすぎます（20MBまで）。", "error"); return resolve(null); }
        f.text().then(resolve, function () { toast("ファイルを読めませんでした。", "error"); resolve(null); });
      };
      input.click();
    });
  }

  /* ---------- 状態アクセス ---------- */

  function T() {
    return state.tables.find(function (t) { return t.id === state.currentTableId; }) || state.tables[0];
  }
  function charOf(p) { return state.characters[p.characterId]; }
  function visibleParticipants() { return T().participants.filter(function (p) { return p.visible !== false; }); }
  function isArchived() { return T().status === "archived"; }

  function displayName(p, mode) {
    var c = charOf(p);
    var name = (c && c.name) || "名称未設定";
    if (mode === "short") return name.split(/[\s　]+/)[0] || name;
    if (mode === "ho") return p.ho || name;
    return name;
  }

  function touch() {
    var t = T();
    t.updatedAt = Store.nowIso();
    Store.save();
  }

  /* ---------- 変動ログ / Undo ---------- */

  function fieldLabel(field) {
    return { hp: "HP", mp: "MP", san: "SAN", luck: "幸運", sanBaseline: "基準SAN", gameMinutes: "ゲーム内時間", mpFrac: "MP端数" }[field] || field;
  }

  function readField(p, field) {
    if (!p) return T()[field];
    return p.state[field];
  }
  function writeField(p, field, value) {
    if (!p) T()[field] = value;
    else p.state[field] = value;
  }

  function record(p, field, before, after, reason, groupId) {
    if (before === after) return;
    writeField(p, field, after);
    T().events.push({
      id: C.uid("ev"), groupId: groupId, at: Store.nowIso(), gameMinutes: T().gameMinutes,
      pid: p ? p.id : null, field: field, before: before, after: after, reason: reason || ""
    });
  }

  function undoLast() {
    var t = T();
    for (var i = t.events.length - 1; i >= 0; i--) {
      var ev = t.events[i];
      if (ev.undone || ev.kind === "undo") continue;
      var gid = ev.groupId;
      var group = t.events.filter(function (e) { return e.groupId === gid && !e.undone && e.kind !== "undo"; });
      group.slice().reverse().forEach(function (e) {
        var p = e.pid ? t.participants.find(function (x) { return x.id === e.pid; }) : null;
        if (e.pid && !p) return;
        writeField(p, e.field, e.before);
        e.undone = true;
      });
      t.events.push({ id: C.uid("ev"), kind: "undo", of: gid, at: Store.nowIso(), gameMinutes: t.gameMinutes, reason: group[0] ? group[0].reason : "" });
      touch();
      renderAll();
      toast("取り消しました：" + (group[0] ? group[0].reason || fieldLabel(group[0].field) : ""));
      return;
    }
    toast("取り消せる操作がありません。", "warn");
  }

  function formatGameTime(min) {
    min = Math.round(min || 0);
    var d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    return (d ? d + "日" : "") + h + "時間" + (m ? m + "分" : "");
  }

  function renderLog() {
    var t = T();
    var list = clear($("logList"));
    var shown = t.events.filter(function (e) { return e.field !== "mpFrac"; });
    $("logCount").textContent = shown.length ? "（" + shown.length + "件）" : "";
    shown.slice(-200).reverse().forEach(function (e) {
      var time = new Date(e.at);
      var hhmm = isNaN(time) ? "" : String(time.getHours()).padStart(2, "0") + ":" + String(time.getMinutes()).padStart(2, "0");
      var text;
      if (e.kind === "undo") text = "取消：" + (e.reason || "");
      else {
        var p = e.pid ? t.participants.find(function (x) { return x.id === e.pid; }) : null;
        var who = e.pid ? (p ? displayName(p) : "（削除済み）") : "卓";
        var b = e.field === "gameMinutes" ? formatGameTime(e.before) : e.before;
        var a = e.field === "gameMinutes" ? formatGameTime(e.after) : e.after;
        text = who + "　" + fieldLabel(e.field) + " " + (b === null ? "—" : b) + " → " + (a === null ? "—" : a) + (e.reason ? "（" + e.reason + "）" : "");
      }
      list.appendChild(el("li", { class: e.undone ? "undone" : "" }, [
        el("span", { class: "log-time muted", text: hhmm + " / ゲーム内+" + formatGameTime(e.gameMinutes) }),
        el("span", { text: text })
      ]));
    });
    $("undoBtn").disabled = !t.events.some(function (e) { return !e.undone && e.kind !== "undo"; });
  }

  /* ---------- ステータス変更 ---------- */

  function maxOf(p, field) {
    var m = p.max || {};
    return field === "luck" ? null : (m[field] === undefined ? null : m[field]);
  }

  function changeStat(p, field, next, reason) {
    if (isArchived()) return;
    var before = p.state[field];
    next = C.toNum(next);
    if (next === null) { renderCards(); return; }
    next = Math.round(next);
    var max = maxOf(p, field);
    if (next < 0) { next = 0; toast(STAT_LABELS[field] + "は0未満にできません。", "warn"); }
    if (max !== null && next > max) { next = max; toast(STAT_LABELS[field] + "は最大値（" + max + "）までにしました。", "warn"); }
    if (before === next) { renderCards(); return; }
    var gid = C.uid("grp");
    record(p, field, before, next, reason, gid);
    if (field === "san" && C.isTempInsanityDrop(before, next, T().rules)) {
      toast(displayName(p) + "：1回で" + (before - next) + "減少。一時的狂気の目安です（判定はKP判断）。", "warn");
    }
    if (field === "san") {
      var info = C.sanInfo(p.state.sanBaseline, next, T().rules);
      var prev = C.sanInfo(p.state.sanBaseline, before, T().rules);
      if (info && info.reached && !(prev && prev.reached)) toast(displayName(p) + "：基準SANからの減少が" + info.lost + "。不定の狂気ラインです（判定はKP判断）。", "warn");
    }
    touch();
    renderCards(); renderLog(); renderAbility();
  }

  function updateBaseline(p, value, reason) {
    if (isArchived()) return;
    value = C.toNum(value);
    if (value === null) return;
    record(p, "sanBaseline", p.state.sanBaseline, Math.round(value), reason || "基準SAN更新", C.uid("grp"));
    touch();
    renderCards(); renderLog();
  }

  function advanceTime() {
    if (isArchived()) return;
    var hours = Number($("hoursInput").value);
    if (!isFinite(hours) || hours <= 0) { toast("経過時間は0より大きい数にしてください。", "warn"); return; }
    if (hours > 24 * 30) { toast("一度に進められるのは30日までです。", "warn"); return; }
    var t = T();
    var gid = C.uid("grp");
    var reason = "時間経過 " + hours + "時間";
    var summary = [];
    visibleParticipants().forEach(function (p) {
      var c = charOf(p);
      var pow = c && c.abilities ? C.toNum(c.abilities.POW) : null;
      var rate = C.mpRatePerHour(c ? c.edition : "unknown", pow, t.rules);
      if (rate !== null && p.state.mp !== null) {
        var r = C.advanceMp(p.state.mp, maxOf(p, "mp"), p.state.mpFrac || 0, rate, hours, t.rules);
        if (r.mp !== p.state.mp) summary.push(displayName(p, "short") + " MP+" + r.gained);
        record(p, "mp", p.state.mp, r.mp, reason, gid);
        record(p, "mpFrac", p.state.mpFrac || 0, r.frac, reason, gid);
      }
      if ($("advanceBaseline").checked && p.state.san !== null) record(p, "sanBaseline", p.state.sanBaseline, p.state.san, reason, gid);
    });
    record(null, "gameMinutes", t.gameMinutes || 0, (t.gameMinutes || 0) + Math.round(hours * 60), reason, gid);
    touch();
    renderAll();
    toast(reason + (summary.length ? "：" + summary.join("、") : "（MPの変化なし）"), "", { label: "取り消す", run: undoLast });
  }

  /* ---------- カード ---------- */

  function renderCards() {
    var t = T();
    var box = clear($("cards"));
    $("gameClock").textContent = "ゲーム内 経過 " + formatGameTime(t.gameMinutes);
    var vis = t.participants.filter(function (p) { return p.visible !== false; });
    var hidden = t.participants.filter(function (p) { return p.visible === false; });
    if (!t.participants.length) {
      box.appendChild(el("div", { class: "empty" }, [
        el("p", { text: "まだ探索者がいません。" }),
        el("button", { type: "button", class: "btn", text: "キャラクターを読み込む", onclick: function () { jump("importPanel"); } })
      ]));
    }
    vis.forEach(function (p, idx) { box.appendChild(card(p, idx, vis.length)); });
    if (hidden.length) {
      box.appendChild(el("div", { class: "hidden-list muted" }, [el("span", { text: "非表示：" })].concat(hidden.map(function (p) {
        return el("button", { type: "button", class: "chip", text: displayName(p) + "（表示する）", onclick: function () { p.visible = true; touch(); renderAll(); } });
      }))));
    }
    var pcCount = t.participants.length;
    $("navImport").textContent = "読込 " + pcCount + "/" + (t.slots || pcCount);
    $("importSummary").textContent = pcCount + "人登録 / 予定" + (t.slots || "—") + "人";
  }

  function statBox(p, field) {
    var max = maxOf(p, field);
    var cur = p.state[field];
    var input = numInput(cur, { class: "stat-input", "aria-label": displayName(p) + "の" + STAT_LABELS[field], min: 0 });
    input.addEventListener("change", function () { changeStat(p, field, input.value, "直接入力"); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") input.blur(); });
    var low = max && cur !== null && cur <= max / 4;
    return el("div", { class: "stat" + (low ? " low" : "") }, [
      el("div", { class: "stat-label", text: STAT_LABELS[field] }),
      el("div", { class: "stat-value" }, [input, el("span", { class: "stat-max", text: "/ " + (max === null ? (field === "luck" ? (p.luckStart !== undefined && p.luckStart !== null ? p.luckStart : "—") : "—") : max) })]),
      el("div", { class: "stat-buttons" }, [
        el("button", { type: "button", class: "btn small", text: "−1", "aria-label": STAT_LABELS[field] + "を1減らす", onclick: function () { changeStat(p, field, (cur || 0) - 1, "−1"); } }),
        el("button", { type: "button", class: "btn small", text: "+1", "aria-label": STAT_LABELS[field] + "を1増やす", onclick: function () { changeStat(p, field, (cur || 0) + 1, "+1"); } })
      ])
    ]);
  }

  function card(p, idx, count) {
    var t = T();
    var c = charOf(p);
    var d = t.display;
    var stats = ["hp", "mp", "san", "luck"].filter(function (f) { return d[f]; });
    var san = C.sanInfo(p.state.sanBaseline, p.state.san, t.rules);
    var pow = c.abilities ? C.toNum(c.abilities.POW) : null;
    var rate = C.mpRatePerHour(c.edition, pow, t.rules);
    var baselineInput = numInput(p.state.sanBaseline, { class: "num-sm", "aria-label": "基準SAN" });
    baselineInput.addEventListener("change", function () { updateBaseline(p, baselineInput.value, "基準SAN 手入力"); });

    var info = [];
    if (san) {
      info.push(el("div", { class: san.reached ? "warn-line" : "" }, [
        "SAN", el("b", { text: String(san.line) }), "以下（" + san.threshold + "減少）で不定",
        san.reached ? el("span", { class: "warn-badge", text: "⚠ ライン到達・KP判断" }) : null
      ]));
    }
    if (rate !== null) info.push(el("div", null, ["MP回復 ", el("b", { text: String(Math.round(rate * 100) / 100) }), "/時"]));
    else if (c.edition === "unknown") info.push(el("div", { class: "muted", text: "版が不明のためMP回復を計算しません（設定で版を指定）" }));

    return el("article", { class: "card" + (san && san.reached ? " reached" : ""), style: "--pc:" + (p.color || "#888") }, [
      el("header", { class: "card-head" }, [
        el("span", { class: "swatch", "aria-hidden": "true" }),
        el("div", { class: "card-name" }, [
          c.ruby ? el("div", { class: "ruby", text: c.ruby }) : null,
          el("div", { class: "name", text: c.name || "名称未設定" })
        ]),
        el("div", { class: "card-tools" }, [
          el("button", { type: "button", class: "icon-btn", title: "前へ", "aria-label": "前へ移動", disabled: idx === 0, text: "←", onclick: function () { move(p, -1); } }),
          el("button", { type: "button", class: "icon-btn", title: "後ろへ", "aria-label": "後ろへ移動", disabled: idx === count - 1, text: "→", onclick: function () { move(p, 1); } }),
          c.sourceUrl && /^https:\/\//.test(c.sourceUrl) ? el("a", { class: "icon-btn", href: c.sourceUrl, target: "_blank", rel: "noopener noreferrer", title: "キャラシを開く", "aria-label": "キャラシを開く", text: "↗" }) : null,
          el("button", { type: "button", class: "icon-btn", title: "設定", "aria-label": displayName(p) + "の設定", text: "⚙", onclick: function () { openParticipantSettings(p); } })
        ])
      ]),
      el("div", { class: "card-meta" }, [
        el("span", { class: "chip ed", text: EDITION_LABELS[c.edition] || "版不明" }),
        p.role !== "PC" ? el("span", { class: "chip", text: ROLE_LABELS[p.role] || p.role }) : null,
        p.ho ? el("span", { class: "chip", text: p.ho }) : null,
        el("span", { class: "muted", text: "PL" }),
        el("span", { class: p.pl ? "" : "muted", text: p.pl || "未入力" })
      ]),
      el("div", { class: "stats" }, stats.map(function (f) { return statBox(p, f); })),
      el("div", { class: "card-info" }, info),
      d.san ? el("div", { class: "baseline" }, [
        el("span", { text: "基準SAN" }), baselineInput,
        el("button", { type: "button", class: "btn small ghost", text: "更新", title: "基準SANを現在のSANにする", onclick: function () { updateBaseline(p, p.state.san, "基準SANを現在値に更新"); } })
      ]) : null
    ]);
  }

  function move(p, dir) {
    var list = T().participants;
    var vis = list.filter(function (x) { return x.visible !== false; });
    var i = vis.indexOf(p), j = i + dir;
    if (j < 0 || j >= vis.length) return;
    var a = list.indexOf(vis[i]), b = list.indexOf(vis[j]);
    list[a] = vis[j]; list[b] = vis[i];
    touch(); renderAll();
  }

  /* ---------- キャラクター取込 ---------- */

  var pendingImports = [];

  function characterFromBuilt(b, raw, edition) {
    var t = Store.nowIso();
    var c = {
      id: C.uid("urn:trpg-data:character"),
      createdAt: t, updatedAt: t, revision: 1,
      provenance: [{ source: b.meta.service || "manual", recordedAt: t }],
      edition: edition || b.meta.edition || "unknown",
      editionSource: edition && edition !== b.meta.edition ? "manual" : b.meta.editionSource,
      name: b.meta.name || "",
      ruby: b.meta.ruby || "",
      occupation: b.meta.occupation || "",
      service: b.meta.service || "unknown",
      sourceUrl: b.meta.sourceUrl || "",
      abilities: Object.assign({}, b.abilities),
      derived: JSON.parse(JSON.stringify(b.derived || {})),
      skills: (b.skills || []).map(function (s) { return { name: s.name, value: s.value, valueToken: s.valueToken, category: s.category }; }),
      raw: raw || ""
    };
    c.luck = C.resolveLuck(c);
    return c;
  }

  function participantFor(c, role) {
    var t = T();
    var d = c.derived || {};
    function v(k) { return d[k] && d[k].value !== undefined ? C.toNum(d[k].value) : null; }
    function m(k) { return d[k] && d[k].max !== undefined ? C.toNum(d[k].max) : v(k); }
    var used = t.participants.map(function (p) { return p.color; });
    var color = COLORS.find(function (x) { return used.indexOf(x) < 0; }) || COLORS[t.participants.length % COLORS.length];
    return {
      id: C.uid("pt"),
      characterId: c.id,
      role: role || "PC",
      pl: "", ho: "",
      color: color,
      visible: true,
      max: { hp: m("HP"), mp: m("MP"), san: m("SAN") },
      luckStart: c.luck ? c.luck.value : null,
      state: { hp: v("HP"), mp: v("MP"), san: v("SAN"), luck: c.luck ? c.luck.value : null, sanBaseline: v("SAN"), mpFrac: 0 }
    };
  }

  function previewImport() {
    var text = $("importText").value;
    var chunks = C.splitImportChunks(text);
    if (!chunks.length) { $("importStatus").textContent = "貼り付けた内容がありません。"; return; }
    if (text.length > 5 * 1024 * 1024) { $("importStatus").textContent = "大きすぎます（5MBまで）。"; return; }
    pendingImports = chunks.map(function (raw) {
      var b;
      try { b = Schema.buildCharacter(raw); } catch (e) { return { raw: raw, error: "読み取れませんでした：" + e.message }; }
      var existing = null;
      if (b.meta.sourceUrl) {
        existing = T().participants.find(function (p) { var c = charOf(p); return c && c.sourceUrl === b.meta.sourceUrl; }) || null;
      }
      return { raw: raw, built: b, name: b.meta.name || "", edition: b.meta.edition, role: "PC", include: true, mode: existing ? "update" : "add", existing: existing };
    });
    renderImportPreview();
  }

  function renderImportPreview() {
    var box = clear($("importPreview"));
    if (!pendingImports.length) return;
    var list = el("div", { class: "import-list" });
    pendingImports.forEach(function (item) {
      if (item.error) { list.appendChild(el("div", { class: "import-item error", text: item.error })); return; }
      var b = item.built;
      var nameIn = el("input", { type: "text", value: item.name, "aria-label": "名前" });
      nameIn.addEventListener("input", function () { item.name = nameIn.value; });
      var edSel = el("select", { "aria-label": "版" }, ["6e", "7e", "unknown"].map(function (e) { return el("option", { value: e, text: EDITION_LABELS[e], selected: item.edition === e }); }));
      edSel.addEventListener("change", function () { item.edition = edSel.value; });
      var roleSel = el("select", { "aria-label": "役割" }, Object.keys(ROLE_LABELS).map(function (r) { return el("option", { value: r, text: ROLE_LABELS[r], selected: item.role === r }); }));
      roleSel.addEventListener("change", function () { item.role = roleSel.value; });
      var inc = el("input", { type: "checkbox", checked: item.include, "aria-label": "登録する" });
      inc.addEventListener("change", function () { item.include = inc.checked; });
      var modeSel = null;
      if (item.existing) {
        modeSel = el("select", { "aria-label": "登録方法" }, [
          el("option", { value: "update", text: "既存の「" + displayName(item.existing) + "」を更新（卓内の現在値は保持）", selected: item.mode === "update" }),
          el("option", { value: "add", text: "別のキャラとして追加", selected: item.mode === "add" })
        ]);
        modeSel.addEventListener("change", function () { item.mode = modeSel.value; });
      }
      var warn = (b.meta.warnings || []).map(function (w) { return w.detail; });
      if (b.meta.edition === "unknown") warn.push("版を判定できませんでした。手動で選んでください。");
      list.appendChild(el("div", { class: "import-item" }, [
        el("div", { class: "row gap wrap" }, [inc, nameIn, edSel, roleSel]),
        el("div", { class: "muted small", text: [
          "入力元：" + (b.meta.service || "不明"),
          "版判定：" + (b.meta.editionSource || "—"),
          "能力値 " + b.counts.abilities + "/8",
          "技能 " + b.counts.skills,
          b.derived.HP ? "HP " + b.derived.HP.value : "HP ?",
          b.derived.MP ? "MP " + b.derived.MP.value : "MP ?",
          b.derived.SAN ? "SAN " + b.derived.SAN.value + "/" + b.derived.SAN.max : "SAN ?"
        ].join("　") }),
        modeSel,
        warn.length ? el("ul", { class: "warn-list" }, warn.map(function (w) { return el("li", { text: w }); })) : null
      ]));
    });
    box.appendChild(list);
    box.appendChild(el("div", { class: "row gap" }, [
      el("button", { type: "button", class: "btn", text: "登録する", onclick: commitImport }),
      el("button", { type: "button", class: "btn ghost", text: "やめる", onclick: function () { pendingImports = []; renderImportPreview(); } })
    ]));
  }

  function commitImport() {
    if (isArchived()) return;
    var t = T();
    var added = 0, updated = 0;
    pendingImports.forEach(function (item) {
      if (item.error || !item.include) return;
      var c = characterFromBuilt(item.built, item.raw, item.edition);
      c.name = item.name.trim() || c.name || "名称未設定";
      if (item.existing && item.mode === "update") {
        var old = charOf(item.existing);
        reimportInto(item.existing, old, c, true);
        updated++;
        return;
      }
      state.characters[c.id] = c;
      t.participants.push(participantFor(c, item.role));
      added++;
    });
    pendingImports = [];
    $("importText").value = "";
    if (added || updated) $("importDetails").open = false;
    renderImportPreview();
    $("importStatus").textContent = "";
    touch();
    renderAll();
    toast("登録 " + added + "件" + (updated ? "、更新 " + updated + "件" : ""));
  }

  // シート由来の値だけを更新する。keepState=false なら卓内の現在値もシートの値に戻す。
  function reimportInto(p, oldChar, fresh, keepState) {
    ["edition", "editionSource", "name", "ruby", "occupation", "service", "sourceUrl", "abilities", "derived", "skills", "raw", "luck"].forEach(function (k) {
      oldChar[k] = fresh[k];
    });
    oldChar.updatedAt = Store.nowIso();
    oldChar.revision = (oldChar.revision || 1) + 1;
    var fp = participantFor(oldChar, p.role);
    p.max = fp.max;
    if (!keepState) {
      var gid = C.uid("grp");
      ["hp", "mp", "san", "luck", "sanBaseline"].forEach(function (f) { record(p, f, p.state[f], fp.state[f], "再取込", gid); });
      p.luckStart = fp.luckStart;
    }
  }

  function manualAdd() {
    if (isArchived()) return;
    var name = el("input", { type: "text", required: true });
    var ed = el("select", null, [el("option", { value: "6e", text: "6版" }), el("option", { value: "7e", text: "7版" })]);
    var role = el("select", null, Object.keys(ROLE_LABELS).map(function (r) { return el("option", { value: r, text: ROLE_LABELS[r] }); }));
    var ab = {};
    var grid = el("div", { class: "grid4" }, C.ABILITY_KEYS.map(function (k) { ab[k] = numInput(null, { min: 0 }); return field(k, ab[k]); }));
    var hp = numInput(null, { min: 0 }), mp = numInput(null, { min: 0 }), san = numInput(null, { min: 0 }), sanMax = numInput(null, { min: 0 });
    var body = el("div", null, [
      el("div", { class: "grid3" }, [field("名前", name), field("版", ed), field("役割", role)]),
      el("h3", { class: "sub-title", text: "能力値（空欄は不明として扱います）" }), grid,
      el("div", { class: "grid4" }, [field("HP", hp), field("MP", mp), field("SAN", san), field("SAN最大", sanMax)])
    ]);
    openDialog("手入力で追加", body, [{ label: "やめる", value: "cancel" }, { label: "追加", value: "ok" }], function () {
      if (!name.value.trim()) return "名前を入れてください。";
      return null;
    }).then(function (v) {
      if (v !== "ok") return;
      var abilities = {};
      C.ABILITY_KEYS.forEach(function (k) { abilities[k] = C.toNum(ab[k].value); });
      function st(a, b) { var x = C.toNum(a.value); var y = b ? C.toNum(b.value) : null; return x === null ? null : { value: x, max: y === null ? x : y }; }
      var built = { meta: { service: "manual", edition: ed.value, editionSource: "manual", name: name.value.trim() }, abilities: abilities, derived: { HP: st(hp), MP: st(mp), SAN: st(san, sanMax), DB: null }, skills: [] };
      var c = characterFromBuilt(built, "", ed.value);
      state.characters[c.id] = c;
      T().participants.push(participantFor(c, role.value));
      touch(); renderAll();
      toast("「" + c.name + "」を追加しました。");
    });
  }

  function openParticipantSettings(p) {
    var c = charOf(p);
    var name = el("input", { type: "text", value: c.name });
    var ruby = el("input", { type: "text", value: c.ruby || "" });
    var pl = el("input", { type: "text", value: p.pl || "" });
    var ho = el("input", { type: "text", value: p.ho || "" });
    var role = el("select", null, Object.keys(ROLE_LABELS).map(function (r) { return el("option", { value: r, text: ROLE_LABELS[r], selected: p.role === r }); }));
    var ed = el("select", null, ["6e", "7e", "unknown"].map(function (e) { return el("option", { value: e, text: EDITION_LABELS[e], selected: c.edition === e }); }));
    var color = el("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#888888" });
    var url = el("input", { type: "url", value: c.sourceUrl || "", placeholder: "https://" });
    var visible = el("input", { type: "checkbox", checked: p.visible !== false });
    var maxHp = numInput(p.max.hp, { min: 0 }), maxMp = numInput(p.max.mp, { min: 0 }), maxSan = numInput(p.max.san, { min: 0, max: 99 });
    var ab = {};
    var abGrid = el("div", { class: "grid4" }, C.ABILITY_KEYS.map(function (k) { ab[k] = numInput(c.abilities ? c.abilities[k] : null, { min: 0 }); return field(k, ab[k]); }));
    var reText = el("textarea", { rows: 3, placeholder: "新しい駒JSON / 保管所テキストを貼ると再取込します" });
    var keep = el("input", { type: "checkbox", checked: true });
    var usedIn = state.tables.filter(function (t) { return t.participants.some(function (x) { return x.characterId === c.id; }); }).length;

    var body = el("div", null, [
      el("div", { class: "grid3" }, [field("名前", name), field("ふりがな", ruby), field("版", ed)]),
      el("div", { class: "grid3" }, [field("PL名", pl), field("HO", ho), field("役割", role)]),
      el("div", { class: "grid3" }, [field("色", color), field("キャラシURL", url), el("label", { class: "check" }, [visible, " カードを表示"])]),
      el("h3", { class: "sub-title", text: "この卓での最大値" }),
      el("div", { class: "grid3" }, [field("HP最大", maxHp), field("MP最大", maxMp), field("SAN最大", maxSan)]),
      el("h3", { class: "sub-title", text: "能力値（シートの値）" }), abGrid,
      usedIn > 1 ? el("p", { class: "hint", text: "名前・版・能力値は、このキャラを入れている他の卓（" + (usedIn - 1) + "卓）にも反映されます。HP/SAN等の現在値は卓ごとです。" }) : null,
      el("details", { class: "inner" }, [
        el("summary", { text: "再取込" }), reText,
        el("label", { class: "check" }, [keep, " 卓内の現在値（HP・MP・SAN・幸運・基準SAN）を保持する"])
      ])
    ]);
    openDialog(displayName(p) + " の設定", body, [
      { label: "卓から外す", value: "remove", kind: "danger-btn" },
      { label: "やめる", value: "cancel" },
      { label: "保存", value: "ok" }
    ], function (v) {
      if (v === "ok" && url.value && !/^https:\/\//.test(url.value.trim())) return "URLは https:// で始まるものだけ使えます。";
      return null;
    }).then(function (v) {
      if (v === "remove") {
        confirmDialog("卓から外す", "「" + displayName(p) + "」をこの卓から外します。変動ログは残ります。キャラクターの原本は他の卓で使っていなければ消えます。", "外す", true).then(function (ok) {
          if (!ok) return;
          var t = T();
          t.participants = t.participants.filter(function (x) { return x !== p; });
          var stillUsed = state.tables.some(function (tb) { return tb.participants.some(function (x) { return x.characterId === c.id; }); });
          if (!stillUsed) delete state.characters[c.id];
          touch(); renderAll();
        });
        return;
      }
      if (v !== "ok") return;
      c.name = name.value.trim() || c.name;
      c.ruby = ruby.value.trim();
      if (c.edition !== ed.value) { c.edition = ed.value; c.editionSource = "manual"; }
      c.sourceUrl = url.value.trim();
      C.ABILITY_KEYS.forEach(function (k) { c.abilities[k] = C.toNum(ab[k].value); });
      c.luck = C.resolveLuck(c);
      c.updatedAt = Store.nowIso();
      p.pl = pl.value.trim(); p.ho = ho.value.trim(); p.role = role.value; p.color = color.value; p.visible = visible.checked;
      p.max = { hp: C.toNum(maxHp.value), mp: C.toNum(maxMp.value), san: C.toNum(maxSan.value) };
      if (reText.value.trim()) {
        try {
          var b = Schema.buildCharacter(reText.value.trim());
          var fresh = characterFromBuilt(b, reText.value.trim(), b.meta.edition === "unknown" ? c.edition : b.meta.edition);
          fresh.name = fresh.name || c.name;
          reimportInto(p, c, fresh, keep.checked);
          toast("再取込しました" + (keep.checked ? "（現在値は保持）" : ""));
        } catch (e) { toast("再取込できませんでした：" + e.message, "error"); }
      }
      touch(); renderAll();
    });
  }

  /* ---------- 比較表 ---------- */

  function renderAbility() {
    var wrap = clear($("abilityWrap"));
    var ps = visibleParticipants();
    if (!ps.length) { wrap.appendChild(el("p", { class: "muted", text: "探索者を登録すると表示されます。" })); return; }
    var entries = ps.map(function (p) {
      var c = charOf(p);
      return { edition: c.edition, abilities: c.abilities, hp: p.state.hp, mp: p.state.mp, sanCur: p.state.san, sanMax: p.max.san, luck: p.state.luck, luckDerived: c.luck && c.luck.derived, db: c.derived && c.derived.DB };
    });
    var tb = C.buildAbilityTable(entries);
    var head = el("tr", null, [el("th", { class: "rowhead", scope: "col" })].concat(tb.columns.map(function (col) {
      return el("th", { scope: "col", class: "c-" + col.key }, [col.label, col.sub ? el("small", { text: col.sub }) : null]);
    })));
    var body = tb.rows.map(function (r, i) {
      var p = ps[i];
      return el("tr", null, [el("th", { scope: "row", class: "rowhead" }, [el("span", { class: "dot", style: "background:" + p.color }), displayName(p)])].concat(tb.columns.map(function (col) {
        var cell = r.cells[col.key];
        return el("td", { class: "c-" + col.key + (cell.star ? " star" : "") }, [
          el("span", { class: "v", text: cell.text }), cell.star ? el("span", { class: "st", "aria-label": "最大", text: "★" }) : null,
          cell.sub ? el("small", { text: cell.sub }) : null
        ]);
      })));
    });
    wrap.appendChild(el("table", { class: "grid-table ability" }, [el("thead", null, [head]), el("tbody", null, body)]));
  }

  function skillOpts() {
    var s = T().ui.skill;
    return { fill: s.fill, rare: s.rare, filter: s.filter, sort: s.sort, query: s.query, category: s.category, tag: s.tag, threshold: C.toNum(s.threshold), starIncludesFilled: s.starFilled };
  }

  function renderChips() {
    var s = T().ui.skill;
    var cat = clear($("categoryChips"));
    C.CATEGORY_ORDER.forEach(function (k) {
      cat.appendChild(el("button", { type: "button", class: "chip", "aria-pressed": String(s.category === k), text: C.CATEGORY_LABELS[k], onclick: function () { s.category = s.category === k ? "" : k; touch(); renderChips(); renderSkills(); } }));
    });
    var tags = clear($("tagChips"));
    Object.keys(C.SKILL_TAGS).forEach(function (k) {
      tags.appendChild(el("button", { type: "button", class: "chip", "aria-pressed": String(s.tag === k), text: k, onclick: function () { s.tag = s.tag === k ? "" : k; touch(); renderChips(); renderSkills(); } }));
    });
    if (s.tag || s.category) tags.appendChild(el("button", { type: "button", class: "chip clear", text: "解除", onclick: function () { s.tag = ""; s.category = ""; touch(); renderChips(); renderSkills(); } }));
  }

  function renderSkills() {
    var wrap = clear($("skillWrap"));
    var ps = visibleParticipants();
    if (!ps.length) return;
    var chars = ps.map(function (p) { var c = charOf(p); return { id: p.id, edition: c.edition, abilities: c.abilities, skills: c.skills }; });
    var opts = skillOpts();
    var table = C.buildSkillTable(chars, TABLES, opts);
    var pinned = T().ui.pinned || [];
    var pinnedRows = [];
    if (pinned.length) {
      var all = C.buildSkillTable(chars, TABLES, Object.assign({}, opts, { filter: "all", query: "", category: "", tag: "", rare: true }));
      pinnedRows = all.rows.filter(function (r) { return pinned.indexOf(r.key) >= 0; });
    }
    var rows = table.rows.filter(function (r) { return pinned.indexOf(r.key) < 0; });

    var head = el("tr", null, [el("th", { class: "rowhead", scope: "col", text: "技能" })].concat(ps.map(function (p) {
      return el("th", { scope: "col", class: "pc-col", style: "--pc:" + p.color }, [el("span", { class: "dot", style: "background:" + p.color }), displayName(p, "short")]);
    })));
    var body = [];
    function group(label) { body.push(el("tr", { class: "group" }, [el("th", { colspan: String(ps.length + 1), scope: "colgroup", text: label })])); }
    function rowEl(r, isPinned) {
      var label = el("th", { scope: "row", class: "rowhead skill-name" + (isPinned ? " pinned" : "") }, [
        el("button", { type: "button", class: "link-btn", "aria-pressed": String(!!isPinned), title: "行を固定 / 解除", text: r.key, onclick: function () { togglePin(r.key); } }),
        r.note ? el("small", { text: r.note }) : null
      ]);
      return el("tr", { class: isPinned ? "pinned" : "" }, [label].concat(ps.map(function (p, i) {
        var cell = r.cells[p.id];
        var cls = "cell " + (cell.state || "") + (cell.star ? " star" : "") + (cell.high ? " high" : "");
        if (cell.hidden) return el("td", { class: "cell hidden-cell" });
        if (cell.state === "na" || cell.state === "unknown") return el("td", { class: cls, title: cell.state === "na" ? "この版には無い技能" : "算出できません" , text: cell.text });
        var c = charOf(p);
        var native = c.edition === "6e" && r.note ? r.note.replace(/^6版：/, "") : r.key;
        return el("td", { class: cls }, [el("button", {
          type: "button", class: "cell-btn",
          title: (cell.filled ? "初期値で補完 / " : "") + "クリックで判定コマンドをコピー",
          "aria-label": displayName(p) + " " + r.key + " " + cell.text + (cell.filled ? "（補完）" : ""),
          onclick: function () { copyText(C.rollCommand(c.edition, cell.value, native), "コピー：" + C.rollCommand(c.edition, cell.value, native)); }
        }, [cell.text, cell.star ? el("span", { class: "st", text: "★" }) : null])]);
      })));
    }
    if (pinnedRows.length) { group("固定した技能"); pinnedRows.forEach(function (r) { body.push(rowEl(r, true)); }); }
    var lastCat = null;
    rows.forEach(function (r) {
      if (opts.tag) { if (lastCat !== opts.tag) { group(opts.tag); lastCat = opts.tag; } }
      else if (opts.sort === "category" && r.category !== lastCat) { group(C.CATEGORY_LABELS[r.category] || "その他"); lastCat = r.category; }
      body.push(rowEl(r, false));
    });
    if (!rows.length && !pinnedRows.length) body.push(el("tr", null, [el("td", { colspan: String(ps.length + 1), class: "muted", text: "条件に合う技能がありません。" })]));
    wrap.appendChild(el("table", { class: "grid-table skills" }, [el("thead", null, [head]), el("tbody", null, body)]));
  }

  function togglePin(key) {
    var ui = T().ui;
    ui.pinned = ui.pinned || [];
    var i = ui.pinned.indexOf(key);
    if (i >= 0) ui.pinned.splice(i, 1); else ui.pinned.push(key);
    touch(); renderSkills();
  }

  function bindSkillControls() {
    function bind(id, key, kind) {
      var node = $(id);
      node.addEventListener(kind === "text" ? "input" : "change", function () {
        var s = T().ui.skill;
        s[key] = node.type === "checkbox" ? node.checked : node.value;
        touch(); renderSkills();
      });
    }
    bind("skillQuery", "query", "text");
    bind("skillFilter", "filter");
    bind("skillSort", "sort");
    bind("skillFill", "fill");
    bind("skillRare", "rare");
    bind("skillStarFilled", "starFilled");
    bind("skillThreshold", "threshold", "text");
  }

  function syncSkillControls() {
    var s = T().ui.skill;
    $("skillQuery").value = s.query || "";
    $("skillFilter").value = s.filter;
    $("skillSort").value = s.sort;
    $("skillFill").checked = !!s.fill;
    $("skillRare").checked = !!s.rare;
    $("skillStarFilled").checked = s.starFilled !== false;
    $("skillThreshold").value = s.threshold;
  }

  /* ---------- チェックリスト ---------- */

  function addChecklist(lines, forceHeading) {
    if (isArchived()) return;
    var items = T().checklist.items;
    var n = 0;
    lines.forEach(function (line) {
      var parsed = forceHeading ? (line.trim() ? { kind: "heading", text: line.trim() } : null) : C.parseChecklistLine(line);
      if (!parsed) return;
      items.push(Object.assign({ id: C.uid("ck"), value: parsed.kind === "choice" ? "" : false, byChar: {} }, parsed));
      n++;
    });
    if (n) { touch(); renderChecklist(); }
    return n;
  }

  function renderChecklist() {
    var cl = T().checklist;
    var ps = visibleParticipants();
    var perChar = cl.perChar && ps.length > 0;
    $("checkPerChar").checked = !!cl.perChar;
    $("checkOpenOnly").checked = !!cl.openOnly;
    var prog = C.checklistProgress(cl.items, perChar, ps.map(function (p) { return p.id; }));
    $("checkCount").textContent = prog.total ? prog.done + "/" + prog.total : "";
    $("navCheck").textContent = "チェック " + prog.done + "/" + prog.total;
    var box = clear($("checkList"));
    if (!cl.items.length) { box.appendChild(el("p", { class: "empty muted", text: "項目がありません。上の欄から追加してください。" })); return; }
    var list = el("ul", { class: "check-list" });
    cl.items.forEach(function (it, idx) {
      var done = it.kind === "heading" ? false : perChar
        ? ps.every(function (p) { var v = it.byChar[p.id]; return it.kind === "choice" ? !!v : v === true; })
        : (it.kind === "choice" ? !!it.value : it.value === true);
      if (cl.openOnly && done) return;
      var tools = el("span", { class: "item-tools" }, [
        el("button", { type: "button", class: "icon-btn", text: "↑", "aria-label": "上へ", disabled: idx === 0, onclick: function () { moveItem(idx, -1); } }),
        el("button", { type: "button", class: "icon-btn", text: "↓", "aria-label": "下へ", disabled: idx === cl.items.length - 1, onclick: function () { moveItem(idx, 1); } }),
        el("button", { type: "button", class: "icon-btn", text: "×", "aria-label": "削除", onclick: function () { cl.items.splice(idx, 1); touch(); renderChecklist(); } })
      ]);
      if (it.kind === "heading") { list.appendChild(el("li", { class: "heading" }, [el("span", { text: it.text }), tools])); return; }
      var controls;
      function control(get, set, who) {
        if (it.kind === "choice") {
          var sel = el("select", { "aria-label": it.text + (who ? "（" + who + "）" : "") }, [el("option", { value: "", text: "—" })].concat(it.options.map(function (o) { return el("option", { value: o, text: o, selected: get() === o }); })));
          sel.addEventListener("change", function () { set(sel.value); touch(); renderChecklist(); });
          return sel;
        }
        var cb = el("input", { type: "checkbox", checked: get() === true, "aria-label": it.text + (who ? "（" + who + "）" : "") });
        cb.addEventListener("change", function () { set(cb.checked); touch(); renderChecklist(); });
        return cb;
      }
      if (perChar) {
        controls = el("span", { class: "per-char" }, ps.map(function (p) {
          return el("label", { class: "pc-check", style: "--pc:" + p.color, title: displayName(p) }, [
            control(function () { return it.byChar[p.id]; }, function (v) { it.byChar[p.id] = v; }, displayName(p)),
            el("span", { class: "dot", style: "background:" + p.color })
          ]);
        }));
      } else {
        controls = control(function () { return it.value; }, function (v) { it.value = v; });
      }
      list.appendChild(el("li", { class: done ? "done" : "" }, [
        it.kind === "choice" ? el("span", { class: "item-text", text: it.text }) : null,
        it.kind === "check" && !perChar ? el("label", { class: "check grow" }, [controls, el("span", { class: "item-text", text: it.text })]) : null,
        it.kind === "check" && perChar ? el("span", { class: "item-text", text: it.text }) : null,
        it.kind === "choice" || perChar ? controls : null,
        tools
      ]));
    });
    box.appendChild(list);
  }

  function moveItem(i, d) {
    var items = T().checklist.items;
    var j = i + d;
    if (j < 0 || j >= items.length) return;
    var tmp = items[i]; items[i] = items[j]; items[j] = tmp;
    touch(); renderChecklist();
  }

  function setAllChecks(value) {
    var cl = T().checklist;
    var ps = visibleParticipants();
    cl.items.forEach(function (it) {
      if (it.kind !== "check") return;
      if (cl.perChar) ps.forEach(function (p) { it.byChar[p.id] = value; });
      else it.value = value;
    });
    touch(); renderChecklist();
  }

  /* ---------- choice ---------- */

  function renderChoice() {
    var ch = T().choice;
    ch.excluded = ch.excluded || [];
    var ps = visibleParticipants();
    var chips = clear($("choiceChips"));
    ps.forEach(function (p) {
      var on = ch.excluded.indexOf(p.id) < 0;
      chips.appendChild(el("button", { type: "button", class: "chip", "aria-pressed": String(on), onclick: function () {
        var i = ch.excluded.indexOf(p.id);
        if (i >= 0) ch.excluded.splice(i, 1); else ch.excluded.push(p.id);
        touch(); renderChoice();
      } }, [el("span", { class: "dot", style: "background:" + p.color }), displayName(p, ch.nameMode)]));
    });
    if (!ps.length) chips.appendChild(el("span", { class: "muted", text: "探索者を登録すると候補になります。" }));
    $("choiceCount").value = ch.count;
    $("choiceSecret").checked = !!ch.secret;
    $("choiceComment").value = ch.comment || "";
    $("choiceNameMode").value = ch.nameMode || "name";
    var names = ps.filter(function (p) { return ch.excluded.indexOf(p.id) < 0; }).map(function (p) { return displayName(p, ch.nameMode); });
    var r = C.choiceCommand(names, ch.count, ch.secret, ch.comment);
    $("choiceOut").textContent = r.ok ? r.command : r.error;
    $("choiceOut").classList.toggle("error", !r.ok);
    $("choiceCopy").disabled = !r.ok;
    $("choiceNote").textContent = (Number(ch.count) > 1 || ch.secret)
      ? "選ぶ数2以上（choice2[…]）とシークレット（先頭のS）はBCDiceの書式です。ココフォリアでの動作はまだ実機で確かめていません。"
      : "";
  }

  function bindChoice() {
    function upd(fn) { return function () { fn(T().choice); touch(); renderChoice(); }; }
    $("choiceCount").addEventListener("input", upd(function (ch) { ch.count = Number($("choiceCount").value) || 1; }));
    $("choiceSecret").addEventListener("change", upd(function (ch) { ch.secret = $("choiceSecret").checked; }));
    $("choiceNameMode").addEventListener("change", upd(function (ch) { ch.nameMode = $("choiceNameMode").value; }));
    $("choiceComment").addEventListener("change", upd(function (ch) { ch.comment = $("choiceComment").value; }));
    $("choiceComment").addEventListener("input", function () {
      var ch = T().choice; ch.comment = $("choiceComment").value;
      var ps = visibleParticipants().filter(function (p) { return (ch.excluded || []).indexOf(p.id) < 0; });
      var r = C.choiceCommand(ps.map(function (p) { return displayName(p, ch.nameMode); }), ch.count, ch.secret, ch.comment);
      $("choiceOut").textContent = r.ok ? r.command : r.error;
      Store.save();
    });
    $("choiceCopy").addEventListener("click", function () { copyText($("choiceOut").textContent); });
  }

  /* ---------- ダイス表 ---------- */

  function currentDice() {
    var d = T().dice;
    return d.tables.find(function (x) { return x.id === d.current; }) || null;
  }

  function renderDice() {
    var d = T().dice;
    if (!d.tables.length) { d.tables.push({ id: C.uid("dt"), name: "", text: "" }); d.current = d.tables[0].id; }
    if (!currentDice()) d.current = d.tables[0].id;
    var tabs = clear($("diceTabs"));
    d.tables.forEach(function (tb) {
      var n = C.parseDiceTableLines(tb.text).length;
      tabs.appendChild(el("button", { type: "button", class: "chip", "aria-pressed": String(tb.id === d.current), onclick: function () { d.current = tb.id; touch(); renderDice(); } }, [(tb.name || "名称未設定") + " ", el("b", { text: String(n) })]));
    });
    tabs.appendChild(el("button", { type: "button", class: "chip", text: "＋ 新しい表", onclick: function () {
      var nt = { id: C.uid("dt"), name: "", text: "" }; d.tables.push(nt); d.current = nt.id; touch(); renderDice(); $("diceName").focus();
    } }));
    var cur = currentDice();
    if (document.activeElement !== $("diceName")) $("diceName").value = cur.name;
    if (document.activeElement !== $("diceItems")) $("diceItems").value = cur.text;
    updateDiceOut();
  }

  function updateDiceOut() {
    var cur = currentDice();
    var items = C.parseDiceTableLines(cur.text);
    var out = C.diceTableText(cur.name, items);
    $("diceOut").textContent = out || "（結果を入力すると、ここにダイス表が表示されます）";
    $("diceOut").classList.toggle("muted", !out);
    $("diceCopy").disabled = !out;
    var r = C.choiceCommand(items, 1, false, cur.name);
    $("diceChoiceCopy").disabled = !items.length || !r.ok;
    $("diceChoiceCopy").title = r.ok ? r.command : (items.length ? r.error : "");
  }

  function bindDice() {
    $("diceName").addEventListener("input", function () { currentDice().name = $("diceName").value; Store.save(); updateDiceOut(); });
    $("diceName").addEventListener("change", function () { touch(); renderDice(); });
    $("diceItems").addEventListener("input", function () { currentDice().text = $("diceItems").value; Store.save(); updateDiceOut(); });
    $("diceItems").addEventListener("change", function () { touch(); renderDice(); });
    $("diceCopy").addEventListener("click", function () { copyText($("diceOut").textContent); });
    $("diceChoiceCopy").addEventListener("click", function () {
      var cur = currentDice();
      var r = C.choiceCommand(C.parseDiceTableLines(cur.text), 1, false, cur.name);
      if (r.ok) copyText(r.command); else toast(r.error, "error");
    });
    $("diceDelete").addEventListener("click", function () {
      var cur = currentDice();
      confirmDialog("表を削除", "「" + (cur.name || "名称未設定") + "」を削除します。", "削除", true).then(function (ok) {
        if (!ok) return;
        var d = T().dice;
        d.tables = d.tables.filter(function (x) { return x !== cur; });
        d.current = d.tables.length ? d.tables[0].id : null;
        touch(); renderDice();
      });
    });
    $("diceExport").addEventListener("click", function () {
      var data = { format: "trpg-dice-tables.v1", exportedAt: Store.nowIso(), tables: T().dice.tables.map(function (x) { return { name: x.name, items: C.parseDiceTableLines(x.text) }; }) };
      download("dice-tables.json", JSON.stringify(data, null, 2));
    });
    $("diceImport").addEventListener("click", function () {
      pickJsonFile().then(function (text) {
        if (!text) return;
        try {
          var data = JSON.parse(text);
          var list = Array.isArray(data) ? data : data.tables;
          if (!Array.isArray(list)) throw new Error("tables がありません");
          var n = 0;
          list.forEach(function (x) {
            if (!x || typeof x !== "object") return;
            var items = Array.isArray(x.items) ? x.items.map(String) : C.parseDiceTableLines(x.text);
            T().dice.tables.push({ id: C.uid("dt"), name: String(x.name || ""), text: items.join("\n") });
            n++;
          });
          touch(); renderDice();
          toast(n + "個の表を読み込みました。");
        } catch (e) { toast("読み込めませんでした：" + e.message, "error"); }
      });
    });
  }

  /* ---------- 卓報告・ログ ---------- */

  function reportOpts() {
    var t = T();
    var r = t.report;
    var pcs = visibleParticipants().filter(function (p) { return p.role === "PC"; }).map(function (p) {
      var c = charOf(p);
      return { name: c.name, pl: p.pl, ho: p.ho, edition: c.edition };
    });
    return { scenario: r.scenario, kp: r.kp || t.kp, edition: r.edition, date: r.date, participants: pcs };
  }

  function renderReport() {
    var r = T().report;
    if (document.activeElement !== $("repScenario")) $("repScenario").value = r.scenario || "";
    if (document.activeElement !== $("repKp")) $("repKp").value = r.kp || T().kp || "";
    $("repEdition").value = r.edition || "auto";
    $("repDate").value = r.date || "";
    if (document.activeElement !== $("repOut")) $("repOut").value = C.reportText(reportOpts());
  }

  function bindReport() {
    [["repScenario", "scenario"], ["repKp", "kp"], ["repEdition", "edition"], ["repDate", "date"]].forEach(function (pair) {
      $(pair[0]).addEventListener("input", function () { T().report[pair[1]] = $(pair[0]).value; Store.save(); $("repOut").value = C.reportText(reportOpts()); });
    });
    $("repCopy").addEventListener("click", function () { copyText($("repOut").value); });
    $("repSend").addEventListener("click", function () {
      var opts = reportOpts();
      var existing = null;
      try { existing = localStorage.getItem(REPORT_PENDING_IMPORT_KEY); } catch (e) { existing = null; }
      var msg = "卓報告ジェネレーターに、シナリオ名・版・KP・PC名・PL名・日付を渡して開きます。HO・SAN・メモは渡しません。" + (existing ? "\n\nまだ取り込まれていない卓報告データがあるため、上書きします。" : "");
      confirmDialog("卓報告ジェネレーターへ送る", msg, "送って開く").then(function (ok) {
        if (!ok) return;
        var payload = C.reportPendingImport(opts, Store.nowIso());
        try { localStorage.setItem(REPORT_PENDING_IMPORT_KEY, JSON.stringify(payload)); }
        catch (e) { toast("ブラウザに書き込めませんでした。テキストをコピーして使ってください。", "error"); return; }
        window.open("../session-report-generator/", "_blank", "noopener");
      });
    });

    $("logFile").addEventListener("change", function () {
      var f = $("logFile").files && $("logFile").files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast("ログが大きすぎます（8MBまで）。", "error"); return; }
      f.text().then(function (text) { $("logText").value = text; toast("「" + f.name + "」を読み込みました（" + Math.round(f.size / 1024) + "KB）。"); });
    });
    function send(target, url) {
      var text = $("logText").value;
      if (!text.trim()) { toast("ログを貼り付けるか、ファイルを読み込んでください。", "warn"); return; }
      var payload = C.sessionLogTransfer({ target: target, sessionName: T().report.scenario || T().name, text: text }, Store.nowIso());
      try { localStorage.setItem(SESSION_LOG_TRANSFER_KEY, JSON.stringify(payload)); }
      catch (e) { toast("ログが大きくてブラウザに一時保存できませんでした。相手のツールに直接貼り付けてください。", "error"); return; }
      window.open(url + "?import=session-log&from=coc-gm-session-monitor&transfer=localStorage", "_blank", "noopener");
    }
    $("sendGrowth").addEventListener("click", function () { send("coc-growth-checker", "../coc-growth-checker/"); });
    $("sendDice").addEventListener("click", function () { send("dice-stat-analyst", "../dice-stat-analyst/"); });
  }

  /* ---------- 卓メニュー ---------- */

  function renderTableSelect() {
    var sel = clear($("tableSelect"));
    var active = state.tables.filter(function (t) { return t.status !== "archived"; });
    var archived = state.tables.filter(function (t) { return t.status === "archived"; });
    function opt(t) { return el("option", { value: t.id, text: t.name + "（" + t.participants.length + "人）", selected: t.id === state.currentTableId }); }
    active.forEach(function (t) { sel.appendChild(opt(t)); });
    if (archived.length) sel.appendChild(el("optgroup", { label: "アーカイブ" }, archived.map(opt)));
    $("archivedBanner").hidden = !isArchived();
    $("workspaceFields").disabled = isArchived();
  }

  function tableSettingsDialog(t, title) {
    var name = el("input", { type: "text", value: t.name, required: true });
    var kp = el("input", { type: "text", value: t.kp || "" });
    var slots = numInput(t.slots, { min: 0, max: 99 });
    return openDialog(title, el("div", { class: "grid3" }, [field("卓名", name), field("KP名", kp), field("予定人数", slots)]),
      [{ label: "やめる", value: "cancel" }, { label: "保存", value: "ok" }],
      function () { return name.value.trim() ? null : "卓名を入れてください。"; }
    ).then(function (v) {
      if (v !== "ok") return false;
      t.name = name.value.trim(); t.kp = kp.value.trim(); t.slots = C.toNum(slots.value) || 0;
      return true;
    });
  }

  function onMenu(action) {
    var t = T();
    if (action === "new-table") {
      var nt = Store.newTable("新しい卓");
      tableSettingsDialog(nt, "新しい卓").then(function (ok) {
        if (!ok) return;
        state.tables.push(nt); state.currentTableId = nt.id; Store.save(true); renderAll();
      });
    } else if (action === "edit-table") {
      tableSettingsDialog(t, "卓の設定").then(function (ok) { if (ok) { touch(); renderAll(); } });
    } else if (action === "dup-table") {
      var copy = JSON.parse(JSON.stringify(t));
      copy.id = C.uid("gm-table"); copy.name = t.name + "（複製）"; copy.status = "active"; copy.events = [];
      copy.createdAt = copy.updatedAt = Store.nowIso();
      copy.participants.forEach(function (p) { p.id = C.uid("pt"); });
      copy.choice.excluded = []; copy.checklist.items.forEach(function (it) { it.byChar = {}; });
      state.tables.push(copy); state.currentTableId = copy.id; Store.save(true); renderAll();
      toast("卓を複製しました（変動ログは引き継ぎません）。");
    } else if (action === "archive-table") {
      t.status = t.status === "archived" ? "active" : "archived";
      touch(); renderAll();
      toast(t.status === "archived" ? "アーカイブしました（読み取りのみ）。" : "復元しました。");
    } else if (action === "delete-table") {
      confirmDialog("卓を削除", "「" + t.name + "」を削除します。元に戻せません。必要ならバックアップを保存してから削除してください。", "削除する", true).then(function (ok) {
        if (!ok) return;
        state.tables = state.tables.filter(function (x) { return x !== t; });
        var used = {};
        state.tables.forEach(function (tb) { tb.participants.forEach(function (p) { used[p.characterId] = true; }); });
        Object.keys(state.characters).forEach(function (id) { if (!used[id]) delete state.characters[id]; });
        if (!state.tables.length) { var f = Store.newTable("最初の卓"); state.tables.push(f); }
        state.currentTableId = state.tables[0].id;
        Store.save(true); renderAll();
      });
    } else if (action === "reset-all") {
      confirmDialog("全データを消去", "すべての卓・キャラクター・チェックリスト・ダイス表を消去します。元に戻せません。", "続ける", true).then(function (ok) {
        if (!ok) return;
        return confirmDialog("本当に消去しますか？", "最後の確認です。消去したデータは復元できません。", "すべて消去", true).then(function (ok2) {
          if (!ok2) return;
          Store.clearAll(); state = Store.get(); renderAll(); toast("消去しました。");
        });
      });
    } else if (action === "export") {
      var d = new Date();
      var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      download("coc-gm-session-monitor-" + stamp + ".json", Store.exportJson());
      toast("バックアップを保存しました（探索者名・PL名・HOを含む平文のJSONです）。");
    } else if (action === "import") {
      pickJsonFile().then(function (text) {
        if (!text) return;
        var parsed;
        try { parsed = Store.parseBackup(text); } catch (e) { toast("復元できません：" + e.message, "error"); return; }
        var s = parsed.summary;
        confirmDialog("バックアップから復元", "卓 " + s.tables + "件・キャラクター " + s.characters + "件" + (s.exportedAt ? "（" + new Date(s.exportedAt).toLocaleString("ja-JP") + " 保存）" : "") + "。いまのデータはすべて置き換わります。先に現在のバックアップを保存しておくと安全です。", "置き換える", true).then(function (ok) {
          if (!ok) return;
          Store.replaceState(parsed.state); state = Store.get(); renderAll(); toast("復元しました。");
        });
      });
    }
  }

  function bindMenu() {
    var btn = $("tableMenuBtn"), menu = $("tableMenu");
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute("aria-expanded", String(!menu.hidden));
      if (!menu.hidden) menu.querySelector("button").focus();
    });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-action]");
      if (!b) return;
      close(); onMenu(b.getAttribute("data-action"));
    });
    menu.addEventListener("keydown", function (e) { if (e.key === "Escape") { close(); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!menu.hidden && !menu.contains(e.target)) close(); });
    $("tableSelect").addEventListener("change", function () {
      Store.flush();
      state.currentTableId = $("tableSelect").value;
      Store.save(true); renderAll();
    });
  }

  function displayDialog() {
    var t = T();
    var boxes = {};
    var body = el("div", null, [el("p", { class: "hint", text: "カードに出す項目" })].concat(["hp", "mp", "san", "luck"].map(function (f) {
      boxes[f] = el("input", { type: "checkbox", checked: !!t.display[f] });
      return el("label", { class: "check" }, [boxes[f], " " + STAT_LABELS[f]]);
    })));
    openDialog("表示項目", body, [{ label: "やめる", value: "cancel" }, { label: "保存", value: "ok" }]).then(function (v) {
      if (v !== "ok") return;
      Object.keys(boxes).forEach(function (f) { t.display[f] = boxes[f].checked; });
      touch(); renderCards();
    });
  }

  function rulesDialog() {
    var t = T();
    var r = C.rulesOf(t.rules);
    var sanDiv = numInput(r.sanDivisor, { min: 1, step: 1 });
    var temp = numInput(r.tempInsanity, { min: 1, step: 1 });
    var mp6 = numInput(r.mp6Divisor, { min: 1, step: 1 });
    var mp7 = numInput(r.mp7PerHour, { min: 0, step: 0.1 });
    var discard = el("input", { type: "checkbox", checked: !!r.discardFractionAtFull });
    var body = el("div", null, [
      el("p", { class: "hint", text: "警告と回復の目安です。狂気やINT判定などを自動で確定することはありません。卓のハウスルールに合わせて変えてください（この卓だけに効きます）。" }),
      el("div", { class: "grid2" }, [
        field("不定の狂気ライン：基準SANの 1/", sanDiv, "既定 5"),
        field("一時的狂気の目安：1回の減少", temp, "以上で警告（既定 5）"),
        field("6版MP回復：1時間あたり POW ÷", mp6, "既定 24（1日でPOW分）"),
        field("7版MP回復：1時間あたり", mp7, "既定 1")
      ]),
      el("label", { class: "check" }, [discard, " MPが最大に達したら端数を捨てる"]),
      el("p", { class: "hint", text: "基準SANの期間の目安：6版はゲーム内1時間、7版はゲーム内1日。時間経過の「基準SANも更新」や各カードの「更新」で基準を付け替えます。" })
    ]);
    openDialog("ルール設定", body, [{ label: "既定に戻す", value: "reset" }, { label: "やめる", value: "cancel" }, { label: "保存", value: "ok" }]).then(function (v) {
      if (v === "reset") { t.rules = Object.assign({}, C.DEFAULT_RULES); touch(); renderAll(); return; }
      if (v !== "ok") return;
      t.rules = {
        sanDivisor: C.toNum(sanDiv.value) || 5, tempInsanity: C.toNum(temp.value) || 5,
        mp6Divisor: C.toNum(mp6.value) || 24, mp7PerHour: C.toNum(mp7.value) === null ? 1 : C.toNum(mp7.value),
        discardFractionAtFull: discard.checked
      };
      touch(); renderAll();
    });
  }

  /* ---------- 全体 ---------- */

  function jump(id) {
    var node = $(id);
    if (!node) return;
    var d = node.querySelector("details");
    if (node.tagName !== "DETAILS" && d) d.open = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    var focusable = node.querySelector("summary, input, button");
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function renderAll() {
    renderTableSelect();
    renderCards();
    renderLog();
    syncSkillControls();
    renderAbility();
    renderChips();
    renderSkills();
    renderChecklist();
    renderChoice();
    renderDice();
    renderReport();
  }

  function init() {
    Store.on(function (kind, detail) {
      var s = $("saveState");
      if (kind === "saved") { s.textContent = "保存済み " + new Date(detail).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }); s.className = "save-state ok"; }
      else if (kind === "dirty") { s.textContent = "保存中…"; s.className = "save-state"; }
      else if (kind === "error") { s.textContent = "保存エラー"; s.className = "save-state err"; toast(detail, "error"); }
      else if (kind === "conflict") {
        s.textContent = "他のタブで更新"; s.className = "save-state err";
        if (!document.querySelector(".toast.conflict")) {
          toast("他のタブ（またはウィンドウ）でデータが更新されました。上書きを防ぐため保存を止めています。", "error conflict", { label: "再読み込み", run: function () { location.reload(); } });
        }
      }
    });
    state = Store.load();

    $("importPreviewBtn").addEventListener("click", previewImport);
    $("manualAddBtn").addEventListener("click", manualAdd);
    $("advanceBtn").addEventListener("click", advanceTime);
    $("undoBtn").addEventListener("click", undoLast);
    $("displayBtn").addEventListener("click", displayDialog);
    $("rulesBtn").addEventListener("click", rulesDialog);
    $("checkAddBtn").addEventListener("click", function () { if (addChecklist([$("checkInput").value])) $("checkInput").value = ""; $("checkInput").focus(); });
    $("checkInput").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("checkAddBtn").click(); } });
    $("checkHeadingBtn").addEventListener("click", function () { if (addChecklist([$("checkInput").value], true)) $("checkInput").value = ""; });
    $("checkBulkBtn").addEventListener("click", function () { var n = addChecklist($("checkBulk").value.split(/\r?\n/)); if (n) { $("checkBulk").value = ""; toast(n + "件追加しました。"); } });
    $("checkAllBtn").addEventListener("click", function () { setAllChecks(true); });
    $("checkNoneBtn").addEventListener("click", function () { setAllChecks(false); });
    $("checkClearBtn").addEventListener("click", function () {
      confirmDialog("チェックリストを削除", "この卓のチェック項目をすべて削除します。", "削除", true).then(function (ok) { if (ok) { T().checklist.items = []; touch(); renderChecklist(); } });
    });
    $("checkPerChar").addEventListener("change", function () { T().checklist.perChar = $("checkPerChar").checked; touch(); renderChecklist(); });
    $("checkOpenOnly").addEventListener("change", function () { T().checklist.openOnly = $("checkOpenOnly").checked; touch(); renderChecklist(); });
    document.querySelectorAll("[data-jump]").forEach(function (b) { b.addEventListener("click", function () { jump(b.getAttribute("data-jump")); }); });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !$("dialog").open) { e.preventDefault(); undoLast(); }
    });

    bindMenu();
    bindSkillControls();
    bindChoice();
    bindDice();
    bindReport();
    renderAll();
    if (!T().participants.length) $("importDetails").open = true;
  }

  init();
})();
