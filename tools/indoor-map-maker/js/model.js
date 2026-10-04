/* TRPG室内図メーカー — データモデルと形状計算
 * 座標の単位は「マス」（1マス = 0.5m）。部屋は整数マス、家具・ドア・窓は0.25マス刻み。
 * 壁は部屋の外周から自動で作る（隣り合う部屋の間は内壁、外に面する辺は外壁）。 */
(function (global) {
  'use strict';

  const CELL_M = 0.5;
  const TATAMI_M2 = 1.62;

  let seq = 0;
  const uid = prefix => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

  /* 部屋の種類。outdoor の部屋は外壁を作らず、edge で外周の描き方を決める */
  const CATEGORIES = [
    { id: 'living', name: { ja: 'リビング・居室', en: 'Living', ko: '거실·거주 공간' } },
    { id: 'bedroom', name: { ja: '寝室・個室', en: 'Bedroom', ko: '침실·개인실' } },
    { id: 'washitsu', name: { ja: '和室', en: 'Japanese room', ko: '다다미방' }, pattern: 'tatami' },
    { id: 'kitchen', name: { ja: 'キッチン・食堂', en: 'Kitchen / dining', ko: '주방·식당' } },
    { id: 'wet', name: { ja: '浴室・洗面・トイレ', en: 'Bath / WC', ko: '욕실·세면·화장실' }, pattern: 'tile' },
    { id: 'hall', name: { ja: '玄関・廊下・ホール', en: 'Hall / corridor', ko: '현관·복도·홀' } },
    { id: 'storage', name: { ja: '収納・倉庫', en: 'Storage', ko: '수납·창고' } },
    { id: 'public', name: { ja: 'ロビー・共用', en: 'Lobby / public', ko: '로비·공용' } },
    { id: 'office', name: { ja: '事務・スタッフ', en: 'Office / staff', ko: '사무·직원' } },
    { id: 'medical', name: { ja: '医療・研究', en: 'Medical / lab', ko: '의료·연구' } },
    { id: 'special', name: { ja: '特殊・儀式', en: 'Special / ritual', ko: '특수·의식' } },
    { id: 'danger', name: { ja: '危険・立入禁止', en: 'Danger / restricted', ko: '위험·출입금지' } },
    { id: 'garage', name: { ja: '車庫・機械室', en: 'Garage / plant', ko: '차고·기계실' } },
    { id: 'balcony', name: { ja: 'バルコニー・テラス', en: 'Balcony / terrace', ko: '발코니·테라스' }, outdoor: true, edge: 'rail', pattern: 'deck' },
    { id: 'garden', name: { ja: '庭・屋外', en: 'Garden / outdoor', ko: '정원·옥외' }, outdoor: true, edge: 'none', pattern: 'grass' },
    { id: 'porch', name: { ja: 'ポーチ・通路（屋外）', en: 'Porch / path', ko: '포치·옥외 통로' }, outdoor: true, edge: 'none', pattern: 'stone' }
  ];
  const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  /* ドア・窓の種類 */
  const OPENINGS = [
    { id: 'door', group: 'door', len: 1.5, name: { ja: '片開きドア', en: 'Door', ko: '여닫이문' } },
    { id: 'door2', group: 'door', len: 3, name: { ja: '両開きドア', en: 'Double door', ko: '양여닫이문' } },
    { id: 'sliding', group: 'door', len: 1.5, name: { ja: '引き戸', en: 'Sliding door', ko: '미닫이문' } },
    { id: 'sliding2', group: 'door', len: 3, name: { ja: '引違い戸・ふすま', en: 'Double sliding / fusuma', ko: '미서기문·후스마' } },
    { id: 'folding', group: 'door', len: 2, name: { ja: '折れ戸・クローゼット扉', en: 'Folding door', ko: '접이문' } },
    { id: 'auto', group: 'door', len: 3, name: { ja: '自動ドア', en: 'Automatic door', ko: '자동문' } },
    { id: 'shutter', group: 'door', len: 5, name: { ja: 'シャッター', en: 'Shutter', ko: '셔터' } },
    { id: 'open', group: 'door', len: 2, name: { ja: '開口（壁なし）', en: 'Opening (no wall)', ko: '개구부(벽 없음)' } },
    { id: 'locked', group: 'door', len: 1.5, name: { ja: '施錠されたドア', en: 'Locked door', ko: '잠긴 문' } },
    { id: 'secret', group: 'door', len: 1.5, gm: true, name: { ja: '隠し扉（GMのみ）', en: 'Secret door (GM)', ko: '비밀문(GM 전용)' } },
    { id: 'broken', group: 'door', len: 1.5, name: { ja: '壊れたドア', en: 'Broken door', ko: '부서진 문' } },
    { id: 'hole', group: 'door', len: 2, name: { ja: '壁の穴・崩落', en: 'Hole in wall', ko: '벽의 구멍·붕괴' } },
    { id: 'window', group: 'window', len: 2, name: { ja: '窓', en: 'Window', ko: '창문' } },
    { id: 'window2', group: 'window', len: 3.5, name: { ja: '掃き出し窓・大きな窓', en: 'Large / patio window', ko: '큰 창·전면창' } },
    { id: 'barred', group: 'window', len: 2, name: { ja: '鉄格子の窓', en: 'Barred window', ko: '쇠창살 창문' } },
    { id: 'boarded', group: 'window', len: 2, name: { ja: '板でふさいだ窓', en: 'Boarded window', ko: '판자로 막은 창' } },
    { id: 'brokenwin', group: 'window', len: 2, name: { ja: '割れた窓', en: 'Broken window', ko: '깨진 창문' } }
  ];
  const OPEN = Object.fromEntries(OPENINGS.map(o => [o.id, o]));

  const WALL_KINDS = [
    { id: 'ext', t: 0.34, name: { ja: '外壁（厚い）', en: 'Exterior (thick)', ko: '외벽(두꺼움)' } },
    { id: 'int', t: 0.2, name: { ja: '内壁', en: 'Interior', ko: '내벽' } },
    { id: 'thin', t: 0.12, name: { ja: '間仕切り（薄い）', en: 'Partition (thin)', ko: '칸막이(얇음)' } },
    { id: 'glass', t: 0.14, name: { ja: 'ガラス壁', en: 'Glass wall', ko: '유리벽' } },
    { id: 'rail', t: 0.1, name: { ja: '手すり・腰壁', en: 'Railing', ko: '난간' } },
    { id: 'fence', t: 0.1, name: { ja: '柵・フェンス', en: 'Fence', ko: '울타리' } },
    { id: 'bars', t: 0.14, name: { ja: '鉄格子', en: 'Bars', ko: '쇠창살' } },
    { id: 'broken', t: 0.3, name: { ja: '崩れた壁', en: 'Crumbling wall', ko: '무너진 벽' } }
  ];
  const WALL = Object.fromEntries(WALL_KINDS.map(w => [w.id, w]));

  const snap = (v, step) => Math.round(v / step) * step;
  const clone = value => JSON.parse(JSON.stringify(value));

  function emptyFloor(name) {
    return { id: uid('f'), name: name || '1F', rooms: [], walls: [], openings: [], items: [], texts: [] };
  }

  function emptyProject(name) {
    return { app: 'indoor-map-maker', v: 1, name: name || '', theme: 'clean', showSize: 'none', showNames: true, floors: [emptyFloor('1F')], active: 0 };
  }

  /* プレイヤー版では GM 専用のものを除く */
  /*
   * PL表示用の階。GM専用の部屋は壁の枠だけを残して中を伏せる（masked）。
   * 中にある家具・文字・壁・入れ子の部屋・内側のドアは見せない。部屋の縁にあるドア・窓は残す。
   */
  function visibleFloor(floor, playerView) {
    if (!playerView) return floor;
    const hidden = floor.rooms.filter(r => r.gm);
    const inside = (x, y) => hidden.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
    const masked = r => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h, cat: r.cat, noWall: r.noWall, name: '', masked: true });
    return {
      ...floor,
      rooms: floor.rooms
        .filter(r => r.gm || !hidden.some(g => rectContains(g, r)))
        .map(r => (r.gm ? masked(r) : r)),
      walls: floor.walls.filter(w => !w.gm && !inside((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2)),
      openings: floor.openings.filter(o => !o.gm && o.kind !== 'secret' && !inside(o.o === 'h' ? o.x + o.len / 2 : o.x, o.o === 'h' ? o.y : o.y + o.len / 2)),
      items: floor.items.filter(i => !i.gm && !inside(i.x + i.w / 2, i.y + i.h / 2)),
      texts: floor.texts.filter(t => !t.gm && !inside(t.x, t.y))
    };
  }

  /* ---------- 壁の自動生成 ---------- */

  const KEY_OFFSET = 4096;
  const cellKey = (x, y) => (x + KEY_OFFSET) * 8192 + (y + KEY_OFFSET);

  function buildOwner(rooms) {
    const owner = new Map();
    rooms.forEach((room, index) => {
      for (let x = room.x; x < room.x + room.w; x++) {
        for (let y = room.y; y < room.y + room.h; y++) owner.set(cellKey(x, y), index);
      }
    });
    return owner;
  }

  function edgeKind(a, b) {
    if (a === b) return null;
    if (a && b) {
      if (a.noWall || b.noWall) return 'zone';
      const ao = CAT[a.cat] && CAT[a.cat].outdoor;
      const bo = CAT[b.cat] && CAT[b.cat].outdoor;
      if (ao && bo) return null;
      if (ao || bo) return 'ext';
      return 'int';
    }
    const room = a || b;
    const cat = CAT[room.cat] || {};
    if (cat.outdoor) return cat.edge === 'rail' ? 'rail' : null;
    return 'ext';
  }

  /* 区間の引き算（openings で壁を切る）。切れ目の端には「キャップ」を付けない */
  function subtract(runs, cuts) {
    if (!cuts.length) return runs;
    let out = runs;
    cuts.forEach(([ca, cb]) => {
      const next = [];
      out.forEach(run => {
        if (cb <= run.a + 1e-6 || ca >= run.b - 1e-6) { next.push(run); return; }
        if (ca > run.a + 1e-6) next.push({ ...run, b: ca, capB: false });
        if (cb < run.b - 1e-6) next.push({ ...run, a: cb, capA: false });
      });
      out = next;
    });
    return out;
  }

  /* 部屋の外周から壁の区間を作る。戻り値: [{o:'h'|'v', c, a, b, kind, capA, capB}] */
  function computeWalls(floor, options = {}) {
    const rooms = floor.rooms;
    const cuttingOpenings = floor.openings.filter(o => !(options.playerView && o.kind === 'secret'));
    const runs = [];
    const kindAt = { h: new Map(), v: new Map() };
    if (rooms.length) {
      const owner = buildOwner(rooms);
      const get = (x, y) => {
        const index = owner.get(cellKey(x, y));
        return index === undefined ? null : rooms[index];
      };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      rooms.forEach(r => {
        minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
      });
      // 横の線（y 一定）
      for (let y = minY; y <= maxY; y++) {
        let cur = null;
        for (let x = minX; x <= maxX; x++) {
          const kind = x < maxX ? edgeKind(get(x, y - 1), get(x, y)) : null;
          if (kind) kindAt.h.set(`${y}:${x}`, kind);
          if (cur && cur.kind === kind) { cur.b = x + 1; continue; }
          if (cur) runs.push(cur);
          cur = kind ? { o: 'h', c: y, a: x, b: x + 1, kind, capA: true, capB: true } : null;
        }
        if (cur) runs.push(cur);
      }
      // 縦の線（x 一定）
      for (let x = minX; x <= maxX; x++) {
        let cur = null;
        for (let y = minY; y <= maxY; y++) {
          const kind = y < maxY ? edgeKind(get(x - 1, y), get(x, y)) : null;
          if (kind) kindAt.v.set(`${x}:${y}`, kind);
          if (cur && cur.kind === kind) { cur.b = y + 1; continue; }
          if (cur) runs.push(cur);
          cur = kind ? { o: 'v', c: x, a: y, b: y + 1, kind, capA: true, capB: true } : null;
        }
        if (cur) runs.push(cur);
      }
    }
    // 手描きの壁のうち水平・垂直なものも、ドア・窓で切れるように区間にする
    const freeRuns = [];
    const freeDiagonal = [];
    floor.walls.forEach(w => {
      if (w.y1 === w.y2) freeRuns.push({ o: 'h', c: w.y1, a: Math.min(w.x1, w.x2), b: Math.max(w.x1, w.x2), kind: w.kind || 'int', capA: true, capB: true, free: w.id });
      else if (w.x1 === w.x2) freeRuns.push({ o: 'v', c: w.x1, a: Math.min(w.y1, w.y2), b: Math.max(w.y1, w.y2), kind: w.kind || 'int', capA: true, capB: true, free: w.id });
      else freeDiagonal.push(w);
    });
    const all = runs.concat(freeRuns);
    // ドア・窓が乗っている壁の種類（厚さ）を記録
    const openingKind = new Map();
    cuttingOpenings.forEach(o => {
      const mid = o.o === 'h' ? o.x + o.len / 2 : o.y + o.len / 2;
      const line = o.o === 'h' ? o.y : o.x;
      let kind = null;
      const unit = Math.floor(mid);
      const k = kindAt[o.o].get(`${line}:${unit}`);
      if (k && k !== 'zone') kind = k;
      if (!kind) {
        const free = freeRuns.find(r => r.o === o.o && Math.abs(r.c - line) < 1e-6 && mid > r.a && mid < r.b);
        if (free) kind = free.kind;
      }
      openingKind.set(o.id, kind || 'int');
    });
    // 線ごとにまとめて切る
    const byLine = new Map();
    all.forEach(run => {
      const key = `${run.o}:${run.c}`;
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(run);
    });
    const result = [];
    byLine.forEach((list, key) => {
      const [o, c] = key.split(':');
      const line = Number(c);
      const cuts = cuttingOpenings
        .filter(op => op.o === o && Math.abs((o === 'h' ? op.y : op.x) - line) < 1e-6)
        .map(op => (o === 'h' ? [op.x, op.x + op.len] : [op.y, op.y + op.len]));
      subtract(list, cuts).forEach(run => { if (run.b - run.a > 1e-6) result.push(run); });
    });
    return { runs: result, diagonal: freeDiagonal, openingKind };
  }

  /* ---------- 幾何ヘルパー ---------- */

  function itemLocalSize(item) {
    const swap = item.rot === 90 || item.rot === 270;
    return swap ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
  }

  function rectsOverlap(a, b, eps = 1e-6) {
    return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
  }

  function rectContains(outer, inner, eps = 1e-6) {
    return inner.x >= outer.x - eps && inner.y >= outer.y - eps && inner.x + inner.w <= outer.x + outer.w + eps && inner.y + inner.h <= outer.y + outer.h + eps;
  }

  function openingRect(o, pad = 0.3) {
    return o.o === 'h'
      ? { x: o.x, y: o.y - pad, w: o.len, h: pad * 2 }
      : { x: o.x - pad, y: o.y, w: pad * 2, h: o.len };
  }

  /* 開口が壁からはみ出して描かれる距離（開き戸の軌跡など）。長い開口や引き戸で余白が広がりすぎないように */
  function openingReach(o) {
    if (['door', 'locked', 'broken', 'secret'].includes(o.kind)) return o.len;
    if (o.kind === 'door2') return o.len / 2;
    if (o.kind === 'auto') return o.len * 0.35;
    if (o.kind === 'folding') return o.len * 0.42;
    if (o.kind === 'hole') return 1;
    return 0.5;
  }

  /* 床の中身すべての外接矩形 */
  function floorBounds(floor) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const add = (x, y, w = 0, h = 0) => {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    };
    floor.rooms.forEach(r => add(r.x, r.y, r.w, r.h));
    floor.items.forEach(i => add(i.x, i.y, i.w, i.h));
    floor.walls.forEach(w => { add(w.x1, w.y1); add(w.x2, w.y2); });
    floor.openings.forEach(o => {
      const r = openingRect(o, openingReach(o));
      add(r.x, r.y, r.w, r.h);
    });
    floor.texts.forEach(t => add(t.x - 2, t.y - 0.5, 4, 1));
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function roomArea(room) {
    return room.w * room.h * CELL_M * CELL_M;
  }

  function sizeText(room, mode, lang) {
    if (!mode || mode === 'none') return '';
    const area = roomArea(room);
    if (mode === 'jo') {
      const jo = area / TATAMI_M2;
      const unit = lang === 'ja' ? '帖' : lang === 'ko' ? '첩' : ' jo';
      return `${jo.toFixed(1)}${unit}`;
    }
    if (mode === 'm2') return `${area.toFixed(1)}㎡`;
    if (mode === 'm') return `${(room.w * CELL_M).toFixed(1)}×${(room.h * CELL_M).toFixed(1)}m`;
    return `${room.w}×${room.h}`;
  }

  /* 名前（多言語オブジェクト or 文字列）を現在の言語で取り出す */
  function pick(value, lang) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.ja || value.en || '';
  }

  global.IMM = global.IMM || {};
  Object.assign(global.IMM, {
    CELL_M, TATAMI_M2, CATEGORIES, CAT, OPENINGS, OPEN, WALL_KINDS, WALL,
    uid, snap, clone, emptyFloor, emptyProject, visibleFloor, computeWalls,
    itemLocalSize, rectsOverlap, rectContains, openingRect, floorBounds, roomArea, sizeText, pick
  });
})(window);
