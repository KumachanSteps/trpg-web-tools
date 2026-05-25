(function () {
  "use strict";

  const state = {
    komaData: null,
    edition: "",
    paletteText: "",
    txtContent: "",
    txtMemoText: "",
    jsonError: ""
  };

  const el = {};
  let txtApplyTimer = 0;

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    bindEvents();
    renderAll();
  });

  function cacheElements() {
    [
      "komaJsonInput",
      "pasteKomaJsonButton",
      "jsonErrorMessage",
      "iacharaTxtInput",
      "iacharaTxtFileInput",
      "openIacharaTxtFileButton",
      "resetIacharaTxtButton",
      "iacharaTxtMessage",
      "includeWeapons",
      "includeItems",
      "includeKnowledge",
      "includeTxtMemo",
      "formatPalette",
      "profileSupplementInput",
      "regenerateMemoButton",
      "copyMemoButton",
      "memoEditor",
      "palettePreview",
      "editionText",
      "copyPaletteButton",
      "generatedJson",
      "copyGeneratedJsonButton",
      "clearAllButton",
      "statusMessage",
      "summaryIcon",
      "summaryName",
      "editionBadge",
      "sheetLinkBadge",
      "statusChips",
      "paramsGrid",
      "themeToggleButton",
      "helpButton",
      "shortcutButton",
      "helpPanel",
      "shortcutPanel"
    ].forEach((id) => {
      el[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    el.komaJsonInput.addEventListener("input", () => {
      parseKomaInput();
      renderAll();
    });

    el.pasteKomaJsonButton.addEventListener("click", pasteKomaJsonFromClipboard);

    el.iacharaTxtInput.addEventListener("input", () => {
      scheduleIacharaTxtAutoApply();
    });

    el.openIacharaTxtFileButton.addEventListener("click", () => {
      el.iacharaTxtFileInput.click();
    });

    el.iacharaTxtFileInput.addEventListener("change", handleIacharaTxtFileSelected);

    el.resetIacharaTxtButton.addEventListener("click", () => {
      resetIacharaTxt();
    });

    [
      el.includeWeapons,
      el.includeItems,
      el.includeKnowledge,
      el.includeTxtMemo,
      el.formatPalette
    ].forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (state.txtContent) {
          updateMemoFromTxt();
        } else {
          updateGeneratedMemo();
        }
        renderAll();
      });
    });

    el.profileSupplementInput.addEventListener("input", () => {
      updateGeneratedMemo();
      renderAll();
    });

    el.memoEditor.addEventListener("input", renderAll);

    el.regenerateMemoButton.addEventListener("click", () => {
      if (state.txtContent) updateMemoFromTxt();
      else updateGeneratedMemo();
      renderAll();
      showStatus("キャラメモを再生成しました。", false);
    });

    el.copyMemoButton.addEventListener("click", () => copyText(el.memoEditor.value, "メモ"));
    el.copyPaletteButton.addEventListener("click", () => copyText(el.palettePreview.value, "パレット"));
    el.copyGeneratedJsonButton.addEventListener("click", () => copyText(el.generatedJson.value, "駒JSON"));

    el.clearAllButton.addEventListener("click", () => {
      el.komaJsonInput.value = "";
      el.iacharaTxtInput.value = "";
      el.iacharaTxtFileInput.value = "";
      resetIacharaTxt(false);
      state.komaData = null;
      state.edition = "";
      state.paletteText = "";
      state.jsonError = "";
      el.memoEditor.value = "";
      el.profileSupplementInput.value = defaultProfileText();
      renderAll();
      showStatus("入力データを削除しました。", false);
    });

    el.themeToggleButton.addEventListener("click", toggleTheme);
    el.helpButton.addEventListener("click", () => togglePanel(el.helpPanel, el.shortcutPanel));
    el.shortcutButton.addEventListener("click", () => togglePanel(el.shortcutPanel, el.helpPanel));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        el.helpPanel.classList.add("hidden");
        el.shortcutPanel.classList.add("hidden");
      }

      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleTheme();
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyText(el.generatedJson.value, "駒JSON");
      }
    });
  }

  async function pasteKomaJsonFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showStatus("クリップボード読み取りに対応していない環境です。", true);
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        showStatus("クリップボードにテキストがありません。", true);
        return;
      }
      el.komaJsonInput.value = text;
      parseKomaInput();
      renderAll();
      showStatus("クリップボードから駒JSONを入力しました。", false);
    } catch (error) {
      showStatus("クリップボードからの読み取りに失敗しました。", true);
    }
  }

  function scheduleIacharaTxtAutoApply() {
    window.clearTimeout(txtApplyTimer);
    txtApplyTimer = window.setTimeout(() => {
      const value = el.iacharaTxtInput.value;
      if (!value.trim()) {
        resetIacharaTxt(false);
        showTxtMessage("", false);
        return;
      }
      applyIacharaTxtToForm(value, true);
    }, 250);
  }

  async function handleIacharaTxtFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const txtContent = await file.text();
      el.iacharaTxtInput.value = txtContent;
      applyIacharaTxtToForm(txtContent, false);
      showTxtMessage(`テキストファイル「${file.name}」を読み込み、反映しました。`, false);
    } catch (error) {
      showTxtMessage("テキストファイルの読み込みに失敗しました。", true);
    }
  }

  function parseKomaInput() {
    const raw = el.komaJsonInput.value.trim();
    state.jsonError = "";

    if (!raw) {
      state.komaData = null;
      state.edition = "";
      state.paletteText = "";
      return;
    }

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        throw new Error("kind:'character' と data を持つCCFOLIA駒JSONではありません。");
      }

      state.komaData = parsed.data;
      state.edition = window.ChatPaletteParser.detectEdition(state.komaData.commands || "");
      state.paletteText = buildPaletteText();
      updateGeneratedMemo();
    } catch (error) {
      state.komaData = null;
      state.edition = "";
      state.paletteText = "";
      state.jsonError = error instanceof Error ? error.message : "JSONを解析できませんでした。";
    }
  }

  function buildPaletteText() {
    if (!state.komaData || !state.komaData.commands) return "";
    const commands = state.komaData.commands || "";
    return el.formatPalette.checked
      ? window.ChatPaletteParser.buildPaletteOutput(commands, state.edition || "6e")
      : window.ChatPaletteParser.normalizeText(commands);
  }

  function applyIacharaTxtToForm(txtContent, isAutoApply = false) {
    if (!window.IacharaTextParser) {
      showTxtMessage("いあきゃらTXT解析スクリプトが読み込まれていません。", true);
      return;
    }

    const normalized = window.IacharaTextParser.normalizeText(txtContent);

    if (!normalized.trim()) {
      showTxtMessage("TXTが入力されていません。", true);
      return;
    }

    try {
      state.txtContent = normalized;
      const profileText = window.IacharaTextParser.buildProfileSupplementFromIacharaText(normalized);
      el.profileSupplementInput.value = profileText;
      updateMemoFromTxt();
      renderAll();
      showTxtMessage(isAutoApply ? "テキストボックスの内容を自動反映しました。" : "いあきゃらTXTを読み込み、プロフィール補足とキャラメモへ反映しました。", false);
    } catch (error) {
      showTxtMessage("いあきゃらTXTの解析に失敗しました。", true);
    }
  }

  function resetIacharaTxt(showMessageFlag = true) {
    state.txtContent = "";
    state.txtMemoText = "";
    window.clearTimeout(txtApplyTimer);
    el.iacharaTxtInput.value = "";
    el.iacharaTxtFileInput.value = "";
    el.profileSupplementInput.value = defaultProfileText();
    if (!state.komaData) el.memoEditor.value = "";
    else updateGeneratedMemo();
    if (showMessageFlag) showTxtMessage("TXT入力をリセットしました。", false);
    renderAll();
  }

  function updateMemoFromTxt() {
    if (!state.txtContent) return;
    const memoText = window.IacharaTextParser.buildMemoFromIacharaText(state.txtContent, getOptions());
    state.txtMemoText = memoText;
    el.memoEditor.value = memoText || buildMemoFromKoma();
  }

  function updateGeneratedMemo() {
    if (state.txtContent) {
      updateMemoFromTxt();
      return;
    }
    el.memoEditor.value = buildMemoFromKoma();
  }

  function buildMemoFromKoma() {
    if (!state.komaData) return "";
    const parts = [];
    const nameLine = `名前: ${state.komaData.name || ""}`;
    const profileText = el.profileSupplementInput.value.trim();

    parts.push([nameLine, profileText].filter(Boolean).join("\n"));

    const options = getOptions();

    if (options.includeWeapons) parts.push("【戦闘・武器・防具】\n※ いあきゃらTXTを貼り付けると、この欄に反映されます。");
    if (options.includeItems) parts.push("【所持品】\n※ いあきゃらTXTを貼り付けると、この欄に反映されます。");
    if (options.includeKnowledge) parts.push("【新たに得た知識・経験】\n※ いあきゃらTXTを貼り付けると、この欄に反映されます。");
    if (options.includeTxtMemo) parts.push("【TXT内メモ】\n※ いあきゃらTXTを貼り付けると、この欄に反映されます。");
    if (state.komaData.memo) parts.push(`【既存メモ】\n${state.komaData.memo}`);

    return parts.filter(Boolean).join("\n\n");
  }

  function getOptions() {
    return {
      includeWeapons: el.includeWeapons.checked,
      includeItems: el.includeItems.checked,
      includeKnowledge: el.includeKnowledge.checked,
      includeTxtMemo: el.includeTxtMemo.checked
    };
  }

  function renderAll() {
    if (state.komaData) {
      state.edition = window.ChatPaletteParser.detectEdition(state.komaData.commands || "");
      state.paletteText = buildPaletteText();
    }

    renderJsonError();
    renderSummary();
    renderPalette();
    renderGeneratedJson();
  }

  function renderJsonError() {
    if (state.jsonError) {
      el.jsonErrorMessage.textContent = `JSON解析エラー: ${state.jsonError}`;
      el.jsonErrorMessage.classList.remove("hidden");
    } else {
      el.jsonErrorMessage.textContent = "";
      el.jsonErrorMessage.classList.add("hidden");
    }
  }

  function renderSummary() {
    const data = state.komaData;
    const txtProfile = state.txtContent ? window.IacharaTextParser.parseIacharaBasicInfo(state.txtContent) : null;

    const name = data?.name || txtProfile?.name || "未解析";
    el.summaryName.textContent = name;

    renderIcon(data?.iconUrl || "");

    renderEditionBadge();
    renderSheetLink(data?.externalUrl || "");
    renderStatusChips(data?.status || []);
    renderParams(data?.params || []);
  }

  function renderIcon(iconUrl) {
    el.summaryIcon.innerHTML = "";

    if (iconUrl) {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.alt = "character icon";
      el.summaryIcon.appendChild(img);
      return;
    }

    el.summaryIcon.textContent = "🖼";
  }

  function renderEditionBadge() {
    el.editionBadge.className = "edition-badge";

    if (!state.edition) {
      el.editionBadge.classList.add("edition-empty");
      el.editionBadge.textContent = "版未判定";
      el.editionText.textContent = "自動判定: 未判定";
      return;
    }

    if (state.edition === "6e") {
      el.editionBadge.classList.add("edition-6");
      el.editionBadge.textContent = "6版";
      el.editionText.textContent = "自動判定: CoC 6版";
    } else {
      el.editionBadge.classList.add("edition-7");
      el.editionBadge.textContent = "7版";
      el.editionText.textContent = "自動判定: CoC 7版";
    }
  }

  function renderSheetLink(url) {
    if (url) {
      el.sheetLinkBadge.href = url;
      el.sheetLinkBadge.textContent = "🔗 キャラシリンク";
      el.sheetLinkBadge.classList.remove("is-disabled");
    } else {
      el.sheetLinkBadge.href = "#";
      el.sheetLinkBadge.textContent = "🔗 未検出";
      el.sheetLinkBadge.classList.add("is-disabled");
    }
  }

  function renderStatusChips(statusList) {
    el.statusChips.innerHTML = "";

    if (!Array.isArray(statusList) || !statusList.length) return;

    statusList.slice(0, 4).forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = `${item.label || ""} ${item.value ?? ""}`.trim();
      el.statusChips.appendChild(chip);
    });
  }

  function renderParams(params) {
    el.paramsGrid.innerHTML = "";

    if (!Array.isArray(params) || !params.length) return;

    params.forEach((item) => {
      const chip = document.createElement("div");
      chip.className = "param-chip";
      chip.innerHTML = `<span>${escapeHtml(item.label || "")}</span><strong>${escapeHtml(item.value ?? "")}</strong>`;
      el.paramsGrid.appendChild(chip);
    });
  }

  function renderPalette() {
    el.palettePreview.value = state.paletteText || "";
  }

  function renderGeneratedJson() {
    if (!state.komaData) {
      el.generatedJson.value = "";
      return;
    }

    const nextData = {
      ...state.komaData,
      memo: el.memoEditor.value || "",
      commands: state.paletteText || state.komaData.commands || ""
    };

    el.generatedJson.value = JSON.stringify({ kind: "character", data: nextData });
  }

  async function copyText(text, label) {
    if (!text) {
      showStatus("コピーする内容がありません。", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showStatus(`${label}をコピーしました。`, false);
    } catch (error) {
      showStatus("コピーできませんでした。テキスト欄から手動でコピーしてください。", true);
    }
  }

  function showStatus(message, isError) {
    el.statusMessage.textContent = isError ? `⚠ ${message}` : message;
    el.statusMessage.style.color = isError ? "#f87171" : "#6ee7b7";
    window.setTimeout(() => {
      el.statusMessage.textContent = "";
    }, 2500);
  }

  function showTxtMessage(message, isError) {
    el.iacharaTxtMessage.textContent = message;
    el.iacharaTxtMessage.classList.toggle("is-error", Boolean(isError));
    el.iacharaTxtMessage.classList.toggle("is-success", !isError);
  }

  function toggleTheme() {
    const isNight = document.body.classList.contains("theme-night");

    document.body.classList.toggle("theme-night", !isNight);
    document.body.classList.toggle("theme-light", isNight);

    el.themeToggleButton.textContent = isNight ? "☀️ ライトモード" : "🌙 ナイトモード";
  }

  function togglePanel(target, other) {
    other.classList.add("hidden");
    target.classList.toggle("hidden");
  }

  function defaultProfileText() {
    return ["職業: 未取得", "年齢: 未取得 / 性別: 未取得", "身長: 未取得 / 体重: 未取得"].join("\n");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
