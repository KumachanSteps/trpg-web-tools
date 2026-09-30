/* TRPG室内図メーカー — 描画（テーマ・部屋・壁・ドア/窓・家具・文字） */
(function (global) {
  'use strict';

  const M = global.IMM;
  const TAU = Math.PI * 2;
  const SANS = '"Hiragino Sans", "Noto Sans JP", "Noto Sans KR", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';
  const SERIF = '"Hiragino Mincho ProN", "Noto Serif JP", "Noto Serif KR", "Yu Mincho", serif';

  /* ---------- テーマ（構造は変えず見た目だけ切り替える） ---------- */

  const THEMES = {
    clean: {
      name: { ja: 'カラー', en: 'Color', ko: '컬러' },
      bg: '#ffffff', grid: 'rgba(44, 76, 120, 0.07)', gridMajor: 'rgba(44, 76, 120, 0.15)',
      wall: '#2e323a', rail: '#7b828e', label: '#2e323a', sub: '#737b88', halo: 'rgba(255,255,255,0.85)',
      fills: {
        living: '#fbf1df', bedroom: '#e8f2e1', washitsu: '#eef0d4', kitchen: '#fbe8d6', wet: '#e1eef8', hall: '#f1efea',
        storage: '#e8e4dc', public: '#f7eed9', office: '#ebe8f5', medical: '#dff1ee', special: '#eee2f3', danger: '#f6dedb',
        garage: '#e6e7ea', balcony: '#edf0f3', garden: '#e1efd6', porch: '#ece8e0'
      },
      patternLine: 'rgba(60, 70, 90, 0.12)',
      furn: {
        fill: '#ffffff', line: '#5a616d', soft: '#eceef2', dark: '#8b919c', softLine: '#a4aab4', water: '#d6eaf8',
        green: '#bcdcab', greenLine: '#6f9d5c', red: '#d9534f', blood: 'rgba(140, 22, 22, 0.78)', yellow: '#f5c542',
        ritual: '#7b2d8e', ritualSoft: '#e7d3ee', flame: '#ffb13d', chalk: '#4b5563', rug: '#f3e6d5', wood: '#e9d3b1',
        blue: '#3a78d8', accentLine: '#5a616d'
      },
      door: '#3b404a', arc: '#8a919c', window: '#5a616d', glass: '#9ccbee', gm: '#8b3fd1', font: SANS
    },
    mono: {
      name: { ja: 'モノクロ図面', en: 'Monochrome', ko: '흑백 도면' },
      bg: '#ffffff', grid: 'rgba(0,0,0,0.06)', gridMajor: 'rgba(0,0,0,0.13)',
      wall: '#111111', rail: '#555555', label: '#111111', sub: '#555555', halo: 'rgba(255,255,255,0.9)',
      fills: {},
      defaultFill: '#ffffff',
      outdoorFill: '#ffffff',
      patternLine: 'rgba(0,0,0,0.1)',
      furn: {
        fill: '#ffffff', line: '#333333', soft: '#f0f0f0', dark: '#999999', softLine: '#9a9a9a', water: '#ffffff',
        green: '#ffffff', greenLine: '#444444', red: '#444444', blood: 'rgba(40,40,40,0.55)', yellow: '#ffffff',
        ritual: '#222222', ritualSoft: '#eeeeee', flame: '#999999', chalk: '#333333', rug: '#f6f6f6', wood: '#f2f2f2',
        blue: '#444444', accentLine: '#333333'
      },
      door: '#111111', arc: '#666666', window: '#333333', glass: '#ffffff', gm: '#7a3bb8', font: SANS
    },
    blueprint: {
      name: { ja: 'ブループリント', en: 'Blueprint', ko: '청사진' },
      bg: '#1b4a86', grid: 'rgba(255,255,255,0.08)', gridMajor: 'rgba(255,255,255,0.17)',
      wall: '#f2f7ff', rail: '#bcd3f5', label: '#f2f7ff', sub: '#bcd3f5', halo: 'rgba(27,74,134,0.85)',
      fills: {}, defaultFill: 'rgba(255,255,255,0.05)', outdoorFill: 'rgba(255,255,255,0.02)',
      patternLine: 'rgba(255,255,255,0.12)',
      furn: {
        fill: 'rgba(255,255,255,0.06)', line: '#dbe8ff', soft: 'rgba(255,255,255,0.14)', dark: 'rgba(255,255,255,0.35)', softLine: '#9fbce6',
        water: 'rgba(255,255,255,0.12)', green: 'rgba(255,255,255,0.1)', greenLine: '#cfe0fa', red: '#ffb4b4', blood: 'rgba(255,160,160,0.45)',
        yellow: 'rgba(255,255,255,0.2)', ritual: '#ffd1f0', ritualSoft: 'rgba(255,255,255,0.12)', flame: '#ffe8a8', chalk: '#ffffff',
        rug: 'rgba(255,255,255,0.05)', wood: 'rgba(255,255,255,0.1)', blue: 'rgba(255,255,255,0.25)', accentLine: '#dbe8ff'
      },
      door: '#f2f7ff', arc: '#9fbce6', window: '#dbe8ff', glass: 'rgba(255,255,255,0.35)', gm: '#ffd36b', font: SANS
    },
    paper: {
      name: { ja: '古びた図面', en: 'Old paper', ko: '낡은 도면' },
      bg: '#efe3c6', grid: 'rgba(96, 70, 40, 0.08)', gridMajor: 'rgba(96, 70, 40, 0.16)',
      wall: '#4a3826', rail: '#7d6446', label: '#3f2f1f', sub: '#7d6446', halo: 'rgba(239,227,198,0.85)',
      fills: {
        living: '#e9d9b6', bedroom: '#e3dab5', washitsu: '#e6dcae', kitchen: '#ead3ad', wet: '#dcd8c0', hall: '#ebdfc2',
        storage: '#ddd0b0', public: '#e9d6b0', office: '#e0d6bb', medical: '#dcdcc0', special: '#e0cdb8', danger: '#e2c3ad',
        garage: '#dcd2bb', balcony: '#e7dcc0', garden: '#d9dcb2', porch: '#e3d7bb'
      },
      patternLine: 'rgba(96, 70, 40, 0.14)',
      furn: {
        fill: '#f3e9d2', line: '#5d4830', soft: '#e2d3b3', dark: '#9c8566', softLine: '#9c8566', water: '#e2dcc4',
        green: '#cfd3a3', greenLine: '#6f7040', red: '#8e3b2a', blood: 'rgba(110, 30, 20, 0.7)', yellow: '#e9c87a',
        ritual: '#6b2a2a', ritualSoft: '#dcc4ac', flame: '#d9922c', chalk: '#5d4830', rug: '#e6d2ac', wood: '#dcc198',
        blue: '#5d6f80', accentLine: '#5d4830'
      },
      door: '#4a3826', arc: '#8a7152', window: '#5d4830', glass: '#d9d6c0', gm: '#8e3b8a', font: SERIF
    },
    horror: {
      name: { ja: 'ホラー調査', en: 'Horror', ko: '호러 조사' },
      bg: '#16151a', grid: 'rgba(255,255,255,0.04)', gridMajor: 'rgba(255,255,255,0.08)',
      wall: '#d8d0c3', rail: '#8d867b', label: '#e9e2d6', sub: '#a39b8f', halo: 'rgba(22,21,26,0.85)',
      fills: {
        living: '#2a2729', bedroom: '#262a28', washitsu: '#2b2a24', kitchen: '#2d2724', wet: '#232830', hall: '#242326',
        storage: '#211f21', public: '#2b2826', office: '#25242b', medical: '#212a2a', special: '#2e2230', danger: '#3a1f1f',
        garage: '#222224', balcony: '#1e1e22', garden: '#1d231c', porch: '#201f22'
      },
      patternLine: 'rgba(255,255,255,0.05)',
      furn: {
        fill: '#34313a', line: '#b1a99c', soft: '#3f3b43', dark: '#5e5862', softLine: '#7e776d', water: '#2f3a44',
        green: '#2f3b2c', greenLine: '#6f7f66', red: '#a33', blood: 'rgba(150, 20, 20, 0.85)', yellow: '#c9a33c',
        ritual: '#c43c3c', ritualSoft: '#4a2a2e', flame: '#ffb13d', chalk: '#e9e2d6', rug: '#352f33', wood: '#4a3c32',
        blue: '#5271a3', accentLine: '#b1a99c'
      },
      door: '#d8d0c3', arc: '#8d867b', window: '#b1a99c', glass: '#3c4855', gm: '#e05d9b', font: SERIF
    }
  };

  function roomFill(theme, room) {
    if (room.color) return room.color;
    const cat = M.CAT[room.cat] || {};
    if (theme.fills[room.cat]) return theme.fills[room.cat];
    if (cat.outdoor && theme.outdoorFill) return theme.outdoorFill;
    return theme.defaultFill || '#ffffff';
  }

  /* ---------- 文字 ---------- */

  function haloText(c, text, x, y, color, halo, lineWidth) {
    if (halo) {
      c.strokeStyle = halo;
      c.lineWidth = lineWidth;
      c.lineJoin = 'round';
      c.strokeText(text, x, y);
    }
    c.fillStyle = color;
    c.fillText(text, x, y);
  }

  function verticalText(c, text, x, y, size, color, halo, lineWidth) {
    const chars = Array.from(text);
    const total = chars.length * size * 1.02;
    let yy = y - total / 2 + size / 2;
    chars.forEach(ch => {
      // 長音記号は縦書きで回す
      if (/[ー〜～―\-]/.test(ch)) {
        c.save();
        c.translate(x, yy);
        c.rotate(Math.PI / 2);
        haloText(c, ch, 0, 0, color, halo, lineWidth);
        c.restore();
      } else {
        haloText(c, ch, x, yy, color, halo, lineWidth);
      }
      yy += size * 1.02;
    });
  }

  /* ---------- 部屋の模様 ---------- */

  function drawPattern(c, room, theme, lw) {
    const cat = M.CAT[room.cat] || {};
    const p = cat.pattern;
    if (!p) return;
    c.save();
    c.beginPath();
    c.rect(room.x, room.y, room.w, room.h);
    c.clip();
    c.strokeStyle = theme.patternLine;
    c.lineWidth = lw * 0.8;
    if (p === 'tile') {
      c.beginPath();
      for (let x = room.x + 0.5; x < room.x + room.w; x += 0.5) { c.moveTo(x, room.y); c.lineTo(x, room.y + room.h); }
      for (let y = room.y + 0.5; y < room.y + room.h; y += 0.5) { c.moveTo(room.x, y); c.lineTo(room.x + room.w, y); }
      c.stroke();
    } else if (p === 'deck') {
      c.beginPath();
      if (room.w >= room.h) for (let y = room.y + 0.5; y < room.y + room.h; y += 0.5) { c.moveTo(room.x, y); c.lineTo(room.x + room.w, y); }
      else for (let x = room.x + 0.5; x < room.x + room.w; x += 0.5) { c.moveTo(x, room.y); c.lineTo(x, room.y + room.h); }
      c.stroke();
    } else if (p === 'tatami') {
      drawTatami(c, room, lw);
    } else if (p === 'grass') {
      c.strokeStyle = theme.patternLine;
      c.beginPath();
      let s = (room.x * 73856093) ^ (room.y * 19349663);
      const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const count = Math.floor(room.w * room.h * 0.45);
      for (let i = 0; i < count; i++) {
        const x = room.x + rnd() * room.w, y = room.y + rnd() * room.h;
        c.moveTo(x - 0.08, y + 0.06); c.lineTo(x, y - 0.08); c.lineTo(x + 0.08, y + 0.06);
      }
      c.stroke();
    } else if (p === 'stone') {
      c.beginPath();
      for (let y = room.y, row = 0; y < room.y + room.h; y += 1, row++) {
        c.moveTo(room.x, y); c.lineTo(room.x + room.w, y);
        for (let x = room.x + (row % 2 ? 0.75 : 0); x < room.x + room.w; x += 1.5) { c.moveTo(x, y); c.lineTo(x, y + 1); }
      }
      c.stroke();
    }
    c.restore();
  }

  /* 畳（1枚 = 約0.91×1.82m）を部屋に合わせて敷く。縦横を交互にして「祝儀敷き」風に */
  function drawTatami(c, room, lw) {
    const mat = 1.82, half = 0.91;
    const cols = Math.max(1, Math.round((room.w * M.CELL_M) / half));
    const rows = Math.max(1, Math.round((room.h * M.CELL_M) / half));
    const cw = room.w / cols, ch = room.h / rows;
    const used = new Set();
    c.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        if (used.has(`${q},${r}`)) continue;
        const horizontal = ((Math.floor(r / 2) + q) % 2 === 0);
        if (horizontal && q + 1 < cols && !used.has(`${q + 1},${r}`)) {
          used.add(`${q},${r}`); used.add(`${q + 1},${r}`);
          c.rect(room.x + q * cw, room.y + r * ch, cw * 2, ch);
        } else if (r + 1 < rows && !used.has(`${q},${r + 1}`)) {
          used.add(`${q},${r}`); used.add(`${q},${r + 1}`);
          c.rect(room.x + q * cw, room.y + r * ch, cw, ch * 2);
        } else {
          used.add(`${q},${r}`);
          c.rect(room.x + q * cw, room.y + r * ch, cw, ch);
        }
      }
    }
    c.lineWidth = lw * 0.9;
    c.stroke();
    void mat;
  }

  /* ---------- 壁 ---------- */

  function drawRun(c, run, theme, lw, editor) {
    if (run.kind === 'zone') {
      if (!editor) return;
      c.save();
      c.strokeStyle = theme.rail;
      c.globalAlpha = 0.5;
      c.lineWidth = lw;
      c.setLineDash([lw * 4, lw * 4]);
      c.beginPath();
      if (run.o === 'h') { c.moveTo(run.a, run.c); c.lineTo(run.b, run.c); } else { c.moveTo(run.c, run.a); c.lineTo(run.c, run.b); }
      c.stroke();
      c.restore();
      return;
    }
    const info = M.WALL[run.kind] || M.WALL.int;
    const t = info.t;
    const a = run.a - (run.capA ? t / 2 : 0);
    const b = run.b + (run.capB ? t / 2 : 0);
    if (run.kind === 'fence') {
      c.save();
      c.strokeStyle = theme.rail;
      c.lineWidth = lw * 1.2;
      c.setLineDash([lw * 5, lw * 3]);
      c.beginPath();
      if (run.o === 'h') { c.moveTo(a, run.c); c.lineTo(b, run.c); } else { c.moveTo(run.c, a); c.lineTo(run.c, b); }
      c.stroke();
      c.restore();
      return;
    }
    if (run.kind === 'bars') {
      // 鉄格子：細い横木に丸い格子を等間隔に並べる
      c.save();
      c.strokeStyle = theme.wall;
      c.fillStyle = theme.wall;
      c.lineWidth = lw * 0.8;
      c.beginPath();
      if (run.o === 'h') { c.moveTo(a, run.c); c.lineTo(b, run.c); } else { c.moveTo(run.c, a); c.lineTo(run.c, b); }
      c.stroke();
      const n = Math.max(1, Math.round((b - a) / 0.3));
      for (let i = 0; i <= n; i++) {
        const p = a + ((b - a) * i) / n;
        c.beginPath();
        if (run.o === 'h') c.arc(p, run.c, t * 0.5, 0, Math.PI * 2); else c.arc(run.c, p, t * 0.5, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      return;
    }
    if (run.kind === 'rail') {
      c.save();
      c.strokeStyle = theme.rail;
      c.lineWidth = lw * 0.9;
      const d = t / 2;
      c.beginPath();
      if (run.o === 'h') { c.moveTo(a, run.c - d); c.lineTo(b, run.c - d); c.moveTo(a, run.c + d); c.lineTo(b, run.c + d); }
      else { c.moveTo(run.c - d, a); c.lineTo(run.c - d, b); c.moveTo(run.c + d, a); c.lineTo(run.c + d, b); }
      c.stroke();
      c.restore();
      return;
    }
    if (run.kind === 'glass') {
      c.save();
      c.fillStyle = theme.glass;
      c.strokeStyle = theme.window;
      c.lineWidth = lw * 0.8;
      if (run.o === 'h') { c.fillRect(a, run.c - t / 2, b - a, t); c.strokeRect(a, run.c - t / 2, b - a, t); }
      else { c.fillRect(run.c - t / 2, a, t, b - a); c.strokeRect(run.c - t / 2, a, t, b - a); }
      c.restore();
      return;
    }
    c.fillStyle = theme.wall;
    if (run.kind === 'broken') {
      // 崩れた壁：途切れ途切れにして端をギザギザにする
      let s = Math.floor(run.a * 131 + run.c * 71) >>> 0;
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      let pos = a;
      while (pos < b) {
        const len = Math.min(b - pos, 0.6 + rnd() * 1.4);
        const gap = rnd() < 0.35 ? 0.25 + rnd() * 0.5 : 0;
        c.beginPath();
        const tt = t * (0.55 + rnd() * 0.45);
        if (run.o === 'h') {
          c.moveTo(pos, run.c - tt / 2); c.lineTo(pos + len, run.c - t / 2 + rnd() * 0.08);
          c.lineTo(pos + len - rnd() * 0.12, run.c + t / 2); c.lineTo(pos + rnd() * 0.12, run.c + tt / 2);
        } else {
          c.moveTo(run.c - tt / 2, pos); c.lineTo(run.c - t / 2 + rnd() * 0.08, pos + len);
          c.lineTo(run.c + t / 2, pos + len - rnd() * 0.12); c.lineTo(run.c + tt / 2, pos + rnd() * 0.12);
        }
        c.closePath();
        c.fill();
        pos += len + gap;
      }
      return;
    }
    if (run.o === 'h') c.fillRect(a, run.c - t / 2, b - a, t);
    else c.fillRect(run.c - t / 2, a, t, b - a);
  }

  function drawDiagonalWall(c, w, theme, lw) {
    const info = M.WALL[w.kind] || M.WALL.int;
    c.save();
    c.lineCap = 'square';
    if (w.kind === 'fence' || w.kind === 'rail') {
      c.strokeStyle = theme.rail;
      c.lineWidth = lw * 1.2;
      if (w.kind === 'fence') c.setLineDash([lw * 5, lw * 3]);
    } else if (w.kind === 'glass') {
      c.strokeStyle = theme.glass;
      c.lineWidth = info.t;
    } else {
      c.strokeStyle = theme.wall;
      c.lineWidth = info.t;
    }
    c.beginPath();
    c.moveTo(w.x1, w.y1);
    c.lineTo(w.x2, w.y2);
    c.stroke();
    c.restore();
  }

  /* ---------- ドア・窓 ---------- */

  function arcBetween(c, cx, cy, r, from, to) {
    let delta = to - from;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    c.beginPath();
    c.arc(cx, cy, r, from, from + delta, delta < 0);
    c.stroke();
  }

  /* 片開きの扉（ヒンジ位置・開く側・長さ） */
  function swingDoor(c, o, hingeAtStart, len, start, theme, lw, broken) {
    const s = o.side || 1;
    if (o.o === 'h') {
      const hx = hingeAtStart ? start : start + len;
      const fx = hingeAtStart ? start + len : start;
      const leafAngle = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      const jambAngle = fx > hx ? 0 : Math.PI;
      c.strokeStyle = theme.arc;
      c.lineWidth = lw * 0.8;
      c.setLineDash([lw * 3, lw * 2.5]);
      if (!broken) arcBetween(c, hx, o.y, len, leafAngle, jambAngle);
      c.setLineDash([]);
      c.strokeStyle = theme.door;
      c.lineWidth = lw * 1.7;
      c.beginPath();
      if (broken) {
        const ang = leafAngle + (jambAngle - leafAngle) * 0.35;
        c.moveTo(hx + Math.cos(ang) * 0.2, o.y + Math.sin(ang) * 0.2);
        c.lineTo(hx + Math.cos(ang) * len, o.y + Math.sin(ang) * len);
      } else {
        c.moveTo(hx, o.y);
        c.lineTo(hx, o.y + s * len);
      }
      c.stroke();
    } else {
      const hy = hingeAtStart ? start : start + len;
      const fy = hingeAtStart ? start + len : start;
      const leafAngle = s > 0 ? 0 : Math.PI;
      const jambAngle = fy > hy ? Math.PI / 2 : -Math.PI / 2;
      c.strokeStyle = theme.arc;
      c.lineWidth = lw * 0.8;
      c.setLineDash([lw * 3, lw * 2.5]);
      if (!broken) arcBetween(c, o.x, hy, len, leafAngle, jambAngle);
      c.setLineDash([]);
      c.strokeStyle = theme.door;
      c.lineWidth = lw * 1.7;
      c.beginPath();
      if (broken) {
        const ang = leafAngle + (jambAngle - leafAngle) * 0.35;
        c.moveTo(o.x + Math.cos(ang) * 0.2, hy + Math.sin(ang) * 0.2);
        c.lineTo(o.x + Math.cos(ang) * len, hy + Math.sin(ang) * len);
      } else {
        c.moveTo(o.x, hy);
        c.lineTo(o.x + s * len, hy);
      }
      c.stroke();
    }
  }

  /* 開口部の線方向ローカル座標系: u = 線に沿う方向、v = 線に垂直（side 方向が +） */
  function withLocal(c, o, fn) {
    c.save();
    if (o.o === 'h') c.translate(o.x, o.y);
    else { c.translate(o.x, o.y); c.rotate(Math.PI / 2); }
    fn();
    c.restore();
  }

  function drawOpening(c, o, t, theme, lw, opts) {
    const kind = o.kind;
    const len = o.len;
    const gmView = !opts.playerView;
    c.save();
    if (o.gm || kind === 'secret') {
      if (!gmView) { c.restore(); return; }
    }
    // 窓
    if (M.OPEN[kind] && M.OPEN[kind].group === 'window') {
      withLocal(c, o, () => {
        c.fillStyle = theme.bg === 'transparent' ? '#ffffff' : theme.bg;
        c.fillRect(0, -t / 2, len, t);
        c.strokeStyle = theme.window;
        c.lineWidth = lw * 0.8;
        c.strokeRect(0, -t / 2, len, t);
        if (kind === 'window2') {
          c.beginPath();
          c.moveTo(0, -t * 0.12); c.lineTo(len * 0.56, -t * 0.12);
          c.moveTo(len * 0.44, t * 0.12); c.lineTo(len, t * 0.12);
          c.stroke();
        } else if (kind === 'brokenwin') {
          c.beginPath();
          c.moveTo(0, 0);
          const n = Math.max(4, Math.round(len * 3));
          for (let i = 1; i <= n; i++) c.lineTo((len / n) * i, (i % 2 ? 1 : -1) * t * 0.3);
          c.stroke();
        } else {
          c.beginPath();
          c.moveTo(0, 0); c.lineTo(len, 0);
          c.stroke();
        }
        if (kind === 'barred') {
          c.lineWidth = lw * 1.3;
          c.strokeStyle = theme.door;
          c.beginPath();
          for (let u = 0.25; u < len; u += 0.3) { c.moveTo(u, -t * 0.9); c.lineTo(u, t * 0.9); }
          c.stroke();
        }
        if (kind === 'boarded') {
          // 板を打ち付けた窓：窓の上に板を1枚渡し、斜めの木目を入れる
          const bh = t * 1.5;
          c.fillStyle = theme.furn.wood;
          c.strokeStyle = theme.door;
          c.lineWidth = lw * 0.8;
          c.fillRect(-0.1, -bh / 2, len + 0.2, bh);
          c.strokeRect(-0.1, -bh / 2, len + 0.2, bh);
          c.save();
          c.beginPath();
          c.rect(-0.1, -bh / 2, len + 0.2, bh);
          c.clip();
          c.lineWidth = lw * 0.6;
          c.beginPath();
          for (let u = -bh; u < len + bh; u += 0.35) { c.moveTo(u, bh / 2); c.lineTo(u + bh, -bh / 2); }
          c.stroke();
          c.restore();
        }
      });
      c.restore();
      return;
    }
    if (kind === 'open') {
      if (opts.editor) {
        withLocal(c, o, () => {
          c.strokeStyle = theme.rail;
          c.globalAlpha = 0.45;
          c.lineWidth = lw * 0.8;
          c.setLineDash([lw * 2, lw * 3]);
          c.beginPath();
          c.moveTo(0, 0); c.lineTo(len, 0);
          c.stroke();
        });
      }
      c.restore();
      return;
    }
    if (kind === 'hole') {
      drawHole(c, o, t, theme, lw);
      c.restore();
      return;
    }
    if (kind === 'secret') {
      c.globalAlpha = 0.9;
      const ghost = { ...theme, door: theme.gm, arc: theme.gm };
      withLocal(c, o, () => {
        c.strokeStyle = theme.gm;
        c.lineWidth = lw * 0.9;
        c.setLineDash([lw * 2.5, lw * 2]);
        c.strokeRect(0, -t / 2, len, t);
        c.setLineDash([]);
      });
      swingDoor(c, o, !o.hinge, len, o.o === 'h' ? o.x : o.y, ghost, lw, false);
      c.restore();
      return;
    }
    const start = o.o === 'h' ? o.x : o.y;
    if (kind === 'door' || kind === 'locked' || kind === 'broken') {
      swingDoor(c, o, !o.hinge, len, start, theme, lw, kind === 'broken');
      if (kind === 'locked') {
        const cx = o.o === 'h' ? o.x + len / 2 : o.x;
        const cy = o.o === 'h' ? o.y : o.y + len / 2;
        drawLock(c, cx, cy, Math.max(0.28, t * 0.9), theme);
      }
    } else if (kind === 'door2') {
      swingDoor(c, o, true, len / 2, start, theme, lw, false);
      swingDoor(c, o, false, len / 2, start + len / 2, theme, lw, false);
    } else if (kind === 'sliding' || kind === 'sliding2' || kind === 'auto') {
      withLocal(c, o, () => {
        const s = o.side || 1;
        const pt = Math.max(t * 0.28, 0.07);
        c.fillStyle = kind === 'auto' ? theme.glass : theme.furn.fill;
        c.strokeStyle = theme.door;
        c.lineWidth = lw * 0.9;
        if (kind === 'sliding') {
          const x0 = o.hinge ? len * 0.08 : 0;
          c.fillRect(x0, -pt / 2 + s * pt * 0.4, len * 0.92, pt);
          c.strokeRect(x0, -pt / 2 + s * pt * 0.4, len * 0.92, pt);
          c.lineWidth = lw * 0.7;
          c.beginPath();
          const ay = s * (t / 2 + 0.14);
          const dir = o.hinge ? -1 : 1;
          const ax0 = len / 2 - dir * len * 0.2, ax1 = len / 2 + dir * len * 0.2;
          c.moveTo(ax0, ay); c.lineTo(ax1, ay);
          c.moveTo(ax1 - dir * 0.12, ay - 0.08); c.lineTo(ax1, ay); c.lineTo(ax1 - dir * 0.12, ay + 0.08);
          c.stroke();
        } else {
          c.fillRect(0, -pt, len * 0.55, pt);
          c.strokeRect(0, -pt, len * 0.55, pt);
          c.fillRect(len * 0.45, 0, len * 0.55, pt);
          c.strokeRect(len * 0.45, 0, len * 0.55, pt);
          if (kind === 'auto') {
            c.strokeStyle = theme.arc;
            c.lineWidth = lw * 0.7;
            c.setLineDash([lw * 2, lw * 2]);
            c.strokeRect(-0.1, -len * 0.35, len + 0.2, len * 0.7);
            c.setLineDash([]);
          }
        }
      });
    } else if (kind === 'folding') {
      withLocal(c, o, () => {
        const s = o.side || 1;
        c.strokeStyle = theme.door;
        c.lineWidth = lw * 1.1;
        const panels = len >= 2.4 ? 2 : 1;
        const pw = len / panels;
        for (let i = 0; i < panels; i++) {
          c.beginPath();
          c.moveTo(pw * i + 0.05, 0);
          c.lineTo(pw * i + pw / 2, s * pw * 0.42);
          c.lineTo(pw * (i + 1) - 0.05, 0);
          c.stroke();
        }
      });
    } else if (kind === 'shutter') {
      withLocal(c, o, () => {
        c.strokeStyle = theme.door;
        c.lineWidth = lw * 0.8;
        c.setLineDash([lw * 3, lw * 2]);
        c.beginPath();
        c.moveTo(0, 0); c.lineTo(len, 0);
        c.stroke();
        c.setLineDash([]);
        c.strokeRect(0, -Math.max(t * 0.2, 0.05), len, Math.max(t * 0.4, 0.1));
      });
    }
    c.restore();
  }

  /* 壁の穴：両端をギザギザに崩し、まわりに瓦礫を散らす */
  function drawHole(c, o, t, theme, lw) {
    let s = Math.floor((o.x * 97 + o.y * 131) * 4) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    withLocal(c, o, () => {
      const len = o.len;
      c.fillStyle = theme.wall;
      [[0, 1], [len, -1]].forEach(([u0, dir]) => {
        c.beginPath();
        c.moveTo(u0, -t / 2);
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
          const v = -t / 2 + (t / steps) * i;
          c.lineTo(u0 + dir * (0.08 + rnd() * 0.32), v);
        }
        c.lineTo(u0, t / 2);
        c.closePath();
        c.fill();
      });
      c.strokeStyle = theme.furn.line;
      c.lineWidth = lw * 0.6;
      for (let i = 0; i < Math.max(4, Math.round(len * 3)); i++) {
        const u = 0.2 + rnd() * (len - 0.4);
        const v = (rnd() - 0.5) * (t + 1.1);
        const r = 0.06 + rnd() * 0.14;
        c.beginPath();
        const k = 4 + Math.floor(rnd() * 2);
        for (let j = 0; j < k; j++) {
          const a = (j / k) * TAU + rnd() * 0.6;
          const px = u + Math.cos(a) * r, py = v + Math.sin(a) * r;
          if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.closePath();
        c.fillStyle = i % 2 ? theme.furn.dark : theme.furn.soft;
        c.fill();
        c.stroke();
      }
    });
  }

  function drawLock(c, x, y, size, theme) {
    c.save();
    c.translate(x, y);
    c.fillStyle = theme.furn.yellow === '#ffffff' ? '#ffffff' : '#f2b01e';
    c.strokeStyle = '#3a2a00';
    c.lineWidth = size * 0.12;
    c.beginPath();
    c.arc(0, -size * 0.2, size * 0.28, Math.PI, 0);
    c.stroke();
    c.fillRect(-size * 0.42, -size * 0.2, size * 0.84, size * 0.62);
    c.strokeRect(-size * 0.42, -size * 0.2, size * 0.84, size * 0.62);
    c.restore();
  }

  /* ---------- 家具 ---------- */

  function furnStyle(theme, lw, item) {
    const S = { ...theme.furn, lw, wall: theme.wall, font: theme.font };
    if (item && item.color) S.fill = item.color;
    return S;
  }

  function drawItem(c, item, theme, lw, opts) {
    const asset = M.ASSET[item.t];
    if (!asset) return;
    const local = M.itemLocalSize(item);
    const S = furnStyle(theme, lw, item);
    c.save();
    if (item.gm && opts.editor) c.globalAlpha = 0.72;
    c.translate(item.x + item.w / 2, item.y + item.h / 2);
    c.rotate(((item.rot || 0) * Math.PI) / 180);
    if (item.flip) c.scale(-1, 1);
    c.translate(-local.w / 2, -local.h / 2);
    c.lineWidth = lw;
    c.strokeStyle = S.line;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    asset.draw(c, S, local.w, local.h, item);
    c.restore();
    if (item.gm && opts.editor) {
      c.save();
      c.strokeStyle = theme.gm;
      c.lineWidth = lw;
      c.setLineDash([lw * 2, lw * 2]);
      c.strokeRect(item.x - 0.08, item.y - 0.08, item.w + 0.16, item.h + 0.16);
      c.restore();
    }
    if (item.label && !asset.labelInside) {
      const size = Math.max(0.36, Math.min(0.55, Math.min(item.w, item.h) * 0.4));
      c.save();
      c.font = `700 ${size}px ${theme.font}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      haloText(c, item.label, item.x + item.w / 2, item.y + item.h / 2, theme.label, theme.halo, size * 0.3);
      c.restore();
    }
  }

  /* ---------- 部屋ラベル ---------- */

  function roomName(room, opts) {
    if (opts.hideNames) return '';
    if (opts.playerView && room.plName) return room.plName;
    return room.name || '';
  }

  function labelMetrics(c, room, opts, theme) {
    const name = roomName(room, opts);
    const size = M.sizeText(room, opts.showSize, opts.lang);
    if (!name && !size) return null;
    let fs = Math.max(0.46, Math.min(0.68, Math.min(room.w, room.h) * 0.16 + 0.3));
    c.font = `800 ${fs}px ${theme.font}`;
    let width = c.measureText(name).width;
    let vertical = false;
    let rotated = false;
    const avail = room.w - 0.5;
    if (width > avail) {
      const chars = Array.from(name).length;
      const tall = room.h > room.w * 1.3;
      // 日本語・韓国語は縦書き、英語などは90度回して書く
      const cjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(name);
      const fsH = Math.max(0.34, fs * (avail / width));
      if (tall && cjk && chars * fs * 1.02 < room.h - 0.5) vertical = true;
      else if (tall && !cjk && Math.min(fs, fs * ((room.h - 0.5) / width)) > fsH) {
        rotated = true;
        fs = Math.max(0.34, Math.min(fs, fs * ((room.h - 0.5) / width)));
        c.font = `800 ${fs}px ${theme.font}`;
        width = c.measureText(name).width;
      } else {
        fs = fsH;
        c.font = `800 ${fs}px ${theme.font}`;
        width = c.measureText(name).width;
      }
    }
    const cx = room.x + room.w / 2 + (room.lx || 0);
    const cy = room.y + room.h / 2 + (room.ly || 0);
    const sizeFs = fs * 0.72;
    let box;
    if (rotated) {
      const ww = fs + (size ? sizeFs * 1.2 : 0);
      box = { x: cx - ww / 2 - 0.1, y: cy - Math.max(width, 1) / 2 - 0.15, w: ww + 0.2, h: Math.max(width, 1) + 0.3 };
    } else if (vertical) {
      const hh = Array.from(name).length * fs * 1.02;
      box = { x: cx - fs * 0.7, y: cy - hh / 2, w: fs * 1.4, h: hh + (size ? sizeFs * 1.3 : 0) };
    } else {
      const hh = fs + (size ? sizeFs * 1.2 : 0);
      box = { x: cx - Math.max(width, 1) / 2 - 0.15, y: cy - hh / 2 - 0.1, w: Math.max(width, 1) + 0.3, h: hh + 0.2 };
    }
    return { name, size, fs, sizeFs, vertical, rotated, cx, cy, box };
  }

  function drawRoomLabel(c, room, theme, opts) {
    if (room.hideLabel) return;
    const m = labelMetrics(c, room, opts, theme);
    if (!m) return;
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `800 ${m.fs}px ${theme.font}`;
    const halo = theme.halo;
    if (m.rotated) {
      c.translate(m.cx, m.cy);
      c.rotate(-Math.PI / 2);
      const nameY = m.size ? -m.sizeFs * 0.55 : 0;
      if (m.name) haloText(c, m.name, 0, nameY, theme.label, halo, m.fs * 0.28);
      if (m.size) {
        c.font = `700 ${m.sizeFs}px ${theme.font}`;
        haloText(c, m.size, 0, m.name ? m.fs * 0.55 : 0, theme.sub, halo, m.sizeFs * 0.28);
      }
    } else if (m.vertical) {
      verticalText(c, m.name, m.cx, m.cy - (m.size ? m.sizeFs * 0.6 : 0), m.fs, theme.label, halo, m.fs * 0.28);
      if (m.size) {
        c.font = `700 ${m.sizeFs}px ${theme.font}`;
        haloText(c, m.size, m.cx, m.box.y + m.box.h - m.sizeFs * 0.5, theme.sub, halo, m.sizeFs * 0.28);
      }
    } else {
      const nameY = m.size ? m.cy - m.sizeFs * 0.55 : m.cy;
      if (m.name) haloText(c, m.name, m.cx, nameY, theme.label, halo, m.fs * 0.28);
      if (m.size) {
        c.font = `700 ${m.sizeFs}px ${theme.font}`;
        haloText(c, m.size, m.cx, m.name ? m.cy + m.fs * 0.55 : m.cy, theme.sub, halo, m.sizeFs * 0.28);
      }
    }
    c.restore();
  }

  function drawText(c, t, theme, opts) {
    const size = t.size || 0.7;
    c.save();
    c.font = `${t.bold === false ? 600 : 800} ${size}px ${theme.font}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (t.gm && opts.editor) c.globalAlpha = 0.75;
    const lines = String(t.text || '').split('\n');
    lines.forEach((ln, i) => {
      const y = t.y + (i - (lines.length - 1) / 2) * size * 1.25;
      haloText(c, ln, t.x, y, t.color || (t.gm ? theme.gm : theme.label), theme.halo, size * 0.3);
    });
    c.restore();
  }

  function textBox(c, t, theme) {
    const size = t.size || 0.7;
    c.save();
    c.font = `${t.bold === false ? 600 : 800} ${size}px ${theme.font}`;
    const lines = String(t.text || '').split('\n');
    const width = Math.max(0.8, ...lines.map(l => c.measureText(l).width));
    c.restore();
    const h = lines.length * size * 1.25;
    return { x: t.x - width / 2 - 0.1, y: t.y - h / 2, w: width + 0.2, h };
  }

  /* ---------- 1フロア分の描画 ---------- */

  function lineWidth(zoom) { return Math.max(1.1 / 24, 0.75 / zoom); }

  function drawGrid(c, rect, theme, zoom) {
    const x0 = Math.floor(rect.x), x1 = Math.ceil(rect.x + rect.w);
    const y0 = Math.floor(rect.y), y1 = Math.ceil(rect.y + rect.h);
    const px = 1 / zoom;
    const step = zoom < 7 ? 4 : zoom < 12 ? 2 : 1;
    c.lineWidth = px;
    c.strokeStyle = theme.grid;
    c.beginPath();
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { if (x % 2) { c.moveTo(x, y0); c.lineTo(x, y1); } }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { if (y % 2) { c.moveTo(x0, y); c.lineTo(x1, y); } }
    c.stroke();
    c.strokeStyle = theme.gridMajor;
    c.beginPath();
    for (let x = Math.ceil(x0 / 2) * 2; x <= x1; x += Math.max(2, step)) { c.moveTo(x, y0); c.lineTo(x, y1); }
    for (let y = Math.ceil(y0 / 2) * 2; y <= y1; y += Math.max(2, step)) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
  }

  /**
   * floor: フロアデータ / opts: { theme, zoom, lang, showSize, hideNames, playerView, editor, grid, viewRect, ghost }
   * ctx は「1単位 = 1マス」に変換済みであること。
   */
  function drawFloor(c, floorIn, opts) {
    const theme = typeof opts.theme === 'string' ? THEMES[opts.theme] || THEMES.clean : opts.theme;
    const floor = M.visibleFloor(floorIn, opts.playerView);
    const lw = lineWidth(opts.zoom);
    if (opts.viewRect && opts.background !== false) {
      c.fillStyle = theme.bg;
      c.fillRect(opts.viewRect.x, opts.viewRect.y, opts.viewRect.w, opts.viewRect.h);
    }
    if (opts.grid && opts.viewRect) drawGrid(c, opts.viewRect, theme, opts.zoom);

    // 部屋の床
    floor.rooms.forEach(room => {
      c.fillStyle = roomFill(theme, room);
      c.fillRect(room.x, room.y, room.w, room.h);
      drawPattern(c, room, theme, lw);
    });

    // 下の階（うっすら表示）
    if (opts.ghost) {
      // PL表示ではGM専用の部屋・家具を下の階からも除く
      const ghost = M.visibleFloor(opts.ghost, opts.playerView);
      const g = M.computeWalls(ghost, { playerView: opts.playerView });
      c.save();
      c.globalAlpha = 0.14;
      g.runs.forEach(run => drawRun(c, run, { ...theme, wall: theme.gm, rail: theme.gm }, lw, false));
      ghost.items.forEach(item => {
        if (item.t === 'stairs' || item.t === 'stairs_u' || item.t === 'spiral' || item.t === 'elevator') drawItem(c, item, theme, lw, { editor: false });
      });
      c.restore();
    }

    // 敷物・血痕などの下に敷くもの → 家具
    const under = floor.items.filter(i => M.ASSET[i.t] && M.ASSET[i.t].under);
    const over = floor.items.filter(i => !(M.ASSET[i.t] && M.ASSET[i.t].under));
    if (!opts.hideItems) {
      under.forEach(item => drawItem(c, item, theme, lw, opts));
      over.forEach(item => drawItem(c, item, theme, lw, opts));
    }

    // 壁
    const walls = M.computeWalls(floor, { playerView: opts.playerView });
    walls.runs.forEach(run => drawRun(c, run, theme, lw, opts.editor));
    walls.diagonal.forEach(w => drawDiagonalWall(c, w, theme, lw));

    // ドア・窓
    floor.openings.forEach(o => {
      const t = (M.WALL[walls.openingKind.get(o.id)] || M.WALL.int).t;
      drawOpening(c, o, t, theme, lw, opts);
    });

    // GM専用の部屋はGM表示で斜線
    if (!opts.playerView) {
      floor.rooms.filter(r => r.gm).forEach(room => {
        c.save();
        c.beginPath();
        c.rect(room.x, room.y, room.w, room.h);
        c.clip();
        c.strokeStyle = theme.gm;
        c.globalAlpha = 0.28;
        c.lineWidth = lw;
        c.beginPath();
        for (let d = -room.h; d < room.w; d += 0.6) { c.moveTo(room.x + d, room.y + room.h); c.lineTo(room.x + d + room.h, room.y); }
        c.stroke();
        c.restore();
      });
    }

    // ラベル
    if (!opts.hideLabels) {
      floor.rooms.forEach(room => drawRoomLabel(c, room, theme, opts));
      floor.texts.forEach(t => drawText(c, t, theme, opts));
    }
    return walls;
  }

  /* ---------- 書き出し ---------- */

  function exportBounds(floors, playerView) {
    let box = null;
    floors.forEach(f => {
      const b = M.floorBounds(M.visibleFloor(f, playerView));
      if (!b) return;
      if (!box) box = { ...b };
      else {
        const x2 = Math.max(box.x + box.w, b.x + b.w), y2 = Math.max(box.y + box.h, b.y + b.h);
        box.x = Math.min(box.x, b.x); box.y = Math.min(box.y, b.y);
        box.w = x2 - box.x; box.h = y2 - box.y;
      }
    });
    return box;
  }

  /**
   * floors を 1枚の画像に描く（複数なら横に並べ、長くなりすぎるときは折り返す。フロア名を上に書く）
   * opts: { theme, px (1マスのピクセル数), lang, showSize, hideNames, playerView, grid, transparent, margin, titles }
   */
  function renderImage(floors, opts) {
    const theme = THEMES[opts.theme] || THEMES.clean;
    const margin = opts.margin == null ? 2 : opts.margin;
    const px = opts.px || 32;
    const boxes = floors.map(f => M.floorBounds(M.visibleFloor(f, opts.playerView)) || { x: 0, y: 0, w: 10, h: 8 });
    // 複数フロアは同じ基準位置で重なるように、全フロア共通の範囲を使う
    const common = floors.length > 1 ? exportBounds(floors, opts.playerView) : null;
    const titleH = floors.length > 1 || opts.titles ? 2 : 0;
    const frames = boxes.map(b => {
      const bb = common || b;
      return { x: bb.x - margin, y: bb.y - margin - titleH, w: bb.w + margin * 2, h: bb.h + margin * 2 + titleH };
    });
    const gap = floors.length > 1 ? 1 : 0;
    // 横一列が極端に長くなるとき（細長い校舎や階数の多い建物）は、4:3 に近くなる列数で折り返す
    const fh = Math.max(...frames.map(f => f.h));
    const sizeFor = cols => {
      const rows = Math.ceil(frames.length / cols);
      return { cols, w: frames.reduce((sum, f, i) => sum + (i < cols ? f.w : 0), 0) + gap * (cols - 1), h: rows * fh + gap * (rows - 1) };
    };
    const offAspect = l => Math.abs(Math.log(l.w / l.h / (4 / 3)));
    let layout = sizeFor(frames.length);
    if (layout.w / layout.h > 5) {
      for (let cols = 1; cols < frames.length; cols++) {
        const cand = sizeFor(cols);
        if (offAspect(cand) < offAspect(layout)) layout = cand;
      }
    }
    const totalW = layout.w;
    const totalH = layout.h;
    const maxSide = 16000;
    const scale = Math.min(px, maxSide / totalW, maxSide / totalH);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(totalW * scale);
    canvas.height = Math.round(totalH * scale);
    const c = canvas.getContext('2d');
    if (!opts.transparent) {
      c.fillStyle = theme.bg;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    let offset = 0;
    floors.forEach((floor, index) => {
      const f = frames[index];
      const row = Math.floor(index / layout.cols);
      if (index % layout.cols === 0) offset = 0;
      c.save();
      c.setTransform(scale, 0, 0, scale, (offset - f.x) * scale, (row * (fh + gap) - f.y) * scale);
      const view = { x: f.x, y: f.y, w: f.w, h: f.h };
      drawFloor(c, floor, {
        theme: opts.transparent ? { ...theme, bg: 'transparent' } : theme,
        zoom: scale, lang: opts.lang, showSize: opts.showSize, hideNames: opts.hideNames, playerView: opts.playerView,
        editor: false, grid: opts.grid, viewRect: view, background: false
      });
      if (titleH) {
        c.font = `800 1.1px ${theme.font}`;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillStyle = theme.label;
        c.fillText(floor.name || '', f.x + margin, f.y + titleH / 2 + 0.3);
      }
      c.restore();
      offset += f.w + gap;
    });
    return canvas;
  }

  /* アセットのアイコン（パネル用） */
  function drawAssetIcon(canvas, asset, themeId) {
    const theme = THEMES[themeId] || THEMES.clean;
    const c = canvas.getContext('2d');
    const dpr = global.devicePixelRatio || 1;
    const size = canvas.clientWidth || 44;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    c.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 4;
    const scale = Math.min((size - pad * 2) / asset.w, (size - pad * 2) / asset.h);
    c.setTransform(scale * dpr, 0, 0, scale * dpr, ((size - asset.w * scale) / 2) * dpr, ((size - asset.h * scale) / 2) * dpr);
    const lw = Math.max(1.1 / 24, 1 / scale);
    const S = furnStyle(theme, lw, null);
    c.lineWidth = lw;
    c.strokeStyle = S.line;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    asset.draw(c, S, asset.w, asset.h, { label: '1' });
  }

  /* ドア・窓のアイコン */
  function drawOpeningIcon(canvas, kind, themeId) {
    const theme = THEMES[themeId] || THEMES.clean;
    const c = canvas.getContext('2d');
    const dpr = global.devicePixelRatio || 1;
    const size = canvas.clientWidth || 44;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    c.clearRect(0, 0, canvas.width, canvas.height);
    const info = M.OPEN[kind];
    const len = Math.min(info.len, 3.5);
    const span = len + 1.4;
    const scale = (size - 6) / span;
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 3 * dpr, (size * 0.34) * dpr);
    const lw = Math.max(1.1 / 24, 1 / scale);
    const t = info.group === 'window' ? 0.34 : 0.26;
    c.fillStyle = theme.wall;
    c.fillRect(0, -t / 2, 0.7, t);
    c.fillRect(0.7 + len, -t / 2, 0.7, t);
    const o = { kind, o: 'h', x: 0.7, y: 0, len, side: 1, hinge: 0 };
    drawOpening(c, o, t, theme, lw, { playerView: false, editor: true });
  }

  global.IMM = global.IMM || {};
  Object.assign(global.IMM, {
    THEMES, drawFloor, renderImage, drawAssetIcon, drawOpeningIcon, drawOpening, drawItem, labelMetrics, textBox, lineWidth, roomFill
  });
})(window);
