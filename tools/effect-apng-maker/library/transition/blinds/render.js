import { clamp, easeInOut } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const n = Math.round(P.count);
    const vertical = P.orient === 'vertical';
    const span = (vertical ? w : h) / n;
    const maxDelay = P.stagger * 0.5;
    // 現れるときも、覆うときと同じ向きに動かす（左／上の帯から順に、帯の左／上の側から透明になる）
    const reveal = !!S.revealing;
    const q = reveal ? 1 - p : p;
    ctx.fillStyle = P.color;
    for (let i = 0; i < n; i++) {
      const delay = n > 1 ? maxDelay * i / (n - 1) : 0;
      const local = easeInOut(clamp((q - delay) / (1 - maxDelay)));
      const a = Math.floor(i * span), full = Math.ceil(span) + 1;
      if (reveal) {
        const cut = Math.floor(span * local);
        if (local >= 1) continue;
        if (vertical) ctx.fillRect(a + cut, 0, full - cut, h);
        else ctx.fillRect(0, a + cut, w, full - cut);
      } else {
        if (local <= 0) continue;
        const size = Math.ceil(span * local) + (local >= 1 ? 1 : 0);
        if (vertical) ctx.fillRect(a, 0, size, h);
        else ctx.fillRect(0, a, w, size);
      }
    }
  }
};
