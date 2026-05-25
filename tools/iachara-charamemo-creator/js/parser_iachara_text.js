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
      `身長: ${info.height || "未取得"} / 体重: ${info.weight || "未取得"}`
    ].join("\n");
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
    if (config.includeWeapons && weapons) parts.push(`【戦闘・武器・防具】\n${weapons}`);

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
    parseIacharaText
  };
})();
