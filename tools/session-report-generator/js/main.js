let lastPreviewSelection = { start: 0, end: 0 };
let isResetting = false;
const $ = id => document.getElementById(id);

const fontVariantMaps = {
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
  const map = fontVariantMaps[variant];
  if (!map || variant === 'plain') return text;
  return Array.from(String(text).normalize('NFKD')).map(ch => {
    if (map.chars) return map.chars[ch] || ch;
    if (/[A-Z]/.test(ch)) return cp(ch, 65, map.upper);
    if (/[a-z]/.test(ch)) return map.lowerExceptions?.[ch] || cp(ch, 97, map.lower);
    if (/[0-9]/.test(ch)) return cp(ch, 48, map.digit);
    return ch;
  }).join('');
}

function suffixName(name, suffix) {
  const text = String(name || '').trim();
  return !text || suffix === 'none' || text.endsWith(suffix) ? text : `${text}${suffix}`;
}

function getSelectedSuffix() {
  return document.querySelector('input[name="suffixChoice"]:checked')?.value || 'none';
}

function selectSuffix(target) {
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.checked = input === target;
  });
  previewSelectedStyle();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSystemText(mode = 'normal') {
  const key = $('systemSelect').value;
  if (key === 'custom') return $('customSystemText').value.trim() || 'システム名';
  return window.ReportParser?.systemMaps?.[mode]?.[key] || window.ReportParser?.systemMaps?.normal?.[key] || key;
}

function renderReportStyleOptions() {
  const select = $('reportStyle');
  if (!select || !window.ReportTemplate?.REPORT_STYLES) return;
  select.innerHTML = window.ReportTemplate.REPORT_STYLES
    .map(style => `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`)
    .join('');
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

    const buttonWrap = document.createElement('div');
    buttonWrap.className = 'ascii-buttons';

    groupData.items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.decoration = item.value;
      button.addEventListener('click', () => insertDecorationAtPreviewCursor(item.value));
      buttonWrap.appendChild(button);
    });

    group.appendChild(title);
    group.appendChild(buttonWrap);
    container.appendChild(group);
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
    <button class="icon-button danger-inline" type="button" aria-label="削除">×</button>`;
  $('gmContainer').appendChild(row);
  row.querySelector('.gm-role').value = role;
  row.querySelector('.add-inline').addEventListener('click', () => addGM());
  row.querySelector('.danger-inline').addEventListener('click', () => {
    row.remove();
    previewSelectedStyle();
  });
}

function getParticipantBaseSlot() {
  return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'PC1';
}

function getParticipantSlotForIndex(index) {
  const base = getParticipantBaseSlot();
  if (/^PC[0-9]+$/i.test(base)) return `PC${index}`;
  if (/^HO[0-9]+$/i.test(base)) return `HO${index}`;
  return base;
}

function buildSlotOptions(selected = 'PC1', isFirst = false) {
  const options = isFirst ? ['PC', 'PC1', 'HO1', 'PC/PL', 'PL/PC', '自由'] : [selected];
  return options.map(value => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('');
}

function syncParticipantSlots() {
  [...document.querySelectorAll('#playerContainer .participant-row')].forEach((row, index) => {
    const select = row.querySelector('.player-slot');
    if (!select) return;
    if (index === 0) {
      select.innerHTML = buildSlotOptions(select.value || 'PC1', true);
      select.disabled = false;
    } else {
      const slot = getParticipantSlotForIndex(index + 1);
      select.innerHTML = buildSlotOptions(slot);
      select.value = slot;
      select.disabled = true;
    }
  });
}

function addPlayer(pl = '', pc = '', slot = '', ho = '') {
  const container = $('playerContainer');
  const index = container.querySelectorAll('.participant-row').length + 1;
  const isFirst = index === 1;
  const selected = slot || getParticipantSlotForIndex(index);
  const row = document.createElement('div');
  row.className = `participant-row name-order-${$('nameInputOrder')?.value || 'pcpl'}`;
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
    <button class="danger delete-field" type="button">×</button>`;
  container.appendChild(row);
  row.querySelector('.player-slot').addEventListener('change', () => {
    syncParticipantSlots();
    previewSelectedStyle();
  });
  row.querySelector('.delete-field').addEventListener('click', () => {
    row.remove();
    syncParticipantSlots();
    previewSelectedStyle();
  });
  syncParticipantSlots();
  updateNameInputOrder();
}

function updateNameInputOrder() {
  const order = $('nameInputOrder')?.value || 'pcpl';
  document.querySelectorAll('.participant-row').forEach(row => {
    row.classList.toggle('name-order-plpc', order === 'plpc');
    row.classList.toggle('name-order-pcpl', order === 'pcpl');
  });
}

