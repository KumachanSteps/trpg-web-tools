(() => {
  const state = {
    outputMode: "both",
    proxyEnabled: true,
    includeProfile: true,
    includeWeapons: true,
    includeItems: true,
    formatPalette: true,
    parsed: null,
    fetchedData: null,
    memoTouched: false,
    theme: localStorage.getItem("charamemo-theme") || "night"
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    bindEvents();
    applyTheme();
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
    el.fetchMessage = document.getElementById("fetchMessage");
    el.includeProfileToggle = document.getElementById("includeProfileToggle");
    el.includeWeaponsToggle = document.getElementById("includeWeaponsToggle");
    el.includeItemsToggle = document.getElementById("includeItemsToggle");
    el.formatPaletteToggle = document.getElementById("formatPaletteToggle");
    el.modeBtns = [...document.querySelectorAll(".mode-btn")];
    el.iconFrame = document.getElementById("iconFrame");
    el.iconPreview = document.getElementById("iconPreview");
    el.characterNameView = document.getElementById("characterNameView");
    el.editionBadge = document.getElementById("editionBadge");
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
    el.themeToggle = document.getElementById("themeToggle");
  }

  function bindEvents() {
    el.komaJsonInput.addEventListener("input", () => {
      state.memoTouched = false;
      state.fetchedData = null;
      setFetchMessage("");
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
    el.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "night" ? "light" : "night";
      localStorage.setItem("charamemo-theme", state.theme);
      applyTheme();
    });
  }

  function bindToggle(button, key, afterChange) {
    button.addEventListener("click", () => {
      state[key] = !state[key];
      button.classList.toggle("active", state[key]);
      if (typeof afterChange === "function") afterChange();
    });
  }

  function applyTheme() {
    document.body.classList.toggle("light-mode", state.theme === "light");
    el.themeToggle.textContent = state.theme === "light" ? "Light Mode" : "Night Mode";
  }

  function currentData() {
    return state.parsed?.ok ? state.parsed.data : null;
  }

  function currentEdition() {
    const data = currentData();
    return data?.commands ? window.CharamemoParser.detectEdition(data.commands) : "";
  }

  function currentPalette() {
    const data = currentData();
    if (!data?.commands) return "";
    const edition = currentEdition() || "6e";
    return state.formatPalette ? window.CharamemoParser.buildPaletteOutput(data.commands, edition) : String(data.commands);
  }

  function render() {
    state.parsed = window.CharamemoParser.parseKomaJson(el.komaJsonInput.value);
    renderInputState();
    renderSummary();
    renderPalette();
    renderMemo();
    renderGeneratedOnly();
  }

  function renderInputState() {
    const hasInput = el.komaJsonInput.value.trim().length > 0;
    el.jsonError.classList.toggle("hidden", !hasInput || state.parsed.ok);
    el.jsonError.textContent = !state.parsed.ok && hasInput ? `JSON解析エラー: ${state.parsed.error}` : "";
    const data = currentData();
    el.externalUrlView.textContent = data?.externalUrl || "未検出";
    el.iconUrlView.textContent = data?.iconUrl || "未検出";
  }

  function renderSummary() {
    const data = currentData();
    const edition = currentEdition();
    el.characterNameView.textContent = data?.name || "未解析";
    el.externalUrlSummary.textContent = data?.externalUrl || "externalUrl 未検出";
    renderEditionBadge(edition);
    renderIcon(data?.iconUrl);
    renderStatusChips(data?.status || []);
    renderParams(data?.params || []);
  }

  function renderEditionBadge(edition) {
    el.editionBadge.classList.toggle("hidden", !edition);
    el.editionBadge.classList.toggle("edition-6e", edition === "6e");
    el.editionBadge.classList.toggle("edition-7e", edition === "7e");
    el.editionBadge.textContent = edition === "7e" ? "7版" : edition === "6e" ? "6版" : "";
  }

  function renderIcon(iconUrl) {
    if (!iconUrl) {
      el.iconPreview.removeAttribute("src");
      el.iconFrame.classList.remove("has-image");
      return;
    }
    el.iconPreview.src = iconUrl;
    el.iconFrame.classList.add("has-image");
  }

  function renderStatusChips(status) {
    el.statusChips.innerHTML = "";
    status.slice(0, 4).forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = `${item.label} ${item.value}`;
      el.statusChips.appendChild(chip);
    });
  }

  function renderParams(params) {
    el.paramsGrid.innerHTML = "";
    params.forEach((param) => {
      const card = document.createElement("div");
      card.className = "param-card";
      const label = document.createElement("span");
      label.textContent = param.label;
      const value = document.createElement("span");
      value.textContent = param.value;
      card.append(label, value);
      el.paramsGrid.appendChild(card);
    });
  }

  function renderPalette() {
    const edition = currentEdition();
    el.palettePreview.value = currentPalette();
    el.editionView.textContent = `自動判定: ${edition ? window.CharamemoParser.editionLabel(edition) : "未判定"}`;
  }

  function renderMemo() {
    if (state.memoTouched) return;
    el.memoEditor.value = generateMemo(currentData());
  }

  function renderGeneratedOnly() {
    const data = currentData();
    if (!data) {
      el.generatedJson.value = "";
      return;
    }
    const nextData = { ...data };
    if (state.outputMode === "both" || state.outputMode === "memo") nextData.memo = el.memoEditor.value;
    if (state.outputMode === "both" || state.outputMode === "koma") nextData.commands = currentPalette();
    el.generatedJson.value = JSON.stringify({ kind: "character", data: nextData });
  }

  function generateMemo(data) {
    if (!data) return "";
    const parts = [];
    const fetched = state.fetchedData;
    const profile = fetched ? window.IacharaParser.buildProfileMemoFromIachara(fetched, data) : "";
    if (state.includeProfile) parts.push(profile || `名前: ${data.name || ""}\n${el.manualProfileInput.value}`.trim());
    if (state.includeWeapons) parts.push(window.IacharaParser.buildListSection("武器・防具", fetched?.weapons, "※ externalUrl取得後に、いあきゃらの武器・防具情報をここへ反映します。"));
    if (state.includeItems) parts.push(window.IacharaParser.buildListSection("所持品", fetched?.items, "※ externalUrl取得後に、いあきゃらの所持品情報をここへ反映します。"));
    if (fetched?.memo) parts.push(`【キャラメモ】\n${fetched.memo}`);
    if (data.memo) parts.push(`【既存メモ】\n${data.memo}`);
    return parts.filter(Boolean).join("\n\n");
  }

  async function fetchExternalUrl() {
    const data = currentData();
    if (!data?.externalUrl) {
      setFetchMessage("externalUrlが見つかりません");
      return;
    }
    setFetchMessage("取得中...");
    el.fetchBtn.disabled = true;
    try {
      const parsed = await window.IacharaFetcher.fetchAndParse(data.externalUrl, {
        useProxy: state.proxyEnabled,
        proxyUrl: el.proxyUrlInput.value
      });
      state.fetchedData = parsed;
      state.memoTouched = false;
      setFetchMessage(parsed.found ? "いあキャラ情報を取得しました" : "HTMLは取得できましたが、主要項目を十分に検出できませんでした");
      renderMemo();
      renderGeneratedOnly();
    } catch (error) {
      setFetchMessage(error instanceof Error ? error.message : "externalUrlの取得に失敗しました");
    } finally {
      el.fetchBtn.disabled = false;
    }
  }

  function clearAll() {
    el.komaJsonInput.value = "";
    el.memoEditor.value = "";
    el.palettePreview.value = "";
    el.generatedJson.value = "";
    state.parsed = null;
    state.fetchedData = null;
    state.memoTouched = false;
    setFetchMessage("");
    setStatusMessage("");
    render();
  }

  async function copyText(text, label) {
    if (!text) {
      setStatusMessage("コピーする内容がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(`${label}をコピーしました`);
    } catch {
      setStatusMessage("コピーできませんでした。テキスト欄から手動でコピーしてください");
    }
  }

  function setFetchMessage(message) {
    el.fetchMessage.textContent = message || "";
  }

  function setStatusMessage(message) {
    el.statusMessage.textContent = message || "";
    if (message) window.setTimeout(() => { el.statusMessage.textContent = ""; }, 2500);
  }
})();
