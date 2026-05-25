const state = {
  data: null,
  edition: "",
  paletteText: "",
  generatedMemo: "",
  generatedJson: "",
  useProxy: true,
  options: {
    includeWeapons: true,
    includeItems: true,
    includeKnowledge: true,
    includeTxtMemo: true,
    formatPalette: true
  }
};

const $ = (id) => document.getElementById(id);

function init() {
  bindEvents();
  updateAll();
}

function bindEvents() {
  $("jsonInput").addEventListener("input", updateAll);
  $("manualProfile").addEventListener("input", updateAll);
  $("memoEditor").addEventListener("input", updateGeneratedJsonOnly);
  $("themeToggle").addEventListener("click", toggleTheme);
  $("languageToggle").addEventListener("click", toggleLanguage);
  $("helpToggle").addEventListener("click", () => togglePanel("helpPanel"));
  $("shortcutToggle").addEventListener("click", () => togglePanel("shortcutPanel"));
  $("proxyToggle").addEventListener("click", toggleProxy);
  $("fetchButton").addEventListener("click", fetchExternalUrl);
  $("regenMemoButton").addEventListener("click", regenerateMemo);
  $("copyMemoButton").addEventListener("click", () => copyText($("memoEditor").value, "メモ"));
  $("copyPaletteButton").addEventListener("click", () => copyText($("palettePreview").value, "パレット"));
  $("copyJsonButton").addEventListener("click", () => copyText($("generatedJson").value, "駒JSON"));
  $("clearButton").addEventListener("click", clearAll);
  document.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => toggleOption(button));
  });
  document.addEventListener("keydown", handleKeydown);
}

function toggleLanguage() {
  const next = window.CharamemoLanguage ? window.CharamemoLanguage.toggle() : "ja";
  setStatus(`Language: ${next.toUpperCase()}`);
}

function togglePanel(id) {
  const target = $(id);
  const other = id === "helpPanel" ? $("shortcutPanel") : $("helpPanel");
  other.classList.add("hidden");
  target.classList.toggle("hidden");
}

function closePanels() {
  $("helpPanel").classList.add("hidden");
  $("shortcutPanel").classList.add("hidden");
}

function toggleTheme() {
  document.body.classList.toggle("theme-light");
  document.body.classList.toggle("theme-night");
  const isLight = document.body.classList.contains("theme-light");
  $("themeToggle").textContent = isLight ? "☀ ライトモード" : "☾ ナイトモード";
}

function toggleProxy() {
  state.useProxy = !state.useProxy;
  $("proxyToggle").classList.toggle("active", state.useProxy);
}

function toggleOption(button) {
  const key = button.dataset.option;
  state.options[key] = !state.options[key];
  button.classList.toggle("active", state.options[key]);
  updateAll(false);
}

function handleKeydown(event) {
  if (event.key === "Escape") closePanels();
  if (event.altKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    toggleTheme();
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyText($("generatedJson").value, "駒JSON");
  }
}

function updateAll(clearEditedMemo = true) {
  const parsed = CharamemoParser.parseKomaJson($("jsonInput").value);
  updateError(parsed);
  state.data = parsed.ok ? parsed.data : null;
  if (clearEditedMemo) $("memoEditor").dataset.edited = "";
  const params = normalizeParams(state.data?.params || []);
  const commandText = String(state.data?.commands || "");
  state.edition = commandText ? CharamemoParser.detectEdition(commandText, params) : "";
  state.paletteText = commandText ? (state.options.formatPalette ? CharamemoParser.buildPaletteOutput(commandText, state.edition) : CharamemoParser.normalizeText(commandText)) : "";
  state.generatedMemo = buildMemo(state.data, $("manualProfile").value, state.options);
  if (!$("memoEditor").dataset.edited) $("memoEditor").value = state.generatedMemo;
  renderSummary();
  renderPalette();
  updateGeneratedJsonOnly();
}

function updateGeneratedJsonOnly() {
  const memo = $("memoEditor").value;
  if (document.activeElement === $("memoEditor")) $("memoEditor").dataset.edited = "1";
  state.generatedJson = generateKomaJson(state.data, memo, state.paletteText);
  $("generatedJson").value = state.generatedJson;
}

function updateError(parsed) {
  const errorBox = $("jsonError");
  if ($("jsonInput").value.trim() && !parsed.ok) {
    errorBox.textContent = `JSON解析エラー: ${parsed.error}`;
    errorBox.classList.remove("hidden");
  } else {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }
}

function renderSummary() {
  const data = state.data;
  $("summaryName").textContent = data?.name || "未解析";
  renderIcon(data?.iconUrl || "");
  renderEditionBadge(state.edition);
  renderSheetLink(data?.externalUrl || "");
  renderStatusChips(data?.status || []);
  renderParams(data?.params || []);
}

