import { TAU, makeParticles, wrap, rgba, glowDot } from '../../_kit.js';

export default {
  setup(P, S) {
    const large = P.flake === 'large';
    const list = makeParticles(Math.round((large ? 110 : 240) * P.amount), S.seed);
    list.forEach(q => {
      q.k = Math.max(1, Math.round((large ? 0.16 : 0.11) * (0.6 + 0.8 * q.z) * S.duration * (1 + P.wind * 0.3)));
      q.m = 1 + Math.floor(q.k0 * 2);
    });
    return { list, large };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    for (const q of st.list) {
      const u = wrap(q.y + q.k * t);
      const y = u * (h + 40 * unit) - 20 * unit;
      const x = wrap(q.x + P.wind * 0.12 * u) * (w + 40 * unit) - 20 * unit + Math.sin(TAU * (q.m * t + q.phase)) * 14 * unit;
      const a = 0.45 + 0.5 * q.z;
      if (st.large) {
        const r = (2.4 + 4 * q.z) * unit;
        glowDot(ctx, x, y, r * 1.8, P.color, a);
      } else {
        ctx.fillStyle = rgba(P.color, a);
        ctx.beginPath();
        ctx.arc(x, y, (0.8 + 1.5 * q.z) * unit, 0, TAU);
        ctx.fill();
      }
    }
  }
};
