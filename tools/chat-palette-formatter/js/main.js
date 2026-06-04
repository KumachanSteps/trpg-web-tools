let editionMode = "auto";
let detectedEdition = "";
let autoFormatTimer = null;
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

function ensureToastElement() {
  let toast = document.getElementById("toastMessage");
  if (toast) return toast;

  toast = document.createElement("div");
  toast.id = "toastMessage";
  toast.className = "toast-message";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  return toast;
}

function showToast(message) {
  const toast = ensureToastElement();
  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function updateEditionToggleActive(mode) {
  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.classList.toggle("active", button.dataset.edition === mode);
  });
}

function setEditionMode(mode) {
  editionMode = mode;
  updateEditionToggleActive(mode);

  const input = document.getElementById("input");
  if (input && input.value.trim()) {
    autoFormatPalette({ showError: false });
    return;
  }

  if (mode === "auto") {
    handleInputChange();
    return;
  }

  setStatus(t("manualModePrefix") + editionLabel(mode) + t("manualModeSuffix"));
}

function handleInputChange() {
  window.clearTimeout(autoFormatTimer);
  autoFormatTimer = window.setTimeout(() => {
    autoFormatPalette({ showError: false });
  }, 80);
}

function getSelectedEdition(text) {
  if (editionMode === "6e" || editionMode === "7e") return editionMode;

  detectedEdition = window.ChatPaletteParser.detectEdition(text);
  return detectedEdition;
}

function autoFormatPalette(options = {}) {
  const { showError = false } = options;
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  if (!input || !output) return;

  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);

  if (!extracted.text) {
    output.value = "";
    detectedEdition = "";
    updateEditionToggleActive(editionMode === "auto" ? "auto" : editionMode);
    setStatus(showError ? t("extractError") : t("initialStatus"), showError ? "error" : undefined);
    return;
  }

  const edition = getSelectedEdition(extracted.text);

  if (editionMode === "auto") {
    updateEditionToggleActive(edition);
  }

  output.value = window.ChatPaletteParser.buildOutput(extracted.text, edition);
  setStatus(t("detectPrefix") + editionLabel(edition) + t("detectSuffix"));
}

function formatPalette() {
  autoFormatPalette({ showError: true });
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

async function pasteClipboardToInput() {
  const input = document.getElementById("input");
  if (!input) return;

  try {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
      setStatus("ブラウザの制限によりクリップボードを読み取れませんでした。手動で貼り付けてください。", "error");
      input.focus();
      return;
    }

    const text = await navigator.clipboard.readText();
    input.value = text;
    input.focus();
    handleInputChange();
  } catch (error) {
    console.warn("Clipboard paste failed.", error);
    setStatus("ブラウザの制限によりクリップボードを読み取れませんでした。手動で貼り付けてください。", "error");
    input.focus();
  }
}

async function copyOutput() {
  const output = document.getElementById("output");

  if (!output.value) {
    setStatus(t("copyEmpty"), "error");
    return;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(output.value);
      showToast("チャットパレットがコピーされました");
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
      showToast("チャットパレットがコピーされました");
    } else {
      setStatus(t("copyManual"), "error");
    }
  } catch (error) {
    console.warn("Fallback copy failed.", error);
    setStatus(t("copyManual"), "error");
  }
}

function isShortcutModifierPressed(event) {
  return event.metaKey || event.ctrlKey;
}

function handleGlobalShortcuts(event) {
  const key = event.key.toLowerCase();

  if (event.key === "Escape") {
    event.preventDefault();
    clearAll();
    return;
  }

  if (!isShortcutModifierPressed(event) || !event.shiftKey) return;

  if (key === "v") {
    event.preventDefault();
    pasteClipboardToInput();
    return;
  }

  if (key === "c") {
    event.preventDefault();
    copyOutput();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("input", handleInputChange);
  document.getElementById("formatButton").addEventListener("click", formatPalette);
  document.getElementById("copyButton").addEventListener("click", copyOutput);
  document.getElementById("clearButton").addEventListener("click", clearAll);
  document.addEventListener("keydown", handleGlobalShortcuts);

  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.addEventListener("click", () => {
      setEditionMode(button.dataset.edition);
    });
  });

  setStatus(t("initialStatus"));
});
