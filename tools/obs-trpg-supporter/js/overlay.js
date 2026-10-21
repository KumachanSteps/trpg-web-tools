/* OBS TRPGサポーター — オーバーレイの描画
 * URLのパラメーター（model.js の overlayUrl が作る）を読み、1920x1080 の舞台に枠・タイトル・名札を置く。
 * 枠の中は透明にしておき、CCFOLIAなどのブラウザソースをOBS側で同じ位置に重ねて使う。 */
(function () {
  'use strict';

  const M = window.OTS;
  const stage = document.getElementById('stage');

  const TEXT = {
    ja: {
      breakTitle: '休憩中', breakMsg: 'しばらくお待ちください', resume: '再開予定 {time}',
      kinds: { board: '盤面', status: 'ステータス', message: 'メッセージ', portrait: '立ち絵', enemy: 'エネミー', log: '戦闘ログ', title: 'タイトル', scene: 'シーン名', card: '待機画面', voice: 'Discord通話' }
    },
    en: {
      breakTitle: 'On break', breakMsg: 'We will be right back', resume: 'Back at {time}',
      kinds: { board: 'Board', status: 'Status', message: 'Messages', portrait: 'Portrait', enemy: 'Enemy', log: 'Combat log', title: 'Title', scene: 'Scene', card: 'Break card', voice: 'Discord voice' }
    },
    ko: {
      breakTitle: '휴식 중', breakMsg: '잠시만 기다려 주세요', resume: '재개 예정 {time}',
      kinds: { board: '보드', status: '스테이터스', message: '메시지', portrait: '스탠딩', enemy: '에너미', log: '전투 로그', title: '타이틀', scene: '장면 이름', card: '대기 화면', voice: 'Discord 통화' }
    }
  };
  const GUIDE_COLORS = { board: '#6aa8e8', status: '#9c8ce8', message: '#6fc3a0', portrait: '#e8848c', enemy: '#e86a5c', log: '#6fc3a0', title: '#e8b45c', scene: '#e8b45c', card: '#6aa8e8', voice: '#5865f2' };

  function detectLang(param) {
    if (param) return param;
    const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'ja').toLowerCase();
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('ja')) return 'ja';
    return 'en';
  }

  function rgba(hex, alpha) {
    const n = parseInt(String(hex).slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function place(node, r) {
    node.style.left = `${r.x}px`;
    node.style.top = `${r.y}px`;
    node.style.width = `${r.w}px`;
    node.style.height = `${r.h}px`;
    return node;
  }

  const cfg = M.parseOverlayParams(location.search);
  const lang = detectLang(cfg.lang);
  const T = TEXT[lang] || TEXT.ja;
  const theme = M.THEMES[cfg.theme];
  const accent = cfg.accent || theme.accent;

  function applyTheme() {
    const s = stage.style;
    s.setProperty('--panel', theme.panel);
    s.setProperty('--ink', theme.ink);
    s.setProperty('--muted', theme.muted);
    s.setProperty('--accent', accent);
    s.setProperty('--accent-soft', rgba(accent, 0.45));
    s.setProperty('--frame', cfg.accent ? rgba(cfg.accent, 0.85) : theme.frame);
    stage.classList.toggle('is-serif', theme.font === 'serif');
    stage.classList.toggle('is-glow', theme.glow);
    document.documentElement.lang = lang;
    document.body.classList.toggle('is-preview', cfg.guide);
  }

  let clockNode = null;

  function updateClock() {
    if (!clockNode) return;
    const now = new Date();
    clockNode.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function renderRegion(r) {
    if (r.kind === 'title') {
      if (!cfg.title && !cfg.subtitle) return null;
      const box = place(el('div', 'region title-box'), r);
      if (cfg.title) box.appendChild(el('span', 'title-main', cfg.title));
      if (cfg.subtitle) box.appendChild(el('span', 'title-sub', cfg.subtitle));
      return box;
    }
    if (r.kind === 'scene') {
      if (!cfg.scene) return null;
      return place(el('div', 'region scene-box', cfg.scene), r);
    }
    if (r.kind === 'card') {
      const card = place(el('div', 'region break-card'), r);
      card.appendChild(el('div', 'break-title', cfg.title || T.breakTitle));
      if (cfg.subtitle) card.appendChild(el('div', 'break-sub', cfg.subtitle));
      card.appendChild(el('div', 'break-line'));
      card.appendChild(el('div', 'break-msg', cfg.message || T.breakMsg));
      if (cfg.resume) card.appendChild(el('div', 'break-resume', T.resume.replace('{time}', cfg.resume)));
      clockNode = card.appendChild(el('div', 'break-clock'));
      updateClock();
      return card;
    }
    if (r.kind === 'voice') return null;
    if (r.kind === 'status') {
      const pc = cfg.pcs[r.slot];
      if (!pc) return null;
      const box = place(el('div', 'region frame status-frame is-thin'), r);
      box.style.setProperty('--pc', pc.color);
      if (cfg.plates && pc.name) box.appendChild(el('div', 'plate', pc.name));
      return box;
    }
    return place(el('div', `region frame${r.w < 400 ? ' is-thin' : ''}`), r);
  }

  function renderGuide(r) {
    if (r.kind === 'status' && !cfg.pcs[r.slot] && cfg.pcs.length) return null;
    // 文字が入っているタイトル・シーン名は、目安の名前が文字と重なるので出さない
    if ((r.kind === 'title' && (cfg.title || cfg.subtitle)) || (r.kind === 'scene' && cfg.scene)) return null;
    const box = place(el('div', `region guide${r.w < 360 || r.h < 120 ? ' is-small' : ''}`), r);
    const color = r.kind === 'status' && cfg.pcs[r.slot] ? cfg.pcs[r.slot].color : GUIDE_COLORS[r.kind];
    box.style.setProperty('--g-fill', rgba(color, 0.3));
    box.style.setProperty('--g-line', rgba(color, 0.9));
    const name = r.kind === 'status' ? `${T.kinds.status} PC${r.slot + 1}` : T.kinds[r.kind];
    box.appendChild(el('span', 'guide-name', name));
    if (r.h >= 70) box.appendChild(el('span', 'guide-size', `${r.w}×${r.h}  (${r.x}, ${r.y})`));
    return box;
  }

  function render() {
    applyTheme();
    stage.textContent = '';
    clockNode = null;
    const regions = M.LAYOUTS[cfg.layout];
    if (cfg.layout === 'break') stage.appendChild(el('div', 'break-bg'));
    // 目安は枠の下に敷く
    if (cfg.guide) regions.forEach(r => { if (r.kind !== 'card') { const g = renderGuide(r); if (g) stage.appendChild(g); } });
    regions.forEach(r => { const node = renderRegion(r); if (node) stage.appendChild(node); });
  }

  function fit() {
    const scale = Math.min(window.innerWidth / M.CANVAS.w, window.innerHeight / M.CANVAS.h) || 1;
    stage.style.transform = `scale(${scale})`;
  }

  render();
  fit();
  window.addEventListener('resize', fit);
  setInterval(updateClock, 15000);
})();
