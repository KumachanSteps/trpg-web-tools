(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  let isResetting = false;
  let lastPreviewSelection = { start: 0, end: 0 };
  let historyStack = [];
  let redoStack = [];
  let isApplyingHistory = false;
  let manualPreviewHeight = null;

  const FONT_VARIANTS = [
    { id: 'sansBoldItalic', label: '𝘼 ボールド + イタリック（サンセリフ）', tooltip: 'ボールド + イタリック（サンセリフ）', chipClass: 'f-sans-bi' },
    { id: 'sansBold', label: '𝗔 ボールド（サンセリフ）', tooltip: 'ボールド（サンセリフ）', chipClass: 'f-sans-b' },
    { id: 'sansItalic', label: '𝘈 イタリック（サンセリフ）', tooltip: 'イタリック（サンセリフ）', chipClass: 'f-sans-i' },
    { id: 'serifBoldItalic', label: '𝑨 ボールド + イタリック（セリフ）', tooltip: 'ボールド + イタリック（セリフ）', chipClass: 'f-serif-bi' },
    { id: 'serifBold', label: '𝐀 ボールド（セリフ）', tooltip: 'ボールド（セリフ）', chipClass: 'f-serif-b' },
    { id: 'serifItalic', label: '𝐴 イタリック（セリフ）', tooltip: 'イタリック（セリフ）', chipClass: 'f-serif-i' },
    { id: 'smallCaps', label: 'ᴀ スモールキャップ', tooltip: 'スモールキャップ', chipClass: 'f-smallcaps' },
    { id: 'typewriter', label: '𝙰 タイプライタースタイル（モノスペース）', tooltip: 'タイプライター（モノスペース）', chipClass: 'f-typewriter' },
    { id: 'modernSans', label: '𝖠 モダンスタイル（サンセリフ）', tooltip: 'モダン（サンセリフ）', chipClass: 'f-modern' },
    { id: 'plain', label: 'A 変換なし', tooltip: '変換なし', chipClass: 'f-plain' }
  ];

  const FONT_MAPS = {
    sansBoldItalic: { upper: 0x1D63C, lower: 0x1D656, digit: 0x1D7EC },
    sansBold: { upper: 0x1D5D4, lower: 0x1D5EE, digit: 0x1D7EC },
    sansItalic: { upper: 0x1D608, lower: 0x1D622, digit: null },
    serifBoldItalic: { upper: 0x1D468, lower: 0x1D482, digit: 0x1D7CE },
    serifBold: { upper: 0x1D400, lower: 0x1D41A, digit: 0x1D7CE },
    serifItalic: { upper: 0x1D434, lower: 0x1D44E, digit: null, lowerExceptions: { h: 'ℎ' } },
    typewriter: { upper: 0x1D670, lower: 0x1D68A, digit: 0x1D7F6 },
    modernSans: { upper: 0x1D5A0, lower: 0x1D5BA, digit: 0x1D7E2 },
    smallCaps: {
      chars: {
        A:'ᴀ',B:'ʙ',C:'ᴄ',D:'ᴅ',E:'ᴇ',F:'ꜰ',G:'ɢ',H:'ʜ',I:'ɪ',J:'ᴊ',K:'ᴋ',L:'ʟ',M:'ᴍ',N:'ɴ',O:'ᴏ',P:'ᴘ',Q:'ꞯ',R:'ʀ',S:'ꜱ',T:'ᴛ',U:'ᴜ',V:'ᴠ',W:'ᴡ',X:'x',Y:'ʏ',Z:'ᴢ',
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ꞯ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
      }
    }
  };

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

  function cp(ch, start, base) {
    return base === null ? ch : String.fromCodePoint(base + ch.charCodeAt(0) - start);
  }

  function styleText(text, variant) {
    const map = FONT_MAPS[variant];
    if (!map || variant === 'plain') return String(text || '');
    return Array.from(String(text || '').normalize('NFKD')).map(ch => {
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

  function populateReportStyles() {
    const select = $('reportStyle');
    const styles = window.ReportTemplate?.REPORT_STYLES || [];
    select.innerHTML = styles.map(style => `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`).join('');
  }

  function populateFontVariants() {
    const select = $('fontVariant');
    select.innerHTML = FONT_VARIANTS.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('');
    select.value = 'sansBoldItalic';
  }

  function renderFontToolbar() {
    const toolbar = $('fontToolbar');
    if (!toolbar) return;
    toolbar.innerHTML = '';
    FONT_VARIANTS.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `font-chip ${item.chipClass}`;
      button.dataset.variant = item.id;
      button.dataset.tooltip = item.tooltip;
      button.title = item.tooltip;
      button.textContent = 'A';
      button.addEventListener('click', () => {
        pushHistory();
        $('fontVariant').value = item.id;
        updateFontToolbarActive();
        previewSelectedStyle();
      });
      toolbar.appendChild(button);
    });
    updateFontToolbarActive();
  }

  function updateFontToolbarActive() {
    const value = $('fontVariant')?.value;
    document.querySelectorAll('.font-chip').forEach(button => {
      button.classList.toggle('is-active', button.dataset.variant === value);
    });
  }

  function renderAsciiArtButtons() {
    const container = $('asciiArtContainer');
    const collection = window.ReportTemplate?.ASCII_ART_COLLECTION;
    if (!container || !collection) return;

    container.innerHTML = '';
    Object.entries(collection).forEach(([groupKey, groupData]) => {
      const group = document.createElement('div');
      group.className = 'ascii-group';
      group.dataset.group = groupKey;

      const title = document.createElement('div');
      title.className = 'ascii-group-title';
      title.textContent = groupData.label || groupKey.toUpperCase();

      const buttons = document.createElement('div');
      buttons.className = 'ascii-buttons';

      (groupData.items || []).forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.title = item.value;
        button.dataset.decoration = item.value;
        if (String(item.value).length > 20) button.classList.add('ascii-chip-line');
        if (String(item.label).length > 10) button.classList.add('ascii-chip-wide');
        button.addEventListener('click', () => insertDecorationAtPreviewCursor(item.value));
        buttons.appendChild(button);
      });

      group.appendChild(title);
      group.appendChild(buttons);
      container.appendChild(group);
    });
  }

  function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  function setTodayPlaceholder() {
    $('dateText').placeholder = getTodayString();
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

  function sampleName(index, type) {
    const letters = ['A','B','C','D','E','F','G','H','I'];
    return type === 'pc' ? `探索者${letters[index] || index + 1}` : `PL名${letters[index] || index + 1}`;
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
      previewSelectedStyle();
    });
  }

  function baseSlot() {
    return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'HO1';
  }

  function slotFor(index) {
    const base = baseSlot();
    if (/^PC\d+$/i.test(base)) return `PC${index}`;
    if (/^HO\d+$/i.test(base)) return `HO${index}`;
    return base;
  }

  function buildSlotOptions(selected, isFirst) {
    const options = isFirst ? ['PC','PC1','HO1','PC/PL','PL/PC','自由'] : [selected];
    return options.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
  }

  function syncSlots() {
    Array.from(document.querySelectorAll('#playerContainer .participant-row')).forEach((row, index) => {
      const select = row.querySelector('.player-slot');
      if (!select) return;
      if (index === 0) {
        select.innerHTML = buildSlotOptions(select.value || 'HO1', true);
        select.disabled = false;
      } else {
        const slot = slotFor(index + 1);
        select.innerHTML = buildSlotOptions(slot, false);
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
    row.className = `participant-row name-order-${$('nameInputOrder').value}`;
    row.innerHTML = `
      <div class="slot-field">
        <label>枠</label>
        <select class="player-slot" ${isFirst ? '' : 'disabled'}>${buildSlotOptions(selected, isFirst)}</select>
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
      previewSelectedStyle();
    });
    row.querySelector('.delete-field').addEventListener('click', () => {
      row.remove();
      syncSlots();
      previewSelectedStyle();
    });
    syncSlots();
    updateNameOrder();
  }

  function collectData(useSample = true) {
    const suffix = getSuffix();
    let gms = Array.from(document.querySelectorAll('#gmContainer .row')).map((row, index) => {
      const raw = row.querySelector('.gm-name')?.value.trim() || '';
      return {
        role: row.querySelector('.gm-role')?.value || 'KP',
        name: addSuffix(raw || (useSample && index === 0 ? 'KP名' : ''), suffix)
      };
    }).filter(item => item.name);

    let players = Array.from(document.querySelectorAll('#playerContainer .participant-row')).map((row, index) => {
      const rawPc = row.querySelector('.pc-name')?.value.trim() || '';
      const rawPl = row.querySelector('.pl-name')?.value.trim() || '';
      return {
        slot: row.querySelector('.player-slot')?.value || 'HO1',
        ho: row.querySelector('.ho-name')?.value.trim() || '',
        pc: rawPc || (useSample ? sampleName(index, 'pc') : ''),
        pl: addSuffix(rawPl || (useSample ? sampleName(index, 'pl') : ''), suffix)
      };
    }).filter(item => item.pc || item.pl || item.ho);

    if (useSample && !gms.length) gms = [{ role: 'KP', name: 'KP名' }];
    if (useSample && !players.length) players = [{ slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' }];

    return {
      style: $('reportStyle').value || 'classic',
      fontVariant: $('fontVariant').value || 'sansBoldItalic',
      styleText,
      system: getSystemName(),
      scenario: $('scenarioTitle').value.trim() || (useSample ? 'シナリオ名' : ''),
      author: $('authorText').value.trim() || (useSample ? '作者名' : ''),
      result: $('resultText').value.trim() || (useSample ? 'END A 両生還' : ''),
      date: $('dateText').value.trim() || (useSample ? $('dateText').placeholder || getTodayString() : ''),
      hashtags: $('hashtagText').value.trim(),
      gms,
      players
    };
  }

  function renderPreview(text = null, push = false) {
    const preview = $('tweetPreview');
    if (!preview) return;
    if (push) pushHistory();
    const output = text !== null ? text : window.ReportTemplate.renderParts(collectData(true));
    preview.value = output;
    savePreviewSelection();
    updateCount();
    fitPreviewTextBox();
  }

  function previewSelectedStyle() {
    if (!isResetting) renderPreview();
  }

  function pushHistory() {
    if (isApplyingHistory) return;
    const preview = $('tweetPreview');
    if (!preview) return;
    const current = preview.value;
    if (!historyStack.length || historyStack[historyStack.length - 1] !== current) {
      historyStack.push(current);
      if (historyStack.length > 80) historyStack.shift();
    }
    redoStack = [];
  }

  function undoPreview() {
    const preview = $('tweetPreview');
    if (!preview || !historyStack.length) return;
    isApplyingHistory = true;
    redoStack.push(preview.value);
    preview.value = historyStack.pop();
    updateCount();
    savePreviewSelection();
    isApplyingHistory = false;
  }

  function redoPreview() {
    const preview = $('tweetPreview');
    if (!preview || !redoStack.length) return;
    isApplyingHistory = true;
    historyStack.push(preview.value);
    preview.value = redoStack.pop();
    updateCount();
    savePreviewSelection();
    isApplyingHistory = false;
  }

  function savePreviewSelection() {
    const preview = $('tweetPreview');
    if (!preview) return;
    lastPreviewSelection = {
      start: preview.selectionStart ?? preview.value.length,
      end: preview.selectionEnd ?? preview.value.length
    };
  }

  function insertDecorationAtPreviewCursor(text) {
    const preview = $('tweetPreview');
    if (!preview) return;
    pushHistory();
    const hasFocus = document.activeElement === preview;
    const start = hasFocus ? preview.selectionStart ?? preview.value.length : lastPreviewSelection.start ?? preview.value.length;
    const end = hasFocus ? preview.selectionEnd ?? preview.value.length : lastPreviewSelection.end ?? preview.value.length;
    preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);
    const next = start + String(text).length;
    preview.focus();
    preview.selectionStart = next;
    preview.selectionEnd = next;
    lastPreviewSelection = { start: next, end: next };
    updateCount();
  }

  function clearPreview() {
    pushHistory();
    $('tweetPreview').value = '';
    lastPreviewSelection = { start: 0, end: 0 };
    updateCount();
    $('tweetPreview').focus();
  }

  async function copyTweet() {
    const preview = $('tweetPreview');
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.value);
      alert('コピーしました。');
    } catch (e) {
      preview.select();
      document.execCommand('copy');
      alert('コピーしました。');
    }
  }

  function tweetLength(text) {
    let total = 0;
    for (const ch of Array.from(String(text || '').normalize('NFC'))) {
      const code = ch.codePointAt(0);
      total += (code <= 0x10FF || (code >= 0x2000 && code <= 0x201F) || (code >= 0x2032 && code <= 0x2037)) ? 1 : 2;
    }
    return total;
  }

  function updateCount() {
    const count = tweetLength($('tweetPreview').value);
    $('charCount').textContent = `${count} / 280`;
    $('limitStatus').textContent = count <= 280 ? 'OK' : `${count - 280}字オーバー`;
    $('limitStatus').className = count <= 280 ? 'count-ok' : 'count-bad';
  }

  function fitPreviewTextBox() {
    const text = $('tweetPreview');
    const panel = document.querySelector('.preview-panel');
    const card = document.querySelector('.twitter-card');
    if (!text || !panel || !card || window.innerWidth <= 920 || manualPreviewHeight) return;
    const h2 = panel.querySelector('h2')?.offsetHeight || 0;
    const head = card.querySelector('.tweet-head')?.offsetHeight || 0;
    const toolbar = card.querySelector('.font-toolbar')?.offsetHeight || 0;
    const count = card.querySelector('.count-line')?.offsetHeight || 0;
    const actions = card.querySelector('.preview-actions')?.offsetHeight || 0;
    const hint = panel.querySelector('.hint')?.offsetHeight || 0;
    const available = panel.clientHeight - h2 - head - toolbar - count - actions - hint - 54;
    text.style.height = `${Math.max(140, Math.min(620, available))}px`;
  }

  function bindPreviewResizer() {
    const handle = $('previewResizeHandle');
    const preview = $('tweetPreview');
    if (!handle || !preview) return;

    let startY = 0;
    let startH = 0;

    function move(e) {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      manualPreviewHeight = Math.max(180, Math.min(720, startH + clientY - startY));
      preview.style.height = `${manualPreviewHeight}px`;
    }

    function end() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
    }

    function start(e) {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startY = clientY;
      startH = preview.offsetHeight;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', end);
      e.preventDefault();
    }

    handle.addEventListener('mousedown', start);
    handle.addEventListener('touchstart', start, { passive: false });
  }

  function updateCustomSystemInput() {
    $('customSystemText').classList.toggle('is-active', $('systemSelect').value === 'custom');
  }

  function resetAll() {
    isResetting = true;
    document.querySelectorAll('.input-panel input:not([type="checkbox"])').forEach(input => { input.value = ''; });
    $('systemSelect').value = 'call_of_cthulhu';
    $('reportStyle').value = 'classic';
    $('fontVariant').value = 'sansBoldItalic';
    document.querySelectorAll('input[name="suffixChoice"]').forEach(input => { input.checked = input.value === 'none'; });
    $('nameInputOrder').value = 'pcpl';
    $('gmContainer').innerHTML = '';
    $('playerContainer').innerHTML = '';
    addGM();
    addPlayer();
    setTodayPlaceholder();
    updateCustomSystemInput();
    historyStack = [];
    redoStack = [];
    manualPreviewHeight = null;
    $('tweetPreview').style.height = '';
    isResetting = false;
    updateFontToolbarActive();
    renderPreview('');
  }


  function closeHeaderPanels() {
    const panels = ['usagePanel', 'shortcutPanel'];
    const buttons = ['usageToggleButton', 'shortcutToggleButton'];
    panels.forEach(id => {
      const panel = $(id);
      if (panel) panel.hidden = true;
    });
    buttons.forEach(id => {
      const button = $(id);
      if (button) {
        button.classList.remove('is-active');
        button.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function toggleHeaderPanel(panelId, buttonId) {
    const panel = $(panelId);
    const button = $(buttonId);
    if (!panel || !button) return;

    const willOpen = panel.hidden;
    closeHeaderPanels();

    if (willOpen) {
      panel.hidden = false;
      button.classList.add('is-active');
      button.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(fitPreviewTextBox);
    }
  }

  function cycleReportStyle(direction) {
    const select = $('reportStyle');
    if (!select || !select.options.length) return;

    const count = select.options.length;
    const current = select.selectedIndex < 0 ? 0 : select.selectedIndex;
    select.selectedIndex = (current + direction + count) % count;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function bindHeaderHelpEvents() {
    const usageButton = $('usageToggleButton');
    const shortcutButton = $('shortcutToggleButton');

    if (usageButton) {
      usageButton.addEventListener('click', () => toggleHeaderPanel('usagePanel', 'usageToggleButton'));
    }

    if (shortcutButton) {
      shortcutButton.addEventListener('click', () => toggleHeaderPanel('shortcutPanel', 'shortcutToggleButton'));
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeHeaderPanels();
        return;
      }

      const isMacShortcut = event.metaKey && event.altKey;
      const isWinShortcut = event.ctrlKey && event.altKey;
      if (!(isMacShortcut || isWinShortcut)) return;

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        cycleReportStyle(-1);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        cycleReportStyle(1);
      }
    });
  }

  function bindEvents() {
    window.clearAll = resetAll;
    window.addEventListener('resize', fitPreviewTextBox);
    bindHeaderHelpEvents();

    document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
      input.addEventListener('change', () => {
        document.querySelectorAll('input[name="suffixChoice"]').forEach(item => { item.checked = item === input; });
        previewSelectedStyle();
      });
    });

    $('addPlayerButton').addEventListener('click', () => addPlayer());
    $('generateButton').addEventListener('click', () => renderPreview(null, true));
    $('clearAllButton').addEventListener('click', resetAll);
    $('copyButton').addEventListener('click', copyTweet);
    $('undoButton').addEventListener('click', undoPreview);
    $('redoButton').addEventListener('click', redoPreview);
    $('clearPreviewButton').addEventListener('click', clearPreview);

    $('reportStyle').addEventListener('change', previewSelectedStyle);
    $('fontVariant').addEventListener('change', () => {
      updateFontToolbarActive();
      previewSelectedStyle();
    });
    $('nameInputOrder').addEventListener('change', () => {
      updateNameOrder();
      previewSelectedStyle();
    });
    $('systemSelect').addEventListener('change', () => {
      updateCustomSystemInput();
      if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
        document.querySelectorAll('.gm-role').forEach(role => { role.value = 'DL'; });
      }
      previewSelectedStyle();
    });

    document.querySelector('.input-panel').addEventListener('input', previewSelectedStyle);
    document.querySelector('.input-panel').addEventListener('change', previewSelectedStyle);

    const preview = $('tweetPreview');
    preview.addEventListener('beforeinput', pushHistory);
    preview.addEventListener('input', () => {
      savePreviewSelection();
      updateCount();
    });
    ['click', 'keyup', 'select', 'mouseup'].forEach(eventName => preview.addEventListener(eventName, savePreviewSelection));
  }

  function init() {
    populateReportStyles();
    populateFontVariants();
    renderFontToolbar();
    renderAsciiArtButtons();
    addGM();
    addPlayer();
    setTodayPlaceholder();
    updateCustomSystemInput();
    bindPreviewResizer();
    bindEvents();
    renderPreview();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
