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

  function extractFirstSection(text, sectionNames) {
    for (const name of sectionNames) {
      const section = extractSection(text, name);
      if (section) return section;
    }
    return "";
  }
  function extractMemoSection(text) {
    const src = normalizeText(text);
    const headingPattern = /(?:^|\n)[ \t　]*【メモ】[ \t]*(?:\n|$)/;
    const match = headingPattern.exec(src);

    if (!match || match.index == null) return "";

    const bodyStart = match.index + match[0].length;
    const rest = src.slice(bodyStart);
    const nextIndex = findNextBracketHeadingIndex(rest);

    return (nextIndex >= 0 ? rest.slice(0, nextIndex) : rest).trim();
  }

  function findNextBracketHeadingIndex(text) {
    const src = normalizeText(text);
    const match = /(?:^|\n)[ \t　]*【[^】\n]{1,80}】[ \t]*(?:\n|$)/.exec(src);

    if (!match || match.index == null) return -1;
    return match.index;
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
    const headerLine = lines.find((line) => isWeaponHeaderLine(line));
    const columnSpec = headerLine ? getWeaponColumnSpec(headerLine) : null;
    const weaponRows = [];
    const otherLines = [];

    for (const line of lines) {
      if (isDecorativeLine(line) || isWeaponHeaderLine(line)) continue;
      const row = parseWeaponRow(line, columnSpec);
      if (row) weaponRows.push(row);
      else otherLines.push(line);
    }

    const parts = [];
    if (weaponRows.length) parts.push(formatWeaponTable(weaponRows));
    if (otherLines.length) parts.push(otherLines.join(NL));
    return parts.join(NL).trim();
  }

  function isDecorativeLine(line) {
    return /^[-─━=＿_\s　]+$/.test(String(line || ""));
  }

  function isWeaponHeaderLine(line) {
    const src = String(line || "");
    return (src.includes("名前") && src.includes("成功率")) ||
      (src.includes("ダメージ") && src.includes("射程") && (src.includes("故障") || src.includes("耐久")));
  }

  function getWeaponColumnSpec(headerLine) {
    const labels = [
      ["name", "名前"],
      ["success", "成功率"],
      ["damage", "ダメージ"],
      ["range", "射程"],
      ["attacks", "攻撃回数"],
      ["ammo", "装弾数"],
      ["durability", "耐久力"],
      ["malfunction", "故障その他"]
    ];
    const found = labels
      .map(([key, label]) => ({ key, index: String(headerLine).indexOf(label) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);
    return found.length >= 3 ? found : null;
  }

  function parseWeaponRow(line, columnSpec) {
    const raw = String(line || "").trim();
    if (!raw) return null;

    const tokens = raw
      .replace(/[｜|┊]/g, " ")
      .split(/\t+|\s{2,}/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (tokens.length < 3) return null;

    return mapWeaponTokens(tokens);
  }

  function mapWeaponTokens(tokens) {
    const row = {
      name: tokens[0] || "-",
      success: tokens[1] || "-",
      damage: tokens[2] || "-",
      range: "-",
      attacks: "-",
      ammo: "-",
      durability: "-",
      malfunction: "-"
    };

    const rest = tokens.slice(3);

    if (rest.length === 1) {
      if (isPlainNumber(rest[0])) row.durability = displayValue(rest[0]);
      else row.range = displayValue(rest[0]);
      return row;
    }

    if (rest.length >= 1) row.range = displayValue(rest[0]);
    if (rest.length >= 2) row.attacks = normalizeAttackCount(rest[1]);
    if (rest.length >= 3) row.ammo = normalizeAmmoCount(rest[2]);

    if (rest.length === 4 && row.ammo === "-" && String(rest[3] || "").trim().startsWith("-")) {
      row.malfunction = displayValue(rest[3]);
      return row;
    }

    if (rest.length >= 4) row.durability = displayValue(rest[3]);
    if (rest.length >= 5) row.malfunction = displayValue(rest.slice(4).join(" "));

    return row;
  }

  function isPlainNumber(value) {
    return /^\d+$/.test(String(value || "").trim());
  }

  function isDamageToken(token) {
    const src = String(token || "").trim();
    return /^\d+D\d+([+\-]\d+)?$/i.test(src) ||
      /^\d+D\d+([+\-]DB)?$/i.test(src) ||
      /^DB$/i.test(src) ||
      /^\d+D\d+\+db$/i.test(src) ||
      src.includes("ダメージ");
  }

  function normalizeAttackCount(value) {
    const src = displayValue(value);
    if (src === "-") return "-";
    if (src.endsWith("回") || src.includes("/") || src.includes("連射")) return src;
    return `${src}回`;
  }

  function normalizeAmmoCount(value) {
    const src = displayValue(value);
    if (src === "-") return "-";
    if (src.endsWith("発") || src.includes("/")) return src;
    return `${src}発`;
  }

  function normalizeCountUnit(value, unit) {
    const src = displayValue(value);
    if (src === "-") return "-";
    return src.endsWith(unit) ? src : `${src}${unit}`;
  }

  function formatWeaponTable(rows) {
    const normalizedRows = rows.map((row) => ({
      name: displayValue(row.name),
      success: displayValue(row.success),
      damage: displayValue(row.damage),
      range: displayValue(row.range),
      attacks: displayValue(row.attacks),
      ammo: displayValue(row.ammo),
      durability: displayValue(row.durability),
      malfunction: displayValue(row.malfunction)
    }));

    return normalizedRows.map(formatWeaponBlock).join(NL);
  }

  function formatWeaponBlock(row) {
    const lines = [`武器：${row.name}`];
    const secondLine = [
      row.success !== "-" ? `成功率${row.success}` : "",
      row.damage !== "-" ? `ダメージ${row.damage}` : "",
      row.range !== "-" ? `射程${row.range}` : ""
    ].filter(Boolean).join("｜");
    const thirdLine = [
      row.attacks !== "-" ? `回数${row.attacks}` : "",
      row.ammo !== "-" ? `装弾数${row.ammo}` : "",
      row.durability !== "-" ? `耐久力${row.durability}` : "",
      row.malfunction !== "-" ? `故障${row.malfunction}` : ""
    ].filter(Boolean).join("｜");
    if (secondLine) lines.push(`${secondLine}｜`);
    if (thirdLine) lines.push(`${thirdLine}｜`);
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

  function formatItemsSection(sectionText) {
    const lines = normalizeText(sectionText)
      .split(NL)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim());

    const headerLine = lines.find((line) => isItemHeaderLine(line));
    const columnSpec = headerLine ? getItemColumnSpec(headerLine) : null;

    const rows = lines
      .filter((line) => !isItemHeaderLine(line))
      .map((line) => parseItemRow(line, columnSpec))
      .filter(Boolean);

    if (!rows.length) return normalizeText(sectionText).trim();

    return rows.map((row) => {
      if (row.note === "-") return row.name;
      return `${row.name}：${row.note}`;
    }).join(NL);
  }

  function isItemHeaderLine(line) {
    const src = String(line || "").trim();
    return src.startsWith("名称") || (src.includes("名称") && (src.includes("効果、備考") || src.includes("効果・備考")));
  }

  function getItemColumnSpec(headerLine) {
    const src = String(headerLine || "");
    const noteLabels = ["効果、備考など", "効果・備考など", "効果、備考", "効果・備考", "備考"];
    const nameIndex = src.indexOf("名称");
    const priceIndex = src.indexOf("単価");
    const noteIndex = noteLabels.map((label) => src.indexOf(label)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
    if (nameIndex < 0) return null;
    return {
      nameStart: nameIndex,
      nameEnd: priceIndex > nameIndex ? priceIndex : noteIndex,
      noteStart: noteIndex >= 0 ? noteIndex : -1
    };
  }

  function parseItemRow(line, columnSpec) {
    const raw = String(line || "").trimEnd();
    const trimmed = raw.trim();

    if (!trimmed) return null;
    if (/^(現在の所持金|所持金|借金)\s*[:：]/.test(trimmed)) return null;

    if (columnSpec && columnSpec.nameStart >= 0) {
      const name = displayValue(raw.slice(columnSpec.nameStart, columnSpec.nameEnd && columnSpec.nameEnd > columnSpec.nameStart ? columnSpec.nameEnd : undefined).trim());
      const note = columnSpec.noteStart >= 0 ? displayValue(raw.slice(columnSpec.noteStart).trim()) : "-";
      if (name !== "-") return { name, note };
    }

    const columns = trimmed
      .split(/	+|\s{2,}/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!columns.length) return null;

    const name = displayValue(columns[0]);
    let note = "-";

    if (columns.length >= 5) {
      note = displayValue(columns.slice(4).join(" "));
    } else if (columns.length >= 2) {
      note = displayValue(columns.slice(1).join(" "));
    }

    return { name, note };
  }


  function isTargetKnowledgeHeading(line) {
    return /^(【\s*)?(魔導書|呪文|アーティファクト)(\s*】)?\s*[:：]?/.test(String(line || "").trim());
  }

  function includesTargetKnowledgeWord(line) {
    return /(魔導書|呪文|アーティファクト)/.test(String(line || ""));
  }

  function extractTargetKnowledgeBlocks(sectionText) {
    const lines = normalizeText(sectionText).split(NL);
    const blocks = [];
    let current = [];
    let collecting = false;

    function flush() {
      const block = current.join(NL).trim();
      if (block) blocks.push(block);
      current = [];
      collecting = false;
    }

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (!trimmed) {
        if (collecting) flush();
        continue;
      }

      if (isTargetKnowledgeHeading(trimmed)) {
        if (collecting) flush();
        current.push(line);
        collecting = true;
        continue;
      }

      if (/^【[^】]+】/.test(trimmed) && collecting) {
        flush();
      }

      if (collecting) {
        current.push(line);
        continue;
      }

      if (includesTargetKnowledgeWord(trimmed)) {
        current.push(line);
        flush();
      }
    }

    if (collecting) flush();
    return blocks;
  }

  function getTargetKnowledgeText(text) {
    const src = normalizeText(text);
    const parts = [];

    ["魔導書", "呪文", "アーティファクト"].forEach((name) => {
      const direct = extractSection(src, name);
      if (direct) parts.push(`【${name}】${NL}${direct}`);
    });

    const knowledgeSection = extractSection(src, "新たに得た知識・経験");
    extractTargetKnowledgeBlocks(knowledgeSection).forEach((block) => {
      if (!parts.includes(block)) parts.push(block);
    });

    return parts.join(NL + NL).trim();
  }

  function buildMemoFromIacharaText(text, options) {
    const src = normalizeText(text);
    const info = parseIacharaBasicInfo(src);
    const config = Object.assign({
      includeWeapons: true,
      includeItems: true,
      includeKnowledge: false,
      includeTxtMemo: false
    }, options || {});

    const parts = [];

    if (info.name || info.occupation || info.age || info.gender || info.height || info.weight) {
      parts.push([
        `名前: ${displayValue(info.name)}`,
        buildProfileSupplementFromIacharaText(src)
      ].join(NL));
    }

    const weapons = extractFirstSection(src, ["武器", "戦闘・武器・防具"]);
    if (config.includeWeapons && weapons) parts.push(`【戦闘・武器・防具】${NL}${formatCombatWeaponsSection(weapons)}`);

    const items = extractFirstSection(src, ["冒険の装備とその他の所持品", "所持品"]);
    if (config.includeItems && items) parts.push(`【所持品】${NL}${formatItemsSection(items)}`);

    const knowledge = getTargetKnowledgeText(src);
    if (config.includeKnowledge && knowledge) parts.push(`【新たに得た知識・経験】${NL}${knowledge}`);

    const memo = extractMemoSection(src);
    if (config.includeTxtMemo && memo) parts.push(`【メモ】${NL}${memo}`);

    return parts.filter(Boolean).join(NL + NL);
  }

  function parseIacharaText(text) {
    const src = normalizeText(text);
    return {
      found: Boolean(extractSection(src, "基本情報") || extractFirstSection(src, ["武器", "戦闘・武器・防具"]) || extractFirstSection(src, ["冒険の装備とその他の所持品", "所持品"]) || extractMemoSection(src) || getTargetKnowledgeText(src)),
      profile: parseIacharaBasicInfo(src),
      sections: {
        weapons: extractFirstSection(src, ["武器", "戦闘・武器・防具"]),
        items: extractFirstSection(src, ["冒険の装備とその他の所持品", "所持品"]),
        knowledge: getTargetKnowledgeText(src),
        memo: extractMemoSection(src)
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
    formatItemsSection,
    getTargetKnowledgeText,
    buildMemoFromIacharaText,
    parseIacharaText
  };
})();
