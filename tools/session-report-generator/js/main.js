(() => {
  const $ = id => document.getElementById(id);

  const SYSTEM_NAMES = {
    call_of_cthulhu: 'Call of Cthulhu',
    coc: 'CoC',
    coc6: 'CoC6',
    coc7: 'CoC7',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー',
    shinobigami: 'シノビガミ',
    insane: 'インセイン',
    double_cross: 'ダブルクロス The 3rd Edition',
    sword_world_25: 'ソード・ワールド2.5',
    futari_sousa: 'フタリソウサ'
  };

  const FONT_MAPS = {
    sansBoldItalic: { label: 'BI', tooltip: 'ボールド + イタリック（サンセリフ）', upper: 0x1D63C, lower: 0x1D656, digit: 0x1D7EC },
    sansBold: { label: 'B', tooltip: 'ボールド（サンセリフ）', upper: 0x1D5D4, lower: 0x1D5EE, digit: 0x1D7EC },
    sansItalic: { label: 'I', tooltip: 'イタリック（サンセリフ）', upper: 0x1D608, lower: 0x1D622, digit: null },
    serifBoldItalic: { label: 'SBI', tooltip: 'ボールド + イタリック（セリフ）', upper: 0x1D468, lower: 0x1D482, digit: 0x1D7CE },
    serifBold: { label: 'SB', tooltip: 'ボールド（セリフ）', upper: 0x1D400, lower: 0x1D41A, digit: 0x1D7CE },
    serifItalic: { label: 'SI', tooltip: 'イタリック（セリフ）', upper: 0x1D434, lower: 0x1D44E, digit: null, lowerExceptions: { h: 'ℎ' } },
    smallCaps: {
      label: 'SC',
      tooltip: 'スモールキャップ',
      chars: {
        A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ꜰ', G: 'ɢ', H: 'ʜ', I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ꞯ', R: 'ʀ', S: 'ꜱ', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ',
        a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ꞯ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
      }
    },
    typewriter: { label: 'TW', tooltip: 'タイプライター（モノスペース）', upper: 0x1D670, lower: 0x1D68A, digit: 0x1D7F6 },
    modernSans: { label: 'MS', tooltip: 'モダン（サンセリフ）', upper: 0x1D5A0, lower: 0x1D5BA, digit: 0x1D7E2 },
    plain: { label: 'A', tooltip: '変換なし' }
  };

  let lastPreviewSelection = { start: 0, end: 0 };
  let isResetting = false;
  let undoStack = [];
  let redoStack = [];
  let isApplyingHistory = false;
  let manualPreviewHeight = null;
  let lastPreviewValue = '';

  function cp(ch, start, base) {
    return base === null ? ch : String.fromCodePoint(base + ch.charCodeAt(0) - start);
  }

  function styleText(text, variant) {
    const map = FONT_MAPS[variant];
    if (!map || variant === 'plain') return text;

    return Array.from(String(text).normalize('NFKD')).map(ch => {
      if (map.chars) return map.chars[ch] || ch;
      if (/[A-Z]/.test(ch)) return cp(ch, 65, map.upper);
      if (/[a-z]/.test(ch)) return map.lowerExceptions?.[ch] || cp(ch, 97, map.lower);
      if (/[0-9]/.test(ch)) return cp(ch, 48, map.digit);
      return ch;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getSystemName() {
    const key = $('systemSelect').value;
    if (key === 'custom') return $('customSystemText').value.trim() || 'システム名';
    return SYSTEM_NAMES[key] || key;
  }

  function getSuffix() {
    return document.querySelector('input[name="suffixChoice"]:checked')?.value || 'none';
  }

  function addSuffix(name, suffix) {
    const text = String(name || '').trim();
    if (!text || suffix === 'none' || text.endsWith(suffix)) return text;
    return text + suffix;
  }

  function sample(index, type) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    return type === 'pc' ? '探索者' + (letters[index] || index + 1) : 'PL名' + (letters[index] || index + 1);
  }

  function populateReportStyles() {
    const select = $('reportStyle');
    select.innerHTML = '';
    window.ReportTemplate.REPORT_STYLES.forEach(style => {
      const option = document.createElement('option');
      option.value = style.id;
      option.textContent = style.label;
      select.appendChild(option);
    });
  }

  function renderFontQuickButtons() {
    const container = $('fontQuickButtons');
    container.innerHTML = '';

    Array.from($('fontVariant').options).forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.fontVariant = option.value;
      const fontMeta = FONT_MAPS[option.value] || {};
      button.textContent = fontMeta.label || option.textContent.slice(0, 2);
      button.title = fontMeta.tooltip || option.textContent;
      button.dataset.tooltip = fontMeta.tooltip || option.textContent;
      button.addEventListener('click', () => {
        $('fontVariant').value = option.value;
        updateFontQuickActive();
        renderPreviewFromInputs(true);
      });
      container.appendChild(button);
    });

    updateFontQuickActive();
  }

  function updateFontQuickActive() {
    document.querySelectorAll('#fontQuickButtons button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.fontVariant === $('fontVariant').value);
    });
  }

  function addGM(value = '', role = 'KP') {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div>
        <label>役割</label>
        <select class="gm-role">
          <option value="KP">KP</option>
          <option value="DL">DL</option>
          <option value="GM">GM</option>
          <option value="KPC/KP">KPC/KP</option>
          <option value="SKP">SKP</option>
          <option value="作/KP">作/KP</option>
          <option value="進行">進行</option>
        </select>
      </div>
      <div>
        <label>名前</label>
        <input class="gm-name" value="${escapeHtml(value)}" placeholder="例：KPC名 / KP名">
      </div>
      <button class="icon-button add-inline" type="button" aria-label="進行役を追加">＋</button>
      <button class="icon-button danger-inline" type="button" aria-label="削除">×</button>
    `;
    $('gmContainer').appendChild(row);
    row.querySelector('.gm-role').value = role;
    row.querySelector('.add-inline').addEventListener('click', () => addGM());
    row.querySelector('.danger-inline').addEventListener('click', () => {
      row.remove();
      renderPreviewFromInputs(true);
    });
  }

  function slotBase() {
    return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'HO1';
  }

  function participantHeaderChoice() {
    const selected = document.querySelector('#playerContainer .participant-row .player-slot')?.value || '';
    return selected === 'PC/PL' || selected === 'PL/PC' ? selected : '';
  }

  function slotFor(index) {
    const base = slotBase();
    if (/^PC\d+$/i.test(base)) return 'PC' + index;
    if (/^HO\d+$/i.test(base)) return 'HO' + index;
    return base;
  }

  function slotOptions(selected, isFirst) {
    const options = isFirst ? ['PC', 'PC1', 'HO1', 'PC/PL', 'PL/PC', '自由'] : [selected];
    return options.map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('');
  }

  function syncSlots() {
    Array.from(document.querySelectorAll('#playerContainer .participant-row')).forEach((row, index) => {
      const select = row.querySelector('.player-slot');
      if (!select) return;

      if (index === 0) {
        select.innerHTML = slotOptions(select.value || 'HO1', true);
        select.disabled = false;
      } else {
        const slot = slotFor(index + 1);
        select.innerHTML = slotOptions(slot, false);
        select.value = slot;
        select.disabled = true;
      }
    });
  }

  function updateNameOrder() {
    const order = $('nameInputOrder').value;
    document.querySelectorAll('.participant-row').forEach(row => {
      row.classList.toggle('name-order-plpc', order === 'plpc');
      row.classList.toggle('name-order-pcpl', order === 'pcpl');
    });
  }

  function addPlayer(pl = '', pc = '', slot = '', ho = '') {
    const index = document.querySelectorAll('#playerContainer .participant-row').length + 1;
    const isFirst = index === 1;
    const selected = slot || slotFor(index);
    const row = document.createElement('div');
    row.className = 'participant-row name-order-' + $('nameInputOrder').value;
    row.innerHTML = `
      <div class="slot-field">
        <label>枠</label>
        <select class="player-slot" ${isFirst ? '' : 'disabled'}>${slotOptions(selected, isFirst)}</select>
      </div>
      <div class="ho-field">
        <label>HO補足</label>
        <input class="ho-name" value="${escapeHtml(ho)}" placeholder="通常は空欄でOK">
      </div>
      <div class="pc-field">
        <label>PC名</label>
        <input class="pc-name" value="${escapeHtml(pc)}" placeholder="例：探索者名">
      </div>
      <div class="pl-field">
        <label>PL名</label>
        <input class="pl-name" value="${escapeHtml(pl)}" placeholder="例：佐藤">
      </div>
      <button class="danger delete-field" type="button">×</button>
    `;
    $('playerContainer').appendChild(row);
    row.querySelector('.player-slot').addEventListener('change', () => {
      syncSlots();
      renderPreviewFromInputs(true);
    });
    row.querySelector('.delete-field').addEventListener('click', () => {
      row.remove();
      syncSlots();
      renderPreviewFromInputs(true);
    });
    syncSlots();
    updateNameOrder();
  }

  function collectData() {
    const suffix = getSuffix();
    let gms = Array.from(document.querySelectorAll('#gmContainer .row')).map((row, index) => {
      const rawName = row.querySelector('.gm-name').value.trim();
      return {
        role: row.querySelector('.gm-role').value || 'KP',
        name: addSuffix(rawName || (index === 0 ? 'KP名' : ''), suffix)
      };
    }).filter(item => item.name);

    let players = Array.from(document.querySelectorAll('#playerContainer .participant-row')).map((row, index) => {
      const rawPc = row.querySelector('.pc-name').value.trim();
      const rawPl = row.querySelector('.pl-name').value.trim();
      return {
        slot: row.querySelector('.player-slot').value,
        ho: row.querySelector('.ho-name').value.trim(),
        pc: rawPc || sample(index, 'pc'),
        pl: addSuffix(rawPl || sample(index, 'pl'), suffix)
      };
    }).filter(item => item.pc || item.pl || item.ho);

    if (!gms.length) gms = [{ role: 'KP', name: 'KP名' }];
    if (!players.length) players = [{ slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' }];

    return {
      style: $('reportStyle').value,
      fontVariant: $('fontVariant').value,
      participantHeader: participantHeaderChoice(),
      system: getSystemName(),
      scenario: $('scenarioTitle').value.trim() || 'シナリオ名',
      author: $('authorText').value.trim() || '作者名',
      result: $('resultText').value.trim() || 'END A 両生還',
      date: $('dateText').value.trim() || $('dateText').placeholder || getTodayString(),
      hashtags: $('hashtagText').value.trim(),
      gms,
      players
    };
  }

  function renderPreviewFromInputs(saveHistory = false) {
    if (isResetting) return;
    const output = window.ReportTemplate.renderParts(collectData(), styleText);
    setPreviewValue(output, saveHistory);
  }

  function setPreviewValue(value, saveHistory = true) {
    const preview = $('tweetPreview');
    if (saveHistory && preview.value !== value) pushUndo(preview.value);
    isApplyingHistory = true;
    preview.value = value;
    isApplyingHistory = false;
    lastPreviewValue = value;
    savePreviewSelection();
    updateCount();
    requestAnimationFrame(fitPreviewTextBox);
  }

  function pushUndo(value) {
    if (undoStack[undoStack.length - 1] !== value) undoStack.push(value);
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function undoPreview() {
    const preview = $('tweetPreview');
    if (!undoStack.length) return;
    redoStack.push(preview.value);
    const value = undoStack.pop();
    isApplyingHistory = true;
    preview.value = value;
    isApplyingHistory = false;
    lastPreviewValue = value;
    updateCount();
    savePreviewSelection();
    lastPreviewValue = $('tweetPreview').value;
    updateHistoryButtons();
  }

  function redoPreview() {
    const preview = $('tweetPreview');
    if (!redoStack.length) return;
    undoStack.push(preview.value);
    const value = redoStack.pop();
    isApplyingHistory = true;
    preview.value = value;
    isApplyingHistory = false;
    lastPreviewValue = value;
    updateCount();
    savePreviewSelection();
    lastPreviewValue = $('tweetPreview').value;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $('undoButton').disabled = !undoStack.length;
    $('redoButton').disabled = !redoStack.length;
  }

  function tweetLength(text) {
    let total = 0;
    for (const ch of Array.from(String(text).normalize('NFC'))) {
      const code = ch.codePointAt(0);
      total += (code <= 0x10FF || (code >= 0x2000 && code <= 0x201F) || (code >= 0x2032 && code <= 0x2037)) ? 1 : 2;
    }
    return total;
  }

  function updateCount() {
    const count = tweetLength($('tweetPreview').value);
    $('charCount').textContent = count + ' / 280';
    $('limitStatus').textContent = count <= 280 ? 'OK' : (count - 280) + '字オーバー';
    $('limitStatus').className = count <= 280 ? 'count-ok' : 'count-bad';
  }

  function fitPreviewTextBox() {
    const panel = document.querySelector('.preview-panel');
    const wrap = document.querySelector('.preview-textbox-wrap');
    if (!panel || !wrap || window.innerWidth <= 920) return;
    if (manualPreviewHeight !== null) {
      wrap.style.height = manualPreviewHeight + 'px';
      return;
    }

    const card = document.querySelector('.twitter-card');
    const head = card.querySelector('.tweet-head');
    const fonts = card.querySelector('.font-quick-buttons');
    const count = card.querySelector('.count-line');
    const buttons = card.querySelector('.preview-actions');
    const available = panel.clientHeight
      - (panel.querySelector('h2')?.offsetHeight || 0)
      - (head?.offsetHeight || 0)
      - (fonts?.offsetHeight || 0)
      - (count?.offsetHeight || 0)
      - (buttons?.offsetHeight || 0)
      - 64;
    wrap.style.height = Math.max(window.innerHeight < 760 ? 210 : 280, available) + 'px';
  }

  function savePreviewSelection() {
    const preview = $('tweetPreview');
    lastPreviewSelection = {
      start: preview.selectionStart ?? preview.value.length,
      end: preview.selectionEnd ?? preview.value.length
    };
  }

  function insertDecorationAtPreviewCursor(text) {
    const preview = $('tweetPreview');
    const focused = document.activeElement === preview;
    const start = focused ? preview.selectionStart : lastPreviewSelection.start;
    const end = focused ? preview.selectionEnd : lastPreviewSelection.end;
    pushUndo(preview.value);
    preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);
    const next = start + text.length;
    preview.focus();
    preview.selectionStart = next;
    preview.selectionEnd = next;
    lastPreviewSelection = { start: next, end: next };
    updateCount();
    requestAnimationFrame(fitPreviewTextBox);
  }

  function renderAsciiArtButtons() {
    const container = $('asciiArtContainer');
    const collection = window.ReportTemplate.ASCII_ART_COLLECTION;
    container.innerHTML = '';
    Object.entries(collection).forEach(([key, groupData]) => {
      const group = document.createElement('div');
      group.className = 'ascii-group';
      group.dataset.group = key;

      const title = document.createElement('div');
      title.className = 'ascii-group-title';
      title.textContent = groupData.label || key.toUpperCase();

      const buttons = document.createElement('div');
      buttons.className = 'ascii-buttons';

      groupData.items.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ascii-art-chip';
        button.textContent = item.display || item.label;
        button.title = item.tooltip || item.value;
        button.dataset.tooltip = item.tooltip || item.value;
        button.dataset.decoration = item.value;
        button.addEventListener('click', () => insertDecorationAtPreviewCursor(item.value));
        buttons.appendChild(button);
      });

      group.appendChild(title);
      group.appendChild(buttons);
      container.appendChild(group);
    });
  }

  function clearPreview() {
    pushUndo($('tweetPreview').value);
    $('tweetPreview').value = '';
    lastPreviewValue = '';
    lastPreviewSelection = { start: 0, end: 0 };
    updateCount();
    updateHistoryButtons();
    $('tweetPreview').focus();
  }

  async function copyTweet() {
    try {
      await navigator.clipboard.writeText($('tweetPreview').value);
      alert('コピーしました。');
    } catch {
      $('tweetPreview').select();
      document.execCommand('copy');
      alert('コピーしました。');
    }
  }

  function getTodayString() {
    const now = new Date();
    return now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();
  }

  function setTodayPlaceholder() {
    $('dateText').placeholder = getTodayString();
  }

  function updateCustomSystemInput() {
    $('customSystemText').classList.toggle('is-active', $('systemSelect').value === 'custom');
  }

  function resetAll() {
    isResetting = true;
    document.querySelectorAll('.input-panel input:not([type="checkbox"])').forEach(input => { input.value = ''; });
    $('systemSelect').value = 'call_of_cthulhu';
    $('reportStyle').value = window.ReportTemplate.REPORT_STYLES[0].id;
    $('fontVariant').value = 'sansBoldItalic';
    $('nameInputOrder').value = 'pcpl';
    document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
      input.checked = input.value === 'none';
    });
    $('gmContainer').innerHTML = '';
    $('playerContainer').innerHTML = '';
    addGM();
    addPlayer();
    setTodayPlaceholder();
    updateCustomSystemInput();
    manualPreviewHeight = null;
    undoStack = [];
    redoStack = [];
    isResetting = false;
    renderPreviewFromInputs(false);
    updateFontQuickActive();
    updateHistoryButtons();
  }

  function bindPreviewResize() {
    const grip = $('previewResizeGrip');
    const wrap = document.querySelector('.preview-textbox-wrap');
    let startY = 0;
    let startHeight = 0;

    grip.addEventListener('pointerdown', event => {
      startY = event.clientY;
      startHeight = wrap.getBoundingClientRect().height;
      grip.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing-preview');
    });

    grip.addEventListener('pointermove', event => {
      if (!grip.hasPointerCapture(event.pointerId)) return;
      const next = Math.max(180, Math.min(900, startHeight + event.clientY - startY));
      manualPreviewHeight = next;
      wrap.style.height = next + 'px';
    });

    grip.addEventListener('pointerup', event => {
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
      document.body.classList.remove('is-resizing-preview');
    });
  }

  function bindEvents() {
    window.clearAll = resetAll;
    window.addEventListener('resize', fitPreviewTextBox);

    document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
      input.addEventListener('change', () => {
        document.querySelectorAll('input[name="suffixChoice"]').forEach(item => {
          item.checked = item === input;
        });
        renderPreviewFromInputs(true);
      });
    });

    $('addPlayerButton').addEventListener('click', () => {
      addPlayer();
      renderPreviewFromInputs(true);
    });
    $('generateButton').addEventListener('click', () => renderPreviewFromInputs(true));
    $('clearAllButton').addEventListener('click', resetAll);
    $('copyButton').addEventListener('click', copyTweet);
    $('undoButton').addEventListener('click', undoPreview);
    $('redoButton').addEventListener('click', redoPreview);
    $('clearPreviewButton').addEventListener('click', clearPreview);

    $('reportStyle').addEventListener('change', () => renderPreviewFromInputs(true));
    $('fontVariant').addEventListener('change', () => {
      updateFontQuickActive();
      renderPreviewFromInputs(true);
    });
    $('nameInputOrder').addEventListener('change', () => {
      updateNameOrder();
      renderPreviewFromInputs(true);
    });
    $('systemSelect').addEventListener('change', () => {
      updateCustomSystemInput();
      if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
        document.querySelectorAll('.gm-role').forEach(role => { role.value = 'DL'; });
      }
      renderPreviewFromInputs(true);
    });
    document.querySelector('.input-panel').addEventListener('input', () => renderPreviewFromInputs(true));

    $('tweetPreview').addEventListener('beforeinput', () => {
      if (!isApplyingHistory) pushUndo($('tweetPreview').value);
    });
    $('tweetPreview').addEventListener('input', () => {
      lastPreviewValue = $('tweetPreview').value;
      savePreviewSelection();
      updateCount();
      updateHistoryButtons();
    });
    ['click', 'keyup', 'select'].forEach(eventName => $('tweetPreview').addEventListener(eventName, savePreviewSelection));

    bindPreviewResize();
  }

  function init() {
    populateReportStyles();
    renderFontQuickButtons();
    renderAsciiArtButtons();
    bindEvents();
    addGM();
    addPlayer();
    setTodayPlaceholder();
    updateCustomSystemInput();
    renderPreviewFromInputs(false);
    savePreviewSelection();
    lastPreviewValue = $('tweetPreview').value;
    updateHistoryButtons();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
