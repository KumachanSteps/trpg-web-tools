import { rng, boltPath, strokePath, rgba, span, clamp } from '../../kit.js';

export default {
  setup(P, S) {
    const { w, h } = S;
    const r = rng(S.seed + 3);
    const tx = P.target.x * w, ty = P.target.y * h;
    const sx = tx + (r() - 0.5) * w * 0.35;
    const main = boltPath(sx, -h * 0.05, tx, ty, r, 0.2, 7);
    const branches = [];
    for (let i = 0; i < Math.round(P.branches); i++) {
      const from = main[Math.floor(main.length * (0.15 + 0.6 * r()))];
      const ang = Math.PI / 2 + (r() - 0.5) * 1.6;
      const len = h * (0.12 + 0.22 * r());
      const pts = boltPath(from[0], from[1], from[0] + Math.cos(ang) * len, from[1] + Math.sin(ang) * len, r, 0.3, 5);
      branches.push({ pts, at: from[1] / ty });
    }
    return { main, branches };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.width;
    const grow = span(t, 0.06, 0.16);          // 稲妻が伸びる
    const life = span(t, 0.16, 0.62);          // 光ったあと消えていく
    if (grow <= 0) return;
    const flicker = t < 0.3 ? (Math.floor(t * S.duration * 30) % 3 === 1 ? 0.55 : 1) : 1;
    const alpha = (1 - life) ** 1.4 * flicker;
    if (alpha <= 0.003) return;
    // 画面の閃光
    if (grow >= 1) {
      const flash = Math.exp(-life * 9) * P.flash;
      ctx.fillStyle = rgba(P.glow, flash * 0.6);
      ctx.fillRect(0, 0, w, h);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const passes = [[14, P.glow, 0.18], [6, P.glow, 0.45], [2.2, P.color, 1]];
    for (const [lw, col, a] of passes) {
      ctx.strokeStyle = rgba(col, a * alpha);
      ctx.lineWidth = lw * unit;
      strokePath(ctx, st.main, grow);
      ctx.lineWidth = lw * unit * 0.55;
      for (const b of st.branches) {
        const g = clamp((grow - b.at * 0.8) / 0.3);
        if (g > 0) strokePath(ctx, b.pts, g);
      }
    }
  }
};
