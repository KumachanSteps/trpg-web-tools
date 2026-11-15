// ノイズ（ループ）。SANチェック・正気の揺らぎ。画面全体に重ねる半透明の層。
// 静かな間（うすい砂嵐・走査線・赤みの息づき・ときどき細い横線）と、乱れの波（濃い砂嵐・横ずれの帯・色ずれ・
// 走査線がぐにゃりと波打つ・赤く染まる・暗転のちらつき）をくり返す。
// 乱数は「コマ番号（noise fps で刻む）」から作るので、t と t+loop は同じ絵。
(function () {
  const TAU = Math.PI * 2;
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const mod = (a, b) => ((a % b) + b) % b;
  const bump = (t, c, w) => { const d = (t - c) / w; return Math.exp(-d * d); };

  // 砂嵐の元絵（粗い画素）：濃い版 NT 枚・まばらな版 NT 枚
  const NT = 6;
  let tiles = null, tw = 0, th = 0, scan = null;
  function makeTiles(w, h) {
    tw = w; th = h; tiles = { dense: [], sparse: [] };
    for (const kind of ['dense', 'sparse']) for (let k = 0; k < NT; k++) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
      for (let i = 0; i < w * h; i++) {
        const r = rnd(i, k, kind === 'dense' ? 1 : 2), j = i * 4;
        if (kind === 'sparse' && r > 0.03) { d[j + 3] = 0; continue; }
        const v = kind === 'dense' ? [0.06, 0.34, 0.64, 0.96][Math.floor(rnd(i, k, 3) * 4)] : (rnd(i, k, 4) < 0.5 ? 0.1 : 0.95);
        // 少しだけ赤や青緑の粒をまぜる
        const cr = rnd(i, k, 5);
        let R = v * 255, G = v * 255, B = v * 255;
        if (cr < 0.06) { R = 255 * (0.5 + v * 0.5); G *= 0.15; B *= 0.18; } else if (cr < 0.09) { R *= 0.2; G = 200 * v + 40; B = 210 * v + 40; }
        d[j] = R; d[j + 1] = G; d[j + 2] = B; d[j + 3] = kind === 'dense' ? (rnd(i, k, 6) < 0.5 ? 130 : 255) : 255;
      }
      x.putImageData(img, 0, 0);
      tiles[kind].push(c);
    }
  }

  // 乱れの強さ（0〜1）：小さな波 1回＋大きな波 1回。tick ごとにふるえる
  function env(t, L, tick) {
    const s = t / L * 6; // 6秒基準の位置
    let e = 0.45 * bump(s, 1.55, 0.22);
    // 大きな波：じわっと上がり、しばらく荒れて、引く
    if (s > 3.2 && s < 5.4) {
      const a = s < 3.7 ? (s - 3.2) / 0.5 : s < 4.7 ? 1 : 1 - (s - 4.7) / 0.7;
      e = Math.max(e, smooth01(a));
    }
    // 周期の端をまたいでもつながるよう、0付近は 0
    const jit = 0.65 + 0.35 * rnd(tick, 7);
    return clamp(e * jit);
  }
  function smooth01(x) { x = clamp(x); return x * x * (3 - 2 * x); }

  function draw(ctx, W, H, tIn, opt = {}) {
    const o = { loop: 6, nfps: 15, px: 4, strength: 1, ...opt };
    const L = o.loop, u = H / 720;
    const t = mod(tIn, L);
    const nT = Math.round(L * o.nfps);
    const tick = Math.floor(t * o.nfps + 1e-6) % nT;
    const pxs = Math.max(2, Math.round(o.px * u));
    const gw = Math.ceil(W / pxs), gh = Math.ceil(H / pxs);
    if (!tiles || tw !== gw || th !== gh) makeTiles(gw, gh);
    const E = env(t, L, tick) * o.strength;
    const s6 = t / L * 6;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1) 赤み：いつもうっすら、乱れで濃く
        // （縁だけの赤いぼかしは色数が少ないと輪の縞が出るので使わない。全体を一様に染める）
    ctx.fillStyle = `rgba(140,0,10,${(0.05 + 0.2 * E).toFixed(3)})`; ctx.fillRect(0, 0, W, H);

    // 2) 走査線：乱れると横にぐにゃりと波打つ
    const amp = (o.noWave ? 0 : 22) * u * E, ky = TAU / (H * 0.5), kx = TAU / (W * 0.7);
    const sl = 3 * u;
    // 走査線の絵を一度作り、縦に細く切った短冊を上下にずらして並べる（線がくっきりしたまま波打つ）
    if (!scan || scan.width !== W || scan.height !== H + 64) {
      scan = document.createElement('canvas'); scan.width = W; scan.height = H + 64;
      const sx = scan.getContext('2d'); sx.fillStyle = '#000';
      for (let y = 0; y < H + 64; y += sl) sx.fillRect(0, Math.round(y), W, Math.max(1, Math.round(u)));
    }
    ctx.globalAlpha = 0.14 + 0.12 * E;
    if (amp < 0.5) ctx.drawImage(scan, 0, 32, W, H, 0, 0, W, H);
    else {
      const ns = 48, sw = Math.ceil(W / ns), ph = TAU * tick / 5;
      for (let k = 0; k < ns; k++) {
        const x = k * sw, dy = Math.round(Math.min(30, amp) * Math.sin(x * kx + ph) * (0.6 + 0.4 * Math.sin(ph * 0.7 + k * 0.2)));
        ctx.drawImage(scan, x, 32 + dy, sw, H, x, 0, sw, H);
      }
    }
    ctx.globalAlpha = 1;

    // 2b) ぐにゃり：画面がうねるような、波打つ暗い帯と明るい帯（乱れのときだけ）
    if (E > 0.1 && !o.noRip) {
      const ph = TAU * t / L * 3;
      for (let r = 0; r < 6; r++) {
        const y0 = (r + 0.5) / 6 * H + Math.sin(ph + r * 1.7) * 30 * u;
        const A = (25 + 35 * E) * u, kk = TAU / (W * (0.45 + 0.1 * r % 3)), thk = (22 + 18 * (r % 2)) * u;
        ctx.beginPath();
        for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, y0 + A * Math.sin(x * kk + ph * (r % 2 ? 1 : -1) + r));
        for (let x = W; x >= 0; x -= W / 40) ctx.lineTo(x, y0 + thk + A * Math.sin(x * kk * 1.1 + ph * (r % 2 ? 1 : -1) + r + 0.6));
        ctx.closePath();
        ctx.fillStyle = r % 2 ? `rgba(255,220,220,${(0.06 * E).toFixed(3)})` : `rgba(20,0,4,${(0.2 * E).toFixed(3)})`;
        ctx.filter = `blur(${(7 * u).toFixed(1)}px)`; ctx.fill(); ctx.filter = 'none';
      }
    }

    // 3) 転がる明るい帯（縦にゆっくり下りる。周期の半分で一周）
    const ry = mod(t / (L / 2), 1) * (H * 1.4) - H * 0.2;
    const rg = ctx.createLinearGradient(0, ry - 70 * u, 0, ry + 70 * u);
    const ra = 0.035 + 0.08 * E;
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, `rgba(235,225,225,${ra.toFixed(3)})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, ry - 70 * u, W, 140 * u);
    // 帯の中だけ、かすかな粒（静かな間でも何かが通り過ぎる）
    {
      const hb = 46 * u, sp = tiles.sparse[hash32(tick, 13, 0) % NT];
      const sy0 = Math.max(0, Math.floor((ry - hb) / pxs)), sy1 = Math.min(gh, Math.ceil((ry + hb) / pxs));
      if (sy1 > sy0) { ctx.globalAlpha = 0.28; ctx.drawImage(sp, 0, sy0, gw, sy1 - sy0, 0, sy0 * pxs, gw * pxs, (sy1 - sy0) * pxs); ctx.globalAlpha = 1; }
    }

    // 4) 砂嵐：乱れの波のときだけ。まばらな粒→濃い砂嵐
    // （静かな間は砂嵐を出さない＝コマごとの差が小さく、ファイルが軽い）
    if (E > 0.04 && !o.noGrain) {
      const sp = tiles.sparse[hash32(tick, 11, 0) % NT];
      ctx.globalAlpha = clamp(E * 4) * 0.35; ctx.drawImage(sp, 0, 0, W, gh * pxs);
      const dn = tiles.dense[hash32(tick, 12, 0) % NT];
      ctx.globalAlpha = 0.3 * E; ctx.drawImage(dn, 0, 0, W, gh * pxs);
    }
    ctx.globalAlpha = 1;

    // 5) 横ずれの帯：砂嵐を横に引きのばした帯＋赤と青緑の色ずれ
    const nb = Math.round(E * 6 + (rnd(tick, 21) < 0.1 ? 1 : 0));
    for (let b = 0; b < nb; b++) {
      const thick = rnd(tick, 27, b) < 0.35 + 0.3 * E;
      const by = rnd(tick, 22, b) * H, bh = (thick ? 14 + rnd(tick, 23, b) * 70 * (0.4 + E) : 2 + rnd(tick, 23, b) * 6) * u;
      const shift = (rnd(tick, 24, b) - 0.5) * 160 * u * (0.4 + E);
      const src = tiles.dense[hash32(tick, 25, b) % NT];
      const sy = Math.floor(rnd(tick, 26, b) * (gh - 4));
      // 帯の中身：横に引きのばした砂嵐（ずれた絵のように）、ときどき暗い帯
      if (thick && rnd(tick, 28, b) < 0.4) { ctx.fillStyle = `rgba(0,0,0,${(0.18 + 0.2 * E).toFixed(3)})`; ctx.fillRect(0, by, W, bh); }
      ctx.globalAlpha = 0.16 + 0.34 * E;
      ctx.drawImage(src, 0, sy, Math.max(4, gw / (thick ? 5 : 10)), Math.max(1, bh / pxs / (thick ? 3 : 1)), shift, by, W, bh);
      ctx.globalAlpha = 1;
      const ch = Math.max(1, Math.min(bh * 0.3, 5 * u));
      ctx.fillStyle = `rgba(255,30,40,${(0.12 + 0.22 * E).toFixed(3)})`; ctx.fillRect(shift + 10 * u, by, W, ch);
      ctx.fillStyle = `rgba(30,230,240,${(0.08 + 0.16 * E).toFixed(3)})`; ctx.fillRect(shift - 10 * u, by + bh - ch, W, ch);
    }

    // 6) 色ずれの縦すじ（画面の左右端）：乱れのときだけ
    if (E > 0.15) {
      const off = 6 * u * E;
      ctx.fillStyle = `rgba(255,20,30,${(0.12 * E).toFixed(3)})`; ctx.fillRect(0, 0, 3 * u + off, H); ctx.fillRect(W * (0.3 + 0.4 * rnd(tick, 31)), 0, off * 0.6, H);
      ctx.fillStyle = `rgba(20,220,235,${(0.1 * E).toFixed(3)})`; ctx.fillRect(W - 3 * u - off, 0, 3 * u + off, H);
    }

    // 7) 大きな波のさなかの暗転・白とびのちらつき（数コマ）
    if (s6 > 3.7 && s6 < 4.7) {
      const r = rnd(tick, 41);
      if (r < 0.14) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(0, 0, W, H); }
      else if (r < 0.2) { ctx.fillStyle = 'rgba(255,235,235,0.14)'; ctx.fillRect(0, 0, W, H); }
    }
    ctx.restore();
  }
  window.FX = { draw };
})();
