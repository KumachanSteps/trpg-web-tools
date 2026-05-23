const CharamemoParser = (() => {
  const NL = "\n";

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
    "ナイフ": "近接戦闘：格闘", "小型ナイフ": "近接戦闘：格闘", "大きなナイフ": "近接戦闘：格闘", "包丁": "近接戦闘：格闘", "棍棒": "近接戦闘：格闘", "警棒": "近接戦闘：格闘", "バット": "近接戦闘：格闘", "杖": "近接戦闘：格闘",
    "斧": "近接戦闘：斧", "手斧": "近接戦闘：斧", "チェーンソー": "近接戦闘：チェーンソー", "フレイル": "近接戦闘：フレイル",
    "絞殺ひも": "近接戦闘：絞殺ひも", "絞殺紐": "近接戦闘：絞殺ひも", "ガロット": "近接戦闘：絞殺ひも",
    "刀剣": "近接戦闘：刀剣", "剣": "近接戦闘：刀剣", "刀": "近接戦闘：刀剣", "日本刀": "近接戦闘：刀剣", "木刀": "近接戦闘：刀剣", "竹刀": "近接戦闘：刀剣", "サーベル": "近接戦闘：刀剣", "レイピア": "近接戦闘：刀剣", "短剣": "近接戦闘：刀剣", "ダガー": "近接戦闘：刀剣",
    "鞭": "近接戦闘：鞭", "ムチ": "近接戦闘：鞭"
  };

  function parseKomaJson(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return { ok: false, error: "" };
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        return { ok: false, error: "kind:'character' と data を持つCCFOLIA駒JSONではありません" };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "JSONを解析できませんでした" };
    }
  }

  function normalizeText(text) {
    return String(text || "").replaceAll("\\n", NL).replace(/\r\n/g, NL).replace(/\r/g, NL);
  }

  function editionLabel(edition) {
    return edition === "6e" ? "CoC 6版" : "CoC 7版";
  }

  function detectEdition(text) {
    const normalized = normalizeText(text);
    const names = normalized.split(NL).map(getSkillFromLine).map(normalizeSkillName).filter(Boolean);
    const seven = ["近接戦闘", "射撃", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "伝承", "威圧", "魅惑", "ダイビング", "読唇術"];
    const six = ["こぶし", "キック", "組み付き", "頭突き", "マーシャルアーツ", "隠す", "隠れる", "忍び歩き", "写真術", "値切り", "博物学", "薬学", "物理学", "天文学", "生物学", "地質学"];
    let score7 = 0;
    let score6 = 0;
    for (const skill of names) {
      if (seven.some((word) => skill.includes(word))) score7 += 2;
      if (six.some((word) => skill.includes(word))) score6 += 2;
    }
    if (normalized.includes("CC<=")) score7 += 1;
    if (normalized.includes("CCB<=")) score6 += 1;
    if (normalized.includes("射撃：") || normalized.includes("射撃:")) score7 += 2;
    return score7 > score6 ? "7e" : "6e";
  }

  function commandForEdition(edition) {
    return edition === "6e" ? "CCB" : "CC";
  }

  function getSkillFromLine(line) {
    const text = String(line || "");
    const start = text.indexOf("【");
    const end = text.indexOf("】", start + 1);
    return start < 0 || end < 0 ? "" : text.slice(start + 1, end).trim();
  }

  function getValueFromLine(line) {
    const text = String(line || "");
    const markers = ["<=", "＜=", "<＝", "≦"];
    let pos = -1;
    let marker = "";
    for (const currentMarker of markers) {
      pos = text.indexOf(currentMarker);
      if (pos >= 0) {
        marker = currentMarker;
        break;
      }
    }
    if (pos < 0) return "";
    const after = text.slice(pos + marker.length).trim();
    let value = "";
    for (const char of after) {
      if ((char >= "0" && char <= "9") || char === "{" || char === "}" || char === "_" || char === "英" || char === "幸" || char === "知" || char === "ア") value += char;
      else break;
    }
    return value;
  }

  function countChar(text, target) {
    return String(text || "").split("").filter((char) => char === target).length;
  }

  function normalizeSkillName(skillName) {
    let skill = String(skillName || "").trim();
    if (skill.startsWith("技能：") || skill.startsWith("技能:")) skill = skill.slice(3).trim();
    skill = skill.replaceAll("：", ":").replaceAll("（", "(").replaceAll("）", ")").replaceAll("【", "").replaceAll("】", "").trim();
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
      if (base && sub) return `${base}：${sub}`;
      if (base) return base;
    }
    const colonIndex = skill.indexOf(":");
    if (colonIndex >= 0) {
      const base = skill.slice(0, colonIndex).trim();
      const sub = skill.slice(colonIndex + 1).trim();
      if (base && sub) return `${base}：${sub}`;
      if (base) return base;
    }
    return skill;
  }

  function normalizeSkillNameForEdition(skillName, edition) {
    const skill = normalizeSkillName(skillName);
    if (edition !== "7e") return skill;
    if (skill === "近接戦闘" || skill === "射撃" || skill === "回避") return skill;
    if (["近接戦闘：格闘", "近接戦闘：斧", "近接戦闘：チェーンソー", "近接戦闘：フレイル", "近接戦闘：絞殺ひも", "近接戦闘：刀剣", "近接戦闘：鞭"].includes(skill)) return skill;
    if (MELEE_ALIAS_7E[skill]) return MELEE_ALIAS_7E[skill];
    if (skill.includes("：")) {
      const [base, ...rest] = skill.split("：");
      const sub = rest.join("：").trim();
      if (base.trim() === "近接戦闘" && MELEE_ALIAS_7E[sub]) return MELEE_ALIAS_7E[sub];
    }
    return skill;
  }

  function normalizeCommand(line, edition) {
    const trimmed = String(line || "").trim();
    if (edition === "7e" && trimmed.toLowerCase().startsWith("1d100<=")) return `CC${trimmed.slice(5)}`;
    for (const command of ["sCCB", "sCC", "CCB", "CC"]) {
      if (trimmed.startsWith(`${command}<=`)) return `${commandForEdition(edition)}${trimmed.slice(command.length)}`;
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
    return `${commandNormalized.slice(0, start + 1)}${standardSkill}${commandNormalized.slice(end)}`;
  }

  function isAbilityRollLabel(skill) {
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].some((stat) => normalized === stat || normalized === `${stat}×5` || normalized === `${stat}X5` || normalized === `${stat}*5`);
  }

  function hasNumber(text) {
    return String(text || "").split("").some((char) => char >= "0" && char <= "9");
  }

  function parseLine(line) {
    const text = String(line || "");
    const skillFull = getSkillFromLine(text);
    const cleanSkill = normalizeSkillName(skillFull);
    const hasCommand = ["CC<=", "CCB<=", "sCC<=", "sCCB<=", "1D100", "1d100"].some((token) => text.includes(token));
    const upper = text.toUpperCase();
    if (skillFull && hasCommand && isAbilityRollLabel(cleanSkill)) return { type: "status", line: text };
    if (skillFull && hasCommand) return { type: "skill", line: text, skillFull, skill: cleanSkill, value: getValueFromLine(text) };
    if (["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN"].some((stat) => upper.startsWith(`${stat}:`) || upper.startsWith(`${stat}：`))) return { type: "status", line: text };
    if ((upper.includes("D") && hasNumber(text)) || text.includes("ダメージ") || upper.includes("DB") || upper.includes("DAMAGE")) return { type: "damage", line: text };
    return { type: "other", line: text };
  }

  function categorize(skill, skillFull, edition) {
    const table = edition === "6e" ? CATEGORY_6E : CATEGORY_7E;
    const target = `${skill} ${skillFull}`;
    if (target.includes("語")) return "social";
    for (const category of ["dice", "explore", "combat", "action", "social", "knowledge"]) {
      if (table[category].some((word) => target.includes(word))) return category;
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
    return `${commandForEdition(edition)}<=${value} 【${skill}】`;
  }

  function isPlainMeleeLine(line) {
    return normalizeSkillName(getSkillFromLine(line)) === "近接戦闘";
  }

  function isSpecializedMeleeLine(line) {
    return normalizeSkillName(getSkillFromLine(line)).startsWith("近接戦闘：");
  }

  function removePlainMeleeWhenSpecializedExists(buckets, edition) {
    if (edition !== "7e") return;
    if (buckets.combat.some(isSpecializedMeleeLine)) buckets.combat = buckets.combat.filter((line) => !isPlainMeleeLine(line));
  }

  function baseSkillNameForDuplicateCheck(skillName) {
    const skill = normalizeSkillName(skillName);
    return skill.includes("：") ? skill.split("：")[0].trim() : skill;
  }

  function removePlainCombatWhenSpecializedExists6e(buckets, edition) {
    if (edition !== "6e") return;
    const specializedBaseSkills = new Set(
      buckets.combat
        .filter((line) => normalizeSkillName(getSkillFromLine(line)).includes("："))
        .map((line) => baseSkillNameForDuplicateCheck(getSkillFromLine(line)))
        .filter(Boolean)
    );
    if (!specializedBaseSkills.size) return;
    buckets.combat = buckets.combat.filter((line) => {
      const skill = normalizeSkillName(getSkillFromLine(line));
      return skill.includes("：") || !specializedBaseSkills.has(skill);
    });
  }

  function injectCoreLines(buckets, present, edition, seen) {
    const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
    const command = commandForEdition(edition);
    const hasSanRoll = buckets.dice.some((line) => line.includes("【正気度ロール】") || line.includes("【SAN】"));
    const hasLuckRoll = buckets.dice.some((line) => line.includes("【幸運】"));
    if (!hasSanRoll) addUnique(buckets.dice, edition === "6e" ? "1d100<={SAN} 【正気度ロール】" : `${command}<={SAN} 【正気度ロール】`, seen);
    if (edition === "7e" && !hasLuckRoll) addUnique(buckets.dice, `${command}<={幸運} 【幸運】`, seen);
    for (const skill of ["目星", "聞き耳", "図書館"]) {
      if (!buckets.explore.some((line) => line.includes(`【${skill}】`))) buckets.explore.unshift(lineForSkill(edition, present.get(skill) || initial[skill], skill));
    }
    const hasSpecializedMelee = edition === "7e" && buckets.combat.some(isSpecializedMeleeLine);
    const combat = edition === "7e" ? ["回避", "近接戦闘"] : ["回避"];
    for (const skill of [...combat].reverse()) {
      if (edition === "7e" && skill === "近接戦闘" && hasSpecializedMelee) continue;
      if (!buckets.combat.some((line) => line.includes(`【${skill}】`))) buckets.combat.unshift(lineForSkill(edition, present.get(skill) || initial[skill] || 0, skill));
    }
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
    if (edition === "6e") return stats.map((stat) => `CCB<={${stat}}*5 【${stat} × 5】`);
    return stats.map((stat) => lineForSkill(edition, `{${stat}}`, stat));
  }

  function normalizeAbilityRoll(line, edition) {
    const skill = normalizeSkillName(getSkillFromLine(line));
    const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
    const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find((candidate) => normalized === candidate || normalized === `${candidate}×5` || normalized === `${candidate}X5` || normalized === `${candidate}*5`);
    if (!stat) return String(line || "").trim();
    return edition === "6e" ? `CCB<={${stat}}*5 【${stat} × 5】` : lineForSkill(edition, `{${stat}}`, stat);
  }

  function mergeStatusLines(existingLines, defaultLines) {
    const merged = [];
    const seenStats = new Set();
    for (const line of existingLines.concat(defaultLines)) {
      const skill = normalizeSkillName(getSkillFromLine(line));
      const normalized = String(skill || "").replaceAll(" ", "").toUpperCase();
      const stat = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].find((candidate) => normalized === candidate || normalized === `${candidate}×5` || normalized === `${candidate}X5` || normalized === `${candidate}*5`);
      if (!stat || seenStats.has(stat)) continue;
      merged.push(line);
      seenStats.add(stat);
    }
    return merged;
  }

  function buildParamLines(present, edition) {
    const initial = edition === "6e" ? INITIAL_6E : INITIAL_7E;
    const skills = edition === "6e" ? ["アイデア", "幸運", "知識", "目星", "聞き耳", "図書館", "回避", "こぶし"] : ["アイデア", "知識", "目星", "聞き耳", "図書館", "回避", "近接戦闘"];
    return skills.map((skill) => `//${skill} = ${present.get(skill) || initial[skill] || 0}`);
  }

  function pushSection(output, label, lines) {
    if (!lines || lines.length === 0) return;
    if (output.length) output.push("");
    output.push(label, ...lines);
  }

  function buildPaletteOutput(commands, edition) {
    const text = normalizeText(commands);
    const buckets = { dice: [], explore: [], combat: [], action: [], social: [], knowledge: [], damage: [], status: [], other: [] };
    const present = new Map();
    const seen = new Set();
    const lines = text.split(NL).map((line) => line.trim()).filter(Boolean);
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
    removePlainMeleeWhenSpecializedExists(buckets, edition);
    removePlainCombatWhenSpecializedExists6e(buckets, edition);
    injectCoreLines(buckets, present, edition, seen);
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

  return {
    parseKomaJson,
    normalizeText,
    detectEdition,
    editionLabel,
    buildPaletteOutput
  };
})();

