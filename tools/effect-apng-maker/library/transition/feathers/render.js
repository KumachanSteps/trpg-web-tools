import { shapeCover } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    shapeCover(ctx, p, S, { shape: 'feather', color: P.color, from: P.from, size: P.size, spin: 0.35, fall: P.fall ? 1 : 0, seed: S.seed + 11 });
  }
};
