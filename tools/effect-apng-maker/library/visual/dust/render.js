import { TAU, makeParticles, glowDot, rgba } from '../../_kit.js';

// 差しこむ光の筋と、そのなかを漂う埃
export default {
  setup(P, S) {
    const list = makeParticles(Math.round(90 * P.amount), S.seed);
    list.forEach(q => { q.m = 1 + Math.floor(q.k0 * 2); q.n = 1 + Math.floor(q.k1 * 2); q.f = 1 + Math.floor(q.k2 * 3); });
    return { list };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    const ang = P.angle * Math.PI / 180;
    const dx = Math.sin(ang), dy = Math.cos(ang);       // 光の進む向き（上から下へ）
    const ox = w * P.origin, oy = -h * 0.05;
    const half = w * P.beamWidth * 0.5;
    const nx = dy, ny = -dx;                             // 光の筋に垂直な向き
    const breathe = 0.85 + 0.15 * Math.sin(TAU * t);
    if (P.beam) {
      const len = Math.hypot(w, h) * 1.3;
      const g = ctx.createLinearGradient(ox - nx * half, oy - ny * half, ox + nx * half, oy + ny * half);
      const a = 0.16 * breathe;
      g.addColorStop(0, rgba(P.color, 0));
      g.addColorStop(0.5, rgba(P.color, a));
      g.addColorStop(1, rgba(P.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox - nx * half * 0.6, oy - ny * half * 0.6);
      ctx.lineTo(ox + nx * half * 0.6, oy + ny * half * 0.6);
      ctx.lineTo(ox + nx * half * 1.6 + dx * len, oy + ny * half * 1.6 + dy * len);
      ctx.lineTo(ox - nx * half * 1.6 + dx * len, oy - ny * half * 1.6 + dy * len);
      ctx.closePath();
      ctx.fill();
    }
    for (const q of st.list) {
      const x = q.x * w + Math.sin(TAU * (q.m * t + q.phase)) * 24 * unit;
      const y = q.y * h + Math.cos(TAU * (q.n * t + q.k3)) * 16 * unit + Math.sin(TAU * t + q.phase * 6) * 6 * unit;
      const dist = Math.abs((x - ox) * nx + (y - oy) * ny);
      const inBeam = P.beam ? Math.max(0.15, 1 - dist / (half * 1.4)) : 0.8;
      const tw = 0.5 + 0.5 * Math.sin(TAU * (q.f * t + q.phase));
      const a = inBeam * (0.35 + 0.65 * tw) * (0.4 + 0.6 * q.z);
      glowDot(ctx, x, y, (1.2 + 2.2 * q.z) * unit * 2.2, P.color, a * 0.8);
    }
  }
};
