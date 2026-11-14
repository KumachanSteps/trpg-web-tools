import { easeInOut, span } from '../../_kit.js';

// 映画のような黒帯。in は帯が入ってきて止まる、out は帯が出ていく
export default {
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    let k = easeInOut(span(t, 0, P.slide));
    if (P.mode === 'out') k = 1 - k;
    const bar = Math.round(h * P.height * k);
    if (bar <= 0) return;
    ctx.fillStyle = P.color;
    ctx.fillRect(0, 0, w, bar);
    ctx.fillRect(0, h - bar, w, bar);
  }
};
