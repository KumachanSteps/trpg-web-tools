// テーマ「水」：水しぶき（一回もの、約2.4秒）。window.FX.draw(ctx, W, H, t, opt)
// 水の塊は描かない。画面の中央下で「ばしゃあっ」と弾けた白い飛沫が、こちら（カメラ）へ向かって飛び散る。
//   ・粒は3D空間で飛ばして透視投影する：近づくほど大きく速くなり、カメラ間近の粒は大きくぼけて画面の外へ抜ける
//   ・速い粒は流し撮りの尾（モーションブラー）で描く。上へ飛んだ粒は重力で落ちて水面にもどる
//   ・細かい霧（もや）がふわっと広がって残り、最後は完全に透明になる
// 色：白＋ごく淡い水色、ふちに薄い紺の線（明るい背景でも形が分かるように）。
// 乱数は hash ベース（同じ時刻は必ず同じ絵）。
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
  const smooth = x => x * x * (3 - 2 * x);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;

  // 色
  const WHITE = [255, 255, 255], TINT = [226, 241, 252], EDGE = [38, 84, 130];

  // ── 3D のつくり（単位はだいたいメートル）。カメラは原点で +z を向く。y は下向きが正 ──
  const Z0 = 5.2;   // しぶきの起点までの距離
  const Y0 = 1.3;  // 水面の高さ（カメラより下）→ 起点は画面のおよそ 75% の高さ
  const G = 9.8;    // 重力
  const ZN = 0.22;  // これより近い粒は消す（カメラを通りすぎた）
  const SHUT = 0.02; // 尾の長さ（秒）

  // 抵抗つきの放物運動：位置 = p0 + v0(1-e^{-kτ})/k + 重力項
  function pos(p, tau, out) {
    const k = p.k;
    let e, gy;
    if (k < 1e-4) { e = tau; gy = 0.5 * G * tau * tau; }
    else { const ex = Math.exp(-k * tau); e = (1 - ex) / k; gy = G * (tau - e) / k; }
    out[0] = p.x + p.vx * e;
    out[1] = p.y + p.vy * e + gy * p.gm;
    out[2] = p.z + p.vz * e;
    return out;
  }

  let parts = null, mists = null;
  function build(W, H) {
    const f = H; // 焦点距離（px）
    parts = []; mists = [];
    let id = 0;
    const add = (kind, n, fn) => { for (let i = 0; i < n; i++) { const p = fn(j => rnd(id, j, 7 + kind)); p.kind = kind; p.id = id++; parts.push(p); } };
    const dir = (s, el, az) => [s * Math.cos(el) * Math.sin(az), -s * Math.sin(el), -s * Math.cos(el) * Math.cos(az)];
    // 起点のまわり（小さな輪）
    const origin = (R, rad) => { const a = TAU * R(20), r = rad * Math.sqrt(R(21)); return [r * Math.cos(a), Y0 - 0.02 - 0.06 * R(22), Z0 + r * Math.sin(a) * 0.6]; };

    // A：主役の飛沫。こちら向き＋上向きにはじける。多くは「筋（ジェット）」に属し、同じ向きに速さ違いで連なって飛ぶ
    const NJ = 34, jets = [];
    for (let j = 0; j < NJ; j++) {
      const R = q => rnd(j, q, 55);
      jets.push({ el: (20 + 62 * R(1)) * Math.PI / 180, az: (R(2) - 0.5) * 2 * (0.15 + 0.7 * R(3)), s: 7 + 6 * R(4), w: 0.04 + 0.07 * R(5) });
    }
    add(0, 820, R => {
      const t0 = 0.1 * Math.pow(R(1), 1.8);
      let s, el, az;
      if (R(9) < 0.62) {
        const J = jets[(R(10) * NJ) | 0];
        s = J.s * (0.45 + 0.75 * Math.pow(R(2), 0.7));
        el = J.el + (R(3) - 0.5) * 2 * J.w; az = J.az + (R(4) - 0.5) * 2 * J.w * 1.6;
      } else {
        s = 4 + 8 * Math.pow(R(2), 0.8);
        el = (18 + 64 * R(3)) * Math.PI / 180;
        az = (R(4) - 0.5) * 2 * (0.15 + 0.7 * R(5));
      }
      const v = dir(s, el, az);
      const o = origin(R, 0.3);
      return { t0, x: o[0], y: o[1], z: o[2], vx: v[0], vy: v[1], vz: v[2], k: 0.25 + 0.5 * R(6), gm: 1,
        R: 0.0035 + 0.018 * Math.pow(R(7), 3), life: 2.4 };
    });
    // B：上へ立って落ちてくる飛沫（遠いまま）。「落ちて水面にもどる」担当
    add(1, 420, R => {
      const t0 = 0.16 * Math.pow(R(1), 1.4);
      const s = 2.8 + 5.2 * R(2);
      const el = (48 + 40 * R(3)) * Math.PI / 180;
      const az = TAU * R(4);
      const v = dir(s, el, az);
      const o = origin(R, 0.45);
      return { t0, x: o[0], y: o[1], z: o[2], vx: v[0], vy: v[1], vz: v[2], k: 0.4 + 0.6 * R(6), gm: 1,
        R: 0.004 + 0.013 * Math.pow(R(7), 2.5), life: 2.4 };
    });
    // C：細かい霧の粒（細い尾だけになる速い粒）
    add(2, 260, R => {
      const t0 = 0.09 * Math.pow(R(1), 1.5);
      const s = 7 + 11 * R(2);
      const el = (15 + 65 * R(3)) * Math.PI / 180;
      const az = (R(4) - 0.5) * 2 * (0.25 + 0.9 * R(5));
      const v = dir(s, el, az);
      const o = origin(R, 0.25);
      return { t0, x: o[0], y: o[1], z: o[2], vx: v[0], vy: v[1], vz: v[2], k: 1.4 + 1.6 * R(6), gm: 0.6,
        R: 0.0016 + 0.0028 * R(7), life: 0.45 + 0.6 * R(8) };
    });
    // D：カメラのすぐ前を横切る大粒。画面の中のねらった点を通って外へ抜け、大きくぼける
    const ND = 26;
    for (let i = 0; i < ND; i++) {
      const R = j => rnd(i, j, 91);
      const t0 = 0.02 + 0.3 * Math.pow(R(1), 1.3);
      const T = 0.32 + 0.55 * R(2);   // 近づくまでの時間
      const zT = 0.55 + 0.35 * R(3);
      // 画面のどこを通るか：中央を避けて周りへ
      const ang = TAU * (i + 0.5 * R(4)) / ND, rr = 0.42 + 0.5 * R(5);
      const sx = W / 2 + Math.cos(ang) * rr * W * 0.5, sy = H * 0.5 + Math.sin(ang) * rr * H * 0.55 - H * 0.05;
      const xT = (sx - W / 2) / f * zT, yT = (sy - H / 2) / f * zT;
      const x0 = (R(6) - 0.5) * 0.4, y0 = Y0 - 0.05, z0 = Z0 + (R(7) - 0.5) * 0.4;
      const vz = (zT - z0) / T, vx = (xT - x0) / T, vy = (yT - y0 - 0.5 * G * T * T) / T;
      parts.push({ kind: 3, id: id++, t0, x: x0, y: y0, z: z0, vx, vy, vz, k: 0, gm: 1, R: 0.009 + 0.02 * R(8), life: 2.4 });
    }
    // 霧：ふわっと広がって漂い、ゆっくり消える
    for (let i = 0; i < 72; i++) {
      const R = j => rnd(i, j, 303);
      const t0 = 0.03 + 0.22 * Math.pow(R(1), 1.3);
      const s = 2 + 9 * R(2);
      const el = (5 + 60 * R(3)) * Math.PI / 180;
      const az = (R(4) - 0.5) * 2 * (0.4 + 1.2 * R(5));
      const v = dir(s, el, az);
      mists.push({ t0, x: (R(6) - 0.5) * 0.5, y: Y0 - 0.1 - 0.2 * R(7), z: Z0 + (R(8) - 0.5) * 0.4, vx: v[0], vy: v[1], vz: v[2], k: 2.2 + 1.5 * R(9), gm: 0.05,
        R0: 0.12 + 0.18 * R(10), Rg: 0.35 + 0.7 * R(11), a: 0.06 + 0.1 * R(12), dec: 0.32 + 0.5 * R(13), spr: (R(14) * 4) | 0, rot: TAU * R(15), rs: (R(16) - 0.5) * 0.8 });
    }
  }

  // ── スプライト ──
  let sprSoft = null, sprMist = null;
  function makeSprites() {
    // ぼけた大粒：白い芯、淡い水色、うすい紺のふち、左上に光
    const S = 128;
    sprSoft = document.createElement('canvas'); sprSoft.width = sprSoft.height = S;
    let x = sprSoft.getContext('2d');
    let g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.45, 'rgba(240,248,255,0.8)');
    g.addColorStop(0.72, 'rgba(210,231,250,0.6)');
    g.addColorStop(0.86, 'rgba(90,140,190,0.32)');
    g.addColorStop(1, 'rgba(60,110,165,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    g = x.createRadialGradient(S * 0.38, S * 0.36, 0, S * 0.38, S * 0.36, S * 0.2);
    g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    // 霧：値ノイズでむらのある白いもや（4種）
    sprMist = [];
    const M = 128;
    for (let v = 0; v < 4; v++) {
      const c = document.createElement('canvas'); c.width = c.height = M;
      const cx = c.getContext('2d'), im = cx.createImageData(M, M), d = im.data;
      const vn = (u, w, seed) => {
        const iu = Math.floor(u), iw = Math.floor(w), fu = smooth(u - iu), fw = smooth(w - iw);
        const q = (a, b) => rnd(a, b, seed);
        const a = q(iu, iw), b = q(iu + 1, iw), cc = q(iu, iw + 1), dd = q(iu + 1, iw + 1);
        return a + (b - a) * fu + (cc - a) * fw + (a - b - cc + dd) * fu * fw;
      };
      for (let py = 0; py < M; py++) for (let px = 0; px < M; px++) {
        const u = px / M * 2 - 1, w = py / M * 2 - 1, r = Math.sqrt(u * u + w * w);
        let n = 0, amp = 1, fr = 3;
        for (let o = 0; o < 4; o++) { n += amp * vn(px / M * fr + 10 * v, py / M * fr, 500 + v * 10 + o); amp *= 0.5; fr *= 2; }
        n /= 1.875;
        const fall = clamp(1 - r); const m = fall * fall * (3 - 2 * fall);
        const a = clamp((n - 0.28) * 1.9) * m;
        const i = (py * M + px) * 4;
        // 濃いところほど白、薄いところは淡い水色
        d[i] = 222 + 33 * n; d[i + 1] = 236 + 19 * n; d[i + 2] = 250 + 5 * n; d[i + 3] = 255 * a;
      }
      cx.putImageData(im, 0, 0);
      sprMist.push(c);
    }
  }

  const P = [0, 0, 0], Q = [0, 0, 0];
  function draw(ctx, W, H, t, opt = {}) {
    t += 0.03; // 1コマ目からもう弾けはじめている
    if (!sprSoft) makeSprites();
    if (!parts || build.W !== W || build.H !== H) { build(W, H); build.W = W; build.H = H; }
    const f = H, cx = W / 2, cy = H / 2, u = H / 720;
    const gEnd = 1 - sstep(2.05, 2.34, t); // 最後は完全に透明へ
    if (gEnd <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';

    // ── 霧（いちばん奥にまとめて） ──
    for (const m of mists) {
      const tau = t - m.t0; if (tau <= 0) continue;
      pos(m, tau, P);
      const z = Math.max(P[2], 0.6);
      const Rw = m.R0 + m.Rg * (1 - Math.exp(-1.8 * tau));
      const rp = f * Rw / z;
      const a = m.a * sstep(0, 0.12, tau) * Math.exp(-tau / m.dec) * gEnd * clamp((P[2] - 0.5) / 1.2);
      if (a < 0.004) continue;
      const sx = cx + f * P[0] / z, sy = cy + f * P[1] / z;
      if (sx < -rp || sx > W + rp || sy < -rp || sy > H + rp) continue;
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(m.rot + m.rs * tau);
      ctx.globalAlpha = a;
      ctx.drawImage(sprMist[m.spr], -rp, -rp * 0.8, rp * 2, rp * 1.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // ── 弾けた瞬間のひかり（起点のまわりの白いぱっ） ──
    const fl = sstep(0, 0.02, t) * (1 - sstep(0.03, 0.22, t));
    if (fl > 0) {
      const sx = cx, sy = cy + f * Y0 / Z0 - 6 * u, r = (60 + 200 * sstep(0, 0.22, t)) * u;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(255,255,255,${(0.6 * fl).toFixed(3)})`);
      g.addColorStop(0.3, `rgba(238,247,255,${(0.25 * fl).toFixed(3)})`);
      g.addColorStop(1, 'rgba(220,238,255,0)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.55); ctx.translate(-sx, -sy);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); ctx.restore();
    }

    // ── 粒：遠い順に描く ──
    const vis = [];
    for (const p of parts) {
      const tau = t - p.t0; if (tau <= 0 || tau > p.life) continue;
      pos(p, tau, P);
      if (P[2] < ZN) continue;
      const tb = Math.max(0, tau - SHUT);
      pos(p, tb, Q);
      const qz = Math.max(Q[2], ZN);
      const sx = cx + f * P[0] / P[2], sy = cy + f * P[1] / P[2];
      const bx = cx + f * Q[0] / qz, by = cy + f * Q[1] / qz;
      const r = f * p.R / P[2];
      const m = r * 3 + 4;
      if (Math.max(sx, bx) < -m || Math.min(sx, bx) > W + m || Math.max(sy, by) < -m || Math.min(sy, by) > H + m) continue;
      // 水面より下に落ちたら消える（落ちてもどる）
      const below = P[1] - (Y0 + 0.02);
      let a = gEnd * clamp(1 - below / 0.35) * sstep(0, 0.025, tau);
      a *= clamp((P[2] - ZN) / 0.18);
      if (p.life < 2.4) a *= 1 - sstep(p.life * 0.55, p.life, tau);
      if (a < 0.01) continue;
      vis.push({ p, z: P[2], sx, sy, bx, by, r, a });
    }
    vis.sort((A, B) => B.z - A.z);

    for (const v of vis) {
      const { sx, sy } = v;
      let r = v.r, a = v.a;
      let dx = sx - v.bx, dy = sy - v.by, len = Math.hypot(dx, dy);
      const cap = 9 * Math.max(2 * r, 1.3 * u) + 8 * u;
      if (len > cap) { const k = cap / len; dx *= k; dy *= k; len = cap; }
      const bx = sx - dx, by = sy - dy;
      // カメラ間近の粒はぼかす（大きいほど柔らかく、少し薄く）
      const blur = v.p.kind === 3 ? sstep(5 * u, 26 * u, r) : sstep(9 * u, 34 * u, r);
      if (blur > 0.02) {
        const rr = r * (1 + 0.9 * blur);
        const ab = a * blur * (0.95 - 0.35 * sstep(40 * u, 140 * u, rr));
        if (ab > 0.01) {
          ctx.save();
          ctx.translate(sx - dx * 0.275, sy - dy * 0.275);
          ctx.rotate(Math.atan2(dy, dx));
          ctx.globalAlpha = ab;
          const L = len * 0.55 + rr * 2;
          ctx.drawImage(sprSoft, -L / 2, -rr, L, rr * 2);
          ctx.restore();
          ctx.globalAlpha = 1;
        }
        a *= 1 - blur;
        if (a < 0.01) continue;
      }
      // くっきりした粒：紺のふち → 淡い水色の体 → 白い芯。速い粒は尾になる
      let w = 2 * r;
      if (w < 1.3 * u) { a *= Math.max(0.35, w / (1.3 * u)); w = 1.3 * u; }
      const tail = len > w * 0.6;
      const line = (lw, col, al) => {
        ctx.strokeStyle = rgba(col, al); ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke();
      };
      const dot = (rad, col, al) => {
        ctx.fillStyle = rgba(col, al); ctx.beginPath(); ctx.arc(sx, sy, rad, 0, TAU); ctx.fill();
      };
      // 尾：細い粒は線、太い粒は頭が丸く後ろへ細くなる涙形（カプセルに見えないように）
      const tear = (rh, rt, col, al) => {
        const ux = dx / len, uy = dy / len, ang = Math.atan2(dy, dx);
        ctx.fillStyle = rgba(col, al);
        ctx.beginPath();
        ctx.arc(sx, sy, rh, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.lineTo(bx - uy * rt, by + ux * rt);
        ctx.lineTo(bx + uy * rt, by - ux * rt);
        ctx.closePath(); ctx.fill();
      };
      if (tail && w < 3.2 * u) {
        line(w + 1.6 * u, EDGE, 0.38 * a);
        line(w, TINT, 0.6 * a);
        line(w * 0.55, WHITE, 0.85 * a);
        dot(w * 0.5, WHITE, 0.95 * a);
      } else if (tail) {
        tear(w * 0.5 + 1.1 * u, w * 0.12 + 0.6 * u, EDGE, 0.42 * a);
        tear(w * 0.5, w * 0.08, TINT, 0.85 * a);
        tear(w * 0.3, w * 0.03, WHITE, 0.9 * a);
      } else {
        dot(w * 0.5 + 0.9 * u, EDGE, 0.45 * a);
        dot(w * 0.5, TINT, 0.92 * a);
        if (w > 4 * u) dot(w * 0.22, WHITE, 0.9 * a);
      }
    }
    ctx.restore();
  }
  root.FX = { draw };
})(typeof window !== 'undefined' ? window : globalThis);
