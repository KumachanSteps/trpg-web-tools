/*
 * 血の演出（library/horror/blood/）で使う、壁やガラスを伝う血の筋の形
 *  「上から垂れる血」と同じ形：付け根はじょうごのように広がり、首は細く、先は首が少しくびれてから丸いしずくになる
 *  白で塗るだけ。液体の見た目は blood-liquid.js の drawLiquid で付ける
 */

/**
 * (cx, y0) から下へ長さ L の筋を描く。
 *   n    … 首の半分の太さ（px）
 *   opt  … { root = 3（付け根の広がり・首の何倍か）, wob = 0, wp = 0（ゆらぎ）, H（画面の高さ。ゆらぎの細かさ）, dir = 1（-1 で上へ） , bulb = true }
 */
export function drawStreak(g, cx, y0, L, n, opt = {}) {
  if (L <= 0.5 || n <= 0) return;
  const root = opt.root ?? 3, dir = opt.dir ?? 1, H = opt.H ?? 540;
  const bulb = opt.bulb !== false;
  const bR = bulb ? n * 1.32 * Math.min(1, 0.55 + L / (n * 10)) : n * 0.9;
  const cy = L - bR * (bulb ? 1.05 : 0.9);
  const neckEnd = Math.max(0, cy);
  const lam = Math.min(n * 6.5, 0.3 * L + n);
  const half = yr => {
    const f = Math.min(1, Math.max(0, yr / Math.max(1, neckEnd)));
    const funnel = (root - 1) * Math.exp(-Math.max(0, yr) / lam);
    const w = n * (1 + funnel) * (1 - 0.14 * f);
    const pinch = bulb ? Math.exp(-Math.pow((yr - (cy - bR * 1.6)) / (bR * 1.1), 2)) : 0;
    return w * (1 - 0.18 * pinch);
  };
  const xOf = yr => cx + (opt.wob ?? 0) * n * 0.5 * Math.sin(yr / H * 4 + (opt.wp ?? 0));
  const start = -Math.min(12, n * 2);
  const steps = 32;
  g.beginPath();
  for (let j = 0; j <= steps; j++) { const yr = start + (neckEnd - start) * j / steps; const x = xOf(yr) - half(yr), y = y0 + dir * yr; j ? g.lineTo(x, y) : g.moveTo(x, y); }
  for (let j = steps; j >= 0; j--) { const yr = start + (neckEnd - start) * j / steps; g.lineTo(xOf(yr) + half(yr), y0 + dir * yr); }
  g.closePath(); g.fill();
  g.beginPath(); g.ellipse(xOf(cy), y0 + dir * cy, bR, bR * 1.1, 0, 0, Math.PI * 2); g.fill();
}