function renderIcon(iconUrl) {
  const box = $("summaryIcon");
  box.innerHTML = "";
  if (iconUrl) {
    const img = document.createElement("img");
    img.src = iconUrl;
    img.alt = "character icon";
    box.appendChild(img);
    box.classList.add("has-image");
  } else {
    const span = document.createElement("span");
    span.className = "icon-placeholder";
    span.textContent = "▧";
    box.appendChild(span);
    box.classList.remove("has-image");
  }
}

function renderEditionBadge(edition) {
  const badge = $("editionBadge");
  badge.className = "edition-badge";
  if (edition === "6e") {
    badge.classList.add("edition-6");
    badge.textContent = "6版";
  } else if (edition === "7e") {
    badge.classList.add("edition-7");
    badge.textContent = "7版";
  } else {
    badge.classList.add("edition-empty");
    badge.textContent = "未判定";
  }
}

function renderSheetLink(url) {
  const badge = $("sheetLinkBadge");
  const parent = badge.parentElement;
  const replacement = url ? document.createElement("a") : document.createElement("span");
  replacement.id = "sheetLinkBadge";
  replacement.className = url ? "sheet-link-badge" : "sheet-link-badge is-disabled";
  replacement.textContent = url ? "🔗 キャラシリンク" : "🔗 未検出";
  if (url) {
    replacement.href = url;
    replacement.target = "_blank";
    replacement.rel = "noreferrer";
  }
  parent.replaceChild(replacement, badge);
}

function renderStatusChips(status) {
  const box = $("statusChips");
  box.innerHTML = "";
  const rows = Array.isArray(status) ? status.slice(0, 4) : [];
  rows.forEach((item) => {
    const span = document.createElement("span");
    span.textContent = `${item.label || "-"} ${currentValue(item)}`;
    box.appendChild(span);
  });
}

function renderParams(params) {
  const box = $("paramsGrid");
  box.innerHTML = "";
  const rows = Array.isArray(params) ? params : [];
  rows.forEach((item) => {
    const div = document.createElement("div");
    div.className = "param-chip";
    const label = document.createElement("span");
    label.textContent = item.label || "-";
    const value = document.createElement("strong");
    value.textContent = currentValue(item);
    div.append(label, value);
    box.appendChild(div);
  });
}

function renderPalette() {
  $("palettePreview").value = state.paletteText;
  $("editionStatus").textContent = `自動判定: ${state.edition ? CharamemoParser.editionLabel(state.edition) : "未判定"}`;
}

function normalizeParams(params) {
  const result = {};
  if (!Array.isArray(params)) return result;
  params.forEach((item) => {
    if (!item || !item.label) return;
    result[item.label] = currentValue(item);
  });
  return result;
}

function currentValue(item) {
  if (!item || typeof item !== "object") return "-";
  return item.value ?? item.current ?? item.max ?? "-";
}

function buildMemo(data, manualProfile, options) {
  if (!data) return "";
  const parts = [];
  parts.push(`名前: ${data.name || ""}\n${manualProfile}`.trim());
  if (options.includeWeapons) parts.push("【戦闘・武器・防具】\n※ いあきゃらTXTやキャラシ情報から追記してください。");
  if (options.includeItems) parts.push("【所持品】\n※ いあきゃらTXTやキャラシ情報から追記してください。");
  if (options.includeKnowledge) parts.push("【新たに得た知識・経験】\n※ 通過シナリオや成長メモを追記してください。");
  if (options.includeTxtMemo) parts.push("【TXT内メモ】\n※ TXT内メモがある場合はここへ反映してください。");
  if (data.memo) parts.push(`【既存メモ】\n${data.memo}`);
  return parts.filter(Boolean).join("\n\n");
}

function generateKomaJson(data, memo, commands) {
  if (!data) return "";
  return JSON.stringify({ kind: "character", data: { ...data, memo, commands } });
}

function regenerateMemo() {
  $("memoEditor").dataset.edited = "";
  $("memoEditor").value = state.generatedMemo;
  updateGeneratedJsonOnly();
}

function fetchExternalUrl() {
  if (!state.data?.externalUrl) {
    setStatus("externalUrlが見つかりません", "error");
    return;
  }
  setStatus("現在の版では外部ページ取得ではなく、駒JSON内の情報を元に整形します。", "info");
}

function clearAll() {
  $("jsonInput").value = "";
  $("memoEditor").value = "";
  $("memoEditor").dataset.edited = "";
  setStatus("入力欄をクリアしました。", "info");
  updateAll();
}

async function copyText(text, label) {
  if (!text) {
    setStatus("コピーする内容がありません。", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label}をコピーしました。`, "info");
  } catch (error) {
    fallbackCopyText(text);
    setStatus(`${label}を選択コピー用に準備しました。`, "info");
  }
}

function fallbackCopyText(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  try { document.execCommand("copy"); } catch (error) { console.warn(error); }
  temp.remove();
}

function setStatus(message, type = "info") {
  const status = $("statusMessage");
  status.textContent = message;
  status.style.color = type === "error" ? "#fecaca" : "#6ee7b7";
  if (message) window.setTimeout(() => { if (status.textContent === message) status.textContent = ""; }, 2600);
}

document.addEventListener("DOMContentLoaded", init);
