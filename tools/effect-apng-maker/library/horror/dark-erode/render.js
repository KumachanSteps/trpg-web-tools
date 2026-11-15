import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「闇_黒いもやの侵食」(erode.js) を描く。設定の dur をアセットの長さにする
export default themeAsset({ file: 'dark-erode', opts: (P, S) => ({ dur: S.duration }) });
