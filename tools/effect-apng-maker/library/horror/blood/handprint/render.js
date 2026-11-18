// 血まみれの手のひらが、画面（ガラス）にバン！と押しつけられ、手の形の血の跡が残って下へ垂れる（1回再生）
// 押しつけた瞬間は少し大きく、すぐに元の大きさへ。指先と手のつけ根から血の筋が伝い、まわりに細かいしぶき
// 手の跡はかすれ（指の関節・手のひらのしわ・皮ふの小さなすき間）を抜いて、塗りつぶしの影にならないようにする
import { rng, clamp, smooth } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';
import { drawStreak } from '../streak.js';

const TAU = Math.PI * 2;
const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
const HIT = 0.06;   // 手がぶつかる時刻

// 手の形（手のひらの中心が原点、y は下向き、手のひらの幅がおよそ 1）。右手を画面の向こうから押しつけた形
const FINGERS = [
  // 付け根の位置, 向き（上から右回り、度）, 長さ, 太さ
  { bx: -0.34, by: -0.42, a: -11, len: 0.86, w: 0.2 },   // 人さし指
  { bx: -0.11, by: -0.5, a: -3, len: 0.98, w: 0.21 },    // 中指
  { bx: 0.13, by: -0.47, a: 5, len: 0.9, w: 0.2 },       // 薬指
  { bx: 0.35, by: -0.36, a: 15, len: 0.7, w: 0.175 }     // 小指
];
const THUMB = { bx: -0.4, by: 0.16, a: -55, len: 0.74, w: 0.26 };

