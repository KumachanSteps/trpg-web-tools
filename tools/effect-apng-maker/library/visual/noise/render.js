import { rng } from '../../kit.js';

// フレームごとに粒を描き直す。粒を大きくするほど・量を減らすほど軽くなる
export default {
  setup(P, S) {
    const g = Math.max(1, Math.round(P.grain * S.h / 540));
    const cw = Math.ceil(S.w / g), ch = Math.ceil(S.h / g);
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, ch) : Object.assign(document.createElement('canvas'), { width: cw, height: ch });
    return { canvas, cx: canvas.getContext('2d'), cw, ch, g, frames: Math.max(2, Math.round(S.duration * S.fps)) };
  },
  draw(ctx, t, P, st, S) {
    const idx = Math.round(t * st.frames) % st.frames;
    const r = rng(S.seed * 131 + idx * 7919);
    const img = st.cx.createImageData(st.cw, st.ch);
    const d = img.data;
    const staticMode = P.mode === 'static';
    const amount = P.amount;
    for (let i = 0; i < d.length; i += 4) {
      const v = r();
      if (staticMode) {
        const c = v * 255;
        d[i] = d[i + 1] = d[i + 2] = c;
        d[i + 3] = 255 * amount;
      } else if (v < amount * 0.5) {
        const light = r() < 0.5;
        const c = light ? 235 : 20;
        d[i] = d[i + 1] = d[i + 2] = c;
        d[i + 3] = 60 + 140 * r();
      }
      if (P.tint && d[i + 3]) { d[i] = Math.min(255, d[i] * 1.05 + 12); d[i + 2] = d[i + 2] * 0.85; }
    }
    st.cx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(st.canvas, 0, 0, st.cw * st.g, st.ch * st.g);
    ctx.imageSmoothingEnabled = true;
  }
};
