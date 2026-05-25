(function () {
  "use strict";

  const NL = "\n";

  const INITIAL_6E = {
    "目星": 25, "聞き耳": 25, "図書館": 25, "回避": 0, "こぶし": 50, "キック": 25, "組み付き": 25, "頭突き": 10, "投擲": 25,
    "マーシャルアーツ": 1, "拳銃": 20, "サブマシンガン": 15, "ショットガン": 30, "マシンガン": 15, "ライフル": 25,
    "応急手当": 30, "鍵開け": 1, "隠す": 15, "隠れる": 10, "忍び歩き": 10, "写真術": 10, "精神分析": 1, "追跡": 10, "登攀": 40,
    "運転": 20, "機械修理": 20, "重機械操作": 1, "乗馬": 5, "水泳": 25, "製作": 5, "操縦": 1, "跳躍": 25, "電気修理": 10,
    "ナビゲート": 10, "変装": 1, "言いくるめ": 5, "信用": 15, "説得": 15, "値切り": 5, "医学": 5, "オカルト": 5, "化学": 1,
    "芸術": 5, "経理": 10, "考古学": 1, "コンピューター": 1, "心理学": 5, "人類学": 1, "生物学": 1, "地質学": 1,
    "電子工学": 1, "天文学": 1, "博物学": 10, "物理学": 1, "法律": 5, "薬学": 1, "歴史": 20
  };

  const INITIAL_7E = {
    "目星": 25, "聞き耳": 20, "図書館": 20, "回避": 0, "近接戦闘": 25, "近接戦闘：格闘": 25, "投擲": 20,
    "射撃：拳銃": 20, "射撃：サブマシンガン": 15, "射撃：重火器": 10, "射撃：マシンガン": 10, "射撃：ライフル": 25, "射撃：ショットガン": 25,
    "応急手当": 30, "鍵開け": 1, "手さばき": 10, "隠密": 20, "精神分析": 1, "追跡": 10, "登攀": 20, "鑑定": 5,
    "運転": 20, "機械修理": 10, "重機械操作": 1, "乗馬": 5, "水泳": 20, "製作": 5, "操縦": 1, "跳躍": 20,
    "電気修理": 10, "ナビゲート": 10, "変装": 5, "ダイビング": 1, "言いくるめ": 5, "説得": 10, "威圧": 15, "魅惑": 15,
    "医学": 1, "オカルト": 5, "芸術": 5, "経理": 5, "考古学": 1, "コンピューター": 5, "科学": 1, "心理学": 10,
    "人類学": 1, "電子工学": 1, "自然": 10, "法律": 5, "歴史": 5, "サバイバル": 10, "伝承": 1
  };

  const CATEGORY_6E = {
    dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
    explore: ["目星", "聞き耳", "図書館"],
    combat: ["回避", "こぶし", "キック", "組み付き", "頭突き", "投擲", "マーシャルアーツ", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"],
    action: ["応急手当", "鍵開け", "隠す", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装"],
    social: ["言いくるめ", "信用", "説得", "値切り", "語"],
    knowledge: ["医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "心理学", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史", "クトゥルフ神話技能"]
  };

  const CATEGORY_7E = {
    dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
    explore: ["目星", "聞き耳", "図書館"],
    combat: ["回避", "近接戦闘", "投擲", "射撃", "砲"],
    action: ["応急手当", "鍵開け", "手さばき", "隠密", "精神分析", "追跡", "登攀", "鑑定", "運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装", "ダイビング"],
    social: ["言いくるめ", "説得", "威圧", "魅惑", "信用", "語"],
    knowledge: ["言語", "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "心理学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル", "伝承", "クトゥルフ神話技能"]
  };

  const SECTION_LABELS = {
    dice: "◼️ダイス",
    explore: "🟦探索技能",
    combat: "🟥戦闘技能",
    action: "🟧行動技能",
    social: "🟪交渉・対人技能",
    knowledge: "⬜️知識技能",
    damage: "🩸ダメージ・武器",
    other: "========その他 / 未分類========",
    initial: "========初期値========",
    status: "========能力値========",
    params: "=====パラメータ化====="
  };

  const MELEE_ALIAS_7E = {
    "格闘": "近接戦闘：格闘", "こぶし": "近接戦闘：格闘", "キック": "近接戦闘：格闘", "組み付き": "近接戦闘：格闘", "頭突き": "近接戦闘：格闘",
    "ナイフ": "近接戦闘：格闘", "小型ナイフ": "近接戦闘：格闘", "大きなナイフ": "近接戦闘：格闘", "包丁": "近接戦闘：格闘", "棍棒": "近接戦闘：格闘",
    "斧": "近接戦闘：斧", "手斧": "近接戦闘：斧", "チェーンソー": "近接戦闘：チェーンソー", "フレイル": "近接戦闘：フレイル",
    "刀剣": "近接戦闘：刀剣", "剣": "近接戦闘：刀剣", "刀": "近接戦闘：刀剣", "日本刀": "近接戦闘：刀剣", "木刀": "近接戦闘：刀剣", "竹刀": "近接戦闘：刀剣", "短剣": "近接戦闘：刀剣", "ダガー": "近接戦闘：刀剣",
    "鞭": "近接戦闘：鞭", "ムチ": "近接戦闘：鞭"
  };

  function normalizeText(text) {
    return String(text || "").replaceAll("\\n", "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function getSkillFromLine(line) {
    const text = String(line || "");
    const start = text.indexOf("【");
    const end = text.indexOf("】", start + 1);
    return start < 0 || end < 0 ? "" : text.slice(start + 1, end).trim();
  }

  function normalizeSkillName(skillName) {
    let skill = String(skillName || "")
      .trim()
      .replaceAll("：", ":")
      .replaceAll("（", "(")
      .replaceAll("）", ")")
      .replaceAll("【", "")
      .replaceAll("】", "");

    if (skill.startsWith("技能:")) skill = skill.slice(3).trim();
    if (skill === "クトゥルフ神話") return "クトゥルフ神話技能";

    const parenStart = skill.indexOf("(");
    if (parenStart >= 0) {
      const base = skill.slice(0, parenStart).trim();
      const sub = skill.slice(parenStart + 1).replace(")", "").trim();
      return base && sub ? `${base}：${sub}` : base;
    }

    const colonIndex = skill.indexOf(":");
    if (colonIndex >= 0) {
      const base = skill.slice(0, colonIndex).trim();
      const sub = skill.slice(colonIndex + 1).trim();
      return base && sub ? `${base}：${sub}` : base;
    }

    return skill.trim();
  }

  function normalizeSkillForEdition(skillName, edition) {
    const skill = normalizeSkillName(skillName);
    if (edition !== "7e") return skill;
    if (MELEE_ALIAS_7E[skill]) return MELEE_ALIAS_7E[skill];

    if (skill.includes("：")) {
      const [base, ...rest] = skill.split("：");
      const sub = rest.join("：").trim();
      if (base.trim() === "近接戦闘" && MELEE_ALIAS_7E[sub]) return MELEE_ALIAS_7E[sub];
    }

    return skill;
  }

  function detectEdition(commands) {
    const text = normalizeText(commands);
    const names = text.split("\n").map(getSkillFromLine).map(normalizeSkillName).filter(Boolean);
    const sevenWords = ["近接戦闘", "射撃", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "伝承", "威圧", "魅惑", "ダイビング", "読唇術"];
    const sixWords = ["こぶし", "キック", "組み付き", "頭突き", "マーシャルアーツ", "隠す", "隠れる", "忍び歩き", "写真術", "値切り", "博物学", "薬学", "物理学", "天文学", "生物学", "地質学"];

    let score7 = text.includes("CC<=") ? 1 : 0;
    let score6 = text.includes("CCB<=") ? 1 : 0;

    names.forEach((skill) => {
      if (sevenWords.some((word) => skill.includes(word))) score7 += 2;
      if (sixWords.some((word) => skill.includes(word))) score6 += 2;
    });

    if (text.includes("射撃：") || text.includes("射撃:")) score7 += 2;
    return score7 > score6 ? "7e" : "6e";
  }

  function getValueFromLine(line) {
    const text = String(line || "");
    const marker = ["<=", "＜=", "<＝", "≦"].find((item) => text.includes(item));
    if (!marker) return "";
    const after = text.slice(text.indexOf(marker) + marker.length).trim();
    let value = "";
    for (const char of after) {
      if (char === " " || char === "　" || char === "【") break;
      value += char;
    }
    return value;
  }

  function normalizeCommand(line, edition) {
    const trimmed = String(line || "").trim();
    const command = edition === "6e" ? "CCB" : "CC";

    if (edition === "7e" && trimmed.toLowerCase().startsWith("1d100<=")) {
      return `CC${trimmed.slice(5)}`;
    }

    for (const prefix of ["sCCB", "sCC", "CCB", "CC"]) {
      if (trimmed.startsWith(`${prefix}<=`)) {
        return `${command}${trimmed.slice(prefix.length)}`;
      }
    }

    return trimmed;
  }

  function normalizeSkillLine(line, edition) {
    const commandLine = normalizeCommand(line, edition);
    const start = commandLine.indexOf("【");
    const end = commandLine.indexOf("】", start + 1);

    if (start < 0 || end < 0) return commandLine;

    const skill = normalizeSkillForEdition(commandLine.slice(start + 1, end), edition);
    return `${commandLine.slice(0, start + 1)}${skill}${commandLine.slice(end)}`;
  }

  function isAbilityRollLabel(skill) {
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].some((stat) =>
      normalized === stat || normalized === `${stat}×5` || normalized === `${stat}X5` || normalized === `${stat}*5`
    );
  }

  function hasNumber(text) {
    return String(text || "").split("").some((char) => char >= "0" && char <= "9");
  }

  function parseCommandLine(line, edition) {
    const rawSkill = getSkillFromLine(line);
    const skill = normalizeSkillForEdition(rawSkill, edition);
    const hasCommand = ["CC<=", "CCB<=", "sCC<=", "sCCB<=", "1D100", "1d100"].some((token) => line.includes(token));
    const upper = String(line || "").toUpperCase();

    if (rawSkill && hasCommand && isAbilityRollLabel(skill)) return { type: "status", line };
    if (rawSkill && hasCommand) return { type: "skill", line: normalizeSkillLine(line, edition), rawSkill, skill, value: getValueFromLine(line) };

    if (["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN"].some((stat) => upper.startsWith(`${stat}:`) || upper.startsWith(`${stat}：`))) {
      return { type: "status", line };
    }

    if ((upper.includes("D") && hasNumber(line)) || line.includes("ダメージ") || upper.includes("DB")) {
      return { type: "damage", line };
    }

    return { type: "other", line };
  }

  function categorizeSkill(skill, rawSkill, edition) {
    const table = edition === "7e" ? CATEGORY_7E : CATEGORY_6E;
    const target = `${skill} ${rawSkill}`;

    if (target.includes("語")) return "social";

    for (const key of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
      if (table[key].some((word) => target.includes(word))) return key;
    }

    return "other";
  }

  function addUnique(list, line, seen) {
    const key = String(line || "").trim();
    if (!key || seen.has(key)) return;
    list.push(key);
    seen.add(key);
  }

  function sortSection(lines, order) {
    return [...lines].sort((a, b) => {
      const aSkill = normalizeSkillName(getSkillFromLine(a));
      const bSkill = normalizeSkillName(getSkillFromLine(b));
      const ai = order.findIndex((word) => aSkill.includes(word));
      const bi = order.findIndex((word) => bSkill.includes(word));
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
  }

  function lineForSkill(edition, value, skill) {
    return `${edition === "6e" ? "CCB" : "CC"}<=${value} 【${skill}】`;
  }

  function removeDuplicatedCombatLines(buckets, edition) {
    if (edition === "7e" && buckets.combat.some((line) => normalizeSkillName(getSkillFromLine(line)).startsWith("近接戦闘："))) {
      buckets.combat = buckets.combat.filter((line) => normalizeSkillName(getSkillFromLine(line)) !== "近接戦闘");
    }

    if (edition === "6e") {
      const specialized = new Set(
        buckets.combat
          .filter((line) => normalizeSkillName(getSkillFromLine(line)).includes("："))
          .map((line) => normalizeSkillName(getSkillFromLine(line)).split("：")[0])
      );

      if (specialized.size) {
        buckets.combat = buckets.combat.filter((line) => {
          const skill = normalizeSkillName(getSkillFromLine(line));
          return skill.includes("：") || !specialized.has(skill);
        });
      }
    }
  }

  function injectCoreLines(buckets, present, edition, seen) {
    const initial = edition === "7e" ? INITIAL_7E : INITIAL_6E;
    const command = edition === "6e" ? "CCB" : "CC";

    if (!buckets.dice.some((line) => line.includes("【正気度ロール】") || line.includes("【SAN】"))) {
      addUnique(buckets.dice, edition === "6e" ? "1d100<={SAN} 【正気度ロール】" : `${command}<={SAN} 【正気度ロール】`, seen);
    }

    if (edition === "7e" && !buckets.dice.some((line) => line.includes("【幸運】"))) {
      addUnique(buckets.dice, `${command}<={幸運} 【幸運】`, seen);
    }

    ["図書館", "聞き耳", "目星"].forEach((skill) => {
      if (!buckets.explore.some((line) => line.includes(`【${skill}】`))) {
        buckets.explore.unshift(lineForSkill(edition, present.get(skill) || initial[skill], skill));
      }
    });

    if (!buckets.combat.some((line) => line.includes("【回避】"))) {
      buckets.combat.unshift(lineForSkill(edition, present.get("回避") || initial["回避"] || 0, "回避"));
    }

    if (edition === "7e" && !buckets.combat.some((line) => normalizeSkillName(getSkillFromLine(line)).startsWith("近接戦闘"))) {
      buckets.combat.unshift(lineForSkill(edition, present.get("近接戦闘") || 25, "近接戦闘"));
    }
  }

  function buildInitialLines(present, edition) {
    const initial = edition === "7e" ? INITIAL_7E : INITIAL_6E;
    const skip = new Set(["目星", "聞き耳", "図書館", "回避", "幸運", "正気度ロール", "SAN", "アイデア", "知識"]);

    if (edition === "7e") skip.add("近接戦闘");

    return Object.entries(initial)
      .filter(([skill]) => !skip.has(skill) && !present.has(skill))
      .map(([skill, value]) => lineForSkill(edition, value, skill));
  }

  function normalizeAbilityRoll(line, edition) {
    const skill = normalizeSkillName(getSkillFromLine(line));
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
    const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find((candidate) =>
      normalized === candidate || normalized === `${candidate}×5` || normalized === `${candidate}X5` || normalized === `${candidate}*5`
    );

    if (!stat) return String(line || "").trim();

    return edition === "6e" ? `CCB<={${stat}}*5 【${stat} × 5】` : lineForSkill(edition, `{${stat}}`, stat);
  }

  function buildStatusLines(edition) {
    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].map((stat) =>
      edition === "6e" ? `CCB<={${stat}}*5 【${stat} × 5】` : lineForSkill(edition, `{${stat}}`, stat)
    );
  }

  function mergeStatusLines(existingLines, defaultLines) {
    const merged = [];
    const seenStats = new Set();

    existingLines.concat(defaultLines).forEach((line) => {
      const skill = normalizeSkillName(getSkillFromLine(line));
      const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
      const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find((candidate) =>
        normalized === candidate || normalized === `${candidate}×5` || normalized === `${candidate}X5` || normalized === `${candidate}*5`
      );

      if (!stat || seenStats.has(stat)) return;

      merged.push(line);
      seenStats.add(stat);
    });

    return merged;
  }

  function buildParamLines(present, edition) {
    const initial = edition === "7e" ? INITIAL_7E : INITIAL_6E;
    const skills = edition === "6e"
      ? ["アイデア", "幸運", "知識", "目星", "聞き耳", "図書館", "回避", "こぶし"]
      : ["アイデア", "知識", "目星", "聞き耳", "図書館", "回避", "近接戦闘"];

    return skills.map((skill) => `//${skill} = ${present.get(skill) || initial[skill] || 0}`);
  }

  function pushSection(output, label, lines) {
    if (!lines || !lines.length) return;
    if (output.length) output.push("");
    output.push(label, ...lines);
  }

  function buildPaletteOutput(commands, edition) {
    const buckets = {
      dice: [],
      explore: [],
      combat: [],
      action: [],
      social: [],
      knowledge: [],
      damage: [],
      status: [],
      other: []
    };

    const present = new Map();
    const seen = new Set();

    normalizeText(commands)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parsed = parseCommandLine(line, edition);

        if (parsed.type === "skill") {
          if (parsed.value) present.set(parsed.skill, parsed.value);
          addUnique(buckets[categorizeSkill(parsed.skill, parsed.rawSkill, edition)], parsed.line, seen);
        } else if (parsed.type === "status") {
          addUnique(buckets.status, normalizeAbilityRoll(parsed.line, edition), seen);
        } else if (parsed.type === "damage") {
          addUnique(buckets.damage, parsed.line, seen);
        } else {
          addUnique(buckets.other, parsed.line, seen);
        }
      });

    removeDuplicatedCombatLines(buckets, edition);
    injectCoreLines(buckets, present, edition, seen);
    removeDuplicatedCombatLines(buckets, edition);

    const orderTable = edition === "7e" ? CATEGORY_7E : CATEGORY_6E;

    ["dice", "explore", "combat", "action", "social", "knowledge"].forEach((key) => {
      buckets[key] = sortSection(buckets[key], orderTable[key]);
    });

    const output = [];

    pushSection(output, SECTION_LABELS.dice, buckets.dice);
    pushSection(output, SECTION_LABELS.explore, buckets.explore);
    pushSection(output, SECTION_LABELS.combat, buckets.combat);
    pushSection(output, SECTION_LABELS.action, buckets.action);
    pushSection(output, SECTION_LABELS.social, buckets.social);
    pushSection(output, SECTION_LABELS.knowledge, buckets.knowledge);
    pushSection(output, SECTION_LABELS.damage, buckets.damage);
    pushSection(output, SECTION_LABELS.other, buckets.other);
    pushSection(output, SECTION_LABELS.initial, buildInitialLines(present, edition));
    pushSection(output, SECTION_LABELS.status, mergeStatusLines(buckets.status, buildStatusLines(edition)));
    pushSection(output, SECTION_LABELS.params, buildParamLines(present, edition));

    return output.join("\n").trim();
  }

  window.ChatPaletteParser = {
    normalizeText,
    detectEdition,
    buildPaletteOutput
  };
})();
