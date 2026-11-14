// コウモリの群れの場面転換（コウモリの絵は文字画像APNGメーカーEXの部品）
//   rise  … 中央下からコウモリが集まって闇が広がる。現れるときは、闇がコウモリになって上へ飛び去る
//   close … まわりからコウモリが集まって、真ん中へ閉じる。現れるときは真ん中から開く
//   sweep … 群れが横切り、通ったあとが闇に沈む
import { loadEx } from '../../ex-bridge.js';
import { rng, easeInOut, wrap, clamp, TAU } from '../../kit.js';

const BAND = 0.42;   // コウモリの帯の厚み（画面の半分を 1 とした長さ）

export default {
  async setup(P, S) {
    const ex = await loadEx();
    const r = rng(S.seed + 41);
    const ring = Array.from({ length: Math.round(420 * P.amount) }, () => ({
      th: r() * TAU, o: r() ** 1.6, s: 0.35 + 0.65 * r() ** 2, ph: r(), f: 9 + Math.floor(r() * 6), tilt: (r() - 0.5) * 0.7, jit: r()
    })).sort((a, b) => b.o - a.o);
    // 現れるときに、闇から離れて先に飛んでいく小さなコウモリ
    const strays = Array.from({ length: Math.round(70 * P.amount) }, () => ({ th: r() * TAU, d: r(), s: 0.25 + 0.3 * r(), ph: r(), f: 10 + Math.floor(r() * 5) }));
    const sweep = Array.from({ length: Math.round(46 * P.amount) }, () => ({
      off: r(), y: r(), s: 0.45 + 0.75 * r() ** 1.5, ph: r(), f: 5 + Math.floor(r() * 4), tilt: (r() - 0.5) * 0.5
    })).sort((a, b) => a.s - b.s);
    return { Vamp: ex.Vampire, ring, strays, sweep };
  },
  cover(ctx, p, P, st, S) {
    if (P.motion === 'sweep') return sweepCover(ctx, p, P, st, S);
    const { w, h } = S;
    const rise = P.motion !== 'close';
    // 中心と、横・縦の半径（rise は画面の下の中央から、close は画面の中央から）
    const cx = w / 2, cy = rise ? h * 1.02 : h / 2, ax = w / 2, ay = rise ? h : h / 2;
    const e = easeInOut(p);
    // blob：闇のかたまりが広がる（rise で覆う）／ hole：闇に開いた穴が閉じる（close、rise で現れる）
    const hole = !rise || S.revealing;
    const R = hole ? 1.75 - e * 2.05 : -0.3 + e * 2.05;
    const unit = h / 540 * P.size;
    const pt = (rad, th) => [cx + Math.cos(th) * rad * ax, cy - Math.sin(th) * rad * ay];
    const edge = (rad, k) => {                       // 少し波打つ縁
      ctx.moveTo(...pt(rad * (1 + 0.04 * Math.sin(5 * 0 + k)), 0));
      for (let i = 1; i <= 72; i++) {
        const th = i / 72 * TAU;
        ctx.lineTo(...pt(Math.max(0, rad * (1 + 0.04 * Math.sin(5 * th + k) + 0.025 * Math.sin(11 * th + 2 * k))), th));
      }
      ctx.closePath();
    };
    ctx.save();
    ctx.fillStyle = P.color;
    ctx.beginPath();
    if (hole) {
      ctx.rect(0, 0, w, h);
      if (R > 0) edge(R, p * 6);
      ctx.fill('evenodd');
    } else if (R - 0.02 > 0) {
      edge(R - 0.02, p * 6);
      ctx.fill();
    }
    // コウモリの帯：闇の縁の、明るい側に並ぶ
    for (const b of st.ring) {
      const rad = hole ? R - b.o * BAND + 0.04 : R + b.o * BAND - 0.04;
      if (rad <= 0) continue;
      const th = b.th + 0.05 * Math.sin(TAU * (p * 2 + b.jit));
      const [x, y] = pt(rad, th);
      if (x < -60 * unit || x > w + 60 * unit || y < -60 * unit || y > h + 60 * unit) continue;
      const fp = wrap(p * b.f + b.ph);
      const flap = fp < 0.5 ? fp * 2 : 2 - fp * 2;
      // 外ほど小さくまばらに見えるよう、帯の外側のものは少し薄く
      silhouette(st.Vamp, ctx, x, y, (16 + 30 * b.s) * unit, { flap, ang: b.tilt, rim: P.color });
    }
    // 現れるとき：闇から離れて先に飛び去る小さなコウモリ
    if (S.revealing) {
      for (const b of st.strays) {
        const rad = R - BAND - b.d * 0.5;
        if (rad <= 0) continue;
        const [x, y] = pt(rad, b.th);
        if (x < 0 || x > w || y < 0 || y > h) continue;
        const fp = wrap(p * b.f + b.ph);
        silhouette(st.Vamp, ctx, x, y - 30 * unit * b.d, (9 + 14 * b.s) * unit, { flap: fp < 0.5 ? fp * 2 : 2 - fp * 2, rim: P.color, alpha: clamp(1 - b.d * 1.2) });
      }
    }
    ctx.restore();
  }
};

// 影絵のコウモリ（EX の部品は大きいと赤い目を描くので、小さく描いてから拡大する）
function silhouette(Vamp, ctx, x, y, s, o) {
  const k = Math.max(1, s / 13);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  Vamp.bat(ctx, 0, 0, s / k, o);
  ctx.restore();
}

function sweepCover(ctx, p, P, st, S) {
  const { w, h } = S;
  const unit = h / 540;
  const dir = P.from === 'right' ? -1 : 1;
  const e = easeInOut(p);
  const front = -0.35 * w + e * 1.75 * w;          // 群れの先頭（左から数えた位置）
  const edge = front - 0.1 * w;                     // ここまでを闇で覆う
  ctx.save();
  if (dir < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  if (edge > 0) {
    const g = ctx.createLinearGradient(edge - 0.12 * w, 0, edge + 0.04 * w, 0);
    g.addColorStop(0, P.color);
    g.addColorStop(1, P.color + '00');
    ctx.fillStyle = P.color;
    ctx.fillRect(0, 0, Math.min(w, edge - 0.12 * w), h);
    ctx.fillStyle = g;
    ctx.fillRect(Math.max(0, edge - 0.12 * w), 0, 0.16 * w, h);
  }
  for (const b of st.sweep) {
    const x = front - b.off * 0.42 * w;
    const y = (b.y * 1.1 - 0.05) * h + Math.sin((p * 3 + b.ph) * TAU) * 18 * unit;
    const fp = wrap(p * b.f + b.ph);
    const flap = fp < 0.5 ? fp * 2 : 2 - fp * 2;
    if (x < -120 * unit || x > w + 120 * unit) continue;
    st.Vamp.bat(ctx, x, y, b.s * 84 * unit * P.size, { flap, ang: b.tilt, dir: 1, rim: P.rim });
  }
  ctx.restore();
}
