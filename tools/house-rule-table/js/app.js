/* CoCハウスルール表メーカー — 画面本体
 * 状態: secs[版].rows[ルールid] = { val, n, note, vis, name } / secs[版].custom = [{ id, cat, name, val, text, note, vis }] */
(function () {
  'use strict';

  const R = window.HRT_RULES;
  const I18N = window.HRT_I18N;
  const EX = window.HRT_EXPORT;

  const VERSION = 'v1.00';
  const STORAGE_KEY = 'houseRuleTable.v1';
  const LANG_KEY = 'houseRuleTableLang';
  const LANGS = ['ja', 'en', 'ko'];
  const EDITIONS = { 6: ['6', 'common'], 7: ['7', 'common'], both: ['6', '7', 'common'] };
  const SECTION = Object.fromEntries(R.SECTIONS.map(sec => [sec.id, sec]));

  const $ = id => document.getElementById(id);
  const els = {
    body: document.body,
    sheet: $('sheet'),
    editionToggle: $('editionToggle'),
    presetBtn: $('presetBtn'),
    presetMenu: $('presetMenu'),
    saveBtn: $('saveBtn'),
    openBtn: $('openBtn'),
    openFile: $('openFile'),
    exportBtn: $('exportBtn'),
    helpBtn: $('helpBtn'),
    helpDrawer: $('helpDrawer'),
    helpList: $('helpList'),
    helpNotes: $('helpNotes'),
    infoTitle: $('infoTitle'),
    infoKp: $('infoKp'),
    infoSystem: $('infoSystem'),
    infoScenario: $('infoScenario'),
    infoDate: $('infoDate'),
    infoRemarks: $('infoRemarks'),
    expModal: $('expModal'),
    expTabs: $('expTabs'),
    expOptions: $('expOptions'),
    expPreview: $('expPreview'),
    expActions: $('expActions'),
    expHint: $('expHint'),
    toastHost: $('toastHost')
  };

  const app = {
    lang: 'ja',
    state: null,
    exp: { fmt: 'png', theme: '', layout: 'wide', legend: true, notes: true },
    expTimer: 0,
    saveTimer: 0
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

  const pick = value => (value && typeof value === 'object' ? value[app.lang] || value.ja || '' : value || '');

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
    document.querySelectorAll('[data-i18n-ph]').forEach(node => { node.placeholder = t(node.dataset.i18nPh); });
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
    syncInfo();
    renderSheet();
    if (!els.expModal.hidden) renderExport();
  }

  /* ================= 小さな道具 ================= */

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
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
  function icon(paths) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    paths.forEach(([tag, attrs]) => {
      const el = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      svg.appendChild(el);
    });
    return svg;
  }
  const ICONS = {
    eye: () => icon([['path', { d: 'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z' }], ['circle', { cx: 12, cy: 12, r: 2.8 }]]),
    eyeOff: () => icon([['path', { d: 'M4 4l16 16' }], ['path', { d: 'M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4' }], ['path', { d: 'M6.3 7.6C3.9 9.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9 9 0 0 0 4-.9' }], ['path', { d: 'M10 10.2a2.8 2.8 0 0 0 3.8 3.8' }]]),
    trash: () => icon([['path', { d: 'M4.5 7h15' }], ['path', { d: 'M9.5 7V4.5h5V7' }], ['path', { d: 'M6.5 7l1 13h9l1-13' }], ['path', { d: 'M10.2 11v5.5M13.8 11v5.5' }]]),
    chevron: () => icon([['path', { d: 'm6 9 6 6 6-6' }]]),
    reset: () => icon([['path', { d: 'M4 12a8 8 0 1 0 2.4-5.7' }], ['path', { d: 'M4 4v5h5' }]])
  };

  function toast(message, type = 'info', duration = 3200, action = null) {
    if (!message) return;
    const node = h('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, h('span', null, message));
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      node.classList.remove('is-visible');
      setTimeout(() => node.remove(), 300);
    };
    if (action) {
      node.classList.add('has-action');
      node.appendChild(h('button', { type: 'button', class: 'toast-action', onclick: () => { action.run(); close(); } }, action.label));
    }
    els.toastHost.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    timer = setTimeout(close, duration);
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, { tool_id: 'house_rule_table', tool_version: VERSION, language: app.lang, ...params });
    } catch (error) {
      // 計測に失敗してもツールの動作には影響させない
    }
  }

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const clone = value => JSON.parse(JSON.stringify(value));

  /* ================= 状態 ================= */

  function blankState() {
    return {
      edition: '6',
      info: { title: '', kp: '', system: '', scenario: '', date: today(), remarks: '' },
      secs: { 6: { rows: {}, custom: [] }, 7: { rows: {}, custom: [] }, common: { rows: {}, custom: [] } },
      collapsed: {}
    };
  }

  /* プリセットの値を入れる（注記・名前の書き換え・追加ルールは残す。clear のときは注記も消す） */
  function applyPresetTo(state, preset) {
    R.SECTIONS.forEach(sec => {
      const bucket = state.secs[sec.id];
      sec.rules.forEach(rule => {
        const row = bucket.rows[rule.id] || (bucket.rows[rule.id] = { note: '' });
        if (preset === 'clear') {
          row.val = null;
          row.note = '';
          delete row.n;
          return;
        }
        const val = preset === 'pop' ? rule.pop : rule.raw;
        row.val = val;
        const op = rule.opts.find(item => item.id === val);
        if (op && op.num) row.n = op.num.def;
        row.vis = rule.core || (preset === 'pop' && rule.pop !== rule.raw);
      });
    });
  }

  function sanitize(raw) {
    const state = blankState();
    if (!raw || typeof raw !== 'object') return null;
    if (EDITIONS[raw.edition]) state.edition = String(raw.edition);
    if (raw.info && typeof raw.info === 'object') {
      Object.keys(state.info).forEach(key => { if (typeof raw.info[key] === 'string') state.info[key] = raw.info[key].slice(0, 4000); });
    }
    applyPresetTo(state, 'raw');
    R.SECTIONS.forEach(sec => {
      const src = raw.secs && raw.secs[sec.id];
      if (!src) return;
      const bucket = state.secs[sec.id];
      sec.rules.forEach(rule => {
        const got = src.rows && src.rows[rule.id];
        if (!got) return;
        const row = bucket.rows[rule.id];
        row.val = got.val === null || rule.opts.some(op => op.id === got.val) ? got.val : row.val;
        const numOp = rule.opts.find(op => op.num && op.id === row.val);
        if (numOp && Number.isFinite(Number(got.n))) row.n = Math.min(numOp.num.max, Math.max(numOp.num.min, Math.round(Number(got.n))));
        row.note = typeof got.note === 'string' ? got.note.slice(0, 2000) : '';
        row.vis = Boolean(got.vis);
        if (typeof got.name === 'string' && got.name.trim()) row.name = got.name.slice(0, 200);
      });
      if (Array.isArray(src.custom)) {
        bucket.custom = src.custom.filter(c => c && sec.cats.includes(c.cat)).slice(0, 200).map(c => ({
          id: typeof c.id === 'string' ? c.id : uid(),
          cat: c.cat,
          name: typeof c.name === 'string' ? c.name.slice(0, 200) : '',
          val: ['o', 'x', 'm', 'text'].includes(c.val) ? c.val : null,
          text: typeof c.text === 'string' ? c.text.slice(0, 400) : '',
          note: typeof c.note === 'string' ? c.note.slice(0, 2000) : '',
          vis: c.vis !== false
        }));
      }
    });
    if (raw.collapsed && typeof raw.collapsed === 'object') {
      Object.keys(raw.collapsed).forEach(key => { if (raw.collapsed[key]) state.collapsed[key] = true; });
    }
    return state;
  }

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    const state = saved && sanitize(saved.state);
    if (state) return state;
    const fresh = blankState();
    applyPresetTo(fresh, 'raw');
    return fresh;
  }

  function save() {
    clearTimeout(app.saveTimer);
    app.saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: app.state, savedAt: Date.now() })); } catch (error) { /* noop */ }
    }, 250);
    if (!els.expModal.hidden) scheduleExport();
  }

  const rowState = (secId, ruleId) => app.state.secs[secId].rows[ruleId];
  const customRow = (secId, id) => app.state.secs[secId].custom.find(c => c.id === id);

  /* ================= 表示用の値 ================= */

  function optLabel(op, n) {
    return pick(op.label).replace('{n}', n === undefined || n === null ? (op.num ? op.num.def : '') : n);
  }

  function ruleName(rule, row) {
    return (row && row.name) || pick(rule.name);
  }

  /* 1行分の表示内容 { name, value, kind, note } */
  function rowView(secId, rule, row) {
    if (!rule) {
      const c = row;
      let value = t('unset');
      let kind = 'unset';
      if (c.val === 'text') { value = c.text.trim() || t('unset'); kind = c.text.trim() ? 'text' : 'unset'; }
      else if (c.val) { value = pick(R.OPT[c.val].label); kind = c.val; }
      return { name: c.name.trim() || t('row.newRule'), value, kind, note: c.note.trim() };
    }
    const op = rule.opts.find(item => item.id === row.val);
    if (!op) return { name: ruleName(rule, row), value: t('unset'), kind: 'unset', note: (row.note || '').trim() };
    const kind = op.id === 'm' ? 'm' : op.sym ? op.id : 'opt';
    return { name: ruleName(rule, row), value: optLabel(op, row.n), kind, note: (row.note || '').trim() };
  }

  /* 書き出し用のモデル */
  function buildModel() {
    const st = app.state;
    const info = st.info;
    const meta = [];
    if (info.kp.trim()) meta.push([t('info.kp'), info.kp.trim()]);
    meta.push([t('info.system'), info.system.trim() || t(`systemAuto.${st.edition}`)]);
    if (info.scenario.trim()) meta.push([t('info.scenario'), info.scenario.trim()]);
    if (info.date) meta.push([t('info.date'), info.date.replace(/-/g, '.')]);
    const sections = [];
    EDITIONS[st.edition].forEach(secId => {
      const sec = SECTION[secId];
      const cats = [];
      sec.cats.forEach(catId => {
        const rows = [];
        sec.rules.filter(rule => rule.cat === catId).forEach(rule => {
          const row = rowState(secId, rule.id);
          if (row.vis) rows.push(rowView(secId, rule, row));
        });
        st.secs[secId].custom.filter(c => c.cat === catId && c.vis).forEach(c => rows.push(rowView(secId, null, c)));
        if (rows.length) cats.push({ title: pick(R.CATS[catId]), rows });
      });
      if (cats.length) sections.push({ title: pick(sec.full), tone: secId === 'common' ? 'common' : 'edition', cats });
    });
    return {
      lang: app.lang,
      title: info.title.trim() || t('info.titlePh'),
      meta,
      cols: dict().cols,
      sections,
      remarksLabel: t('info.remarks'),
      remarks: info.remarks.trim(),
      legend: t('legend'),
      credit: t('credit')
    };
  }

  /* ================= 表の情報 ================= */

  function syncInfo() {
    const info = app.state.info;
    els.infoTitle.value = info.title;
    els.infoKp.value = info.kp;
    els.infoSystem.value = info.system;
    els.infoSystem.placeholder = t(`systemAuto.${app.state.edition}`);
    els.infoScenario.value = info.scenario;
    els.infoDate.value = info.date;
    els.infoRemarks.value = info.remarks;
    autoGrow(els.infoRemarks);
    els.editionToggle.querySelectorAll('[data-edition]').forEach(btn => {
      const on = btn.dataset.edition === app.state.edition;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  /* ================= 表（編集画面） ================= */

  function renderSheet() {
    const scrollY = window.scrollY;
    els.sheet.innerHTML = '';
    EDITIONS[app.state.edition].forEach(secId => els.sheet.appendChild(renderSection(secId)));
    els.sheet.querySelectorAll('textarea').forEach(autoGrow);
    window.scrollTo(0, scrollY);
  }

  function renderSection(secId) {
    const sec = SECTION[secId];
    const node = h('section', { class: `sheet-section tone-${secId === 'common' ? 'common' : 'edition'}`, dataset: { sec: secId } },
      h('h2', { class: 'section-title' }, pick(sec.full)),
      h('div', { class: 'col-head', 'aria-hidden': 'true' },
        h('span'), h('span', null, t('cols.rule')), h('span', null, t('cols.value')), h('span', null, t('cols.note')))
    );
    sec.cats.forEach(catId => node.appendChild(renderCategory(secId, catId)));
    return node;
  }

  function catRows(secId, catId) {
    const sec = SECTION[secId];
    return [
      ...sec.rules.filter(rule => rule.cat === catId).map(rule => ({ rule, row: rowState(secId, rule.id) })),
      ...app.state.secs[secId].custom.filter(c => c.cat === catId).map(c => ({ rule: null, row: c }))
    ];
  }

  function renderCategory(secId, catId) {
    const key = `${secId}:${catId}`;
    const collapsed = Boolean(app.state.collapsed[key]);
    const node = h('div', { class: `cat${collapsed ? ' is-collapsed' : ''}`, dataset: { sec: secId, cat: catId } });
    node.appendChild(renderCatHead(secId, catId));
    const list = h('div', { class: 'cat-rows' });
    catRows(secId, catId).forEach(({ rule, row }) => list.appendChild(renderRow(secId, rule, row)));
    list.appendChild(h('button', { type: 'button', class: 'add-rule', dataset: { act: 'add' } }, t('row.add')));
    node.appendChild(list);
    return node;
  }

  function renderCatHead(secId, catId) {
    const items = catRows(secId, catId);
    const shown = items.filter(item => item.row.vis).length;
    const allOn = items.length > 0 && shown === items.length;
    const collapsed = Boolean(app.state.collapsed[`${secId}:${catId}`]);
    return h('div', { class: 'cat-head' },
      h('button', { type: 'button', class: 'cat-toggle', dataset: { act: 'collapse' }, 'aria-expanded': String(!collapsed), title: t('row.collapse') },
        ICONS.chevron(), h('span', { class: 'cat-title' }, pick(R.CATS[catId]))),
      h('span', { class: 'cat-count' }, t('row.count', { a: shown, b: items.length })),
      items.length ? h('button', { type: 'button', class: `eye-btn cat-eye${allOn ? '' : ' is-off'}`, dataset: { act: 'eyeAll' }, title: allOn ? t('row.hideAll') : t('row.showAll'), 'aria-label': allOn ? t('row.hideAll') : t('row.showAll') },
        allOn ? ICONS.eye() : ICONS.eyeOff()) : null
    );
  }

  function renderRow(secId, rule, row) {
    const custom = !rule;
    const view = rowView(secId, rule, row);
    const mod = row.val === 'm';
    const node = h('div', {
      class: `hr-row${row.vis ? '' : ' is-off'}${mod ? ' is-mod' : ''}${custom ? ' is-custom' : ''}`,
      dataset: custom ? { custom: row.id } : { rule: rule.id }
    });

    node.appendChild(h('button', {
      type: 'button', class: `eye-btn${row.vis ? '' : ' is-off'}`, dataset: { act: 'eye' },
      'aria-pressed': String(row.vis), title: row.vis ? t('row.hide') : t('row.show'), 'aria-label': row.vis ? t('row.hide') : t('row.show')
    }, row.vis ? ICONS.eye() : ICONS.eyeOff()));

    const nameBox = h('div', { class: 'row-name' });
    const nameWrap = h('div', { class: 'name-line' },
      h('input', {
        class: 'name-input', type: 'text', value: custom ? row.name : ruleName(rule, row), maxlength: 200,
        placeholder: custom ? t('row.newRule') : pick(rule.name), 'aria-label': t('row.namePh'), dataset: { field: 'name' }
      }));
    if (!custom && row.name) {
      nameWrap.appendChild(h('button', { type: 'button', class: 'mini-btn', dataset: { act: 'resetName' }, title: t('row.resetName'), 'aria-label': t('row.resetName') }, ICONS.reset()));
    }
    nameBox.appendChild(nameWrap);
    if (rule && rule.hint) nameBox.appendChild(h('p', { class: 'row-hint' }, pick(rule.hint)));
    node.appendChild(nameBox);

    const valueBox = h('div', { class: 'row-value' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': view.name });
    const opts = custom
      ? ['o', 'x', 'm'].map(id => ({ id, ...R.OPT[id] })).concat([{ id: 'text', label: { ja: '✎', en: '✎', ko: '✎' }, long: { ja: t('row.free'), en: t('row.free'), ko: t('row.free') } }])
      : rule.opts;
    opts.forEach(op => {
      const on = row.val === op.id;
      const sym = op.sym || op.id === 'text';
      chips.appendChild(h('button', {
        type: 'button', class: `chip${sym ? ' is-sym' : ''}${on ? ' is-on' : ''} chip-${op.id}`, dataset: { act: 'opt', opt: op.id },
        'aria-pressed': String(on), title: op.long ? pick(op.long) : null
      }, op.num ? optLabel(op, on ? row.n : op.num.def) : pick(op.label)));
    });
    valueBox.appendChild(chips);
    const curOp = !custom && rule.opts.find(op => op.id === row.val);
    if (curOp && curOp.num) {
      valueBox.appendChild(h('label', { class: 'num-box' },
        h('input', { class: 'num-input', type: 'number', inputmode: 'numeric', min: curOp.num.min, max: curOp.num.max, value: row.n !== undefined ? row.n : curOp.num.def, dataset: { field: 'n' }, 'aria-label': pick(curOp.label).replace('{n}', '') })));
    }
    if (custom && row.val === 'text') {
      valueBox.appendChild(h('input', { class: 'text-input free-input', type: 'text', value: row.text, maxlength: 400, placeholder: t('row.freePh'), dataset: { field: 'text' } }));
    }
    node.appendChild(valueBox);

    node.appendChild(h('div', { class: 'row-note' },
      h('textarea', { class: 'note-input', rows: 1, maxlength: 2000, placeholder: mod ? t('row.noteModPh') : t('row.notePh'), 'aria-label': t('cols.note'), dataset: { field: 'note' } }, row.note || '')));

    if (custom) {
      node.appendChild(h('button', { type: 'button', class: 'trash-btn', dataset: { act: 'remove' }, title: t('row.remove'), 'aria-label': t('row.remove') }, ICONS.trash()));
    }
    return node;
  }

  /* 行のDOMから状態を引く */
  function locate(el) {
    const rowEl = el.closest('.hr-row');
    const catEl = el.closest('.cat');
    if (!catEl) return null;
    const secId = catEl.dataset.sec;
    const catId = catEl.dataset.cat;
    if (!rowEl) return { secId, catId, catEl };
    if (rowEl.dataset.custom) return { secId, catId, catEl, rowEl, rule: null, row: customRow(secId, rowEl.dataset.custom) };
    const rule = SECTION[secId].rules.find(item => item.id === rowEl.dataset.rule);
    return { secId, catId, catEl, rowEl, rule, row: rowState(secId, rule.id) };
  }

  function refreshRow(loc, focusSel) {
    const next = renderRow(loc.secId, loc.rule, loc.row);
    loc.rowEl.replaceWith(next);
    next.querySelectorAll('textarea').forEach(autoGrow);
    refreshCatHead(loc.catEl);
    if (focusSel) {
      const target = next.querySelector(focusSel);
      if (target) target.focus({ preventScroll: true });
    }
    return next;
  }

  function refreshCatHead(catEl) {
    const head = catEl.querySelector('.cat-head');
    head.replaceWith(renderCatHead(catEl.dataset.sec, catEl.dataset.cat));
  }

  function setVisible(loc, vis) {
    loc.row.vis = vis;
    save();
    refreshRow(loc);
  }

  function removeCustom(loc) {
    const list = app.state.secs[loc.secId].custom;
    const index = list.indexOf(loc.row);
    if (index < 0) return;
    const removed = list.splice(index, 1)[0];
    save();
    loc.rowEl.remove();
    refreshCatHead(loc.catEl);
    toast(t('toast.removed'), 'info', 5000, {
      label: t('toast.undo'),
      run: () => {
        list.splice(Math.min(index, list.length), 0, removed);
        save();
        renderSheet();
      }
    });
  }

  function onSheetClick(event) {
    const btn = event.target.closest('[data-act]');
    if (!btn || !els.sheet.contains(btn)) return;
    const loc = locate(btn);
    if (!loc) return;
    const act = btn.dataset.act;
    if (act === 'collapse') {
      const key = `${loc.secId}:${loc.catId}`;
      if (app.state.collapsed[key]) delete app.state.collapsed[key]; else app.state.collapsed[key] = true;
      loc.catEl.classList.toggle('is-collapsed', Boolean(app.state.collapsed[key]));
      btn.setAttribute('aria-expanded', String(!app.state.collapsed[key]));
      save();
    } else if (act === 'eyeAll') {
      const items = catRows(loc.secId, loc.catId);
      const allOn = items.every(item => item.row.vis);
      items.forEach(item => { item.row.vis = !allOn; });
      save();
      loc.catEl.replaceWith(renderCategory(loc.secId, loc.catId));
      els.sheet.querySelectorAll('textarea').forEach(autoGrow);
    } else if (act === 'add') {
      const item = { id: uid(), cat: loc.catId, name: '', val: 'o', text: '', note: '', vis: true };
      app.state.secs[loc.secId].custom.push(item);
      save();
      const rowEl = renderRow(loc.secId, null, item);
      btn.before(rowEl);
      refreshCatHead(loc.catEl);
      if (app.state.collapsed[`${loc.secId}:${loc.catId}`]) {
        delete app.state.collapsed[`${loc.secId}:${loc.catId}`];
        loc.catEl.classList.remove('is-collapsed');
      }
      rowEl.querySelector('.name-input').focus();
      track('add_rule', { section: loc.secId });
    } else if (act === 'eye') {
      setVisible(loc, !loc.row.vis);
    } else if (act === 'remove') {
      removeCustom(loc);
    } else if (act === 'resetName') {
      delete loc.row.name;
      save();
      refreshRow(loc, '.name-input');
    } else if (act === 'opt') {
      const id = btn.dataset.opt;
      if (loc.row.val === id) {
        loc.row.val = null;
      } else {
        loc.row.val = id;
        const op = loc.rule && loc.rule.opts.find(item => item.id === id);
        if (op && op.num && !Number.isFinite(loc.row.n)) loc.row.n = op.num.def;
        /* 値を決めたルールは表に載せる */
        loc.row.vis = true;
      }
      save();
      const next = refreshRow(loc, `[data-opt="${id}"]`);
      if (loc.row.val === 'm' && !loc.row.note) next.querySelector('.note-input').focus({ preventScroll: true });
      if (loc.row.val === 'text') next.querySelector('.free-input').focus({ preventScroll: true });
    }
  }

  function onSheetInput(event) {
    const field = event.target.dataset.field;
    if (!field) return;
    const loc = locate(event.target);
    if (!loc || !loc.row) return;
    const value = event.target.value;
    if (field === 'note') { loc.row.note = value; autoGrow(event.target); }
    else if (field === 'text') loc.row.text = value;
    else if (field === 'n') {
      const num = Number(value);
      const op = loc.rule.opts.find(item => item.id === loc.row.val);
      /* 入力欄の min / max はブラウザが止めないので、ここで範囲に収める */
      if (value !== '' && Number.isFinite(num) && op && op.num) loc.row.n = Math.min(op.num.max, Math.max(op.num.min, Math.round(num)));
      const chip = loc.rowEl.querySelector('.chip.is-on');
      if (chip && op) chip.textContent = optLabel(op, loc.row.n);
    } else if (field === 'name') {
      if (loc.rule) {
        const trimmed = value.trim();
        if (!trimmed || trimmed === pick(loc.rule.name)) delete loc.row.name; else loc.row.name = value;
      } else loc.row.name = value;
    }
    save();
  }

  function onSheetChange(event) {
    const field = event.target.dataset.field;
    if (field === 'name' || field === 'n') {
      const loc = locate(event.target);
      if (loc && loc.rowEl && loc.rule) refreshRow(loc);
    }
  }

  /* スマホ: 右スワイプで表示切替、左スワイプで追加ルールの削除 */
  function initSwipe() {
    let drag = null;
    els.sheet.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch') return;
      const rowEl = event.target.closest('.hr-row');
      if (!rowEl || event.target.closest('input, textarea, button')) return;
      drag = { rowEl, x: event.clientX, y: event.clientY, dx: 0, active: false, id: event.pointerId };
    });
    els.sheet.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (Math.abs(dx) < 12) return;
        drag.active = true;
        drag.rowEl.classList.add('is-swiping');
      }
      const custom = Boolean(drag.rowEl.dataset.custom);
      drag.dx = dx < 0 && !custom ? Math.max(dx, -24) : Math.max(-140, Math.min(140, dx));
      drag.rowEl.style.transform = `translateX(${drag.dx}px)`;
      drag.rowEl.dataset.swipe = drag.dx > 60 ? 'eye' : drag.dx < -60 ? 'remove' : '';
    });
    const end = () => {
      if (!drag) return;
      const { rowEl, dx, active } = drag;
      drag = null;
      if (!active) return;
      rowEl.classList.remove('is-swiping');
      rowEl.style.transform = '';
      delete rowEl.dataset.swipe;
      const loc = locate(rowEl);
      if (!loc || !loc.row) return;
      if (dx > 60) {
        setVisible(loc, !loc.row.vis);
        toast(loc.row.vis ? t('toast.shown') : t('toast.hidden'), 'info', 1600);
      } else if (dx < -60 && !loc.rule) removeCustom(loc);
    };
    els.sheet.addEventListener('pointerup', end);
    els.sheet.addEventListener('pointercancel', end);
  }

  /* ================= プリセット ================= */

  function openPresetMenu(open) {
    els.presetMenu.hidden = !open;
    els.presetBtn.setAttribute('aria-expanded', String(open));
  }

  function applyPreset(preset) {
    const before = clone(app.state);
    applyPresetTo(app.state, preset);
    save();
    renderSheet();
    openPresetMenu(false);
    const name = t(preset === 'pop' ? 'bar.presetPop' : preset === 'clear' ? 'bar.presetClear' : 'bar.presetRaw');
    toast(t('toast.preset', { name }), 'success', 6000, {
      label: t('toast.undo'),
      run: () => { app.state = before; save(); syncInfo(); renderSheet(); }
    });
    track('apply_preset', { preset });
  }

  /* ================= ファイル ================= */

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function fileBase() {
    const title = (app.state.info.title.trim() || 'house-rules').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);
    return `${title}_${(app.state.info.date || today()).replace(/-/g, '')}`;
  }

  function saveFile() {
    const data = { app: 'house-rule-table', version: 1, savedAt: new Date().toISOString(), state: app.state };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${fileBase()}.hrt.json`);
    toast(t('toast.saved'), 'success');
    track('save_file');
  }

  function openFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data = null;
      try { data = JSON.parse(String(reader.result)); } catch (error) { data = null; }
      const state = data && data.app === 'house-rule-table' && sanitize(data.state);
      if (!state) { toast(t('toast.loadError'), 'error'); return; }
      const before = clone(app.state);
      app.state = state;
      save();
      syncInfo();
      renderSheet();
      toast(t('toast.loaded'), 'success', 6000, { label: t('toast.undo'), run: () => { app.state = before; save(); syncInfo(); renderSheet(); } });
      track('open_file');
    };
    reader.readAsText(file);
  }

  /* ================= 書き出し ================= */

  function openExport() {
    if (!app.exp.theme) {
      app.exp.theme = 'dark';
      if (window.innerWidth <= 720) app.exp.layout = 'narrow';
    }
    els.expModal.hidden = false;
    renderExport();
    const active = els.expTabs.querySelector('.is-active');
    if (active) active.focus();
  }

  function closeExport() {
    els.expModal.hidden = true;
    els.exportBtn.focus();
  }

  function scheduleExport() {
    clearTimeout(app.expTimer);
    app.expTimer = setTimeout(renderExport, 200);
  }

  function segment(label, options, current, onPick) {
    const group = h('div', { class: 'segment-group', role: 'group', 'aria-label': label });
    options.forEach(([value, text]) => group.appendChild(h('button', {
      type: 'button', class: `segment${value === current ? ' is-active' : ''}`, 'aria-pressed': String(value === current),
      onclick: () => onPick(value)
    }, text)));
    return h('div', { class: 'exp-field' }, h('span', { class: 'field-label' }, label), group);
  }

  function check(label, value, onChange) {
    return h('label', { class: 'check-line' },
      h('input', { type: 'checkbox', checked: value, onchange: event => onChange(event.target.checked) }),
      h('span', null, label));
  }

  function renderExport() {
    const exp = app.exp;
    els.expTabs.querySelectorAll('[data-fmt]').forEach(btn => {
      const on = btn.dataset.fmt === exp.fmt;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    const model = buildModel();
    const empty = !model.sections.length;
    els.expOptions.innerHTML = '';
    els.expActions.innerHTML = '';
    els.expPreview.innerHTML = '';
    els.expHint.textContent = '';

    const rerender = () => renderExport();
    if (exp.fmt === 'png') {
      els.expOptions.append(
        segment(t('exp.theme'), [['dark', t('exp.dark')], ['light', t('exp.light')]], exp.theme, v => { exp.theme = v; rerender(); }),
        segment(t('exp.layout'), [['wide', t('exp.wide')], ['narrow', t('exp.narrow')]], exp.layout, v => { exp.layout = v; rerender(); })
      );
    }
    els.expOptions.append(
      h('div', { class: 'exp-checks' },
        check(t('exp.notes'), exp.notes, v => { exp.notes = v; rerender(); }),
        check(t('exp.legend'), exp.legend, v => { exp.legend = v; rerender(); }))
    );

    if (empty) {
      els.expPreview.appendChild(h('p', { class: 'exp-empty' }, t('exp.empty')));
      return;
    }

    if (exp.fmt === 'png') {
      const canvas = EX.renderPng(model, { theme: exp.theme, layout: exp.layout, legend: exp.legend, notes: exp.notes });
      const img = h('img', { src: canvas.toDataURL('image/png'), alt: model.title, class: `exp-img exp-${exp.layout}` });
      els.expPreview.appendChild(img);
      els.expActions.append(
        h('button', {
          type: 'button', class: 'accent-button', onclick: () => canvas.toBlob(blob => {
            if (!blob) return;
            download(blob, `${fileBase()}.png`);
            toast(t('toast.downloaded'), 'success');
            track('export_png', { theme: exp.theme, layout: exp.layout });
          }, 'image/png')
        }, t('exp.savePng')),
        h('button', {
          type: 'button', class: 'ghost-button', onclick: () => canvas.toBlob(async blob => {
            try {
              await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
              toast(t('toast.copied'), 'success');
              track('copy_png');
            } catch (error) { toast(t('toast.copyError'), 'warning'); }
          }, 'image/png')
        }, t('exp.copyImg'))
      );
      return;
    }

    const md = exp.fmt === 'md';
    const text = md ? EX.toMarkdown(model, exp) : EX.toText(model, exp);
    els.expHint.textContent = md ? t('exp.discordMd') : t('exp.discordTxt');
    const area = h('textarea', { class: 'exp-text', readonly: true, spellcheck: 'false', 'aria-label': md ? t('exp.md') : t('exp.txt') });
    area.value = text;
    els.expPreview.appendChild(area);
    els.expActions.append(
      h('button', {
        type: 'button', class: 'accent-button', onclick: async () => {
          try {
            await navigator.clipboard.writeText(text);
            toast(t('toast.copied'), 'success');
          } catch (error) {
            area.select();
            const ok = document.execCommand && document.execCommand('copy');
            toast(ok ? t('toast.copied') : t('toast.copyError'), ok ? 'success' : 'warning');
          }
          track(md ? 'copy_md' : 'copy_txt');
        }
      }, t('exp.copy')),
      h('button', {
        type: 'button', class: 'ghost-button', onclick: () => {
          download(new Blob([text], { type: md ? 'text/markdown' : 'text/plain' }), `${fileBase()}.${md ? 'md' : 'txt'}`);
          toast(t('toast.downloaded'), 'success');
          track(md ? 'export_md' : 'export_txt');
        }
      }, t('exp.download'))
    );
  }

  /* ================= 起動 ================= */

  function bind() {
    document.querySelectorAll('[data-lang-choice]').forEach(btn => btn.addEventListener('click', () => {
      app.lang = LANGS.includes(btn.dataset.langChoice) ? btn.dataset.langChoice : 'ja';
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      applyLanguage();
    }));
    els.helpBtn.addEventListener('click', () => {
      const open = els.helpDrawer.hidden;
      els.helpDrawer.hidden = !open;
      els.helpBtn.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', () => {
      btn.closest('.drawer').hidden = true;
      els.helpBtn.setAttribute('aria-expanded', 'false');
    }));

    els.editionToggle.addEventListener('click', event => {
      const btn = event.target.closest('[data-edition]');
      if (!btn) return;
      app.state.edition = btn.dataset.edition;
      save();
      syncInfo();
      renderSheet();
      track('edition', { edition: app.state.edition });
    });

    els.presetBtn.addEventListener('click', event => { event.stopPropagation(); openPresetMenu(els.presetMenu.hidden); });
    els.presetMenu.addEventListener('click', event => {
      const btn = event.target.closest('[data-preset]');
      if (btn) applyPreset(btn.dataset.preset);
    });
    document.addEventListener('click', event => {
      if (!els.presetMenu.hidden && !els.presetMenu.contains(event.target)) openPresetMenu(false);
    });

    const infoField = (el, key) => el.addEventListener('input', () => {
      app.state.info[key] = el.value;
      if (el === els.infoRemarks) autoGrow(el);
      save();
    });
    infoField(els.infoTitle, 'title');
    infoField(els.infoKp, 'kp');
    infoField(els.infoSystem, 'system');
    infoField(els.infoScenario, 'scenario');
    infoField(els.infoDate, 'date');
    infoField(els.infoRemarks, 'remarks');

    els.sheet.addEventListener('click', onSheetClick);
    els.sheet.addEventListener('input', onSheetInput);
    els.sheet.addEventListener('change', onSheetChange);
    initSwipe();

    els.saveBtn.addEventListener('click', saveFile);
    els.openBtn.addEventListener('click', () => els.openFile.click());
    els.openFile.addEventListener('change', () => { openFile(els.openFile.files[0]); els.openFile.value = ''; });

    els.exportBtn.addEventListener('click', openExport);
    els.expTabs.addEventListener('click', event => {
      const btn = event.target.closest('[data-fmt]');
      if (!btn) return;
      app.exp.fmt = btn.dataset.fmt;
      renderExport();
    });
    els.expModal.addEventListener('click', event => { if (event.target === els.expModal) closeExport(); });
    els.expModal.querySelector('[data-close-modal]').addEventListener('click', closeExport);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!els.expModal.hidden) closeExport();
        else if (!els.presetMenu.hidden) openPresetMenu(false);
        else if (!els.helpDrawer.hidden) { els.helpDrawer.hidden = true; els.helpBtn.setAttribute('aria-expanded', 'false'); }
      }
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveFile();
      }
    });
  }

  function init() {
    app.lang = detectLang();
    app.state = loadState();
    bind();
    applyLanguage();
  }

  init();
})();
