// 血まみれの手のひらが、画面（ガラス）にバン！と押しつけられ、かすれた手形が残って、手のつけ根から血が細く垂れる（1回再生）
// 形の見本は TK の手形の画像（2026-11-19）：
//   ・指は「指先の腹」がいちばん濃く、指の途中はとぎれとぎれの小さなしみ。つけ根の関節はほとんど付かない
//   ・手のひらの上のほうはかすれて、ぽつぽつしたしみだけ。下のほう（手のつけ根）は血がたまって濃く、
//     まん中に手のひらのくぼみの抜け（下向きの三角）がある。ふちは乾いた筆のようにざらざら
//   ・手のつけ根から、細くて長い筋が 4〜5 本、まっすぐ下へ垂れる（先は小さなしずく）
// 色は水彩のような濃淡の深紅（blood-liquid.js の style 'stain'。血のしずくと同じ）
import { rng, clamp, smooth } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';
import { drawStreak } from '../streak.js';

const TAU = Math.PI * 2;
const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
const HIT = 0.06;   // 手がぶつかる時刻

// 手の形（手のひらの中心が原点、y は下向き、手のひらの幅がおよそ 1）。右手
const FINGERS = [
  // 付け根の位置, 向き（上から右回り、度）, 長さ, 太さ
  { bx: -0.33, by: -0.46, a: -12, len: 0.86, w: 0.2 },   // 人さし指
  { bx: -0.1, by: -0.52, a: -2, len: 0.98, w: 0.21 },    // 中指
  { bx: 0.14, by: -0.48, a: 8, len: 0.9, w: 0.2 },       // 薬指
  { bx: 0.36, by: -0.36, a: 20, len: 0.7, w: 0.175 }     // 小指
];
const THUMB = { bx: -0.44, by: 0.1, a: -52, len: 0.78, w: 0.24 };

