/*
 * 文字画像APNGメーカーEX — ハロウィンの演出の部品（ジャック・オ・ランタン・おばけ（とんがり帽子）・墓石・満月・夜の帯）
 * 判定カットイン「ハロウィン」（engine.js の drawHalloween）から使う。ctx はレイアウトの座標（engine が拡大率をかけてある）。
 * コウモリは fx-vampire.js（TextApngVampireFx.bat）、もやは TextApngVampireFx.puff、きらめきは fx-star.js を使う。
 * どの関数も時刻を引数で受け取り、同じ時刻なら同じ絵になる。
 */
(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const F = () => root.TextApngStarFx;

  const PUMPKIN = { hi: '#ffd08a', mid: '#ff8a1e', lo: '#b8460a', line: '#2a0d02', face: '#ffe27a' };
  const GHOST = { hi: '#ffffff', lo: '#b9b0dc', eye: '#14082a', glow: '#9dff7a', aura: '#c7b8ff' };
  const HAT = { body: '#15091f', band: '#e0801c' };
  const STONE = { hi: '#6d6686', lo: '#262038', rim: '#0d0918', moss: '#6aa04a' };
  const GREY = '#6c6880';

  // 段階に応じた色の薄め（失敗・ファンブル用。0で元の色、1で灰色）
  const tone = (c, k) => (k <= 0 ? c : F().mix(c, GREY, clamp(k)));

  /*
   * ジャック・オ・ランタン：3つの丸い房をつなげた体、茎、くり抜いた顔（光が透ける）。
   * o: { rot, alpha, glow, tone（0〜1の灰色寄せ）, lit（顔の光の強さ 0〜1） }
   */
  function pumpkin(ctx, x, y, r, o = {}) {
    const S = F();
    const a = o.alpha ?? 1;
    if (a <= 0.004 || r <= 0.5) return;
    const k = o.tone ?? 0;
    const lit = (o.lit ?? 1) * (1 - 0.7 * k);
    const hi = tone(PUMPKIN.hi, k), mid = tone(PUMPKIN.mid, k), lo = tone(PUMPKIN.lo, k);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    if (lit > 0.01) S.softDot(ctx, 0, 0, r * 2.4, o.glow || '#ff8a1e', 0.32 * a * lit);
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, hi);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, lo);
    const lobes = [[0, 0, 0.82, 0.7], [-0.42, 0.02, 0.56, 0.66], [0.42, 0.02, 0.56, 0.66]];
    ctx.fillStyle = g;
    ctx.strokeStyle = PUMPKIN.line;
    ctx.lineWidth = Math.max(1, r * 0.045);
    for (const [ex, ey, rx, ry] of lobes) {
      ctx.beginPath();
      ctx.ellipse(ex * r, ey * r, rx * r, ry * r, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // 茎（少しねじれた短い棒）
    ctx.fillStyle = tone('#4f7a22', k);
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.02, -r * 0.92, r * 0.16, -r * 0.98);
    ctx.lineTo(r * 0.22, -r * 0.8);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.74, r * 0.06, -r * 0.56);
    ctx.closePath();
    ctx.fill();
    // 顔：目の三角、ギザギザの口（くり抜いた部分は光る）
    const face = tone(PUMPKIN.face, k);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(-0.5 * r, -0.28 * r); ctx.lineTo(-0.14 * r, -0.26 * r); ctx.lineTo(-0.3 * r, -0.02 * r); ctx.closePath();
    ctx.moveTo(0.5 * r, -0.28 * r); ctx.lineTo(0.14 * r, -0.26 * r); ctx.lineTo(0.3 * r, -0.02 * r); ctx.closePath();
    ctx.moveTo(-0.46 * r, 0.16 * r); ctx.lineTo(0.46 * r, 0.16 * r); ctx.lineTo(0.3 * r, 0.4 * r); ctx.lineTo(0.14 * r, 0.22 * r);
    ctx.lineTo(0, 0.44 * r); ctx.lineTo(-0.14 * r, 0.22 * r); ctx.lineTo(-0.3 * r, 0.4 * r); ctx.closePath();
    ctx.fill();
    if (lit > 0.01) S.softDot(ctx, 0, 0.12 * r, r * 0.7, '#ffd35a', 0.35 * a * lit);
    ctx.restore();
  }

  /*
   * とんがり帽子のおばけ：波打つ裾の白いおばけ、青黒い目（緑の光）、黒い帽子とオレンジの帯。
   * o: { rot, alpha, sway（横の揺れの位相）, flip（左右反転）, tone }
   */
  function ghost(ctx, x, y, r, o = {}) {
    const S = F();
    const a = o.alpha ?? 1;
    if (a <= 0.004 || r <= 0.5) return;
    const k = o.tone ?? 0;
    const sw = o.sway ?? 0;
    ctx.save();
    ctx.translate(x + Math.sin(sw) * r * 0.12, y);
    ctx.rotate((o.rot || 0) + Math.sin(sw * 0.7) * 0.06);
    ctx.scale(o.flip ? -1 : 1, 1);
    ctx.globalAlpha = a;
    S.softDot(ctx, 0, -r * 0.1, r * 2.6, GHOST.aura, 0.22 * a * (1 - 0.6 * k));
    // 体：丸い頭から、波打つ裾へ
    const hi = tone(GHOST.hi, k), lo = tone(GHOST.lo, k);
    const g = ctx.createLinearGradient(0, -r * 1.2, 0, r * 1.05);
    g.addColorStop(0, hi);
    g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.85);
    ctx.bezierCurveTo(-r, -r * 1.3, r, -r * 1.3, r, r * 0.85);
    const hemY = [0.85, 1.08, 0.7, 1.1, 0.85];
    const n = hemY.length - 1;
    for (let i = 0; i < n; i++) {
      const x1 = r - (2 * r * (i + 1)) / n;
      const x0 = r - (2 * r * i) / n;
      const ym = (hemY[i] + hemY[i + 1]) / 2;
      ctx.quadraticCurveTo((x0 + x1) / 2, ym * r, x1, hemY[i + 1] * r);
    }
    ctx.closePath();
    ctx.fill();
    // 目と口（青黒い楕円、緑の光）
    ctx.fillStyle = GHOST.eye;
    ctx.beginPath();
    ctx.ellipse(-0.36 * r, -0.12 * r, 0.16 * r, 0.24 * r, 0, 0, TAU);
    ctx.ellipse(0.36 * r, -0.12 * r, 0.16 * r, 0.24 * r, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0.36 * r, 0.14 * r, 0.1 * r, 0, 0, TAU);
    ctx.fill();
    if (!k) {
      S.softDot(ctx, -0.36 * r, -0.12 * r, r * 0.35, GHOST.glow, 0.5 * a);
      S.softDot(ctx, 0.36 * r, -0.12 * r, r * 0.35, GHOST.glow, 0.5 * a);
    }
    // とんがり帽子：つばの楕円、傾いた円錐、オレンジの帯
    ctx.fillStyle = tone(HAT.body, k);
    ctx.save();
    ctx.translate(0, -0.95 * r);
    ctx.rotate(-0.22);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.2 * r, 0.22 * r, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.62 * r, 0);
    ctx.quadraticCurveTo(-0.12 * r, -0.9 * r, 0.42 * r, -1.9 * r);
    ctx.quadraticCurveTo(0.18 * r, -0.9 * r, 0.62 * r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = tone(HAT.band, k);
    ctx.fillRect(-0.62 * r, -0.2 * r, 1.24 * r, 0.16 * r);
    ctx.restore();
    ctx.restore();
  }

  /*
   * 墓石：アーチの頭、くすんだ石の面、ひび、苔。w は幅、h は高さ。底の中心を (x, y) に置く。
   * o: { rot, alpha, tone }
   */
  function tomb(ctx, x, y, w, h, o = {}) {
    const S = F();
    const a = o.alpha ?? 1;
    if (a <= 0.004 || w <= 0.5) return;
    const k = o.tone ?? 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.globalAlpha = a;
    const top = -h;
    const g = ctx.createLinearGradient(-w / 2, top, w / 2, 0);
    g.addColorStop(0, tone(STONE.hi, k));
    g.addColorStop(1, tone(STONE.lo, k));
    ctx.fillStyle = g;
    ctx.strokeStyle = STONE.rim;
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, top + w / 2);
    ctx.arc(0, top + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // ひびと苔
    ctx.strokeStyle = 'rgba(13,9,24,0.7)';
    ctx.lineWidth = Math.max(1, w * 0.025);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, top * 0.45);
    ctx.lineTo(w * 0.02, top * 0.25);
    ctx.lineTo(w * 0.16, top * 0.12);
    ctx.stroke();
    if (!k) S.softDot(ctx, -w * 0.22, -h * 0.12, w * 0.3, STONE.moss, 0.22 * a);
    ctx.restore();
  }

  /*
   * 満月（オレンジ色、少しのくぼみ）。ぼかした光の輪つき。
   */
  function moon(ctx, x, y, r, alpha, o = {}) {
    const S = F();
    if (alpha <= 0.004 || r <= 0.5) return;
    S.softDot(ctx, x, y, r * 2.2, o.glow || '#ff9a3a', 0.4 * alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffe2a8');
    g.addColorStop(0.7, '#ffa54a');
    g.addColorStop(1, '#d2601c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,60,20,0.35)';
    [[-0.3, -0.2, 0.18], [0.25, 0.18, 0.13], [-0.1, 0.35, 0.1]].forEach(([dx, dy, rr]) => {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  /*
   * 夜の帯：紫の闇が中央から上下へ開く。縁はオレンジの細い線。open（0〜1）で開き具合を決める。
   * band: { cy, hh }（engine の rollBandRect）
   */
  function nightBand(ctx, band, W, open, fade, accent, tint, tier) {
    if (open <= 0.001 || fade <= 0.002) return;
    const h = band.hh * 2 * open;
    const top = band.cy - h / 2;
    ctx.save();
    ctx.globalAlpha = fade;
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.2, tint);
    g.addColorStop(0.5, tier === 'fumble' ? '#07020f' : '#2a0f4a');
    g.addColorStop(0.8, tint);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-W * 0.05, top, W * 1.1, h);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = fade * 0.7;
    ctx.lineWidth = Math.max(1.5, band.hh * 0.02);
    ctx.beginPath();
    ctx.moveTo(-W * 0.05, top + 0.5);
    ctx.lineTo(W * 1.05, top + 0.5);
    ctx.moveTo(-W * 0.05, top + h - 0.5);
    ctx.lineTo(W * 1.05, top + h - 0.5);
    ctx.stroke();
    ctx.restore();
  }

  root.TextApngHalloweenFx = { pumpkin, ghost, tomb, moon, nightBand, PUMPKIN, GHOST };
})(window);
