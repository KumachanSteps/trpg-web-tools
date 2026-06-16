(() => {
  'use strict';

  const CODE_ACTIONS = {
    KeyO: 'openFile',
    KeyP: 'togglePlay',
    KeyA: 'exportApng',
    KeyZ: 'exportPngZip',
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
    return fn() !== false;
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
      } else if (typeof api?.resetImage === 'function') {
        api.resetImage();
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
