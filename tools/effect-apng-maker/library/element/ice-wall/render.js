import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「氷_氷の壁」(ice.js fx wall) を描く（1ループ＝アセットの長さ）
export default themeAsset({ file: 'ice', opts: () => ({ fx: 'wall' }) });
