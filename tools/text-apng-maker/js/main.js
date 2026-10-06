/*
 * 文字画像APNGメーカー — アプリ本体
 */
(function () {
  'use strict';

  const E = window.TextApngEngine;
  const F = window.TextApngFonts;
  const P = window.TextApngPresets;
  const C = window.TextApngCodec;
  const I18N = window.TextApngI18n;
  const ICONS = window.TextApngIcons;
  const { ControlPanel, setPath, FX_LABELS, OPT, SCHEMA } = window.TextApngControls;

  const VERSION = 'v1.12';
  const STORAGE_KEY = 'textApngMaker.v1';
  const LANG_KEY = 'textApngMakerLang';
  const LANGS = ['ja', 'ko', 'en', 'zh'];
  const THEME_KEY = 'textApngMakerTheme';
  const MAX_FRAMES = 1800;
  const SIZE_GUIDE_BYTES = 5 * 1024 * 1024;
  // WebP の画質（非可逆。0.9 で文字の縁のにじみは等倍ではほぼ分からず、フルカラーの APNG の半分前後の容量）
  const WEBP_QUALITY = 0.9;
  // まとめて書き出すときの上限（件数）
  const BATCH_MAX = 50;
  // マイテンプレート（今の設定に名前をつけて保存したもの）。場面の保存データとは別に保存し、「↺ 初期化」では消さない
  const MY_KEY = 'textApngMakerMyTemplates';
  const MY_VERSION = 1;
  const MY_FILE_FORMAT = 'text-apng-maker/my-templates';
  // モードごとに保存できる数・名前の長さ（文字）
  const MY_MAX = 30;
  const MY_NAME_MAX = 30;
  const MODES = ['message', 'trailer', 'caption'];
  // 書き換えた文章をテンプレートごとに覚えるモード（場所・時間は、テンプレートを切り替えても同じ文章を使う）
  const PER_TEMPLATE_TEXT = ['message', 'trailer'];
  // 保存データの形式（2: 書き出しのループ初期値を「1回再生」に変更、ファイル名をモードごとに保持
  //                  3: 書き出しのループの初期値をテンプレートごとに（GM・判定は「ずっとループ」）
  const STORAGE_SCHEMA = 3;
  const TABS = ['text', 'font', 'motion', 'style', 'layout'];

  const $ = id => document.getElementById(id);
  const els = {
    body: document.body,
    title: $('appTitle'),
    lead: $('appLead'),
    eyebrow: $('appEyebrow'),
    header: document.querySelector('.app-header'),
    portalLink: $('portalLink'),
    portalLong: $('portalLong'),
    portalShort: $('portalShort'),
    headerMenuBtn: $('headerMenuBtn'),
    controlPanel: $('controlPanel'),
    sheetBar: $('sheetBar'),
    sheetToggle: $('sheetToggle'),
    sheetTitle: $('sheetTitle'),
    sheetSummary: $('sheetSummary'),
    sheetExportBtn: $('sheetExportBtn'),
    sheetScroll: $('sheetScroll'),
    exportCard: $('exportCard'),
    transport: document.querySelector('.transport'),
    shareLink: $('xShareLink'),
    langButtons: document.querySelectorAll('[data-lang-choice]'),
    langSwitcher: $('languageSwitcher'),
    helpBtn: $('helpBtn'),
    shortcutBtn: $('shortcutBtn'),
    themeBtn: $('themeBtn'),
    helpDrawer: $('helpDrawer'),
    shortcutDrawer: $('shortcutDrawer'),
    rulesBtn: $('rulesBtn'),
    rulesDrawer: $('rulesDrawer'),
    rulesTitle: $('rulesTitle'),
    rulesBody: $('rulesBody'),
    resultRule: $('resultRule'),
    footerNote3: $('footerNote3'),
    helpTitle: $('helpTitle'),
    helpList: $('helpList'),
    helpNotes: $('helpNotes'),
    shortcutTitle: $('shortcutTitle'),
    shortcutGrid: $('shortcutGrid'),
    modeTabs: $('modeTabs'),
    templatesLabel: $('templatesLabel'),
    templatesHint: $('templatesHint'),
    templateGroups: $('templateGroups'),
    templateSystems: $('templateSystems'),
    templateStrip: $('templateStrip'),
    myTemplatesLabel: $('myTemplatesLabel'),
    myTemplateStrip: $('myTemplateStrip'),
    myExportBtn: $('myExportBtn'),
    myImportBtn: $('myImportBtn'),
    myImportFile: $('myImportFile'),
    mySaveForm: $('mySaveForm'),
    myNameInput: $('myNameInput'),
    mySaveSubmit: $('mySaveSubmit'),
    mySaveCancel: $('mySaveCancel'),
    resetBtn: $('resetModeBtn'),
    settingsTabs: $('settingsTabs'),
    settingsBody: $('settingsBody'),
    previewTitle: $('previewTitle'),
    previewBgLabel: $('previewBgLabel'),
    previewBgGroup: $('previewBgGroup'),
    previewBgFile: $('previewBgFile'),
    fontStatus: $('fontStatus'),
    stage: $('previewStage'),
    stageWrap: $('previewStageWrap'),
    canvas: $('previewCanvas'),
    playBtn: $('playBtn'),
    restartBtn: $('restartBtn'),
    loopPreview: $('loopPreviewInput'),
    loopPreviewText: $('loopPreviewText'),
    entryToggle: $('entryToggle'),
    entryInput: $('entryInput'),
    entryText: $('entryText'),
    exitToggle: $('exitToggle'),
    exitInput: $('exitInput'),
    exitText: $('exitText'),
    scrub: $('scrubInput'),
    timeLabel: $('timeLabel'),
    segments: $('timelineSegments'),
    legendIn: $('legendIn'),
    legendHold: $('legendHold'),
    legendOut: $('legendOut'),
    infoLine: $('infoLine'),
    exportTitle: $('exportTitle'),
    fpsLabel: $('fpsLabel'),
    fpsSelect: $('fpsSelect'),
    loopLabel: $('loopLabel'),
    loopSelect: $('loopSelect'),
    loopCount: $('loopCountInput'),
    loopCountWrap: $('loopCountWrap'),
    loopCountLabel: $('loopCountLabel'),
    colorLabel: $('colorLabel'),
    colorSelect: $('colorSelect'),
    posterInput: $('posterInput'),
    posterText: $('posterText'),
    trimInput: $('trimInput'),
    trimText: $('trimText'),
    fileNameLabel: $('fileNameLabel'),
    fileNameInput: $('fileNameInput'),
    fileNameAutoBadge: $('fileNameAutoBadge'),
    fileNameAutoBtn: $('fileNameAutoBtn'),
    exportApngBtn: $('exportApngBtn'),
    exportWebpBtn: $('exportWebpBtn'),
    exportNote: $('exportNote'),
    batchSummary: $('batchSummary'),
    batchLabel: $('batchLabel'),
    batchInput: $('batchInput'),
    batchHint: $('batchHint'),
    batchFormat: $('batchFormat'),
    batchExportBtn: $('batchExportBtn'),
    exportPngBtn: $('exportPngBtn'),
    exportZipBtn: $('exportZipBtn'),
    progress: $('exportProgress'),
    progressBar: $('exportProgressBar'),
    status: $('exportStatus'),
    cancelBtn: $('cancelExportBtn'),
    result: $('exportResult'),
    resultTitle: $('resultTitle'),
    resultImage: $('resultImage'),
    resultMeta: $('resultMeta'),
    resultNote: $('resultNote'),
    downloadLink: $('downloadLink'),
    clearResultBtn: $('clearResultBtn'),
    toastHost: $('toastHost'),
    footerTitle: $('footerTitle'),
    footerNote1: $('footerNote1'),
    footerNote2: $('footerNote2')
  };

  /* ================= 状態 ================= */

  const app = {
    lang: 'ja',
    mode: 'message',
    tab: 'text',
    scenes: {},
    // 書き換えた文章。メッセージ・トレイラーはテンプレートごとに覚え（message / trailer: { テンプレートID: { text, subText } }）、
    // 場所・時間はテンプレートを切り替えても引き継ぐ（caption: { text, subText }）
    editedTexts: { message: {}, trailer: {}, caption: {} },
    // fileNames: モードごとの手入力のファイル名（空なら設定から自動入力）
    exportOpts: {
      fps: 24, loop: 'once', loopCount: 3, color: 'palette', poster: true, trim: false, fileNames: { message: '', trailer: '', caption: '' },
      // まとめて書き出す文章（モードごと）と形式
      batch: { message: '', trailer: '', caption: '' }, batchFormat: 'apng'
    },
    previewBg: 'checker',
    loopPreview: true
  };

  const view = {
    renderer: new E.TextRenderer({ resolveFont: (id, text) => F.families(id, text) }),
    prepared: null,
    needsPrepare: true,
    time: 0,
    playing: false,
    playStart: 0,
    raf: 0,
    fontLoading: 0,
    fontEpoch: 0,
    exporting: false,
    cancel: false,
    resultUrl: '',
    previewBgUrl: ''
  };

  const scene = () => app.scenes[app.mode];
  const dict = () => I18N[app.lang] || I18N.ja;
  const msg = () => dict().messages;

  // 保存された言語（自分で選んだ言語）が無いときは、ブラウザの言語。
  // 優先する言語の順に見て、最初に対応している言語を使う（どれにも対応していなければ英語）
  function browserLang() {
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ja']);
    for (const pref of prefs) {
      const code = String(pref || '').toLowerCase().split(/[-_]/)[0];
      if (LANGS.includes(code)) return code;
    }
    return 'en';
  }

  function loadState() {
    let saved = null;
    let keepLoop = false;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    try {
      const lang = localStorage.getItem(LANG_KEY);
      app.lang = LANGS.includes(lang) ? lang : browserLang();
    } catch (error) { app.lang = 'ja'; }
    // マイテンプレートを先に読む（開いていた場面がマイテンプレートのこともある）
    loadMy();
    MODES.forEach(mode => {
      let s = restoreScene(mode, saved && saved.scenes && saved.scenes[mode]);
      // 分類のあるモードで、今は無いテンプレートの場面（以前のバージョンの保存データ）は最初のテンプレートから始める
      // （マイテンプレートの場面は、そのマイテンプレートを削除していてもそのまま続ける）
      if (P.TEMPLATE_GROUPS[mode] && !templatePlace(mode, s.templateId)) {
        const fresh = P.defaultScene(mode, app.lang);
        Object.assign(fresh, { width: s.width, height: s.height, sizePreset: s.sizePreset, inEnabled: s.inEnabled, outEnabled: s.outEnabled });
        s = fresh;
      }
      app.scenes[mode] = s;
    });
    if (saved) {
      if (MODES.includes(saved.mode)) app.mode = saved.mode;
      if (TABS.includes(saved.tab)) app.tab = saved.tab;
      if (saved.exportOpts) {
        const { loop, fileName, fileNames, batch, batchFormat, ...rest } = saved.exportOpts;
        Object.assign(app.exportOpts, rest);
        // まとめて書き出す文章（モードごと）と形式
        if (batch && typeof batch === 'object') MODES.forEach(m => { if (typeof batch[m] === 'string') app.exportOpts.batch[m] = batch[m]; });
        if (batchFormat === 'webp') app.exportOpts.batchFormat = 'webp';
        // 旧形式のループ設定（初期値がテンプレートによらなかった頃）は引き継がず、開いているテンプレートの初期値から始める
        if (saved.schema >= STORAGE_SCHEMA && ['once', 'infinite', 'count'].includes(loop)) {
          app.exportOpts.loop = loop;
          keepLoop = true;
        }
        if (fileNames && typeof fileNames === 'object') {
          MODES.forEach(m => { if (typeof fileNames[m] === 'string') app.exportOpts.fileNames[m] = fileNames[m]; });
        } else if (typeof fileName === 'string' && fileName.trim()) {
          app.exportOpts.fileNames[MODES.includes(saved.mode) ? saved.mode : 'message'] = fileName;
        }
      }
      if (saved.previewBg && saved.previewBg !== 'image') app.previewBg = saved.previewBg;
      if (typeof saved.loopPreview === 'boolean') app.loopPreview = saved.loopPreview;
      if (saved.editedTexts && typeof saved.editedTexts === 'object') {
        const memos = saved.editedTexts;
        PER_TEMPLATE_TEXT.forEach(mode => [...P.TEMPLATES[mode], ...myItems(mode)].forEach(tpl => {
          const kept = pickTexts(memos[mode] && memos[mode][tpl.id]);
          if (Object.keys(kept).length) app.editedTexts[mode][tpl.id] = kept;
        }));
        // 以前のトレイラーは、書き換えた文章をテンプレートをまたいで共通に覚えていた：開いていたテンプレートの分として引き継ぐ
        const shared = pickTexts(memos.trailer);
        if (Object.keys(shared).length) keepAsTemplateText('trailer', shared);
        app.editedTexts.caption = pickTexts(memos.caption);
        PER_TEMPLATE_TEXT.forEach(refreshSample);
      } else {
        // 書き換えた文章を覚える仕組みより前の保存データ：トレイラー・場所・時間で書き換えていた文章はそのまま引き継ぐ
        ['trailer', 'caption'].forEach(mode => {
          const s = app.scenes[mode];
          const state = P.sampleState(mode, s.text, s.subText);
          const kept = {};
          if (!state.main) kept.text = s.text;
          if (!state.sub && mode === 'caption') kept.subText = s.subText;
          if (mode === 'trailer') keepAsTemplateText(mode, kept);
          else Object.assign(app.editedTexts[mode], kept);
        });
      }
    }
    if (!keepLoop) app.exportOpts.loop = P.exportLoop(currentTemplate());
  }

  // モードで開いているテンプレート（組み込み・マイテンプレート）
  function currentTemplate(mode = app.mode) {
    return findTemplate(mode, app.scenes[mode].templateId);
  }

  // 保存データの場面を初期値と合わせて読み込む（古い形式の直しも含む）
  function restoreScene(mode, stored) {
    const base = P.defaultScene(mode, app.lang);
    const s = stored && typeof stored === 'object' ? P.deepMerge(base, stored) : base;
    s.mode = mode;
    if (String(s.fontId).startsWith('upload:') && !F.get(s.fontId)) s.fontId = 'noto-sans-jp';
    if (String(s.subFontId).startsWith('upload:') && !F.get(s.subFontId)) s.subFontId = 'same';
    // 旧形式：退場の種類「消さない」は「退場あり」スイッチのオフへ移す
    if (s.outFx === 'none' || !E.OUT_MAP[s.outFx]) {
      if (s.outFx === 'none' && !(mode === 'trailer' && s.reveal === 'scroll')) s.outEnabled = false;
      s.outFx = 'fade';
      s.outDur = E.OUT_MAP.fade.dur;
    }
    s.outEnabled = s.outEnabled !== false;
    s.inEnabled = s.inEnabled !== false;
    return s;
  }

  // テンプレートの置き場所（分類と、あればシステム）。
  // マイテンプレートは、もとにしたテンプレートの置き場所（分からないとき・削除したときは最初の分類）
  function templatePlace(mode, templateId) {
    if (isMyId(templateId)) {
      const groups = P.TEMPLATE_GROUPS[mode];
      if (!groups) return null;
      const item = findMy(templateId);
      return (item && item.base && templatePlace(mode, item.base)) || { group: groups[0].id, system: null };
    }
    const tpl = (P.TEMPLATES[mode] || []).find(t => t.id === templateId);
    if (!tpl || !tpl.group) return null;
    return { group: tpl.group, system: tpl.system || null };
  }

  // カテゴリ（モード）や分類・システムの先頭のテンプレート
  function firstTemplate(mode, groupId, systemId) {
    const list = P.TEMPLATES[mode] || [];
    const groups = P.TEMPLATE_GROUPS[mode];
    if (!groups) return list[0] || null;
    const group = groups.find(g => g.id === groupId) || groups[0];
    const system = group.systems ? (group.systems.find(sy => sy.id === systemId) || group.systems[0]).id : null;
    return list.find(tpl => tpl.group === group.id && (!system || tpl.system === system)) || null;
  }

  // 以前の保存データの文章を、開いていたテンプレートの分として覚える（見本と同じ文章は覚えない）
  function keepAsTemplateText(mode, memo) {
    const s = app.scenes[mode];
    const tpl = P.TEMPLATES[mode].find(t => t.id === s.templateId);
    if (!tpl || app.editedTexts[mode][tpl.id]) return;
    const kept = {};
    Object.keys(memo).forEach(key => { if (memo[key] !== P.sampleText(tpl, key, app.lang)) kept[key] = memo[key]; });
    if (Object.keys(kept).length) app.editedTexts[mode][tpl.id] = kept;
  }

  // 見本の文章が新しくなったテンプレート：書き換えていない文章（覚えていない文章）が今の見本と違えば、今の見本に置き換える。
  // テンプレートごとに覚えるモードでは、書き換えた文章は必ず覚えているので、それ以外は以前の見本（空のメインテキストはそのまま）
  function refreshSample(mode) {
    const s = app.scenes[mode];
    const tpl = P.TEMPLATES[mode].find(t => t.id === s.templateId);
    if (!tpl) return;
    const memo = app.editedTexts[mode][tpl.id] || {};
    ['text', 'subText'].forEach(key => {
      if (typeof memo[key] === 'string' || !String(s[key] || '').trim()) return;
      const samples = LANGS.map(lang => P.sampleText(tpl, key, lang));
      if (!samples.includes(s[key])) s[key] = P.sampleText(tpl, key, app.lang);
    });
  }

  // 言語を切り替えたとき：書き換えていない見本の文章（別の言語の見本のまま）を、新しい言語の見本にする
  function localizeSamples() {
    let changed = false;
    MODES.forEach(mode => {
      const s = app.scenes[mode];
      const tpl = (P.TEMPLATES[mode] || []).find(t => t.id === s.templateId);
      if (!tpl) return;
      ['text', 'subText'].forEach(key => {
        const next = P.sampleText(tpl, key, app.lang);
        if (s[key] === next) return;
        if (!LANGS.some(lang => lang !== app.lang && P.sampleText(tpl, key, lang) === s[key])) return;
        s[key] = next;
        changed = true;
      });
    });
    return changed;
  }

  // 保存データから文章だけを取り出す
  function pickTexts(memo) {
    const kept = {};
    if (memo && typeof memo === 'object') ['text', 'subText'].forEach(key => { if (typeof memo[key] === 'string') kept[key] = memo[key]; });
    return kept;
  }

  let saveTimer = 0;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          schema: STORAGE_SCHEMA, mode: app.mode, tab: app.tab, scenes: app.scenes, editedTexts: app.editedTexts,
          exportOpts: app.exportOpts, previewBg: app.previewBg, loopPreview: app.loopPreview
        }));
      } catch (error) {
        // 保存できない環境（プライベートモード等）でも動作は続ける
      }
    }, 300);
  }

  /* ================= 通知 ================= */

  // action: { label, run } を渡すと、通知の中にボタンを表示する
  function toast(message, type = 'info', duration = 3200, action = null) {
    if (!message) return;
    const node = document.createElement('div');
    node.className = `toast toast-${type}`;
    node.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const text = document.createElement('span');
    text.textContent = message;
    node.appendChild(text);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      node.classList.remove('is-visible');
      setTimeout(() => node.remove(), 300);
    };
    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { action.run(); close(); });
      node.classList.add('has-action');
      node.appendChild(btn);
    }
    els.toastHost.appendChild(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    timer = setTimeout(close, duration);
  }

  function track(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, { tool_id: 'text_apng_maker', tool_version: VERSION, language: app.lang, ...params });
    } catch (error) {
      // 計測に失敗してもツールの動作には影響させない
    }
  }

  /* ================= 文言 ================= */

  function applyLanguage() {
    const d = dict();
    document.documentElement.lang = d.htmlLang;
    document.title = d.documentTitle;
    els.eyebrow.textContent = d.portalName;
    els.title.textContent = d.title;
    els.lead.textContent = d.lead;
    els.portalLong.textContent = d.backToPortal;
    els.portalShort.textContent = d.portalShort;
    els.portalLink.setAttribute('aria-label', d.backToPortal);
    els.headerMenuBtn.setAttribute('aria-label', d.menu);
    els.headerMenuBtn.title = d.menu;
    els.sheetTitle.textContent = d.sheetTitle;
    els.sheetExportBtn.textContent = d.toExport;
    els.sheetExportBtn.title = d.toExportTitle;
    syncSheetLabels();
    els.helpBtn.textContent = d.help;
    els.rulesBtn.textContent = d.rulesBtn;
    els.shortcutBtn.textContent = d.shortcuts;
    els.langSwitcher.setAttribute('aria-label', d.langGroup);
    els.shareLink.setAttribute('aria-label', d.shareLabel);
    els.shareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${d.shareText} ${location.origin.startsWith('http') ? location.href.split('#')[0] : 'https://kumachansteps.github.io/trpg-web-tools/tools/text-apng-maker/'}`)}`;
    els.langButtons.forEach(btn => {
      const on = btn.dataset.langChoice === app.lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.setAttribute('aria-label', d.close));
    els.helpTitle.textContent = d.helpTitle;
    els.helpList.innerHTML = '';
    d.helpSteps.forEach(step => {
      const p = document.createElement('p');
      p.textContent = step;
      els.helpList.appendChild(p);
    });
    els.helpNotes.innerHTML = '';
    d.helpNotes.forEach(note => {
      const p = document.createElement('p');
      p.textContent = note;
      els.helpNotes.appendChild(p);
    });
    els.rulesTitle.textContent = d.rulesTitle;
    renderRules(d.rules);
    els.shortcutTitle.textContent = d.shortcutTitle;
    els.shortcutGrid.innerHTML = '';
    d.shortcutRows.forEach(([keys, text]) => {
      const keyBox = document.createElement('div');
      keys.split(' + ').forEach((k, i) => {
        if (i) {
          const plus = document.createElement('b');
          plus.textContent = '+';
          keyBox.appendChild(plus);
        }
        const kbd = document.createElement('kbd');
        kbd.textContent = k;
        keyBox.appendChild(kbd);
      });
      const span = document.createElement('span');
      span.textContent = text;
      els.shortcutGrid.append(keyBox, span);
    });
    // 小さいスマートフォンでは、入りきらない見出し・選択肢を短い文言にする（d.compact にある分だけ）
    const short = isCompact() ? d.compact : {};
    els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => {
      const [name, desc] = d.modes[btn.dataset.mode];
      btn.querySelector('.mode-name').textContent = (short.modes && short.modes[btn.dataset.mode]) || name;
      btn.querySelector('.mode-desc').textContent = desc;
    });
    els.templatesLabel.textContent = d.templates;
    els.resetBtn.textContent = d.reset;
    els.resetBtn.title = d.resetTitle;
    els.myTemplatesLabel.textContent = d.myTemplates;
    els.myExportBtn.textContent = (short.myExport) || d.myExport;
    els.myExportBtn.title = d.myExportTitle;
    els.myImportBtn.textContent = (short.myImport) || d.myImport;
    els.myImportBtn.title = d.myImportTitle;
    els.myNameInput.placeholder = d.myNameLabel;
    els.myNameInput.setAttribute('aria-label', d.myNameLabel);
    els.mySaveCancel.textContent = d.myCancel;
    syncMySaveButton();
    els.settingsTabs.querySelectorAll('[data-tab]').forEach(btn => { btn.textContent = d.tabs[btn.dataset.tab]; });
    els.previewTitle.textContent = d.preview;
    els.previewBgLabel.textContent = d.previewBg;
    els.previewBgGroup.querySelectorAll('[data-bg]').forEach(btn => {
      btn.textContent = d.previewBgs[btn.dataset.bg];
      if (btn.dataset.bg === 'image') btn.title = d.previewBgImage;
    });
    els.loopPreviewText.textContent = d.loopPreview;
    syncExitToggle();
    els.restartBtn.setAttribute('aria-label', d.restart);
    els.restartBtn.title = d.restart;
    els.legendIn.textContent = d.timeline.in;
    els.legendHold.textContent = d.timeline.hold;
    els.legendOut.textContent = d.timeline.out;
    els.exportTitle.textContent = d.exportTitle;
    els.fpsLabel.textContent = d.fps;
    els.loopLabel.textContent = d.loop;
    Array.from(els.loopSelect.options).forEach(o => { o.textContent = (short.loopOptions && short.loopOptions[o.value]) || d.loopOptions[o.value]; });
    els.loopCountLabel.textContent = d.loopCount;
    els.colorLabel.textContent = d.colorMode;
    Array.from(els.colorSelect.options).forEach(o => { o.textContent = (short.colorOptions && short.colorOptions[o.value]) || d.colorOptions[o.value]; });
    els.posterText.textContent = d.poster;
    els.trimText.textContent = d.trim;
    els.fileNameLabel.textContent = d.fileName;
    els.fileNameAutoBadge.textContent = d.fileNameAuto;
    els.fileNameAutoBtn.textContent = d.fileNameReset;
    els.fileNameAutoBtn.title = d.fileNameResetTitle;
    syncFileName();
    els.exportApngBtn.textContent = d.exportApng;
    els.exportWebpBtn.textContent = d.exportWebp;
    els.exportNote.textContent = d.exportNote;
    syncBatch();
    els.exportPngBtn.textContent = d.exportPng;
    els.exportZipBtn.textContent = d.exportZip;
    els.cancelBtn.textContent = d.cancel;
    els.resultTitle.textContent = d.resultTitle;
    els.downloadLink.textContent = d.download;
    els.clearResultBtn.textContent = d.clear;
    els.resultRule.innerHTML = d.resultRule;
    els.footerTitle.textContent = d.footerTitle;
    els.footerNote1.innerHTML = d.footerNote1;
    els.footerNote2.innerHTML = d.footerNote2;
    els.footerNote3.innerHTML = d.footerNote3;
    syncThemeButton();
    syncPlayButton();
    renderTemplates();
    panel.render(app.tab, els.settingsBody);
    updateInfo();
  }

  // 利用ルール（かんたん版）：許可と禁止を並べ、クレジットはその場でコピーできるようにする
  function renderRules(r) {
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    const body = els.rulesBody;
    body.innerHTML = '';
    body.appendChild(el('p', 'rules-intro', r.intro));
    const grid = el('div', 'rules-grid');
    [['allow', r.allowTitle, r.allow, '○'], ['deny', r.denyTitle, r.deny, '×']].forEach(([kind, title, items, mark]) => {
      const card = el('section', `rules-card is-${kind}`);
      card.appendChild(el('h3', null, title));
      const list = el('ul');
      items.forEach(text => {
        const li = el('li');
        li.append(el('span', 'rules-mark', mark), el('span', null, text));
        list.appendChild(li);
      });
      card.appendChild(list);
      grid.appendChild(card);
    });
    body.appendChild(grid);
    body.appendChild(el('p', 'rules-note', r.note));
    const credit = el('section', 'rules-credit');
    credit.append(el('h3', null, r.creditTitle), el('p', null, r.creditLead));
    const line = el('div', 'rules-credit-line');
    const copy = el('button', 'ghost-button rules-copy', r.copy);
    copy.type = 'button';
    copy.dataset.copyCredit = '';
    line.append(el('code', null, r.credit), copy);
    credit.append(line, el('p', 'rules-where', r.creditWhere));
    body.appendChild(credit);
    const foot = el('p', 'rules-foot');
    const link = el('a', null, r.details);
    link.href = './terms.html';
    link.target = '_blank';
    link.rel = 'noopener';
    foot.appendChild(link);
    if (r.translation) foot.appendChild(el('span', 'rules-translation', r.translation));
    body.appendChild(foot);
  }

  function copyCredit() {
    const r = dict().rules;
    const fail = () => toast(r.copyFailed, 'warning', 4200);
    if (!navigator.clipboard || !navigator.clipboard.writeText) { fail(); return; }
    navigator.clipboard.writeText(r.credit).then(() => toast(r.copied, 'success', 2200), fail);
  }

  // 書き出し結果やフッターの「利用ルール」から開く（ページ上部のドロワーまで移動する）
  function openRules() {
    if (els.rulesDrawer.hidden) toggleDrawer(els.rulesDrawer);
    els.rulesDrawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ================= テーマ ================= */

  function syncThemeButton() {
    const dark = els.body.classList.contains('is-dark');
    const thumb = els.themeBtn.querySelector('.theme-toggle-thumb');
    if (thumb) thumb.textContent = dark ? '☾' : '☀️';
    const label = dark ? dict().themeDark : dict().themeLight;
    els.themeBtn.setAttribute('aria-label', label);
    els.themeBtn.title = label;
    els.themeBtn.setAttribute('aria-pressed', String(dark));
  }

  function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem(THEME_KEY); } catch (error) { theme = null; }
    const dark = theme ? theme === 'dark' : Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    els.body.classList.toggle('is-dark', dark);
  }

  function toggleTheme() {
    const dark = !els.body.classList.contains('is-dark');
    els.body.classList.toggle('is-dark', dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (error) { /* noop */ }
    syncThemeButton();
  }

  /* ================= 設定パネル ================= */

  const panel = new ControlPanel({
    getScene: scene,
    getLang: () => app.lang,
    isCompact: () => isCompact(),
    onChange: handleChange,
    onAction: handleAction,
    getInfo: infoFor
  });

  function infoFor(key) {
    const s = scene();
    const m = msg();
    const prepared = view.prepared;
    if (key === 'autoFit') {
      if (!prepared || prepared.layout.fit >= 0.999) return '';
      return m.autoFitNote(s.fontSize, prepared.layout.size);
    }
    if (key === 'hold') {
      if (s.holdFx === 'none') return '';
      return m.holdSizeHint + (s.holdFx === 'glow' && !s.glow.on ? `\n${m.glowNeeded}` : '');
    }
    if (key === 'duration') {
      if (!prepared) return '';
      const pages = prepared.layout.pages.length;
      return m.durationHint(prepared.timeline.duration) + (s.mode === 'trailer' && pages > 1 ? ` ／ ${m.pages(pages)}` : '');
    }
    return '';
  }

  const FONT_KEYS = new Set(['fontId', 'weight', 'subFontId', 'subWeight', 'text', 'subText']);

  function handleChange(path, value, meta = {}) {
    const s = scene();
    setPath(s, path, value);
    if (path === 'text' || path === 'subText') rememberText(s, path, value);
    if (path === 'fontId') {
      const font = F.get(value);
      if (font) s.weight = F.nearestWeight(font, s.weight || 700);
      if (s.subFontId === 'same' && font) s.subWeight = F.nearestWeight(font, s.subWeight || 400);
    }
    if (path === 'subFontId') {
      const font = F.get(value === 'same' ? s.fontId : value);
      if (font) s.subWeight = F.nearestWeight(font, s.subWeight || 400);
    }
    if (path === 'outEnabled' && value === false && app.exportOpts.loop === 'infinite') {
      toast(msg().exitOffLoop, 'info', 8000, {
        label: msg().exitOffLoopAction,
        run: () => {
          setExportLoop('once');
          toast(msg().loopSetOnce, 'success', 2600);
        }
      });
    }
    if (FONT_KEYS.has(path)) scheduleFontLoad(meta.text ? 250 : 0);
    invalidate();
    if (!view.playing) showVisibleFrame();
    panel.refresh();
    saveState();
  }

  // 書き換えた文章を覚える。メッセージ・トレイラーは選んでいるテンプレートの分として、場所・時間はテンプレートをまたいで共通に。
  // 空のメインテキストは覚えない。テンプレートごとに覚えるときは見本と同じ文章も覚えない（どちらも、テンプレートを選ぶと見本に戻る）
  function rememberText(s, key, value) {
    const emptyMain = key === 'text' && !String(value).trim();
    const memos = app.editedTexts[s.mode];
    if (!PER_TEMPLATE_TEXT.includes(s.mode)) {
      if (emptyMain) delete memos[key];
      else memos[key] = value;
      return;
    }
    const tpl = findTemplate(s.mode, s.templateId);
    if (!tpl) return;
    const memo = memos[tpl.id] || {};
    if (emptyMain || value === P.sampleText(tpl, key, app.lang)) delete memo[key];
    else memo[key] = value;
    if (Object.keys(memo).length) memos[tpl.id] = memo;
    else delete memos[tpl.id];
  }

  // 一時停止中に文字が映らない時刻（開始前・終了後）なら、完成状態の時刻へ移動して編集結果を見せる
  function showVisibleFrame() {
    prepare();
    const T = view.prepared && view.prepared.timeline;
    if (!T || !T.pages.length) return;
    const first = T.pages[0];
    const last = T.pages[T.pages.length - 1];
    const blankBefore = view.time < first.textStart;
    const blankAfter = Number.isFinite(last.end) && view.time > last.end;
    if (blankBefore || blankAfter) view.time = T.posterTime;
  }

  function handleAction(action, data) {
    const s = scene();
    if (action === 'selectEffect') {
      const def = data.phase === 'in' ? E.IN_MAP[data.id] : E.OUT_MAP[data.id];
      if (!def) return;
      if (data.phase === 'in') {
        s.inFx = def.id;
        s.inDur = def.dur || s.inDur;
        s.inStagger = def.level === 'glyph' ? (def.stagger || 0) : 0;
        s.inEase = 'auto';
        s.inPower = 1;
        if (def.dirs && !def.dirs.includes(s.inDir)) s.inDir = def.dirs[0];
        if (s.mode === 'trailer') {
          if (def.id === 'typewriter') s.glyphDur = 0;
          else if (!s.glyphDur) s.glyphDur = 0.4;
        }
      } else {
        s.outFx = def.id;
        if (def.dur) s.outDur = def.dur;
        s.outStagger = def.level === 'glyph' ? (def.stagger || 0) : 0;
        s.outEase = 'auto';
        s.outPower = 1;
        if (def.dirs && !def.dirs.includes(s.outDir)) s.outDir = def.dirs[0];
        if (def.id === 'erase') s.outOrder = 'reverse';
      }
      invalidate();
      panel.refresh();
      saveState();
      restartPreview();
      return;
    }
    if (action === 'stylePreset') {
      const preset = P.STYLE_PRESETS.find(p => p.id === data.id);
      if (!preset) return;
      P.deepMerge(s, preset.patch);
      invalidate();
      panel.refresh();
      saveState();
      toast(msg().styleApplied(preset.label[app.lang]), 'success', 2200);
      return;
    }
    if (action === 'gradientPreset') {
      s.fill.type = 'gradient';
      [s.fill.color, s.fill.color2, s.fill.color3] = data.colors;
      invalidate();
      panel.refresh();
      saveState();
      return;
    }
    if (action === 'sizePreset') {
      const preset = P.SIZE_PRESETS.find(p => p.id === data.id);
      s.sizePreset = data.id;
      if (preset && preset.w) { s.width = preset.w; s.height = preset.h; }
      invalidate();
      layoutStage();
      panel.refresh();
      saveState();
      return;
    }
    if (action === 'customSize') {
      const w = Math.round(Math.min(3840, Math.max(32, data.width || s.width)));
      const h = Math.round(Math.min(3840, Math.max(32, data.height || s.height)));
      s.width = w;
      s.height = h;
      s.sizePreset = 'custom';
      invalidate();
      layoutStage();
      panel.refresh();
      saveState();
      return;
    }
    if (action === 'uploadFont') {
      F.addFontFile(data.file).then(({ font, saved, existing }) => {
        useFont(data.bind, font);
        if (existing) toast(msg().fontAlreadyRegistered(font.label), 'info', 3600);
        else if (saved) toast(msg().fontRegistered(font.label), 'success', 4200);
        else toast(msg().fontUploaded(font.label), 'warning', 5200);
      }).catch(() => toast(msg().fontUploadFailed, 'error', 4200));
      return;
    }
    if (action === 'localFont') {
      if (!F.isLocalFontAvailable(data.name)) {
        toast(msg().localFontMissing(data.name), 'warning', 4200);
        return;
      }
      const font = F.get(`local:${data.name}`);
      F.saveLocalFont(font.id);
      useFont(data.bind, font);
      toast(msg().localFontSet(data.name), 'success');
      return;
    }
    if (action === 'removeFont') {
      const font = F.get(data.id);
      if (!font || !font.user) return;
      F.removeFont(data.id).then(() => {
        // 解除したフォントを使っていた場面は、初期のフォントに戻す
        const fallback = F.get('noto-sans-jp');
        MODES.map(m => app.scenes[m]).forEach(s => {
          if (s.fontId === data.id) { s.fontId = fallback.id; s.weight = F.nearestWeight(fallback, s.weight || 700); }
          if (s.subFontId === data.id) s.subFontId = 'same';
        });
        view.renderer.invalidateSprites();
        panel.mini.renderer.invalidateSprites();
        scheduleFontLoad(0);
        invalidate();
        panel.render(app.tab, els.settingsBody);
        saveState();
        toast(msg().fontRemoved(font.label || font.family), 'success');
      });
    }
  }

  // 追加したフォントを選択状態にする（太さの補正・読み込み・一覧の更新も通常の変更と同じ流れで行う）
  function useFont(bind, font) {
    view.renderer.invalidateSprites();
    handleChange(bind, font.id);
    panel.render(app.tab, els.settingsBody);
  }

  /* ================= フォント読み込み ================= */

  let fontTimer = 0;
  function scheduleFontLoad(delay = 0) {
    clearTimeout(fontTimer);
    fontTimer = setTimeout(loadFontsForScene, delay);
  }

  async function ensureFonts(s) {
    // 代替フォントの並びは、描画（engine の fontText）と同じ文章で決める
    const all = E.fontText(s);
    const tasks = [F.load(s.fontId, s.weight, `${s.text}${s.mode === 'trailer' ? '' : s.subText}`, all)];
    if (s.mode !== 'trailer' && s.subText) {
      tasks.push(F.load(s.subFontId === 'same' ? s.fontId : s.subFontId, s.subWeight, s.subText, all));
    }
    await Promise.all(tasks);
  }

  async function loadFontsForScene() {
    const s = scene();
    view.fontLoading += 1;
    els.fontStatus.textContent = msg().loadingFont;
    els.fontStatus.hidden = false;
    try {
      await ensureFonts(s);
    } catch (error) {
      toast(msg().fontFailed, 'warning');
    } finally {
      view.fontLoading -= 1;
      if (view.fontLoading <= 0) {
        view.fontLoading = 0;
        els.fontStatus.hidden = true;
      }
      view.renderer.invalidateSprites();
      panel.mini.renderer.invalidateSprites();
      panel.mini.refreshAll();
      invalidate();
      panel.refresh();
    }
  }

  /* ================= プレビュー ================= */

  function invalidate() {
    view.needsPrepare = true;
    requestRender();
  }

  function requestRender() {
    if (view.raf) return;
    view.raf = requestAnimationFrame(renderFrame);
  }

  function prepare() {
    try {
      view.prepared = view.renderer.prepare(scene());
    } catch (error) {
      console.error(error);
    }
    view.needsPrepare = false;
    updateTimelineBar();
    updateInfo();
    syncExitToggle();
    syncFileName();
  }

  // プレビュー下の「退場あり」スイッチ（動きタブ「退場」見出しのスイッチと同じ設定）
  function syncExitToggle() {
    const s = scene();
    const d = dict();
    // スクロールは文字が画面の外へ流れて終わるため、退場の設定は使わない
    const scroll = s.mode === 'trailer' && s.reveal === 'scroll';
    els.exitText.textContent = d.exitToggle;
    els.exitInput.checked = scroll || s.outEnabled !== false;
    els.exitInput.disabled = scroll;
    els.exitToggle.classList.toggle('is-disabled', scroll);
    els.exitToggle.title = scroll ? d.exitToggleScroll : d.exitToggleTitle;
    // 登場あり：スクロールは画面の外から流れてくること自体が登場なので使わない
    els.entryText.textContent = d.entryToggle;
    els.entryInput.checked = scroll || s.inEnabled !== false;
    els.entryInput.disabled = scroll;
    els.entryToggle.classList.toggle('is-disabled', scroll);
    els.entryToggle.title = scroll ? d.entryToggleScroll : d.entryToggleTitle;
  }

  function renderFrame(now) {
    view.raf = 0;
    if (view.needsPrepare) prepare();
    const prepared = view.prepared;
    if (!prepared) return;
    const duration = prepared.timeline.duration;
    if (view.playing) {
      let t = (now - view.playStart) / 1000;
      if (t > duration) {
        if (app.loopPreview) {
          view.playStart = now;
          t = 0;
        } else {
          t = duration;
          view.playing = false;
          syncPlayButton();
        }
      }
      view.time = t;
    } else if (view.time > duration) {
      view.time = duration;
    }
    const ctx = els.canvas.getContext('2d');
    view.renderer.render(ctx, view.time, { scale: els.canvas.width / scene().width });
    updateTransport(duration);
    if (view.playing) requestRender();
  }

  function layoutStage() {
    const s = scene();
    const wrap = els.stageWrap;
    const availW = Math.max(120, wrap.clientWidth);
    // スマートフォンでは、下から開く設定のシートと一緒に見られるよう、プレビューを画面の3分の1ほどに収める
    const availH = isPhone() ? Math.max(140, window.innerHeight * 0.32) : Math.max(160, Math.min(window.innerHeight * 0.6, 620));
    const ratio = s.width / s.height;
    let w = availW;
    let h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }
    els.stage.style.width = `${Math.round(w)}px`;
    els.stage.style.height = `${Math.round(h)}px`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.min(s.width, Math.round(w * dpr)));
    const ch = Math.max(1, Math.round(cw / ratio));
    if (els.canvas.width !== cw || els.canvas.height !== ch) {
      els.canvas.width = cw;
      els.canvas.height = ch;
    }
    requestRender();
  }

  function play() {
    if (!view.prepared) prepare();
    const duration = view.prepared ? view.prepared.timeline.duration : 0;
    if (view.time >= duration - 0.01) view.time = 0;
    view.playing = true;
    view.playStart = performance.now() - view.time * 1000;
    syncPlayButton();
    requestRender();
  }

  function pause() {
    view.playing = false;
    syncPlayButton();
  }

  function togglePlay() {
    if (view.playing) pause(); else play();
    return true;
  }

  function restartPreview() {
    view.time = 0;
    view.playStart = performance.now();
    if (!view.playing) play();
    requestRender();
  }

  function syncPlayButton() {
    const d = dict();
    els.playBtn.textContent = view.playing ? `❚❚ ${d.pause}` : `▶ ${d.play}`;
    els.playBtn.setAttribute('aria-pressed', String(view.playing));
  }

  function updateTransport(duration) {
    els.scrub.max = String(duration);
    if (document.activeElement !== els.scrub || view.playing) els.scrub.value = String(view.time);
    els.timeLabel.textContent = `${view.time.toFixed(2)} / ${duration.toFixed(2)}${dict().seconds}`;
    const pct = duration > 0 ? (view.time / duration) * 100 : 0;
    els.segments.style.setProperty('--playhead', `${pct}%`);
  }

  function updateTimelineBar() {
    const prepared = view.prepared;
    els.segments.querySelectorAll('.seg').forEach(n => n.remove());
    if (!prepared) return;
    const T = prepared.timeline;
    const total = T.duration || 1;
    const add = (cls, a, b) => {
      if (!(b > a)) return;
      const seg = document.createElement('span');
      seg.className = `seg ${cls}`;
      seg.style.left = `${(a / total) * 100}%`;
      seg.style.width = `${((b - a) / total) * 100}%`;
      els.segments.appendChild(seg);
    };
    T.segments.forEach(seg => {
      add('seg-in', seg.start, seg.inEnd);
      add('seg-hold', seg.inEnd, Math.min(seg.holdEnd, seg.end));
      add('seg-out', Math.min(seg.holdEnd, seg.end), seg.end);
    });
  }

  // 1フレーム = 1/fps 秒。再生時間がタイムラインを1フレーム以上超えないよう切り上げ、
  // 最後のフレームには終了時点（duration）の状態を描く（1回再生で止まる絵を正しくするため）
  function exportFrameCount(duration, fps) {
    return Math.max(1, Math.ceil(duration * fps - 1e-6));
  }

  function updateInfo() {
    const prepared = view.prepared;
    if (!prepared) return;
    const s = scene();
    const fps = app.exportOpts.fps;
    const d = prepared.timeline.duration;
    els.infoLine.textContent = dict().infoLine(s.width, s.height, d, fps, exportFrameCount(d, fps));
  }

  function setPreviewBg(kind) {
    app.previewBg = kind;
    els.stage.dataset.bg = kind;
    els.stage.style.backgroundImage = kind === 'image' && view.previewBgUrl ? `url("${view.previewBgUrl}")` : '';
    els.previewBgGroup.querySelectorAll('[data-bg]').forEach(btn => {
      const on = btn.dataset.bg === kind;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    saveState();
  }

  /* ================= モード・テンプレート・タブ ================= */

  // カテゴリ（メッセージ／トレイラー／場所・時間）を切り替え、その先頭のテンプレートを選んでプレビューする。
  // 開いているカテゴリをもう一度押したときは、編集中の内容をそのまま残す
  function setMode(mode) {
    if (!MODES.includes(mode) || view.exporting) return false;
    if (mode === app.mode) return true;
    app.mode = mode;
    els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    els.body.dataset.mode = mode;
    // 開いていた保存の欄は、そのモードの設定を保存するためのものなので閉じる
    els.mySaveForm.hidden = true;
    showTemplate(firstTemplate(mode));
    syncBatch();
    return true;
  }

  function syncTabs() {
    els.settingsTabs.querySelectorAll('[data-tab]').forEach(btn => {
      const on = btn.dataset.tab === app.tab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      if (on) els.settingsBody.setAttribute('aria-labelledby', btn.id);
    });
  }

  // 今の場面の置き場所（分類のあるモードのみ）
  function currentPlace() {
    const groups = P.TEMPLATE_GROUPS[app.mode];
    if (!groups) return null;
    return templatePlace(app.mode, scene().templateId) || { group: groups[0].id, system: null };
  }

  // 分類（判定ではシステム）を切り替え、その先頭のテンプレートを選んでプレビューする。
  // 開いている分類やシステムをもう一度押したときは、編集中の内容をそのまま残す
  function showPlace(groupId, systemId) {
    if (view.exporting) return;
    const groups = P.TEMPLATE_GROUPS[app.mode] || [];
    if (!groups.some(g => g.id === groupId)) return;
    const from = currentPlace();
    if (from && from.group === groupId && (!systemId || from.system === systemId)) return;
    showTemplate(firstTemplate(app.mode, groupId, systemId));
  }

  // テンプレートを選び直してプレビューする（チップを押したときと同じ中身で、通知は出さない）。画像サイズと退場の有無は引き継ぐ
  function showTemplate(tpl) {
    if (tpl) {
      fillTemplate(scene(), tpl);
      applyTemplateLoop(tpl);
    }
    renderTemplates();
    panel.render(app.tab, els.settingsBody);
    view.renderer.invalidateSprites();
    invalidate();
    layoutStage();
    scheduleFontLoad(0);
    saveState();
    restartPreview();
  }

  function renderTemplates() {
    const s = scene();
    // 作り直す前にフォーカスしていたボタンへ、作り直した後もフォーカスを戻す
    const focused = document.activeElement;
    const lists = [els.templateGroups, els.templateSystems, els.templateStrip];
    const refocus = focused && lists.some(list => list.contains(focused))
      ? ['group', 'system', 'template'].filter(key => focused.dataset[key]).map(key => `[data-${key}="${focused.dataset[key]}"]`)[0] || '' : '';
    els.templatesHint.textContent = dict().templatesHint(app.mode);
    const groups = P.TEMPLATE_GROUPS[app.mode] || null;
    const place = currentPlace();
    const group = place ? place.group : null;
    els.templateGroups.hidden = !groups;
    els.templateGroups.innerHTML = '';
    if (groups) {
      els.templateGroups.setAttribute('aria-label', dict().templateGroups);
      groups.forEach(g => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'template-group';
        btn.dataset.group = g.id;
        btn.textContent = g.label[app.lang];
        const on = g.id === group;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
        btn.addEventListener('click', () => showPlace(g.id));
        els.templateGroups.appendChild(btn);
      });
    }
    const groupDef = groups ? groups.find(g => g.id === group) : null;
    const systems = groupDef && groupDef.systems ? groupDef.systems : null;
    const system = systems ? (place.system || systems[0].id) : null;
    els.templateSystems.hidden = !systems;
    els.templateSystems.innerHTML = '';
    if (systems) {
      els.templateSystems.setAttribute('aria-label', dict().templateSystems);
      const label = document.createElement('span');
      label.className = 'template-systems-label';
      label.textContent = dict().templateSystems;
      els.templateSystems.appendChild(label);
      systems.forEach(sy => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'template-system';
        btn.dataset.system = sy.id;
        btn.textContent = sy.label[app.lang];
        const on = sy.id === system;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
        btn.addEventListener('click', () => showPlace(groupDef.id, sy.id));
        els.templateSystems.appendChild(btn);
      });
    }
    els.templateStrip.innerHTML = '';
    (P.TEMPLATES[app.mode] || []).filter(tpl => !groups || (tpl.group === group && (!system || tpl.system === system))).forEach(tpl => {
      const btn = templateChip(tpl);
      const on = s.templateId === tpl.id;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.addEventListener('click', () => applyTemplate(tpl));
      els.templateStrip.appendChild(btn);
    });
    reserveTemplateRows();
    renderMyTemplates();
    syncSheetLabels();
    if (refocus) {
      const target = lists.map(list => list.querySelector(refocus)).find(Boolean);
      if (target) target.focus();
    }
  }

  // テンプレートのチップ（アイコンは線画の SVG。システム別のチップはアイコンなし）
  function templateChip(tpl) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'template-chip';
    btn.dataset.template = tpl.id;
    const icon = tpl.icon ? ICONS.create(tpl.icon, 'template-icon') : null;
    if (icon) btn.appendChild(icon);
    const name = document.createElement('span');
    name.textContent = tpl.label[app.lang];
    btn.appendChild(name);
    return btn;
  }

  // チップの少ない分類でも、モードの中でいちばん段数の多い分類（2段未満なら2段）に合わせて高さを確保し、
  // 分類を切り替えても下の設定タブが上下しないようにする。チップの高さは画面の拡大率で枠線の太さが変わるため、実際に並んだチップから測る
  function reserveTemplateRows() {
    const strip = els.templateStrip;
    strip.style.minHeight = '';
    const chip = strip.querySelector('.template-chip');
    const height = chip ? chip.getBoundingClientRect().height : 0;
    if (!(height > 0)) return;
    const gap = parseFloat(window.getComputedStyle(strip).rowGap) || 0;
    const rows = Math.max(2, maxTemplateRows());
    strip.style.minHeight = `${(height * rows + gap * (rows - 1)).toFixed(2)}px`;
  }

  // モードの各分類（システムがあればシステムごと）のチップを見えない帯に並べて、いちばん多い段数を数える（モード・言語・幅ごとに覚える）
  const rowsCache = { key: '', rows: 0 };
  function maxTemplateRows() {
    const strip = els.templateStrip;
    if (!strip.clientWidth) return 2;
    const key = `${app.mode}|${app.lang}|${strip.clientWidth}`;
    if (rowsCache.key === key) return rowsCache.rows;
    const all = P.TEMPLATES[app.mode] || [];
    const groups = P.TEMPLATE_GROUPS[app.mode];
    const sets = [];
    if (!groups) sets.push(all);
    else groups.forEach(g => {
      if (g.systems) g.systems.forEach(sy => sets.push(all.filter(t => t.group === g.id && t.system === sy.id)));
      else sets.push(all.filter(t => t.group === g.id));
    });
    const probe = document.createElement('div');
    probe.className = 'template-strip';
    probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '-10000px', top: '0', width: `${strip.clientWidth}px` });
    strip.parentNode.appendChild(probe);
    let rows = 1;
    sets.forEach(list => {
      probe.innerHTML = '';
      list.forEach(tpl => probe.appendChild(templateChip(tpl)));
      rows = Math.max(rows, new Set([...probe.children].map(c => Math.round(c.offsetTop))).size);
    });
    probe.remove();
    Object.assign(rowsCache, { key, rows });
    return rows;
  }

  // テンプレートを場面に当てはめる。文章は新しいテンプレートの見本にしたうえで、書き換えた文章があれば戻す
  // （メッセージ・トレイラーはそのテンプレートで書き換えた文章、場所・時間はテンプレートをまたいで共通の文章）。
  // マイテンプレートは、保存したときの画像サイズにも戻す。このブラウザで使えないフォントの名前を返す
  function fillTemplate(s, tpl) {
    P.applyTemplate(s, tpl, app.lang);
    let missing = [];
    if (tpl.my) {
      ['width', 'height', 'sizePreset'].forEach(key => { if (key in tpl.patch) s[key] = tpl.patch[key]; });
      missing = fixMissingFonts(s, tpl.fontNames);
    }
    const memos = app.editedTexts[app.mode];
    const memo = (PER_TEMPLATE_TEXT.includes(app.mode) ? memos[tpl.id] : memos) || {};
    if (typeof memo.text === 'string') s.text = memo.text;
    if (typeof memo.subText === 'string') s.subText = memo.subText;
    s.mode = app.mode;
    return missing;
  }

  // テンプレートの書き出しのループにする（マイテンプレートで回数を指定していたときは、その回数も戻す）
  function applyTemplateLoop(tpl) {
    if (tpl && tpl.my && tpl.loop === 'count') {
      app.exportOpts.loopCount = Math.max(1, Math.min(999, Number(tpl.loopCount) || 3));
      els.loopCount.value = String(app.exportOpts.loopCount);
    }
    setExportLoop(P.exportLoop(tpl));
  }

  function applyTemplate(tpl) {
    const missing = fillTemplate(scene(), tpl);
    applyTemplateLoop(tpl);
    renderTemplates();
    view.renderer.invalidateSprites();
    invalidate();
    layoutStage();
    panel.refresh();
    scheduleFontLoad(0);
    saveState();
    restartPreview();
    // スマートフォン表示では、通知がプレビューの上に重なるので出さない（選んだ結果はプレビューとシートのバーで分かる）
    if (!isPhone()) toast((tpl.my ? msg().myApplied : msg().templateApplied)(tpl.label[app.lang]), 'success', 2200);
    // 使えないフォントの案内は、スマートフォンでも出す
    if (missing.length) toast(msg().myFontMissing(missing), 'warning', 6000);
    // マイテンプレートの名前は送らない
    track(tpl.my ? 'my_template_apply' : 'template_apply', tpl.my ? { mode: app.mode } : { mode: app.mode, template: tpl.id });
  }

  function resetMode() {
    if (!window.confirm(msg().storageReset)) return;
    els.mySaveForm.hidden = true;
    app.scenes[app.mode] = P.defaultScene(app.mode, app.lang);
    app.editedTexts[app.mode] = {};
    app.exportOpts.fileNames[app.mode] = '';
    setExportLoop(P.exportLoop(currentTemplate()));
    renderTemplates();
    view.renderer.invalidateSprites();
    invalidate();
    layoutStage();
    panel.render(app.tab, els.settingsBody);
    scheduleFontLoad(0);
    saveState();
    restartPreview();
    toast(msg().resetDone, 'info', 2200);
  }

  /* ================= マイテンプレート =================
   * 今の設定（フォント・色・動き・画像サイズ・登場／退場の有無・文章・書き出しのループ）に名前をつけて、モードごとに保存する。
   * 選ぶと組み込みのテンプレートと同じように場面に当てはめる。ファイル（JSON）に保存して、別のPCやほかのGMのブラウザで追加できる */

  const my = { items: [] };

  // 読み込んだ設定で、0 にすると時間や速さが計算できなくなる項目の下限（設定パネルのスライダーの下限）
  const STYLE_MIN = (() => {
    const mins = {};
    const visit = item => {
      if (!item || typeof item !== 'object') return;
      if (item.type === 'range' && typeof item.bind === 'string' && item.min > 0) mins[item.bind] = item.min;
      ['children', 'items'].forEach(key => { if (Array.isArray(item[key])) item[key].forEach(visit); });
    };
    Object.values(SCHEMA).forEach(list => { if (Array.isArray(list)) list.forEach(visit); });
    return mins;
  })();

  function isMyId(id) { return typeof id === 'string' && id.startsWith('my-'); }
  function myItems(mode) { return my.items.filter(item => item.mode === mode); }
  function findMy(id) { return my.items.find(item => item.id === id) || null; }

  function newMyId() {
    let id = '';
    do id = `my-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; while (findMy(id));
    return id;
  }

  // 名前：改行などの制御文字を除いて空白をまとめ、MY_NAME_MAX 文字まで
  function cleanMyName(name) {
    const tidy = String(name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return E.graphemes(tidy).slice(0, MY_NAME_MAX).join('').trim();
  }

  // マイテンプレートを、組み込みのテンプレートと同じ形にする（名前・文章はどの言語でも同じ）
  function myDef(item) {
    const all = value => ({ ja: value, en: value, ko: value, zh: value });
    return {
      id: item.id, my: true, label: all(item.name), text: all(item.text), subText: all(item.subText),
      patch: item.style, loop: item.loop, loopCount: item.loopCount, base: item.base, fontNames: item.fontNames
    };
  }

  // モードのテンプレート（組み込み・マイテンプレート）を ID で探す
  function findTemplate(mode, id) {
    if (isMyId(id)) {
      const item = findMy(id);
      return item && item.mode === mode ? myDef(item) : null;
    }
    return (P.TEMPLATES[mode] || []).find(t => t.id === id) || null;
  }

  // 設定を、場面の初期値にある項目・同じ種類の値だけにする（文章とモードは別に持つ）。
  // 数値は有限の値だけ。画像サイズは 32〜3840px、時間や速さはスライダーの下限まで
  function sanitizeStyle(raw, base = P.BASE, path = '') {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(base).forEach(key => {
      if (!path && ['mode', 'text', 'subText'].includes(key)) return;
      if (!Object.prototype.hasOwnProperty.call(raw, key)) return;
      const def = base[key];
      const value = raw[key];
      const bind = path ? `${path}.${key}` : key;
      if (def && typeof def === 'object') {
        const nested = sanitizeStyle(value, def, bind);
        if (Object.keys(nested).length) out[key] = nested;
      } else if (typeof def === 'number') {
        if (typeof value === 'number' && Number.isFinite(value)) out[key] = Math.max(STYLE_MIN[bind] || -1e5, Math.min(1e5, value));
      } else if (typeof def === 'string') {
        if (typeof value === 'string' && value.length <= 200) out[key] = value;
      } else if (typeof def === 'boolean') {
        if (typeof value === 'boolean') out[key] = value;
      }
    });
    if (!path) ['width', 'height'].forEach(key => { if (key in out) out[key] = Math.round(Math.min(3840, Math.max(32, out[key]))); });
    return out;
  }

  // 保存データ・ファイルのマイテンプレートを確かめて、使える形にする（使えなければ null。ID が無ければ空）
  function sanitizeMyItem(raw) {
    if (!raw || typeof raw !== 'object' || !MODES.includes(raw.mode)) return null;
    const style = sanitizeStyle(raw.style);
    if (!Object.keys(style).length) return null;
    const fontNames = {};
    if (raw.fontNames && typeof raw.fontNames === 'object') {
      Object.keys(raw.fontNames).forEach(id => {
        if (/^(upload|local):/.test(id) && typeof raw.fontNames[id] === 'string') fontNames[id] = raw.fontNames[id].slice(0, 100);
      });
    }
    const saved = Number(raw.saved);
    return {
      id: typeof raw.id === 'string' && /^my-[a-z0-9]{4,32}$/.test(raw.id) ? raw.id : '',
      mode: raw.mode,
      name: cleanMyName(raw.name) || dict().myUntitled,
      style,
      text: typeof raw.text === 'string' ? raw.text.slice(0, 10000) : '',
      subText: typeof raw.subText === 'string' ? raw.subText.slice(0, 1000) : '',
      loop: ['once', 'infinite', 'count'].includes(raw.loop) ? raw.loop : 'once',
      loopCount: Math.max(1, Math.min(999, Math.round(Number(raw.loopCount)) || 3)),
      base: typeof raw.base === 'string' && (P.TEMPLATES[raw.mode] || []).some(t => t.id === raw.base) ? raw.base : null,
      fontNames,
      saved: Number.isFinite(saved) && saved > 0 ? saved : Date.now()
    };
  }

  function loadMy() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(MY_KEY) || 'null'); } catch (error) { saved = null; }
    my.items = [];
    (saved && Array.isArray(saved.items) ? saved.items : []).forEach(raw => {
      const item = sanitizeMyItem(raw);
      if (!item) return;
      if (!item.id || findMy(item.id)) item.id = newMyId();
      my.items.push(item);
    });
  }

  // 保存できたか（保存できない環境では、ページを開いている間だけ使える）
  function writeMy() {
    try {
      localStorage.setItem(MY_KEY, JSON.stringify({ version: MY_VERSION, items: my.items }));
      return true;
    } catch (error) {
      return false;
    }
  }

  // 使っている登録フォント・PCのフォントの名前（ほかのブラウザで見つからないときの案内に使う）
  function userFontNames(s) {
    const names = {};
    [s.fontId, s.subFontId].forEach(id => {
      const font = /^(upload|local):/.test(String(id)) ? F.get(id) : null;
      if (font) names[id] = String(font.label || font.family);
    });
    return names;
  }

  // このブラウザに無いフォントを確かめる。登録したフォント（ファイル）が無ければ標準のフォントに戻し、
  // PCのフォントが無ければそのまま（代わりのフォントで表示される）。見つからなかったフォントの名前を返す
  function fixMissingFonts(s, names = {}) {
    const missing = [];
    const nameOf = id => (names && names[id]) || String(id).replace(/^(upload|local):/, '');
    if (String(s.fontId).startsWith('upload:') && !F.get(s.fontId)) {
      missing.push(nameOf(s.fontId));
      const fallback = F.get('noto-sans-jp');
      s.fontId = fallback.id;
      s.weight = F.nearestWeight(fallback, s.weight || 700);
    }
    if (String(s.subFontId).startsWith('upload:') && !F.get(s.subFontId)) {
      missing.push(nameOf(s.subFontId));
      s.subFontId = 'same';
    }
    [s.fontId, s.subFontId].forEach(id => {
      if (String(id).startsWith('local:') && !F.isLocalFontAvailable(String(id).slice(6))) missing.push(nameOf(id));
    });
    return [...new Set(missing)];
  }

  // 同じモードに同じ名前があれば「名前 (2)」「名前 (3)」…にする
  function uniqueMyName(mode, name) {
    const taken = new Set(myItems(mode).map(item => item.name));
    if (!taken.has(name)) return name;
    for (let n = 2; ; n++) {
      const suffix = ` (${n})`;
      const head = E.graphemes(name).slice(0, MY_NAME_MAX - suffix.length).join('').trim();
      if (!taken.has(head + suffix)) return head + suffix;
    }
  }

  // 保存するときの名前の候補：マイテンプレートを開いていればその名前（上書き保存になる）、
  // 組み込みのテンプレートなら「テンプレート名（カスタム）」（同じ名前があれば番号をつける）
  function defaultMyName() {
    const tpl = currentTemplate();
    if (tpl && tpl.my) return tpl.label[app.lang];
    const d = dict();
    return uniqueMyName(app.mode, cleanMyName(d.myDefaultName(tpl ? tpl.label[app.lang] : d.modes[app.mode][0])));
  }

  function renderMyTemplates() {
    const d = dict();
    const s = scene();
    const strip = els.myTemplateStrip;
    // 作り直す前にフォーカスしていたボタンへ、作り直した後もフォーカスを戻す
    const focused = document.activeElement;
    let refocus = '';
    if (focused && strip.contains(focused)) {
      if (focused.dataset.my) refocus = `[data-my="${focused.dataset.my}"]`;
      else if (focused.dataset.myRemove) refocus = `[data-my-remove="${focused.dataset.myRemove}"]`;
      else refocus = '.my-template-add';
    }
    strip.innerHTML = '';
    myItems(app.mode).forEach(item => strip.appendChild(myChip(item, s.templateId === item.id)));
    if (els.mySaveForm.hidden) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'my-template-add';
      add.textContent = d.myAdd;
      add.title = d.myAddTitle;
      add.addEventListener('click', openMySave);
      strip.appendChild(add);
    }
    els.myExportBtn.hidden = !my.items.length;
    if (refocus) {
      const target = strip.querySelector(refocus);
      if (target) target.focus();
    }
  }

  // マイテンプレートのチップ（押すと適用、「×」を2回押すと削除）
  function myChip(item, on) {
    const d = dict();
    const wrap = document.createElement('span');
    wrap.className = 'my-chip';
    wrap.classList.toggle('is-active', on);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'my-chip-apply';
    btn.dataset.my = item.id;
    btn.setAttribute('aria-pressed', String(on));
    btn.title = item.name;
    const icon = ICONS.create('star', 'template-icon');
    if (icon) btn.appendChild(icon);
    const name = document.createElement('span');
    name.className = 'my-chip-name';
    name.textContent = item.name;
    btn.appendChild(name);
    btn.addEventListener('click', () => applyMyTemplate(item.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'my-chip-remove';
    remove.dataset.myRemove = item.id;
    remove.textContent = '×';
    remove.title = d.myRemove;
    remove.setAttribute('aria-label', `${d.myRemove}: ${item.name}`);
    // 削除は、誤操作を防ぐため2回押しで行う（フォントの登録解除と同じ）
    let armed = 0;
    remove.addEventListener('click', () => {
      if (!armed) {
        remove.classList.add('is-armed');
        remove.textContent = d.myRemoveConfirm;
        remove.setAttribute('aria-label', `${d.myRemoveConfirm}: ${item.name}`);
        armed = setTimeout(() => {
          armed = 0;
          remove.classList.remove('is-armed');
          remove.textContent = '×';
          remove.setAttribute('aria-label', `${d.myRemove}: ${item.name}`);
        }, 3000);
        return;
      }
      clearTimeout(armed);
      removeMyTemplate(item.id);
    });
    wrap.append(btn, remove);
    return wrap;
  }

  function applyMyTemplate(id) {
    const item = findMy(id);
    if (item && item.mode === app.mode) applyTemplate(myDef(item));
  }

  function openMySave() {
    els.mySaveForm.hidden = false;
    els.myNameInput.value = defaultMyName();
    syncMySaveButton();
    renderMyTemplates();
    els.myNameInput.focus();
    els.myNameInput.select();
  }

  // 閉じたか（開いていなければ false）
  function closeMySave(refocus = false) {
    if (els.mySaveForm.hidden) return false;
    els.mySaveForm.hidden = true;
    renderMyTemplates();
    if (refocus) {
      const add = els.myTemplateStrip.querySelector('.my-template-add');
      if (add) add.focus();
    }
    return true;
  }

  // 同じモードに同じ名前があれば「上書き保存」にする
  function syncMySaveButton() {
    const d = dict();
    const name = cleanMyName(els.myNameInput.value);
    els.mySaveSubmit.textContent = name && myItems(app.mode).some(item => item.name === name) ? d.myOverwrite : d.mySave;
  }

  function saveMyTemplate() {
    const s = scene();
    const m = msg();
    const name = cleanMyName(els.myNameInput.value) || defaultMyName();
    const existing = myItems(app.mode).find(item => item.name === name) || null;
    if (!existing && myItems(app.mode).length >= MY_MAX) {
      toast(m.myFull(MY_MAX), 'warning', 6000);
      return;
    }
    const current = currentTemplate();
    const item = existing || { id: newMyId(), mode: app.mode, base: null };
    Object.assign(item, {
      name,
      style: sanitizeStyle(P.clone(s)),
      text: String(s.text || ''),
      subText: String(s.subText || ''),
      loop: app.exportOpts.loop,
      loopCount: app.exportOpts.loopCount,
      base: current ? (current.my ? current.base : current.id) : item.base,
      fontNames: userFontNames(s),
      saved: Date.now()
    });
    if (!existing) my.items.push(item);
    // 今の文章がこのマイテンプレートの見本になるので、このテンプレートで覚えていた書き換えは消す
    if (PER_TEMPLATE_TEXT.includes(app.mode)) delete app.editedTexts[app.mode][item.id];
    s.templateId = item.id;
    const stored = writeMy();
    els.mySaveForm.hidden = true;
    renderTemplates();
    saveState();
    toast((existing ? m.myOverwritten : m.mySaved)(name), 'success', 2600);
    if (!stored) toast(m.myNotStored, 'warning', 8000);
    track('my_template_save', { mode: app.mode, overwrite: Boolean(existing), items: myItems(app.mode).length });
    const chip = els.myTemplateStrip.querySelector(`[data-my="${item.id}"]`);
    if (chip) chip.focus();
  }

  function removeMyTemplate(id) {
    const index = my.items.findIndex(item => item.id === id);
    if (index < 0) return;
    const [item] = my.items.splice(index, 1);
    const perTemplate = PER_TEMPLATE_TEXT.includes(item.mode);
    const memo = perTemplate ? app.editedTexts[item.mode][item.id] : undefined;
    if (memo) delete app.editedTexts[item.mode][item.id];
    writeMy();
    renderTemplates();
    saveState();
    // 開いていたマイテンプレートを削除しても、場面の設定はそのまま残る（もう一度保存し直せる）
    toast(msg().myRemoved(item.name), 'info', 6000, {
      label: msg().undo,
      run: () => {
        if (findMy(item.id)) return;
        my.items.splice(Math.min(index, my.items.length), 0, item);
        if (memo && !app.editedTexts[item.mode][item.id]) app.editedTexts[item.mode][item.id] = memo;
        writeMy();
        renderTemplates();
        saveState();
      }
    });
    track('my_template_delete', { mode: item.mode });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  // すべてのモードのマイテンプレートを1つのファイル（JSON）にする
  function exportMyTemplates() {
    if (!my.items.length) { toast(msg().myExportEmpty, 'info'); return; }
    const data = {
      format: MY_FILE_FORMAT,
      version: MY_VERSION,
      tool: `文字画像APNGメーカー ${VERSION}`,
      exported: new Date().toISOString(),
      templates: my.items.map(({ id, ...rest }) => rest)
    };
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const name = `${sanitizeFileName(dict().myFileName) || 'my_templates'}_${stamp}.json`;
    downloadBlob(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' }), name);
    toast(msg().myExported(my.items.length), 'success');
    track('my_template_export', { items: my.items.length });
  }

  // 名前・設定・文章・ループが同じか（同じファイルを2回読み込んでも増やさない）
  function sameMyContent(a, b) {
    return a.name === b.name && a.text === b.text && a.subText === b.subText && a.loop === b.loop
      && (a.loop !== 'count' || a.loopCount === b.loopCount) && JSON.stringify(a.style) === JSON.stringify(b.style);
  }

  // ファイル（JSON）のマイテンプレートを追加する。同じものは追加せず、同じ名前で中身が違うものは番号をつける
  async function importMyTemplates(file) {
    if (!file) return;
    const m = msg();
    let list = null;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Too large.');
      const data = JSON.parse(await file.text());
      if (data && typeof data === 'object' && Array.isArray(data.templates) && (!data.format || data.format === MY_FILE_FORMAT)) list = data.templates;
    } catch (error) {
      list = null;
    }
    const added = [];
    let same = 0;
    let full = 0;
    (list || []).forEach(raw => {
      const item = sanitizeMyItem(raw);
      if (!item) return;
      const mine = myItems(item.mode);
      if (mine.some(other => sameMyContent(other, item))) { same += 1; return; }
      if (mine.length >= MY_MAX) { full += 1; return; }
      item.id = newMyId();
      item.name = uniqueMyName(item.mode, item.name);
      my.items.push(item);
      added.push(item);
    });
    if (!added.length && !same && !full) {
      toast(m.myImportFailed, 'error', 6000);
      return;
    }
    const stored = added.length ? writeMy() : true;
    renderTemplates();
    const d = dict();
    const parts = MODES.map(mode => [mode, added.filter(item => item.mode === mode).length])
      .filter(([, n]) => n).map(([mode, n]) => m.myModeCount(d.modes[mode][0], n));
    toast(m.myImportResult(added.length, parts, same, full, MY_MAX), added.length ? 'success' : 'info', 7000);
    if (!stored) toast(m.myNotStored, 'warning', 8000);
    track('my_template_import', { items: added.length, duplicates: same, over_limit: full });
  }

  function bindMyTemplates() {
    els.mySaveForm.addEventListener('submit', event => {
      event.preventDefault();
      saveMyTemplate();
    });
    els.myNameInput.addEventListener('input', syncMySaveButton);
    els.myNameInput.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeMySave(true);
    });
    els.mySaveCancel.addEventListener('click', () => closeMySave(true));
    els.myExportBtn.addEventListener('click', exportMyTemplates);
    els.myImportBtn.addEventListener('click', () => els.myImportFile.click());
    els.myImportFile.addEventListener('change', () => {
      const file = els.myImportFile.files && els.myImportFile.files[0];
      els.myImportFile.value = '';
      importMyTemplates(file);
    });
    // ほかのタブで保存・削除したら、一覧を読み直す
    window.addEventListener('storage', event => {
      if (event.key !== MY_KEY) return;
      loadMy();
      renderTemplates();
    });
  }

  function setTab(tab) {
    if (!TABS.includes(tab)) return;
    app.tab = tab;
    syncTabs();
    panel.render(tab, els.settingsBody);
    saveState();
  }

  /* ================= 書き出し ================= */

  function sanitizeFileName(name) {
    return String(name || '')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^[._]+|[._]+$/g, '')
      .slice(0, 60);
  }

  // 長い文章は16文字まで（句読点・ダッシュ・三点リーダーで区切れるならそこまで、欧文は単語の切れ目まで）。
  // 末尾に残ったダッシュ・三点リーダーは除く
  function shortTitle(text) {
    const line = String(text || '').split('\n').map(l => l.trim()).find(Boolean) || '';
    const tidy = str => str.replace(/[―—–…‥\s]+$/u, '').trim();
    const chars = E.graphemes(line);
    if (chars.length <= 16) return tidy(line) || line;
    const head = chars.slice(0, 16);
    for (let i = head.length - 1; i >= 3; i--) {
      if (/[、。，．！？!?,.―—…‥]/.test(head[i])) return tidy(head.slice(0, i).join(''));
    }
    if (chars[16] !== ' ') {
      const space = head.lastIndexOf(' ');
      if (space >= 3) return tidy(head.slice(0, space).join(''));
    }
    return tidy(head.join(''));
  }

  // 左の設定（文章・登場の動き／表示方法・退場の有無）からファイル名の候補を作る
  function suggestFileName(s = scene()) {
    const d = dict();
    const L = v => (v && typeof v === 'object' ? (v[app.lang] ?? v.ja) : (v || ''));
    const parts = [shortTitle(s.text) || d.modes[s.mode][0]];
    if (s.mode === 'trailer') {
      const opt = OPT.reveal.find(o => o.value === (s.reveal || 'char'));
      if (opt) parts.push(L(opt.label));
    } else {
      parts.push(L(FX_LABELS.in[s.inFx]));
    }
    const scroll = s.mode === 'trailer' && s.reveal === 'scroll';
    if (!scroll && s.inEnabled === false) parts.push(d.fileNoEnter);
    if (!scroll && s.outEnabled === false) parts.push(d.fileNoExit);
    // 書き出しが「ずっとループ」なら、ファイル名の末尾に「_ループ」をつける
    if (app.exportOpts.loop === 'infinite') parts.push(d.fileLoop);
    return sanitizeFileName(parts.filter(Boolean).join('_'));
  }

  function baseFileName() {
    const custom = sanitizeFileName(app.exportOpts.fileNames[app.mode]);
    if (custom) return custom.replace(/\.(png|apng|webp|zip)$/i, '');
    return suggestFileName() || 'text_apng';
  }

  // ファイル名欄：手入力していなければ、設定から作った候補を入れておく（書き出しボタンはこの名前を使う）
  function syncFileName() {
    const custom = app.exportOpts.fileNames[app.mode] || '';
    const suggestion = suggestFileName();
    els.fileNameInput.placeholder = suggestion;
    if (document.activeElement !== els.fileNameInput) els.fileNameInput.value = custom || suggestion;
    els.fileNameAutoBadge.hidden = Boolean(custom);
    els.fileNameAutoBtn.hidden = !custom;
  }

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function setExporting(on) {
    view.exporting = on;
    view.cancel = false;
    [els.exportApngBtn, els.exportWebpBtn, els.exportPngBtn, els.exportZipBtn, els.batchExportBtn].forEach(btn => { btn.disabled = on; });
    els.cancelBtn.hidden = !on;
    els.progress.hidden = !on;
    els.body.classList.toggle('is-exporting', on);
    if (!on) setProgress(0);
  }

  function setProgress(ratio, text) {
    els.progressBar.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
    if (text !== undefined) els.status.textContent = text;
  }

  function checkCancel() {
    if (view.cancel) {
      const error = new Error('cancelled');
      error.code = 'CANCELLED';
      throw error;
    }
  }

  const yieldToUi = () => new Promise(resolve => setTimeout(resolve, 0));

  function hasVisibleText(s) {
    return Boolean(String(s.text || '').trim() || (s.mode !== 'trailer' && String(s.subText || '').trim()));
  }

  // その形式を書き出せない環境なら、その案内（書き出せるなら空）
  function unsupportedText(format) {
    if (format === 'webp') return C.isWebpSupported() ? '' : msg().webpUnsupported;
    return C.isCompressionSupported() ? '' : msg().unsupported;
  }

  function loopText(loops) {
    return loops === 0 ? msg().loopInfinite : (loops === 1 ? msg().loopOnce : msg().loopCount(loops));
  }

  // 1つの場面を動く画像にする（format: 'apng' / 'webp'）。フレームの描き方・自動トリミング・ループは共通で、
  // APNG は 256色に減色できる（色数の設定）、WebP は常にフルカラーの非可逆圧縮（WEBP_QUALITY）。
  // onProgress(割合, 文言) で進み具合を知らせる。フレームが多すぎるときは code: 'TOO_MANY_FRAMES' で止める
  async function encodeAnimation(s, opts, format, onProgress) {
    const webp = format === 'webp';
    await ensureFonts(s);
    const renderer = new E.TextRenderer({ resolveFont: (id, text) => F.families(id, text) });
    const prepared = renderer.prepare(s);
    const duration = prepared.timeline.duration;
    const fps = Math.max(1, Number(opts.fps) || 24);
    const count = exportFrameCount(duration, fps);
    if (count > MAX_FRAMES) {
      const error = new Error('Too many frames.');
      error.code = 'TOO_MANY_FRAMES';
      error.count = count;
      throw error;
    }
    const W = s.width, H = s.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const timeAt = i => (i === count - 1 ? duration : Math.min(i / fps, duration));
    const grab = t => {
      renderer.render(ctx, t, { scale: 1 });
      return ctx.getImageData(0, 0, W, H).data;
    };
    const usePalette = !webp && opts.color !== 'full';
    const needAnalysis = usePalette || opts.trim;
    let quantizer = null;
    let crop = null;
    const analysisShare = needAnalysis ? 0.4 : 0;
    if (needAnalysis) {
      quantizer = usePalette ? new C.PaletteQuantizer(256) : null;
      const analyzer = new C.FrameAnalyzer(W, H, { quantizer });
      for (let i = 0; i < count; i++) {
        checkCancel();
        analyzer.add(grab(timeAt(i)));
        if (i % 3 === 0 || i === count - 1) {
          onProgress((i + 1) / count * analysisShare, msg().analyzing(i + 1, count));
          await yieldToUi();
        }
      }
      if (opts.poster && !webp) analyzer.add(grab(prepared.timeline.posterTime));
      if (opts.trim && analyzer.bounds) {
        const m = 2;
        const b = analyzer.bounds;
        const x0 = Math.max(0, b.x0 - m), y0 = Math.max(0, b.y0 - m);
        const x1 = Math.min(W, b.x1 + m), y1 = Math.min(H, b.y1 + m);
        if (x1 - x0 < W || y1 - y0 < H) crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      if (quantizer) quantizer.build();
    }
    const outW = crop ? crop.w : W;
    const outH = crop ? crop.h : H;
    const shape = data => (crop ? C.cropFrame(data, W, crop) : data);
    const loops = opts.loop === 'once' ? 1 : (opts.loop === 'count' ? Math.max(1, Math.min(999, Number(opts.loopCount) || 1)) : 0);
    const encoder = webp
      ? new C.WebpEncoder({ width: outW, height: outH, fps, loops, quality: WEBP_QUALITY })
      : new C.ApngEncoder({ width: outW, height: outH, fps, loops, quantizer });
    // APNG非対応の環境で出す静止画は APNG だけのもの
    if (opts.poster && !webp) await encoder.setDefaultImage(shape(grab(prepared.timeline.posterTime)));
    const encoding = webp ? msg().encodingWebp : msg().encoding;
    for (let i = 0; i < count; i++) {
      checkCancel();
      await encoder.addFrame(shape(grab(timeAt(i))));
      if (i % 2 === 0 || i === count - 1) {
        onProgress(analysisShare + (i + 1) / count * (1 - analysisShare), encoding(i + 1, count));
        await yieldToUi();
      }
    }
    checkCancel();
    const blob = encoder.finish();
    const colors = webp ? msg().colorsWebp(WEBP_QUALITY) : (quantizer ? msg().colorsPalette(quantizer.isLossless) : msg().colorsFull);
    return { blob, width: outW, height: outH, count, stored: encoder.frameCount, loops, colors, fps, colorMode: webp ? 'webp' : (usePalette ? 'palette' : 'full') };
  }

  // 書き出しが止まったときの案内（中止・非対応・フレーム数の上限・そのほかの失敗）
  function exportFailed(error) {
    let text = msg().failed;
    let kind = 'error';
    if (error && error.code === 'CANCELLED') {
      text = msg().cancelled;
      kind = 'warning';
    } else if (error && error.code === 'WEBP_UNSUPPORTED') {
      text = msg().webpUnsupported;
    } else if (error && error.code === 'COMPRESSION_UNSUPPORTED') {
      text = msg().unsupported;
    } else if (error && error.code === 'TOO_MANY_FRAMES') {
      text = msg().tooManyFrames(error.count, MAX_FRAMES);
    } else {
      console.error(error);
    }
    els.status.textContent = text;
    toast(text, kind, kind === 'warning' ? undefined : 6000);
  }

  async function exportAnimated(format) {
    if (view.exporting) return false;
    const webp = format === 'webp';
    const s = P.clone(scene());
    if (!hasVisibleText(s)) { toast(msg().emptyText, 'warning'); return false; }
    const unsupported = unsupportedText(format);
    if (unsupported) { toast(unsupported, 'error', 6000); els.status.textContent = unsupported; return false; }
    const opts = { ...app.exportOpts };
    pause();
    setExporting(true);
    clearResult();
    const started = performance.now();
    try {
      const r = await encodeAnimation(s, opts, format, setProgress);
      const name = `${baseFileName()}.${webp ? 'webp' : 'png'}`;
      showResult(r.blob, name, msg().resultMeta(formatBytes(r.blob.size), r.width, r.height, r.count, r.stored, r.colors, loopText(r.loops)), format);
      const done = webp ? msg().webpDone : msg().done;
      setProgress(1, done);
      toast(done, 'success');
      track(webp ? 'export_webp' : 'export_apng', {
        mode: s.mode, in_fx: s.inEnabled === false ? 'none' : s.inFx, out_fx: s.outEnabled === false ? 'none' : s.outFx, hold_fx: s.holdFx, fps: r.fps, color_mode: r.colorMode,
        frames: r.count, size_kb: Math.round(r.blob.size / 1024), over_limit: r.blob.size > SIZE_GUIDE_BYTES, seconds: Math.round((performance.now() - started) / 100) / 10
      });
      return true;
    } catch (error) {
      exportFailed(error);
      return false;
    } finally {
      setExporting(false);
    }
  }

  /* ---------- まとめて書き出す ---------- */

  // 1行に1つ。メッセージ・場所・時間では「|」（全角の「｜」・タブも可）のあとがサブテキスト。
  // 区切りの無い行は、いまのサブテキストをそのまま使う（「保健室|」のように区切りだけ書けばサブテキストなし）
  function parseBatch(text, s) {
    const items = [];
    String(text || '').split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      if (s.mode === 'trailer') {
        items.push({ text: line.trim(), subText: '' });
        return;
      }
      const cut = line.search(/[|｜\t]/);
      if (cut < 0) items.push({ text: line.trim(), subText: s.subText });
      else items.push({ text: line.slice(0, cut).trim(), subText: line.slice(cut + 1).trim() });
    });
    return items.filter(item => item.text || item.subText);
  }

  // 入力欄・見出し・件数の表示（モードごとに別の文章を覚える）
  function syncBatch() {
    const d = dict();
    const o = app.exportOpts;
    els.batchSummary.textContent = d.batchSummary;
    els.batchLabel.textContent = d.batchLabel;
    els.batchInput.placeholder = app.mode === 'trailer' ? d.batchPlaceholderTrailer : d.batchPlaceholder;
    if (document.activeElement !== els.batchInput) els.batchInput.value = o.batch[app.mode] || '';
    els.batchFormat.value = o.batchFormat;
    els.batchFormat.setAttribute('aria-label', d.batchFormat);
    els.batchExportBtn.textContent = d.batchExport;
    els.batchHint.textContent = d.batchHint(parseBatch(els.batchInput.value, scene()).length, BATCH_MAX, app.mode);
  }

  async function exportBatch() {
    if (view.exporting) return false;
    const format = app.exportOpts.batchFormat === 'webp' ? 'webp' : 'apng';
    const base = P.clone(scene());
    const items = parseBatch(els.batchInput.value, base);
    if (!items.length) { toast(msg().batchEmpty, 'warning'); els.batchInput.focus(); return false; }
    if (items.length > BATCH_MAX) { toast(msg().batchTooMany(BATCH_MAX), 'warning', 4200); return false; }
    const unsupported = unsupportedText(format);
    if (unsupported) { toast(unsupported, 'error', 6000); els.status.textContent = unsupported; return false; }
    const opts = { ...app.exportOpts };
    const ext = format === 'webp' ? 'webp' : 'png';
    pause();
    setExporting(true);
    clearResult();
    const started = performance.now();
    try {
      const files = [];
      const used = new Set();
      const over = [];
      for (let k = 0; k < items.length; k++) {
        const s = P.clone(base);
        s.text = items[k].text;
        if (s.mode !== 'trailer') s.subText = items[k].subText;
        const label = shortTitle(s.text) || shortTitle(s.subText);
        const r = await encodeAnimation(s, opts, format, ratio => setProgress((k + ratio) / items.length, msg().batchProgress(k + 1, items.length, label)));
        // 同じ名前になったら _2, _3 … をつける
        const stem = suggestFileName(s) || 'text_apng';
        let name = `${stem}.${ext}`;
        for (let n = 2; used.has(name); n++) name = `${stem}_${n}.${ext}`;
        used.add(name);
        if (r.blob.size > SIZE_GUIDE_BYTES) over.push(name);
        files.push({ name, data: new Uint8Array(await r.blob.arrayBuffer()) });
      }
      checkCancel();
      const zip = C.buildZip(files);
      const d = dict();
      const zipName = `${sanitizeFileName(d.batchZip(d.modes[base.mode][0], files.length)) || 'text_apng_batch'}.zip`;
      showResult(zip, zipName, msg().batchMeta(files.length, format === 'webp' ? 'WebP' : 'APNG', formatBytes(zip.size)), null);
      els.resultNote.textContent = over.length ? msg().batchOver(over.join('、')) : msg().batchWithin;
      els.resultNote.className = `result-note ${over.length ? 'is-warning' : 'is-ok'}`;
      els.resultNote.hidden = false;
      triggerDownload();
      const done = msg().batchDone(files.length);
      setProgress(1, done);
      toast(done, 'success');
      track('export_batch', {
        mode: base.mode, format, items: files.length, fps: Math.max(1, Number(opts.fps) || 24), size_kb: Math.round(zip.size / 1024),
        over_limit: over.length, seconds: Math.round((performance.now() - started) / 100) / 10
      });
      return true;
    } catch (error) {
      exportFailed(error);
      return false;
    } finally {
      setExporting(false);
    }
  }

  function bindBatch() {
    const o = app.exportOpts;
    els.batchInput.addEventListener('input', () => {
      o.batch[app.mode] = els.batchInput.value;
      els.batchHint.textContent = dict().batchHint(parseBatch(els.batchInput.value, scene()).length, BATCH_MAX, app.mode);
      saveState();
    });
    els.batchFormat.addEventListener('change', () => { o.batchFormat = els.batchFormat.value === 'webp' ? 'webp' : 'apng'; saveState(); });
    els.batchExportBtn.addEventListener('click', exportBatch);
  }

  function exportApng() {
    return exportAnimated('apng');
  }

  function exportWebp() {
    return exportAnimated('webp');
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
  }

  async function exportStill() {
    if (view.exporting) return false;
    const s = P.clone(scene());
    if (!hasVisibleText(s)) { toast(msg().emptyText, 'warning'); return false; }
    await ensureFonts(s);
    const renderer = new E.TextRenderer({ resolveFont: (id, text) => F.families(id, text) });
    const prepared = renderer.prepare(s);
    const canvas = document.createElement('canvas');
    canvas.width = s.width;
    canvas.height = s.height;
    // 再生中は完成状態、一時停止中はその瞬間を保存（文字が映らない瞬間なら完成状態）
    const T = prepared.timeline;
    const first = T.pages[0];
    const last = T.pages[T.pages.length - 1];
    const paused = Math.min(view.time, T.duration);
    const blank = !first || paused < first.textStart || (Number.isFinite(last.end) && paused > last.end);
    const t = view.playing || blank ? T.posterTime : paused;
    renderer.render(canvas.getContext('2d'), t, { scale: 1 });
    const blob = await canvasToBlob(canvas);
    const name = `${baseFileName()}_still.png`;
    showResult(blob, name, `${formatBytes(blob.size)} ・ ${s.width} × ${s.height} ・ PNG`, null);
    triggerDownload();
    toast(msg().stillDone, 'success');
    track('export_png', { mode: s.mode });
    return true;
  }

  async function exportZip() {
    if (view.exporting) return false;
    const s = P.clone(scene());
    if (!hasVisibleText(s)) { toast(msg().emptyText, 'warning'); return false; }
    const fps = Math.max(1, Number(app.exportOpts.fps) || 24);
    pause();
    setExporting(true);
    clearResult();
    try {
      await ensureFonts(s);
      const renderer = new E.TextRenderer({ resolveFont: (id, text) => F.families(id, text) });
      const prepared = renderer.prepare(s);
      const duration = prepared.timeline.duration;
      const count = exportFrameCount(duration, fps);
      if (count > MAX_FRAMES) {
        toast(msg().tooManyFrames(count, MAX_FRAMES), 'error', 5200);
        return false;
      }
      const canvas = document.createElement('canvas');
      canvas.width = s.width;
      canvas.height = s.height;
      const ctx = canvas.getContext('2d');
      const base = baseFileName();
      const files = [];
      const digits = Math.max(4, String(count).length);
      for (let i = 0; i < count; i++) {
        checkCancel();
        renderer.render(ctx, i === count - 1 ? duration : Math.min(i / fps, duration), { scale: 1 });
        const blob = await canvasToBlob(canvas);
        files.push({ name: `${base}_${String(i + 1).padStart(digits, '0')}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
        if (i % 2 === 0 || i === count - 1) {
          setProgress((i + 1) / count, msg().zipping(i + 1, count));
          await yieldToUi();
        }
      }
      const info = `fps: ${fps}\nframes: ${count}\nsize: ${s.width}x${s.height}\nduration: ${(count / fps).toFixed(3)}s\n`;
      files.push({ name: `${base}_info.txt`, data: new TextEncoder().encode(info) });
      const zip = C.buildZip(files);
      showResult(zip, `${base}_frames.zip`, `${formatBytes(zip.size)} ・ ${count} PNG ・ ${fps}FPS`, null);
      triggerDownload();
      setProgress(1, msg().zipDone);
      toast(msg().zipDone, 'success');
      track('export_zip', { mode: s.mode, fps, frames: count });
      return true;
    } catch (error) {
      if (error && error.code === 'CANCELLED') {
        els.status.textContent = msg().cancelled;
        toast(msg().cancelled, 'warning');
      } else {
        console.error(error);
        els.status.textContent = msg().failed;
        toast(msg().failed, 'error', 5000);
      }
      return false;
    } finally {
      setExporting(false);
    }
  }

  // format: 'apng' / 'webp' のときは、容量の目安（5MB）の案内を出す
  function showResult(blob, name, meta, format) {
    clearResult();
    view.resultUrl = URL.createObjectURL(blob);
    els.downloadLink.href = view.resultUrl;
    els.downloadLink.download = name;
    els.downloadLink.dataset.name = name;
    els.resultMeta.textContent = `${name} ・ ${meta}`;
    const isImage = blob.type === 'image/png' || blob.type === 'image/webp';
    els.resultImage.hidden = !isImage;
    if (isImage) {
      els.resultImage.src = view.resultUrl;
      els.resultImage.alt = name;
    }
    if (format) {
      const over = blob.size > SIZE_GUIDE_BYTES;
      const overLimit = format === 'webp' ? msg().overLimitWebp : msg().overLimit;
      els.resultNote.textContent = over ? overLimit(formatBytes(blob.size)) : msg().withinLimit;
      els.resultNote.className = `result-note ${over ? 'is-warning' : 'is-ok'}`;
      els.resultNote.hidden = false;
    } else {
      els.resultNote.hidden = true;
    }
    els.result.hidden = false;
  }

  function clearResult() {
    if (view.resultUrl) URL.revokeObjectURL(view.resultUrl);
    view.resultUrl = '';
    els.result.hidden = true;
    els.resultImage.removeAttribute('src');
    els.downloadLink.removeAttribute('href');
  }

  function triggerDownload() {
    if (!view.resultUrl) return;
    els.downloadLink.click();
  }

  /* ================= ドロワー ================= */

  function drawerPairs() {
    return [[els.helpDrawer, els.helpBtn], [els.rulesDrawer, els.rulesBtn], [els.shortcutDrawer, els.shortcutBtn]];
  }

  function toggleDrawer(drawer) {
    const open = drawer.hidden;
    drawerPairs().forEach(([d]) => { d.hidden = true; });
    drawer.hidden = !open;
    drawerPairs().forEach(([d, btn]) => btn.setAttribute('aria-expanded', String(!d.hidden)));
    // スマートフォン：開いた説明はページの上にあるので、シートを閉じてそこまで移動する
    if (open && isPhone()) {
      setHeaderMenu(false);
      setSheet('peek');
      drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function closeDrawers() {
    const wasOpen = drawerPairs().some(([d]) => !d.hidden);
    drawerPairs().forEach(([d, btn]) => {
      d.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    });
    return wasOpen;
  }

  /* ================= 初期化 ================= */

  function setExportLoop(loop) {
    app.exportOpts.loop = loop;
    els.loopSelect.value = loop;
    els.loopCountWrap.hidden = loop !== 'count';
    syncFileName();
    saveState();
  }

  function bindExportOptions() {
    const o = app.exportOpts;
    els.fpsSelect.value = String(o.fps);
    els.loopSelect.value = o.loop;
    els.loopCount.value = String(o.loopCount);
    els.colorSelect.value = o.color;
    els.posterInput.checked = Boolean(o.poster);
    els.trimInput.checked = Boolean(o.trim);
    els.loopCountWrap.hidden = o.loop !== 'count';
    els.fpsSelect.addEventListener('change', () => { o.fps = Number(els.fpsSelect.value); updateInfo(); saveState(); });
    els.loopSelect.addEventListener('change', () => setExportLoop(els.loopSelect.value));
    els.loopCount.addEventListener('change', () => { o.loopCount = Math.max(1, Math.min(999, Number(els.loopCount.value) || 1)); els.loopCount.value = String(o.loopCount); saveState(); });
    els.colorSelect.addEventListener('change', () => { o.color = els.colorSelect.value; saveState(); });
    els.posterInput.addEventListener('change', () => { o.poster = els.posterInput.checked; saveState(); });
    els.trimInput.addEventListener('change', () => { o.trim = els.trimInput.checked; saveState(); });
    els.fileNameInput.addEventListener('input', () => {
      const value = els.fileNameInput.value;
      // 空欄、または候補と同じ名前なら自動入力のまま
      o.fileNames[app.mode] = value.trim() && value !== suggestFileName() ? value : '';
      syncFileName();
      saveState();
    });
    els.fileNameInput.addEventListener('blur', syncFileName);
    els.fileNameAutoBtn.addEventListener('click', () => {
      o.fileNames[app.mode] = '';
      syncFileName();
      saveState();
    });
  }

  function bindEvents() {
    els.langButtons.forEach(btn => btn.addEventListener('click', () => {
      app.lang = LANGS.includes(btn.dataset.langChoice) ? btn.dataset.langChoice : 'ja';
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      const changed = localizeSamples();
      applyLanguage();
      if (!changed) return;
      view.renderer.invalidateSprites();
      invalidate();
      layoutStage();
      scheduleFontLoad(0);
      saveState();
      restartPreview();
    }));
    els.helpBtn.addEventListener('click', () => toggleDrawer(els.helpDrawer));
    els.rulesBtn.addEventListener('click', () => toggleDrawer(els.rulesDrawer));
    // 利用ルールを開く・クレジットをコピーするボタン（ドロワー・書き出し結果・フッターの文中にある）
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-open-rules], [data-copy-credit]');
      if (!target) return;
      event.preventDefault();
      if (target.hasAttribute('data-copy-credit')) copyCredit();
      else openRules();
    });
    els.shortcutBtn.addEventListener('click', () => toggleDrawer(els.shortcutDrawer));
    document.querySelectorAll('[data-close-drawer]').forEach(btn => btn.addEventListener('click', closeDrawers));
    els.themeBtn.addEventListener('click', toggleTheme);
    els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    els.settingsTabs.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
    [els.modeTabs, els.settingsTabs].forEach(list => list.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      tabs[next].click();
    }));
    els.resetBtn.addEventListener('click', resetMode);
    els.playBtn.addEventListener('click', togglePlay);
    els.restartBtn.addEventListener('click', restartPreview);
    els.loopPreview.checked = app.loopPreview;
    els.loopPreview.addEventListener('change', () => { app.loopPreview = els.loopPreview.checked; saveState(); });
    els.entryInput.addEventListener('change', () => handleChange('inEnabled', els.entryInput.checked));
    els.exitInput.addEventListener('change', () => handleChange('outEnabled', els.exitInput.checked));
    els.scrub.addEventListener('input', () => {
      pause();
      view.time = Number(els.scrub.value) || 0;
      requestRender();
    });
    els.previewBgGroup.querySelectorAll('[data-bg]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.bg === 'image' && !view.previewBgUrl) {
        els.previewBgFile.click();
        return;
      }
      setPreviewBg(btn.dataset.bg);
    }));
    els.previewBgFile.addEventListener('change', () => {
      const file = els.previewBgFile.files && els.previewBgFile.files[0];
      els.previewBgFile.value = '';
      if (!file) return;
      if (view.previewBgUrl) URL.revokeObjectURL(view.previewBgUrl);
      view.previewBgUrl = URL.createObjectURL(file);
      setPreviewBg('image');
    });
    els.stage.addEventListener('dblclick', () => {
      if (app.previewBg === 'image') els.previewBgFile.click();
    });
    els.exportApngBtn.addEventListener('click', exportApng);
    els.exportWebpBtn.addEventListener('click', exportWebp);
    els.exportPngBtn.addEventListener('click', exportStill);
    els.exportZipBtn.addEventListener('click', exportZip);
    els.cancelBtn.addEventListener('click', () => { view.cancel = true; });
    els.clearResultBtn.addEventListener('click', () => { clearResult(); els.status.textContent = ''; });
    window.addEventListener('resize', () => { layoutStage(); reserveTemplateRows(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => layoutStage()).observe(els.stageWrap);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && view.playing) pause();
    });
  }

  /* ================= スマートフォン表示 =================
   * - ヘッダー：ページの先頭では2行（タイトル・テーマ・共有／観測所・言語・使い方・利用ルール）。
   *   スクロールしたときや設定のシートを開いたときは1行（タイトル・言語・テーマ・⋯）にたたみ、残りは「⋯」で出し入れする
   * - 設定パネル：プレビューの上に重なる、下から引き出すシート。peek（帯だけ）・half（プレビューと再生ボタンの下まで）・full の3段階
   * - 書き出し：プレビューの下（ページを下へスクロールした先）。シートの帯の「書き出し ↓」からも移動できる */

  const phoneQuery = window.matchMedia('(max-width: 760px)');
  // 小さいスマートフォン（幅 430px 以下）：選択肢・見出しの文言を短くする（applyLanguage と設定パネルの画像サイズ）
  const compactQuery = window.matchMedia('(max-width: 430px)');
  const SHEET_STATES = ['peek', 'half', 'full'];
  const sheet = { state: 'peek', drag: null, visible: { peek: 64, half: 320, full: 600 }, full: 600, baseViewH: 0, baseWidth: 0, typing: false, holdCompactUntil: 0 };
  let headerCompact = false;

  function isPhone() { return phoneQuery.matches; }
  function isCompact() { return compactQuery.matches; }

  // シートの帯の見出し：今のモードとテンプレート
  function syncSheetLabels() {
    if (!els.sheetSummary) return;
    const d = dict();
    const tpl = currentTemplate();
    els.sheetSummary.textContent = [d.modes[app.mode][0], tpl ? tpl.label[app.lang] : ''].filter(Boolean).join(' · ');
    els.sheetToggle.setAttribute('aria-label', `${sheet.state === 'peek' ? d.sheetOpen : d.sheetClose}（${els.sheetSummary.textContent}）`);
  }

  function setHeaderMenu(open) {
    els.header.classList.toggle('is-menu-open', open);
    els.headerMenuBtn.setAttribute('aria-expanded', String(open));
  }

  // 先頭から少しでもスクロールしたら1行に。戻すのはほぼ先頭まで戻ったとき（行数が変わってページが動いても行き来しないように）
  function syncHeaderCompact() {
    let compact = false;
    if (isPhone()) {
      const y = window.scrollY;
      compact = sheet.state !== 'peek' || performance.now() < sheet.holdCompactUntil || (headerCompact ? y > 4 : y > 40);
    }
    if (compact === headerCompact) return;
    headerCompact = compact;
    els.body.classList.toggle('is-header-compact', compact);
    if (!compact) setHeaderMenu(false);
  }

  const isTextField = el => Boolean(el) && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|number|url|email|)$/.test(el.type)));

  // 画面の高さ（キーボードが開いたときは見えている部分）とヘッダー・再生操作の位置から、シートの高さと各段階で見える高さを決める
  function measureSheet() {
    if (!isPhone()) return;
    const vv = window.visualViewport;
    // キーボードの高さは、文字の入力欄にフォーカスがあるときだけ数える
    // （ピンチで拡大したときも見えている範囲は狭くなるが、それはキーボードではない）
    const editing = isTextField(document.activeElement);
    const zoomed = Boolean(vv) && vv.scale > 1.01;
    const viewBottom = vv && editing && !zoomed ? vv.height + vv.offsetTop : window.innerHeight;
    const keyboard = Math.max(0, Math.round(window.innerHeight - viewBottom));
    const viewH = window.innerHeight - keyboard;
    if (window.innerWidth !== sheet.baseWidth) { sheet.baseWidth = window.innerWidth; sheet.baseViewH = 0; }
    sheet.baseViewH = Math.max(sheet.baseViewH, viewH);
    const headerBottom = headerCompact ? Math.max(0, els.header.getBoundingClientRect().bottom) : 64;
    const full = Math.max(200, Math.round(viewH - headerBottom - 8));
    const peek = Math.round(els.sheetBar.getBoundingClientRect().height + safeBottom());
    // half：ページの先頭で、プレビューと再生ボタン・タイムラインが隠れない高さ
    const transportBottom = els.transport.getBoundingClientRect().bottom + window.scrollY;
    const half = Math.round(Math.min(full * 0.72, Math.max(viewH * 0.36, viewH - transportBottom - 10)));
    sheet.full = full;
    sheet.visible = { peek, half: Math.max(peek + 80, half), full };
    // 文字を入力中でキーボードが開いているときは、入力欄が隠れないよう全体まで広げる
    sheet.typing = isTextField(document.activeElement) && els.controlPanel.contains(document.activeElement) && viewH < sheet.baseViewH - 120;
    const style = els.body.style;
    style.setProperty('--sheet-h', `${full}px`);
    style.setProperty('--sheet-kb', `${keyboard}px`);
    style.setProperty('--sheet-peek', `${peek}px`);
    if (!sheet.drag) applySheetY(sheet.visible[sheet.typing ? 'full' : sheet.state]);
  }

  let safeProbe = null;
  function safeBottom() {
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom, 0px);visibility:hidden;pointer-events:none;';
      document.body.appendChild(safeProbe);
    }
    return safeProbe.getBoundingClientRect().height || 0;
  }

  function applySheetY(visibleH) {
    const y = Math.max(0, sheet.full - visibleH);
    els.body.style.setProperty('--sheet-y', `${Math.round(y)}px`);
  }

  function setSheet(state) {
    if (!SHEET_STATES.includes(state)) return;
    const opening = sheet.state === 'peek' && state !== 'peek';
    sheet.state = state;
    els.body.dataset.sheet = state;
    els.sheetToggle.setAttribute('aria-expanded', String(state !== 'peek'));
    // 閉じたシートの中身にはキーボードのフォーカスが入らないようにする
    els.sheetScroll.inert = isPhone() && state === 'peek';
    syncSheetLabels();
    if (!isPhone()) return;
    syncHeaderCompact();
    if (state !== 'peek') setHeaderMenu(false);
    // 開くときはプレビューが見えるようページの先頭へ戻す
    if (opening && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(measureSheet);
  }

  // 帯のドラッグ（マウス・タッチ・ペン共通）。離したときは速さと位置から一番近い段階に止める
  function startSheetDrag(clientY, time) {
    els.controlPanel.classList.add('is-dragging');
    const current = sheet.visible[sheet.typing ? 'full' : sheet.state];
    sheet.drag = { startY: clientY, startVisible: current, lastY: clientY, lastT: time, v: 0, moved: false };
  }

  function moveSheetDrag(clientY, time) {
    const g = sheet.drag;
    if (!g) return;
    const dy = clientY - g.startY;
    if (Math.abs(dy) > 6) g.moved = true;
    const dt = Math.max(1, time - g.lastT);
    g.v = 0.7 * ((clientY - g.lastY) / dt) + 0.3 * g.v;
    g.lastY = clientY;
    g.lastT = time;
    const visible = Math.min(sheet.full, Math.max(sheet.visible.peek, g.startVisible - dy));
    applySheetY(visible);
  }

  function endSheetDrag(clientY) {
    const g = sheet.drag;
    if (!g) return false;
    sheet.drag = null;
    els.controlPanel.classList.remove('is-dragging');
    if (!g.moved) { applySheetY(sheet.visible[sheet.state]); return false; }
    const visible = Math.min(sheet.full, Math.max(sheet.visible.peek, g.startVisible - (clientY - g.startY)));
    let target;
    if (Math.abs(g.v) > 0.45) {
      // すばやく弾いたときは、その向きの次の段階へ
      const order = SHEET_STATES.filter(st => g.v < 0 ? sheet.visible[st] > visible + 4 : sheet.visible[st] < visible - 4);
      target = g.v < 0 ? order[0] : order[order.length - 1];
    }
    if (!target) target = SHEET_STATES.reduce((best, st) => (Math.abs(sheet.visible[st] - visible) < Math.abs(sheet.visible[best] - visible) ? st : best), 'peek');
    if (sheet.typing && target !== 'full') document.activeElement.blur();
    setSheet(target);
    applySheetY(sheet.visible[target]);
    return true;
  }

  function bindPhoneLayout() {
    // 帯：ドラッグで開け閉め。タップは「閉じている⇔半分」の切り替え
    // （少し動かしてからドラッグとして扱う。最初から捕まえるとタップのクリックが帯のボタンに届かないため）
    let press = null;
    let dragEndAt = 0;
    const onPressMove = event => {
      if (!press || event.pointerId !== press.id) return;
      if (!sheet.drag) {
        if (Math.abs(event.clientY - press.y) < 6) return;
        startSheetDrag(press.y, press.t);
      }
      moveSheetDrag(event.clientY, event.timeStamp);
    };
    const onPressEnd = event => {
      if (!press || event.pointerId !== press.id) return;
      press = null;
      window.removeEventListener('pointermove', onPressMove);
      window.removeEventListener('pointerup', onPressEnd);
      window.removeEventListener('pointercancel', onPressEnd);
      if (endSheetDrag(event.clientY)) dragEndAt = performance.now();
    };
    els.sheetBar.addEventListener('pointerdown', event => {
      if (!isPhone() || event.button > 0 || event.target.closest('#sheetExportBtn')) return;
      press = { id: event.pointerId, y: event.clientY, t: event.timeStamp };
      window.addEventListener('pointermove', onPressMove);
      window.addEventListener('pointerup', onPressEnd);
      window.addEventListener('pointercancel', onPressEnd);
    });
    els.sheetToggle.addEventListener('click', () => {
      // ドラッグの直後に続くクリックは無視する
      if (performance.now() - dragEndAt < 400) return;
      setSheet(sheet.state === 'peek' ? 'half' : 'peek');
    });
    // 中身がいちばん上までスクロールされているときは、下へのスワイプでシートを下げる
    let touch = null;
    els.sheetScroll.addEventListener('touchstart', event => {
      if (!isPhone() || event.touches.length !== 1 || sheet.state === 'peek') { touch = null; return; }
      const t = event.touches[0];
      touch = { x: t.clientX, y: t.clientY, atTop: els.sheetScroll.scrollTop <= 0, active: false };
    }, { passive: true });
    els.sheetScroll.addEventListener('touchmove', event => {
      if (!touch || !touch.atTop) return;
      const t = event.touches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      if (!touch.active) {
        if (dy > 10 && dy > Math.abs(dx) * 1.2 && els.sheetScroll.scrollTop <= 0) {
          touch.active = true;
          startSheetDrag(touch.y, event.timeStamp);
        } else if (Math.abs(dy) > 10 || Math.abs(dx) > 10) {
          touch = null;
          return;
        } else return;
      }
      event.preventDefault();
      moveSheetDrag(t.clientY, event.timeStamp);
    }, { passive: false });
    const touchEnd = event => {
      if (touch && touch.active) endSheetDrag(event.changedTouches[0].clientY);
      touch = null;
    };
    els.sheetScroll.addEventListener('touchend', touchEnd);
    els.sheetScroll.addEventListener('touchcancel', touchEnd);

    els.sheetExportBtn.addEventListener('click', () => {
      // 先にヘッダーを1行にしてから位置を測る（スクロールの途中でヘッダーが縮んで行き過ぎないように）
      sheet.holdCompactUntil = performance.now() + 1200;
      setSheet('peek');
      requestAnimationFrame(() => {
        const top = els.exportCard.getBoundingClientRect().top + window.scrollY - els.header.getBoundingClientRect().height - 16;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });
    els.headerMenuBtn.addEventListener('click', () => setHeaderMenu(!els.header.classList.contains('is-menu-open')));
    document.addEventListener('click', event => {
      if (els.header.classList.contains('is-menu-open') && !els.header.contains(event.target)) setHeaderMenu(false);
    });
    // メニューから共有・観測所へ移動したら閉じる
    [els.portalLink, els.shareLink].forEach(link => link.addEventListener('click', () => setHeaderMenu(false)));

    window.addEventListener('scroll', syncHeaderCompact, { passive: true });
    const remeasure = () => requestAnimationFrame(measureSheet);
    window.addEventListener('resize', remeasure);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', remeasure);
    els.controlPanel.addEventListener('focusin', () => setTimeout(() => {
      measureSheet();
      // 入力欄がキーボードやシートの外に隠れないようにする
      if (sheet.typing && isTextField(document.activeElement)) document.activeElement.scrollIntoView({ block: 'nearest' });
    }, 320));
    els.controlPanel.addEventListener('focusout', () => setTimeout(measureSheet, 320));
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(els.header);
    const onChange = () => {
      if (isPhone()) {
        setSheet(sheet.state);
      } else {
        // 広い画面に戻ったら、シート・ヘッダーの指定を外して元の2列の表示にする
        ['--sheet-h', '--sheet-kb', '--sheet-peek', '--sheet-y'].forEach(name => els.body.style.removeProperty(name));
        els.sheetScroll.inert = false;
        setHeaderMenu(false);
        syncHeaderCompact();
      }
      layoutStage();
    };
    if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', onChange);
    else if (phoneQuery.addListener) phoneQuery.addListener(onChange);
    // 短い文言に切り替わる幅をまたいだら、文言を付け直す
    if (compactQuery.addEventListener) compactQuery.addEventListener('change', applyLanguage);
    else if (compactQuery.addListener) compactQuery.addListener(applyLanguage);
    setSheet('peek');
  }

  window.TextApngMakerApi = {
    togglePlay,
    exportApng: () => { exportApng(); return true; },
    exportWebp: () => { exportWebp(); return true; },
    exportStill: () => { exportStill(); return true; },
    setMode: index => setMode(MODES[index]),
    toggleTheme: () => { toggleTheme(); return true; },
    closeDrawers,
    closeMySave: () => closeMySave(true),
    stopPreview: () => { if (view.playing) { pause(); return true; } return false; },
    isExporting: () => view.exporting
  };

  loadState();
  initTheme();
  bindExportOptions();
  bindBatch();
  bindMyTemplates();
  bindEvents();
  setPreviewBg(app.previewBg);
  els.body.dataset.mode = app.mode;
  els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => {
    const on = btn.dataset.mode === app.mode;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  syncTabs();
  applyLanguage();
  bindPhoneLayout();
  layoutStage();
  prepare();
  view.time = view.prepared ? view.prepared.timeline.posterTime : 0;
  scheduleFontLoad(0);
  // 登録したフォントファイルを読み戻したら、一覧（マイフォント）を更新する
  F.restoreSaved().then(loaded => { if (loaded.length && app.tab === 'font') panel.render(app.tab, els.settingsBody); });
  play();
  track('tool_open', { mode: app.mode });
})();
