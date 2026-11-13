import { rgba, easeInOut } from '../../_kit.js';

// dir は「どちらの端から覆っていくか」
const AXES = {
  left: (w, h) => [0, 0, w, 0],
  right: (w, h) => [w, 0, 0, 0],
  top: (w, h) => [0, 0, 0, h],
  bottom: (w, h) => [0, h, 0, 0],
  diagonal: (w, h) => [0, 0, w, h]
};

export default {
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const [ax, ay, bx, by] = (AXES[P.dir] || AXES.left)(w, h);
    const soft = P.soft;
    const u = easeInOut(p) * (1 + soft);
    const vx = bx - ax, vy = by - ay;
    const x0 = ax + vx * (u - soft), y0 = ay + vy * (u - soft);
    const x1 = ax + vx * u + 0.001, y1 = ay + vy * u + 0.001;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(P.color, 1));
    g.addColorStop(1, rgba(P.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
};
