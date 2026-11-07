/* KPレス・ジュークボックスメーカー — 画面
 * 全シーンを並べ、マーカーパネルのクリックアクション「/scene 名前」を
 * 呼び出し先のシーンへの線として描く。 */
(function () {
  'use strict';

  const VERSION = '0.23';
  const LAYOUT_KEY = 'ccfoliaJukebox.layout';
  const PANELS = ['scenes', 'stage', 'settings'];
  const STORAGE_KEY = 'ccfoliaJukebox.v1';
  const BACKDROP_KEY = 'ccfoliaJukebox.backdrop';
  const LANG_KEY = 'ccfoliaJukeboxLang';
  const LANGS = ['ja', 'en', 'ko'];
  const MAX_DISKS = Jukebox.MAX_DISKS;
  const IMPORT_COLORS = ['#e3b938', '#5fb98a', '#5a80b8', '#e07a3c', '#d98aa0', '#4f9a96', '#8a62a8', '#c0483c', '#b0b0b0', '#e8d3a8'];

  const $ = id => document.getElementById(id);
  const els = {
    helpBtn: $('helpBtn'), helpDrawer: $('helpDrawer'), helpList: $('helpList'), helpNotes: $('helpNotes'),
    importBtn: $('importBtn'), importFile: $('importFile'), backBtn: $('backBtn'),
    playBtn: $('playBtn'), exportBtn: $('exportBtn'),
    jukeboxPanel: $('jukeboxPanel'), importPanel: $('importPanel'), importName: $('importName'),
    roomName: $('roomName'), stopName: $('stopName'), diskCount: $('diskCount'), diskCountOut: $('diskCountOut'), showCover: $('showCover'),
    backdropField: $('backdropField'), backdropThumb: $('backdropThumb'), backdropImg: $('backdropImg'), backdropOpen: $('backdropOpen'), backdropClear: $('backdropClear'), backdropFile: $('backdropFile'),
    diskList: $('diskList'), resetBtn: $('resetBtn'),
    shapeLabel: $('shapeLabel'), shapeResetBtn: $('shapeResetBtn'),
    graph: $('layout'), layout: $('layout'), layoutResetBtn: $('layoutResetBtn'), settingsTitle: $('settingsTitle'), sceneGrid: $('sceneGrid'), linkLayer: $('linkLayer'), graphCount: $('graphCount'), warnBox: $('warnBox'),
    detailTitle: $('detailTitle'), detailBoard: $('detailBoard'), inspectorBody: $('inspectorBody'),
    playModal: $('playModal'), playScene: $('playScene'), playBgm: $('playBgm'), playBoard: $('playBoard'),
    playChat: $('playChat'), playRestart: $('playRestart'), soundToggle: $('soundToggle'),
    coverModal: $('coverModal'), coverPresets: $('coverPresets'), coverTitle: $('coverTitle'), cropCanvas: $('cropCanvas'), cropDrop: $('cropDrop'), cropEmpty: $('cropEmpty'),
    cropZoom: $('cropZoom'), cropOpen: $('cropOpen'), cropFile: $('cropFile'), cropFit: $('cropFit'), cropOk: $('cropOk'), cropRemove: $('cropRemove'),
    toastHost: $('toastHost')
  };

  const app = {
    lang: 'ja',
    settings: null,
    files: [],          // 音声ファイル（レコードの順番と同じ。IndexedDB に保存）
    stageSound: false,  // シーンを選んだらそのBGMをページで鳴らす
    room: null,         // ジュークボックスから組み立てた部屋
    imported: null,     // { name, data, files }
    view: null,         // 画面に出すシーン一覧
    selected: 0,        // 大きく表示しているシーン
    marker: -1,         // 選んでいるパネル
    hover: -1,          // マウスを乗せているパネル
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

  // プリセット写真の撮影者と写真ページへのリンク（Unsplash の帰属表示）
  function renderPhotoCredits() {
    const el = document.getElementById('photoCredits');
    if (!el) return;
    el.innerHTML = t('footer.photos');
    const names = dict().defaultNames;
    Jukebox.PHOTOS.forEach((p, i) => {
      if (i) el.appendChild(document.createTextNode(' / '));
      el.append(h('a', { href: p.photoUrl, target: '_blank', rel: 'noopener' }, names[i]), ': ',
        h('a', { href: p.authorUrl, target: '_blank', rel: 'noopener' }, p.author));
    });
  }

  function applyLanguage() {
    const d = dict();
    document.documentElement.lang = app.lang;
    document.title = d.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', d.meta.description);
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(node => { node.innerHTML = t(node.dataset.i18nHtml); });
    renderPhotoCredits();
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

  // 1回だけ再生するAPNG（針が下りる）は、同じURLだと再生済みの状態を使い回してしまう。
  // 盤面ごと（大きな盤面・テストプレイ）に、シーンに入るたびに新しいURLを作り直す
  const freshCache = {};
  function freshUrlOf(context, sceneKey, mi, blob) {
    let c = freshCache[context];
    if (!c || c.key !== sceneKey) {
      if (c) c.urls.forEach(url => URL.revokeObjectURL(url));
      c = freshCache[context] = { key: sceneKey, urls: new Map() };
    }
    if (!c.urls.has(mi)) c.urls.set(mi, URL.createObjectURL(blob));
    return c.urls.get(mi);
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
      count: Jukebox.PHOTOS.length,
      showCover: true,
      // マーダーミステリー向けの12テーマ（ラベル色と写真ジャケット付き）
      disks: Jukebox.PHOTOS.map((p, i) => ({ color: p.color, name: d.defaultNames[i], bgm: '', url: '', cover: { style: 'photo', photo: p.id } }))
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
        bgm: typeof s.bgm === 'string' ? s.bgm : '',
        url: typeof s.url === 'string' ? s.url : '',
        cover: readCover(s.cover)
      };
    });
    return {
      roomName: typeof saved.roomName === 'string' ? saved.roomName : base.roomName,
      stopName: typeof saved.stopName === 'string' ? saved.stopName : base.stopName,
      count: Math.min(MAX_DISKS, Math.max(1, Number(saved.count) || base.count)),
      showCover: saved.showCover !== false,
      disks
    };
  }

  function readCover(c) {
    if (!c || typeof c !== 'object') return { style: 'plain' };
    if (c.style === 'image' && typeof c.image === 'string' && c.image.startsWith('data:image/')) return { style: 'image', image: c.image };
    if (c.style === 'photo' && Jukebox.photoOf(c.photo)) return { style: 'photo', photo: c.photo };
    return { style: Jukebox.COVER_STYLES.includes(c.style) ? c.style : 'plain' };
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

  const GRIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

  // レコードの順番を入れ替える（設定・音声ファイル・切り抜きの元画像をいっしょに動かす）
  function moveDisk(from, to) {
    const n = app.settings.count;
    if (to < 0 || to >= n || from === to) return false;
    [app.settings.disks, app.files, crop.sources].forEach(list => {
      while (list.length < n) list.push(list === app.settings.disks ? undefined : null);
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
    });
    changed(true);
    saveFiles();
    return true;
  }

  // つまみをドラッグして並べ替え。ドラッグ中は行を入れ替えて見せ、離したら確定
  function startDiskDrag(e, from) {
    if (e.button !== 0) return;
    e.preventDefault();
    const list = els.diskList;
    const row = list.children[from];
    if (!row) return;
    row.classList.add('is-dragging');
    list.classList.add('is-sorting');
    const move = ev => {
      const rows = [...list.children].filter(r => r !== row);
      const y = ev.clientY;
      const after = rows.find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
      if (after) { if (after !== row.nextSibling) list.insertBefore(row, after); }
      else if (row !== list.lastElementChild) list.appendChild(row);
      // パネルの端に近づいたら自動でスクロール
      const panel = list.closest('.panel');
      if (panel) {
        const pr = panel.getBoundingClientRect();
        if (y < pr.top + 60) panel.scrollTop -= 12;
        else if (y > pr.bottom - 40) panel.scrollTop += 12;
      }
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      row.classList.remove('is-dragging');
      list.classList.remove('is-sorting');
      const to = [...list.children].indexOf(row);
      if (!moveDisk(from, to)) renderSettings();
    };
    // 行を DOM の中で動かすとポインターキャプチャが外れるので、window で受ける
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function renderSettings() {
    const s = app.settings;
    els.roomName.value = s.roomName;
    els.stopName.value = s.stopName;
    els.diskCount.value = String(s.count);
    els.diskCountOut.textContent = String(s.count);
    els.showCover.checked = s.showCover !== false;
    els.diskList.classList.toggle('no-cover', s.showCover === false);
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
        if (f) { app.files[i] = f; changed(true); saveFiles(); }
      });
      const grip = h('button', {
        type: 'button', class: 'disk-grip', 'aria-label': t('set.reorder', { n: i + 1 }), title: t('set.reorder', { n: i + 1 }),
        onkeydown: e => {
          const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
          if (!d) return;
          e.preventDefault();
          if (moveDisk(i, i + d)) requestAnimationFrame(() => { const g = els.diskList.querySelectorAll('.disk-grip')[i + d]; if (g) g.focus(); });
        }
      });
      grip.innerHTML = GRIP_SVG;
      grip.addEventListener('pointerdown', e => startDiskDrag(e, i));
      const row = h('li', { class: 'disk-row', style: { '--disk': color.line }, dataset: { index: String(i) } },
        grip,
        s.showCover === false
          ? h('span', { class: 'disk-thumb', dataset: { preview: String(i) } })
          : h('button', { type: 'button', class: 'disk-thumb', dataset: { preview: String(i) }, title: t('cover.upload'), onclick: () => openCropper(i) }),
        h('div', { class: 'disk-fields' },
          h('input', {
            class: 'text-input', type: 'text', maxlength: '40', value: disk.name, 'aria-label': `${t('set.diskName')} ${i + 1}`,
            oninput: e => { disk.name = e.target.value; changed(false); }
          }),
          h('input', {
            class: 'text-input small', type: 'text', maxlength: '60', value: disk.bgm || '', placeholder: t('set.bgmTitlePh'), 'aria-label': `${t('set.bgmTitle')} ${i + 1}`,
            oninput: e => { disk.bgm = e.target.value; changed(false); }
          }),
          swatches,
          h('div', { class: 'bgm-row' },
            file
              ? h('span', { class: 'bgm-file' }, `♪ ${file.name}`, h('button', { type: 'button', class: 'text-button', onclick: () => { app.files[i] = null; changed(true); saveFiles(); } }, t('set.bgmFileClear')))
              : h('input', {
                class: 'text-input small', type: 'url', value: disk.url, placeholder: t('set.bgmUrlPh'), 'aria-label': t('set.bgmUrl'),
                oninput: e => { disk.url = e.target.value; changed(false); syncBgmUi(); }
              }),
            h('label', { class: 'ghost-button small file-button' }, t('set.bgmFile'), fileInput),
            h('button', { type: 'button', class: 'bgm-play', dataset: { index: String(i) }, onclick: () => toggleDiskPreview(i) })
          ),
        ));
      // 画像ファイルを行に落とすと、そのレコードのジャケットにする
      row.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); row.classList.add('is-drop'); } });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop'));
      row.addEventListener('drop', e => {
        row.classList.remove('is-drop');
        const f = imageFile(e);
        if (!f || s.showCover === false) return;
        e.preventDefault();
        e.stopPropagation();
        openCropper(i, f);
      });
      els.diskList.appendChild(row);
    });
    refreshPreviews();
    syncBgmUi();
  }

  // 設定欄のサムネイル（ジャケット＋レコード＋曲名）を描き直す
  let previewSeq = 0;
  async function refreshPreviews() {
    const seq = ++previewSeq;
    const disks = activeDisks();
    for (let i = 0; i < disks.length; i += 1) {
      const holder = els.diskList.querySelector(`[data-preview="${i}"]`);
      if (!holder) continue;
      let c;
      try { c = await Jukebox.slotPreview(disks[i], app.settings.showCover !== false); } catch (error) { continue; }
      if (seq !== previewSeq) return;
      c.classList.add('disk-thumb-art');
      holder.replaceChildren(c);
    }
  }

  const hasFiles = e => Boolean(e.dataTransfer && [...e.dataTransfer.types].includes('Files'));
  const imageFile = e => {
    const files = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [];
    return files.find(f => /^image\//.test(f.type)) || null;
  };

  /* ================= ジャケット画像の切り抜き ================= */

  const crop = { session: 0, index: -1, preset: null, presetView: null, img: null, scale: 1, min: 1, ox: 0, oy: 0, pointers: new Map(), pinch: 0, sources: [] };

  function openCropper(index, file) {
    crop.session += 1;
    crop.index = index;
    crop.img = null;
    els.coverModal.hidden = false;
    els.cropFile.value = '';
    const disk = app.settings.disks[index];
    els.coverTitle.textContent = t('cover.title', { name: disk.name || '' });
    crop.preset = null;
    crop.presetView = null;
    renderCoverPresets();
    const source = crop.sources[index];
    if (file) loadCropFile(file);
    else if (source) setCropImage(source.img, source);
    else if (disk.cover && ((disk.cover.style === 'image' && disk.cover.image) || disk.cover.style === 'photo')) {
      const session = crop.session;
      if (disk.cover.style === 'photo') { loadPresetPhoto(disk.cover.photo); return; }
      Jukebox.loadImage(disk.cover.image).then(img => { if (session === crop.session) setCropImage(img); }).catch(() => drawCrop());
    }
    else drawCrop();
  }

  // ダイアログの左側：プリセット写真と見本デザイン。写真は右で切り抜きを調整でき、見本デザインはそのまま決まる
  function renderCoverPresets() {
    const box = els.coverPresets;
    box.innerHTML = '';
    const disk = app.settings.disks[crop.index];
    if (!disk) return;
    const cover = disk.cover || { style: 'plain' };
    const color = Jukebox.colorOf(disk.color);
    const names = dict().defaultNames;
    box.append(
      h('h3', { class: 'cover-presets-title', id: 'coverPresetsTitle' }, t('cover.photos')),
      h('div', { class: 'cover-grid', role: 'radiogroup', 'aria-label': t('cover.photos') }, Jukebox.PHOTOS.map((p, pi) => {
        const on = crop.preset ? crop.preset === p.id : (cover.style === 'photo' && cover.photo === p.id);
        const label = t('cover.photo', { name: names[pi], author: p.author });
        return h('button', {
          type: 'button', class: `cover-chip cover-photo${on ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(on), title: label, 'aria-label': label,
          onclick: () => loadPresetPhoto(p.id)
        }, h('img', { src: Jukebox.photoUrl(p.id), alt: '', loading: 'lazy' }));
      })),
      h('h3', { class: 'cover-presets-title' }, t('cover.patterns')),
      h('div', { class: 'cover-grid', role: 'radiogroup', 'aria-label': t('cover.patterns') }, Jukebox.COVER_STYLES.map(style => {
        const chip = h('canvas', { width: '88', height: '85', class: 'cover-chip-art' });
        const cx = chip.getContext('2d');
        if (style === 'plain') { cx.fillStyle = '#f3f1ec'; cx.fillRect(0, 0, 88, 85); } else Jukebox.drawPattern(cx, 88, 85, style, color.line);
        const on = !crop.preset && cover.style === style;
        return h('button', {
          type: 'button', class: `cover-chip${on ? ' is-on' : ''}`, role: 'radio', 'aria-checked': String(on), title: t(`cover.styles.${style}`), 'aria-label': t(`cover.styles.${style}`),
          onclick: () => {
            const index = crop.index;
            app.settings.disks[index].cover = { style };
            crop.sources[index] = null;
            closeCropper();
            changed(true);
          }
        }, chip);
      })));
  }

  function loadPresetPhoto(id) {
    crop.session += 1;
    const session = crop.session;
    crop.preset = id;
    // 読み込みが終わるまでは前の画像で決定できないように、いったん空にする
    crop.img = null;
    crop.presetView = null;
    syncZoom();
    drawCrop();
    renderCoverPresets();
    Jukebox.loadImage(Jukebox.photoUrl(id)).then(img => {
      if (session !== crop.session) return;
      setCropImage(img);
      crop.presetView = { scale: crop.scale, ox: crop.ox, oy: crop.oy };
    }).catch(() => drawCrop());
  }

  function closeCropper() {
    els.coverModal.hidden = true;
    crop.session += 1;
    crop.index = -1;
  }

  function loadCropFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast(t('cover.notImage'), 'error'); return; }
    if (crop.preset) { crop.preset = null; crop.presetView = null; renderCoverPresets(); }
    // 読み込み中に閉じたり別の画像を選んだりしたら、古い読み込みの結果は捨てる
    crop.session += 1;
    const session = crop.session;
    crop.img = null;
    syncZoom();
    drawCrop();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { if (session === crop.session) setCropImage(img); };
    img.onerror = () => { if (session === crop.session) toast(t('cover.notImage'), 'error'); };
    img.src = url;
  }

  function setCropImage(img, view) {
    const { w, h: hh } = Jukebox.SLEEVE;
    crop.img = img;
    crop.min = Math.max(w / img.naturalWidth, hh / img.naturalHeight);
    if (view) {
      crop.scale = view.scale;
      crop.ox = view.ox;
      crop.oy = view.oy;
    } else {
      crop.scale = crop.min;
      crop.ox = (w - img.naturalWidth * crop.scale) / 2;
      crop.oy = (hh - img.naturalHeight * crop.scale) / 2;
    }
    clampCrop();
    syncZoom();
    drawCrop();
  }

  function clampCrop() {
    if (!crop.img) return;
    const { w, h: hh } = Jukebox.SLEEVE;
    crop.scale = Math.max(crop.min, Math.min(crop.min * 8, crop.scale));
    const iw = crop.img.naturalWidth * crop.scale;
    const ih = crop.img.naturalHeight * crop.scale;
    crop.ox = Math.min(0, Math.max(w - iw, crop.ox));
    crop.oy = Math.min(0, Math.max(hh - ih, crop.oy));
  }

  function zoomAt(factor, px, py) {
    if (!crop.img) return;
    // 倍率だけを先に範囲に収め、位置は元の値から計算してから収める
    const before = crop.scale;
    const next = Math.max(crop.min, Math.min(crop.min * 8, before * factor));
    crop.scale = next;
    const k = next / before;
    crop.ox = px - (px - crop.ox) * k;
    crop.oy = py - (py - crop.oy) * k;
    clampCrop();
    syncZoom();
    drawCrop();
  }

  function syncZoom() {
    els.cropZoom.disabled = !crop.img;
    els.cropZoom.value = crop.img ? String(Math.round((Math.log(crop.scale / crop.min) / Math.log(8)) * 100)) : '0';
  }

  let sleeveImg = null;
  function drawCrop() {
    const c = els.cropCanvas;
    const ctx = c.getContext('2d');
    const { w, h: hh } = Jukebox.SLEEVE;
    ctx.clearRect(0, 0, w, hh);
    els.cropEmpty.hidden = Boolean(crop.img);
    els.cropOk.disabled = !crop.img;
    if (crop.img) ctx.drawImage(crop.img, crop.ox, crop.oy, crop.img.naturalWidth * crop.scale, crop.img.naturalHeight * crop.scale);
    if (!sleeveImg) {
      Jukebox.loadImage(Jukebox.assetUrl('sleeve.png')).then(img => { sleeveImg = img; drawCrop(); }).catch(() => {});
      return;
    }
    // 紙の質感を重ね、ジャケットの外（右の切り欠きなど）は暗くする
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(sleeveImg, 0, 0, w, hh);
    ctx.globalCompositeOperation = 'source-over';
    const shadeCanvas = document.createElement('canvas');
    shadeCanvas.width = w;
    shadeCanvas.height = hh;
    const sctx = shadeCanvas.getContext('2d');
    sctx.fillStyle = 'rgba(12,12,14,0.72)';
    sctx.fillRect(0, 0, w, hh);
    sctx.globalCompositeOperation = 'destination-out';
    sctx.drawImage(sleeveImg, 0, 0, w, hh);
    ctx.drawImage(shadeCanvas, 0, 0);
  }

  function canvasPoint(e) {
    const r = els.cropCanvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * Jukebox.SLEEVE.w, y: ((e.clientY - r.top) / r.height) * Jukebox.SLEEVE.h };
  }

  function applyCrop() {
    if (crop.index < 0 || !crop.img) return;
    const v = crop.presetView;
    if (crop.preset && v && Math.abs(v.scale - crop.scale) < 1e-6 && Math.abs(v.ox - crop.ox) < 0.5 && Math.abs(v.oy - crop.oy) < 0.5) {
      // プリセット写真を動かさずに決めたときは、画像を埋め込まずに写真の指定だけを残す
      const index = crop.index;
      app.settings.disks[index].cover = { style: 'photo', photo: crop.preset };
      crop.sources[index] = null;
      closeCropper();
      changed(true);
      return;
    }
    const { w, h: hh } = Jukebox.SLEEVE;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = hh;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, hh);
    ctx.drawImage(crop.img, crop.ox, crop.oy, crop.img.naturalWidth * crop.scale, crop.img.naturalHeight * crop.scale);
    const index = crop.index;
    app.settings.disks[index].cover = { style: 'image', image: out.toDataURL('image/jpeg', 0.88) };
    crop.sources[index] = { img: crop.img, scale: crop.scale, ox: crop.ox, oy: crop.oy };
    closeCropper();
    changed(true);
    track('ccfolia_jukebox_cover_image');
  }

  function bindCropper() {
    const c = els.cropCanvas;
    c.addEventListener('pointerdown', e => {
      if (!crop.img) { els.cropFile.click(); return; }
      c.setPointerCapture(e.pointerId);
      crop.pointers.set(e.pointerId, canvasPoint(e));
      if (crop.pointers.size === 2) {
        const [a, b] = [...crop.pointers.values()];
        crop.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    c.addEventListener('pointermove', e => {
      if (!crop.pointers.has(e.pointerId)) return;
      const prev = crop.pointers.get(e.pointerId);
      const p = canvasPoint(e);
      crop.pointers.set(e.pointerId, p);
      if (crop.pointers.size === 1) {
        crop.ox += p.x - prev.x;
        crop.oy += p.y - prev.y;
        clampCrop();
        drawCrop();
      } else if (crop.pointers.size === 2) {
        const [a, b] = [...crop.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (crop.pinch) zoomAt(dist / crop.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        crop.pinch = dist;
      }
    });
    const up = e => { crop.pointers.delete(e.pointerId); if (crop.pointers.size < 2) crop.pinch = 0; };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', e => {
      if (!crop.img) return;
      e.preventDefault();
      const p = canvasPoint(e);
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
    els.cropZoom.addEventListener('input', () => {
      if (!crop.img) return;
      const target = crop.min * Math.pow(8, Number(els.cropZoom.value) / 100);
      zoomAt(target / crop.scale, Jukebox.SLEEVE.w / 2, Jukebox.SLEEVE.h / 2);
    });
    els.cropOpen.addEventListener('click', () => els.cropFile.click());
    els.cropFile.addEventListener('change', () => { const f = els.cropFile.files && els.cropFile.files[0]; if (f) loadCropFile(f); });
    els.cropFit.addEventListener('click', () => { if (crop.img) setCropImage(crop.img); });
    els.cropOk.addEventListener('click', applyCrop);
    els.cropRemove.addEventListener('click', () => {
      if (crop.index < 0) return;
      app.settings.disks[crop.index].cover = { style: 'plain' };
      crop.sources[crop.index] = null;
      closeCropper();
      changed(true);
    });
    els.coverModal.querySelectorAll('[data-close-cover]').forEach(btn => btn.addEventListener('click', closeCropper));
    els.coverModal.addEventListener('click', e => { if (e.target === els.coverModal) closeCropper(); });
    const drop = els.cropDrop;
    drop.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); drop.classList.add('is-drop'); } });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-drop'));
    drop.addEventListener('drop', e => {
      drop.classList.remove('is-drop');
      const f = imageFile(e);
      e.preventDefault();
      e.stopPropagation();
      if (f) loadCropFile(f);
      else toast(t('cover.notImage'), 'error');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.coverModal.hidden) closeCropper(); });
  }

  // rerender=true は設定欄も描き直す（色・枚数・ファイル）
  function changed(rerender) {
    saveSettings();
    if (rerender) renderSettings();
    clearTimeout(app.buildTimer);
    app.buildTimer = setTimeout(rebuild, rerender ? 120 : 260);
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
      showCover: s.showCover !== false,
      backdrop: app.backdrop || '',
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
    refreshPreviews();
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
    // 部屋の今の盤面と同じマーカーを持つシーンを「今のシーン」とみなす
    const roomKeys = Object.keys(room.markers || {}).sort().join('|');
    const sceneList = Object.values(ents.scenes || {}).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    let current = roomKeys ? sceneList.findIndex(sc => Object.keys(sc.markers || {}).sort().join('|') === roomKeys) : -1;
    if (current < 0 && room.backgroundUrl) current = sceneList.findIndex(sc => sc.backgroundUrl === room.backgroundUrl);
    return {
      kind: 'import',
      name: imported.name,
      fieldWidth: fw,
      fieldHeight: fh,
      start: current,
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
      const src = opts.fresh && m.restart && m.image && m.image.blob ? freshUrlOf(opts.fresh, opts.sceneKey, mi, m.image.blob) : m.imgUrl;
      if (src) node.appendChild(h('img', { src, alt: m.text || '', draggable: 'false' }));
      else node.appendChild(h('span', { class: 'marker-text' }, m.text || ''));
      board.appendChild(node);
    });
    return board;
  }

  // スクリーンパネルは全シーンに出るので、盤面に重ねて表示する
  function withShared(scene) {
    if (!scene || !app.view.shared) return scene;
    return { ...scene, markers: [...scene.markers, ...app.view.shared.markers.map(m => ({ ...m, shared: true, ref: m.ref, _src: m }))] };
  }

  function sceneThumb(scene, i) {
    const selected = app.selected === i;
    const links = scene.markers.reduce((n, m) => n + Ccfolia.sceneTargets(m.action).length, 0);
    return h('li', null, h('button', {
      type: 'button',
      class: `scene-thumb${selected ? ' is-selected' : ''}`,
      dataset: { scene: String(i) },
      style: { '--scene': scene.color },
      'aria-pressed': String(selected),
      onclick: () => selectScene(i)
    },
    boardEl(scene, { className: 'board-thumb' }),
    h('span', { class: 'thumb-info' },
      h('span', { class: 'scene-head' },
        h('span', { class: 'scene-dot' }),
        h('span', { class: 'scene-name' }, scene.name || '—')),
      h('span', { class: 'thumb-meta' },
        app.view.start === i ? h('span', { class: 'scene-badge' }, t(app.view.kind === 'import' ? 'graph.current' : 'graph.start')) : null,
        links ? h('span', { class: 'scene-links' }, `→${links}`) : null))));
  }

  function selectScene(i) {
    if (app.selected === i) return;
    app.selected = i;
    app.marker = -1;
    els.sceneGrid.querySelectorAll('.scene-thumb').forEach(btn => {
      const on = Number(btn.dataset.scene) === i;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    renderDetail();
    syncStageBgm();
  }

  function renderAll() {
    if (!app.view) return;
    els.jukeboxPanel.hidden = Boolean(app.imported);
    els.importPanel.hidden = !app.imported;
    els.backBtn.hidden = !app.imported;
    if (app.imported) els.importName.textContent = app.imported.name;
    els.settingsTitle.textContent = t(app.imported ? 'io.importedTitle' : 'set.heading');
    els.sceneGrid.innerHTML = '';
    app.view.scenes.forEach((scene, i) => els.sceneGrid.appendChild(sceneThumb(scene, i)));
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
    renderDetail();
    if (els.playModal.hidden && (!bgm.owner || bgm.owner === 'stage')) syncStageBgm();
    else syncBgmUi();
  }

  function currentScene() {
    return withShared(app.view.scenes[app.selected] || app.view.scenes[0]);
  }

  /* ---------- 線（大きな盤面のパネル → 一覧のサムネイル） ---------- */

  function drawLinks() {
    const layer = els.linkLayer;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!app.view) return;
    const scene = currentScene();
    if (!scene) return;
    const box = els.graph.getBoundingClientRect();
    layer.setAttribute('width', String(box.width));
    layer.setAttribute('height', String(box.height));
    layer.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const thumbs = new Map();
    els.sceneGrid.querySelectorAll('.scene-thumb').forEach(btn => thumbs.set(Number(btn.dataset.scene), btn));
    const focus = app.hover >= 0 ? app.hover : app.marker;
    // 一覧が盤面の横に並んでいないとき（狭い画面で折り返したとき）は線が重なりすぎるので、選んだパネルの線だけにする
    const stagePanel = els.layout.querySelector('[data-panel="stage"]');
    const scenesPanel = els.layout.querySelector('[data-panel="scenes"]');
    const narrow = Math.abs(stagePanel.offsetTop - scenesPanel.offsetTop) > 40;
    // パネルが縦にスクロールするとき、見えていない端点はパネルの見えている範囲の端に寄せる
    const viewOf = panel => {
      const r = panel.getBoundingClientRect();
      const bar = panel.querySelector('.panel-bar');
      const barBottom = bar ? bar.getBoundingClientRect().bottom : r.top;
      return { top: Math.max(r.top, barBottom) - box.top, bottom: r.bottom - box.top };
    };
    const scenesView = viewOf(scenesPanel);
    const stageView = viewOf(stagePanel);
    const clampY = (y, v) => Math.min(Math.max(y, v.top + 4), v.bottom - 4);
    const back = svg('g', { class: 'links-back' });
    const front = svg('g', { class: 'links-front' });
    layer.appendChild(back);
    layer.appendChild(front);
    scene.markers.forEach((m, mi) => {
      Ccfolia.sceneTargets(m.action).forEach(name => {
        const hot = mi === focus;
        if ((app.lines === 'selected' || narrow) && !hot) return;
        const markerEl = els.detailBoard.querySelector(`.marker[data-mi="${mi}"]`);
        if (!markerEl) return;
        const mr = markerEl.getBoundingClientRect();
        const sx = mr.left + mr.width / 2 - box.left;
        const rawSy = mr.top + mr.height / 2 - box.top;
        const sy = clampY(rawSy, stageView);
        const to = sceneIndexByName(name);
        const thumb = thumbs.get(to);
        const color = to >= 0 ? app.view.scenes[to].color : '#e2675f';
        let tx;
        let ty;
        let d;
        let targetOff = false;
        if (thumb && to !== app.selected) {
          const r = thumb.getBoundingClientRect();
          const left = r.left - box.left;
          const right = r.right - box.left;
          const top = r.top - box.top;
          const bottom = r.bottom - box.top;
          if (left > sx + 20 || right < sx - 20) {
            // 一覧が横にあるときは、近い側の辺の真ん中へ
            const toRight = left > sx;
            tx = toRight ? left - 2 : right + 2;
            const rawTy = top + (bottom - top) / 2;
            ty = clampY(rawTy, scenesView);
            targetOff = rawTy !== ty;
            const dx = Math.max(60, Math.abs(tx - sx) * 0.5) * (toRight ? 1 : -1);
            d = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
          } else {
            const below = top > sy;
            tx = left + (right - left) / 2;
            ty = below ? top - 2 : bottom + 2;
            const dy = Math.max(60, Math.abs(ty - sy) * 0.5) * (below ? 1 : -1);
            d = `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
          }
        } else if (to < 0) {
          tx = sx + 22;
          ty = sy - 22;
          d = `M ${sx} ${sy} L ${tx} ${ty}`;
        } else {
          return;
        }
        const g = hot ? front : back;
        const off = rawSy !== sy || targetOff;
        g.appendChild(svg('path', { d, class: `link${hot ? ' is-hot' : ''}${to < 0 ? ' is-missing' : ''}${off ? ' is-off' : ''}`, stroke: color }));
        g.appendChild(svg('circle', { cx: sx, cy: sy, r: hot ? 4.5 : 3, fill: color, class: 'link-dot' }));
        g.appendChild(svg('circle', { cx: tx, cy: ty, r: hot ? 5 : 3.5, fill: hot ? color : 'none', stroke: color, 'stroke-width': 2, class: 'link-dot' }));
      });
    });
    els.sceneGrid.querySelectorAll('.scene-thumb').forEach(btn => btn.classList.remove('is-target'));
    const fm = scene.markers[focus];
    if (fm) Ccfolia.sceneTargets(fm.action).forEach(name => { const el = thumbs.get(sceneIndexByName(name)); if (el) el.classList.add('is-target'); });
  }

  /* ---------- 大きな盤面 ---------- */

  function renderDetail() {
    const scene = currentScene();
    if (!scene) return;
    els.detailTitle.textContent = scene.name || '—';
    els.detailTitle.style.setProperty('--scene', scene.color);
    const sound = sceneSound(app.selected);
    if (sound) els.detailTitle.appendChild(h('span', { class: 'stage-bgm', dataset: { src: sound.src } }, t('sound.now', { name: sound.name })));
    els.detailBoard.innerHTML = '';
    const board = boardEl(scene, {
      interactive: true,
      className: 'board-large',
      fresh: 'main',
      sceneKey: `${app.buildSeq}:${app.selected}`,
      selectedMarker: app.marker,
      onMarker: mi => {
        // クリックでパネルの中身、すばやく2回クリックでその先のシーンへ（クリックのたびに盤面を描き直すので dblclick ではなく時間で判定）
        const now = Date.now();
        const twice = app.lastMarkerClick && app.lastMarkerClick.mi === mi && now - app.lastMarkerClick.at < 400;
        app.lastMarkerClick = twice ? null : { mi, at: now };
        if (twice) {
          const to = Ccfolia.sceneTargets(scene.markers[mi] && scene.markers[mi].action).map(sceneIndexByName).find(i => i >= 0);
          if (to !== undefined && to !== app.selected) { selectScene(to); return; }
        }
        app.marker = mi;
        renderDetail();
      }
    });
    board.querySelectorAll('.marker').forEach(node => {
      const mi = Number(node.dataset.mi);
      node.addEventListener('mouseenter', () => { app.hover = mi; drawLinks(); });
      node.addEventListener('mouseleave', () => { app.hover = -1; drawLinks(); });
    });
    els.detailBoard.appendChild(board);
    renderInspector(scene);
    requestAnimationFrame(drawLinks);
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
    const wrap = h('div', { class: 'insp-grid' });
    body.appendChild(wrap);
    if (m.imgUrl) wrap.appendChild(h('img', { class: 'insp-thumb', src: m.imgUrl, alt: '' }));
    const col = h('div', { class: 'insp-col' });
    wrap.appendChild(col);
    if (m.shared) col.appendChild(h('p', { class: 'insp-tag' }, t('graph.shared')));
    if (m.text) {
      col.appendChild(h('p', { class: 'field-label' }, t('insp.text')));
      col.appendChild(h('p', { class: 'insp-text' }, m.text));
    }
    col.appendChild(h('p', { class: 'field-label' }, t('insp.action')));
    if (app.view.kind === 'import') {
      const area = h('textarea', { class: 'text-input insp-action', rows: '2', 'aria-label': t('insp.edit') });
      area.value = m.action;
      area.addEventListener('change', () => {
        const target = m._src || m;
        target.action = area.value;
        m.action = area.value;
        m.ref.clickAction = Ccfolia.buildClickAction(area.value);
        renderAll();
      });
      col.appendChild(area);
    } else {
      col.appendChild(h('p', { class: 'insp-code' }, m.action || t('insp.actionNone')));
    }
    Ccfolia.sceneTargets(m.action).forEach(name => {
      const idx = sceneIndexByName(name);
      col.appendChild(idx >= 0
        ? h('button', { type: 'button', class: 'jump-link', style: { '--scene': app.view.scenes[idx].color }, onclick: () => selectScene(idx) }, t('insp.jumpsTo', { name }))
        : h('p', { class: 'jump-missing' }, t('insp.missing', { name })));
    });
    if (app.view.kind === 'jukebox') col.appendChild(h('p', { class: 'muted-note' }, t('insp.jukeboxNote')));
  }

  /* ================= BGM をページで鳴らす ================= */

  // 音声ファイルの URL はレコードを組み立て直しても変わらないように別に持つ
  const fileUrls = new WeakMap();
  function fileUrl(file) {
    if (!fileUrls.has(file)) fileUrls.set(file, URL.createObjectURL(file));
    return fileUrls.get(file);
  }

  function youtubeId(url) {
    const m = String(url).match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    return m ? m[1] : '';
  }

  // レコード i のBGM（音声ファイルがあればそちらを優先）
  function diskSound(i) {
    const disk = app.settings.disks[i];
    if (!disk || i >= app.settings.count) return null;
    const title = String(disk.bgm || '').trim();
    const file = app.files[i];
    if (file) return { src: fileUrl(file), name: title || file.name || disk.name };
    const url = String(disk.url || '').trim();
    if (!/^https?:\/\/\S+$/i.test(url)) return null;
    return { src: url, name: title || disk.name || url };
  }

  // シーン i のBGM。ジュークボックスはシーン0が停止中で、1からがレコード
  function sceneSound(i) {
    if (!app.view) return null;
    if (app.view.kind === 'jukebox') return i > 0 ? diskSound(i - 1) : null;
    const scene = app.view.scenes[i];
    return scene && scene.soundUrl ? { src: scene.soundUrl, name: (scene.sound && scene.sound.name) || scene.name } : null;
  }

  // ページ全体で鳴らす曲は1つだけ。owner は 'stage'（大きな盤面）・'disk:N'（試聴）・'play'（テストプレイ）
  const bgm = { audio: new Audio(), frame: null, src: '', owner: '' };
  bgm.audio.loop = true;
  bgm.audio.volume = 0.5;
  bgm.audio.addEventListener('error', () => {
    if (!bgm.src || bgm.frame) return;
    toast(t('sound.failed'), 'error');
    stopBgm();
  });

  function playBgm(sound, owner) {
    if (!sound) { stopBgm(); return; }
    if (bgm.src === sound.src) { bgm.owner = owner; syncBgmUi(); return; }
    stopBgm(true);
    bgm.src = sound.src;
    bgm.owner = owner;
    const yt = youtubeId(sound.src);
    if (yt) {
      // YouTube は音声だけ取り出せないので、見えない埋め込みプレイヤーで鳴らす
      bgm.frame = h('iframe', {
        class: 'bgm-frame', title: sound.name, tabindex: '-1', 'aria-hidden': 'true', allow: 'autoplay; encrypted-media',
        src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&loop=1&playlist=${yt}&controls=0&playsinline=1`
      });
      document.body.appendChild(bgm.frame);
    } else {
      bgm.audio.src = sound.src;
      bgm.audio.play().catch(error => {
        // 自動再生が止められたときは、次にボタンを押すまで待つ
        if (error && error.name === 'NotAllowedError' && bgm.src === sound.src) { bgm.src = ''; bgm.owner = ''; syncBgmUi(); }
      });
    }
    syncBgmUi();
  }

  function stopBgm(quiet) {
    try { bgm.audio.pause(); } catch (error) { /* noop */ }
    bgm.audio.removeAttribute('src');
    try { bgm.audio.load(); } catch (error) { /* noop */ }
    if (bgm.frame) { bgm.frame.remove(); bgm.frame = null; }
    bgm.src = '';
    bgm.owner = '';
    if (!quiet) syncBgmUi();
  }

  function syncStageBgm() {
    if (!els.playModal.hidden) return;
    if (app.stageSound) playBgm(sceneSound(app.selected), 'stage');
    else if (bgm.owner === 'stage') stopBgm();
    else syncBgmUi();
  }

  function toggleDiskPreview(i) {
    const sound = diskSound(i);
    if (sound && bgm.src === sound.src) stopBgm();
    else playBgm(sound, `disk:${i}`);
  }

  // ボタンと「♪ 曲名」の表示を、いま鳴っている曲に合わせる
  function syncBgmUi() {
    els.soundToggle.classList.toggle('is-on', app.stageSound);
    els.soundToggle.setAttribute('aria-pressed', String(app.stageSound));
    document.querySelectorAll('.bgm-play').forEach(btn => {
      const i = Number(btn.dataset.index);
      const sound = diskSound(i);
      const on = Boolean(sound && bgm.src === sound.src);
      btn.disabled = !sound;
      btn.classList.toggle('is-playing', on);
      btn.textContent = on ? '■' : '▶';
      const label = t(on ? 'sound.stop' : 'sound.preview', { n: i + 1 });
      btn.title = sound ? label : t('sound.none');
      btn.setAttribute('aria-label', btn.title);
    });
    document.querySelectorAll('.stage-bgm').forEach(chip => chip.classList.toggle('is-playing', chip.dataset.src === bgm.src));
  }

  // 音声ファイルはこのブラウザの IndexedDB に保存する（localStorage には入りきらないため）
  function audioDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('indexedDB')); return; }
      const req = indexedDB.open('ccfoliaJukebox', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveFiles() {
    try {
      const db = await audioDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(app.files.slice(0, MAX_DISKS).map(f => f || null), 'disks');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    } catch (error) {
      toast(t('sound.notSaved'), 'error');
    }
  }

  async function loadFiles() {
    try {
      const db = await audioDb();
      const list = await new Promise((resolve, reject) => {
        const req = db.transaction('files').objectStore('files').get('disks');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return Array.isArray(list) ? list.map(f => (f instanceof Blob ? f : null)) : [];
    } catch (error) {
      return [];
    }
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
    // テストプレイの音を止め、「BGMを鳴らす」がオンなら大きな盤面のシーンの曲に戻す
    if (bgm.owner === 'play') stopBgm();
    syncStageBgm();
  }

  function renderPlay() {
    const scene = app.view.scenes[app.play.index];
    els.playScene.textContent = t('play.scene', { name: scene.name });
    els.playScene.style.setProperty('--scene', scene.color);
    const sound = sceneSound(app.play.index);
    els.playBgm.textContent = sound ? t('play.bgm', { name: sound.name }) : t('play.noBgm');
    els.playBoard.innerHTML = '';
    app.play.visit = (app.play.visit || 0) + 1;
    els.playBoard.appendChild(boardEl(withShared(scene), {
      interactive: true,
      className: 'board-large',
      fresh: 'play',
      sceneKey: app.play.visit,
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
    playBgm(sceneSound(app.play.index), 'play');
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
      app.selected = Math.max(0, app.view.start);
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
    els.shapeResetBtn.hidden = !learned;
  }

  /* ================= 欄の並べ替え ================= */

  function loadLayout() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch (error) { saved = null; }
    if (Array.isArray(saved) && saved.length === PANELS.length && PANELS.every(p => saved.includes(p))) return saved;
    return [...PANELS];
  }

  function applyLayout(order, save) {
    order.forEach(name => {
      const panel = els.layout.querySelector(`[data-panel="${name}"]`);
      if (panel) els.layout.insertBefore(panel, els.linkLayer);
    });
    if (save) {
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(order)); } catch (error) { /* noop */ }
    }
    requestAnimationFrame(drawLinks);
  }

  const currentOrder = () => [...els.layout.querySelectorAll('[data-panel]')].map(p => p.dataset.panel);

  function movePanel(name, toIndex) {
    const order = currentOrder().filter(p => p !== name);
    order.splice(Math.max(0, Math.min(order.length, toIndex)), 0, name);
    applyLayout(order, true);
    track('ccfolia_jukebox_layout', { order: order.join(',') });
  }

  // つまみを押したままドラッグして、落とした場所の欄と入れ替える
  function bindPanelDrag() {
    let drag = null;
    const panelAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('[data-panel]') : null;
    };
    const clearMarks = () => els.layout.querySelectorAll('[data-panel]').forEach(p => p.classList.remove('is-drop-target', 'is-dragging'));
    els.layout.querySelectorAll('[data-drag-handle]').forEach(handle => {
      const panel = handle.closest('[data-panel]');
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        drag = { panel, target: null };
        panel.classList.add('is-dragging');
        document.body.classList.add('is-panel-dragging');
      });
      handle.addEventListener('pointermove', e => {
        if (!drag) return;
        const over = panelAt(e.clientX, e.clientY);
        els.layout.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('is-drop-target', p === over && p !== drag.panel));
        drag.target = over && over !== drag.panel ? over : null;
      });
      const end = () => {
        if (!drag) return;
        const { panel: from, target } = drag;
        drag = null;
        clearMarks();
        document.body.classList.remove('is-panel-dragging');
        if (!target) return;
        const order = currentOrder();
        const a = order.indexOf(from.dataset.panel);
        const b = order.indexOf(target.dataset.panel);
        [order[a], order[b]] = [order[b], order[a]];
        applyLayout(order, true);
        track('ccfolia_jukebox_layout', { order: order.join(',') });
      };
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
      handle.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const order = currentOrder();
        const i = order.indexOf(panel.dataset.panel);
        movePanel(panel.dataset.panel, i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1));
        handle.focus();
      });
    });
    els.layoutResetBtn.addEventListener('click', () => applyLayout([...PANELS], true));
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
    els.showCover.addEventListener('change', () => {
      app.settings.showCover = els.showCover.checked;
      track('ccfolia_jukebox_show_cover', { on: els.showCover.checked });
      changed(true);
    });
    els.resetBtn.addEventListener('click', () => {
      if (!window.confirm(t('set.resetConfirm'))) return;
      app.settings = defaultSettings();
      app.files = [];
      stopBgm();
      changed(true);
      saveFiles();
    });
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', () => {
      importZip(els.importFile.files && els.importFile.files[0]);
      els.importFile.value = '';
    });
    els.backBtn.addEventListener('click', backToJukebox);
    els.exportBtn.addEventListener('click', exportZip);
    els.playBtn.addEventListener('click', openPlay);
    els.soundToggle.addEventListener('click', () => {
      app.stageSound = !app.stageSound;
      track('ccfolia_jukebox_sound', { on: app.stageSound });
      syncStageBgm();
    });
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
      if (!f) return;
      e.preventDefault();
      if (/\.zip$/i.test(f.name)) importZip(f);
    });
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; drawLinks(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // パネルの中のスクロール（scroll は伝わらないので capture で受ける）
    els.layout.addEventListener('scroll', onScroll, { passive: true, capture: true });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => drawLinks()).observe(els.graph);
    else window.addEventListener('resize', drawLinks);
  }

  /* ================= 部屋の外側の背景 ================= */

  // 画像は長辺1920pxまでのJPEGにして、設定とは別のキーに保存する（容量があふれても他の設定は残る）
  function renderBackdrop() {
    const on = Boolean(app.backdrop);
    els.backdropImg.src = on ? app.backdrop : Jukebox.backdropPreview();
    els.backdropClear.hidden = !on;
  }

  function setBackdropFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast(t('cover.notImage'), 'error'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      app.backdrop = c.toDataURL('image/jpeg', 0.86);
      try { localStorage.setItem(BACKDROP_KEY, app.backdrop); } catch (error) { toast(t('set.backdropNotSaved'), 'error'); }
      renderBackdrop();
      changed(true);
      track('ccfolia_jukebox_backdrop');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('cover.notImage'), 'error'); };
    img.src = url;
  }

  function bindBackdrop() {
    try { app.backdrop = localStorage.getItem(BACKDROP_KEY) || ''; } catch (error) { app.backdrop = ''; }
    if (!/^data:image\//.test(app.backdrop)) app.backdrop = '';
    const open = () => els.backdropFile.click();
    els.backdropOpen.addEventListener('click', open);
    els.backdropThumb.addEventListener('click', open);
    els.backdropFile.addEventListener('change', () => {
      setBackdropFile(els.backdropFile.files && els.backdropFile.files[0]);
      els.backdropFile.value = '';
    });
    els.backdropClear.addEventListener('click', () => {
      app.backdrop = '';
      try { localStorage.removeItem(BACKDROP_KEY); } catch (error) { /* noop */ }
      renderBackdrop();
      changed(true);
    });
    els.backdropField.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); els.backdropField.classList.add('is-drop'); } });
    els.backdropField.addEventListener('dragleave', () => els.backdropField.classList.remove('is-drop'));
    els.backdropField.addEventListener('drop', e => {
      els.backdropField.classList.remove('is-drop');
      const f = imageFile(e);
      if (!f) return;
      e.preventDefault();
      e.stopPropagation();
      setBackdropFile(f);
    });
    renderBackdrop();
  }

  function init() {
    app.lang = detectLang();
    app.settings = loadSettings();
    bindBackdrop();
    applyLayout(loadLayout(), false);
    bind();
    bindPanelDrag();
    bindCropper();
    applyLanguage();
    rebuild();
    // 前に選んだ音声ファイルを読み戻す
    loadFiles().then(files => {
      if (!files.some(Boolean) || app.files.some(Boolean)) return;
      app.files = files;
      changed(true);
    });
  }

  init();
})();
