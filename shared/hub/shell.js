/*
 * シナリオハブ 共通シェル
 * - 左のツール切り替えタブを描画する
 * - Light/Night の切り替えを保存する
 * - トースト表示
 * 使い方: <body class="hub" data-hub-tool="library"> とし、<nav id="hubRail"></nav> を置いて読み込む。
 */
(function () {
  "use strict";

  var Hub = (window.Hub = window.Hub || {});

  // ツール一覧。url はツールのフォルダ（tools/ 直下）から見た相対パス。null は準備中。
  Hub.TOOLS = [
    { id: "log", name: "卓ログトラッカー", icon: "▤", url: "../session-log-tool/index.html" },
    { id: "calendar", name: "卓準備カレンダー", icon: "▦", url: "../session-check-calendar/index.html" },
    { id: "library", name: "シナリオライブラリ", icon: "⌕", url: "../scenario-library/index.html" },
    { id: "bookshelf", name: "マイ本棚", icon: "▥", url: "../scenario-bookshelf/index.html" },
    { id: "watch", name: "配信視聴ログ", icon: "▶", url: null },
    { id: "analysis", name: "嗜好アナライザー", icon: "◔", url: null }
  ];

  var THEME_KEY = "hub-theme";

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    if (theme === "night") document.documentElement.setAttribute("data-theme", "night");
    else document.documentElement.removeAttribute("data-theme");
  }

  Hub.toggleTheme = function () {
    var next = document.documentElement.getAttribute("data-theme") === "night" ? "light" : "night";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 保存できなくても表示は切り替える */ }
  };

  Hub.escape = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  function renderRail(current) {
    var nav = document.getElementById("hubRail");
    if (!nav) return;
    nav.className = "hub-rail";
    nav.setAttribute("aria-label", "ツール切り替え");
    nav.innerHTML = Hub.TOOLS.map(function (t) {
      var style = ' style="--tab-bg: var(--tab-' + t.id + ')"';
      var inner = '<span class="hub-rail-icon" aria-hidden="true">' + t.icon + "</span>" + Hub.escape(t.name);
      if (!t.url) {
        return '<span class="hub-rail-tab is-soon" title="' + Hub.escape(t.name) + "（準備中）\"" + style + ">" + inner + "</span>";
      }
      var cur = t.id === current ? ' aria-current="page"' : "";
      return '<a class="hub-rail-tab" href="' + t.url + '"' + cur + style + ' title="' + Hub.escape(t.name) + '">' + inner + "</a>";
    }).join("");
  }

  var toastTimer = null;
  Hub.toast = function (message) {
    var el = document.getElementById("hubToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "hubToast";
      el.className = "hub-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  };

  applyTheme(readTheme());

  document.addEventListener("DOMContentLoaded", function () {
    renderRail(document.body.getAttribute("data-hub-tool"));
    var themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) themeBtn.addEventListener("click", Hub.toggleTheme);
  });
})();
