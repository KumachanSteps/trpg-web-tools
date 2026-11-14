/*
 * 演出APNGメーカー — 素材（アセット）用の共通部品
 * 各アセットの render.js から import して使う。乱数は seed 付きなので、プレビューと書き出しの絵が同じになる。
 * ループ素材は t=0 と t=1 が同じ絵になるように、動きを「整数回の周回」で作る（wrap / cycles）。
 */

export const TAU = Math.PI * 2;

export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const wrap = v => v - Math.floor(v);
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeIn = t => clamp(t) ** 2;
export const easeOut = t => 1 - (1 - clamp(t)) ** 2;
export const easeInOut = t => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2; };
/** 0..1 の区間 [a, b] を 0..1 に引きのばす */
export const span = (t, a, b) => clamp((t - a) / (b - a));

/** 1ループ（duration 秒）のあいだに、速さ perSec（画面/秒）に近い整数回だけ周回させる */
export function cycles(perSec, duration) {
  return Math.max(1, Math.round(perSec * duration));
}

export function hexToRgb(hex) {
  const h = String(hex || '#ffffff').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(a)})`;
}

/** 明るさを変えた色（amount: -1 黒 〜 +1 白） */
export function shade(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  return `#${[f(r), f(g), f(b)].map(c => clamp(c, 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

/** ループするなめらかな揺らぎ（t は 0..1、k は整数の周波数） */
export function loopWave(t, k = 1, phase = 0) {
  return Math.sin(TAU * (k * t + phase));
}

/* ---------- 形（シルエット） ---------- */

// どれも原点中心・おおよそ半径1の大きさで描く（呼び出し側で translate/rotate/scale）
export const SHAPES = {
  sakura(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(-0.75, 0.55, -0.7, -0.55, -0.22, -0.95);
    ctx.lineTo(0, -0.7);
    ctx.lineTo(0.22, -0.95);
    ctx.bezierCurveTo(0.7, -0.55, 0.75, 0.55, 0, 1);
    ctx.closePath();
  },
  rose(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(-1.05, 0.45, -0.85, -0.85, 0, -0.95);
    ctx.bezierCurveTo(0.85, -0.85, 1.05, 0.45, 0, 1);
    ctx.closePath();
  },
  plum(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.82, 0.92, 0, 0, Math.PI * 2);
    ctx.closePath();
  },
  camellia(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(-0.95, 0.75, -1.0, -0.4, -0.45, -0.85);
    ctx.quadraticCurveTo(0, -1.05, 0.45, -0.85);
    ctx.bezierCurveTo(1.0, -0.4, 0.95, 0.75, 0, 1);
    ctx.closePath();
  },
  feather(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.38, -0.7, 0.42, 0.25, 0.08, 0.82);
    ctx.lineTo(0.02, 1);
    ctx.lineTo(-0.02, 1);
    ctx.lineTo(-0.08, 0.82);
    ctx.bezierCurveTo(-0.42, 0.25, -0.38, -0.7, 0, -1);
    ctx.closePath();
  }
};

/**
 * 形を敷きつめて画面を覆う転換（花びら・羽根）。p=0 で何もなし、p=1 で全面を覆う。
 * opts: { shape, color, from: 'left'|'right'|'top'|'bottom'|'center', size, spin, fall, seed }
 */
export function shapeCover(ctx, p, S, opts) {
  const { w, h } = S;
  const draw = SHAPES[opts.shape] || SHAPES.sakura;
  const cell = Math.max(24, Math.min(w, h) * (opts.size || 0.12));
  const cols = Math.ceil(w / cell) + 2;
  const rows = Math.ceil(h / cell) + 2;
  const r = rng(opts.seed || 7);
  const spread = 0.55; // 端から端まで届くまでの時間の割合
  ctx.fillStyle = opts.color;
  if (p >= 0.995) { ctx.fillRect(0, 0, w, h); return; }
  for (let j = -1; j < rows - 1; j++) {
    for (let i = -1; i < cols - 1; i++) {
      const jx = r(), jy = r(), jr = r(), jd = r();
      const cx = (i + 0.5 + (jx - 0.5) * 0.6) * cell;
      const cy = (j + 0.5 + (jy - 0.5) * 0.6) * cell;
      let order;
      switch (opts.from) {
        case 'right': order = 1 - cx / w; break;
        case 'top': order = cy / h; break;
        case 'bottom': order = 1 - cy / h; break;
        case 'center': order = Math.hypot(cx / w - 0.5, cy / h - 0.5) / 0.71; break;
        default: order = cx / w;
      }
      const delay = clamp(order) * spread + jd * 0.12;
      const local = clamp((p - delay) / (1 - spread - 0.12 + 0.0001));
      if (local <= 0) continue;
      const g = easeOut(local);
      const scale = cell * (0.35 + g * 1.65);
      const fall = (opts.fall || 0) * (1 - g) * cell * 1.6;
      const angle = jr * Math.PI * 2 + (opts.spin || 0) * (1 - g) * Math.PI * 1.5;
      ctx.save();
      ctx.translate(cx + fall * 0.4, cy - fall);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      draw(ctx);
      ctx.restore();
      ctx.fill();
    }
  }
}

/* ---------- 粒子（ループ） ---------- */

/** n 個の粒子を seed 付きで作る。各粒子は 0..1 の値をいくつか持つ */
export function makeParticles(n, seed, extra = 4) {
  const r = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const p = { x: r(), y: r(), z: r(), phase: r() };
    for (let k = 0; k < extra; k++) p['k' + k] = r();
    list.push(p);
  }
  return list;
}

/** 放射状のやわらかい光（粒子の描画用） */
export function glowDot(ctx, x, y, radius, color, alpha) {
  if (alpha <= 0 || radius <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.35, rgba(color, alpha * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** 画面のふちを暗くする（ビネット）。strength 0..1、inner は暗くならない範囲の半径（短辺比） */
export function vignette(ctx, S, color, strength, inner = 0.45, outer = 0.95) {
  const { w, h } = S;
  const cx = w / 2, cy = h / 2;
  const R = Math.hypot(cx, cy);
  const g = ctx.createRadialGradient(cx, cy, R * inner, cx, cy, R * outer);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.55, rgba(color, strength * 0.55));
  g.addColorStop(1, rgba(color, strength));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** 稲妻の道すじ（中点変位）。返り値は [x, y] の配列 */
export function boltPath(x0, y0, x1, y1, r, rough = 0.22, depth = 6) {
  let pts = [[x0, y0], [x1, y1]];
  let amp = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const off = (r() - 0.5) * amp;
      next.push([mx - dy / len * off, my + dx / len * off], pts[i + 1]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

export function strokePath(ctx, pts, upto = 1) {
  const n = Math.max(2, Math.floor(pts.length * clamp(upto)));
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
