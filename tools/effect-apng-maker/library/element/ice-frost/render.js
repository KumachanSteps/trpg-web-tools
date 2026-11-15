import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「氷_端から凍りつく」(ice.js fx frost・元の長さ 3.6 秒) を描く
export default themeAsset({
  file: 'ice',
  opts: P => ({ fx: 'frost', big: !!P.big }),
  time: t => t * 3.6
});
