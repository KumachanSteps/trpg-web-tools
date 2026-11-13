/*
 * 演出APNGメーカー — プレビューのステージ（背景・立ち絵・演出レイヤー）
 * ココフォリアと同じ順（背景 → 立ち絵 → 前景の演出）で重ねる。「演出より手前」の立ち絵だけは演出の上に出す。
 * 背景と立ち絵は IndexedDB に保存し、再読み込みしても残る。どこにも送信しない。
 */

const DB_NAME = 'effectApngMakerStage';
const STORE = 'stage';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    return undefined;
  }
}

async function dbSet(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    /* 保存できない環境（プライベートブラウズなど）でも動かす */
  }
}

/* ---------- サンプル背景（コードで描く。外部の画像は使わない） ---------- */

function drawSample(kind, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  if (kind === 'night') {
    const sky = x.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1430');
    sky.addColorStop(0.6, '#253a6b');
    sky.addColorStop(1, '#3b3354');
    x.fillStyle = sky;
    x.fillRect(0, 0, w, h);
    const moon = x.createRadialGradient(w * 0.78, h * 0.2, 0, w * 0.78, h * 0.2, h * 0.16);
    moon.addColorStop(0, 'rgba(255,248,225,1)');
    moon.addColorStop(0.35, 'rgba(255,248,225,0.95)');
    moon.addColorStop(0.42, 'rgba(255,248,225,0.25)');
    moon.addColorStop(1, 'rgba(255,248,225,0)');
    x.fillStyle = moon;
    x.fillRect(0, 0, w, h);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let layer = 0; layer < 2; layer++) {
      x.fillStyle = layer ? '#0a0f1f' : '#18213d';
      let px = -20;
      while (px < w) {
        const bw = w * (0.05 + r() * 0.08);
        const bh = h * (layer ? 0.22 + r() * 0.3 : 0.32 + r() * 0.25);
        x.fillRect(px, h - bh, bw, bh);
        if (layer) {
          x.fillStyle = 'rgba(255,214,140,0.75)';
          for (let wy = h - bh + 12; wy < h - 14; wy += 18) {
            for (let wx = px + 8; wx < px + bw - 10; wx += 14) if (r() < 0.22) x.fillRect(wx, wy, 6, 8);
          }
          x.fillStyle = '#0a0f1f';
        }
        px += bw + w * 0.005;
      }
    }
  } else if (kind === 'room') {
    const wall = x.createLinearGradient(0, 0, 0, h * 0.72);
    wall.addColorStop(0, '#5a4636');
    wall.addColorStop(1, '#7a604a');
    x.fillStyle = wall;
    x.fillRect(0, 0, w, h * 0.72);
    x.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < w; i += w / 28) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h * 0.72); x.stroke(); }
    const floor = x.createLinearGradient(0, h * 0.72, 0, h);
    floor.addColorStop(0, '#3a2a1e');
    floor.addColorStop(1, '#1f150e');
    x.fillStyle = floor;
    x.fillRect(0, h * 0.72, w, h * 0.28);
    x.fillStyle = '#2a1d14';
    x.fillRect(0, h * 0.7, w, h * 0.025);
    const wx = w * 0.12, wy = h * 0.14, ww = w * 0.22, wh = h * 0.42;
    const glass = x.createLinearGradient(wx, wy, wx, wy + wh);
    glass.addColorStop(0, '#9fb7d6');
    glass.addColorStop(1, '#5d7596');
    x.fillStyle = glass;
    x.fillRect(wx, wy, ww, wh);
    x.strokeStyle = '#2a1d14';
    x.lineWidth = Math.max(4, w * 0.008);
    x.strokeRect(wx, wy, ww, wh);
    x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + wh / 2); x.lineTo(wx + ww, wy + wh / 2); x.stroke();
    x.fillStyle = '#c9a45c';
    x.fillRect(w * 0.6, h * 0.18, w * 0.18, h * 0.24);
    x.fillStyle = '#4b3b2c';
    x.fillRect(w * 0.61, h * 0.195, w * 0.16, h * 0.21);
  } else if (kind === 'dark') {
    x.fillStyle = '#2a2d33';
    x.fillRect(0, 0, w, h);
  }
  return c;
}

