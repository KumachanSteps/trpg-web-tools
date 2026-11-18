// 画面の上の血の帯から、しずく形の血が何本も垂れ落ち、その後ろから血の幕が下りてきて画面を覆う（1回再生）
// 形の見本は TK の「上から垂れる血」の画像（2026-11-18）：波打つ帯、付け根が広がり、首が細く、先がしずく形にふくらむ。長さはまちまち
// 中は平らな暗い深紅、縁だけ細く明るい赤（blood-liquid.js の style 'rim'）。太さのちがう筋が、それぞれの速さで伸びる
import { rng, clamp, smooth } from '../../kit.js';
import { liquidState, drawLiquid } from '../../blood-liquid.js';

const TAU = Math.PI * 2;
const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const amount = P.amount ?? 1;
    const W0 = 960;   // 16:9 の幅（高さ 540 のとき）。大きさはこの単位で持つ
    // 垂れる筋：左から順に、すき間をあけて並べる
    const drips = [];
    let x = 10 + 40 * r();
    while (x < W0 - 10) {
      const w = r() < 0.15 ? 20 + 8 * r() : 32 + 30 * Math.pow(r(), 1.2);
      drips.push({
        x, w,
        t0: 0.2 * r(),
        sp: 0.75 + 0.7 * r(),
        lag: r(),
        stop: 0.12 + 0.55 * Math.pow(r(), 0.9),   // 覆わないときに止まる長さ（画面の高さに対して）
        wob: (r() - 0.5) * 2, wp: r() * TAU
      });
      x += w + (34 + 90 * r()) / amount;
    }
    // 帯の下の縁のゆるいふくらみ（垂れきらない血）
    const sags = [];
    for (let i = 0; i < 18; i++) sags.push({ x: r() * W0, w: 26 + 46 * r(), d: 6 + 16 * r() });
    return { drips, sags, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const sx = W / (960 * u);
    const cover = P.cover !== false;
    // 幕（帯）の下の端。覆うときは最後に画面の下まで、覆わないときは少しだけ下がる
    const bandMax = 48 * u;
    const sheetEnd = cover ? H + 80 * u : bandMax;
    const grow = smooth(t / 0.18);
    const sheet = cover
      ? bandMax * grow + (sheetEnd - bandMax) * easeIn((t - 0.22) / 0.74, 1.7)
      : bandMax * grow;
    // 筋の先までの長さ（速さは前の版のまま。覆わないときは筋ごとの長さで止まる）
    const lenOf = d => {
      const q = clamp((t - d.t0) * d.sp * 2.1);
      if (q <= 0) return 0;
      let L = d.w * u * 0.3 + (H * 1.3) * Math.pow(q, 1.35) * (1 - 0.3 * d.lag);
      if (!cover) L = Math.min(L, d.stop * H);
      return L;
    };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      // 帯（上からつながった血の面）
      g.fillRect(-40 * u, -60 * u, W + 80 * u, sheet + 60 * u);
      for (const q of st.sags) {
        g.beginPath(); g.ellipse(q.x * u * sx, sheet, q.w * u * 0.5, q.d * u * grow, 0, 0, TAU); g.fill();
      }
      // しずく形の筋：付け根は帯へ広がり（なだらかなすそ）、首は細く、先は丸くふくらむ
      for (const d of st.drips) {
        const L = lenOf(d);
        if (L <= 0.5) continue;
        const w = d.w * u, cx0 = d.x * u * sx;
        const bulbR = w * 0.6 * Math.min(1, 0.55 + L / (w * 3));   // 伸びはじめは小さく
        const cy = L - bulbR * 1.12;                                // しずくの中心（帯の下の端から）
        const neckEnd = Math.max(0, cy);
        const half = yr => {
          const f = clamp(yr / Math.max(1, neckEnd));
          const flare = 0.95 * Math.exp(-yr / (0.36 * w));            // 付け根のすそ
          const neck = w / 2 * (1 + flare) * (1 - 0.3 * f);         // 下へいくほど少し細く
          // しずくの手前でなめらかにふくらみ、しずくの幅につながる（首とのつなぎ目を作らない）
          const b = smooth((f - 0.62) / 0.38);
          return neck + (bulbR * 0.98 - neck) * b * b;
        };
        const xOf = yr => cx0 + d.wob * w * 0.06 * Math.sin(yr / H * 5 + d.wp);
        const steps = 28;
        g.beginPath();
        for (let j = 0; j <= steps; j++) { const yr = -10 * u + (neckEnd + 10 * u) * j / steps; const y = sheet + yr; const x = xOf(yr) - half(yr); j ? g.lineTo(x, y) : g.moveTo(x, y); }
        for (let j = steps; j >= 0; j--) { const yr = -10 * u + (neckEnd + 10 * u) * j / steps; g.lineTo(xOf(yr) + half(yr), sheet + yr); }
        g.closePath(); g.fill();
        // 先のしずく（少し縦長）
        g.beginPath(); g.ellipse(xOf(cy), sheet + cy, bulbR, bulbR * 1.12, 0, 0, TAU); g.fill();
      }
      g.restore();
    }, { res: 0.6, u, edge: 3.5, dome: 10, style: 'rim' });
  }
};
