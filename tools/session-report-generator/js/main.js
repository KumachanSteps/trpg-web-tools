(() => {
  const $ = id => document.getElementById(id);

  let lastPreviewSelection = { start: 0, end: 0 };
  let isResetting = false;
  let manualPreviewHeight = null;

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

  function populateReportStyles() {
    const select = $('reportStyle');
    if (!select || !window.ReportTemplate?.REPORT_STYLES) return;

    const current = select.value || 'classic';
    select.innerHTML = window.ReportTemplate.REPORT_STYLES
      .map(style => `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`)
      .join('');

    select.value = window.ReportTemplate.REPORT_STYLES.some(style => style.id === current)
      ? current
      : window.ReportTemplate.REPORT_STYLES[0]?.id || 'classic';
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
      <button class="icon-button add-inline" type="button">＋</button>
      <button class="icon-button danger-inline" type="button">×</button>
    `;

    $('gmContainer').appendChild(row);
    row.querySelector('.gm-role').value = role;
    row.querySelector('.add-inline').addEventListener('click', () => addGM());
    row.querySelector('.danger-inline').addEventListener('click', () => {
      row.remove();
      previewSelectedStyle();
    });
  }

  function slotBase() {
    return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'HO1';
  }

  function slotFor(index) {
    const base = slotBase();
    if (/^PC\d+$/i.test(base)) return 'PC' + index;
    if (/^HO\d+$/i.test(base)) return 'HO' + index;
    return base;
  }

  function slotOptions(selected, first) {
    const options = first ? ['PC', 'PC1', 'HO1', 'PC/PL', 'PL/PC', '自由'] : [selected];

    return options
      .map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`)
      .join('');
  }

  function syncSlots() {
    Array.from(document.querySelectorAll('#playerContainer .participant-row')).forEach((row, index) => {
      const select = row.querySelector('.player-slot');
      if (!select) return;

      if (index === 0) {
        const current = select.value || 'HO1';
        select.innerHTML = slotOptions(current, true);
        select.value = current;
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
    const first = index === 1;
    const selected = slot || slotFor(index);
    const row = document.createElement('div');

    row.className = 'participant-row name-order-' + $('nameInputOrder').value;
    row.innerHTML = `
      <div class="slot-field">
        <label>枠</label>
        <select class="player-slot" ${first ? '' : 'disabled'}>
          ${slotOptions(selected, first)}
        </select>
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

  function sample(index, type) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return type === 'pc' ? '探索者' + (letters[index] || index + 1) : 'PL名' + (letters[index] || index + 1);
  }

  function collectData(useSample = true) {
    const suffix = getSuffix();

    let gms = Array.from(document.querySelectorAll('#gmContainer .row')).map((row, index) => {
      const raw = row.querySelector('.gm-name').value.trim();

      return {
        role: row.querySelector('.gm-role').value || 'KP',
        name: addSuffix(raw || (useSample && index === 0 ? 'KP名' : ''), suffix)
      };
    }).filter(item => item.name);

    let players = Array.from(document.querySelectorAll('#playerContainer .participant-row')).map((row, index) => {
      const rawPc = row.querySelector('.pc-name').value.trim();
      const rawPl = row.querySelector('.pl-name').value.trim();

      return {
        slot: row.querySelector('.player-slot').value,
        ho: row.querySelector('.ho-name').value.trim(),
        pc: rawPc || (useSample ? sample(index, 'pc') : ''),
        pl: addSuffix(rawPl || (useSample ? sample(index, 'pl') : ''), suffix)
      };
    }).filter(item => item.pc || item.pl || item.ho);

    if (useSample && !gms.length) gms = [{ role: 'KP', name: 'KP名' }];
    if (useSample && !players.length) players = [{ slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' }];

    return {
      style: $('reportStyle').value || 'classic',
      fontVariant: $('fontVariant').value || 'plain',
      system: getSystemName(),
      scenario: $('scenarioTitle').value.trim() || (useSample ? 'シナリオ名' : ''),
      author: $('authorText').value.trim() || (useSample ? '作者名' : ''),
      result: $('resultText').value.trim() || (useSample ? 'END A 両生還' : ''),
      date: $('dateText').value.trim() || (useSample ? $('dateText').placeholder : ''),
      hashtags: $('hashtagText').value.trim(),
      gms,
      players
    };
  }

  function renderPreview() {
    const data = collectData(true);
    const variant = data.style === 'minimal' ? 'plain' : data.fontVariant;
    const output = window.ReportTemplate.render(data, value => styleText(value, variant));
    $('tweetPreview').value = output;
    updateCount();
    requestAnimationFrame(fitPreviewTextBox);
  }

  function previewSelectedStyle() {
    if (!isResetting) renderPreview();
  }

  function generateTweet() {
    renderPreview();
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
    const card = document.querySelector('.twitter-card');
    const wrap = document.querySelector('.preview-editor-wrap');

    if (!panel || !card || !wrap || window.innerWidth <= 920 || manualPreviewHeight) return;

    const h2 = panel.querySelector('h2');
    const head = card.querySelector('.tweet-head');
    const count = card.querySelector('.count-line');
    const buttons = card.querySelector('.preview-actions');
    const hint = panel.querySelector(':scope > .hint');

    const available =
      panel.clientHeight -
      (h2?.offsetHeight || 0) -
      (head?.offsetHeight || 0) -
      (count?.offsetHeight || 0) -
      (buttons?.offsetHeight || 0) -
      (hint?.offsetHeight || 0) -
      50;

    wrap.style.height = Math.max(window.innerHeight < 760 ? 180 : 240, Math.min(620, available)) + 'px';
  }

  function savePreviewSelection() {
    const preview = $('tweetPreview');
    lastPreviewSelection = {
      start: preview.selectionStart ?? preview.value.length,
      end: preview.selectionEnd ?? preview.value.length
    };
  }

  function insertAtCursor(text) {
    const preview = $('tweetPreview');
    const focused = document.activeElement === preview;
    const start = focused ? preview.selectionStart : lastPreviewSelection.start;
    const end = focused ? preview.selectionEnd : lastPreviewSelection.end;

    preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);

    const next = start + text.length;
    preview.focus();
    preview.selectionStart = next;
    preview.selectionEnd = next;
    lastPreviewSelection = { start: next, end: next };

    updateCount();
    requestAnimationFrame(fitPreviewTextBox);
  }

  function clearPreview() {
    $('tweetPreview').value = '';
    lastPreviewSelection = { start: 0, end: 0 };
    updateCount();
    $('tweetPreview').focus();
  }

  async function copyTweet() {
    const text = $('tweetPreview').value;

    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました。');
    } catch {
      $('tweetPreview').select();
      document.execCommand('copy');
      alert('コピーしました。');
    }
  }

  function setTodayPlaceholder() {
    const now = new Date();
    $('dateText').placeholder = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();
  }

  function updateCustomSystemInput() {
    $('customSystemText').classList.toggle('is-active', $('systemSelect').value === 'custom');
  }

  function resetAll() {
    isResetting = true;

    document.querySelectorAll('.input-panel input:not([type="checkbox"])').forEach(input => {
      input.value = '';
    });

    $('systemSelect').value = 'call_of_cthulhu';
    $('reportStyle').value = 'classic';
    $('fontVariant').value = 'sansBoldItalic';
    $('nameInputOrder').value = 'pcpl';

    document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
      input.checked = input.value === 'none';
    });

    $('gmContainer').innerHTML = '';
    $('playerContainer').innerHTML = '';
    addGM();
    addPlayer();

    manualPreviewHeight = null;
    document.querySelector('.preview-editor-wrap').style.height = '';
    setTodayPlaceholder();
    updateCustomSystemInput();
    clearPreview();

    isResetting = false;
    previewSelectedStyle();
  }

  function renderAsciiArtButtons() {
    const container = $('asciiArtContainer');
    const collection = window.ReportTemplate?.ASCII_ART_COLLECTION;

    if (!container || !collection) return;

    container.innerHTML = '';

    Object.entries(collection).forEach(([groupKey, group]) => {
      const groupElement = document.createElement('div');
      groupElement.className = 'ascii-group';
      groupElement.dataset.group = groupKey;

      const title = document.createElement('div');
      title.className = 'ascii-group-title';
      title.textContent = group.label || groupKey.toUpperCase();

      const buttons = document.createElement('div');
      buttons.className = 'ascii-buttons';

      group.items.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.addEventListener('click', () => insertAtCursor(item.value));
        buttons.appendChild(button);
      });

      groupElement.appendChild(title);
      groupElement.appendChild(buttons);
      container.appendChild(groupElement);
    });
  }

  function bindResizeGrab() {
    const grab = $('previewResizeGrab');
    const wrap = document.querySelector('.preview-editor-wrap');

    if (!grab || !wrap) return;

    let startY = 0;
    let startHeight = 0;

    grab.addEventListener('pointerdown', event => {
      startY = event.clientY;
      startHeight = wrap.offsetHeight;
      grab.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing-preview');
    });

    grab.addEventListener('pointermove', event => {
      if (!document.body.classList.contains('is-resizing-preview')) return;
      const next = Math.max(180, Math.min(760, startHeight + event.clientY - startY));
      manualPreviewHeight = next;
      wrap.style.height = next + 'px';
    });

    grab.addEventListener('pointerup', event => {
      document.body.classList.remove('is-resizing-preview');
      grab.releasePointerCapture(event.pointerId);
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
        previewSelectedStyle();
      });
    });

    $('addPlayerButton').addEventListener('click', () => addPlayer());
    $('generateButton').addEventListener('click', generateTweet);
    $('clearAllButton').addEventListener('click', resetAll);
    $('copyButton').addEventListener('click', copyTweet);
    $('newlineButton').addEventListener('click', () => insertAtCursor('\n'));
    $('spaceButton').addEventListener('click', () => insertAtCursor(' '));
    $('clearPreviewButton').addEventListener('click', clearPreview);

    $('reportStyle').addEventListener('change', previewSelectedStyle);
    $('fontVariant').addEventListener('change', previewSelectedStyle);
    $('nameInputOrder').addEventListener('change', () => {
      updateNameOrder();
      previewSelectedStyle();
    });

    $('systemSelect').addEventListener('change', () => {
      updateCustomSystemInput();
      if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
        document.querySelectorAll('.gm-role').forEach(role => {
          role.value = 'DL';
        });
      }
      previewSelectedStyle();
    });

    document.querySelector('.input-panel').addEventListener('input', previewSelectedStyle);

    $('tweetPreview').addEventListener('input', () => {
      savePreviewSelection();
      updateCount();
    });

    ['click', 'keyup', 'select'].forEach(eventName => {
      $('tweetPreview').addEventListener(eventName, savePreviewSelection);
    });

    bindResizeGrab();
  }

  function init() {
    populateReportStyles();
    bindEvents();
    addGM();
    addPlayer();
    setTodayPlaceholder();
    updateCustomSystemInput();
    renderAsciiArtButtons();
    previewSelectedStyle();
  }

  init();
})();
