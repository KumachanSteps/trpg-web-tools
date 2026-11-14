import { TAU, makeParticles, wrap, rgba, shade, SHAPES } from '../../_kit.js';

export default {
  setup(P, S) {
    const list = makeParticles(Math.round(60 * P.amount), S.seed);
    list.forEach(q => {
      q.k = Math.max(1, Math.round(0.12 * (0.6 + 0.8 * q.z) * S.duration));
      q.m = 1 + Math.floor(q.k0 * 2);
      q.spin = (q.k1 > 0.5 ? 1 : -1) * (1 + Math.floor(q.k2 * 2));
    });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    const edge = shade(P.color, -0.18);
    for (const q of st.list) {
      const u = wrap(q.y + q.k * t);
      const y = u * (h + 60 * unit) - 30 * unit;
      const x = wrap(q.x + P.wind * 0.2 * u) * (w + 60 * unit) - 30 * unit + Math.sin(TAU * (q.m * t + q.phase)) * 22 * unit;
      const r = (5 + 6 * q.z) * unit;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(TAU * (q.spin * t + q.phase));
      ctx.scale(r * Math.cos(TAU * (q.m * t + q.k3)), r);
      SHAPES.sakura(ctx);
      ctx.restore();
      ctx.fillStyle = rgba(P.color, 0.6 + 0.35 * q.z);
      ctx.fill();
      ctx.strokeStyle = rgba(edge, 0.35);
      ctx.lineWidth = 0.6 * unit;
      ctx.stroke();
    }
  }
};
