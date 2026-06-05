let editionMode = "auto";
let detectedEdition = "";
let toastTimer = null;

function t(key) {
  return window.ChatPaletteLanguage?.t(key) || key;
}

function editionLabel(edition) {
  return edition === "6e" ? t("edition6") : t("edition7");
}

function setStatus(message, type) {
  const status = document.getElementById("statusMessage");
  if (!status) return;
  status.textContent = message;
  status.style.color = type === "error" ? "#9f3a3a" : "#526b86";
  status.style.background = type === "error" ? "rgba(255, 245, 245, 0.78)" : "rgba(255,255,255,0.68)";
  status.style.borderColor = type === "error" ? "rgba(190, 70, 70, 0.35)" : "rgba(180, 197, 216, 0.58)";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function updateEditionToggleActive(mode) {
  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.classList.toggle("active", button.dataset.edition === mode);
  });
}

function setEditionMode(mode) {
  editionMode = mode;
  updateEditionToggleActive(mode);
  if (mode === "auto") {
    handleInputChange({ autoFormat: true });
    return;
  }
  setStatus(t("manualModePrefix") + editionLabel(mode) + t("manualModeSuffix"));
  autoFormatCurrentInput();
}

function getInputText() {
  const input = document.getElementById("input");
  return input ? input.value : "";
}

function setInputText(value) {
  const input = document.getElementById("input");
  if (input) input.value = value;
}

function handleInputChange(options = {}) {
  const shouldAutoFormat = options.autoFormat !== false;
  if (editionMode !== "auto" && shouldAutoFormat) {
    autoFormatCurrentInput();
    return;
  }

  const extracted = window.ChatPaletteParser.extractPaletteText(getInputText());
  if (!extracted.text) {
    detectedEdition = "";
    const output = document.getElementById("output");
    if (output && shouldAutoFormat) output.value = "";
    setStatus(t("initialStatus"));
    return;
  }

  detectedEdition = window.ChatPaletteParser.detectEdition(extracted.text);
  setStatus(t("detectPrefix") + editionLabel(detectedEdition) + t("detectSuffix"));

  if (shouldAutoFormat) {
    formatPalette({ silent: true });
  }
}

function getSelectedEdition(text) {
  if (editionMode === "6e" || editionMode === "7e") return editionMode;
  detectedEdition = window.ChatPaletteParser.detectEdition(text);
  return detectedEdition;
}

function autoFormatCurrentInput() {
  formatPalette({ silent: true });
}

function formatPalette(options = {}) {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  if (!input || !output) return;

  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);
  if (!extracted.text) {
    output.value = "";
    if (!options.silent) setStatus(t("extractError"), "error");
    return;
  }

  const edition = getSelectedEdition(extracted.text);
  if (editionMode === "auto") updateEditionToggleActive(edition);
  output.value = window.ChatPaletteParser.buildOutput(extracted.text, edition);
}

function clearAll() {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  if (input) input.value = "";
  if (output) output.value = "";
  detectedEdition = "";
  editionMode = "auto";
  updateEditionToggleActive("auto");
  setStatus(t("cleared"));
}

async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") throw new Error("Clipboard readText is unavailable.");
    const text = await navigator.clipboard.readText();
    setInputText(text);
    handleInputChange({ autoFormat: true });
  } catch (error) {
    console.warn("Clipboard paste failed.", error);
    setStatus(t("pasteFailed"), "error");
    const input = document.getElementById("input");
    if (input) input.focus();
  }
}

async function copyOutput() {
  const output = document.getElementById("output");
  if (!output || !output.value) {
    setStatus(t("copyEmpty"), "error");
    return;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(output.value);
      setStatus(t("copied"));
      showToast(t("copyToast"));
      return;
    }
  } catch (error) {
    console.warn("Clipboard API copy failed. Falling back to document.execCommand.", error);
  }

  fallbackCopy(output);
}

function fallbackCopy(output) {
  output.focus();
  output.select();
  try {
    const success = document.execCommand("copy");
    if (success) {
      setStatus(t("copied"));
      showToast(t("copyToast"));
    } else {
      setStatus(t("copyManual"), "error");
    }
  } catch (error) {
    console.warn("Fallback copy failed.", error);
    setStatus(t("copyManual"), "error");
  }
}

function handleShortcut(event) {
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  if (event.key === "Escape") {
    event.preventDefault();
    clearAll();
    return;
  }

  if (mod && event.shiftKey && key === "v") {
    event.preventDefault();
    pasteFromClipboard();
    return;
  }

  if (mod && event.shiftKey && key === "c") {
    event.preventDefault();
    copyOutput();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const formatButton = document.getElementById("formatButton");
  const copyButton = document.getElementById("copyButton");
  const clearButton = document.getElementById("clearButton");

  input?.addEventListener("input", () => handleInputChange({ autoFormat: true }));
  input?.addEventListener("paste", () => setTimeout(() => handleInputChange({ autoFormat: true }), 0));
  formatButton?.addEventListener("click", () => formatPalette({ silent: false }));
  copyButton?.addEventListener("click", copyOutput);
  clearButton?.addEventListener("click", clearAll);

  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.addEventListener("click", () => setEditionMode(button.dataset.edition));
  });

  document.addEventListener("keydown", handleShortcut);
  setStatus(t("initialStatus"));
});
