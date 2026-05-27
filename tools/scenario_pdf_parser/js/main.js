const SNIPPET_TOOL_URL = "../scenario-info-snippet-tool/index.html";
const BRIDGE_TEXT_KEY = "scenarioInfoSnippet.importText";
const BRIDGE_PAYLOAD_KEY = "scenarioInfoSnippet.importPayload";

function i18n(key) {
  return window.SCENARIO_PDF_PARSER_LANGUAGE?.t(key) || key;
}

const presetData = [
  { id: "balanced", labelKey: "preset.balanced.label", descKey: "preset.balanced.desc" },
  { id: "ccfolia", labelKey: "preset.ccfolia.label", descKey: "preset.ccfolia.desc" },
  { id: "scenario", labelKey: "preset.scenario.label", descKey: "preset.scenario.desc" },
  { id: "minimal", labelKey: "preset.minimal.label", descKey: "preset.minimal.desc" },
];

const optionData = [
  { key: "removePageNumbers", labelKey: "option.removePageNumbers" },
  { key: "joinBrokenLines", labelKey: "option.joinBrokenLines" },
  { key: "keepDialogueBreaks", labelKey: "option.keepDialogueBreaks" },
  { key: "normalizeSpaces", labelKey: "option.normalizeSpaces" },
  { key: "removeHeaders", labelKey: "option.removeHeaders" },
  { key: "splitSections", labelKey: "option.splitSections" },
  { key: "markSkillChecks", labelKey: "option.markSkillChecks" },
  { key: "markHandouts", labelKey: "option.markHandouts" },
  { key: "fixMergedHeadings", labelKey: "option.fixMergedHeadings" },
  { key: "keepScenarioMetaLines", labelKey: "option.keepScenarioMetaLines" },
  { key: "removeDuplicateLines", labelKey: "option.removeDuplicateLines" },
  { key: "replaceRoleTokens", labelKey: "option.replaceRoleTokens" },
];

function getPresets() {
  return presetData.map((item) => ({ ...item, label: i18n(item.labelKey), desc: i18n(item.descKey) }));
}

function getCleanupOptions() {
  return optionData.map((item) => ({ ...item, label: i18n(item.labelKey) }));
}
const state = {
  preset: "scenario",
  rawText: window.SCENARIO_PDF_PARSER_SAMPLE_TEXT || "",
  formattedText: "",
  outputText: "",
  searchTerm: "",
  replaceTerm: "",
  activeMatchIndex: 0,
  matches: [],
  options: {
    removePageNumbers: true,
    joinBrokenLines: true,
    keepDialogueBreaks: true,
    normalizeSpaces: true,
    removeHeaders: false,
    splitSections: true,
    markSkillChecks: true,
    markHandouts: true,
    fixMergedHeadings: true,
    keepScenarioMetaLines: true,
    removeDuplicateLines: true,
    replaceRoleTokens: false,
  },
};

