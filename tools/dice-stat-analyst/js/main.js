/*
  main.js
  初期化・イベント登録・メイン操作
*/

const THEME_STORAGE_KEY = 'diceStatAnalystTheme';

const state = {
  rolls: [],
  filteredLines: [],
  hiddenCharacters: new Set(),
  sort: { key: 'index', direction: 'asc' },
  showCharacterControls: false,
  inputPanelMode: 'auto',
  dark: localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
  bindEvents();
  syncThemeSwitch();
  initializeLanguageUI();

  if (typeof applyTranslations === 'function') {
    applyTranslations();
  }

  render();
}

function bindEvents() {
  const themeToggleBtn = $('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  const languageToggleBtn = $('languageToggleBtn') || $('langToggleBtn');
  if (languageToggleBtn) {
    languageToggleBtn.addEventListener('click', toggleLanguage);
  }

  const howToBtn = $('howToBtn');
  const howToPanelCloseBtn = $('howToPanelCloseBtn');
  if (howToBtn) {
    howToBtn.addEventListener('click', () => toggleHeaderSlidePanel('howto'));
  }
  if (howToPanelCloseBtn) {
    howToPanelCloseBtn.addEventListener('click', closeHeaderSlidePanels);
  }

  const shortcutHelpBtn = $('shortcutHelpBtn');
  const shortcutPanelCloseBtn = $('shortcutPanelCloseBtn');
  const shortcutModalCloseBtn = $('shortcutModalCloseBtn');
  const shortcutModalBackdrop = $('shortcutModalBackdrop');

  if (shortcutHelpBtn) {
    shortcutHelpBtn.addEventListener('click', () => toggleHeaderSlidePanel('shortcut'));
  }

  if (shortcutPanelCloseBtn) {
    shortcutPanelCloseBtn.addEventListener('click', closeHeaderSlidePanels);
  }

  /* legacy modal close hooks remain harmless if old modal markup still exists */
  if (shortcutModalCloseBtn) {
    shortcutModalCloseBtn.addEventListener('click', closeHeaderSlidePanels);
  }

  if (shortcutModalBackdrop) {
    shortcutModalBackdrop.addEventListener('click', closeHeaderSlidePanels);
  }

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => switchTab(button));
  });

  document.querySelectorAll('button[data-sort-key]').forEach(button => {
    button.addEventListener('click', () => toggleSort(button.dataset.sortKey));
  });

  const fileInput = $('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileInput);
  }

  const inputToggleBtn = $('inputToggleBtn');
  if (inputToggleBtn) {
    inputToggleBtn.addEventListener('click', toggleInputPanel);
  }

  const characterControlToggleBtn = $('characterControlToggleBtn');
  if (characterControlToggleBtn) {
    characterControlToggleBtn.addEventListener('click', () => {
      state.showCharacterControls = !state.showCharacterControls;
      renderCharacterControls();
    });
  }

  const summaryShotBtn = $('summaryShotBtn');
  if (summaryShotBtn) {
    summaryShotBtn.addEventListener('click', enterScreenshotMode);
  }
const screenshotExitBtn = $('screenshotExitBtn');
  if (screenshotExitBtn) {
    screenshotExitBtn.addEventListener('click', exitScreenshotMode);
  }

  document.addEventListener('keydown', handleGlobalKeydown);

  const analyzeBtn = $('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyze);
  }

  const clearBtn = $('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }

  document.addEventListener('click', handleDocumentPointerClosePanels);

  document.addEventListener('languagechange', () => {
    initializeLanguageUI();
    syncThemeSwitch();
    render();
  });
}


function handleDocumentPointerClosePanels(event) {
  if (!isHeaderSlidePanelOpen()) return;

  const shell = $('headerSlidePanels');
  const header = document.querySelector('.site-header');
  const button = event.target.closest('#howToBtn, #shortcutHelpBtn');

  if (button) return;
  if (shell && shell.contains(event.target)) return;
  if (header && header.contains(event.target)) return;

  closeHeaderSlidePanels();
}

async function handleFileInput(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const rawInput = $('rawInput');
  if (!rawInput) return;

  rawInput.value = await file.text();
  state.inputPanelMode = 'auto';
  analyze();
}

function toggleInputPanel() {
  const collapsed = $('appLayout').classList.contains('input-collapsed');
  state.inputPanelMode = collapsed ? 'open' : 'collapsed';
  applyInputPanelLayout();
}

function clearAll() {
  const fileInput = $('fileInput');
  const rawInput = $('rawInput');

  if (fileInput) fileInput.value = '';
  if (rawInput) rawInput.value = '';
  state.rolls = [];
  state.filteredLines = [];
  state.hiddenCharacters = new Set();
  state.showCharacterControls = false;
  state.inputPanelMode = 'auto';
  render();
}

function toggleTheme() {
  state.dark = !state.dark;
  localStorage.setItem(THEME_STORAGE_KEY, state.dark ? 'dark' : 'light');
  syncThemeSwitch();
}

function syncThemeSwitch() {
  document.body.classList.toggle('dark', state.dark);

  const button = $('themeToggleBtn');
  if (!button) return;

  const title = state.dark
    ? tr('theme.switchToLight', 'ライトモードに切替')
    : tr('theme.switchToDark', 'ナイトモードに切替');

  button.setAttribute('aria-pressed', state.dark ? 'true' : 'false');
  button.setAttribute('title', title);
  button.setAttribute('aria-label', title);
}


