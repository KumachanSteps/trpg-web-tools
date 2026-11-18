// 画面の上から、太い血の筋が何本も垂れ落ち、その後ろから血の幕が下りてきて画面を覆う（1回再生）
// 中は平らな暗い深紅、縁だけ細く明るい赤（blood-liquid.js の style 'rim'）。太さのちがう筋が、それぞれの速さで伸びる
import { rng, clamp, smooth } from '../../kit.js';
import { liquidState, drawLiquid } from '../../blood-liquid.js';

const TAU = Math.PI * 2;
const easeIn = (x, p = 1.6) => Math.pow(clamp(x), p);

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const amount = P.amount ?? 1;
    // 筋を左から順に並べる（太さ・すき間は 540 の高さのときの px）。すき間はせまく、太さはそろいぎみに、ときどき太いもの・細いもの
    const drips = [];
    const W0 = 960;   // 16:9 の幅（高さ 540 のとき）
    let x = -10 - 20 * r();
    while (x < W0 + 30) {
      const kind = r();
      const w = (kind < 0.14 ? 15 + 8 * r() : kind > 0.86 ? 78 + 34 * r() : 28 + 40 * Math.pow(r(), 1.3)) / amount;
      drips.push({
        x: x + w / 2,                 // 中心（540 の高さのときの px）
        w,
        t0: 0.2 * r(),
        sp: 0.75 + 0.7 * r(),
        lag: r(),
        wob: (r() - 0.5) * 2, wf: 2 + 3 * r(), wp: r() * TAU,
        taper: 0.12 + 0.14 * r()      // 上ほど少し太い
      });
      x += w + (14 + 48 * Math.pow(r(), 1.2)) / Math.sqrt(amount);
    }
    // 右端は最後の筋が画面の外まではみ出すようにする（端に四角いすき間が残らないように）
    const last = drips[drips.length - 1];
    if (last.x + last.w / 2 < W0 + 8) last.x = W0 + 8 - last.w / 2 + last.w;
    return { drips, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const sx = W / (960 * u);         // 横長・縦長でも端から端まで並ぶように
    const cover = P.cover !== false;
    // 幕（上からつながった血の面）の下の端。覆うときは最後に画面の下まで、覆わないときは 4 割ほどで止まる
    const sheetEnd = cover ? H + 60 * u : H * 0.4;
    const sheet = 6 * u + (sheetEnd - 6 * u) * (cover ? easeIn((t - 0.22) / 0.74, 1.7) : smooth((t - 0.2) / 0.6));
    // 筋の先の位置（速さは前の版のまま）
    const tipOf = d => {
      const q = clamp((t - d.t0) * d.sp * 2.1);
      if (q <= 0) return -1;
      return Math.max(sheet, 0) + d.w * u * 0.3 + (H * 1.3) * Math.pow(q, 1.35) * (1 - 0.3 * d.lag);
    };
    // 高さ y での筋の左右の端
    const edges = (d, y) => {
      const w = d.w * u;
      const f = clamp(y / H);
      const half = w / 2 * (1 + d.taper * (1 - f) - 0.02 * Math.sin(f * 9 + d.wp));
      const cx = d.x * u * sx + d.wob * w * 0.035 * Math.sin(f * d.wf * TAU * 0.5 + d.wp);
      return [cx - half, cx + half, cx, half];
    };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      g.save();
      g.scale(k, k);
      // 幕
      g.fillRect(-40 * u, -60 * u, W + 80 * u, sheet + 60 * u);
      const tips = st.drips.map(tipOf);
      // 筋：両側の線をたどった細長い形と、丸くふくらんだ先
      st.drips.forEach((d, i) => {
        const tip = tips[i];
        if (tip < 0) return;
        const steps = 24;
        g.beginPath();
        for (let j = 0; j <= steps; j++) { const y = -20 * u + (tip + 20 * u) * j / steps; const [l] = edges(d, y); j ? g.lineTo(l, y) : g.moveTo(l, y); }
        for (let j = steps; j >= 0; j--) { const y = -20 * u + (tip + 20 * u) * j / steps; const [, rr] = edges(d, y); g.lineTo(rr, y); }
        g.closePath(); g.fill();
        const [, , cx, half] = edges(d, tip);
        g.beginPath(); g.ellipse(cx, tip, half * 1.07, half * 1.15, 0, 0, TAU); g.fill();
      });
      // 筋と筋のすき間の上を、丸いアーチにする（幕の下の端から、すき間の幅の半分だけ下がった所が頂点）
      for (let i = 0; i < st.drips.length - 1; i++) {
        const a = st.drips[i], b = st.drips[i + 1];
        const y0 = Math.max(sheet, 0);
        const [, ar] = edges(a, y0), [bl] = edges(b, y0);
        const gap = bl - ar;
        if (gap <= 1 * u) continue;
        const rad = gap / 2;
        if (Math.min(tips[i], tips[i + 1]) < y0 + rad * 2.2) continue;
        g.fillRect(ar - 0.5, y0 - 1, gap + 1, rad + 1);
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(ar + rad, y0 + rad, rad, 0, TAU); g.fill();
        g.restore();
      }
      g.restore();
    }, { res: 0.6, u, edge: 3.5, dome: 10, style: 'rim' });
  }
};
