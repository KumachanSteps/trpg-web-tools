import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「魔法_足元の魔法陣_展開」(magic_floor.js, mode once・元の長さ 6 秒) を描く
export default themeAsset({
  file: 'magic-floor',
  opts: P => ({ mode: 'once', pal: P.pal, loop: 4, cx: P.center ? P.center.x : 0.5, cy: P.center ? P.center.y : 0.78 }),
  time: t => t * 6
});
