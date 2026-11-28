/*
 * カットイン作成スタジオ — 画面のつなぎこみ
 *   型（左上）を選び、調整（左下）で文字・色・書体・速さを変え、プレビュー（右）で立ち絵を動かして書き出す。
 *   設定はこのブラウザの localStorage、立ち絵は IndexedDB にだけ保存する。
 */
import { TEMPLATES, byId, render, preparePortrait, placeholderPortrait, fontFamily, DURATION, HOLD_END, W, H } from './templates.js?v=20261128-01';
import { loadImageFile, hasTransparency, looksWhiteBackground, removeWhiteBackground, estimateFace, savePortrait, loadPortrait, deletePortrait, canvasToBlob } from './portrait.js?v=20261128-01';

const C = window.TextApngCodec;
const STORE_KEY = 'cutinStudio.settings';
const SIZES = [[1280, 720], [960, 540], [640, 360]];
const FPS_LIST = [30, 24, 20, 15, 12, 10];
const COLOR_LIST = [0, 256, 128, 64];
const MB = 1024 * 1024;
const BUDGET_OK = 3 * MB;     // 3MB 前後を基本
const BUDGET_MAX = 5 * MB;    // 5MB を超えるとダウンロードできない
const WEBP_QUALITY = 0.9;
const CREDIT = 'カットイン作成スタジオ / くま。TRPG WEBツール観測所';

const NAMES = { slash: '斜めスラッシュ', pass: '横ながし', eyes: 'まなざし', intro: 'キャラ紹介', stylish: 'スタイリッシュ', versus: '対決', tate: 'たてながし' };
const DESCS = {
  slash: '斜めの帯が割り込み、帯の中で立ち絵が流れます。大きな文字は叩きつけて画面が揺れます。',
  pass: '帯が上下に開き、立ち絵は止まらずに横切ります。名前と番号は逆向きに流れます。',
  eyes: '細い帯に目元だけを大きく映します。ひとことを下に添えます。',
  intro: '色の帯と立ち絵が下からせり上がり、名札の帯・小見出し・英字が順に出ます。',
  stylish: '赤と黒の斜め分割と網点。白い縁取りの立ち絵と、1字ずつ飛び込む大きな文字。',
  versus: '左右の面がぶつかり、「VS」を叩きつけます。相手は「？？？」のシルエットです。',
  tate: 'ななめに立てた細い帯が上下から走り込みます。大きな文字と名前は縦書きです。'
};
const FIELD_LABELS = { main: '大きな文字', name: '名前', sub: '小見出し（番号など）', line: 'ひとこと', en: '英字', name2: '相手の名前' };
const FONT_OPTIONS = [['gothic', 'ゴシック'], ['bold', '太ゴシック'], ['heavy', '極太'], ['mincho', '明朝'], ['maru', '丸ゴシック'], ['brush', '筆文字'], ['local', 'PCのフォント']];
const SWATCHES = ['#e0303a', '#d7141e', '#ff7a1a', '#f2b632', '#2fa86a', '#1fa3b8', '#3a7bd5', '#6a4fd0', '#d04f9a', '#5a5f6e'];

const $ = sel => document.querySelector(sel);
const els = {
  grid: $('#tplGrid'), textControls: $('#textControls'), styleControls: $('#styleControls'), currentName: $('#currentTplName'),
  stage: $('#stage'), canvas: $('#stageCanvas'), play: $('#playBtn'), scrub: $('#scrubber'), time: $('#timeReadout'),
  output: $('#outputControls'), estimateValue: $('#estimateValue'), budgetFill: $('#budgetFill'), budgetNote: $('#budgetNote'), lighten: $('#lightenBtn'),
  exportApng: $('#exportApngBtn'), exportWebp: $('#exportWebpBtn'), progress: $('#progress'), progressFill: $('#progressFill'), progressText: $('#progressText'), cancel: $('#cancelBtn'),
  result: $('#result'), resultImg: $('#resultImg'), resultMeta: $('#resultMeta'), resultBudget: $('#resultBudget'), download: $('#downloadLink'),
  bgChoices: $('#bgChoices'), portraitBtn: $('#portraitBtn'), portraitFile: $('#portraitFile'), portraitName: $('#portraitName'), portraitRemove: $('#portraitRemove'),
  faceCanvas: $('#faceCanvas'), faceSize: $('#faceSize'), zoom: $('#portraitZoom'), flip: $('#portraitFlip'), removeWhite: $('#removeWhite'),
  faceAuto: $('#faceAuto'), placeReset: $('#placeReset'), toast: $('#toast'), grid2: $('#studioGrid')
};

/* ---------- 保存（このブラウザの localStorage だけ） ---------- */

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
const store = Object.assign({ theme: null, current: 'slash', perTpl: {}, output: { size: 1, fps: 15, colors: 256, loop: 'forever' }, bg: 'room', place: { dx: 0, dy: 0, zoom: 1, flip: false } }, loadStore());
if (!byId[store.current]) store.current = 'slash';
let persistTimer = 0;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 保存できなくても動く */ } }, 200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- 型ごとの設定 ---------- */

