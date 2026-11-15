import { themeAsset, scaleLayers } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「雪」(snow.js) を描く。level 1〜4 = 粉雪・ぼたん雪・吹雪（弱）・吹雪（強）
export default themeAsset({
  file: 'snow',
  opts: (P, S, box) => {
    const lv = Number(P.level) || 1;
    return { level: lv, ...scaleLayers(box.SNOW_PRESETS[lv], P.amount) };
  },
  mirror: P => P.dir === 'left'
});
