/* Scenario DTP Designer v1.1 - main.js */
(function () {
  'use strict';

  const STORAGE_KEY = 'scenarioDtpDesignerStaticV11';
  const PAGE_LAYER = { w: 612, h: 878, colGap: 24, colW: 294 };

  const state = {
    pages: [{ id: crypto.randomUUID(), title: 'シナリオ本文', blocks: [] }],
    currentPageIndex: 0,
    selectedId: null,
    zoom: 0.75,
    assets: []
  };

  const history = { undo: [], redo: [], locked: false };
  const els = {};

  const ids = [
    'pagesContainer', 'workspace', 'canvasWrap', 'pageList', 'sourceText', 'parseBtn',
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

  function currentPage() {
    return state.pages[state.currentPageIndex];
  }

  function snapshot() {
    return JSON.stringify({
      pages: state.pages,
      currentPageIndex: state.currentPageIndex,
      selectedId: state.selectedId,
      zoom: state.zoom,
      assets: state.assets
    });
  }

  function hydrate(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    state.pages = data.pages || [{ id: crypto.randomUUID(), title: 'シナリオ本文', blocks: [] }];
    state.currentPageIndex = Math.min(data.currentPageIndex || 0, state.pages.length - 1);
    state.selectedId = data.selectedId || null;
    state.zoom = data.zoom || 0.75;
    state.assets = data.assets || [];
  }

  function pushHistory() {
    if (history.locked) return;
    history.undo.push(snapshot());
    if (history.undo.length > 80) history.undo.shift();
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

  function defaultStyle(type) {
    const base = {
      fontFamily: "'Yu Gothic', 'Hiragino Sans', sans-serif",
      fontSize: type === 'sceneTitle' ? 24 : 13,
      lineHeight: 1.7,
      padding: 10,
      color: '#111827',
      background: '#ffffff'
    };
    if (type === 'sceneTitle') base.fontFamily = "'Yu Mincho', 'Hiragino Mincho ProN', serif";
    if (type === 'keeper') base.background = '#f8fafc';
    return base;
  }

  function createBlock(type, text, x, y, w, h, src = null) {
    return { id: crypto.randomUUID(), type, text, x, y, w, h, src, style: defaultStyle(type) };
  }

  function bindEvents() {
    els.parseBtn.addEventListener('click', () => {
      pushHistory();
      parseIntoPages(els.sourceText.value);
      render();
    });

    els.clearTextBtn.addEventListener('click', () => {
      els.sourceText.value = '';
      els.sourceText.focus();
    });

    els.txtDropZone.addEventListener('click', () => els.txtInput.click());
    els.txtInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      await loadTxtFile(file);
      ev.target.value = '';
    });
    ['dragenter', 'dragover'].forEach((eventName) => {
      els.txtDropZone.addEventListener(eventName, (ev) => {
        ev.preventDefault();
        els.txtDropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      els.txtDropZone.addEventListener(eventName, () => els.txtDropZone.classList.remove('dragover'));
    });
    els.txtDropZone.addEventListener('drop', async (ev) => {
      ev.preventDefault();
      const file = [...ev.dataTransfer.files].find((f) => f.type.startsWith('text/') || f.name.endsWith('.txt'));
      if (file) await loadTxtFile(file);
    });

    els.addPageBtn.addEventListener('click', () => {
      pushHistory();
      state.pages.push({ id: crypto.randomUUID(), title: `ページ${state.pages.length + 1}`, blocks: [] });
      state.currentPageIndex = state.pages.length - 1;
      state.selectedId = null;
      render();
      scrollToCurrentPage();
    });

    document.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        pushHistory();
        const type = btn.dataset.add;
        const textMap = {
          sceneTitle: '03　新しいシーン',
          body: '本文を入力してください。',
          keeper: 'KP向けの補足を入力してください。',
          dialogue: 'セリフ：NPC\n「ここに台詞を入力」',
          check: '▼判定情報\n成功：情報を得る。\n失敗：別の展開へ。',
          image: ''
        };
        const block = createBlock(type, textMap[type], type === 'keeper' ? 0 : 28, type === 'keeper' ? 0 : 260, type === 'keeper' ? 96 : 280, type === 'keeper' ? 110 : 90);
        currentPage().blocks.push(block);
        state.selectedId = block.id;
        render();
      });
    });

    els.imageInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      pushHistory();
      const src = await fileToDataUrl(file);
      state.assets.push({ id: crypto.randomUUID(), name: file.name, src });
      currentPage().blocks.push(createBlock('image', '', 322, 270, 270, 100, src));
      render();
      ev.target.value = '';
    });

    els.applyBtn.addEventListener('click', () => {
      const found = findBlock(state.selectedId);
      if (!found) return;
      pushHistory();
      applyInspector(found.block);
      render();
    });

    els.deleteBtn.addEventListener('click', deleteSelected);
    els.templateBtn.addEventListener('click', () => {
      pushHistory();
      applyTemplateToCurrentPage();
      render();
    });
    els.fitBtn.addEventListener('click', () => setZoom(0.75));
    els.zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.05));
    els.zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.05));

    els.helpBtn.addEventListener('click', () => togglePanel('help'));
    els.helpCloseBtn.addEventListener('click', () => closeHelp());
    els.shortcutBtn.addEventListener('click', () => togglePanel('shortcut'));
    els.shortcutCloseBtn.addEventListener('click', () => closeShortcut());

    els.saveBtn.addEventListener('click', saveProject);
    els.jsonInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      pushHistory();
      hydrate(await file.text());
      history.redo = [];
      render();
      ev.target.value = '';
    });
    els.pdfBtn.addEventListener('click', () => window.print());
    els.pngBtn.addEventListener('click', exportPng);

    bindWorkspaceNavigation();
  }

  async function loadTxtFile(file) {
    const text = await file.text();
    els.sourceText.value = text;
  }

  function parseIntoPages(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const pages = [];
    let title = 'シナリオ本文';
    let blocks = [];
    let buffer = [];
    let mode = 'body';
    let y = 18;
    let col = 0;

    function ensurePage() {
      if (!pages.length || y > 820) {
        if (pages.length && blocks.length) pages[pages.length - 1].blocks = blocks;
        blocks = [];
        y = 18;
        col = 0;
        pages.push({ id: crypto.randomUUID(), title: pages.length ? `${title} ${pages.length + 1}` : title, blocks });
      }
    }

    function pushBuffer() {
      const text = buffer.join('\n').trim();
      if (!text) { buffer = []; return; }
      ensurePage();
      if (mode === 'keeper') {
        blocks.push(createBlock('keeper', text, 0, 0, 96, 110));
      } else {
        const x = col === 0 ? 0 : PAGE_LAYER.colW + PAGE_LAYER.colGap;
        const w = mode === 'body' ? PAGE_LAYER.colW : PAGE_LAYER.colW;
        const h = mode === 'sceneTitle' ? 54 : Math.min(170, Math.max(80, Math.ceil(text.length / 19) * 22));
        blocks.push(createBlock(mode, text, x, y, w, h));
        y += h + 16;
        if (y > 780 && col === 0) { col = 1; y = 18; }
        else if (y > 820 && col === 1) { ensurePage(); }
      }
      buffer = [];
    }

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (line.startsWith('# ')) {
        title = line.replace(/^#\s*/, '').trim() || title;
        continue;
      }
      if (!line.trim()) { buffer.push(''); continue; }
      if (line.startsWith('## ')) {
        pushBuffer();
        mode = 'sceneTitle';
        buffer.push(line.replace(/^##\s*/, ''));
        pushBuffer();
        mode = 'body';
        continue;
      }
      if (/^(▼\s*KP\s*情報|\[KP\]|KP情報)/.test(line.trim())) {
        pushBuffer();
        mode = 'keeper';
        buffer = [];
        continue;
      }
      if (/^(▼|【判定|判定)/.test(line.trim())) {
        pushBuffer();
        mode = 'check';
        buffer.push(line);
        continue;
      }
      if (/^(セリフ|「)/.test(line.trim())) {
        if (mode !== 'dialogue') { pushBuffer(); mode = 'dialogue'; }
        buffer.push(line);
        continue;
      }
      if (mode === 'keeper' && /^(##|#|▼)/.test(line.trim())) {
        pushBuffer();
        mode = 'body';
      }
      buffer.push(line);
    }
    pushBuffer();
    if (pages.length && blocks.length) pages[pages.length - 1].blocks = blocks;
    if (!pages.length) pages.push({ id: crypto.randomUUID(), title, blocks: [] });
    state.pages = pages;
    state.currentPageIndex = 0;
    state.selectedId = pages[0].blocks[0] ? pages[0].blocks[0].id : null;
  }

  function applyTemplateToCurrentPage() {
    const p = currentPage();
    if (p.blocks.length) return;
    p.blocks.push(createBlock('sceneTitle', '01　血の香り', 0, 18, 612, 56));
    p.blocks.push(createBlock('body', '探索者たちは、とある村の調査依頼を受けて山奥の集落へと足を踏み入れる。\n濡れた土と鉄のような匂いが、霧の向こうから漂ってくる。', 0, 90, 612, 100));
    p.blocks.push(createBlock('keeper', '導入シーン。不安感を高める描写を意識する。\n霧・匂い・静寂。', 0, 0, 96, 110));
    p.blocks.push(createBlock('sceneTitle', '02　蠢く異形', 0, 220, 294, 56));
    p.blocks.push(createBlock('body', '集落の外れ、社の裏手で探索者たちは常軌を逸した光景を目にする。\nそれは人の形を保ちながら、明らかに何かが混ざった存在だった。', 0, 290, 294, 128));
    p.blocks.push(createBlock('keeper', '02で戦闘へ。\n敵は「異形の村人」などを想定。', 0, 0, 96, 110));
  }

  function render(shouldPersist = true) {
    document.documentElement.style.setProperty('--zoom', state.zoom);
    els.zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
    els.pageIndicator.textContent = `${state.currentPageIndex + 1} / ${state.pages.length}`;
    renderPageList();
    renderAssets();
    renderPages();
    updateInspector();
    if (shouldPersist) persist();
  }

  function renderPageList() {
    els.pageList.innerHTML = '';
    state.pages.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = `page-item ${idx === state.currentPageIndex ? 'active' : ''}`;
      item.innerHTML = `<button class="page-thumb" type="button" aria-label="ページ${idx + 1}へ移動"></button><input class="page-name-input" value="${escapeAttr(p.title || `ページ${idx + 1}`)}" aria-label="ページ名" />`;
      item.querySelector('.page-thumb').addEventListener('click', () => {
        state.currentPageIndex = idx;
        state.selectedId = null;
        render();
        scrollToCurrentPage();
      });
      const input = item.querySelector('.page-name-input');
      input.addEventListener('change', () => {
        pushHistory();
        p.title = input.value.trim() || `ページ${idx + 1}`;
        render();
      });
      input.addEventListener('click', () => { state.currentPageIndex = idx; render(); });
      els.pageList.appendChild(item);
    });
  }

  function renderAssets() {
    els.assetList.innerHTML = '';
    state.assets.forEach((asset) => {
      const img = document.createElement('img');
      img.className = 'asset-thumb';
      img.src = asset.src;
      img.alt = asset.name || 'asset';
      img.title = 'クリックで画像ブロックとして追加';
      img.addEventListener('click', () => {
        pushHistory();
        currentPage().blocks.push(createBlock('image', '', 322, 270, 270, 100, asset.src));
        render();
      });
      els.assetList.appendChild(img);
    });
  }

  function renderPages() {
    els.pagesContainer.innerHTML = '';
    state.pages.forEach((p, pageIndex) => {
      const pageEl = document.createElement('section');
      pageEl.className = 'page-canvas';
      pageEl.dataset.pageIndex = String(pageIndex);
      pageEl.innerHTML = `
        <div class="page-bg"></div>
        <div class="page-header-banner"><div><strong>イザナミの棺</strong><span>— 黄泉を彷徨う者たちへ —</span></div></div>
        <div class="main-area">
          <div class="doc-title">${escapeHtml(p.title || `ページ${pageIndex + 1}`)}</div>
          <div class="column-guide"></div>
          <div class="block-layer" data-page-index="${pageIndex}"></div>
        </div>
        <aside class="memo-area"><h3>KPメモ</h3><div class="memo-layer" data-page-index="${pageIndex}"></div></aside>
        <div class="page-number">${pageIndex + 1}</div>
        <div class="page-label">${pageIndex + 1} / ${state.pages.length}</div>
      `;
      pageEl.addEventListener('click', () => {
        state.currentPageIndex = pageIndex;
        state.selectedId = null;
        render();
      });
      els.pagesContainer.appendChild(pageEl);
      renderBlocksForPage(p, pageEl, pageIndex);
    });
  }

  function renderBlocksForPage(p, pageEl, pageIndex) {
    const blockLayer = pageEl.querySelector('.block-layer');
    const memoLayer = pageEl.querySelector('.memo-layer');
    p.blocks.forEach((block) => {
      if (block.type === 'keeper') {
        const card = document.createElement('div');
        card.className = `memo-card ${state.selectedId === block.id ? 'selected' : ''}`;
        card.textContent = block.text;
        card.dataset.id = block.id;
        card.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.currentPageIndex = pageIndex;
          state.selectedId = block.id;
          render();
        });
        memoLayer.appendChild(card);
        return;
      }

      const el = document.createElement('div');
      const wideBody = block.type === 'body' && block.w > 500 ? ' wide-body' : '';
      el.className = `dtp-block ${block.type}-block${wideBody} ${state.selectedId === block.id ? 'selected' : ''}`;
      el.dataset.id = block.id;
      el.dataset.pageIndex = String(pageIndex);
      Object.assign(el.style, {
        left: `${block.x}px`, top: `${block.y}px`, width: `${block.w}px`, height: `${block.h}px`,
        fontFamily: block.style.fontFamily, fontSize: `${block.style.fontSize}px`, lineHeight: block.style.lineHeight,
        padding: `${block.style.padding}px`, color: block.style.color, background: block.style.background
      });

      if (block.type === 'sceneTitle') {
        const match = block.text.match(/^(\d+)\s*(.*)$/);
        el.innerHTML = match ? `<span class="num">${escapeHtml(match[1])}</span>${escapeHtml(match[2])}` : escapeHtml(block.text);
      } else if (block.type === 'image') {
        if (block.src) {
          const img = document.createElement('img');
          img.src = block.src;
          img.alt = '配置画像';
          el.appendChild(img);
        } else {
          el.textContent = '画像枠：素材サムネイルをクリックして画像を追加';
        }
      } else {
        el.textContent = block.text;
      }

      el.addEventListener('mousedown', startBlockDrag);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        state.currentPageIndex = pageIndex;
        state.selectedId = block.id;
        render();
      });
      blockLayer.appendChild(el);
    });
  }

  function startBlockDrag(ev) {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const id = ev.currentTarget.dataset.id;
    const pageIndex = Number(ev.currentTarget.dataset.pageIndex);
    const block = state.pages[pageIndex].blocks.find((b) => b.id === id);
    if (!block) return;
    state.currentPageIndex = pageIndex;
    state.selectedId = id;

    const target = ev.currentTarget;
    target.classList.add('selected');
    const startX = ev.clientX;
    const startY = ev.clientY;
    const origX = block.x;
    const origY = block.y;
    let moved = false;

    const onMove = (moveEv) => {
      const dx = (moveEv.clientX - startX) / state.zoom;
      const dy = (moveEv.clientY - startY) / state.zoom;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      block.x = Math.max(0, Math.min(PAGE_LAYER.w - 30, origX + dx));
      block.y = Math.max(0, Math.min(PAGE_LAYER.h - 30, origY + dy));
      target.style.left = `${block.x}px`;
      target.style.top = `${block.y}px`;
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (moved) {
        pushHistoryFromDrag(pageIndex, id, origX, origY);
      }
      render();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function pushHistoryFromDrag(pageIndex, blockId, origX, origY) {
    const block = state.pages[pageIndex].blocks.find((b) => b.id === blockId);
    if (!block) return;
    const newX = block.x, newY = block.y;
    block.x = origX; block.y = origY;
    pushHistory();
    block.x = newX; block.y = newY;
  }

  function bindWorkspaceNavigation() {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    els.workspace.addEventListener('wheel', (ev) => {
      if (ev.metaKey || ev.ctrlKey) {
        ev.preventDefault();
        const next = state.zoom + (ev.deltaY < 0 ? 0.04 : -0.04);
        setZoom(next);
      }
    }, { passive: false });

    els.workspace.addEventListener('mousedown', (ev) => {
      if (ev.button !== 0) return;
      if (ev.target.closest('.dtp-block, .memo-card, input, textarea, button, select')) return;
      isPanning = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startLeft = els.workspace.scrollLeft;
      startTop = els.workspace.scrollTop;
      els.workspace.classList.add('is-panning');
    });
    window.addEventListener('mousemove', (ev) => {
      if (!isPanning) return;
      els.workspace.scrollLeft = startLeft - (ev.clientX - startX);
      els.workspace.scrollTop = startTop - (ev.clientY - startY);
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      els.workspace.classList.remove('is-panning');
      updateCurrentPageByScroll();
    });
    els.workspace.addEventListener('scroll', debounce(updateCurrentPageByScroll, 80));
  }

  function updateCurrentPageByScroll() {
    const pages = [...document.querySelectorAll('.page-canvas')];
    if (!pages.length) return;
    const wrapRect = els.workspace.getBoundingClientRect();
    const centerY = wrapRect.top + wrapRect.height / 2;
    let best = 0;
    let bestDist = Infinity;
    pages.forEach((p, idx) => {
      const r = p.getBoundingClientRect();
      const dist = Math.abs((r.top + r.bottom) / 2 - centerY);
      if (dist < bestDist) { bestDist = dist; best = idx; }
    });
    if (state.currentPageIndex !== best) {
      state.currentPageIndex = best;
      renderPageList();
      els.pageIndicator.textContent = `${state.currentPageIndex + 1} / ${state.pages.length}`;
    }
  }

  function scrollToCurrentPage() {
    requestAnimationFrame(() => {
      const pageEl = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`);
      if (pageEl) pageEl.scrollIntoView({ block: 'start', inline: 'center', behavior: 'smooth' });
    });
  }

  function setZoom(value) {
    state.zoom = Math.max(0.35, Math.min(1.4, Number(value.toFixed(2))));
    render();
  }

  function findBlock(id) {
    if (!id) return null;
    for (let pageIndex = 0; pageIndex < state.pages.length; pageIndex += 1) {
      const block = state.pages[pageIndex].blocks.find((b) => b.id === id);
      if (block) return { block, pageIndex };
    }
    return null;
  }

  function updateInspector() {
    const found = findBlock(state.selectedId);
    const disabled = !found;
    [els.typeSelect, els.textEdit, els.fontSelect, els.sizeInput, els.lineInput, els.padInput, els.bgInput, els.colorInput, els.applyBtn, els.deleteBtn].forEach((el) => { el.disabled = disabled; });
    if (!found) { els.textEdit.value = ''; return; }
    const block = found.block;
    els.typeSelect.value = block.type;
    els.textEdit.value = block.text || '';
    els.fontSelect.value = block.style.fontFamily;
    els.sizeInput.value = block.style.fontSize;
    els.lineInput.value = block.style.lineHeight;
    els.padInput.value = block.style.padding;
    els.bgInput.value = normalizeColor(block.style.background || '#ffffff');
    els.colorInput.value = normalizeColor(block.style.color || '#111827');
  }

  function applyInspector(block) {
    block.type = els.typeSelect.value;
    block.text = els.textEdit.value;
    block.style.fontFamily = els.fontSelect.value;
    block.style.fontSize = Number(els.sizeInput.value || 13);
    block.style.lineHeight = Number(els.lineInput.value || 1.7);
    block.style.padding = Number(els.padInput.value || 10);
    block.style.background = els.bgInput.value;
    block.style.color = els.colorInput.value;
  }

  function deleteSelected() {
    const found = findBlock(state.selectedId);
    if (!found) return;
    pushHistory();
    state.pages[found.pageIndex].blocks = state.pages[found.pageIndex].blocks.filter((b) => b.id !== state.selectedId);
    state.selectedId = null;
    render();
  }

  function clearSelection() {
    state.selectedId = null;
    render();
  }

  function togglePanel(which) {
    if (which === 'help') {
      els.helpPanel.hidden = !els.helpPanel.hidden;
      els.shortcutPanel.hidden = true;
    } else {
      els.shortcutPanel.hidden = !els.shortcutPanel.hidden;
      els.helpPanel.hidden = true;
    }
  }
  function closeHelp() { els.helpPanel.hidden = true; }
  function closeShortcut() { els.shortcutPanel.hidden = true; }
  function closePanels() { closeHelp(); closeShortcut(); }

  function persist() {
    localStorage.setItem(STORAGE_KEY, snapshot());
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) hydrate(raw);
      else applyTemplateToCurrentPage();
    } catch (err) {
      console.warn(err);
      state.pages = [{ id: crypto.randomUUID(), title: 'シナリオ本文', blocks: [] }];
      applyTemplateToCurrentPage();
    }
    render(false);
  }

  function saveProject() {
    download('scenario-dtp-designer-v1.1-project.json', snapshot(), 'application/json');
  }

  async function exportPng() {
    if (!window.html2canvas) { alert('PNG出力ライブラリの読み込みに失敗しました。'); return; }
    const pageEl = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`);
    if (!pageEl) return;
    const oldZoom = state.zoom;
    state.zoom = 1;
    render();
    await wait(120);
    const target = document.querySelector(`.page-canvas[data-page-index="${state.currentPageIndex}"]`);
    const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `scenario-dtp-v1.1-page-${state.currentPageIndex + 1}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      state.zoom = oldZoom;
      render();
    });
  }

  function triggerJsonLoad() { els.jsonInput.click(); }
  function triggerImage() { els.imageInput.click(); }
  function triggerPdf() { els.pdfBtn.click(); }
  function triggerPng() { els.pngBtn.click(); }
  function triggerSave() { els.saveBtn.click(); }

  function normalizeColor(value) { return value && value.startsWith('#') ? value : '#ffffff'; }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); }); }
  function download(filename, content, type) { const blob = new Blob([content], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }
  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s])); }
  function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#096;'); }
  function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

  window.ScenarioDtp = {
    triggerSave,
    triggerJsonLoad,
    triggerPdf,
    triggerPng,
    triggerImage,
    closeHelp,
    closeShortcut,
    closePanels,
    clearSelection,
    deleteSelected,
    undo,
    redo,
    setZoom: (delta) => setZoom(state.zoom + delta),
    getState: () => state
  };
}());
