import { vignette, easeInOut, TAU } from '../../kit.js';

export default {
  draw(ctx, t, P, st, S) {
    let inner = P.size, strength = P.strength;
    if (P.mode === 'closing') {
      const k = easeInOut(t);
      inner = 0.95 - (0.95 - P.size) * k;
      strength = P.strength * (0.2 + 0.8 * k);
    } else if (P.mode === 'breathing') {
      const b = 0.5 + 0.5 * Math.sin(TAU * t);
      inner = P.size + 0.08 * b;
      strength = P.strength * (0.85 + 0.15 * (1 - b));
    }
    vignette(ctx, S, P.color, strength, inner, Math.max(inner + 0.2, 1));
  }
};
