import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「サイバー_01の帯」(rain.js) を描く（1ループ＝アセットの長さ）
export default themeAsset({ file: 'cyber-rain', opts: P => ({ color: P.color }) });
