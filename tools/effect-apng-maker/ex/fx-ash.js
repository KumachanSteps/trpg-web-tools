/*
 * 文字画像APNGメーカーEX — 環境の演出：風に舞う灰（試作 fire/src/ash.js を組み込んだもの）
 * drawAsh(ctx, W, H, t, opt) で、焼けた灰のかけらが左下から右上へ風に流れる層を描く。W・H は出力のピクセル数。
 * 時刻 t は loop 秒で一周し、t と t+loop は同じ絵になる（ループAPNG用）。
 * 試作は6秒で一周（period）。loop がそれより短い・長いときは、かけらの見た目の速さと数がそろうように道のりと数を変える。
 */
(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const frac = x => x - Math.floor(x);

  // 奥・中・手前の3層と、細かい粉。奥ほど小さく遅く、空気に霞んで灰色に、手前ほど大きく速く黒い
  const LAYERS = [
    { key: 'dust', n: 140, size: [0.7, 1.4], speed: [1.6, 2.4], lum: [60, 105], alpha: [0.3, 0.55], dot: true },
    { key: 'far', n: 90, size: [2.8, 5.6], speed: [1.0, 1.3], lum: [62, 92], alpha: [0.55, 0.8] },
    { key: 'mid', n: 58, size: [6.4, 12.8], speed: [1.25, 1.7], lum: [24, 40], alpha: [0.9, 0.95], rim: true },
    { key: 'near', n: 9, size: [17, 31], speed: [1.9, 2.5], lum: [16, 26], alpha: [0.95, 0.95], rim: true, blur: 1.2 }
  ];
  // 黒版：縁取りなしの黒いかけら。重いかけらは画面の下7割（ceil）までを舞い、ごく小さく軽いもの（free）だけが上まで昇る
  const LAYERS_BLACK = [
    { key: 'dust', n: 150, size: [0.7, 1.4], speed: [1.6, 2.4], lum: [12, 34], alpha: [0.35, 0.6], dot: true, free: true },
    { key: 'tiny', n: 60, size: [1.6, 3.0], speed: [1.3, 1.9], lum: [10, 26], alpha: [0.6, 0.85], free: true },
    { key: 'far', n: 64, size: [3.2, 5.6], speed: [1.0, 1.3], lum: [14, 28], alpha: [0.6, 0.8] },
    { key: 'mid', n: 46, size: [6.4, 12.8], speed: [1.25, 1.7], lum: [6, 16], alpha: [0.92, 0.97] },
    { key: 'near', n: 8, size: [17, 31], speed: [1.9, 2.5], lum: [4, 12], alpha: [0.95, 0.95], blur: 1.2 }
  ];

  // かけらの形：ぎざぎざの多角形。ところどころ深く欠けていて、少し細長い
  const shapes = {};
  function shapeOf(seed, j) {
    const key = seed + ':' + j;
    if (shapes[key]) return shapes[key];
    const nv = 9 + Math.floor(rnd(j, 1, seed) * 7);
    const stretch = 1 + 0.8 * rnd(j, 2, seed);
    const pts = [];
    for (let k = 0; k < nv; k++) {
      const a = (k + 0.35 * (rnd(j, 10 + k, seed) - 0.5)) / nv * TAU;
      let r = 0.55 + 0.45 * rnd(j, 30 + k, seed);
      if (rnd(j, 50 + k, seed) < 0.2) r *= 0.5;
      pts.push(Math.cos(a) * r * stretch, Math.sin(a) * r);
    }
    return (shapes[key] = pts);
  }

  function drawAsh(ctx, W, H, t, opt = {}) {
    const o = { loop: 6, period: 6, seed: 5, density: 1, rise: 0.3, style: 'grey', ceil: 0.7, ...opt };
    const black = o.style === 'black';
    const L = o.loop, u = H / 720;
    // 一周の長さの試作との比。道のり（speed）を比で伸び縮みさせ、画面に見えている数が変わらないよう、かけらを間引く・足す
    const f = L / o.period, more = Math.max(1, f);
    // 突風：全体の流れが周期的に速くなったり緩んだりする（loop の整数倍の周期なので継ぎ目なし）
    const gust = (ph) => 0.035 * Math.sin(TAU * t / L + ph) + 0.015 * Math.sin(2 * TAU * t / L + 1.1 + ph * 1.7);
    ctx.save();
    (black ? LAYERS_BLACK : LAYERS).forEach((ly, li) => {
      const seed = o.seed * 100 + li * 17;
      // 斜めに流れる分、画面の外を通るかけらが増えるので数を足す
      const n = Math.round(ly.n * o.density * W / (H * 16 / 9) * (black && !ly.free ? 1 : (1.2 * H + o.rise * W) / (1.2 * H)) * more);
      ctx.filter = ly.blur ? `blur(${(ly.blur * u).toFixed(2)}px)` : 'none';
      for (let j = 0; j < n; j++) {
        const R = k => rnd(j, k, seed);
        const s = u * (ly.size[0] + (ly.size[1] - ly.size[0]) * R(1));
        const m = s * 2.5 + 16 * u;
        // 1周で画面を1回だけ横切る。道のりを画面より長くとって、速さを変える（見えない間は画面の外）
        const sp0 = ly.speed[0] + (ly.speed[1] - ly.speed[0]) * R(2);
        const sp = Math.max(1, sp0 * f);
        if (f !== 1 && R(21) * more >= sp / sp0) continue;
        const D = (W + 2 * m) * sp;
        const p = frac(t / L + R(3) + gust(R(4) * 0.8 + li * 0.4));
        const x = -m + p * D;
        if (x > W + m) continue;
        // 左下から右上へ斜めに昇る流れ（傾きはかけらごとに少し違い、まれに強い上昇気流に乗る）＋ひらひら
        let slope = -o.rise * (R(5) < 0.12 ? 1.5 + 0.4 * R(6) : 0.7 + 0.6 * R(6));
        let yMid = -0.1 * H + slope * W * 0.5 + (1.2 * H - slope * W) * R(7);
        if (black && !ly.free) {
          // 重いかけら：地面からの高さが天井（下から ceil の高さ、かけらごとに少しずらす）を越えない。
          // 低いところのものほど斜めに昇り、天井近くのものはほぼ水平に流れる
          const hTop = H * o.ceil * (0.88 + 0.17 * R(20));
          const hMid = -0.1 * H + (hTop + 0.1 * H) * Math.pow(R(7), 0.85);
          slope = -Math.max(0.03 * o.rise / 0.3, Math.min(-slope, (hTop - hMid) / (W * 0.5)));
          yMid = H - hMid;
        }
        const flA = s * (0.6 + 1.6 * R(8)), flK = 0.6 + 1.6 * R(9);
        const tw = Math.sin(TAU * (1 + Math.floor(R(10) * 3)) * t / L + TAU * R(11));
        const y = yMid + slope * (x - W / 2) + flA * Math.sin(TAU * (flK * x / W + R(12))) + s * 0.8 * tw;
        if (y < -m || y > H + m) continue;
        const alpha = ly.alpha[0] + (ly.alpha[1] - ly.alpha[0]) * R(13);
        let lum = ly.lum[0] + (ly.lum[1] - ly.lum[0]) * R(14);
        if (ly.dot) {
          // 細かい粉は風に流されて短い筋に見える
          const len = D / L * (0.008 + 0.014 * R(16));
          ctx.strokeStyle = `rgba(${lum | 0},${(lum * 0.97) | 0},${(lum * 0.94) | 0},${alpha.toFixed(3)})`;
          ctx.lineWidth = s * 2;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x - len, y - slope * len); ctx.lineTo(x, y); ctx.stroke();
          continue;
        }
        // 回転と裏返り：横に進むにつれて回り、ひらりと裏返る。光を受ける向きで明るく光る
        const rot = TAU * (R(15) + (R(16) - 0.5) * 3 * x / W);
        const flip = TAU * (R(17) + (0.5 + 2.5 * R(18)) * x / W);
        const fy = Math.max(0.12, Math.abs(Math.cos(flip)));
        const glint = Math.pow(Math.max(0, Math.sin(flip)), 3);
        lum += (black ? 14 : ly.rim ? 55 : 25) * glint;
        const pts = shapeOf(seed, j);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(s, s * fy);
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
        ctx.closePath();
        ctx.restore();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${lum | 0},${(lum * 0.96) | 0},${(lum * 0.92) | 0})`;
        ctx.fill();
        if (ly.rim && !black) {
          // 燃え尽きかけた縁は白っぽい灰色：内側へ少しにじむ帯と、細い外縁（暗い背景でも形が見える）
          ctx.lineJoin = 'round';
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = `rgba(96,91,85,${(0.32 + 0.25 * glint).toFixed(3)})`;
          ctx.lineWidth = u * (ly.key === 'near' ? 5 : 2.8) * (0.6 + 0.8 * R(19));
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = `rgba(124,118,110,${(0.28 + 0.3 * glint).toFixed(3)})`;
          ctx.lineWidth = u * (ly.key === 'near' ? 1.4 : 0.9);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    });
    ctx.filter = 'none';
    ctx.restore();
  }

  root.TextApngAshFx = { drawAsh };
})(typeof window !== 'undefined' ? window : globalThis);
