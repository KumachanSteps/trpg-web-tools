(function () {
  "use strict";

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\\n/g, "\n");
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function cleanValue(value) {
    return String(value || "").replace(/^[\s:：]+/, "").replace(/\s+$/g, "").trim();
  }

  function displayValue(value) {
    const clean = cleanValue(value);
    return clean || "-";
  }

  function extractSection(text, sectionName) {
    const src = normalizeText(text);
    const heading = `【${sectionName}】`;
    const start = src.indexOf(heading);

    if (start < 0) return "";

    const bodyStart = start + heading.length;
    const rest = src.slice(bodyStart);
    const nextSectionMatch = rest.match(/\n【[^】]+】/);

    if (!nextSectionMatch || nextSectionMatch.index == null) return rest.trim();

    return rest.slice(0, nextSectionMatch.index).trim();
  }

  function extractLabelValueFromSection(sectionText, label) {
    const lines = normalizeText(sectionText).split("\n").map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      const value = extractLabelValueFromLine(line, label);
      if (value !== null) return cleanValue(value);
    }

    return "";
  }

  function extractLabelValueFromLine(line, label) {
    const src = String(line || "");
    const labelPattern = new RegExp(`(^|[/\\s　])${escapeRegExp(label)}\\s*[:：]`);
    const match = src.match(labelPattern);
    if (!match || match.index == null) return null;

    const valueStart = match.index + match[0].length;
    const rest = src.slice(valueStart);
    const slashIndex = rest.indexOf("/");
    return slashIndex >= 0 ? rest.slice(0, slashIndex) : rest;
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
      `職業: ${displayValue(info.occupation)}`,
      `年齢: ${displayValue(info.age)} / 性別: ${displayValue(info.gender)}`,
      `身長: ${displayValue(info.height)} / 体重: ${displayValue(info.weight)}`
    ].join("\n");
  }


  function formatCombatWeaponsSection(sectionText) {
    const lines = normalizeText(sectionText).split("\n").map((line) => line.trim()).filter(Boolean);
    const weaponRows = [];
    const otherLines = [];

    for (const line of lines) {
      if (isDecorativeLine(line) || isWeaponHeaderLine(line)) continue;
      const row = parseWeaponRow(line);
      if (row) weaponRows.push(row);
      else otherLines.push(line);
    }

    const parts = [];
    if (weaponRows.length) {
      parts.push("武器：名称　　　　　 ┊ダメージ┊　射程┊　1R┊弾数┊耐久┊故障No.");
      weaponRows.forEach((row) => {
        parts.push(formatWeaponRow(row));
      });
    }
    if (otherLines.length) parts.push(otherLines.join("\n"));
    return parts.join("\n").trim();
  }

  function isDecorativeLine(line) {
    return /^[-─━=＿_\s]+$/.test(String(line || ""));
  }

  function isWeaponHeaderLine(line) {
    const src = String(line || "");
    return (src.includes("名前") && src.includes("成功率")) || (src.includes("名称") && src.includes("ダメージ")) || (src.includes("射程") && src.includes("故障"));
  }

  function parseWeaponRow(line) {
    const tokens = String(line || "").replace(/[｜|┊]/g, " ").split(/[\s　]+/).filter(Boolean);
    if (tokens.length < 6) return null;

    const damageIndex = tokens.findIndex((token) => isDamageToken(token));
    if (damageIndex <= 0) return null;

    const nameTokens = tokens.slice(0, damageIndex);
    if (nameTokens.length > 1 && /^\d{1,3}$/.test(nameTokens[nameTokens.length - 1])) nameTokens.pop();

    const row = {
      name: nameTokens.join(" ") || "-",
      damage: tokens[damageIndex] || "-",
      range: tokens[damageIndex + 1] || "-",
      attacks: normalizeCountUnit(tokens[damageIndex + 2], "回"),
      ammo: normalizeCountUnit(tokens[damageIndex + 3], "発"),
      durability: displayValue(tokens[damageIndex + 4]),
      malfunction: displayValue(tokens[damageIndex + 5])
    };

    return row.name === "-" ? null : row;
  }

  function isDamageToken(token) {
    const src = String(token || "").trim();
    return /^\d+D\d+([+\-]\d+)?$/i.test(src) || /^\d+D\d+([+\-]DB)?$/i.test(src) || /^DB$/i.test(src) || /^\d+D\d+\+db$/i.test(src) || src.includes("ダメージ");
  }

  function normalizeCountUnit(value, unit) {
    const src = displayValue(value);
    if (src === "-") return "-";
    return src.endsWith(unit) ? src : `${src}${unit}`;
  }

  function formatWeaponRow(row) {
    return [
      padVisual(row.name, 30),
      padVisual(row.damage, 10),
      padVisual(row.range, 10),
      padVisual(row.attacks, 7),
      padVisual(row.ammo, 7),
      padVisual(row.durability, 7),
      padVisual(row.malfunction, 8)
    ].join("");
  }

  function padVisual(text, width) {
    const src = displayValue(text);
    const visualWidth = Array.from(src).reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1), 0);
    if (visualWidth >= width) return src + "　";
    return src + " ".repeat(width - visualWidth);
  }

  function buildMemoFromIacharaText(text, options) {
    const src = normalizeText(text);
    const info = parseIacharaBasicInfo(src);
    const config = Object.assign({
      includeWeapons: true,
      includeItems: true,
      includeKnowledge: true,
      includeTxtMemo: true
    }, options || {});

    const parts = [];

    if (info.name || info.occupation || info.age || info.gender || info.height || info.weight) {
      parts.push([
        `名前: ${info.name || "未取得"}`,
        buildProfileSupplementFromIacharaText(src)
      ].join("\n"));
    }

    const weapons = extractSection(src, "戦闘・武器・防具");
    if (config.includeWeapons && weapons) parts.push(`【戦闘・武器・防具】\n${formatCombatWeaponsSection(weapons)}`);

    const items = extractSection(src, "所持品");
    if (config.includeItems && items) parts.push(`【所持品】\n${items}`);

    const scenario = extractSection(src, "通過したシナリオ名");
    if (config.includeKnowledge && scenario) parts.push(`【新たに得た知識・経験】\n${scenario}`);

    const memo = extractSection(src, "メモ");
    if (config.includeTxtMemo && memo) parts.push(`【メモ】\n${memo}`);

    return parts.filter(Boolean).join("\n\n");
  }

  function parseIacharaText(text) {
    return {
      profile: parseIacharaBasicInfo(text),
      profileText: buildProfileSupplementFromIacharaText(text),
      memoText: buildMemoFromIacharaText(text),
      rawText: normalizeText(text)
    };
  }

  window.IacharaTextParser = {
    normalizeText,
    extractSection,
    parseIacharaBasicInfo,
    buildProfileSupplementFromIacharaText,
    buildMemoFromIacharaText,
    formatCombatWeaponsSection,
    parseIacharaText
  };
})();
