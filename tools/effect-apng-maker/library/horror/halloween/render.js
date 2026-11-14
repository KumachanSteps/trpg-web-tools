// ハロウィンの夜：オレンジの満月、ふわふわ漂うおばけ、光るかぼちゃ、飛ぶコウモリ（絵は文字画像APNGメーカーEXの部品）
import { loadEx } from '../../ex-bridge.js';
import { rng, wrap, TAU } from '../../kit.js';

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 31);
    const D = S.duration;
    const n = P.amount;
    const ghosts = Array.from({ length: Math.round(3 * n) }, (_, i) => ({ x: r(), y: 0.25 + r() * 0.35, s: 0.7 + 0.5 * r(), ph: r(), k: (i % 2 ? 1 : -1) * Math.max(1, Math.round(0.07 * D)), b: 1 + Math.floor(r() * 2) }));
    const np = Math.max(1, Math.round(3 * n));
    const pumpkins = Array.from({ length: np }, (_, i) => ({ x: (i + 0.5) / np + (r() - 0.5) * 0.12, s: 0.7 + 0.5 * r(), ph: r(), f: 1 + Math.floor(r() * 3) }));
    const bats = Array.from({ length: Math.round(6 * n) }, () => ({ x: r(), y: 0.08 + r() * 0.3, s: 0.4 + 0.5 * r(), ph: r(), k: Math.max(1, Math.round((0.15 + 0.1 * r()) * D)), f: Math.max(2, Math.round((2.5 + r()) * D)) }));
    return { H: ex.Halloween, V: ex.Vampire, ghosts, pumpkins, bats };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    if (P.moon) st.H.moon(ctx, w * 0.8, h * 0.2, 92 * unit, 1);
    for (const b of st.bats) {
      const x = (wrap(b.x + b.k * t) * 1.3 - 0.15) * w;
      const fp = wrap(b.f * t + b.ph);
      st.V.bat(ctx, x, b.y * h + Math.sin(TAU * (t + b.ph)) * 14 * unit, b.s * 58 * unit, { flap: fp < 0.5 ? fp * 2 : 2 - fp * 2, rim: '#ff8a1e' });
    }
    for (const g of st.ghosts) {
      const x = (wrap(g.x + g.k * t) * 1.3 - 0.15) * w;
      const y = g.y * h + Math.sin(TAU * (g.b * t + g.ph)) * 22 * unit;
      st.H.ghost(ctx, x, y, g.s * 72 * unit, { sway: TAU * (g.b * t + g.ph), flip: g.k < 0, alpha: 0.92 });
    }
    for (const q of st.pumpkins) {
      const lit = 0.75 + 0.25 * Math.sin(TAU * (q.f * t + q.ph));
      st.H.pumpkin(ctx, q.x * w, h - 62 * unit * q.s, 64 * unit * q.s, { lit, rot: 0.05 * Math.sin(TAU * (t + q.ph)) });
    }
  }
};
