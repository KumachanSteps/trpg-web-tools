/* Scenario DTP Designer v1.2 - main.js */
(function () {
  'use strict';

  const STORAGE_KEY = 'scenarioDtpDesignerStaticV12';
  const DEFAULT_SOURCE_W = 310;
  const DEFAULT_STRUCTURE_W = 285;
  const GRID = 8;
  const PAGE = { w: 794, h: 1123 };
  const LAYOUT = {
    mainX: 34,
    mainY: 34,
    mainW: 628,
    mainH: 1055,
    memoX: 0,
    memoY: 44,
    memoW: 106,
    memoH: 1000,
    colGap: 18
  };
  LAYOUT.colW = Math.floor((LAYOUT.mainW - LAYOUT.colGap) / 2);

  const state = {
    pages: [],
    currentPageIndex: 0,
    selectedId: null,
    zoom: 0.66,
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
    'padInput', 'bgInput', 'colorInput', 'applyBtn', 'deleteBtn', 'templateBtn', 'fitBtn'
  ];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    ids.forEach((id) => { els[id] = document.getElementById(id); });
    bindEvents();
    restore();
  }

  function currentPage() { return state.pages[state.currentPageIndex]; }
  function allBlocks() { return state.pages.flatMap((p) => p.blocks.map((b) => ({ page: p, block: b }))); }
  function snap(v) { return Math.round(v / GRID) * GRID; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function snapshot() {
    return JSON.stringify({ pages: state.pages, currentPageIndex: state.currentPageIndex, selectedId: state.selectedId, zoom: state.zoom, assets: state.assets, sourceLoaded: state.sourceLoaded });
  }
  function hydrate(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    state.pages = data.pages && data.pages.length ? data.pages : [createPage('シナリオ本文')];
    state.currentPageIndex = Math.min(data.currentPageIndex || 0, state.pages.length - 1);
    state.selectedId = data.selectedId || null;
    state.zoom = data.zoom || 0.66;
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
    history.locked = true; history.redo.push(snapshot()); hydrate(history.undo.pop()); history.locked = false; render(false);
  }
  function redo() {
    if (!history.redo.length) return;
    history.locked = true; history.undo.push(snapshot()); hydrate(history.redo.pop()); history.locked = false; render(false);
  }

  function createPage(title = 'ページ') { return { id: crypto.randomUUID(), title, blocks: [] }; }
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
    els.parseBtn.addEventListener('click', () => { pushHistory(); parseIntoPages(els.sourceText.value); render(); });
    els.clearTextBtn.addEventListener('click', () => { els.sourceText.value = ''; state.sourceLoaded = false; render(); els.sourceText.focus(); });

    els.txtDropZone.addEventListener('click', () => els.txtInput.click());
    els.txtInput.addEventListener('change', async (ev) => { const file = ev.target.files && ev.target.files[0]; if (file) await loadTxtFile(file); ev.target.value = ''; });
    ['dragenter', 'dragover'].forEach((name) => els.txtDropZone.addEventListener(name, (ev) => { ev.preventDefault(); els.txtDropZone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((name) => els.txtDropZone.addEventListener(name, () => els.txtDropZone.classList.remove('dragover')));
    els.txtDropZone.addEventListener('drop', async (ev) => { ev.preventDefault(); const file = [...ev.dataTransfer.files].find((f) => f.type.startsWith('text/') || f.name.endsWith('.txt')); if (file) await loadTxtFile(file); });

    els.addPageBtn.addEventListener('click', () => { pushHistory(); state.pages.push(createPage(`ページ${state.pages.length + 1}`)); state.currentPageIndex = state.pages.length - 1; state.selectedId = null; render(); scrollToCurrentPage(); });

    document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => addManualBlock(btn.dataset.add)));
    els.imageInput.addEventListener('change', async (ev) => { const file = ev.target.files && ev.target.files[0]; if (!file) return; pushHistory(); const src = await fileToDataUrl(file); state.assets.push({ id: crypto.randomUUID(), name: file.name, src }); currentPage().blocks.push(createBlock('image', '', 322, 300, 270, 110, src)); render(); ev.target.value = ''; });

    els.applyBtn.addEventListener('click', () => { const found = findBlock(state.selectedId); if (!found) return; pushHistory(); applyInspector(found.block); render(); });
    els.deleteBtn.addEventListener('click', deleteSelected);
    els.templateBtn.addEventListener('click', () => { pushHistory(); applyTemplateToCurrentPage(); render(); });
    els.fitBtn.addEventListener('click', () => setZoom(0.66));
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

    bindWorkspaceNavigation();
    bindColumnResize();
  }

  async function loadTxtFile(file) { els.sourceText.value = await file.text(); state.sourceLoaded = true; render(); }
  function addManualBlock(type) {
    pushHistory();
    const textMap = { header: 'イザナミの棺\n— 黄泉を彷徨う者たちへ —', sceneTitle: '03　新しいシーン', body: '本文を入力してください。', keeper: 'KP向けの補足を入力してください。', dialogue: 'セリフ：NPC\n「ここに台詞を入力」', check: '▼判定情報\n成功：情報を得る。\n失敗：別の展開へ。', image: '' };
    const specs = { header: [0, 0, LAYOUT.mainW, 86], keeper: [0, 80, LAYOUT.memoW, 70], image: [320, 300, 270, 110] };
    const [x, y, w, h] = specs[type] || [0, 240, LAYOUT.colW, 80];
    const block = createBlock(type, textMap[type], x, y, w, h);
    currentPage().blocks.push(block); state.selectedId = block.id; render();
  }

  function parseIntoPages(src) {
    const tokens = tokenize(src);
    const pages = [createPage(inferTitle(src) || 'シナリオ本文')];
    let pageIndex = 0, col = 0, y = 0;
    const topOffsetFirst = 104;
    function pageObj() { return pages[pageIndex]; }
    function newPage() { pages.push(createPage(`ページ${pages.length + 1}`)); pageIndex++; col = 0; y = 0; }
    function colX() { return col === 0 ? 0 : LAYOUT.colW + LAYOUT.colGap; }
    function availableH() { return LAYOUT.mainH - (pageIndex === 0 ? topOffsetFirst : 0); }
    function offsetY() { return pageIndex === 0 ? topOffsetFirst : 0; }
    function nextColumnOrPage() { if (col === 0) { col = 1; y = 0; } else { newPage(); } }
    function addBlockToFlow(type, text) {
      const pieces = splitToken(type, text);
      for (const piece of pieces) {
        let h = estimateHeight(type, piece, LAYOUT.colW);
        if (type === 'sceneTitle') h = 48;
        if (y + h > availableH()) nextColumnOrPage();
        const b = createBlock(type, piece, colX(), offsetY() + y, LAYOUT.colW, h);
        pageObj().blocks.push(b);
        y += h + 10;
      }
    }
    // Only first page receives the header template. It is a normal editable block.
    pages[0].blocks.push(createBlock('header', 'イザナミの棺\n— 黄泉を彷徨う者たちへ —', 0, 0, LAYOUT.mainW, 86));
    for (const token of tokens) {
      if (token.type === 'keeper') {
        const memoCount = pageObj().blocks.filter((b) => b.type === 'keeper').length;
        pageObj().blocks.push(createBlock('keeper', token.text, 0, memoCount * 82, LAYOUT.memoW, 68));
      } else {
        addBlockToFlow(token.type, token.text);
      }
    }
    state.pages = pages;
    state.currentPageIndex = 0;
    state.selectedId = pages[0].blocks.find((b) => b.type !== 'header')?.id || pages[0].blocks[0].id;
  }

  function inferTitle(src) { const m = src.match(/^#\s+(.+)$/m); return m ? m[1].trim() : ''; }
  function tokenize(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const tokens = []; let buf = []; let mode = 'body';
    function flush() { const text = buf.join('\n').trim(); if (text) tokens.push({ type: mode, text }); buf = []; }
    for (const raw of lines) {
      const line = raw.trimEnd(); const t = line.trim();
      if (!t) { if (buf.length) buf.push(''); continue; }
      if (/^#\s+/.test(t)) continue;
      if (/^##\s+/.test(t)) { flush(); mode = 'sceneTitle'; buf = [t.replace(/^##\s+/, '')]; flush(); mode = 'body'; continue; }
      if (/^(▼\s*KP\s*情報|\[KP\]|KP情報)/.test(t)) { flush(); mode = 'keeper'; buf = []; continue; }
      if (/^(▼|【判定|判定)/.test(t)) { flush(); mode = 'check'; buf = [t]; continue; }
      if (/^(セリフ|「)/.test(t) && mode !== 'dialogue') { flush(); mode = 'dialogue'; buf = [line]; continue; }
      if (mode === 'keeper' && /^(##|#|▼)/.test(t)) { flush(); mode = 'body'; }
      buf.push(line);
    }
    flush();
    return tokens;
  }
  function estimateHeight(type, text, w) {
    const font = type === 'sceneTitle' ? 22 : 12;
    const charsPerLine = Math.max(12, Math.floor(w / (font * 0.92)));
    const lines = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
    return clamp(Math.ceil(lines * font * 1.75 + 18), 34, type === 'body' ? 220 : 170);
  }
  function splitToken(type, text) {
    if (type !== 'body') return [text];
    const max = 330;
    if (text.length <= max) return [text];
    const result = []; let rest = text;
    while (rest.length > max) {
      let cut = rest.lastIndexOf('。', max);
      if (cut < 120) cut = max;
      result.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) result.push(rest);
    return result;
  }

  function applyTemplateToCurrentPage() {
    currentPage().blocks = [
      createBlock('header', 'イザナミの棺\n— 黄泉を彷徨う者たちへ —', 0, 0, LAYOUT.mainW, 86),
      createBlock('sceneTitle', '01　血の香り', 0, 104, LAYOUT.colW, 48),
      createBlock('body', '探索者たちは、山間の集落へ続く濡れた道を進んでいる。木々の間に立ちこめる霧は薄く、足音を吸い込むように静まり返っていた。', 0, 160, LAYOUT.colW, 110),
      createBlock('check', '▼聞き耳に成功した場合\n遠くから、すすり泣くような声が聞こえる。', LAYOUT.colW + LAYOUT.colGap, 104, LAYOUT.colW, 90),
      createBlock('keeper', '導入シーン。\n霧・匂い・静寂を意識する。', 0, 0, LAYOUT.memoW, 68)
    ];
    state.selectedId = currentPage().blocks[1].id;
  }

  function render(shouldPersist = true) {
    document.documentElement.style.setProperty('--zoom', state.zoom);
    document.documentElement.style.setProperty('--source-w', `${getCssPx('--source-w', DEFAULT_SOURCE_W)}px`);
    document.documentElement.style.setProperty('--structure-w', `${getCssPx('--structure-w', DEFAULT_STRUCTURE_W)}px`);
    els.zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
    els.pageIndicator.textContent = `${state.currentPageIndex + 1} / ${state.pages.length}`;
    els.txtDropZone.classList.toggle('is-hidden', state.sourceLoaded);
    renderPages(); renderAssets(); renderPageCanvases(); updateInspector();
    if (shouldPersist) persist();
  }
  function getCssPx(name, fallback) { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; }

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
      img.addEventListener('click', () => { pushHistory(); currentPage().blocks.push(createBlock('image', '', 322, 300, 270, 110, asset.src)); render(); });
      els.assetList.appendChild(img);
    });
  }
  function renderPageCanvases() {
    els.pagesContainer.innerHTML = '';
    state.pages.forEach((p, pageIndex) => {
      const canvas = document.createElement('section'); canvas.className = 'page-canvas'; canvas.dataset.pageIndex = String(pageIndex);
      canvas.innerHTML = `<div class="main-area"><div class="block-layer"></div></div><aside class="memo-area"><h3>KPメモ</h3><div class="memo-layer"></div></aside><div class="page-number">${pageIndex + 1}</div>`;
      const blockLayer = canvas.querySelector('.block-layer'); const memoLayer = canvas.querySelector('.memo-layer');
      p.blocks.forEach((block) => {
        const el = block.type === 'keeper' ? renderMemoBlock(block) : renderBlock(block);
        if (block.type === 'keeper') memoLayer.appendChild(el); else blockLayer.appendChild(el);
      });
      canvas.addEventListener('click', () => { state.selectedId = null; render(); });
      els.pagesContainer.appendChild(canvas);
    });
  }
  function renderBlock(block) {
    const el = document.createElement('div'); el.className = `dtp-block ${block.type}-block ${state.selectedId === block.id ? 'selected' : ''}`; el.dataset.id = block.id;
    Object.assign(el.style, { left: `${block.x}px`, top: `${block.y}px`, width: `${block.w}px`, height: `${block.h}px`, fontFamily: block.style.fontFamily, fontSize: `${block.style.fontSize}px`, lineHeight: block.style.lineHeight, padding: `${block.style.padding}px`, color: block.style.color, background: block.style.background });
    if (block.type === 'header') {
      const [title, ...subs] = (block.text || '').split('\n'); el.innerHTML = `<span class="header-title">${escapeHtml(title || 'ヘッダー')}</span><span class="header-subtitle">${escapeHtml(subs.join(' ') || '')}</span>`;
    } else if (block.type === 'sceneTitle') {
      const m = (block.text || '').match(/^(\d+)\s*(.*)$/); el.innerHTML = m ? `<span class="num">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}` : escapeHtml(block.text || '');
    } else if (block.type === 'image') {
      if (block.src) { const img = document.createElement('img'); img.src = block.src; el.appendChild(img); } else { el.textContent = '画像枠'; }
    } else { el.textContent = block.text || ''; }
    el.addEventListener('mousedown', startBlockDrag); el.addEventListener('click', (ev) => { ev.stopPropagation(); state.selectedId = block.id; state.currentPageIndex = getPageIndexFromElement(el); render(); });
    return el;
  }
  function renderMemoBlock(block) {
    const el = document.createElement('div'); el.className = `memo-card ${state.selectedId === block.id ? 'selected' : ''}`; el.dataset.id = block.id; el.textContent = block.text || '';
    Object.assign(el.style, { top: `${block.y}px`, height: `${block.h}px`, fontFamily: block.style.fontFamily, fontSize: `${block.style.fontSize}px`, lineHeight: block.style.lineHeight, color: block.style.color, background: block.style.background });
    el.addEventListener('mousedown', startMemoDrag); el.addEventListener('click', (ev) => { ev.stopPropagation(); state.selectedId = block.id; state.currentPageIndex = getPageIndexFromElement(el); render(); });
    return el;
  }

  function startBlockDrag(ev) {
    const found = findBlock(ev.currentTarget.dataset.id); if (!found) return;
    pushHistory(); state.selectedId = found.block.id; state.currentPageIndex = found.pageIndex;
    const block = found.block; const startX = ev.clientX; const startY = ev.clientY; const origX = block.x; const origY = block.y; const target = ev.currentTarget;
    const maxX = Math.max(0, LAYOUT.mainW - block.w); const maxY = Math.max(0, LAYOUT.mainH - block.h);
    const onMove = (moveEv) => { const dx = (moveEv.clientX - startX) / state.zoom; const dy = (moveEv.clientY - startY) / state.zoom; block.x = snap(clamp(origX + dx, 0, maxX)); block.y = snap(clamp(origY + dy, 0, maxY)); target.style.left = `${block.x}px`; target.style.top = `${block.y}px`; };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); render(); };
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
    bind(els.splitterSource, '--source-w', DEFAULT_SOURCE_W, 220, 520);
    bind(els.splitterStructure, '--structure-w', DEFAULT_STRUCTURE_W, 230, 460);
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
    if (!block) { els.textEdit.value = ''; return; }
    els.typeSelect.value = block.type; els.textEdit.value = block.text || ''; els.fontSelect.value = block.style.fontFamily; els.sizeInput.value = block.style.fontSize; els.lineInput.value = block.style.lineHeight; els.padInput.value = block.style.padding; els.bgInput.value = normalizeColor(block.style.background || '#ffffff'); els.colorInput.value = normalizeColor(block.style.color || '#111827');
  }
  function applyInspector(block) { block.type = els.typeSelect.value; block.text = els.textEdit.value; block.style.fontFamily = els.fontSelect.value; block.style.fontSize = Number(els.sizeInput.value || 12); block.style.lineHeight = Number(els.lineInput.value || 1.7); block.style.padding = Number(els.padInput.value || 8); block.style.background = els.bgInput.value; block.style.color = els.colorInput.value; }
  function normalizeColor(value) { return value && value.startsWith('#') ? value : '#ffffff'; }
  function deleteSelected() { if (!state.selectedId) return; pushHistory(); state.pages.forEach((p) => { p.blocks = p.blocks.filter((b) => b.id !== state.selectedId); }); state.selectedId = null; render(); }
  function clearSelection() { state.selectedId = null; render(); }
  function setZoom(value) { state.zoom = clamp(value, 0.42, 1.25); render(); }
  function scrollToCurrentPage() { const pageEl = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`); if (pageEl) pageEl.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  function togglePanel(which) { if (which === 'help') { els.helpPanel.hidden = !els.helpPanel.hidden; els.shortcutPanel.hidden = true; } else { els.shortcutPanel.hidden = !els.shortcutPanel.hidden; els.helpPanel.hidden = true; } }
  function closeHelp() { els.helpPanel.hidden = true; }
  function closeShortcut() { els.shortcutPanel.hidden = true; }
  function closePanels() { closeHelp(); closeShortcut(); }
  function persist() { localStorage.setItem(STORAGE_KEY, snapshot()); }
  function restore() { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) hydrate(raw); else { state.pages = [createPage('シナリオ本文')]; applyTemplateToCurrentPage(); } } catch (e) { state.pages = [createPage('シナリオ本文')]; applyTemplateToCurrentPage(); } render(false); }
  function saveProject() { download('scenario-dtp-project-v1.2.json', JSON.stringify({ pages: state.pages, currentPageIndex: state.currentPageIndex, selectedId: state.selectedId, zoom: state.zoom, assets: state.assets, sourceLoaded: state.sourceLoaded }, null, 2)); }
  function download(filename, content, type = 'application/json') { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }
  async function exportPng() { if (!window.html2canvas) { alert('PNG出力ライブラリの読み込みに失敗しました。'); return; } const pageEl = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`); if (!pageEl) return; const oldZoom = state.zoom; state.zoom = 1; render(); await new Promise((r) => setTimeout(r, 80)); const target = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`); const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 }); canvas.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `scenario-dtp-page-${state.currentPageIndex + 1}.png`; a.click(); URL.revokeObjectURL(a.href); state.zoom = oldZoom; render(); }); }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); }); }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s])); }
  function getCssPx(name, fallback) { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; }

  window.ScenarioDtp = { undo, redo, deleteSelected, clearSelection, closePanels, triggerSave: saveProject, triggerJsonLoad: () => els.jsonInput.click(), triggerPdf: () => els.pdfBtn.click(), triggerPng: () => els.pngBtn.click(), triggerImage: () => els.imageInput.click() };
}());