function autoSetThresholdByDominantLogSystem(lines) {
  const counts = countCocCommandTypes(lines);
  const critMax = $('critMax');
  const fumbleMin = $('fumbleMin');

  if (!critMax || !fumbleMin) return;
  if (counts.ccb === 0 && counts.cc === 0) return;

  if (counts.ccb > counts.cc) {
    critMax.value = '5';
    fumbleMin.value = '96';
    return;
  }

  critMax.value = '1';
  fumbleMin.value = '100';
}

function countCocCommandTypes(lines) {
  const counts = { ccb: 0, cc: 0 };

  (lines || []).forEach(line => {
    const text = String(line || '').toUpperCase();

    // CCB/SCCB are treated as CoC 6th style.
    const ccbMatches = text.match(/(^|[^A-Z0-9])S?CCB\d*(?=[^A-Z0-9]|$|<=|<|＞|>)/g);
    if (ccbMatches) counts.ccb += ccbMatches.length;

    // CC/SCC, but not CCB/SCCB/CBR/SCBR, are treated as CoC 7th style.
    const ccMatches = text.match(/(^|[^A-Z0-9])S?CC\d*(?=[^A-Z0-9]|$|<=|<|＞|>)/g);
    if (ccMatches) counts.cc += ccMatches.length;
  });

  return counts;
}

function analyze() {
  state.inputPanelMode = 'auto';

  const rawInput = $('rawInput');
  if (!rawInput) return;

  const lines = normalizeNewlines(prepareText(rawInput.value || ''))
    .split(LF)
    .map(cleanLine)
    .filter(Boolean);

  autoSetThresholdByDominantLogSystem(lines);

  const filtered = filterLines(lines);
  const rolls = extractRollData(filtered);

  state.filteredLines = filtered;
  state.rolls = rolls;

  applyDefaultCharacterVisibility(rolls);
  render();
}

/* =========================================================
   Language UI
   ========================================================= */

function initializeLanguageUI() {
  updateLanguageToggleLabel();
}

function toggleLanguage() {
  if (typeof getCurrentLanguage !== 'function' || typeof setLanguage !== 'function') {
    console.warn('Language functions are not loaded yet.');
    return;
  }

  const current = getCurrentLanguage();
  const next = current === 'ja' ? 'en' : 'ja';

  setLanguage(next);
}

function updateLanguageToggleLabel() {
  const button = $('languageToggleBtn') || $('langToggleBtn');
  if (!button) return;

  let current = 'ja';

  if (typeof getCurrentLanguage === 'function') {
    current = getCurrentLanguage();
  }

  button.textContent = 'JP/EN';

  const label = current === 'ja'
    ? tr('language.switchToEnglish', '英語表示に切替')
    : tr('language.switchToJapanese', '日本語表示に切替');

  button.setAttribute('title', label);
  button.setAttribute('aria-label', label);
}

/* =========================================================
   Header Slide Panels
   ========================================================= */

function getHeaderSlidePanels() {
  return {
    howto: $('howToSlidePanel'),
    shortcut: $('shortcutSlidePanel')
  };
}

function updateHeaderPanelButtonState(activePanel) {
  const howToBtn = $('howToBtn');
  const shortcutHelpBtn = $('shortcutHelpBtn');

  if (howToBtn) {
    const isOpen = activePanel === 'howto';
    howToBtn.classList.toggle('is-active', isOpen);
    howToBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (shortcutHelpBtn) {
    const isOpen = activePanel === 'shortcut';
    shortcutHelpBtn.classList.toggle('is-active', isOpen);
    shortcutHelpBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

function openHeaderSlidePanel(panelName) {
  const panels = getHeaderSlidePanels();
  let hasOpen = false;

  Object.entries(panels).forEach(([name, panel]) => {
    if (!panel) return;

    const shouldOpen = name === panelName;
    panel.classList.toggle('open', shouldOpen);
    panel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    if (shouldOpen) hasOpen = true;
  });

  document.body.classList.toggle('header-panel-open', hasOpen);
  updateHeaderPanelButtonState(hasOpen ? panelName : '');
}

function closeHeaderSlidePanels() {
  const panels = getHeaderSlidePanels();

  Object.values(panels).forEach(panel => {
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  });

  document.body.classList.remove('header-panel-open');
  updateHeaderPanelButtonState('');
}

function toggleHeaderSlidePanel(panelName) {
  const panels = getHeaderSlidePanels();
  const panel = panels[panelName];
  if (!panel) return;

  if (panel.classList.contains('open')) {
    closeHeaderSlidePanels();
    return;
  }

  openHeaderSlidePanel(panelName);
}

function openShortcutModal() {
  openHeaderSlidePanel('shortcut');
}

function closeShortcutModal() {
  closeHeaderSlidePanels();
}

function isShortcutModalOpen() {
  return isHeaderSlidePanelOpen();
}

function isHeaderSlidePanelOpen() {
  const panels = getHeaderSlidePanels();
  return Object.values(panels).some(panel => !!panel && panel.classList.contains('open'));
}
