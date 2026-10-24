/*
 * scenario-core: シナリオ名の正規化と照合
 * 表記ゆれ（全角半角・カタカナ/ひらがな・【配布版】などの括弧・改訂版などの版表記）をそろえて、
 * カタログの正規タイトルと別名に当てる。タイトルが一致しただけで同一作品と断定せず、候補が複数なら「照合待ち」にする。
 */
(function () {
  "use strict";

  var Hub = (window.Hub = window.Hub || {});

  var EDITION_WORDS = /(改訂版|改定版|新装版|完全版|決定版|再録版|リメイク版|配布版|頒布版|公開版|最新版|製品版|ho配布版|体験版|第\s*\d+\s*版|ver\.?\s*\d+(\.\d+)*|v\d+(\.\d+)+)/g;
  var BRACKETS = /【[^】]*】|\[[^\]]*\]|［[^］]*］|〔[^〕]*〕|（[^）]*）|\([^)]*\)|<[^>]*>|＜[^＞]*＞/g;
  var PUNCT = /[\s・･\-‐－―~〜～_＿.,，、。:：;；!！?？'"＂“”‘’「」『』《》〈〉/／\\|｜#＃＊*+＋&＆]+/g;

  function toHiragana(s) {
    return s.replace(/[ァ-ヶ]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }

  // 照合用キー。表示には使わない。
  Hub.normalizeTitle = function (raw) {
    if (!raw) return "";
    var s = String(raw).normalize("NFKC").toLowerCase();
    s = s.replace(BRACKETS, " ");
    s = s.replace(EDITION_WORDS, " ");
    s = toHiragana(s);
    s = s.replace(PUNCT, "");
    return s;
  };

  Hub.SYSTEMS = {
    COC6: "CoC 6版",
    COC7: "CoC 7版",
    EMOKLORE: "エモクロア",
    MADAMIS: "マダミス",
    OTHER: "その他",
    UNKNOWN: "不明"
  };

  Hub.SYSTEM_SHORT = { COC6: "CoC6", COC7: "CoC7", EMOKLORE: "エモクロア", MADAMIS: "マダミス", OTHER: "その他", UNKNOWN: "不明" };

  // フォルダ名やメモからシステムを推定する。分からなければ null。
  Hub.detectSystem = function (text) {
    var s = String(text || "").normalize("NFKC").toLowerCase();
    if (/(coc|クトゥルフ|cthulhu)\s*7|新クトゥルフ|7版|7th/.test(s)) return "COC7";
    if (/(coc|クトゥルフ|cthulhu)\s*6|6版|6th/.test(s)) return "COC6";
    if (/エモクロア|emoklore|(^|[^a-z])emo([^a-z]|$)/.test(s)) return "EMOKLORE";
    if (/マダミス|マーダーミステリー|murder\s*mystery/.test(s)) return "MADAMIS";
    if (/coc|クトゥルフ/.test(s)) return null;
    return null;
  };

  // 人数ラベル（タイマン / 2PL / 3〜4PL）
  Hub.playersLabel = function (p) {
    if (!p) return "人数不明";
    if (p.label) return p.label;
    if (p.min == null && p.max == null) return "人数不明";
    if (p.min === 1 && (p.max === 1 || p.max == null)) return "タイマン";
    if (p.min === p.max || p.max == null) return p.min + "PL";
    return p.min + "〜" + p.max + "PL";
  };

  // 分 → 「4h」「3〜6h」
  Hub.durationLabel = function (d) {
    if (!d || (d.min == null && d.max == null)) return "時間不明";
    var h = function (m) { return (Math.round(m / 6) / 10).toString().replace(/\.0$/, "") + "h"; };
    if (d.max == null || d.min === d.max) return (d.approximate ? "約" : "") + h(d.min);
    if (d.min == null) return "〜" + h(d.max);
    return h(d.min).replace("h", "") + "〜" + h(d.max);
  };

  Hub.priceLabel = function (p) {
    if (!p || (p.min == null && p.max == null)) return "価格不明";
    if (p.max === 0) return "無料";
    var yen = function (n) { return "¥" + Number(n).toLocaleString("ja-JP"); };
    if (p.min === p.max || p.max == null) return yen(p.min);
    if (p.min === 0) return "無料〜" + yen(p.max);
    return yen(p.min) + "〜" + yen(p.max);
  };

  // カタログ側の照合キーを作る（タイトル＋別名）
  Hub.buildMatchIndex = function (scenarios) {
    var keys = [];
    scenarios.forEach(function (sc) {
      var seen = {};
      [sc.title].concat(sc.aliases || []).forEach(function (t) {
        var k = Hub.normalizeTitle(t);
        if (k.length >= 2 && !seen[k]) {
          seen[k] = true;
          keys.push({ key: k, scenario: sc });
        }
      });
    });
    // 長いキーから当てる（「灯台」より「霧笛の灯台」を優先）
    keys.sort(function (a, b) { return b.key.length - a.key.length; });
    return keys;
  };

  /*
   * 自由文（フォルダ名・卓ログのシナリオ欄）をカタログに照合する。
   * 返り値: { status: "matched" | "ambiguous" | "none", scenario, candidates }
   */
  Hub.matchText = function (text, index, hintSystem) {
    var norm = Hub.normalizeTitle(text);
    if (!norm) return { status: "none", scenario: null, candidates: [] };
    var exact = [];
    var contained = [];
    for (var i = 0; i < index.length; i++) {
      var k = index[i];
      if (k.key === norm) exact.push(k);
      else if (k.key.length >= 3 && norm.indexOf(k.key) >= 0) contained.push(k);
    }
    var pool = exact.length ? exact : contained;
    if (!pool.length) return { status: "none", scenario: null, candidates: [] };
    if (!exact.length) {
      // 含まれる中で最長のキーだけを候補にする
      var longest = pool[0].key.length;
      pool = pool.filter(function (k) { return k.key.length === longest; });
    }
    var uniq = [];
    pool.forEach(function (k) {
      if (uniq.indexOf(k.scenario) < 0) uniq.push(k.scenario);
    });
    if (uniq.length > 1 && hintSystem) {
      var bySys = uniq.filter(function (s) { return s.system === hintSystem; });
      if (bySys.length === 1) uniq = bySys;
    }
    if (uniq.length === 1) return { status: "matched", scenario: uniq[0], candidates: uniq };
    return { status: "ambiguous", scenario: null, candidates: uniq };
  };

  // 本棚の命名ルール。使えるトークン: {system} {pl} {writer} {circle} {title} {time}
  Hub.TEMPLATE_TOKENS = ["{system}", "{pl}", "{writer}", "{circle}", "{title}", "{time}"];

  Hub.fillTemplate = function (tpl, sc) {
    var p = sc.players || {};
    var values = {
      system: Hub.SYSTEM_SHORT[sc.system] || "不明",
      pl: p.min == null ? "?" : (p.max != null && p.max !== p.min ? p.min + "-" + p.max : String(p.min)),
      writer: String((sc.writers && sc.writers[0]) || (sc.circle && sc.circle.name) || "作者不明").replace(/^[\[［【](.*)[\]］】]$/, "$1"),
      circle: (sc.circle && sc.circle.name) || "サークル不明",
      title: sc.title,
      time: Hub.durationLabel(sc.duration)
    };
    var out = String(tpl).replace(/\{(system|pl|writer|circle|title|time)\}/g, function (m, k) { return values[k]; });
    // フォルダ名に使えない文字を全角に置き換える
    return out.replace(/[\\/:*?"<>|]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) + 0xfee0);
    }).trim();
  };
})();
