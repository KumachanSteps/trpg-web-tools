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

    const abilities = {};
    let abilityCount = 0;

    for (const key of ABILITY_KEYS) {
      const value = numeric(params[key]);
      abilities[key] = value;

      if (value !== null) abilityCount += 1;
    }

    const derived = {
      HP: status.HP || null,
      MP: status.MP || null,
      SAN: status.SAN || null,
      DB: params.DB != null && String(params.DB).trim() ? String(params.DB).trim() : null,
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

    const { name, ruby } = splitName(data ? data.name : "", data ? data.memo : "");

    if (!data) {
      warnings.push({ code: "NOT_KOMA_JSON", detail: "こま形式のJSONではないため、能力値やHP等は取得していません。" });
    } else if (abilityCount === 0) {
      warnings.push({ code: "ABILITIES_MISSING", detail: "params から能力値を取得できませんでした。" });
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
        occupation: occupationOf(data ? data.memo : null),
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

  return {
    ABILITY_KEYS,
    buildCharacter,
    splitName,
    resolveEdition
  };
});