window.CharamemoParser = CharamemoParser;

const CharashiParser = (() => {
  const MAIN_STATUS = ["HP", "MP", "SAN"];
  const PARAMS = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
  const COMMON_SKILL_NAMES = ["アイデア", "知識", "幸運"];
  const PRIORITY_SKILLS = ["目星", "聞き耳", "図書館"];
  const COMBAT_SKILLS = ["回避", "こぶし", "拳", "パンチ", "キック", "組み付き", "組付き", "頭突き", "頭突", "マーシャルアーツ", "MA", "近接戦闘", "近接", "格闘", "ナイフ", "剣", "刀", "日本刀", "槍", "斧", "銃剣", "居合", "拳銃", "射撃", "ショットガン", "ライフル", "マシンガン", "サブマシンガン"];

  const CARD_INITIAL_6E = {
    "こぶし": 50, "こぶし：パンチ": 50, "パンチ": 50, "キック": 25, "組み付き": 25, "頭突き": 10, "投擲": 25,
    "マーシャルアーツ": 1, "拳銃": 20, "サブマシンガン": 15, "ショットガン": 30, "マシンガン": 15, "ライフル": 25,
    "応急手当": 30, "鍵開け": 1, "隠す": 15, "隠れる": 10, "忍び歩き": 10, "写真術": 10,
    "精神分析": 1, "追跡": 10, "登攀": 40, "運転": 20, "機械修理": 20, "重機械操作": 1,
    "乗馬": 5, "水泳": 25, "製作": 5, "操縦": 1, "跳躍": 25, "電気修理": 10, "ナビゲート": 10, "変装": 1,
    "言いくるめ": 5, "信用": 15, "説得": 15, "値切り": 5,
    "医学": 5, "オカルト": 5, "化学": 1, "芸術": 5, "経理": 10, "考古学": 1, "コンピューター": 1,
    "心理学": 5, "人類学": 1, "生物学": 1, "地質学": 1, "電子工学": 1, "天文学": 1, "博物学": 10,
    "物理学": 1, "法律": 5, "薬学": 1, "歴史": 20, "クトゥルフ神話": 0, "クトゥルフ神話技能": 0,
    "目星": 25, "聞き耳": 25, "図書館": 25
  };

  const CARD_INITIAL_7E = {
    "目星": 25, "聞き耳": 20, "図書館": 20, "回避": null, "近接戦闘": 25, "近接戦闘：格闘": 25, "投擲": 20,
    "射撃：拳銃": 20, "射撃：サブマシンガン": 15, "射撃：重火器": 10, "射撃：マシンガン": 10,
    "射撃：ライフル": 25, "射撃：ショットガン": 25, "射撃：弓": 15,
    "応急手当": 30, "鍵開け": 1, "手さばき": 10, "隠密": 20, "精神分析": 1, "追跡": 10, "登攀": 20,
    "鑑定": 5, "運転": 20, "機械修理": 10, "重機械操作": 1, "乗馬": 5, "水泳": 20, "製作": 5,
    "操縦": 1, "跳躍": 20, "電気修理": 10, "ナビゲート": 10, "変装": 5, "ダイビング": 1,
    "言いくるめ": 5, "説得": 10, "威圧": 15, "魅惑": 15, "信用": 0,
    "医学": 1, "オカルト": 5, "芸術": 5, "経理": 5, "考古学": 1, "コンピューター": 5, "科学": 1,
    "心理学": 10, "人類学": 1, "電子工学": 1, "自然": 10, "法律": 5, "歴史": 5, "サバイバル": 10, "伝承": 1,
    "クトゥルフ神話": 0, "クトゥルフ神話技能": 0
  };


  function normalizeCharacterData(json) {
    const source = isPlainObject(json) ? json : {};
    const data = isPlainObject(source.data) ? source.data : isPlainObject(source.character) ? source.character : source;
    const status = normalizePairs(data.status || data.statuses || []);
    const params = normalizePairs(data.params || data.parameters || []);
    const rawChatPalette = String(data.commands || data.command || data.chatPalette || data.palette || "");
    const edition = detectEditionFromCharacter(rawChatPalette, params);
    const allSkills = parseSkillsFromCommands(rawChatPalette);
    return { id: createId(), name: safeText(data.name || data.characterName || data.charaName || "名称未設定"), iconUrl: safeText(data.iconUrl || data.imageUrl || data.portrait || ""), externalUrl: safeText(data.externalUrl || data.url || data.sheetUrl || source.externalUrl || ""), edition, status, params, allSkills, skills: sortDisplaySkills(filterDisplaySkills(allSkills, edition, params)), chatPalette: rawChatPalette, rawChatPalette, raw: source };
  }

  function normalizePairs(items) {
    const result = {};
    if (!Array.isArray(items)) return result;
    items.forEach(item => {
      if (!isPlainObject(item)) return;
      const label = normalizeKey(item.label || item.name || "");
      if (!label) return;
      const value = item.value ?? item.current ?? "";
      const max = item.max ?? item.maximum ?? "";
      result[label] = max !== "" && max !== undefined && max !== null ? `${value}/${max}` : String(value);
    });
    return result;
  }

  function rebuildPc(pc) {
    const safePc = isPlainObject(pc) ? pc : {};
    const rawChatPalette = safePc.rawChatPalette !== undefined ? safePc.rawChatPalette : safePc.chatPalette || "";
    const chatPalette = String(safePc.chatPalette || rawChatPalette || "");
    const edition = safePc.edition || detectEditionFromCharacter(rawChatPalette, safePc.params || {});
    const allSkills = parseSkillsFromCommands(chatPalette);
    const params = isPlainObject(safePc.params) ? safePc.params : {};
    return { ...safePc, id: safePc.id || createId(), name: safeText(safePc.name || "名称未設定"), iconUrl: safeText(safePc.iconUrl || ""), externalUrl: safeText(safePc.externalUrl || ""), edition, status: isPlainObject(safePc.status) ? safePc.status : {}, params, allSkills, skills: sortDisplaySkills(filterDisplaySkills(allSkills, edition, params)), chatPalette, rawChatPalette: String(rawChatPalette || ""), raw: isPlainObject(safePc.raw) ? safePc.raw : {} };
  }

  function formatPcPalette(pc) {
    const raw = pc.rawChatPalette || pc.chatPalette || "";
    const edition = detectEditionFromCharacter(raw, pc.params || {});
    const chatPalette = CharamemoParser.buildPaletteOutput(raw, edition);
    const allSkills = parseSkillsFromCommands(chatPalette);
    const params = isPlainObject(pc.params) ? pc.params : {};
    return { ...pc, edition, chatPalette, allSkills, skills: sortDisplaySkills(filterDisplaySkills(allSkills, edition, params)) };
  }

  function detectEditionFromCharacter(text, params = {}) {
    const parserEdition = CharamemoParser.detectEdition(text);
    const hasLargeStat = PARAMS.some(key => Number(String(params[key] || "").split("/")[0]) > 30);
    return hasLargeStat ? "7e" : parserEdition;
  }

  function editionLabel(edition) { return edition === "7e" ? "7版" : "6版"; }
  function editionCss(edition) { return edition === "7e" ? "edition-7" : "edition-6"; }

  function parseSkillsFromCommands(commands) {
    const skillMap = new Map();
    normalizeText(commands).split("\n").forEach(line => {
      const text = line.trim();
      if (!text) return;
      const matches = [text.match(/(?:CCB|CC|sCCB|sCC)\s*<=\s*([^\s]+).*?【([^】]+)】/i), text.match(/1d100\s*<=\s*([^\s]+).*?【([^】]+)】/i), text.match(/【([^】]+)】.*?(\d{1,3})/i)];
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        if (!match) continue;
        const name = index === 2 ? match[1].trim() : normalizeSkillName(match[2].trim());
        const rawValue = index === 2 ? match[2] : match[1];
        const value = Number(String(rawValue).replace(/[^0-9]/g, ""));
        if (!name || Number.isNaN(value) || value < 1 || value > 100) return;
        const key = normalizeSkillName(name);
        const existing = skillMap.get(key);
        if (!existing || existing.value < value) skillMap.set(key, { name, value });
        break;
      }
    });
    return Array.from(skillMap.values());
  }

  function filterDisplaySkills(skills, edition = "6e", params = {}) {
    const hidden = new Set([...COMMON_SKILL_NAMES, "STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "STR × 5", "CON × 5", "POW × 5", "DEX × 5", "APP × 5", "SIZ × 5", "INT × 5", "EDU × 5"].map(normalizeSkillName));
    if (!Array.isArray(skills)) return [];
    const filtered = skills.filter(skill => {
      if (!skill || hidden.has(normalizeSkillName(skill.name))) return false;
      return shouldShowCardSkill(skill, edition, params);
    });
    const hasKobushiPunch = filtered.some(skill => {
      const name = normalizeSkillName(skill.name);
      return name.includes("こぶし") && name.includes("パンチ");
    });
    return hasKobushiPunch
      ? filtered.filter(skill => normalizeSkillName(skill.name) !== "こぶし")
      : filtered;
  }

  function shouldShowCardSkill(skill, edition = "6e", params = {}) {
    const name = normalizeSkillName(skill.name);
    const value = Number(skill.value);
    if (!name || Number.isNaN(value)) return false;
    if (isAlwaysVisibleSkill(name)) return true;
    const initial = getInitialSkillValue(name, edition, params);
    if (initial === null || initial === undefined || Number.isNaN(Number(initial))) return true;
    return value !== Number(initial);
  }

  function isAlwaysVisibleSkill(name) {
    const normalized = normalizeSkillName(name);
    return normalized.includes("目星")
      || normalized.includes("聞き耳")
      || normalized.includes("図書館")
      || normalized.includes("母国語")
      || normalized.includes("こぶし")
      || normalized.includes("パンチ");
  }

  function getInitialSkillValue(name, edition = "6e", params = {}) {
    const normalized = normalizeSkillName(name);
    if (normalized.includes("母国語")) return motherTongueInitial(edition, params);
    if (edition === "7e") {
      if (normalized === "回避") return halfDexInitial(params);
      if (normalized.includes("近接戦闘") && normalized.includes("格闘")) return 25;
      if (normalized === "近接戦闘") return 25;
      return findInitialValue(normalized, CARD_INITIAL_7E);
    }
    if (normalized.includes("こぶし") || normalized.includes("パンチ")) return 50;
    return findInitialValue(normalized, CARD_INITIAL_6E);
  }

  function findInitialValue(normalizedName, table) {
    for (const [key, value] of Object.entries(table || {})) {
      if (value === null) continue;
      const normalizedKey = normalizeSkillName(key);
      if (normalizedName === normalizedKey || normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) return Number(value);
    }
    return null;
  }

  function motherTongueInitial(edition, params = {}) {
    const eduRaw = params.EDU ?? params.edu ?? "";
    const edu = Number(String(eduRaw).split("/")[0].replace(/[^0-9]/g, ""));
    if (!Number.isFinite(edu)) return null;
    return edition === "7e" ? edu : edu * 5;
  }

  function halfDexInitial(params = {}) {
    const dexRaw = params.DEX ?? params.dex ?? "";
    const dex = Number(String(dexRaw).split("/")[0].replace(/[^0-9]/g, ""));
    if (!Number.isFinite(dex)) return null;
    return Math.floor(dex / 2);
  }

  function shouldShowCardSkill(skill, edition = "6e", params = {}) {
    const name = normalizeSkillName(skill.name);
    const value = Number(skill.value);
    if (!name || Number.isNaN(value)) return false;
    if (isAlwaysVisibleSkill(name)) return true;
    const initial = getInitialSkillValue(name, edition, params);
    if (initial === null || initial === undefined || Number.isNaN(Number(initial))) return true;
    return value !== Number(initial);
  }

  function isAlwaysVisibleSkill(name) {
    const normalized = normalizeSkillName(name);
    return normalized.includes("目星")
      || normalized.includes("聞き耳")
      || normalized.includes("図書館")
      || normalized.includes("母国語")
      || normalized.includes("こぶし")
      || normalized.includes("パンチ");
  }

  function getInitialSkillValue(name, edition = "6e", params = {}) {
    const normalized = normalizeSkillName(name);
    if (normalized.includes("母国語")) return motherTongueInitial(edition, params);
    if (edition === "7e") {
      if (normalized.includes("近接戦闘") && normalized.includes("格闘")) return 25;
      if (normalized === "近接戦闘") return 25;
      const found7 = findInitialValue(normalized, CARD_INITIAL_7E);
      return found7;
    }
    if (normalized.includes("こぶし") || normalized.includes("パンチ")) return 50;
    const found6 = findInitialValue(normalized, CARD_INITIAL_6E);
    return found6;
  }

  function findInitialValue(normalizedName, table) {
    for (const [key, value] of Object.entries(table || {})) {
      const normalizedKey = normalizeSkillName(key);
      if (normalizedName === normalizedKey || normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) return Number(value);
    }
    return null;
  }

  function motherTongueInitial(edition, params = {}) {
    const eduRaw = params.EDU ?? params.edu ?? "";
    const edu = Number(String(eduRaw).split("/")[0].replace(/[^0-9]/g, ""));
    if (!Number.isFinite(edu)) return null;
    return edition === "7e" ? edu : edu * 5;
  }

  function sortDisplaySkills(skills) {
    const buckets = { priority: [], combat: [], regular: [] };
    (Array.isArray(skills) ? skills : []).forEach(skill => {
      if (matchesAny(skill.name, PRIORITY_SKILLS)) buckets.priority.push(skill);
      else if (matchesAny(skill.name, COMBAT_SKILLS)) buckets.combat.push(skill);
      else buckets.regular.push(skill);
    });
    buckets.priority.sort((a, b) => priorityIndex(a.name) - priorityIndex(b.name) || compareSkillValue(a, b));
    buckets.combat.sort(compareSkillValue);
    buckets.regular.sort(compareSkillValue);
    return [...buckets.priority, ...buckets.combat, ...buckets.regular];
  }

  function commonSkillValue(pc, key) {
    const aliases = { "アイデア": ["アイデア", "IDEA"], "知識": ["知識", "KNOW", "KNOWLEDGE"], "幸運": ["幸運", "LUCK", "LUK"] };
    const params = isPlainObject(pc.params) ? pc.params : {};
    const status = isPlainObject(pc.status) ? pc.status : {};
    const skillValue = skillValueByNames(pc.allSkills, aliases[key] || []);
    if (skillValue) return skillValue;
    if (key === "アイデア") return params["アイデア"] || params.IDEA || currentValue(status["アイデア"] || status.IDEA) || multiplyParam(params.INT, 5);
    if (key === "知識") return params["知識"] || params.KNOW || params.KNOWLEDGE || currentValue(status["知識"] || status.KNOW || status.KNOWLEDGE) || multiplyParam(params.EDU, 5);
    if (key === "幸運") return params["幸運"] || params.LUCK || params.LUK || currentValue(status["幸運"] || status.LUCK || status.LUK) || multiplyParam(params.POW, 5);
    return "-";
  }

  function paramValue(pc, key) {
    const params = isPlainObject(pc.params) ? pc.params : {};
    const status = isPlainObject(pc.status) ? pc.status : {};
    if (key !== "LUK") return params[key] || "-";
    return params.LUK || params.LUCK || params["幸運"] || currentValue(status.LUK || status.LUCK || status["幸運"]) || multiplyParam(params.POW, 5);
  }

  function currentValue(value) {
    const text = String(value ?? "").trim();
    return text ? text.split("/")[0].trim() || "-" : "-";
  }

  function copyableCharacterData(pc) {
    const cloned = cloneSafe(pc.raw || {});
    const data = isPlainObject(cloned.data) ? cloned.data : isPlainObject(cloned.character) ? cloned.character : cloned;
    const palette = pc.chatPalette || "";
    if (isPlainObject(data)) {
      if (data.commands !== undefined || (data.command === undefined && data.chatPalette === undefined && data.palette === undefined)) data.commands = palette;
      else if (data.command !== undefined) data.command = palette;
      else if (data.chatPalette !== undefined) data.chatPalette = palette;
      else if (data.palette !== undefined) data.palette = palette;
      if (!data.iconUrl && pc.iconUrl) data.iconUrl = pc.iconUrl;
      if (!data.externalUrl && pc.externalUrl) data.externalUrl = pc.externalUrl;
      if (!data.name && pc.name) data.name = pc.name;
    }
    return JSON.stringify(cloned, null, 2);
  }

  function normalizeText(text) { return String(text || "").replaceAll("\\n", "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n"); }
  function normalizeKey(name) { const text = String(name || "").trim(); return /[A-Za-z]/.test(text) ? text.toUpperCase() : text; }
  function normalizeSkillName(name) { return String(name || "").trim().replaceAll("：", ":").replaceAll("（", "(").replaceAll("）", ")").replace(/[【】]/g, "").toUpperCase(); }
  function skillValueByNames(skills, names) { const keys = names.map(normalizeSkillName); const found = Array.isArray(skills) ? skills.find(skill => keys.includes(normalizeSkillName(skill.name))) : null; return found ? String(found.value) : ""; }
  function compareSkillValue(a, b) { return b.value - a.value || a.name.localeCompare(b.name, "ja"); }
  function priorityIndex(name) { const normalized = normalizeSkillName(name); if (normalized.includes("目星")) return 0; if (normalized.includes("聞き耳")) return 1; if (normalized.includes("図書館")) return 2; return 3; }
  function matchesAny(name, keywords) { return keywords.some(keyword => normalizeSkillName(name).includes(normalizeSkillName(keyword))); }
  function multiplyParam(value, multiplier) { const digits = String(value || "").replace(/[^0-9]/g, ""); if (!digits) return "-"; const number = Number(digits); return Number.isFinite(number) ? String(number * multiplier) : "-"; }
  function cloneSafe(value) { try { if (typeof structuredClone === "function") return structuredClone(value); } catch (error) { console.warn(error); } try { return JSON.parse(JSON.stringify(value)); } catch (error) { console.warn(error); return {}; } }
  function createId() { if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID(); return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function isPlainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function safeText(value) { return String(value ?? "").trim(); }

  return { MAIN_STATUS, PARAMS, normalizeCharacterData, rebuildPc, formatPcPalette, editionLabel, editionCss, commonSkillValue, paramValue, currentValue, copyableCharacterData };
})();
