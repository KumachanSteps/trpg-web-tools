// 画面の上から、太い血の筋が何本も垂れ落ち、その後ろから血の幕が下りてきて画面を覆う（1回再生）
// 中は平らな暗い深紅、縁だけ細く明るい赤（blood-liquid.js の style 'rim'）。太さのちがう筋が、それぞれの速さで伸びる
import { rng, clamp, smooth } from '../../kit.js';
import { liquidState, drawLiquid } from '../../blood-liquid.js';

const TAU = Math.PI * 2;
const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const n = Math.max(6, Math.round(16 * (P.amount ?? 1)));
    // 筋：横の位置・太さ（540 の高さのときの px）・出はじめ・落ちる速さ
    const drips = [];
    for (let i = 0; i < n; i++) {
      const big = r();
      drips.push({
        x: (i + 0.1 + 0.8 * r()) / n,
        w: 14 + 70 * big * big + 10 * r(),
        t0: 0.0 + 0.2 * r(),
        sp: 0.75 + 0.7 * r(),
        lag: r()                    // 幕に追いつかれるまでの遅れ（細いものほど先に飲みこまれる）
      });
    }
    // 細い筋（太い筋のあいだに少し）
    const thin = [];
    for (let i = 0; i < Math.round(n * 0.6); i++) {
      thin.push({ x: r(), w: 11 + 7 * r(), t0: 0.08 + 0.35 * r(), sp: 0.5 + 0.5 * r(), stop: 0.25 + 0.5 * r() });
    }
    return { drips, thin, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const cover = P.cover !== false;
    // 幕（上からつながった血の面）の下の端。覆うときは最後に画面の下まで、覆わないときは 4 割ほどで止まる
    const sheetEnd = cover ? H + 60 * u : H * 0.4;
    const sheet = 6 * u + (sheetEnd - 6 * u) * (cover ? easeIn((t - 0.22) / 0.74, 1.7) : smooth((t - 0.2) / 0.6));
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      // 幕
      g.fillRect(-40 * u, -60 * u, W + 80 * u, sheet + 60 * u);
      // 太い筋：先は丸く、上は幕へつながる。重さで少しずつ速くなる
      for (const d of st.drips) {
        const q = clamp((t - d.t0) * d.sp * 2.1);
        if (q <= 0) continue;
        const w = d.w * u;
        const tip = Math.max(sheet, 0) + w * 0.3 + (H * 1.3) * easeIn(q, 1.35) * (1 - 0.3 * d.lag);
        const x = d.x * W;
        g.fillRect(x - w / 2, -10 * u, w, tip + 10 * u);
        g.beginPath(); g.arc(x, tip, w / 2, 0, TAU); g.fill();
        // 付け根を少し広げて、幕となめらかにつなぐ
        g.beginPath(); g.ellipse(x, Math.max(sheet, 0), w * 0.75, w * 0.5, 0, 0, TAU); g.fill();
      }
      // 細い筋：短く伸びて止まる
      for (const d of st.thin) {
        const q = clamp((t - d.t0) * d.sp * 1.6);
        if (q <= 0) continue;
        const w = d.w * u;
        const tip = Math.max(sheet, 0) + w + H * d.stop * smooth(q);
        const x = d.x * W;
        g.fillRect(x - w / 2, -10 * u, w, tip + 10 * u);
        g.beginPath(); g.arc(x, tip, w / 2 * 1.1, 0, TAU); g.fill();
      }
      g.restore();
    }, { res: 0.6, u, edge: 3.5, dome: 10, style: 'rim' });
  }
};
