// サイバー：ターミナル画面の背景（不透明・ループ）。
// 黒〜濃紺の画面の左上と右下の領域に、01（まれに16進やコマンド風の行）が絶え間なく打ち込まれ、上へスクロールしていく。
// コマンド行は1文字ずつ打たれてカーソルが点滅し、そのあと出力（01の行）が速く流れ出る。中央は空けておく。
// 薄い走査線・画面の縁のビネット。
// ループ：各領域の行の並びは「loop 秒でちょうど一周する」ように、行ごとの時間を合計 loop 秒にそろえてある。
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
  const HEX = '0123456789ABCDEF';

  const COL = { bin: '#3dff8e', hex: '#2fc7a0', cmd: '#eafff2', ok: '#8affc0', dim: '#1f8f55' };
  const CMDS = [
    r => `trace --node ${hx(r, 2)}`, r => `decrypt sector_${hx(r, 2)}`, r => `sync --force ${hx(r, 4)}`,
    r => `ping 10.0.${(r * 97 | 0) % 255}.${(r * 7919 | 0) % 255}`, r => `inject payload_${hx(r, 3)}.bin`,
    r => `scan 0x${hx(r, 4)}..0x${hx(r * 3.7, 4)}`, r => `mount /dev/sd${'abcd'[(r * 4) | 0]}`, r => `link --route ${hx(r, 2)}:${hx(r * 5.1, 2)}`,
    r => `dump -x 0x${hx(r, 6)}`, r => `auth --key ****${hx(r, 2)}`,
  ];
  function hx(r, n) { let s = ''; for (let i = 0; i < n; i++) s += HEX[hash32(r * 1e6 | 0, i, 5) & 15]; return s; }
  function bits(seed, n) { let s = ''; for (let i = 0; i < n; i++) s += hash32(seed, i, 3) & 1; return s; }

  // 1行を作る。kind: cmd（1文字ずつ打つ）/ out（速く出る）
  function makeLine(seed, j, maxC, cmdNext) {
    const r = rnd(seed, j, 1);
    if (cmdNext) {
      const f = CMDS[Math.floor(rnd(seed, j, 2) * CMDS.length)];
      const text = '> ' + f(rnd(seed, j, 3));
      return { kind: 'cmd', text, col: COL.cmd, type: (text.length - 2) / 26, pause: 0.45 + rnd(seed, j, 4) * 0.35, pre: 2 };
    }
    let text, col = COL.bin;
    if (r < 0.58) { // 8桁の01の組
      const g = 3 + Math.floor(rnd(seed, j, 5) * 3);
      text = []; for (let k = 0; k < g; k++) text.push(bits(seed * 977 + j * 13 + k, 8));
      text = text.join(' ');
    } else if (r < 0.72) { // アドレス＋01
      text = '0x' + hx(rnd(seed, j, 6), 4) + '  ' + bits(seed * 31 + j, 8) + ' ' + bits(seed * 37 + j, 8) + ' ' + bits(seed * 41 + j, 8);
      col = COL.bin;
    } else if (r < 0.82) { // 16進ダンプ
      const g = 6 + Math.floor(rnd(seed, j, 7) * 7);
      text = []; for (let k = 0; k < g; k++) text.push(hx(rnd(seed * 7 + k, j, 8), 2));
      text = text.join(' '); col = COL.hex;
    } else if (r < 0.96) { // つながった01の長い列
      text = bits(seed * 53 + j, 24 + Math.floor(rnd(seed, j, 9) * (maxC - 26)));
    } else { // 状態表示
      text = rnd(seed, j, 10) < 0.5 ? '[ OK ] ' + bits(seed * 59 + j, 16) : '... ' + bits(seed * 61 + j, 8) + ' done';
      col = COL.ok;
    }
    if (text.length > maxC) text = text.slice(0, maxC);
    return { kind: 'out', text, col, type: text.length / 420, pause: 0.03 + rnd(seed, j, 11) * 0.09, pre: 0 };
  }

  // 領域の行の並び（合計 loop 秒にそろえる）
  function makeSeq(seed, loop, maxC) {
    const lines = []; let total = 0, j = 0, left = 0;
    while (total < loop || left > 0) {
      const cmdNext = left <= 0;
      const L = makeLine(seed, j, maxC, cmdNext);
      if (cmdNext) left = 7 + Math.floor(rnd(seed, j, 20) * 10);
      else left--;
      lines.push(L); total += L.type + L.pause; j++;
      if (j > 400) break;
    }
    const k = loop / total; let st = 0;
    for (const L of lines) { L.type *= k; L.pause *= k; L.start = st; st += L.type + L.pause; }
    return lines;
  }

  let C = null;
  function build(W, H, loop) {
    const s = H / 720;
    const fs = Math.round(16 * s), lh = Math.round(fs * 1.38);
    const g = mk(10, 10).getContext('2d'); g.font = `${fs}px monospace`;
    const cw = g.measureText('0').width;
    const rw = Math.round(520 * s), rows = 13, rh = rows * lh + Math.round(8 * s);
    const maxC = Math.floor((rw - 10 * s) / cw);
    const m = Math.round(34 * s);
    const regions = [
      { x: m, y: m, w: rw, h: rh, seq: makeSeq(11, loop, maxC), fade: 'right' },
      { x: W - m - rw, y: H - m - rh, w: rw, h: rh, seq: makeSeq(29, loop, maxC), fade: 'left' },
    ];
    // 背景
    const bg = mk(W, H), b = bg.getContext('2d');
    const rg = b.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
    rg.addColorStop(0, '#071424'); rg.addColorStop(0.6, '#040b15'); rg.addColorStop(1, '#010306');
    b.fillStyle = rg; b.fillRect(0, 0, W, H);
    // 領域のまわりのうすい緑のにじみ
    for (const R of regions) {
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2, gr = b.createRadialGradient(cx, cy, 0, cx, cy, R.w * 0.75);
      gr.addColorStop(0, 'rgba(40,200,120,0.07)'); gr.addColorStop(1, 'rgba(40,200,120,0)');
      b.fillStyle = gr; b.fillRect(0, 0, W, H);
    }
    // 領域のうすい枠（角だけ）
    b.strokeStyle = 'rgba(61,255,142,0.22)'; b.lineWidth = Math.max(1, 1.5 * s);
    for (const R of regions) {
      const p = 10 * s, L = 18 * s;
      const x0 = R.x - p, y0 = R.y - p, x1 = R.x + R.w + p, y1 = R.y + R.h + p;
      b.beginPath();
      b.moveTo(x0, y0 + L); b.lineTo(x0, y0); b.lineTo(x0 + L, y0);
      b.moveTo(x1 - L, y0); b.lineTo(x1, y0); b.lineTo(x1, y0 + L);
      b.moveTo(x0, y1 - L); b.lineTo(x0, y1); b.lineTo(x0 + L, y1);
      b.moveTo(x1 - L, y1); b.lineTo(x1, y1); b.lineTo(x1, y1 - L);
      b.stroke();
    }
    // 走査線＋ビネット
    const over = mk(W, H), o = over.getContext('2d');
    const sp = Math.max(2, Math.round(3 * s));
    o.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < H; y += sp) o.fillRect(0, y, W, Math.max(1, Math.round(sp / 3)));
    const vg = o.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    o.fillStyle = vg; o.fillRect(0, 0, W, H);
    // 領域の文字を描く作業用
    const work = mk(rw + Math.round(40 * s), rh + Math.round(40 * s));
    C = { W, H, loop, s, fs, lh, cw, rows, regions, bg, over, work, pad: Math.round(20 * s) };
  }

  function drawRegion(ctx, R, t, loop) {
    const { s, fs, lh, cw, rows, work, pad } = C;
    const seq = R.seq, N = seq.length;
    const tt = frac(t / loop) * loop;
    // いまの行
    let i = 0; while (i < N - 1 && seq[i + 1].start <= tt) i++;
    const cur = seq[i], el = tt - cur.start;
    const shown = cur.kind === 'cmd' ? cur.pre + Math.floor(clamp(el / cur.type) * (cur.text.length - cur.pre)) : Math.floor(clamp(el / cur.type) * cur.text.length);
    const typing = el < cur.type;
    const w = work.getContext('2d');
    w.setTransform(1, 0, 0, 1, 0, 0); w.clearRect(0, 0, work.width, work.height);
    w.font = `${fs}px monospace`; w.textBaseline = 'top';
    w.shadowBlur = 9 * s;
    for (let r = 0; r < rows; r++) {
      const li = ((i - (rows - 1 - r)) % N + N) % N;
      const L = seq[li];
      const age = rows - 1 - r; // 0 = いまの行
      let text = age === 0 ? L.text.slice(0, shown) : L.text;
      const y = pad + Math.round(4 * s) + r * lh;
      w.globalAlpha = age === 0 ? 1 : clamp(0.95 - age * 0.055);
      w.shadowColor = L.col; w.fillStyle = L.col;
      w.fillText(text, pad, y);
      if (age === 0) {
        // カーソル：打っている間は点いたまま、止まると点滅（0.5秒周期＝loop を割り切る）
        const on = typing || frac(tt / 0.5) < 0.5;
        if (on) {
          w.globalAlpha = 1; w.shadowColor = COL.cmd; w.fillStyle = COL.cmd;
          w.fillRect(pad + Math.round(text.length * cw) + 1, y + Math.round(fs * 0.05), Math.round(cw), Math.round(fs * 1.05));
        }
      }
    }
    w.shadowBlur = 0; w.globalAlpha = 1;
    // 中央側を薄くする
    w.globalCompositeOperation = 'destination-in';
    const gx = R.fade === 'right' ? w.createLinearGradient(pad, 0, pad + R.w, 0) : w.createLinearGradient(pad + R.w, 0, pad, 0);
    const k0 = R.fade === 'right' ? 0.62 : 0.85;
    gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(k0, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0.3)');
    w.fillStyle = gx; w.fillRect(0, 0, work.width, work.height);
    if (R.fade === 'left') { // 右下の領域は上（中央側）も薄く
      const gy = w.createLinearGradient(0, pad, 0, pad + R.h * 0.55);
      gy.addColorStop(0, 'rgba(0,0,0,0.25)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
      w.fillStyle = gy; w.fillRect(0, 0, work.width, work.height);
    }
    w.globalCompositeOperation = 'source-over';
    ctx.drawImage(work, R.x - pad, R.y - pad);
  }

  function draw(ctx, W, H, t, opt = {}) {
    const loop = opt.loop || 8;
    if (!C || C.W !== W || C.H !== H || C.loop !== loop) build(W, H, loop);
    ctx.drawImage(C.bg, 0, 0);
    for (const R of C.regions) drawRegion(ctx, R, t, loop);
    ctx.drawImage(C.over, 0, 0);
  }
  window.FX = { draw };
})();
