import { TAU, makeParticles, wrap, rgba } from '../../_kit.js';

export default {
  setup(P, S) {
    const drops = makeParticles(Math.round(200 * P.strength), S.seed);
    drops.forEach(q => { q.k = Math.max(1, Math.round((1.4 + 1.4 * q.z) * S.duration)); });
    const splashes = P.splash ? makeParticles(Math.round(40 * P.strength), S.seed + 5) : [];
    splashes.forEach(q => { q.k = Math.max(1, Math.round((1.5 + q.z) * S.duration)); });
    return { drops, splashes };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    const tan = Math.tan(P.angle * Math.PI / 180);
    const margin = Math.abs(tan) * h + 40 * unit;
    const span = w + margin * 2;
    ctx.lineCap = 'round';
    for (const q of st.drops) {
      const len = (14 + 20 * q.z) * unit * (0.7 + 0.3 * P.strength);
      const y = wrap(q.y + q.k * t) * (h + len * 2) - len;
      const x = wrap(q.x + tan * y / span) * span - margin;
      ctx.strokeStyle = rgba(P.color, 0.22 + 0.4 * q.z);
      ctx.lineWidth = (0.7 + 0.9 * q.z) * unit;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - tan * len, y - len);
      ctx.stroke();
    }
    for (const q of st.splashes) {
      const life = wrap(q.phase + q.k * t);
      if (life > 0.18) continue;
      const g = life / 0.18;
      const x = q.x * w, y = h * (0.86 + 0.13 * q.y);
      ctx.strokeStyle = rgba(P.color, 0.5 * (1 - g));
      ctx.lineWidth = unit;
      ctx.beginPath();
      ctx.ellipse(x, y, (3 + 9 * g) * unit, (1 + 2.5 * g) * unit, 0, 0, TAU);
      ctx.stroke();
    }
  }
};
