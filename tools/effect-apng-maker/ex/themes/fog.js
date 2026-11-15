// 霧：流れる層・筋・ちぎれた帯でできた霧を描く。window.FX.draw(ctx, W, H, t, opt)
// opt.mode = 'dense'（濃霧）| 'thin'（薄い霧）| 'ground'（足元だけ霧）。濃さ・高さは opt で上書きできる。
// しくみ：横に引きのばした fbm ノイズで霧の濃さを作る。ノイズは「少し流しては次の模様へ溶け替える」
// 2本の位相（フローマップ法）で動かすので、流れは遅くても loop 秒で必ず元の絵に戻る。
// 粗い解像度（opt.res）で濃さを計算し、拡大して描く。
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
  // 値ノイズ（256×256 の乱数表を引く。座標は十分広いので繰り返しは見えない）
  const TB = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) TB[i] = rnd(i & 255, i >> 8, 4242);
  function vn(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ix & 255, x1 = (ix + 1) & 255, y0 = (iy & 255) << 8, y1 = ((iy + 1) & 255) << 8;
    const a = TB[x0 + y0], b = TB[x1 + y0], c = TB[x0 + y1], d = TB[x1 + y1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, oct) {
    let n = 0, amp = 1, sum = 0;
    for (let o = 0; o < oct; o++) { n += amp * vn(x, y); sum += amp; amp *= 0.5; x = x * 2.03 + 17.3; y = y * 2.07 + 31.7; }
    return n / sum;
  }

  const MODES = {
    // 濃霧：ほぼ全面が白くかすみ、ところどころ横長に薄くなって奥が透ける
    dense: { base: 0.5, top: 0.94, holes: 0.72, fine: 0.4, warp: 0.35, swirl: 0, shade: 1.0, gray: 0.15, hTop: -1 },
    // 薄い霧：うっすらとした帯がゆっくり流れる
    thin: { sx: 0.42, sy: 2.4, base: 0.03, top: 0.46, holes: 0, fine: 0.5, warp: 0.3, swirl: 0, shade: 1.4, gray: 0.45, hTop: -1 },
    // 足元だけ霧：下3割に低く這う。上端はちぎれて渦を巻く
    ground: { seed: 3, base: 0.35, top: 0.92, holes: 0.35, fine: 0.45, warp: 0.45, swirl: 1, shade: 1.0, gray: 0.2, hTop: 0.7, fx: 3.2, fy: 3.4 },
  };

  let buf = null, img = null, fB = null, fF = null, fH = null, fA = null, fN = null;
  function draw(ctx, W, H, t, opt = {}) {
    const o = { res: 1 / 3, loop: 10, cycles: 1, colors: 48, v1: 0.03, v2: 0.065, sx: 0.55, sy: 2.2, ...MODES[opt.mode || 'dense'], ...opt };
    o.mode = opt.mode || 'dense';
    const L = o.loop, NC = o.cycles || 2, P = L / NC;
    const rw = Math.ceil(W * o.res), rh = Math.ceil(H * o.res);
    if (!buf || buf.width !== rw || buf.height !== rh) {
      buf = Object.assign(document.createElement('canvas'), { width: rw, height: rh });
      img = buf.getContext('2d').createImageData(rw, rh);
      fB = new Float32Array(rw * (rh + 2)); fF = new Float32Array(rw * (rh + 2)); fH = new Float32Array(rw * (rh + 2));
      fA = new Float32Array(rw * rh); fN = new Float32Array(rw * rh);
    }
    // 2本の位相：それぞれ少し流れ（ずれ幅は有界）、重みが0になった瞬間に次の模様へ入れ替わる
    const phs = [0, 0.5].map(j => {
      const a = t / P + j, ph = a - Math.floor(a);
      const cyc = ((Math.floor(a) % NC) + NC) % NC;
      const w = 1 - Math.abs(2 * ph - 1);
      const s = (ph - 0.5) * P;      // この位相の経過秒（-P/2〜P/2）
      const sd = o.seed || 7, ox = 100 * rnd(cyc, j * 2, sd) + 50 * j, oy = 100 * rnd(cyc, j * 2 + 1, sd);
      // 渦の中心（足元の霧の上端あたり）
      const vort = [];
      if (o.swirl) for (let k = 0; k < 5; k++) {
        const R = m => rnd(cyc * 10 + k, m, 91 + j * 7);
        vort.push({ x: (k + 0.2 + 0.6 * R(1)) / 5 * W / H, y: o.hTop + 0.0 + 0.1 * R(2), r: 0.1 + 0.06 * R(3), sp: (R(4) < 0.5 ? -1 : 1) * (0.5 + 0.3 * R(5)) });
      }
      return { w, s, ox, oy, vort };
    });
    const sw = Math.sqrt(phs[0].w * phs[0].w + phs[1].w * phs[1].w);
    const ar = W / H;
    for (let py = -1; py <= rh; py++) {
      const v = (py + 0.5) / rh;
      const shear = 1 + 0.45 * Math.sin(v * 5.1 + 0.7) + (o.hTop > 0 ? 0.6 * (v - 0.8) : 0);   // 高さで流れの速さが少し違う
      for (let px = 0; px < rw; px++) {
        const u = (px + 0.5) / rw * ar;
        let aB = 0, aF = 0, aH = 0;
        for (let k = 0; k < 2; k++) {
          const q = phs[k];
          if (q.w <= 0) continue;
          let x = u, y = v;
          for (const c of q.vort) {
            const cx = c.x + o.v2 * q.s, dx = x - cx, dy = (y - c.y) * 1.8;
            const r2 = (dx * dx + dy * dy) / (c.r * c.r);
            if (r2 > 5) continue;
            const ang = c.sp * q.s * Math.exp(-r2);
            const ca = Math.cos(ang), sa = Math.sin(ang);
            x = cx + dx * ca - dy * sa; y = c.y + (dx * sa + dy * ca) / 1.8;
          }
          const x1 = (x - o.v1 * shear * q.s) * o.sx + q.ox, y1 = y * o.sy + q.oy;
          const wx = fbm(x1 * 0.8 + 5.2, y1 * 0.6, 3) - 0.5, wy = fbm(x1 * 0.8 + 9.1, y1 * 0.6 + 3.3, 3) - 0.5;
          aB += q.w * (fbm(x1 + o.warp * 2.2 * wx, y1 + o.warp * wy, 4) - 0.5);
          // 細い筋：横に強く引きのばした細かい模様が少し速く流れる
          const x2 = (x - o.v2 * shear * q.s) * o.sx * (o.fx || 2.6) + q.ox * 1.3, y2 = y * o.sy * (o.fy || 2.3) + q.oy * 1.7;
          aF += q.w * (fbm(x2 + o.warp * 4 * wx, y2 + o.warp * 2.5 * wy, 3) - 0.5);
          if (o.holes) aH += q.w * (fbm((x - o.v1 * 0.8 * q.s) * 0.45 + q.ox * 0.7 + 3.3, y * 1.5 + q.oy, 2) - 0.5);
        }
        const i = (py + 1) * rw + px;
        fB[i] = 0.5 + aB / sw * 1.25; fF[i] = 0.5 + aF / sw * 1.25; fH[i] = 0.5 + aH / sw * 1.3;
      }
    }
    const d = img.data, hb = o.hTop;
    for (let py = 0; py < rh; py++) {
      const v = (py + 0.5) / rh;
      for (let px = 0; px < rw; px++) {
        const i = (py + 1) * rw + px;
        const nb = fB[i], nf = fF[i];
        const n = nb * (1 - o.fine) + nf * o.fine;
        let a;
        if (o.mode === 'thin') {
          // 帯：大きな模様の濃い所に、細い筋が白く残る＋ごく薄いかすみ
          const band = 0.5 + 0.5 * Math.sin(TAU * v * 2.3 + (nb - 0.5) * 7 + 0.8);   // 横に走る帯（大きな模様でうねる）
          a = o.base + o.top * sstep(0.36, 0.72, nb * 0.55 + band * 0.45) * (0.2 + 0.8 * sstep(0.25, 0.85, nf));
        } else {
          a = o.base + (o.top - o.base) * sstep(0.3, 0.7, n);
          a *= 1 - o.holes * sstep(0.44, 0.24, fH[i]);      // 横長の薄い所から奥が透ける
          if (hb > 0) {
            // 上端：大きな模様でうねり、細い筋でちぎれる。境目より上にも筋が少し漂う
            const edge = hb - (nb - 0.5) * 0.3 - (nf - 0.5) * 0.08;
            const body = sstep(edge - 0.02, edge + 0.16, v);
            const wisp = Math.pow(sstep(edge - 0.16, edge + 0.02, v), 1.5) * sstep(0.45, 0.75, nf) * 0.6;
            a *= Math.max(body * sstep(0.1, 0.45, nf + body * 0.35 - 0.12), wisp);
            a = Math.max(a, o.top * 0.95 * body * sstep(hb + 0.06, hb + 0.27, v) * (0.85 + 0.15 * nf));   // 地面近くは厚く白い
          }
        }
        fA[py * rw + px] = clamp(a, 0, 0.96);
        fN[py * rw + px] = n;
      }
    }
    // 色：濃い所ほど白く、薄い所（ふち・ちぎれた所）ほど灰色寄りに。明るい背景でも霧の形が見えるように。
    // 色を不透明度だけで決める（色が1本の帯に並ぶ）ので、少ない色数でも縞が出にくく、ファイルも軽い
    for (let i = 0, n = rw * rh; i < n; i++) {
      const a = fA[i];
      const sh = clamp(o.gray + o.shade * (o.top * 0.85 - a));
      const i4 = i * 4;
      d[i4] = 244 - 128 * sh; d[i4 + 1] = 246 - 120 * sh; d[i4 + 2] = 250 - 104 * sh; d[i4 + 3] = 255 * a;
    }
    buf.getContext('2d').putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.restore();
  }
  window.FX = { draw };
})();
