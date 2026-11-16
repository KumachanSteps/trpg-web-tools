// 画面の下の隅から、血がななめ上へ向かって勢いよく飛び散る（1回再生）
// 血の絵は「血しぶき」と同じ EX の写真の血（fx-vampire-blood-data.js の core / all）。隅に中心を置き、飛ぶ向きに引きのばして、隅から外へ広がるように見せる
import { loadEx } from '../../ex-bridge.js';
import { clamp, smooth } from '../../kit.js';

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('blood image failed'));
    im.src = src;
  });
}
const easeOut = (x, p = 2.6) => 1 - Math.pow(1 - clamp(x), p);

// 写真の血の中心（540×540 の絵の中で）
const CX = 255, CY = 300, SZ = 540;

export default {
  async setup(P, S) {
    await loadEx();
    const D = window.TextApngVampireBloodData;
    const [all, core] = await Promise.all([loadImage(D.all), loadImage(D.core)]);
    return { all, core, tmp: makeCanvas(SZ, SZ) };
  },
  draw(ctx, t, P, st, S) {
    const { w: W, h: H } = S;
    const u = H / 540;
    const right = P.side === 'right';
    const size = P.size ?? 1;
    const stay = !!P.stay;
    // 1回ぶんを 0〜1 にした時間：0〜0.3 で飛び散り、残すときはそのまま、残さないときは 0.65 から薄れる
    const fade = stay ? 1 : 1 - smooth((t - 0.65) / 0.35);
    if (fade <= 0.003) return;
    // 飛ぶ向き（画面の上を 0 として、右へ傾ける角度）と、引きのばし
    const ang = (P.angle ?? 40) * Math.PI / 180;
    const k = 1.35 * u * size;           // 絵 540px → 画面の大きさ
    const along = 2.2, across = 0.95;     // 飛ぶ向きに長く
    const layers = [
      // 細い飛沫まで含む全体：少し遅れて、遠くまで
      { im: st.all, R: 470 * easeOut((t - 0.03) / 0.3, 3), a: smooth((t - 0.04) / 0.12), s: 0.82 + 0.18 * easeOut((t - 0.04) / 0.4), blur: 0 },
      // 中心の濃い所：先に、近くに
      { im: st.core, R: 300 * easeOut(t / 0.18, 3), a: smooth(t / 0.06), s: 0.7 + 0.3 * easeOut(t / 0.3), blur: 5 * (1 - easeOut(t / 0.25)) }
    ];
    const tc = st.tmp.getContext('2d');
    for (const l of layers) {
      if (l.R <= 0.5 || l.a <= 0.003) continue;
      tc.setTransform(1, 0, 0, 1, 0, 0);
      tc.globalCompositeOperation = 'source-over';
      tc.clearRect(0, 0, SZ, SZ);
      tc.filter = l.blur > 0.3 ? `blur(${l.blur}px)` : 'none';
      tc.setTransform(l.s, 0, 0, l.s, CX - l.s * CX, CY - l.s * CY);
      tc.drawImage(l.im, 0, 0);
      tc.setTransform(1, 0, 0, 1, 0, 0);
      tc.filter = 'none';
      // 中心から広がる柔らかい円で切り抜く（縁の幅 90px）
      const SOFT = 60;
      const g = tc.createRadialGradient(CX, CY, 0, CX, CY, l.R);
      const edge = (l.R - SOFT) / l.R;
      if (edge > 0) { g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(edge, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { g.addColorStop(0, `rgba(0,0,0,${clamp(l.R / SOFT)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); }
      tc.globalCompositeOperation = 'destination-in';
      tc.fillStyle = g;
      tc.fillRect(0, 0, SZ, SZ);
      tc.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.globalAlpha *= l.a * fade;
      // 隅（少し画面の外）に中心を置き、飛ぶ向きに回して引きのばす
      if (right) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.translate(-24 * u, H + 30 * u);
      ctx.rotate(ang);
      ctx.scale(across * k, along * k);
      // 写真の血のいちばん長い筋（右上向き）を、飛ぶ向きにそろえる
      ctx.rotate(-0.6);
      ctx.drawImage(st.tmp, -CX, -CY);
      ctx.restore();
    }
  }
};
