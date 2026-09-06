/*
 * ChatPaletteSchema — 各サービスの入力を共通 Character Data Schema へ正規化する。
 * 設計は docs/character-schema.md を参照。
 *
 * PR3 時点の役割:
 *   - こま形式JSON（いあきゃら / キャラッシュ / Charaeno）から
 *     能力値・HP/MP/SAN・DB・名前・職業を取り出す
 *   - パレット本文を ChatPaletteParser.analyzePalette で構造化し、技能/武器の数を出す
 *   - 「解析結果プレビュー」表示のためのオブジェクトを返す
 *
 * まだチャパレ生成（buildOutput）はこのスキーマを使っていない（統合は後続PR）。
 *
 * ブラウザ: window.ChatPaletteSchema / Node: module.exports
 * 依存: window.ChatPaletteParser, window.ChatPaletteSources（先に読み込むこと）
 */
(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.ChatPaletteSchema = api;
  }
})(typeof window !== "undefined" ? window : null, function () {
  const ABILITY_KEYS = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
  const KANA_ONLY = /^[぀-ゟ゠-ヿーｦ-ﾟ\s　]+$/;

  function parser() {
    return typeof window !== "undefined" ? window.ChatPaletteParser : null;
  }

  function sources() {
    return typeof window !== "undefined" ? window.ChatPaletteSources : null;
  }

  function tryParseJson(raw) {
    const trimmed = String(raw || "").trim();

    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  function komaData(json) {
    return json && json.kind === "character" && json.data && typeof json.data === "object" ? json.data : null;
  }

  function numeric(value) {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();

    if (!text) return null;

    const match = text.match(/-?\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : null;
  }

  function indexParams(list) {
    const map = {};

    for (const entry of Array.isArray(list) ? list : []) {
      if (entry && entry.label != null && !(entry.label in map)) {
        map[entry.label] = entry.value;
      }
    }

    return map;
  }

  function indexStatus(list) {
    const map = {};

    for (const entry of Array.isArray(list) ? list : []) {
      if (entry && entry.label != null && !(entry.label in map)) {
        map[entry.label] = {
          value: numeric(entry.value),
          max: numeric(entry.max)
        };
      }
    }

    return map;
  }

  function resolveEdition(sourceUrl, paletteText) {
    if (sourceUrl) {
      if (/\/7th\//i.test(sourceUrl) || /coc7/i.test(sourceUrl)) return { edition: "7e", editionSource: "url" };
      if (/\/6th\//i.test(sourceUrl) || /coc6/i.test(sourceUrl)) return { edition: "6e", editionSource: "url" };
    }

    const P = parser();

    if (paletteText && P) {
      return { edition: P.detectEdition(paletteText), editionSource: "palette" };
    }

    return { edition: "unknown", editionSource: "unknown" };
  }

  function splitName(rawName, memo) {
    let name = String(rawName || "").trim();
    let ruby = "";

    const trailing = name.match(/^(.*\S)[\s　]*[(（]([^()（）]+)[)）]\s*$/);

    if (trailing && KANA_ONLY.test(trailing[2].trim())) {
      name = trailing[1].trim();
      ruby = trailing[2].trim();
    }

    if (!ruby && memo) {
      const fromMemo = String(memo).match(/(?:ふりがな|フリガナ|よみ|読み)\s*[:：]\s*(.+)/);

      if (fromMemo) ruby = fromMemo[1].trim();
    }

    return { name, ruby };
  }

  function occupationOf(memo) {
    if (!memo) return null;

    const match = String(memo).match(/(?:職業|オカルト職業|Occupation)\s*[:：]\s*(.+)/i);

    return match ? match[1].trim() : null;
  }

  function tokenize(line) {
    return String(line).trim().split(/[\s　]+/).filter(Boolean);
  }

  function matchLine(text, pattern) {
    const m = String(text).match(pattern);
    return m ? m[1].trim() : null;
  }

  // 6版 / 7版のダメージボーナス（STR+SIZ）
  function damageBonus(str, siz, edition) {
    if (str == null || siz == null) return null;

    const sum = str + siz;

    if (edition === "7e") {
      if (sum <= 64) return "-2";
      if (sum <= 84) return "-1";
      if (sum <= 124) return "0";
      if (sum <= 164) return "+1D4";
      if (sum <= 204) return "+1D6";
      return "+" + (Math.floor((sum - 205) / 80) + 2) + "D6";
    }

    if (sum <= 12) return "-1D6";
    if (sum <= 16) return "-1D4";
    if (sum <= 24) return "0";
    if (sum <= 32) return "+1D4";
    if (sum <= 40) return "+1D6";
    return "+" + (Math.floor((sum - 41) / 16) + 2) + "D6";
  }

  // キャラクター保管庫のテキストシートからプロフィール／能力値を取り出す
  function parseStorageSheet(text) {
    const raw = String(text || "");
    const lines = raw.split(/\r?\n/);

    const abilities = {};
    const abilityKeysAll = ABILITY_KEYS.concat(["HP", "MP"]);

    // 能力値テーブル（見出し行 + =合計= / 作成時 行）
    const headerIndex = lines.findIndex(line => /STR/.test(line) && /CON/.test(line) && /EDU/.test(line));

    if (headerIndex >= 0) {
      const header = tokenize(lines[headerIndex]).filter(token => abilityKeysAll.includes(token));
      const totalLine =
        lines.slice(headerIndex + 1).find(line => /^[=＝]?\s*合計\s*[=＝]?/.test(line.trim())) ||
        lines.slice(headerIndex + 1).find(line => /^(作成時|初期)/.test(line.trim()));

      if (totalLine) {
        const values = tokenize(totalLine).filter(token => /^\d+$/.test(token));

        header.forEach((key, i) => {
          if (values[i] !== undefined) abilities[key] = Number(values[i]);
        });
      }
    }

    // 簡易用ブロック / 本文中の「STR:12」表記で補完
    for (const key of abilityKeysAll) {
      if (abilities[key] != null) continue;
      const m = raw.match(new RegExp(key + "\\s*[:：]\\s*(\\d+)"));
      if (m) abilities[key] = Number(m[1]);
    }

    // HP / MP / SAN（■能力値■ ブロックの「HP：9」「SAN：24/78」）
    const derived = {};

    for (const label of ["HP", "MP", "SAN"]) {
      const m = raw.match(new RegExp("(?:^|\\n)\\s*" + label + "\\s*[:：]\\s*(\\d+)\\s*(?:[/／]\\s*(\\d+))?"));
      if (m) {
        derived[label] = { value: Number(m[1]), max: m[2] ? Number(m[2]) : Number(m[1]) };
      }
    }

    if (!derived.HP && abilities.HP != null) derived.HP = { value: abilities.HP, max: abilities.HP };
    if (!derived.MP && abilities.MP != null) derived.MP = { value: abilities.MP, max: abilities.MP };

    return {
      name: matchLine(raw, /(?:探索者名|キャラクター名|ＰＣ名|PC名|名前)\s*[:：]\s*(.+)/),
      occupation: matchLine(raw, /職業\s*[:：]\s*(.+)/),
      age: matchLine(raw, /年齢\s*[:：]\s*([0-9]+)/),
      sex: matchLine(raw, /性別\s*[:：]\s*([^\s　/／]+)/),
      height: matchLine(raw, /身長\s*[:：]\s*([0-9.]+)/),
      weight: matchLine(raw, /体重\s*[:：]\s*([0-9.]+)/),
      dbText: matchLine(raw, /(?:ダメージ・?ボーナス|ﾀﾞﾒｰｼﾞﾎﾞｰﾅｽ)\s*[:：]\s*([+\-]?\s*[0-9]*[dD]?[0-9]+)/),
      abilities,
      derived
    };
  }

  function buildCharacter(rawInput) {
    const raw = String(rawInput || "");
    const P = parser();
    const S = sources();
    const warnings = [];

    const json = tryParseJson(raw);
    const data = komaData(json);
    const service = S ? S.detectService(raw) : "unknown";
    const sourceUrl = data && typeof data.externalUrl === "string" ? data.externalUrl : null;

    const extracted = P ? P.extractPaletteText(raw) : { text: "" };
    const paletteText = extracted.text || "";
    const { edition, editionSource } = resolveEdition(sourceUrl, paletteText);

    const params = indexParams(data ? data.params : null);
    const status = indexStatus(data ? data.status : null);

    // こま形式でなくキャラクター保管庫のテキストシートなら、そこから能力値等を拾う
    const sheet = !data && (service === "character-storage" || /■\s*能力値\s*■/.test(raw))
      ? parseStorageSheet(raw)
      : null;

    const abilities = {};
    let abilityCount = 0;

    for (const key of ABILITY_KEYS) {
      let value = numeric(params[key]);
      if (value === null && sheet && sheet.abilities[key] != null) value = sheet.abilities[key];
      abilities[key] = value;

      if (value !== null) abilityCount += 1;
    }

    const derived = {
      HP: status.HP || (sheet && sheet.derived.HP) || null,
      MP: status.MP || (sheet && sheet.derived.MP) || null,
      SAN: status.SAN || (sheet && sheet.derived.SAN) || null,
      DB: params.DB != null && String(params.DB).trim()
        ? String(params.DB).trim()
        : (sheet && sheet.dbText) || null,
      MOV: numeric(params.MOV),
      build: numeric(params["ビルド"] != null ? params["ビルド"] : params.BUILD)
    };

    const analysis = paletteText && P
      ? P.analyzePalette(paletteText, edition)
      : { skills: [], damageLines: [], abilityRolls: [], other: [] };

    // 技能を1件も認識できていない palette 由来の版判定は当てにならないので伏せる
    let finalEdition = edition;
    let finalEditionSource = editionSource;

    if (editionSource === "palette" && analysis.skills.length === 0) {
      finalEdition = "unknown";
      finalEditionSource = "unknown";
    }

    // DB が無ければ STR+SIZ から算出
    if (!derived.DB && abilities.STR != null && abilities.SIZ != null) {
      derived.DB = damageBonus(abilities.STR, abilities.SIZ, finalEdition === "7e" ? "7e" : "6e");
    }

    const { name, ruby } = splitName(
      data ? data.name : (sheet && sheet.name) || "",
      data ? data.memo : ""
    );

    const occupation = occupationOf(data ? data.memo : null) || (sheet && sheet.occupation) || null;

    const profile = sheet
      ? {
          age: sheet.age,
          sex: sheet.sex,
          height: sheet.height,
          weight: sheet.weight
        }
      : null;

    if (!data && !sheet) {
      warnings.push({ code: "NOT_KOMA_JSON", detail: "こま形式のJSONではないため、能力値やHP等は取得していません。" });
    } else if (abilityCount === 0) {
      warnings.push({ code: "ABILITIES_MISSING", detail: "能力値を取得できませんでした。" });
    } else if (abilityCount < ABILITY_KEYS.length) {
      warnings.push({ code: "ABILITIES_PARTIAL", detail: `能力値が ${abilityCount}/${ABILITY_KEYS.length} 個しか取得できませんでした。` });
    }

    if (paletteText && analysis.skills.length === 0) {
      warnings.push({ code: "NO_SKILLS", detail: "技能行を認識できませんでした。" });
    }

    if (!paletteText) {
      warnings.push({ code: "NO_PALETTE", detail: "チャットパレット本文を取り出せませんでした。" });
    }

    if (service === "unknown") {
      warnings.push({ code: "SERVICE_UNKNOWN", detail: "入力元サービスを判定できませんでした。版指定は手動で確認してください。" });
    }

    return {
      meta: {
        service,
        sourceUrl,
        edition: finalEdition || "unknown",
        editionSource: finalEditionSource,
        name: name || null,
        ruby: ruby || null,
        occupation,
        profile,
        warnings
      },
      abilities,
      derived,
      skills: analysis.skills,
      weapons: analysis.damageLines.map(line => ({ raw: line })),
      counts: {
        abilities: abilityCount,
        skills: analysis.skills.length,
        skillsInitial: analysis.skills.filter(skill => skill.isInitial).length,
        weapons: analysis.damageLines.length
      }
    };
  }

  // 共通スキーマ → CCFOLIA こま形式 JSON
  function toKomaJson(rawInput, options) {
    const P = parser();
    const character = buildCharacter(rawInput);
    const edition = character.meta.edition === "7e" ? "7e" : "6e";

    const extracted = P ? P.extractPaletteText(rawInput) : { text: "" };
    const commands = extracted.text && P ? P.buildOutput(extracted.text, edition, options || {}) : "";

    const status = [];
    for (const label of ["HP", "MP", "SAN"]) {
      const entry = character.derived[label];
      if (entry && entry.value != null) {
        status.push({ label, value: entry.value, max: entry.max != null ? entry.max : entry.value });
      }
    }

    const params = [];
    for (const key of ABILITY_KEYS) {
      if (character.abilities[key] != null) params.push({ label: key, value: String(character.abilities[key]) });
    }
    if (character.derived.DB != null) params.push({ label: "DB", value: String(character.derived.DB) });
    if (character.derived.MOV != null) params.push({ label: "MOV", value: String(character.derived.MOV) });
    if (character.derived.build != null) params.push({ label: "ビルド", value: String(character.derived.build) });

    const memoLines = [];
    if (character.meta.ruby) memoLines.push("ふりがな: " + character.meta.ruby);
    if (character.meta.occupation) memoLines.push("職業: " + character.meta.occupation);
    const pf = character.meta.profile;
    if (pf) {
      if (pf.age) memoLines.push("年齢: " + pf.age);
      if (pf.sex) memoLines.push("性別: " + pf.sex);
      if (pf.height) memoLines.push("身長: " + pf.height);
      if (pf.weight) memoLines.push("体重: " + pf.weight);
    }

    return {
      kind: "character",
      data: {
        name: character.meta.name || "",
        initiative: character.abilities.DEX != null ? character.abilities.DEX : 0,
        externalUrl: character.meta.sourceUrl || null,
        status,
        params,
        commands,
        memo: memoLines.join("\n")
      }
    };
  }

  return {
    ABILITY_KEYS,
    buildCharacter,
    toKomaJson,
    parseStorageSheet,
    damageBonus,
    splitName,
    resolveEdition
  };
});
