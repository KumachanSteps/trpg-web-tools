function isTypingInEditableField(){
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName ? active.tagName.toLowerCase() : "";
  return tag === "input" || tag === "textarea" || tag === "select" || active.isContentEditable;
}
function openShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  const btn = document.getElementById("shortcutHelpBtn");
  drawer?.classList.add("open");
  drawer?.setAttribute("aria-hidden", "false");
  btn?.setAttribute("aria-expanded", "true");
}
function closeShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  const btn = document.getElementById("shortcutHelpBtn");
  drawer?.classList.remove("open");
  drawer?.setAttribute("aria-hidden", "true");
  btn?.setAttribute("aria-expanded", "false");
}
function toggleShortcutDrawer(){
  const drawer = document.getElementById("shortcutDrawer");
  if (drawer?.classList.contains("open")) closeShortcutDrawer(); else openShortcutDrawer();
}
function handleGlobalKeydown(event){
  const key = String(event.key || "").toLowerCase();
  const isCommand = event.ctrlKey || event.metaKey;
  const isCommandShift = isCommand && event.shiftKey;
  const isAltOnly = event.altKey && !event.ctrlKey && !event.metaKey;
  if (event.key === "Escape") {
    event.preventDefault();
    if (document.body.classList.contains("screenshot-mode")) exitScreenshotMode();
    closeShortcutDrawer();
    return;
  }
  if (event.key === "?" && !isCommand && !event.altKey && !isTypingInEditableField()) { event.preventDefault(); openShortcutDrawer(); return; }
  if ((isAltOnly || isCommandShift) && key === "o") { event.preventDefault(); document.getElementById("fileInput")?.click(); return; }
  if (isCommand && event.key === "Enter") { event.preventDefault(); analyze(); return; }
  if (isCommand && !event.shiftKey && key === "l") { event.preventDefault(); document.getElementById("rawInput")?.focus(); return; }
  if (isCommandShift && key === "i") { event.preventDefault(); toggleInputPanel(); return; }
  if (isCommandShift && key === "t") { event.preventDefault(); toggleTheme(); return; }
  if (isCommandShift && (key === "v" || key === "s")) { event.preventDefault(); document.body.classList.contains("screenshot-mode") ? exitScreenshotMode() : enterScreenshotMode(); }
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("shortcutHelpBtn")?.addEventListener("click", toggleShortcutDrawer);
  document.getElementById("shortcutDrawerCloseBtn")?.addEventListener("click", closeShortcutDrawer);
  document.addEventListener("keydown", handleGlobalKeydown);
});
