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
  const { ControlPanel, setPath, FX_LABELS, OPT } = window.TextApngControls;

  const VERSION = 'v1.00';
  const STORAGE_KEY = 'textApngMaker.v1';
  const LANG_KEY = 'textApngMakerLang';
  const THEME_KEY = 'textApngMakerTheme';
  const MAX_FRAMES = 1800;
  const SIZE_GUIDE_BYTES = 5 * 1024 * 1024;
  const MODES = ['message', 'trailer', 'caption'];
  // 保存データの形式（2: 書き出しのループ初期値を「1回再生」に変更、ファイル名をモードごとに保持）
  const STORAGE_SCHEMA = 2;
  const TABS = ['text', 'font', 'motion', 'style', 'layout'];

  const $ = id => document.getElementById(id);
  const els = {
    body: document.body,
    title: $('appTitle'),
    lead: $('appLead'),
    eyebrow: $('appEyebrow'),
    portalLink: $('portalLink'),
    shareLink: $('xShareLink'),
    langButtons: document.querySelectorAll('[data-lang-choice]'),
    langSwitcher: $('languageSwitcher'),
    helpBtn: $('helpBtn'),
    shortcutBtn: $('shortcutBtn'),
    themeBtn: $('themeBtn'),
    helpDrawer: $('helpDrawer'),
    shortcutDrawer: $('shortcutDrawer'),
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
    // 書き換えた文章。メッセージはテンプレートごとに覚え（message: { テンプレートID: { text, subText } }）、
    // トレイラー・場所・時間はテンプレートを切り替えても引き継ぐ（trailer / caption: { text, subText }）
    editedTexts: { message: {}, trailer: {}, caption: {} },
    // 分類ごと（判定はシステムごと）に編集中の場面を持つ（{ モード: { 'combat' / 'dice/coc6' など: scene } }）。今の場面も同じオブジェクトで入る
    groupScenes: {},
    // 分類ごとに最後に開いたシステム（{ dice: 'coc7' }）
    lastSystems: {},
    // fileNames: モードごとの手入力のファイル名（空なら設定から自動入力）
    exportOpts: { fps: 24, loop: 'once', loopCount: 3, color: 'palette', poster: true, trim: false, fileNames: { message: '', trailer: '', caption: '' } },
    previewBg: 'checker',
    loopPreview: true
  };

  const view = {
    renderer: new E.TextRenderer({ resolveFont: id => F.families(id) }),
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

  function loadState() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { saved = null; }
    try {
      const lang = localStorage.getItem(LANG_KEY);
      app.lang = lang === 'en' || lang === 'ja' ? lang : ((navigator.languages && navigator.languages[0]) || navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en';
    } catch (error) { app.lang = 'ja'; }
    MODES.forEach(mode => {
      let s = restoreScene(mode, saved && saved.scenes && saved.scenes[mode]);
      // 分類のあるモードで、今は無いテンプレートの場面（以前のバージョンの保存データ）は最初のテンプレートから始める
      if (P.TEMPLATE_GROUPS[mode] && !templatePlace(mode, s.templateId)) {
        const fresh = P.defaultScene(mode, app.lang);
        Object.assign(fresh, { width: s.width, height: s.height, sizePreset: s.sizePreset, outEnabled: s.outEnabled });
        s = fresh;
      }
      app.scenes[mode] = s;
    });
    if (saved) {
      if (MODES.includes(saved.mode)) app.mode = saved.mode;
      if (TABS.includes(saved.tab)) app.tab = saved.tab;
      if (saved.exportOpts) {
        const { loop, fileName, fileNames, ...rest } = saved.exportOpts;
        Object.assign(app.exportOpts, rest);
        // 旧形式のループ設定（初期値が「ずっとループ」だった頃）は引き継がず、「1回再生」から始める
        if (saved.schema >= STORAGE_SCHEMA && ['once', 'infinite', 'count'].includes(loop)) app.exportOpts.loop = loop;
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
        P.TEMPLATES.message.forEach(tpl => {
          const kept = pickTexts(memos.message && memos.message[tpl.id]);
          if (Object.keys(kept).length) app.editedTexts.message[tpl.id] = kept;
        });
        ['trailer', 'caption'].forEach(mode => { app.editedTexts[mode] = pickTexts(memos[mode]); });
      } else {
        // 書き換えた文章を覚える仕組みより前の保存データ：トレイラー・場所・時間で書き換えていた文章はそのまま引き継ぐ
        ['trailer', 'caption'].forEach(mode => {
          const s = app.scenes[mode];
          const state = P.sampleState(mode, s.text, s.subText);
          if (!state.main) app.editedTexts[mode].text = s.text;
          if (!state.sub && mode === 'caption') app.editedTexts[mode].subText = s.subText;
        });
      }
      const groupScenes = saved.groupScenes && typeof saved.groupScenes === 'object' ? saved.groupScenes : {};
      Object.keys(P.TEMPLATE_GROUPS).forEach(mode => {
        const stored = groupScenes[mode] && typeof groupScenes[mode] === 'object' ? groupScenes[mode] : {};
        Object.keys(stored).forEach(key => {
          const place = stored[key] && templatePlace(mode, stored[key].templateId);
          if (place && place.key === key) groupStore(mode)[key] = restoreScene(mode, stored[key]);
        });
      });
      const lastSystems = saved.lastSystems && typeof saved.lastSystems === 'object' ? saved.lastSystems : {};
      Object.values(P.TEMPLATE_GROUPS).flat().forEach(g => {
        if (g.systems && g.systems.some(sy => sy.id === lastSystems[g.id])) app.lastSystems[g.id] = lastSystems[g.id];
      });
    }
    // 今の場面は、その分類の編集中の場面そのもの
    Object.keys(P.TEMPLATE_GROUPS).forEach(mode => {
      const place = templatePlace(mode, app.scenes[mode].templateId);
      if (place) groupStore(mode)[place.key] = app.scenes[mode];
    });
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
    return s;
  }

  // テンプレートの置き場所（分類と、あればシステム）。key は分類ごとの場面の保存先
  function templatePlace(mode, templateId) {
    const tpl = (P.TEMPLATES[mode] || []).find(t => t.id === templateId);
    if (!tpl || !tpl.group) return null;
    return { group: tpl.group, system: tpl.system || null, key: tpl.system ? `${tpl.group}/${tpl.system}` : tpl.group };
  }

  function groupStore(mode) {
    if (!app.groupScenes[mode]) app.groupScenes[mode] = {};
    return app.groupScenes[mode];
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
          groupScenes: app.groupScenes, lastSystems: app.lastSystems,
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
    els.portalLink.textContent = d.backToPortal;
    els.helpBtn.textContent = d.help;
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
    els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => {
      const [name, desc] = d.modes[btn.dataset.mode];
      btn.querySelector('.mode-name').textContent = name;
      btn.querySelector('.mode-desc').textContent = desc;
    });
    els.templatesLabel.textContent = d.templates;
    els.resetBtn.textContent = app.lang === 'en' ? '↺ Reset' : '↺ 初期化';
    els.resetBtn.title = app.lang === 'en' ? 'Reset this mode to the defaults' : 'このモードを初期状態に戻す';
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
    Array.from(els.loopSelect.options).forEach(o => { o.textContent = d.loopOptions[o.value]; });
    els.loopCountLabel.textContent = d.loopCount;
    els.colorLabel.textContent = d.colorMode;
    Array.from(els.colorSelect.options).forEach(o => { o.textContent = d.colorOptions[o.value]; });
    els.posterText.textContent = d.poster;
    els.trimText.textContent = d.trim;
    els.fileNameLabel.textContent = d.fileName;
    els.fileNameAutoBadge.textContent = d.fileNameAuto;
    els.fileNameAutoBtn.textContent = d.fileNameReset;
    els.fileNameAutoBtn.title = d.fileNameResetTitle;
    syncFileName();
    els.exportApngBtn.textContent = d.exportApng;
    els.exportPngBtn.textContent = d.exportPng;
    els.exportZipBtn.textContent = d.exportZip;
    els.cancelBtn.textContent = d.cancel;
    els.resultTitle.textContent = d.resultTitle;
    els.downloadLink.textContent = d.download;
    els.clearResultBtn.textContent = d.clear;
    els.footerTitle.textContent = d.footerTitle;
    els.footerNote1.innerHTML = d.footerNote1;
    els.footerNote2.innerHTML = d.footerNote2;
    syncThemeButton();
    syncPlayButton();
    renderTemplates();
    panel.render(app.tab, els.settingsBody);
    updateInfo();
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

  // 書き換えた文章を覚える。メッセージは選んでいるテンプレートの分として、トレイラー・場所・時間はテンプレートをまたいで共通に。
  // 空のメインテキストは覚えない。メッセージでは見本と同じ文章も覚えない（どちらも、テンプレートを選ぶと見本に戻る）
  function rememberText(s, key, value) {
    const emptyMain = key === 'text' && !String(value).trim();
    if (s.mode !== 'message') {
      if (emptyMain) delete app.editedTexts[s.mode][key];
      else app.editedTexts[s.mode][key] = value;
      return;
    }
    const tpl = P.TEMPLATES.message.find(t => t.id === s.templateId);
    if (!tpl) return;
    const memo = app.editedTexts.message[tpl.id] || {};
    if (emptyMain || value === P.sampleText(tpl, key, app.lang)) delete memo[key];
    else memo[key] = value;
    if (Object.keys(memo).length) app.editedTexts.message[tpl.id] = memo;
    else delete app.editedTexts.message[tpl.id];
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
        const scenes = MODES.map(m => app.scenes[m]).concat(...Object.values(app.groupScenes).map(store => Object.values(store)));
        new Set(scenes).forEach(s => {
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
    const tasks = [F.load(s.fontId, s.weight, `${s.text}${s.mode === 'trailer' ? '' : s.subText}`)];
    if (s.mode !== 'trailer' && s.subText) {
      tasks.push(F.load(s.subFontId === 'same' ? s.fontId : s.subFontId, s.subWeight, s.subText));
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
    const availH = Math.max(160, Math.min(window.innerHeight * 0.6, 620));
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
    els.timeLabel.textContent = `${view.time.toFixed(2)} / ${duration.toFixed(2)}${app.lang === 'en' ? ' s' : ' 秒'}`;
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

  function setMode(mode) {
    if (!MODES.includes(mode) || view.exporting) return false;
    app.mode = mode;
    els.modeTabs.querySelectorAll('[data-mode]').forEach(btn => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
    els.body.dataset.mode = mode;
    renderTemplates();
    panel.render(app.tab, els.settingsBody);
    view.renderer.invalidateSprites();
    invalidate();
    layoutStage();
    scheduleFontLoad(0);
    saveState();
    restartPreview();
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
    return templatePlace(app.mode, scene().templateId) || { group: groups[0].id, system: null, key: groups[0].id };
  }

  // 分類（とシステム）を切り替えて、その分類の場面をプレビューする。
  // 分類ごとに編集中の場面を持ち、初めて開く分類は最初のテンプレートから始める。画像サイズと退場の有無は引き継ぐ
  function showPlace(groupId, systemId) {
    if (view.exporting) return;
    const mode = app.mode;
    const group = (P.TEMPLATE_GROUPS[mode] || []).find(g => g.id === groupId);
    if (!group) return;
    let system = null;
    if (group.systems) {
      system = (group.systems.find(sy => sy.id === systemId) || group.systems.find(sy => sy.id === app.lastSystems[groupId]) || group.systems[0]).id;
      app.lastSystems[groupId] = system;
    }
    const key = system ? `${groupId}/${system}` : groupId;
    const current = scene();
    const from = currentPlace();
    if (from.key === key) {
      renderTemplates();
      saveState();
      return;
    }
    const store = groupStore(mode);
    store[from.key] = current;
    let next = store[key];
    if (!next) {
      next = P.defaultScene(mode, app.lang);
      fillTemplate(next, P.TEMPLATES[mode].find(tpl => tpl.group === groupId && (!system || tpl.system === system)));
      store[key] = next;
    }
    Object.assign(next, { width: current.width, height: current.height, sizePreset: current.sizePreset, outEnabled: current.outEnabled });
    app.scenes[mode] = next;
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
    const system = systems ? (place.system || app.lastSystems[group] || systems[0].id) : null;
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-chip';
      btn.dataset.template = tpl.id;
      // アイコンは線画の SVG（システム別のチップはアイコンなし）
      const icon = tpl.icon ? ICONS.create(tpl.icon, 'template-icon') : null;
      if (icon) btn.appendChild(icon);
      const name = document.createElement('span');
      name.textContent = tpl.label[app.lang];
      btn.appendChild(name);
      const on = s.templateId === tpl.id;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.addEventListener('click', () => applyTemplate(tpl));
      els.templateStrip.appendChild(btn);
    });
    reserveTemplateRows();
    if (refocus) {
      const target = lists.map(list => list.querySelector(refocus)).find(Boolean);
      if (target) target.focus();
    }
  }

  // チップが1段で足りる分類（シーン・時間など）でも2段分の高さを確保し、分類を切り替えても下の設定タブが上下しないようにする。
  // チップの高さは画面の拡大率で枠線の太さが変わるため、実際に並んだチップから測る
  function reserveTemplateRows() {
    const strip = els.templateStrip;
    strip.style.minHeight = '';
    const chip = strip.querySelector('.template-chip');
    const height = chip ? chip.getBoundingClientRect().height : 0;
    const gap = parseFloat(window.getComputedStyle(strip).rowGap) || 0;
    strip.style.minHeight = height > 0 ? `${(height * 2 + gap).toFixed(2)}px` : '';
  }

  // テンプレートを場面に当てはめる。文章は新しいテンプレートの見本にしたうえで、書き換えた文章があれば戻す
  // （メッセージはそのテンプレートで書き換えた文章、トレイラー・場所・時間はテンプレートをまたいで共通の文章）
  function fillTemplate(s, tpl) {
    P.applyTemplate(s, tpl, app.lang);
    const memo = (app.mode === 'message' ? app.editedTexts.message[tpl.id] : app.editedTexts[app.mode]) || {};
    if (typeof memo.text === 'string') s.text = memo.text;
    if (typeof memo.subText === 'string') s.subText = memo.subText;
    s.mode = app.mode;
  }

  function applyTemplate(tpl) {
    fillTemplate(scene(), tpl);
    renderTemplates();
    view.renderer.invalidateSprites();
    invalidate();
    layoutStage();
    panel.refresh();
    scheduleFontLoad(0);
    saveState();
    restartPreview();
    toast(msg().templateApplied(tpl.label[app.lang]), 'success', 2200);
    track('template_apply', { mode: app.mode, template: tpl.id });
  }

  function resetMode() {
    if (!window.confirm(msg().storageReset)) return;
    app.scenes[app.mode] = P.defaultScene(app.mode, app.lang);
    app.editedTexts[app.mode] = {};
    app.groupScenes[app.mode] = {};
    (P.TEMPLATE_GROUPS[app.mode] || []).forEach(g => { delete app.lastSystems[g.id]; });
    const place = templatePlace(app.mode, scene().templateId);
    if (place) groupStore(app.mode)[place.key] = scene();
    app.exportOpts.fileNames[app.mode] = '';
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

  // 長い文章は16文字まで（句読点で区切れるならそこまで）
  function shortTitle(text) {
    const line = String(text || '').split('\n').map(l => l.trim()).find(Boolean) || '';
    const chars = E.graphemes(line);
    if (chars.length <= 16) return line;
    const head = chars.slice(0, 16);
    for (let i = head.length - 1; i >= 3; i--) {
      if (/[、。，．！？!?,.]/.test(head[i])) return head.slice(0, i).join('').trim();
    }
    return head.join('').trim();
  }

  // 左の設定（文章・登場の動き／表示方法・退場の有無）からファイル名の候補を作る
  function suggestFileName() {
    const s = scene();
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
    if (!scroll && s.outEnabled === false) parts.push(d.fileNoExit);
    return sanitizeFileName(parts.filter(Boolean).join('_'));
  }

  function baseFileName() {
    const custom = sanitizeFileName(app.exportOpts.fileNames[app.mode]);
    if (custom) return custom.replace(/\.(png|apng|zip)$/i, '');
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
    [els.exportApngBtn, els.exportPngBtn, els.exportZipBtn].forEach(btn => { btn.disabled = on; });
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

  async function exportApng() {
    if (view.exporting) return false;
    const s = P.clone(scene());
    if (!hasVisibleText(s)) { toast(msg().emptyText, 'warning'); return false; }
    if (!C.isCompressionSupported()) { toast(msg().unsupported, 'error', 6000); els.status.textContent = msg().unsupported; return false; }
    const opts = { ...app.exportOpts };
    pause();
    setExporting(true);
    clearResult();
    const started = performance.now();
    try {
      await ensureFonts(s);
      const renderer = new E.TextRenderer({ resolveFont: id => F.families(id) });
      const prepared = renderer.prepare(s);
      const duration = prepared.timeline.duration;
      const fps = Math.max(1, Number(opts.fps) || 24);
      const count = exportFrameCount(duration, fps);
      if (count > MAX_FRAMES) {
        toast(msg().tooManyFrames(count, MAX_FRAMES), 'error', 5200);
        els.status.textContent = msg().tooManyFrames(count, MAX_FRAMES);
        return false;
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
      const usePalette = opts.color !== 'full';
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
            setProgress((i + 1) / count * analysisShare, msg().analyzing(i + 1, count));
            await yieldToUi();
          }
        }
        if (opts.poster) analyzer.add(grab(prepared.timeline.posterTime));
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
      const encoder = new C.ApngEncoder({ width: outW, height: outH, fps, loops, quantizer });
      if (opts.poster) await encoder.setDefaultImage(shape(grab(prepared.timeline.posterTime)));
      for (let i = 0; i < count; i++) {
        checkCancel();
        await encoder.addFrame(shape(grab(timeAt(i))));
        if (i % 2 === 0 || i === count - 1) {
          setProgress(analysisShare + (i + 1) / count * (1 - analysisShare), msg().encoding(i + 1, count));
          await yieldToUi();
        }
      }
      checkCancel();
      const blob = encoder.finish();
      const name = `${baseFileName()}.png`;
      const colors = quantizer ? msg().colorsPalette(quantizer.isLossless) : msg().colorsFull;
      const loopText = loops === 0 ? msg().loopInfinite : (loops === 1 ? msg().loopOnce : msg().loopCount(loops));
      showResult(blob, name, msg().resultMeta(formatBytes(blob.size), outW, outH, count, encoder.frameCount, colors, loopText), true);
      setProgress(1, msg().done);
      toast(msg().done, 'success');
      track('export_apng', {
        mode: s.mode, in_fx: s.inFx, out_fx: s.outEnabled === false ? 'none' : s.outFx, hold_fx: s.holdFx, fps, color_mode: usePalette ? 'palette' : 'full',
        frames: count, size_kb: Math.round(blob.size / 1024), over_limit: blob.size > SIZE_GUIDE_BYTES, seconds: Math.round((performance.now() - started) / 100) / 10
      });
      return true;
    } catch (error) {
      if (error && error.code === 'CANCELLED') {
        els.status.textContent = msg().cancelled;
        toast(msg().cancelled, 'warning');
      } else if (error && error.code === 'COMPRESSION_UNSUPPORTED') {
        els.status.textContent = msg().unsupported;
        toast(msg().unsupported, 'error', 6000);
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

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
  }

  async function exportStill() {
    if (view.exporting) return false;
    const s = P.clone(scene());
    if (!hasVisibleText(s)) { toast(msg().emptyText, 'warning'); return false; }
    await ensureFonts(s);
    const renderer = new E.TextRenderer({ resolveFont: id => F.families(id) });
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
    showResult(blob, name, `${formatBytes(blob.size)} ・ ${s.width} × ${s.height} ・ PNG`, false);
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
      const renderer = new E.TextRenderer({ resolveFont: id => F.families(id) });
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
      showResult(zip, `${base}_frames.zip`, `${formatBytes(zip.size)} ・ ${count} PNG ・ ${fps}FPS`, false);
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

  function showResult(blob, name, meta, isApng) {
    clearResult();
    view.resultUrl = URL.createObjectURL(blob);
    els.downloadLink.href = view.resultUrl;
    els.downloadLink.download = name;
    els.downloadLink.dataset.name = name;
    els.resultMeta.textContent = `${name} ・ ${meta}`;
    const isImage = blob.type === 'image/png';
    els.resultImage.hidden = !isImage;
    if (isImage) {
      els.resultImage.src = view.resultUrl;
      els.resultImage.alt = name;
    }
    if (isApng) {
      const over = blob.size > SIZE_GUIDE_BYTES;
      els.resultNote.textContent = over ? msg().overLimit(formatBytes(blob.size)) : msg().withinLimit;
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

  function toggleDrawer(drawer) {
    const open = drawer.hidden;
    [els.helpDrawer, els.shortcutDrawer].forEach(d => { d.hidden = true; });
    drawer.hidden = !open;
    els.helpBtn.setAttribute('aria-expanded', String(!els.helpDrawer.hidden));
    els.shortcutBtn.setAttribute('aria-expanded', String(!els.shortcutDrawer.hidden));
  }

  function closeDrawers() {
    const wasOpen = !els.helpDrawer.hidden || !els.shortcutDrawer.hidden;
    els.helpDrawer.hidden = true;
    els.shortcutDrawer.hidden = true;
    els.helpBtn.setAttribute('aria-expanded', 'false');
    els.shortcutBtn.setAttribute('aria-expanded', 'false');
    return wasOpen;
  }

  /* ================= 初期化 ================= */

  function setExportLoop(loop) {
    app.exportOpts.loop = loop;
    els.loopSelect.value = loop;
    els.loopCountWrap.hidden = loop !== 'count';
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
      app.lang = btn.dataset.langChoice === 'en' ? 'en' : 'ja';
      try { localStorage.setItem(LANG_KEY, app.lang); } catch (error) { /* noop */ }
      applyLanguage();
    }));
    els.helpBtn.addEventListener('click', () => toggleDrawer(els.helpDrawer));
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

  window.TextApngMakerApi = {
    togglePlay,
    exportApng: () => { exportApng(); return true; },
    exportStill: () => { exportStill(); return true; },
    setMode: index => setMode(MODES[index]),
    toggleTheme: () => { toggleTheme(); return true; },
    closeDrawers,
    stopPreview: () => { if (view.playing) { pause(); return true; } return false; },
    isExporting: () => view.exporting
  };

  loadState();
  initTheme();
  bindExportOptions();
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
  layoutStage();
  prepare();
  view.time = view.prepared ? view.prepared.timeline.posterTime : 0;
  scheduleFontLoad(0);
  // 登録したフォントファイルを読み戻したら、一覧（マイフォント）を更新する
  F.restoreSaved().then(loaded => { if (loaded.length && app.tab === 'font') panel.render(app.tab, els.settingsBody); });
  play();
  track('tool_open', { mode: app.mode });
})();
