import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「雷_黒雲の稲光」を描く（不透明の背景。1ループ＝アセットの長さ）
// 1コマが重いので、縦横を 0.5倍で描いて引きのばす（見た目はほぼ同じで、数倍速くなる）
export default themeAsset({ res: 0.5, file: 'thunder-cloud' });
