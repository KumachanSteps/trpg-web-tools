import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「水_水のなか」(water.js mode under) を描く（1ループ＝アセットの長さ）
export default themeAsset({
  file: 'water',
  opts: P => ({ mode: 'under', color: P.color, bubbles: P.bubbles ? 4 : 0 })
});
