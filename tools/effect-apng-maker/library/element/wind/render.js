import { TAU, makeParticles, wrap, rgba } from '../../kit.js';

export default {
  setup(P, S) {
    const n = Math.round(26 * P.strength);
    const list = makeParticles(n, S.seed);
    list.forEach(q => { q.k = Math.max(1, Math.round((0.7 + 0.9 * q.z) * P.strength * S.duration)); });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const dir = P.dir === 'left' ? -1 : 1;
    const ang = P.angle * Math.PI / 180;
    const dx = Math.cos(ang) * dir, dy = Math.sin(ang);
    ctx.lineCap = 'round';
    for (const q of st.list) {
      const len = (0.12 + 0.25 * q.k0) * w * (0.6 + 0.4 * P.strength);
      const travel = w + len * 2;
      const s = wrap(q.x + q.k * t) * travel - len;  // 進んだ距離
      const x = dir > 0 ? s : w - s;
      const baseY = q.y * h * 1.1 - h * 0.05;
      const y = baseY + (s - w / 2) * Math.tan(ang) + Math.sin(TAU * (t + q.phase)) * h * 0.01;
      const tx = x - dx * len, ty = y - dy * len;
      const g = ctx.createLinearGradient(tx, ty, x, y);
      const a = 0.18 + 0.4 * q.z;
      g.addColorStop(0, rgba(P.color, 0));
      g.addColorStop(0.7, rgba(P.color, a * 0.6));
      g.addColorStop(1, rgba(P.color, a));
      ctx.strokeStyle = g;
      ctx.lineWidth = (0.8 + 1.6 * q.k1) * h / 540;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
};
