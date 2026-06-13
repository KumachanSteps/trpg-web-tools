function openHowtoDrawer(){
  const drawer = document.getElementById("howtoDrawer");
  const button = document.getElementById("howtoHelpBtn");
  if (!drawer) return;
  closeShortcutDrawer?.();
  closeHowtoDrawer?.();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  button?.setAttribute("aria-expanded", "true");
}

function closeHowtoDrawer(){
  const drawer = document.getElementById("howtoDrawer");
  const button = document.getElementById("howtoHelpBtn");
  if (!drawer) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  button?.setAttribute("aria-expanded", "false");
}

function toggleHowtoDrawer(){
  const drawer = document.getElementById("howtoDrawer");
  if (!drawer) return;
  drawer.classList.contains("open") ? closeHowtoDrawer() : openHowtoDrawer();
}

function openShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  const button = document.getElementById("shortcutHelpBtn");
  if (!drawer) return;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  button?.setAttribute("aria-expanded", "true");
}

function closeShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  const button = document.getElementById("shortcutHelpBtn");
  if (!drawer) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  button?.setAttribute("aria-expanded", "false");
}

function toggleShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  if (!drawer) return;
  drawer.classList.contains("open") ? closeShortcutDrawer() : openShortcutDrawer();
}

function enterScreenshotMode(){ document.body.classList.add("screenshot-mode"); }
function exitScreenshotMode(){ document.body.classList.remove("screenshot-mode"); }

function setRuleMode(mode){
  const input = document.querySelector(`input[name="ruleMode"][value="${mode}"]`);
  if (!input) return;
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles:true }));
  if (typeof renderSummaryText === "function") renderSummaryText();
}

function isTypingInEditableField(){
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName ? active.tagName.toLowerCase() : "";
  return tagName === "input" || tagName === "textarea" || tagName === "select" || active.isContentEditable;
}

function handleGlobalKeydown(event){
  const key = String(event.key || "").toLowerCase();
  const isCommand = event.ctrlKey || event.metaKey;
  const isCommandShift = isCommand && event.shiftKey;

  if (event.key === "Escape") {
    if (document.getElementById("howtoDrawer")?.classList.contains("open")) {
      event.preventDefault();
      closeHowtoDrawer();
      return;
    }
    if (document.getElementById("shortcutDrawer")?.classList.contains("open")) {
      event.preventDefault();
      closeShortcutDrawer();
      return;
    }
    if (document.body.classList.contains("screenshot-mode")) {
      event.preventDefault();
      exitScreenshotMode();
      return;
    }
  }

  if (isCommandShift && key === "o") {
    event.preventDefault();
    document.getElementById("fileInput")?.click();
    return;
  }

  if (isCommandShift && key === "i") {
    event.preventDefault();
    if (typeof toggleInputPanel === "function") toggleInputPanel();
    return;
  }

  if (isCommandShift && key === "s") {
    event.preventDefault();
    toggleShortcutDrawer();
    return;
  }

  if (isCommandShift && key === "t") {
    event.preventDefault();
    if (typeof toggleTheme === "function") toggleTheme();
    return;
  }

  if (isCommandShift && key === "v") {
    event.preventDefault();
    document.body.classList.contains("screenshot-mode") ? exitScreenshotMode() : enterScreenshotMode();
    return;
  }

  if (isCommandShift && key === "c") {
    event.preventDefault();
    if (typeof copySummary === "function") copySummary();
    return;
  }

  if (isCommand && !event.shiftKey && event.key === "Backspace") {
    event.preventDefault();
    const confirmed = window.confirm(typeof t === "function" ? t("confirm.clear") : "入力内容と抽出結果をクリアします。よろしいですか？");
    if (confirmed && typeof clearAll === "function") clearAll();
    return;
  }

  if (isCommand && !event.shiftKey && ["1", "2", "3", "4"].includes(key) && !isTypingInEditableField()) {
    event.preventDefault();
    const modes = {
      "1": "rulebook",
      "2": "critFumble",
      "3": "both",
      "4": "bothPrime"
    };
    setRuleMode(modes[key]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("howtoHelpBtn")?.addEventListener("click", toggleHowtoDrawer);
  document.getElementById("howtoDrawerCloseBtn")?.addEventListener("click", closeHowtoDrawer);
  document.getElementById("shortcutHelpBtn")?.addEventListener("click", toggleShortcutDrawer);
  document.getElementById("shortcutDrawerCloseBtn")?.addEventListener("click", closeShortcutDrawer);
});

document.addEventListener("keydown", handleGlobalKeydown);
