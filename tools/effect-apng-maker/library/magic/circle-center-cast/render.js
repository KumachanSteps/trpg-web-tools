import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「魔法_中央に魔法陣」(magic_center.js, mode once・元の長さ 5.8 秒) を描く
export default themeAsset({
  file: 'magic-center',
  opts: P => ({ mode: 'once', pal: P.pal, loop: 6, cx: P.center ? P.center.x : 0.5, cy: P.center ? P.center.y : 0.5 }),
  time: t => t * 5.8
});
