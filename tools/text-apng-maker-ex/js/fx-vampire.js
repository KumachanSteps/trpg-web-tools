/*
 * 文字画像APNGメーカーEX — ヴァンパイアの演出の部品（コウモリ・赤い月・牙の顎・血しぶき・血のしたたり・ひび・血の閃光・帯）
 * 判定カットイン「ヴァンパイア」（engine.js の drawVampire）から使う。ctx はレイアウトの座標（engine が拡大率をかけてある）。
 * 光の玉は fx-star.js（TextApngStarFx）を使う。どの関数も時刻（進み具合）を引数で受け取り、同じ値なら同じ絵になる。
 * 色は深い紅・黒・骨の白。血は暗い紅（BLOOD）で、ふちを濃く、つやを少し明るくする。
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
  const F = () => root.TextApngStarFx;

  const BLOOD = { dark: '#3a040c', mid: '#7c0a1a', bright: '#c0182e', gloss: '#ff6a78' };
  const BONE = '#f2e8d8', BONE_SHADE = '#b9a78e';
  const BAT = '#0b0307';

  // やわらかい楕円の光（霧・光彩）
  function puff(ctx, x, y, rx, ry, color, alpha) {
    if (alpha <= 0.004 || rx <= 0.5) return;
    const S = F();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, S.rgba(color, alpha));
    g.addColorStop(0.5, S.rgba(color, alpha * 0.55));
    g.addColorStop(1, S.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /*
   * コウモリ：s は翼の片方の長さ。flap（0〜1）で翼を打ち下ろす／持ち上げる。ang で傾け、dir（±1）で向きを左右に返す。
   * 黒い影に、ふちだけ紅をうっすらのせる（暗い背景でも形が見える）。大きいときは目が赤く光る
   */
  function bat(ctx, x, y, s, o = {}) {
    const alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.01 || s < 1.5) return;
    const S = F();
    const f = clamp(o.flap ?? 0.5);
    const a = -0.95 + 1.7 * f;                      // 翼の先の角度（上がマイナス）
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(o.ang || 0);
    ctx.scale(o.dir || 1, 1);
    const wing = side => {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.06);
      // 前縁：肩 → ひじ → 先
      const ex = s * 0.52 * Math.cos(a * 0.55), ey = -s * 0.2 + s * 0.52 * Math.sin(a * 0.55) * 0.9;
      ctx.quadraticCurveTo(s * 0.3, -s * 0.2 + ey * 0.2, ex, ey);
      ctx.quadraticCurveTo(s * 0.8 * ca, s * 0.85 * sa + ey * 0.2, s * ca, s * sa);
      // 後縁：先から体へ、3つのふくらみ（指のあいだの膜）
      const px = [0.78, 0.5, 0.26], py = [0.34, 0.5, 0.42];
      let lx = s * ca, ly = s * sa;
      for (let i = 0; i < 3; i++) {
        const tx = s * px[i] * 0.98 + s * 0.04, ty = s * (py[i] * 0.62 + sa * 0.2 * (1 - i * 0.3));
        ctx.quadraticCurveTo((lx + tx) / 2, Math.max(ly, ty) + s * 0.1, tx, ty);
        lx = tx; ly = ty;
      }
      ctx.quadraticCurveTo(s * 0.14, s * 0.34, s * 0.1, s * 0.18);
      ctx.closePath();
      ctx.fillStyle = BAT;
      ctx.fill();
      if (s > 7) {
        ctx.strokeStyle = S.rgba(o.rim || '#d02040', 0.5);
        ctx.lineWidth = Math.max(0.6, s * 0.035);
        ctx.stroke();
      }
      ctx.restore();
    };
    wing(1); wing(-1);
    // 体・頭・耳
    ctx.fillStyle = BAT;
    ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.13, s * 0.26, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -s * 0.24, s * 0.105, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.28); ctx.lineTo(-s * 0.15, -s * 0.46); ctx.lineTo(-s * 0.02, -s * 0.33);
    ctx.moveTo(s * 0.1, -s * 0.28); ctx.lineTo(s * 0.15, -s * 0.46); ctx.lineTo(s * 0.02, -s * 0.33);
    ctx.fill();
    if (s > 14) {
      ctx.fillStyle = S.rgba('#ff3048', 0.95);
      ctx.beginPath(); ctx.arc(-s * 0.04, -s * 0.25, s * 0.02, 0, TAU); ctx.arc(s * 0.04, -s * 0.25, s * 0.02, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /*
   * 赤い月：まわりに光彩、円盤は縁が暗く中が明るい紅、ところどころにクレーターのまだら。pulse で光彩が脈打つ
   */
  function moon(ctx, x, y, r, alpha, o = {}) {
    if (alpha <= 0.005 || r <= 1) return;
    const S = F();
    const c = o.color || '#ff3a48';
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    puff(ctx, x, y, r * (1.9 + 0.2 * (o.pulse || 0)), r * (1.9 + 0.2 * (o.pulse || 0)), c, 0.38);
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    g.addColorStop(0, S.mix(c, '#ffe0d0', 0.35));
    g.addColorStop(0.55, c);
    g.addColorStop(0.9, S.mix(c, '#3a040c', 0.65));
    g.addColorStop(1, S.mix(c, '#3a040c', 0.85));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    for (let i = 0; i < 9; i++) {
      const a = rnd(o.seed || 3, i, 1) * TAU, d = Math.sqrt(rnd(o.seed || 3, i, 2)) * r * 0.8;
      puff(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.1 + 0.16 * rnd(o.seed || 3, i, 3)), r * (0.1 + 0.16 * rnd(o.seed || 3, i, 3)), '#5a0a18', 0.35);
    }
    ctx.restore();
    ctx.restore();
  }

  /*
   * 牙：x,y が根もと、len が長さ、w が根もとの太さ。dir＝+1 で下向き（上あごの牙）、−1 で上向き（下あごの牙）。
   * ふっくらした円すいで、先へ向けて少し内側へ反る。blood（0〜1）で先から血がのる
   */
  function fang(ctx, x, y, len, w, dir, o = {}) {
    if (len <= 1) return;
    const S = F();
    const curve = (o.curve ?? 0.18) * len;
    ctx.save();
    ctx.globalAlpha *= clamp(o.alpha ?? 1);
    ctx.translate(x, y);
    ctx.scale(1, dir);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.bezierCurveTo(-w * 0.5, len * 0.45, -w * 0.12 + curve * 0.4, len * 0.8, curve, len);
    ctx.bezierCurveTo(w * 0.2 + curve * 0.3, len * 0.78, w * 0.5, len * 0.42, w / 2, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, BONE_SHADE); g.addColorStop(0.35, BONE); g.addColorStop(0.7, '#fffaf0'); g.addColorStop(1, BONE_SHADE);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = S.rgba('#2a0208', 0.8);
    ctx.lineWidth = Math.max(0.8, w * 0.06);
    ctx.stroke();
    if (o.blood > 0) {
      ctx.save();
      ctx.clip();
      const bg = ctx.createLinearGradient(0, len * (1 - 0.6 * o.blood), 0, len);
      bg.addColorStop(0, S.rgba(BLOOD.mid, 0));
      bg.addColorStop(0.5, S.rgba(BLOOD.mid, 0.85));
      bg.addColorStop(1, S.rgba(BLOOD.bright, 0.95));
      ctx.fillStyle = bg;
      ctx.fillRect(-w, 0, w * 2, len + 2);
      ctx.restore();
    }
    ctx.restore();
  }

  /*
   * あご：画面いっぱいの歯ぐき（暗い紅）の縁に、牙と小さな歯が並ぶ。edge が縁の高さ、dir＝+1 で上あご（縁から下へ牙）、−1 で下あご。
   * fangs は大きい牙の x の位置の並び。小さい歯はその間に並べる
   */
  function jaw(ctx, W, H, edge, dir, o) {
    const S = F();
    ctx.save();
    ctx.globalAlpha *= clamp(o.alpha ?? 1);
    // 歯ぐき：縁は少しうねる
    const gum = dir > 0 ? [-H, edge] : [edge, H * 2];
    const g = ctx.createLinearGradient(0, edge - dir * o.size * 1.2, 0, edge);
    g.addColorStop(0, S.rgba(o.dark || '#12020a', 0.98));
    g.addColorStop(1, S.rgba(o.gum || '#6a0a1c', 0.98));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-W * 0.1, gum[0]);
    ctx.lineTo(W * 1.1, gum[0]);
    ctx.lineTo(W * 1.1, edge);
    const n = 14;
    for (let i = n; i >= 0; i--) {
      const x = -W * 0.1 + (W * 1.2) * i / n;
      ctx.lineTo(x, edge + dir * Math.sin(i * 1.7 + (o.seed || 0)) * o.size * 0.05);
    }
    ctx.closePath();
    ctx.fill();
    // 縁のつや
    ctx.strokeStyle = S.rgba(BLOOD.gloss, 0.45);
    ctx.lineWidth = Math.max(1, o.size * 0.02);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = -W * 0.1 + (W * 1.2) * i / n;
      const y = edge + dir * Math.sin(i * 1.7 + (o.seed || 0)) * o.size * 0.05;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // 小さな歯
    const small = o.small || 0;
    for (let i = 0; i < small; i++) {
      const x = W * (i + 0.5) / small;
      fang(ctx, x, edge, o.size * 0.28 * (0.8 + 0.4 * rnd(o.seed || 0, i, 5)), o.size * 0.2, dir, { alpha: 0.95, curve: 0.05, blood: o.blood || 0 });
    }
    // 大きな牙
    o.fangs.forEach((x, i) => fang(ctx, x, edge, o.len * (0.92 + 0.16 * rnd(o.seed || 0, i, 6)), o.w, dir, { alpha: 1, curve: x < W / 2 ? 0.14 : -0.14, blood: o.blood || 0 }));
    ctx.restore();
  }

  /*
   * 血しぶき：中心 (x,y)。p（0〜1）で広がる。ぎざぎざの本体のまわりに、尾を引く飛沫（放射状）と丸い滴。
   * r は広がりきったときの本体の半径。同じ seed なら同じ形
   */
  function splat(ctx, x, y, r, p, o = {}) {
    const S = F();
    const seed = o.seed || 1;
    if (p <= 0.001 || r <= 1) return;
    const e = 1 - Math.pow(1 - clamp(p), 3);
    const alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.005) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    // 本体：ぎざぎざの丸（なめらかにつなぐ）
    const n = 36;
    const pts = [];
    const lump = 0.9 + 0.3 * rnd(seed, 90, 1);
    const k1 = 3 + Math.floor(rnd(seed, 91, 1) * 3), k2 = 6 + Math.floor(rnd(seed, 92, 1) * 4);
    const p1 = rnd(seed, 93, 1) * TAU, p2 = rnd(seed, 94, 1) * TAU;
    const lobes = [0, 1, 2].map(q => [rnd(seed, 95 + q, 1) * TAU, 0.25 + 0.3 * rnd(seed, 98 + q, 1)]);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      let m = 0.78 + 0.14 * Math.sin(a * k1 + p1) + 0.08 * Math.sin(a * k2 + p2);
      lobes.forEach(([la, lh]) => { const da = Math.atan2(Math.sin(a - la), Math.cos(a - la)); m += lh * Math.exp(-da * da / 0.05); });
      const rr = r * e * lump * m;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.squash ?? 0.85)]);
    }
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % n];
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        if (i === 0) ctx.moveTo(mx, my);
        else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
      }
      ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      ctx.closePath();
    };
    path();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * Math.max(0.2, e) * 1.3);
    g.addColorStop(0, S.rgba(o.mid || BLOOD.mid, 0.96));
    g.addColorStop(0.7, S.rgba(o.mid || BLOOD.mid, 0.96));
    g.addColorStop(1, S.rgba(BLOOD.dark, 0.96));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = S.rgba(BLOOD.dark, 0.9);
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    // つや
    ctx.fillStyle = S.rgba(BLOOD.gloss, 0.28);
    ctx.beginPath(); ctx.ellipse(x - r * 0.22 * e, y - r * 0.2 * e, r * 0.2 * e, r * 0.09 * e, -0.5, 0, TAU); ctx.fill();
    // 飛沫：尾を引いて飛ぶ
    const streaks = o.streaks ?? 16;
    for (let i = 0; i < streaks; i++) {
      const a = rnd(seed, i, 11) * TAU;
      const reach = r * (1.3 + 1.7 * rnd(seed, i, 12));
      const q = clamp(p * 1.25 - 0.1 * rnd(seed, i, 13));
      if (q <= 0) continue;
      const d1 = reach * (1 - Math.pow(1 - q, 3));
      const d0 = Math.max(r * 0.5, d1 - reach * 0.4 * (1 - 0.5 * q));
      const w = r * (0.035 + 0.05 * rnd(seed, i, 14)) * (1 - 0.5 * q);
      const sg = (o.squash ?? 0.85);
      const x0 = x + Math.cos(a) * d0, y0 = y + Math.sin(a) * d0 * sg, x1 = x + Math.cos(a) * d1, y1 = y + Math.sin(a) * d1 * sg;
      ctx.strokeStyle = S.rgba(o.mid || BLOOD.mid, 0.95);
      ctx.lineCap = 'round';
      ctx.lineWidth = w * 1.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = S.rgba(i % 3 ? BLOOD.mid : BLOOD.bright, 0.98);
      ctx.beginPath(); ctx.arc(x1, y1, w * 1.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /*
   * 飛び散る滴：中心から外へ飛び、重力で落ちる。t は飛び出してからの秒数。n 粒。w は画面の幅（基準の速さ）
   */
  function drops(ctx, x, y, t, n, o) {
    const S = F();
    if (t <= 0) return;
    for (let i = 0; i < n; i++) {
      const life = (o.life || 1.0) * (0.7 + 0.5 * rnd(o.seed, i, 21));
      if (t > life) continue;
      const a = -Math.PI / 2 + (rnd(o.seed, i, 22) - 0.5) * (o.spread ?? 3.4);
      const v = o.v * (0.35 + 0.9 * rnd(o.seed, i, 23));
      const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + o.g * t * t * 0.5;
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v + o.g * t;
      const sp = Math.hypot(vx, vy);
      const r = o.r * (0.5 + 1.0 * rnd(o.seed, i, 24)) * (1 - 0.3 * t / life);
      const al = (1 - Math.pow(t / life, 3)) * (o.alpha ?? 1);
      ctx.save();
      ctx.globalAlpha *= clamp(al);
      ctx.strokeStyle = S.rgba(BLOOD.mid, 1);
      ctx.lineWidth = r * 1.5;
      ctx.lineCap = 'round';
      const tl = Math.min(r * 5, sp * 0.03);
      ctx.beginPath(); ctx.moveTo(px - vx / sp * tl, py - vy / sp * tl); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = S.rgba(i % 4 ? BLOOD.mid : BLOOD.bright, 1);
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  /*
   * したたり：上の端 y0 から長さ len だけ、先に丸い玉をつけて伸びる血の筋。w は太さ
   */
  function drip(ctx, x, y0, len, w, alpha = 1) {
    if (len <= 1 || alpha <= 0.01) return;
    const S = F();
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, S.rgba(BLOOD.dark, 1)); g.addColorStop(0.45, S.rgba(BLOOD.bright, 1)); g.addColorStop(1, S.rgba(BLOOD.dark, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, y0);
    ctx.lineTo(x - w * 0.34, y0 + len);
    ctx.arc(x, y0 + len, w * 0.78, Math.PI, 0, true);
    ctx.lineTo(x + w * 0.5, y0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = S.rgba(BLOOD.gloss, 0.5);
    ctx.beginPath(); ctx.ellipse(x - w * 0.2, y0 + len - w * 0.2, w * 0.16, w * 0.3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /*
   * ひび：中心から枝分かれしながら四方へ走る。p（0〜1）で伸びる。ひびの暗い芯と、紅のうっすらした縁
   */
  function cracks(ctx, cx, cy, reach, p, seed, alpha, w) {
    if (p <= 0.001 || alpha <= 0.005) return;
    const S = F();
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const branch = (x, y, a, len, depth, id) => {
      const segs = 6;
      let px = x, py = y;
      const pts = [[x, y]];
      for (let i = 1; i <= segs; i++) {
        const q = i / segs;
        if (q > p) break;
        a += (rnd(seed, id * 17 + i, 31) - 0.5) * 0.9;
        px += Math.cos(a) * len / segs; py += Math.sin(a) * len / segs * 0.8;
        pts.push([px, py]);
        if (depth < 2 && i >= 2 && rnd(seed, id * 17 + i, 32) < 0.35) branch(px, py, a + (rnd(seed, id, i) < 0.5 ? 1 : -1) * (0.6 + 0.5 * rnd(seed, id, 33)), len * 0.5, depth + 1, id * 7 + i);
      }
      [[S.rgba('#d02040', 0.5), w * 2.2], [S.rgba('#07010a', 0.95), w]].forEach(([c, lw]) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw * (1 - depth * 0.25);
        ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.stroke();
      });
    };
    for (let i = 0; i < 9; i++) branch(cx, cy, i / 9 * TAU + rnd(seed, i, 34) * 0.5, reach * (0.55 + 0.5 * rnd(seed, i, 35)), 0, i + 1);
    ctx.restore();
  }

  /*
   * 血の閃光：中心の光と、放射状に伸びる光の筋。p は進み具合（0〜1）
   */
  function flare(ctx, x, y, r, p, color, seed = 5) {
    if (p <= 0 || p >= 1) return;
    const S = F();
    const e = 1 - Math.pow(1 - p, 2.2);
    const a = Math.pow(1 - p, 1.6);
    puff(ctx, x, y, r * (0.6 + 1.0 * e), r * (0.6 + 1.0 * e) * 0.75, color, 0.85 * a);
    puff(ctx, x, y, r * 0.5 * (1 - p * 0.5), r * 0.4 * (1 - p * 0.5), '#ffe4dc', 0.9 * a);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = S.rgba(color, 0.75 * a);
    for (let i = 0; i < 16; i++) {
      const ang = i / 16 * TAU + rnd(seed, i, 41) * 0.2;
      const L = r * (0.9 + 1.7 * rnd(seed, i, 42)) * e;
      const w = r * 0.045 * (1 - p);
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(r * 0.12, -w); ctx.lineTo(r * 0.12 + L, 0); ctx.lineTo(r * 0.12, w); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /*
   * 帯：ほぼ黒の深い紅の帯（左右はぼかす）。上下に紅の細い光の線と、骨色のごく細い縁。open で中央の細い線から開く。
   * r は engine の rollBandRect。tier が failure / fumble のときはより暗く、紅を抑える
   */
  function band(ctx, r, size, open, alpha, accent, tint, tier) {
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
    const base = dull ? 0.9 : 0.8;
    g.addColorStop(0, S.rgba(tint, 0));
    g.addColorStop(edge, S.rgba(tint, base));
    g.addColorStop(1 - edge, S.rgba(tint, base));
    g.addColorStop(1, S.rgba(tint, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
    const vg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
    vg.addColorStop(0, S.rgba(accent, dull ? 0.06 : 0.16));
    vg.addColorStop(0.5, S.rgba(accent, 0));
    vg.addColorStop(1, S.rgba('#000000', 0.12));
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - half * (1 - edge * 0.5), cy - hh, half * 2 * (1 - edge * 0.5), hh * 2); ctx.clip();
    ctx.fillStyle = vg;
    ctx.fillRect(cx - half, cy - hh, half * 2, hh * 2);
    ctx.restore();
    const lg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    lg.addColorStop(0, S.rgba(accent, 0));
    lg.addColorStop(edge + 0.04, S.rgba(accent, dull ? 0.55 : 0.9));
    lg.addColorStop(0.5, S.rgba(S.mix(accent, BONE, 0.4), dull ? 0.5 : 0.85));
    lg.addColorStop(1 - edge - 0.04, S.rgba(accent, dull ? 0.55 : 0.9));
    lg.addColorStop(1, S.rgba(accent, 0));
    ctx.fillStyle = lg;
    const lw = Math.max(1.5, size * 0.012);
    ctx.fillRect(cx - half, cy - hh - lw, half * 2, lw);
    ctx.fillRect(cx - half, cy + hh, half * 2, lw);
    ctx.restore();
  }

  root.TextApngVampireFx = { puff, bat, moon, fang, jaw, splat, drops, drip, cracks, flare, band, BLOOD, BONE };
})(typeof window !== 'undefined' ? window : globalThis);
