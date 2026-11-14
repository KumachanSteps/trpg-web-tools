import { TAU, makeParticles, rgba } from '../../kit.js';

// 大きなもやの塊が、ゆっくり円をえがいて漂う（t=0 と t=1 で同じ位置に戻る）
export default {
  setup(P, S) {
    const list = makeParticles(P.mode === 'ground' ? 16 : 22, S.seed);
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const ground = P.mode === 'ground';
    const base = P.mode === 'dense' ? 0.32 : (ground ? 0 : 0.08);
    const amt = P.amount;
    if (base > 0) {
      ctx.fillStyle = rgba(P.color, base * amt);
      ctx.fillRect(0, 0, w, h);
    }
    if (ground) {
      const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
      g.addColorStop(0, rgba(P.color, 0));
      g.addColorStop(1, rgba(P.color, 0.55 * amt));
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }
    for (const q of st.list) {
      const ang = TAU * (t + q.phase) * (q.k0 > 0.5 ? 1 : -1);
      const cx = (q.x * 1.3 - 0.15) * w + Math.cos(ang) * w * 0.06;
      const cy = ground ? h * (0.72 + 0.3 * q.y) + Math.sin(ang) * h * 0.03 : (q.y * 1.2 - 0.1) * h + Math.sin(ang) * h * 0.05;
      const rx = w * (0.18 + 0.22 * q.z);
      const ry = rx * (ground ? 0.28 : 0.55);
      const breathe = 0.75 + 0.25 * Math.sin(TAU * (t + q.k1));
      const a = (P.mode === 'thin' ? 0.22 : 0.38) * amt * breathe;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(P.color, a));
      g.addColorStop(0.6, rgba(P.color, a * 0.45));
      g.addColorStop(1, rgba(P.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }
};
