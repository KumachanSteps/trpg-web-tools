// 血まみれの手のひらが、画面（ガラス）にバン！と押しつけられ、かすれた手形が残って、手のつけ根から血が細く垂れる（1回再生）
// 形の見本は TK の手形の画像（2026-11-19、2 枚目）。手は少しななめ（指先が右上、手のつけ根が左下）：
//   ・指は指先の腹だけが濃い、ななめの細長い楕円。指の途中はほとんど付かない（ところどころ小さなしみ）
//   ・左はしの小指は外へ開き、右の親指は右上へ長くのびて手のひらの右側へつながる
//   ・手のひらの上のほうはほぼ白く抜け、ぽつぽつしたしみだけ。下は濃い大きなかたまりで、
//     まん中が上から V 字に切れこみ、手のつけ根は左右 2 つのふくらみに分かれる（あいだに小さな抜け）
//   ・ふちは乾いた筆のようにざらざら（とくに左上のふち）
//   ・手のつけ根から細い筋が 4 本、まっすぐ下へ垂れる。右のふちからも短い筋が 1 本（TK：垂れ方はこのままでよい）
// 形は見本の画像の座標（幅 547 × 高さ 1000 の画像の px）でそのまま書き、手のひらの幅 350px を hu に合わせて縮める
// 色は水彩のような濃淡の深紅（blood-liquid.js の style 'stain'。血のしずくと同じ）
import { rng, clamp, smooth } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';
import { drawStreak } from '../streak.js';

const TAU = Math.PI * 2;
const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
const HIT = 0.06;            // 手がぶつかる時刻
const OX = 270, OY = 400;    // 見本の画像で、手形の中心とみなす点
const PALM = 350 / 1.25;     // 見本の画像での手のひらの幅（px）を、hu の 1.25 倍に合わせる

// 手のひらの下の濃いかたまり（見本の画像の px）
const MASS = [
  [95, 378], [130, 371], [170, 364], [205, 372], [222, 396], [234, 430], [246, 462], [262, 454], [284, 426],
  [306, 400], [330, 374], [352, 345], [376, 318], [402, 298], [426, 318], [430, 345], [416, 372], [402, 410],
  [390, 455], [374, 492], [356, 535], [340, 572], [326, 602], [306, 607], [298, 586], [284, 576], [268, 586],
  [258, 612], [240, 616], [229, 596], [222, 562], [196, 548], [165, 526], [136, 496], [118, 460], [104, 420]
];
// 指先の腹：中心, 半径, 向き（度。上が右へ傾くほど＋）
const PADS = [
  { x: 40, y: 258, rx: 21, ry: 50, a: -28 },     // 小指（外へ開く）
  { x: 255, y: 44, rx: 22, ry: 40, a: 6 },       // 薬指
  { x: 380, y: 62, rx: 27, ry: 60, a: 20 },      // 中指
  { x: 440, y: 128, rx: 27, ry: 62, a: 22 },     // 人さし指
  { x: 518, y: 252, rx: 25, ry: 40, a: 48 }      // 親指の先
];
// 指先の腹の下に続く、とぎれた小さなしみ
const PAD_TAILS = [
  { x: 64, y: 305, rx: 9, ry: 14, a: -28 },
  { x: 246, y: 98, rx: 18, ry: 13, a: 0 }, { x: 228, y: 92, rx: 9, ry: 8, a: 0 },
  { x: 358, y: 118, rx: 12, ry: 10, a: 20 },
  { x: 412, y: 182, rx: 12, ry: 11, a: 22 }
];
// 親指の付け根から手のひらの右へつながる帯（太さつき）
const THUMB = [[505, 270, 16], [480, 296, 17], [455, 320, 18], [432, 340, 18]];
// 手のひらの上のほうのしみ
const BLOTS = [
  { x: 336, y: 186, rx: 17, ry: 15 }, { x: 228, y: 186, rx: 11, ry: 9 }, { x: 236, y: 205, rx: 14, ry: 8 },
  { x: 400, y: 240, rx: 6, ry: 7 },
  { x: 266, y: 268, rx: 24, ry: 20 }, { x: 240, y: 264, rx: 12, ry: 14 }, { x: 236, y: 300, rx: 12, ry: 10 },
  { x: 302, y: 274, rx: 10, ry: 9 }, { x: 330, y: 300, rx: 20, ry: 16 }, { x: 318, y: 332, rx: 13, ry: 10 },
  { x: 342, y: 270, rx: 9, ry: 9 }, { x: 240, y: 332, rx: 8, ry: 9 }, { x: 268, y: 406, rx: 8, ry: 7 },
  { x: 296, y: 404, rx: 6, ry: 6 }, { x: 304, y: 372, rx: 7, ry: 5 }, { x: 186, y: 365, rx: 16, ry: 7 },
  { x: 78, y: 352, rx: 5, ry: 4 }, { x: 84, y: 364, rx: 4, ry: 4 },
  // もう少し赤を増やす（TK 2026-11-19）：手のひらのまん中〜指のつけ根にしみを足す
  { x: 290, y: 240, rx: 16, ry: 13 }, { x: 214, y: 240, rx: 12, ry: 15 }, { x: 362, y: 238, rx: 14, ry: 12 },
  { x: 280, y: 320, rx: 16, ry: 12 }, { x: 352, y: 320, rx: 12, ry: 14 }, { x: 214, y: 340, rx: 13, ry: 10 },
  { x: 150, y: 352, rx: 18, ry: 9 }, { x: 290, y: 190, rx: 12, ry: 10 }, { x: 385, y: 200, rx: 10, ry: 11 },
  { x: 262, y: 360, rx: 10, ry: 8 }, { x: 120, y: 340, rx: 9, ry: 6 }
];
// 手のつけ根から垂れる筋：位置, 長さ, 首の太さの半分（px）
const RUNS = [
  { x: 188, y: 548, len: 150, n: 4.2, delay: 0.1 },
  { x: 258, y: 608, len: 215, n: 5.2, delay: 0.04 },
  { x: 311, y: 600, len: 180, n: 4.6, delay: 0.14 },
  { x: 328, y: 590, len: 290, n: 5.4, delay: 0.08 },
  { x: 390, y: 470, len: 58, n: 4.4, delay: 0.12 }   // 右のふちの短い筋
];