function defaults(tpl) {
  return {
    texts: { ...tpl.texts },
    color: tpl.color, color2: tpl.color2 || '#3b2a6e',
    fontMain: tpl.fonts.main || 'heavy', fontName: tpl.fonts.name || 'gothic', localFont: '',
    speed: 1, exit: true, flash: 1
  };
}
function settings(tpl = app.tpl) {
  const d = defaults(tpl);
  const s = store.perTpl[tpl.id] = Object.assign(d, store.perTpl[tpl.id] || {});
  s.texts = Object.assign({ ...tpl.texts }, s.texts);
  return s;
}
// 描画に渡す opts
function optsFor(tpl, s) {
  return {
    ...s.texts,
    color: s.color, color2: s.color2,
    fontMain: fontFamily(s.fontMain, s.localFont), fontName: fontFamily(s.fontName, s.localFont),
    fontUi: fontFamily('gothic'), fontEn: '"Anton", "Arial Narrow", sans-serif',
    nameSpacing: tpl.nameSpacing, flash: s.flash
  };
}
function durationOf(s) { return (s.exit ? DURATION : HOLD_END) / s.speed; }
// 表示上の秒 → 描画の秒（速さ1倍のとき）
function modelTime(time, s) { return Math.min(time * s.speed, s.exit ? DURATION : HOLD_END); }

/* ---------- 状態 ---------- */

const app = {
  tpl: byId[store.current],
  portrait: null,     // preparePortrait() の結果
  raw: null,          // 読み込んだままの画像（白い背景を消す前）
  autoFace: null,
  playing: true, time: 0, lastTick: 0,
  exporting: null, estimateToken: 0, resultUrl: null,
  hover: null
};
const placeholder = placeholderPortrait();
function currentPortrait() {
  const p = app.portrait || placeholder;
  Object.assign(p, store.place);
  return p;
}

/* ---------- テーマ ---------- */

function applyTheme() {
  const dark = store.theme ? store.theme === 'dark' : Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('is-dark', dark);
  $('#themeBtn').setAttribute('aria-pressed', String(dark));
  $('#themeBtn').title = dark ? 'ライトモードにする' : 'ダークモードにする';
  $('#themeBtn').setAttribute('aria-label', $('#themeBtn').title);
}

/* ---------- 書体の読み込み ---------- */

const fontReady = new Map();
function ensureFonts(s) {
  const fams = [fontFamily(s.fontMain, s.localFont), fontFamily(s.fontName, s.localFont), fontFamily('gothic'), '"Anton"'];
  const text = Object.values(s.texts).join('') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?';
  return Promise.all(fams.map(f => {
    const key = f + '|' + text;
    if (!fontReady.has(key)) fontReady.set(key, document.fonts.load(`40px ${f}`, text).catch(() => null));
    return fontReady.get(key);
  }));
}

/* ---------- 型の一覧 ---------- */

