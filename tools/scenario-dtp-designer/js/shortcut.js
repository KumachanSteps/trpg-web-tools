/* Scenario DTP Designer v1.2 - shortcut.js */
(function () {
  'use strict';
  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }
  function withApp(action) { if (window.ScenarioDtp) action(window.ScenarioDtp); }
  window.addEventListener('keydown', (ev) => {
    const mod = ev.ctrlKey || ev.metaKey;
    const key = ev.key.toLowerCase();
    if (ev.key === 'Escape') { withApp((app) => { app.closePanels(); app.clearSelection(); }); return; }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && !isTypingTarget(ev.target)) { ev.preventDefault(); withApp((app) => app.deleteSelected()); return; }
    if (!mod) return;
    if (key === 's') { ev.preventDefault(); withApp((app) => app.triggerSave()); return; }
    if (key === 'o') { ev.preventDefault(); withApp((app) => app.triggerJsonLoad()); return; }
    if (key === 'z' && ev.shiftKey) { ev.preventDefault(); withApp((app) => app.redo()); return; }
    if (key === 'z') { ev.preventDefault(); withApp((app) => app.undo()); return; }
    if (key === 'y' && ev.ctrlKey) { ev.preventDefault(); withApp((app) => app.redo()); return; }
    if (ev.shiftKey && key === 'p') { ev.preventDefault(); withApp((app) => app.triggerPdf()); return; }
    if (ev.shiftKey && key === 'e') { ev.preventDefault(); withApp((app) => app.triggerPng()); return; }
    if (ev.shiftKey && key === 'i') { ev.preventDefault(); withApp((app) => app.triggerImage()); }
  });
}());
