const NL = "\n";

const state = {
  data: null,
  parsedJson: { ok: false, error: "" },
  useProxy: true,
  outputMode: "both",
};

const els = {};

window.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  parseAndRender();
});

function bindElements() {
  [
    "app",
    "jsonInput",
    "jsonError",
    "externalUrlView",
    "iconUrlView",
    "useProxyToggle",
    "fetchButton",
    "proxyUrl",
    "includeProfile",
    "includeWeapons",
    "includeItems",
    "formatPalette",
    "manualProfile",
    "memoEditor",
    "palettePreview",
    "editionView",
    "generatedJson",
    "summaryName",
    "summaryExternalUrl",
    "statusChips",
    "paramsGrid",
    "iconFrame",
    "regenerateMemo",
    "copyMemo",
    "copyPalette",
    "copyJson",
    "clearInput",
    "statusMessage",
    "themeToggle",
    "themeIcon",
    "themeLabel",
    "helpToggle",
    "shortcutToggle",
    "helpPanel",
    "shortcutPanel",
    "langToggle"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.jsonInput.addEventListener("input", () => {
    els.memoEditor.value = "";
    parseAndRender();
  });
  els.manualProfile.addEventListener("input", render);
  els.memoEditor.addEventListener("input", render);
  els.useProxyToggle.addEventListener("click", () => {
    state.useProxy = !state.useProxy;
    els.useProxyToggle.classList.toggle("active", state.useProxy);
  });
  els.fetchButton.addEventListener("click", fetchExternalUrl);
  [els.includeProfile, els.includeWeapons, els.includeItems, els.formatPalette].forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      render();
    });
  });
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.outputMode = button.dataset.mode || "both";
      document.querySelectorAll(".mode-btn").forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });
  els.regenerateMemo.addEventListener("click", () => {
    els.memoEditor.value = buildMemo(getData(), getOptions());
    render();
  });
  els.copyMemo.addEventListener("click", () => copyText(getActiveMemo(), "メモ"));
  els.copyPalette.addEventListener("click", () => copyText(getPaletteText(), "パレット"));
  els.copyJson.addEventListener("click", () => copyText(els.generatedJson.value, "駒JSON"));
  els.clearInput.addEventListener("click", clearInput);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.helpToggle.addEventListener("click", () => toggleInfoPanel("help"));
  els.shortcutToggle.addEventListener("click", () => toggleInfoPanel("shortcut"));
  document.addEventListener("keydown", handleShortcut);
}

function parseAndRender() {
  state.parsedJson = parseKomaJson(els.jsonInput.value);
  state.data = state.parsedJson.ok ? state.parsedJson.data : null;
  render();
}

function render() {
  const data = getData();
  const edition = detectEdition(data?.commands || "");
  const paletteText = getPaletteText();
  const generatedJson = generateKomaJson(data, getActiveMemo(), paletteText, state.outputMode);

  if (els.jsonInput.value.trim() && !state.parsedJson.ok) {
    els.jsonError.textContent = `JSON解析エラー: ${state.parsedJson.error}`;
    els.jsonError.classList.remove("hidden");
  } else {
    els.jsonError.textContent = "";
    els.jsonError.classList.add("hidden");
  }

  els.externalUrlView.textContent = data?.externalUrl || "未検出";
  els.iconUrlView.textContent = data?.iconUrl || "未検出";
  els.summaryName.textContent = data?.name || "未解析";
  els.summaryExternalUrl.textContent = data?.externalUrl || "externalUrl 未検出";
  renderIcon(data?.iconUrl || "");
  renderStatus(data);
  renderParams(data);

  if (!els.memoEditor.value) {
    els.memoEditor.value = buildMemo(data, getOptions());
  }
  els.palettePreview.value = paletteText;
  els.generatedJson.value = generatedJson;
  els.editionView.textContent = `自動判定: ${edition ? editionLabel(edition) : "未判定"}`;
}

function getData() {
  return state.data;
}

function getOptions() {
  return {
    includeProfile: els.includeProfile.classList.contains("active"),
    includeWeapons: els.includeWeapons.classList.contains("active"),
    includeItems: els.includeItems.classList.contains("active"),
    formatPalette: els.formatPalette.classList.contains("active"),
    manualProfile: els.manualProfile.value,
  };
}

function getActiveMemo() {
  return els.memoEditor.value || buildMemo(getData(), getOptions());
}

function getPaletteText() {
  const data = getData();
  if (!data?.commands) return "";
  const edition = detectEdition(data.commands);
  return getOptions().formatPalette ? formatCommands(data.commands, edition) : normalizeText(data.commands);
}

