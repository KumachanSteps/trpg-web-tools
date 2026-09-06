/*
 * ChatPaletteSources — 入力元（キャラシサービス）の自動判定レジストリ
 *
 * 設計は docs/character-schema.md を参照。
 * PR1 の時点では「判定」だけを行い、共通スキーマへの parse() はまだ UI から呼ばれない
 * （generic-palette のみ実体、他サービスは後続 PR で実装）。
 *
 * ブラウザでは window.ChatPaletteSources、Node（tests/run.mjs）では module.exports。
 */
(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.ChatPaletteSources = api;
  }
})(typeof window !== "undefined" ? window : null, function () {
  const SERVICE = {
    IACHARA: "iachara",
    CHARASH: "charash",
    CHARAENO: "charaeno",
    CHARACTER_STORAGE: "character-storage",
    GENERIC_PALETTE: "generic-palette",
    UNKNOWN: "unknown"
  };

  const SERVICE_LABELS = {
    [SERVICE.IACHARA]: "いあきゃら",
    [SERVICE.CHARASH]: "キャラッシュ",
    [SERVICE.CHARAENO]: "Charaeno",
    [SERVICE.CHARACTER_STORAGE]: "キャラクター保管庫",
    [SERVICE.GENERIC_PALETTE]: "チャットパレット（サービス不明）",
    [SERVICE.UNKNOWN]: "判定できません"
  };

  const NOT_IMPLEMENTED = "この入力元の共通スキーマ変換は未実装です（後続PR）。";

  function tryParseJson(rawInput) {
    const trimmed = String(rawInput || "").trim();

    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  function komaData(parsedJson) {
    if (!parsedJson || typeof parsedJson !== "object") return null;
    if (parsedJson.kind !== "character" || !parsedJson.data || typeof parsedJson.data !== "object") return null;

    return parsedJson.data;
  }

  function externalUrlOf(parsedJson) {
    const data = komaData(parsedJson);
    return data && typeof data.externalUrl === "string" ? data.externalUrl : "";
  }

  function commandsOf(parsedJson) {
    const data = komaData(parsedJson);
    return data && typeof data.commands === "string" ? data.commands : "";
  }

  function hasPaletteCommands(text) {
    return /(^|\n)\s*(s?CCB?|CBRB|1d100)\s*<=/i.test(String(text || "")) ||
      /【[^】]+】/.test(String(text || ""));
  }

  const SOURCES = [
    {
      id: SERVICE.CHARASH,
      label: SERVICE_LABELS[SERVICE.CHARASH],
      detect(rawInput, parsedJson) {
        const url = externalUrlOf(parsedJson);
        if (/(^|\/\/|\.)charash\.jp(\/|$)/i.test(url)) return 1;

        const commands = commandsOf(parsedJson);
        if (commands && /〈[^〉]+〉/.test(commands) && /\[[A-Z]{3}×5\]/.test(commands)) return 0.6;

        return 0;
      },
      parse() { throw new Error(NOT_IMPLEMENTED); }
    },
    {
      id: SERVICE.IACHARA,
      label: SERVICE_LABELS[SERVICE.IACHARA],
      detect(rawInput, parsedJson) {
        const url = externalUrlOf(parsedJson);
        if (/(^|\/\/|\.)iachara\.com(\/|$)/i.test(url)) return 1;

        return 0;
      },
      parse() { throw new Error(NOT_IMPLEMENTED); }
    },
    {
      id: SERVICE.CHARAENO,
      label: SERVICE_LABELS[SERVICE.CHARAENO],
      detect(rawInput, parsedJson) {
        const url = externalUrlOf(parsedJson);
        if (/(^|\/\/|\.)charaeno\.com(\/|$)/i.test(url)) return 1;

        return 0;
      },
      parse() { throw new Error(NOT_IMPLEMENTED); }
    },
    {
      id: SERVICE.CHARACTER_STORAGE,
      label: SERVICE_LABELS[SERVICE.CHARACTER_STORAGE],
      detect(rawInput, parsedJson) {
        if (parsedJson) return 0;

        const text = String(rawInput || "");
        const strongMarkers = /■\s*(能力値|技能|簡易用|戦闘|所持品)\s*■/.test(text);
        const sectionRules = /-{3,}\s*.+系技能\s*-{3,}/.test(text);
        const skillBrackets = /《[^》]*》/.test(text);
        const commandCluster = /(^|\n):(HP|MP|SAN)[+\-]/.test(text) && /CCB<=/i.test(text);

        if (strongMarkers || sectionRules) return 1;
        if (skillBrackets && /HP：|SAN：/.test(text)) return 0.8;
        if (commandCluster) return 0.5;

        return 0;
      },
      parse() { throw new Error(NOT_IMPLEMENTED); }
    },
    {
      id: SERVICE.GENERIC_PALETTE,
      label: SERVICE_LABELS[SERVICE.GENERIC_PALETTE],
      // 既存 v2.55 の挙動。JSON の commands / palette 文字列、または貼り付けチャパレ本文。
      detect(rawInput, parsedJson) {
        const commands = commandsOf(parsedJson);
        if (commands && hasPaletteCommands(commands)) return 0.5;
        if (parsedJson && komaData(parsedJson)) return 0.4;
        if (!parsedJson && hasPaletteCommands(rawInput)) return 0.4;

        return 0;
      },
      parse(rawInput) {
        if (typeof window === "undefined" || !window.ChatPaletteParser) {
          throw new Error("ChatPaletteParser が読み込まれていません。");
        }

        const extracted = window.ChatPaletteParser.extractPaletteText(rawInput);
        const edition = extracted.text ? window.ChatPaletteParser.detectEdition(extracted.text) : "unknown";

        return {
          meta: {
            service: SERVICE.GENERIC_PALETTE,
            sourceUrl: null,
            edition,
            editionSource: extracted.text ? "skill" : "fallback",
            name: null,
            ruby: null,
            occupation: null,
            warnings: []
          },
          paletteText: extracted.text,
          abilities: null,
          derived: null,
          skills: [],
          weapons: []
        };
      }
    }
  ];

  const SOURCE_BY_ID = SOURCES.reduce((map, source) => {
    map[source.id] = source;
    return map;
  }, {});

  /**
   * 全 Parser の detect() を評価し、最もスコアの高い service id を返す。
   * 同点、または全て 0 の場合は "unknown"。
   */
  function detectService(rawInput) {
    if (!String(rawInput || "").trim()) return SERVICE.UNKNOWN;

    const parsedJson = tryParseJson(rawInput);

    let best = { id: SERVICE.UNKNOWN, score: 0 };
    let tie = false;

    for (const source of SOURCES) {
      const score = Number(source.detect(rawInput, parsedJson)) || 0;

      if (score > best.score) {
        best = { id: source.id, score };
        tie = false;
      } else if (score > 0 && score === best.score) {
        tie = true;
      }
    }

    if (best.score === 0) return SERVICE.UNKNOWN;
    if (tie) return SERVICE.GENERIC_PALETTE;

    return best.id;
  }

  /** 判定結果の内訳（プレビュー / デバッグ用）。 */
  function describeDetection(rawInput) {
    const parsedJson = tryParseJson(rawInput);

    return {
      isJson: Boolean(parsedJson),
      sourceUrl: externalUrlOf(parsedJson) || null,
      scores: SOURCES.map(source => ({
        id: source.id,
        label: source.label,
        score: Number(source.detect(rawInput, parsedJson)) || 0
      })),
      service: detectService(rawInput)
    };
  }

  function labelFor(serviceId) {
    return SERVICE_LABELS[serviceId] || serviceId;
  }

  function parse(rawInput, forcedService) {
    const serviceId = forcedService && forcedService !== "auto" ? forcedService : detectService(rawInput);
    const source = SOURCE_BY_ID[serviceId] || SOURCE_BY_ID[SERVICE.GENERIC_PALETTE];

    return source.parse(rawInput, tryParseJson(rawInput));
  }

  return {
    SERVICE,
    SERVICE_LABELS,
    detectService,
    describeDetection,
    labelFor,
    parse,
    _sources: SOURCES
  };
});
