const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

const INITIAL_6E = {
  "こぶし": 50, "キック": 25, "組み付き": 25, "頭突き": 10, "投擲": 25,
  "マーシャルアーツ": 1, "拳銃": 20, "サブマシンガン": 15, "ショットガン": 30, "マシンガン": 15, "ライフル": 25,
  "応急手当": 30, "鍵開け": 1, "隠す": 15, "隠れる": 10, "忍び歩き": 10, "写真術": 10,
  "精神分析": 1, "追跡": 10, "登攀": 40, "運転": 20, "機械修理": 20, "重機械操作": 1,
  "乗馬": 5, "水泳": 25, "製作": 5, "操縦": 1, "跳躍": 25, "電気修理": 10, "ナビゲート": 10, "変装": 1,
  "言いくるめ": 5, "信用": 15, "説得": 15, "値切り": 5,
  "医学": 5, "オカルト": 5, "化学": 1, "芸術": 5, "経理": 10, "考古学": 1, "コンピューター": 1,
  "心理学": 5, "人類学": 1, "生物学": 1, "地質学": 1, "電子工学": 1, "天文学": 1, "博物学": 10,
  "物理学": 1, "法律": 5, "薬学": 1, "歴史": 20,
  "目星": 25, "聞き耳": 25, "図書館": 25
};

const INITIAL_7E = {
  "目星": 25, "聞き耳": 20, "図書館": 20, "近接戦闘": 25, "投擲": 20,
  "射撃：拳銃": 20, "射撃：サブマシンガン": 15, "射撃：重火器": 10, "射撃：マシンガン": 10,
  "射撃：ライフル": 25, "射撃：ショットガン": 25, "射撃：弓": 15,
  "応急手当": 30, "鍵開け": 1, "手さばき": 10, "隠密": 20, "精神分析": 1, "追跡": 10, "登攀": 20,
  "鑑定": 5, "運転": 20, "機械修理": 10, "重機械操作": 1, "乗馬": 5, "水泳": 20, "製作": 5,
  "操縦": 1, "跳躍": 20, "電気修理": 10, "ナビゲート": 10, "変装": 5, "ダイビング": 1,
  "言いくるめ": 5, "説得": 10, "威圧": 15, "魅惑": 15,
  "医学": 1, "オカルト": 5, "芸術": 5, "経理": 5, "考古学": 1, "コンピューター": 5, "科学": 1,
  "心理学": 10, "人類学": 1, "電子工学": 1, "自然": 10, "法律": 5, "歴史": 5, "サバイバル": 10, "伝承": 1
};

