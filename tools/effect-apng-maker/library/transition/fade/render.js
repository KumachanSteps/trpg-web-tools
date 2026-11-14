import { rgba, easeInOut } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    const a = P.curve === 'linear' ? p : easeInOut(p);
    ctx.fillStyle = rgba(P.color, a);
    ctx.fillRect(0, 0, S.w, S.h);
  }
};
