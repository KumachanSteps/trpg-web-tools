// サイバー：「0」と「1」が縦に並んだ帯が何本も、上から下へ速さ違いで流れる（透過・ループ）。
// 帯の先頭は白に近い色で明るく、後ろへ行くほど暗く消える。文字はときどき入れ替わる。
// 奥（小さく暗い・少しぼける）／中／手前（大きく明るい）の3層。
// 時刻 t は loop 秒で一周する：各帯は loop 秒でちょうど k 周（k は整数）、文字の入れ替わりも loop 秒で一周。
// opt.color = 'green'（既定）| 'cyan'
(function () {
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const frac = x => x - Math.floor(x);

  // 色の段階（0 = いちばん暗い尾 … NL-1 = 先頭の白）
  const PAL = {
    green: ['#06451f', '#0a6a2e', '#0f8f3c', '#15b84c', '#22e062', '#5cff8c', '#b4ffcb', '#f2fff6'],
    cyan: ['#053f4c', '#086477', '#0c8aa0', '#12b2c9', '#22d8ec', '#66f2ff', '#bdfbff', '#f4feff'],
  };
  const NL = 8;
  // 段階ごとの不透明度（スプライトに焼きこむ＝色数が増えない）
  const FA = [0.16, 0.3, 0.45, 0.6, 0.75, 0.9, 1, 1];
  // 層：fs = 文字の大きさ（720基準）、a = 明るさ、dens = 帯のある列の割合、k = 一周あたりの周回数、tail = 尾の長さ（文字数）、blur = ぼけ
  const LAYERS = [
    { fs: 13, a: 0.45, dens: 0.42, k: [1, 1], tail: [9, 20], blur: 0, gap: [0.3, 1.2] },
    { fs: 20, a: 0.75, dens: 0.34, k: [1, 2], tail: [8, 17], blur: 0, gap: [0.3, 1.1] },
    { fs: 32, a: 1.0, dens: 0.2, k: [2, 3], tail: [6, 12], blur: 0, gap: [0.5, 1.4] },
  ];

  let cache = null;
  function build(H, color) {
    const s = H / 720, pal = PAL[color] || PAL.green, HALO = color === 'cyan' ? 'rgba(0,26,34,' : 'rgba(0,30,12,';
    const layers = LAYERS.map((L, li) => {
      const fs = Math.max(7, Math.round(L.fs * s));
      const cw = Math.round(fs * 0.78), rh = Math.round(fs * 1.02);
      const pad = Math.ceil(fs * 0.6);
      const sw = cw + pad * 2, sh = rh + pad * 2;
      // スプライト：[glyph][level]
      const spr = [0, 1].map(g => pal.map((col, lv) => {
        const c = document.createElement('canvas'); c.width = sw; c.height = sh;
        const x = c.getContext('2d');
        x.font = `bold ${fs}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
        if (L.blur) x.filter = `blur(${(L.blur * s).toFixed(2)}px)`;
        const cx = sw / 2, cy = sh / 2 + fs * 0.04, ch = String(g);
        // 明るい背景でも形が分かるように、暗い縁取り（にじみ）を下に敷く
        x.globalAlpha = FA[lv];
        x.lineWidth = Math.max(1.5, fs * 0.13); x.strokeStyle = HALO + '0.8)'; x.lineJoin = 'round';
        x.strokeText(ch, cx, cy);
        // 発光（先頭の2文字だけ）
        if (lv >= 6) { x.shadowColor = pal[5]; x.shadowBlur = fs * (lv >= 7 ? 0.6 : 0.35); }
        x.fillStyle = col; x.fillText(ch, cx, cy);
        x.shadowBlur = 0; x.fillText(ch, cx, cy);
        return c;
      }));
      return { ...L, li, fs, cw, rh, pad, spr, sw, sh };
    });
    cache = { H, color, layers };
  }

  function draw(ctx, W, H, t, opt = {}) {
    const loop = opt.loop || 6;
    const color = opt.color || 'green';
    if (!cache || cache.H !== H || cache.color !== color) build(H, color);
    const u = frac(t / loop); // 0..1 で一周
    for (const L of cache.layers) {
      const nRows = Math.ceil(H / L.rh) + 1;
      const nCols = Math.ceil(W / L.cw) + 1;
      const xOff = (rnd(L.li, 9, 9) - 0.5) * L.cw; // 層ごとに列の位置を少しずらす
      for (let c = 0; c < nCols; c++) {
        const seed = c * 7 + L.li * 1000;
        if (rnd(seed, 1) > L.dens) continue;
        const nStream = rnd(seed, 2) < 0.35 ? 2 : 1;
        const tail = Math.round(L.tail[0] + (L.tail[1] - L.tail[0]) * rnd(seed, 3));
        const gap = Math.round(nRows * (L.gap[0] + (L.gap[1] - L.gap[0]) * rnd(seed, 4)));
        const P = nRows + tail + gap; // 一周の行数
        const k = L.k[0] + Math.floor(rnd(seed, 5) * (L.k[1] - L.k[0] + 1));
        const ph = rnd(seed, 6);
        const x0 = c * L.cw + xOff - L.pad;
        for (let si = 0; si < nStream; si++) {
          const head = Math.floor(frac(u * k + ph + si / nStream) * P); // 先頭の行（0..P-1）
          for (let j = 0; j <= tail; j++) {
            const r = head - j;
            if (r < 0 || r >= nRows) continue;
            const f = 1 - j / (tail + 1); // 1=先頭 → 0=尾
            let lv = j === 0 ? NL - 1 : j === 1 ? NL - 2 : Math.max(0, Math.min(NL - 3, Math.floor(f * (NL - 2))));
            // 文字：セルごとに loop 秒で M 回の入れ替わり機会（先頭付近はよく変わる）
            const M = j < 2 ? 24 : 8;
            const ep = Math.floor(frac(u + rnd(seed, r, 77)) * M) % M;
            const g = rnd(seed, r * 31 + ep, j < 2 ? 5 : 6) < 0.5 ? 0 : 1;
            // ときどき一瞬だけ明るく瞬くセル
            const tw = rnd(seed, r * 13 + Math.floor(u * 48) % 48, 8) < 0.02;
            if (tw && lv < NL - 2) lv = NL - 2;
            ctx.globalAlpha = L.a;
            ctx.drawImage(L.spr[g][lv], x0, r * L.rh - L.pad);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  window.FX = { draw };
})();
