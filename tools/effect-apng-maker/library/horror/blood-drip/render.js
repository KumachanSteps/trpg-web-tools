// 上から血が何本もの太い筋になって流れ落ち、筋のすき間（アーチ形の穴）が下がりながら細くなって、画面を血で覆う（1回再生）
// 動きの見本は TK が送った「血が流れ落ちて画面を覆う」動画（2026-11-18）：
//   太さのまちまちな筋が速く下まで落ちる → 筋と筋の間は上が丸いアーチになり、そのアーチが下へ下がりながら幅もせばまる
//   → 最後は下から突き出た細い影のとげが小さくなって消える
// 形は「x ごとに血がどこまで来ているか（高さ）」の 1 本の線で作り、blood-liquid.js の style 'rim' で縁どりする
import { rng, clamp, smooth } from '../../kit.js';
import { liquidState, drawLiquid } from '../../blood-liquid.js';

const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const amount = P.amount ?? 1;
    const W0 = 960;   // 16:9 の幅（高さ 540 のとき）。大きさはこの単位で持つ
    // 筋とすき間を左から交互に並べる
    const cols = [], gaps = [];
    let x = -30 - 20 * r();
    for (;;) {
      const q = r();
      const w = q < 0.2 ? 12 + 12 * r() : q < 0.38 ? 86 + 60 * r() : 30 + 42 * r();
      cols.push({ a: x, b: x + w, t0: 0.16 * r(), sp: 0.8 + 0.6 * r(), lag: r(), stop: 0.3 + 0.5 * Math.pow(r(), 0.8) });
      x += w;
      if (x > W0 + 30) break;
      const g = (16 + 46 * Math.pow(r(), 0.9)) / amount;
      gaps.push({
        a: x, b: x + g,
        d0: 0.12 + 0.2 * r(),          // アーチが下がりはじめる時刻
        dur: 0.55 + 0.25 * r(),        // 下まで下がりきるまで
        c0: 0.42 + 0.3 * r(),          // 幅がせばまりはじめる時刻
        arch: 1.3 + 1.1 * r(),         // アーチの高さ（すき間の幅に対して）
        stop: 0.03 + 0.12 * r()       // 覆わないときに止まるアーチの高さ（画面の高さに対して）
      });
      x += g;
    }
    return { cols, gaps, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const sx = W / (960 * u);
    const cover = P.cover !== false;
    const band = 14 * u * smooth(t / 0.1);
    const far = H + 120 * u;
    // 筋の先までの長さ（速さは前の版のまま）
    const tipOf = c => {
      const q = clamp((t - c.t0) * c.sp * 2.1);
      if (q <= 0) return band;
      let L = (c.b - c.a) * u * 0.3 + H * 1.3 * Math.pow(q, 1.35) * (1 - 0.3 * c.lag);
      if (!cover) L = Math.min(L, c.stop * H);
      else L = Math.max(L, far * easeIn((t - 0.45) / 0.4));   // 覆うときは、遅い筋も最後は必ず下まで届く
      return band + L;
    };
    const tips = st.cols.map(tipOf);
    // x ごとの血の下の端
    const X = v => v * u * sx;
    const segs = [];
    st.cols.forEach((c, i) => segs.push({ kind: 'c', i, a: X(c.a), b: X(c.b) }));
    st.gaps.forEach((g, i) => segs.push({ kind: 'g', i, a: X(g.a), b: X(g.b) }));
    segs.sort((p, q) => p.a - q.a);
    const yAt = x => {
      let s = segs[0];
      for (const z of segs) { if (x >= z.a) s = z; else break; }
      if (s.kind === 'c') {
        const hw = (s.b - s.a) / 2, cx = (s.a + s.b) / 2;
        const e = Math.min(1, Math.abs(x - cx) / hw);
        const R = Math.min(hw, 40 * u) * 0.95;                   // 先の丸み
        return Math.max(band, tips[s.i] - R * (1 - Math.sqrt(1 - e * e)));
      }
      const g = st.gaps[s.i];
      const gw = s.b - s.a, cx = (s.a + s.b) / 2;
      const tipNear = x < cx ? tips[s.i] : tips[s.i + 1];
      // 幅がせばまる（両どなりの筋が太る）
      const close = cover ? easeIn((t - g.c0) / (0.97 - g.c0), 1.3) : 0;
      const hw = gw / 2 * (1 - close);
      const d = Math.abs(x - cx);
      if (d >= hw) return tipNear;
      // アーチのいちばん上が下がる
      let top = band + (far - band) * easeIn((t - g.d0) / g.dur, 1.5);
      if (!cover) top = Math.min(top, band + g.stop * H);
      const e = d / hw;
      const ah = Math.max(gw * g.arch, 30 * u);
      const yArch = top + ah * (1 - Math.sqrt(1 - e * e));
      return Math.max(band, Math.min(yArch, tipNear));
    };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      g.beginPath();
      g.moveTo(-60 * u, -60 * u);
      const step = 1.5 / k;
      for (let x = -40 * u; x <= W + 40 * u; x += step) g.lineTo(x, yAt(x));
      g.lineTo(W + 60 * u, -60 * u);
      g.closePath(); g.fill();
      g.restore();
    }, { res: 0.6, u, edge: 3.5, dome: 10, style: 'rim' });
  }
};
