const NL = "\n";

window.CharamemoParser = (() => {
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

  function parseIacharaTxt(text) {
    const src = normalizeText(text);
    const sections = splitSections(src);
    const profile = parseProfile(sections["基本情報"] || "");
    const icons = extractUrls(sections["アイコン"] || "");
    const abilities = parseAbilities(sections["能力値"] || "");
    const weapons = parseSimpleList(sections["戦闘・武器・防具"] || "");
    const items = parseItemsFromText(sections["所持品"] || "", sections["メモ"] || "");
    const backstory = cleanupBlock(sections["バックストーリー"] || "");
    const scenarioHistory = cleanupBlock(sections["通過したシナリオ名"] || "");
    const memo = cleanupBlock(sections["メモ"] || "");
    const found = Boolean(profile.name || icons.length || Object.keys(abilities).length || items.length || weapons.length || backstory || scenarioHistory || memo);
    return { found, profile, icons, abilities, weapons, items, backstory, scenarioHistory, memo, sections };
  }

  function splitSections(text) {
    const lines = normalizeText(text).split(NL);
    const sections = {};
    let current = "";
    for (const line of lines) {
      const match = line.match(/^【(.+?)】\s*$/);
      if (match) {
        current = match[1].trim();
        sections[current] = "";
        continue;
      }
      if (current) sections[current] += line + NL;
    }
    return sections;
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
      skin: pickInline(appearanceLine, "肌の色")
    };
  }

  function parseAbilities(text) {
    const result = {};
    const names = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN", "IDE", "幸運", "知識"];
    for (const line of normalizeText(text).split(NL)) {
      const trimmed = line.trim();
      const name = names.find((key) => trimmed.startsWith(key));
      if (!name) continue;
      const nums = trimmed.replace(name, "").trim().split(/\s+/).filter(Boolean);
      if (nums[0]) result[name] = nums[0];
    }
    const currentSan = text.match(/現在SAN値\s*([0-9]+)\s*\/\s*([0-9]+)/);
    if (currentSan) result.SAN = currentSan[1];
    return result;
  }

  function parseItemsFromText(itemSection, memoSection) {
    const source = [itemSection, extractMarkedSubsection(memoSection, "所持品")].filter(Boolean).join(NL);
    return parseSimpleList(source).filter((line) => !line.includes("名称") && !line.includes("単価") && !line.includes("現在の所持金") && !line.includes("借金"));
  }

  function parseSimpleList(text) {
    return normalizeText(text)
      .split(NL)
      .map((line) => line.trim())
      .filter((line) => line && !line.match(/^[-━ー\s]+$/) && !line.includes("名前                        成功率"))
      .slice(0, 80);
  }

  function extractMarkedSubsection(text, label) {
    const src = normalizeText(text);
    const startPattern = `■【${label}】`;
    const start = src.indexOf(startPattern);
    if (start < 0) return "";
    const rest = src.slice(start + startPattern.length);
    const next = rest.search(/\n■【|\n\[|\n【/);
    return cleanupBlock(next >= 0 ? rest.slice(0, next) : rest);
  }

  function buildProfileLines(koma, parsedTxt) {
    const p = parsedTxt.profile || {};
    const lines = [];
    const name = p.name || (koma && koma.name) || "";
    if (name) lines.push(`名前：${name}`);
    if (p.occupation) lines.push(`職業：${p.occupation}`);
    if (p.age || p.gender) lines.push(`年齢／性別：${p.age || ""}${p.age && p.gender ? "／" : ""}${p.gender || ""}`);
    if (p.height || p.weight) lines.push(`身長／体重：${p.height || ""}${p.height && p.weight ? "／" : ""}${p.weight || ""}`);
    if (p.birthday) lines.push(`誕生日：${p.birthday}`);
    if (p.tag) lines.push(`タグ：${p.tag}`);
    return lines.filter(Boolean);
  }

  function buildMemo(koma, parsedTxt, options) {
    if (!koma && !parsedTxt.found) return "";
    const profileLines = buildProfileLines(koma, parsedTxt);
    const parts = [];
    const profileBlock = profileLines.length ? ["【プロフィール】", ...profileLines].join(NL) : "";
    if (profileBlock) parts.push(profileBlock);
    if (options.includeWeapons && parsedTxt.weapons.length) parts.push(["【戦闘・武器・防具】", ...parsedTxt.weapons].join(NL));
    if (options.includeItems && parsedTxt.items.length) parts.push(["【所持品】", ...parsedTxt.items].join(NL));
    if (options.includeKnowledgeExperience && parsedTxt.scenarioHistory) parts.push(["【新たに得た知識・経験】", parsedTxt.scenarioHistory].join(NL));
    if (parsedTxt.backstory) parts.push(["【バックストーリー】", parsedTxt.backstory].join(NL));
    if (options.includeTxtMemo && parsedTxt.memo) parts.push(["【メモ】", parsedTxt.memo].join(NL));
    if (koma && koma.memo) parts.push(["【既存駒メモ】", koma.memo].join(NL));
    return parts.filter(Boolean).join(NL + NL);
  }

  function buildTxtPreview(parsedTxt) {
    if (!parsedTxt.found) return "いあきゃらTXTを貼り付けるか、txtファイルを開くと解析結果が表示されます。";
    const lines = [];
    lines.push("【基本情報】");
    lines.push(...Object.entries(parsedTxt.profile).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`));
    lines.push("");
    lines.push("【所持品プレビュー】");
    lines.push(...parsedTxt.items.slice(0, 12));
    lines.push("");
    lines.push("【メモ冒頭】");
    lines.push(parsedTxt.memo.slice(0, 700));
    return lines.join(NL).trim();
  }

  function detectEditionFromInputs(koma, parsedTxt) {
    const header = normalizeText(Object.keys((parsedTxt && parsedTxt.sections) || {}).join(" "));
    if (header.includes("7版") || header.includes("7th")) return "7e";
    if (header.includes("6版") || header.includes("6th")) return "6e";
    if (koma && koma.commands) return detectEditionFromCommands(koma.commands);
    return "";
  }

  function detectEditionFromCommands(text) {
    const normalized = normalizeText(text);
    if (normalized.includes("近接戦闘") || normalized.includes("射撃（") || normalized.includes("射撃(")) return "7e";
    if (normalized.includes("CCB<=") || normalized.includes("こぶし") || normalized.includes("忍び歩き")) return "6e";
    return normalized.includes("CC<=") ? "7e" : "6e";
  }

  function getStatusCards(koma, parsedTxt) {
    const source = parsedTxt.abilities || {};
    const fromTxt = ["HP", "MP", "SAN", "幸運"].map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return ((koma && koma.status) || []).slice(0, 4).map((item) => ({ label: item.label, value: item.value }));
  }

  function getParamCards(koma, parsedTxt) {
    const source = parsedTxt.abilities || {};
    const stats = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
    const fromTxt = stats.map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return ((koma && koma.params) || []).map((item) => ({ label: item.label, value: item.value }));
  }

  function formatCommands(commands, edition) {
    const command = edition === "6e" ? "CCB" : "CC";
    return normalizeText(commands)
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^s?CCB?<=/, `${command}<=`).replace(/^1d100<=/, `${command}<=`))
      .join(NL);
  }

  function findLine(text, key) {
    return normalizeText(text).split(NL).find((line) => line.includes(key + ":")) || "";
  }

  function pickLineValue(text, key) {
    const line = findLine(text, key);
    return cleanupValue(line.replace(key + ":", ""));
  }

  function pickInline(line, key) {
    const source = String(line || "");
    const start = source.indexOf(key + ":");
    if (start < 0) return "";
    const rest = source.slice(start + key.length + 1);
    const nextKeys = ["年齢:", "性別:", "身長:", "体重:", "出身:", "髪の色:", "瞳の色:", "肌の色:"];
    const candidates = nextKeys.map((marker) => rest.indexOf(marker)).filter((index) => index > 0);
    const slashIndex = rest.indexOf("/");
    if (slashIndex > 0) candidates.push(slashIndex);
    const end = candidates.length ? Math.min(...candidates) : -1;
    return cleanupValue(end >= 0 ? rest.slice(0, end) : rest);
  }

  function extractUrls(text) {
    return Array.from(String(text || "").matchAll(/https?:\/\/\S+/g)).map((match) => match[0].replace(/[\]\)）,.、。]+$/, ""));
  }

  function normalizeText(text) {
    return String(text || "").replaceAll("\\n", NL).replace(/\r\n/g, NL).replace(/\r/g, NL);
  }

  function cleanupValue(value) {
    return String(value || "").replace(/^[\s:：]+/, "").trim();
  }

  function cleanupBlock(value) {
    return normalizeText(value).replace(/\n{3,}/g, NL + NL).trim();
  }

  return {
    parseKomaJson,
    parseIacharaTxt,
    buildMemo,
    buildTxtPreview,
    detectEditionFromInputs,
    getStatusCards,
    getParamCards,
    formatCommands,
    normalizeText
  };
})();
