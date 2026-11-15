// 雪（ループ・透過）。drawSnow(ctx, W, H, t, opt) 1つで、opt.level（1〜4）を変えると
//   1 粉雪 / 2 ぼたん雪 / 3 吹雪（弱）/ 4 吹雪（強）  を描き分ける。
// opt.level の既定値（SNOW_PRESETS）の上に opt の値を上書きできる（例 {level:3, slope:1.4}）。
// 時刻 t は loop 秒で一周し、t と t+loop は同じ絵になる：
//   雪片は1周で整数回落ちる（落ちる区間の長さを速さに合わせる）、揺れ・回転・突風・雪煙は loop の整数分の1の周期。
// 乱数は hash ベース（同じ時刻は必ず同じ絵）。雪片は先に作ったスプライト（白〜淡い青白＋ごく淡い青灰の縁と影）を使い回す。
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

  // ---- 強さごとの既定値（数値は 1280×720 基準の px、速さは px/秒） ----
  // slope = 横の速さ / 縦の速さ（風）。gusts = 1周の中の突風（c=位置 0〜1, amp=強さ, w1=立ち上がり, w2=おさまり）
  // layers: 奥→手前。n=画面内に見えるおよその数, v=落下速度, r=半径, a=濃さ, blur=スプライトのぼけ段階(0〜3),
  //   sw=左右の揺れ幅, swm=揺れの回数/1周, fl=小刻みな揺れ幅, sp='dot'（丸い粒）/'botan'（ふわふわの塊）, spin=回転, swirl=回るような揺れ
  const SNOW_PRESETS = {
    1: { // 粉雪：細かく軽い粒が静かに舞い降りる。ゆらゆら左右に揺れる
      loop: 8, slope: 0.08, gust: 0, gusts: [], expo: 0, veil: 0, dust: null,
      layers: [
        { n: 520, v: [104, 120], r: [0.9, 1.4], a: 0.55, blur: 0, sw: [6, 14], swm: [2, 3], fl: 2.0, sp: 'dot' },
        { n: 330, v: [120, 160], r: [1.6, 2.4], a: 0.8, blur: 0, sw: [10, 22], swm: [2, 3], fl: 2.5, sp: 'dot' },
        { n: 46, v: [170, 230], r: [3.4, 5.2], a: 0.75, blur: 2, sw: [18, 34], swm: [1, 2], fl: 3.0, sp: 'dot' },
      ],
    },
    2: { // ぼたん雪：大きくふわふわした雪片がゆっくり。手前はぼけて、回るように揺れる
      loop: 8, slope: 0.05, gust: 0, gusts: [], expo: 0, veil: 0, dust: null,
      layers: [
        { n: 150, v: [104, 116], r: [2.2, 3.4], a: 0.7, blur: 0, sw: [6, 12], swm: [1, 2], fl: 1, sp: 'botan', spin: 1, swirl: 0.5 },
        { n: 75, v: [116, 140], r: [7, 11], a: 0.95, blur: 0, sw: [14, 26], swm: [1, 2], fl: 1.5, sp: 'botan', spin: 1, swirl: 0.6 },
        { n: 14, v: [150, 190], r: [20, 32], a: 0.8, blur: 3, sw: [30, 50], swm: [1, 2], fl: 2, sp: 'botan', spin: 1, swirl: 0.7 },
      ],
    },
    3: { // 吹雪（弱）：風で斜めに流れる。ときどき突風で角度・速さ・密度が強まる
      loop: 6, slope: 0.85, gust: 1.1, gusts: [{ c: 0.42, amp: 1, w1: 0.07, w2: 0.16 }], gustDensity: 0.4, expo: 1 / 45,
      veil: 0.07, veilBase: 0, dust: null,
      layers: [
        { n: 650, v: [140, 175], r: [0.9, 1.4], a: 0.6, blur: 0, sw: [4, 10], swm: [2, 3], fl: 2, sp: 'dot' },
        { n: 320, v: [190, 240], r: [1.7, 2.6], a: 0.8, blur: 0, sw: [6, 14], swm: [2, 3], fl: 2, sp: 'dot' },
        { n: 60, v: [260, 330], r: [3.6, 5.6], a: 0.78, blur: 2, sw: [10, 20], swm: [1, 2], fl: 3, sp: 'dot' },
      ],
    },
    4: { // 吹雪（強）：横殴り。密な雪が高速で流れ、細かい雪粉の雪煙が走り、突風で視界が白くかすむ
      loop: 4, slope: 3.6, gust: 1.6, gusts: [{ c: 0.3, amp: 1, w1: 0.05, w2: 0.12 }, { c: 0.8, amp: 0.7, w1: 0.05, w2: 0.1 }], gustDensity: 0.35, expo: 1 / 50,
      veil: 0.28, veilBase: 0.05, front: { npass: 2, width: 0.55, tilt: 0.15 },
      dust: { n: 4200, v: [180, 300], slope: 4.4, r: [0.7, 1.15], a: 0.75, base: 0.1, expo: 0.3 },
      layers: [
        { n: 1000, v: [220, 280], r: [0.9, 1.4], a: 0.62, blur: 0, sw: [3, 8], swm: [3, 4], fl: 6, sp: 'dot' },
        { n: 480, v: [290, 360], r: [1.6, 2.5], a: 0.82, blur: 0, sw: [4, 10], swm: [3, 4], fl: 8, sp: 'dot' },
        { n: 80, v: [380, 470], r: [3.5, 5.5], a: 0.78, blur: 2, sw: [6, 14], swm: [2, 3], fl: 10, sp: 'dot' },
      ],
    },
  };

  // ---- スプライト ----
  // 色：芯は白、ふちは淡い青白。下に淡い青灰の影（右下に少しずらす）＝明るい背景でも輪郭が分かる
  const SP = 96, R0 = 24; // スプライトの大きさと、その中の雪片の半径（px）
  let sprites = null;
  function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
  function makeDot(blur) {
    const c = canvas(SP), x = c.getContext('2d'), m = SP / 2;
    const b = [0, 2, 4.5, 8][blur];
    // 影：下へずらした淡い青灰（輪ではなく、下側の陰として見えるように）
    x.filter = `blur(${(R0 * 0.12 + b).toFixed(1)}px)`;
    // blur 0 は小さな粒（半径 1〜2.6px）専用：影を少し大きく濃くして、明るい背景でも点として残るように
    x.fillStyle = `rgba(78,98,128,${blur >= 2 ? 0.62 : blur === 0 ? 0.95 : 0.85})`;
    x.beginPath(); x.arc(m + R0 * 0.06, m + R0 * (blur >= 2 ? 0.3 : blur === 0 ? 0.3 : 0.24), R0 * (blur === 0 ? 1.18 : 1.04), 0, TAU); x.fill();
    // 本体：白い芯 → 淡い青白のふち（ふちまでしっかり不透明）
    x.filter = b ? `blur(${b}px)` : 'none';
    const g = x.createRadialGradient(m - R0 * 0.2, m - R0 * 0.25, 0, m, m, R0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(250,252,255,1)');
    g.addColorStop(0.82, 'rgba(234,242,252,1)');
    g.addColorStop(0.96, 'rgba(220,232,248,0.92)');
    g.addColorStop(1, 'rgba(214,228,246,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(m, m, R0, 0, TAU); x.fill();
    return c;
  }
  // ぼたん雪：小さな丸を寄せ集めたふわふわの塊（ふちに細かい毛羽）。v = 形の番号
  function makeBotan(v, blur) {
    const shape = canvas(SP), sx = shape.getContext('2d'), m = SP / 2;
    const R = k => rnd(v, k, 4242);
    const nb = 7 + Math.floor(R(0) * 5);
    sx.fillStyle = '#fff';
    sx.beginPath(); sx.arc(m, m, R0 * 0.55, 0, TAU); sx.fill();
    for (let i = 0; i < nb; i++) {
      const ang = TAU * (i / nb + R(10 + i) * 0.25), d = R0 * (0.35 + 0.35 * R(30 + i));
      const rr = R0 * (0.28 + 0.22 * R(50 + i));
      sx.beginPath(); sx.arc(m + Math.cos(ang) * d, m + Math.sin(ang) * d * 0.85, rr, 0, TAU); sx.fill();
    }
    // 毛羽：ふちの外側の小さな粒
    for (let i = 0; i < 10; i++) {
      const ang = TAU * R(100 + i), d = R0 * (0.75 + 0.3 * R(130 + i));
      sx.beginPath(); sx.arc(m + Math.cos(ang) * d, m + Math.sin(ang) * d * 0.85, R0 * (0.06 + 0.07 * R(160 + i)), 0, TAU); sx.fill();
    }
    const b = [0, 2, 4.5, 7][blur];
    // 影（青灰）：本体とは別のスプライト。描くときに画面の下向きへずらす（回転しても影はいつも下）
    const sh = canvas(SP), y = sh.getContext('2d');
    const tint = canvas(SP), tx = tint.getContext('2d');
    tx.drawImage(shape, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgb(84,104,134)'; tx.fillRect(0, 0, SP, SP);
    y.filter = `blur(${(2.6 + b).toFixed(1)}px)`;
    y.globalAlpha = blur >= 2 ? 0.5 : 0.8;
    const k = blur >= 2 ? 0.9 : 1;
    y.drawImage(tint, m - m * k, m - m * k, SP * k, SP * k);
    // 本体：ふちが淡い青白、中が白（ぼかした白を重ねて中ほど明るく）
    const c = canvas(SP), x = c.getContext('2d');
    const tint2 = canvas(SP), t2 = tint2.getContext('2d');
    t2.drawImage(shape, 0, 0); t2.globalCompositeOperation = 'source-in'; t2.fillStyle = 'rgb(234,241,251)'; t2.fillRect(0, 0, SP, SP);
    x.filter = `blur(${(1.1 + b).toFixed(1)}px)`;
    x.drawImage(tint2, 0, 0);
    x.filter = `blur(${(3 + b).toFixed(1)}px)`;
    x.globalCompositeOperation = 'source-atop';
    const g = x.createRadialGradient(m - 4, m - 5, 0, m, m, R0 * 1.1);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, SP, SP);
    return { body: c, shadow: sh };
  }
  function makeSprites() {
    sprites = { dot: [0, 1, 2, 3].map(makeDot), botan: [0, 1, 2, 3].map(b => [0, 1, 2, 3, 4, 5, 6, 7].map(v => makeBotan(v, b))) };
    // 雪粉（雪煙の粒）：影なしの小さな白
    const c = canvas(8), x = c.getContext('2d');
    const g = x.createRadialGradient(4, 4, 0, 4, 4, 4);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(240,246,252,0.8)'); g.addColorStop(1, 'rgba(230,238,248,0)');
    x.fillStyle = g; x.fillRect(0, 0, 8, 8);
    sprites.dust = c;
  }

  // ---- 風：slope(t) = slope + gust × 突風の形(t)。横の移動量のための積分は表で持つ ----
  function makeWind(o) {
    const L = o.loop, N = 1024;
    const shape = ph => {
      let s = 0;
      for (const g of o.gusts) {
        const d = mod(ph - g.c + 0.5, 1) - 0.5;
        s += g.amp * Math.exp(-Math.pow(d / (d < 0 ? g.w1 : g.w2), 2));
      }
      return s;
    };
    const tab = new Float64Array(N + 1);
    let acc = 0, prev = shape(0);
    for (let i = 1; i <= N; i++) { const cur = shape(i / N); acc += (prev + cur) / 2 * (L / N); tab[i] = acc; prev = cur; }
    const tot = acc;
    const shapeInt = tt => { // ∫0..tt shape
      const q = tt / L, f = Math.floor(q), fr = (q - f) * N, i = Math.floor(fr), a = fr - i;
      return f * tot + tab[i] + (tab[Math.min(N, i + 1)] - tab[i]) * a;
    };
    return {
      g: tt => shape(mod(tt / L, 1)),
      slope: tt => o.slope + o.gust * shape(mod(tt / L, 1)),
      slopeInt: tt => o.slope * tt + o.gust * shapeInt(tt),
    };
  }

  // 雪煙の前線：1周で npass 回、左から右へ画面を横切る（突風の山で画面中央）
  function frontAt(o, W, H, t) {
    const f = o.front; if (!f) return null;
    const c0 = o.gusts[0].c, span = 2.2 * W;
    const u = mod(t / o.loop * f.npass + 0.5 - c0 * f.npass, 1);
    return { x: W / 2 + (u - 0.5) * span, span, w: f.width * W, tilt: f.tilt };
  }
  // 前線の濃さ 0〜1（となりの周回ぶんも足して、折り返しで途切れないように）
  const frontE = (fr, x, y, H) => {
    if (!fr) return 0;
    const d = x - fr.x - fr.tilt * (y - H / 2);
    let e = 0;
    for (let k = -1; k <= 1; k++) e += Math.exp(-Math.pow((d - k * fr.span) / fr.w, 2));
    return Math.min(1, e);
  };

  function drawSnow(ctx, W, H, t, opt = {}) {
    const lv = clamp(Math.round(opt.level || 1), 1, 4);
    const o = { ...SNOW_PRESETS[lv], seed: 11, ...opt };
    const L = o.loop, s = H / 720;
    if (!sprites) makeSprites();
    const wind = makeWind(o);
    const gNow = o.gusts.length ? clamp(wind.g(t)) : 0;
    const fr = frontAt(o, W, H, t);
    const maxSlope = Math.abs(o.slope) + Math.abs(o.gust);
    ctx.save();
    o.layers.forEach((ly, li) => {
      drawLayer(ctx, W, H, t, o, ly, li, wind, gNow, fr, s, maxSlope);
      if (li === 0 && (o.veil > 0)) drawVeil(ctx, W, H, t, o, gNow, fr);
      if (li === 1 && o.dust) drawDust(ctx, W, H, t, o, fr, s);
    });
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  function drawLayer(ctx, W, H, t, o, ly, li, wind, gNow, fr, s, maxSlope) {
    const L = o.loop, seed = o.seed * 1000 + li * 97;
    const rMax = ly.r[1] * s * 2.2;
    const swMax = (ly.sw[1] + ly.fl) * s * (1 + (ly.swirl || 0));
    const stretchMax = ly.v[1] * s * Math.sqrt(1 + maxSlope * maxSlope) * (o.expo || 0);
    const mt = rMax + swMax + stretchMax + 8 * s, mb = mt;
    const minSpan = H + mt + mb;
    const mx = rMax + swMax + stretchMax + 20 * s;
    const spanW = W + mx * 2;
    const vMid = (ly.v[0] + ly.v[1]) / 2 * s;
    const kMid = Math.max(1, Math.floor(vMid * L / minSpan));
    const spanEst = Math.max(minSpan, vMid * L / kMid);
    const count = Math.round(ly.n * (W * H) / (1280 * 720) * (spanW / W) * (spanEst / H));
    const spr = ly.sp === 'botan' ? sprites.botan[ly.blur] : sprites.dot[ly.blur];
    const P = TAU / L;
    for (let i = 0; i < count; i++) {
      const R = k => rnd(i, k, seed);
      let v = (ly.v[0] + (ly.v[1] - ly.v[0]) * R(1)) * s;
      const k = Math.max(1, Math.floor(v * L / minSpan));    // 1周で何回落ちるか（整数）
      const span = Math.max(minSpan, v * L / k);
      v = span * k / L;                                       // 速さを周期に合わせる
      const fall = L / k;
      const u = R(2) + t / fall;
      const c = Math.floor(u), cm = mod(c, k), p = u - c;
      const Rc = kk => rnd(i * 31 + cm, kk, seed + 5);
      const ts = t - p * fall;
      // 揺れ（1周で整数回）：左右のゆらゆら＋小刻み。swirl は縦にも動いて円を描く
      const m1 = ly.swm[0] + Math.floor(Rc(10) * (ly.swm[1] - ly.swm[0] + 1));
      const ph1 = Rc(11) * TAU, A1 = (ly.sw[0] + (ly.sw[1] - ly.sw[0]) * Rc(12)) * s;
      const m2 = 5 + Math.floor(Rc(13) * 4), ph2 = Rc(14) * TAU, A2 = ly.fl * s * (0.5 + 0.5 * Rc(15));
      const dir = Rc(16) < 0.5 ? -1 : 1;
      const a1 = P * m1 * t + ph1, a2 = P * m2 * t + ph2;
      const swx = A1 * Math.sin(a1) + A2 * Math.sin(a2);
      const swy = (ly.swirl ? A1 * ly.swirl * Math.cos(a1) * dir : 0) + A2 * 0.5 * Math.cos(a2 * 1);
      const y = -mt + p * span + swy;
      const xs = Rc(3) * spanW;
      const x = mod(xs + v * (wind.slopeInt(t) - wind.slopeInt(ts)) + swx, spanW) - mx;
      // 突風で密度が上下
      let vis = 1;
      if (o.gust && o.gustDensity) {
        const dens = 1 - o.gustDensity * (1 - gNow) + 0.15 * frontE(fr, x, y, H);
        vis = clamp((dens - R(6)) / 0.12);
      }
      if (vis <= 0.01) continue;
      const r = (ly.r[0] + (ly.r[1] - ly.r[0]) * R(7)) * s;
      if (x < -r * 3 - 60 * s || x > W + r * 3 + 60 * s || y < -r * 3 - 60 * s || y > H + r * 3 + 60 * s) continue;
      let al = ly.a * (ly.sp === 'botan' ? 0.85 + 0.15 * R(8) : 0.65 + 0.35 * R(8)) * vis;
      const sc = r / R0;
      let ang = 0, sxk = sc, syk = sc;
      if (o.expo) {
        // 速さぶん流れて伸びる（露光のぶれ）
        const vx = v * wind.slope(t) + A1 * P * m1 * Math.cos(a1), vy = v;
        const sp = Math.hypot(vx, vy);
        ang = Math.atan2(vy, vx);
        const st = 1 + sp * o.expo / (2 * r);
        sxk = sc * st; al /= Math.pow(st, 0.3);
      } else if (ly.sp === 'botan') {
        // ぼたん雪：回りながら、ひらひら裏返る（縦横の比が変わる）
        const turns = ly.spin ? (Rc(17) < 0.5 ? -1 : 1) : 0;
        ang = Rc(18) * TAU + turns * P * t + 0.5 * Math.sin(a1 + 1.3);
        const flip = 0.84 + 0.16 * Math.cos(P * (m1 + 1) * t + Rc(19) * TAU);
        syk = sc * flip;
      }
      const ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.setTransform(ca * sxk, sa * sxk, -sa * syk, ca * syk, x, y);
      ctx.globalAlpha = clamp(al);
      if (ly.sp === 'botan') {
        const bs = spr[Math.floor(R(9) * spr.length)];
        const off = r * (ly.blur >= 2 ? 0.3 : 0.2);
        ctx.setTransform(ca * sxk, sa * sxk, -sa * syk, ca * syk, x + off * 0.2, y + off);
        ctx.drawImage(bs.shadow, -SP / 2, -SP / 2);
        ctx.setTransform(ca * sxk, sa * sxk, -sa * syk, ca * syk, x, y);
        ctx.drawImage(bs.body, -SP / 2, -SP / 2);
      } else ctx.drawImage(spr, -SP / 2, -SP / 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 白いかすみ：画面全体にうっすら。突風の前線が通るところが白くなる（模様は入れない）
  function drawVeil(ctx, W, H, t, o, gNow, fr) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const col = (a) => `rgba(232,238,246,${clamp(a).toFixed(4)})`;
    if (fr && o.veilFront) {
      const n = Math.hypot(1, fr.tilt), dx = 1 / n, dy = -fr.tilt / n;
      const cx = W / 2, cy = H / 2, half = W * 0.75;
      const x0 = cx - dx * half, y0 = cy - dy * half, x1 = cx + dx * half, y1 = cy + dy * half;
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      for (let i = 0; i <= 24; i++) {
        const q = i / 24, px = x0 + (x1 - x0) * q, py = y0 + (y1 - y0) * q;
        const e = frontE(fr, px, py, H);
        g.addColorStop(q, col(o.veilBase + o.veil * (0.35 * gNow + 0.65 * e)));
      }
      ctx.fillStyle = g;
    } else {
      // 一様なかすみ（APNG を軽く保つため、濃さは細かい段にそろえる）
      const av = o.veilBase + o.veil * gNow;
      ctx.fillStyle = col(Math.round(av * 80) / 80);
    }
    ctx.fillRect(0, 0, W, H);
  }

  // 雪煙：細かい雪粉の粒の群れ。前線のまわりで濃くなり、雪片より速く横へ走る
  function drawDust(ctx, W, H, t, o, fr, s) {
    const d = o.dust, L = o.loop, seed = o.seed * 1000 + 555;
    const mt = 30 * s, minSpan = H + mt * 2;
    const len = 60 * s, mx = len + 20 * s, spanW = W + mx * 2;
    const vMid = (d.v[0] + d.v[1]) / 2 * s;
    const kMid = Math.max(1, Math.floor(vMid * L / minSpan));
    const spanEst = Math.max(minSpan, vMid * L / kMid);
    const count = Math.round(d.n * (W * H) / (1280 * 720) * (spanW / W) * (spanEst / H));
    const img = sprites.dust;
    const P = TAU / L;
    for (let i = 0; i < count; i++) {
      const R = k => rnd(i, k, seed);
      let v = (d.v[0] + (d.v[1] - d.v[0]) * R(1)) * s;
      const k = Math.max(1, Math.floor(v * L / minSpan));
      const span = Math.max(minSpan, v * L / k);
      v = span * k / L;
      const fall = L / k, u = R(2) + t / fall, c = Math.floor(u), cm = mod(c, k), p = u - c;
      const Rc = kk => rnd(i * 31 + cm, kk, seed + 5);
      // 雪粉は上下にも細かく舞う（1周で整数回）
      const mm = 3 + Math.floor(Rc(4) * 4);
      const y = -mt + p * span + 14 * s * Math.sin(P * mm * t + Rc(5) * TAU);
      const vx = v * d.slope * (0.85 + 0.3 * R(3));
      // 横は一定の速さ：1周で整数回まわるように合わせる
      const nx = Math.max(1, Math.round(vx * L / spanW));
      const x = mod(Rc(6) * spanW + spanW * nx * t / L, spanW) - mx;
      const e = frontE(fr, x, y, H);
      const vis = clamp((d.base + (1 - d.base) * e - R(7)) / 0.15);
      if (vis <= 0.01) continue;
      const r = (d.r[0] + (d.r[1] - d.r[0]) * R(8)) * s;
      const sp = spanW * nx / L;
      const st = Math.max(2 * r, sp * o.expo * d.expo);
      const sl = Math.atan2(v, sp);
      const ca = Math.cos(sl), sa = Math.sin(sl);
      ctx.setTransform(ca * st / 8, sa * st / 8, -sa * 2 * r / 8, ca * 2 * r / 8, x, y);
      ctx.globalAlpha = clamp(d.a * vis * (0.6 + 0.4 * R(9)) * Math.min(1, 2.4 * r / st + 0.35));
      ctx.drawImage(img, -4, -4);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  root.SNOW_PRESETS = SNOW_PRESETS;
  root.drawSnow = drawSnow;
  root.FX = { draw: drawSnow };
})(typeof window !== 'undefined' ? window : globalThis);
