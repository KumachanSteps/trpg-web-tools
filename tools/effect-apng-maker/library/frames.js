/*
 * 演出APNGメーカー — 描画コードのない「コマ画像」のアセット（EX で作った APNG をコマに分けて並べたシート）を描く
 *  - シートは横 cols コマ × 縦 rows 段。1コマは fw×fh。コマ数 n
 *  - 時刻 t（0〜1）に合わせてコマを選び、画面いっぱいに描く
 *  - P.color で色を変える：'blue'（元の色）/ 'white' / 'red' / 'black'
 */

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

const sheets = new Map();
function loadSheet(url) {
  if (!sheets.has(url)) {
    const p = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(`frames failed to load: ${url}`));
      im.src = url;
    });
    p.catch(() => sheets.delete(url));
    sheets.set(url, p);
  }
  return sheets.get(url);
}

// 色を変える。明るさの形はそのままに、色合いだけ（赤）、色を抜く（白）、明暗を反転して暗くする（黒）
function recolor(g, w, h, color) {
  if (color === 'red') {
    g.globalCompositeOperation = 'hue';
    g.fillStyle = '#ff2020';
    g.fillRect(0, 0, w, h);
  } else if (color === 'white' || color === 'black') {
    g.globalCompositeOperation = 'saturation';
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    if (color === 'black') {
      g.globalCompositeOperation = 'difference';
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = '#5a5a5a';
      g.fillRect(0, 0, w, h);
    }
  }
}

/** コマ画像のアセットを作る。src は render.js から見たシートの URL */
export function frameAsset({ src, n, cols, fw, fh }) {
  return {
    async setup(P, S) {
      return { sheet: await loadSheet(src), buf: null };
    },
    draw(ctx, t, P, st, S) {
      const i = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
      const sx = (i % cols) * fw, sy = Math.floor(i / cols) * fh;
      const color = P.color || 'blue';
      if (color === 'blue') { ctx.drawImage(st.sheet, sx, sy, fw, fh, 0, 0, S.w, S.h); return; }
      if (!st.buf || st.buf.width !== S.w || st.buf.height !== S.h) st.buf = makeCanvas(S.w, S.h);
      const g = st.buf.getContext('2d');
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, S.w, S.h);
      g.drawImage(st.sheet, sx, sy, fw, fh, 0, 0, S.w, S.h);
      recolor(g, S.w, S.h, color);
      // 色を変えると透明な所まで塗られるので、元のコマの形で切り抜く
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(st.sheet, sx, sy, fw, fh, 0, 0, S.w, S.h);
      g.globalCompositeOperation = 'source-over';
      ctx.drawImage(st.buf, 0, 0);
    }
  };
}