const CATEGORY_6E = {
  dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
  explore: ["目星", "聞き耳", "図書館"],
  combat: ["回避", "こぶし", "キック", "組み付き", "頭突き", "投擲", "マーシャルアーツ", "日本刀", "日本刀：太刀", "日本刀：短刀", "メイス", "ノコギリナタ", "ナタ", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"],
  action: ["応急手当", "鍵開け", "隠す", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "運転", "機械修理", "重機械操作", "乗馬", "水泳", "製作", "操縦", "跳躍", "電気修理", "ナビゲート", "変装"],
  social: ["言いくるめ", "信用", "説得", "値切り", "語"],
  knowledge: ["医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "心理学", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史", "クトゥルフ神話技能"]
};

const CATEGORY_7E = {
  dice: ["正気度ロール", "SAN", "アイデア", "幸運", "知識"],
  explore: ["目星", "聞き耳", "図書館"],
  combat: ["回避", "近接戦闘", "日本刀", "メイス", "ノコギリナタ", "ナタ", "投擲", "射撃", "砲"],
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
  "格闘": "近接戦闘：格闘",
  "こぶし": "近接戦闘：格闘",
  "キック": "近接戦闘：格闘",
  "組み付き": "近接戦闘：格闘",
  "頭突き": "近接戦闘：格闘",
  "ナイフ": "近接戦闘：格闘",
  "小型ナイフ": "近接戦闘：格闘",
  "大きなナイフ": "近接戦闘：格闘",
  "包丁": "近接戦闘：格闘",
  "棍棒": "近接戦闘：格闘",
  "警棒": "近接戦闘：格闘",
  "バット": "近接戦闘：格闘",
  "杖": "近接戦闘：格闘",
  "斧": "近接戦闘：斧",
  "手斧": "近接戦闘：斧",
  "チェーンソー": "近接戦闘：チェーンソー",
  "フレイル": "近接戦闘：フレイル",
  "絞殺ひも": "近接戦闘：絞殺ひも",
  "絞殺紐": "近接戦闘：絞殺ひも",
  "ガロット": "近接戦闘：絞殺ひも",
  "刀剣": "近接戦闘：刀剣",
  "剣": "近接戦闘：刀剣",
  "刀": "近接戦闘：刀剣",
  "日本刀": "近接戦闘：刀剣", "日本刀：太刀": "近接戦闘：刀剣", "日本刀：短刀": "近接戦闘：刀剣",
  "木刀": "近接戦闘：刀剣",
  "竹刀": "近接戦闘：刀剣",
  "サーベル": "近接戦闘：刀剣",
  "レイピア": "近接戦闘：刀剣",
  "短剣": "近接戦闘：刀剣",
  "ダガー": "近接戦闘：刀剣",
  "メイス": "近接戦闘：格闘",
  "ノコギリナタ": "近接戦闘：刀剣",
  "ナタ": "近接戦闘：刀剣",
  "鞭": "近接戦闘：鞭",
  "ムチ": "近接戦闘：鞭"
};

window.ChatPaletteParser = (() => {
  function normalizeText(text) {
    return String(text || "")
      .split(BS + "n").join(NL)
      .split(String.fromCharCode(13, 10)).join(NL)
      .split(String.fromCharCode(13)).join(NL);
  }

  function includesPaletteWords(text) {
    return ["CCB", "CC", "1D100", "1d100", "SAN", "正気度", "目星", "聞き耳", "図書館", "近接戦闘", "こぶし", "幸運"]
      .some(word => String(text || "").includes(word));
  }

  function findByKeys(obj, keys, requirePalette) {
    const visited = new Set();

    function search(value) {
      if (!value || typeof value !== "object" || visited.has(value)) return "";
      visited.add(value);

      for (const key of keys) {
        if (typeof value[key] === "string" && (!requirePalette || includesPaletteWords(value[key]))) {
          return value[key];
        }
      }

      for (const child of Object.values(value)) {
        if (typeof child === "string" && requirePalette && includesPaletteWords(child)) return child;

        if (child && typeof child === "object") {
          const result = search(child);
          if (result) return result;
        }
      }

      return "";
    }

    return search(obj);
  }

  function extractPaletteText(rawInput) {
    const trimmed = rawInput.trim();

    if (!trimmed) return { text: "", source: "empty" };

    try {
      const json = JSON.parse(trimmed);

      return {
        text: normalizeText(findByKeys(json, ["commands", "chatPalette", "chat_palette", "palette", "memo", "command"], true)),
        source: "json"
      };
    } catch (error) {
      return {
        text: normalizeText(trimmed),
        source: "text"
      };
    }
  }

  function normalizeSkillName(skillName) {
    let skill = String(skillName || "").trim();

    if (skill.startsWith("技能：") || skill.startsWith("技能:")) {
      skill = skill.slice(3).trim();
    }

    skill = skill
      .replaceAll("：", ":")
      .replaceAll("（", "(")
      .replaceAll("）", ")")
      .replaceAll("【", "")
      .replaceAll("】", "")
      .trim();

    while (skill.endsWith(")") && countChar(skill, "(") < countChar(skill, ")")) {
      skill = skill.slice(0, -1).trim();
    }

    if (skill === "クトゥルフ神話") return "クトゥルフ神話技能";
    if (skill === "クトゥルフ神話技能") return skill;

    const parenStart = skill.indexOf("(");

    if (parenStart >= 0) {
      const parenEnd = skill.indexOf(")", parenStart + 1);
      const base = skill.slice(0, parenStart).trim();
      const sub = skill.slice(parenStart + 1, parenEnd >= 0 ? parenEnd : skill.length).trim();

      if (base && sub) return base + "：" + sub;
      if (base) return base;
    }

    const colonIndex = skill.indexOf(":");

    if (colonIndex >= 0) {
      const base = skill.slice(0, colonIndex).trim();
      const sub = skill.slice(colonIndex + 1).trim();

      if (base && sub) return base + "：" + sub;
      if (base) return base;
    }

    return skill;
  }

  function normalizeSkillNameForEdition(skillName, edition) {
    const skill = normalizeSkillName(skillName);

    if (edition !== "7e") return skill;
    if (skill === "近接戦闘" || skill === "射撃" || skill === "回避") return skill;

    if ([
      "近接戦闘：格闘",
      "近接戦闘：斧",
      "近接戦闘：チェーンソー",
      "近接戦闘：フレイル",
      "近接戦闘：絞殺ひも",
      "近接戦闘：刀剣",
      "近接戦闘：鞭"
    ].includes(skill)) {
      return skill;
    }

    if (MELEE_ALIAS_7E[skill]) return MELEE_ALIAS_7E[skill];

    if (skill.includes("：")) {
      const parts = skill.split("：");
      const base = parts[0].trim();
      const sub = parts.slice(1).join("：").trim();

      if (base === "近接戦闘" && MELEE_ALIAS_7E[sub]) {
        return MELEE_ALIAS_7E[sub];
      }
      if (MELEE_ALIAS_7E[skill]) {
        return MELEE_ALIAS_7E[skill];
      }
      if (MELEE_ALIAS_7E[base]) {
        return MELEE_ALIAS_7E[base];
      }
    }

    return skill;
  }

  function countChar(text, target) {
    return String(text).split("").filter(ch => ch === target).length;
  }

  function getSkillFromLine(line) {
    const start = line.indexOf("【");
    const end = line.indexOf("】", start + 1);

    return start < 0 || end < 0 ? "" : line.slice(start + 1, end).trim();
  }

  function getValueFromLine(line) {
    const markers = ["<=", "＜=", "<＝", "≦"];
    let pos = -1;
    let marker = "";

    for (const m of markers) {
      pos = line.indexOf(m);

      if (pos >= 0) {
        marker = m;
        break;
      }
    }

    if (pos < 0) return "";

    const after = line.slice(pos + marker.length).trim();
    let value = "";

    for (const ch of after) {
      if (
        (ch >= "0" && ch <= "9") ||
        ch === "{" ||
        ch === "}" ||
        ch === "_" ||
        ch === "英" ||
        ch === "幸" ||
        ch === "知" ||
        ch === "ア"
      ) {
        value += ch;
      } else {
        break;
      }
    }

    return value;
  }

  function detectEdition(text) {
    const names = text
      .split(NL)
      .map(getSkillFromLine)
      .map(normalizeSkillName)
      .filter(Boolean);

    const seven = ["近接戦闘", "射撃", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "伝承", "威圧", "魅惑", "ダイビング", "読唇術"];
    const six = ["こぶし", "キック", "組み付き", "頭突き", "マーシャルアーツ", "隠す", "隠れる", "忍び歩き", "写真術", "値切り", "博物学", "薬学", "物理学", "天文学", "生物学", "地質学"];

    let score7 = 0;
    let score6 = 0;

    for (const skill of names) {
      if (seven.some(word => skill.includes(word))) score7 += 2;
      if (six.some(word => skill.includes(word))) score6 += 2;
    }

    if (text.includes("CC<=")) score7 += 1;
    if (text.includes("CCB<=")) score6 += 1;
    if (text.includes("射撃：") || text.includes("射撃:")) score7 += 2;

    return score7 > score6 ? "7e" : "6e";
  }

  function commandForEdition(edition) {
    return edition === "6e" ? "CCB" : "CC";
  }

  function lineForSkill(edition, value, skill) {
    return commandForEdition(edition) + "<=" + value + " 【" + skill + "】";
  }

  function normalizeCommand(line, edition) {
    const trimmed = line.trim();

    if (edition === "7e" && trimmed.toLowerCase().startsWith("1d100<=")) {
      return "CC" + trimmed.slice(5);
    }

    for (const command of ["sCCB", "sCC", "CCB", "CC"]) {
      if (trimmed.startsWith(command + "<=")) {
        return commandForEdition(edition) + trimmed.slice(command.length);
      }
    }

    return trimmed;
  }

  function normalizeSkillLine(line, edition) {
    const commandNormalized = normalizeCommand(line, edition);
    const start = commandNormalized.indexOf("【");
    const end = commandNormalized.indexOf("】", start + 1);

    if (start < 0 || end < 0) return commandNormalized;

    const originalSkill = commandNormalized.slice(start + 1, end);
    const standardSkill = normalizeSkillNameForEdition(originalSkill, edition);

    return commandNormalized.slice(0, start + 1) + standardSkill + commandNormalized.slice(end);
  }

  function parseLine(line) {
    const skillFull = getSkillFromLine(line);
    const cleanSkill = normalizeSkillName(skillFull);
    const hasCommand = ["CC<=", "CCB<=", "sCC<=", "sCCB<=", "1D100", "1d100"].some(token => line.includes(token));
    const upper = line.toUpperCase();

    if (skillFull && hasCommand && isAbilityRollLabel(cleanSkill)) {
      return { type: "status", line };
    }

    if (skillFull && hasCommand) {
      return {
        type: "skill",
        line,
        skillFull,
        skill: cleanSkill,
        value: getValueFromLine(line)
      };
    }

    if (["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN"].some(stat => upper.startsWith(stat + ":") || upper.startsWith(stat + "："))) {
      return { type: "status", line };
    }

    if ((upper.includes("D") && hasNumber(line)) || line.includes("ダメージ") || upper.includes("DB") || upper.includes("DAMAGE")) {
      return { type: "damage", line };
    }

    return { type: "other", line };
  }

  function isAbilityRollLabel(skill) {
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();

    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].some(stat =>
      normalized === stat ||
      normalized === stat + "×5" ||
      normalized === stat + "X5" ||
      normalized === stat + "*5"
    );
  }

  function hasNumber(text) {
    return String(text).split("").some(ch => ch >= "0" && ch <= "9");
  }

  function categorize(skill, skillFull, edition) {
    const table = edition === "6e" ? CATEGORY_6E : CATEGORY_7E;
    const target = skill + " " + skillFull;

    if (target.includes("語")) return "social";

    for (const category of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
      if (table[category].some(word => target.includes(word))) return category;
    }

    return "other";
  }

  function addUnique(list, line, seen) {
    const key = line.trim();

    if (!key || seen.has(key)) return;

    list.push(key);
    seen.add(key);
  }

  function sortSection(lines, order) {
    return lines.sort((a, b) => {
      const aSkill = normalizeSkillName(getSkillFromLine(a));
      const bSkill = normalizeSkillName(getSkillFromLine(b));
      const ai = order.findIndex(word => aSkill.includes(word));
      const bi = order.findIndex(word => bSkill.includes(word));

      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
  }

  function injectCoreLines(buckets, present, edition, seen) {
    const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
    const command = commandForEdition(edition);
    const hasSanRoll = buckets.dice.some(line => line.includes("【正気度ロール】") || line.includes("【SAN】"));
    const hasLuckRoll = buckets.dice.some(line => line.includes("【幸運】"));

    if (!hasSanRoll) {
      addUnique(
        buckets.dice,
        edition === "6e" ? "1d100<={SAN} 【正気度ロール】" : command + "<={SAN} 【正気度ロール】",
        seen
      );
    }

    if (edition === "7e" && !hasLuckRoll) {
      addUnique(buckets.dice, command + "<={幸運} 【幸運】", seen);
    }

    for (const skill of ["目星", "聞き耳", "図書館"]) {
      if (!buckets.explore.some(line => line.includes("【" + skill + "】"))) {
        buckets.explore.unshift(lineForSkill(edition, present.get(skill) || initial[skill], skill));
      }
    }

    const hasSpecializedMelee = edition === "7e" && buckets.combat.some(isSpecializedMeleeLine);
    const combat = edition === "7e" ? ["回避", "近接戦闘"] : ["回避"];

    for (const skill of combat.reverse()) {
      if (edition === "7e" && skill === "近接戦闘" && hasSpecializedMelee) continue;

      if (!buckets.combat.some(line => line.includes("【" + skill + "】"))) {
        buckets.combat.unshift(lineForSkill(edition, present.get(skill) || initial[skill] || 0, skill));
      }
    }
  }

  function isPlainMeleeLine(line) {
    return normalizeSkillName(getSkillFromLine(line)) === "近接戦闘";
  }

  function isSpecializedMeleeLine(line) {
    return normalizeSkillName(getSkillFromLine(line)).startsWith("近接戦闘：");
  }

  function removePlainMeleeWhenSpecializedExists(buckets, edition) {
    if (edition !== "7e") return;

    if (buckets.combat.some(isSpecializedMeleeLine)) {
      buckets.combat = buckets.combat.filter(line => !isPlainMeleeLine(line));
    }
  }

  function baseSkillNameForDuplicateCheck(skillName) {
    const skill = normalizeSkillName(skillName);
    return skill.includes("：") ? skill.split("：")[0].trim() : skill;
  }

  function removePlainCombatWhenSpecializedExists6e(buckets, edition) {
    if (edition !== "6e") return;

    const specializedBaseSkills = new Set(
      buckets.combat
        .filter(line => normalizeSkillName(getSkillFromLine(line)).includes("："))
        .map(line => baseSkillNameForDuplicateCheck(getSkillFromLine(line)))
        .filter(Boolean)
    );

    if (specializedBaseSkills.size === 0) return;

    buckets.combat = buckets.combat.filter(line => {
      const skill = normalizeSkillName(getSkillFromLine(line));
      return skill.includes("：") || !specializedBaseSkills.has(skill);
    });
  }

  function cleanDiceRedundancy(buckets, edition) {
    if (edition !== "6e") return;

    const hasD100San = buckets.dice.some(line =>
      line.toLowerCase().startsWith("1d100<={san}") && line.includes("【正気度ロール】")
    );

    if (hasD100San) {
      buckets.dice = buckets.dice.filter(line =>
        !(line.startsWith("CCB<={SAN}") && line.includes("【正気度ロール】"))
      );
    }

    buckets.dice = buckets.dice.filter(line =>
      !(line.startsWith("CCB<={幸運}") && line.includes("【幸運】"))
    );
  }

  function buildInitialLines(present, edition) {
    const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
    const skip = new Set(["目星", "聞き耳", "図書館", "回避", "幸運", "正気度ロール", "SAN", "アイデア", "知識"]);

    if (edition === "7e") skip.add("近接戦闘");

    return Object.entries(initial)
      .filter(([skill]) => !skip.has(skill) && !present.has(skill))
      .map(([skill, value]) => lineForSkill(edition, value, skill));
  }

  function buildStatusLines(edition) {
    const stats = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];

    if (edition === "6e") {
      return stats.map(stat => "CCB<={" + stat + "}*5 【" + stat + " × 5】");
    }

    return stats.map(stat => lineForSkill(edition, "{" + stat + "}", stat));
  }

  function normalizeAbilityRoll(line, edition) {
    const skill = normalizeSkillName(getSkillFromLine(line));
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();

    const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find(s =>
      normalized === s ||
      normalized === s + "×5" ||
      normalized === s + "X5" ||
      normalized === s + "*5"
    );

    if (!stat) return line.trim();

    return edition === "6e"
      ? "CCB<={" + stat + "}*5 【" + stat + " × 5】"
      : lineForSkill(edition, "{" + stat + "}", stat);
  }

  function mergeStatusLines(existingLines, defaultLines) {
    const merged = [];
    const seenStats = new Set();

    for (const line of existingLines.concat(defaultLines)) {
      const skill = normalizeSkillName(getSkillFromLine(line));
      const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();

      const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find(s =>
        normalized === s ||
        normalized === s + "×5" ||
        normalized === s + "X5" ||
        normalized === s + "*5"
      );

      if (!stat || seenStats.has(stat)) continue;

      merged.push(line);
      seenStats.add(stat);
    }

    return merged;
  }

  function buildParamLines(present, edition) {
    const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
    const skills = edition === "6e"
      ? ["アイデア", "幸運", "知識", "目星", "聞き耳", "図書館", "回避", "こぶし"]
      : ["アイデア", "知識", "目星", "聞き耳", "図書館", "回避", "近接戦闘"];

    return skills.map(skill => "//" + skill + " = " + (present.get(skill) || initial[skill] || 0));
  }

  function pushSection(output, label, lines) {
    if (!lines || lines.length === 0) return;

    if (output.length) output.push("");

    output.push(label, ...lines);
  }

  function buildOutput(text, edition) {
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
    const lines = text.split(NL).map(line => line.trim()).filter(Boolean);

    for (const line of lines) {
      const parsed = parseLine(line);

      if (parsed.type === "skill") {
        const standardSkill = normalizeSkillNameForEdition(parsed.skill, edition);
        const standardSkillFull = normalizeSkillNameForEdition(parsed.skillFull, edition);

        if (parsed.value) present.set(standardSkill, parsed.value);

        const category = categorize(standardSkill, standardSkillFull, edition);
        addUnique(buckets[category], normalizeSkillLine(parsed.line, edition), seen);
      } else if (parsed.type === "damage") {
        addUnique(buckets.damage, parsed.line, seen);
      } else if (parsed.type === "status") {
        addUnique(buckets.status, normalizeAbilityRoll(parsed.line, edition), seen);
      } else {
        addUnique(buckets.other, parsed.line, seen);
      }
    }

    cleanDiceRedundancy(buckets, edition);
    removePlainMeleeWhenSpecializedExists(buckets, edition);
    removePlainCombatWhenSpecializedExists6e(buckets, edition);

    injectCoreLines(buckets, present, edition, seen);

    cleanDiceRedundancy(buckets, edition);
    removePlainMeleeWhenSpecializedExists(buckets, edition);
    removePlainCombatWhenSpecializedExists6e(buckets, edition);

    const orderTable = edition === "6e" ? CATEGORY_6E : CATEGORY_7E;

    for (const key of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
      buckets[key] = sortSection(buckets[key], orderTable[key]);
    }

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

    return output.join(NL).trim();
  }

  function runSelfTests() {
    const tests = [
      {
        name: "7e normalizes knife to Fighting Brawl",
        actual: normalizeSkillNameForEdition("ナイフ", "7e"),
        expected: "近接戦闘：格闘"
      },
      {
        name: "parentheses and colon normalize to Japanese colon",
        actual: normalizeSkillName("射撃（拳銃）"),
        expected: "射撃：拳銃"
      },
      {
        name: "Cthulhu Mythos skill name normalized",
        actual: normalizeSkillName("クトゥルフ神話"),
        expected: "クトゥルフ神話技能"
      },
      {
        name: "6e specialized fist drops plain fist",
        actual: buildOutput("CCB<=50 【こぶし】" + NL + "CCB<=50 【こぶし：パンチ】", "6e").includes("CCB<=50 【こぶし】"),
        expected: false
      },
      {
        name: "7e SAN command normalizes from 1d100 to CC",
        actual: normalizeCommand("1d100<={SAN} 【正気度ロール】", "7e"),
        expected: "CC<={SAN} 【正気度ロール】"
      }
    ];

    for (const test of tests) {
      console.assert(test.actual === test.expected, test.name, { actual: test.actual, expected: test.expected });
    }
  }

  runSelfTests();

  return {
    extractPaletteText,
    detectEdition,
    buildOutput,
    normalizeSkillName,
    normalizeSkillNameForEdition,
    normalizeCommand
  };
})();
