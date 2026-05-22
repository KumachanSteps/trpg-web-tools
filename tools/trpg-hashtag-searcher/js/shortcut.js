window.HASHTAG_SHORTCUTS = (() => {
  function setupShortcuts(handlers) {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") { handlers.closeShortcutPanel?.(); return; }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); handlers.toggleShortcutPanel?.(); return; }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") { event.preventDefault(); handlers.openGeneratedQuery?.(); return; }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "c") { event.preventDefault(); handlers.copyGeneratedQuery?.(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }
  return { setupShortcuts };
})();
