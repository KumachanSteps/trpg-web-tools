// 文字画像APNGメーカーEX の「雷鳴」をそのまま描く（ex-bridge.js）
import { exTemplate } from '../../ex-bridge.js';

export default exTemplate({
  template: 'battleLightning',
  // 帯電を出さないとき：火花のあと文字の上を電気が走りつづける描写と、最後のもう一度の落雷を省く
  patch(scene, P, renderer) {
    if (P.charge) return;
    scene.hold = 0.6; scene.outDur = 0.05;
    scene.outEnabled = false;
    const draw = renderer.drawLightning;
    // 電気が走る先（文字の位置の一覧）を空にして渡すと、帯電だけが描かれなくなる
    renderer.drawLightning = function (ctx, pg, mb, ...rest) { return draw.call(this, ctx, pg, { ...mb, list: [] }, ...rest); };
    return 1.25;   // 電気が走る 0.42 秒 ＋ 火花 0.75 秒 まで
  }
});
