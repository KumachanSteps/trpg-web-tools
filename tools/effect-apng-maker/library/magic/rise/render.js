import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「魔法_光が立ちのぼる」(magic_rise.js) を描く
export default themeAsset({
  file: 'magic-rise',
  opts: P => ({ pal: P.pal, ...(P.amount && P.amount !== 1 ? { np: Math.round(120 * P.amount) } : {}) })
});
