// 血のしずくが見ている人のほうへ飛んできて、画面（ガラス）にぶつかって弾ける（1回再生）
// ぶつかると中心のかたまりから放射状に血が伸び、まわりに細かいしずくが散る
// 地面に落ちたしずくとして描くので、そのあと下へ伝う筋は作らない（TK 2026-11-18）。runs は乱数の並びを保つために残す
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
  const drops = LAYOUT[count].map(L => {
    const arms = [];
    const na = 14 + Math.floor(r() * 7);
    for (let i = 0; i < na; i++) {
      const a = (i + 0.5 * r()) / na * TAU;
      const long = r() < 0.3;
      arms.push({ a, len: long ? 0.9 + 0.7 * r() : 0.2 + 0.45 * r(), w: long ? 0.07 + 0.05 * r() : 0.14 + 0.12 * r(), tip: long ? 0.08 + 0.05 * r() : 0.13 + 0.09 * r(), gap: long && r() < 0.5 ? 0.15 + 0.25 * r() : 0 });
    }
    const sats = [];
    for (let i = 0; i < 10 + Math.floor(r() * 8); i++) sats.push({ a: r() * TAU, d: 1.7 + 1.6 * r(), rr: 0.03 + 0.06 * r() });
    const edge = [];
    for (let i = 0; i < 4; i++) edge.push({ k: 3 + Math.floor(r() * 5), amp: 0.03 + 0.05 * r(), ph: r() * TAU });
    const runs = [];
    const nr = 2 + Math.floor(r() * 2);
    for (let i = 0; i < nr; i++) runs.push({ a: Math.PI / 2 + (r() - 0.5) * 1.5, sp: 0.55 + 0.6 * r(), n: 0.07 + 0.04 * r(), delay: 0.03 + 0.12 * r(), wob: r() - 0.5, wp: r() * TAU });
    return { ...L, jx: (r() - 0.5) * 0.03, jy: (r() - 0.5) * 0.03, arms, sats, edge, runs };
  });
  return { drops, liq: liquidState() };
}

export function drawDrops(ctx, t, P, st, S) {
  const { w: W, h: H } = S;
  const u = H / 540;
  const size = P.size ?? 1;
  const c = P.center ?? { x: 0.5, y: 0.5 };
  // 中心をずらしたぶんだけ、全部のしずくを動かす
  const ox = (c.x - 0.5) * W, oy = (c.y - 0.5) * H;
  const fade = P.stay ? 1 : 1 - smooth((t - 0.84) / 0.16);
  if (fade <= 0) return;
  drawLiquid(ctx, W, H, st.liq, (g, k) => {
    g.save();
    g.scale(k, k);
    for (const d of st.drops) {
      const cx = (d.x + d.jx) * W + ox, cy = (d.y + d.jy) * H + oy;
      const R = 82 * u * size * d.s;            // ぶつかったあとの中心のかたまりの半径
      const p = (t - (d.hit - FLY)) / FLY;      // 飛んでくる途中（0〜1）
      if (p <= 0) continue;
      if (t < d.hit) {
        // 近づくほど速く大きくなる。少し上から来る
        const q = Math.pow(p, 2.2);
        const rr = R * (0.04 + 0.62 * q);
        g.beginPath(); g.ellipse(cx, cy - (1 - q) * 26 * u, rr, rr * 1.08, 0, 0, TAU); g.fill();
        continue;
      }
      const e = easeOut((t - d.hit) / 0.06, 3);           // 広がり
      const e2 = easeOut((t - d.hit) / 0.14, 2.4);        // 遠くへ飛ぶしずく
      // 中心のかたまり（ふちが少しでこぼこ）
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * TAU;
        let rad = 1;
        for (const w of d.edge) rad += w.amp * Math.sin(a * w.k + w.ph);
        const x = cx + Math.cos(a) * R * rad * e, y = cy + Math.sin(a) * R * rad * e;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      // 放射状に伸びる腕（先に丸いしずく）
      for (const a of d.arms) {
        const ca = Math.cos(a.a), sa = Math.sin(a.a);
        const L = R * (0.7 + a.len) * e;
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
        const td = L + R * a.gap * e2;
        g.beginPath(); g.arc(cx + ca * td, cy + sa * td, tr, 0, TAU); g.fill();
      }
      // まわりに散る細かいしずく
      for (const s of d.sats) {
        const dd = R * s.d * e2;
        g.beginPath(); g.arc(cx + Math.cos(s.a) * dd, cy + Math.sin(s.a) * dd, R * s.rr * Math.min(1, e2 * 1.5), 0, TAU); g.fill();
      }
    }
    g.restore();
  }, { res: 0.8, u, edge: 2.4, dome: 8, style: 'rim', alpha: fade });
}

export default {
  setup: (P, S) => makeDrops(P, S, 1),
  draw: drawDrops
};
