import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「氷_氷の壁が溶ける」(ice.js fx melt・元の長さ 4.6 秒) を描く
export default themeAsset({ file: 'ice', opts: () => ({ fx: 'melt' }), time: t => t * 4.6 });