const elements = {
  pdfInput: document.getElementById("pdfInput"),
  dropZone: document.getElementById("dropZone"),
  fileStatus: document.getElementById("fileStatus"),
  presetList: document.getElementById("presetList"),
  optionList: document.getElementById("optionList"),
  formatBtn: document.getElementById("formatBtn"),
  copyTopBtn: document.getElementById("copyTopBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  sendSnippetBtn: document.getElementById("sendSnippetBtn"),
  searchInput: document.getElementById("searchInput"),
  replaceInput: document.getElementById("replaceInput"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  replaceBtn: document.getElementById("replaceBtn"),
  replaceAllBtn: document.getElementById("replaceAllBtn"),
  resetReplaceBtn: document.getElementById("resetReplaceBtn"),
  matchCounter: document.getElementById("matchCounter"),
  outputBox: document.getElementById("outputBox"),
  charCount: document.getElementById("charCount"),
  lineCount: document.getElementById("lineCount"),
  blockCount: document.getElementById("blockCount"),
  presetName: document.getElementById("presetName"),
  languageToggleBtn: document.getElementById("languageToggleBtn"),
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function removeNearDuplicateLines(text) {
  const lines = text.split("\n");
  const result = [];
  const recent = [];

  for (const line of lines) {
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) {
      result.push(line);
      continue;
    }

    if (recent.includes(normalized)) continue;

    result.push(line);
    recent.push(normalized);
    if (recent.length > 8) recent.shift();
  }

  return result.join("\n");
}

function replaceRoleTokens(text) {
  return text.replace(/\b(KPC|PC|HO\d*|HO)\b/g, (match) => {
    if (match === "KPC") return "{KPC}";
    if (match === "PC") return "{PC}";
    if (/^HO\d*$/.test(match)) return `{${match}}`;
    return match;
  });
}

function formatText(input, preset, options) {
  let text = input || "";

  text = text.replace(/[ \t]+/g, " ");

  if (options.normalizeSpaces) {
    text = text.replace(/　/g, " ").replace(/ +/g, " ");
  }

  if (options.removePageNumbers) {
    text = text.replace(/^\s*\d+\s*$/gm, "");
  }

  if (options.fixMergedHeadings) {
    text = text.replace(/([^\n])([■◆◇▼●※◎〓△❖◈])/g, "$1\n$2");
    text = text.replace(/([^\n])(【[^】]+】)/g, "$1\n\n$2");
    text = text.replace(/(【[^】]+】)([^\n])/g, "$1\n$2");
  }

  if (options.removeDuplicateLines) {
    text = removeNearDuplicateLines(text);
  }

  if (options.joinBrokenLines) {
    const labelPattern = /^(人数|時間|ロスト率|推奨技能|舞台|備考|含まれる要素|含まれない要素|成功|失敗|SAN|報酬|後遺症|技能)[:：]/;
    const headingPattern = /^(【[^】]+】|[■◆◇▼●※◎〓△❖◈]|Call of Cthulhu)/;
    const lines = text.split("\n");
    const joined = [];

    for (const line of lines) {
      const current = line.trim();
      const previous = joined[joined.length - 1] || "";
      const prevLooksComplete = /[。！？!?」』】）)]$/.test(previous);
      const keepByDialogue = options.keepDialogueBreaks && /^「/.test(current);
      const keepByScenarioMeta = options.keepScenarioMetaLines && (labelPattern.test(current) || labelPattern.test(previous));
      const shouldKeepLine =
        !current ||
        headingPattern.test(current) ||
        keepByDialogue ||
        /^（/.test(current) ||
        keepByScenarioMeta;

      const canJoin = previous && current && !shouldKeepLine && !prevLooksComplete;

      if (canJoin) {
        joined[joined.length - 1] = previous + current;
      } else {
        joined.push(current);
      }
    }

    text = joined.join("\n");
  }

  if (options.replaceRoleTokens) {
    text = replaceRoleTokens(text);
  }

  if (options.markSkillChecks) {
    text = text.replace(/<([^>]+)>/g, "●《$1》");
    text = text.replace(/成功：/g, "● 成功：");
    text = text.replace(/失敗：/g, "○ 失敗：");
  }

  if (options.markHandouts) {
    text = text.replace(/^資料：(.+)$/gm, "■ 資料情報：$1");
  }

  if (preset === "ccfolia") {
    text = text.replace(/\n{3,}/g, "\n\n").replace(/(【描写】)/g, "◆ シーン描写\n");
  }

  if (preset === "scenario") {
    text = text
      .replace(/^第(.+)$/gm, "# 第$1")
      .replace(/^■\s*(.+)$/gm, "■ $1")
      .replace(/【描写】/g, "◆ シーン描写");
  }

  if (preset === "minimal") {
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function getMatches(text, term) {
  if (!term) return [];
  const regex = new RegExp(escapeRegExp(term), "gi");
  return Array.from(text.matchAll(regex), (match) => ({ index: match.index || 0, text: match[0] }));
}

function renderHighlightedOutput() {
  const text = state.outputText || i18n("output.empty");
  const term = state.searchTerm;
  state.matches = getMatches(state.outputText, term);

  if (!term || !state.matches.length) {
    elements.outputBox.textContent = text;
    elements.matchCounter.textContent = term ? `0/0` : `0/0`;
    return;
  }

  const regex = new RegExp(escapeRegExp(term), "gi");
  let lastIndex = 0;
  let matchIndex = 0;
  let html = "";

  for (const match of state.outputText.matchAll(regex)) {
    const index = match.index || 0;
    html += escapeHtml(state.outputText.slice(lastIndex, index));
    const activeClass = matchIndex === state.activeMatchIndex ? " class=\"active-match\"" : "";
    html += `<mark${activeClass}>${escapeHtml(match[0])}</mark>`;
    lastIndex = index + match[0].length;
    matchIndex += 1;
  }

  html += escapeHtml(state.outputText.slice(lastIndex));
  elements.outputBox.innerHTML = html;
  elements.matchCounter.textContent = `${Math.min(state.activeMatchIndex + 1, state.matches.length)}/${state.matches.length}`;

  const active = elements.outputBox.querySelector("mark.active-match");
  if (active) {
    elements.outputBox.focus();
    active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

function updateStats() {
  const text = state.outputText;
  elements.charCount.textContent = text.length.toLocaleString();
  elements.lineCount.textContent = text ? text.split("\n").length.toLocaleString() : "0";
  elements.blockCount.textContent = text ? text.split(/\n{2,}/).filter(Boolean).length.toLocaleString() : "0";
  elements.presetName.textContent = getPresets().find((item) => item.id === state.preset)?.label || "-";
}

function renderAll() {
  renderPresetList();
  renderOptionList();
  renderHighlightedOutput();
  updateStats();
}

function applyFormat() {
  state.formattedText = formatText(state.rawText, state.preset, state.options);
  state.outputText = state.formattedText;
  state.activeMatchIndex = 0;
  renderAll();
}

function renderPresetList() {
  elements.presetList.innerHTML = getPresets().map((preset) => `
    <button class="preset-button ${preset.id === state.preset ? "active" : ""}" data-preset="${preset.id}">
      <strong>${preset.label}</strong>
      <span>${preset.desc}</span>
    </button>
  `).join("");
}

function renderOptionList() {
  elements.optionList.innerHTML = getCleanupOptions().map((option) => `
    <label class="option-row">
      <span>${option.label}</span>
      <input type="checkbox" data-option="${option.key}" ${state.options[option.key] ? "checked" : ""} />
    </label>
  `).join("");
}

async function copyOutput() {
  if (!state.outputText) return;
  try {
    await navigator.clipboard.writeText(state.outputText);
    showToast(i18n("toast.copySuccess"));
  } catch {
    showToast(i18n("toast.copyFail"));
  }
}

function downloadText() {
  const blob = new Blob([state.outputText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "scenario_parsed_text.txt";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sendToSnippetTool() {
  const payload = {
    source: "scenario_pdf_parser",
    version: "0.2",
    text: state.outputText,
    preset: state.preset,
    options: state.options,
    exportedAt: new Date().toISOString(),
  };

  localStorage.setItem(BRIDGE_TEXT_KEY, state.outputText);
  localStorage.setItem(BRIDGE_PAYLOAD_KEY, JSON.stringify(payload));
  showToast(i18n("toast.bridge"));
  window.setTimeout(() => {
    window.location.href = SNIPPET_TOOL_URL;
  }, 700);
}

function replaceCurrent() {
  if (!state.searchTerm || !state.matches.length) return;
  const match = state.matches[Math.min(state.activeMatchIndex, state.matches.length - 1)];
  state.outputText = state.outputText.slice(0, match.index) + state.replaceTerm + state.outputText.slice(match.index + match.text.length);
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function replaceAll() {
  if (!state.searchTerm) return;
  const regex = new RegExp(escapeRegExp(state.searchTerm), "gi");
  state.outputText = state.outputText.replace(regex, state.replaceTerm);
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function resetReplace() {
  state.outputText = state.formattedText;
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function goMatch(direction) {
  if (!state.matches.length) return;
  state.activeMatchIndex = (state.activeMatchIndex + direction + state.matches.length) % state.matches.length;
  renderHighlightedOutput();
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("pdf.jsが読み込まれていません。");
  }

  const arrayBuffer = await file.arrayBuffer();
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join("\n");
    pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function handlePdfFile(file) {
  if (!file || file.type !== "application/pdf") {
    showToast(i18n("toast.pdfOnly"));
    return;
  }

  elements.fileStatus.textContent = `${i18n("file.loading")}${file.name}`;
  try {
    state.rawText = await extractTextFromPdf(file);
    elements.fileStatus.textContent = `${i18n("file.loaded")}${file.name}`;
    applyFormat();
    showToast(i18n("toast.pdfSuccess"));
  } catch (error) {
    console.error(error);
    elements.fileStatus.textContent = `${i18n("file.failed")}${file.name}`;
    showToast(i18n("toast.pdfFail"));
  }
}

function bindEvents() {
  elements.languageToggleBtn.addEventListener("click", () => {
    window.SCENARIO_PDF_PARSER_LANGUAGE?.toggleLanguage();
  });

  window.addEventListener("scenario-pdf-parser-language-change", () => {
    renderAll();
  });

  elements.formatBtn.addEventListener("click", applyFormat);
  elements.copyTopBtn.addEventListener("click", copyOutput);
  elements.copyBtn.addEventListener("click", copyOutput);
  elements.downloadBtn.addEventListener("click", downloadText);
  elements.sendSnippetBtn.addEventListener("click", sendToSnippetTool);

  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    state.activeMatchIndex = 0;
    renderHighlightedOutput();
  });

  elements.replaceInput.addEventListener("input", (event) => {
    state.replaceTerm = event.target.value;
  });

  elements.prevBtn.addEventListener("click", () => goMatch(-1));
  elements.nextBtn.addEventListener("click", () => goMatch(1));
  elements.replaceBtn.addEventListener("click", replaceCurrent);
  elements.replaceAllBtn.addEventListener("click", replaceAll);
  elements.resetReplaceBtn.addEventListener("click", resetReplace);

  elements.presetList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    state.preset = button.dataset.preset;
    applyFormat();
  });

  elements.optionList.addEventListener("change", (event) => {
    const input = event.target.closest("[data-option]");
    if (!input) return;
    state.options[input.dataset.option] = input.checked;
    applyFormat();
  });

  elements.pdfInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    handlePdfFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files?.[0];
    handlePdfFile(file);
  });
}

bindEvents();
applyFormat();
