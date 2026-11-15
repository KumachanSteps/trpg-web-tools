import { themeAsset, scaleLayers } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「雨_5_嵐」(rain.js level 5) を描く
export default themeAsset({
  file: 'rain',
  opts: (P, S, box) => ({ level: 5, ...scaleLayers(box.RAIN_PRESETS[5], P.amount), ...(P.flash ? {} : { flash: 0 }) }),
  mirror: P => P.dir === 'left'
});
