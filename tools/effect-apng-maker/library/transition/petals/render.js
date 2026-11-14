import { shapeCover } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    shapeCover(ctx, p, S, { shape: P.shape, color: P.color, from: P.from, size: P.size, spin: P.spin ? 1 : 0, fall: 0.3, seed: S.seed });
  }
};
