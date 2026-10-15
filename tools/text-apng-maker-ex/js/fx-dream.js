/*
 * 文字画像APNGメーカーEX — 魔法・夢の演出の部品（光る星の流れ・虹・雲とミスト・蝶・夢の帯）
 * 判定カットイン「夢」（engine.js の drawDream）から使う。ctx はレイアウトの座標（engine が拡大率をかけてある）。
 * きらめきの十字や光の玉は fx-star.js（TextApngStarFx）を使う。どの関数も時刻を引数で受け取り、同じ時刻なら同じ絵になる。
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
  const smooth = x => x * x * (3 - 2 * x);
  const F = () => root.TextApngStarFx;

  // 虹の7色（淡いパステル。赤 → 紫）と、きらめきの色
  const RAINBOW = ['#ff9fb6', '#ffc08a', '#fff0a0', '#a6f0b4', '#9fe6ff', '#a9b6ff', '#d6a8ff'];
  const SPARK = ['#ffffff', '#ffd6f0', '#d6ccff', '#c4f5ff', '#fff0b8'];
  // 蝶の羽の色（付け根の色 → 縁の色）
  const WINGS = [['#ffb3d9', '#c9b3ff'], ['#a8f0d8', '#9fe0ff'], ['#ffe6a3', '#ffb3c9'], ['#c9b3ff', '#9fc4ff'], ['#ffc9a8', '#ffb3e0'], ['#b8f5ff', '#d6b8ff']];
  const GREY = '#6c6880';

  const desat = (c, k, grey = GREY) => F().mix(c, grey, clamp(k));

  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // やわらかい楕円の光（雲・ミストの粒）
  function puff(ctx, x, y, rx, ry, color, alpha) {
    if (alpha <= 0.004 || rx <= 0.5) return;
    const S = F();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, S.rgba(color, alpha));
    g.addColorStop(0.45, S.rgba(color, alpha * 0.6));
    g.addColorStop(1, S.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /*
   * 光る星（5つの角、ふっくら丸い）。まわりに光、白い芯、重ねた十字のきらめき。rot でゆっくり回す
   */
  function star5(ctx, x, y, r, color, alpha, rot = 0) {
    const S = F();
    if (alpha <= 0.004 || r <= 0.5) return;
    S.softDot(ctx, x, y, r * 3.0, color, 0.5 * alpha);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot - Math.PI / 2);
    const path = inner => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * inner : r;
        const a = i * Math.PI / 5;
        if (i) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(rr, 0);
      }
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    // ふっくら見せる縁（色つき）と、白い芯
    path(0.52);
    ctx.fillStyle = S.rgba(color, alpha);
    ctx.strokeStyle = S.rgba(color, alpha);
    ctx.lineWidth = r * 0.3;
    ctx.stroke(); ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, S.rgba('#ffffff', alpha));
    g.addColorStop(0.55, S.rgba(S.mix(color, '#ffffff', 0.6), alpha));
    g.addColorStop(1, S.rgba(S.mix(color, '#ffffff', 0.2), alpha));
    path(0.52);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    S.glint(ctx, x, y, r * 2.1, color, 0.75 * alpha, rot * 0.4 + 0.3);
  }

  /*
   * 左から右へ流れる光る星。o = { x0, v, t0, y(x), r, color, seed, alpha, trail, until }
   * t0 に x0 を出て速さ v（1秒あたり）で右へ進む。尾は光の粒の列と細いリボン。until（時刻）を過ぎると、頭がまたたいて薄れる
   */
  function sweepStar(ctx, o, t) {
    const S = F();
    const a = t - o.t0;
    if (a < 0) return;
    const trailT = o.trail ?? 0.4;
    const xAt = tt => o.x0 + o.v * (tt - o.t0);
    let al = (o.alpha ?? 1);
    let dying = 0;
    if (o.until != null && t > o.until) dying = clamp((t - o.until) / (o.dieT ?? 0.3));
    if (dying >= 1) return;
    const tHead = o.until != null ? Math.min(t, o.until + 0.06 * Math.min(1, dying * 4)) : t;
    const hx = xAt(tHead);
    const hy = o.y(hx);
    const N = 20;
    const color = o.color;
    // リボン（尾の太い光）
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = N; i >= 0; i--) {
        const tt = tHead - trailT * i / N;
        if (tt < o.t0) continue;
        const x = xAt(tt), y = o.y(x);
        if (i === N || tt - 1e-9 < o.t0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const x1 = xAt(tHead - trailT), gx = ctx.createLinearGradient(x1, 0, hx, 0);
      gx.addColorStop(0, S.rgba(color, 0));
      gx.addColorStop(1, S.rgba(pass ? '#ffffff' : color, (pass ? 0.8 : 0.4) * al * (1 - dying)));
      ctx.strokeStyle = gx;
      ctx.lineWidth = pass ? o.r * 0.22 : o.r * 0.75;
      ctx.stroke();
    }
    ctx.restore();
    // 光の粒（尾の中に散らす）
    const nD = 14;
    for (let i = 1; i <= nD; i++) {
      const lag = trailT * (i / nD) * (0.75 + 0.5 * rnd(o.seed, i, 3));
      const tt = tHead - lag;
      if (tt < o.t0) continue;
      const x = xAt(tt), y = o.y(x) + (rnd(o.seed, i, 4) - 0.5) * o.r * 1.6 + lag * o.r * 1.2;
      const q = lag / trailT;
      const tw = 0.6 + 0.4 * Math.sin(t * 22 + i * 1.9);
      const c = SPARK[(i + o.seed) % SPARK.length] === '#ffffff' ? color : SPARK[(i + o.seed) % SPARK.length];
      const aa = (1 - q) * tw * al * (1 - dying);
      if (i % 3 === 0) S.glint(ctx, x, y, o.r * (0.7 - 0.4 * q), c, aa, i * 0.5);
      else S.softDot(ctx, x, y, o.r * (0.34 - 0.2 * q), c, 0.9 * aa);
    }
    // 頭
    const blink = dying > 0 ? 0.55 + 0.45 * Math.sin(a * 60) : 1;
    star5(ctx, hx, hy, o.r * (1 - 0.5 * dying), color, al * (1 - dying) * blink, t * 2.2 + o.seed);
  }

  /*
   * 虹の弧。中心 (cx, topY + R)、いちばん外側の頂点が topY。p（0〜1）で左から右へ描かれていく。
   * o = { alpha, sat（0 = 虹色、1 = 灰色）, double（外にもう1本）, drip（0〜1 で滴るように下へ流れる）, seed }
   */
  function rainbow(ctx, cx, topY, R, bw, p, o = {}) {
    const S = F();
    const al = o.alpha ?? 1;
    if (al <= 0.004 || p <= 0.002) return;
    const cyA = topY + R;
    const sat = o.sat ?? 0;
    const a0 = Math.PI, a1 = Math.PI + Math.PI * clamp(p);
    const arcs = (R0, w0, cols, k) => {
      for (let i = 0; i < 7; i++) {
        const r = R0 - i * w0 - w0 / 2;
        const c = desat(cols[i], sat);
        const lg = ctx.createLinearGradient(cx - R0, 0, cx + R0, 0);
        lg.addColorStop(0, S.rgba(c, 0));
        lg.addColorStop(0.1, S.rgba(c, 0.55 * al * k));
        lg.addColorStop(0.5, S.rgba(c, 0.7 * al * k));
        lg.addColorStop(0.9, S.rgba(c, 0.55 * al * k));
        lg.addColorStop(1, S.rgba(c, 0));
        ctx.lineCap = 'butt';
        ctx.strokeStyle = lg;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = w0 * 2.3;
        ctx.beginPath(); ctx.arc(cx, cyA, r, a0, a1); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = w0 + 0.8;
        ctx.beginPath(); ctx.arc(cx, cyA, r, a0, a1); ctx.stroke();
      }
    };
    ctx.save();
    arcs(R, bw, RAINBOW, 1);
    if (o.double) arcs(R + bw * 9, bw * 0.8, RAINBOW.slice().reverse(), 0.45);
    ctx.restore();
    // 滴る色（灰色へにじむ）
    const drip = o.drip ?? 0;
    if (drip > 0.01) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const r = R - i * bw - bw / 2;
        const c = desat(RAINBOW[i], sat);
        for (let m = 0; m < 3; m++) {
          const ang = Math.PI * (0.16 + 0.68 * rnd(o.seed || 1, i * 7 + m, 5));
          if (Math.PI + ang > a1) continue;
          const x = cx + Math.cos(Math.PI + ang) * r, y = cyA + Math.sin(Math.PI + ang) * r;
          const len = drip * bw * (3 + 9 * rnd(o.seed || 1, i * 7 + m, 6));
          const g = ctx.createLinearGradient(0, y, 0, y + len);
          g.addColorStop(0, S.rgba(c, 0.5 * al));
          g.addColorStop(1, S.rgba(c, 0));
          ctx.strokeStyle = g;
          ctx.lineWidth = bw * (0.35 + 0.25 * rnd(o.seed || 1, i * 7 + m, 7));
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
        }
      }
      ctx.restore();
    }
    // 描かれていく先端のきらめき
    if (p < 0.995) {
      const rm = R - bw * 3.5;
      S.glint(ctx, cx + Math.cos(a1) * rm, cyA + Math.sin(a1) * rm, bw * 5, '#ffffff', 0.9 * al, 0.2);
    }
  }

  /*
   * 流れるミスト・雲のリボン。o = { x0, x1, y, h, n, seed, colors, alpha, speed, t0 }
   * 粒（やわらかい楕円）が横にゆっくり流れる。両端は薄れる
   */
  function mistBank(ctx, o, t) {
    const n = o.n ?? 14;
    const span = o.x1 - o.x0;
    for (let i = 0; i < n; i++) {
      const rx = o.h * (0.9 + 1.1 * rnd(o.seed, i, 3));
      const u = rnd(o.seed, i, 1);
      const x = o.x0 + (((u * span + t * (o.speed ?? 20)) % span) + span) % span;
      const y = o.y + (rnd(o.seed, i, 2) - 0.5) * o.h + Math.sin(t * 0.9 + rnd(o.seed, i, 4) * TAU) * o.h * 0.1;
      const edge = smooth(clamp(Math.min(x - o.x0, o.x1 - x) / (span * 0.18)));
      const col = o.colors[i % o.colors.length];
      puff(ctx, x, y, rx, rx * (o.flat ?? 0.42), col, (o.alpha ?? 0.4) * edge * (0.6 + 0.4 * rnd(o.seed, i, 5)));
    }
  }

  /*
   * 蝶（正面から見た、2対の羽）。羽は左右に開閉する。o = { flap（0〜1 の開き）, ang, c1, c2, alpha, glow, dim }
   * s は羽の片側の長さの目安（羽の端まで 1.05 s）
   */
  function butterfly(ctx, x, y, s, o) {
    const S = F();
    const al = o.alpha ?? 1;
    if (al <= 0.004 || s <= 0.5) return;
    const open = 0.16 + 0.84 * clamp(o.flap ?? 1);
    const c1 = o.c1, c2 = o.c2;
    ctx.save();
    ctx.translate(x, y);
    if (o.glow !== 0) {
      S.softDot(ctx, 0, 0, s * 1.9, c2, 0.3 * al * (o.glow ?? 1));
      S.softDot(ctx, 0, 0, s * 0.8, c1, 0.3 * al * (o.glow ?? 1));
    }
    ctx.rotate(o.ang || 0);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    const wingPaths = () => {
      const up = new Path2D();
      up.moveTo(0.04, -0.06);
      up.bezierCurveTo(0.28, -0.82, 1.0, -0.98, 1.06, -0.42);
      up.bezierCurveTo(1.1, -0.06, 0.62, 0.1, 0.04, 0.06);
      up.closePath();
      const lo = new Path2D();
      lo.moveTo(0.04, 0.04);
      lo.bezierCurveTo(0.6, 0.0, 1.02, 0.3, 0.8, 0.74);
      lo.bezierCurveTo(0.6, 1.02, 0.2, 0.8, 0.04, 0.3);
      lo.closePath();
      return [up, lo];
    };
    const [up, lo] = wingPaths();
    for (const side of [1, -1]) {
      ctx.save();
      ctx.scale(side * open, 1);
      const gUp = ctx.createLinearGradient(0.05, 0, 1.05, -0.5);
      gUp.addColorStop(0, S.rgba(c1, 0.95 * al));
      gUp.addColorStop(0.65, S.rgba(c2, 0.9 * al));
      gUp.addColorStop(1, S.rgba(S.mix(c2, '#ffffff', 0.55), 0.85 * al));
      ctx.fillStyle = gUp;
      ctx.fill(up);
      const gLo = ctx.createLinearGradient(0.05, 0.1, 0.8, 0.9);
      gLo.addColorStop(0, S.rgba(c1, 0.95 * al));
      gLo.addColorStop(1, S.rgba(S.mix(c2, '#ffffff', 0.4), 0.85 * al));
      ctx.fillStyle = gLo;
      ctx.fill(lo);
      // 羽の筋と斑点、縁の光
      ctx.lineWidth = 0.014;
      ctx.strokeStyle = S.rgba('#ffffff', 0.4 * al);
      ctx.beginPath();
      ctx.moveTo(0.05, -0.02); ctx.quadraticCurveTo(0.45, -0.3, 0.95, -0.5);
      ctx.moveTo(0.05, -0.01); ctx.quadraticCurveTo(0.5, -0.08, 1.03, -0.22);
      ctx.moveTo(0.05, 0.02); ctx.quadraticCurveTo(0.45, 0.2, 0.7, 0.62);
      ctx.moveTo(0.05, 0.05); ctx.quadraticCurveTo(0.5, 0.1, 0.9, 0.4);
      ctx.stroke();
      ctx.fillStyle = S.rgba('#ffffff', 0.6 * al);
      [[0.8, -0.56, 0.07], [0.88, -0.3, 0.05], [0.62, 0.52, 0.06], [0.74, 0.34, 0.04]].forEach(([px, py, pr]) => { ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill(); });
      ctx.lineWidth = 0.03;
      ctx.strokeStyle = S.rgba('#ffffff', 0.85 * al);
      ctx.stroke(up); ctx.stroke(lo);
      ctx.restore();
    }
    // 体と触角
    ctx.fillStyle = S.rgba('#fff8ff', al);
    ctx.beginPath(); ctx.ellipse(0, 0.06, 0.05, 0.34, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.32, 0.065, 0, TAU); ctx.fill();
    ctx.strokeStyle = S.rgba('#ffffff', 0.9 * al);
    ctx.lineWidth = 0.02;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.02, -0.37); ctx.quadraticCurveTo(-0.1, -0.62, -0.26, -0.74);
    ctx.moveTo(0.02, -0.37); ctx.quadraticCurveTo(0.1, -0.62, 0.26, -0.74);
    ctx.stroke();
    ctx.fillStyle = S.rgba('#ffffff', al);
    ctx.beginPath(); ctx.arc(-0.26, -0.74, 0.03, 0, TAU); ctx.arc(0.26, -0.74, 0.03, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 値ノイズ（ほどけ方のむら）
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = smooth(x - xi), fy = smooth(y - yi);
    const a = rnd(xi, yi, seed), b = rnd(xi + 1, yi, seed), c = rnd(xi, yi + 1, seed), d = rnd(xi + 1, yi + 1, seed);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /*
   * ほどけて消えていく蝶。小さな画に蝶を描き、ノイズのしきい値で画素を抜いていく（羽の端から先に粉になる）。
   * q（0〜1）がほどけ具合。scale は出力の拡大率。抜けた分は灰紫の粉になって漂う
   */
  function butterflyDissolve(ctx, x, y, s, o, q, scale, seed) {
    const S = F();
    const D = Math.ceil(s * 2.7 * scale);
    if (D < 8) return;
    const c = makeCanvas(D, D);
    const x2 = c.getContext('2d');
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.translate(D / 2, D / 2);
    // 蝶そのもの（光の玉は描かない）
    butterfly(x2, 0, 0, s * scale, { ...o, glow: 0, alpha: 1 });
    let img;
    try { img = x2.getImageData(0, 0, D, D); } catch (e) { return; }
    const d = img.data;
    const cell = Math.max(3, s * scale * 0.09);
    for (let py = 0; py < D; py++) {
      for (let px = 0; px < D; px++) {
        const i = (py * D + px) * 4;
        if (d[i + 3] === 0) continue;
        const dx = (px - D / 2) / (s * scale), dy = (py - D / 2) / (s * scale);
        const far = clamp(Math.hypot(dx, dy * 0.8) / 1.1);
        const n = vnoise(px / cell, py / cell, seed) * 0.7 + 0.3 * far;
        const k = clamp((n - (q * 1.5 - 0.35)) * 5);
        d[i + 3] = d[i + 3] * k;
      }
    }
    x2.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = (o.alpha ?? 1);
    ctx.drawImage(c, x - D / 2 / scale, y - D / 2 / scale, D / scale, D / scale);
    ctx.restore();
  }

  /*
   * 夢の帯：ほんのり透ける夕暮れ色の帯（左右はぼかす）。上下に虹色の細い光の線、中に小さなきらめき。open で中央の細い線から開く
   * r は engine の rollBandRect
   */
  function dreamBand(ctx, r, size, open, alpha, accent, tint, t, seed, tier) {
    const S = F();
    if (open <= 0.001 || alpha <= 0.002) return;
    const cx = r.cx, cy = r.cy;
    const hh = r.hh * (0.04 + 0.96 * open);
    const half = r.half * (0.2 + 0.32 * Math.min(1, open * 1.6)) / 0.52;
    const edge = clamp(0.5 - r.solid / (2 * r.half), 0.05, 0.25);
    const dull = tier === 'failure' || tier === 'fumble';
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    const g = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    const base = tier === 'fumble' ? 0.86 : tier === 'failure' ? 0.8 : 0.7;
    g.addColorStop(0, S.rgba(tint, 0));
    g.addColorStop(edge, S.rgba(tint, base));
    g.addColorStop(1 - edge, S.rgba(tint, base));
    g.addColorStop(1, S.rgba(tint, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
    // 上は少し明るく、下は少し深く
    const vg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
    vg.addColorStop(0, S.rgba(S.mix(tint, '#ffffff', dull ? 0.1 : 0.3), 0.1));
    vg.addColorStop(0.55, S.rgba(tint, 0));
    vg.addColorStop(1, S.rgba('#000000', 0.05));
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - half * (1 - edge * 0.5), cy - hh, half * 2 * (1 - edge * 0.5), hh * 2); ctx.clip();
    ctx.fillStyle = vg;
    ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
    ctx.restore();
    // 上下の虹色の線
    const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    const cols = dull ? [desat('#ffb3d9', 0.7), desat('#c9b3ff', 0.7), desat('#a9e6ff', 0.7), desat('#ffe6a3', 0.7)] : ['#ffb3d9', '#c9b3ff', '#a9e6ff', '#b8f5d8', '#ffe6a3'];
    lg.addColorStop(0, S.rgba(cols[0], 0));
    cols.forEach((c, i) => lg.addColorStop(edge + 0.04 + (1 - 2 * edge - 0.08) * i / (cols.length - 1), S.rgba(c, dull ? 0.5 : 0.85)));
    lg.addColorStop(1, S.rgba(cols[cols.length - 1], 0));
    ctx.fillStyle = lg;
    const lw = Math.max(1.5, size * 0.011);
    ctx.fillRect(cx - half, cy - hh - lw, half * 2, lw);
    ctx.fillRect(cx - half, cy + hh, half * 2, lw);
    // 帯の中の小さなきらめき
    if (open > 0.3) {
      const dim = tier === 'failure' ? 0.45 : tier === 'fumble' ? 0.25 : 1;
      for (let i = 0; i < 40; i++) {
        const u = rnd(seed, i, 71) * 2 - 1;
        const x = cx + u * half * 0.95, y = cy + (rnd(seed, i, 72) * 2 - 1) * hh * 0.88;
        const side = clamp((1 - Math.abs(u)) / 0.25);
        const tw = 0.5 + 0.5 * Math.sin(t * (2 + 3 * rnd(seed, i, 73)) + rnd(seed, i, 74) * TAU);
        const al = (0.25 + 0.6 * tw) * dim * side * clamp((open - 0.3) / 0.5);
        const c = SPARK[i % SPARK.length];
        if (i % 7 === 0) S.glint(ctx, x, y, size * (0.05 + 0.04 * tw), c === '#ffffff' ? accent : c, al);
        else S.softDot(ctx, x, y, size * (0.012 + 0.012 * rnd(seed, i, 75)), c, al);
      }
    }
    ctx.restore();
  }

  root.TextApngDreamFx = { puff, star5, sweepStar, rainbow, mistBank, butterfly, butterflyDissolve, dreamBand, RAINBOW, SPARK, WINGS, desat };
})(typeof window !== 'undefined' ? window : globalThis);
