import { easeInOut } from '../../kit.js';

export default {
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const cx = P.center.x * w, cy = P.center.y * h;
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
    const soft = P.soft * Math.min(w, h);
    const r = (1 - easeInOut(p)) * (far + soft);
    ctx.fillStyle = P.color;
    ctx.fillRect(0, 0, w, h);
    if (r <= 0.5) return;
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, r - soft), cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
};
