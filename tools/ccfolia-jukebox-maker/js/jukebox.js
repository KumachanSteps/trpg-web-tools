/* KPレス・ジュークボックスメーカー — ジュークボックス部屋のテンプレート
 * 設定（曲名・色・BGM）から、シーンとマーカーパネルと画像を組み立てる。
 * 盤面の座標はココフォリアのマス単位。原点は盤面の中央。 */
(function (global) {
  'use strict';

  const ASSET_VER = '20261105-01';
  const CELL_PX = 24;
  const FIELD = { width: 72, height: 36 };

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
    { id: 'gray', line: '#b0b0b0' },
    { id: 'brown', line: '#a0683e' },
    { id: 'navy', line: '#4a5c9e' }
  ];
  const colorOf = id => COLORS.find(c => c.id === id) || COLORS[0];

  // プレーヤー画像の中のターンテーブル中心（画像幅・高さに対する割合）と、レコードを置く大きさ
  const PLATTER = { cx: 0.413, cy: 0.4625, size: 0.625 };
  const PLAYER = { x: -34, y: -12, size: 20 };
  // プレーヤーは3枚重ね: 本体（アームなし）→ レコード → トーンアーム。アームの画像はプレーヤーの左上からのマス位置
  const TONEARM = { x: 11, y: 2.25, width: 7.5, height: 13.75 };

  // ジャケット（sleeve.png 538×520）と、棚のスロット画像（ジャケット＋はみ出したレコード＋曲名）
  const SLEEVE = { w: 538, h: 520, inset: 4 };
  const SLOT = { w: 336, h: 340, coverH: 256, peek: 0.3 };
  // ジャケットなしのスロット（レコード＋曲名）
  const BARE = { w: 272, h: 340, disk: 252 };
  // ジャケットの見本デザイン
  const COVER_STYLES = ['plain', 'tint', 'gradient', 'stripes', 'sunburst', 'dots', 'rings'];

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

  // BGMの曲名（空欄なら表示しない）
  const bgmTitle = d => String((d && d.bgm) || '').trim();

  /* ---------- 並べ方 ---------- */

  function slotLayout(n, bare) {
    const area = { x: -10, y: -16, w: 44, h: 32 };
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const gapX = 1.5;
    const gapY = 1;
    // スロット画像は 幅:高さ = SLOT.w:SLOT.h（ジャケットからレコードが3割はみ出す分、横長）
    const ratio = bare ? BARE.h / BARE.w : SLOT.h / SLOT.w;
    const w = Math.min((area.w - gapX * (cols - 1)) / cols, ((area.h - gapY * (rows - 1)) / rows) / ratio);
    const h = w * ratio;
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

  const plateRect = () => ({ x: PLAYER.x, y: PLAYER.y + PLAYER.size + 1, width: PLAYER.size, height: 5 });

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

  /* ---------- ジャケット ---------- */

  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const shade = (hex, k) => { const [r, g, b] = hexToRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))); return `rgb(${r},${g},${b})`; };

  // 見本デザインを w×h に描く（ラベルの色を使う）
  function drawPattern(ctx, w, h, style, hex) {
    const dark = shade(hex, -0.55);
    if (style === 'tint') {
      ctx.fillStyle = hex;
      ctx.fillRect(0, 0, w, h);
    } else if (style === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, shade(hex, 0.35));
      g.addColorStop(1, dark);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (style === 'stripes') {
      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(0, 0, w, h);
      const bands = [hex, dark, shade(hex, 0.3)];
      const bh = h * 0.09;
      bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, h * 0.58 + i * bh * 1.25, w, bh); });
    } else if (style === 'sunburst') {
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hex;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const R = Math.hypot(w, h);
      for (let i = 0; i < 24; i += 2) {
        const a0 = (i / 24) * Math.PI * 2;
        const a1 = ((i + 1) / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
        ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R);
        ctx.closePath();
        ctx.fill();
      }
    } else if (style === 'dots') {
      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hex;
      const step = w / 9;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === 'rings') {
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = w * 0.035;
      for (let i = 1; i <= 7; i += 1) {
        ctx.strokeStyle = i % 2 ? hex : shade(hex, 0.4);
        ctx.beginPath();
        ctx.arc(w * 0.32, h * 0.68, i * w * 0.08, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /* cover = { style: 'plain' | COVER_STYLES | 'image', image: dataURL }
   * ジャケットの紙の形に絵を重ね、紙の質感と縁の影を残す */
  async function makeCover(cover, hex) {
    const sleeve = await loadImage(assetUrl('sleeve.png'));
    const c = canvas(SLEEVE.w, SLEEVE.h);
    const ctx = c.getContext('2d');
    ctx.drawImage(sleeve, 0, 0);
    const style = cover && cover.style ? cover.style : 'plain';
    if (style === 'plain') return c;
    const art = canvas(SLEEVE.w, SLEEVE.h);
    const actx = art.getContext('2d');
    const i = SLEEVE.inset;
    if (style === 'image' && cover.image) {
      try {
        const img = await loadImage(cover.image);
        actx.drawImage(img, 0, 0, SLEEVE.w, SLEEVE.h);
      } catch (error) { return c; }
    } else {
      actx.save();
      actx.translate(i, i);
      drawPattern(actx, SLEEVE.w - i * 2, SLEEVE.h - i * 2, style, hex);
      actx.restore();
    }
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(art, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(sleeve, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(sleeve, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  // 棚のスロット: ジャケットの右から、レコードを直径の3割だけ見せる。empty はレコードなし
  async function drawSlot(diskImg, coverCanvas, name, sub, color, empty) {
    if (!coverCanvas) return drawBare(diskImg, name, sub, color, empty);
    const c = canvas(SLOT.w, SLOT.h);
    const ctx = c.getContext('2d');
    const ch = SLOT.coverH;
    const cw = Math.round(ch * SLEEVE.w / SLEEVE.h);
    const D = Math.round(ch * 0.94);
    if (!empty) ctx.drawImage(diskImg, Math.round(cw - D * (1 - SLOT.peek)), Math.round((ch - D) / 2) + 2, D, D);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 3;
    ctx.globalAlpha = empty ? 0.55 : 1;
    ctx.drawImage(coverCanvas, 0, 2, cw, ch);
    ctx.restore();
    drawCaption(ctx, SLOT.w, ch, name, sub, color, empty);
    return c;
  }

  // ジャケットなし: レコードだけ。empty は点線の丸
  function drawBare(diskImg, name, sub, color, empty) {
    const c = canvas(BARE.w, BARE.h);
    const ctx = c.getContext('2d');
    const D = BARE.disk;
    const x = (BARE.w - D) / 2;
    if (empty) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(244,234,216,0.45)';
      ctx.beginPath();
      ctx.arc(BARE.w / 2, 2 + D / 2, D / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(diskImg, x, 2, D, D);
      ctx.restore();
    }
    drawCaption(ctx, BARE.w, D, name, sub, color, empty);
    return c;
  }

  // 曲名プレート（テーマ＋BGMの曲名）
  function drawCaption(ctx, w, ch, name, sub, color, empty) {
    const ph = sub ? 72 : 38;
    roundRect(ctx, 8, ch + 8, w - 16, ph, 10);
    ctx.fillStyle = empty ? 'rgba(20,16,12,0.55)' : 'rgba(20,16,12,0.9)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color.line;
    ctx.globalAlpha = empty ? 0.45 : 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f4ead8';
    fitText(ctx, name, w - 40, 25, SANS, 800);
    ctx.fillText(name, w / 2, ch + (sub ? 29 : 28));
    if (sub) {
      ctx.fillStyle = '#c9b994';
      fitText(ctx, sub, w - 40, 19, SANS, 600);
      ctx.fillText(sub, w / 2, ch + 59);
    }
    ctx.globalAlpha = 1;
  }


  async function makeSlot(diskImg, coverCanvas, name, sub, color, empty) {
    return toBlob(await drawSlot(diskImg, coverCanvas, name, sub, color, empty));
  }

  // 設定欄の見本用
  async function slotPreview(disk, showCover = true) {
    const color = colorOf(disk.color);
    // ジャケットありはジャケットだけ（レコードだけの見本と同じくらいの大きさに見せる）
    if (showCover) return makeCover(disk.cover, color.line);
    const diskImg = await loadImage(assetUrl(`disk-${disk.color}.png`));
    return drawSlot(diskImg, null, disk.name, bgmTitle(disk), color, false);
  }

  // プレーヤーの下の札: 見出し（NOW PLAYING / STOP）・テーマ・BGMの曲名
  async function makePlate(label, name, color, sub) {
    const c = canvas(480, 120);
    const ctx = c.getContext('2d');
    roundRect(ctx, 4, 4, 472, 112, 14);
    ctx.fillStyle = 'rgba(16,12,9,0.92)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(40, 60, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b8a888';
    ctx.font = `700 16px ${SANS}`;
    ctx.fillText(label, 66, sub ? 24 : 34);
    ctx.fillStyle = '#f6ecd9';
    fitText(ctx, name, 390, 36, FONT, 700);
    ctx.fillText(name, 66, sub ? 56 : 70);
    if (sub) {
      ctx.fillStyle = '#c9b994';
      fitText(ctx, `♪ ${sub}`, 390, 22, SANS, 600);
      ctx.fillText(`♪ ${sub}`, 66, 92);
    }
    return toBlob(c);
  }

  const asset = blob => ({ blob, type: 'image/png' });


  /* ---------- 組み立て ---------- */

  /* settings = { roomName, stopName, playingLabel, stopLabel, showCover, disks: [{ color, name, bgm, url, file }] }
   * 戻り値: CCFOLIAの書き出し用の room と、画面表示用の model */
  async function build(settings) {
    const disks = settings.disks;
    const diskImgs = await Promise.all(disks.map(d => loadImage(assetUrl(`disk-${d.color}.png`))));
    const blobOf = name => fetch(assetUrl(name)).then(r => r.blob());
    const [playerBlob, armRestBlob, armDropBlob] = await Promise.all([blobOf('player-base.png'), blobOf('tonearm-rest.png'), blobOf('tonearm-drop.png')]);
    const showCover = settings.showCover !== false;
    const layout = slotLayout(disks.length, !showCover);
    const background = asset(await makeBackground(layout.shelf));
    const onPlayer = diskOnPlayer();
    const plate = plateRect();

    // 再生中のレコードはラベルが回るAPNG
    const spinBlobs = await Promise.all(disks.map(d => blobOf(`disk-${d.color}-spin.png`)));
    const covers = await Promise.all(disks.map(d => (showCover ? makeCover(d.cover, colorOf(d.color).line) : null)));
    const slotBlobs = await Promise.all(disks.map((d, i) => makeSlot(diskImgs[i], covers[i], d.name, bgmTitle(d), colorOf(d.color), false)));
    const emptyBlobs = await Promise.all(disks.map((d, i) => makeSlot(diskImgs[i], covers[i], d.name, bgmTitle(d), colorOf(d.color), true)));
    const stopPlate = asset(await makePlate(settings.stopLabel, settings.stopName, '#8b7d66'));
    const playPlates = await Promise.all(disks.map(d => makePlate(settings.playingLabel, d.name, colorOf(d.color).line, bgmTitle(d))));

    const player = { ...PLAYER, width: PLAYER.size, height: PLAYER.size, z: 10, text: '', image: asset(playerBlob), action: '', role: 'player' };
    delete player.size;
    const arm = { x: PLAYER.x + TONEARM.x, y: PLAYER.y + TONEARM.y, width: TONEARM.width, height: TONEARM.height, z: 40, text: '' };
    const armRest = asset(armRestBlob);
    const armDrop = asset(armDropBlob);

    const sceneOf = (name, playingIndex) => {
      const markers = [player];
      if (playingIndex >= 0) {
        markers.push({ ...onPlayer, z: 30, text: disks[playingIndex].name, image: asset(spinBlobs[playingIndex]), action: `/scene ${settings.stopName}`, role: 'onPlayer', color: disks[playingIndex].color });
        // 針が下りるAPNG（1回だけ再生）。アームを押しても停止する
        markers.push({ ...arm, image: armDrop, action: `/scene ${settings.stopName}`, role: 'arm', restart: true, color: disks[playingIndex].color });
        markers.push({ ...plate, z: 20, text: '', image: asset(playPlates[playingIndex]), action: '', role: 'plate' });
      } else {
        markers.push({ ...plate, z: 20, text: '', image: stopPlate, action: '', role: 'plate' });
        markers.push({ ...arm, image: armRest, action: '', role: 'arm' });
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
        ? { name: bgmTitle(d) || d.name, url: file ? '' : url, asset: file ? { blob: file, type: file.type || Ccfolia.typeOfName(file.name) || 'audio/mpeg' } : null, volume: 0.5, repeat: true }
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

  global.Jukebox = { MAX_DISKS: 12, COLORS, COVER_STYLES, SLEEVE, colorOf, FIELD, build, assetUrl, makeCover, slotPreview, drawPattern, loadImage };
})(window);
