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
    // 血に染まった牙のごく淡いつや（細い明るい縦の筋）
    if (o.gloss) {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowBlur = 0;
      list.forEach(([dx, len, w, bend, off]) => {
        [-1, 1].forEach(side => {
          const x0 = cx + side * dx * S, y0 = y + dir * off * S;
          ctx.save();
          ctx.clip(toothPath(x0, y0, len * S, w * S, bend * S, dir, side));
          ctx.fillStyle = `rgba(255, 130, 130, ${o.gloss})`;
          ctx.beginPath(); ctx.ellipse(x0 + side * w * S * 0.2, y0 + dir * len * S * 0.4, w * S * 0.1, len * S * 0.3, 0, 0, TAU); ctx.fill();
          ctx.restore();
        });
      });
    }
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
   * 血だまりの飛沫（オリジナルの形）：固定の形の血しぶきが、噛んだ点から広がって収まる。ほぼ一色の暗い赤の斜めの塊に、左下の重い張り出し、右上へ斜めに並ぶ大きめの滴、長さの違う2本の垂れ。
   * 形はシード固定の乱数で一度だけ作る（重なった楕円と細い葉形の和集合なので、縁は丸い凹凸と細い筋でざらつく）。べたっとした4色の塗りだけで、ぼかしや光のにじみ、つやは使わない。
   * (x, y) は塊の中心、u は大きさ（1 で塊の幅が約 370）。tt は弾けてからの秒数。約0.3秒で中心から形ごと広がり、滴も形の一部として塊といっしょに現れる（飛び散らない）
   */
  const SPLAT_TONE = { 1: '#2f0303', 2: '#6f0d0e', 3: '#8a0809', 4: '#a3020c' };
  let splatShapes = null;
  const splatCache = {};
  function splatBuild() {
    const rr = (i, q = 0) => rnd(4242, i, q);
    const lens = (p, x, y, L, w, rot) => {         // 両端がとがった細い葉形（中心 x,y・長さ L・太さ w・向き rot）
      const c = Math.cos(rot), s = Math.sin(rot);
      const P = (a, b) => [x + a * c - b * s, y + a * s + b * c];
      const [a0, a1] = [P(-L / 2, 0), P(L / 2, 0)], m1 = P(-L * 0.1, -w), m2 = P(-L * 0.1, w);
      p.moveTo(a0[0], a0[1]); p.quadraticCurveTo(m1[0], m1[1], a1[0], a1[1]); p.quadraticCurveTo(m2[0], m2[1], a0[0], a0[1]); p.closePath();
    };
    const ell = (p, x, y, rx, ry, rot) => { p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
    const main = new Path2D(), dark = new Path2D(), black = new Path2D(), bright = new Path2D(), drips = [];
    const lean = 0.3;                                   // 塊の傾き（右下がり）
    const ax = 195, ay = 118;
    const edge = a => {                                 // 塊の縁の半径（角度ごと）：楕円＋左下の張り出し＋ゆるいうねり
      const ca = Math.cos(a - lean), sa = Math.sin(a - lean);
      let r = 1 / Math.sqrt((ca / ax) ** 2 + (sa / ay) ** 2);
      r *= 1 + 0.12 * Math.sin(3 * a + 0.8) + 0.07 * Math.sin(5 * a + 2.1) + 0.05 * Math.sin(9 * a + 4.4);
      const da = Math.atan2(Math.sin(a - 2.35), Math.cos(a - 2.35));   // 左下
      r += 62 * Math.exp(-da * da / 0.5);
      return r;
    };
    ell(main, 0, 0, ax, ay, lean);
    // 縁をなぞる大小の丸（丸い凹凸）
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * Math.PI * 2 + (rr(i, 1) - 0.5) * 0.12, e = edge(a), rad = 16 + 40 * rr(i, 2);
      ell(main, Math.cos(a) * (e - rad * 0.55), Math.sin(a) * (e - rad * 0.55), rad, rad * (0.7 + 0.5 * rr(i, 3)), a);
    }
    // 縁の細かいざらつき：小さな丸
    for (let i = 0; i < 120; i++) {
      const a = rr(100 + i, 1) * Math.PI * 2, e = edge(a) * (0.94 + 0.2 * rr(100 + i, 2)), rad = 3 + 9 * rr(100 + i, 3);
      ell(main, Math.cos(a) * e, Math.sin(a) * e, rad, rad * (0.6 + 0.6 * rr(100 + i, 4)), a);
    }
    // 外へ走る細い筋と破片（葉形）：右上へ向かうものを長く、左下はまばらに短く
    for (let i = 0; i < 70; i++) {
      const a = rr(200 + i, 1) * Math.PI * 2, e = edge(a);
      const bias = 0.55 + 0.45 * Math.cos(a + 0.75);        // 右上が長い
      const L = (26 + 120 * Math.pow(rr(200 + i, 2), 1.8)) * (0.5 + bias), w = 2 + 6 * rr(200 + i, 3);
      const rot = a + (rr(200 + i, 4) - 0.5) * 0.4;
      lens(main, Math.cos(a) * (e + L * 0.3), Math.sin(a) * (e + L * 0.3), L, w, rot);
    }
    for (let i = 0; i < 5; i++) {                                  // 長い筋
      const a = -0.35 + (i - 2) * 0.34 + (rr(300 + i, 1) - 0.5) * 0.2, e = edge(a), L = 110 + 80 * rr(300 + i, 2);
      lens(main, Math.cos(a) * (e + L * 0.35), Math.sin(a) * (e + L * 0.35), L, 7 + 7 * rr(300 + i, 3), a);
    }
    // 左下の重い張り出し（暗い赤）と、その中の黒に近い染み
    ell(dark, -150, 70, 100, 62, -0.5); ell(dark, -100, 112, 66, 40, 0.15); ell(dark, -200, 28, 46, 30, -0.9); ell(dark, -60, 90, 40, 26, 0.5);
    for (let i = 0; i < 10; i++) { const a = rr(500 + i, 1) * Math.PI * 2, d = 40 + 70 * rr(500 + i, 2); ell(dark, -150 + Math.cos(a) * d, 70 + Math.sin(a) * d * 0.7, 10 + 18 * rr(500 + i, 3), 6 + 12 * rr(500 + i, 4), a); }
    ell(black, -120, 126, 26, 11, 0.1); ell(black, -178, 56, 18, 8, -0.7);
    // 右上の鮮やかな帯
    ell(bright, 120, -52, 92, 34, -0.5); ell(bright, 70, -88, 54, 20, -0.7); ell(bright, 165, -20, 40, 22, -0.4);
    // 垂れ：長いもの（左下の張り出しから）と短いもの（右寄りの下の縁から）
    drips.push({ x: -128, y: 118, len: 220, w: 15, tone: 2 }, { x: 78, y: 96, len: 118, w: 11, tone: 3 });
    // 衛星の滴：右上へ斜めに並ぶ大きめの滴の扇と、まわりのばらけた粒
    const sat = [];
    for (let i = 0; i < 230; i++) {
      const fan = i < 90;
      const a = fan ? -0.3 + (rr(400 + i, 1) - 0.5) * 1.3 : rr(400 + i, 1) * Math.PI * 2;
      const e = edge(a), d = e + (fan ? 40 + 170 * Math.pow(rr(400 + i, 2), 0.9) : 24 + 120 * Math.pow(rr(400 + i, 2), 1.1));
      const u = rr(400 + i, 3);
      let rad = u < 0.55 ? 2 + 3 * rr(400 + i, 4) : u < 0.9 ? 4.5 + 5 * rr(400 + i, 4) : 9 + 10 * rr(400 + i, 4);
      if (fan && i < 6) rad = 14 + 12 * rr(400 + i, 5);
      const t = rr(400 + i, 6);
      sat.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rx: rad * (1 + 0.5 * rr(400 + i, 7)), ry: rad, rot: a, tone: t < 0.3 ? 2 : t < 0.62 ? 3 : 4, dist: d });
    }
    return { main, dark, black, bright, drips, sat };
  }
  // 血溜まりの見本 A〜E：同じ描き方（形ごと広がる・べたっとした4色）で、形だけを作り分ける。形は仕様の表から、シード固定の乱数で一度だけ作る
  function splatBuildSpec(sp) {
    const rr = (i, q = 0) => rnd(sp.seed, i, q);
    const TAUc = Math.PI * 2;
    const lens = (p, x, y, L, w, rot) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const P = (a, b) => [x + a * c - b * s, y + a * s + b * c];
      const a0 = P(-L / 2, 0), a1 = P(L / 2, 0), m1 = P(-L * 0.1, -w), m2 = P(-L * 0.1, w);
      p.moveTo(a0[0], a0[1]); p.quadraticCurveTo(m1[0], m1[1], a1[0], a1[1]); p.quadraticCurveTo(m2[0], m2[1], a0[0], a0[1]); p.closePath();
    };
    const ell = (p, x, y, rx, ry, rot) => { p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); p.ellipse(x, y, rx, ry, rot, 0, TAUc); };
    const main = new Path2D(), dark = new Path2D(), black = new Path2D(), bright = new Path2D();
    const { ax, ay, lean } = sp;
    const wob = sp.wob || [0.12, 0.07, 0.05];
    const edge = a => {
      const ca = Math.cos(a - lean), sa = Math.sin(a - lean);
      let r = 1 / Math.sqrt((ca / ax) ** 2 + (sa / ay) ** 2);
      r *= 1 + wob[0] * Math.sin(3 * a + sp.seed) + wob[1] * Math.sin(5 * a + sp.seed * 2) + wob[2] * Math.sin(9 * a + sp.seed * 3);
      (sp.bumps || []).forEach(b => { const da = Math.atan2(Math.sin(a - b[0]), Math.cos(a - b[0])); r += b[2] * Math.exp(-da * da / b[1]); });
      return r;
    };
    ell(main, 0, 0, ax, ay, lean);
    (sp.chain || []).forEach(c => ell(main, c[0], c[1], c[2], c[3], c[4] || 0));
    const R = sp.rim;
    for (let i = 0; i < R.n; i++) {
      const a = i / R.n * TAUc + (rr(i, 1) - 0.5) * 0.12, e = edge(a), rad = R.r0 + R.r1 * rr(i, 2);
      ell(main, Math.cos(a) * (e - rad * 0.55), Math.sin(a) * (e - rad * 0.55), rad, rad * (0.65 + 0.5 * rr(i, 3)), a);
    }
    for (let i = 0; i < sp.grain; i++) {
      const a = rr(100 + i, 1) * TAUc, e = edge(a) * (0.93 + 0.2 * rr(100 + i, 2)), rad = 2.5 + 8 * rr(100 + i, 3);
      ell(main, Math.cos(a) * e, Math.sin(a) * e, rad, rad * (0.6 + 0.6 * rr(100 + i, 4)), a);
    }
    const SP = sp.splinter;
    for (let i = 0; i < SP.n; i++) {
      const a = rr(200 + i, 1) * TAUc, e = edge(a);
      const bias = SP.bias ? SP.bias(a) : 1;
      const L = (SP.l0 + SP.l1 * Math.pow(rr(200 + i, 2), SP.pw || 1.8)) * bias, w = 1.6 + SP.w * rr(200 + i, 3);
      lens(main, Math.cos(a) * (e + L * 0.3), Math.sin(a) * (e + L * 0.3), L, w, a + (rr(200 + i, 4) - 0.5) * (SP.jit ?? 0.4));
    }
    (sp.streaks || []).forEach((s, i) => { const e = edge(s[0]); lens(main, Math.cos(s[0]) * (e + s[1] * 0.35), Math.sin(s[0]) * (e + s[1] * 0.35), s[1], s[2], s[0] + (s[3] || 0)); });
    (sp.dark || []).forEach(c => ell(dark, c[0], c[1], c[2], c[3], c[4] || 0));
    (sp.darkSpots || []).forEach(d => { for (let i = 0; i < d.n; i++) { const a = rr(500 + i, 1) * TAUc, dd = d.d * rr(500 + i, 2); ell(dark, d.x + Math.cos(a) * dd, d.y + Math.sin(a) * dd * 0.7, 8 + 16 * rr(500 + i, 3), 5 + 11 * rr(500 + i, 4), a); } });
    (sp.black || []).forEach(c => ell(black, c[0], c[1], c[2], c[3], c[4] || 0));
    (sp.bright || []).forEach(c => ell(bright, c[0], c[1], c[2], c[3], c[4] || 0));
    const drips = (sp.drips || []).map(d => ({ x: d[0], y: d[1], len: d[2], w: d[3], tone: d[4] || 3 }));
    const sat = [];
    const SA = sp.sat;
    for (let i = 0; i < SA.n; i++) {
      const fan = i < (SA.fan ? SA.fan.n : 0);
      const a = fan ? SA.fan.a + (rr(400 + i, 1) - 0.5) * SA.fan.spread : (SA.ringA ? SA.ringA(rr(400 + i, 1)) : rr(400 + i, 1) * TAUc);
      const e = edge(a);
      let d = e + (fan ? SA.fan.near + SA.fan.far * Math.pow(rr(400 + i, 2), 0.9) : SA.near + SA.far * Math.pow(rr(400 + i, 2), 1.1));
      if (Math.abs(Math.sin(a) * d) > 318) d *= 318 / Math.abs(Math.sin(a) * d);   // 枠の上下からはみ出さない
      const u = rr(400 + i, 3);
      let rad = u < 0.55 ? 1.8 + 3 * rr(400 + i, 4) : u < 0.9 ? 4 + 5 * rr(400 + i, 4) : 8 + 9 * rr(400 + i, 4);
      if (fan && i < (SA.bigs || 0)) rad = 13 + 11 * rr(400 + i, 5);
      const t = rr(400 + i, 6), st = rad > 5 ? 1.15 + (SA.stretch ?? 0.5) * rr(400 + i, 7) : 1 + 0.4 * rr(400 + i, 7);
      sat.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, rx: rad * st, ry: rad / Math.sqrt(st), rot: a, tone: t < 0.3 ? 2 : t < 0.62 ? 3 : 4, dist: d });
    }
    return { main, dark, black, bright, drips, sat };
  }
  const SPLAT_SPECS = {
    // A：基準の形を整えたもの。縁をもっと荒く、大きな滴は丸くせず細長く、左下の張り出しは縁を荒らして塊になじませる
    A: { seed: 11, ax: 195, ay: 118, lean: 0.3, bumps: [[2.35, 0.5, 62]], rim: { n: 54, r0: 12, r1: 36 }, grain: 190,
      splinter: { n: 120, l0: 22, l1: 120, w: 6, bias: a => 0.5 + 0.55 * (0.55 + 0.45 * Math.cos(a + 0.75)) },
      streaks: [[-0.7, 120, 7], [-0.36, 170, 8], [-0.02, 130, 7], [0.32, 100, 6], [-1.1, 110, 6]],
      dark: [[-150, 70, 88, 52, -0.5], [-102, 108, 56, 34, 0.15], [-200, 30, 40, 26, -0.9], [-64, 90, 34, 22, 0.5], [-120, 40, 60, 30, -0.3]],
      darkSpots: [{ x: -150, y: 70, d: 86, n: 16 }], black: [[-120, 126, 24, 9, 0.1]],
      bright: [[120, -52, 84, 30, -0.5], [72, -86, 50, 18, -0.7], [165, -20, 38, 20, -0.4]],
      drips: [[-122, 118, 230, 13, 2], [88, 98, 120, 10, 3], [8, 112, 64, 8, 2]],
      sat: { n: 260, fan: { n: 100, a: -0.3, spread: 1.3, near: 40, far: 175 }, bigs: 7, near: 22, far: 125, stretch: 0.9 } },
    // B：横に広い血だまり。下の縁に短い垂れが並び、滴は少なめ
    B: { seed: 22, ax: 330, ay: 76, lean: -0.04, wob: [0.1, 0.08, 0.05], bumps: [[0.5, 0.4, 24], [2.7, 0.5, 30]], rim: { n: 60, r0: 10, r1: 26 }, grain: 150,
      splinter: { n: 70, l0: 18, l1: 90, w: 5, bias: a => 0.4 + 1.1 * Math.cos(a) ** 2, jit: 0.25 },
      streaks: [[0.1, 130, 6], [3.1, 120, 6], [-0.12, 100, 5]],
      chain: [[-120, 20, 120, 52, 0.1], [140, 10, 110, 48, -0.1]],
      dark: [[-200, 14, 120, 40, 0.05], [-90, 30, 70, 24, -0.1]], darkSpots: [{ x: -200, y: 14, d: 100, n: 10 }], black: [[-180, 36, 30, 8, 0.05]],
      bright: [[170, -22, 90, 22, -0.08], [60, -34, 56, 14, 0.05]],
      drips: [[-250, 56, 70, 11, 2], [-170, 62, 110, 12, 3], [-70, 66, 50, 9, 3], [20, 68, 130, 13, 2], [120, 64, 80, 10, 3], [210, 56, 100, 11, 3], [290, 44, 46, 8, 2]],
      sat: { n: 80, fan: { n: 26, a: -0.15, spread: 1.0, near: 60, far: 150 }, bigs: 3, near: 26, far: 100, ringA: u => (u < 0.5 ? -0.5 + u * 1.0 : Math.PI - 0.5 + (u - 0.5) * 1.0), stretch: 0.8 } },
    // C：縦に長い、垂れの多い塊。4〜5本の垂れの長さを変える
    C: { seed: 33, ax: 138, ay: 100, lean: Math.PI / 2, wob: [0.1, 0.09, 0.06], bumps: [[1.57, 0.3, 24]], rim: { n: 46, r0: 10, r1: 28 }, grain: 130,
      splinter: { n: 70, l0: 16, l1: 90, w: 5, bias: a => 0.6 + 0.7 * Math.max(0, -Math.sin(a)) + 0.3 * Math.abs(Math.cos(a)) },
      streaks: [[-1.7, 120, 6], [-1.2, 100, 6], [3.5, 90, 5]],
      chain: [[0, -40, 80, 70, 0], [-30, 70, 60, 50, 0.4]],
      dark: [[-30, 20, 60, 44, 0.5], [40, 60, 40, 26, 0.2]], darkSpots: [{ x: -20, y: 30, d: 60, n: 10 }], black: [[-30, 80, 14, 8, 0.8]],
      bright: [[40, -60, 40, 20, -0.9], [20, -100, 26, 14, -1.2]],
      drips: [[-78, 100, 205, 13, 2], [-34, 118, 118, 11, 3], [20, 126, 190, 15, 2], [66, 112, 70, 10, 3], [104, 90, 150, 12, 3]],
      sat: { n: 120, fan: { n: 30, a: 1.9, spread: 1.4, near: 40, far: 120 }, bigs: 3, near: 24, far: 120, stretch: 0.9 } },
    // D：放射状の星形の飛沫。小さな核から細長い破片が四方へ伸び、細かい滴が多い
    D: { seed: 44, ax: 78, ay: 70, lean: 0.2, wob: [0.14, 0.1, 0.07], rim: { n: 26, r0: 10, r1: 20 }, grain: 90,
      splinter: { n: 150, l0: 50, l1: 140, w: 3.6, pw: 1.2, jit: 0.1, bias: a => 1 - 0.4 * Math.sin(a) ** 2 },
      streaks: Array.from({ length: 16 }, (_, i) => [i / 16 * Math.PI * 2 + 0.12, (150 + 50 * ((i * 37) % 7) / 7) * (1 - 0.3 * Math.sin(i / 16 * Math.PI * 2 + 0.12) ** 2), 4.5 + 2 * ((i * 13) % 5) / 5]),
      dark: [[-14, 8, 40, 28, 0.3]], black: [[-10, 6, 22, 14, 0.4]], bright: [[18, -14, 30, 14, -0.6]],
      drips: [[-26, 52, 60, 9, 2], [30, 46, 38, 7, 3]],
      sat: { n: 380, near: 40, far: 190, stretch: 0.5 } },
    // E：片側へ引きずったような斜めの塗り。片方の端が重く、反対へ細く伸び、滴が片側へ扇状に尾を引く
    E: { seed: 55, ax: 215, ay: 66, lean: -0.5, wob: [0.1, 0.06, 0.05], bumps: [[2.64, 0.5, 40]], rim: { n: 44, r0: 10, r1: 26 }, grain: 130,
      splinter: { n: 80, l0: 18, l1: 110, w: 5, bias: a => 0.4 + 1.1 * Math.max(0, Math.cos(a + 0.5)), jit: 0.3 },
      streaks: [[-0.5, 200, 7], [-0.62, 150, 6], [-0.38, 160, 6]],
      chain: [[-150, 90, 96, 70, -0.5], [-90, 56, 90, 52, -0.5], [-30, 22, 80, 42, -0.5], [60, -26, 70, 30, -0.5], [140, -66, 70, 18, -0.5]],
      dark: [[-150, 90, 70, 44, -0.5], [-110, 64, 40, 26, -0.4]], darkSpots: [{ x: -140, y: 86, d: 60, n: 10 }], black: [[-150, 104, 20, 8, -0.5]],
      bright: [[30, -4, 90, 22, -0.5], [120, -50, 60, 14, -0.5]],
      drips: [[-170, 140, 150, 14, 2], [-110, 106, 80, 10, 3]],
      sat: { n: 200, fan: { n: 120, a: -0.5, spread: 0.9, near: 30, far: 150 }, bigs: 8, near: 20, far: 100, stretch: 1.0 } }
  };
  /*
   * 血溜まりの見本 F〜J：図鑑の参考画像（透かし入りの素材）の「性格」だけを見て、形は一から作ったもの。画像の輪郭や画素は使っていない。
   * 二段で広がる：第1段（約0〜0.15秒）は小さな核と塊の一部と少しの滴、第2段（約0.15〜0.4秒）で塊の全体と外側の細かい滴・しぶきが最終の形まで出る。
   * 層ごとに現れる時刻（t0）と立ち上がり（ramp）を持つ。飛ばず、その場に現れる。
   */
  const SPLAT_RICH_TONE = { main: '#8a0809', dark: '#6f0d0e', bright: '#a3020c', black: '#2f0303', ink: '#b3150f', inkDark: '#8a0809', core: '#3a0305', vivid: '#d0140e', gloss: '#ffcfc4' };
  function splatBuildRich(kind) {
    const seed = { F: 61, G: 62, H: 63, I: 64, J: 65, K: 71, L: 72, M: 73, N: 74, O: 81, P: 82, Q: 83 }[kind];
    let k = 0;
    const rr = (q = 0) => rnd(seed, ++k, q);
    const TAUc = Math.PI * 2;
    const layers = [];
    const L = (fill, t0, ramp, a = 1) => { const l = { fill, path: new Path2D(), t0, ramp, a }; layers.push(l); return l.path; };
    const ell = (p, x, y, rx, ry, rot = 0) => { p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); p.ellipse(x, y, rx, ry, rot, 0, TAUc); };
    const lens = (p, x, y, len, w, rot) => {
      const c = Math.cos(rot), s2 = Math.sin(rot), P = (a, b) => [x + a * c - b * s2, y + a * s2 + b * c];
      const a0 = P(-len / 2, 0), a1 = P(len / 2, 0), m1 = P(-len * 0.1, -w), m2 = P(-len * 0.1, w);
      p.moveTo(a0[0], a0[1]); p.quadraticCurveTo(m1[0], m1[1], a1[0], a1[1]); p.quadraticCurveTo(m2[0], m2[1], a0[0], a0[1]); p.closePath();
    };
    // 縁が丸く凹凸する塊：中心の楕円に、縁をなぞる大小の丸と、外へ出る短い葉形を重ねる
    const blob = (p, x, y, r, sq = 1, rot = 0, rough = 1) => {
      ell(p, x, y, r, r * sq, rot);
      const n = Math.round(10 + r / 6);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAUc + rr(1) * 0.3, rad = r * (0.14 + 0.26 * rr(2)) * rough;
        const ex = Math.cos(a) * r * 0.92, ey = Math.sin(a) * r * 0.92 * sq, c = Math.cos(rot), s2 = Math.sin(rot);
        ell(p, x + ex * c - ey * s2, y + ex * s2 + ey * c, rad, rad * (0.7 + 0.5 * rr(3)), a + rot);
      }
    };
    // 先に向かって細くなる曲がった筋（始点・制御点・終点、根元の太さ w0、先の太さ w1）
    const tendril = (p, x0, y0, cx, cy, x1, y1, w0, w1) => {
      const N = 18, Lp = [], Rp = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, mt = 1 - t;
        const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1, y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
        let dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
        const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const w = w0 + (w1 - w0) * Math.pow(t, 0.7);
        Lp.push([x - dy * w, y + dx * w]); Rp.push([x + dy * w, y - dx * w]);
      }
      const pts = Lp.concat(Rp.slice().reverse());
      let ar = 0; for (let i = 0; i < pts.length; i++) { const q = pts[i], r2 = pts[(i + 1) % pts.length]; ar += q[0] * r2[1] - r2[0] * q[1]; }
      if (ar < 0) pts.reverse();                              // 向きをそろえる（重ねても穴があかない）
      p.moveTo(pts[0][0], pts[0][1]); pts.forEach(q => p.lineTo(q[0], q[1])); p.closePath();
    };
    const YL = 245;                                          // 枠の上下からはみ出さない
    const cy_ = y => Math.max(-YL, Math.min(YL, y));
    const stage = (d, d1, d2) => (d < d1 ? [0.04 + d / d1 * 0.06, 0.07] : d < d2 ? [0.14 + (d - d1) / (d2 - d1) * 0.06, 0.1] : [0.2 + Math.min(0.1, (d - d2) / 200 * 0.1), 0.1]);
    const bk = {};
    const bucket = (key, fill, t0, rp) => bk[key] || (bk[key] = L(fill, t0, rp));
    const addDrip = (x, y, len, w, fill, t0, gl) => layers.push({ drip: { x, y, len, w, gl }, fill, t0, ramp: 0.05, a: 1 });
    const hl = [];                                           // つやの点（Iと一部のJだけ）
    const dropAt = (p, x, y, r, rx = 1) => ell(p, x, y, r * rx, r, 0);
    // ---- K〜N 用の部品（F〜Jの描き方・乱数には触れない） ----
    const KN = 'KLMNOPQ'.indexOf(kind) >= 0;
    const okp = (x, y) => Math.abs(y) <= (KN ? 205 : YL) && Math.abs(x) <= (KN ? 420 : 500);
    const cdrip = (p, x, y, len, w, sway) => {                       // 自然な垂れ：根元は太く、先へ細くなり、少し曲がる（先に玉は付けない）
      const x1 = x + sway, y1 = y + len, w1 = w * 0.5;
      tendril(p, x, y - 24, x + sway * 0.2, y + len * 0.55, x1, y1, w, w1); ell(p, x1, y1, w1, w1 * 1.25, 0);
    };
    const gs = () => (rr(5) + rr(6) + rr(7) - 1.5) * 1.1;          // 山なりのばらつき
    const wedge = (p, x0, y0, x1, y1, w0, w1, bend) => {            // 先がとがった太い張り出し（先に玉はつけない）
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
      tendril(p, x0, y0, mx + nx / nl * bend, my + ny / nl * bend, x1, y1, w0, w1);
    };
    // 細かいしぶき：針のような筋と丸い粒。群れ（clumps: [角度, 距離, 角のばらつき, 距離のばらつき, 重み]）ごとに偏らせ、一方に濃くする
    const spray = (fill, n, ox, oy, clumps, o) => {
      const wsum = clumps.reduce((a, c) => a + c[4], 0), ky = o.ky || 1;
      for (let i = 0; i < n; i++) {
        let u = rr(8) * wsum, c = clumps[0]; for (const q of clumps) { if (u < q[4]) { c = q; break; } u -= q[4]; }
        const a = c[0] + gs() * c[2], d = Math.max(30, c[1] + gs() * c[3]);
        const x = ox + Math.cos(a) * d, y = oy + Math.sin(a) * d * ky;
        if (!okp(x, y)) continue;
        const [t0, rp] = stage(d, o.d1, o.d2);
        const lp = bucket(o.key + (t0 * 100 | 0), fill, t0, rp);
        if (rr(9) < o.needleP) { const len = 10 + 46 * Math.pow(rr(10), 1.8) * (0.6 + d / 360), w = 0.9 + 1.5 * rr(11); lens(lp, x, y, len, w, Math.atan2(y - oy, x - ox)); }
        else { const r = 0.9 + 2.4 * Math.pow(rr(12), 1.5); ell(lp, x, y, r, r * (0.7 + 0.5 * rr(13)), rr(14) * 3); }
      }
    };
    // 自然な滴：中くらいの大きさのものが芯のまわりに固まる。柄は付けず、少し縦に伸びたものや横に潰れたものを混ぜる
    const drops = (fill, n, centers, o) => {
      for (let i = 0; i < n; i++) {
        const c = centers[(rr(15) * centers.length) | 0], x = c[0] + gs() * c[2], y = c[1] + gs() * c[3];
        if (!okp(x, y)) continue;
        const d = Math.hypot(x - (o.ox || 0), y - (o.oy || 0)), [t0, rp] = stage(d, o.d1, o.d2);
        const lp = bucket(o.key + (t0 * 100 | 0), fill, t0, rp);
        const r = 4 + (o.rmax || 20) * Math.pow(rr(16), 1.5), sq = 0.75 + 0.6 * rr(17);
        ell(lp, x, y, r * sq, r / Math.sqrt(sq), rr(18) * 3);
        if (o.rec && r > (o.rmin || 8)) o.rec.push([x, y, r]);
        if (rr(19) < 0.45) { const a = rr(20) * TAUc, dd = r * (1.4 + rr(21)), r2 = 1.5 + 0.3 * r * rr(22); ell(lp, x + Math.cos(a) * dd, y + Math.sin(a) * dd, r2, r2, 0); }
      }
    };
    // ぎざぎざの縁の帯：中心線 pts=[[x,y,幅]...] に沿って、縁をがたつかせ、切れ込み（notch: [位置0〜1, 深さ0〜1, 幅]）を入れる
    const ribbon = (p, pts, jag, notchL, notchR) => {
      const S = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9)); for (let j = 0; j < n; j++) { const t = j / n; S.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } }
      S.push(pts[pts.length - 1].slice());
      const Lp = [], Rp = [], N = S.length;
      S.forEach((q, i) => {
        const a = S[Math.max(0, i - 1)], b = S[Math.min(N - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const sPos = i / (N - 1), nm = (list) => (list || []).reduce((m, k) => m - k[1] * Math.exp(-Math.pow((sPos - k[0]) / k[2], 2)), 1);
        const wl = q[2] * nm(notchL) * (1 + jag * (rr(23) - 0.5) * 2) * (i === 0 || i === N - 1 ? 0.35 : 1), wr = q[2] * nm(notchR) * (1 + jag * (rr(24) - 0.5) * 2) * (i === 0 || i === N - 1 ? 0.35 : 1);
        Lp.push([q[0] - dy * wl, q[1] + dx * wl]); Rp.push([q[0] + dy * wr, q[1] - dx * wr]);
      });
      const poly = Lp.concat(Rp.slice().reverse());
      let ar = 0; for (let i = 0; i < poly.length; i++) { const q = poly[i], r2 = poly[(i + 1) % poly.length]; ar += q[0] * r2[1] - r2[0] * q[1]; }
      if (ar < 0) poly.reverse();
      p.moveTo(poly[0][0], poly[0][1]); poly.forEach(q => p.lineTo(q[0], q[1])); p.closePath();
      return S;
    };
    // 縁が崩れて消えていく細かい粒：中心線 S の近く（幅の 1.0〜1.8 倍）に、丸い粒を縁に近いほど濃く置く
    const dissolve = (fill, S, n, o) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; S.forEach(q => { x0 = Math.min(x0, q[0] - q[2] * 1.9); x1 = Math.max(x1, q[0] + q[2] * 1.9); y0 = Math.min(y0, q[1] - q[2] * 1.9); y1 = Math.max(y1, q[1] + q[2] * 1.9); });
      for (let i = 0; i < n; i++) {
        const x = x0 + (x1 - x0) * rr(25), y = y0 + (y1 - y0) * rr(26);
        let dn = 9; for (let j = 0; j < S.length; j += 2) { const q = S[j], d = Math.hypot(x - q[0], y - q[1]) / q[2]; if (d < dn) dn = d; }
        if (dn < 0.92 || dn > o.reach || !okp(x, y)) continue;
        if (rr(27) > Math.pow((o.reach - dn) / (o.reach - 0.92), o.fall || 1.3)) continue;
        const d = Math.hypot(x, y), [t0, rp] = stage(d, o.d1, o.d2);
        const lp = bucket(o.key + (t0 * 100 | 0), fill, t0, rp);
        const r = 0.9 + 2.3 * Math.pow(rr(28), 1.5); ell(lp, x, y, r, r * (0.7 + 0.5 * rr(29)), rr(30) * 3);
      }
    };

    if (kind === 'F') {
      // 太いべたっとした塊に、指のような葉と先の丸い腕。まわりは針のような細い筋と粉のような点が密に放射する（インクの飛沫）
      const T = SPLAT_RICH_TONE;
      const m1 = L(T.ink, 0, 0.06), m2 = L(T.ink, 0.14, 0.1);
      const lobes = [[0, 0, 82], [-62, 24, 60], [58, 30, 64], [10, -58, 56], [-40, -44, 46], [40, -30, 50], [8, 66, 50]];
      lobes.forEach((o, i) => blob(i < 3 ? m1 : m2, o[0], o[1], o[2], 0.85 + 0.2 * rr(4), rr(5) * 3, 0.9));
      for (let i = 0; i < 9; i++) {                          // 指のような腕
        const a = i / 9 * TAUc + (rr(6) - 0.5) * 0.5, len = 150 + 130 * rr(7), w0 = 26 + 12 * rr(8);
        const bend = (rr(9) - 0.5) * 0.7, x1 = Math.cos(a) * len, y1 = Math.sin(a) * len * 0.78;
        const p = i < 3 ? m1 : m2;
        tendril(p, Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a + bend) * len * 0.55, Math.sin(a + bend) * len * 0.5, x1, y1, w0, 11 + 5 * rr(10));
        const kn = 15 + 11 * rr(11); ell(p, x1, y1, kn, kn * (0.8 + 0.3 * rr(12)), a);
        if (rr(13) < 0.6) { const b = a + (rr(14) < 0.5 ? 0.5 : -0.5); tendril(m2, x1 * 0.6, y1 * 0.6, x1 * 0.8, y1 * 0.7, x1 * 0.6 + Math.cos(b) * 70, y1 * 0.6 + Math.sin(b) * 60, 9, 4); }
      }
      const sh = L(T.inkDark, 0.15, 0.1);                    // 影（右下寄り）
      ell(sh, 24, 28, 62, 44, 0.4); ell(sh, -40, 46, 36, 22, -0.3); ell(sh, 66, 4, 24, 36, 0.6);
      // 針のような筋と粉の点（距離で出る順を変える）
      for (let i = 0; i < 620; i++) {
        const a = rr(15) * TAUc, d = 130 + 330 * Math.pow(rr(16), 0.85), x = Math.cos(a) * d, y = cy_(Math.sin(a) * d * 0.58);
        const [t0, rp] = stage(d, 210, 330);
        const lp = bucket((t0 * 100 | 0), T.ink, t0, rp);
        const len = 12 + 70 * Math.pow(rr(17), 2) * (0.5 + d / 400), w = 1.1 + 2 * rr(18);
        lens(lp, x, y, len, w, Math.atan2(y, x));
      }
      for (let i = 0; i < 560; i++) {
        const a = rr(19) * TAUc, d = 100 + 380 * Math.pow(rr(20), 0.9), x = Math.cos(a) * d, y = cy_(Math.sin(a) * d * 0.58);
        const [t0, rp] = stage(d, 220, 340);
        const lp = bucket(1000 + (t0 * 100 | 0), T.ink, t0, rp);
        const r = 0.8 + 2.2 * Math.pow(rr(21), 1.6); ell(lp, x, y, r, r * (0.7 + 0.5 * rr(22)), rr(23) * 3);
      }
      const dp = L(T.ink, 0.17, 0.1);                        // 数個の丸い滴
      for (let i = 0; i < 10; i++) { const a = rr(24) * TAUc, d = 190 + 130 * rr(25), r = 6 + 9 * rr(26); dropAt(dp, Math.cos(a) * d, cy_(Math.sin(a) * d * 0.58), r, 1.2); }
    } else if (kind === 'G') {
      // 左下から右上へ斜めに走る塗り：軸に沿って大きな塊が並び、中を淡い塗り筋が通る。中くらいの滴と小さな滴が軸の両脇に散り、丸い大きな滴が離れて残る
      const T = SPLAT_RICH_TONE, ang = -0.56, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
      const P = (s, t) => [s * ux + t * vx, cy_(s * uy + t * vy)];
      const big = [[-330, 20, 40], [-235, -26, 52], [-140, 22, 46], [-52, -8, 78], [40, 12, 86], [128, -20, 58], [212, 16, 46], [292, -10, 56], [352, 20, 30]];
      const bs1 = L(T.main, 0, 0.06), bs2 = L(T.main, 0.15, 0.1), bs3 = L(T.main, 0.2, 0.1);
      big.forEach((o, i) => { const [x, y] = P(o[0], o[1]); const p = Math.abs(o[0]) < 100 ? bs1 : Math.abs(o[0]) < 230 ? bs2 : bs3; blob(p, x, y, o[2], 0.8 + 0.25 * rr(3), ang + rr(4) * 0.8, 1.1); for (let j = 0; j < 12; j++) { const a = rr(5) * TAUc, ln = 22 + 56 * rr(6); lens(p, x + Math.cos(a) * (o[2] + ln * 0.25), y + Math.sin(a) * (o[2] * 0.8 + ln * 0.25), ln, 1.8 + 2.4 * rr(7), a); } });
      const cr = L(T.dark, 0.1, 0.08);                        // 塊の濃い芯
      [-72, 18, 100, -170, 186].forEach(s => { const [x, y] = P(s, 0); ell(cr, x + 6, y + 6, 44 + 14 * rr(8), 30 + 10 * rr(9), ang); });
      const sm = L(T.bright, 0.14, 0.1, 0.9);                      // 淡い塗り筋
      { const [x, y] = P(-130, 16); lens(sm, x, y, 360, 22, ang); const [x2, y2] = P(110, -26); lens(sm, x2, y2, 190, 12, ang + 0.06); const [x3, y3] = P(-300, 40); lens(sm, x3, y3, 100, 9, ang - 0.05); }
      const dk = L(T.main, 0, 0.1);                           // 筋（細い葉形）
      for (let i = 0; i < 14; i++) { const s = -300 + 600 * rr(10), t = (rr(11) - 0.5) * 150, [x, y] = P(s, t); lens(dk, x, y, 40 + 70 * rr(12), 2 + 3 * rr(13), ang + (rr(14) - 0.5) * 0.9); }
      for (let i = 0; i < 110; i++) {                          // 中くらいの滴
        const s = -380 + 760 * rr(15), t = (rr(16) + rr(17) - 1) * 160, d = Math.abs(s), [x, y] = P(s, t), [t0, rp] = stage(d, 130, 260);
        const lp = bucket(2000 + (t0 * 100 | 0), T.main, t0, rp);
        const r = 6 + 20 * Math.pow(rr(18), 1.4); ell(lp, x, y, r * 1.2, r, ang + (rr(19) - 0.5) * 0.8);
      }
      for (let i = 0; i < 260; i++) {                          // 小さな滴と点
        const s = -400 + 800 * rr(20), t = (rr(21) + rr(22) - 1) * 190, d = Math.abs(s), [x, y] = P(s, t), [t0, rp] = stage(d, 140, 270);
        const lp = bucket(3000 + (t0 * 100 | 0), T.main, t0, rp);
        const r = 1.2 + 4 * Math.pow(rr(23), 1.4); ell(lp, x, y, r, r * (0.7 + 0.5 * rr(24)), rr(25) * 3);
      }
      const rd = L(T.main, 0.19, 0.1);                        // 離れた丸い大きな滴
      [[-300, 150, 24], [-120, -130, 18], [60, 150, 20], [190, -150, 26], [330, 90, 16], [-10, -180, 13], [250, 140, 15], [-200, 110, 12], [120, -110, 14]].forEach(o => { const [x, y] = P(o[0], o[1]); ell(rd, x, y, o[2], o[2], 0); });
    } else if (kind === 'H') {
      // ざらついた層：何枚かの傾いた粗い縁の面が重なり、縁は点に崩れて消える。暗い赤の面の上に明るい赤の点が散る。細かい点が外へ
      const T = SPLAT_RICH_TONE;
      const patch = (cx, cy, hw, hh, rot, fill, t0, n, ink) => {
        const p = L(fill, t0, 0.1), c = Math.cos(rot), s2 = Math.sin(rot);
        for (let i = 0; i < n; i++) {
          const lx = (rr(1) * 2 - 1) * hw, ly = (rr(2) * 2 - 1) * hh, e = Math.min(1 - Math.abs(lx) / hw, 1 - Math.abs(ly) / hh);
          if (rr(3) > Math.pow(Math.max(0, e) * 2.2, 0.8)) continue;
          const x = cx + lx * c - ly * s2, y = cy_(cy + lx * s2 + ly * c), z = 1.5 + 3 * rr(4) * (e > 0.3 ? 1.3 : 0.8);
          p.rect(x, y, z, z);
        }
        return p;
      };
      const core = L(T.main, 0, 0.07); blob(core, -10, 10, 120, 0.75, 0.3, 1.2); blob(core, 90, -20, 70, 0.8, -0.4, 1.2); blob(core, -90, 40, 60, 0.7, 0.2, 1.2);
      patch(-30, -10, 190, 120, 0.25, T.dark, 0.03, 3600); patch(150, 60, 130, 90, -0.5, T.dark, 0.14, 2200); patch(-170, 90, 120, 80, 0.6, T.dark, 0.15, 2000);
      patch(60, -80, 150, 70, -0.15, T.main, 0.05, 2600); patch(-120, -70, 110, 70, 0.4, T.main, 0.16, 1600); patch(190, -50, 90, 110, 0.2, T.dark, 0.2, 1500);
      patch(-10, 110, 170, 70, 0.1, T.main, 0.12, 2400); patch(-230, -20, 80, 120, -0.35, T.dark, 0.18, 1200); patch(40, -130, 120, 50, 0.3, T.dark, 0.2, 1200);
      const hole = L(T.black, 0.1, 0.1);                       // 乾いた穴（暗い抜け）
      for (let i = 0; i < 26; i++) { const x = -190 + 380 * rr(5), y = -90 + 200 * rr(6), n = 4 + (rr(7) * 7 | 0); for (let j = 0; j < n; j++) hole.rect(x + (rr(8) - 0.5) * 26, y + (rr(9) - 0.5) * 16, 3 + 3 * rr(10), 3 + 3 * rr(11)); }
      for (let b = 0; b < 3; b++) {                            // 外へ散る細かい点（距離で段階）
        const p = L(T.dark, [0.06, 0.17, 0.24][b], 0.1);
        for (let i = 0; i < [160, 240, 300][b]; i++) { const a = rr(12) * TAUc, d = [100, 190, 280][b] + 190 * rr(13), r = 1 + 2.4 * rr(14), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.5; p.rect(x, y, r * 1.4, r * 1.4); }
      }
      const vv = L(T.vivid, 0.08, 0.1);                       // 明るい赤の点（面の上）
      for (let i = 0; i < 150; i++) { const a = rr(15) * TAUc, d = 150 * Math.sqrt(rr(16)), r = 1.4 + 4.4 * Math.pow(rr(17), 1.7); ell(vv, Math.cos(a) * d * 1.3, Math.sin(a) * d * 0.8, r, r, 0); }
      const v2 = L(T.vivid, 0.2, 0.1);
      for (let i = 0; i < 90; i++) { const a = rr(18) * TAUc, d = 180 + 170 * rr(19), r = 1.2 + 3 * rr(20); ell(v2, Math.cos(a) * d, Math.sin(a) * d * 0.5, r, r, 0); }
      const dp = L(T.main, 0.18, 0.1); blob(dp, 210, -110, 28, 0.9, 0.2, 1); blob(dp, -230, 110, 22, 0.9, 0.2, 1);
    } else if (kind === 'I') {
      // つやのある飛沫：暗い芯、そのまわりの淡い透けたような暈、曲がった長い筋の先に丸い滴（つやの点つき）、細い糸と長い垂れ
      const T = SPLAT_RICH_TONE;
      const halo = L(T.bright, 0, 0.1, 0.42); blob(halo, 6, -6, 130, 0.82, 0.3, 1.8);
      const hal2 = L(T.bright, 0.14, 0.1, 0.4); blob(hal2, -20, -70, 90, 0.7, -0.4, 1.4); blob(hal2, 90, 30, 70, 0.7, 0.2, 1.4);
      const m1 = L(T.main, 0, 0.06); blob(m1, 0, 0, 96, 0.8, 0.3, 1.1);
      const m2 = L(T.main, 0.12, 0.1);
      const core = L(T.core, 0, 0.07); blob(core, 0, 4, 50, 0.7, 0.3, 1.5); blob(core, -34, 22, 28, 0.7, -0.2, 1.4);
      const mid = L(T.dark, 0.05, 0.08); ell(mid, 6, 4, 80, 56, 0.3);
      const ligs = [[-2.6, 360, 0.8], [-1.95, 300, -0.7], [-1.25, 340, 0.6], [-0.4, 380, -0.8], [0.3, 290, 0.7], [0.95, 230, -0.6], [2.15, 330, 0.7], [2.85, 370, -0.6], [1.6, 170, 0.3]];
      const drops = [];
      ligs.forEach((o, i) => {
        const [a, len, bend] = o, p = i < 4 ? m1 : m2, x1 = Math.cos(a) * len, y1 = cy_(Math.sin(a) * len * 0.82);
        const cxx = Math.cos(a + bend * 0.5) * len * 0.55, cyy = Math.sin(a + bend * 0.5) * len * 0.5;
        tendril(p, Math.cos(a) * 40, Math.sin(a) * 40, cxx, cyy, x1, y1, 19 + 6 * rr(1), 3.6);
        const r = 13 + 11 * rr(2); drops.push([x1 + Math.cos(a) * r * 0.5, cy_(y1 + Math.sin(a) * r * 0.5), r]);
      });
      const ths = L(T.main, 0.16, 0.1);                       // 細い糸と先の小さな滴
      for (let i = 0; i < 16; i++) {
        const a = rr(3) * TAUc, len = 200 + 200 * rr(4), x1 = Math.cos(a) * len, y1 = cy_(Math.sin(a) * len * 0.62), b = a + (rr(5) - 0.5) * 0.9;
        tendril(ths, Math.cos(a) * 80, Math.sin(a) * 70, Math.cos(b) * len * 0.5, Math.sin(b) * len * 0.45, x1, y1, 3.6, 1.1);
        drops.push([x1, y1, 3 + 5 * rr(6)]);
      }
      const dd = L(T.main, 0.17, 0.1);
      drops.forEach(d => ell(dd, d[0], d[1], d[2], d[2], 0));
      for (let i = 0; i < 70; i++) { const a = rr(7) * TAUc, d = 120 + 330 * Math.pow(rr(8), 0.9), r = 1.6 + 4.6 * Math.pow(rr(9), 1.5), x = Math.cos(a) * d, y = cy_(Math.sin(a) * d * 0.74); ell(dd, x, y, r, r, 0); if (r > 3.8) drops.push([x, y, r]); }
      const gl = L(T.gloss, 0.2, 0.1, 0.78);                  // つやの点
      drops.forEach(d => { if (d[2] > 4.5) ell(gl, d[0] - d[2] * 0.32, d[1] - d[2] * 0.38, d[2] * 0.3, d[2] * 0.18, -0.6); });
      addDrip(-70, 80, 150, 11, T.main, 0.18, true); addDrip(46, 90, 110, 9, T.main, 0.2, true); addDrip(110, 60, 70, 7, T.main, 0.22, true);
    } else if (kind === 'J') {
      // 上へ冠のように跳ねる飛沫：下は粗い点に崩れる広いにじみ、そこから曲がった筋が上へ扇状に伸び、先に丸い滴。細い垂れ
      const T = SPLAT_RICH_TONE;
      const base = L(T.dark, 0.02, 0.1);
      for (let i = 0; i < 3400; i++) {
        const lx = (rr(1) * 2 - 1) * 270, ly = (rr(2) * 2 - 1) * 90, e = Math.min(1 - Math.abs(lx) / 270, 1 - Math.abs(ly) / 90);
        if (rr(3) > Math.pow(Math.max(0, e) * 2.2, 0.8)) continue; const z = 1.5 + 3.2 * rr(4);
        base.rect(lx * 0.98, 70 + ly, z, z);
      }
      const pool = L(T.main, 0, 0.07); blob(pool, 0, 66, 130, 0.5, 0, 1.2); blob(pool, -120, 82, 72, 0.5, 0.1, 1.1); blob(pool, 130, 78, 66, 0.5, -0.1, 1.1);
      const hal = L(T.bright, 0.05, 0.1, 0.45); blob(hal, 0, 12, 140, 0.9, 0, 1.4);
      const body = L(T.main, 0.04, 0.08); blob(body, 0, 30, 76, 0.9, 0.2, 1.1);
      const core = L(T.core, 0.02, 0.07); ell(core, 0, 52, 56, 24, 0); ell(core, -20, 30, 26, 18, 0.3);
      const m2 = L(T.main, 0.14, 0.1);
      const drops = [];
      const angs = [-3.0, -2.62, -2.3, -2.0, -1.62, -1.38, -1.05, -0.7, -0.33, -0.05];
      angs.forEach((a, i) => {
        const len = 130 + 230 * Math.pow(rr(1), 1.3), bend = (rr(2) - 0.5) * 1.5;
        const x1 = Math.cos(a) * len * 1.15, y1 = cy_(30 + Math.sin(a) * len * 0.8);
        tendril(m2, Math.cos(a) * 30, 30 + Math.sin(a) * 20, Math.cos(a + bend) * len * 0.5, 30 + Math.sin(a + bend) * len * 0.5, x1, y1, 18 + 8 * rr(3), 3.6);
        const r = 11 + 12 * rr(4); drops.push([x1 + Math.cos(a) * r * 0.5, cy_(y1 + Math.sin(a) * r * 0.5), r]);
      });
      const th = L(T.main, 0.17, 0.1);
      for (let i = 0; i < 14; i++) { const a = -3.1 + 3.0 * rr(5), len = 140 + 150 * rr(6), x1 = Math.cos(a) * len, y1 = cy_(40 + Math.sin(a) * len * 0.9), b = a + (rr(7) - 0.5) * 0.9; tendril(th, Math.cos(a) * 70, 40 + Math.sin(a) * 40, Math.cos(b) * len * 0.5, 40 + Math.sin(b) * len * 0.4, x1, y1, 3.2, 1); drops.push([x1, y1, 3 + 4 * rr(8)]); }
      const dd = L(T.main, 0.19, 0.1);
      drops.forEach(d => ell(dd, d[0], d[1], d[2], d[2], 0));
      for (let i = 0; i < 90; i++) { const a = -3.3 + 3.5 * rr(9), d = 130 + 300 * Math.pow(rr(10), 0.9), r = 1.2 + 4 * Math.pow(rr(11), 1.5); ell(dd, Math.cos(a) * d, cy_(40 + Math.sin(a) * d * 0.8), r, r, 0); }
      const vv = L(T.vivid, 0.2, 0.1);
      for (let i = 0; i < 90; i++) { const lx = (rr(12) * 2 - 1) * 230, ly = (rr(13) * 2 - 1) * 70, r = 1.2 + 3.2 * rr(14); ell(vv, lx, 70 + ly, r, r, 0); }
      const gl = L(T.gloss, 0.22, 0.1, 0.7);
      drops.forEach(d => { if (d[2] > 6) ell(gl, d[0] - d[2] * 0.32, d[1] - d[2] * 0.38, d[2] * 0.28, d[2] * 0.17, -0.6); });
      addDrip(-150, 100, 70, 9, T.dark, 0.18, false); addDrip(-20, 104, 110, 11, T.main, 0.16, false); addDrip(110, 100, 60, 8, T.dark, 0.2, false);
    } else if (kind === 'K') {
      // 片側が重い太い塊（左下が厚く、右は細い）：丸い玉ではなく不ぞろいな張り出し。芯のまわりに自然な滴と短い垂れ、細かいしぶきは右上へ偏る
      const T = SPLAT_RICH_TONE;
      const m1 = L(T.ink, 0, 0.06), m2 = L(T.ink, 0.14, 0.1);
      [[-70, 24, 84, 0.8, 0.3], [-30, -8, 62, 0.9, 0.1]].forEach(o => blob(m1, o[0], o[1], o[2], o[3], o[4], 1.1));
      [[-150, 56, 74, 0.7, -0.3], [-215, 98, 44, 0.8, 0.2], [-100, 90, 62, 0.8, 0.5], [-120, -30, 56, 0.85, 0.4], [-190, 10, 38, 0.9, 0.1], [20, 40, 56, 0.7, 0.2], [64, 6, 40, 0.8, -0.2], [118, -22, 26, 0.9, -0.4], [-60, 108, 40, 0.8, 0.1]].forEach(o => blob(m2, o[0], o[1], o[2], o[3], o[4], 1.2));
      wedge(m2, 60, 0, 235, -70, 30, 6, 16); wedge(m2, 80, -20, 170, -120, 18, 4, -8);          // 右上へ不ぞろいに伸びる2つ
      wedge(m2, -190, 90, -270, 150, 28, 6, -12);                                                  // 左下へ短く厚い張り出し
      for (let i = 0; i < 16; i++) { const a = rr(1) * TAUc, d = 70 + 110 * rr(2); lens(m2, Math.cos(a) * d - 60, Math.sin(a) * d * 0.55 + 30, 30 + 40 * rr(3), 3 + 3 * rr(4), a); }
      const sh = L(T.inkDark, 0.15, 0.1); blob(sh, -150, -8, 40, 0.6, 0.3, 1.6); blob(sh, -60, -30, 26, 0.6, 0.1, 1.5); blob(sh, 10, 36, 20, 0.7, 0.4, 1.5);
      const dp1 = L(T.ink, 0.17, 0.06), dp2 = dp1;
      cdrip(dp1, -150, 108, 100, 14, -8); cdrip(dp2, -78, 124, 104, 11, 10); cdrip(dp1, -20, 120, 70, 9, 5); cdrip(dp2, -215, 124, 46, 10, -4);
      drops(T.ink, 34, [[-130, 185, 70, 22], [-30, 190, 60, 18], [70, 90, 80, 50], [-250, 60, 40, 50]], { key: 100, d1: 190, d2: 280, rmax: 22 });
      spray(T.ink, 560, -20, 0, [[-0.45, 230, 0.3, 70, 4], [0.15, 250, 0.25, 60, 3], [-0.9, 210, 0.25, 60, 2], [2.6, 210, 0.3, 50, 1]], { key: 200, d1: 220, d2: 330, needleP: 0.42, ky: 0.72 });
    } else if (kind === 'L') {
      // ざらついた塊：くの字に折れた、ぎざぎざで切れ込みのある輪郭。縁は丸い細かい粒になって崩れ、暗い面の上に明るい粒が散る
      const T = SPLAT_RICH_TONE;
      const path = [[-250, -96, 40], [-170, -30, 62], [-95, 42, 78], [-20, 88, 66], [70, 84, 58], [160, 46, 52], [250, -24, 30]];
      const core = L(T.main, 0, 0.07); blob(core, -90, 40, 74, 0.8, 0.5, 1.4); blob(core, -10, 80, 56, 0.7, 0.1, 1.4);
      const body = L(T.main, 0.1, 0.1);
      const S = ribbon(body, path, 0.2, [[0.34, 0.5, 0.05], [0.72, 0.45, 0.04]], [[0.5, 0.4, 0.05], [0.15, 0.35, 0.04]]);
      wedge(body, -170, -30, -214, -150, 30, 2, 16);                    // 上へ不ぞろいに1つ
      ribbon(body, [[110, 60, 16], [170, 120, 22], [196, 176, 9]], 0.3);   // 右下へ短く
      const dk = L(T.dark, 0.14, 0.1); ribbon(dk, [[-190, -40, 20], [-110, 20, 34], [-30, 70, 26]], 0.35); ribbon(dk, [[40, 70, 24], [130, 56, 22], [210, 6, 12]], 0.35);
      const vd = L(T.black, 0.15, 0.1); for (let i = 0; i < 26; i++) { const q = S[(rr(1) * S.length) | 0], a = rr(2) * TAUc, d = q[2] * 0.6 * rr(3), n = 2 + (rr(4) * 4 | 0); for (let j = 0; j < n; j++) ell(vd, q[0] + Math.cos(a) * d + (rr(5) - 0.5) * 12, q[1] + Math.sin(a) * d + (rr(6) - 0.5) * 10, 1.5 + 2.6 * rr(7), 1.1 + 1.8 * rr(8), rr(9) * 3); }
      dissolve(T.main, S, 5200, { key: 300, reach: 1.9, fall: 1.2, d1: 150, d2: 250 });
      dissolve(T.dark, S, 2600, { key: 400, reach: 1.45, fall: 1.5, d1: 150, d2: 250 });
      const vv = L(T.vivid, 0.08, 0.1); for (let i = 0; i < 170; i++) { const q = S[(rr(10) * S.length) | 0], a = rr(11) * TAUc, d = q[2] * 0.85 * Math.sqrt(rr(12)), r = 1.4 + 4.2 * Math.pow(rr(13), 1.7); ell(vv, q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d, r, r * (0.7 + 0.5 * rr(14)), rr(15) * 3); }
      const v2 = L(T.vivid, 0.2, 0.1); for (let i = 0; i < 80; i++) { const q = S[(rr(16) * S.length) | 0], a = rr(17) * TAUc, d = q[2] * (1.1 + 0.7 * rr(18)), r = 1.2 + 3 * rr(19); ell(v2, q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d, r, r, 0); }
      drops(T.main, 14, [[-250, 70, 40, 30], [120, -80, 60, 30], [30, 170, 80, 20]], { key: 500, d1: 190, d2: 290, rmax: 14 });
    } else if (kind === 'M') {
      // 重力に引かれた形：塊は上に寄り、長さの違う太い垂れが何本も下へ走り、その下とまわりに中くらいの滴。上に少しだけしぶき
      const T = SPLAT_RICH_TONE;
      const m1 = L(T.main, 0, 0.06), m2 = L(T.main, 0.14, 0.1);
      [[-120, -90, 84, 0.75, 0.3], [-60, -50, 60, 0.8, 0.1]].forEach(o => blob(m1, o[0], o[1], o[2], o[3], o[4], 1.2));
      [[-210, -60, 62, 0.7, 0.4], [-280, -20, 36, 0.8, 0.2], [-170, -140, 50, 0.7, 0.3], [-30, -100, 52, 0.7, -0.2], [50, -70, 40, 0.7, 0.3], [-120, -10, 40, 0.8, 0.2], [110, -50, 26, 0.9, 0.2], [-250, -110, 34, 0.8, 0.3]].forEach(o => blob(m2, o[0], o[1], o[2], o[3], o[4], 1.3));
      wedge(m2, 60, -70, 220, -50, 28, 6, -14); wedge(m2, -170, -150, -150, -225, 24, 6, 10);
      for (let i = 0; i < 12; i++) { const a = rr(1) * TAUc, d = 50 + 120 * rr(2); lens(m2, -120 + Math.cos(a) * d * 1.1, -70 + Math.sin(a) * d * 0.5, 28 + 36 * rr(3), 3 + 3 * rr(4), a); }
      const br = L(T.bright, 0.16, 0.1); lens(br, -110, -120, 150, 11, -0.08);
      const dk = L(T.dark, 0.15, 0.1); blob(dk, -80, -40, 36, 0.5, 0.1, 1.6); blob(dk, -230, -20, 22, 0.7, 0.3, 1.5);
      const dA = L(T.main, 0.12, 0.06), dB = dA, dC = L(T.main, 0.17, 0.06);
      cdrip(dA, -250, -14, 60, 13, -6); cdrip(dB, -190, -12, 200, 11, 10); cdrip(dA, -130, 0, 100, 17, -7); cdrip(dC, -75, -6, 150, 10, 6); cdrip(dB, -10, -24, 54, 9, -3); cdrip(dC, 90, -40, 100, 10, 7);
      drops(T.main, 30, [[-170, 150, 80, 25], [-80, 150, 60, 20], [60, 70, 60, 40], [-300, 30, 40, 50]], { key: 600, ox: -100, oy: -70, d1: 180, d2: 270, rmax: 20 });
      spray(T.main, 320, -100, -90, [[-1.5, 190, 0.4, 60, 3], [-0.7, 200, 0.3, 60, 2], [-2.4, 200, 0.3, 60, 2]], { key: 700, d1: 150, d2: 250, needleP: 0.5, ky: 0.7 });
    } else if (kind === 'N') {
      // 大小2つの塊が角度をつけて重なる：大きいほうは左上でざらつき、小さいほうは右下で傾き、そこから下へ自然な垂れと滴、右下へ細かいしぶき
      const T = SPLAT_RICH_TONE;
      const big1 = L(T.main, 0, 0.07), big2 = L(T.main, 0.13, 0.1);
      [[-150, -50, 84, 0.65, 0.6], [-100, -20, 66, 0.7, 0.5]].forEach(o => blob(big1, o[0], o[1], o[2], o[3], o[4], 1.3));
      [[-215, -90, 60, 0.6, 0.6], [-60, 10, 58, 0.6, 0.4], [-190, 0, 44, 0.8, 0.8], [-110, -110, 50, 0.6, 0.5], [-20, -30, 34, 0.8, 0.2]].forEach(o => blob(big2, o[0], o[1], o[2], o[3], o[4], 1.3));
      wedge(big2, -210, -90, -300, -190, 28, 2, 14);
      const sm1 = L(T.ink, 0.04, 0.07); [[60, 60, 62, 0.7, -0.6], [20, 40, 48, 0.8, -0.5]].forEach(o => blob(sm1, o[0], o[1], o[2], o[3], o[4], 1.1));
      const sm2 = L(T.ink, 0.14, 0.1); [[120, 90, 44, 0.65, -0.7], [-10, 80, 40, 0.8, -0.3], [170, 60, 28, 0.9, 0.2]].forEach(o => blob(sm2, o[0], o[1], o[2], o[3], o[4], 1.1));
      wedge(sm2, 120, 90, 270, 140, 20, 2, 12);
      for (let i = 0; i < 12; i++) { const a = rr(1) * TAUc, d = 50 + 90 * rr(2); lens(sm2, 60 + Math.cos(a) * d, 60 + Math.sin(a) * d * 0.6, 24 + 30 * rr(3), 2.6 + 3 * rr(4), a); }
      const dk = L(T.dark, 0.15, 0.1); ell(dk, -140, -40, 60, 24, 0.6); ell(dk, -60, 0, 30, 16, 0.4);
      const S = [[-230, -100, 62], [-190, -70, 66], [-150, -50, 74], [-100, -20, 66], [-60, 10, 52], [-210, -90, 60]];
      dissolve(T.main, S, 3400, { key: 800, reach: 1.7, fall: 1.3, d1: 140, d2: 230 });
      dissolve(T.dark, S, 1800, { key: 900, reach: 1.4, fall: 1.5, d1: 140, d2: 230 });
      const vv = L(T.vivid, 0.1, 0.1); for (let i = 0; i < 120; i++) { const a = rr(10) * TAUc, d = 90 * Math.sqrt(rr(11)), r = 1.3 + 3.6 * Math.pow(rr(12), 1.7); ell(vv, -130 + Math.cos(a) * d * 1.4, -45 + Math.sin(a) * d * 0.8, r, r * (0.7 + 0.5 * rr(13)), rr(14) * 3); }
      const nA = L(T.ink, 0.14, 0.06), nB = nA; cdrip(nA, 40, 96, 120, 13, -7); cdrip(nB, 100, 112, 86, 10, 6); cdrip(nA, -30, 104, 60, 11, -3);
      drops(T.ink, 26, [[70, 190, 80, 30], [220, 120, 50, 50], [-60, 130, 50, 30]], { key: 1000, ox: 40, oy: 40, d1: 160, d2: 260, rmax: 18 });
      spray(T.ink, 300, 70, 70, [[0.35, 230, 0.3, 60, 4], [0.9, 190, 0.3, 50, 2], [-0.2, 250, 0.25, 50, 2]], { key: 1100, d1: 200, d2: 300, needleP: 0.6, ky: 0.7 });
      spray(T.main, 160, -130, -50, [[-2.4, 230, 0.35, 60, 3], [-1.2, 210, 0.3, 50, 1]], { key: 1200, d1: 200, d2: 300, needleP: 0.3, ky: 0.7 });
    } else if (kind === 'O' || kind === 'P' || kind === 'Q') {
      // 血のしぶきの手本（平らなインク調の塊・小さな丸い滴・舌のような垂れ・荒い縁）に、つやのある写真の陰影（暗い芯、まわりの淡く透けた暈、大きな滴のつや）を混ぜた形。
      // 塊の下絵は3つで共通（固定シード）。O は平らで、大きな滴に少しだけつや。P は釣り合い。Q は暈・芯・つやを強める。放射状の腕・先が玉の糸は使わない
      const T = SPLAT_RICH_TONE, g = { O: 0, P: 1, Q: 2 }[kind];
      let kb = 0; const rb = (q = 0) => rnd(80, ++kb, q);
      const rec = [];
      if (g >= 1) {                                          // 淡い暈（塊の下に透けて広がる、不ぞろいな形）
        const h1 = L(T.bright, 0, 0.1, g === 2 ? 0.4 : 0.3);
        [[-150, -50, 74, 0.7, 0.4], [-60, -100, 54, 0.6, 0.1], [30, -60, 60, 0.7, -0.3], [-190, 40, 52, 0.7, 0.2], [-20, 36, 40, 0.6, 0.1]].forEach(o => blob(h1, o[0], o[1], o[2] * (g === 2 ? 1.15 : 0.95), o[3], o[4], 1.9));
        wedge(h1, -150, -50, -250, -120, 40, 6, 20); wedge(h1, 30, -60, 130, -120, 30, 5, -14);
        if (g === 2) { const h2 = L(T.bright, 0.14, 0.1, 0.28); blob(h2, -230, 20, 56, 0.6, 0.4, 1.8); blob(h2, 90, -10, 46, 0.6, 0.1, 1.7); wedge(h2, 90, -10, 190, 20, 30, 5, 12); }
      }
      const m1 = L(T.main, 0, 0.06), m2 = L(T.main, 0.14, 0.1);
      [[-80, 0, 92, 0.8, 0.3], [-20, -36, 70, 0.85, 0.1]].forEach(o => blob(m1, o[0], o[1], o[2], o[3], o[4], 1.15));
      [[-170, 56, 66, 0.75, -0.2], [-120, -60, 58, 0.8, 0.4], [-50, 50, 62, 0.8, 0.2], [40, -6, 50, 0.8, -0.2], [100, 22, 36, 0.85, 0.3], [-210, -10, 44, 0.85, 0.1], [-20, -100, 40, 0.8, 0]].forEach(o => blob(m2, o[0], o[1], o[2], o[3], o[4], 1.25));
      wedge(m2, 90, 10, 250, 54, 24, 5, 14); wedge(m2, -130, -70, -205, -150, 22, 5, -10);
      for (let i = 0; i < 16; i++) { const a = rb(1) * TAUc, d = 60 + 110 * rb(2); lens(m2, -80 + Math.cos(a) * d * 1.2, -10 + Math.sin(a) * d * 0.75, 26 + 34 * rb(3), 3 + 3 * rb(4), a); }
      const sh = L(T.dark, 0.15, 0.1); blob(sh, -110, 30, 50, 0.55, 0.3, 1.6); blob(sh, -170, 80, 26, 0.7, -0.3, 1.5);
      const bp = L(T.bright, 0.16, 0.1, g === 0 ? 1 : 0.9); blob(bp, 20, -52, g === 0 ? 40 : 30, 0.5, -0.3, 1.4); lens(bp, 70, -20, 80, 8, -0.4);
      if (g >= 1) { const co = L(T.core, 0.02, 0.07); blob(co, -86, 4, g === 2 ? 40 : 30, 0.7, 0.3, 1.6); if (g === 2) blob(co, -40, -20, 20, 0.7, 0.2, 1.5); }
      const bk = L(T.black, 0.15, 0.1); blob(bk, -92, 66, 14, 0.5, 0.1, 1.3); ell(bk, -150, 30, 12, 5, -0.5); ell(bk, -40, 70, 9, 4, 0.2);
      const D = { O: [[-150, 100, 96, 20, -10], [-60, 96, 56, 12, 6]], P: [[-100, 100, 100, 18, 8], [-170, 90, 62, 12, -6], [10, 82, 44, 11, 5]], Q: [[-180, 92, 108, 18, -8], [-110, 100, 70, 13, 5], [-30, 92, 50, 11, 4], [50, 62, 46, 10, 3]] }[kind];
      const dd = L(T.main, 0.17, 0.06); D.forEach(d => cdrip(dd, d[0], d[1], d[2], d[3], d[4]));
      const cfg = { O: [74, [[110, 110, 90, 50], [-210, 150, 70, 40], [160, -30, 60, 60], [20, 170, 80, 30]], 22, 230, 0.2, 0.15], P: [34, [[-60, 150, 90, 20], [140, 90, 70, 50], [-220, 90, 40, 50], [70, -130, 60, 30]], 26, 170, 0.3, 0.9], Q: [26, [[-150, 150, 80, 20], [20, 140, 70, 20], [150, 60, 60, 50], [-240, 40, 40, 50]], 30, 130, 0.2, 1.5] }[kind];
      drops(T.main, cfg[0], cfg[1], { key: 100, ox: -60, oy: 0, d1: 190, d2: 280, rmax: cfg[2], rec, rmin: [15, 12, 9][g] });
      spray(T.main, cfg[3], -60, 0, [[-0.2 - g * 0.3, 230, 0.4, 70, 3], [0.5, 220, 0.4, 60, 2], [2.8, 210, 0.4, 60, 1]], { key: 200, d1: 220, d2: 330, needleP: cfg[4], ky: 0.72 });
      const gl = L(T.gloss, 0.2, 0.1, [0.55, 0.72, 0.8][g]);
      rec.forEach(d => ell(gl, d[0] - d[2] * 0.32, d[1] - d[2] * 0.38, d[2] * 0.3, d[2] * 0.18, -0.6));
      if (g >= 1) { const st = L(T.gloss, 0.2, 0.1, g === 2 ? 0.34 : 0.26); lens(st, -70, -66, 56, 8, -0.25); if (g === 2) { lens(st, -140, 2, 44, 7, -0.5); lens(st, 110, 10, 40, 6, -0.2); } }
    }
    return layers;
  }
  const splatRichCache = {};
  function bloodSplatRich(ctx, u, tt, kind) {
    const layers = splatRichCache[kind] || (splatRichCache[kind] = splatBuildRich(kind));
    const e = clamp(tt / 0.4), p = 1 - Math.pow(1 - e, 3);
    ctx.save();
    const km = 'KLMNOPQ'.indexOf(kind) >= 0 ? 1.5 : 1.25;
    ctx.scale(u * km, u * km);
    if (kind === 'Q') ctx.scale(-1, 1);                    // Q は左右を逆にして配置を変える
    else if (kind === 'P') ctx.rotate(-0.16);
    const sc = 0.55 + 0.45 * p;
    ctx.scale(sc, sc);
    const base = ctx.globalAlpha * clamp(tt / 0.04);
    layers.forEach(l => {
      const a = clamp((tt - l.t0) / l.ramp) * l.a;
      if (a <= 0.004) return;
      ctx.globalAlpha = base * a;
      ctx.fillStyle = l.fill;
      if (l.drip) {
        const dr = l.drip, len = dr.len * (0.4 + 0.6 * clamp((tt - l.t0 - 0.05) / 1.0));
        ctx.beginPath();
        ctx.moveTo(dr.x - dr.w * 1.1, dr.y - 30);
        ctx.quadraticCurveTo(dr.x - dr.w * 0.9, dr.y + len * 0.5, dr.x - dr.w * 0.3, dr.y + len);
        ctx.arc(dr.x, dr.y + len, dr.w * 0.62, Math.PI, 0, true);
        ctx.quadraticCurveTo(dr.x + dr.w * 0.9, dr.y + len * 0.5, dr.x + dr.w * 1.1, dr.y - 30);
        ctx.closePath(); ctx.fill();
        if (dr.gl) { ctx.fillStyle = SPLAT_RICH_TONE.gloss; ctx.globalAlpha = base * a * 0.75; ctx.beginPath(); ctx.ellipse(dr.x - dr.w * 0.25, dr.y + len - dr.w * 0.25, dr.w * 0.16, dr.w * 0.26, -0.3, 0, TAU); ctx.fill(); }
      } else ctx.fill(l.path);
    });
    ctx.restore();
  }
  let bloodSplatBuf = null;
  function bloodSplat(ctx, x, y, u, tt, o = {}) {
    const alpha = clamp(o.alpha ?? 1);
    if (tt <= 0 || u <= 0 || alpha <= 0.004) return;
    if (alpha < 0.995 && ctx.canvas) {
      const cv = ctx.canvas;
      if (!bloodSplatBuf || bloodSplatBuf.width !== cv.width || bloodSplatBuf.height !== cv.height) bloodSplatBuf = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cv.width, cv.height) : Object.assign(document.createElement('canvas'), { width: cv.width, height: cv.height });
      const bx = bloodSplatBuf.getContext('2d');
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.clearRect(0, 0, bloodSplatBuf.width, bloodSplatBuf.height);
      bx.setTransform(ctx.getTransform());
      bloodSplatInner(bx, x, y, u, tt, o);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= alpha;
      ctx.drawImage(bloodSplatBuf, 0, 0);
      ctx.restore();
      return;
    }
    bloodSplatInner(ctx, x, y, u, tt, o);
  }
  function bloodSplatInner(ctx, x, y, u, tt, o = {}) {
    if (o.shape && 'FGHIJKLMNOPQ'.indexOf(o.shape) >= 0 && o.shape.length === 1) {
      ctx.save(); ctx.translate(x, y); bloodSplatRich(ctx, u, tt, o.shape); ctx.restore();
      return;
    }
    let S;
    if (o.shape && SPLAT_SPECS[o.shape]) S = splatCache[o.shape] || (splatCache[o.shape] = splatBuildSpec(SPLAT_SPECS[o.shape]));
    else { if (!splatShapes) splatShapes = splatBuild(); S = splatShapes; }
    const p = 1 - Math.pow(1 - clamp(tt / 0.3), 3.2);
    ctx.save();
    ctx.globalAlpha *= clamp(tt / 0.07);
    ctx.translate(x, y);
    ctx.scale(u, u);
    const sc = 0.4 + 0.6 * p;
    ctx.scale(sc, sc);                                   // 形ごと中心から広がる
    // 垂れ（塊の下にもぐらせる）：ゆっくり伸びる
    S.drips.forEach((dr, i) => {
      const len = dr.len * (0.45 + 0.55 * clamp((tt - 0.1 - 0.12 * i) / 1.0));
      ctx.fillStyle = SPLAT_TONE[dr.tone];
      ctx.beginPath();
      ctx.moveTo(dr.x - dr.w * 1.1, dr.y - 30);
      ctx.quadraticCurveTo(dr.x - dr.w * 0.9, dr.y + len * 0.5, dr.x - dr.w * 0.3, dr.y + len);
      ctx.arc(dr.x, dr.y + len, dr.w * 0.62, Math.PI, 0, true);
      ctx.quadraticCurveTo(dr.x + dr.w * 0.9, dr.y + len * 0.5, dr.x + dr.w * 1.1, dr.y - 30);
      ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = SPLAT_TONE[3]; ctx.fill(S.main);
    ctx.fillStyle = SPLAT_TONE[2]; ctx.fill(S.dark);
    ctx.fillStyle = SPLAT_TONE[1]; ctx.fill(S.black);
    ctx.fillStyle = SPLAT_TONE[4]; ctx.fill(S.bright);
    // 衛星の滴：形の一部として、中心に近いものから順に淡く現れる
    const base = ctx.globalAlpha;
    for (let i = 0; i < S.sat.length; i++) {
      const s = S.sat[i];
      const a = clamp((tt - s.dist / 2600) / 0.1);
      if (a <= 0) continue;
      ctx.globalAlpha = base * a;
      ctx.fillStyle = SPLAT_TONE[s.tone];
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, 0, TAU); ctx.fill();
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

  root.TextApngVampireFx = { puff, bat, moon, teethRow, splatter, bloodSplat, drip, cracks, flare, band, BLOOD, BONE };
})(typeof window !== 'undefined' ? window : globalThis);
