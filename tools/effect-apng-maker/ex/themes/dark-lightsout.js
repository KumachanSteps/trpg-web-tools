// 闇：明かりが消える（一回再生）。window.FX.draw(ctx, W, H, t, opt)
// 画面の周辺から暗くなり（ビネット）、明かりがちらついて二度ほどふっと戻り、最後は大半が暗闇に沈む。
// 中央にかすかな明るさだけが残った状態で止まる。
// しくみ：画面にかぶせる黒い膜の濃さ＝「周辺から迫る暗がり（半径 Rv が縮む）」と「明かりが消える瞬間の全体の暗転」。
// 暗がりの縁はゆっくり動くノイズで少しゆがませる（きれいな円にしない）。粗い解像度で計算して拡大する。
(function () {
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const TB = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) TB[i] = rnd(i & 255, i >> 8, 515);
  function vn(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ix & 255, x1 = (ix + 1) & 255, y0 = (iy & 255) << 8, y1 = ((iy + 1) & 255) << 8;
    const a = TB[x0 + y0], b = TB[x1 + y0], c = TB[x0 + y1], d = TB[x1 + y1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // 区間 [t0,t1] で 1 になる山（立ち上がり rise 秒、下がり fall 秒）
  const pulse = (t, t0, t1, rise, fall) => sstep(t0, t0 + rise, t) * (1 - sstep(t1, t1 + fall, t));
  // 区間をなめらかにつなぐ折れ線（[時刻, 値] の並び）
  function track(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return v0 + (v1 - v0) * sstep(t0, t1, t);
    }
    return keys[keys.length - 1][1];
  }

  let fa = null, full = null;
  function draw(ctx, W, H, t, opt = {}) {
    const o = { res: 0.25, ...opt };
    const rw = Math.ceil(W * o.res), rh = Math.ceil(H * o.res);
    if (!fa || fa.length !== rw * rh) fa = new Float32Array(rw * rh);
    if (!full || full.width !== W || full.height !== H) full = new ImageData(W, H);
    // 暗がりの半径（大きいほど暗い所は外側だけ）。明かりが戻るたびに、前より小さく（弱く）なる
    const Rv = track(t, [[0, 1.85], [1.3, 1.15], [1.4, 1.1], [2.2, 0.98], [2.7, 0.88], [3.0, 0.84], [3.8, 0.5]]);
    // 全体のかげり（明かりそのものが弱っていく）
    const floor = track(t, [[0, 0], [1.3, 0.1], [2.2, 0.18], [2.7, 0.3], [3.0, 0.32], [3.8, 0.52]]);
    // 明かりがふっと消える瞬間（全体の暗転）。1回目は短く、間に小さなゆらぎ、2回目は長め
    const out = 0.88 * pulse(t, 1.36, 1.46, 0.05, 0.08)
      + 0.32 * pulse(t, 1.78, 1.82, 0.03, 0.05)
      + 0.22 * pulse(t, 1.97, 2.0, 0.02, 0.05)
      + 0.92 * pulse(t, 2.24, 2.55, 0.07, 0.12)
      + 0.4 * pulse(t, 2.9, 2.95, 0.03, 0.06);
    // 消えている間も、真ん中はほんのわずかに残る
    const ar = W / H;
    const tn = t * 0.12;
    for (let py = 0; py < rh; py++) {
      const Y = (py + 0.5) / rh * 2 - 1;
      for (let px = 0; px < rw; px++) {
        const X = (px + 0.5) / rw * 2 - 1;
        // 横長の画面でも、暗がりは四隅から来る（少し横につぶした楕円）
        let r = Math.sqrt(X * X * 0.82 + Y * Y * 1.1);
        // 縁のゆがみ：ゆっくり動くノイズ
        const n = vn(X * 1.1 * ar + 20 + tn, Y * 1.1 + 7) * 0.7 + vn(X * 2.6 * ar + 40, Y * 2.6 - tn * 1.5 + 3) * 0.3;
        r += (n - 0.5) * 0.12;
        const vig = floor + (0.975 - floor) * sstep(Rv - 0.75, Rv + 0.3, r);
        const blk = out * (0.88 + 0.12 * sstep(0.0, 0.7, r));
        const A = 1 - (1 - vig) * (1 - blk);
        fa[py * rw + px] = A;
      }
    }
    // 実寸へは自前で双一次補間する。色は1色・濃さだけ255段なので、APNG の色数に収まり（無劣化）、
    // なめらかな暗がりに縞（バンディング）が出ない
    const D = full.data;
    for (let y = 0; y < H; y++) {
      const fy = clamp((y + 0.5) / H * rh - 0.5, 0, rh - 1), y0 = Math.floor(fy), y1 = Math.min(rh - 1, y0 + 1), wy = fy - y0;
      for (let x = 0; x < W; x++) {
        const fx = clamp((x + 0.5) / W * rw - 0.5, 0, rw - 1), x0 = Math.floor(fx), x1 = Math.min(rw - 1, x0 + 1), wx = fx - x0;
        const a0 = fa[y0 * rw + x0] + (fa[y0 * rw + x1] - fa[y0 * rw + x0]) * wx;
        const a1 = fa[y1 * rw + x0] + (fa[y1 * rw + x1] - fa[y1 * rw + x0]) * wx;
        const i4 = (y * W + x) * 4;
        D[i4] = 4; D[i4 + 1] = 4; D[i4 + 2] = 9;
        D[i4 + 3] = Math.round(255 * (a0 + (a1 - a0) * wy));
      }
    }
    ctx.putImageData(full, 0, 0);
  }
  window.FX = { draw };
})();
