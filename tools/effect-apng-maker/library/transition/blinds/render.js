import { clamp, easeInOut } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const n = Math.round(P.count);
    const vertical = P.orient === 'vertical';
    const span = (vertical ? w : h) / n;
    const maxDelay = P.stagger * 0.5;
    ctx.fillStyle = P.color;
    for (let i = 0; i < n; i++) {
      const delay = n > 1 ? maxDelay * i / (n - 1) : 0;
      const local = easeInOut(clamp((p - delay) / (1 - maxDelay)));
      if (local <= 0) continue;
      const size = Math.ceil(span * local) + (local >= 1 ? 1 : 0);
      if (vertical) ctx.fillRect(Math.floor(i * span), 0, size, h);
      else ctx.fillRect(0, Math.floor(i * span), w, size);
    }
  }
};
