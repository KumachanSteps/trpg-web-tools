/* OBS TRPGサポーター — 画面本体
 * 接続（obs-client.js）、ルームとPC、オーバーレイ、ブラウザソースの一覧、差分の確認 → 適用 → 元に戻す、設定ファイル。
 * OBSを変えるのは「適用する」「元に戻す」「ソースを再読み込み」だけ。差分の確認までは読み取りのみ。 */
(function () {
  'use strict';

  const M = window.OTS;
  const I18N = window.OTS_I18N;
  const { ObsClient, isLocalAddress } = window.OTS_OBS;

  const VERSION = 'v0.1';
  const STORAGE_KEY = 'obsTrpgSupporter.v1';
  const PREFS_KEY = 'obsTrpgSupporter.prefs';
  const LANG_KEY = 'obsTrpgSupporterLang';
  const THEME_KEY = 'obsTrpgSupporterTheme';
  const LANGS = ['ja', 'en', 'ko'];
  const PUBLIC_URL = 'https://kumachansteps.github.io/trpg-web-tools/tools/obs-trpg-supporter/';
  const BROWSER_KIND = 'browser_source';
  const CSS_LINKS = [
    ['yudukiak/ccfoliaCSS', 'https://github.com/yudukiak/ccfoliaCSS'],
    ['aoko2477/ccfolia-css', 'https://github.com/aoko2477/ccfolia-css'],
    ['Q-FIG/ccfolia_css', 'https://github.com/Q-FIG/ccfolia_css'],
    ['Message Box Maker', 'https://shiki365.github.io/message-box-maker/']
  ];

  const $ = id => document.getElementById(id);
  const els = {
    body: document.body,
    helpBtn: $('helpBtn'),
    helpDrawer: $('helpDrawer'),
    helpList: $('helpList'),
    helpNotes: $('helpNotes'),
    themeBtn: $('themeBtn'),
    xShareLink: $('xShareLink'),
    connState: $('connState'),
    wsAddress: $('wsAddress'),
    wsPassword: $('wsPassword'),
    connectBtn: $('connectBtn'),
    disconnectBtn: $('disconnectBtn'),
    maskSwitch: $('maskSwitch'),
    roomInput: $('roomInput'),
    roomReveal: $('roomReveal'),
    roomState: $('roomState'),
    pcList: $('pcList'),
    addPcBtn: $('addPcBtn'),
    layoutSeg: $('layoutSeg'),
    layoutNote: $('layoutNote'),
    themeSelect: $('themeSelect'),
    accentInput: $('accentInput'),
    accentReset: $('accentReset'),
    ovTitle: $('ovTitle'),
    ovSub: $('ovSub'),
    ovScene: $('ovScene'),
    ovMsg: $('ovMsg'),
    ovResume: $('ovResume'),
    ovPlates: $('ovPlates'),
    ovPreview: $('ovPreview'),
    regionTable: $('regionTable'),
    ovUrl: $('ovUrl'),
    ovCopy: $('ovCopy'),
    ovOpen: $('ovOpen'),
    fetchState: $('fetchState'),
    fetchBtn: $('fetchBtn'),
    addSourceBtn: $('addSourceBtn'),
    resetSourcesBtn: $('resetSourcesBtn'),
    obsInputs: $('obsInputs'),
    sourceList: $('sourceList'),
    previewBtn: $('previewBtn'),
    applyBtn: $('applyBtn'),
    undoBtn: $('undoBtn'),
    backupBtn: $('backupBtn'),
    refreshBtn: $('refreshBtn'),
    planNote: $('planNote'),
    planTable: $('planTable'),
    exportFullBtn: $('exportFullBtn'),
    exportTplBtn: $('exportTplBtn'),
    exportCliBtn: $('exportCliBtn'),
    importBtn: $('importBtn'),
    importFile: $('importFile'),
    clearBtn: $('clearBtn'),
    checkList: $('checkList'),
    checkReset: $('checkReset'),
    toastHost: $('toastHost')
  };

  const OVERLAY_BASE = new URL('overlay.html', location.href).href.split(/[?#]/)[0];

  const app = {
    lang: 'ja',
    project: M.defaultProject(),
    prefs: { mask: true, checks: [] },
    rev: 0,
    revealRoom: false,
    conn: { state: 'idle', ver: '' },
    obsInputs: null, // Map<inputName, inputKind>。読み込むまでは null
    plan: null,
    backup: null,
    busy: false
  };
  const client = new ObsClient();
  const ui = { saveTimer: 0, previewTimer: 0, cards: [] };

  /* ================= 言語 ================= */

  const dict = () => I18N[app.lang] || I18N.ja;

  function t(path, vars) {
    const get = source => path.split('.').reduce((cur, key) => (cur && typeof cur === 'object' ? cur[key] : undefined), source);
    let value = get(dict());
    if (value === undefined) value = get(I18N.ja);
    if (value === undefined) return path;
    if (vars && typeof value === 'string') value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return value;
  }

  function errorText(error) {
    const code = error && error.code;
    if (code === 'request_failed') return t('err.request_failed', { msg: error.message });
    if (code && t(`err.${code}`) !== `err.${code}`) return t(`err.${code}`, error.params || {});
    return String((error && error.message) || error);
  }

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY) || localStorage.getItem('trpgPortalLanguage'); } catch (error) { saved = null; }
    if (LANGS.includes(saved)) return saved;
    const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'ja').toLowerCase();
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('ko')) return 'ko';
    return 'en';
  }

  function applyLanguage() {
    const d = dict();
    document.documentElement.lang = app.lang;
    document.title = d.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', d.meta.description);
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(node => { node.innerHTML = t(node.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach(node => { node.placeholder = t(node.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-label]').forEach(node => {
      const label = t(node.dataset.i18nLabel);
      node.setAttribute('aria-label', label);
      node.title = label;
    });
    document.querySelectorAll('[data-lang-choice]').forEach(btn => {
      const on = btn.dataset.langChoice === app.lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    els.helpList.textContent = '';
    d.helpItems.forEach(text => els.helpList.appendChild(h('p', null, text)));
    els.helpNotes.textContent = '';
    d.helpNotes.forEach(text => els.helpNotes.appendChild(h('p', null, text)));
    els.xShareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(d.shareText)}&url=${encodeURIComponent(PUBLIC_URL)}`;
    syncThemeButton();
    renderAll();
  }

  /* ================= 小物 ================= */

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value == null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else if (key === 'value') node.value = value;
        else if (key === 'checked') node.checked = Boolean(value);
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    children.flat().forEach(child => {
      if (child == null || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    });
    return node;
  }

  function toast(message, kind = 'info', duration = 3600) {
    const node = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
    els.toastHost.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => {
      node.classList.remove('is-visible');
      setTimeout(() => node.remove(), 300);
    }, duration);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = h('textarea', { class: 'visually-hidden' });
        area.value = text;
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('copy');
      }
      toast(t('copied'), 'success', 1800);
    } catch (error) {
      toast(t('err.copy'), 'error');
    }
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stamp() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  // 1回目で「もう一度押すと…」に変わり、4秒以内にもう一度押すと実行する
  function confirmTwice(button, confirmKey, labelKey, run) {
    if (button.dataset.armed === '1') {
      button.dataset.armed = '';
      button.textContent = t(labelKey);
      button.classList.remove('is-armed');
      run();
      return;
    }
    button.dataset.armed = '1';
    button.textContent = t(confirmKey);
    button.classList.add('is-armed');
    setTimeout(() => {
      if (button.dataset.armed !== '1') return;
      button.dataset.armed = '';
      button.textContent = t(labelKey);
      button.classList.remove('is-armed');
    }, 4000);
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, { tool_id: 'obs_trpg_supporter', tool_version: VERSION, language: app.lang, ...params });
    } catch (error) {
      // 計測に失敗してもツールの動作には影響させない
    }
  }

  const display = url => (app.prefs.mask ? M.maskUrl(url, app.project) : url);

  /* ================= テーマ（画面の明暗） ================= */

  function syncThemeButton() {
    const dark = els.body.classList.contains('is-dark');
    const thumb = els.themeBtn.querySelector('.theme-toggle-thumb');
    if (thumb) thumb.textContent = dark ? '☾' : '☀️';
    const label = dark ? t('themeDark') : t('themeLight');
    els.themeBtn.setAttribute('aria-label', label);
    els.themeBtn.title = label;
    els.themeBtn.setAttribute('aria-pressed', String(dark));
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (error) { saved = null; }
    const dark = saved ? saved === 'dark' : Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    els.body.classList.toggle('is-dark', dark);
  }

  function toggleTheme() {
    const dark = !els.body.classList.contains('is-dark');
    els.body.classList.toggle('is-dark', dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (error) { /* noop */ }
    syncThemeButton();
  }

  /* ================= 保存 ================= */

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) app.project = M.normalizeProject(saved);
    } catch (error) {
      app.project = M.defaultProject();
    }
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (prefs) app.prefs = { mask: prefs.mask !== false, checks: Array.isArray(prefs.checks) ? prefs.checks.map(Boolean) : [] };
    } catch (error) { /* noop */ }
  }

  function save() {
    clearTimeout(ui.saveTimer);
    ui.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(app.project));
      } catch (error) {
        toast(t('err.storage'), 'warning');
      }
    }, 300);
  }

  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(app.prefs)); } catch (error) { /* noop */ }
  }

  // 設定が変わったとき。structural: 一覧を作り直す
  function changed(structural) {
    app.rev++;
    save();
    if (structural) renderAll();
    else refreshDerived();
  }

  /* ================= 描画 ================= */

  function renderAll() {
    renderConnection();
    renderSession();
    renderPcs();
    renderOverlayControls();
    renderSources();
    renderChecklist();
    refreshDerived();
  }

  // 入力のたびに変わる所（URL表示・オーバーレイ・差分の古さ）
  function refreshDerived() {
    renderRoomState();
    ui.cards.forEach(updateCard);
    renderOverlayOutput();
    renderPlan();
  }

  function renderConnection() {
    const s = app.conn.state;
    els.connState.dataset.state = s;
    els.connState.textContent = s === 'connected' ? t('connect.connected', { ver: app.conn.ver || '?' }) : t(`connect.${s}`);
    els.connectBtn.hidden = s === 'connected';
    els.connectBtn.disabled = s === 'connecting';
    els.disconnectBtn.hidden = s !== 'connected';
    if (document.activeElement !== els.wsAddress) els.wsAddress.value = app.project.websocket.address;
    const on = s === 'connected' && !app.busy;
    els.fetchBtn.disabled = !on;
    els.previewBtn.disabled = !on;
    els.refreshBtn.disabled = !on;
    els.undoBtn.disabled = !on || !app.backup;
    els.backupBtn.disabled = !app.backup;
    els.applyBtn.disabled = !on || !planReady();
  }

  function renderSession() {
    els.maskSwitch.checked = app.prefs.mask;
    if (document.activeElement !== els.roomInput) els.roomInput.value = app.project.ccfolia.roomId;
    els.roomInput.type = app.revealRoom ? 'text' : 'password';
    els.roomReveal.textContent = app.revealRoom ? t('session.hide') : t('session.reveal');
  }

  function renderRoomState() {
    const id = app.project.ccfolia.roomId;
    els.roomState.classList.toggle('is-error', els.roomInput.dataset.bad === '1');
    if (els.roomInput.dataset.bad === '1') els.roomState.textContent = t('session.roomBad');
    else if (!id) els.roomState.textContent = t('session.roomEmpty');
    else els.roomState.textContent = t('session.roomOk', { id: app.prefs.mask ? `${id.slice(0, 2)}${'•'.repeat(6)}` : id });
  }

  function renderPcs() {
    els.pcList.textContent = '';
    app.project.participants.forEach((p, index) => {
      const charInput = h('input', {
        class: 'text-input', type: app.prefs.mask ? 'password' : 'text', value: p.characterId, spellcheck: 'false', autocomplete: 'off',
        placeholder: t('session.pcCharacter'), 'aria-label': `${p.slot} ${t('session.pcCharacter')}`
      });
      charInput.addEventListener('change', () => {
        const id = M.parseCharacterId(charInput.value);
        charInput.classList.toggle('is-bad', id === null);
        if (id === null) { toast(t('session.pcBad'), 'warning'); return; }
        p.characterId = id;
        charInput.value = id;
        changed(false);
      });
      const nameInput = h('input', { class: 'text-input', type: 'text', value: p.name, maxlength: '60', placeholder: t('session.pcName'), 'aria-label': `${p.slot} ${t('session.pcName')}` });
      nameInput.addEventListener('input', () => { p.name = nameInput.value.slice(0, 60); changed(false); });
      const colorInput = h('input', { class: 'color-input', type: 'color', value: p.color, 'aria-label': `${p.slot} ${t('session.pcColor')}`, title: t('session.pcColor') });
      colorInput.addEventListener('input', () => { p.color = colorInput.value; changed(false); });
      const remove = h('button', {
        class: 'icon-button small-icon', type: 'button', 'aria-label': t('session.removePc'), title: t('session.removePc'),
        onclick: () => {
          app.project.participants.splice(index, 1);
          app.project.participants.forEach((q, i) => { q.slot = `PC${i + 1}`; });
          app.project.sources.forEach(s => { if (s.slot > index) s.slot--; else if (s.slot === index && s.role === 'status') s.slot = Math.max(0, index - 1); });
          changed(true);
        }
      }, '×');
      els.pcList.appendChild(h('div', { class: 'pc-row' }, h('span', { class: 'pc-slot', style: `--pc:${p.color}` }, p.slot), nameInput, charInput, colorInput, remove));
    });
    els.addPcBtn.disabled = app.project.participants.length >= M.MAX_PCS;
  }

  function renderOverlayControls() {
    const o = app.project.overlay;
    els.layoutSeg.textContent = '';
    M.LAYOUT_IDS.forEach(id => {
      els.layoutSeg.appendChild(h('button', {
        class: `segment${o.layout === id ? ' is-active' : ''}`, type: 'button', 'aria-pressed': String(o.layout === id),
        onclick: () => { o.layout = id; changed(true); }
      }, t(`overlay.layouts.${id}`)));
    });
    els.layoutNote.textContent = t(`overlay.layoutNotes.${o.layout}`);
    els.themeSelect.textContent = '';
    M.THEME_IDS.forEach(id => els.themeSelect.appendChild(h('option', { value: id }, t(`overlay.themes.${id}`))));
    els.themeSelect.value = o.theme;
    els.accentInput.value = o.accent || M.THEMES[o.theme].accent;
    els.accentReset.disabled = !o.accent;
    [['ovTitle', 'title'], ['ovSub', 'subtitle'], ['ovScene', 'scene'], ['ovMsg', 'message'], ['ovResume', 'resume']].forEach(([id, key]) => {
      if (document.activeElement !== els[id]) els[id].value = o[key];
    });
    els.ovPlates.checked = o.plates;
    document.querySelectorAll('[data-break-only]').forEach(node => { node.hidden = o.layout !== 'break'; });
    els.regionTable.textContent = '';
    els.regionTable.appendChild(h('thead', null, h('tr', null, t('overlay.regionCols').map(c => h('th', null, c)))));
    const tbody = h('tbody');
    M.LAYOUTS[o.layout].forEach(r => {
      const name = r.kind === 'status' ? `${t('overlay.kinds.status')} PC${r.slot + 1}` : t(`overlay.kinds.${r.kind}`);
      tbody.appendChild(h('tr', null, h('td', null, name), h('td', null, r.x), h('td', null, r.y), h('td', null, r.w), h('td', null, r.h)));
    });
    els.regionTable.appendChild(tbody);
  }

  function renderOverlayOutput() {
    const url = M.overlayUrl(app.project, OVERLAY_BASE);
    els.ovUrl.textContent = url;
    els.ovOpen.href = url;
    clearTimeout(ui.previewTimer);
    ui.previewTimer = setTimeout(() => {
      const preview = M.overlayUrl(app.project, OVERLAY_BASE, { guide: true, lang: app.lang });
      if (els.ovPreview.dataset.src !== preview) {
        els.ovPreview.dataset.src = preview;
        try { els.ovPreview.contentWindow.location.replace(preview); } catch (error) { els.ovPreview.src = preview; }
      }
    }, 250);
  }

  /* ---------- ソースのカード ---------- */

  function renderSources() {
    els.sourceList.textContent = '';
    ui.cards = [];
    if (!app.project.sources.length) {
      els.sourceList.appendChild(h('p', { class: 'card-note is-quiet' }, t('sources.empty')));
      return;
    }
    app.project.sources.forEach((source, index) => {
      const card = buildCard(source, index);
      ui.cards.push(card);
      els.sourceList.appendChild(card.node);
    });
  }

  function buildCard(source, index) {
    const sources = app.project.sources;
    const nameInput = h('input', { class: 'text-input name-input', type: 'text', value: source.inputName, list: 'obsInputs', spellcheck: 'false', autocomplete: 'off', 'aria-label': t('sources.name'), placeholder: t('sources.name') });
    nameInput.addEventListener('input', () => { source.inputName = nameInput.value; changed(false); });
    const badge = h('span', { class: 'badge' });
    const move = dir => {
      const to = index + dir;
      if (to < 0 || to >= sources.length) return;
      [sources[index], sources[to]] = [sources[to], sources[index]];
      changed(true);
    };
    const tools = h('span', { class: 'card-tools' },
      h('button', { class: 'icon-button small-icon', type: 'button', 'aria-label': t('sources.up'), title: t('sources.up'), disabled: index === 0, onclick: () => move(-1) }, '↑'),
      h('button', { class: 'icon-button small-icon', type: 'button', 'aria-label': t('sources.down'), title: t('sources.down'), disabled: index === sources.length - 1, onclick: () => move(1) }, '↓'),
      h('button', { class: 'icon-button small-icon is-danger', type: 'button', 'aria-label': t('sources.remove'), title: t('sources.remove'), onclick: () => { sources.splice(index, 1); changed(true); } }, '×'));

    const roleSelect = h('select', { class: 'select-input', 'aria-label': t('sources.role') }, M.ROLE_IDS.map(id => h('option', { value: id }, t(`sources.roles.${id}`))));
    roleSelect.value = source.role;
    roleSelect.addEventListener('change', () => {
      source.role = roleSelect.value;
      if (source.role === 'custom' && !source.url) source.url = 'https://ccfolia.com/rooms/{roomId}';
      if (source.role === 'overlay' && !source.width && !source.height) { source.width = 1920; source.height = 1080; }
      changed(true);
    });
    const row = h('div', { class: 'field-grid' }, h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.role')), roleSelect));
    if (M.ROLES[source.role].needsSlot) {
      const slotSelect = h('select', { class: 'select-input', 'aria-label': t('sources.pc') },
        app.project.participants.map((p, i) => h('option', { value: String(i) }, p.name ? `${p.slot} ${p.name}` : p.slot)));
      if (source.slot >= app.project.participants.length) slotSelect.appendChild(h('option', { value: String(source.slot) }, `PC${source.slot + 1}`));
      slotSelect.value = String(source.slot);
      slotSelect.addEventListener('change', () => { source.slot = Number(slotSelect.value); changed(false); });
      row.appendChild(h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.pc')), slotSelect));
    }

    const body = h('div', { class: 'source-body' }, row);
    if (M.ROLES[source.role].userUrl) {
      const urlInput = h('input', { class: 'text-input', type: 'text', value: source.url, spellcheck: 'false', autocomplete: 'off', placeholder: t(source.role === 'discord' ? 'sources.discordPh' : 'sources.customPh') });
      urlInput.addEventListener('input', () => { source.url = urlInput.value.trim(); changed(false); });
      body.appendChild(h('label', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.userUrl')), urlInput));
    }

    const urlCode = h('code', { class: 'url-code' });
    const urlError = h('p', { class: 'field-state is-error' });
    const copyUrl = h('button', { class: 'ghost-button small-button', type: 'button', onclick: () => { try { copyText(M.renderUrl(app.project, source, OVERLAY_BASE)); } catch (error) { toast(errorText(error), 'warning'); } } }, t('sources.copyUrl'));
    body.appendChild(h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.urlLabel')), h('span', { class: 'url-row' }, urlCode, copyUrl), urlError));

    const sizeInput = (key, label) => {
      const input = h('input', { class: 'number-input', type: 'number', min: '1', max: '8192', step: '1', value: source[key], placeholder: label, 'aria-label': label });
      input.addEventListener('input', () => { source[key] = M.toSize(input.value) || ''; changed(false); });
      return input;
    };
    body.appendChild(h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.size')),
      h('span', { class: 'size-row' }, sizeInput('width', t('sources.width')), h('span', { class: 'size-x' }, '×'), sizeInput('height', t('sources.height')))));

    const cssSeg = h('div', { class: 'segment-group', role: 'group', 'aria-label': t('sources.css') },
      ['keep', 'set'].map(mode => h('button', {
        class: `segment${source.cssMode === mode ? ' is-active' : ''}`, type: 'button', 'aria-pressed': String(source.cssMode === mode),
        onclick: () => {
          if (source.cssMode === mode) return;
          source.cssMode = mode;
          if (mode === 'set' && !source.css) source.css = M.OBS_DEFAULT_CSS;
          changed(true);
        }
      }, t(mode === 'keep' ? 'sources.cssKeep' : 'sources.cssSet'))));
    const cssField = h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('sources.css')), cssSeg);
    if (source.cssMode === 'set') {
      const area = h('textarea', { class: 'css-input', rows: '5', spellcheck: 'false', placeholder: t('sources.cssPh'), 'aria-label': t('sources.css') });
      area.value = source.css;
      area.addEventListener('input', () => { source.css = area.value; changed(false); });
      const links = h('span');
      CSS_LINKS.forEach(([label, href], i) => {
        if (i) links.appendChild(document.createTextNode(' / '));
        links.appendChild(h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label));
      });
      const [before, after] = t('sources.cssLinks').split('{links}');
      cssField.append(area,
        h('span', { class: 'button-row' },
          h('button', { class: 'ghost-button small-button', type: 'button', onclick: () => { source.css = `${M.OBS_DEFAULT_CSS}\n${source.css.startsWith(M.OBS_DEFAULT_CSS) ? source.css.slice(M.OBS_DEFAULT_CSS.length).replace(/^\n/, '') : source.css}`; area.value = source.css; changed(false); } }, t('sources.cssDefault')),
          h('button', { class: 'ghost-button small-button', type: 'button', onclick: () => copyText(source.css) }, t('sources.copyCss'))),
        h('p', { class: 'card-note is-quiet' }, before, links, after || ''));
    }
    body.appendChild(cssField);

    const node = h('article', { class: 'source-card' },
      h('div', { class: 'source-head' }, h('span', { class: 'source-index' }, String(index + 1)), nameInput, badge, tools),
      body);
    return { node, source, urlCode, urlError, badge, nameInput };
  }

  function updateCard(card) {
    const { source } = card;
    try {
      const url = M.renderUrl(app.project, source, OVERLAY_BASE);
      card.urlCode.textContent = display(url);
      card.urlError.textContent = '';
      card.urlError.hidden = true;
    } catch (error) {
      card.urlCode.textContent = '—';
      card.urlError.textContent = errorText(error);
      card.urlError.hidden = false;
    }
    const problem = M.sourceProblems(app.project).find(p => app.project.sources[p.index] === source);
    card.nameInput.classList.toggle('is-bad', Boolean(problem));
    card.nameInput.title = problem ? t(`err.${problem.code}`, problem.params) : '';
    const name = source.inputName.trim();
    let state = '';
    if (app.obsInputs && name) {
      const kind = app.obsInputs.get(name);
      state = !kind ? 'missing' : kind === BROWSER_KIND ? 'found' : 'notBrowser';
    }
    card.badge.dataset.state = state;
    card.badge.textContent = state ? t(`sources.${state}`) : '';
    card.badge.hidden = !state;
  }

  function renderChecklist() {
    els.checkList.textContent = '';
    t('checklist.items').forEach((text, i) => {
      const box = h('input', { type: 'checkbox', checked: Boolean(app.prefs.checks[i]) });
      box.addEventListener('change', () => { app.prefs.checks[i] = box.checked; savePrefs(); });
      els.checkList.appendChild(h('li', null, h('label', null, box, h('span', null, text))));
    });
  }

  /* ================= OBSとの接続 ================= */

  async function connect() {
    const address = els.wsAddress.value.trim();
    app.project.websocket.address = address;
    save();
    if (!isLocalAddress(address)) { toast(t('err.not_local'), 'error', 6000); return; }
    app.conn = { state: 'connecting', ver: '' };
    renderConnection();
    try {
      const info = await client.connect(address, els.wsPassword.value);
      app.conn = { state: 'connected', ver: info.obsWebSocketVersion || '' };
      client.onclose = () => {
        app.conn = { state: 'lost', ver: '' };
        app.obsInputs = null;
        app.plan = null;
        renderConnection();
        refreshDerived();
        toast(t('err.closed'), 'warning');
      };
      track('obs_connect');
      renderConnection();
      await fetchInputs(true);
    } catch (error) {
      app.conn = { state: 'idle', ver: '' };
      renderConnection();
      toast(errorText(error), 'error', 7000);
    }
  }

  function disconnect() {
    client.disconnect();
    app.conn = { state: 'idle', ver: '' };
    app.obsInputs = null;
    app.plan = null;
    els.fetchState.textContent = '';
    renderConnection();
    refreshDerived();
  }

  async function fetchInputs(quiet) {
    const { inputs } = await client.call('GetInputList');
    app.obsInputs = new Map((inputs || []).map(input => [input.inputName, input.inputKind]));
    els.obsInputs.textContent = '';
    const browserNames = (inputs || []).filter(input => input.inputKind === BROWSER_KIND).map(input => input.inputName);
    browserNames.forEach(name => els.obsInputs.appendChild(h('option', { value: name })));
    els.fetchState.textContent = t('sources.fetched', { n: browserNames.length });
    ui.cards.forEach(updateCard);
    if (!quiet) toast(t('sources.fetched', { n: browserNames.length }), 'success', 2000);
  }

  async function withBusy(run) {
    if (app.busy) return;
    app.busy = true;
    renderConnection();
    try {
      await run();
    } catch (error) {
      toast(errorText(error), 'error', 7000);
    } finally {
      app.busy = false;
      renderConnection();
    }
  }

  /* ================= 差分の確認 → 適用 → 元に戻す ================= */

  const planReady = () => Boolean(app.plan && app.plan.rev === app.rev && app.plan.ok && app.plan.rows.some(r => r.status === 'change'));

  // OBSの今の値（設定にない項目はブラウザソースの初期値）
  const current = (settings, defaults, key) => (settings[key] !== undefined ? settings[key] : defaults[key] !== undefined ? defaults[key] : '');

  async function buildPlan() {
    // 確認中に入力が変わったら、その結果は古い扱いにする（作り始めの版で記録する）
    const rev = app.rev;
    await fetchInputs(true);
    let defaults = {};
    try {
      defaults = (await client.call('GetInputDefaultSettings', { inputKind: BROWSER_KIND })).defaultInputSettings || {};
    } catch (error) {
      defaults = {};
    }
    const problems = M.sourceProblems(app.project);
    const rows = [];
    for (let index = 0; index < app.project.sources.length; index++) {
      const source = app.project.sources[index];
      const name = source.inputName.trim();
      const row = { name, status: 'error', message: '', next: null, previous: null, keys: [] };
      rows.push(row);
      const problem = problems.find(p => p.index === index);
      if (problem) { row.message = t(`err.${problem.code}`, problem.params); continue; }
      try {
        row.next = M.nextSettings(app.project, source, OVERLAY_BASE);
      } catch (error) {
        row.message = errorText(error);
        continue;
      }
      const kind = app.obsInputs.get(name);
      if (!kind) { row.message = t('err.missing'); continue; }
      if (kind !== BROWSER_KIND) { row.message = t('err.not_browser', { kind }); continue; }
      const { inputSettings } = await client.call('GetInputSettings', { inputName: name });
      row.previous = {};
      Object.keys(row.next).forEach(key => { row.previous[key] = current(inputSettings || {}, defaults, key); });
      row.keys = Object.keys(row.next).filter(key => String(row.previous[key]) !== String(row.next[key]));
      row.status = row.keys.length ? 'change' : 'same';
    }
    return { rev, rows, ok: rows.length > 0 && rows.every(r => r.status !== 'error') };
  }

  function preview() {
    return withBusy(async () => {
      app.plan = await buildPlan();
      renderPlan();
    });
  }

  function apply() {
    if (!planReady()) return;
    return withBusy(async () => {
      const plan = app.plan;
      const applied = [];
      try {
        for (const row of plan.rows.filter(r => r.status === 'change')) {
          const settings = {};
          row.keys.forEach(key => { settings[key] = row.next[key]; });
          await client.call('SetInputSettings', { inputName: row.name, inputSettings: settings, overlay: true });
          const restore = {};
          row.keys.forEach(key => { restore[key] = row.previous[key]; });
          applied.push({ inputName: row.name, settings: restore });
        }
      } catch (error) {
        const failed = [];
        for (const item of applied.slice().reverse()) {
          try {
            await client.call('SetInputSettings', { inputName: item.inputName, inputSettings: item.settings, overlay: true });
          } catch (rollbackError) {
            failed.push(item.inputName);
          }
        }
        app.plan = null;
        renderPlan();
        toast(failed.length ? t('apply.undoFailed', { msg: failed.join(', ') }) : t('apply.failed', { msg: errorText(error) }), 'error', 9000);
        return;
      }
      app.backup = { at: new Date().toISOString(), sources: applied };
      track('obs_apply', { sources: applied.length });
      toast(t('apply.applied', { n: applied.length }), 'success');
      app.plan = await buildPlan();
      renderPlan();
    });
  }

  function undo() {
    if (!app.backup) return;
    return withBusy(async () => {
      const failed = [];
      for (const item of app.backup.sources.slice().reverse()) {
        try {
          await client.call('SetInputSettings', { inputName: item.inputName, inputSettings: item.settings, overlay: true });
        } catch (error) {
          failed.push(`${item.inputName} (${errorText(error)})`);
        }
      }
      if (failed.length) {
        toast(t('apply.undoFailed', { msg: failed.join(', ') }), 'error', 9000);
      } else {
        app.backup = null;
        toast(t('apply.undone'), 'success');
      }
      app.plan = await buildPlan();
      renderPlan();
    });
  }

  function refreshSources() {
    return withBusy(async () => {
      await fetchInputs(true);
      let n = 0;
      for (const source of app.project.sources) {
        const name = source.inputName.trim();
        if (app.obsInputs.get(name) !== BROWSER_KIND) continue;
        await client.call('PressInputPropertiesButton', { inputName: name, propertyName: 'refreshnocache' });
        n++;
      }
      toast(t('apply.refreshed', { n }), 'success');
    });
  }

  function renderPlan() {
    const plan = app.plan;
    const connected = app.conn.state === 'connected';
    els.planTable.hidden = !plan;
    let note = '';
    let kind = '';
    if (!connected) note = t('apply.needConnect');
    else if (plan && plan.rev !== app.rev) { note = t('apply.stale'); kind = 'warn'; }
    else if (plan && !plan.ok) { note = t('apply.hasErrors'); kind = 'error'; }
    else if (plan) {
      const n = plan.rows.filter(r => r.status === 'change').length;
      note = n ? t('apply.ready', { n }) : t('apply.noChanges');
      kind = n ? 'ok' : '';
    }
    els.planNote.textContent = note;
    els.planNote.dataset.kind = kind;
    els.applyBtn.disabled = !connected || app.busy || !planReady();
    if (!plan) return;
    els.planTable.textContent = '';
    els.planTable.appendChild(h('thead', null, h('tr', null, t('apply.cols').map(c => h('th', null, c)))));
    const tbody = h('tbody');
    plan.rows.forEach(row => {
      const details = h('td', { class: 'plan-details' });
      if (row.status === 'error') details.appendChild(h('span', { class: 'is-error' }, row.message));
      else {
        if (row.keys.includes('url')) {
          details.append(
            h('div', { class: 'diff-line' }, h('b', null, `${t('apply.before')}: `), h('code', null, display(String(row.previous.url || '—')))),
            h('div', { class: 'diff-line' }, h('b', null, `${t('apply.after')}: `), h('code', null, display(row.next.url))));
        } else {
          details.appendChild(h('div', { class: 'diff-line' }, h('code', null, display(row.next.url))));
        }
        if ('css' in row.next) details.appendChild(h('div', { class: 'diff-line' }, row.keys.includes('css') ? t('apply.cssChanged') : t('apply.cssSame')));
        if (row.keys.includes('width') || row.keys.includes('height')) {
          details.appendChild(h('div', { class: 'diff-line' }, t('apply.sizeChanged', { w: row.next.width || row.previous.width, h: row.next.height || row.previous.height })));
        }
      }
      const label = row.status === 'change' ? t('apply.change') : row.status === 'same' ? t('apply.same') : t('apply.error');
      tbody.appendChild(h('tr', { 'data-status': row.status }, h('td', { class: 'plan-name' }, row.name || '—'), h('td', null, h('span', { class: 'badge', 'data-state': row.status }, label)), details));
    });
    els.planTable.appendChild(tbody);
  }

  /* ================= 設定ファイル ================= */

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        app.project = M.importConfig(JSON.parse(String(reader.result)));
        app.plan = null;
        changed(true);
        toast(t('files.imported'), 'success');
      } catch (error) {
        toast(t('err.import_invalid'), 'error');
      }
    };
    reader.readAsText(file);
  }

  /* ================= イベント ================= */

  function bind() {
    document.querySelectorAll('[data-lang-choice]').forEach(btn => btn.addEventListener('click', () => {
      app.lang = LANGS.includes(btn.dataset.langChoice) ? btn.dataset.langChoice : 'ja';
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      applyLanguage();
    }));
    els.themeBtn.addEventListener('click', toggleTheme);
    els.helpBtn.addEventListener('click', () => {
      const open = els.helpDrawer.hidden;
      els.helpDrawer.hidden = !open;
      els.helpBtn.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', () => {
      btn.closest('.drawer').hidden = true;
      els.helpBtn.setAttribute('aria-expanded', 'false');
    }));

    els.connectBtn.addEventListener('click', connect);
    els.disconnectBtn.addEventListener('click', disconnect);
    els.wsPassword.addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });
    els.wsAddress.addEventListener('change', () => { app.project.websocket.address = els.wsAddress.value.trim(); save(); });

    els.maskSwitch.addEventListener('change', () => { app.prefs.mask = els.maskSwitch.checked; savePrefs(); renderPcs(); refreshDerived(); renderPlan(); });
    els.roomInput.addEventListener('input', () => {
      const id = M.parseRoomId(els.roomInput.value);
      els.roomInput.dataset.bad = id === null ? '1' : '';
      els.roomInput.classList.toggle('is-bad', id === null);
      if (id !== null) app.project.ccfolia.roomId = id;
      changed(false);
    });
    els.roomInput.addEventListener('change', () => { if (els.roomInput.dataset.bad !== '1') els.roomInput.value = app.project.ccfolia.roomId; });
    els.roomReveal.addEventListener('click', () => { app.revealRoom = !app.revealRoom; renderSession(); });
    els.addPcBtn.addEventListener('click', () => {
      if (app.project.participants.length >= M.MAX_PCS) return;
      app.project.participants.push(M.defaultParticipant(app.project.participants.length));
      changed(true);
    });

    const o = () => app.project.overlay;
    els.themeSelect.addEventListener('change', () => { o().theme = els.themeSelect.value; changed(true); });
    els.accentInput.addEventListener('input', () => { o().accent = els.accentInput.value; els.accentReset.disabled = false; changed(false); });
    els.accentReset.addEventListener('click', () => { o().accent = ''; changed(true); });
    [['ovTitle', 'title'], ['ovSub', 'subtitle'], ['ovScene', 'scene'], ['ovMsg', 'message'], ['ovResume', 'resume']].forEach(([id, key]) => {
      els[id].addEventListener('input', () => { o()[key] = els[id].value; changed(false); });
    });
    els.ovPlates.addEventListener('change', () => { o().plates = els.ovPlates.checked; changed(false); });
    els.ovCopy.addEventListener('click', () => copyText(M.overlayUrl(app.project, OVERLAY_BASE)));

    els.fetchBtn.addEventListener('click', () => withBusy(() => fetchInputs(false)));
    els.addSourceBtn.addEventListener('click', () => {
      app.project.sources.push({ inputName: M.SOURCE_PREFIX, role: 'board', slot: 0, url: '', cssMode: 'keep', css: '', width: '', height: '' });
      changed(true);
    });
    els.resetSourcesBtn.addEventListener('click', () => confirmTwice(els.resetSourcesBtn, 'sources.resetConfirm', 'sources.reset', () => {
      app.project.sources = M.defaultSources();
      changed(true);
    }));

    els.previewBtn.addEventListener('click', preview);
    els.applyBtn.addEventListener('click', apply);
    els.undoBtn.addEventListener('click', undo);
    els.refreshBtn.addEventListener('click', refreshSources);
    els.backupBtn.addEventListener('click', () => {
      if (app.backup) download(`obs-trpg-backup-${stamp()}.json`, { app: 'obs-trpg-supporter', kind: 'obs-backup', ...app.backup });
    });

    els.exportFullBtn.addEventListener('click', () => download(`obs-trpg-supporter-${stamp()}.json`, M.exportProject(app.project, true)));
    els.exportTplBtn.addEventListener('click', () => download(`obs-trpg-template-${stamp()}.json`, M.exportProject(app.project, false)));
    els.exportCliBtn.addEventListener('click', () => download('config.json', M.exportCliConfig(app.project)));
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', () => {
      const file = els.importFile.files && els.importFile.files[0];
      if (file) importFile(file);
      els.importFile.value = '';
    });
    els.clearBtn.addEventListener('click', () => confirmTwice(els.clearBtn, 'files.clearConfirm', 'files.clear', () => {
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PREFS_KEY); } catch (error) { /* noop */ }
      app.project = M.defaultProject();
      app.prefs = { mask: true, checks: [] };
      app.plan = null;
      changed(true);
      toast(t('files.cleared'), 'success');
    }));
    els.checkReset.addEventListener('click', () => { app.prefs.checks = []; savePrefs(); renderChecklist(); });

    window.addEventListener('beforeunload', () => client.disconnect());
  }

  /* ================= 起動 ================= */

  initTheme();
  load();
  app.lang = detectLang();
  bind();
  applyLanguage();
})();
