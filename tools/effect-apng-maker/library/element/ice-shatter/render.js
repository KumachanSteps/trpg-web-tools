import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「氷_氷の壁が砕ける」(ice.js fx shatter・元の長さ 3.3 秒) を描く
export default themeAsset({ file: 'ice', opts: () => ({ fx: 'shatter' }), time: t => t * 3.3 });
