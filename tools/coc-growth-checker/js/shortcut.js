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
  const isAltOnly = event.altKey && !event.ctrlKey && !event.metaKey;

  if (event.key === "Escape") {
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

  if (event.key === "?" && !isCommand && !event.altKey && !isTypingInEditableField()) {
    event.preventDefault();
    openShortcutDrawer();
    return;
  }

  if ((isAltOnly || isCommandShift) && key === "o") {
    event.preventDefault();
    document.getElementById("fileInput")?.click();
    return;
  }

  if (isCommand && event.key === "Enter") {
    event.preventDefault();
    analyze?.();
    return;
  }

  if (isCommand && !event.shiftKey && key === "l") {
    event.preventDefault();
    document.getElementById("rawInput")?.focus();
    return;
  }

  if (isCommandShift && key === "i") {
    event.preventDefault();
    toggleInputPanel?.();
    return;
  }

  if ((isAltOnly || isCommandShift) && key === "t") {
    event.preventDefault();
    toggleTheme?.();
    return;
  }

  if ((isAltOnly || isCommandShift) && (key === "s" || key === "v")) {
    event.preventDefault();
    document.body.classList.contains("screenshot-mode") ? exitScreenshotMode() : enterScreenshotMode();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("shortcutHelpBtn")?.addEventListener("click", toggleShortcutDrawer);
  document.getElementById("shortcutDrawerCloseBtn")?.addEventListener("click", closeShortcutDrawer);
});

document.addEventListener("keydown", handleGlobalKeydown);