/* ---------- ステージ ---------- */

export class Stage {
  constructor(root, opts) {
    this.root = root;
    this.onChange = opts.onChange || (() => {});
    this.onPick = null;
    this.bgLayer = root.querySelector('[data-stage-bg]');
    this.backChars = root.querySelector('[data-stage-chars-back]');
    this.frontChars = root.querySelector('[data-stage-chars-front]');
    this.fx = root.querySelector('[data-stage-fx]');
    this.fxCtx = this.fx.getContext('2d');
    this.bg = { kind: 'night', blob: null, image: null };
    this.chars = [];
    this.selected = null;
    this.nextId = 1;
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(root);
  }

  async restore() {
    const saved = await dbGet('stage');
    if (saved) {
      this.bg.kind = saved.bg?.kind || 'night';
      this.bg.blob = saved.bg?.blob || null;
      for (const c of saved.chars || []) await this.addChar(c.blob, c, false);
    }
    await this.applyBg();
  }

  save() {
    dbSet('stage', {
      bg: { kind: this.bg.kind, blob: this.bg.kind === 'upload' ? this.bg.blob : null },
      chars: this.chars.map(c => ({ blob: c.blob, x: c.x, y: c.y, size: c.size, flip: c.flip, front: c.front }))
    });
  }

  resize() {
    const rect = this.root.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(16, Math.round(rect.width * dpr));
    const h = Math.max(9, Math.round(rect.height * dpr));
    if (this.fx.width !== w || this.fx.height !== h) {
      this.fx.width = w;
      this.fx.height = h;
      this.onChange('resize');
    }
    this.layoutChars();
  }

  get previewSize() {
    return { w: this.fx.width, h: this.fx.height };
  }

  async setBackground(kind, blob = null) {
    this.bg.kind = kind;
    if (kind === 'upload') this.bg.blob = blob;
    await this.applyBg();
    this.save();
  }

  async applyBg() {
    const { kind } = this.bg;
    this.root.classList.toggle('is-checker', kind === 'checker');
    this.bgLayer.innerHTML = '';
    this.bg.image = null;
    let source = null;
    if (kind === 'upload' && this.bg.blob) {
      source = await blobToImage(this.bg.blob);
    } else if (kind === 'night' || kind === 'room' || kind === 'dark') {
      source = drawSample(kind, 1280, 720);
    }
    if (source) {
      source.classList.add('stage-bg-image');
      this.bgLayer.appendChild(source);
      this.bg.image = source;
    }
  }

  async addChar(blob, init = {}, select = true) {
    const img = await blobToImage(blob);
    img.className = 'stage-char';
    img.draggable = false;
    const ch = {
      id: this.nextId++, blob, img,
      x: init.x ?? (0.3 + 0.2 * (this.chars.length % 3)),
      y: init.y ?? 1,
      size: init.size ?? 0.85,
      flip: init.flip ?? false,
      front: init.front ?? false
    };
    img.dataset.charId = ch.id;
    this.chars.push(ch);
    this.layoutChars();
    if (select) this.select(ch.id);
    this.save();
    return ch;
  }

  removeChar(id) {
    const i = this.chars.findIndex(c => c.id === id);
    if (i < 0) return;
    this.chars[i].img.remove();
    this.chars.splice(i, 1);
    if (this.selected === id) this.selected = null;
    this.layoutChars();
    this.save();
    this.onChange('chars');
  }

  updateChar(id, patch) {
    const c = this.chars.find(v => v.id === id);
    if (!c) return;
    Object.assign(c, patch);
    this.layoutChars();
    this.save();
  }

  select(id) {
    this.selected = id;
    this.chars.forEach(c => c.img.classList.toggle('is-selected', c.id === id));
    this.onChange('select');
  }

