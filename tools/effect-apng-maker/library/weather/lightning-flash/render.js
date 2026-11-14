import { rgba, rng } from '../../kit.js';

// 画面全体が光る。1ループ（または1回）のなかで flashes 回
export default {
  setup(P, S) {
    const r = rng(S.seed);
    const n = Math.round(P.flashes);
    const start = S.play === 'loop' ? 0.08 : 0.04;
    const times = [];
    let at = start;
    for (let i = 0; i < n; i++) {
      times.push({ at, peak: i === 0 ? 1 : 0.55 + 0.4 * r() });
      at += 0.06 + 0.1 * r();
    }
    return { times };
  },
  draw(ctx, t, P, st, S) {
    const sec = t * S.duration;
    let a = 0;
    for (const f of st.times) {
      const dt = sec - f.at * S.duration;
      if (dt < 0) continue;
      a += f.peak * (dt < 0.03 ? dt / 0.03 : Math.exp(-(dt - 0.03) * 11));
    }
    a = Math.min(1, a) * P.intensity;
    if (a < 0.004) return;
    ctx.fillStyle = rgba(P.color, a);
    ctx.fillRect(0, 0, S.w, S.h);
  }
};
