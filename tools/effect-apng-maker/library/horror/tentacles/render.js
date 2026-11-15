import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「ホラー_触手の影」(tentacle.js) を描く（1ループ＝アセットの長さ）
export default themeAsset({ file: 'horror-tentacle', opts: P => ({ suckers: P.suckers !== false }) });
