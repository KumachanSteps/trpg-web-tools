// テーマ「水」の描画モジュール。window.FX.draw(ctx, W, H, t, opt) で、opt.mode により3種類を描き分ける。
//   mode:'splash' … 画面下から水しぶきが「ばしゃーん」と立ち上がって落ちる（一回もの、約2.6秒）
//   mode:'rise'   … 水面がゆれながら下から上がってきて、画面の半分ほどで止まる（一回もの、約4.5秒）
//   mode:'under'  … 画面全体に重ねる「水の中」の層（ループ）。opt.color = 'blue' | 'black' | 'red'
// 乱数は hash ベース（同じ時刻は必ず同じ絵）。ループものは t と t+loop が同じ絵になる。
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
  const frac = x => x - Math.floor(x);
  const smooth = x => x * x * (3 - 2 * x);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;

  // 上下左右につながる値ノイズ（N×N、0〜1）。濁り・血の雲に使う
  const NT = 128;
  let ntex = null;
  function makeNoise() {
    ntex = new Float32Array(NT * NT);
    const wrap = (u, v, per, seed) => {
      const iu = Math.floor(u), iv = Math.floor(v), fu = smooth(u - iu), fv = smooth(v - iv);
      const g = (a, b) => rnd(((a % per) + per) % per, ((b % per) + per) % per, seed);
      const a = g(iu, iv), b = g(iu + 1, iv), c = g(iu, iv + 1), d = g(iu + 1, iv + 1);
      return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
    };
    for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) {
      let n = 0, amp = 1, per = 4;
      for (let o = 0; o < 4; o++) { n += amp * wrap(x / NT * per, y / NT * per, per, 811 + o); amp *= 0.5; per *= 2; }
      ntex[y * NT + x] = n / 1.875;
    }
  }
  function noise(u, v) { // u,v はタイル単位（1でひと回り）
    const x = frac(u) * NT, y = frac(v) * NT;
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const x1 = (ix + 1) % NT, y1 = (iy + 1) % NT;
    const a = ntex[iy * NT + ix], b = ntex[iy * NT + x1], c = ntex[y1 * NT + ix], d = ntex[y1 * NT + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  // ゆらめく網目状の光（コースティクス）。px,py は模様の座標（TAU でひと回り）、ph は 0〜TAU の時刻の位相。
  // 時刻は sin/cos の中にしか出てこず、係数 K は整数なので ph が TAU 進むと同じ模様にもどる
  const CK = [-1, -1, 1, 0, 1];
  function caustic(px, py, ph) {
    const p0 = px - 250, p1 = py - 250;
    let i0 = p0, i1 = p1, c = 1;
    const inten = 0.005;
    for (let n = 0; n < 5; n++) {
      const t = ph * CK[n] + n * 1.37;
      const a0 = p0 + Math.cos(t - i0) + Math.sin(t + i1);
      const a1 = p1 + Math.sin(t - i1) + Math.cos(t + i0);
      i0 = a0; i1 = a1;
      const d0 = p0 / (Math.sin(i0 + t) / inten), d1 = p1 / (Math.cos(i1 + t) / inten);
      c += 1 / Math.sqrt(d0 * d0 + d1 * d1);
    }
    c /= 5;
    c = 1.17 - Math.pow(c, 1.4);
    return Math.pow(Math.abs(c), 8);
  }

  // 泡：うすい中身、細い縁、左上の白いハイライト。edge は明るい背景でも形が分かる濃いめの縁
  function bubble(ctx, x, y, r, a, rim, edge) {
    if (a <= 0.01 || r < 0.4) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = rgba(rim, 0.1 * a); ctx.fill();
    ctx.lineWidth = Math.max(0.8, r * 0.16);
    ctx.strokeStyle = rgba(edge, 0.5 * a); ctx.stroke();
    ctx.lineWidth = Math.max(0.7, r * 0.1);
    ctx.strokeStyle = rgba(rim, 0.75 * a);
    ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, TAU); ctx.stroke();
    if (r > 2.2) {
      ctx.lineWidth = Math.max(0.8, r * 0.2);
      ctx.strokeStyle = `rgba(255,255,255,${(0.85 * a).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, r * 0.62, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.38, Math.max(0.6, r * 0.16), 0, TAU); ctx.fill();
  }

  // ───────────────────────── 水の中（ループ） ─────────────────────────
  const PALS = {
    // tintTop/Bot：色の膜（上→下）。murk：濁り・雲の色と量。light：差す光。
    blue: { top: [30, 125, 205, 0.21], bot: [6, 42, 100, 0.42], murk: [4, 30, 75], murkA: 0.12, cloud: 0.35,
      light: [205, 245, 255], rayA: 0.42, causA: 0.3, mote: [210, 240, 255], moteA: 0.75, rim: [225, 248, 255], edge: [40, 110, 170], vig: 0.2 },
    black: { top: [10, 24, 34, 0.34], bot: [0, 4, 10, 0.56], murk: [0, 3, 8], murkA: 0.14, cloud: 0.5,
      light: [150, 180, 200], rayA: 0.22, causA: 0.12, mote: [150, 170, 185], moteA: 0.5, rim: [175, 195, 210], edge: [20, 30, 40], vig: 0.18 },
    red: { top: [160, 30, 32, 0.22], bot: [70, 0, 8, 0.48], murk: [95, 0, 10], murkA: 0.3, cloud: 1,
      light: [255, 175, 160], rayA: 0.32, causA: 0.2, mote: [235, 130, 120], moteA: 0.65, rim: [255, 205, 195], edge: [110, 10, 18], vig: 0.22 }
  };

  let ubuf = null, uimg = null;
  function drawUnder(ctx, W, H, t, o) {
    const P = PALS[o.color] || PALS.blue;
    const L = o.loop || 6, ph = TAU * t / L, u = H / 720;
    const rs = o.res || 0.3;
    const bw = Math.max(8, Math.round(W * rs)), bh = Math.max(8, Math.round(H * rs));
    if (!ubuf || ubuf.width !== bw || ubuf.height !== bh) {
      ubuf = document.createElement('canvas'); ubuf.width = bw; ubuf.height = bh;
      uimg = ubuf.getContext('2d').createImageData(bw, bh);
    }
    const d = uimg.data;
    // 光の筋：画面の上の外（左上寄り）の一点から扇形に差しこむ。筋ごとに向きと明るさがゆっくりゆらぐ
    const sx = W * 0.42, sy = -H * 0.9;
    const rays = [];
    for (let k = 0; k < 9; k++) {
      const R = j => rnd(k, j, 41);
      rays.push({
        a: -0.55 + 1.1 * (k + 0.2 + 0.6 * R(1)) / 9 + 0.018 * Math.sin(ph * (1 + (k % 2)) + TAU * R(2)),
        w: 0.012 + 0.022 * R(3),
        i: (0.5 + 0.5 * R(4)) * (0.55 + 0.45 * Math.sin(ph * (1 + (k % 2)) + TAU * R(5))),
        len: 0.6 + 0.5 * R(6)
      });
    }
    const cs = TAU / (W * 0.4); // コースティクスの網目の大きさ
    for (let py = 0; py < bh; py++) {
      const y = (py + 0.5) / rs, yn = y / H;
      // 色の膜（上→下）
      const tA = P.top[3] + (P.bot[3] - P.top[3]) * yn;
      const tr = P.top[0] + (P.bot[0] - P.top[0]) * yn, tg = P.top[1] + (P.bot[1] - P.top[1]) * yn, tb = P.top[2] + (P.bot[2] - P.top[2]) * yn;
      for (let px = 0; px < bw; px++) {
        const x = (px + 0.5) / rs, xn = x / W;
        // 周辺を少し暗く
        const vx = xn - 0.5, vy = yn - 0.45;
        const vig = P.vig * clamp((vx * vx * 1.2 + vy * vy * 1.6) * 2.2 - 0.12);
        // 濁り・雲：二枚のノイズを円を描くようにずらす（ph で一周）
        const n1 = noise(xn * 1.3 + 0.12 * Math.cos(ph), yn * 0.75 + 0.12 * Math.sin(ph));
        const n2 = noise(xn * 2.1 - 0.09 * Math.sin(ph + 1), yn * 1.2 + 0.09 * Math.cos(ph + 1) + 0.5);
        const nn = 0.6 * n1 + 0.4 * n2;
        const cloud = clamp((nn - 0.42) * 3.2) * P.cloud;
        let a = clamp(tA + vig + P.murkA * cloud);
        // 色：膜の色と雲の色をまぜる
        const mk = clamp(cloud * 0.9 + vig * 1.5);
        let r = tr + (P.murk[0] - tr) * mk, g = tg + (P.murk[1] - tg) * mk, b = tb + (P.murk[2] - tb) * mk;
        // 光（筋＋網目）を足す
        let ray = 0;
        const ang = Math.atan2(x - sx, y - sy);
        for (let k = 0; k < rays.length; k++) {
          const R = rays[k];
          const dd = (ang - R.a) / R.w;
          if (dd > -3 && dd < 3) ray += R.i * Math.exp(-dd * dd) * Math.pow(clamp(1 - yn / R.len), 1.4);
        }
        // 筋の中の細かいむら（筋に沿って流れる）
        ray *= 0.75 + 0.5 * noise(ang * 3.2 + 0.1 * Math.cos(ph), 0.1 * Math.sin(ph) + 0.3);
        ray = o.noRay ? 0 : clamp(ray);
        // 網目の光は水面に近い上のほうと光の筋の中で強く、深いところでは消える
        const cDep = Math.pow(clamp(1 - yn / 0.62), 1.5) + 0.6 * ray * clamp(1 - yn);
        const cA = cDep > 0.01 && !o.noCaus ? clamp(caustic(x * cs, y * cs * 1.15, ph) * 1.6) * P.causA * cDep * (1 - 0.6 * cloud) : 0;
        const lA = clamp(ray * P.rayA * (1 - 0.4 * cloud) + cA);
        // 前に描いた膜の上に光を「重ねる」（プリマルチで合成）
        const oa = lA + a * (1 - lA);
        if (oa <= 0.001) { const i = (py * bw + px) * 4; d[i + 3] = 0; continue; }
        const R0 = (P.light[0] * lA + r * a * (1 - lA)) / oa, G0 = (P.light[1] * lA + g * a * (1 - lA)) / oa, B0 = (P.light[2] * lA + b * a * (1 - lA)) / oa;
        const i = (py * bw + px) * 4;
        d[i] = R0; d[i + 1] = G0; d[i + 2] = B0; d[i + 3] = oa * 255;
      }
    }
    ubuf.getContext('2d').putImageData(uimg, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(ubuf, 0, 0, W, H);
    ctx.restore();

    // 浮遊する細かい粒：短い一生でゆっくり漂い、ふっと現れて消える（一生 = L/m）
    const NM = Math.round((o.motes || 150) * W / 1280);
    for (let j = 0; j < NM; j++) {
      const R = k => rnd(j, k, 77);
      const m = 1 + Math.floor(R(1) * 3), life = L / m;
      const q = t / life + R(2), cyc = ((Math.floor(q) % m) + m) % m, f = frac(q);
      const S = k => rnd(j * 7 + cyc, k, 78);
      const x0 = S(1) * W, y0 = S(2) * H;
      const x = x0 + W * 0.025 * (f - 0.5) * (S(3) - 0.5) * 2 + 6 * u * Math.sin(TAU * f + S(4) * 6);
      const y = y0 + H * 0.03 * (f - 0.5) * (S(5) - 0.3);
      const big = S(6) < 0.12;
      const s = u * (big ? 1.6 + 1.2 * S(7) : 0.6 + 0.8 * S(7));
      const a = P.moteA * Math.sin(Math.PI * f) * (0.4 + 0.6 * S(8)) * (big ? 0.8 : 1);
      ctx.fillStyle = rgba(P.mote, a);
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    // ときどき上る泡：一周に数回、ひとかたまりの泡が下から上へ（L を割り切る周期）
    const groups = o.bubbles ?? 4;
    for (let gi = 0; gi < groups; gi++) {
      const G = k => rnd(gi, k, 91);
      const per = L, off = G(1);
      const gx = W * (0.08 + 0.84 * ((gi + 0.5 * G(2)) / groups));
      const nb = 6 + Math.floor(G(3) * 8);
      for (let j = 0; j < nb; j++) {
        const R = k => rnd(gi * 50 + j, k, 92);
        const r = u * (R(1) < 0.25 ? 7 + 8 * R(2) : 2.5 + 4 * R(2));
        const sp = H * (0.28 + 0.06 * r / u / 6) * (0.9 + 0.2 * R(3)); // px/秒
        const tl = frac(t / per + off) * per - R(4) * 1.2;  // 出てからの時間
        if (tl < 0) continue;
        const y = H + 20 * u - sp * tl;
        if (y < -20 * u) continue;
        const x = gx + W * 0.02 * (R(5) - 0.5) + r * 1.5 * Math.sin(TAU * (tl * (1.2 + R(6)) + R(7))) + tl * W * 0.006 * (R(8) - 0.5);
        const a = clamp((y / H) * 1.6) * 0.9;
        bubble(ctx, x, y, r, a, P.rim, P.edge);
      }
    }
  }

  // 水のかたまりの描き方：丸の集まりを一つの形（マスク）にまとめ、
  //   うすい本体 ＋ 内側のふちほど明るい帯（透けた本体に見える）＋ 上側の白い光 ＋ 外側の細い濃い青の縁（明るい背景用）
  let LM = null, LE = null;
  function waterLayer(ctx, W, H, u, circles, st) {
    if (!LM || LM.width !== W || LM.height !== H) {
      LM = Object.assign(document.createElement('canvas'), { width: W, height: H });
      LE = Object.assign(document.createElement('canvas'), { width: W, height: H });
    }
    const m = LM.getContext('2d'), e = LE.getContext('2d');
    m.clearRect(0, 0, W, H); m.fillStyle = '#fff';
    m.beginPath(); circles.forEach(([x, y, r]) => { m.moveTo(x + r, y); m.arc(x, y, r, 0, TAU); }); m.fill();
    const pass = (alpha, build) => { e.save(); e.clearRect(0, 0, W, H); build(e); e.restore(); ctx.globalAlpha = clamp(alpha); ctx.drawImage(LE, 0, 0); ctx.globalAlpha = 1; };
    // 外側の縁
    pass(st.edgeA, e => {
      e.fillStyle = rgba(st.edge, 1);
      e.beginPath(); circles.forEach(([x, y, r]) => { const rr = r + st.edgeW * u; e.moveTo(x + rr, y); e.arc(x, y, rr, 0, TAU); }); e.fill();
      e.globalCompositeOperation = 'destination-out'; e.drawImage(LM, 0, 0);
    });
    // 本体（下ほど白く泡立つ）
    pass(st.fillA, e => {
      e.drawImage(LM, 0, 0); e.globalCompositeOperation = 'source-in'; e.fillStyle = rgba(st.fill, 1); e.fillRect(0, 0, W, H);
      if (st.foamy) {
        e.globalCompositeOperation = 'source-atop';
        const gr = e.createLinearGradient(0, H * st.foamy, 0, H);
        gr.addColorStop(0, 'rgba(246,252,255,0)'); gr.addColorStop(1, 'rgba(248,253,255,0.9)');
        e.fillStyle = gr; e.fillRect(0, 0, W, H);
      }
    });
    // 内側のふちの明るい帯：マスクを8方向にずらして重ねた共通部分（＝少し縮めた形）を抜く。細い帯と太い帯の二段
    const band = (d, alpha) => pass(alpha, e => {
      e.drawImage(LM, 0, 0); e.globalCompositeOperation = 'source-in'; e.fillStyle = rgba(st.rim, 1); e.fillRect(0, 0, W, H);
      if (!band.K) band.K = Object.assign(document.createElement('canvas'), { width: W, height: H });
      if (band.K.width !== W || band.K.height !== H) { band.K.width = W; band.K.height = H; }
      const k = band.K.getContext('2d');
      k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, W, H); k.drawImage(LM, 0, 0);
      k.globalCompositeOperation = 'destination-in';
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8; k.drawImage(LM, Math.cos(an) * d, Math.sin(an) * d); }
      e.globalCompositeOperation = 'destination-out'; e.drawImage(band.K, 0, 0);
    });
    band(st.rimW * u, st.rimA * 0.5);
    band(st.rimW * u * 0.35, st.rimA * 0.7);
    // 上側の白い光
    pass(st.hiA, e => {
      e.drawImage(LM, 0, 0); e.globalCompositeOperation = 'source-in'; e.fillStyle = '#fff'; e.fillRect(0, 0, W, H);
      e.globalCompositeOperation = 'destination-out'; e.drawImage(LM, 2 * u, 5 * u);
    });
  }

  // ───────────────────────── 水しぶき（一回もの） ─────────────────────────
  // 画面の下（外）から、扇形に並んだ「噴き上がり」が放物線を描いて上がって落ちる。
  // 噴き上がりは一本ごとに、少しずつ遅れて出る水の粒（遅れるほど遅い）の列。その列どうしを面でつないだものが水の幕、
  // 同じ式で飛ぶ水滴は幕がちぎれたあとも飛び続ける。
  const SPL = { white: [255, 255, 255], body: [214, 242, 255], deep: [60, 135, 200], edge: [36, 104, 170] };
  function drawSplash(ctx, W, H, t, o) {
    const u = H / 720, seed = o.seed || 3;
    const y0 = H + 40 * u, cx = W * (o.cx || 0.5);
    const tp = 0.74, hTop = y0 - H * (o.top || 0.1);
    const V = 2 * hTop / tp, G = V / tp, Te = 0.3;
    const spread = W * 0.2;
    const mOf = e => 1 - 0.78 * Math.pow(e / Te, 0.75);
    // 一つの水の粒の位置：a=扇の位置(-1〜1)、e=出る時刻、jit=速さ・向きのゆらぎ
    const jet = (a, th, sp) => ({ bx: cx + a * spread, vx: Math.sin(th) * sp, vy: -Math.cos(th) * sp });
    const pos = (J, e, m, tt) => {
      const tau = Math.max(0, tt - e);
      return [J.bx + J.vx * m * tau * (1 - 0.18 * tau), y0 + J.vy * m * tau + 0.5 * G * tau * tau];
    };
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 霞（細かいしぶき）：頂点近くでふわっと広がって薄れる
    const mistA = sstep(0.25, 0.6, t) * (1 - sstep(0.8, 1.4, t));
    if (mistA > 0.01) {
      for (let i = 0; i < 26; i++) {
        const R = k => rnd(i, k, seed + 40);
        const a = R(1) * 2 - 1;
        const J = jet(a, a * 0.62, V * (1 - 0.38 * a * a));
        const [x, y] = pos(J, 0.02, 0.95, Math.min(t, tp + 0.15 + 0.3 * R(2)));
        const rr = H * (0.04 + 0.05 * R(3)) * (0.6 + 0.6 * sstep(0.3, 1.6, t));
        const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
        const al = 0.1 * mistA * (0.5 + 0.5 * R(4));
        if (al < 0.015) continue;
        gr.addColorStop(0, rgba(SPL.body, al)); gr.addColorStop(1, rgba(SPL.body, 0));
        ctx.fillStyle = gr; ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
    }

    // 水の幕：噴き上がりの列に沿って丸をたくさん並べ、いったん不透明な層に描いてから半透明で重ねる（重なっても濃くならない）。
    // 外側だけに濃い青の縁、上側に白い光の縁。時間とともに丸が痩せてちぎれ、水の塊・水滴に分かれていく
    const sA = sstep(0, 0.05, t) * (1 - sstep(1.35, 1.8, t));
    const fA = sstep(0, 0.1, t) * (1 - sstep(1.2, 2.3, t));
    const K = 40, M = 40;
    const jets = [];
    for (let k = 0; k < K; k++) {
      const R = j => rnd(k, j, seed);
      const a = -1 + 2 * k / (K - 1) + 0.04 * (R(1) - 0.5);
      // 高さは大きな山がいくつか（なめらかなゆらぎ）＋ときどき高く伸びる指
      const lobe = 0.9 + 0.1 * Math.sin(a * 4.1 + seed) + 0.05 * Math.sin(a * 9.3 + 2 * seed);
      const fing = R(3) < 0.18 ? 1.04 + 0.06 * R(4) : 0.92 + 0.08 * R(4);
      jets.push({ J: jet(a, a * 0.62 + 0.05 * (R(2) - 0.5), V * (1 - 0.38 * a * a) * lobe * fing), a, w: 0.75 + 0.5 * R(5) });
    }
    const blobs = [];
    const tear = sstep(0.5, 2.0, t);
    if (sA > 0.01) {
      jets.forEach(({ J, w }, k) => {
        for (let j = 0; j <= M; j++) {
          const R = q => rnd(k * 64 + j, q, seed + 5);
          const e = Te * (j / M) * (j / M);   // 先のほうは粒どうしが離れやすいので細かく取る
          if (e > t) break;
          const [x, y] = pos(J, e, mOf(e), t);
          // 先のほう（j が小さい）ほど細く、先からちぎれていく
          // 一つずつ、自分の番が来たら痩せて消える（先のほうほど早い）
          const th = (0.15 + 0.85 * R(1)) * (0.8 + 0.2 * j / M);
          const sc = clamp((th - tear) / 0.15 + 0.4);
          if (sc < 0.5) continue;
          const r = u * (13 + 38 * Math.pow(j / M, 0.8)) * w * sc * (0.9 + 0.2 * R(2)) * (1 - 0.35 * tear) * sstep(0, 0.08, t - e + 0.02);
          blobs.push([x + r * 0.15 * (R(3) - 0.5), y + r * 0.15 * (R(4) - 0.5), r]);
        }
      });
    }
    // 根もとの泡だまり（同じ層に描いて幕とつなげる）
    const foam = [];
    if (fA > 0.01) {
      for (let i = 0; i < 64; i++) {
        const R = k => rnd(i, k, seed + 50);
        const a = R(1) * 2 - 1;
        const x = cx + a * spread * 1.4 + (R(2) - 0.5) * 30 * u + a * W * 0.04 * sstep(0, 1.6, t);
        const peak = H * (0.04 + 0.1 * (1 - a * a)) * (0.4 + 0.6 * R(3));
        const lift = sstep(0, 0.3, t) - 1.1 * sstep(0.45, 2.2, t);
        const y = H + 14 * u - peak * lift + 5 * u * Math.sin(TAU * (t * (0.8 + R(4)) + R(5)));
        const r = u * (12 + 26 * R(6)) * (1 - 0.6 * sstep(0.7, 2.3, t));
        foam.push([x, y, r, R(7)]);
      }
    }
    if (blobs.length) waterLayer(ctx, W, H, u, blobs, { fill: [140, 210, 250], fillA: 0.32 * sA, rim: [215, 243, 255], rimA: 0.9 * sA, rimW: 10, hiA: 0.95 * sA, edge: SPL.edge, edgeA: 0.55 * sA, edgeW: 1.6, foamy: 0.6 });
    if (foam.length) waterLayer(ctx, W, H, u, foam, { fill: [240, 250, 255], fillA: 0.5 * fA, rim: [255, 255, 255], rimA: 0.8 * fA, rimW: 7, hiA: 0.9 * fA, edge: SPL.edge, edgeA: 0.5 * fA, edgeW: 1.4 });
    // 幕の中の筋（流れの向きにのびる白い筋）
    if (sA > 0.01) {
      jets.forEach(({ J }, k) => {
        const R = q => rnd(k, q, seed + 9);
        if (R(1) < 0.6) return;
        const j0 = Math.ceil(M * clamp(0.1 + 0.5 * R(2) + tear));
        const j1 = Math.min(M, j0 + 6 + Math.floor(R(5) * 14));
        if (j0 >= M - 2) return;
        ctx.beginPath();
        let n = 0;
        for (let j = j0; j <= j1; j++) { const e = Te * (j / M) * (j / M); if (e > t) break; const [x, y] = pos(J, e, mOf(e), t); if (n++) ctx.lineTo(x + 6 * u * (R(3) - 0.5) * j / M, y); else ctx.moveTo(x, y); }
        ctx.strokeStyle = rgba(SPL.white, 0.35 * sA * (1 - tear)); ctx.lineWidth = u * (1.5 + 2.5 * R(4)); ctx.stroke();
      });
    }

    // 水滴
    const ND = Math.round((o.drops || 520));
    for (let i = 0; i < ND; i++) {
      const R = k => rnd(i, k, seed + 20);
      const a = (R(1) * 2 - 1) * 1.12;
      const e = Te * Math.pow(R(2), 1.6);
      const J = jet(a + 0.04 * (R(3) - 0.5), a * 0.62 + 0.2 * (R(4) - 0.5), V * (1 - 0.38 * Math.min(1, a * a)) * (0.8 + 0.34 * R(5)));
      const m = mOf(e);
      const rim = e < Te * 0.12;
      const tA = rim ? e + 0.05 + 0.25 * R(6) : 0.32 + 0.55 * R(6);  // ふちの粒は早くから、ほかは幕がちぎれてから
      const al = sstep(tA, tA + 0.12, t);
      if (al <= 0.01) continue;
      const [x, y] = pos(J, e, m, t);
      const cls = R(7);
      const r = u * (cls < 0.08 ? 5 + 4 * R(8) : cls < 0.38 ? 2.4 + 2.2 * R(8) : 1 + 1.3 * R(8));
      if (y > H + 3 * r + 10 * u) continue;
      const [px, py] = pos(J, e, m, t - 0.03);
      const dx = x - px, dy = y - py;
      // 速いときは筋、遅いとき（頂点）は丸。大きい粒は少しつぶれた形
      ctx.lineWidth = 2 * r + 1.8 * u;
      ctx.strokeStyle = rgba(SPL.edge, 0.5 * al);
      ctx.beginPath(); ctx.moveTo(px + dx * 0.3, py + dy * 0.3); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineWidth = 2 * r;
      ctx.strokeStyle = rgba(SPL.body, 0.75 * al);
      ctx.stroke();
      if (r > 1.6 * u) {
        ctx.fillStyle = rgba(SPL.white, 0.95 * al);
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.42, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = rgba(SPL.white, 0.8 * al);
        ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, TAU); ctx.fill();
      }
    }

    // 泡：幕といっしょに上がる小さな輪と、根もとの白い泡だまり
    for (let i = 0; i < 40; i++) {
      const R = k => rnd(i, k, seed + 30);
      const a = R(1) * 2 - 1;
      const J = jet(a, a * 0.62, V * (1 - 0.38 * a * a) * (0.85 + 0.2 * R(2)));
      const e = Te * (0.3 + 0.7 * R(3));
      const [x, y] = pos(J, e, mOf(e), t);
      const al = sstep(0.02, 0.1, t) * (1 - sstep(0.5 + 0.4 * R(4), 1.1 + 0.3 * R(4), t));
      if (y > H + 20 * u) continue;
      bubble(ctx, x, y, u * (2.5 + 5 * R(5)), al, [225, 245, 255], SPL.edge);
    }
    // 泡だまりの上の小さな泡
    foam.forEach(([x, y, r, q], i) => { if (q < 0.45) bubble(ctx, x + r * (rnd(i, 1, seed + 51) - 0.5), y - r * 0.6, u * (3 + 6 * rnd(i, 2, seed + 51)), fA, [235, 250, 255], SPL.edge); });
    ctx.restore();
  }

  // ───────────────────────── 水位上昇（一回もの） ─────────────────────────
  // 画面の下から水面がゆれながら上がってきて、画面の半分ほど（opt.level、既定 0.5）で止まる。
  // 横から見た水：水面は手前の線（白いハイライト）と奥の線のあいだの明るい帯、水中は下ほど濃い青で半透明。
  let rbuf = null, rimg = null;
  function drawRise(ctx, W, H, t, o) {
    const u = H / 720, seed = o.seed || 7;
    const T1 = o.riseDur || 3.6;
    const yEnd = H * (1 - (o.level || 0.5)), y0 = H + 50 * u;
    const q = clamp(t / T1);
    const prog = 1 - Math.pow(1 - q, 1.6);
    const speed = q < 1 ? 1.6 * Math.pow(1 - q, 0.6) : 0;            // 上がる速さ（0〜2くらい）
    let level = y0 + (yEnd - y0) * prog;
    if (t > T1) level += H * 0.008 * Math.sin(TAU * (t - T1) / 1.3) * Math.exp(-(t - T1) * 1.2);
    const A = H * (0.013 + 0.014 * clamp(speed));
    const k1 = TAU / (W * 0.42), k2 = TAU / (W * 0.23), k3 = TAU / (W * 0.11);
    const wave = (x, sh) => A * (0.55 * Math.sin(k1 * x - 1.7 * t + 0.7 + sh) + 0.3 * Math.sin(k2 * x + 2.3 * t + 2.1 + sh * 1.3) + 0.15 * Math.sin(k3 * x - 3.1 * t + 4.0 + sh * 0.7));
    const front = x => level + wave(x, 0);
    const bandH = x => H * (0.018 + 0.006 * Math.sin(k2 * x * 0.7 + 1.1 * t + 0.4)) * (1 + 0.4 * clamp(speed));
    const back = x => level - bandH(x) + 0.6 * wave(x + W * 0.03, 0.9);
    if (level - H * 0.05 > H) return;
    const N = 96, xs = [];
    for (let i = 0; i <= N; i++) xs.push(-10 * u + (W + 20 * u) * i / N);
    ctx.save();
    // 水中
    const body = new Path2D();
    body.moveTo(xs[0], H + 5); xs.forEach(x => body.lineTo(x, front(x))); body.lineTo(xs[N], H + 5); body.closePath();
    const gr = ctx.createLinearGradient(0, level - A, 0, Math.max(H, level + H * 0.2));
    gr.addColorStop(0, 'rgba(78,178,228,0.36)');
    gr.addColorStop(0.18, 'rgba(36,120,196,0.46)');
    gr.addColorStop(1, 'rgba(10,46,112,0.66)');
    ctx.fillStyle = gr; ctx.fill(body);
    // 水面の下のゆらめく光（粗く描いて拡大）：水面のすぐ下ほど強い
    const rs = 0.25, bw = Math.round(W * rs), bh = Math.round(H * rs);
    if (!rbuf || rbuf.width !== bw || rbuf.height !== bh) { rbuf = Object.assign(document.createElement('canvas'), { width: bw, height: bh }); rimg = rbuf.getContext('2d').createImageData(bw, bh); }
    const d = rimg.data; d.fill(0);
    const cs = TAU / (W * 0.4), ph = TAU * t / 6;
    const pyTop = Math.max(0, Math.floor((level - 2 * A) * rs));
    for (let py = pyTop; py < bh; py++) {
      const y = (py + 0.5) / rs;
      for (let px = 0; px < bw; px++) {
        const x = (px + 0.5) / rs;
        const dep = (y - front(x)) / H;
        if (dep < 0) continue;
        const f = Math.pow(clamp(1 - dep / 0.32), 1.6);
        if (f <= 0.01) continue;
        const c = clamp(caustic(x * cs, (y - level) * cs * 1.3, ph) * 1.7);
        const i = (py * bw + px) * 4;
        d[i] = 215; d[i + 1] = 245; d[i + 2] = 255; d[i + 3] = 255 * clamp(0.42 * c * f + 0.1 * f);
      }
    }
    rbuf.getContext('2d').putImageData(rimg, 0, 0);
    ctx.save(); ctx.clip(body); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(rbuf, 0, 0, W, H); ctx.restore();
    // 泡：下から上り、水面で消える
    for (let j = 0; j < 46; j++) {
      const R = k => rnd(j, k, seed + 3);
      const t0 = R(1) * 4.2, sp = H * (0.16 + 0.12 * R(2));
      const r = u * (R(3) < 0.2 ? 5 + 5 * R(4) : 1.8 + 3 * R(4));
      const tl = t - t0;
      if (tl < 0) continue;
      const x = W * R(5) + r * 1.6 * Math.sin(TAU * (tl * (1 + R(6)) + R(7)));
      const y = H + 15 * u - sp * tl;
      const fy = front(x);
      if (y < fy + r * 1.5) continue;
      bubble(ctx, x, y, r, 0.85 * clamp((y - fy) / (H * 0.03)), [225, 247, 255], [30, 100, 165]);
    }
    // 水面の帯（奥の線と手前の線のあいだ）
    const band = new Path2D();
    band.moveTo(xs[0], back(xs[0])); xs.forEach(x => band.lineTo(x, back(x)));
    for (let i = N; i >= 0; i--) band.lineTo(xs[i], front(xs[i]));
    band.closePath();
    const bg = ctx.createLinearGradient(0, level - H * 0.03, 0, level + A);
    bg.addColorStop(0, 'rgba(200,238,255,0.5)'); bg.addColorStop(1, 'rgba(130,205,245,0.4)');
    ctx.fillStyle = bg; ctx.fill(band);
    // 帯の中を流れる白いすじ（波に乗って動く）
    ctx.lineCap = 'round';
    for (let j = 0; j < 26; j++) {
      const R = k => rnd(j, k, seed + 5);
      const x = frac(R(1) + t * (R(2) - 0.5) * 0.05) * (W + 100 * u) - 50 * u;
      const len = u * (20 + 60 * R(3));
      const f = 0.25 + 0.55 * R(4);
      ctx.beginPath();
      for (let s = 0; s <= 6; s++) { const xx = x + len * (s / 6 - 0.5); const yy = back(xx) + (front(xx) - back(xx)) * f; if (s) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.strokeStyle = `rgba(255,255,255,${(0.35 + 0.35 * R(5)).toFixed(3)})`; ctx.lineWidth = u * (1 + 1.6 * R(6)); ctx.stroke();
    }
    // 奥の線（細い白）と手前の線（太い白＋その下の青い影）
    const line = (fn, dy = 0) => { ctx.beginPath(); xs.forEach((x, i) => { const y = fn(x) + dy; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); };
    ctx.lineJoin = 'round';
    line(back); ctx.strokeStyle = 'rgba(240,252,255,0.55)'; ctx.lineWidth = 1.4 * u; ctx.stroke();
    line(front, 2.5 * u); ctx.strokeStyle = 'rgba(25,95,160,0.45)'; ctx.lineWidth = 2.5 * u; ctx.stroke();
    line(front); ctx.strokeStyle = 'rgba(180,232,255,0.45)'; ctx.lineWidth = 6 * u; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2.4 * u; ctx.stroke();
    // 上がっているあいだは水面が泡立つ
    const foamA = clamp(speed * 0.8);
    if (foamA > 0.02) {
      for (let j = 0; j < 70; j++) {
        const R = k => rnd(j, k, seed + 9);
        const x = W * R(1) + 15 * u * Math.sin(t * (1 + R(2)) + R(3) * 6);
        const r = u * (2 + 5 * R(4));
        const y = front(x) - r * 0.3 + (bandH(x) * 0.6) * (R(5) - 0.8);
        bubble(ctx, x, y, r, foamA * (0.5 + 0.5 * R(6)), [235, 250, 255], [30, 100, 165]);
      }
    }
    // きらめき：帯の上でときどき光る十字
    for (let j = 0; j < 22; j++) {
      const R = k => rnd(j, k, seed + 11);
      const x = W * R(1), f = Math.max(0, Math.sin(TAU * (t * (0.35 + 0.4 * R(2)) + R(3))));
      const a = Math.pow(f, 6);
      if (a < 0.03) continue;
      const y = back(x) + (front(x) - back(x)) * (0.3 + 0.4 * R(4));
      const s = u * (6 + 10 * R(5)) * (0.5 + 0.5 * a);
      ctx.strokeStyle = `rgba(255,255,255,${(0.95 * a).toFixed(3)})`; ctx.lineWidth = 1.3 * u;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x, y + s * 0.6); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 1.8 * u, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, W, H, t, opt = {}) {
    if (!ntex) makeNoise();
    const o = { mode: 'under', ...opt };
    if (o.mode === 'splash') return drawSplash(ctx, W, H, t, o);
    if (o.mode === 'rise') return drawRise(ctx, W, H, t, o);
    return drawUnder(ctx, W, H, t, o);
  }
  root.FX = { draw };
  root.WaterFX = { draw, caustic, bubble };
})(typeof window !== 'undefined' ? window : globalThis);
