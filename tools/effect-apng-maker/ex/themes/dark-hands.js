// 闇：影の手（ループ）。window.FX.draw(ctx, W, H, t, opt)
// 画面の下から黒い影の手が何本も伸び、何かをつかもうとするように指をゆっくり動かし、引っ込んではまた伸びる。
// しくみ：手は「腕の背骨（うねる曲線）＋手のひら＋関節3つの指5本」を幾何で組み立て、粗い解像度の裏画面に
// 不透明の黒で塗る（重なっても濃くならない＝影がひとつにつながる）。それをぼかして半透明で重ねる。
// 外側にはごく薄い暗紫のにじみ。各手は loop 秒で一度伸びて引っ込む（位相をずらす）ので継ぎ目なし。
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

  // 伸び具合（0〜1）：a は1周の位相。伸びる→探る→引っ込む→隠れる
  function extent(a) {
    if (a < 0.32) { const u = a / 0.32; return 1 - Math.pow(1 - u, 2.2); }
    if (a < 0.68) return 1;
    if (a < 0.92) { const u = (a - 0.68) / 0.24; return 1 - u * u * (3 - 2 * u); }
    return 0;
  }

  const HANDS = [
    { x: 0.08, ph: 0.0, len: 0.58, lean: 0.22, side: 1, sz: 1.2 },
    { x: 0.3, ph: 0.52, len: 0.44, lean: 0.1, side: -1, sz: 0.85 },
    { x: 0.47, ph: 0.2, len: 0.72, lean: -0.03, side: 1, sz: 1.05 },
    { x: 0.68, ph: 0.7, len: 0.6, lean: 0.04, side: -1, sz: 0.95 },
    { x: 0.9, ph: 0.36, len: 0.66, lean: -0.22, side: -1, sz: 1.3 },
  ];

  function drawHand(g, W, H, t, L, hd, idx) {
    const R = k => rnd(idx, k, 31);
    const a = ((t / L + hd.ph) % 1 + 1) % 1;
    const e = extent(a);
    if (e <= 0.001) return;
    const S = H / 720 * hd.sz;
    // 探っている間はゆっくり上下にゆれる
    const bob = sstep(0.2, 0.4, a) * (1 - sstep(0.62, 0.8, a));
    const A = H * hd.len * e * (0.94 + 0.06 * Math.sin(TAU * (t / L * 2 + R(1))) * bob);
    const bx = W * hd.x, by = H + 30 * S;
    // 背骨：根もとから上へ、少し傾き、波がつたわるようにうねる
    const N = 18, pts = [];
    const lean = hd.lean + 0.08 * Math.sin(TAU * (t / L + R(2))) * bob;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const wave = Math.sin(TAU * (s * 0.8 - t / L + R(3))) * 12 * S * s + Math.sin(TAU * (s * 0.45 + R(4)) + 1) * 30 * S * s * (1 - e * 0.4);
      const y = by - A * s;
      const x = bx + lean * A * s * s + wave;
      pts.push([x, y]);
    }
    // 腕：先へ行くほど細い
    const w0 = 50 * S, w1 = 19 * S;
    const left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const p = pts[i], q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)];
      let tx = q[0] - r[0], ty = q[1] - r[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const s = i / N, w = (w0 + (w1 - w0) * Math.pow(s, 0.6)) * (1 + 0.16 * Math.sin(Math.PI * clamp((s - 0.45) / 0.5)));   // 前腕のふくらみ
      left.push([p[0] - ty * w * 0.5 * -1, p[1] + tx * w * 0.5 * -1]);
      right.push([p[0] + ty * w * 0.5 * -1, p[1] - tx * w * 0.5 * -1]);
    }
    g.beginPath();
    g.moveTo(left[0][0], left[0][1]);
    for (const p of left) g.lineTo(p[0], p[1]);
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath(); g.fill();
    // 手首の向き（腕の先の接線）＋手首の曲げ
    const pe = pts[N], pp = pts[N - 2];
    let dir = Math.atan2(pe[1] - pp[1], pe[0] - pp[0]);
    dir += hd.side * (0.18 + 0.12 * Math.sin(TAU * (t / L * 2 + R(5)))) * bob;
    // 指の曲がり：伸びるときは開き、探る間は波打つように握ったり開いたり、引っ込むときは握りこむ
    const openAmt = sstep(0.05, 0.3, a);
    const clench = sstep(0.66, 0.85, a);
    const sc = 1.15 * S;
    g.save();
    g.translate(pe[0], pe[1]);
    g.rotate(dir + Math.PI / 2);   // ここから上（-y）が指の方向
    // 手のひら
    // 手のひら：手首で細く、指の付け根で広い
    g.beginPath();
    g.moveTo(-11 * sc, 6 * sc);
    g.bezierCurveTo(-20 * sc, -14 * sc, -28 * sc, -34 * sc, -25 * sc, -56 * sc);
    g.quadraticCurveTo(0, -66 * sc, 25 * sc, -56 * sc);
    g.bezierCurveTo(28 * sc, -34 * sc, 20 * sc, -14 * sc, 11 * sc, 6 * sc);
    g.closePath();
    g.fill();
    g.lineCap = 'round'; g.lineJoin = 'round';
    // 指：x 位置、付け根の角度、長さの倍率
    const F = [
      { x: -18, ang: -0.2, len: 0.86 },
      { x: -6, ang: -0.06, len: 1.0 },
      { x: 6, ang: 0.06, len: 0.96 },
      { x: 17, ang: 0.2, len: 0.78 },
    ];
    const segs = [40, 28, 21];
    F.forEach((f, j) => {
      const ripple = 0.5 + 0.5 * Math.sin(TAU * (t / L * 2 - j * 0.12 + R(6)));
      const curl = clamp(0.85 * (1 - openAmt) + openAmt * (0.1 + 0.6 * ripple * bob) + clench * 0.7, 0, 1);
      const spread = (0.2 + 0.25 * (1 - curl)) * f.ang * 3.2;
      let x = f.x * sc, y = -56 * sc, ang = -Math.PI / 2 + spread;
      let wd = 13 * sc;
      for (let k = 0; k < 3; k++) {
        ang += hd.side * curl * [0.32, 0.5, 0.45][k];
        const ln = segs[k] * f.len * sc * (1 - 0.5 * curl * (k ? 1 : 0.6));
        const nx = x + Math.cos(ang) * ln, ny = y + Math.sin(ang) * ln;
        g.lineWidth = wd;
        g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        x = nx; y = ny; wd *= 0.78;
      }
    });
    // 親指：横から
    {
      const ripple = 0.5 + 0.5 * Math.sin(TAU * (t / L * 2 + 0.3 + R(7)));
      const curl = clamp(0.8 * (1 - openAmt) + openAmt * (0.2 + 0.4 * ripple * bob) + clench * 0.6);
      const sx = -hd.side * 24 * sc;
      let x = sx, y = -22 * sc, ang = -Math.PI / 2 - hd.side * (1.05 - 0.6 * curl);
      let wd = 15 * sc;
      for (let k = 0; k < 2; k++) {
        const ln = [30, 24][k] * sc;
        const nx = x + Math.cos(ang) * ln, ny = y + Math.sin(ang) * ln;
        g.lineWidth = wd;
        g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
        x = nx; y = ny; wd *= 0.8; ang += hd.side * (0.35 + 0.5 * curl);
      }
    }
    g.restore();
  }

  let buf = null;
  function draw(ctx, W, H, t, opt = {}) {
    const o = { loop: 6, res: 0.5, alpha: 0.86, blur: 3.5, ...opt };
    const L = o.loop;
    const rw = Math.ceil(W * o.res), rh = Math.ceil(H * o.res);
    if (!buf || buf.width !== rw || buf.height !== rh) buf = Object.assign(document.createElement('canvas'), { width: rw, height: rh });
    const g = buf.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, rw, rh);
    g.scale(o.res, o.res);
    g.fillStyle = g.strokeStyle = '#000';
    HANDS.forEach((hd, i) => drawHand(g, W, H, t, L, hd, i));
    // 足もとのたまった闇（手がそこから出てくる）。上の縁がゆっくりうねる
    g.beginPath();
    g.moveTo(0, H + 10);
    for (let i = 0; i <= 64; i++) {
      const x = i / 64 * W;
      const y = H - H * (0.035 + 0.018 * Math.sin(TAU * (i / 64 * 2.3 - t / L)) + 0.012 * Math.sin(TAU * (i / 64 * 5.1 + 2 * t / L) + 1));
      g.lineTo(x, y);
    }
    g.lineTo(W, H + 10); g.closePath(); g.fill();
    // 色をつける：影は黒に近い暗紫
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#08050e';
    g.fillRect(0, 0, rw, rh);
    g.globalCompositeOperation = 'source-over';
    const S = H / 720;
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // 外側のにじみ（暗い紫、ごく薄く）
    ctx.filter = `blur(${14 * S}px)`;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.filter = 'none';
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#442060';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // 本体：縁がわずかにぼけた濃い影
    ctx.filter = `blur(${o.blur * S}px)`;
    ctx.globalAlpha = o.alpha;
    ctx.drawImage(buf, 0, 0, W, H);
    ctx.restore();
  }
  window.FX = { draw };
})();
