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
    // [中心からの距離(S), 長さ(S), 根もとの太さ(S), 先の反り(S、内向き), 縁から下へずらす量(S)]
    // 中央の長い歯が2本、そのわきに短い歯が2本、大きく反った牙、外側の小さな歯が3本。外の小さな歯は少し低い位置から生える
    [0.26, 1.0, 0.4, 0.0, 0], [0.7, 0.95, 0.38, 0.05, 0],
    [1.08, 1.9, 0.5, 0.46, 0.05],
    [1.62, 0.78, 0.2, 0.12, 0.3], [1.8, 0.64, 0.19, 0.1, 0.4], [1.95, 0.5, 0.17, 0.08, 0.5]
  ];
  const TEETH_LOWER = [
    [0.26, 0.85, 0.4, 0.0, 0], [0.7, 0.8, 0.38, 0.05, 0],
    [1.62, 1.55, 0.5, 0.42, 0.05],
    [2.1, 0.66, 0.2, 0.12, 0.3], [2.28, 0.54, 0.19, 0.1, 0.4], [2.43, 0.42, 0.17, 0.08, 0.5]
  ];
  // 反った刃のような歯：ふくらんだ葉の形。根もとは丸く、外側は長い弧、内側はゆるくへこみ、先は中央側へ曲がった針のようにとがる
  function toothPath(x, y, len, w, bend, dir, side) {
    const p = new Path2D();
    const tx = x - side * bend, ty = y + dir * len;
    const top = y - dir * w * 0.12;
    p.moveTo(x, top);
    p.bezierCurveTo(x + side * w * 0.7, top + dir * w * 0.02, x + side * w * 0.62, y + dir * len * 0.5, tx + side * w * 0.14, y + dir * len * 0.86);
    p.quadraticCurveTo(tx + side * w * 0.04, y + dir * len * 0.96, tx, ty);
    p.bezierCurveTo(tx - side * w * 0.02, y + dir * len * 0.74, x - side * w * 0.5 - side * bend * 0.2, y + dir * len * 0.5, x - side * w * 0.5, y + dir * len * 0.14);
    p.bezierCurveTo(x - side * w * 0.52, top + dir * w * 0.1, x - side * w * 0.3, top, x, top);
    p.closePath();
    return p;
  }
  /*
   * 牙の列（歯ぐき・あごの線は描かない。ベタ塗りの白い歯だけ）。(cx, y) が列の中心と縁、dir＝+1 で下向き（上あご）、−1 で上向き（下あご）。
   * 下あごは大きな牙を外へずらして、上の牙が内側を通るように噛み合わせる。色は純白のベタ、見やすさのため歯のまわりにごく淡い暗い影だけを落とす
   */
  function teethRow(ctx, cx, y, S, dir, o = {}) {
    const alpha = clamp(o.alpha ?? 1);
    if (alpha <= 0.01 || S <= 1) return;
    const Sx = F();
    const list = o.lower ? TEETH_LOWER : TEETH;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowColor = Sx.rgba(o.shadow || '#1a0208', o.shadowA ?? 0.55);
    ctx.shadowBlur = S * (o.shadowA > 0.7 ? 0.08 : 0.05);
    ctx.fillStyle = o.fill || '#ffffff';
    const paths = [];
    list.forEach(([dx, len, w, bend, off]) => {
      [-1, 1].forEach(side => {
        const tp = toothPath(cx + side * dx * S, y + dir * off * S, len * S, w * S, bend * S, dir, side);
        paths.push(tp);
        ctx.fill(tp);
      });
    });
    // 縁取り（牙の戦闘開始の赤・黒・白用）：影を切ってから細い線で縁だけを描く
    if (o.rim) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = o.rim;
      ctx.lineWidth = S * (o.rimW ?? 0.022);
      ctx.lineJoin = 'round';
      paths.forEach(tp => ctx.stroke(tp));
    }
    ctx.restore();
  }

  /*
   * 血の飛沫（噛んだ点に叩きつけた血）：暗い紅の濃い塊が中心にあり、そこから放射状に細く尖った筋（先に玉がつくものも）が走り、
   * 大小さまざまな丸い滴が周りへ飛び散る。縁には明るい透けた薄い塗れ（にじみ）、塊には濃淡の層とつや、下の縁からは先に玉のついた垂れが伸びる。
   * tt は当たってからの秒数。はじめの 0.14 秒でいっぺんに広がり、そのあとはゆっくり落ち着いて垂れが伸びる。R は塊の半径、reach で飛び散る距離を変える
   */
  let splatBuf = null;
  function splatter(ctx, x, y, R, tt, o = {}) {
    const alpha = clamp(o.alpha ?? 1);
    if (tt <= 0 || R <= 2 || alpha <= 0.005) return;
    // 薄れるときは、いったん別の紙に描いてからまとめて薄める（層ごとに薄めると、重なりの縞が透けて見える）
    if (alpha < 0.995 && ctx.canvas) {
      const cv = ctx.canvas;
      if (!splatBuf || splatBuf.width !== cv.width || splatBuf.height !== cv.height) splatBuf = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cv.width, cv.height) : Object.assign(document.createElement('canvas'), { width: cv.width, height: cv.height });
      const bx = splatBuf.getContext('2d');
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.clearRect(0, 0, splatBuf.width, splatBuf.height);
      bx.setTransform(ctx.getTransform());
      splatterInner(bx, x, y, R, tt, o);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= alpha;
      ctx.drawImage(splatBuf, 0, 0);
      ctx.restore();
      return;
    }
    splatterInner(ctx, x, y, R, tt, o);
  }
  function splatterInner(ctx, x, y, R, tt, o) {
    const S = F();
    const seed = o.seed || 1;
    const alpha = 1;
    const reach = o.reach ?? 1;
    const burst = 1 - Math.pow(1 - clamp(tt / 0.14), 3);
    const settle = 1 - Math.exp(-tt * 3.5);
    const rr = R * (0.3 + 0.7 * burst) * (1 + 0.07 * settle);
    const NS = o.streaks ?? 32;
    const streaks = [];
    for (let i = 0; i < NS; i++) {
      const u = rnd(seed, i, 1);
      const long = i < NS * 0.35;
      streaks.push({
        a: rnd(seed, i, 2) * TAU,
        len: R * (long ? 2.0 + 1.5 * rnd(seed, i, 3) : 1.05 + 0.9 * rnd(seed, i, 3)) * reach,
        w: R * (long ? 0.05 + 0.05 * rnd(seed, i, 4) : 0.07 + 0.09 * rnd(seed, i, 4)),
        curl: (rnd(seed, i, 5) - 0.5) * 0.7,
        bulb: u < 0.22,
        delay: 0.03 * rnd(seed, i, 6)
      });
    }
    const ph = [rnd(seed, 200, 1) * TAU, rnd(seed, 201, 1) * TAU, rnd(seed, 202, 1) * TAU];
    const radial = (a, k) => {
      let m = 0.84 + 0.1 * Math.sin(2 * a + ph[0] + k) + 0.07 * Math.sin(3 * a + ph[1] + k * 2) + 0.06 * Math.sin(5 * a + ph[2] + k * 3) + 0.05 * Math.sin(9 * a + ph[0] + k * 5) + 0.035 * Math.sin(17 * a + k * 7) + 0.02 * Math.sin(29 * a + k);
      streaks.forEach(s => { const da = Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a)); m += 0.1 * Math.exp(-da * da / 0.06); });
      return m;
    };
    const corePath = (scale, k, ox, oy) => {
      const p = new Path2D();
      const n = 72, pts = [];
      for (let i = 0; i < n; i++) { const a = i / n * TAU; const m = radial(a, k) * scale; pts.push([x + ox + Math.cos(a) * rr * m, y + oy + Math.sin(a) * rr * m * 0.92]); }
      for (let i = 0; i < n; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % n], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        if (i === 0) p.moveTo(mx, my); else p.quadraticCurveTo(p0[0], p0[1], mx, my);
      }
      p.closePath();
      return p;
    };
    ctx.save();
    ctx.globalAlpha *= alpha;
    // 縁の明るい透けた塗れ（にじみ）と、その下の暗い染み
    if (burst > 0.3) {
      for (let q = 0; q < 7; q++) {
        const a = rnd(seed, 300 + q, 1) * TAU, d = rr * (0.85 + 0.55 * rnd(seed, 310 + q, 1));
        const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d;
        const L = R * (0.35 + 0.4 * rnd(seed, 320 + q, 1)), Wd = L * (0.4 + 0.25 * rnd(seed, 330 + q, 1));
        ctx.save();
        ctx.translate(sx, sy); ctx.rotate(a);
        ctx.fillStyle = S.rgba('#7a0a16', 0.3 * burst);
        ctx.beginPath(); ctx.ellipse(0, 0, L, Wd, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = S.rgba('#ff7a84', 0.2 * burst);
        ctx.beginPath(); ctx.ellipse(L * 0.1, 0, L * 0.78, Wd * 0.7, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // 垂れ：下の縁から、先に玉をつけてゆっくり伸びる（塊の下にもぐらせる）
    const ND = o.drips ?? 4;
    for (let i = 0; i < ND; i++) {
      const dl = R * (0.55 + 1.0 * rnd(seed, 400 + i, 1)) * (1 - Math.pow(1 - clamp((tt - 0.22 - 0.12 * rnd(seed, 410 + i, 1)) / 1.5), 2.5));
      drip(ctx, x + (rnd(seed, 420 + i, 1) - 0.5) * rr * 1.5, y + rr * 0.55, dl + rr * 0.3, R * (0.05 + 0.035 * rnd(seed, 430 + i, 1)), 1);
    }
    // 筋：根もとは太く、先は細く尖る。暗い下地 → 本色 → 細い明るい芯の3層。ときどき先に玉
    const tipOf = s => Math.min(1, Math.max(0, (tt - s.delay) / (0.14 + 0.05 * (s.w / R))));
    [[1.35, '#3a0510', 0.95], [1.0, '#b00e1c', 1], [0.34, '#f04450', 0.55]].forEach(([wm, col, al], pass) => {
      streaks.forEach(s => {
        const k = 1 - Math.pow(1 - tipOf(s), 3);
        if (k <= 0.01) return;
        const r0 = rr * 0.5, r1 = r0 + s.len * k;
        const ca = Math.cos(s.a), sa = Math.sin(s.a), px = -sa, py = ca;
        const w = s.w * wm * (1 - 0.2 * settle);
        // 中心線は少しうねり、幅は根もとから先へ急に細くなる（細い触手のように）
        const NP = 9, L = [], Rg = [];
        let tx = 0, ty = 0;
        for (let n = 0; n <= NP; n++) {
          const q = n / NP;
          const rad = r0 + (r1 - r0) * q;
          const lat = s.curl * rad * 0.16 * Math.sin(Math.PI * q) + (rnd(seed, 1000 + n, 1) - 0.5) * 0 + Math.sin(q * 5 + s.a * 3) * w * 0.35 * q;
          const hw = w * Math.pow(1 - q, 1.7) + (q < 1 ? w * 0.03 : 0);
          const cx2 = x + ca * rad + px * lat, cy2 = y + sa * rad + py * lat;
          L.push([cx2 + px * hw, cy2 + py * hw]); Rg.push([cx2 - px * hw, cy2 - py * hw]);
          tx = cx2; ty = cy2;
        }
        ctx.fillStyle = S.rgba(col, al);
        ctx.beginPath();
        ctx.moveTo(L[0][0], L[0][1]);
        for (let n = 1; n <= NP; n++) ctx.lineTo(L[n][0], L[n][1]);
        for (let n = NP; n >= 0; n--) ctx.lineTo(Rg[n][0], Rg[n][1]);
        ctx.closePath(); ctx.fill();
        if (s.bulb && pass < 2) {
          ctx.beginPath(); ctx.arc(tx - ca * w * 0.2, ty - sa * w * 0.2, w * (pass ? 0.38 : 0.5), 0, TAU); ctx.fill();
        }
      });
    });
    // 塊：外はやや鮮やかな赤、内へ向かって暗い紅、中心はほぼ黒い赤（にじませて重ねるので、段差でなく濃淡に見える）
    const layers = [[1.14, '#2a0208', 0, 0, 0.9, 0], [1.0, '#b30f1d', 1, 0, 1, 0.03], [0.84, '#8a0b18', 2, -0.02, 1, 0.05], [0.62, '#5a0712', 3, 0.02, 1, 0.06], [0.36, '#2e0309', 4, 0.03, 1, 0.07]];
    layers.forEach(([sc, col, k, off, al, bl]) => {
      ctx.save();
      if (bl) ctx.filter = `blur(${(R * bl).toFixed(1)}px)`;
      ctx.fillStyle = S.rgba(col, al);
      ctx.fill(corePath(sc, k * 1.3, off * rr, off * rr * 1.2));
      ctx.restore();
    });
    // つやと筋の質感（塊の中だけ）
    ctx.save();
    ctx.clip(corePath(1.0, 1, 0, 0));
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const a = rnd(seed, 500 + i, 1) * TAU, r1 = rr * (0.25 + 0.2 * rnd(seed, 520 + i, 1)), r2 = rr * (0.7 + 0.3 * rnd(seed, 540 + i, 1));
      ctx.strokeStyle = i % 3 ? S.rgba('#2a0208', 0.2) : S.rgba('#ff6a72', 0.14);
      ctx.lineWidth = Math.max(0.8, R * 0.012 * (0.5 + rnd(seed, 560 + i, 1)));
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke();
    }
    for (let q = 0; q < 9; q++) {
      const a = rnd(seed, 650 + q, 1) * TAU, d = rr * 0.75 * Math.sqrt(rnd(seed, 660 + q, 1));
      puff(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (0.12 + 0.18 * rnd(seed, 670 + q, 1)), rr * (0.08 + 0.1 * rnd(seed, 680 + q, 1)), q % 2 ? '#d01a28' : '#1a0106', 0.3);
    }
    puff(ctx, x - rr * 0.3, y - rr * 0.34, rr * 0.34, rr * 0.16, '#ff8890', 0.3);
    ctx.strokeStyle = S.rgba('#ffd6d6', 0.55);
    for (let i = 0; i < 4; i++) {
      const a0 = (rnd(seed, 600 + i, 1) * 0.9 + 3.4), rad = rr * (0.3 + 0.35 * rnd(seed, 610 + i, 1));
      ctx.lineWidth = Math.max(1, R * (0.016 + 0.014 * rnd(seed, 620 + i, 1)));
      ctx.beginPath(); ctx.arc(x, y, rad, a0, a0 + 0.35 + 0.3 * rnd(seed, 630 + i, 1)); ctx.stroke();
    }
    if (o.grain) grain(ctx, o.grain);
    ctx.restore();
    // 筋の先の細かい飛沫（筋が伸びた先に、ごく小さな点が並んで飛ぶ）
    streaks.forEach((s, si) => {
      if (si >= NS * 0.35) return;
      const k = 1 - Math.pow(1 - tipOf(s), 3);
      if (k < 0.9) return;
      for (let q = 0; q < 4; q++) {
        const rd = s.len * (1.04 + 0.12 * q * (0.6 + rnd(seed, 900 + si * 7 + q, 1)));
        ctx.fillStyle = S.rgba('#a80f1c', 0.9);
        ctx.beginPath(); ctx.arc(x + Math.cos(s.a + s.curl * 0.1) * rd, y + Math.sin(s.a + s.curl * 0.1) * rd, Math.max(0.8, R * (0.018 - 0.003 * q)), 0, TAU); ctx.fill();
      }
    });
    // 滴：さまざまな大きさの丸。大きいものは飛んでいる間、飛ぶ向きに細長く、ツヤの白い光つき
    const ND2 = o.drops ?? 90;
    for (let i = 0; i < ND2; i++) {
      const u = rnd(seed, 700 + i, 1);
      const a = rnd(seed, 720 + i, 1) < 0.55 ? streaks[Math.floor(rnd(seed, 740 + i, 1) * NS)].a + (rnd(seed, 760 + i, 1) - 0.5) * 0.3 : rnd(seed, 780 + i, 1) * TAU;
      const d0 = R * (1.25 + 2.7 * Math.pow(rnd(seed, 800 + i, 1), 0.9)) * reach;
      const tapp = d0 / (R * 20);
      if (tt < tapp) continue;
      const k = clamp((tt - tapp) / 0.12);
      const dist = d0 * (0.8 + 0.2 * (1 - Math.pow(1 - k, 3)));
      const r = u < 0.06 ? R * (0.1 + 0.07 * rnd(seed, 820 + i, 1)) : u < 0.3 ? R * (0.045 + 0.04 * rnd(seed, 820 + i, 1)) : R * (0.012 + 0.022 * rnd(seed, 820 + i, 1));
      const sag = R * 0.45 * Math.pow(Math.max(0, tt - tapp - 0.1), 2) * (0.4 + rnd(seed, 840 + i, 1));
      const dx = x + Math.cos(a) * dist, dy = y + Math.sin(a) * dist + sag;
      const st = 1 + 1.4 * (1 - k);
      if (r < 1.3) { ctx.fillStyle = S.rgba('#a80f1c', 0.95); ctx.beginPath(); ctx.arc(dx, dy, Math.max(0.7, r), 0, TAU); ctx.fill(); continue; }
      ctx.save();
      ctx.translate(dx, dy); ctx.rotate(a); ctx.scale(st, 1 / Math.sqrt(st));
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ff4a54'); g.addColorStop(0.5, '#c01420'); g.addColorStop(1, '#4a0610');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      if (r > 2.5) {
        ctx.fillStyle = S.rgba('#fff0f0', 0.85);
        ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
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

  root.TextApngVampireFx = { puff, bat, moon, teethRow, splatter, drip, cracks, flare, band, BLOOD, BONE };
})(typeof window !== 'undefined' ? window : globalThis);
