import { rng, rgba, span, smooth } from '../../kit.js';

// ちらついたあと、暗くなって止まる（1回再生向け）
export default {
  setup(P, S) {
    const r = rng(S.seed + 9);
    const n = 40;
    const pattern = Array.from({ length: n }, (_, i) => r() < 0.25 + 0.6 * (i / n));
    return { pattern, n };
  },
  draw(ctx, t, P, st, S) {
    let d;
    const flickerEnd = 0.55;
    if (t < flickerEnd) {
      const i = Math.floor((t / flickerEnd) * st.n);
      d = st.pattern[i] ? 0.82 : 0.06 * (i % 2);
    } else {
      d = 0.82 + 0.18 * smooth(span(t, flickerEnd, 0.85));
    }
    ctx.fillStyle = rgba(P.color, d * P.darkness);
    ctx.fillRect(0, 0, S.w, S.h);
  }
};
