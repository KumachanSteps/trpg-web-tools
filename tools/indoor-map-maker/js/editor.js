/* TRPG室内図メーカー — エディター本体
 * 画面の組み立て、キャンバスの操作（選択・移動・部屋/壁/ドア/窓/家具の配置）、履歴、保存、書き出し。
 * 座標の単位はマス（1マス = 0.5m）。view.zoom は 1マスあたりの画面ピクセル数。 */
(function () {
  'use strict';

  const M = window.IMM;
  const I18N = window.IMM_I18N;

  const VERSION = 'v1.02';
  const STORAGE_KEY = 'indoorMapMaker.v1';
  const PREFS_KEY = 'indoorMapMaker.prefs';
  const LANG_KEY = 'indoorMapMakerLang';
  const THEME_KEY = 'indoorMapMakerTheme';
  const LANGS = ['ja', 'en', 'ko'];
  const PUBLIC_URL = 'https://kumachansteps.github.io/trpg-web-tools/tools/indoor-map-maker/';
  const TYPE_KEY = { room: 'rooms', item: 'items', opening: 'openings', wall: 'walls', text: 'texts' };
  const ZOOM_MIN = 3;
  const ZOOM_MAX = 140;
  const ZOOM_BASE = 24;
  const SEL = '#2f7cf6';
  const HANDLE = 7;
  const HISTORY_LIMIT = 120;

  /* 部屋の種類ごとの標準サイズ（マス） */
  const ROOM_GROUPS = [
    { id: 'home', name: { ja: '住まい', en: 'Home', ko: '주거' }, items: [
      ['ldk', 'living', 12, 8], ['living', 'living', 9, 7], ['dining', 'kitchen', 6, 6], ['kitchen', 'kitchen', 5, 5],
      ['bedroom', 'bedroom', 8, 7], ['western', 'bedroom', 6, 7], ['washitsu', 'washitsu', 7, 7], ['child', 'bedroom', 6, 6], ['study', 'office', 5, 6]
    ] },
    { id: 'service', name: { ja: '水回り・通路・収納', en: 'Wet rooms, halls, storage', ko: '욕실·통로·수납' }, items: [
      ['bath', 'wet', 4, 4], ['wash', 'wet', 4, 3], ['toilet', 'wet', 2, 3], ['entrance', 'hall', 3, 4],
      ['hall', 'hall', 2, 8], ['stairs', 'hall', 3, 6], ['closet', 'storage', 2, 4], ['storage', 'storage', 6, 5]
    ] },
    { id: 'facility', name: { ja: '施設', en: 'Facilities', ko: '시설' }, items: [
      ['office', 'office', 12, 8], ['meeting', 'office', 8, 6], ['lobby', 'public', 14, 10], ['guest', 'bedroom', 7, 12],
      ['ward', 'medical', 8, 10], ['exam', 'medical', 6, 6], ['surgery', 'medical', 8, 8], ['lab', 'medical', 8, 7]
    ] },
    { id: 'special', name: { ja: '特殊・屋外', en: 'Special & outdoor', ko: '특수·옥외' }, items: [
      ['ritual', 'special', 10, 10], ['sealed', 'danger', 6, 6], ['cell', 'danger', 4, 5], ['garage', 'garage', 7, 11],
      ['balcony', 'balcony', 12, 3], ['garden', 'garden', 12, 8], ['porch', 'porch', 6, 3]
    ] }
  ];
  const ROOM_PRESETS = {};
  ROOM_GROUPS.forEach(g => g.items.forEach(([id, cat, w, h]) => { ROOM_PRESETS[id] = { id, cat, w, h }; }));

  /* 壁際に置くと背中を壁に向ける家具 */
  const ORIENT = new Set([
    'fireplace', 'sofa2', 'sofa3', 'sofaL', 'armchair', 'tv', 'bookshelf', 'cabinet', 'piano_up',
    'bed_single', 'bed_double', 'wardrobe', 'dresser', 'nightstand', 'desk', 'desk_set',
    'kitchen', 'sink', 'stove', 'fridge', 'counter', 'cupboard', 'toilet', 'washbasin', 'bathtub', 'shower', 'washer',
    'office_desk', 'reception', 'locker', 'filing', 'whiteboard', 'copier', 'vending', 'bench',
    'hospital_bed', 'exam_bed', 'med_cabinet', 'morgue', 'lab_bench', 'rack', 'altar', 'garden_bench',
    'stage', 'dumbbell_rack'
  ]);
  const SWING_DOORS = new Set(['door', 'door2', 'locked', 'secret', 'broken']);
  const ICONS = {
    rotate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v5h-5" /></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /><path d="M4 4l16 16" /></svg>',
    unlock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></svg>'
  };
  const PRESET_COLORS = ['#fbf1df', '#e8f2e1', '#e1eef8', '#f6dedb', '#eee2f3', '#f1efea', '#e6e7ea', '#2e2230'];

  const $ = id => document.getElementById(id);
  const els = {
    body: document.body,
    shareLink: $('xShareLink'),
    helpBtn: $('helpBtn'),
    shortcutBtn: $('shortcutBtn'),
    themeBtn: $('themeBtn'),
    helpDrawer: $('helpDrawer'),
    shortcutDrawer: $('shortcutDrawer'),
    helpList: $('helpList'),
    helpNotes: $('helpNotes'),
    shortcutGrid: $('shortcutGrid'),
    libTabs: $('libTabs'),
    libBody: $('libBody'),
    tplBtn: $('tplBtn'),
    newBtn: $('newBtn'),
    openBtn: $('openBtn'),
    saveBtn: $('saveBtn'),
    openFile: $('openFile'),
    undoBtn: $('undoBtn'),
    redoBtn: $('redoBtn'),
    viewToggle: $('viewToggle'),
    exportBtn: $('exportBtn'),
    wrap: $('canvasWrap'),
    canvas: $('mapCanvas'),
    toolStrip: $('toolStrip'),
    miniBar: $('miniBar'),
    hint: $('canvasHint'),
    zoomOut: $('zoomOutBtn'),
    zoomIn: $('zoomInBtn'),
    zoomValue: $('zoomValue'),
    fitBtn: $('fitBtn'),
    floorBar: $('floorBar'),
    props: $('propsPanel'),
    tplModal: $('tplModal'),
    tplGroups: $('tplGroups'),
    tplGrid: $('tplGrid'),
    tplStructureOnly: $('tplStructureOnly'),
    expModal: $('expModal'),
    expOptions: $('expOptions'),
    expPreview: $('expPreview'),
    toastHost: $('toastHost')
  };
  const ctx = els.canvas.getContext('2d');

  const app = {
    lang: 'ja',
    project: null,
    tool: 'select',
    armed: null,
    sel: [],
    playerView: false,
    grid: true,
    ghost: true,
    libTab: 'rooms',
    libGroup: 'all',
    libQuery: '',
    tplGroup: 'home',
    undo: [],
    redo: [],
    rev: 0,
    clipboard: null,
    exp: { range: 'current', view: 'pl', theme: '', px: 48, grid: false, transparent: false }
  };
  const view = { zoom: ZOOM_BASE, ox: 0, oy: 0, w: 0, h: 0, dpr: 1, dirty: false };
  const ui = {
    drag: null,
    hover: null,
    hoverHandle: null,
    pointer: null,
    ghostOpening: null,
    ghostItem: null,
    spaceDown: false,
    pointers: new Map(),
    syncers: [],
    propsSig: '',
    editBefore: null,
    nudgeBefore: null,
    nudgeTimer: 0,
    saveTimer: 0,
    storageWarned: false,
    linesCache: null,
    renaming: -1,
    tplThumbs: {},
    hintKey: ''
  };

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

  const pick = value => M.pick(value, app.lang);

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (error) { saved = null; }
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
    els.helpList.innerHTML = '';
    d.helpItems.forEach(text => els.helpList.appendChild(h('p', null, text)));
    els.helpNotes.innerHTML = '';
    d.helpNotes.forEach(text => els.helpNotes.appendChild(h('p', null, text)));
    els.shortcutGrid.innerHTML = '';
    d.shortcutRows.forEach(([keys, text]) => {
      const box = h('div');
      keys.split(' + ').forEach((k, i) => {
        if (i) box.appendChild(h('b', null, '+'));
        box.appendChild(h('kbd', null, k));
      });
      els.shortcutGrid.append(box, h('span', null, text));
    });
    els.toolStrip.querySelectorAll('[data-tool]').forEach(btn => {
      const [name, key] = d.tools[btn.dataset.tool];
      btn.title = `${name} (${key})`;
      btn.setAttribute('aria-label', name);
    });
    els.miniBar.querySelectorAll('[data-mini]').forEach(btn => {
      if (btn.dataset.mini === 'lock' || btn.dataset.mini === 'gm') return;
      btn.title = d.mini[btn.dataset.mini];
      btn.setAttribute('aria-label', d.mini[btn.dataset.mini]);
    });
    const url = location.protocol.startsWith('http') ? location.href.split('#')[0] : PUBLIC_URL;
    els.shareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${d.shareText} ${url}`)}`;
    syncThemeButton();
    renderLibrary();
    renderProps(true);
    renderFloorBar();
    updateHint(true);
    if (!els.tplModal.hidden) renderTemplates();
    if (!els.expModal.hidden) renderExport();
    requestRender();
  }

  /* ================= 小さな道具 ================= */

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    children.flat().forEach(child => {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    });
    return node;
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round2 = v => Math.round(v * 100) / 100;
  const fmt = v => String(round2(v));
  const cur = () => app.project.floors[app.project.active];
  const theme = () => M.THEMES[app.project.theme] || M.THEMES.clean;
  const NON_TEXT_INPUTS = ['checkbox', 'radio', 'button', 'range', 'color'];
  const isTyping = el => el && ((el.tagName === 'INPUT' && !NON_TEXT_INPUTS.includes(el.type)) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

  function toast(message, type = 'info', duration = 3200, action = null) {
    if (!message) return;
    const node = h('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, h('span', null, message));
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      node.classList.remove('is-visible');
      setTimeout(() => node.remove(), 300);
    };
    if (action) {
      node.classList.add('has-action');
      node.appendChild(h('button', { type: 'button', class: 'toast-action', onclick: () => { action.run(); close(); } }, action.label));
    }
    els.toastHost.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    timer = setTimeout(close, duration);
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, { tool_id: 'indoor_map_maker', tool_version: VERSION, language: app.lang, ...params });
    } catch (error) {
      // 計測に失敗してもツールの動作には影響させない
    }
  }

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

  /* ================= データの読み込み・保存 ================= */

  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const list = v => (Array.isArray(v) ? v : []);

  function normalizeProject(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.floors)) return null;
    const out = M.emptyProject(typeof p.name === 'string' ? p.name : '');
    out.theme = M.THEMES[p.theme] ? p.theme : 'clean';
    out.showSize = ['none', 'jo', 'm2', 'm'].includes(p.showSize) ? p.showSize : 'none';
    out.showNames = p.showNames !== false;
    out.floors = p.floors.filter(f => f && typeof f === 'object').map(f => ({
      id: String(f.id || M.uid('f')),
      name: String(f.name == null ? '' : f.name),
      rooms: list(f.rooms).filter(r => r && num(r.w) >= 1 && num(r.h) >= 1).map(r => ({
        ...r,
        id: String(r.id || M.uid('r')),
        x: Math.round(num(r.x)), y: Math.round(num(r.y)), w: Math.round(num(r.w, 1)), h: Math.round(num(r.h, 1)),
        name: String(r.name == null ? '' : r.name),
        cat: M.CAT[r.cat] ? r.cat : 'living'
      })),
      walls: list(f.walls).filter(w => w && ['x1', 'y1', 'x2', 'y2'].every(k => Number.isFinite(Number(w[k])))).map(w => ({
        ...w, id: String(w.id || M.uid('w')), x1: num(w.x1), y1: num(w.y1), x2: num(w.x2), y2: num(w.y2), kind: M.WALL[w.kind] ? w.kind : 'int'
      })),
      openings: list(f.openings).filter(o => o && M.OPEN[o.kind] && (o.o === 'h' || o.o === 'v') && num(o.len) > 0).map(o => ({
        ...o, id: String(o.id || M.uid('o')), x: num(o.x), y: num(o.y), len: num(o.len, 1), side: o.side === -1 ? -1 : 1, hinge: o.hinge ? 1 : 0
      })),
      items: list(f.items).filter(i => i && M.ASSET[i.t] && num(i.w) > 0 && num(i.h) > 0).map(i => ({
        ...i, id: String(i.id || M.uid('i')), x: num(i.x), y: num(i.y), w: num(i.w), h: num(i.h), rot: [0, 90, 180, 270].includes(num(i.rot)) ? num(i.rot) : 0
      })),
      texts: list(f.texts).filter(x => x && typeof x.text === 'string').map(x => ({ ...x, id: String(x.id || M.uid('t')), x: num(x.x), y: num(x.y) }))
    }));
    if (!out.floors.length) out.floors = [M.emptyFloor('1F')];
    out.active = clamp(Math.round(num(p.active)), 0, out.floors.length - 1);
    return out;
  }

  function loadPrefs() {
    let prefs = null;
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch (error) { prefs = null; }
    if (!prefs) return;
    if (typeof prefs.grid === 'boolean') app.grid = prefs.grid;
    if (typeof prefs.ghost === 'boolean') app.ghost = prefs.ghost;
    if (['rooms', 'openings', 'furniture'].includes(prefs.libTab)) app.libTab = prefs.libTab;
    if (prefs.exp && typeof prefs.exp === 'object') {
      const e = prefs.exp;
      if (['current', 'all', 'each'].includes(e.range)) app.exp.range = e.range;
      if (['pl', 'gm'].includes(e.view)) app.exp.view = e.view;
      if ([24, 32, 48, 64, 96].includes(e.px)) app.exp.px = e.px;
      app.exp.grid = Boolean(e.grid);
      app.exp.transparent = Boolean(e.transparent);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ grid: app.grid, ghost: app.ghost, libTab: app.libTab, exp: { ...app.exp, theme: '' } }));
    } catch (error) { /* noop */ }
  }

  function restoreProject() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    return saved && saved.project ? normalizeProject(saved.project) : null;
  }

  function scheduleSave() {
    clearTimeout(ui.saveTimer);
    ui.saveTimer = setTimeout(saveNow, 400);
  }

  function saveNow() {
    clearTimeout(ui.saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: app.project, savedAt: Date.now() }));
    } catch (error) {
      if (!ui.storageWarned) toast(t('msg.storageFull'), 'warning', 6000);
      ui.storageWarned = true;
    }
  }

  function fileBase() {
    const name = (app.project.name || '').trim() || t('msg.untitled');
    return name.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'map';
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function saveFile() {
    const data = { ...app.project, app: 'indoor-map-maker', v: 1, tool: VERSION };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${fileBase()}.trpgmap.json`);
    toast(t('msg.saved'), 'success');
    track('map_save');
  }

  function openFileData(text) {
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (error) { parsed = null; }
    const project = parsed && (parsed.app === 'indoor-map-maker' || Array.isArray(parsed.floors)) ? normalizeProject(parsed) : null;
    if (!project) {
      toast(t('msg.loadFailed'), 'error', 5000);
      return;
    }
    change(() => { app.project = project; });
    app.sel = [];
    fitView();
    renderAll();
    toast(t('msg.loaded', { name: project.name || t('msg.untitled') }), 'success', 3200, undoAction());
    track('map_open');
  }

  function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => openFileData(String(reader.result || ''));
    reader.onerror = () => toast(t('msg.loadFailed'), 'error', 5000);
    reader.readAsText(file);
  }

  /* ================= 履歴 ================= */

  const snapshot = () => JSON.stringify(app.project);

  function pushUndo(before) {
    app.undo.push(before);
    if (app.undo.length > HISTORY_LIMIT) app.undo.shift();
    app.redo = [];
    syncHistoryButtons();
  }

  // 変更をまとめて1回の「元に戻す」にする
  function change(fn) {
    const before = snapshot();
    fn();
    if (snapshot() !== before) {
      pushUndo(before);
      touched();
      return true;
    }
    return false;
  }

  function touched() {
    app.rev++;
    ui.linesCache = null;
    scheduleSave();
    requestRender();
    refreshProps();
  }

  function restore(json) {
    app.project = JSON.parse(json);
    app.project.active = clamp(app.project.active, 0, app.project.floors.length - 1);
    app.sel = app.sel.filter(s => getObj(s.type, s.id));
    touched();
    renderProps(true);
    renderFloorBar();
    syncHistoryButtons();
  }

  function undo() {
    flushNudge();
    if (!app.undo.length) {
      toast(t('msg.noUndo'), 'info', 1600);
      return;
    }
    app.redo.push(snapshot());
    restore(app.undo.pop());
  }

  function redo() {
    if (!app.redo.length) return;
    app.undo.push(snapshot());
    restore(app.redo.pop());
  }

  const undoAction = () => ({ label: t('msg.undo'), run: undo });

  function syncHistoryButtons() {
    els.undoBtn.disabled = !app.undo.length;
    els.redoBtn.disabled = !app.redo.length;
  }

  /* ================= 選択 ================= */

  function getObj(type, id, floor) {
    const f = floor || cur();
    const arr = f && f[TYPE_KEY[type]];
    return arr ? arr.find(o => o.id === id) || null : null;
  }

  const isSelected = (type, id) => app.sel.some(s => s.type === type && s.id === id);
  const selEntries = () => app.sel.map(s => ({ ...s, obj: getObj(s.type, s.id) })).filter(s => s.obj);

  function setSelection(next) {
    app.sel = next;
    renderProps();
    requestRender();
  }

  function selectAll() {
    const f = M.visibleFloor(cur(), app.playerView);
    const next = [];
    Object.entries(TYPE_KEY).forEach(([type, key]) => f[key].forEach(o => next.push({ type, id: o.id })));
    setSelection(next);
  }

  /* ================= 座標と表示範囲 ================= */

  const toWorld = (sx, sy) => ({ x: (sx - view.ox) / view.zoom, y: (sy - view.oy) / view.zoom });
  const toScreen = (x, y) => ({ x: x * view.zoom + view.ox, y: y * view.zoom + view.oy });

  function eventPos(event) {
    const rect = els.canvas.getBoundingClientRect();
    return { sx: event.clientX - rect.left, sy: event.clientY - rect.top };
  }

  function resizeCanvas() {
    const rect = els.wrap.getBoundingClientRect();
    const prevW = view.w, prevH = view.h;
    view.w = Math.max(1, rect.width);
    view.h = Math.max(1, rect.height);
    view.dpr = window.devicePixelRatio || 1;
    els.canvas.width = Math.round(view.w * view.dpr);
    els.canvas.height = Math.round(view.h * view.dpr);
    if (prevW && prevH) {
      view.ox += (view.w - prevW) / 2;
      view.oy += (view.h - prevH) / 2;
    }
    requestRender();
  }

  function projectBounds() {
    let box = null;
    app.project.floors.forEach(f => {
      const b = M.floorBounds(f);
      if (!b) return;
      if (!box) { box = { ...b }; return; }
      const x2 = Math.max(box.x + box.w, b.x + b.w), y2 = Math.max(box.y + box.h, b.y + b.h);
      box.x = Math.min(box.x, b.x); box.y = Math.min(box.y, b.y);
      box.w = x2 - box.x; box.h = y2 - box.y;
    });
    return box;
  }

  // 全フロア共通の範囲で合わせる（階を切り替えても図面の位置がずれない）
  function fitView() {
    if (!view.w) return;
    const box = projectBounds() || { x: 0, y: 0, w: 24, h: 16 };
    const padL = 64, padR = 24, padT = 24, padB = 56;
    const availW = Math.max(80, view.w - padL - padR);
    const availH = Math.max(80, view.h - padT - padB);
    view.zoom = clamp(Math.min(availW / Math.max(box.w, 4), availH / Math.max(box.h, 4)), ZOOM_MIN, 64);
    view.ox = padL + (availW - box.w * view.zoom) / 2 - box.x * view.zoom;
    view.oy = padT + (availH - box.h * view.zoom) / 2 - box.y * view.zoom;
    syncZoom();
    requestRender();
  }

  function zoomAt(sx, sy, factor) {
    const next = clamp(view.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    const w = toWorld(sx, sy);
    view.zoom = next;
    view.ox = sx - w.x * next;
    view.oy = sy - w.y * next;
    syncZoom();
    requestRender();
  }

  function syncZoom() {
    els.zoomValue.textContent = `${Math.round((view.zoom / ZOOM_BASE) * 100)}%`;
  }

  /* ================= 壁の線（ドア・窓・家具の吸着先） ================= */

  function wallLines() {
    const f = cur();
    if (ui.linesCache && ui.linesCache.rev === app.rev && ui.linesCache.id === f.id) return ui.linesCache.lines;
    const bare = { ...f, openings: [] };
    const lines = M.computeWalls(bare, {}).runs.filter(r => r.kind !== 'zone');
    ui.linesCache = { rev: app.rev, id: f.id, lines };
    return lines;
  }

  const lineOf = o => (o.o === 'h' ? o.y : o.x);
  const startOf = o => (o.o === 'h' ? o.x : o.y);

  function snapOpening(wx, wy, kind, len, ignoreId) {
    const info = M.OPEN[kind];
    const want = len || info.len;
    let best = null;
    wallLines().forEach(r => {
      const along = r.o === 'h' ? wx : wy;
      const across = r.o === 'h' ? wy : wx;
      const d = Math.abs(across - r.c);
      if (d > 1.25 || along < r.a - 0.4 || along > r.b + 0.4) return;
      if (!best || d < best.d) best = { r, d, along, across };
    });
    if (!best) return null;
    const { r, along, across } = best;
    const size = Math.min(want, r.b - r.a);
    const start = clamp(M.snap(along - size / 2, 0.25), r.a, r.b - size);
    const o = r.o === 'h' ? { o: 'h', x: start, y: r.c } : { o: 'v', x: r.c, y: start };
    const clash = cur().openings.some(op => op.id !== ignoreId && op.o === o.o && Math.abs(lineOf(op) - r.c) < 1e-6
      && startOf(op) < start + size - 1e-6 && start < startOf(op) + op.len - 1e-6);
    return { ...o, len: size, side: across >= r.c ? 1 : -1, kind, t: (M.WALL[r.kind] || M.WALL.int).t, clash };
  }

  const dimsFor = (asset, rot) => (rot === 90 || rot === 270 ? { w: asset.h, h: asset.w } : { w: asset.w, h: asset.h });

  // 家具の外形を近くの壁に吸着させる（縁が 0.3マス以内なら壁の線に合わせる）
  function magnet(rect, reach = 0.3) {
    let bestX = null, bestY = null;
    wallLines().forEach(r => {
      if (r.o === 'v' && r.a < rect.y + rect.h && r.b > rect.y) {
        [[rect.x, r.c], [rect.x + rect.w, r.c - rect.w]].forEach(([edge, x]) => {
          const d = Math.abs(edge - r.c);
          if (d < reach && (!bestX || d < bestX.d)) bestX = { d, x };
        });
      }
      if (r.o === 'h' && r.a < rect.x + rect.w && r.b > rect.x) {
        [[rect.y, r.c], [rect.y + rect.h, r.c - rect.h]].forEach(([edge, y]) => {
          const d = Math.abs(edge - r.c);
          if (d < reach && (!bestY || d < bestY.d)) bestY = { d, y };
        });
      }
    });
    return { ...rect, x: bestX ? bestX.x : rect.x, y: bestY ? bestY.y : rect.y };
  }

  function itemGhost(wx, wy, armed, free) {
    const asset = M.ASSET[armed.t];
    let rot = armed.rot || 0;
    let d = dimsFor(asset, rot);
    let rect = { x: M.snap(wx - d.w / 2, 0.25), y: M.snap(wy - d.h / 2, 0.25), w: d.w, h: d.h };
    if (free) return { t: armed.t, rot, ...rect };
    if (ORIENT.has(armed.t)) {
      const depth = asset.h;
      let best = null;
      wallLines().forEach(r => {
        if (r.kind === 'rail') return;
        if (r.o === 'h' && wx > r.a && wx < r.b) {
          const d = Math.abs(wy - r.c);
          if (d < depth / 2 + 1.1 && (!best || d < best.d)) best = { d, r, dir: wy > r.c ? 'up' : 'down' };
        }
        if (r.o === 'v' && wy > r.a && wy < r.b) {
          const d = Math.abs(wx - r.c);
          if (d < depth / 2 + 1.1 && (!best || d < best.d)) best = { d, r, dir: wx > r.c ? 'left' : 'right' };
        }
      });
      if (best) {
        if (!armed.manual) rot = { up: 0, right: 90, down: 180, left: 270 }[best.dir];
        d = dimsFor(asset, rot);
        const c = best.r.c;
        if (best.dir === 'up') rect = { x: M.snap(wx - d.w / 2, 0.25), y: c, w: d.w, h: d.h };
        if (best.dir === 'down') rect = { x: M.snap(wx - d.w / 2, 0.25), y: c - d.h, w: d.w, h: d.h };
        if (best.dir === 'left') rect = { x: c, y: M.snap(wy - d.h / 2, 0.25), w: d.w, h: d.h };
        if (best.dir === 'right') rect = { x: c - d.w, y: M.snap(wy - d.h / 2, 0.25), w: d.w, h: d.h };
        rect = magnet(rect);
        return { t: armed.t, rot, ...rect };
      }
    }
    return { t: armed.t, rot, ...magnet(rect) };
  }

  /* ================= 当たり判定 ================= */

  function inRect(x, y, r, pad = 0) {
    return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
  }

  function segDist(px, py, w) {
    const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
    const len2 = dx * dx + dy * dy || 1e-9;
    const k = clamp(((px - w.x1) * dx + (py - w.y1) * dy) / len2, 0, 1);
    return Math.hypot(px - (w.x1 + k * dx), py - (w.y1 + k * dy));
  }

  const labelOpts = () => ({ playerView: app.playerView, showSize: app.project.showSize, hideNames: app.project.showNames === false, lang: app.lang });

  function hitTest(wx, wy, options = {}) {
    const f = M.visibleFloor(cur(), app.playerView);
    const tol = 5 / view.zoom;
    const th = theme();
    for (let i = f.texts.length - 1; i >= 0; i--) {
      if (inRect(wx, wy, M.textBox(ctx, f.texts[i], th), tol)) return { type: 'text', id: f.texts[i].id };
    }
    for (let i = f.openings.length - 1; i >= 0; i--) {
      const o = f.openings[i];
      const along = (o.o === 'h' ? wx : wy) - startOf(o);
      const across = (o.o === 'h' ? wy : wx) - lineOf(o);
      if (along >= -tol && along <= o.len + tol && Math.abs(across) <= Math.max(0.32, tol * 1.4)) return { type: 'opening', id: o.id };
    }
    const under = it => Boolean(M.ASSET[it.t] && M.ASSET[it.t].under);
    const over = f.items.filter(it => !under(it));
    const low = f.items.filter(under);
    for (const group of [over, low]) {
      for (let i = group.length - 1; i >= 0; i--) {
        const it = group[i];
        const pad = Math.min(it.w, it.h) * view.zoom < 12 ? tol : 0;
        if (inRect(wx, wy, it, pad)) return { type: 'item', id: it.id };
      }
    }
    for (let i = f.walls.length - 1; i >= 0; i--) {
      if (segDist(wx, wy, f.walls[i]) <= Math.max(0.25, tol)) return { type: 'wall', id: f.walls[i].id };
    }
    if (options.skipRooms) return null;
    let best = null;
    f.rooms.forEach((r, index) => {
      if (!inRect(wx, wy, r)) return;
      const area = r.w * r.h;
      if (!best || area < best.area || (area === best.area && index > best.index)) best = { id: r.id, area, index };
    });
    return best ? { type: 'room', id: best.id } : null;
  }

  function objBounds(type, o) {
    if (type === 'room' || type === 'item') return { x: o.x, y: o.y, w: o.w, h: o.h };
    if (type === 'opening') return M.openingRect(o, 0.3);
    if (type === 'wall') return { x: Math.min(o.x1, o.x2) - 0.15, y: Math.min(o.y1, o.y2) - 0.15, w: Math.abs(o.x2 - o.x1) + 0.3, h: Math.abs(o.y2 - o.y1) + 0.3 };
    return M.textBox(ctx, o, theme());
  }

  function selectionBounds() {
    let box = null;
    selEntries().forEach(({ type, obj }) => {
      const b = objBounds(type, obj);
      if (!box) { box = { ...b }; return; }
      const x2 = Math.max(box.x + box.w, b.x + b.w), y2 = Math.max(box.y + box.h, b.y + b.h);
      box.x = Math.min(box.x, b.x); box.y = Math.min(box.y, b.y);
      box.w = x2 - box.x; box.h = y2 - box.y;
    });
    return box;
  }

  const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

  // 選択中の1つのものに付く小さな取っ手（画面座標）
  function handles() {
    if (app.sel.length !== 1 || app.tool !== 'select') return [];
    const [{ type, obj }] = selEntries();
    if (!obj) return [];
    const out = [];
    if (type === 'room' && obj.locked) {
      // ロック中の部屋は大きさを変えられない（名前の位置だけ動かせる）
      if (!obj.hideLabel) {
        const m = M.labelMetrics(ctx, obj, labelOpts(), theme());
        if (m) {
          const p = toScreen(m.box.x + m.box.w, m.box.y + m.box.h / 2);
          out.push({ id: 'label', x: p.x + 9, y: p.y, cursor: 'move', round: true });
        }
      }
    } else if (type === 'room' || type === 'item') {
      const a = toScreen(obj.x, obj.y), b = toScreen(obj.x + obj.w, obj.y + obj.h);
      const g = 5;
      const x1 = a.x - g, y1 = a.y - g, x2 = b.x + g, y2 = b.y + g, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const small = b.x - a.x < 30 || b.y - a.y < 30;
      out.push({ id: 'nw', x: x1, y: y1 }, { id: 'ne', x: x2, y: y1 }, { id: 'se', x: x2, y: y2 }, { id: 'sw', x: x1, y: y2 });
      if (!small) out.push({ id: 'n', x: cx, y: y1 }, { id: 'e', x: x2, y: cy }, { id: 's', x: cx, y: y2 }, { id: 'w', x: x1, y: cy });
      out.forEach(hd => { hd.cursor = CURSORS[hd.id]; });
      if (type === 'room' && !obj.hideLabel) {
        const m = M.labelMetrics(ctx, obj, labelOpts(), theme());
        if (m) {
          const p = toScreen(m.box.x + m.box.w, m.box.y + m.box.h / 2);
          out.push({ id: 'label', x: p.x + 9, y: p.y, cursor: 'move', round: true });
        }
      }
    } else if (type === 'opening') {
      const a = obj.o === 'h' ? toScreen(obj.x, obj.y) : toScreen(obj.x, obj.y);
      const b = obj.o === 'h' ? toScreen(obj.x + obj.len, obj.y) : toScreen(obj.x, obj.y + obj.len);
      const cursor = obj.o === 'h' ? 'ew-resize' : 'ns-resize';
      out.push({ id: 'a', x: a.x, y: a.y, cursor }, { id: 'b', x: b.x, y: b.y, cursor });
    } else if (type === 'wall') {
      const a = toScreen(obj.x1, obj.y1), b = toScreen(obj.x2, obj.y2);
      out.push({ id: 'a', x: a.x, y: a.y, cursor: 'move' }, { id: 'b', x: b.x, y: b.y, cursor: 'move' });
    }
    return out;
  }

  function handleAt(sx, sy) {
    return handles().find(hd => Math.abs(hd.x - sx) <= HANDLE && Math.abs(hd.y - sy) <= HANDLE) || null;
  }

  /* ================= 描画 ================= */

  function requestRender() {
    if (view.dirty) return;
    view.dirty = true;
    requestAnimationFrame(render);
  }

  function render() {
    view.dirty = false;
    if (!app.project) return;
    const c = ctx;
    const th = theme();
    const z = view.zoom;
    const dpr = view.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, els.canvas.width, els.canvas.height);
    c.setTransform(dpr * z, 0, 0, dpr * z, dpr * view.ox, dpr * view.oy);
    const viewRect = { x: -view.ox / z, y: -view.oy / z, w: view.w / z, h: view.h / z };
    const ghost = app.ghost && app.project.active > 0 ? app.project.floors[app.project.active - 1] : null;
    M.drawFloor(c, cur(), {
      theme: th, zoom: z, lang: app.lang, showSize: app.project.showSize, hideNames: app.project.showNames === false,
      playerView: app.playerView, editor: true, grid: app.grid, viewRect, ghost
    });
    drawOverlays(c, th);
    els.wrap.style.background = th.bg;
    positionMiniBar();
  }

  function outline(c, r, width, dash) {
    const px = 1 / view.zoom;
    c.save();
    c.lineWidth = (width + 2) * px;
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.strokeRect(r.x, r.y, r.w, r.h);
    c.lineWidth = width * px;
    c.strokeStyle = SEL;
    if (dash) c.setLineDash([4 * px, 3 * px]);
    c.strokeRect(r.x, r.y, r.w, r.h);
    c.restore();
  }

  function drawObjOutline(c, type, obj, width, dash) {
    if (type === 'wall') {
      const px = 1 / view.zoom;
      c.save();
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.lineWidth = Math.max(0.36, (width + 8) * px);
      c.beginPath(); c.moveTo(obj.x1, obj.y1); c.lineTo(obj.x2, obj.y2); c.stroke();
      c.strokeStyle = SEL;
      c.globalAlpha = 0.55;
      c.lineWidth = Math.max(0.3, (width + 5) * px);
      c.stroke();
      c.restore();
      return;
    }
    outline(c, objBounds(type, obj), width, dash);
  }

  function screenLabel(c, text, sx, sy) {
    c.save();
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    c.font = '800 12px system-ui, sans-serif';
    const w = c.measureText(text).width + 14;
    const x = clamp(sx - w / 2, 4, view.w - w - 4), y = clamp(sy, 4, view.h - 26);
    c.fillStyle = 'rgba(31, 42, 58, 0.88)';
    M.drawHelpers.rr(c, x, y, w, 22, 11);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textBaseline = 'middle';
    c.fillText(text, x + 7, y + 11.5);
    c.restore();
  }

  const meters = (w, h) => `${fmt(w * M.CELL_M)}×${fmt(h * M.CELL_M)}m`;

  function drawOverlays(c, th) {
    const px = 1 / view.zoom;
    const f = cur();
    // GMメモのある部屋に印
    if (!app.playerView) {
      f.rooms.forEach(r => {
        if (!r.note) return;
        const s = Math.min(0.55, r.w * 0.2, r.h * 0.2);
        const x = r.x + r.w - s - 0.22, y = r.y + 0.22;
        c.save();
        c.fillStyle = th.gm;
        c.globalAlpha = 0.9;
        M.drawHelpers.rr(c, x, y, s, s * 1.15, s * 0.12);
        c.fill();
        c.strokeStyle = th.bg === 'transparent' ? '#fff' : th.bg;
        c.lineWidth = s * 0.1;
        c.beginPath();
        c.moveTo(x + s * 0.22, y + s * 0.38); c.lineTo(x + s * 0.78, y + s * 0.38);
        c.moveTo(x + s * 0.22, y + s * 0.62); c.lineTo(x + s * 0.78, y + s * 0.62);
        c.moveTo(x + s * 0.22, y + s * 0.86); c.lineTo(x + s * 0.6, y + s * 0.86);
        c.stroke();
        c.restore();
      });
    }
    // ロック中の部屋に鍵の印
    f.rooms.forEach(r => {
      if (!r.locked || (app.playerView && r.gm)) return;
      const s = Math.min(0.55, r.w * 0.2, r.h * 0.2);
      const x = r.x + 0.22, y = r.y + 0.22;
      c.save();
      c.strokeStyle = th.label;
      c.fillStyle = th.label;
      c.globalAlpha = 0.75;
      c.lineWidth = s * 0.14;
      c.beginPath();
      c.arc(x + s / 2, y + s * 0.45, s * 0.26, Math.PI, 0);
      c.lineTo(x + s * 0.76, y + s * 0.55);
      c.moveTo(x + s * 0.24, y + s * 0.55);
      c.lineTo(x + s * 0.24, y + s * 0.45);
      c.stroke();
      M.drawHelpers.rr(c, x + s * 0.1, y + s * 0.55, s * 0.8, s * 0.6, s * 0.1);
      c.fill();
      c.restore();
    });
    // ホバー
    if (ui.hover && !ui.drag && app.tool === 'select' && !isSelected(ui.hover.type, ui.hover.id)) {
      const obj = getObj(ui.hover.type, ui.hover.id);
      if (obj) {
        c.save();
        c.globalAlpha = 0.55;
        drawObjOutline(c, ui.hover.type, obj, 1.2);
        c.restore();
      }
    }
    if (app.tool === 'eraser' && ui.hover) {
      const obj = getObj(ui.hover.type, ui.hover.id);
      if (obj) {
        const b = objBounds(ui.hover.type, obj);
        c.save();
        c.fillStyle = 'rgba(207, 61, 61, 0.14)';
        c.fillRect(b.x, b.y, b.w, b.h);
        c.strokeStyle = '#cf3d3d';
        c.lineWidth = 1.5 * px;
        c.strokeRect(b.x, b.y, b.w, b.h);
        c.restore();
      }
    }
    // 選択
    selEntries().forEach(({ type, obj }) => {
      if (type === 'room') {
        c.save();
        c.fillStyle = 'rgba(47, 124, 246, 0.07)';
        c.fillRect(obj.x, obj.y, obj.w, obj.h);
        c.restore();
      }
      drawObjOutline(c, type, obj, 1.6);
    });
    // 取っ手
    const hs = ui.drag && ui.drag.mode !== 'resize' && ui.drag.mode !== 'label' ? [] : handles();
    if (hs.length) {
      c.save();
      c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      hs.forEach(hd => {
        c.fillStyle = '#ffffff';
        c.strokeStyle = SEL;
        c.lineWidth = 1.5;
        c.beginPath();
        if (hd.round) {
          c.arc(hd.x, hd.y, 5.5, 0, Math.PI * 2);
          c.fill(); c.stroke();
          c.beginPath();
          c.moveTo(hd.x - 3, hd.y); c.lineTo(hd.x + 3, hd.y);
          c.moveTo(hd.x, hd.y - 3); c.lineTo(hd.x, hd.y + 3);
          c.stroke();
        } else {
          c.rect(hd.x - 3.5, hd.y - 3.5, 7, 7);
          c.fill(); c.stroke();
        }
      });
      c.restore();
    }
    const d = ui.drag;
    // 部屋を描く
    if (d && d.mode === 'room' && d.rect) {
      const r = d.rect;
      c.save();
      const cat = (app.armed && app.armed.kind === 'room' && ROOM_PRESETS[app.armed.preset]) ? ROOM_PRESETS[app.armed.preset].cat : 'living';
      c.fillStyle = M.roomFill(th, { cat });
      c.globalAlpha = 0.85;
      c.fillRect(r.x, r.y, r.w, r.h);
      c.globalAlpha = 1;
      c.strokeStyle = SEL;
      c.lineWidth = 2 * px;
      c.setLineDash([5 * px, 3 * px]);
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.restore();
      const p = toScreen(r.x + r.w / 2, r.y + r.h);
      screenLabel(c, `${meters(r.w, r.h)} · ${fmt((r.w * r.h * M.CELL_M * M.CELL_M) / M.TATAMI_M2)}${app.lang === 'en' ? ' jo' : app.lang === 'ko' ? '첩' : '帖'}`, p.x, p.y + 8);
    }
    // 壁を引く
    if (d && d.mode === 'wall' && d.b) {
      const kind = M.WALL[(app.armed && app.armed.type) || 'int'] || M.WALL.int;
      c.save();
      c.strokeStyle = th.wall;
      c.globalAlpha = 0.7;
      c.lineCap = 'square';
      c.lineWidth = kind.t;
      c.beginPath(); c.moveTo(d.a.x, d.a.y); c.lineTo(d.b.x, d.b.y); c.stroke();
      c.restore();
      const p = toScreen((d.a.x + d.b.x) / 2, (d.a.y + d.b.y) / 2);
      screenLabel(c, `${fmt(Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) * M.CELL_M)}m`, p.x, p.y + 10);
    }
    // 範囲選択
    if (d && d.mode === 'marquee' && d.rect) {
      c.save();
      c.fillStyle = 'rgba(47, 124, 246, 0.08)';
      c.fillRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
      c.strokeStyle = SEL;
      c.lineWidth = px;
      c.setLineDash([4 * px, 3 * px]);
      c.strokeRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h);
      c.restore();
    }
    // サイズ変更中の寸法
    if (d && d.mode === 'resize') {
      const obj = getObj(d.type, d.id);
      if (obj && (d.type === 'room' || d.type === 'item')) {
        const p = toScreen(obj.x + obj.w / 2, obj.y + obj.h);
        screenLabel(c, meters(obj.w, obj.h), p.x, p.y + 12);
      } else if (obj && d.type === 'opening') {
        const p = toScreen(obj.o === 'h' ? obj.x + obj.len / 2 : obj.x, obj.o === 'h' ? obj.y : obj.y + obj.len / 2);
        screenLabel(c, `${fmt(obj.len * M.CELL_M)}m`, p.x, p.y + 14);
      }
    }
    // ドア・窓の配置予定
    const go = ui.ghostOpening;
    if (go && !ui.drag) {
      c.save();
      c.globalAlpha = go.clash ? 0.35 : 0.85;
      c.fillStyle = th.bg === 'transparent' ? '#ffffff' : th.bg;
      if (go.o === 'h') c.fillRect(go.x, go.y - go.t / 2 - px, go.len, go.t + px * 2);
      else c.fillRect(go.x - go.t / 2 - px, go.y, go.t + px * 2, go.len);
      M.drawOpening(c, { ...go, hinge: (app.armed && app.armed.hinge) || 0 }, go.t, th, M.lineWidth(view.zoom), { playerView: false, editor: true });
      c.globalAlpha = 1;
      const r = M.openingRect(go, 0.34);
      c.strokeStyle = go.clash ? '#cf3d3d' : SEL;
      c.lineWidth = 1.5 * px;
      c.setLineDash([4 * px, 3 * px]);
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.restore();
    }
    // 家具の配置予定
    const gi = ui.ghostItem;
    if (gi && !ui.drag) {
      c.save();
      c.globalAlpha = 0.72;
      M.drawItem(c, { ...gi, id: 'ghost' }, th, M.lineWidth(view.zoom), { editor: true });
      c.restore();
      outline(c, gi, 1.2, true);
    }
  }

  /* ================= ミニツールバー ================= */

  function positionMiniBar() {
    const show = app.tool === 'select' && app.sel.length > 0 && !(ui.drag && ui.drag.moved);
    if (!show) { els.miniBar.hidden = true; return; }
    const box = selectionBounds();
    if (!box) { els.miniBar.hidden = true; return; }
    const entries = selEntries();
    const types = new Set(entries.map(e => e.type));
    const onlyItems = types.size === 1 && types.has('item');
    const oneDoor = entries.length === 1 && entries[0].type === 'opening' && SWING_DOORS.has(entries[0].obj.kind);
    const rooms = entries.filter(e => e.type === 'room');
    const gmBtn = els.miniBar.querySelector('[data-mini="gm"]');
    const gmOnly = entries.every(e => e.obj.gm);
    if (gmBtn.dataset.state !== String(gmOnly)) {
      gmBtn.dataset.state = String(gmOnly);
      gmBtn.innerHTML = gmOnly ? ICONS.eyeOff : ICONS.eye;
    }
    gmBtn.classList.toggle('is-gm', gmOnly);
    gmBtn.title = t(gmOnly ? 'mini.gmOnly' : 'mini.plVisible');
    gmBtn.setAttribute('aria-label', gmBtn.title);
    gmBtn.setAttribute('aria-pressed', String(gmOnly));
    const lockBtn = els.miniBar.querySelector('[data-mini="lock"]');
    lockBtn.hidden = !rooms.length;
    if (rooms.length) {
      const locked = rooms.every(e => e.obj.locked);
      const label = t(locked ? 'mini.unlock' : 'mini.lock');
      if (lockBtn.dataset.state !== String(locked)) {
        lockBtn.dataset.state = String(locked);
        lockBtn.innerHTML = locked ? ICONS.lock : ICONS.unlock;
      }
      lockBtn.classList.toggle('is-on', locked);
      lockBtn.title = label;
      lockBtn.setAttribute('aria-label', label);
    }
    const rotateBtn = els.miniBar.querySelector('[data-mini="rotate"]');
    rotateBtn.hidden = !(onlyItems || rooms.length);
    rotateBtn.disabled = rooms.length > 0 && rooms.every(e => e.obj.locked);
    els.miniBar.querySelector('[data-mini="flip"]').hidden = !(onlyItems || oneDoor);
    els.miniBar.querySelector('[data-mini="hinge"]').hidden = !oneDoor;
    const a = toScreen(box.x + box.w / 2, box.y);
    const bottom = toScreen(box.x, box.y + box.h).y;
    let top = a.y - 12;
    let below = false;
    if (top < 48) { top = bottom + 50; below = true; }
    const x = clamp(a.x, 110, view.w - 110);
    const y = clamp(top, 46, view.h - 8);
    if (y > view.h - 60 && below) { els.miniBar.hidden = true; return; }
    els.miniBar.style.left = `${x}px`;
    els.miniBar.style.top = `${y}px`;
    els.miniBar.hidden = false;
  }

  /* ================= ツール ================= */

  function setTool(tool, armed) {
    app.tool = tool;
    if (armed !== undefined) app.armed = armed;
    else if (tool === 'door') app.armed = { kind: 'opening', type: 'door', hinge: 0 };
    else if (tool === 'window') app.armed = { kind: 'opening', type: 'window', hinge: 0 };
    else if (tool === 'wall') app.armed = { kind: 'wall', type: 'int' };
    else app.armed = null;
    ui.ghostItem = null;
    ui.ghostOpening = null;
    ui.hover = null;
    els.toolStrip.querySelectorAll('[data-tool]').forEach(btn => {
      const on = btn.dataset.tool === tool;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    syncLibraryActive();
    updateHint(true);
    updateCursor();
    if (ui.pointer) pointerHover(ui.pointer.sx, ui.pointer.sy, {});
    requestRender();
  }

  function armedName() {
    const a = app.armed;
    if (!a) return '';
    if (a.kind === 'opening') return pick(M.OPEN[a.type].name);
    if (a.kind === 'item') return pick(M.ASSET[a.t].name);
    if (a.kind === 'room') return t(`roomPresets.${a.preset}`);
    if (a.kind === 'wall') return pick(M.WALL[a.type].name);
    return '';
  }

  function updateHint(force, warn) {
    let text = '';
    const a = app.armed;
    if (app.tool === 'room' && a && a.preset) {
      const p = ROOM_PRESETS[a.preset];
      text = t('hints.roomPreset', { name: armedName(), size: meters(p.w, p.h) });
    } else if ((app.tool === 'door' || app.tool === 'window') && a) {
      text = warn ? t('hints.noWall') : t('hints.opening', { name: armedName() });
    } else if (app.tool === 'place' && a) {
      text = t('hints.place', { name: armedName() });
    } else {
      text = t(`hints.${app.tool}`);
    }
    const key = `${app.lang}|${text}|${warn ? 1 : 0}`;
    if (!force && key === ui.hintKey) return;
    ui.hintKey = key;
    els.hint.textContent = text;
    els.hint.classList.toggle('is-warn', Boolean(warn));
  }

  function updateCursor(handle) {
    let cursor = 'default';
    const d = ui.drag;
    if (d && d.mode === 'pan') cursor = 'grabbing';
    else if (ui.spaceDown || app.tool === 'hand') cursor = 'grab';
    else if (d && d.mode === 'move') cursor = 'move';
    else if (d && d.mode === 'resize') cursor = d.cursor || 'move';
    else if (handle) cursor = handle.cursor;
    else if (app.tool === 'select') cursor = ui.hover ? 'move' : 'default';
    else if (app.tool === 'text') cursor = 'text';
    else if (app.tool === 'eraser') cursor = ui.hover ? 'pointer' : 'default';
    else if (app.tool === 'place' || app.tool === 'door' || app.tool === 'window') cursor = 'copy';
    else cursor = 'crosshair';
    if (els.canvas.style.cursor !== cursor) els.canvas.style.cursor = cursor;
  }

  /* ================= 追加・削除・複製 ================= */

  function addObject(type, obj) {
    cur()[TYPE_KEY[type]].push(obj);
    return obj;
  }

  function newRoom(rect, presetId) {
    const p = presetId ? ROOM_PRESETS[presetId] : null;
    return { id: M.uid('r'), x: rect.x, y: rect.y, w: rect.w, h: rect.h, name: p ? t(`roomPresets.${p.id}`) : t('newRoom'), cat: p ? p.cat : 'living' };
  }

  function deleteSelection() {
    const all = selEntries();
    const entries = all.filter(e => !(e.type === 'room' && e.obj.locked));
    if (entries.length < all.length) toast(t('msg.lockedSkip'), 'warning', 3200);
    if (!entries.length) return;
    const hadRoom = entries.some(e => e.type === 'room');
    change(() => {
      const f = cur();
      entries.forEach(({ type, id }) => {
        const key = TYPE_KEY[type];
        f[key] = f[key].filter(o => o.id !== id);
      });
    });
    app.sel = [];
    renderProps(true);
    requestRender();
    if (hadRoom || entries.length > 2) toast(t('msg.deleted', { n: entries.length }), 'info', 3200, undoAction());
  }

  // 部屋の中にあるもの（家具・ドア/窓・文字・入れ子の部屋・壁）
  function roomContents(f, room) {
    const out = [];
    const closed = (x, y) => x >= room.x - 1e-6 && x <= room.x + room.w + 1e-6 && y >= room.y - 1e-6 && y <= room.y + room.h + 1e-6;
    const open = (x, y) => x > room.x && x < room.x + room.w && y > room.y && y < room.y + room.h;
    f.items.forEach(i => { if (open(i.x + i.w / 2, i.y + i.h / 2)) out.push({ type: 'item', id: i.id }); });
    f.texts.forEach(x => { if (open(x.x, x.y)) out.push({ type: 'text', id: x.id }); });
    f.openings.forEach(o => {
      const mx = o.o === 'h' ? o.x + o.len / 2 : o.x;
      const my = o.o === 'h' ? o.y : o.y + o.len / 2;
      if (closed(mx, my)) out.push({ type: 'opening', id: o.id });
    });
    f.rooms.forEach(r => { if (r.id !== room.id && M.rectContains(room, r)) out.push({ type: 'room', id: r.id }); });
    f.walls.forEach(w => { if (closed(w.x1, w.y1) && closed(w.x2, w.y2)) out.push({ type: 'wall', id: w.id }); });
    return out;
  }

  function withContents(sel, alone) {
    const f = cur();
    const seen = new Set();
    const out = [];
    const add = s => {
      const key = `${s.type}:${s.id}`;
      if (seen.has(key) || !getObj(s.type, s.id)) return;
      seen.add(key);
      out.push(s);
    };
    sel.forEach(add);
    if (!alone) sel.filter(s => s.type === 'room').forEach(s => roomContents(f, getObj(s.type, s.id)).forEach(add));
    return out;
  }

  // 動かしてよいもの：ロック中の部屋は外す（中身も、別に選んだもの以外は動かさない）
  function movable(sel, alone) {
    const key = s => `${s.type}:${s.id}`;
    const f = cur();
    const isLocked = s => s.type === 'room' && Boolean((getObj(s.type, s.id) || {}).locked);
    const top = sel.filter(s => !isLocked(s));
    // 選んだ部屋ごとの中身（Alt のときは部屋だけ）
    const carried = alone ? [] : top.filter(s => s.type === 'room').map(s => {
      const room = getObj('room', s.id);
      return { room, keys: new Set(roomContents(f, room).map(key)) };
    });
    // ロック中の部屋は動かさない。その中身も動かさないが、ロック中の部屋より小さい部屋（中のクローゼットなど）の
    // 中身として運ぶときと、直接選んだものは動かす
    const pinned = new Set();
    f.rooms.filter(r => r.locked).forEach(r => {
      pinned.add(`room:${r.id}`);
      roomContents(f, r).forEach(c => {
        const k = key(c);
        if (!carried.some(cr => cr.keys.has(k) && cr.room.w * cr.room.h < r.w * r.h)) pinned.add(k);
      });
    });
    const picked = new Set(top.map(key));
    return withContents(top, alone).filter(s => !pinned.has(key(s)) || (picked.has(key(s)) && !isLocked(s)));
  }

  function translate(type, o, dx, dy) {
    if (type === 'wall') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; } else { o.x += dx; o.y += dy; }
  }

  function cloneEntries(entries, dx, dy) {
    return entries.map(({ type, id }) => {
      const copy = M.clone(getObj(type, id));
      copy.id = M.uid(type[0]);
      delete copy.locked;
      translate(type, copy, dx, dy);
      return { type, obj: copy, src: id };
    });
  }

  function copyOffset(entries) {
    const rooms = entries.filter(e => e.type === 'room').map(e => getObj(e.type, e.id));
    if (!rooms.length) return { dx: 1, dy: 1 };
    const x1 = Math.min(...rooms.map(r => r.x)), x2 = Math.max(...rooms.map(r => r.x + r.w));
    return { dx: x2 - x1, dy: 0 };
  }

  function duplicateSelection() {
    if (!app.sel.length) return;
    const entries = withContents(app.sel, false);
    const { dx, dy } = copyOffset(entries);
    const clones = cloneEntries(entries, dx, dy);
    change(() => clones.forEach(cl => addObject(cl.type, cl.obj)));
    const top = new Set(app.sel.map(s => s.id));
    setSelection(clones.filter(cl => top.has(cl.src)).map(cl => ({ type: cl.type, id: cl.obj.id })));
  }

  function copySelection(cut) {
    if (!app.sel.length) return;
    const entries = withContents(app.sel, false);
    const top = new Set(app.sel.map(s => s.id));
    app.clipboard = {
      offset: copyOffset(entries),
      floor: cur().id,
      shift: 0,
      entries: entries.map(e => ({ type: e.type, obj: M.clone(getObj(e.type, e.id)), top: top.has(e.id) }))
    };
    if (cut) deleteSelection();
  }

  function paste() {
    const cb = app.clipboard;
    if (!cb) return;
    const sameFloor = cb.floor === cur().id && cur()[TYPE_KEY[cb.entries[0].type]].some(o => o.id === cb.entries[0].obj.id);
    if (sameFloor) cb.shift += 1;
    const dx = sameFloor ? cb.offset.dx * cb.shift : 0;
    const dy = sameFloor ? cb.offset.dy * cb.shift : 0;
    const added = [];
    change(() => cb.entries.forEach(e => {
      const copy = M.clone(e.obj);
      copy.id = M.uid(e.type[0]);
      delete copy.locked;
      translate(e.type, copy, dx, dy);
      addObject(e.type, copy);
      if (e.top) added.push({ type: e.type, id: copy.id });
    }));
    setSelection(added);
    toast(t('msg.pasted', { n: cb.entries.length }), 'info', 1800);
  }

  function rotateItem(item, delta) {
    const cx = item.x + item.w / 2, cy = item.y + item.h / 2;
    item.rot = (((item.rot || 0) + delta) % 360 + 360) % 360;
    if (Math.abs(delta) % 180 === 90) {
      const w = item.w;
      item.w = item.h;
      item.h = w;
    }
    item.x = round2(cx - item.w / 2);
    item.y = round2(cy - item.h / 2);
  }

  function rotateSelection() {
    const entries = selEntries();
    if (entries.some(e => e.type === 'room')) {
      rotateRooms(entries);
      return;
    }
    if (entries.some(e => e.type === 'item')) {
      change(() => entries.forEach(e => { if (e.type === 'item') rotateItem(e.obj, 90); }));
    } else if (entries.length === 1 && entries[0].type === 'opening') {
      change(() => { entries[0].obj.hinge = entries[0].obj.hinge ? 0 : 1; });
    }
  }

  /* 部屋を中身（家具・ドア/窓・文字・壁・入れ子の部屋）ごと時計回りに90°回す */
  function rotateRooms(entries) {
    const top = entries.filter(e => !(e.type === 'room' && e.obj.locked));
    const rooms = top.filter(e => e.type === 'room').map(e => e.obj);
    if (!rooms.length) { toast(t('msg.locked'), 'warning', 3200); return; }
    if (top.length < entries.length) toast(t('msg.lockedSkip'), 'warning', 3200);
    const x1 = Math.min(...rooms.map(r => r.x)), y1 = Math.min(...rooms.map(r => r.y));
    const x2 = Math.max(...rooms.map(r => r.x + r.w)), y2 = Math.max(...rooms.map(r => r.y + r.h));
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    // 回したあとも部屋がマス目に乗るように、左上を整数にそろえる
    const dx = Math.round(cx + cy - y2) - (cx + cy - y2);
    const dy = Math.round(cy - cx + x1) - (cy - cx + x1);
    const pt = (x, y) => [cx + cy - y + dx, cy - cx + x + dy];
    const rect = o => {
      const [ax, ay] = pt(o.x, o.y + o.h);
      const w = o.w;
      o.x = round2(ax); o.y = round2(ay); o.w = o.h; o.h = w;
    };
    change(() => movable(top.map(e => ({ type: e.type, id: e.id })), false).forEach(({ type, id }) => {
      const o = getObj(type, id);
      if (type === 'room') {
        rect(o);
        if (o.lx || o.ly) {
          // 名前のずらし量も一緒に回す
          const lx = round2(-(o.ly || 0)), ly = round2(o.lx || 0);
          delete o.lx; delete o.ly;
          if (lx) o.lx = lx;
          if (ly) o.ly = ly;
        }
      } else if (type === 'item') {
        rect(o);
        o.rot = ((o.rot || 0) + 90) % 360;
      } else if (type === 'text') {
        [o.x, o.y] = pt(o.x, o.y).map(round2);
      } else if (type === 'wall') {
        [o.x1, o.y1] = pt(o.x1, o.y1).map(round2);
        [o.x2, o.y2] = pt(o.x2, o.y2).map(round2);
      } else if (type === 'opening') {
        // 開き戸は side を画面の向き（横線は下、縦線は右が +）で、引き戸・折れ戸などは線に沿ったローカル座標（縦線は左が +）で描く
        const swing = SWING_DOORS.has(o.kind);
        const flipSide = () => { o.side = o.side === -1 ? 1 : -1; };
        if (o.o === 'h') {
          // 横 → 縦：始点はそのまま上端に。下側は左側になる
          [o.x, o.y] = pt(o.x, o.y).map(round2);
          o.o = 'v';
          if (swing) flipSide();
        } else {
          // 縦 → 横：下端が始点（左端）になるので吊元は反対側。右側は下側に、左側は上側になる
          [o.x, o.y] = pt(o.x, o.y + o.len).map(round2);
          o.o = 'h';
          o.hinge = o.hinge ? 0 : 1;
          if (!swing) flipSide();
        }
      }
    }));
  }

  // 目のボタン：PLにも見せる ⇔ GM専用
  function toggleGm() {
    const entries = selEntries();
    if (!entries.length) return;
    const gm = !entries.every(e => e.obj.gm);
    change(() => entries.forEach(e => { if (gm) e.obj.gm = true; else delete e.obj.gm; }));
    if (app.playerView) {
      const f = M.visibleFloor(cur(), true);
      app.sel = app.sel.filter(s => f[TYPE_KEY[s.type]].some(o => o.id === s.id));
    }
    renderProps(true);
    requestRender();
  }

  function toggleLock() {
    const rooms = selEntries().filter(e => e.type === 'room');
    if (!rooms.length) return;
    const lock = !rooms.every(e => e.obj.locked);
    change(() => rooms.forEach(e => { if (lock) e.obj.locked = true; else delete e.obj.locked; }));
    renderProps(true);
  }

  function flipSelection() {
    const entries = selEntries();
    if (entries.some(e => e.type === 'item')) change(() => entries.forEach(e => { if (e.type === 'item') e.obj.flip = !e.obj.flip; }));
    else if (entries.length === 1 && entries[0].type === 'opening') change(() => { entries[0].obj.side = entries[0].obj.side === -1 ? 1 : -1; });
  }

  function flipHinge() {
    const entries = selEntries();
    if (entries.length === 1 && entries[0].type === 'opening') change(() => { entries[0].obj.hinge = entries[0].obj.hinge ? 0 : 1; });
  }

  function reorder(toFront) {
    const entries = selEntries().filter(e => e.type === 'room' || e.type === 'item');
    if (!entries.length) return;
    change(() => {
      const f = cur();
      ['room', 'item'].forEach(type => {
        const key = TYPE_KEY[type];
        const ids = new Set(entries.filter(e => e.type === type).map(e => e.id));
        if (!ids.size) return;
        const moving = f[key].filter(o => ids.has(o.id));
        const rest = f[key].filter(o => !ids.has(o.id));
        f[key] = toFront ? rest.concat(moving) : moving.concat(rest);
      });
    });
  }

  // 矢印キーでの移動（続けて押した分は1回の「元に戻す」にまとめる）
  function nudge(dx, dy, big) {
    const entries = movable(app.sel, false);
    if (!entries.length) { if (app.sel.some(s => s.type === 'room')) toast(t('msg.locked'), 'warning', 2400); return; }
    const hasRoom = entries.some(e => e.type === 'room');
    const step = hasRoom ? (big ? 4 : 1) : (big ? 1 : 0.25);
    if (!ui.nudgeBefore) ui.nudgeBefore = snapshot();
    entries.forEach(({ type, id }) => translate(type, getObj(type, id), dx * step, dy * step));
    touched();
    clearTimeout(ui.nudgeTimer);
    ui.nudgeTimer = setTimeout(flushNudge, 700);
  }

  function flushNudge() {
    clearTimeout(ui.nudgeTimer);
    if (ui.nudgeBefore && ui.nudgeBefore !== snapshot()) pushUndo(ui.nudgeBefore);
    ui.nudgeBefore = null;
  }

  /* ================= ポインター操作 ================= */

  function startDrag(drag) {
    ui.drag = { moved: false, before: snapshot(), ...drag };
    updateCursor();
  }

  function endDrag() {
    const d = ui.drag;
    ui.drag = null;
    if (d && d.before && snapshot() !== d.before) {
      pushUndo(d.before);
      touched();
    }
    updateCursor();
    requestRender();
    refreshProps();
  }

  function onPointerDown(event) {
    els.canvas.focus({ preventScroll: true });
    const { sx, sy } = eventPos(event);
    ui.pointers.set(event.pointerId, { sx, sy });
    try { els.canvas.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
    if (ui.pointers.size === 2) {
      if (ui.drag && ui.drag.before && snapshot() !== ui.drag.before) {
        app.project = JSON.parse(ui.drag.before);
        touched();
      }
      const [p1, p2] = [...ui.pointers.values()];
      ui.drag = {
        mode: 'pinch', dist: Math.hypot(p1.sx - p2.sx, p1.sy - p2.sy) || 1, zoom: view.zoom,
        mid: { sx: (p1.sx + p2.sx) / 2, sy: (p1.sy + p2.sy) / 2 }, ox: view.ox, oy: view.oy
      };
      return;
    }
    if (ui.pointers.size > 2) return;
    const w = toWorld(sx, sy);
    const panButton = event.button === 1 || event.button === 2;
    if (panButton || ui.spaceDown || app.tool === 'hand') {
      event.preventDefault();
      ui.drag = { mode: 'pan', sx, sy, ox: view.ox, oy: view.oy, button: event.button, moved: false };
      updateCursor();
      return;
    }
    if (event.button !== 0) return;
    const tool = app.tool;
    if (tool === 'select') {
      const hd = handleAt(sx, sy);
      if (hd) {
        const [{ type, id, obj }] = selEntries();
        if (hd.id === 'label') startDrag({ mode: 'label', id, start: w, lx: obj.lx || 0, ly: obj.ly || 0, cursor: 'move' });
        else startDrag({ mode: 'resize', type, id, handle: hd.id, orig: M.clone(obj), cursor: hd.cursor });
        return;
      }
      const hit = hitTest(w.x, w.y);
      if (hit) {
        if (event.shiftKey) {
          setSelection(isSelected(hit.type, hit.id) ? app.sel.filter(s => !(s.type === hit.type && s.id === hit.id)) : app.sel.concat([hit]));
          return;
        }
        if (!isSelected(hit.type, hit.id)) setSelection([hit]);
        if (hit.type === 'room' && getObj('room', hit.id).locked) {
          // ロック中の部屋：選ぶだけ。ドラッグすると範囲選択になる
          startDrag({ mode: 'marquee', start: w, add: false, base: app.sel.slice(), before: null });
          return;
        }
        const entries = movable(app.sel, event.altKey).map(s => ({ ...s, orig: M.clone(getObj(s.type, s.id)) }));
        startDrag({ mode: 'move', start: w, sx, sy, entries, alt: event.altKey, step: entries.some(e => e.type === 'room') ? 1 : 0.25 });
        return;
      }
      if (!event.shiftKey && app.sel.length) setSelection([]);
      startDrag({ mode: 'marquee', start: w, add: event.shiftKey, base: app.sel.slice(), before: null });
      return;
    }
    if (tool === 'room') {
      const a = { x: Math.round(w.x), y: Math.round(w.y) };
      startDrag({ mode: 'room', a, sx, sy, rect: null, before: null });
      return;
    }
    if (tool === 'wall') {
      startDrag({ mode: 'wall', a: snapWallPoint(w), b: null, before: null });
      return;
    }
    if (tool === 'door' || tool === 'window') {
      const hit = hitTest(w.x, w.y, { skipRooms: true });
      const g = snapOpening(w.x, w.y, app.armed.type);
      if (hit && hit.type === 'opening' && (!g || g.clash)) {
        setTool('select');
        setSelection([hit]);
        return;
      }
      if (!g || g.clash) return;
      const o = { id: M.uid('o'), kind: g.kind, o: g.o, x: g.x, y: g.y, len: g.len, side: g.side, hinge: app.armed.hinge || 0 };
      change(() => addObject('opening', o));
      setSelection([{ type: 'opening', id: o.id }]);
      pointerHover(sx, sy, event);
      return;
    }
    if (tool === 'place') {
      const g = itemGhost(w.x, w.y, app.armed, event.altKey);
      const item = { id: M.uid('i'), t: g.t, x: round2(g.x), y: round2(g.y), w: g.w, h: g.h, rot: g.rot };
      change(() => addObject('item', item));
      if (event.shiftKey) {
        setSelection([{ type: 'item', id: item.id }]);
        pointerHover(sx, sy, event);
      } else {
        setTool('select');
        setSelection([{ type: 'item', id: item.id }]);
      }
      return;
    }
    if (tool === 'text') {
      const obj = { id: M.uid('t'), x: M.snap(w.x, 0.25), y: M.snap(w.y, 0.25), text: t('newText'), size: 0.7 };
      change(() => addObject('text', obj));
      setTool('select');
      setSelection([{ type: 'text', id: obj.id }]);
      focusField('text');
      return;
    }
    if (tool === 'eraser') {
      startDrag({ mode: 'erase' });
      eraseAt(w, true);
    }
  }

  function eraseAt(w, allowRooms) {
    const hit = hitTest(w.x, w.y, { skipRooms: !allowRooms });
    if (!hit) return;
    if (hit.type === 'room' && getObj('room', hit.id).locked) { toast(t('msg.lockedSkip'), 'warning', 2400); return; }
    const key = TYPE_KEY[hit.type];
    cur()[key] = cur()[key].filter(o => o.id !== hit.id);
    app.sel = app.sel.filter(s => s.id !== hit.id);
    ui.hover = null;
    app.rev++;
    ui.linesCache = null;
    renderProps();
    requestRender();
  }

  function snapWallPoint(w) {
    let p = { x: M.snap(w.x, 0.5), y: M.snap(w.y, 0.5) };
    const reach = Math.max(0.35, 8 / view.zoom);
    cur().walls.forEach(wall => {
      [[wall.x1, wall.y1], [wall.x2, wall.y2]].forEach(([x, y]) => {
        if (Math.hypot(w.x - x, w.y - y) < reach) p = { x, y };
      });
    });
    return p;
  }

  function onPointerMove(event) {
    const { sx, sy } = eventPos(event);
    if (ui.pointers.has(event.pointerId)) ui.pointers.set(event.pointerId, { sx, sy });
    ui.pointer = { sx, sy };
    const d = ui.drag;
    if (d && d.mode === 'pinch') {
      if (ui.pointers.size < 2) return;
      const [p1, p2] = [...ui.pointers.values()];
      const dist = Math.hypot(p1.sx - p2.sx, p1.sy - p2.sy) || 1;
      const mid = { sx: (p1.sx + p2.sx) / 2, sy: (p1.sy + p2.sy) / 2 };
      const zoom = clamp(d.zoom * (dist / d.dist), ZOOM_MIN, ZOOM_MAX);
      const wx = (d.mid.sx - d.ox) / d.zoom, wy = (d.mid.sy - d.oy) / d.zoom;
      view.zoom = zoom;
      view.ox = mid.sx - wx * zoom;
      view.oy = mid.sy - wy * zoom;
      syncZoom();
      requestRender();
      return;
    }
    if (!d) {
      pointerHover(sx, sy, event);
      return;
    }
    const w = toWorld(sx, sy);
    if (d.mode === 'pan') {
      if (Math.hypot(sx - d.sx, sy - d.sy) > 3) d.moved = true;
      view.ox = d.ox + (sx - d.sx);
      view.oy = d.oy + (sy - d.sy);
      requestRender();
      return;
    }
    if (d.mode === 'move') {
      if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) < 4) return;
      d.moved = true;
      dragMove(d, w, event);
    } else if (d.mode === 'resize') {
      d.moved = true;
      dragResize(d, w, event);
    } else if (d.mode === 'label') {
      d.moved = true;
      const room = getObj('room', d.id);
      if (room) {
        room.lx = round2(M.snap(d.lx + w.x - d.start.x, 0.25));
        room.ly = round2(M.snap(d.ly + w.y - d.start.y, 0.25));
      }
    } else if (d.mode === 'marquee') {
      d.moved = true;
      const x1 = Math.min(d.start.x, w.x), y1 = Math.min(d.start.y, w.y);
      d.rect = { x: x1, y: y1, w: Math.abs(w.x - d.start.x), h: Math.abs(w.y - d.start.y) };
      const f = M.visibleFloor(cur(), app.playerView);
      const found = [];
      Object.entries(TYPE_KEY).forEach(([type, key]) => f[key].forEach(o => {
        const b = objBounds(type, o);
        if (M.rectContains(d.rect, b)) found.push({ type, id: o.id });
      }));
      const merged = d.add ? d.base.concat(found.filter(s => !d.base.some(b => b.type === s.type && b.id === s.id))) : found;
      app.sel = merged;
      renderProps();
    } else if (d.mode === 'room') {
      if (!d.moved && Math.hypot(sx - d.sx, sy - d.sy) < 4) return;
      d.moved = true;
      const b = { x: Math.round(w.x), y: Math.round(w.y) };
      const x1 = Math.min(d.a.x, b.x), y1 = Math.min(d.a.y, b.y);
      d.rect = { x: x1, y: y1, w: Math.max(1, Math.abs(b.x - d.a.x)), h: Math.max(1, Math.abs(b.y - d.a.y)) };
    } else if (d.mode === 'wall') {
      d.moved = true;
      let b = snapWallPoint(w);
      if (!event.shiftKey) b = Math.abs(b.x - d.a.x) >= Math.abs(b.y - d.a.y) ? { x: b.x, y: d.a.y } : { x: d.a.x, y: b.y };
      d.b = b;
    } else if (d.mode === 'erase') {
      d.moved = true;
      eraseAt(w, false);
    }
    requestRender();
  }

  function dragMove(d, w, event) {
    let dx = M.snap(w.x - d.start.x, d.step);
    let dy = M.snap(w.y - d.start.y, d.step);
    // ドア・窓を1つだけ動かすときは、近くの壁に付け直す
    if (d.entries.length === 1 && d.entries[0].type === 'opening') {
      const e = d.entries[0];
      const o = getObj('opening', e.id);
      const mid = e.orig.o === 'h' ? { x: e.orig.x + e.orig.len / 2, y: e.orig.y } : { x: e.orig.x, y: e.orig.y + e.orig.len / 2 };
      const g = snapOpening(mid.x + (w.x - d.start.x), mid.y + (w.y - d.start.y), o.kind, e.orig.len, o.id);
      if (g && !g.clash) {
        o.o = g.o; o.x = g.x; o.y = g.y; o.len = g.len;
      }
      touchedLight();
      return;
    }
    // 家具を1つだけ動かすときは、壁に吸着
    if (d.entries.length === 1 && d.entries[0].type === 'item' && !event.altKey) {
      const e = d.entries[0];
      const o = getObj('item', e.id);
      const r = magnet({ x: e.orig.x + dx, y: e.orig.y + dy, w: o.w, h: o.h });
      o.x = round2(r.x); o.y = round2(r.y);
      touchedLight();
      return;
    }
    d.entries.forEach(e => {
      const o = getObj(e.type, e.id);
      if (!o) return;
      if (e.type === 'wall') {
        o.x1 = e.orig.x1 + dx; o.x2 = e.orig.x2 + dx; o.y1 = e.orig.y1 + dy; o.y2 = e.orig.y2 + dy;
      } else {
        o.x = round2(e.orig.x + dx);
        o.y = round2(e.orig.y + dy);
      }
    });
    touchedLight();
  }

  // ドラッグ中の軽い更新（保存と履歴はドラッグの最後にまとめて）
  function touchedLight() {
    app.rev++;
    ui.linesCache = null;
    refreshProps();
  }

  function dragResize(d, w, event) {
    const o = getObj(d.type, d.id);
    if (!o) return;
    const hd = d.handle;
    if (d.type === 'room' || d.type === 'item') {
      const step = d.type === 'room' ? 1 : (event.altKey ? 0.05 : 0.25);
      const min = d.type === 'room' ? 1 : 0.25;
      const s = v => M.snap(v, step);
      let x1 = d.orig.x, y1 = d.orig.y, x2 = d.orig.x + d.orig.w, y2 = d.orig.y + d.orig.h;
      if (hd.includes('w')) x1 = Math.min(s(w.x), x2 - min);
      if (hd.includes('e')) x2 = Math.max(s(w.x), x1 + min);
      if (hd.includes('n')) y1 = Math.min(s(w.y), y2 - min);
      if (hd.includes('s')) y2 = Math.max(s(w.y), y1 + min);
      o.x = round2(x1); o.y = round2(y1); o.w = round2(x2 - x1); o.h = round2(y2 - y1);
    } else if (d.type === 'opening') {
      const along = M.snap(o.o === 'h' ? w.x : w.y, 0.25);
      const a = startOf(d.orig), b = a + d.orig.len;
      let na = a, nb = b;
      if (hd === 'a') na = Math.min(along, b - 0.5);
      else nb = Math.max(along, a + 0.5);
      if (o.o === 'h') o.x = na; else o.y = na;
      o.len = round2(nb - na);
    } else if (d.type === 'wall') {
      let p = snapWallPoint(w);
      const other = hd === 'a' ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 };
      if (!event.shiftKey) p = Math.abs(p.x - other.x) >= Math.abs(p.y - other.y) ? { x: p.x, y: other.y } : { x: other.x, y: p.y };
      if (hd === 'a') { o.x1 = p.x; o.y1 = p.y; } else { o.x2 = p.x; o.y2 = p.y; }
    }
    touchedLight();
  }

  function onPointerUp(event) {
    const { sx, sy } = eventPos(event);
    ui.pointers.delete(event.pointerId);
    try { els.canvas.releasePointerCapture(event.pointerId); } catch (error) { /* noop */ }
    const d = ui.drag;
    if (!d) return;
    if (d.mode === 'pinch') {
      if (ui.pointers.size === 0) ui.drag = null;
      return;
    }
    const w = toWorld(sx, sy);
    if (d.mode === 'pan') {
      ui.drag = null;
      // 右クリック（動かさなかったとき）は道具の解除
      if (d.button === 2 && !d.moved && app.tool !== 'select') setTool('select');
      updateCursor();
      return;
    }
    if (d.mode === 'room') {
      ui.drag = null;
      let rect = d.rect;
      const preset = app.armed && app.armed.kind === 'room' ? app.armed.preset : null;
      if (!rect && preset) {
        const p = ROOM_PRESETS[preset];
        rect = { x: Math.round(w.x - p.w / 2), y: Math.round(w.y - p.h / 2), w: p.w, h: p.h };
      }
      if (rect) {
        const room = newRoom(rect, preset);
        change(() => addObject('room', room));
        setSelection([{ type: 'room', id: room.id }]);
      } else {
        const hit = hitTest(w.x, w.y);
        setSelection(hit ? [hit] : []);
      }
      updateCursor();
      requestRender();
      return;
    }
    if (d.mode === 'wall') {
      ui.drag = null;
      if (d.b && Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) >= 0.5) {
        const wall = { id: M.uid('w'), x1: d.a.x, y1: d.a.y, x2: d.b.x, y2: d.b.y, kind: (app.armed && app.armed.type) || 'int' };
        change(() => addObject('wall', wall));
        setSelection([{ type: 'wall', id: wall.id }]);
      }
      updateCursor();
      requestRender();
      return;
    }
    if (d.mode === 'marquee') {
      ui.drag = null;
      renderProps();
      requestRender();
      return;
    }
    if (d.mode === 'move' && !d.moved) {
      ui.drag = null;
      if (app.sel.length > 1 && !event.shiftKey) {
        const hit = hitTest(w.x, w.y);
        if (hit) setSelection([hit]);
      }
      updateCursor();
      requestRender();
      return;
    }
    endDrag();
  }

  function pointerHover(sx, sy, event) {
    const w = toWorld(sx, sy);
    const tool = app.tool;
    let handle = null;
    if (tool === 'select') {
      handle = handleAt(sx, sy);
      const hit = handle ? null : hitTest(w.x, w.y);
      const changed = JSON.stringify(hit) !== JSON.stringify(ui.hover);
      ui.hover = hit;
      if (changed) requestRender();
    } else if (tool === 'eraser') {
      const hit = hitTest(w.x, w.y);
      if (JSON.stringify(hit) !== JSON.stringify(ui.hover)) { ui.hover = hit; requestRender(); }
    } else if (tool === 'door' || tool === 'window') {
      const g = app.armed ? snapOpening(w.x, w.y, app.armed.type) : null;
      ui.ghostOpening = g;
      updateHint(false, !g);
      requestRender();
    } else if (tool === 'place') {
      ui.ghostItem = app.armed ? itemGhost(w.x, w.y, app.armed, event && event.altKey) : null;
      requestRender();
    }
    updateCursor(handle);
  }

  function onPointerLeave() {
    ui.pointer = null;
    if (ui.drag) return;
    ui.hover = null;
    ui.ghostItem = null;
    ui.ghostOpening = null;
    requestRender();
  }

  function onWheel(event) {
    event.preventDefault();
    const { sx, sy } = eventPos(event);
    const trackpadPan = !event.ctrlKey && !event.metaKey && event.deltaMode === 0 && (event.deltaX !== 0 || Math.abs(event.deltaY) < 40);
    if (trackpadPan) {
      view.ox -= event.deltaX;
      view.oy -= event.deltaY;
      requestRender();
      return;
    }
    const scale = event.deltaMode === 1 ? 0.05 : event.ctrlKey ? 0.012 : 0.0018;
    zoomAt(sx, sy, Math.exp(-event.deltaY * scale));
  }

  function onDoubleClick(event) {
    if (app.tool !== 'select') return;
    const { sx, sy } = eventPos(event);
    const w = toWorld(sx, sy);
    const hit = hitTest(w.x, w.y);
    if (!hit) return;
    setSelection([hit]);
    focusField(hit.type === 'text' ? 'text' : hit.type === 'item' ? 'label' : 'name');
  }

  // キャンバスへの家具・部屋のドラッグ＆ドロップ、JSONファイルのドロップ
  function onDragOver(event) {
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes('text/imm-asset') && !types.includes('text/imm-room') && !types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    els.wrap.classList.add('is-dropping');
    const { sx, sy } = eventPos(event);
    const w = toWorld(sx, sy);
    if (ui.dragAsset) {
      ui.ghostItem = itemGhost(w.x, w.y, { t: ui.dragAsset, rot: 0 }, event.altKey);
      requestRender();
    }
  }

  function onDrop(event) {
    event.preventDefault();
    els.wrap.classList.remove('is-dropping');
    const { sx, sy } = eventPos(event);
    const w = toWorld(sx, sy);
    const asset = event.dataTransfer.getData('text/imm-asset');
    const preset = event.dataTransfer.getData('text/imm-room');
    ui.ghostItem = null;
    if (asset && M.ASSET[asset]) {
      const g = itemGhost(w.x, w.y, { t: asset, rot: 0 }, event.altKey);
      const item = { id: M.uid('i'), t: g.t, x: round2(g.x), y: round2(g.y), w: g.w, h: g.h, rot: g.rot };
      change(() => addObject('item', item));
      setTool('select');
      setSelection([{ type: 'item', id: item.id }]);
    } else if (preset && ROOM_PRESETS[preset]) {
      const p = ROOM_PRESETS[preset];
      const room = newRoom({ x: Math.round(w.x - p.w / 2), y: Math.round(w.y - p.h / 2), w: p.w, h: p.h }, preset);
      change(() => addObject('room', room));
      setTool('select');
      setSelection([{ type: 'room', id: room.id }]);
    } else if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      readFile(event.dataTransfer.files[0]);
    }
    requestRender();
  }

  /* ================= キーボード ================= */

  const TOOL_KEYS = { KeyV: 'select', KeyH: 'hand', KeyB: 'room', KeyW: 'wall', KeyD: 'door', KeyN: 'window', KeyT: 'text', KeyE: 'eraser' };

  function modalOpen() {
    return !els.tplModal.hidden || !els.expModal.hidden;
  }

  function onKeyDown(event) {
    const mod = event.metaKey || event.ctrlKey;
    // 観測所共通: Cmd/Ctrl/Alt + Shift + T でテーマ切り替え
    if (event.shiftKey && (mod || event.altKey) && event.code === 'KeyT') {
      event.preventDefault();
      toggleTheme();
      return;
    }
    if (event.key === 'Escape') {
      if (modalOpen()) { closeModals(); event.preventDefault(); return; }
      if (isTyping(document.activeElement)) { document.activeElement.blur(); return; }
      if (closeDrawers()) { event.preventDefault(); return; }
      if (ui.drag) { cancelDrag(); return; }
      if (app.tool !== 'select') setTool('select');
      else if (app.sel.length) setSelection([]);
      return;
    }
    if (modalOpen() || isTyping(event.target)) return;
    if (mod) {
      const k = event.code;
      if (k === 'KeyZ') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (k === 'KeyY') { event.preventDefault(); redo(); return; }
      if (k === 'KeyS') { event.preventDefault(); saveFile(); return; }
      if (k === 'KeyO') { event.preventDefault(); els.openFile.click(); return; }
      if (k === 'KeyE') { event.preventDefault(); openExport(); return; }
      if (k === 'KeyA') { event.preventDefault(); selectAll(); return; }
      if (k === 'KeyD') { event.preventDefault(); duplicateSelection(); return; }
      if (k === 'KeyC') { if (app.sel.length) { event.preventDefault(); copySelection(false); } return; }
      if (k === 'KeyX') { if (app.sel.length) { event.preventDefault(); copySelection(true); } return; }
      if (k === 'KeyV') { if (app.clipboard) { event.preventDefault(); paste(); } return; }
      return;
    }
    if (event.altKey) return;
    if (event.code === 'Space') {
      // ボタンなどにフォーカスがあるときは、スペースキー本来の動き（押す）を残す
      if (event.target !== document.body && event.target !== els.canvas) return;
      event.preventDefault();
      if (!ui.spaceDown) { ui.spaceDown = true; updateCursor(); }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (app.sel.length) { event.preventDefault(); deleteSelection(); }
      return;
    }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[event.key]) {
      if (!app.sel.length) return;
      event.preventDefault();
      nudge(arrows[event.key][0], arrows[event.key][1], event.shiftKey);
      return;
    }
    if (event.code === 'KeyR') {
      if (app.tool === 'place' && app.armed) {
        app.armed.rot = ((app.armed.rot || 0) + 90) % 360;
        app.armed.manual = true;
        if (ui.pointer) pointerHover(ui.pointer.sx, ui.pointer.sy, event);
      } else if ((app.tool === 'door' || app.tool === 'window') && app.armed) {
        app.armed.hinge = app.armed.hinge ? 0 : 1;
        requestRender();
      } else rotateSelection();
      return;
    }
    if (event.code === 'KeyF') { flipSelection(); return; }
    if (event.code === 'KeyL') { toggleLock(); return; }
    if (event.code === 'KeyG') { app.grid = !app.grid; savePrefs(); renderProps(true); requestRender(); return; }
    if (event.code === 'KeyP') { setPlayerView(!app.playerView); return; }
    if (event.key === '0') { fitView(); return; }
    if (event.key === '+' || event.key === '=' || event.key === ';') { zoomAt(view.w / 2, view.h / 2, 1.25); return; }
    if (event.key === '-') { zoomAt(view.w / 2, view.h / 2, 0.8); return; }
    if (event.key === '[') { switchFloor(app.project.active - 1); return; }
    if (event.key === ']') { switchFloor(app.project.active + 1); return; }
    if (TOOL_KEYS[event.code]) {
      event.preventDefault();
      setTool(TOOL_KEYS[event.code]);
    }
  }

  function onKeyUp(event) {
    if (event.code === 'Space') {
      ui.spaceDown = false;
      updateCursor();
    }
  }

  function cancelDrag() {
    const d = ui.drag;
    ui.drag = null;
    if (d && d.before && snapshot() !== d.before) {
      app.project = JSON.parse(d.before);
      touched();
    }
    updateCursor();
    requestRender();
  }

  /* ================= GM / PL 表示 ================= */

  function setPlayerView(on) {
    app.playerView = on;
    els.viewToggle.querySelectorAll('[data-view]').forEach(btn => {
      const active = (btn.dataset.view === 'pl') === on;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (on) {
      const f = M.visibleFloor(cur(), true);
      app.sel = app.sel.filter(s => f[TYPE_KEY[s.type]].some(o => o.id === s.id));
      renderProps();
    }
    requestRender();
  }

  /* ================= 階 ================= */

  function switchFloor(index) {
    if (index < 0 || index >= app.project.floors.length || index === app.project.active) return;
    flushNudge();
    app.project.active = index;
    app.sel = [];
    ui.linesCache = null;
    scheduleSave();
    renderFloorBar();
    renderProps(true);
    requestRender();
  }

  function nextFloorName() {
    const nums = app.project.floors.map(f => { const m = /^(\d+)\s*F$/i.exec(f.name || ''); return m ? Number(m[1]) : 0; });
    return t('floors.newName', { n: Math.max(0, ...nums) + 1 });
  }

  function addFloor() {
    change(() => {
      app.project.floors.push(M.emptyFloor(nextFloorName()));
      app.project.active = app.project.floors.length - 1;
    });
    app.sel = [];
    renderFloorBar();
    renderProps(true);
  }

  function duplicateFloor() {
    const src = cur();
    change(() => {
      const copy = M.clone(src);
      copy.id = M.uid('f');
      copy.name = nextFloorName();
      Object.keys(TYPE_KEY).forEach(type => copy[TYPE_KEY[type]].forEach(o => { o.id = M.uid(type[0]); }));
      app.project.floors.splice(app.project.active + 1, 0, copy);
      app.project.active += 1;
    });
    app.sel = [];
    renderFloorBar();
    renderProps(true);
  }

  function removeFloor() {
    if (app.project.floors.length <= 1) return;
    const name = cur().name || '';
    if (!window.confirm(t('floors.confirmRemove', { name }))) return;
    change(() => {
      app.project.floors.splice(app.project.active, 1);
      app.project.active = clamp(app.project.active - 1, 0, app.project.floors.length - 1);
    });
    app.sel = [];
    renderFloorBar();
    renderProps(true);
  }

  function moveFloor(delta) {
    const i = app.project.active, j = i + delta;
    if (j < 0 || j >= app.project.floors.length) return;
    change(() => {
      const floors = app.project.floors;
      [floors[i], floors[j]] = [floors[j], floors[i]];
      app.project.active = j;
    });
    renderFloorBar();
  }

  const ICON = {
    rename: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>',
    duplicate: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" /></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>',
    remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7l1 13h9l1-13" /></svg>',
    plus: '<svg class="bar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>'
  };

  function iconButton(cls, icon, label, onclick, disabled) {
    const btn = h('button', { type: 'button', class: cls, title: label, 'aria-label': label, onclick, disabled });
    btn.innerHTML = icon;
    return btn;
  }

  function renderFloorBar() {
    const bar = els.floorBar;
    bar.innerHTML = '';
    const tabs = h('div', { class: 'floor-tabs', role: 'tablist' });
    app.project.floors.forEach((f, index) => {
      if (ui.renaming === index) {
        const input = h('input', { class: 'text-input floor-rename', type: 'text', value: f.name, 'aria-label': t('floors.renamePrompt') });
        const done = commit => {
          if (ui.renaming !== index) return;
          ui.renaming = -1;
          const value = input.value.trim();
          if (commit && value && value !== f.name) change(() => { app.project.floors[index].name = value; });
          renderFloorBar();
        };
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); done(true); }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        });
        input.addEventListener('blur', () => done(true));
        tabs.appendChild(input);
        requestAnimationFrame(() => { input.focus(); input.select(); });
        return;
      }
      const on = index === app.project.active;
      tabs.appendChild(h('button', {
        type: 'button', class: `floor-tab${on ? ' is-active' : ''}`, role: 'tab', 'aria-selected': String(on),
        onclick: () => switchFloor(index),
        ondblclick: () => { ui.renaming = index; renderFloorBar(); }
      }, f.name || '—'));
    });
    bar.appendChild(tabs);
    const add = h('button', { type: 'button', class: 'floor-add', onclick: addFloor });
    add.innerHTML = `${ICON.plus}<span></span>`;
    add.querySelector('span').textContent = t('floors.add');
    bar.appendChild(add);
    const i = app.project.active, n = app.project.floors.length;
    bar.appendChild(h('div', { class: 'floor-actions' },
      iconButton('floor-action', ICON.rename, t('floors.rename'), () => { ui.renaming = app.project.active; renderFloorBar(); }),
      iconButton('floor-action', ICON.duplicate, t('floors.duplicate'), duplicateFloor),
      iconButton('floor-action', ICON.left, t('floors.down'), () => moveFloor(-1), i === 0),
      iconButton('floor-action', ICON.right, t('floors.up'), () => moveFloor(1), i === n - 1),
      iconButton('floor-action is-danger', ICON.remove, t('floors.remove'), removeFloor, n <= 1)
    ));
  }

  /* ================= 素材パネル ================= */

  function setLibTab(tab) {
    app.libTab = tab;
    savePrefs();
    renderLibrary();
  }

  function renderLibrary() {
    els.libTabs.querySelectorAll('[data-lib]').forEach(btn => {
      const on = btn.dataset.lib === app.libTab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    const body = els.libBody;
    body.innerHTML = '';
    if (app.libTab === 'rooms') renderRoomLibrary(body);
    else if (app.libTab === 'openings') renderOpeningLibrary(body);
    else renderFurnitureLibrary(body);
    syncLibraryActive();
  }

  function renderRoomLibrary(body) {
    body.appendChild(h('p', { class: 'lib-note' }, t('lib.roomsNote')));
    ROOM_GROUPS.forEach(group => {
      body.appendChild(h('p', { class: 'lib-section' }, pick(group.name)));
      const grid = h('div', { class: 'room-list' });
      group.items.forEach(([id, cat, w, hh]) => {
        const card = h('button', {
          type: 'button', class: 'room-card', draggable: 'true', dataset: { room: id },
          title: `${t(`roomPresets.${id}`)} ${meters(w, hh)}`,
          onclick: () => {
            if (app.tool === 'room' && app.armed && app.armed.preset === id) setTool('select');
            else setTool('room', { kind: 'room', preset: id });
          },
          ondragstart: e => {
            e.dataTransfer.setData('text/imm-room', id);
            e.dataTransfer.effectAllowed = 'copy';
          }
        }, h('span', { class: 'room-text' }, h('span', { class: 'room-name' }, t(`roomPresets.${id}`)), h('span', { class: 'room-size' }, meters(w, hh))));
        card.style.setProperty('--room-color', M.THEMES.clean.fills[cat] || '#ffffff');
        grid.appendChild(card);
      });
      body.appendChild(grid);
    });
  }

  function openingCard(kind) {
    const info = M.OPEN[kind];
    const canvas = h('canvas', { class: 'lib-icon', width: 46, height: 46 });
    const card = h('button', {
      type: 'button', class: 'lib-card', dataset: { opening: kind }, title: pick(info.name),
      onclick: () => {
        if (app.armed && app.armed.kind === 'opening' && app.armed.type === kind && (app.tool === 'door' || app.tool === 'window')) setTool('select');
        else setTool(info.group === 'window' ? 'window' : 'door', { kind: 'opening', type: kind, hinge: 0 });
      }
    }, canvas, h('span', { class: 'lib-name' }, pick(info.name)));
    requestAnimationFrame(() => M.drawOpeningIcon(canvas, kind, 'clean'));
    return card;
  }

  function drawWallIcon(canvas, kind) {
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 46;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const th = M.THEMES.clean;
    const y = 23, x1 = 7, x2 = 39;
    const tpx = M.WALL[kind].t * 22;
    c.lineCap = 'butt';
    if (kind === 'rail' || kind === 'glass') {
      c.strokeStyle = kind === 'glass' ? '#6fa9d8' : th.rail;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x1, y - 2.2); c.lineTo(x2, y - 2.2);
      c.moveTo(x1, y + 2.2); c.lineTo(x2, y + 2.2);
      c.stroke();
      if (kind === 'glass') { c.fillStyle = 'rgba(156, 203, 238, 0.6)'; c.fillRect(x1, y - 2.2, x2 - x1, 4.4); }
    } else if (kind === 'bars') {
      c.strokeStyle = th.wall;
      c.fillStyle = th.wall;
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
      for (let x = x1; x <= x2 + 0.1; x += 4) { c.beginPath(); c.arc(x, y, 1.7, 0, Math.PI * 2); c.fill(); }
    } else if (kind === 'fence') {
      c.strokeStyle = th.rail;
      c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
      c.fillStyle = th.wall;
      for (let x = x1; x <= x2; x += 8) c.fillRect(x - 1.5, y - 1.5, 3, 3);
    } else if (kind === 'broken') {
      c.fillStyle = th.wall;
      c.beginPath();
      c.moveTo(x1, y - 3.4); c.lineTo(20, y - 3.4); c.lineTo(22, y - 1); c.lineTo(19.5, y + 3.4); c.lineTo(x1, y + 3.4); c.closePath();
      c.moveTo(28, y - 3.4); c.lineTo(x2, y - 3.4); c.lineTo(x2, y + 3.4); c.lineTo(26.5, y + 3.4); c.lineTo(28.5, y); c.closePath();
      c.fill();
      c.fillStyle = '#9aa1ab';
      [[23.5, y + 5], [25.5, y - 5.5], [21, y + 7]].forEach(([x, yy]) => c.fillRect(x, yy, 1.8, 1.8));
    } else {
      c.fillStyle = th.wall;
      c.fillRect(x1, y - tpx / 2, x2 - x1, tpx);
    }
  }

  function wallCard(kind) {
    const canvas = h('canvas', { class: 'lib-icon', width: 46, height: 46 });
    const card = h('button', {
      type: 'button', class: 'lib-card', dataset: { wall: kind }, title: pick(M.WALL[kind].name),
      onclick: () => {
        if (app.tool === 'wall' && app.armed && app.armed.type === kind) setTool('select');
        else setTool('wall', { kind: 'wall', type: kind });
      }
    }, canvas, h('span', { class: 'lib-name' }, pick(M.WALL[kind].name)));
    drawWallIcon(canvas, kind);
    return card;
  }

  function renderOpeningLibrary(body) {
    body.appendChild(h('p', { class: 'lib-section' }, t('lib.doors')));
    body.appendChild(h('div', { class: 'lib-grid' }, M.OPENINGS.filter(o => o.group === 'door').map(o => openingCard(o.id))));
    body.appendChild(h('p', { class: 'lib-section' }, t('lib.windows')));
    body.appendChild(h('div', { class: 'lib-grid' }, M.OPENINGS.filter(o => o.group === 'window').map(o => openingCard(o.id))));
    body.appendChild(h('p', { class: 'lib-section' }, t('lib.walls')));
    body.appendChild(h('p', { class: 'lib-note' }, t('lib.wallsNote')));
    body.appendChild(h('div', { class: 'lib-grid' }, M.WALL_KINDS.map(w => wallCard(w.id))));
  }

  function assetMatches(asset, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return asset.id.includes(q) || ['ja', 'en', 'ko'].some(l => String(asset.name[l] || '').toLowerCase().includes(q));
  }

  function renderFurnitureLibrary(body) {
    const search = h('input', { class: 'text-input', type: 'search', value: app.libQuery, placeholder: t('lib.search'), 'aria-label': t('lib.search') });
    const groups = h('div', { class: 'lib-groups', role: 'group' });
    const results = h('div');
    const chip = (id, label) => h('button', {
      type: 'button', class: `chip${app.libGroup === id ? ' is-active' : ''}`,
      onclick: e => { app.libGroup = id; groups.querySelectorAll('.chip').forEach(b => b.classList.toggle('is-active', b === e.currentTarget)); fill(); }
    }, label);
    groups.appendChild(chip('all', t('lib.all')));
    M.ASSET_GROUPS.forEach(g => groups.appendChild(chip(g.id, pick(g.name))));
    const fill = () => {
      results.innerHTML = '';
      const q = app.libQuery.trim();
      let any = false;
      M.ASSET_GROUPS.forEach(g => {
        if (!q && app.libGroup !== 'all' && app.libGroup !== g.id) return;
        const assets = M.ASSETS.filter(a => a.group === g.id && assetMatches(a, q));
        if (!assets.length) return;
        any = true;
        results.appendChild(h('p', { class: 'lib-section' }, pick(g.name)));
        const grid = h('div', { class: 'lib-grid' });
        assets.forEach(a => grid.appendChild(assetCard(a)));
        results.appendChild(grid);
      });
      if (!any) results.appendChild(h('p', { class: 'lib-note' }, t('lib.noResult')));
      syncLibraryActive();
    };
    search.addEventListener('input', () => { app.libQuery = search.value; fill(); });
    body.appendChild(h('div', { class: 'lib-search' }, search, groups));
    body.appendChild(results);
    fill();
  }

  function assetCard(asset) {
    const canvas = h('canvas', { class: 'lib-icon', width: 46, height: 46 });
    const card = h('button', {
      type: 'button', class: 'lib-card', draggable: 'true', dataset: { asset: asset.id }, title: pick(asset.name),
      onclick: () => {
        if (app.tool === 'place' && app.armed && app.armed.t === asset.id) setTool('select');
        else setTool('place', { kind: 'item', t: asset.id, rot: 0, manual: false });
      },
      ondragstart: e => {
        e.dataTransfer.setData('text/imm-asset', asset.id);
        e.dataTransfer.effectAllowed = 'copy';
        ui.dragAsset = asset.id;
      },
      ondragend: () => { ui.dragAsset = null; ui.ghostItem = null; els.wrap.classList.remove('is-dropping'); requestRender(); }
    }, canvas, h('span', { class: 'lib-name' }, pick(asset.name)));
    requestAnimationFrame(() => M.drawAssetIcon(canvas, asset, 'clean'));
    return card;
  }

  function syncLibraryActive() {
    const a = app.armed;
    els.libBody.querySelectorAll('[data-room]').forEach(el => el.classList.toggle('is-active', app.tool === 'room' && a && a.preset === el.dataset.room));
    els.libBody.querySelectorAll('[data-opening]').forEach(el => el.classList.toggle('is-active', Boolean(a && a.kind === 'opening' && a.type === el.dataset.opening && (app.tool === 'door' || app.tool === 'window'))));
    els.libBody.querySelectorAll('[data-wall]').forEach(el => el.classList.toggle('is-active', app.tool === 'wall' && a && a.type === el.dataset.wall));
    els.libBody.querySelectorAll('[data-asset]').forEach(el => el.classList.toggle('is-active', app.tool === 'place' && a && a.t === el.dataset.asset));
  }

  /* ================= プロパティパネル ================= */

  // 文字入力は打つたびに反映し、「元に戻す」は入力を終えたときに1回
  function liveInput(input, apply) {
    input.addEventListener('focus', () => { ui.editBefore = snapshot(); });
    input.addEventListener('input', () => {
      if (!ui.editBefore) ui.editBefore = snapshot();
      apply(input.value);
      app.rev++;
      ui.linesCache = null;
      scheduleSave();
      requestRender();
      ui.syncers.forEach(fn => fn(input));
    });
    const commit = () => {
      if (ui.editBefore && ui.editBefore !== snapshot()) pushUndo(ui.editBefore);
      ui.editBefore = null;
    };
    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);
  }

  function field(label, control, extra) {
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, extra || null);
  }

  function textField(label, get, set, opts = {}) {
    const input = opts.multiline
      ? h('textarea', { class: 'text-input', rows: opts.rows || 3, placeholder: opts.placeholder || '', dataset: { focus: opts.focus || '' } })
      : h('input', { class: 'text-input', type: 'text', placeholder: opts.placeholder || '', dataset: { focus: opts.focus || '' } });
    input.value = get() || '';
    liveInput(input, v => set(v));
    ui.syncers.push(except => { if (except !== input && document.activeElement !== input) input.value = get() || ''; });
    return field(label, input, opts.note ? h('p', { class: 'field-note' }, opts.note) : null);
  }

  function numberField(label, get, set, opts = {}) {
    const input = h('input', { class: 'number-input', type: 'number', step: opts.step || 0.25, min: opts.min != null ? opts.min : null, max: opts.max != null ? opts.max : null, inputmode: 'decimal', disabled: opts.disabled });
    input.value = fmt(get());
    liveInput(input, v => {
      const n = Number(v);
      if (v === '' || !Number.isFinite(n)) return;
      set(opts.min != null ? Math.max(opts.min, n) : n);
    });
    input.addEventListener('blur', () => { input.value = fmt(get()); });
    ui.syncers.push(except => { if (except !== input && document.activeElement !== input) input.value = fmt(get()); });
    return field(label, h('span', { class: 'num-wrap' }, input, opts.suffix ? h('span', { class: 'num-suffix' }, opts.suffix) : null));
  }

  function selectField(label, options, get, set) {
    const select = h('select', { class: 'select-input' });
    options.forEach(o => {
      if (o.group) {
        const og = h('optgroup', { label: o.group });
        o.options.forEach(x => og.appendChild(h('option', { value: x.value }, x.label)));
        select.appendChild(og);
      } else select.appendChild(h('option', { value: o.value }, o.label));
    });
    select.value = get();
    select.addEventListener('change', () => change(() => set(select.value)));
    ui.syncers.push(() => { if (document.activeElement !== select) select.value = get(); });
    return field(label, select);
  }

  function toggleField(label, get, set) {
    const input = h('input', { type: 'checkbox', class: 'switch-input' });
    input.checked = Boolean(get());
    input.addEventListener('change', () => change(() => set(input.checked)));
    ui.syncers.push(() => { input.checked = Boolean(get()); });
    return h('label', { class: 'toggle-inline' }, h('span', { class: 'switch' }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' })), h('span', null, label));
  }

  function prefToggle(label, get, set) {
    const input = h('input', { type: 'checkbox', class: 'switch-input' });
    input.checked = Boolean(get());
    input.addEventListener('change', () => { set(input.checked); savePrefs(); requestRender(); });
    return h('label', { class: 'toggle-inline' }, h('span', { class: 'switch' }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' })), h('span', null, label));
  }

  function colorField(label, get, set, auto) {
    const input = h('input', { type: 'color', class: 'color-input' });
    const wrap = h('span', { class: 'color-field' });
    const hex = h('span', { class: 'color-hex' });
    const sync = () => {
      const v = get();
      input.value = v || auto || '#ffffff';
      hex.textContent = v ? v.toUpperCase() : t('props.colorAuto');
      wrap.classList.toggle('is-empty', !v);
    };
    liveInput(input, v => set(v));
    input.addEventListener('input', sync);
    const clear = h('button', { type: 'button', class: 'color-clear', title: t('props.colorAuto'), 'aria-label': t('props.colorAuto'), onclick: e => { e.preventDefault(); change(() => set('')); sync(); } }, '×');
    wrap.append(input, h('span', { class: 'color-meta' }, h('span', { class: 'color-label' }, label), hex), clear);
    sync();
    ui.syncers.push(except => { if (except !== input) sync(); });
    return wrap;
  }

  function segmentField(label, options, get, set) {
    const group = h('div', { class: 'segment-group rot-group', role: 'group', 'aria-label': label });
    const sync = () => group.querySelectorAll('.segment').forEach(b => b.classList.toggle('is-active', b.dataset.value === String(get())));
    options.forEach(o => group.appendChild(h('button', { type: 'button', class: 'segment', dataset: { value: String(o.value) }, title: o.title || null, onclick: () => { change(() => set(o.value)); sync(); } }, o.label)));
    sync();
    ui.syncers.push(sync);
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), group);
  }

  function actions(buttons) {
    return h('div', { class: 'props-actions' }, buttons.filter(Boolean).map(b => h('button', { type: 'button', class: `mini-button${b.danger ? ' is-danger' : ''}`, onclick: b.run }, b.label)));
  }

  function readout(fn) {
    const node = h('div', { class: 'readout' });
    const sync = () => {
      node.innerHTML = '';
      fn().forEach(([k, v]) => node.append(h('span', null, k), document.createTextNode(v)));
    };
    sync();
    ui.syncers.push(sync);
    return node;
  }

  function focusField(name) {
    requestAnimationFrame(() => {
      const el = els.props.querySelector(`[data-focus="${name}"]`);
      if (el) { el.focus(); if (el.select) el.select(); }
    });
  }

  function selectionSig() {
    return `${app.lang}|${app.project.active}|${app.playerView}|${app.sel.map(s => `${s.type}:${s.id}${(getObj(s.type, s.id) || {}).locked ? ':L' : ''}${(getObj(s.type, s.id) || {}).gm ? ':G' : ''}`).join(',')}|${app.sel.length === 1 ? (getObj(app.sel[0].type, app.sel[0].id) || {}).kind || (getObj(app.sel[0].type, app.sel[0].id) || {}).t || '' : ''}`;
  }

  function refreshProps() {
    if (selectionSig() !== ui.propsSig) renderProps(true);
    else ui.syncers.forEach(fn => fn(null));
  }

  function renderProps(force) {
    const sig = selectionSig();
    if (!force && sig === ui.propsSig) {
      ui.syncers.forEach(fn => fn(null));
      return;
    }
    ui.propsSig = sig;
    ui.syncers = [];
    const panel = els.props;
    const keepScroll = panel.scrollTop;
    panel.innerHTML = '';
    const body = h('div', { class: 'props-body' });
    const entries = selEntries();
    if (!entries.length) mapProps(body);
    else if (entries.length > 1) multiProps(body, entries);
    else {
      const { type, obj } = entries[0];
      if (type === 'room') roomProps(body, obj);
      if (type === 'item') itemProps(body, obj);
      if (type === 'opening') openingProps(body, obj);
      if (type === 'wall') wallProps(body, obj);
      if (type === 'text') textProps(body, obj);
    }
    panel.appendChild(body);
    panel.scrollTop = keepScroll;
    positionMiniBar();
  }

  function head(kicker, title, sub) {
    return h('div', { class: 'props-head' }, h('div', null, h('p', { class: 'panel-kicker' }, kicker), h('p', { class: 'props-title' }, title)), sub ? h('span', { class: 'props-sub' }, sub) : null);
  }

  // 見出しの右上に並べる小さなアイコンボタン
  function headTools(buttons) {
    return h('div', { class: 'props-tools' }, buttons.map(b => {
      const btn = h('button', { type: 'button', class: `props-tool${b.on ? ' is-on' : ''}`, title: b.label, 'aria-label': b.label, 'aria-pressed': b.pressed == null ? null : String(b.pressed), disabled: b.disabled, onclick: b.run });
      btn.innerHTML = b.icon;
      return btn;
    }));
  }

  const cellsSuffix = () => t('props.cells');
  const orderButtons = () => [{ label: t('props.front'), run: () => reorder(true) }, { label: t('props.back'), run: () => reorder(false) }];
  const commonButtons = () => [{ label: t('props.duplicate'), run: duplicateSelection }, { label: t('props.delete'), run: deleteSelection, danger: true }];

  function mapProps(body) {
    const p = app.project;
    body.appendChild(head(t('props.mapTitle'), p.name || t('msg.untitled')));
    body.appendChild(textField(t('props.mapName'), () => p.name, v => { p.name = v; syncMapTitle(); }, { placeholder: t('props.mapNamePh') }));
    body.appendChild(selectField(t('props.style'), Object.entries(M.THEMES).map(([id, th]) => ({ value: id, label: pick(th.name) })), () => p.theme, v => { p.theme = v; }));
    body.appendChild(toggleField(t('props.showNames'), () => p.showNames !== false, v => { p.showNames = v; }));
    body.appendChild(selectField(t('props.sizeLabel'), ['none', 'jo', 'm2', 'm'].map(v => ({ value: v, label: t(`props.sizeModes.${v}`) })), () => p.showSize, v => { p.showSize = v; }));
    body.appendChild(prefToggle(t('props.grid'), () => app.grid, v => { app.grid = v; }));
    body.appendChild(prefToggle(t('props.ghost'), () => app.ghost, v => { app.ghost = v; }));
    body.appendChild(h('div', { class: 'props-sep' }));
    const f = cur();
    body.appendChild(readout(() => [[`${f.name || ''} `, t('props.stats', { rooms: f.rooms.length, items: f.items.length, openings: f.openings.length })]]));
    body.appendChild(h('p', { class: 'props-tip' }, t('props.mapTip')));
  }

  function syncMapTitle() {
    const title = els.props.querySelector('.props-title');
    if (title && !app.sel.length) title.textContent = app.project.name || t('msg.untitled');
  }

  function roomProps(body, r) {
    const cats = M.CATEGORIES.map(c => ({ value: c.id, label: pick(c.name) }));
    const titleNode = head(t('props.room'), r.name || '—');
    titleNode.appendChild(headTools([
      { icon: r.locked ? ICONS.lock : ICONS.unlock, label: t(r.locked ? 'mini.unlock' : 'mini.lock'), on: r.locked, pressed: Boolean(r.locked), run: toggleLock },
      { icon: ICONS.rotate, label: t('mini.rotate'), disabled: r.locked, run: rotateSelection }
    ]));
    body.appendChild(titleNode);
    const title = titleNode.querySelector('.props-title');
    body.appendChild(textField(t('props.name'), () => r.name, v => { r.name = v; title.textContent = v || '—'; }, { focus: 'name' }));
    body.appendChild(textField(t('props.plName'), () => r.plName, v => { r.plName = v; }, { placeholder: t('props.plNamePh'), note: t('props.plNameNote') }));
    body.appendChild(selectField(t('props.category'), cats, () => r.cat, v => { r.cat = v; }));
    body.appendChild(readout(() => {
      const area = M.roomArea(r);
      return [[`${t('props.area')} `, `${meters(r.w, r.h)} · ${fmt(area)}㎡ · ${(area / M.TATAMI_M2).toFixed(1)}${app.lang === 'en' ? ' jo' : app.lang === 'ko' ? '첩' : '帖'}`]];
    }));
    const lockedOpt = { step: 1, suffix: cellsSuffix(), disabled: r.locked };
    body.appendChild(h('div', { class: 'props-grid' },
      numberField(t('props.x'), () => r.x, v => { r.x = Math.round(v); }, lockedOpt),
      numberField(t('props.y'), () => r.y, v => { r.y = Math.round(v); }, lockedOpt),
      numberField(t('props.w'), () => r.w, v => { r.w = Math.max(1, Math.round(v)); }, { ...lockedOpt, min: 1 }),
      numberField(t('props.h'), () => r.h, v => { r.h = Math.max(1, Math.round(v)); }, { ...lockedOpt, min: 1 })
    ));
    if (r.locked) body.appendChild(h('p', { class: 'props-tip' }, t('props.lockedNote')));
    body.appendChild(colorField(t('props.color'), () => r.color || '', v => { r.color = v || undefined; if (!v) delete r.color; }, M.roomFill(theme(), { cat: r.cat })));
    body.appendChild(toggleField(t('props.gmOnly'), () => r.gm, v => { r.gm = v || undefined; if (!v) delete r.gm; }));
    body.appendChild(toggleField(t('props.hideLabel'), () => r.hideLabel, v => { r.hideLabel = v || undefined; if (!v) delete r.hideLabel; }));
    body.appendChild(toggleField(t('props.noWall'), () => r.noWall, v => { r.noWall = v || undefined; if (!v) delete r.noWall; }));
    body.appendChild(textField(t('props.note'), () => r.note, v => { r.note = v; }, { multiline: true, placeholder: t('props.notePh') }));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions([
      (r.lx || r.ly) ? { label: t('props.labelReset'), run: () => change(() => { delete r.lx; delete r.ly; }) } : null,
      ...orderButtons(), ...commonButtons()
    ]));
  }

  function itemProps(body, it) {
    const asset = M.ASSET[it.t];
    body.appendChild(head(t('props.item'), pick(asset.name)));
    body.appendChild(textField(t('props.label'), () => it.label, v => { it.label = v; }, { placeholder: t('props.labelPh'), focus: 'label' }));
    body.appendChild(segmentField(t('props.rotate'), [0, 90, 180, 270].map(v => ({ value: v, label: `${v}°` })), () => it.rot || 0, v => rotateItem(it, v - (it.rot || 0))));
    body.appendChild(h('div', { class: 'props-grid' },
      numberField(t('props.x'), () => it.x, v => { it.x = round2(v); }, { suffix: cellsSuffix() }),
      numberField(t('props.y'), () => it.y, v => { it.y = round2(v); }, { suffix: cellsSuffix() }),
      numberField(t('props.w'), () => it.w, v => { it.w = Math.max(0.25, round2(v)); }, { min: 0.25, suffix: cellsSuffix() }),
      numberField(t('props.h'), () => it.h, v => { it.h = Math.max(0.25, round2(v)); }, { min: 0.25, suffix: cellsSuffix() })
    ));
    body.appendChild(readout(() => [[`${t('props.area')} `, meters(it.w, it.h)]]));
    body.appendChild(toggleField(t('props.flip'), () => it.flip, v => { it.flip = v || undefined; if (!v) delete it.flip; }));
    body.appendChild(colorField(t('props.color'), () => it.color || '', v => { it.color = v || undefined; if (!v) delete it.color; }, theme().furn.fill));
    body.appendChild(toggleField(t('props.gmOnly'), () => it.gm, v => { it.gm = v || undefined; if (!v) delete it.gm; }));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions([...orderButtons(), ...commonButtons()]));
  }

  function openingProps(body, o) {
    const groups = [
      { group: t('lib.doors'), options: M.OPENINGS.filter(x => x.group === 'door').map(x => ({ value: x.id, label: pick(x.name) })) },
      { group: t('lib.windows'), options: M.OPENINGS.filter(x => x.group === 'window').map(x => ({ value: x.id, label: pick(x.name) })) }
    ];
    body.appendChild(head(t('props.opening'), pick(M.OPEN[o.kind].name)));
    body.appendChild(selectField(t('props.category'), groups, () => o.kind, v => { o.kind = v; }));
    body.appendChild(numberField(t('props.len'), () => o.len, v => { o.len = Math.max(0.5, round2(v)); }, { min: 0.5, suffix: cellsSuffix() }));
    body.appendChild(readout(() => [[`${t('props.len')} `, `${fmt(o.len * M.CELL_M)}m`]]));
    if (SWING_DOORS.has(o.kind) || o.kind === 'folding') {
      body.appendChild(actions([
        { label: t('props.swingFlip'), run: () => change(() => { o.side = o.side === -1 ? 1 : -1; }) },
        { label: t('props.hingeFlip'), run: () => change(() => { o.hinge = o.hinge ? 0 : 1; }) }
      ]));
    }
    body.appendChild(toggleField(t('props.gmOnly'), () => o.gm, v => { o.gm = v || undefined; if (!v) delete o.gm; }));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions(commonButtons()));
  }

  function wallProps(body, w) {
    body.appendChild(head(t('props.wall'), pick(M.WALL[w.kind].name)));
    body.appendChild(selectField(t('props.wallKind'), M.WALL_KINDS.map(k => ({ value: k.id, label: pick(k.name) })), () => w.kind, v => { w.kind = v; }));
    body.appendChild(readout(() => [[`${t('props.len')} `, `${fmt(Math.hypot(w.x2 - w.x1, w.y2 - w.y1) * M.CELL_M)}m`]]));
    body.appendChild(toggleField(t('props.gmOnly'), () => w.gm, v => { w.gm = v || undefined; if (!v) delete w.gm; }));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions(commonButtons()));
  }

  function textProps(body, x) {
    body.appendChild(head(t('props.text'), ''));
    body.appendChild(textField(t('props.textBody'), () => x.text, v => { x.text = v; }, { multiline: true, rows: 2, focus: 'text' }));
    body.appendChild(numberField(t('props.textSize'), () => x.size || 0.7, v => { x.size = clamp(round2(v), 0.3, 4); }, { step: 0.1, min: 0.3, max: 4, suffix: cellsSuffix() }));
    body.appendChild(toggleField(t('props.bold'), () => x.bold !== false, v => { if (v) delete x.bold; else x.bold = false; }));
    body.appendChild(colorField(t('props.color'), () => x.color || '', v => { x.color = v || undefined; if (!v) delete x.color; }, theme().label));
    body.appendChild(toggleField(t('props.gmOnly'), () => x.gm, v => { x.gm = v || undefined; if (!v) delete x.gm; }));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions(commonButtons()));
  }

  function multiProps(body, entries) {
    body.appendChild(head(t('props.multi', { n: entries.length }), ''));
    body.appendChild(toggleField(t('props.gmOnly'), () => entries.every(e => e.obj.gm), v => entries.forEach(e => { if (v) e.obj.gm = true; else delete e.obj.gm; })));
    const roomsSel = entries.filter(e => e.type === 'room');
    if (roomsSel.length) {
      const locked = roomsSel.every(e => e.obj.locked);
      body.appendChild(actions([
        { label: t(locked ? 'mini.unlock' : 'mini.lock'), run: toggleLock },
        { label: t('mini.rotate'), run: rotateSelection }
      ]));
    } else if (entries.some(e => e.type === 'item')) {
      body.appendChild(actions([
        { label: t('mini.rotate'), run: rotateSelection },
        { label: t('mini.flip'), run: flipSelection }
      ]));
    }
    body.appendChild(h('p', { class: 'props-tip' }, t('props.alignNote')));
    body.appendChild(h('div', { class: 'props-sep' }));
    body.appendChild(actions([...orderButtons(), ...commonButtons()]));
  }

  /* ================= テンプレート ================= */

  function openTemplates() {
    closeDrawers();
    els.tplModal.hidden = false;
    renderTemplates();
    const first = els.tplModal.querySelector('.tpl-card');
    if (first) first.focus({ preventScroll: true });
  }

  function templateThumb(id) {
    const key = `${app.lang}|${id}`;
    if (ui.tplThumbs[key]) return ui.tplThumbs[key];
    const floors = M.instantiateTemplate(id, app.lang);
    const canvas = M.renderImage(floors, { theme: 'clean', px: 12, lang: app.lang, showSize: 'none', playerView: false, margin: 1 });
    const url = canvas.toDataURL('image/png');
    ui.tplThumbs[key] = url;
    return url;
  }

  function renderTemplates() {
    els.tplGroups.innerHTML = '';
    M.TEMPLATE_GROUPS.forEach(g => {
      els.tplGroups.appendChild(h('button', {
        type: 'button', class: `chip${app.tplGroup === g.id ? ' is-active' : ''}`,
        onclick: () => { app.tplGroup = g.id; renderTemplates(); }
      }, pick(g.name)));
    });
    els.tplGrid.innerHTML = '';
    M.TEMPLATES.filter(tp => tp.group === app.tplGroup).forEach(tp => {
      const img = h('img', { alt: '' });
      const floors = tp.build().length;
      els.tplGrid.appendChild(h('button', { type: 'button', class: 'tpl-card', onclick: () => loadTemplate(tp.id) },
        h('span', { class: 'tpl-thumb' }, img),
        h('span', { class: 'tpl-name' }, pick(tp.name)),
        h('span', { class: 'tpl-meta' }, t('tpl.floors', { n: floors })),
        h('span', { class: 'tpl-desc' }, pick(tp.desc))
      ));
      requestAnimationFrame(() => { img.src = templateThumb(tp.id); });
    });
    if (app.tplGroup === 'home') {
      els.tplGrid.appendChild(h('button', { type: 'button', class: 'tpl-card', onclick: newMap },
        h('span', { class: 'tpl-thumb is-blank' }, '+'),
        h('span', { class: 'tpl-name' }, t('tpl.blank')),
        h('span', { class: 'tpl-desc' }, t('tpl.blankDesc'))
      ));
    }
  }

  function groundFloorIndex(floors) {
    const i = floors.findIndex(f => /^1\s*F$|^1階$|^1층$/i.test(f.name));
    return i >= 0 ? i : 0;
  }

  function loadTemplate(id) {
    const tpl = M.TEMPLATES.find(tp => tp.id === id);
    if (!tpl) return;
    const floors = M.instantiateTemplate(id, app.lang, { structureOnly: els.tplStructureOnly.checked });
    change(() => {
      const p = app.project;
      p.floors = floors;
      p.active = groundFloorIndex(floors);
      p.name = pick(tpl.name);
      if (p.theme === 'clean' || p.theme === 'horror') p.theme = tpl.group === 'horror' && id !== 'crime' ? 'horror' : 'clean';
    });
    app.sel = [];
    closeModals();
    setTool('select');
    fitView();
    renderAll();
    toast(t('msg.templateLoaded', { name: pick(tpl.name) }), 'success', 4000, undoAction());
    track('template_load', { template: id, structure_only: els.tplStructureOnly.checked });
  }

  function newMap() {
    change(() => {
      const keep = { theme: app.project.theme === 'horror' ? 'clean' : app.project.theme, showSize: app.project.showSize, showNames: app.project.showNames !== false };
      app.project = { ...M.emptyProject(t('newMapName')), ...keep };
    });
    app.sel = [];
    closeModals();
    setTool('room');
    view.zoom = ZOOM_BASE;
    view.ox = 80;
    view.oy = 40;
    syncZoom();
    renderAll();
    toast(t('msg.newMap'), 'success', 4000, undoAction());
  }

  /* ================= 書き出し ================= */

  function openExport() {
    closeDrawers();
    if (!app.exp.theme) app.exp.theme = app.project.theme;
    els.expModal.hidden = false;
    renderExport();
  }

  function exportFloors() {
    return app.exp.range === 'all' ? app.project.floors : [cur()];
  }

  function exportOptions(px) {
    return {
      theme: app.exp.theme || app.project.theme, px, lang: app.lang, showSize: app.project.showSize,
      hideNames: app.project.showNames === false,
      playerView: app.exp.view === 'pl', grid: app.exp.grid, transparent: app.exp.transparent
    };
  }

  function renderExport() {
    const box = els.expOptions;
    box.innerHTML = '';
    const seg = (label, key, options, after) => {
      const group = h('div', { class: 'segment-group', role: 'group', 'aria-label': label });
      options.forEach(([value, text]) => group.appendChild(h('button', {
        type: 'button', class: `segment${app.exp[key] === value ? ' is-active' : ''}`,
        onclick: () => { app.exp[key] = value; savePrefs(); renderExport(); if (after) after(); }
      }, text)));
      return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), group);
    };
    const multi = app.project.floors.length > 1;
    if (multi) box.appendChild(seg(t('exp.range'), 'range', [['current', t('exp.current')], ['all', t('exp.all')], ['each', t('exp.each')]]));
    box.appendChild(seg(t('exp.view'), 'view', [['pl', t('exp.pl')], ['gm', t('exp.gm')]]));
    const style = h('select', { class: 'select-input' });
    Object.entries(M.THEMES).forEach(([id, th]) => style.appendChild(h('option', { value: id }, pick(th.name))));
    style.value = app.exp.theme || app.project.theme;
    style.addEventListener('change', () => { app.exp.theme = style.value; renderExport(); });
    box.appendChild(field(t('exp.style'), style));
    box.appendChild(seg(t('exp.px'), 'px', [24, 32, 48, 64, 96].map(v => [v, `${v}px`])));
    box.appendChild(h('p', { class: 'field-note' }, t('exp.pxNote')));
    const toggle = (label, key) => {
      const input = h('input', { type: 'checkbox', class: 'switch-input' });
      input.checked = app.exp[key];
      input.addEventListener('change', () => { app.exp[key] = input.checked; savePrefs(); renderExport(); });
      return h('label', { class: 'toggle-inline' }, h('span', { class: 'switch' }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' })), h('span', null, label));
    };
    box.appendChild(toggle(t('exp.grid'), 'grid'));
    box.appendChild(toggle(t('exp.transparent'), 'transparent'));
    const info = h('p', { class: 'export-info' });
    box.appendChild(info);
    const actionsRow = h('div', { class: 'export-actions' },
      h('button', { type: 'button', class: 'accent-button', onclick: doExport }, t('exp.download')),
      (navigator.clipboard && window.ClipboardItem && app.exp.range !== 'each') ? h('button', { type: 'button', class: 'ghost-button', onclick: copyExport }, t('exp.copy')) : null
    );
    box.appendChild(actionsRow);
    // プレビュー（小さめに描いて、実寸は計算で出す）
    els.expPreview.innerHTML = '';
    const floors = exportFloors();
    if (!floors.some(f => M.floorBounds(M.visibleFloor(f, app.exp.view === 'pl')))) {
      els.expPreview.appendChild(h('p', { class: 'export-info' }, t('exp.empty')));
      info.textContent = '';
      return;
    }
    const pv = Math.min(app.exp.px, 16);
    const canvas = M.renderImage(floors, exportOptions(pv));
    const cw = canvas.width / pv, ch = canvas.height / pv;
    const k = M.exportScale(cw, ch, app.exp.px);
    const w = Math.round(cw * k), hh = Math.round(ch * k);
    const note = k < app.exp.px ? ` · ${t('exp.tooLarge')}` : '';
    info.textContent = `${t('exp.info', { w, h: hh })}${app.exp.range === 'each' && multi ? ` × ${app.project.floors.length}` : ''}${note}`;
    const img = h('img', { alt: '' });
    img.src = canvas.toDataURL('image/png');
    els.expPreview.appendChild(img);
  }

  function canvasBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  function exportName(floor) {
    const parts = [fileBase()];
    if (floor) parts.push(String(floor.name || '').replace(/[\\/:*?"<>|\s]+/g, '_'));
    parts.push(app.exp.view === 'pl' ? 'PL' : 'GM');
    return `${parts.filter(Boolean).join('_')}.png`;
  }

  async function doExport() {
    const px = app.exp.px;
    const multi = app.project.floors.length > 1;
    const jobs = app.exp.range === 'each' && multi
      ? app.project.floors.map(f => ({ floors: [f], name: exportName(f) }))
      : [{ floors: exportFloors(), name: exportName(app.exp.range === 'all' && multi ? null : (multi ? cur() : null)) }];
    for (const job of jobs) {
      if (!job.floors.some(f => M.floorBounds(M.visibleFloor(f, app.exp.view === 'pl')))) continue;
      const canvas = M.renderImage(job.floors, exportOptions(px));
      const blob = await canvasBlob(canvas);
      if (blob) download(blob, job.name);
      await new Promise(r => setTimeout(r, 250));
    }
    toast(t('exp.saved'), 'success');
    track('export_png', { range: app.exp.range, view: app.exp.view, px, theme: app.exp.theme || app.project.theme });
  }

  async function copyExport() {
    try {
      const canvas = M.renderImage(exportFloors(), exportOptions(app.exp.px));
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': canvasBlob(canvas) })]);
      toast(t('exp.copied'), 'success');
      track('export_copy', { view: app.exp.view });
    } catch (error) {
      toast(t('exp.copyFailed'), 'warning', 5000);
    }
  }

  /* ================= ドロワー・モーダル ================= */

  function drawerPairs() {
    return [[els.helpDrawer, els.helpBtn], [els.shortcutDrawer, els.shortcutBtn]];
  }

  function toggleDrawer(drawer) {
    const open = drawer.hidden;
    drawerPairs().forEach(([d]) => { d.hidden = true; });
    drawer.hidden = !open;
    drawerPairs().forEach(([d, btn]) => btn.setAttribute('aria-expanded', String(!d.hidden)));
  }

  function closeDrawers() {
    const wasOpen = drawerPairs().some(([d]) => !d.hidden);
    drawerPairs().forEach(([d, btn]) => { d.hidden = true; btn.setAttribute('aria-expanded', 'false'); });
    return wasOpen;
  }

  function closeModals() {
    els.tplModal.hidden = true;
    els.expModal.hidden = true;
  }

  function renderAll() {
    syncHistoryButtons();
    renderFloorBar();
    renderProps(true);
    requestRender();
  }

  /* ================= 起動 ================= */

  function bindEvents() {
    document.querySelectorAll('[data-lang-choice]').forEach(btn => btn.addEventListener('click', () => {
      app.lang = LANGS.includes(btn.dataset.langChoice) ? btn.dataset.langChoice : 'ja';
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      applyLanguage();
    }));
    els.helpBtn.addEventListener('click', () => toggleDrawer(els.helpDrawer));
    els.shortcutBtn.addEventListener('click', () => toggleDrawer(els.shortcutDrawer));
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', closeDrawers));
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModals));
    [els.tplModal, els.expModal].forEach(modal => modal.addEventListener('mousedown', event => { if (event.target === modal) closeModals(); }));
    els.themeBtn.addEventListener('click', toggleTheme);
    els.libTabs.querySelectorAll('[data-lib]').forEach(btn => btn.addEventListener('click', () => setLibTab(btn.dataset.lib)));
    els.toolStrip.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
    els.miniBar.addEventListener('pointerdown', event => event.stopPropagation());
    els.miniBar.querySelectorAll('[data-mini]').forEach(btn => btn.addEventListener('click', () => {
      const action = btn.dataset.mini;
      if (action === 'rotate') rotateSelection();
      if (action === 'flip') flipSelection();
      if (action === 'hinge') flipHinge();
      if (action === 'lock') toggleLock();
      if (action === 'gm') toggleGm();
      if (action === 'duplicate') duplicateSelection();
      if (action === 'delete') deleteSelection();
    }));
    els.tplBtn.addEventListener('click', openTemplates);
    els.newBtn.addEventListener('click', newMap);
    els.openBtn.addEventListener('click', () => els.openFile.click());
    els.openFile.addEventListener('change', () => {
      const file = els.openFile.files && els.openFile.files[0];
      els.openFile.value = '';
      readFile(file);
    });
    els.saveBtn.addEventListener('click', saveFile);
    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);
    els.exportBtn.addEventListener('click', openExport);
    els.viewToggle.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setPlayerView(btn.dataset.view === 'pl')));
    els.zoomIn.addEventListener('click', () => zoomAt(view.w / 2, view.h / 2, 1.25));
    els.zoomOut.addEventListener('click', () => zoomAt(view.w / 2, view.h / 2, 0.8));
    els.zoomValue.addEventListener('click', fitView);
    els.fitBtn.addEventListener('click', fitView);
    const cv = els.canvas;
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', event => { ui.pointers.delete(event.pointerId); if (ui.drag && ui.drag.mode !== 'pinch') cancelDrag(); else if (!ui.pointers.size) ui.drag = null; });
    cv.addEventListener('pointerleave', onPointerLeave);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('dblclick', onDoubleClick);
    cv.addEventListener('contextmenu', event => event.preventDefault());
    els.wrap.addEventListener('dragover', onDragOver);
    els.wrap.addEventListener('dragleave', event => {
      if (!els.wrap.contains(event.relatedTarget)) {
        els.wrap.classList.remove('is-dropping');
        ui.ghostItem = null;
        requestRender();
      }
    });
    els.wrap.addEventListener('drop', onDrop);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { ui.spaceDown = false; updateCursor(); });
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(els.wrap);
    else window.addEventListener('resize', resizeCanvas);
  }

  function start() {
    app.lang = detectLang();
    loadPrefs();
    initTheme();
    const restored = restoreProject();
    if (restored) app.project = restored;
    else {
      const floors = M.instantiateTemplate('1ldk', app.lang);
      app.project = { ...M.emptyProject(pick(M.TEMPLATES[0].name)), floors, active: 0 };
    }
    bindEvents();
    resizeCanvas();
    fitView();
    setTool('select');
    setPlayerView(false);
    applyLanguage();
    syncHistoryButtons();
    track('tool_open', { restored: Boolean(restored) });
  }

  // テスト・デバッグ用の最小限の窓口
  window.IndoorMapMakerApi = {
    get project() { return app.project; },
    get selection() { return app.sel.slice(); },
    get view() { return { ...view }; },
    setTool, loadTemplate, fitView, undo, redo, toWorld, toScreen, openExport, openTemplates, switchFloor, setPlayerView
  };

  start();
})();
