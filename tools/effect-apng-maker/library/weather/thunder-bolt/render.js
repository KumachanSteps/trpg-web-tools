import { themeAsset } from '../../theme-bridge.js';

// 文字画像APNGメーカーEX の「雷_中央に一撃」を描く。元の長さ 3 秒を、アセットの長さに合わせて伸び縮みさせる
export default themeAsset({
  file: 'thunder-center',
  time: t => t * 3
});
