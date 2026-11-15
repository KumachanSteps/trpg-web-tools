// 雨・嵐（ループ・透過）。drawRain(ctx, W, H, t, opt) 1つで、opt.level（1〜5）を変えると
//   1 霧雨 / 2 小雨 / 3 本降り / 4 大雨 / 5 嵐  を描き分ける。
// opt.level の既定値（RAIN_PRESETS）の上に opt の値を上書きできる（例 {level:3, slope:0.3}）。
// 時刻 t は loop 秒で一周し、t と t+loop は同じ絵になる：
//   雨粒は1周で整数回落ちる（落ちる区間の長さを速さに合わせて調整）、突風・もや・稲光も loop の整数分の1の周期。
// 乱数は hash ベース（同じ時刻は必ず同じ絵）。
(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const mod = (a, n) => ((a % n) + n) % n;
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const smooth = x => x * x * (3 - 2 * x);

  // ---- 強さごとの既定値（数値は 1280×720 基準の px、速さは px/秒） ----
  // layers: 奥・中・手前。n=画面内に見えるおよその本数, v=落下速度, w=太さ, a=濃さ, sh=筋の長さ（速さ×秒）, sp=着地して跳ねる割合
  const RAIN_PRESETS = {
    1: { // 霧雨：細かく短い粒がゆっくり、ほぼ真下。うっすら煙る
      loop: 4, even: 0.6, slope: 0.035, sway: 0.03, gust: 0, splash: 'none', haze: 0.13, hazeMove: 'drift', spray: 0.04, flash: 0,
      layers: [
        { n: 1000, v: [150, 200], w: 1.0, a: 0.3, sh: 0.05, sp: 0 },
        { n: 600, v: [220, 280], w: 1.15, a: 0.42, sh: 0.055, sp: 0 },
        { n: 190, v: [310, 380], w: 1.4, a: 0.52, sh: 0.06, sp: 0 },
      ],
    },
    2: { // 小雨：まばらな雨筋。下でときどき小さな波紋と跳ね
      loop: 3, slope: 0.06, sway: 0.01, gust: 0, splash: 'ripple', haze: 0, spray: 0, flash: 0,
      layers: [
        { n: 46, v: [640, 780], w: 0.9, a: 0.4, sh: 0.05, sp: 0 },
        { n: 34, v: [860, 1020], w: 1.25, a: 0.55, sh: 0.055, sp: 0.6 },
        { n: 14, v: [1100, 1280], w: 1.7, a: 0.68, sh: 0.06, sp: 0.7 },
      ],
    },
    3: { // 本降り：しっかりした雨筋が3層。下端で跳ね返り
      loop: 2, slope: 0.1, sway: 0, gust: 0, splash: 'crown', haze: 0.02, spray: 0.06, flash: 0,
      layers: [
        { n: 250, v: [820, 950], w: 0.9, a: 0.34, sh: 0.06, sp: 0 },
        { n: 150, v: [1150, 1330], w: 1.4, a: 0.52, sh: 0.065, sp: 0.55 },
        { n: 56, v: [1550, 1780], w: 2.1, a: 0.68, sh: 0.07, sp: 0.8 },
      ],
    },
    4: { // 大雨：太く密な雨がやや斜め。下にしぶき、全体が白くけむる
      loop: 2, slope: 0.24, sway: 0, gust: 0, splash: 'crown', haze: 0.1, hazeMove: 'drift', spray: 0.26, flash: 0,
      layers: [
        { n: 480, v: [1000, 1150], w: 1.1, a: 0.36, sh: 0.065, sp: 0 },
        { n: 280, v: [1400, 1600], w: 1.8, a: 0.5, sh: 0.07, sp: 0.6 },
        { n: 100, v: [1900, 2200], w: 2.8, a: 0.64, sh: 0.075, sp: 0.85 },
      ],
    },
    5: { // 嵐：横殴り。突風で角度と密度が周期的に強まり、もやが流れ、遠い稲光
      loop: 4, slope: 1.0, sway: 0, gust: 0.42, gustDensity: 0.42, splash: 'crown', haze: 0.12, hazeMove: 'flow', hazeFlat: 0.3, hazeSheet: 1.2, spray: 0.22, flash: 1,
      layers: [
        { n: 380, v: [1000, 1150], w: 1.1, a: 0.38, sh: 0.055, sp: 0 },
        { n: 250, v: [1350, 1550], w: 1.8, a: 0.5, sh: 0.06, sp: 0.5 },
        { n: 100, v: [1800, 2100], w: 2.7, a: 0.64, sh: 0.07, sp: 0.75 },
      ],
    },
  };

  // 色：白〜淡い青灰。明るい背景でも見えるよう、暗い青灰の縁を下に敷く
  const LIGHT = [232, 239, 247], MIDC = [186, 202, 220], DARK = [34, 46, 62];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

  // ---- 上下左右につながるもや模様（0〜1 の alpha） ----
  let tex = null;
  function makeTex() {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
    const wrapNoise = (u, v, per, seed) => {
      const iu = Math.floor(u), iv = Math.floor(v), fu = smooth(u - iu), fv = smooth(v - iv);
      const g = (a, b) => rnd(mod(a, per), mod(b, per), seed);
      const a = g(iu, iv), b = g(iu + 1, iv), cc = g(iu, iv + 1), dd = g(iu + 1, iv + 1);
      return a + (b - a) * fu + (cc - a) * fv + (a - b - cc + dd) * fu * fv;
    };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      let n = 0, amp = 1, per = 3;
      // オクターブは少なめ（なめらかなもや＝APNG が軽い）
      for (let o = 0; o < 2; o++) { n += amp * wrapNoise(px / N * per, py / N * per, per, 900 + o); amp *= 0.4; per *= 2; }
      n /= 1.4;
      const i4 = (py * N + px) * 4;
      d[i4] = d[i4 + 1] = d[i4 + 2] = 255;
      d[i4 + 3] = 255 * clamp((n - 0.42) * 2.6);
    }
    x.putImageData(img, 0, 0);
    tex = c;
  }
  let buf = null;
  const getBuf = (w, h) => {
    if (!buf || buf.width !== w || buf.height !== h) buf = Object.assign(document.createElement('canvas'), { width: w, height: h });
    return buf;
  };

  function drawRain(ctx, W, H, t, opt = {}) {
    const lv = clamp(Math.round(opt.level || 3), 1, 5);
    const o = { ...RAIN_PRESETS[lv], seed: 7, ...opt };
    const L = o.loop, s = H / 720;
    const P = TAU / L;
    let warm = false;
    if (!tex) { makeTex(); warm = true; }

    // 風：傾き slope(t) = 横の速さ / 縦の速さ。嵐は2つの波を足した突風（周期 L/1, L/2）
    const g1 = 0.62, g2 = 0.38; // 突風の形
    const gustF = tt => g1 * Math.sin(P * tt - 1.2) + g2 * Math.sin(2 * P * tt + 0.4);       // -1〜1
    const gustI = tt => -g1 * Math.cos(P * tt - 1.2) / P - g2 * Math.cos(2 * P * tt + 0.4) / (2 * P); // 積分
    const swayF = tt => Math.sin(P * tt);
    const swayI = tt => -Math.cos(P * tt) / P;
    const slopeAt = tt => o.slope + o.gust * gustF(tt) + o.sway * swayF(tt);
    const slopeInt = tt => o.slope * tt + o.gust * gustI(tt) + o.sway * swayI(tt); // ∫slope dt
    const gNow = o.gust ? clamp(0.5 + 0.5 * gustF(t)) : 0.5;                       // 0〜1 の突風の強さ
    const flash = o.flash ? flashAt(t, L) : 0;

    // ---- もや（雨の奥）----
    if (o.haze > 0 || o.spray > 0) {
      // 最初の1回だけ、捨てキャンバスに一度描いておく（初回だけ描画経路が変わり、t=0 と t=loop の絵がわずかにずれるのを防ぐ）
      if (warm) { const sc = document.createElement('canvas'); sc.width = W; sc.height = H; drawHaze(sc.getContext('2d'), W, H, t, o, gNow, s); }
      drawHaze(ctx, W, H, t, o, gNow, s);
    }

    // ---- 雨筋 ----
    const maxSlope = Math.abs(o.slope) + Math.abs(o.gust) + Math.abs(o.sway);
    o.layers.forEach((ly, li) => {
      const seed = o.seed * 1000 + li * 97;
      const vMid = (ly.v[0] + ly.v[1]) / 2 * s;
      const lenMax = ly.v[1] * s * ly.sh * Math.sqrt(1 + maxSlope * maxSlope);
      const mt = lenMax + 10 * s;                   // 上の余白（筋が画面の外から入ってくる）
      const splashDur = 0.32;
      const mb = Math.max(lenMax, splashDur * ly.v[1] * s) + 20 * s;
      const minSpan = H + mt + mb;
      const mx = lenMax * maxSlope + 40 * s;        // 左右の余白
      const spanW = W + mx * 2;
      // 画面内に n 本見える数 → 全体の本数（落ちる区間・横の区間ぶん増やす）
      const count = Math.round(ly.n * (W * H) / (1280 * 720) * (spanW / W) * (minSpan * 1.15 / H));
      const wpx = ly.w * s, halo = Math.max(0.9, wpx * 0.55) * 1.0;
      for (let i = 0; i < count; i++) {
        const R = k => rnd(i, k, seed);
        const v = (ly.v[0] + (ly.v[1] - ly.v[0]) * R(1)) * s;
        const k = Math.max(1, Math.floor(v * L / minSpan));  // 1周で何回落ちるか（整数）
        const span = v * L / k;
        const fall = span / v;                               // 1回の落下にかかる秒数
        const u = R(2) + t / fall;
        const c = Math.floor(u), cm = mod(c, k), p = u - c;
        const Rc = kk => rnd(i * 31 + cm, kk, seed + 5);
        const ts = t - p * fall;                             // この回の出発時刻
        const y = -mt + p * span;
        // 横：出発位置＋風で流された量（傾きの積分 × 縦の速さ）
        const xs = Rc(3) * spanW;
        const xAt = tt => mod(xs + v * (slopeInt(tt) - slopeInt(ts)), spanW) - mx;
        // 地面：一部の粒は下の帯で着地して跳ねる（手前ほど下）
        const lands = o.splash !== 'none' && Rc(4) < ly.sp;
        const gy = lands ? H * (li === 2 ? 0.9 + 0.1 * Rc(5) : 0.8 + 0.12 * Rc(5)) : H + mt + 1e6;
        // 突風で密度が上下：粒ごとの順位と比べてふわっと出入り
        let vis = 1;
        if (o.gust) { const dens = 1 - o.gustDensity * (1 - gNow); vis = clamp((dens - R(6)) / 0.12); }
        if (vis <= 0.01) continue;
        const al = ly.a * (0.7 + 0.3 * R(7)) * vis * (1 + flash * 0.8);
        const sl = slopeAt(t);
        const len = v * ly.sh * (0.85 + 0.3 * R(8)) * Math.sqrt(1 + sl * sl);
        const dl = Math.sqrt(1 + sl * sl), ux = sl / dl, uy = 1 / dl;   // 落ちる向き
        if (y - len * uy < gy) {
          const x = xAt(t);
          let hx = x, hy = y, tx = x - ux * len, ty = y - uy * len;
          if (hy > gy) { const f = (gy - ty) / (hy - ty); hx = tx + (hx - tx) * f; hy = gy; } // 地面で切る
          if (Math.max(hx, tx) > -10 && Math.min(hx, tx) < W + 10 && hy > -10) streak(ctx, tx, ty, hx, hy, wpx, halo, al, (y - hy) / len, o.even || 0);
        }
        if (lands && y > gy) {
          const age = (y - gy) / v;            // 着地からの秒数
          if (age < splashDur) {
            const tl = t - age;
            splash(ctx, xAt(tl), gy, age, splashDur, o, li, Rc, s, ly.a * vis * (1 + flash * 0.6), slopeAt(tl));
          }
        }
      }
    });

    // ---- 稲光：画面がふっと明るくなる ----
    if (flash > 0.003) {
      const ev = flashEvent(t, L);
      const gx = W * ev.x, g = ctx.createRadialGradient(gx, -H * 0.3, H * 0.1, gx, -H * 0.3, W * 1.25);
      g.addColorStop(0, `rgba(236,240,255,${(0.5 * flash).toFixed(3)})`);
      g.addColorStop(0.55, `rgba(214,224,250,${(0.3 * flash).toFixed(3)})`);
      g.addColorStop(1, `rgba(200,212,245,${(0.14 * flash).toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // 筋1本：暗い縁（明るい背景用）→ 明るい芯。尾は消え、頭が明るい
  function streak(ctx, tx, ty, hx, hy, w, halo, al, cut, even) {
    const t0 = clamp(cut); // 地面で切ったぶん尾側から始まるグラデを詰める
    const gd = ctx.createLinearGradient(tx, ty, hx, hy);
    gd.addColorStop(0, rgba(DARK, al * 0.36 * even * 0.6));
    gd.addColorStop(1, rgba(DARK, al * 0.36 * (1 - t0 * 0.5)));
    ctx.lineCap = even > 0.3 ? 'butt' : 'round';
    ctx.strokeStyle = gd;
    ctx.lineWidth = w + halo * 2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    const gl = ctx.createLinearGradient(tx, ty, hx, hy);
    gl.addColorStop(0, rgba(MIDC, al * 0.6 * even));
    gl.addColorStop(0.55, rgba(MIDC, al * (0.55 + 0.3 * even)));
    gl.addColorStop(1, rgba(LIGHT, al));
    ctx.strokeStyle = gl;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
  }

  // 着地：波紋（小雨）か、王冠状の跳ね返り＋小さな波紋（本降り以上）
  function splash(ctx, x, gy, age, dur, o, li, Rc, s, al0, sl) {
    const a = age / dur;
    const big = li === 2 ? 1 : 0.6;
    ctx.lineCap = 'round';
    // 波紋（つぶれた楕円が広がって消える）
    const rr = (o.splash === 'ripple' ? 5 + 26 * Math.pow(a, 0.6) : 4 + 16 * Math.pow(a, 0.7)) * s * big * (0.8 + 0.4 * Rc(10));
    const ra = al0 * (o.splash === 'ripple' ? 0.9 : 0.55) * Math.pow(1 - a, 1.3);
    if (ra > 0.01) {
      ctx.save();
      ctx.translate(x, gy);
      ctx.scale(1, 0.24);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU);
      ctx.strokeStyle = rgba(DARK, ra * 0.5); ctx.lineWidth = (2.6 * big + 0.6) * s; ctx.stroke();
      ctx.strokeStyle = rgba(LIGHT, ra); ctx.lineWidth = (1.2 * big + 0.3) * s; ctx.stroke();
      ctx.restore();
    }
    // 跳ねる粒：上と横に飛んで落ちる（嵐は風下へ流される）
    const nd = o.splash === 'ripple' ? (Rc(11) < 0.5 ? 1 + Math.floor(Rc(12) * 2) : 0) : 3 + Math.floor(Rc(12) * 3 * big + big);
    const grav = 1400 * s;
    for (let j = 0; j < nd; j++) {
      const r = q => Rc(20 + j * 7 + q);
      const ang = (r(1) - 0.5) * 1.7;                  // 真上から左右へ
      const sp = (o.splash === 'ripple' ? 90 : 130 + 150 * big) * s * (0.6 + 0.6 * r(2)) * (o.level === 5 || o.gust ? 1.1 : 1);
      const vx0 = Math.sin(ang) * sp + sl * 120 * s, vy0 = -Math.cos(ang) * sp * (0.7 + 0.5 * r(3));
      const px = x + vx0 * age, py = gy + vy0 * age + 0.5 * grav * age * age;
      if (py > gy + 2 * s) continue;
      const vxn = vx0, vyn = vy0 + grav * age, vn = Math.hypot(vxn, vyn) || 1;
      const ln = Math.min(7, 2 + vn * 0.012) * s * big;
      const da = al0 * 0.95 * Math.pow(1 - a, 0.8);
      const w = (1.5 * big + 0.5) * s;
      ctx.beginPath(); ctx.moveTo(px - vxn / vn * ln, py - vyn / vn * ln); ctx.lineTo(px, py);
      ctx.strokeStyle = rgba(DARK, da * 0.35); ctx.lineWidth = w + 1.6 * s; ctx.stroke();
      ctx.strokeStyle = rgba(LIGHT, da); ctx.lineWidth = w; ctx.stroke();
    }
  }

  // 稲光：1周に2回（大きい二段の光り＋小さい光り）。周期 L で折り返す
  const FLASHES = [{ t: 0.3, amp: 1, x: 0.25 }, { t: 0.72, amp: 0.55, x: 0.8 }]; // t は loop に対する割合
  function flashAt(t, L) {
    let f = 0;
    for (const e of FLASHES) {
      const d = mod(t - e.t * L, L);
      // 最初の閃き → いったん暗く → 二度目の閃き → ゆっくり消える
      f += e.amp * (Math.exp(-d / 0.05) * (d < 0.05 ? d / 0.05 : 1) * 0.75 + (d > 0.14 ? Math.exp(-(d - 0.14) / 0.22) * clamp((d - 0.14) / 0.04) : 0));
    }
    return clamp(f);
  }
  function flashEvent(t, L) {
    let best = FLASHES[0], bd = 1e9;
    for (const e of FLASHES) { const d = mod(t - e.t * L, L); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  // もや：粗い解像度で、ムラのある白いもやを描いて拡大。spray は下にたまるしぶきのけむり
  function drawHaze(ctx, W, H, t, o, gNow, s) {
    const L = o.loop, rs = 0.25;
    const bw = Math.ceil(W * rs), bh = Math.ceil(H * rs);
    const b = getBuf(bw, bh), x = b.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, bw, bh);
    // 一様なうすいもや（どのコマも同じ＝軽い）＋ その上にムラ
    x.fillStyle = '#fff';
    x.globalAlpha = o.hazeFlat ?? 0.45;
    x.fillRect(0, 0, bw, bh);
    const pat = x.createPattern(tex, 'repeat');
    const passes = o.hazeMove === 'flow'
      // 嵐：風下へ流れる（1周で模様が整数枚ぶん横に流れる）
      ? [{ tile: 1.1, kx: 2, ky: 0, ph: 0, a: 1, sx: 1.6 }, { tile: 0.7, kx: 3, ky: 0, ph: 0.4, a: 0.7, sx: 1.4 }]
      // ほかはゆっくり揺れながら漂う
      : [{ tile: 1.0, amp: 0.06, ph: 0, a: 1, sx: 1.3 }, { tile: 0.6, amp: 0.05, ph: 0.5, a: 0.7, sx: 1.2 }];
    passes.forEach(q => {
      const tile = W * rs * q.tile;
      let ox, oy;
      if (o.hazeMove === 'flow') { ox = tile * q.sx * q.kx * t / L + tile * q.ph; oy = tile * q.ph * 0.7; }
      else { ox = tile * (q.ph + q.amp * Math.sin(TAU * t / L + q.ph * 5)); oy = tile * (q.ph * 0.6 + q.amp * 0.5 * Math.cos(TAU * t / L + q.ph * 3)) ; }
      pat.setTransform(new DOMMatrix().translate(ox, oy).scale(tile * q.sx / 256, tile / 256));
      x.fillStyle = pat;
      x.globalAlpha = q.a * (o.hazeSheet ?? 0.75);
      x.fillRect(0, 0, bw, bh);
    });
    // ムラを濃さの形に：全体（haze）＋ 下ほど濃い（spray）
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'destination-in';
    const gk = o.gust ? 0.55 + 0.9 * gNow : 1;
    const top = o.haze * gk, bot = Math.min(0.9, (o.haze + o.spray) * gk);
    const g = x.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, `rgba(255,255,255,${clamp(top * 0.7).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(255,255,255,${clamp(top).toFixed(3)})`);
    g.addColorStop(0.82, `rgba(255,255,255,${clamp(top + (bot - top) * 0.45).toFixed(3)})`);
    g.addColorStop(1, `rgba(255,255,255,${clamp(bot).toFixed(3)})`);
    x.fillStyle = g;
    x.fillRect(0, 0, bw, bh);
    // 色（淡い青灰の白）
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = 'rgb(214,223,234)';
    x.fillRect(0, 0, bw, bh);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(b, 0, 0, W, H);
    ctx.restore();
  }

  root.RAIN_PRESETS = RAIN_PRESETS;
  root.drawRain = drawRain;
  root.FX = { draw: drawRain };
})(typeof window !== 'undefined' ? window : globalThis);
