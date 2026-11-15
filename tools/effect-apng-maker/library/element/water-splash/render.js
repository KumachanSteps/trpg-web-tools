import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「水_しぶき」(spray.js・元の長さ 2.4 秒) を描く
export default themeAsset({ file: 'water-spray', time: t => t * 2.4 });
