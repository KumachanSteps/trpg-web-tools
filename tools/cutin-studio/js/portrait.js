/*
 * カットイン作成スタジオ — 立ち絵の読み込み
 *   ・白い背景の立ち絵は、背景を消して透過にする（外周からつながる白と、髪のすき間などの閉じた白）
 *   ・顔の位置と大きさを推定する（アニメ絵は普通の顔検出が効きにくいので、立ち絵の形と肌色から推定）
 *   ・このブラウザの IndexedDB にだけ保存する（どこにも送信しない）
 */
const MAX_SIDE = 2048;

export async function loadImageFile(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  return c;
}

/** 透過している画素があるか（四隅と縁を調べる） */
export function hasTransparency(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let n = 0, clear = 0;
  const step = Math.max(1, Math.floor((w + h) / 400));
  const look = (x, y) => { n++; if (d[(y * w + x) * 4 + 3] < 250) clear++; };
  for (let x = 0; x < w; x += step) { look(x, 0); look(x, h - 1); }
  for (let y = 0; y < h; y += step) { look(0, y); look(w - 1, y); }
  return clear / n > 0.3;
}

/** 縁がほぼ白か（白い背景の立ち絵か） */
export function looksWhiteBackground(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let n = 0, white = 0;
  const step = Math.max(1, Math.floor((w + h) / 400));
  const look = (x, y) => { const i = (y * w + x) * 4; n++; if (Math.min(d[i], d[i + 1], d[i + 2]) > 235) white++; };
  for (let x = 0; x < w; x += step) { look(x, 0); look(x, h - 1); }
  for (let y = 0; y < h; y += step) { look(0, y); look(w - 1, y); }
  return white / n > 0.8;
}

/**
 * 白い背景を消す。
 *   1. 外周からつながる「ほぼ白」を背景にする
 *   2. 閉じた「真っ白」の領域のうち、大きいもの（腕と体のすき間など）と、上のほう（髪のすき間）にあるものも背景にする
 *      （服のつやなどの小さな白は残す）
 *   3. 縁を1px削って少しぼかし、白いにじみを取る
 */
export function removeWhiteBackground(canvas, tolerance = 28) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const N = w * h;
  const dist = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const j = i * 4; dist[i] = 255 - Math.min(d[j], d[j + 1], d[j + 2]); }
  const bg = new Uint8Array(N), seen = new Uint8Array(N);
  const queue = new Int32Array(N);
  const flood = (seeds, test, mark) => {
    let qh = 0, qt = 0;
    for (const s of seeds) if (!seen[s] && test(s)) { seen[s] = 1; queue[qt++] = s; }
    const comp = [];
    while (qh < qt) {
      const p = queue[qh++]; comp.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && !seen[p - 1] && test(p - 1)) { seen[p - 1] = 1; queue[qt++] = p - 1; }
      if (x < w - 1 && !seen[p + 1] && test(p + 1)) { seen[p + 1] = 1; queue[qt++] = p + 1; }
      if (y > 0 && !seen[p - w] && test(p - w)) { seen[p - w] = 1; queue[qt++] = p - w; }
      if (y < h - 1 && !seen[p + w] && test(p + w)) { seen[p + w] = 1; queue[qt++] = p + w; }
    }
    if (mark) for (const p of comp) bg[p] = 1;
    return comp;
  };
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
  flood(edge, p => dist[p] < tolerance && d[p * 4 + 3] > 0, true);
  const big = Math.max(400, Math.round(N * 0.0012)), small = Math.max(12, Math.round(N * 0.000025));
  const topLimit = h * 0.22;
  for (let p = 0; p < N; p++) {
    if (seen[p] || dist[p] >= 10) continue;
    const comp = flood([p], q => dist[q] < 10, false);
    let sy = 0; for (const q of comp) sy += (q / w) | 0;
    const cy = sy / comp.length;
    if (comp.length >= big || (comp.length >= small && cy < topLimit)) for (const q of comp) bg[q] = 1;
  }
  // 1px 削る
  const alpha = new Uint8Array(N);
  for (let p = 0; p < N; p++) {
    if (bg[p]) continue;
    const x = p % w, y = (p / w) | 0;
    if ((x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w])) continue;
    alpha[p] = 255;
  }
  // 3×3 で少しぼかして、白を引いて色を戻す
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    let s = 0, n = 0;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) { s += alpha[yy * w + xx]; n++; }
    const a = s / n / 255, j = p * 4;
    if (a <= 0) { d[j + 3] = 0; continue; }
    const k = Math.max(0.05, a);
    for (let c = 0; c < 3; c++) d[j + c] = Math.max(0, Math.min(255, (d[j + c] - 255 * (1 - k)) / k));
    d[j + 3] = Math.round(a * (d[j + 3]));
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * 顔の位置（中心）と幅を推定する。
 *   立ち絵のいちばん上（頭のてっぺん）から下の帯で、肌色の画素の重心を顔の中心とみなす。
 *   肌色が見つからないときは、頭の形の中心を使う。
 */