function buildMemo(data, options) {
  if (!data) return "";
  const parts = [];
  if (options.includeProfile) {
    parts.push(`名前: ${data.name || ""}${NL}${options.manualProfile || ""}`.trim());
  }
  if (options.includeWeapons) {
    parts.push("【武器・防具】\n※ externalUrl取得後に、いあきゃらの武器・防具情報をここへ反映します。");
  }
  if (options.includeItems) {
    parts.push("【所持品】\n※ externalUrl取得後に、いあきゃらの所持品情報をここへ反映します。");
  }
  if (data.memo) {
    parts.push(`【既存メモ】${NL}${data.memo}`);
  }
  return parts.filter(Boolean).join(NL + NL);
}

function generateKomaJson(data, memo, commands, outputMode) {
  if (!data) return "";
  const nextData = { ...data };
  if (outputMode === "both" || outputMode === "memo") nextData.memo = memo;
  if (outputMode === "both" || outputMode === "koma") nextData.commands = commands;
  return JSON.stringify({ kind: "character", data: nextData });
}

function parseKomaJson(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return { ok: false, error: "" };
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
      return { ok: false, error: "kind:'character' と data を持つCCFOLIA駒JSONではありません" };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "JSONを解析できませんでした" };
  }
}

function detectEdition(commands) {
  const text = normalizeText(commands);
  if (!text) return "";
  if (text.includes("近接戦闘") || text.includes("射撃（") || text.includes("射撃:")) return "7e";
  if (text.includes("CCB<=") || text.includes("こぶし") || text.includes("忍び歩き")) return "6e";
  return text.includes("CC<=") ? "7e" : "6e";
}

function editionLabel(edition) {
  return edition === "6e" ? "CoC 6版" : "CoC 7版";
}

function formatCommands(commands, edition) {
  const command = edition === "6e" ? "CCB" : "CC";
  return normalizeText(commands)
    .split(NL)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => replaceCommand(line, command))
    .join(NL);
}

function replaceCommand(line, command) {
  const prefixes = ["sCCB<=", "sCC<=", "CCB<=", "CC<=", "1d100<=", "1D100<="];
  const hit = prefixes.find((prefix) => line.startsWith(prefix));
  if (!hit) return line;
  return command + "<=" + line.slice(hit.length);
}

function normalizeText(text) {
  return String(text || "").replaceAll("\\n", NL).replaceAll("\r\n", NL).replaceAll("\r", NL);
}

function renderIcon(iconUrl) {
  els.iconFrame.innerHTML = "";
  if (!iconUrl) {
    els.iconFrame.textContent = "▧";
    return;
  }
  const image = document.createElement("img");
  image.src = iconUrl;
  image.alt = "character icon";
  image.onerror = () => {
    els.iconFrame.innerHTML = "";
    els.iconFrame.textContent = "▧";
  };
  els.iconFrame.appendChild(image);
}

function renderStatus(data) {
  els.statusChips.innerHTML = "";
  const statuses = Array.isArray(data?.status) ? data.status.slice(0, 4) : [];
  statuses.forEach((item) => {
    const chip = document.createElement("span");
    chip.textContent = `${item.label} ${item.value}`;
    els.statusChips.appendChild(chip);
  });
}

function renderParams(data) {
  els.paramsGrid.innerHTML = "";
  const params = Array.isArray(data?.params) ? data.params : [];
  params.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "param-chip";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    chip.appendChild(label);
    chip.appendChild(value);
    els.paramsGrid.appendChild(chip);
  });
}

function fetchExternalUrl() {
  if (!state.data?.externalUrl) {
    showStatus("externalUrlが見つかりません", true);
    return;
  }
  const prefix = state.useProxy ? (els.proxyUrl.value || "") : "";
  const target = prefix ? `${prefix}${encodeURIComponent(state.data.externalUrl)}` : state.data.externalUrl;
  showStatus(`取得先: ${target}`, false);
}

function clearInput() {
  els.jsonInput.value = "";
  els.memoEditor.value = "";
  state.parsedJson = { ok: false, error: "" };
  state.data = null;
  render();
  showStatus("入力をクリアしました", false);
}

function toggleTheme() {
  const light = els.app.classList.toggle("theme-light");
  els.app.classList.toggle("theme-night", !light);
  els.themeIcon.textContent = light ? "☀" : "☾";
  els.themeLabel.textContent = light ? "ライトモード" : "ナイトモード";
}

function toggleInfoPanel(type) {
  const target = type === "help" ? els.helpPanel : els.shortcutPanel;
  const other = type === "help" ? els.shortcutPanel : els.helpPanel;
  other.classList.add("hidden");
  target.classList.toggle("hidden");
}

function handleShortcut(event) {
  if (event.key === "Escape") {
    els.helpPanel.classList.add("hidden");
    els.shortcutPanel.classList.add("hidden");
  }
  if (event.altKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    toggleTheme();
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyText(els.generatedJson.value, "駒JSON");
  }
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
    showStatus("コピーできませんでした。テキスト欄から手動でコピーしてください", true);
  }
}

function showStatus(message, isError) {
  els.statusMessage.textContent = isError ? `⚠ ${message}` : message;
  window.setTimeout(() => {
    els.statusMessage.textContent = "";
  }, 2500);
}
