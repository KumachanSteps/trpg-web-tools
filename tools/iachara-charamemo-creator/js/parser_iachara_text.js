const IacharaTextParser = (() => {
  const NL = "\n";

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, NL)
      .replace(/\r/g, NL)
      .replace(/\\n/g, NL);
  }

  function extractSection(text, sectionName) {
    const src = normalizeText(text);
    const heading = `【${sectionName}】`;
    const start = src.indexOf(heading);
    if (start < 0) return "";
    const rest = src.slice(start + heading.length);
    const match = rest.match(/\n【[^】]+】/);
    if (!match || match.index == null) return rest.trim();
    return rest.slice(0, match.index).trim();
  }

  function splitSections(text) {
    const sections = {};
    let current = "";
    normalizeText(text).split(NL).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("【") && trimmed.endsWith("】")) {
        current = trimmed.slice(1, -1).trim();
        sections[current] = "";
      } else if (current) {
        sections[current] += line + NL;
      }
    });
    return sections;
  }

  function cleanValue(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "").trim();
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractLabelValueFromSection(sectionText, label) {
    const lines = normalizeText(sectionText)
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean);
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*[:：]\\s*([^/\\n]+)`);
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) return cleanValue(match[1]);
    }
    return "";
  }

  function parseIacharaBasicInfo(text) {
    const basicInfo = extractSection(text, "基本情報");
    return {
      name: extractLabelValueFromSection(basicInfo, "名前"),
      occupation: extractLabelValueFromSection(basicInfo, "職業"),
      age: extractLabelValueFromSection(basicInfo, "年齢"),
      gender: extractLabelValueFromSection(basicInfo, "性別"),
      height: extractLabelValueFromSection(basicInfo, "身長"),
      weight: extractLabelValueFromSection(basicInfo, "体重"),
      rawSection: basicInfo
    };
  }

  function buildProfileSupplementFromIacharaText(text) {
    const info = parseIacharaBasicInfo(text);
    return [
      `職業: ${info.occupation || "未取得"}`,
      `年齢: ${info.age || "未取得"} / 性別: ${info.gender || "未取得"}`,
      `身長: ${info.height || "未取得"} / 体重: ${info.weight || "未取得"}`,
      "カラーコード: #008080"
    ].join(NL);
  }

  function parseAbilities(text) {
    const abilities = {};
    normalizeText(text).split(NL).forEach((line) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^(STR|CON|POW|DEX|APP|SIZ|INT|EDU|HP|MP|SAN|IDE|幸運|知識)\s+([0-9]+)/i);
      if (match) {
        const key = /^[a-z]+$/i.test(match[1]) ? match[1].toUpperCase() : match[1];
        abilities[key] = match[2];
      }
      if (trimmed.startsWith("現在SAN値")) {
        const sanMatch = trimmed.match(/現在SAN値\s+([0-9]+)/);
        if (sanMatch) abilities.SAN = sanMatch[1];
      }
    });
    return abilities;
  }

  function normalizeSkillNameForTxt(name) {
    return String(name || "")
      .trim()
      .replaceAll("（", "(")
      .replaceAll("）", ")")
      .replace(/\((.+?)\)/g, "：$1");
  }

  function parseSkills(text) {
    const skills = [];
    normalizeText(text).split(NL).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("『") || trimmed.startsWith("技能名") || trimmed.includes("ポイント")) return;
      const match = trimmed.match(/^(.+?)\s+([0-9]+)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+[0-9]+\s*$/);
      if (!match) return;
      skills.push({ name: normalizeSkillNameForTxt(match[1].trim()), value: match[2] });
    });
    return skills;
  }

  function extractUrls(text) {
    return normalizeText(text)
      .split(NL)
      .map((line) => line.trim().replace(/^:/, ""))
      .filter((line) => line.startsWith("http"));
  }

  function cleanSectionText(text) {
    return normalizeText(text)
      .split(NL)
      .map((line) => line.trimEnd())
      .join(NL)
      .trim();
  }

  function sectionText(parsed, sectionName) {
    if (!parsed?.sections?.[sectionName]) return "";
    return cleanSectionText(parsed.sections[sectionName]);
  }

  function detectEdition(parsed) {
    if (!parsed) return "";
    const header = parsed.raw.split(NL).slice(0, 3).join(" ");
    if (header.includes("7版")) return "7e";
    if (header.includes("6版")) return "6e";
    const bigStats = Object.values(parsed.abilities || {}).some((value) => Number(value) > 30);
    const has7eSkill = (parsed.skills || []).some((skill) => ["近接戦闘", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "威圧", "魅惑"].some((word) => skill.name.includes(word)));
    return bigStats || has7eSkill ? "7e" : "6e";
  }

  function buildCommandsFromTxtData(parsed) {
    if (!parsed || !Array.isArray(parsed.skills)) return "";
    const command = detectEdition(parsed) === "7e" ? "CC" : "CCB";
    const lines = [];
    if (parsed.abilities?.SAN) lines.push(`${command}<=${parsed.abilities.SAN} 【正気度ロール】`);
    if (parsed.abilities?.IDE) lines.push(`${command}<=${parsed.abilities.IDE} 【アイデア】`);
    if (parsed.abilities?.幸運) lines.push(`${command}<=${parsed.abilities.幸運} 【幸運】`);
    if (parsed.abilities?.知識) lines.push(`${command}<=${parsed.abilities.知識} 【知識】`);
    parsed.skills.forEach((skill) => lines.push(`${command}<=${skill.value} 【${skill.name}】`));
    return lines.join(NL);
  }

  function buildMemoFromIacharaText(text, options = {}) {
    const parsed = parse(text);
    if (!parsed.found) return "";
    const parts = [];
    if (options.includeWeapons !== false) parts.push(buildSectionBlock("戦闘・武器・防具", sectionText(parsed, "戦闘・武器・防具"), "※ いあきゃらTXTやキャラシ情報から追記してください。"));
    if (options.includeItems !== false) parts.push(buildSectionBlock("所持品", sectionText(parsed, "所持品"), "※ いあきゃらTXTやキャラシ情報から追記してください。"));
    if (options.includeKnowledge !== false) parts.push(buildSectionBlock("新たに得た知識・経験", sectionText(parsed, "通過したシナリオ名"), "※ 通過シナリオや成長メモを追記してください。"));
    if (options.includeTxtMemo !== false) parts.push(buildSectionBlock("TXT内メモ", sectionText(parsed, "メモ"), "※ TXT内メモがある場合はここへ反映してください。"));
    return parts.filter(Boolean).join(NL + NL);
  }

  function buildSectionBlock(label, content, fallback) {
    return `【${label}】${NL}${content || fallback}`;
  }

  function parse(text) {
    const normalized = normalizeText(text);
    const sections = splitSections(normalized);
    const profile = parseIacharaBasicInfo(normalized);
    const abilities = parseAbilities(sections["能力値"] || "");
    const skills = parseSkills(sections["技能値"] || "");
    const icons = extractUrls(sections["アイコン"] || "");
    const found = Boolean(profile.name || profile.occupation || Object.keys(sections).length || skills.length || Object.keys(abilities).length);
    return { found, raw: normalized, sections, profile, abilities, skills, icons };
  }

  return {
    normalizeText,
    extractSection,
    parseIacharaBasicInfo,
    buildProfileSupplementFromIacharaText,
    buildMemoFromIacharaText,
    buildCommandsFromTxtData,
    detectEdition,
    sectionText,
    parse
  };
})();

window.IacharaTextParser = IacharaTextParser;
