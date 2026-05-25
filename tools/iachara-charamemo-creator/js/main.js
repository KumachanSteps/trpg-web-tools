(() => {
  const $ = (id) => document.getElementById(id);
  const parser = window.CharamemoParser;
  const language = window.CharamemoLanguage;

  const state = {
    koma: null,
    parsedJson: { ok: false, error: "" },
    parsedTxt: parser.parseIacharaTxt(""),
    detectedEdition: "",
    generatedMemo: "",
    generatedJson: ""
  };

  const els = {
    appShell: $("appShell"),
    languageToggle: $("languageToggle"),
    usageToggle: $("usageToggle"),
    shortcutToggle: $("shortcutToggle"),
    themeToggle: $("themeToggle"),
    usagePanel: $("usagePanel"),
    shortcutPanel: $("shortcutPanel"),
    jsonInput: $("jsonInput"),
    jsonError: $("jsonError"),
    openTxtButton: $("openTxtButton"),
    clearTxtButton: $("clearTxtButton"),
    txtFileInput: $("txtFileInput"),
    txtInput: $("txtInput"),
    txtMessage: $("txtMessage"),
    includeWeapons: $("includeWeapons"),
    includeItems: $("includeItems"),
    includeKnowledgeExperience: $("includeKnowledgeExperience"),
    includeTxtMemo: $("includeTxtMemo"),
    formatPalette: $("formatPalette"),
    characterIcon: $("characterIcon"),
    summaryName: $("summaryName"),
    editionBadge: $("editionBadge"),
    summaryProfile: $("summaryProfile"),
    statusCards: $("statusCards"),
    paramCards: $("paramCards"),
    generateMemoButton: $("generateMemoButton"),
    copyMemoButton: $("copyMemoButton"),
    memoEditor: $("memoEditor"),
    memoPreview: $("memoPreview"),
    palettePreview: $("palettePreview"),
    editionText: $("editionText"),
    copyPaletteButton: $("copyPaletteButton"),
    copyGeneratedJsonButton: $("copyGeneratedJsonButton"),
    clearAllButton: $("clearAllButton"),
    copyMessage: $("copyMessage")
  };

  function init() {
    language.applyLanguage(language.getLanguage());
    const savedTheme = localStorage.getItem("charamemo-theme") || "night";
    setTheme(savedTheme);
    bindEvents();
    render();
  }

  function bindEvents() {
    els.languageToggle.addEventListener("click", () => language.toggleLanguage());
    els.usageToggle.addEventListener("click", () => togglePanel(els.usagePanel, els.shortcutPanel));
    els.shortcutToggle.addEventListener("click", () => togglePanel(els.shortcutPanel, els.usagePanel));
    els.themeToggle.addEventListener("click", () => setTheme(getTheme() === "night" ? "light" : "night"));

    els.jsonInput.addEventListener("input", () => {
      els.memoEditor.value = "";
      render();
    });

    els.txtInput.addEventListener("input", () => {
      els.memoEditor.value = "";
      hideMessage(els.txtMessage);
      render();
    });

    els.openTxtButton.addEventListener("click", () => els.txtFileInput.click());
    els.txtFileInput.addEventListener("change", handleTxtFile);
    els.clearTxtButton.addEventListener("click", () => {
      els.txtInput.value = "";
      els.memoEditor.value = "";
      if (els.txtFileInput) els.txtFileInput.value = "";
      showMessage(els.txtMessage, "TXT入力をクリアしました");
      render();
    });

    [els.includeWeapons, els.includeItems, els.includeKnowledgeExperience, els.includeTxtMemo, els.formatPalette].forEach((el) => {
      el.addEventListener("change", render);
    });

    els.generateMemoButton.addEventListener("click", () => {
      els.memoEditor.value = state.generatedMemo;
      render();
    });

    els.memoEditor.addEventListener("input", render);
    els.copyMemoButton.addEventListener("click", () => copyText(getActiveMemo(), "メモ"));
    els.copyPaletteButton.addEventListener("click", () => copyText(els.palettePreview.value, "チャットパレット"));
    els.copyGeneratedJsonButton.addEventListener("click", () => copyText(state.generatedJson, "生成駒JSONデータ"));
    els.clearAllButton.addEventListener("click", clearAll);

    document.addEventListener("keydown", (event) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (event.key === "Escape") {
        closePanels();
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyText(state.generatedJson, "生成駒JSONデータ");
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        clearAll();
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        setTheme(getTheme() === "night" ? "light" : "night");
      }
    });
  }

  async function handleTxtFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      showMessage(els.txtMessage, ".txtファイルを選択してください");
      return;
    }
    const text = await file.text();
    els.txtInput.value = text;
    els.memoEditor.value = "";
    showMessage(els.txtMessage, `${file.name} を読み込みました`);
    render();
  }

  function render() {
    state.parsedJson = parser.parseKomaJson(els.jsonInput.value);
    state.koma = state.parsedJson.ok ? state.parsedJson.data : null;
    state.parsedTxt = parser.parseIacharaTxt(els.txtInput.value);
    state.detectedEdition = parser.detectEditionFromInputs(state.koma, state.parsedTxt);

    renderJsonError();
    renderSummary();
    renderMemoAndPalette();
  }

  function renderJsonError() {
    if (els.jsonInput.value.trim() && !state.parsedJson.ok) {
      els.jsonError.textContent = `JSON解析エラー: ${state.parsedJson.error}`;
      els.jsonError.classList.remove("is-hidden");
    } else {
      els.jsonError.classList.add("is-hidden");
      els.jsonError.textContent = "";
    }
  }

  function renderSummary() {
    const p = state.parsedTxt.profile || {};
    const name = p.name || (state.koma && state.koma.name) || "未解析";
    els.summaryName.textContent = name;
    els.summaryProfile.textContent = `${p.occupation || "職業未検出"} / ${p.age || "年齢未検出"} / ${p.gender || "性別未検出"}`;

    const iconUrl = state.parsedTxt.icons[0] || (state.koma && state.koma.iconUrl) || "";
    if (iconUrl) {
      els.characterIcon.innerHTML = `<img src="${escapeHtml(iconUrl)}" alt="character icon" />`;
    } else {
      els.characterIcon.textContent = "▧";
    }

    if (state.detectedEdition) {
      els.editionBadge.textContent = state.detectedEdition === "7e" ? "7版" : "6版";
      els.editionBadge.className = `edition-badge ${state.detectedEdition === "7e" ? "edition-7e" : "edition-6e"}`;
    } else {
      els.editionBadge.className = "edition-badge is-hidden";
      els.editionBadge.textContent = "";
    }

    els.statusCards.innerHTML = "";
    parser.getStatusCards(state.koma, state.parsedTxt).forEach((item) => {
      const span = document.createElement("span");
      span.className = "status-chip";
      span.textContent = `${item.label} ${item.value}`;
      els.statusCards.appendChild(span);
    });

    els.paramCards.innerHTML = "";
    parser.getParamCards(state.koma, state.parsedTxt).forEach((item) => {
      const div = document.createElement("div");
      div.className = "param-chip";
      div.innerHTML = `<span>${escapeHtml(item.label)}</span><span>${escapeHtml(String(item.value))}</span>`;
      els.paramCards.appendChild(div);
    });
  }

  function renderMemoAndPalette() {
    const options = getOptions();
    state.generatedMemo = parser.buildMemo(state.koma, state.parsedTxt, options);
    const activeMemo = getActiveMemo() || state.generatedMemo;
    const formattedPalette = state.koma && state.koma.commands
      ? options.formatPalette
        ? parser.formatCommands(state.koma.commands, state.detectedEdition)
        : parser.normalizeText(state.koma.commands)
      : "";

    if (!els.memoEditor.value && state.generatedMemo) {
      els.memoPreview.value = state.generatedMemo;
    } else {
      els.memoPreview.value = activeMemo || parser.buildTxtPreview(state.parsedTxt);
    }

    els.palettePreview.value = formattedPalette;
    els.editionText.textContent = `自動判定: ${state.detectedEdition ? editionLabel(state.detectedEdition) : "未判定"}`;

    if (state.koma) {
      const nextData = { ...state.koma };
      nextData.memo = activeMemo;
      nextData.commands = formattedPalette;
      if (state.parsedTxt.icons[0]) nextData.iconUrl = state.parsedTxt.icons[0];
      state.generatedJson = JSON.stringify({ kind: "character", data: nextData });
    } else {
      state.generatedJson = "";
    }
  }

  function getOptions() {
    return {
      includeWeapons: els.includeWeapons.checked,
      includeItems: els.includeItems.checked,
      includeKnowledgeExperience: els.includeKnowledgeExperience.checked,
      includeTxtMemo: els.includeTxtMemo.checked,
      formatPalette: els.formatPalette.checked
    };
  }

  function getActiveMemo() {
    return els.memoEditor.value || state.generatedMemo;
  }

  function togglePanel(target, other) {
    other.classList.add("is-hidden");
    target.classList.toggle("is-hidden");
  }

  function closePanels() {
    els.usagePanel.classList.add("is-hidden");
    els.shortcutPanel.classList.add("is-hidden");
  }

  function setTheme(theme) {
    const next = theme === "light" ? "light" : "night";
    els.appShell.setAttribute("data-theme", next);
    localStorage.setItem("charamemo-theme", next);
    els.themeToggle.textContent = next === "night" ? "🌙 ナイトモード" : "☀️ ライトモード";
  }

  function getTheme() {
    return els.appShell.getAttribute("data-theme") || "night";
  }

  function clearAll() {
    els.jsonInput.value = "";
    els.txtInput.value = "";
    els.memoEditor.value = "";
    if (els.txtFileInput) els.txtFileInput.value = "";
    hideMessage(els.txtMessage);
    hideMessage(els.copyMessage);
    render();
  }

  async function copyText(text, label) {
    if (!text) {
      showMessage(els.copyMessage, "コピーする内容がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showMessage(els.copyMessage, `${label}をコピーしました`);
    } catch {
      showMessage(els.copyMessage, "コピーできませんでした。テキスト欄から手動でコピーしてください");
    }
  }

  function showMessage(el, text) {
    el.textContent = text;
    el.classList.remove("is-hidden");
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(() => hideMessage(el), 2500);
  }

  function hideMessage(el) {
    el.textContent = "";
    el.classList.add("is-hidden");
  }

  function editionLabel(edition) {
    return edition === "6e" ? "CoC 6版" : "CoC 7版";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
