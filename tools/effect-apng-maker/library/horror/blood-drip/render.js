// 血が画面の上の端からにじみ出て、何本も筋になって垂れていく（1回再生。最後の絵で止まる）
import { rng, clamp, smooth } from '../../kit.js';
import { liquidState, drawLiquid } from '../../blood-liquid.js';

const TAU = Math.PI * 2;

export default {
  setup(P, S) {
    const r = rng(S.seed * 7 + 11);
    const n = Math.round(14 * (P.amount ?? 1));
    // 上の端の帯：横にならんだ丸の厚み（ゆるい波＋ばらつき）
    const band = [];
    const ph1 = r() * TAU, ph2 = r() * TAU;
    for (let i = 0; i <= 64; i++) {
      const x = i / 64;
      band.push({ x, th: 0.55 + 0.25 * Math.sin(x * 7.3 + ph1) + 0.2 * Math.sin(x * 17.1 + ph2) + 0.25 * (r() - 0.5) });
    }
    // 帯の下の縁の小さなふくらみ（垂れきらなかった血だまり）
    const sags = [];
    for (let i = 0; i < 26; i++) sags.push({ x: r(), w: 6 + 14 * r(), d: 4 + 12 * r() });
    // 帯の表面のゆるいへこみ（つやの映りこみに変化をつける）
    const dents = [];
    for (let i = 0; i < 30; i++) dents.push({ x: r(), y: 0.05 + 0.3 * r(), r: 10 + 14 * r(), a: 0.07 + 0.08 * r() });
    // 垂れる筋：位置・太さ・長さ・出はじめ・止まり方
    const drips = [];
    for (let i = 0; i < n; i++) {
      const x = (i + 0.15 + 0.7 * r()) / n;
      const big = r();
      drips.push({
        x,
        w: 5 + 11 * big * big + 3 * r(),           // 太さ（540 の高さのときの px）
        len: 0.18 + 0.8 * Math.pow(r(), 0.8),        // 最後の長さ（画面の高さに対する割合）
        t0: 0.06 + 0.42 * r(),                       // 垂れはじめ（0〜1）
        sp: 0.55 + 0.6 * r(),                        // 速さ
        wob: (r() - 0.5) * 2, wf: 3 + 4 * r(), wp: r() * TAU,
        stall: 0.3 + 0.4 * r()                       // 途中でいったん止まる位置
      });
    }
    // 落ちる滴：長い筋の先から、とちゅうで1〜2滴離れて落ちる
    const drops = drips.filter(d => d.len > 0.55).slice(0, 3).map(d => ({ d, at: 0.55 + 0.25 * r() }));
    return { band, sags, dents, drips, drops, liq: liquidState() };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const reach = P.reach ?? 1;
    const bandMax = (P.band ?? 1) * 34 * u;
    // 帯は 0〜0.3 でにじみ出る
    const bandP = smooth(t / 0.3);
    // 垂れる筋の長さ（0〜1）。いったん止まってから、また伸びる
    const dripLen = d => {
      const q = clamp((t - d.t0) * d.sp * 1.6);
      if (q <= 0) return 0;
      const a = smooth(clamp(q / 0.45)) * d.stall;
      const b = smooth(clamp((q - 0.55) / 0.45)) * (1 - d.stall);
      return a + b;
    };
    drawLiquid(ctx, W, H, st.liq, (g, k) => {
      const s = k;
      // 上の端の帯
      if (bandP > 0) {
        for (const b of st.band) {
          const th = Math.max(0, b.th) * bandMax * bandP;
          const rr = (th + 10 * u) * s;
          g.beginPath(); g.arc(b.x * W * s, (th - 10 * u) * s, rr, 0, TAU); g.fill();
          g.fillRect((b.x * W - 12 * u) * s, -40 * u * s, 24 * u * s, (th + 30 * u) * s);
        }
      }
      // 帯の下の縁のふくらみ
      if (bandP > 0) {
        for (const q of st.sags) {
          const bi = st.band[Math.round(q.x * 64)];
          const y = Math.max(0, bi.th) * bandMax * bandP + q.d * u * bandP;
          g.beginPath(); g.ellipse(q.x * W * s, (y - q.w * u * 0.4) * s, q.w * u * s, q.w * u * 0.8 * s, 0, 0, TAU); g.fill();
        }
      }
      // 帯の表面のへこみ（形の内側を少しだけ薄くする。外形は変えずに、ふくらみだけが変わる）
      if (bandP > 0) {
        g.save();
        g.globalCompositeOperation = 'destination-out';
        for (const q of st.dents) {
          g.globalAlpha = q.a;
          g.beginPath(); g.ellipse(q.x * W * s, q.y * bandMax * bandP * s, q.r * u * 1.6 * s, q.r * u * bandP * 0.7 * s, 0, 0, TAU); g.fill();
        }
        g.restore();
      }
      // 筋
      for (const d of st.drips) {
        const L = dripLen(d) * d.len * H * reach;
        const bandTh = 20 * u * bandP;
        if (L <= 0.5) continue;
        const x0 = d.x * W, w = d.w * u;
        const tipR = w * 1.05;
        const steps = Math.max(3, Math.ceil(L / (w * 0.35)));
        for (let i = 0; i <= steps; i++) {
          const q = i / steps, y = bandTh + L * q;
          // 上は太く、下へいくほど少し細く、先は丸くふくらむ
          const rr = w * (0.6 - 0.2 * q + 0.07 * Math.sin(q * d.wf * 2.3 + d.wp * 3));
          const x = x0 + d.wob * w * 0.5 * Math.sin(q * d.wf + d.wp) * q;
          g.beginPath(); g.arc(x * s, y * s, rr * s, 0, TAU); g.fill();
        }
        const xe = x0 + d.wob * w * 0.5 * Math.sin(d.wf + d.wp);
        g.beginPath(); g.arc(xe * s, (bandTh + L) * s, tipR * s, 0, TAU); g.fill();
        // 付け根を広げて、帯とつながって見えるようにする
        g.beginPath(); g.ellipse(x0 * s, bandTh * s, w * 1.3 * s, w * 1.2 * s, 0, 0, TAU); g.fill();
      }
      // 落ちる滴（落ちはじめてから加速して画面の外へ）
      for (const o of st.drops) {
        const d = o.d;
        const qd = clamp((t - d.t0) * d.sp * 1.6);
        if (qd < o.at || dripLen(d) < 0.98) continue;
        const ft = (t - (d.t0 + o.at / (d.sp * 1.6)));
        if (ft <= 0) continue;
        const y = 20 * u * bandP + d.len * H * reach + d.w * u * 1.4 + 0.5 * 9.8 * 140 * u * ft * ft * 4;
        if (y > H + 40 * u) continue;
        const xe = d.x * W + d.wob * d.w * u * 0.5 * Math.sin(d.wf + d.wp);
        g.beginPath(); g.ellipse(xe * s, y * s, d.w * u * 0.7 * s, d.w * u * 0.95 * s, 0, 0, TAU); g.fill();
      }
    }, { res: 0.6, u, edge: 3, dome: 8 });
  }
};
