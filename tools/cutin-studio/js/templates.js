/*
 * カットイン作成スタジオ — 描画エンジン（7つの型）
 *   1コマ = 960×540 の座標で描く（書き出しの大きさに合わせて本体が拡大縮小する）。
 *   時刻 t（秒・速さ1倍のとき）を渡すと、いつも同じ絵になる（プレビューと書き出しが一致する）。
 *   乱数は hash() だけを使う。with() は使わない（演出APNGメーカー v0.20 の教訓）。
 */
export const W = 960, H = 540;
export const DURATION = 2.5;   // 入り 0.4 → 決め 1.6 → 退場 0.5
export const HOLD_END = 2.0;   // 退場なしのときは、ここで止める

// いま描いている立ち絵（render() が差し替える）
let P = null, P2 = null;
// フラッシュの強さ（0 = なし、1 = ふつう）。render() が差し替える
let FL = 1;

const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const outExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const outCubic = x => 1 - Math.pow(1 - x, 3);
const inCubic = x => x * x * x;
const outBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function hash(a, b) { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// キャラ表示のフラッシュ：立ち絵が白く光ってから色が戻る＋外側に光がにじむ
// 立ち絵を「顔の中心」と「顔の幅（px）」で置く。利用者のずらし・拡大・反転もここでかける
function face(g, src, fx, fy, fw, o = {}) {
  const p = o.P || P;
  const s = fw * p.zoom / p.face.w, pad = o.pad || 0, flip = Boolean(o.flip) !== Boolean(p.flip);
  g.save(); g.globalAlpha *= (o.alpha ?? 1);
  g.translate(fx + p.dx, fy + p.dy); if (o.rot) g.rotate(o.rot); g.scale(flip ? -s : s, s);
  g.drawImage(src, -p.face.x - pad, -p.face.y - pad);
  g.restore();
}
// 文字が長いときは、最大幅に収まるまで小さくする
function fitFont(g, text, size, family, maxW) {
  g.font = `${size}px ${family}`;
  const w = g.measureText(text || '').width;
  if (w > maxW) g.font = `${Math.max(10, Math.floor(size * maxW / w))}px ${family}`;
}
// キャラ表示のフラッシュ：立ち絵が白く光ってから色が戻る＋外側に光がにじむ
function portraitWithFlash(g, fx, fy, fw, t0, t, o = {}) {
  face(g, o.src || P.src, fx, fy, fw, o);
  const k = seg(t, t0, t0 + 0.32);
  if (k > 0 && k < 1 && !o.noFlash && FL > 0) {
    const a = Math.min(1, Math.pow(1 - k, 1.6) * FL);
    face(g, o.white || P.white, fx, fy, fw, { ...o, alpha: (o.alpha ?? 1) * a });
    g.save(); g.globalCompositeOperation = 'lighter';
    g.filter = `blur(${10 + 20 * k}px)`;
    face(g, o.white || P.white, fx, fy, fw, { ...o, alpha: (o.alpha ?? 1) * a * 0.8 });
    g.restore();
  }
}
function screenFlash(g, t, t0, dur, amt = 0.9, color = '255,255,255') {
  const k = seg(t, t0, t0 + dur); if (k <= 0 || k >= 1) return;
  g.fillStyle = `rgba(${color},${Math.min(1, amt * FL) * Math.pow(1 - k, 2)})`; g.fillRect(0, 0, W, H);
}
// 光の筋が斜めに走る（表示の瞬間の閃光）
function glint(g, t, t0, dur, ang = -0.35) {
  const k = seg(t, t0, t0 + dur); if (k <= 0 || k >= 1) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.translate(-200 + k * 1400, H / 2); g.rotate(ang);
  const gr = g.createLinearGradient(-60, 0, 60, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${0.75 * (1 - k)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-60, -700, 120, 1400);
  g.restore();
}
function shake(t, t0, dur, amp) {
  const k = seg(t, t0, t0 + dur); if (k <= 0 || k >= 1) return [0, 0];
  const d = amp * (1 - k); return [Math.sin(k * 60) * d, Math.cos(k * 47) * d * 0.6];
}
function speedLines(g, t, n, L, bh, acc, seed = 7, dir = -1) {
  for (let i = 0; i < n; i++) {
    const r = hash(i, seed), r2 = hash(i, seed + 4);
    const y = (r - 0.5) * bh, len = 80 + r2 * 260, sp = 900 + r2 * 900;
    let x = ((r * 4000 + dir * t * sp) % (L + len) + (L + len)) % (L + len) - L / 2;
    g.fillStyle = i % 5 === 0 ? acc : 'rgba(255,255,255,.5)';
    g.fillRect(x, y, len, i % 5 === 0 ? 3 : 1.5);
  }
}
function outlinedText(g, s, x, y, fill, stroke, lw) {
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y);
}

/* ===== 1 斜めスラッシュ ===== */
function slash(g, t, o) {
  const acc = o.color, ang = -10 * Math.PI / 180, out = inCubic(seg(t, 2.05, 2.45));
  const [sx, sy] = shake(t, 0.42, 0.22, 10);
  g.save(); g.translate(sx, sy);
  const win = outCubic(seg(t, 0.04, 0.3)), bh = 240 * (1 - out), L = 1300;
  g.save(); g.translate(W / 2, H / 2); g.rotate(ang);
  const x0 = -L / 2, x1 = x0 + L * win;
  g.save(); g.beginPath(); g.rect(x0, -bh / 2, x1 - x0, bh); g.clip();
  const grd = g.createLinearGradient(0, -bh / 2, 0, bh / 2);
  grd.addColorStop(0, '#0c0c14'); grd.addColorStop(0.55, '#141420'); grd.addColorStop(1, acc);
  g.fillStyle = grd; g.fillRect(x0, -bh / 2, L, bh);
  speedLines(g, t, 34, L, bh, acc);
  g.rotate(-ang);
  const pin = outExpo(seg(t, 0.1, 0.55));
  portraitWithFlash(g, -170 + (1 - pin) * 300 - Math.max(0, t - 0.3) * 22, -10, 150, 0.14, t, { alpha: clamp(pin * 3) });
  g.restore();
  // ふち線も退場に合わせて細く・薄くし、最後のコマには残さない
  if (out < 1) {
    g.globalAlpha = 1 - out;
    g.fillStyle = acc; g.fillRect(x0, -bh / 2 - 7 * (1 - out), x1 - x0, 7 * (1 - out));
    g.fillStyle = '#fff'; g.fillRect(x0, bh / 2, x1 - x0, 4 * (1 - out));
    g.globalAlpha = 1;
  }
  g.restore();
  const k = seg(t, 0.28, 0.42);
  if (k > 0 && out < 1) {
    const sc = 2.4 - 1.4 * outCubic(k);
    g.save(); g.translate(690, 262); g.rotate(ang); g.scale(sc * (1 + out * 0.6), sc * (1 - out));
    g.globalAlpha = clamp(k * 2) * (1 - out);
    fitFont(g, o.main, 150, o.fontMain, 430); g.textAlign = 'center'; g.textBaseline = 'middle';
    outlinedText(g, o.main, 6, 8, '#000', '#000', 26);
    outlinedText(g, o.main, 0, 0, '#fff', acc, 16);
    g.restore();
  }
  const nk = outExpo(seg(t, 0.45, 0.8));
  if (nk > 0) {
    g.save(); g.translate(690, 262); g.rotate(ang); g.globalAlpha = nk * (1 - out);
    fitFont(g, o.name, 28, o.fontName, 420); g.textAlign = 'center';
    outlinedText(g, o.name, 40 * (1 - nk), 112, '#fff', '#000', 7);
    g.restore();
  }
  g.restore();
  screenFlash(g, t, 0, 0.16); screenFlash(g, t, 0.42, 0.14, 0.45);
}

/* ===== 2 横ながし ===== */
function pass(g, t, o) {
  const acc = o.color, out = inCubic(seg(t, 2.05, 2.45));
  const open = outExpo(seg(t, 0.02, 0.3)) * (1 - out);
  const bh = 260 * open, cy = 280;
  // 帯（上下に開く）
  g.save(); g.beginPath(); g.rect(0, cy - bh / 2, W, bh); g.clip();
  g.fillStyle = 'rgba(8,8,14,.9)'; g.fillRect(0, cy - 140, W, 280);
  // 背景に流れる大きな英字
  g.save(); g.globalAlpha = 0.12; g.font = `200px ${o.fontEn}`; g.fillStyle = acc;
  g.fillText(o.en + '  ' + o.en, 300 - t * 260, cy + 70); g.restore();
  speedLines(g, t, 22, W * 2, 260, acc, 13, -1);
  // 立ち絵：右から左へ横切り続ける（止まらない）
  const px = 1250 - 520 * outCubic(seg(t, 0.0, 0.5)) - t * 40;
  portraitWithFlash(g, px, cy - 10, 140, 0.12, t);
  g.restore();
  // 帯のふち
  g.fillStyle = acc; g.fillRect(0, cy - bh / 2 - 5, W * open, 5); g.fillRect(W * (1 - open), cy + bh / 2, W * open, 5);
  // 名前：左から右へ逆向きに流れる
  const nk = outExpo(seg(t, 0.25, 0.7));
  if (nk > 0 && out < 1) {
    g.save(); g.globalAlpha = nk * (1 - out);
    fitFont(g, o.name, 64, o.fontName, 560); outlinedText(g, o.name, 60 - (1 - nk) * 120 + t * 14, cy + 22, '#fff', '#000', 10);
    g.font = `22px ${o.fontUi}`; g.fillStyle = acc; g.fillText(o.sub, 64 - (1 - nk) * 80 + t * 10, cy - 42);
    g.restore();
  }
  glint(g, t, 0.12, 0.35); screenFlash(g, t, 0.1, 0.18, 0.7);
}

/* ===== 3 まなざし ===== */
function eyes(g, t, o) {
  const acc = o.color, out = inCubic(seg(t, 2.05, 2.45));
  const open = outExpo(seg(t, 0.05, 0.35)) * (1 - out);
  const bh = 150 * open, cy = 250;
  g.save(); g.beginPath(); g.rect(0, cy - bh / 2, W, bh); g.clip();
  g.fillStyle = '#05050a'; g.fillRect(0, cy - 80, W, 160);
  // 目元を大きく。ゆっくり寄りながら横へ
  const z = 1 + t * 0.04;
  const eyeUp = 0.22; // 目は顔の中心より 顔の幅×0.22 ほど上
  const fw = 560 * z;
  portraitWithFlash(g, 470 - t * 18, cy + eyeUp * fw, fw, 0.1, t);
  // 走査線
  g.globalAlpha = 0.12; g.fillStyle = '#000'; for (let y = cy - 80; y < cy + 80; y += 3) g.fillRect(0, y, W, 1);
  g.restore();
  // ふち線
  if (out < 1) {
    g.save(); g.globalAlpha = 1 - out; g.fillStyle = acc;
    g.fillRect(0, cy - bh / 2 - 3, W, 3); g.fillRect(0, cy + bh / 2, W, 3);
    g.restore();
  }
  // 台詞と名前
  const nk = outCubic(seg(t, 0.4, 0.8));
  if (nk > 0 && out < 1) {
    g.save(); g.globalAlpha = nk * (1 - out);
    fitFont(g, o.line, 30, o.fontName, 840); outlinedText(g, o.line, 60 + (1 - nk) * 30, cy + bh / 2 + 56, '#fff', '#000', 8);
    g.font = `18px ${o.fontEn}`; g.letterSpacing = '5px'; g.fillStyle = acc; g.fillText(o.en, 62, cy - bh / 2 - 16); g.letterSpacing = '0px';
    g.restore();
  }
  screenFlash(g, t, 0.06, 0.2, 0.8);
}

/* ===== 4 キャラ紹介（せり上がり） ===== */
function intro(g, t, o) {
  const acc = o.color, out = inCubic(seg(t, 2.0, 2.45));
  const rin = outExpo(seg(t, 0.0, 0.5));
  g.save(); g.globalAlpha = 1 - out; g.translate(0, (1 - rin) * 560 + out * 120);
  g.fillStyle = acc; g.globalAlpha *= 0.9;
  g.beginPath(); g.moveTo(520, H); g.lineTo(640, 0); g.lineTo(940, 0); g.lineTo(820, H); g.closePath(); g.fill();
  g.globalAlpha = (1 - out) * 0.6; g.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) { const x = 960 + i * 20; g.beginPath(); g.moveTo(x - 120, H); g.lineTo(x, 0); g.lineTo(x + 5, 0); g.lineTo(x - 115, H); g.closePath(); g.fill(); }
  g.restore();
  // 立ち絵：下からせり上がり、決めの間もゆっくり上へ
  const pin = outExpo(seg(t, 0.08, 0.6));
  portraitWithFlash(g, 700 - Math.max(0, t - 0.3) * 10, 175 + (1 - pin) * 420 - Math.max(0, t - 0.3) * 8 - out * 60, 120, 0.16, t, { alpha: clamp(seg(t, 0.08, 0.2)) * (1 - out) });
  const bin = outExpo(seg(t, 0.22, 0.62)), bx = -out * 760;
  g.save(); g.translate(bx, 0);
  g.fillStyle = 'rgba(12,12,18,.88)';
  g.beginPath(); g.moveTo(0, 388); g.lineTo(640 * bin, 388); g.lineTo(640 * bin - 26, 470); g.lineTo(0, 470); g.closePath(); g.fill();
  g.fillStyle = acc; g.fillRect(56, 400, 8 * clamp(bin * 2), 58);
  const nin = outCubic(seg(t, 0.36, 0.78));
  g.save(); g.beginPath(); g.rect(70, 380, 560 * nin, 100); g.clip();
  g.letterSpacing = (o.nameSpacing ?? 6) + 'px'; fitFont(g, o.name, 58, o.fontName, 530); g.fillStyle = '#fff'; g.fillText(o.name, 84 - (1 - nin) * 40, 451); g.letterSpacing = '0px'; g.restore();
  const sin = outExpo(seg(t, 0.48, 0.86)), d = (1 - sin) * 60;
  g.globalAlpha = sin; g.font = `22px ${o.fontUi}`;
  const sw = g.measureText(o.sub).width + 28;
  g.fillStyle = acc; g.beginPath(); g.moveTo(56 - d, 346); g.lineTo(56 + sw - d, 346); g.lineTo(46 + sw - d, 380); g.lineTo(46 - d, 380); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.fillText(o.sub, 68 - d, 371);
  g.globalAlpha = 0.8 * outCubic(seg(t, 0.6, 1.0)); g.font = `20px ${o.fontEn}`; g.letterSpacing = '6px'; g.fillText(o.en, 66, 500); g.letterSpacing = '0px';
  g.restore();
  glint(g, t, 0.16, 0.4, -0.25);
}

