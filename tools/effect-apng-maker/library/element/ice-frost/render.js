import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「氷_端から凍りつく」(ice.js fx frost・元の長さ 3.6 秒) を描く
export default themeAsset({
  // 1コマが重いので、縦横を 0.65倍で描いて引きのばす（見た目はほぼ同じで、数倍速くなる）
  res: 0.65,
  file: 'ice',
  opts: P => ({ fx: 'frost', big: !!P.big }),
  time: t => t * 3.6
});
