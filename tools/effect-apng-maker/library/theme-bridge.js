/*
 * 演出APNGメーカー — 文字画像APNGメーカーEX の「テーマ別素材」（雨・雪・霧・風・雷・氷・水・魔法など）を使うための橋渡し
 *  - ../ex/themes/ に置いた描画コード（EX で作ったものをそのまま写したもの）を、必要になったときだけ読み込む
 *  - どのコードも FX.draw(ctx, 幅, 高さ, 秒, 設定) の形。window.FX を上書きし合うので、1ファイルごとに別の入れ物で動かす
 *  - themeAsset(): そのコードを描くアセット（render モジュール）を作る
 * 時刻（秒）を渡すと必ず同じ絵になるので、プレビューと書き出しの絵がそろう。
 */

const THEME_VERSION = '20261116-t4';
const cache = new Map();

/** テーマのコード（文字列）を一度だけ読み込む */
function loadSource(file) {
  if (!cache.has(file)) {
    const url = new URL(`../ex/themes/${file}.js?v=${THEME_VERSION}`, import.meta.url).href;
    const p = fetch(url).then(r => { if (!r.ok) throw new Error(`theme script failed: ${file}`); return r.text(); });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return cache.get(file);
}

/**
 * テーマのコードを新しい入れ物で動かし、そのコードが window に置いたもの（FX など）を返す。
 * コードの中の作りおき（画像・下ごしらえ）は1つの大きさしか覚えないものが多いので、
 * プレビュー・サムネイル・書き出しで同じ入れ物を使い回すと、大きさが変わるたびに作り直しになって重くなる。
 * そのため、アセットの描画1つ（EffectInstance 1つ）ごとに別の入れ物を作る。
 */
export async function loadTheme(file) {
  const src = await loadSource(file);
  const box = {};
  // 魔法などは window.MG に置いた共通部品を、MG とそのまま書いて使う。
  // with (window) で探させると、名前を引くたびに入れ物を調べることになり、何十倍も遅くなる。
  // そこで、コードが window に置く名前を前もって変数として作り、box の同じ名前と結びつける。
  const names = [...new Set([...src.matchAll(/\b(?:window|globalThis|root)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)].map(m => m[1]))];
  const bind = names.map(n => `${n}: { get() { return ${n}; }, set(v) { ${n} = v; }, enumerable: true, configurable: true }`).join(',\n');
  const prelude = names.length ? `let ${names.join(', ')};\nObject.defineProperties(window, {\n${bind}\n});\n` : '';
  // eslint-disable-next-line no-new-func
  new Function('window', 'globalThis', `${prelude}{\n${src}\n}`)(box, box);
  if (!box.FX || typeof box.FX.draw !== 'function') throw new Error(`theme has no FX.draw: ${file}`);
  return box;
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
 *   res:    内部で描く大きさの倍率（0.5 なら縦横半分で描いて引きのばす）。1コマが重いコードを軽くするため
 * コードの中で変換や不透明度を元に戻すものがあるので、いったん別のキャンバスに描いてから重ねる。
 */
export function themeAsset({ file, opts = () => ({}), time, mirror, res = 1 }) {
  return {
    async setup(P, S) {
      const box = await loadTheme(file);
      return { box, buf: null };
    },
    draw(ctx, t, P, st, S) {
      const { w, h } = S;
      const k = typeof res === 'function' ? res(P, S) : res;
      const bw = Math.max(2, Math.round(w * k)), bh = Math.max(2, Math.round(h * k));
      if (!st.buf || st.buf.width !== bw || st.buf.height !== bh) st.buf = makeCanvas(bw, bh);
      const g = st.buf.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, bw, bh);
      const o = { loop: S.duration, ...opts(P, S, st.box) };
      const sec = time ? time(t, P, S) : t * S.duration;
      st.box.FX.draw(g, bw, bh, sec, o);
      ctx.save();
      if (mirror && mirror(P)) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      if (bw === w && bh === h) ctx.drawImage(st.buf, 0, 0);
      else { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(st.buf, 0, 0, w, h); }
      ctx.restore();
    }
  };
}

/** プリセットの粒の数（layers[].n）に量をかけた設定を作る */
export function scaleLayers(preset, amount) {
  if (!preset || !Array.isArray(preset.layers) || amount === 1) return {};
  return { layers: preset.layers.map(l => ({ ...l, n: Math.max(1, Math.round(l.n * amount)) })) };
}
