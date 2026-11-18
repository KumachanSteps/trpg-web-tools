/*
 * 演出APNGメーカー — 血の「液体らしい」描き方（垂れる血など）
 *  - 形（円をつなげたもの）を白で描き、ぼかしてから「しきい値で切る」と、つながった滴が丸くなめらかに溶け合う（メタボール）
 *  - もう少し大きくぼかした高さから面の向きを出し、上からの光でつや（白い照り）と、厚い所ほど暗い赤をつける
 *  - 重いので、内部は縦横 res 倍（既定 0.5）で描いて引きのばす
 */

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

// 血の色（EX の写真の血しぶきから拾った色）：明るい所 → 暗い所
const C_HI = [196, 20, 30];
const C_MID = [142, 10, 18];
const C_LO = [96, 4, 10];
// 縁どりの描き方（style: 'rim'）の色：中の深紅・縁の明るい赤・外のにじみ
const R_IN = [92, 10, 18];
const R_RIM = [214, 40, 52];
const R_GLOW = [190, 24, 36];

/** 描くための入れ物を作る。shape(g, k) は内部の大きさ（k 倍）で形を白く描く関数 */
export function liquidState() {
  return { mask: null, soft: null, dome: null, out: null, img: null };
}

/**
 * 形を描いて、液体として ctx に重ねる。
 *   shape: (g, k) => void  … g に白で形を描く。座標は「実寸 × k」で描く（k = res）
 *   opt:   { res=0.5, edge=3（なめらかさ・実寸 px）, dome=9（ふくらみ・実寸 px）, alpha=1, u=H/540,
 *            style: 'gloss'（つやのある立体）| 'rim'（平らな深紅＋明るい縁どり） }
 */
