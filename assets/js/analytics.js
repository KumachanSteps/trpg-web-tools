/*
 * Google Analytics (GA4) — サイト共通の計測タグ
 * 測定 ID の変更はこのファイルの 1 行だけでOK。
 * 各ページは <script async src="(相対パス)/assets/js/analytics.js"></script> を <head> に置く。
 *   ルート直下: assets/js/analytics.js / 1階層下: ../assets/... / 2階層下: ../../assets/...
 */
(function () {
  "use strict";

  var GA_MEASUREMENT_ID = "G-NJD5JZML31";

  // ローカル開発時（localhost 等）は計測しない
  var host = location.hostname;
  if (!GA_MEASUREMENT_ID || host === "localhost" || host === "127.0.0.1" || host === "" || /\.local$/.test(host)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
  (document.head || document.documentElement).appendChild(s);

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);
})();
