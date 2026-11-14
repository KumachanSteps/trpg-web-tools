import { TAU, rng } from '../../kit.js';

// 漫画の集中線。数コマごとに線の並びが入れ替わる
export default {
  setup(P, S) {
    const sets = Math.max(1, Math.round(S.duration * P.speed));
    const n = Math.round(P.density);
    const all = [];
    for (let s = 0; s < sets; s++) {
      const r = rng(S.seed * 17 + s * 101);
      const lines = [];
      for (let i = 0; i < n; i++) lines.push({ a: (i + r() * 0.8) / n * TAU, wd: 0.25 + r() * 0.9, inn: 0.8 + r() * 0.55 });
      all.push(lines);
    }
    return { all, sets };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const cx = P.center.x * w, cy = P.center.y * h;
    const far = Math.hypot(w, h);
    const base = P.inner * Math.min(w, h) * 0.5;
    const lines = st.all[Math.floor(t * st.sets) % st.sets];
    ctx.fillStyle = P.color;
    for (const l of lines) {
      const half = l.wd * (TAU / lines.length) * 0.5 * P.weight;
      const r0 = base * l.inn;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0);
      ctx.lineTo(cx + Math.cos(l.a - half) * far, cy + Math.sin(l.a - half) * far);
      ctx.lineTo(cx + Math.cos(l.a + half) * far, cy + Math.sin(l.a + half) * far);
      ctx.closePath();
      ctx.fill();
    }
  }
};
