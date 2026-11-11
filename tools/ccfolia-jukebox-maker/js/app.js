/* KPレス・ジュークボックスメーカー — 画面
 * 全シーンを並べ、マーカーパネルのクリックアクション「/scene 名前」を
 * 呼び出し先のシーンへの線として描く。 */
(function () {
  'use strict';

  const VERSION = '0.45';
  const LAYOUT_KEY = 'ccfoliaJukebox.layout';
  const PANELS = ['scenes', 'stage', 'settings'];
  const STORAGE_KEY = 'ccfoliaJukebox.v1';
  const BACKDROP_KEY = 'ccfoliaJukebox.backdrop';
  const LANG_KEY = 'ccfoliaJukeboxLang';
  const SOUND_KEY = 'ccfoliaJukebox.sound';
  const SHELF_KEY = 'ccfoliaJukebox.shelf';
  const PANE_KEY = 'ccfoliaJukebox.pane';
  const PL_CUR_KEY = 'ccfoliaJukebox.playlist';
  const ROOM_BOX_KEY = 'ccfoliaJukebox.roomBox';
  const LANGS = ['ja', 'en', 'ko'];
  const MAX_DISKS = Jukebox.MAX_DISKS;
  const IMPORT_COLORS = ['#e3b938', '#5fb98a', '#5a80b8', '#e07a3c', '#d98aa0', '#4f9a96', '#8a62a8', '#c0483c', '#b0b0b0', '#e8d3a8'];

  const $ = id => document.getElementById(id);
  const els = {
    helpBtn: $('helpBtn'), helpDrawer: $('helpDrawer'), helpList: $('helpList'), helpNotes: $('helpNotes'),
    importBtn: $('importBtn'), importFile: $('importFile'), backBtn: $('backBtn'),
    playBtn: $('playBtn'), exportBtn: $('exportBtn'),
    jukeboxPanel: $('jukeboxPanel'), importPanel: $('importPanel'), importName: $('importName'),
    roomBox: $('roomBox'), roomPeek: $('roomPeek'), roomName: $('roomName'), stopName: $('stopName'), diskCount: $('diskCount'), diskCountOut: $('diskCountOut'), showCover: $('showCover'),
    backdropField: $('backdropField'), backdropThumb: $('backdropThumb'), backdropImg: $('backdropImg'), backdropOpen: $('backdropOpen'), backdropClear: $('backdropClear'), backdropFile: $('backdropFile'),
    diskList: $('diskList'), resetBtn: $('resetBtn'),
    shapeLabel: $('shapeLabel'), shapeResetBtn: $('shapeResetBtn'),
    graph: $('layout'), layout: $('layout'), layoutResetBtn: $('layoutResetBtn'), settingsTitle: $('settingsTitle'), sceneGrid: $('sceneGrid'), linkLayer: $('linkLayer'), warnBox: $('warnBox'),
    detailTitle: $('detailTitle'), detailBoard: $('detailBoard'), inspectorBody: $('inspectorBody'),
    playModal: $('playModal'), playScene: $('playScene'), playBgm: $('playBgm'), playBoard: $('playBoard'),
    playChat: $('playChat'), playRestart: $('playRestart'), soundToggle: $('soundToggle'), soundLabel: $('soundLabel'), soundVolume: $('soundVolume'),
    coverModal: $('coverModal'), coverPresets: $('coverPresets'), coverTitle: $('coverTitle'), cropCanvas: $('cropCanvas'), cropDrop: $('cropDrop'), cropEmpty: $('cropEmpty'),
    cropZoom: $('cropZoom'), cropOpen: $('cropOpen'), cropFile: $('cropFile'), cropFit: $('cropFit'), cropOk: $('cropOk'), cropRemove: $('cropRemove'),
    plStatus: $('plStatus'), plMenuBtn: $('plMenuBtn'), plMenu: $('plMenu'), plFile: $('plFile'),
    plTabs: $('plTabs'), plMineCount: $('plMineCount'), plGrid: $('plGrid'), plSaveBtn: $('plSaveBtn'), plImportBtn: $('plImportBtn'),
    plModal: $('plModal'), plModalTitle: $('plModalTitle'), plModalNote: $('plModalNote'), plForm: $('plForm'),
    plNameField: $('plNameField'), plName: $('plName'), plMemoField: $('plMemoField'), plMemo: $('plMemo'),
    plImagesField: $('plImagesField'), plImages: $('plImages'), plModalActions: $('plModalActions'),
    viewSwitch: $('viewSwitch'), shelfTabs: $('shelfTabs'), shelfEdit: $('shelfEdit'), shelfList: $('shelfList'), shelfAdd: $('shelfAdd'), shelfUrl: $('shelfUrl'), shelfReset: $('shelfReset'),
    toastHost: $('toastHost')
  };

  const app = {
    lang: 'ja',
    settings: null,
    files: [],          // 音声ファイル（レコードの順番と同じ。IndexedDB に保存）
    stageSound: true,   // シーンを選んだらそのBGMをページで鳴らす（ヘッダーで切り替え）
    volume: 50,
    room: null,         // ジュークボックスから組み立てた部屋
    imported: null,     // { name, data, files }
    view: null,         // 画面に出すシーン一覧
    selected: 0,        // 大きく表示しているシーン
    marker: -1,         // 選んでいるパネル
    hover: -1,          // マウスを乗せているパネル
    lines: 'all',
    pane: 'preview',    // 真ん中の欄：'preview'（シーンプレビュー）/ 'shelf'（レコード棚）/ 'lists'（プレイリスト）
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

  // 写真の一覧：初期設定の12枚のあとに、プリセット用の写真。名前は初期の12枚はテーマ名、
  // プリセット用はシーン名（「プリセット名・シーン名」。同じシーン名が別プリセットにもあるため）
  const allPhotos = () => Jukebox.PHOTOS.concat(Jukebox.EXTRA_PHOTOS || []);
  function photoLabel(p, i) {
    if (i < Jukebox.PHOTOS.length) return dict().defaultNames[i];
    const li = Math.max(0, LANGS.indexOf(app.lang));
    const names = window.JukeboxPresets ? JukeboxPresets.NAMES[p.scene] : null;
    const scene = li && names ? names[li - 1] : p.scene;
    const preset = window.JukeboxPresets ? JukeboxPresets.LIST.find(x => p.id.startsWith(`${x.id}-`)) : null;
    return preset ? `${preset.name[li] || preset.name[0]}・${scene}` : scene;
  }

  // プリセット写真の撮影者と写真ページへのリンク（Unsplash の帰属表示）
  function renderPhotoCredits() {
    const el = document.getElementById('photoCredits');
    if (!el) return;
    el.innerHTML = '';
    allPhotos().forEach((p, i) => {
      el.append(h('li', {}, h('a', { href: p.photoUrl, target: '_blank', rel: 'noopener' }, photoLabel(p, i)),
        h('a', { class: 'credit-by', href: p.authorUrl, target: '_blank', rel: 'noopener' }, p.author)));
    });
  }

  // BGMの配布元（js/credits.js）：名前・曲数・公式サイト・YouTubeチャンネル
  function renderBgmCredits() {
    const el = document.getElementById('bgmCredits');
    if (!el) return;
    el.innerHTML = '';
    (window.JukeboxBgmSources || []).forEach(src => {
      const links = [];
      if (src.site) links.push(h('a', { href: src.site, target: '_blank', rel: 'noopener' }, t('credits.site')));
      links.push(h('a', { href: src.channel, target: '_blank', rel: 'noopener' }, t('credits.channel')));
      el.append(h('li', {}, h('span', { class: 'credit-name' }, src.name),
        h('span', { class: 'credit-count' }, t('credits.tracks', { n: src.count })),
        h('span', { class: 'credit-links' }, ...links)));
    });
  }

  function setCreditTab(name) {
    document.querySelectorAll('[data-credit-tab]').forEach(btn => {
      const on = btn.dataset.creditTab === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    document.getElementById('creditImages').hidden = name !== 'images';
    document.getElementById('creditBgm').hidden = name !== 'bgm';
  }

  function applyLanguage() {
    const d = dict();
    document.documentElement.lang = app.lang;
    document.title = d.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', d.meta.description);
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-html]').forEach(node => { node.innerHTML = t(node.dataset.i18nHtml); });
    renderPhotoCredits();
    renderBgmCredits();
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
    renderShelf();
    plStatus();
    renderPlaylists();
    renderAll();
  }

  // 初期値のままの名前は、言語を切り替えたらその言語の初期値にそろえる
  function swapDefaultNames(from, to) {
    const a = I18N[from] || I18N.ja;
    const b = I18N[to] || I18N.ja;
    const s = app.settings;
    if (s.roomName === a.set.roomNameDefault) s.roomName = b.set.roomNameDefault;
    if (s.stopName === a.set.stopNameDefault) s.stopName = b.set.stopNameDefault;
    // 初期のテーマ名は言語ごとに同じ並びなので、位置ではなく名前で探す（並べ替えや並び順の変更があっても訳せる）
    s.disks.forEach(disk => {
      const idx = a.defaultNames.indexOf(disk.name);
      if (idx >= 0 && b.defaultNames[idx]) disk.name = b.defaultNames[idx];
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

  // action = { label, run }：トーストの中にボタンを1つ出す（押したら閉じる）
  function toast(message, type = 'info', duration = 3600, action) {
    if (!message) return;
    const node = h('div', { class: `toast toast-${type}${action ? ' has-action' : ''}`, role: type === 'error' ? 'alert' : 'status' }, h('span', null, message),
      action ? h('button', { class: 'toast-action', type: 'button', onclick: () => { node.remove(); action.run(); } }, action.label) : null);
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
      // BGMの初期値は、テーマに合うYouTubeのフリーBGM
      disks: Jukebox.PHOTOS.map((p, i) => ({ color: p.color, name: d.defaultNames[i], bgm: '', url: p.bgmUrl, cover: { style: 'photo', photo: p.id } })),
      bgmDefaults: 2
    };
  }

  function loadSettings() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    return normalizeSettings(saved);
  }

  // 保存した設定や、プレイリストのファイルから読んだ設定を、使える形にそろえる（知らない項目は捨てる）
  // URLは http(s) 以外の書き方（javascript: など）を捨てる。入力途中の「youtu.be/…」のような形は残す
  const safeUrl = u => (typeof u === 'string' && !/^\s*[a-z][a-z0-9+.-]*:/i.test(u.replace(/^\s*https?:/i, '')) ? u.slice(0, 500) : '');
  const safeText = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
  function normalizeSettings(saved) {
    const base = defaultSettings();
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.disks)) return base;
    const disks = base.disks.map((disk, i) => {
      const s = saved.disks[i] || {};
      return {
        color: Jukebox.COLORS.some(c => c.id === s.color) ? s.color : disk.color,
        name: safeText(s.name, 40) ?? disk.name,
        bgm: safeText(s.bgm, 150) ?? '',
        bgmAuto: s.bgmAuto === true,           // 曲名をYouTubeから自動で入れたか（手で直したら false）
        bgmFor: typeof s.bgmFor === 'string' ? s.bgmFor.slice(0, 20) : '', // 自動で入れた曲名の動画ID
        url: safeUrl(s.url),
        cover: readCover(s.cover)
      };
    });
    return {
      roomName: safeText(saved.roomName, 80) ?? base.roomName,
      stopName: safeText(saved.stopName, 40) ?? base.stopName,
      count: Math.min(MAX_DISKS, Math.max(1, Number(saved.count) || base.count)),
      showCover: saved.showCover !== false,
      disks: disks.map(disk => withDefaultBgm(disk, Number(saved.bgmDefaults) || 0)),
      bgmDefaults: 2
    };
  }

  // 初期BGMが入る前に保存した設定は、URLが空のプリセット写真のレコードに1回だけ初期BGMを入れる
  // 2: ハンドアウトと密談の初期BGMを差し替え（前の初期URLのままなら新しいURLにする）
  function withDefaultBgm(disk, version) {
    const photo = disk.cover.style === 'photo' ? Jukebox.photoOf(disk.cover.photo) : null;
    if (!photo || !photo.bgmUrl) return disk; // プリセット用の写真には初期BGMがない
    if (version < 1 && !disk.url.trim()) return { ...disk, url: photo.bgmUrl };
    if (version < 2 && photo.oldYt && youtubeId(disk.url) === photo.oldYt) return { ...disk, url: photo.bgmUrl };
    return disk;
  }

  // 画像は data URL の PNG / JPEG / WebP / GIF だけを受け付ける
  const isImageData = v => typeof v === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 12e6;

  function readCover(c) {
    if (!c || typeof c !== 'object') return { style: 'plain' };
    if (c.style === 'image' && isImageData(c.image)) return { style: 'image', image: c.image };
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
  // 音声ファイル（楽譜付きの書類）のアイコン
  const FILE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 1.5L18.5 9H13zM15 12v5.2a2 2 0 1 1-1.5-1.94V12h-3v6.2a2 2 0 1 1-1.5-1.94V10.5h6z"/></svg>';

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
    updateRoomPeek();
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
        // ジャケットの右下に試聴ボタンを重ねる
        h('div', { class: 'disk-left' },
          s.showCover === false
            ? h('span', { class: 'disk-thumb', dataset: { preview: String(i) } })
            : h('button', { type: 'button', class: 'disk-thumb', dataset: { preview: String(i) }, title: t('cover.upload'), onclick: () => openCropper(i) }),
          h('button', { type: 'button', class: 'bgm-play', dataset: { index: String(i) }, onclick: () => toggleDiskPreview(i) })
        ),
        h('div', { class: 'disk-fields' },
          h('input', {
            class: 'text-input', type: 'text', maxlength: '40', value: disk.name, 'aria-label': `${t('set.diskName')} ${i + 1}`,
            oninput: e => { disk.name = e.target.value; changed(false); }
          }),
          h('input', {
            class: 'text-input small', type: 'text', maxlength: '150', value: disk.bgm || '', placeholder: t('set.bgmTitlePh'), 'aria-label': `${t('set.bgmTitle')} ${i + 1}`,
            dataset: { bgmTitle: String(i) },
            // 手で直した曲名は、URLを変えても上書きしない（空にすると次のURLから自動で入る）
            oninput: e => { disk.bgm = e.target.value; disk.bgmAuto = false; disk.bgmFor = ''; changed(false); }
          }),
          swatches,
          // URL欄の右端に「↗（元のページで開く）」と「音声ファイル」の小さなボタンを入れる
          h('div', { class: `bgm-row${file ? ' has-file' : ''}` },
            file
              ? h('span', { class: 'bgm-file', title: file.name }, h('span', { class: 'bgm-file-name' }, `♪ ${file.name}`), h('button', { type: 'button', class: 'text-button', onclick: () => { app.files[i] = null; changed(true); saveFiles(); } }, t('set.bgmFileClear')))
              : h('input', {
                class: 'text-input small', type: 'url', value: disk.url, placeholder: t('set.bgmUrlPh'), 'aria-label': t('set.bgmUrl'),
                oninput: e => { disk.url = e.target.value; changed(false); syncBgmUi(); }
              }),
            h('span', { class: 'bgm-tools' },
              file ? null : h('a', { class: 'bgm-open', dataset: { index: String(i) }, target: '_blank', rel: 'noopener noreferrer' }, '↗'),
              (() => {
                const label = h('label', { class: 'file-button', title: t('set.bgmFile') }, h('span', { class: 'visually-hidden' }, t('set.bgmFile')), fileInput);
                label.insertAdjacentHTML('afterbegin', FILE_SVG);
                return label;
              })()
            )
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
      h('div', { class: 'cover-grid', role: 'radiogroup', 'aria-label': t('cover.photos') }, allPhotos().map((p, pi) => {
        const on = crop.preset ? crop.preset === p.id : (cover.style === 'photo' && cover.photo === p.id);
        const label = t('cover.photo', { name: photoLabel(p, pi), author: p.author });
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
    autoBgmTitles();
    if (rerender) renderSettings();
    refreshShelfRecords();
    plStatusSoon();
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
    const sound = sceneSound(i);
    return h('li', null, h('button', {
      type: 'button',
      class: `scene-thumb${selected ? ' is-selected' : ''}`,
      dataset: { scene: String(i) },
      style: { '--scene': scene.color },
      'aria-pressed': String(selected),
      onclick: () => { setPane('preview', true); selectScene(i); }
    },
    boardEl(scene, { className: 'board-thumb' }),
    h('span', { class: 'thumb-info' },
      h('span', { class: 'scene-head' },
        h('span', { class: 'scene-dot' }),
        h('span', { class: 'scene-name' }, scene.name || '—')),
      h('span', { class: 'thumb-meta' },
        app.view.start === i ? h('span', { class: 'scene-badge' }, t(app.view.kind === 'import' ? 'graph.current' : 'graph.start')) : null,
        // 登録しているBGM名。長いときは横に流して全文を見せる
        h('span', { class: `scene-bgm${sound ? '' : ' is-none'}`, title: sound ? sound.name : '' },
          h('span', { class: 'scene-bgm-text' }, sound ? `♪ ${sound.name}` : t('play.noBgm')))))));
  }

  function updateMarquees() {
    els.sceneGrid.querySelectorAll('.scene-bgm').forEach(box => {
      const text = box.firstChild;
      box.classList.remove('is-marquee');
      const over = text.scrollWidth - box.clientWidth;
      if (over <= 2) return;
      box.style.setProperty('--shift', `${-over}px`);
      box.style.setProperty('--marquee-time', `${Math.max(4, over / 22 + 3).toFixed(1)}s`);
      box.classList.add('is-marquee');
    });
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
    refreshShelfRecords();
    els.backBtn.hidden = !app.imported;
    if (app.imported) els.importName.textContent = app.imported.name;
    els.settingsTitle.textContent = t(app.imported ? 'io.importedTitle' : 'set.heading');
    els.sceneGrid.innerHTML = '';
    app.view.scenes.forEach((scene, i) => els.sceneGrid.appendChild(sceneThumb(scene, i)));
    requestAnimationFrame(updateMarquees);
    document.querySelectorAll('[data-lines]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.lines === app.lines));
    const links = collectLinks();
    const warnings = collectWarnings(links);
    els.warnBox.hidden = !warnings.length;
    els.warnBox.innerHTML = '';
    if (warnings.length) {
      els.warnBox.appendChild(h('p', { class: 'warn-title' }, t('warn.heading')));
      els.warnBox.appendChild(h('ul', null, warnings.map(w => h('li', null, w))));
    }
    renderDetail();
    // 試聴中のレコードの音声が外されたり変わったり、枚数から外れたりしたら止める
    if (bgm.owner.startsWith('disk:')) {
      // 並べ替えで番号が変わっただけなら、同じ音声のレコードを追いかける
      const at = app.settings.disks.findIndex((d, j) => { const sound = diskSound(j); return Boolean(sound && sound.src === bgm.src); });
      if (at >= 0) bgm.owner = `disk:${at}`;
      else stopBgm(true);
    }
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
    if (!app.view || app.pane !== 'preview') return;
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
      // 何も選んでいないときも、選んだら中身が出る場所だとわかるように空の枠を出す
      body.appendChild(h('div', { class: 'insp-grid is-empty' },
        h('div', { class: 'insp-thumb insp-thumb-empty', 'aria-hidden': 'true' }),
        h('div', { class: 'insp-col' },
          h('p', { class: 'field-label' }, t('insp.text')),
          h('p', { class: 'insp-text insp-empty' }, '—'),
          h('p', { class: 'field-label' }, t('insp.action')),
          h('p', { class: 'insp-code insp-empty' }, t('insp.none')))));
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

  /* ---------- YouTube の曲名を取ってくる ---------- */

  const TITLE_KEY = 'ccfoliaJukebox.ytTitles';
  let ytTitles = {};
  try { ytTitles = JSON.parse(localStorage.getItem(TITLE_KEY) || '{}') || {}; } catch (error) { ytTitles = {}; }
  const titleJobs = new Map();

  // YouTube の oEmbed（だめなら noembed）から動画のタイトルを読む。読めたらこのブラウザに覚えておく
  function fetchYoutubeTitle(id) {
    if (ytTitles[id]) return Promise.resolve(ytTitles[id]);
    if (titleJobs.has(id)) return titleJobs.get(id);
    const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
    const sources = [`https://www.youtube.com/oembed?url=${watch}&format=json`, `https://noembed.com/embed?url=${watch}`];
    const job = (async () => {
      for (const url of sources) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const title = data && typeof data.title === 'string' ? data.title.trim() : '';
          if (!title) continue;
          ytTitles[id] = title;
          try { localStorage.setItem(TITLE_KEY, JSON.stringify(ytTitles)); } catch (error) { /* noop */ }
          return title;
        } catch (error) { /* 次の取得先へ */ }
      }
      return '';
    })();
    titleJobs.set(id, job);
    job.then(() => titleJobs.delete(id));
    return job;
  }

  // 曲名が空か、前に自動で入れた曲名なら、YouTube のタイトルで埋める
  function autoBgmTitles() {
    if (!app.settings) return;
    app.settings.disks.slice(0, app.settings.count).forEach((disk, i) => {
      if (!disk || app.files[i]) return;
      const id = youtubeId(disk.url);
      if (!id) {
        // 自動で入れた曲名は、YouTube の URL を外したら一緒に消す
        if (disk.bgmAuto) {
          disk.bgm = '';
          disk.bgmAuto = false;
          disk.bgmFor = '';
          const input = els.diskList.querySelector(`[data-bgm-title="${i}"]`);
          if (input && document.activeElement !== input) input.value = '';
          setTimeout(() => changed(false), 0);
        }
        return;
      }
      const manual = String(disk.bgm || '').trim() && !disk.bgmAuto;
      if (manual || (disk.bgmAuto && disk.bgmFor === id)) return;
      fetchYoutubeTitle(id).then(title => {
        if (!title || youtubeId(disk.url) !== id) return;
        // 待っている間に音声ファイルが選ばれたら、そちらが優先なので入れない
        const at = app.settings.disks.indexOf(disk);
        if (at < 0 || at >= app.settings.count || app.files[at]) return;
        if (String(disk.bgm || '').trim() && !disk.bgmAuto) return;
        if (disk.bgmAuto && disk.bgmFor === id && disk.bgm === title) return;
        disk.bgm = title;
        disk.bgmAuto = true;
        disk.bgmFor = id;
        const input = els.diskList.querySelector(`[data-bgm-title="${at}"]`);
        if (input && document.activeElement !== input) input.value = title;
        changed(false);
        refreshPreviews();
      });
    });
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

  function applyVolume() {
    const v = Math.max(0, Math.min(100, app.volume));
    bgm.audio.volume = v / 100;
    if (bgm.frame && bgm.frame.contentWindow) {
      try { bgm.frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch (error) { /* noop */ }
    }
  }

  function loadSoundPrefs() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SOUND_KEY) || 'null'); } catch (error) { saved = null; }
    if (saved && typeof saved === 'object') {
      if (typeof saved.on === 'boolean') app.stageSound = saved.on;
      if (Number.isFinite(saved.volume)) app.volume = Math.max(0, Math.min(100, saved.volume));
    }
    els.soundVolume.value = String(app.volume);
    applyVolume();
  }

  function saveSoundPrefs() {
    try { localStorage.setItem(SOUND_KEY, JSON.stringify({ on: app.stageSound, volume: app.volume })); } catch (error) { /* noop */ }
  }
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
        src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&loop=1&playlist=${yt}&controls=0&playsinline=1&enablejsapi=1`
      });
      bgm.frame.addEventListener('load', applyVolume);
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
    els.soundLabel.textContent = t(app.stageSound ? 'sound.on' : 'sound.off');
    els.soundToggle.title = t('sound.toggleTitle');
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
    // URLの曲をYouTubeなどの元のページで開くリンク
    document.querySelectorAll('.bgm-open').forEach(link => {
      const disk = app.settings.disks[Number(link.dataset.index)];
      const url = disk ? String(disk.url || '').trim() : '';
      const ok = /^https?:\/\/\S+$/i.test(url);
      link.hidden = !ok;
      if (ok) link.href = url; else link.removeAttribute('href');
      link.title = t(youtubeId(url) ? 'sound.openYoutube' : 'sound.open');
      link.setAttribute('aria-label', link.title);
    });
    document.querySelectorAll('.stage-bgm').forEach(chip => chip.classList.toggle('is-playing', chip.dataset.src === bgm.src));
    syncShelfUi();
  }

  // 音声ファイルはこのブラウザの IndexedDB に保存する（localStorage には入りきらないため）
  function audioDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('indexedDB')); return; }
      // 2: プレイリストの置き場（playlists）を追加
      const req = indexedDB.open('ccfoliaJukebox', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
        if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
      };
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
    // テストプレイの音を止め、BGMがONなら大きな盤面のシーンの曲に戻す
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


  /* ================= レコード棚（フリーBGMの棚） ================= */

  const shelf = { tabs: [], active: 0, editing: false, armed: '' };
  const shelfSrc = yt => `https://youtu.be/${yt}`;

  function loadShelf() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SHELF_KEY) || 'null'); } catch (error) { saved = null; }
    const ok = saved && Array.isArray(saved.tabs) && saved.tabs.every(tab => tab && typeof tab.id === 'string' && Array.isArray(tab.tracks));
    shelf.tabs = ok
      ? saved.tabs.map(tab => ({
        id: tab.id,
        name: typeof tab.name === 'string' ? tab.name.slice(0, 30) : '',
        tracks: tab.tracks.filter(tr => tr && /^[\w-]{11}$/.test(tr.yt)).map(tr => ({ yt: tr.yt, title: typeof tr.title === 'string' ? tr.title.slice(0, 150) : '', memo: typeof tr.memo === 'string' ? tr.memo.slice(0, 100) : '' }))
      }))
      : JukeboxShelf.defaults();
    shelf.active = ok && Number.isInteger(saved.active) ? Math.max(0, Math.min(shelf.tabs.length - 1, saved.active)) : 0;
    // 埋め込みできなくなった初期の曲は、保存済みの棚でも代わりの曲にする（メモは残す）
    const repl = JukeboxShelf.REPLACED || {};
    let swapped = false;
    shelf.tabs.forEach(tab => {
      tab.tracks = tab.tracks.flatMap(tr => {
        const to = repl[tr.yt];
        if (!to) return [tr];
        swapped = true;
        return tab.tracks.some(x => x.yt === to[0]) ? [] : [{ ...tr, yt: to[0], title: to[1] }];
      });
    });
    if (ok && swapped) saveShelf();
    // 前に保存した棚には、その後に足した初期の曲を、残っているタブの後ろに足す（消した曲は戻さない）
    const from = ok && Number.isInteger(saved.v) ? saved.v : 1;
    if (ok && from < JukeboxShelf.VERSION) {
      // 版6で id を変えたタブ（ハウス → アダルト）は読み替え、合わなくなった初期の曲を外す（メモを書いた曲は残す）
      if (from < 6) {
        const renamed = JukeboxShelf.RENAMED || {};
        const dropped = JukeboxShelf.DROPPED || [];
        shelf.tabs.forEach(tab => {
          if (!renamed[tab.id] || shelf.tabs.some(tb => tb.id === renamed[tab.id])) return;
          tab.id = renamed[tab.id];
          tab.tracks = tab.tracks.filter(tr => tr.memo || !dropped.includes(tr.yt));
        });
      }
      JukeboxShelf.additions(from).forEach(add => {
        let tab = shelf.tabs.find(tb => tb.id === add.id);
        // 前に保存したあとで足したタブは、棚の後ろに足す（それより前からあるタブを消していたら戻さない）
        if (!tab && add.since > from) { tab = { id: add.id, name: '', tracks: [] }; shelf.tabs.push(tab); }
        if (!tab) return;
        add.tracks.forEach(tr => { if (!tab.tracks.some(x => x.yt === tr.yt)) tab.tracks.push(tr); });
      });
      // 版6より前に保存した棚は、初期のタブを新しい並びにする（自分で足したタブは後ろへ、開いていたタブはそのまま）
      if (ok && from < (JukeboxShelf.ORDER_SINCE || 0)) {
        const activeTab = shelf.tabs[shelf.active];
        const rank = id => { const k = JukeboxShelf.order.indexOf(id); return k < 0 ? Infinity : k; };
        shelf.tabs = shelf.tabs.map((tab, i) => ({ tab, i })).sort((x, y) => (rank(x.tab.id) - rank(y.tab.id)) || (x.i - y.i)).map(x => x.tab);
        shelf.active = Math.max(0, shelf.tabs.indexOf(activeTab));
      }
      saveShelf();
    }
  }

  function saveShelf() {
    try { localStorage.setItem(SHELF_KEY, JSON.stringify({ v: JukeboxShelf.VERSION, active: shelf.active, tabs: shelf.tabs })); } catch (error) { /* noop */ }
  }

  // 初期のタブは言語ごとの名前、名前を変えたタブや足したタブはその名前
  function shelfTabName(tab) {
    if (tab.name) return tab.name;
    const name = t(`shelf.tabs.${tab.id}`);
    return name === `shelf.tabs.${tab.id}` ? t('shelf.newTab') : name;
  }

  const trackTitle = tr => tr.title || ytTitles[tr.yt] || `youtu.be/${tr.yt}`;

  function renderShelf(animate) {
    if (!els.shelfTabs) return;
    const tabs = shelf.tabs;
    if (shelf.active >= tabs.length) shelf.active = Math.max(0, tabs.length - 1);
    els.shelfTabs.innerHTML = '';
    tabs.forEach((tab, i) => {
      const on = i === shelf.active;
      els.shelfTabs.appendChild(h('button', {
        type: 'button', role: 'tab', class: `shelf-tab${on ? ' is-active' : ''}`,
        'aria-selected': String(on), tabindex: on ? '0' : '-1',
        onclick: () => { if (shelf.active === i) return; shelf.active = i; shelf.armed = ''; saveShelf(); renderShelf(true); },
        onkeydown: e => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          shelf.active = (i + (e.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
          saveShelf();
          renderShelf(true);
          const next = els.shelfTabs.querySelector('.shelf-tab.is-active');
          if (next) next.focus();
        }
      }, shelfTabName(tab), h('span', { class: 'shelf-tab-count' }, String(tab.tracks.length))));
    });
    els.shelfTabs.appendChild(h('button', { type: 'button', class: 'shelf-tab-tool', title: t('shelf.addTab'), 'aria-label': t('shelf.addTab'), onclick: addShelfTab }, '＋'));
    els.shelfTabs.appendChild(h('button', {
      type: 'button', class: `shelf-tab-tool${shelf.editing ? ' is-on' : ''}`, title: t('shelf.editTab'), 'aria-label': t('shelf.editTab'),
      'aria-pressed': String(shelf.editing), disabled: !tabs.length || undefined,
      onclick: () => { shelf.editing = !shelf.editing; shelf.armed = ''; renderShelf(); if (shelf.editing) focusShelfName(); }
    }, '✎'));
    renderShelfEdit();
    renderShelfList(animate);
    const active = els.shelfTabs.querySelector('.shelf-tab.is-active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function focusShelfName() {
    const input = els.shelfEdit.querySelector('input');
    if (input) { input.focus(); input.select(); }
  }

  function renderShelfEdit() {
    const tab = shelf.tabs[shelf.active];
    els.shelfEdit.innerHTML = '';
    els.shelfEdit.hidden = !shelf.editing || !tab;
    if (els.shelfEdit.hidden) return;
    const move = dir => {
      const to = shelf.active + dir;
      if (to < 0 || to >= shelf.tabs.length) return;
      [shelf.tabs[shelf.active], shelf.tabs[to]] = [shelf.tabs[to], shelf.tabs[shelf.active]];
      shelf.active = to;
      saveShelf();
      renderShelf();
    };
    const armed = shelf.armed === 'tab';
    els.shelfEdit.append(
      h('label', { class: 'shelf-edit-name' }, h('span', { class: 'field-label' }, t('shelf.tabName')),
        h('input', {
          class: 'text-input', type: 'text', maxlength: '30', value: shelfTabName(tab),
          oninput: e => {
            tab.name = e.target.value.trim();
            saveShelf();
            const btn = els.shelfTabs.querySelector('.shelf-tab.is-active');
            if (btn && btn.firstChild) btn.firstChild.textContent = shelfTabName(tab);
          },
          onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); shelf.editing = false; renderShelf(); } }
        })),
      h('button', { type: 'button', class: 'ghost-button small', title: t('shelf.moveLeft'), 'aria-label': t('shelf.moveLeft'), disabled: shelf.active === 0 || undefined, onclick: () => move(-1) }, '←'),
      h('button', { type: 'button', class: 'ghost-button small', title: t('shelf.moveRight'), 'aria-label': t('shelf.moveRight'), disabled: shelf.active === shelf.tabs.length - 1 || undefined, onclick: () => move(1) }, '→'),
      h('button', {
        type: 'button', class: `ghost-button small danger${armed ? ' is-armed' : ''}`,
        onclick: () => {
          if (!armed) { shelf.armed = 'tab'; renderShelfEdit(); return; }
          shelf.tabs.splice(shelf.active, 1);
          shelf.armed = '';
          if (!shelf.tabs.length) shelf.editing = false;
          saveShelf();
          renderShelf(true);
        }
      }, t(armed ? 'shelf.deleteTabSure' : 'shelf.deleteTab')),
      h('button', { type: 'button', class: 'accent-button small', onclick: () => { shelf.editing = false; shelf.armed = ''; renderShelf(); } }, t('shelf.done'))
    );
  }

  function addShelfTab() {
    shelf.tabs.push({ id: `c${Date.now().toString(36)}`, name: t('shelf.newTab'), tracks: [] });
    shelf.active = shelf.tabs.length - 1;
    shelf.editing = true;
    shelf.armed = '';
    saveShelf();
    renderShelf(true);
    focusShelfName();
  }

  function renderShelfList(animate) {
    const tab = shelf.tabs[shelf.active];
    els.shelfList.innerHTML = '';
    els.shelfAdd.hidden = !tab;
    if (!tab) {
      els.shelfList.appendChild(h('li', { class: 'shelf-empty' }, t('shelf.noTabs')));
      return;
    }
    if (!tab.tracks.length) els.shelfList.appendChild(h('li', { class: 'shelf-empty' }, t('shelf.emptyTab')));
    tab.tracks.forEach((tr, ti) => {
      const src = shelfSrc(tr.yt);
      const title = trackTitle(tr);
      const records = app.settings ? app.settings.disks.slice(0, app.settings.count) : [];
      els.shelfList.appendChild(h('li', { class: 'shelf-track', dataset: { yt: tr.yt, index: String(ti) }, style: { '--i': String(ti) } },
        h('button', {
          type: 'button', class: 'shelf-grip', title: t('shelf.drag'), 'aria-label': `${t('shelf.drag')}: ${title}`,
          onpointerdown: e => startTrackDrag(e, ti),
          onkeydown: e => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const to = ti + (e.key === 'ArrowUp' ? -1 : 1);
            if (to < 0 || to >= tab.tracks.length) return;
            moveTrack(ti, shelf.active, to);
            const grip = els.shelfList.querySelector(`.shelf-track[data-index="${to}"] .shelf-grip`);
            if (grip) grip.focus();
          }
        }, h('span', { 'aria-hidden': 'true' }, '⋮⋮')),
        h('button', {
          type: 'button', class: 'shelf-sleeve', dataset: { src },
          onclick: () => { if (bgm.src === src) stopBgm(); else playBgm({ src, name: title }, `shelf:${tr.yt}`); }
        },
        h('span', { class: 'shelf-disc', 'aria-hidden': 'true' }),
        h('img', { src: `https://i.ytimg.com/vi/${tr.yt}/mqdefault.jpg`, alt: '', loading: 'lazy', decoding: 'async' }),
        h('span', { class: 'shelf-sleeve-icon', 'aria-hidden': 'true' })),
        h('span', { class: 'shelf-meta' },
          h('span', { class: 'shelf-title', title }, title),
          // URLと同じ行に、曲ごとの小さなメモ（このブラウザの棚に保存）
          h('span', { class: 'shelf-subrow' },
          h('span', { class: 'shelf-sub' }, `youtu.be/${tr.yt}`),
          h('input', {
            type: 'text', class: 'shelf-memo', value: tr.memo || '', maxlength: '100', placeholder: t('shelf.memo'),
            'aria-label': `${t('shelf.memo')}: ${title}`, spellcheck: 'false',
            oninput: e => { tr.memo = e.target.value.slice(0, 100); saveShelf(); },
            onkeydown: e => { if (e.key === 'Enter') e.target.blur(); }
          }))),
        h('span', { class: 'shelf-actions' },
          h('button', { type: 'button', class: 'shelf-icon shelf-copy', title: t('shelf.copy'), 'aria-label': t('shelf.copy'), onclick: () => copyText(src) }),
          h('select', {
            class: 'shelf-to', title: t('shelf.toRecord'), 'aria-label': t('shelf.toRecord'), disabled: Boolean(app.imported) || !records.length || undefined,
            onchange: e => { const i = Number(e.target.value); e.target.value = ''; if (Number.isInteger(i) && i >= 0) assignShelfTrack(i, tr); }
          },
          h('option', { value: '' }, t('shelf.toRecordShort')),
          records.map((disk, i) => h('option', { value: String(i) }, `${i + 1}. ${disk.name || '—'}`))),
          h('button', {
            type: 'button', class: 'shelf-icon shelf-play', dataset: { src },
            onclick: () => { if (bgm.src === src) stopBgm(); else playBgm({ src, name: title }, `shelf:${tr.yt}`); }
          }, '▶︎'),
          h('a', { class: 'shelf-icon', href: `https://www.youtube.com/watch?v=${tr.yt}`, target: '_blank', rel: 'noopener', title: t('sound.openYoutube'), 'aria-label': t('sound.openYoutube') }, '↗'),
          h('button', {
            type: 'button', class: 'shelf-icon shelf-remove', title: t('shelf.remove'), 'aria-label': t('shelf.remove'),
            onclick: () => {
              if (bgm.src === src && bgm.owner.startsWith('shelf:')) stopBgm();
              tab.tracks.splice(ti, 1);
              saveShelf();
              renderShelf();
            }
          }, '×'))));
    });
    // コピーのアイコン（2枚重ねの四角）
    els.shelfList.querySelectorAll('.shelf-copy').forEach(btn => { btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'; });
    if (animate) els.shelfList.classList.remove('is-entering'), void els.shelfList.offsetWidth, els.shelfList.classList.add('is-entering');
    syncShelfUi();
  }

  // レコードの名前や枚数が変わったら「レコードへ」の選択肢だけ作り直す
  function refreshShelfRecords() {
    if (!els.shelfList || !app.settings) return;
    const records = app.settings.disks.slice(0, app.settings.count);
    els.shelfList.querySelectorAll('.shelf-to').forEach(select => {
      while (select.options.length > 1) select.remove(1);
      records.forEach((disk, i) => select.appendChild(h('option', { value: String(i) }, `${i + 1}. ${disk.name || '—'}`)));
      select.disabled = Boolean(app.imported) || !records.length;
    });
  }

  // 曲を動かす。同じタブの中なら位置 to へ、別のタブなら最後に足す
  function moveTrack(from, tabIndex, to) {
    const src = shelf.tabs[shelf.active];
    const dest = shelf.tabs[tabIndex];
    if (!src || !dest || !src.tracks[from]) return;
    if (dest === src) {
      const [tr] = src.tracks.splice(from, 1);
      src.tracks.splice(Math.max(0, Math.min(src.tracks.length, to)), 0, tr);
    } else {
      const tr = src.tracks[from];
      if (dest.tracks.some(x => x.yt === tr.yt)) { toast(t('shelf.alreadyIn', { tab: shelfTabName(dest) })); return; }
      src.tracks.splice(from, 1);
      dest.tracks.push(tr);
      toast(t('shelf.moved', { tab: shelfTabName(dest) }));
    }
    saveShelf();
    renderShelf();
  }

  // つまみを押したまま動かす：曲の上なら差し込む位置、タブの上ならそのタブへ移す
  function startTrackDrag(e, from) {
    if (e.button !== 0) return;
    e.preventDefault();
    const grip = e.currentTarget;
    const row = grip.closest('.shelf-track');
    const scroller = row.closest('.panel');
    grip.setPointerCapture(e.pointerId);
    // 指の右下に小さな札を出して、落とす先（タブや曲）が隠れないようにする
    const img = row.querySelector('.shelf-sleeve img');
    const ghost = h('div', { class: 'shelf-ghost', 'aria-hidden': 'true' },
      img ? h('img', { src: img.src, alt: '' }) : null,
      h('span', null, row.querySelector('.shelf-title').textContent));
    document.body.appendChild(ghost);
    const place = (x, y) => { ghost.style.transform = `translate(${x + 14}px, ${y + 12}px)`; };
    place(e.clientX, e.clientY);
    row.classList.add('is-dragging');
    document.body.classList.add('is-panel-dragging');
    let target = null;
    const clear = () => {
      els.shelfList.querySelectorAll('.drop-before, .drop-after').forEach(n => n.classList.remove('drop-before', 'drop-after'));
      els.shelfTabs.querySelectorAll('.is-drop').forEach(n => n.classList.remove('is-drop'));
    };
    const move = ev => {
      place(ev.clientX, ev.clientY);
      // パネルの上下の端に来たら少しずつスクロールする
      if (scroller && scroller.scrollHeight > scroller.clientHeight) {
        const r = scroller.getBoundingClientRect();
        if (ev.clientY < r.top + 60) scroller.scrollTop -= 12;
        else if (ev.clientY > r.bottom - 40) scroller.scrollTop += 12;
      }
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      clear();
      target = null;
      const tabBtn = under && under.closest('.shelf-tab');
      const overRow = under && under.closest('.shelf-track');
      if (tabBtn) {
        const ti = [...els.shelfTabs.querySelectorAll('.shelf-tab')].indexOf(tabBtn);
        if (ti >= 0 && ti !== shelf.active) { tabBtn.classList.add('is-drop'); target = { tab: ti }; }
      } else if (overRow && overRow.parentNode === els.shelfList && overRow !== row) {
        const r = overRow.getBoundingClientRect();
        const after = ev.clientY > r.top + r.height / 2;
        overRow.classList.add(after ? 'drop-after' : 'drop-before');
        let to = Number(overRow.dataset.index) + (after ? 1 : 0);
        if (to > from) to -= 1;
        target = { to };
      }
    };
    let done = false;
    // 指を離した時だけ移動を確定する。中断（pointercancel）や、ドラッグ中に一覧が
    // 描き直されて元の行が消えた時は片付けだけ行う。つまみが消えても後片付けできるよう
    // イベントは window で受ける。
    const end = ev => {
      if (done) return;
      done = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      ghost.remove();
      row.classList.remove('is-dragging');
      document.body.classList.remove('is-panel-dragging');
      clear();
      if (!target || ev.type !== 'pointerup' || !row.isConnected) return;
      if (target.tab !== undefined) moveTrack(from, target.tab);
      else if (target.to !== from) moveTrack(from, shelf.active, target.to);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function syncShelfUi() {
    if (!els.shelfList) return;
    els.shelfList.querySelectorAll('.shelf-sleeve').forEach(btn => {
      const on = btn.dataset.src === bgm.src;
      btn.closest('.shelf-track').classList.toggle('is-playing', on);
      const label = t(on ? 'sound.stop' : 'shelf.listen');
      btn.title = label;
      btn.setAttribute('aria-label', `${label}: ${btn.closest('.shelf-track').querySelector('.shelf-title').textContent}`);
    });
    // 「レコードへ」の右の再生ボタン：再生中は■（止める）
    els.shelfList.querySelectorAll('.shelf-play').forEach(btn => {
      const on = btn.dataset.src === bgm.src;
      const label = t(on ? 'sound.stop' : 'shelf.listen');
      btn.textContent = on ? '■' : '▶︎';
      btn.classList.toggle('is-on', on);
      btn.title = label;
      btn.setAttribute('aria-label', `${label}: ${btn.closest('.shelf-track').querySelector('.shelf-title').textContent}`);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  async function copyText(text) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (error) {
      const area = h('textarea', { class: 'visually-hidden' }, text);
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      area.remove();
    }
    toast(ok ? t('shelf.copied') : t('shelf.copyFailed', { url: text }), ok ? 'info' : 'error');
  }

  // 棚の曲をレコードに入れる（音声ファイルを選んでいたら、URLの曲に切り替える）
  function assignShelfTrack(i, tr) {
    const disk = app.settings.disks[i];
    if (!disk) return;
    disk.url = shelfSrc(tr.yt);
    disk.bgm = trackTitle(tr);
    disk.bgmAuto = true;
    disk.bgmFor = tr.yt;
    if (app.files[i]) { app.files[i] = null; saveFiles(); }
    changed(true);
    toast(t('shelf.assigned', { n: i + 1, name: disk.name || '' }));
    track('ccfolia_jukebox_shelf_assign', { tab: (shelf.tabs[shelf.active] || {}).id || '' });
  }

  function addShelfUrl(raw) {
    const tab = shelf.tabs[shelf.active];
    const yt = youtubeId(raw);
    if (!tab) return;
    if (!yt) { toast(t('shelf.badUrl'), 'error'); return; }
    if (tab.tracks.some(tr => tr.yt === yt)) { toast(t('shelf.already')); return; }
    const tr = { yt, title: ytTitles[yt] || '' };
    tab.tracks.push(tr);
    saveShelf();
    renderShelf();
    els.shelfUrl.value = '';
    if (!tr.title) {
      fetchYoutubeTitle(yt).then(title => {
        if (!title || tr.title) return;
        tr.title = title;
        saveShelf();
        renderShelfList();
      });
    }
  }

  function bindShelf() {
    loadShelf();
    // 固定するタブの位置を、見出し（つまみの列）の高さに合わせる
    const stagePanel = els.layout.querySelector('[data-panel="stage"]');
    const bar = stagePanel.querySelector('.panel-bar');
    const setBar = () => stagePanel.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
    setBar();
    if (window.ResizeObserver) new ResizeObserver(setBar).observe(bar);
    els.shelfAdd.addEventListener('submit', e => { e.preventDefault(); addShelfUrl(els.shelfUrl.value); });
    let resetArmed = 0;
    els.shelfReset.addEventListener('click', () => {
      if (!resetArmed) {
        els.shelfReset.textContent = t('shelf.resetSure');
        resetArmed = setTimeout(() => { resetArmed = 0; els.shelfReset.textContent = t('shelf.reset'); }, 4000);
        return;
      }
      clearTimeout(resetArmed);
      resetArmed = 0;
      els.shelfReset.textContent = t('shelf.reset');
      shelf.tabs = JukeboxShelf.defaults();
      shelf.active = 0;
      shelf.editing = false;
      saveShelf();
      renderShelf(true);
      toast(t('shelf.resetDone'));
    });
    // シーンプレビューとレコード棚の切り替え
    // 言語の切り替えなどでボタンの幅が変わったら玉も合わせる
    if (window.ResizeObserver) new ResizeObserver(() => placeSwitchThumb()).observe(els.viewSwitch);
    els.viewSwitch.querySelectorAll('[data-view-btn]').forEach(btn => {
      btn.addEventListener('click', () => setPane(btn.dataset.viewBtn, true));
      btn.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const step = e.key === 'ArrowRight' ? 1 : -1;
        setPane(PANES[(PANES.indexOf(app.pane) + step + PANES.length) % PANES.length], true);
        els.viewSwitch.querySelector(`[data-view-btn="${app.pane}"]`).focus();
      });
    });
    let saved = 'preview';
    try { saved = localStorage.getItem(PANE_KEY); } catch (error) { saved = 'preview'; }
    if (!PANES.includes(saved)) saved = 'preview';
    setPane(saved, false);
  }

  // 真ん中の欄の中身を入れ替える。外す側を横へ流して消し、入れる側を反対から滑り込ませる
  // 切り替えの黄色い玉を、選んだボタンの位置と幅に合わせる（ボタンは文字の長さなりの幅）
  function placeSwitchThumb(name) {
    const btn = els.viewSwitch.querySelector(`[data-view-btn="${name || app.pane}"]`);
    if (!btn || !btn.offsetWidth) return;
    els.viewSwitch.style.setProperty('--thumb-x', `${btn.offsetLeft}px`);
    els.viewSwitch.style.setProperty('--thumb-w', `${btn.offsetWidth}px`);
  }

  let paneAnims = [];
  const PANES = ['preview', 'shelf', 'lists'];
  function setPane(name, animate) {
    const panel = els.layout.querySelector('[data-panel="stage"]');
    const from = app.pane;
    els.viewSwitch.dataset.active = name;
    placeSwitchThumb(name);
    els.viewSwitch.querySelectorAll('[data-view-btn]').forEach(btn => {
      const on = btn.dataset.viewBtn === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    if (from === name && !animate) {
      panel.querySelectorAll('[data-view-pane]').forEach(p => { p.hidden = p.dataset.viewPane !== name; });
    }
    if (from === name) { panel.dataset.pane = name; return; }
    app.pane = name;
    panel.dataset.pane = name;
    els.layout.classList.toggle('is-shelf', name !== 'preview');
    try { localStorage.setItem(PANE_KEY, name); } catch (error) { /* noop */ }
    const outgoing = panel.querySelector(`[data-view-pane="${from}"]`);
    const incoming = panel.querySelector(`[data-view-pane="${name}"]`);
    paneAnims.forEach(a => a.cancel());
    paneAnims = [];
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      outgoing.hidden = true;
      incoming.hidden = false;
      if (panel.scrollTop > 0) panel.scrollTop = 0;
      if (name === 'preview') { renderDetail(); requestAnimationFrame(drawLinks); } else drawLinks();
    };
    if (!animate || reduce || !incoming.animate) {
      finish();
      if (name === 'shelf') renderShelfList();
      if (name === 'lists') renderPlaylists();
      return;
    }
    drawLinks();
    const dir = PANES.indexOf(name) > PANES.indexOf(from) ? 1 : -1;
    const out = outgoing.animate([
      { opacity: 1, transform: 'translateX(0)', filter: 'blur(0)' },
      { opacity: 0, transform: `translateX(${-dir * 36}px)`, filter: 'blur(3px)' }
    ], { duration: 140, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    paneAnims.push(out);
    out.onfinish = () => {
      out.cancel();
      finish();
      if (name === 'shelf') renderShelfList(true);
      if (name === 'lists') renderPlaylists();
      const inn = incoming.animate([
        { opacity: 0, transform: `translateX(${dir * 44}px)`, filter: 'blur(3px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0)' }
      ], { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' });
      // 滑り込んでいる途中に測った線の端はずれるので、止まってから引き直す
      inn.onfinish = () => { if (app.pane === 'preview') drawLinks(); };
      paneAnims.push(inn);
    };
  }

  /* ================= プレイリスト（シーン構成とBGMの組み合わせを名前を付けて取っておく） ================= */

  // 端末内の保存は IndexedDB の playlists。開いているプレイリストの印は localStorage に置く。
  // 音声ファイルは入れない（ココフォリアにも別にアップロードが要るため）。YouTubeのURLは入る。
  const PL_FORMAT = 'ccfolia-jukebox-playlist';
  const pl = { list: [], tab: null, current: null, undo: false, armed: '', armTimer: 0, statusTimer: 0, dirty: false };

  function idbRun(store, mode, work) {
    return audioDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = work(tx.objectStore(store));
      tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    }));
  }

  const plId = () => `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // 今の設定の写し（曲名の自動入力の印は比べない）
  function plSnapshot() {
    return { settings: JSON.parse(JSON.stringify(app.settings)), backdrop: app.backdrop || '' };
  }

  function plSig(snap) {
    const s = snap.settings;
    const body = JSON.stringify([s.roomName, s.stopName, s.count, s.showCover !== false,
      s.disks.map(d => [d.color, d.name, d.bgm, d.url, d.cover])]) + '|' + (snap.backdrop || '');
    let x = 0x811c9dc5;
    for (let i = 0; i < body.length; i++) { x ^= body.charCodeAt(i); x = Math.imul(x, 0x01000193); }
    return `${body.length.toString(36)}.${(x >>> 0).toString(36)}`;
  }

  function plLoadCurrent() {
    try {
      const c = JSON.parse(localStorage.getItem(PL_CUR_KEY) || 'null');
      pl.current = c && typeof c.id === 'string' && typeof c.name === 'string' ? { id: c.id, name: c.name, sig: String(c.sig || '') } : null;
    } catch (error) { pl.current = null; }
  }

  function plSaveCurrent() {
    try {
      if (pl.current) localStorage.setItem(PL_CUR_KEY, JSON.stringify(pl.current));
      else localStorage.removeItem(PL_CUR_KEY);
    } catch (error) { /* noop */ }
  }

  async function plRefreshList() {
    try {
      const list = await idbRun('playlists', 'readonly', st => st.getAll());
      pl.list = (Array.isArray(list) ? list : []).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    } catch (error) { pl.list = []; }
    if (pl.current && !pl.list.some(r => r.id === pl.current.id)) { pl.current = null; plSaveCurrent(); }
    plStatus();
    if (app.pane === 'lists') renderPlaylists();
  }

  async function plPut(rec) {
    await idbRun('playlists', 'readwrite', st => st.put(rec));
  }

  // 設定欄の見出しの横：開いているプレイリスト名と、保存していない変更の印
  function plStatus() {
    clearTimeout(pl.statusTimer);
    const sig = plSig(plSnapshot());
    pl.dirty = pl.current ? sig !== pl.current.sig : sig !== plSig({ settings: defaultSettings(), backdrop: '' });
    els.plStatus.textContent = '';
    els.plStatus.classList.toggle('is-none', !pl.current);
    els.plStatus.appendChild(h('span', { class: 'pl-status-name' }, pl.current ? pl.current.name : t('pl.untitled')));
    if (pl.current && pl.dirty) els.plStatus.appendChild(h('span', { class: 'pl-status-dot', title: t('pl.modified'), 'aria-label': t('pl.modified') }, '●'));
    els.plStatus.title = pl.current ? `${pl.current.name}${pl.dirty ? ` (${t('pl.modified')})` : ''}` : t('pl.untitled');
  }

  function plStatusSoon() {
    clearTimeout(pl.statusTimer);
    pl.statusTimer = setTimeout(plStatus, 300);
  }

  /* ---------- 小さな確認窓（名前・メモ・画像を含めるか・ボタン） ---------- */

  let plDialogDone = null;
  function plDialog({ title, note, name, memo, images, buttons }) {
    if (plDialogDone) plDialogDone(null);
    els.plModalTitle.textContent = title;
    els.plModalNote.textContent = note || '';
    els.plModalNote.hidden = !note;
    els.plNameField.hidden = name === undefined;
    els.plMemoField.hidden = memo === undefined;
    els.plImagesField.hidden = images === undefined;
    els.plName.value = name || '';
    els.plMemo.value = memo || '';
    els.plImages.checked = images !== false;
    els.plModalActions.textContent = '';
    return new Promise(resolve => {
      const done = value => {
        if (!plDialogDone) return;
        plDialogDone = null;
        els.plModal.hidden = true;
        resolve(value === null ? null : { value, name: els.plName.value.trim().slice(0, 60), memo: els.plMemo.value.trim().slice(0, 200), images: els.plImages.checked });
      };
      plDialogDone = done;
      buttons.forEach(b => els.plModalActions.appendChild(h('button', {
        class: b.primary ? 'accent-button' : 'ghost-button', type: b.primary ? 'submit' : 'button', dataset: { value: b.value },
        onclick: e => {
          e.preventDefault();
          if (b.primary && name !== undefined && !els.plName.value.trim()) { els.plName.focus(); return; }
          done(b.value);
        }
      }, b.label)));
      els.plModal.hidden = false;
      (name !== undefined ? els.plName : els.plModalActions.querySelector('.accent-button') || els.plModalActions.firstChild).focus();
      if (name !== undefined) els.plName.select();
    });
  }

  /* ---------- 保存 ---------- */

  async function plSaveAs() {
    const res = await plDialog({
      title: t('pl.saveAsTitle'), name: pl.current ? t('pl.copyName', { name: pl.current.name }) : (app.settings.roomName.trim() || t('pl.newName')), memo: '',
      buttons: [{ label: t('pl.cancel'), value: 'cancel' }, { label: t('pl.save'), value: 'ok', primary: true }]
    });
    if (!res || res.value !== 'ok') return;
    const snap = plSnapshot();
    const now = Date.now();
    const rec = { id: plId(), name: res.name, memo: res.memo, createdAt: now, savedAt: now, ...snap, audio: plAudioList() };
    try { await plPut(rec); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    pl.current = { id: rec.id, name: rec.name, sig: plSig(snap) };
    plSaveCurrent();
    toast(t('pl.saved', { name: rec.name }), 'success');
    track('ccfolia_jukebox_playlist_save', { mode: 'new' });
    plRefreshList();
  }

  async function plOverwrite() {
    if (!pl.current) { plSaveAs(); return; }
    const rec = pl.list.find(r => r.id === pl.current.id);
    if (!rec) { plSaveAs(); return; }
    const snap = plSnapshot();
    const next = { ...rec, ...snap, savedAt: Date.now(), audio: plAudioList() };
    try { await plPut(next); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    pl.current.sig = plSig(snap);
    plSaveCurrent();
    toast(t('pl.saved', { name: rec.name }), 'success');
    track('ccfolia_jukebox_playlist_save', { mode: 'overwrite' });
    plRefreshList();
  }

  // 音声ファイルを入れていたレコードの番号（読み込んだ時に、選び直す案内に使う）
  function plAudioList() {
    return app.files.slice(0, app.settings.count).map((f, i) => (f ? i + 1 : 0)).filter(Boolean);
  }

  /* ---------- 読み込み ---------- */

  // 保存していない変更があれば、切り替える前に聞く。false ならやめる
  async function plConfirmLeave() {
    plStatus();
    if (!pl.dirty) return true;
    const res = await plDialog({
      title: t('pl.leaveTitle'), note: pl.current ? t('pl.leaveNote', { name: pl.current.name }) : t('pl.leaveNoteNew'),
      buttons: [{ label: t('pl.cancel'), value: 'cancel' }, { label: t('pl.leaveDiscard'), value: 'discard' }, { label: t('pl.leaveSave'), value: 'save', primary: true }]
    });
    if (!res || res.value === 'cancel') return false;
    if (res.value === 'save') {
      if (pl.current) await plOverwrite(); else await plSaveAs();
      plStatus();
      if (pl.dirty) return false;
    }
    return true;
  }

  // 切り替える前の状態を控えておく（音声ファイルも含めて1つだけ）
  async function plKeepUndo() {
    const undo = { ...plSnapshot(), files: app.files.slice(0, MAX_DISKS).map(f => f || null), current: pl.current };
    try {
      await idbRun('files', 'readwrite', st => st.put(undo, 'undo'));
      pl.undo = true;
    } catch (error) { pl.undo = false; }
  }

  function plApply(snap, current, files) {
    stopBgm(true);
    app.settings = normalizeSettings({ ...snap.settings, bgmDefaults: 2 });
    app.files = files || [];
    crop.sources = [];
    app.backdrop = isImageData(snap.backdrop) ? snap.backdrop : '';
    try {
      if (app.backdrop) localStorage.setItem(BACKDROP_KEY, app.backdrop);
      else localStorage.removeItem(BACKDROP_KEY);
    } catch (error) { toast(t('set.backdropNotSaved'), 'error'); }
    renderBackdrop();
    pl.current = current;
    plSaveCurrent();
    if (app.imported) { app.imported = null; app.marker = -1; }
    app.selected = 0;
    changed(true);
    saveFiles();
    plStatus();
    if (app.pane === 'lists') renderPlaylists();
  }

  async function plOpen(rec) {
    if (!(await plConfirmLeave())) return;
    await plKeepUndo();
    plApply(rec, { id: rec.id, name: rec.name, sig: '' }, []);
    // 読み込んだ後の形で印を付け直す（古い形の設定を直した分は変更に数えない）
    pl.current.sig = plSig(plSnapshot());
    plSaveCurrent();
    plStatus();
    const audio = Array.isArray(rec.audio) ? rec.audio.filter(n => Number.isInteger(n) && n > 0 && n <= app.settings.count) : [];
    const msg = audio.length ? t('pl.openedAudio', { name: rec.name, list: audio.join('・') }) : t('pl.opened', { name: rec.name });
    toast(msg, 'success', audio.length ? 8000 : 6000, pl.undo ? { label: t('pl.undo'), run: plUndo } : null);
    track('ccfolia_jukebox_playlist_open');
  }

  async function plStartPreset(preset) {
    if (!(await plConfirmLeave())) return;
    await plKeepUndo();
    plApply({ settings: preset.settings(), backdrop: '' }, null, []);
    setPane('preview', true);   // 切り替えたら、そのプリセットの盤面が見えるようにシーンプレビューへ
    toast(t('pl.presetStarted', { name: preset.name() }), 'success', 6000, pl.undo ? { label: t('pl.undo'), run: plUndo } : null);
    track('ccfolia_jukebox_preset', { preset: preset.id });
  }

  async function plUndo() {
    let undo = null;
    try { undo = await idbRun('files', 'readonly', st => st.get('undo')); } catch (error) { undo = null; }
    if (!undo || !undo.settings) { pl.undo = false; toast(t('pl.noUndo'), 'error'); return; }
    const files = Array.isArray(undo.files) ? undo.files.map(f => (f instanceof Blob ? f : null)) : [];
    plApply(undo, undo.current && typeof undo.current.id === 'string' ? undo.current : null, files);
    try { await idbRun('files', 'readwrite', st => st.delete('undo')); } catch (error) { /* noop */ }
    pl.undo = false;
    toast(t('pl.undone'));
  }

  /* ---------- 一覧での操作 ---------- */

  async function plRename(rec) {
    const res = await plDialog({
      title: t('pl.renameTitle'), name: rec.name, memo: rec.memo || '',
      buttons: [{ label: t('pl.cancel'), value: 'cancel' }, { label: t('pl.apply'), value: 'ok', primary: true }]
    });
    if (!res || res.value !== 'ok') return;
    try { await plPut({ ...rec, name: res.name, memo: res.memo }); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    if (pl.current && pl.current.id === rec.id) { pl.current.name = res.name; plSaveCurrent(); }
    plRefreshList();
  }

  async function plDuplicate(rec) {
    const now = Date.now();
    try { await plPut({ ...rec, id: plId(), name: t('pl.copyName', { name: rec.name }).slice(0, 60), createdAt: now, savedAt: now }); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    plRefreshList();
  }

  async function plDelete(rec) {
    if (pl.armed !== rec.id) {
      clearTimeout(pl.armTimer);
      pl.armed = rec.id;
      renderPlaylists();
      pl.armTimer = setTimeout(() => { pl.armed = ''; renderPlaylists(); }, 4000);
      return;
    }
    clearTimeout(pl.armTimer);
    pl.armed = '';
    try { await idbRun('playlists', 'readwrite', st => st.delete(rec.id)); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    if (pl.current && pl.current.id === rec.id) { pl.current = null; plSaveCurrent(); }
    toast(t('pl.deleted', { name: rec.name }));
    plRefreshList();
  }

  /* ---------- ファイル（.jukebox.json） ---------- */

  async function plExport(rec) {
    const src = rec || { name: pl.current ? pl.current.name : (app.settings.roomName.trim() || t('pl.newName')), memo: '', ...plSnapshot(), audio: plAudioList() };
    const res = await plDialog({
      title: t('pl.exportTitle'), note: t('pl.exportNote'), name: src.name, images: true,
      buttons: [{ label: t('pl.cancel'), value: 'cancel' }, { label: t('pl.exportGo'), value: 'ok', primary: true }]
    });
    if (!res || res.value !== 'ok') return;
    const settings = JSON.parse(JSON.stringify(src.settings));
    if (!res.images) settings.disks.forEach(d => { if (d.cover && d.cover.style === 'image') d.cover = { style: 'plain' }; });
    const data = {
      format: PL_FORMAT, v: 1, app: `ccfolia-jukebox-maker ${VERSION}`,
      name: res.name, memo: src.memo || '', savedAt: new Date().toISOString(),
      settings, backdrop: res.images ? (src.backdrop || '') : '', audio: src.audio || []
    };
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${safeFileName(res.name)}.jukebox.json`);
    track('ccfolia_jukebox_playlist_export', { images: res.images });
  }

  // ほかの人が作ったファイルも読むので、中身は全部確かめてから使う
  async function plImportFile(file) {
    if (!file) return;
    if (file.size > 40e6) { toast(t('pl.badFile'), 'error'); return; }
    let data = null;
    try { data = JSON.parse(await file.text()); } catch (error) { data = null; }
    if (!data || data.format !== PL_FORMAT || !data.settings || !Array.isArray(data.settings.disks)) { toast(t('pl.badFile'), 'error'); return; }
    const now = Date.now();
    const name = (safeText(data.name, 60) || '').trim() || file.name.replace(/\.jukebox\.json$|\.json$/i, '').slice(0, 60) || t('pl.newName');
    const rec = {
      id: plId(), name, memo: (safeText(data.memo, 200) || '').trim(), createdAt: now, savedAt: now,
      settings: normalizeSettings({ ...data.settings, disks: data.settings.disks.slice(0, MAX_DISKS), bgmDefaults: 2 }),
      backdrop: isImageData(data.backdrop) ? data.backdrop : '',
      audio: Array.isArray(data.audio) ? data.audio.filter(n => Number.isInteger(n) && n > 0 && n <= MAX_DISKS) : []
    };
    try { await plPut(rec); } catch (error) { toast(t('pl.saveFailed'), 'error'); return; }
    pl.tab = 'mine';
    await plRefreshList();
    setPane('lists', true);
    toast(t('pl.imported', { name }), 'success', 6000, { label: t('pl.open'), run: () => plOpen(rec) });
    track('ccfolia_jukebox_playlist_import');
  }

  /* ---------- 一覧の画面（真ん中の欄の3つめ） ---------- */

  // プリセット：「汎用マダミス」（最初の設定と同じ。内部IDは standard のまま）と、js/presets.js のジャンル別
  const langIndex = () => Math.max(0, LANGS.indexOf(app.lang));
  function presetSettings(p) {
    const li = langIndex();
    const base = defaultSettings();
    const disks = p.scenes.map(([name, color, cover, yt, title]) => ({
      color, name: li ? ((JukeboxPresets.NAMES[name] || [])[li - 1] || name) : name,
      bgm: title, bgmAuto: true, bgmFor: yt, url: `https://youtu.be/${yt}`,
      cover: cover.startsWith('p:') ? { style: cover.slice(2) } : { style: 'photo', photo: cover }
    }));
    return { ...base, roomName: p.name[li] || p.name[0], count: disks.length, disks: disks.concat(base.disks.slice(disks.length)) };
  }
  const PL_PRESETS = [
    { id: 'standard', name: () => t('pl.presetStandard'), memo: () => t('pl.presetStandardMemo'), settings: () => defaultSettings() }
  ].concat(((window.JukeboxPresets && JukeboxPresets.LIST) || []).map(p => ({
    id: p.id, name: () => p.name[langIndex()] || p.name[0], memo: () => p.desc[langIndex()] || p.desc[0], settings: () => presetSettings(p)
  })));

  function plSleeves(settings) {
    return settings.disks.slice(0, Math.min(4, settings.count)).map(d => {
      const c = d.cover || {};
      const src = c.style === 'photo' && Jukebox.photoOf(c.photo) ? Jukebox.photoUrl(c.photo) : (c.style === 'image' && isImageData(c.image) ? c.image : '');
      return h('span', { class: 'pl-sleeve', style: { '--disk': Jukebox.colorOf(d.color).line } }, src ? h('img', { src, alt: '', loading: 'lazy' }) : null);
    });
  }

  const plDate = ms => {
    const d = new Date(ms || 0);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  function renderPlaylists() {
    if (!els.plGrid) return;
    // タブを選んでいないあいだは、マイプレイリストが空ならプリセットを見せる
    const tab = pl.tab || (pl.list.length ? 'mine' : 'presets');
    els.plTabs.querySelectorAll('[data-pl-tab]').forEach(btn => {
      const on = btn.dataset.plTab === tab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    els.plMineCount.textContent = String(pl.list.length);
    els.plGrid.textContent = '';
    if (tab === 'presets') {
      PL_PRESETS.forEach(p => {
        const settings = p.settings();
        els.plGrid.appendChild(h('li', { class: 'pl-card is-preset' },
          h('div', { class: 'pl-stack' }, plSleeves(settings)),
          h('div', { class: 'pl-meta' },
            h('p', { class: 'pl-name' }, p.name()),
            h('p', { class: 'pl-memo' }, p.memo()),
            h('p', { class: 'pl-sub' }, t('pl.records', { n: settings.count }))),
          h('div', { class: 'pl-actions' },
            h('button', { class: 'accent-button small', type: 'button', onclick: () => plStartPreset(p) }, t('pl.startPreset')))));
      });
      return;
    }
    if (!pl.list.length) {
      els.plGrid.appendChild(h('li', { class: 'pl-empty' }, t('pl.empty')));
      return;
    }
    pl.list.forEach(rec => {
      const open = pl.current && pl.current.id === rec.id;
      const settings = rec.settings && Array.isArray(rec.settings.disks) ? rec.settings : defaultSettings();
      els.plGrid.appendChild(h('li', { class: `pl-card${open ? ' is-open' : ''}` },
        h('div', { class: 'pl-stack' }, plSleeves(settings)),
        h('div', { class: 'pl-meta' },
          h('p', { class: 'pl-name' }, rec.name, open ? h('span', { class: 'pl-badge' }, pl.dirty ? t('pl.openDirty') : t('pl.openNow')) : null),
          rec.memo ? h('p', { class: 'pl-memo' }, rec.memo) : null,
          h('p', { class: 'pl-sub' }, `${t('pl.records', { n: settings.count })} · ${plDate(rec.savedAt)}`)),
        h('div', { class: 'pl-actions' },
          h('button', { class: 'accent-button small', type: 'button', onclick: () => plOpen(rec) }, open ? t('pl.reopen') : t('pl.open')),
          h('button', { class: 'ghost-button small', type: 'button', onclick: () => plRename(rec) }, t('pl.rename')),
          h('button', { class: 'ghost-button small', type: 'button', onclick: () => plDuplicate(rec) }, t('pl.duplicate')),
          h('button', { class: 'ghost-button small', type: 'button', onclick: () => plExport(rec) }, t('pl.export')),
          h('button', { class: `ghost-button small danger${pl.armed === rec.id ? ' is-armed' : ''}`, type: 'button', onclick: () => plDelete(rec) },
            pl.armed === rec.id ? t('pl.deleteSure') : t('pl.delete')))));
    });
  }

  /* ---------- メニュー ---------- */

  function plMenu(open) {
    const show = open === undefined ? els.plMenu.hidden : open;
    els.plMenu.hidden = !show;
    els.plMenuBtn.setAttribute('aria-expanded', String(show));
    if (!show) return;
    plStatus();
    plPlaceMenu();
    els.plMenu.querySelector('[data-pl-act="save"]').disabled = !pl.current;
    els.plMenu.querySelector('[data-pl-act="undo"]').hidden = !pl.undo;
    const first = els.plMenu.querySelector('[role="menuitem"]:not(:disabled):not([hidden])');
    if (first) first.focus();
  }

  // メニューは画面に固定して出す（欄のスクロール枠で切れないように）。ボタンの下、はみ出すなら左や上へずらす
  function plPlaceMenu() {
    if (els.plMenu.hidden) return;
    const r = els.plMenuBtn.getBoundingClientRect();
    const m = { width: els.plMenu.offsetWidth, height: els.plMenu.offsetHeight }; // 開くアニメの途中でも本来の大きさ
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let left = Math.min(r.left, vw - m.width - 8);
    left = Math.max(8, left);
    let top = r.bottom + 6;
    if (top + m.height > vh - 8 && r.top - 6 - m.height >= 8) top = r.top - 6 - m.height;
    els.plMenu.style.left = `${Math.round(left)}px`;
    els.plMenu.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  function plAct(act) {
    plMenu(false);
    if (act === 'save') plOverwrite();
    else if (act === 'saveAs') plSaveAs();
    else if (act === 'list') { pl.tab = 'mine'; renderPlaylists(); setPane('lists', true); }
    else if (act === 'presets') { pl.tab = 'presets'; renderPlaylists(); setPane('lists', true); }
    else if (act === 'export') plExport(null);
    else if (act === 'import') els.plFile.click();
    else if (act === 'undo') plUndo();
  }

  function bindPlaylists() {
    plLoadCurrent();
    els.plMenuBtn.addEventListener('click', e => { e.stopPropagation(); plMenu(); });
    els.plMenu.addEventListener('click', e => {
      const btn = e.target.closest('[data-pl-act]');
      if (btn && !btn.disabled) plAct(btn.dataset.plAct);
    });
    els.plMenu.addEventListener('keydown', e => {
      const items = [...els.plMenu.querySelectorAll('[role="menuitem"]:not(:disabled):not([hidden])')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        if (next) next.focus();
      } else if (e.key === 'Escape') { plMenu(false); els.plMenuBtn.focus(); }
    });
    document.addEventListener('click', e => { if (!els.plMenu.hidden && !e.target.closest('.pl-menu-wrap')) plMenu(false); });
    // 開いたままスクロールや大きさの変更があったら閉じる
    window.addEventListener('resize', () => { if (!els.plMenu.hidden) plMenu(false); });
    document.addEventListener('scroll', e => { if (!els.plMenu.hidden && !els.plMenu.contains(e.target)) plMenu(false); }, true);
    els.plFile.addEventListener('change', () => {
      plImportFile(els.plFile.files && els.plFile.files[0]);
      els.plFile.value = '';
    });
    els.plTabs.querySelectorAll('[data-pl-tab]').forEach(btn => btn.addEventListener('click', () => { pl.tab = btn.dataset.plTab; renderPlaylists(); }));
    els.plSaveBtn.addEventListener('click', () => plOverwrite());
    els.plImportBtn.addEventListener('click', () => els.plFile.click());
    els.plModal.addEventListener('click', e => { if (e.target === els.plModal && plDialogDone) plDialogDone(null); });
    els.plModal.querySelector('[data-close-pl]').addEventListener('click', () => { if (plDialogDone) plDialogDone(null); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.plModal.hidden && plDialogDone) plDialogDone(null); });
    els.plForm.addEventListener('submit', e => {
      e.preventDefault();
      const primary = els.plModalActions.querySelector('.accent-button');
      if (primary) primary.click();
    });
    // 控えが残っていれば「直前の状態に戻す」を出す
    idbRun('files', 'readonly', st => st.getKey('undo')).then(k => { pl.undo = k !== undefined; }).catch(() => {});
    plRefreshList();
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
    // 「使い方」と「版権元」は同時には開かない
    const creditsBtn = document.getElementById('creditsBtn');
    const creditsDrawer = document.getElementById('creditsDrawer');
    const showDrawer = which => {
      els.helpDrawer.hidden = which !== 'help';
      els.helpBtn.setAttribute('aria-expanded', String(which === 'help'));
      creditsDrawer.hidden = which !== 'credits';
      creditsBtn.setAttribute('aria-expanded', String(which === 'credits'));
    };
    els.helpBtn.addEventListener('click', () => showDrawer(els.helpDrawer.hidden ? 'help' : ''));
    creditsBtn.addEventListener('click', () => showDrawer(creditsDrawer.hidden ? 'credits' : ''));
    document.querySelectorAll('[data-close-credits]').forEach(btn => btn.addEventListener('click', () => showDrawer('')));
    document.querySelectorAll('[data-credit-tab]').forEach(btn => btn.addEventListener('click', () => setCreditTab(btn.dataset.creditTab)));
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', () => {
      els.helpDrawer.hidden = true;
      els.helpBtn.setAttribute('aria-expanded', 'false');
    }));
    els.roomName.addEventListener('input', () => { app.settings.roomName = els.roomName.value; updateRoomPeek(); changed(false); });
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
      saveSoundPrefs();
      track('ccfolia_jukebox_sound', { on: app.stageSound });
      // オフにしたら、試聴中の曲も含めて止める（テストプレイ中はそのまま）
      if (!app.stageSound && bgm.owner !== 'play') stopBgm();
      syncStageBgm();
    });
    els.soundVolume.addEventListener('input', () => {
      app.volume = Number(els.soundVolume.value) || 0;
      applyVolume();
      saveSoundPrefs();
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
      else if (/\.json$/i.test(f.name)) plImportFile(f);
    });
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; drawLinks(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // パネルの中のスクロール（scroll は伝わらないので capture で受ける）
    els.layout.addEventListener('scroll', onScroll, { passive: true, capture: true });
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { drawLinks(); updateMarquees(); }).observe(els.graph);
    else window.addEventListener('resize', () => { drawLinks(); updateMarquees(); });
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

  // 部屋の設定（部屋の名前・停止中のシーン名・背景画像）は折りたためる。開閉はこのブラウザに覚える
  function updateRoomPeek() {
    if (els.roomPeek) els.roomPeek.textContent = (app.settings && app.settings.roomName) || '';
  }

  function bindRoomBox() {
    if (!els.roomBox) return;
    try { if (localStorage.getItem(ROOM_BOX_KEY) === 'closed') els.roomBox.open = false; } catch (error) { /* noop */ }
    els.roomBox.addEventListener('toggle', () => {
      try { localStorage.setItem(ROOM_BOX_KEY, els.roomBox.open ? 'open' : 'closed'); } catch (error) { /* noop */ }
    });
  }

  function init() {
    app.lang = detectLang();
    app.settings = loadSettings();
    saveSettings(); // 初期BGMを入れた印（bgmDefaults）をすぐ残す
    loadSoundPrefs();
    bindBackdrop();
    applyLayout(loadLayout(), false);
    bind();
    bindPanelDrag();
    bindCropper();
    bindShelf();
    bindPlaylists();
    bindRoomBox();
    applyLanguage();
    rebuild();
    // 前に選んだ音声ファイルを読み戻してから、曲名の自動入力を始める
    loadFiles().then(files => {
      if (!files.some(Boolean) || app.files.some(Boolean)) return;
      app.files = files;
      changed(true);
    }).catch(() => {}).then(() => autoBgmTitles());
  }

  init();
})();
