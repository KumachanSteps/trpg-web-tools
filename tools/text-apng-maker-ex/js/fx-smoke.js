/*
 * 文字画像APNGメーカーEX — 環境の演出：立ちのぼる黒煙（試作 fire/src/smoke.js を組み込んだもの）
 * drawSmoke(ctx, W, H, t, opt) で、地面の何か所かから黒煙が立ちのぼり、風で右へなびく層を描く。W・H は出力のピクセル数。
 * 煙は「もくもくした塊（パフ）」をたくさん重ねて作る。時刻 t は loop 秒で一周し、t と t+loop は同じ絵になる（ループAPNG用）。
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
  const frac = x => x - Math.floor(x);
  const smooth = x => x * x * (3 - 2 * x);
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    const a = rnd(ix, iy, seed), b = rnd(ix + 1, iy, seed), c = rnd(ix, iy + 1, seed), d = rnd(ix + 1, iy + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  // 塊の絵：ふちがもこもこした丸。上が空の光で明るく、下が暗い。warm は下側が炎で赤く照らされた版
  const SPR = 160, NV = 8;
  let sprites = null;
  let soft = false;
  function makeSprites() {
    sprites = [];
    for (let v = 0; v < NV; v++) {
      const pair = [false, true].map(warm => {
        const c = document.createElement('canvas'); c.width = c.height = SPR;
        const x = c.getContext('2d'), img = x.createImageData(SPR, SPR), d = img.data;
        for (let py = 0; py < SPR; py++) for (let px = 0; px < SPR; px++) {
          const nx = (px + 0.5) / SPR * 2 - 1, ny = (py + 0.5) / SPR * 2 - 1;
          let n = 0, amp = 1, fq = 2.2;
          for (let o = 0; o < 4; o++) { n += amp * vnoise(nx * fq + v * 7.3, ny * fq + v * 3.1, 70 + v * 5 + o); amp *= 0.5; fq *= 2.1; }
          n /= 1.875;
          const r = Math.sqrt(nx * nx + ny * ny) * (0.78 + 0.5 * n);
          const den = soft ? clamp(Math.pow(clamp(1 - r * r), 1.3) * (0.1 + 1.5 * (n - 0.15)) * 1.2) : clamp((Math.pow(clamp(1 - r * r), 0.8) * (0.55 + 0.75 * n) - 0.12) * 1.6);
          const i4 = (py * SPR + px) * 4;
          if (den <= 0.002) { d[i4 + 3] = 0; continue; }
          // 上側ほど明るい（もこもこの凹凸で少しまだら）
          const lit = clamp(0.48 - ny * 0.65 + (n - 0.5) * 1.1);
          let R = 20 + 92 * lit, G = 19 + 85 * lit, B = 19 + 78 * lit;
          if (warm) { const k = clamp(0.3 + ny * 0.8); R += (255 - R) * k; G += (120 - G) * k * 0.9; B += (40 - B) * k * 0.9; }
          d[i4] = R; d[i4 + 1] = G; d[i4 + 2] = B; d[i4 + 3] = 255 * den;
        }
        x.putImageData(img, 0, 0);
        return c;
      });
      sprites.push(pair);
    }
  }

  // 上下左右につながる模様（煙の中を流れるすじ・すき間）。値は 0〜1
  let tex = null;
  function makeTex() {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
    const wrapNoise = (u, v, per, seed) => {
      const iu = Math.floor(u), iv = Math.floor(v), fu = smooth(u - iu), fv = smooth(v - iv);
      const g = (a, b) => rnd(((a % per) + per) % per, ((b % per) + per) % per, seed);
      const a = g(iu, iv), b = g(iu + 1, iv), cc = g(iu, iv + 1), dd = g(iu + 1, iv + 1);
      return a + (b - a) * fu + (cc - a) * fv + (a - b - cc + dd) * fu * fv;
    };
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      let n = 0, amp = 1, per = 4;
      for (let o = 0; o < 4; o++) { n += amp * wrapNoise(px / N * per, py / N * per, per, 300 + o); amp *= 0.5; per *= 2; }
      n /= 1.875;
      const i4 = (py * N + px) * 4;
      d[i4] = d[i4 + 1] = d[i4 + 2] = 255;
      d[i4 + 3] = 255 * clamp((n - 0.42) * 3);
    }
    x.putImageData(img, 0, 0);
    tex = c;
  }

  function drawSmoke(ctx, W, H, t, opt = {}) {
    const o = { loop: 6, seed: 9, plumes: [0.1, 0.48, 0.84], puffs: 46, lean: 0.75, height: 0.95, opacity: 0.9, ...opt };
    if (!sprites || soft !== !!o.soft) { soft = !!o.soft; makeSprites(); }
    const L = o.loop;
    const list = [];
    o.plumes.forEach((xs, pi) => {
      const seed = o.seed * 100 + pi;
      const big = pi === 1 ? 1.25 : 0.8 + 0.2 * rnd(pi, 2, seed);
      const base = H * (0.045 + 0.02 * rnd(pi, 1, seed)) * big * (o.size || 1);       // 根もとの太さ
      for (let j = 0; j < o.puffs; j++) {
        const R = k => rnd(j, k, seed);
        // 1周に1回か2回、根もとから昇って消える（周期は loop を割り切る）
        const per = R(1) < 0.5 ? L : L / 2;
        const a = frac(t / per + R(2));
        const life = per / L;
        // 昇る高さ：はじめ速く、上では緩む
        const h = H * o.height * (1 - Math.pow(1 - a, 1.6)) * (0.75 + 0.35 * R(3)) * (0.8 + 0.2 * life);
        let sway = H * 0.04 * Math.sin(TAU * (a * (1 + R(4)) + R(5)));
        if (o.soft) {
          // 煙全体を通る大きなうねり（下から上へ伝わる波）：近くの塊が一緒に流れて、ひと続きの煙に見える
          const hh = H * o.height * (1 - Math.pow(1 - a, 1.6));
          const amp = 0.25 + hh / H;
          sway = H * amp * (0.07 * Math.sin(TAU * (hh / (H * 0.55) - t / L) + 0.7 * pi) + 0.035 * Math.sin(TAU * (hh / (H * 0.23) - 2 * t / L) + 1.9 * pi))
            + H * 0.012 * Math.sin(TAU * (a * (1 + R(4)) + R(5)));
        }
        const x = xs * W + (R(6) - 0.5) * base * 1.2 + o.lean * h * (0.25 + 0.75 * h / H) + sway;
        const y = H + base * 0.3 - h;
        const r = base * (1.0 + 0.4 * R(7)) * (1 + (o.soft ? 3.6 : 2.9) * Math.pow(a, 0.9));
        const al = smooth(clamp(a / 0.12)) * Math.pow(1 - a, 1.2) * o.opacity * (0.75 + 0.25 * R(8)) * (0.7 + 0.3 * big);
        if (al < 0.01) continue;
        list.push({ x, y, r, al, a, st: o.soft ? 1 + 0.45 * a : 1, warm: Math.exp(-h / (H * 0.1)), v: Math.floor(R(9) * NV), rot: TAU * (R(10) + (R(11) - 0.5) * 0.6 * a) });
      }
    });
    // 古い（上の）塊から描き、根もとの若い塊を手前に重ねる
    list.sort((p, q) => q.a - p.a);
    // 粗い解像度で描いて拡大する（煙は細部がいらず、ファイルも軽くなる）
    const rs = o.res || 1;
    const out = ctx;
    if (rs < 1) {
      const rw = Math.ceil(W * rs), rh = Math.ceil(H * rs);
      if (!drawSmoke.buf || drawSmoke.buf.width !== rw || drawSmoke.buf.height !== rh) drawSmoke.buf = Object.assign(document.createElement('canvas'), { width: rw, height: rh });
      ctx = drawSmoke.buf.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, rw, rh);
      ctx.scale(rs, rs);
    }
    ctx.save();
    for (const p of list) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // 風の向きに引きのばす（流れているように見せる）
      if (p.st > 1) { ctx.rotate(Math.atan2(-1, o.lean)); ctx.scale(p.st, 1 / Math.sqrt(p.st)); }
      ctx.rotate(p.rot * 0.15);
      const s = p.r * 2;
      ctx.globalAlpha = p.al;
      ctx.drawImage(sprites[p.v][0], -p.r, -p.r, s, s);
      if (p.warm > 0.02) { ctx.globalAlpha = p.al * Math.min(1, p.warm * 1.3); ctx.drawImage(sprites[p.v][1], -p.r, -p.r, s, s); }
      ctx.restore();
    }
    ctx.restore();
    if (o.soft) {
      // 流れる模様で煙を削り、すじとすき間を作る（模様は1周で整数枚ぶん昇るので継ぎ目なし）。中には薄く明るいすじを足す
      if (!tex) makeTex();
      const L2 = o.loop;
      [{ k: 1, s: 0.6, op: 'destination-out', a: 0.5, ph: 0 }, { k: 2, s: 0.32, op: 'destination-out', a: 0.3, ph: 0.37 }, { k: 1, s: 0.45, op: 'source-atop', a: 0.1, ph: 0.61 }].forEach(q => {
        const tile = H * q.s;
        const pat = ctx.createPattern(tex, 'repeat');
        const m = new DOMMatrix().skewX(-Math.atan(o.lean) * 180 / Math.PI).translate(tile * q.ph, -tile * (q.k * t / L2 + q.ph)).scale(tile / 256);
        pat.setTransform(m);
        ctx.save();
        ctx.globalCompositeOperation = q.op;
        ctx.globalAlpha = q.a;
        if (q.op === 'source-atop') { ctx.fillStyle = pat; ctx.filter = 'none'; }
        ctx.fillStyle = pat;
        ctx.fillRect(-W, -H, W * 3, H * 3);
        ctx.restore();
      });
    }
    if (rs < 1) {
      out.save();
      out.imageSmoothingEnabled = true;
      out.imageSmoothingQuality = 'high';
      out.drawImage(drawSmoke.buf, 0, 0, W, H);
      out.restore();
    }
  }
  root.TextApngSmokeFx = { drawSmoke };
})(typeof window !== 'undefined' ? window : globalThis);
