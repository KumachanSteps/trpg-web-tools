/*
 * 文字画像APNGメーカーEX — 炎の演出（炎の壁・走る炎・火炎ブレス・燃える文字・燃える文字の演出）
 * 試作（fire/src/fire.js）をツールに組み込んだもの。どの関数も (ctx, W, H, t, opt) で、W・H は出力のピクセル数。
 * opt.hue（度）で炎の色相を回す（0 が試作どおりの橙）。
 */
(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  function noise1(x, seed) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (rnd(i, seed, 7) + (rnd(i + 1, seed, 7) - rnd(i, seed, 7)) * u) * 2 - 1;
  }
  const outCubic = x => 1 - Math.pow(1 - x, 3);
  const smooth = x => x * x * (3 - 2 * x);
  // 燃え広がる炎：横位置 x の火がつく時刻 / 消え始める時刻と、その時点での炎の高さ（1 が普段の高さ）
  function runIgnite(run, x, W, H) { return run.start + run.dur * clamp(x / W) + 0.07 * noise1(x / (H * 0.18), 31); }
  function runHeight(run, x, W, H, t) {
    const a = t - runIgnite(run, x, W, H);
    if (a <= 0) return 0;
    const PK = run.rise || 0.5;
    let h = a < PK ? 1.4 * smooth(a / PK) : 1 + 0.4 * Math.exp(-(a - PK) / 0.35);
    if (run.out != null) {
      const b = t - (run.out + run.outDur * clamp(x / W) + 0.06 * noise1(x / (H * 0.2), 47));
      if (b > 0) h *= 1 - smooth(clamp(b / run.fade));
    }
    return h;
  }

  // 縦方向に周期 P セルでつながる勾配ノイズの格子
  function makeLattice(nx, P, seed) {
    const gx = new Float32Array((nx + 2) * P), gy = new Float32Array((nx + 2) * P);
    for (let i = 0; i < nx + 2; i++) for (let j = 0; j < P; j++) {
      const a = rnd(i, j, seed) * TAU;
      gx[i * P + j] = Math.cos(a); gy[i * P + j] = Math.sin(a);
    }
    return { gx, gy, P, nx };
  }
  function perlin(L, x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const P = L.P;
    let j0 = iy % P; if (j0 < 0) j0 += P;
    const j1 = j0 + 1 === P ? 0 : j0 + 1;
    const i0 = ix < 0 ? 0 : ix > L.nx ? L.nx : ix, i1 = i0 + 1;
    const a = i0 * P + j0, b = i1 * P + j0, c = i0 * P + j1, d = i1 * P + j1;
    const n00 = L.gx[a] * fx + L.gy[a] * fy;
    const n10 = L.gx[b] * (fx - 1) + L.gy[b] * fy;
    const n01 = L.gx[c] * fx + L.gy[c] * (fy - 1);
    const n11 = L.gx[d] * (fx - 1) + L.gy[d] * (fy - 1);
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const nx0 = n00 + (n10 - n00) * u, nx1 = n01 + (n11 - n01) * u;
    return (nx0 + (nx1 - nx0) * v) * 1.41;
  }

  // 炎の色（強さ 0 → 1.1）：透明 → 暗い赤 → 赤 → 橙 → 黄 → 白。
  // 色は「黒の上に重ねたときの見え方」で決め、不透明度で割って元の色に戻す。
  // 薄い縁は暗い色ではなく明るい赤を薄く重ねるので、明るい背景の上でも濁らない
  const STOPS = [
    [0.0, [0, 0, 0], 0],
    [0.1, [33, 4, 0], 0.14],
    [0.2, [126, 19, 3], 0.52],
    [0.33, [209, 57, 8], 0.86],
    [0.48, [255, 110, 18], 1],
    [0.64, [255, 158, 44], 1],
    [0.8, [255, 198, 88], 1],
    [0.95, [255, 228, 150], 1],
    [1.1, [255, 246, 215], 1]
  ];
  const LUT_N = 512, LUT_MAX = 1.1;
  // 色相の回転（CSS の hue-rotate と同じ行列）。0 度は元の色のまま
  function hueMatrix(deg) {
    if (!deg) return null;
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072
    ];
  }
  const c255 = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  function rotRGB(M, r, g, b) {
    if (!M) return [r, g, b];
    return [c255(M[0] * r + M[1] * g + M[2] * b), c255(M[3] * r + M[4] * g + M[5] * b), c255(M[6] * r + M[7] * g + M[8] * b)];
  }
  function buildLUT(M) {
    const lut = new Uint8ClampedArray(LUT_N * 4);
    for (let i = 0; i < LUT_N; i++) {
      const f = i / (LUT_N - 1) * LUT_MAX;
      let k = 0;
      while (k < STOPS.length - 2 && f > STOPS[k + 1][0]) k++;
      const [f0, c0, a0] = STOPS[k], [f1, c1, a1] = STOPS[k + 1];
      const u = clamp((f - f0) / (f1 - f0));
      const a = a0 + (a1 - a0) * u;
      const inv = a > 0 ? 1 / a : 0;
      // 不透明度がほぼ 0 のところは、次の段の色相を使う
      const hue = a > 0.02 ? null : STOPS[1][1].map(c => c / STOPS[1][2]);
      const rgb = [0, 1, 2].map(ch => Math.min(255, hue ? hue[ch] : (c0[ch] + (c1[ch] - c0[ch]) * u) * inv));
      const [r, g, b] = rotRGB(M, rgb[0], rgb[1], rgb[2]);
      lut[i * 4] = r; lut[i * 4 + 1] = g; lut[i * 4 + 2] = b;
      lut[i * 4 + 3] = a * 255;
    }
    return lut;
  }
  // いま描いている炎の色：色の表（LUT）・照り返しの色・色相の行列。描く関数の始めに setHue で切り替える
  const lutCache = new Map();
  let LUT = buildLUT(null);
  let HM = null;
  let GLOW = [255, 96, 24];
  lutCache.set(0, LUT);
  function setHue(deg) {
    const d = Math.round(((deg || 0) % 360 + 360) % 360);
    if (!lutCache.has(d)) lutCache.set(d, buildLUT(hueMatrix(d)));
    LUT = lutCache.get(d);
    HM = hueMatrix(d);
    GLOW = rotRGB(HM, 255, 96, 24);
  }
  function hexRGB(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    const v = m ? parseInt(m[1], 16) : 0xffb43a;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const mixWhite = (c, u) => `rgb(${c.map(v => Math.round(v + (255 - v) * u)).join(',')})`;
  // 炎の色の rgba 文字列（色相を回す）
  function fcol(r, g, b, a) {
    if (HM) [r, g, b] = rotRGB(HM, r, g, b);
    return `rgba(${r},${g},${b},${a})`;
  }

  const cache = {};
  function setup(W, H, opt) {
    const key = [W, H, opt.res, opt.height, opt.seed, opt.loop, opt.rise, !!opt.run].join(',');
    if (cache.key === key) return cache;
    const rs = opt.res;
    const Hf = H * opt.height;
    const top = Math.min(H, Hf * (opt.run ? 2.4 : 1.75));
    const rw = Math.ceil(W * rs), rh = Math.ceil(top * rs);
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(rw, rh) : Object.assign(document.createElement('canvas'), { width: rw, height: rh });
    const c2 = canvas.getContext('2d');
    // 縦の一周（LOOP 秒で炎の模様がこれだけ昇る）。各オクターブはこれを整数個のセルで割る
    const Lp = H * opt.rise * opt.loop;
    const octs = [];
    const pad = H * 0.3;
    const cellX0 = H * 0.14, cells0 = 3;
    for (let o = 0; o < 5; o++) {
      const P = cells0 << o;
      const cx = cellX0 / (1 << o);
      octs.push({ L: makeLattice(Math.ceil((W + pad * 2) / cx) + 2, P, opt.seed + o * 17), cx, cy: Lp / P, amp: Math.pow(0.55, o), k: [1, 1, 2, 2, 3][o] });
    }
    const ampC = octs[0].amp + octs[1].amp, ampF = octs.slice(2).reduce((s, o) => s + o.amp, 0);
    const warp = { L: makeLattice(Math.ceil((W + pad * 2) / (H * 0.22)) + 2, 3, opt.seed + 99), cx: H * 0.22, cy: Lp / 3 };
    Object.assign(cache, { key, rs, Hf, top, rw, rh, canvas, c2, img: c2.createImageData(rw, rh), octs, ampC, ampF, warp, Lp, pad });
    return cache;
  }

  function drawFireWall(ctx, W, H, t, opt = {}) {
    opt = { res: 0.5, height: 0.5, seed: 11, loop: 2.5, rise: 1 / 3, embers: 70, ...opt };
    setHue(opt.hue);
    const S = setup(W, H, opt);
    const { rs, Hf, rw, rh, octs, warp, Lp } = S;
    const ph = ((t / opt.loop) % 1 + 1) % 1;
    const data = S.img.data;
    const baseY = H; // 画面の下端
    const run = opt.run;
    const glowA = 0.16 + 0.04 * Math.sin(ph * TAU * 2) + 0.03 * Math.sin(ph * TAU * 5 + 1.3);
    if (!S.hcol || S.hcol.length !== rw) S.hcol = new Float32Array(rw);
    const hcol = S.hcol;
    for (let px = 0; px < rw; px++) hcol[px] = run ? runHeight(run, (px + 0.5) / rs, W, H, t) : 1;
    for (let py = 0; py < rh; py++) {
      const Y = baseY - S.top + (py + 0.5) / rs; // 出力座標の y
      const yb = baseY - Y; // 下端からの高さ
      for (let px = 0; px < rw; px++) {
        const hc = hcol[px];
        const v = yb / (Hf * Math.max(hc, 0.04));
        const vb = yb / Hf;
        if (v > 1.65) {
          const j4 = (py * rw + px) * 4;
          data[j4] = GLOW[0]; data[j4 + 1] = GLOW[1]; data[j4 + 2] = GLOW[2]; data[j4 + 3] = glowA * clamp((1.75 - vb) / 1.15) * Math.min(1, hc) * 255;
          continue;
        }
        const X = (px + 0.5) / rs;
        // 横の揺らぎ：上ほど大きく揺れる
        const wv = perlin(warp.L, (X + S.pad) / warp.cx, (yb - ph * Lp) / warp.cy);
        const xw = X + wv * H * 0.06 * (0.25 + v) + S.pad;
        // 大きなうねり（炎の舌の形）と細かな揺らぎ（縁のちらつき）を分けて足す
        let nc = 0, nf = 0;
        for (let o = 0; o < octs.length; o++) {
          const O = octs[o];
          const val = O.amp * perlin(O.L, xw / O.cx, (yb - ph * Lp * O.k) / O.cy);
          if (o < 2) nc += val; else nf += val;
        }
        nc /= S.ampC; nf /= S.ampF;
        const fc = 1.0 * (1 - v) + 0.95 * nc * (0.3 + 0.7 * Math.min(1.2, v)) - 0.6 * Math.max(0, v - 0.95);
        const edge = clamp(1 - Math.abs(fc - 0.2) / 0.35);
        // 火がついたばかりの低い炎は、根元まで赤〜橙にとどめる
        const f = (fc + nf * (0.1 + 0.45 * edge)) * (hc < 0.85 ? 0.25 + 0.75 * smooth(hc / 0.85) : 1) * (hc < 0.2 ? hc / 0.2 : 1);
        const i4 = (py * rw + px) * 4;
        // 熱の照り返し（炎の後ろ）。燃えている列だけ、炎の上の空気を薄く照らす
        const ga = glowA * clamp((1.75 - vb) / 1.15) * Math.min(1, hc);
        if (f <= 0) { data[i4] = GLOW[0]; data[i4 + 1] = GLOW[1]; data[i4 + 2] = GLOW[2]; data[i4 + 3] = ga * 255; continue; }
        const li = (Math.min(f, LUT_MAX) / LUT_MAX * (LUT_N - 1)) | 0;
        const af = LUT[li * 4 + 3] / 255;
        const A = af + ga * (1 - af);
        const wg = A > 0 ? ga * (1 - af) / A : 0, wf = A > 0 ? af / A : 0;
        data[i4] = LUT[li * 4] * wf + GLOW[0] * wg; data[i4 + 1] = LUT[li * 4 + 1] * wf + GLOW[1] * wg; data[i4 + 2] = LUT[li * 4 + 2] * wf + GLOW[2] * wg; data[i4 + 3] = A * 255;
      }
    }
    S.c2.putImageData(S.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const u = H / 720;
    ctx.drawImage(S.canvas, 0, baseY - S.top, W, rh / rs);
    // 火の粉：炎の先から舞い上がり、揺れながら消える。各粒は1周で整数回ちょうど生まれ変わる
    ctx.globalCompositeOperation = 'lighter';
    if (run) {
      // 燃え移る先端の閃き
      const p = (t - run.start) / run.dur;
      const fa = clamp(p / 0.08) * clamp((1.08 - p) / 0.12);
      if (fa > 0.01) {
        const fx = W * clamp(p) - Hf * 0.15, fy = baseY - Hf * 0.12, fr = Hf * 0.75;
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        fg.addColorStop(0, fcol(255, 150, 60, (0.22 * fa).toFixed(3)));
        fg.addColorStop(0.45, fcol(255, 90, 20, (0.08 * fa).toFixed(3)));
        fg.addColorStop(1, fcol(255, 60, 10, 0));
        ctx.fillStyle = fg;
        ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
      }
      // 火がついた瞬間に弾ける火の粉
      const nb = Math.round(46 * W / (H * 16 / 9));
      for (let j = 0; j < nb; j++) {
        const bx = rnd(j, 21, opt.seed) * W;
        const life = 0.7 + 0.6 * rnd(j, 22, opt.seed);
        const k = (t - runIgnite(run, bx, W, H) - 0.04) / life;
        if (k <= 0 || k >= 1) continue;
        const vx = (0.15 + 0.5 * rnd(j, 23, opt.seed)) * H * 0.35;
        const vy = (0.5 + 0.6 * rnd(j, 24, opt.seed)) * H * 0.6;
        const bp = kk => [bx + vx * kk * life, baseY - Hf * (0.2 + 0.5 * rnd(j, 25, opt.seed)) - vy * kk * life + 0.5 * H * 0.5 * (kk * life) * (kk * life)];
        const [x, y] = bp(k);
        const [x1, y1] = bp(Math.max(0, k - 0.035 / life));
        const a = clamp(k / 0.05) * Math.pow(1 - k, 1.2);
        const r = u * (1.2 + 1.4 * rnd(j, 26, opt.seed));
        ctx.strokeStyle = fcol(255, Math.round(190 + 50 * (1 - k)), Math.round(90 + 100 * (1 - k)), a.toFixed(3));
        ctx.lineWidth = r * 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    const n = Math.round(opt.embers * W / (H * 16 / 9));
    for (let i = 0; i < n; i++) {
      const m = 1 + (rnd(i, 1, opt.seed) < 0.55 ? 1 : 0);
      const q = ph * m + rnd(i, 2, opt.seed);
      const tau = q - Math.floor(q);
      const cyc = Math.floor(q) % m;
      const sd = i * 7 + cyc;
      const x0 = rnd(sd, 3, opt.seed) * W;
      // 燃え広がる炎では、生まれた時刻にその場所が燃えていた粒だけ出す
      if (run && runHeight(run, x0, W, H, t - tau * opt.loop / m) < 0.5) continue;
      const y0 = baseY - Hf * (0.55 + 0.5 * rnd(sd, 4, opt.seed));
      const rise = H * (0.28 + 0.42 * rnd(sd, 5, opt.seed)) * (m === 2 ? 0.6 : 1);
      const sway = H * (0.012 + 0.03 * rnd(sd, 6, opt.seed));
      const wob = 1.5 + 2.5 * rnd(sd, 7, opt.seed);
      const drift = (rnd(sd, 8, opt.seed) - 0.4) * H * 0.08;
      const pos = k => [x0 + drift * k + Math.sin(k * TAU * wob + sd) * sway * k, y0 - rise * (1 - Math.pow(1 - k, 1.6))];
      const [x, y] = pos(tau);
      const life = clamp(tau / 0.08) * Math.pow(1 - tau, 1.3);
      const flick = 0.75 + 0.25 * Math.sin(tau * TAU * 9 + sd * 3);
      const a = life * flick * (run && run.end ? clamp((run.end - t) / 0.4) : 1);
      if (a < 0.02) continue;
      const r = u * (1.0 + 1.4 * rnd(sd, 9, opt.seed)) * (0.6 + 0.4 * life);
      const hot = 1 - tau;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.5);
      g.addColorStop(0, fcol(255, Math.round(140 + 80 * hot), Math.round(50 + 80 * hot), (0.45 * a).toFixed(3)));
      g.addColorStop(1, fcol(255, 80, 10, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 4.5, 0, TAU); ctx.fill();
      // 動きの残像で短い線に見える
      const [px0, py0] = pos(Math.max(0, tau - 0.035 / (opt.loop / m)));
      ctx.strokeStyle = fcol(255, Math.round(165 + 70 * hot), Math.round(60 + 90 * hot), a.toFixed(3));
      ctx.lineWidth = r * 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
  }

  /* ================= 火炎ブレス ================= */
  // 周期のない勾配ノイズ（格子の向きはハッシュから8方向）
  const G8X = [1, -1, 0, 0, 0.7071, -0.7071, 0.7071, -0.7071], G8Y = [0, 0, 1, -1, 0.7071, 0.7071, -0.7071, -0.7071];
  function gnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const h00 = hash32(ix, iy, seed) & 7, h10 = hash32(ix + 1, iy, seed) & 7, h01 = hash32(ix, iy + 1, seed) & 7, h11 = hash32(ix + 1, iy + 1, seed) & 7;
    const n00 = G8X[h00] * fx + G8Y[h00] * fy;
    const n10 = G8X[h10] * (fx - 1) + G8Y[h10] * fy;
    const n01 = G8X[h01] * fx + G8Y[h01] * (fy - 1);
    const n11 = G8X[h11] * (fx - 1) + G8Y[h11] * (fy - 1);
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
    return (a + (b - a) * v) * 1.41;
  }
  // 粗い2段（形）と細かい3段（縁のちらつき）。cx, cy は一番粗い段のセルの大きさ
  function fbm2(x, y, cx, cy, seed, out) {
    let nc = 0, nf = 0, amp = 1;
    for (let o = 0; o < 5; o++) {
      const k = 1 << o;
      const val = amp * gnoise(x * k / cx, y * k / cy, seed + o * 13);
      if (o < 2) nc += val; else nf += val;
      amp *= 0.55;
    }
    out[0] = nc / 1.55; out[1] = nf / (0.3025 + 0.166 + 0.0915);
  }
  // 強さ f と背後の照り返し ga を合成して1画素に書く
  function putFire(data, i4, f, ga) {
    if (f <= 0) { data[i4] = GLOW[0]; data[i4 + 1] = GLOW[1]; data[i4 + 2] = GLOW[2]; data[i4 + 3] = ga * 255; return; }
    const li = (Math.min(f, LUT_MAX) / LUT_MAX * (LUT_N - 1)) | 0;
    const af = LUT[li * 4 + 3] / 255;
    const A = af + ga * (1 - af);
    const wg = A > 0 ? ga * (1 - af) / A : 0, wf = A > 0 ? af / A : 0;
    data[i4] = LUT[li * 4] * wf + GLOW[0] * wg; data[i4 + 1] = LUT[li * 4 + 1] * wf + GLOW[1] * wg; data[i4 + 2] = LUT[li * 4 + 2] * wf + GLOW[2] * wg; data[i4 + 3] = A * 255;
  }

  // 時間割：先頭が入る → 右端に届く → 燃え上がる → 尾が左から抜ける
  function breathTimes(b) {
    const t1 = b.start + b.run;
    const t2 = t1 + b.hold;
    return { t1, t2, end: t2 + b.run + b.fade };
  }
  const bcache = {};
  function drawFireBreath(ctx, W, H, t, opt = {}) {
    opt = { res: 0.67, seed: 23, embers: 60, ...opt };
    setHue(opt.hue);
    const b = { start: 0.05, run: 0.7, hold: 1.1, fade: 0.6, ground: 0.66, flow: 1.4, up: 1, blast: 1, dust: 0, ...(opt.breath || {}) };
    const tailRun = b.tailRun || b.run;
    let { t2 } = breathTimes(b);
    const rs = opt.res;
    const rw = Math.ceil(W * rs), rh = Math.ceil(H * rs);
    if (bcache.rw !== rw || bcache.rh !== rh) {
      const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(rw, rh) : Object.assign(document.createElement('canvas'), { width: rw, height: rh });
      const c2 = canvas.getContext('2d');
      Object.assign(bcache, { rw, rh, canvas, c2, img: c2.createImageData(rw, rh), col: new Float32Array(rw * 8) });
    }
    const data = bcache.img.data;
    const col = bcache.col;
    const seed = opt.seed;
    const pad = W * 0.12;
    const gy = H * b.ground;          // 地面の高さ
    const Vf = W * b.flow;            // 炎の模様が右へ流れる速さ
    const LEAN = 0.9;                 // 走る勢いで、上の炎ほど後ろ（左）へなびく
    // 先頭と尾の位置（画面の外から外まで、一定の速さ）
    // 右端の爆発：中心・広がる半径・経過
    const xe = W * (b.xe || 0.93);
    const tb = b.start + b.run * (xe + pad) / (W + pad * 2);
    // stop のときは先端が爆発の位置で止まり、尾がそこへ吸い込まれる
    if (b.stop) t2 = tb + b.hold;
    const xh = Math.min(-pad + (W + pad * 2) * clamp((t - b.start) / b.run), b.stop ? xe : Infinity);
    const tailX = tt => b.stop ? -pad + (xe + pad) * clamp((tt - t2) / tailRun) : -pad + (W + pad * 2) * clamp((tt - t2) / tailRun);
    const xt = t < t2 ? -Infinity : tailX(t);
    const kb = (t - tb) / (b.blastLife || 1.1);
    const rb = H * 0.5 * b.blast * outCubic(clamp((t - tb) / (b.blastGrow || 0.38)));
    const blastOn = b.blast > 0 && kb > 0 && kb < 1;
    // 途中で一気に燃え尽きる（kill の時刻から killDur で消える）
    const killK = b.kill != null ? 1 - smooth(clamp((t - b.kill) / (b.killDur || 0.1))) : 1;
    const JH = W * 0.02, JT = W * 0.025;
    for (let px = 0; px < rw; px++) {
      const X = (px + 0.5) / rs;
      const q = clamp(X / W);
      // 燃え上がりは爆発した右端から左へ伝わり、右ほど高い
      const fu = smooth(clamp((t - tb - 0.05 - (0.93 - q) * 0.32 + 0.04 * noise1(X / (H * 0.3), 61)) / 0.22));
      const reach = Math.max(0, 1 - Math.abs(q - 0.93) / 0.25);
      const burst = 1 + 0.6 * Math.exp(-Math.max(0, t - tb - 0.25) / 0.35) * (0.4 + 0.6 * reach);
      const Hu = H * (0.1 + 0.32 * Math.pow(q, 1.7)) * burst * b.up;
      // 炎の流れの厚み：細く、右へ行くほど少し厚く。流れに乗るかたまりで少しだけ脈打つ
      const puff = gnoise((X - Vf * t) / (H * 0.3), 0.5, seed + 300);
      const back = (xh - X) / (W * 0.2);
      const crest = back > 0 && back < 1 ? Math.sin(Math.PI * Math.pow(back, 0.5)) * 0.6 : 0;
      const T = H * (0.075 + 0.05 * q) * (1 + 0.15 * puff) * (1 + crest);
      const o = px * 8;
      col[o] = T;
      col[o + 1] = fu;
      col[o + 2] = killK > 0 && X < xh + JH + W * 0.06 && X > xt - JT - W * 0.06 ? 1 : 0;
      col[o + 3] = Hu;
      // 尾が通ったあとの燃え上がり：冷えて赤くなりながら、上へ浮いて消える
      col[o + 4] = smooth(clamp((X - xt + W * 0.14 + W * 0.05 * noise1(X / (H * 0.25), 71)) / (W * 0.28)));
      // 照り返しの強さ（地面と空気）
      col[o + 5] = Math.max(Math.min(clamp((xh - X) / (W * 0.08)), clamp((X - xt) / (W * 0.12))) * killK, b.up > 0 ? fu * col[o + 4] : 0);
    }
    const nn = [0, 0];
    for (let py = 0; py < rh; py++) {
      const Y = (py + 0.5) / rs;
      const hy = gy - Y; // 地面からの高さ
      const jh = JH * gnoise(hy / (H * 0.05), t * 4, seed + 7);
      const jt = JT * gnoise(hy / (H * 0.06), t * 5, seed + 9);
      for (let px = 0; px < rw; px++) {
        const o = px * 8, i4 = (py * rw + px) * 4;
        const T = col[o], Fu = col[o + 1], ft = col[o + 4];
        const X = (px + 0.5) / rs;
        const near = blastOn && Math.abs(X - xe) < rb * 1.5 + H * 0.05;
        if (!col[o + 2] && !(b.up > 0 && Fu > 0.001 && ft > 0.001) && !near) { data[i4 + 3] = 0; continue; }
        const lit = col[o + 5];
        // 地面の照り返し（地面の下側に薄く）と、炎の上の空気の照り返し
        let ga = hy < 0 ? 0.3 * lit * clamp(1 + hy / (H * 0.06)) : 0.12 * lit * clamp(1 - hy / (T + col[o + 3] * Fu + H * 0.12));
        if (hy < -H * 0.004) {
          if (blastOn && b.floor !== false) ga = Math.max(ga, 0.4 * (1 - kb) * clamp(1 - Math.abs(X - xe) / (rb * 1.6 + 1)) * clamp(1 + hy / (H * 0.08)));
          // 地面のない演出では、爆発の火の玉だけは地面の下へも少しふくらむ（平らに切らない）
          if (!(b.floor === false && near && rb > 1)) { putFire(data, i4, 0, ga); continue; }
        }
        // 地面に接するところは、ほんの少しだけぼかして切る
        let foot = clamp(hy / (H * 0.006));
        let f = 0;
        // 流れ：地面に沿って細く速く走る。模様は横に長く、上ほど後ろへなびく
        if (col[o + 2] && hy < T * 2.2) {
          const v = hy / T;
          const sx = X - Vf * t + hy * LEAN;
          fbm2(sx, hy / T, H * 0.28, 1.1, seed, nn);
          // 先頭は地面側が前に出たくさび形。尾は模様に沿って崩れる
          const nh = 0.6 * gnoise(sx / (H * 0.1), hy / (T * 0.6), seed + 150) + 0.4 * nn[0];
          const headK = clamp((xh + jh - X - W * 0.06 * clamp(v, 0, 1.6) + W * 0.05 * nh) / (W * 0.06));
          const tailK = smooth(clamp((X - xt - jt + W * 0.05 * nn[0]) / (W * 0.12)));
          const E = Math.min(headK, tailK, killK);
          if (E > 0.001) {
            const fc = 1.05 * (1 - v) + 0.9 * nn[0] * (0.35 + 0.65 * Math.min(1.2, v)) - 0.6 * Math.max(0, v - 0.95);
            const edge = clamp(1 - Math.abs(fc - 0.2) / 0.35);
            f = (fc + nn[1] * (0.1 + 0.45 * edge)) * (0.5 + 0.5 * E) - (1 - E) * 0.9;
          }
        }
        // 燃え上がり：流れの上から立ちのぼる炎（右ほど高い）
        if (b.up > 0 && Fu > 0.001 && ft > 0.001) {
          const yb = hy - T * 0.45 - (1 - ft) * H * 0.06 * (1 + gnoise(X / (H * 0.07), hy / (H * 0.07) - t * 3, seed + 500));
          const v = Math.max(0, yb) / Math.max(1, col[o + 3] * Fu);
          if (v < 1.65) {
            fbm2(X + 4000 + yb * 0.35, yb - H * 1.15 * t, H * 0.11, H * 0.24, seed + 200, nn);
            const fc = 0.95 * (1 - v) + 0.95 * nn[0] * (0.3 + 0.7 * Math.min(1.2, v)) - 0.6 * Math.max(0, v - 0.95);
            const edge = clamp(1 - Math.abs(fc - 0.2) / 0.35);
            const below = yb < -T * 0.3 ? smooth(clamp(1 + (yb + T * 0.3) / (T * 0.6))) : 1;
            const fu = (fc + nn[1] * (0.1 + 0.45 * edge)) * (Fu < 0.6 ? Fu / 0.6 : 1) * below * (0.5 + 0.5 * ft) - (1 - ft) * 0.9;
            if (fu > f) f = fu;
          }
        }
        // 爆発：右端で地面から半球状にふくらむ火の玉。広がりきると昇りながら崩れて消える
        if (near && rb > 1) {
          const dx = X - xe, dh = hy - H * 0.16 * kb * kb;
          const r = Math.sqrt(dx * dx + dh * dh * (hy < 0 ? 14 : 1.25));
          if (r < rb * 1.45) {
            const nb = 0.65 * gnoise(dx / (H * 0.08), (hy - t * H * 0.5) / (H * 0.08), seed + 400) + 0.35 * gnoise(dx / (H * 0.03), (hy - t * H * 0.8) / (H * 0.03), seed + 410);
            const rr = r / (rb * (1 + 0.3 * nb));
            const fb = (1.3 * (1 - rr * rr) + 0.45 * nb) * (1 - 0.25 * kb) - Math.pow(kb, 1.4) * 1.25;
            if (b.floor === false) { if (fb > f * foot) { f = fb; foot = 1; } } else if (fb > f) f = fb;
          }
        }
        putFire(data, i4, f * foot, ga);
      }
    }
    bcache.c2.putImageData(bcache.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bcache.canvas, 0, 0, W, rh / rs);
    ctx.globalCompositeOperation = 'lighter';
    const u = H / 720;
    // 爆発の閃光
    const kf = (t - tb) / 0.4;
    if (b.blast > 0 && kf > 0 && kf < 1) {
      const fr = H * (0.35 + 0.45 * outCubic(kf)) * (0.5 + 0.5 * b.blast);
      const fy = gy - (b.floor === false ? rb * 0.45 : H * 0.05);
      const fg = ctx.createRadialGradient(xe, fy, 0, xe, fy, fr);
      const fa = Math.pow(1 - kf, 1.6);
      fg.addColorStop(0, b.floor === false ? fcol(255, 226, 160, (0.6 * fa).toFixed(3)) : fcol(255, 244, 210, (0.65 * fa).toFixed(3)));
      fg.addColorStop(0.35, fcol(255, b.floor === false ? 150 : 170, b.floor === false ? 50 : 70, (0.35 * fa).toFixed(3)));
      fg.addColorStop(1, fcol(255, 90, 20, 0));
      ctx.fillStyle = fg;
      // 閃光は地面より上だけ（地面の下は照り返しで足りる。広い淡いぼかしは256色で縞になりやすい）
      // floor:false（地面のない演出）では閃光を丸ごと描く
      if (b.floor === false) ctx.fillRect(xe - fr, fy - fr, fr * 2, fr * 2);
      else ctx.fillRect(xe - fr, gy - H * 0.05 - fr, fr * 2, fr + H * 0.05 + H * 0.01);
    }
    ctx.lineCap = 'round';
    // 爆発で飛び散る火の粉（上半分へ放射状。重さで少し落ちる）
    for (let j = 0; j < Math.round(40 * b.blast); j++) {
      const life = 0.5 + 0.6 * rnd(j, 31, seed);
      const k = (t - tb - 0.02) / life;
      if (k <= 0 || k >= 1) continue;
      const ang = -Math.PI * (0.06 + 0.88 * rnd(j, 32, seed));
      const sp = H * (0.6 + 1.1 * rnd(j, 33, seed)) * (0.6 + 0.4 * b.blast);
      const pos = kk => {
        const tt = kk * life;
        return [xe + Math.cos(ang) * sp * tt * (1 - 0.3 * kk), gy - H * 0.04 + Math.sin(ang) * sp * tt * (1 - 0.3 * kk) + H * 0.5 * tt * tt];
      };
      const [x, y] = pos(k);
      if (y > gy) continue;
      const [x1, y1] = pos(Math.max(0, k - 0.035 / life));
      const a = clamp(k / 0.05) * Math.pow(1 - k, 1.2);
      ctx.strokeStyle = fcol(255, Math.round(180 + 60 * (1 - k)), Math.round(80 + 110 * (1 - k)), a.toFixed(3));
      ctx.lineWidth = u * (1.6 + 1.6 * rnd(j, 34, seed));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
    }
    // 走る炎から後ろへ流れる火の粉
    const n = Math.round(opt.embers * W / (H * 16 / 9));
    const tEnd = t2 + tailRun;
    for (let j = 0; j < n; j++) {
      const ts = b.start + (tEnd - b.start) * rnd(j, 1, seed);
      const life = 0.4 + 0.45 * rnd(j, 2, seed);
      const k = (t - ts) / life;
      if (k <= 0 || k >= 1) continue;
      const hx = Math.min(-pad + (W + pad * 2) * clamp((ts - b.start) / b.run), b.stop ? xe : Infinity);
      const tx = ts < t2 ? -pad : tailX(ts);
      const x0 = tx + (Math.min(hx, W) - tx) * rnd(j, 3, seed);
      if (x0 < 0 || x0 > W || hx - x0 < W * 0.03) continue;
      const q0 = clamp(x0 / W);
      const y0 = gy - H * (0.02 + 0.08 * q0) * rnd(j, 4, seed);
      const vx = W * (0.25 + 0.45 * rnd(j, 5, seed)), vy = -H * (0.08 + 0.3 * rnd(j, 6, seed));
      const sp = kk => [x0 + vx * kk * life * (1 - 0.35 * kk), y0 + vy * kk * life];
      const [x, y] = sp(k);
      const [x1, y1] = sp(Math.max(0, k - 0.028 / life));
      const a = clamp(k / 0.06) * Math.pow(1 - k, 1.3) * (b.end ? clamp((b.end - 0.05 - t) / 0.4) : 1) * (b.kill != null ? clamp(1 - (t - b.kill) / 0.3) : 1);
      ctx.strokeStyle = fcol(255, Math.round(160 + 70 * (1 - k)), Math.round(60 + 90 * (1 - k)), a.toFixed(3));
      ctx.lineWidth = u * (1.1 + 1.4 * rnd(j, 7, seed)) * 1.6;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
    }
    // 尾が通ったところの炎は、火の粉になって右上へ散る
    if (b.dust > 0) drawDust(ctx, W, H, t, Math.round(b.dust * W / (H * 16 / 9)), seed + 600, j => {
      const x = rnd(j, 1, seed + 600) * W;
      const te = t2 + tailRun * (x + pad) / (W + pad * 2) + 0.05;
      const q = clamp(x / W);
      return { x, y: gy - H * (0.055 + 0.045 * q) * (0.15 + 0.85 * rnd(j, 2, seed + 600)), te };
    }, H * 0.3, b.end);
    ctx.restore();
  }

  // 火の粉になって消える：各粒は出どころ・生まれる時刻を src(j) から受け取り、右上へ漂いながら赤く冷えて消える
  function drawDust(ctx, W, H, t, n, seed, src, scale, end = Infinity) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < n; j++) {
      const p = src(j);
      if (!p) continue;
      const life = 0.6 + 0.7 * rnd(j, 11, seed);
      const k = (t - p.te) / life;
      if (k <= 0 || k >= 1) continue;
      const tt = k * life;
      const vx = scale * (0.35 + 0.9 * rnd(j, 12, seed)), vy = -scale * (0.5 + 1.1 * rnd(j, 13, seed));
      const wob = scale * 0.08 * Math.sin(tt * (5 + 5 * rnd(j, 14, seed)) + j);
      const x = p.x + vx * tt * (1 - 0.3 * k) + wob;
      const y = p.y + vy * tt * (1 - 0.25 * k);
      const r = scale * (0.012 + 0.022 * rnd(j, 15, seed)) * (1 - 0.6 * k);
      // 終わりの時刻までに必ず消える（繰り返し再生で途切れない）
      const a = clamp(k / 0.05) * Math.pow(1 - k, 1.1) * clamp((end - 0.05 - t) / 0.4);
      if (a < 0.01) continue;
      const hot = 1 - k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, fcol(255, Math.round(200 + 50 * hot), Math.round(90 + 120 * hot), (0.95 * a).toFixed(3)));
      g.addColorStop(0.3, fcol(255, Math.round(110 + 80 * hot), Math.round(30 + 40 * hot), (0.55 * a).toFixed(3)));
      g.addColorStop(1, fcol(255, 60, 10, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= 燃え上がる文字 ================= */
  // 文字の画そのものが燃える：画の中は上へ流れる炎の模様で満たし、画の上側の縁から炎が立ちのぼる。
  // 字の中のすき間（上に別の画がある所）では炎を低く抑えて、画と画の間を残す
  const tcache = {};
  function textSetup(W, H, o) {
    const key = [W, H, o.res, o.shapeKey].join('|');
    if (tcache.key === key) return tcache;
    const rs = o.res;
    const rw = Math.ceil(W * rs), rh = Math.ceil(H * rs);
    const mk = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
    const mc = mk(rw, rh), mx = mc.getContext('2d');
    mx.scale(rs, rs); mx.fillStyle = '#fff';
    o.shape(mx, 'fill');
    const md = mx.getImageData(0, 0, rw, rh).data;
    const N = rw * rh;
    const a = new Float32Array(N), m = new Uint8Array(N);
    for (let i = 0; i < N; i++) { a[i] = md[i * 4 + 3] / 255; m[i] = a[i] > 0.45 ? 1 : 0; }
    // 画の内側ほど 1 に近い値（ぼかした文字）：画の芯ほど熱く、縁は赤く
    const blur = (src, r) => {
      const tmp = new Float32Array(N), out = new Float32Array(N), k = 1 / (2 * r + 1);
      for (let y = 0; y < rh; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * rw + Math.min(rw - 1, Math.max(0, x))]; for (let x = 0; x < rw; x++) { tmp[y * rw + x] = acc * k; acc += src[y * rw + Math.min(rw - 1, x + r + 1)] - src[y * rw + Math.max(0, x - r)]; } }
      for (let x = 0; x < rw; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(rh - 1, Math.max(0, y)) * rw + x]; for (let y = 0; y < rh; y++) { out[y * rw + x] = acc * k; acc += tmp[Math.min(rh - 1, y + r + 1) * rw + x] - tmp[Math.max(0, y - r) * rw + x]; } }
      return out;
    };
    const br = Math.max(1, Math.round(o.size * 0.022 * rs));
    const core = blur(blur(a, br), br);
    // 上にある画までの距離（字の中のすき間で炎を抑える）
    const up = new Float32Array(N);
    for (let x = 0; x < rw; x++) { let d = 1e9; for (let y = 0; y < rh; y++) { const i = y * rw + x; d = m[i] ? 0 : d + 1 / rs; up[i] = d; } }
    // 熱を下から上へ運ぶ（1行ごとに横へにじませて弱める）→ 画の上の縁からの実質の高さ
    const KR = Math.max(1, Math.round(o.size * 0.02 * rs));
    const kw = []; let ks = 0;
    for (let d = -KR; d <= KR; d++) { const w = Math.exp(-(d * d) / (KR * KR * 0.5)); kw.push(w); ks += w; }
    for (let i = 0; i < kw.length; i++) kw[i] /= ks;
    const kap = 1 / (o.size * 0.2);
    const lam = Math.exp(-kap / rs);
    const hgt = new Float32Array(N);
    let prev = new Float32Array(rw), cur = new Float32Array(rw);
    let x0 = rw, x1 = 0, y0 = rh, y1 = 0;
    for (let y = rh - 1; y >= 0; y--) {
      for (let x = 0; x < rw; x++) {
        let acc = 0;
        for (let d = -KR; d <= KR; d++) { const xx = x + d; if (xx >= 0 && xx < rw) acc += prev[xx] * kw[d + KR]; }
        const i = y * rw + x;
        const q = m[i] ? 1 : acc * lam;
        cur[x] = q;
        hgt[i] = q > 1e-6 ? -Math.log(q) / kap : 1e9;
        if (m[i]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    // 火の粉になって消えるときの出どころ：文字の中の点（間引いて持つ）
    const inner = [];
    for (let y = 0; y < rh; y += 2) for (let x = (y >> 1) & 1; x < rw; x += 2) if (m[y * rw + x]) inner.push((x + 0.5) / rs, (y + 0.5) / rs);
    // 火の粉の出どころ：文字の上向きの縁
    const tops = [];
    for (let y = 1; y < rh; y++) for (let x = 0; x < rw; x++) if (m[y * rw + x] && !m[(y - 1) * rw + x]) tops.push((x + 0.5) / rs, (y + 0.5) / rs);
    // 列ごとの文字のかかり具合（横にぼかす）：手前の炎を文字のある幅だけに出す
    const cov0 = new Float32Array(rw), cover = new Float32Array(rw);
    for (let x = 0; x < rw; x++) for (let y = 0; y < rh; y++) if (m[y * rw + x]) { cov0[x] = 1; break; }
    const cr = Math.max(1, Math.round(o.size * 0.12 * rs));
    for (let x = 0; x < rw; x++) { let acc = 0, w = 0; for (let d = -cr; d <= cr; d++) { const xx = x + d; if (xx >= 0 && xx < rw) { acc += cov0[xx]; w++; } } cover[x] = smooth(clamp(acc / w * 1.6)); }
    const fc = mk(rw, rh), fx = fc.getContext('2d');
    const fc3 = mk(rw, rh), fx3 = fc3.getContext('2d');
    const lc = mk(rw, rh), lx = lc.getContext('2d');
    const tc = mk(W, H), tx = tc.getContext('2d');
    Object.assign(tcache, { key, rs, rw, rh, a, core, up, hgt, tops, inner, cover, fc3, fx3, img3: fx3.createImageData(rw, rh), box: { x0: x0 / rs, x1: x1 / rs, y0: y0 / rs, y1: y1 / rs },
      fc, fx, img: fx.createImageData(rw, rh), lc, lx, limg: lx.createImageData(rw, rh), tc, tx, dc: mk(rw, rh), lc2: mk(W, H) });
    tcache.dx = tcache.dc.getContext('2d'); tcache.dimg = tcache.dx.createImageData(rw, rh); tcache.lx2 = tcache.lc2.getContext('2d');
    return tcache;
  }

  function flameAmount(tl, t) {
    // 0 → 一気に燃え上がって大きく → 落ち着く → しぼんで消える
    const a = t - tl.ignite;
    if (a <= 0) return 0;
    const R = tl.rise || 0.32, P = tl.peak || 1.55;
    let k = a < R ? P * outCubic(a / R) : 1 + (P - 1) * Math.exp(-(a - R) / 0.3);
    const b = t - tl.out;
    if (b > 0) k *= 1 - smooth(clamp(b / tl.outDur));
    return k;
  }

  function drawFlamingText(ctx, W, H, t, opt = {}) {
    const o = { res: 0.67, seed: 41, text: '戦闘開始', font: '"Soukou Mincho", serif', size: 0.3, y: 0.62, spacing: 0.06, embers: 70, lag: 0.25, bright: false, front: 0, rise: 1, ...opt };
    setHue(o.hue);
    // 文字の大きさ：sizePx（ピクセル）があればそれ、なければ画像の高さに対する割合
    o.size = o.sizePx ? o.sizePx : Math.round(o.size * H);
    // 文字の形：ツールでは opt.shape(c, 'fill' | 'stroke') が文字を描く。なければ試作どおり1行の文字を中央に置く
    if (!o.shape) {
      const fs = `${o.size}px ${o.font}`;
      o.shape = (c, op) => {
        c.save();
        c.font = fs; c.textAlign = 'center'; c.textBaseline = 'middle';
        try { c.letterSpacing = `${o.spacing * o.size}px`; } catch (e) { /* 未対応なら詰めたまま */ }
        if (op === 'stroke') c.strokeText(o.text, W / 2, H * o.y); else c.fillText(o.text, W / 2, H * o.y);
        c.restore();
      };
      o.shapeKey = [o.text, o.font, o.size, o.y, o.spacing].join('|');
    }
    const tl = { show: 0.05, ignite: 0.2, out: 2.35, outDur: 0.6, ...(opt.timeline || {}) };
    const S = textSetup(W, H, o);
    const { rs, rw, rh, hgt, core, up, a: alpha } = S;
    const size = o.size;
    const seed = o.seed;
    const data = S.img.data, ldata = S.limg.data, fdata = S.img3.data;
    data.fill(0); ldata.fill(0); fdata.fill(0);
    const nn2 = [0, 0];
    const baseY = S.box.y1 + size * 0.03;
    const nn = [0, 0];
    // 文字が浮かぶ（まだ燃えていない、暗く赤い熾火）→ 左の字から順に燃え上がる → 冷えて消える
    const showA = clamp((t - tl.show) / (tl.fadeIn || 0.2)) * (1 - smooth(clamp((t - tl.out - 0.2) / (tl.outDur + 0.15))));
    // 左から右へ火の粉になって消える：消え際の位置
    const D = opt.dissolve;
    const xd = D && t > D.start ? D.x0 + (D.x1 - D.x0) * clamp((t - D.start) / D.dur) : -1e9;
    // 右から左へ燃え移って現れる（爆風が字をなめていく）
    const A = opt.appear;
    const xa = A ? A.x1 - (A.x1 - A.x0) * clamp((t - A.start) / A.dur) : -1e9;
    const M = D || A;
    const xEdge = D && t > D.start ? xd : A ? xa : -1e9;
    const ddata = S.dimg.data;
    if (M) ddata.fill(0);
    if (!S.colH || S.colH.length !== rw) { S.colH = new Float32Array(rw); S.colA = new Float32Array(rw); }
    const colH = S.colH, colA = S.colA;
    for (let px = 0; px < rw; px++) {
      const X = (px + 0.5) / rs;
      const fx = clamp((X - S.box.x0) / Math.max(1, S.box.x1 - S.box.x0));
      const lag = o.lag * (o.lagDir < 0 ? 1 - fx : fx);
      const ig = A ? A.start + A.dur * clamp((A.x1 - X) / (A.x1 - A.x0)) - 0.07 : tl.ignite + lag;
      const ak = flameAmount({ ...tl, ignite: ig }, t);
      colA[px] = ak;
      colH[px] = size * 0.5 * o.rise * ak * (1 + 0.3 * noise1(X / (size * 0.35) + t * 0.9, 77));
    }
    if (showA > 0.001) {
      const bx0 = Math.max(0, Math.floor((S.box.x0 - size * 0.3) * rs)), bx1 = Math.min(rw, Math.ceil((S.box.x1 + size * 0.3) * rs));
      const by0 = Math.max(0, Math.floor((S.box.y0 - size * 1.3) * rs)), by1 = Math.min(rh, Math.ceil((S.box.y1 + size * 0.25) * rs));
      if (D && xd > S.box.x1 + size * 0.5) { /* すべて消えた */ } else
      for (let py = by0; py < by1; py++) {
        const Y = (py + 0.5) / rs;
        for (let px = bx0; px < bx1; px++) {
          const i = py * rw + px, i4 = i * 4;
          const X = (px + 0.5) / rs;
          const ak = colA[px];
          const lit = Math.min(1, ak);
          // 炎の模様：文字の中も外も同じ模様が上へ流れる
          const sway = gnoise(X / (size * 0.4), (Y + t * size * 1.3) / (size * 0.4), seed + 90) * size * 0.1;
          fbm2(X + sway, Y + t * size * 2.2, size * 0.13, size * 0.32, seed, nn);
          // 消え際：模様に沿ってぎざぎざに崩れ、崩れる縁は明るく燃える
          const vis = M ? clamp((X - xEdge + size * (0.16 * nn[0] + 0.1 * gnoise(Y / (size * 0.18), t * 1.5, seed + 810))) / (size * 0.14)) : 1;
          const rim = 4 * vis * (1 - vis);
          // 抜き型は炎の模様が崩れきる位置に合わせる（焦げた縁だけが残らないように）
          if (M) ddata[i4 + 3] = smooth(clamp((vis - 0.5) / 0.3)) * 255;
          // 文字の画：芯ほど熱く、縁は赤い。火がつく前は暗い熾火、つく瞬間は白く光る
          if (alpha[i] > 0.01 || core[i] > 0.02) {
            const flare = (o.bright ? 0.6 : 0.35) * Math.exp(-Math.max(0, t - tl.ignite - (o.bright ? 0.12 : 0.25)) / 0.3) * clamp(ak);
            const ember = 0.3 + 0.08 * nn[0];
            const fire = o.bright ? 0.27 + 0.45 * core[i] + 0.45 * nn[0] + 0.16 * nn[1] + flare : 0.36 + 0.5 * core[i] + 0.34 * nn[0] + 0.12 * nn[1] + flare;
            const fl = (ember + (fire - ember) * clamp(lit)) * (0.6 + 0.4 * vis) + 0.45 * rim - (1 - vis) * 1.2;
            putFire(ldata, i4, fl, 0);
          }
          // 画の上から立ちのぼる炎（画の外だけ）
          const h0 = hgt[i];
          if (alpha[i] < 0.5 && h0 < size * 1.2 && colH[px] > 0.5) {
            const qx = Math.min(rw - 1, Math.max(0, Math.round(px + sway * 0.8 * Math.min(1, h0 / (size * 0.3)) * rs)));
            const h = hgt[py * rw + qx];
            const v = h / colH[px];
            if (v < 1.65) {
              const fc = 0.95 * (1 - v) + 0.95 * nn[0] * (0.3 + 0.7 * Math.min(1.2, v)) - 0.6 * Math.max(0, v - 0.95);
              const edge = clamp(1 - Math.abs(fc - 0.2) / 0.35);
              // 字の中のすき間では、上の画の手前で炎を消して画と画の間を残す
              const room = clamp((up[i] - size * 0.02) / (size * 0.13));
              const f = ((fc + nn[1] * (0.1 + 0.45 * edge)) * (lit < 0.5 ? 0.4 + 0.6 * lit / 0.5 : 1) * (lit < 0.15 ? lit / 0.15 : 1) * room) * (0.6 + 0.4 * vis) * (o.bright ? 0.88 : 1) - (1 - vis) * 0.9;
              putFire(data, i4, f, 0);
            }
          }
          // 手前の炎：字の下のほうの前を這い上がる炎の舌（文字のある幅だけ、まだらに）
          if (o.front > 0 && S.cover[px] > 0.01) {
            const hb = baseY - Y;
            const Hfr = colH[px] * 0.85 * S.cover[px];
            if (hb > -size * 0.22 && Hfr > 1) {
              const v = Math.max(0, hb) / Hfr;
              if (v < 1.65) {
                fbm2(X + sway * 1.3 + 1000, Y + t * size * 2.6, size * 0.1, size * 0.28, seed + 300, nn2);
                const fc = 0.85 * (1 - v) + 0.95 * nn2[0] * (0.35 + 0.65 * Math.min(1.2, v)) - 0.6 * Math.max(0, v - 0.95);
                const edge = clamp(1 - Math.abs(fc - 0.2) / 0.35);
                // 足元は模様に沿ってぎざぎざに切る（平らな線を作らない）
                const footE = clamp((hb + size * 0.05 + size * 0.09 * nn2[0]) / (size * 0.1));
                // 炎の舌：炎の模様と一緒に昇るまだら（ところどころ字が見える）
                const cl = smooth(clamp(0.55 + 1.4 * gnoise((X + sway) / (size * 0.09), (Y + t * size * 2.6) / (size * 0.45), seed + 320)));
                const f = (fc + nn2[1] * (0.1 + 0.45 * edge)) * (lit < 0.5 ? 0.4 + 0.6 * lit / 0.5 : 1) * (lit < 0.15 ? lit / 0.15 : 1) * cl * (0.5 + 0.5 * footE) * (0.6 + 0.4 * vis) - (1 - footE) * 0.9 - (1 - vis) * 0.9;
                putFire(fdata, i4, f, 0);
              }
            }
          }
        }
      }
    }
    S.fx.putImageData(S.img, 0, 0);
    S.lx.putImageData(S.limg, 0, 0);
    if (o.front > 0) S.fx3.putImageData(S.img3, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (showA > 0.001 && M) S.dx.putImageData(S.dimg, 0, 0);
    // 影と照り返しは、消える演出があるときは別の層に描いて、消えたところを抜いてから重ねる
    const under = M ? S.lx2 : ctx;
    if (M) { under.setTransform(1, 0, 0, 1, 0, 0); under.globalCompositeOperation = 'source-over'; under.globalAlpha = 1; under.clearRect(0, 0, W, H); }
    if (showA > 0.001 && !o.bright) {
      // うっすら暗い影：明るい背景の上でも字の形が分かるように
      under.globalAlpha = showA * 0.55;
      under.shadowColor = fcol(24, 4, 0, 0.9);
      under.shadowBlur = size * 0.12;
      under.fillStyle = fcol(24, 4, 0, 0.6);
      o.shape(under, 'fill');
      under.shadowBlur = 0;
      under.globalAlpha = 1;
    }
    // 熱の照り返し（燃えている間だけ、字のまわりに薄く）
    const glowK = Math.min(1, Math.max(0, ...[0.15, 0.5, 0.85].map(f => colA[Math.round(rw * (S.box.x0 + (S.box.x1 - S.box.x0) * f) / W)] || 0)));
    if (glowK > 0.01) {
      under.shadowColor = o.bright ? fcol(255, 170, 50, (0.85 * glowK * showA).toFixed(3)) : fcol(255, 96, 20, (0.75 * glowK * showA).toFixed(3));
      under.shadowBlur = size * (o.bright ? 0.28 : 0.35);
      under.fillStyle = fcol(255, 96, 20, 0.01);
      o.shape(under, 'fill');
      under.shadowBlur = 0;
    }
    if (M) {
      under.globalCompositeOperation = 'destination-in';
      under.imageSmoothingEnabled = true;
      under.drawImage(S.dc, 0, 0, W, rh / rs);
      under.globalCompositeOperation = 'source-over';
      ctx.drawImage(S.lc2, 0, 0);
    }
    ctx.drawImage(S.fc, 0, 0, W, rh / rs);
    // 文字：くっきりした字の形の中だけに、燃える模様を流し込む。焦げた細い縁で炎と見分けがつく
    const lay = M ? S.lx2 : ctx;
    if (M) { lay.setTransform(1, 0, 0, 1, 0, 0); lay.globalCompositeOperation = 'source-over'; lay.globalAlpha = 1; lay.clearRect(0, 0, W, H); }
    if (showA > 0.001) {
      lay.globalAlpha = showA;
      lay.lineJoin = 'round';
      if (!o.bright) {
        lay.strokeStyle = fcol(34, 6, 0, 0.78);
        lay.lineWidth = size * 0.035;
        o.shape(lay, 'stroke');
      }
      lay.globalAlpha = 1;
      const tx = S.tx;
      tx.setTransform(1, 0, 0, 1, 0, 0);
      tx.globalCompositeOperation = 'source-over';
      tx.clearRect(0, 0, W, H);
      tx.fillStyle = '#fff';
      o.shape(tx, 'fill');
      tx.globalCompositeOperation = 'source-in';
      tx.imageSmoothingEnabled = true;
      tx.imageSmoothingQuality = 'high';
      tx.drawImage(S.lc, 0, 0, W, rh / rs);
      lay.globalAlpha = showA;
      lay.drawImage(S.tc, 0, 0);
      if (o.bright) {
        // 光る縁取り：外側は金色に光る帯、中心に白く熱い線。火がついた瞬間はさらに太く明るい
        const boom = Math.exp(-Math.max(0, t - tl.ignite) / 0.3);
        // o.lining（#rrggbb）で縁取りの色を変えられる。なければ試作どおりの金（炎の色相に合わせて回す）
        const lin = o.lining ? hexRGB(o.lining) : null;
        lay.shadowColor = lin ? `rgba(${lin[0]},${lin[1]},${lin[2]},0.95)` : fcol(255, 165, 40, 0.95);
        lay.shadowBlur = size * (0.06 + 0.12 * boom);
        lay.strokeStyle = lin ? o.lining : fcol(255, 180, 58, 1);
        lay.lineWidth = size * (0.032 + 0.03 * boom);
        o.shape(lay, 'stroke');
        lay.shadowBlur = 0;
        const og = lay.createLinearGradient(0, S.box.y0 - size * 0.08, 0, S.box.y1 + size * 0.08);
        og.addColorStop(0, '#ffffff');
        og.addColorStop(1, lin ? mixWhite(lin, 0.7) : fcol(255, 240, 176, 1));
        lay.strokeStyle = og;
        lay.lineWidth = size * (0.012 + 0.018 * boom);
        o.shape(lay, 'stroke');
      }
      lay.globalAlpha = 1;
      if (M) {
        // 消えたところ・まだ燃え移っていないところは縁取りごと抜く
        lay.globalCompositeOperation = 'destination-in';
        lay.imageSmoothingEnabled = true;
        lay.drawImage(S.dc, 0, 0, W, rh / rs);
        lay.globalCompositeOperation = 'source-over';
        ctx.drawImage(S.lc2, 0, 0);
      }
    }
    if (o.front > 0) {
      // 手前の炎は光として足す：字の上では明るい炎の舌になり、赤い縁は字を汚さない
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = o.front;
      ctx.drawImage(S.fc3, 0, 0, W, rh / rs);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // 文字が火の粉になって散る
    if (D && t > D.start) {
      const ni = S.inner.length / 2;
      drawDust(ctx, W, H, t, ni ? o.dust || 260 : 0, seed + 700, j => {
        const pi = Math.floor(rnd(j, 1, seed + 700) * ni) * 2;
        const x = S.inner[pi], y = S.inner[pi + 1];
        return { x, y, te: D.start + D.dur * (x - D.x0) / (D.x1 - D.x0) + 0.03 * rnd(j, 2, seed + 700) };
      }, size, D.end);
    }
    // 火の粉：画の上の縁から昇る
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const u = H / 720;
    const nt = S.tops.length / 2;
    const n = nt ? o.embers : 0;
    const t0 = tl.ignite, t1 = tl.out + tl.outDur * 0.5;
    for (let j = 0; j < n; j++) {
      const ts = t0 + (t1 - t0) * rnd(j, 1, seed);
      const life = 0.6 + 0.6 * rnd(j, 2, seed);
      const k = (t - ts) / life;
      if (k <= 0 || k >= 1) continue;
      const pi = Math.floor(rnd(j, 3, seed) * nt) * 2;
      const x0 = S.tops[pi], y0 = S.tops[pi + 1] - size * 0.08;
      if (D && ts > D.start + D.dur * (x0 - D.x0) / (D.x1 - D.x0)) continue;
      if (A && ts < A.start + A.dur * (A.x1 - x0) / (A.x1 - A.x0)) continue;
      const rise = size * (0.8 + 1.1 * rnd(j, 4, seed));
      const sway = size * (0.05 + 0.12 * rnd(j, 5, seed));
      const pos = kk => [x0 + Math.sin(kk * TAU * (1 + 1.5 * rnd(j, 6, seed)) + j) * sway * kk, y0 - rise * (1 - Math.pow(1 - kk, 1.6))];
      const [x, y] = pos(k);
      const [x1, y1] = pos(Math.max(0, k - 0.03 / life));
      // 終わりまでに必ず消える（繰り返し再生で途切れない）
      const a = clamp(k / 0.06) * Math.pow(1 - k, 1.3) * clamp((tl.out + tl.outDur + 0.3 - t) / 0.35) * (D && D.end ? clamp((D.end - 0.05 - t) / 0.4) : 1);
      ctx.strokeStyle = fcol(255, Math.round(165 + 70 * (1 - k)), Math.round(60 + 90 * (1 - k)), a.toFixed(3));
      ctx.lineWidth = u * (1.6 + 1.6 * rnd(j, 7, seed));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
  }

  /* ================= 一本につなげた演出：ブレス → 文字が燃え上がる → 火の粉になって消える ================= */
  function drawFlamingBattle(ctx, W, H, t, opt = {}) {
    const sq = { breathRun: 0.24, sweep: 0.16, dissolve: 2.3, dissolveDur: 0.95, ...(opt.seq || {}) };
    const res = opt.res || 0.67;
    // 文字の大きさ（ピクセル）と範囲：opt.box { x0, x1, cy } があればその文字に合わせ、なければ試作の「戦闘開始」と同じ配置
    const size = opt.sizePx || Math.round(0.3 * H);
    const bx = opt.box || { x0: W * 0.143, x1: W * 0.857, cy: H * 0.58 };
    const ground = (bx.cy + size * 0.52) / H;
    // ブレスが一瞬で地面を走り、字の右端で先端が止まって爆弾のように燃え上がる。尾はその爆発へ吸い込まれて消える
    const bstart = sq.start ?? 0.03, XE = bx.x1 / W + 0.003;
    // 爆発の時刻（sq.boom）が決まっていれば、そこで先端が字の右端に届く速さで走らせる
    const breathRun = sq.boom != null ? Math.max(0.05, (sq.boom - bstart) * 1.24 / (XE + 0.12)) : sq.breathRun;
    const boomAt = bstart + breathRun * (W * XE + W * 0.12) / (W * 1.24);
    const end = sq.end ?? sq.dissolve + sq.dissolveDur + 0.8;
    drawFireBreath(ctx, W, H, t, { res, hue: opt.hue, embers: 30, breath: { start: bstart, run: breathRun, hold: 0, stop: true, xe: XE, ground, up: 0, blast: 1.2 * (opt.blast ?? 1), blastGrow: 0.13, blastLife: 0.85, floor: false, dust: 0, tailRun: 0.2, flow: 2.6, end } });
    // 爆風が右から左へ字をなめて、字が燃え上がる
    const pad = size * 0.75;
    const dx = size * 0.16;
    drawFlamingText(ctx, W, H, t, { res, sizePx: size, y: bx.cy / H, shape: opt.shape, shapeKey: opt.shapeKey, hue: opt.hue, lining: opt.lining, rise: opt.rise ?? 1,
      bright: true, front: 0.92, lag: sq.sweep, lagDir: -1,
      timeline: { show: boomAt, ignite: boomAt + 0.02, fadeIn: 0.04, rise: 0.12, peak: 1.8, out: 1e9, outDur: 1 },
      appear: { start: boomAt + 0.01, dur: sq.sweep, x0: bx.x0 - pad, x1: bx.x1 + pad * 0.3 },
      dissolve: { start: sq.dissolve, dur: sq.dissolveDur, x0: bx.x0 + dx - pad, x1: bx.x1 - dx + pad, end } });
  }

  root.TextApngFireFx = { drawFireWall, drawFireBreath, breathTimes, drawFlamingText, drawFlamingBattle };
})(typeof window !== 'undefined' ? window : globalThis);
