import { TAU, makeParticles, glowDot, wrap } from '../../kit.js';

// 光を受けて漂う埃。一方向へ、ふわふわと上下しながら流れていく
export default {
  setup(P, S) {
    const list = makeParticles(Math.round(90 * P.amount), S.seed);
    list.forEach(q => {
      q.k = Math.max(1, Math.round(P.speed * (0.05 + 0.07 * q.z) * S.duration));   // 1ループで横切る回数（手前ほど速い）
      q.m = 1 + Math.floor(q.k0 * 2); q.n = 1 + Math.floor(q.k1 * 3); q.f = 1 + Math.floor(q.k2 * 3);
    });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    const dir = P.dir === 'left' ? -1 : 1;
    for (const q of st.list) {
      const u = wrap(q.x + dir * q.k * t);
      const x = (u * 1.1 - 0.05) * w + Math.sin(TAU * (q.n * t + q.k3)) * 10 * unit;
      const y = q.y * h + Math.sin(TAU * (q.m * t + q.phase)) * 22 * unit + Math.sin(TAU * (q.n * t + q.k3 * 3)) * 8 * unit;
      const tw = 0.5 + 0.5 * Math.sin(TAU * (q.f * t + q.phase));
      const a = (0.35 + 0.65 * tw) * (0.4 + 0.6 * q.z);
      glowDot(ctx, x, y, (1.2 + 2.2 * q.z) * unit * 2.2 * P.size, P.color, a * 0.8);
    }
  }
};
