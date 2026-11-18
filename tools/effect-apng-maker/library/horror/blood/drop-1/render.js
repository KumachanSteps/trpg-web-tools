// 血のしずくが見ている人のほうへ飛んできて、画面にぶつかって弾ける（1回再生）
// 形と色の見本は TK の「血しぶき」の画像（2026-11-18）：
//   ・色はあざやかな赤一色（つやや縁どりなし）
//   ・中心はいくつものかたまりが重なった、角ばったでこぼこの形。ふちに短いぎざぎざ
//   ・ある向きへ髪の毛のように細い筋が長く飛ぶ。少し離れたところに小さなかたまり、まわりに細かいしぶきがたくさん
// 地面に落ちたしずくとして描くので、そのあと下へ伝う筋は作らない（TK 2026-11-18）
// 1滴・2滴・3滴のカードで同じ描き方を使う（count だけちがう）
import { rng, clamp, smooth } from '../../../kit.js';

const TAU = Math.PI * 2;
const RED = 'rgb(236, 4, 6)';
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
    // 中心のかたまり：重なった楕円＋でこぼこのふち
    const blobs = [];
    for (let i = 0; i < 8; i++) {
      const a = r() * TAU, d = 0.38 * Math.sqrt(r());
      blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rx: 0.32 + 0.3 * r(), ry: 0.26 + 0.26 * r(), rot: r() * Math.PI });
    }
    const edge = [];
    for (let i = 0; i < 7; i++) edge.push({ k: 2 + Math.floor(r() * 9), amp: 0.04 + 0.07 * r(), ph: r() * TAU });
    // ふちの短いぎざぎざ
    const fringe = [];
    for (let i = 0; i < 26; i++) fringe.push({ a: r() * TAU, len: 0.08 + 0.3 * Math.pow(r(), 1.5), w: 0.05 + 0.1 * r(), spike: r() < 0.25 });
    // 髪の毛のような細い筋：飛ぶ向きを 1〜2 方向にかたよらせる
    const axes = [r() * TAU];
    if (r() < 0.7) axes.push(axes[0] + Math.PI * (0.6 + 0.8 * r()));
    const needles = [];
    for (let i = 0; i < 9; i++) {
      const ax = axes[i % axes.length];
      needles.push({ a: ax + (r() - 0.5) * 1.3, from: 0.55 + 0.2 * r(), len: 0.9 + 1.5 * Math.pow(r(), 0.8), w: 0.018 + 0.025 * r(), dot: r() < 0.5 ? 0.012 + 0.02 * r() : 0 });
    }
    // 少し離れた小さなかたまり（細長いものもある）
    const chunks = [];
    for (let i = 0; i < 8; i++) {
      const a = r() < 0.5 ? axes[0] + (r() - 0.5) * 1.6 : r() * TAU;
      chunks.push({ a, d: 1.25 + 1.3 * r(), rr: 0.05 + 0.09 * r(), stretch: 1 + 1.6 * r(), n: 1 + Math.floor(r() * 3), sub: [r(), r(), r(), r()] });
    }
    // 細かいしぶき
    const specks = [];
    for (let i = 0; i < 110; i++) {
      const a = r() < 0.4 ? axes[0] + (r() - 0.5) * 1.4 : r() * TAU;
      specks.push({ a, d: 1.0 + 2.3 * Math.pow(r(), 0.8), rr: 0.006 + 0.03 * Math.pow(r(), 2.4), stretch: 1 + 1.4 * r() * r() });
    }
    return { ...L, jx: (r() - 0.5) * 0.03, jy: (r() - 0.5) * 0.03, rot: r() * TAU, blobs, edge, fringe, needles, chunks, specks };
  });
  return { drops };
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
  const g = ctx;
  g.save();
  g.globalAlpha = fade;
  g.fillStyle = RED;
  for (const d of st.drops) {
    const cx = (d.x + d.jx) * W + ox, cy = (d.y + d.jy) * H + oy;
    const R = 82 * u * size * d.s;            // ぶつかったあとの中心のかたまりの大きさ
    const p = (t - (d.hit - FLY)) / FLY;
    if (p <= 0) continue;
    if (t < d.hit) {
      // 近づくほど速く大きくなる。少し上から来る
      const q = Math.pow(p, 2.2);
      const rr = R * (0.04 + 0.5 * q);
      g.beginPath(); g.ellipse(cx, cy - (1 - q) * 26 * u, rr, rr * 1.08, 0, 0, TAU); g.fill();
      continue;
    }
    const e = easeOut((t - d.hit) / 0.06, 3);           // かたまりの広がり
    const e2 = easeOut((t - d.hit) / 0.13, 2.4);        // 遠くへ飛ぶもの
    g.save();
    g.translate(cx, cy);
    g.rotate(d.rot);
    // 中心のかたまり
    for (const b of d.blobs) {
      g.beginPath(); g.ellipse(b.x * R * e, b.y * R * e, b.rx * R * e, b.ry * R * e, b.rot, 0, TAU); g.fill();
    }
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * TAU;
      let rad = 0.62;
      for (const w of d.edge) rad += w.amp * Math.sin(a * w.k + w.ph);
      const x = Math.cos(a) * R * rad * e, y = Math.sin(a) * R * rad * e;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
    // ふちのぎざぎざ（くさび形）
    for (const f of d.fringe) {
      const ca = Math.cos(f.a), sa = Math.sin(f.a);
      const r0 = R * 0.5 * e, r1 = R * (0.6 + f.len) * e, w = R * f.w * e;
      if (f.spike) {
        g.beginPath();
        g.moveTo(ca * r0 - sa * w * 0.6, sa * r0 + ca * w * 0.6);
        g.lineTo(ca * r1, sa * r1);
        g.lineTo(ca * r0 + sa * w * 0.6, sa * r0 - ca * w * 0.6);
        g.closePath(); g.fill();
      } else {
        // 丸みのあるこぶ（ふちのでこぼこ）
        radialDot(g, 0, 0, f.a, (r0 + r1) / 2, w * 1.1, 1 + f.len * 3);
      }
    }
    // 髪の毛のような細い筋
    for (const n of d.needles) {
      const ca = Math.cos(n.a), sa = Math.sin(n.a);
      const r0 = R * n.from * e, r1 = R * (n.from + n.len) * e2, w = Math.max(0.6, R * n.w);
      g.beginPath();
      g.moveTo(ca * r0 - sa * w, sa * r0 + ca * w);
      g.lineTo(ca * r1 - sa * 0.35, sa * r1 + ca * 0.35);
      g.lineTo(ca * r1 + sa * 0.35, sa * r1 - ca * 0.35);
      g.lineTo(ca * r0 + sa * w, sa * r0 - ca * w);
      g.closePath(); g.fill();
      if (n.dot) radialDot(g, 0, 0, n.a, r1 + R * n.dot * 2, R * n.dot, 1.8);
    }
    // 離れた小さなかたまり
    for (const k of d.chunks) {
      const dd = R * k.d * e2;
      for (let j = 0; j < k.n; j++) {
        const off = (k.sub[j] - 0.5) * k.rr * R * 1.6;
        radialDot(g, 0, 0, k.a + (k.sub[j + 1] - 0.5) * 0.08, dd + off, R * k.rr * (1 - 0.25 * j), k.stretch);
      }
    }
    // 細かいしぶき
    for (const s of d.specks) {
      radialDot(g, 0, 0, s.a, R * s.d * e2, Math.max(0.7, R * s.rr), s.stretch);
    }
    g.restore();
  }
  g.restore();
}

export default {
  setup: (P, S) => makeDrops(P, S, 1),
  draw: drawDrops
};
