/*
  main.js
  初期化・イベント登録・メイン操作
*/

const THEME_STORAGE_KEY = 'diceStatAnalystTheme';

const SESSION_LOG_TRANSFER_KEYS = [
  'trpg-web-tools:session-log-transfer',
  'trpgWebTools.sessionLogTransfer',
  'session-log-transfer',
  'sessionLogTransfer',
  'coc-growth-checker:session-log',
  'cocGrowthChecker.sessionLog',
  'cocGrowthChecker.sessionLogTransfer',
  'dice-stat-analyst:session-log',
  'diceStatAnalyst.sessionLogTransfer'
];

const SESSION_LOG_TRANSFER_KEY = SESSION_LOG_TRANSFER_KEYS[0];

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

  const importedSessionLog = importTransferredSessionLog();

  if (!importedSessionLog) {
    render();
  }
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

  const growthCheckerLink = $('growthCheckerLink') || document.querySelector('.growth-checker-link-button');
  if (growthCheckerLink) {
    growthCheckerLink.addEventListener('click', handleGrowthCheckerTransfer);
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


/* =========================================================
   Session Log Transfer
   成長チェッカー / ダイス解析間のログ受け渡し
   ========================================================= */

function buildSessionLogTransferPayload(source = 'dice-stat-analyst') {
  const rawInput = $('rawInput');
  const text = normalizeTransferredSessionLogText(rawInput ? String(rawInput.value || '') : '');

  return {
    type: 'session-log',
    source,
    tool: 'dice-stat-analyst',
    version: 'v1.373',
    text,
    createdAt: new Date().toISOString()
  };
}

function saveSessionLogTransferForGrowthChecker() {
  const payload = buildSessionLogTransferPayload('dice-stat-analyst');
  const serialized = JSON.stringify(payload);

  try {
    localStorage.setItem(SESSION_LOG_TRANSFER_KEY, serialized);
    localStorage.setItem('dice-stat-analyst:session-log', payload.text);
    localStorage.setItem('trpgWebTools.sessionLogTransfer', serialized);
  } catch (error) {
    console.warn('Failed to save session log transfer to localStorage.', error);
  }

  try {
    sessionStorage.setItem(SESSION_LOG_TRANSFER_KEY, serialized);
    sessionStorage.setItem('dice-stat-analyst:session-log', payload.text);
  } catch (error) {
    console.warn('Failed to save session log transfer to sessionStorage.', error);
  }
}

function handleGrowthCheckerTransfer(event) {
  saveSessionLogTransferForGrowthChecker();

  const link = event.currentTarget;
  if (!link) return;

  const baseUrl = 'https://kumachansteps.github.io/trpg-web-tools/tools/coc-growth-checker/';
  const transferUrl = `${baseUrl}?import=session-log&from=dice-stat-analyst&transfer=localStorage`;

  link.setAttribute('href', transferUrl);
}

function importTransferredSessionLog() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('import') !== 'session-log') {
    return false;
  }

  const transfer = params.get('transfer') || 'localStorage';
  const source = params.get('from') || '';
  const text = normalizeTransferredSessionLogText(readTransferredSessionLog(transfer));

  if (!text) {
    console.warn('Session log import was requested, but no transferred log was found.', { transfer, source });
    return false;
  }

  const rawInput = $('rawInput');
  if (!rawInput) return false;

  rawInput.value = text;
  state.inputPanelMode = 'auto';

  cleanupTransferredSessionLog(transfer);
  analyze();

  return true;
}

function readTransferredSessionLog(transfer = 'localStorage') {
  const stores = getTransferStores(transfer);

  for (const store of stores) {
    const text = readTransferredSessionLogFromStore(store);
    if (text) return text;
  }

  return '';
}

function getTransferStores(transfer = 'localStorage') {
  const stores = [];

  if (transfer === 'sessionStorage') {
    stores.push(sessionStorage, localStorage);
  } else if (transfer === 'localStorage') {
    stores.push(localStorage, sessionStorage);
  } else {
    stores.push(localStorage, sessionStorage);
  }

  return stores;
}

function readTransferredSessionLogFromStore(store) {
  if (!store) return '';

  for (const key of SESSION_LOG_TRANSFER_KEYS) {
    const value = safeStorageGet(store, key);
    const text = extractTransferredText(value);
    if (text) return text;
  }

  return scanStorageForTransferredSessionLog(store);
}

function scanStorageForTransferredSessionLog(store) {
  if (!store) return '';

  const keyPattern = /(session[-_:. ]?log|log[-_:. ]?transfer|sessionLog|transferLog|coc.*log|growth.*log|dice.*log|trpg.*log)/i;

  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (!key || !keyPattern.test(key)) continue;

    const value = safeStorageGet(store, key);
    const text = extractTransferredText(value);

    if (text) return text;
  }

  return '';
}

function extractTransferredText(value) {
  if (!value) return '';

  const raw = String(value);

  try {
    const data = JSON.parse(raw);
    const candidates = [
      data.text,
      data.log,
      data.rawLog,
      data.rawInput,
      data.sessionLog,
      data.session_log,
      data.value,
      data.content
    ];

    const found = candidates.find(item => typeof item === 'string' && item.trim().length > 0);
    if (found) return normalizeTransferredSessionLogText(found);
  } catch (_) {
    // Plain text transfer is also supported.
  }

  return raw.trim().length > 0 ? normalizeTransferredSessionLogText(raw) : '';
}

function normalizeTransferredSessionLogText(value) {
  let text = String(value || '');

  if (!text) return '';

  /*
    成長チェッカー ↔ ダイス統計アナライザー間でJSON/localStorage転送を繰り返した際、
    実改行が "\\n" / "\\\\n" のようなリテラル文字列として蓄積することがある。
    ここで転送時だけ実改行へ戻し、往復のたびにバックスラッシュが増える問題を防ぐ。
  */
  text = text
    .replace(/\\r\\n/g, LF)
    .replace(/\\n/g, LF)
    .replace(/\\r/g, LF)
    .replace(/\\{2,}r\\{2,}n/g, LF)
    .replace(/\\{2,}n/g, LF)
    .replace(/\\{2,}r/g, LF);

  // まれに「//n」として渡ったログも改行へ戻す。
  text = text
    .replace(/\/\/r\/\/n/g, LF)
    .replace(/\/\/n/g, LF)
    .replace(/\/\/r/g, LF);

  // HTMLエスケープされたバックスラッシュ表現にも対応。
  text = text
    .replace(/&#92;&#92;n/g, LF)
    .replace(/&bsol;&bsol;n/g, LF);

  return normalizeNewlines(text);
}

function cleanupTransferredSessionLog(transfer = 'localStorage') {
  const stores = getTransferStores(transfer);

  stores.forEach(store => {
    SESSION_LOG_TRANSFER_KEYS.forEach(key => {
      try {
        store.removeItem(key);
      } catch (_) {
        // ignore cleanup failures
      }
    });
  });
}

function safeStorageGet(store, key) {
  try {
    return store.getItem(key);
  } catch (error) {
    console.warn('Failed to read transferred log from storage.', { key, error });
    return '';
  }
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