export default {
  setup(P, S) {
    const r = rng(S.seed * 17 + 3);
    // 手の形を少しずつばらつかせる
    const fingers = FINGERS.map(f => ({ ...f, a: f.a + (r() - 0.5) * 6, len: f.len * (0.95 + 0.1 * r()) }));
    const thumb = { ...THUMB, a: THUMB.a + (r() - 0.5) * 8 };
    // 皮ふのかすれ（小さな穴）
    const pores = [];
    for (let i = 0; i < 40; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.42; pores.push({ x: Math.cos(a) * d * 0.9, y: 0.05 + Math.sin(a) * d, rr: 0.008 + 0.016 * r() }); }
    const hollow = [];
    for (let i = 0; i < 5; i++) hollow.push({ x: 0.04 + (r() - 0.5) * 0.14, y: 0.06 + (r() - 0.5) * 0.16, rx: 0.025 + 0.035 * r(), ry: 0.03 + 0.045 * r(), a: r() * Math.PI });
    // 指先と手のつけ根から垂れる筋
    const runs = [];
    fingers.forEach((f, i) => { if (r() < 0.55) runs.push({ from: 'finger', i, sp: 0.4 + 0.5 * r(), n: 0.045 + 0.02 * r(), delay: 0.04 + 0.16 * r(), wob: r() - 0.5, wp: r() * TAU }); });
    for (let i = 0; i < 3; i++) runs.push({ from: 'heel', x: -0.3 + 0.6 * (i + r() * 0.6) / 3, sp: 0.6 + 0.6 * r(), n: 0.05 + 0.025 * r(), delay: 0.02 + 0.12 * r(), wob: r() - 0.5, wp: r() * TAU });
    // まわりの細かいしぶき
    const spats = [];
    for (let i = 0; i < 22; i++) { const a = r() * TAU; spats.push({ a, d: 1.0 + 0.7 * r(), rr: 0.012 + 0.03 * r() }); }
    // ふちのにじみ（手のまわりの小さなかたまり）
    const blobs = [];
    for (let i = 0; i < 16; i++) blobs.push({ a: r() * TAU, k: 0.92 + 0.12 * r(), rr: 0.04 + 0.05 * r() });
    return { fingers, thumb, pores, hollow, runs, spats, blobs, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    if (t < HIT) return;
    const size = P.size ?? 1;
    const c = P.center ?? { x: 0.5, y: 0.56 };
    const mirror = P.hand === 'left' ? -1 : 1;
    const tilt = (P.tilt ?? 0) * Math.PI / 180;
    const hu = 160 * u * size;                       // 手のひらの幅（px）
    const slam = 1 + 0.12 * (1 - easeOut((t - HIT) / 0.07, 2.5));   // ぶつかった直後だけ少し大きい
    const sp = easeOut((t - HIT) / 0.1, 2.4);       // しぶきが飛ぶ
    const fade = P.stay ? 1 : 1 - smooth((t - 0.86) / 0.14);
    if (fade <= 0) return;
    const cx = c.x * W, cy = c.y * H;
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      g.save();
      g.translate(cx, cy);
      g.rotate(tilt);
      g.scale(hu * slam * mirror, hu * slam);
      // 手のひら：上がやや広い丸み、下（手のつけ根）は少し細い
      g.beginPath();
      g.moveTo(-0.46, -0.38);
      g.bezierCurveTo(-0.2, -0.56, 0.22, -0.54, 0.44, -0.34);
      g.bezierCurveTo(0.56, -0.05, 0.5, 0.32, 0.34, 0.5);
      g.bezierCurveTo(0.12, 0.64, -0.2, 0.64, -0.36, 0.5);
      g.bezierCurveTo(-0.56, 0.3, -0.58, -0.12, -0.46, -0.38);
      g.closePath(); g.fill();
      // 指（関節のところで少しくびれる）
      const finger = f => {
        const a = f.a * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
        const px = -dy, py = dx;
        const w0 = f.w / 2, w1 = f.w / 2 * 0.86;
        const ex = f.bx + dx * f.len * 0.9, ey = f.by + dy * f.len * 0.9;
        g.beginPath();
        g.moveTo(f.bx + px * w0, f.by + py * w0);
        g.lineTo(ex + px * w1, ey + py * w1);
        g.lineTo(ex - px * w1, ey - py * w1);
        g.lineTo(f.bx - px * w0, f.by - py * w0);
        g.closePath(); g.fill();
        g.beginPath(); g.arc(f.bx, f.by, w0 * 1.05, 0, TAU); g.fill();
        // 指先は丸く、少しふくらむ
        const tx = f.bx + dx * f.len, ty = f.by + dy * f.len;
        g.beginPath(); g.ellipse(tx - dx * f.w * 0.3, ty - dy * f.w * 0.3, f.w * 0.55, f.w * 0.62, a, 0, TAU); g.fill();
      };
      st.fingers.forEach(finger);
      finger(st.thumb);
      // ふちのにじみ
      for (const b of st.blobs) {
        g.beginPath(); g.arc(Math.cos(b.a) * 0.5 * b.k, Math.sin(b.a) * 0.56 * b.k, b.rr, 0, TAU); g.fill();
      }
      // かすれ：指の関節・手のひらのしわ・皮ふのすき間を抜く
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      const crease = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); g.stroke(); };
      for (const f of [...st.fingers, st.thumb]) {
        const a = f.a * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), px = -dy, py = dx;
        for (const q of [0.34, 0.66]) {
          const x = f.bx + dx * f.len * q, y = f.by + dy * f.len * q, w = f.w * 0.3;
          crease([x + px * w, y + py * w, x + dx * 0.015, y + dy * 0.015, x - px * w * 0.4, y - py * w * 0.4], 0.016);
        }
      }
      crease([-0.05, -0.27, 0.15, -0.31, 0.4, -0.22], 0.016);   // 感情線（途中まで）
      crease([-0.38, -0.06, -0.1, -0.05, 0.12, 0.06], 0.014);   // 頭脳線（途中まで）
      crease([-0.33, -0.12, -0.24, 0.16, -0.16, 0.42], 0.016);  // 生命線
      // 手のひらのくぼみ（ガラスにつかないところ）：ふちがでこぼこの抜け
      for (const h of st.hollow) { g.beginPath(); g.ellipse(h.x, h.y, h.rx, h.ry, h.a, 0, TAU); g.fill(); }
      for (const p of st.pores) { g.beginPath(); g.arc(p.x, p.y, p.rr, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      // まわりのしぶき
      for (const s of st.spats) {
        const d = s.d * (0.6 + 0.4 * sp);
        g.beginPath(); g.arc(Math.cos(s.a) * d * 0.62, Math.sin(s.a) * d * 0.8 - 0.15, s.rr * Math.min(1, sp * 1.4), 0, TAU); g.fill();
      }
      g.restore();
      // 垂れる筋（手の向きによらず、画面の下へ）
      const toScreen = (x, y) => {
        const X = x * hu * slam * mirror, Y = y * hu * slam;
        return [cx + X * Math.cos(tilt) - Y * Math.sin(tilt), cy + X * Math.sin(tilt) + Y * Math.cos(tilt)];
      };
      for (const run of st.runs) {
        const tt = t - HIT - run.delay;
        if (tt <= 0) continue;
        let p;
        if (run.from === 'finger') {
          const f = st.fingers[run.i], a = f.a * Math.PI / 180;
          p = toScreen(f.bx + Math.sin(a) * f.len * 0.88, f.by - Math.cos(a) * f.len * 0.88);
        } else p = toScreen(run.x, 0.5);
        const L = H * 0.3 * run.sp * size * easeOut(tt / 0.65, 1.7);
        drawStreak(g, p[0], p[1], L, hu * run.n, { root: 2.4, wob: run.wob, wp: run.wp, H });
      }
      g.restore();
    }, { res: 0.8, u, edge: 2.2, dome: 8, style: 'rim', alpha: fade });
  }
};
