/* TRPG室内図メーカー — 家具・アイテムの一覧と描画
 * 描画関数は「ローカル座標（0,0）〜（w,h）、単位はマス」で描く。
 * 向きの約束: 背面（壁に付ける側）が上（y=0）。回転は時計回り 90° 刻み。 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---------- 描画ヘルパー ---------- */

  function rr(c, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rad, y);
    c.lineTo(x + w - rad, y);
    c.arcTo(x + w, y, x + w, y + rad, rad);
    c.lineTo(x + w, y + h - rad);
    c.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    c.lineTo(x + rad, y + h);
    c.arcTo(x, y + h, x, y + h - rad, rad);
    c.lineTo(x, y + rad);
    c.arcTo(x, y, x + rad, y, rad);
    c.closePath();
  }

  function box(c, S, x, y, w, h, r, fill) {
    rr(c, x, y, w, h, r);
    c.fillStyle = fill || S.fill;
    c.fill();
    c.stroke();
  }

  function line(c, x1, y1, x2, y2) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  function circle(c, S, x, y, r, fill, noStroke) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    if (fill !== false) { c.fillStyle = fill || S.fill; c.fill(); }
    if (!noStroke) c.stroke();
  }

  function ellipse(c, S, x, y, rx, ry, fill) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill !== false) { c.fillStyle = fill || S.fill; c.fill(); }
    c.stroke();
  }

  function thin(c, S, factor = 0.6) { c.lineWidth = S.lw * factor; }
  function normal(c, S) { c.lineWidth = S.lw; }

  function dashed(c, S, on) {
    c.setLineDash(on ? [S.lw * 3, S.lw * 2.5] : []);
  }

  function chair(c, S, x, y, w, h) {
    box(c, S, x + w * 0.1, y + h * 0.18, w * 0.8, h * 0.72, w * 0.18);
    thin(c, S);
    box(c, S, x + w * 0.12, y + h * 0.02, w * 0.76, h * 0.22, w * 0.1);
    normal(c, S);
  }

  function label(c, S, text, x, y, size, color) {
    c.save();
    c.fillStyle = color || S.line;
    c.font = `800 ${size}px ${S.font}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.restore();
  }

  /* ---------- 構造 ---------- */

  function stairs(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    const step = 0.5;
    const n = Math.max(2, Math.round(h / step));
    for (let i = 1; i < n; i++) line(c, 0, (h / n) * i, w, (h / n) * i);
    // 上り方向の矢印（下から上へ）
    normal(c, S);
    c.strokeStyle = S.accentLine;
    line(c, w / 2, h - 0.35, w / 2, 0.4);
    c.beginPath();
    c.moveTo(w / 2 - 0.3, 0.8);
    c.lineTo(w / 2, 0.35);
    c.lineTo(w / 2 + 0.3, 0.8);
    c.stroke();
    c.beginPath();
    c.arc(w / 2, h - 0.35, 0.1, 0, TAU);
    c.fillStyle = S.accentLine;
    c.fill();
  }

  function stairsU(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    const land = Math.min(h * 0.4, w * 0.5);
    const half = w / 2;
    line(c, 0, land, w, land);
    line(c, half, land, half, h);
    const n = Math.max(2, Math.round((h - land) / 0.5));
    for (let i = 1; i < n; i++) {
      const y = land + ((h - land) / n) * i;
      line(c, 0, y, w, y);
    }
    normal(c, S);
    c.strokeStyle = S.accentLine;
    c.beginPath();
    c.moveTo(half / 2, h - 0.35);
    c.lineTo(half / 2, land / 2);
    c.lineTo(half + half / 2, land / 2);
    c.lineTo(half + half / 2, h - 0.6);
    c.stroke();
    c.beginPath();
    c.moveTo(half + half / 2 - 0.3, h - 0.95);
    c.lineTo(half + half / 2, h - 0.5);
    c.lineTo(half + half / 2 + 0.3, h - 0.95);
    c.stroke();
  }

  function spiral(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r);
    thin(c, S);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      line(c, w / 2 + Math.cos(a) * r * 0.2, h / 2 + Math.sin(a) * r * 0.2, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    normal(c, S);
    circle(c, S, w / 2, h / 2, r * 0.2, S.soft);
  }

  function elevator(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0, S.soft);
    const m = Math.min(w, h) * 0.12;
    box(c, S, m, m, w - m * 2, h - m * 2, 0);
    thin(c, S);
    line(c, m, m, w - m, h - m);
    line(c, w - m, m, m, h - m);
    normal(c, S);
    line(c, w * 0.3, h - 0.02, w * 0.7, h - 0.02);
  }

  function pillar(c, S, w, h) {
    rr(c, 0, 0, w, h, 0);
    c.fillStyle = S.wall;
    c.fill();
  }

  function fireplace(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0, S.soft);
    box(c, S, w * 0.2, h * 0.15, w * 0.6, h * 0.6, 0.1, S.dark);
    thin(c, S);
    line(c, 0, h * 0.85, w, h * 0.85);
  }

  /* ---------- リビング ---------- */

  function sofa(seats) {
    return (c, S, w, h) => {
      box(c, S, 0, 0, w, h, 0.25);
      const arm = Math.min(0.4, w * 0.12);
      const back = h * 0.26;
      thin(c, S);
      line(c, arm, back, w - arm, back);
      line(c, arm, back, arm, h);
      line(c, w - arm, back, w - arm, h);
      const seatW = (w - arm * 2) / seats;
      for (let i = 1; i < seats; i++) line(c, arm + seatW * i, back, arm + seatW * i, h - 0.05);
      normal(c, S);
    };
  }

  function sofaL(c, S, w, h) {
    // L字ソファ（背面は上と左）
    c.beginPath();
    c.moveTo(0.15, 0);
    c.lineTo(w - 0.15, 0);
    c.quadraticCurveTo(w, 0, w, 0.15);
    c.lineTo(w, 1.8);
    c.lineTo(1.8, 1.8);
    c.lineTo(1.8, h - 0.15);
    c.quadraticCurveTo(1.8, h, 1.65, h);
    c.lineTo(0.15, h);
    c.quadraticCurveTo(0, h, 0, h - 0.15);
    c.lineTo(0, 0.15);
    c.quadraticCurveTo(0, 0, 0.15, 0);
    c.closePath();
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    thin(c, S);
    c.beginPath();
    c.moveTo(w - 0.35, 1.8);
    c.lineTo(w - 0.35, 0.45);
    c.lineTo(0.45, 0.45);
    c.lineTo(0.45, h - 0.35);
    c.lineTo(1.8, h - 0.35);
    c.stroke();
    normal(c, S);
  }

  function armchair(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.3);
    thin(c, S);
    rr(c, w * 0.2, h * 0.3, w * 0.6, h * 0.65, 0.15);
    c.stroke();
    normal(c, S);
  }

  function table(c, S, w, h) { box(c, S, 0, 0, w, h, 0.08); }

  function tableRound(c, S, w, h) { ellipse(c, S, w / 2, h / 2, w / 2, h / 2); }

  function lowtable(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.1);
    thin(c, S);
    rr(c, 0.18, 0.18, w - 0.36, h - 0.36, 0.05);
    c.stroke();
    normal(c, S);
  }

  function dining(perSide) {
    return (c, S, w, h) => {
      const chairH = Math.min(1, h * 0.28);
      const tableH = h - chairH * 2 + 0.3;
      const tableY = chairH - 0.15;
      const slot = w / perSide;
      for (let i = 0; i < perSide; i++) {
        const cx = slot * i + slot / 2;
        chair(c, S, cx - 0.45, 0, 0.9, chairH);
        c.save();
        c.translate(cx, h);
        c.rotate(Math.PI);
        chair(c, S, -0.45, 0, 0.9, chairH);
        c.restore();
      }
      box(c, S, 0.05, tableY, w - 0.1, tableH, 0.08);
    };
  }

  function roundDining(c, S, w, h) {
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.28;
    for (let i = 0; i < 4; i++) {
      c.save();
      c.translate(cx, cy);
      c.rotate((i * Math.PI) / 2);
      chair(c, S, -0.45, -Math.min(w, h) / 2, 0.9, 0.95);
      c.restore();
    }
    circle(c, S, cx, cy, r);
  }

  function chairItem(c, S, w, h) { chair(c, S, 0, 0, w, h); }

  function desk(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    line(c, w * 0.62, 0, w * 0.62, h);
    line(c, w * 0.62, h * 0.5, w, h * 0.5);
    normal(c, S);
  }

  function deskSet(c, S, w, h) {
    const dh = h * 0.55;
    // 椅子は机側を向く（背もたれは下）
    c.save();
    c.translate(w / 2, h);
    c.rotate(Math.PI);
    chair(c, S, -0.45, 0, 0.9, Math.min(1, h - dh + 0.2));
    c.restore();
    box(c, S, 0, 0, w, dh, 0.05);
    thin(c, S);
    rr(c, w * 0.3, 0.12, w * 0.4, 0.14, 0.03);
    c.stroke();
    rr(c, w * 0.3, dh * 0.55, w * 0.4, dh * 0.22, 0.03);
    c.stroke();
    normal(c, S);
  }

  function bookshelf(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    const n = Math.max(1, Math.round(w / 1.2));
    for (let i = 1; i < n; i++) line(c, (w / n) * i, 0, (w / n) * i, h);
    // 本の背
    c.strokeStyle = S.softLine;
    for (let x = 0.12; x < w - 0.05; x += 0.16) line(c, x, h * 0.15, x, h * 0.8);
    normal(c, S);
  }

  function cabinet(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    const n = Math.max(1, Math.round(w / 1));
    for (let i = 1; i < n; i++) line(c, (w / n) * i, 0, (w / n) * i, h);
    line(c, 0, h - 0.12, w, h - 0.12);
    normal(c, S);
  }

  function tv(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    rr(c, w * 0.12, h * 0.3, w * 0.76, h * 0.22, 0.02);
    c.fillStyle = S.dark;
    c.fill();
  }

  function rug(c, S, w, h) {
    rr(c, 0, 0, w, h, 0.15);
    c.fillStyle = S.rug;
    c.fill();
    thin(c, S);
    dashed(c, S, true);
    rr(c, 0.25, 0.25, w - 0.5, h - 0.5, 0.1);
    c.stroke();
    dashed(c, S, false);
    normal(c, S);
  }

  function plant(c, S, w, h) {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    c.save();
    c.fillStyle = S.green;
    c.strokeStyle = S.greenLine;
    thin(c, S);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      c.beginPath();
      c.ellipse(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.48, r * 0.22, a, 0, TAU);
      c.fill();
      c.stroke();
    }
    c.restore();
    circle(c, S, cx, cy, r * 0.28, S.fill);
  }

  function lamp(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r * 0.85);
    thin(c, S);
    line(c, w / 2 - r, h / 2, w / 2 + r, h / 2);
    line(c, w / 2, h / 2 - r, w / 2, h / 2 + r);
    normal(c, S);
  }

  function pianoGrand(c, S, w, h) {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, h * 0.55);
    c.bezierCurveTo(w, h * 0.95, w * 0.62, h, w * 0.45, h * 0.86);
    c.bezierCurveTo(w * 0.3, h * 0.72, 0, h * 0.8, 0, h * 0.45);
    c.closePath();
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    rr(c, w * 0.05, 0.05, w * 0.9, 0.5, 0.02);
    c.fillStyle = S.soft;
    c.fill();
    thin(c, S);
    c.stroke();
    for (let x = w * 0.1; x < w * 0.92; x += 0.18) line(c, x, 0.05, x, 0.35);
    normal(c, S);
    // 椅子は鍵盤の手前（上）に置く想定なので描かない
  }

  function pianoUpright(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.03);
    rr(c, 0.1, h * 0.6, w - 0.2, h * 0.35, 0.02);
    c.fillStyle = S.soft;
    c.fill();
    thin(c, S);
    c.stroke();
    for (let x = 0.2; x < w - 0.1; x += 0.18) line(c, x, h * 0.6, x, h * 0.85);
    normal(c, S);
  }

  /* ---------- 寝室 ---------- */

  function bed(pillows) {
    return (c, S, w, h) => {
      box(c, S, 0, 0, w, h, 0.08);
      thin(c, S);
      const pw = (w - 0.3) / pillows;
      for (let i = 0; i < pillows; i++) {
        rr(c, 0.15 + pw * i + 0.06, 0.18, pw - 0.12, 0.55, 0.12);
        c.stroke();
      }
      // 掛け布団の折り返し
      c.beginPath();
      c.moveTo(0, h * 0.3);
      c.lineTo(w, h * 0.3);
      c.stroke();
      c.beginPath();
      c.moveTo(w, h * 0.3);
      c.lineTo(w * 0.62, h * 0.3);
      c.lineTo(w, h * 0.45);
      c.stroke();
      normal(c, S);
    };
  }

  function futon(c, S, w, h) {
    rr(c, 0, 0, w, h, 0.3);
    c.fillStyle = S.fill;
    c.fill();
    thin(c, S);
    c.stroke();
    rr(c, w * 0.25, 0.2, w * 0.5, 0.5, 0.15);
    c.stroke();
    line(c, 0.1, h * 0.28, w - 0.1, h * 0.28);
    normal(c, S);
  }

  function wardrobe(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    dashed(c, S, true);
    line(c, 0.1, h / 2, w - 0.1, h / 2);
    dashed(c, S, false);
    for (let x = 0.35; x < w - 0.2; x += 0.35) line(c, x - 0.12, h / 2 - 0.25, x + 0.12, h / 2 + 0.25);
    normal(c, S);
  }

  function dresser(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.03);
    thin(c, S);
    line(c, 0, h - 0.15, w, h - 0.15);
    line(c, w / 2, 0, w / 2, h - 0.15);
    normal(c, S);
  }

  function nightstand(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.25, false);
    normal(c, S);
  }

  /* ---------- キッチン ---------- */

  function burners(c, S, x, y, w, h, n) {
    thin(c, S);
    const r = Math.min(w / (n + 0.6), h) * 0.28;
    for (let i = 0; i < n; i++) {
      const cx = x + (w / n) * (i + 0.5);
      circle(c, S, cx, y + h / 2, r, false);
      circle(c, S, cx, y + h / 2, r * 0.45, false);
    }
    normal(c, S);
  }

  function basin(c, S, x, y, w, h) {
    thin(c, S);
    rr(c, x, y, w, h, Math.min(w, h) * 0.25);
    c.fillStyle = S.water;
    c.fill();
    c.stroke();
    circle(c, S, x + w / 2, y + h * 0.35, 0.06, S.line, true);
    normal(c, S);
  }

  function kitchen(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    // コンロ（左）とシンク（右）
    const stoveW = Math.min(1.6, w * 0.34);
    thin(c, S);
    rr(c, 0.15, 0.15, stoveW, h - 0.3, 0.05);
    c.stroke();
    normal(c, S);
    burners(c, S, 0.15, 0.15, stoveW, h - 0.3, 2);
    const sinkW = Math.min(1.8, w * 0.36);
    basin(c, S, w - sinkW - 0.35, 0.2, sinkW, h - 0.45);
  }

  function sinkItem(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    basin(c, S, 0.2, 0.2, w - 0.4, h - 0.45);
  }

  function stove(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    burners(c, S, 0.1, 0.1, w - 0.2, h - 0.2, Math.max(2, Math.round(w / 0.8)));
  }

  function fridge(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    line(c, 0.12, h - 0.18, w - 0.12, h - 0.18);
    rr(c, 0.15, 0.15, w - 0.3, h - 0.45, 0.04);
    c.stroke();
    normal(c, S);
    label(c, S, 'R', w / 2, (h - 0.3) / 2 + 0.08, Math.min(w, h) * 0.42, S.softLine);
  }

  function island(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    rr(c, 0.15, 0.15, w - 0.3, h - 0.3, 0.03);
    c.stroke();
    normal(c, S);
  }

  function counterBar(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    line(c, 0, h * 0.3, w, h * 0.3);
    normal(c, S);
  }

  /* ---------- 水回り ---------- */

  function toilet(c, S, w, h) {
    box(c, S, w * 0.08, 0, w * 0.84, h * 0.3, 0.06);
    ellipse(c, S, w / 2, h * 0.62, w * 0.42, h * 0.36);
    thin(c, S);
    ellipse(c, S, w / 2, h * 0.64, w * 0.25, h * 0.22, false);
    normal(c, S);
  }

  function washbasin(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.04);
    thin(c, S);
    ellipse(c, S, w / 2, h * 0.55, w * 0.32, h * 0.3, S.water);
    circle(c, S, w / 2, h * 0.14, 0.06, S.line, true);
    normal(c, S);
  }

  function bathtub(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.12);
    thin(c, S);
    rr(c, 0.15, 0.15, w - 0.3, h - 0.3, Math.min(w, h) * 0.25);
    c.fillStyle = S.water;
    c.fill();
    c.stroke();
    circle(c, S, w / 2, h - 0.45, 0.08, false);
    normal(c, S);
  }

  function shower(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.02, S.water);
    thin(c, S);
    dashed(c, S, true);
    line(c, 0, 0, w, h);
    line(c, w, 0, 0, h);
    dashed(c, S, false);
    circle(c, S, w / 2, h / 2, 0.14, S.fill);
    normal(c, S);
  }

  function washer(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.06);
    thin(c, S);
    circle(c, S, w / 2, h / 2 + 0.05, Math.min(w, h) * 0.32, S.soft);
    line(c, 0.1, 0.22, w - 0.1, 0.22);
    normal(c, S);
  }

  function unitbath(c, S, w, h) {
    // 浴槽＋洗い場のユニットバス（浴槽が上）
    box(c, S, 0, 0, w, h, 0.05, S.water);
    const tubH = Math.min(h * 0.45, 1.6);
    box(c, S, 0.1, 0.1, w - 0.2, tubH, 0.15);
    thin(c, S);
    rr(c, 0.25, 0.25, w - 0.5, tubH - 0.3, 0.2);
    c.fillStyle = S.water;
    c.fill();
    c.stroke();
    circle(c, S, w / 2, tubH + (h - tubH) / 2, 0.1, false);
    normal(c, S);
  }

  /* ---------- オフィス・施設 ---------- */

  function meeting(perSide) {
    return dining(perSide);
  }

  function reception(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05, S.soft);
    thin(c, S);
    rr(c, 0.2, h * 0.45, w - 0.4, h * 0.4, 0.05);
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    normal(c, S);
  }

  function locker(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    const n = Math.max(1, Math.round(w / 0.6));
    for (let i = 1; i < n; i++) line(c, (w / n) * i, 0, (w / n) * i, h);
    for (let i = 0; i < n; i++) line(c, (w / n) * i + 0.12, h * 0.25, (w / n) * (i + 1) - 0.12, h * 0.25);
    normal(c, S);
  }

  function filing(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    line(c, 0.1, h - 0.14, w - 0.1, h - 0.14);
    line(c, w / 2 - 0.15, h - 0.3, w / 2 + 0.15, h - 0.3);
    normal(c, S);
  }

  function whiteboard(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.02);
    thin(c, S);
    line(c, 0.1, h / 2, w - 0.1, h / 2);
    normal(c, S);
  }

  function copier(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    rr(c, 0.15, 0.15, w - 0.3, h * 0.45, 0.03);
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    normal(c, S);
  }

  function bench(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.08);
    thin(c, S);
    for (let y = h * 0.33; y < h - 0.05; y += h * 0.33) line(c, 0.08, y, w - 0.08, y);
    normal(c, S);
  }

  function vending(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.03, S.soft);
    thin(c, S);
    rr(c, 0.15, h * 0.55, w - 0.3, h * 0.3, 0.02);
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    normal(c, S);
  }

  function rack(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0, S.dark);
    c.strokeStyle = S.fill;
    thin(c, S);
    for (let y = 0.25; y < h - 0.1; y += 0.25) line(c, 0.12, y, w - 0.12, y);
    normal(c, S);
  }

  function labBench(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.03);
    thin(c, S);
    line(c, 0, h / 2, w, h / 2);
    normal(c, S);
    basin(c, S, w / 2 - 0.4, h / 2 - 0.35, 0.8, 0.7);
  }

  function tank(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r, S.soft);
    thin(c, S);
    circle(c, S, w / 2, h / 2, r * 0.72, S.water);
    for (let i = 0; i < 3; i++) circle(c, S, w / 2 + (i - 1) * r * 0.25, h / 2 + (i % 2 ? -1 : 1) * r * 0.2, r * 0.07, false);
    normal(c, S);
  }

  /* ---------- 病院 ---------- */

  function hospitalBed(c, S, w, h) {
    box(c, S, 0.1, 0.12, w - 0.2, h - 0.2, 0.08);
    c.fillStyle = S.line;
    c.fillRect(0.05, 0, w - 0.1, 0.16);
    c.fillRect(0.1, h - 0.12, w - 0.2, 0.1);
    thin(c, S);
    rr(c, w * 0.22, 0.32, w * 0.56, 0.5, 0.12);
    c.stroke();
    line(c, 0.1, h * 0.34, w - 0.1, h * 0.34);
    normal(c, S);
    c.strokeStyle = S.softLine;
    line(c, 0.02, h * 0.25, 0.02, h * 0.62);
    line(c, w - 0.02, h * 0.25, w - 0.02, h * 0.62);
  }

  function examBed(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.1);
    thin(c, S);
    line(c, 0, h * 0.25, w, h * 0.25);
    rr(c, w * 0.18, 0.12, w * 0.64, h * 0.1, 0.08);
    c.stroke();
    normal(c, S);
  }

  function opTable(c, S, w, h) {
    // 手術台＋無影灯
    thin(c, S);
    dashed(c, S, true);
    circle(c, S, w / 2, h / 2, Math.min(w, h * 0.5) * 0.48, false);
    dashed(c, S, false);
    normal(c, S);
    box(c, S, w * 0.3, h * 0.08, w * 0.4, h * 0.84, 0.1);
    thin(c, S);
    line(c, w * 0.3, h * 0.28, w * 0.7, h * 0.28);
    normal(c, S);
  }

  function medCabinet(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    line(c, w / 2, 0, w / 2, h);
    normal(c, S);
    c.fillStyle = S.red;
    const s = Math.min(w, h) * 0.18;
    c.fillRect(w / 4 - s / 2, h / 2 - s * 1.5, s, s * 3);
    c.fillRect(w / 4 - s * 1.5, h / 2 - s / 2, s * 3, s);
  }

  function wheelchair(c, S, w, h) {
    box(c, S, w * 0.22, h * 0.2, w * 0.56, h * 0.55, 0.06);
    c.fillStyle = S.line;
    c.fillRect(0, h * 0.2, w * 0.14, h * 0.6);
    c.fillRect(w * 0.86, h * 0.2, w * 0.14, h * 0.6);
    thin(c, S);
    line(c, w * 0.22, h * 0.2, w * 0.78, h * 0.2);
    circle(c, S, w * 0.3, h * 0.9, 0.08, false);
    circle(c, S, w * 0.7, h * 0.9, 0.08, false);
    normal(c, S);
  }

  function ivStand(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    thin(c, S);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      line(c, w / 2, h / 2, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
    }
    normal(c, S);
    circle(c, S, w / 2, h / 2, r * 0.3, S.water);
  }

  function curtain(c, S, w, h) {
    thin(c, S, 0.9);
    c.strokeStyle = S.softLine;
    c.beginPath();
    const y = h / 2;
    const amp = Math.min(0.12, h * 0.4);
    for (let x = 0; x <= w + 1e-6; x += 0.05) {
      const yy = y + Math.sin(x * 9) * amp;
      if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
    }
    c.stroke();
    normal(c, S);
  }

  function morgue(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0, S.soft);
    const n = Math.max(1, Math.round(w / 1.4));
    const dw = w / n;
    thin(c, S);
    for (let i = 0; i < n; i++) {
      rr(c, dw * i + 0.12, 0.2, dw - 0.24, h - 0.4, 0.03);
      c.fillStyle = S.fill;
      c.fill();
      c.stroke();
      line(c, dw * i + dw / 2 - 0.2, h - 0.45, dw * i + dw / 2 + 0.2, h - 0.45);
    }
    normal(c, S);
  }

  /* ---------- 探索・ホラー ---------- */

  function rand(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function debris(c, S, w, h) {
    const r = rand(7);
    c.save();
    thin(c, S);
    for (let i = 0; i < 9; i++) {
      const cx = 0.3 + r() * (w - 0.6);
      const cy = 0.3 + r() * (h - 0.6);
      const size = 0.18 + r() * 0.45;
      c.beginPath();
      const k = 4 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) {
        const a = (j / k) * TAU + r() * 0.5;
        const rad = size * (0.6 + r() * 0.5);
        const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
        if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.fillStyle = i % 3 === 0 ? S.dark : S.soft;
      c.fill();
      c.stroke();
    }
    c.restore();
  }

  function blood(c, S, w, h) {
    const r = rand(13);
    c.save();
    c.fillStyle = S.blood;
    c.beginPath();
    const cx = w / 2, cy = h / 2, base = Math.min(w, h) * 0.32;
    const k = 14;
    for (let j = 0; j <= k; j++) {
      const a = (j / k) * TAU;
      const rad = base * (0.75 + r() * 0.45);
      const px = cx + Math.cos(a) * rad * (w / Math.min(w, h)), py = cy + Math.sin(a) * rad * (h / Math.min(w, h));
      if (j === 0) c.moveTo(px, py); else c.quadraticCurveTo(cx + Math.cos(a - 0.2) * rad * 1.15, cy + Math.sin(a - 0.2) * rad * 1.15, px, py);
    }
    c.closePath();
    c.fill();
    for (let i = 0; i < 6; i++) {
      const a = r() * TAU;
      const d = base * (1.25 + r() * 0.5);
      c.beginPath();
      c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.05 + r() * 0.08, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  function body(c, S, w, h) {
    // チョークで描いた人型の輪郭（上から見た図）
    c.save();
    c.strokeStyle = S.chalk;
    c.lineWidth = S.lw * 1.3;
    dashed(c, S, true);
    const cx = w / 2;
    c.beginPath();
    c.arc(cx, h * 0.1, Math.min(w * 0.18, h * 0.08), 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(cx - w * 0.14, h * 0.19);
    c.lineTo(cx - w * 0.44, h * 0.42);
    c.lineTo(cx - w * 0.36, h * 0.46);
    c.lineTo(cx - w * 0.14, h * 0.3);
    c.lineTo(cx - w * 0.16, h * 0.55);
    c.lineTo(cx - w * 0.3, h * 0.96);
    c.lineTo(cx - w * 0.14, h * 0.97);
    c.lineTo(cx, h * 0.62);
    c.lineTo(cx + w * 0.14, h * 0.97);
    c.lineTo(cx + w * 0.3, h * 0.96);
    c.lineTo(cx + w * 0.16, h * 0.55);
    c.lineTo(cx + w * 0.14, h * 0.3);
    c.lineTo(cx + w * 0.4, h * 0.2);
    c.lineTo(cx + w * 0.36, h * 0.14);
    c.lineTo(cx + w * 0.14, h * 0.19);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function evidence(c, S, w, h, item) {
    c.beginPath();
    c.moveTo(w * 0.05, h * 0.9);
    c.lineTo(w / 2, h * 0.08);
    c.lineTo(w * 0.95, h * 0.9);
    c.closePath();
    c.fillStyle = S.yellow;
    c.fill();
    c.stroke();
    const text = (item && item.label) ? String(item.label).slice(0, 3) : '1';
    label(c, S, text, w / 2, h * 0.62, Math.min(w, h) * 0.4, '#1d1d1d');
  }

  function magicCircle(c, S, w, h) {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 0.05;
    c.save();
    c.strokeStyle = S.ritual;
    c.lineWidth = S.lw * 1.2;
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
    c.lineWidth = S.lw * 0.7;
    c.beginPath(); c.arc(cx, cy, r * 0.84, 0, TAU); c.stroke();
    c.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * TAU) / 5;
      const px = cx + Math.cos(a) * r * 0.84, py = cy + Math.sin(a) * r * 0.84;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      c.beginPath();
      c.arc(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, r * 0.035, 0, TAU);
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r * 0.22, 0, TAU); c.stroke();
    c.restore();
  }

  function altar(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.03, S.soft);
    c.fillStyle = S.ritualSoft;
    c.fillRect(w * 0.35, 0, w * 0.3, h);
    c.strokeRect(w * 0.35, 0, w * 0.3, h);
    candleAt(c, S, w * 0.15, h * 0.35, 0.16);
    candleAt(c, S, w * 0.85, h * 0.35, 0.16);
  }

  function candleAt(c, S, x, y, r) {
    c.save();
    const g = c.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(255, 200, 90, 0.55)');
    g.addColorStop(1, 'rgba(255, 200, 90, 0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r * 2.4, 0, TAU); c.fill();
    c.restore();
    circle(c, S, x, y, r, S.fill);
    circle(c, S, x, y, r * 0.35, S.flame, true);
  }

  function candle(c, S, w, h) { candleAt(c, S, w / 2, h / 2, Math.min(w, h) * 0.28); }

  function cage(c, S, w, h) {
    c.save();
    c.lineWidth = S.lw * 1.4;
    c.strokeRect(0, 0, w, h);
    thin(c, S, 0.9);
    for (let x = 0.3; x < w - 0.1; x += 0.3) line(c, x, 0, x, h);
    c.restore();
  }

  function crate(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0, S.wood);
    thin(c, S);
    line(c, 0, 0, w, h);
    line(c, w, 0, 0, h);
    rr(c, 0.12, 0.12, w - 0.24, h - 0.24, 0);
    c.stroke();
    normal(c, S);
  }

  function barrel(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r, S.wood);
    thin(c, S);
    circle(c, S, w / 2, h / 2, r * 0.75, false);
    circle(c, S, w / 2, h / 2, r * 0.12, S.line);
    normal(c, S);
  }

  function safe(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.04, S.dark);
    c.strokeStyle = S.fill;
    thin(c, S);
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.25, false);
    line(c, w / 2, h / 2 - Math.min(w, h) * 0.25, w / 2, h / 2);
    normal(c, S);
  }

  function glass(c, S, w, h) {
    const r = rand(29);
    c.save();
    thin(c, S);
    c.fillStyle = S.water;
    for (let i = 0; i < 9; i++) {
      const cx = 0.2 + r() * (w - 0.4), cy = 0.2 + r() * (h - 0.4);
      const s = 0.1 + r() * 0.22;
      const a = r() * TAU;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
      c.lineTo(cx + Math.cos(a + 2.2) * s * 0.7, cy + Math.sin(a + 2.2) * s * 0.7);
      c.lineTo(cx + Math.cos(a + 4) * s, cy + Math.sin(a + 4) * s);
      c.closePath();
      c.fill();
      c.stroke();
    }
    c.restore();
  }

  /* ---------- 手がかりの小物 ---------- */

  function memo(c, S, w, h) {
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(-0.12);
    box(c, S, -w * 0.42, -h * 0.4, w * 0.84, h * 0.8, 0.02, S.fill);
    thin(c, S, 0.55);
    c.strokeStyle = S.softLine;
    for (let i = 0; i < 3; i++) line(c, -w * 0.3, -h * 0.18 + i * h * 0.17, w * (i === 2 ? 0.08 : 0.3), -h * 0.18 + i * h * 0.17);
    c.restore();
  }

  function diary(c, S, w, h) {
    box(c, S, w * 0.06, h * 0.06, w * 0.88, h * 0.88, 0.04, S.wood);
    c.fillStyle = S.dark;
    c.fillRect(w * 0.06, h * 0.06, w * 0.14, h * 0.88);
    c.strokeRect(w * 0.06, h * 0.06, w * 0.14, h * 0.88);
    thin(c, S, 0.6);
    c.strokeRect(w * 0.36, h * 0.3, w * 0.42, h * 0.22);
    normal(c, S);
  }

  function keyItem(c, S, w, h) {
    const r = Math.min(w * 0.2, h * 0.36);
    c.save();
    c.lineWidth = S.lw * 1.2;
    c.strokeStyle = S.line;
    c.fillStyle = S.yellow;
    circle(c, S, w * 0.08 + r, h / 2, r, S.yellow);
    circle(c, S, w * 0.08 + r, h / 2, r * 0.38, S.fill);
    line(c, w * 0.08 + r * 2, h / 2, w * 0.94, h / 2);
    line(c, w * 0.8, h / 2, w * 0.8, h * 0.8);
    line(c, w * 0.92, h / 2, w * 0.92, h * 0.74);
    c.restore();
  }

  function knife(c, S, w, h) {
    c.beginPath();
    c.moveTo(w * 0.42, h * 0.25);
    c.lineTo(w * 0.98, h * 0.5);
    c.lineTo(w * 0.42, h * 0.75);
    c.closePath();
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    box(c, S, w * 0.02, h * 0.28, w * 0.36, h * 0.44, h * 0.12, S.dark);
    line(c, w * 0.4, h * 0.12, w * 0.4, h * 0.88);
  }

  function photo(c, S, w, h) {
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(0.1);
    box(c, S, -w * 0.42, -h * 0.42, w * 0.84, h * 0.84, 0.02, S.fill);
    c.fillStyle = S.soft;
    c.fillRect(-w * 0.32, -h * 0.32, w * 0.64, h * 0.46);
    thin(c, S, 0.6);
    c.strokeRect(-w * 0.32, -h * 0.32, w * 0.64, h * 0.46);
    c.beginPath();
    c.arc(0, -h * 0.13, Math.min(w, h) * 0.1, 0, TAU);
    c.moveTo(-w * 0.16, h * 0.14);
    c.quadraticCurveTo(0, -h * 0.06, w * 0.16, h * 0.14);
    c.stroke();
    c.restore();
  }

  function phone(c, S, w, h) {
    box(c, S, w * 0.1, h * 0.04, w * 0.8, h * 0.92, Math.min(w, h) * 0.16, S.dark);
    c.fillStyle = S.water;
    c.fillRect(w * 0.2, h * 0.14, w * 0.6, h * 0.66);
    circle(c, S, w / 2, h * 0.88, Math.min(w, h) * 0.05, S.fill, true);
  }

  function pills(c, S, w, h) {
    box(c, S, w * 0.24, h * 0.2, w * 0.52, h * 0.74, 0.06, S.water);
    box(c, S, w * 0.2, h * 0.04, w * 0.6, h * 0.2, 0.04, S.fill);
    thin(c, S, 0.6);
    c.strokeRect(w * 0.3, h * 0.45, w * 0.4, h * 0.24);
    normal(c, S);
  }

  function idol(c, S, w, h) {
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.44, S.soft);
    c.save();
    c.fillStyle = S.ritual;
    c.beginPath();
    c.ellipse(w / 2, h * 0.42, w * 0.18, h * 0.2, 0, 0, TAU);
    c.fill();
    c.stroke();
    thin(c, S, 0.8);
    c.strokeStyle = S.ritual;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.175);
      c.beginPath();
      c.moveTo(w / 2 + Math.cos(a) * w * 0.12, h * 0.55);
      c.quadraticCurveTo(w / 2 + Math.cos(a) * w * 0.3, h * 0.66, w / 2 + Math.cos(a) * w * 0.26, h * 0.82);
      c.stroke();
    }
    c.restore();
  }

  function markerIcon(symbol, color) {
    return (c, S, w, h) => {
      const r = Math.min(w, h) / 2 - 0.04;
      circle(c, S, w / 2, h / 2, r, S[color] || color);
      label(c, S, symbol, w / 2, h / 2 + r * 0.06, r * 1.25, '#ffffff');
    };
  }

  function danger(c, S, w, h) {
    c.beginPath();
    c.moveTo(w / 2, h * 0.06);
    c.lineTo(w * 0.96, h * 0.92);
    c.lineTo(w * 0.04, h * 0.92);
    c.closePath();
    c.fillStyle = S.yellow;
    c.fill();
    c.stroke();
    label(c, S, '!', w / 2, h * 0.64, Math.min(w, h) * 0.5, '#1d1d1d');
  }

  function footprints(c, S, w, h) {
    c.fillStyle = S.dark;
    const n = Math.max(2, Math.round(h / 0.7));
    for (let i = 0; i < n; i++) {
      const x = w / 2 + (i % 2 ? 0.18 : -0.18) * (w / 1);
      const y = h - (h / n) * (i + 0.5);
      c.beginPath();
      c.ellipse(x, y, Math.min(0.12, w * 0.15), Math.min(0.24, h / n * 0.4), 0, 0, TAU);
      c.fill();
    }
  }

  function coffin(c, S, w, h) {
    c.beginPath();
    c.moveTo(w * 0.3, 0);
    c.lineTo(w * 0.7, 0);
    c.lineTo(w, h * 0.25);
    c.lineTo(w * 0.72, h);
    c.lineTo(w * 0.28, h);
    c.lineTo(0, h * 0.25);
    c.closePath();
    c.fillStyle = S.wood;
    c.fill();
    c.stroke();
    thin(c, S);
    line(c, w / 2, h * 0.15, w / 2, h * 0.45);
    line(c, w * 0.38, h * 0.24, w * 0.62, h * 0.24);
    normal(c, S);
  }

  function tape(c, S, w, h) {
    c.save();
    c.fillStyle = S.yellow;
    c.fillRect(0, 0, w, h);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    c.fillStyle = '#1d1d1d';
    for (let x = -h; x < w + h; x += h * 2.2) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + h, 0);
      c.lineTo(x + h * 1.8, 0);
      c.lineTo(x + h * 0.8, h);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  /* ---------- 屋外 ---------- */

  function car(c, S, w, h) {
    box(c, S, 0.1, 0, w - 0.2, h, Math.min(w, h) * 0.22);
    thin(c, S);
    // フロントガラス・リアガラス
    rr(c, 0.45, h * 0.28, w - 0.9, h * 0.12, 0.15);
    c.fillStyle = S.water;
    c.fill();
    c.stroke();
    rr(c, 0.5, h * 0.72, w - 1, h * 0.09, 0.12);
    c.fill();
    c.stroke();
    rr(c, 0.4, h * 0.42, w - 0.8, h * 0.28, 0.1);
    c.stroke();
    // ミラー
    c.fillStyle = S.line;
    c.fillRect(0, h * 0.3, 0.12, 0.25);
    c.fillRect(w - 0.12, h * 0.3, 0.12, 0.25);
    normal(c, S);
  }

  function tree(c, S, w, h) {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 0.05;
    c.save();
    c.fillStyle = S.green;
    c.strokeStyle = S.greenLine;
    thin(c, S);
    c.beginPath();
    const k = 9;
    for (let i = 0; i <= k; i++) {
      const a = (i / k) * TAU;
      const px = cx + Math.cos(a) * r * 0.82, py = cy + Math.sin(a) * r * 0.82;
      if (i === 0) c.moveTo(px, py);
      else c.quadraticCurveTo(cx + Math.cos(a - Math.PI / k) * r * 1.12, cy + Math.sin(a - Math.PI / k) * r * 1.12, px, py);
    }
    c.fill();
    c.stroke();
    c.beginPath(); c.arc(cx, cy, r * 0.1, 0, TAU); c.fillStyle = S.greenLine; c.fill();
    c.restore();
  }

  function bush(c, S, w, h) {
    c.save();
    c.fillStyle = S.green;
    c.strokeStyle = S.greenLine;
    thin(c, S);
    const r = Math.min(w, h) / 2;
    [[0.5, 0.35], [0.3, 0.6], [0.7, 0.62], [0.5, 0.7]].forEach(([px, py]) => {
      c.beginPath();
      c.arc(w * px, h * py, r * 0.42, 0, TAU);
      c.fill();
      c.stroke();
    });
    c.restore();
  }

  function outdoorBench(c, S, w, h) { bench(c, S, w, h); }

  /* ---------- 学校・図書館 ---------- */

  function schoolDesk(c, S, w, h) {
    // 学校の机と椅子。椅子の背もたれが上、机は下（座った人は下を向く）
    const chairH = Math.min(0.9, h * 0.45);
    chair(c, S, w * 0.2, 0, w * 0.6, chairH);
    box(c, S, 0.05, chairH + 0.08, w - 0.1, h - chairH - 0.12, 0.05);
  }

  function lectern(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    rr(c, w * 0.12, h * 0.38, w * 0.76, h * 0.44, 0.03);
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    normal(c, S);
  }

  function lectureRow(c, S, w, h) {
    // 固定机と椅子の列。椅子が上、机が下
    const n = Math.max(1, Math.round(w / 1.2));
    const slot = w / n;
    const seatH = h * 0.48;
    for (let i = 0; i < n; i++) chair(c, S, slot * i + slot * 0.14, 0, slot * 0.72, seatH);
    box(c, S, 0, seatH + 0.08, w, h - seatH - 0.1, 0.04);
  }

  function bookstack(c, S, w, h) {
    // 両面の書架（上下どちらの通路からも本を取れる）
    box(c, S, 0, 0, w, h, 0);
    thin(c, S);
    line(c, 0, h / 2, w, h / 2);
    const n = Math.max(1, Math.round(w / 1.8));
    for (let i = 1; i < n; i++) line(c, (w / n) * i, 0, (w / n) * i, h);
    c.strokeStyle = S.softLine;
    for (let x = 0.12; x < w - 0.05; x += 0.16) {
      line(c, x, h * 0.1, x, h * 0.4);
      line(c, x, h * 0.6, x, h * 0.9);
    }
    normal(c, S);
  }

  /* ---------- 娯楽・スポーツ ---------- */

  function stageFloor(c, S, w, h) {
    // 舞台。上が奥（壁側）、下の縁が客席側
    c.fillStyle = S.wood;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = S.softLine;
    thin(c, S, 0.45);
    for (let y = 0.5; y < h - 0.05; y += 0.5) line(c, 0, y, w, y);
    c.strokeStyle = S.line;
    normal(c, S);
    c.strokeRect(0, 0, w, h);
    c.lineWidth = S.lw * 2.4;
    line(c, 0, h - S.lw * 1.2, w, h - S.lw * 1.2);
    normal(c, S);
  }

  function seatRow(c, S, w, h) {
    // 客席1列。背もたれが上、客は下を向く
    const n = Math.max(1, Math.round(w));
    const slot = w / n;
    for (let i = 0; i < n; i++) {
      rr(c, slot * i + 0.05, 0, slot - 0.1, h, 0.1);
      c.fillStyle = S.fill;
      c.fill();
      c.stroke();
      thin(c, S);
      line(c, slot * i + 0.1, h * 0.32, slot * (i + 1) - 0.1, h * 0.32);
      normal(c, S);
    }
  }

  function pew(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.08);
    thin(c, S);
    line(c, 0.08, h * 0.3, w - 0.08, h * 0.3);
    normal(c, S);
  }

  function speakerBox(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05, S.soft);
    thin(c, S);
    circle(c, S, w / 2, h * 0.58, Math.min(w, h) * 0.3, S.fill);
    circle(c, S, w / 2, h * 0.58, Math.min(w, h) * 0.1, S.dark);
    normal(c, S);
  }

  function drumKit(c, S, w, h) {
    // ドラムセット。奏者は上（ステージの奥）に座り、下の客席側を向く
    thin(c, S);
    circle(c, S, w * 0.5, h * 0.16, 0.3, S.soft);                  // 椅子
    rr(c, w * 0.34, h * 0.62, w * 0.32, h * 0.34, 0.06);            // バスドラム
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    circle(c, S, w * 0.3, h * 0.42, 0.34);                          // スネア
    circle(c, S, w * 0.42, h * 0.56, 0.26);                         // タム
    circle(c, S, w * 0.58, h * 0.56, 0.26);
    circle(c, S, w * 0.76, h * 0.4, 0.38);                          // フロアタム
    [[0.12, 0.34, 0.3], [0.14, 0.82, 0.4], [0.88, 0.8, 0.44]].forEach(([x, y, r]) => circle(c, S, w * x, h * y, r, S.yellow));
    normal(c, S);
  }

  function mixerDesk(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05);
    thin(c, S);
    rr(c, 0.15, 0.12, w - 0.3, h * 0.58, 0.03);
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    const n = Math.max(3, Math.round((w - 0.3) / 0.26));
    for (let i = 0; i < n; i++) {
      const x = 0.15 + ((w - 0.3) * (i + 0.5)) / n;
      line(c, x, 0.22, x, 0.06 + h * 0.56);
    }
    normal(c, S);
  }

  function stool(c, S, w, h) {
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r * 0.92);
    thin(c, S);
    circle(c, S, w / 2, h / 2, r * 0.5, false);
    normal(c, S);
  }

  function booth(c, S, w, h) {
    // ボックス席。上下に背もたれ付きの長椅子、真ん中にテーブル
    const seatH = Math.min(1.2, h * 0.3);
    box(c, S, 0, 0, w, seatH, 0.12);
    box(c, S, 0, h - seatH, w, seatH, 0.12);
    thin(c, S);
    line(c, 0.1, seatH * 0.36, w - 0.1, seatH * 0.36);
    line(c, 0.1, h - seatH * 0.36, w - 0.1, h - seatH * 0.36);
    normal(c, S);
    box(c, S, 0.2, seatH + 0.15, w - 0.4, h - seatH * 2 - 0.3, 0.06);
  }

  function billiards(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.12, S.wood);
    rr(c, 0.28, 0.28, w - 0.56, h - 0.56, 0.04);
    c.fillStyle = S.green;
    c.fill();
    c.stroke();
    const e = 0.28;
    const long = w >= h;
    const pockets = long
      ? [[e, e], [w / 2, e - 0.04], [w - e, e], [e, h - e], [w / 2, h - e + 0.04], [w - e, h - e]]
      : [[e, e], [e - 0.04, h / 2], [e, h - e], [w - e, e], [w - e + 0.04, h / 2], [w - e, h - e]];
    pockets.forEach(([x, y]) => circle(c, S, x, y, 0.13, S.line, true));
  }

  function banquetRound(c, S, w, h) {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
    for (let i = 0; i < 8; i++) {
      c.save();
      c.translate(cx, cy);
      c.rotate((i * Math.PI) / 4);
      chair(c, S, -0.42, -R, 0.84, 0.9);
      c.restore();
    }
    circle(c, S, cx, cy, R - 0.95);
  }

  function pool(c, S, w, h) {
    // プール。長い辺の方向にコースロープ、はしごは右上
    box(c, S, 0, 0, w, h, 0.1, S.water);
    thin(c, S);
    rr(c, 0.3, 0.3, w - 0.6, h - 0.6, 0.06);
    c.stroke();
    const along = h >= w;
    const across = along ? w : h;
    const lanes = Math.max(1, Math.round((across - 0.6) / 4.5));
    c.strokeStyle = S.blue;
    dashed(c, S, true);
    for (let i = 1; i < lanes; i++) {
      const p = 0.3 + ((across - 0.6) * i) / lanes;
      if (along) line(c, p, 0.9, p, h - 0.9);
      else line(c, 0.9, p, w - 0.9, p);
    }
    dashed(c, S, false);
    c.strokeStyle = S.line;
    const lx = w - 1.3;
    line(c, lx, 0.1, lx, 0.9);
    line(c, lx + 0.6, 0.1, lx + 0.6, 0.9);
    line(c, lx, 0.5, lx + 0.6, 0.5);
    normal(c, S);
  }

  function deckChair(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.2);
    thin(c, S);
    line(c, 0.1, h * 0.3, w - 0.1, h * 0.3);
    for (let y = h * 0.42; y < h - 0.15; y += 0.36) line(c, 0.22, y, w - 0.22, y);
    normal(c, S);
  }

  function treadmill(c, S, w, h) {
    // ランニングマシン。操作盤が上
    box(c, S, 0, 0, w, h, 0.12, S.soft);
    box(c, S, 0.2, 0.15, w - 0.4, 0.55, 0.06, S.dark);
    thin(c, S);
    rr(c, 0.32, 0.95, w - 0.64, h - 1.2, 0.08);
    c.fillStyle = S.fill;
    c.fill();
    c.stroke();
    for (let y = 1.3; y < h - 0.35; y += 0.45) line(c, 0.4, y, w - 0.4, y);
    normal(c, S);
  }

  function exerciseBike(c, S, w, h) {
    // エアロバイク。ハンドルとホイールが上
    thin(c, S);
    rr(c, w * 0.38, h * 0.12, w * 0.24, h * 0.76, 0.1);
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    normal(c, S);
    line(c, w * 0.08, h * 0.12, w * 0.92, h * 0.12);
    circle(c, S, w / 2, h * 0.3, Math.min(w * 0.3, h * 0.14), S.dark);
    box(c, S, w * 0.28, h * 0.66, w * 0.44, h * 0.24, 0.12);
  }

  function weightBench(c, S, w, h) {
    // ベンチプレス。バーベルとラックが上
    box(c, S, w * 0.3, h * 0.3, w * 0.4, h * 0.66, 0.1);
    thin(c, S);
    line(c, w * 0.18, h * 0.08, w * 0.18, h * 0.3);
    line(c, w * 0.82, h * 0.08, w * 0.82, h * 0.3);
    normal(c, S);
    line(c, 0.05, h * 0.14, w - 0.05, h * 0.14);
    box(c, S, 0.02, h * 0.05, 0.16, h * 0.18, 0.03, S.dark);
    box(c, S, w - 0.18, h * 0.05, 0.16, h * 0.18, 0.03, S.dark);
  }

  function dumbbellRack(c, S, w, h) {
    box(c, S, 0, 0, w, h, 0.05, S.soft);
    const n = Math.max(1, Math.round(w / 1));
    const slot = w / n;
    const r = Math.min(0.16, h * 0.28, slot * 0.18);
    for (let i = 0; i < n; i++) {
      const cx = slot * i + slot / 2;
      thin(c, S);
      line(c, cx - slot * 0.3, h * 0.5, cx + slot * 0.3, h * 0.5);
      normal(c, S);
      circle(c, S, cx - slot * 0.3, h * 0.5, r, S.dark);
      circle(c, S, cx + slot * 0.3, h * 0.5, r, S.dark);
    }
  }

  /* ---------- レトロ（1920年代）・和風 ---------- */

  function glow(c, x, y, r, rgb) {
    c.save();
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb}, 0.55)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.restore();
  }

  function barberChair(c, S, w, h) {
    // 理容椅子。背もたれが上（鏡の側）、足置きが下
    box(c, S, w * 0.14, h * 0.04, w * 0.72, h * 0.3, 0.15, S.soft);
    box(c, S, w * 0.06, h * 0.28, w * 0.88, h * 0.44, 0.18);
    thin(c, S);
    line(c, w * 0.24, h * 0.32, w * 0.24, h * 0.68);
    line(c, w * 0.76, h * 0.32, w * 0.76, h * 0.68);
    normal(c, S);
    box(c, S, w * 0.3, h * 0.76, w * 0.4, h * 0.18, 0.06, S.dark);
  }

  function gramophone(c, S, w, h) {
    // 蓄音機：木の台とレコード、ラッパ
    box(c, S, 0, h * 0.3, w * 0.72, h * 0.68, 0.05, S.wood);
    circle(c, S, w * 0.36, h * 0.64, Math.min(w, h) * 0.24, S.dark);
    circle(c, S, w * 0.36, h * 0.64, Math.min(w, h) * 0.05, S.fill);
    thin(c, S);
    line(c, w * 0.36, h * 0.64, w * 0.66, h * 0.36);
    normal(c, S);
    ellipse(c, S, w * 0.72, h * 0.28, w * 0.26, h * 0.24, S.yellow);
    circle(c, S, w * 0.72, h * 0.28, Math.min(w, h) * 0.06, S.line);
  }

  function irori(c, S, w, h) {
    // 囲炉裏：木の枠と灰、真ん中に自在鉤の鉄瓶
    box(c, S, 0, 0, w, h, 0, S.wood);
    box(c, S, w * 0.16, h * 0.16, w * 0.68, h * 0.68, 0, S.soft);
    glow(c, w / 2, h / 2, Math.min(w, h) * 0.34, '255, 140, 60');
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.15, S.dark);
    thin(c, S);
    line(c, w * 0.5, h * 0.35, w * 0.5, h * 0.2);
    normal(c, S);
  }

  function kamado(c, S, w, h) {
    // かまど（竈）：土の台に焚き口と釜が並ぶ
    box(c, S, 0, 0, w, h, 0.25, S.soft);
    const n = Math.max(1, Math.round(w / 1.5));
    for (let i = 0; i < n; i++) {
      const cx = (w / n) * (i + 0.5);
      circle(c, S, cx, h * 0.45, Math.min(w / n, h) * 0.3, S.dark);
      circle(c, S, cx, h * 0.45, Math.min(w / n, h) * 0.18, S.fill);
      c.fillStyle = S.flame;
      c.fillRect(cx - 0.15, h * 0.86, 0.3, h * 0.1);
    }
  }

  function well(c, S, w, h) {
    // 井戸：石の井筒と水面、つるべの桶
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r * 0.95, S.soft);
    circle(c, S, w / 2, h / 2, r * 0.62, S.water);
    thin(c, S);
    line(c, w * 0.05, h / 2, w * 0.95, h / 2);
    normal(c, S);
    box(c, S, w * 0.68, h * 0.12, r * 0.36, r * 0.36, 0.05, S.wood);
  }

  function torii(c, S, w, h) {
    // 鳥居（上から見た図）：笠木と2本の柱
    c.save();
    rr(c, 0, h * 0.28, w, h * 0.44, 0.08);
    c.fillStyle = S.red;
    c.fill();
    c.stroke();
    [0.16, 0.84].forEach(px => circle(c, S, w * px, h / 2, Math.min(h * 0.48, 0.45), S.red));
    c.restore();
  }

  function komainu(c, S, w, h) {
    // 狛犬：台座と、座った獅子
    box(c, S, 0, 0, w, h, 0.05, S.soft);
    ellipse(c, S, w / 2, h * 0.58, w * 0.26, h * 0.3, S.fill);
    circle(c, S, w / 2, h * 0.3, Math.min(w, h) * 0.18, S.fill);
  }

  function lantern(c, S, w, h) {
    // 石灯籠：六角の笠と火袋
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 * 0.95;
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      if (i === 0) c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    glow(c, cx, cy, r * 0.7, '255, 190, 90');
    circle(c, S, cx, cy, r * 0.28, S.flame);
  }

  function temizuya(c, S, w, h) {
    // 手水舎：屋根（破線）の下に水盤と柄杓
    thin(c, S);
    dashed(c, S, true);
    rr(c, 0, 0, w, h, 0);
    c.stroke();
    dashed(c, S, false);
    normal(c, S);
    box(c, S, w * 0.18, h * 0.3, w * 0.64, h * 0.4, 0.08, S.soft);
    box(c, S, w * 0.24, h * 0.38, w * 0.52, h * 0.24, 0.05, S.water);
    thin(c, S);
    [0.35, 0.5, 0.65].forEach(px => line(c, w * px, h * 0.3, w * px - 0.15, h * 0.18));
    normal(c, S);
  }

  function butsudan(c, S, w, h) {
    // 仏壇：扉を開いた箱と灯明
    box(c, S, 0, 0, w, h * 0.7, 0.03, S.dark);
    box(c, S, w * 0.12, h * 0.06, w * 0.76, h * 0.56, 0.02, S.yellow);
    line(c, 0, h * 0.7, -w * 0.12, h * 0.98);
    line(c, w, h * 0.7, w * 1.12, h * 0.98);
    candleAt(c, S, w * 0.3, h * 0.34, 0.12);
    candleAt(c, S, w * 0.7, h * 0.34, 0.12);
  }

  function tokonoma(c, S, w, h) {
    // 床の間：一段上がった床板と掛け軸、花瓶
    box(c, S, 0, 0, w, h, 0, S.wood);
    box(c, S, w * 0.4, 0.04, w * 0.2, h * 0.16, 0, S.fill);
    circle(c, S, w * 0.78, h * 0.55, Math.min(w, h) * 0.16, S.soft);
    thin(c, S);
    line(c, 0, h * 0.92, w, h * 0.92);
    normal(c, S);
  }

  function hokora(c, S, w, h) {
    // 祠：小さな社。屋根の棟と扉
    box(c, S, w * 0.1, h * 0.1, w * 0.8, h * 0.8, 0.04, S.wood);
    thin(c, S);
    line(c, w * 0.1, h * 0.1, w / 2, h / 2);
    line(c, w * 0.9, h * 0.1, w / 2, h / 2);
    line(c, w * 0.1, h * 0.9, w / 2, h / 2);
    line(c, w * 0.9, h * 0.9, w / 2, h / 2);
    normal(c, S);
    box(c, S, w * 0.32, h * 0.82, w * 0.36, h * 0.16, 0.02, S.red);
  }

  function saisen(c, S, w, h) {
    // 賽銭箱：格子の口
    box(c, S, 0, 0, w, h, 0.03, S.wood);
    thin(c, S);
    const n = Math.max(3, Math.round(w / 0.25));
    for (let i = 1; i < n; i++) line(c, (w / n) * i, h * 0.2, (w / n) * i, h * 0.8);
    normal(c, S);
  }

  /* ---------- SF ---------- */

  function consoleDesk(c, S, w, h) {
    // 操作卓：奥にモニター、手前にボタン列
    box(c, S, 0, 0, w, h, 0.2, S.soft);
    const n = Math.max(1, Math.round(w / 1.2));
    const slot = w / n;
    for (let i = 0; i < n; i++) box(c, S, slot * i + slot * 0.12, h * 0.1, slot * 0.76, h * 0.38, 0.06, S.blue);
    c.fillStyle = S.line;
    for (let x = 0.3; x < w - 0.15; x += 0.35) { c.beginPath(); c.arc(x, h * 0.72, 0.06, 0, TAU); c.fill(); }
  }

  function pilotSeat(c, S, w, h) {
    // 操縦席：ひじ掛けに操作パネル
    box(c, S, w * 0.2, h * 0.08, w * 0.6, h * 0.7, w * 0.16);
    thin(c, S);
    line(c, w * 0.24, h * 0.32, w * 0.76, h * 0.32);
    normal(c, S);
    box(c, S, 0, h * 0.3, w * 0.18, h * 0.6, 0.05, S.dark);
    box(c, S, w * 0.82, h * 0.3, w * 0.18, h * 0.6, 0.05, S.dark);
  }

  function cryopod(c, S, w, h) {
    // 冷凍睡眠カプセル：丸いカプセルとガラス窓
    box(c, S, 0, 0, w, h, Math.min(w, h) * 0.48, S.soft);
    box(c, S, w * 0.18, h * 0.12, w * 0.64, h * 0.56, w * 0.3, S.water);
    thin(c, S);
    line(c, w * 0.1, h * 0.78, w * 0.9, h * 0.78);
    normal(c, S);
    c.fillStyle = S.blue;
    c.fillRect(w * 0.4, h * 0.84, w * 0.2, h * 0.06);
  }

  function reactor(c, S, w, h) {
    // 動力炉：二重の囲いと光る炉心
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    circle(c, S, cx, cy, r * 0.96, S.soft);
    c.save();
    c.setLineDash([S.lw * 4, S.lw * 3]);
    c.strokeStyle = S.yellow;
    c.lineWidth = S.lw * 2;
    c.beginPath(); c.arc(cx, cy, r * 0.8, 0, TAU); c.stroke();
    c.restore();
    circle(c, S, cx, cy, r * 0.6, S.dark);
    glow(c, cx, cy, r * 0.6, '90, 180, 255');
    circle(c, S, cx, cy, r * 0.26, S.blue);
  }

  function holoTable(c, S, w, h) {
    // ホログラム卓：丸い卓と投影された星図
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    circle(c, S, cx, cy, r * 0.95, S.soft);
    glow(c, cx, cy, r * 0.8, '90, 180, 255');
    thin(c, S);
    c.strokeStyle = S.blue;
    circle(c, S, cx, cy, r * 0.62, false);
    circle(c, S, cx, cy, r * 0.32, false);
    line(c, cx - r * 0.62, cy, cx + r * 0.62, cy);
    line(c, cx, cy - r * 0.62, cx, cy + r * 0.62);
    normal(c, S);
  }

  function hatch(c, S, w, h) {
    // 床・天井のハッチ：丸い扉とハンドル
    box(c, S, 0, 0, w, h, 0.1, S.soft);
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.4, S.dark);
    c.strokeStyle = S.fill;
    thin(c, S);
    line(c, w * 0.3, h / 2, w * 0.7, h / 2);
    line(c, w / 2, h * 0.3, w / 2, h * 0.7);
    normal(c, S);
  }

  /* ---------- 自然・キャンプ ---------- */

  function blob(c, w, h, seed, k = 9, jag = 0.18) {
    // 不規則な輪郭（岩など）。seed が同じなら同じ形
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    c.beginPath();
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      const f = 1 - jag + rnd() * jag;
      const px = w / 2 + Math.cos(a) * (w / 2) * f, py = h / 2 + Math.sin(a) * (h / 2) * f;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  function rock(c, S, w, h) {
    blob(c, w, h, Math.round(w * 37 + h * 101), 9, 0.28);
    c.fillStyle = S.soft;
    c.fill();
    c.stroke();
    thin(c, S);
    line(c, w * 0.3, h * 0.35, w * 0.55, h * 0.5);
    line(c, w * 0.55, h * 0.5, w * 0.62, h * 0.72);
    normal(c, S);
  }

  function tent(c, S, w, h) {
    // テント：四角い屋根と棟、手前（下）が入口
    box(c, S, 0, 0, w, h, 0.1, S.yellow);
    thin(c, S);
    line(c, 0, 0, w / 2, h * 0.5);
    line(c, w, 0, w / 2, h * 0.5);
    line(c, 0, h, w / 2, h * 0.5);
    line(c, w, h, w / 2, h * 0.5);
    normal(c, S);
    c.beginPath();
    c.moveTo(w * 0.36, h); c.lineTo(w / 2, h * 0.72); c.lineTo(w * 0.64, h); c.closePath();
    c.fillStyle = S.dark;
    c.fill();
    c.stroke();
  }

  function campfire(c, S, w, h) {
    // たき火：石の輪と組んだ薪
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2;
    glow(c, cx, cy, r * 1.1, '255, 150, 60');
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      circle(c, S, cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * 0.18, S.soft);
    }
    c.save();
    c.strokeStyle = S.line;
    c.lineWidth = S.lw * 2.2;
    line(c, cx - r * 0.42, cy - r * 0.3, cx + r * 0.42, cy + r * 0.3);
    line(c, cx - r * 0.42, cy + r * 0.3, cx + r * 0.42, cy - r * 0.3);
    c.restore();
    circle(c, S, cx, cy, r * 0.2, S.flame, true);
  }

  function picnicTable(c, S, w, h) {
    // ピクニックテーブル：天板と両側のベンチ
    box(c, S, 0.05, 0, w - 0.1, h * 0.22, 0.05, S.wood);
    box(c, S, 0, h * 0.3, w, h * 0.4, 0.05, S.wood);
    box(c, S, 0.05, h * 0.78, w - 0.1, h * 0.22, 0.05, S.wood);
  }

  function logSeat(c, S, w, h) {
    // 丸太（ベンチ・薪）
    box(c, S, 0, 0, w, h, Math.min(w, h) * 0.48, S.wood);
    thin(c, S);
    const r = Math.min(w, h) * 0.3;
    if (w >= h) { circle(c, S, w - r * 1.4, h / 2, r, false); line(c, r, h * 0.35, w - r * 2.6, h * 0.35); }
    else { circle(c, S, w / 2, h - r * 1.4, r, false); line(c, w * 0.35, r, w * 0.35, h - r * 2.6); }
    normal(c, S);
  }

  function bones(c, S, w, h) {
    // 骨：頭蓋骨と交差した骨
    c.save();
    c.strokeStyle = S.softLine;
    c.lineWidth = S.lw * 1.8;
    line(c, w * 0.08, h * 0.2, w * 0.92, h * 0.9);
    line(c, w * 0.92, h * 0.2, w * 0.08, h * 0.9);
    c.restore();
    circle(c, S, w / 2, h * 0.42, Math.min(w, h) * 0.26, S.fill);
    c.fillStyle = S.line;
    [0.4, 0.6].forEach(px => { c.beginPath(); c.arc(w * px, h * 0.4, Math.min(w, h) * 0.06, 0, TAU); c.fill(); });
  }

  function pit(c, S, w, h) {
    // 竪穴・落とし穴：深い穴
    blob(c, w, h, Math.round(w * 53 + h * 17), 11, 0.14);
    c.save();
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    c.fillStyle = g;
    c.fill();
    c.restore();
    c.stroke();
  }

  function boat(c, S, w, h) {
    // 小舟：先が上
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.quadraticCurveTo(w, h * 0.25, w * 0.94, h);
    c.lineTo(w * 0.06, h);
    c.quadraticCurveTo(0, h * 0.25, w / 2, 0);
    c.closePath();
    c.fillStyle = S.wood;
    c.fill();
    c.stroke();
    thin(c, S);
    line(c, w * 0.14, h * 0.45, w * 0.86, h * 0.45);
    line(c, w * 0.1, h * 0.75, w * 0.9, h * 0.75);
    normal(c, S);
  }

  /* ---------- 地下への入口 ---------- */

  function stairsDown(c, S, w, h) {
    // 地下へ下りる階段：奥（下）ほど暗くなり、矢印は下向き
    box(c, S, 0, 0, w, h, 0);
    const n = Math.max(2, Math.round(h / 0.5));
    for (let i = 0; i < n; i++) {
      c.fillStyle = S.dark;
      c.globalAlpha = 0.08 + (i / n) * 0.55;
      c.fillRect(0, (h / n) * i, w, h / n);
    }
    c.globalAlpha = 1;
    thin(c, S);
    for (let i = 1; i < n; i++) line(c, 0, (h / n) * i, w, (h / n) * i);
    normal(c, S);
    c.strokeStyle = S.accentLine;
    line(c, w / 2, 0.35, w / 2, h - 0.4);
    c.beginPath();
    c.moveTo(w / 2 - 0.3, h - 0.85);
    c.lineTo(w / 2, h - 0.35);
    c.lineTo(w / 2 + 0.3, h - 0.85);
    c.stroke();
    label(c, S, 'B', w / 2, 0.5, 0.42, S.line);
  }

  function trapdoor(c, S, w, h) {
    // 床の跳ね上げ戸（床下収納・地下室の入口）：板張りと蝶番、引き手の輪
    box(c, S, 0, 0, w, h, 0.04, S.wood);
    thin(c, S);
    for (let x = w / 4; x < w - 0.01; x += w / 4) line(c, x, 0.08, x, h - 0.08);
    normal(c, S);
    c.fillStyle = S.dark;
    c.fillRect(w * 0.12, 0.02, w * 0.16, 0.14);
    c.fillRect(w * 0.72, 0.02, w * 0.16, 0.14);
    c.beginPath();
    c.arc(w / 2, h * 0.78, Math.min(w, h) * 0.1, 0, TAU);
    c.stroke();
  }

  function ladder(c, S, w, h) {
    // はしご（屋根裏・地下・井戸の中へ）
    c.save();
    c.lineWidth = S.lw * 1.4;
    line(c, w * 0.18, 0.05, w * 0.18, h - 0.05);
    line(c, w * 0.82, 0.05, w * 0.82, h - 0.05);
    c.restore();
    for (let y = 0.3; y < h - 0.1; y += 0.45) line(c, w * 0.18, y, w * 0.82, y);
  }

  /* ---------- ファンタジー ---------- */

  function throne(c, S, w, h) {
    // 玉座：高い背もたれ（上）と赤い座面、肘掛け
    box(c, S, w * 0.08, 0, w * 0.84, h * 0.3, 0.08, S.yellow);
    box(c, S, w * 0.04, h * 0.26, w * 0.18, h * 0.6, 0.06, S.wood);
    box(c, S, w * 0.78, h * 0.26, w * 0.18, h * 0.6, 0.06, S.wood);
    box(c, S, w * 0.22, h * 0.28, w * 0.56, h * 0.56, 0.1, S.red);
    box(c, S, w * 0.14, h * 0.86, w * 0.72, h * 0.12, 0.03, S.soft);
    circle(c, S, w * 0.5, h * 0.13, Math.min(w, h) * 0.06, S.red);
  }

  function weaponRack(c, S, w, h) {
    // 武器ラック：壁際（上）の木枠に剣・槍・斧
    box(c, S, 0, 0, w, h * 0.38, 0.04, S.wood);
    const n = Math.max(3, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) {
      const x = (w / n) * (i + 0.5);
      c.save();
      c.lineWidth = S.lw * 1.3;
      line(c, x, h * 0.1, x, h * 0.92);
      c.restore();
      if (i % 3 === 0) { c.beginPath(); c.moveTo(x - 0.14, h * 0.82); c.lineTo(x + 0.14, h * 0.82); c.stroke(); }
      if (i % 3 === 1) { c.beginPath(); c.moveTo(x, h * 0.98); c.lineTo(x - 0.1, h * 0.8); c.lineTo(x + 0.1, h * 0.8); c.closePath(); c.fillStyle = S.dark; c.fill(); }
      if (i % 3 === 2) { c.beginPath(); c.arc(x + 0.1, h * 0.8, 0.16, -Math.PI / 2, Math.PI / 2); c.fillStyle = S.soft; c.fill(); c.stroke(); }
    }
  }

  function armorStand(c, S, w, h) {
    // 鎧（上から見た肩当てと兜）
    ellipse(c, S, w / 2, h / 2, w * 0.46, h * 0.3, S.soft);
    circle(c, S, w / 2, h / 2, Math.min(w, h) * 0.22, S.dark);
    thin(c, S);
    line(c, w * 0.5, h * 0.32, w * 0.5, h * 0.68);
    normal(c, S);
  }

  function chest(c, S, w, h) {
    // 宝箱：木の箱に金具の帯と錠前（手前が下）
    box(c, S, 0, 0, w, h, 0.08, S.wood);
    c.fillStyle = S.yellow;
    [0.18, 0.82].forEach(k => { c.fillRect(w * k - 0.08, 0, 0.16, h); c.strokeRect(w * k - 0.08, 0, 0.16, h); });
    thin(c, S);
    line(c, 0, h * 0.4, w, h * 0.4);
    normal(c, S);
    box(c, S, w / 2 - 0.13, h * 0.72, 0.26, h * 0.26, 0.04, S.yellow);
  }

  function cauldron(c, S, w, h) {
    // 大釜：黒い鉄の釜に煮える液、下に火
    const r = Math.min(w, h) / 2;
    glow(c, w / 2, h / 2, r * 1.05, '120, 220, 120');
    circle(c, S, w / 2, h / 2, r * 0.9, S.dark);
    circle(c, S, w / 2, h / 2, r * 0.68, S.green);
    thin(c, S);
    circle(c, S, w * 0.42, h * 0.42, r * 0.1, false);
    circle(c, S, w * 0.6, h * 0.56, r * 0.07, false);
    normal(c, S);
  }

  function crystalBall(c, S, w, h) {
    // 水晶玉：台座と光る球
    const r = Math.min(w, h) / 2;
    box(c, S, w / 2 - r * 0.8, h / 2 - r * 0.8, r * 1.6, r * 1.6, r * 0.3, S.wood);
    glow(c, w / 2, h / 2, r, '170, 140, 255');
    circle(c, S, w / 2, h / 2, r * 0.55, S.ritualSoft);
    circle(c, S, w * 0.44, h * 0.44, r * 0.12, S.fill, true);
  }

  function banner(c, S, w, h) {
    // 壁掛けの旗・タペストリー（上が壁）
    box(c, S, 0, 0, w, h * 0.35, 0.03, S.wood);
    box(c, S, w * 0.08, h * 0.25, w * 0.84, h * 0.7, 0.02, S.red);
    circle(c, S, w / 2, h * 0.6, Math.min(w, h) * 0.18, S.yellow);
  }

  function anvil(c, S, w, h) {
    // 金床：上から見た角と台
    box(c, S, w * 0.25, h * 0.1, w * 0.5, h * 0.8, 0.05, S.wood);
    c.beginPath();
    c.moveTo(0, h * 0.3); c.lineTo(w * 0.78, h * 0.25); c.lineTo(w, h * 0.5); c.lineTo(w * 0.78, h * 0.75); c.lineTo(0, h * 0.7);
    c.closePath();
    c.fillStyle = S.dark;
    c.fill();
    c.stroke();
  }

  function forge(c, S, w, h) {
    // 鍛冶炉：石の炉床に赤い炭
    box(c, S, 0, 0, w, h, 0.2, S.soft);
    glow(c, w / 2, h * 0.55, Math.min(w, h) * 0.55, '255, 120, 40');
    box(c, S, w * 0.2, h * 0.3, w * 0.6, h * 0.5, 0.1, S.dark);
    circle(c, S, w * 0.4, h * 0.55, 0.12, S.flame, true);
    circle(c, S, w * 0.6, h * 0.5, 0.1, S.flame, true);
  }

  function questBoard(c, S, w, h) {
    // 依頼掲示板：壁際の板に貼られた紙
    box(c, S, 0, 0, w, h, 0.04, S.wood);
    const n = Math.max(2, Math.floor(w / 0.6));
    for (let i = 0; i < n; i++) {
      const x = (w / n) * i + 0.08;
      c.save();
      c.fillStyle = S.fill;
      c.fillRect(x, h * 0.2, w / n - 0.16, h * 0.6);
      thin(c, S);
      c.strokeRect(x, h * 0.2, w / n - 0.16, h * 0.6);
      c.restore();
    }
  }

  function bunkBed(c, S, w, h) {
    // 二段ベッド：枕が上、手前にはしご
    box(c, S, 0, 0, w, h, 0.08, S.wood);
    box(c, S, w * 0.08, h * 0.04, w * 0.84, h * 0.88, 0.06, S.fill);
    box(c, S, w * 0.16, h * 0.07, w * 0.68, h * 0.14, 0.08, S.soft);
    thin(c, S);
    line(c, w * 0.08, h * 0.4, w * 0.92, h * 0.4);
    line(c, w * 0.92, h * 0.55, w, h * 0.55);
    line(c, w * 0.92, h * 0.7, w, h * 0.7);
    line(c, w * 0.92, h * 0.85, w, h * 0.85);
    normal(c, S);
  }

  function spikeTrap(c, S, w, h) {
    // 床の罠：トゲの並んだ枠
    box(c, S, 0, 0, w, h, 0.05, S.dark);
    c.fillStyle = S.fill;
    for (let x = 0.3; x < w - 0.1; x += 0.45) {
      for (let y = 0.3; y < h - 0.1; y += 0.45) {
        c.beginPath();
        c.moveTo(x, y - 0.14); c.lineTo(x + 0.12, y + 0.1); c.lineTo(x - 0.12, y + 0.1);
        c.closePath(); c.fill(); c.stroke();
      }
    }
  }

  function torch(c, S, w, h) {
    // 壁の松明（上が壁）
    glow(c, w / 2, h * 0.6, Math.max(w, h) * 0.9, '255, 160, 60');
    box(c, S, w * 0.35, 0, w * 0.3, h * 0.5, 0.04, S.wood);
    circle(c, S, w / 2, h * 0.62, Math.min(w, h) * 0.22, S.flame);
  }

  function hay(c, S, w, h) {
    // 干し草の束
    box(c, S, 0, 0, w, h, 0.2, S.yellow);
    thin(c, S);
    for (let x = 0.3; x < w; x += 0.35) line(c, x, 0.15, x - 0.15, h - 0.15);
    line(c, 0, h * 0.35, w, h * 0.35);
    line(c, 0, h * 0.65, w, h * 0.65);
    normal(c, S);
  }

  function statue(c, S, w, h) {
    // 石像：四角い台座と人の形
    box(c, S, 0, 0, w, h, 0.05, S.soft);
    circle(c, S, w / 2, h * 0.32, Math.min(w, h) * 0.16, S.fill);
    ellipse(c, S, w / 2, h * 0.62, w * 0.3, h * 0.2, S.fill);
  }

  function fountain(c, S, w, h) {
    // 噴水：石の縁、水盤、中央の柱
    const r = Math.min(w, h) / 2;
    circle(c, S, w / 2, h / 2, r * 0.97, S.soft);
    circle(c, S, w / 2, h / 2, r * 0.8, S.water);
    circle(c, S, w / 2, h / 2, r * 0.32, S.soft);
    circle(c, S, w / 2, h / 2, r * 0.12, S.water);
  }

  function gazebo(c, S, w, h) {
    // 東屋：八角形の屋根と柱
    const r = Math.min(w, h) / 2;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const px = w / 2 + Math.cos(a) * r * 0.96, py = h / 2 + Math.sin(a) * r * 0.96;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = S.wood;
    c.fill();
    c.stroke();
    thin(c, S);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      line(c, w / 2, h / 2, w / 2 + Math.cos(a) * r * 0.96, h / 2 + Math.sin(a) * r * 0.96);
    }
    normal(c, S);
  }

  function hedge(c, S, w, h) {
    // 生け垣：細長い植え込み
    box(c, S, 0, 0, w, h, Math.min(w, h) * 0.45, S.green);
    c.strokeStyle = S.greenLine;
    thin(c, S);
    const long = w >= h;
    for (let k = 0.4; k < (long ? w : h) - 0.2; k += 0.5) {
      c.beginPath();
      if (long) c.arc(k, h / 2, Math.min(h * 0.28, 0.22), 0, TAU); else c.arc(w / 2, k, Math.min(w * 0.28, 0.22), 0, TAU);
      c.stroke();
    }
    normal(c, S);
  }

  function grave(c, S, w, h) {
    // 墓石：上が墓標、下に土の盛り
    box(c, S, w * 0.1, 0, w * 0.8, h * 0.32, 0.12, S.soft);
    box(c, S, w * 0.05, h * 0.36, w * 0.9, h * 0.62, 0.25, S.wood);
    thin(c, S);
    line(c, w / 2, h * 0.06, w / 2, h * 0.26);
    line(c, w * 0.38, h * 0.13, w * 0.62, h * 0.13);
    normal(c, S);
  }

  function shed(c, S, w, h) {
    // 物置：屋根の棟と扉
    box(c, S, 0, 0, w, h, 0.04, S.soft);
    thin(c, S);
    line(c, 0, h / 2, w, h / 2);
    for (let y = 0.3; y < h; y += 0.3) { line(c, 0, y, w * 0.08, y); }
    normal(c, S);
    c.fillStyle = S.dark;
    c.fillRect(w * 0.3, h - 0.12, w * 0.4, 0.12);
  }

  /* 下書き用の仮の絵（外形と短い名前）。素材パックの絵ができたら置き換える */
  function todo(code) {
    return (c, S, w, h) => {
      box(c, S, 0, 0, w, h, Math.min(w, h) * 0.08, S.soft);
      thin(c, S);
      dashed(c, S, true);
      line(c, 0, 0, w, h);
      line(c, w, 0, 0, h);
      dashed(c, S, false);
      normal(c, S);
      label(c, S, code, w / 2, h / 2, Math.min(h * 0.5, w / Math.max(1, code.length) * 0.9));
    };
  }

  /* ---------- PACK A: 構造・損傷 / 設備・インフラ / オフィス・商業の追加 ---------- */

  /* (PACK A の描画関数はここ) */

  /* ---------- PACK B: 鉄道 / 道路・車両 / 船舶 / 医療・文化施設の追加 ---------- */

  /* (PACK B の描画関数はここ) */

  /* ---------- PACK C: 物流・工業 / 屋外・道路 / 和風屋敷・庭園・寺院 ---------- */

  /* (PACK C の描画関数はここ) */

  /* ---------- PACK D: 探索・事件 / ホラー・オカルト / NPC・敵 ---------- */

  /* (PACK D の描画関数はここ) */

  /* ---------- カタログ ---------- */

  const GROUPS = [
    { id: 'structure', name: { ja: '構造・建築', en: 'Structure', ko: '구조·건축' } },
    { id: 'home', name: { ja: '住宅・家具', en: 'Home furniture', ko: '주택·가구' } },
    { id: 'kitchen', name: { ja: 'キッチン・水回り', en: 'Kitchen & bath', ko: '주방·욕실' } },
    { id: 'office', name: { ja: 'オフィス・商業', en: 'Office & retail', ko: '사무·상업' } },
    { id: 'medical', name: { ja: '医療・研究', en: 'Medical & lab', ko: '의료·연구' } },
    { id: 'culture', name: { ja: '学校・文化施設', en: 'School & culture', ko: '학교·문화 시설' } },
    { id: 'leisure', name: { ja: '娯楽・イベント', en: 'Leisure & events', ko: '오락·이벤트' } },
    { id: 'infra', name: { ja: '設備・インフラ', en: 'Utilities', ko: '설비·인프라' } },
    { id: 'vehicle', name: { ja: '交通・乗り物', en: 'Vehicles & transit', ko: '교통·탈것' } },
    { id: 'industry', name: { ja: '物流・工業', en: 'Logistics & industry', ko: '물류·공업' } },
    { id: 'outdoor', name: { ja: '屋外・自然', en: 'Outdoor & nature', ko: '옥외·자연' } },
    { id: 'japanese', name: { ja: '和風・歴史', en: 'Japanese & historic', ko: '일본풍·역사' } },
    { id: 'investigation', name: { ja: '探索・事件', en: 'Investigation', ko: '탐색·사건' } },
    { id: 'occult', name: { ja: 'ホラー・オカルト', en: 'Horror & occult', ko: '호러·오컬트' } },
    { id: 'npc', name: { ja: 'NPC・敵', en: 'NPCs & enemies', ko: 'NPC·적' } },
    { id: 'sf', name: { ja: 'SF', en: 'Sci-fi', ko: 'SF' } },
    { id: 'fantasy', name: { ja: 'ファンタジー', en: 'Fantasy', ko: '판타지' } }
  ];

  const A = (id, group, w, h, draw, name, extra) => ({ id, group, w, h, draw, name, ...(extra || {}) });

  const ASSETS = [
    A('stairs', 'structure', 2, 5, stairs, { ja: '階段', en: 'Stairs', ko: '계단' }, { vertical: true }),
    A('stairs_u', 'structure', 5, 5, stairsU, { ja: '折り返し階段', en: 'U-turn stairs', ko: '꺾인 계단' }, { vertical: true }),
    A('spiral', 'structure', 4, 4, spiral, { ja: '螺旋階段', en: 'Spiral stairs', ko: '나선 계단' }, { vertical: true }),
    A('elevator', 'structure', 4, 4, elevator, { ja: 'エレベーター', en: 'Elevator', ko: '엘리베이터' }, { vertical: true }),
    A('stairs_down', 'structure', 2, 5, stairsDown, { ja: '地下への階段', en: 'Stairs down (basement)', ko: '지하로 가는 계단' }),
    A('trapdoor', 'structure', 2, 2, trapdoor, { ja: '床の扉（地下・床下へ）', en: 'Trapdoor', ko: '바닥 문(지하로)' }),
    A('ladder', 'structure', 1.2, 3, ladder, { ja: 'はしご', en: 'Ladder', ko: '사다리' }),
    A('pillar', 'structure', 1, 1, pillar, { ja: '柱', en: 'Pillar', ko: '기둥' }),
    A('fireplace', 'structure', 3, 1.2, fireplace, { ja: '暖炉', en: 'Fireplace', ko: '벽난로' }),

    A('sofa2', 'home', 3.2, 1.8, sofa(2), { ja: 'ソファ（2人掛け）', en: 'Sofa (2 seats)', ko: '소파(2인)' }),
    A('sofa3', 'home', 4.4, 1.8, sofa(3), { ja: 'ソファ（3人掛け）', en: 'Sofa (3 seats)', ko: '소파(3인)' }),
    A('sofaL', 'home', 5, 4, sofaL, { ja: 'L字ソファ', en: 'L-shaped sofa', ko: 'L자 소파' }),
    A('armchair', 'home', 1.8, 1.8, armchair, { ja: '一人掛けチェア', en: 'Armchair', ko: '1인용 의자' }),
    A('lowtable', 'home', 2.2, 1.2, lowtable, { ja: 'ローテーブル', en: 'Coffee table', ko: '낮은 테이블' }),
    A('dining2', 'home', 2.2, 3.2, dining(1), { ja: 'ダイニング（2人）', en: 'Dining set (2)', ko: '식탁 세트(2인)' }),
    A('dining4', 'home', 3, 3.4, dining(2), { ja: 'ダイニング（4人）', en: 'Dining set (4)', ko: '식탁 세트(4인)' }),
    A('dining6', 'home', 4.4, 3.4, dining(3), { ja: 'ダイニング（6人）', en: 'Dining set (6)', ko: '식탁 세트(6인)' }),
    A('dining_round', 'home', 3.4, 3.4, roundDining, { ja: '丸テーブル（4人）', en: 'Round table (4)', ko: '원형 테이블(4인)' }),
    A('table', 'home', 2.8, 1.6, table, { ja: 'テーブル', en: 'Table', ko: '테이블' }),
    A('table_round', 'home', 1.8, 1.8, tableRound, { ja: '丸テーブル', en: 'Round table', ko: '원형 테이블' }),
    A('chair', 'home', 1, 1, chairItem, { ja: '椅子', en: 'Chair', ko: '의자' }),
    A('tv', 'home', 3.2, 0.9, tv, { ja: 'テレビ台', en: 'TV stand', ko: 'TV 받침대' }),
    A('bookshelf', 'home', 3, 0.8, bookshelf, { ja: '本棚', en: 'Bookshelf', ko: '책장' }),
    A('cabinet', 'home', 3, 1, cabinet, { ja: '棚・キャビネット', en: 'Cabinet', ko: '수납장' }),
    A('rug', 'home', 4, 3, rug, { ja: 'ラグ', en: 'Rug', ko: '러그' }, { under: true }),
    A('plant', 'home', 1.2, 1.2, plant, { ja: '観葉植物', en: 'Plant', ko: '화분' }),
    A('lamp', 'home', 0.9, 0.9, lamp, { ja: 'フロアランプ', en: 'Floor lamp', ko: '스탠드' }),
    A('piano', 'home', 3, 3.8, pianoGrand, { ja: 'グランドピアノ', en: 'Grand piano', ko: '그랜드 피아노' }),
    A('piano_up', 'home', 3, 1.3, pianoUpright, { ja: 'アップライトピアノ', en: 'Upright piano', ko: '업라이트 피아노' }),

    A('bed_single', 'home', 2, 4, bed(1), { ja: 'シングルベッド', en: 'Single bed', ko: '싱글 침대' }),
    A('bed_double', 'home', 2.8, 4, bed(2), { ja: 'ダブルベッド', en: 'Double bed', ko: '더블 침대' }),
    A('futon', 'home', 2, 4, futon, { ja: '布団', en: 'Futon', ko: '이불(요)' }),
    A('wardrobe', 'home', 3, 1.2, wardrobe, { ja: 'クローゼット・洋服ダンス', en: 'Wardrobe', ko: '옷장' }),
    A('dresser', 'home', 2, 0.9, dresser, { ja: 'チェスト・ドレッサー', en: 'Dresser', ko: '서랍장' }),
    A('nightstand', 'home', 0.9, 0.9, nightstand, { ja: 'ナイトテーブル', en: 'Nightstand', ko: '협탁' }),
    A('desk', 'home', 2.4, 1.2, desk, { ja: '机', en: 'Desk', ko: '책상' }),
    A('desk_set', 'home', 2.4, 2.4, deskSet, { ja: '机と椅子', en: 'Desk & chair', ko: '책상과 의자' }),

    A('kitchen', 'kitchen', 5, 1.3, kitchen, { ja: 'システムキッチン', en: 'Kitchen counter', ko: '시스템 키친' }),
    A('sink', 'kitchen', 2, 1.3, sinkItem, { ja: 'シンク', en: 'Sink', ko: '싱크대' }),
    A('stove', 'kitchen', 2, 1.3, stove, { ja: 'コンロ', en: 'Stove', ko: '가스레인지' }),
    A('fridge', 'kitchen', 1.4, 1.4, fridge, { ja: '冷蔵庫', en: 'Refrigerator', ko: '냉장고' }),
    A('island', 'kitchen', 4, 2, island, { ja: 'キッチンカウンター（アイランド）', en: 'Kitchen island', ko: '아일랜드 식탁' }),
    A('counter', 'kitchen', 4, 1.2, counterBar, { ja: 'カウンター・作業台', en: 'Counter', ko: '카운터·작업대' }),
    A('cupboard', 'kitchen', 3, 0.9, cabinet, { ja: '食器棚', en: 'Cupboard', ko: '찬장' }),

    A('toilet', 'kitchen', 1, 1.6, toilet, { ja: 'トイレ', en: 'Toilet', ko: '변기' }),
    A('washbasin', 'kitchen', 1.6, 1.1, washbasin, { ja: '洗面台', en: 'Washbasin', ko: '세면대' }),
    A('bathtub', 'kitchen', 1.6, 3, bathtub, { ja: '浴槽', en: 'Bathtub', ko: '욕조' }),
    A('unitbath', 'kitchen', 3, 3.2, unitbath, { ja: 'ユニットバス', en: 'Bathtub & wash area', ko: '욕조+씻는 곳' }),
    A('shower', 'kitchen', 1.8, 1.8, shower, { ja: 'シャワー', en: 'Shower', ko: '샤워' }),
    A('washer', 'kitchen', 1.3, 1.3, washer, { ja: '洗濯機', en: 'Washing machine', ko: '세탁기' }),

    A('office_desk', 'office', 2.4, 1.4, desk, { ja: '事務机', en: 'Office desk', ko: '사무용 책상' }),
    A('meeting6', 'office', 4.8, 3.6, meeting(3), { ja: '会議テーブル（6人）', en: 'Meeting table (6)', ko: '회의 테이블(6인)' }),
    A('reception', 'office', 5, 1.4, reception, { ja: '受付カウンター', en: 'Reception desk', ko: '접수 카운터' }),
    A('locker', 'office', 3, 1, locker, { ja: 'ロッカー', en: 'Lockers', ko: '사물함' }),
    A('filing', 'office', 1, 1.2, filing, { ja: '書類棚', en: 'Filing cabinet', ko: '서류함' }),
    A('whiteboard', 'office', 3, 0.4, whiteboard, { ja: 'ホワイトボード・黒板', en: 'Whiteboard', ko: '화이트보드' }),
    A('copier', 'office', 1.4, 1.2, copier, { ja: 'コピー機', en: 'Copier', ko: '복사기' }),
    A('bench', 'office', 4, 1, bench, { ja: 'ベンチ・長椅子', en: 'Bench', ko: '벤치' }),
    A('vending', 'office', 2, 1.4, vending, { ja: '自動販売機', en: 'Vending machine', ko: '자판기' }),

    A('hospital_bed', 'medical', 2.2, 4.2, hospitalBed, { ja: '病院ベッド', en: 'Hospital bed', ko: '병원 침대' }),
    A('exam_bed', 'medical', 1.4, 3.6, examBed, { ja: '診察台', en: 'Exam bed', ko: '진찰대' }),
    A('op_table', 'medical', 3, 4.4, opTable, { ja: '手術台', en: 'Operating table', ko: '수술대' }),
    A('med_cabinet', 'medical', 3, 1, medCabinet, { ja: '薬品棚', en: 'Medicine cabinet', ko: '약품장' }),
    A('wheelchair', 'medical', 1.3, 1.4, wheelchair, { ja: '車椅子', en: 'Wheelchair', ko: '휠체어' }),
    A('iv_stand', 'medical', 0.7, 0.7, ivStand, { ja: '点滴スタンド', en: 'IV stand', ko: '링거대' }),
    A('curtain', 'medical', 4, 0.3, curtain, { ja: 'カーテン（仕切り）', en: 'Privacy curtain', ko: '칸막이 커튼' }),
    A('morgue', 'medical', 4.2, 2.4, morgue, { ja: '遺体安置庫', en: 'Morgue drawers', ko: '시신 보관함' }),
    A('lab_bench', 'medical', 4, 1.6, labBench, { ja: '実験台', en: 'Lab bench', ko: '실험대' }),
    A('tank', 'medical', 2.4, 2.4, tank, { ja: '培養槽・タンク', en: 'Specimen tank', ko: '배양조·탱크' }),
    A('rack', 'medical', 1.4, 2, rack, { ja: 'サーバーラック', en: 'Server rack', ko: '서버 랙' }),

    A('school_desk', 'culture', 1.4, 2, schoolDesk, { ja: '学校の机と椅子', en: 'School desk', ko: '학교 책상' }),
    A('lectern', 'culture', 1.8, 1.1, lectern, { ja: '教卓・演台', en: 'Lectern', ko: '교탁·연단' }),
    A('lecture_row', 'culture', 7.2, 2, lectureRow, { ja: '講義室の机（固定席）', en: 'Lecture desk row', ko: '강의실 고정 책상' }),
    A('bookstack', 'culture', 4, 1.4, bookstack, { ja: '両面書架', en: 'Library stack', ko: '양면 서가' }),

    A('stage', 'leisure', 12, 6, stageFloor, { ja: 'ステージ', en: 'Stage', ko: '무대' }, { under: true }),
    A('seats', 'leisure', 6, 1.2, seatRow, { ja: '客席（1列）', en: 'Seat row', ko: '객석(1열)' }),
    A('pew', 'leisure', 6, 1.2, pew, { ja: '長椅子（教会）', en: 'Pew', ko: '신도석' }),
    A('speaker', 'leisure', 1.2, 1, speakerBox, { ja: 'スピーカー', en: 'Speaker', ko: '스피커' }),
    A('drums', 'leisure', 3.2, 2.8, drumKit, { ja: 'ドラムセット', en: 'Drum kit', ko: '드럼 세트' }),
    A('mixer', 'leisure', 3, 1.4, mixerDesk, { ja: '音響卓（PA）', en: 'Mixing desk', ko: '음향 콘솔' }),
    A('stool', 'leisure', 0.8, 0.8, stool, { ja: 'スツール', en: 'Stool', ko: '스툴' }),
    A('booth', 'leisure', 3, 4, booth, { ja: 'ボックス席', en: 'Booth', ko: '부스석' }),
    A('billiards', 'leisure', 5, 2.8, billiards, { ja: 'ビリヤード台', en: 'Pool table', ko: '당구대' }),
    A('banquet_round', 'leisure', 5.6, 5.6, banquetRound, { ja: '宴会テーブル（8人）', en: 'Banquet table (8)', ko: '연회 테이블(8인)' }),
    A('pool', 'leisure', 12, 25, pool, { ja: 'プール', en: 'Swimming pool', ko: '수영장' }, { under: true }),
    A('deck_chair', 'leisure', 1.4, 3.6, deckChair, { ja: 'デッキチェア', en: 'Sun lounger', ko: '선베드' }),
    A('treadmill', 'leisure', 1.8, 4, treadmill, { ja: 'ランニングマシン', en: 'Treadmill', ko: '러닝머신' }),
    A('exercise_bike', 'leisure', 1.2, 2.6, exerciseBike, { ja: 'エアロバイク', en: 'Exercise bike', ko: '실내 자전거' }),
    A('weight_bench', 'leisure', 3, 3.2, weightBench, { ja: 'ベンチプレス', en: 'Weight bench', ko: '벤치프레스' }),
    A('dumbbell_rack', 'leisure', 3, 1, dumbbellRack, { ja: 'ダンベルラック', en: 'Dumbbell rack', ko: '덤벨 랙' }),

    A('evidence', 'investigation', 0.9, 0.9, evidence, { ja: '証拠マーカー', en: 'Evidence marker', ko: '증거 마커' }, { labelInside: true }),
    A('clue', 'investigation', 1, 1, markerIcon('?', 'blue'), { ja: '手がかり（？）', en: 'Clue marker (?)', ko: '단서 마커(?)' }),
    A('memo', 'investigation', 0.8, 0.6, memo, { ja: 'メモ・紙片', en: 'Note', ko: '메모·종잇조각' }),
    A('diary', 'investigation', 1, 0.8, diary, { ja: '日記・手帳', en: 'Diary', ko: '일기장·수첩' }),
    A('key', 'investigation', 0.9, 0.45, keyItem, { ja: '鍵', en: 'Key', ko: '열쇠' }),
    A('knife', 'investigation', 1.2, 0.4, knife, { ja: '刃物', en: 'Knife', ko: '칼' }),
    A('photo', 'investigation', 0.8, 0.7, photo, { ja: '写真', en: 'Photo', ko: '사진' }),
    A('phone', 'investigation', 0.5, 0.9, phone, { ja: '携帯電話', en: 'Phone', ko: '휴대전화' }),
    A('pills', 'investigation', 0.6, 0.7, pills, { ja: '薬瓶', en: 'Pill bottle', ko: '약병' }),
    A('idol', 'occult', 0.9, 0.9, idol, { ja: '奇妙な像', en: 'Strange idol', ko: '기묘한 석상' }),
    A('danger', 'investigation', 1, 1, danger, { ja: '危険（！）', en: 'Danger (!)', ko: '위험(!)' }),
    A('blood', 'investigation', 2, 2, blood, { ja: '血痕', en: 'Bloodstain', ko: '핏자국' }, { under: true }),
    A('body', 'investigation', 2.2, 4, body, { ja: '人型の輪郭', en: 'Body outline', ko: '사람 윤곽' }, { under: true }),
    A('footprints', 'investigation', 1, 3, footprints, { ja: '足跡', en: 'Footprints', ko: '발자국' }, { under: true }),
    A('debris', 'structure', 3, 2.4, debris, { ja: '瓦礫', en: 'Debris', ko: '잔해' }),
    A('glass', 'investigation', 1.6, 1.6, glass, { ja: '割れたガラス', en: 'Broken glass', ko: '깨진 유리' }, { under: true }),
    A('magic_circle', 'occult', 5, 5, magicCircle, { ja: '魔法陣', en: 'Ritual circle', ko: '마법진' }, { under: true }),
    A('altar', 'occult', 3, 1.6, altar, { ja: '祭壇', en: 'Altar', ko: '제단' }),
    A('candle', 'occult', 0.8, 0.8, candle, { ja: '燭台', en: 'Candle', ko: '촛대' }),
    A('cage', 'occult', 3, 3, cage, { ja: '檻・鉄格子', en: 'Cage', ko: '우리·쇠창살' }),
    A('coffin', 'occult', 1.8, 4, coffin, { ja: '棺', en: 'Coffin', ko: '관' }),
    A('crate', 'industry', 1.6, 1.6, crate, { ja: '木箱', en: 'Crate', ko: '나무 상자' }),
    A('barrel', 'industry', 1.2, 1.2, barrel, { ja: '樽', en: 'Barrel', ko: '술통' }),
    A('safe', 'investigation', 1.2, 1.2, safe, { ja: '金庫', en: 'Safe', ko: '금고' }),
    A('tape', 'investigation', 6, 0.35, tape, { ja: '立入禁止テープ', en: 'Police tape', ko: '출입금지 테이프' }),

    A('car', 'vehicle', 4, 9, car, { ja: '乗用車', en: 'Car', ko: '승용차' }),
    A('tree', 'outdoor', 3, 3, tree, { ja: '木', en: 'Tree', ko: '나무' }),
    A('bush', 'outdoor', 1.6, 1.6, bush, { ja: '植え込み', en: 'Shrub', ko: '관목' }),
    A('garden_bench', 'outdoor', 3, 1, outdoorBench, { ja: '屋外ベンチ', en: 'Garden bench', ko: '옥외 벤치' }),

    A('barber_chair', 'japanese', 1.6, 2, barberChair, { ja: '理容椅子', en: 'Barber chair', ko: '이발 의자' }),
    A('gramophone', 'japanese', 1.4, 1.4, gramophone, { ja: '蓄音機', en: 'Gramophone', ko: '축음기' }),
    A('irori', 'japanese', 3, 3, irori, { ja: '囲炉裏', en: 'Irori hearth', ko: '이로리(화로)' }),
    A('kamado', 'japanese', 3, 1.4, kamado, { ja: 'かまど', en: 'Kamado stove', ko: '아궁이' }),
    A('butsudan', 'japanese', 1.8, 1.2, butsudan, { ja: '仏壇', en: 'Buddhist altar', ko: '불단' }),
    A('tokonoma', 'japanese', 3.6, 1.4, tokonoma, { ja: '床の間', en: 'Tokonoma alcove', ko: '도코노마' }),
    A('well', 'japanese', 2.2, 2.2, well, { ja: '井戸', en: 'Well', ko: '우물' }),
    A('torii', 'japanese', 8, 1.2, torii, { ja: '鳥居', en: 'Torii gate', ko: '도리이' }),
    A('komainu', 'japanese', 1.4, 1.4, komainu, { ja: '狛犬', en: 'Komainu guardian', ko: '고마이누' }),
    A('lantern', 'japanese', 1.2, 1.2, lantern, { ja: '石灯籠', en: 'Stone lantern', ko: '석등' }),
    A('temizuya', 'japanese', 4, 3, temizuya, { ja: '手水舎', en: 'Purification fountain', ko: '데미즈야' }),
    A('hokora', 'japanese', 1.6, 1.6, hokora, { ja: '祠', en: 'Small shrine', ko: '사당' }),
    A('saisen', 'japanese', 2.4, 1, saisen, { ja: '賽銭箱', en: 'Offering box', ko: '새전함' }),

    A('console', 'sf', 3.6, 1.4, consoleDesk, { ja: '操作卓・コンソール', en: 'Console', ko: '콘솔' }),
    A('pilot_seat', 'sf', 1.6, 1.8, pilotSeat, { ja: '操縦席', en: 'Pilot seat', ko: '조종석' }),
    A('cryopod', 'sf', 1.8, 4, cryopod, { ja: '冷凍睡眠カプセル', en: 'Cryopod', ko: '냉동 수면 캡슐' }),
    A('reactor', 'sf', 5, 5, reactor, { ja: '動力炉', en: 'Reactor', ko: '동력로' }),
    A('holo_table', 'sf', 3.4, 3.4, holoTable, { ja: 'ホログラム卓', en: 'Holo table', ko: '홀로그램 테이블' }),
    A('hatch', 'sf', 2, 2, hatch, { ja: 'ハッチ', en: 'Hatch', ko: '해치' }),

    A('rock', 'outdoor', 2.4, 2, rock, { ja: '岩', en: 'Rock', ko: '바위' }),
    A('tent', 'outdoor', 4, 4, tent, { ja: 'テント', en: 'Tent', ko: '텐트' }),
    A('campfire', 'outdoor', 1.6, 1.6, campfire, { ja: 'たき火', en: 'Campfire', ko: '모닥불' }),
    A('picnic', 'outdoor', 3.6, 3, picnicTable, { ja: 'ピクニックテーブル', en: 'Picnic table', ko: '피크닉 테이블' }),
    A('log', 'outdoor', 3, 0.8, logSeat, { ja: '丸太', en: 'Log', ko: '통나무' }),
    A('bones', 'occult', 1.4, 1.2, bones, { ja: '骨', en: 'Bones', ko: '뼈' }, { under: true }),
    A('pit', 'outdoor', 2.4, 2.4, pit, { ja: '竪穴・落とし穴', en: 'Pit', ko: '구덩이' }),
    A('boat', 'vehicle', 2.2, 5, boat, { ja: '小舟', en: 'Rowboat', ko: '작은 배' }),
    A('hedge', 'outdoor', 6, 1, hedge, { ja: '生け垣', en: 'Hedge', ko: '생울타리' }),
    A('fountain', 'outdoor', 4, 4, fountain, { ja: '噴水', en: 'Fountain', ko: '분수' }),
    A('gazebo', 'outdoor', 5, 5, gazebo, { ja: '東屋（ガゼボ）', en: 'Gazebo', ko: '정자' }),
    A('grave', 'outdoor', 1.6, 2.6, grave, { ja: '墓', en: 'Grave', ko: '무덤' }),
    A('shed', 'outdoor', 4, 3, shed, { ja: '物置', en: 'Shed', ko: '창고(헛간)' }),
    A('throne', 'fantasy', 2.4, 2.2, throne, { ja: '玉座', en: 'Throne', ko: '왕좌' }),
    A('weapon_rack', 'fantasy', 3, 1, weaponRack, { ja: '武器ラック', en: 'Weapon rack', ko: '무기 거치대' }),
    A('armor_stand', 'fantasy', 1.2, 1, armorStand, { ja: '鎧', en: 'Armor stand', ko: '갑옷' }),
    A('chest', 'fantasy', 1.6, 1, chest, { ja: '宝箱', en: 'Treasure chest', ko: '보물상자' }),
    A('cauldron', 'fantasy', 1.6, 1.6, cauldron, { ja: '大釜', en: 'Cauldron', ko: '큰 솥' }),
    A('crystal_ball', 'fantasy', 1, 1, crystalBall, { ja: '水晶玉', en: 'Crystal ball', ko: '수정구' }),
    A('banner', 'fantasy', 2, 0.6, banner, { ja: '旗・タペストリー', en: 'Banner', ko: '깃발·태피스트리' }),
    A('anvil', 'fantasy', 1.6, 1, anvil, { ja: '金床', en: 'Anvil', ko: '모루' }),
    A('forge', 'fantasy', 3, 2, forge, { ja: '鍛冶炉', en: 'Forge', ko: '대장간 화로' }),
    A('quest_board', 'fantasy', 3, 0.5, questBoard, { ja: '依頼掲示板', en: 'Quest board', ko: '의뢰 게시판' }),
    A('bunk_bed', 'fantasy', 2, 4, bunkBed, { ja: '二段ベッド', en: 'Bunk bed', ko: '2층 침대' }),
    A('spike_trap', 'fantasy', 2, 2, spikeTrap, { ja: 'トゲの罠', en: 'Spike trap', ko: '가시 함정' }),
    A('torch', 'fantasy', 0.8, 0.8, torch, { ja: '壁の松明', en: 'Wall torch', ko: '벽 횃불' }),
    A('hay', 'fantasy', 2, 1.4, hay, { ja: '干し草', en: 'Hay bale', ko: '건초' }),
    A('statue', 'fantasy', 1.6, 1.6, statue, { ja: '石像', en: 'Statue', ko: '석상' }),
    /* ===== PACK A: 構造・損傷 / 設備・インフラ / オフィス・商業の追加 ===== */
    A('crack_wall', 'structure', 3, 0.8, todo('ヒビ'), { ja: 'ヒビの入った壁（重ねる）', en: 'Cracked wall (overlay)', ko: '금 간 벽(겹치기)' }, { overWall: true, tags: ['damaged', 'ruins'] }),
    A('collapse_wall', 'structure', 3, 1.6, todo('崩落'), { ja: '崩れた壁（重ねる）', en: 'Collapsed wall (overlay)', ko: '무너진 벽(겹치기)' }, { overWall: true, tags: ['damaged', 'ruins', 'danger'] }),
    A('wall_hole', 'structure', 2, 1, todo('穴'), { ja: '壁の穴（重ねる）', en: 'Hole in wall (overlay)', ko: '벽 구멍(겹치기)' }, { overWall: true, tags: ['damaged', 'ruins'] }),
    A('fire_escape', 'structure', 5, 6, todo('非常'), { ja: '非常階段（屋外の鉄骨）', en: 'Fire escape stairs', ko: '비상계단(옥외 철골)' }, { vertical: true, tags: ['outdoor'] }),
    A('ext_stairs', 'structure', 2.4, 6, todo('外階段'), { ja: '外階段', en: 'Outdoor stairs', ko: '외부 계단' }, { vertical: true, tags: ['outdoor'] }),
    A('temp_stairs', 'structure', 2, 5, todo('仮設'), { ja: '仮設階段', en: 'Temporary stairs', ko: '가설 계단' }, { vertical: true, tags: ['industrial'] }),
    A('handrail', 'structure', 4, 0.3, todo('手すり'), { ja: '手すり', en: 'Handrail', ko: '난간' }),
    A('fence_item', 'structure', 4, 0.3, todo('柵'), { ja: 'フェンス', en: 'Fence', ko: '펜스' }, { tags: ['outdoor'] }),
    A('guardrail', 'structure', 6, 0.6, todo('GR'), { ja: 'ガードレール', en: 'Guardrail', ko: '가드레일' }, { tags: ['outdoor', 'transport'] }),
    A('scaffold', 'structure', 6, 2, todo('足場'), { ja: '足場', en: 'Scaffolding', ko: '비계' }, { tags: ['industrial', 'danger'] }),
    A('barricade', 'structure', 3, 0.7, todo('柵'), { ja: '工事用バリケード', en: 'Construction barricade', ko: '공사용 바리케이드' }, { tags: ['industrial'] }),
    A('vent', 'structure', 1, 1, todo('換'), { ja: '換気口', en: 'Air vent', ko: '환기구' }),
    A('duct', 'structure', 6, 1, todo('ダクト'), { ja: 'ダクト', en: 'Duct', ko: '덕트' }, { tags: ['industrial'] }),
    A('manhole', 'structure', 1.4, 1.4, todo('MH'), { ja: 'マンホール', en: 'Manhole', ko: '맨홀' }, { under: true, tags: ['outdoor', 'underground'] }),
    A('gutter', 'structure', 6, 0.6, todo('溝'), { ja: '排水溝', en: 'Drainage ditch', ko: '배수로' }, { under: true, tags: ['outdoor'] }),
    A('grating', 'structure', 2, 1, todo('格子'), { ja: 'グレーチング', en: 'Grating', ko: '그레이팅' }, { under: true, tags: ['outdoor'] }),
    A('sandbags', 'structure', 4, 1.2, todo('土嚢'), { ja: '土嚢', en: 'Sandbags', ko: '모래주머니' }, { tags: ['military', 'outdoor'] }),

    A('breaker', 'infra', 1, 0.4, todo('B'), { ja: 'ブレーカー', en: 'Breaker box', ko: '차단기' }),
    A('dist_board', 'infra', 2, 0.6, todo('配電'), { ja: '配電盤', en: 'Distribution board', ko: '배전반' }),
    A('control_panel', 'infra', 2.4, 0.8, todo('制御'), { ja: '制御盤', en: 'Control panel', ko: '제어반' }),
    A('service_entrance', 'infra', 1, 0.6, todo('引込'), { ja: '電気の引込み口', en: 'Power inlet', ko: '전기 인입구' }),
    A('cable_rack', 'infra', 6, 0.6, todo('電線'), { ja: '電線設備（ケーブルラック）', en: 'Cable tray', ko: '전선 설비(케이블 트레이)' }),
    A('pipe', 'infra', 6, 0.4, todo('管'), { ja: 'パイプ', en: 'Pipe', ko: '파이프' }),
    A('pipe_big', 'infra', 8, 1.2, todo('太管'), { ja: '太い工業用パイプ', en: 'Large industrial pipe', ko: '대형 공업용 파이프' }),
    A('water_pipe', 'infra', 6, 0.5, todo('水管'), { ja: '水道管', en: 'Water main', ko: '수도관' }),
    A('valve', 'infra', 0.8, 0.8, todo('V'), { ja: 'バルブ', en: 'Valve', ko: '밸브' }),
    A('pump', 'infra', 2, 1.4, todo('P'), { ja: 'ポンプ', en: 'Pump', ko: '펌프' }),
    A('boiler', 'infra', 3, 2.4, todo('ボイラ'), { ja: 'ボイラー', en: 'Boiler', ko: '보일러' }),
    A('big_tank', 'infra', 5, 5, todo('タンク'), { ja: '大型タンク', en: 'Large tank', ko: '대형 탱크' }),
    A('em_generator', 'infra', 4, 2, todo('発電'), { ja: '非常用発電機', en: 'Emergency generator', ko: '비상 발전기' }),
    A('ac_unit', 'infra', 1.8, 0.8, todo('室外'), { ja: '室外機', en: 'AC outdoor unit', ko: '실외기' }, { tags: ['outdoor', 'rooftop'] }),
    A('water_tower', 'infra', 4, 4, todo('給水'), { ja: '給水塔（高架水槽）', en: 'Water tower', ko: '급수탑(고가 수조)' }, { tags: ['outdoor', 'rooftop'] }),
    A('vent_unit', 'infra', 2, 2, todo('換気'), { ja: '換気設備', en: 'Ventilation unit', ko: '환기 설비' }, { tags: ['rooftop'] }),
    A('antenna', 'infra', 2, 2, todo('ANT'), { ja: 'アンテナ', en: 'Antenna', ko: '안테나' }, { tags: ['outdoor', 'rooftop'] }),
    A('extinguisher', 'infra', 0.6, 0.6, todo('消'), { ja: '消火器', en: 'Fire extinguisher', ko: '소화기' }),
    A('hydrant', 'infra', 1.2, 0.4, todo('消火栓'), { ja: '消火栓', en: 'Fire hose cabinet', ko: '소화전' }),
    A('cctv', 'infra', 0.6, 0.6, todo('CAM'), { ja: '防犯カメラ', en: 'Security camera', ko: '방범 카메라' }),
    A('card_reader', 'infra', 0.5, 0.3, todo('ID'), { ja: 'カードリーダー', en: 'Card reader', ko: '카드 리더기' }),
    A('alarm', 'infra', 0.6, 0.4, todo('!'), { ja: '警報装置', en: 'Alarm', ko: '경보기' }),
    A('sluice', 'infra', 6, 1, todo('水門'), { ja: '水門', en: 'Sluice gate', ko: '수문' }, { tags: ['waterside', 'underground'] }),

    A('store_shelf', 'office', 4, 1.6, todo('商品棚'), { ja: '商品棚（ゴンドラ）', en: 'Store shelf', ko: '진열대' }, { tags: ['commercial'] }),
    A('register', 'office', 3, 1.4, todo('レジ'), { ja: 'レジカウンター', en: 'Checkout counter', ko: '계산대' }, { tags: ['commercial'] }),
    A('fridge_case', 'office', 4, 1.2, todo('冷蔵'), { ja: '冷蔵ショーケース', en: 'Refrigerated case', ko: '냉장 쇼케이스' }, { tags: ['commercial'] }),
    A('atm', 'office', 1.4, 1, todo('ATM'), { ja: 'ATM', en: 'ATM', ko: 'ATM' }, { tags: ['commercial'] }),
    A('desk_island', 'office', 5, 5, todo('島'), { ja: '島型デスク（4席）', en: 'Desk cluster (4)', ko: '섬형 책상(4석)' }),
    A('partition', 'office', 4, 0.3, todo('仕切'), { ja: 'パーティション', en: 'Office partition', ko: '파티션' }),
    A('monitor_wall', 'office', 6, 0.6, todo('モニタ'), { ja: 'モニター壁', en: 'Monitor wall', ko: '모니터 벽' }),
    A('ops_table', 'office', 5, 3.6, todo('作戦'), { ja: '作戦卓', en: 'Operations table', ko: '작전 테이블' }, { tags: ['military'] }),
    A('radio', 'office', 2, 1, todo('通信'), { ja: '通信機', en: 'Radio set', ko: '무전기' }, { tags: ['military'] }),
    A('gun_rack', 'office', 3, 0.8, todo('銃架'), { ja: '銃架', en: 'Gun rack', ko: '총기 거치대' }, { tags: ['military'] }),
    /* ===== /PACK A ===== */

    /* ===== PACK B: 鉄道 / 道路・車両 / 船舶 / 医療・文化施設の追加 ===== */
    A('rail_track', 'vehicle', 4, 12, todo('線路'), { ja: '線路', en: 'Railway track', ko: '선로' }, { under: true, tags: ['railway'] }),
    A('sleepers', 'vehicle', 4, 8, todo('枕木'), { ja: '枕木', en: 'Sleepers', ko: '침목' }, { under: true, tags: ['railway'] }),
    A('rail_switch', 'vehicle', 8, 16, todo('分岐'), { ja: 'ポイント（分岐器）', en: 'Railway switch', ko: '선로 전환기' }, { under: true, tags: ['railway'] }),
    A('buffer_stop', 'vehicle', 4, 2, todo('車止'), { ja: '車止め（線路の終端）', en: 'Buffer stop', ko: '차막이' }, { tags: ['railway'] }),
    A('platform_edge', 'vehicle', 12, 1, todo('点字'), { ja: '駅ホーム端（点字ブロック）', en: 'Platform edge', ko: '승강장 끝(점자 블록)' }, { under: true, tags: ['railway', 'public'] }),
    A('ticket_gate', 'vehicle', 6, 3, todo('改札'), { ja: '改札', en: 'Ticket gates', ko: '개찰구' }, { tags: ['railway', 'public', 'indoor'] }),
    A('ticket_machine', 'vehicle', 1.6, 1, todo('券'), { ja: '券売機', en: 'Ticket machine', ko: '매표기' }, { tags: ['railway', 'public', 'indoor'] }),
    A('station_bench', 'vehicle', 4, 1, todo('ベンチ'), { ja: '駅のベンチ', en: 'Station bench', ko: '역 벤치' }, { tags: ['railway', 'public'] }),
    A('station_sign', 'vehicle', 3, 0.5, todo('駅名'), { ja: '駅名標', en: 'Station name sign', ko: '역명판' }, { tags: ['railway', 'public'] }),
    A('kiosk', 'vehicle', 4, 2.4, todo('売店'), { ja: '駅の売店', en: 'Station kiosk', ko: '역 매점' }, { tags: ['railway', 'commercial'] }),
    A('train_car', 'vehicle', 6, 40, todo('電車'), { ja: '電車・客車', en: 'Train car', ko: '전철·객차' }, { tags: ['railway'] }),
    A('locomotive', 'vehicle', 6, 32, todo('機関車'), { ja: '機関車', en: 'Locomotive', ko: '기관차' }, { tags: ['railway'] }),

    A('suv', 'vehicle', 4.2, 9.6, todo('SUV'), { ja: 'ワゴン・SUV', en: 'SUV / wagon', ko: '왜건·SUV' }),
    A('van', 'vehicle', 4, 9.4, todo('バン'), { ja: 'バン', en: 'Van', ko: '밴' }),
    A('truck', 'vehicle', 5, 16, todo('トラック'), { ja: 'トラック', en: 'Truck', ko: '트럭' }, { tags: ['industrial'] }),
    A('police_car', 'vehicle', 4, 9.4, todo('警察'), { ja: 'パトカー', en: 'Police car', ko: '경찰차' }, { tags: ['public'] }),
    A('ambulance', 'vehicle', 4.4, 11, todo('救急'), { ja: '救急車', en: 'Ambulance', ko: '구급차' }, { tags: ['medical', 'public'] }),
    A('fire_truck', 'vehicle', 5, 17, todo('消防'), { ja: '消防車', en: 'Fire engine', ko: '소방차' }, { tags: ['public'] }),
    A('excavator', 'vehicle', 6, 12, todo('重機'), { ja: 'ショベルカー', en: 'Excavator', ko: '굴착기' }, { tags: ['industrial'] }),
    A('bulldozer', 'vehicle', 7, 10, todo('ブル'), { ja: 'ブルドーザー', en: 'Bulldozer', ko: '불도저' }, { tags: ['industrial'] }),
    A('crane_truck', 'vehicle', 5.6, 20, todo('クレーン'), { ja: 'クレーン車', en: 'Crane truck', ko: '크레인차' }, { tags: ['industrial'] }),
    A('forklift', 'vehicle', 2.4, 5, todo('FL'), { ja: 'フォークリフト', en: 'Forklift', ko: '지게차' }, { tags: ['industrial', 'indoor'] }),
    A('tank_mil', 'vehicle', 7, 14, todo('戦車'), { ja: '戦車', en: 'Tank', ko: '전차' }, { tags: ['military'] }),
    A('airplane', 'vehicle', 24, 22, todo('飛行機'), { ja: '飛行機（小型機）', en: 'Airplane (light)', ko: '비행기(소형기)' }),
    A('helicopter', 'vehicle', 22, 22, todo('ヘリ'), { ja: 'ヘリコプター', en: 'Helicopter', ko: '헬리콥터' }),

    A('lifeboat', 'vehicle', 4, 12, todo('救命艇'), { ja: '救命艇', en: 'Lifeboat', ko: '구명정' }, { tags: ['ship', 'waterside'] }),
    A('liferaft', 'vehicle', 1.6, 2.4, todo('いかだ'), { ja: '救命いかだ（コンテナ）', en: 'Life raft canister', ko: '구명뗏목(컨테이너)' }, { tags: ['ship'] }),
    A('anchor', 'vehicle', 2, 2.4, todo('錨'), { ja: '錨', en: 'Anchor', ko: '닻' }, { tags: ['ship'] }),
    A('bollard', 'vehicle', 1.2, 1, todo('ビット'), { ja: '係船設備（ビット）', en: 'Mooring bitt', ko: '계선주(비트)' }, { tags: ['ship', 'waterside'] }),
    A('helm', 'vehicle', 1.6, 1.6, todo('舵'), { ja: '操舵輪', en: 'Ship\'s wheel', ko: '조타륜' }, { tags: ['ship', 'indoor'] }),
    A('radar', 'vehicle', 2, 1.6, todo('レーダ'), { ja: 'レーダー卓', en: 'Radar console', ko: '레이더 콘솔' }, { tags: ['ship', 'indoor'] }),
    A('chart_table', 'vehicle', 2.4, 1.6, todo('海図'), { ja: '海図卓', en: 'Chart table', ko: '해도대' }, { tags: ['ship', 'indoor'] }),
    A('ship_engine', 'vehicle', 6, 10, todo('機関'), { ja: '船舶エンジン', en: 'Marine engine', ko: '선박 엔진' }, { tags: ['ship', 'indoor', 'industrial'] }),
    A('ship_hatch', 'vehicle', 2.4, 2.4, todo('ハッチ'), { ja: '船舶用ハッチ', en: 'Cargo hatch', ko: '선박 해치' }, { tags: ['ship'] }),

    A('fume_hood', 'medical', 3, 1.2, todo('ドラフト'), { ja: 'ドラフトチャンバー', en: 'Fume hood', ko: '흄 후드' }),
    A('microscope', 'medical', 1, 1, todo('顕'), { ja: '顕微鏡', en: 'Microscope', ko: '현미경' }),
    A('freezer', 'medical', 1.6, 1.4, todo('冷凍'), { ja: '超低温フリーザー', en: 'Lab freezer', ko: '초저온 냉동고' }),
    A('decon_shower', 'medical', 2, 2, todo('除染'), { ja: '除染シャワー', en: 'Decontamination shower', ko: '제염 샤워' }),

    A('display_case', 'culture', 2.4, 1.6, todo('展示'), { ja: '展示ケース', en: 'Display case', ko: '전시 케이스' }),
    A('painting', 'culture', 3, 0.3, todo('絵'), { ja: '額縁の絵（壁に掛ける）', en: 'Framed painting', ko: '액자 그림' }),
    A('pedestal', 'culture', 1.6, 1.6, todo('台'), { ja: '展示台・彫刻', en: 'Pedestal & sculpture', ko: '전시대·조각' }),
    A('rope_barrier', 'culture', 4, 0.4, todo('ロープ'), { ja: 'ロープパーティション', en: 'Rope barrier', ko: '로프 차단봉' }),
    A('skeleton', 'culture', 12, 6, todo('骨格'), { ja: '恐竜の骨格標本', en: 'Dinosaur skeleton', ko: '공룡 골격 표본' }),
    A('organ', 'culture', 4, 1.6, todo('オルガン'), { ja: 'パイプオルガン', en: 'Pipe organ', ko: '파이프 오르간' }, { tags: ['religious'] }),
    A('font', 'culture', 1.4, 1.4, todo('洗礼'), { ja: '洗礼盤', en: 'Baptismal font', ko: '세례반' }, { tags: ['religious'] }),
    A('confessional', 'culture', 3, 2.4, todo('告解'), { ja: '告解室', en: 'Confessional', ko: '고해실' }, { tags: ['religious'] }),
    /* ===== /PACK B ===== */

    /* ===== PACK C: 物流・工業 / 屋外・道路 / 和風屋敷・庭園・寺院 ===== */
    A('pallet', 'industry', 2.2, 2.2, todo('PL'), { ja: 'パレット', en: 'Pallet', ko: '팔레트' }),
    A('pallet_stack', 'industry', 2.2, 2.2, todo('PL積'), { ja: '木製パレット積み', en: 'Stacked pallets', ko: '쌓인 팔레트' }),
    A('cardboard', 'industry', 1.2, 0.9, todo('箱'), { ja: 'ダンボール箱', en: 'Cardboard box', ko: '골판지 상자' }),
    A('big_crate', 'industry', 3, 2.4, todo('木箱'), { ja: '大型木箱', en: 'Large wooden crate', ko: '대형 나무 상자' }),
    A('container', 'industry', 5, 12, todo('コンテナ'), { ja: '貨物コンテナ', en: 'Shipping container', ko: '화물 컨테이너' }, { tags: ['transport'] }),
    A('drum', 'industry', 1.2, 1.2, todo('ドラム'), { ja: 'ドラム缶', en: 'Oil drum', ko: '드럼통' }),
    A('hand_cart', 'industry', 1.4, 2, todo('台車'), { ja: '台車', en: 'Hand cart', ko: '대차(손수레)' }),
    A('tool_shelf', 'industry', 3, 1, todo('工具棚'), { ja: '工具棚', en: 'Tool shelf', ko: '공구 선반' }),
    A('machine_tool', 'industry', 3, 2.4, todo('機械'), { ja: '工作機械', en: 'Machine tool', ko: '공작 기계' }, { tags: ['machinery'] }),
    A('generator', 'industry', 1.6, 1.2, todo('発電'), { ja: '発電機（可搬型）', en: 'Portable generator', ko: '발전기(이동식)' }),
    A('ind_tank', 'industry', 3, 3, todo('タンク'), { ja: '工業用タンク', en: 'Industrial tank', ko: '공업용 탱크' }),
    A('conveyor', 'industry', 10, 2, todo('コンベア'), { ja: 'ベルトコンベア', en: 'Conveyor belt', ko: '벨트 컨베이어' }, { tags: ['machinery'] }),
    A('workbench', 'industry', 4, 1.6, todo('作業台'), { ja: '作業台', en: 'Workbench', ko: '작업대' }),
    A('material_pile', 'industry', 4, 3, todo('資材'), { ja: '資材の山', en: 'Pile of materials', ko: '자재 더미' }),
    A('building_materials', 'industry', 8, 2, todo('鉄骨'), { ja: '建築資材（鉄骨・木材）', en: 'Building materials', ko: '건축 자재(철골·목재)' }),
    A('pallet_rack', 'industry', 8, 2.2, todo('ラック'), { ja: '大型ラック', en: 'Pallet rack', ko: '대형 랙' }),
    A('supply_shelf', 'industry', 3, 1, todo('備蓄'), { ja: '備蓄棚', en: 'Supply shelf', ko: '비축 선반' }),

    A('road', 'outdoor', 12, 12, todo('道路'), { ja: '道路（2車線）', en: 'Road (2 lanes)', ko: '도로(2차선)' }, { under: true, tags: ['transport'] }),
    A('crosswalk', 'outdoor', 8, 6, todo('横断'), { ja: '横断歩道', en: 'Crosswalk', ko: '횡단보도' }, { under: true, tags: ['transport'] }),
    A('parking_stall', 'outdoor', 5, 10, todo('P'), { ja: '駐車区画', en: 'Parking space', ko: '주차 구획' }, { under: true, tags: ['transport'] }),
    A('road_arrow', 'outdoor', 2, 4, todo('↑'), { ja: '路面の矢印', en: 'Road arrow', ko: '노면 화살표' }, { under: true, tags: ['transport'] }),
    A('road_sign', 'outdoor', 1, 1, todo('標識'), { ja: '道路標識', en: 'Road sign', ko: '도로 표지판' }, { tags: ['transport'] }),
    A('traffic_light', 'outdoor', 1.2, 0.8, todo('信号'), { ja: '信号機', en: 'Traffic light', ko: '신호등' }, { tags: ['transport'] }),
    A('cone', 'outdoor', 0.8, 0.8, todo('コーン'), { ja: 'カラーコーン', en: 'Traffic cone', ko: '라바콘' }),
    A('bollard_post', 'outdoor', 0.6, 0.6, todo('ポール'), { ja: '車止め（ポール）', en: 'Bollard', ko: '볼라드' }),
    A('streetlight', 'outdoor', 1, 1, todo('街灯'), { ja: '街灯', en: 'Street lamp', ko: '가로등' }),
    A('utility_pole', 'outdoor', 1, 1, todo('電柱'), { ja: '電柱', en: 'Utility pole', ko: '전봇대' }),
    A('puddle', 'outdoor', 2.4, 1.6, todo('水'), { ja: '水たまり', en: 'Puddle', ko: '물웅덩이' }, { under: true, tags: ['ruins'] }),
    A('cliff', 'outdoor', 8, 3, todo('崖'), { ja: '崖', en: 'Cliff edge', ko: '절벽' }, { tags: ['danger'] }),
    A('landslide', 'outdoor', 4, 3, todo('土砂'), { ja: '土砂', en: 'Landslide debris', ko: '토사' }, { tags: ['damaged', 'danger'] }),
    A('site_fence', 'outdoor', 6, 0.4, todo('仮囲'), { ja: '工事柵（仮囲い）', en: 'Construction hoarding', ko: '공사 가림막' }, { tags: ['industrial'] }),

    A('shoji', 'japanese', 3, 0.3, todo('障子'), { ja: '障子', en: 'Shoji screen', ko: '쇼지(장지문)' }, { tags: ['japanese', 'indoor'] }),
    A('fusuma', 'japanese', 3, 0.3, todo('襖'), { ja: '襖', en: 'Fusuma panel', ko: '후스마(맹장지)' }, { tags: ['japanese', 'indoor'] }),
    A('byobu', 'japanese', 4, 1, todo('屏風'), { ja: '屏風', en: 'Folding screen', ko: '병풍' }, { tags: ['japanese', 'indoor'] }),
    A('engawa_deck', 'japanese', 6, 2, todo('縁側'), { ja: '縁側（板敷き）', en: 'Engawa boards', ko: '툇마루(마루)' }, { under: true, tags: ['japanese'] }),
    A('tatami', 'japanese', 1.8, 3.6, todo('畳'), { ja: '畳', en: 'Tatami mat', ko: '다다미' }, { under: true, tags: ['japanese', 'indoor'] }),
    A('zataku', 'japanese', 3, 2, todo('座卓'), { ja: '座卓', en: 'Low table (zataku)', ko: '좌탁' }, { tags: ['japanese', 'indoor'] }),
    A('zabuton', 'japanese', 1.2, 1.2, todo('座'), { ja: '座布団', en: 'Floor cushion', ko: '방석' }, { tags: ['japanese', 'indoor'] }),
    A('katanakake', 'japanese', 2, 0.8, todo('刀'), { ja: '刀掛け', en: 'Sword rack', ko: '칼걸이' }, { tags: ['japanese', 'indoor'] }),
    A('andon', 'japanese', 0.8, 0.8, todo('行灯'), { ja: '行灯', en: 'Paper lantern (andon)', ko: '안돈(종이 등)' }, { tags: ['japanese', 'indoor'] }),
    A('pond', 'japanese', 8, 6, todo('池'), { ja: '池', en: 'Garden pond', ko: '연못' }, { under: true, tags: ['japanese', 'outdoor', 'waterside', 'garden'] }),
    A('stone_bridge', 'japanese', 2, 5, todo('石橋'), { ja: '石橋', en: 'Stone bridge', ko: '돌다리' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('wood_bridge', 'japanese', 2.4, 6, todo('木橋'), { ja: '木橋（太鼓橋）', en: 'Wooden bridge', ko: '나무다리' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('stepping', 'japanese', 1.6, 5, todo('飛石'), { ja: '飛び石', en: 'Stepping stones', ko: '징검돌' }, { under: true, tags: ['japanese', 'outdoor', 'garden'] }),
    A('garden_rock', 'japanese', 1.8, 1.4, todo('庭石'), { ja: '庭石', en: 'Garden rock', ko: '정원석' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('bamboo_fence', 'japanese', 6, 0.5, todo('竹垣'), { ja: '竹垣', en: 'Bamboo fence', ko: '대나무 울타리' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('pine', 'japanese', 4, 4, todo('松'), { ja: '松', en: 'Pine tree', ko: '소나무' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('bamboo', 'japanese', 3, 3, todo('竹'), { ja: '竹', en: 'Bamboo', ko: '대나무' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('moss', 'japanese', 4, 3, todo('苔'), { ja: '苔', en: 'Moss patch', ko: '이끼' }, { under: true, tags: ['japanese', 'outdoor', 'garden'] }),
    A('tsukubai', 'japanese', 1.6, 1.6, todo('蹲'), { ja: 'つくばい', en: 'Stone basin (tsukubai)', ko: '쓰쿠바이(돌 물그릇)' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('shishiodoshi', 'japanese', 2.4, 1, todo('鹿威'), { ja: '鹿威し', en: 'Deer scarer (shishi-odoshi)', ko: '시시오도시' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('tea_house', 'japanese', 6, 6, todo('茶室'), { ja: '茶室（建物を外から）', en: 'Tea house (exterior)', ko: '다실(건물 외관)' }, { tags: ['japanese', 'outdoor', 'garden'] }),
    A('buddha_altar', 'japanese', 4, 2.4, todo('仏像'), { ja: '須弥壇・本尊', en: 'Temple altar & statue', ko: '수미단·본존' }, { tags: ['japanese', 'religious', 'indoor'] }),
    A('bonsho', 'japanese', 3, 3, todo('梵鐘'), { ja: '梵鐘（鐘楼）', en: 'Temple bell', ko: '범종(종루)' }, { tags: ['japanese', 'religious', 'outdoor'] }),
    /* ===== /PACK C ===== */

    /* ===== PACK D: 探索・事件 / ホラー・オカルト / NPC・敵 ===== */
    A('flashlight', 'investigation', 0.8, 0.4, todo('灯'), { ja: '懐中電灯', en: 'Flashlight', ko: '손전등' }),
    A('tools', 'investigation', 1.2, 0.6, todo('工具'), { ja: '工具', en: 'Tools', ko: '공구' }),
    A('bag', 'investigation', 1.2, 0.8, todo('鞄'), { ja: '鞄', en: 'Bag', ko: '가방' }),
    A('wallet', 'investigation', 0.6, 0.4, todo('財布'), { ja: '財布', en: 'Wallet', ko: '지갑' }),
    A('papers', 'investigation', 0.9, 0.7, todo('書類'), { ja: '書類の束', en: 'Stack of papers', ko: '서류 뭉치' }),
    A('file_folder', 'investigation', 0.8, 1, todo('ファイル'), { ja: 'ファイル', en: 'File folder', ko: '파일' }),
    A('laptop', 'investigation', 1.2, 0.9, todo('PC'), { ja: 'ノートPC', en: 'Laptop', ko: '노트북' }),
    A('recorder', 'investigation', 0.6, 0.4, todo('録音'), { ja: '録音機', en: 'Recorder', ko: '녹음기' }),
    A('camera', 'investigation', 0.7, 0.5, todo('カメラ'), { ja: 'カメラ', en: 'Camera', ko: '카메라' }),
    A('casings', 'investigation', 0.8, 0.8, todo('薬莢'), { ja: '使用済みの薬莢', en: 'Spent casings', ko: '사용한 탄피' }, { under: true, tags: ['danger'] }),
    A('bullet_holes', 'investigation', 1.2, 0.8, todo('弾痕'), { ja: '弾痕（壁に重ねる）', en: 'Bullet holes (overlay)', ko: '탄흔(벽에 겹치기)' }, { overWall: true, tags: ['damaged', 'danger'] }),
    A('burn', 'investigation', 3, 2.4, todo('焼跡'), { ja: '焼け跡', en: 'Scorch marks', ko: '불탄 자국' }, { under: true, tags: ['damaged'] }),
    A('drag_marks', 'investigation', 1.4, 4, todo('引跡'), { ja: '引きずった跡', en: 'Drag marks', ko: '끌린 자국' }, { under: true }),
    A('fingerprint', 'investigation', 0.8, 0.8, todo('指紋'), { ja: '指紋マーカー', en: 'Fingerprint marker', ko: '지문 마커' }),
    A('broken_furniture', 'investigation', 2.4, 1.6, todo('破損'), { ja: '壊れた家具', en: 'Broken furniture', ko: '부서진 가구' }, { tags: ['damaged', 'ruins'] }),

    A('pod', 'occult', 1.8, 1.8, todo('ポッド'), { ja: '培養ポット（人型）', en: 'Stasis pod (humanoid)', ko: '배양 포드(인간형)' }, { tags: ['research', 'sf'] }),
    A('sarcophagus', 'occult', 2.4, 4.4, todo('石棺'), { ja: '石棺', en: 'Stone sarcophagus', ko: '석관' }, { tags: ['historic', 'religious'] }),
    A('ritual_table', 'occult', 3, 2, todo('儀式'), { ja: '儀式台', en: 'Ritual table', ko: '의식대' }),
    A('chains', 'occult', 3, 0.6, todo('鎖'), { ja: '鎖', en: 'Chains', ko: '쇠사슬' }),
    A('stele', 'occult', 2, 1, todo('石碑'), { ja: '奇妙な石碑', en: 'Strange stele', ko: '기묘한 비석' }),
    A('totem', 'occult', 1.4, 1.4, todo('トーテム'), { ja: 'トーテム', en: 'Totem', ko: '토템' }),
    A('offering', 'occult', 1.4, 1, todo('供物'), { ja: '供物', en: 'Offerings', ko: '공물' }, { tags: ['religious'] }),
    A('cursed_item', 'occult', 0.8, 0.8, todo('呪'), { ja: '呪物', en: 'Cursed object', ko: '저주받은 물건' }, { tags: ['danger'] }),
    A('flesh', 'occult', 2.4, 2, todo('肉塊'), { ja: '肉塊・異形物', en: 'Flesh mass', ko: '살덩이·이형체' }, { tags: ['danger'] }),
    A('black_stain', 'occult', 3, 2.4, todo('染み'), { ja: '黒い染み', en: 'Black stain', ko: '검은 얼룩' }, { under: true }),
    A('tendrils', 'occult', 4, 3, todo('触手'), { ja: '蔓・触手状の侵食（壁に重ねる）', en: 'Creeping tendrils (overlay)', ko: '덩굴·촉수 침식(벽에 겹치기)' }, { overWall: true, tags: ['danger'] }),
    A('abyss', 'occult', 3, 3, todo('穴'), { ja: '異常な穴', en: 'Unnatural pit', ko: '이상한 구멍' }, { tags: ['danger'] }),

    A('npc_man', 'npc', 1.2, 1.2, todo('男'), { ja: '一般男性', en: 'Man', ko: '일반 남성' }),
    A('npc_woman', 'npc', 1.2, 1.2, todo('女'), { ja: '一般女性', en: 'Woman', ko: '일반 여성' }),
    A('npc_child', 'npc', 1, 1, todo('子'), { ja: '子供', en: 'Child', ko: '아이' }),
    A('npc_elder', 'npc', 1.2, 1.2, todo('老'), { ja: '老人', en: 'Elderly person', ko: '노인' }),
    A('npc_police', 'npc', 1.2, 1.2, todo('警'), { ja: '警官', en: 'Police officer', ko: '경찰관' }, { tags: ['public'] }),
    A('npc_soldier', 'npc', 1.2, 1.2, todo('兵'), { ja: '兵士', en: 'Soldier', ko: '병사' }, { tags: ['military'] }),
    A('npc_doctor', 'npc', 1.2, 1.2, todo('医'), { ja: '医師', en: 'Doctor', ko: '의사' }, { tags: ['medical'] }),
    A('npc_nurse', 'npc', 1.2, 1.2, todo('看'), { ja: '看護師', en: 'Nurse', ko: '간호사' }, { tags: ['medical'] }),
    A('npc_scientist', 'npc', 1.2, 1.2, todo('研'), { ja: '研究員', en: 'Researcher', ko: '연구원' }, { tags: ['research'] }),
    A('npc_worker', 'npc', 1.2, 1.2, todo('作'), { ja: '作業員', en: 'Worker', ko: '작업원' }, { tags: ['industrial'] }),
    A('npc_station', 'npc', 1.2, 1.2, todo('駅'), { ja: '駅員', en: 'Station staff', ko: '역무원' }, { tags: ['railway'] }),
    A('npc_sailor', 'npc', 1.2, 1.2, todo('船'), { ja: '船員', en: 'Sailor', ko: '선원' }, { tags: ['ship'] }),
    A('npc_guard', 'npc', 1.2, 1.2, todo('警備'), { ja: '警備員', en: 'Security guard', ko: '경비원' }),
    A('npc_robed', 'npc', 1.2, 1.2, todo('ローブ'), { ja: 'ローブ姿', en: 'Robed figure', ko: '로브 차림' }, { tags: ['religious'] }),
    A('npc_standing', 'npc', 1.2, 1.2, todo('立'), { ja: '立っている人物', en: 'Standing figure', ko: '서 있는 인물' }),
    A('npc_sitting', 'npc', 1.2, 1.6, todo('座'), { ja: '座っている人物', en: 'Seated figure', ko: '앉아 있는 인물' }),
    A('npc_lying', 'npc', 1.6, 3.6, todo('倒'), { ja: '倒れている人物', en: 'Fallen figure', ko: '쓰러진 인물' }),
    A('npc_bound', 'npc', 1.6, 1.6, todo('縛'), { ja: '拘束された人物', en: 'Restrained figure', ko: '구속된 인물' }),
    A('enemy_humanoid', 'npc', 1.2, 1.2, todo('敵'), { ja: '人型の敵', en: 'Humanoid enemy', ko: '인간형 적' }, { tags: ['danger'] }),
    A('monster_small', 'npc', 1, 1, todo('小'), { ja: '小型モンスター', en: 'Small monster', ko: '소형 몬스터' }, { tags: ['danger'] }),
    A('monster', 'npc', 2, 2, todo('M'), { ja: 'モンスター', en: 'Monster', ko: '몬스터' }, { tags: ['danger'] }),
    A('monster_large', 'npc', 4, 4, todo('大'), { ja: '大型モンスター', en: 'Large monster', ko: '대형 몬스터' }, { tags: ['danger'] }),
    A('monster_boss', 'npc', 6, 6, todo('強'), { ja: '強大な敵', en: 'Powerful foe', ko: '강대한 적' }, { tags: ['danger'] }),
    A('monster_huge', 'npc', 10, 10, todo('超'), { ja: '超大型の敵', en: 'Colossal foe', ko: '초대형 적' }, { tags: ['danger'] }),
    A('dog', 'npc', 1, 1.8, todo('犬'), { ja: '犬', en: 'Dog', ko: '개' }),
    A('dog_big', 'npc', 1.2, 2.4, todo('大犬'), { ja: '大型犬', en: 'Large dog', ko: '대형견' }),
    A('cat', 'npc', 0.6, 1.1, todo('猫'), { ja: '猫', en: 'Cat', ko: '고양이' }),
    A('bird', 'npc', 0.8, 0.8, todo('鳥'), { ja: '鳥', en: 'Bird', ko: '새' }),
    A('wild_animal', 'npc', 2, 3.4, todo('獣'), { ja: '野生動物', en: 'Wild animal', ko: '야생동물' }, { tags: ['outdoor'] }),
    /* ===== /PACK D ===== */
  ];

  /* タグ（検索・絞り込み用）。分類ごとの既定のタグに、素材ごとのタグを足す */
  const GROUP_TAGS = {
    structure: [], home: ['indoor', 'residential', 'modern'], kitchen: ['indoor', 'residential', 'modern'],
    office: ['indoor', 'commercial', 'modern'], medical: ['indoor', 'medical', 'research', 'modern'], culture: ['indoor', 'public'],
    leisure: ['indoor', 'commercial'], infra: ['industrial', 'modern'], vehicle: ['transport', 'modern'], industry: ['industrial', 'modern'],
    outdoor: ['outdoor'], japanese: ['historic'], investigation: [], occult: ['horror'], npc: [], sf: ['sf', 'nearfuture'], fantasy: ['fantasy', 'historic']
  };
  const EXTRA_TAGS = {
    stairs_down: ['underground'], trapdoor: ['underground', 'hidden'], ladder: ['underground'], fireplace: ['residential', 'historic'],
    debris: ['damaged', 'ruins'], piano: ['leisure'], bunk_bed: ['military'], weapon_rack: ['military'], armor_stand: ['military'],
    blood: ['danger'], body: ['danger'], danger: ['danger'], glass: ['damaged', 'ruins'], tape: ['public'], knife: ['danger'], safe: ['hidden'],
    altar: ['religious'], candle: ['religious'], coffin: ['religious'], cage: ['danger'], bones: ['danger'], magic_circle: ['religious'],
    pew: ['religious'], car: ['outdoor'], boat: ['waterside', 'outdoor'], grave: ['religious'], tank: ['sf'], cryopod: ['research'],
    barber_chair: ['1920s', 'commercial'], gramophone: ['1920s'], irori: ['japanese', 'residential'], kamado: ['japanese', 'residential'],
    butsudan: ['japanese', 'religious'], tokonoma: ['japanese'], well: ['japanese', 'outdoor'], torii: ['japanese', 'religious', 'outdoor'],
    komainu: ['japanese', 'religious', 'outdoor'], lantern: ['japanese', 'religious', 'outdoor'], temizuya: ['japanese', 'religious', 'outdoor'],
    hokora: ['japanese', 'religious', 'outdoor'], saisen: ['japanese', 'religious'], pit: ['danger'], crate: ['transport'], barrel: ['historic']
  };
  ASSETS.forEach(a => {
    a.tags = Array.from(new Set([...(GROUP_TAGS[a.group] || []), ...(EXTRA_TAGS[a.id] || []), ...(a.tags || [])]));
  });

  const BY_ID = Object.fromEntries(ASSETS.map(a => [a.id, a]));

  global.IMM = global.IMM || {};
  Object.assign(global.IMM, { ASSET_GROUPS: GROUPS, ASSETS, ASSET: BY_ID, drawHelpers: { rr } });
})(window);
