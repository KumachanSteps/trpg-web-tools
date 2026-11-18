// 血のしずくが見ている人のほうへ飛んできて、画面にぶつかって弾ける（1回再生）
// 形と色の見本は TK の血しぶきの画像（2026-11-18、3 枚目）：
//   ・中心はほぼ丸い液だまり。となりに小さな丸い液だまりが 1〜2 個くっつき、液体どうしでなめらかにつながる
//   ・ふちには細かい短いとげ（はねた血）がびっしり。少し離れた所に、放射状の短い線としずく
//   ・色は水彩のような濃淡のある深紅。縁は少し濃く、明るい縁どりはしない（blood-liquid.js の style 'stain'）
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
  const drops = LAYOUT[count].map(L => {
    // 中心の液だまりのふち（ゆるいゆがみだけ）
    const edge = [];
    for (let i = 0; i < 5; i++) edge.push({ k: 2 + Math.floor(r() * 7), amp: 0.015 + 0.03 * r(), ph: r() * TAU });
    // となりにくっつく小さな液だまり
    const pools = [];
    const np = 1 + Math.floor(r() * 2.4);
    const pa = r() * TAU;
    for (let i = 0; i < np; i++) pools.push({ a: pa + (i ? (r() < 0.5 ? 1 : -1) * (0.8 + 1.4 * r()) : 0), d: 0.85 + 0.25 * r(), rr: 0.3 + 0.24 * r() });
    // 3滴のとき：となりの液だまりは 1 個だけ、小さめで少し離す（3 つ並ぶと重たく見えるため。TK 2026-11-18）
    if (count === 3) {
      pools.length = Math.min(pools.length, 1);
      for (const pl of pools) { pl.d = 1.0 + 0.12 * (pl.d - 0.85) / 0.25; pl.rr = 0.2 + 0.14 * (pl.rr - 0.3) / 0.24; }
      for (const w of edge) w.amp *= 0.55;   // 角ばって見えないように、ふちのゆがみを弱く
    }
    // ふちのとげ（細かく、びっしり）
    const spines = [];
    const ns = 46 + Math.floor(r() * 20);
    for (let i = 0; i < ns; i++) spines.push({ a: (i + r()) / ns * TAU, len: 0.08 + 0.32 * Math.pow(r(), 1.6), w: 0.03 + 0.035 * r(), dot: r() < 0.25 });
    // 少し離れた放射状の短い線
    const dashes = [];
    for (let i = 0; i < 34; i++) dashes.push({ a: r() * TAU, d: 1.3 + 0.9 * r(), len: 0.05 + 0.1 * r(), w: 0.012 + 0.014 * r() });
    // ときどき長く飛ぶ細い筋
    const needles = [];
    for (let i = 0; i < 4; i++) needles.push({ a: r() * TAU, len: 0.5 + 0.8 * r(), w: 0.022 + 0.015 * r() });
    // 細かいしぶき
    const specks = [];
    for (let i = 0; i < 40; i++) specks.push({ a: r() * TAU, d: 1.2 + 1.6 * Math.pow(r(), 0.8), rr: 0.012 + 0.03 * Math.pow(r(), 2) });
    return { ...L, jx: (r() - 0.5) * 0.03, jy: (r() - 0.5) * 0.03, edge, pools, spines, dashes, needles, specks, poolSpikes: count === 3 ? 20 : 12, spMin: count === 3 ? 11 : 7 };
  });
  return { drops, liq: liquidState(), seed: S.seed * 7 + count };
}

// 中心から向き a・距離 d に、向きにそって細長い楕円を置く
function radialDot(g, cx, cy, a, d, rr, stretch) {
  g.beginPath();
  g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr * stretch, rr, a, 0, TAU);
  g.fill();
}
// 中心から向き a へ、r0〜r1 の先細りのとげ
function spike(g, cx, cy, a, r0, r1, w0, w1) {
  const ca = Math.cos(a), sa = Math.sin(a);
  g.beginPath();
  g.moveTo(cx + ca * r0 - sa * w0, cy + sa * r0 + ca * w0);
  g.lineTo(cx + ca * r1 - sa * w1, cy + sa * r1 + ca * w1);
  g.lineTo(cx + ca * r1 + sa * w1, cy + sa * r1 - ca * w1);
  g.lineTo(cx + ca * r0 + sa * w0, cy + sa * r0 - ca * w0);
  g.closePath(); g.fill();
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
      const R = 80 * u * size * d.s;            // ぶつかったあとの中心の液だまりの半径
      const p = (t - (d.hit - FLY)) / FLY;
      if (p <= 0) continue;
      if (t < d.hit) {
        // 近づくほど速く大きくなる。少し上から来る
        const q = Math.pow(p, 2.2);
        const rr = R * (0.04 + 0.6 * q);
        g.beginPath(); g.ellipse(cx, cy - (1 - q) * 26 * u, rr, rr * 1.08, 0, 0, TAU); g.fill();
        continue;
      }
      const e = easeOut((t - d.hit) / 0.07, 3);           // 液だまりの広がり
      const e2 = easeOut((t - d.hit) / 0.14, 2.4);        // 遠くへ飛ぶもの
      const ep = easeOut((t - d.hit - 0.02) / 0.12, 2.2); // となりの液だまりは少し遅れて
      // 中心の液だまり
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * TAU;
        let rad = 1;
        for (const w of d.edge) rad += w.amp * Math.sin(a * w.k + w.ph);
        const x = cx + Math.cos(a) * R * rad * e, y = cy + Math.sin(a) * R * rad * e;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      // となりの小さな液だまり（それぞれのふちにもとげ）
      for (const pl of d.pools) {
        const px = cx + Math.cos(pl.a) * R * pl.d * e, py = cy + Math.sin(pl.a) * R * pl.d * e;
        const pr = R * pl.rr * ep;
        if (pr < 0.5) continue;
        g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
        for (let j = 0; j < d.poolSpikes; j++) {
          const ns = d.spines.length, s = d.spines[(((j * 5 + Math.round(pl.a * 10)) % ns) + ns) % ns];
          const a = s.a + j * (d.poolSpikes === 12 ? 0.52 : TAU / d.poolSpikes);
          spike(g, px, py, a, pr * 0.85, pr * (1.05 + s.len * 0.8), Math.max(1.6 * u, R * s.w * 0.7), 0.6);
        }
      }
      // ふちのとげ（細かく、びっしり）
      for (const s of d.spines) {
        const r1 = (R + Math.max(d.spMin * u, R * s.len) * e2) * e;
        spike(g, cx, cy, s.a, R * 0.88 * e, r1, Math.max(1.8 * u, R * s.w), 0.6);
        if (s.dot) radialDot(g, cx, cy, s.a, r1 + R * 0.05, R * 0.028, 1.3);
      }
      // ときどき長く飛ぶ細い筋
      for (const n of d.needles) spike(g, cx, cy, n.a, R * 0.9 * e, R * (1.2 + n.len) * e2, Math.max(1.8 * u, R * n.w), 0.6);
      // 少し離れた放射状の短い線と、細かいしぶき
      for (const s of d.dashes) radialDot(g, cx, cy, s.a, R * s.d * e2, Math.max(0.9, R * s.w), Math.max(1.5, s.len / s.w));
      for (const s of d.specks) radialDot(g, cx, cy, s.a, R * s.d * e2, Math.max(1, R * s.rr), 1.2);
    }
    g.restore();
  }, { res: 1, u, edge: 1.7, dome: 12, style: 'stain', seed: st.seed, alpha: fade });
}

export default {
  setup: (P, S) => makeDrops(P, S, 1),
  draw: drawDrops
};
