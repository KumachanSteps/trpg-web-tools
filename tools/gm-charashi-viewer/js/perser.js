const CharashiParser = (() => {
  const MAIN_STATUS = ["HP", "MP", "SAN"];
  const PARAMS = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
  const COMMON_SKILL_NAMES = ["アイデア", "知識", "幸運"];
  const PRIORITY_SKILLS = ["目星", "聞き耳", "図書館"];
  const COMBAT_SKILLS = ["回避", "こぶし", "拳", "パンチ", "キック", "組み付き", "組付き", "頭突き", "頭突", "マーシャルアーツ", "MA", "近接戦闘", "近接", "格闘", "ナイフ", "剣", "刀", "日本刀", "槍", "斧", "銃剣", "居合", "拳銃", "射撃", "ショットガン", "ライフル", "マシンガン", "サブマシンガン"];

  function normalizeCharacterData(json, shouldFormatPalette = true) {
    const source = isPlainObject(json) ? json : {};
    const data = isPlainObject(source.data) ? source.data : isPlainObject(source.character) ? source.character : source;
    const status = normalizePairs(data.status || data.statuses || []);
    const params = normalizePairs(data.params || data.parameters || []);
    const rawChatPalette = data.commands || data.command || data.chatPalette || data.palette || "";
    const chatPalette = shouldFormatPalette ? formatChatPalette(rawChatPalette) : String(rawChatPalette || "");
    const allSkills = parseSkillsFromCommands(chatPalette);

    return {
      id: createId(),
      name: safeText(data.name || data.characterName || data.charaName || "名称未設定"),
      iconUrl: safeText(data.iconUrl || data.imageUrl || data.portrait || ""),
      externalUrl: safeText(data.externalUrl || data.url || data.sheetUrl || source.externalUrl || ""),
      status,
      params,
      allSkills,
      skills: sortDisplaySkills(filterDisplaySkills(allSkills)),
      chatPalette,
      rawChatPalette: String(rawChatPalette || ""),
      raw: source
    };
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

  function parseSkillsFromCommands(commands) {
    const skillMap = new Map();
    String(commands || "").split(/\r?\n/).forEach(line => {
      const text = line.trim();
      if (!text) return;
      const matches = [
        text.match(/(?:CCB|CC|sCCB|sCC)\s*<=\s*(\d{1,3}).*?【([^】]+)】/i),
        text.match(/1d100\s*<=\s*(\d{1,3}).*?【([^】]+)】/i),
        text.match(/【([^】]+)】.*?(\d{1,3})/i)
      ];
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        if (!match) continue;
        const name = index === 2 ? match[1].trim() : match[2].trim();
        const value = Number(index === 2 ? match[2] : match[1]);
        if (!name || Number.isNaN(value) || value < 1 || value > 100) return;
        const key = normalizeSkillName(name);
        const existing = skillMap.get(key);
        if (!existing || existing.value < value) skillMap.set(key, { name, value });
        break;
      }
    });
    return Array.from(skillMap.values());
  }

  function rebuildPc(pc, shouldFormatPalette = true) {
    const safePc = isPlainObject(pc) ? pc : {};
    const rawChatPalette = safePc.rawChatPalette !== undefined ? safePc.rawChatPalette : safePc.chatPalette || "";
    const chatPalette = shouldFormatPalette ? formatChatPalette(rawChatPalette) : String(rawChatPalette || "");
    const allSkills = parseSkillsFromCommands(chatPalette);
    return {
      ...safePc,
      id: safePc.id || createId(),
      name: safeText(safePc.name || "名称未設定"),
      iconUrl: safeText(safePc.iconUrl || ""),
      externalUrl: safeText(safePc.externalUrl || ""),
      status: isPlainObject(safePc.status) ? safePc.status : {},
      params: isPlainObject(safePc.params) ? safePc.params : {},
      allSkills,
      skills: sortDisplaySkills(filterDisplaySkills(allSkills)),
      chatPalette,
      rawChatPalette: String(rawChatPalette || ""),
      raw: isPlainObject(safePc.raw) ? safePc.raw : {}
    };
  }

  function detectEdition(pc) {
    const params = isPlainObject(pc.params) ? pc.params : {};
    const allSkills = Array.isArray(pc.allSkills) ? pc.allSkills : [];
    const palette = String(pc.rawChatPalette || pc.chatPalette || "");
    const paletteLines = palette.split(/\r?\n/).map(line => line.trim().toUpperCase());
    const hasCc7 = paletteLines.some(line => line.startsWith("CC<=") || line.startsWith("SCC<="));
    const hasCcb = paletteLines.some(line => line.startsWith("CCB<=") || line.startsWith("SCCB<="));
    const hasLargeStat = PARAMS.some(key => Number(params[key]) > 30);
    const hasSevenSkill = allSkills.some(skill => ["近接戦闘", "射撃", "威圧", "魅惑", "母国語"].some(name => String(skill.name || "").includes(name)));
    return (hasCc7 && !hasCcb) || hasLargeStat || hasSevenSkill ? "7" : "6";
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

  function filterDisplaySkills(skills) {
    const hidden = new Set(COMMON_SKILL_NAMES.map(normalizeSkillName));
    return Array.isArray(skills) ? skills.filter(skill => !hidden.has(normalizeSkillName(skill.name))) : [];
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

  function formatChatPalette(palette) {
    const seen = new Set();
    return String(palette || "").split(/\r?\n/).map(normalizePaletteLine).filter(Boolean).filter(line => {
      const key = line.replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join("\n");
  }

  function normalizePaletteLine(line) {
    return String(line || "").replaceAll("（", "(").replaceAll("）", ")").replaceAll("＜＝", "<=").replaceAll("≦", "<=").replaceAll("＞＝", ">=").replaceAll("：", ":").replace(/\s+/g, " ").replace(/\s*<=\s*/g, "<=").replace(/\s*>=\s*/g, ">=").replace(/\s*【\s*/g, " 【").replace(/\s*】\s*/g, "】").trim();
  }

  function skillValueByNames(skills, names) {
    const keys = names.map(normalizeSkillName);
    const found = Array.isArray(skills) ? skills.find(skill => keys.includes(normalizeSkillName(skill.name))) : null;
    return found ? String(found.value) : "";
  }

  function compareSkillValue(a, b) { return b.value - a.value || a.name.localeCompare(b.name, "ja"); }
  function priorityIndex(name) { const n = normalizeSkillName(name); if (n.includes("目星")) return 0; if (n.includes("聞き耳")) return 1; if (n.includes("図書館")) return 2; return 3; }
  function matchesAny(name, keywords) { return keywords.some(keyword => normalizeSkillName(name).includes(normalizeSkillName(keyword))); }
  function normalizeKey(name) { const text = String(name || "").trim(); return /[A-Za-z]/.test(text) ? text.toUpperCase() : text; }
  function normalizeSkillName(name) { return String(name || "").trim().replace(/[【】]/g, "").toUpperCase(); }
  function multiplyParam(value, multiplier) { const digits = String(value || "").replace(/[^0-9]/g, ""); if (!digits) return "-"; const number = Number(digits); return Number.isFinite(number) ? String(number * multiplier) : "-"; }
  function cloneSafe(value) { try { if (typeof structuredClone === "function") return structuredClone(value); } catch (error) { console.warn(error); } try { return JSON.parse(JSON.stringify(value)); } catch (error) { console.warn(error); return {}; } }
  function createId() { if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID(); return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function isPlainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function safeText(value) { return String(value ?? "").trim(); }

  return { MAIN_STATUS, PARAMS, normalizeCharacterData, rebuildPc, detectEdition, commonSkillValue, paramValue, currentValue, copyableCharacterData, formatChatPalette };
})();
