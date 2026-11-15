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
// 雷_連続落雷（ループ）：何本もの稲妻が、左右・奥（細く短い）と手前（太く長い）で交互に落ちる。
// 毎回形が違い、落ちるたびに周囲がふっと明るくなる。window.FX.draw(ctx, W, H, t, opt)、t と t+loop は同じ絵
(function () {
  const { clamp, smooth, rnd, makeBolt, drawBolt, glowBlob } = window.BOLT;
  // [落ちる時刻(0〜1 の周回内位置), x(画面幅比), 近さ(1=手前 0=奥), 再発光するか]
  const STRIKES = [
    [0.02, 0.24, 1, 1], [0.12, 0.74, 0.15, 0], [0.21, 0.58, 0.55, 1], [0.33, 0.13, 0.2, 0],
    [0.41, 0.80, 1, 1], [0.52, 0.36, 0.1, 1], [0.60, 0.44, 0.75, 0], [0.71, 0.88, 0.3, 1],
    [0.80, 0.18, 0.6, 1], [0.89, 0.64, 0.05, 0],
  ];
  let cache = null;
  function build(W, H, seed) {
    const key = W + 'x' + H + ':' + seed;
    if (cache && cache.key === key) return cache;
    const list = STRIKES.map(([p, x, z, re], i) => {
      const R = k => rnd(i, k, seed);
      const x0 = W * (x + (R(1) - 0.5) * 0.12), x1 = W * (x + (R(2) - 0.5) * 0.22);
      const y1 = H * (z > 0.5 ? 1.08 : 0.62 + 0.38 * z + 0.08 * R(3));
      const b = makeBolt(seed * 100 + i, x0, -H * 0.05, x1, y1, { branches: z > 0.5 ? 6 : 4, sub: z > 0.5 ? 2 : 1, steps: z > 0.5 ? 16 : 12, blen: 0.9 + 0.4 * R(4) });
      return { p, x, z, re, b, x1, y1, mx: (x0 + x1) / 2 };
    });
    cache = { key, list };
    return cache;
  }

  window.FX = {
    draw(ctx, W, H, t, opt = {}) {
      const L = opt.loop || 5, seed = opt.seed || 3, s = H / 720;
      const { list } = build(W, H, seed);
      const items = [];
      for (const k of list) {
        const d = ((t - k.p * L) % L + L) % L;          // 落ちてからの経過（周回をまたいでつながる）
        const lead = 0.06 + 0.05 * (1 - k.z);
        if (d > lead + 0.62) continue;
        items.push([k, d, lead]);
      }
      items.sort((a, b) => a[0].z - b[0].z);              // 奥から描く
      for (const [k, d, lead] of items) {
        const z = k.z, bw = (1.6 + 3.6 * z) * s;
        const dimm = 0.55 + 0.45 * z;
        const glow = [Math.round(130 - 20 * z), Math.round(90 + 10 * z), 255];
        if (d < lead) {
          // 先駆け放電：上から一気に伸びる
          const u = d / lead;
          drawBolt(ctx, W, H, k.b, k.b.total * (1 - Math.pow(1 - u, 2)), 0.65 * dimm, bw * 0.8, { glow, glowA: 0.8 });
          continue;
        }
        const e = d - lead;
        let I = 1.5 * Math.exp(-e / 0.11);
        if (k.re) I += 0.9 * (e < 0.13 ? clamp(1 - (0.13 - e) / 0.03) ** 2 : Math.exp(-(e - 0.13) / 0.06));
        I += 0.35 * (1 - smooth(clamp(e / 0.55)));
        I *= dimm;
        const cool = smooth(clamp((e - 0.08) / 0.35));
        // 周囲がふっと明るくなる：画面全体のうすい明るみ（大きなグラデーションは減色で縞が出るので一様な明るみにする）
        const amb = clamp(I / 1.5);
        ctx.fillStyle = `rgba(190,200,255,${(0.035 + 0.11 * z) * amb})`; ctx.fillRect(0, 0, W, H);
        glowBlob(ctx, k.x1, Math.min(k.y1, H), H * (0.08 + 0.12 * z), [210, 225, 255], 0.6 * amb);
        drawBolt(ctx, W, H, k.b, Infinity, I, bw, { glow, cool, glowA: 0.9, mid: [Math.round(130 + 10 * cool), Math.round(200 - 70 * cool), 255] });
      }
    },
  };
})();
