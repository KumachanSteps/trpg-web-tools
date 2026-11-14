// 赤い月と、そのまわりを飛ぶコウモリ（月とコウモリの絵は文字画像APNGメーカーEXの部品）
import { loadEx } from '../../ex-bridge.js';
import { rng, wrap, TAU, cycles } from '../../kit.js';

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 7);
    const bats = Array.from({ length: Math.round(P.bats) }, (_, i) => ({
      x: r(), y: 0.12 + r() * 0.6, s: 0.35 + 0.65 * r(), ph: r(), k: Math.max(1, Math.round((0.12 + 0.12 * r()) * S.duration)),
      f: Math.max(2, Math.round((2.2 + r()) * S.duration)), bob: 1 + Math.floor(r() * 2), dir: i % 3 === 0 ? -1 : 1
    })).sort((a, b) => a.s - b.s);
    return { Vamp: ex.Vampire, bats, pulse: cycles(0.5, S.duration) };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    if (P.moon) st.Vamp.moon(ctx, P.pos.x * w, P.pos.y * h, P.moonSize * 110 * unit, 1, { color: P.color, pulse: 0.5 + 0.5 * Math.sin(TAU * st.pulse * t) });
    for (const b of st.bats) {
      const u = wrap(b.x + b.k * t * b.dir);
      const x = (u * 1.3 - 0.15) * w;
      const y = b.y * h + Math.sin(TAU * (b.bob * t + b.ph)) * 26 * unit;
      const fp = wrap(b.f * t + b.ph);
      const flap = fp < 0.5 ? fp * 2 : 2 - fp * 2;
      st.Vamp.bat(ctx, x, y, b.s * 46 * unit * P.size, { flap, dir: b.dir, ang: 0.12 * Math.sin(TAU * (b.bob * t + b.ph)), rim: P.color });
    }
  }
};
