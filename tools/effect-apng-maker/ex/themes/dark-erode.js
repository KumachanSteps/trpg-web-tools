// 闇：黒いもやの侵食（一回再生）。window.FX.draw(ctx, W, H, t, opt)
// 画面の端から黒い闇のもやが流れ込み、大半を侵す（中央はかすかに残る）。
// しくみ：画面中心からの「距離」（四角に近い楕円）と、極座標で作った流れる筋模様（角度方向に細かく、
// 半径方向に長い＝内へ伸びる触手）で濃さを決める。前線 F(t) が外から内へ下がっていく。
// 筋模様は内へ流れ、さらに渦を巻くようにねじれる。濃い部分の中も、流れる層で少し削って奥行きを出す。
// 縁（濃さが中くらいの帯）と前線の先には暗い紫のにじみ。粗い解像度で計算して拡大する。
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const TB = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) TB[i] = rnd(i & 255, i >> 8, 777);
  // x 方向だけ per で一周する値ノイズ（角度方向に使う）
  function vnp(x, y, per) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % per) + per) % per, x1 = (x0 + 1) % per, y0 = (iy & 255) << 8, y1 = ((iy + 1) & 255) << 8;
    const a = TB[x0 + y0], b = TB[x1 + y0], c = TB[x0 + y1], d = TB[x1 + y1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // 角度 a（0〜1で一周）、半径方向 r の fbm。per は角度方向のセル数
  function fbmp(a, r, per, oct) {
    let n = 0, amp = 1, sum = 0, x = a * per, y = r;
    for (let o = 0; o < oct; o++) { n += amp * vnp(x, y, per); sum += amp; amp *= 0.5; x *= 2; per *= 2; y = y * 2.03 + 11.7; }
    return n / sum;
  }

  let fa = null, fp = null, full = null;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  function draw(ctx, W, H, t, opt = {}) {
    const o = { res: 1 / 3, dur: 5, end: 0.3, p: 3.2, ...opt };
    const rw = Math.ceil(W * o.res), rh = Math.ceil(H * o.res);
    if (!fa || fa.length !== rw * rh) { fa = new Float32Array(rw * rh); fp = new Float32Array(rw * rh); }
    if (!full || full.width !== W || full.height !== H) full = new ImageData(W, H);
    const k = clamp(t / (o.dur - 0.25));
    // 前線：はじめは画面の外、じわじわ入ってきて、終わりはゆっくり止まる
    const F = 1.6 - (1.6 - o.end) * (1 - Math.pow(1 - k, 2.0));
    // 流れの時計：終わりに向けて流れも遅くなり、最後のコマで止まっても不自然でない
    const tf = (o.dur - 0.25) * (k - 0.32 * k * k * k);
    const ar = W / H;
    for (let py = 0; py < rh; py++) {
      const v = (py + 0.5) / rh, Y = 2 * v - 1;
      for (let px = 0; px < rw; px++) {
        const u = (px + 0.5) / rw, X = 2 * u - 1;
        // 四角に近い楕円の「中心からの距離」：辺の中ほどで1、角で約1.25
        const rho = Math.pow(Math.pow(Math.abs(X), o.p) + Math.pow(Math.abs(Y), o.p), 1 / o.p);
        const th = Math.atan2(Y, X * ar) / TAU + 0.5;
        // うねり：角度を半径と時間でねじる（渦を巻きながら流れ込む）
        const w1 = fbmp(th + 0.13, rho * 1.6 - tf * 0.11 + 40, 5, 2);
        const ang = th + 0.2 * rho + (w1 - 0.5) * 0.14 - tf * 0.01;
        // 中心近くは筋が一点に集まって放射状に見えるので、ゆらぎを弱める
        const cf = sstep(0.1, 0.5, rho);
        // 触手：細い尾根（ridge）状の筋。角度方向に細く、半径方向に長い。内へ流れ、先ほど細くなる
        const q1 = fbmp(ang, rho * 1.3 + tf * 0.38, 9, 3);
        const q2 = fbmp(ang + 0.31, rho * 2.2 + tf * 0.6 + 70, 17, 3);
        const r1 = Math.pow(1 - Math.abs(2 * q1 - 1), 3), r2 = Math.pow(1 - Math.abs(2 * q2 - 1), 4);
        const n2 = fbmp(ang + 0.57, rho * 5 + tf * 0.7 + 90, 40, 2);
        // 濃さ：前線より外側は黒。筋（尾根）に沿ってより内側まで伸びる
        const reach = rho + ((w1 - 0.5) * 0.3 + r1 * 0.42 + r2 * 0.26 + (n2 - 0.5) * 0.08 - 0.16) * cf;
        let den = sstep(F - 0.04, F + 0.22, reach);
        // 流れる層：濃い所の中を横切る薄いすじ（中ほどだけ。端は真っ黒に近く）
        const layer = fbmp(ang + (n2 - 0.5) * 0.03, rho * 4.5 + (q1 - 0.5) * 1.2 + tf * 0.5 + 130, 13, 3);
        const deep = sstep(F + 0.25, F + 0.75, reach);
        den *= 1 - 0.36 * sstep(0.52, 0.8, layer) * (1 - deep * 0.75);
        // 前線の先の紫のにじみ（ごく薄い）
        const hz = sstep(F - 0.3, F + 0.05, reach + (n2 - 0.5) * 0.15 * cf);
        const haze = hz * (1 - hz) * 4 * 0.1 * cf;
        // 縁の紫：濃さが中くらいの帯
        const rim = clamp(den * (1 - den) * 4) * 0.32;
        // 終わりごろは残った中央にもごく薄いかげり
        const veil = 0.2 * k * k * (1 - den);
        den = den + veil;
        const A = den * 0.96 + haze * (1 - den * 0.96);
        const j = py * rw + px;
        fa[j] = A;
        // 色：黒（ほんの少し紫寄り）に、縁とにじみで暗い紫を混ぜる
        fp[j] = A < 0.004 ? 0 : clamp((rim * den * 0.96 + haze * (1 - den * 0.96)) / A);
      }
    }
    // 実寸へは自前で双一次補間する。opt.steps=[濃さの段数, 紫の段数] を渡すと段数を絞り（紫は 4×4 ベイヤーでディザ）、
    // 255 色以内にして APNG を無劣化にできる（縞は消えるがファイルは重くなる）。既定は段数を絞らない
    const st = o.steps, NA = st ? st[0] : 255, NP = st ? st[1] : 0, D = full.data;
    for (let y = 0; y < H; y++) {
      const fy = clamp((y + 0.5) / H * rh - 0.5, 0, rh - 1), y0 = Math.floor(fy), y1 = Math.min(rh - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < W; x++) {
        const fx = clamp((x + 0.5) / W * rw - 0.5, 0, rw - 1), x0 = Math.floor(fx), x1 = Math.min(rw - 1, x0 + 1), wx = fx - x0;
        const i00 = y0 * rw + x0, i01 = y0 * rw + x1, i10 = y1 * rw + x0, i11 = y1 * rw + x1;
        const w00 = (1 - wx) * (1 - wy), w01 = wx * (1 - wy), w10 = (1 - wx) * wy, w11 = wx * wy;
        const A = fa[i00] * w00 + fa[i01] * w01 + fa[i10] * w10 + fa[i11] * w11;
        const i4 = (y * W + x) * 4;
        const bay = BAY[(y & 3) * 4 + (x & 3)];
        const qa = Math.floor(A * NA + (st && o.dith ? bay : 0.5));
        if (qa <= 0) { D[i4 + 3] = 0; continue; }
        const P = fp[i00] * w00 + fp[i01] * w01 + fp[i10] * w10 + fp[i11] * w11;
        const qp = !st ? P : Math.min(NP - 1, Math.floor(P * (NP - 1) + BAY[((y + 2) & 3) * 4 + ((x + 1) & 3)])) / (NP - 1);
        D[i4] = 7 + (64 - 7) * qp;
        D[i4 + 1] = 5 + (26 - 5) * qp;
        D[i4 + 2] = 11 + (92 - 11) * qp;
        D[i4 + 3] = Math.round(255 * Math.min(qa, NA) / NA);
      }
    }
    ctx.putImageData(full, 0, 0);
  }
  window.FX = { draw };
})();
