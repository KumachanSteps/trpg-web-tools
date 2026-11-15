/*
 * 演出APNGメーカー — 文字画像APNGメーカーEX の「テーマ別素材」（雨・雪・霧・風・雷・氷・水・魔法など）を使うための橋渡し
 *  - ../ex/themes/ に置いた描画コード（EX で作ったものをそのまま写したもの）を、必要になったときだけ読み込む
 *  - どのコードも FX.draw(ctx, 幅, 高さ, 秒, 設定) の形。window.FX を上書きし合うので、1ファイルごとに別の入れ物で動かす
 *  - themeAsset(): そのコードを描くアセット（render モジュール）を作る
 * 時刻（秒）を渡すと必ず同じ絵になるので、プレビューと書き出しの絵がそろう。
 */

const THEME_VERSION = '20261115-t1';
const cache = new Map();

/** テーマのコードを一度だけ読み込み、そのコードが window に置いたもの（FX など）を返す */
export function loadTheme(file) {
  if (!cache.has(file)) {
    const url = new URL(`../ex/themes/${file}.js?v=${THEME_VERSION}`, import.meta.url).href;
    const p = fetch(url)
      .then(r => { if (!r.ok) throw new Error(`theme script failed: ${file}`); return r.text(); })
      .then(src => {
        const box = {};
        // eslint-disable-next-line no-new-func
        new Function('window', 'globalThis', src)(box, box);
        if (!box.FX || typeof box.FX.draw !== 'function') throw new Error(`theme has no FX.draw: ${file}`);
        return box;
      });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return cache.get(file);
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

/**
 * テーマのコードを描くアセットを作る。
 *   file:   ex/themes/ のファイル名（.js なし）
 *   opts:   (P, S, box) => 設定。box はそのコードが window に置いたもの（RAIN_PRESETS など）
 *   time:   (t, P, S) => 秒。既定は「1ループ＝アセットの長さ」（opts の loop も同じ長さにする）
 *   mirror: (P) => true で左右反転（風向きを逆にするときなど）
 * コードの中で変換や不透明度を元に戻すものがあるので、いったん別のキャンバスに描いてから重ねる。
 */
export function themeAsset({ file, opts = () => ({}), time, mirror }) {
  return {
    async setup(P, S) {
      const box = await loadTheme(file);
      return { box, buf: null };
    },
    draw(ctx, t, P, st, S) {
      const { w, h } = S;
      if (!st.buf || st.buf.width !== w || st.buf.height !== h) st.buf = makeCanvas(w, h);
      const g = st.buf.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, w, h);
      const o = { loop: S.duration, ...opts(P, S, st.box) };
      const sec = time ? time(t, P, S) : t * S.duration;
      st.box.FX.draw(g, w, h, sec, o);
      ctx.save();
      if (mirror && mirror(P)) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(st.buf, 0, 0);
      ctx.restore();
    }
  };
}

/** プリセットの粒の数（layers[].n）に量をかけた設定を作る */
export function scaleLayers(preset, amount) {
  if (!preset || !Array.isArray(preset.layers) || amount === 1) return {};
  return { layers: preset.layers.map(l => ({ ...l, n: Math.max(1, Math.round(l.n * amount)) })) };
}
