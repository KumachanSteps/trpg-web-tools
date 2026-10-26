/* TRPG背景サジェストツール — 画面の動き */
(function () {
  'use strict';

  const Vocab = window.HaikeiVocab;
  const Engine = window.HaikeiEngine;
  const Store = window.HaikeiStore;
  const DICT = window.HaikeiI18n;
  const AI = window.HaikeiAI;

  const LANG_KEY = 'haikei-suggest:lang';
  const TEXT_KEY = 'haikei-suggest:text';
  const PAGE_SIZE = 150;
  const THUMB_W = 256;
  const SAMPLE_W = 64;
  const LIB_VERSION = 1;

  const $ = (id) => document.getElementById(id);

  const app = {
    lang: 'ja',
    view: 'library',
    libId: null,
    root: null, // showDirectoryPicker のフォルダ（Chrome・Edge）
    writeToFolder: false,
    lib: null, // { customTags, images: { path: { size, mtime, tags, removed, note } } }
    files: new Map(), // path -> File
    order: [],
    pathTags: new Map(), // path -> [tagId]（ファイル名由来）
    pathWords: new Map(), // path -> [語]（本文と直接照合）
    colorTags: new Map(), // path -> [tagId]（色解析）
    aiTags: new Map(), // path -> [tagId]（AI追加パック）
    colorDone: false,
    aiDone: 0,
    aiRunning: false,
    thumbUrls: new Map(), // path -> blob URL
    analyzed: 0,
    matcher: null,
    selected: new Set(),
    lastClicked: null,
    filter: { tags: new Set(), untagged: false, q: '' },
    shownLimit: PAGE_SIZE,
    visible: [],
    split: 'heading',
    sceneOff: new Map(), // シーン番号 -> 外したタグ
    previewPath: null,
    previewUrl: null,
    pendingDelete: null
  };

  // ---------- 文言 ----------

  function t(path, vars) {
    const pick = (dict) => path.split('.').reduce((node, key) => (node == null ? node : node[key]), dict);
    let value = pick(DICT[app.lang]);
    if (value == null) value = pick(DICT.ja);
    if (typeof value !== 'string') return value == null ? path : value;
    return vars ? value.replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? '' : vars[key])) : value;
  }

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (error) { saved = null; }
    if (saved && DICT[saved]) return saved;
    const nav = (navigator.language || 'ja').toLowerCase();
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('ja')) return 'ja';
    return 'en';
  }

  function applyLanguage() {
    document.documentElement.lang = app.lang;
    document.title = t('meta.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    document.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    document.querySelectorAll('[data-lang-choice]').forEach((btn) => {
      const on = btn.dataset.langChoice === app.lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    $('helpList').replaceChildren(...t('helpItems').map((line) => h('p', null, line)));
    $('helpNotes').replaceChildren(...t('helpNotes').map((line) => h('p', null, line)));
    updateSaveButton();
    if ($('aiPackBtn')) updateAiButton();
    updateStatus();
    if (app.lib) {
      renderFilters();
      renderGrid();
      renderInspector();
      renderScenes();
    }
  }

  // ---------- DOM の小道具 ----------

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value == null || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
        else if (value === true) el.setAttribute(key, '');
        else el.setAttribute(key, value);
      });
    }
    children.flat().forEach((child) => {
      if (child == null || child === false) return;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return el;
  }

  function toast(message, type) {
    const el = h('div', { class: 'toast' + (type ? ' is-' + type : '') }, message);
    $('toastStack').append(el);
    setTimeout(() => el.remove(), 3400);
  }

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- タグ ----------

  function customTags() { return app.lib ? app.lib.customTags : []; }

  function tagLabel(id) {
    const tag = Engine.TAG_BY_ID.get(id);
    if (tag) return tag.label[app.lang] || tag.label.ja;
    const custom = customTags().find((item) => item.id === id);
    return custom ? custom.label : id.replace(/^#/, '');
  }

  function tagCat(id) {
    const tag = Engine.TAG_BY_ID.get(id);
    return tag ? tag.cat : 'custom';
  }

  function catLabel(cat) {
    const found = Vocab.CATEGORIES.find((item) => item.id === cat);
    return found ? (found[app.lang] || found.ja) : cat;
  }

  function entry(path) {
    let item = app.lib.images[path];
    if (!item) {
      const file = app.files.get(path);
      item = { size: file ? file.size : 0, mtime: file ? file.lastModified : 0, tags: [], removed: [], note: '' };
      app.lib.images[path] = item;
    }
    return item;
  }

  function autoTags(path) {
    const list = (app.pathTags.get(path) || []).concat(app.colorTags.get(path) || [], app.aiTags.get(path) || []);
    return Array.from(new Set(list));
  }

  // 画像に付いているタグ（自動タグ − 外した自動タグ ＋ 手で付けたタグ）
  function effectiveTags(path) {
    const item = app.lib.images[path];
    const removed = item ? item.removed : [];
    const set = new Set(autoTags(path).filter((id) => !removed.includes(id)));
    if (item) item.tags.forEach((id) => set.add(id));
    return set;
  }

  function isAiOnly(path, id) {
    return (app.aiTags.get(path) || []).includes(id)
      && !(app.pathTags.get(path) || []).includes(id)
      && !(app.colorTags.get(path) || []).includes(id);
  }

  function isAuto(path, id) {
    const item = app.lib.images[path];
    return autoTags(path).includes(id) && !(item && item.tags.includes(id));
  }

  // 入力された言葉を組み込みタグかマイタグの id にする（なければマイタグを作る）
  function resolveTag(text) {
    const word = text.trim().replace(/^#/, '');
    if (!word) return null;
    const lower = word.toLowerCase();
    for (const tag of Vocab.TAGS) {
      if (Object.values(tag.label).some((label) => label.toLowerCase() === lower)) return tag.id;
    }
    const existing = customTags().find((item) => item.label.toLowerCase() === lower);
    if (existing) return existing.id;
    const id = '#' + word;
    app.lib.customTags.push({ id, label: word, words: [] });
    rebuildMatcher();
    return id;
  }

  function addTag(paths, id) {
    paths.forEach((path) => {
      const item = entry(path);
      item.removed = item.removed.filter((tag) => tag !== id);
      if (!autoTags(path).includes(id) && !item.tags.includes(id)) item.tags.push(id);
    });
    changed();
  }

  function removeTag(paths, id) {
    paths.forEach((path) => {
      const item = entry(path);
      item.tags = item.tags.filter((tag) => tag !== id);
      if (autoTags(path).includes(id) && !item.removed.includes(id)) item.removed.push(id);
    });
    changed();
  }

  function deleteCustomTag(id) {
    app.lib.customTags = app.lib.customTags.filter((item) => item.id !== id);
    Object.values(app.lib.images).forEach((item) => {
      item.tags = item.tags.filter((tag) => tag !== id);
    });
    app.filter.tags.delete(id);
    rebuildMatcher();
    changed();
  }

  function rebuildMatcher() {
    app.matcher = Engine.buildMatcher(customTags());
  }

  // ---------- 保存 ----------

  // 保存は少し待ってまとめて行う。待っている間に別のフォルダを開いても、
  // 編集していたフォルダの分を先に保存してから切り替える（flushPersist）。
  let persistTimer = null;

  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(flushPersist, 800);
  }

  async function flushPersist() {
    clearTimeout(persistTimer);
    persistTimer = null;
    const lib = app.lib;
    const libId = app.libId;
    const root = app.writeToFolder ? app.root : null;
    if (!lib || !libId) return;
    lib.savedAt = Date.now();
    await Store.saveLibrary(libId, lib);
    if (!root) return;
    try { await Store.writeTagFile(root, exportData(lib, libId)); } catch (error) {
      if (app.root === root) {
        app.writeToFolder = false;
        updateSaveButton();
      }
      toast(t('toast.saveFolderFailed'), 'error');
    }
  }

  function changed() {
    persist();
    renderFilters();
    renderGrid();
    renderInspector();
    scheduleScenes();
  }

  function exportData(lib = app.lib, libId = app.libId) {
    // 今あるファイルの分だけでなく、見つからなかった画像のタグも残す
    return {
      app: 'haikei-suggest',
      version: LIB_VERSION,
      name: libId,
      savedAt: lib.savedAt || Date.now(),
      customTags: lib.customTags,
      images: lib.images
    };
  }

  function sanitizeLibrary(raw) {
    const lib = { customTags: [], images: {}, savedAt: 0 };
    if (!raw || typeof raw !== 'object') return lib;
    lib.savedAt = Number(raw.savedAt) || 0;
    if (Array.isArray(raw.customTags)) {
      raw.customTags.forEach((tag) => {
        if (!tag || typeof tag.label !== 'string' || !tag.label.trim()) return;
        const label = tag.label.trim().slice(0, 40);
        const id = typeof tag.id === 'string' && tag.id.startsWith('#') ? tag.id : '#' + label;
        if (lib.customTags.some((item) => item.id === id)) return;
        lib.customTags.push({ id, label, words: Array.isArray(tag.words) ? tag.words.filter((w) => typeof w === 'string').slice(0, 20) : [] });
      });
    }
    const known = (id) => Engine.TAG_BY_ID.has(id) || lib.customTags.some((item) => item.id === id);
    if (raw.images && typeof raw.images === 'object') {
      Object.entries(raw.images).forEach(([path, item]) => {
        if (!item || typeof item !== 'object') return;
        lib.images[path] = {
          size: Number(item.size) || 0,
          mtime: Number(item.mtime) || 0,
          tags: Array.isArray(item.tags) ? item.tags.filter(known) : [],
          removed: Array.isArray(item.removed) ? item.removed.filter((id) => Engine.TAG_BY_ID.has(id)) : [],
          note: typeof item.note === 'string' ? item.note.slice(0, 500) : ''
        };
      });
    }
    return lib;
  }

  // 同じ名前・同じサイズの画像が別の場所にあれば、タグを引き継ぐ
  function migrateMoved() {
    const missing = Object.keys(app.lib.images).filter((path) => !app.files.has(path));
    if (!missing.length) return;
    const byKey = new Map();
    missing.forEach((path) => {
      const item = app.lib.images[path];
      const key = path.split('/').pop() + '|' + item.size;
      if (!byKey.has(key)) byKey.set(key, path);
    });
    app.order.forEach((path) => {
      if (app.lib.images[path]) return;
      const file = app.files.get(path);
      const key = path.split('/').pop() + '|' + file.size;
      const from = byKey.get(key);
      if (!from) return;
      app.lib.images[path] = app.lib.images[from];
      delete app.lib.images[from];
      byKey.delete(key);
    });
  }

  // ---------- フォルダを開く ----------

  async function pickFolder() {
    if (Store.canPickDirectory) {
      let handle;
      try {
        handle = await window.showDirectoryPicker({ id: 'haikei-suggest', mode: 'read' });
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        $('folderInput').click();
        return;
      }
      await openHandle(handle);
    } else {
      $('folderInput').click();
    }
  }

  async function openHandle(handle) {
    setStatus(t('status.scanning', { n: 0 }));
    let result;
    try {
      result = await Store.scanHandle(handle, (n) => setStatus(t('status.scanning', { n })));
    } catch (error) {
      toast(t('toast.reopenFailed'), 'error');
      updateStatus();
      return;
    }
    if (await loadFolder(result, handle)) Store.saveLastHandle(handle);
  }

  async function reopenLast() {
    const handle = await Store.loadLastHandle();
    if (!handle || !(await Store.ensurePermission(handle, 'read'))) {
      toast(t('toast.reopenFailed'), 'error');
      return;
    }
    await openHandle(handle);
  }

  async function openFileList(list) {
    const result = await Store.scanFileList(list);
    if (!result) return;
    await loadFolder(result, null);
  }

  // 同じ名前の別フォルダとタグが混ざらないように、フォルダごとの保存キーを決める。
  // Chrome・Edge はフォルダそのものが同じか（isSameEntry）で、
  // それ以外はパスの重なり具合で、前に開いたフォルダと同じかを判断する。
  async function resolveLibId(name, handle, paths) {
    const index = (await Store.loadLibIndex()) || [];
    const pathSet = new Set(paths);
    for (const item of index.filter((row) => row.name === name)) {
      if (handle && item.handle) {
        try { if (await item.handle.isSameEntry(handle)) return item.id; } catch (error) { /* 別のフォルダ扱い */ }
        continue;
      }
      const lib = await Store.loadLibrary(item.id);
      const known = lib && lib.images ? Object.keys(lib.images) : [];
      if (!known.length) return item.id;
      const overlap = known.filter((path) => pathSet.has(path)).length;
      if (overlap / Math.min(known.length, pathSet.size) >= 0.3) {
        if (handle && !item.handle) { item.handle = handle; await Store.saveLibIndex(index); }
        return item.id;
      }
    }
    let id = name;
    for (let n = 2; index.some((row) => row.id === id); n += 1) id = name + ' (' + n + ')';
    index.push({ id, name, handle: handle || null });
    await Store.saveLibIndex(index);
    return id;
  }

  async function loadFolder(result, handle) {
    if (!result.files.length) {
      toast(t('toast.noImages'), 'error');
      updateStatus();
      return false;
    }
    await flushPersist();
    app.root = handle;
    app.thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    app.thumbUrls.clear();
    app.pathTags.clear();
    app.pathWords.clear();
    app.colorTags.clear();
    app.aiTags.clear();
    app.colorDone = false;
    aiRun += 1;
    app.aiRunning = false;
    app.selected.clear();
    app.filter.tags.clear();
    app.sceneOff.clear();
    app.writeToFolder = false;
    app.files = new Map(result.files.map((item) => [item.path, item.file]));
    app.order = result.files.map((item) => item.path)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    app.libId = await resolveLibId(result.name, handle, app.order);

    const saved = sanitizeLibrary(await Store.loadLibrary(app.libId));
    const fromFolder = result.tagFile ? sanitizeLibrary(result.tagFile) : null;
    if (fromFolder && fromFolder.savedAt > saved.savedAt) {
      app.lib = fromFolder;
      toast(t('toast.loadedFolderFile'));
    } else {
      app.lib = saved;
    }
    // フォルダに保存済みのタグファイルがあれば、次からもフォルダへ書き戻す
    if (fromFolder && app.root && (await Store.hasPermission(app.root, 'readwrite'))) {
      app.writeToFolder = true;
    }
    rebuildMatcher();
    app.order.forEach((path) => {
      app.pathTags.set(path, Engine.tagsFromPath(path, app.matcher));
      app.pathWords.set(path, Engine.pathWords(path));
    });
    migrateMoved();
    app.shownLimit = PAGE_SIZE;

    $('emptyState').hidden = true;
    $('folderName').textContent = '📁 ' + result.name;
    $('exportBtn').disabled = false;
    $('importBtn').disabled = false;
    updateSaveButton();
    setView(app.view);
    renderFilters();
    renderGrid();
    renderInspector();
    renderScenes();
    persist();
    analyzeAll();
    return true;
  }

  // ---------- 画像の解析（サムネイルと色） ----------

  function thumbKey(path) { return app.libId + '|' + path; }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file); } catch (error) { /* 下の方法で読む */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function analyzeFile(path) {
    const file = app.files.get(path);
    const key = thumbKey(path);
    const cached = await Store.loadThumb(key);
    if (cached && cached.size === file.size && cached.mtime === file.lastModified && cached.blob) {
      return cached;
    }
    const source = await decode(file);
    const w = source.width || source.naturalWidth;
    const hgt = source.height || source.naturalHeight;
    if (!w || !hgt) throw new Error('empty image');
    const scale = Math.min(1, THUMB_W / w);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(hgt * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1f2023';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const sample = document.createElement('canvas');
    sample.width = SAMPLE_W;
    sample.height = Math.max(1, Math.round((hgt / w) * SAMPLE_W));
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(source, 0, 0, sample.width, sample.height);
    const color = Engine.analyzePixels(sctx.getImageData(0, 0, sample.width, sample.height).data);
    if (source.close) source.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    const record = { size: file.size, mtime: file.lastModified, blob, color, width: w, height: hgt };
    Store.saveThumb(key, record);
    return record;
  }

  let analyzeRun = 0;

  async function analyzeAll() {
    const run = ++analyzeRun;
    const queue = app.order.slice();
    app.analyzed = 0;
    const total = queue.length;
    const refresh = debounce(() => {
      renderFilters();
      renderInspector();
      scheduleScenes();
    }, 500);
    const worker = async () => {
      while (queue.length && run === analyzeRun) {
        const path = queue.shift();
        try {
          const record = await analyzeFile(path);
          if (run !== analyzeRun) return;
          app.colorTags.set(path, Engine.tagsFromColor(record.color));
          if (record.blob) {
            const url = URL.createObjectURL(record.blob);
            app.thumbUrls.set(path, url);
            fillThumb(path, url);
          }
        } catch (error) { /* 壊れた画像は色タグなし */ }
        app.analyzed += 1;
        if (app.analyzed % 10 === 0 || app.analyzed === total) updateStatus();
        refresh();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (run === analyzeRun) {
      app.colorDone = true;
      updateStatus();
      renderFilters();
      renderGrid();
      analyzeAI();
    }
  }

  // ---------- AI追加パック ----------

  // パックのフォルダを選ぶ。Chrome・Edge は前回のパックを覚えておく。
  async function openAiPack() {
    if (Store.canPickDirectory) {
      const last = await Store.loadPackHandle();
      if (last && (await Store.ensurePermission(last, 'read'))) {
        if (await loadAiPack(await Store.scanAllFiles(last), last)) return;
      }
      let handle;
      try {
        handle = await window.showDirectoryPicker({ id: 'haikei-ai-pack', mode: 'read' });
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        $('aiPackInput').click();
        return;
      }
      await loadAiPack(await Store.scanAllFiles(handle), handle);
    } else {
      $('aiPackInput').click();
    }
  }

  async function loadAiPack(files, handle) {
    setStatus(t('ai.loading'));
    try {
      await AI.loadPack(files);
    } catch (error) {
      console.warn('AI pack:', error);
      toast(t('ai.loadFailed'), 'error');
      updateStatus();
      return false;
    }
    if (handle) Store.savePackHandle(handle);
    toast(t('ai.loaded', { name: AI.packName }));
    updateAiButton();
    updateStatus();
    analyzeAI();
    return true;
  }

  function updateAiButton() {
    const btn = $('aiPackBtn');
    btn.textContent = AI.ready ? t('ai.on') : t('ai.button');
    btn.classList.toggle('is-on', AI.ready);
    btn.title = AI.ready ? AI.packName : t('ai.buttonTitle');
  }

  let aiRun = 0;

  // 画像の中身からタグを付ける。結果（特徴量）はサムネイルと一緒にキャッシュする。
  async function analyzeAI() {
    if (!AI.ready || !app.lib || !app.colorDone) return;
    const run = ++aiRun;
    const packId = AI.packId;
    app.aiDone = 0;
    app.aiRunning = true;
    updateStatus();
    const refresh = debounce(() => {
      renderFilters();
      renderGrid();
      renderInspector();
      scheduleScenes();
    }, 800);
    for (const path of app.order.slice()) {
      if (run !== aiRun) return;
      try {
        const key = thumbKey(path);
        const record = await Store.loadThumb(key);
        let emb = record && record.ai && record.ai.pack === packId ? record.ai.emb : null;
        if (!emb) {
          const source = await decodeForAI(path, record);
          emb = await AI.embed(source);
          if (source.close) source.close();
          if (record) {
            record.ai = { pack: packId, emb };
            Store.saveThumb(key, record);
          }
        }
        if (run !== aiRun) return;
        app.aiTags.set(path, AI.tagsFromEmbedding(emb));
      } catch (error) { /* 読めない画像は飛ばす */ }
      app.aiDone += 1;
      if (app.aiDone % 5 === 0) updateStatus();
      refresh();
    }
    app.aiRunning = false;
    updateStatus();
    refresh();
  }

  // AI には短い辺が 224px あれば足りるので、縮小して読み込む
  async function decodeForAI(path, record) {
    const file = app.files.get(path);
    if (record && record.width && record.height && typeof createImageBitmap === 'function') {
      const scale = Math.min(1, 256 / Math.min(record.width, record.height));
      try {
        return await createImageBitmap(file, {
          resizeWidth: Math.max(1, Math.round(record.width * scale)),
          resizeHeight: Math.max(1, Math.round(record.height * scale)),
          resizeQuality: 'high'
        });
      } catch (error) { /* 下の方法で読む */ }
    }
    return decode(file);
  }

  function fillThumb(path, url) {
    const card = $('imageGrid').querySelector('[data-path="' + CSS.escape(path) + '"] img');
    if (card) { card.src = url; card.closest('.thumb').classList.remove('is-pending'); }
    document.querySelectorAll('.cand-thumb[data-path="' + CSS.escape(path) + '"] img').forEach((img) => { img.src = url; });
  }

  // ---------- 状態表示 ----------

  function setStatus(text) { $('statusText').textContent = text; }

  function updateStatus() {
    if (!app.lib) { setStatus(t('status.noFolder')); return; }
    if (app.analyzed < app.order.length) setStatus(t('status.analyzing', { done: app.analyzed, total: app.order.length }));
    else if (app.aiRunning) setStatus(t('ai.analyzing', { done: app.aiDone, total: app.order.length }));
    else setStatus(t('status.ready', { n: app.order.length }));
  }

  function updateSaveButton() {
    const btn = $('saveFolderBtn');
    btn.hidden = !app.root;
    btn.textContent = app.writeToFolder ? t('bar.savingFolder') : t('bar.saveFolder');
    btn.classList.toggle('is-on', app.writeToFolder);
  }

  async function saveToFolder() {
    if (!app.root) return;
    if (!(await Store.ensurePermission(app.root, 'readwrite'))) {
      toast(t('toast.saveFolderFailed'), 'error');
      return;
    }
    try {
      app.lib.savedAt = Date.now();
      await Store.writeTagFile(app.root, exportData());
      app.writeToFolder = true;
      toast(t('toast.savedFolder'));
    } catch (error) {
      toast(t('toast.saveFolderFailed'), 'error');
    }
    updateSaveButton();
  }

  // ---------- 表示切替 ----------

  function setView(view) {
    app.view = view;
    document.querySelectorAll('#viewToggle [data-view]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.view === view);
      btn.setAttribute('aria-pressed', String(btn.dataset.view === view));
    });
    const hasLib = Boolean(app.lib);
    $('libraryView').hidden = !(hasLib && view === 'library');
    $('suggestView').hidden = view !== 'suggest';
    $('emptyState').hidden = hasLib || view === 'suggest';
    if (view === 'suggest') renderScenes();
  }

  // ---------- ライブラリ：絞り込み ----------

  function visiblePaths() {
    const q = app.filter.q.trim().toLowerCase();
    return app.order.filter((path) => {
      if (q && !path.toLowerCase().includes(q)) return false;
      const tags = effectiveTags(path);
      if (app.filter.untagged) {
        const meaningful = Array.from(tags).filter((id) => tagCat(id) !== 'tone');
        if (meaningful.length) return false;
      }
      for (const id of app.filter.tags) if (!tags.has(id)) return false;
      return true;
    });
  }

  function tagCounts() {
    const counts = new Map();
    app.order.forEach((path) => {
      effectiveTags(path).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    });
    return counts;
  }

  function renderFilters() {
    if (!app.lib) return;
    const counts = tagCounts();
    const groups = Vocab.CATEGORIES.map((cat) => {
      const ids = cat.id === 'custom'
        ? customTags().map((item) => item.id)
        : Vocab.TAGS.filter((tag) => tag.cat === cat.id).map((tag) => tag.id);
      const used = ids.filter((id) => counts.get(id) || app.filter.tags.has(id));
      if (!used.length) return null;
      return h('div', { class: 'filter-group' },
        h('h3', null, cat[app.lang] || cat.ja),
        h('div', { class: 'chip-row' }, used.map((id) => h('button', {
          type: 'button',
          class: 'chip' + (app.filter.tags.has(id) ? ' is-on' : ''),
          'aria-pressed': String(app.filter.tags.has(id)),
          dataset: { filterTag: id }
        }, tagLabel(id), h('span', { class: 'chip-count' }, counts.get(id) || 0)))));
    }).filter(Boolean);
    $('filterList').replaceChildren(...groups);
    $('clearFilterBtn').hidden = !(app.filter.tags.size || app.filter.untagged || app.filter.q);
  }

  // ---------- ライブラリ：一覧 ----------

  function renderGrid() {
    if (!app.lib) return;
    app.visible = visiblePaths();
    const shown = app.visible.slice(0, app.shownLimit);
    $('shownCount').textContent = t('lib.shown', { n: app.visible.length });
    $('noMatch').hidden = app.visible.length > 0;
    $('moreBtn').hidden = app.visible.length <= app.shownLimit;
    $('imageGrid').replaceChildren(...shown.map(gridCard));
  }

  function gridCard(path) {
    const url = app.thumbUrls.get(path);
    const tags = effectiveTags(path);
    const name = path.split('/').pop();
    const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const selected = app.selected.has(path);
    const visibleTags = Array.from(tags).filter((id) => tagCat(id) !== 'tone').slice(0, 3);
    return h('div', { class: 'thumb' + (selected ? ' is-selected' : '') + (url ? '' : ' is-pending'), dataset: { path }, title: path },
      h('label', { class: 'thumb-check' }, h('input', { type: 'checkbox', checked: selected, 'aria-label': name, dataset: { check: path } })),
      h('button', { type: 'button', class: 'thumb-hit', dataset: { pick: path } },
        h('span', { class: 'thumb-img' }, h('img', { alt: '', loading: 'lazy', src: url || null })),
        h('span', { class: 'thumb-name' }, name),
        folder ? h('span', { class: 'thumb-folder' }, folder) : null,
        h('span', { class: 'thumb-tags' }, visibleTags.map((id) => h('span', { class: 'mini-tag' }, tagLabel(id))),
          tags.size > visibleTags.length ? h('span', { class: 'mini-more' }, '+' + (tags.size - visibleTags.length)) : null)));
  }

  function selectPath(path, event) {
    const additive = event && (event.ctrlKey || event.metaKey);
    if (event && event.shiftKey && app.lastClicked) {
      const from = app.visible.indexOf(app.lastClicked);
      const to = app.visible.indexOf(path);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        if (!additive) app.selected.clear();
        app.visible.slice(a, b + 1).forEach((item) => app.selected.add(item));
      }
    } else if (additive) {
      if (app.selected.has(path)) app.selected.delete(path); else app.selected.add(path);
      app.lastClicked = path;
    } else {
      app.selected.clear();
      app.selected.add(path);
      app.lastClicked = path;
    }
    syncSelection();
  }

  function toggleCheck(path, on) {
    if (on) app.selected.add(path); else app.selected.delete(path);
    app.lastClicked = path;
    syncSelection();
  }

  function syncSelection() {
    $('imageGrid').querySelectorAll('.thumb').forEach((card) => {
      const on = app.selected.has(card.dataset.path);
      card.classList.toggle('is-selected', on);
      const box = card.querySelector('input[type="checkbox"]');
      if (box) box.checked = on;
    });
    renderInspector();
  }

  // ---------- ライブラリ：タグ編集 ----------

  function renderInspector() {
    const panel = $('inspector');
    if (!app.lib) { panel.replaceChildren(); return; }
    const paths = Array.from(app.selected).filter((path) => app.files.has(path));
    if (!paths.length) {
      panel.replaceChildren(h('p', { class: 'muted small' }, t('insp.none')));
      return;
    }
    const counts = new Map();
    paths.forEach((path) => effectiveTags(path).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const single = paths.length === 1 ? paths[0] : null;
    const head = single
      ? h('div', { class: 'insp-head' },
        h('button', { type: 'button', class: 'insp-preview', dataset: { preview: single }, title: t('insp.preview') },
          h('img', { alt: '', src: app.thumbUrls.get(single) || null })),
        h('p', { class: 'insp-path' }, single))
      : h('div', { class: 'insp-head' }, h('p', { class: 'insp-count' }, t('insp.many', { n: paths.length })));

    const ordered = Array.from(counts.keys()).sort((a, b) => catOrder(a) - catOrder(b));
    const chips = ordered.map((id) => {
      const all = counts.get(id) === paths.length;
      const auto = single ? isAuto(single, id) : false;
      const byAI = auto && isAiOnly(single, id);
      return h('span', { class: 'chip tag-chip' + (auto ? ' is-auto' : '') + (byAI ? ' is-ai' : '') + (all ? '' : ' is-partial'), title: auto ? t(byAI ? 'insp.aiTitle' : 'insp.autoTitle') : null },
        tagLabel(id),
        auto ? h('span', { class: 'chip-note' }, byAI ? 'AI' : t('insp.auto')) : null,
        all ? null : h('span', { class: 'chip-note' }, t('insp.partial') + ' ' + counts.get(id)),
        h('button', { type: 'button', class: 'chip-x', dataset: { removeTag: id }, 'aria-label': '×' }, '×'));
    });

    const list = h('datalist', { id: 'tagOptions' },
      Vocab.TAGS.map((tag) => h('option', { value: tag.label[app.lang] || tag.label.ja })),
      customTags().map((tag) => h('option', { value: tag.label })));

    const form = h('form', { class: 'add-tag', dataset: { addForm: '1' } },
      h('input', { class: 'text-input', type: 'text', list: 'tagOptions', placeholder: t('insp.addPh'), id: 'addTagInput', autocomplete: 'off' }),
      h('button', { class: 'accent-button', type: 'submit' }, t('insp.add')));

    const palette = h('details', { class: 'palette' },
      h('summary', null, t('insp.palette')),
      h('p', { class: 'muted small' }, t('insp.paletteNote')),
      Vocab.CATEGORIES.map((cat) => {
        const ids = cat.id === 'custom' ? customTags().map((item) => item.id) : Vocab.TAGS.filter((tag) => tag.cat === cat.id).map((tag) => tag.id);
        if (!ids.length) return null;
        return h('div', { class: 'palette-group' },
          h('h3', null, catLabel(cat.id)),
          h('div', { class: 'chip-row' }, ids.map((id) => {
            const n = counts.get(id) || 0;
            return h('button', {
              type: 'button',
              class: 'chip' + (n === paths.length ? ' is-on' : n ? ' is-some' : ''),
              dataset: { toggleTag: id }
            }, tagLabel(id));
          })));
      }));
    if (panel.querySelector('details.palette[open]')) palette.open = true;

    const restorable = paths.some((path) => (app.lib.images[path] || { removed: [] }).removed.length);
    const extras = [];
    if (restorable) extras.push(h('button', { type: 'button', class: 'link-button', dataset: { resetAuto: '1' } }, t('insp.resetAuto')));
    if (single) {
      extras.push(h('label', { class: 'field' },
        h('span', { class: 'field-label' }, t('insp.note')),
        h('textarea', { class: 'text-input note-input', rows: '2', placeholder: t('insp.notePh'), dataset: { note: single } }, (app.lib.images[single] || {}).note || '')));
    }
    const customUsed = customTags().filter((tag) => counts.has(tag.id));
    customUsed.forEach((tag) => {
      const confirming = app.pendingDelete === tag.id;
      extras.push(h('button', { type: 'button', class: 'link-button danger', dataset: { deleteCustom: tag.id } },
        confirming ? t('insp.deleteCustomConfirm', { tag: tag.label }) : t('insp.deleteCustom', { tag: tag.label })));
    });

    const focusAdd = document.activeElement && document.activeElement.id === 'addTagInput';
    panel.replaceChildren(head, h('h2', null, t('insp.tags')), h('div', { class: 'chip-row' }, chips), form, list, palette, ...extras);
    if (focusAdd) $('addTagInput').focus();
  }

  function catOrder(id) {
    const index = Vocab.CATEGORIES.findIndex((cat) => cat.id === tagCat(id));
    return index < 0 ? 99 : index;
  }

  function onInspectorClick(event) {
    const paths = Array.from(app.selected).filter((path) => app.files.has(path));
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.removeTag) {
      removeTag(paths, target.dataset.removeTag);
    } else if (target.dataset.toggleTag) {
      const id = target.dataset.toggleTag;
      const all = paths.every((path) => effectiveTags(path).has(id));
      if (all) removeTag(paths, id); else addTag(paths, id);
    } else if (target.dataset.resetAuto) {
      paths.forEach((path) => { entry(path).removed = []; });
      changed();
    } else if (target.dataset.preview) {
      openPreview(target.dataset.preview);
    } else if (target.dataset.deleteCustom) {
      const id = target.dataset.deleteCustom;
      if (app.pendingDelete === id) {
        app.pendingDelete = null;
        deleteCustomTag(id);
      } else {
        app.pendingDelete = id;
        renderInspector();
        setTimeout(() => { if (app.pendingDelete === id) { app.pendingDelete = null; renderInspector(); } }, 4000);
      }
    }
  }

  function onInspectorSubmit(event) {
    if (!event.target.matches('[data-add-form]')) return;
    event.preventDefault();
    const input = $('addTagInput');
    const paths = Array.from(app.selected).filter((path) => app.files.has(path));
    const words = input.value.split(/[,、，]/).map((word) => word.trim()).filter(Boolean);
    if (!words.length || !paths.length) return;
    words.forEach((word) => {
      const id = resolveTag(word);
      if (id) addTag(paths, id);
    });
    const next = $('addTagInput');
    if (next) { next.value = ''; next.focus(); }
  }

  const saveNote = debounce((path, value) => {
    entry(path).note = value.slice(0, 500);
    persist();
    scheduleScenes();
  }, 400);

  // ---------- サジェスト ----------

  function sceneImages() {
    return app.order.map((path) => {
      const item = app.lib.images[path];
      const words = (app.pathWords.get(path) || []).slice();
      if (item && item.note) {
        // メモの語も本文と照合する（2文字以上の塊）
        item.note.split(/[\s、。,.・/]+/).forEach((word) => { if (word.length >= 2) words.push(word.toLowerCase()); });
      }
      return { path, tags: effectiveTags(path), words };
    });
  }

  const scheduleScenes = debounce(() => { if (app.view === 'suggest') renderScenes(); }, 350);

  function renderScenes() {
    const list = $('sceneList');
    const text = $('scenarioText').value;
    $('charCount').textContent = text ? t('sug.chars', { n: text.length }) : '';
    if (!app.lib) {
      list.replaceChildren(h('div', { class: 'scene-empty' },
        h('p', null, t('sug.needFolder')),
        h('button', { type: 'button', class: 'accent-button', dataset: { pickFolder: '1' } }, t('bar.openFolder'))));
      return;
    }
    const scenes = Engine.splitScenes(text, app.split);
    if (!scenes.length) {
      list.replaceChildren(h('p', { class: 'scene-empty muted' }, t('sug.needText')));
      return;
    }
    const images = sceneImages();
    const limit = Number($('perScene').value) || 6;
    list.replaceChildren(...scenes.map((scene) => sceneCard(scene, images, limit)));
  }

  function sceneCard(scene, images, limit) {
    const detected = Engine.tagsFromText(scene.body, app.matcher);
    const off = app.sceneOff.get(scene.index) || new Set();
    const active = detected.filter((tag) => !off.has(tag.id));
    const results = Engine.rankImages(active, scene.body, images, limit);
    const rest = scene.body.trim().split('\n').slice(1).join(' ') || scene.body;
    const excerpt = rest.replace(/\s+/g, ' ').trim().slice(0, 120);
    return h('article', { class: 'scene-card' },
      h('header', { class: 'scene-head' },
        h('span', { class: 'scene-no' }, t('sug.scene', { n: scene.index + 1 })),
        h('h3', null, scene.title)),
      h('p', { class: 'scene-excerpt' }, excerpt + (rest.length > 120 ? '…' : '')),
      detected.length
        ? h('div', { class: 'scene-tags' },
          h('span', { class: 'field-label', title: t('sug.detectedNote') }, t('sug.detected')),
          h('div', { class: 'chip-row' }, detected.map((tag) => h('button', {
            type: 'button',
            class: 'chip' + (off.has(tag.id) ? ' is-off' : ' is-on'),
            title: tag.hits.join(' / '),
            dataset: { sceneTag: tag.id, scene: String(scene.index) }
          }, tagLabel(tag.id)))))
        : h('p', { class: 'muted small' }, t('sug.noTags')),
      results.length
        ? h('div', { class: 'cand-row' }, results.map(candidate))
        : (detected.length ? h('p', { class: 'muted small' }, t('sug.noResult')) : null));
  }

  function candidate(result) {
    const reasons = result.matched.map((id) => tagLabel(id))
      .concat(result.words.map((word) => '「' + word + '」'));
    const partial = result.partial.map((id) => tagLabel(id));
    return h('button', { type: 'button', class: 'cand-thumb', dataset: { path: result.path, preview: result.path }, title: result.path },
      h('span', { class: 'thumb-img' }, h('img', { alt: '', src: app.thumbUrls.get(result.path) || null }),
        h('span', { class: 'cand-score' }, result.percent + '%')),
      h('span', { class: 'thumb-name' }, result.path.split('/').pop()),
      h('span', { class: 'cand-why' },
        reasons.length ? reasons.join('・') : null,
        partial.length ? h('span', { class: 'cand-partial' }, (reasons.length ? ' / ' : '') + t('sug.whyPartial') + '：' + partial.join('・')) : null));
  }

  function onSceneClick(event) {
    const btn = event.target.closest('button');
    if (!btn) return;
    if (btn.dataset.pickFolder) { pickFolder(); return; }
    if (btn.dataset.preview) { openPreview(btn.dataset.preview); return; }
    if (btn.dataset.sceneTag) {
      const index = Number(btn.dataset.scene);
      const off = app.sceneOff.get(index) || new Set();
      if (off.has(btn.dataset.sceneTag)) off.delete(btn.dataset.sceneTag); else off.add(btn.dataset.sceneTag);
      app.sceneOff.set(index, off);
      renderScenes();
    }
  }

  async function loadTextFile(file) {
    if (!file) return;
    let text = '';
    try {
      const buffer = await file.arrayBuffer();
      text = decodeText(buffer);
    } catch (error) {
      toast(t('toast.importFailed'), 'error');
      return;
    }
    $('scenarioText').value = text;
    app.sceneOff.clear();
    saveText();
    renderScenes();
    toast(t('toast.textLoaded', { name: file.name }));
  }

  // UTF-8 で読めなければ Shift_JIS として読む（古いシナリオのテキスト用）
  function decodeText(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
    } catch (error) {
      try { return new TextDecoder('shift_jis').decode(buffer); } catch (inner) { return new TextDecoder().decode(buffer); }
    }
  }

  const saveText = debounce(() => {
    try { localStorage.setItem(TEXT_KEY, $('scenarioText').value.slice(0, 200000)); } catch (error) { /* noop */ }
  }, 500);

  // ---------- 大きく表示 ----------

  function openPreview(path) {
    const file = app.files.get(path);
    if (!file) return;
    closePreview();
    app.previewPath = path;
    app.previewUrl = URL.createObjectURL(file);
    $('previewImage').src = app.previewUrl;
    $('previewPath').textContent = path;
    $('previewTags').replaceChildren(...Array.from(effectiveTags(path))
      .sort((a, b) => catOrder(a) - catOrder(b))
      .map((id) => h('span', { class: 'chip' }, tagLabel(id))));
    $('previewModal').hidden = false;
    $('copyPathBtn').focus();
  }

  function closePreview() {
    if (app.previewUrl) URL.revokeObjectURL(app.previewUrl);
    app.previewUrl = null;
    app.previewPath = null;
    $('previewImage').removeAttribute('src');
    $('previewModal').hidden = true;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const area = h('textarea', { class: 'visually-hidden' });
      area.value = text;
      document.body.append(area);
      area.select();
      try { document.execCommand('copy'); } catch (inner) { /* noop */ }
      area.remove();
    }
    toast(t('modal.copied'));
  }

  // ---------- 書き出し・読み込み ----------

  function exportTags() {
    if (!app.lib) return;
    const blob = new Blob([JSON.stringify(exportData(), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: (app.libId || 'haikei') + '-haikei-tags.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('toast.exported'));
  }

  async function importTags(file) {
    if (!file || !app.lib) return;
    let raw;
    try { raw = JSON.parse(await file.text()); } catch (error) { toast(t('toast.importFailed'), 'error'); return; }
    if (!raw || raw.app !== 'haikei-suggest') { toast(t('toast.importFailed'), 'error'); return; }
    const incoming = sanitizeLibrary(raw);
    incoming.customTags.forEach((tag) => {
      if (!app.lib.customTags.some((item) => item.id === tag.id)) app.lib.customTags.push(tag);
    });
    let n = 0;
    Object.entries(incoming.images).forEach(([path, item]) => {
      app.lib.images[path] = item;
      if (app.files.has(path)) n += 1;
    });
    rebuildMatcher();
    migrateMoved();
    changed();
    toast(t('toast.imported', { n }));
  }

  // ---------- イベント ----------

  function bind() {
    document.querySelectorAll('[data-lang-choice]').forEach((btn) => btn.addEventListener('click', () => {
      app.lang = btn.dataset.langChoice;
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      applyLanguage();
    }));

    $('openFolderBtn').addEventListener('click', pickFolder);
    $('emptyPickBtn').addEventListener('click', pickFolder);
    $('reopenBtn').addEventListener('click', reopenLast);
    $('folderInput').addEventListener('change', (event) => {
      openFileList(event.target.files);
      event.target.value = '';
    });
    $('saveFolderBtn').addEventListener('click', saveToFolder);
    $('aiPackBtn').addEventListener('click', openAiPack);
    $('aiPackInput').addEventListener('change', async (event) => {
      const files = Store.filesFromList(event.target.files);
      event.target.value = '';
      if (files.size) await loadAiPack(files, null);
    });
    $('exportBtn').addEventListener('click', exportTags);
    $('importBtn').addEventListener('click', () => $('importInput').click());
    $('importInput').addEventListener('change', (event) => {
      importTags(event.target.files[0]);
      event.target.value = '';
    });

    $('helpBtn').addEventListener('click', () => {
      const drawer = $('helpDrawer');
      drawer.hidden = !drawer.hidden;
      $('helpBtn').setAttribute('aria-expanded', String(!drawer.hidden));
    });
    document.querySelectorAll('[data-close-drawer]').forEach((btn) => btn.addEventListener('click', () => {
      $('helpDrawer').hidden = true;
      $('helpBtn').setAttribute('aria-expanded', 'false');
    }));

    $('viewToggle').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-view]');
      if (btn) setView(btn.dataset.view);
    });

    $('searchInput').addEventListener('input', debounce((event) => {
      app.filter.q = event.target.value;
      app.shownLimit = PAGE_SIZE;
      renderGrid();
      renderFilters();
    }, 200));
    $('untaggedOnly').addEventListener('change', (event) => {
      app.filter.untagged = event.target.checked;
      app.shownLimit = PAGE_SIZE;
      renderGrid();
      renderFilters();
    });
    $('filterList').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-filter-tag]');
      if (!btn) return;
      const id = btn.dataset.filterTag;
      if (app.filter.tags.has(id)) app.filter.tags.delete(id); else app.filter.tags.add(id);
      app.shownLimit = PAGE_SIZE;
      renderFilters();
      renderGrid();
    });
    $('clearFilterBtn').addEventListener('click', () => {
      app.filter.tags.clear();
      app.filter.untagged = false;
      app.filter.q = '';
      $('searchInput').value = '';
      $('untaggedOnly').checked = false;
      renderFilters();
      renderGrid();
    });

    $('imageGrid').addEventListener('click', (event) => {
      const box = event.target.closest('[data-check]');
      if (box) { toggleCheck(box.dataset.check, box.checked); return; }
      const hit = event.target.closest('[data-pick]');
      if (hit) selectPath(hit.dataset.pick, event);
    });
    $('imageGrid').addEventListener('dblclick', (event) => {
      const hit = event.target.closest('[data-pick]');
      if (hit) openPreview(hit.dataset.pick);
    });
    $('selectAllBtn').addEventListener('click', () => {
      app.visible.forEach((path) => app.selected.add(path));
      syncSelection();
    });
    $('selectNoneBtn').addEventListener('click', () => {
      app.selected.clear();
      syncSelection();
    });
    $('moreBtn').addEventListener('click', () => {
      app.shownLimit += PAGE_SIZE;
      renderGrid();
    });

    $('inspector').addEventListener('click', onInspectorClick);
    $('inspector').addEventListener('submit', onInspectorSubmit);
    $('inspector').addEventListener('input', (event) => {
      if (event.target.dataset.note) saveNote(event.target.dataset.note, event.target.value);
    });

    $('scenarioText').addEventListener('input', () => {
      app.sceneOff.clear();
      saveText();
      scheduleScenes();
    });
    $('loadTextBtn').addEventListener('click', () => $('textInput').click());
    $('textInput').addEventListener('change', (event) => {
      loadTextFile(event.target.files[0]);
      event.target.value = '';
    });
    $('clearTextBtn').addEventListener('click', () => {
      $('scenarioText').value = '';
      app.sceneOff.clear();
      saveText();
      renderScenes();
    });
    $('scenarioText').addEventListener('dragover', (event) => event.preventDefault());
    $('scenarioText').addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files[0];
      if (!file) return;
      event.preventDefault();
      loadTextFile(file);
    });
    $('splitToggle').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-split]');
      if (!btn) return;
      app.split = btn.dataset.split;
      app.sceneOff.clear();
      document.querySelectorAll('#splitToggle [data-split]').forEach((item) => item.classList.toggle('is-active', item === btn));
      renderScenes();
    });
    $('perScene').addEventListener('change', renderScenes);
    $('sceneList').addEventListener('click', onSceneClick);

    document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closePreview));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('previewModal').hidden) closePreview();
    });
    $('copyPathBtn').addEventListener('click', () => { if (app.previewPath) copyText(app.libId + '/' + app.previewPath); });
    $('copyNameBtn').addEventListener('click', () => { if (app.previewPath) copyText(app.previewPath.split('/').pop()); });
    $('showInLibBtn').addEventListener('click', () => {
      const path = app.previewPath;
      closePreview();
      if (!path) return;
      app.selected = new Set([path]);
      app.filter.tags.clear();
      app.filter.q = '';
      app.filter.untagged = false;
      $('searchInput').value = '';
      $('untaggedOnly').checked = false;
      const index = app.order.indexOf(path);
      if (index >= app.shownLimit) app.shownLimit = Math.ceil((index + 1) / PAGE_SIZE) * PAGE_SIZE;
      setView('library');
      renderFilters();
      renderGrid();
      renderInspector();
      const card = $('imageGrid').querySelector('[data-path="' + CSS.escape(path) + '"]');
      if (card) card.scrollIntoView({ block: 'center' });
    });
  }

  async function init() {
    app.lang = detectLang();
    try { $('scenarioText').value = localStorage.getItem(TEXT_KEY) || ''; } catch (error) { /* noop */ }
    if (!Store.canPickDirectory) $('fallbackNote').hidden = false;
    bind();
    applyLanguage();
    updateAiButton();
    setView('library');
    if (Store.canPickDirectory && (await Store.loadLastHandle())) $('reopenBtn').hidden = false;
  }

  init();
})();