export function drawLiquid(ctx, W, H, st, shape, opt = {}) {
  const k = opt.res ?? 0.5;
  const u = opt.u ?? H / 540;
  // 画面の外にはみ出した形も、ぼかしでは「続いている」ものとして扱いたいので、まわりに余白をとる
  const pd = Math.ceil(3 * (opt.dome ?? 9) * u * k);
  const vw = Math.max(2, Math.round(W * k)), vh = Math.max(2, Math.round(H * k));
  const bw = vw + 2 * pd, bh = vh + 2 * pd;
  if (!st.mask || st.mask.width !== bw || st.mask.height !== bh) {
    st.mask = makeCanvas(bw, bh); st.soft = makeCanvas(bw, bh); st.dome = makeCanvas(bw, bh); st.out = makeCanvas(bw, bh);
    st.img = st.out.getContext('2d').createImageData(bw, bh);
  }
  const m = st.mask.getContext('2d');
  m.setTransform(1, 0, 0, 1, 0, 0);
  m.clearRect(0, 0, bw, bh);
  m.fillStyle = '#fff';
  m.translate(pd, pd);
  shape(m, k);
  m.setTransform(1, 0, 0, 1, 0, 0);

  const blurTo = (dst, px) => {
    const g = dst.getContext('2d', { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.filter = `blur(${Math.max(0.3, px).toFixed(2)}px)`;
    g.drawImage(st.mask, 0, 0);
    g.filter = 'none';
    return g.getImageData(0, 0, bw, bh).data;
  };
  const A = blurTo(st.soft, (opt.edge ?? 3) * u * k);
  const D = blurTo(st.dome, (opt.dome ?? 9) * u * k);

  const out = st.img.data;
  const alphaAll = opt.alpha ?? 1;
  const rim = opt.style === 'rim';
  // 光の向き（左上から少し手前）
  const lx = -0.45, ly = -0.6, lz = 0.66;
  const slope = 2.2 / (u * k);  // 高さの差 → 傾き。大きさが変わっても同じ見た目になるように
  for (let y = 0; y < bh; y++) {
    const y0 = y > 0 ? y - 1 : y, y1 = y < bh - 1 ? y + 1 : y;
    for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 4;
      const a = A[i + 3] / 255;
      // しきい値でくっきりさせる（0.42〜0.58 の間で立ち上がる）
      let e = (a - 0.42) / 0.16;
      if (rim) {
        // 縁どりの描き方：中は暗い深紅でほぼ平ら、縁だけ細く明るい赤、外にうすい赤のにじみ
        if (e <= 0) {
          const gl = (a - 0.18) / 0.24;
          if (gl <= 0) { out[i + 3] = 0; continue; }
          out[i] = R_GLOW[0]; out[i + 1] = R_GLOW[1]; out[i + 2] = R_GLOW[2]; out[i + 3] = 255 * 0.28 * gl * gl * alphaAll;
          continue;
        }
        if (e > 1) e = 1;
        const edgeA = e * e * (3 - 2 * e);
        let rr = (a - 0.5) / 0.4; rr = rr < 0 ? 0 : rr > 1 ? 1 : rr;
        const rimK = 1 - rr * rr * (3 - 2 * rr);          // 縁ほど 1
        const h = D[i + 3] / 255;
        const inner = 0.86 + 0.14 * (1 - h);              // 中はわずかに明暗
        const r = R_IN[0] * inner + (R_RIM[0] - R_IN[0] * inner) * rimK;
        const g = R_IN[1] * inner + (R_RIM[1] - R_IN[1] * inner) * rimK;
        const b = R_IN[2] * inner + (R_RIM[2] - R_IN[2] * inner) * rimK;
        out[i] = r; out[i + 1] = g; out[i + 2] = b;
        out[i + 3] = 255 * Math.max(edgeA, 0.28) * alphaAll;
        continue;
      }
      if (e <= 0) { out[i + 3] = 0; continue; }
      if (e > 1) e = 1;
      e = e * e * (3 - 2 * e);
      const h = D[i + 3] / 255;
      const x0 = x > 0 ? x - 1 : x, x1 = x < bw - 1 ? x + 1 : x;
      const dx = (D[(y * bw + x1) * 4 + 3] - D[(y * bw + x0) * 4 + 3]) / 255 * slope;
      const dy = (D[(y1 * bw + x) * 4 + 3] - D[(y0 * bw + x) * 4 + 3]) / 255 * slope;
      const nl = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx * nl, ny = -dy * nl, nz = nl;
      const dif = Math.max(0, nx * lx + ny * ly + nz * lz);
      // つや：光の反射が目の方向（0,0,1）に近いほど強い
      const rz = 2 * dif * nz - lz;
      const spec = Math.pow(Math.max(0, rz), 14) * 0.75 + Math.pow(Math.max(0, rz), 60) * 0.5;
      // 厚い所ほど暗い赤。縁は少しだけ明るく薄い
      const th = Math.min(1, h * (opt.depth ?? 0.75));
      let r, g, b;
      if (th < 0.5) { const q = th / 0.5; r = C_HI[0] + (C_MID[0] - C_HI[0]) * q; g = C_HI[1] + (C_MID[1] - C_HI[1]) * q; b = C_HI[2] + (C_MID[2] - C_HI[2]) * q; }
      else { const q = (th - 0.5) / 0.5; r = C_MID[0] + (C_LO[0] - C_MID[0]) * q; g = C_MID[1] + (C_LO[1] - C_MID[1]) * q; b = C_MID[2] + (C_LO[2] - C_MID[2]) * q; }
      const sh = 0.62 + 0.5 * dif;
      r = r * sh + 255 * spec; g = g * sh + 235 * spec; b = b * sh + 235 * spec;
      out[i] = r > 255 ? 255 : r; out[i + 1] = g > 255 ? 255 : g; out[i + 2] = b > 255 ? 255 : b;
      out[i + 3] = 255 * e * alphaAll;
    }
  }
  const o = st.out.getContext('2d');
  o.putImageData(st.img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(st.out, pd, pd, vw, vh, 0, 0, W, H);
  ctx.restore();
}