export default {
  setup(P, S) {
    const r = rng(S.seed * 17 + 3);
    const j = (v, a) => v + (r() - 0.5) * a;
    const mass = MASS.map(([x, y]) => [j(x, 6), j(y, 6)]);
    // ふちのざらざら：ふちにそって、外へ出る小さなでっぱりと、内へ食いこむ小さな抜け
    const bumps = [], bites = [];
    for (let i = 0; i < mass.length; i++) {
      const [x0, y0] = mass[i], [x1, y1] = mass[(i + 1) % mass.length];
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 5);
      for (let k = 0; k < n; k++) {
        const q = (k + r()) / n, x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q;
        const rough = y0 < 400 && x0 < 240 ? 1.6 : 1;   // 左上のふちはとくにかすれる
        if (r() < 0.55) bumps.push({ x: j(x, 8 * rough), y: j(y, 8 * rough), rr: (1.5 + 4 * Math.pow(r(), 2)) * rough });
        if (r() < 0.45) bites.push({ x: j(x, 6), y: j(y, 6), rr: 1.5 + 3.5 * Math.pow(r(), 1.5) });
      }
    }
    // 左上のふちの外の、乾いた筆の飛び
    const stipple = [];
    for (let i = 0; i < 70; i++) stipple.push({ x: 60 + 180 * r(), y: 330 + 60 * r() - (r() < 0.3 ? 40 : 0), rr: 1 + 2.5 * Math.pow(r(), 2) });
    for (let i = 0; i < 30; i++) stipple.push({ x: 200 + 200 * r(), y: 160 + 200 * r(), rr: 1 + 2 * Math.pow(r(), 2) });
    // かたまりの中の小さな抜け
    const holes = [];
    for (let i = 0; i < 26; i++) holes.push({ x: 110 + 280 * r(), y: 380 + 200 * r(), rr: 1.2 + 3 * Math.pow(r(), 2) });
    holes.push({ x: 268, y: 594, rr: 11 }, { x: 278, y: 588, rr: 8 });   // 手のつけ根の 2 つのふくらみのあいだ
    const pads = PADS.map(p => ({ ...p, x: j(p.x, 4), y: j(p.y, 4), a: j(p.a, 5), ry: p.ry * (0.95 + 0.1 * r()) }));
    const padBits = [];
    for (const p of pads) for (let i = 0; i < 9; i++) {
      const q = r() * TAU, a = p.a * Math.PI / 180;
      const ex = Math.cos(q) * p.rx * 0.95, ey = Math.sin(q) * p.ry * 0.95;
      padBits.push({ x: p.x + ex * Math.cos(a) - ey * Math.sin(a), y: p.y + ex * Math.sin(a) + ey * Math.cos(a), rr: 2 + 4 * r() });
    }
    // 手のひらの上のしみは、楕円の中に小さなしみを 3〜5 個重ねて、まだらに
    const blots = [];
    for (const o of BLOTS) {
      const n = o.rx > 9 ? 4 + Math.floor(r() * 3) : 1;
      for (let i = 0; i < n; i++) {
        const q = r() * TAU, d = n > 1 ? 0.55 * Math.sqrt(r()) : 0;
        blots.push({ x: o.x + Math.cos(q) * o.rx * d, y: o.y + Math.sin(q) * o.ry * d, rx: o.rx * (n > 1 ? 0.6 + 0.3 * r() : 1.1), ry: o.ry * (n > 1 ? 0.6 + 0.3 * r() : 1.1), a: r() * 180 });
      }
    }
    const runs = RUNS.map(d => ({ ...d, len: d.len * (0.9 + 0.2 * r()), wob: (r() - 0.5) * 0.5, wp: r() * TAU }));
    return { blots, mass, bumps, bites, stipple, holes, pads, padBits, runs, liq: liquidState(), seed: S.seed * 5 + 17 };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    if (t < HIT) return;
    const size = P.size ?? 1;
    const c = P.center ?? { x: 0.5, y: 0.42 };
    const mirror = P.hand === 'left' ? -1 : 1;
    const tilt = (P.tilt ?? 0) * Math.PI / 180;
    const hu = 150 * u * size;                       // 手のひらの幅（px）
    const slam = 1 + 0.1 * (1 - easeOut((t - HIT) / 0.07, 2.5));   // ぶつかった直後だけ少し大きい
    const k0 = hu * slam / PALM;                     // 見本の画像の 1px → 画面の px
    const fade = P.stay ? 1 : 1 - smooth((t - 0.88) / 0.12);
    if (fade <= 0) return;
    const cx = c.x * W, cy = c.y * H;
    const dot = (g, x, y, rr) => { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); };
    const oval = (g, o) => { g.beginPath(); g.ellipse(o.x, o.y, o.rx, o.ry, (o.a ?? 0) * Math.PI / 180, 0, TAU); g.fill(); };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.scale(k0 * mirror, k0);
      g.translate(-OX, -OY);
      // 手のひらの下の濃いかたまり
      g.beginPath();
      st.mass.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.closePath(); g.fill();
      for (const b of st.bumps) dot(g, b.x, b.y, b.rr);
      // 親指の付け根の帯
      for (let i = 0; i < THUMB.length - 1; i++) {
        const [x0, y0, w0] = THUMB[i], [x1, y1, w1] = THUMB[i + 1];
        for (let q = 0; q <= 1; q += 0.25) dot(g, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, w0 + (w1 - w0) * q);
      }
      // 指先の腹と、そのふちのざらざら
      for (const p of st.pads) oval(g, p);
      for (const b of st.padBits) dot(g, b.x, b.y, b.rr);
      for (const o of PAD_TAILS) oval(g, o);
      // 手のひらの上のほうのしみと、乾いた筆の飛び
      for (const o of st.blots) oval(g, o);
      for (const s of st.stipple) dot(g, s.x, s.y, s.rr);
      // 抜け：ふちの食いこみと、かたまりの中の小さな抜け
      g.globalCompositeOperation = 'destination-out';
      for (const b of st.bites) dot(g, b.x, b.y, b.rr);
      for (const h of st.holes) dot(g, h.x, h.y, h.rr);
      g.globalCompositeOperation = 'source-over';
      g.restore();
      // 手のつけ根から垂れる細い筋（手の向きによらず、画面の下へ）
      const toScreen = (x, y) => {
        const X = (x - OX) * k0 * mirror, Y = (y - OY) * k0;
        return [cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt)];
      };
      for (const run of st.runs) {
        const tt = t - HIT - run.delay;
        if (tt <= 0) continue;
        const p = toScreen(run.x, run.y);
        const L = run.len * k0 * easeOut(tt / 0.6, 1.6);
        drawStreak(g, p[0], p[1], L, Math.max(1.4 * u, run.n * k0), { root: 2.4, wob: run.wob, wp: run.wp, H });
      }
      g.restore();
    }, { res: 1, u, edge: 1.5, dome: 10, style: 'stain', seed: st.seed, alpha: fade });
  }
};
