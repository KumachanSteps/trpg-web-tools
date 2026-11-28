/*
 * CoC GMセッションモニター — 計算ロジック（DOM非依存）
 * ブラウザでは window.GMCore、Node では module.exports。
 * 判定やルール適用を確定させる処理は置かない。ここで出すのは比較・警告・コマンド文字列だけ。
 */
(function (root) {
  "use strict";

  var ABILITY_KEYS = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];

  // 6版で名称が違い、7版の技能と同じ行で比べる対応（名称差）。数値は変換しない。
  var RENAMED_6E_TO_7E = {
    "博物学": "自然",
    "薬学": "科学：薬学",
    "生物学": "科学：生物学",
    "化学": "科学：化学",
    "物理学": "科学：物理学",
    "地質学": "科学：地質学",
    "天文学": "科学：天文学"
  };
  var RENAMED_7E_TO_6E = {};
  Object.keys(RENAMED_6E_TO_7E).forEach(function (k) { RENAMED_7E_TO_6E[RENAMED_6E_TO_7E[k]] = k; });

  // 判定用の技能（アイデア等）は技能比較表に出さない
  var DICE_SKILLS = ["正気度ロール", "アイデア", "幸運", "知識", "SAN"];

  var CATEGORY_LABELS = {
    combat: "戦闘", explore: "探索", action: "行動", social: "交渉", knowledge: "知識", other: "まれな技能"
  };
  var CATEGORY_ORDER = ["explore", "combat", "action", "social", "knowledge", "other"];

  // 類似技能タグ（検索用の独自分類。公式の技能統合ではない）
  var SKILL_TAGS = {
    "痕跡発見": ["目星", "聞き耳", "追跡", "鑑定", "写真術"],
    "情報収集": ["図書館", "コンピューター", "言いくるめ", "信用", "説得", "経理", "法律"],
    "機械知識": ["機械修理", "電気修理", "重機械操作", "電子工学", "コンピューター", "運転", "操縦"],
    "危機回避": ["回避", "隠れる", "忍び歩き", "隠密", "跳躍", "登攀", "水泳", "応急手当"],
    "神秘知識": ["オカルト", "クトゥルフ神話技能", "人類学", "考古学", "歴史", "伝承"],
    "人間心理": ["心理学", "精神分析", "言いくるめ", "説得", "魅惑", "威圧", "信用"],
    "生物知識": ["医学", "応急手当", "科学：薬学", "科学：生物学", "自然", "サバイバル"],
    "社会知識": ["法律", "経理", "歴史", "信用", "値切り"],
    "三大技能": ["目星", "聞き耳", "図書館"]
  };

  var DEFAULT_RULES = {
    // 不定の狂気ライン = ceil(基準SAN / sanDivisor)
    sanDivisor: 5,
    // 1回の減少がこの値以上なら一時的狂気の目安として警告
    tempInsanity: 5,
    // MP回復（ゲーム内1時間あたり）。6版は POW / mp6Divisor、7版は mp7PerHour
    mp6Divisor: 24,
    mp7PerHour: 1,
    // 最大MPに達したら端数を捨てる
    discardFractionAtFull: true
  };

  function isNum(v) { return typeof v === "number" && isFinite(v); }

  function toNum(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function round(v, digits) {
    var m = Math.pow(10, digits || 0);
    return Math.round(v * m) / m;
  }

  function uid(prefix) {
    var id;
    if (root.crypto && typeof root.crypto.randomUUID === "function") id = root.crypto.randomUUID();
    else id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
    return prefix ? prefix + ":" + id : id;
  }

  /* ---------- 能力値 ---------- */

  // 比較尺度（6版相当）: 6版=原値、7版=原値/5（丸めない）
  function scaleStat(value, edition) {
    if (!isNum(value)) return null;
    return edition === "7e" ? value / 5 : value;
  }

  function formatScaled(v) {
    if (!isNum(v)) return "";
    return Number.isInteger(v) ? String(v) : String(round(v, 1));
  }

  // entries: [{ edition, abilities:{STR..}, hp, mp, sanCur, sanMax, luck, db }]
  function buildAbilityTable(entries) {
    var columns = ABILITY_KEYS.map(function (k) { return { key: k, label: k, kind: "ability" }; }).concat([
      { key: "HP", label: "HP", kind: "raw" },
      { key: "MP", label: "MP", kind: "raw" },
      { key: "SANCUR", label: "SAN", sub: "現在", kind: "raw" },
      { key: "SANMAX", label: "SAN", sub: "最大", kind: "raw" },
      { key: "LUCK", label: "幸運", kind: "raw" },
      { key: "DB", label: "DB", kind: "text" },
      { key: "SUM", label: "能力", sub: "合計", kind: "sum" },
      { key: "AVG", label: "能力", sub: "平均", kind: "avg" }
    ]);

    var rows = entries.map(function (e) {
      var cells = {};
      var ab = e.abilities || {};
      var count = 0, rawSum = 0, scaledSum = 0;
      ABILITY_KEYS.forEach(function (k) {
        var v = toNum(ab[k]);
        var cell = { value: v, compare: scaleStat(v, e.edition), text: v === null ? "?" : String(v), sub: "" };
        if (v !== null) {
          count += 1; rawSum += v; scaledSum += cell.compare;
          if (e.edition === "7e") cell.sub = formatScaled(cell.compare);
        }
        cells[k] = cell;
      });
      function raw(v) { v = toNum(v); return { value: v, compare: v, text: v === null ? "—" : String(v), sub: "" }; }
      cells.HP = raw(e.hp);
      cells.MP = raw(e.mp);
      cells.SANCUR = raw(e.sanCur);
      cells.SANMAX = raw(e.sanMax);
      cells.LUCK = raw(e.luck);
      if (e.luckDerived && cells.LUCK.value !== null) cells.LUCK.sub = "算出";
      cells.DB = { value: null, compare: null, text: e.db ? String(e.db) : "—", sub: "" };
      var complete = count === ABILITY_KEYS.length;
      cells.SUM = {
        value: count ? rawSum : null,
        compare: complete ? scaledSum : null,
        text: count ? String(rawSum) : "?",
        sub: (e.edition === "7e" && count ? formatScaled(scaledSum) : "") + (complete ? "" : (count ? " " + count + "/8項目" : ""))
      };
      cells.AVG = {
        value: count ? rawSum / count : null,
        compare: complete ? scaledSum / 8 : null,
        text: count ? formatScaled(round(rawSum / count, 3)) : "?",
        sub: e.edition === "7e" && count ? formatScaled(round(scaledSum / count, 3)) : ""
      };
      cells.SUM.sub = cells.SUM.sub.trim();
      return { cells: cells };
    });

    // ★: 比較尺度で列ごとの最大値（2人以上の比較可能値があるときだけ）
    columns.forEach(function (col) {
      if (col.kind === "text") return;
      var vals = rows.map(function (r) { return r.cells[col.key].compare; }).filter(isNum);
      if (vals.length < 2) return;
      var max = Math.max.apply(null, vals);
      rows.forEach(function (r) {
        var c = r.cells[col.key];
        if (isNum(c.compare) && Math.abs(c.compare - max) < 1e-9) c.star = true;
      });
    });

    return { columns: columns, rows: rows };
  }

  // 幸運: パレットの「幸運」値 → 6版のみ POW×5 を算出（明示） → 不明
  function resolveLuck(character) {
    var skills = (character && character.skills) || [];
    for (var i = 0; i < skills.length; i++) {
      if (skills[i].name === "幸運" && isNum(skills[i].value)) return { value: skills[i].value, derived: false };
    }
    var pow = character && character.abilities ? toNum(character.abilities.POW) : null;
    if (character && character.edition === "6e" && pow !== null) return { value: pow * 5, derived: true };
    return { value: null, derived: false };
  }

  /* ---------- SAN / MP ---------- */

  function rulesOf(r) {
    var out = {};
    Object.keys(DEFAULT_RULES).forEach(function (k) { out[k] = r && r[k] !== undefined ? r[k] : DEFAULT_RULES[k]; });
    return out;
  }

  // 基準SANから不定の狂気ラインを出す（目安。確定はしない）
  function sanInfo(baseline, current, rules) {
    rules = rulesOf(rules);
    if (!isNum(baseline)) return null;
    var threshold = Math.ceil(baseline / rules.sanDivisor);
    var line = baseline - threshold;
    var lost = isNum(current) ? baseline - current : null;
    return {
      threshold: threshold,
      line: line,
      lost: lost,
      reached: isNum(current) && current <= line,
      remaining: isNum(current) ? current - line : null
    };
  }

  function isTempInsanityDrop(before, after, rules) {
    rules = rulesOf(rules);
    return isNum(before) && isNum(after) && before - after >= rules.tempInsanity;
  }

  function mpRatePerHour(edition, pow, rules) {
    rules = rulesOf(rules);
    if (edition === "7e") return rules.mp7PerHour;
    if (edition === "6e") return isNum(pow) ? pow / rules.mp6Divisor : null;
    return null;
  }

  // MP回復。端数は frac に保持し、整数になった分だけ反映する。
  function advanceMp(mp, mpMax, frac, rate, hours, rules) {
    rules = rulesOf(rules);
    frac = isNum(frac) ? frac : 0;
    if (!isNum(mp) || !isNum(rate) || !isNum(hours) || hours <= 0) return { mp: mp, frac: frac, gained: 0 };
    var total = frac + rate * hours;
    // 浮動小数の誤差（0.9999999 等）を吸収。端数そのものは丸めずに持ち越す。
    var gain = Math.floor(total + 1e-9);
    var rest = total - gain;
    if (Math.abs(rest) < 1e-9) rest = 0;
    var next = mp + gain;
    if (isNum(mpMax) && next >= mpMax) {
      next = Math.max(mp, mpMax);
      if (rules.discardFractionAtFull) rest = 0;
    }
    return { mp: next, frac: rest, gained: next - mp };
  }

  /* ---------- 技能 ---------- */

  function baseOf(name) {
    var i = name.indexOf("：");
    return i >= 0 ? name.slice(0, i) : name;
  }

  function rowKeyFor(name, edition) {
    if (edition === "6e" && RENAMED_6E_TO_7E[name]) return RENAMED_6E_TO_7E[name];
    return name;
  }

  function nativeNameFor(rowKey, edition) {
    if (edition === "6e" && RENAMED_7E_TO_6E[rowKey]) return RENAMED_7E_TO_6E[rowKey];
    return rowKey;
  }

  // 初期値: 能力値依存は式IDで計算、それ以外は共通パーサーの表。見つからなければ null（非対応）。
  function initialValue(name, edition, abilities, tables) {
    abilities = abilities || {};
    var dex = toNum(abilities.DEX), edu = toNum(abilities.EDU);
    var base = baseOf(name);
    if (base === "回避") {
      if (dex === null) return { value: null, unknown: true };
      return { value: edition === "7e" ? Math.floor(dex / 2) : dex * 2, formula: true };
    }
    if (base === "母国語") {
      if (edu === null) return { value: null, unknown: true };
      return { value: edition === "7e" ? edu : edu * 5, formula: true };
    }
    var table = tables && (edition === "7e" ? tables.INITIAL_7E : tables.INITIAL_6E);
    if (!table) return null;
    var keys = [name, base];
    if (base.indexOf("/") >= 0) keys.push(base.split("/")[0]);
    for (var i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(table, keys[i])) return { value: table[keys[i]] };
    }
    return null;
  }

  function normalizeSearch(s) {
    s = String(s || "");
    if (s.normalize) s = s.normalize("NFKC");
    return s.toLowerCase().replace(/[\s　]+/g, "").replace(/[（(]/g, "：").replace(/[)）]/g, "");
  }

  function searchTokens(q) {
    return String(q || "").split(/[\s　,，、]+/).map(normalizeSearch).filter(Boolean);
  }

  /*
   * chars: [{ id, edition, abilities, skills:[{name,value,category}] }]
   * tables: { INITIAL_6E, INITIAL_7E, categorize? }
   * opts: { fill, rare, filter:'all'|'grown'|'high', sort:'category'|'name'|'max', query, category, tag, threshold, starIncludesFilled }
   */
  function buildSkillTable(chars, tables, opts) {
    opts = opts || {};
    var rowMap = {};
    var order = [];

    function ensureRow(key) {
      if (!rowMap[key]) { rowMap[key] = { key: key, label: key, alias6: null, category: null, cells: {}, firstSeen: order.length }; order.push(key); }
      return rowMap[key];
    }

    chars.forEach(function (c) {
      (c.skills || []).forEach(function (s) {
        if (!s || !s.name || DICE_SKILLS.indexOf(s.name) >= 0) return;
        var key = rowKeyFor(s.name, c.edition);
        var row = ensureRow(key);
        if (key !== s.name && c.edition === "6e") row.alias6 = s.name;
        if (!row.category && s.category && s.category !== "dice") row.category = s.category;
        if (!row.cells[c.id]) row.cells[c.id] = { value: isNum(s.value) ? s.value : null, explicit: true, token: s.valueToken || null };
      });
    });

    if (opts.rare && tables) {
      var eds = {};
      chars.forEach(function (c) { eds[c.edition] = true; });
      ["6e", "7e"].forEach(function (ed) {
        if (!eds[ed]) return;
        var t = ed === "7e" ? tables.INITIAL_7E : tables.INITIAL_6E;
        Object.keys(t || {}).forEach(function (name) {
          if (name === "他の言語") return; // 「ほかの言語」と重複
          var key = rowKeyFor(name, ed);
          var row = ensureRow(key);
          if (key !== name && ed === "6e") row.alias6 = name;
        });
      });
    }

    var rows = order.map(function (k) { return rowMap[k]; });

    rows.forEach(function (row) {
      if (!row.category) {
        var cat = null;
        if (tables && typeof tables.categorize === "function") {
          var ed = chars.some(function (c) { return c.edition === "7e"; }) ? "7e" : "6e";
          cat = tables.categorize(row.key, row.key, ed);
        }
        row.category = cat && cat !== "dice" ? cat : "other";
      }
      if (row.category === "dice") row.category = "other";

      chars.forEach(function (c) {
        var cell = row.cells[c.id];
        if (cell && cell.value !== null) {
          var ini = initialValue(nativeNameFor(row.key, c.edition), c.edition, c.abilities, tables);
          cell.initial = ini && isNum(ini.value) ? ini.value : null;
          return;
        }
        if (cell && cell.value === null) { cell.text = cell.token || "?"; cell.state = "unknown"; return; }
        var native = nativeNameFor(row.key, c.edition);
        var ini2 = initialValue(native, c.edition, c.abilities, tables);
        if (!ini2) { row.cells[c.id] = { value: null, state: "na", text: "—" }; return; }
        if (!isNum(ini2.value)) { row.cells[c.id] = { value: null, state: "unknown", text: "?" }; return; }
        row.cells[c.id] = { value: ini2.value, initial: ini2.value, filled: true, state: "filled", text: String(ini2.value) };
      });

      chars.forEach(function (c) {
        var cell = row.cells[c.id];
        if (cell.explicit && cell.value !== null) { cell.state = "explicit"; cell.text = String(cell.value); }
        if (cell.filled && !opts.fill) { cell.hidden = true; }
      });

      // 6版名称の注記
      row.note = row.alias6 ? "6版：" + row.alias6 : "";
    });

    var threshold = isNum(opts.threshold) ? opts.threshold : 70;
    var starFilled = opts.starIncludesFilled !== false;

    rows.forEach(function (row) {
      var vals = [];
      chars.forEach(function (c) {
        var cell = row.cells[c.id];
        if (cell.hidden || !isNum(cell.value)) return;
        if (cell.filled && !starFilled) return;
        vals.push(cell.value);
      });
      row.max = vals.length ? Math.max.apply(null, vals) : null;
      row.comparable = vals.length;
      chars.forEach(function (c) {
        var cell = row.cells[c.id];
        if (cell.hidden || !isNum(cell.value)) return;
        if (cell.filled && !starFilled) return;
        if (vals.length >= 2 && cell.value === row.max) cell.star = true;
        if (cell.value >= threshold) cell.high = true;
      });
      row.grown = chars.some(function (c) {
        var cell = row.cells[c.id];
        return cell.state === "explicit" && isNum(cell.initial) && cell.value > cell.initial || cell.state === "explicit" && cell.initial === null;
      });
      row.anyHigh = chars.some(function (c) { var cell = row.cells[c.id]; return !cell.hidden && isNum(cell.value) && cell.value >= threshold; });
      row.anyVisible = chars.some(function (c) { var cell = row.cells[c.id]; return !cell.hidden && cell.state !== "na"; });
    });

    var tokens = searchTokens(opts.query);
    var tagSkills = opts.tag && SKILL_TAGS[opts.tag] ? SKILL_TAGS[opts.tag] : null;

    rows = rows.filter(function (row) {
      if (!row.anyVisible && !opts.rare) return false;
      if (opts.filter === "grown" && !row.grown) return false;
      if (opts.filter === "high" && !row.anyHigh) return false;
      if (opts.category && row.category !== opts.category) return false;
      if (tagSkills) {
        var hit = tagSkills.some(function (t) { return row.key === t || baseOf(row.key) === t || row.alias6 === t; });
        if (!hit) return false;
      }
      if (tokens.length) {
        var hay = normalizeSearch(row.key + " " + (row.alias6 || ""));
        if (!tokens.some(function (t) { return hay.indexOf(t) >= 0; })) return false;
      }
      return true;
    });

    if (tagSkills) {
      rows.sort(function (a, b) { return tagIndex(a) - tagIndex(b); });
    } else if (opts.sort === "name") {
      rows.sort(function (a, b) { return a.key.localeCompare(b.key, "ja"); });
    } else if (opts.sort === "max") {
      rows.sort(function (a, b) { return (b.max === null ? -1 : b.max) - (a.max === null ? -1 : a.max) || a.firstSeen - b.firstSeen; });
    } else {
      rows.sort(function (a, b) {
        return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.firstSeen - b.firstSeen;
      });
    }

    function tagIndex(row) {
      for (var i = 0; i < tagSkills.length; i++) {
        var t = tagSkills[i];
        if (row.key === t || baseOf(row.key) === t || row.alias6 === t) return i;
      }
      return 999;
    }

    return { rows: rows, threshold: threshold };
  }

  function rollCommand(edition, value, label) {
    if (!isNum(value)) return "";
    var cmd = edition === "7e" ? "CC" : "CCB";
    return cmd + "<=" + value + " 【" + label + "】";
  }

  /* ---------- choice ---------- */

  var CHOICE_FORBIDDEN = /[,，\[\]\r\n]/;

  // names: 表示名の配列。count: 選ぶ数。secret: S接頭辞。comment: 半角スペース区切りで後置。
  function choiceCommand(names, count, secret, comment) {
    names = (names || []).map(function (n) { return String(n || "").trim(); });
    if (!names.length) return { ok: false, error: "候補を1人以上選んでください。" };
    if (names.some(function (n) { return !n; })) return { ok: false, error: "名前が空の候補があります。" };
    var bad = names.filter(function (n) { return CHOICE_FORBIDDEN.test(n); });
    if (bad.length) return { ok: false, error: "「" + bad[0] + "」に , [ ] または改行が含まれるため、コマンドにできません。表示名を変えてください。" };
    count = Math.floor(Number(count) || 1);
    if (count < 1) return { ok: false, error: "選ぶ数は1以上にしてください。" };
    if (count > names.length) return { ok: false, error: "選ぶ数（" + count + "）が候補数（" + names.length + "）を超えています。" };
    comment = String(comment || "").replace(/[\r\n]+/g, " ").trim();
    var cmd = (secret ? "S" : "") + "choice" + (count > 1 ? count : "") + "[" + names.join(",") + "]";
    if (comment) cmd += " " + comment;
    return { ok: true, command: cmd };
  }

  /* ---------- ダイス表 ---------- */

  // 1行1項目。前後の空白を除き、空行は捨てる。重複は重みとして残す。
  function parseDiceTableLines(text) {
    return String(text || "").split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function diceTableText(name, items) {
    if (!items.length) return "";
    var lines = [(String(name || "").trim() || "名称未設定"), "1D" + items.length];
    items.forEach(function (it, i) { lines.push((i + 1) + ":" + it); });
    return lines.join("\n");
  }

  /* ---------- 取込 ---------- */

  // 貼付テキストを1キャラずつに分ける。JSONオブジェクトが並んでいればそれぞれ、そうでなければ全体で1件。
  function splitImportChunks(text) {
    text = String(text || "").trim();
    if (!text) return [];
    if (text.charAt(0) !== "{" && text.charAt(0) !== "[") return [text];
    try {
      var parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(function (o) { return JSON.stringify(o); });
      return [text];
    } catch (e) { /* 連結されたJSONを走査 */ }
    var chunks = [], depth = 0, start = -1, inStr = false, esc = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === "\"") inStr = false;
        continue;
      }
      if (ch === "\"") { inStr = true; continue; }
      if (ch === "{") { if (depth === 0) start = i; depth++; }
      else if (ch === "}") { depth--; if (depth === 0 && start >= 0) { chunks.push(text.slice(start, i + 1)); start = -1; } }
    }
    return chunks.length ? chunks : [text];
  }

  /* ---------- 卓報告 ---------- */

  function tableEditionLabel(participants, chosen) {
    if (chosen === "6e") return "CoC";
    if (chosen === "7e") return "CoC7th";
    var eds = {};
    participants.forEach(function (p) { if (p.edition && p.edition !== "unknown") eds[p.edition] = true; });
    var keys = Object.keys(eds);
    if (keys.length === 1 && keys[0] === "7e") return "CoC7th";
    return "CoC";
  }

  // participants: [{ name, pl, ho, edition }]（PCのみ渡す）
  function reportText(opts) {
    var lines = [];
    lines.push(tableEditionLabel(opts.participants || [], opts.edition) + "「" + (opts.scenario || "") + "」");
    lines.push("KP：" + (opts.kp || ""));
    (opts.participants || []).forEach(function (p) {
      var s = (p.ho ? p.ho + " " : "") + (p.name || "");
      if (p.pl) s += "（" + p.pl + "）";
      lines.push(s);
    });
    if (opts.date) lines.push(opts.date);
    return lines.join("\n");
  }

  function reportSystemName(participants, chosen) {
    var label = tableEditionLabel(participants, chosen);
    return label === "CoC7th" ? "CoC 7版" : "CoC 6版";
  }

  // 卓報告ジェネレーターの pendingImport 形式（卓ログトラッカーと同じ）
  function reportPendingImport(opts, nowIso) {
    var date = opts.date || "";
    return {
      source: "coc-gm-session-monitor",
      version: "1.0",
      createdAt: nowIso,
      items: [{
        id: "report_import_" + Date.parse(nowIso),
        sourceLogId: "",
        reported: false,
        scenario: opts.scenario || "",
        system: reportSystemName(opts.participants || [], opts.edition),
        dates: date ? [date] : [],
        latestDate: date,
        sessionCount: 1,
        gm: opts.kp || "",
        players: (opts.participants || []).map(function (p) { return { pl: p.pl || "", pc: p.name || "", characterUrl: "" }; }),
        format: "",
        status: "",
        memo: "",
        links: [],
        hashtags: []
      }]
    };
  }

  function sessionLogTransfer(opts, nowIso) {
    return {
      type: "session-log",
      source: "coc-gm-session-monitor",
      sourceName: "CoC GMセッションモニター",
      target: opts.target,
      sessionName: opts.sessionName || "",
      text: opts.text || "",
      createdAt: nowIso
    };
  }

  /* ---------- チェックリスト ---------- */

  // 「質問 | A | B」→ 選択式。先頭が「# 」→ 見出し。
  function parseChecklistLine(line) {
    line = String(line || "").trim();
    if (!line) return null;
    if (/^[#＃]\s*/.test(line)) return { kind: "heading", text: line.replace(/^[#＃]\s*/, "") };
    var parts = line.split(/\s*[|｜]\s*/);
    if (parts.length >= 3 && parts[0]) {
      var opts = parts.slice(1).filter(Boolean);
      if (opts.length >= 2) return { kind: "choice", text: parts[0], options: opts };
    }
    return { kind: "check", text: line };
  }

  function checklistProgress(items, perChar, charIds) {
    var done = 0, total = 0;
    items.forEach(function (it) {
      if (it.kind === "heading") return;
      if (perChar && charIds.length) {
        charIds.forEach(function (id) {
          total++;
          var v = it.byChar && it.byChar[id];
          if (it.kind === "choice" ? !!v : v === true) done++;
        });
      } else {
        total++;
        if (it.kind === "choice" ? !!it.value : it.value === true) done++;
      }
    });
    return { done: done, total: total };
  }

  var api = {
    ABILITY_KEYS: ABILITY_KEYS,
    RENAMED_6E_TO_7E: RENAMED_6E_TO_7E,
    CATEGORY_LABELS: CATEGORY_LABELS,
    CATEGORY_ORDER: CATEGORY_ORDER,
    SKILL_TAGS: SKILL_TAGS,
    DEFAULT_RULES: DEFAULT_RULES,
    uid: uid,
    toNum: toNum,
    scaleStat: scaleStat,
    formatScaled: formatScaled,
    buildAbilityTable: buildAbilityTable,
    resolveLuck: resolveLuck,
    rulesOf: rulesOf,
    sanInfo: sanInfo,
    isTempInsanityDrop: isTempInsanityDrop,
    mpRatePerHour: mpRatePerHour,
    advanceMp: advanceMp,
    initialValue: initialValue,
    buildSkillTable: buildSkillTable,
    rollCommand: rollCommand,
    normalizeSearch: normalizeSearch,
    choiceCommand: choiceCommand,
    parseDiceTableLines: parseDiceTableLines,
    diceTableText: diceTableText,
    splitImportChunks: splitImportChunks,
    reportText: reportText,
    reportPendingImport: reportPendingImport,
    sessionLogTransfer: sessionLogTransfer,
    parseChecklistLine: parseChecklistLine,
    checklistProgress: checklistProgress
  };

  root.GMCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
