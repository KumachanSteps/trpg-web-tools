import { rgba, span } from '../../kit.js';

export default {
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const rise = span(t, 0, 0.06);
    const a = (t < 0.06 ? rise : Math.exp(-(t - 0.06) * S.duration * P.decay)) * P.intensity;
    if (a < 0.004) return;
    if (P.shape === 'radial') {
      const cx = P.center.x * w, cy = P.center.y * h;
      const R = Math.hypot(w, h) * (0.35 + 0.5 * Math.min(1, t * 4));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, rgba(P.color, a));
      g.addColorStop(0.5, rgba(P.color, a * 0.6));
      g.addColorStop(1, rgba(P.color, 0));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = rgba(P.color, a);
    }
    ctx.fillRect(0, 0, w, h);
  }
};
