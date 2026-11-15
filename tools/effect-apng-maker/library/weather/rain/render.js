import { themeAsset, scaleLayers } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「雨・嵐」(rain.js) を描く。level 1〜4 = 霧雨・小雨・本降り・大雨
export default themeAsset({
  file: 'rain',
  opts: (P, S, box) => {
    const lv = Number(P.level) || 3;
    return { level: lv, ...scaleLayers(box.RAIN_PRESETS[lv], P.amount), ...(P.splash ? {} : { splash: 'none', spray: 0 }) };
  },
  mirror: P => P.dir === 'left'
});
