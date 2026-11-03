/* KPレス・ジュークボックスメーカー — ジュークボックス部屋のテンプレート
 * 設定（曲名・色・BGM）から、シーンとマーカーパネルと画像を組み立てる。
 * 盤面の座標はココフォリアのマス単位。原点は盤面の中央。 */
(function (global) {
  'use strict';

  const ASSET_VER = '20261103-01';
  const CELL_PX = 24;
  const FIELD = { width: 64, height: 36 };

  // ラベルの色（素材の並び順）。line は線・アクセントの色
  const COLORS = [
    { id: 'cream', line: '#e8d3a8' },
    { id: 'red', line: '#c0483c' },
    { id: 'orange', line: '#e07a3c' },
    { id: 'yellow', line: '#e3b938' },
    { id: 'green', line: '#8a9a56' },
    { id: 'teal', line: '#4f9a96' },
    { id: 'blue', line: '#5a80b8' },
    { id: 'purple', line: '#8a62a8' },
    { id: 'pink', line: '#d98aa0' },
    { id: 'gray', line: '#b0b0b0' }
  ];
  const colorOf = id => COLORS.find(c => c.id === id) || COLORS[0];

  // プレーヤー画像の中のターンテーブル中心（画像幅・高さに対する割合）と、レコードを置く大きさ
  const PLATTER = { cx: 0.413, cy: 0.4625, size: 0.625 };
  const PLAYER = { x: -30, y: -12, size: 20 };

  const imageCache = new Map();
  function loadImage(src) {
    if (!imageCache.has(src)) {
      imageCache.set(src, new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`image: ${src}`));
        img.src = src;
      }));
    }
    return imageCache.get(src);
  }

  const assetUrl = name => `./assets/${name}?v=${ASSET_VER}`;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  const toBlob = c => new Promise(resolve => c.toBlob(resolve, 'image/png'));

  const FONT = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Noto Serif KR", serif';
  const SANS = '"Hiragino Sans", "Noto Sans JP", "Noto Sans KR", "Yu Gothic UI", system-ui, sans-serif';

  function fitText(ctx, text, maxWidth, size, family, weight) {
    let s = size;
    do {
      ctx.font = `${weight || 700} ${s}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      s -= 1;
    } while (s > 10);
    return s;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- 並べ方 ---------- */

  function slotLayout(n) {
    const area = { x: -6, y: -16, w: 36, h: 32 };
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const gapX = 2;
    const gapY = 1;
    // スロット画像は 幅:高さ = 8:9
    const w = Math.min((area.w - gapX * (cols - 1)) / cols, ((area.h - gapY * (rows - 1)) / rows) * (8 / 9));
    const h = w * (9 / 8);
    const totalW = cols * w + (cols - 1) * gapX;
    const totalH = rows * h + (rows - 1) * gapY;
    const x0 = area.x + (area.w - totalW) / 2;
    const y0 = area.y + (area.h - totalH) / 2;
    const r = v => Math.round(v * 4) / 4;
    const slots = [];
    for (let i = 0; i < n; i += 1) {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      const shift = ((cols - inRow) * (w + gapX)) / 2;
      slots.push({ x: r(x0 + shift + (i % cols) * (w + gapX)), y: r(y0 + row * (h + gapY)), width: r(w), height: r(h) });
    }
    return { slots, shelf: { x: x0 - 1.5, y: y0 - 1.5, w: totalW + 3, h: totalH + 3 } };
  }

  function diskOnPlayer() {
    const size = PLAYER.size * PLATTER.size;
    return {
      x: Math.round((PLAYER.x + PLAYER.size * PLATTER.cx - size / 2) * 4) / 4,
      y: Math.round((PLAYER.y + PLAYER.size * PLATTER.cy - size / 2) * 4) / 4,
      width: Math.round(size * 4) / 4,
      height: Math.round(size * 4) / 4
    };
  }

  const plateRect = () => ({ x: PLAYER.x, y: PLAYER.y + PLAYER.size + 1, width: PLAYER.size, height: 4 });

  /* ---------- 画像づくり ---------- */

  async function makeBackground(shelf) {
    const W = FIELD.width * CELL_PX;
    const H = FIELD.height * CELL_PX;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(W * 0.35, H * 0.45, 40, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, '#3a2a20');
    g.addColorStop(0.55, '#21170f');
    g.addColorStop(1, '#0d0907');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 細い木目
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#d9a46b';
    for (let y = 6; y < H; y += 9) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y) * 2);
      ctx.bezierCurveTo(W * 0.3, y + 3, W * 0.7, y - 3, W, y + Math.cos(y) * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // レコード棚
    const px = v => (v + FIELD.width / 2) * CELL_PX;
    const py = v => (v + FIELD.height / 2) * CELL_PX;
    roundRect(ctx, px(shelf.x), py(shelf.y), shelf.w * CELL_PX, shelf.h * CELL_PX, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(214,170,96,0.45)';
    ctx.stroke();
    return toBlob(c);
  }

  async function makeSlot(diskImg, name, color, empty) {
    const c = canvas(256, 288);
    const ctx = c.getContext('2d');
    if (empty) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(128, 116, 104, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color.line;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(128, 116, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(diskImg, 12, 4, 232, 232);
    }
    // 曲名プレート
    roundRect(ctx, 10, 238, 236, 44, 10);
    ctx.fillStyle = empty ? 'rgba(20,16,12,0.55)' : 'rgba(20,16,12,0.9)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color.line;
    ctx.globalAlpha = empty ? 0.45 : 1;
    ctx.stroke();
    ctx.fillStyle = '#f4ead8';
    fitText(ctx, name, 216, 26, SANS, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 261);
    ctx.globalAlpha = 1;
    return toBlob(c);
  }

  async function makePlate(label, name, color) {
    const c = canvas(480, 96);
    const ctx = c.getContext('2d');
    roundRect(ctx, 4, 4, 472, 88, 14);
    ctx.fillStyle = 'rgba(16,12,9,0.92)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(40, 48, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b8a888';
    ctx.font = `700 16px ${SANS}`;
    ctx.fillText(label, 66, 28);
    ctx.fillStyle = '#f6ecd9';
    fitText(ctx, name, 390, 36, FONT, 700);
    ctx.fillText(name, 66, 60);
    return toBlob(c);
  }

  const asset = blob => ({ blob, type: 'image/png' });

  /* ---------- 組み立て ---------- */

  /* settings = { roomName, stopName, playingLabel, stopLabel, disks: [{ color, name, url, file }] }
   * 戻り値: CCFOLIAの書き出し用の room と、画面表示用の model */
  async function build(settings) {
    const disks = settings.disks;
    const [playerImg, ...diskImgs] = await Promise.all([
      loadImage(assetUrl('player.png')),
      ...disks.map(d => loadImage(assetUrl(`disk-${d.color}.png`)))
    ]);
    const playerBlob = await fetch(assetUrl('player.png')).then(r => r.blob());
    const layout = slotLayout(disks.length);
    const background = asset(await makeBackground(layout.shelf));
    const onPlayer = diskOnPlayer();
    const plate = plateRect();

    const diskBlobs = await Promise.all(disks.map(d => fetch(assetUrl(`disk-${d.color}.png`)).then(r => r.blob())));
    const slotBlobs = await Promise.all(disks.map((d, i) => makeSlot(diskImgs[i], d.name, colorOf(d.color), false)));
    const emptyBlobs = await Promise.all(disks.map((d, i) => makeSlot(diskImgs[i], d.name, colorOf(d.color), true)));
    const stopPlate = asset(await makePlate(settings.stopLabel, settings.stopName, '#8b7d66'));
    const playPlates = await Promise.all(disks.map(d => makePlate(settings.playingLabel, d.name, colorOf(d.color).line)));

    const player = { ...PLAYER, width: PLAYER.size, height: PLAYER.size, z: 10, text: '', image: asset(playerBlob), action: '', role: 'player' };
    delete player.size;

    const sceneOf = (name, playingIndex) => {
      const markers = [player];
      if (playingIndex >= 0) {
        markers.push({ ...onPlayer, z: 30, text: disks[playingIndex].name, image: asset(diskBlobs[playingIndex]), action: `/scene ${settings.stopName}`, role: 'onPlayer', color: disks[playingIndex].color });
        markers.push({ ...plate, z: 20, text: '', image: asset(playPlates[playingIndex]), action: '', role: 'plate' });
      } else {
        markers.push({ ...plate, z: 20, text: '', image: stopPlate, action: '', role: 'plate' });
      }
      disks.forEach((d, i) => {
        const slot = layout.slots[i];
        if (i === playingIndex) {
          markers.push({ ...slot, z: 20, text: d.name, image: asset(emptyBlobs[i]), action: '', role: 'empty', color: d.color });
        } else {
          markers.push({ ...slot, z: 20, text: d.name, image: asset(slotBlobs[i]), action: `/scene ${d.name}`, role: 'slot', color: d.color });
        }
      });
      return markers;
    };

    const scenes = [{ name: settings.stopName, text: '', sound: null, markers: sceneOf(settings.stopName, -1), color: '#8b7d66' }];
    disks.forEach((d, i) => {
      const file = d.file || null;
      const url = String(d.url || '').trim();
      const sound = file || url
        ? { name: d.name, url: file ? '' : url, asset: file ? { blob: file, type: file.type || Ccfolia.typeOfName(file.name) || 'audio/mpeg' } : null, volume: 0.5, repeat: true }
        : null;
      scenes.push({ name: d.name, text: '', sound, markers: sceneOf(d.name, i), color: colorOf(d.color).line });
    });

    return {
      name: settings.roomName,
      fieldWidth: FIELD.width,
      fieldHeight: FIELD.height,
      gridSize: 1,
      background,
      startSceneIndex: 0,
      scenes
    };
  }

  global.Jukebox = { COLORS, colorOf, FIELD, build, assetUrl };
})(window);