/* ===== 5 スタイリッシュ（大きな文字） ===== */
function stylish(g, t, o) {
  const RED = o.color, BLK = '#0a0a0a', out = inCubic(seg(t, 2.05, 2.45));
  const [sx, sy] = shake(t, 0.5, 0.2, 7);
  g.save(); g.translate(sx, sy);
  if (out > 0) { const c = out * 1500; g.beginPath(); g.moveTo(-200 + c, -50); g.lineTo(W + 400, -50); g.lineTo(W + 400, H + 50); g.lineTo(-500 + c, H + 50); g.closePath(); g.clip(); }
  const kin = outExpo(seg(t, 0.0, 0.25)), ky = (1 - kin) * 300;
  g.fillStyle = BLK; g.beginPath(); g.moveTo(-40, 40 - ky); g.lineTo(W * 0.78, -20 - ky); g.lineTo(W * 0.55, 150 - ky); g.lineTo(-40, 220 - ky); g.closePath(); g.fill();
  const rin = outExpo(seg(t, 0.06, 0.34));
  g.save(); g.translate((1 - rin) * 700, 0);
  g.beginPath(); g.moveTo(210, 30); g.lineTo(W + 40, -10); g.lineTo(W + 40, H - 20); g.lineTo(60, H - 70); g.closePath();
  g.fillStyle = RED; g.fill(); g.save(); g.clip();
  g.fillStyle = 'rgba(0,0,0,.22)';
  for (let y = 0; y < H + 20; y += 16) for (let x = 0; x < W + 40; x += 16) { const r = 1 + 5 * clamp((x + y - 500) / 900); g.beginPath(); g.arc(x + (y / 16 % 2) * 8, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = BLK;
  for (let i = 0; i < 5; i++) { const x = 320 + i * 140 + hash(i, 3) * 40 - t * 30, w = 6 + hash(i, 5) * 18; g.beginPath(); g.moveTo(x, -10); g.lineTo(x + w, -10); g.lineTo(x + w - 220, H + 10); g.lineTo(x - 220, H + 10); g.closePath(); g.fill(); }
  g.restore(); g.restore();
  // 白縁の立ち絵
  const pin = outExpo(seg(t, 0.14, 0.6)), dr = Math.max(0, t - 0.4);
  const fx = 225 - (1 - pin) * 200 + dr * 12, fy = 160 + (1 - pin) * 300 - dr * 6;
  face(g, P.outl.c, fx, fy, 120, { rot: -0.07, pad: P.outl.pad, alpha: clamp(pin * 3) });
  portraitWithFlash(g, fx, fy, 120, 0.18, t, { rot: -0.07, alpha: clamp(pin * 3) });
  // 1字ずつ（本番では1字ずつ 位置・大きさ・字間を調整できる）
  const chars = [...o.main];
  const styles = [{ bg: '#fff', fg: BLK }, { bg: BLK, fg: '#fff' }, { bg: '#fff', fg: RED }, { bg: BLK, fg: RED }, { bg: RED, fg: '#fff' }, { bg: '#fff', fg: BLK }];
  const sizes = chars.map((c, i) => 84 + hash(i, 21) * 34);
  let total = 0; chars.forEach((c, i) => { g.font = `${sizes[i]}px ${o.fontMain}`; total += g.measureText(c).width + 28; });
  const fit = Math.min(1, 500 / total); let x = 420;
  chars.forEach((ch, i) => {
    const t0 = 0.3 + i * 0.05, k = seg(t, t0, t0 + 0.14), st = styles[i % styles.length];
    const size = sizes[i] * fit, rot = (hash(i, 31) - 0.5) * 0.32, yy = 250 + (hash(i, 41) - 0.5) * 34 - i * 7;
    g.font = `${size}px ${o.fontMain}`; const cw = g.measureText(ch).width, cx = x + cw / 2 + 10; x += cw + 28 * fit;
    if (k <= 0) return;
    const sc = 1.7 - 0.7 * outBack(k);
    g.save(); g.translate(cx, yy); g.rotate(rot + (1 - k) * 0.4); g.scale(sc, sc);
    g.fillStyle = BLK; g.fillRect(-cw / 2 - 4, -size * 0.58 + 6, cw + 20, size * 1.1);
    g.fillStyle = st.bg; g.fillRect(-cw / 2 - 10, -size * 0.58, cw + 20, size * 1.1);
    g.fillStyle = st.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, -size * 0.03);
    g.restore();
  });
  const ek = outExpo(seg(t, 0.62, 0.95));
  if (ek > 0) { g.save(); g.translate(560 + (1 - ek) * 400, 372); g.rotate(-0.08); g.fillStyle = BLK; g.fillRect(-20, -34, 400, 48); g.font = `italic 34px ${o.fontEn}`; g.fillStyle = '#fff'; g.letterSpacing = '4px'; g.fillText(o.en, 0, 4); g.fillStyle = RED; g.fillRect(-20, 14, 400 * ek, 6); g.restore(); }
  const nk = outExpo(seg(t, 0.7, 1.0));
  if (nk > 0) { g.save(); g.globalAlpha = nk; g.translate(580, 440); g.rotate(-0.08); fitFont(g, o.name, 30, o.fontName, 360); outlinedText(g, o.name, 0, 0, '#fff', BLK, 8); g.restore(); }
  g.restore();
  screenFlash(g, t, 0, 0.12, 0.85);
}

/* ===== 6 対決（VS） ===== */
function versus(g, t, o) {
  const out = inCubic(seg(t, 2.05, 2.45));
  const [sx, sy] = shake(t, 0.48, 0.25, 12);
  g.save(); g.translate(sx, sy);
  const k = outExpo(seg(t, 0.0, 0.35));
  // 左右の面が斜めの境目でぶつかる
  const gap = 8;
  const L = (1 - k) * -600 - out * 600, R = (1 - k) * 600 + out * 600;
  // 左
  g.save(); g.translate(L, 0);
  g.beginPath(); g.moveTo(-20, 40); g.lineTo(560 - gap, 40); g.lineTo(420 - gap, H - 40); g.lineTo(-20, H - 40); g.closePath();
  g.fillStyle = o.color; g.fill(); g.save(); g.clip();
  g.fillStyle = 'rgba(0,0,0,.25)'; speedLines(g, t, 18, 1400, 460, '#fff', 3, -1);
  portraitWithFlash(g, 260 - t * 10, 230, 150, 0.12, t);
  g.restore();
  fitFont(g, o.name, 40, o.fontName, 380); outlinedText(g, o.name, 40, H - 64, '#fff', '#000', 9);
  g.restore();
  // 右（相手：シルエットの ？？？）
  g.save(); g.translate(R, 0);
  g.beginPath(); g.moveTo(560 + gap, 40); g.lineTo(W + 20, 40); g.lineTo(W + 20, H - 40); g.lineTo(420 + gap, H - 40); g.closePath();
  g.fillStyle = o.color2; g.fill(); g.save(); g.clip();
  g.fillStyle = 'rgba(0,0,0,.25)'; speedLines(g, t, 18, 1400, 460, '#fff', 5, 1);
  if (P2) portraitWithFlash(g, 700 + t * 10, 230, 150, 0.2, t, { src: P2.src, white: P2.white, flip: true, P: P2 });
  else portraitWithFlash(g, 700 + t * 10, 230, 150, 0.2, t, { src: P.sil, flip: true });
  g.restore();
  fitFont(g, o.name2, 40, o.fontName, 380); g.textAlign = 'right'; outlinedText(g, o.name2, W - 40, 100, '#fff', '#000', 9);
  g.restore();
  // VS：真ん中に叩きつけ
  const v = seg(t, 0.36, 0.5);
  if (v > 0 && out < 1) {
    const sc = 2.6 - 1.6 * outCubic(v);
    g.save(); g.translate(W / 2 - 10, H / 2 + 10); g.rotate(-0.12); g.scale(sc * (1 + out), sc * (1 - out)); g.globalAlpha = clamp(v * 2);
    g.font = `170px ${o.fontEn}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    outlinedText(g, 'VS', 8, 10, '#000', '#000', 30);
    outlinedText(g, 'VS', 0, 0, '#fff', '#111', 18);
    g.restore();
  }
  g.restore();
  screenFlash(g, t, 0.36, 0.2, 0.9);
}


/* ===== 7 たてながし（縦に走る） ===== */
// 縦書き：1字ずつ下へ積む
// 縦書きで横に倒す文字（長音・ダッシュ・波線・三点リーダー）
const VROT = /[ー－―—〜～…‥]/;
function vtext(g, s, x, y, size, gap, each) {
  [...s].forEach((ch, i) => {
    if (ch === ' ' || ch === '\u3000') return;
    const yy = y + i * (size + gap), rot = VROT.test(ch) ? Math.PI / 2 : 0;
    if (each) { each(ch, i, x, yy, rot); return; }
    if (!rot) { g.fillText(ch, x, yy); return; }
    g.save(); g.translate(x, yy); g.rotate(rot); g.fillText(ch, 0, 0); g.restore();
  });
}
function tate(g, t, o) {
  const acc = o.color, out = inCubic(seg(t, 2.05, 2.45)), ang = 7 * Math.PI / 180;
  const [sx, sy] = shake(t, 0.46, 0.2, 9);
  g.save(); g.translate(sx, sy);
  // 細い帯をななめに立てる。cx: 帯の中心、w: 幅、dir: 入ってくる向き（-1 上から / 1 下から）
  const strip = (cx, w, dir, t0, body) => {
    const k = outExpo(seg(t, t0, t0 + 0.32));
    const dy = dir * ((1 - k) * 900 + out * 900);
    g.save(); g.translate(cx, H / 2 + dy); g.rotate(ang);
    g.beginPath(); g.rect(-w / 2, -420, w, 840); g.clip();
    body(w); g.restore();
  };
  // 1：立ち絵の帯（上から）
  strip(400, 300, -1, 0.0, w => {
    g.fillStyle = '#0b0b12'; g.fillRect(-w / 2, -420, w, 840);
    // 縦に流れる線
    for (let i = 0; i < 26; i++) {
      const r = hash(i, 17), r2 = hash(i, 19), len = 100 + r2 * 300, sp = 1000 + r2 * 1200;
      const yy = ((r * 3000 + t * sp) % (840 + len)) - 420 - len;
      g.fillStyle = i % 4 === 0 ? acc : 'rgba(255,255,255,.45)';
      g.fillRect(-w / 2 + r * w, yy, i % 4 === 0 ? 3 : 1.5, len);
    }
    g.rotate(-ang);
    portraitWithFlash(g, 10, -40 - Math.max(0, t - 0.3) * 26, 175, 0.12, t);
    g.rotate(ang);
    g.fillStyle = acc; g.fillRect(-w / 2, -420, 6, 840); g.fillRect(w / 2 - 6, -420, 6, 840);
  });
  // 2：大きな縦書きの文字の帯（下から）
  strip(660, 170, 1, 0.08, w => {
    g.fillStyle = acc; g.fillRect(-w / 2, -420, w, 840);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = -420; y < 420; y += 14) g.fillRect(-w / 2, y + ((t * 300) % 14), w, 5);
    const n = Math.max(1, [...o.main].length), size = Math.min(128, Math.floor(500 / n) - 6), gap = 6; // 画面の高さ 540 に収める
    g.font = `${size}px ${o.fontMain}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const top = -((n - 1) * (size + gap)) / 2;
    vtext(g, o.main, 0, top, size, gap, (ch, i, x, y, rot) => {
      const k = seg(t, 0.3 + i * 0.07, 0.3 + i * 0.07 + 0.12); if (k <= 0) return;
      const sc = 2 - outCubic(k);
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = clamp(k * 2);
      outlinedText(g, ch, 5, 6, '#000', '#000', 18); outlinedText(g, ch, 0, 0, '#fff', '#000', 10);
      g.restore();
    });
  });
  // 3：名前の細い帯（上から）
  strip(790, 70, -1, 0.16, w => {
    g.fillStyle = '#f4f4f6'; g.fillRect(-w / 2, -420, w, 840);
    const nm = o.name.replace(/\s+/g, ''), ns = Math.min(46, Math.floor(500 / Math.max(1, [...nm].length)) - 4);
    g.font = `${ns}px ${o.fontName}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#0b0b12';
    const nk = seg(t, 0.45, 0.8);
    g.save(); g.beginPath(); g.rect(-w / 2, -260, w, 520 * outCubic(nk)); g.clip();
    vtext(g, nm, 0, -150, ns, 4); g.restore();
    g.fillStyle = acc; g.fillRect(-w / 2, -420, w, 10);
  });
  // 4：細い飾り線
  strip(860, 10, 1, 0.2, w => { g.fillStyle = acc; g.fillRect(-w / 2, -420, w, 840); });
  strip(225, 8, 1, 0.12, w => { g.fillStyle = '#fff'; g.fillRect(-w / 2, -420, w, 840); });
  g.restore();
  screenFlash(g, t, 0.0, 0.14, 0.85); screenFlash(g, t, 0.46, 0.12, 0.4);
}


/* ---------- 型の一覧 ---------- */
// fields: 型ごとに入力できる文字。main=大きな文字 name=名前 sub=小見出し line=ひとこと en=英字 name2=相手の名前
export const TEMPLATES = [
  { id: 'slash', draw: slash, fields: ['main', 'name'], color: '#e0303a', texts: { main: '応戦', name: 'キャラクター名' }, fonts: { main: 'heavy', name: 'gothic' } },
  { id: 'pass', draw: pass, fields: ['name', 'sub', 'en'], color: '#ff7a1a', texts: { name: 'キャラクター名', sub: 'ROUND 01', en: 'CHARACTER NAME' }, fonts: { name: 'gothic' } },
  { id: 'eyes', draw: eyes, fields: ['line', 'en'], color: '#ff7a1a', texts: { line: '「……逃がさない」', en: 'CHARACTER NAME' }, fonts: { name: 'gothic' } },
  { id: 'intro', draw: intro, fields: ['name', 'sub', 'en'], color: '#3a7bd5', texts: { name: 'キャラクター名', sub: '探索者 ／ 私立探偵', en: 'CHARACTER NAME' }, fonts: { name: 'bold' }, nameSpacing: 6 },
  { id: 'stylish', draw: stylish, fields: ['main', 'en', 'name'], color: '#d7141e', texts: { main: 'クリティカル', en: 'CRITICAL HIT!!', name: 'キャラクター名' }, fonts: { main: 'heavy', name: 'gothic' } },
  { id: 'versus', draw: versus, fields: ['name', 'name2'], color: '#e0662a', color2: '#3b2a6e', texts: { name: 'キャラクター名', name2: '？？？' }, fonts: { name: 'gothic' } },
  { id: 'tate', draw: tate, fields: ['main', 'name'], color: '#ff7a1a', texts: { main: '反論', name: 'キャラクター名' }, fonts: { main: 'heavy', name: 'gothic' } }
];
export const byId = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

// 書体（Google Fonts）。local はPCに入っているフォント名をそのまま使う
export const FONTS = {
  gothic: '"Zen Kaku Gothic New", sans-serif',
  heavy: '"Dela Gothic One", sans-serif',
  mincho: '"Zen Old Mincho", serif',
  maru: '"Zen Maru Gothic", sans-serif',
  brush: '"Yuji Boku", serif',
  bold: '"M PLUS 1", sans-serif'
};
// 各書体は1つの太さだけ読み込むので、g.font に太さを書かなくてもその太さで描かれる
export function fontFamily(key, localName) {
  if (key === 'local') return localName ? `"${String(localName).replace(/["\\]/g, '')}", sans-serif` : FONTS.gothic;
  return FONTS[key] || FONTS.gothic;
}
/**
 * 1コマ描く。g は w×h のキャンバス。opts は型の文字・色・書体、portrait は立ち絵（prepared）。
 *   t: 速さ1倍のときの秒。exit=false なら HOLD_END で止める。
 */
