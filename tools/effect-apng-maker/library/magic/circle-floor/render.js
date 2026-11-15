import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「魔法_足元の魔法陣_ループ」(magic_floor.js, mode loop) を描く
export default themeAsset({
  file: 'magic-floor',
  opts: P => ({ mode: 'loop', pal: P.pal, cx: P.center ? P.center.x : 0.5, cy: P.center ? P.center.y : 0.78 })
});
