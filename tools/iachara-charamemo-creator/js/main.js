(function () {
  const $ = (id) => document.getElementById(id);
  const parser = window.CharamemoParser;

  const state = {
    koma: null,
    parsedJson: { ok: false, error: "", data: null },
    parsedTxt: parser.parseIacharaTxt(""),
    edition: "",
    generatedMemo: "",
    generatedPalette: "",
    memoDirty: false,
    paletteDirty: false,
    language: "ja"
  };

  const elements = {
    appShell: $("appShell"),
    komaJsonInput: $("komaJsonInput"),
    iacharaTxtInput: $("iacharaTxtInput"),
    jsonError: $("jsonError"),
    txtFileInput: $("txtFileInput"),
    openTxtButton: $("openTxtButton"),
    clearTxtButton: $("clearTxtButton"),
    txtStatus: $("txtStatus"),
    includeWeapons: $("includeWeapons"),
    includeItems: $("includeItems"),
    includeKnowledgeExperience: $("includeKnowledgeExperience"),
    includeTxtMemo: $("includeTxtMemo"),
    formatPalette: $("formatPalette"),
    summaryName: $("summaryName"),
    summarySubline: $("summarySubline"),
    editionBadge: $("editionBadge"),
    statusChipGrid: $("statusChipGrid"),
    paramGrid: $("paramGrid"),
    characterIconFrame: $("characterIconFrame"),
    memoEditor: $("memoEditor"),
    applyMemoButton: $("applyMemoButton"),
    copyMemoButton: $("copyMemoButton"),
    memoPreview: $("memoPreview"),
    palettePreview: $("palettePreview"),
    editionLabel: $("editionLabel"),
    copyPaletteButton: $("copyPaletteButton"),
    copyGeneratedJsonButton: $("copyGeneratedJsonButton"),
    clearAllButton: $("clearAllButton"),
    copyStatus: $("copyStatus"),
    themeToggle: $("themeToggle"),
    languageToggle: $("languageToggle"),
    usageToggle: $("usageToggle"),
    shortcutToggle: $("shortcutToggle"),
    usagePanel: $("usagePanel"),
    shortcutPanel: $("shortcutPanel")
  };

  function getOptions() {
    return {
      includeWeapons: elements.includeWeapons.checked,
      includeItems: elements.includeItems.checked,
      includeKnowledgeExperience: elements.includeKnowledgeExperience.checked,
      includeTxtMemo: elements.includeTxtMemo.checked,
      formatPalette: elements.formatPalette.checked
    };
  }

  function parseInputs() {
    state.parsedJson = parser.parseKomaJson(elements.komaJsonInput.value);
    state.koma = state.parsedJson.ok ? state.parsedJson.data : null;
    state.parsedTxt = parser.parseIacharaTxt(elements.iacharaTxtInput.value);
    state.edition = parser.detectEditionFromInputs(state.koma, state.parsedTxt);
    state.generatedMemo = parser.buildMemoFromTxt(state.koma, state.parsedTxt, getOptions());

    const komaPalette = state.koma?.commands ? parser.formatCommands(state.koma.commands, state.edition) : "";
    const txtPalette = parser.buildPaletteFromTxt(state.parsedTxt, state.edition);
    state.generatedPalette = getOptions().formatPalette ? (komaPalette || txtPalette) : parser.normalizeText(state.koma?.commands || txtPalette);
  }

  function syncDerivedFields() {
    if (!state.memoDirty) elements.memoEditor.value = state.generatedMemo;
    elements.memoPreview.value = state.generatedMemo || "いあきゃらTXTを貼り付けるか、txtファイルを開くと解析結果が表示されます。";
    autoResizeTextarea(elements.memoPreview);

    if (!state.paletteDirty) elements.palettePreview.value = state.generatedPalette;
  }

  function renderJsonError() {
    if (elements.komaJsonInput.value.trim() && !state.parsedJson.ok) {
      elements.jsonError.textContent = `JSON解析エラー: ${state.parsedJson.error}`;
      elements.jsonError.classList.remove("hidden");
    } else {
      elements.jsonError.textContent = "";
      elements.jsonError.classList.add("hidden");
    }
  }

  function renderSummary() {
    const p = state.parsedTxt.profile || {};
    const name = p.name || state.koma?.name || "未解析";
    const occupation = p.occupation || "職業未検出";
    const age = p.age || "年齢未検出";
    const gender = p.gender || "性別未検出";
    elements.summaryName.textContent = name;
    elements.summarySubline.textContent = `${occupation} / ${age} / ${gender}`;

    if (state.edition) {
      elements.editionBadge.textContent = state.edition === "7e" ? "7版" : "6版";
      elements.editionBadge.className = `edition-badge ${state.edition === "7e" ? "edition-7e" : "edition-6e"}`;
    } else {
      elements.editionBadge.textContent = "";
      elements.editionBadge.className = "edition-badge hidden";
    }

    const iconUrl = state.parsedTxt.icons?.[0] || state.koma?.iconUrl || "";
    if (iconUrl) {
      elements.characterIconFrame.innerHTML = `<img src="${escapeHtml(iconUrl)}" alt="character icon">`;
    } else {
      elements.characterIconFrame.innerHTML = `<span class="image-placeholder">IMG</span>`;
    }

    elements.statusChipGrid.innerHTML = "";
    for (const status of parser.getStatusCards(state.koma, state.parsedTxt)) {
      const span = document.createElement("span");
      span.className = "status-chip";
      span.textContent = `${status.label} ${status.value}`;
      elements.statusChipGrid.appendChild(span);
    }

    elements.paramGrid.innerHTML = "";
    for (const param of parser.getParamCards(state.koma, state.parsedTxt)) {
      const div = document.createElement("div");
      div.className = "param-chip";
      div.innerHTML = `<span>${escapeHtml(param.label)}</span><strong>${escapeHtml(param.value)}</strong>`;
      elements.paramGrid.appendChild(div);
    }
  }

  function renderPaletteFooter() {
    elements.editionLabel.textContent = `自動判定: ${parser.editionLabel(state.edition)}`;
  }

  function renderAll() {
    parseInputs();
    renderJsonError();
    syncDerivedFields();
    renderSummary();
    renderPaletteFooter();
  }

  function generateFinalJson() {
    if (!state.koma) return "";
    const nextData = { ...state.koma };
    nextData.memo = elements.memoEditor.value || state.generatedMemo;
    nextData.commands = elements.palettePreview.value || state.generatedPalette;
    if (state.parsedTxt.icons?.[0]) nextData.iconUrl = state.parsedTxt.icons[0];
    return JSON.stringify({ kind: "character", data: nextData });
  }

  async function copyText(text, label) {
    if (!text) {
      showCopyStatus("コピーする内容がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showCopyStatus(`${label}をコピーしました`);
    } catch {
      showCopyStatus("コピーできませんでした。テキスト欄から手動でコピーしてください");
    }
  }

  function showCopyStatus(message) {
    elements.copyStatus.textContent = message;
    window.clearTimeout(showCopyStatus.timer);
    showCopyStatus.timer = window.setTimeout(() => {
      elements.copyStatus.textContent = "";
    }, 2600);
  }

  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(220, textarea.scrollHeight + 2)}px`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function closeHeaderPanels() {
    elements.usagePanel.classList.add("hidden");
    elements.shortcutPanel.classList.add("hidden");
  }

  function togglePanel(panel) {
    const wasHidden = panel.classList.contains("hidden");
    closeHeaderPanels();
    if (wasHidden) panel.classList.remove("hidden");
  }

  function toggleTheme() {
    const isLight = elements.appShell.classList.toggle("theme-light");
    elements.appShell.classList.toggle("theme-night", !isLight);
    elements.themeToggle.textContent = isLight ? "☀️ ライトモード" : "🌙 ナイトモード";
  }

  function clearAll() {
    elements.komaJsonInput.value = "";
    elements.iacharaTxtInput.value = "";
    elements.memoEditor.value = "";
    elements.memoPreview.value = "";
    elements.palettePreview.value = "";
    elements.txtFileInput.value = "";
    elements.txtStatus.textContent = "";
    state.memoDirty = false;
    state.paletteDirty = false;
    renderAll();
    showCopyStatus("データを削除しました");
  }

  function bindEvents() {
    elements.komaJsonInput.addEventListener("input", () => {
      state.memoDirty = false;
      state.paletteDirty = false;
      renderAll();
    });

    elements.iacharaTxtInput.addEventListener("input", () => {
      state.memoDirty = false;
      state.paletteDirty = false;
      elements.txtStatus.textContent = "";
      renderAll();
    });

    for (const checkbox of [elements.includeWeapons, elements.includeItems, elements.includeKnowledgeExperience, elements.includeTxtMemo]) {
      checkbox.addEventListener("change", () => {
        state.memoDirty = false;
        renderAll();
      });
    }

    elements.formatPalette.addEventListener("change", () => {
      state.paletteDirty = false;
      renderAll();
    });

    elements.memoEditor.addEventListener("input", () => {
      state.memoDirty = true;
    });

    elements.memoPreview.addEventListener("input", () => {
      autoResizeTextarea(elements.memoPreview);
    });

    elements.palettePreview.addEventListener("input", () => {
      state.paletteDirty = true;
    });

    elements.applyMemoButton.addEventListener("click", () => {
      state.memoDirty = false;
      elements.memoEditor.value = state.generatedMemo;
      renderAll();
    });

    elements.copyMemoButton.addEventListener("click", () => copyText(elements.memoEditor.value || state.generatedMemo, "メモ"));
    elements.copyPaletteButton.addEventListener("click", () => copyText(elements.palettePreview.value || state.generatedPalette, "チャットパレット"));
    elements.copyGeneratedJsonButton.addEventListener("click", () => copyText(generateFinalJson(), "生成駒JSONデータ"));
    elements.clearAllButton.addEventListener("click", clearAll);

    elements.openTxtButton.addEventListener("click", () => elements.txtFileInput.click());
    elements.clearTxtButton.addEventListener("click", () => {
      elements.iacharaTxtInput.value = "";
      elements.txtFileInput.value = "";
      elements.txtStatus.textContent = "TXT入力をクリアしました";
      state.memoDirty = false;
      state.paletteDirty = false;
      renderAll();
    });

    elements.txtFileInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".txt") && file.type && file.type !== "text/plain") {
        elements.txtStatus.textContent = ".txtファイルを選択してください";
        return;
      }
      const text = await file.text();
      elements.iacharaTxtInput.value = text;
      elements.txtStatus.textContent = `${file.name} を読み込みました`;
      state.memoDirty = false;
      state.paletteDirty = false;
      renderAll();
    });

    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.usageToggle.addEventListener("click", () => togglePanel(elements.usagePanel));
    elements.shortcutToggle.addEventListener("click", () => togglePanel(elements.shortcutPanel));
    elements.languageToggle.addEventListener("click", () => {
      if (window.CharamemoLanguage) {
        state.language = window.CharamemoLanguage.toggle();
        showCopyStatus(state.language === "ja" ? "日本語表示です" : "English UI is not fully translated yet");
      }
    });

    document.addEventListener("keydown", (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "Escape") closeHeaderPanels();
      if (mod && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        elements.txtFileInput.click();
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyText(generateFinalJson(), "生成駒JSONデータ");
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        clearAll();
      }
    });
  }

  bindEvents();
  renderAll();
})();
