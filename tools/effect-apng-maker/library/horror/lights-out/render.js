import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「闇_明かりが消える」(lightsout.js・元の長さ 4.5 秒) を描く
export default themeAsset({ file: 'dark-lightsout', time: t => t * 4.5 });
