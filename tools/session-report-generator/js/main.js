(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const t = (key, vars = {}) => window.REPORT_GEN_LANGUAGE?.t(key, vars) || key;
  const REPORT_PENDING_IMPORT_KEY = 'trpgWebTools.sessionReportGenerator.pendingImport';
  const LIVE_PEEK_COLLAPSED_KEY = 'trpgWebTools.sessionReportGenerator.livePeekCollapsed';
  const mobileQuery = window.matchMedia('(max-width: 920px)');
  const isMobileLayout = () => mobileQuery.matches;
  const DEFAULT_REPORT_STYLE = 'line-sandwich';

  let isResetting = false;
  let lastPreviewSelection = { start: 0, end: 0 };
  let historyStack = [];
  let redoStack = [];
  let isApplyingHistory = false;
  let manualPreviewHeight = null;
  let isPreviewDirty = false;
  let lastGeneratedPreview = '';

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
  const FONT_LABELS = {
    en: { sansBoldItalic:'𝘼 Bold + Italic (Sans Serif)', sansBold:'𝗔 Bold (Sans Serif)', sansItalic:'𝘈 Italic (Sans Serif)', serifBoldItalic:'𝑨 Bold + Italic (Serif)', serifBold:'𝐀 Bold (Serif)', serifItalic:'𝐴 Italic (Serif)', smallCaps:'ᴀ Small Caps', typewriter:'𝙰 Typewriter (Monospace)', modernSans:'𝖠 Modern (Sans Serif)', plain:'A No conversion' },
    ko: { sansBoldItalic:'𝘼 굵게 + 기울임 (산세리프)', sansBold:'𝗔 굵게 (산세리프)', sansItalic:'𝘈 기울임 (산세리프)', serifBoldItalic:'𝑨 굵게 + 기울임 (세리프)', serifBold:'𝐀 굵게 (세리프)', serifItalic:'𝐴 기울임 (세리프)', smallCaps:'ᴀ 스몰 캡스', typewriter:'𝙰 타자기 (고정폭)', modernSans:'𝖠 모던 (산세리프)', plain:'A 변환 없음' }
  };
  const REPORT_STYLE_LABELS = {
    en: { 'line-sandwich':'⟡ Line Sandwich: ⟡.· ⎯⎯⎯ ⟡.·', 'thin-rule':'─ Thin Rule Frame: ────', 'heavy-rule':'━╋━ Heavy Rule: HO ┊ PC / PL', 'star-frame':'✦ Star Frame: ✦ ┈┈┈ ✦', 'double-line':'═ Double-Line Title Box: ════', corner:'◤ ◢ Corner Frame: ◤￣￣ ＿＿◢', 'heart-line':'ෆ Heart Line: ෆ・┈・┈・ෆ', label:'⧉ ｜ Label Headings: ⧉ ｜KP ｜PC・PL', 'title-bracket':'◣ ◥ Title Brackets: ◣ Title ◥ ➤', ribbon:'୨୧ Ribbon: ‧₊˚ ୨ Title ୧ ˚₊', 'moon-star':'☽ Moon & Star Line: ─── ･ ｡☆*☽*☆ﾟ.───', asterisk:'✼ Asterisk Frame: ✼••┈┈••✼', 'dot-frame':'⟡ Dotted Frame: ⟡.·*.·····⟡.·*.', handwritten:'⌜ ⌟ Handwritten Heading: ⌜ Title ⌟ ✧ ▹', block:'▮ ▮ Block: ▮ System ▮' },
    ko: { 'line-sandwich':'⟡ 라인 사이: ⟡.· ⎯⎯⎯ ⟡.·', 'thin-rule':'─ 가는 괘선 테두리: ────', 'heavy-rule':'━╋━ 굵은 괘선: HO ┊ PC / PL', 'star-frame':'✦ 별 테두리: ✦ ┈┈┈ ✦', 'double-line':'═ 이중선 제목 틀: ════', corner:'◤ ◢ 코너 테두리: ◤￣￣ ＿＿◢', 'heart-line':'ෆ 하트 라인: ෆ・┈・┈・ෆ', label:'⧉ ｜ 라벨 제목: ⧉ ｜KP ｜PC・PL', 'title-bracket':'◣ ◥ 제목 괄호: ◣ 제목 ◥ ➤', ribbon:'୨୧ 리본: ‧₊˚ ୨ 제목 ୧ ˚₊', 'moon-star':'☽ 달별 라인 테두리: ─── ･ ｡☆*☽*☆ﾟ.───', asterisk:'✼ 별표 테두리: ✼••┈┈••✼', 'dot-frame':'⟡ 점선 테두리: ⟡.·*.·····⟡.·*.', handwritten:'⌜ ⌟ 손글씨 제목: ⌜ 제목 ⌟ ✧ ▹', block:'▮ ▮ 블록: ▮ 시스템 ▮' }
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

  function normalizeStyleSource(text) {
    const small = {
      'ᴀ':'A','ʙ':'B','ᴄ':'C','ᴅ':'D','ᴇ':'E','ꜰ':'F','ɢ':'G','ʜ':'H','ɪ':'I','ᴊ':'J','ᴋ':'K','ʟ':'L','ᴍ':'M','ɴ':'N','ᴏ':'O','ᴘ':'P','ꞯ':'Q','ʀ':'R','ꜱ':'S','ᴛ':'T','ᴜ':'U','ᴠ':'V','ᴡ':'W','ʏ':'Y','ᴢ':'Z'
    };
    return Array.from(String(text || '')).map(ch => small[ch] || ch).join('');
  }

  function styleText(text, variant) {
    const map = FONT_MAPS[variant];
    const source = normalizeStyleSource(text);
    if (!map || variant === 'plain') return source;
    return Array.from(source.normalize('NFKD')).map(ch => {
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
    const selected = select.value;
    const lang = window.REPORT_GEN_LANGUAGE?.current || 'ja';
    const options = styles.map(style => `<option value="${escapeHtml(style.id)}">${escapeHtml(REPORT_STYLE_LABELS[lang]?.[style.id] || style.label)}</option>`).join('');
    select.innerHTML = options;
    if (styles.some(style => style.id === selected)) select.value = selected;
    const mirror = $('previewStyleSelect');
    if (mirror) {
      mirror.innerHTML = options;
      mirror.value = select.value;
    }
  }

  function syncPreviewStyleSelect() {
    const mirror = $('previewStyleSelect');
    if (mirror) mirror.value = $('reportStyle').value;
  }

  function populateFontVariants() {
    const select = $('fontVariant');
    const selected = select.value || 'sansBoldItalic';
    const lang = window.REPORT_GEN_LANGUAGE?.current || 'ja';
    select.innerHTML = FONT_VARIANTS.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(FONT_LABELS[lang]?.[item.id] || item.label)}</option>`).join('');
    select.value = selected;
  }

  let chipTooltipEl = null;

  function ensureChipTooltip() {
    if (chipTooltipEl && chipTooltipEl.isConnected) return chipTooltipEl;
    chipTooltipEl = document.createElement('div');
    chipTooltipEl.className = 'font-chip-tooltip';
    chipTooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(chipTooltipEl);
    return chipTooltipEl;
  }

  function showChipTooltip(chip) {
    const text = chip?.dataset.tooltip || '';
    if (!text) return;
    const tip = ensureChipTooltip();
    tip.textContent = text;
    tip.classList.add('is-visible');
    const cr = chip.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let left = cr.left + cr.width / 2 - tr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tr.width - 8));
    let top = cr.top - tr.height - 8;
    if (top < 4) top = cr.bottom + 8;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function hideChipTooltip() {
    if (chipTooltipEl) chipTooltipEl.classList.remove('is-visible');
  }

  function renderFontToolbar() {
    const toolbar = $('fontToolbar');
    if (!toolbar) return;
    toolbar.innerHTML = '';
    FONT_VARIANTS.forEach(item => {
      const lang = window.REPORT_GEN_LANGUAGE?.current || 'ja';
      const localizedLabel = FONT_LABELS[lang]?.[item.id] || item.tooltip;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `font-chip ${item.chipClass}`;
      button.dataset.variant = item.id;
      button.dataset.tooltip = localizedLabel;
      button.setAttribute('aria-label', localizedLabel);
      button.textContent = 'A';
      button.addEventListener('click', () => {
        pushHistory();
        $('fontVariant').value = item.id;
        updateFontToolbarActive();
        previewSelectedStyle();
      });
      button.addEventListener('mouseenter', () => showChipTooltip(button));
      button.addEventListener('mouseleave', hideChipTooltip);
      button.addEventListener('focus', () => showChipTooltip(button));
      button.addEventListener('blur', hideChipTooltip);
      toolbar.appendChild(button);
    });
    toolbar.addEventListener('scroll', hideChipTooltip, { passive: true });
    window.addEventListener('scroll', hideChipTooltip, { passive: true, capture: true });
    window.addEventListener('resize', hideChipTooltip);
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

    const currentGroup = container.querySelector('.ascii-group.is-current')?.dataset.group;
    const keys = Object.keys(collection);
    const activeKey = keys.includes(currentGroup) ? currentGroup : keys[0];
    container.innerHTML = '';
    const tabs = document.createElement('div');
    tabs.className = 'ascii-tabs';
    tabs.setAttribute('role', 'tablist');
    container.appendChild(tabs);

    Object.entries(collection).forEach(([groupKey, groupData]) => {
      const isActive = groupKey === activeKey;
      const label = t(`decoration.tab.${groupKey}`) || groupData.label || groupKey;
      const group = document.createElement('div');
      group.className = `ascii-group${isActive ? ' is-current' : ''}`;
      group.dataset.group = groupKey;

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `ascii-tab${isActive ? ' is-active' : ''}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(isActive));
      tab.textContent = label;
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.ascii-tab').forEach(item => {
          item.classList.toggle('is-active', item === tab);
          item.setAttribute('aria-selected', String(item === tab));
        });
        container.querySelectorAll('.ascii-group').forEach(item => item.classList.toggle('is-current', item === group));
      });
      tabs.appendChild(tab);

      const title = document.createElement('div');
      title.className = 'ascii-group-title';
      title.textContent = label;

      const buttons = document.createElement('div');
      buttons.className = 'ascii-buttons';

      if (groupData.mode === 'wrap') {
        const hint = document.createElement('p');
        hint.className = 'ascii-group-hint';
        hint.textContent = t('decoration.wrapHint');
        group.appendChild(hint);
      }

      (groupData.items || []).forEach(item => {
        const value = groupData.mode === 'wrap' ? `${item.open}${item.close}` : item.value;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.title = groupData.mode === 'wrap' ? `${item.open}…${item.close}` : value;
        button.dataset.decoration = value;
        if (String(value).length > 20) button.classList.add('ascii-chip-line');
        if (String(item.label).length > 10) button.classList.add('ascii-chip-wide');
        // プレビュー編集中にタップしてもキーボードとカーソル位置を維持する
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => {
          if (groupData.mode === 'wrap') wrapPreviewSelection(item.open, item.close);
          else insertDecorationAtPreviewCursor(value, { ownLine: groupData.mode === 'line' });
        });
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
    if (key === 'custom') return $('customSystemText').value.trim() || t('dynamic.systemFallback');
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

  function addAuthorSuffix(name) {
    const text = String(name || '').trim().replace(/\s+(様|さん|氏|先生)$/, '$1');
    if (!text) return '';
    if (text.startsWith('作：') || text.startsWith('作:')) return text.replace(/^作:/, '作：');
    const creditedName = /(?:様|さん|氏|先生)$/.test(text) ? text : `${text}様`;
    return `作：${creditedName}`;
  }

  function sampleName(index, type) {
    const letters = ['A','B','C','D','E','F','G','H','I'];
    return type === 'pc'
      ? t('dynamic.pcFallback', { letter: letters[index] || index + 1 })
      : t('dynamic.plFallback', { letter: letters[index] || index + 1 });
  }

  function addGM(value = '', role = 'KP') {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div>
        <label data-i18n="dynamic.role">${escapeHtml(t('dynamic.role'))}</label>
        <select class="gm-role">
          <option value="KP">KP</option>
          <option value="SKP">SKP</option>
          <option value="KPC">KPC</option>
          <option value="KP/KPC">KP/KPC</option>
          <option value="KPC/KP">KPC/KP</option>
          <option value="GM">GM</option>
          <option value="SGM">SGM</option>
          <option value="DL">DL</option>
          <option value="DPC">DPC</option>
          <option value="作/KP">作/KP</option>
          <option value="進行">進行</option>
        </select>
      </div>
      <div>
        <label data-i18n="dynamic.name">${escapeHtml(t('dynamic.name'))}</label>
        <input class="gm-name" value="${escapeHtml(value)}" placeholder="${escapeHtml(t('dynamic.name'))}">
      </div>
      <button class="icon-button add-inline" type="button" aria-label="${escapeHtml(t('dynamic.addGm'))}" data-i18n-aria-label="dynamic.addGm">＋</button>
      <button class="icon-button danger-inline" type="button" aria-label="${escapeHtml(t('dynamic.delete'))}" data-i18n-aria-label="dynamic.delete">×</button>
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
        <label data-i18n="dynamic.slot">${escapeHtml(t('dynamic.slot'))}</label>
        <select class="player-slot" ${isFirst ? '' : 'disabled'}>${buildSlotOptions(selected, isFirst)}</select>
      </div>
      <div class="ho-field">
        <label data-i18n="dynamic.ho">${escapeHtml(t('dynamic.ho'))}</label>
        <input class="ho-name" value="${escapeHtml(ho)}" placeholder="${escapeHtml(t('dynamic.hoPlaceholder'))}" data-i18n-placeholder="dynamic.hoPlaceholder">
      </div>
      <div class="pc-field">
        <label data-i18n="dynamic.pc">${escapeHtml(t('dynamic.pc'))}</label>
        <input class="pc-name" value="${escapeHtml(pc)}" placeholder="${escapeHtml(t('dynamic.pcPlaceholder'))}" data-i18n-placeholder="dynamic.pcPlaceholder">
      </div>
      <div class="pl-field">
        <label data-i18n="dynamic.pl">${escapeHtml(t('dynamic.pl'))}</label>
        <input class="pl-name" value="${escapeHtml(pl)}" placeholder="${escapeHtml(t('dynamic.plPlaceholder'))}" data-i18n-placeholder="dynamic.plPlaceholder">
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
        name: addSuffix(raw || (useSample && index === 0 ? 'KP' : ''), suffix)
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

    if (useSample && !gms.length) gms = [{ role: 'KP', name: 'KP' }];
    if (useSample && !players.length) players = [{ slot: 'HO1', ho: '', pc: sampleName(0, 'pc'), pl: sampleName(0, 'pl') }];

    return {
      style: $('reportStyle').value || DEFAULT_REPORT_STYLE,
      fontVariant: $('fontVariant').value || 'sansBoldItalic',
      styleText,
      system: getSystemName(),
      scenario: $('scenarioTitle').value.trim() || (useSample ? t('dynamic.scenarioFallback') : ''),
      author: addAuthorSuffix($('authorText').value.trim()),
      result: $('resultText').value.trim() || (useSample ? 'END A' : ''),
      date: $('dateText').value.trim() || (useSample ? $('dateText').placeholder || getTodayString() : ''),
      memo: $('memoText')?.value.trim() || '',
      memoPlaceholder: t('misc.memoPlaceholder'),
      nameOrder: $('nameInputOrder')?.value || 'pcpl',
      gms,
      players
    };
  }

  function insertAuthorLine(output, data) {
    const author = data.author || '';
    const scenario = data.scenario || '';
    if (!author || !scenario || output.includes(author)) return output;
    const lines = String(output || '').split('\n');
    const index = lines.findIndex(line => line.includes(scenario));
    if (index < 0) return output;
    lines.splice(index + 1, 0, author);
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function mergeManualPreviewEdits(base, edited, next) {
    if (!base || edited === base) return next;
    let start = 0;
    const minStart = Math.min(base.length, edited.length);
    while (start < minStart && base[start] === edited[start]) start += 1;

    let baseEnd = base.length;
    let editedEnd = edited.length;
    while (baseEnd > start && editedEnd > start && base[baseEnd - 1] === edited[editedEnd - 1]) {
      baseEnd -= 1;
      editedEnd -= 1;
    }

    const manualSegment = edited.slice(start, editedEnd);
    const nextEnd = Math.max(start, next.length - (base.length - baseEnd));
    return `${next.slice(0, start)}${manualSegment}${next.slice(nextEnd)}`;
  }

  function renderPreview(text = null, push = false) {
    const preview = $('tweetPreview');
    if (!preview) return;
    if (push) pushHistory();
    const data = collectData(true);
    const generated = text !== null ? text : insertAuthorLine(window.ReportTemplate.renderParts(data), data);
    const output = text === null && isPreviewDirty
      ? mergeManualPreviewEdits(lastGeneratedPreview, preview.value, generated)
      : generated;
    preview.value = output;
    lastGeneratedPreview = generated;
    isPreviewDirty = output !== generated;
    syncPreviewStyleSelect();
    savePreviewSelection();
    updateCount();
    fitPreviewTextBox();
  }

  function previewSelectedStyle() {
    if (isResetting) return;
    renderPreview();
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

  function insertDecorationAtPreviewCursor(text, { ownLine = false } = {}) {
    const preview = $('tweetPreview');
    if (!preview) return;
    pushHistory();
    const hasFocus = document.activeElement === preview;
    const start = hasFocus ? preview.selectionStart ?? preview.value.length : lastPreviewSelection.start ?? preview.value.length;
    const end = hasFocus ? preview.selectionEnd ?? preview.value.length : lastPreviewSelection.end ?? preview.value.length;
    const before = preview.value.slice(0, start);
    const after = preview.value.slice(end);
    let insert = String(text);
    // 罫線は前後の文字とくっつかないよう、必ず独立した1行にする
    if (ownLine) {
      if (before && !before.endsWith('\n')) insert = `\n${insert}`;
      if (after && !after.startsWith('\n')) insert = `${insert}\n`;
    }
    preview.value = before + insert + after;
    const next = start + insert.length;
    isPreviewDirty = true;
    // スマホでは未フォーカス時にキーボードを開かない（画面が跳ねるため）
    if (hasFocus || !isMobileLayout()) {
      preview.focus({ preventScroll: isMobileLayout() });
      preview.selectionStart = next;
      preview.selectionEnd = next;
    } else {
      showToast(t(after ? 'mobile.insertedAtCursor' : 'mobile.insertedAtEnd'), 1400);
    }
    lastPreviewSelection = { start: next, end: next };
    updateCount();
  }

  // 括弧：選択範囲があれば左右から挟み、なければ括弧を入れてカーソルを間に置く
  function wrapPreviewSelection(open, close) {
    const preview = $('tweetPreview');
    if (!preview) return;
    pushHistory();
    const hasFocus = document.activeElement === preview;
    const start = hasFocus ? preview.selectionStart : lastPreviewSelection.start ?? preview.value.length;
    const end = hasFocus ? preview.selectionEnd : lastPreviewSelection.end ?? preview.value.length;
    const selected = preview.value.slice(start, end);
    preview.value = preview.value.slice(0, start) + open + selected + close + preview.value.slice(end);
    const caretStart = start + open.length;
    const caretEnd = caretStart + selected.length;
    isPreviewDirty = true;
    if (hasFocus || !isMobileLayout()) {
      preview.focus({ preventScroll: isMobileLayout() });
      preview.setSelectionRange(caretStart, caretEnd);
    } else {
      showToast(t(selected ? 'decoration.wrapped' : 'mobile.insertedAtCursor'), 1400);
    }
    lastPreviewSelection = { start: caretStart, end: caretEnd };
    updateCount();
  }

  function clearPreview() {
    pushHistory();
    $('tweetPreview').value = '';
    isPreviewDirty = true;
    lastPreviewSelection = { start: 0, end: 0 };
    updateCount();
    $('tweetPreview').focus();
  }

  async function copyTweet() {
    const preview = $('tweetPreview');
    if (!preview) return;
    if (!preview.value.trim()) {
      showToast(t('dynamic.noCopy'));
      return;
    }
    try {
      await navigator.clipboard.writeText(preview.value);
    } catch (e) {
      preview.select();
      document.execCommand('copy');
    }
    showToast(t('dynamic.copyDone'));
  }

  function postToX() {
    const preview = $('tweetPreview');
    if (!preview) return;
    const text = preview.value.trim();
    if (!text) {
      showToast(t('dynamic.noPost'));
      return;
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
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
    const value = $('tweetPreview').value;
    const count = tweetLength(value);
    const statusClass = count <= 280 ? 'count-ok' : 'count-bad';
    $('charCount').textContent = `${count} / 280`;
    $('limitStatus').textContent = count <= 280 ? 'OK' : t('dynamic.over', { count: count - 280 });
    $('limitStatus').className = statusClass;
    $('dirtyBadge').hidden = !isPreviewDirty;

    $('livePeekBody').textContent = value || t('mobile.peekEmpty');
    $('livePeekCount').textContent = `${count} / 280`;
    $('livePeekCount').className = `live-peek-count ${statusClass}`;
    $('flowCount').textContent = count;
    $('flowCount').className = `flow-count ${statusClass}`;
    autosizeMobilePreview();
  }

  function autosizeMobilePreview() {
    const text = $('tweetPreview');
    if (!text || !isMobileLayout() || manualPreviewHeight || document.body.dataset.mode !== 'preview') return;
    text.style.height = 'auto';
    text.style.height = `${Math.max(240, text.scrollHeight + 2)}px`;
  }

  // ---- スマホ：① 入力 / ② 仕上げ の切り替え ----
  const modeScroll = { input: 0, preview: 0 };

  function setMobileMode(mode, { scroll = true } = {}) {
    const current = document.body.dataset.mode;
    if (current && current !== mode) modeScroll[current] = window.scrollY;
    document.body.dataset.mode = mode;
    document.querySelectorAll('.flow-tab').forEach(tab => {
      tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode));
    });
    if (!isMobileLayout()) return;
    autosizeMobilePreview();
    if (!scroll || current === mode) return;
    if (mode === 'preview') {
      const panel = document.querySelector('.preview-panel');
      window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 8) });
    } else {
      window.scrollTo({ top: modeScroll.input });
    }
  }

  let decorationAnchor = null;

  function placeDecorationPanel() {
    const panel = document.querySelector('.decoration-panel');
    if (!panel) return;
    if (!decorationAnchor) {
      decorationAnchor = document.createComment('decoration-panel-anchor');
      panel.before(decorationAnchor);
    }
    if (isMobileLayout()) {
      $('fontToolbar').after(panel);
    } else if (decorationAnchor.nextSibling !== panel) {
      decorationAnchor.after(panel);
    }
  }

  function handleLayoutChange() {
    placeDecorationPanel();
    if (isMobileLayout()) {
      autosizeMobilePreview();
    } else {
      document.body.classList.remove('is-typing');
      if (!manualPreviewHeight) $('tweetPreview').style.height = '';
      fitPreviewTextBox();
    }
  }

  function setLivePeekCollapsed(collapsed) {
    $('livePeek').classList.toggle('is-collapsed', collapsed);
    $('livePeekToggle').setAttribute('aria-expanded', String(!collapsed));
    try { localStorage.setItem(LIVE_PEEK_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (e) { /* noop */ }
  }

  function bindMobileFlow() {
    document.querySelectorAll('.flow-tab').forEach(tab => {
      tab.addEventListener('click', () => setMobileMode(tab.dataset.mode));
    });
    document.querySelectorAll('[data-go-mode]').forEach(el => {
      el.addEventListener('click', () => setMobileMode(el.dataset.goMode));
      el.addEventListener('keydown', event => {
        if (el.tagName !== 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          setMobileMode(el.dataset.goMode);
        }
      });
    });
    $('mobileCopyButton').addEventListener('click', copyTweet);
    $('mobilePostButton').addEventListener('click', postToX);
    $('mobileClearAllButton').addEventListener('click', confirmResetAll);

    $('livePeekToggle').addEventListener('click', () => {
      setLivePeekCollapsed(!$('livePeek').classList.contains('is-collapsed'));
    });
    let collapsed = false;
    try { collapsed = localStorage.getItem(LIVE_PEEK_COLLAPSED_KEY) === '1'; } catch (e) { /* noop */ }
    setLivePeekCollapsed(collapsed);

    $('previewStyleSelect').addEventListener('change', event => {
      pushHistory();
      $('reportStyle').value = event.target.value;
      previewSelectedStyle();
    });

    // 入力中はソフトウェアキーボードの上に下部バーが残らないよう隠す
    document.addEventListener('focusin', event => {
      if (isMobileLayout() && isTypingTarget(event.target) && event.target.tagName !== 'SELECT') {
        document.body.classList.add('is-typing');
      }
    });
    document.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!isTypingTarget(document.activeElement) || document.activeElement.tagName === 'SELECT') {
          document.body.classList.remove('is-typing');
        }
      }, 60);
    });

    mobileQuery.addEventListener('change', handleLayoutChange);
    setMobileMode('input', { scroll: false });
    handleLayoutChange();
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
    $('reportStyle').value = DEFAULT_REPORT_STYLE;
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
    isPreviewDirty = false;
    isResetting = false;
    updateFontToolbarActive();
    renderPreview('');
  }

  function confirmResetAll() {
    if (!confirm(t('dynamic.confirmClearAll'))) return;
    resetAll();
    if (isMobileLayout()) setMobileMode('input');
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

  function cycleFontVariant(direction) {
    const select = $('fontVariant');
    if (!select || !select.options.length) return;

    const count = select.options.length;
    const current = select.selectedIndex < 0 ? 0 : select.selectedIndex;
    select.selectedIndex = (current + direction + count) % count;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function regeneratePreview() {
    pushHistory();
    isPreviewDirty = false;
    renderPreview();
    if (isMobileLayout()) {
      showToast(t('dynamic.regenerated'), 1600);
    } else {
      $('tweetPreview')?.focus();
    }
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
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

      // ?（テキスト欄以外で）: ショートカットパネルの開閉
      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        toggleHeaderPanel('shortcutPanel', 'shortcutToggleButton');
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

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        cycleFontVariant(-1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        cycleFontVariant(1);
      }

      // Cmd/Ctrl + Opt/Alt + R: 手動編集を破棄して入力内容からプレビューを再生成
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        regeneratePreview();
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
    $('generateButton').addEventListener('click', postToX);
    $('clearAllButton').addEventListener('click', confirmResetAll);
    $('regenerateButton').addEventListener('click', regeneratePreview);
    $('copyButton').addEventListener('click', copyTweet);
    $('undoButton').addEventListener('click', undoPreview);
    $('redoButton').addEventListener('click', redoPreview);
    $('clearPreviewButton').addEventListener('click', clearPreview);

    $('reportStyle').addEventListener('change', () => {
      syncPreviewStyleSelect();
      previewSelectedStyle();
    });
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
      isPreviewDirty = true;
      savePreviewSelection();
      updateCount();
    });
    ['click', 'keyup', 'select', 'mouseup'].forEach(eventName => preview.addEventListener(eventName, savePreviewSelection));

    // プレビュー画面内で Ctrl/⌘+Z = 元に戻す / Ctrl/⌘+Shift+Z（または Ctrl+Y）= やり直す
    document.querySelector('.preview-panel')?.addEventListener('keydown', event => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isRedo = (key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey);
      const isUndo = key === 'z' && !event.shiftKey;
      if (!isUndo && !isRedo) return;
      event.preventDefault();
      (isRedo ? redoPreview : undoPreview)();
    });

    // ページ全体のコマンド系ショートカット
    document.addEventListener('keydown', event => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey) return;
      const key = event.key.toLowerCase();

      // Ctrl/⌘+Shift+P = 𝕏 に投稿
      if (event.shiftKey && key === 'p') {
        event.preventDefault();
        postToX();
        return;
      }
      // Ctrl/⌘+Shift+C / Ctrl/⌘+Enter = プレビュー本文をコピー
      if ((event.shiftKey && key === 'c') || (!event.shiftKey && event.key === 'Enter')) {
        event.preventDefault();
        copyTweet();
        return;
      }
      // Ctrl/⌘+E = プレビュー編集欄へフォーカス
      if (!event.shiftKey && key === 'e') {
        event.preventDefault();
        const preview = $('tweetPreview');
        if (preview) {
          preview.focus();
          preview.setSelectionRange(preview.value.length, preview.value.length);
        }
      }
    });
  }

  function readPendingReportImport() {
    const raw = localStorage.getItem(REPORT_PENDING_IMPORT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  function clearPendingReportImport() {
    localStorage.removeItem(REPORT_PENDING_IMPORT_KEY);
  }

  function showToast(message, duration = 3200) {
    let stack = document.getElementById('toastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toastStack';
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    stack.appendChild(toast);
    setTimeout(() => toast.classList.add('is-visible'), 10);
    const dismiss = () => {
      if (toast.dataset.dismissed) return;
      toast.dataset.dismissed = '1';
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 240);
    };
    setTimeout(dismiss, duration);
    toast.addEventListener('click', dismiss);
  }

  function handlePendingReportImport() {
    let payload = null;
    try {
      payload = readPendingReportImport();
    } catch (error) {
      console.error(error);
      if (confirm(t('import.corrupt'))) {
        clearPendingReportImport();
      }
      return;
    }
    if (!payload?.items?.length) return;

    const importActions = {
      load: t('import.load'),
      later: t('import.later'),
      discard: t('import.discard')
    };
    const action = prompt(t('import.prompt', importActions), importActions.load);

    if (action === null || action.trim().toLocaleLowerCase() === importActions.later.toLocaleLowerCase()) return;
    if (action.trim().toLocaleLowerCase() === importActions.discard.toLocaleLowerCase()) {
      clearPendingReportImport();
      return;
    }
    if (action.trim().toLocaleLowerCase() !== importActions.load.toLocaleLowerCase()) return;

    applyReportImportItems(payload.items);
    clearPendingReportImport();
    showToast(t('dynamic.imported'));
  }

  function applyReportImportItems(items) {
    const item = Array.isArray(items) ? items[0] : items;
    if (!item) return;
    applyImportedSystem(item.system);
    $('scenarioTitle').value = item.scenario || '';
    $('dateText').value = item.latestDate || (Array.isArray(item.dates) ? item.dates.join(' / ') : '');
    if ($('memoText')) $('memoText').value = item.memo || '';

    $('gmContainer').innerHTML = '';
    addGM(item.gm || '', inferGmRole(item.system));

    $('playerContainer').innerHTML = '';
    const players = Array.isArray(item.players) && item.players.length ? item.players : [{ pl: '', pc: '' }];
    players.forEach(player => addPlayer(player.pl || '', player.pc || ''));

    dispatchFormRefresh();
    renderPreview(null, true);
  }

  function applyImportedSystem(systemName) {
    const name = String(systemName || '').trim();
    const aliases = {
      'CoC 6版': 'coc6',
      'CoC6': 'coc6',
      'CoC 7版': 'coc7',
      'CoC7': 'coc7',
      '新クトゥルフ神話TRPG': 'new_coc',
      'エモクロア': 'emoklore_ja',
      'エモクロアTRPG': 'emoklore_ja',
      'マダミス': 'madamisu',
      'マーダーミステリー': 'madamisu'
    };
    const matched = aliases[name] || Object.entries(SYSTEM_NAMES).find(([, label]) => label === name || label.toLowerCase() === name.toLowerCase())?.[0];
    $('systemSelect').value = matched || 'custom';
    $('customSystemText').value = matched ? '' : name;
    updateCustomSystemInput();
  }

  function inferGmRole(systemName) {
    const text = String(systemName || '');
    if (text.includes('エモクロア')) return 'DL';
    if (text.includes('クトゥルフ') || /coc/i.test(text)) return 'KP';
    return 'GM';
  }

  function dispatchFormRefresh() {
    document.querySelectorAll('input, textarea, select').forEach(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
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
    bindMobileFlow();
    renderPreview();
    handlePendingReportImport();
    document.addEventListener('languagechange', () => {
      populateReportStyles();
      populateFontVariants();
      renderFontToolbar();
      renderAsciiArtButtons();
      renderPreview();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
