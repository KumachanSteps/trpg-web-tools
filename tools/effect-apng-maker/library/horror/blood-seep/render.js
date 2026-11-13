import { TAU, rng, rgba, shade, easeOut, clamp } from '../../_kit.js';

// 画面の四辺から血がにじむ。境目はなめらかな「ゆらぎ」で不揃いに
function edgeNoise(r) {
  const waves = [];
  for (let i = 0; i < 5; i++) waves.push({ f: 1 + Math.floor(r() * 7) + i * 2, ph: r(), a: 0.5 / (i + 1) });
  return s => waves.reduce((sum, wv) => sum + wv.a * Math.sin(TAU * (wv.f * s + wv.ph)), 0);
}

export default {
  setup(P, S) {
    const r = rng(S.seed + 21);
    return { edges: [0, 1, 2, 3].map(() => ({ n: edgeNoise(r), n2: edgeNoise(r) })) };
  },
  draw(ctx, t, P, st, S) {
    const { w, h } = S;
    const g = S.play === 'loop' ? P.amount * (0.9 + 0.1 * Math.sin(TAU * t)) : easeOut(t) * P.amount;
    if (g <= 0.002) return;
    const deep = Math.min(w, h) * 0.34 * g;
    const dark = shade(P.color, -0.55);
    const sides = [
      { len: w, at: (s, d) => [s * w, d], grad: [0, 0, 0, 1] },
      { len: w, at: (s, d) => [s * w, h - d], grad: [0, h, 0, -1] },
      { len: h, at: (s, d) => [d, s * h], grad: [0, 0, 1, 0] },
      { len: h, at: (s, d) => [w - d, s * h], grad: [w, 0, -1, 0] }
    ];
    sides.forEach((side, i) => {
      const e = st.edges[i];
      const scale = side.len === w ? 1 : h / w;
      for (const pass of [{ k: 1.35, a: 0.28 }, { k: 1, a: 0.92 }]) {
        ctx.beginPath();
        const steps = 72;
        const first = side.at(0, 0);
        ctx.moveTo(first[0], first[1]);
        for (let j = 0; j <= steps; j++) {
          const s = j / steps;
          const corner = 0.55 + 0.45 * Math.min(1, Math.min(s, 1 - s) * 6) ** 0.5;
          const d = deep * scale * pass.k * clamp(0.5 + 0.45 * e.n(s) + 0.2 * e.n2(s * 3) * g, 0.05, 1.4) / corner;
          const [x, y] = side.at(s, d);
          ctx.lineTo(x, y);
        }
        const last = side.at(1, 0);
        ctx.lineTo(last[0], last[1]);
        ctx.closePath();
        const [gx, gy, dx, dy] = side.grad;
        const reach = deep * scale * pass.k * 1.4;
        const lg = ctx.createLinearGradient(gx, gy, gx + dx * reach, gy + dy * reach);
        lg.addColorStop(0, rgba(dark, pass.a));
        lg.addColorStop(0.55, rgba(P.color, pass.a * 0.95));
        lg.addColorStop(1, rgba(P.color, pass.a * 0.7));
        ctx.fillStyle = lg;
        ctx.fill();
      }
    });
  }
};
