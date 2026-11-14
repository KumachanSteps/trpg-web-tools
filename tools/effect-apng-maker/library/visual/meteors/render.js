// 流れ星：尾を引いて流れ、きらめきの粉を残す（流れ星の絵は文字画像APNGメーカーEXの部品）
import { loadEx } from '../../ex-bridge.js';
import { rng, TAU } from '../../kit.js';

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 17);
    const n = Math.round(P.count);
    const D = S.duration;
    const list = Array.from({ length: n }, (_, i) => ({ tp: D * (i + 0.2 + 0.6 * r()) / n, x: 0.15 + 0.7 * r(), y: 0.12 + 0.4 * r(), sp: 0.8 + 0.4 * r(), big: r() < 0.3, seed: 1 + Math.floor(r() * 999) }));
    const stars = P.stars ? Array.from({ length: 60 }, () => ({ x: r(), y: r() * 0.8, s: 0.4 + r(), ph: r(), f: 1 + Math.floor(r() * 3) })) : [];
    return { Star: ex.Star, list, stars };
  },
  draw(ctx, t, P, st, S) {
    const { w, h, duration: D } = S;
    const unit = h / 540 * P.size;
    const sec = t * D;
    for (const s of st.stars) {
      const a = 0.35 + 0.35 * Math.sin(TAU * (s.f * t + s.ph));
      st.Star.softDot(ctx, s.x * w, s.y * h, 2.6 * s.s * unit, '#ffffff', a);
    }
    const ang = P.dir === 'left' ? Math.PI - 0.45 : 0.45;
    for (const m of st.list) {
      // ループのつなぎ目をまたぐ流れ星は、前後の周回ぶんも描く（ずっとループでも途切れない）
      for (const k of S.play === 'loop' ? [-1, 0, 1] : [0]) {
        st.Star.meteor(ctx, {
          tp: m.tp + k * D, x: m.x * w, y: m.y * h, ang, speed: 900 * unit * m.sp, len: 340 * unit, w: (m.big ? 4 : 3) * unit * P.width,
          color: P.color, pre: 0.3, post: 0.35, seed: m.seed, sparks: 12, big: m.big
        }, sec);
      }
    }
  }
};