function samplePlayerName(index, type) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const letter = letters[index] || String(index + 1);
  return type === 'pc' ? `探索者${letter}` : `PL名${letter}`;
}

function getFieldValue(id, useSample, sampleValue) {
  const value = $(id).value.trim();
  return value || (useSample ? sampleValue : '');
}

function collectData(useSample = false) {
  const suffix = getSelectedSuffix();
  let gms = [...document.querySelectorAll('#gmContainer .row')].map((row, index) => {
    const raw = row.querySelector('.gm-name').value.trim();
    return {
      role: row.querySelector('.gm-role').value || 'KP',
      name: suffixName(raw || (useSample && index === 0 ? 'KP名' : ''), suffix)
    };
  }).filter(item => item.name);

  let players = [...document.querySelectorAll('#playerContainer .participant-row')].map((row, index) => {
    const rawPc = row.querySelector('.pc-name').value.trim();
    const rawPl = row.querySelector('.pl-name').value.trim();
    return {
      slot: row.querySelector('.player-slot').value,
      ho: row.querySelector('.ho-name').value.trim(),
      pc: rawPc || (useSample ? samplePlayerName(index, 'pc') : ''),
      pl: suffixName(rawPl || (useSample ? samplePlayerName(index, 'pl') : ''), suffix)
    };
  }).filter(item => item.pl || item.pc || item.ho);

  if (useSample) {
    if (!gms.length) gms = [{ role: 'KP', name: 'KP名' }];
    if (!players.length) players = [{ slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' }];
  }

  return {
    style: $('reportStyle').value,
    fontVariant: $('fontVariant').value,
    system: getSystemText('normal'),
    systemShort: getSystemText('short'),
    systemLower: getSystemText('lower'),
    systemBold: getSystemText('bold'),
    scenario: getFieldValue('scenarioTitle', useSample, 'シナリオ名'),
    result: getFieldValue('resultText', useSample, 'END A 両生還'),
    author: getFieldValue('authorText', useSample, '作者名 様'),
    date: getFieldValue('dateText', useSample, $('dateText').placeholder || getTodayString()),
    hashtags: $('hashtagText').value.trim(),
    gms,
    players
  };
}

function hasUserInput() {
  return ['scenarioTitle', 'resultText', 'authorText', 'dateText', 'hashtagText']
    .some(id => $(id).value.trim())
    || [...document.querySelectorAll('#gmContainer input,#playerContainer input')].some(input => input.value.trim());
}

function renderPreview(rawText = null) {
  const data = collectData(!hasUserInput());
  const text = rawText ?? window.ReportTemplate.renderTemplate(data, styleText);
  $('tweetPreview').value = text;
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function generateTweet(options = {}) {
  const data = collectData(Boolean(options.useSampleFallback));
  $('tweetPreview').value = window.ReportTemplate.renderTemplate(data, styleText);
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function previewSelectedStyle() {
  if (isResetting) return;
  if ($('reportStyle').value === 'ho-focus') {
    const first = document.querySelector('#playerContainer .participant-row .player-slot');
    if (first && first.value !== 'HO1') {
      first.value = 'HO1';
      syncParticipantSlots();
    }
  }
  generateTweet({ useSampleFallback: true });
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

  const hasFocus = document.activeElement === preview;
  const start = hasFocus ? preview.selectionStart ?? preview.value.length : lastPreviewSelection.start ?? preview.value.length;
  const end = hasFocus ? preview.selectionEnd ?? preview.value.length : lastPreviewSelection.end ?? preview.value.length;

  preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);
  const nextPos = start + text.length;

  preview.focus();
  preview.selectionStart = nextPos;
  preview.selectionEnd = nextPos;
  lastPreviewSelection = { start: nextPos, end: nextPos };
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function insertAtCursor(text) {
  insertDecorationAtPreviewCursor(text);
}

function clearPreview() {
  $('tweetPreview').value = '';
  lastPreviewSelection = { start: 0, end: 0 };
  updateCount();
  $('tweetPreview').focus();
}

async function copyTweet() {
  try {
    await navigator.clipboard.writeText($('tweetPreview').value);
    alert('コピーしました。');
  } catch (error) {
    $('tweetPreview').select();
    document.execCommand('copy');
    alert('コピーしました。');
  }
}

function getTweetWeightedLength(text) {
  let total = 0;
  for (const ch of Array.from(text.normalize('NFC'))) {
    const cp = ch.codePointAt(0);
    if (cp === 10 || cp === 13 || cp <= 0x10FF || (cp >= 0x2000 && cp <= 0x200D) || (cp >= 0x2010 && cp <= 0x201F) || (cp >= 0x2032 && cp <= 0x2037)) total += 1;
    else total += 2;
  }
  return total;
}

function updateCount() {
  const count = getTweetWeightedLength($('tweetPreview').value);
  const status = $('limitStatus');
  $('charCount').textContent = `${count} / 280`;
  status.textContent = count <= 280 ? 'OK' : `${count - 280}字オーバー`;
  status.className = count <= 280 ? 'count-ok' : 'count-bad';
}

function fitPreviewTextBox() {
  const panel = document.querySelector('.preview-panel');
  const card = document.querySelector('.twitter-card');
  const text = $('tweetPreview');
  if (!panel || !card || !text || window.innerWidth <= 980) return;
  const h2 = panel.querySelector('h2');
  const head = card.querySelector('.tweet-head');
  const count = card.querySelector('.count-line');
  const buttons = card.querySelector('.btns');
  const chrome = 32 + (h2?.offsetHeight || 0) + (head?.offsetHeight || 0) + (count?.offsetHeight || 0) + (buttons?.offsetHeight || 0);
  const available = panel.clientHeight - chrome;
  const minHeight = window.innerHeight < 760 ? 150 : 180;
  text.style.height = `${Math.max(minHeight, Math.min(360, available))}px`;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function setTodayPlaceholder() {
  $('dateText').placeholder = getTodayString();
}

function updateCustomSystemInput() {
  const input = $('customSystemText');
  if (input) input.classList.toggle('is-active', $('systemSelect').value === 'custom');
}

function resetFormState() {
  isResetting = true;
  document.querySelectorAll('.input-panel input:not([type="checkbox"])').forEach(input => { input.value = ''; });
  $('systemSelect').value = 'call_of_cthulhu';
  updateCustomSystemInput();
  $('reportStyle').value = 'classic';
  $('fontVariant').value = 'sansBoldItalic';
  $('nameInputOrder').value = 'pcpl';
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => { input.checked = input.value === 'none'; });
  $('gmContainer').innerHTML = '';
  $('playerContainer').innerHTML = '';
  $('tweetPreview').value = '';
  updateCount();
  addGM();
  addPlayer();
  setTodayPlaceholder();
  isResetting = false;
}

window.clearAll = resetFormState;

function bindAsciiArtEvents() {
  renderAsciiArtButtons();
  const preview = $('tweetPreview');
  if (!preview) return;
  preview.addEventListener('click', savePreviewSelection);
  preview.addEventListener('keyup', savePreviewSelection);
  preview.addEventListener('select', savePreviewSelection);
  preview.addEventListener('input', () => {
    savePreviewSelection();
    updateCount();
  });
}

function bindEvents() {
  window.addEventListener('resize', fitPreviewTextBox);
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.addEventListener('change', () => selectSuffix(input));
  });
  $('addPlayerButton').addEventListener('click', () => addPlayer());
  $('generateButton').addEventListener('click', () => generateTweet());
  $('clearAllButton').addEventListener('click', resetFormState);
  $('copyButton').addEventListener('click', copyTweet);
  $('newlineButton').addEventListener('click', () => insertAtCursor('\n'));
  $('spaceButton').addEventListener('click', () => insertAtCursor(' '));
  $('clearPreviewButton').addEventListener('click', clearPreview);
  $('reportStyle').addEventListener('change', previewSelectedStyle);
  $('fontVariant').addEventListener('change', previewSelectedStyle);
  $('nameInputOrder').addEventListener('change', () => {
    updateNameInputOrder();
    previewSelectedStyle();
  });
  document.querySelector('.input-panel').addEventListener('input', event => {
    if (!isResetting && event.target.id !== 'tweetPreview') previewSelectedStyle();
  });
  document.querySelector('.input-panel').addEventListener('change', event => {
    if (isResetting) return;
    if (event.target.id === 'systemSelect') {
      updateCustomSystemInput();
      if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
        document.querySelectorAll('#gmContainer .gm-role').forEach(role => { role.value = 'DL'; });
      }
    }
    previewSelectedStyle();
  });
  bindAsciiArtEvents();
}

window.addEventListener('DOMContentLoaded', () => {
  renderReportStyleOptions();
  bindEvents();
  addGM();
  addPlayer();
  setTodayPlaceholder();
  updateCustomSystemInput();
  previewSelectedStyle();
});
