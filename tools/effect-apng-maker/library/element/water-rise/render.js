import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「水_水位上昇」(water.js mode rise・元の長さ 4.5 秒) を描く
export default themeAsset({ file: 'water', opts: P => ({ mode: 'rise', level: P.level }), time: t => t * 4.5 });
