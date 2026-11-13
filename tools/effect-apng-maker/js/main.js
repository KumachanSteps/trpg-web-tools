/*
 * 演出APNGメーカー — 画面のつなぎこみ
 *   ライブラリ（左）→ 選んだアセットを プレビュー（中央）に重ね、調整（右）で設定を変えて書き出す。
 */
import { I18N } from './i18n.js';
import { loadManifest, EffectInstance, defaultParams, frameTimes } from './engine.js';
import { Stage } from './stage.js';

const C = window.TextApngCodec;
const STORE_KEY = 'effectApngMaker.settings';
const SIZES = [[1280, 720], [960, 540], [640, 360]];
const FPS_LIST = [30, 24, 20, 16, 15, 12, 10, 8];
const COLOR_LIST = [0, 256, 128, 64, 32];
const MB = 1024 * 1024;
const BUDGET_OK = 3 * MB;
const BUDGET_MAX = 4 * MB;
const WEBP_QUALITY = 0.9;
const NEW_DAYS = 30;

const $ = sel => document.querySelector(sel);
const els = {
  grid: $('#assetGrid'), tabs: $('#categoryTabs'), search: $('#searchInput'), chips: $('#filterChips'), count: $('#libraryCount'),
  stage: $('#stage'), play: $('#playBtn'), scrub: $('#scrubber'), time: $('#timeReadout'), loopPreview: $('#loopPreview'),
  currentName: $('#currentAssetName'), intro: $('#assetIntro'), common: $('#commonControls'), params: $('#paramControls'), output: $('#outputControls'),
  estimateValue: $('#estimateValue'), budgetFill: $('#budgetFill'), budgetNote: $('#budgetNote'), lighten: $('#lightenBtn'),
  exportApng: $('#exportApngBtn'), exportWebp: $('#exportWebpBtn'), progress: $('#progress'), progressFill: $('#progressFill'), progressText: $('#progressText'), cancel: $('#cancelBtn'),
  result: $('#result'), resultImg: $('#resultImg'), resultMeta: $('#resultMeta'), resultBudget: $('#resultBudget'), download: $('#downloadLink'), ccfoliaTip: $('#ccfoliaTip'),
  bgChoices: $('#bgChoices'), bgFile: $('#bgFile'), charAdd: $('#charAddBtn'), charFile: $('#charFile'), charList: $('#charList'), charEdit: $('#charEdit'),
  charSize: $('#charSize'), charFlip: $('#charFlip'), charFront: $('#charFront'), charRemove: $('#charRemove'), clearStage: $('#clearStageBtn'),
  toast: $('#toast'), grid2: $('#studioGrid')
};

/* ---------- 保存（このブラウザの localStorage だけ） ---------- */

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
const store = Object.assign({ lang: null, theme: 'dark', current: null, favs: [], perAsset: {} }, loadStore());
let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 保存できなくても動かす */ }
  }, 200);
}

/* ---------- 言語 ---------- */

let lang = store.lang || ((navigator.language || 'ja').startsWith('ko') ? 'ko' : (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en');
if (!I18N[lang]) lang = 'ja';
const t = () => I18N[lang];
const pick = obj => (obj && (obj[lang] || obj.en || obj.ja)) || '';

function applyLanguage() {
  const m = t();
  document.documentElement.lang = m.htmlLang;
  document.title = m.documentTitle;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = m[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  els.search.placeholder = m.searchPlaceholder;
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  $('#languageSwitcher').setAttribute('aria-label', m.langGroup);
  $('#helpSteps').innerHTML = m.helpSteps.map(s => `<li>${escapeHtml(s.replace(/^\d+\.\s*/, ''))}</li>`).join('');
  $('#helpNotes').innerHTML = m.helpNotes.map(s => `<p>${escapeHtml(s)}</p>`).join('');
  const r = m.rules;
  $('#rulesBody').innerHTML = `<p>${escapeHtml(r.intro)}</p>
    <h3>${escapeHtml(r.allowTitle)}</h3><ul>${r.allow.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    <h3>${escapeHtml(r.denyTitle)}</h3><ul>${r.deny.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
    <p class="hint">${escapeHtml(r.note)}</p>
    <h3>${escapeHtml(r.creditTitle)}</h3><p>${escapeHtml(r.creditLead)}</p>
    <p class="credit-line"><code>${escapeHtml(r.credit)}</code> <button type="button" class="link-button" data-copy-credit>${escapeHtml(m.copyCredit)}</button></p>
    <p class="hint">${escapeHtml(r.creditWhere)}</p>${r.translation ? `<p class="hint">${escapeHtml(r.translation)}</p>` : ''}`;
  $('#footerNote1').innerHTML = m.footerNote1;
  $('#footerNote2').innerHTML = m.footerNote2;
  applyTheme();
  if (app.manifest) {
    renderTabs();
    renderLibrary();
    renderControls();
    refreshEstimate();
  }
  els.play.setAttribute('aria-label', app.playing ? m.pause : m.play);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- テーマ ---------- */

function applyTheme() {
  const dark = store.theme !== 'light';
  document.body.classList.toggle('is-dark', dark);
  $('#themeBtn').title = dark ? t().themeDark : t().themeLight;
  $('#themeBtn').setAttribute('aria-label', $('#themeBtn').title);
}

/* ---------- 状態 ---------- */

const app = {
  manifest: null,
  byId: new Map(),
  category: 'all',
  filters: new Set(),
  query: '',
  asset: null,
  instance: null,
  buildToken: 0,
  playing: true,
  time: 0,
  lastTick: 0,
  holdUntil: 0,
  output: { size: 1, fps: 20, colors: 128, bake: 'none' },
  exporting: null,
  estimateToken: 0,
  resultUrl: null
};

function settings(asset = app.asset) {
  if (!asset) return null;
  let s = store.perAsset[asset.id];
  if (!s) {
    s = store.perAsset[asset.id] = {
      params: defaultParams(asset), play: asset.playback.default, count: 3,
      direction: 'out', duration: asset.duration.default, opacity: 1, seed: 1
    };
  }
  s.params = { ...defaultParams(asset), ...s.params };
  if (!asset.playback.allowed.includes(s.play) && s.play !== 'count') s.play = asset.playback.default;
  return s;
}

/** 描くときの再生モード（回数指定は、ループできるならループとして描く） */
function renderPlay(asset, s) {
  if (s.play === 'count') return asset.playback.allowed.includes('loop') ? 'loop' : 'once';
  return s.play;
}

function loopsFor(s) {
  return s.play === 'loop' ? 0 : s.play === 'once' ? 1 : Math.max(1, Math.min(99, Math.round(s.count)));
}

/* ---------- ライブラリ ---------- */

function renderTabs() {
  const cats = [{ id: 'all', name: { ja: t().all, en: t().all, ko: t().all } }, ...app.manifest.categories];
  els.tabs.innerHTML = cats.map(c => `<button type="button" role="tab" data-cat="${c.id}" aria-selected="${c.id === app.category}">${escapeHtml(pick(c.name))}</button>`).join('');
}

function isNew(a) {
  return (Date.now() - Date.parse(a.added)) / 864e5 < NEW_DAYS;
}

function matches(a) {
  if (app.category !== 'all' && a.category !== app.category) return false;
  if (app.filters.has('fav') && !store.favs.includes(a.id)) return false;
  if (app.filters.has('transition') && a.type !== 'transition') return false;
  if (app.filters.has('loop') && !a.playback.allowed.includes('loop')) return false;
  if (app.filters.has('once') && !a.playback.allowed.includes('once')) return false;
  const q = app.query.trim().toLowerCase();
  if (!q) return true;
  const hay = [a.name.ja, a.name.en, a.name.ko, ...(a.tags || [])].join(' ').toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}

const cardObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { cardObserver.unobserve(e.target); drawPoster(e.target); } });
}, { rootMargin: '120px' }) : null;