export function render(g, w, h, tpl, t, opts, portrait, rival = null) {
  P = portrait; P2 = rival; FL = opts.flash ?? 1;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  g.scale(w / W, h / H);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
  try { tpl.draw(g, t, opts); } finally { g.restore(); P = null; P2 = null; }
}

/* ---------- 立ち絵の下ごしらえ ---------- */
function tinted(src, color, pad = 0, width = 0) {
  const c = mk(src.width + pad * 2, src.height + pad * 2), g = c.getContext('2d');
  if (width) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.drawImage(src, pad + Math.cos(a) * width, pad + Math.sin(a) * width); }
  else g.drawImage(src, pad, pad);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}
/** 透過済みのキャンバスから、描画に使う形（白・縁取り・シルエット）を作る。face = { x, y, w }（元画像の座標） */
export function preparePortrait(canvas, face) {
  const outlineW = Math.max(6, Math.round(face.w * 0.09));
  return {
    src: canvas,
    white: tinted(canvas, '#ffffff'),
    outl: { c: tinted(canvas, '#ffffff', outlineW + 2, outlineW), pad: outlineW + 2 },
    sil: tinted(canvas, '#0b0b10'),
    face: { ...face },
    dx: 0, dy: 0, zoom: 1, flip: false
  };
}

/** 立ち絵がまだ無いときの仮の立ち絵（バストアップの人形） */
export function placeholderPortrait() {
  const c = mk(600, 760), g = c.getContext('2d');
  g.fillStyle = '#4a5468';
  g.beginPath(); g.moveTo(40, 760); g.bezierCurveTo(60, 560, 170, 520, 300, 515); g.bezierCurveTo(430, 520, 540, 560, 560, 760); g.closePath(); g.fill();
  g.fillStyle = '#8a93a6'; g.fillRect(262, 420, 76, 110);
  g.fillStyle = '#9aa3b6'; g.beginPath(); g.ellipse(300, 330, 112, 138, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a4254';
  g.beginPath(); g.moveTo(180, 330); g.bezierCurveTo(170, 170, 300, 150, 420, 200); g.bezierCurveTo(440, 230, 430, 300, 420, 330); g.lineTo(380, 250); g.lineTo(300, 270); g.lineTo(240, 240); g.closePath(); g.fill();
  return preparePortrait(c, { x: 300, y: 330, w: 220 });
}
