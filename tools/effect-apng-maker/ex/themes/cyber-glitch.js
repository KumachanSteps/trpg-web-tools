// サイバー：暗い背景がデジタルのグリッチを起こす（背景・不透明・ループ）。
// 何かを隠している「壊れた映像」：暗い紺の画面（うっすら格子と同心円）に、
// 横にずれる帯・RGB の色ずれ・ブロックノイズ・砂嵐の帯・縦のロールが、静かな間をはさんで起きる。
// 走査線とビネットは常にかかる。乱れの予定は loop 秒で一周（t と t+loop は同じ絵）。
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
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // 乱れの予定（loop に対する割合で開始・長さ、強さ）
  const EVENTS = [
    { at: 0.10, len: 0.020, pk: 0.30 },
    { at: 0.115, len: 0.012, pk: 0.45 },
    { at: 0.27, len: 0.010, pk: 0.25 },
    { at: 0.42, len: 0.085, pk: 1.00 }, // 激しい乱れ
    { at: 0.53, len: 0.010, pk: 0.35 },
    { at: 0.66, len: 0.030, pk: 0.55 },
    { at: 0.695, len: 0.012, pk: 0.4 },
    { at: 0.86, len: 0.008, pk: 0.3 },
  ];
  const CH = ['#00e5ff', '#ff2bd6', '#39ff88', '#ffffff', '#2a62ff'];

  let C = null;
  function build(W, H) {
    const s = H / 720;
    // 元の映像（静止）
    const base = mk(W, H), b = base.getContext('2d');
    b.fillStyle = '#04060c'; b.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => { const g = b.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = g; b.fillRect(0, 0, W, H); };
    blob(W * 0.26, H * 0.32, H * 0.8, 'rgba(14,90,120,0.7)');
    blob(W * 0.8, H * 0.72, H * 0.75, 'rgba(90,18,100,0.6)');
    blob(W * 0.5, H * 0.5, H * 0.5, 'rgba(30,120,160,0.45)');
    // 格子（4つおきに少し太い線）
    const gs = 48 * s;
    let gi = 0;
    for (let x = (W / 2) % gs; x < W; x += gs, gi++) { b.strokeStyle = `rgba(90,200,255,${gi % 4 === 0 ? 0.16 : 0.08})`; b.lineWidth = Math.max(1, s); b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, H); b.stroke(); }
    gi = 0;
    for (let y = (H / 2) % gs; y < H; y += gs, gi++) { b.strokeStyle = `rgba(90,200,255,${gi % 4 === 0 ? 0.16 : 0.08})`; b.lineWidth = Math.max(1, s); b.beginPath(); b.moveTo(0, y + 0.5); b.lineTo(W, y + 0.5); b.stroke(); }
    // 縦の光の筋（横ずれが見えるように縦の要素を入れる）
    for (let i = 0; i < 16; i++) {
      const x = rnd(i, 7) * W, w = (1 + rnd(i, 8) * 7) * s;
      const g = b.createLinearGradient(0, 0, 0, H);
      const a = 0.06 + rnd(i, 9) * 0.16, col = rnd(i, 10) < 0.7 ? '80,210,255' : '220,70,230';
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(rnd(i, 13) * 0.6 + 0.2, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      b.fillStyle = g; b.fillRect(x, 0, w, H);
    }
    // うすい枠（画面の部品の名残）
    for (let i = 0; i < 6; i++) {
      const w = (80 + rnd(i, 14) * 220) * s, h = (40 + rnd(i, 15) * 120) * s;
      const x = rnd(i, 16) * (W - w), y = rnd(i, 17) * (H - h);
      b.strokeStyle = `rgba(110,220,255,${0.08 + rnd(i, 18) * 0.1})`; b.lineWidth = Math.max(1, 1.5 * s);
      b.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
      b.fillStyle = 'rgba(110,220,255,0.03)'; b.fillRect(x, y, w, h);
    }
    // 中央の同心円と十字（隠されている何か）
    const cx = W / 2, cy = H / 2;
    b.shadowColor = 'rgba(80,210,255,0.8)'; b.shadowBlur = 10 * s;
    for (let i = 0; i < 4; i++) {
      b.strokeStyle = `rgba(130,225,255,${0.4 - i * 0.08})`; b.lineWidth = (i === 0 ? 4 : 2) * s;
      b.beginPath(); b.arc(cx, cy, (70 + i * 62) * s, 0, Math.PI * 2); b.stroke();
    }
    b.strokeStyle = 'rgba(130,225,255,0.25)'; b.lineWidth = 2 * s;
    b.beginPath(); b.moveTo(cx - 330 * s, cy); b.lineTo(cx + 330 * s, cy); b.moveTo(cx, cy - 290 * s); b.lineTo(cx, cy + 290 * s); b.stroke();
    b.shadowBlur = 0;
    blob(cx, cy, 70 * s, 'rgba(120,230,255,0.25)');
    // 横のうすい色帯
    for (let i = 0; i < 9; i++) {
      const y = rnd(i, 3) * H, h = (6 + rnd(i, 4) * 40) * s;
      b.fillStyle = `rgba(${rnd(i, 5) < 0.5 ? '40,160,220' : '160,40,180'},${0.03 + rnd(i, 6) * 0.05})`;
      b.fillRect(0, y, W, h);
    }
    // R・G・B だけの版（色ずれ用）
    const chan = ['#ff0000', '#00ff00', '#0000ff'].map(col => {
      const c = mk(W, H), x = c.getContext('2d');
      x.drawImage(base, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, W, H);
      return c;
    });
    // ブロックノイズ用の模様（粗い色ノイズ）
    const NT = 6, tiles = [];
    for (let k = 0; k < NT; k++) {
      const tw = 64, th = 36, c = mk(tw, th), x = c.getContext('2d'), img = x.createImageData(tw, th), d = img.data;
      for (let i = 0; i < tw * th; i++) {
        const v = rnd(i, k, 11), m = rnd(i, k, 12);
        const col = m < 0.15 ? [0, 229, 255] : m < 0.25 ? [255, 43, 214] : m < 0.3 ? [57, 255, 136] : [v * 255, v * 255, v * 255];
        const lv = m < 0.3 ? 0.4 + v * 0.6 : 1;
        d[i * 4] = col[0] * lv; d[i * 4 + 1] = col[1] * lv; d[i * 4 + 2] = col[2] * lv; d[i * 4 + 3] = 255;
      }
      x.putImageData(img, 0, 0); tiles.push(c);
    }
    // 走査線＋ビネット（上にかける）
    const over = mk(W, H), o = over.getContext('2d');
    const sp = Math.max(2, Math.round(3 * s));
    o.fillStyle = 'rgba(0,0,0,0.32)';
    for (let y = 0; y < H; y += sp) o.fillRect(0, y, W, Math.max(1, Math.round(sp / 3)));
    const vg = o.createRadialGradient(cx, cy, H * 0.35, cx, cy, Math.hypot(W, H) * 0.58);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    o.fillStyle = vg; o.fillRect(0, 0, W, H);
    const F = mk(W, H);
    C = { W, H, s, base, chan, tiles, over, F, fx: F.getContext('2d') };
  }

  // 強さ 0..1（fi = 乱れ時計のコマ番号）
  function intensity(u, fi) {
    let I = 0;
    for (let e = 0; e < EVENTS.length; e++) {
      const E = EVENTS[e];
      const d = frac(u - E.at + 1);
      if (d < E.len) {
        const fl = 0.35 + 0.65 * rnd(fi, e, 21); // コマごとにばらつく
        I = Math.max(I, E.pk * fl);
      }
    }
    return I;
  }

  function draw(ctx, W, H, t, opt = {}) {
    const loop = opt.loop || 8;
    if (!C || C.W !== W || C.H !== H) build(W, H);
    const { s, base, chan, tiles, over, F, fx } = C;
    const u = frac(t / loop);
    const NF = Math.round(24 * loop);
    const fi = Math.floor(u * NF + 1e-6) % NF; // 乱れ時計（24 コマ/秒）
    const I = intensity(u, fi);
    const R = (k) => rnd(fi, k, 31);

    // 1) 元の映像（色ずれ）
    fx.globalCompositeOperation = 'source-over';
    if (I > 0.05) {
      fx.fillStyle = '#000'; fx.fillRect(0, 0, W, H);
      fx.globalCompositeOperation = 'lighter';
      const amp = (4 + I * 28) * s;
      const dy = I > 0.8 ? (R(9) - 0.5) * 6 * s : 0;
      fx.drawImage(chan[0], Math.round((R(1) * 0.6 + 0.4) * amp), dy);
      fx.drawImage(chan[1], 0, 0);
      fx.drawImage(chan[2], -Math.round((R(2) * 0.6 + 0.4) * amp), -dy);
      fx.globalCompositeOperation = 'source-over';
    } else {
      fx.drawImage(base, 0, 0);
    }
    // 静かな間にもゆっくり下りる細い走査の光（loop 秒で2周）。細くして書き出しを軽く保つ
    const hy = frac(u * 2) * (H * 1.2) - H * 0.1, th = 26 * s;
    const hg = fx.createLinearGradient(0, hy - th, 0, hy);
    hg.addColorStop(0, 'rgba(120,220,255,0)'); hg.addColorStop(1, 'rgba(120,220,255,0.10)');
    fx.fillStyle = hg; fx.fillRect(0, hy - th, W, th);
    fx.fillStyle = 'rgba(170,235,255,0.22)'; fx.fillRect(0, hy, W, Math.max(1, Math.round(1.5 * s)));

    // 2) 縦のロール（激しいときだけ）
    ctx.globalCompositeOperation = 'source-over';
    let roll = 0;
    if (I > 0.75 && R(40) < 0.6) roll = Math.round((R(41) - 0.5) * H * 0.5);
    if (roll) { ctx.drawImage(F, 0, roll); ctx.drawImage(F, 0, roll - Math.sign(roll) * H); }
    else ctx.drawImage(F, 0, 0);

    // 画面の下半分が大きく横に裂ける（激しいとき）
    if (I > 0.6 && R(45) < 0.5) {
      const ty = Math.floor((0.3 + R(46) * 0.5) * H), tdx = Math.round((R(47) - 0.5) * W * 0.25);
      ctx.drawImage(F, 0, ty, W, H - ty, tdx, ty, W, H - ty);
      ctx.drawImage(F, 0, ty, W, H - ty, tdx - Math.sign(tdx || 1) * W, ty, W, H - ty);
    }
    // 3) 横にずれる帯
    const nSl = I > 0.05 ? Math.round(2 + I * 16) : (R(50) < 0.06 ? 1 : 0); // 静かな間もまれに1本
    for (let i = 0; i < nSl; i++) {
      const y = Math.floor(R(100 + i) * H);
      const h = Math.max(2, Math.round((I > 0.05 ? 3 + Math.pow(R(200 + i), 2) * (20 + I * 120) : 2 + R(201) * 4) * s));
      const dx = Math.round((R(300 + i) - 0.5) * (I > 0.05 ? 0.04 + I * 0.4 : 0.02) * W);
      ctx.drawImage(F, 0, y, W, h, dx, y, W, h);
      ctx.drawImage(F, 0, y, W, h, dx - Math.sign(dx || 1) * W, y, W, h);
      const k = R(400 + i);
      if (k < 0.45 * I) { // ひとつの色だけさらにずれる（色のにじみ）
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + 0.4 * R(401 + i);
        const ci = [0, 2][Math.floor(R(402 + i) * 2)];
        ctx.drawImage(chan[ci], 0, y, W, h, dx + (R(403 + i) - 0.5) * 80 * s, y, W, h);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      } else if (k > 1 - 0.15 * I && h < 24 * s) { // 反転した帯（細いものだけ）
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'rgba(200,240,255,0.85)'; ctx.fillRect(0, y, W, h);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 4) ブロックノイズ
    const nBl = Math.round(I * I * 70);
    const bs = 16 * s;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < nBl; i++) {
      const bw = Math.round((1 + Math.floor(R(500 + i) * (I > 0.6 ? 12 : 5))) * bs);
      const bh = Math.round((1 + Math.floor(R(600 + i) * 3)) * bs);
      // 塊ごとに帯状に集まるように y を寄せる
      const band = Math.floor(R(700 + (i % 4)) * H / bs) * bs;
      const x = Math.floor(R(800 + i) * W / bs) * bs;
      const y = Math.round(band + Math.floor((R(900 + i) - 0.5) * 6) * bs);
      const k = R(1000 + i);
      if (k < 0.45) { // 別の場所の絵が紛れこむ
        const sx = Math.floor(R(1100 + i) * (W - bw)), sy = Math.floor(R(1200 + i) * (H - bh));
        ctx.drawImage(F, sx, sy, bw, bh, x, y, bw, bh);
      } else if (k < 0.75) { // 粗い色ノイズ
        const tl = tiles[Math.floor(R(1300 + i) * tiles.length)];
        const tx = Math.floor(R(1400 + i) * 48), ty = Math.floor(R(1500 + i) * 24);
        ctx.drawImage(tl, tx, ty, Math.max(1, Math.round(bw / (4 * s * 4))), Math.max(1, Math.round(bh / (4 * s * 4))), x, y, bw, bh);
      } else { // 単色の塊
        ctx.globalAlpha = 0.55 + 0.45 * R(1600 + i);
        ctx.fillStyle = k < 0.88 ? CH[Math.floor(R(1700 + i) * CH.length)] : '#000';
        ctx.fillRect(x, y, bw, bh);
        ctx.globalAlpha = 1;
      }
    }
    // 5) 砂嵐の帯（中くらい以上）
    if (I > 0.4) {
      const n = I > 0.8 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const y = Math.floor(R(1800 + i) * H), h = Math.round((8 + R(1900 + i) * 40) * s);
        ctx.globalAlpha = 0.5 + 0.4 * I;
        ctx.drawImage(tiles[Math.floor(R(2000 + i) * tiles.length)], 0, Math.floor(R(2100 + i) * 30), 64, 2 + Math.floor(R(2200 + i) * 4), 0, y, W, h);
        ctx.globalAlpha = 1;
      }
    }
    // 6) 激しいときの白い細線とちらつき
    if (I > 0.7) {
      for (let i = 0; i < 4; i++) {
        if (R(2300 + i) < 0.5) continue;
        ctx.fillStyle = `rgba(230,250,255,${0.5 + 0.5 * R(2400 + i)})`;
        ctx.fillRect(0, Math.floor(R(2500 + i) * H), W, Math.max(1, Math.round((1 + R(2600 + i) * 2) * s)));
      }
      if (R(2700) < 0.25) { ctx.fillStyle = 'rgba(200,240,255,0.10)'; ctx.fillRect(0, 0, W, H); }
    }
    ctx.imageSmoothingEnabled = true;
    // 7) 走査線・ビネット
    ctx.drawImage(over, 0, 0);
  }
  window.FX = { draw };
})();
