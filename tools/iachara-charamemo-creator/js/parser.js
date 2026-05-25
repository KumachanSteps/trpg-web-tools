(function () {
  const NL = "\n";

  function normalizeText(text) {
    return String(text || "").replaceAll("\\n", NL).replace(/\r\n/g, NL).replace(/\r/g, NL);
  }

  function cleanupValue(value) {
    return String(value || "").replace(/^[\s:：]+/, "").trim();
  }

  function cleanupBlock(value) {
    return normalizeText(value).replace(/\n{3,}/g, NL + NL).trim();
  }

  function parseKomaJson(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return { ok: false, error: "", data: null };
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        return { ok: false, error: "kind:'character' と data を持つCCFOLIA駒JSONではありません", data: null };
      }
      return { ok: true, error: "", data: parsed.data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "JSONを解析できませんでした", data: null };
    }
  }

  function splitSections(text) {
    const src = normalizeText(text);
    const lines = src.split(NL);
    const sections = {};
    let header = "__HEADER__";
    sections[header] = "";
    for (const line of lines) {
      const match = line.match(/^【(.+?)】\s*$/);
      if (match) {
        header = match[1].trim();
        sections[header] = "";
        continue;
      }
      sections[header] += line + NL;
    }
    return sections;
  }

  function findLine(text, key) {
    return normalizeText(text).split(NL).find((line) => line.includes(key + ":") || line.includes(key + "：")) || "";
  }

  function pickLineValue(text, key) {
    const line = findLine(text, key);
    return cleanupValue(line.replace(key + ":", "").replace(key + "：", ""));
  }

  function pickInline(line, key) {
    const source = String(line || "");
    const colon = source.indexOf(key + ":");
    const jpColon = source.indexOf(key + "：");
    const start = colon >= 0 ? colon : jpColon;
    const offset = colon >= 0 ? key.length + 1 : key.length + 1;
    if (start < 0) return "";
    const rest = source.slice(start + offset);
    const nextKeys = ["年齢:", "性別:", "身長:", "体重:", "出身:", "髪の色:", "瞳の色:", "肌の色:", "年齢：", "性別：", "身長：", "体重：", "出身：", "髪の色：", "瞳の色：", "肌の色："];
    const candidates = nextKeys.map((marker) => rest.indexOf(marker)).filter((index) => index > 0);
    const slashIndex = rest.indexOf("/");
    if (slashIndex > 0) candidates.push(slashIndex);
    const end = candidates.length ? Math.min(...candidates) : -1;
    return cleanupValue(end >= 0 ? rest.slice(0, end) : rest);
  }

  function parseProfile(text) {
    const name = pickLineValue(text, "名前");
    const tag = pickLineValue(text, "タグ");
    const occupation = pickLineValue(text, "職業");
    const birthday = pickLineValue(text, "誕生日");
    const ageGenderHeight = findLine(text, "年齢");
    const weightOrigin = findLine(text, "体重");
    const appearanceLine = findLine(text, "髪の色");
    return {
      name,
      tag,
      occupation,
      birthday,
      age: pickInline(ageGenderHeight, "年齢"),
      gender: pickInline(ageGenderHeight, "性別"),
      height: pickInline(ageGenderHeight, "身長"),
      weight: pickInline(weightOrigin, "体重"),
      origin: pickInline(weightOrigin, "出身"),
      hair: pickInline(appearanceLine, "髪の色"),
      eyes: pickInline(appearanceLine, "瞳の色"),
      skin: pickInline(appearanceLine, "肌の色"),
    };
  }

  function extractUrls(text) {
    return Array.from(String(text || "").matchAll(/https?:\/\/\S+/g)).map((match) => match[0].replace(/[\]\)）,.、。]+$/, ""));
  }

  function parseAbilities(text) {
    const result = {};
    const names = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN", "IDE", "幸運", "知識"];
    for (const line of normalizeText(text).split(NL)) {
      const trimmed = line.trim();
      const name = names.find((key) => trimmed.startsWith(key));
      if (!name) continue;
      const nums = trimmed.replace(name, "").trim().split(/\s+/).filter(Boolean);
      if (nums[0] && /^-?\d+$/.test(nums[0])) result[name] = nums[0];
    }
    const currentSan = text.match(/現在SAN値\s*([0-9]+)\s*\/\s*([0-9]+)/);
    if (currentSan) result.SAN = currentSan[1];
    return result;
  }

  function parseSimpleList(text) {
    return normalizeText(text)
      .split(NL)
      .map((line) => line.trim())
      .filter((line) => line && !line.match(/^[-━ー\s]+$/) && !line.includes("名前                        成功率"))
      .filter((line) => !line.match(/^技能名\s+合計/) && !line.match(/^名称\s+単価/))
      .slice(0, 120);
  }

  function extractMarkedSubsection(text, label) {
    const src = normalizeText(text);
    const patterns = [`■【${label}】`, `【${label}】`, `[${label}]`];
    let start = -1;
    let used = "";
    for (const pattern of patterns) {
      start = src.indexOf(pattern);
      if (start >= 0) {
        used = pattern;
        break;
      }
    }
    if (start < 0) return "";
    const rest = src.slice(start + used.length);
    const next = rest.search(/\n■【|\n\[|\n【/);
    return cleanupBlock(next >= 0 ? rest.slice(0, next) : rest);
  }

  function parseItemsFromText(itemSection, memoSection) {
    const source = [itemSection, extractMarkedSubsection(memoSection, "所持品")].filter(Boolean).join(NL);
    return parseSimpleList(source).filter((line) => !line.includes("名称") && !line.includes("単価") && !line.includes("現在の所持金") && !line.includes("借金"));
  }

  function parseSkillRows(text) {
    const rows = [];
    const lines = normalizeText(text).split(NL);
    let currentCategory = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cat = trimmed.match(/^『(.+?)』$/);
      if (cat) {
        currentCategory = cat[1];
        continue;
      }
      if (trimmed.startsWith("技能名") || trimmed.startsWith("職業ポイント") || trimmed.startsWith("興味ポイント")) continue;
      const match = trimmed.match(/^(.+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*$/);
      if (!match) continue;
      const name = cleanupSkillName(match[1]);
      const total = Number(match[2]);
      if (!name || Number.isNaN(total)) continue;
      rows.push({ name, total, category: currentCategory });
    }
    return rows;
  }

  function cleanupSkillName(name) {
    return cleanupValue(name)
      .replace(/（/g, "(")
      .replace(/）/g, ")")
      .replace(/：/g, ":")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseWeapons(sectionText, memoText) {
    const official = parseSimpleList(sectionText).filter((line) => !line.includes("成功率") && !line.includes("名前"));
    const memoWeapons = parseSimpleList(extractMarkedSubsection(memoText, "戦闘・武器・防具"));
    return [...official, ...memoWeapons].filter(Boolean);
  }

  function parseIacharaTxt(text) {
    const src = normalizeText(text);
    const sections = splitSections(src);
    const profile = parseProfile(sections["基本情報"] || "");
    const icons = extractUrls(sections["アイコン"] || "");
    const abilities = parseAbilities(sections["能力値"] || "");
    const skills = parseSkillRows(sections["技能値"] || "");
    const memo = cleanupBlock(sections["メモ"] || "");
    const weapons = parseWeapons(sections["戦闘・武器・防具"] || "", memo);
    const items = parseItemsFromText(sections["所持品"] || "", memo);
    const backstory = cleanupBlock(sections["バックストーリー"] || "");
    const scenarioHistory = cleanupBlock(sections["通過したシナリオ名"] || "");
    const header = cleanupBlock(sections.__HEADER__ || "");
    const found = Boolean(profile.name || icons.length || Object.keys(abilities).length || skills.length || items.length || weapons.length || backstory || scenarioHistory || memo);
    return { found, profile, icons, abilities, skills, weapons, items, backstory, scenarioHistory, memo, sections, header };
  }

  function detectEditionFromInputs(koma, parsedTxt) {
    const header = normalizeText([parsedTxt.header, Object.keys(parsedTxt.sections || {}).join(" "), parsedTxt.profile.name].join(" "));
    if (header.includes("7版") || header.includes("7th")) return "7e";
    if (header.includes("6版") || header.includes("6th")) return "6e";
    if (parsedTxt.skills?.some((skill) => skill.name.includes("近接戦闘") || skill.name.includes("手さばき") || skill.name.includes("隠密"))) return "7e";
    if (koma?.commands) return detectEditionFromCommands(koma.commands);
    return "";
  }

  function detectEditionFromCommands(text) {
    const normalized = normalizeText(text);
    if (normalized.includes("近接戦闘") || normalized.includes("射撃（") || normalized.includes("射撃(")) return "7e";
    if (normalized.includes("CCB<=") || normalized.includes("こぶし") || normalized.includes("忍び歩き")) return "6e";
    return normalized.includes("CC<=") ? "7e" : "6e";
  }

  function buildProfileLines(koma, parsedTxt) {
    const p = parsedTxt.profile || {};
    const lines = [];
    const name = p.name || koma?.name || "";
    if (name) lines.push(`名前：${name}`);
    if (p.occupation) lines.push(`職業：${p.occupation}`);
    if (p.age || p.gender) lines.push(`年齢／性別：${p.age || ""}${p.age && p.gender ? "／" : ""}${p.gender || ""}`);
    if (p.height || p.weight) lines.push(`身長／体重：${p.height || ""}${p.height && p.weight ? "／" : ""}${p.weight || ""}`);
    if (p.birthday) lines.push(`誕生日：${p.birthday}`);
    if (p.tag) lines.push(`タグ：${p.tag}`);
    return lines.filter(Boolean);
  }

  function buildMemoFromTxt(koma, parsedTxt, options) {
    if (!koma && !parsedTxt.found) return "";
    const profileLines = buildProfileLines(koma, parsedTxt);
    const parts = [];
    if (profileLines.length) parts.push(["【プロフィール】", ...profileLines].join(NL));
    if (options.includeWeapons && parsedTxt.weapons.length) parts.push(["【戦闘・武器・防具】", ...parsedTxt.weapons].join(NL));
    if (options.includeItems && parsedTxt.items.length) parts.push(["【所持品】", ...parsedTxt.items].join(NL));
    if (options.includeKnowledgeExperience && parsedTxt.scenarioHistory) parts.push(["【新たに得た知識・経験】", parsedTxt.scenarioHistory].join(NL));
    if (parsedTxt.backstory) parts.push(["【バックストーリー】", parsedTxt.backstory].join(NL));
    if (options.includeTxtMemo && parsedTxt.memo) parts.push(["【メモ】", parsedTxt.memo].join(NL));
    if (koma?.memo) parts.push(["【既存駒メモ】", koma.memo].join(NL));
    return parts.filter(Boolean).join(NL + NL);
  }

  function commandPrefix(edition) {
    return edition === "6e" ? "CCB" : "CC";
  }

  function normalizePaletteLine(line, edition) {
    const command = commandPrefix(edition);
    return String(line || "").trim()
      .replace(/^s?CCB?<=/i, `${command}<=`)
      .replace(/^1d100<=/i, `${command}<=`);
  }

  function formatCommands(commands, edition) {
    return normalizeText(commands)
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normalizePaletteLine(line, edition))
      .join(NL);
  }

  function buildPaletteFromTxt(parsedTxt, edition) {
    if (!parsedTxt.found) return "";
    const command = commandPrefix(edition || "7e");
    const lines = [];
    const status = parsedTxt.abilities || {};
    if (status.SAN) lines.push(`1d100<=${status.SAN} 【正気度ロール】`);
    if (status.IDE) lines.push(`${command}<=${status.IDE} 【アイデア】`);
    if (status.幸運) lines.push(`${command}<=${status.幸運} 【幸運】`);
    if (status.知識) lines.push(`${command}<=${status.知識} 【知識】`);
    if (lines.length) lines.push("");
    for (const skill of parsedTxt.skills || []) {
      lines.push(`${command}<=${skill.total} 【${normalizeSkillForPalette(skill.name, edition)}】`);
    }
    if (Object.keys(status).length) {
      lines.push("");
      for (const stat of ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"]) {
        if (status[stat]) lines.push(`${command}<=${status[stat]} 【${stat}】`);
      }
    }
    return lines.filter((line, index, array) => line || array[index - 1]).join(NL).trim();
  }

  function normalizeSkillForPalette(skillName, edition) {
    let name = cleanupSkillName(skillName).replace(/\(/g, "（").replace(/\)/g, "）");
    if (name === "クトゥルフ神話") return "クトゥルフ神話";
    if (edition === "7e") {
      name = name.replace(/^射撃\（(.+)\）$/, "射撃（$1）");
    }
    return name;
  }

  function getStatusCards(koma, parsedTxt) {
    const source = parsedTxt.abilities || {};
    const fromTxt = ["HP", "MP", "SAN", "幸運"].map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return (koma?.status || []).slice(0, 4).map((item) => ({ label: item.label, value: item.value }));
  }

  function getParamCards(koma, parsedTxt) {
    const source = parsedTxt.abilities || {};
    const stats = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
    const fromTxt = stats.map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return (koma?.params || []).map((item) => ({ label: item.label, value: item.value }));
  }

  function editionLabel(edition) {
    return edition === "6e" ? "CoC 6版" : edition === "7e" ? "CoC 7版" : "未判定";
  }

  window.CharamemoParser = {
    normalizeText,
    cleanupBlock,
    parseKomaJson,
    parseIacharaTxt,
    detectEditionFromInputs,
    formatCommands,
    buildPaletteFromTxt,
    buildMemoFromTxt,
    getStatusCards,
    getParamCards,
    editionLabel,
  };
})();
