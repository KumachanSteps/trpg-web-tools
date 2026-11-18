// 血のしずくが見ている人のほうへ飛んできて、画面にぶつかって弾ける（1回再生）
// v0.34 と v0.35 を合わせた形（TK 2026-11-18）：
//   ・中心のかたまりと、ふちの丸いこぶ・しずくの付いた腕は v0.34（丸みのある形）
//   ・色も v0.34 の暗い深紅＋明るい縁どり（blood-liquid.js の style 'rim'）
//   ・v0.35 の見本（血しぶきの画像）から：1〜2 方向へかたよって飛ぶ髪の毛のような細い筋、離れた小さなかたまり、細かいしぶき
// 地面に落ちたしずくとして描くので、そのあと下へ伝う筋は作らない（TK 2026-11-18）
// 1滴・2滴・3滴のカードで同じ描き方を使う（count だけちがう）
import { rng, clamp, smooth } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';

const TAU = Math.PI * 2;
const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);

// 何滴目がどこに、いつ当たるか（画面に対する位置）
const LAYOUT = {
  1: [{ x: 0.5, y: 0.46, s: 1, hit: 0.1 }],
  2: [{ x: 0.38, y: 0.4, s: 0.95, hit: 0.1 }, { x: 0.64, y: 0.6, s: 0.8, hit: 0.32 }],
  3: [{ x: 0.5, y: 0.42, s: 0.88, hit: 0.1 }, { x: 0.25, y: 0.63, s: 0.66, hit: 0.28 }, { x: 0.76, y: 0.55, s: 0.74, hit: 0.44 }]
};
const FLY = 0.12;   // 飛んでくる時間（全体に対して）

export function makeDrops(P, S, count) {
  const r = rng(S.seed * 13 + 5 + count);
  const r2 = rng(S.seed * 31 + 7 + count);   // v0.35 から足した細い筋・しぶき用（v0.34 の形を変えないように別の乱数）
  const drops = LAYOUT[count].map(L => {
    // --- v0.34 の形：中心のかたまり（ふちがでこぼこ）と、しずくの付いた腕 ---
    const arms = [];
    const na = 14 + Math.floor(r() * 7);
    for (let i = 0; i < na; i++) {
      const a = (i + 0.5 * r()) / na * TAU;
      const long = r() < 0.3;
      arms.push({ a, long, len: long ? 0.9 + 0.7 * r() : 0.2 + 0.45 * r(), w: long ? 0.07 + 0.05 * r() : 0.14 + 0.12 * r(), tip: long ? 0.08 + 0.05 * r() : 0.13 + 0.09 * r(), gap: long && r() < 0.5 ? 0.15 + 0.25 * r() : 0 });
    }
    const sats = [];
    for (let i = 0; i < 10 + Math.floor(r() * 8); i++) sats.push({ a: r() * TAU, d: 1.7 + 1.6 * r(), rr: 0.03 + 0.06 * r() });
    const edge = [];
    for (let i = 0; i < 4; i++) edge.push({ k: 3 + Math.floor(r() * 5), amp: 0.03 + 0.05 * r(), ph: r() * TAU });
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) for (let j = 0; j < 6; j++) r();   // v0.34 の筋（いまは描かない）のぶんの乱数
    const jx = (r() - 0.5) * 0.03, jy = (r() - 0.5) * 0.03;
    // --- v0.35 の見本から：かたよって飛ぶ細い筋・離れた小さなかたまり・細かいしぶき ---
    const axes = [r2() * TAU];
    if (r2() < 0.7) axes.push(axes[0] + Math.PI * (0.6 + 0.8 * r2()));
    const needles = [];
    for (let i = 0; i < 9; i++) {
      const ax = axes[i % axes.length];
      needles.push({ a: ax + (r2() - 0.5) * 1.3, from: 0.7 + 0.2 * r2(), len: 0.9 + 1.4 * Math.pow(r2(), 0.8), w: 0.022 + 0.022 * r2(), dot: r2() < 0.5 ? 0.02 + 0.02 * r2() : 0 });
    }
    const chunks = [];
    for (let i = 0; i < 7; i++) {
      const a = r2() < 0.5 ? axes[0] + (r2() - 0.5) * 1.6 : r2() * TAU;
      chunks.push({ a, d: 1.4 + 1.2 * r2(), rr: 0.05 + 0.07 * r2(), stretch: 1 + 1.4 * r2() });
    }
    const specks = [];
    for (let i = 0; i < 70; i++) {
      const a = r2() < 0.4 ? axes[0] + (r2() - 0.5) * 1.4 : r2() * TAU;
      specks.push({ a, d: 1.2 + 2.1 * Math.pow(r2(), 0.8), rr: 0.012 + 0.025 * Math.pow(r2(), 2), stretch: 1 + 1.2 * r2() * r2() });
    }
    return { ...L, jx, jy, arms, sats, edge, needles, chunks, specks };
  });
  return { drops, liq: liquidState() };
}

