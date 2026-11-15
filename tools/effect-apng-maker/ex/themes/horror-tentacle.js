// 触手の影（ループ）。画面の端・隅から黒い影の触手が伸び、ゆっくりうねり、ときどきぴくりと動く。
// 触手は「中心線の曲がり具合（曲率）」を時間で動かして作る。曲率の波が根もと→先へ流れるとうねりになる。
// 影は不透明な形を別キャンバスに描き、ぼかして半透明で重ねる（重なっても濃さが重ならない＝一枚の影）。
// t と t+loop は同じ絵（周期はすべて loop の整数分の1）。
(function () {
  const TAU = Math.PI * 2;
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const mod = (a, b) => ((a % b) + b) % b;

  // bx,by：根もと（画面比。画面外に少し出す） ang：伸びる向き(度) len：長さ(画面高さ比) w：根もとの太さ(720基準px)
  // side：吸盤の側 curl：先の巻き layer：0=奥（ぼけて薄い） 1=手前
  const DEFS = [
    // 手前
    { bx: -0.03, by: 1.05, ang: -42, len: 0.92, w: 104, side: 1, curl: 2.2, layer: 1 },
    { bx: 0.15, by: 1.06, ang: -80, len: 0.62, w: 70, side: -1, curl: -2.6, layer: 1 },
    { bx: -0.03, by: 0.60, ang: -12, len: 0.55, w: 62, side: 1, curl: 2.4, layer: 1 },
    { bx: 1.03, by: 1.05, ang: -138, len: 0.88, w: 106, side: -1, curl: -2.3, layer: 1 },
    { bx: 0.84, by: 1.06, ang: -96, len: 0.56, w: 66, side: 1, curl: 2.5, layer: 1 },
    { bx: 1.03, by: 0.66, ang: 190, len: 0.50, w: 58, side: -1, curl: -2.6, layer: 1 },
    { bx: 0.36, by: 1.05, ang: -104, len: 0.30, w: 38, side: 1, curl: 2.8, layer: 1 },
    // 奥
    { bx: -0.04, by: 0.26, ang: 18, len: 0.62, w: 74, side: -1, curl: -2.2, layer: 0 },
    { bx: 0.66, by: 1.07, ang: -70, len: 0.70, w: 78, side: 1, curl: 2.4, layer: 0 },
    { bx: 1.04, by: -0.04, ang: 140, len: 0.55, w: 64, side: 1, curl: 2.4, layer: 0 },
    { bx: 0.25, by: 1.07, ang: -58, len: 0.50, w: 60, side: -1, curl: -2.2, layer: 0 },
  ];

  const N = 72;
  const P = new Float32Array((N + 1) * 2), A = new Float32Array(N + 1), Wd = new Float32Array(N + 1);

  function tentacle(x, d, i, W, H, t, L, o) {
    const u = H / 720, k = TAU / L;
    const p1 = rnd(i, 1) * TAU, p2 = rnd(i, 2) * TAU, p3 = rnd(i, 3) * TAU, p4 = rnd(i, 4) * TAU;
    const f1 = 0.8 + rnd(i, 5) * 0.5, f2 = 1.4 + rnd(i, 6) * 0.8;
    // 長さ：ゆっくり伸び縮み（じわじわ伸びてくる）
    const len = d.len * H * (0.80 + 0.2 * Math.sin(k * t + p3));
    // ぴくり：周期内に1〜2回。速く立ち上がり、減衰しながら2〜3回ふるえる
    let tw = 0, twb = 0;
    const nt = 1 + (rnd(i, 7) < 0.6 ? 1 : 0);
    for (let j = 0; j < nt; j++) {
      const te = (j + rnd(i, 8, j) * 0.8) * L / nt;
      const dt = mod(t - te, L);
      const env = dt < 0.07 ? dt / 0.07 : Math.exp(-(dt - 0.07) / 0.28);
      const s = (rnd(i, 9, j) < 0.5 ? -1 : 1) * (0.9 + rnd(i, 10, j) * 0.6);
      tw += s * env * Math.cos((dt) * TAU * 2.2);
      twb += s * env * 0.05;
    }
    const curl = d.curl * (0.75 + 0.25 * Math.sin(k * t + p4));
    let th = d.ang * Math.PI / 180 + 0.16 * Math.sin(k * t + p1) + 0.05 * Math.sin(2 * k * t + p2) + twb * o.twitch;
    let px = d.bx * W, py = d.by * H;
    const ds = 1 / N;
    for (let n = 0; n <= N; n++) {
      const s = n / N;
      P[n * 2] = px; P[n * 2 + 1] = py; A[n] = th;
      // 太さ：先へ細く。先端は髪の毛ほど
      Wd[n] = d.w * u * Math.pow(1 - s, 1.25) * (1 + 0.06 * Math.sin(s * 9 - k * t + p2)) + 1.1 * u;
      // 曲率：根もと→先へ流れるうねり＋先の巻き＋ぴくり
      const bend = 2.3 * Math.sin(TAU * f1 * s - k * t + p1) * (0.35 + 0.9 * s)
        + 1.1 * Math.sin(TAU * f2 * s + 2 * k * t + p2) * s
        + curl * 6 * Math.pow(s, 5)
        + tw * o.twitch * 2.2 * s * s;
      th += bend * ds * o.wave;
      px += Math.cos(th) * len * ds; py += Math.sin(th) * len * ds;
    }
    // 輪郭
    x.beginPath();
    const c0 = Math.cos(A[0]), s0 = Math.sin(A[0]);
    x.moveTo(P[0] - c0 * 60 * u - s0 * Wd[0] / 2, P[1] - s0 * 60 * u + c0 * Wd[0] / 2);
    for (let n = 0; n <= N; n++) { const nx = -Math.sin(A[n]), ny = Math.cos(A[n]); x.lineTo(P[n * 2] + nx * Wd[n] / 2, P[n * 2 + 1] + ny * Wd[n] / 2); }
    x.arc(P[N * 2], P[N * 2 + 1], Wd[N] / 2, A[N] + Math.PI / 2, A[N] - Math.PI / 2, true);
    for (let n = N; n >= 0; n--) { const nx = -Math.sin(A[n]), ny = Math.cos(A[n]); x.lineTo(P[n * 2] - nx * Wd[n] / 2, P[n * 2 + 1] - ny * Wd[n] / 2); }
    x.lineTo(P[0] - c0 * 60 * u + s0 * Wd[0] / 2, P[1] - s0 * 60 * u - c0 * Wd[0] / 2);
    x.closePath(); x.fill();
    // 吸盤：片側のふちに小さなこぶが並ぶ（影のシルエットとして）
    if (o.suckers) {
      let n = Math.round(N * 0.12);
      while (n < N * 0.93) {
        const w = Wd[n], r = Math.max(1.0 * u, w * 0.11);
        const nx = -Math.sin(A[n]) * d.side, ny = Math.cos(A[n]) * d.side;
        x.beginPath(); x.arc(P[n * 2] + nx * (w / 2 - r * 0.25), P[n * 2 + 1] + ny * (w / 2 - r * 0.25), r, 0, TAU); x.fill();
        // 次の吸盤まで：太さに比例した間隔
        n += Math.max(1, Math.round((w * 0.42 + 3 * u) / (len / N)));
      }
    }
  }

  let off = null, glow = null;
  function draw(ctx, W, H, t, opt = {}) {
    const o = { loop: 8, twitch: 1, wave: 1, suckers: true, alpha: 0.86, glow: 0.42, ...opt };
    const L = o.loop, u = H / 720;
    if (!off || off.width !== W || off.height !== H) { off = document.createElement('canvas'); off.width = W; off.height = H; glow = document.createElement('canvas'); glow.width = W; glow.height = H; }
    const x = off.getContext('2d');
    for (const layer of [0, 1]) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
      x.fillStyle = layer ? 'rgb(8,3,12)' : 'rgb(10,5,14)';
      DEFS.forEach((d, i) => { if (d.layer === layer) tentacle(x, d, i, W, H, t, L, o); });
      ctx.save();
      if (layer === 0) {
        ctx.filter = `blur(${(6.5 * u).toFixed(1)}px)`; ctx.globalAlpha = o.alpha * 0.5; ctx.drawImage(off, 0, 0);
      } else {
        // 暗い背景でも形が分かるよう、ごく淡い紫のにじみを外側に（明るい背景では半影に溶ける）
        if (o.glow > 0) {
          const g = glow.getContext('2d');
          g.globalCompositeOperation = 'copy'; g.drawImage(off, 0, 0);
          g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(100,60,130)'; g.fillRect(0, 0, W, H);
          ctx.filter = `blur(${(14 * u).toFixed(1)}px)`; ctx.globalAlpha = o.glow; ctx.drawImage(glow, 0, 0);
        }
        // ぼけた半影 → 本体（縁がわずかにぼける）
        ctx.filter = `blur(${(16 * u).toFixed(1)}px)`; ctx.globalAlpha = o.alpha * 0.3; ctx.drawImage(off, 0, 0);
        ctx.filter = `blur(${(2.6 * u).toFixed(1)}px)`; ctx.globalAlpha = o.alpha; ctx.drawImage(off, 0, 0);
      }
      ctx.restore();
    }
  }
  window.FX = { draw };
})();
