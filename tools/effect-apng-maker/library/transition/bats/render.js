// コウモリの群れの場面転換。コウモリの絵は TK のハロウィン素材 H19（bat.png：羽ばたきの4コマ）をそのまま使う。
// 闇の面を別に広げるのではなく、コウモリが持ち場に集まり、重なり合って画面を黒くしていく。
//   rise  … 中央下から集まる。現れるときは、下から順に上へ飛び去る
//   close … まわりから集まり、真ん中が最後に閉じる
//   sweep … 横から集まる
import { rng, clamp, smooth } from '../../kit.js';

const CW = 340, CH = 300;            // bat.png の1コマの大きさ
const COLS = 24, ROWS = 14;          // 持ち場のます目
const TRAVEL = 0.34;                 // 持ち場まで飛ぶのにかける p の長さ
const SPREAD = 1 - TRAVEL - 0.06;    // 出発の時刻をばらす幅

let sheetPromise = null;
function loadSheet() {
  if (!sheetPromise) {
    sheetPromise = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('bat.png failed to load'));
      im.src = new URL('./bat.png?v=1', import.meta.url).href;
    });
  }
  return sheetPromise;
}

export default {
  async setup(P, S) {
    const im = await loadSheet();
    // 覆う色に染めたコウモリ
    const tint = document.createElement('canvas');
    tint.width = im.width; tint.height = im.height;
    const tc = tint.getContext('2d');
    tc.drawImage(im, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = P.color;
    tc.fillRect(0, 0, tint.width, tint.height);

    const r = rng(S.seed + 41);
    const per = Math.max(1, Math.round(2 * P.amount));   // 1ますあたりの数
    const bats = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) for (let k = 0; k < per; k++) {
      bats.push({ x: (i + 0.5 + (r() - 0.5) * 1.1) / COLS, y: (j + 0.5 + (r() - 0.5) * 1.1) / ROWS, s: 0.75 + 0.6 * r(), ph: Math.floor(r() * 4), f: 9 + r() * 5, jit: r(), rot: (r() - 0.5) * 0.5, side: r() - 0.5 });
    }
    return { tint, bats };
  },
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const unit = h / 540 * P.size;
    const reveal = !!S.revealing && P.motion === 'rise';
    const q = reveal ? 1 - p : p;                  // reveal：0 で真っ黒 → 1 で何もない
    const sec = p * S.duration;
    const cell = w / COLS;
    for (const b of st.bats) {
      const hx = b.x * w, hy = b.y * h;
      // 順番（0＝最初、1＝最後）と、飛んでくる元の位置
      let order, sx, sy;
      if (P.motion === 'close') {
        const dx = b.x - 0.5, dy = b.y - 0.5;
        const m = Math.min(1, Math.hypot(dx, dy) / 0.71);            // 0＝中央、1＝四隅（丸く閉じる）
        order = 1 - m;
        const len = Math.hypot(dx, dy) || 1;
        sx = hx + dx / len * w * 0.75; sy = hy + dy / len * w * 0.75;
      } else if (P.motion === 'sweep') {
        const u = P.from === 'right' ? 1 - b.x : b.x;
        order = u;
        sx = P.from === 'right' ? w * 1.15 : -w * 0.15; sy = hy + b.side * h * 0.5;
      } else {
        order = clamp(Math.hypot((b.x - 0.5) * 1.1, (1 - b.y) * 1.25) / 1.37);
        sx = w * (0.5 + b.side * 0.25); sy = h * 1.18;
      }
      const t0 = clamp(order * 0.86 + b.jit * 0.14) * SPREAD;
      let x, y, k, alpha = 1;
      if (reveal) {
        // 持ち場を離れて上へ飛び去る（下のものから順に）
        const a = (q - t0) / TRAVEL;
        if (a >= 1.6) continue;
        const e = a <= 0 ? 0 : a * a;
        x = hx + b.side * w * 0.5 * e;
        y = hy - h * 0.9 * e - 30 * unit * Math.sin(Math.min(a, 1) * Math.PI) * b.jit;
        k = a <= 0 ? 1 : Math.max(0.3, 1 - 0.55 * a);
        alpha = a <= 1 ? 1 : clamp(1 - (a - 1) / 0.6);
      } else {
        const a = (q - t0) / TRAVEL;
        if (a <= 0) continue;
        const e = smooth(a);
        x = sx + (hx - sx) * e;
        y = sy + (hy - sy) * e - 40 * unit * Math.sin(Math.min(a, 1) * Math.PI) * (b.jit - 0.3);
        k = a >= 1 ? 1 : 0.35 + 0.65 * e;         // 遠くから近づくように、だんだん大きく
      }
      if (y < -cell * 3 || y > h + cell * 3 || x < -cell * 3 || x > w + cell * 3) continue;
      // 持ち場に着いたコウモリは、少しずつ大きく重なって、すき間を自分の黒で埋める
      const settled = reveal ? clamp((t0 - q) / 0.12) : clamp((q - t0 - TRAVEL) / 0.12);
      const span = cell * (2.3 + 2.6 * settled) * b.s * k * P.size;
      const pose = (b.ph + Math.floor(sec * b.f)) % 4;
      const dw = span, dh = span * CH / CW;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(b.rot * (1 - 0.5 * settled));
      ctx.drawImage(st.tint, pose * CW, 0, CW, CH, -dw / 2, -dh / 2, dw, dh);
      // 体のあたりの黒：重なりが十分になったところだけ、羽の下に隠れて濃くなる
      if (settled > 0) {
        ctx.fillStyle = P.color;
        ctx.beginPath();
        ctx.arc(0, 0, cell * 0.95 * settled, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (q >= 0.999 || (reveal && q <= 0.001)) { ctx.fillStyle = P.color; ctx.fillRect(0, 0, w, h); }
  }
};
