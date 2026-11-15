// 風：左から右へ吹く風。window.FX.draw(ctx, W, H, t, opt)
// opt.mode = 'strong'（強い風）| 'storm'（暴風）。1つの描画関数を強さのパラメータで切り替える。
// 風の筋（細く長い白い線。ときどき弧や渦を描く）・木の葉・塵が流れる。暴風では紙片・小枝・砂塵が加わり、
// 突風で周期的に全体が強まる（時間そのものを伸び縮みさせて速さを変えるので、ループの継ぎ目は出ない）。
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const frac = x => x - Math.floor(x);
  function hash32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const rnd = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
  const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

  const MODES = {
    strong: {
      loop: 6, gust: 0, gustAmp: 0.18,
      streaks: 26, sk: [2, 3], sLen: [0.24, 0.5], sW: [2.2, 4.6], sA: 0.92, curl: 0.3, curlB: [2.0, 2.4], curlR: 0.9, wave: 0.02,
      leaves: 13, lk: [1, 2], leafSize: [13, 20],
      dust: 28, dk: [2, 3],
      paper: 0, twigs: 0, sand: 0,
    },
    storm: {
      loop: 6, gust: 2, gustAmp: 0.5,
      streaks: 40, sk: [3, 4, 5, 6], sLen: [0.25, 0.5], sW: [2.4, 6.0], sA: 0.85, curl: 0.4, curlB: [1.9, 2.5], wave: 0.035,
      leaves: 24, lk: [2, 3, 4], leafSize: [11, 18],
      dust: 110, dk: [3, 4, 6],
      paper: 7, twigs: 8, sand: 1,
    },
  };

  const LEAF = ['#5f8f34', '#7fa63a', '#c9a23a', '#b8742c', '#8a5a2b', '#a8462a'];
  const DUST = ['#cdb98f', '#b9a27a', '#d8d0bf', '#9c8b70'];

  // 砂塵の模様（左右につながる横長のもや）
  let sandTex = null;
  let SO = 4;
  function makeSand() {
    const N = 256, M = 64, c = document.createElement('canvas'); c.width = N; c.height = M;
    const x = c.getContext('2d'), img = x.createImageData(N, M), d = img.data;
    const wn = (u, v, pu, seed) => {
      const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
      const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
      const g = (a, b) => rnd(((a % pu) + pu) % pu, b, seed);
      const a = g(iu, iv), b = g(iu + 1, iv), cc = g(iu, iv + 1), dd = g(iu + 1, iv + 1);
      return a + (b - a) * su + (cc - a) * sv + (a - b - cc + dd) * su * sv;
    };
    for (let py = 0; py < M; py++) for (let px = 0; px < N; px++) {
      let n = 0, amp = 1, pu = 3, s = 0;
      for (let o = 0; o < SO; o++) { n += amp * wn(px / N * pu, py / M * pu * 1.2, pu, 50 + o); s += amp; amp *= 0.5; pu *= 2; }
      n /= s;
      const i4 = (py * N + px) * 4;
      const edge = Math.sin(Math.PI * (py + 0.5) / M);
      d[i4] = 196; d[i4 + 1] = 172; d[i4 + 2] = 128; d[i4 + 3] = 255 * clamp((n - 0.38) * 2.2) * edge * edge;
    }
    x.putImageData(img, 0, 0);
    sandTex = c;
  }

  function draw(ctx, W, H, t, opt = {}) {
    const o = { ...MODES[opt.mode || 'strong'], ...opt };
    const L = o.loop, S = H / 720;
    // 突風：時間を伸び縮みさせる（速さ = 1 + gustAmp·cos）。gust 回/ループ
    const Lg = o.gust ? L / o.gust : L;
    const gc = Math.cos(TAU * t / Lg);
    const tau = t + o.gustAmp * Lg / TAU * Math.sin(TAU * t / Lg);
    const g = o.gust ? 0.5 + 0.5 * gc : 0.5;               // 突風の強さ 0〜1
    const boost = o.gust ? 0.5 + 0.8 * g : 1;

    // ---- 砂塵のもや（暴風）
    if (o.sand) {
      if (!sandTex || SO !== (o.sandOct || 2)) { SO = o.sandOct || 2; makeSand(); }
      const bands = [{ y: 0.8, h: 0.4, k: 3, a: 0.3 }, { y: 0.45, h: 0.42, k: 4, a: 0.16 }].slice(0, o.sandBands || 2);
      bands.forEach((b, i) => {
        const tw = W * 1.0;
        const off = frac(b.k * tau / L + 0.37 * i) * tw;
        ctx.save();
        ctx.globalAlpha = b.a * (0.3 + 0.9 * g);
        const y0 = H * b.y - H * b.h / 2;
        for (let x = off - tw; x < W; x += tw) ctx.drawImage(sandTex, x, y0, tw + 1, H * b.h);
        ctx.restore();
      });
    }

    // ---- 風の筋
    const pts = [];
    for (let i = 0; i < o.streaks; i++) {
      const R = k => rnd(i, k, 501);
      const k = pick(o.sk, R(1));
      const per = L / k;
      const ph = frac(tau / per + R(2));
      const cyc = Math.floor(tau / per + R(2));
      const RC = m => rnd(i * 31 + (((cyc % k) + k) % k), m, 777);   // 1周ごとに違う形（k 周でループ）
      const len = W * (o.sLen[0] + (o.sLen[1] - o.sLen[0]) * RC(1));
      const span = W + len * 1.4 + W * 0.3;
      const xh = -W * 0.15 + ph * span;                  // 頭の位置
      const y0 = H * (0.06 + 0.88 * RC(2));
      const lam = W * (0.5 + 0.7 * RC(3)), phi = TAU * RC(4), amp = H * o.wave * (0.5 + RC(5));
      const slope = (RC(6) - 0.5) * 0.12;
      const hasCurl = RC(7) < o.curl;
      const cr = H * (0.025 + 0.035 * RC(8)) * (o.curlR || 1.2);
      const cb = cr * (o.curlB[0] + (o.curlB[1] - o.curlB[0]) * RC(9));
      const cs = W * (0.15 + 0.6 * RC(10));             // 渦の場所（道のりの上）
      const life = Math.sin(Math.PI * clamp((xh + len * 0.3) / (W + len * 0.6))) ;   // 画面の中ほどで濃く
      const al = o.sA * (0.45 + 0.55 * RC(11)) * Math.pow(life, 0.6) * boost;
      const wd = S * (o.sW[0] + (o.sW[1] - o.sW[0]) * Math.pow(RC(12), 1.5)) * (o.gust ? 0.7 + 0.6 * g : 1);
      // 突風のときだけ現れる筋（暴風）
      const gate = o.gust && RC(14) < 0.45 ? sstep(0.25, 0.75, g + (RC(15) - 0.5) * 0.3) : 1;
      const al2 = al * gate;
      if (al2 < 0.02) continue;
      const n = 44;
      const P = [];
      for (let j = 0; j <= n; j++) {
        const f = j / n, s = xh - len * (1 - f);
        let x = s, y = y0 + amp * Math.sin(TAU * s / lam + phi) + slope * (s - W / 2);
        if (hasCurl) {
          const th = (s - cs) / cr + Math.PI;
          if (th > 0 && th < TAU) { x += cb * Math.sin(th); y -= cb * 0.8 * (1 - Math.cos(th)) * (RC(13) < 0.5 ? 1 : -1); }
        }
        P.push([x, y, f]);
      }
      pts.push({ P, al: Math.min(1, al2), wd });
    }
    // 筋は太さの変わる帯（多角形）で描き、尾から頭へ濃くなるグラデーションをかける。
    // 先に少し太い青灰色の影を敷く（明るい背景でも筋が見えるように）→ 白い芯
    const ribbon = (P, hwf) => {
      const L1 = [], R1 = [];
      for (let j = 0; j < P.length; j++) {
        const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const hw = hwf(P[j][2]);
        L1.push([P[j][0] - dy * hw, P[j][1] + dx * hw]); R1.push([P[j][0] + dy * hw, P[j][1] - dx * hw]);
      }
      ctx.beginPath();
      ctx.moveTo(L1[0][0], L1[0][1]);
      for (let j = 1; j < L1.length; j++) ctx.lineTo(L1[j][0], L1[j][1]);
      for (let j = R1.length - 1; j >= 0; j--) ctx.lineTo(R1[j][0], R1[j][1]);
      ctx.closePath();
    };
    const taper = f => Math.pow(Math.sin(Math.PI * clamp(f * 0.97 + 0.015)), 0.55) * (0.35 + 0.65 * f);
    for (const pass of [0, 1]) {
      for (const s of pts) {
        const P = s.P, p0 = P[0], p1 = P[P.length - 1];
        const gr = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
        const col = pass ? '244,248,252' : '48,60,78';
        const A = pass ? s.al : s.al * 0.32;
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.55, `rgba(${col},${A * 0.55})`); gr.addColorStop(0.9, `rgba(${col},${A})`); gr.addColorStop(1, `rgba(${col},${A})`);
        ctx.fillStyle = gr;
        ribbon(P, pass ? f => s.wd * 0.5 * taper(f) : f => s.wd * 1.25 * taper(f) + 1.1 * S);
        ctx.fill();
      }
    }

    // ---- 粒もの（葉・紙片・小枝・塵）。それぞれ k 周/ループで左から右へ
    const flyer = (i, seed, kset, fn) => {
      const R = k => rnd(i, k, seed);
      const k = pick(kset, R(1)), per = L / k;
      const a = frac(tau / per + R(2));
      const span = W * 1.3;
      const x = -W * 0.12 + a * span;
      const y = H * (0.05 + 0.9 * R(3)) + H * 0.06 * Math.sin(TAU * (a * (1 + Math.floor(R(4) * 3)) + R(5))) + H * 0.1 * (a - 0.5) * (R(6) - 0.4);
      fn(x, y, a, R, k);
    };
    // 塵：短い線（速さで尾を引く）
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < o.dust; i++) flyer(i, 801, o.dk, (x, y, a, R, k) => {
      const sp = W * 1.3 * k / L * (1 + o.gustAmp * gc);
      const tail = sp / 20 * (0.08 + 0.25 * R(7)) * (o.mode === 'storm' ? 1.3 : 1);
      const r = S * (0.7 + 1.3 * R(8));
      ctx.globalAlpha = (0.45 + 0.45 * R(9)) * (o.gust ? 0.6 + 0.6 * g : 1);
      ctx.strokeStyle = pick(DUST, R(10));
      ctx.lineWidth = r * 2;
      ctx.beginPath(); ctx.moveTo(x - tail, y + tail * 0.04); ctx.lineTo(x, y); ctx.stroke();
    });
    ctx.restore();

    // 小枝
    for (let i = 0; i < o.twigs; i++) flyer(i, 851, [2, 3], (x, y, a, R, k) => {
      const len = S * (22 + 26 * R(7));
      const ang = TAU * (a * (2 + Math.floor(R(8) * 3)) * (R(9) < 0.5 ? 1 : -1) + R(10));
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.lineCap = 'round';
      ctx.strokeStyle = R(11) < 0.5 ? '#5a3c22' : '#6e4a2a';
      ctx.lineWidth = S * (2 + 1.2 * R(12));
      ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.quadraticCurveTo(0, len * 0.08, len / 2, -len * 0.02); ctx.stroke();
      ctx.lineWidth = S * 1.3;
      ctx.beginPath(); ctx.moveTo(len * 0.05, len * 0.03); ctx.lineTo(len * 0.3, len * 0.22); ctx.stroke();
      if (R(13) < 0.6) { ctx.fillStyle = '#6f9a3a'; ctx.beginPath(); ctx.ellipse(len * 0.33, len * 0.26, S * 5, S * 2.5, 0.7, 0, TAU); ctx.fill(); }
      ctx.restore();
    });

    // 紙片：くるくる裏返りながら飛ぶ
    for (let i = 0; i < o.paper; i++) flyer(i, 871, [1, 2], (x, y, a, R, k) => {
      const w = S * (14 + 10 * R(7)), h = w * (0.7 + 0.4 * R(8));
      const spin = TAU * (a * (1 + Math.floor(R(9) * 2)) + R(10));
      const flip = Math.cos(TAU * (a * (2 + Math.floor(R(11) * 3)) + R(12)));
      ctx.save();
      ctx.translate(x, y); ctx.rotate(spin); ctx.scale(1, Math.abs(flip) < 0.12 ? 0.12 * Math.sign(flip || 1) : flip);
      ctx.fillStyle = flip > 0 ? '#f1ece0' : '#cfc7b6';
      ctx.strokeStyle = 'rgba(60,55,45,0.55)'; ctx.lineWidth = S;
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2 + h * 0.08); ctx.lineTo(w / 2 - w * 0.06, h / 2); ctx.lineTo(-w / 2 + w * 0.1, h / 2 - h * 0.05); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // 木の葉：回りながら、ときどき裏返る
    for (let i = 0; i < o.leaves; i++) flyer(i, 901, o.lk, (x, y, a, R, k) => {
      const sz = S * (o.leafSize[0] + (o.leafSize[1] - o.leafSize[0]) * R(7));
      const spin = TAU * (a * (1 + Math.floor(R(8) * (o.mode === 'storm' ? 4 : 2))) * (R(9) < 0.5 ? 1 : -1) + R(10));
      const flip = Math.cos(TAU * (a * (1 + Math.floor(R(11) * 3)) + R(12)));
      const col = pick(LEAF, R(13));
      ctx.save();
      ctx.translate(x, y); ctx.rotate(spin); ctx.scale(1, Math.abs(flip) < 0.15 ? 0.15 * Math.sign(flip || 1) : flip);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-sz, 0);
      ctx.quadraticCurveTo(-sz * 0.2, -sz * 0.62, sz * 0.9, 0);
      ctx.quadraticCurveTo(-sz * 0.2, sz * 0.62, -sz, 0);
      ctx.fill();
      ctx.globalAlpha = flip > 0 ? 0 : 0.25; ctx.fillStyle = '#000'; ctx.fill();    // 裏側は少し暗く
      ctx.globalAlpha = 0.55; ctx.strokeStyle = 'rgba(40,30,15,0.8)'; ctx.lineWidth = Math.max(0.8, S);
      ctx.beginPath(); ctx.moveTo(-sz * 1.25, sz * 0.06); ctx.lineTo(sz * 0.8, 0); ctx.stroke();   // 葉柄と主脈
      ctx.restore();
    });
  }
  window.FX = { draw };
})();