function renderLibrary() {
  const list = app.manifest.assets.filter(a => a.status !== 'draft' && matches(a));
  els.count.textContent = t().countLabel(list.length);
  if (!list.length) {
    els.grid.innerHTML = `<p class="muted empty">${escapeHtml(t().noResults)}</p>`;
    return;
  }
  els.grid.innerHTML = list.map(a => {
    const fav = store.favs.includes(a.id);
    const badges = [
      a.type === 'transition' ? `<span class="badge badge-transition">${t().badgeTransition}</span>` : (a.playback.default === 'loop' ? `<span class="badge">${t().badgeLoop}</span>` : `<span class="badge">${t().badgeOnce}</span>`),
      a.kind === 'combo' ? `<span class="badge">${t().badgeCombo}</span>` : '',
      isNew(a) ? `<span class="badge badge-new">${t().badgeNew}</span>` : ''
    ].join('');
    return `<article class="asset-card${app.asset && app.asset.id === a.id ? ' is-active' : ''}" data-id="${a.id}" tabindex="0" role="button" aria-pressed="${app.asset && app.asset.id === a.id}">
      <canvas class="asset-thumb" width="320" height="180" data-thumb="${a.id}"></canvas>
      <div class="asset-meta"><span class="asset-name">${escapeHtml(pick(a.name))}</span><span class="asset-badges">${badges}</span></div>
      <button type="button" class="fav-button${fav ? ' is-on' : ''}" data-fav="${a.id}" aria-pressed="${fav}" title="${escapeHtml(fav ? t().unfav : t().fav)}" aria-label="${escapeHtml(fav ? t().unfav : t().fav)}">★</button>
    </article>`;
  }).join('');
  els.grid.querySelectorAll('canvas[data-thumb]').forEach(c => (cardObserver ? cardObserver.observe(c) : drawPoster(c)));
}

// カードの背景（小さな夜景）。どの演出も見やすいように暗めにする
let cardBg = null;
function cardBackground(w, h) {
  if (cardBg && cardBg.width === w) return cardBg;
  cardBg = document.createElement('canvas');
  cardBg.width = w;
  cardBg.height = h;
  const x = cardBg.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a2440');
  g.addColorStop(1, '#3a3550');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#121a30';
  for (let i = 0, px = 0; px < w; i++) {
    const bw = 18 + ((i * 37) % 23), bh = 30 + ((i * 53) % 45);
    x.fillRect(px, h - bh, bw, bh);
    px += bw + 2;
  }
  return cardBg;
}

function posterTime(a) {
  if (a.poster != null) return a.poster;
  if (a.type === 'transition') return 0.55;
  return a.playback.default === 'once' ? 0.25 : 0.3;
}

