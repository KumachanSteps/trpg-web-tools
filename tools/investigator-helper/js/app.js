(() => {
  "use strict";

  const OCCUPATION_DATASETS = [
    window.OCCUPATIONS,
    window.OCCUPATIONS_6E_COC2015,
    window.OCCUPATIONS_7E_BASIC,
    window.OCCUPATIONS_7E_EXTRA,
    window.OCCUPATIONS_7E_PULP,
    window.OCCUPATIONS_GASLIGHT,
    window.OCCUPATIONS_DREAMLAND,
    window.OCCUPATIONS_TEIKOKU,
    window.OCCUPATIONS_HIEIZAN,
  ];

  const OCCUPATIONS = OCCUPATION_DATASETS
    .filter(Array.isArray)
    .flatMap((dataset) => dataset)
    .map((occupation, index) => ({
      ...occupation,
      originalIndex: index,
    }));

  const FEATURES = Array.isArray(window.FEATURES) ? window.FEATURES : [];
  const EXPERIENCE_PACKAGES = Array.isArray(window.EXPERIENCE_PACKAGES) ? window.EXPERIENCE_PACKAGES : [];
  const WEAPONS = Array.isArray(window.WEAPONS) ? window.WEAPONS : [];
  const BELONGINGS = Array.isArray(window.BELONGINGS) ? window.BELONGINGS : [];
  const THEME_COLORS = Array.isArray(window.THEME_COLORS) ? window.THEME_COLORS : [];

  const SOURCES = [
    "すべて",
    "6版・基本ルールブック",
    "クトゥルフ2010",
    "クトゥルフ2015",
    "7版・基本ルールブック",
    "クトゥルフ2020",
    "プレイングガイド",
    "幻夢境",
    "クトゥルフと帝国",
    "クトゥルフ・バイ・ガスライト",
    "比叡山炎上",
    "パルプクトゥルフ",
  ];

  const SKILL_CHIPS_BY_RULE = {
    all: [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "MA", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠す", "隠密", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "値切り", "母国語", "他の言語",
      "医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "生物学", "地質学", "電子工学", "天文学", "自然", "博物学", "物理学", "法律", "薬学", "歴史", "サバイバル",
    ],
    "6e": [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "MA", "射撃", "投擲",
      "応急手当", "鍵開け", "隠す", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "跳躍",
      "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "値切り", "母国語", "他の言語",
      "医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史", "サバイバル",
    ],
    "7e": [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠密", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "母国語", "他の言語",
      "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル",
    ],
    pulp: [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠密", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "母国語", "他の言語",
      "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル",
    ],
  };

  const SKILL_ALIASES = {
    近接戦闘: ["近接戦闘", "近接格闘", "近接戦", "こぶし", "こぶし（パンチ）", "こぶし(パンチ)", "パンチ", "キック", "組み付き", "組みつき", "頭突き", "任意の近接戦技能", "任意の素手の近接戦技能", "素手の近接戦技能", "任意の素手の戦闘技能"],
    MA: ["MA", "マーシャルアーツ", "武道", "武道（任意）", "武道(任意)"],
    射撃: ["射撃", "火器", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル", "砲", "任意の火器技能"],
    手さばき: ["手さばき", "隠す"],
    隠密: ["隠密", "隠れる", "忍び歩き"],
    他の言語: ["他の言語", "ほかの言語", "別の言語"],
    科学: ["科学", "科学（専門分野）", "科学(専門分野)"],
    芸術: ["芸術", "芸術（任意）", "芸術(任意)", "芸術／製作", "芸術または製作", "芸術 or 製作"],
    製作: ["製作", "製作（任意）", "製作(任意)", "芸術／製作", "芸術または製作", "芸術 or 製作"],
    運転: ["運転", "運転（自動車）", "運転(自動車)", "運転（二輪車）", "運転(二輪車)"],
    操縦: ["操縦", "操縦（船舶）", "操縦(船舶)", "操縦（ボート）", "操縦(ボート)", "操縦（航空機）", "操縦(航空機)"],
    サバイバル: ["サバイバル", "サバイバル（山）", "サバイバル(山)", "サバイバル（海）", "サバイバル(海)", "サバイバル（砂漠）", "サバイバル(砂漠)"],
  };


  const BELONGING_TAG_CHIPS = [
    "一般", "探索", "記録", "通信", "医療", "防犯", "アウトドア", "趣味",
    "職業道具", "身だしなみ", "オカルト", "電子機器", "交通", "非常用品", "小物", "高級品",
  ];

  const THEME_COLOR_GROUP_ORDER = ["原色", "和色", "洋色"];

  const THEME_COLOR_TAG_CHIPS = [
    "原色", "和色", "洋色", "暖色", "寒色", "赤", "青", "緑", "黄", "紫", "ピンク",
    "黒", "白", "グレー", "茶", "金", "銀", "パステル", "ビビッド",
    "ダーク", "くすみ", "和風", "レトロ", "ファンタジー", "ホラー", "高級感", "かわいい", "クール", "神秘的",
  ];


  const CSS_COLOR_JA_NAMES = {
    aliceblue: "アリスブルー", antiquewhite: "アンティークホワイト", aqua: "アクア", aquamarine: "アクアマリン", azure: "アジュール",
    beige: "ベージュ", bisque: "ビスク", black: "ブラック", blanchedalmond: "ブランチドアーモンド", blue: "ブルー", blueviolet: "ブルーバイオレット",
    brown: "ブラウン", burlywood: "バーリーウッド", cadetblue: "カデットブルー", chartreuse: "シャルトルーズ", chocolate: "チョコレート", coral: "コーラル",
    cornflowerblue: "コーンフラワーブルー", cornsilk: "コーンシルク", crimson: "クリムゾン", cyan: "シアン", darkblue: "ダークブルー", darkcyan: "ダークシアン",
    darkgoldenrod: "ダークゴールデンロッド", darkgray: "ダークグレー", darkgreen: "ダークグリーン", darkgrey: "ダークグレー", darkkhaki: "ダークカーキ",
    darkmagenta: "ダークマゼンタ", darkolivegreen: "ダークオリーブグリーン", darkorange: "ダークオレンジ", darkorchid: "ダークオーキッド", darkred: "ダークレッド",
    darksalmon: "ダークサーモン", darkseagreen: "ダークシーグリーン", darkslateblue: "ダークスレートブルー", darkslategray: "ダークスレートグレー",
    darkslategrey: "ダークスレートグレー", darkturquoise: "ダークターコイズ", darkviolet: "ダークバイオレット", deeppink: "ディープピンク", deepskyblue: "ディープスカイブルー",
    dimgray: "ディムグレー", dimgrey: "ディムグレー", dodgerblue: "ドジャーブルー", firebrick: "ファイアブリック", floralwhite: "フローラルホワイト",
    forestgreen: "フォレストグリーン", fuchsia: "フューシャ", gainsboro: "ゲインズボロ", ghostwhite: "ゴーストホワイト", gold: "ゴールド", goldenrod: "ゴールデンロッド",
    gray: "グレー", green: "グリーン", greenyellow: "グリーンイエロー", grey: "グレー", honeydew: "ハニーデュー", hotpink: "ホットピンク",
    indianred: "インディアンレッド", indigo: "インディゴ", ivory: "アイボリー", khaki: "カーキ", lavender: "ラベンダー", lavenderblush: "ラベンダーブラッシュ",
    lawngreen: "ローングリーン", lemonchiffon: "レモンシフォン", lightblue: "ライトブルー", lightcoral: "ライトコーラル", lightcyan: "ライトシアン",
    lightgoldenrodyellow: "ライトゴールデンロッドイエロー", lightgray: "ライトグレー", lightgreen: "ライトグリーン", lightgrey: "ライトグレー", lightpink: "ライトピンク",
    lightsalmon: "ライトサーモン", lightseagreen: "ライトシーグリーン", lightskyblue: "ライトスカイブルー", lightslategray: "ライトスレートグレー",
    lightslategrey: "ライトスレートグレー", lightsteelblue: "ライトスチールブルー", lightyellow: "ライトイエロー", lime: "ライム", limegreen: "ライムグリーン",
    linen: "リネン", magenta: "マゼンタ", maroon: "マルーン", mediumaquamarine: "ミディアムアクアマリン", mediumblue: "ミディアムブルー",
    mediumorchid: "ミディアムオーキッド", mediumpurple: "ミディアムパープル", mediumseagreen: "ミディアムシーグリーン", mediumslateblue: "ミディアムスレートブルー",
    mediumspringgreen: "ミディアムスプリンググリーン", mediumturquoise: "ミディアムターコイズ", mediumvioletred: "ミディアムバイオレットレッド", midnightblue: "ミッドナイトブルー",
    mintcream: "ミントクリーム", mistyrose: "ミスティローズ", moccasin: "モカシン", navajowhite: "ナバホホワイト", navy: "ネイビー", oldlace: "オールドレース",
    olive: "オリーブ", olivedrab: "オリーブドラブ", orange: "オレンジ", orangered: "オレンジレッド", orchid: "オーキッド", palegoldenrod: "ペールゴールデンロッド",
    palegreen: "ペールグリーン", paleturquoise: "ペールターコイズ", palevioletred: "ペールバイオレットレッド", papayawhip: "パパイヤホイップ", peachpuff: "ピーチパフ",
    peru: "ペルー", pink: "ピンク", plum: "プラム", powderblue: "パウダーブルー", purple: "パープル", red: "レッド", rosybrown: "ロージーブラウン",
    royalblue: "ロイヤルブルー", saddlebrown: "サドルブラウン", salmon: "サーモン", sandybrown: "サンディブラウン", seagreen: "シーグリーン", seashell: "シーシェル",
    sienna: "シエナ", silver: "シルバー", skyblue: "スカイブルー", slateblue: "スレートブルー", slategray: "スレートグレー", slategrey: "スレートグレー",
    snow: "スノー", springgreen: "スプリンググリーン", steelblue: "スチールブルー", tan: "タン", teal: "ティール", thistle: "シスル", tomato: "トマト",
    turquoise: "ターコイズ", violet: "バイオレット", wheat: "ウィート", white: "ホワイト", whitesmoke: "ホワイトスモーク", yellow: "イエロー", yellowgreen: "イエローグリーン"
  };

  const state = {
    tab: "occupation",
    ruleType: "all",
    query: "",
    source: "すべて",
    selectedSkills: new Set(),
    selectedOccupationId: OCCUPATIONS[0]?.id || "",
    selectedPackageId: EXPERIENCE_PACKAGES[0]?.id || "",
    selectedFeatureId: FEATURES[0]?.id || "",
    selectedWeaponId: WEAPONS[0]?.id || "",
    selectedBelongingId: BELONGINGS[0]?.id || "",
    selectedThemeColorId: THEME_COLORS[0]?.id || "",
    weaponQuery: "",
    weaponCategory: "すべて",
    belongingQuery: "",
    selectedBelongingTags: new Set(),
    themeColorQuery: "",
    selectedThemeColorTags: new Set(),
    themePalette: [],
    featureCount: 3,
    rolledFeatures: FEATURES.slice(0, 3),
    skillExpanded: false,
    theme: "light",
    toastTimer: null,
  };

  const el = {
    usageToggle: document.getElementById("usageToggle"),
    shortcutToggle: document.getElementById("shortcutToggle"),
    usagePanel: document.getElementById("usagePanel"),
    shortcutPanel: document.getElementById("shortcutPanel"),
    themeToggle: document.getElementById("themeToggle"),
    sourceSelect: document.getElementById("sourceSelect"),
    keywordInput: document.getElementById("keywordInput"),
    skillChipTitle: document.getElementById("skillChipTitle"),
    skillExpandToggle: document.getElementById("skillExpandToggle"),
    skillChipArea: document.getElementById("skillChipArea"),
    clearSkillsButton: document.getElementById("clearSkillsButton"),
    occupationList: document.getElementById("occupationList"),
    occupationDetail: document.getElementById("occupationDetail"),
    featureResults: document.getElementById("featureResults"),
    featureDetail: document.getElementById("featureDetail"),
    rollFeaturesButton: document.getElementById("rollFeaturesButton"),
    packageList: document.getElementById("packageList"),
    packageDetail: document.getElementById("packageDetail"),
    weaponList: document.getElementById("weaponList"),
    weaponDetail: document.getElementById("weaponDetail"),
    weaponKeywordInput: document.getElementById("weaponKeywordInput"),
    weaponCategorySelect: document.getElementById("weaponCategorySelect"),
    belongingList: document.getElementById("belongingList"),
    belongingDetail: document.getElementById("belongingDetail"),
    belongingKeywordInput: document.getElementById("belongingKeywordInput"),
    belongingChipArea: document.getElementById("belongingChipArea"),
    clearBelongingTagsButton: document.getElementById("clearBelongingTagsButton"),
    themeColorKeywordInput: document.getElementById("themeColorKeywordInput"),
    themeColorChipArea: document.getElementById("themeColorChipArea"),
    clearThemeColorTagsButton: document.getElementById("clearThemeColorTagsButton"),
    themeColorGrid: document.getElementById("themeColorGrid"),
    themePaletteResult: document.getElementById("themePaletteResult"),
    themeRandomOneButton: document.getElementById("themeRandomOneButton"),
    themeRandomPaletteButton: document.getElementById("themeRandomPaletteButton"),
    themeCopyPaletteButton: document.getElementById("themeCopyPaletteButton"),
    outputText: document.getElementById("outputText"),
    copyOutputButton: document.getElementById("copyOutputButton"),
    clearOutputButton: document.getElementById("clearOutputButton"),
    leftColumnScrollTop: document.getElementById("leftColumnScrollTop"),
    toastContainer: document.getElementById("toastContainer"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
      .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"))
      .replace(/[／]/g, "/")
      .replace(/[・･]/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function sourceLabel(item) {
    return `${item.sourceShort || item.source || ""} ${item.page || ""}`.trim();
  }

  function optionParts(option) {
    if (typeof option === "string") return { label: option, options: [] };
    if (!option || typeof option !== "object") return { label: "", options: [] };

    return {
      label: option.label || "",
      options: Array.isArray(option.options) ? option.options.filter(Boolean) : [],
    };
  }

  function skillOptionText(option) {
    const { label, options } = optionParts(option);

    if (!label) return options.join(" / ");
    if (!options.length) return label;

    const normalizedLabel = normalizeText(label);
    const labelAlreadyIncludesAllOptions = options.every((skill) =>
      normalizedLabel.includes(normalizeText(skill))
    );

    if (labelAlreadyIncludesAllOptions) return label;

    return `${label}：${options.join(" / ")}`;
  }

  function skillOptionSearchTexts(option) {
    const { label, options } = optionParts(option);
    return [label, ...options].filter(Boolean);
  }

  function getOccupationSkillTexts(item) {
    return [
      ...(item.skills || []),
      ...((item.skillOptions || []).flatMap(skillOptionSearchTexts)),
    ];
  }

  function getOccupationCopySkills(item) {
    return [
      ...(item.skills || []),
      ...((item.skillOptions || []).map(skillOptionText).filter(Boolean)),
    ].join("、");
  }

  function getSkillAliases(skill) {
    return [skill, ...(SKILL_ALIASES[skill] || [])];
  }

  function skillTextMatchesChip(skillText, selectedSkill) {
    const normalizedText = normalizeText(skillText);

    return getSkillAliases(selectedSkill).some((alias) => {
      const normalizedAlias = normalizeText(alias);
      if (!normalizedAlias || !normalizedText) return false;
      return normalizedText.includes(normalizedAlias) || normalizedAlias.includes(normalizedText);
    });
  }

  function occupationMatchesSkill(item, selectedSkill) {
    return getOccupationSkillTexts(item).some((skillText) => skillTextMatchesChip(skillText, selectedSkill));
  }

  function getOccupationSkillMatchScore(item) {
    return [...state.selectedSkills].filter((skill) => occupationMatchesSkill(item, skill)).length;
  }

  function occupationMatchesSelectedSkills(item) {
    if (!state.selectedSkills.size) return true;
    return getOccupationSkillMatchScore(item) > 0;
  }

  function formatOccupation(item) {
    if (!item) return "";

    const lines = [];
    lines.push(`職業サンプル：${item.name} （${sourceLabel(item)}）`);
    lines.push(`職業技能：${(item.skills || []).join("、")}`);

    if (item.skillOptions?.length) {
      lines.push(`選択技能：${item.skillOptions.map(skillOptionText).filter(Boolean).join("、")}`);
    }

    lines.push(`職業技能ポイント：${item.pointFormula || ""}`);

    if (item.ruleType === "6e" && item.special) {
      lines.push(`職業特記：${item.special}`);
    }

    if ((item.ruleType === "7e" || item.ruleType === "pulp") && item.credit) {
      lines.push(`信用：${item.credit}`);
    }

    if (item.ruleType === "pulp" && item.alliesExample) {
      lines.push(`協力者の例：${item.alliesExample}`);
    }

    if (item.note) {
      lines.push(`備考：${item.note}`);
    }

    return lines.join("\n");
  }

  function formatFeature(item) {
    if (!item) return "";

    const lines = [`[${item.dice}]  ${item.name}`, `効果：${item.effect || ""}`];

    if (item.note) {
      lines.push(`注記：${item.note}`);
    }

    return lines.join("\n");
  }

  function isIndentedPackageNote(note) {
    return /^(一般兵士|士官|運転（|応急手当|医学、|人類学、|科学（|伝承（夢）|ほかの言語（夢語）|夢見)/.test(note);
  }

  function formatPackageNoteLine(note) {
    return `${isIndentedPackageNote(note) ? "　" : ""}・${note}`;
  }

  function formatPackage(item) {
    if (!item) return "";

    const notes = (item.notes || []).map(formatPackageNoteLine).join("\n");

    return `【経験パッケージ：${item.name}】
内容：${item.description || ""}
備考：
${notes}`;
  }


  function weaponCategoryLabel(item) {
    return [item.group, item.category].filter(Boolean).join(" / ");
  }

  function weaponRuleLabels(item) {
    return Array.isArray(item.ruleLabels) ? item.ruleLabels : [];
  }

  function weaponSkillLine(item) {
    const skill = item.skill || "―";
    const hit = item.hit || "―";
    const hitLabel = hit === "―" ? "―" : `${hit}%`;
    return `${skill}（${hitLabel}）`;
  }

  function weaponAmmunitionLine(item) {
    if (item.ammunition) return item.ammunition;
    const note = String(item.note || "");
    const match = note.match(/弾薬：([^\n]+)/);
    return match ? match[1].trim() : "";
  }

  function weaponDisplayNote(item) {
    return String(item.note || "")
      .replace(/(?:^|\n)弾薬：[^\n]+/g, "")
      .replace(/貫通武器。\s*弾薬：[^\n]+/g, "貫通武器。")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function weaponInfoBlockHtml(item, options = {}) {
    const showNote = Boolean(options.showNote);
    const showAmmoType = Boolean(options.showAmmoType);
    const note = weaponDisplayNote(item);
    const ammunition = weaponAmmunitionLine(item);

    return `
      <div class="weapon-info-block">
        <p>カテゴリ：${escapeHtml(weaponCategoryLabel(item) || "―")}</p>
        <p>技能：${escapeHtml(weaponSkillLine(item))}</p>
        <div class="weapon-compact-grid">
          <p>ダメージ：${escapeHtml(item.damage || "―")}</p>
          <p>基本射程：${escapeHtml(item.range || "―")}</p>
          <p>1Rの攻撃回数：${escapeHtml(item.attacks || "―")}</p>
          <p>装弾数：${escapeHtml(item.ammo || "―")}</p>
          <p>耐久力：${escapeHtml(item.durability || "―")}</p>
          <p>故障ナンバー：${escapeHtml(item.malfunction || "―")}</p>
          ${showAmmoType && ammunition ? `<p>弾薬：${escapeHtml(ammunition)}</p>` : ""}
        </div>
        ${showNote && note ? `<p class="weapon-note-line">備考：${escapeHtml(note)}</p>` : ""}
      </div>`;
  }

  function formatWeapon(item) {
    if (!item) return "";

    const lines = [];
    const ammunition = weaponAmmunitionLine(item);
    const note = weaponDisplayNote(item);
    lines.push(`【武器：${item.name}】`);
    if (item.description) lines.push(`説明：${item.description}`);
    lines.push(`カテゴリ：${weaponCategoryLabel(item) || "―"}`);
    lines.push(`技能：${weaponSkillLine(item)}`);
    lines.push(`ダメージ：${item.damage || "―"}　基本射程：${item.range || "―"}　1Rの攻撃回数：${item.attacks || "―"}`);
    lines.push(`装弾数：${item.ammo || "―"}　耐久力：${item.durability || "―"}　故障ナンバー：${item.malfunction || "―"}${ammunition ? `　弾薬：${ammunition}` : ""}`);
    if (sourceLabel(item)) lines.push(`出典：${sourceLabel(item)}`);
    if (note) lines.push(`備考：${note}`);
    return lines.join("\n");
  }

  function getWeaponCategories() {
    return ["すべて", ...Array.from(new Set(WEAPONS.map((item) => item.category).filter(Boolean)))];
  }

  function weaponMatchesRule(item) {
    return state.ruleType === "all" || item.ruleType === state.ruleType;
  }

  function getWeaponSearchText(item) {
    return [
      item.name,
      item.group,
      item.category,
      item.description,
      item.skill,
      item.hit,
      item.damage,
      item.range,
      item.attacks,
      item.ammo,
      item.ammunition,
      item.durability,
      item.malfunction,
      item.source,
      item.sourceShort,
      item.page,
      ...(item.tags || []),
      item.note,
    ].join(" ").toLowerCase();
  }

  function getFilteredWeapons() {
    const query = state.weaponQuery.trim().toLowerCase();

    return WEAPONS
      .filter(weaponMatchesRule)
      .filter((item) => state.weaponCategory === "すべて" || item.category === state.weaponCategory)
      .filter((item) => {
        if (!query) return true;
        return getWeaponSearchText(item).includes(query);
      });
  }


  function getBelongingSearchText(item) {
    return [item.name, item.category, item.description, item.note, ...(item.tags || []), ...(item.keywords || [])].join(" ").toLowerCase();
  }

  function belongingMatchesSelectedTags(item) {
    if (!state.selectedBelongingTags.size) return true;
    const tags = new Set(item.tags || []);
    return [...state.selectedBelongingTags].every((tag) => tags.has(tag));
  }

  function getFilteredBelongings() {
    const query = state.belongingQuery.trim().toLowerCase();
    return BELONGINGS.filter(belongingMatchesSelectedTags).filter((item) => !query || getBelongingSearchText(item).includes(query));
  }

  function formatBelonging(item) {
    if (!item) return "";
    return [`持ち物：${item.name}`, item.description || ""].filter(Boolean).join("\n");
  }


  function getThemeColorJapaneseName(item) {
    if (!item) return "";
    const group = String(item.group || "").trim();
    const displayName = String(item.displayName || item.name || "").trim();
    const englishName = String(item.englishName || item.name || "").trim();

    if (group === "原色") {
      const key = englishName.toLowerCase().replace(/\s+/g, "");
      return CSS_COLOR_JA_NAMES[key] || displayName || englishName;
    }

    return displayName || "";
  }

  function getThemeColorLabel(item) {
    if (!item) return "";
    const englishName = String(item.englishName || item.name || "").trim();
    const japaneseName = getThemeColorJapaneseName(item);

    if (englishName && japaneseName && englishName.toLowerCase() !== japaneseName.toLowerCase()) {
      return `${englishName} / ${japaneseName}`;
    }

    return japaneseName || englishName || "";
  }

  function getThemeColorSearchText(item) {
    return [
      item.name,
      item.displayName,
      getThemeColorJapaneseName(item),
      item.englishName,
      item.reading,
      item.hex,
      item.rgb,
      item.group,
      item.category,
      item.source,
      item.description,
      ...(item.tags || []),
      ...(item.keywords || []),
    ].join(" ").toLowerCase();
  }

  function themeColorMatchesSelectedTags(item) {
    if (!state.selectedThemeColorTags.size) return true;
    const tags = new Set([item.group, item.category, ...(item.tags || [])].filter(Boolean));
    return [...state.selectedThemeColorTags].every((tag) => tags.has(tag));
  }

  function getFilteredThemeColors() {
    const query = state.themeColorQuery.trim().toLowerCase();
    return THEME_COLORS
      .filter(themeColorMatchesSelectedTags)
      .filter((item) => !query || getThemeColorSearchText(item).includes(query))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function formatThemeColor(item) {
    if (!item) return "";
    return `テーマカラー：${getThemeColorLabel(item)}（${item.hex || ""}）`;
  }

  function formatThemePalette(items) {
    if (!items?.length) return "";
    const labels = ["メイン", "サブ", "アクセント"];
    return ["テーマカラー案：", ...items.map((item, index) => `${labels[index] || `色${index + 1}`}：${getThemeColorLabel(item)}（${item.hex || ""}）`)].join("\n");
  }

  function pickRandomThemeColors(count = 1) {
    const filtered = getFilteredThemeColors();
    const source = filtered.length ? filtered : THEME_COLORS;
    const pool = [...source];
    const picked = [];
    while (pool.length && picked.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  function appendOutput(text) {
    if (!text) return;
    const current = el.outputText.value.trim();
    el.outputText.value = current ? `${current}\n\n${text}` : text;
  }

  function getMetaLines(item) {
    const lines = [];

    if (item.ruleType === "6e" && item.special) {
      lines.push(["職業特記", item.special]);
    }

    if ((item.ruleType === "7e" || item.ruleType === "pulp") && item.credit) {
      lines.push(["信用", item.credit]);
    }

    if (item.ruleType === "pulp" && item.alliesExample) {
      lines.push(["協力者の例", item.alliesExample]);
    }

    return lines;
  }

  function getRuleLabel() {
    if (state.ruleType === "all") return "全て";
    if (state.ruleType === "6e") return "6版";
    if (state.ruleType === "7e") return "7版";
    return "パルプ";
  }

  function sourceMatches(item) {
    if (state.source === "すべて") return true;
    return item.source === state.source || item.sourceShort === state.source || (item.ruleLabels || []).includes(state.source);
  }

  function getSearchText(item) {
    const skillOptions = Array.isArray(item.skillOptions)
      ? item.skillOptions.flatMap(skillOptionSearchTexts)
      : [];

    return [
      item.name,
      item.description,
      item.source,
      item.sourceShort,
      ...(item.skills || []),
      ...skillOptions,
      ...(item.keywords || []),
      ...(item.ruleLabels || []),
      item.note,
      item.special,
      item.credit,
      item.alliesExample,
      item.pointFormula,
    ].join(" ").toLowerCase();
  }

  function getFilteredOccupations() {
    const query = state.query.trim().toLowerCase();

    const mapped = OCCUPATIONS.map((item) => ({
      ...item,
      score: getOccupationSkillMatchScore(item),
    }))
      .filter((item) => state.ruleType === "all" || item.ruleType === state.ruleType)
      .filter(sourceMatches)
      .filter(occupationMatchesSelectedSkills)
      .filter((item) => {
        if (!query) return true;
        return getSearchText(item).includes(query);
      });

    if (!state.selectedSkills.size) {
      return mapped;
    }

    return mapped.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
  }

  function ensureToastContainer() {
    if (el.toastContainer) return el.toastContainer;

    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
    el.toastContainer = container;
    return container;
  }

  function showToast(message, type = "success") {
    const container = ensureToastContainer();
    container.innerHTML = `<div class="toast toast-${escapeHtml(type)}">${escapeHtml(message)}</div>`;

    if (state.toastTimer) clearTimeout(state.toastTimer);

    state.toastTimer = window.setTimeout(() => {
      container.innerHTML = "";
      state.toastTimer = null;
    }, 1800);
  }

  async function copyText(text, successMessage = "コピーしました") {
    const value = String(text ?? "");

    if (!value.trim()) {
      showToast("コピーする内容がありません", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      const copied = document.execCommand("copy");
      temp.remove();
      showToast(copied ? successMessage : "コピーに失敗しました", copied ? "success" : "error");
    }
  }

  function renderSources() {
    el.sourceSelect.innerHTML = SOURCES.map((source) =>
      `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`
    ).join("");

    el.sourceSelect.value = state.source;
  }

  function renderSkillChips() {
    const chips = SKILL_CHIPS_BY_RULE[state.ruleType] || SKILL_CHIPS_BY_RULE.all;

    el.skillChipTitle.textContent = `技能チップ検索（${getRuleLabel()}）`;
    el.skillExpandToggle.textContent = state.skillExpanded ? "△ 最小化" : "▽ 展開";
    el.skillChipArea.classList.toggle("is-expanded", state.skillExpanded);
    el.skillChipArea.classList.toggle("is-collapsed", !state.skillExpanded);

    el.skillChipArea.innerHTML = chips.map((skill) => {
      const active = state.selectedSkills.has(skill) ? " is-active" : "";
      return `<button class="skill-chip${active}" type="button" data-skill="${escapeHtml(skill)}">${escapeHtml(skill)}</button>`;
    }).join("");
  }

  function renderRuleButtons() {
    document.querySelectorAll(".rule-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.rule === state.ruleType);
    });
  }

  function renderTabs() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.tab);
    });

    document.getElementById("occupationTab").classList.toggle("is-hidden", state.tab !== "occupation");
    document.getElementById("featureTab").classList.toggle("is-hidden", state.tab !== "feature");
    document.getElementById("packageTab").classList.toggle("is-hidden", state.tab !== "package");
    document.getElementById("weaponTab").classList.toggle("is-hidden", state.tab !== "weapon");
    document.getElementById("belongingTab").classList.toggle("is-hidden", state.tab !== "belonging");
    document.getElementById("themeColorTab").classList.toggle("is-hidden", state.tab !== "themeColor");
    document.querySelector(".main-grid")?.classList.toggle("is-theme-color-mode", state.tab === "themeColor");

    el.occupationDetail.classList.toggle("is-hidden", state.tab !== "occupation");
    el.featureDetail.classList.toggle("is-hidden", state.tab !== "feature");
    el.packageDetail.classList.toggle("is-hidden", state.tab !== "package");
    el.weaponDetail.classList.toggle("is-hidden", state.tab !== "weapon");
    el.belongingDetail.classList.toggle("is-hidden", state.tab !== "belonging");
  }

  function renderOccupationList() {
    const items = getFilteredOccupations();

    if (!items.length) {
      el.occupationList.innerHTML = `<div class="occupation-card"><p class="card-text">条件に一致する職業サンプルがありません。</p></div>`;
      el.occupationDetail.innerHTML = "";
      return;
    }

    const currentSelectedExists = items.some((item) => item.id === state.selectedOccupationId);
    if (!currentSelectedExists && items[0]) {
      state.selectedOccupationId = items[0].id;
    }

    el.occupationList.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedOccupationId ? " is-selected" : "";
      const meta = getMetaLines(item)
        .map(([label, value]) => `<p class="extra-line">${escapeHtml(label)}：${escapeHtml(value)}</p>`)
        .join("");
      const score = item.score > 0 ? `<span class="score-badge">技能一致 ${item.score}</span>` : "";
      const skillOptions = item.skillOptions?.length
        ? `<p class="card-text"><strong>選択技能：</strong>${escapeHtml(item.skillOptions.map(skillOptionText).filter(Boolean).join(" / "))}</p>`
        : "";

      return `
        <button class="occupation-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            <span class="source-line">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span>
            ${score}
          </div>
          <div class="card-content occupation-content">
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">技能：${escapeHtml((item.skills || []).join(" / "))}</p>
            ${skillOptions}
            ${meta}
            <p class="card-text">職業P：${escapeHtml(item.pointFormula || "")}</p>
          </div>
        </button>`;
    }).join("");
  }

  function renderOccupationDetail() {
    const item = OCCUPATIONS.find((occ) => occ.id === state.selectedOccupationId) || getFilteredOccupations()[0] || OCCUPATIONS[0];

    if (!item) {
      el.occupationDetail.innerHTML = "";
      return;
    }

    const meta = getMetaLines(item)
      .map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</p>`)
      .join("");

    const skillOptions = item.skillOptions?.length
      ? `<p><strong>選択技能</strong><br>${escapeHtml(item.skillOptions.map(skillOptionText).filter(Boolean).join(" / "))}</p>`
      : "";

    el.occupationDetail.innerHTML = `
      <div class="card-title-row">
        <h2>${escapeHtml(item.name)} <span class="source-line">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span></h2>
        <span class="score-badge">詳細</span>
      </div>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <p class="detail-text">${escapeHtml(item.description || "")}</p>
      <div class="detail-box occupation-detail-box">
        <p><strong>職業技能</strong><br>${escapeHtml((item.skills || []).join(" / "))}</p>
        ${skillOptions}
        <p><strong>職業技能ポイント</strong><br>${escapeHtml(item.pointFormula || "")}</p>
        ${meta}
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary" id="addOccupationButton" type="button">出力に追加</button>
        <button class="btn btn-soft" id="copySkillsButton" type="button">この職業技能をコピー</button>
      </div>`;

    document.getElementById("addOccupationButton")?.addEventListener("click", () => {
      appendOutput(formatOccupation(item));
    });

    document.getElementById("copySkillsButton")?.addEventListener("click", () => {
      copyText(getOccupationCopySkills(item), "職業技能をコピーしました");
    });
  }

  function normalizeDice(dice) {
    return String(dice || "").replace("-0", "-");
  }

  function rollFeatureDice() {
    const d6 = Math.floor(Math.random() * 6) + 1;
    const d10 = Math.floor(Math.random() * 10) + 1;
    return `${d6}-${d10}`;
  }

  function rollUniqueFeatures(count) {
    const results = [];
    const used = new Set();
    let guard = 0;

    while (results.length < count && guard < 300) {
      guard += 1;
      const dice = rollFeatureDice();
      if (used.has(dice)) continue;

      const feature = FEATURES.find((item) => normalizeDice(item.dice) === dice);
      if (!feature) continue;

      used.add(dice);
      results.push(feature);
    }

    if (results.length < count) {
      FEATURES.forEach((feature) => {
        const dice = normalizeDice(feature.dice);
        if (results.length < count && !used.has(dice)) {
          used.add(dice);
          results.push(feature);
        }
      });
    }

    return results;
  }

  function renderFeatureCountButtons() {
    document.querySelectorAll(".count-button").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.count) === state.featureCount);
    });
  }

  function renderFeatures() {
    const items = state.rolledFeatures.length ? state.rolledFeatures : FEATURES.slice(0, state.featureCount);

    if (!state.selectedFeatureId && items[0]) {
      state.selectedFeatureId = items[0].id;
    }

    el.featureResults.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedFeatureId ? " is-selected" : "";
      const note = item.note ? `<p class="feature-note">${escapeHtml(item.note)}</p>` : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");

      return `
        <div class="feature-card${selected}" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row">
            <h3 class="card-title">[${escapeHtml(item.dice)}] ${escapeHtml(item.name)}</h3>
            <span class="source-line">${escapeHtml(sourceLabel(item))}</span>
            ${tags}
          </div>
          <div class="card-content feature-content">
            <p class="card-text">効果：${escapeHtml(item.effect || "")}</p>
            ${note}
          </div>
          <button class="btn btn-soft add-feature-button" type="button" data-id="${escapeHtml(item.id)}">出力に追加</button>
        </div>`;
    }).join("");
  }

  function renderFeatureDetail() {
    const item = FEATURES.find((feature) => feature.id === state.selectedFeatureId) || state.rolledFeatures[0] || FEATURES[0];

    if (!item) {
      el.featureDetail.innerHTML = "";
      return;
    }

    state.selectedFeatureId = item.id;

    const note = item.note ? `<p class="feature-note feature-note-detail">${escapeHtml(item.note)}</p>` : "";
    const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");

    el.featureDetail.innerHTML = `
      <div class="card-title-row">
        <h2>[${escapeHtml(item.dice)}] ${escapeHtml(item.name)}</h2>
        ${tags}
      </div>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <div class="detail-box feature-detail-box">
        <p class="detail-text">効果：${escapeHtml(item.effect || "")}</p>
        ${note}
      </div>
      <button class="btn btn-primary" type="button" id="addFeatureDetailButton">出力に追加</button>`;

    document.getElementById("addFeatureDetailButton")?.addEventListener("click", () => {
      appendOutput(formatFeature(item));
    });
  }

  function renderPackageList() {
    if (!EXPERIENCE_PACKAGES.length) {
      el.packageList.innerHTML = `<div class="package-card"><p class="card-text">経験パッケージデータがありません。</p></div>`;
      return;
    }

    el.packageList.innerHTML = EXPERIENCE_PACKAGES.map((item) => {
      const selected = item.id === state.selectedPackageId ? " is-selected" : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");

      return `
        <button class="package-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            ${tags}
          </div>
          <div class="card-content package-content">
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">内容：${escapeHtml(item.description || "")}</p>
          </div>
        </button>`;
    }).join("");
  }

  function renderPackageDetail() {
    const item = EXPERIENCE_PACKAGES.find((pack) => pack.id === state.selectedPackageId) || EXPERIENCE_PACKAGES[0];

    if (!item) {
      el.packageDetail.innerHTML = "";
      return;
    }

    const notes = (item.notes || []).map((note) => `
      <div class="package-note${isIndentedPackageNote(note) ? " is-indented" : ""}">
        <span class="package-note-bullet">・</span>
        <span class="package-note-text">${escapeHtml(note)}</span>
      </div>`).join("");

    el.packageDetail.innerHTML = `
      <h2>${escapeHtml(item.name)}</h2>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <div class="detail-box package-detail-box">
        <p class="detail-text">内容：${escapeHtml(item.description || "")}</p>
        <div class="package-note-list">${notes}</div>
      </div>
      <button class="btn btn-primary" type="button" id="addPackageButton">出力に追加</button>`;

    document.getElementById("addPackageButton")?.addEventListener("click", () => {
      appendOutput(formatPackage(item));
    });
  }



  function renderBelongingChips() {
    if (!el.belongingChipArea) return;
    el.belongingChipArea.innerHTML = BELONGING_TAG_CHIPS.map((tag) => {
      const active = state.selectedBelongingTags.has(tag) ? " is-active" : "";
      return `<button class="belonging-chip${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    }).join("");
  }

  function renderBelongingList() {
    if (!el.belongingList) return;
    const items = getFilteredBelongings();
    if (!items.length) {
      el.belongingList.innerHTML = `<div class="belonging-card"><p class="card-text">条件に一致する持ち物がありません。</p></div>`;
      if (el.belongingDetail) el.belongingDetail.innerHTML = "";
      return;
    }
    if (!items.some((item) => item.id === state.selectedBelongingId) && items[0]) state.selectedBelongingId = items[0].id;
    el.belongingList.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedBelongingId ? " is-selected" : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
      const note = item.note ? `<p class="card-text belonging-note-short">備考：${escapeHtml(item.note)}</p>` : "";
      return `
        <button class="belonging-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row"><h3 class="card-title">${escapeHtml(item.name)}</h3>${tags}</div>
          <div class="card-content belonging-content">
            <p class="card-text">カテゴリ：${escapeHtml(item.category || "―")}</p>
            <p class="card-text">説明：${escapeHtml(item.description || "")}</p>
            ${note}
          </div>
        </button>`;
    }).join("");
  }

  function renderBelongingDetail() {
    if (!el.belongingDetail) return;
    const item = BELONGINGS.find((belonging) => belonging.id === state.selectedBelongingId) || getFilteredBelongings()[0] || BELONGINGS[0];
    if (!item) { el.belongingDetail.innerHTML = ""; return; }
    const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
    const note = item.note ? `<p class="detail-text belonging-note-line">備考：${escapeHtml(item.note)}</p>` : "";
    el.belongingDetail.innerHTML = `
      <div class="card-title-row"><h2>${escapeHtml(item.name)}</h2>${tags}</div>
      <div class="detail-box belonging-detail-box">
        <p class="detail-text">${escapeHtml(item.description || "")}</p>
        <p class="detail-text">カテゴリ：${escapeHtml(item.category || "―")}</p>
        ${note}
      </div>
      <button class="btn btn-primary" type="button" id="addBelongingButton">出力に追加</button>`;
    document.getElementById("addBelongingButton")?.addEventListener("click", () => appendOutput(formatBelonging(item)));
  }

  function renderThemeColorChips() {
    if (!el.themeColorChipArea) return;
    const tagButtons = THEME_COLOR_TAG_CHIPS.map((tag) => {
      const active = state.selectedThemeColorTags.has(tag) ? " is-active" : "";
      return `<button class="theme-color-chip${active}" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    }).join("");

    el.themeColorChipArea.innerHTML = `${tagButtons}<button class="theme-color-chip theme-color-chip-clear" type="button" data-action="clear-theme-tags">選択解除</button>`;
  }

  function renderThemePaletteResult() {
    if (!el.themePaletteResult) return;
    if (!state.themePalette.length) {
      el.themePaletteResult.innerHTML = "";
      return;
    }

    const labels = ["メイン", "サブ", "アクセント"];
    el.themePaletteResult.innerHTML = `
      <div class="palette-card">
        <div class="palette-title">ランダム配色案</div>
        <div class="palette-swatches">
          ${state.themePalette.map((item, index) => `
            <button class="palette-swatch" type="button" data-id="${escapeHtml(item.id)}" title="${escapeHtml(formatThemeColor(item))}">
              <span style="background:${escapeHtml(item.hex || "#ffffff")}"></span>
              <strong>${escapeHtml(getThemeColorLabel(item))}</strong>
              <code>${escapeHtml(item.hex || "")}</code>
              <small>${escapeHtml(labels[index] || `色${index + 1}`)}</small>
            </button>
          `).join("")}
        </div>
      </div>`;
  }

  function renderThemeColorGrid() {
    if (!el.themeColorGrid) return;
    const items = getFilteredThemeColors();

    if (!items.length) {
      el.themeColorGrid.innerHTML = `<div class="theme-empty-card">条件に一致するテーマカラーがありません。</div>`;
      return;
    }

    const grouped = THEME_COLOR_GROUP_ORDER
      .map((group) => ({ group, items: items.filter((item) => (item.group || "原色") === group) }))
      .filter((section) => section.items.length);

    el.themeColorGrid.innerHTML = grouped.map((section) => `
      <section class="theme-color-group-section">
        <div class="theme-color-group-head">
          <h3>${escapeHtml(section.group)}</h3>
          <span>${section.items.length} colors</span>
        </div>
        <div class="theme-color-five-grid">
          ${section.items.map((item) => {
            const tags = [item.group, ...(item.tags || []).filter((tag) => tag !== item.group)].slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
            const subName = item.reading ? `<small>${escapeHtml(item.reading)}</small>` : "";
            return `
              <article class="theme-color-card compact" data-id="${escapeHtml(item.id)}">
                <button class="color-preview" type="button" style="background:${escapeHtml(item.hex || "#ffffff")}" data-action="copy-theme" data-id="${escapeHtml(item.id)}" title="${escapeHtml(formatThemeColor(item))}"></button>
                <div class="color-body">
                  <div class="color-title-row">
                    <h3>${escapeHtml(getThemeColorLabel(item))}</h3>
                    <code>${escapeHtml(item.hex || "")}</code>
                  </div>
                  ${subName}
                  <div class="tag-list">${tags}</div>
                  <div class="theme-color-card-actions">
                    <button type="button" data-action="copy-code" data-id="${escapeHtml(item.id)}" title="カラーコードだけをコピーします（例：#8B0000）" aria-label="カラーコードだけをコピーします">コード</button>
                    <button type="button" data-action="copy-theme" data-id="${escapeHtml(item.id)}" title="テーマカラー表記をコピーします（例：テーマカラー：深紅（#8B0000））" aria-label="テーマカラー表記をコピーします">テーマ</button>
                    <button type="button" data-action="add-theme" data-id="${escapeHtml(item.id)}" title="キャラシ貼り付け用メモにテーマカラーを追加します" aria-label="キャラシ貼り付け用メモにテーマカラーを追加します">追加</button>
                  </div>
                </div>
              </article>`;
          }).join("")}
        </div>
      </section>`).join("");
  }

  function renderWeaponCategories() {
    if (!el.weaponCategorySelect) return;

    el.weaponCategorySelect.innerHTML = getWeaponCategories().map((category) =>
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ).join("");

    el.weaponCategorySelect.value = state.weaponCategory;
  }

  function renderWeaponList() {
    if (!el.weaponList) return;

    const items = getFilteredWeapons();

    if (!items.length) {
      el.weaponList.innerHTML = `<div class="weapon-card"><p class="card-text">条件に一致する武器がありません。</p></div>`;
      el.weaponDetail.innerHTML = "";
      return;
    }

    const currentSelectedExists = items.some((item) => item.id === state.selectedWeaponId);
    if (!currentSelectedExists && items[0]) {
      state.selectedWeaponId = items[0].id;
    }

    el.weaponList.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedWeaponId ? " is-selected" : "";
      const ruleTags = weaponRuleLabels(item).map((label) => `<span class="weapon-rule-tag">${escapeHtml(label)}</span>`).join("");
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");

      return `
        <button class="weapon-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row weapon-title-row">
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            ${ruleTags}
            ${tags}
          </div>
          <div class="card-content weapon-content">
            ${weaponInfoBlockHtml(item)}
          </div>
        </button>`;
    }).join("");
  }

  function renderWeaponDetail() {
    if (!el.weaponDetail) return;

    const item = WEAPONS.find((weapon) => weapon.id === state.selectedWeaponId) || getFilteredWeapons()[0] || WEAPONS[0];

    if (!item) {
      el.weaponDetail.innerHTML = "";
      return;
    }

    const ruleTags = weaponRuleLabels(item).map((label) => `<span class="weapon-rule-tag">${escapeHtml(label)}</span>`).join("");
    const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");

    el.weaponDetail.innerHTML = `
      <div class="card-title-row weapon-title-row">
        <h2>${escapeHtml(item.name)}</h2>
        ${ruleTags}
        ${tags}
      </div>
      ${item.description ? `<p class="weapon-description">${escapeHtml(item.description)}</p>` : ""}
      <div class="detail-box weapon-detail-box">
        ${weaponInfoBlockHtml(item, { showNote: true, showAmmoType: true })}
      </div>
      <button class="btn btn-primary" type="button" id="addWeaponButton">出力に追加</button>`;

    document.getElementById("addWeaponButton")?.addEventListener("click", () => {
      appendOutput(formatWeapon(item));
    });
  }

  function render() {
    renderTabs();
    renderRuleButtons();
    renderSkillChips();
    renderOccupationList();
    renderOccupationDetail();
    renderFeatureCountButtons();
    renderFeatures();
    renderFeatureDetail();
    renderPackageList();
    renderPackageDetail();
    renderBelongingChips();
    renderBelongingList();
    renderBelongingDetail();
    renderThemeColorChips();
    renderThemePaletteResult();
    renderThemeColorGrid();
    renderWeaponList();
    renderWeaponDetail();
  }

  function setActiveTab(tab) {
    if (!tab || state.tab === tab) return;
    state.tab = tab;
    render();
  }

  function moveTab(direction) {
    const tabs = Array.from(document.querySelectorAll(".tab-button"))
      .map((button) => button.dataset.tab)
      .filter(Boolean);
    if (!tabs.length) return;

    const currentIndex = Math.max(0, tabs.indexOf(state.tab));
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex]);
  }

  function toggleThemeMode() {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    document.body.classList.toggle("theme-light", state.theme === "light");
    el.themeToggle.textContent = state.theme === "dark" ? "ライトモード" : "ナイトモード";
    showToast(state.theme === "dark" ? "ナイトモードに変更しました" : "ライトモードに変更しました");
  }

  function toggleShortcutPanel() {
    el.shortcutPanel.classList.toggle("is-hidden");
    el.usagePanel.classList.add("is-hidden");
  }

  function focusCurrentSearchInput() {
    const searchInputByTab = {
      occupation: el.keywordInput,
      weapon: el.weaponKeywordInput,
      belonging: el.belongingKeywordInput,
      themeColor: el.themeColorKeywordInput,
    };
    const target = searchInputByTab[state.tab] || el.keywordInput;
    if (!target) return;
    target.focus();
    if (typeof target.select === "function") target.select();
    showToast("検索バーに移動しました");
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveTab(button.dataset.tab);
      });
    });

    document.querySelectorAll(".rule-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.ruleType = button.dataset.rule;
        state.selectedSkills.clear();
        render();
      });
    });

    el.sourceSelect.addEventListener("change", () => {
      state.source = el.sourceSelect.value;
      render();
    });

    el.keywordInput.addEventListener("input", () => {
      state.query = el.keywordInput.value;
      render();
    });

    el.skillExpandToggle.addEventListener("click", () => {
      state.skillExpanded = !state.skillExpanded;
      renderSkillChips();
    });

    el.clearSkillsButton.addEventListener("click", () => {
      state.selectedSkills.clear();
      render();
    });

    el.skillChipArea.addEventListener("click", (event) => {
      const button = event.target.closest(".skill-chip");
      if (!button) return;

      const skill = button.dataset.skill;

      if (state.selectedSkills.has(skill)) {
        state.selectedSkills.delete(skill);
      } else {
        state.selectedSkills.add(skill);
      }

      render();
    });

    el.occupationList.addEventListener("click", (event) => {
      const card = event.target.closest(".occupation-card[data-id]");
      if (!card) return;

      state.selectedOccupationId = card.dataset.id;
      render();
    });

    document.querySelectorAll(".count-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.featureCount = Number(button.dataset.count);
        renderFeatureCountButtons();
      });
    });

    el.rollFeaturesButton.addEventListener("click", () => {
      state.rolledFeatures = rollUniqueFeatures(state.featureCount);
      state.selectedFeatureId = state.rolledFeatures[0]?.id || FEATURES[0]?.id || "";
      render();
    });

    el.featureResults.addEventListener("click", (event) => {
      const addButton = event.target.closest(".add-feature-button");

      if (addButton) {
        const item = FEATURES.find((feature) => feature.id === addButton.dataset.id);
        appendOutput(formatFeature(item));
        return;
      }

      const card = event.target.closest(".feature-card[data-id]");
      if (!card) return;

      state.selectedFeatureId = card.dataset.id;
      render();
    });

    el.packageList.addEventListener("click", (event) => {
      const card = event.target.closest(".package-card[data-id]");
      if (!card) return;

      state.selectedPackageId = card.dataset.id;
      render();
    });

    el.weaponKeywordInput?.addEventListener("input", () => {
      state.weaponQuery = el.weaponKeywordInput.value;
      render();
    });

    el.weaponCategorySelect?.addEventListener("change", () => {
      state.weaponCategory = el.weaponCategorySelect.value;
      render();
    });

    el.weaponList?.addEventListener("click", (event) => {
      const card = event.target.closest(".weapon-card[data-id]");
      if (!card) return;

      state.selectedWeaponId = card.dataset.id;
      render();
    });


    el.belongingKeywordInput?.addEventListener("input", () => {
      state.belongingQuery = el.belongingKeywordInput.value;
      render();
    });

    el.clearBelongingTagsButton?.addEventListener("click", () => {
      state.selectedBelongingTags.clear();
      render();
    });

    el.belongingChipArea?.addEventListener("click", (event) => {
      const button = event.target.closest(".belonging-chip");
      if (!button) return;
      const tag = button.dataset.tag;
      if (state.selectedBelongingTags.has(tag)) state.selectedBelongingTags.delete(tag);
      else state.selectedBelongingTags.add(tag);
      render();
    });

    el.belongingList?.addEventListener("click", (event) => {
      const card = event.target.closest(".belonging-card[data-id]");
      if (!card) return;
      state.selectedBelongingId = card.dataset.id;
      render();
    });


    el.themeColorKeywordInput?.addEventListener("input", () => {
      state.themeColorQuery = el.themeColorKeywordInput.value;
      render();
    });

    el.clearThemeColorTagsButton?.addEventListener("click", () => {
      state.selectedThemeColorTags.clear();
      render();
    });

    el.themeColorChipArea?.addEventListener("click", (event) => {
      const button = event.target.closest(".theme-color-chip");
      if (!button) return;

      if (button.dataset.action === "clear-theme-tags") {
        state.selectedThemeColorTags.clear();
        render();
        return;
      }

      const tag = button.dataset.tag;
      if (!tag) return;
      if (state.selectedThemeColorTags.has(tag)) state.selectedThemeColorTags.delete(tag);
      else state.selectedThemeColorTags.add(tag);
      render();
    });

    el.themeRandomOneButton?.addEventListener("click", () => {
      const [item] = pickRandomThemeColors(1);
      if (!item) return;
      state.selectedThemeColorId = item.id;
      state.themePalette = [item];
      render();
      copyText(formatThemeColor(item), "ランダムテーマカラーをコピーしました");
    });

    el.themeRandomPaletteButton?.addEventListener("click", () => {
      state.themePalette = pickRandomThemeColors(3);
      render();
    });

    el.themeCopyPaletteButton?.addEventListener("click", () => {
      if (!state.themePalette.length) state.themePalette = pickRandomThemeColors(3);
      render();
      copyText(formatThemePalette(state.themePalette), "テーマカラーパレットをコピーしました");
    });

    el.themePaletteResult?.addEventListener("click", (event) => {
      const button = event.target.closest(".palette-swatch[data-id]");
      if (!button) return;
      const item = THEME_COLORS.find((color) => color.id === button.dataset.id);
      copyText(formatThemeColor(item), "テーマカラーをコピーしました");
    });

    el.themeColorGrid?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action][data-id]");
      if (!button) return;
      const item = THEME_COLORS.find((color) => color.id === button.dataset.id);
      if (!item) return;
      if (button.dataset.action === "copy-code") copyText(item.hex || "", "カラーコードをコピーしました");
      if (button.dataset.action === "copy-theme") copyText(formatThemeColor(item), "テーマカラーをコピーしました");
      if (button.dataset.action === "add-theme") appendOutput(formatThemeColor(item));
    });

    el.copyOutputButton.addEventListener("click", () => {
      copyText(el.outputText.value, "メモをコピーしました");
    });

    el.clearOutputButton.addEventListener("click", () => {
      el.outputText.value = "";
    });

    el.leftColumnScrollTop?.addEventListener("click", () => {
      document.querySelector(".left-column")?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    el.themeToggle.addEventListener("click", toggleThemeMode);

    el.usageToggle.addEventListener("click", () => {
      el.usagePanel.classList.toggle("is-hidden");
      el.shortcutPanel.classList.add("is-hidden");
    });

    el.shortcutToggle.addEventListener("click", toggleShortcutPanel);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isShiftShortcut = isCtrlOrCmd && event.shiftKey;

      if (event.key === "Escape") {
        el.usagePanel.classList.add("is-hidden");
        el.shortcutPanel.classList.add("is-hidden");
      }

      if (isShiftShortcut && key === "s") {
        event.preventDefault();
        toggleShortcutPanel();
      }

      if (isShiftShortcut && key === "c") {
        event.preventDefault();
        copyText(el.outputText.value, "メモをコピーしました");
      }

      if (isShiftShortcut && key === "t") {
        event.preventDefault();
        toggleThemeMode();
      }

      if (isShiftShortcut && event.key === "ArrowLeft") {
        event.preventDefault();
        moveTab(-1);
      }

      if (isShiftShortcut && event.key === "ArrowRight") {
        event.preventDefault();
        moveTab(1);
      }

      if (isShiftShortcut && key === "f") {
        event.preventDefault();
        focusCurrentSearchInput();
      }

      if (isCtrlOrCmd && event.key === "Enter") {
        event.preventDefault();
        copyText(el.outputText.value, "メモをコピーしました");
      }
    });
  }

  function init() {
    renderSources();
    renderWeaponCategories();
    el.outputText.value = "";
    el.outputText.placeholder = "「出力に追加」使用でテキストが表示されます。";
    document.body.classList.add("theme-light");
    bindEvents();
    render();
  }

  init();
})();
