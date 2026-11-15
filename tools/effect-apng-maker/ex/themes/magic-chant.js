// 魔法の共通部品：hash 乱数、配色、ルーン風記号（図形の組み合わせ）、魔法陣の部品表と描画、光のにじみの合成、光の粒スプライト
(function () {
  const TAU = Math.PI * 2, PI = Math.PI;
  const MG = window.MG = { TAU };
  MG.h = (a, b = 0, c = 0) => {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  MG.cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  MG.ss = (a, b, x) => { const t = MG.cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  MG.eo = x => 1 - Math.pow(1 - MG.cl(x), 3);
  MG.frac = x => x - Math.floor(x);
  // 配色：main 主色（線）、core 白のアクセント（文字・芯）、glow にじみ、deep 明るい背景用の縁どり
  MG.PAL = {
    gold: { main: '#ffcb52', core: '#fffbef', glow: '#ff9a1f', deep: '#6e3a00', mainR: [255, 203, 82], glowR: [255, 154, 31], deepR: [110, 58, 0], coreR: [255, 251, 239] },
    blue: { main: '#8fdcff', core: '#f5fdff', glow: '#3a9dff', deep: '#0a3577', mainR: [143, 220, 255], glowR: [58, 157, 255], deepR: [10, 53, 119], coreR: [245, 253, 255] },
  };
  MG.cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const cache = {};
  MG.buf = (key, w, h) => { let c = cache[key]; if (!c || c.width !== w || c.height !== h) c = cache[key] = MG.cv(w, h); return c; };
  MG.once = (key, fn) => (cache['o_' + key] || (cache['o_' + key] = fn()));

  // ---- ルーン風の記号：縦の芯＋図形2〜3個（斜線・横棒・小円・半円・くの字・点・二股）。セルは x:-0.35..0.35, y:-0.5(外側)..0.5
  MG.glyph = function (seed) {
    const r = k => MG.h(seed, k, 913);
    const L = [], C = [], A = [], D = [];
    const sx = [-0.22, 0, 0.22][Math.floor(r(1) * 3)];
    const top = r(2) < 0.25 ? -0.15 : -0.5, bot = r(3) < 0.25 ? 0.15 : 0.5;
    L.push([[sx, top], [sx, bot]]);
    const pool = ['diag', 'bar', 'circ', 'arc', 'chev', 'dot', 'fork', 'diag', 'chev'];
    const n = 2 + (r(4) < 0.45 ? 1 : 0);
    let usedC = false, usedTop = false;
    for (let k = 0; k < n; k++) {
      let ty = pool[Math.floor(r(10 + k) * pool.length)];
      if ((ty === 'circ' || ty === 'arc') && usedC) ty = 'diag';
      if (ty === 'fork' && usedTop) ty = 'bar';
      const q = j => r(20 + k * 7 + j), s = q(0) < 0.5 ? -1 : 1;
      if (ty === 'diag') { const y0 = [-0.5, -0.05, 0.4][Math.floor(q(1) * 3)]; L.push([[sx, y0], [sx + s * 0.3, y0 + (y0 > 0 ? -0.38 : 0.38)]]); }
      else if (ty === 'bar') { const y = [-0.32, 0.02, 0.32][Math.floor(q(1) * 3)]; L.push(q(2) < 0.5 ? [[sx - 0.28, y], [sx + 0.28, y]] : [[sx, y], [sx + s * 0.3, y]]); }
      else if (ty === 'circ') { usedC = true; C.push([sx + (q(2) < 0.5 ? 0 : s * 0.2), q(1) < 0.5 ? -0.3 : 0.28, 0.13]); }
      else if (ty === 'arc') { usedC = true; const y = q(1) < 0.5 ? -0.25 : 0.22; A.push([sx, y, 0.2, s > 0 ? -PI / 2 : PI / 2, s > 0 ? PI / 2 : PI * 1.5]); }
      else if (ty === 'chev') { const y = [-0.25, 0.05, 0.3][Math.floor(q(1) * 3)]; L.push([[sx, y - 0.2], [sx + s * 0.27, y], [sx, y + 0.2]]); }
      else if (ty === 'dot') { D.push([sx + s * 0.24, [-0.36, 0, 0.36][Math.floor(q(1) * 3)]]); }
      else if (ty === 'fork') { usedTop = true; L.push([[sx - 0.26, -0.5], [sx, -0.18], [sx + 0.26, -0.5]]); }
    }
    return { L, C, A, D };
  };
  // 記号1つを今の座標系（セルの高さ s）でパスに足す。点は dots に集める
  MG.glyphPath = function (x, g, s, dots) {
    for (const p of g.L) { x.moveTo(p[0][0] * s, p[0][1] * s); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0] * s, p[i][1] * s); }
    for (const c of g.C) { x.moveTo((c[0] + c[2]) * s, c[1] * s); x.arc(c[0] * s, c[1] * s, c[2] * s, 0, TAU); }
    for (const a of g.A) { x.moveTo((a[0] + a[2] * Math.cos(a[3])) * s, (a[1] + a[2] * Math.sin(a[3])) * s); x.arc(a[0] * s, a[1] * s, a[2] * s, a[3], a[4]); }
    if (dots) for (const d of g.D) dots.push([d[0] * s, d[1] * s]);
  };

  // ---- 魔法陣の部品表（半径1が外周）。g = 回転の組（0外周 +、1六芒星 -、2内の文字輪 +、3中心 -）
  // 6回対称にそろえてあるので、各組を 60°の整数倍まわすとぴったり元に戻る（ループ用）
  MG.circleParts = function (seed) {
    const E = [];
    const a0 = () => MG.h(seed, E.length, 51) * TAU;
    const C = (g, r, w, ex) => E.push(Object.assign({ k: 'circ', g, r, w, a0: a0(), cat: 'circle' }, ex || {}));
    // 外周
    C(0, 1.0, 2); C(0, 0.957, 0); C(0, 0.868, 1);
    E.push({ k: 'rune', g: 0, rm: 0.9125, h: 0.07, m: 8, rep: 6, seed: seed * 31 + 1, a0: a0(), cat: 'rune', w: 0 });
    E.push({ k: 'dots', g: 0, r: 1.045, n: 24, a0: a0(), cat: 'pattern' });
    // 目盛りと六芒星
    E.push({ k: 'ticks', g: 1, r0: 0.818, r1: 0.852, n: 72, major: 6, a0: a0(), cat: 'rune', w: 0 });
    C(1, 0.80, 0);
    E.push({ k: 'poly', g: 1, r: 0.80, n: 3, rot: -PI / 2, w: 1, cat: 'pattern' });
    E.push({ k: 'poly', g: 1, r: 0.80, n: 3, rot: PI / 2, w: 1, cat: 'pattern' });
    for (let k = 0; k < 6; k++) C(1, 0.072, 1, { ca: -PI / 2 + k * PI / 3, cr: 0.80, cat: 'pattern', fillDot: 0.022 });
    for (let k = 0; k < 6; k++) C(1, 0.058, 0, { ca: -PI / 2 + PI / 6 + k * PI / 3, cr: 0.645, cat: 'pattern', fillDot: 0.016, inner: 0.03 });
    // 内の文字輪
    C(2, 0.462, 1); C(2, 0.392, 0);
    E.push({ k: 'rune', g: 2, rm: 0.427, h: 0.05, m: 4, rep: 6, seed: seed * 31 + 7, a0: a0(), cat: 'rune', w: 0 });
    // 中心：六角形2枚（十二芒）、円、光条、小円
    E.push({ k: 'poly', g: 3, r: 0.37, n: 6, rot: 0, w: 0, cat: 'pattern' });
    E.push({ k: 'poly', g: 3, r: 0.37, n: 6, rot: PI / 6, w: 0, cat: 'pattern' });
    C(3, 0.245, 2);
    E.push({ k: 'rays', g: 3, r0: 0.105, r1: 0.225, n: 12, a0: 0, w: 0, cat: 'pattern' });
    C(3, 0.09, 1, { fillDot: 0.03 });
    for (const e of E) e.rad = e.r != null ? (e.cr || 0) + e.r : e.rm != null ? e.rm : e.r1 != null ? e.r1 : 0.3;
    return E;
  };

  // 魔法陣を描く。x は中心に移動済みの文脈、R は外周の半径(px)。rot[g] 組ごとの角度。prog(e) → 0..1（描かれた割合）
  // light: 0..1 明るさ、wm: 線の太さ倍率
  MG.drawCircle = function (x, E, R, rot, prog, pal, light = 1, wm = 1) {
    const WW = [1.15, 2.0, 3.3].map(v => v * R / 320 * wm);
    const heads = [];
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (const e of E) {
      const p = prog(e); if (p <= 0) continue;
      const th = rot[e.g] || 0;
      x.strokeStyle = pal.main; x.lineWidth = WW[e.w || 0]; x.globalAlpha = light;
      if (e.k === 'circ') {
        let cx = 0, cy = 0;
        if (e.cr) { cx = Math.cos(e.ca + th) * e.cr * R; cy = Math.sin(e.ca + th) * e.cr * R; }
        const a = e.a0 + th, b = a + p * TAU;
        x.beginPath(); if (p >= 1) x.arc(cx, cy, e.r * R, 0, TAU); else x.arc(cx, cy, e.r * R, a, b); x.stroke();
        if (e.inner && p > 0.5) { x.lineWidth = WW[0]; x.globalAlpha = light * MG.cl((p - 0.5) * 2); x.beginPath(); x.arc(cx, cy, e.inner * R, 0, TAU); x.stroke(); }
        if (e.fillDot && p > 0.6) { x.fillStyle = pal.core; x.globalAlpha = light * MG.cl((p - 0.6) * 2.5); x.beginPath(); x.arc(cx, cy, e.fillDot * R, 0, TAU); x.fill(); }
        if (p < 1) heads.push([cx + Math.cos(b) * e.r * R, cy + Math.sin(b) * e.r * R, 1]);
      } else if (e.k === 'poly') {
        const V = []; for (let i = 0; i < e.n; i++) { const a = e.rot + th + i * TAU / e.n; V.push([Math.cos(a) * e.r * R, Math.sin(a) * e.r * R]); }
        x.beginPath();
        for (let i = 0; i < e.n; i++) {
          const A = V[i], B = V[(i + 1) % e.n], ex = A[0] + (B[0] - A[0]) * p, ey = A[1] + (B[1] - A[1]) * p;
          x.moveTo(A[0], A[1]); x.lineTo(ex, ey);
          if (p < 1) heads.push([ex, ey, 0.8]);
        }
        x.stroke();
      } else if (e.k === 'rays') {
        x.beginPath();
        for (let i = 0; i < e.n; i++) {
          const a = e.a0 + th + i * TAU / e.n, l = (i % 2 ? 0.75 : 1);
          const r1 = e.r0 + (e.r1 - e.r0) * l * p;
          x.moveTo(Math.cos(a) * e.r0 * R, Math.sin(a) * e.r0 * R); x.lineTo(Math.cos(a) * r1 * R, Math.sin(a) * r1 * R);
        }
        x.stroke();
      } else if (e.k === 'ticks') {
        const nv = p * e.n; x.beginPath();
        for (let i = 0; i < e.n && i < nv; i++) {
          const a = e.a0 + th + i * TAU / e.n, maj = i % e.major === 0;
          const r0 = maj ? e.r0 - 0.012 : e.r0 + 0.012;
          x.moveTo(Math.cos(a) * r0 * R, Math.sin(a) * r0 * R); x.lineTo(Math.cos(a) * e.r1 * R, Math.sin(a) * e.r1 * R);
        }
        x.stroke();
      } else if (e.k === 'dots') {
        const nv = p * e.n; x.fillStyle = pal.main;
        for (let i = 0; i < e.n && i < nv; i++) {
          const a = e.a0 + th + i * TAU / e.n, big = i % 2 === 0, s = (big ? 0.016 : 0.009) * R;
          x.globalAlpha = light * MG.cl(nv - i);
          const px = Math.cos(a) * e.r * R, py = Math.sin(a) * e.r * R;
          x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.moveTo(-s * 1.6, 0); x.lineTo(0, -s); x.lineTo(s * 1.6, 0); x.lineTo(0, s); x.closePath(); x.fill(); x.restore();
        }
      } else if (e.k === 'rune') {
        const N = e.m * e.rep, nv = p * N, s = e.h * R, dots = [], base = x.getTransform();
        if (!e.G) { e.G = []; for (let j = 0; j < e.m; j++) e.G.push(MG.glyph(e.seed * 100 + j)); }
        x.strokeStyle = pal.core; x.fillStyle = pal.core; x.lineWidth = WW[0] * 1.05;
        // 全部見えている記号はまとめて1本のパスに、出始めの記号は個別に薄く
        const full = Math.floor(nv);
        x.globalAlpha = light; x.beginPath();
        for (let j = 0; j < N && j < full; j++) {
          const a = e.a0 + th + j * TAU / N, ca = Math.cos(a), sa = Math.sin(a);
          x.setTransform(base);
          x.transform(-sa, ca, -ca, -sa, ca * e.rm * R, sa * e.rm * R);
          MG.glyphPath(x, e.G[j % e.m], s, dots);
        }
        x.setTransform(base); x.stroke();
        if (full < N) {
          const j = full, a = e.a0 + th + j * TAU / N, ca = Math.cos(a), sa = Math.sin(a), f = nv - full;
          x.globalAlpha = light * f; x.beginPath();
          x.transform(-sa, ca, -ca, -sa, ca * e.rm * R, sa * e.rm * R);
          MG.glyphPath(x, e.G[j % e.m], s, null); x.setTransform(base); x.stroke();
          if (f > 0.05) heads.push([ca * e.rm * R, sa * e.rm * R, 0.9]);
        }
        // 点（ここは回転済み座標が要るので、パス時に集めた値を同じ変換で打ち直す）
        x.globalAlpha = light; x.beginPath();
        let di = 0;
        for (let j = 0; j < N && j < full; j++) {
          const g = e.G[j % e.m]; if (!g.D.length) continue;
          const a = e.a0 + th + j * TAU / N, ca = Math.cos(a), sa = Math.sin(a);
          for (const d of g.D) {
            const lx = d[0] * s, ly = d[1] * s; // ローカル → 回転
            const X = -sa * lx + -ca * ly + ca * e.rm * R, Y = ca * lx + -sa * ly + sa * e.rm * R;
            x.moveTo(X + WW[1] * 0.8, Y); x.arc(X, Y, WW[1] * 0.8, 0, TAU); di++;
          }
        }
        if (di) x.fill();
      }
    }
    x.globalAlpha = 1;
    return heads;
  };
  // 書いている先端の白い光
  MG.drawHeads = function (x, heads, R, pal, k = 1) {
    if (!heads.length) return;
    const sp = MG.spark(pal);
    for (const h of heads) { const s = R * 0.07 * h[2] * k; x.globalAlpha = 1; x.drawImage(sp, h[0] - s, h[1] - s, s * 2, s * 2); }
  };

  // 光の粒スプライト：白い芯 → 主色 → にじみ → 濃い縁（明るい背景でも形が見えるように）
  MG.spark = function (pal) {
    return MG.once('spark' + pal.main, () => {
      const c = MG.cv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      const [m, gl, d, co] = [pal.mainR, pal.glowR, pal.deepR, pal.coreR];
      g.addColorStop(0, `rgba(${co},1)`); g.addColorStop(0.1, `rgba(${co},1)`); g.addColorStop(0.2, `rgba(${m},0.85)`);
      g.addColorStop(0.42, `rgba(${gl},0.3)`); g.addColorStop(0.7, `rgba(${d},0.08)`); g.addColorStop(1, `rgba(${d},0)`);
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
    });
  };
  // ふんわりした光（芯なし）
  MG.soft = function (rgb, key) {
    return MG.once('soft' + key + rgb, () => {
      const c = MG.cv(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (let i = 0; i <= 10; i++) { const u = i / 10; g.addColorStop(u, `rgba(${rgb},${(Math.exp(-u * u * 4.5) - Math.exp(-4.5)) / (1 - Math.exp(-4.5))})`); }
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); return c;
    });
  };

  // 線の層 layer を、にじみ（広い・狭い）と濃い縁つきで ctx に重ねる。dw×dh へ伸縮（床の楕円はここで潰す）
  MG.compose = function (ctx, layer, dx, dy, dw, dh, pal, R, glow = 1) {
    if (MG.NOGLOW) { ctx.drawImage(layer, dx, dy, dw, dh); return; }
    const sw = layer.width >> 1, sh = layer.height >> 1;
    const b1 = MG.buf('b1', sw, sh), x1 = b1.getContext('2d');
    const b2 = MG.buf('b2', sw, sh), x2 = b2.getContext('2d');
    const tint = (x, col) => { x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, sw, sh); x.globalCompositeOperation = 'source-over'; };
    x1.clearRect(0, 0, sw, sh); x1.filter = `blur(${(R * 0.03).toFixed(1)}px)`; x1.drawImage(layer, 0, 0, sw, sh); x1.drawImage(layer, 0, 0, sw, sh); x1.filter = 'none'; tint(x1, pal.glow);
    x2.clearRect(0, 0, sw, sh); x2.filter = `blur(${(R * 0.0035 + 0.5).toFixed(1)}px)`; x2.drawImage(layer, 0, 0, sw, sh); x2.drawImage(layer, 0, 0, sw, sh); x2.drawImage(layer, 0, 0, sw, sh); x2.filter = 'none'; tint(x2, pal.deep);
    ctx.save();
    ctx.globalAlpha = 0.8; ctx.drawImage(b2, dx, dy, dw, dh);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, 0.75 * glow); ctx.drawImage(b1, dx, dy, dw, dh);
    if (glow > 1.33) { ctx.globalAlpha = Math.min(1, (glow - 1.33)); ctx.drawImage(b1, dx, dy, dw, dh); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(layer, dx, dy, dw, dh);
    ctx.restore();
  };

  // 回転：組ごとの向きと倍率（60°×倍率 を周期 L 秒で）
  MG.ROT = [1, -1, 1, -2];
  MG.rotAt = (u, L) => MG.ROT.map(k => k * (PI / 3) * u / L); // u = 回った時間（秒）
})();
// 魔法_詠唱の光：画面の周囲から光の粒が渦を巻いて中央へ集まり、集まった所が明るく脈打つ（ずっとループ）
// opt.pal = 'blue' | 'gold'（既定 blue）、opt.loop = 周期（秒、既定4）、opt.cx / opt.cy = 集まる点（画面比、既定0.5）、opt.np = 粒の数
(function () {
  const { cl, ss, h, TAU, frac } = MG;
  window.FX = {
    draw(ctx, W, H, t, opt = {}) {
      const pal = MG.PAL[opt.pal || 'blue'], L = opt.loop || 4, k = H / 720;
      const cx = W * (opt.cx || 0.5), cy = H * (opt.cy || 0.5);
      const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
      const sp = MG.spark(pal), so = MG.soft(pal.glowR, 'g'), sc = MG.soft(pal.coreR, 'c');
      // 脈：1秒ごと（L の整数分の1）に、ふくらんでゆっくり引く
      const P = L / 4, q = frac(t / P), beat = Math.exp(-q * 4.5) * (1 - Math.exp(-q * 60));
      const N = opt.np || 170;
      const pos = (i, ph) => {
        const r0 = far * (0.55 + 0.5 * h(i, 3)), u = Math.pow(1 - ph, 1.35);
        const th = h(i, 4) * TAU + 1.7 * Math.PI * (1 - u) * (0.8 + 0.4 * h(i, 5));
        const r = r0 * u + 6 * k;
        return [cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.8, r];
      };
      ctx.save();
      ctx.lineCap = 'round';
      // 尾（流れの筋）
      for (let i = 0; i < N; i++) {
        const m = h(i, 1) < 0.4 ? 2 : 1, per = L / m, ph = frac(t / per + h(i, 2));
        const al = ss(0, 0.18, ph) * (1 - ss(0.86, 0.98, ph));
        if (al < 0.02) continue;
        const tl = 0.022 + 0.03 * h(i, 6);
        ctx.beginPath();
        for (let s = 0; s <= 5; s++) { const p = pos(i, Math.max(0, ph - tl * s / 5)); s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.strokeStyle = pal.main; ctx.globalAlpha = al * 0.4; ctx.lineWidth = (1.4 + 1.8 * h(i, 7)) * k; ctx.stroke();
      }
      // 粒
      for (let i = 0; i < N; i++) {
        const m = h(i, 1) < 0.4 ? 2 : 1, per = L / m, ph = frac(t / per + h(i, 2));
        const al = ss(0, 0.18, ph) * (1 - ss(0.86, 0.98, ph));
        if (al < 0.02) continue;
        const p = pos(i, ph), tw = 0.75 + 0.25 * Math.sin(ph * TAU * 4 + i);
        const sz = (8 + 16 * h(i, 8) ** 2) * k * (0.7 + 0.5 * ph);
        ctx.globalAlpha = al * tw; ctx.drawImage(sp, p[0] - sz, p[1] - sz, sz * 2, sz * 2);
      }
      // 中心の渦（細い弧が回る）
      ctx.globalAlpha = 1;
      for (let j = 0; j < 3; j++) {
        const rr = (60 + 34 * j) * k, a = (j % 2 ? -1 : 1) * TAU * t / L * (j === 1 ? 1 : 2) + j * 2.1;
        for (let s = 0; s < 3; s++) {
          ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.8, 0, a + s * TAU / 3, a + s * TAU / 3 + 1.1 - 0.25 * j);
          ctx.strokeStyle = pal.deep; ctx.globalAlpha = 0.25; ctx.lineWidth = (3.2 - 0.6 * j) * k; ctx.stroke();
          ctx.strokeStyle = pal.main; ctx.globalAlpha = 0.55 + 0.3 * beat; ctx.lineWidth = (1.8 - 0.4 * j) * k; ctx.stroke();
        }
      }
      // 脈打つ光の核
      ctx.globalCompositeOperation = 'lighter';
      const ring = q; // 脈ごとに広がる輪
      ctx.globalAlpha = 0.5 * (1 - ring) ** 2; ctx.strokeStyle = pal.main; ctx.lineWidth = 2.5 * k;
      ctx.beginPath(); ctx.ellipse(cx, cy, (40 + 170 * ring) * k, (40 + 170 * ring) * 0.8 * k, 0, 0, TAU); ctx.stroke();
      let s = (140 + 90 * beat) * k; ctx.globalAlpha = 0.5 + 0.4 * beat; ctx.drawImage(so, cx - s, cy - s, s * 2, s * 2);
      s = (60 + 45 * beat) * k; ctx.globalAlpha = 0.75 + 0.25 * beat; ctx.drawImage(so, cx - s, cy - s, s * 2, s * 2);
      s = (30 + 26 * beat) * k; ctx.globalAlpha = 1; ctx.drawImage(sc, cx - s, cy - s, s * 2, s * 2);
      ctx.globalCompositeOperation = 'source-over';
      // 明るい背景でも核の位置が分かるように、ごく薄い濃い縁
      ctx.globalAlpha = 1;
      ctx.restore();
    },
  };
})();
