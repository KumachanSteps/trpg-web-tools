/*
 * 演出APNGメーカー — 文字画像APNGメーカーEX の演出を、文字なしで使うための橋渡し
 *  - ../ex/ に置いた EX のエンジンと演出部品（fx-*.js）を、必要になったときだけ <script> で読み込む
 *  - exTemplate(): EX のテンプレート（戦闘演出・炎・灰など）を、そのままアセットとして描く render モジュールを作る
 *  - loadEx(): 部品（コウモリ・月・血しぶき・流れ星など）だけを使いたいアセット用
 * EX 側は「時刻（秒）を渡すと必ず同じ絵」になるので、プレビューと書き出しの絵がそろう。
 */

const EX_VERSION = '20261110-f3baa73';
// 読み込む順番が大事：吸血鬼・夢・ハロウィンは星の部品を使い、エンジンは炎・灰・煙・星・吸血鬼を使う
const FILES = ['fx-star', 'fx-vampire-blood-data', 'fx-vampire', 'fx-halloween', 'fx-dream', 'fx-fire', 'fx-ash', 'fx-smoke', 'engine', 'presets'];

let loading = null;

function addScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`EX script failed: ${src}`));
    document.head.appendChild(el);
  });
}

/** EX のスクリプトを一度だけ読み込み、window の部品をまとめて返す */
export function loadEx() {
  if (!loading) {
    loading = (async () => {
      for (const f of FILES) await addScript(new URL(`../ex/${f}.js?v=${EX_VERSION}`, import.meta.url).href);
      const w = window;
      return {
        Engine: w.TextApngEngine,
        Presets: w.TextApngPresets,
        Star: w.TextApngStarFx,
        Vampire: w.TextApngVampireFx,
        Halloween: w.TextApngHalloweenFx,
        Dream: w.TextApngDreamFx,
        Fire: w.TextApngFireFx,
        Ash: w.TextApngAshFx,
        Smoke: w.TextApngSmokeFx
      };
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

/** 文字を見えなくする（文字は消すと効果音まで止まるテンプレートがあるので、透明にして残す） */
function ghost(s) {
  s.fillOpacity = 0;
  ['stroke', 'stroke2', 'shadow', 'glow'].forEach(k => { if (s[k]) s[k].on = false; });
  return s;
}

/**
 * EX のテンプレートを描くアセットを作る。
 *   template: テンプレート id（1つだけのとき）
 *   variants: { 値: テンプレート id }（select の param で選ぶとき。キーは param の値）
 *   param:    variants を選ぶ param の key（既定 'variant'）
 *   ghost:    文字を透明にする（既定で透明。演出アセットなので文字は出さない）
 */
export function exTemplate({ template, variants, param = 'variant', ghost: hide = true }) {
  return {
    async setup(P, S) {
      const ex = await loadEx();
      const id = variants ? (variants[P[param]] || Object.values(variants)[0]) : template;
      const tpl = ex.Presets.TEMPLATES.message.find(t => t.id === id);
      if (!tpl) throw new Error(`EX template not found: ${id}`);
      const scene = ex.Presets.applyTemplate(ex.Presets.defaultScene('message', 'ja'), tpl, 'ja');
      if (hide) ghost(scene);
      const r = new ex.Engine.TextRenderer({});
      const prep = r.prepare(scene);
      return { r, dur: prep.timeline.duration, sw: scene.width, sh: scene.height };
    },
    draw(ctx, t, P, st, S) {
      // ずっとループのときは、EX の1周ぶんをこちらの1ループに合わせる（つなぎ目が出ない）
      st.r.loopLength = S.play === 'loop' ? st.dur : 0;
      st.r.render(ctx, t * st.dur, { scale: S.w / st.sw });
    }
  };
}
