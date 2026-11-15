import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「霧」(fog.js) を描く。mode = thin / dense / ground
export default themeAsset({
  file: 'fog',
  opts: P => ({ mode: P.mode || 'thin' }),
  mirror: P => P.dir === 'left'
});
