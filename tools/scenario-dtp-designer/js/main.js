/* Scenario DTP Designer v1.0 static prototype - main.js */
(function () {
  'use strict';

  const STORAGE_KEY = 'scenarioDtpDesignerStaticV1Folder';

  const state = {
    pages: [{ id: crypto.randomUUID(), title: 'P1', blocks: [] }],
    currentPageIndex: 0,
    selectedId: null,
    zoom: 0.83,
    assets: []
  };

  const els = {};

  function bindElements() {
    const ids = [
      'pageCanvas', 'blockLayer', 'memoLayer', 'pageList', 'sourceText', 'parseBtn',
      'clearBtn', 'addPageBtn', 'saveBtn', 'jsonInput', 'pdfBtn', 'pngBtn', 'helpBtn',
      'helpCloseBtn', 'helpPanel', 'imageInput', 'assetList', 'zoomOut', 'zoomIn',
      'zoomText', 'pageIndicator', 'typeSelect', 'textEdit', 'fontSelect', 'sizeInput',
      'lineInput', 'padInput', 'bgInput', 'colorInput', 'applyBtn', 'deleteBtn',
      'templateBtn', 'fitBtn'
    ];
    ids.forEach((id) => { els[id] = document.getElementById(id); });
  }

  function page() {
    return state.pages[state.currentPageIndex];
  }

  function defaultStyle(type) {
    const base = {
      fontFamily: "'Yu Gothic', 'Hiragino Sans', sans-serif",
      fontSize: type === 'sceneTitle' ? 26 : 14,
      lineHeight: 1.7,
      padding: 10,
      color: '#111827',
      background: '#ffffff'
    };
    if (type === 'sceneTitle') {
      base.fontFamily = "'Yu Mincho', 'Hiragino Mincho ProN', serif";
    }
    if (type === 'keeper') {
      base.background = '#f8fafc';
    }
    return base;
  }

  function createBlock(type, text, x, y, w, h, src = null) {
    return {
      id: crypto.randomUUID(),
      type,
      text,
      x,
      y,
      w,
      h,
      src,
      style: defaultStyle(type)
    };
  }

  function parseScenarioText(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let buffer = [];
    let mode = 'body';
    let y = 20;
    let col = 0;

    const pushBody = () => {
      const text = buffer.join('\n').trim();
      if (!text) return;
      const targetType = mode;
      if (targetType === 'keeper') {
        blocks.push(createBlock('keeper', text, 0, 0, 160, 110));
      } else {
        const bx = col === 0 ? 0 : 390;
        blocks.push(createBlock(targetType, text, bx, y, 360, targetType === 'sceneTitle' ? 56 : 96));
        y += targetType === 'sceneTitle' ? 66 : 112;
        if (y > 470) {
          col = 1;
          y = 20;
        }
      }
      buffer = [];
    };

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        buffer.push('');
        continue;
      }
      if (line.startsWith('# ')) {
        continue;
      }
      if (line.startsWith('## ')) {
        pushBody();
        mode = 'sceneTitle';
        buffer.push(line.replace(/^##\s*/, ''));
        pushBody();
        mode = 'body';
        continue;
      }
      if (/^(▼\s*KP\s*情報|\[KP\]|KP情報)/.test(line.trim())) {
        pushBody();
        mode = 'keeper';
        buffer = [];
        continue;
      }
      if (/^(▼|【判定|判定)/.test(line.trim())) {
        pushBody();
        mode = 'check';
        buffer.push(line);
        continue;
      }
      if (/^(セリフ|「)/.test(line.trim())) {
        if (mode !== 'dialogue') {
          pushBody();
          mode = 'dialogue';
        }
        buffer.push(line);
        continue;
      }
      if (mode === 'keeper' && /^(##|#|▼)/.test(line.trim())) {
        pushBody();
        mode = 'body';
      }
      buffer.push(line);
    }
    pushBody();
    return blocks;
  }

  function applyTemplate() {
    const blocks = page().blocks;
    if (blocks.length === 0) {
      blocks.push(createBlock('sceneTitle', '01　血の香り', 0, 18, 760, 64));
      blocks.push(createBlock('body', '探索者たちは、とある村の調査依頼を受けて山奥の集落へと足を踏み入れる。\n濡れた土と鉄のような匂いが、霧の向こうから漂ってくる。', 0, 94, 760, 96));
      blocks.push(createBlock('keeper', '導入シーン。不安感を高める描写を意識する。\n霧・匂い・静寂。', 0, 0, 160, 110));
      blocks.push(createBlock('sceneTitle', '02　蠢く異形', 0, 220, 360, 64));
      blocks.push(createBlock('body', '集落の外れ、社の裏手で探索者たちは常軌を逸した光景を目にする。\nそれは人の形を保ちながら、明らかに何かが混ざった存在だった。', 0, 294, 360, 120));
      blocks.push(createBlock('keeper', '02で戦闘へ。\n敵は「異形の村人」などを想定。\n回避は困難にする。', 0, 0, 160, 110));
    }
    render();
  }

  function render() {
    document.documentElement.style.setProperty('--zoom', state.zoom);
    els.zoomText.textContent = `${Math.round(state.zoom * 100)}%`;
    els.pageIndicator.textContent = `${state.currentPageIndex + 1} / ${state.pages.length}`;
    renderPages();
    renderAssets();
    renderBlocks();
    updateInspector();
    persist();
  }

  function renderPages() {
    els.pageList.innerHTML = '';
    state.pages.forEach((p, idx) => {
      const item = document.createElement('button');
      item.className = 'page-item';
      item.type = 'button';
      item.innerHTML = `<div class="page-thumb"></div><span>P${idx + 1}</span>`;
      item.style.borderColor = idx === state.currentPageIndex ? '#2563eb' : '';
      item.addEventListener('click', () => {
        state.currentPageIndex = idx;
        state.selectedId = null;
        render();
      });
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
        page().blocks.push(createBlock('image', '', 390, 220, 360, 96, asset.src));
        render();
      });
      els.assetList.appendChild(img);
    });
  }

  function renderBlocks() {
    els.blockLayer.innerHTML = '';
    els.memoLayer.innerHTML = '';

    page().blocks.forEach((block) => {
      if (block.type === 'keeper') {
        const card = document.createElement('div');
        card.className = `memo-card ${state.selectedId === block.id ? 'selected' : ''}`;
        card.textContent = block.text;
        card.dataset.id = block.id;
        card.addEventListener('click', (ev) => {
          ev.stopPropagation();
          state.selectedId = block.id;
          render();
        });
        els.memoLayer.appendChild(card);
        return;
      }

      const el = document.createElement('div');
      el.className = `dtp-block ${block.type}-block ${state.selectedId === block.id ? 'selected' : ''}`;
      el.dataset.id = block.id;
      Object.assign(el.style, {
        left: `${block.x}px`,
        top: `${block.y}px`,
        width: `${block.w}px`,
        height: `${block.h}px`,
        fontFamily: block.style.fontFamily,
        fontSize: `${block.style.fontSize}px`,
        lineHeight: block.style.lineHeight,
        padding: `${block.style.padding}px`,
        color: block.style.color,
        background: block.style.background
      });

      if (block.type === 'sceneTitle') {
        const match = block.text.match(/^(\d+)\s*(.*)$/);
        el.innerHTML = match ? `<span class="num">${escapeHtml(match[1])}</span>${escapeHtml(match[2])}` : escapeHtml(block.text);
      } else if (block.type === 'image') {
        const img = document.createElement('img');
        img.src = block.src;
        img.alt = '配置画像';
        el.appendChild(img);
      } else {
        el.textContent = block.text;
      }

      el.addEventListener('mousedown', startDrag);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        state.selectedId = block.id;
        render();
      });
      els.blockLayer.appendChild(el);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));
  }

  function startDrag(ev) {
    const id = ev.currentTarget.dataset.id;
    const block = findBlock(id);
    if (!block) return;
    state.selectedId = id;
    const startX = ev.clientX;
    const startY = ev.clientY;
    const origX = block.x;
    const origY = block.y;
    const target = ev.currentTarget;
    target.classList.add('selected');

    const onMove = (moveEv) => {
      const dx = (moveEv.clientX - startX) / state.zoom;
      const dy = (moveEv.clientY - startY) / state.zoom;
      block.x = Math.max(0, Math.min(780, origX + dx));
      block.y = Math.max(0, Math.min(540, origY + dy));
      target.style.left = `${block.x}px`;
      target.style.top = `${block.y}px`;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      render();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function findBlock(id) {
    return page().blocks.find((b) => b.id === id);
  }

  function updateInspector() {
    const block = findBlock(state.selectedId);
    const disabled = !block;
    [els.typeSelect, els.textEdit, els.fontSelect, els.sizeInput, els.lineInput, els.padInput, els.bgInput, els.colorInput, els.applyBtn, els.deleteBtn].forEach((el) => {
      el.disabled = disabled;
    });
    if (!block) {
      els.textEdit.value = '';
      return;
    }
    els.typeSelect.value = block.type;
    els.textEdit.value = block.text || '';
    els.fontSelect.value = block.style.fontFamily;
    els.sizeInput.value = block.style.fontSize;
    els.lineInput.value = block.style.lineHeight;
    els.padInput.value = block.style.padding;
    els.bgInput.value = normalizeColor(block.style.background || '#ffffff', '#ffffff');
    els.colorInput.value = normalizeColor(block.style.color || '#111827', '#111827');
  }

  function normalizeColor(value, fallback) {
    if (!value || !String(value).startsWith('#')) return fallback;
    return value;
  }

  function applyInspector() {
    const block = findBlock(state.selectedId);
    if (!block) return;
    block.type = els.typeSelect.value;
    block.text = els.textEdit.value;
    block.style.fontFamily = els.fontSelect.value;
    block.style.fontSize = Number(els.sizeInput.value || 14);
    block.style.lineHeight = Number(els.lineInput.value || 1.7);
    block.style.padding = Number(els.padInput.value || 10);
    block.style.background = els.bgInput.value;
    block.style.color = els.colorInput.value;
    render();
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        applyTemplate();
        return;
      }
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
      render();
    } catch (err) {
      console.warn(err);
      applyTemplate();
    }
  }

  function download(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  function bindEvents() {
    els.parseBtn.addEventListener('click', () => {
      page().blocks = parseScenarioText(els.sourceText.value);
      state.selectedId = page().blocks[0]?.id ?? null;
      render();
    });

    els.clearBtn.addEventListener('click', () => {
      if (!confirm('現在のページのブロックを削除しますか？')) return;
      page().blocks = [];
      state.selectedId = null;
      render();
    });

    els.addPageBtn.addEventListener('click', () => {
      state.pages.push({ id: crypto.randomUUID(), title: `P${state.pages.length + 1}`, blocks: [] });
      state.currentPageIndex = state.pages.length - 1;
      state.selectedId = null;
      applyTemplate();
    });

    document.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.add;
        const textMap = {
          sceneTitle: '03　新しいシーン',
          body: '本文を入力してください。',
          keeper: 'KP向けの補足を入力してください。',
          dialogue: 'セリフ：NPC\n「ここに台詞を入力」',
          check: '▼判定情報\n成功：情報を得る。\n失敗：別の展開へ。'
        };
        const block = createBlock(type, textMap[type], type === 'keeper' ? 0 : 30, type === 'keeper' ? 0 : 320, type === 'keeper' ? 160 : 340, type === 'keeper' ? 110 : 90);
        page().blocks.push(block);
        state.selectedId = block.id;
        render();
      });
    });

    els.imageInput.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const src = await fileToDataUrl(file);
      state.assets.push({ id: crypto.randomUUID(), name: file.name, src });
      page().blocks.push(createBlock('image', '', 390, 220, 360, 96, src));
      render();
      ev.target.value = '';
    });

    els.applyBtn.addEventListener('click', applyInspector);

    els.deleteBtn.addEventListener('click', () => {
      if (!state.selectedId) return;
      page().blocks = page().blocks.filter((b) => b.id !== state.selectedId);
      state.selectedId = null;
      render();
    });

    els.pageCanvas.addEventListener('click', () => {
      state.selectedId = null;
      render();
    });

    els.helpBtn.addEventListener('click', () => {
      els.helpPanel.hidden = !els.helpPanel.hidden;
    });
    els.helpCloseBtn.addEventListener('click', () => {
      els.helpPanel.hidden = true;
    });

    els.saveBtn.addEventListener('click', () => {
      download('scenario-dtp-project.json', JSON.stringify(state, null, 2));
    });

    els.jsonInput.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const imported = JSON.parse(text);
      Object.assign(state, imported);
      state.currentPageIndex = 0;
      state.selectedId = null;
      render();
      ev.target.value = '';
    });

    els.pdfBtn.addEventListener('click', () => window.print());

    els.pngBtn.addEventListener('click', async () => {
      if (!window.html2canvas) {
        alert('PNG出力ライブラリの読み込みに失敗しました。');
        return;
      }
      const oldZoom = state.zoom;
      state.zoom = 1;
      render();
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(els.pageCanvas, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `scenario-dtp-page-${state.currentPageIndex + 1}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        state.zoom = oldZoom;
        render();
      });
    });

    els.zoomOut.addEventListener('click', () => {
      state.zoom = Math.max(0.45, state.zoom - 0.05);
      render();
    });
    els.zoomIn.addEventListener('click', () => {
      state.zoom = Math.min(1.25, state.zoom + 0.05);
      render();
    });
    els.fitBtn.addEventListener('click', () => {
      state.zoom = 0.83;
      render();
    });
    els.templateBtn.addEventListener('click', applyTemplate);
  }

  function init() {
    bindElements();
    bindEvents();
    restore();
    window.ScenarioDtp = {
      state,
      els,
      render,
      applyTemplate,
      parseScenarioText,
      clearSelection() {
        state.selectedId = null;
        render();
      },
      closeHelp() {
        els.helpPanel.hidden = true;
      },
      triggerSave() {
        els.saveBtn.click();
      },
      triggerJsonLoad() {
        els.jsonInput.click();
      },
      triggerPdf() {
        els.pdfBtn.click();
      },
      triggerPng() {
        els.pngBtn.click();
      },
      triggerImage() {
        els.imageInput.click();
      }
    };
  }

  document.addEventListener('DOMContentLoaded', init);
}());
