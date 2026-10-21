/* OBS TRPGサポーター — データの形・レイアウト・URLの組み立て・検証
 * 画面（app.js）とオーバーレイ（overlay.js）の両方から読む。DOMには触らない。 */
(function (global) {
  'use strict';

  const SCHEMA_VERSION = '0.1';
  const CANVAS = { w: 1920, h: 1080 };
  const SOURCE_PREFIX = 'TRPG | ';
  const DEFAULT_ADDRESS = 'ws://127.0.0.1:4455';
  const PUBLIC_OVERLAY_URL = 'https://kumachansteps.github.io/trpg-web-tools/tools/obs-trpg-supporter/overlay.html';
  // OBSのブラウザソースの初期CSS（背景を透明にする）
  const OBS_DEFAULT_CSS = 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }';
  const MAX_PCS = 6;
  const PC_COLORS = ['#9c8ce8', '#e8848c', '#6fc3a0', '#e8b45c', '#6aa8e8', '#c98ad8'];

  /* ---------- ソースの役割 ---------- */

  // url: CCFOLIAのURLのひな形。{roomId} {characterId} を置き換える
  const ROLES = {
    board: { url: 'https://ccfolia.com/rooms/{roomId}', name: 'CCFOLIA Board' },
    background: { url: 'https://ccfolia.com/rooms/{roomId}', name: 'CCFOLIA Background' },
    message: { url: 'https://ccfolia.com/rooms/{roomId}', name: 'Message Box' },
    status: { url: 'https://ccfolia.com/rooms/{roomId}/characters/{characterId}', name: 'Status', needsSlot: true },
    overlay: { url: null, name: 'Overlay', overlay: true },
    discord: { url: null, name: 'Discord Voice', userUrl: true },
    custom: { url: null, name: 'CCFOLIA', userUrl: true }
  };
  const ROLE_IDS = Object.keys(ROLES);

  /* ---------- レイアウト（1920x1080 の座標） ---------- */

  // kind: board / status（slot番号）/ message / portrait / enemy / log / title / scene / card / voice
  const LAYOUTS = {
    standard: [
      { kind: 'title', x: 40, y: 24, w: 900, h: 52 },
      { kind: 'scene', x: 1440, y: 24, w: 440, h: 52 },
      { kind: 'board', x: 40, y: 96, w: 1376, h: 774 },
      { kind: 'status', slot: 0, x: 1440, y: 96, w: 440, h: 180 },
      { kind: 'status', slot: 1, x: 1440, y: 294, w: 440, h: 180 },
      { kind: 'status', slot: 2, x: 1440, y: 492, w: 440, h: 180 },
      { kind: 'status', slot: 3, x: 1440, y: 690, w: 440, h: 180 },
      { kind: 'message', x: 40, y: 890, w: 1840, h: 166 }
    ],
    novel: [
      { kind: 'title', x: 40, y: 24, w: 900, h: 52 },
      { kind: 'scene', x: 1440, y: 24, w: 440, h: 52 },
      { kind: 'status', slot: 0, x: 40, y: 96, w: 240, h: 140 },
      { kind: 'status', slot: 1, x: 40, y: 256, w: 240, h: 140 },
      { kind: 'status', slot: 2, x: 40, y: 416, w: 240, h: 140 },
      { kind: 'status', slot: 3, x: 40, y: 576, w: 240, h: 140 },
      { kind: 'portrait', x: 300, y: 96, w: 1320, h: 620 },
      { kind: 'board', x: 1640, y: 96, w: 240, h: 135 },
      { kind: 'message', x: 160, y: 740, w: 1600, h: 300 }
    ],
    combat: [
      { kind: 'title', x: 40, y: 24, w: 900, h: 52 },
      { kind: 'scene', x: 1312, y: 24, w: 568, h: 52 },
      { kind: 'board', x: 40, y: 96, w: 1248, h: 702 },
      { kind: 'enemy', x: 1312, y: 96, w: 568, h: 250 },
      { kind: 'status', slot: 0, x: 1312, y: 366, w: 568, h: 93 },
      { kind: 'status', slot: 1, x: 1312, y: 479, w: 568, h: 93 },
      { kind: 'status', slot: 2, x: 1312, y: 592, w: 568, h: 93 },
      { kind: 'status', slot: 3, x: 1312, y: 705, w: 568, h: 93 },
      { kind: 'log', x: 40, y: 818, w: 1840, h: 238 }
    ],
    break: [
      { kind: 'card', x: 360, y: 200, w: 1200, h: 600 },
      { kind: 'voice', x: 360, y: 830, w: 1200, h: 190 }
    ]
  };
  const LAYOUT_IDS = Object.keys(LAYOUTS);

  /* ---------- 見た目（オーバーレイの色） ---------- */

  const THEMES = {
    noir: { panel: 'rgba(16, 18, 24, 0.86)', ink: '#f3f1ec', muted: '#b7b2a6', accent: '#d4a24c', frame: 'rgba(212, 162, 76, 0.85)', font: 'sans', glow: false },
    archive: { panel: 'rgba(52, 38, 24, 0.9)', ink: '#f4e8cf', muted: '#d1bc95', accent: '#c4934f', frame: 'rgba(196, 147, 79, 0.9)', font: 'serif', glow: false },
    minimal: { panel: 'rgba(255, 255, 255, 0.9)', ink: '#1f2328', muted: '#59606b', accent: '#59606b', frame: 'rgba(255, 255, 255, 0.85)', font: 'sans', glow: false },
    neon: { panel: 'rgba(12, 8, 28, 0.86)', ink: '#f5f3ff', muted: '#b9b2e0', accent: '#22d3ee', frame: 'rgba(34, 211, 238, 0.9)', font: 'sans', glow: true }
  };
  const THEME_IDS = Object.keys(THEMES);

  /* ---------- 小物 ---------- */

  const clone = value => JSON.parse(JSON.stringify(value));
  const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));
  const str = (value, max = 200) => String(value == null ? '' : value).slice(0, max);
  const toSize = value => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n >= 1 && n <= 8192 ? n : null;
  };

  function codeError(code, params) {
    const error = new Error(code);
    error.code = code;
    error.params = params || {};
    return error;
  }

  // CCFOLIAのルームURL・キャラクターURL・IDのどれを貼っても、IDだけを取り出す
  function parseRoomId(input) {
    const text = String(input || '').trim();
    if (!text) return '';
    const match = text.match(/ccfolia\.com\/rooms\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return /^[A-Za-z0-9_-]+$/.test(text) ? text : null;
  }

  function parseCharacterId(input) {
    const text = String(input || '').trim();
    if (!text) return '';
    const match = text.match(/\/characters\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return /^[A-Za-z0-9_-]+$/.test(text) ? text : null;
  }

  /* ---------- 初期データ ---------- */

  function defaultParticipant(index) {
    return { slot: `PC${index + 1}`, name: '', characterId: '', color: PC_COLORS[index % PC_COLORS.length] };
  }

  function defaultSources() {
    return [
      { inputName: `${SOURCE_PREFIX}CCFOLIA Board`, role: 'board', slot: 0, url: '', cssMode: 'keep', css: '', width: '', height: '' },
      { inputName: `${SOURCE_PREFIX}Status PC1`, role: 'status', slot: 0, url: '', cssMode: 'keep', css: '', width: '', height: '' },
      { inputName: `${SOURCE_PREFIX}Message Box`, role: 'message', slot: 0, url: '', cssMode: 'keep', css: '', width: '', height: '' },
      { inputName: `${SOURCE_PREFIX}Overlay`, role: 'overlay', slot: 0, url: '', cssMode: 'keep', css: '', width: 1920, height: 1080 }
    ];
  }

  function defaultProject() {
    return {
      app: 'obs-trpg-supporter',
      schemaVersion: SCHEMA_VERSION,
      websocket: { address: DEFAULT_ADDRESS },
      ccfolia: { roomId: '' },
      participants: [defaultParticipant(0), defaultParticipant(1), defaultParticipant(2)],
      overlay: { layout: 'standard', theme: 'noir', accent: '', title: '', subtitle: '', scene: '', message: '', resume: '', plates: true },
      sources: defaultSources()
    };
  }

  function sanitizeSource(raw) {
    const role = ROLE_IDS.includes(raw && raw.role) ? raw.role : 'custom';
    return {
      inputName: str(raw && raw.inputName, 256),
      role,
      slot: Math.max(0, Math.min(MAX_PCS - 1, Math.round(Number(raw && raw.slot) || 0))),
      url: str(raw && raw.url, 2048),
      cssMode: raw && raw.cssMode === 'set' ? 'set' : 'keep',
      css: str(raw && raw.css, 200000),
      width: toSize(raw && raw.width) || '',
      height: toSize(raw && raw.height) || ''
    };
  }

  // 保存データ・読み込んだファイルを、いまの形にそろえる
  function normalizeProject(raw) {
    const base = defaultProject();
    if (!raw || typeof raw !== 'object') return base;
    const out = base;
    if (raw.websocket && typeof raw.websocket.address === 'string') out.websocket.address = str(raw.websocket.address, 200);
    if (raw.ccfolia) out.ccfolia.roomId = parseRoomId(raw.ccfolia.roomId) || '';
    if (Array.isArray(raw.participants)) {
      out.participants = raw.participants.slice(0, MAX_PCS).map((p, i) => ({
        slot: `PC${i + 1}`,
        name: str(p && (p.name != null ? p.name : p.displayName), 60),
        characterId: parseCharacterId(p && (p.characterId != null ? p.characterId : p.ccfoliaCharacterId)) || '',
        color: isHex(p && (p.color || p.themeColor)) ? (p.color || p.themeColor) : PC_COLORS[i % PC_COLORS.length]
      }));
    }
    if (raw.overlay && typeof raw.overlay === 'object') {
      const o = raw.overlay;
      out.overlay = {
        layout: LAYOUT_IDS.includes(o.layout) ? o.layout : 'standard',
        theme: THEME_IDS.includes(o.theme) ? o.theme : 'noir',
        accent: isHex(o.accent) ? o.accent : '',
        title: str(o.title, 80),
        subtitle: str(o.subtitle, 120),
        scene: str(o.scene, 60),
        message: str(o.message, 120),
        resume: /^\d{1,2}:\d{2}$/.test(String(o.resume || '')) ? o.resume : '',
        plates: o.plates !== false
      };
    }
    if (Array.isArray(raw.sources)) out.sources = raw.sources.slice(0, 40).map(sanitizeSource);
    return out;
  }

  // Nodeスクリプト用の config.json（update-sources.mjs の形）も読めるようにする
  function fromCliConfig(raw) {
    const project = defaultProject();
    project.websocket.address = str(raw.websocket && raw.websocket.address, 200) || DEFAULT_ADDRESS;
    project.ccfolia.roomId = parseRoomId(raw.ccfolia && raw.ccfolia.roomId) || '';
    project.participants = [];
    const sources = [];
    (raw.sources || []).slice(0, 40).forEach(item => {
      const template = String(item.urlTemplate || '');
      const src = sanitizeSource({ inputName: item.inputName, role: 'custom', url: template, width: item.width, height: item.height });
      if (template === ROLES.board.url) src.role = /message/i.test(src.inputName) ? 'message' : /background/i.test(src.inputName) ? 'background' : 'board';
      else if (template === ROLES.status.url) {
        src.role = 'status';
        let index = project.participants.findIndex(p => p.characterId === parseCharacterId(item.characterId));
        if (index < 0 && project.participants.length < MAX_PCS) {
          index = project.participants.length;
          const p = defaultParticipant(index);
          p.characterId = parseCharacterId(item.characterId) || '';
          project.participants.push(p);
        }
        src.slot = Math.max(0, index);
      } else if (/\/obs-trpg-supporter\/overlay\.html/.test(template)) src.role = 'overlay';
      else if (/^https:\/\/streamkit\.discord\.com\//.test(template)) src.role = 'discord';
      if (src.role !== 'custom' && src.role !== 'discord') src.url = '';
      if (typeof item.css === 'string') { src.cssMode = 'set'; src.css = str(item.css, 200000); }
      sources.push(src);
    });
    if (!project.participants.length) project.participants = [defaultParticipant(0)];
    project.sources = sources;
    return project;
  }

  function importConfig(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sources)) throw codeError('import_invalid');
    const cli = raw.app !== 'obs-trpg-supporter' && raw.sources.some(item => item && 'urlTemplate' in item);
    return cli ? fromCliConfig(raw) : normalizeProject(raw);
  }

  /* ---------- オーバーレイのURL ---------- */

  function overlayParams(project, options = {}) {
    const o = project.overlay;
    const params = new URLSearchParams();
    params.set('layout', o.layout);
    params.set('theme', o.theme);
    if (o.accent) params.set('accent', o.accent);
    if (o.title) params.set('title', o.title);
    if (o.subtitle) params.set('sub', o.subtitle);
    if (o.scene) params.set('scene', o.scene);
    if (o.message) params.set('msg', o.message);
    if (o.resume) params.set('resume', o.resume);
    if (!o.plates) params.set('plates', '0');
    project.participants.forEach(p => {
      params.append('pc', `${(p.name || p.slot).replace(/~/g, '-')}~${p.color}`);
    });
    if (options.lang) params.set('lang', options.lang);
    if (options.guide) params.set('guide', '1');
    return params;
  }

  function overlayUrl(project, base, options) {
    return `${base || PUBLIC_OVERLAY_URL}?${overlayParams(project, options).toString()}`;
  }

  function parseOverlayParams(search) {
    const params = new URLSearchParams(search);
    const layout = LAYOUT_IDS.includes(params.get('layout')) ? params.get('layout') : 'standard';
    const theme = THEME_IDS.includes(params.get('theme')) ? params.get('theme') : 'noir';
    const pcs = params.getAll('pc').slice(0, MAX_PCS).map((value, i) => {
      const [name, color] = String(value).split('~');
      return { name: str(name, 60), color: isHex(color) ? color : PC_COLORS[i % PC_COLORS.length] };
    });
    return {
      layout,
      theme,
      accent: isHex(params.get('accent')) ? params.get('accent') : '',
      title: str(params.get('title'), 80),
      subtitle: str(params.get('sub'), 120),
      scene: str(params.get('scene'), 60),
      message: str(params.get('msg'), 120),
      resume: /^\d{1,2}:\d{2}$/.test(params.get('resume') || '') ? params.get('resume') : '',
      plates: params.get('plates') !== '0',
      pcs,
      lang: ['ja', 'en', 'ko'].includes(params.get('lang')) ? params.get('lang') : '',
      guide: params.get('guide') === '1'
    };
  }

  /* ---------- URLの組み立てと検証 ---------- */

  // 許可するURL: CCFOLIAのルーム、Discord StreamKit、このツールのオーバーレイ
  function checkUrl(url, role, overlayBase) {
    let parsed;
    try { parsed = new URL(url); } catch (error) { throw codeError('url_invalid'); }
    if (parsed.username || parsed.password) throw codeError('url_invalid');
    if (role === 'overlay') {
      const base = new URL(overlayBase || PUBLIC_OVERLAY_URL);
      if (parsed.origin !== base.origin || parsed.pathname !== base.pathname) throw codeError('url_overlay');
      return url;
    }
    if (role === 'discord') {
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'streamkit.discord.com' || !parsed.pathname.startsWith('/overlay/')) throw codeError('url_discord');
      return url;
    }
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'ccfolia.com' || !parsed.pathname.startsWith('/rooms/')) throw codeError('url_ccfolia');
    return url;
  }

  function participantFor(project, source) {
    return project.participants[source.slot] || null;
  }

  // ソース1件の URL を作る。足りない設定があれば codeError を投げる
  function renderUrl(project, source, overlayBase) {
    const role = ROLES[source.role] || ROLES.custom;
    if (role.overlay) return checkUrl(overlayUrl(project, overlayBase), 'overlay', overlayBase);
    const template = role.userUrl ? String(source.url || '').trim() : role.url;
    if (!template) throw codeError(source.role === 'discord' ? 'need_discord_url' : 'need_url');
    let url = template;
    if (url.includes('{roomId}')) {
      if (!project.ccfolia.roomId) throw codeError('need_room');
      url = url.split('{roomId}').join(encodeURIComponent(project.ccfolia.roomId));
    }
    if (url.includes('{characterId}')) {
      const p = participantFor(project, source);
      if (!p) throw codeError('need_pc', { slot: `PC${source.slot + 1}` });
      if (!p.characterId) throw codeError('need_character', { slot: p.slot });
      url = url.split('{characterId}').join(encodeURIComponent(p.characterId));
    }
    if (/\{[^{}]*\}/.test(url)) throw codeError('url_placeholder');
    return checkUrl(url, source.role, overlayBase);
  }

  // OBSへ送る設定（変更する項目だけ）
  function nextSettings(project, source, overlayBase) {
    const next = { url: renderUrl(project, source, overlayBase) };
    if (source.cssMode === 'set') next.css = source.css;
    const w = toSize(source.width);
    const h = toSize(source.height);
    if (w) next.width = w;
    if (h) next.height = h;
    return next;
  }

  // ソース一覧の検証（名前の空・重複）
  function sourceProblems(project) {
    const problems = [];
    const seen = new Set();
    project.sources.forEach((source, index) => {
      const name = source.inputName.trim();
      if (!name) problems.push({ index, code: 'need_name' });
      else if (seen.has(name)) problems.push({ index, code: 'dup_name', params: { name } });
      seen.add(name);
    });
    return problems;
  }

  // ルームIDなどを伏せて表示する
  function maskUrl(url, project) {
    let out = String(url || '');
    const secrets = [project.ccfolia.roomId].concat(project.participants.map(p => p.characterId)).filter(Boolean);
    secrets.forEach(secret => {
      const encoded = encodeURIComponent(secret);
      out = out.split(encoded).join('•'.repeat(Math.min(8, Math.max(4, secret.length))));
    });
    return out;
  }

  /* ---------- 書き出し ---------- */

  // includeSecrets: false のときは、ルームID・キャラクターID・DiscordのURLを空にする（共有・テンプレート用）
  function exportProject(project, includeSecrets) {
    const out = clone(project);
    out.app = 'obs-trpg-supporter';
    out.schemaVersion = SCHEMA_VERSION;
    out.exportedAt = new Date().toISOString();
    if (!includeSecrets) {
      out.ccfolia.roomId = '';
      out.participants.forEach(p => { p.characterId = ''; });
      out.sources.forEach(s => {
        if (s.role === 'discord') s.url = '';
        if (s.role === 'custom') s.url = String(s.url || '').replace(/(ccfolia\.com\/rooms\/)[A-Za-z0-9_-]+/, '$1{roomId}');
      });
    }
    return out;
  }

  // update-sources.mjs 用。ルームIDは入れる（自分のPCだけで使うファイル）
  function exportCliConfig(project) {
    return {
      websocket: { address: project.websocket.address || DEFAULT_ADDRESS, passwordEnv: 'OBS_WEBSOCKET_PASSWORD' },
      ccfolia: { roomId: project.ccfolia.roomId || 'YOUR_ROOM_ID' },
      sources: project.sources.map(source => {
        const role = ROLES[source.role] || ROLES.custom;
        const item = { inputName: source.inputName };
        if (role.overlay) item.urlTemplate = overlayUrl(project, PUBLIC_OVERLAY_URL);
        else item.urlTemplate = role.userUrl ? source.url : role.url;
        if (item.urlTemplate && item.urlTemplate.includes('{characterId}')) {
          const p = participantFor(project, source);
          item.characterId = (p && p.characterId) || 'YOUR_CHARACTER_ID';
        }
        if (source.cssMode === 'set') item.css = source.css;
        if (toSize(source.width)) item.width = toSize(source.width);
        if (toSize(source.height)) item.height = toSize(source.height);
        return item;
      })
    };
  }

  global.OTS = {
    SCHEMA_VERSION,
    CANVAS,
    SOURCE_PREFIX,
    DEFAULT_ADDRESS,
    PUBLIC_OVERLAY_URL,
    OBS_DEFAULT_CSS,
    MAX_PCS,
    PC_COLORS,
    ROLES,
    ROLE_IDS,
    LAYOUTS,
    LAYOUT_IDS,
    THEMES,
    THEME_IDS,
    clone,
    toSize,
    parseRoomId,
    parseCharacterId,
    defaultParticipant,
    defaultSources,
    defaultProject,
    normalizeProject,
    importConfig,
    overlayUrl,
    parseOverlayParams,
    renderUrl,
    nextSettings,
    sourceProblems,
    maskUrl,
    exportProject,
    exportCliConfig
  };
})(typeof window !== 'undefined' ? window : globalThis);
