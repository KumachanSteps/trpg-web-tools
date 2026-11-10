/*
 * 文字画像APNGメーカーEX — 星と夢の演出の部品（流れ星・きらめき・星座・ブラックホール）
 * 判定カットイン「星」（engine.js の drawStar）から使う。どの関数も ctx はレイアウトの座標（engine が拡大率をかけてある）。
 * 時刻はすべて引数で渡し、同じ時刻なら同じ絵になる（書き出しのコマ順に依存しない）。
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
  const outCubic = x => 1 - Math.pow(1 - x, 3);
  const smooth = x => x * x * (3 - 2 * x);

  function rgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    const v = m ? parseInt(m[1], 16) : 0xffffff;
    return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${clamp(a).toFixed(3)})`;
  }
  // 2色を混ぜる（#rrggbb）
  function mix(a, b, k) {
    const pa = parseInt(String(a).slice(1), 16), pb = parseInt(String(b).slice(1), 16);
    const ch = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }

  // やわらかい光の玉
  function softDot(ctx, x, y, r, color, alpha) {
    if (alpha <= 0.003 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(0.35, rgba(color, alpha * 0.35));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // 4方向の光のきらめき：細く長い十字と、短い斜めの光、白い芯とまわりの淡い光。rot で少し回す
  function glint(ctx, x, y, r, color, alpha, rot = 0) {
    if (alpha <= 0.003 || r <= 0.3) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    softDot(ctx, 0, 0, r * 0.75, color, 0.55 * alpha);
    const ray = (len, w, a) => {
      ctx.fillStyle = rgba('#ffffff', a);
      ctx.beginPath();
      ctx.moveTo(0, -len); ctx.quadraticCurveTo(w * 0.15, -w * 0.15, w, 0);
      ctx.quadraticCurveTo(w * 0.15, w * 0.15, 0, len);
      ctx.quadraticCurveTo(-w * 0.15, w * 0.15, -w, 0);
      ctx.quadraticCurveTo(-w * 0.15, -w * 0.15, 0, -len);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-len, 0); ctx.quadraticCurveTo(-w * 0.15, -w * 0.15, 0, -w);
      ctx.quadraticCurveTo(w * 0.15, -w * 0.15, len, 0);
      ctx.quadraticCurveTo(w * 0.15, w * 0.15, 0, w);
      ctx.quadraticCurveTo(-w * 0.15, w * 0.15, -len, 0);
      ctx.fill();
    };
    ctx.globalCompositeOperation = 'lighter';
    ray(r, r * 0.12, 0.95 * alpha);
    ctx.rotate(Math.PI / 4);
    ray(r * 0.42, r * 0.08, 0.6 * alpha);
    ctx.globalCompositeOperation = 'source-over';
    softDot(ctx, 0, 0, r * 0.16, '#ffffff', alpha);
    ctx.restore();
  }

  /*
   * 流れ星。m = { tp, x, y, ang, speed, len, w, color, pre, post, fizzle, seed, sparks }
   * tp に (x, y) を通る。頭は tp - pre で現れ、tp + post で去る。尾は進むにつれて伸び、去ったあとは縮んで消える。
   * fizzle（時刻）があれば、そこで頭がまたたいて失速し、尾がちぎれて消える（届かない流れ星）。
   * 通ったあとには小さなきらめきの粉が残って、ゆっくり落ちながら消える。
   */
  function meteor(ctx, m, t) {
    const pre = m.pre ?? 0.35, post = m.post ?? 0.35;
    const a = t - (m.tp - pre);
    const dur = pre + post;
    if (a < 0) return;
    const ux = Math.cos(m.ang), uy = Math.sin(m.ang);
    const sp = m.speed;
    const fz = m.fizzle != null ? m.fizzle - (m.tp - pre) : null;
    // 頭の位置（tp からの道のり）。失速するときは fizzle のあと急に遅くなる
    const dist = s => {
      if (fz == null || s <= fz) return (s - pre) * sp;
      const k = s - fz;
      return (fz - pre) * sp + sp * 0.18 * (1 - Math.exp(-k * 6));
    };
    const life = fz != null ? fz + 0.45 : dur + 0.5;
    const seed = m.seed || 1;
    const color = m.color || '#ffe9a8';
    // きらめきの粉（通り道に残る）
    const nS = m.sparks ?? 14;
    for (let i = 0; i < nS; i++) {
      const sb = (fz != null ? fz : dur) * (0.15 + 0.85 * rnd(seed, i, 1));
      const age = a - sb;
      const sl = 0.5 + 0.6 * rnd(seed, i, 2);
      if (age < 0 || age > sl) continue;
      const d0 = dist(sb);
      const off = (rnd(seed, i, 3) - 0.5) * m.w * 5;
      const px = m.x + ux * d0 - uy * off;
      const py = m.y + uy * d0 + ux * off + age * age * m.w * 22;
      const q = age / sl;
      const tw = 0.6 + 0.4 * Math.sin(age * 30 + i * 2.1);
      const al = (1 - q) * tw * (m.dim ? 0.5 : 1) * (m.alpha ?? 1);
      if (i % 4 === 0) glint(ctx, px, py, m.w * (2.6 + 2 * rnd(seed, i, 4)) * (1 - q * 0.5), color, al);
      else softDot(ctx, px, py, m.w * 1.4, i % 3 ? '#ffffff' : color, al);
    }
    if (a > life) return;
    const head = dist(Math.min(a, life));
    // 尾の長さ：出たばかりは短く、去るときは縮む
    let len = Math.min(m.len, a * sp * 0.9);
    let hAlpha = 1;
    if (fz != null && a > fz) {
      const k = clamp((a - fz) / 0.45);
      len *= 1 - smooth(k);
      hAlpha = (1 - k) * (0.55 + 0.45 * Math.sin((a - fz) * 70));
    } else if (a > dur) {
      const k = clamp((a - dur) / 0.5);
      len *= 1 - k;
      hAlpha = 1 - k;
    }
    hAlpha *= m.alpha ?? 1;
    if (hAlpha <= 0.003) return;
    const hx = m.x + ux * head, hy = m.y + uy * head;
    const tx = hx - ux * len, ty = hy - uy * len;
    ctx.save();
    ctx.lineCap = 'round';
    // 尾：外側の色つきの光と、細い白い芯（頭に向かって太く明るい）
    const g1 = ctx.createLinearGradient(tx, ty, hx, hy);
    g1.addColorStop(0, rgba(color, 0));
    g1.addColorStop(0.7, rgba(color, 0.35 * hAlpha));
    g1.addColorStop(1, rgba(color, 0.7 * hAlpha));
    ctx.strokeStyle = g1;
    ctx.lineWidth = m.w * 3.2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      ctx.strokeStyle = rgba('#ffffff', hAlpha * (0.15 + 0.85 * u1));
      ctx.lineWidth = m.w * (0.25 + 0.95 * u1);
      ctx.beginPath();
      ctx.moveTo(tx + (hx - tx) * u0, ty + (hy - ty) * u0);
      ctx.lineTo(tx + (hx - tx) * u1, ty + (hy - ty) * u1);
      ctx.stroke();
    }
    ctx.restore();
    softDot(ctx, hx, hy, m.w * 7, color, 0.65 * hAlpha);
    glint(ctx, hx, hy, m.w * (m.big ? 9 : 6), color, hAlpha, 0.1);
    // 失速した頭から、鈍い火の粉が数粒こぼれて落ちる
    if (fz != null && a > fz) {
      const k = a - fz;
      for (let i = 0; i < 6; i++) {
        const vx = (rnd(seed, i, 11) - 0.3) * sp * 0.12, vy = -sp * 0.03 * rnd(seed, i, 12);
        const px = m.x + ux * dist(fz) + vx * k, py = m.y + uy * dist(fz) + vy * k + 0.5 * m.w * 160 * k * k;
        const al = clamp(1 - k / (0.5 + 0.4 * rnd(seed, i, 13))) * (m.alpha ?? 1) * 0.8;
        softDot(ctx, px, py, m.w * 1.6, i % 2 ? color : '#ffffff', al);
      }
    }
  }

  // 星座：点を順に線でつなぐ。pts = [{x, y, r}]、p（0〜1）でつながり具合、closed で最後の点から最初の点へ戻る
  function constellation(ctx, pts, p, t, color, alpha, closed, w) {
    if (alpha <= 0.003 || !pts.length) return;
    const segs = closed ? pts.length : pts.length - 1;
    const prog = p * segs;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < segs; i++) {
      const k = clamp(prog - i);
      if (k <= 0) break;
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      ctx.strokeStyle = rgba(color, 0.22 * alpha);
      ctx.lineWidth = w * 3.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.75 * alpha);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
      // 線の先を走る光
      if (k < 1) softDot(ctx, x, y, w * 7, color, alpha);
    }
    ctx.restore();
    pts.forEach((s, i) => {
      const on = clamp((prog - (i - 0.15)) / 0.3);
      if (on <= 0) return;
      const tw = 0.75 + 0.25 * Math.sin(t * (4 + i % 3) + i * 1.7);
      const pop = 1 + 1.2 * Math.max(0, 1 - (prog - i) / 0.6) * (prog - i > 0 ? 1 : 0);
      glint(ctx, s.x, s.y, s.r * tw * Math.min(pop, 2), color, alpha * on, 0);
    });
  }

  /*
   * ブラックホール。中心 (cx, cy)、黒い芯の半径 R。o = { t, form（0〜1 で現れる）, collapse（0〜1 でつぶれる）, alpha, spin, part }
   * part：'back' は降着円盤の奥側・重力レンズの光の輪・黒い芯、'front' は降着円盤の手前側（文字の後ろに描く）
   */
  const DISK_HOT = '#ffd9a0', DISK_MID = '#ff8a4c', DISK_COOL = '#b04cff', LENS = '#d9b8ff';
  function blackHole(ctx, cx, cy, R, o) {
    const form = clamp(o.form ?? 1), col = clamp(o.collapse ?? 0), al = clamp(o.alpha ?? 1);
    if (al <= 0.003) return;
    const t = o.t || 0;
    const r = R * outCubic(form) * (1 - smooth(col));
    const disk = clamp((form - 0.3) / 0.7) * (1 - clamp(col * 1.4));
    const tilt = -0.1;
    const rx = R * (o.diskX ?? 3.1), ry = R * 0.5;
    const drawDisk = front => {
      if (disk <= 0.003) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      // 帯状の光：内側ほど熱く白い
      for (let k = 0; k < 7; k++) {
        const f = 1 - k / 7; // 外 → 内
        const sx = (1.25 + (rx / R - 1.25) * f) * r, sy = (0.5 * f + 0.22) * r * (ry / (R * 0.5));
        const c = mix(mix(DISK_COOL, DISK_MID, clamp(1 - f * 1.1)), DISK_HOT, clamp(0.6 - f));
        ctx.strokeStyle = rgba(c, (0.1 + 0.32 * (1 - f)) * disk * al);
        ctx.lineWidth = R * (0.18 + 0.1 * (1 - f));
        ctx.beginPath();
        ctx.ellipse(0, 0, sx, sy, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
        ctx.stroke();
      }
      // 円盤を回る光のかたまり（内側ほど速い）
      for (let i = 0; i < 26; i++) {
        const f = 0.15 + 0.85 * rnd(i, 5, 41);
        const sp = (o.spin ?? 1) * (2.6 - 1.7 * f);
        const ang = rnd(i, 6, 41) * TAU + t * sp;
        const s = Math.sin(ang);
        if ((s >= 0) !== front) continue;
        const sx = (1.25 + (rx / R - 1.25) * f) * r, sy = (0.5 * f + 0.22) * r;
        const x = Math.cos(ang) * sx, y = s * sy;
        const c = f < 0.4 ? DISK_HOT : f < 0.7 ? DISK_MID : DISK_COOL;
        const len = 0.35 + 0.2 * rnd(i, 7, 41);
        ctx.strokeStyle = rgba(c, 0.55 * disk * al);
        ctx.lineWidth = R * 0.06;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(0, 0, sx, sy, 0, ang - len, ang);
        ctx.stroke();
        softDot(ctx, x, y, R * 0.14, c, 0.6 * disk * al);
      }
      ctx.restore();
    };
    if (o.part === 'front') { drawDisk(true); return; }
    drawDisk(false);
    if (r > 0.5) {
      // 重力レンズ：芯のまわりの光の輪と、上に回り込んだ円盤の光
      const halo = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.9);
      halo.addColorStop(0, rgba('#ffffff', 0.0));
      halo.addColorStop(0.06, rgba(LENS, 0.85 * al * (0.8 + 0.2 * Math.sin(t * 3))));
      halo.addColorStop(0.2, rgba(DISK_COOL, 0.35 * al));
      halo.addColorStop(1, rgba(DISK_COOL, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, TAU); ctx.fill();
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(DISK_HOT, 0.75 * disk * al);
      ctx.lineWidth = R * 0.07;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.18, r * 1.12, tilt, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', 0.9 * al);
      ctx.lineWidth = Math.max(0.8, R * 0.025);
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, TAU); ctx.stroke();
      ctx.restore();
      // 黒い芯（縁だけ少しぼかす）
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.02);
      core.addColorStop(0, `rgba(0, 0, 0, ${al})`);
      core.addColorStop(0.9, `rgba(0, 0, 0, ${al})`);
      core.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.02, 0, TAU); ctx.fill();
    }
  }

  root.TextApngStarFx = { glint, softDot, meteor, constellation, blackHole, mix, rgba };
})(typeof window !== 'undefined' ? window : globalThis);
