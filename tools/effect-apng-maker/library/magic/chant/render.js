import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「魔法_詠唱の光」(magic_chant.js) を描く
export default themeAsset({
  file: 'magic-chant',
  opts: P => ({ pal: P.pal, np: Math.round(170 * (P.amount || 1)), cx: P.center ? P.center.x : 0.5, cy: P.center ? P.center.y : 0.5 })
});