  async clear() {
    this.chars.forEach(c => c.img.remove());
    this.chars = [];
    this.selected = null;
    this.bg = { kind: 'night', blob: null, image: null };
    await this.applyBg();
    this.save();
    this.onChange('chars');
  }

  /** 立ち絵の位置：x は横の中心、y は足元（どちらも 0..1）、size は画面の高さに対する割合 */
  layoutChars() {
    const rect = this.root.getBoundingClientRect();
    for (const c of this.chars) {
      const host = c.front ? this.frontChars : this.backChars;
      if (c.img.parentNode !== host) host.appendChild(c.img);
      const ratio = (c.img.naturalWidth || 1) / (c.img.naturalHeight || 1);
      const hPx = rect.height * c.size;
      const wPx = hPx * ratio;
      c.img.style.height = `${hPx}px`;
      c.img.style.width = `${wPx}px`;
      c.img.style.left = `${c.x * rect.width - wPx / 2}px`;
      c.img.style.top = `${c.y * rect.height - hPx}px`;
      c.img.style.transform = c.flip ? 'scaleX(-1)' : '';
    }
  }

  bindPointer() {
    let drag = null;
    const toUnit = e => {
      const rect = this.root.getBoundingClientRect();
      return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
    };
    this.root.addEventListener('pointerdown', e => {
      if (this.onPick) {
        const u = toUnit(e);
        const cb = this.onPick;
        this.onPick = null;
        this.root.classList.remove('is-picking');
        cb({ x: Math.min(1, Math.max(0, u.x)), y: Math.min(1, Math.max(0, u.y)) });
        e.preventDefault();
        return;
      }
      const img = e.target.closest('.stage-char');
      if (!img) return;
      const c = this.chars.find(v => v.id === Number(img.dataset.charId));
      if (!c) return;
      this.select(c.id);
      const u = toUnit(e);
      drag = { c, dx: c.x - u.x, dy: c.y - u.y, id: e.pointerId };
      this.root.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.root.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const u = toUnit(e);
      drag.c.x = Math.min(1.2, Math.max(-0.2, u.x + drag.dx));
      drag.c.y = Math.min(1.6, Math.max(0.1, u.y + drag.dy));
      this.layoutChars();
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      this.save();
      this.onChange('chars');
    };
    this.root.addEventListener('pointerup', end);
    this.root.addEventListener('pointercancel', end);
    this.root.addEventListener('wheel', e => {
      const img = e.target.closest('.stage-char');
      if (!img) return;
      const c = this.chars.find(v => v.id === Number(img.dataset.charId));
      if (!c) return;
      e.preventDefault();
      c.size = Math.min(2, Math.max(0.15, c.size * (e.deltaY < 0 ? 1.05 : 1 / 1.05)));
      this.select(c.id);
      this.layoutChars();
      clearTimeout(this.wheelSave);
      this.wheelSave = setTimeout(() => this.save(), 300);
    }, { passive: false });
  }

  pick(cb) {
    this.onPick = cb;
    this.root.classList.add('is-picking');
  }

  /** 書き出し用：背景（と立ち絵）を出力の大きさで描く。cover 方式で切り取る */
  drawBackground(ctx, w, h) {
    const src = this.bg.image;
    if (!src) return;
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const s = Math.max(w / sw, h / sh);
    ctx.drawImage(src, (w - sw * s) / 2, (h - sh * s) / 2, sw * s, sh * s);
  }

  drawChars(ctx, w, h, front) {
    for (const c of this.chars) {
      if (c.front !== front) continue;
      const ratio = (c.img.naturalWidth || 1) / (c.img.naturalHeight || 1);
      const ch = h * c.size, cw = ch * ratio;
      const x = c.x * w - cw / 2, y = c.y * h - ch;
      ctx.save();
      if (c.flip) { ctx.translate(x + cw, y); ctx.scale(-1, 1); ctx.drawImage(c.img, 0, 0, cw, ch); }
      else ctx.drawImage(c.img, x, y, cw, ch);
      ctx.restore();
    }
  }
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
