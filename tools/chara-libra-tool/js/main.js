(function () {
  'use strict';

  let characters = [];
  let currentView = 'icon';
  let selectedId = '';
  let isCharacterFieldHover = false;
  let isCharacterFieldActive = false;

  const FILTER_STATE_KEY = 'charaLibra.filterState.v1';

  const $ = (id) => document.getElementById(id);

  function init() {
    characters = CharaLibraStorage.loadCharacters();
    restoreTheme();
    bindEvents();
    restoreFilterState();
    render();
  }

  function bindEvents() {
    $('pasteBtn').addEventListener('click', pasteFromClipboard);
    $('registerBtn').addEventListener('click', registerOrUpdateFromInput);
    $('clearInputBtn').addEventListener('click', () => $('jsonInput').value = '');
    $('resetFiltersBtn').addEventListener('click', resetFilters);
    $('sampleBtn').addEventListener('click', loadSample);
    $('exportLibraryBtn').addEventListener('click', exportLibrary);
    $('importLibraryInput').addEventListener('change', importLibrary);
    $('themeBtn').addEventListener('click', toggleTheme);
    $('helpBtn').addEventListener('click', () => togglePanel('helpPanel'));
    $('shortcutBtn').addEventListener('click', () => togglePanel('shortcutPanel'));
    $('langBtn').addEventListener('click', () => showToast('EN表示は今後のバージョンで拡張予定です'));
    $('shareXBtn').addEventListener('click', shareToX);
    $('characterField').addEventListener('click', (event) => {
      if (isEditableTarget(event.target)) return;
      focusCharacterFieldForPaste();
    });
    $('characterField').addEventListener('focus', () => {
      isCharacterFieldActive = true;
      $('characterField').classList.add('is-paste-ready');
    });
    $('characterField').addEventListener('blur', () => {
      isCharacterFieldActive = false;
      if (!isCharacterFieldHover) $('characterField').classList.remove('is-paste-ready');
    });
    $('characterField').addEventListener('paste', pasteKomaDataIntoField);
    $('fieldPasteCatcher')?.addEventListener('paste', pasteKomaDataFromPasteEvent);
    $('characterField').addEventListener('mouseenter', () => {
      isCharacterFieldHover = true;
      $('characterField').classList.add('is-paste-ready');
    });
    $('characterField').addEventListener('mouseleave', () => {
      isCharacterFieldHover = false;
      if (!isCharacterFieldActive) $('characterField').classList.remove('is-paste-ready');
    });
    document.addEventListener('mousedown', (event) => {
      if (!$('characterField').contains(event.target)) deactivateCharacterFieldPaste();
    });
    document.addEventListener('paste', pasteKomaDataIntoActiveField);

    document.querySelectorAll('[data-close-panel]').forEach((button) => {
      button.addEventListener('click', () => closePanel(button.dataset.closePanel));
    });

    ['searchInput', 'systemFilter', 'statusFilter', 'tagFilter', 'occupationFilter', 'sortSelect'].forEach((id) => {
      $(id).addEventListener('input', handleFilterStateChange);
      $(id).addEventListener('change', handleFilterStateChange);
    });

    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        currentView = button.dataset.view;
        document.querySelectorAll('[data-view]').forEach((btn) => btn.classList.toggle('is-active', btn === button));
        saveFilterState();
        render();
      });
    });

    $('characterGrid').addEventListener('click', (event) => {
      const card = event.target.closest('[data-character-id]');
      if (card) openDetail(card.dataset.characterId);
    });

    $('characterGrid').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('[data-character-id]');
      if (card) {
        event.preventDefault();
        openDetail(card.dataset.characterId);
      }
    });

    $('closeDialogBtn').addEventListener('click', closeDetail);
    $('saveDetailBtn').addEventListener('click', saveDetail);
    $('copyKomaBtn').addEventListener('click', copyKomaData);
    $('copyPaletteBtn').addEventListener('click', copyChatPalette);
    $('deleteCharacterBtn').addEventListener('click', deleteSelectedCharacter);
    $('detailIconEditBtn').addEventListener('click', () => $('detailIconInput').click());
    $('detailIconInput').addEventListener('change', importDetailIconImage);
    $('detailIacharaInput').addEventListener('change', importIacharaTextToMemo);
    $('detailThemeColor').addEventListener('input', () => {
      $('detailThemeColor').value = sanitizeThemeColorInput($('detailThemeColor').value);
      CharaLibraRender.updateThemeSwatch($('detailThemeColor').value);
      updateProfileFieldSizes();
    });
    document.querySelectorAll('.detail-chip-field input').forEach((input) => {
      input.addEventListener('input', updateProfileFieldSizes);
    });
    $('detailNameInput').addEventListener('input', () => {
      $('detailNameInput').size = Math.max(16, Math.min(104, [...$('detailNameInput').value].length + 3));
    });
    $('commandAddCheck').addEventListener('change', handleCommandOptionChange);
    $('formatPaletteCheck').addEventListener('change', handleFormatPaletteChange);

    document.addEventListener('keydown', (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === 'Escape') {
        if (!$('characterDialog').open) {
          closePanel('helpPanel');
          closePanel('shortcutPanel');
        } else closeDetail();
      }
      if (!mod || !event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === 'v') {
        event.preventDefault();
        pasteFromClipboard();
      } else if (key === 's') {
        event.preventDefault();
        exportLibrary();
      } else if (key === 't') {
        event.preventDefault();
        toggleTheme();
      }
    });
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      $('jsonInput').value = text;
      showToast('クリップボードから入力しました');
    } catch (error) {
      showToast('クリップボードを読み取れませんでした。手動で貼り付けてください。');
    }
  }

  function registerOrUpdateFromInput() {
    registerOrUpdateText($('jsonInput').value, { clearInput: true });
  }

  function registerOrUpdateText(text, options = {}) {
    try {
      const parsed = CharaLibraParser.parse(text);
      const match = findExisting(parsed);
      if (match) {
        const oldCreatedAt = match.timestamps?.createdAt || parsed.timestamps.createdAt;
        const merged = {
          ...match,
          ...parsed,
          id: match.id,
          lifeStatus: match.lifeStatus || parsed.lifeStatus,
          tags: match.tags && match.tags.length ? match.tags : parsed.tags,
          tachieUrl: match.tachieUrl || parsed.tachieUrl,
          timestamps: {
            ...parsed.timestamps,
            createdAt: oldCreatedAt,
            updatedAt: new Date().toISOString(),
          },
        };
        characters = characters.map((character) => character.id === match.id ? merged : character);
        selectedId = merged.id;
        showToast(`${merged.name} を更新しました`);
      } else {
        characters.unshift(parsed);
        selectedId = parsed.id;
        showToast(`${parsed.name} を登録しました`);
      }
      persistAndRender();
      if (options.clearInput) $('jsonInput').value = '';
      return true;
    } catch (error) {
      showToast(error.message || '駒データを解析できませんでした');
      return false;
    }
  }




  function focusCharacterFieldForPaste() {
    isCharacterFieldActive = true;
    const field = $('characterField');
    field.classList.add('is-paste-ready');
    const catcher = $('fieldPasteCatcher');
    if (catcher) {
      catcher.value = '';
      catcher.focus({ preventScroll: true });
    } else {
      field.focus({ preventScroll: true });
    }
  }

  function deactivateCharacterFieldPaste() {
    isCharacterFieldActive = false;
    if (!isCharacterFieldHover) $('characterField').classList.remove('is-paste-ready');
  }

  function pasteKomaDataIntoActiveField(event) {
    if (isEditableTarget(event.target) && event.target?.id !== 'fieldPasteCatcher') return;
    const field = $('characterField');
    const shouldAccept = isCharacterFieldActive || document.activeElement === $('fieldPasteCatcher') || document.activeElement === field || isCharacterFieldHover || field.contains(event.target);
    if (!shouldAccept) return;
    pasteKomaDataFromPasteEvent(event);
  }

  function pasteKomaDataIntoField(event) {
    if (isEditableTarget(event.target) && event.target?.id !== 'fieldPasteCatcher') return;
    pasteKomaDataFromPasteEvent(event);
  }

  function pasteKomaDataFromPasteEvent(event) {
    // Use the native paste event payload instead of navigator.clipboard.readText().
    // This avoids browser permission dialogs while still accepting Ctrl/Cmd+V.
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!looksLikeJson(text)) return;
    event.preventDefault();
    event.stopPropagation();
    $('jsonInput').value = text;
    const loaded = registerOrUpdateText(text, { clearInput: true });
    if (loaded) showToast('右カラムへの貼り付けから駒データを読み込みました');
  }

  function looksLikeJson(text) {
    const trimmed = String(text || '').trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  }

  function isEditableTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], [data-character-id]'));
  }

  function findExisting(next) {
    const nextUrl = normalizeExternalUrl(next.externalUrl);
    const nextName = normalizeName(next.name);

    if (nextUrl) {
      const byUrl = characters.find((character) => normalizeExternalUrl(character.externalUrl) === nextUrl);
      if (byUrl) return byUrl;

      // externalUrl が入っている駒は、同名でも URL が違えば別キャラとして扱う。
      // ただし、既存側に externalUrl が未登録の同名キャラがある場合だけ、
      // 「URL未登録だった同一キャラの更新」として紐づける。
      return characters.find((character) => (
        normalizeName(character.name) === nextName &&
        !normalizeExternalUrl(character.externalUrl)
      )) || null;
    }

    // 新規データ側に externalUrl がない場合は、URL未登録の同名キャラを優先して更新する。
    // URLありの同名キャラしかない場合は従来通り名前で更新できるようにする。
    return characters.find((character) => (
      normalizeName(character.name) === nextName &&
      !normalizeExternalUrl(character.externalUrl)
    )) || characters.find((character) => normalizeName(character.name) === nextName);
  }

  function normalizeExternalUrl(url) {
    return String(url || '')
      .trim()
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  function normalizeName(name) {
    return String(name || '').replace(/[\s　()（）「」『』【】\[\]]/g, '').toLowerCase();
  }

  function getFilters() {
    return {
      query: $('searchInput').value,
      system: $('systemFilter').value,
      lifeStatus: $('statusFilter').value,
      tag: $('tagFilter').value,
      occupation: $('occupationFilter').value,
    };
  }

  function render() {
    CharaLibraRender.renderMetrics(characters);
    const filtered = CharaLibraFilters.sort(
      characters.filter((character) => CharaLibraFilters.matches(character, getFilters())),
      $('sortSelect').value
    );
    CharaLibraRender.renderGrid($('characterGrid'), filtered, currentView);
    $('emptyState').hidden = characters.length > 0;
    $('characterGrid').hidden = characters.length === 0;
  }

  function persistAndRender() {
    CharaLibraStorage.saveCharacters(characters);
    render();
  }

  function resetFilters() {
    $('searchInput').value = '';
    $('systemFilter').value = '';
    $('statusFilter').value = '';
    $('tagFilter').value = '';
    $('occupationFilter').value = '';
    saveFilterState();
    render();
    showToast('フィルターをリセットしました');
  }

  function handleFilterStateChange() {
    saveFilterState();
    render();
  }

  function getFilterState() {
    return {
      query: $('searchInput').value,
      system: $('systemFilter').value,
      lifeStatus: $('statusFilter').value,
      tag: $('tagFilter').value,
      occupation: $('occupationFilter').value,
      sort: $('sortSelect').value,
      view: currentView,
    };
  }

  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(getFilterState()));
    } catch (error) {
      // localStorage が無効な環境では保存せず通常動作に戻す。
    }
  }

  function restoreFilterState() {
    let state = null;

    try {
      state = JSON.parse(localStorage.getItem(FILTER_STATE_KEY) || 'null');
    } catch (error) {
      state = null;
    }

    if (!state || typeof state !== 'object') return;

    setInputValueIfExists('searchInput', state.query);
    setInputValueIfExists('systemFilter', state.system);
    setInputValueIfExists('statusFilter', state.lifeStatus);
    setInputValueIfExists('tagFilter', state.tag);
    setInputValueIfExists('occupationFilter', state.occupation);
    setInputValueIfExists('sortSelect', state.sort);

    if (state.view && document.querySelector(`[data-view="${cssEscapeValue(state.view)}"]`)) {
      currentView = state.view;
    }

    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.view === currentView);
    });
  }

  function setInputValueIfExists(id, value) {
    const element = $(id);
    if (!element || value === undefined || value === null) return;
    element.value = String(value);
  }

  function cssEscapeValue(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/"/g, '\\"');
  }

  function openDetail(id) {
    const character = characters.find((entry) => entry.id === id);
    if (!character) return;
    selectedId = id;
    CharaLibraRender.fillDetail(character);
    updateProfileFieldSizes();
    $('commandAddCheck').checked = false;
    $('formatPaletteCheck').checked = false;
    $('formatPaletteCheck').disabled = false;
    $('manualCopyArea').hidden = true;
    $('characterDialog').showModal();
  }

  function closeDetail() {
    $('characterDialog').close();
  }

  function saveDetail() {
    const character = getSelected();
    if (!character) return;
    character.name = $('detailNameInput').value.trim() || character.name;
    character.occupation = $('detailOccupation').value.trim();
    character.lifeStatus = $('detailLifeStatus').value;
    character.tags = parseTagInput($('detailTags').value);
    character.age = $('detailAge').value.trim();
    character.gender = $('detailGender').value.trim();
    character.height = $('detailHeight').value.trim();
    character.weight = $('detailWeight').value.trim();
    character.themeColor = extractThemeColorCode($('detailThemeColor').value.trim());
    character.externalUrl = $('detailExternalUrl').value.trim();
    character.memo = $('detailMemo').value;
    character.commands = buildDetailCommands(character);
    $('detailCommands').value = character.commands;
    character.skills = CharaLibraParser.extractSkills(character.commands);
    character.timestamps = character.timestamps || {};
    character.timestamps.updatedAt = new Date().toISOString();
    persistAndRender();
    CharaLibraRender.fillDetail(character);
    updateProfileFieldSizes();
    showToast('キャラクター情報を保存しました');
  }


  function buildDetailCommands(character) {
    const raw = $('detailCommands').value || '';
    const edition = editionForPalette(character, raw);
    let output = raw;

    if ($('formatPaletteCheck')?.checked && !$('formatPaletteCheck')?.disabled && window.ChatPaletteParser) {
      output = formatPaletteText(output, edition);
    }

    if ($('commandAddCheck')?.checked) {
      output = appendUtilityCommands(output, edition);
    }

    return output;
  }

  function formatPaletteText(text, edition) {
    try {
      const extracted = ChatPaletteParser.extractPaletteText(text);
      const paletteText = extracted.text || text;
      return ChatPaletteParser.buildOutput(paletteText, edition);
    } catch (error) {
      showToast('チャットパレット整形に失敗しました。元の内容を保存します');
      return text;
    }
  }

  function appendUtilityCommands(text, edition) {
    const utilityLines = edition === '6e'
      ? [':HP-', ':SAN-', 'CBRB(X, Y)', 'RESB(X-Y)']
      : [':HP-', ':SAN-'];

    const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const existing = new Set(lines.map((line) => line.trim()).filter(Boolean));
    const additions = utilityLines.filter((line) => !existing.has(line));

    if (!additions.length) return lines.join('\n').trim();

    const base = lines.join('\n').trim();
    return [additions.join('\n'), base].filter(Boolean).join('\n\n');
  }

  function editionForPalette(character, paletteText) {
    const edition = String(character?.edition || '').toLowerCase();
    if (edition.includes('6')) return '6e';
    if (edition.includes('7')) return '7e';
    return ChatPaletteParser?.detectEdition ? ChatPaletteParser.detectEdition(paletteText) : '7e';
  }

  function handleFormatPaletteChange() {
    const character = getSelected();
    if (!character || !window.ChatPaletteParser) return;

    if (!$('formatPaletteCheck').checked) {
      $('formatPaletteCheck').checked = true;
      return;
    }

    const edition = editionForPalette(character, $('detailCommands').value || '');
    $('detailCommands').value = formatPaletteText($('detailCommands').value || '', edition);
    $('formatPaletteCheck').disabled = true;
    showToast('チャットパレットを整形しました');
  }

  function handleCommandOptionChange() {
    const character = getSelected();
    if (!character || !$('commandAddCheck').checked) return;
    const edition = editionForPalette(character, $('detailCommands').value || '');
    $('detailCommands').value = appendUtilityCommands($('detailCommands').value || '', edition);
    showToast('補助コマンドを追加しました');
  }


  async function copyChatPalette() {
    const character = getSelected();
    if (!character) return;
    const text = buildDetailCommands(character);
    $('detailCommands').value = text;
    try {
      await navigator.clipboard.writeText(text);
      showToast('チャットパレットをコピーしました');
    } catch (error) {
      $('manualCopyArea').hidden = false;
      $('manualCopyArea').value = text;
      $('manualCopyArea').select();
      showToast('自動コピーできませんでした。下の内容を手動でコピーしてください。');
    }
  }


  function parseTagInput(value) {
    return String(value || '')
      .split(/[,\n、，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function mergeTags(current, incoming) {
    const merged = [];
    [...(current || []), ...(incoming || [])].forEach((tag) => {
      const trimmed = String(tag || '').trim();
      if (trimmed && !merged.includes(trimmed)) merged.push(trimmed);
    });
    return merged;
  }

  function parseIacharaBasicInfo(text) {
    const source = normalizeLineBreaks(text);
    const section = extractIacharaBasicInfoSection(source);
    const info = {};
    const segments = section
      .split('\n')
      .flatMap((line) => line.split(/[\/／]/))
      .map((part) => part.trim())
      .filter((part) => part.length);

    segments.forEach((segment) => {
      const match = segment.match(/^([^:：]+?)\s*[：:]\s*(.*)$/);
      if (!match) return;

      const rawKey = match[1].replace(/[【】\[\]]/g, '').trim();
      const rawValue = cleanIacharaBasicValue(match[2]);

      if (rawKey.includes('職業')) {
        if (rawValue) info.occupation = rawValue;
        return;
      }

      if (rawKey.includes('年齢')) {
        info.age = rawValue || '-';
        return;
      }

      if (rawKey.includes('性別')) {
        if (rawValue) info.gender = rawValue;
        return;
      }

      if (rawKey.includes('身長')) {
        if (rawValue) info.height = rawValue;
        return;
      }

      if (rawKey.includes('体重')) {
        if (rawValue) info.weight = rawValue;
        return;
      }

      if (rawKey.includes('タグ')) {
        const tags = parseTagInput(rawValue);
        if (tags.length) info.tags = tags;
        return;
      }

      if (rawKey.includes('テーマカラー')) {
        const color = extractThemeColorCode(rawValue);
        if (color) info.themeColor = color;
      }
    });

    const themeColorLine = section.match(/テーマカラー\s*[：:]\s*([^\n]+)/);
    if (themeColorLine) {
      const color = extractThemeColorCode(themeColorLine[1]);
      if (color) info.themeColor = color;
    }

    return info;
  }

  function cleanIacharaBasicValue(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function extractThemeColorCode(value) {
    const match = String(value || '').match(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/);
    return match ? match[0] : '';
  }

  function sanitizeThemeColorInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return extractThemeColorCode(raw) || raw.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7);
  }

  function isValidThemeColor(value) {
    return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(String(value || '').trim());
  }

  function extractIacharaBasicInfoSection(text) {
    const normalized = normalizeLineBreaks(text);
    const heading = normalized.search(/【\s*基本情報\s*】|\[\s*基本情報\s*\]|■\s*基本情報/);
    if (heading < 0) return normalized;

    const after = normalized.slice(heading).replace(/^.*(?:基本情報).*$/m, '');
    const next = after.search(/\n\s*(?:【[^】]+】|\[[^\]]+\]|■\s*[^\n]+)\s*\n?/);
    return next >= 0 ? after.slice(0, next) : after;
  }

  function normalizeLineBreaks(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function applyBasicInfoToDetailFields(info) {
    if (!info || !Object.keys(info).length) return false;

    if (info.occupation) $('detailOccupation').value = info.occupation;
    if (info.age) $('detailAge').value = info.age;
    if (info.gender) $('detailGender').value = info.gender;
    if (info.height) $('detailHeight').value = info.height;
    if (info.weight) $('detailWeight').value = info.weight;
    if (info.themeColor) {
      $('detailThemeColor').value = info.themeColor;
      CharaLibraRender.updateThemeSwatch(info.themeColor);
    } else if (!isValidThemeColor($('detailThemeColor').value)) {
      $('detailThemeColor').value = '';
      CharaLibraRender.updateThemeSwatch('');
    }
    if (info.tags && info.tags.length) {
      const merged = mergeTags(parseTagInput($('detailTags').value), info.tags);
      $('detailTags').value = merged.join(', ');
    }

    return true;
  }

  function applyBasicInfoToCharacter(character, info) {
    if (!character || !info) return;

    if (info.occupation) character.occupation = info.occupation;
    if (info.age) character.age = info.age;
    if (info.gender) character.gender = info.gender;
    if (info.height) character.height = info.height;
    if (info.weight) character.weight = info.weight;
    if (info.themeColor) {
      character.themeColor = info.themeColor;
    } else if (!isValidThemeColor(character.themeColor)) {
      character.themeColor = '';
    }
    if (info.tags && info.tags.length) character.tags = mergeTags(character.tags || [], info.tags);
  }
  function importDetailIconImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください');
      event.target.value = '';
      return;
    }

    const character = getSelected();
    if (!character) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        showToast('画像ファイルを読み込めませんでした');
        event.target.value = '';
        return;
      }

      character.iconUrl = dataUrl;
      character.timestamps = character.timestamps || {};
      character.timestamps.updatedAt = new Date().toISOString();

      CharaLibraStorage.saveCharacters(characters);
      render();
      CharaLibraRender.fillDetail(character);
      updateProfileFieldSizes();

      showToast('アイコン画像を更新しました');
      event.target.value = '';
    };

    reader.onerror = () => {
      showToast('画像ファイルを読み込めませんでした');
      event.target.value = '';
    };

    reader.readAsDataURL(file);
  }


  async function importIacharaTextToMemo(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const current = $('detailMemo').value.trim();
      $('detailMemo').value = current
        ? `${current}\n\n===== いあきゃらテキスト =====\n${text.trim()}`
        : text.trim();

      const info = parseIacharaBasicInfo(text);
      const updatedFields = applyBasicInfoToDetailFields(info);
      const character = getSelected();
      if (character) {
        applyBasicInfoToCharacter(character, info);
        character.memo = $('detailMemo').value;
        character.source = character.source || {};
        character.source.iacharaText = text;
        character.timestamps = character.timestamps || {};
        character.timestamps.iacharaImportedAt = new Date().toISOString();
        character.timestamps.updatedAt = new Date().toISOString();
        CharaLibraStorage.saveCharacters(characters);
        render();
        CharaLibraRender.fillDetail(character);
      }

      updateProfileFieldSizes();
      showToast(updatedFields ? 'いあきゃら基本情報とテキストを読み込みました' : 'いあきゃらテキストをキャラメモへ読み込みました');
    } catch (error) {
      showToast('いあきゃらテキストを読み込めませんでした');
    }
  }

  async function copyKomaData() {
    const character = getSelected();
    if (!character) return;
    saveDetailWithoutToast(character);
    const text = CharaLibraExport.stringify(character);
    try {
      await navigator.clipboard.writeText(text);
      $('manualCopyArea').hidden = true;
      showToast('CCFOLIA駒データをコピーしました');
    } catch (error) {
      $('manualCopyArea').hidden = false;
      $('manualCopyArea').value = text;
      $('manualCopyArea').select();
      showToast('自動コピーできませんでした。下の駒データを手動でコピーしてください。');
    }
  }

  function saveDetailWithoutToast(character) {
    character.name = $('detailNameInput').value.trim() || character.name;
    character.occupation = $('detailOccupation').value.trim();
    character.lifeStatus = $('detailLifeStatus').value;
    character.tags = parseTagInput($('detailTags').value);
    character.age = $('detailAge').value.trim();
    character.gender = $('detailGender').value.trim();
    character.height = $('detailHeight').value.trim();
    character.weight = $('detailWeight').value.trim();
    character.themeColor = extractThemeColorCode($('detailThemeColor').value.trim());
    character.externalUrl = $('detailExternalUrl').value.trim();
    character.memo = $('detailMemo').value;
    character.commands = buildDetailCommands(character);
    $('detailCommands').value = character.commands;
    character.skills = CharaLibraParser.extractSkills(character.commands);
    character.timestamps = character.timestamps || {};
    character.timestamps.updatedAt = new Date().toISOString();
    CharaLibraStorage.saveCharacters(characters);
    render();
  }

  function getSelected() {
    return characters.find((entry) => entry.id === selectedId);
  }

  function deleteSelectedCharacter() {
    const character = getSelected();
    if (!character) return;
    if (!confirm(`${character.name} を削除しますか？`)) return;
    characters = characters.filter((entry) => entry.id !== character.id);
    selectedId = '';
    persistAndRender();
    closeDetail();
    showToast('キャラクターを削除しました');
  }

  function exportLibrary() {
    const text = CharaLibraStorage.exportLibrary(characters);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chara-libra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('ライブラリーJSONを書き出しました');
  }

  async function importLibrary(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const imported = CharaLibraStorage.importLibrary(text);
      characters = imported;
      persistAndRender();
      showToast('ライブラリーJSONを読み込みました');
    } catch (error) {
      showToast(error.message || 'JSONを読み込めませんでした');
    }
  }

  async function loadSample() {
    try {
      const response = await fetch('samples/sample-character.json');
      const text = await response.text();
      $('jsonInput').value = text;
      showToast('サンプル駒データを入力欄に読み込みました');
    } catch (error) {
      $('jsonInput').value = JSON.stringify(sampleCharacter(), null, 2);
      showToast('サンプル駒データを入力欄に読み込みました');
    }
  }

  function sampleCharacter() {
    return {
      name: '九々宮 紗羅',
      externalUrl: 'https://example.com/chara/kugumiya-sara',
      iconUrl: '',
      memo: '職業：刑事\nプロフィール：捜査一課所属。明るい姉御肌。',
      status: [
        { label: 'HP', value: 12, max: 12 },
        { label: 'MP', value: 11, max: 11 },
        { label: 'SAN', value: 62, max: 99 },
      ],
      params: [
        { label: 'STR', value: 60 },
        { label: 'CON', value: 55 },
        { label: 'POW', value: 55 },
        { label: 'DEX', value: 70 },
        { label: 'APP', value: 65 },
        { label: 'SIZ', value: 60 },
        { label: 'INT', value: 75 },
        { label: 'EDU', value: 80 },
        { label: 'MOV', value: 8 },
      ],
      commands: 'CC<=70 【目星】\nCC<=65 【聞き耳】\nCC<=75 【図書館】\nCC<=60 【心理学】',
    };
  }

  function togglePanel(id) {
    const panel = $(id);
    const next = panel.hidden;
    closePanel(id === 'helpPanel' ? 'shortcutPanel' : 'helpPanel');
    panel.hidden = !next;
  }

  function closePanel(id) {
    const panel = $(id);
    if (panel) panel.hidden = true;
  }

  function toggleTheme() {
    const next = document.body.dataset.theme === 'light' ? 'night' : 'light';
    document.body.dataset.theme = next;
    localStorage.setItem('trpg-chara-libra-theme', next);
  }

  function restoreTheme() {
    const saved = localStorage.getItem('trpg-chara-libra-theme');
    if (saved) document.body.dataset.theme = saved;
  }

  function shareToX() {
    const text = 'Chara-Libra｜TRPG WEBツール観測所 でキャラクター情報を管理しました！\nhttps://kumachansteps.github.io/trpg-web-tools/tools/chara-libra/';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function updateProfileFieldSizes() {
    document.querySelectorAll('.detail-chip-field input').forEach((input) => {
      if (input.hidden || input.type === 'url') return;

      const raw = input.value || input.placeholder || '';
      const textLength = visualTextLength(raw);
      const min = input.id === 'detailTags' ? 10 : input.id === 'detailOccupation' ? 10 : input.id === 'detailThemeColor' ? 8 : 4;
      const max = input.id === 'detailTags' ? 36 : input.id === 'detailOccupation' ? 32 : input.id === 'detailThemeColor' ? 12 : 16;
      const units = Math.max(min, Math.min(max, textLength + 1));

      input.size = Math.ceil(units);
      input.style.width = `${units}em`;
    });
  }

  function visualTextLength(value) {
    return [...String(value || '')].reduce((total, char) => {
      return total + (/[ -~]/.test(char) ? 0.58 : 1);
    }, 0);
  }

  function showToast(message) {
    const toast = $('toast');
    const dialog = $('characterDialog');
    const dialogCard = dialog?.querySelector('.dialog-card');

    if (dialog?.open && dialogCard && toast.parentElement !== dialogCard) {
      dialogCard.appendChild(toast);
    } else if (!dialog?.open && toast.parentElement !== document.body) {
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