const posterCache = new Map();
async function drawPoster(canvas, time = null, inst = null) {
  const a = app.byId.get(canvas.dataset.thumb);
  if (!a) return;
  const w = canvas.width, h = canvas.height;
  try {
    let instance = inst;
    if (!instance) {
      const key = a.id;
      if (!posterCache.has(key)) {
        posterCache.set(key, new EffectInstance(a, {}, { w, h, duration: a.duration.default, fps: a.budget.fps, play: a.playback.default, direction: 'out', seed: 1, opacity: 1 }, id => app.byId.get(id)).init());
      }
      instance = await posterCache.get(key);
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(cardBackground(w, h), 0, 0);
    instance.composite(ctx, time ?? posterTime(a));
  } catch (error) {
    console.warn('poster', a.id, error);
  }
}

// マウスを乗せたカードだけ動かす
let hoverAnim = null;
function startHover(card) {
  stopHover();
  const canvas = card.querySelector('canvas[data-thumb]');
  const a = app.byId.get(card.dataset.id);
  if (!canvas || !a) return;
  const started = performance.now();
  const dur = a.duration.default;
  const run = async () => {
    const inst = await posterCacheFor(a, canvas, a.type === 'transition' ? 'inout' : 'out');
    const tick = now => {
      if (hoverAnim !== state) return;
      const sec = (now - started) / 1000;
      const total = a.type === 'transition' ? dur * 2 : dur;
      let tt = (sec % (total + 0.4)) / total;
      if (a.playback.default === 'loop') tt = (sec / dur) % 1;
      drawPoster(canvas, Math.min(1, tt), inst);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const state = { card };
  hoverAnim = state;
  run();
}
const hoverCache = new Map();
function posterCacheFor(a, canvas, direction) {
  const key = `${a.id}:${direction}`;
  if (!hoverCache.has(key)) {
    hoverCache.set(key, new EffectInstance(a, {}, { w: canvas.width, h: canvas.height, duration: a.type === 'transition' ? a.duration.default * 2 : a.duration.default, fps: a.budget.fps, play: a.playback.default, direction, seed: 1, opacity: 1 }, id => app.byId.get(id)).init());
  }
  return hoverCache.get(key);
}
function stopHover() {
  if (!hoverAnim) return;
  const canvas = hoverAnim.card.querySelector('canvas[data-thumb]');
  hoverAnim = null;
  if (canvas) drawPoster(canvas);
}

/* ---------- アセットを選ぶ ---------- */

function selectAsset(id, { scroll = false } = {}) {
  const a = app.byId.get(id);
  if (!a) return;
  app.asset = a;
  store.current = id;
  persist();
  app.output.fps = a.budget.fps;
  app.output.colors = a.budget.colors;
  const idx = SIZES.findIndex(([w, h]) => w === a.budget.size[0] && h === a.budget.size[1]);
  app.output.size = idx >= 0 ? idx : 1;
  els.grid.querySelectorAll('.asset-card').forEach(c => {
    const on = c.dataset.id === id;
    c.classList.toggle('is-active', on);
    c.setAttribute('aria-pressed', String(on));
    if (on && scroll) c.scrollIntoView({ block: 'nearest' });
  });
  els.result.hidden = true;
  app.time = 0;
  renderControls();
  rebuild();
  refreshEstimate();
}

/* ---------- 調整パネル ---------- */

function field(label, inner, extra = '') {
  return `<div class="field ${extra}"><div class="field-label">${label}</div>${inner}</div>`;
}

function seg(name, options, value) {
  return `<div class="seg" role="group" data-seg="${name}">${options.map(([v, label]) => `<button type="button" data-value="${v}" aria-pressed="${String(v) === String(value)}">${escapeHtml(label)}</button>`).join('')}</div>`;
}

function rangeInput(name, min, max, step, value, unit = '') {
  return `<div class="range-row"><input type="range" data-range="${name}" min="${min}" max="${max}" step="${step}" value="${value}" /><output data-out="${name}">${fmt(value, step)}${unit}</output></div>`;
}

function fmt(v, step) {
  const d = step >= 1 ? 0 : String(step).split('.')[1]?.length || 2;
  return Number(v).toFixed(Math.min(2, d));
}

function renderControls() {
  const a = app.asset;
  const m = t();
  if (!a) return;
  const s = settings(a);
  els.currentName.textContent = pick(a.name);
  els.intro.innerHTML = `<h3 class="asset-title">${escapeHtml(pick(a.name))}</h3><p class="hint">${escapeHtml(pick(a.desc))}</p>`;

  // 共通：再生・向き・長さ・不透明度
  const plays = [];
  if (a.playback.allowed.includes('loop')) plays.push(['loop', m.playLoop]);
  if (a.playback.allowed.includes('once')) plays.push(['once', m.playOnce]);
  plays.push(['count', m.playCount]);
  let html = field(m.playback, seg('play', plays, s.play) + (s.play === 'count' ? `<div class="count-row"><input type="number" data-count min="1" max="99" value="${s.count}" /> ${m.playTimes}</div>` : ''));
  if (a.type === 'transition') html += field(m.direction, seg('direction', [['out', m.dirOut], ['in', m.dirIn], ['inout', m.dirInOut]], s.direction));
  const dmax = a.type === 'transition' && s.direction === 'inout' ? a.duration.max * 2 : a.duration.max;
  html += field(m.duration, rangeInput('duration', a.duration.min, dmax, 0.1, s.duration, m.seconds));
  html += field(m.opacity, rangeInput('opacity', 0.1, 1, 0.05, s.opacity));
  html += `<button type="button" class="link-button" id="seedBtn">🎲 ${escapeHtml(m.seed)}</button>`;
  els.common.innerHTML = html;

  // アセット固有の設定（asset.json の params から自動で作る）
  els.params.innerHTML = (a.params || []).map(p => {
    const v = s.params[p.key];
    const label = escapeHtml(pick(p.label));
    if (p.type === 'range') return field(label, rangeInput(`p:${p.key}`, p.min, p.max, p.step, v));
    if (p.type === 'toggle') return `<label class="toggle-inline field"><input type="checkbox" data-param="${p.key}" ${v ? 'checked' : ''} /><span>${label}</span></label>`;
    if (p.type === 'select') {
      if (p.options.length <= 4) return field(label, seg(`p:${p.key}`, p.options.map(o => [o.value, pick(o.label)]), v));
      return field(label, `<select data-param="${p.key}">${p.options.map(o => `<option value="${o.value}" ${o.value === v ? 'selected' : ''}>${escapeHtml(pick(o.label))}</option>`).join('')}</select>`);
    }
    if (p.type === 'color') {
      const sw = (p.swatches || []).map(c => `<button type="button" class="swatch${c.toLowerCase() === String(v).toLowerCase() ? ' is-on' : ''}" data-swatch="${p.key}" data-color="${c}" style="--sw:${c}" aria-label="${c}"></button>`).join('');
      return field(label, `<div class="color-row">${sw}<input type="color" data-param="${p.key}" value="${v}" /></div>`);
    }
    if (p.type === 'point') return field(label, `<div class="point-row"><span class="point-readout">X ${Math.round(v.x * 100)}% · Y ${Math.round(v.y * 100)}%</span><button type="button" class="ghost-button small" data-pick="${p.key}">${escapeHtml(m.pickOnStage)}</button></div>`);
    return '';
  }).join('');

  // 書き出し
  const o = app.output;
  let out = field(m.outSize, seg('size', SIZES.map(([w, h], i) => [i, `${w}×${h}`]), o.size));
  out += field(m.fps, `<select data-out-select="fps">${FPS_LIST.map(f => `<option value="${f}" ${f === o.fps ? 'selected' : ''}>${f} fps</option>`).join('')}</select>`, 'half');
  out += field(m.colors, `<select data-out-select="colors">${COLOR_LIST.map(c => `<option value="${c}" ${c === o.colors ? 'selected' : ''}>${c ? m.colorsN(c) : m.colorsFull}</option>`).join('')}</select>`, 'half');
  out += field(m.bake, `<select data-out-select="bake"><option value="none" ${o.bake === 'none' ? 'selected' : ''}>${escapeHtml(m.bakeNone)}</option><option value="bg" ${o.bake === 'bg' ? 'selected' : ''}>${escapeHtml(m.bakeBg)}</option><option value="all" ${o.bake === 'all' ? 'selected' : ''}>${escapeHtml(m.bakeAll)}</option></select>`);
  els.output.innerHTML = out;
}

function onControlInput(e) {
  const a = app.asset;
  if (!a) return;
  const s = settings(a);
  const el = e.target;
  if (el.dataset.range) {
    const key = el.dataset.range;
    const v = Number(el.value);
    const out = el.parentNode.querySelector('output');
    if (key.startsWith('p:')) {
      const p = a.params.find(q => q.key === key.slice(2));
      s.params[p.key] = v;
      out.textContent = fmt(v, p.step);
    } else {
      s[key] = v;
      out.textContent = fmt(v, 0.1) + (key === 'duration' ? t().seconds : '');
    }
  } else if (el.dataset.param) {
    const p = a.params.find(q => q.key === el.dataset.param);
    s.params[p.key] = p.type === 'toggle' ? el.checked : el.value;
    if (p.type === 'color') el.closest('.color-row').querySelectorAll('.swatch').forEach(b => b.classList.toggle('is-on', b.dataset.color.toLowerCase() === el.value.toLowerCase()));
  } else if (el.dataset.count !== undefined) {
    s.count = Math.max(1, Math.min(99, Number(el.value) || 1));
  } else if (el.dataset.outSelect) {
    const k = el.dataset.outSelect;
    app.output[k] = k === 'bake' ? el.value : Number(el.value);
    refreshEstimate();
    return;
  } else {
    return;
  }
  persist();
  scheduleRebuild();
}

function onControlClick(e) {
  const a = app.asset;
  if (!a) return;
  const s = settings(a);
  const btn = e.target.closest('button');
  if (!btn) return;
  const segEl = btn.closest('[data-seg]');
  if (segEl && btn.dataset.value !== undefined) {
    const name = segEl.dataset.seg;
    const v = btn.dataset.value;
    if (name === 'size') { app.output.size = Number(v); renderControls(); refreshEstimate(); return; }
    if (name.startsWith('p:')) s.params[name.slice(2)] = v;
    else s[name] = v;
    if (name === 'direction' && v === 'inout' && s.duration < a.duration.default * 1.6) s.duration = Math.min(a.duration.max * 2, a.duration.default * 2);
    if (name === 'direction' && v !== 'inout' && s.duration > a.duration.max) s.duration = a.duration.default;
    persist();
    renderControls();
    scheduleRebuild();
    return;
  }
  if (btn.dataset.swatch) {
    s.params[btn.dataset.swatch] = btn.dataset.color;
    persist();
    renderControls();
    scheduleRebuild();
    return;
  }
  if (btn.dataset.pick) {
    const key = btn.dataset.pick;
    toast(t().pickPoint);
    stage.pick(pt => {
      s.params[key] = pt;
      persist();
      renderControls();
      scheduleRebuild();
    });
    return;
  }
  if (btn.id === 'seedBtn') {
    s.seed = 1 + Math.floor(Math.random() * 9999);
    persist();
    scheduleRebuild();
  }
}

/* ---------- プレビュー ---------- */

let rebuildTimer = 0;
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => { rebuild(); refreshEstimate(); }, 60);
}

async function rebuild() {
  const a = app.asset;
  if (!a) return;
  const s = settings(a);
  const token = ++app.buildToken;
  const { w, h } = stage.previewSize;
  const inst = await new EffectInstance(a, s.params, {
    w, h, duration: s.duration, fps: app.output.fps, play: renderPlay(a, s), direction: s.direction, seed: s.seed, opacity: s.opacity
  }, id => app.byId.get(id)).init();
  if (token !== app.buildToken) return;
  app.instance = inst;
  drawPreview();
}

function drawPreview() {
  const inst = app.instance;
  const ctx = stage.fxCtx;
  ctx.clearRect(0, 0, stage.fx.width, stage.fx.height);
  if (!inst) return;
  const s = settings();
  const dur = s.duration;
  const tt = Math.min(1, app.time / dur);
  inst.composite(ctx, tt, 0, 0, stage.fx.width, stage.fx.height);
  els.scrub.value = String(Math.round(tt * 1000));
  els.time.textContent = `${Math.min(app.time, dur).toFixed(1)} / ${dur.toFixed(1)}${t().seconds}`;
}

function tick(now) {
  const dt = app.lastTick ? (now - app.lastTick) / 1000 : 0;
  app.lastTick = now;
  if (app.playing && app.instance && !app.exporting) {
    const s = settings();
    const once = renderPlay(app.asset, s) === 'once';
    app.time += dt;
    if (app.time >= s.duration) {
      if (!once) app.time %= s.duration;
      else if (els.loopPreview.checked) {
        if (!app.holdUntil) app.holdUntil = now + 900;
        app.time = s.duration;
        if (now >= app.holdUntil) { app.time = 0; app.holdUntil = 0; }
      } else {
        app.time = s.duration;
      }
    }
    drawPreview();
  }
  requestAnimationFrame(tick);
}

function setPlaying(on) {
  app.playing = on;
  els.play.textContent = on ? '❚❚' : '▶';
  els.play.setAttribute('aria-label', on ? t().pause : t().play);
}

/* ---------- 容量の目安 ---------- */

let estimateTimer = 0;
function refreshEstimate() {
  clearTimeout(estimateTimer);
  els.estimateValue.textContent = t().estimating;
  estimateTimer = setTimeout(runEstimate, 450);
}

async function runEstimate() {
  const a = app.asset;
  if (!a || !C || !C.isCompressionSupported()) return;
  const token = ++app.estimateToken;
  const s = settings(a);
  const [w, h] = SIZES[app.output.size];
  const play = renderPlay(a, s);
  const times = frameTimes(s.duration, app.output.fps, play);
  const n = times.length;
  const k = Math.min(n, 10);
  // 1回再生のものは、動きの多い真ん中あたりを調べる
  const start = play === 'once' ? Math.max(0, Math.floor(n / 2 - k / 2)) : 0;
  try {
    const frameAt = await frameRenderer(a, s, w, h);
    const pixels = [];
    for (let i = start; i < start + k; i++) pixels.push(frameAt(times[i]));
    if (token !== app.estimateToken) return;
    let quantizer = null;
    if (app.output.colors) {
      quantizer = new C.PaletteQuantizer(app.output.colors);
      const an = new C.FrameAnalyzer(w, h, { quantizer });
      pixels.forEach(p => an.add(p));
      quantizer.build();
    }
    const enc = new C.ApngEncoder({ width: w, height: h, fps: app.output.fps, loops: 0, quantizer });
    for (const p of pixels) {
      await enc.addFrame(p);
      if (token !== app.estimateToken) return;
    }
    const sizes = enc.frames.map(f => f.data.length);
    const first = sizes[0] || 0;
    const rest = sizes.slice(1);
    const stored = enc.frames.length / k;
    const avg = rest.length ? rest.reduce((x, y) => x + y, 0) / rest.length : first * 0.3;
    // 最初のコマ（全面）＋ 差分のコマ × 残り。ずっと止まっている部分は自動で結合されるので、その割合もかける
    const bytes = first + avg * Math.max(0, n - 1) * Math.max(0.15, stored) + n * 60 + 1024;
    showBudget(bytes, n, true);
  } catch (error) {
    console.warn('estimate', error);
    els.estimateValue.textContent = '—';
  }
}

function showBudget(bytes, frames, estimate) {
  const m = t();
  const mbText = (bytes / MB).toFixed(bytes < MB ? 2 : 1);
  if (estimate) els.estimateValue.textContent = m.estimateLabel(mbText, frames);
  const pct = Math.min(100, bytes / BUDGET_MAX * 100);
  els.budgetFill.style.width = `${pct}%`;
  const level = bytes < BUDGET_OK ? 'ok' : bytes <= BUDGET_MAX ? 'warn' : 'block';
  els.budgetFill.dataset.level = level;
  els.budgetNote.textContent = level === 'ok' ? m.budgetOk : level === 'warn' ? m.budgetWarn : m.budgetBlock;
  els.budgetNote.dataset.level = level;
  els.lighten.hidden = level === 'ok';
  return level;
}

function lighterStep() {
  const o = app.output;
  const ci = COLOR_LIST.indexOf(o.colors);
  if (ci >= 0 && ci < COLOR_LIST.indexOf(64)) return { apply: () => { o.colors = COLOR_LIST[ci + 1]; }, label: t().colorsN(COLOR_LIST[ci + 1]) };
  const fi = FPS_LIST.indexOf(o.fps);
  if (fi >= 0 && FPS_LIST[fi + 1] >= 12) return { apply: () => { o.fps = FPS_LIST[fi + 1]; }, label: `${FPS_LIST[fi + 1]} fps` };
  if (o.size < SIZES.length - 1) return { apply: () => { o.size += 1; }, label: SIZES[o.size + 1].join('×') };
  if (o.colors === 64) return { apply: () => { o.colors = 32; }, label: t().colorsN(32) };
  if (fi >= 0 && FPS_LIST[fi + 1]) return { apply: () => { o.fps = FPS_LIST[fi + 1]; }, label: `${FPS_LIST[fi + 1]} fps` };
  return null;
}

/* ---------- 書き出し ---------- */

/** 書き出しの1コマを RGBA で返す関数を作る（背景の焼き込みもここで） */
async function frameRenderer(a, s, w, h, out = app.output) {
  const inst = await new EffectInstance(a, s.params, {
    w, h, duration: s.duration, fps: out.fps, play: renderPlay(a, s), direction: s.direction, seed: s.seed, opacity: s.opacity
  }, id => app.byId.get(id)).init();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const bake = out.bake;
  return time => {
    ctx.clearRect(0, 0, w, h);
    if (bake !== 'none') stage.drawBackground(ctx, w, h);
    if (bake === 'all') stage.drawChars(ctx, w, h, false);
    inst.composite(ctx, time);
    if (bake === 'all') stage.drawChars(ctx, w, h, true);
    return ctx.getImageData(0, 0, w, h).data;
  };
}

const yieldToUi = () => new Promise(r => setTimeout(r, 0));

async function exportFile(format) {
  const a = app.asset;
  if (!a || app.exporting) return;
  const m = t();
  const webp = format === 'webp';
  if (!C || !C.isCompressionSupported()) { toast(m.unsupported, 'error'); return; }
  if (webp && !(C.isWebpSupported && C.isWebpSupported())) { toast(m.webpUnsupported, 'error'); return; }
  // 書き出し中に設定が変わっても混ざらないよう、始めた時点の設定を写しておく
  const s = structuredClone(settings(a));
  const out = { ...app.output };
  const [w, h] = SIZES[out.size];
  const play = renderPlay(a, s);
  const times = frameTimes(s.duration, out.fps, play);
  const n = times.length;
  const job = { cancelled: false };
  app.exporting = job;
  setBusy(true);
  try {
    const frameAt = await frameRenderer(a, s, w, h, out);
    const usePalette = !webp && out.colors > 0;
    let quantizer = null;
    const share = usePalette ? 0.4 : 0;
    if (usePalette) {
      quantizer = new C.PaletteQuantizer(out.colors);
      const an = new C.FrameAnalyzer(w, h, { quantizer });
      for (let i = 0; i < n; i++) {
        if (job.cancelled) throw Object.assign(new Error('cancel'), { code: 'CANCELLED' });
        an.add(frameAt(times[i]));
        if (i % 3 === 0) { setProgress((i + 1) / n * share, m.analyzing(i + 1, n)); await yieldToUi(); }
      }
      quantizer.build();
    }
    const loops = loopsFor(s);
    const enc = webp
      ? new C.WebpEncoder({ width: w, height: h, fps: out.fps, loops, quality: WEBP_QUALITY })
      : new C.ApngEncoder({ width: w, height: h, fps: out.fps, loops, quantizer });
    for (let i = 0; i < n; i++) {
      if (job.cancelled) throw Object.assign(new Error('cancel'), { code: 'CANCELLED' });
      await enc.addFrame(frameAt(times[i]));
      if (i % 2 === 0 || i === n - 1) { setProgress(share + (i + 1) / n * (1 - share), m.exporting(i + 1, n)); await yieldToUi(); }
    }
    const blob = await enc.finish();
    showResult(blob, a, s, w, h, n, loops, webp, out);
    toast(m.done, 'success');
    track(webp ? 'export_webp' : 'export_apng', { asset_id: a.id, size_kb: Math.round(blob.size / 1024), frames: n, fps: out.fps, colors: out.colors, bake: out.bake });
  } catch (error) {
    if (error && error.code === 'CANCELLED') toast(m.cancelled);
    else { console.error(error); toast(m.failed, 'error'); }
  } finally {
    app.exporting = null;
    setBusy(false);
  }
}

function fileName(a, s, webp, out = app.output) {
  const parts = [pick(a.name).replace(/[\\/:*?"<>|\s]+/g, '_')];
  if (a.type === 'transition') parts.push(s.direction);
  if (s.play === 'loop') parts.push(t().fileSuffixLoop.replace(/^_/, ''));
  if (s.play === 'count') parts.push(`x${loopsFor(s)}`);
  if (out.bake !== 'none') parts.push('bg');
  return `${parts.join('_')}.${webp ? 'webp' : 'png'}`;
}

function showResult(blob, a, s, w, h, n, loops, webp, out) {
  const m = t();
  if (app.resultUrl) URL.revokeObjectURL(app.resultUrl);
  app.resultUrl = URL.createObjectURL(blob);
  els.result.hidden = false;
  els.resultImg.src = app.resultUrl;
  const sizeText = blob.size < MB ? `${Math.round(blob.size / 1024)} KB` : `${(blob.size / MB).toFixed(2)} MB`;
  const loopText = loops === 0 ? m.loopsForever : loops === 1 ? m.loopsOnce : m.loopsN(loops);
  els.resultMeta.textContent = m.resultMeta(sizeText, w, h, n, loopText);
  const level = showBudget(blob.size, n, false);
  els.estimateValue.textContent = sizeText;
  els.resultBudget.textContent = level === 'ok' ? m.budgetOk : level === 'warn' ? m.budgetWarn : m.downloadBlocked;
  els.resultBudget.dataset.level = level;
  if (level === 'block') {
    els.download.removeAttribute('href');
    els.download.setAttribute('aria-disabled', 'true');
  } else {
    els.download.href = app.resultUrl;
    els.download.download = fileName(a, s, webp, out);
    els.download.removeAttribute('aria-disabled');
  }
  const use = a.type === 'transition' ? 'transition' : (a.use || []).includes('foreground') ? 'foreground' : 'overlay';
  els.ccfoliaTip.textContent = m.ccfoliaTip[use];
  els.result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setBusy(on) {
  els.progress.hidden = !on;
  els.exportApng.disabled = on;
  els.exportWebp.disabled = on;
  if (!on) setProgress(0, '');
}

function setProgress(f, text) {
  els.progressFill.style.width = `${Math.round(f * 100)}%`;
  els.progressText.textContent = text;
}

/* ---------- 立ち絵の一覧 ---------- */

function renderChars() {
  els.charList.innerHTML = stage.chars.map((c, i) => `<button type="button" class="char-chip${c.id === stage.selected ? ' is-on' : ''}" data-char="${c.id}"><img src="${c.img.src}" alt="" /><span>${i + 1}</span></button>`).join('');
  const c = stage.chars.find(v => v.id === stage.selected);
  els.charEdit.hidden = !c;
  if (c) {
    els.charSize.value = c.size;
    els.charFlip.checked = c.flip;
    els.charFront.checked = c.front;
  }
}

function markBg() {
  els.bgChoices.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bg === stage.bg.kind)));
}

/* ---------- 小物 ---------- */

let toastTimer = 0;
function toast(text, kind = 'info') {
  els.toast.textContent = text;
  els.toast.dataset.kind = kind;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, kind === 'error' ? 6000 : 3000);
}

function track(name, params) {
  try { if (window.gtag) window.gtag('event', name, { tool_id: 'effect_apng_maker', ...params }); } catch (e) { /* 計測できなくても動かす */ }
}

async function copyCredit() {
  try {
    await navigator.clipboard.writeText(t().rules.credit);
    toast(t().copied, 'success');
  } catch (e) {
    toast(t().copyFailed, 'error');
  }
}

/* ---------- 起動 ---------- */

const stage = new Stage(els.stage, {
  onChange(kind) {
    if (kind === 'resize') rebuild();
    if (kind === 'select' || kind === 'chars') renderChars();
    if (kind === 'chars' && app.output.bake !== 'none') refreshEstimate();
  }
});

function bind() {
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    store.lang = lang;
    persist();
    applyLanguage();
  }));
  $('#themeBtn').addEventListener('click', () => {
    store.theme = store.theme === 'light' ? 'dark' : 'light';
    persist();
    applyTheme();
  });
  [['#helpBtn', '#helpDrawer'], ['#rulesBtn', '#rulesDrawer']].forEach(([b, d]) => {
    $(b).addEventListener('click', () => {
      const drawer = $(d);
      const open = drawer.hidden;
      document.querySelectorAll('.drawer').forEach(x => { x.hidden = true; });
      document.querySelectorAll('#helpBtn, #rulesBtn').forEach(x => x.setAttribute('aria-expanded', 'false'));
      drawer.hidden = !open;
      $(b).setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-drawer]')) {
      e.target.closest('.drawer').hidden = true;
      document.querySelectorAll('#helpBtn, #rulesBtn').forEach(x => x.setAttribute('aria-expanded', 'false'));
    }
    if (e.target.closest('[data-copy-credit]')) copyCredit();
  });

  // ライブラリ
  els.tabs.addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    app.category = b.dataset.cat;
    renderTabs();
    renderLibrary();
  });
  els.search.addEventListener('input', () => { app.query = els.search.value; renderLibrary(); });
  els.chips.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    const f = b.dataset.filter;
    if (app.filters.has(f)) app.filters.delete(f);
    else {
      app.filters.add(f);
      if (f === 'loop') app.filters.delete('once');
      if (f === 'once') app.filters.delete('loop');
    }
    els.chips.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(app.filters.has(x.dataset.filter))));
    renderLibrary();
  });
  els.grid.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const id = fav.dataset.fav;
      store.favs = store.favs.includes(id) ? store.favs.filter(x => x !== id) : [...store.favs, id];
      persist();
      renderLibrary();
      return;
    }
    const card = e.target.closest('.asset-card');
    if (card) {
      selectAsset(card.dataset.id);
      if (window.matchMedia('(max-width: 760px)').matches) setMobileTab('controls');
    }
  });
  els.grid.addEventListener('keydown', e => {
    const card = e.target.closest('.asset-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectAsset(card.dataset.id); }
  });
  els.grid.addEventListener('pointerover', e => {
    const card = e.target.closest('.asset-card');
    if (card && (!hoverAnim || hoverAnim.card !== card)) startHover(card);
  });
  els.grid.addEventListener('pointerleave', stopHover);

  // 調整
  const panel = $('.controls-panel');
  panel.addEventListener('input', onControlInput);
  panel.addEventListener('change', e => { if (e.target.dataset.range) refreshEstimate(); else onControlInput(e); });
  panel.addEventListener('click', onControlClick);
  $('#resetParamsBtn').addEventListener('click', () => {
    if (!app.asset) return;
    delete store.perAsset[app.asset.id];
    persist();
    selectAsset(app.asset.id);
  });
  els.lighten.addEventListener('click', () => {
    const step = lighterStep();
    if (!step) { toast(t().lightenNone, 'warning'); return; }
    step.apply();
    toast(t().lightenDone(step.label));
    renderControls();
    rebuild();
    refreshEstimate();
  });
  els.exportApng.addEventListener('click', () => exportFile('apng'));
  els.exportWebp.addEventListener('click', () => exportFile('webp'));
  els.cancel.addEventListener('click', () => { if (app.exporting) app.exporting.cancelled = true; });
  els.download.addEventListener('click', e => { if (els.download.getAttribute('aria-disabled') === 'true') e.preventDefault(); });

  // 再生
  els.play.addEventListener('click', () => setPlaying(!app.playing));
  els.scrub.addEventListener('input', () => {
    setPlaying(false);
    app.time = Number(els.scrub.value) / 1000 * settings().duration;
    drawPreview();
  });

  // 背景・立ち絵
  els.bgChoices.addEventListener('click', async e => {
    const b = e.target.closest('[data-bg]');
    if (!b) return;
    if (b.dataset.bg === 'upload') { els.bgFile.click(); return; }
    await stage.setBackground(b.dataset.bg);
    markBg();
    if (app.output.bake !== 'none') refreshEstimate();
  });
  els.bgFile.addEventListener('change', async () => {
    const f = els.bgFile.files[0];
    if (f) { await stage.setBackground('upload', f); markBg(); }
    els.bgFile.value = '';
  });
  els.charAdd.addEventListener('click', () => els.charFile.click());
  els.charFile.addEventListener('change', async () => {
    for (const f of els.charFile.files) await stage.addChar(f);
    els.charFile.value = '';
    renderChars();
  });
  els.charList.addEventListener('click', e => {
    const b = e.target.closest('[data-char]');
    if (b) stage.select(Number(b.dataset.char));
  });
  els.charSize.addEventListener('input', () => stage.updateChar(stage.selected, { size: Number(els.charSize.value) }));
  els.charFlip.addEventListener('change', () => stage.updateChar(stage.selected, { flip: els.charFlip.checked }));
  els.charFront.addEventListener('change', () => stage.updateChar(stage.selected, { front: els.charFront.checked }));
  els.charRemove.addEventListener('click', () => stage.removeChar(stage.selected));
  let clearArmed = 0;
  els.clearStage.addEventListener('click', async () => {
    if (Date.now() - clearArmed > 3000) { clearArmed = Date.now(); toast(t().clearStageConfirm, 'warning'); return; }
    clearArmed = 0;
    await stage.clear();
    markBg();
    toast(t().stageCleared);
  });
  // 画像のドロップ：横長は背景、それ以外（または2枚目以降）は立ち絵
  els.stage.addEventListener('dragover', e => { e.preventDefault(); els.stage.classList.add('is-dropping'); });
  els.stage.addEventListener('dragleave', () => els.stage.classList.remove('is-dropping'));
  els.stage.addEventListener('drop', async e => {
    e.preventDefault();
    els.stage.classList.remove('is-dropping');
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
    for (const f of files) {
      const bmp = await createImageBitmap(f).catch(() => null);
      const wide = bmp && bmp.width / bmp.height > 1.3;
      if (bmp) bmp.close();
      if (wide && f.type !== 'image/png') await stage.setBackground('upload', f);
      else if (wide && files.length === 1) await stage.setBackground('upload', f);
      else await stage.addChar(f);
    }
    markBg();
    renderChars();
  });

  // スマートフォン：パネル切り替え
  document.querySelectorAll('[data-mobile-tab]').forEach(b => b.addEventListener('click', () => setMobileTab(b.dataset.mobileTab)));
}

function setMobileTab(name) {
  els.grid2.dataset.mobile = name;
  document.querySelectorAll('[data-mobile-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mobileTab === name)));
}

async function boot() {
  bind();
  applyLanguage();
  setPlaying(true);
  await stage.restore();
  markBg();
  renderChars();
  try {
    app.manifest = await loadManifest();
  } catch (error) {
    console.error(error);
    els.grid.innerHTML = `<p class="muted">${escapeHtml(t().loadFailed)}</p>`;
    return;
  }
  app.manifest.assets.forEach(a => app.byId.set(a.id, a));
  renderTabs();
  renderLibrary();
  const first = app.byId.has(store.current) ? store.current : app.manifest.assets[0].id;
  selectAsset(first, { scroll: true });
  requestAnimationFrame(tick);
  // 自動テスト用の入口（画面の操作と同じ経路で書き出す）
  window.__effectApngMaker = { app, stage, selectAsset, exportFile, settings, frameRenderer, drawPreview, rebuild, SIZES };
}

boot();
