// 画面の上の血の帯から、細い血の筋が何本も垂れ落ち、その後ろから帯が下りてきて画面を覆う（1回再生）
// 形の見本は TK の「垂れる血」のイラスト（2026-11-18）：
//   ・筋は細い。付け根は帯からじょうごのように広がり、下へ行くほどゆっくり細くなる
//   ・先は首が少しくびれてから、首より少し太い丸いしずくになる（半円で終わらせない）
//   ・長さはまちまち（画面の下まで届く長い筋、途中で止まる筋、帯のふちのこぶのような短い筋）
//   ・壁を伝う血なので、しずくが切れて落ちることはしない（TK 2026-11-18）
//   ・帯の中に泡のような穴は開けない（TK 2026-11-19）
// 中は平らな暗い深紅、縁だけ細く明るい赤（blood-liquid.js の style 'rim'）
import { rng, clamp, smooth } from '../../../kit.js';
import { liquidState, drawLiquid } from '../../../blood-liquid.js';

const TAU = Math.PI * 2;
const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const amount = P.amount ?? 1;
    const W0 = 960;   // 16:9 の幅（高さ 540 のとき）。大きさはこの単位で持つ
    const drips = [];
    let x = 8 + 24 * r();
    while (x < W0 - 4) {
      const kind = r();
      // long: 下まで届く / mid: 途中で止まる / stub: 帯のふちの短いこぶ
      const type = kind < 0.34 ? 'long' : kind < 0.72 ? 'mid' : 'stub';
      const nw = type === 'long' ? 12 + 8 * r() : type === 'mid' ? 9 + 6 * r() : 10 + 6 * r();   // 首の太さ
      drips.push({
        x, nw, type,
        root: 3 + 2.5 * r(),                       // 付け根の広がり（首の何倍か）
        t0: (type === 'long' ? 0.02 : 0.06) + 0.16 * r(),
        sp: 0.75 + 0.7 * r(),
        lag: r(),
        stop: type === 'long' ? 0.5 + 0.35 * r() : type === 'mid' ? 0.12 + 0.3 * r() : 0.035 + 0.05 * r(),
        _keep: [r(), r()],                            // 並びを v0.29 と同じにするため、乱数を同じだけ使う
        wob: (r() - 0.5) * 2, wp: r() * TAU
      });
      // ときどき 2 本が付け根を分け合うほど近い
      x += (r() < 0.18 ? 20 + 8 * r() : 42 + 40 * r()) / amount;
    }
    // 帯のふちのゆるいふくらみ
    const sags = [];
    for (let i = 0; i < 22; i++) sags.push({ x: r() * W0, w: 20 + 40 * r(), d: 4 + 10 * r() });
    return { drips, sags, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const sx = W / (960 * u);
    const cover = P.cover !== false;
    const bandMax = 34 * u;
    const grow = smooth(t / 0.16);
    const far = H + 80 * u;
    // 帯の下の端。覆うときは、筋が流れ落ちたあとで画面の下まで下りる
    const sheet = cover
      ? bandMax * grow + (far - bandMax) * easeIn((t - 0.3) / 0.66, 1.8)
      : bandMax * grow;
    // 筋の長さ（速さは前の版のまま）。止まる筋は stop で止まり、止まった時刻も返す
    const lenOf = d => {
      const q = clamp((t - d.t0) * d.sp * 2.1);
      if (q <= 0) return { L: 0, tStop: Infinity };
      const base = d.nw * u * 0.4, span = H * 1.3 * (1 - 0.3 * d.lag);
      const L = base + span * Math.pow(q, 1.35);
      const cap = (cover || d.type !== 'long') ? (d.type === 'long' ? Infinity : d.stop * H) : d.stop * H;
      if (L < cap) return { L, tStop: Infinity };
      const qs = Math.pow(clamp((cap - base) / span), 1 / 1.35);
      return { L: cap, tStop: d.t0 + qs / (d.sp * 2.1) };
    };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      // 帯
      g.fillRect(-40 * u, -60 * u, W + 80 * u, sheet + 60 * u);
      for (const q of st.sags) {
        g.beginPath(); g.ellipse(q.x * u * sx, sheet, q.w * u * 0.5, q.d * u * grow, 0, 0, TAU); g.fill();
      }
      for (const d of st.drips) {
        const { L } = lenOf(d);
        if (L <= 0.5) continue;
        const n = d.nw * u / 2;                                  // 首の半分の太さ
        const cx0 = d.x * u * sx;
        const bR = n * 1.32 * Math.min(1, 0.55 + L / (n * 10));   // 先のしずく（首より少し太い）
        const cy = L - bR * 1.05;                                 // しずくの中心（帯の下の端から）
        const neckEnd = Math.max(0, cy);
        const lam = Math.min(n * 6.5, 0.3 * L + n);              // じょうごの長さ
        const half = yr => {
          const f = clamp(yr / Math.max(1, neckEnd));
          const funnel = (d.root - 1) * Math.exp(-Math.max(0, yr) / lam);
          let w = n * (1 + funnel) * (1 - 0.14 * f);              // 下へ行くほど少し細く
          // しずくの手前で首がくびれる
          const pinch = Math.exp(-Math.pow((yr - (cy - bR * 1.6)) / (bR * 1.1), 2));
          return w * (1 - 0.18 * pinch);
        };
        const xOf = yr => cx0 + d.wob * n * 0.5 * Math.sin(yr / H * 4 + d.wp);
        const steps = 36;
        g.beginPath();
        for (let j = 0; j <= steps; j++) { const yr = -12 * u + (neckEnd + 12 * u) * j / steps; const y = sheet + yr; const xx = xOf(yr) - half(yr); j ? g.lineTo(xx, y) : g.moveTo(xx, y); }
        for (let j = steps; j >= 0; j--) { const yr = -12 * u + (neckEnd + 12 * u) * j / steps; g.lineTo(xOf(yr) + half(yr), sheet + yr); }
        g.closePath(); g.fill();
        // 先のしずく：下がわずかに重い丸
        g.beginPath(); g.ellipse(xOf(cy), sheet + cy, bR, bR * 1.1, 0, 0, TAU); g.fill();
      }
      g.restore();
    }, { res: 0.8, u, edge: 2.4, dome: 8, style: 'rim' });
  }
};