// 中心から向き a・距離 d に、向きにそって細長い楕円を置く
function radialDot(g, cx, cy, a, d, rr, stretch) {
  g.beginPath();
  g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr * stretch, rr, a, 0, TAU);
  g.fill();
}

export function drawDrops(ctx, t, P, st, S) {
  const { w: W, h: H } = S;
  const u = H / 540;
  const size = P.size ?? 1;
  const c = P.center ?? { x: 0.5, y: 0.5 };
  const ox = (c.x - 0.5) * W, oy = (c.y - 0.5) * H;
  const fade = P.stay ? 1 : 1 - smooth((t - 0.84) / 0.16);
  if (fade <= 0) return;
  drawLiquid(ctx, W, H, st.liq, (g, k) => {
    g.save();
    g.scale(k, k);
    for (const d of st.drops) {
      const cx = (d.x + d.jx) * W + ox, cy = (d.y + d.jy) * H + oy;
      const R = 82 * u * size * d.s;            // ぶつかったあとの中心のかたまりの半径
      const p = (t - (d.hit - FLY)) / FLY;
      if (p <= 0) continue;
      if (t < d.hit) {
        const q = Math.pow(p, 2.2);
        const rr = R * (0.04 + 0.62 * q);
        g.beginPath(); g.ellipse(cx, cy - (1 - q) * 26 * u, rr, rr * 1.08, 0, 0, TAU); g.fill();
        continue;
      }
      const e = easeOut((t - d.hit) / 0.06, 3);
      const e2 = easeOut((t - d.hit) / 0.14, 2.4);
      // 中心のかたまり（v0.34）
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * TAU;
        let rad = 1;
        for (const w of d.edge) rad += w.amp * Math.sin(a * w.k + w.ph);
        const x = cx + Math.cos(a) * R * rad * e, y = cy + Math.sin(a) * R * rad * e;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      // しずくの付いた腕（v0.34）。長い腕は細い筋に任せて、短く丸いこぶだけにする
      for (const a of d.arms) {
        const ca = Math.cos(a.a), sa = Math.sin(a.a);
        const len = a.long ? 0.35 + 0.2 * a.len : a.len;
        const L = R * (0.7 + len) * e;
        const w0 = R * a.w * 1.5, w1 = R * a.w * 0.7;
        const bx = cx + ca * R * 0.6 * e, by = cy + sa * R * 0.6 * e;
        const tx = cx + ca * L, ty = cy + sa * L;
        g.beginPath();
        g.moveTo(bx - sa * w0, by + ca * w0);
        g.lineTo(tx - sa * w1, ty + ca * w1);
        g.lineTo(tx + sa * w1, ty - ca * w1);
        g.lineTo(bx + sa * w0, by - ca * w0);
        g.closePath(); g.fill();
        const tr = R * a.tip * e;
        g.beginPath(); g.arc(cx + ca * (L + R * a.gap * e2), cy + sa * (L + R * a.gap * e2), tr, 0, TAU); g.fill();
      }
      // 髪の毛のような細い筋（v0.35）
      for (const n of d.needles) {
        const ca = Math.cos(n.a), sa = Math.sin(n.a);
        const r0 = R * n.from * e, r1 = R * (n.from + n.len) * e2, w = Math.max(1.2, R * n.w);
        g.beginPath();
        g.moveTo(cx + ca * r0 - sa * w, cy + sa * r0 + ca * w);
        g.lineTo(cx + ca * r1 - sa * 0.9, cy + sa * r1 + ca * 0.9);
        g.lineTo(cx + ca * r1 + sa * 0.9, cy + sa * r1 - ca * 0.9);
        g.lineTo(cx + ca * r0 + sa * w, cy + sa * r0 - ca * w);
        g.closePath(); g.fill();
        if (n.dot) radialDot(g, cx, cy, n.a, r1 + R * n.dot * 2, R * n.dot, 1.6);
      }
      // 離れた小さなかたまり・細かいしぶき（v0.34 のしずく＋v0.35）
      for (const s of d.sats) radialDot(g, cx, cy, s.a, R * s.d * e2, R * s.rr * Math.min(1, e2 * 1.5), 1);
      for (const k2 of d.chunks) radialDot(g, cx, cy, k2.a, R * k2.d * e2, R * k2.rr, k2.stretch);
      for (const s of d.specks) radialDot(g, cx, cy, s.a, R * s.d * e2, Math.max(1.3, R * s.rr), s.stretch);
    }
    g.restore();
  }, { res: 1, u, edge: 1.6, dome: 8, style: 'rim', alpha: fade });
}

export default {
  setup: (P, S) => makeDrops(P, S, 1),
  draw: drawDrops
};
