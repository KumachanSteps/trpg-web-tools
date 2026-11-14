import { TAU, makeParticles, wrap, glowDot, rgba, shade, clamp } from '../../kit.js';

export default {
  setup(P, S) {
    const list = makeParticles(Math.round(46 * P.amount), S.seed);
    list.forEach(q => {
      q.k = P.motion === 'float' ? 0 : Math.max(1, Math.round((0.05 + 0.08 * q.z) * S.duration));
      q.m = 1 + Math.floor(q.k0 * 2);
      q.f = 1 + Math.floor(q.k1 * 3);
    });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    const core = shade(P.color, 0.6);
    for (const q of st.list) {
      const u = wrap(q.y + q.k * t);
      const y = P.motion === 'float' ? q.y * h + Math.sin(TAU * (q.m * t + q.phase)) * 18 * unit : h * (1.05 - u * 1.1);
      const x = q.x * w + Math.cos(TAU * (q.m * t + q.k2)) * 16 * unit;
      const edge = P.motion === 'float' ? 1 : clamp(u / 0.15) * clamp((1 - u) / 0.25);
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * (q.f * t + q.phase)));
      const a = edge * tw;
      const r = (1.4 + 3 * q.z) * unit;
      glowDot(ctx, x, y, r * 5, P.color, a * 0.5);
      ctx.fillStyle = rgba(core, a * 0.95);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, TAU);
      ctx.fill();
    }
  }
};
