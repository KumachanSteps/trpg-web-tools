(() => {
  'use strict';

  const SUGGESTIONS = [
    { label: '通常', value: '通常' },
    { label: '笑顔', value: '笑顔' },
    { label: '怒り', value: '怒り' },
    { label: '泣き顔', value: '泣き顔' },
    { label: '驚き', value: '驚き' },
    { label: '困り顔', value: '困り顔' },
    { label: '照れ', value: '照れ' },
    { label: '焦り', value: '焦り' },
    { label: '微笑み', value: '微笑み' },
    { label: '真剣', value: '真剣' },
    { label: '悲しい', value: '悲しい' },
    { label: '喜び', value: '喜び' },
    { label: '呆れ', value: '呆れ' },
    { label: '眠い', value: '眠い' },
    { label: '不安', value: '不安' },
    { label: '目閉じ', value: '目閉じ' },
    { label: '闇', value: '闇' },
    { label: 'ダメージ', value: 'ダメージ' },
    { label: '戦闘', value: '戦闘' },
    { label: 'デフォルト', value: 'デフォルト' }
  ];

  const ROMAN_TO_JP = [
    ['tsuujou', '通常'], ['normal', '通常'], ['default', 'デフォルト'],
    ['egao', '笑顔'], ['smile', '笑顔'], ['ikari', '怒り'], ['angry', '怒り'],
    ['nakigao', '泣き顔'], ['naki', '泣き顔'], ['cry', '泣き顔'],
    ['bikkuri', '驚き'], ['surprise', '驚き'], ['komari', '困り顔'], ['tere', '照れ'],
    ['ase', '焦り'], ['warai', '笑顔'], ['shinken', '真剣'], ['kanashii', '悲しい'],
    ['yorokobi', '喜び'], ['akire', '呆れ'], ['nemui', '眠い'], ['fuan', '不安'],
    ['hohoemi', '微笑み'], ['me_toji', '目閉じ'], ['yami', '闇'], ['damage', 'ダメージ'],
    ['battle', '戦闘']
  ];

  const state = {
    items: [],
    activeId: null,
  };

  const els = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    mainNameInput: document.getElementById('mainNameInput'),
    numberToggle: document.getElementById('numberToggle'),
    fileCountPill: document.getElementById('fileCountPill'),
    suggestionChips: document.getElementById('suggestionChips'),
    suggestionList: document.getElementById('sabunSuggestions'),
    autoFillBtn: document.getElementById('autoFillBtn'),
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
  };

  function init() {
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

    els.autoFillBtn.addEventListener('click', autoFillEmptyNames);
    els.exportZipBtn.addEventListener('click', exportZip);
    els.copyPaletteBtn.addEventListener('click', copyPalette);
    els.resetAllBtn.addEventListener('click', confirmAndClearAll);

    els.usageToggleBtn.addEventListener('click', () => toggleDrawer('usage'));
    els.shortcutToggleBtn.addEventListener('click', () => toggleDrawer('shortcut'));

    document.addEventListener('keydown', handleShortcuts);
  }

  function handleShortcuts(event) {
    const isMod = event.ctrlKey || event.metaKey;
    if (event.key === 'Escape') {
      closeDrawers();
      return;
    }
    if (!isMod) return;

    const key = event.key.toLowerCase();
    if (key === 'o') {
      event.preventDefault();
      els.fileInput.click();
    } else if (key === 'e') {
      event.preventDefault();
      exportZip();
    } else if (key === 'c' && !isEditable(event.target)) {
      event.preventDefault();
      copyPalette();
    } else if (key === 'n') {
      event.preventDefault();
      els.numberToggle.checked = !els.numberToggle.checked;
      refreshNames();
      setStatus(`番号追加を${els.numberToggle.checked ? 'ON' : 'OFF'}にしました。`, 'ok');
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

  function renderSuggestions() {
    els.suggestionList.innerHTML = SUGGESTIONS.map((item) => `<option value="${escapeHtml(item.value)}"></option>`).join('');
    els.suggestionChips.innerHTML = SUGGESTIONS.map((item) => (
      `<button type="button" class="chip" data-suggestion="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button>`
    )).join('');

    els.suggestionChips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-suggestion]');
      if (!button) return;
      const activeItem = getActiveItem();
      if (!activeItem) return setStatus('先に画像を選択してください。', 'warn');
      activeItem.sabunName = button.dataset.suggestion;
      renderThumbnails();
      updateOutput();
      updatePreviewMeta();
    });
  }

  function addFiles(fileList) {
    const imageFiles = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return setStatus('画像ファイルが見つかりませんでした。', 'warn');

    const existingKeys = new Set(state.items.map((item) => `${item.file.name}_${item.file.size}_${item.file.lastModified}`));
    const newItems = imageFiles
      .filter((file) => !existingKeys.has(`${file.name}_${file.size}_${file.lastModified}`))
      .map((file, index) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}_${index}`,
        file,
        objectUrl: URL.createObjectURL(file),
        sabunName: inferSabunName(file.name, state.items.length + index),
      }));

    state.items.push(...newItems);

    if (!els.mainNameInput.value.trim() && state.items[0]) {
      els.mainNameInput.value = sanitizeName(removeExtension(state.items[0].file.name).replace(/[_-]?(tsuujou|egao|ikari|nakigao|bikkuri|komari|tere|ase|normal|default|smile|angry|cry|surprise)$/i, ''));
    }

    if (!state.activeId && state.items[0]) state.activeId = state.items[0].id;
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    setStatus(`${newItems.length}件の画像を追加しました。`, 'ok');
    els.fileInput.value = '';
  }

  function inferSabunName(filename, index) {
    const base = removeExtension(filename).toLowerCase();
    const matched = ROMAN_TO_JP.find(([roman]) => base.includes(roman.toLowerCase()));
    return matched ? matched[1] : (SUGGESTIONS[index]?.value || `差分${index + 1}`);
  }

  function refreshNames() {
    renderThumbnails();
    updateOutput();
    updatePreviewMeta();
  }

  function renderThumbnails() {
    els.fileCountPill.textContent = `${state.items.length} files`;

    if (state.items.length === 0) {
      els.thumbList.innerHTML = '<div class="empty-state">画像を追加すると、ここにサムネイルと差分名入力欄が表示されます。</div>';
      return;
    }

    els.thumbList.innerHTML = state.items.map((item, index) => {
      const finalName = makeOutputFilename(item, index);
      const activeClass = item.id === state.activeId ? ' is-active' : '';
      return `
        <div class="thumb-item${activeClass}" data-id="${item.id}">
          <button type="button" class="thumb-button" aria-label="${escapeHtml(item.file.name)}をプレビュー">
            <img src="${item.objectUrl}" alt="${escapeHtml(item.file.name)}" />
          </button>
          <div class="thumb-meta">
            <p class="source-name">${index + 1}. ${escapeHtml(item.file.name)}</p>
            <div class="thumb-controls">
              <input type="text" value="${escapeHtml(item.sabunName)}" list="sabunSuggestions" aria-label="差分名" data-name-input />
              <div class="final-name">${escapeHtml(finalName)}</div>
            </div>
          </div>
        </div>`;
    }).join('');

    els.thumbList.querySelectorAll('.thumb-item').forEach((row) => {
      row.querySelector('.thumb-button').addEventListener('click', () => {
        state.activeId = row.dataset.id;
        renderThumbnails();
        updateLargePreview();
        updateOutput();
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

  function updateLargePreview() {
    const activeItem = getActiveItem();
    if (!activeItem) {
      els.largePreview.classList.remove('has-image');
      els.previewImage.removeAttribute('src');
      els.activeNamePill.textContent = 'No image';
      els.filenamePreview.textContent = '出力ファイル名：-';
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
    els.activeNamePill.textContent = activeItem.sabunName || '未入力';
    els.filenamePreview.textContent = `出力ファイル名：${makeOutputFilename(activeItem, index)}`;
  }

  function updateOutput() {
    const validNames = state.items
      .map((item) => sanitizeName(item.sabunName))
      .filter(Boolean);

    els.paletteOutput.value = validNames.map((name) => `@${name}`).join('\n');
    els.exportZipBtn.disabled = state.items.length === 0;
    els.copyPaletteBtn.disabled = validNames.length === 0;
    els.autoFillBtn.disabled = state.items.length === 0;
  }

  function autoFillEmptyNames() {
    state.items.forEach((item, index) => {
      if (!item.sabunName.trim()) item.sabunName = SUGGESTIONS[index]?.value || `差分${index + 1}`;
    });
    renderThumbnails();
    updateOutput();
    updatePreviewMeta();
    setStatus('空欄の差分名へサジェストを入力しました。', 'ok');
  }

  async function exportZip() {
    if (state.items.length === 0) return;
    if (typeof JSZip === 'undefined') return setStatus('ZIP出力ライブラリを読み込めませんでした。ネット接続を確認してください。', 'error');

    const mainName = getMainName();
    const usedNames = new Map();
    const zip = new JSZip();

    state.items.forEach((item, index) => {
      const filename = makeUniqueFilename(makeOutputFilename(item, index), usedNames);
      zip.file(filename, item.file);
    });

    zip.file('sabun-chatpalette.txt', els.paletteOutput.value);

    try {
      setStatus('ZIPを生成しています。', 'warn');
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${mainName}_sabun.zip`);
      setStatus('リネーム済み画像ZIPを出力しました。', 'ok');
    } catch (error) {
      console.error(error);
      setStatus('ZIP出力に失敗しました。', 'error');
    }
  }

  async function copyPalette() {
    const text = els.paletteOutput.value.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus('@差分チャットパレットをコピーしました。', 'ok');
    } catch (error) {
      els.paletteOutput.removeAttribute('readonly');
      els.paletteOutput.select();
      document.execCommand('copy');
      els.paletteOutput.setAttribute('readonly', 'readonly');
      setStatus('コピーを実行しました。うまくいかない場合はテキスト欄から手動コピーしてください。', 'warn');
    }
  }

  function confirmAndClearAll() {
    const ok = window.confirm('すべての画像・差分名・入力内容をリセットします。よろしいですか？');
    if (!ok) return;
    clearAll();
  }

  function clearAll() {
    state.items.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    state.items = [];
    state.activeId = null;
    els.mainNameInput.value = '';
    els.numberToggle.checked = false;
    closeDrawers();
    renderThumbnails();
    updateLargePreview();
    updateOutput();
    setStatus('リセットしました。', 'ok');
  }

  function getActiveItem() {
    return state.items.find((item) => item.id === state.activeId) || state.items[0] || null;
  }

  function getMainName() {
    return sanitizeName(els.mainNameInput.value) || 'character';
  }

  function makeOutputFilename(item, fallbackIndex = 0) {
    const mainName = getMainName();
    const sabunName = sanitizeName(item.sabunName) || `差分${fallbackIndex + 1}`;
    const ext = getExtension(item.file.name) || 'png';
    const number = els.numberToggle.checked ? String(fallbackIndex + 1).padStart(2, '0') : '';
    return `${mainName}${number}_${sabunName}.${ext}`;
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
