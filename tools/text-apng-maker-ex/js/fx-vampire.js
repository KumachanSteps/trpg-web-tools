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

  // 粒子（ごく淡い白黒のノイズ）：グラデーションの段差（256色にしたときの縞）をぼかす。いまのパスの中だけに重ねる
  let grainTile = null;
  function grain(ctx, alpha) {
    if (!grainTile) {
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(96, 96) : Object.assign(document.createElement('canvas'), { width: 96, height: 96 });
      const g = c.getContext('2d'), img = g.createImageData(96, 96);
      for (let i = 0; i < 96 * 96; i++) { const q = rnd(i, 7, 3) < 0.5 ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = q; img.data[i * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
      grainTile = c;
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(-4000, -4000, 9000, 9000);
    ctx.restore();
  }

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
    grain(ctx, 0.06);
    for (let i = 0; i < 9; i++) {
      const a = rnd(o.seed || 3, i, 1) * TAU, d = Math.sqrt(rnd(o.seed || 3, i, 2)) * r * 0.8;
      puff(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.1 + 0.16 * rnd(o.seed || 3, i, 3)), r * (0.1 + 0.16 * rnd(o.seed || 3, i, 3)), '#5a0a18', 0.35);
    }
    ctx.restore();
    ctx.restore();
  }

  /*
   * 牙の列（歯ぐき・あごの線は描かない。白い歯だけ）。(x, y) が列の中心、縁の高さ y から dir（+1＝下向き：上あご / −1＝上向き：下あご）へ歯が伸びる。
   * S は大きさの基準。中央に長い歯が2本、その両わきに短い歯が2本ずつ、いちばん外側に長く反った大きな牙、さらに外へ小さな歯が3本ずつ。
   * 歯は葉のようなふくらみのある細い形で、先は少し内側（中央側）へ反る。lower＝true の下あごは歯の位置を半ピッチずらして噛み合わせる。
   * 色は骨の白で、根もとから先へごくわずかに陰る。見やすさのため、歯のまわりにごく淡い暗紅の影を落とす
   */
  const TEETH = [
    // [中心からの距離(S), 長さ(S), 根もとの太さ(S), 先の反り(S、内向き)]
    [0.2, 1.0, 0.25, 0.0], [0.55, 0.84, 0.23, 0.02], [0.87, 0.68, 0.2, 0.04],
    [1.24, 1.58, 0.38, 0.34],
    [1.6, 0.6, 0.17, 0.07], [1.8, 0.46, 0.15, 0.06], [1.97, 0.34, 0.12, 0.05]
  ];
  const TEETH_LOWER = [
    [0.375, 1.0, 0.25, 0.0], [0.71, 0.84, 0.23, 0.02], [1.04, 0.68, 0.2, 0.04],
    [1.42, 1.58, 0.38, 0.34],
    [1.78, 0.6, 0.17, 0.07], [1.97, 0.46, 0.15, 0.06], [2.12, 0.34, 0.12, 0.05]
  ];
  function toothPath(x, y, len, w, bend, dir, side) {
    // x 根もとの中心、side：+1 右側 / −1 左側（先は中央側へ反る）。両側とも葉のようにふくらんで先でとがる
    const p = new Path2D();
    const tx = x - side * bend, ty = y + dir * len;
    p.moveTo(x - w / 2, y);
    p.bezierCurveTo(x - w * 0.55 - side * bend * 0.1, y + dir * len * 0.4, tx - w * 0.1, y + dir * len * 0.82, tx, ty);
    p.bezierCurveTo(tx + w * 0.1, y + dir * len * 0.82, x + w * 0.55 - side * bend * 0.1, y + dir * len * 0.4, x + w / 2, y);
    p.closePath();
    return p;
  }
  function teethRow(ctx, cx, y, S, dir, o = {}) {
    const alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.01 || S <= 1) return;
    const Sx = F();
    const list = o.lower ? TEETH_LOWER : TEETH;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = Sx.rgba(o.shadow || '#1a0208', 0.8);
    ctx.shadowBlur = S * 0.07;
    list.forEach(([dx, len, w0, bend]) => {
      const w = w0 * 0.9;
      [-1, 1].forEach(side => {
        const x = cx + side * dx * S;
        const path = toothPath(x, y - dir * S * 0.03, len * S, w * S, bend * S, dir, side);
        const g = ctx.createLinearGradient(0, y, 0, y + dir * len * S);
        g.addColorStop(0, '#fffdf8');
        g.addColorStop(0.55, '#f4ede0');
        g.addColorStop(1, '#d8cdb8');
        ctx.fillStyle = g;
        ctx.fill(path);
      });
    });
    ctx.restore();
  }

  /*
   * 広がる血：中心 (x,y) から、ひとつながりの塊としてにじむように広がる（大きな血だまり・絵の具のしみ）。
   * rx, ry は広がりきったときの半径、p（0〜1）で広がる（外へ向かってゆっくり止まる）。ふちは角度ごとのノイズで不ぞろいに波打ち、
   * ところどころ短い突起が出る。中心ほど暗く、ふち近くはやや明るい紅。つやの淡い光が数か所。
   * ふちのすぐ外にだけ、ごく細かな点（specks）が散る。飛び散る滴や垂れは描かない
   */
  function bloodMass(ctx, x, y, rx, ry, p, o = {}) {
    if (p <= 0.001 || rx <= 1) return;
    const S = F();
    const seed = o.seed || 1;
    const alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.005) return;
    const e = 1 - Math.pow(1 - clamp(p), 2.6);
    ctx.save();
    ctx.globalAlpha *= alpha;
    const n = 120;
    const ph = [rnd(seed, 1, 1) * TAU, rnd(seed, 2, 1) * TAU, rnd(seed, 3, 1) * TAU, rnd(seed, 4, 1) * TAU];
    const spikes = [];
    for (let q = 0; q < (o.spikes ?? 9); q++) spikes.push([rnd(seed, 10 + q, 1) * TAU, 0.07 + 0.16 * rnd(seed, 30 + q, 1), 0.02 + 0.03 * rnd(seed, 50 + q, 1)]);
    // 広がるにつれて、ふちの凹凸が先に決まる（形は同じで大きさだけ育つ）
    const edge = a => {
      let m = 0.72 + 0.14 * Math.sin(a * 2 + ph[0]) + 0.1 * Math.sin(a * 3 + ph[1]) + 0.07 * Math.sin(a * 5 + ph[2]) + 0.045 * Math.sin(a * 9 + ph[3]) + 0.03 * Math.sin(a * 13 + ph[1] * 2) + 0.02 * Math.sin(a * 23 + ph[0] * 2);
      spikes.forEach(([sa, h, wd]) => { const da = Math.atan2(Math.sin(a - sa), Math.cos(a - sa)); m += h * Math.exp(-da * da / wd); });
      return m;
    };
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const m = edge(a) * (1 + 0.02 * Math.sin(a * 41 + seed));
      pts.push([x + Math.cos(a) * rx * e * m, y + Math.sin(a) * ry * e * m]);
    }
    const path = new Path2D();
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      if (i === 0) path.moveTo(mx, my); else path.quadraticCurveTo(p0[0], p0[1], mx, my);
    }
    path.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    path.closePath();
    // 本体：中心が暗く、ふちへ向けて紅が明るくなり、最後のふちはまた少し暗く
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry) * Math.max(0.15, e) * 1.25);
    grad.addColorStop(0, S.rgba('#2a030b', 1));
    grad.addColorStop(0.35, S.rgba('#4a0612', 1));
    grad.addColorStop(0.7, S.rgba(o.mid || '#7c0c1e', 1));
    grad.addColorStop(0.92, S.rgba('#98122a', 1));
    grad.addColorStop(1, S.rgba('#5a0816', 1));
    ctx.fillStyle = grad;
    ctx.fill(path);
    ctx.strokeStyle = S.rgba('#3a040c', 0.85);
    ctx.lineWidth = Math.max(1, Math.min(rx, ry) * 0.012);
    ctx.stroke(path);
    // つや：本体の中に、淡い明るい筋とにじみ
    ctx.clip(path);
    grain(ctx, o.grain ?? 0.04);
    for (let q = 0; q < 3; q++) {
      const a = rnd(seed, 70 + q, 1) * TAU, d = (0.15 + 0.4 * rnd(seed, 80 + q, 1)) * e;
      puff(ctx, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, rx * (0.16 + 0.12 * rnd(seed, 90 + q, 1)) * e, rx * (0.05 + 0.04 * rnd(seed, 94 + q, 1)) * e, '#ff7a86', 0.1);
    }
    ctx.restore();
    // ふちの外に、ごく細かな点
    const specks = o.specks ?? 22;
    for (let i = 0; i < specks; i++) {
      const a = rnd(seed, 100 + i, 1) * TAU;
      const m = edge(a);
      const dist = m * (1.04 + 0.22 * rnd(seed, 130 + i, 1) * rnd(seed, 160 + i, 1) * 2) * e;
      const r = Math.min(rx, ry) * (0.006 + 0.016 * rnd(seed, 190 + i, 1) * rnd(seed, 220 + i, 1)) * (0.4 + 0.6 * e);
      if (p < 0.45 + 0.4 * rnd(seed, 250 + i, 1)) continue;
      ctx.fillStyle = S.rgba(i % 3 ? '#7c0c1e' : '#98122a', 0.95);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * rx * dist, y + Math.sin(a) * ry * dist, Math.max(0.8, r), 0, TAU); ctx.fill();
    }
    ctx.restore();
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

  root.TextApngVampireFx = { puff, bat, moon, teethRow, bloodMass, drip, cracks, flare, band, BLOOD, BONE };
})(typeof window !== 'undefined' ? window : globalThis);
