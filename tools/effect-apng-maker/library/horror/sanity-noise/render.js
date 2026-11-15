import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「ホラー_ノイズ」(noise.js) を描く（1ループ＝アセットの長さ）
export default themeAsset({ file: 'horror-noise', opts: P => ({ strength: P.strength }) });