export default {
  setup(P, S) {
    const r = rng(S.seed * 17 + 3);
    const all = [...FINGERS, THUMB].map(f => ({ ...f, a: f.a + (r() - 0.5) * 6, len: f.len * (0.95 + 0.1 * r()) }));
    // 指：指先の腹＋途中のとぎれたしみ
    const fingers = all.map((f, i) => {
      const mids = [];
      const nm = 2 + Math.floor(r() * 3);
      for (let j = 0; j < nm; j++) mids.push({ q: 0.3 + 0.3 * r(), side: (r() - 0.5) * 0.6, rx: 0.05 + 0.05 * r(), ry: 0.04 + 0.05 * r(), rot: r() * Math.PI });
      const base = r() < 0.4 ? { q: 0.12 + 0.1 * r(), side: (r() - 0.5) * 0.6, rx: 0.03 + 0.04 * r() } : null;
      return { ...f, thumb: i === 4, pad: 0.4 + 0.1 * r(), mids, base };
    });
    // 手のひらの上のほうのぽつぽつしたしみ
    const dabs = [];
    for (let i = 0; i < 16; i++) dabs.push({ x: -0.42 + 0.84 * r(), y: -0.42 + 0.34 * r(), rx: 0.025 + 0.07 * Math.pow(r(), 1.5), ry: 0.02 + 0.05 * r(), rot: r() * Math.PI });
    // 指のつけ根の下のとぎれた帯（指の腹のつけ根）
    for (const f of FINGERS) for (let j = 0; j < 2; j++) dabs.push({ x: f.bx + (r() - 0.5) * 0.14, y: f.by + 0.06 + (r() - 0.5) * 0.08, rx: 0.05 + 0.05 * r(), ry: 0.035 + 0.035 * r(), rot: r() * Math.PI });
    const hollowEdge = [];
    for (let i = 0; i < 4; i++) hollowEdge.push({ k: 3 + Math.floor(r() * 6), ph: r() * TAU });
    // 手のつけ根の濃いところのふち（でこぼこ）
    const heelEdge = [];
    for (let i = 0; i < 6; i++) heelEdge.push({ k: 2 + Math.floor(r() * 8), amp: 0.02 + 0.03 * r(), ph: r() * TAU });
    // 乾いた筆のようなかすれ：抜く点と、ふちの外の細かい点
    const grain = [];
    for (let i = 0; i < 320; i++) { const a = r() * TAU, d = 0.36 + 0.24 * r(); grain.push({ x: Math.cos(a) * d * 1.1, y: 0.05 + Math.sin(a) * d * 1.05, rr: 0.004 + 0.01 * Math.pow(r(), 2) }); }
    const stipple = [];
    for (let i = 0; i < 90; i++) stipple.push({ x: -0.62 + 1.24 * r(), y: -0.5 + 1.1 * r(), rr: 0.005 + 0.01 * r() });
    // 手のつけ根から垂れる細い筋
    const runs = [];
    const xs = [-0.28, -0.1, 0.06, 0.2];
    for (const x of xs) runs.push({ x: x + (r() - 0.5) * 0.08, y: 0.5, sp: 0.5 + 0.45 * r(), n: 0.016 + 0.01 * r(), delay: 0.04 + 0.16 * r(), wob: (r() - 0.5) * 0.6, wp: r() * TAU });
    runs.push({ x: 0.4 + 0.04 * r(), y: 0.28, sp: 0.15 + 0.1 * r(), n: 0.014, delay: 0.1 + 0.1 * r(), wob: 0, wp: 0 });   // 右のふちの短い筋
    return { fingers, dabs, hollowEdge, heelEdge, grain, stipple, runs, liq: liquidState(), seed: S.seed * 5 + 17 };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    if (t < HIT) return;
    const size = P.size ?? 1;
    const c = P.center ?? { x: 0.5, y: 0.45 };
    const mirror = P.hand === 'left' ? -1 : 1;
    const tilt = (P.tilt ?? 0) * Math.PI / 180;
    const hu = 150 * u * size;                       // 手のひらの幅（px）
    const slam = 1 + 0.1 * (1 - easeOut((t - HIT) / 0.07, 2.5));   // ぶつかった直後だけ少し大きい
    const fade = P.stay ? 1 : 1 - smooth((t - 0.88) / 0.12);
    if (fade <= 0) return;
    const cx = c.x * W, cy = c.y * H;
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.scale(hu * slam * mirror, hu * slam);
      // 手のつけ根の濃いところ：下がふくらんだ形、まん中に下向きの三角の抜け
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const a = i / 60 * TAU;
        let rad = 1;
        for (const w of st.heelEdge) rad += w.amp * Math.sin(a * w.k + w.ph);
        const x = Math.cos(a) * 0.52 * rad, y = 0.16 + Math.sin(a) * (Math.sin(a) > 0 ? 0.38 : 0.4) * rad;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      // 親指のつけ根から手のひらの左へつながる帯
      g.beginPath(); g.ellipse(-0.36, 0.08, 0.16, 0.26, -0.3, 0, TAU); g.fill();
      // 右のふち（小指側）
      g.beginPath(); g.ellipse(0.4, -0.02, 0.1, 0.28, 0.15, 0, TAU); g.fill();
      // 手のひらの上のほうのしみ
      for (const d of st.dabs) { g.beginPath(); g.ellipse(d.x, d.y, d.rx, d.ry, d.rot, 0, TAU); g.fill(); }
      // 指
      for (const f of st.fingers) {
        const a = f.a * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), px = -dy, py = dx;
        const at = (q, side) => [f.bx + dx * f.len * q + px * side * f.w / 2, f.by + dy * f.len * q + py * side * f.w / 2];
        // 指先の腹（いちばん濃い、少し縦長）
        const [tx, ty] = at(1 - f.pad * 0.55, 0);
        g.beginPath(); g.ellipse(tx, ty, f.w * 0.5, f.len * f.pad * 0.6, a, 0, TAU); g.fill();
        const [t2x, t2y] = at(1 - f.pad * 0.78, -0.15);
        g.beginPath(); g.ellipse(t2x, t2y, f.w * 0.38, f.len * f.pad * 0.3, a + 0.3, 0, TAU); g.fill();
        if (f.thumb) {   // 親指は手のひらまで続く
          const [mx, my] = at(0.45, 0.1);
          g.beginPath(); g.ellipse(mx, my, f.w * 0.42, f.len * 0.3, a, 0, TAU); g.fill();
        }
        for (const m of f.mids) {
          // 小さなしみを 3 つ重ねて、まだらに
          for (const [dq, ds, sc] of [[0, 0, 1], [0.06, 0.35, 0.6], [-0.05, -0.3, 0.55]]) { const [x, y] = at(m.q + dq, m.side + ds); g.beginPath(); g.ellipse(x, y, m.rx * sc, m.ry * sc, m.rot + dq * 9, 0, TAU); g.fill(); }
        }
        if (f.base) { const [x, y] = at(f.base.q, f.base.side); g.beginPath(); g.arc(x, y, f.base.rx, 0, TAU); g.fill(); }
      }
      // ふちの外の細かい点（乾いた筆の飛び）
      for (const s of st.stipple) { g.beginPath(); g.arc(s.x * 1.05, s.y, s.rr, 0, TAU); g.fill(); }
      // 抜け：手のひらのくぼみ（下向きの三角）と、かすれ
      g.globalCompositeOperation = 'destination-out';
      g.beginPath();
      // ふちが少しゆがんだ、丸みのある下向きの三角
      for (let i = 0; i <= 40; i++) {
        const q = i / 40 * TAU;
        const tri = 1 + 0.32 * Math.cos(3 * (q - Math.PI / 2));     // 3 つの角（下向き）
        let rad = 0.11 * tri;
        for (const w of st.hollowEdge) rad += 0.012 * Math.sin(q * w.k + w.ph);
        const x = -0.02 + Math.cos(q) * rad, y = -0.04 + Math.sin(q) * rad * 1.15;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      for (const s of st.grain) {
        // 上のほうほどかすれる（手のつけ根はあまり抜かない）
        g.beginPath(); g.arc(s.x, s.y, s.rr, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      g.restore();
      // 手のつけ根から垂れる細い筋（手の向きによらず、画面の下へ）
      const toScreen = (x, y) => {
        const X = x * hu * slam * mirror, Y = y * hu * slam;
        return [cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt)];
      };
      for (const run of st.runs) {
        const tt = t - HIT - run.delay;
        if (tt <= 0) continue;
        const p = toScreen(run.x, run.y);
        const L = hu * 1.45 * run.sp * easeOut(tt / 0.6, 1.6);
        drawStreak(g, p[0], p[1] - hu * 0.04, L, Math.max(1.6 * u, hu * run.n), { root: 2.6, wob: run.wob, wp: run.wp, H });
      }
      g.restore();
    }, { res: 1, u, edge: 1.5, dome: 10, style: 'stain', seed: st.seed, alpha: fade });
  }
};
