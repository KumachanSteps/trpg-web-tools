import { vignette, wrap } from '../../_kit.js';

const bump = (x, c, wd) => Math.exp(-(((x - c) / wd) ** 2));

export default {
  setup(P, S) {
    // ループの継ぎ目で拍がずれないよう、1ループの拍数を整数にそろえる
    return { beats: Math.max(1, Math.round(P.bpm * S.duration / 60)) };
  },
  draw(ctx, t, P, st, S) {
    const ph = wrap(t * st.beats);
    const pulse = Math.max(bump(ph, 0.04, 0.045), 0.75 * bump(ph, 0.22, 0.05), bump(ph, 1.04, 0.045));
    const strength = P.strength * (0.55 + 0.45 * pulse);
    vignette(ctx, S, P.color, strength, 0.5 - 0.16 * pulse, 0.98);
  }
};
