(() => {
  const state = {
    outputMode: "both",
    proxyEnabled: true,
    includeProfile: true,
    includeWeapons: true,
    includeItems: true,
    formatPalette: true,
    parsed: null,
    memoTouched: false
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    bindEvents();
    render();
  });

  function bindElements() {
    el.komaJsonInput = document.getElementById("komaJsonInput");
    el.jsonError = document.getElementById("jsonError");
    el.externalUrlView = document.getElementById("externalUrlView");
    el.iconUrlView = document.getElementById("iconUrlView");
    el.proxyToggle = document.getElementById("proxyToggle");
    el.proxyUrlInput = document.getElementById("proxyUrlInput");
    el.fetchBtn = document.getElementById("fetchBtn");
    el.includeProfileToggle = document.getElementById("includeProfileToggle");
    el.includeWeaponsToggle = document.getElementById("includeWeaponsToggle");
    el.includeItemsToggle = document.getElementById("includeItemsToggle");
    el.formatPaletteToggle = document.getElementById("formatPaletteToggle");
    el.modeBtns = [...document.querySelectorAll(".mode-btn")];
    el.iconPreview = document.getElementById("iconPreview");
    el.characterNameView = document.getElementById("characterNameView");
    el.externalUrlSummary = document.getElementById("externalUrlSummary");
    el.statusChips = document.getElementById("statusChips");
    el.paramsGrid = document.getElementById("paramsGrid");
    el.manualProfileInput = document.getElementById("manualProfileInput");
    el.regenerateMemoBtn = document.getElementById("regenerateMemoBtn");
    el.copyMemoBtn = document.getElementById("copyMemoBtn");
    el.memoEditor = document.getElementById("memoEditor");
    el.palettePreview = document.getElementById("palettePreview");
    el.editionView = document.getElementById("editionView");
    el.copyPaletteBtn = document.getElementById("copyPaletteBtn");
    el.generatedJson = document.getElementById("generatedJson");
    el.copyJsonBtn = document.getElementById("copyJsonBtn");
    el.clearInputBtn = document.getElementById("clearInputBtn");
    el.statusMessage = document.getElementById("statusMessage");
  }

  function bindEvents() {
    el.komaJsonInput.addEventListener("input", () => {
      state.memoTouched = false;
      render();
    });

    el.manualProfileInput.addEventListener("input", () => {
      state.memoTouched = false;
      render();
    });

    el.memoEditor.addEventListener("input", () => {
      state.memoTouched = true;
      renderGeneratedOnly();
    });

    bindToggle(el.proxyToggle, "proxyEnabled", () => {
      el.proxyUrlInput.style.display = state.proxyEnabled ? "block" : "none";
    });
    bindToggle(el.includeProfileToggle, "includeProfile", render);
    bindToggle(el.includeWeaponsToggle, "includeWeapons", render);
    bindToggle(el.includeItemsToggle, "includeItems", render);
    bindToggle(el.formatPaletteToggle, "formatPalette", render);

    el.modeBtns.forEach((button) => {
      button.addEventListener("click", () => {
        state.outputMode = button.dataset.outputMode;
        el.modeBtns.forEach((btn) => btn.classList.toggle("active", btn === button));
        renderGeneratedOnly();
      });
    });

    el.fetchBtn.addEventListener("click", fetchExternalUrl);
    el.regenerateMemoBtn.addEventListener("click", () => {
      el.memoEditor.value = generateMemo(currentData());
      state.memoTouched = true;
      renderGeneratedOnly();
    });
    el.copyMemoBtn.addEventListener("click", () => copyText(el.memoEditor.value, "メモ"));
    el.copyPaletteBtn.addEventListener("click", () => copyText(el.palettePreview.value, "チャットパレット"));
    el.copyJsonBtn.addEventListener("click", () => copyText(el.generatedJson.value, "再生成した駒JSON"));
    el.clearInputBtn.addEventListener("click", clearAll);
  }

  function bindToggle(button, key, afterChange) {
    button.addEventListener("click", () => {
      state[key] = !state[key];
      button.classList.toggle("active", state[key]);
      if (afterChange) afterChange();
    });
  }

  function currentData() {
    return state.parsed && state.parsed.ok ? state.parsed.data : null;
  }

  function render() {
    state.parsed = CharamemoParser.parseKomaJson(el.komaJsonInput.value);
    const data = currentData();
    renderError();
    renderSummary(data);
    renderMemo(data);
    renderPalette(data);
    renderGeneratedOnly();
  }

  function renderError() {
    const hasInput = el.komaJsonInput.value.trim().length > 0;
    const shouldShow = hasInput && state.parsed && !state.parsed.ok;
    el.jsonError.classList.toggle("hidden", !shouldShow);
    el.jsonError.textContent = shouldShow ? `JSON解析エラー: ${state.parsed.error}` : "";
  }

  function renderSummary(data) {
    el.externalUrlView.textContent = data?.externalUrl || "未検出";
    el.iconUrlView.textContent = data?.iconUrl || "未検出";
    el.characterNameView.textContent = data?.name || "未解析";
    el.externalUrlSummary.textContent = data?.externalUrl || "externalUrl 未検出";
    el.statusChips.innerHTML = "";
    el.paramsGrid.innerHTML = "";

    const iconFrame = el.iconPreview.parentElement;
    if (data?.iconUrl) {
      el.iconPreview.src = data.iconUrl;
      iconFrame.classList.add("has-image");
    } else {
      el.iconPreview.removeAttribute("src");
      iconFrame.classList.remove("has-image");
    }

    (data?.status || []).slice(0, 4).forEach((status) => {
      const chip = document.createElement("span");
      chip.textContent = `${status.label} ${status.value}`;
      el.statusChips.appendChild(chip);
    });

    (data?.params || []).forEach((param) => {
      const card = document.createElement("div");
      card.className = "param-card";
      const label = document.createElement("span");
      const value = document.createElement("span");
      label.textContent = param.label;
      value.textContent = param.value;
      card.append(label, value);
      el.paramsGrid.appendChild(card);
    });
  }

  function renderMemo(data) {
    if (state.memoTouched) return;
    el.memoEditor.value = generateMemo(data);
  }

  function renderPalette(data) {
    if (!data?.commands) {
      el.palettePreview.value = "";
      el.editionView.textContent = "自動判定: 未判定";
      return;
    }
    const edition = CharamemoParser.detectEdition(CharamemoParser.normalizeText(data.commands));
    el.editionView.textContent = `自動判定: ${CharamemoParser.editionLabel(edition)}`;
    el.palettePreview.value = state.formatPalette ? CharamemoParser.buildPaletteOutput(data.commands, edition) : data.commands;
  }

  function renderGeneratedOnly() {
    const data = currentData();
    el.generatedJson.value = generateKomaJson(data);
  }

  function generateMemo(data) {
    if (!data) return "";
    const parts = [];
    if (state.includeProfile) {
      parts.push(`名前: ${data.name || ""}\n${el.manualProfileInput.value}`.trim());
    }
    if (state.includeWeapons) {
      parts.push("【武器・防具】\n※ externalUrl取得後に、いあきゃらの武器・防具情報をここへ反映します。");
    }
    if (state.includeItems) {
      parts.push("【所持品】\n※ externalUrl取得後に、いあきゃらの所持品情報をここへ反映します。");
    }
    if (data.memo) {
      parts.push(`【既存メモ】\n${data.memo}`);
    }
    return parts.filter(Boolean).join("\n\n");
  }

  function generateKomaJson(data) {
    if (!data) return "";
    const nextData = { ...data };
    if (state.outputMode === "both" || state.outputMode === "memo") nextData.memo = el.memoEditor.value;
    if (state.outputMode === "both" || state.outputMode === "koma") nextData.commands = el.palettePreview.value;
    return JSON.stringify({ kind: "character", data: nextData });
  }

  async function fetchExternalUrl() {
    const data = currentData();
    if (!data?.externalUrl) {
      showStatus("externalUrlが見つかりません", true);
      return;
    }
    showStatus("URL取得処理は次工程で実装予定です", false);
  }

  async function copyText(text, label) {
    if (!text) {
      showStatus("コピーする内容がありません", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showStatus(`${label}をコピーしました`, false);
    } catch {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const success = document.execCommand("copy");
      showStatus(success ? `${label}をコピーしました` : "コピーできませんでした。手動でコピーしてください", !success);
    } catch {
      showStatus("コピーできませんでした。手動でコピーしてください", true);
    }
    document.body.removeChild(textarea);
  }

  function clearAll() {
    el.komaJsonInput.value = "";
    el.memoEditor.value = "";
    el.palettePreview.value = "";
    el.generatedJson.value = "";
    state.memoTouched = false;
    showStatus("入力をクリアしました", false);
    render();
  }

  function showStatus(message, isError) {
    el.statusMessage.textContent = message;
    el.statusMessage.style.color = isError ? "#fca5a5" : "#34d399";
    window.setTimeout(() => {
      el.statusMessage.textContent = "";
    }, 2500);
  }
})();