export function estimateFace(canvas) {
  const w = canvas.width, h = canvas.height;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  let top = -1, bottom = -1, left = w, right = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) {
    if (d[(y * w + x) * 4 + 3] > 128) { if (top < 0) top = y; bottom = y; if (x < left) left = x; if (x > right) right = x; }
  }
  if (top < 0) return { x: w / 2, y: h * 0.3, w: w * 0.3 };
  const bh = bottom - top + 1;
  // 全身の立ち絵（縦長）なら顔は小さく、バストアップなら大きい
  const tall = bh / Math.max(1, right - left) > 1.6;
  const band = Math.round(bh * (tall ? 0.16 : 0.45));
  // 頭の横の中心：上から band の範囲で、行ごとの不透明な範囲の中心の中央値
  const centers = [];
  for (let y = top; y < top + band && y < h; y += 2) {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) { if (a < 0) a = x; b = x; }
    if (a >= 0) centers.push((a + b) / 2);
  }
  centers.sort((p, q) => p - q);
  const headX = centers.length ? centers[centers.length >> 1] : (left + right) / 2;
  const reach = band * 0.9;
  let sx = 0, sy = 0, n = 0;
  const xs = [];
  for (let y = top; y < top + band && y < h; y += 2) for (let x = Math.max(0, Math.round(headX - reach)); x < Math.min(w, headX + reach); x += 2) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 200) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // 肌色：赤が強く、赤 > 緑 > 青、明るめ
    if (r > 150 && r > g && g > b && r - b > 25 && r - b < 130 && g > 90) { sx += x; sy += y; n++; xs.push(x); }
  }
  if (n > 50) {
    // 幅は肌色の横の広がりの 10〜90% の範囲（耳や首、手などの外れ値を除く）
    xs.sort((p, q) => p - q);
    const span = xs[Math.floor(xs.length * 0.9)] - xs[Math.floor(xs.length * 0.1)];
    const fw = Math.max(band * 0.3, Math.min(band * 0.9, span * 1.1));
    // 肌色の重心は目の高さに寄りやすいので、少し下げて顔の真ん中にする
    return { x: sx / n, y: sy / n + fw * 0.12, w: fw };
  }
  return { x: headX, y: top + band * 0.55, w: band * 0.6 };
}

/* ---------- IndexedDB（このブラウザだけ） ---------- */
const DB = 'cutinStudio', STORE = 'portraits';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function savePortrait(key, record) {
  try {
    const d = await db();
    await new Promise((res, rej) => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(record, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  } catch (e) { console.warn('savePortrait', e); }
}
export async function loadPortrait(key) {
  try {
    const d = await db();
    return await new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); });
  } catch (e) { return null; }
}
export async function deletePortrait(key) {
  try {
    const d = await db();
    await new Promise(res => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = res; tx.onerror = res; });
  } catch (e) { /* 消せなくても困らない */ }
}
export function canvasToBlob(canvas) {
  return new Promise(res => canvas.toBlob(res, 'image/png'));
}
