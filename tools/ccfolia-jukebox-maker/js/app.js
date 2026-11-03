/* KPレス・ジュークボックスメーカー — 画面
 * 全シーンを並べ、マーカーパネルのクリックアクション「/scene 名前」を
 * 呼び出し先のシーンへの線として描く。 */
(function () {
  'use strict';

  const VERSION = '0.10';
  const STORAGE_KEY = 'ccfoliaJukebox.v1';
  const LANG_KEY = 'ccfoliaJukeboxLang';
  const LANGS = ['ja', 'en', 'ko'];
  const MAX_DISKS = 10;
  const IMPORT_COLORS = ['#e3b938', '#5fb98a', '#5a80b8', '#e07a3c', '#d98aa0', '#4f9a96', '#8a62a8', '#c0483c', '#b0b0b0', '#e8d3a8'];

  const $ = id => document.getElementById(id);
  const els = {
    helpBtn: $('helpBtn'), helpDrawer: $('helpDrawer'), helpList: $('helpList'), helpNotes: $('helpNotes'),
    importBtn: $('importBtn'), importFile: $('importFile'), backBtn: $('backBtn'),
    playBtn: $('playBtn'), exportBtn: $('exportBtn'),
    jukeboxPanel: $('jukeboxPanel'), importPanel: $('importPanel'), importName: $('importName'),
    roomName: $('roomName'), stopName: $('stopName'), diskCount: $('diskCount'), diskCountOut: $('diskCountOut'),
    diskList: $('diskList'), resetBtn: $('resetBtn'),
    shapeLabel: $('shapeLabel'), shapeResetBtn: $('shapeResetBtn'),
    graph: $('graph'), sceneGrid: $('sceneGrid'), linkLayer: $('linkLayer'), graphCount: $('graphCount'), warnBox: $('warnBox'),
    detailTitle: $('detailTitle'), detailBoard: $('detailBoard'), inspectorBody: $('inspectorBody'),
    playModal: $('playModal'), playScene: $('playScene'), playBgm: $('playBgm'), playBoard: $('playBoard'),
    playChat: $('playChat'), playRestart: $('playRestart'), playAudio: $('playAudio'),
    toastHost: $('toastHost')
  };

  const app = {
    lang: 'ja',
    settings: null,
    files: [],          // 音声ファイル（レコードの順番と同じ。保存はしない）
    room: null,         // ジュークボックスから組み立てた部屋
    imported: null,     // { name, data, files }
    view: null,         // 画面に出すシーン一覧
    selected: 0,        // 選んでいるシーン（shared は -1）
    marker: -1,         // 選んでいるパネル
    lines: 'all',
    buildSeq: 0,
    buildTimer: 0,
    urls: [],
    play: { index: 0 }
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
    renderSettings();
    renderShape();
    renderAll();
  }

  // 初期値のままの名前は、言語を切り替えたらその言語の初期値にそろえる
  function swapDefaultNames(from, to) {
    const a = I18N[from] || I18N.ja;
    const b = I18N[to] || I18N.ja;
    const s = app.settings;
    if (s.roomName === a.set.roomNameDefault) s.roomName = b.set.roomNameDefault;
    if (s.stopName === a.set.stopNameDefault) s.stopName = b.set.stopNameDefault;
    s.disks.forEach((disk, i) => {
      const idx = Jukebox.COLORS.findIndex(c => c.id === disk.color);
      if (idx >= 0 && disk.name === a.defaultNames[idx]) disk.name = b.defaultNames[idx];
      else if (disk.name === a.defaultNames[i]) disk.name = b.defaultNames[i];
    });
  }

  /* ================= 小さな道具 ================= */

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'style' && typeof value === 'object') {
          Object.entries(value).forEach(([prop, v]) => {
            if (prop.startsWith('--')) node.style.setProperty(prop, v);
            else node.style[prop] = v;
          });
        }
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

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function toast(message, type = 'info', duration = 3600) {
    if (!message) return;
    const node = h('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, h('span', null, message));
    els.toastHost.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => {
      node.classList.remove('is-visible');
      setTimeout(() => node.remove(), 300);
    }, duration);
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, { tool_id: 'ccfolia_jukebox_maker', tool_version: VERSION, language: app.lang, ...params });
    } catch (error) { /* noop */ }
  }

  const blobUrls = new WeakMap();
  function urlOf(blob) {
    if (!blob) return '';
    if (!blobUrls.has(blob)) {
      const url = URL.createObjectURL(blob);
      blobUrls.set(blob, url);
      app.urls.push(url);
    }
    return blobUrls.get(blob);
  }

  function downloadBlob(blob, name) {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  const safeFileName = name => String(name || 'ccfolia-room').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'ccfolia-room';

  /* ================= 設定 ================= */

  function defaultSettings() {
    const d = dict();
    return {
      roomName: d.set.roomNameDefault,
      stopName: d.set.stopNameDefault,
      count: 9,
      disks: Jukebox.COLORS.map((c, i) => ({ color: c.id, name: d.defaultNames[i], url: '' }))
    };
  }

  function loadSettings() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    const base = defaultSettings();
    if (!saved || !Array.isArray(saved.disks)) return base;
    const disks = base.disks.map((disk, i) => {
      const s = saved.disks[i] || {};
      return {
        color: Jukebox.COLORS.some(c => c.id === s.color) ? s.color : disk.color,
        name: typeof s.name === 'string' ? s.name : disk.name,
        url: typeof s.url === 'string' ? s.url : ''
      };
    });
    return {
      roomName: typeof saved.roomName === 'string' ? saved.roomName : base.roomName,
      stopName: typeof saved.stopName === 'string' ? saved.stopName : base.stopName,
      count: Math.min(MAX_DISKS, Math.max(1, Number(saved.count) || base.count)),
      disks
    };
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(app.settings)); } catch (error) { /* noop */ }
  }

  function activeDisks() {
    return app.settings.disks.slice(0, app.settings.count).map((disk, i) => ({
      ...disk,
      name: disk.name.trim() || `${t('set.diskName')}${i + 1}`,
      file: app.files[i] || null
    }));
  }

  function renderSettings() {
    const s = app.settings;
    els.roomName.value = s.roomName;
    els.stopName.value = s.stopName;
    els.diskCount.value = String(s.count);
    els.diskCountOut.textContent = String(s.count);
    els.diskList.innerHTML = '';
    s.disks.slice(0, s.count).forEach((disk, i) => {
      const color = Jukebox.colorOf(disk.color);
      const swatches = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('set.color') },
        Jukebox.COLORS.map(c => h('button', {
          type: 'button',
          class: `swatch${c.id === disk.color ? ' is-on' : ''}`,
          role: 'radio',
          'aria-checked': String(c.id === disk.color),
          title: t(`colors.${c.id}`),
          'aria-label': t(`colors.${c.id}`),
          style: { '--sw': c.line },
          onclick: () => { disk.color = c.id; changed(true); }
        })));
      const file = app.files[i];
      const fileInput = h('input', { type: 'file', accept: 'audio/*', class: 'visually-hidden', tabindex: '-1' });
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (f) { app.files[i] = f; changed(true); }
      });
      els.diskList.appendChild(h('li', { class: 'disk-row', style: { '--disk': color.line } },
        h('img', { class: 'disk-thumb', src: Jukebox.assetUrl(`disk-${disk.color}.png`), alt: '' }),
        h('div', { class: 'disk-fields' },
          h('input', {
            class: 'text-input', type: 'text', maxlength: '40', value: disk.name, 'aria-label': `${t('set.diskName')} ${i + 1}`,
            oninput: e => { disk.name = e.target.value; changed(false); }
          }),
          swatches,
          h('div', { class: 'bgm-row' },
            file
              ? h('span', { class: 'bgm-file' }, `♪ ${file.name}`, h('button', { type: 'button', class: 'text-button', onclick: () => { app.files[i] = null; changed(true); } }, t('set.bgmFileClear')))
              : h('input', {
                class: 'text-input small', type: 'url', value: disk.url, placeholder: t('set.bgmUrlPh'), 'aria-label': t('set.bgmUrl'),
                oninput: e => { disk.url = e.target.value; changed(false); }
              }),
            h('label', { class: 'ghost-button small file-button' }, t('set.bgmFile'), fileInput)
          ))));
    });
  }

  // rerender=true は設定欄も描き直す（色・枚数・ファイル）
  function changed(rerender) {
    saveSettings();
    if (rerender) renderSettings();
    clearTimeout(app.buildTimer);
    app.buildTimer = setTimeout(rebuild, rerender ? 0 : 260);
  }

  /* ================= 組み立て ================= */

  async function rebuild() {
    if (app.imported) return;
    const seq = ++app.buildSeq;
    const s = app.settings;
    const room = await Jukebox.build({
      roomName: s.roomName.trim() || t('set.roomNameDefault'),
      stopName: s.stopName.trim() || t('set.stopNameDefault'),
      playingLabel: t('set.playingLabel'),
      stopLabel: t('set.stopLabel'),
      disks: activeDisks()
    });
    if (seq !== app.buildSeq || app.imported) return;
    const old = app.urls;
    app.urls = [];
    app.room = room;
    app.view = viewFromRoom(room);
    if (app.selected >= app.view.scenes.length) app.selected = 0;
    app.marker = -1;
    renderAll();
    setTimeout(() => old.forEach(url => URL.revokeObjectURL(url)), 2000);
  }

  function viewFromRoom(room) {
    return {
      kind: 'jukebox',
      name: room.name,
      fieldWidth: room.fieldWidth,
      fieldHeight: room.fieldHeight,
      start: room.startSceneIndex || 0,
      shared: null,
      scenes: room.scenes.map(scene => ({
        name: scene.name,
        color: scene.color,
        bgUrl: urlOf((scene.background || room.background || {}).blob),
        sound: scene.sound,
        soundUrl: scene.sound ? (scene.sound.asset ? urlOf(scene.sound.asset.blob) : scene.sound.url) : '',
        fieldWidth: room.fieldWidth,
        fieldHeight: room.fieldHeight,
        markers: scene.markers.map(m => ({ ...m, imgUrl: urlOf(m.image && m.image.blob) }))
      }))
    };
  }

  function viewFromImport(imported) {
    const { data, files } = imported;
    const ents = data.entities || {};
    const room = ents.room || {};
    const resolve = name => {
      if (!name) return '';
      if (files.has(name)) return urlOf(files.get(name));
      return /^https?:\/\//.test(name) ? name : '';
    };
    const fw = Number(room.fieldWidth) || 60;
    const fh = Number(room.fieldHeight) || 34;
    const markerList = markers => Object.entries(markers || {})
      .map(([key, m]) => ({
        key, ref: m,
        x: Number(m.x) || 0, y: Number(m.y) || 0, z: Number(m.z) || 0,
        width: Number(m.width) || 1, height: Number(m.height) || 1,
        text: m.text || m.memo || '',
        imgUrl: resolve(m.imageUrl),
        action: Ccfolia.readClickAction(m.clickAction)
      }))
      .sort((a, b) => a.z - b.z);
    const scenes = Object.entries(ents.scenes || {})
      .map(([id, scene]) => ({ id, scene }))
      .sort((a, b) => (Number(a.scene.order) || 0) - (Number(b.scene.order) || 0))
      .map(({ scene }, i) => ({
        name: scene.name || '',
        color: IMPORT_COLORS[i % IMPORT_COLORS.length],
        bgUrl: resolve(scene.backgroundUrl) || resolve(scene.foregroundUrl),
        fgUrl: scene.backgroundUrl ? resolve(scene.foregroundUrl) : '',
        sound: scene.soundUrl ? { name: scene.soundName || scene.soundUrl } : null,
        soundUrl: resolve(scene.soundUrl) || '',
        fieldWidth: Number(scene.fieldWidth) || fw,
        fieldHeight: Number(scene.fieldHeight) || fh,
        markers: markerList(scene.markers)
      }));
    const items = Object.entries(ents.items || {})
      .filter(([, item]) => item && item.active !== false)
      .map(([key, item]) => ({
        key, ref: item,
        x: Number(item.x) || 0, y: Number(item.y) || 0, z: Number(item.z) || 0,
        width: Number(item.width) || 1, height: Number(item.height) || 1,
        text: item.memo || '',
        imgUrl: resolve(item.imageUrl),
        action: Ccfolia.readClickAction(item.clickAction)
      }));
    return {
      kind: 'import',
      name: imported.name,
      fieldWidth: fw,
      fieldHeight: fh,
      start: -1,
      shared: items.length ? { name: t('graph.shared'), color: '#9d9fa6', bgUrl: resolve(room.backgroundUrl), fieldWidth: fw, fieldHeight: fh, markers: items, shared: true } : null,
      scenes
    };
  }

  /* ================= つながり ================= */

  function sceneIndexByName(name) {
    return app.view.scenes.findIndex(s => s.name === name);
  }

  function collectLinks() {
    const links = [];
    const sources = app.view.scenes.map((scene, i) => ({ scene, i }));
    if (app.view.shared) sources.push({ scene: app.view.shared, i: -1 });
    sources.forEach(({ scene, i }) => {
      scene.markers.forEach((m, mi) => {
        Ccfolia.sceneTargets(m.action).forEach(name => {
          links.push({ from: i, marker: mi, to: sceneIndexByName(name), name });
        });
      });
    });
    return links;
  }

  function collectWarnings(links) {
    const out = [];
    const seen = new Map();
    app.view.scenes.forEach(scene => {
      if (!scene.name) { out.push(t('warn.empty')); return; }
      if (scene.name !== scene.name.trim()) out.push(t('warn.spaces', { name: scene.name }));
      seen.set(scene.name, (seen.get(scene.name) || 0) + 1);
    });
    seen.forEach((n, name) => { if (n > 1) out.push(t('warn.duplicate', { name })); });
    const missing = new Set();
    links.filter(l => l.to < 0).forEach(l => {
      const from = l.from < 0 ? t('graph.shared') : app.view.scenes[l.from].name;
      const key = `${from}\u0000${l.name}`;
      if (missing.has(key)) return;
      missing.add(key);
      out.push(t('warn.missing', { from, name: l.name }));
    });
    return [...new Set(out)];
  }

  /* ================= 盤面 ================= */

  function boardEl(scene, opts = {}) {
    const fw = scene.fieldWidth || app.view.fieldWidth;
    const fhh = scene.fieldHeight || app.view.fieldHeight;
    const board = h('div', { class: `board${opts.className ? ` ${opts.className}` : ''}`, style: { aspectRatio: `${fw} / ${fhh}` } });
    if (scene.bgUrl) board.appendChild(h('img', { class: 'board-bg', src: scene.bgUrl, alt: '', draggable: 'false' }));
    if (scene.fgUrl) board.appendChild(h('img', { class: 'board-bg', src: scene.fgUrl, alt: '', draggable: 'false' }));
    scene.markers.forEach((m, mi) => {
      const targets = Ccfolia.sceneTargets(m.action);
      const clickable = Boolean(m.action);
      const node = h(opts.interactive ? 'button' : 'div', {
        class: `marker${clickable ? ' has-action' : ''}${opts.selectedMarker === mi ? ' is-selected' : ''}`,
        type: opts.interactive ? 'button' : null,
        title: m.text || null,
        dataset: { mi: String(mi) },
        style: {
          left: `${((m.x + fw / 2) / fw) * 100}%`,
          top: `${((m.y + fhh / 2) / fhh) * 100}%`,
          width: `${(m.width / fw) * 100}%`,
          height: `${(m.height / fhh) * 100}%`,
          zIndex: String(Math.max(1, Math.round(m.z || 1)))
        },
        onclick: opts.onMarker ? e => { e.stopPropagation(); opts.onMarker(mi, m, targets); } : null
      });
      if (m.imgUrl) node.appendChild(h('img', { src: m.imgUrl, alt: m.text || '', draggable: 'false' }));
      else node.appendChild(h('span', { class: 'marker-text' }, m.text || ''));
      board.appendChild(node);
    });
    return board;
  }

  function sceneCard(scene, i) {
    const selected = app.selected === i;
    const links = scene.markers.reduce((n, m) => n + Ccfolia.sceneTargets(m.action).length, 0);
    const card = h('article', {
      class: `scene-card${selected ? ' is-selected' : ''}${scene.shared ? ' is-shared' : ''}`,
      dataset: { scene: String(i) },
      style: { '--scene': scene.color },
      tabindex: '0',
      onclick: () => selectScene(i),
      onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScene(i); } }
    },
    h('header', { class: 'scene-head' },
      h('span', { class: 'scene-dot' }),
      h('span', { class: 'scene-name' }, scene.name || '—'),
      app.view.start === i ? h('span', { class: 'scene-badge' }, t('graph.start')) : null,
      links ? h('span', { class: 'scene-links' }, `→${links}`) : null),
    boardEl(scene));
    return card;
  }

  function selectScene(i) {
    if (app.selected === i) return;
    app.selected = i;
    app.marker = -1;
    document.querySelectorAll('.scene-card').forEach(card => card.classList.toggle('is-selected', Number(card.dataset.scene) === i));
    drawLinks();
    renderDetail();
  }

  function renderAll() {
    if (!app.view) return;
    els.jukeboxPanel.hidden = Boolean(app.imported);
    els.importPanel.hidden = !app.imported;
    els.backBtn.hidden = !app.imported;
    if (app.imported) els.importName.textContent = app.imported.name;
    els.sceneGrid.innerHTML = '';
    app.view.scenes.forEach((scene, i) => els.sceneGrid.appendChild(sceneCard(scene, i)));
    if (app.view.shared) els.sceneGrid.appendChild(sceneCard(app.view.shared, -1));
    document.querySelectorAll('[data-lines]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.lines === app.lines));
    const links = collectLinks();
    els.graphCount.textContent = t('graph.links', { n: links.length });
    const warnings = collectWarnings(links);
    els.warnBox.hidden = !warnings.length;
    els.warnBox.innerHTML = '';
    if (warnings.length) {
      els.warnBox.appendChild(h('p', { class: 'warn-title' }, t('warn.heading')));
      els.warnBox.appendChild(h('ul', null, warnings.map(w => h('li', null, w))));
    }
    requestAnimationFrame(drawLinks);
    renderDetail();
  }

  function currentScene() {
    if (app.selected === -1) return app.view.shared;
    return app.view.scenes[app.selected] || app.view.scenes[0];
  }

  /* ---------- 線 ---------- */

  function drawLinks() {
    const layer = els.linkLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!app.view) return;
    const box = els.graph.getBoundingClientRect();
    layer.setAttribute('width', String(box.width));
    layer.setAttribute('height', String(box.height));
    layer.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const cards = new Map();
    els.sceneGrid.querySelectorAll('.scene-card').forEach(card => cards.set(Number(card.dataset.scene), card));
    const links = collectLinks();
    const back = svg('g', { class: 'links-back' });
    const front = svg('g', { class: 'links-front' });
    layer.appendChild(back);
    layer.appendChild(front);
    links.forEach(link => {
      const fromCard = cards.get(link.from);
      if (!fromCard) return;
      const markerEl = fromCard.querySelector(`.marker[data-mi="${link.marker}"]`);
      if (!markerEl) return;
      const hot = link.from === app.selected;
      if (app.lines === 'selected' && !hot) return;
      const mr = markerEl.getBoundingClientRect();
      const sx = mr.left + mr.width / 2 - box.left;
      const sy = mr.top + mr.height / 2 - box.top;
      let tx;
      let ty;
      let color;
      if (link.to >= 0 && cards.get(link.to)) {
        const head = cards.get(link.to).querySelector('.scene-head').getBoundingClientRect();
        tx = head.left + 8 - box.left;
        ty = head.top + head.height / 2 - box.top;
        color = app.view.scenes[link.to].color;
      } else {
        tx = sx + 18;
        ty = sy - 26;
        color = '#e2675f';
      }
      if (link.to === link.from) return;
      const dy = Math.max(40, Math.abs(ty - sy) * 0.35);
      const d = `M ${sx} ${sy} C ${sx} ${sy - dy}, ${tx - 40} ${ty}, ${tx} ${ty}`;
      const g = hot ? front : back;
      g.appendChild(svg('path', { d, class: `link${hot ? ' is-hot' : ''}${link.to < 0 ? ' is-missing' : ''}`, stroke: color }));
      if (hot) {
        g.appendChild(svg('circle', { cx: sx, cy: sy, r: 3.5, fill: color, class: 'link-dot' }));
        g.appendChild(svg('circle', { cx: tx, cy: ty, r: 5, fill: 'none', stroke: color, 'stroke-width': 2, class: 'link-dot' }));
      }
    });
  }

  /* ---------- 選んだシーン ---------- */

  function renderDetail() {
    const scene = currentScene();
    if (!scene) return;
    els.detailTitle.textContent = scene.name || '—';
    els.detailTitle.style.setProperty('--scene', scene.color);
    els.detailBoard.innerHTML = '';
    els.detailBoard.appendChild(boardEl(scene, {
      interactive: true,
      className: 'board-large',
      selectedMarker: app.marker,
      onMarker: mi => { app.marker = mi; renderDetail(); }
    }));
    renderInspector(scene);
  }

  function renderInspector(scene) {
    const body = els.inspectorBody;
    body.innerHTML = '';
    const m = scene.markers[app.marker];
    if (!m) {
      body.appendChild(h('p', { class: 'muted-note' }, t('insp.none')));
      if (app.view.kind === 'jukebox') body.appendChild(h('p', { class: 'muted-note' }, t('insp.jukeboxNote')));
      return;
    }
    if (m.imgUrl) body.appendChild(h('img', { class: 'insp-thumb', src: m.imgUrl, alt: '' }));
    if (m.text) {
      body.appendChild(h('p', { class: 'field-label' }, t('insp.text')));
      body.appendChild(h('p', { class: 'insp-text' }, m.text));
    }
    body.appendChild(h('p', { class: 'field-label' }, t('insp.action')));
    if (app.view.kind === 'import') {
      const area = h('textarea', { class: 'text-input insp-action', rows: '3', 'aria-label': t('insp.edit') });
      area.value = m.action;
      area.addEventListener('change', () => {
        m.action = area.value;
        m.ref.clickAction = Ccfolia.buildClickAction(area.value);
        renderAll();
      });
      body.appendChild(area);
    } else {
      body.appendChild(h('p', { class: 'insp-code' }, m.action || t('insp.actionNone')));
    }
    Ccfolia.sceneTargets(m.action).forEach(name => {
      const idx = sceneIndexByName(name);
      body.appendChild(idx >= 0
        ? h('button', { type: 'button', class: 'jump-link', style: { '--scene': app.view.scenes[idx].color }, onclick: () => selectScene(idx) }, t('insp.jumpsTo', { name }))
        : h('p', { class: 'jump-missing' }, t('insp.missing', { name })));
    });
    if (app.view.kind === 'jukebox') body.appendChild(h('p', { class: 'muted-note' }, t('insp.jukeboxNote')));
  }

  /* ================= テストプレイ ================= */

  function openPlay() {
    if (!app.view || !app.view.scenes.length) return;
    app.play.index = app.view.start >= 0 ? app.view.start : Math.max(0, app.selected);
    els.playChat.innerHTML = '';
    els.playModal.hidden = false;
    renderPlay();
    track('ccfolia_jukebox_play');
  }

  function closePlay() {
    els.playModal.hidden = true;
    try { els.playAudio.pause(); } catch (error) { /* noop */ }
  }

  function renderPlay() {
    const scene = app.view.scenes[app.play.index];
    els.playScene.textContent = t('play.scene', { name: scene.name });
    els.playScene.style.setProperty('--scene', scene.color);
    els.playBgm.textContent = scene.sound ? t('play.bgm', { name: scene.sound.name || scene.name }) : t('play.noBgm');
    els.playBoard.innerHTML = '';
    els.playBoard.appendChild(boardEl(scene, {
      interactive: true,
      className: 'board-large',
      onMarker: (mi, m, targets) => {
        if (!m.action) return;
        els.playChat.prepend(h('li', null, t('play.chat', { text: m.action.replace(/\n/g, ' / ') })));
        while (els.playChat.children.length > 6) els.playChat.lastChild.remove();
        const idx = targets.map(sceneIndexByName).find(i => i >= 0);
        if (idx !== undefined) {
          app.play.index = idx;
          renderPlay();
        }
      }
    }));
    playSound(scene);
  }

  function playSound(scene) {
    const audio = els.playAudio;
    const src = scene.soundUrl && /^(blob:|https?:\/\/.+\.(mp3|ogg|wav|m4a|aac)(\?|$))/i.test(scene.soundUrl) ? scene.soundUrl : '';
    if (!src) {
      try { audio.pause(); } catch (error) { /* noop */ }
      audio.removeAttribute('src');
      return;
    }
    if (audio.getAttribute('src') !== src) {
      audio.setAttribute('src', src);
      audio.volume = 0.5;
      audio.play().catch(() => { /* 自動再生が止められても気にしない */ });
    }
  }

  /* ================= 読み込み・書き出し ================= */

  async function exportZip() {
    if (typeof JSZip === 'undefined') { toast(t('io.jszip'), 'error'); return; }
    els.exportBtn.disabled = true;
    toast(t('io.exporting'), 'info', 1800);
    try {
      let blob;
      let name;
      if (app.imported) {
        blob = await Ccfolia.rebuildImportedZip(app.imported.data, app.imported.files);
        name = app.imported.fileName.replace(/\.zip$/i, '') + '_edited.zip';
      } else {
        clearTimeout(app.buildTimer);
        await rebuild();
        blob = await Ccfolia.buildRoomZip(app.room);
        name = `${safeFileName(app.room.name)}.zip`;
      }
      downloadBlob(blob, name);
      toast(t('io.exported'), 'success', 5000);
      track('ccfolia_jukebox_export', { mode: app.imported ? 'import' : 'jukebox', scenes: app.view.scenes.length });
    } catch (error) {
      console.error(error);
      toast(t('io.exportFailed'), 'error');
    } finally {
      els.exportBtn.disabled = false;
    }
  }

  async function importZip(file) {
    if (!file) return;
    if (typeof JSZip === 'undefined') { toast(t('io.jszip'), 'error'); return; }
    toast(t('io.importing'), 'info', 1500);
    try {
      const { data, files, learned } = await Ccfolia.readRoomZip(file);
      const name = (data.entities.room && data.entities.room.name) || file.name.replace(/\.zip$/i, '');
      app.imported = { name, fileName: file.name, data, files };
      app.view = viewFromImport(app.imported);
      app.selected = app.view.scenes.length ? 0 : -1;
      app.marker = -1;
      renderShape();
      renderAll();
      toast(t('io.imported', { n: app.view.scenes.length }), 'success');
      if (learned) toast(t('io.learned'), 'info', 6000);
      track('ccfolia_jukebox_import', { scenes: app.view.scenes.length, learned });
    } catch (error) {
      console.error(error);
      toast(error && error.message === 'jszip' ? t('io.jszip') : t('io.importFailed'), 'error');
    }
  }

  function backToJukebox() {
    app.imported = null;
    app.selected = 0;
    app.marker = -1;
    rebuild();
  }

  function renderShape() {
    const learned = Ccfolia.getShape().learned;
    els.shapeLabel.textContent = learned ? t('io.shapeLearned') : t('io.shapeGuess');
    els.shapeLabel.classList.toggle('is-guess', !learned);
    els.shapeResetBtn.hidden = !learned;
  }

  /* ================= イベント ================= */

  function bind() {
    document.querySelectorAll('[data-lang-choice]').forEach(btn => btn.addEventListener('click', () => {
      const next = LANGS.includes(btn.dataset.langChoice) ? btn.dataset.langChoice : 'ja';
      if (next === app.lang) return;
      swapDefaultNames(app.lang, next);
      app.lang = next;
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      saveSettings();
      applyLanguage();
      if (!app.imported) rebuild();
    }));
    els.helpBtn.addEventListener('click', () => {
      const open = els.helpDrawer.hidden;
      els.helpDrawer.hidden = !open;
      els.helpBtn.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', () => {
      els.helpDrawer.hidden = true;
      els.helpBtn.setAttribute('aria-expanded', 'false');
    }));
    els.roomName.addEventListener('input', () => { app.settings.roomName = els.roomName.value; changed(false); });
    els.stopName.addEventListener('input', () => { app.settings.stopName = els.stopName.value; changed(false); });
    els.diskCount.addEventListener('input', () => {
      app.settings.count = Math.min(MAX_DISKS, Math.max(1, Number(els.diskCount.value) || 1));
      changed(true);
    });
    els.resetBtn.addEventListener('click', () => {
      if (!window.confirm(t('set.resetConfirm'))) return;
      app.settings = defaultSettings();
      app.files = [];
      changed(true);
    });
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', () => {
      importZip(els.importFile.files && els.importFile.files[0]);
      els.importFile.value = '';
    });
    els.backBtn.addEventListener('click', backToJukebox);
    els.exportBtn.addEventListener('click', exportZip);
    els.playBtn.addEventListener('click', openPlay);
    els.playRestart.addEventListener('click', () => {
      app.play.index = app.view.start >= 0 ? app.view.start : 0;
      renderPlay();
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closePlay));
    els.playModal.addEventListener('click', e => { if (e.target === els.playModal) closePlay(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.playModal.hidden) closePlay(); });
    els.shapeResetBtn.addEventListener('click', () => { Ccfolia.resetShape(); renderShape(); });
    document.querySelectorAll('[data-lines]').forEach(btn => btn.addEventListener('click', () => {
      app.lines = btn.dataset.lines;
      document.querySelectorAll('[data-lines]').forEach(b => b.classList.toggle('is-active', b === btn));
      drawLinks();
    }));
    // ZIPをページに落としても読み込めるように
    document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    document.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /\.zip$/i.test(f.name)) { e.preventDefault(); importZip(f); }
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => drawLinks()).observe(els.graph);
    else window.addEventListener('resize', drawLinks);
  }

  function init() {
    app.lang = detectLang();
    app.settings = loadSettings();
    bind();
    applyLanguage();
    rebuild();
  }

  init();
})();
