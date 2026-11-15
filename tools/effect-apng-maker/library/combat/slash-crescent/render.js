import { frameAsset } from '../../frames.js';

// 文字画像APNGメーカーEX の単体APNG（1920×1080・25fps）を、960×540 のコマに分けて並べたシート（frames.webp）から描く
export default frameAsset({ src: new URL('./frames.webp?v=1', import.meta.url).href, n: 28, cols: 4, fw: 960, fh: 540 });