function renderGrid() {
  els.grid.innerHTML = TEMPLATES.map(t => `<button type="button" class="asset-card tpl-card${t.id === app.tpl.id ? ' is-active' : ''}" data-tpl="${t.id}" aria-pressed="${t.id === app.tpl.id}">
    <span class="asset-thumb-wrap"><canvas class="asset-thumb" width="320" height="180" data-thumb="${t.id}"></canvas></span>
    <span class="asset-meta"><span class="asset-name">${escapeHtml(NAMES[t.id])}</span></span></button>`).join('');
  drawThumbs();
}
function thumbBg(g, w, h) {
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#3b4252'); gr.addColorStop(1, '#1c2029');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
function drawThumb(canvas, t) {
  const tpl = byId[canvas.dataset.thumb], s = settings(tpl), g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
  thumbBg(g, canvas.width, canvas.height);
  render(g, canvas.width, canvas.height, tpl, t, optsFor(tpl, s), currentPortrait());
}
function drawThumbs() {
  els.grid.querySelectorAll('[data-thumb]').forEach(c => drawThumb(c, 1.2));
}
function startHover(card) {
  stopHover();
  const canvas = card.querySelector('[data-thumb]');
  const tpl = byId[canvas.dataset.thumb];
  const start = performance.now();
  const loop = now => {
    if (!app.hover || app.hover.canvas !== canvas) return;
    const s = settings(tpl);
    const time = ((now - start) / 1000) % (durationOf(s) + 0.3);
    drawThumb(canvas, modelTime(time, s));
    app.hover.raf = requestAnimationFrame(loop);
  };
  app.hover = { canvas, raf: requestAnimationFrame(loop) };
}
function stopHover() {
  if (!app.hover) return;
  cancelAnimationFrame(app.hover.raf);
  drawThumb(app.hover.canvas, 1.2);
  app.hover = null;
}
function selectTpl(id) {
  app.tpl = byId[id];
  store.current = id;
  persist();
  els.grid.querySelectorAll('[data-tpl]').forEach(b => { const on = b.dataset.tpl === id; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
  app.time = 0;
  renderControls();
  ensureFonts(settings()).then(() => { drawPreview(); drawThumbs(); });
  refreshEstimate();
}

/* ---------- 調整 ---------- */

function field(label, inner, extra = '') {
  return `<div class="field ${extra}"><div class="field-label">${label}</div>${inner}</div>`;
}
function seg(name, options, value) {
  return `<div class="seg" role="group" data-seg="${name}">${options.map(([v, label]) => `<button type="button" data-value="${v}" aria-pressed="${String(v) === String(value)}">${escapeHtml(label)}</button>`).join('')}</div>`;
}
function fontSelect(name, value) {
  return `<select data-font="${name}">${FONT_OPTIONS.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
}
function colorRow(name, value) {
  const sw = SWATCHES.map(c => `<button type="button" class="swatch${c.toLowerCase() === String(value).toLowerCase() ? ' is-on' : ''}" data-swatch="${name}" data-color="${c}" style="--sw:${c}" aria-label="${c}"></button>`).join('');
  return `<div class="color-row">${sw}<input type="color" data-color-input="${name}" value="${value}" aria-label="色を選ぶ" /></div>`;
}

function renderControls() {
  const tpl = app.tpl, s = settings(tpl);
  els.currentName.textContent = NAMES[tpl.id];
  els.textControls.innerHTML = `<h3 class="asset-title">${escapeHtml(NAMES[tpl.id])}</h3><p class="hint">${escapeHtml(DESCS[tpl.id])}</p>`
    + tpl.fields.map(k => field(FIELD_LABELS[k], `<input type="text" class="text-input" data-text="${k}" value="${escapeHtml(s.texts[k] ?? '')}" maxlength="${k === 'line' ? 40 : 24}" />`)).join('');
  let html = field('イメージカラー', colorRow('color', s.color));
  if (tpl.id === 'versus') html += field('相手の色', colorRow('color2', s.color2));
  if (tpl.fields.includes('main')) html += field('大きな文字の書体', fontSelect('fontMain', s.fontMain), 'half');
  html += field(tpl.id === 'eyes' ? 'ひとことの書体' : '名前の書体', fontSelect('fontName', s.fontName), 'half');
  if (s.fontMain === 'local' || s.fontName === 'local') html += field('PCのフォント名', `<input type="text" class="text-input" data-local-font value="${escapeHtml(s.localFont)}" placeholder="例：游明朝、Hiragino Mincho ProN" />`);
  html += field('速さ', `<div class="range-row"><input type="range" data-speed min="0.5" max="2" step="0.05" value="${s.speed}" /><output data-speed-out>${s.speed.toFixed(2)}倍</output></div>`);
  html += field('フラッシュ', `<select data-flash>${[[1.4, '強め'], [1, 'ふつう'], [0.5, '弱め'], [0, 'なし']].map(([v, l]) => `<option value="${v}" ${v === s.flash ? 'selected' : ''}>${l}</option>`).join('')}</select>`, 'half');
  html += `<label class="toggle-inline field"><input type="checkbox" class="switch" data-exit ${s.exit ? 'checked' : ''} /><span>退場あり（オフにすると決めの形で止まります）</span></label>`;
  els.styleControls.innerHTML = html;
  renderOutput();
}

function renderOutput() {
  const o = store.output;
  let out = field('大きさ', seg('size', SIZES.map(([w, h], i) => [i, `${w}×${h}`]), o.size));
  out += field('なめらかさ', `<select data-out-select="fps">${FPS_LIST.map(f => `<option value="${f}" ${f === o.fps ? 'selected' : ''}>${f} fps</option>`).join('')}</select>`, 'half');
  out += field('色数', `<select data-out-select="colors">${COLOR_LIST.map(c => `<option value="${c}" ${c === o.colors ? 'selected' : ''}>${c ? `${c}色` : 'フルカラー'}</option>`).join('')}</select>`, 'half');
  out += field('再生', seg('loop', [['forever', 'ずっとループ'], ['once', '1回再生']], o.loop));
  els.output.innerHTML = out;
}

function onControlInput(e) {
  const el = e.target, s = settings();
  if (el.dataset.text) { s.texts[el.dataset.text] = el.value; ensureFonts(s).then(redrawAll); }
  else if (el.dataset.colorInput) { s[el.dataset.colorInput] = el.value; markSwatches(el.dataset.colorInput, el.value); }
  else if (el.dataset.font) { s[el.dataset.font] = el.value; renderControls(); ensureFonts(s).then(redrawAll); }
  else if ('localFont' in el.dataset) { s.localFont = el.value; ensureFonts(s).then(redrawAll); }
  else if ('speed' in el.dataset) { s.speed = Number(el.value); els.styleControls.querySelector('[data-speed-out]').textContent = `${s.speed.toFixed(2)}倍`; }
  else if ('flash' in el.dataset) { s.flash = Number(el.value); }
  else if ('exit' in el.dataset) { s.exit = el.checked; app.time = 0; }
  else if (el.dataset.outSelect) { store.output[el.dataset.outSelect] = Number(el.value); }
  else return;
  persist();
  redrawAll();
  refreshEstimate();
}
function markSwatches(name, value) {
  document.querySelectorAll(`[data-swatch="${name}"]`).forEach(b => b.classList.toggle('is-on', b.dataset.color.toLowerCase() === value.toLowerCase()));
}
function onControlClick(e) {
  const sw = e.target.closest('[data-swatch]');
  if (sw) {
    const s = settings();
    s[sw.dataset.swatch] = sw.dataset.color;
    const input = document.querySelector(`[data-color-input="${sw.dataset.swatch}"]`);
    if (input) input.value = sw.dataset.color;
    markSwatches(sw.dataset.swatch, sw.dataset.color);
    persist(); redrawAll(); refreshEstimate();
    return;
  }
  const b = e.target.closest('[data-seg] button');
  if (b) {
    const name = b.closest('[data-seg]').dataset.seg;
    const v = b.dataset.value;
    if (name === 'size') store.output.size = Number(v);
    else if (name === 'loop') store.output.loop = v;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    persist();
    refreshEstimate();
  }
}

let redrawQueued = false;
function redrawAll() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    if (!app.playing) drawPreview();
    const card = els.grid.querySelector(`[data-thumb="${app.tpl.id}"]`);
    if (card && !(app.hover && app.hover.canvas === card)) drawThumb(card, 1.2);
  });
}

/* ---------- プレビュー ---------- */

const stageCtx = els.canvas.getContext('2d');
function drawRoom(g) {
  // 確認用の部屋：暗い洋室の壁と床（ココフォリアの部屋に置いたときの見え方の目安）
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#3a3440'); gr.addColorStop(0.68, '#2a2530'); gr.addColorStop(0.68, '#4a3a30'); gr.addColorStop(1, '#2c221c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.04)';
  for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 2, H * 0.68);
  g.fillStyle = '#211b26'; g.fillRect(120, 90, 200, 150); g.fillStyle = '#5a6f8e'; g.fillRect(130, 100, 180, 130);
  g.fillStyle = '#2f3a4e'; g.fillRect(130, 160, 180, 70);
  const lamp = g.createRadialGradient(760, 120, 10, 760, 120, 260);
  lamp.addColorStop(0, 'rgba(255,210,150,.35)'); lamp.addColorStop(1, 'rgba(255,210,150,0)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);
}
function drawPreview() {
  const g = stageCtx, s = settings();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  if (store.bg === 'room') drawRoom(g);
  else if (store.bg === 'dark') { g.fillStyle = '#23262e'; g.fillRect(0, 0, W, H); }
  render(g, W, H, app.tpl, modelTime(app.time, s), optsFor(app.tpl, s), currentPortrait());
  const d = durationOf(s);
  els.scrub.value = String(Math.round(Math.min(1, app.time / d) * 1000));
  els.time.textContent = `${Math.min(app.time, d).toFixed(1)} / ${d.toFixed(1)}`;
}
function tick(now) {
  const dt = app.lastTick ? Math.min(0.1, (now - app.lastTick) / 1000) : 0;
  app.lastTick = now;
  if (app.playing && !app.exporting) {
    const d = durationOf(settings());
    app.time += dt;
    // 終わったら少し止めてから、くり返す
    if (app.time > d + 0.35) app.time = 0;
    drawPreview();
  }
  requestAnimationFrame(tick);
}
function setPlaying(on) {
  app.playing = on;
  els.play.textContent = on ? '❚❚' : '▶';
  els.play.setAttribute('aria-label', on ? '一時停止' : '再生');
}
function markBg() {
  els.bgChoices.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bg === store.bg)));
  els.stage.classList.toggle('is-checker', store.bg === 'checker');
  drawPreview();
}

/* ---------- 立ち絵をプレビューで動かす ---------- */

function bindStageDrag() {
  const pts = new Map();
  let base = null;
  const scale = () => W / els.canvas.getBoundingClientRect().width;
  els.canvas.addEventListener('pointerdown', e => {
    els.canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    base = { place: { ...store.place }, pts: new Map([...pts].map(([k, v]) => [k, { ...v }])) };
  });
  els.canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !base) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const k = scale();
    const ids = [...pts.keys()];
    if (ids.length === 1) {
      const a = pts.get(ids[0]), a0 = base.pts.get(ids[0]);
      if (!a0) return;
      store.place.dx = base.place.dx + (a.x - a0.x) * k;
      store.place.dy = base.place.dy + (a.y - a0.y) * k;
    } else if (ids.length >= 2) {
      const [p, q] = ids, a = pts.get(p), b = pts.get(q), a0 = base.pts.get(p), b0 = base.pts.get(q);
      if (!a0 || !b0) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y), d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
      store.place.zoom = clampZoom(base.place.zoom * d / d0);
      els.zoom.value = String(store.place.zoom);
    }
    if (!app.playing) drawPreview();
  });
  const end = e => {
    pts.delete(e.pointerId);
    base = pts.size ? { place: { ...store.place }, pts: new Map([...pts].map(([k, v]) => [k, { ...v }])) } : null;
    persist(); drawThumbs(); refreshEstimate();
  };
  els.canvas.addEventListener('pointerup', end);
  els.canvas.addEventListener('pointercancel', end);
  els.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    store.place.zoom = clampZoom(store.place.zoom * Math.exp(-e.deltaY * 0.0015));
    els.zoom.value = String(store.place.zoom);
    if (!app.playing) drawPreview();
    persist();
    clearTimeout(bindStageDrag.t);
    bindStageDrag.t = setTimeout(() => { drawThumbs(); refreshEstimate(); }, 300);
  }, { passive: false });
}
const clampZoom = z => Math.max(0.4, Math.min(2.5, z));

/* ---------- 立ち絵の読み込みと顔の位置 ---------- */

const PORTRAIT_KEY = 'main';
async function setPortraitFromCanvas(raw, meta = {}) {
  app.raw = raw;
  const work = document.createElement('canvas');
  work.width = raw.width; work.height = raw.height;
  work.getContext('2d', { willReadFrequently: true }).drawImage(raw, 0, 0);
  const removeWhite = meta.removeWhite ?? (!hasTransparency(raw) && looksWhiteBackground(raw));
  if (removeWhite) removeWhiteBackground(work);
  const auto = estimateFace(work);
  app.autoFace = auto;
  const face = meta.face || auto;
  app.portrait = preparePortrait(work, face);
  app.portraitMeta = { name: meta.name || '', removeWhite };
  els.removeWhite.checked = removeWhite;
  els.portraitName.textContent = meta.name || '立ち絵';
  els.portraitRemove.hidden = false;
  els.faceSize.value = String(face.w / auto.w);
  drawFaceEditor(); drawThumbs(); drawPreview(); refreshEstimate();
}
async function onPortraitFile(file) {
  if (!file || !/^image\//.test(file.type)) { toast('PNG・WebP・JPG の画像を選んでください', 'error'); return; }
  try {
    const raw = await loadImageFile(file);
    store.place = { dx: 0, dy: 0, zoom: 1, flip: false };
    els.zoom.value = '1'; els.flip.checked = false;
    await setPortraitFromCanvas(raw, { name: file.name });
    savePortraitRecord();
    toast(app.portraitMeta.removeWhite ? '立ち絵を読み込みました（白い背景を消しました）' : '立ち絵を読み込みました', 'success');
  } catch (err) {
    console.error(err);
    toast('画像を読み込めませんでした', 'error');
  }
}
async function savePortraitRecord() {
  if (!app.raw || !app.portrait) return;
  await savePortrait(PORTRAIT_KEY, { blob: await canvasToBlob(app.raw), name: app.portraitMeta.name, removeWhite: app.portraitMeta.removeWhite, face: { ...app.portrait.face } });
}
async function restorePortrait() {
  const rec = await loadPortrait(PORTRAIT_KEY);
  if (!rec || !rec.blob) { drawFaceEditor(); return; }
  try {
    const raw = await loadImageFile(rec.blob);
    await setPortraitFromCanvas(raw, rec);
  } catch (e) { console.warn('restorePortrait', e); drawFaceEditor(); }
}
function clearPortrait() {
  app.portrait = null; app.raw = null; app.autoFace = null;
  deletePortrait(PORTRAIT_KEY);
  els.portraitName.textContent = 'まだ選んでいません（仮の立ち絵で表示中）';
  els.portraitRemove.hidden = true;
  drawFaceEditor(); drawThumbs(); drawPreview(); refreshEstimate();
}

// 顔の位置の小さな画面：立ち絵全体を縮めて表示し、顔の丸をドラッグで動かす
const faceView = { k: 1, ox: 0, oy: 0 };
function drawFaceEditor() {
  const c = els.faceCanvas, g = c.getContext('2d'), p = app.portrait || placeholder;
  const src = p.src;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = document.body.classList.contains('is-dark') ? '#1a2536' : '#e6ebf2';
  g.fillRect(0, 0, c.width, c.height);
  // 顔のまわりを大きめに見せる（顔の幅の 4.5 倍の範囲）
  const span = Math.max(p.face.w * 4.5, 40);
  const k = c.width / span;
  const ox = c.width / 2 - p.face.x * k, oy = c.height * 0.42 - p.face.y * k;
  Object.assign(faceView, { k, ox, oy });
  g.drawImage(src, ox, oy, src.width * k, src.height * k);
  const r = p.face.w * k / 2;
  g.strokeStyle = '#ff7a1a'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(p.face.x * k + ox, p.face.y * k + oy, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(p.face.x * k + ox, p.face.y * k + oy, 3, 0, Math.PI * 2); g.fill();
}
function bindFaceEditor() {
  let drag = null;
  const c = els.faceCanvas;
  const toLocal = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; };
  c.addEventListener('pointerdown', e => {
    if (!app.portrait) { toast('先に立ち絵を選んでください'); return; }
    c.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    drag = { start: p, face: { ...app.portrait.face }, view: { ...faceView } };
  });
  c.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = toLocal(e);
    app.portrait.face.x = drag.face.x + (p.x - drag.start.x) / drag.view.k;
    app.portrait.face.y = drag.face.y + (p.y - drag.start.y) / drag.view.k;
    // 表示の基準は動かさない（丸だけが動いて見えるように）
    const g = c.getContext('2d'), src = app.portrait.src, v = drag.view;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = document.body.classList.contains('is-dark') ? '#1a2536' : '#e6ebf2'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(src, v.ox, v.oy, src.width * v.k, src.height * v.k);
    const f = app.portrait.face;
    g.strokeStyle = '#ff7a1a'; g.lineWidth = 2.5; g.beginPath(); g.arc(f.x * v.k + v.ox, f.y * v.k + v.oy, f.w * v.k / 2, 0, Math.PI * 2); g.stroke();
    if (!app.playing) drawPreview();
  });
  const end = () => { if (!drag) return; drag = null; drawFaceEditor(); drawThumbs(); savePortraitRecord(); refreshEstimate(); };
  c.addEventListener('pointerup', end);
  c.addEventListener('pointercancel', end);
}

/* ---------- 容量の目安 ---------- */

let estimateTimer = 0;
function refreshEstimate() {
  clearTimeout(estimateTimer);
  els.estimateValue.textContent = '計算中…';
  estimateTimer = setTimeout(runEstimate, 500);
}
function frameCount(s, fps) { return Math.max(2, Math.round(durationOf(s) * fps)); }
async function runEstimate() {
  if (!C || !C.isCompressionSupported()) return;
  const token = ++app.estimateToken;
  const tpl = app.tpl, s = structuredClone(settings()), o = { ...store.output };
  const [w, h] = SIZES[o.size];
  const n = frameCount(s, o.fps);
  const frameAt = frameRenderer(tpl, s, w, h);
  // 8コマを等間隔に取り出して、1コマあたりの大きさから全体を見積もる
  const k = Math.min(n, 8);
  try {
    const pixels = [];
    for (let i = 0; i < k; i++) {
      await yieldToUi();
      if (token !== app.estimateToken) return;
      pixels.push(frameAt(Math.floor(i * (n - 1) / Math.max(1, k - 1)) / o.fps));
    }
    let quantizer = null;
    if (o.colors) {
      quantizer = new C.PaletteQuantizer(o.colors);
      const an = new C.FrameAnalyzer(w, h, { quantizer });
      pixels.forEach(p => an.add(p));
      quantizer.build();
    }
    const enc = new C.ApngEncoder({ width: w, height: h, fps: o.fps, loops: 0, quantizer, optimize: false });
    for (const p of pixels) { await enc.addFrame(p); if (token !== app.estimateToken) return; }
    const sizes = enc.frames.map(f => f.data.length);
    const avg = sizes.reduce((x, y) => x + y, 0) / sizes.length;
    // 差分だけを保存するので、全面のコマより小さくなる分をかける（実測で 0.9〜1.0 倍）
    const bytes = sizes[0] + avg * 0.95 * (n - 1) + n * 60 + 1024;
    showBudget(bytes, n, true);
  } catch (error) {
    console.warn('estimate', error);
    els.estimateValue.textContent = '—';
  }
}
function showBudget(bytes, frames, estimate) {
  const mbText = (bytes / MB).toFixed(bytes < MB ? 2 : 1);
  if (estimate) els.estimateValue.textContent = `約 ${mbText}MB（${frames}コマ）`;
  els.budgetFill.style.width = `${Math.min(100, bytes / BUDGET_MAX * 100)}%`;
  const level = bytes < BUDGET_OK ? 'ok' : bytes <= BUDGET_MAX ? 'warn' : 'block';
  els.budgetFill.dataset.level = level;
  els.budgetNote.textContent = level === 'ok' ? '3MB未満：ココフォリアで使いやすい大きさです' : level === 'warn' ? '3〜5MB：重めです。「軽くする」で色数や大きさを下げられます' : '5MBを超えるとダウンロードできません。「軽くする」を押してください';
  els.budgetNote.dataset.level = level;
  els.lighten.hidden = level === 'ok';
  return level;
}
function lighterStep() {
  const o = store.output;
  const ci = COLOR_LIST.indexOf(o.colors);
  if (o.colors === 0) return () => { o.colors = 256; };
  if (ci >= 0 && ci < COLOR_LIST.length - 1) return () => { o.colors = COLOR_LIST[ci + 1]; };
  const fi = FPS_LIST.indexOf(o.fps);
  if (fi >= 0 && FPS_LIST[fi] > 12) return () => { o.fps = FPS_LIST[fi + 1]; };
  if (o.size < SIZES.length - 1) return () => { o.size += 1; };
  return null;
}

/* ---------- 書き出し ---------- */

const yieldToUi = () => new Promise(r => setTimeout(r, 0));
function frameRenderer(tpl, s, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const opts = optsFor(tpl, s), portrait = { ...currentPortrait(), face: { ...currentPortrait().face } };
  return time => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    render(ctx, w, h, tpl, modelTime(time, s), opts, portrait);
    return ctx.getImageData(0, 0, w, h).data;
  };
}
async function exportFile(format) {
  if (app.exporting) return;
  const webp = format === 'webp';
  if (!C || !C.isCompressionSupported()) { toast('このブラウザでは書き出せません。新しい Chrome / Edge / Firefox / Safari をお使いください', 'error'); return; }
  if (webp && !(C.isWebpSupported && C.isWebpSupported())) { toast('このブラウザ（Safari など）では WebP を書き出せません。APNG をお使いください', 'error'); return; }
  const tpl = app.tpl, s = structuredClone(settings()), o = { ...store.output };
  await ensureFonts(s);
  const [w, h] = SIZES[o.size];
  const n = frameCount(s, o.fps);
  const loops = o.loop === 'once' ? 1 : 0;
  const job = { cancelled: false };
  app.exporting = job;
  setBusy(true);
  try {
    const frameAt = frameRenderer(tpl, s, w, h);
    const usePalette = !webp && o.colors > 0;
    let quantizer = null;
    const share = usePalette ? 0.4 : 0;
    if (usePalette) {
      quantizer = new C.PaletteQuantizer(o.colors);
      const an = new C.FrameAnalyzer(w, h, { quantizer });
      for (let i = 0; i < n; i++) {
        if (job.cancelled) throw Object.assign(new Error('cancel'), { code: 'CANCELLED' });
        an.add(frameAt(i / o.fps));
        if (i % 3 === 0) { setProgress((i + 1) / n * share, `色を調べています… ${i + 1} / ${n}`); await yieldToUi(); }
      }
      quantizer.build();
    }
    const enc = webp
      ? new C.WebpEncoder({ width: w, height: h, fps: o.fps, loops, quality: WEBP_QUALITY })
      : new C.ApngEncoder({ width: w, height: h, fps: o.fps, loops, quantizer });
    for (let i = 0; i < n; i++) {
      if (job.cancelled) throw Object.assign(new Error('cancel'), { code: 'CANCELLED' });
      await enc.addFrame(frameAt(i / o.fps));
      if (i % 2 === 0 || i === n - 1) { setProgress(share + (i + 1) / n * (1 - share), `書き出しています… ${i + 1} / ${n}`); await yieldToUi(); }
    }
    const blob = await enc.finish();
    showResult(blob, tpl, s, w, h, n, loops, webp);
    toast('書き出しました', 'success');
    track(webp ? 'export_webp' : 'export_apng', { template: tpl.id, size_kb: Math.round(blob.size / 1024), frames: n, fps: o.fps, colors: o.colors });
  } catch (error) {
    if (error && error.code === 'CANCELLED') toast('中止しました');
    else { console.error(error); toast('書き出せませんでした', 'error'); }
  } finally {
    app.exporting = null;
    setBusy(false);
  }
}
function fileName(tpl, s, webp) {
  const who = (s.texts.name || s.texts.main || '').trim();
  const parts = ['カットイン', NAMES[tpl.id]];
  if (who) parts.push(who);
  return `${parts.join('_').replace(/[\\/:*?"<>|\s]+/g, '_')}.${webp ? 'webp' : 'png'}`;
}
function showResult(blob, tpl, s, w, h, n, loops, webp) {
  if (app.resultUrl) URL.revokeObjectURL(app.resultUrl);
  app.resultUrl = URL.createObjectURL(blob);
  els.result.hidden = false;
  els.resultImg.src = app.resultUrl;
  const sizeText = blob.size < MB ? `${Math.round(blob.size / 1024)} KB` : `${(blob.size / MB).toFixed(2)} MB`;
  els.resultMeta.textContent = `${sizeText} ・ ${w}×${h} ・ ${n}コマ ・ ${loops === 0 ? 'ずっとループ' : '1回再生'}`;
  const level = showBudget(blob.size, n, false);
  els.estimateValue.textContent = sizeText;
  els.resultBudget.textContent = level === 'ok' ? '3MB未満：ココフォリアで使いやすい大きさです' : level === 'warn' ? '3〜5MB：重めですが使えます' : '5MBを超えるためダウンロードできません';
  els.resultBudget.dataset.level = level;
  if (level === 'block') {
    els.download.removeAttribute('href');
    els.download.setAttribute('aria-disabled', 'true');
  } else {
    els.download.href = app.resultUrl;
    els.download.download = fileName(tpl, s, webp);
    els.download.removeAttribute('aria-disabled');
  }
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

/* ---------- そのほか ---------- */

let toastTimer = 0;
function toast(text, kind = 'info') {
  els.toast.textContent = text;
  els.toast.dataset.kind = kind;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, kind === 'error' ? 6000 : 3000);
}
function track(name, params) {
  try { if (typeof window.gtag === 'function') window.gtag('event', name, { tool: 'cutin-studio', ...params }); } catch (e) { /* 計測できなくても動く */ }
}
async function copyCredit() {
  try {
    await navigator.clipboard.writeText(CREDIT);
    toast('クレジットをコピーしました', 'success');
  } catch (e) {
    toast('コピーできませんでした。文字を選択してコピーしてください', 'error');
  }
}
function setMobileTab(name) {
  els.grid2.dataset.mobile = name;
  document.querySelectorAll('[data-mobile-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mobileTab === name)));
}
function watchHeader() {
  const header = $('.studio-header');
  const set = () => document.documentElement.style.setProperty('--head', `${header.offsetHeight}px`);
  set();
  if (window.ResizeObserver) new ResizeObserver(set).observe(header);
}

function bind() {
  $('#themeBtn').addEventListener('click', () => {
    store.theme = document.body.classList.contains('is-dark') ? 'light' : 'dark';
    persist(); applyTheme(); drawFaceEditor();
  });
  [['#helpBtn', '#helpDrawer'], ['#rulesBtn', '#rulesDrawer'], ['#shortcutBtn', '#shortcutDrawer']].forEach(([b, d]) => {
    $(b).addEventListener('click', () => {
      const drawer = $(d), open = drawer.hidden;
      document.querySelectorAll('.drawer').forEach(x => { x.hidden = true; });
      document.querySelectorAll('#helpBtn, #rulesBtn, #shortcutBtn').forEach(x => x.setAttribute('aria-expanded', 'false'));
      drawer.hidden = !open;
      $(b).setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close-drawer]')) {
      e.target.closest('.drawer').hidden = true;
      document.querySelectorAll('#helpBtn, #rulesBtn, #shortcutBtn').forEach(x => x.setAttribute('aria-expanded', 'false'));
    }
    if (e.target.closest('[data-copy-credit]')) copyCredit();
  });
  const KEY_ACTIONS = { KeyP: () => setPlaying(!app.playing), KeyE: () => exportFile('apng'), KeyK: () => exportFile('webp'), KeyT: () => $('#themeBtn').click() };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = [...document.querySelectorAll('.drawer')].filter(d => !d.hidden);
      if (!open.length) return;
      open.forEach(d => { d.hidden = true; });
      document.querySelectorAll('#helpBtn, #rulesBtn, #shortcutBtn').forEach(x => x.setAttribute('aria-expanded', 'false'));
      e.preventDefault();
      return;
    }
    if (!(e.shiftKey && (e.metaKey || e.ctrlKey || e.altKey))) return;
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    e.preventDefault(); e.stopPropagation();
    action();
  }, true);

  // 型
  els.grid.addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (b) selectTpl(b.dataset.tpl); });
  els.grid.addEventListener('pointerover', e => { const b = e.target.closest('[data-tpl]'); if (b && (!app.hover || !b.contains(app.hover.canvas))) startHover(b); });
  els.grid.addEventListener('pointerleave', stopHover);
  $('#resetTplBtn').addEventListener('click', () => {
    delete store.perTpl[app.tpl.id];
    persist(); renderControls(); ensureFonts(settings()).then(redrawAll); refreshEstimate();
    toast(`「${NAMES[app.tpl.id]}」を初期値に戻しました`);
  });

  // 調整・書き出しの設定
  [els.textControls, els.styleControls, els.output].forEach(el => {
    el.addEventListener('input', onControlInput);
    el.addEventListener('change', e => { if (e.target.tagName === 'SELECT') onControlInput(e); });
    el.addEventListener('click', onControlClick);
  });

  // 再生
  els.play.addEventListener('click', () => setPlaying(!app.playing));
  els.scrub.addEventListener('input', () => { setPlaying(false); app.time = Number(els.scrub.value) / 1000 * durationOf(settings()); drawPreview(); });
  els.bgChoices.addEventListener('click', e => { const b = e.target.closest('[data-bg]'); if (!b) return; store.bg = b.dataset.bg; persist(); markBg(); });

  // 立ち絵
  els.portraitBtn.addEventListener('click', () => els.portraitFile.click());
  els.portraitFile.addEventListener('change', () => { const f = els.portraitFile.files[0]; els.portraitFile.value = ''; if (f) onPortraitFile(f); });
  els.portraitRemove.addEventListener('click', clearPortrait);
  ['dragenter', 'dragover'].forEach(t => els.stage.addEventListener(t, e => { e.preventDefault(); els.stage.classList.add('is-dropping'); }));
  ['dragleave', 'drop'].forEach(t => els.stage.addEventListener(t, e => { e.preventDefault(); els.stage.classList.remove('is-dropping'); }));
  els.stage.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) onPortraitFile(f); });
  els.zoom.addEventListener('input', () => { store.place.zoom = Number(els.zoom.value); persist(); if (!app.playing) drawPreview(); });
  els.zoom.addEventListener('change', () => { drawThumbs(); refreshEstimate(); });
  els.flip.addEventListener('change', () => { store.place.flip = els.flip.checked; persist(); drawThumbs(); drawPreview(); });
  els.faceSize.addEventListener('input', () => {
    if (!app.portrait || !app.autoFace) return;
    app.portrait.face.w = app.autoFace.w * Number(els.faceSize.value);
    drawFaceEditor(); if (!app.playing) drawPreview();
  });
  els.faceSize.addEventListener('change', () => { drawThumbs(); savePortraitRecord(); refreshEstimate(); });
  els.faceAuto.addEventListener('click', () => {
    if (!app.portrait) return;
    app.portrait.face = { ...app.autoFace };
    els.faceSize.value = '1';
    drawFaceEditor(); drawThumbs(); drawPreview(); savePortraitRecord();
  });
  els.placeReset.addEventListener('click', () => {
    store.place = { dx: 0, dy: 0, zoom: 1, flip: false };
    els.zoom.value = '1'; els.flip.checked = false;
    persist(); drawThumbs(); drawPreview(); refreshEstimate();
  });
  els.removeWhite.addEventListener('change', async () => {
    if (!app.raw) { els.removeWhite.checked = false; return; }
    const face = app.portrait ? { ...app.portrait.face } : null;
    await setPortraitFromCanvas(app.raw, { name: app.portraitMeta.name, removeWhite: els.removeWhite.checked, face });
    savePortraitRecord();
  });

  // 書き出し
  els.exportApng.addEventListener('click', () => exportFile('apng'));
  els.exportWebp.addEventListener('click', () => exportFile('webp'));
  els.cancel.addEventListener('click', () => { if (app.exporting) app.exporting.cancelled = true; });
  els.lighten.addEventListener('click', () => {
    const step = lighterStep();
    if (!step) { toast('これ以上は軽くできません'); return; }
    step(); persist(); renderOutput(); refreshEstimate();
  });
  els.download.addEventListener('click', e => { if (els.download.getAttribute('aria-disabled') === 'true') e.preventDefault(); });

  document.querySelectorAll('[data-mobile-tab]').forEach(b => b.addEventListener('click', () => setMobileTab(b.dataset.mobileTab)));
  bindStageDrag();
  bindFaceEditor();
}

async function init() {
  applyTheme();
  watchHeader();
  els.zoom.value = String(store.place.zoom);
  els.flip.checked = Boolean(store.place.flip);
  bind();
  renderGrid();
  renderControls();
  markBg();
  await ensureFonts(settings());
  drawThumbs();
  drawPreview();
  await restorePortrait();
  refreshEstimate();
  requestAnimationFrame(tick);
  // 書体が後から読み込まれたときに描き直す
  document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => { drawThumbs(); if (!app.playing) drawPreview(); });
}
init();
