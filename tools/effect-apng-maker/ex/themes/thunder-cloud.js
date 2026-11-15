// 雷の共通部品：hash 乱数、稲妻の形づくり（中点変位＋枝分かれ）、稲妻の描画（にじみ・中間・白い芯の3層）
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
  // 乱数の列（seed ごとに決まる）
  function rng(seed) { let i = 0; return () => rnd(seed, i++, 7771); }

  // 2点間をぎざぎざにつなぐ（中点変位）。rough は横ぶれの強さ
  function jag(R, x0, y0, x1, y1, levels, rough) {
    let pts = [[x0, y0], [x1, y1]];
    let amp = rough;
    for (let l = 0; l < levels; l++) {
      const np = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        const off = (R() - 0.5) * 2 * amp * len;
        const along = (R() - 0.5) * 0.12;
        np.push([a[0] + dx * (0.5 + along) - dy / len * off, a[1] + dy * (0.5 + along) + dx / len * off], b);
      }
      pts = np;
      amp = rough * (l < 1 ? 0.62 : 0.55);
    }
    return pts;
  }
  // 目標へ向かいながら、ジグザグに折れて進む（稲妻らしい鋭い折れ）。最後に細かいぎざぎざを足す
  function walk(R, x0, y0, x1, y1, steps, wander, fine) {
    let pts = [[x0, y0]];
    let x = x0, y = y0;
    for (let k = steps; k > 1; k--) {
      const dx = x1 - x, dy = y1 - y, rem = Math.hypot(dx, dy);
      const base = Math.atan2(dy, dx);
      const a = base + (R() - 0.5) * 2 * wander;
      const l = rem / k * (0.6 + 0.8 * R());
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      pts.push([x, y]);
    }
    pts.push([x1, y1]);
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const seg = jag(R, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], fine, 0.22);
      for (let j = 1; j < seg.length; j++) out.push(seg[j]);
    }
    return out;
  }
  function arcLen(pts) { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; }

  // 稲妻を作る：{ paths:[{pts, s(累積長), w(太さ1/0.5/0.28), start(主幹上で枝が出る距離), L}], total }
  // o: { branches, sub, rough, levels, spread }
  function makeBolt(seed, x0, y0, x1, y1, o = {}) {
    const R = rng(seed);
    const levels = o.levels || 7, rough = o.rough == null ? 0.42 : o.rough;
    const main = walk(R, x0, y0, x1, y1, o.steps || 16, o.wander || 0.75, 3);
    const ms = arcLen(main), total = ms[ms.length - 1];
    const paths = [{ pts: main, s: ms, w: 1, start: 0, L: total }];
    const nb = o.branches == null ? 5 : o.branches;
    const addBranch = (src, srcStart, w, depth) => {
      const n = src.pts.length;
      const i = Math.floor(n * (0.12 + 0.66 * R()));
      const p = src.pts[i], q = src.pts[Math.min(n - 1, i + 6)];
      let ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const side = R() < 0.5 ? -1 : 1;
      ang += side * (0.4 + 0.5 * R()) * (o.spread || 1);
      const remain = src.L - src.s[i];
      const len = Math.max(src.L * 0.1, remain * (0.25 + 0.4 * R())) * (depth ? 0.55 : 1) * (o.blen || 1);
      const ex = p[0] + Math.cos(ang) * len, ey = p[1] + Math.sin(ang) * len;
      const bp = walk(R, p[0], p[1], ex, ey, depth ? 5 : 8, (o.wander || 0.75) * 1.05, depth ? 2 : 3);
      const bs = arcLen(bp);
      const br = { pts: bp, s: bs, w, start: srcStart + src.s[i], L: bs[bs.length - 1] };
      paths.push(br);
      return br;
    };
    for (let b = 0; b < nb; b++) {
      const br = addBranch(paths[0], 0, 0.45, 0);
      const ns = o.sub == null ? 2 : o.sub;
      for (let k = 0; k < ns; k++) if (R() < 0.75) addBranch(br, br.start, 0.2, 1);
    }
    return { paths, total, end: [x1, y1] };
  }

  // パスの d0〜d1（パス上の距離）の部分を Path2D にする
  function seg(pth, d0, d1) {
    if (d1 <= d0) return null;
    const p2 = new Path2D();
    const pts = pth.pts, s = pth.s;
    const at = (d) => { let i = 1; while (i < pts.length - 1 && s[i] < d) i++; const k = clamp((d - s[i - 1]) / (s[i] - s[i - 1] || 1)); return [i, pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; };
    const [i0, x0, y0] = at(d0), [i1, x1, y1] = at(d1);
    p2.moveTo(x0, y0);
    for (let i = i0; i < i1; i++) p2.lineTo(pts[i][0], pts[i][1]);
    p2.lineTo(x1, y1);
    return p2;
  }
  // 見えている部分を、太さの倍率つきの区間に分ける（枝は先へ行くほど細くなる）。prog = 主幹の先端が進んだ距離（px）
  function pieces(pth, prog) {
    const d = Math.min(pth.L, prog - pth.start);
    if (d <= 0) return [];
    if (pth.w >= 1) { const cut = pth.L * 0.82; return [[seg(pth, 0, Math.min(d, cut)), 1], [seg(pth, cut, d), 0.8]].filter(x => x[0]); }
    const c1 = pth.L * 0.45, c2 = pth.L * 0.78;
    return [[seg(pth, 0, Math.min(d, c1)), 1], [seg(pth, c1, Math.min(d, c2)), 0.7], [seg(pth, c2, d), 0.45]].filter(x => x[0]);
  }
  function pathUpTo(pth, prog) { return seg(pth, 0, Math.min(pth.L, prog - pth.start)); }

  let glowCv = null;
  function glowCanvas(W, H) {
    const w = Math.ceil(W / 4), h = Math.ceil(H / 4);
    if (!glowCv || glowCv.width !== w || glowCv.height !== h) glowCv = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const g = glowCv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(0.25, 0, 0, 0.25, 0, 0);
    return g;
  }

  // 稲妻を描く。prog: 先端の距離（Infinity で全体）、I: 明るさ（1 で通常、>1 で白く強く）、bw: 主幹の芯の太さ(px)
  // pal: { glow:[r,g,b], mid:[r,g,b], core:[r,g,b] }、cool: 0→白っぽい 1→青紫の残像
  function drawBolt(ctx, W, H, bolt, prog, I, bw, o = {}) {
    if (I <= 0.003) return;
    const glow = o.glow || [110, 95, 255], mid = o.mid || [130, 200, 255], core = o.core || [255, 255, 255];
    const cool = o.cool || 0;
    const vis = [];
    for (const p of bolt.paths) for (const [p2, wm] of pieces(p, prog)) vis.push([p, p2, wm]);
    if (!vis.length) return;
    // ① 外側のにじみ（1/4 解像度でぼかしてから重ねる）
    const g = glowCanvas(W, H);
    g.lineCap = g.lineJoin = 'round';
    for (const [p, p2, wm] of vis) {
      g.strokeStyle = `rgba(${glow[0]},${glow[1]},${glow[2]},${clamp(0.55 * Math.min(I, 1.3))})`;
      g.lineWidth = bw * (4 + 6 * p.w * wm) * (o.glowW || 1);
      g.stroke(p2);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.filter = `blur(${Math.max(2, bw * 3.2 * (o.glowW || 1))}px)`;
    ctx.globalAlpha = clamp(I * (o.glowA || 1));
    ctx.drawImage(glowCv, 0, 0, W, H);
    ctx.filter = `blur(${Math.max(1, bw * 1.0)}px)`;
    ctx.drawImage(glowCv, 0, 0, W, H);
    ctx.restore();
    // ② 中間（青〜水色）と ③ 白い芯
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    const ia = clamp(I);
    for (const [p, p2, wm] of vis) {
      const w = p.w * wm;
      ctx.strokeStyle = `rgba(${mid[0]},${mid[1]},${mid[2]},${clamp(ia * (0.55 + 0.45 * w))})`;
      ctx.lineWidth = bw * (0.9 + 2.2 * w) * (1 + 0.4 * clamp(I - 1));
      ctx.stroke(p2);
    }
    for (const [p, p2, wm] of vis) {
      const w = p.w * wm;
      const cr = core[0] + (mid[0] - core[0]) * cool, cg = core[1] + (mid[1] - core[1]) * cool, cb = core[2] + (mid[2] - core[2]) * cool;
      ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${clamp(ia * (0.75 + 0.25 * w) * (1 - 0.5 * cool))})`;
      ctx.lineWidth = Math.max(0.8, bw * (0.35 + 0.85 * w) * (1 + 0.5 * clamp(I - 1)));
      ctx.stroke(p2);
    }
    ctx.restore();
  }

  // 柔らかい光のかたまり
  function glowBlob(ctx, x, y, r, rgb, a, sy = 1) {
    if (a <= 0.003) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a)})`);
    g.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a * 0.4)})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 減色で大きなグラデーションに縞が出るのを防ぐ、4×4 の規則的なばらし（半透明の画素だけ。規則的なので圧縮が効く）
  let dmask = null;
  function dither(ctx, W, H, amp) {
    const n = W * H;
    if (!dmask || dmask.length !== n) { const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; dmask = new Float32Array(n); for (let i = 0; i < n; i++) dmask[i] = (B4[((i / W | 0) & 3) * 4 + (i % W & 3)] + 0.5) / 16 - 0.5; }
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const a = d[j + 3];
      if (a === 0) continue;
      const v = dmask[i] * amp;
      d[j + 3] = a + v * (a < 250 ? 1 : 0);
      d[j] += v; d[j + 1] += v; d[j + 2] += v;
    }
    ctx.putImageData(img, 0, 0);
  }
  root.BOLT = { dither, TAU, clamp, hash32, rnd, frac, smooth, vnoise, rng, jag, makeBolt, pathUpTo, seg, pieces, drawBolt, glowBlob };
})(window);
// 雷_黒雲の稲光（背景・ループ）：画面を覆う黒い曇り空。雲の中のあちこちで光が起き、雲の厚みや輪郭が内側から照らされて浮かぶ。
// 雲は横に流れる層・筋（遠近つき：上が近く大きく、下が遠く薄い層）。window.FX.draw(ctx, W, H, t, opt)、t と t+loop は同じ絵
// 粗い解像度（既定 1/2）で雲と光を計算して拡大し、細い稲妻だけ実寸で重ねる。
(function () {
  const { clamp, smooth, rnd, frac, makeBolt, drawBolt } = window.BOLT;

  // 上下左右につながる fbm の表（値 0〜1）
  const N = 256;
  function makeTex(seed, per0, oct) {
    const T = new Float32Array(N * N);
    const g = (a, b, per, s) => rnd(((a % per) + per) % per, ((b % per) + per) % per, s);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let n = 0, amp = 1, per = per0, sum = 0;
      for (let o = 0; o < oct; o++) {
        const u = x / N * per, v = y / N * per, iu = Math.floor(u), iv = Math.floor(v), fu = smooth(u - iu), fv = smooth(v - iv);
        const a = g(iu, iv, per, seed + o), b = g(iu + 1, iv, per, seed + o), c = g(iu, iv + 1, per, seed + o), d = g(iu + 1, iv + 1, per, seed + o);
        n += amp * (a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv);
        sum += amp; amp *= 0.55; per *= 2;
      }
      T[y * N + x] = n / sum;
    }
    return T;
  }
  function samp(T, u, v) {
    let x = u * N, y = v * N;
    x -= Math.floor(x / N) * N; y -= Math.floor(y / N) * N;
    const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy;
    const x1 = (ix + 1) & (N - 1), y1 = (iy + 1) & (N - 1);
    const a = T[iy * N + ix], b = T[iy * N + x1], c = T[y1 * N + ix], d = T[y1 * N + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  let TEX = null, WARP = null;

  // 稲光の予定：[開始(周回内 0〜1), x, y, 強さ, 広がり(画面高さ比), 明滅の回数, 稲妻を見せるか]
  const EV = [
    [0.02, 0.22, 0.30, 1.0, 0.55, 3, 0], [0.10, 0.78, 0.18, 0.6, 0.35, 2, 0], [0.17, 0.55, 0.45, 0.45, 0.30, 2, 0],
    [0.24, 0.62, 0.28, 1.4, 0.65, 4, 1], [0.36, 0.12, 0.62, 0.5, 0.32, 2, 0], [0.43, 0.88, 0.50, 0.7, 0.40, 3, 0],
    [0.52, 0.38, 0.22, 0.9, 0.50, 3, 0], [0.60, 0.70, 0.66, 0.45, 0.28, 1, 0], [0.66, 0.30, 0.40, 1.4, 0.65, 4, 1],
    [0.76, 0.85, 0.30, 0.55, 0.36, 2, 0], [0.83, 0.50, 0.60, 0.5, 0.30, 2, 0], [0.90, 0.15, 0.20, 0.8, 0.45, 3, 0],
  ];
  // 各稲光の明るさ（明滅つき）。周回をまたいでもつながる
  function evI(e, i, t, L) {
    const d = ((t - e[0] * L) % L + L) % L;
    if (d > 0.7) return 0;
    let I = 0;
    for (let k = 0; k < e[5]; k++) {
      const tk = k === 0 ? 0 : 0.05 + 0.09 * k + 0.05 * rnd(i, k, 77);
      const a = (k === 0 ? 1 : 0.55 + 0.45 * rnd(i, k, 78));
      const q = d - tk;
      if (q < 0) continue;
      I += a * (q < 0.025 ? q / 0.025 : Math.exp(-(q - 0.025) / 0.07));
    }
    return I * e[3] * (1 - smooth(clamp((d - 0.45) / 0.25)));
  }

  let buf = null, img = null, D = null, boltCv = null, bolts = null;
  window.FX = {
    draw(ctx, W, H, t, opt = {}) {
      const L = opt.loop || 6, rs = opt.res || 0.5;
      if (!TEX) { TEX = makeTex(901, 4, 5); WARP = makeTex(733, 2, 3); }
      const w = Math.ceil(W * rs), h = Math.ceil(H * rs);
      if (!buf || buf.width !== w || buf.height !== h) { buf = Object.assign(document.createElement('canvas'), { width: w, height: h }); img = buf.getContext('2d').createImageData(w, h); D = new Float32Array(w * h); }
      // ── 雲の濃さ D：遠近（下ほど遠く、層が薄く詰まる）＋横長の筋＋ゆがみ。2つの位相を入れ替えながら流す（継ぎ目なし）
      const ph = frac(t / L);
      const drift = opt.drift || 0.5;                    // 1周で流れる量（雲の模様の単位）
      const offA = drift * ph, offB = drift * frac(ph + 0.5) + 0.37;
      const wA = Math.sin(Math.PI * ph) ** 2, wB = 1 - wA, nrm = 1 / Math.sqrt(wA * wA + wB * wB);
      const asp = W / H;
      for (let y = 0; y < h; y++) {
        const Y = (y + 0.5) / h;
        const dep = 0.62 / (1.55 - Y);                  // 奥行き（下ほど大きい＝遠い）
        for (let x = 0; x < w; x++) {
          const X = (x + 0.5) / w;
          const u = (X - 0.5) * asp * (opt.up == null ? 0.5 + 0.5 * dep : 1 - opt.up + opt.up * dep) * (opt.us || 0.85), v = dep * (opt.vs || 1.1);
          const f = (o, vo) => {
            const uu = u + o, vv = v + vo;
            const wu = samp(WARP, uu * 0.8, vv * 0.5), wv = samp(WARP, uu * 0.8 + 0.5, vv * 0.5 + 0.3);
            const big = samp(WARP, uu * 0.45 + 0.2, vv * 0.9 + (wu - 0.5) * 0.15);
            return samp(TEX, uu * (opt.tu || 0.55) + (wu - 0.5) * (opt.wu || 0.5), vv * (opt.tv || 1.6) + (wv - 0.5) * (opt.wv || 0.25)) * 0.62 + big * 0.38;
          };
          const n = 0.5 + ((f(offA, 0) - 0.5) * wA + (f(offB, 0.5) - 0.5) * wB) * nrm;
          D[y * w + x] = smooth(clamp((n - 0.33) / 0.38));
        }
      }
      // ── 光：各稲光について、雲の中の点から広がる光。間にある濃い雲で遮られ、光に向いたふちが明るく浮かぶ
      const act = [];
      if (!opt.nolight) EV.forEach((e, i) => { const I = evI(e, i, t, L); if (I > 0.01) act.push({ x: e[1] * w, y: e[2] * h, I, r: e[4] * h * (0.85 + 0.3 * I) }); });
      const d = img.data;
      const Dl = (fx, fy) => {
        fx = fx < 0 ? 0 : fx > w - 1.001 ? w - 1.001 : fx; fy = fy < 0 ? 0 : fy > h - 1.001 ? h - 1.001 : fy;
        const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, o = iy * w + ix;
        return D[o] * (1 - ax) * (1 - ay) + D[o + 1] * ax * (1 - ay) + D[o + w] * (1 - ax) * ay + D[o + w + 1] * ax * ay;
      };
      for (let y = 0; y < h; y++) {
        const Y = y / h;
        for (let x = 0; x < w; x++) {
          const i = y * w + x, c = D[i];
          const up = D[Math.max(0, y - 2) * w + x];
          // 地の暗い雲：濃いところは少し明るい灰紫、すき間は黒に近い。上側のふちがかすかに明るい（空のわずかな光）
          let R = 8 + 33 * c, G = 9 + 36 * c, B = 13 + 44 * c;
          const rim0 = clamp((c - up) * 2);
          R += 12 * rim0; G += 12 * rim0; B += 16 * rim0;
          R *= 1 - 0.25 * Y; G *= 1 - 0.25 * Y; B *= 1 - 0.2 * Y;
          let Lr = 0, Lg = 0, Lb = 0;
          for (const a of act) {
            const dx = x - a.x, dy = y - a.y, dd = (dx * dx + dy * dy) / (a.r * a.r);
            if (dd > 4) continue;
            const F = Math.exp(-dd * 1.6);
            // 光源との間の雲の濃さ（3点）
            let acc = 0;
            for (let k = 1; k <= 3; k++) acc += Dl(x - dx * k * 0.22, y - dy * k * 0.22);
            const tr = Math.exp(-acc * 0.45 + c * 0.3);
            // 光に向いたふち：光源側の雲が薄く、ここが濃い
            const dl = Math.sqrt(dx * dx + dy * dy) + 1e-3;
            const toward = Dl(x - dx / dl * 2.5, y - dy / dl * 2.5);
            const rim = clamp((c - toward) * 3);
            const s = a.I * (F * (tr * (0.15 + 1.25 * c * c) + 1.1 * rim * F + 0.05) * 2.4 + Math.exp(-dd * 9) * (0.2 + 0.45 * c));
            Lr += s; Lg += s; Lb += s;
          }
          if (Lr > 0) {
            // 弱い光は青紫、強いところほど白っぽい
            const k = 1.5 * (1 - Math.exp(-Lr / 1.5));     // 強い光はなだらかに頭打ち（白飛びの塊にしない）
            const wht = clamp(k - 0.5);
            R += 255 * k * (0.5 + 0.5 * wht); G += 255 * k * (0.56 + 0.44 * wht); B += 255 * k;
          }
          const j = i * 4;
          d[j] = R; d[j + 1] = G; d[j + 2] = B; d[j + 3] = 255;
        }
      }
      buf.getContext('2d').putImageData(img, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buf, 0, 0, W, H);
      ctx.restore();
      if (opt.dither !== 0) window.BOLT.dither(ctx, W, H, opt.dither || 2.5);   // 暗い階調の縞を減色前にばらす
      // ── 雲の切れ目にときどき見える細い稲妻（光の中心から横へ這う）
      if (!bolts || bolts.key !== W + 'x' + H) {
        bolts = { key: W + 'x' + H, list: {} };
        EV.forEach((e, i) => {
          if (!e[6]) return;
          const x0 = e[1] * W, y0 = e[2] * H, ang = (rnd(i, 1, 5) < 0.5 ? 0.35 : Math.PI - 0.35) + (rnd(i, 2, 5) - 0.5) * 0.5, l = H * 0.42;
          bolts.list[i] = makeBolt(500 + i, x0, y0, x0 + Math.cos(ang) * l * 1.3, y0 + Math.sin(ang) * l, { branches: 3, sub: 1, steps: 10, blen: 0.8 });
        });
      }
      EV.forEach((e, i) => {
        if (!e[6]) return;
        const I = evI(e, i, t, L);
        if (I < 0.05) return;
        drawBolt(ctx, W, H, bolts.list[i], Infinity, Math.min(1.2, I * 0.9), 1.5 * H / 720, { glowA: 0.7 });
      });
    },
  };
})();
