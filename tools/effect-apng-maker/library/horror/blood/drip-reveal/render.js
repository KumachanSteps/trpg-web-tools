// 「上から垂れる血」の逆：血で覆われた画面から、血が下へ流れ落ちて場面が見えてくる（1回再生）
// 血のかたまりの上の端が下がっていき、その後ろに、壁にしがみつくように細い筋が上へ残る。筋もあとから下へ流れ、最後は何も残らない
// 筋の形は「上から垂れる血」と同じ（streak.js）。向きだけ上下反対で、先はしずくにしない（流れ去る血のなごり）
import { rng, clamp } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';
import { drawStreak } from '../streak.js';

const TAU = Math.PI * 2;
const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);
const END = 0.68;   // かたまりが画面の下まで落ちきる時刻

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 29);
    const amount = P.amount ?? 1;
    const W0 = 960;
    const trails = [];
    let x = 6 + 20 * r();
    while (x < W0 - 4) {
      const long = r() < 0.4;
      trails.push({
        x,
        nw: long ? 16 + 12 * r() : 12 + 8 * r(),
        root: 1.8 + 1.0 * r(),
        s: long ? 0.42 + 0.14 * r() : 0.7 + 0.18 * r(),   // 筋の先が、かたまりより遅れて下がる度合い
        wob: (r() - 0.5) * 2, wp: r() * TAU
      });
      x += (r() < 0.15 ? 30 + 10 * r() : 60 + 60 * r()) / amount;
    }
    const lobes = [];
    for (let i = 0; i < 22; i++) lobes.push({ x: r() * W0, w: 40 + 60 * r(), d: 8 + 18 * r() });
    return { trails, lobes, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const sx = W / (960 * u);
    const top0 = -70 * u, far = H + 90 * u;
    const topAt = tt => top0 + (far - top0) * easeIn(tt / END, 1.7);
    const top = topAt(t);
    if (t >= 1) return;
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      // 下へ流れ落ちる血のかたまり
      if (top < H + 40 * u) {
        g.fillRect(-40 * u, top, W + 80 * u, H + 100 * u - top);
        for (const q of st.lobes) {
          g.beginPath(); g.ellipse(q.x * u * sx, top, q.w * u * 0.5, q.d * u, 0, 0, TAU); g.fill();
        }
      }
      // かたまりの上に残る筋（上へ向かって細くなる）
      for (const d of st.trails) {
        // 筋の先は遅れて下がり、最後に追いつく（終わりには何も残らない）
        const tip = topAt(t * d.s + (1 - d.s) * Math.pow(clamp((t - 0.55) / 0.43), 2));
        const L = top - tip;
        if (L <= 1 || tip > H + 30 * u) continue;
        drawStreak(g, d.x * u * sx, top, L, d.nw * u / 2, { root: d.root, wob: d.wob, wp: d.wp, H, dir: -1, bulb: false });
      }
      g.restore();
    }, { res: 0.8, u, edge: 2.4, dome: 8, style: 'rim' });
  }
};
