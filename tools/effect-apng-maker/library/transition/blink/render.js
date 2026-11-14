import { easeInOut } from '../../kit.js';

// まぶたが閉じる。p=1 で完全に閉じる（out）、in は目が開く
export default {
  cover(ctx, p, P, st, S) {
    const { w, h } = S;
    const open = 1 - easeInOut(p);
    ctx.fillStyle = P.color;
    ctx.fillRect(0, 0, w, h);
    if (open <= 0.001) return;
    const blur = Math.max(1, P.soft * h * 0.06);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const wide = open ** 4 * 0.6; // 開ききる直前は四隅まで消えるように大きく
    ctx.ellipse(w / 2, h / 2, w * (0.78 + wide), Math.max(0.5, h * (0.82 * open + wide)), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  }
};
