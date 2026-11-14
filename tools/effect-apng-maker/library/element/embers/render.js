import { TAU, makeParticles, wrap, glowDot, rgba, shade, clamp } from '../../kit.js';

export default {
  setup(P, S) {
    const n = Math.round(70 * P.density);
    const list = makeParticles(n, S.seed);
    list.forEach(q => {
      q.k = Math.max(1, Math.round((0.12 + 0.22 * q.z) * S.duration)); // 1ループで昇る回数
      q.m = 1 + Math.floor(q.k0 * 3);
      q.f = 2 + Math.floor(q.k1 * 4);
    });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    const core = shade(P.color, 0.55);
    for (const q of st.list) {
      const u = wrap(q.y + q.k * t);                 // 0=下 → 1=上
      const y = h * (1.05 - u * 1.15);
      const x = (wrap(q.x + P.wind * 0.18 * u) * 1.1 - 0.05) * w + Math.sin(TAU * (q.m * t + q.phase)) * 10 * unit;
      const fade = clamp(u / 0.12) * (1 - u) ** 1.3;
      const flick = 0.65 + 0.35 * Math.sin(TAU * (q.f * t + q.k2));
      const a = fade * flick;
      const r = (1.2 + 2.4 * q.z) * unit;
      glowDot(ctx, x, y, r * 4, P.color, a * 0.55);
      ctx.fillStyle = rgba(core, a);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, TAU);
      ctx.fill();
    }
  }
};
