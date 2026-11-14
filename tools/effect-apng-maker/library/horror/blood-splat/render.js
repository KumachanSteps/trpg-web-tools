// 血しぶきが画面に飛び散り、筋になって垂れる（血の形は文字画像APNGメーカーEXの部品）
import { loadEx } from '../../ex-bridge.js';
import { rng, clamp } from '../../kit.js';

const SPOTS = [[0.5, 0.45, 1], [0.27, 0.32, 0.7], [0.74, 0.62, 0.8]];

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 3);
    const n = Number(P.count);
    const spots = SPOTS.slice(0, n).map(([x, y, k], i) => ({ x, y, k, delay: i * 0.18, drips: Array.from({ length: 3 }, () => ({ dx: (r() - 0.5) * 0.5, len: 0.4 + r() * 0.7, w: 0.6 + r() * 0.6, d: 0.2 + r() * 0.4 })) }));
    if (n === 1) spots[0].k = 1.15;
    return { Vamp: ex.Vampire, spots };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    const sec = t * S.duration;
    // 終わりに消えるときは最後の 25% で薄くする
    const fade = P.fadeOut ? 1 - clamp((t - 0.75) / 0.25) : 1;
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;
    for (const sp of st.spots) {
      const tt = sec - sp.delay;
      if (tt <= 0) continue;
      const x = sp.x * w, y = sp.y * h, u = 0.5 * unit * sp.k;
      // 垂れる筋（しぶきの下から伸びる）
      if (P.drip) for (const d of sp.drips) {
        const g = clamp((tt - d.d) / 1.6);
        if (g > 0) st.Vamp.drip(ctx, x + d.dx * 160 * u, y + 30 * u, g * d.len * 520 * u, d.w * 22 * u, 1);
      }
      st.Vamp.bloodSplat(ctx, x, y, u, tt, {});
    }
    ctx.restore();
  }
};
