/* Scenario DTP Designer v1.5 - main.js */
(function () {
  'use strict';

  const STORAGE_KEY = 'scenarioDtpDesignerStaticV15';
  const DEFAULT_SOURCE_W = 310;
  const DEFAULT_STRUCTURE_W = 305;
  const GRID = 8;
  const LAYOUT = {
    mainW: 628,
    mainH: 1055,
    memoW: 106,
    memoH: 1000,
    colGap: 18
  };
  LAYOUT.colW = Math.floor((LAYOUT.mainW - LAYOUT.colGap) / 2);
  LAYOUT.rightColX = LAYOUT.colW + LAYOUT.colGap;
  LAYOUT.dividerX = LAYOUT.colW + LAYOUT.colGap / 2;

  const state = {
    pages: [],
    currentPageIndex: 0,
    selectedId: null,
    zoom: 0.78,
    assets: [],
    sourceLoaded: false
  };

  const history = { undo: [], redo: [], locked: false };
  const els = {};
  const ids = [
    'appShell', 'sourcePanel', 'structurePanel', 'splitterSource', 'splitterStructure',
    'pagesContainer', 'pageList', 'canvasWrap', 'workspace', 'sourceText', 'parseBtn',
    'clearTextBtn', 'txtInput', 'txtDropZone', 'addPageBtn', 'saveBtn', 'jsonInput', 'pdfBtn',
    'pngBtn', 'helpBtn', 'helpCloseBtn', 'helpPanel', 'shortcutBtn', 'shortcutCloseBtn',
    'shortcutPanel', 'imageInput', 'assetList', 'zoomOut', 'zoomIn', 'zoomText',
    'pageIndicator', 'typeSelect', 'textEdit', 'fontSelect', 'sizeInput', 'lineInput',
    'padInput', 'bgInput', 'colorInput', 'applyBtn', 'deleteBtn', 'templateBtn', 'fitBtn', 'blockizeBtn'
  ];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    ids.forEach((id) => { els[id] = document.getElementById(id); });
    bindEvents();
    restore();
  }

  function currentPage() { return state.pages[state.currentPageIndex]; }
  function snap(v) { return Math.round(v / GRID) * GRID; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function colFromX(x, w = 0) { return (x + w / 2) < LAYOUT.dividerX ? 0 : 1; }
  function colX(col) { return col === 0 ? 0 : LAYOUT.rightColX; }

  function snapshot() {
    return JSON.stringify({ pages: state.pages, currentPageIndex: state.currentPageIndex, selectedId: state.selectedId, zoom: state.zoom, assets: state.assets, sourceLoaded: state.sourceLoaded });
  }
  function hydrate(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    state.pages = data.pages && data.pages.length ? data.pages : [createPage('シナリオ本文')];
    state.currentPageIndex = Math.min(data.currentPageIndex || 0, state.pages.length - 1);
    state.selectedId = data.selectedId || null;
    state.zoom = data.zoom || 0.78;
    state.assets = data.assets || [];
    state.sourceLoaded = !!data.sourceLoaded;
  }
  function pushHistory() {
    if (history.locked) return;
    history.undo.push(snapshot());
    if (history.undo.length > 100) history.undo.shift();
    history.redo = [];
  }
  function undo() {
    if (!history.undo.length) return;
    history.locked = true;
    history.redo.push(snapshot());
    hydrate(history.undo.pop());
    history.locked = false;
    render(false);
  }
  function redo() {
    if (!history.redo.length) return;
    history.locked = true;
    history.undo.push(snapshot());
    hydrate(history.redo.pop());
    history.locked = false;
    render(false);
  }

  function createPage(title = 'ページ') { return { id: crypto.randomUUID(), title, blocks: [], flowText: '' }; }
  function defaultStyle(type) {
    const base = { fontFamily: "'Yu Gothic', 'Hiragino Sans', sans-serif", fontSize: 12, lineHeight: 1.7, padding: 8, color: '#111827', background: '#ffffff' };
    if (type === 'sceneTitle') { base.fontFamily = "'Yu Mincho', 'Hiragino Mincho ProN', serif"; base.fontSize = 22; }
    if (type === 'header') { base.fontFamily = "'Yu Mincho', 'Hiragino Mincho ProN', serif"; base.fontSize = 38; base.color = '#ffffff'; base.background = '#101820'; }
    if (type === 'keeper') { base.background = '#ffffff'; base.fontSize = 10; }
    return base;
  }
  function createBlock(type, text, x, y, w, h, src = null) {
    return { id: crypto.randomUUID(), type, text, x, y, w, h, src, style: defaultStyle(type) };
  }

  function bindEvents() {
    els.parseBtn.addEventListener('click', () => { pushHistory(); loadFlowPreview(els.sourceText.value); render(); });
    els.clearTextBtn.addEventListener('click', () => { els.sourceText.value = ''; state.sourceLoaded = false; render(); els.sourceText.focus(); });

    els.txtDropZone.addEventListener('click', () => els.txtInput.click());
    els.txtInput.addEventListener('change', async (ev) => { const file = ev.target.files && ev.target.files[0]; if (file) await loadTxtFile(file); ev.target.value = ''; });
    ['dragenter', 'dragover'].forEach((name) => els.txtDropZone.addEventListener(name, (ev) => { ev.preventDefault(); els.txtDropZone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((name) => els.txtDropZone.addEventListener(name, () => els.txtDropZone.classList.remove('dragover')));
    els.txtDropZone.addEventListener('drop', async (ev) => { ev.preventDefault(); const file = [...ev.dataTransfer.files].find((f) => f.type.startsWith('text/') || f.name.endsWith('.txt')); if (file) await loadTxtFile(file); });

    els.addPageBtn.addEventListener('click', () => { pushHistory(); state.pages.push(createPage(`ページ${state.pages.length + 1}`)); state.currentPageIndex = state.pages.length - 1; state.selectedId = null; render(); scrollToCurrentPage(); });
    if (els.blockizeBtn) els.blockizeBtn.addEventListener('click', () => { pushHistory(); blockizeCurrentPage(); render(); });
    document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => addManualBlock(btn.dataset.add)));
    els.imageInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      pushHistory();
      const src = await fileToDataUrl(file);
      state.assets.push({ id: crypto.randomUUID(), name: file.name, src });
      currentPage().blocks.push(createBlock('image', '', LAYOUT.rightColX, 300, LAYOUT.colW, 110, src));
      render();
      ev.target.value = '';
    });

    els.applyBtn.addEventListener('click', () => { const found = findBlock(state.selectedId); if (!found) return; pushHistory(); applyInspector(found.block); normalizeBlockGeometry(found.block); render(); });
    els.deleteBtn.addEventListener('click', deleteSelected);
    els.templateBtn.addEventListener('click', () => { pushHistory(); applyTemplateToCurrentPage(); render(); });
    els.fitBtn.addEventListener('click', () => fitPreviewToHeight());
    els.zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.05));
    els.zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.05));
    els.helpBtn.addEventListener('click', () => togglePanel('help'));
    els.helpCloseBtn.addEventListener('click', () => closeHelp());
    els.shortcutBtn.addEventListener('click', () => togglePanel('shortcut'));
    els.shortcutCloseBtn.addEventListener('click', () => closeShortcut());
    els.saveBtn.addEventListener('click', saveProject);
    els.jsonInput.addEventListener('change', async (ev) => { const file = ev.target.files && ev.target.files[0]; if (!file) return; pushHistory(); hydrate(await file.text()); history.redo = []; render(); ev.target.value = ''; });
    els.pdfBtn.addEventListener('click', () => window.print());
    els.pngBtn.addEventListener('click', exportPng);

    els.textEdit.addEventListener('input', () => {
      autoResizeTextEdit();
      const found = findBlock(state.selectedId);
      if (!found) return;
      found.block.text = els.textEdit.value;
      const live = document.querySelector(`[data-id="${CSS.escape(found.block.id)}"]`);
      if (live && document.activeElement !== live) renderBlockContent(live, found.block, true);
    });

    bindWorkspaceNavigation();
    bindColumnResize();
  }

  async function loadTxtFile(file) {
    els.sourceText.value = await file.text();
    state.sourceLoaded = true;
    render();
    els.sourceText.focus();
  }

  function addManualBlock(type) {
    pushHistory();
    currentPage().flowText = '';
    const textMap = { header: 'イザナミの棺\n— 黄泉を彷徨う者たちへ —', sceneTitle: '03　新しいシーン', body: '本文を入力してください。', keeper: 'KP向けの補足を入力してください。', dialogue: 'セリフ：NPC\n「ここに台詞を入力」', check: '▼判定情報\n成功：情報を得る。\n失敗：別の展開へ。', image: '' };
    const specs = { header: [0, 0, LAYOUT.mainW, 86], keeper: [0, 80, LAYOUT.memoW, 70], image: [LAYOUT.rightColX, 300, LAYOUT.colW, 110] };
    const [x, y, w, h] = specs[type] || [0, 240, LAYOUT.colW, autoHeightFor(type, textMap[type], LAYOUT.colW)];
    const block = createBlock(type, textMap[type], x, y, w, h);
    currentPage().blocks.push(block);
    state.selectedId = block.id;
    render();
  }



  function loadFlowPreview(src) {
    const normalized = src.replace(/\r\n/g, '\n').trim();
    const chunks = splitFlowTextIntoPages(normalized);
    state.pages = chunks.map((chunk, idx) => {
      const title = idx === 0 ? (inferFlowTitle(normalized) || 'プレビュー本文') : `プレビュー ${idx + 1}`;
      const p = createPage(title);
      p.flowText = chunk;
      p.blocks = [];
      return p;
    });
    if (!state.pages.length) state.pages = [createPage('プレビュー本文')];
    state.currentPageIndex = 0;
    state.selectedId = null;
    state.sourceLoaded = state.sourceLoaded || false;
  }

  function inferFlowTitle(src) {
    const call = src.match(/Call of Cthulhu『([^』]+)』/);
    if (call) return call[1].trim();
    const bracket = src.match(/『([^』]+)』/);
    if (bracket) return bracket[1].trim();
    const h = src.match(/^#\s+(.+)$/m);
    if (h) return h[1].trim();
    return '';
  }

  function splitFlowTextIntoPages(text) {
    if (!text) return [''];
    const maxChars = 1650;
    const paragraphs = text.split(/\n{2,}/);
    const pages = [];
    let buf = '';
    for (const para of paragraphs) {
      const candidate = buf ? `${buf}\n\n${para}` : para;
      if (candidate.length > maxChars && buf) {
        pages.push(buf.trim());
        buf = para;
      } else {
        buf = candidate;
      }
      while (buf.length > maxChars * 1.35) {
        let cut = Math.max(buf.lastIndexOf('。', maxChars), buf.lastIndexOf('\n', maxChars));
        if (cut < 300) cut = maxChars;
        pages.push(buf.slice(0, cut + 1).trim());
        buf = buf.slice(cut + 1).trim();
      }
    }
    if (buf.trim()) pages.push(buf.trim());
    return pages;
  }

  function blockizeCurrentPage() {
    const p = currentPage();
    const source = p.flowText || els.sourceText.value || '';
    if (!source.trim()) return;
    const originalPages = state.pages;
    const oldIndex = state.currentPageIndex;
    parseIntoPages(source);
    // parseIntoPages is used here only for explicit edit-mode blockization.
    state.pages.forEach((page, idx) => { page.title = idx === 0 ? `${p.title || '本文'} ブロック` : `ブロック ${idx + 1}`; page.flowText = ''; });
    state.currentPageIndex = 0;
    state.selectedId = state.pages[0]?.blocks[0]?.id || null;
  }

  function formatFlowText(text) {
    return escapeHtml(text)
      .replace(/^#\s+(.+)$/gm, '<div class="flow-heading1">$1</div>')
      .replace(/^##\s+(.+)$/gm, '<div class="flow-heading2">$1</div>')
      .replace(/^■(.+)$/gm, '<span class="flow-section-title">■$1</span>')
      .replace(/^【(.+)】$/gm, '<span class="flow-box-title">【$1】</span>')
      .replace(/^(▼\s*KP\s*情報|\[KP\]|KP情報)(.*)$/gm, '<div class="flow-kp">$2</div>')
      .replace(/^▼(.+)$/gm, '<span class="flow-box-title">▼$1</span>')
      .replace(/^(●|○)(.+)$/gm, '<span class="flow-bullet">$1$2</span>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function parseIntoPages(src) {
    const tokens = tokenize(src);
    const pages = [createPage(inferTitle(src) || 'シナリオ本文')];
    let pageIndex = 0;
    let col = 0;
    let y = 0;
    const topOffsetFirst = 0;

    function pageObj() { return pages[pageIndex]; }
    function newPage() { pages.push(createPage(`本文 ${pages.length + 1}`)); pageIndex++; col = 0; y = 0; }
    function offsetY() { return pageIndex === 0 ? topOffsetFirst : 0; }
    function availableH() { return LAYOUT.mainH - offsetY(); }
    function nextColumnOrPage() { if (col === 0) { col = 1; y = 0; } else { newPage(); } }

    function placeFlowBlock(type, text) {
      const chunks = splitTextForFlow(type, text);
      chunks.forEach((chunk) => {
        let h = autoHeightFor(type, chunk, LAYOUT.colW);
        if (y + h > availableH()) nextColumnOrPage();
        if (h > availableH()) h = availableH();
        const b = createBlock(type, chunk, colX(col), offsetY() + y, LAYOUT.colW, h);
        pageObj().blocks.push(b);
        y += h + 8;
      });
    }

    // No automatic header on preview/blockize. Add a header manually from ブロック追加 when needed.

    tokens.forEach((token) => {
      if (token.type === 'keeper') {
        const memoBlocks = pageObj().blocks.filter((b) => b.type === 'keeper');
        const memoY = Math.min(LAYOUT.memoH - 70, memoBlocks.length * 86);
        const h = autoHeightFor('keeper', token.text, LAYOUT.memoW);
        pageObj().blocks.push(createBlock('keeper', token.text, 0, memoY, LAYOUT.memoW, clamp(h, 52, 160)));
      } else {
        placeFlowBlock(token.type, token.text);
      }
    });

    state.pages = pages;
    state.currentPageIndex = 0;
    state.selectedId = pages[0].blocks.find((b) => b.type !== 'header')?.id || pages[0].blocks[0].id;
  }

  function inferTitle(src) { const m = src.match(/^#\s+(.+)$/m); return m ? m[1].trim() : ''; }

  function tokenize(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const tokens = [];
    let buf = [];
    let mode = 'body';
    function flush() {
      const text = buf.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (text) tokens.push({ type: mode, text });
      buf = [];
    }
    for (const raw of lines) {
      const line = raw.trimEnd();
      const t = line.trim();
      if (!t) { if (buf.length) buf.push(''); continue; }
      if (/^#\s+/.test(t)) continue;
      if (/^##\s+/.test(t)) { flush(); mode = 'sceneTitle'; buf = [t.replace(/^##\s+/, '')]; flush(); mode = 'body'; continue; }
      if (/^(▼\s*KP\s*情報|\[KP\]|KP情報)/.test(t)) { flush(); mode = 'keeper'; buf = []; continue; }
      if (/^(▼|【判定|判定)/.test(t)) { flush(); mode = 'check'; buf = [t]; continue; }
      if (/^(セリフ|「)/.test(t) && mode !== 'dialogue') { flush(); mode = 'dialogue'; buf = [line]; continue; }
      if (mode === 'keeper' && /^(##|#|▼)/.test(t)) { flush(); mode = /^(▼|【判定|判定)/.test(t) ? 'check' : 'body'; buf = [line]; continue; }
      if (mode === 'dialogue' && /^##\s+/.test(t)) { flush(); mode = 'sceneTitle'; buf = [t.replace(/^##\s+/, '')]; flush(); mode = 'body'; continue; }
      buf.push(line);
    }
    flush();
    return tokens;
  }

  function autoHeightFor(type, text, width) {
    if (type === 'header') return 86;
    if (type === 'image') return 110;
    const font = type === 'sceneTitle' ? 22 : (type === 'keeper' ? 10 : 12);
    const lineHeight = type === 'keeper' ? 1.55 : 1.7;
    const padding = type === 'keeper' ? 12 : 18;
    const charsPerLine = Math.max(8, Math.floor((width - padding) / (font * 0.92)));
    const lines = String(text || '').split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
    const minH = type === 'sceneTitle' ? 48 : type === 'keeper' ? 52 : 38;
    return snap(Math.max(minH, Math.ceil(lines * font * lineHeight + padding + 8)));
  }

  function splitTextForFlow(type, text) {
    if (type === 'sceneTitle' || type === 'dialogue' || type === 'check') return [text];
    const maxChars = 430;
    if (text.length <= maxChars) return [text];
    const result = [];
    let rest = text.trim();
    while (rest.length > maxChars) {
      let cut = Math.max(rest.lastIndexOf('。', maxChars), rest.lastIndexOf('\n', maxChars));
      if (cut < 160) cut = maxChars;
      result.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) result.push(rest);
    return result;
  }

  function applyTemplateToCurrentPage() {
    currentPage().flowText = '';
    currentPage().blocks = [
      createBlock('header', '雨待ち停留所\nCall of Cthulhu『雨待ち停留所』', 0, 0, LAYOUT.mainW, 86),
      createBlock('sceneTitle', '01　雨音の駅舎', 0, 104, LAYOUT.colW, 48),
      createBlock('body', '───例えば、それは雨音だった。古い駅舎の屋根を叩く、小さな拍手のような音だった。\n改札の向こう、誰もいないはずのホームに白い灯りが揺れていた。', 0, 160, LAYOUT.colW, 120),
      createBlock('check', '●《目星》成功\n傘立ての底に、銀色の古い切符が落ちていることに気づく。\n○ 失敗\n雨水が床に広がっていることしか分からない。', LAYOUT.rightColX, 104, LAYOUT.colW, 120),
      createBlock('keeper', 'サンプル用メモ。\n雨音、無人駅、古い切符を強調する。', 0, 0, LAYOUT.memoW, 74)
    ];
    state.selectedId = currentPage().blocks[0].id;
  }

  function buildDefaultSample() {
    const sample = els.sourceText ? els.sourceText.value : '';
    const chunks = splitFlowTextIntoPages(sample);
    state.pages = chunks.map((chunk, idx) => {
      const p = createPage(idx === 0 ? '雨待ち停留所' : `雨待ち停留所 ${idx + 1}`);
      p.flowText = chunk;
      p.blocks = [];
      if (idx === 0) {
        p.blocks.push(createBlock('header', '雨待ち停留所\nCall of Cthulhu『雨待ち停留所』', 0, 0, LAYOUT.mainW, 86));
      }
      return p;
    });
    if (!state.pages.length) state.pages = [createPage('雨待ち停留所')];
    state.currentPageIndex = 0;
    state.selectedId = state.pages[0].blocks[0]?.id || null;
  }

  function render(shouldPersist = true) {
    document.documentElement.style.setProperty('--zoom', state.zoom);
    document.documentElement.style.setProperty('--structure-w', `${getCssPx('--structure-w', DEFAULT_STRUCTURE_W)}px`);
    document.documentElement.style.setProperty('--source-w', `${getCssPx('--source-w', DEFAULT_SOURCE_W)}px`);
    els.zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
    els.pageIndicator.textContent = `${state.currentPageIndex + 1} / ${state.pages.length}`;
    els.txtDropZone.classList.toggle('is-hidden', state.sourceLoaded);
    const sourceCard = document.querySelector('.source-card');
    if (sourceCard) sourceCard.classList.toggle('source-loaded', state.sourceLoaded);
    renderPages();
    renderAssets();
    renderPageCanvases();
    updateInspector();
    if (shouldPersist) persist();
  }

  function renderPages() {
    els.pageList.innerHTML = '';
    state.pages.forEach((p, idx) => {
      const item = document.createElement('div'); item.className = `page-item ${idx === state.currentPageIndex ? 'is-active' : ''}`;
      const thumb = document.createElement('button'); thumb.className = 'page-thumb'; thumb.type = 'button'; thumb.title = `P${idx + 1}`;
      thumb.addEventListener('click', () => { state.currentPageIndex = idx; state.selectedId = null; render(); scrollToCurrentPage(); });
      const input = document.createElement('input'); input.className = 'page-name'; input.value = p.title || `ページ${idx + 1}`;
      input.addEventListener('change', () => { pushHistory(); p.title = input.value.trim() || `ページ${idx + 1}`; render(); });
      item.append(thumb, input); els.pageList.appendChild(item);
    });
  }

  function renderAssets() {
    els.assetList.innerHTML = '';
    state.assets.forEach((asset) => {
      const img = document.createElement('img'); img.className = 'asset-thumb'; img.src = asset.src; img.title = 'クリックで画像ブロックとして追加';
      img.addEventListener('click', () => { pushHistory(); currentPage().blocks.push(createBlock('image', '', LAYOUT.rightColX, 300, LAYOUT.colW, 110, asset.src)); render(); });
      els.assetList.appendChild(img);
    });
  }

  function renderPageCanvases() {
    els.pagesContainer.innerHTML = '';
    state.pages.forEach((p, pageIndex) => {
      const canvas = document.createElement('section'); canvas.className = 'page-canvas'; if (p.blocks.some((b) => b.type === 'header')) canvas.classList.add('has-header'); canvas.dataset.pageIndex = String(pageIndex);
      canvas.innerHTML = `<div class="main-area"><div class="flow-text"></div><div class="block-layer"></div></div><aside class="memo-area"><h3>KPメモ</h3><div class="memo-layer"></div></aside><div class="page-number">${pageIndex + 1}</div>`;
      const flowText = canvas.querySelector('.flow-text');
      if (p.flowText) flowText.innerHTML = formatFlowText(p.flowText);
      const blockLayer = canvas.querySelector('.block-layer');
      const memoLayer = canvas.querySelector('.memo-layer');
      p.blocks.forEach((block) => {
        const el = block.type === 'keeper' ? renderMemoBlock(block) : renderBlock(block);
        if (block.type === 'keeper') memoLayer.appendChild(el); else blockLayer.appendChild(el);
      });
      canvas.addEventListener('click', () => { state.selectedId = null; render(); });
      els.pagesContainer.appendChild(canvas);
    });
  }

  function renderBlock(block) {
    const el = document.createElement('div');
    el.className = `dtp-block ${block.type}-block ${state.selectedId === block.id ? 'selected' : ''}`;
    el.dataset.id = block.id;
    const isSelected = state.selectedId === block.id;
    Object.assign(el.style, { left: `${block.x}px`, top: `${block.y}px`, width: `${block.w}px`, height: `${block.h}px`, fontFamily: block.style.fontFamily, fontSize: `${block.style.fontSize}px`, lineHeight: block.style.lineHeight, padding: `${block.style.padding}px`, color: block.style.color, background: block.style.background });
    renderBlockContent(el, block, isSelected);
    if (block.type !== 'image') {
      el.contentEditable = 'true';
      el.spellcheck = false;
      el.addEventListener('input', () => {
        block.text = el.innerText.replace(/\n$/g, '');
        const h = autoHeightFor(block.type, block.text, block.w);
        block.h = clamp(h, 32, LAYOUT.mainH - block.y);
        el.style.height = `${block.h}px`;
        if (state.selectedId === block.id) syncInspectorText(block.text);
        persist();
      });
      el.addEventListener('blur', () => render());
    }
    el.addEventListener('mousedown', startBlockDrag);
    el.addEventListener('click', (ev) => { ev.stopPropagation(); state.selectedId = block.id; state.currentPageIndex = getPageIndexFromElement(el); render(); });
    return el;
  }

  function renderBlockContent(el, block, selected = false) {
    if (block.type === 'image') {
      el.innerHTML = '';
      if (block.src) { const img = document.createElement('img'); img.src = block.src; el.appendChild(img); } else { el.textContent = '画像枠'; }
      return;
    }
    if (selected) {
      el.textContent = block.text || '';
      return;
    }
    if (block.type === 'header') {
      const [title, ...subs] = (block.text || '').split('\n');
      el.innerHTML = `<span class="header-title">${escapeHtml(title || 'ヘッダー')}</span><span class="header-subtitle">${escapeHtml(subs.join(' ') || '')}</span>`;
    } else if (block.type === 'sceneTitle') {
      const m = (block.text || '').match(/^(\d+)\s*(.*)$/);
      el.innerHTML = m ? `<span class="num">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}` : escapeHtml(block.text || '');
    } else {
      el.textContent = block.text || '';
    }
  }

  function renderMemoBlock(block) {
    const el = document.createElement('div'); el.className = `memo-card ${state.selectedId === block.id ? 'selected' : ''}`; el.dataset.id = block.id; el.textContent = block.text || '';
    Object.assign(el.style, { top: `${block.y}px`, height: `${block.h}px`, fontFamily: block.style.fontFamily, fontSize: `${block.style.fontSize}px`, lineHeight: block.style.lineHeight, color: block.style.color, background: block.style.background });
    el.contentEditable = 'true';
    el.spellcheck = false;
    el.addEventListener('input', () => {
      block.text = el.innerText.replace(/\n$/g, '');
      block.h = clamp(autoHeightFor('keeper', block.text, LAYOUT.memoW), 42, LAYOUT.memoH - block.y);
      el.style.height = `${block.h}px`;
      if (state.selectedId === block.id) syncInspectorText(block.text);
      persist();
    });
    el.addEventListener('mousedown', startMemoDrag); el.addEventListener('click', (ev) => { ev.stopPropagation(); state.selectedId = block.id; state.currentPageIndex = getPageIndexFromElement(el); render(); });
    return el;
  }

  function startBlockDrag(ev) {
    if (ev.target.isContentEditable && ev.detail >= 2) return;
    const found = findBlock(ev.currentTarget.dataset.id); if (!found) return;
    pushHistory(); state.selectedId = found.block.id; state.currentPageIndex = found.pageIndex;
    const block = found.block; const startX = ev.clientX; const startY = ev.clientY; const origX = block.x; const origY = block.y; const target = ev.currentTarget;
    const onMove = (moveEv) => {
      const dx = (moveEv.clientX - startX) / state.zoom;
      const dy = (moveEv.clientY - startY) / state.zoom;
      let nextX = origX + dx;
      let nextY = origY + dy;
      if (block.type !== 'header' && block.type !== 'image') {
        const chosenCol = colFromX(nextX, block.w);
        nextX = colX(chosenCol);
        block.w = LAYOUT.colW;
        target.style.width = `${block.w}px`;
      } else {
        nextX = snap(clamp(nextX, 0, LAYOUT.mainW - block.w));
      }
      block.x = nextX;
      block.y = snap(clamp(nextY, 0, LAYOUT.mainH - block.h));
      target.style.left = `${block.x}px`; target.style.top = `${block.y}px`;
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); normalizeBlockGeometry(block); render(); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }

  function startMemoDrag(ev) {
    const found = findBlock(ev.currentTarget.dataset.id); if (!found) return;
    pushHistory(); state.selectedId = found.block.id; state.currentPageIndex = found.pageIndex;
    const block = found.block; const startY = ev.clientY; const origY = block.y; const target = ev.currentTarget; const maxY = Math.max(0, LAYOUT.memoH - block.h);
    const onMove = (moveEv) => { const dy = (moveEv.clientY - startY) / state.zoom; block.y = snap(clamp(origY + dy, 0, maxY)); target.style.top = `${block.y}px`; };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); render(); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }

  function normalizeBlockGeometry(block) {
    if (!block || block.type === 'keeper') return;
    if (block.type !== 'header' && block.type !== 'image') {
      const chosenCol = colFromX(block.x, block.w);
      block.x = colX(chosenCol);
      block.w = LAYOUT.colW;
    }
    block.y = clamp(block.y, 0, LAYOUT.mainH - Math.min(block.h, LAYOUT.mainH));
    if (block.type !== 'image' && block.type !== 'header') block.h = clamp(autoHeightFor(block.type, block.text, block.w), 32, LAYOUT.mainH - block.y);
  }

  function bindWorkspaceNavigation() {
    let panning = false, sx = 0, sy = 0, sl = 0, st = 0;
    els.canvasWrap.addEventListener('wheel', (ev) => { if (!(ev.ctrlKey || ev.metaKey)) return; ev.preventDefault(); setZoom(state.zoom + (ev.deltaY < 0 ? 0.04 : -0.04)); }, { passive: false });
    els.canvasWrap.addEventListener('mousedown', (ev) => { if (ev.target.closest('.dtp-block,.memo-card,button,input,textarea,select,label')) return; panning = true; sx = ev.clientX; sy = ev.clientY; sl = els.canvasWrap.scrollLeft; st = els.canvasWrap.scrollTop; els.canvasWrap.classList.add('is-panning'); });
    window.addEventListener('mousemove', (ev) => { if (!panning) return; els.canvasWrap.scrollLeft = sl - (ev.clientX - sx); els.canvasWrap.scrollTop = st - (ev.clientY - sy); });
    window.addEventListener('mouseup', () => { panning = false; els.canvasWrap.classList.remove('is-panning'); });
    els.canvasWrap.addEventListener('scroll', () => { const pages = [...document.querySelectorAll('.page-canvas')]; const wrapTop = els.canvasWrap.getBoundingClientRect().top; let best = 0, dist = Infinity; pages.forEach((pg, i) => { const d = Math.abs(pg.getBoundingClientRect().top - wrapTop - 20); if (d < dist) { dist = d; best = i; } }); state.currentPageIndex = best; els.pageIndicator.textContent = `${best + 1} / ${state.pages.length}`; });
  }

  function bindColumnResize() {
    const bind = (splitter, prop, def, min, max) => {
      splitter.addEventListener('dblclick', () => { document.documentElement.style.setProperty(prop, `${def}px`); });
      splitter.addEventListener('mousedown', (ev) => { ev.preventDefault(); const startX = ev.clientX; const start = getCssPx(prop, def); const onMove = (e) => { const next = clamp(start + (e.clientX - startX), min, max); document.documentElement.style.setProperty(prop, `${next}px`); }; const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); });
    };
    bind(els.splitterSource, '--source-w', DEFAULT_SOURCE_W, 220, 560);
    bind(els.splitterStructure, '--structure-w', DEFAULT_STRUCTURE_W, 250, 500);
  }

  function findBlock(id) {
    for (let pageIndex = 0; pageIndex < state.pages.length; pageIndex++) {
      const block = state.pages[pageIndex].blocks.find((b) => b.id === id);
      if (block) return { page: state.pages[pageIndex], pageIndex, block };
    }
    return null;
  }
  function getPageIndexFromElement(el) { const pageEl = el.closest('.page-canvas'); return pageEl ? Number(pageEl.dataset.pageIndex || 0) : 0; }

  function updateInspector() {
    const found = findBlock(state.selectedId); const block = found && found.block; const disabled = !block;
    [els.typeSelect, els.textEdit, els.fontSelect, els.sizeInput, els.lineInput, els.padInput, els.bgInput, els.colorInput, els.applyBtn, els.deleteBtn].forEach((el) => { el.disabled = disabled; });
    if (!block) { els.textEdit.value = ''; autoResizeTextEdit(); return; }
    els.typeSelect.value = block.type; els.textEdit.value = block.text || ''; els.fontSelect.value = block.style.fontFamily; els.sizeInput.value = block.style.fontSize; els.lineInput.value = block.style.lineHeight; els.padInput.value = block.style.padding; els.bgInput.value = normalizeColor(block.style.background || '#ffffff'); els.colorInput.value = normalizeColor(block.style.color || '#111827');
    autoResizeTextEdit();
  }
  function syncInspectorText(text) {
    if (document.activeElement === els.textEdit) return;
    els.textEdit.value = text || '';
    autoResizeTextEdit();
  }
  function autoResizeTextEdit() {
    if (!els.textEdit) return;
    els.textEdit.style.height = 'auto';
    const max = Math.max(240, Math.floor(window.innerHeight * 0.48));
    const min = window.innerHeight < 820 ? 240 : 320;
    els.textEdit.style.height = `${clamp(els.textEdit.scrollHeight + 4, min, max)}px`;
  }
  function applyInspector(block) { block.type = els.typeSelect.value; block.text = els.textEdit.value; block.style.fontFamily = els.fontSelect.value; block.style.fontSize = Number(els.sizeInput.value || 12); block.style.lineHeight = Number(els.lineInput.value || 1.7); block.style.padding = Number(els.padInput.value || 8); block.style.background = els.bgInput.value; block.style.color = els.colorInput.value; }
  function normalizeColor(value) { return value && value.startsWith('#') ? value : '#ffffff'; }
  function deleteSelected() { if (!state.selectedId) return; pushHistory(); state.pages.forEach((p) => { p.blocks = p.blocks.filter((b) => b.id !== state.selectedId); }); state.selectedId = null; render(); }
  function clearSelection() { state.selectedId = null; render(); }
  function setZoom(value) { state.zoom = clamp(value, 0.38, 1.25); render(); }
  function fitPreviewToHeight() { const h = els.canvasWrap ? els.canvasWrap.clientHeight : 0; const next = h ? (h - 22) / 1123 : 0.78; setZoom(clamp(next, 0.48, 0.92)); }
  function scrollToCurrentPage() { const pageEl = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`); if (pageEl) pageEl.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function togglePanel(which) { if (which === 'help') { els.helpPanel.hidden = !els.helpPanel.hidden; els.shortcutPanel.hidden = true; } else { els.shortcutPanel.hidden = !els.shortcutPanel.hidden; els.helpPanel.hidden = true; } }
  function closeHelp() { els.helpPanel.hidden = true; }
  function closeShortcut() { els.shortcutPanel.hidden = true; }
  function closePanels() { closeHelp(); closeShortcut(); }
  function persist() { localStorage.setItem(STORAGE_KEY, snapshot()); }
  function restore() { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) hydrate(raw); else buildDefaultSample(); } catch (e) { buildDefaultSample(); } render(false); setTimeout(fitPreviewToHeight, 40); }
  function saveProject() { download('scenario-dtp-project-v1.5.json', JSON.stringify({ pages: state.pages, currentPageIndex: state.currentPageIndex, selectedId: state.selectedId, zoom: state.zoom, assets: state.assets, sourceLoaded: state.sourceLoaded }, null, 2)); }
  function download(filename, content, type = 'application/json') { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }
  async function exportPng() { if (!window.html2canvas) { alert('PNG出力ライブラリの読み込みに失敗しました。'); return; } const oldZoom = state.zoom; state.zoom = 1; render(); await new Promise((r) => setTimeout(r, 80)); const target = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`); const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 }); canvas.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `scenario-dtp-page-${state.currentPageIndex + 1}.png`; a.click(); URL.revokeObjectURL(a.href); state.zoom = oldZoom; render(); }); }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); }); }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s])); }
  function getCssPx(name, fallback) { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; }

  window.ScenarioDtp = { undo, redo, deleteSelected, clearSelection, closePanels, triggerSave: saveProject, triggerJsonLoad: () => els.jsonInput.click(), triggerPdf: () => els.pdfBtn.click(), triggerPng: () => els.pngBtn.click(), triggerImage: () => els.imageInput.click() };
}());
