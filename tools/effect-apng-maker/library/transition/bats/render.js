// コウモリの群れが画面を横切り、通ったあとを闇で覆う場面転換（コウモリの絵は文字画像APNGメーカーEXの部品）
import { loadEx } from '../../ex-bridge.js';
import { rng, easeInOut, wrap } from '../../kit.js';

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 41);
    const bats = Array.from({ length: Math.round(46 * P.amount) }, () => ({
      off: r(), y: r(), s: 0.45 + 0.75 * r() ** 1.5, ph: r(), f: 5 + Math.floor(r() * 4), tilt: (r() - 0.5) * 0.5
    })).sort((a, b) => a.s - b.s);
    return { Vamp: ex.Vampire, bats };
  },
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const unit = h / 540;
    const dir = P.from === 'right' ? -1 : 1;
    const e = easeInOut(p);
    const front = -0.35 * w + e * 1.75 * w;          // 群れの先頭（左から数えた位置）
    const edge = front - 0.1 * w;                    // ここまでを闇で覆う
    ctx.save();
    if (dir < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    if (edge > 0) {
      const g = ctx.createLinearGradient(edge - 0.12 * w, 0, edge + 0.04 * w, 0);
      g.addColorStop(0, P.color);
      g.addColorStop(1, P.color + '00');
      ctx.fillStyle = P.color;
      ctx.fillRect(0, 0, Math.min(w, edge - 0.12 * w), h);
      ctx.fillStyle = g;
      ctx.fillRect(Math.max(0, edge - 0.12 * w), 0, 0.16 * w, h);
    }
    for (const b of st.bats) {
      const x = front - b.off * 0.42 * w;
      const y = (b.y * 1.1 - 0.05) * h + Math.sin((p * 3 + b.ph) * Math.PI * 2) * 18 * unit;
      const flapPh = wrap(p * b.f + b.ph);
      const flap = flapPh < 0.5 ? flapPh * 2 : 2 - flapPh * 2;
      // 画面の外のものは描かない
      if (x < -120 * unit || x > w + 120 * unit) continue;
      st.Vamp.bat(ctx, x, y, b.s * 84 * unit * P.size, { flap, ang: b.tilt, dir: 1, rim: P.rim });
    }
    ctx.restore();
  }
};
