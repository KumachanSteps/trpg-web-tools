let editionMode = "auto";
let detectedEdition = "";

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
  const toast = document.getElementById("toastMessage");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
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

  if (mode === "auto") {
    handleInputChange();
    return;
  }

  setStatus(t("manualModePrefix") + editionLabel(mode) + t("manualModeSuffix"));
  const input = document.getElementById("input");
  if (input && input.value.trim()) {
    handleInputChange();
  }
}

function handleInputChange() {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);

  if (!extracted.text) {
    detectedEdition = "";
    if (output) output.value = "";
    if (editionMode === "auto") updateEditionToggleActive("auto");
    setStatus(t("initialStatus"));
    return;
  }

  const edition = getSelectedEdition(extracted.text);
  if (editionMode === "auto") {
    updateEditionToggleActive(edition);
  }

  if (output) {
    output.value = window.ChatPaletteParser.buildOutput(extracted.text, edition);
  }

  setStatus(t("detectPrefix") + editionLabel(edition) + t("detectSuffix"));
}

function getSelectedEdition(text) {
  if (editionMode === "6e" || editionMode === "7e") return editionMode;

  detectedEdition = window.ChatPaletteParser.detectEdition(text);
  return detectedEdition;
}

function formatPalette() {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);

  if (!extracted.text) {
    output.value = "";
    setStatus(t("extractError"), "error");
    return;
  }

  const edition = getSelectedEdition(extracted.text);

  if (editionMode === "auto") {
    updateEditionToggleActive(edition);
  }

  output.value = window.ChatPaletteParser.buildOutput(extracted.text, edition);
}

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
  detectedEdition = "";
  setEditionMode("auto");
  setStatus(t("cleared"));
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
      setStatus(t("copied"));
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
      setStatus(t("copied"));
      showToast("チャットパレットがコピーされました");
    } else {
      setStatus(t("copyManual"), "error");
    }
  } catch (error) {
    console.warn("Fallback copy failed.", error);
    setStatus(t("copyManual"), "error");
  }
}

async function pasteClipboardToInput() {
  const input = document.getElementById("input");
  if (!input) return;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      input.value = await navigator.clipboard.readText();
      input.focus();
      handleInputChange();
    }
  } catch (error) {
    console.warn("Clipboard paste failed.", error);
    input.focus();
    setStatus("ブラウザの制限により自動ペーストできませんでした。手動で貼り付けてください。", "error");
  }
}

function handleGlobalShortcuts(event) {
  const hasCmdOrCtrl = event.metaKey || event.ctrlKey;

  if (event.key === "Escape") {
    event.preventDefault();
    clearAll();
    return;
  }

  if (hasCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteClipboardToInput();
    return;
  }

  if (hasCmdOrCtrl && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyOutput();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("input", handleInputChange);
  document.getElementById("formatButton").addEventListener("click", formatPalette);
  document.getElementById("copyButton").addEventListener("click", copyOutput);
  document.getElementById("clearButton").addEventListener("click", clearAll);

  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.addEventListener("click", () => {
      setEditionMode(button.dataset.edition);
    });
  });

  document.addEventListener("keydown", handleGlobalShortcuts);

  setStatus(t("initialStatus"));
});
