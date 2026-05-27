(function () {
  "use strict";

  const NL = "\n";

  const state = {
    parsedKoma: null,
    parsedTxt: createEmptyTxtParsed(),
    memoDirty: false,
    currentEdition: "",
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupHeaderPanels();
    setupThemeToggle();
    setupInputs();
    setupOptionSwitches();
    setupButtons();
    rebuildAll();
  }

  function setupHeaderPanels() {
    const helpButton = $("#helpToggleButton");
    const shortcutButton = $("#shortcutToggleButton");
    const helpPanel = $("#helpPanel");
    const shortcutPanel = $("#shortcutPanel");

    if (helpButton && helpPanel) {
      helpButton.addEventListener("click", () => {
        togglePanel(helpPanel);
        if (shortcutPanel) shortcutPanel.classList.add("hidden");
      });
    }

    if (shortcutButton && shortcutPanel) {
      shortcutButton.addEventListener("click", () => {
        togglePanel(shortcutPanel);
        if (helpPanel) helpPanel.classList.add("hidden");
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (helpPanel) helpPanel.classList.add("hidden");
        if (shortcutPanel) shortcutPanel.classList.add("hidden");
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        const generatedJson = $("#generatedJson");
        if (generatedJson) copyText(generatedJson.value, "生成駒JSON");
      }
    });
  }

  function togglePanel(panel) {
    panel.classList.toggle("hidden");
  }

  function setupThemeToggle() {
    const button = $("#themeToggleButton");

    if (!button) return;

    const savedTheme = localStorage.getItem("charamemo-theme") || "night";
    applyTheme(savedTheme);

    button.addEventListener("click", () => {
      const next = document.body.classList.contains("theme-light") ? "night" : "light";
      applyTheme(next);
      localStorage.setItem("charamemo-theme", next);
    });
  }

  function applyTheme(theme) {
    const pageShell = $(".page-shell");
    const button = $("#themeToggleButton");

    document.body.classList.toggle("theme-light", theme === "light");
    document.body.classList.toggle("theme-night", theme !== "light");

    if (pageShell) {
      pageShell.classList.toggle("theme-light", theme === "light");
      pageShell.classList.toggle("theme-night", theme !== "light");
    }

    if (button) {
      button.textContent = theme === "light" ? "☀ ライトモード" : "🌙 ナイトモード";
    }
  }

  function setupInputs() {
    const jsonInput = $("#jsonInput");
    const txtInput = $("#txtInput");
    const profileSupplementInput = $("#profileSupplementInput");
    const memoEditor = $("#memoEditor");

    if (jsonInput) {
      jsonInput.addEventListener("input", () => {
        parseKomaInput();
        state.memoDirty = false;
        rebuildAll();
      });
    }

    if (txtInput) {
      txtInput.addEventListener("input", () => {
        parseTxtInput();
        state.memoDirty = false;
        applyProfileFromTxt();
        rebuildAll();
      });
    }

    if (profileSupplementInput) {
      profileSupplementInput.addEventListener("input", () => {
        rebuildGeneratedJsonOnly();
      });
    }

    if (memoEditor) {
      memoEditor.addEventListener("input", () => {
        state.memoDirty = true;
        rebuildGeneratedJsonOnly();
      });
    }
  }

  function setupOptionSwitches() {
    getOptionInputs().forEach((input) => {
      updateSwitchRowState(input);

      input.addEventListener("change", () => {
        updateSwitchRowState(input);
        state.memoDirty = false;
        rebuildAll();
      });
    });
  }

  function updateSwitchRowState(input) {
    const row = input.closest(".switch-row");
    if (row) row.classList.toggle("active", input.checked);
  }

  function getOptionInputs() {
    return [
      $("#includeWeapons"),
      $("#includeItems"),
      $("#includeKnowledge"),
      $("#includeTxtMemo"),
      $("#formatPalette"),
    ].filter(Boolean);
  }

  function setupButtons() {
    const pasteJsonButton = $("#pasteJsonButton");
    const openTxtFileButton = $("#openTxtFileButton");
    const resetTxtButton = $("#resetTxtButton");
    const txtFileInput = $("#txtFileInput");
    const regenerateMemoButton = $("#regenerateMemoButton");
    const copyMemoButton = $("#copyMemoButton");
    const copyPaletteButton = $("#copyPaletteButton");
    const copyGeneratedJsonButton = $("#copyGeneratedJsonButton");
    const clearAllButton = $("#clearAllButton");

    if (pasteJsonButton) {
      pasteJsonButton.addEventListener("click", pasteJsonFromClipboard);
    }

    if (openTxtFileButton && txtFileInput) {
      openTxtFileButton.addEventListener("click", () => {
        txtFileInput.click();
      });
    }

    if (txtFileInput) {
      txtFileInput.addEventListener("change", readTxtFile);
    }

    if (resetTxtButton) {
      resetTxtButton.addEventListener("click", resetTxtInput);
    }

    if (regenerateMemoButton) {
      regenerateMemoButton.addEventListener("click", () => {
        const memoEditor = $("#memoEditor");
        if (!memoEditor) return;

        memoEditor.value = buildMemo();
        state.memoDirty = false;
        rebuildGeneratedJsonOnly();
        showStatusMessage("キャラメモを再生成しました。", false);
      });
    }

    if (copyMemoButton) {
      copyMemoButton.addEventListener("click", () => {
        const memoEditor = $("#memoEditor");
        copyText(memoEditor ? memoEditor.value : "", "メモ");
      });
    }

    if (copyPaletteButton) {
      copyPaletteButton.addEventListener("click", () => {
        const palettePreview = $("#palettePreview");
        copyText(palettePreview ? palettePreview.value : "", "チャットパレット");
      });
    }

    if (copyGeneratedJsonButton) {
      copyGeneratedJsonButton.addEventListener("click", () => {
        const generatedJson = $("#generatedJson");
        copyText(generatedJson ? generatedJson.value : "", "生成駒JSON");
      });
    }

    if (clearAllButton) {
      clearAllButton.addEventListener("click", clearAll);
    }
  }

  async function pasteJsonFromClipboard() {
    const jsonInput = $("#jsonInput");

    if (!jsonInput) return;

    try {
      const text = await navigator.clipboard.readText();
      jsonInput.value = text;
      parseKomaInput();
      state.memoDirty = false;
      rebuildAll();
      showStatusMessage("クリップボードから駒JSONを入力しました。", false);
    } catch (error) {
      showStatusMessage("クリップボードの読み込みに失敗しました。", true);
    }
  }

  async function readTxtFile(event) {
    const txtInput = $("#txtInput");
    const file = event.target.files && event.target.files[0];

    if (!file || !txtInput) return;

    try {
      const text = await file.text();
      txtInput.value = text;
      parseTxtInput();
      state.memoDirty = false;
      applyProfileFromTxt();
      rebuildAll();
      showTxtLoadMessage("テキストファイルを読み込みました。", false);
    } catch (error) {
      showTxtLoadMessage("テキストファイルの読み込みに失敗しました。", true);
    } finally {
      event.target.value = "";
    }
  }

  function resetTxtInput() {
    const txtInput = $("#txtInput");

    if (txtInput) txtInput.value = "";

    state.parsedTxt = createEmptyTxtParsed();
    state.memoDirty = false;
    applyProfileFromTxt();
    rebuildAll();
    showTxtLoadMessage("いあきゃらTXTをリセットしました。", false);
  }

  function clearAll() {
    const jsonInput = $("#jsonInput");
    const txtInput = $("#txtInput");
    const profileSupplementInput = $("#profileSupplementInput");
    const memoEditor = $("#memoEditor");
    const palettePreview = $("#palettePreview");
    const generatedJson = $("#generatedJson");

    if (jsonInput) jsonInput.value = "";
    if (txtInput) txtInput.value = "";
    if (profileSupplementInput) profileSupplementInput.value = defaultProfileText();
    if (memoEditor) memoEditor.value = "";
    if (palettePreview) palettePreview.value = "";
    if (generatedJson) generatedJson.value = "";

    state.parsedKoma = null;
    state.parsedTxt = createEmptyTxtParsed();
    state.memoDirty = false;

    hideJsonError();
    showTxtLoadMessage("", false);
    showStatusMessage("入力データを削除しました。", false);
    rebuildAll();
  }

  function parseKomaInput() {
    const jsonInput = $("#jsonInput");
    const raw = jsonInput ? jsonInput.value.trim() : "";

    state.parsedKoma = null;
    hideJsonError();

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        throw new Error("kind:'character' と data を持つCCFOLIA駒JSONではありません。");
      }

      state.parsedKoma = parsed;
    } catch (error) {
      state.parsedKoma = null;
      showJsonError(error && error.message ? error.message : "JSONを解析できませんでした。");
    }
  }

  function parseTxtInput() {
    const txtInput = $("#txtInput");
    const raw = txtInput ? txtInput.value : "";

    state.parsedTxt = createEmptyTxtParsed();

    if (!raw.trim()) {
      showTxtLoadMessage("", false);
      return;
    }

    state.parsedTxt = parseIacharaTextSafe(raw);

    if (state.parsedTxt.found) {
      showTxtLoadMessage("いあきゃらTXTを反映しました。", false);
    } else {
      showTxtLoadMessage("TXTを読み込みましたが、対応する見出しを検出できませんでした。", true);
    }
  }

  function parseIacharaTextSafe(text) {
    if (window.IacharaTextParser && typeof window.IacharaTextParser.parseIacharaText === "function") {
      const parsed = window.IacharaTextParser.parseIacharaText(text);
      return normalizeParsedTxt(parsed, text);
    }

    if (window.IacharaTextParser && typeof window.IacharaTextParser.parseIacharaBasicInfo === "function") {
      const info = window.IacharaTextParser.parseIacharaBasicInfo(text);
      return normalizeParsedTxt({
        profile: {
          name: info.name || "",
          occupation: info.occupation || "",
          age: info.age || "",
          gender: info.gender || "",
          height: info.height || "",
          weight: info.weight || "",
        },
      }, text);
    }

    if (typeof window.parseIacharaText === "function") {
      return normalizeParsedTxt(window.parseIacharaText(text), text);
    }

    return fallbackParseIacharaText(text);
  }

  function normalizeParsedTxt(parsed, rawText) {
    const fallback = fallbackParseIacharaText(rawText);
    const src = parsed || {};

    return {
      found: Boolean(src.found || fallback.found),
      profile: {
        name: pick(src.profile && src.profile.name, fallback.profile.name),
        occupation: pick(src.profile && src.profile.occupation, fallback.profile.occupation),
        age: pick(src.profile && src.profile.age, fallback.profile.age),
        gender: pick(src.profile && src.profile.gender, fallback.profile.gender),
        height: pick(src.profile && src.profile.height, fallback.profile.height),
        weight: pick(src.profile && src.profile.weight, fallback.profile.weight),
      },
      sections: {
        weapons: pick(src.sections && src.sections.weapons, fallback.sections.weapons),
        items: pick(src.sections && src.sections.items, fallback.sections.items),
        knowledge: pick(src.sections && src.sections.knowledge, fallback.sections.knowledge),
        memo: pick(src.sections && src.sections.memo, fallback.sections.memo),
      },
      abilities: Object.assign({}, fallback.abilities, src.abilities || {}),
      skills: Array.isArray(src.skills) && src.skills.length ? src.skills : fallback.skills,
      commands: pick(src.commands, fallback.commands),
    };
  }

  function fallbackParseIacharaText(text) {
    const src = normalizeText(text);
    const basic = extractSection(src, "基本情報");
    const abilitySection = extractSection(src, "能力値") || src;
    const skillSection = extractSection(src, "技能値") || src;

    const profile = {
      name: extractLabel(basic, "名前"),
      occupation: extractLabel(basic, "職業"),
      age: extractLabel(basic, "年齢"),
      gender: extractLabel(basic, "性別"),
      height: extractLabel(basic, "身長"),
      weight: extractLabel(basic, "体重"),
    };

    const sections = {
      weapons: extractSection(src, "戦闘・武器・防具"),
      items: extractSection(src, "所持品"),
      knowledge: extractSection(src, "通過したシナリオ名") || extractSection(src, "新たに得た知識・経験"),
      memo: extractSection(src, "メモ"),
    };

    const abilities = parseAbilities(abilitySection);
    const skills = parseSkills(skillSection);
    const edition = detectEditionFromText(src);
    const commands = buildCommandsFromTxt(abilities, skills, edition);

    return {
      found: Boolean(
        basic ||
        Object.values(sections).some(Boolean) ||
        Object.keys(abilities).length ||
        skills.length
      ),
      profile,
      sections,
      abilities,
      skills,
      commands,
    };
  }

  function rebuildAll() {
    renderSummary();
    renderPalette();

    if (!state.memoDirty) {
      const memoEditor = $("#memoEditor");
      if (memoEditor) memoEditor.value = buildMemo();
    }

    rebuildGeneratedJsonOnly();
  }

  function rebuildGeneratedJsonOnly() {
    const generatedJson = $("#generatedJson");
    if (!generatedJson) return;

    generatedJson.value = buildGeneratedJson();
  }

  function renderSummary() {
    const data = getKomaData();
    const parsedTxt = state.parsedTxt;
    const summaryName = $("#summaryName");
    const editionBadge = $("#editionBadge");
    const sheetLinkBadge = $("#sheetLinkBadge");
    const statusChips = $("#statusChips");
    const paramsGrid = $("#paramsGrid");
    const characterIconFrame = $("#characterIconFrame");

    const name = data.name || parsedTxt.profile.name || "未解析";
    const edition = detectCurrentEdition();

    if (summaryName) summaryName.textContent = name;

    if (editionBadge) {
      editionBadge.textContent = edition ? (edition === "7e" ? "7版" : "6版") : "版未判定";
      editionBadge.className = "edition-badge";
      if (edition === "6e") editionBadge.classList.add("edition-6");
      else if (edition === "7e") editionBadge.classList.add("edition-7");
      else editionBadge.classList.add("edition-empty");
    }

    if (sheetLinkBadge) {
      const url = data.externalUrl || "";
      if (url) {
        sheetLinkBadge.href = url;
        sheetLinkBadge.textContent = "🔗 キャラシリンク";
        sheetLinkBadge.classList.remove("is-disabled");
      } else {
        sheetLinkBadge.href = "#";
        sheetLinkBadge.textContent = "🔗 未検出";
        sheetLinkBadge.classList.add("is-disabled");
      }
    }

    if (characterIconFrame) {
      const iconUrl = data.iconUrl || "";
      if (iconUrl) {
        characterIconFrame.innerHTML = "";
        const img = document.createElement("img");
        img.src = iconUrl;
        img.alt = "character icon";
        characterIconFrame.appendChild(img);
      } else {
        characterIconFrame.innerHTML = '<span class="icon-placeholder-mark">?</span>';
      }
    }

    if (statusChips) {
      statusChips.innerHTML = "";
      getStatusCards(data, parsedTxt).forEach((item) => {
        const span = document.createElement("span");
        span.textContent = `${item.label} ${item.value}`;
        statusChips.appendChild(span);
      });
    }

    if (paramsGrid) {
      paramsGrid.innerHTML = "";
      getParamCards(data, parsedTxt).forEach((item) => {
        const div = document.createElement("div");
        div.className = "param-chip";
        div.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong>`;
        paramsGrid.appendChild(div);
      });
    }
  }

  function renderPalette() {
    const palettePreview = $("#palettePreview");
    const paletteEditionLabel = $("#paletteEditionLabel");
    const data = getKomaData();
    const rawCommands = data.commands || state.parsedTxt.commands || "";
    const edition = detectCurrentEdition();

    state.currentEdition = edition;

    if (palettePreview) {
      if (!rawCommands.trim()) {
        palettePreview.value = "";
      } else if ($("#formatPalette") && $("#formatPalette").checked) {
        palettePreview.value = formatPalette(rawCommands, edition);
      } else {
        palettePreview.value = normalizeText(rawCommands);
      }
    }

    if (paletteEditionLabel) {
      paletteEditionLabel.textContent = `自動判定: ${edition ? editionLabel(edition) : "未判定"}`;
    }
  }

  function buildMemo() {
    const data = getKomaData();
    const parsedTxt = state.parsedTxt;
    const profileSupplementInput = $("#profileSupplementInput");
    const profile = profileSupplementInput ? profileSupplementInput.value : defaultProfileText();
    const name = data.name || parsedTxt.profile.name || "";

    const includeWeapons = checked("#includeWeapons");
    const includeItems = checked("#includeItems");
    const includeKnowledge = checked("#includeKnowledge");
    const includeTxtMemo = checked("#includeTxtMemo");

    const parts = [];

    if (name || profile.trim()) {
      parts.push(`名前: ${name || "-"}${NL}${profile}`.trim());
    }

    if (includeWeapons && parsedTxt.sections.weapons) {
      parts.push(formatWeaponsSection(parsedTxt.sections.weapons));
    }

    if (includeItems && parsedTxt.sections.items) {
      parts.push(`【所持品】${NL}${parsedTxt.sections.items.trim()}`);
    }

    if (includeKnowledge && parsedTxt.sections.knowledge) {
      parts.push(`【新たに得た知識・経験】${NL}${parsedTxt.sections.knowledge.trim()}`);
    }

    if (includeTxtMemo && parsedTxt.sections.memo) {
      parts.push(`【メモ】${NL}${parsedTxt.sections.memo.trim()}`);
    }

    if (data.memo) {
      parts.push(`【既存メモ】${NL}${data.memo}`);
    }

    return parts.filter(Boolean).join(NL + NL);
  }

  function buildGeneratedJson() {
    const parsed = state.parsedKoma;
    const data = Object.assign({}, getKomaData());
    const memoEditor = $("#memoEditor");
    const palettePreview = $("#palettePreview");

    data.name = data.name || state.parsedTxt.profile.name || "いあきゃらTXTキャラクター";
    data.memo = memoEditor ? memoEditor.value : "";
    data.commands = palettePreview ? palettePreview.value : "";

    if (!Array.isArray(data.status)) data.status = buildStatusFromTxt(state.parsedTxt);
    if (!Array.isArray(data.params)) data.params = buildParamsFromTxt(state.parsedTxt);
    if (typeof data.initiative === "undefined") data.initiative = Number(state.parsedTxt.abilities.DEX) || 0;

    const output = parsed && parsed.kind === "character"
      ? Object.assign({}, parsed, { data })
      : { kind: "character", data };

    return JSON.stringify(output);
  }

  function applyProfileFromTxt() {
    const profileSupplementInput = $("#profileSupplementInput");
    if (!profileSupplementInput) return;

    profileSupplementInput.value = buildProfileText(state.parsedTxt.profile);
  }

  function buildProfileText(profile) {
    return [
      `職業: ${displayValue(profile.occupation)}`,
      `年齢: ${displayValue(profile.age)} / 性別: ${displayValue(profile.gender)}`,
      `身長: ${displayValue(profile.height)} / 体重: ${displayValue(profile.weight)}`,
      "カラーコード: #008080",
    ].join(NL);
  }

  function defaultProfileText() {
    return [
      "職業: -",
      "年齢: - / 性別: -",
      "身長: - / 体重: -",
      "カラーコード: #008080",
    ].join(NL);
  }

  function createEmptyTxtParsed() {
    return {
      found: false,
      profile: {
        name: "",
        occupation: "",
        age: "",
        gender: "",
        height: "",
        weight: "",
      },
      sections: {
        weapons: "",
        items: "",
        knowledge: "",
        memo: "",
      },
      abilities: {},
      skills: [],
      commands: "",
    };
  }

  function getKomaData() {
    return state.parsedKoma && state.parsedKoma.data ? state.parsedKoma.data : {};
  }

  function getStatusCards(data, parsedTxt) {
    if (Array.isArray(data.status) && data.status.length) {
      return data.status.slice(0, 4).map((item) => ({
        label: item.label || item.name || "-",
        value: item.value || item.max || "-",
      }));
    }

    return ["HP", "MP", "SAN", "幸運"]
      .filter((key) => parsedTxt.abilities[key])
      .map((key) => ({
        label: key,
        value: parsedTxt.abilities[key],
      }));
  }

  function getParamCards(data, parsedTxt) {
    if (Array.isArray(data.params) && data.params.length) {
      return data.params.map((item) => ({
        label: item.label || item.name || "-",
        value: item.value || "-",
      }));
    }

    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"]
      .filter((key) => parsedTxt.abilities[key])
      .map((key) => ({
        label: key,
        value: parsedTxt.abilities[key],
      }));
  }

  function buildStatusFromTxt(parsedTxt) {
    return ["HP", "MP", "SAN"]
      .filter((key) => parsedTxt.abilities[key])
      .map((key) => ({
        label: key,
        value: parsedTxt.abilities[key],
        max: parsedTxt.abilities[key],
      }));
  }

  function buildParamsFromTxt(parsedTxt) {
    return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"]
      .filter((key) => parsedTxt.abilities[key])
      .map((key) => ({
        label: key,
        value: parsedTxt.abilities[key],
      }));
  }

  function detectCurrentEdition() {
    const data = getKomaData();
    const rawCommands = data.commands || state.parsedTxt.commands || "";

    if (typeof window.detectCocEdition === "function") {
      return window.detectCocEdition(rawCommands);
    }

    if (window.CocPaletteParser && typeof window.CocPaletteParser.detectEdition === "function") {
      return window.CocPaletteParser.detectEdition(rawCommands);
    }

    return fallbackDetectEdition(rawCommands);
  }

  function formatPalette(rawCommands, edition) {
    if (window.CocPaletteParser && typeof window.CocPaletteParser.format === "function") {
      return window.CocPaletteParser.format(rawCommands, edition);
    }

    if (typeof window.formatChatPalette === "function") {
      return window.formatChatPalette(rawCommands, edition);
    }

    if (typeof window.formatPalette === "function") {
      return window.formatPalette(rawCommands, edition);
    }

    return fallbackFormatPalette(rawCommands, edition);
  }

  function fallbackDetectEdition(text) {
    const src = normalizeText(text);
    let score7 = src.includes("CC<=") ? 1 : 0;
    let score6 = src.includes("CCB<=") ? 1 : 0;

    ["近接戦闘", "射撃", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "威圧", "魅惑"].forEach((word) => {
      if (src.includes(word)) score7 += 2;
    });

    ["こぶし", "キック", "組み付き", "頭突き", "マーシャルアーツ", "隠す", "隠れる", "忍び歩き", "値切り"].forEach((word) => {
      if (src.includes(word)) score6 += 2;
    });

    return score7 > score6 ? "7e" : "6e";
  }

  function editionLabel(edition) {
    if (edition === "7e") return "CoC 7版";
    if (edition === "6e") return "CoC 6版";
    return "未判定";
  }

  function fallbackFormatPalette(rawCommands, edition) {
    const command = edition === "7e" ? "CC" : "CCB";
    return normalizeText(rawCommands)
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normalizePaletteLine(line, command))
      .join(NL);
  }

  function normalizePaletteLine(line, command) {
    const trimmed = String(line || "").trim();

    if (trimmed.startsWith("sCCB<=")) return command + trimmed.slice(4);
    if (trimmed.startsWith("sCC<=")) return command + trimmed.slice(3);
    if (trimmed.startsWith("CCB<=")) return command + trimmed.slice(3);
    if (trimmed.startsWith("CC<=")) return command + trimmed.slice(2);

    return trimmed;
  }

  function extractSection(text, sectionName) {
    const src = normalizeText(text);
    const heading = `【${sectionName}】`;
    const start = src.indexOf(heading);

    if (start < 0) return "";

    const rest = src.slice(start + heading.length);
    const next = rest.match(/\n【[^】]+】/);

    return (next ? rest.slice(0, next.index) : rest).trim();
  }

  function extractLabel(section, label) {
    for (const line of normalizeText(section).split(NL)) {
      const value = extractLabelFromLine(line, label);
      if (value !== null) return value;
    }

    return "";
  }

  function extractLabelFromLine(line, label) {
    const src = String(line || "");
    const index = src.indexOf(label);

    if (index < 0) return null;

    const afterLabel = src.slice(index + label.length);
    const colonIndexes = [afterLabel.indexOf(":"), afterLabel.indexOf("：")].filter((value) => value >= 0);

    if (!colonIndexes.length) return null;

    const colonIndex = Math.min.apply(null, colonIndexes);
    const afterColon = afterLabel.slice(colonIndex + 1);
    const slashIndex = afterColon.indexOf("/");
    const rawValue = slashIndex >= 0 ? afterColon.slice(0, slashIndex) : afterColon;

    return rawValue.trim();
  }

  function parseAbilities(text) {
    const result = {};
    const labels = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN", "幸運", "アイデア", "知識"];

    normalizeText(text).split(NL).forEach((line) => {
      labels.forEach((label) => {
        const match = line.match(new RegExp(`(^|\\s)${escapeRegExp(label)}\\s*[:：]?\\s*(\\d+)`));
        if (match) result[label] = match[2];
      });
    });

    return result;
  }

  function parseSkills(text) {
    const skills = [];

    normalizeText(text).split(NL).forEach((line) => {
      const clean = line.trim();

      if (!clean) return;
      if (clean.includes("技能名")) return;
      if (clean.includes("初期値")) return;
      if (clean.includes("合計")) return;

      const match = clean.match(/^(.+?)\s+(\d{1,3})(?:\s|$)/);

      if (match) {
        skills.push({
          name: match[1].trim(),
          value: match[2],
        });
      }
    });

    return skills;
  }

  function detectEditionFromText(text) {
    return normalizeText(text).includes("7版") ? "7e" : "6e";
  }

  function buildCommandsFromTxt(abilities, skills, edition) {
    const command = edition === "7e" ? "CC" : "CCB";
    const lines = [];

    if (abilities.SAN) lines.push(`1d100<=${abilities.SAN} 【正気度ロール】`);
    if (abilities.アイデア) lines.push(`${command}<=${abilities.アイデア} 【アイデア】`);
    if (abilities.幸運) lines.push(`${command}<=${abilities.幸運} 【幸運】`);
    if (abilities.知識) lines.push(`${command}<=${abilities.知識} 【知識】`);

    skills.forEach((skill) => {
      lines.push(`${command}<=${skill.value} 【${skill.name}】`);
    });

    return lines.join(NL);
  }

  function formatWeaponsSection(rawSectionText) {
    const raw = normalizeText(rawSectionText).trim();

    if (!raw) return "【戦闘・武器・防具】";

    const lines = raw
      .split(NL)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim());

    const dataLines = lines.filter((line) => {
      const text = line.trim();
      if (!text) return false;
      if (text.startsWith("名前")) return false;
      if (text.includes("成功率") && text.includes("ダメージ")) return false;
      return true;
    });

    const rows = dataLines
      .map(parseWeaponTableRow)
      .filter(Boolean)
      .map((row) => ({
        name: normalizeWeaponField(row.name),
        damage: normalizeWeaponField(row.damage),
        range: normalizeWeaponField(row.range),
        attack: normalizeCountUnit(row.attack, "回"),
        ammo: normalizeCountUnit(row.ammo, "発"),
        durability: normalizeWeaponField(row.durability),
        malfunction: normalizeWeaponField(row.malfunction),
      }));

    if (!rows.length) {
      return `【戦闘・武器・防具】${NL}${raw}`;
    }

    const header = [
      "【戦闘・武器・防具】",
      "武器：名称　　　　　 ┊ダメージ┊　射程┊　1R┊弾数┊耐久┊故障No.",
    ];

    const body = rows.map((row) => {
      return [
        padToWidth(row.name, 28),
        padToWidth(row.damage, 10),
        padToWidth(row.range, 10),
        padToWidth(row.attack, 8),
        padToWidth(row.ammo, 8),
        padToWidth(row.durability, 8),
        padToWidth(row.malfunction, 8),
      ].join("");
    });

    return header.concat(body).join(NL);
  }

  function parseWeaponTableRow(line) {
    const columns = line.trim().split(/\s{2,}/).map((value) => value.trim()).filter(Boolean);

    if (columns.length >= 8) {
      return {
        name: columns[0],
        success: columns[1],
        damage: columns[2],
        range: columns[3],
        attack: columns[4],
        ammo: columns[5],
        durability: columns[6],
        malfunction: columns[7],
      };
    }

    if (columns.length >= 7) {
      return {
        name: columns[0],
        success: "-",
        damage: columns[1],
        range: columns[2],
        attack: columns[3],
        ammo: columns[4],
        durability: columns[5],
        malfunction: columns[6],
      };
    }

    return null;
  }

  function normalizeWeaponField(value) {
    const text = String(value || "").trim();
    return text || "-";
  }

  function normalizeCountUnit(value, unit) {
    const text = normalizeWeaponField(value);

    if (text === "-") return "-";
    if (text.endsWith(unit)) return text;

    return `${text}${unit}`;
  }

  function getDisplayWidth(value) {
    return Array.from(String(value || "")).reduce((sum, char) => {
      return sum + (/[\u0000-\u00ff]/.test(char) ? 1 : 2);
    }, 0);
  }

  function padToWidth(value, width) {
    const text = String(value || "");
    const current = getDisplayWidth(text);

    if (current >= width) return text + " ";

    return text + " ".repeat(width - current);
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, NL)
      .replace(/\r/g, NL)
      .replace(/\\n/g, NL);
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function displayValue(value) {
    const text = String(value || "").trim();
    return text || "-";
  }

  function pick(primary, fallback) {
    const value = String(primary || "").trim();
    return value || String(fallback || "").trim();
  }

  function checked(selector) {
    const el = $(selector);
    return el ? Boolean(el.checked) : false;
  }

  function showJsonError(message) {
    const box = $("#jsonErrorBox");
    if (!box) return;

    box.textContent = `JSON解析エラー: ${message}`;
    box.classList.remove("hidden");
  }

  function hideJsonError() {
    const box = $("#jsonErrorBox");
    if (!box) return;

    box.textContent = "";
    box.classList.add("hidden");
  }

  function showTxtLoadMessage(message, isError) {
    const el = $("#txtLoadMessage");
    if (!el) return;

    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(isError));
    el.classList.toggle("is-success", Boolean(message) && !isError);
  }

  function showStatusMessage(message, isError) {
    const el = $("#statusMessage");
    if (!el) return;

    el.textContent = isError ? `⚠ ${message}` : message;
    window.setTimeout(() => {
      el.textContent = "";
    }, 2500);
  }

  async function copyText(text, label) {
    if (!String(text || "").trim()) {
      showStatusMessage("コピーする内容がありません。", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showStatusMessage(`${label}をコピーしました。`, false);
    } catch (error) {
      showStatusMessage("コピーに失敗しました。テキスト欄から手動でコピーしてください。", true);
    }
  }

  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  }
})();