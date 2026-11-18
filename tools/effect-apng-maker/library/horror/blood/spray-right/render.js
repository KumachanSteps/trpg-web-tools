// 右下の隅から、向かいの左上へ血が飛び散る（1回再生）。絵と動きは「左下から」と同じで、向きだけ左右反対
import base from '../spray-left/render.js';

export default {
  setup: (P, S) => base.setup({ ...P, side: 'right' }, S),
  draw: (ctx, t, P, st, S) => base.draw(ctx, t, { ...P, side: 'right' }, st, S)
};
