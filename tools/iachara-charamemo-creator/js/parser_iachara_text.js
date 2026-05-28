(function () {
  "use strict";

  const NL = "\n";

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, NL)
      .replace(/\r/g, NL)
      .replace(/\\n/g, NL);
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
    const rest = src.slice(start + heading.length);
    const next = rest.match(/\n【[^】]+】/);
    return (next && next.index != null ? rest.slice(0, next.index) : rest).trim();
  }

  function extractLabelValueFromSection(sectionText, label) {
    const lines = normalizeText(sectionText).split(NL).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const value = extractLabelValueFromLine(line, label);
      if (value !== null) return cleanValue(value);
    }
    return "";
  }

  function extractLabelValueFromLine(line, label) {
    const src = String(line || "");
    const pattern = new RegExp(`(^|[/\\s　])${escapeRegExp(label)}\\s*[:：]`);
    const match = src.match(pattern);
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
    ].join(NL);
  }

  function formatCombatWeaponsSection(sectionText) {
    const raw = normalizeText(sectionText).trim();
    if (!raw) return "";

    const lines = raw.split(NL).map((line) => line.trimEnd()).filter((line) => line.trim());
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
      parts.push(formatWeaponTable(weaponRows));
    }
    if (otherLines.length) parts.push(otherLines.join(NL));
    return parts.join(NL).trim();
  }

  function isDecorativeLine(line) {
    return /^[-─━=＿_\s　]+$/.test(String(line || ""));
  }

  function isWeaponHeaderLine(line) {
    const src = String(line || "");
    return (src.includes("名前") && src.includes("成功率")) ||
      (src.includes("名称") && src.includes("ダメージ")) ||
      (src.includes("射程") && src.includes("故障"));
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
    return /^\d+D\d+([+\-]\d+)?$/i.test(src) ||
      /^\d+D\d+([+\-]DB)?$/i.test(src) ||
      /^DB$/i.test(src) ||
      /^\d+D\d+\+db$/i.test(src) ||
      src.includes("ダメージ");
  }

  function normalizeCountUnit(value, unit) {
    const src = displayValue(value);
    if (src === "-") return "-";
    return src.endsWith(unit) ? src : `${src}${unit}`;
  }

  function formatWeaponTable(rows) {
    const normalizedRows = rows.map((row) => ({
      name: displayValue(row.name),
      damage: displayValue(row.damage),
      range: displayValue(row.range),
      attacks: displayValue(row.attacks),
      ammo: displayValue(row.ammo),
      durability: displayValue(row.durability),
      malfunction: displayValue(row.malfunction)
    }));

    const widths = {
      name: Math.max(getDisplayWidth("武器：名称"), ...normalizedRows.map((row) => getDisplayWidth(row.name))) + 3,
      damage: Math.max(getDisplayWidth("ダメージ"), ...normalizedRows.map((row) => getDisplayWidth(row.damage))) + 2,
      range: Math.max(getDisplayWidth("射程"), ...normalizedRows.map((row) => getDisplayWidth(row.range))) + 2,
      attacks: Math.max(getDisplayWidth("1R"), ...normalizedRows.map((row) => getDisplayWidth(row.attacks))) + 2,
      ammo: Math.max(getDisplayWidth("弾数"), ...normalizedRows.map((row) => getDisplayWidth(row.ammo))) + 2,
      durability: Math.max(getDisplayWidth("耐久"), ...normalizedRows.map((row) => getDisplayWidth(row.durability))) + 2
    };

    const lines = [];
    lines.push([
      padDisplay("武器：名称", widths.name),
      padDisplay("ダメージ", widths.damage),
      padDisplay("射程", widths.range),
      padDisplay("1R", widths.attacks),
      padDisplay("弾数", widths.ammo),
      padDisplay("耐久", widths.durability),
      "故障No."
    ].join("┊"));

    normalizedRows.forEach((row) => {
      lines.push([
        padDisplay(row.name, widths.name),
        padDisplay(row.damage, widths.damage),
        padDisplay(row.range, widths.range),
        padDisplay(row.attacks, widths.attacks),
        padDisplay(row.ammo, widths.ammo),
        padDisplay(row.durability, widths.durability),
        row.malfunction
      ].join("┊"));
    });

    return lines.join(NL);
  }

  function getDisplayWidth(value) {
    return Array.from(String(value || "")).reduce((sum, char) => {
      return sum + (isHalfWidthChar(char) ? 1 : 2);
    }, 0);
  }

  function isHalfWidthChar(char) {
    return /^[\u0020-\u007e｡-ﾟ]$/.test(char);
  }

  function padDisplay(value, targetWidth) {
    const src = displayValue(value);
    const missing = Math.max(0, targetWidth - getDisplayWidth(src));
    return src + " ".repeat(missing);
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
        `名前: ${displayValue(info.name)}`,
        buildProfileSupplementFromIacharaText(src)
      ].join(NL));
    }

    const weapons = extractSection(src, "戦闘・武器・防具");
    if (config.includeWeapons && weapons) parts.push(`【戦闘・武器・防具】${NL}${formatCombatWeaponsSection(weapons)}`);

    const items = extractSection(src, "所持品");
    if (config.includeItems && items) parts.push(`【所持品】${NL}${items}`);

    const scenario = extractSection(src, "通過したシナリオ名");
    const knowledge = scenario || extractSection(src, "新たに得た知識・経験");
    if (config.includeKnowledge && knowledge) parts.push(`【新たに得た知識・経験】${NL}${knowledge}`);

    const memo = extractSection(src, "メモ");
    if (config.includeTxtMemo && memo) parts.push(`【メモ】${NL}${memo}`);

    return parts.filter(Boolean).join(NL + NL);
  }

  function parseIacharaText(text) {
    const src = normalizeText(text);
    return {
      found: Boolean(extractSection(src, "基本情報") || extractSection(src, "戦闘・武器・防具") || extractSection(src, "所持品") || extractSection(src, "メモ")),
      profile: parseIacharaBasicInfo(src),
      sections: {
        weapons: extractSection(src, "戦闘・武器・防具"),
        items: extractSection(src, "所持品"),
        knowledge: extractSection(src, "通過したシナリオ名") || extractSection(src, "新たに得た知識・経験"),
        memo: extractSection(src, "メモ")
      },
      profileText: buildProfileSupplementFromIacharaText(src),
      memoText: buildMemoFromIacharaText(src),
      rawText: src
    };
  }

  window.IacharaTextParser = {
    normalizeText,
    extractSection,
    parseIacharaBasicInfo,
    buildProfileSupplementFromIacharaText,
    formatCombatWeaponsSection,
    buildMemoFromIacharaText,
    parseIacharaText
  };
})();
