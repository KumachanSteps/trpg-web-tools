// テーマ「氷」：4つの演出を1つのモジュールにまとめる。opt.fx で切り替える。
//   frost   … 画面の端から凍りつく（一回、3.6秒）
//   wall    … 氷の壁、キラキラと光る（ループ、opt.loop 秒）
//   shatter … 氷の壁が砕ける（一回、3.3秒）
//   melt    … 氷の壁が溶けていく（一回、4.6秒）
// wall / shatter / melt は同じ drawWall()・同じ形（wallShards）を使う。
// 乱数は hash ベース（同じ時刻は必ず同じ絵）。1280×720 前提の値は u = H/720 で比率にする。
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const frac = x => x - Math.floor(x);
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = rnd(ix, iy, seed), b = rnd(ix + 1, iy, seed), c = rnd(ix, iy + 1, seed), d = rnd(ix + 1, iy + 1, seed);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  }
  const fbm = (x, y, seed) => 0.5 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.1, y * 2.1, seed + 1) + 0.2 * vnoise(x * 4.3, y * 4.3, seed + 2);
  const cache = {};
  function canvas(W, H) { const c = document.createElement('canvas'); c.width = Math.max(1, W | 0); c.height = Math.max(1, H | 0); return c; }
  function layer(key, W, H) {
    const k = key + W + 'x' + H;
    if (!cache[k]) { const c = canvas(W, H); cache[k] = { c, x: c.getContext('2d') }; }
    const L = cache[k]; L.x.setTransform(1, 0, 0, 1, 0, 0); L.x.globalCompositeOperation = 'source-over'; L.x.globalAlpha = 1; L.x.filter = 'none'; L.x.clearRect(0, 0, W, H);
    return L;
  }

  // ---------- きらめき（4本の光条＋細い斜めの光条＋にじみ） ----------
  function star(ctx, x, y, s, a, tilt = 0) {
    if (a <= 0.01 || s <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    ctx.globalAlpha = clamp(a);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.25, 'rgba(200,235,255,0.45)'); g.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(245,252,255,0.95)';
    const ray = (len, wd, ang) => {
      ctx.save(); ctx.rotate(ang); ctx.beginPath();
      ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -wd, len, 0); ctx.quadraticCurveTo(0, wd, -len, 0); ctx.fill(); ctx.restore();
    };
    ray(s, s * 0.09, 0); ray(s * 0.8, s * 0.08, Math.PI / 2);
    ctx.globalAlpha = clamp(a) * 0.6;
    ray(s * 0.38, s * 0.05, Math.PI / 4); ray(s * 0.38, s * 0.05, -Math.PI / 4);
    ctx.restore();
  }

  // =====================================================================
  // 氷の壁（共通）
  // =====================================================================
  // 形はすべて画面に対する比率で作る（W, H が変わっても同じ形）
  function wallShards(W, H) {
    const k = 'shards' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720, out = [];
    const rows = [
      { n: 9, h: [0.60, 0.80], w: [0.13, 0.19], row: 0, seed: 11 },
      { n: 12, h: [0.30, 0.52], w: [0.085, 0.13], row: 1, seed: 23 },
      { n: 7, h: [0.14, 0.24], w: [0.10, 0.17], row: 2, seed: 37 }
    ];
    let id = 0;
    rows.forEach(r => {
      for (let j = 0; j < r.n; j++, id++) {
        const R = q => rnd(j, q, r.seed);
        const fx = (j + 0.5 + (R(1) - 0.5) * 0.55) / r.n;
        const x = (-0.03 + 1.06 * fx) * W;
        // 中央ほど少し高い山なり
        const prof = 0.86 + 0.2 * Math.sin(Math.PI * clamp(fx));
        const h = H * lerp(r.h[0], r.h[1], R(2)) * prof;
        const w = W * lerp(r.w[0], r.w[1], R(3)) * (r.row === 2 ? 1 : 0.95 + 0.1 * prof);
        const s = {
          id, row: r.row, x, h, w,
          lean: h * (R(4) - 0.5) * 0.36 + (fx - 0.5) * h * 0.12,
          tipOff: (R(5) - 0.5) * w * 0.25,
          s1: lerp(0.62, 0.84, R(6)), s2: lerp(0.58, 0.82, R(7)),
          a1: lerp(0.55, 0.85, R(8)), a2: lerp(0.55, 0.85, R(9)),
          rb: (R(10) - 0.35) * 0.45, cap: lerp(0.22, 0.38, R(11)),
          seed: r.seed * 1000 + j,
          cracks: [], bubbles: [], dots: []
        };
        // 内部のひび（比率座標：x は幅、y は高さに対して）
        const nc = 1 + Math.floor(R(12) * 3);
        for (let c = 0; c < nc; c++) {
          const Q = q => rnd(s.seed, c, 100 + q);
          let px = (Q(1) - 0.5) * 0.6, py = lerp(0.12, 0.7, Q(2)), a = Q(3) * TAU;
          const pts = [px, py], ns = 4 + Math.floor(Q(4) * 4);
          const step = lerp(0.04, 0.08, Q(5));
          for (let i = 0; i < ns; i++) {
            a += (Q(10 + i) - 0.5) * 1.4;
            px += Math.cos(a) * step * 1.4; py += Math.sin(a) * step;
            pts.push(px, py);
          }
          s.cracks.push(pts);
        }
        // 気泡：下の方に小さく群れる
        const nb = 5 + Math.floor(R(13) * 10);
        const bx = (R(14) - 0.5) * 0.5, by = lerp(0.08, 0.45, R(15));
        for (let b = 0; b < nb; b++) {
          const Q = q => rnd(s.seed, b, 300 + q);
          s.bubbles.push(bx + (Q(1) - 0.5) * 0.35, by + (Q(2) - 0.5) * 0.25, (1.2 + 3.6 * Q(3) * Q(3)) * u);
        }
        // 霜の粒
        for (let b = 0; b < 10; b++) { const Q = q => rnd(s.seed, b, 500 + q); s.dots.push((Q(1) - 0.5) * 0.8, Q(2) * 0.85, (0.8 + 1.2 * Q(3)) * u); }
        out.push(s);
      }
    });
    return (cache[k] = out);
  }
  function pillarShards(W, H) {
    const k = 'pillars' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720, out = [];
    // 奥：太く高い柱がすき間なく並ぶ／中：中くらい／手前：細めでまばら。どれも上端近く〜画面の外まで伸びる
    const rows = [
      { n: 7, h: [1.3, 1.6], w: [0.2, 0.26], row: 0, seed: 41 },
      { n: 8, h: [1.15, 1.5], w: [0.13, 0.19], row: 1, seed: 53 },
      { n: 6, h: [0.7, 1.45], w: [0.08, 0.14], row: 2, seed: 67 }
    ];
    let id = 0;
    rows.forEach(r => {
      for (let j = 0; j < r.n; j++, id++) {
        const R = q => rnd(j, q, r.seed);
        const fx = (j + 0.5 + (R(1) - 0.5) * (r.row === 0 ? 0.3 : 0.7)) / r.n;
        const x = (-0.04 + 1.08 * fx) * W;
        const h = H * lerp(r.h[0], r.h[1], R(2));
        const w = W * lerp(r.w[0], r.w[1], R(3));
        const s = {
          id, row: r.row, x, h, w,
          lean: h * (R(4) - 0.5) * 0.18,
          tipOff: (R(5) - 0.5) * w * 0.25,
          s1: lerp(0.84, 0.93, R(6)), s2: lerp(0.82, 0.92, R(7)),
          a1: lerp(0.86, 0.98, R(8)), a2: lerp(0.86, 0.98, R(9)),
          rb: (R(10) - 0.35) * 0.45, cap: lerp(0.22, 0.38, R(11)),
          seed: r.seed * 1000 + j,
          cracks: [], bubbles: [], dots: []
        };
        // 内部のひび（比率座標：x は幅、y は高さに対して）
        const nc = 2 + Math.floor(R(12) * 3);
        for (let c = 0; c < nc; c++) {
          const Q = q => rnd(s.seed, c, 100 + q);
          let px = (Q(1) - 0.5) * 0.6, py = lerp(0.12, 0.7, Q(2)), a = Q(3) * TAU;
          const pts = [px, py], ns = 4 + Math.floor(Q(4) * 4);
          const step = lerp(0.04, 0.08, Q(5));
          for (let i = 0; i < ns; i++) {
            a += (Q(10 + i) - 0.5) * 1.4;
            px += Math.cos(a) * step * 1.4; py += Math.sin(a) * step;
            pts.push(px, py);
          }
          s.cracks.push(pts);
        }
        // 気泡：下の方に小さく群れる
        const nb = 5 + Math.floor(R(13) * 10);
        const bx = (R(14) - 0.5) * 0.5, by = lerp(0.08, 0.45, R(15));
        for (let b = 0; b < nb; b++) {
          const Q = q => rnd(s.seed, b, 300 + q);
          s.bubbles.push(bx + (Q(1) - 0.5) * 0.35, by + (Q(2) - 0.5) * 0.25, (1.2 + 3.6 * Q(3) * Q(3)) * u);
        }
        // 霜の粒
        for (let b = 0; b < 10; b++) { const Q = q => rnd(s.seed, b, 500 + q); s.dots.push((Q(1) - 0.5) * 0.8, Q(2) * 0.85, (0.8 + 1.2 * Q(3)) * u); }
        out.push(s);
      }
    });
    return (cache[k] = out);
  }

  // 結晶1本の形。m = 溶け具合（0 = とがったまま、1 = 消える）
  function shardGeom(s, m) {
    const e = m * m * (3 - 2 * m);
    const hk = s.h * (1 - Math.pow(m, 1.35));
    const w = s.w * (1 + 0.12 * e);
    const lean = s.lean * (1 - 0.6 * e);
    const s1 = lerp(s.s1, 0.9, sstep(0, 0.6, m)), s2 = lerp(s.s2, 0.88, sstep(0, 0.6, m));
    const P = {
      BL: [-w / 2, 0],
      LS: [-w / 2 * lerp(s.a1, 0.92, e) + lean * s1, -hk * s1],
      T: [s.tipOff * (1 - e) + lean, -hk],
      RS: [w / 2 * lerp(s.a2, 0.92, e) + lean * s2, -hk * s2],
      BR: [w / 2, 0]
    };
    P.RB = [s.rb * w, 0];
    P.RC = [lerp(P.T[0], P.RB[0], s.cap), lerp(P.T[1], P.RB[1], s.cap)];
    P.r = Math.min(sstep(0, 0.5, m) * w * 0.55, hk * 0.9);
    P.hk = hk; P.w = w;
    return P;
  }
  // 輪郭の点列。溶けるにつれて辺がゆがみ、角が削れて丸くなる（m = 0 なら元の多角形のまま）
  function shardOutline(s, G, m, t, u) {
    const low = 40 * u;
    let pts = [[G.BL[0], low], G.BL, G.LS, G.T, G.RS, G.BR, [G.BR[0], low]];
    if (m <= 0) return pts;
    const amp = sstep(0, 0.5, m) * G.w * 0.06;
    const sub = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      sub.push(a);
      if (i === 0) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L;
      const n = 4;
      for (let k = 1; k < n; k++) {
        const f = k / n;
        const d = amp * (2 * vnoise(s.id * 7.3 + i * 3.1 + f * 2.2, t * 0.6, 401) - 1) * Math.sin(Math.PI * f) * 2;
        sub.push([a[0] + (b[0] - a[0]) * f + nx * d, a[1] + (b[1] - a[1]) * f + ny * d]);
      }
    }
    sub.push(pts[pts.length - 1]);
    pts = sub;
    const q = 0.25 * sstep(0, 0.3, m);
    for (let it = 0; it < 3; it++) {
      const o = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        o.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)], [lerp(a[0], b[0], 1 - q), lerp(a[1], b[1], 1 - q)]);
      }
      o.push(pts[pts.length - 1]);
      pts = o;
    }
    return pts;
  }
  const poly = (ctx, ps) => { ctx.beginPath(); ctx.moveTo(ps[0][0], ps[0][1]); for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i][0], ps[i][1]); ctx.closePath(); };

  // 壁を描く。st.melt(s) = 結晶ごとの溶け具合、st.wet = ぬれ具合（0〜1）
  function drawWall(ctx, W, H, st = {}) {
    const u = H / 720, base = H + 8 * u;
    const shards = st.shards || wallShards(W, H);
    for (const s of shards) {
      const m = st.melt ? st.melt(s) : 0;
      if (m >= 1) continue;
      const G = shardGeom(s, m);
      if (G.hk < 2 * u) continue;
      const facet = 1 - sstep(0, 0.55, m);
      const detail = 1 - sstep(0, 0.4, m);
      const fade = 1 - sstep(0.78, 1, m);
      const rowA = [0.7, 0.9, 1][s.row] * fade;
      ctx.save();
      ctx.translate(s.x, base);
      ctx.globalAlpha = rowA * (st.alpha == null ? 1 : st.alpha);
      const out = shardOutline(s, G, m, st.t || 0, u);
      poly(ctx, out);
      ctx.save();
      ctx.clip();
      // 地の色：上は白っぽく薄く、下は青く濃い
      const top = -G.hk;
      let g = ctx.createLinearGradient(0, top, 0, 0);
      g.addColorStop(0, 'rgba(140,212,255,0.22)');
      g.addColorStop(0.5, 'rgba(95,178,245,0.33)');
      g.addColorStop(1, 'rgba(55,135,220,0.5)');
      ctx.fillStyle = g; ctx.fillRect(-G.w, top - 4, G.w * 2, -top + 10);
      // 面：左（光の当たる側）は明るく、右は青く暗い。頂の小さな面はさらに明るい
      const lf = [G.BL, G.LS, G.RC, G.RB], rf = [G.RB, G.RC, G.RS, G.BR];
      const smoothL = lerp(0.5, 1, facet);
      poly(ctx, lf); ctx.fillStyle = `rgba(225,245,255,${(0.10 * smoothL).toFixed(3)})`; ctx.fill();
      poly(ctx, rf); ctx.fillStyle = `rgba(20,80,170,${(0.26 * smoothL).toFixed(3)})`; ctx.fill();
      if (facet > 0.01) {
        const cg = ctx.createLinearGradient(G.T[0], G.T[1], G.RC[0] - (G.RC[0] - G.LS[0]) * 0.3, G.RC[1]);
        cg.addColorStop(0, `rgba(250,254,255,${(0.6 * facet).toFixed(3)})`); cg.addColorStop(1, `rgba(150,220,255,${(0.16 * facet).toFixed(3)})`);
        poly(ctx, [G.LS, G.T, G.RC]); ctx.fillStyle = cg; ctx.fill();
        poly(ctx, [G.T, G.RS, G.RC]); ctx.fillStyle = `rgba(110,190,255,${(0.28 * facet).toFixed(3)})`; ctx.fill();
        // 内部の反射面：斜めに入った薄い光の板
        for (let q = 0; q < 2; q++) {
          const Q = k => rnd(s.seed, q, 600 + k);
          const y0 = -s.h * lerp(0.1, 0.6, Q(1)), sl = (Q(2) - 0.5) * 1.4, th = s.h * lerp(0.04, 0.12, Q(3));
          ctx.beginPath(); ctx.moveTo(-G.w, y0 - sl * G.w); ctx.lineTo(G.w, y0 + sl * G.w); ctx.lineTo(G.w, y0 + sl * G.w - th); ctx.lineTo(-G.w, y0 - sl * G.w - th * 0.3); ctx.closePath();
          ctx.fillStyle = `rgba(200,240,255,${(0.10 * facet).toFixed(3)})`; ctx.fill();
        }
      }
      // 縁の内側の白い帯（厚みの感じ）
      poly(ctx, out);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(170,230,255,0.10)'; ctx.lineWidth = 26 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(190,238,255,0.14)'; ctx.lineWidth = 13 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(225,248,255,0.22)'; ctx.lineWidth = 6 * u; ctx.stroke();
      // 内部のひび・気泡・霜の粒
      if (st.lineAlpha != null) ctx.globalAlpha = rowA * st.lineAlpha;
      if (detail > 0.01) {
        ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
        for (const c of s.cracks) {
          ctx.beginPath();
          for (let i = 0; i < c.length; i += 2) { const X = c[i] * G.w, Y = -c[i + 1] * s.h; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
          ctx.strokeStyle = `rgba(25,75,140,${(0.32 * detail).toFixed(3)})`; ctx.lineWidth = 2.4 * u; ctx.stroke();
          ctx.strokeStyle = `rgba(240,250,255,${(0.75 * detail).toFixed(3)})`; ctx.lineWidth = 1.1 * u; ctx.stroke();
        }
        for (let i = 0; i < s.bubbles.length; i += 3) {
          const X = s.bubbles[i] * G.w, Y = -s.bubbles[i + 1] * s.h, r = s.bubbles[i + 2];
          ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU);
          ctx.fillStyle = `rgba(200,235,255,${(0.18 * detail).toFixed(3)})`; ctx.fill();
          ctx.strokeStyle = `rgba(245,252,255,${(0.7 * detail).toFixed(3)})`; ctx.lineWidth = 0.9 * u; ctx.stroke();
          ctx.beginPath(); ctx.arc(X - r * 0.35, Y - r * 0.35, r * 0.28, 0, TAU); ctx.fillStyle = `rgba(255,255,255,${(0.85 * detail).toFixed(3)})`; ctx.fill();
        }
        ctx.fillStyle = `rgba(250,253,255,${(0.7 * detail).toFixed(3)})`;
        for (let i = 0; i < s.dots.length; i += 3) { ctx.beginPath(); ctx.arc(s.dots[i] * G.w, -s.dots[i + 1] * s.h, s.dots[i + 2], 0, TAU); ctx.fill(); }
      }
      if (facet > 0.01) {
        // 光の当たる左上の稜は太く白く、面の境は細く
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(G.LS[0], G.LS[1]); ctx.lineTo(G.T[0], G.T[1]);
        ctx.strokeStyle = `rgba(255,255,255,${(0.95 * facet).toFixed(3)})`; ctx.lineWidth = 3.4 * u; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(G.T[0], G.T[1]); ctx.lineTo(G.RB[0], G.RB[1]);
        ctx.strokeStyle = `rgba(240,250,255,${(0.55 * facet).toFixed(3)})`; ctx.lineWidth = 1.2 * u; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(G.LS[0], G.LS[1]); ctx.lineTo(G.RC[0], G.RC[1]); ctx.lineTo(G.RS[0], G.RS[1]);
        ctx.strokeStyle = `rgba(240,250,255,${(0.4 * facet).toFixed(3)})`; ctx.lineWidth = 0.9 * u; ctx.stroke();
      }
      // ぬれたつや：左寄りの縦の光の帯と、縁にそった白い照り
      const wet = (st.wet || 0) * fade;
      if (wet > 0.01) {
        const gx = lerp(G.BL[0], G.RB[0], 0.35) + (G.T[0] - G.RB[0]) * 0.1;
        g = ctx.createLinearGradient(gx - G.w * 0.14, 0, gx + G.w * 0.14, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${(0.42 * wet).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(-G.w, top, G.w * 2, -top);
        poly(ctx, out);
        ctx.strokeStyle = `rgba(255,255,255,${(0.5 * wet).toFixed(3)})`; ctx.lineWidth = 5 * u; ctx.stroke();
      }
      ctx.restore();
      // 輪郭：外に暗い青の細線（明るい背景でも形が分かる）＋白い縁
      if (st.lineAlpha != null) ctx.globalAlpha = rowA * st.lineAlpha;
      poly(ctx, out);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(15,60,125,0.62)'; ctx.lineWidth = 2.8 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(235,248,255,0.75)'; ctx.lineWidth = 1.2 * u; ctx.stroke();
      ctx.restore();
    }
    // 根元の霜：壁のある所だけ下ほど白く
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, H * 0.72, 0, H);
    g.addColorStop(0, 'rgba(230,245,255,0)'); g.addColorStop(1, `rgba(230,245,255,${(0.32 * (st.frostBase == null ? 1 : st.frostBase)).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.restore();
  }

  // 結晶の表面上の点（きらめきの位置）
  function wallPoints(W, H) {
    const k = 'wpts' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const shards = wallShards(W, H), u = H / 720, base = H + 8 * u, pts = [];
    for (let i = 0; i < 60; i++) {
      const R = q => rnd(i, q, 777);
      const s = shards[Math.floor(R(1) * shards.length)];
      const G = shardGeom(s, 0);
      const w = R(2);
      let p;
      if (w < 0.25) p = G.T;                                   // 先端
      else if (w < 0.6) { const f = R(3); p = [lerp(G.LS[0], G.T[0], f), lerp(G.LS[1], G.T[1], f)]; } // 光る稜
      else if (w < 0.8) { const f = R(3); p = [lerp(G.T[0], G.RB[0], f * 0.6), lerp(G.T[1], G.RB[1], f * 0.6)]; }
      else { const f = R(3); p = [lerp(G.LS[0], G.RS[0], f), lerp(G.LS[1], G.BL[1], R(4) * 0.5)]; }
      pts.push({ x: s.x + p[0], y: base + p[1], row: s.row, R });
    }
    return (cache[k] = pts);
  }

  // =====================================================================
  // 2. 氷の壁（ループ）
  // =====================================================================
  function fxWall(ctx, W, H, t, o) {
    const L = o.loop || 4, u = H / 720;
    const ly = layer('wall', W, H), x = ly.x;
    drawWall(x, W, H, {});
    // 光の筋：斜めの帯が左から右へゆっくりなでる（一周の 0〜75% で通り過ぎ、残りは画面の外）
    const p = frac(t / L) / 0.75;
    if (p < 1) {
      const ang = -1.05, dx = Math.cos(ang), dy = Math.sin(ang);
      const span = W + H * 1.2;
      const c = -H * 0.6 + p * (span + H * 0.6);
      // 帯の中心は 原点からの射影距離 c の所
      const nx = -dy, ny = dx; // 帯に垂直な向き
      const cx = nx * c, cy = ny * c, bw = W * 0.07;
      const g = x.createLinearGradient(cx - nx * bw, cy - ny * bw, cx + nx * bw, cy + ny * bw);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(225,245,255,0.25)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.62)'); g.addColorStop(0.65, 'rgba(225,245,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(ly.c, 0, 0);
    // キラキラ：表面のあちこちで短く瞬く（周期は loop の整数分の1）
    for (const q of wallPoints(W, H)) {
      const n = 1 + Math.floor(q.R(10) * 2);
      const ph = frac(n * t / L + q.R(11));
      const a = Math.pow(Math.max(0, Math.sin(Math.PI * clamp(ph / 0.22))), 2);
      if (a <= 0.01) continue;
      const s = (24 + 44 * q.R(12)) * u * (q.row === 0 ? 0.85 : 1);
      star(ctx, q.x, q.y, s * (0.6 + 0.4 * a), a, (q.R(13) - 0.5) * 0.3);
    }
  }

  // =====================================================================
  // 3. 氷の壁が砕ける（一回）
  // =====================================================================
  const T_IMP = 0.7, T_SH = 1.02;
  function buildShatter(W, H) {
    const k = 'shat' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720;
    const wl = canvas(W, H), wx = wl.getContext('2d');
    drawWall(wx, W, H, {});
    const A = wx.getImageData(0, 0, W, H).data;
    const I = [W * 0.5, H * 0.55];
    const NS = 17, RING = [0, 34, 85, 155, 250, 380, 540, 740, 1000, 1400];
    const ang = [], P = [], Q = [], M = [];
    const a0 = 0.3;
    for (let j = 0; j < NS; j++) ang.push(a0 + (j + (rnd(j, 1, 91) - 0.5) * 0.55) / NS * TAU);
    const node = (j, kk) => {
      const jj = (j + NS) % NS;
      if (kk === 0) return I;
      const r = RING[kk] * u * (1 + (rnd(jj, kk, 92) - 0.5) * 0.35);
      return [I[0] + Math.cos(ang[jj]) * r, I[1] + Math.sin(ang[jj]) * r];
    };
    const jag = (a, b, sd, amt) => {
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1), d = (rnd(sd, 3, 93) - 0.5) * amt * L;
      return [m[0] + nx * d, m[1] + ny * d];
    };
    for (let j = 0; j < NS; j++) { P[j] = []; Q[j] = []; M[j] = []; for (let kk = 0; kk < RING.length; kk++) P[j][kk] = node(j, kk); }
    for (let j = 0; j < NS; j++) for (let kk = 0; kk < RING.length; kk++) {
      if (kk < RING.length - 1) Q[j][kk] = jag(P[j][kk], P[j][kk + 1], j * 31 + kk, 0.22);
      M[j][kk] = kk === 0 ? I : jag(P[j][kk], P[(j + 1) % NS][kk], j * 37 + kk + 500, 0.3);
    }
    // ひび（割れ目）：放射状のものと、輪のもの。a 側から b 側へ伸びる
    const cracks = [];
    for (let j = 0; j < NS; j++) for (let kk = 0; kk < RING.length - 1; kk++) {
      cracks.push({ pts: [P[j][kk], Q[j][kk], P[j][kk + 1]], d0: RING[kk] * u, delay: 0 });
      if (kk > 0) cracks.push({ pts: [P[j][kk], M[j][kk], P[(j + 1) % NS][kk]], d0: RING[kk] * u, delay: 0.03 + 0.08 * rnd(j, kk, 94) });
    }
    // 破片：扇形のかけら。外側のものは半分を対角線で2つに割る（とがった破片）
    const polys = [];
    for (let j = 0; j < NS; j++) for (let kk = 0; kk < RING.length - 1; kk++) {
      const j1 = (j + 1) % NS;
      const a = P[j][kk], b = P[j1][kk], c = P[j1][kk + 1], d = P[j][kk + 1];
      const full = kk === 0 ? [I, Q[j1][0], c, M[j][1], d, Q[j][0]] : [a, M[j][kk], b, Q[j1][kk], c, M[j][kk + 1], d, Q[j][kk]];
      if (kk >= 2 && rnd(j, kk, 95) < 0.55) {
        polys.push([a, M[j][kk], b, Q[j1][kk], c]);
        polys.push([c, M[j][kk + 1], d, Q[j][kk], a]);
      } else polys.push(full);
    }
    const inPoly = (x, y, ps) => { let ins = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) { const [xi, yi] = ps[i], [xj, yj] = ps[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
    const frags = [];
    polys.forEach((ps, idx) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of ps) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(W, Math.ceil(x1) + 2); y1 = Math.min(H, Math.ceil(y1) + 2);
      if (x1 - x0 < 2 || y1 - y0 < 2) return;
      // 中に氷があるか（重心を求めるついでに数える）
      let cnt = 0, sx = 0, sy = 0;
      const stp = Math.max(2, Math.floor(Math.min(x1 - x0, y1 - y0) / 14));
      for (let y = y0; y < y1; y += stp) for (let x = x0; x < x1; x += stp) {
        if (A[((y | 0) * W + (x | 0)) * 4 + 3] > 25 && inPoly(x, y, ps)) { cnt++; sx += x; sy += y; }
      }
      if (cnt < 3) return;
      const fc = canvas(x1 - x0, y1 - y0), fx = fc.getContext('2d');
      fx.translate(-x0, -y0);
      fx.save(); poly(fx, ps); fx.clip(); fx.drawImage(wl, 0, 0); fx.restore();
      // 割れた面のふち：氷のある所だけ白く光る
      fx.globalCompositeOperation = 'source-atop';
      poly(fx, ps); fx.lineJoin = 'miter';
      fx.strokeStyle = 'rgba(20,65,130,0.5)'; fx.lineWidth = 3.6 * u; fx.stroke();
      fx.strokeStyle = 'rgba(250,253,255,0.95)'; fx.lineWidth = 2.6 * u; fx.stroke();
      // 白く光った版（回転して光を受けたとき用）
      const wc = canvas(x1 - x0, y1 - y0), wxx = wc.getContext('2d');
      wxx.drawImage(fc, 0, 0); wxx.globalCompositeOperation = 'source-in'; wxx.fillStyle = 'rgba(240,250,255,0.9)'; wxx.fillRect(0, 0, wc.width, wc.height);
      const cx = sx / cnt, cy = sy / cnt, dx = cx - I[0], dy = cy - I[1], dist = Math.hypot(dx, dy);
      const R = q => rnd(idx, q, 96);
      const dir = Math.atan2(dy, dx) + (R(1) - 0.5) * 0.5;
      const area = cnt * stp * stp;
      const small = clamp(1 - area / (60000 * u * u));
      const sp = (520 * Math.exp(-dist / (260 * u)) + 70 + 150 * R(2)) * u;
      frags.push({
        c: fc, wc, x0, y0, cx, cy, dist,
        vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp - (100 + 240 * R(3)) * u * Math.exp(-dist / (420 * u)),
        w: (R(4) - 0.5) * 2 * (1.5 + 6 * small), f0: R(5) * TAU, fw: (R(6) - 0.5) * 2 * (2 + 7 * small),
        delay: dist / (2400 * u), life: 1.2 + 0.6 * R(7), grow: 0.35 * Math.exp(-dist / (400 * u)) * R(8)
      });
    });
    // 小さな鋭い破片（細長い三角）
    const shards = [];
    for (let i = 0; i < 110; i++) {
      const R = q => rnd(i, q, 97);
      const a = R(1) * TAU, r0 = Math.sqrt(R(2)) * 260 * u;
      const ox = I[0] + Math.cos(a) * r0, oy = I[1] + Math.sin(a) * r0 * 0.8;
      const sp = (500 + 1100 * R(3)) * u * (1 - 0.5 * r0 / (260 * u));
      shards.push({ ox, oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (200 + 300 * R(4)) * u, len: (8 + 26 * R(5) * R(5)) * u, wd: 0.25 + 0.25 * R(6),
        rot: R(7) * TAU, w: (R(8) - 0.5) * 30, life: 0.9 + 0.9 * R(9), lum: R(10) });
    }
    // 細かい氷の粉
    const dust = [];
    for (let i = 0; i < 700; i++) {
      const R = q => rnd(i, q, 98);
      const a = R(1) * TAU, r0 = Math.pow(R(2), 0.7) * 520 * u;
      let ox = I[0] + Math.cos(a) * r0, oy = I[1] + Math.sin(a) * r0 * 0.75;
      if (oy > H) oy = H - R(9) * 60 * u;
      const sp = (60 + 520 * R(3)) * u;
      dust.push({ ox, oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * u * R(4), s: (0.8 + 1.8 * R(5) * R(5)) * u, f: 3 + 6 * R(6), ph: R(7), life: 1.0 + 1.1 * R(8), blue: R(10) < 0.35 });
    }
    return (cache[k] = { wl, I, cracks, frags, shards, dust });
  }

  function fxShatter(ctx, W, H, t) {
    const u = H / 720, S = buildShatter(W, H), I = S.I;
    const fin = sstep(0, 0.14, t);
    if (t < T_SH) {
      // 揺れ（ひびが走ると小刻みに震える）
      const sh = t > T_IMP ? 4 * u * Math.exp(-(t - T_IMP) * 5) : 0;
      const ox = sh * (rnd(Math.floor(t * 40), 1, 5) - 0.5) * 2, oy = sh * (rnd(Math.floor(t * 40), 2, 5) - 0.5) * 2;
      ctx.save(); ctx.translate(ox, oy);
      ctx.globalAlpha = fin;
      ctx.drawImage(S.wl, 0, 0);
      ctx.globalAlpha = 1;
      if (t < T_IMP) {
        // 砕ける前のきらめき（少しだけ）
        for (const q of wallPoints(W, H)) {
          const tg = 0.1 + q.R(20) * 0.5, a = Math.pow(Math.max(0, Math.sin(Math.PI * clamp((t - tg) / 0.3))), 2) * (q.R(21) < 0.35 ? 1 : 0);
          star(ctx, q.x, q.y, (16 + 24 * q.R(12)) * u * (0.6 + 0.4 * a), a);
        }
      } else {
        // ひびが一気に走る
        const ly = layer('crk', W, H), x = ly.x;
        const front = (t - T_IMP) * 2600 * u;
        x.lineCap = 'round'; x.lineJoin = 'round';
        const paths = [];
        for (const c of S.cracks) {
          const f = front - c.d0 - c.delay * 2600 * u;
          if (f <= 0) continue;
          // 折れ線を f の長さまで
          const ps = c.pts, out = [ps[0]]; let rem = f;
          for (let i = 1; i < ps.length && rem > 0; i++) {
            const l = Math.hypot(ps[i][0] - ps[i - 1][0], ps[i][1] - ps[i - 1][1]);
            if (rem >= l) { out.push(ps[i]); rem -= l; } else { const q = rem / l; out.push([lerp(ps[i - 1][0], ps[i][0], q), lerp(ps[i - 1][1], ps[i][1], q)]); rem = 0; }
          }
          paths.push(out);
        }
        const stroke = (col, lw) => { x.beginPath(); for (const p of paths) { x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); } x.strokeStyle = col; x.lineWidth = lw; x.stroke(); };
        stroke('rgba(15,55,120,0.45)', 3.8 * u);
        stroke('rgba(200,235,255,0.9)', 3.2 * u);
        stroke('rgba(255,255,255,1)', 1.4 * u);
        x.globalCompositeOperation = 'destination-in'; x.drawImage(S.wl, 0, 0);
        ctx.drawImage(ly.c, 0, 0);
        // 打点の光
        const fa = Math.exp(-(t - T_IMP) * 7);
        const g = ctx.createRadialGradient(I[0], I[1], 0, I[0], I[1], 160 * u);
        g.addColorStop(0, `rgba(255,255,255,${(0.75 * fa).toFixed(3)})`); g.addColorStop(0.3, `rgba(190,230,255,${(0.35 * fa).toFixed(3)})`); g.addColorStop(1, 'rgba(150,210,255,0)');
        ctx.fillStyle = g; ctx.fillRect(I[0] - 160 * u, I[1] - 160 * u, 320 * u, 320 * u);
        star(ctx, I[0], I[1], 90 * u * (0.5 + fa), fa, 0.2);
      }
      ctx.restore();
      return;
    }
    const tau = t - T_SH;
    // 砕けた瞬間のもや（氷の粉の雲）
    const mist = 0;
    if (mist > 0) {
      for (let i = 0; i < 9; i++) {
        const R = q => rnd(i, q, 99);
        const a = R(1) * TAU, rr = (60 + 260 * R(2)) * u * (0.4 + 0.8 * sstep(0, 1, tau * 1.4));
        const x = I[0] + Math.cos(a) * rr, y = I[1] + Math.sin(a) * rr * 0.7 + 60 * u * tau;
        const s = (120 + 160 * R(3)) * u * (0.6 + 0.6 * tau);
        const g = ctx.createRadialGradient(x, y, 0, x, y, s);
        g.addColorStop(0, `rgba(225,242,255,${(0.05 * mist).toFixed(3)})`); g.addColorStop(1, 'rgba(225,242,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
    }
    // 大きな破片
    const gr = 1700 * u;
    for (const f of S.frags) {
      const tt = Math.max(0, tau - f.delay);
      const a = 1 - sstep(f.life * 0.6, f.life, tt);
      if (a <= 0) continue;
      const x = f.cx + f.vx * tt, y = f.cy + f.vy * tt + 0.5 * gr * tt * tt;
      if (y - 400 * u > H) continue;
      const fl = Math.cos(f.f0 + f.fw * tt), sx = Math.max(0.12, Math.abs(Math.cos(f.fw * tt * 0.5)));
      const sc = 1 + f.grow * tt;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(f.w * tt); ctx.scale(sc * sx, sc);
      ctx.globalAlpha = a;
      ctx.drawImage(f.c, f.x0 - f.cx, f.y0 - f.cy);
      const gl = Math.pow(Math.abs(Math.sin(f.f0 + f.fw * tt)), 10) * (tt > 0 ? 0.75 : 0) + (tt < 0.12 ? 0.5 * (1 - tt / 0.12) * (tau > 0 ? 1 : 0) : 0);
      if (gl > 0.02) { ctx.globalAlpha = a * clamp(gl); ctx.drawImage(f.wc, f.x0 - f.cx, f.y0 - f.cy); }
      ctx.restore();
    }
    // 小さな鋭い破片
    for (const s of S.shards) {
      const a = 1 - sstep(s.life * 0.55, s.life, tau);
      if (a <= 0) continue;
      const k = Math.exp(-tau * 0.8);
      const x = s.ox + s.vx * (1 - k) / 0.8, y = s.oy + s.vy * (1 - k) / 0.8 + 0.5 * gr * tau * tau;
      if (y > H + 50 * u) continue;
      const r = s.rot + s.w * tau * 0.3, sq = Math.max(0.2, Math.abs(Math.cos(s.rot * 3 + s.w * tau * 0.4)));
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(1, sq);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(s.len, 0); ctx.lineTo(-s.len * 0.45, -s.len * s.wd); ctx.lineTo(-s.len * 0.6, s.len * s.wd * 0.6); ctx.closePath();
      const lum = Math.pow(Math.abs(Math.sin(s.rot * 3 + s.w * tau * 0.4)), 6);
      ctx.fillStyle = `rgba(${(150 + 100 * lum) | 0},${(210 + 40 * lum) | 0},255,${(0.55 + 0.35 * lum).toFixed(3)})`; ctx.fill();
      ctx.lineJoin = 'miter'; ctx.strokeStyle = 'rgba(20,65,130,0.7)'; ctx.lineWidth = 1.3 * u; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.len, 0); ctx.lineTo(-s.len * 0.45, -s.len * s.wd);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.1 * u; ctx.stroke();
      ctx.restore();
    }
    // 細かい氷の粉：きらめきながら舞って消える
    for (const d of S.dust) {
      const a = 1 - sstep(d.life * 0.5, d.life, tau);
      if (a <= 0) continue;
      const k = 1 - Math.exp(-tau * 2.2);
      const x = d.ox + d.vx * k / 2.2, y = d.oy + d.vy * k / 2.2 + 110 * u * tau * tau;
      const tw = 0.35 + 0.65 * Math.pow(Math.abs(Math.sin(TAU * (d.f * tau + d.ph))), 4);
      ctx.globalAlpha = a * tw;
      ctx.fillStyle = d.blue ? 'rgb(110,175,235)' : 'rgb(240,250,255)';
      ctx.beginPath(); ctx.arc(x, y, d.s, 0, TAU); ctx.fill();
      if (tw > 0.93 && d.s > 1.6 * u) { ctx.globalAlpha = 1; star(ctx, x, y, 14 * u, a * (tw - 0.9) * 10); }
    }
    ctx.globalAlpha = 1;
    // 砕けた瞬間の閃光
    const fl = Math.exp(-tau * 14);
    if (fl > 0.02) {
      const g = ctx.createRadialGradient(I[0], I[1], 0, I[0], I[1], 380 * u);
      g.addColorStop(0, `rgba(255,255,255,${(0.7 * fl).toFixed(3)})`); g.addColorStop(0.4, `rgba(200,235,255,${(0.25 * fl).toFixed(3)})`); g.addColorStop(1, 'rgba(160,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  // =====================================================================
  // 4. 氷の壁が溶ける（一回）
  // =====================================================================
  const M0 = 0.35, MD = 3.65;
  function meltOf(s, t) { return clamp((t - M0 - 0.35 * rnd(s.id, 1, 55)) / (s.row === 2 ? 2.9 : 3.3)); }
  function fxMelt(ctx, W, H, t) {
    const u = H / 720, base = H + 8 * u;
    const fin = sstep(0, 0.14, t);
    const kAvg = clamp((t - M0) / MD);
    const ly = layer('melt', W, H), x = ly.x;
    drawWall(x, W, H, { t, melt: s => meltOf(s, t), wet: sstep(0.0, 0.25, kAvg) * (1 - sstep(0.85, 1, kAvg)), frostBase: 1 - sstep(0, 0.3, kAvg) });
    ctx.globalAlpha = fin; ctx.drawImage(ly.c, 0, 0); ctx.globalAlpha = 1;
    // つやの照り（ぬれた表面で光が小さく光る）
    const shards = wallShards(W, H);
    const drops = [];
    for (const s of shards) {
      const m = meltOf(s, t);
      if (m <= 0.02 || m >= 0.97) continue;
      const G = shardGeom(s, m), fade = 1 - sstep(0.78, 1, m);
      // 先端近くの照り
      const tx = s.x + G.T[0] * 0.85 + G.LS[0] * 0.15, ty = base + G.T[1] + 14 * u * sstep(0, 0.4, m) + 4 * u;
      star(ctx, tx, ty, (10 + 10 * rnd(s.id, 3, 56)) * u, 0.55 * sstep(0.05, 0.3, m) * fade * (0.6 + 0.4 * Math.sin(t * 5 + s.id)));
      // しずく：面をつたって垂れる
      const nd = s.row === 2 ? 1 : 3;
      for (let d = 0; d < nd; d++) {
        const R = q => rnd(s.id * 7 + d, q, 57);
        const per = 0.7 + 0.6 * R(1);
        const tt = t - M0 - 0.2 - R(2) * per;
        if (tt < 0) continue;
        const n = Math.floor(tt / per), age = tt - n * per;
        const fxp = (R(3) - 0.5) * 0.7 + (rnd(s.id * 7 + d, n, 58) - 0.5) * 0.15;
        const y0 = -G.hk * lerp(0.55, 0.85, rnd(s.id * 7 + d, n, 59));
        const yy = y0 + 0.5 * 900 * u * age * age * (0.4 + 0.6 * R(4));
        const x0 = fxp * G.w * (1 + y0 / Math.max(G.hk, 1) * 0.4) + G.T[0] * (-y0 / Math.max(G.hk, 1));
        drops.push({ x: s.x + x0, y0: base + y0, y: Math.min(base + yy, H + 20 * u), a: fade * sstep(0.03, 0.12, m), front: s.row });
      }
    }
    // しずくと、つたった跡
    ctx.lineCap = 'round';
    for (const d of drops) {
      if (d.a <= 0.01) continue;
      const g = ctx.createLinearGradient(0, d.y0, 0, d.y);
      g.addColorStop(0, 'rgba(240,250,255,0)'); g.addColorStop(1, `rgba(240,250,255,${(0.75 * d.a).toFixed(3)})`);
      const g2 = ctx.createLinearGradient(0, d.y0, 0, d.y); g2.addColorStop(0, 'rgba(25,80,150,0)'); g2.addColorStop(1, `rgba(25,80,150,${(0.2 * d.a).toFixed(3)})`);
      ctx.beginPath(); ctx.moveTo(d.x, d.y0); ctx.lineTo(d.x, d.y);
      ctx.strokeStyle = g2; ctx.lineWidth = 3.6 * u; ctx.stroke();
      ctx.strokeStyle = g; ctx.lineWidth = 2.2 * u; ctx.stroke();
      // しずくの頭
      ctx.save(); ctx.translate(d.x, d.y); ctx.scale(1.35, 1.35); ctx.globalAlpha = d.a;
      ctx.beginPath(); ctx.moveTo(0, -9 * u); ctx.quadraticCurveTo(4.6 * u, 1 * u, 0, 4.6 * u); ctx.quadraticCurveTo(-4.6 * u, 1 * u, 0, -9 * u);
      ctx.fillStyle = 'rgba(170,215,250,0.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(20,70,140,0.8)'; ctx.lineWidth = 1.2 * u; ctx.stroke();
      ctx.beginPath(); ctx.arc(-1.4 * u, -0.6 * u, 1.5 * u, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fill();
      ctx.restore();
    }
    // 水たまり：下の縁に薄い水の帯。壁が低くなるほど見え、最後は反射ごと消える
    const pa = fin * sstep(0.08, 0.35, kAvg) * (1 - sstep(3.85, 4.5, t));
    if (pa > 0.01) {
      const ph = (14 + 22 * sstep(0.1, 0.8, kAvg)) * u, top = H - ph;
      ctx.save();
      ctx.globalAlpha = pa;
      // 揺れる水面の上の縁
      const edge = xx => top + 3 * u * Math.sin(xx / (W * 0.07) + t * 1.7) + 2 * u * Math.sin(xx / (W * 0.031) - t * 2.3);
      ctx.beginPath(); ctx.moveTo(0, H); for (let xx = 0; xx <= W; xx += 16 * u) ctx.lineTo(xx, edge(xx)); ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, H);
      g.addColorStop(0, 'rgba(170,215,250,0.42)'); g.addColorStop(1, 'rgba(70,135,205,0.5)');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      // 反射：残っている壁を上下に反転してうっすら
      ctx.globalAlpha = pa * 0.35;
      ctx.translate(0, top * 2); ctx.scale(1, -1);
      ctx.drawImage(ly.c, 0, 0);
      ctx.restore();
      // 水面のきらめく線
      ctx.globalAlpha = pa;
      ctx.beginPath(); for (let xx = 0; xx <= W; xx += 16 * u) xx ? ctx.lineTo(xx, edge(xx)) : ctx.moveTo(xx, edge(xx));
      ctx.strokeStyle = 'rgba(20,70,140,0.45)'; ctx.lineWidth = 2.6 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(245,252,255,0.9)'; ctx.lineWidth = 1.3 * u; ctx.stroke();
      for (let i = 0; i < 14; i++) {
        const R = q => rnd(i, q, 61);
        const xx = frac(R(1) + t * 0.03 * (R(2) - 0.5)) * W, yy = top + ph * (0.3 + 0.55 * R(3)), l = (30 + 70 * R(4)) * u;
        const a = 0.5 + 0.5 * Math.sin(t * (2 + 2 * R(5)) + R(6) * TAU);
        ctx.globalAlpha = pa * a * 0.8;
        ctx.beginPath(); ctx.moveTo(xx - l / 2, yy); ctx.lineTo(xx + l / 2, yy); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4 * u; ctx.stroke();
      }
      // しずくが落ちたところの波紋
      ctx.globalAlpha = pa;
      for (const d of drops) {
        if (d.y < top) continue;
      }
      ctx.restore();
    }
  }

  // =====================================================================
  // 1. 画面の端から凍りつく（一回）
  // =====================================================================
  const FR_END = 2.9;
  // big = 大きい版（霜を大きく描き、中央近くまで覆う）
  function buildFrost(W, H, big) {
    const k = 'frost' + W + 'x' + H + (big ? 'big' : '');
    if (cache[k]) return cache[k];
    const u = H / 720, S = big ? 1.8 : 1;
    const dends = [];
    // 四辺に種を並べる。角に近いほど長く大きいシダになる
    const edges = [
      { x: 0, y: 0, dx: 1, dy: 0, len: W, nx: 0, ny: 1 },
      { x: W, y: H, dx: -1, dy: 0, len: W, nx: 0, ny: -1 },
      { x: 0, y: H, dx: 0, dy: -1, len: H, nx: 1, ny: 0 },
      { x: W, y: 0, dx: 0, dy: 1, len: H, nx: -1, ny: 0 }
    ];
    let id = 0;
    edges.forEach((e, ei) => {
      const sp = (big ? 85 : 30) * u;
      const n = Math.floor(e.len / sp);
      for (let i = 0; i <= n; i++, id++) {
        const R = q => rnd(id, q, 71);
        const s = clamp((i + (R(1) - 0.5) * 0.8) / n) * e.len;
        const dc = Math.min(s, e.len - s);
        const c = Math.exp(-dc / (H * 0.2));
        const px = e.x + e.dx * s, py = e.y + e.dy * s;
        // 角では対角線（画面の中央）の方へ向く
        let ang = Math.atan2(e.ny, e.nx);
        const toC = Math.atan2(H / 2 - py, W / 2 - px);
        let da = toC - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        ang += da * 0.5 * c + (R(2) - 0.5) * (big ? 0.9 : 1.2);
        const L = big ? (ei < 2 ? 0.42 * H : 0.4 * W) * (0.55 + 0.55 * R(3)) + 0.3 * H * c * (0.6 + 0.4 * R(4))
          : H * (0.08 + 0.15 * R(3) * R(3) + 0.3 * c * (0.6 + 0.4 * R(4)));
        dends.push({ x: px, y: py, ang, L, seed: id, delay: big ? 0.05 + 0.35 * R(5) : 0.05 + 0.7 * R(5) * (1 - 0.7 * c), grow: big ? 2.1 + 0.5 * R(6) : 1.4 + 0.7 * R(6), big });
      }
    });
    // 角の大きなシダ（扇状に数本）
    [[0, 0], [W, 0], [0, H], [W, H]].forEach((p, ci) => {
      const toC = Math.atan2(H / 2 - p[1], W / 2 - p[0]);
      const nf = big ? 3 : 4;
      for (let i = 0; i < nf; i++, id++) {
        const R = q => rnd(id, q, 72);
        dends.push({ x: p[0], y: p[1], ang: toC + (i - (nf - 1) / 2) * 0.32 + (R(1) - 0.5) * 0.2, L: H * (big ? 0.72 + 0.2 * R(2) : 0.3 + 0.14 * R(2)), seed: id, delay: 0.02 + 0.15 * R(3), grow: 2.0 + 0.4 * R(4) + (big ? 0.3 : 0), big });
      }
    });
    // シダ状の枝：幹から 60° 前後で両側に枝が出て、枝からさらに小枝が出る
    for (const D of dends) {
      const segs = [];
      const grow = (x, y, ang, len, lvl, d0, sd, curl) => {
        const step = [5, 3, 2][lvl] * u * S;
        const bsp = [5.5, 3.8, 0][lvl] * u * S;
        let d = 0, next = bsp * (0.3 + 0.7 * rnd(sd, 1, 73)), i = 0;
        while (d < len) {
          ang += curl * step + (rnd(sd, 10 + i, 74) - 0.5) * (lvl ? 0.12 : 0.07);
          const nx = x + Math.cos(ang) * step, ny = y + Math.sin(ang) * step;
          segs.push(x, y, nx, ny, d0 + d, d0 + d + step, lvl, (d0 + d) / D.L);
          x = nx; y = ny; d += step; i++;
          if (lvl < 2 && d >= next && len - d > step * 2) {
            const rem = len - d, pr = d / len;
            const R = q => rnd(sd, q * 100 + i, 75);
            // 羽の形：根元寄りの枝が長く、先へ行くほど短い
            let bl = lvl === 0 ? Math.min(rem * 0.7, len * 0.28 * Math.pow(1 - pr, 0.55) * (0.5 + 0.7 * R(1))) : rem * 0.4 * (0.5 + 0.7 * R(1));
            if (lvl === 0 && pr < 0.1) bl *= 0.35;
            const ba = (Math.PI / 3) * (0.85 + 0.3 * R(2));
            if (bl > step * 2) {
              if (R(3) < (lvl ? 0.8 : 0.95)) grow(x, y, ang + ba, bl, lvl + 1, d0 + d, sd * 13 + i * 2 + 1, -curl * 0.5 + (R(4) - 0.5) * 0.01 / (u * S));
              if (R(5) < (lvl ? 0.8 : 0.95)) grow(x, y, ang - ba, bl * (0.75 + 0.3 * R(6)), lvl + 1, d0 + d, sd * 13 + i * 2 + 2, -curl * 0.5 + (R(7) - 0.5) * 0.01 / (u * S));
            }
            next = d + bsp * (0.7 + 0.6 * R(8));
          }
        }
      };
      grow(D.x, D.y, D.ang, D.L, 0, 0, D.seed + 1, (rnd(D.seed, 9, 72) - 0.5) * 0.007 / (u * (big ? 2.4 : 1)));
      D.segs = new Float32Array(segs);
      D.maxd = 0; for (let i = 5; i < segs.length; i += 8) D.maxd = Math.max(D.maxd, segs[i]);
    }
    // きらめく点（枝の先や分かれ目）
    // 一度に光るのは1〜2か所だけ（順番に、伸びきった所で光る）
    const glints = [];
    for (let i = 0; i < 22; i++) {
      const gt = 0.3 + i * 0.135;
      for (let tr = 0; tr < 40; tr++) {
        const R = q => rnd(i * 50 + tr, q, 81);
        const D = dends[Math.floor(R(1) * dends.length)];
        const si = Math.floor(R(2) * D.segs.length / 8) * 8;
        const dd = D.segs[si + 4];
        if (frostGrow(D, gt) < dd + 4 * u || D.segs[si + 6] > 0) continue;
        glints.push({ D, x: D.segs[si], y: D.segs[si + 1], d: dd, t: gt, s: (20 + 22 * R(4)) * u * (big ? 1.4 : 1) });
        break;
      }
    }
    // かすみ（霜の膜）用の粗い格子とノイズ
    const gw = 320, gh = Math.round(320 * H / W);
    const nz = new Float32Array(gw * gh), dist = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const px = (x + 0.5) / gw * W, py = (y + 0.5) / gh * H;
      nz[y * gw + x] = big ? 0.85 * fbm(px / (H * 0.13), py / (H * 0.13), 83) + 0.15 * vnoise(px / (H * 0.03), py / (H * 0.03), 84)
        : 0.75 * fbm(px / (H * 0.07), py / (H * 0.07), 83) + 0.25 * vnoise(px / (H * 0.012), py / (H * 0.012), 84);
      if (big) {
        // 中央を 1 とした距離（横長の画面でも上下左右から同じくらい中へ）
        const ex = Math.min(px, W - px) / (W / 2), ey = Math.min(py, H - py) / (H / 2);
        dist[y * gw + x] = Math.exp(-ex / 0.33) + Math.exp(-ey / 0.33);
      } else {
        const ex = Math.min(px, W - px) / H, ey = Math.min(py, H - py) / H;
        dist[y * gw + x] = Math.exp(-ex / 0.075) + Math.exp(-ey / 0.075);
      }
    }
    const hz = canvas(gw, gh);
    return (cache[k] = { dends, glints, gw, gh, nz, dist, hz, hx: hz.getContext('2d'), img: hz.getContext('2d').createImageData(gw, gh) });
  }
  // 枝の伸びた長さ：パキパキと段をつけて伸びる
  const BEATS = [];
  for (let b = 0.05, k = 0; b < FR_END; k++) { BEATS.push(b); b += 0.1 + 0.1 * rnd(k, 1, 85); }
  BEATS.push(FR_END);
  function beatOf(t) { let r = -1; for (const b of BEATS) { if (b <= t + 1e-6) r = b; else break; } return r; }
  function frostGrow(D, t) {
    // 全体がそろって拍ごとにパキッと伸びる（拍の間は止まっている）
    const tau = beatOf(t) - D.delay;
    if (tau <= 0) return 0;
    const p = Math.min(1, tau / D.grow);
    return D.maxd * (1 - Math.pow(1 - p, D.big ? 1.25 : 1.6));
  }
  function fxFrost(ctx, W, H, t, o = {}) {
    const big = !!o.big, u = H / 720, F = buildFrost(W, H, big), S = big ? 1.9 : 1;
    // かすみの膜：縁ほど厚く白い
    const prog = sstep(0.05, FR_END, beatOf(t));
    const thr = lerp(1.8, big ? 0.14 : 0.22, 1 - Math.pow(1 - prog, 1.4));
    const d = F.img.data;
    for (let i = 0; i < F.gw * F.gh; i++) {
      const D = F.dist[i] * (0.55 + 0.9 * F.nz[i]);
      const a = sstep(thr - 0.02, thr + 0.2, D) * clamp((big ? 0.07 : 0.12) + 0.55 * D * D);
      const wh = clamp(D * 0.9);
      d[i * 4] = lerp(165, 238, wh); d[i * 4 + 1] = lerp(208, 247, wh); d[i * 4 + 2] = 255; d[i * 4 + 3] = a * 255 * 0.85;
    }
    F.hx.putImageData(F.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(F.hz, 0, 0, W, H);
    ctx.restore();
    // シダ状の霜の結晶。太さ3段階、内側ほど薄く
    const LW = [1.8, 1.05, 0.7].map(v => v * u * S);
    const paths = [[new Path2D(), new Path2D(), new Path2D()], [new Path2D(), new Path2D(), new Path2D()]];
    for (const D of F.dends) {
      const G = frostGrow(D, t);
      if (G <= 0) continue;
      const s = D.segs;
      for (let i = 0; i < s.length; i += 8) {
        const d1 = s[i + 4];
        if (d1 >= G) continue;
        const d2 = s[i + 5], lvl = s[i + 6];
        const q = d2 <= G ? 1 : (G - d1) / (d2 - d1);
        const band = s[i + 7] < 0.45 ? 0 : 1;
        const P = paths[band][lvl];
        P.moveTo(s[i], s[i + 1]); P.lineTo(s[i] + (s[i + 2] - s[i]) * q, s[i + 1] + (s[i + 3] - s[i + 1]) * q);
      }
    }
    ctx.lineCap = 'round';
    for (let b = 0; b < 2; b++) for (let l = 0; l < 3; l++) {
      ctx.strokeStyle = `rgba(30,90,165,${b ? 0.2 : 0.3})`; ctx.lineWidth = LW[l] + 1.6 * u * (big ? 1.4 : 1); ctx.stroke(paths[b][l]);
    }
    for (let b = 0; b < 2; b++) for (let l = 0; l < 3; l++) {
      ctx.strokeStyle = `rgba(240,250,255,${[[0.95, 0.85, 0.75], [0.7, 0.55, 0.45]][b][l] * (big ? 0.8 : 1)})`; ctx.lineWidth = LW[l]; ctx.stroke(paths[b][l]);
    }
    // ときどき結晶が光る（最後のコマには残らない）
    const endFade = 1 - sstep(3.3, 3.5, t);
    for (const g of F.glints) {
      if (frostGrow(g.D, t) < g.d) continue;
      const a = Math.pow(Math.max(0, Math.sin(Math.PI * clamp((t - g.t) / 0.3))), 2) * endFade;
      star(ctx, g.x, g.y, g.s * (0.5 + 0.5 * a), a, 0.3);
    }
  }

  // =====================================================================
  // 2. 氷の壁（画面全体を覆う一枚の分厚い氷・ループ）
  //    ※ 砕ける・溶けるは drawWall（結晶の柱）のまま。前の版の壁は fx:'wallOld'
  // =====================================================================
  function voronoiCells(W, H, sites) {
    const cells = [];
    for (let i = 0; i < sites.length; i++) {
      let ps = [[-4, -4], [W + 4, -4], [W + 4, H + 4], [-4, H + 4]];
      const a = sites[i];
      for (let j = 0; j < sites.length && ps.length; j++) {
        if (j === i) continue;
        const b = sites[j];
        const nx = b[0] - a[0], ny = b[1] - a[1], c = (b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1]) / 2;
        const out = [];
        for (let k = 0; k < ps.length; k++) {
          const p = ps[k], q = ps[(k + 1) % ps.length];
          const fp = p[0] * nx + p[1] * ny - c, fq = q[0] * nx + q[1] * ny - c;
          if (fp <= 0) out.push(p);
          if ((fp <= 0) !== (fq <= 0)) { const tt = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * tt, p[1] + (q[1] - p[1]) * tt]); }
        }
        ps = out;
      }
      if (ps.length > 2) cells.push({ ps, site: a, i });
    }
    return cells;
  }
  function buildSlab(W, H) {
    const k = 'slab' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720;
    const c = canvas(W, H), x = c.getContext('2d');
    // 厚みの濃淡：厚い所は青く濃く、薄い所は明るく。画面の縁は霜で白っぽい
    const gw = Math.ceil(W / 4), gh = Math.ceil(H / 4);
    const tc = canvas(gw, gh), tx = tc.getContext('2d'), img = tx.createImageData(gw, gh), d = img.data;
    for (let y = 0; y < gh; y++) for (let xx = 0; xx < gw; xx++) {
      const px = xx * 4 + 2, py = y * 4 + 2;
      const n = clamp((0.7 * fbm(px / (H * 0.32), py / (H * 0.32), 201) + 0.3 * fbm(px / (H * 0.09), py / (H * 0.09), 202) - 0.2) * 1.6);
      const edge = Math.min(px, W - px, py, H - py) / H;
      const rim = Math.exp(-edge / 0.05) * (0.6 + 0.6 * fbm(px / (H * 0.05), py / (H * 0.05), 203));
      let r = lerp(150, 62, n), g = lerp(208, 132, n), b = lerp(248, 210, n), a = lerp(0.44, 0.64, n);
      const rw = clamp(rim * 0.8);
      r = lerp(r, 228, rw); g = lerp(g, 244, rw); b = lerp(b, 255, rw); a = lerp(a, 0.78, rw);
      const i = (y * gw + xx) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a * 255;
    }
    tx.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(tc, 0, 0, W, H);
    // 白く濁った所（氷の中の細かい気泡の雲）
    {
      const wc = canvas(gw, gh), wx = wc.getContext('2d'), wi = wx.createImageData(gw, gh), wd = wi.data;
      for (let y = 0; y < gh; y++) for (let xx = 0; xx < gw; xx++) {
        const v = 0.8 * fbm(xx * 4 / (H * 0.3), y * 4 / (H * 0.12), 231) + 0.2 * vnoise(xx * 4 / (H * 0.03), y * 4 / (H * 0.03), 232);
        const a = sstep(0.5, 0.8, v) * 0.15;
        const i = (y * gw + xx) * 4; wd[i] = 235; wd[i + 1] = 247; wd[i + 2] = 255; wd[i + 3] = a * 255;
      }
      wx.putImageData(wi, 0, 0);
      x.drawImage(wc, 0, 0, W, H);
    }
    // 面の区切り：大きな多角形の面ごとに、少しだけ明るさの向きが違う
    const sites = [];
    const NX = 5, NY = 3;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const R = q => rnd(i, j * 10 + q, 211);
      sites.push([(i + 0.05 + 0.9 * R(1)) / NX * W, (j + 0.05 + 0.9 * R(2)) / NY * H]);
    }
    const cells = voronoiCells(W, H, sites);
    const verts = [];
    x.lineJoin = 'round';
    for (const cl of cells) {
      const R = q => rnd(cl.i, q, 212);
      const ang = R(1) * TAU, L = Math.max(W, H) * 0.5;
      const cx = cl.site[0], cy = cl.site[1];
      const g = x.createLinearGradient(cx - Math.cos(ang) * L * 0.5, cy - Math.sin(ang) * L * 0.5, cx + Math.cos(ang) * L * 0.5, cy + Math.sin(ang) * L * 0.5);
      const light = R(2) < 0.5;
      g.addColorStop(0, light ? 'rgba(235,248,255,0.13)' : 'rgba(20,70,150,0.12)');
      g.addColorStop(1, light ? 'rgba(235,248,255,0)' : 'rgba(20,70,150,0)');
      poly(x, cl.ps); x.fillStyle = g; x.fill();
      for (const p of cl.ps) if (p[0] > 8 && p[0] < W - 8 && p[1] > 8 && p[1] < H - 8) verts.push(p);
    }
    // 面の稜：暗い線の上に白い線（光る稜は太く、ほかは細く）
    for (const cl of cells) {
      const ps = cl.ps;
      for (let e = 0; e < ps.length; e++) {
        const a = ps[e], b = ps[(e + 1) % ps.length];
        if ((a[0] < 0 && b[0] < 0) || (a[0] > W && b[0] > W) || (a[1] < 0 && b[1] < 0) || (a[1] > H && b[1] > H)) continue;
        // 稜は全部は見せない（閉じた網目にならないように、一部だけ、端へ向かって消える）
        const R = rnd(Math.round(a[0] + b[0]), Math.round(a[1] + b[1]), 213);
        if (R < 0.5) continue;
        const flip = rnd(Math.round(a[0] + b[0]), Math.round(a[1] + b[1]), 214) < 0.5;
        const A = flip ? b : a, B = flip ? a : b;
        const q = 0.35 + 0.6 * rnd(Math.round(a[0]), Math.round(b[1]), 215);
        const E = [lerp(A[0], B[0], q), lerp(A[1], B[1], q)];
        const k = (R - 0.5) * 2;
        const gl = x.createLinearGradient(A[0], A[1], E[0], E[1]);
        gl.addColorStop(0, `rgba(235,248,255,${(0.25 + 0.4 * k).toFixed(3)})`); gl.addColorStop(1, 'rgba(235,248,255,0)');
        const gd = x.createLinearGradient(A[0], A[1], E[0], E[1]);
        gd.addColorStop(0, 'rgba(15,60,130,0.22)'); gd.addColorStop(1, 'rgba(15,60,130,0)');
        x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(E[0], E[1]);
        x.strokeStyle = gd; x.lineWidth = 3.2 * u; x.stroke();
        x.strokeStyle = gl; x.lineWidth = (k > 0.5 ? 1.8 : 1.1) * u; x.stroke();
      }
    }
    // 内部のひび：ジグザグに走り、ところどころ枝分かれ。斜めに見える割れ面は白く薄い板になる
    const crackPts = [];
    const crack = (sx, sy, ang, len, sd, lvl) => {
      const pts = [[sx, sy]];
      let px = sx, py = sy, dd = 0, i = 0;
      while (dd < len) {
        const st = (12 + 22 * rnd(sd, i, 214)) * u;
        ang += (rnd(sd, i, 215) - 0.5) * 0.9;
        px += Math.cos(ang) * st; py += Math.sin(ang) * st; dd += st; i++;
        pts.push([px, py]);
        if (lvl < 1 && rnd(sd, i, 216) < 0.12) crack(px, py, ang + (rnd(sd, i, 217) < 0.5 ? 1 : -1) * (0.6 + 0.5 * rnd(sd, i, 218)), len * 0.35, sd * 7 + i, lvl + 1);
      }
      // 割れ面の板
      const ox = (rnd(sd, 1, 219) - 0.5) * 40 * u, oy = (10 + 22 * rnd(sd, 2, 219)) * u;
      x.beginPath(); pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
      for (let j = pts.length - 1; j >= 0; j--) x.lineTo(pts[j][0] + ox * (lvl ? 0.4 : 1), pts[j][1] + oy * (lvl ? 0.4 : 1));
      x.closePath(); x.fillStyle = `rgba(225,245,255,${lvl ? 0.07 : 0.15})`; x.fill();
      x.beginPath(); pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]));
      x.lineJoin = 'miter'; x.lineCap = 'round';
      x.strokeStyle = 'rgba(15,55,120,0.3)'; x.lineWidth = (lvl ? 2.0 : 3.0) * u; x.stroke();
      x.strokeStyle = 'rgba(240,250,255,0.75)'; x.lineWidth = (lvl ? 0.8 : 1.3) * u; x.stroke();
      pts.forEach((p, j) => { if (j % 3 === 1) crackPts.push(p); });
    };
    for (let i = 0; i < 9; i++) {
      const R = q => rnd(i, q, 220);
      crack(R(1) * W, R(2) * H, R(3) * TAU, H * (0.25 + 0.5 * R(4)), 300 + i, 0);
    }
    // 気泡：小さな群れと、縦に並んだ列
    const bubble = (bx, by, r) => {
      x.beginPath(); x.arc(bx, by, r, 0, TAU);
      x.fillStyle = 'rgba(200,235,255,0.16)'; x.fill();
      x.strokeStyle = 'rgba(245,252,255,0.6)'; x.lineWidth = 0.9 * u; x.stroke();
      x.beginPath(); x.arc(bx - r * 0.35, by - r * 0.35, r * 0.28, 0, TAU); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fill();
    };
    for (let i = 0; i < 12; i++) {
      const R = q => rnd(i, q, 221);
      const cx = R(1) * W, cy = R(2) * H, sp = (30 + 60 * R(3)) * u, n = 8 + Math.floor(R(4) * 22);
      for (let j = 0; j < n; j++) { const Q = q => rnd(i * 100 + j, q, 222); bubble(cx + (Q(1) - 0.5) * sp * 2, cy + (Q(2) - 0.5) * sp, (1 + 4 * Q(3) * Q(3)) * u); }
    }
    for (let i = 0; i < 6; i++) {
      const R = q => rnd(i, q, 223);
      let bx = R(1) * W, by = R(2) * H;
      for (let j = 0; j < 14; j++) { bubble(bx, by, (0.8 + 1.6 * rnd(i, j, 224)) * u); by -= (6 + 8 * rnd(i, j, 225)) * u; bx += (rnd(i, j, 226) - 0.5) * 4 * u; }
    }
    // 表面の細い傷（ごく薄く）
    x.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const R = q => rnd(i, q, 227);
      const a = -0.6 + (R(1) - 0.5) * 0.8, l = (80 + 260 * R(2)) * u, sx = R(3) * W, sy = R(4) * H;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l);
      x.strokeStyle = 'rgba(240,250,255,0.12)'; x.lineWidth = 0.9 * u; x.stroke();
    }
    // 照りが通ったときに小さく光る候補（稜の角とひびの角）
    const glints = [];
    const all = verts.concat(crackPts).filter(p => p[0] > 0 && p[0] < W && p[1] > 0 && p[1] < H);
    for (let i = 0; i < 12 && all.length; i++) {
      const p = all[Math.floor(rnd(i, 1, 228) * all.length)];
      glints.push({ x: p[0], y: p[1], s: (9 + 9 * rnd(i, 2, 228)) * u, k: 0.35 + 0.35 * rnd(i, 3, 228) });
    }
    return (cache[k] = { c, glints });
  }
  function fxSlab(ctx, W, H, t, o) {
    const L = o.loop || 4, u = H / 720, S = buildSlab(W, H);
    ctx.drawImage(S.c, 0, 0);
    // 自然な反射の照り：やや斜めの淡い光の帯が、一周の 65% の間にゆっくり横切る（残りは静止）
    const p = frac(t / L) / 0.65;
    if (p >= 1) return;
    const tilt = 0.32, tn = Math.tan(tilt), bw = W * 0.11, sk = H * tn;
    const xc = lerp(-bw - sk - 4, W + bw + 4, p);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.translate(xc, H); ctx.transform(1, 0, -tn, 1, 0, 0);
    const g = ctx.createLinearGradient(-bw, 0, bw, 0);
    g.addColorStop(0, 'rgba(240,250,255,0)'); g.addColorStop(0.35, 'rgba(240,250,255,0.06)');
    g.addColorStop(0.5, 'rgba(250,253,255,0.17)'); g.addColorStop(0.65, 'rgba(240,250,255,0.06)'); g.addColorStop(1, 'rgba(240,250,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-bw, -H - 2, bw * 2, H + 4);
    ctx.restore();
    for (const q of S.glints) {
      const xb = xc + (H - q.y) * tn, dd = Math.abs(q.x - xb) / (bw * 0.6);
      if (dd >= 1) continue;
      const a = Math.pow(1 - dd, 3) * q.k;
      star(ctx, q.x, q.y, q.s * (0.6 + 0.4 * a), a, 0.2);
    }
  }

  // =====================================================================
  // 2. 氷の壁（第3版）：結晶の柱が画面の下端から上端の外まで伸び、寄り集まって壁になる（ループ）
  //    柱の描き方は drawWall と同じ（形のデータだけ pillarShards）。一枚板の版は fx:'slab'
  // =====================================================================
  function pillarGlints(W, H) {
    const k = 'pglint' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720, base = H + 8 * u, out = [];
    const ps = pillarShards(W, H);
    for (let i = 0; i < 10; i++) {
      const R = q => rnd(i, q, 241);
      const s = ps[Math.floor(R(1) * ps.length)];
      const G = shardGeom(s, 0);
      const f = R(2);
      // 光の当たる左の稜の上の点（画面の中のもの）
      const y = base + lerp(G.BL[1], G.LS[1], f), xx = s.x + lerp(G.BL[0], G.LS[0], f);
      if (y < 10 * u || y > H - 10 * u || xx < 0 || xx > W) continue;
      out.push({ x: xx, y, s: (9 + 9 * R(3)) * u, k: 0.35 + 0.35 * R(4) });
    }
    return (cache[k] = out);
  }
  function fxPillars(ctx, W, H, t, o) {
    const L = o.loop || 4, u = H / 720;
    const ly = layer('pillar', W, H), x = ly.x;
    drawWall(x, W, H, { shards: pillarShards(W, H), alpha: 0.42, lineAlpha: 0.75, frostBase: 0.7 });
    ctx.drawImage(ly.c, 0, 0);
    // 淡い照り：やや斜めの光の帯が一周の 65% の間にゆっくり横切る（残りは静止）
    const p = frac(t / L) / 0.65;
    if (p >= 1) return;
    const tilt = 0.32, tn = Math.tan(tilt), bw = W * 0.11, sk = H * tn;
    const xc = lerp(-bw - sk - 4, W + bw + 4, p);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.translate(xc, H); ctx.transform(1, 0, -tn, 1, 0, 0);
    const g = ctx.createLinearGradient(-bw, 0, bw, 0);
    g.addColorStop(0, 'rgba(240,250,255,0)'); g.addColorStop(0.35, 'rgba(240,250,255,0.05)');
    g.addColorStop(0.5, 'rgba(250,253,255,0.15)'); g.addColorStop(0.65, 'rgba(240,250,255,0.05)'); g.addColorStop(1, 'rgba(240,250,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-bw, -H - 2, bw * 2, H + 4);
    ctx.restore();
    for (const q of pillarGlints(W, H)) {
      const xb = xc + (H - q.y) * tn, dd = Math.abs(q.x - xb) / (bw * 0.6);
      if (dd >= 1) continue;
      const a = Math.pow(1 - dd, 3) * q.k;
      star(ctx, q.x, q.y, q.s * (0.6 + 0.4 * a), a, 0.2);
    }
  }

  // =====================================================================
  // 2. 氷の壁（第4版）：一つの塊の氷。上はジグザグの山、そこから大きな三角の面が下端までつながる。
  //    面ごとに「向こうが屈折してずれて見える」まだら模様を、面ごとに違う向き・位置で貼り、ゆっくりずらす。
  //    （柱の版は fx:'pillars'、一枚板は 'slab'、最初の版は 'wallOld'）
  // =====================================================================
  function buildPrism(W, H) {
    const k = 'prism' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const u = H / 720;
    // 上端のジグザグ（谷・頂・谷…）
    const NP = 5, top = [];
    for (let i = 0; i <= NP * 2; i++) {
      const R = q => rnd(i, q, 301);
      const peak = i % 2 === 1;
      const x = (-0.06 + 1.12 * (i + (R(1) - 0.5) * 0.5) / (NP * 2)) * W;
      const y = peak ? H * lerp(-0.04, 0.015, R(2)) : H * lerp(0.05, 0.09, R(2));
      top.push([x, y, peak]);
    }
    top[0][1] = H * 0.1; top[top.length - 1][1] = H * 0.09;
    // 下端の点
    const NB = 7, bot = [];
    for (let i = 0; i <= NB; i++) {
      const R = q => rnd(i, q, 302);
      bot.push([(-0.08 + 1.16 * (i + (i && i < NB ? (R(1) - 0.5) * 0.7 : 0)) / NB) * W, H + 12 * u]);
    }
    // 中ほどの点（線どうしが画面の中ほどで交わるように）
    const mid = [];
    for (let i = 0; i < 4; i++) {
      const R = q => rnd(i, q, 303);
      mid.push([((i + 0.5 + (R(1) - 0.5) * 0.6) / 4) * W, H * lerp(0.5, 0.72, R(2))]);
    }
    // 上の鎖と下の鎖を、細長い三角形でつなぐ（中ほどの点は下の鎖に混ぜる）
    const lower = bot.concat(mid).sort((a, b) => a[0] - b[0]);
    const tris = [];
    let i = 0, j = 0;
    while (i < top.length - 1 || j < lower.length - 1) {
      const ti = (i + 1) / (top.length - 1), tj = (j + 1) / (lower.length - 1);
      const adv = j >= lower.length - 1 || (i < top.length - 1 && ti + (rnd(i, j, 304) - 0.5) * 0.12 < tj);
      if (adv) { tris.push([top[i], top[i + 1], lower[j]]); i++; }
      else { tris.push([top[i], lower[j + 1], lower[j]]); j++; }
    }
    // 中ほどの点の下は、下の鎖と下端の点の間を同じやり方で三角形で埋める（同じ点どうしのつぶれた三角は捨てる）
    {
      let i2 = 0, j2 = 0;
      const area = (A, B, C) => Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]));
      while (i2 < lower.length - 1 || j2 < bot.length - 1) {
        const adv = j2 >= bot.length - 1 || (i2 < lower.length - 1 && lower[i2 + 1][0] <= bot[j2 + 1][0]);
        const tri = adv ? [lower[i2], lower[i2 + 1], bot[j2]] : [lower[i2], bot[j2 + 1], bot[j2]];
        if (adv) i2++; else j2++;
        if (area(...tri) > 1) tris.push(tri);
      }
    }
    // まだら模様（屈折して見える向こう側）：なめらかな値ノイズを中くらいの解像度で作り、色をつける
    const TW = Math.round(W * 1.5), TH = Math.round(H * 1.5), sc = 0.5;  // 画面の 1/2 の解像度で、画面の 3 倍の範囲（どの面でも端が見えないように）
    const tex = canvas(TW, TH), tx = tex.getContext('2d'), img = tx.createImageData(TW, TH), d = img.data;
    const cols = [[24, 48, 135], [58, 138, 236], [140, 206, 255], [236, 248, 255]];
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const px = x / sc / H, py = y / sc / H;  // H 単位（テクスチャは画面の 2 倍の広さ）
      // 横に伸びたにじみ
      let n = 0.65 * fbm(px * 1.4, py * 3.2, 311) + 0.35 * fbm(px * 3.2, py * 5.5, 312);
      n = clamp((n - 0.2) * 2.5);
      const f = n * 3, ci = Math.min(2, Math.floor(f)), ft = f - ci;
      const sm = ft * ft * (3 - 2 * ft);
      let r = lerp(cols[ci][0], cols[ci + 1][0], sm), g = lerp(cols[ci][1], cols[ci + 1][1], sm), b = lerp(cols[ci][2], cols[ci + 1][2], sm);
      // 影にほんの少し青緑・淡い紫
      const h = fbm(px * 2.2 + 7, py * 3.1, 313), shade = (1 - n) * 0.45;
      if (h > 0.55) { const k2 = sstep(0.55, 0.75, h) * shade; r = lerp(r, 40, k2); g = lerp(g, 150, k2); b = lerp(b, 160, k2); }
      else if (h < 0.4) { const k2 = sstep(0.4, 0.22, h) * shade; r = lerp(r, 120, k2); g = lerp(g, 110, k2); b = lerp(b, 200, k2); }
      const a = lerp(0.22, 0.82, Math.pow(n, 1.9));
      const o = (y * TW + x) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a * 255;
    }
    tx.putImageData(img, 0, 0);
    // 深い層（下ほど濃く見える厚い氷の中）：暗い紺・深い青・青緑・暗い紫のにじみと、ところどころの白いにじみ
    const deep = canvas(TW, TH), dx2 = deep.getContext('2d'), dimg = dx2.createImageData(TW, TH), dd = dimg.data;
    const dcols = [[5, 12, 40], [18, 45, 122], [50, 118, 205]];
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const px = x / sc / H, py = y / sc / H;
      const n = clamp((0.6 * fbm(px * 1.7 + 3, py * 2.6, 341) + 0.4 * fbm(px * 4.1, py * 5.2, 342) - 0.25) * 2.4);
      const f = n * 2, ci = Math.min(1, Math.floor(f)), ft = f - ci, sm = ft * ft * (3 - 2 * ft);
      let r = lerp(dcols[ci][0], dcols[ci + 1][0], sm), g = lerp(dcols[ci][1], dcols[ci + 1][1], sm), b = lerp(dcols[ci][2], dcols[ci + 1][2], sm);
      // 色味のにじみ：青緑と暗い紫
      const h = fbm(px * 1.9 + 11, py * 2.4, 343);
      const kt = sstep(0.5, 0.7, h), kv = sstep(0.36, 0.22, h);
      r = lerp(r, 14, kt * 0.8); g = lerp(g, 92, kt * 0.8); b = lerp(b, 112, kt * 0.8);
      r = lerp(r, 58, kv * 0.6); g = lerp(g, 38, kv * 0.6); b = lerp(b, 118, kv * 0.6);
      // ところどころ白いにじみ
      const w = sstep(0.62, 0.8, fbm(px * 2.3 + 5, py * 3.4, 344));
      r = lerp(r, 215, w); g = lerp(g, 236, w); b = lerp(b, 255, w);
      const a = lerp(0.78, 0.6, n) * (1 - 0.15 * w);
      const o = (y * TW + x) * 4; dd[o] = r; dd[o + 1] = g; dd[o + 2] = b; dd[o + 3] = a * 255;
    }
    dx2.putImageData(dimg, 0, 0);
    // 面ごとの見え方：模様の位置・向き・ずれる向き
    const faces = tris.map((p, fi) => {
      const R = q => rnd(fi, q, 320);
      const cx = (p[0][0] + p[1][0] + p[2][0]) / 3, cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
      return {
        p, cx, cy,
        rot: (R(1) - 0.5) * 1.4, ox: (R(2) - 0.5) * W * 0.9, oy: (R(3) - 0.5) * H * 0.9,
        zoom: 0.6 + 0.8 * R(4), dir: R(5) * TAU, ph: R(6) * TAU, amp: (14 + 16 * R(7)) * u,
        light: (R(8) - 0.5) * 2,
        rot2: (R(9) - 0.5) * 1.2, ox2: (R(10) - 0.5) * W * 0.9, oy2: (R(11) - 0.5) * H * 0.9, zoom2: 0.7 + 0.6 * R(12)
      };
    });
    const peaks = top.filter(q => q[2] && q[0] > 0 && q[0] < W);
    return (cache[k] = { top, tris, faces, tex, deep, TW, TH, sc, peaks });
  }
  // 小さな煌めき（4本の短い光条＋やわらかい芯＋ごく薄い紺の縁取り。明るい背景でも白が消えないように）
  function glint(ctx, x, y, s, a, tilt) {
    if (a <= 0.02 || s <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    // 紺のうすいにじみ（明るい背景で輪郭になる）
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.6);
    g.addColorStop(0, `rgba(15,45,125,${(0.5 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(20,60,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.fill();
    const ray = (len, wd, ang) => {
      ctx.save(); ctx.rotate(ang); ctx.beginPath();
      ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -wd, len, 0); ctx.quadraticCurveTo(0, wd, -len, 0); ctx.fill(); ctx.restore();
    };
    // 光条：少し太い水色の下地の上に白
    ctx.globalAlpha = clamp(a) * 0.85;
    ctx.fillStyle = 'rgb(45,110,220)';
    ray(s * 1.06, s * 0.34, 0); ray(s * 0.86, s * 0.32, Math.PI / 2);
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = 'rgb(250,253,255)';
    ray(s, s * 0.2, 0); ray(s * 0.8, s * 0.18, Math.PI / 2);
    // やわらかい芯
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(230,246,255,0.8)'); g.addColorStop(1, 'rgba(160,215,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // 煌めきの置き場所：上端の山並み（多め）・面の境の稜・面の中、を hash で決める
  function prismGlints(W, H, P) {
    const k = 'prismGl' + W + 'x' + H;
    if (cache[k]) return cache[k];
    const out = [], ok = (x, y) => x > W * 0.02 && x < W * 0.98 && y > H * 0.015 && y < H * 0.93;
    const add = (x, y, id, kind) => {
      const R = q => rnd(id, q, 360 + kind);
      if (!ok(x, y)) return;
      // 近すぎる所には置かない
      for (const q of out) if (Math.hypot(q.x - x, q.y - y) < W * 0.045) return;
      out.push({
        x, y, kind,
        s: (kind === 0 ? 12 : 10) + 6 * R(1) * R(1),         // 1280×720 での光条の長さ（px）
        k: R(2) < 0.55 ? 2 : 1, ph: R(3), win: 0.26 + 0.16 * R(4),
        br: 0.75 + 0.25 * R(5), tilt: (R(6) - 0.5) * 0.3
      });
    };
    // 上端の山並み
    let id = 0;
    for (let i = 0; i < P.top.length - 1 && id < 400; i++) {
      const A = P.top[i], B = P.top[i + 1];
      for (let j = 0; j < 4; j++, id++) { const f = 0.12 + 0.76 * rnd(i, j, 351); add(lerp(A[0], B[0], f), lerp(A[1], B[1], f) + 2 * H / 720, id, 0); }
    }
    // 稜（面の境）：上のほうに多め
    const seen = new Set(), edges = [];
    for (const tr of P.tris) for (let e = 0; e < 3; e++) {
      const A = tr[e], B = tr[(e + 1) % 3];
      const key = [A[0].toFixed(1), A[1].toFixed(1), B[0].toFixed(1), B[1].toFixed(1)].sort().join();
      if (!seen.has(key)) { seen.add(key); edges.push([A, B]); }
    }
    edges.forEach((ed, i) => {
      for (let j = 0; j < 5; j++, id++) {
        const f = 0.08 + 0.84 * rnd(i, j, 352), x = lerp(ed[0][0], ed[1][0], f), y = lerp(ed[0][1], ed[1][1], f);
        if (rnd(i, j, 353) < 0.4 + 0.6 * (1 - y / H)) add(x, y, id, 1);
      }
    });
    // 面の中
    P.tris.forEach((tr, i) => {
      for (let j = 0; j < 3; j++, id++) {
        let a = rnd(i, j, 354), b = rnd(i, j, 355); if (a + b > 1) { a = 1 - a; b = 1 - b; }
        add(tr[0][0] + a * (tr[1][0] - tr[0][0]) + b * (tr[2][0] - tr[0][0]), tr[0][1] + a * (tr[1][1] - tr[0][1]) + b * (tr[2][1] - tr[0][1]), id, 2);
      }
    });
    return (cache[k] = out);
  }
  function fxPrism(ctx, W, H, t, o) {
    const L = o.loop || 4, u = H / 720, P = buildPrism(W, H);
    const ly = layer('prismLayer', W, H), x = ly.x;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    const ph = TAU * t / L;
    for (const f of P.faces) {
      x.save();
      poly(x, f.p); x.clip();
      // 面ごとにずらした模様（周期 L で元に戻る）
      const s1 = Math.sin(ph + f.ph), c1 = Math.cos(ph + f.ph);
      const dx = Math.cos(f.dir) * f.amp * s1 - Math.sin(f.dir) * f.amp * 0.35 * c1;
      const dy = Math.sin(f.dir) * f.amp * s1 + Math.cos(f.dir) * f.amp * 0.35 * c1;
      x.translate(f.cx + dx, f.cy + dy); x.rotate(f.rot + 0.02 * s1); x.scale(f.zoom, f.zoom);
      // テクスチャは画面の 2 倍の広さ。面の中心にテクスチャの (ox, oy) ずらした所が来る
      x.drawImage(P.tex, -1.5 * W + f.ox * 0.5, -1.5 * H + f.oy * 0.5, W * 3, H * 3);
      x.restore();
      // 面ごとの明るさの違い
      if (Math.abs(f.light) > 0.15) {
        poly(x, f.p);
        x.fillStyle = f.light > 0 ? `rgba(235,248,255,${(0.08 * f.light).toFixed(3)})` : `rgba(15,40,100,${(-0.08 * f.light).toFixed(3)})`;
        x.fill();
      }
    }
    // 上のほうは明るく白っぽく、少し透ける
    {
      x.save();
      const tg = x.createLinearGradient(0, 0, 0, H * 0.55);
      tg.addColorStop(0, 'rgba(0,0,0,0.78)'); tg.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = tg; x.fillRect(0, 0, W, H);
      const wg = x.createLinearGradient(0, 0, 0, H * 0.5);
      wg.addColorStop(0, 'rgba(238,248,255,0.32)'); wg.addColorStop(1, 'rgba(235,247,255,0)');
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = wg; x.fillRect(0, 0, W, H * 0.5);
      x.restore();
    }
    // 下ほど深い色の層：面ごとに別の向き・位置で貼り（プリズム感を保つ）、縦のグラデーションで下ほど濃く
    {
      const dl = layer('prismDeep', W, H), y2 = dl.x;
      y2.imageSmoothingEnabled = true; y2.imageSmoothingQuality = 'high';
      for (const f of P.faces) {
        y2.save(); poly(y2, f.p); y2.clip();
        const s1 = Math.sin(ph + f.ph + 1.3), c1 = Math.cos(ph + f.ph + 1.3);
        const ddx = Math.cos(f.dir) * f.amp * s1 - Math.sin(f.dir) * f.amp * 0.35 * c1;
        const ddy = Math.sin(f.dir) * f.amp * s1 + Math.cos(f.dir) * f.amp * 0.35 * c1;
        y2.translate(f.cx + ddx, f.cy + ddy); y2.rotate(f.rot2 - 0.02 * s1); y2.scale(f.zoom2, f.zoom2);
        y2.drawImage(P.deep, -1.5 * W + f.ox2 * 0.5, -1.5 * H + f.oy2 * 0.5, W * 3, H * 3);
        y2.restore();
      }
      const mg = y2.createLinearGradient(0, H * 0.18, 0, H);
      mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(0.3, 'rgba(0,0,0,0.3)'); mg.addColorStop(0.65, 'rgba(0,0,0,0.72)'); mg.addColorStop(1, 'rgba(0,0,0,0.92)');
      y2.globalCompositeOperation = 'destination-in'; y2.fillStyle = mg; y2.fillRect(0, 0, W, H);
      x.drawImage(dl.c, 0, 0);
    }
    // 淡い照り：やや斜めの光の帯が一周の 65% の間にゆっくり横切る（氷のある所だけ）
    const p = frac(t / L) / 0.65;
    if (p < 1) {
      const tilt = 0.32, tn = Math.tan(tilt), bw = W * 0.12, sk = H * tn;
      const xc = lerp(-bw - sk - 4, W + bw + 4, p);
      x.save(); x.globalCompositeOperation = 'source-atop';
      x.translate(xc, H); x.transform(1, 0, -tn, 1, 0, 0);
      const g = x.createLinearGradient(-bw, 0, bw, 0);
      g.addColorStop(0, 'rgba(240,250,255,0)'); g.addColorStop(0.5, 'rgba(250,253,255,0.16)'); g.addColorStop(1, 'rgba(240,250,255,0)');
      x.fillStyle = g; x.fillRect(-bw, -H - 2, bw * 2, H + 4);
      x.restore();
    }
    // 稜：ごく細い暗い縁＋白〜水色の細線
    x.lineJoin = 'round'; x.lineCap = 'round';
    const edges = new Path2D();
    for (const f of P.faces) { edges.moveTo(f.p[0][0], f.p[0][1]); edges.lineTo(f.p[1][0], f.p[1][1]); edges.lineTo(f.p[2][0], f.p[2][1]); edges.closePath(); }
    x.strokeStyle = 'rgba(15,45,110,0.45)'; x.lineWidth = 2.8 * u; x.stroke(edges);
    x.strokeStyle = 'rgba(205,240,255,0.85)'; x.lineWidth = 1.3 * u; x.stroke(edges);
    // 上端の輪郭に沿った白い照りの帯
    const topPath = new Path2D();
    P.top.forEach((q, i) => i ? topPath.lineTo(q[0], q[1]) : topPath.moveTo(q[0], q[1]));
    x.save();
    x.beginPath(); P.faces.forEach(f => { x.moveTo(f.p[0][0], f.p[0][1]); x.lineTo(f.p[1][0], f.p[1][1]); x.lineTo(f.p[2][0], f.p[2][1]); x.closePath(); }); x.clip();
    x.strokeStyle = 'rgba(235,248,255,0.1)'; x.lineWidth = 34 * u; x.stroke(topPath);
    x.strokeStyle = 'rgba(240,250,255,0.14)'; x.lineWidth = 18 * u; x.stroke(topPath);
    x.strokeStyle = 'rgba(245,252,255,0.3)'; x.lineWidth = 8 * u; x.stroke(topPath);
    x.restore();
    x.strokeStyle = 'rgba(15,45,110,0.5)'; x.lineWidth = 3.2 * u; x.stroke(topPath);
    x.strokeStyle = 'rgba(250,253,255,0.95)'; x.lineWidth = 1.8 * u; x.stroke(topPath);
    // 減色したときの等高線を目立たなくする、固定の格子ディザ（毎コマ同じ模様なので差分は増えにくい）
    if (o.dither !== 0) {
      const amp = o.dither || 14;
      const im = x.getImageData(0, 0, W, H), dd = im.data;
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const i = (yy * W + xx) * 4;
        if (dd[i + 3] === 0) continue;
        const v = (B[(yy & 3) * 4 + (xx & 3)] / 15 - 0.5) * amp;
        dd[i] += v; dd[i + 1] += v; dd[i + 2] += v; if (dd[i + 3] < 250) dd[i + 3] += v * 0.5;
      }
      x.putImageData(im, 0, 0);
    }
    ctx.drawImage(ly.c, 0, 0);
    // 小さな煌めき（第6版で追加）：稜・上端の山並み・面のあちこちで、時間をずらして瞬く
    if (o.glints !== 0) {
      const G = prismGlints(W, H, P);
      for (const g of G) {
        // 周期は loop の整数分の1（L, L/2）。周期のうち win の間だけ光る
        const per = L / g.k, p = frac(t / per + g.ph);
        if (p >= g.win) continue;
        const a = Math.pow(Math.sin(Math.PI * p / g.win), 1.6) * g.br;
        glint(ctx, g.x, g.y, g.s * u * (0.6 + 0.4 * a), a, g.tilt);
      }
    }
    // 頂でごくまれに小さく光る（一周に2回）
    P.peaks.slice(0, 2).forEach((q, i) => {
      const a = Math.pow(Math.max(0, Math.sin(Math.PI * clamp((frac(t / L + i * 0.5 + 0.2) - 0) / 0.18))), 2) * 0.7;
      star(ctx, q[0], q[1], 16 * u * (0.6 + 0.4 * a), a, 0.2);
    });
  }

  window.FX = {
    draw(ctx, W, H, t, opt = {}) {
      const fx = opt.fx || 'wall';
      if (fx === 'frost') fxFrost(ctx, W, H, t, opt);
      else if (fx === 'shatter') fxShatter(ctx, W, H, t);
      else if (fx === 'melt') fxMelt(ctx, W, H, t);
      else if (fx === 'wallOld') fxWall(ctx, W, H, t, opt);
      else if (fx === 'slab') fxSlab(ctx, W, H, t, opt);
      else if (fx === 'pillars') fxPillars(ctx, W, H, t, opt);
      else fxPrism(ctx, W, H, t, opt);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  };
})();
