(() => {
  'use strict';

  const LANGUAGE_STORAGE_KEY = 'charaSabunLanguage';
  const LANGUAGES = ['ja', 'en', 'ko'];
  let currentLanguage = window.CHARA_SABUN_I18N?.[localStorage.getItem(LANGUAGE_STORAGE_KEY)]
    ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
    : 'ja';

  function t(key, vars = {}, fallback = '') {
    if (!vars || typeof vars !== 'object') {
      fallback = String(vars || '');
      vars = {};
    }
    const value = window.CHARA_SABUN_I18N?.[currentLanguage]?.[key]
      ?? window.CHARA_SABUN_I18N?.ja?.[key]
      ?? fallback
      ?? key;
    return String(value).replace(/\{(\w+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`);
  }

  function applyTranslations() {
    document.documentElement.lang = currentLanguage;
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    for (const [attribute, datasetKey] of [['placeholder', 'i18nPlaceholder'], ['aria-label', 'i18nAriaLabel'], ['alt', 'i18nAlt'], ['content', 'i18nContent']]) {
      document.querySelectorAll(`[data-${datasetKey.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}]`).forEach(el => el.setAttribute(attribute, t(el.dataset[datasetKey])));
    }
    els.languageButtons.forEach(button => {
      const active = button.dataset.language === currentLanguage;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderSuggestions();
    renderThumbnails();
    updateLargePreview();
  }

  function setLanguage(language) {
    if (!LANGUAGES.includes(language)) return;
    currentLanguage = language;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    applyTranslations();
  }

  const SUGGESTIONS = [
    { label: '通常', value: '通常' },
    { label: '笑顔', value: '笑顔' },
    { label: '怒り', value: '怒り' },
    { label: '泣き', value: '泣き' },
    { label: '驚き', value: '驚き' },
    { label: '困惑', value: '困惑' },
    { label: '照れ', value: '照れ' },
    { label: '焦り', value: '焦り' },
    { label: '微笑', value: '微笑' },
    { label: '真剣', value: '真剣' },
    { label: '悲哀', value: '悲哀' },
    { label: '喜び', value: '喜び' },
    { label: '呆れ', value: '呆れ' },
    { label: '疑問', value: '疑問' },
    { label: '媚び', value: '媚び' },
    { label: '不安', value: '不安' },
    { label: '目閉じ', value: '目閉じ' },
    { label: 'ジト目', value: 'ジト目' },
    { label: 'ウィンク', value: 'ウィンク' },
    { label: '負傷', value: '負傷' },
    { label: '戦闘', value: '戦闘' },
    { label: '発狂', value: '発狂' },
    { label: '絶望', value: '絶望' }
  ];
  const SUGGESTION_LABELS = {
    en: { 通常:'Normal', 笑顔:'Smile', 怒り:'Angry', 泣き:'Crying', 驚き:'Surprised', 困惑:'Confused', 照れ:'Blushing', 焦り:'Flustered', 微笑:'Gentle smile', 真剣:'Serious', 悲哀:'Sorrow', 喜び:'Joy', 呆れ:'Exasperated', 疑問:'Questioning', 媚び:'Flattering', 不安:'Anxious', 目閉じ:'Eyes closed', ジト目:'Unimpressed', ウィンク:'Wink', 負傷:'Injured', 戦闘:'Battle', 発狂:'Madness', 絶望:'Despair' },
    ko: { 通常:'기본', 笑顔:'미소', 怒り:'분노', 泣き:'울음', 驚き:'놀람', 困惑:'곤혹', 照れ:'부끄러움', 焦り:'초조', 微笑:'옅은 미소', 真剣:'진지함', 悲哀:'비애', 喜び:'기쁨', 呆れ:'어이없음', 疑問:'의문', 媚び:'아첨', 不安:'불안', 目閉じ:'눈 감음', ジト目:'못마땅한 눈', ウィンク:'윙크', 負傷:'부상', 戦闘:'전투', 発狂:'광기', 絶望:'절망' }
  };
  const ROMAN_TO_JP = [
    ['tsuujou', '通常'], ['normal', '通常'], ['default', '通常'],
    ['egao', '笑顔'], ['smile', '笑顔'], ['ikari', '怒り'], ['angry', '怒り'],
    ['nakigao', '泣き'], ['naki', '泣き'], ['cry', '泣き'],
    ['bikkuri', '驚き'], ['surprise', '驚き'], ['komari', '困惑'], ['komaku', '困惑'], ['tere', '照れ'],
    ['ase', '焦り'], ['hohoemi', '微笑'], ['shinken', '真剣'], ['kanashimi', '悲哀'], ['hiai', '悲哀'],
    ['yorokobi', '喜び'], ['akire', '呆れ'], ['gimon', '疑問'], ['question', '疑問'], ['kobi', '媚び'], ['fuan', '不安'], ['me_toji', '目閉じ'], ['metoji', '目閉じ'],
    ['jitome', 'ジト目'], ['wink', 'ウィンク'], ['wink', 'ウィンク'], ['fusyou', '負傷'], ['fushou', '負傷'], ['damage', '負傷'],
    ['sentou', '戦闘'], ['battle', '戦闘'], ['hakkyo', '発狂'], ['zekubou', '絶望'], ['zetsubou', '絶望']
  ];
  const state = {
    items: [],
    activeId: null,
    draggingId: null,
  };

  const els = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    mainNameInput: document.getElementById('mainNameInput'),
    numberToggle: document.getElementById('numberToggle'),
    fileCountPill: document.getElementById('fileCountPill'),
    suggestionChips: document.getElementById('suggestionChips'),
    suggestionList: document.getElementById('sabunSuggestions'),
    thumbList: document.getElementById('thumbList'),
    largePreview: document.getElementById('largePreview'),
    previewImage: document.getElementById('previewImage'),
    activeNamePill: document.getElementById('activeNamePill'),
    filenamePreview: document.getElementById('filenamePreview'),
    paletteOutput: document.getElementById('paletteOutput'),
    exportZipBtn: document.getElementById('exportZipBtn'),
    copyPaletteBtn: document.getElementById('copyPaletteBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    statusLine: document.getElementById('statusLine'),
    usageToggleBtn: document.getElementById('usageToggleBtn'),
    shortcutToggleBtn: document.getElementById('shortcutToggleBtn'),
    usagePanel: document.getElementById('usagePanel'),
    shortcutPanel: document.getElementById('shortcutPanel'),
    toastMessage: document.getElementById('toastMessage'),
    languageButtons: document.querySelectorAll('[data-language]'),
  };

  function init() {
    els.numberToggle.checked = true;
    els.thumbList.setAttribute('tabindex', '0');
    applyTranslations();
    renderSuggestions();
    bindEvents();
    updateOutput();
  }

  function bindEvents() {
    els.fileInput.addEventListener('change', (event) => addFiles(event.target.files));

    ['dragenter', 'dragover'].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove('is-dragover');
      });
    });

    els.dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));

    els.mainNameInput.addEventListener('input', refreshNames);
    els.numberToggle.addEventListener('change', refreshNames);

    els.exportZipBtn.addEventListener('click', exportZip);
    els.copyPaletteBtn.addEventListener('click', copyPalette);
    els.resetAllBtn.addEventListener('click', confirmAndClearAll);
    els.languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
    els.suggestionChips.addEventListener('click', handleSuggestionClick);

    els.usageToggleBtn.addEventListener('click', () => toggleDrawer('usage'));
    els.shortcutToggleBtn.addEventListener('click', () => toggleDrawer('shortcut'));

    document.addEventListener('keydown', handleShortcuts);
  }

  function handleShortcuts(event) {
    const isMod = event.ctrlKey || event.metaKey;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (isAnyDrawerOpen()) {
        closeDrawers();
      } else {
        els.resetAllBtn.click();
      }
      return;
    }

    if (!isEditable(event.target) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      if (state.items.length > 0) {
        event.preventDefault();
        selectItemByOffset(event.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }

    if (!isMod || !event.shiftKey) return;

    const key = event.key.toLowerCase();
    if (key === 'o') {
      event.preventDefault();
      els.fileInput.click();
    } else if (key === 'e') {
      event.preventDefault();
      exportZip();
    } else if (key === 'c') {
      event.preventDefault();
      copyPalette();
    } else if (key === 'n') {
      event.preventDefault();
      els.numberToggle.checked = !els.numberToggle.checked;
      refreshNames();
      setStatus(t('status.number', { state: els.numberToggle.checked ? 'ON' : 'OFF' }), 'ok');
    }
  }

  function isEditable(target) {
    return target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
  }

  function toggleDrawer(kind) {
    const panel = kind === 'usage' ? els.usagePanel : els.shortcutPanel;
    const button = kind === 'usage' ? els.usageToggleBtn : els.shortcutToggleBtn;
    const otherPanel = kind === 'usage' ? els.shortcutPanel : els.usagePanel;
    const otherButton = kind === 'usage' ? els.shortcutToggleBtn : els.usageToggleBtn;
    const willOpen = !panel.classList.contains('is-open');

    otherPanel.classList.remove('is-open');
    otherPanel.setAttribute('aria-hidden', 'true');
    otherButton.classList.remove('is-active');
    otherButton.setAttribute('aria-expanded', 'false');

    panel.classList.toggle('is-open', willOpen);
    panel.setAttribute('aria-hidden', String(!willOpen));
    button.classList.toggle('is-active', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  }

  function closeDrawers() {
    [els.usagePanel, els.shortcutPanel].forEach((panel) => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
    [els.usageToggleBtn, els.shortcutToggleBtn].forEach((button) => {
      button.classList.remove('is-active');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function isAnyDrawerOpen() {
    return [els.usagePanel, els.shortcutPanel].some((panel) => panel.classList.contains('is-open'));
  }

  function renderSuggestions() {
    els.suggestionList.innerHTML = SUGGESTIONS.map((item) => `<option value="${escapeHtml(item.value)}"></option>`).join('');
    els.suggestionChips.innerHTML = SUGGESTIONS.map((item) => (
      `<button type="button" class="chip" data-suggestion="${escapeHtml(item.value)}">${escapeHtml(SUGGESTION_LABELS[currentLanguage]?.[item.value] || item.label)}</button>`
    )).join('');
  }

  function handleSuggestionClick(event) {
      const button = event.target.closest('[data-suggestion]');
      if (!button) return;
      const activeItem = getActiveItem();
      if (!activeItem) return setStatus(t('status.selectFirst'), 'warn');
      activeItem.sabunName = button.dataset.suggestion;
      renderThumbnails();
      updateOutput();
      updatePreviewMeta();
  }

  function addFiles(fileList) {
    const imageFiles = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return setStatus(t('status.noImages'), 'warn');

    const existingKeys = new Set(state.items.map((item) => `${item.file.name}_${item.file.size}_${item.file.lastModified}`));
    const newItems = imageFiles
      .filter((file) => !existingKeys.has(`${file.name}_${file.size}_${file.lastModified}`))
      .map((file, index) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}_${index}`,
        file,
        objectUrl: URL.createObjectURL(file),
        sabunName: '',
      }));

    state.items.push(...newItems);

    if (!els.mainNameInput.value.trim() && state.items[0]) {
      els.mainNameInput.value = sanitizeName(removeExtension(state.items[0].file.name).replace(/[_-]?(tsuujou|egao|ikari|nakigao|bikkuri|komari|tere|ase|normal|default|smile|angry|cry|surprise)$/i, ''));
    }

    if (!state.activeId && state.items[0]) state.activeId = state.items[0].id;
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    setStatus(t('status.added', { count: newItems.length }), 'ok');
    els.fileInput.value = '';
  }

  function inferSabunName(filename, index) {
    const base = removeExtension(filename).toLowerCase();
    const matched = ROMAN_TO_JP.find(([roman]) => base.includes(roman.toLowerCase()));
    return matched ? matched[1] : (SUGGESTIONS[index]?.value || t('fallback.variant', { number: index + 1 }));
  }

  function refreshNames() {
    renderThumbnails();
    updateOutput();
    updatePreviewMeta();
  }

  function renderThumbnails() {
    els.fileCountPill.textContent = `${state.items.length} files`;

    if (state.items.length === 0) {
      els.thumbList.innerHTML = `<div class="empty-state">${escapeHtml(t('thumb.empty'))}</div>`;
      return;
    }

    els.thumbList.innerHTML = state.items.map((item, index) => {
      const finalName = makeOutputFilename(item, index);
      const activeClass = item.id === state.activeId ? ' is-active' : '';
      return `
        <div class="thumb-item${activeClass}" data-id="${item.id}" draggable="true" role="button" tabindex="-1" aria-label="${escapeHtml(t('thumb.select', { name: item.file.name }))}">
          <button type="button" class="thumb-button" tabindex="-1" aria-label="${escapeHtml(t('thumb.preview', { name: item.file.name }))}">
            <img src="${item.objectUrl}" alt="${escapeHtml(item.file.name)}" draggable="false" />
          </button>
          <div class="thumb-meta">
            <p class="source-name">${index + 1}. ${escapeHtml(item.file.name)}</p>
            <div class="thumb-controls">
              <input type="text" value="${escapeHtml(item.sabunName)}" list="sabunSuggestions" aria-label="${escapeHtml(t('thumb.name'))}" data-name-input />
              <div class="final-name">${escapeHtml(finalName)}</div>
            </div>
          </div>
        </div>`;
    }).join('');

    els.thumbList.querySelectorAll('.thumb-item').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('[data-name-input]')) return;
        selectItemById(row.dataset.id);
      });

      row.addEventListener('dragstart', (event) => {
        if (event.target.closest('[data-name-input]')) {
          event.preventDefault();
          return;
        }
        state.draggingId = row.dataset.id;
        row.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.dataset.id);
      });

      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (state.draggingId && state.draggingId !== row.dataset.id) {
          row.classList.add('is-drop-target');
          event.dataTransfer.dropEffect = 'move';
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('is-drop-target');
      });

      row.addEventListener('drop', (event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain') || state.draggingId;
        const targetId = row.dataset.id;
        row.classList.remove('is-drop-target');
        reorderItems(draggedId, targetId);
      });

      row.addEventListener('dragend', () => {
        state.draggingId = null;
        els.thumbList.querySelectorAll('.thumb-item').forEach((item) => {
          item.classList.remove('is-dragging', 'is-drop-target');
        });
      });

      row.querySelector('[data-name-input]').addEventListener('focus', () => {
        state.activeId = row.dataset.id;
        updateLargePreview();
        renderActiveThumbnailState();
      });

      row.querySelector('[data-name-input]').addEventListener('click', (event) => {
        event.stopPropagation();
        state.activeId = row.dataset.id;
        updateLargePreview();
        renderActiveThumbnailState();
      });

      row.querySelector('[data-name-input]').addEventListener('input', (event) => {
        const item = state.items.find((candidate) => candidate.id === row.dataset.id);
        if (!item) return;
        item.sabunName = event.target.value;
        row.querySelector('.final-name').textContent = makeOutputFilename(item, state.items.indexOf(item));
        updateOutput();
        updatePreviewMeta();
      });
    });
  }

  function selectItemById(id, { keepFocus = true } = {}) {
    if (!state.items.some((item) => item.id === id)) return;
    state.activeId = id;
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    scrollActiveThumbIntoView();
    if (keepFocus) els.thumbList.focus({ preventScroll: true });
  }

  function selectItemByOffset(offset) {
    const currentIndex = Math.max(0, state.items.findIndex((item) => item.id === state.activeId));
    const nextIndex = Math.min(state.items.length - 1, Math.max(0, currentIndex + offset));
    const nextItem = state.items[nextIndex];
    if (!nextItem || nextItem.id === state.activeId) return;
    selectItemById(nextItem.id);
  }

  function reorderItems(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const fromIndex = state.items.findIndex((item) => item.id === draggedId);
    const toIndex = state.items.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [movedItem] = state.items.splice(fromIndex, 1);
    state.items.splice(toIndex, 0, movedItem);
    state.activeId = draggedId;
    state.draggingId = null;
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    scrollActiveThumbIntoView();
    setStatus(t('status.reordered'), 'ok');
  }

  function renderActiveThumbnailState() {
    els.thumbList.querySelectorAll('.thumb-item').forEach((row) => {
      row.classList.toggle('is-active', row.dataset.id === state.activeId);
    });
  }

  function scrollActiveThumbIntoView() {
    const activeRow = els.thumbList.querySelector('.thumb-item.is-active');
    if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
  }

  function updateLargePreview() {
    const activeItem = getActiveItem();
    if (!activeItem) {
      els.largePreview.classList.remove('has-image');
      els.previewImage.removeAttribute('src');
      els.activeNamePill.textContent = 'No image';
      els.filenamePreview.textContent = t('preview.filename', { name: '-' });
      return;
    }
    els.previewImage.src = activeItem.objectUrl;
    els.largePreview.classList.add('has-image');
    updatePreviewMeta();
  }

  function updatePreviewMeta() {
    const activeItem = getActiveItem();
    if (!activeItem) return;
    const index = state.items.indexOf(activeItem);
    els.activeNamePill.textContent = activeItem.sabunName || t('preview.unset');
    els.filenamePreview.textContent = t('preview.filename', { name: makeOutputFilename(activeItem, index) });
  }

  function updateOutput() {
    const validNames = state.items
      .map((item) => sanitizeName(item.sabunName))
      .filter(Boolean);

    els.paletteOutput.value = validNames.map((name) => `@${name}`).join('\n');
    els.exportZipBtn.disabled = state.items.length === 0;
    els.copyPaletteBtn.disabled = validNames.length === 0;
  }

  async function exportZip() {
    if (state.items.length === 0) return;
    if (typeof JSZip === 'undefined') return setStatus(t('status.zipLibrary'), 'error');

    const mainName = getMainName();
    const usedNames = new Map();
    const zip = new JSZip();

    state.items.forEach((item, index) => {
      const filename = makeUniqueFilename(makeOutputFilename(item, index), usedNames);
      zip.file(filename, item.file);
    });

    zip.file('sabun-chatpalette.txt', els.paletteOutput.value);

    try {
      setStatus(t('status.zipCreating'), 'warn');
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${mainName}_sabun.zip`);
      setStatus(t('status.zipStarted'), 'ok');
      showToast(t('status.zipDone'));
    } catch (error) {
      console.error(error);
      setStatus(t('status.zipFailed'), 'error');
    }
  }

  async function copyPalette() {
    const text = els.paletteOutput.value.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus(t('status.copied'), 'ok');
    } catch (error) {
      els.paletteOutput.removeAttribute('readonly');
      els.paletteOutput.select();
      document.execCommand('copy');
      els.paletteOutput.setAttribute('readonly', 'readonly');
      setStatus(t('status.copyManual'), 'warn');
    }
  }

  function confirmAndClearAll() {
    const ok = window.confirm(t('status.resetConfirm'));
    if (!ok) return;
    clearAll();
  }

  function clearAll() {
    state.items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    state.items = [];
    state.activeId = null;
    els.mainNameInput.value = '';
    els.numberToggle.checked = true;
    closeDrawers();
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    setStatus(t('status.reset'), 'ok');
  }

  function getActiveItem() {
    return state.items.find((item) => item.id === state.activeId) || state.items[0] || null;
  }

  function getMainName() {
    return sanitizeName(els.mainNameInput.value) || 'character';
  }

  function makeOutputFilename(item, fallbackIndex = 0) {
    const mainName = getMainName();
    const sabunName = sanitizeName(item.sabunName);
    const ext = getExtension(item.file.name) || 'png';
    const number = els.numberToggle.checked ? String(fallbackIndex + 1).padStart(2, '0') : '';
    return sabunName ? `${mainName}${number}_${sabunName}.${ext}` : `${mainName}${number}.${ext}`;
  }

  function makeUniqueFilename(filename, usedNames) {
    const count = usedNames.get(filename) || 0;
    usedNames.set(filename, count + 1);
    if (count === 0) return filename;

    const ext = getExtension(filename);
    const base = ext ? filename.slice(0, -(ext.length + 1)) : filename;
    return ext ? `${base}_${count + 1}.${ext}` : `${base}_${count + 1}`;
  }

  function sanitizeName(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function removeExtension(filename) {
    return filename.replace(/\.[^.]+$/, '');
  }

  function getExtension(filename) {
    const match = String(filename || '').match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showToast(message = t('status.downloadDone')) {
    if (!els.toastMessage) return;
    els.toastMessage.textContent = message;
    els.toastMessage.setAttribute('aria-hidden', 'false');
    els.toastMessage.classList.add('is-visible');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toastMessage.classList.remove('is-visible');
      els.toastMessage.setAttribute('aria-hidden', 'true');
    }, 2200);
  }

  function setStatus(message, type = '') {
    els.statusLine.textContent = message;
    els.statusLine.className = `status-line ${type}`.trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  init();
})();
