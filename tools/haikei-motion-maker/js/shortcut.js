(() => {
  'use strict';

  const CODE_ACTIONS = {
    KeyO: 'openFile',
    KeyP: 'togglePlay',
    KeyA: 'exportWebp60',
    KeyF: 'exportWebp30',
    KeyW: 'exportWebp',
    KeyT: 'toggleTheme'
  };

  function getApi() {
    return window.HaikeiMotionMaker || globalThis.HaikeiMotionMaker || null;
  }

  function getDrawerElements() {
    return [
      document.getElementById('helpDrawer'),
      document.getElementById('shortcutDrawer')
    ].filter(Boolean);
  }

  function isAnyDrawerOpen() {
    return getDrawerElements().some(drawer => !drawer.hidden);
  }

  function closeDrawersFallback() {
    getDrawerElements().forEach(drawer => {
      drawer.hidden = true;
    });
  }

  function hasShortcutModifier(event) {
    return event.shiftKey && (event.metaKey || event.ctrlKey || event.altKey);
  }

  function runAction(actionName) {
    const api = getApi();
    const fn = api?.[actionName];
    if (typeof fn !== 'function') return false;
    const result = fn() !== false;
    if (result) {
      window.ToolAnalytics?.sendFeature('keyboard_shortcut', 'keyboard_shortcut', 'execute', actionName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
    }
    return result;
  }

  document.addEventListener('keydown', event => {
    const api = getApi();

    if (event.key === 'Escape' || event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (isAnyDrawerOpen() || api?.isDrawerOpen?.()) {
        if (typeof api?.closeDrawers === 'function') {
          api.closeDrawers();
        }
        closeDrawersFallback();
        window.ToolAnalytics?.sendFeature('keyboard_shortcut', 'keyboard_shortcut', 'execute', 'close_drawer');
      } else if (typeof api?.resetImage === 'function') {
        api.resetImage();
        window.ToolAnalytics?.sendFeature('keyboard_shortcut', 'keyboard_shortcut', 'execute', 'reset');
      } else if (typeof api?.clearOutputDisplay === 'function') {
        api.clearOutputDisplay();
      }
      return;
    }

    if (!hasShortcutModifier(event)) return;

    const actionName = CODE_ACTIONS[event.code];
    if (!actionName) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    runAction(actionName);
  }, true);
})();
