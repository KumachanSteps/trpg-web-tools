// 文字画像APNGメーカーEX の血しぶき（吸血鬼判定の「ブラッドスプラッター（画像再現）」、fx-vampire.js の splutter）を描く
import { loadEx } from '../../../ex-bridge.js';

export default {
  async setup(P, S) {
    const ex = await loadEx();
    // 血の画像は読み込みに少し時間がかかるので、描けるようになるまで待つ（最大2秒）
    const probe = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(64, 64) : Object.assign(document.createElement('canvas'), { width: 64, height: 64 });
    const g = probe.getContext('2d');
    for (let i = 0; i < 40; i++) {
      g.clearRect(0, 0, 64, 64);
      ex.Vampire.splutter(g, 32, 32, 0.1, 1.0, {});
      if (g.getImageData(32, 32, 1, 1).data[3] > 0) break;
      await new Promise(r => setTimeout(r, 50));
    }
    return { V: ex.Vampire };
  },
  draw(ctx, t, P, st, S) {
    const c = P.center || { x: 0.5, y: 0.5 };
    // 元は約2秒（1.4秒から薄れて2.0秒で消える）。アセットの長さに合わせて伸び縮みさせる
    st.V.splutter(ctx, S.w * c.x, S.h * c.y, (S.h / 540) * (P.size || 1), Math.min(1.999, t * 2), {});
  }
};
