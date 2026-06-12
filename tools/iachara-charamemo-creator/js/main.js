(function () {
  "use strict";

  const NL = "\n";
  let txtApplyTimer = null;

  const state = {
    parsedKoma: null,
    parsedTxt: createEmptyTxtParsed(),
    memoDirty: false,
    paletteDirty: false,
    currentEdition: "",
    memoKomaBaseMinHeight: 0,
    memoKomaBaseEditorHeight: 0,
  };

  const ids = {
    jsonInput: ["jsonInput", "komaJsonInput"],
    pasteJsonButton: ["pasteJsonButton", "pasteKomaJsonButton"],
    jsonErrorBox: ["jsonErrorBox", "jsonErrorMessage"],

    txtInput: ["txtInput", "iacharaTxtInput"],
    txtFileInput: ["txtFileInput", "iacharaTxtFileInput"],
    openTxtFileButton: ["openTxtFileButton", "openIacharaTxtFileButton"],
    resetTxtButton: ["resetTxtButton", "resetIacharaTxtButton"],
    txtLoadMessage: ["txtLoadMessage", "iacharaTxtMessage"],

    includeWeapons: ["includeWeapons"],
    includeItems: ["includeItems"],
    includeKnowledge: ["includeKnowledge"],
    includeTxtMemo: ["includeTxtMemo"],
    formatPalette: ["formatPalette"],

    profileSupplementInput: ["profileSupplementInput"],
    regenerateMemoButton: ["regenerateMemoButton"],
    copyMemoButton: ["copyMemoButton"],
    memoEditor: ["memoEditor"],

    palettePreview: ["palettePreview"],
    paletteEditionLabel: ["paletteEditionLabel", "editionText"],
    copyPaletteButton: ["copyPaletteButton"],

    generatedJson: ["generatedJson"],
    copyGeneratedJsonButton: ["copyGeneratedJsonButton"],
    clearAllButton: ["clearAllButton"],
    statusMessage: ["statusMessage"],

    summaryName: ["summaryName"],
    editionBadge: ["editionBadge"],
    sheetLinkBadge: ["sheetLinkBadge"],
    statusChips: ["statusChips"],
    paramsGrid: ["paramsGrid"],
    characterIconFrame: ["characterIconFrame", "summaryIcon"],

    themeToggleButton: ["themeToggleButton"],
    shareXButton: ["shareXButton"],
    helpToggleButton: ["helpToggleButton", "helpButton"],
    shortcutToggleButton: ["shortcutToggleButton", "shortcutButton"],
    helpPanel: ["helpPanel"],
    shortcutPanel: ["shortcutPanel"],
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ensureToastContainer();
    setupHeaderPanels();
    setupThemeToggle();
    setupShareXButton();
    setupSleekPageScrollbar();
    setupInputs();
    setupOptionSwitches();
    setupButtons();
    setupShortcuts();
    setupLayoutMetrics();
    parseKomaInput();
    parseTxtInput(false);
    applyProfileFromTxt();
    rebuildAll();
  }

  function setupHeaderPanels() {
    const helpButton = getEl("helpToggleButton");
    const shortcutButton = getEl("shortcutToggleButton");
    const helpPanel = getEl("helpPanel");
    const shortcutPanel = getEl("shortcutPanel");

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
  }

  function togglePanel(panel) {
    panel.classList.toggle("hidden");
  }

  function closeHeaderPanels() {
    const helpPanel = getEl("helpPanel");
    const shortcutPanel = getEl("shortcutPanel");

    if (helpPanel) helpPanel.classList.add("hidden");
    if (shortcutPanel) shortcutPanel.classList.add("hidden");
  }

  function setupThemeToggle() {
    const button = getEl("themeToggleButton");
    const savedTheme = localStorage.getItem("charamemo-theme") || "night";

    applyTheme(savedTheme);

    if (button) {
      button.addEventListener("click", toggleTheme);
    }
  }

  function toggleTheme() {
    const next = document.body.classList.contains("theme-light") ? "night" : "light";

    applyTheme(next);
    localStorage.setItem("charamemo-theme", next);
  }

  function applyTheme(theme) {
    const pageShell = document.querySelector(".page-shell");
    const button = getEl("themeToggleButton");

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

  function setupShareXButton() {
    const button = getEl("shareXButton");
    if (!button) return;

    button.addEventListener("click", () => {
      const text = "いあキャラMEMOジェネレータを使って、ココフォリア用のキャラメモ付きコマデータを作成しました。 #TRPG #CCFOLIA";
      const url = "https://kumachansteps.github.io/trpg-web-tools/iachara-charamemo-creator/";
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    });
  }


  function setupSleekPageScrollbar() {
    const root = document.documentElement;
    let scrollTimer = null;

    const showScrollbar = () => {
      root.classList.add("is-scrolling");
      document.body.classList.add("is-scrolling");
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        root.classList.remove("is-scrolling");
        document.body.classList.remove("is-scrolling");
      }, 850);
    };

    window.addEventListener("scroll", showScrollbar, { passive: true });
    window.addEventListener("wheel", showScrollbar, { passive: true });
    window.addEventListener("touchmove", showScrollbar, { passive: true });
    window.addEventListener("keydown", showScrollbar);
  }


  function setupInputs() {
    const jsonInput = getEl("jsonInput");
    const txtInput = getEl("txtInput");
    const profileSupplementInput = getEl("profileSupplementInput");
    const memoEditor = getEl("memoEditor");
    const palettePreview = getEl("palettePreview");

    if (jsonInput) {
      jsonInput.addEventListener("input", () => {
        parseKomaInput();
        state.memoDirty = false;
        state.paletteDirty = false;
        rebuildAll();
      });
    }

    if (txtInput) {
      txtInput.addEventListener("input", () => {
        scheduleTxtAutoApply();
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

    if (palettePreview) {
      palettePreview.removeAttribute("readonly");
      palettePreview.addEventListener("input", () => {
        state.paletteDirty = true;
        rebuildGeneratedJsonOnly();
      });
    }
  }

  function scheduleTxtAutoApply() {
    window.clearTimeout(txtApplyTimer);

    txtApplyTimer = window.setTimeout(() => {
      parseTxtInput(true);
      state.memoDirty = false;
      state.paletteDirty = false;
      applyProfileFromTxt();
      rebuildAll();
    }, 200);
  }

  function setupOptionSwitches() {
    getOptionInputs().forEach((input) => {
      updateSwitchRowState(input);

      input.addEventListener("change", () => {
        updateSwitchRowState(input);
        state.memoDirty = false;
        state.paletteDirty = false;
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
      getEl("includeWeapons"),
      getEl("includeItems"),
      getEl("includeKnowledge"),
      getEl("includeTxtMemo"),
      getEl("formatPalette"),
    ].filter(Boolean);
  }

  function setupButtons() {
    const pasteJsonButton = getEl("pasteJsonButton");
    const openTxtFileButton = getEl("openTxtFileButton");
    const resetTxtButton = getEl("resetTxtButton");
    const txtFileInput = getEl("txtFileInput");
    const regenerateMemoButton = getEl("regenerateMemoButton");
    const copyMemoButton = getEl("copyMemoButton");
    const copyPaletteButton = getEl("copyPaletteButton");
    const copyGeneratedJsonButton = getEl("copyGeneratedJsonButton");
    const clearAllButton = getEl("clearAllButton");

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
        const memoEditor = getEl("memoEditor");
        if (!memoEditor) return;

        memoEditor.value = buildMemo();
        state.memoDirty = false;
        rebuildGeneratedJsonOnly();
        showToast("キャラメモを再生成しました。", false);
      });
    }

    if (copyMemoButton) {
      copyMemoButton.addEventListener("click", () => {
        const memoEditor = getEl("memoEditor");
        copyText(memoEditor ? memoEditor.value : "", "メモ");
      });
    }

    if (copyPaletteButton) {
      copyPaletteButton.addEventListener("click", () => {
        const palettePreview = getEl("palettePreview");
        copyText(palettePreview ? palettePreview.value : "", "チャットパレット");
      });
    }

    if (copyGeneratedJsonButton) {
      copyGeneratedJsonButton.addEventListener("click", () => {
        const generatedJson = getEl("generatedJson");
        copyText(generatedJson ? generatedJson.value : "", "生成済みJSON駒データ");
      });
    }

    if (clearAllButton) {
      clearAllButton.addEventListener("click", confirmClearAll);
    }
  }

  function setupShortcuts() {
    document.addEventListener("keydown", (event) => {
      const key = String(event.key || "").toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        event.preventDefault();
        closeHeaderPanels();

        if (hasAnyInput() && window.confirm("入力データを削除・リセットしますか？")) {
          clearAll();
        }

        return;
      }

      if (!mod) return;

      if (key === "o" && !event.shiftKey) {
        event.preventDefault();
        const txtFileInput = getEl("txtFileInput");
        if (txtFileInput) txtFileInput.click();
        return;
      }

      if (key === "v" && event.shiftKey) {
        event.preventDefault();
        pasteJsonFromClipboard();
        return;
      }

      if (key === "t" && event.shiftKey) {
        event.preventDefault();
        toggleTheme();
        return;
      }

      if (key === "c" && event.shiftKey) {
        event.preventDefault();
        const generatedJson = getEl("generatedJson");
        copyText(generatedJson ? generatedJson.value : "", "生成済みJSON駒データ");
      }
    });
  }

  async function pasteJsonFromClipboard() {
    const jsonInput = getEl("jsonInput");

    if (!jsonInput) return;

    try {
      const text = await navigator.clipboard.readText();
      jsonInput.value = text;
      parseKomaInput();
      state.memoDirty = false;
      state.paletteDirty = false;
      rebuildAll();
      showToast("クリップボードから駒JSONを入力しました。", false);
    } catch (error) {
      showToast("クリップボードの読み込みに失敗しました。", true);
    }
  }

  async function readTxtFile(event) {
    const txtInput = getEl("txtInput");
    const file = event.target.files && event.target.files[0];

    if (!file || !txtInput) return;

    try {
      const text = await file.text();
      txtInput.value = text;
      parseTxtInput(true);
      state.memoDirty = false;
      state.paletteDirty = false;
      applyProfileFromTxt();
      rebuildAll();
      showTxtLoadMessage("テキストファイルを読み込みました。", false);
      showToast("テキストファイルを読み込みました。", false);
    } catch (error) {
      showTxtLoadMessage("テキストファイルの読み込みに失敗しました。", true);
      showToast("テキストファイルの読み込みに失敗しました。", true);
    } finally {
      event.target.value = "";
    }
  }

  function resetTxtInput() {
    const txtInput = getEl("txtInput");

    if (txtInput) txtInput.value = "";

    state.parsedTxt = createEmptyTxtParsed();
    state.memoDirty = false;
    state.paletteDirty = false;
    applyProfileFromTxt();
    rebuildAll();
    showTxtLoadMessage("いあきゃらテキスト出力をリセットしました。", false);
    showToast("いあきゃらテキスト出力をリセットしました。", false);
  }

  function confirmClearAll() {
    if (window.confirm("入力データを削除・リセットしますか？")) {
      clearAll();
    }
  }

  function clearAll() {
    const jsonInput = getEl("jsonInput");
    const txtInput = getEl("txtInput");
    const profileSupplementInput = getEl("profileSupplementInput");
    const memoEditor = getEl("memoEditor");
    const palettePreview = getEl("palettePreview");
    const generatedJson = getEl("generatedJson");

    if (jsonInput) jsonInput.value = "";
    if (txtInput) txtInput.value = "";
    if (profileSupplementInput) profileSupplementInput.value = defaultProfileText();
    if (memoEditor) memoEditor.value = "";
    if (palettePreview) palettePreview.value = "";
    if (generatedJson) generatedJson.value = "";

    state.parsedKoma = null;
    state.parsedTxt = createEmptyTxtParsed();
    state.memoDirty = false;
    state.paletteDirty = false;
    state.memoKomaBaseMinHeight = 0;
    state.memoKomaBaseEditorHeight = 0;

    hideJsonError();
    showTxtLoadMessage("", false);
    showStatusMessage("入力データを削除しました。", false);
    showToast("入力データを削除しました。", false);
    rebuildAll();
  }

  function hasAnyInput() {
    const jsonInput = getEl("jsonInput");
    const txtInput = getEl("txtInput");
    const memoEditor = getEl("memoEditor");
    const palettePreview = getEl("palettePreview");

    return Boolean(
      (jsonInput && jsonInput.value.trim()) ||
      (txtInput && txtInput.value.trim()) ||
      (memoEditor && memoEditor.value.trim()) ||
      (palettePreview && palettePreview.value.trim())
    );
  }

  function parseKomaInput() {
    const jsonInput = getEl("jsonInput");
    const raw = jsonInput ? jsonInput.value.trim() : "";

    state.parsedKoma = null;
    hideJsonError();

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        throw new Error("kind:'character' と data を持つココフォリア駒出力データではありません。");
      }

      state.parsedKoma = parsed;
    } catch (error) {
      state.parsedKoma = null;
      showJsonError(error && error.message ? error.message : "JSONを解析できませんでした。");
    }
  }

  function parseTxtInput(showMessage) {
    const txtInput = getEl("txtInput");
    const raw = txtInput ? txtInput.value : "";

    state.parsedTxt = createEmptyTxtParsed();

    if (!raw.trim()) {
      if (showMessage) showTxtLoadMessage("", false);
      return;
    }

    state.parsedTxt = parseIacharaTextSafe(raw);

    if (showMessage) {
      if (state.parsedTxt.found) {
        showTxtLoadMessage("いあきゃらテキスト出力を反映しました。", false);
      } else {
        showTxtLoadMessage("TXTを読み込みましたが、対応する見出しを検出できませんでした。", true);
      }
    }
  }

  function parseIacharaTextSafe(text) {
    if (window.IacharaTextParser && typeof window.IacharaTextParser.parseIacharaText === "function") {
      return normalizeParsedTxt(window.IacharaTextParser.parseIacharaText(text), text);
    }

    if (window.IacharaTextParser && typeof window.IacharaTextParser.parseIacharaBasicInfo === "function") {
      const info = window.IacharaTextParser.parseIacharaBasicInfo(text);
      return normalizeParsedTxt({ profile: info }, text);
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
      weapons: extractFirstSection(src, ["戦闘・武器・防具", "武器"]),
      items: extractFirstSection(src, ["所持品", "冒険の装備とその他の所持品"]),
      knowledge: extractKnowledgeSourceSection(src),
      memo: extractMemoSection(src),
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

  function extractKnowledgeSourceSection(src) {
    return (
      extractSection(src, "新たに得た知識・経験") ||
      extractSection(src, "魔導書") ||
      extractSection(src, "呪文") ||
      extractSection(src, "アーティファクト") ||
      ""
    );
  }


  function setupLayoutMetrics() {
    updateLayoutMetrics();
    window.addEventListener("resize", scheduleLayoutMetricsUpdate);
  }

  function scheduleLayoutMetricsUpdate() {
    window.requestAnimationFrame(updateLayoutMetrics);
  }

  function updateLayoutMetrics() {
    const pageShell = document.querySelector(".page-shell");
    if (!pageShell) return;

    const leftColumn = getElBySelector(".left-column");
    const rightColumn = getElBySelector(".right-column");
    const summaryPanel = getElBySelector(".summary-panel");
    const inputPanel = getElBySelector(".panel-input");
    const txtPanel = getElBySelector(".panel-txt");
    const memoPanel = getElBySelector(".memo-panel");
    const memoEditor = getEl("memoEditor");

    const hasLoadedData = pageShell.classList.contains("has-loaded-data") || document.body.classList.contains("has-loaded-data");
    const hasTxtData = pageShell.classList.contains("has-txt-data") || document.body.classList.contains("has-txt-data");
    const leftHeight = leftColumn ? Math.ceil(leftColumn.getBoundingClientRect().height) : 620;
    const rightHeight = rightColumn ? Math.ceil(rightColumn.getBoundingClientRect().height) : 520;
    const inputHeight = inputPanel ? Math.ceil(inputPanel.getBoundingClientRect().height) : 214;
    const txtHeight = txtPanel ? Math.ceil(txtPanel.getBoundingClientRect().height) : 206;
    const summaryHeight = summaryPanel ? Math.ceil(summaryPanel.getBoundingClientRect().height) : 214;
    const middleColumnGap = measureColumnGap(getElBySelector(".middle-column"));

    const safeLeftHeight = Math.max(leftHeight, 360);
    const memoMaxHeight = Math.ceil(safeLeftHeight * 1.25);
    const columnMatchedMemoMin = Math.max(320, Math.ceil(rightHeight - summaryHeight - middleColumnGap));

    if (!hasLoadedData) {
      state.memoKomaBaseMinHeight = 0;
      state.memoKomaBaseEditorHeight = 0;
    } else if (!hasTxtData) {
      state.memoKomaBaseMinHeight = Math.min(columnMatchedMemoMin, memoMaxHeight);
    }

    const rememberedKomaMin = state.memoKomaBaseMinHeight || 0;
    let memoMinHeight = Math.min(Math.max(columnMatchedMemoMin, rememberedKomaMin), memoMaxHeight);

    let memoTargetHeight = memoMinHeight;
    let memoEditorTargetHeight = 220;
    let memoEditorMinHeight = 220;

    if (hasLoadedData && memoPanel && memoEditor) {
      const panelChrome = measurePanelChromeHeight(memoPanel, memoEditor);
      const editorNaturalHeight = measureTextareaContentHeight(memoEditor);
      const availableAtMin = Math.max(220, memoMinHeight - panelChrome - 12);
      const memoNeededHeight = Math.ceil(editorNaturalHeight + panelChrome + 12);

      if (!hasTxtData) {
        state.memoKomaBaseEditorHeight = availableAtMin;
      }

      const rememberedEditorMin = state.memoKomaBaseEditorHeight || 0;
      memoEditorMinHeight = Math.max(220, Math.min(rememberedEditorMin || availableAtMin, memoMaxHeight - panelChrome - 12));

      if (hasTxtData) {
        memoTargetHeight = Math.min(Math.max(memoNeededHeight, memoMinHeight), memoMaxHeight);
        memoEditorTargetHeight = Math.max(memoEditorMinHeight, Math.min(editorNaturalHeight, memoTargetHeight - panelChrome - 12));
        memoTargetHeight = Math.min(Math.max(memoEditorTargetHeight + panelChrome + 12, memoMinHeight), memoMaxHeight);
      } else {
        memoTargetHeight = memoMinHeight;
        memoEditorTargetHeight = availableAtMin;
        memoEditorMinHeight = availableAtMin;
      }
    }

    pageShell.style.setProperty("--left-column-measured-height", `${safeLeftHeight}px`);
    pageShell.style.setProperty("--right-column-measured-height", `${Math.max(rightHeight, 320)}px`);
    pageShell.style.setProperty("--memo-panel-min-height", `${memoMinHeight}px`);
    pageShell.style.setProperty("--left-input-panel-height", `${Math.max(inputHeight, 180)}px`);
    pageShell.style.setProperty("--left-input-txt-sum-height", `${Math.max(inputHeight + txtHeight, 300)}px`);
    pageShell.style.setProperty("--memo-panel-target-height", `${memoTargetHeight}px`);
    pageShell.style.setProperty("--memo-panel-max-height", `${memoMaxHeight}px`);
    pageShell.style.setProperty("--memo-editor-target-height", `${memoEditorTargetHeight}px`);
    pageShell.style.setProperty("--memo-editor-min-height", `${memoEditorMinHeight}px`);
  }

  function measureColumnGap(column) {
    if (!column) return 20;
    const style = window.getComputedStyle(column);
    const gap = parseFloat(style.rowGap || style.gap || "20");
    return Number.isFinite(gap) ? gap : 20;
  }

  function measurePanelChromeHeight(panel, textarea) {
    if (!panel || !textarea) return 140;

    const panelStyle = window.getComputedStyle(panel);
    const panelPadding =
      parseFloat(panelStyle.paddingTop || "0") +
      parseFloat(panelStyle.paddingBottom || "0");

    let childrenHeight = panelPadding;

    Array.from(panel.children).forEach((child) => {
      if (child === textarea) return;
      if (child.contains(textarea)) {
        Array.from(child.children).forEach((grandChild) => {
          if (grandChild === textarea || grandChild.contains(textarea)) return;
          const style = window.getComputedStyle(grandChild);
          childrenHeight += grandChild.getBoundingClientRect().height;
          childrenHeight += parseFloat(style.marginTop || "0") + parseFloat(style.marginBottom || "0");
        });
        return;
      }
      const style = window.getComputedStyle(child);
      childrenHeight += child.getBoundingClientRect().height;
      childrenHeight += parseFloat(style.marginTop || "0") + parseFloat(style.marginBottom || "0");
    });

    return Math.max(120, Math.ceil(childrenHeight + 16));
  }

  function measureTextareaContentHeight(textarea) {
    if (!textarea) return 220;

    const computed = window.getComputedStyle(textarea);
    const clone = document.createElement("textarea");
    clone.value = textarea.value || textarea.placeholder || "";
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    clone.style.position = "absolute";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.boxSizing = computed.boxSizing;
    clone.style.width = `${textarea.getBoundingClientRect().width || textarea.clientWidth || 320}px`;
    clone.style.minHeight = "0";
    clone.style.height = "auto";
    clone.style.padding = computed.padding;
    clone.style.border = computed.border;
    clone.style.font = computed.font;
    clone.style.fontFamily = computed.fontFamily;
    clone.style.fontSize = computed.fontSize;
    clone.style.fontWeight = computed.fontWeight;
    clone.style.lineHeight = computed.lineHeight;
    clone.style.letterSpacing = computed.letterSpacing;
    clone.style.whiteSpace = computed.whiteSpace;
    clone.style.overflowWrap = computed.overflowWrap;
    clone.style.wordBreak = computed.wordBreak;
    clone.style.resize = "none";
    clone.style.overflow = "hidden";

    document.body.appendChild(clone);
    const measured = Math.ceil(clone.scrollHeight);
    clone.remove();

    return Math.max(220, measured + 4);
  }

  function getElBySelector(selector) {
    return document.querySelector(selector);
  }

  function updateLoadedDataState() {
    const pageShell = document.querySelector(".page-shell");
    const hasLoadedData = Boolean(state.parsedKoma || (state.parsedTxt && state.parsedTxt.found));
    const hasTxtData = Boolean(state.parsedTxt && state.parsedTxt.found);

    document.body.classList.toggle("has-loaded-data", hasLoadedData);
    document.body.classList.toggle("has-txt-data", hasTxtData);
    if (pageShell) {
      pageShell.classList.toggle("has-loaded-data", hasLoadedData);
      pageShell.classList.toggle("has-txt-data", hasTxtData);
    }
  }

  function rebuildAll() {
    updateLoadedDataState();
    renderSummary();
    renderPalette();

    if (!state.memoDirty) {
      const memoEditor = getEl("memoEditor");
      if (memoEditor) memoEditor.value = buildMemo();
    }

    rebuildGeneratedJsonOnly();
    scheduleLayoutMetricsUpdate();
  }

  function rebuildGeneratedJsonOnly() {
    const generatedJson = getEl("generatedJson");
    if (!generatedJson) return;

    generatedJson.value = buildGeneratedJson();
  }

  function renderSummary() {
    const data = getKomaData();
    const parsedTxt = state.parsedTxt;
    const name = data.name || parsedTxt.profile.name || "未解析";
    const edition = detectCurrentEdition();

    const summaryName = getEl("summaryName");
    const editionBadge = getEl("editionBadge");
    const sheetLinkBadge = getEl("sheetLinkBadge");
    const statusChips = getEl("statusChips");
    const paramsGrid = getEl("paramsGrid");
    const characterIconFrame = getEl("characterIconFrame");

    if (summaryName) summaryName.textContent = name;

    if (editionBadge) {
      editionBadge.textContent = edition ? (edition === "7e" ? "7版" : "6版") : "版未判定";
      editionBadge.className = "edition-badge";

      if (edition === "6e") {
        editionBadge.classList.add("edition-6");
      } else if (edition === "7e") {
        editionBadge.classList.add("edition-7");
      } else {
        editionBadge.classList.add("edition-empty");
      }
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

  function getPaletteSource() {
    const data = getKomaData();
    const jsonInput = getEl("jsonInput");
    const rawJsonInput = jsonInput ? jsonInput.value : "";

    if (state.paletteDirty) {
      const palettePreview = getEl("palettePreview");
      return palettePreview ? normalizeText(palettePreview.value) : "";
    }

    if (data.commands) return normalizeText(data.commands);

    if (window.ChatPaletteParser && typeof window.ChatPaletteParser.extractPaletteText === "function") {
      const extracted = window.ChatPaletteParser.extractPaletteText(rawJsonInput);
      if (extracted && extracted.text) return normalizeText(extracted.text);
    }

    return normalizeText(state.parsedTxt.commands || "");
  }

  function renderPalette() {
    const palettePreview = getEl("palettePreview");
    const paletteEditionLabel = getEl("paletteEditionLabel");
    const rawCommands = getPaletteSource();
    const edition = detectCurrentEdition();

    state.currentEdition = edition;

    if (palettePreview && !state.paletteDirty) {
      if (!rawCommands.trim()) {
        palettePreview.value = "";
      } else if (checked("formatPalette")) {
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
    const profileSupplementInput = getEl("profileSupplementInput");
    const profile = profileSupplementInput ? profileSupplementInput.value : defaultProfileText();
    const name = data.name || parsedTxt.profile.name || "";
    const parts = [];

    if (name || profile.trim()) {
      parts.push(`名前: ${name || "-"}${NL}${profile}`.trim());
    }

    if (checked("includeWeapons") && parsedTxt.sections.weapons) {
      parts.push(formatWeaponsSection(parsedTxt.sections.weapons));
    }

    if (checked("includeItems") && parsedTxt.sections.items) {
      parts.push(formatItemsSection(parsedTxt.sections.items));
    }

    if (checked("includeKnowledge") && parsedTxt.sections.knowledge) {
      const knowledgeText = formatKnowledgeSection(parsedTxt.sections.knowledge);
      if (knowledgeText) parts.push(knowledgeText);
    }

    if (checked("includeTxtMemo")) {
      const txtMemo = getCurrentTxtMemoSection(parsedTxt);
      if (txtMemo) parts.push(`【メモ】${NL}${txtMemo}`);
    }

    if (data.memo) {
      parts.push(`【既存メモ】${NL}${data.memo}`);
    }

    return parts.filter(Boolean).join(NL + NL);
  }

  function getCurrentTxtMemoSection(parsedTxt) {
    const fromState = parsedTxt && parsedTxt.sections ? parsedTxt.sections.memo : "";
    if (String(fromState || "").trim()) return String(fromState).trim();

    const txtInput = getEl("txtInput");
    const rawTxt = txtInput ? txtInput.value : "";
    return extractMemoSection(rawTxt).trim();
  }

  function buildGeneratedJson() {
    const parsed = state.parsedKoma;
    const data = Object.assign({}, getKomaData());
    const memoEditor = getEl("memoEditor");
    const palettePreview = getEl("palettePreview");

    data.name = data.name || state.parsedTxt.profile.name || "いあきゃらテキスト出力キャラクター";
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
    const profileSupplementInput = getEl("profileSupplementInput");
    if (profileSupplementInput) profileSupplementInput.value = buildProfileText(state.parsedTxt.profile);
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
    const paletteSource = getPaletteSource();

    if (window.ChatPaletteParser && typeof window.ChatPaletteParser.detectEdition === "function") {
      return window.ChatPaletteParser.detectEdition(paletteSource);
    }

    if (window.CocPaletteParser && typeof window.CocPaletteParser.detectEdition === "function") {
      return window.CocPaletteParser.detectEdition(paletteSource);
    }

    if (typeof window.detectCocEdition === "function") {
      return window.detectCocEdition(paletteSource);
    }

    return fallbackDetectEdition(paletteSource);
  }

  function formatPalette(rawCommands, edition) {
    const source = normalizeText(rawCommands || "");

    if (!source.trim()) return "";

    if (window.ChatPaletteParser && typeof window.ChatPaletteParser.buildOutput === "function") {
      return window.ChatPaletteParser.buildOutput(source, edition);
    }

    if (window.CocPaletteParser && typeof window.CocPaletteParser.format === "function") {
      return window.CocPaletteParser.format(source, edition);
    }

    if (typeof window.formatChatPalette === "function") {
      return window.formatChatPalette(source, edition);
    }

    if (typeof window.formatPalette === "function") {
      return window.formatPalette(source, edition);
    }

    return fallbackFormatPalette(source, edition);
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

  function extractFirstSection(text, sectionNames) {
    for (const name of sectionNames) {
      const section = extractSection(text, name);
      if (section) return section;
    }
    return "";
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

      if (!clean || clean.includes("技能名") || clean.includes("初期値") || clean.includes("合計")) return;

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

    const headerLine = lines.find((line) => isWeaponHeaderLine(line));
    const columnSpec = headerLine ? getWeaponColumnSpec(headerLine) : null;

    const dataLines = lines.filter((line) => {
      const text = line.trim();
      return text && !isWeaponHeaderLine(text);
    });

    const rows = dataLines
      .map((line) => parseWeaponTableRow(line, columnSpec))
      .filter(Boolean)
      .map((row) => ({
        name: normalizeWeaponField(row.name),
        success: normalizeWeaponField(row.success),
        damage: normalizeWeaponField(row.damage),
        range: normalizeWeaponField(row.range),
        attack: normalizeAttackCount(row.attack),
        ammo: normalizeAmmoCount(row.ammo),
        durability: normalizeWeaponField(row.durability),
        malfunction: normalizeWeaponField(row.malfunction),
      }));

    if (!rows.length) return `【戦闘・武器・防具】${NL}${raw}`;

    const output = ["【戦闘・武器・防具】"];

    rows.forEach((row) => {
      output.push(`武器：${row.name}`);

      const secondLine = [
        row.success !== "-" ? `成功率${row.success}` : "",
        row.damage !== "-" ? `ダメージ${row.damage}` : "",
        row.range !== "-" ? `射程${row.range}` : "",
      ].filter(Boolean).join("｜");

      const thirdLine = [
        row.attack !== "-" ? `回数${row.attack}` : "",
        row.ammo !== "-" ? `装弾数${row.ammo}` : "",
        row.durability !== "-" ? `耐久力${row.durability}` : "",
        row.malfunction !== "-" ? `故障${row.malfunction}` : "",
      ].filter(Boolean).join("｜");

      if (secondLine) output.push(`${secondLine}｜`);
      if (thirdLine) output.push(`${thirdLine}｜`);
      output.push("");
    });

    return output.join(NL).trim();
  }

  function isWeaponHeaderLine(line) {
    const text = String(line || "");
    return (text.includes("名前") && text.includes("成功率")) ||
      (text.includes("ダメージ") && text.includes("射程") && (text.includes("故障") || text.includes("耐久")));
  }

  function getWeaponColumnSpec(headerLine) {
    const labels = [
      ["name", "名前"],
      ["success", "成功率"],
      ["damage", "ダメージ"],
      ["range", "射程"],
      ["attack", "攻撃回数"],
      ["ammo", "装弾数"],
      ["durability", "耐久力"],
      ["malfunction", "故障その他"],
    ];

    const found = labels
      .map(([key, label]) => ({ key, index: String(headerLine).indexOf(label) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    return found.length >= 3 ? found : null;
  }

  function parseWeaponTableRow(line, columnSpec) {
    const raw = String(line || "").trim();
    if (!raw) return null;

    const columns = raw
      .split(/\t+|\s{2,}/)
      .map((value) => value.trim())
      .filter((value) => value !== "");

    if (!columns.length) return null;

    return mapWeaponColumns(columns);
  }

  function mapWeaponColumns(columns) {
    const row = {
      name: columns[0] || "-",
      success: columns[1] || "-",
      damage: columns[2] || "-",
      range: "-",
      attack: "-",
      ammo: "-",
      durability: "-",
      malfunction: "-",
    };

    const rest = columns.slice(3);

    if (rest.length === 1) {
      if (isPlainNumber(rest[0])) row.durability = rest[0];
      else row.range = rest[0];
      return row;
    }

    if (rest.length >= 1) row.range = rest[0] || "-";
    if (rest.length >= 2) row.attack = rest[1] || "-";
    if (rest.length >= 3) row.ammo = rest[2] || "-";

    if (rest.length === 4 && row.ammo === "-" && String(rest[3] || "").trim().startsWith("-")) {
      row.malfunction = rest[3];
      return row;
    }

    if (rest.length >= 4) row.durability = rest[3] || "-";
    if (rest.length >= 5) row.malfunction = rest.slice(4).join(" ") || "-";

    return row;
  }

  function isPlainNumber(value) {
    return /^\d+$/.test(String(value || "").trim());
  }

  function normalizeWeaponField(value) {
    const text = String(value || "").trim();
    return text || "-";
  }

  function normalizeAttackCount(value) {
    const text = normalizeWeaponField(value);
    if (text === "-") return "-";
    if (text.includes("回")) return text;
    if (text.includes("連射")) return text;
    return `${text}回`;
  }

  function normalizeAmmoCount(value) {
    const text = normalizeWeaponField(value);
    if (text === "-") return "-";
    if (text.includes("発")) return text;
    return `${text}発`;
  }

  function formatItemsSection(rawSectionText) {
    const raw = normalizeText(rawSectionText).trim();
    if (!raw) return "【所持品】";

    const lines = raw
      .split(NL)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim());

    const headerLine = lines.find((line) => isItemHeaderLine(line));
    const columnSpec = headerLine ? getItemColumnSpec(headerLine) : null;

    const dataLines = lines.filter((line) => {
      const text = line.trim();
      return text && !isItemHeaderLine(text);
    });

    const items = dataLines
      .map((line) => parseItemTableRow(line, columnSpec))
      .filter((item) => item.name);

    if (!items.length) return `【所持品】${NL}${raw}`;

    return [
      "【所持品】",
      ...items.map((item) => {
        return item.note ? `${item.name}：${item.note}` : item.name;
      }),
    ].join(NL);
  }

  function isItemHeaderLine(line) {
    const text = String(line || "");
    return text.startsWith("名称") || (text.includes("名称") && (text.includes("効果、備考") || text.includes("効果・備考")));
  }

  function getItemColumnSpec(headerLine) {
    const noteLabels = ["効果、備考など", "効果・備考など", "効果、備考", "効果・備考", "備考"];
    const nameIndex = String(headerLine).indexOf("名称");
    const noteIndex = noteLabels
      .map((label) => String(headerLine).indexOf(label))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];

    const priceIndex = String(headerLine).indexOf("単価");
    if (nameIndex < 0) return null;

    return {
      nameStart: nameIndex,
      nameEnd: priceIndex > nameIndex ? priceIndex : noteIndex,
      noteStart: noteIndex >= 0 ? noteIndex : -1,
    };
  }

  function parseItemTableRow(line, columnSpec) {
    const raw = String(line || "").trimEnd();
    const text = raw.trim();

    if (!text) return { name: "", note: "" };

    if (columnSpec && columnSpec.nameStart >= 0) {
      const name = raw
        .slice(columnSpec.nameStart, columnSpec.nameEnd && columnSpec.nameEnd > columnSpec.nameStart ? columnSpec.nameEnd : undefined)
        .trim();
      const note = columnSpec.noteStart >= 0 ? raw.slice(columnSpec.noteStart).trim() : "";

      if (name) return { name, note };
    }

    const columns = text
      .split(/\s{2,}|\t+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (columns.length >= 2) {
      return {
        name: columns[0],
        note: columns[columns.length - 1],
      };
    }

    return {
      name: text,
      note: "",
    };
  }

  function formatKnowledgeSection(rawSectionText) {
    const raw = normalizeText(rawSectionText).trim();
    if (!raw) return "";

    const allowedHeads = ["魔導書", "呪文", "アーティファクト"];
    const lines = raw
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean);

    const picked = lines.filter((line) => {
      return allowedHeads.some((head) => {
        return (
          line.startsWith(head) ||
          line.startsWith(`【${head}】`) ||
          line.includes(`【${head}】`) ||
          line.includes(`${head}:`) ||
          line.includes(`${head}：`)
        );
      });
    });

    if (!picked.length) return "";

    return `【新たに得た知識・経験】${NL}${picked.join(NL)}`;
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

  function checked(name) {
    const el = getEl(name);
    return el ? Boolean(el.checked) : false;
  }

  function showJsonError(message) {
    const box = getEl("jsonErrorBox");
    if (!box) return;

    box.textContent = `JSON解析エラー: ${message}`;
    box.classList.remove("hidden");
  }

  function hideJsonError() {
    const box = getEl("jsonErrorBox");
    if (!box) return;

    box.textContent = "";
    box.classList.add("hidden");
  }

  function showTxtLoadMessage(message, isError) {
    const el = getEl("txtLoadMessage");
    if (!el) return;

    el.textContent = message || "";
    el.classList.toggle("is-error", Boolean(isError));
    el.classList.toggle("is-success", Boolean(message) && !isError);
  }

  function showStatusMessage(message, isError) {
    const el = getEl("statusMessage");
    if (!el) return;

    el.textContent = isError ? `⚠ ${message}` : message;

    window.setTimeout(() => {
      el.textContent = "";
    }, 2500);
  }

  async function copyText(text, label) {
    if (!String(text || "").trim()) {
      showToast("コピーする内容がありません。", true);
      showStatusMessage("コピーする内容がありません。", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label}をコピーしました。`, false);
      showStatusMessage(`${label}をコピーしました。`, false);
    } catch (error) {
      showToast("コピーに失敗しました。テキスト欄から手動でコピーしてください。", true);
      showStatusMessage("コピーに失敗しました。テキスト欄から手動でコピーしてください。", true);
    }
  }

  function ensureToastContainer() {
    if (document.querySelector(".toast-container")) return;

    const container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  function showToast(message, isError) {
    ensureToastContainer();

    const container = document.querySelector(".toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast${isError ? " is-error" : ""}`;
    toast.textContent = isError ? `⚠ ${message}` : message;

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(18px)";
      toast.style.transition = "opacity .18s ease, transform .18s ease";
    }, 2200);

    window.setTimeout(() => {
      toast.remove();
    }, 2600);
  }

  function getEl(name) {
    const list = ids[name] || [name];

    for (const id of list) {
      const el = document.getElementById(id);
      if (el) return el;
    }

    return null;
  }
})();
