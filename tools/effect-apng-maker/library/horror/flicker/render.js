import { rng, rgba } from '../../_kit.js';

// 切れかけの蛍光灯。ふだんは少し暗い程度で、ときどき大きく落ちる
export default {
  setup(P, S) {
    const n = Math.max(4, Math.round(S.duration * 14));
    const r = rng(S.seed + 4);
    const levels = Array.from({ length: n }, () => {
      const v = r();
      if (v < P.rate * 0.35) return 0.75 + 0.2 * r();
      if (v < P.rate * 0.6) return 0.35 + 0.2 * r();
      return 0.04 * r();
    });
    return { levels, n };
  },
  draw(ctx, t, P, st, S) {
    const d = st.levels[Math.floor(t * st.n) % st.n] * P.darkness;
    if (d < 0.004) return;
    ctx.fillStyle = rgba(P.color, d);
    ctx.fillRect(0, 0, S.w, S.h);
  }
};
