/* TRPG室内図メーカー — テンプレート（実在の間取りの定石に沿って手作りした見取り図）
 * 1マス = 0.5m。部屋・ドア・窓・家具の位置はすべてマス単位。
 * 参考にした定石:
 *  - 1LDK/2LDK: 北側に共用廊下と玄関、水回りは中央にまとめ、LDKは南のバルコニー側（中廊下型・田の字型）
 *  - 一戸建て: 1Fに玄関ホール＋階段・LDK・水回り、2Fに寝室。階段の位置は上下階でそろえる
 *  - 洋館: 左右対称。中央に玄関ホールと大階段、奥に大広間、両翼に書斎・食堂・厨房、地下にワインセラー
 *  - ホテル: 中廊下の両側に同じ客室を並べ、中央にEV・階段のコア。客室は入口脇に浴室、奥に窓とベッド
 *  - ホテル（他の階）: 宴会場は厨房とサービス通路を奥に、ホワイエを客の動線に。プール・ジムは更衣室を経由
 *  - 病院: 病棟は中廊下の両側に4床室・個室、中央にナースステーションとEV、端に非常階段
 *  - アパート: 北側の外廊下に玄関、1Kは玄関→キッチン→居室→バルコニーの一直線。隣戸は鏡写しで水回りを背中合わせ
 *  - タワーマンション: 中央にEV・階段2か所（二方向避難）のコア、内廊下が囲み、外周に住戸とバルコニー
 *  - 学校: 北側廊下・南側教室の片廊下型。教室は約8m角で黒板は西、1Fに昇降口・職員室・保健室
 *  - 警察署: 1Fに窓口（交通課・会計課）とロビー、2Fに刑事課・取調室（観察室のマジックミラー）・留置場
 *  - 図書館・大学・劇場・ライブハウス・バー: 客の動線（入口→受付→主室）とスタッフの動線（事務室・楽屋・厨房）を分ける
 *  - もぐり酒場: 表は合法の店（理髪店）、奥の部屋の合言葉の扉から酒場へ。酒蔵は裏路地から搬入、手入れ用の隠し出口
 *  - 1920年代の雑居ビル: 1Fは通りに面した店舗、中央の階段で2Fの事務所（待合室→所長室）と住まいへ
 *  - 宇宙船: 船尾に機関室、船首にブリッジ、中央通路の両側に居住区と医務室・食堂。外へはエアロックの二重扉
 *  - 研究基地: 中央ハブから放射状に通路とモジュール（居住・研究・通信と発電・車庫とエアロック）
 *  - 古民家: 土間（かまど・流し）に面して板の間と囲炉裏、田の字型の座敷、南に縁側。風呂・厠・蔵・納屋は別棟
 *  - 神社: 鳥居→参道（手水舎・狛犬・灯籠）→拝殿→幣殿→本殿の一直線。社務所は参道の脇
 *  - 洞窟・キャンプ場: 屋外の部屋どうしは壁なしでつながる。洞窟の外周は岩壁
 */
(function (global) {
  'use strict';

  const M = global.IMM;
  const T = (ja, en, ko) => ({ ja, en, ko });

  /* よく使う部屋名 */
  const N = {
    entrance: T('玄関', 'Entrance', '현관'),
    hall: T('廊下', 'Hallway', '복도'),
    entryHall: T('玄関ホール', 'Entry hall', '현관 홀'),
    ldk: T('LDK', 'LDK', 'LDK'),
    living: T('リビング', 'Living room', '거실'),
    dining: T('ダイニング', 'Dining room', '다이닝룸'),
    kitchen: T('キッチン', 'Kitchen', '주방'),
    bedroom: T('寝室', 'Bedroom', '침실'),
    room: T('個室', 'Room', '방'),
    western1: T('洋室1', 'Room 1', '방1'),
    western2: T('洋室2', 'Room 2', '방2'),
    bath: T('浴室', 'Bathroom', '욕실'),
    wash: T('洗面室', 'Washroom', '세면실'),
    toilet: T('トイレ', 'WC', '화장실'),
    storage: T('収納', 'Closet', '수납'),
    closet: T('クローゼット', 'Closet', '옷장'),
    nando: T('納戸', 'Storeroom', '창고방'),
    shoes: T('シューズクローク', 'Shoe closet', '신발장'),
    balcony: T('バルコニー', 'Balcony', '발코니'),
    stairs: T('階段', 'Stairs', '계단'),
    stairHall: T('階段ホール', 'Stair hall', '계단 홀'),
    evHall: T('EVホール', 'Elevator hall', '엘리베이터 홀'),
    corridor: T('廊下', 'Corridor', '복도'),
    storeroom: T('倉庫', 'Storage', '창고'),
    office: T('事務室', 'Office', '사무실'),
    staff: T('スタッフ室', 'Staff room', '직원실')
  };

  /* ---------- フロアを組み立てる小さな道具 ---------- */

  function makeFloor(name) {
    const f = { name, rooms: [], walls: [], openings: [], items: [], texts: [] };
    const api = {
      f,
      room(n, cat, x, y, w, h, extra) { f.rooms.push({ name: n, cat, x, y, w, h, ...(extra || {}) }); return api; },
      // 横の線（y 一定）の上のドア。side: +1 = 下側に開く / -1 = 上側に開く。hinge: 0 = 左端 / 1 = 右端
      dh(x, y, len, side, hinge, kind, extra) { f.openings.push({ kind: kind || 'door', o: 'h', x, y, len, side: side || 1, hinge: hinge || 0, ...(extra || {}) }); return api; },
      // 縦の線（x 一定）の上のドア。side: +1 = 右側に開く / -1 = 左側に開く。hinge: 0 = 上端 / 1 = 下端
      dv(x, y, len, side, hinge, kind, extra) { f.openings.push({ kind: kind || 'door', o: 'v', x, y, len, side: side || 1, hinge: hinge || 0, ...(extra || {}) }); return api; },
      wh(x, y, len, kind) { f.openings.push({ kind: kind || 'window', o: 'h', x, y, len, side: 1, hinge: 0 }); return api; },
      wv(x, y, len, kind) { f.openings.push({ kind: kind || 'window', o: 'v', x, y, len, side: 1, hinge: 0 }); return api; },
      // 家具。x,y は回転後の外形の左上
      item(t, x, y, rot, extra) {
        const a = M.ASSET[t];
        const r = rot || 0;
        const e = { ...(extra || {}) };
        let w = a.w, h = a.h;
        if (e.size) { w = e.size[0]; h = e.size[1]; delete e.size; }
        const swap = r === 90 || r === 270;
        f.items.push({ t, x, y, w: swap ? h : w, h: swap ? w : h, rot: r, ...e });
        return api;
      },
      text(text, x, y, extra) { f.texts.push({ text, x, y, ...(extra || {}) }); return api; },
      wall(x1, y1, x2, y2, kind, extra) { f.walls.push({ x1, y1, x2, y2, kind: kind || 'int', ...(extra || {}) }); return api; }
    };
    return api;
  }

  /* 同じ間取りを別の場所に置く道具。ローカル座標（幅 w・奥行 h の枠）で書いた部屋・ドア・家具を
   * (ox, oy) に置く。tr で縦横を入れ替え（対角線で鏡写し）、fx / fy で左右・上下を反転する。
   * 90° 回転 = tr + fx、180° = fx + fy、270° = tr + fy */
  function placer(b, ox, oy, w, h, fx, fy, tr) {
    const bw = tr ? h : w, bh = tr ? w : h;
    const rect = (x, y, rw, rh) => {
      if (tr) [x, y, rw, rh] = [y, x, rh, rw];
      if (fx) x = bw - x - rw;
      if (fy) y = bh - y - rh;
      return [ox + x, oy + y, rw, rh];
    };
    const point = (x, y) => rect(x, y, 0, 0).slice(0, 2);
    // 横の線上の開口（o='h'）を置く。tr なら縦の線上になる
    const opening = (o, x, y, len, side, hinge, kind, extra) => {
      let horiz = o === 'h';
      let px = x, py = y, s = side || 1, hg = hinge || 0;
      if (tr) { [px, py] = [py, px]; horiz = !horiz; }
      if (horiz) {
        if (fx) { px = bw - px - len; hg = 1 - hg; }
        if (fy) { py = bh - py; s = -s; }
      } else {
        if (fx) { px = bw - px; s = -s; }
        if (fy) { py = bh - py - len; hg = 1 - hg; }
      }
      if (horiz) b.dh(ox + px, oy + py, len, s, hg, kind, extra); else b.dv(ox + px, oy + py, len, s, hg, kind, extra);
    };
    const api = {
      room(n, cat, x, y, rw, rh, extra) {
        const e = { ...(extra || {}) };
        if (tr) [e.lx, e.ly] = [e.ly, e.lx];
        if (fx && e.lx) e.lx = -e.lx;
        if (fy && e.ly) e.ly = -e.ly;
        if (!e.lx) delete e.lx;
        if (!e.ly) delete e.ly;
        const [rx, ry, ww, hh] = rect(x, y, rw, rh);
        b.room(n, cat, rx, ry, ww, hh, e);
        return api;
      },
      dh(x, y, len, side, hinge, kind, extra) { opening('h', x, y, len, side, hinge, kind, extra); return api; },
      dv(x, y, len, side, hinge, kind, extra) { opening('v', x, y, len, side, hinge, kind, extra); return api; },
      wh(x, y, len, kind) { opening('h', x, y, len, 1, 0, kind || 'window'); return api; },
      wv(x, y, len, kind) { opening('v', x, y, len, 1, 0, kind || 'window'); return api; },
      // 鏡写しにすると家具の向きは反転（flip）する。回転は 入れ替え: 270-r、左右: 360-r、上下: 180-r
      item(t, x, y, rot, extra) {
        const a = M.ASSET[t];
        const e = { ...(extra || {}) };
        let r = rot || 0;
        const sw = e.size ? e.size[0] : a.w, sh = e.size ? e.size[1] : a.h;
        const swap = r === 90 || r === 270;
        const [ix, iy] = rect(x, y, swap ? sh : sw, swap ? sw : sh);
        let flip = Boolean(e.flip);
        if (tr) { r = (630 - r) % 360; flip = !flip; }
        if (fx) { r = (360 - r) % 360; flip = !flip; }
        if (fy) { r = (540 - r) % 360; flip = !flip; }
        if (flip) e.flip = true; else delete e.flip;
        b.item(t, ix, iy, r, e);
        return api;
      },
      text(text, x, y, extra) { const [px, py] = point(x, y); b.text(text, px, py, extra); return api; },
      wall(x1, y1, x2, y2, kind, extra) {
        const [ax, ay] = point(x1, y1), [bx, by] = point(x2, y2);
        b.wall(ax, ay, bx, by, kind, extra);
        return api;
      }
    };
    return api;
  }

  /* ---------- 1LDK（約44㎡・ワンフロア） ---------- */

  function oneLDK() {
    const b = makeFloor('1F');
    b.room(N.wash, 'wet', 0, 0, 4, 5)
      .room(N.bath, 'wet', 4, 0, 3, 5)
      .room(N.storage, 'storage', 7, 0, 2, 5)
      .room(N.room, 'bedroom', 9, 0, 8, 5)
      .room(N.entrance, 'hall', 0, 5, 2, 3)
      .room(N.hall, 'hall', 2, 5, 4, 3, { hideLabel: true })
      .room(N.toilet, 'wet', 4, 8, 2, 3, { ly: -0.6 })
      .room(N.ldk, 'living', 6, 5, 11, 6)
      .room(N.balcony, 'balcony', 17, 0, 3, 11);
    b.dv(0, 5.25, 1.5, -1, 1)                   // 玄関ドア（外開き）
      .dv(2, 5, 3, 1, 0, 'open')                // 玄関の上がり框
      .dh(2.25, 5, 1.5, -1, 0)                  // 洗面室
      .dv(4, 2.75, 1.5, 1, 1, 'folding')        // 浴室（中折れ戸）
      .dh(4.25, 8, 1.5, -1, 1)                  // トイレ（外開き）
      .dv(6, 5.5, 1.5, 1, 0)                    // LDK
      .dh(9.5, 5, 1.5, -1, 0)                   // 個室
      .dv(9, 1, 3, 1, 0, 'folding')             // 収納
      .wh(11.5, 0, 3)
      .wv(17, 1, 3, 'window2')
      .wv(17, 6, 4, 'window2');
    b.item('washer', 0, 0).item('washbasin', 1.8, 0)
      .item('bathtub', 4, 0, 90)
      .item('bed_single', 12, 0).item('nightstand', 14.2, 0)
      .item('cabinet', 0, 7.3, 180, { size: [2, 0.7] })
      .item('toilet', 4.5, 9.4, 180)
      .item('kitchen', 6, 9.7, 180).item('fridge', 11, 9.6, 180)
      .item('dining2', 8, 6, 90)
      .item('rug', 12.8, 6.9)
      .item('sofa2', 13, 5).item('lowtable', 13.5, 7.4).item('tv', 13, 10.1, 180)
      .item('plant', 18.4, 0.3);
    return [b.f];
  }

  /* ---------- 2LDK（約64㎡・中廊下型） ---------- */

  function twoLDK() {
    const b = makeFloor('1F');
    b.room(N.western1, 'bedroom', 0, 0, 6, 7)
      .room(N.entrance, 'hall', 6, 0, 3, 3)
      .room(N.western2, 'bedroom', 9, 0, 6, 6)
      .room(N.hall, 'hall', 6, 3, 3, 7, { hideLabel: true })
      .room(N.bath, 'wet', 0, 7, 3, 3)
      .room(N.wash, 'wet', 3, 7, 3, 3)
      .room(N.toilet, 'wet', 9, 6, 2, 4)
      .room(N.closet, 'storage', 11, 6, 4, 2)
      .room(N.nando, 'storage', 11, 8, 4, 2)
      .room(N.ldk, 'living', 0, 10, 15, 7)
      .room(N.balcony, 'balcony', 0, 17, 15, 3);
    b.dh(6.5, 0, 2, -1, 1)                      // 玄関ドア（共用廊下へ外開き）
      .dh(6, 3, 3, 1, 0, 'open')                // 上がり框
      .dv(6, 4, 1.5, -1, 1)                     // 洋室1
      .dv(9, 4, 1.5, 1, 1)                      // 洋室2
      .dh(11.5, 6, 3, -1, 0, 'folding')         // クローゼット（洋室2から）
      .dv(6, 7.1, 1.5, -1, 0, 'sliding')        // 洗面室（引き戸）
      .dv(3, 8.3, 1.5, -1, 1, 'folding')        // 浴室（洗面台・洗濯機をよけて下寄せ）
      .dv(9, 7.25, 1.5, -1, 1)                  // トイレ（外開き）
      .dh(12, 10, 1.5, 1, 0, 'sliding')         // 納戸（LDKから）
      .dh(6.75, 10, 1.5, 1, 0)                  // LDK
      .wh(1.5, 0, 3)
      .wh(10.5, 0, 3)
      .wh(1.5, 17, 4, 'window2')
      .wh(9, 17, 4, 'window2');
    b.item('bed_single', 0, 0.2, 270).item('nightstand', 0, 2.3)
      .item('desk', 0, 4.4, 270).item('dresser', 2.4, 6.1, 180)
      .item('bed_single', 11, 0.2, 90).item('desk', 9, 0, 270, { size: [2.2, 1.2] })
      .item('bathtub', 0, 7, 0)
      .item('washbasin', 3.05, 7).item('washer', 4.65, 8.7, 180)
      .item('toilet', 9.5, 8.4, 180)
      .item('cabinet', 11.2, 8, 0, { size: [3.5, 1] })
      .item('kitchen', 0, 10.3, 270).item('fridge', 0, 15.4, 270)
      .item('dining4', 3.2, 11.4)
      .item('rug', 10.4, 12.2, 90)
      .item('sofa3', 8.6, 11.8, 270).item('lowtable', 11, 13.1, 90).item('tv', 14.1, 12.6, 90)
      .item('plant', 13.6, 10.3);
    return [b.f];
  }

  /* ---------- 事件現場（1LDK） ---------- */

  function crimeScene() {
    const floors = oneLDK();
    const f = floors[0];
    f.name = '1F';
    const push = (t, x, y, rot, extra) => {
      const a = M.ASSET[t];
      const r = rot || 0;
      const e = { ...(extra || {}) };
      const w = e.size ? e.size[0] : a.w, h = e.size ? e.size[1] : a.h;
      delete e.size;
      const swap = r === 90 || r === 270;
      f.items.push({ t, x, y, w: swap ? h : w, h: swap ? w : h, rot: r, ...e });
    };
    // 家具の一部を倒れた位置にずらす
    f.items = f.items.filter(i => i.t !== 'dining2' && i.t !== 'rug');
    push('table', 8.2, 6.2, 0, { size: [2.4, 1.4] });
    push('chair', 10.6, 6.4, 90);
    push('chair', 7.3, 8.3, 180);
    push('body', 10.8, 6.3, 90);
    push('blood', 10.9, 7.1, 0, { size: [2.6, 2] });
    push('glass', 12.2, 8.6);
    push('footprints', 6.6, 6.8, 270, { size: [1, 3.4] });
    push('evidence', 9.1, 9.1, 0, { label: '1' });
    push('evidence', 13.3, 9, 0, { label: '2' });
    push('evidence', 7.8, 5.4, 0, { label: '3' });
    push('evidence', 16, 2.8, 0, { label: '4', gm: true });
    push('tape', 0.3, 5.1, 90, { size: [1.8, 0.35] });
    push('clue', 18.9, 1.4, 0, { gm: true });
    push('safe', 7.4, 3.6, 0, { gm: true, label: '' });
    f.rooms.forEach(r => { if (r.name === N.balcony) r.note = T('凶器はベランダの植木鉢の中', 'The weapon is hidden in the balcony planter', '흉기는 발코니 화분 속에 있다'); });
    f.rooms.forEach(r => { if (r.name === N.storage) r.note = T('〈目星〉で奥の壁に隠し金庫', 'Spot Hidden: a safe behind the back wall', '〈관찰력〉으로 안쪽 벽의 비밀 금고 발견'); });
    return floors;
  }

  /* ---------- 一戸建て（2階建て・4LDK） ---------- */

  function house() {
    const g = makeFloor('1F');
    g.room(N.dining, 'kitchen', 0, 0, 9, 8)
      .room(N.kitchen, 'kitchen', 9, 0, 7, 8)
      .room(T('朝食スペース', 'Breakfast nook', '아침 식사 공간'), 'kitchen', 16, 0, 7, 8)
      .room(N.bath, 'wet', 23, 0, 5, 4)
      .room(T('家事室', 'Laundry', '세탁실'), 'wet', 23, 4, 5, 4)
      .room(N.living, 'living', 0, 8, 11, 9)
      .room(N.entryHall, 'hall', 11, 8, 6, 9)
      .room(T('ファミリールーム', 'Family room', '패밀리룸'), 'living', 17, 8, 11, 9)
      .room(T('ポーチ', 'Porch', '포치'), 'porch', 12, 17, 4, 2);
    g.dh(13.5, 17, 2, -1, 0)                   // 玄関ドア（内開き）
      .dv(11, 14.25, 2.5, 1, 0, 'open')        // 玄関ホール ↔ リビング
      .dv(17, 11, 3, 1, 0, 'door2')            // 玄関ホール ↔ ファミリールーム
      .dh(14, 8, 2, 1, 0, 'open')              // 玄関ホール ↔ キッチン
      .dv(9, 2, 4, 1, 0, 'open')               // ダイニング ↔ キッチン
      .dv(16, 1, 6, 1, 0, 'open')              // キッチン ↔ 朝食スペース
      .dh(2, 8, 4, 1, 0, 'open')               // ダイニング ↔ リビング
      .dh(18, 8, 4, 1, 0, 'open')              // 朝食スペース ↔ ファミリールーム
      .dv(23, 5, 1.5, 1, 0)                    // 家事室
      .dh(24.5, 4, 1.5, -1, 0)                 // 浴室
      .dv(28, 4.5, 1.5, -1, 0)                 // 勝手口
      .wh(3, 0, 3).wh(11, 0, 2).wh(18, 0, 3, 'window2')
      .wh(2, 17, 3, 'window2').wh(7, 17, 3, 'window2').wh(19, 17, 3).wh(24, 17, 3)
      .wv(28, 14.8, 2).wv(0, 9.5, 1.5);
    g.item('dining6', 2.3, 2.3).item('cupboard', 0, 2.5, 270)
      .item('kitchen', 9.5, 0).item('fridge', 14.6, 0).item('island', 10.5, 3.5)
      .item('dining_round', 17.8, 2.3)
      .item('shower', 23, 0).item('washbasin', 25, 0).item('toilet', 27, 0, 0)
      .item('washer', 26.5, 6.7, 180).item('cabinet', 23.3, 7, 180)
      .item('fireplace', 0, 11.5, 270).item('rug', 2.4, 10.6, 90)
      .item('sofa3', 6.5, 10.3, 90).item('lowtable', 3.6, 11.4, 90).item('armchair', 2.2, 14.8)
      .item('stairs', 11, 9)
      .item('plant', 15.6, 8.3)
      .item('tv', 27.1, 11, 90).item('sofa3', 20.5, 10.4, 270).item('lowtable', 23.6, 11.5, 90)
      .item('bookshelf', 17.2, 15.6, 180, { size: [3, 0.8] })
      .item('plant', 26.6, 15.6);

    const u = makeFloor('2F');
    u.room(T('寝室3', 'Bedroom 3', '침실3'), 'bedroom', 0, 0, 9, 9)
      .room(T('バス1', 'Bath 1', '욕실1'), 'wet', 9, 0, 4, 6)
      .room(T('寝室4', 'Bedroom 4', '침실4'), 'bedroom', 13, 0, 7, 6)
      .room(T('バス2', 'Bath 2', '욕실2'), 'wet', 20, 0, 8, 6)
      .room(N.hall, 'hall', 9, 6, 11, 3)
      .room(T('ウォークインクローゼット', 'Walk-in closet', '드레스룸'), 'storage', 20, 6, 8, 3)
      .room(T('寝室2', 'Bedroom 2', '침실2'), 'bedroom', 0, 9, 11, 8)
      .room(N.stairHall, 'hall', 11, 9, 5, 5, { hideLabel: true })
      .room(T('リネン庫', 'Linen', '린넨실'), 'storage', 11, 14, 5, 3)
      .room(T('主寝室', 'Master bedroom', '안방'), 'bedroom', 16, 9, 12, 8);
    u.dv(9, 6.75, 1.5, -1, 1)                  // 寝室3
      .dh(10.5, 6, 1.5, -1, 0)                 // バス1
      .dh(14, 6, 1.5, -1, 0)                   // 寝室4
      .dh(9.25, 9, 1.5, 1, 0)                  // 寝室2
      .dh(11, 9, 5, 1, 0, 'open')              // 階段ホール
      .dh(13.5, 14, 1.5, 1, 1)                 // リネン庫
      .dh(17, 9, 1.5, 1, 0)                    // 主寝室
      .dh(21, 9, 1.5, -1, 0)                   // WIC
      .dh(24.5, 6, 1.5, -1, 0)                 // バス2
      .wh(2, 0, 3).wv(0, 3, 3).wh(10, 0, 2).wh(15.5, 0, 3).wh(24, 0, 2)
      .wh(2, 17, 3).wh(6.5, 17, 3).wh(20, 17, 3).wh(24, 17, 3).wv(0, 12, 3);
    u.item('bed_double', 0, 1.5, 270).item('nightstand', 0, 0.5).item('wardrobe', 7.8, 0.5, 90)
      .item('desk_set', 1, 6.6, 180)
      .item('bathtub', 9, 0, 90).item('toilet', 11.4, 2.6, 90).item('washbasin', 9, 2.4, 270)
      .item('bed_single', 16, 0.3, 90).item('desk', 13, 0.5, 270)
      .item('bed_double', 0, 12, 270).item('nightstand', 0, 11.1).item('wardrobe', 1, 9).item('desk', 9.8, 12.5, 90)
      .item('stairs', 11, 9)
      .item('cabinet', 11.5, 16, 180)
      .item('bed_double', 24, 11.6, 90).item('nightstand', 27.1, 10.6).item('nightstand', 27.1, 14.5)
      .item('dresser', 16.5, 16.1, 180).item('armchair', 17.2, 12.4).item('lowtable', 17.5, 14.4, 0, { size: [1.4, 1] })
      .item('wardrobe', 23, 7.8, 180).item('wardrobe', 20, 6)
      .item('bathtub', 20.3, 0, 90).item('shower', 26.2, 0).item('toilet', 26.4, 3, 90)
      .item('washbasin', 20.5, 4.9, 180).item('washbasin', 22.3, 4.9, 180);
    return [g.f, u.f, houseOutside()];
  }

  /* ---------- 洋館（B1・1F・2F、左右対称） ---------- */

  function mansion() {
    const g = makeFloor('1F');
    g.room(T('書斎', 'Study', '서재'), 'office', 0, 0, 7, 9)
      .room(T('図書室', 'Library', '도서실'), 'public', 7, 0, 7, 9)
      .room(T('大広間', 'Great hall', '대연회장'), 'public', 14, 0, 12, 12)
      .room(T('厨房', 'Kitchen', '주방'), 'kitchen', 26, 0, 8, 9)
      .room(T('食料庫', 'Pantry', '식료품 저장고'), 'storage', 34, 0, 6, 5)
      .room(T('使用人室', 'Servant room', '하인 방'), 'bedroom', 34, 5, 6, 4)
      .room(T('西廊下', 'West corridor', '서쪽 복도'), 'hall', 0, 9, 14, 3, { hideLabel: true })
      .room(T('東廊下', 'East corridor', '동쪽 복도'), 'hall', 26, 9, 14, 3, { hideLabel: true })
      .room(T('応接室', 'Drawing room', '응접실'), 'living', 0, 12, 14, 10)
      .room(N.entryHall, 'hall', 14, 12, 12, 10)
      .room(T('食堂', 'Dining hall', '식당'), 'kitchen', 26, 12, 14, 10)
      .room(T('ポーチ', 'Porch', '포치'), 'porch', 16, 22, 8, 3)
      .room(T('ガレージ', 'Garage', '차고'), 'garage', 0, 22, 12, 11)
      .room(T('ガレージ', 'Garage', '차고'), 'garage', 28, 22, 12, 11);
    g.dh(18.5, 22, 3, -1, 0, 'door2')          // 正面玄関
      .dh(18.5, 12, 3, -1, 0, 'door2')         // 大広間
      .dv(14, 18.5, 1.5, -1, 1)                // 応接室
      .dv(26, 18.5, 1.5, 1, 1)                 // 食堂
      .dv(14, 9.75, 1.5, 1, 0)                 // 西廊下 ↔ 大広間
      .dv(26, 9.75, 1.5, -1, 0)                // 東廊下 ↔ 大広間
      .dh(3, 9, 1.5, -1, 0)                    // 書斎
      .dh(9.5, 9, 1.5, -1, 0)                  // 図書室
      .dh(6, 12, 1.5, 1, 0)                    // 応接室（廊下側）
      .dh(29, 9, 1.5, -1, 1)                   // 厨房
      .dh(30, 12, 1.5, 1, 0)                   // 食堂（廊下側）
      .dv(34, 3.25, 1.5, 1, 1)                 // 食料庫
      .dh(36.5, 9, 1.5, -1, 0)                 // 使用人室
      .dv(40, 9.75, 1.5, -1, 0)                // 勝手口
      .dh(1, 33, 10, -1, 0, 'shutter').dh(29, 33, 10, -1, 0, 'shutter')
      .dv(12, 24, 1.5, -1, 0).dv(28, 24, 1.5, 1, 0)
      .wh(1.5, 0, 3).wh(8.5, 0, 3).wh(15, 0, 2.5).wh(23, 0, 2.5)
      .wh(28, 0, 3).wh(36, 0, 2)
      .wv(0, 14, 3).wv(0, 18, 3).wv(40, 14, 3).wv(40, 18, 3)
      .wh(14.5, 22, 1).wh(24.5, 22, 1)
      .wv(0, 2, 3).wv(40, 6, 2);
    g.item('office_desk', 1.5, 2.6).item('chair', 2.2, 4.1, 180).item('bookshelf', 0, 0).item('bookshelf', 3.5, 0, 0, { size: [3.5, 0.8] })
      .item('safe', 5.6, 7.6).item('armchair', 0.3, 6.6)
      .item('bookshelf', 7, 0, 0, { size: [7, 0.8] }).item('bookshelf', 13.2, 1.5, 90, { size: [6, 0.8] })
      .item('table', 8.5, 3.6).item('chair', 9.4, 2.6).item('chair', 9.4, 5.2, 180)
      .item('fireplace', 18.5, 0).item('sofa3', 17.8, 3.2, 180).item('lowtable', 18.9, 5.4)
      .item('armchair', 15.2, 5.4, 90).item('armchair', 22.9, 5.4, 270)
      .item('piano', 22.8, 0.4, 0).item('rug', 16.8, 5, 0, { size: [6.4, 4.4] })
      .item('kitchen', 26, 0).item('stove', 31, 0).item('island', 28, 3.5).item('fridge', 32.6, 7.6, 180)
      .item('stairs', 35, 0, 90)
      .item('cabinet', 36.2, 4, 180, { size: [3.5, 1] })
      .item('bed_single', 36, 5.1, 90)
      .item('sofa3', 3, 16, 0).item('lowtable', 4.1, 18.3).item('armchair', 1, 18, 90).item('armchair', 7.8, 18, 270)
      .item('fireplace', 3.5, 20.8, 180).item('rug', 2, 15.5, 0, { size: [7, 5] }).item('piano_up', 10.6, 13.2, 90)
      .item('stairs', 14.2, 12.2, 0, { size: [2.4, 6] }).item('stairs', 23.4, 12.2, 0, { size: [2.4, 6] })
      .item('rug', 17.8, 15, 0, { size: [4.4, 5] })
      .item('plant', 14.4, 20.4).item('plant', 24.4, 20.4)
      .item('dining6', 28.8, 14.5).item('dining6', 33.2, 14.5).item('cupboard', 30, 21.1, 180).item('fireplace', 38.8, 15.5, 90)
      .item('car', 1.5, 23.3).item('car', 6.5, 23.3).item('car', 29.5, 23.3).item('car', 34.5, 23.3);
    g.f.rooms[5].note = T('夜になると主人の部屋から物音がすると証言する', 'Says there are noises from the master\'s room at night', '밤이 되면 주인 방에서 소리가 난다고 증언한다');

    const u = makeFloor('2F');
    u.room(T('客室1', 'Guest room 1', '객실1'), 'bedroom', 0, 0, 7, 9)
      .room(T('客室2', 'Guest room 2', '객실2'), 'bedroom', 7, 0, 7, 9)
      .room(T('主寝室', 'Master bedroom', '주인 침실'), 'bedroom', 14, 0, 8, 9)
      .room(T('主寝室バス', 'Master bath', '주인 욕실'), 'wet', 22, 0, 4, 9)
      .room(T('子供部屋', 'Child\'s room', '아이 방'), 'bedroom', 26, 0, 8, 9)
      .room(N.bath, 'wet', 34, 0, 6, 5)
      .room(T('脱衣室', 'Dressing room', '탈의실'), 'wet', 34, 5, 6, 4)
      .room(N.corridor, 'hall', 0, 9, 40, 3, { hideLabel: true })
      .room(T('客室3', 'Guest room 3', '객실3'), 'bedroom', 0, 12, 10, 10)
      .room(N.bath, 'wet', 10, 12, 4, 5)
      .room(T('書庫', 'Archive', '서고'), 'storage', 10, 17, 4, 5)
      .room(T('ギャラリー', 'Gallery', '갤러리'), 'hall', 14, 12, 12, 10)
      .room(N.toilet, 'wet', 26, 12, 4, 5)
      .room(T('納戸', 'Storeroom', '창고방'), 'storage', 26, 17, 4, 5)
      .room(T('音楽室', 'Music room', '음악실'), 'public', 30, 12, 10, 10)
      .room(N.balcony, 'balcony', 16, 22, 8, 3);
    u.dh(14, 12, 12, 1, 0, 'open')             // 廊下 ↔ ギャラリー（吹き抜けの回廊）
      .dh(3, 9, 1.5, -1, 0).dh(10, 9, 1.5, -1, 0).dh(16, 9, 1.5, -1, 0).dh(29, 9, 1.5, -1, 0)
      .dv(22, 3, 1.5, 1, 0)                    // 主寝室バス
      .dh(36, 9, 1.5, -1, 0)                   // 脱衣室（廊下から）
      .dh(36, 5, 1.5, -1, 0)                   // 浴室（脱衣室から）
      .dh(6, 12, 1.5, 1, 0).dh(11, 12, 1.5, 1, 0).dv(14, 19, 1.5, -1, 1)
      .dh(27, 12, 1.5, 1, 0).dv(26, 19, 1.5, 1, 1)
      .dh(31, 12, 1.5, 1, 0)                   // 音楽室（廊下から）
      .dh(18.5, 22, 3, 1, 0, 'window2')
      .wh(2, 0, 3).wh(9, 0, 3).wh(16.5, 0, 3).wh(23, 0, 1.5).wh(28.5, 0, 3).wh(36, 0, 2)
      .wv(0, 14, 3).wv(0, 18, 3).wv(40, 14, 3).wv(40, 18, 3)
      .wh(2, 22, 3).wh(33, 22, 3).wv(0, 3, 3).wv(40, 6, 2);
    u.item('bed_single', 0, 0.5, 270).item('nightstand', 0, 2.6).item('wardrobe', 5.8, 0.4, 90).item('desk', 0.2, 6.6, 180, { size: [2.4, 1.2] })
      .item('bed_single', 7, 0.5, 270).item('nightstand', 7, 2.6).item('wardrobe', 12.8, 0.4, 90).item('desk', 7.2, 6.6, 180, { size: [2.4, 1.2] })
      .item('bed_double', 15.5, 0).item('nightstand', 14.5, 0).item('nightstand', 18.4, 0).item('dresser', 19.8, 6.9, 90).item('armchair', 14.2, 5.6)
      .item('bathtub', 24.4, 0.3, 0).item('toilet', 22.2, 6.8, 270, { size: [1, 1.6] }).item('washbasin', 24.9, 6.2, 90)
      .item('bed_single', 30, 0.3, 90).item('desk', 26.2, 0.3, 270).item('bookshelf', 30.5, 7.4, 180, { size: [3.3, 0.8] }).item('rug', 27, 3.4, 0, { size: [4, 2.8] })
      .item('bathtub', 34.2, 0.2, 90).item('washbasin', 38.4, 3.2, 90, { size: [1.6, 1.1] })
      .item('cabinet', 34, 8, 180, { size: [2, 1] }).item('cabinet', 37.8, 8, 180, { size: [2.2, 1] })
      .item('bed_double', 0, 15, 270).item('nightstand', 0, 14).item('nightstand', 0, 17.9).item('wardrobe', 6, 20.8, 180).item('armchair', 7.6, 13).item('desk', 2.5, 20.8, 180, { size: [2.4, 1.2] })
      .item('bathtub', 10.2, 15.4, 90).item('washbasin', 12.9, 12.3, 90, { size: [1.6, 1.1] })
      .item('bookshelf', 10, 21.2, 180, { size: [4, 0.8] }).item('crate', 10.4, 18.6)
      .item('stairs', 14.2, 12.2, 0, { size: [2.4, 6] }).item('stairs', 23.4, 12.2, 0, { size: [2.4, 6] })
      .item('toilet', 27.5, 15.4, 180).item('washbasin', 28.9, 13.7, 90, { size: [1.6, 1.1] })
      .item('crate', 28.3, 20.3).item('barrel', 26.3, 20.7).item('cabinet', 26.1, 17.1, 0, { size: [2.4, 0.9] })
      .item('piano', 34, 13, 0).item('armchair', 31, 19.5).item('armchair', 33.5, 19.5).item('bookshelf', 39.2, 18, 90, { size: [3.5, 0.8] })
      .item('plant', 16.4, 23.2).item('plant', 22.4, 23.2);
    u.f.rooms[10].note = T('先代当主の日記。〈図書館〉で地下の隠し部屋に触れた記述', 'Diary of the late master; Library Use finds notes on a hidden basement room', '선대 당주의 일기. 〈자료조사〉로 지하 비밀방에 대한 기록 발견');

    const bm = makeFloor('B1');
    bm.room(T('階段室', 'Stairwell', '계단실'), 'hall', 34, 0, 6, 6)
      .room(T('ワインセラー', 'Wine cellar', '와인 저장고'), 'storage', 26, 0, 8, 10)
      .room(T('地下通路', 'Basement passage', '지하 통로'), 'hall', 34, 6, 6, 6)
      .room(T('ボイラー室', 'Boiler room', '보일러실'), 'garage', 26, 10, 8, 6)
      .room(T('隠し部屋', 'Hidden room', '비밀의 방'), 'special', 18, 2, 8, 8, { gm: true, plName: '', note: T('ワインセラーの棚の裏に隠し扉', 'Secret door behind the wine rack', '와인 선반 뒤에 비밀문') });
    bm.dv(34, 3, 1.5, -1, 1)
      .dh(36, 6, 1.5, 1, 0)
      .dv(34, 10.25, 1.5, -1, 0)             // ボイラー室（地下通路から）
      .dv(26, 5, 1.5, -1, 0, 'secret');
    bm.item('stairs', 35, 0, 90)
      .item('bookshelf', 26.2, 0, 0, { size: [7.5, 0.9] }).item('bookshelf', 26.2, 4, 0, { size: [6, 0.9] }).item('bookshelf', 26.2, 6.6, 0, { size: [6, 0.9] })
      .item('barrel', 32.4, 8.4).item('barrel', 31, 8.6).item('table', 27, 8.5, 0, { size: [2.4, 1.2] })
      .item('crate', 38.4, 8.2).item('crate', 38.4, 10.2)
      .item('rack', 26.3, 13.8, 90, { size: [1.4, 2] }).item('tank', 30.5, 12.5)
      .item('magic_circle', 19.5, 3.5, 0, { gm: true }).item('altar', 20.5, 2, 0, { gm: true }).item('candle', 18.3, 2.3, 0, { gm: true }).item('candle', 25, 2.3, 0, { gm: true })
      .item('bookshelf', 18, 9.1, 180, { size: [4, 0.9], gm: true }).item('safe', 24.6, 8.6, 0, { gm: true });
    return [bm.f, g.f, u.f, mansionOutside()];
  }

  /* ---------- ホテル（1F ロビー階・客室階） ---------- */

  function guestRoom(b, x, number, south) {
    // 幅 7 × 奥行 12 の客室。北側の客室は下（廊下）に入口、南側は上に入口
    const y0 = south ? 15 : 0;
    const flipY = v => (south ? y0 + 12 - v : y0 + v);
    const rect = (rx, ry, rw, rh) => (south ? { x: x + rx, y: y0 + 12 - ry - rh, w: rw, h: rh } : { x: x + rx, y: y0 + ry, w: rw, h: rh });
    const main = rect(0, 0, 7, 12);
    const bath = rect(0, 8, 3, 4);
    b.room(T(`${number}`, `${number}`, `${number}`), 'bedroom', main.x, main.y, main.w, main.h, { ly: south ? 2.2 : -2.2 })
      .room(N.bath, 'wet', bath.x, bath.y, bath.w, bath.h, { hideLabel: true });
    const doorY = south ? y0 : y0 + 12;
    b.dh(x + 4, doorY, 1.5, south ? 1 : -1, 1);                  // 入口
    b.dv(x + 3, south ? flipY(10) : flipY(8.5), 1.5, 1, 0);       // 浴室ドア（室内側へ）
    b.wh(x + 1.5, south ? y0 + 12 : y0, 4, 'window');
    // 北側の客室を基準に書き、南側は上下反転する（0°/180° は向きを反転、90°/270° はそのまま）
    const it = (t, rx, ry, rot, extra) => {
      const a = M.ASSET[t];
      const swap = rot === 90 || rot === 270;
      const h = extra && extra.size ? extra.size[1] : a.h;
      const w = extra && extra.size ? extra.size[0] : a.w;
      const fh = swap ? w : h;
      const r = south && !swap ? (rot + 180) % 360 : rot;
      const yy = south ? y0 + 12 - ry - fh : y0 + ry;
      b.item(t, x + rx, yy, r, extra);
    };
    it('bed_single', 3, 1.2, 90);
    it('nightstand', 6.1, 3.25, 0);
    it('bed_single', 3, 4.2, 90);
    it('desk', 0, 1.2, 270);
    it('armchair', 0.2, 4.3, 0);
    it('wardrobe', 5.8, 8.2, 90);
    it('washbasin', 0, 8.3, 270);     // 洗面台は奥の壁、便器はその隣（浴室ドアの前をあける）
    it('toilet', 1.15, 8, 0);
    it('bathtub', 0, 10.4, 90);
  }

  function hotel() {
    const lobby = makeFloor('1F');
    lobby.room(T('厨房', 'Kitchen', '주방'), 'kitchen', 0, 0, 14, 8)
      .room(T('レストラン', 'Restaurant', '레스토랑'), 'public', 0, 8, 14, 19)
      .room(N.office, 'office', 14, 0, 7, 12)
      .room(N.evHall, 'hall', 21, 0, 9, 12)
      .room(N.stairs, 'hall', 30, 0, 5, 12)
      .room(T('化粧室', 'Restrooms', '화장실'), 'wet', 35, 0, 7, 12)
      .room(T('会議室', 'Meeting room', '회의실'), 'office', 42, 0, 14, 12)
      .room(T('ロビー', 'Lobby', '로비'), 'public', 14, 12, 28, 15)
      .room(T('ラウンジ', 'Lounge', '라운지'), 'public', 42, 12, 14, 15)
      .room(T('車寄せ', 'Porte-cochère', '차량 승하차장'), 'porch', 23, 27, 10, 4)
      .room(T('非常階段', 'Fire escape', '비상계단'), 'porch', 56, 10, 5, 7);
    lobby.dh(26.5, 27, 3, 1, 0, 'auto')        // 正面入口
      .dv(14, 17, 4, 1, 0, 'door2')            // レストラン
      .dh(9, 8, 1.5, 1, 0)                     // 厨房 ↔ レストラン
      .dv(0, 6, 1.5, -1, 0)                    // 厨房の搬入口（システムキッチンをよけて西側へ）
      .dh(18, 12, 1.5, -1, 0)                  // 事務室
      .dh(22, 12, 7, 1, 0, 'open')             // EVホール
      .dh(31, 12, 1.5, -1, 0)                  // 階段
      .dh(37.5, 12, 1.5, -1, 0)                // 化粧室
      .dh(47, 12, 3, -1, 0, 'door2')           // 会議室
      .dv(42, 15, 9, 1, 0, 'open')             // ラウンジ
      .dv(56, 12.5, 1.5, 1, 0)                 // 非常階段（屋外・地上へ）
      .wv(0, 10, 3, 'window2').wv(0, 15, 3, 'window2').wv(0, 20, 3, 'window2')
      .wh(2, 27, 4, 'window2').wh(8, 27, 4, 'window2')
      .wh(16, 27, 5, 'window2').wh(35, 27, 5, 'window2')
      .wh(44, 27, 4, 'window2').wh(50, 27, 4, 'window2').wv(56, 15, 4, 'window2').wv(56, 21, 4, 'window2')
      .wh(45, 0, 3).wh(51, 0, 3).wh(16, 0, 2);
    lobby.item('kitchen', 1, 0).item('stove', 6.5, 0, 0, { size: [3, 1.3] }).item('fridge', 9.6, 0).item('fridge', 0, 1.5, 270)
      .item('elevator', 11, 0, 0, { size: [3, 3] })   // 宴会厨房への配膳用リフト
      .item('island', 3, 3.6, 0, { size: [6, 2] }).item('counter', 10.8, 6.8, 180, { size: [3.2, 1.2] })
      .item('dining_round', 1.5, 10).item('dining_round', 7, 10).item('dining_round', 1.5, 15.5).item('dining_round', 7, 15.5)
      .item('dining_round', 1.5, 21).item('dining_round', 7, 21).item('plant', 12.4, 25.4)
      .item('office_desk', 15, 1).item('office_desk', 15, 4.5).item('filing', 19.8, 0.2).item('copier', 19.5, 3.5, 90)
      .item('locker', 14.2, 9.5, 180, { size: [3, 0.9] })
      .item('elevator', 21.5, 0).item('elevator', 25.5, 0).item('plant', 28.8, 4.4)
      .item('stairs_u', 30, 0.5)
      .item('toilet', 35.5, 0).item('toilet', 37, 0).item('toilet', 38.5, 0).item('washbasin', 40.9, 1.5, 90).item('washbasin', 40.9, 3.4, 90)
      .item('meeting6', 44.5, 4).item('whiteboard', 55.6, 3.5, 90).item('cabinet', 42.2, 0, 0, { size: [2.2, 0.9] })
      .item('reception', 15, 13.3).item('plant', 20.8, 13)
      .item('sofa3', 23, 16.5).item('lowtable', 24.1, 18.6).item('sofa3', 23, 20.2, 180)
      .item('sofa3', 31, 16.5).item('lowtable', 32.1, 18.6).item('sofa3', 31, 20.2, 180)
      .item('plant', 14.5, 25.4).item('plant', 40, 25.4).item('bench', 35, 13.2, 0, { size: [4, 1] })
      .item('sofaL', 49.5, 14.5).item('lowtable', 51.4, 19.3).item('armchair', 46.5, 19)
      .item('piano', 44, 21.8, 90).item('plant', 54.4, 25.2)
      .item('stairs', 57.5, 11.5, 0, { size: [2, 5] });

    const floor = makeFloor('7F');
    [0, 7, 14, 35, 42, 49].forEach((x, i) => guestRoom(floor, x, 701 + i, false));
    [0, 7, 14, 21, 28, 35, 42, 49].forEach((x, i) => guestRoom(floor, x, 707 + i, true));
    floor.room(N.evHall, 'hall', 21, 0, 9, 12)
      .room(N.stairs, 'hall', 30, 0, 5, 12)
      .room(N.corridor, 'hall', 0, 12, 56, 3, { hideLabel: true })
      .room(T('非常階段', 'Fire escape', '비상계단'), 'porch', 56, 10, 5, 7);
    floor.dh(22, 12, 7, 1, 0, 'open').dh(31, 12, 1.5, -1, 0)
      .dv(56, 12.75, 1.5, 1, 0).wv(0, 12.75, 1.5)
      .item('elevator', 21.5, 0).item('elevator', 25.5, 0).item('plant', 28.8, 4.4).item('vending', 21.5, 9.6, 180, { size: [2, 1.4] })
      .item('stairs_u', 30, 0.5)
      .item('stairs', 57.5, 11.5, 0, { size: [2, 5] });
    return [lobby.f, hotelBanquet(), hotelFitness(), floor.f, hotelSky()];
  }

  /* 客室階と同じ位置の EVホール・階段・非常階段（全階で縦にそろえる） */
  function hotelCore(b) {
    b.room(N.evHall, 'hall', 21, 0, 9, 12)
      .room(N.stairs, 'hall', 30, 0, 5, 12)
      .room(T('非常階段', 'Fire escape', '비상계단'), 'porch', 56, 10, 5, 7);
    b.dh(31, 12, 1.5, -1, 0)
      .item('elevator', 21.5, 0).item('elevator', 25.5, 0).item('plant', 28.8, 4.4)
      .item('stairs_u', 30, 0.5)
      .item('stairs', 57.5, 11.5, 0, { size: [2, 5] });
  }

  /* 2F 宴会場：南に大宴会場とホワイエ、奥（北）に宴会厨房とサービス通路。東にチャペル */
  function hotelBanquet() {
    const b = makeFloor('2F');
    b.room(T('宴会厨房', 'Banquet kitchen', '연회 주방'), 'kitchen', 0, 0, 14, 9)
      .room(T('宴会倉庫', 'Banquet storage', '연회 창고'), 'storage', 14, 0, 7, 9)
      .room(T('サービス通路', 'Service corridor', '서비스 통로'), 'hall', 0, 9, 21, 3)
      .room(T('化粧室', 'Restrooms', '화장실'), 'wet', 35, 0, 7, 8)
      .room(T('小宴会場', 'Function room', '소연회장'), 'public', 42, 0, 14, 8)
      .room(N.corridor, 'hall', 35, 8, 21, 4, { hideLabel: true })
      .room(T('大宴会場', 'Grand ballroom', '대연회장'), 'public', 0, 12, 24, 15)
      .room(T('ホワイエ', 'Foyer', '포이어'), 'public', 24, 12, 18, 15)
      .room(T('チャペル', 'Chapel', '채플'), 'special', 42, 12, 14, 15);
    hotelCore(b);
    b.dh(24.5, 12, 5, 1, 0, 'open')             // EVホール → ホワイエ
      .dh(35, 12, 7, 1, 0, 'open')              // 東廊下 → ホワイエ
      .dv(24, 16, 3, 1, 0, 'door2')             // 大宴会場（避難のためホワイエ側へ開く）
      .dv(24, 22, 3, 1, 0, 'door2')
      .dh(3, 12, 1.5, 1, 0)                     // サービス通路 → 大宴会場
      .dh(19, 12, 1.5, 1, 1)
      .dh(9.5, 9, 3, 1, 0, 'door2')             // 宴会厨房
      .dh(15.5, 9, 3, 1, 0, 'sliding2')         // 宴会倉庫
      .dh(37.5, 8, 1.5, -1, 0)                  // 化粧室
      .dh(47.5, 8, 3, 1, 0, 'door2')            // 小宴会場
      .dv(42, 18, 3, 1, 0, 'door2')             // チャペル
      .dv(56, 10.25, 1.5, 1, 0)                 // 非常階段
      .wh(3, 0, 3).wv(0, 3, 3)
      .wh(44.5, 0, 3).wh(50.5, 0, 3)
      .wh(2, 27, 4, 'window2').wh(9, 27, 4, 'window2').wh(16, 27, 4, 'window2')
      .wh(27, 27, 5, 'window2').wh(34, 27, 5, 'window2')
      .wh(44.5, 27, 3).wh(50.5, 27, 3).wv(56, 22.5, 3);
    b.item('kitchen', 0, 0).item('stove', 5.2, 0, 0, { size: [3, 1.3] }).item('fridge', 8.6, 0).item('fridge', 0, 6.6, 270)
      .item('island', 2, 3.4, 0, { size: [6, 2] }).item('counter', 3, 7.8, 180, { size: [4, 1.2] })
      .item('elevator', 11, 0, 0, { size: [3, 3] })
      .item('cabinet', 14.5, 0, 0, { size: [6, 1] }).item('crate', 15, 2).item('crate', 17, 2)
      .item('table', 15, 4.6, 0, { size: [2.6, 1.4] }).item('table', 18, 4.6, 0, { size: [2.6, 1.4] })
      .item('stage', 0, 15.5, 270, { size: [8, 3] })
      .item('table', 1.6, 17, 270, { size: [5, 1.2] }).item('chair', 0.4, 18.5, 270).item('chair', 0.4, 19.8, 270)
      .item('speaker', 0, 13.8, 270).item('speaker', 0, 24, 270)
      .item('banquet_round', 5, 13.9).item('banquet_round', 11.3, 13.9).item('banquet_round', 17.6, 13.9)
      .item('banquet_round', 5, 20.6).item('banquet_round', 11.3, 20.6).item('banquet_round', 17.6, 20.6)
      .item('table', 26.2, 16, 90, { size: [3.6, 1.2] }).item('chair', 27.6, 16.8, 90).item('chair', 27.6, 18.2, 90)
      .item('sofa3', 31, 25.2, 180).item('lowtable', 32.1, 23.6).item('armchair', 29.2, 23.3, 270).item('armchair', 35.6, 23.3, 90)
      .item('plant', 24.4, 25.6).item('plant', 40.6, 25.6)
      .item('toilet', 35.5, 0).item('toilet', 37, 0).item('toilet', 38.5, 0)
      .item('washbasin', 40.9, 2, 90).item('washbasin', 40.9, 4, 90)
      .item('meeting6', 44, 1.6).item('meeting6', 50, 1.6).item('whiteboard', 55.6, 2, 90)
      .item('plant', 54.6, 8.2)
      .item('altar', 54.4, 18, 90).item('candle', 55, 16.8).item('candle', 55, 21.4).item('piano_up', 53, 12);
    [44.5, 46.3, 48.1, 49.9, 51.7].forEach(x => b.item('pew', x, 12.5, 270, { size: [5, 1.2] }).item('pew', x, 21.5, 270, { size: [5, 1.2] }));
    return b.f;
  }

  /* 3F フィットネス：ジム・屋内プール・サウナ・更衣室・スタジオ・トリートメント */
  function hotelFitness() {
    const b = makeFloor('3F');
    b.room(T('ジム', 'Gym', '헬스장'), 'public', 0, 0, 21, 12)
      .room(T('屋内プール', 'Indoor pool', '실내 수영장'), 'wet', 0, 12, 17, 15)
      .room(T('サウナ', 'Sauna', '사우나'), 'living', 0, 22, 5, 5)
      .room(T('女性更衣室', 'Women\'s locker room', '여성 탈의실'), 'wet', 17, 12, 7, 7)
      .room(T('男性更衣室', 'Men\'s locker room', '남성 탈의실'), 'wet', 17, 19, 7, 8)
      .room(T('フィットネス受付', 'Fitness reception', '피트니스 접수'), 'public', 24, 12, 11, 15)
      .room(T('化粧室', 'Restrooms', '화장실'), 'wet', 35, 0, 7, 12)
      .room(T('トリートメント室1', 'Treatment room 1', '트리트먼트룸1'), 'living', 42, 0, 7, 12)
      .room(T('トリートメント室2', 'Treatment room 2', '트리트먼트룸2'), 'living', 49, 0, 7, 12)
      .room(N.corridor, 'hall', 35, 12, 21, 3, { hideLabel: true })
      .room(T('スタジオ', 'Studio', '스튜디오'), 'public', 35, 15, 21, 12);
    hotelCore(b);
    b.dh(24.5, 12, 5, 1, 0, 'open')             // EVホール → 受付
      .dv(21, 8.5, 3, -1, 0, 'door2')           // ジム
      .dv(24, 14, 1.5, -1, 0)                   // 女性更衣室（受付から）
      .dv(24, 22.5, 1.5, -1, 1)                 // 男性更衣室（受付から）
      .dv(17, 16.5, 1.5, 1, 0)                  // 女性更衣室 → プール
      .dv(17, 20.5, 1.5, 1, 1)                  // 男性更衣室 → プール
      .dh(1, 22, 1.5, -1, 0)                    // サウナ
      .dv(35, 12, 3, 1, 0, 'open')              // 受付 → 廊下
      .dh(38, 15, 3, 1, 0, 'door2')             // スタジオ
      .dh(37.5, 12, 1.5, -1, 0)                 // 化粧室
      .dh(44.5, 12, 1.5, -1, 0).dh(51, 12, 1.5, -1, 1)   // トリートメント室
      .dv(56, 12.75, 1.5, 1, 0)                 // 非常階段
      .wh(2, 0, 4, 'window2').wh(8.5, 0, 4, 'window2').wh(15, 0, 4, 'window2').wv(0, 3, 4, 'window2')
      .wv(0, 14, 4, 'window2').wh(7, 27, 4, 'window2').wh(12, 27, 4, 'window2')
      .wh(27, 27, 5, 'window2')
      .wh(38, 27, 4, 'window2').wh(44, 27, 4, 'window2').wh(50, 27, 4, 'window2').wv(56, 20, 4, 'window2')
      .wh(44, 0, 2).wh(51, 0, 2);
    b.item('treadmill', 1, 0).item('treadmill', 3.3, 0).item('treadmill', 5.6, 0).item('treadmill', 7.9, 0)
      .item('exercise_bike', 10.5, 0).item('exercise_bike', 12.2, 0).item('exercise_bike', 13.9, 0)
      .item('weight_bench', 2, 7.5).item('weight_bench', 7, 7.5).item('dumbbell_rack', 12, 11, 180)
      .item('rug', 15.5, 4, 0, { size: [4, 3] }).item('plant', 19.6, 0.2)
      .item('pool', 2.5, 13.5, 0, { size: [12, 8] })
      .item('deck_chair', 6.2, 23).item('deck_chair', 8.4, 23).item('deck_chair', 10.6, 23).item('deck_chair', 12.8, 23)
      .item('plant', 15.6, 25.6)
      .item('bench', 0.2, 25.9, 180, { size: [4.6, 1.1] }).item('bench', 0.2, 24.8, 180, { size: [4.6, 1] })
      .item('locker', 18.5, 12, 0, { size: [4, 1] }).item('bench', 19, 14.6, 0, { size: [3, 0.9] })
      .item('shower', 18.8, 17.2).item('shower', 20.8, 17.2)
      .item('locker', 18.5, 26, 180, { size: [4, 1] }).item('bench', 19, 23.8, 0, { size: [3, 0.9] })
      .item('shower', 19, 19).item('shower', 21, 19)
      .item('reception', 26.4, 16, 270, { size: [4.5, 1.4] }).item('chair', 25, 17.5, 270)
      .item('vending', 33.6, 16, 90)
      .item('sofa3', 28.5, 25.2, 180).item('lowtable', 29.6, 23.6).item('plant', 24.2, 25.6).item('plant', 33.6, 25.6)
      .item('toilet', 35.5, 0).item('toilet', 37, 0).item('toilet', 38.5, 0)
      .item('washbasin', 40.9, 2, 90).item('washbasin', 40.9, 4, 90)
      .item('exam_bed', 44.8, 3).item('washbasin', 42.3, 0).item('chair', 47.5, 1)
      .item('exam_bed', 51.8, 3).item('washbasin', 54.1, 0).item('chair', 50, 1)
      .item('speaker', 35.2, 25.8).item('speaker', 54.6, 25.8).item('cabinet', 43, 26.2, 180, { size: [4, 0.8] });
    [39, 41.4, 43.8, 46.2, 48.6, 51, 53.4].forEach(x => b.item('rug', x, 19, 0, { size: [1.4, 3.6] }));
    return b.f;
  }

  /* 8F 最上階：スイートルームとスカイラウンジ（バー） */
  function hotelSky() {
    const b = makeFloor('8F');
    b.room(T('主寝室', 'Master bedroom', '안방'), 'bedroom', 0, 0, 11, 12)
      .room(N.bath, 'wet', 11, 0, 5, 8)
      .room(T('WIC', 'Walk-in closet', '드레스룸'), 'storage', 11, 8, 5, 4)
      .room(N.toilet, 'wet', 16, 0, 5, 4)
      .room(T('スイート玄関', 'Suite entry', '스위트 현관'), 'hall', 16, 4, 5, 8, { hideLabel: true })
      .room(T('スイート リビング', 'Suite living room', '스위트 거실'), 'living', 0, 12, 21, 15)
      .room(T('化粧室', 'Restrooms', '화장실'), 'wet', 35, 0, 7, 12)
      .room(T('バーパントリー', 'Bar pantry', '바 팬트리'), 'kitchen', 42, 0, 14, 12)
      .room(T('スカイラウンジ', 'Sky lounge', '스카이 라운지'), 'public', 21, 12, 35, 15);
    hotelCore(b);
    b.dh(21.5, 12, 8, 1, 0, 'open')             // EVホール → ラウンジ
      .dv(21, 8, 1.5, -1, 1, 'locked')          // スイートの入口（カードキー）
      .dh(17.5, 4, 1.5, -1, 0)                  // トイレ
      .dh(17, 12, 3, 1, 0, 'door2')             // 玄関 → リビング
      .dh(4, 12, 1.5, -1, 0)                    // 主寝室
      .dv(11, 3, 1.5, 1, 0)                     // 浴室
      .dv(11, 9, 1.5, 1, 1)                     // WIC
      .dh(37.5, 12, 1.5, -1, 0)                 // 化粧室
      .dh(48.5, 12, 1.5, -1, 0)                 // パントリー
      .dv(56, 13, 1.5, 1, 0)                    // 非常階段
      .wh(2, 0, 3).wh(7, 0, 3).wv(0, 3, 3).wh(12.5, 0, 2)
      .wh(2, 27, 4, 'window2').wh(8, 27, 4, 'window2').wh(14, 27, 4, 'window2').wv(0, 14, 4, 'window2').wv(0, 20, 4, 'window2')
      .wh(23, 27, 5, 'window2').wh(30, 27, 5, 'window2').wh(37, 27, 5, 'window2').wh(44, 27, 5, 'window2').wh(51, 27, 4, 'window2')
      .wv(56, 18, 4, 'window2').wv(56, 23, 3, 'window2')
      .wh(45, 0, 2);
    b.item('bed_double', 0, 4, 270).item('nightstand', 0, 3).item('nightstand', 0, 6.9)
      .item('tv', 10.1, 5.5, 90).item('armchair', 7.6, 0.4).item('lamp', 9.6, 0.3)
      .item('bathtub', 11, 0, 90).item('shower', 14.2, 0).item('washbasin', 14.9, 2.5, 90).item('washbasin', 14.9, 4.2, 90)
      .item('toilet', 12, 6.4, 180)
      .item('wardrobe', 11.2, 10.8, 180, { size: [4.6, 1.2] }).item('wardrobe', 12.6, 8)
      .item('toilet', 19.4, 0.5, 90).item('washbasin', 16.3, 0)
      .item('cabinet', 16, 5, 270, { size: [3, 0.8] }).item('plant', 16.2, 10.6)
      .item('piano', 0.5, 13).item('rug', 2, 18.5, 0, { size: [8, 6] })
      .item('sofa3', 1, 19.5, 270).item('lowtable', 3.6, 20.6, 90).item('armchair', 6.4, 19.2, 90).item('armchair', 6.4, 22.4, 90)
      .item('dining6', 12, 16).item('cupboard', 12.5, 26.1, 180).item('plant', 19.6, 25.6)
      .item('toilet', 35.5, 0).item('toilet', 37, 0).item('toilet', 38.5, 0)
      .item('washbasin', 40.9, 2, 90).item('washbasin', 40.9, 4, 90)
      .item('kitchen', 42.5, 0).item('sink', 47.8, 0).item('fridge', 50, 0).item('fridge', 51.6, 0)
      .item('cupboard', 55.1, 2, 90).item('crate', 43, 8).item('barrel', 52, 8.5).item('barrel', 53.4, 8.5)
      .item('cupboard', 42.2, 12, 0, { size: [5, 0.9] }).item('cupboard', 50.8, 12, 0, { size: [5, 0.9] })
      .item('counter', 42.5, 15.2, 180, { size: [12, 1.2] })
      .item('piano', 34, 15.5)
      .item('plant', 21.2, 25.6).item('plant', 54.6, 25.6);
    [43, 44.5, 46, 47.5, 49, 50.5, 52, 53.5].forEach(x => b.item('stool', x, 16.7));
    [23, 27, 31, 35, 39, 43, 47].forEach(x => b.item('booth', x, 23));
    [[23.5, 17], [28, 17]].forEach(([x, y]) => b.item('table_round', x, y).item('chair', x + 0.4, y - 1.1).item('chair', x + 0.4, y + 1.9, 180));
    return b.f;
  }

  /* ---------- 病院（1F 外来・2F 病棟） ---------- */

  function fourBedRoom(b, x, y, south, name) {
    // 12 × 12 の4床室。入口は廊下側の引き戸、ベッドは頭を左右の壁に向ける
    b.room(name, 'medical', x, y, 12, 12, { ly: south ? 1.5 : -1.5 });
    const doorY = south ? y : y + 12;
    b.dh(x + 4.5, doorY, 3, south ? 1 : -1, 0, 'sliding2');
    b.wh(x + 2, south ? y + 12 : y, 8, 'window');
    const top = south ? y + 12 - 1 - 2.2 : y + 1;
    const second = south ? y + 12 - 5 - 2.2 : y + 5;
    b.item('hospital_bed', x, top, 270).item('hospital_bed', x, second, 270)
      .item('hospital_bed', x + 7.8, top, 90).item('hospital_bed', x + 7.8, second, 90)
      .item('curtain', x, south ? second - 0.8 : second - 0.95, 0, { size: [4.2, 0.3] })
      .item('curtain', x + 7.8, south ? second - 0.8 : second - 0.95, 0, { size: [4.2, 0.3] })
      .item('washbasin', x + 9, south ? y : y + 10.9, south ? 0 : 180);
  }

  function privateRoom(b, x, y, name) {
    // 7 × 12 の個室（北側）。入口脇にトイレ
    b.room(name, 'medical', x, y, 7, 12, { ly: -2 })
      .room(N.toilet, 'wet', x, y + 8, 3, 4, { hideLabel: true });
    b.dh(x + 4, y + 12, 2, -1, 1, 'sliding')
      .dv(x + 3, y + 9, 1.5, 1, 0, 'sliding')
      .wh(x + 1.5, y, 4, 'window');
    b.item('hospital_bed', x + 2.4, y + 1, 90).item('armchair', x + 0.2, y + 0.4).item('iv_stand', x + 1.5, y + 3.2)
      .item('toilet', x + 1, y + 10.4, 180).item('washbasin', x + 0, y + 8, 270, { size: [1.4, 1] })
      .item('wardrobe', x + 5.8, y + 8.2, 90, { size: [2.6, 1.2] });
  }

  function hospital() {
    const g = makeFloor('1F');
    [[0, '1'], [6, '2'], [12, '3']].forEach(([x, n]) => {
      g.room(T(`診察室${n}`, `Exam room ${n}`, `진찰실${n}`), 'medical', x, 0, 6, 12);
      g.dh(x + 3.5, 12, 2, -1, 0, 'sliding').wh(x + 1.5, 0, 3);
      g.item('office_desk', x + 0.2, 1.2, 270, { size: [2.4, 1.2] }).item('chair', x + 1.5, 2, 90).item('chair', x + 3, 3.2)
        .item('exam_bed', x + 4.6, 0.3).item('curtain', x + 3.8, 4.6, 0, { size: [2.2, 0.3] }).item('washbasin', x + 0, 9.5, 270, { size: [1.6, 1.1] });
    });
    g.room(T('処置室', 'Treatment room', '처치실'), 'medical', 18, 0, 6, 12)
      .room(N.evHall, 'hall', 24, 0, 8, 12)
      .room(N.stairs, 'hall', 32, 0, 5, 12)
      .room(T('検査室', 'Laboratory', '검사실'), 'medical', 37, 0, 7, 12)
      .room(T('レントゲン室', 'X-ray room', '엑스레이실'), 'danger', 44, 0, 8, 12)
      .room(T('更衣室', 'Locker room', '탈의실'), 'office', 52, 0, 6, 12)
      .room(N.corridor, 'hall', 0, 12, 58, 5)
      .room(T('薬局', 'Pharmacy', '약국'), 'medical', 0, 17, 8, 12)
      .room(T('受付・会計', 'Reception', '접수·수납'), 'office', 8, 17, 8, 12)
      .room(T('待合ホール', 'Waiting hall', '대기실'), 'public', 16, 17, 24, 12)
      .room(N.toilet, 'wet', 40, 17, 6, 12)
      .room(T('売店', 'Shop', '매점'), 'public', 46, 17, 6, 12)
      .room(T('霊安室', 'Morgue', '영안실'), 'special', 52, 17, 6, 12)
      .room(T('風除室', 'Vestibule', '방풍실'), 'porch', 24, 29, 8, 3)
      .room(T('非常階段', 'Fire escape', '비상계단'), 'porch', 58, 11, 5, 7);
    g.dh(19, 12, 3, -1, 0, 'sliding2')
      .dv(58, 13.75, 1.5, 1, 0)                // 非常階段（屋外・地上へ）
      .dh(25, 12, 6, 1, 0, 'open')
      .dh(33, 12, 1.5, -1, 0)
      .dh(39, 12, 2, -1, 0, 'sliding').dh(47, 12, 2, -1, 0, 'locked').dh(53.5, 12, 1.5, -1, 0)
      .dh(1, 17, 6, 1, 0, 'open')
      .dh(9, 17, 6, 1, 0, 'open')
      .dh(16, 17, 24, 1, 0, 'open')
      .dh(42, 17, 1.5, 1, 0).dh(47.5, 17, 3, 1, 0, 'open').dh(53, 17, 1.5, 1, 1, 'locked')
      .dv(58, 25, 3, -1, 0, 'door2')
      .dh(26.5, 29, 3, 1, 0, 'auto')
      .wh(20, 0, 2).wh(39, 0, 3).wh(46, 0, 3).wh(53.5, 0, 3)
      .wh(1.5, 29, 5).wh(17, 29, 6, 'window2').wh(33, 29, 6, 'window2').wh(47.5, 29, 3)
      .wv(0, 20, 5);
    g.item('exam_bed', 18.4, 0.3).item('exam_bed', 21.8, 0.3).item('med_cabinet', 18, 6.5, 90, { size: [3, 1] }).item('iv_stand', 20.6, 4.6)
      .item('elevator', 24.5, 0, 0, { size: [3.4, 4] }).item('elevator', 28.1, 0, 0, { size: [3.4, 4] })
      .item('stairs_u', 32, 0.5)
      .item('lab_bench', 37, 0).item('lab_bench', 39.5, 5, 90, { size: [4, 1.6] }).item('filing', 42.8, 9.5)
      .item('exam_bed', 47.4, 3, 0, { size: [1.4, 3.6] }).item('rack', 44.2, 0.3, 0, { size: [1.4, 2] })
      .item('locker', 52, 0, 0, { size: [6, 1] }).item('bench', 53, 5.5, 0, { size: [4, 1] })
      .item('bench', 0.3, 12.2, 0, { size: [3, 1] }).item('bench', 6, 12.2, 0, { size: [3.3, 1] }).item('bench', 12, 12.2, 0, { size: [3.3, 1] })
      .item('counter', 0.5, 17.2, 0, { size: [7, 1.2] }).item('med_cabinet', 0, 27.9, 180, { size: [4, 1] }).item('med_cabinet', 4, 27.9, 180, { size: [4, 1] }).item('office_desk', 2.8, 22.5)
      .item('reception', 8.5, 17.2, 0, { size: [7, 1.4] }).item('office_desk', 9, 21.6).item('office_desk', 12.5, 21.6).item('filing', 15, 27.8, 180).item('copier', 8.1, 27.6)
      .item('bench', 18, 21, 0, { size: [6, 1] }).item('bench', 18, 24, 0, { size: [6, 1] }).item('bench', 32, 21, 0, { size: [6, 1] }).item('bench', 32, 24, 0, { size: [6, 1] })
      .item('plant', 16.3, 27.6).item('plant', 38.5, 27.6).item('vending', 25, 17.8, 0, { size: [2, 1.4] })
      .item('toilet', 40.5, 26.4, 180).item('toilet', 42, 26.4, 180).item('toilet', 43.5, 26.4, 180).item('washbasin', 44.9, 20, 90).item('washbasin', 44.9, 22, 90)
      .item('cabinet', 46, 27.9, 180, { size: [6, 1] }).item('counter', 50.8, 20, 90, { size: [4, 1.2] })
      .item('morgue', 52, 26.6, 180, { size: [4.4, 2.4] }).item('exam_bed', 54.2, 20.5, 0, { size: [1.4, 3.6] }).item('candle', 52.4, 21.4)
      .item('stairs', 59.5, 12, 0, { size: [2, 5] });
        g.f.rooms.find(r => r.name.ja === '霊安室').note = T('裏口の鍵は警備室にある', 'The back-door key is kept at the security desk', '뒷문 열쇠는 경비실에 있다');

    const w = makeFloor('2F');
    fourBedRoom(w, 0, 0, false, T('201（4床）', '201 (4 beds)', '201(4인실)'));
    fourBedRoom(w, 12, 0, false, T('202（4床）', '202 (4 beds)', '202(4인실)'));
    w.room(N.evHall, 'hall', 24, 0, 8, 12).room(N.stairs, 'hall', 32, 0, 5, 12);
    privateRoom(w, 37, 0, T('203（個室）', '203 (private)', '203(1인실)'));
    privateRoom(w, 44, 0, T('204（個室）', '204 (private)', '204(1인실)'));
    privateRoom(w, 51, 0, T('205（個室）', '205 (private)', '205(1인실)'));
    w.room(N.corridor, 'hall', 0, 12, 58, 5, { hideLabel: true })
      .room(T('談話室', 'Day room', '휴게실'), 'public', 0, 17, 10, 12);
    fourBedRoom(w, 10, 17, true, T('206（4床）', '206 (4 beds)', '206(4인실)'));
    w.room(T('ナースステーション', 'Nurse station', '간호사실'), 'office', 22, 17, 10, 8, { ly: 1.7 })
      .room(N.staff, 'office', 22, 25, 10, 4)
      .room(T('処置室', 'Treatment room', '처치실'), 'medical', 32, 17, 6, 12)
      .room(T('汚物処理室', 'Sluice room', '오물 처리실'), 'garage', 38, 17, 4, 12)
      .room(T('リネン庫', 'Linen', '린넨실'), 'storage', 42, 17, 4, 12)
      .room(N.bath, 'wet', 46, 17, 6, 12)
      .room(T('器材庫', 'Equipment room', '기자재실'), 'storage', 52, 17, 6, 12)
      .room(T('非常階段', 'Fire escape', '비상계단'), 'porch', 58, 11, 5, 7);
    w.dh(25, 12, 6, 1, 0, 'open').dh(33, 12, 1.5, -1, 0)
      .dh(1, 17, 8, 1, 0, 'open')
      .dh(23, 17, 8, 1, 0, 'open')
      .dh(26, 25, 1.5, 1, 0)
      .dh(34, 17, 2, 1, 0, 'sliding').dh(39.25, 17, 1.5, 1, 0).dh(43.25, 17, 1.5, 1, 0).dh(48, 17, 2, 1, 0, 'sliding')
      .dh(54.25, 17, 1.5, 1, 0)
      .dv(58, 13.75, 1.5, 1, 0)                // 非常階段（屋外）
      .wv(0, 20, 6).wh(2, 29, 6).wh(24, 29, 6).wh(34, 29, 2).wh(48, 29, 2).wh(54, 29, 2);
    w.item('elevator', 24.2, 0, 0, { size: [3.6, 5] }).item('elevator', 28.2, 0, 0, { size: [3.6, 5] })
      .item('stairs_u', 32, 0.5)
      .item('bench', 0.2, 13.2, 0, { size: [4, 1] })
      .item('dining4', 1.5, 20.5).item('dining4', 5.5, 20.5).item('tv', 0, 24.5, 270).item('vending', 7.6, 27.6, 180, { size: [2, 1.4] }).item('sofa2', 1, 27.2, 180)
      .item('counter', 23, 17, 0, { size: [4, 1.2] }).item('counter', 27, 17, 0, { size: [4, 1.2] })
      .item('office_desk', 23, 19.3).item('office_desk', 26.5, 19.3).item('med_cabinet', 29, 23.8, 180, { size: [3, 1] }).item('wheelchair', 30.4, 19.6)
      .item('table', 23.2, 26.8, 0, { size: [4, 1.6] }).item('locker', 28.5, 28, 180, { size: [3.4, 1] })
      .item('exam_bed', 32.3, 20.4).item('med_cabinet', 35.5, 27.9, 180, { size: [2.5, 1] }).item('iv_stand', 36.6, 20.6).item('wheelchair', 36.4, 24.4)
      .item('sink', 38, 27.7, 180).item('cabinet', 42, 27.8, 180, { size: [4, 1.2] }).item('cabinet', 44.8, 20, 90, { size: [5, 1.2] })
      .item('bathtub', 47.5, 22, 90, { size: [1.8, 3.2] }).item('shower', 49.8, 27, 0, { size: [2, 2] }).item('bench', 46.2, 26.2, 0, { size: [3, 0.8] })
      .item('wheelchair', 52.4, 20).item('wheelchair', 53.8, 20).item('hospital_bed', 52.3, 24.8, 90).item('cabinet', 56.8, 18, 90, { size: [4, 1] })
      .item('stairs', 59.5, 12, 0, { size: [2, 5] });
    return [g.f, w.f];
  }

  /* ---------- 廃墟化（テンプレートを荒らす） ---------- */

  function decay(floors, seed, options = {}) {
    let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    floors.forEach(f => {
      f.openings.forEach((o, i) => {
        if (o.kind === 'secret' || o.kind === 'open') return;
        const group = M.OPEN[o.kind] ? M.OPEN[o.kind].group : 'door';
        if (group === 'window') o.kind = i % 3 === 0 ? 'brokenwin' : i % 3 === 1 ? 'boarded' : o.kind;
        else if (o.kind === 'door' && rnd() < 0.3) o.kind = 'broken';
        else if (o.kind === 'door' && rnd() < 0.15) o.kind = 'locked';
      });
      // 家具の一部を失わせ、瓦礫などを空いている場所に散らす（家具・部屋名・扉の開く範囲は避ける）
      f.items = f.items.filter((it, i) => !(options.remove && i % options.remove === 0 && !/stairs|elevator/.test(it.t)));
      const blocked = () => {
        const zones = f.items.filter(it => !(M.ASSET[it.t] || {}).under).map(it => ({ x: it.x, y: it.y, w: it.w, h: it.h }));
        f.openings.forEach(o => {
          const L = o.len;
          zones.push(o.o === 'h' ? { x: o.x - 0.2, y: o.y - L, w: L + 0.4, h: L * 2 } : { x: o.x - L, y: o.y - 0.2, w: L * 2, h: L + 0.4 });
        });
        f.rooms.forEach(r => zones.push({ x: r.x + r.w / 2 + (r.lx || 0) - 2.2, y: r.y + r.h / 2 + (r.ly || 0) - 0.8, w: 4.4, h: 1.6 }));
        return zones;
      };
      const place = (t, room) => {
        const a = M.ASSET[t];
        const zones = blocked();
        for (let tries = 0; tries < 24; tries++) {
          const x = Math.round((room.x + 0.3 + rnd() * Math.max(0, room.w - a.w - 0.6)) * 2) / 2;
          const y = Math.round((room.y + 0.3 + rnd() * Math.max(0, room.h - a.h - 0.6)) * 2) / 2;
          const box = { x, y, w: a.w, h: a.h };
          if (!M.rectContains(room, box)) continue;
          if (zones.some(z => M.rectsOverlap(z, box))) continue;
          f.items.push({ t, x, y, w: a.w, h: a.h, rot: 0 });
          return true;
        }
        return false;
      };
      f.rooms.forEach((r, i) => {
        if ((M.CAT[r.cat] || {}).outdoor || r.gm) return;
        const roll = rnd();
        if (r.w >= 5 && r.h >= 5 && roll < 0.5) place('debris', r);
        if (r.w >= 3 && r.h >= 3 && roll > 0.72) place('glass', r);
        if (options.blood && r.w >= 4 && r.h >= 4 && i % options.blood === 1) place('blood', r);
      });
    });
    return floors;
  }

  function abandonedHospital() {
    const floors = decay(hospital(), 1337, { remove: 4, blood: 5 });
    const [g, w] = floors;
    g.name = '1F';
    w.name = '2F';
    // 崩れた壁と立入禁止
    w.openings.push({ kind: 'hole', o: 'v', x: 12, y: 3.4, len: 1.4, side: 1, hinge: 0 });
    g.items.push({ t: 'tape', x: 16.5, y: 16.2, w: 6, h: 0.35, rot: 0 });
    g.items.push({ t: 'danger', x: 45.2, y: 13, w: 1, h: 1, rot: 0 });
    // 地下：霊安室と封鎖された研究区画
    const b = makeFloor('B1');
    b.room(N.evHall, 'hall', 24, 0, 8, 12)
      .room(N.stairs, 'hall', 32, 0, 5, 12)
      .room(N.corridor, 'hall', 0, 12, 44, 5, { hideLabel: true })
      .room(T('解剖室', 'Autopsy room', '해부실'), 'medical', 12, 0, 12, 12)
      .room(T('ボイラー室', 'Boiler room', '보일러실'), 'garage', 0, 0, 12, 12)
      .room(T('カルテ庫', 'Records room', '진료기록 보관실'), 'storage', 37, 0, 7, 12)
      .room(T('霊安室', 'Morgue', '영안실'), 'special', 0, 17, 14, 10)
      .room(T('隔離病室', 'Isolation ward', '격리 병실'), 'danger', 14, 17, 12, 10)
      .room(T('封鎖区画', 'Sealed lab', '봉쇄 구역'), 'special', 26, 17, 18, 10, { gm: true, plName: '', note: T('院長の実験記録と培養槽。〈クトゥルフ神話〉', 'The director\'s experiments and specimen tanks. Cthulhu Mythos', '원장의 실험 기록과 배양조. 〈크툴루 신화〉') });
    b.dh(25, 12, 6, 1, 0, 'open').dh(33, 12, 1.5, -1, 0, 'broken')
      .dh(17, 12, 3, -1, 0, 'door2').dh(4, 12, 1.5, -1, 0).dh(39.5, 12, 1.5, -1, 0, 'locked')
      .dh(5, 17, 3, 1, 0, 'door2').dh(19, 17, 1.5, 1, 0, 'locked')
      .dv(26, 20, 1.5, 1, 0, 'secret');
    b.item('elevator', 24.5, 0, 0, { size: [3.4, 4] }).item('elevator', 28.1, 0, 0, { size: [3.4, 4] }).item('stairs_u', 32, 0.5)
      .item('tank', 1, 1).item('tank', 4, 1).item('rack', 9, 0.4, 0, { size: [2, 1.4] }).item('debris', 5, 7)
      .item('op_table', 16.5, 3).item('med_cabinet', 12, 0, 0, { size: [3.5, 1] }).item('sink', 20.5, 0).item('blood', 18, 6.5)
      .item('filing', 37.3, 0.2).item('filing', 38.5, 0.2).item('filing', 39.7, 0.2).item('filing', 40.9, 0.2).item('bookshelf', 43.2, 2, 90, { size: [8, 0.8] }).item('glass', 39, 6)
      .item('morgue', 0, 24.6, 180, { size: [6, 2.4] }).item('morgue', 6.4, 24.6, 180, { size: [6, 2.4] }).item('exam_bed', 5, 18.8, 90).item('body', 9.5, 19.6, 90).item('candle', 1, 18)
      .item('hospital_bed', 15, 23, 270).item('hospital_bed', 21, 23, 90).item('cage', 15.2, 17.5).item('footprints', 21, 19.5, 90)
      .item('tank', 28, 18.5, 0, { gm: true }).item('tank', 31.5, 18.5, 0, { gm: true }).item('tank', 35, 18.5, 0, { gm: true })
      .item('lab_bench', 38.5, 24.4, 0, { gm: true }).item('magic_circle', 28.5, 21.8, 0, { gm: true, size: [4.6, 4.6] }).item('safe', 42.4, 18.2, 0, { gm: true })
      .item('danger', 24.8, 14);
    b.f.openings.push({ kind: 'hole', o: 'v', x: 44, y: 13, len: 3, side: 1, hinge: 0 });
    return [b.f, g, w];
  }

  /* ---------- 廃屋（一戸建てを荒らしたもの） ---------- */

  function abandonedHouse() {
    const floors = decay(house(), 99, { remove: 3, blood: 4 });
    floors[0].openings.push({ kind: 'hole', o: 'v', x: 17, y: 14.5, len: 2, side: 1, hinge: 0 });
    floors[1].openings.push({ kind: 'hole', o: 'h', x: 5, y: 9, len: 2.5, side: 1, hinge: 0 });
    floors[1].items.push({ t: 'footprints', x: 12.5, y: 6.2, w: 3, h: 1, rot: 90 });
    floors[0].items.push({ t: 'clue', x: 1.2, y: 12.2, w: 1, h: 1, rot: 0, gm: true });
    return floors;
  }

  /* ---------- 廃ビル（雑居ビル 1F・2F） ---------- */

  function abandonedBuilding() {
    const g = makeFloor('1F');
    g.room(T('元テナント（店舗跡）', 'Vacant shop', '빈 점포'), 'public', 0, 0, 16, 16)
      .room(T('エントランス', 'Entrance', '입구'), 'hall', 16, 6, 8, 10)
      .room(N.stairs, 'hall', 16, 0, 5, 6)
      .room(T('EV', 'EV', 'EV'), 'garage', 21, 0, 3, 6, { hideLabel: true })
      .room(T('管理人室', 'Janitor room', '관리인실'), 'office', 24, 0, 8, 8)
      .room(T('機械室', 'Machine room', '기계실'), 'garage', 24, 8, 8, 8)
      .room(T('駐輪場', 'Bicycle parking', '자전거 주차장'), 'porch', 16, 16, 16, 4);
    g.dh(18, 16, 4, -1, 0, 'shutter')
      .dh(1, 16, 14, -1, 0, 'shutter')
      .dh(17.5, 6, 2, 1, 0, 'open')
      .dh(21.25, 6, 2.5, 1, 0, 'sliding2')
      .dv(24, 10, 1.5, 1, 0, 'locked')
      .dv(24, 6.25, 1.5, 1, 0, 'broken')        // 管理人室（エントランスから）
      .dv(16, 12, 1.5, -1, 0, 'broken')
      .wv(0, 3, 4, 'boarded').wv(0, 9, 4, 'brokenwin').wh(26, 0, 3, 'barred').wv(32, 3, 2, 'boarded');
    g.item('counter', 1, 1, 0, { size: [8, 1.2] }).item('debris', 5, 6).item('debris', 10, 10).item('crate', 12.5, 2).item('crate', 13.2, 3.8)
      .item('glass', 2, 13).item('cabinet', 0, 5, 270, { size: [3, 1] }).item('danger', 7.5, 13.5)
      .item('stairs_u', 16, 0.5, 0, { size: [5, 5.5] })
      .item('elevator', 21, 0, 0, { size: [3, 3] }).item('tape', 21, 6.4, 0, { size: [3, 0.35] })
      .item('vending', 22, 13.5, 180, { size: [2, 1.4] }).item('footprints', 19, 8, 0)
      .item('office_desk', 24.5, 0.3).item('chair', 25.6, 1.8, 180).item('locker', 29, 0, 0, { size: [3, 0.9] }).item('filing', 31, 6.5)
      .item('tank', 26, 10).item('rack', 30, 12.5, 0, { size: [1.6, 2.4] }).item('barrel', 28.8, 14.4);

    const u = makeFloor('2F');
    u.room(T('事務所跡', 'Abandoned office', '사무실 터'), 'office', 0, 0, 16, 12)
      .room(T('会議室', 'Meeting room', '회의실'), 'office', 0, 12, 9, 8)
      .room(T('社長室', 'President\'s office', '사장실'), 'office', 9, 12, 7, 8)
      .room(N.stairs, 'hall', 16, 0, 5, 6)
      .room(T('EV', 'EV', 'EV'), 'garage', 21, 0, 3, 6, { hideLabel: true })
      .room(N.corridor, 'hall', 16, 6, 8, 14, { hideLabel: true })
      .room(T('給湯室', 'Kitchenette', '탕비실'), 'kitchen', 24, 0, 8, 6)
      .room(N.corridor, 'hall', 24, 6, 2, 6, { hideLabel: true })
      .room(N.toilet, 'wet', 26, 6, 6, 6)
      .room(N.storeroom, 'storage', 24, 12, 8, 8);
    u.dh(17.5, 6, 2, 1, 0, 'open')
      .dh(21.25, 6, 2.5, 1, 0, 'sliding2')
      .dv(16, 8, 1.5, -1, 0, 'broken')
      .dv(16, 15, 1.5, -1, 1, 'locked')
      .dv(9, 15.5, 1.5, -1, 0)
      .dh(3, 12, 1.5, 1, 0, 'broken')
      .dv(24, 6, 6, 1, 0, 'open').dh(24.25, 6, 1.5, -1, 0).dv(26, 8, 1.5, 1, 0).dv(24, 15, 1.5, 1, 0)   // 給湯室・トイレは奥の通路から
      .wh(2, 0, 4, 'brokenwin').wh(9, 0, 4, 'boarded').wv(0, 3, 4, 'brokenwin').wv(0, 14, 4, 'boarded')
      .wh(10.5, 20, 3, 'window').wh(2, 20, 4, 'brokenwin').wh(27, 0, 3, 'barred');
    u.item('office_desk', 1, 3).item('office_desk', 1, 6.5).item('office_desk', 5, 3, 0).item('office_desk', 9.5, 5.5, 90)
      .item('debris', 5.5, 7).item('chair', 4, 9.5, 90).item('filing', 14.8, 0.2).item('filing', 13.6, 0.2).item('copier', 12, 9)
      .item('glass', 2.2, 1)
      .item('meeting6', 2, 14.2).item('whiteboard', 0, 14, 90)
      .item('office_desk', 11, 13.5).item('chair', 11.7, 15, 180).item('safe', 14.7, 12.2).item('bookshelf', 9.2, 19.2, 180, { size: [3, 0.8] })
      .item('sofa2', 12.5, 18.2, 180).item('blood', 13.4, 15.5).item('evidence', 12.6, 17, 0, { label: '1', gm: true })
      .item('stairs_u', 16, 0.5, 0, { size: [5, 5.5] })
      .item('elevator', 21, 0, 0, { size: [3, 3] })
      .item('sink', 24.2, 0).item('stove', 26.3, 0).item('fridge', 30.5, 0).item('table', 26, 3.5, 0, { size: [2.4, 1.4] })
      .item('toilet', 27, 6.2).item('toilet', 29, 6.2).item('washbasin', 30.8, 9.5, 90, { size: [1.6, 1.1] })
      .item('crate', 25, 13).item('crate', 26.8, 13).item('crate', 26.8, 14.8).item('barrel', 29.5, 13.2).item('cage', 28.5, 16.5, 0, { gm: true })
      .item('footprints', 19.5, 10, 0).item('danger', 17, 17.5);
    u.f.openings.push({ kind: 'hole', o: 'h', x: 5, y: 12, len: 3, side: 1, hinge: 0 });
    u.f.rooms[2].note = T('金庫の暗証番号は社長の娘の誕生日', 'The safe code is the president\'s daughter\'s birthday', '금고 비밀번호는 사장 딸의 생일');

    // 屋上：塔屋の扉は施錠（鍵は1Fの機械室）。錆びたフェンスは南側が外れ、床に儀式の跡（GM）
    const r = makeFloor(T('屋上', 'Rooftop', '옥상'));
    r.room(T('屋上', 'Rooftop', '옥상'), 'rooftop', 0, 0, 32, 20, { lx: -2, ly: 1, note: T('社長が夜ごと儀式をしていた場所。フェンスの破れ目の真下で社員が転落死している', 'Where the president held his nightly rites. An employee fell to his death right below the gap in the fence', '사장이 밤마다 의식을 치르던 곳. 펜스가 뚫린 곳 바로 아래에서 직원이 추락사했다') })
      .room(T('塔屋', 'Penthouse', '옥탑'), 'hall', 16, 0, 5, 8, { ly: 3 })
      .room(T('EV機械室', 'Elevator room', 'EV 기계실'), 'garage', 21, 0, 5, 6, { ly: 1.6 });
    r.dh(17.5, 8, 2, 1, 0, 'locked')            // 屋上の扉
      .dh(22.5, 6, 1.5, 1, 0, 'broken')          // EV機械室
      .wv(16, 2, 2, 'brokenwin');
    r.wall(1, 1, 16, 1, 'fence').wall(26, 1, 31, 1, 'fence').wall(31, 1, 31, 19, 'fence')
      .wall(12, 19, 31, 19, 'fence').wall(1, 19, 8, 19, 'fence').wall(1, 1, 1, 19, 'fence');
    r.item('stairs_u', 16, 0.5, 0, { size: [5, 5.5] }).item('hatch', 21.5, 0.5).item('control_panel', 23.6, 0.2).item('dist_board', 25.4, 2.6, 90)
      .item('water_tower', 26.6, 1.4).item('ladder', 27.4, 5.6)
      .item('ac_unit', 2, 1.4).item('ac_unit', 4.4, 1.4).item('ac_unit', 6.8, 1.4).item('antenna', 10, 1.6).item('glass', 14, 2.2)
      .item('fence_item', 8.4, 16.6, 0, { size: [3.4, 0.3] }).item('tape', 8, 18.6, 0, { size: [4, 0.3] }).item('danger', 13, 17)
      .item('debris', 20, 13.4).item('puddle', 24, 10).item('puddle', 3.4, 15.4).item('bird', 28, 12).item('bird', 29.4, 12.8)
      .item('magic_circle', 3, 7, 0, { gm: true }).item('candle', 2, 6, 0, { gm: true }).item('candle', 8.2, 6, 0, { gm: true })
      .item('candle', 2, 12.2, 0, { gm: true }).item('candle', 8.2, 12.2, 0, { gm: true }).item('offering', 4.8, 12.6, 0, { gm: true })
      .item('footprints', 9.4, 13.4, 0, { gm: true });
    return [g.f, u.f, r.f];
  }

  /* ---------- アパート（2階建て・1K × 8戸） ---------- */

  // 幅 7 × 奥行 16 の 1K（約25㎡）。上が共用廊下、下がバルコニー。end = 妻側の住戸（横にも窓）
  function oneK(p, number, end) {
    p.room(N.entrance, 'hall', 0, 0, 3, 2, { hideLabel: true })
      .room(T('ユニットバス', 'Unit bath', '유닛 욕실'), 'wet', 3, 0, 4, 4, { hideLabel: true })
      .room(N.kitchen, 'kitchen', 0, 2, 3, 5)
      .room(N.storage, 'storage', 3, 4, 4, 3)
      .room(T(`${number}号室`, `Unit ${number}`, `${number}호`), 'bedroom', 0, 7, 7, 7)
      .room(N.balcony, 'balcony', 0, 14, 7, 2, { hideLabel: true });
    p.dh(0.75, 0, 1.5, -1, 0)                 // 玄関ドア（外開き）
      .dh(0, 2, 3, 1, 0, 'open')               // 玄関 → キッチン
      .dv(3, 2.25, 1.5, 1, 0, 'folding')       // ユニットバス
      .dh(1.5, 7, 1.5, 1, 0)                   // 居室（冷蔵庫の前をよける）
      .dh(3.5, 7, 2, 1, 0, 'folding')          // 収納
      .wh(1, 14, 3.5, 'window2')               // バルコニーへの掃き出し窓
      .wh(4.5, 0, 2);                          // 浴室の小窓
    if (end) p.wv(0, 10.5, 2);
    p.item('kitchen', 0, 2.6, 270, { size: [3, 1.2] }).item('fridge', 0, 5.55, 270)
      .item('unitbath', 3.5, 0.4)
      .item('bed_single', 5, 10, 180).item('tv', 0, 9.2, 270).item('rug', 1.3, 9.4, 0, { size: [3.4, 3] }).item('lowtable', 2.1, 10.3, 90)
      .item('washer', 5.4, 14.4);
  }

  function apartment() {
    const floors = [1, 2].map(level => {
      const b = makeFloor(`${level}F`);
      [0, 7, 14, 21].forEach((x, i) => oneK(placer(b, x, 13, 7, 16, i % 2 === 1), level * 100 + i + 1, i === 0 || i === 3));
      [7, 14, 21].forEach(x => b.wall(x, 27, x, 29, 'thin'));   // バルコニーの隔て板
      const outdoor = level === 1 ? 'porch' : 'balcony';
      b.room(T('共用廊下', 'Walkway', '공용 복도'), outdoor, 0, 10, 32, 3)
        .room(N.stairs, outdoor, 28, 13, 4, 10, { hideLabel: true })
        .dh(28.5, 13, 3, 1, 0, 'open')         // 共用廊下 ↔ 階段
        .item('stairs', 28.6, 14, 0, { size: [2.4, 8] });
      if (level === 1) {
        b.room(T('駐車場', 'Parking', '주차장'), 'porch', 0, 0, 32, 10)
          .room(T('ゴミ置場', 'Garbage area', '쓰레기장'), 'porch', 32, 6, 5, 4)
          .item('car', 1.5, 0.5).item('car', 8, 0.5).item('car', 20.5, 0.5)
          .item('cabinet', 31.3, 18, 90, { size: [2.4, 0.7] })
          .item('crate', 32.4, 6.6).item('crate', 34.6, 6.6)
          .wall(32, 6, 37, 6, 'fence').wall(37, 6, 37, 10, 'fence');
      }
      return b.f;
    });
    return floors;
  }

  /* ---------- タワーマンション（1F 共用部・基準階） ---------- */
  // 72 × 72 マス（36m 角）。外周 3 マスがバルコニー、奥行 18 の住戸、幅 4 の内廊下、中央 22 × 22 がコア。
  // 北側の「腕」（幅 51 × 奥行 21）を 90° ずつ回して風車形に 4 つ並べる

  function towerArms(b, fn) {
    fn(placer(b, 0, 0, 51, 21), 0);                     // 北
    fn(placer(b, 51, 0, 51, 21, true, false, true), 1);   // 東（90°）
    fn(placer(b, 21, 51, 51, 21, true, true), 2);         // 南（180°）
    fn(placer(b, 0, 21, 51, 21, false, true, true), 3);   // 西（270°）
  }

  // 内廊下の一辺と、次の辺とのつなぎ目
  function towerCorridor(p) {
    p.room(N.corridor, 'hall', 21, 21, 26, 4, { hideLabel: true })
      .dv(47, 21, 4, 1, 0, 'open');
  }

  // 角住戸（11m × 9m・2LDK＋WIC）。北と西にバルコニー、南の内廊下に玄関
  function towerCornerUnit(p, no) {
    p.room(T(`${no}号室`, `Unit ${no}`, `${no}호`), 'living', 3, 3, 13, 11)
      .room(T('主寝室', 'Master bedroom', '안방'), 'bedroom', 16, 3, 9, 8)
      .room(T('WIC', 'Walk-in closet', '드레스룸'), 'storage', 16, 11, 5, 3)
      .room(N.hall, 'hall', 21, 11, 2, 3, { hideLabel: true })
      .room(N.storage, 'storage', 23, 11, 2, 3, { hideLabel: true })
      .room(N.western2, 'bedroom', 3, 14, 7, 7)
      .room(N.hall, 'hall', 10, 14, 15, 2, { hideLabel: true })
      .room(N.wash, 'wet', 10, 16, 4, 5, { hideLabel: true })
      .room(N.bath, 'wet', 14, 16, 4, 5, { hideLabel: true })
      .room(N.toilet, 'wet', 18, 16, 3, 5, { hideLabel: true })
      .room(N.entrance, 'hall', 21, 16, 4, 5, { hideLabel: true });
    p.dh(22.25, 21, 1.5, 1, 0)                 // 玄関ドア
      .dh(21, 16, 4, 1, 0, 'open')             // 玄関ホール
      .dh(21, 14, 2, 1, 0, 'open')
      .dh(21.25, 11, 1.5, -1, 0)               // 主寝室
      .dv(23, 11.5, 2, 1, 0, 'folding')        // 収納
      .dh(18, 11, 1.5, 1, 0, 'sliding')        // WIC
      .dh(12.5, 14, 1.5, -1, 0)                // LDK
      .dv(10, 14.25, 1.5, -1, 0)               // 洋室
      .dh(11, 16, 1.5, 1, 0, 'sliding')        // 洗面
      .dv(14, 18, 1.5, 1, 0, 'folding')        // 浴室
      .dh(18.75, 16, 1.5, 1, 0)                // トイレ
      .wh(4.5, 3, 3.5, 'window2').wh(9.5, 3, 3.5, 'window2').wv(3, 4.5, 3.5, 'window2')
      .wh(18.5, 3, 3.5, 'window2').wv(3, 16, 3);
    p.item('kitchen', 14.7, 5, 90, { size: [5, 1.3] }).item('island', 11.2, 5.4, 90, { size: [4, 1.8] }).item('fridge', 14.6, 10.3, 90)
      .item('dining4', 6, 3.6).item('sofa3', 7.4, 8, 90).item('lowtable', 5.4, 9.1, 90).item('tv', 3, 8.6, 270).item('plant', 3.3, 12.5)
      .item('bed_double', 21, 5, 90).item('nightstand', 24.1, 4).item('nightstand', 24.1, 7.9).item('dresser', 16, 4.5, 270)
      .item('wardrobe', 16.2, 12.9, 180, { size: [4.6, 1] })
      .item('bed_single', 3, 18.8, 270).item('desk_set', 3.2, 14.2).item('wardrobe', 8.8, 17.2, 90)
      .item('washbasin', 10, 17.8, 270).item('washer', 10.1, 19.5)
      .item('bathtub', 16.2, 17.6).item('toilet', 19, 19.3, 180)
      .item('cabinet', 24.2, 17.8, 90, { size: [2.8, 0.8] });
  }

  // 中住戸（13m × 9m・2LDK＋WIC）。北にバルコニー
  function towerMiddleUnit(p, no) {
    p.room(N.western1, 'bedroom', 25, 3, 7, 9)
      .room(T(`${no}号室`, `Unit ${no}`, `${no}호`), 'living', 32, 3, 12, 9)
      .room(T('主寝室', 'Master bedroom', '안방'), 'bedroom', 44, 3, 7, 12)
      .room(N.hall, 'hall', 28, 12, 8, 2, { hideLabel: true })
      .room(N.toilet, 'wet', 25, 12, 3, 5, { hideLabel: true })
      .room(N.wash, 'wet', 28, 14, 4, 3, { hideLabel: true })
      .room(N.bath, 'wet', 25, 17, 7, 4, { hideLabel: true })
      .room(N.entrance, 'hall', 32, 14, 4, 7, { hideLabel: true })
      .room(N.kitchen, 'kitchen', 36, 12, 8, 5)
      .room(N.shoes, 'storage', 36, 17, 4, 4, { hideLabel: true })
      .room(T('パントリー', 'Pantry', '팬트리'), 'storage', 40, 17, 4, 4, { hideLabel: true })
      .room(T('WIC', 'Walk-in closet', '드레스룸'), 'storage', 44, 15, 7, 6);
    p.dh(33.25, 21, 1.5, 1, 0)                 // 玄関ドア
      .dh(32, 14, 4, 1, 0, 'open')             // 玄関ホール
      .dh(36, 12, 8, 1, 0, 'open')             // LDK ↔ キッチン
      .dh(29, 12, 1.5, -1, 0)                  // 洋室1
      .dh(33.5, 12, 1.5, -1, 1)                // LDK
      .dv(44, 10.5, 1.5, 1, 1)                 // 主寝室（リビングから）
      .dh(47, 15, 2, 1, 0, 'sliding')          // WIC
      .dv(28, 12.25, 1.5, -1, 0)               // トイレ
      .dh(30.25, 14, 1.5, 1, 1)                // 洗面
      .dh(28.5, 17, 1.5, 1, 0, 'folding')      // 浴室
      .dv(36, 18, 1.5, 1, 0)                   // シューズクローク
      .dh(42.5, 17, 1.5, 1, 1)                 // パントリー
      .wh(27, 3, 3).wh(34, 3, 3.5, 'window2').wh(39, 3, 3.5, 'window2').wh(46, 3, 3);
    p.item('bed_double', 25, 4.2, 270).item('nightstand', 25, 3.1).item('wardrobe', 30.8, 4, 90).item('desk', 25.2, 10.6)
      .item('tv', 32, 4.5, 270).item('lowtable', 33.8, 4.9, 90).item('sofa3', 35.8, 3.8, 90).item('dining6', 38.8, 7.6)
      .item('island', 37.5, 12.1, 0, { size: [5, 1.8] }).item('kitchen', 36.2, 15.7, 180, { size: [4.8, 1.3] }).item('fridge', 41.1, 15.6)
      .item('bed_double', 47, 7, 90).item('nightstand', 50.1, 6).item('nightstand', 50.1, 9.9).item('dresser', 44.8, 3.1)
      .item('wardrobe', 44.5, 19.9, 180, { size: [6, 1] })
      .item('toilet', 26, 15.3, 180)
      .item('washbasin', 28, 14.2, 270, { size: [1.4, 1.1] }).item('washer', 30.6, 15.6)
      .item('bathtub', 25.2, 19.2, 90).item('shower', 30.1, 19.1)
      .item('cabinet', 39.2, 17.3, 90, { size: [3, 0.8] })
      .item('cupboard', 40, 17.4, 270);
  }

  // 住戸の北と西（角）のバルコニーと、隣戸との隔て板
  function towerBalcony(p) {
    p.room(N.balcony, 'balcony', 0, 0, 51, 3, { hideLabel: true })
      .room(N.balcony, 'balcony', 0, 3, 3, 18, { hideLabel: true })
      .wall(25, 0, 25, 3, 'thin').wall(51, 0, 51, 3, 'thin');
  }

  // コア：階段2か所（二方向避難）、EV 3基、ゴミ置場、設備シャフト、中央の部屋は階ごとに変える
  function towerCore(b, centerRoom) {
    b.room(T('階段A', 'Stairs A', '계단A'), 'hall', 25, 25, 6, 11)
      .room(N.evHall, 'hall', 31, 25, 12, 11)
      .room(T('ゴミ置場', 'Garbage room', '쓰레기실'), 'storage', 43, 25, 4, 5)
      .room(T('EPS・PS', 'Utility shaft', '설비 샤프트'), 'garage', 43, 30, 4, 6, { hideLabel: true })
      .room(centerRoom[0], centerRoom[1], 25, 36, 16, 11)
      .room(T('階段B', 'Stairs B', '계단B'), 'hall', 41, 36, 6, 11);
    b.dv(25, 34.2, 1.5, 1, 0)                  // 階段A
      .dh(33, 25, 8, 1, 0, 'open')             // EVホール
      .dv(47, 26, 1.5, -1, 0)                  // ゴミ置場
      .dv(47, 31.5, 1.5, -1, 0)                // EPS
      .dv(47, 37, 1.5, -1, 0)                  // 階段B
      .item('stairs_u', 25.5, 25.3, 0, { size: [5, 8] })
      .item('stairs_u', 41.5, 38.8, 0, { size: [5, 8] })
      .item('elevator', 31, 32, 180).item('elevator', 35, 32, 180).item('elevator', 39, 32, 180)
      .item('plant', 41.6, 25.2)
      .item('crate', 43.3, 28.2).item('rack', 43.3, 33.6, 0, { size: [1.4, 2] });
  }

  function towerTypical() {
    const b = makeFloor('20F');
    towerArms(b, (p, i) => {
      const n = 2001 + i * 2;
      towerBalcony(p);
      towerCornerUnit(p, n);
      towerMiddleUnit(p, n + 1);
      towerCorridor(p);
    });
    towerCore(b, [T('トランクルーム', 'Storage units', '트렁크룸'), 'storage']);
    b.dh(32, 47, 1.5, -1, 0);
    [26, 30.5, 35].forEach(x => b.item('locker', x, 36.2, 0, { size: [4, 1] }).item('locker', x, 40.3, 180, { size: [4, 1] }).item('locker', x, 41.3, 0, { size: [4, 1] }));
    b.item('locker', 26, 45.8, 180, { size: [4, 1] }).item('locker', 36, 45.8, 180, { size: [4, 1] });
    return b.f;
  }

  function towerLobby() {
    const b = makeFloor('1F');
    towerArms(b, p => towerCorridor(p));
    towerCore(b, [T('防災センター', 'Security center', '방재 센터'), 'office']);
    b.dh(32, 47, 1.5, -1, 0)
      .item('office_desk', 27, 38.5).item('office_desk', 27, 42).item('rack', 38.5, 36.4).item('rack', 38.5, 38.8)
      .item('cabinet', 30.5, 36.2, 0, { size: [6, 1] }).item('chair', 28, 40.1, 180).item('chair', 28, 43.6, 180);
    // 北：パーティールーム・キッズルーム・ゲストルーム
    b.room(T('パーティールーム', 'Party room', '파티룸'), 'public', 3, 3, 22, 18)
      .room(T('キッズルーム', 'Kids\' room', '키즈룸'), 'public', 25, 3, 12, 18)
      .room(T('ゲストルーム', 'Guest suite', '게스트룸'), 'bedroom', 37, 3, 14, 18)
      .room(N.bath, 'wet', 45, 14, 6, 7, { hideLabel: true });
    b.dh(21.5, 21, 3, -1, 0, 'door2')
      .dh(28.5, 21, 3, -1, 0, 'door2')
      .dh(38.5, 21, 1.5, -1, 0, 'locked')
      .dv(45, 15, 1.5, -1, 0)
      .wh(5, 3, 3.5, 'window2').wh(11, 3, 3.5, 'window2').wh(17, 3, 3.5, 'window2').wv(3, 6, 3.5, 'window2').wv(3, 12, 3.5, 'window2')
      .wh(27, 3, 3.5, 'window2').wh(31.5, 3, 3.5, 'window2').wh(39, 3, 3).wh(45, 3, 3);
    b.item('kitchen', 3.5, 3, 0, { size: [6, 1.3] }).item('island', 4.5, 6.2, 0, { size: [5, 1.8] }).item('fridge', 10, 3)
      .item('dining6', 13, 5).item('dining6', 13, 11).item('sofaL', 3.4, 14.4).item('lowtable', 9, 15.6).item('tv', 3, 11.2, 270)
      .item('cupboard', 20.8, 3, 90).item('plant', 3.3, 19.3)
      .item('rug', 26, 5, 0, { size: [10, 8] }).item('table', 28, 14.5, 0, { size: [4, 2] }).item('chair', 28.4, 13.4).item('chair', 30.4, 13.4)
      .item('chair', 28.4, 16.6, 180).item('chair', 30.4, 16.6, 180).item('bookshelf', 36.1, 5, 90).item('bookshelf', 36.1, 9, 90)
      .item('bed_single', 46.8, 4, 90).item('bed_single', 46.8, 7.4, 90).item('nightstand', 50.1, 6.3)
      .item('desk', 37.2, 3.2).item('chair', 37.9, 4.5, 180).item('sofa2', 38.4, 11.5, 90).item('lowtable', 41.6, 11.8, 90)
      .item('wardrobe', 41.4, 19.7, 180)
      .item('unitbath', 47, 17.2, 180, { size: [3.6, 3.6] });
    // 東：フィットネス・ラウンジ
    b.room(T('フィットネスジム', 'Fitness gym', '피트니스'), 'public', 51, 3, 18, 22)
      .room(T('ラウンジ', 'Lounge', '라운지'), 'public', 51, 25, 18, 26);
    b.dv(51, 21.5, 3, 1, 0, 'door2')
      .dv(51, 28, 18, 1, 0, 'open')
      .wh(54, 3, 3.5, 'window2').wh(61, 3, 3.5, 'window2').wv(69, 6, 3.5, 'window2').wv(69, 13, 3.5, 'window2')
      .wv(69, 28, 4, 'window2').wv(69, 35, 4, 'window2').wv(69, 42, 4, 'window2');
    b.item('treadmill', 53, 3.2).item('treadmill', 55.3, 3.2).item('treadmill', 57.6, 3.2).item('exercise_bike', 60.5, 3.2).item('exercise_bike', 62.2, 3.2)
      .item('weight_bench', 56, 11).item('weight_bench', 61, 11).item('dumbbell_rack', 68, 11, 90)
      .item('rug', 55, 17, 0, { size: [9, 5] }).item('bench', 64.6, 23.6, 180, { size: [4, 1] })
      .item('sofa3', 54, 30).item('lowtable', 55.1, 32.2).item('sofa3', 54, 34, 180).item('armchair', 51.8, 31.9)
      .item('sofaL', 62, 31).item('lowtable', 63.5, 35.4)
      .item('dining_round', 54, 40).item('dining_round', 60, 40).item('dining_round', 64.4, 45)
      .item('bookshelf', 56, 50.1, 180).item('plant', 51.5, 49.3).item('plant', 67.3, 25.4).item('piano', 58, 45.5);
    // 南：エントランスホール・風除室・メールコーナー・管理事務室
    b.room(T('エントランスホール', 'Entrance hall', '엔트런스 홀'), 'public', 21, 51, 26, 18)
      .room(T('風除室', 'Vestibule', '방풍실'), 'hall', 30, 65, 8, 4)
      .room(T('メールコーナー', 'Mail corner', '우편함 코너'), 'public', 47, 51, 10, 18)
      .room(T('管理事務室', 'Management office', '관리 사무실'), 'office', 57, 51, 12, 18)
      .room(T('車寄せ', 'Drop-off', '차량 승하차장'), 'porch', 24, 69, 20, 6);
    b.dh(25, 51, 22, 1, 0, 'open')
      .dv(47, 53, 14, 1, 0, 'open')
      .dh(32.5, 65, 3, 1, 0, 'auto').dh(32.5, 69, 3, 1, 0, 'auto')
      .dv(57, 62, 1.5, 1, 0)
      .wh(25, 69, 4, 'window2').wh(39, 69, 4, 'window2').wh(60, 69, 3).wh(65, 69, 3).wv(69, 55, 3);
    b.item('reception', 41, 54, 90, { size: [5, 1.4] }).item('chair', 43.6, 55.2, 90)
      .item('sofa3', 25, 56, 90).item('lowtable', 27.4, 57.1, 90).item('sofa3', 29.2, 56, 270)
      .item('plant', 21.5, 51.5).item('plant', 21.5, 66.5).item('plant', 44.8, 66.5).item('rug', 24.5, 55, 0, { size: [7, 6.4] })
      .item('locker', 49, 51.2, 0, { size: [6, 1] }).item('locker', 55.8, 52, 90, { size: [8, 1] }).item('cabinet', 49, 67.9, 180, { size: [5, 1] })
      .item('office_desk', 60, 55).item('office_desk', 60, 59).item('filing', 67.8, 52).item('filing', 67.8, 53.4).item('copier', 64.5, 51.2)
      .item('chair', 60.7, 56.4, 180).item('chair', 60.7, 60.4, 180).item('sofa2', 62, 65, 180).item('lowtable', 62.5, 63.3);
    // 西：シアタールーム・スタディルーム
    b.room(T('シアタールーム', 'Theater room', '시어터룸'), 'public', 3, 21, 18, 26)
      .room(T('スタディルーム', 'Study room', '스터디룸'), 'public', 3, 47, 18, 22);
    b.dv(21, 22, 1.5, -1, 0).dv(21, 47.5, 3, -1, 0, 'door2')
      .wv(3, 51, 3.5, 'window2').wv(3, 57, 3.5, 'window2').wv(3, 63, 3.5, 'window2').wh(7, 69, 3.5, 'window2').wh(13, 69, 3.5, 'window2');
    b.item('whiteboard', 3, 29, 270, { size: [10, 0.4] }).item('speaker', 3.2, 26.5, 270).item('speaker', 3.2, 39.8, 270);
    [7, 10, 13, 16].forEach(x => b.item('seats', x, 28, 90, { size: [8, 1.2] }));
    for (let y = 49.5; y < 66; y += 4.5) b.item('table', 6, y, 0, { size: [9, 1.6] }).item('chair', 7, y - 1.1).item('chair', 9.5, y - 1.1).item('chair', 12, y - 1.1);
    b.item('bookshelf', 18.9, 55, 90, { size: [8, 1] }).item('plant', 19.5, 66.5);
    return b.f;
  }

  function tower() {
    return [towerLobby(), towerTypical(), towerRoof()];
  }

  // 屋上：コアの塔屋（階段2か所・EV機械室・ポンプ室）、緊急離着陸場（H）、高架水槽・室外機・アンテナ
  function towerRoof() {
    const b = makeFloor(T('屋上', 'Rooftop', '옥상'));
    b.room(T('屋上', 'Rooftop', '옥상'), 'rooftop', 0, 0, 72, 72, { lx: -24, ly: -28 })
      .room(T('階段A', 'Stairs A', '계단A'), 'hall', 25, 25, 6, 11)
      .room(T('EV機械室', 'Elevator machine room', 'EV 기계실'), 'industrial', 31, 25, 12, 11)
      .room(T('ポンプ室', 'Pump room', '펌프실'), 'industrial', 25, 36, 16, 11)
      .room(T('階段B', 'Stairs B', '계단B'), 'hall', 41, 36, 6, 11)
      .room(T('緊急離着陸場', 'Emergency helipad', '긴급 이착륙장'), 'road', 48, 48, 20, 20, { ly: 7.5 });
    b.dv(25, 34.2, 1.5, -1, 0, 'steel')          // 階段A → 屋上
      .dv(47, 37, 1.5, 1, 0, 'steel')             // 階段B → 屋上
      .dh(36, 25, 1.5, -1, 0, 'steel')            // EV機械室
      .dh(30, 47, 1.5, 1, 0, 'steel')             // ポンプ室
      .dv(41, 38, 1.5, -1, 0);                    // ポンプ室 ↔ 階段B
    b.item('stairs_u', 25.5, 25.3, 0, { size: [5, 8] }).item('stairs_u', 41.5, 38.8, 0, { size: [5, 8] })
      .item('control_panel', 31.3, 25.3).item('control_panel', 35.3, 25.3).item('control_panel', 39.3, 25.3)
      .item('cable_rack', 31.3, 33, 0, { size: [11, 0.8] })
      .item('water_pipe', 25.3, 43.5, 0, { size: [15, 0.8] }).item('dist_board', 38.6, 36.3);
    // 緊急離着陸場の H マーク
    b.text('H', 58, 58, { size: 9 });
    b.item('water_tower', 6, 6).item('water_tower', 12, 6)
      .item('antenna', 64, 6).item('antenna', 66, 9);
    [6, 9, 12, 15].forEach(y => b.item('ac_unit', 24, y).item('ac_unit', 27, y).item('ac_unit', 30, y));
    [50, 54, 58, 62].forEach(y => b.item('vent_unit', 6, y));
    b.item('extinguisher', 24.2, 36.5).item('hatch', 14, 30);
    return b.f;
  }

  /* ---------- 学校（片廊下型の校舎・2階建て） ---------- */
  // 北側に幅 2.5m の廊下、南側に 8m × 8m の教室が並ぶ。黒板は西、窓は南（左手から光が入る）

  function schoolStairs(b, x) {
    b.room(N.stairs, 'hall', x, 5, 10, 16, { hideLabel: true })
      .dh(x + 2, 5, 6, 1, 0, 'open')
      .item('stairs_u', x + 2, 10.5, 180, { size: [6, 10] });
  }

  function classroom(b, x, name) {
    b.room(name, 'public', x, 5, 16, 16, { ly: -6.6 })
      .dh(x + 1, 5, 2, 1, 0, 'sliding').dh(x + 13, 5, 2, 1, 0, 'sliding')
      .wh(x + 1.5, 21, 3.5, 'window2').wh(x + 6.25, 21, 3.5, 'window2').wh(x + 11, 21, 3.5, 'window2');
    b.item('whiteboard', x, 9.5, 270, { size: [7, 0.4] }).item('lectern', x + 1.6, 12.1, 90)
      .item('cabinet', x + 15.2, 7.5, 90, { size: [12, 0.8] });
    for (let c = 0; c < 5; c++) for (let r = 0; r < 6; r++) b.item('school_desk', x + 4.2 + c * 2.2, 7.4 + r * 2.2, 90);
  }

  function schoolToilets(b) {
    b.room(T('男子トイレ', 'Boys\' restroom', '남자 화장실'), 'wet', 58, 5, 6, 16)
      .room(T('女子トイレ', 'Girls\' restroom', '여자 화장실'), 'wet', 64, 5, 6, 16)
      .dh(60, 5, 1.5, 1, 0).dh(66.5, 5, 1.5, 1, 1)
      .wh(59.5, 21, 3).wh(65.5, 21, 3);
    [11, 13.5, 16, 18.5].forEach(y => b.item('toilet', 62.4, y, 90).item('toilet', 64, y, 270));
    [8, 9.9].forEach(y => b.item('washbasin', 58, y, 270).item('washbasin', 68.9, y, 90));
    [10.5, 12.75, 15.25, 17.75, 20.25].forEach(y => b.wall(61.5, y, 66.5, y, 'thin'));   // 個室の仕切り
  }

  function schoolCorridor(b) {
    b.room(N.corridor, 'hall', 0, 0, 118, 5, { hideLabel: true });
    for (let x = 12; x < 108; x += 8) b.wh(x, 0, 3);
  }

  function school() {
    const g = makeFloor('1F');
    schoolCorridor(g);
    schoolStairs(g, 0);
    schoolStairs(g, 108);
    classroom(g, 10, T('1年1組', 'Class 1-1', '1학년 1반'));
    classroom(g, 26, T('1年2組', 'Class 1-2', '1학년 2반'));
    schoolToilets(g);
    g.room(T('昇降口', 'Shoe lockers', '신발장 현관'), 'hall', 42, 5, 16, 16)
      .room(T('職員室', 'Staff room', '교무실'), 'office', 70, 5, 20, 16)
      .room(T('校長室', 'Principal\'s office', '교장실'), 'office', 90, 5, 8, 16)
      .room(T('保健室', 'Nurse\'s office', '보건실'), 'medical', 98, 5, 10, 16)
      .room(T('昇降口前', 'Front steps', '현관 앞'), 'porch', 42, 21, 16, 3, { hideLabel: true });
    g.dh(44, 5, 12, 1, 0, 'open')
      .dh(45, 21, 3, 1, 0, 'sliding2').dh(52, 21, 3, 1, 0, 'sliding2')
      .dv(0, 1.75, 1.5, -1, 0)
      .dh(71, 5, 2, 1, 0, 'sliding').dh(86, 5, 2, 1, 0, 'sliding')
      .dv(90, 17, 1.5, 1, 0)
      .dh(91, 5, 1.5, 1, 0)
      .dh(99, 5, 2, 1, 0, 'sliding').dh(103, 21, 1.5, 1, 0)
      .wh(72, 21, 3.5, 'window2').wh(78, 21, 3.5, 'window2').wh(84, 21, 3.5, 'window2')
      .wh(92.5, 21, 3).wh(99.5, 21, 2.5).wv(118, 1, 3);
    [9, 14].forEach(y => g.item('locker', 44, y, 180, { size: [12, 1] }).item('locker', 44, y + 1, 0, { size: [12, 1] }));
    g.item('plant', 42.4, 19.4).item('plant', 56.4, 19.4);
    [[72, 8], [80.5, 8], [72, 13.5], [80.5, 13.5]].forEach(([x, y]) => {
      for (let i = 0; i < 3; i++) g.item('office_desk', x + i * 2.4, y, 180).item('office_desk', x + i * 2.4, y + 1.4, 0);
    });
    g.item('office_desk', 88.3, 11.2, 270).item('whiteboard', 76, 5.1, 0, { size: [6, 0.4] })
      .item('cabinet', 71, 19.9, 180, { size: [6, 1] }).item('copier', 88.4, 19.4)
      .item('sofa2', 90.8, 9, 270).item('lowtable', 93.4, 9.5, 90).item('sofa2', 95.2, 9, 90)
      .item('desk', 92.5, 17, 0, { size: [3, 1.4] }).item('chair', 93.5, 18.6, 180).item('bookshelf', 97.2, 14, 90)
      .item('bed_single', 103.9, 7, 90).item('curtain', 103.9, 9.45, 0, { size: [4, 0.3] }).item('bed_single', 103.9, 10.2, 90)
      .item('washbasin', 102, 5).item('med_cabinet', 107, 13, 90).item('table', 100, 14.2).item('chair', 100.3, 13.1).item('chair', 101.6, 15.9, 180)
      .item('desk', 98, 17, 270).item('chair', 99.3, 17.7, 90);

    const u = makeFloor('2F');
    schoolCorridor(u);
    schoolStairs(u, 0);
    schoolStairs(u, 108);
    classroom(u, 10, T('2年1組', 'Class 2-1', '2학년 1반'));
    classroom(u, 26, T('2年2組', 'Class 2-2', '2학년 2반'));
    classroom(u, 42, T('2年3組', 'Class 2-3', '2학년 3반'));
    schoolToilets(u);
    u.room(T('音楽室', 'Music room', '음악실'), 'public', 70, 5, 16, 16, { ly: -6.6 })
      .room(T('理科室', 'Science lab', '과학실'), 'medical', 86, 5, 16, 16, { ly: -6.6 })
      .room(T('理科準備室', 'Lab prep room', '과학 준비실'), 'storage', 102, 5, 6, 16);
    u.dh(71, 5, 2, 1, 0, 'sliding').dh(83, 5, 2, 1, 0, 'sliding')
      .dh(87, 5, 2, 1, 0, 'sliding').dh(99, 5, 2, 1, 0, 'sliding')
      .dv(102, 14, 1.5, 1, 0).dh(103.5, 5, 1.5, 1, 1)
      .wh(71.5, 21, 3.5, 'window2').wh(76.25, 21, 3.5, 'window2').wh(81, 21, 3.5, 'window2')
      .wh(87.5, 21, 3.5, 'window2').wh(92.25, 21, 3.5, 'window2').wh(97, 21, 3.5, 'window2').wh(104, 21, 2);
    u.item('whiteboard', 70, 8, 270, { size: [6, 0.4] }).item('piano', 71, 15.5).item('speaker', 70.2, 6).item('speaker', 70.2, 19.8)
      .item('cabinet', 85, 8, 90, { size: [10, 1] });
    for (let c = 0; c < 4; c++) for (let r = 0; r < 7; r++) u.item('chair', 76.5 + c * 2, 7.6 + r * 1.9, 90);
    u.item('whiteboard', 86, 8, 270, { size: [6, 0.4] }).item('lab_bench', 87, 11, 90).item('sink', 97, 19.6, 180);
    [[89.5, 8], [95.5, 8], [89.5, 12.3], [95.5, 12.3], [89.5, 16.6], [95.5, 16.6]].forEach(([x, y]) => {
      u.item('lab_bench', x, y).item('stool', x + 0.6, y - 0.95).item('stool', x + 2.6, y - 0.95).item('stool', x + 0.6, y + 1.75).item('stool', x + 2.6, y + 1.75);
    });
    u.item('med_cabinet', 107, 6, 90).item('med_cabinet', 107, 9.5, 90).item('cabinet', 102, 6, 270, { size: [4, 0.9] })
      .item('tank', 105, 17.8).item('desk', 104.5, 11.5, 90);

    // 屋上：西の階段だけが塔屋まで上がる。外周はパラペットと、内側に高いフェンス
    const r = makeFloor(T('屋上', 'Rooftop', '옥상'));
    r.room(T('屋上', 'Rooftop', '옥상'), 'rooftop', 0, 0, 118, 21, { lx: -2 })
      .room(T('塔屋（階段室）', 'Stair penthouse', '옥탑(계단실)'), 'hall', 0, 5, 10, 16, { ly: -5.2, note: T('屋上の扉はふだん施錠。鍵は職員室のキーボックス', 'The roof door is normally locked; the key hangs in the staff room key box', '옥상 문은 평소 잠겨 있다. 열쇠는 교무실 키 박스') })
      .dv(10, 6, 2, 1, 0, 'steel')
      .wv(0, 6, 3).wh(3, 21, 3);
    r.wall(1, 1, 117, 1, 'fence').wall(1, 1, 1, 5, 'fence').wall(117, 1, 117, 20, 'fence').wall(10, 20, 117, 20, 'fence');
    r.item('stairs_u', 2, 10.5, 180, { size: [6, 10] })
      .item('water_tower', 110, 7).item('ladder', 110.6, 11.2).item('antenna', 12.4, 1.6)
      .item('vent_unit', 60, 8).item('vent_unit', 65, 8)
      .item('garden_bench', 40, 6).item('garden_bench', 45, 6)
      .item('grating', 2, 2, 0, { size: [1, 1] }).item('grating', 115.4, 18.4, 0, { size: [1, 1] })
      .item('puddle', 30, 12).item('puddle', 86, 13).item('bird', 52, 12).item('bird', 53.4, 12.8);
    // 教室の上に後付けの室外機
    [12, 28, 44, 72, 88].forEach(x => { for (let i = 0; i < 4; i++) r.item('ac_unit', x + 2 + i * 2.4, 18.6, 180); });
    return [g.f, u.f, r.f];
  }

  /* ---------- 警察署（1F 窓口・2F 刑事課と留置場） ---------- */
  // 中廊下の北に地域課・車庫など、南に窓口。2F は捜査本部・取調室・留置場（鉄格子の房と看守通路）

  function policeCore(b) {
    b.room(N.corridor, 'hall', 0, 15, 60, 5, { hideLabel: true })
      .room(N.stairs, 'hall', 30, 0, 8, 15, { hideLabel: true })
      .room(N.toilet, 'wet', 38, 0, 4, 15)
      .dh(33, 15, 3, -1, 0, 'door2')
      .dh(38.25, 15, 1.5, -1, 0)
      .item('stairs_u', 31, 0.5, 0, { size: [6, 10] })
      .item('toilet', 38.3, 0.2).item('toilet', 40.2, 0.2).item('washbasin', 40.9, 8, 90)
      .wv(0, 16.75, 1.5).wv(60, 16.75, 1.5);
  }

  // 取調室（7 × 8）。机を挟んで被疑者が奥、刑事が手前。壁際に記録係の机
  function interrogation(b, x, name) {
    b.room(name, 'office', x, 20, 7, 8, { ly: -2.4 })
      .dh(x + 1, 20, 1.5, 1, 0, 'locked');
    b.item('table', x + 2.1, 23.6).item('chair', x + 3, 25.4, 180).item('chair', x + 3, 22.5)
      .item('desk', x + 4.5, 26.8, 180, { size: [2.3, 1.1] }).item('chair', x + 5.2, 25.6);
  }

  function police() {
    const g = makeFloor('1F');
    policeCore(g);
    g.room(T('地域課', 'Patrol division', '지역과'), 'office', 0, 0, 20, 15)
      .room(T('当直室', 'Night duty room', '당직실'), 'bedroom', 20, 0, 10, 15)
      .room(T('車庫', 'Garage', '차고'), 'garage', 42, 0, 18, 15)
      .room(T('交通課', 'Traffic division', '교통과'), 'office', 0, 20, 18, 16)
      .room(T('ロビー', 'Lobby', '로비'), 'public', 18, 20, 24, 16)
      .room(T('会計課', 'Accounting', '회계과'), 'office', 42, 20, 18, 8)
      .room(T('相談室', 'Consultation room', '상담실'), 'office', 42, 28, 8, 8)
      .room(T('警務課', 'Administration', '경무과'), 'office', 50, 28, 10, 8)
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 18, 36, 24, 4);
    g.dh(3, 15, 1.5, -1, 0).dh(15, 15, 1.5, -1, 1).dv(0, 5, 1.5, -1, 0)
      .dh(22, 15, 1.5, -1, 0)
      .dh(43.5, 0, 5, -1, 0, 'shutter').dh(51.5, 0, 5, -1, 0, 'shutter').dh(56, 15, 1.5, -1, 1)
      .dh(2, 20, 1.5, 1, 0).dv(18, 23, 10, 1, 0, 'open')
      .dh(28.5, 36, 3, 1, 0, 'auto').dh(38, 20, 1.5, -1, 1)
      .dv(42, 21, 6, 1, 0, 'open').dh(57, 20, 1.5, 1, 1)
      .dv(42, 30, 1.5, 1, 0).dh(55, 28, 1.5, 1, 0)
      .wh(3, 0, 3).wh(9, 0, 3).wh(15, 0, 3).wh(24, 0, 3)
      .wv(0, 24, 3).wv(0, 30, 3).wh(3, 36, 3).wh(10, 36, 3)
      .wh(21, 36, 4, 'window2').wh(35, 36, 4, 'window2')
      .wh(45, 36, 3).wh(53, 36, 3).wv(60, 22, 3).wv(60, 30, 3);
    g.item('locker', 0.2, 0.1, 0, { size: [9, 1] }).item('whiteboard', 19.6, 3, 90, { size: [6, 0.4] })
      .item('office_desk', 3, 5, 180).item('office_desk', 3, 6.4).item('office_desk', 5.4, 5, 180).item('office_desk', 5.4, 6.4)
      .item('office_desk', 11, 5, 180).item('office_desk', 11, 6.4).item('office_desk', 13.4, 5, 180).item('office_desk', 13.4, 6.4)
      .item('meeting6', 7, 9.6).item('filing', 12, 0.1).item('filing', 13.2, 0.1)
      .item('bed_single', 20.2, 0.3).item('bed_single', 22.6, 0.3).item('bed_single', 25.2, 0.3)
      .item('locker', 27, 11.6, 90, { size: [3, 1] }).item('table', 20.5, 8).item('chair', 21.4, 10)
      .item('car', 44, 3).item('car', 52, 3).item('cabinet', 42.2, 13.8, 180, { size: [4, 1] })
      .item('reception', 16.6, 23, 90, { size: [10, 1.4] })
      .item('office_desk', 2, 24).item('office_desk', 2, 28).item('office_desk', 8, 24).item('office_desk', 8, 28)
      .item('filing', 0.1, 33.4).item('filing', 1.3, 33.4).item('copier', 12, 33.8)
      .item('reception', 26.5, 20.3, 0, { size: [7, 1.4] }).item('chair', 29.5, 22)
      .item('bench', 21, 27).item('bench', 21, 30).item('bench', 34, 27).item('bench', 34, 30)
      .item('vending', 20.2, 34.4, 180).item('plant', 40.5, 34.6).item('plant', 18.3, 20.3)
      .item('reception', 42, 21, 270, { size: [6, 1.4] }).item('office_desk', 46, 22).item('office_desk', 51, 22).item('safe', 58.6, 25.5)
      .item('table', 44.6, 31.2).item('chair', 45.5, 30.1).item('chair', 45.5, 32.9, 180).item('plant', 48.6, 34.6)
      .item('office_desk', 51, 31).item('office_desk', 55.5, 31).item('filing', 58.8, 33.5);

    const u = makeFloor('2F');
    policeCore(u);
    u.room(T('捜査本部（大会議室）', 'Task force room', '수사본부(대회의실)'), 'office', 0, 0, 22, 15)
      .room(T('証拠品保管庫', 'Evidence room', '증거품 보관실'), 'storage', 22, 0, 8, 15)
      .room(T('留置室1', 'Cell 1', '유치실1'), 'danger', 42, 0, 6, 9, { noWall: true })
      .room(T('留置室2', 'Cell 2', '유치실2'), 'danger', 48, 0, 6, 9, { noWall: true })
      .room(T('留置室3', 'Cell 3', '유치실3'), 'danger', 54, 0, 6, 9, { noWall: true })
      .room(T('看守通路', 'Guard aisle', '간수 통로'), 'hall', 42, 9, 18, 6)
      .room(T('刑事課', 'Criminal investigation', '형사과'), 'office', 0, 20, 20, 16)
      .room(T('観察室', 'Observation room', '관찰실'), 'office', 27, 20, 5, 8)
      .room(T('資料室', 'Records room', '자료실'), 'storage', 20, 28, 26, 8)
      .room(T('署長室', 'Chief\'s office', '서장실'), 'office', 46, 20, 14, 16);
    interrogation(u, 20, T('取調室1', 'Interrogation 1', '취조실1'));
    interrogation(u, 32, T('取調室2', 'Interrogation 2', '취조실2'));
    interrogation(u, 39, T('取調室3', 'Interrogation 3', '취조실3'));
    // 留置場：房の間は壁、通路側は鉄格子
    u.wall(42, 0, 42, 9).wall(48, 0, 48, 9).wall(54, 0, 54, 9).wall(42, 9, 60, 9, 'bars');
    u.dh(3, 15, 3, -1, 0, 'door2').dh(18, 15, 1.5, -1, 1)
      .dh(24, 15, 1.5, -1, 0, 'locked')
      .dh(44, 15, 1.5, -1, 0, 'locked')
      .dh(44.25, 9, 1.5, 1, 0, 'locked').dh(50.25, 9, 1.5, 1, 0, 'locked').dh(56.25, 9, 1.5, 1, 0, 'locked')
      .dh(2, 20, 1.5, 1, 0).dh(16, 20, 1.5, 1, 1).dv(20, 32, 1.5, 1, 0)
      .dh(28.75, 20, 1.5, 1, 0)
      .wv(27, 22.5, 2).wv(32, 22.5, 2)        // マジックミラー
      .dh(47.5, 20, 1.5, 1, 0)
      .wh(3, 0, 3).wh(9, 0, 3).wh(15, 0, 3).wv(0, 4, 3).wh(25, 0, 2)
      .wh(44, 0, 2, 'barred').wh(50, 0, 2, 'barred').wh(56, 0, 2, 'barred')
      .wv(0, 24, 3).wv(0, 30, 3).wh(3, 36, 3).wh(10, 36, 3).wh(15, 36, 3)
      .wh(26, 36, 3).wh(38, 36, 3).wh(49, 36, 4, 'window2').wh(55, 36, 3).wv(60, 24, 3).wv(60, 30, 3);
    u.item('whiteboard', 5, 0.1, 0, { size: [12, 0.4] }).item('lectern', 10.1, 1.4)
      .item('table', 2, 4.5, 0, { size: [7, 1.4] }).item('table', 12, 4.5, 0, { size: [7, 1.4] })
      .item('table', 2, 8.5, 0, { size: [7, 1.4] }).item('table', 12, 8.5, 0, { size: [7, 1.4] })
      .item('whiteboard', 21.6, 5, 90, { size: [6, 0.4] }).item('copier', 0.2, 11.8, 270).item('cabinet', 8, 13.8, 180);
    [[2, 5.9], [12, 5.9], [2, 9.9], [12, 9.9]].forEach(([x, y]) => { for (let i = 0; i < 5; i++) u.item('chair', x + 0.2 + i * 1.4, y, 180); });
    u.item('locker', 22.1, 0.1, 0, { size: [5.8, 1] }).item('locker', 29, 3, 90, { size: [8, 1] }).item('cabinet', 22.1, 4, 270, { size: [6, 0.9] })
      .item('safe', 22.3, 11.8).item('crate', 25.5, 8)
      .item('futon', 42.4, 0.5).item('futon', 44.6, 0.5).item('futon', 48.4, 0.5).item('futon', 50.6, 0.5)
      .item('futon', 54.4, 0.5).item('futon', 56.6, 0.5)
      .item('toilet', 46.9, 0.2).item('toilet', 52.9, 0.2).item('toilet', 58.9, 0.2)
      .wall(46.7, 0, 46.7, 2.2, 'thin').wall(52.7, 0, 52.7, 2.2, 'thin').wall(58.7, 0, 58.7, 2.2, 'thin')
      .item('desk', 51, 12.6, 0, { size: [3, 1.2] }).item('chair', 52, 13.8, 180).item('locker', 58.9, 11, 90, { size: [3.5, 1] })
      .item('whiteboard', 0, 26, 270, { size: [6, 0.4] });
    [[3, 24], [3, 29], [10, 24], [10, 29]].forEach(([x, y]) => {
      for (let i = 0; i < 2; i++) u.item('office_desk', x + i * 2.4, y, 180).item('office_desk', x + i * 2.4, y + 1.4);
    });
    u.item('office_desk', 17.4, 23, 270).item('filing', 18.8, 34.6).item('copier', 16, 34.6)
      .item('chair', 28.6, 23.6, 270).item('chair', 28.6, 25.2, 270).item('rack', 30.4, 25.6)
      .item('bookshelf', 22, 28.2).item('bookshelf', 25.2, 28.2).item('bookshelf', 28.4, 28.2).item('bookshelf', 31.6, 28.2)
      .item('bookshelf', 34.8, 28.2).item('bookshelf', 38, 28.2).item('bookshelf', 41.2, 28.2)
      .item('filing', 44.8, 28.2).item('filing', 44.8, 29.6).item('filing', 44.8, 31)
      .item('bookshelf', 23, 31.5, 0, { size: [9, 0.8] }).item('bookshelf', 23, 32.3, 180, { size: [9, 0.8] })
      .item('bookshelf', 34, 31.5, 0, { size: [9, 0.8] }).item('bookshelf', 34, 32.3, 180, { size: [9, 0.8] })
      .item('table', 40.5, 34, 0, { size: [4, 1.4] })
      .item('desk', 51.5, 30, 180, { size: [4, 1.6] }).item('armchair', 52.6, 32.2, 180)
      .item('sofa3', 48.5, 23.2, 90).item('lowtable', 51.2, 23.8, 90).item('armchair', 53.4, 23.9, 90)
      .item('bookshelf', 56, 20.2, 0).item('plant', 58.4, 34.4).item('plant', 46.4, 34.4);
    return [g.f, u.f];
  }

  /* ---------- 図書館（1F 開架・B1 閉架書庫） ---------- */
  // 北に階段・EV・トイレなどのサービス部分。1F は入口脇にカウンターと事務室、奥に開架と閲覧席

  function libraryCore(b) {
    b.room(N.stairs, 'hall', 16, 0, 6, 10, { hideLabel: true })
      .room(N.evHall, 'hall', 22, 0, 6, 10, { hideLabel: true })
      .dh(17, 10, 4, 1, 0, 'open').dh(23, 10, 4, 1, 0, 'open')
      .item('stairs_u', 16.5, 0.5, 0, { size: [5, 8] }).item('elevator', 23, 0.2);
  }

  function library() {
    const g = makeFloor('1F');
    libraryCore(g);
    g.room(T('学習室', 'Study room', '학습실'), 'public', 0, 0, 16, 10)
      .room(T('男子トイレ', 'Men\'s restroom', '남자 화장실'), 'wet', 28, 0, 4, 10, { hideLabel: true })
      .room(T('女子トイレ', 'Women\'s restroom', '여자 화장실'), 'wet', 32, 0, 4, 10, { hideLabel: true })
      .room(T('郷土資料室', 'Local history room', '향토 자료실'), 'storage', 36, 0, 20, 10)
      .room(T('開架閲覧室', 'Open stacks', '개가 열람실'), 'public', 0, 10, 40, 18)
      .room(T('閲覧席', 'Reading area', '열람석'), 'public', 40, 10, 16, 18)
      .room(N.office, 'office', 0, 28, 12, 8)
      .room(T('エントランスホール', 'Entrance hall', '엔트런스 홀'), 'hall', 12, 28, 16, 8)
      .room(T('児童コーナー', 'Children\'s corner', '어린이 코너'), 'public', 28, 28, 14, 8)
      .room(T('新聞・雑誌', 'Newspapers & magazines', '신문·잡지'), 'public', 42, 28, 14, 8)
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 14, 36, 12, 4, { hideLabel: true });
    g.dh(14, 10, 1.5, -1, 1).dh(28.5, 10, 1.5, -1, 0).dh(33.5, 10, 1.5, -1, 1).dh(38, 10, 1.5, -1, 0)
      .dv(40, 12, 14, 1, 0, 'open')
      .dh(20, 28, 8, 1, 0, 'open').dv(28, 29, 6, 1, 0, 'open').dh(43, 28, 12, 1, 0, 'open')
      .dv(12, 30.5, 1.5, -1, 0)
      .dh(18.5, 36, 3, 1, 0, 'auto')
      .wh(2, 0, 3).wh(8, 0, 3).wh(40, 0, 3).wh(48, 0, 3)
      .wv(0, 13, 3).wv(0, 19, 3).wv(0, 30.5, 3)
      .wv(56, 12, 4, 'window2').wv(56, 18, 4, 'window2').wv(56, 23.5, 3.5, 'window2').wv(56, 30, 4, 'window2')
      .wh(2, 36, 3).wh(7, 36, 3).wh(30, 36, 4, 'window2').wh(36, 36, 4, 'window2').wh(45, 36, 4, 'window2').wh(50.5, 36, 4, 'window2');
    // 学習室：壁向きの個人席と、背中合わせの中央席
    for (let i = 0; i < 6; i++) {
      const x = 0.6 + i * 2.5;
      g.item('desk', x, 0.2).item('chair', x + 0.7, 1.5, 180);
      if (i < 5) g.wall(x + 2.45, 0, x + 2.45, 1.6, 'thin');
    }
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 2.5;
      g.item('chair', x + 0.7, 3.5).item('desk', x, 4.6).item('desk', x, 5.8, 180).item('chair', x + 0.7, 7.1, 180);
    }
    g.item('toilet', 28.2, 0.2).item('toilet', 30.1, 0.2).item('washbasin', 30.8, 5, 90)
      .item('toilet', 32.2, 0.2).item('toilet', 34.1, 0.2).item('washbasin', 32, 5, 270)
      .item('bookshelf', 36.2, 0.1).item('bookshelf', 39.4, 0.1).item('cabinet', 44, 0.1, 0, { size: [4, 1] }).item('bookshelf', 48.6, 0.1)
      .item('bookshelf', 55.1, 2, 90).item('table', 42.5, 4.2, 0, { size: [4.5, 2.2] }).item('chair', 43.1, 3.1).item('chair', 45.3, 3.1)
      .item('chair', 43.1, 6.5, 180).item('chair', 45.3, 6.5, 180).item('lamp', 48.8, 7.6);
    // 開架：両面書架の列と壁面書架
    [12.5, 16, 19.5, 23].forEach(y => { for (let i = 0; i < 4; i++) g.item('bookstack', 1.5 + i * 4, y); });
    g.item('bookshelf', 0, 12.4, 270, { size: [11, 0.8] })
      .item('table', 24, 13.5, 0, { size: [4, 1.6] }).item('table', 31, 13.5, 0, { size: [4, 1.6] })
      .item('table', 24, 19.5, 0, { size: [4, 1.6] }).item('table', 31, 19.5, 0, { size: [4, 1.6] })
      .item('desk', 22.5, 25.6, 0, { size: [2.4, 1.1] }).item('desk', 25.5, 25.6, 0, { size: [2.4, 1.1] });
    [[24, 13.5], [31, 13.5], [24, 19.5], [31, 19.5]].forEach(([x, y]) => g.item('chair', x + 0.6, y - 1.05).item('chair', x + 2.4, y - 1.05).item('chair', x + 0.6, y + 1.65, 180).item('chair', x + 2.4, y + 1.65, 180));
    [[43, 12.5], [49.5, 12.5], [43, 19], [49.5, 19]].forEach(([x, y]) => {
      g.item('table', x, y + 1.1, 0, { size: [5, 2] });
      [0.4, 2, 3.6].forEach(dx => g.item('chair', x + dx, y).item('chair', x + dx, y + 3.2, 180));
    });
    g.item('sofa3', 51.4, 23.6, 90).item('plant', 54.6, 26.6)
      .item('office_desk', 1, 29.5).item('office_desk', 1, 32.5).item('office_desk', 5.5, 29.5).item('copier', 10.4, 34.6, 180)
      .item('cabinet', 5, 35, 180, { size: [4, 0.9] })
      .item('reception', 15.5, 29.5, 90, { size: [5, 1.4] }).item('chair', 13.8, 30.8, 90).item('chair', 13.8, 32.6, 90)
      .item('cabinet', 12.3, 34.9, 180, { size: [2.5, 0.9] }).item('plant', 26.6, 34.6)
      .item('rug', 31, 29.5, 0, { size: [7, 5] }).item('table_round', 33.6, 31)
      .item('stool', 32.6, 30.4).item('stool', 35.6, 30.4).item('stool', 32.6, 32.8).item('stool', 35.6, 32.8)
      .item('bookshelf', 38.5, 35.1, 180).item('bookshelf', 41.1, 30, 90)
      .item('cabinet', 42.2, 35, 180, { size: [4, 0.9] }).item('sofa3', 48, 34, 180).item('lowtable', 49.1, 32.4).item('table', 52.5, 30, 90)
      .item('chair', 54.2, 30.4, 90).item('chair', 54.2, 31.9, 90);

    const d = makeFloor('B1');
    libraryCore(d);
    d.room(T('機械室', 'Machine room', '기계실'), 'garage', 0, 0, 16, 10)
      .room(T('作業室', 'Workroom', '작업실'), 'office', 28, 0, 12, 10)
      .room(T('禁書庫', 'Forbidden archive', '금서고'), 'special', 40, 0, 16, 10, { gm: true, plName: '', note: T('廊下の本棚の裏に隠し扉。持ち出し禁止の魔導書が眠る', 'Secret door behind a corridor bookcase. Grimoires that must never leave this room.', '복도 책장 뒤에 숨겨진 문. 반출 금지 마도서가 잠들어 있다') })
      .room(N.corridor, 'hall', 0, 10, 56, 4, { hideLabel: true })
      .room(T('閉架書庫', 'Closed stacks', '폐가 서고'), 'storage', 0, 14, 40, 22)
      .room(T('貴重書庫', 'Rare book vault', '귀중서고'), 'storage', 40, 14, 16, 12)
      .room(T('地下倉庫', 'Basement storage', '지하 창고'), 'storage', 40, 26, 16, 10);
    d.dh(3, 10, 1.5, -1, 0).dh(33, 10, 1.5, -1, 0)
      .dh(46, 10, 1.5, -1, 0, 'secret')
      .dh(18, 14, 1.5, 1, 0).dh(43, 14, 1.5, 1, 0, 'locked')
      .dv(40, 30, 1.5, 1, 0);
    d.item('tank', 1, 1).item('tank', 4, 1).item('rack', 13.6, 0.4).item('rack', 13.6, 2.8).item('cabinet', 6, 8.9, 180, { size: [4, 1] })
      .item('table', 30, 3, 0, { size: [5, 2] }).item('chair', 31, 5.1, 180).item('chair', 33, 5.1, 180)
      .item('cabinet', 36.8, 0.1, 0, { size: [3, 1] }).item('crate', 28.4, 0.4).item('crate', 28.4, 7.8)
      .item('bookshelf', 40.2, 0.1, 0, { gm: true }).item('bookshelf', 43.4, 0.1, 0, { gm: true }).item('bookshelf', 52.8, 0.1, 0, { gm: true })
      .item('bookshelf', 55.1, 2.5, 90, { size: [5, 0.9], gm: true })
      .item('magic_circle', 45.5, 2, 0, { gm: true }).item('lectern', 47.1, 4, 0, { gm: true })
      .item('candle', 45.6, 1.2, 0, { gm: true }).item('candle', 49.6, 1.2, 0, { gm: true }).item('safe', 40.4, 7.2, 0, { gm: true })
      .item('bookshelf', 0.2, 10.1, 0, { size: [2.6, 0.8] }).item('bookshelf', 44, 10.1, 0, { size: [4, 0.8] });
    for (let i = 0; i < 9; i++) {
      const y = 15.9 + i * 2.2;
      for (let k = 0; k < 4; k++) d.item('bookstack', 1 + k * 4, y).item('bookstack', 21 + k * 4, y);
    }
    d.item('safe', 40.4, 14.4).item('safe', 41.8, 14.4).item('cabinet', 54.9, 15, 90, { size: [5, 1] }).item('cabinet', 54.9, 20.5, 90, { size: [5, 1] })
      .item('cabinet', 46, 21, 0, { size: [6, 1] }).item('table', 46.6, 17).item('lamp', 49.6, 17.4)
      .item('crate', 41, 27).item('crate', 43, 27).item('crate', 43, 32.4).item('barrel', 54.5, 34.5)
      .item('cabinet', 44, 34.9, 180, { size: [6, 1] }).item('bookshelf', 55.1, 27, 90, { size: [5, 0.9] });
    return [d.f, g.f];
  }

  /* ---------- 大学（講義棟 1F・研究棟 2F） ---------- */
  // 中廊下型。1F は大講義室（固定席）・講義室・ラウンジ・教務課、2F は研究室・実験室・ゼミ室・院生室

  function universityCore(b) {
    b.room(N.corridor, 'hall', 0, 16, 64, 4, { hideLabel: true })
      .room(N.stairs, 'hall', 42, 0, 8, 16, { hideLabel: true })
      .room(T('男子トイレ', 'Men\'s restroom', '남자 화장실'), 'wet', 50, 0, 7, 16)
      .room(T('女子トイレ', 'Women\'s restroom', '여자 화장실'), 'wet', 57, 0, 7, 16)
      .dh(43, 16, 6, 1, 0, 'open').dh(51, 16, 1.5, -1, 0).dh(61.5, 16, 1.5, -1, 1)
      .item('stairs_u', 43, 0.5, 0, { size: [6, 10] })
      .item('toilet', 50.4, 0.2).item('toilet', 52.3, 0.2).item('toilet', 54.2, 0.2)
      .item('washbasin', 55.9, 8, 90).item('washbasin', 55.9, 10, 90)
      .item('toilet', 57.9, 0.2).item('toilet', 59.8, 0.2).item('toilet', 61.7, 0.2)
      .item('washbasin', 57, 8, 270).item('washbasin', 57, 10, 270)
      .wall(51.9, 0, 51.9, 2.4, 'thin').wall(53.8, 0, 53.8, 2.4, 'thin').wall(59.4, 0, 59.4, 2.4, 'thin').wall(61.3, 0, 61.3, 2.4, 'thin')
      .wh(52, 0, 2).wh(59.5, 0, 2).wv(0, 17.25, 1.5).wv(64, 17.25, 1.5);
  }

  function university() {
    const g = makeFloor('1F');
    universityCore(g);
    g.room(T('大講義室', 'Lecture hall', '대강의실'), 'public', 0, 0, 28, 16, { ly: -4.6 })
      .room(T('講義室A', 'Classroom A', '강의실A'), 'public', 28, 0, 14, 16, { ly: -4.8 })
      .room(T('学生ラウンジ', 'Student lounge', '학생 라운지'), 'public', 0, 20, 24, 20)
      .room(T('エントランスホール', 'Entrance hall', '엔트런스 홀'), 'hall', 24, 20, 14, 20)
      .room(T('教務課', 'Academic affairs', '교무과'), 'office', 38, 20, 12, 20)
      .room(T('講義室B', 'Classroom B', '강의실B'), 'public', 50, 20, 14, 20, { ly: -8.8 })
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 26, 40, 10, 4, { hideLabel: true });
    g.dh(3, 16, 3, 1, 0, 'door2').dh(22, 16, 3, 1, 0, 'door2')
      .dh(29, 16, 1.5, -1, 0).dh(39.5, 16, 1.5, -1, 1)
      .dh(8, 20, 3, 1, 0, 'door2').dv(24, 25, 6, 1, 0, 'open')
      .dh(26, 20, 10, 1, 0, 'open').dh(29.5, 40, 3, 1, 0, 'auto')
      .dv(38, 23, 8, 1, 0, 'open').dh(47, 20, 1.5, 1, 1)
      .dh(51, 20, 1.5, 1, 0)
      .wv(0, 3, 3).wv(0, 9, 3).wh(31, 0, 2).wh(37, 0, 2)
      .wv(0, 24, 4, 'window2').wv(0, 31, 4, 'window2').wh(3, 40, 4, 'window2').wh(10, 40, 4, 'window2').wh(17, 40, 4, 'window2')
      .wh(40, 40, 3).wh(45, 40, 3).wv(64, 24, 3).wv(64, 31, 3);
    g.item('whiteboard', 8, 0.1, 0, { size: [12, 0.4] }).item('lectern', 13.1, 1.3).item('speaker', 0.3, 0.3).item('speaker', 26.5, 0.3);
    [4.5, 6.7, 8.9, 11.1, 13.3].forEach(y => [1.5, 10.4, 19.3].forEach(x => g.item('lecture_row', x, y, 180)));
    g.item('whiteboard', 31, 0.1, 0, { size: [8, 0.4] }).item('lectern', 34.1, 1.3);
    [4, 6.4, 8.8, 11.2].forEach(y => [29, 35.8].forEach(x => g.item('lecture_row', x, y, 180, { size: [5.6, 2] })));
    g.item('vending', 0.2, 21, 270).item('vending', 0.2, 23.2, 270)
      .item('dining_round', 5, 25).item('dining_round', 11, 25).item('dining_round', 17, 25)
      .item('dining_round', 5, 31).item('dining_round', 11, 31).item('dining_round', 17, 31)
      .item('sofa3', 3, 38.1, 180).item('sofa3', 14, 38.1, 180).item('plant', 22.6, 38.6)
      .item('bench', 27, 33, 0, { size: [4, 1] }).item('bench', 32, 33, 0, { size: [4, 1] })
      .item('whiteboard', 37.5, 33, 90, { size: [5, 0.4] }).item('plant', 24.2, 38.6).item('plant', 36.6, 38.6)
      .item('reception', 38.2, 23, 90, { size: [8, 1.4] })
      .item('office_desk', 41.5, 24).item('office_desk', 41.5, 25.4, 180).item('office_desk', 44.5, 24).item('office_desk', 44.5, 25.4, 180)
      .item('office_desk', 41.5, 30).item('office_desk', 41.5, 31.4, 180).item('office_desk', 44.5, 30).item('office_desk', 44.5, 31.4, 180)
      .item('filing', 48.8, 22).item('filing', 48.8, 23.4).item('copier', 47.5, 38.6).item('cabinet', 39, 38.9, 180, { size: [5, 1] });
    [22.5, 25, 27.5, 30, 32.5].forEach(y => [51.2, 57.6].forEach(x => g.item('lecture_row', x, y, 0, { size: [5.6, 2] })));
    g.item('lectern', 56.1, 36.4).item('whiteboard', 53, 39.5, 180, { size: [8, 0.4] });

    const u = makeFloor('2F');
    universityCore(u);
    for (let i = 0; i < 6; i++) {
      const x = i * 7;
      const extra = i === 2 ? { note: T('失踪した教授の研究室。机の引き出しに暗号めいたメモが残る', 'The missing professor\'s office. A cryptic memo is left in the desk drawer.', '실종된 교수의 연구실. 책상 서랍에 암호 같은 메모가 남아 있다') } : {};
      u.room(T(`研究室${i + 1}`, `Faculty office ${i + 1}`, `연구실${i + 1}`), 'office', x, 0, 7, 16, extra)
        .dh(x + 4.5, 16, 1.5, -1, 1)
        .wh(x + 1.5, 0, 4)
        .item('desk', x + 2.3, 0.3).item('chair', x + 3, 1.6, 180)
        .item('bookshelf', x, 3, 270, { size: [8, 0.8] }).item('bookshelf', x + 6.2, 3, 90, { size: [8, 0.8] })
        .item('table', x + 2.3, 9, 0, { size: [2.4, 1.4] }).item('chair', x + 2.5, 7.9).item('chair', x + 3.7, 7.9).item('chair', x + 3.1, 10.5, 180);
    }
    u.item('clue', 16.6, 1.2, 0, { gm: true });
    u.room(T('実験室', 'Laboratory', '실험실'), 'medical', 0, 20, 20, 20)
      .room(T('ゼミ室', 'Seminar room', '세미나실'), 'office', 20, 20, 10, 20)
      .room(T('院生室', 'Grad student room', '대학원생실'), 'office', 30, 20, 14, 20)
      .room(T('資料室', 'Archive', '자료실'), 'storage', 44, 20, 10, 20)
      .room(T('学科事務室', 'Department office', '학과 사무실'), 'office', 54, 20, 10, 20);
    u.dh(2, 20, 1.5, 1, 0).dh(16.5, 20, 1.5, 1, 1).dh(21, 20, 1.5, 1, 0).dh(31, 20, 1.5, 1, 0)
      .dh(45, 20, 1.5, 1, 0).dh(55, 20, 1.5, 1, 0)
      .wv(0, 24, 4, 'window2').wv(0, 31, 4, 'window2').wh(3, 40, 4, 'window2').wh(10, 40, 4, 'window2')
      .wh(23, 40, 4).wh(33, 40, 4).wh(38.5, 40, 4).wh(47, 40, 3).wh(57, 40, 3).wv(64, 24, 3).wv(64, 31, 3);
    [[3, 24], [10.5, 24], [3, 29.5], [10.5, 29.5]].forEach(([x, y]) => u.item('lab_bench', x, y)
      .item('stool', x + 0.6, y - 0.95).item('stool', x + 2.6, y - 0.95).item('stool', x + 0.6, y + 1.75).item('stool', x + 2.6, y + 1.75));
    u.item('tank', 0.3, 35.5).item('tank', 3, 35.5).item('rack', 18.4, 22.5).item('rack', 18.4, 25).item('sink', 8, 38.6, 180)
      .item('med_cabinet', 12, 38.9, 180).item('op_table', 15.5, 32, 0, { size: [3, 4.4] })
      .item('meeting6', 23.2, 24, 90).item('meeting6', 23.2, 28.8, 90).item('whiteboard', 29.5, 25, 90, { size: [6, 0.4] }).item('bookshelf', 21, 38.9, 180)
      .item('office_desk', 31, 23.5).item('office_desk', 33.4, 23.5).item('office_desk', 31, 24.9, 180).item('office_desk', 33.4, 24.9, 180)
      .item('office_desk', 37.5, 23.5).item('office_desk', 39.9, 23.5).item('office_desk', 37.5, 24.9, 180).item('office_desk', 39.9, 24.9, 180)
      .item('office_desk', 31, 29.5).item('office_desk', 33.4, 29.5).item('office_desk', 31, 30.9, 180).item('office_desk', 33.4, 30.9, 180)
      .item('sofa3', 37, 38.1, 180).item('lowtable', 38.1, 36.4).item('bookshelf', 43.1, 29, 90).item('fridge', 30.2, 38.4)
      .item('bookshelf', 44.2, 23.2).item('bookshelf', 47.4, 23.2).item('bookshelf', 44.2, 27.2).item('bookshelf', 47.4, 27.2)
      .item('bookshelf', 44.2, 31.2).item('bookshelf', 47.4, 31.2).item('bookshelf', 53.1, 23, 90, { size: [8, 0.9] }).item('table', 45, 36).item('filing', 52.9, 38.6)
      .item('office_desk', 56, 25).item('office_desk', 56, 26.4, 180).item('office_desk', 59, 25).item('office_desk', 59, 26.4, 180)
      .item('filing', 62.8, 21).item('filing', 62.8, 22.4).item('copier', 62.4, 38.6).item('sofa2', 55, 36.2);
    return [g.f, u.f];
  }

  /* ---------- バー（地下1階） ---------- */
  // 地上から階段で降りる。カウンターとバックバー、ボックス席、ビリヤード。奥に厨房・倉庫・事務所、施錠された VIP ルーム

  function bar() {
    const b = makeFloor('B1');
    b.room(N.stairs, 'hall', 0, 0, 7, 10)
      .room(N.toilet, 'wet', 0, 10, 7, 6)
      .room(T('VIPルーム', 'VIP room', 'VIP룸'), 'living', 0, 16, 7, 8)
      .room(T('バー', 'Bar', '바'), 'public', 7, 0, 25, 24)
      .room(N.kitchen, 'kitchen', 32, 0, 8, 10)
      .room(N.storeroom, 'storage', 32, 10, 8, 6)
      .room(N.office, 'office', 32, 16, 8, 8);
    b.dv(7, 7.5, 1.5, 1, 1)
      .dv(7, 11, 1.5, -1, 0).dv(7, 17, 1.5, -1, 0, 'locked')
      .dv(32, 1, 1.5, 1, 0).dh(35, 10, 1.5, 1, 0).dv(32, 19, 1.5, 1, 0);
    b.item('stairs', 2, 0.5, 0, { size: [3, 8] })
      .item('toilet', 0.3, 14.2, 270).item('washbasin', 0.2, 10.2)
      .item('sofa3', 0.2, 18.5, 270).item('lowtable', 2.6, 19.6, 90).item('armchair', 4.5, 20).item('safe', 5.6, 22.6)
      .item('counter', 26, 3, 90, { size: [14, 1.2] }).item('cupboard', 31.1, 3.5, 90, { size: [12, 0.9] }).item('fridge', 30.6, 16)
      .item('sink', 27.4, 7, 90, { size: [2, 1.2] })
      .item('billiards', 10.5, 8).item('table_round', 18.5, 3.5).item('table_round', 18.5, 12.5)
      .item('stool', 17.6, 2.5).item('stool', 20.2, 2.5).item('stool', 17.6, 5.3).item('stool', 20.2, 5.3)
      .item('stool', 17.6, 11.5).item('stool', 20.2, 11.5).item('stool', 17.6, 14.3).item('stool', 20.2, 14.3)
      .item('speaker', 7.2, 0.2).item('speaker', 23.2, 0.2).item('piano_up', 12, 0.1)
      .item('kitchen', 38.7, 1, 90, { size: [4, 1.3] }).item('stove', 38.7, 5.2, 90).item('fridge', 33, 8.4).item('counter', 34.5, 4, 0, { size: [3, 1.2] })
      .item('barrel', 38.6, 10.3).item('barrel', 38.6, 11.7).item('barrel', 37.2, 10.3).item('crate', 32.3, 14.2).item('crate', 34.1, 14.2)
      .item('cabinet', 32.2, 12, 270, { size: [2, 0.8] })
      .item('office_desk', 35.5, 22.4).item('chair', 36.2, 21.3).item('safe', 38.6, 16.4).item('filing', 32.3, 16.2).item('sofa2', 33.4, 16.4, 0, { size: [3, 1.6] });
    [3.5, 5.2, 6.9, 8.6, 10.3, 12, 13.7, 15.4].forEach(y => b.item('stool', 24.8, y));
    [8, 11.5, 15, 18.5].forEach(x => b.item('booth', x, 20));
    return [b.f];
  }

  /* ---------- ライブハウス（地下1階） ---------- */
  // 受付からホールへ。北にステージ、後方に PA 卓とドリンクカウンター。楽屋・機材倉庫・事務所はバックヤード側

  function liveHouse() {
    const b = makeFloor('B1');
    b.room(N.stairs, 'hall', 0, 0, 7, 9)
      .room(T('受付', 'Reception', '접수'), 'hall', 0, 9, 7, 11)
      .room(N.toilet, 'wet', 0, 20, 7, 10)
      .room(T('ホール', 'Live floor', '홀'), 'public', 7, 0, 26, 30, { ly: 3 })
      .room(T('楽屋1', 'Green room 1', '대기실1'), 'living', 33, 0, 11, 8)
      .room(T('楽屋2', 'Green room 2', '대기실2'), 'living', 33, 8, 11, 7)
      .room(T('バックヤード', 'Backstage corridor', '백스테이지 통로'), 'hall', 33, 15, 3, 15, { hideLabel: true })
      .room(T('機材倉庫', 'Gear storage', '장비 창고'), 'storage', 36, 15, 8, 7)
      .room(N.office, 'office', 36, 22, 8, 8);
    b.dh(2.5, 9, 1.5, 1, 0).dv(7, 17.5, 1.5, 1, 0).dh(4, 20, 1.5, 1, 1)
      .dv(33, 2, 1.5, 1, 0).dh(34, 15, 1.5, -1, 0).dv(33, 28.2, 1.5, 1, 0)   // バックヤード → バーカウンターの内側
      .dv(36, 16.5, 1.5, 1, 0).dv(36, 23.5, 1.5, 1, 0);
    b.item('stairs', 2, 0.5, 0, { size: [3, 7] })
      .item('reception', 1.5, 11.5, 270, { size: [4, 1.4] }).item('chair', 0.3, 12.9, 270).item('locker', 6, 11, 90, { size: [5, 1] })
      .item('toilet', 0.3, 27.6, 270).item('toilet', 0.3, 25.2, 270).item('washbasin', 5.7, 25, 90)
      .wall(0, 24.6, 2.4, 24.6, 'thin').wall(0, 27, 2.4, 27, 'thin')
      .item('stage', 9, 0.2, 0, { size: [22, 8] }).item('drums', 18.4, 1).item('speaker', 9.3, 6.8).item('speaker', 29.5, 6.8)
      .item('speaker', 12, 0.5).item('speaker', 26.8, 0.5)
      .item('pillar', 12, 16).item('pillar', 27, 16)
      .item('mixer', 18.5, 25, 180).item('stool', 19.6, 26.8)
      .wall(17.5, 24, 23.5, 24, 'rail').wall(17.5, 24, 17.5, 28, 'rail').wall(23.5, 24, 23.5, 28, 'rail')
      .item('counter', 25.5, 26.4, 0, { size: [7, 1.2] }).item('fridge', 30.4, 28.6).item('cupboard', 26, 29.1, 180, { size: [4, 0.9] })
      .item('dresser', 35, 0.1).item('dresser', 37.2, 0.1).item('dresser', 39.4, 0.1).item('stool', 35.6, 1.2).item('stool', 37.8, 1.2).item('stool', 40, 1.2)
      .item('sofa3', 37.5, 6, 180).item('locker', 43, 2, 90, { size: [3, 1] })
      .item('dresser', 43.1, 9.5, 90).item('dresser', 43.1, 11.7, 90).item('sofa2', 36.5, 9, 0, { size: [3.2, 1.6] }).item('table', 37, 11.2, 0, { size: [2.4, 1.2] })
      .item('crate', 41.8, 15.3).item('crate', 41.8, 17.2).item('speaker', 38.5, 20.8).item('speaker', 40, 20.8).item('rack', 42.5, 19.8)
      .item('drums', 38, 15.2, 0, { size: [3, 2.6] })
      .item('office_desk', 40, 27.8, 180).item('chair', 40.7, 26.6).item('safe', 42.6, 22.3).item('filing', 38, 22.2).item('sofa2', 40.6, 22.3, 90, { size: [3, 1.6] });
    return [b.f];
  }

  /* ---------- 劇場（1F） ---------- */
  // 奥に舞台と上手・下手の袖、中央に客席、手前にホワイエ。下手側に楽屋と楽屋口、上手側に大道具倉庫と調整室

  function theatre() {
    const b = makeFloor('1F');
    b.room(T('舞台', 'Stage', '무대'), 'public', 10, 0, 44, 14)
      .room(T('下手袖', 'Stage left wing', '하수 측 무대'), 'hall', 0, 0, 10, 14)
      .room(T('上手袖', 'Stage right wing', '상수 측 무대'), 'hall', 54, 0, 10, 14)
      .room(T('客席', 'Auditorium', '객석'), 'public', 10, 14, 44, 28, { ly: 12.5 })
      .room(T('楽屋廊下', 'Backstage corridor', '분장실 복도'), 'hall', 7, 14, 3, 28, { hideLabel: true })
      .room(T('楽屋1', 'Dressing room 1', '분장실1'), 'living', 0, 14, 7, 7)
      .room(T('楽屋2', 'Dressing room 2', '분장실2'), 'living', 0, 21, 7, 7)
      .room(T('楽屋3', 'Dressing room 3', '분장실3'), 'living', 0, 28, 7, 7)
      .room(T('楽屋口', 'Stage door', '무대 출입구'), 'hall', 0, 35, 7, 7)
      .room(N.office, 'office', 0, 42, 10, 14)
      .room(T('ホワイエ', 'Foyer', '포이어'), 'public', 10, 42, 44, 14)
      .room(T('男子トイレ', 'Men\'s restroom', '남자 화장실'), 'wet', 54, 42, 10, 7)
      .room(T('女子トイレ', 'Women\'s restroom', '여자 화장실'), 'wet', 54, 49, 10, 7)
      .room(T('大道具倉庫', 'Scene dock', '대도구 창고'), 'storage', 54, 14, 10, 14)
      .room(T('調整室', 'Control booth', '조정실'), 'office', 54, 28, 10, 14)
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 18, 56, 28, 5, { hideLabel: true });
    b.dv(10, 1, 12, 1, 0, 'open').dv(54, 1, 12, 1, 0, 'open')
      .dh(16, 14, 32, 1, 0, 'open')
      .dh(7.5, 14, 1.5, -1, 0)
      .dv(7, 15, 1.5, -1, 0).dv(7, 22, 1.5, -1, 0).dv(7, 29, 1.5, -1, 0)
      .dv(7, 36.5, 1.5, 1, 0).dv(0, 38, 1.5, -1, 0).dh(8, 42, 1.5, 1, 0)
      .dv(10, 38, 1.5, -1, 0)
      .dh(14, 42, 3, 1, 0, 'door2').dh(47, 42, 3, 1, 0, 'door2')
      .dv(10, 50, 1.5, -1, 0)
      .dh(26, 56, 3, 1, 0, 'door2').dh(35, 56, 3, 1, 0, 'door2')
      .dv(54, 43, 1.5, 1, 0).dv(54, 50, 1.5, 1, 0)
      .dh(56, 14, 3, -1, 0, 'door2').dv(64, 18, 5, 1, 0, 'shutter')
      .dh(60, 28, 1.5, 1, 0)
      .dv(54, 40, 1.5, 1, 1)                   // 調整室（客席後方の通路から）
      .wv(54, 32, 4, 'window2')
      .wv(0, 45, 3).wv(0, 50, 3)
      .wh(14, 56, 4, 'window2').wh(20, 56, 4, 'window2').wh(41, 56, 4, 'window2').wh(47, 56, 4, 'window2').wh(56, 56, 2).wh(60, 56, 2);
    b.item('stage', 10, 0, 0, { size: [44, 14] }).item('curtain', 16, 13.2, 0, { size: [32, 0.3] })
      .item('crate', 1, 1).item('crate', 3, 1).item('rack', 0.3, 7).item('cabinet', 5, 0.1, 0, { size: [3, 1] })
      .item('crate', 61.4, 1).item('speaker', 55, 0.2).item('rack', 62.3, 6);
    const rows = [];
    for (let i = 0; i < 12; i++) rows.push(17 + i * 1.9);
    rows.forEach(y => b.item('seats', 12, y, 180, { size: [10, 1.2] }).item('seats', 24.5, y, 180, { size: [15, 1.2] }).item('seats', 42, y, 180, { size: [10, 1.2] }));
    [14, 21, 28].forEach(y => b.item('dresser', 0, y + 0.5, 270).item('dresser', 0, y + 2.7, 270).item('stool', 1.1, y + 1.1).item('stool', 1.1, y + 3.3)
      .item('wardrobe', 2.6, y + 5.8, 180, { size: [3, 1.1] }));
    b.item('desk', 0.2, 39.5, 270, { size: [2.4, 1.2] }).item('chair', 1.5, 40.2, 90).item('bench', 3, 35.2, 0, { size: [3.6, 1] })
      .item('office_desk', 1, 45).item('office_desk', 1, 49).item('safe', 8.6, 54.6).item('filing', 0.2, 54.6).item('copier', 5, 54.6)
      .item('reception', 11.5, 47, 90, { size: [6, 1.4] }).item('counter', 51.5, 47, 270, { size: [5, 1.2] })
      .item('pillar', 22, 48.5).item('pillar', 41, 48.5)
      .item('sofa3', 27.8, 46.5).item('sofa3', 32.8, 46.5).item('bench', 20, 53, 0, { size: [4, 1] }).item('bench', 40, 53, 0, { size: [4, 1] })
      .item('plant', 18.6, 42.4).item('plant', 44.2, 42.4).item('plant', 10.3, 54.5).item('plant', 52.5, 54.5)
      .item('toilet', 62.4, 42.3, 90).item('toilet', 62.4, 44.3, 90).item('toilet', 62.4, 46.3, 90).item('washbasin', 57, 47.8, 180)
      .item('toilet', 62.4, 49.3, 90).item('toilet', 62.4, 51.3, 90).item('toilet', 62.4, 53.3, 90).item('washbasin', 57, 54.8, 180)
      .item('crate', 55, 20).item('crate', 55, 22).item('crate', 57, 20).item('cabinet', 62.9, 24, 90, { size: [3.6, 1] }).item('rack', 59, 25.6)
      .item('mixer', 55, 31.5, 270).item('mixer', 55, 35, 270).item('chair', 56.8, 32.5, 90).item('chair', 56.8, 36, 90)
      .item('rack', 62.4, 30).item('rack', 62.4, 32.4).item('cabinet', 58, 40.9, 180, { size: [5, 1] });
    return [b.f];
  }

  /* ---------- 新しいカテゴリ用の小さな道具 ---------- */

  /* 建物のない所を庭などで埋める。重ならない長方形に分けて置き、名前は隠す（必要なら text で名前を置く） */
  /* 1つの階を「建物の中」と「外観」の2つの階に分ける。rects は建物の範囲（[x, y, w, h] の組）。
   * 建物の中の部屋・家具・文字は中の階へ、それ以外は外観へ。外観では建物を屋根として描き、
   * 外壁の上のドア・窓は両方の階に残す（屋内の階と同じ位置）。 */
  function splitBuilding(f, rects, mainName, outName, roofName) {
    const eps = 1e-6;
    const strict = (x, y) => rects.some(([rx, ry, rw, rh]) => x > rx + eps && x < rx + rw - eps && y > ry + eps && y < ry + rh - eps);
    const roomIn = r => rects.some(([rx, ry, rw, rh]) => r.x >= rx - eps && r.y >= ry - eps && r.x + r.w <= rx + rw + eps && r.y + r.h <= ry + rh + eps);
    const main = { name: mainName, rooms: [], walls: [], openings: [], items: [], texts: [] };
    const out = { name: outName, rooms: [], walls: [], openings: [], items: [], texts: [] };
    f.rooms.forEach(r => (roomIn(r) ? main : out).rooms.push(r));
    rects.forEach(([x, y, w, h], i) => out.rooms.push({ name: roofName, cat: 'roof', x, y, w, h, ...(i ? { hideLabel: true } : {}) }));
    f.items.forEach(it => (strict(it.x + it.w / 2, it.y + it.h / 2) ? main : out).items.push(it));
    f.texts.forEach(t => (strict(t.x, t.y) ? main : out).texts.push(t));
    f.walls.forEach(w => (strict((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2) ? main : out).walls.push(w));
    f.openings.forEach(o => {
      const mx = o.o === 'h' ? o.x + o.len / 2 : o.x, my = o.o === 'h' ? o.y : o.y + o.len / 2;
      const d = 0.1;
      const a = o.o === 'h' ? strict(mx, my - d) : strict(mx - d, my);
      const b = o.o === 'h' ? strict(mx, my + d) : strict(mx + d, my);
      if (a && b) main.openings.push(o);
      else if (a || b) { main.openings.push(o); out.openings.push({ ...o }); }
      else out.openings.push(o);
    });
    return [main, out];
  }

  function fillYard(b, x0, y0, x1, y1, name, cat, extra) {
    const used = new Set();
    b.f.rooms.forEach(r => { for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) used.add(`${x},${y}`); });
    const free = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1 && !used.has(`${x},${y}`);
    for (let y = y0; y < y1; y++) {
      let x = x0;
      while (x < x1) {
        if (!free(x, y)) { x++; continue; }
        let xe = x;
        while (xe < x1 && free(xe, y)) xe++;
        // 同じ幅で空いている行が続くかぎり下へ伸ばす
        const sameRow = yy => {
          for (let k = x; k < xe; k++) if (!free(k, yy)) return false;
          return !free(x - 1, yy) && !free(xe, yy);
        };
        let ye = y + 1;
        while (ye < y1 && sameRow(ye)) ye++;
        b.room(name, cat || 'garden', x, y, xe - x, ye - y, { hideLabel: true, ...(extra || {}) });
        for (let yy = y; yy < ye; yy++) for (let k = x; k < xe; k++) used.add(`${k},${yy}`);
        x = xe;
      }
    }
  }

  /* 丸テーブルと椅子4脚（椅子はテーブルの方を向く） */
  function roundTable(b, x, y) {
    b.item('table_round', x, y)
      .item('chair', x + 0.4, y - 1.05, 0).item('chair', x + 0.4, y + 1.85, 180)
      .item('chair', x - 1.05, y + 0.4, 270).item('chair', x + 1.85, y + 0.4, 90);
  }

  /* ---------- 1920年代：もぐり酒場（理髪店の奥） ---------- */

  function speakeasy() {
    const b = makeFloor('1F');
    b.room(T('ボイラー室', 'Boiler room', '보일러실'), 'garage', 0, 0, 14, 10)
      .room(T('奥の部屋', 'Back room', '안쪽 방'), 'office', 0, 10, 14, 8)
      .room(T('理髪店', 'Barbershop', '이발소'), 'public', 0, 18, 14, 12)
      .room(N.toilet, 'wet', 14, 0, 6, 8)
      .room(T('厨房', 'Kitchen', '주방'), 'kitchen', 20, 0, 10, 8)
      .room(T('事務所', 'Boss\'s office', '사무실'), 'office', 30, 0, 8, 8)
      .room(T('酒蔵', 'Liquor store', '술 창고'), 'storage', 38, 0, 6, 8)
      .room(T('もぐり酒場', 'Speakeasy', '무허가 술집'), 'public', 14, 8, 30, 22, { lx: 0.5, ly: 5 })
      .room(T('裏路地', 'Back alley', '뒷골목'), 'porch', 44, 0, 4, 30)
      .room(T('表通り', 'Street', '큰길'), 'porch', 0, 30, 48, 6);
    b.dh(4.5, 30, 2, -1, 1)                       // 理髪店の入口
      .dh(10.5, 18, 1.5, -1, 1)                   // 理髪店 → 奥の部屋
      .dh(2, 10, 1.5, -1, 0)                      // ボイラー室
      .dv(14, 13, 1.5, 1, 0, 'locked')            // 合言葉の扉（のぞき窓付き）
      .dh(15.5, 8, 1.5, -1, 0)                    // トイレ
      .dh(27, 8, 1.5, -1, 1)                      // 厨房（カウンターの内側から）
      .dh(34.5, 8, 1.5, -1, 1, 'locked')          // 事務所
      .dv(38, 5, 1.5, 1, 1)                       // 事務所 → 酒蔵
      .dv(44, 1, 1.5, 1, 0, 'locked')             // 酒蔵の搬入口（裏路地へ）
      .dv(44, 15, 1.5, 1, 1, 'secret')            // 手入れのときの逃げ道
      .wh(8, 30, 4.5, 'window2').wh(1, 30, 2.5, 'window2');
    b.text(T('合言葉の扉', 'Password door', '암호의 문'), 16.6, 12.2, { size: 0.36 });
    // 理髪店：鏡の前に理容椅子、反対側に待合のベンチ
    b.item('cabinet', 0, 19.5, 270, { size: [7, 0.8] })
      .item('barber_chair', 1.2, 20, 270).item('barber_chair', 1.2, 22.6, 270).item('barber_chair', 1.2, 25.2, 270)
      .item('bench', 12.9, 21, 90, { size: [4, 1] }).item('counter', 8, 28.6, 180, { size: [3, 1.2] }).item('plant', 12.6, 28.6);
    // 奥の部屋：見張りの机と在庫
    b.item('crate', 0.3, 10.3).item('crate', 0.3, 12).item('cabinet', 4.2, 10.1, 0, { size: [5, 0.9] })
      .item('barrel', 11, 10.4).item('barrel', 12.4, 10.4)
      .item('table', 5.5, 13.6, 0, { size: [2.4, 1.4] }).item('chair', 6.2, 15.2, 180);
    // ボイラー室
    b.item('tank', 1, 1).item('tank', 4, 1).item('barrel', 10, 1).item('barrel', 11.4, 1).item('crate', 11.6, 7.6);
    // トイレ
    b.item('toilet', 14.5, 0.15).item('toilet', 16.7, 0.15).wall(16.1, 0, 16.1, 2.2, 'thin')
      .item('washbasin', 18.9, 3, 90);
    // 厨房
    b.item('sink', 20.2, 0).item('stove', 22.4, 0).item('cupboard', 25.8, 0, 0, { size: [3.8, 0.9] })
      .item('table', 21.5, 3.6, 0, { size: [3.2, 1.6] }).item('barrel', 28.6, 4.4);
    // 事務所・酒蔵
    b.item('office_desk', 31, 1.2).item('chair', 31.7, 0.1).item('safe', 36.7, 0.1).item('gramophone', 34.4, 0.2)
      .item('sofa2', 30.2, 6.1, 180)
      .item('barrel', 38.3, 0.3).item('barrel', 39.7, 0.3).item('barrel', 41.1, 0.3).item('barrel', 38.3, 1.7).item('barrel', 39.7, 1.7)
      .item('crate', 42.2, 5.9).item('crate', 40.4, 5.9);
    // 酒場：奥にバーカウンター、左にボックス席、右奥にバンドの舞台
    b.item('cupboard', 19.5, 8.05, 0, { size: [7, 0.9] }).item('cupboard', 29, 8.05, 0, { size: [4.5, 0.9] })
      .item('counter', 19.5, 10.8, 0, { size: [14, 1.2] });
    [20.5, 22.1, 23.7, 25.3, 26.9, 28.5, 30.1, 31.7].forEach(x => b.item('stool', x, 12.3));
    [16, 20.5, 25].forEach(y => b.item('booth', 14.2, y, 90));
    roundTable(b, 20.5, 15.5);
    roundTable(b, 26.5, 15.5);
    roundTable(b, 32.5, 15.5);
    roundTable(b, 20.5, 23.5);
    b.item('rug', 25.5, 20.5, 0, { size: [8, 7] })
      .item('stage', 37, 19, 90, { size: [10, 7] }).item('piano_up', 42.6, 20.5, 90).item('drums', 38.2, 25.4)
      .item('plant', 42.6, 8.3);
    // 表通り：当時の車
    b.item('car', 28, 31, 90);
    b.f.rooms.find(r => r.name.ja === '裏路地').note = T('警察の手入れがあると、客は舞台脇の隠し扉から逃げる', 'During a raid, guests flee through the hidden door by the stage', '단속이 오면 손님들은 무대 옆 비밀문으로 달아난다');
    return [b.f];
  }

  /* ---------- 1920年代：探偵事務所のある雑居ビル（1F 店舗・2F 事務所と住まい） ---------- */

  function detectiveOffice() {
    const g = makeFloor('1F');
    g.room(T('厨房', 'Kitchen', '주방'), 'kitchen', 0, 0, 9, 6)
      .room(N.toilet, 'wet', 9, 0, 3, 6, { hideLabel: true })
      .room(T('ダイナー', 'Diner', '다이너'), 'public', 0, 6, 12, 18)
      .room(T('エントランス', 'Lobby', '입구 홀'), 'hall', 12, 0, 6, 24, { ly: 5 })
      .room(T('質屋の倉庫', 'Pawnshop stockroom', '전당포 창고'), 'storage', 18, 0, 12, 8)
      .room(T('質屋', 'Pawnshop', '전당포'), 'public', 18, 8, 12, 16)
      .room(T('通り', 'Street', '거리'), 'porch', 0, 24, 30, 8);
    g.dh(13.5, 24, 3, -1, 0, 'door2')              // ビルの入口
      .dh(4, 24, 2, -1, 0)                         // ダイナー
      .dh(5, 6, 1.5, -1, 0)                        // 厨房
      .dh(9.75, 6, 1.5, -1, 0)                     // トイレ
      .dh(24, 24, 1.5, -1, 1)                      // 質屋
      .dh(20, 8, 1.5, -1, 0, 'locked')             // 質屋の倉庫
      .wh(7, 24, 4, 'window2').wv(0, 10, 3, 'window2').wv(0, 16, 3, 'window2')
      .wh(19, 24, 4, 'window2').wh(26, 24, 3, 'window2');
    g.item('stove', 0.2, 0, 0, { size: [3, 1.3] }).item('kitchen', 3.4, 0).item('fridge', 0, 3.2, 270).item('table', 3, 2.8, 0, { size: [3, 1.4] })
      .item('counter', 0.3, 8.4, 0, { size: [7, 1.2] })
      .item('toilet', 10.6, 0.2).item('washbasin', 9.1, 0.1, 0, { size: [1, 0.8] });
    [0.8, 2.3, 3.8, 5.3, 6.8].forEach(x => g.item('stool', x, 9.9));
    [12, 15.5, 19].forEach(y => g.item('booth', 0.2, y, 90));
    roundTable(g, 7.5, 13);
    roundTable(g, 7.5, 18.5);
    g.item('stairs_u', 12.5, 0.5).item('cabinet', 17.1, 14, 90, { size: [3, 0.8] })
      .item('counter', 18.2, 13, 0, { size: [10, 1.2] }).item('safe', 28.6, 8.3).item('office_desk', 23, 9.4)
      .item('cabinet', 18.1, 15.5, 270, { size: [5, 0.8] }).item('cabinet', 29.1, 15.5, 90, { size: [5, 0.8] })
      .item('bookshelf', 22.4, 0.1, 0, { size: [5, 0.8] }).item('crate', 24, 2.6).item('crate', 25.8, 2.6).item('crate', 27.8, 0.3).item('crate', 27.8, 2.1)
      .item('idol', 18.6, 0.4, 0, { gm: true })
      .item('car', 2, 28, 90);

    const u = makeFloor('2F');
    u.room(T('暗室', 'Darkroom', '암실'), 'storage', 0, 0, 5, 4)
      .room(T('資料室', 'Records', '자료실'), 'storage', 5, 0, 7, 4)
      .room(T('所長室', 'Detective\'s office', '소장실'), 'office', 0, 4, 12, 10)
      .room(T('待合室', 'Waiting room', '대기실'), 'public', 0, 14, 12, 10)
      .room(N.corridor, 'hall', 12, 0, 6, 24, { ly: 5 })
      .room(T('台所', 'Kitchenette', '부엌'), 'kitchen', 18, 0, 6, 10)
      .room(T('物置', 'Closet', '창고'), 'storage', 24, 0, 6, 3, { hideLabel: true })
      .room(N.bath, 'wet', 24, 3, 6, 7)
      .room(T('探偵の部屋', 'Detective\'s flat', '탐정의 방'), 'living', 18, 10, 12, 14);
    u.dv(12, 18, 1.5, -1, 1)                       // 待合室（ドアのガラスに社名）
      .dh(8, 14, 1.5, -1, 1)                       // 所長室
      .dh(2, 4, 1.5, 1, 0)                         // 暗室
      .dh(9, 4, 1.5, 1, 1)                         // 資料室
      .dv(18, 12, 1.5, 1, 0, 'locked')             // 探偵の部屋
      .dh(20, 10, 1.5, -1, 0)                      // 台所
      .dh(26.5, 10, 1.5, -1, 1)                    // 浴室
      .dv(24, 0.75, 1.5, 1, 0)                     // 物置
      .wh(2, 24, 4).wh(7, 24, 3).wv(0, 17, 3).wv(0, 7, 3)
      .wh(13.5, 24, 3).wh(26, 24, 3).wv(30, 14, 3).wv(30, 5, 2);
    u.text(T('探偵社', 'Detective Agency', '탐정 사무소'), 15, 18.8, { size: 0.36 });
    u.item('sink', 0.2, 0.1).item('cabinet', 2.6, 0.1, 0, { size: [2.2, 0.8] })
      .item('filing', 5.3, 0.1).item('filing', 6.5, 0.1).item('filing', 7.7, 0.1).item('filing', 10.7, 0.1)
      .item('desk', 4, 6.5, 0, { size: [3, 1.6] }).item('chair', 5, 5.3).item('armchair', 3.2, 9.4, 180).item('armchair', 5.6, 9.4, 180)
      .item('bookshelf', 0.1, 5.4, 270).item('safe', 10.6, 4.3).item('cabinet', 0.1, 10.4, 270, { size: [2.4, 0.8] })
      .item('office_desk', 6.6, 15.2).item('chair', 7.3, 16.7, 180).item('filing', 10.8, 14.2)
      .item('bench', 0.2, 18.5, 270).item('plant', 0.3, 22.5)
      .item('stairs_u', 12.5, 0.5).item('plant', 16.6, 22.6)
      .item('stove', 18.2, 0, 0, { size: [2, 1.3] }).item('sink', 20.4, 0).item('cupboard', 23.1, 4, 90).item('fridge', 18, 7.5, 270)
      .item('table', 19, 4.4, 0, { size: [2.4, 1.4] })
      .item('crate', 28.2, 0.3).item('cabinet', 25.6, 0.1, 0, { size: [2, 0.8] })
      .item('bathtub', 26.8, 3.2, 90).item('toilet', 24.3, 3.1).item('washbasin', 24, 6.4, 270)
      .item('bed_single', 27.9, 19.9).item('nightstand', 26.9, 20).item('wardrobe', 21.6, 22.8, 180)
      .item('table', 21, 15.5, 0, { size: [2.8, 1.6] }).item('chair', 21.9, 14.4).item('chair', 21.9, 17.2, 180)
      .item('armchair', 18.8, 20.6, 270).item('gramophone', 28.4, 10.3);
    return [g.f, u.f];
  }

  /* ---------- SF：調査船（1デッキ。船尾に機関室、船首にブリッジ） ---------- */

  function spaceship() {
    const deck = T('第1甲板', 'Deck 1', '제1갑판');
    const b = makeFloor(deck);
    b.room(T('機関室', 'Engine room', '기관실'), 'tech', 0, 4, 10, 16, { ly: 4.5 })
      .room(T('乗員室A', 'Crew cabin A', '승무원실 A'), 'bedroom', 10, 2, 6, 8)
      .room(T('乗員室B', 'Crew cabin B', '승무원실 B'), 'bedroom', 16, 2, 6, 8)
      .room(T('乗員室C', 'Crew cabin C', '승무원실 C'), 'bedroom', 22, 2, 6, 8)
      .room(T('シャワー室', 'Showers', '샤워실'), 'wet', 28, 2, 5, 8)
      .room(T('艦長室', 'Captain\'s cabin', '함장실'), 'bedroom', 33, 2, 9, 8)
      .room(T('研究室', 'Science lab', '연구실'), 'medical', 42, 2, 8, 8)
      .room(T('通路', 'Corridor', '통로'), 'tech', 10, 10, 40, 4, { hideLabel: true })
      .room(T('ブリッジ', 'Bridge', '브리지'), 'tech', 50, 4, 10, 16, { ly: 5.5 })
      .room(T('貨物室', 'Cargo bay', '화물실'), 'garage', 10, 14, 12, 10)
      .room(T('エアロック', 'Airlock', '에어록'), 'danger', 22, 14, 5, 10)
      .room(T('医務室', 'Medbay', '의무실'), 'medical', 27, 14, 8, 8)
      .room(T('冷凍睡眠室', 'Cryo bay', '냉동 수면실'), 'special', 35, 14, 7, 8)
      .room(T('食堂', 'Mess hall', '식당'), 'kitchen', 42, 14, 8, 8);
    b.dv(10, 11, 2, 1, 0, 'auto')                  // 機関室
      .dh(12, 10, 2, -1, 0, 'auto').dh(18, 10, 2, -1, 0, 'auto').dh(24, 10, 2, -1, 0, 'auto')
      .dh(29.5, 10, 2, -1, 0, 'auto').dh(36.5, 10, 2, -1, 0, 'auto').dh(45, 10, 2, -1, 0, 'auto')
      .dv(50, 11, 2, 1, 0, 'auto')                  // ブリッジ
      .dh(14, 14, 3, 1, 0, 'auto')                  // 貨物室
      .dh(23.5, 14, 2, 1, 0, 'auto')                // エアロック（内扉）
      .dh(23.5, 24, 2, -1, 0, 'locked')             // エアロック（外扉）
      .dh(13, 24, 6, -1, 0, 'shutter')              // 貨物ハッチ
      .dh(30, 14, 2, 1, 0, 'auto').dh(37.5, 14, 2, 1, 0, 'auto').dh(45, 14, 2, 1, 0, 'auto')
      .wv(60, 6, 4, 'window2').wv(60, 14, 4, 'window2').wh(52, 4, 3).wh(52, 20, 3)
      .wh(36, 2, 3).wh(44.5, 22, 4, 'window2');
    b.item('reactor', 2.5, 9.5).item('console', 3.2, 4.1).item('console', 3.2, 18.5, 180)
      .item('rack', 0.2, 4.4).item('tank', 0.3, 17.3).item('hatch', 7.6, 17.6);
    [10, 16, 22].forEach(x => b.item('bed_single', x + 1.8, 2.1, 90).item('locker', x + 0.1, 2.1, 270, { size: [2, 0.8] })
      .item('desk', x + 0.1, 6, 270).item('chair', x + 1.4, 6.7, 90));
    b.item('shower', 28.2, 2.2).item('shower', 31, 2.2).item('toilet', 28.3, 6.2, 270).item('washbasin', 31.8, 6, 90)
      .item('bed_double', 37.8, 2.2, 90).item('desk', 33.2, 2.2).item('chair', 34, 3.5, 180).item('safe', 33.2, 8.6).item('cabinet', 39, 9, 180, { size: [2.8, 0.9] })
      .item('lab_bench', 42.1, 2.1).item('tank', 47.4, 2.3).item('console', 42.1, 5, 270).item('cage', 47, 6.7)
      .item('pilot_seat', 56.3, 7.2, 270).item('pilot_seat', 56.3, 15, 270).item('console', 58.5, 6.2, 90).item('console', 58.5, 13.8, 90)
      .item('holo_table', 51.8, 10.3).item('console', 51, 4.1).item('console', 51, 18.5, 180)
      .item('hatch', 40, 11)
      .item('crate', 10.3, 14.3).item('crate', 10.3, 16.1).item('crate', 12.1, 14.3).item('crate', 19.8, 14.4).item('crate', 19.8, 16.2)
      .item('car', 12.5, 18.5, 90)
      .item('locker', 26.1, 16, 90, { size: [3, 0.8] }).item('locker', 22.1, 16, 270, { size: [3, 0.8] }).item('danger', 24, 20.5)
      .item('exam_bed', 27.4, 15.2).item('iv_stand', 29.1, 15.4).item('med_cabinet', 31.6, 21, 180, { size: [3, 1] }).item('console', 33.6, 15.2, 90, { size: [3, 1.2] })
      .item('console', 35.3, 14.1, 0, { size: [2, 1] })
      .item('cryopod', 35.3, 17.7).item('cryopod', 37.6, 17.7).item('cryopod', 39.9, 17.7)
      .item('dining6', 43.8, 16.8).item('kitchen', 48.7, 15.5, 90).item('fridge', 42.1, 14.1);
    b.f.rooms.find(r => r.name.ja === '研究室').note = T('回収した標本が培養槽の中で動いている', 'The recovered specimen is moving in its tank', '회수한 표본이 배양조 안에서 움직인다');
    b.f.rooms.find(r => r.name.ja === '冷凍睡眠室').note = T('カプセルは4つあったはずだが、3つしかない', 'There should be four pods. There are three.', '캡슐은 4개였을 텐데 3개뿐이다');
    return [b.f];
  }

  /* ---------- SF：月面研究基地（中央ハブから4方向にモジュール） ---------- */

  function researchStation() {
    const b = makeFloor(T('基地', 'Base', '기지'));
    b.room(T('個室1', 'Quarters 1', '개인실1'), 'bedroom', 16, 0, 5, 6)
      .room(T('個室2', 'Quarters 2', '개인실2'), 'bedroom', 21, 0, 5, 6)
      .room(T('シャワー・トイレ', 'Shower & WC', '샤워·화장실'), 'wet', 26, 0, 4, 6, { hideLabel: true })
      .room(T('個室3', 'Quarters 3', '개인실3'), 'bedroom', 30, 0, 5, 6)
      .room(T('個室4', 'Quarters 4', '개인실4'), 'bedroom', 35, 0, 5, 6)
      .room(T('居住区通路', 'Habitat corridor', '거주구 통로'), 'tech', 16, 6, 24, 4, { hideLabel: true })
      .room(T('北通路', 'North tube', '북쪽 통로'), 'tech', 26, 10, 4, 8, { hideLabel: true })
      .room(T('中央ハブ', 'Central hub', '중앙 허브'), 'public', 22, 18, 12, 12, { ly: 4 })
      .room(T('西通路', 'West tube', '서쪽 통로'), 'tech', 12, 20, 10, 4, { hideLabel: true })
      .room(T('研究室', 'Laboratory', '연구실'), 'medical', 0, 14, 12, 12, { ly: 3 })
      .room(T('標本庫', 'Specimen store', '표본 보관실'), 'storage', 0, 26, 6, 8)
      .room(T('封鎖ラボ', 'Sealed lab', '봉쇄 실험실'), 'danger', 6, 26, 6, 8, { gm: true, plName: '', note: T('隊員たちが持ち帰った「何か」', 'Whatever the crew brought back', '대원들이 가져온 "무언가"') })
      .room(T('東通路', 'East tube', '동쪽 통로'), 'tech', 34, 22, 8, 4, { hideLabel: true })
      .room(T('通信室', 'Comms room', '통신실'), 'office', 42, 14, 14, 8)
      .room(T('発電室', 'Power plant', '발전실'), 'tech', 42, 22, 14, 12, { lx: -3.5 })
      .room(T('南通路', 'South tube', '남쪽 통로'), 'tech', 26, 30, 4, 6, { hideLabel: true })
      .room(T('ガレージ', 'Rover garage', '로버 차고'), 'garage', 16, 36, 16, 12)
      .room(T('エアロック', 'Airlock', '에어록'), 'danger', 32, 36, 8, 6)
      .room(T('装備室', 'Suit room', '장비실'), 'storage', 32, 42, 8, 6);
    b.dh(18.5, 6, 2, -1, 0, 'auto').dh(23.5, 6, 2, -1, 0, 'auto').dh(27, 6, 2, -1, 0, 'auto').dh(32.5, 6, 2, -1, 0, 'auto').dh(37.5, 6, 2, -1, 0, 'auto')
      .dh(27, 10, 2, 1, 0, 'auto').dh(27, 18, 2, 1, 0, 'auto')
      .dv(22, 21, 2, -1, 0, 'auto').dv(12, 21, 2, -1, 0, 'auto')
      .dh(2, 26, 2, 1, 0, 'auto').dh(8.5, 26, 2, 1, 0, 'locked').dv(6, 31, 1.5, 1, 1, 'secret')
      .dv(34, 23, 2, 1, 0, 'auto').dv(42, 23, 2, 1, 0, 'auto').dh(44, 22, 2, -1, 0, 'auto')
      .dh(27, 30, 2, 1, 0, 'auto').dh(27, 36, 2, 1, 0, 'auto')
      .dv(32, 38, 2, 1, 0, 'auto').dv(40, 38, 2, 1, 0, 'locked').dv(32, 44, 2, 1, 0, 'auto')
      .dh(19, 48, 8, -1, 0, 'shutter')
      .wh(17.5, 0, 2).wh(22.5, 0, 2).wh(31.5, 0, 2).wh(36.5, 0, 2).wv(0, 17, 3, 'window2').wh(46, 14, 4, 'window2');
    [16, 21, 30, 35].forEach(x => b.item('bed_single', x + 0.5, 0.2, 90).item('desk', x + 0.2, 3.5, 270).item('locker', x + 4.1, 2.6, 90, { size: [2, 0.8] }));
    b.item('shower', 26.1, 0.1).item('toilet', 28.8, 0.2).item('washbasin', 26.1, 3.4, 270)
      .item('holo_table', 26.3, 22.3).item('sofa3', 22.2, 25.5, 270).item('dining4', 30.5, 18.6)
      .item('plant', 22.3, 18.3).item('plant', 32.6, 28.6).item('vending', 30.4, 28.5, 180, { size: [2, 1.4] })
      .item('lab_bench', 0.2, 14.2).item('lab_bench', 4.4, 14.2).item('tank', 9.4, 14.3).item('console', 0.1, 18, 270)
      .item('lab_bench', 4, 19.5, 0, { size: [4, 1.6] }).item('cryopod', 8, 21.5, 0, { size: [1.8, 3.6] })
      .item('rack', 0.2, 28.5).item('rack', 0.2, 31).item('tank', 2.6, 31.2)
      .item('tank', 7.8, 31.6, 0, { size: [2, 2], gm: true }).item('tank', 9.9, 31.6, 0, { size: [1.9, 1.9], gm: true }).item('blood', 8.6, 28, 0, { gm: true }).item('cage', 6.2, 27.2, 0, { size: [2.2, 2.2], gm: true })
      .item('console', 43, 14.1).item('console', 47, 14.1).item('console', 51, 14.1)
      .item('chair', 44.3, 15.7).item('chair', 48.3, 15.7).item('chair', 52.3, 15.7).item('rack', 54.5, 19.9)
      .item('reactor', 48, 26).item('tank', 42.4, 31.4).item('tank', 44.9, 31.4).item('console', 54.5, 23, 90)
      .item('car', 18, 38).item('car', 23.5, 38).item('rack', 16.2, 36.2).item('crate', 29.4, 40.5).item('crate', 29.4, 42.2)
      .item('danger', 38.4, 40.4).item('bench', 33, 40.8, 180, { size: [3, 0.8] })
      .item('locker', 34, 46.9, 180, { size: [5, 1] }).item('rack', 38.4, 42.3);
    return [b.f];
  }

  /* ---------- 村：古民家（土間と田の字型の母屋、蔵・納屋・井戸・畑） ---------- */

  function farmhouse() {
    const b = makeFloor('1F');
    b.room(T('土間', 'Doma (earthen floor)', '흙바닥(도마)'), 'doma', 4, 8, 10, 16)
      .room(T('風呂場', 'Bath', '목욕간'), 'wet', 4, 4, 5, 4)
      .room(T('台所', 'Kitchen', '부엌'), 'kitchen', 14, 8, 9, 8)
      .room(T('囲炉裏の間', 'Hearth room', '이로리 방'), 'living', 14, 16, 9, 8, { ly: 2.6 })
      .room(T('仏間', 'Altar room', '불간'), 'washitsu', 23, 8, 10, 8)
      .room(T('座敷', 'Zashiki (guest room)', '객실(자시키)'), 'washitsu', 23, 16, 8, 8)
      .room(T('納戸', 'Nando (bedroom)', '안방(난도)'), 'washitsu', 33, 8, 5, 8)
      .room(T('次の間', 'Anteroom', '옆방'), 'washitsu', 31, 16, 7, 8)
      .room(T('縁側', 'Engawa', '툇마루'), 'hall', 14, 24, 24, 2)
      .room(T('厠', 'Outhouse', '뒷간'), 'wet', 38, 22, 3, 4, { hideLabel: true })
      .room(T('座敷牢', 'Hidden cell', '숨겨진 감옥'), 'danger', 40, 4, 7, 4, { gm: true, plName: '', note: T('蔵の奥の座敷牢。誰かが今も暮らしている形跡がある', 'A cell hidden in the storehouse. Someone still lives here', '곳간 안쪽의 감옥. 아직 누군가 사는 흔적이 있다') })
      .room(T('蔵', 'Kura (storehouse)', '곳간(쿠라)'), 'storage', 40, 8, 7, 6)
      .room(T('納屋', 'Barn', '헛간'), 'garage', 41, 18, 7, 10)
      .room(T('畑', 'Vegetable field', '밭'), 'field', 0, 32, 24, 8)
      .room(T('田んぼ', 'Rice paddy', '논'), 'field', 24, 32, 24, 8);
    fillYard(b, 0, 0, 48, 32, T('庭', 'Yard', '마당'));
    b.dh(7, 24, 4, 1, 0, 'sliding2')                // 大戸（土間の入口）
      .dv(4, 19, 1.5, -1, 0, 'sliding')            // 勝手口
      .dh(5.5, 8, 1.5, -1, 0, 'sliding')           // 風呂場
      .dv(14, 10, 4, 1, 0, 'open')                 // 土間 ↔ 台所
      .dv(14, 17, 6, 1, 0, 'open')                 // 上がり框（土間 ↔ 囲炉裏の間）
      .dh(16, 16, 3, 1, 0, 'sliding2')             // 台所 ↔ 囲炉裏の間（板戸）
      .dv(23, 10.5, 3, 1, 0, 'sliding2')           // 台所 ↔ 仏間
      .dv(23, 18.5, 3, 1, 0, 'sliding2')           // 囲炉裏の間 ↔ 座敷（ふすま）
      .dv(31, 18.5, 3, 1, 0, 'sliding2')           // 座敷 ↔ 次の間
      .dv(33, 10.5, 3, 1, 0, 'sliding2')           // 仏間 ↔ 納戸
      .dh(33.5, 16, 3, -1, 0, 'sliding2')          // 次の間 ↔ 納戸
      .dh(16, 24, 4, 1, 0, 'sliding2').dh(24, 24, 6, 1, 0, 'sliding2').dh(32, 24, 5, 1, 0, 'sliding2')   // 障子
      .wh(15, 26, 6, 'window2').wh(22, 26, 6, 'window2').dh(29.5, 26, 6, 1, 0, 'sliding2')   // 縁側のガラス戸
      .dv(38, 24.25, 1.5, 1, 0)                    // 厠
      .dh(42.5, 14, 2, 1, 0, 'locked')             // 蔵の扉
      .dh(42, 8, 2, 1, 0, 'locked')                // 座敷牢（蔵の側へ開く）
      .dh(43, 18, 4, -1, 0, 'sliding2')            // 納屋
      .wh(25, 8, 4).wh(16, 8, 3).wv(4, 13, 2).wv(38, 10, 2);
    b.item('kamado', 4.1, 9.5, 270).item('sink', 4.1, 13.5, 270).item('barrel', 7.6, 8.3).item('barrel', 8.9, 8.3).item('crate', 11.6, 8.3)
      .item('log', 11.2, 22.8, 0, { size: [2.6, 0.8] })
      .item('bathtub', 5.8, 4.2, 90)
      .item('cupboard', 14.2, 8.1, 0, { size: [4, 0.9] }).item('table_round', 19.6, 9.4)
      .item('irori', 17, 18.5)
      .item('butsudan', 26.5, 8.05).item('cabinet', 30, 8.1, 0, { size: [2.6, 0.9] })
      .item('tokonoma', 25, 16.1).item('lowtable', 25.9, 21.2)
      .item('lowtable', 33.5, 21.2).item('cabinet', 36.9, 17.6, 90, { size: [2.6, 0.9] })
      .item('futon', 35.8, 8.3).item('wardrobe', 36.7, 12.5, 90)
      .item('toilet', 39.3, 22.3, 90)
      .item('crate', 44.9, 8.3).item('crate', 44.9, 10.1).item('crate', 40.2, 10).item('cabinet', 40.2, 13, 180, { size: [2, 0.8] })
      .item('futon', 40.3, 4.2, 90, { gm: true }).item('candle', 45.5, 4.6, 0, { gm: true })
      .item('log', 47.1, 21, 90, { size: [4, 0.8] }).item('log', 46.2, 21, 90, { size: [4, 0.8] }).item('crate', 41.2, 18.3).item('crate', 46.2, 26.2)
      .item('barrel', 41.3, 26.6).item('barrel', 42.6, 26.6)
      .item('well', 1.4, 27).item('tree', 0.5, 0.5).item('tree', 12, 0.5).item('tree', 34, 0.5, 0, { size: [4, 4] }).item('bush', 15, 28.5).item('bush', 33, 28.6)
      .item('tree', 44.5, 28.6).item('lantern', 21.3, 28.4);
    b.text(T('庭', 'Yard', '마당'), 26, 29.6, { size: 0.8, bold: true });
    return [b.f];
  }

  /* ---------- 村：山あいの神社（参道・拝殿・本殿・社務所・禁足地） ---------- */

  function shrine() {
    const b = makeFloor('1F');
    b.room(T('本殿', 'Honden (sanctuary)', '본전'), 'special', 17, 2, 10, 7)
      .room(T('幣殿', 'Offering hall', '폐전'), 'special', 19, 9, 6, 4, { hideLabel: true })
      .room(T('拝殿', 'Haiden (worship hall)', '배전'), 'special', 14, 13, 16, 9)
      .room(T('参道', 'Approach', '참배길'), 'porch', 19, 22, 6, 26, { ly: 4 })
      .room(T('宝物殿', 'Treasure house', '보물전'), 'storage', 2, 10, 8, 8)
      .room(T('神楽殿', 'Kagura stage', '가구라전'), 'balcony', 2, 24, 10, 8)
      .room(T('玄関', 'Entrance', '현관'), 'doma', 32, 24, 4, 4, { hideLabel: true })
      .room(T('事務室', 'Office', '사무실'), 'office', 36, 24, 8, 4)
      .room(T('授与所', 'Amulet counter', '수여소'), 'office', 32, 28, 6, 5)
      .room(T('居間', 'Living room', '거실'), 'washitsu', 38, 28, 6, 6)
      .room(T('台所', 'Kitchen', '부엌'), 'kitchen', 32, 33, 6, 5)
      .room(N.toilet, 'wet', 38, 34, 3, 4, { hideLabel: true })
      .room(N.bath, 'wet', 41, 34, 3, 4, { hideLabel: true })
      .room(T('禁足地', 'Forbidden grove', '금족지'), 'garden', 31, 0, 13, 11, { gm: true, plName: '', note: T('森の奥の祠。夜ごと、誰かが供物を食べていく', 'A tiny shrine deep in the grove. Every night, something eats the offerings', '숲 속의 사당. 밤마다 무언가가 공물을 먹고 간다') });
    fillYard(b, 0, 0, 44, 48, T('境内', 'Shrine grounds', '경내'));
    b.dh(19, 22, 6, 1, 0, 'sliding2')              // 拝殿の正面
      .dh(20.5, 13, 3, -1, 0, 'sliding2')          // 拝殿 ↔ 幣殿
      .dh(20.5, 9, 3, -1, 0, 'locked')             // 本殿（ふだんは閉じている）
      .dv(14, 17, 1.5, -1, 0, 'sliding')           // 拝殿の脇
      .dh(5, 18, 2, 1, 0, 'locked')                // 宝物殿
            .dv(32, 25.25, 1.5, -1, 0, 'sliding')        // 社務所の玄関
      .dv(36, 25.25, 1.5, 1, 0, 'sliding')         // 事務室
      .dh(34.25, 28, 1.5, 1, 1, 'sliding')         // 授与所
      .dv(38, 29.5, 3, 1, 0, 'sliding2')           // 居間
      .dh(33.5, 33, 3, 1, 0, 'sliding2')           // 台所
      .dh(38.75, 34, 1.5, 1, 0, 'sliding').dh(41.75, 34, 1.5, 1, 0, 'sliding')
      .wv(32, 29, 3, 'window2').wv(44, 35, 2).wv(44, 30, 3).wh(38, 24, 3);
    // 禁足地は柵で囲い、小さな鳥居の切れ目から入る
    b.wall(31, 11, 34, 11, 'fence').wall(37, 11, 44, 11, 'fence').wall(31, 0, 31, 11, 'fence');
    b.item('altar', 20, 2.3, 0, { size: [4, 1.4] }).item('idol', 21.5, 4.5, 0, { gm: true }).item('candle', 18.2, 2.6).item('candle', 25, 2.6)
      .item('candle', 16, 13.6).item('candle', 27.2, 13.6).item('lantern', 14.4, 20.4).item('lantern', 28.4, 20.4)
      .item('saisen', 20.8, 22.4)
      .item('torii', 18, 44.2).item('torii', 34.5, 10.4, 0, { size: [3, 1.2] })
      .item('komainu', 17.2, 25).item('komainu', 25.4, 25)
      .item('lantern', 17.6, 30).item('lantern', 25.2, 30).item('lantern', 17.6, 37).item('lantern', 25.2, 37)
      .item('temizuya', 26.5, 32)
      .item('tree', 2, 2, 0, { size: [4, 4] }).item('tree', 9, 3).item('tree', 0.5, 37).item('tree', 5, 40).item('tree', 12, 42)
      .item('tree', 28, 42).item('tree', 37, 42, 0, { size: [4, 4] }).item('tree', 13, 4, 0, { size: [3.6, 3.6] })
      .item('tree', 32, 13.5, 0, { size: [5, 5] })
      .item('crate', 2.3, 10.3).item('crate', 4.1, 10.3).item('cabinet', 6.8, 10.1, 0, { size: [3, 0.9] }).item('cabinet', 9.1, 12, 90, { size: [3, 0.9] })
      .item('lantern', 2.3, 24.4).item('lantern', 10.5, 24.4)
      .item('office_desk', 39, 24.2).item('chair', 39.7, 25.7, 180).item('filing', 42.8, 24.2)
      .item('counter', 32.2, 28.5, 270, { size: [3.5, 1.2] }).item('chair', 33.8, 29.8, 90)
      .item('lowtable', 40, 30.4).item('butsudan', 42.8, 28.2, 90)
      .item('stove', 32.2, 36.6, 180).item('sink', 34.4, 36.6, 180).item('fridge', 36.5, 33.2)
      .item('toilet', 39, 36.3, 180).item('bathtub', 41.2, 34.9, 0, { size: [1.6, 2.6] })
      .item('hokora', 37, 3, 0, { gm: true }).item('rock', 33, 2, 0, { gm: true }).item('rock', 40.5, 6.5, 0, { size: [2, 1.6], gm: true }).item('tree', 32, 6, 0, { gm: true });
    b.text(T('御神木', 'Sacred tree', '신목'), 34.5, 19.3, { size: 0.55 });
    return [b.f];
  }

  /* ---------- 自然：洞窟（入口から大空洞、地底湖・祭壇・獣の巣へ） ---------- */

  function cave() {
    const b = makeFloor('1F');
    b.room(T('地底湖', 'Underground lake', '지하 호수'), 'water', 0, 0, 8, 9)
      .room(T('ほとり', 'Shore', '호숫가'), 'cave', 8, 0, 4, 12, { hideLabel: true })
      .room(T('地底湖のほとり', 'Lakeshore', '지하 호숫가'), 'cave', 0, 9, 8, 3)
      .room(T('大空洞', 'Great cavern', '대공동'), 'cave', 12, 8, 22, 12)
      .room(T('東の横穴', 'East tunnel', '동쪽 굴'), 'cave', 34, 13, 4, 3, { hideLabel: true })
      .room(T('祭壇の間', 'Altar chamber', '제단의 방'), 'cave', 38, 4, 10, 12, { ly: 4 })
      .room(T('細い通路', 'Narrow passage', '좁은 통로'), 'cave', 21, 20, 4, 8, { hideLabel: true })
      .room(T('裂け目', 'Crevice', '틈'), 'cave', 30, 20, 4, 4, { hideLabel: true })
      .room(T('獣の巣', 'Beast den', '짐승 굴'), 'cave', 34, 22, 10, 8)
      .room(T('洞窟の入口', 'Cave mouth', '동굴 입구'), 'cave', 18, 28, 10, 6)
      .room(T('森', 'Forest', '숲'), 'garden', 10, 34, 26, 6);
    b.item('boat', 9.2, 1).item('rock', 0.4, 9.4, 0, { size: [1.8, 1.4] }).item('rock', 6.5, 10.3, 0, { size: [1.3, 1] })
      .item('rock', 12.6, 8.6, 0, { size: [2, 1.6] }).item('rock', 30.6, 8.8).item('rock', 13, 16.6).item('rock', 31, 17, 0, { size: [2.6, 2] })
      .item('rock', 19, 9.2, 0, { size: [1.2, 1] }).item('rock', 27, 18.6, 0, { size: [1.2, 1] })
      .item('pit', 25.5, 9).item('campfire', 17, 13.2).item('log', 16.4, 15.2, 0, { size: [2.8, 0.7] }).item('bones', 27.4, 14.2)
      .item('crate', 29, 11.5)
      .item('rock', 34.6, 13.2, 0, { size: [1.2, 1] })
      .item('altar', 41.5, 4.3).item('candle', 40.2, 4.4).item('candle', 45, 4.4)
      .item('magic_circle', 40.5, 8.4, 0, { gm: true }).item('idol', 42.5, 5.95, 0, { gm: true }).item('bones', 46.2, 13.6)
      .item('bones', 36, 27.6).item('bones', 41.6, 22.8).item('blood', 40.4, 23.2).item('rock', 42, 27.4, 0, { size: [1.8, 2.2] }).item('footprints', 34.8, 22.4, 270)
      .item('rock', 18.4, 28.5, 0, { size: [2, 1.6] }).item('rock', 26.2, 29, 0, { size: [1.6, 1.4] }).item('footprints', 22.4, 29.5)
      .item('tree', 10.3, 34.4).item('tree', 10.6, 37.4, 0, { size: [2.6, 2.6] }).item('tree', 33, 34.4).item('tree', 32.6, 37.4, 0, { size: [2.6, 2.6] }).item('bush', 16, 38.2).item('bush', 28.4, 38.2)
      .item('tent', 13.8, 34.6, 0, { size: [3.4, 3.4] }).item('campfire', 18.4, 36.4, 0, { size: [1.2, 1.2] });
    b.text(T('縦穴（下へ）', 'Shaft (down)', '수직굴(아래로)'), 26.7, 11.9, { size: 0.45 });
    return [b.f];
  }

  /* ---------- 自然：川沿いのキャンプ場（テントサイト・バンガロー・炊事場・管理棟） ---------- */

  function campsite() {
    const b = makeFloor('1F');
    b.room(T('川', 'River', '강'), 'water', 0, 0, 60, 5)
      .room(T('河原', 'Riverbank', '강가'), 'porch', 0, 5, 60, 3, { lx: -18 })
      .room(T('遊歩道', 'Footpath', '산책로'), 'porch', 36, 8, 3, 32, { hideLabel: true })
      .room(T('炊事場', 'Cooking shelter', '취사장'), 'porch', 22, 30, 10, 6, { ly: 1 })
      .room(T('受付・売店', 'Office & shop', '접수·매점'), 'public', 40, 30, 8, 10)
      .room(T('シャワー室', 'Showers', '샤워실'), 'wet', 48, 30, 8, 5)
      .room(N.toilet, 'wet', 48, 35, 8, 5)
      .room(T('古い防空壕', 'Old air-raid shelter', '오래된 방공호'), 'cave', 52, 10, 8, 8, { gm: true, plName: '', note: T('奥に、戦時中に封じられた扉がある', 'At the back, a door sealed during the war', '안쪽에 전쟁 중에 봉인된 문이 있다') })
      .room(T('駐車場', 'Parking', '주차장'), 'porch', 30, 40, 30, 6);
    ['A', 'B', 'C'].forEach((n, i) => {
      const x = 2 + i * 7;
      b.room(T(`バンガロー${n}`, `Cabin ${n}`, `방갈로${n}`), 'living', x, 30, 6, 6, { ly: 2 })
        .room(T('デッキ', 'Deck', '데크'), 'balcony', x, 36, 6, 2, { hideLabel: true });
      b.dh(x + 2.25, 36, 1.5, 1, 0).wh(x + 2, 30, 2).wv(x, 32.5, 2).wv(x + 6, 32.5, 2);
      b.item('bed_single', x + 0.1, 30.2).item('bed_single', x + 3.9, 30.2).item('lantern', x + 2.55, 30.2, 0, { size: [0.9, 0.9] });
    });
    fillYard(b, 0, 8, 60, 46, T('キャンプ場', 'Campground', '캠핑장'));
    b.dh(42.5, 40, 2, 1, 0)                        // 受付（駐車場側）
      .dh(43, 30, 2, -1, 0)                        // 受付（キャンプ場側）
      .dh(51, 30, 1.5, -1, 0)                      // シャワー室
      .dh(51, 40, 1.5, 1, 0)                       // トイレ
      .wv(40, 33, 3, 'window2').wh(45.5, 40, 2).wv(56, 31, 2).wv(56, 36, 2);
    // 防空壕の入口：崖（岩壁）に開いた穴
    b.wall(52, 10, 60, 10, 'rock').wall(52, 10, 52, 13, 'rock').wall(52, 15.5, 52, 18, 'rock').wall(52, 18, 60, 18, 'rock');
    [2, 10, 18, 26].forEach(x => {
      b.item('tent', x, 10).item('picnic', x + 4.2, 10.4).item('campfire', x + 1.2, 14.8);
      b.item('tent', x, 20).item('picnic', x + 4.2, 20.4).item('campfire', x + 1.2, 24.8);
    });
    b.item('sink', 22.5, 30.2).item('sink', 24.7, 30.2).item('sink', 26.9, 30.2).item('kamado', 29.1, 30.2, 0, { size: [2.6, 1.3] })
      .item('counter', 23, 34.6, 180, { size: [6, 1.2] })
      .item('pillar', 22, 30, 0, { size: [0.4, 0.4] }).item('pillar', 31.6, 30, 0, { size: [0.4, 0.4] }).item('pillar', 22, 35.6, 0, { size: [0.4, 0.4] }).item('pillar', 31.6, 35.6, 0, { size: [0.4, 0.4] })
      .item('campfire', 44, 16, 0, { size: [3, 3] })
      .item('log', 43.8, 13.6, 0, { size: [3.4, 0.8] }).item('log', 43.8, 19.6, 0, { size: [3.4, 0.8] })
      .item('log', 41.6, 15.8, 90, { size: [3.4, 0.8] }).item('log', 47.6, 15.8, 90, { size: [3.4, 0.8] })
      .item('reception', 41, 33.6, 0, { size: [5, 1.2] }).item('cupboard', 40.1, 36.4, 270, { size: [3, 0.9] }).item('vending', 45.8, 38.4, 180, { size: [2, 1.4] })
      .item('cupboard', 44.8, 30.1, 0, { size: [3, 0.9] })
      .item('shower', 48.2, 31.5).item('shower', 53.8, 31.5).item('bench', 50.6, 33.9, 180, { size: [2.6, 0.8] })
      .item('toilet', 48.3, 35.2).item('toilet', 49.8, 35.2).item('toilet', 53.5, 35.2).item('washbasin', 53.6, 38.8, 180)
      .item('car', 31, 41, 90).item('car', 51, 42, 90)
      .item('tree', 0, 16.6, 0, { size: [2.4, 2.4] }).item('tree', 49, 8.6).item('tree', 56.6, 20, 0, { size: [3.4, 3.4] }).item('tree', 52, 22).item('tree', 56.5, 25.6)
      .item('tree', 0.2, 26.4).item('bush', 34.2, 27).item('bush', 39.6, 26).item('tree', 49.6, 26.2, 0, { size: [2.4, 2.4] })
      .item('rock', 55.5, 10.5, 0, { gm: true }).item('crate', 57.4, 15.6, 0, { gm: true }).item('bones', 56, 14, 0, { gm: true })
      .item('boat', 8, 1.2, 90, { size: [1.6, 4] });
    b.text(T('テントサイト', 'Tent sites', '텐트 사이트'), 17, 18.4, { size: 0.8, bold: true })
      .text(T('キャンプファイヤー場', 'Campfire circle', '캠프파이어장'), 45.5, 21.7, { size: 0.6, bold: true });
    return [b.f];
  }

  /* ---------- 屋外（敷地図）：建物は屋根として描き、ドア・窓は屋内の階と同じ位置 ---------- */

  const OUTSIDE = T('屋外', 'Outside', '옥외');

  function mansionOutside() {
    const o = makeFloor(OUTSIDE);
    o.room(T('洋館（本館）', 'Mansion (main house)', '저택(본관)'), 'roof', 0, 0, 40, 22)
      .room(T('ガレージ', 'Garage', '차고'), 'roof', 0, 22, 12, 11)
      .room(T('ガレージ', 'Garage', '차고'), 'roof', 28, 22, 12, 11)
      .room(T('ポーチ', 'Porch', '포치'), 'porch', 16, 22, 8, 3, { hideLabel: true })
      .room(T('車寄せ', 'Carriage circle', '차량 회차로'), 'porch', 12, 25, 16, 8, { ly: 2.6 })
      .room(T('前庭の車道', 'Front drive', '앞뜰 차도'), 'porch', 0, 33, 40, 4, { hideLabel: true })
      .room(T('アプローチ', 'Approach', '진입로'), 'porch', 17, 37, 6, 9, { hideLabel: true })
      .room(T('薔薇園', 'Rose garden', '장미 정원'), 'garden', -12, -12, 20, 12, { lx: 6, ly: -0.3 })
      .room(T('菜園', 'Kitchen garden', '채소밭'), 'field', 26, -10, 10, 7)
      .room(T('温室', 'Greenhouse', '온실'), 'public', 42, -10, 10, 11, { wall: 'glass', ly: 3.2 })
      .room(T('裏の通路', 'Service path', '뒷길'), 'porch', 40, 6, 4, 14, { hideLabel: true })
      .room(T('庭師小屋', 'Gardener\'s hut', '정원사 오두막'), 'storage', 44, 12, 8, 6)
      .room(T('一族の墓所', 'Family graveyard', '가족 묘지'), 'garden', -12, 6, 10, 14, { ly: -2.2 })
      .room(T('池', 'Pond', '연못'), 'water', 30, 39, 12, 6)
      .room(T('通り', 'Street', '거리'), 'porch', -12, 46, 66, 4);
    fillYard(o, -12, -12, 54, 46, T('庭', 'Grounds', '정원'));
    // 敷地を囲む鉄柵と正門、墓所の柵
    o.wall(-12, -12, 54, -12, 'fence').wall(-12, -12, -12, 46, 'fence').wall(54, -12, 54, 46, 'fence').wall(-12, 46, 54, 46, 'fence')
      .wall(-12, 6, -2, 6, 'fence').wall(-2, 6, -2, 20, 'fence').wall(-12, 20, -2, 20, 'fence');
    o.dh(17, 46, 6, -1, 0, 'door2')              // 正門
      .dv(-2, 12, 2, 1, 0)                        // 墓所の門
      .dh(18.5, 22, 3, -1, 0, 'door2')           // 正面玄関（1F と同じ位置）
      .dv(40, 9.75, 1.5, -1, 0)                  // 勝手口
      .dh(1, 33, 10, -1, 0, 'shutter').dh(29, 33, 10, -1, 0, 'shutter')
      .dv(12, 24, 1.5, -1, 0).dv(28, 24, 1.5, 1, 0)
      .dh(46, 1, 2, 1, 0)                        // 温室
      .dv(44, 14, 1.5, -1, 1)                    // 庭師小屋
      .wh(1.5, 0, 3).wh(8.5, 0, 3).wh(15, 0, 2.5).wh(23, 0, 2.5).wh(28, 0, 3).wh(36, 0, 2)
      .wv(0, 14, 3).wv(0, 18, 3).wv(40, 14, 3).wv(40, 18, 3)
      .wh(14.5, 22, 1).wh(24.5, 22, 1).wv(0, 2, 3).wv(40, 6, 2)
      .wh(47, 18, 2);
    o.item('fountain', 18, 27)
      .item('statue', 12.4, 25.4).item('statue', 26, 25.4)
      .item('gazebo', -5, -9).item('garden_bench', -4, -3.3, 180)
      .item('hedge', -11.5, -11.5).item('hedge', 1.5, -11.5).item('hedge', -11.5, -1.5).item('hedge', 1.5, -1.5)
      .item('bush', -10.5, -8.5).item('bush', -10.5, -5.5).item('bush', 4.5, -8.5).item('bush', 4.5, -5.5)
      .item('well', 38.4, -5)
      .item('tree', 43, -9.5).item('tree', 48.6, -9.5).item('lab_bench', 44.2, -5.6).item('plant', 50.3, -5.4).item('plant', 42.5, -5.2)
      .item('bush', 43, -2.5).item('bush', 50, -2.5)
      .item('cabinet', 48, 12.1).item('crate', 50.1, 15.9).item('barrel', 45, 16.4).item('crate', 45, 12.4, 0, { size: [1.2, 1.2] })
      .item('grave', -11, 7.5).item('grave', -8.5, 7.5).item('grave', -6, 7.5)
      .item('grave', -11, 11.5).item('grave', -8.5, 11.5).item('grave', -6, 11.5)
      .item('statue', -11, 16.2).item('tree', -8.6, 16.6)
      .item('trapdoor', -4.6, 17.3, 0, { gm: true, size: [1.6, 1.6], label: T('抜け道', 'Tunnel', '비밀 통로') })
      .item('tree', 10, -10.5).item('tree', 16, -6).item('tree', 21.5, -10.5)
      .item('tree', -11, 22).item('tree', -8, 30).item('tree', -11, 38).item('tree', -5, 41.5)
      .item('tree', 2, 38.5).item('tree', 7.5, 41.5).item('tree', 12.5, 38.5)
      .item('tree', 44, 38.5).item('tree', 49.5, 41.5).item('tree', 51, 26).item('tree', 46, 30)
      .item('garden_bench', 33.5, 37.8, 0);
    o.f.rooms[11].note = T('墓所の奥に古い抜け道。地下の隠し部屋へ続く', 'An old tunnel at the back of the graveyard leads to the hidden basement room', '묘지 안쪽에 오래된 비밀 통로. 지하 비밀방으로 이어진다');
    return o.f;
  }

  function houseOutside() {
    const o = makeFloor(OUTSIDE);
    o.room(T('家（2階建て）', 'House', '주택(2층)'), 'roof', 0, 0, 28, 17)
      .room(T('ポーチ', 'Porch', '포치'), 'porch', 12, 17, 4, 2, { hideLabel: true })
      .room(T('アプローチ', 'Approach', '진입로'), 'porch', 12, 19, 4, 9, { hideLabel: true })
      .room(T('駐車場', 'Parking', '주차장'), 'porch', 17, 18, 10, 10, { lx: 3.4 })
      .room(T('ウッドデッキ', 'Wood deck', '우드 데크'), 'balcony', 1, 17, 10, 3, { lx: 1.6, ly: 0.8 })
      .room(T('池', 'Pond', '연못'), 'water', 2, 23, 5, 3, { hideLabel: true })
      .room(T('家庭菜園', 'Vegetable patch', '텃밭'), 'field', -4, -6, 10, 5)
      .room(T('前面道路', 'Street', '앞 도로'), 'porch', -4, 28, 38, 4);
    fillYard(o, -4, -6, 34, 28, T('庭', 'Garden', '마당'));
    // ブロック塀と門扉、駐車場の入口
    o.wall(-4, -6, 34, -6).wall(-4, -6, -4, 28).wall(34, -6, 34, 28).wall(-4, 28, 34, 28);
    o.dh(12.5, 28, 3, -1, 0, 'door2')           // 門扉
      .dh(17, 28, 10, 1, 0, 'open')              // 駐車場の入口
      .dh(13.5, 17, 2, -1, 0)                    // 玄関（1F と同じ位置）
      .dv(28, 4.5, 1.5, -1, 0)                   // 勝手口
      .wh(3, 0, 3).wh(11, 0, 2).wh(18, 0, 3, 'window2')
      .wh(2, 17, 3, 'window2').wh(7, 17, 3, 'window2').wh(19, 17, 3).wh(24, 17, 3)
      .wv(28, 14.8, 2).wv(0, 9.5, 1.5);
    o.item('car', 20, 18.6)
      .item('tree', -3.2, 17.4).item('tree', -3.2, 24.2).item('lantern', 7.6, 23.4)
      .item('bush', 9.6, 25.6).item('bush', 0, 26.2).item('bush', 8, 21)
      .item('deck_chair', 3.2, 17.3, 90, { size: [1.2, 3] }).item('plant', 9.4, 17.6)
      .item('shed', 29.6, -5.4).item('tree', 14, -5.6).item('tree', 21, -5.6)
      .item('bush', 30.5, 8).item('bush', 30.5, 11.5)
      .item('garden_bench', -3.6, 2, 90);
    o.text(T('庭', 'Garden', '마당'), 1.2, 21.4, { size: 0.8, bold: true });
    return o.f;
  }

  /* ---------- ファンタジー：冒険者の宿（1F 酒場・2F 宿） ---------- */

  function tavern() {
    const g = makeFloor('1F');
    g.room(T('酒場', 'Tavern hall', '주점'), 'public', 0, 0, 18, 16)
      .room(T('厨房', 'Kitchen', '주방'), 'kitchen', 18, 0, 10, 7)
      .room(N.stairHall, 'hall', 18, 7, 5, 9, { hideLabel: true })
      .room(T('食料庫', 'Pantry', '식료품 창고'), 'storage', 23, 7, 5, 4, { lx: 0.6, ly: -1.2 })
      .room(T('主人の部屋', 'Innkeeper\'s room', '주인 방'), 'bedroom', 23, 11, 5, 5)
      .room(T('裏庭', 'Back yard', '뒷마당'), 'porch', 28, 0, 10, 9)
      .room(T('厩舎', 'Stable', '마구간'), 'garage', 28, 9, 10, 7)
      .room(T('通り', 'Street', '거리'), 'porch', -2, 16, 42, 4);
    g.wall(28, 0, 38, 0, 'fence').wall(38, 0, 38, 9, 'fence');
    g.dh(7.5, 16, 3, -1, 0, 'door2')            // 入口
      .dv(18, 1.6, 1.5, 1, 1)                    // 酒場（カウンターの内側） ↔ 厨房
      .dv(18, 9.5, 4, 1, 0, 'open')              // 酒場 ↔ 階段ホール
      .dh(23.25, 7, 1.5, 1, 0)                   // 食料庫（厨房から）
      .dv(23, 12, 1.5, 1, 0)                     // 主人の部屋
      .dv(28, 2, 1.5, 1, 0)                      // 裏口
      .dh(30, 9, 6, 1, 0, 'open')                // 裏庭 ↔ 厩舎
      .dh(31.5, 16, 3, -1, 0, 'door2')           // 厩舎の大戸
      .wh(2, 16, 3).wh(13, 16, 3).wv(0, 3, 3).wv(0, 11, 2).wh(3, 0, 2).wh(20, 0, 2).wh(25, 16, 1.5);
    g.item('cupboard', 11.5, 0.05, 0, { size: [6.3, 0.9] }).item('barrel', 11.7, 1.1)
      .item('counter', 11.5, 3.6, 0, { size: [6.5, 1.2] })
      .item('stool', 12, 5.1).item('stool', 13.6, 5.1).item('stool', 15.2, 5.1).item('stool', 16.8, 5.1)
      .item('quest_board', 4.5, 0.05).item('banner', 8.4, 0.05)
      .item('fireplace', 0, 6.5, 270);
    roundTable(g, 4, 3.3);
    roundTable(g, 4, 10.6);
    roundTable(g, 9, 7.8);
    roundTable(g, 13.6, 10.6);
    g.item('kitchen', 18.5, 0.05).item('stove', 23.7, 0.05).item('barrel', 26.6, 0.2).item('table', 21.6, 3.4)
      .item('stairs', 18.2, 14, 90)
      .item('barrel', 23.3, 9.6).item('barrel', 24.6, 9.6).item('crate', 26.3, 9.2)
      .item('bed_single', 24, 14, 90).item('chest', 26.3, 11.1)
      .item('well', 34.5, 0.6).item('crate', 29, 0.4).item('barrel', 31, 0.4).item('hay', 36, 6.4)
      .item('hay', 28.3, 14.4).item('hay', 28.3, 12.8).item('barrel', 36.6, 14.6).item('hay', 35.7, 12.6, 90, { size: [1.4, 2] });
    g.f.rooms[0].note = T('掲示板に古い依頼書。「北の塔の調査、報酬は前払い」', 'An old notice on the board: "Investigate the north tower, paid in advance"', '게시판에 오래된 의뢰서. "북쪽 탑 조사, 보수 선지급"');

    const u = makeFloor('2F');
    u.room(T('客室1', 'Room 1', '객실1'), 'bedroom', 0, 0, 6, 7)
      .room(T('客室2', 'Room 2', '객실2'), 'bedroom', 6, 0, 6, 7)
      .room(T('客室3', 'Room 3', '객실3'), 'bedroom', 12, 0, 6, 7)
      .room(T('大部屋', 'Common dormitory', '다인실'), 'bedroom', 18, 0, 10, 7)
      .room(N.corridor, 'hall', 0, 7, 18, 2, { hideLabel: true })
      .room(N.stairHall, 'hall', 18, 7, 5, 9, { hideLabel: true })
      .room(T('客室4', 'Room 4', '객실4'), 'bedroom', 0, 9, 6, 7)
      .room(T('客室5', 'Room 5', '객실5'), 'bedroom', 6, 9, 6, 7)
      .room(T('湯浴み場', 'Bathhouse', '목욕간'), 'wet', 12, 9, 6, 7, { ly: -1.6 })
      .room(N.toilet, 'wet', 23, 7, 5, 4)
      .room(T('物置', 'Storeroom', '창고'), 'storage', 23, 11, 5, 5);
    u.dv(18, 7, 2, 1, 0, 'open')
      .dh(1, 7, 1.5, -1, 0).dh(7, 7, 1.5, -1, 0).dh(13, 7, 1.5, -1, 0)
      .dh(19, 7, 1.5, -1, 0)
      .dh(1, 9, 1.5, 1, 0).dh(7, 9, 1.5, 1, 0).dh(13, 9, 1.5, 1, 0)
      .dv(23, 8, 1.5, 1, 0).dv(23, 12, 1.5, 1, 0)
      .wh(2.5, 0, 2).wh(8.5, 0, 2).wh(14.5, 0, 2).wh(20, 0, 2).wh(24.5, 0, 2)
      .wh(2.5, 16, 2).wh(8.5, 16, 2).wh(14.5, 16, 2).wv(0, 3, 2).wv(0, 12, 2);
    [0, 6, 12].forEach(x => {
      u.item('bed_single', x + 3.7, 0.2).item('chest', x + 0.3, 0.2).item('stool', x + 0.5, 2.6);
    });
    [0, 6].forEach(x => {
      u.item('bed_single', x + 3.7, 11.8, 180).item('chest', x + 0.3, 14.8, 180).item('stool', x + 0.6, 11.4);
    });
    u.item('bunk_bed', 20.6, 0.2).item('bunk_bed', 23, 0.2).item('bunk_bed', 25.6, 0.2)
      .item('bathtub', 15.6, 12.6, 0, { size: [2.2, 3.2] }).item('barrel', 12.4, 14.6).item('stool', 12.4, 12.6)
      .item('stairs', 18.2, 14, 90)
      .item('toilet', 26.3, 7.2, 90).item('crate', 26.2, 14.2).item('crate', 24.4, 14.2).item('cabinet', 27, 11.3, 90, { size: [2.4, 0.9] });
    return [g.f, u.f];
  }

  /* ---------- ファンタジー：城（1F・地下牢） ---------- */

  function castle() {
    const S = { wall: 'stone' };
    const g = makeFloor('1F');
    g.room(T('礼拝堂', 'Chapel', '예배당'), 'stone', 0, 0, 14, 10, S)
      .room(T('玉座の間', 'Throne room', '왕좌의 방'), 'stone', 14, 0, 20, 14, { ...S, ly: 2.2 })
      .room(T('王の私室', 'Royal chamber', '왕의 침실'), 'bedroom', 34, 0, 14, 10, S)
      .room(T('西回廊', 'West gallery', '서쪽 회랑'), 'hall', 0, 10, 14, 4, { ...S, hideLabel: true })
      .room(T('東回廊', 'East gallery', '동쪽 회랑'), 'hall', 34, 10, 14, 4, { ...S, hideLabel: true })
      .room(T('大広間', 'Great hall', '대연회장'), 'stone', 0, 14, 12, 14, S)
      .room(T('厨房', 'Kitchen', '주방'), 'kitchen', 0, 28, 12, 8, S)
      .room(T('中庭', 'Courtyard', '안뜰'), 'porch', 12, 14, 24, 22, { ly: -6 })
      .room(T('武器庫', 'Armory', '무기고'), 'stone', 36, 14, 12, 8, S)
      .room(T('兵舎', 'Barracks', '병영'), 'stone', 36, 22, 12, 14, S)
      .room(T('南西の塔', 'SW tower', '남서쪽 탑'), 'stone', 0, 36, 12, 8, S)
      .room(T('衛兵詰所', 'Guardroom', '위병소'), 'stone', 12, 36, 8, 8, S)
      .room(T('城門', 'Gatehouse', '성문'), 'stone', 20, 36, 8, 8, { ...S, ly: 2 })
      .room(T('厩舎', 'Stable', '마구간'), 'garage', 28, 36, 8, 8, S)
      .room(T('南東の塔', 'SE tower', '남동쪽 탑'), 'stone', 36, 36, 12, 8, S)
      .room(T('跳ね橋', 'Drawbridge', '도개교'), 'porch', 22, 44, 4, 6, { hideLabel: true })
      .room(T('堀', 'Moat', '해자'), 'water', -2, 44, 24, 4)
      .room(T('堀', 'Moat', '해자'), 'water', 26, 44, 24, 4, { hideLabel: true });
    g.dh(22, 44, 4, -1, 0, 'door2')              // 城門（外）
      .dh(22, 36, 4, -1, 0, 'open')              // 城門 ↔ 中庭
      .dv(20, 40, 1.5, -1, 1).dv(28, 40, 1.5, 1, 1)
      .dh(29, 36, 6, -1, 0, 'open')              // 厩舎 ↔ 中庭
      .dv(12, 41, 1.5, -1, 0)                    // 衛兵詰所 ↔ 南西の塔
      .dh(42, 36, 1.5, 1, 0)                     // 兵舎 ↔ 南東の塔
      .dv(12, 19.5, 3, -1, 0, 'door2')           // 大広間
      .dv(12, 31, 1.5, -1, 0)                    // 厨房
      .dh(5, 28, 1.5, 1, 0)                      // 大広間 ↔ 厨房
      .dv(36, 17, 1.5, 1, 0)                     // 武器庫
      .dv(36, 28, 1.5, 1, 0)                     // 兵舎
      .dh(38.5, 22, 1.5, 1, 0)                   // 武器庫 ↔ 兵舎
      .dh(22.5, 14, 3, -1, 0, 'door2')           // 玉座の間
      .dh(12.25, 14, 1.5, -1, 0).dh(34.25, 14, 1.5, -1, 1)
      .dh(6, 10, 1.5, -1, 0)                     // 礼拝堂
      .dh(6, 14, 1.5, 1, 0)                      // 大広間（回廊から）
      .dv(14, 11.25, 1.5, 1, 0).dv(34, 11.25, 1.5, -1, 0)
      .dh(40, 10, 1.5, -1, 0)                    // 王の私室
      .dh(43, 14, 1.5, 1, 1)                     // 武器庫（回廊から）
      .wh(3, 0, 1).wh(9, 0, 1).wh(18, 0, 1).wh(29, 0, 1).wh(38, 0, 1).wh(44, 0, 1)
      .wv(0, 4, 1).wv(0, 18, 1).wv(0, 24, 1).wv(0, 31, 1).wv(0, 39, 1)
      .wv(48, 4, 1).wv(48, 17, 1).wv(48, 27, 1).wv(48, 39, 1)
      .wh(4, 44, 1).wh(14, 44, 1).wh(32, 44, 1).wh(42, 44, 1);
    g.item('throne', 22.8, 0.4).item('banner', 18.5, 0.05).item('banner', 27.5, 0.05)
      .item('rug', 22, 3, 0, { size: [4, 10] })
      .item('pillar', 16.5, 3.5).item('pillar', 16.5, 9).item('pillar', 30.5, 3.5).item('pillar', 30.5, 9)
      .item('armor_stand', 20.4, 0.6).item('armor_stand', 26.4, 0.6)
      .item('altar', 5.5, 0.3).item('candle', 4.4, 0.5).item('candle', 8.8, 0.5)
      .item('pew', 1.5, 3.4, 0, { size: [4.5, 1.2] }).item('pew', 8, 3.4, 0, { size: [4.5, 1.2] })
      .item('pew', 1.5, 5.8, 0, { size: [4.5, 1.2] }).item('pew', 8, 5.8, 0, { size: [4.5, 1.2] })
      .item('bed_double', 44.8, 0.3).item('nightstand', 43.7, 0.3).item('wardrobe', 34.3, 0.2).item('chest', 38, 0.2)
      .item('desk', 34.3, 6.4, 90, { size: [2.4, 1.2] }).item('rug', 39.5, 4.5, 0, { size: [4, 3] })
      .item('dining6', 3.6, 17.5, 90).item('dining6', 3.6, 22.4, 90, { size: [4.4, 3.4] })
      .item('fireplace', 0, 19.5, 270).item('banner', 9, 14.05).item('banner', 9, 27.35, 180)
      .item('stove', 0, 29.4, 270).item('kitchen', 0, 31.8, 270, { size: [4, 1.3] }).item('table', 4.5, 31.4).item('barrel', 10.3, 28.4).item('barrel', 10.3, 34.4)
      .item('weapon_rack', 47, 14.8, 90).item('weapon_rack', 47, 18.4, 90).item('armor_stand', 42.4, 20.6).item('armor_stand', 44.2, 20.6).item('crate', 38.8, 18.4)
      .item('bunk_bed', 44, 23.4, 90).item('bunk_bed', 44, 26.6, 90).item('bunk_bed', 44, 29.8, 90).item('bunk_bed', 44, 33, 90)
      .item('table', 38.8, 29.6, 90).item('stool', 41, 30.2).item('stool', 41, 31.8).item('chest', 41.6, 23.4, 90, { size: [1.6, 1] })
      .item('spiral', 43.6, 39.6, 0, { label: T('塔の上へ', 'Up the tower', '탑 위로') }).item('crate', 37, 42.2)
      .item('stairs_down', 1, 37.5).item('crate', 8.6, 42).item('torch', 5.6, 36.05)
      .item('table', 14, 39).item('stool', 14.6, 41).item('stool', 16, 41).item('weapon_rack', 16.6, 36.05, 0, { size: [3, 1] })
      .item('torch', 21, 36.05).item('torch', 26.2, 36.05)
      .item('hay', 29, 41.6).item('hay', 31.4, 41.6).item('barrel', 34.3, 42.4)
      .item('well', 22.9, 23.9).item('tree', 14, 15.8).item('tree', 31, 15.8).item('crate', 13.4, 33.2).item('anvil', 31.6, 32.6).item('forge', 32.8, 34.0, 0, { size: [3, 1.8] });
    g.f.rooms[1].note = T('玉座の後ろの壁に王家の紋章。押すと音がする', 'The royal crest behind the throne clicks when pressed', '왕좌 뒤의 왕가 문장. 누르면 소리가 난다');

    const b = makeFloor('B1');
    b.room(T('塔の地下', 'Tower undercroft', '탑 지하'), 'stone', 0, 36, 12, 8, S)
      .room(T('牢番の詰所', 'Jailer\'s room', '간수실'), 'stone', 0, 28, 12, 8, S)
      .room(T('拷問部屋', 'Torture chamber', '고문실'), 'danger', 0, 20, 12, 8, S)
      .room(T('地下牢の通路', 'Dungeon corridor', '지하 감옥 통로'), 'hall', 12, 24, 4, 20, { ...S, hideLabel: true })
      .room(T('牢1', 'Cell 1', '감방1'), 'stone', 16, 24, 6, 5, S)
      .room(T('牢2', 'Cell 2', '감방2'), 'stone', 16, 29, 6, 5, S)
      .room(T('牢3', 'Cell 3', '감방3'), 'stone', 16, 34, 6, 5, S)
      .room(T('牢4', 'Cell 4', '감방4'), 'stone', 16, 39, 6, 5, S)
      .room(T('抜け穴', 'Escape tunnel', '탈출 구멍'), 'stone', 22, 40, 12, 2, { ...S, gm: true, plName: '', note: T('牢4の壁の裏から堀の外へ抜ける', 'Leads from behind cell 4 out past the moat', '감방4 벽 뒤에서 해자 밖으로 빠져나간다') });
    b.dv(12, 39, 1.5, 1, 0)                      // 塔の地下 ↔ 通路
      .dh(5, 36, 1.5, -1, 0)                     // 塔の地下 ↔ 詰所
      .dv(12, 31, 1.5, 1, 0)                     // 詰所 ↔ 通路
      .dv(12, 25, 1.5, -1, 0, 'locked')          // 拷問部屋
      .dv(22, 40.25, 1.5, 1, 0, 'secret');
    [24, 29, 34, 39].forEach(y => { b.dv(16, y + 0.3, 1.5, 1, 0, 'locked').wv(16, y + 2, 2.6, 'barred'); });
    b.item('stairs', 1, 37.5).item('torch', 5.6, 43.15, 180)
      .item('table', 4, 30.8).item('stool', 4.6, 32.6).item('stool', 6, 32.6).item('chest', 0.3, 28.3).item('key', 10.4, 28.4)
      .item('cage', 1, 21).item('table', 6.4, 21, 0, { size: [3, 1.6] }).item('blood', 6.6, 24.4).item('candle', 10.6, 20.6).item('spike_trap', 2, 25.6, 0, { size: [2, 2] })
      .item('torch', 12.05, 28.4, 270).item('torch', 12.05, 36.4, 270)
      .item('hay', 19.4, 24.4, 0, { size: [2.2, 1.4] }).item('bones', 20, 31.6).item('hay', 19.4, 34.4, 0, { size: [2.2, 1.4] }).item('barrel', 20.4, 42.4, 0, { size: [1, 1] })
      .item('debris', 27, 40, 0, { size: [2.4, 2], gm: true });
    return [b.f, g.f];
  }

  /* ---------- ファンタジー：地下迷宮（ダンジョン） ---------- */

  function dungeon() {
    const S = { wall: 'stone' };
    const b = makeFloor('B1');
    b.room(T('入口の間', 'Entry chamber', '입구의 방'), 'stone', 18, 30, 8, 6, { ...S, lx: -2.2, ly: 1.6 })
      .room(T('通路', 'Passage', '통로'), 'stone', 21, 24, 2, 6, { ...S, hideLabel: true })
      .room(T('十字路', 'Crossroads', '십자로'), 'stone', 18, 18, 8, 6, { ...S, ly: 1.6 })
      .room(T('通路', 'Passage', '통로'), 'stone', 8, 20, 10, 2, { ...S, hideLabel: true })
      .room(T('通路', 'Passage', '통로'), 'stone', 26, 20, 10, 2, { ...S, hideLabel: true })
      .room(T('通路', 'Passage', '통로'), 'stone', 21, 10, 2, 8, { ...S, hideLabel: true })
      .room(T('通路', 'Passage', '통로'), 'stone', 39, 8, 2, 6, { ...S, hideLabel: true })
      .room(T('ゴブリンの巣', 'Goblin den', '고블린 소굴'), 'stone', 0, 14, 8, 12, S)
      .room(T('罠の回廊', 'Trapped hall', '함정 회랑'), 'danger', 36, 14, 8, 12, S)
      .room(T('崩れた横穴', 'Collapsed tunnel', '무너진 옆굴'), 'cave', 44, 16, 6, 8)
      .room(T('宝物庫', 'Treasure vault', '보물고'), 'stone', 36, 0, 8, 8, S)
      .room(T('主の間', 'Lair of the master', '주인의 방'), 'special', 14, 0, 16, 10, { ...S, lx: -4.5, ly: 2.8 })
      .room(T('隠し通路', 'Hidden passage', '숨겨진 통로'), 'stone', 8, 3, 6, 2, { ...S, gm: true, plName: '', hideLabel: true })
      .room(T('囚われの間', 'Prisoner\'s cell', '갇힌 자의 방'), 'stone', 0, 0, 8, 8, { ...S, gm: true, plName: '', note: T('主の間の隠し扉の先。行方不明の冒険者がいる', 'Beyond the secret door of the lair; the missing adventurer is here', '주인의 방 비밀문 너머. 실종된 모험가가 있다') });
    b.dh(21, 30, 2, 1, 0, 'open').dh(21, 24, 2, 1, 0, 'open')
      .dv(8, 20, 2, 1, 0, 'open').dv(18, 20, 2, 1, 0, 'open')
      .dv(26, 20, 2, 1, 0, 'open').dv(36, 20, 2, 1, 0, 'open')
      .dh(21, 18, 2, 1, 0, 'open').dh(21, 10, 2, -1, 0)
      .dh(39, 14, 2, 1, 0, 'open').dh(39, 8, 2, -1, 0, 'locked')
      .dv(44, 19, 2, 1, 0, 'hole')
      .dv(14, 3.25, 1.5, -1, 0, 'secret').dv(8, 3, 2, 1, 0, 'open');
    b.item('stairs', 21, 31, 180, { size: [2, 4] }).item('torch', 18.05, 31.6, 270).item('torch', 25.15, 31.6, 90).item('crate', 24.2, 34)
      .item('statue', 18.3, 18.3).item('statue', 24.1, 18.3).item('bones', 24.4, 22.5)
      .item('campfire', 3, 16.2).item('hay', 0.4, 14.4).item('hay', 0.4, 16.2).item('crate', 5.8, 14.4).item('barrel', 6.4, 24.4).item('bones', 1, 23.6).item('chest', 3, 24.6, 180)
      .item('spike_trap', 37, 15.4).item('spike_trap', 41.4, 16.6).item('spike_trap', 37.6, 22.6).item('pit', 41, 22.6, 0, { size: [2.2, 2.2] }).item('danger', 42.6, 14.4, 0, { size: [1, 1] })
      .item('bones', 48, 21.6).item('rock', 47.8, 17).item('rock', 45.2, 22.4, 0, { size: [1.2, 1] })
      .item('chest', 37.4, 0.4).item('chest', 40.6, 0.4).item('chest', 41.4, 4.8, 90).item('statue', 37.2, 5.6, 0, { size: [1.4, 1.4] })
      .item('throne', 20.8, 0.3).item('magic_circle', 19.5, 3.5, 0, { size: [5, 4.4] }).item('pillar', 15.2, 1.2).item('pillar', 15.2, 7.8).item('pillar', 27.8, 1.2).item('pillar', 27.8, 7.8)
      .item('torch', 18, 0.05).item('torch', 25.2, 0.05)
      .item('bones', 2, 2, 0, { gm: true }).item('hay', 1, 5.6, 0, { gm: true }).item('candle', 6.2, 1, 0, { gm: true });
    return [b.f];
  }

  /* ---------- ファンタジー：魔法使いの塔（B1〜3F、螺旋階段はどの階も同じ位置） ---------- */

  function wizardTower() {
    const S = { wall: 'stone' };
    const bm = makeFloor('B1');
    bm.room(T('封印の間', 'Sealed vault', '봉인의 방'), 'special', 4, 0, 12, 8, { ...S, gm: true, plName: '', note: T('倉庫の床の扉からはしごで下りる。魔法陣の中央に封じられた何か', 'Reached by ladder from the trapdoor in the storeroom; something sealed at the center of the circle', '창고 바닥 문에서 사다리로 내려간다. 마법진 중앙에 봉인된 무언가') });
    bm.item('ladder', 10.4, 0.4, 0, { gm: true }).item('magic_circle', 6.4, 1.6, 0, { gm: true }).item('candle', 4.4, 0.4, 0, { gm: true }).item('candle', 4.4, 6.8, 0, { gm: true })
      .item('statue', 14, 6, 0, { gm: true, size: [1.4, 1.4] }).item('chest', 13.6, 0.3, 0, { gm: true });

    const g = makeFloor('1F');
    g.room(T('台所', 'Kitchen', '부엌'), 'kitchen', 0, 0, 8, 6, S)
      .room(T('倉庫', 'Storeroom', '창고'), 'storage', 8, 0, 8, 6, S)
      .room(T('入口の間', 'Entry hall', '입구의 방'), 'stone', 0, 6, 16, 10, { ...S, lx: -2.4 })
      .room(T('前庭', 'Front yard', '앞뜰'), 'garden', -2, 16, 20, 4, { hideLabel: true });
    g.dh(6.5, 16, 3, -1, 0, 'door2')
      .dh(3, 6, 1.5, -1, 0).dh(11, 6, 1.5, -1, 0)
      .wv(0, 2, 1).wv(0, 10, 1).wv(16, 2, 1).wv(16, 8, 1).wh(2, 16, 1).wh(12.5, 16, 1);
    g.item('stove', 0.2, 0.05).item('barrel', 5.6, 0.3).item('table', 2.4, 2.6, 0, { size: [2.4, 1.4] })
      .item('crate', 8.4, 0.3).item('crate', 14, 0.3).item('barrel', 14.4, 2.4).item('trapdoor', 10, 0.4, 0, { gm: true, size: [1.6, 1.6] })
      .item('spiral', 12, 12).item('rug', 3, 9, 0, { size: [6, 4] }).item('statue', 0.3, 6.3).item('armor_stand', 0.4, 14.6)
      .item('bookshelf', 4.6, 6.05, 0).item('torch', 9, 6.05)
      .item('tree', -1.5, 16.6).item('bush', 14.6, 17.4);

    const u = makeFloor('2F');
    u.room(T('書庫', 'Library', '서고'), 'stone', 0, 0, 16, 10, { ...S, ly: 2.6 })
      .room(T('実験室', 'Laboratory', '실험실'), 'medical', 0, 10, 10, 6, S)
      .room(N.stairHall, 'hall', 10, 10, 6, 6, { ...S, hideLabel: true });
    u.dh(10.5, 10, 1.5, -1, 0).dv(10, 13, 1.5, -1, 0)
      .wv(0, 3, 1).wv(16, 3, 1).wh(7.5, 0, 1).wv(0, 12, 1);
    u.item('bookshelf', 0, 0.05).item('bookshelf', 3.2, 0.05).item('bookshelf', 9.6, 0.05).item('bookshelf', 12.8, 0.05)
      .item('bookshelf', 0.05, 3, 90, { size: [3, 0.8] }).item('bookshelf', 15.15, 3, 270, { size: [3, 0.8] })
      .item('table', 5.6, 4.4, 0, { size: [4.4, 2] }).item('chair', 6.4, 3.3).item('chair', 8.4, 3.3).item('chair', 7.4, 6.5, 180)
      .item('crystal_ball', 7.2, 4.9)
      .item('cauldron', 0.6, 11.6).item('lab_bench', 4, 10.1).item('rack', 8.4, 14.55, 0, { size: [1.4, 1.4] }).item('pills', 4.6, 14.5)
      .item('spiral', 12, 12);

    const t3 = makeFloor('3F');
    t3.room(T('天文台', 'Observatory', '천문대'), 'special', 0, 0, 16, 10, { ...S, ly: 3.6 })
      .room(T('魔法使いの寝室', 'Wizard\'s bedroom', '마법사의 침실'), 'bedroom', 0, 10, 10, 6, { ...S, ly: -0.8 })
      .room(N.stairHall, 'hall', 10, 10, 6, 6, { ...S, hideLabel: true });
    t3.dh(10.5, 10, 1.5, -1, 0).dv(10, 13, 1.5, -1, 0)
      .wh(2, 0, 3, 'window2').wh(6.5, 0, 3, 'window2').wh(11, 0, 3, 'window2').wv(0, 3, 2).wv(16, 3, 2).wv(0, 12, 1);
    t3.item('magic_circle', 5.5, 2.8).item('crystal_ball', 7.5, 4.8).item('desk', 12.6, 6.2, 90, { size: [2.4, 1.2] }).item('chair', 11.6, 6.8, 270)
      .item('bookshelf', 0.05, 6, 90, { size: [3, 0.8] }).item('candle', 13.6, 2.4)
      .item('bed_single', 0.3, 13.8, 270).item('chest', 7.6, 15, 180).item('wardrobe', 6.2, 10.05, 0, { size: [2.4, 1] })
      .item('spiral', 12, 12);
    return [bm.f, g.f, u.f, t3.f];
  }

  /* ---------- 和風：忍者屋敷（1F・屋根裏、庭） ---------- */

  function ninjaHouse() {
    const g = makeFloor('1F');
    g.room(T('台所', 'Kitchen', '부엌'), 'doma', 0, 0, 8, 9)
      .room(T('納戸', 'Storeroom', '광'), 'storage', 8, 0, 6, 9, { lx: 0.8, ly: 2.6 })
      .room(T('仏間', 'Altar room', '불간'), 'washitsu', 14, 0, 7, 9)
      .room(T('隠し部屋', 'Hidden room', '숨은 방'), 'washitsu', 21, 0, 3, 9, { gm: true, plName: '', hideLabel: true, note: T('仏間のどんでん返しの裏。はしごで屋根裏へ、床下から抜け道で庭の井戸へ', 'Behind the rotating wall in the altar room; ladder to the attic, tunnel under the floor to the garden well', '불간의 회전벽 뒤. 사다리로 다락, 마루 밑 비밀 통로로 마당 우물까지') })
      .room(T('茶室', 'Tea room', '다실'), 'washitsu', 24, 0, 6, 9, { ly: -2 })
      .room(N.corridor, 'hall', 0, 9, 30, 2, { hideLabel: true })
      .room(T('居間', 'Living room', '거실'), 'washitsu', 0, 11, 8, 9, { ly: -2.6 })
      .room(T('座敷', 'Zashiki (guest room)', '객실(자시키)'), 'washitsu', 8, 11, 12, 9)
      .room(T('次の間', 'Anteroom', '옆방'), 'washitsu', 20, 11, 10, 9)
      .room(T('広縁', 'Wide veranda', '넓은 툇마루'), 'engawa', 0, 20, 30, 3)
      .room(T('玄関', 'Entrance', '현관'), 'doma', 30, 7, 6, 6, { ly: -1.8 })
      .room(T('厠', 'Toilet', '변소'), 'wet', 30, 17, 4, 6, { hideLabel: true })
      .room(T('池', 'Pond', '연못'), 'water', 4, 25, 8, 4);
    fillYard(g, -2, -2, 40, 33, T('庭', 'Garden', '정원'));
    g.dv(36, 8.5, 3, -1, 0, 'sliding2')          // 玄関の引き戸
      .dv(30, 9, 2, -1, 0, 'open')               // 上がり框
      .dh(1.5, 9, 3, 1, 0, 'sliding2').dh(9.5, 9, 3, 1, 0, 'sliding')
      .dh(16, 9, 3, 1, 0, 'sliding2').dh(25.5, 9, 1.5, 1, 0, 'sliding')
      .dh(2, 11, 3, 1, 0, 'sliding2').dh(12.5, 11, 3, 1, 0, 'sliding2').dh(23.5, 11, 3, 1, 0, 'sliding2')
      .dv(8, 14.5, 3, 1, 0, 'sliding2').dv(20, 14.5, 3, 1, 0, 'sliding2')
      .dh(1.5, 20, 4, 1, 0, 'sliding2').dh(10, 20, 8, 1, 0, 'sliding2').dh(22, 20, 6, 1, 0, 'sliding2')
      .dh(1, 23, 6, 1, 0, 'sliding2').dh(9, 23, 6, 1, 0, 'sliding2').dh(17, 23, 6, 1, 0, 'sliding2').dh(25, 23, 4, 1, 0, 'sliding2')
      .dv(30, 20.75, 1.5, 1, 0)                  // 厠
      .dv(21, 3.5, 2, 1, 0, 'secret')            // どんでん返し
      .dv(0, 2, 2, 1, 0, 'sliding')              // 勝手口
      .wh(2, 0, 2).wh(10, 0, 2).wh(26, 0, 2).wv(0, 14, 2).wh(32, 7, 2);
    g.item('kamado', 0.1, 4.6, 270).item('sink', 3, 0.05).item('barrel', 6.4, 0.3).item('well', 5.4, 6.4, 0, { size: [1.6, 1.6] })
      .item('cabinet', 8.1, 0.05, 0, { size: [3, 0.9] }).item('chest', 12.2, 0.3, 90, { size: [1.6, 1] }).item('crate', 12, 6.8)
      .item('stairs', 8.3, 3.4, 0, { size: [1.8, 3.6], gm: true, label: T('隠し階段', 'Hidden stairs', '숨은 계단') })
      .item('butsudan', 16.6, 0.05).item('lowtable', 16.4, 5.8)
      .item('ladder', 21.6, 5.2, 0, { gm: true, size: [1.2, 2.6] }).item('trapdoor', 21.4, 1, 0, { gm: true, size: [1.4, 1.4] })
      .item('irori', 25.5, 4.6)
      .item('irori', 2.5, 14).item('cabinet', 0.05, 11.6, 270, { size: [2.6, 0.9] })
      .item('tokonoma', 8.1, 11.05, 0, { size: [3.6, 1.4] }).item('lowtable', 12.9, 16.8).item('knife', 9.4, 12.9, 0, { gm: true, label: T('刀掛けの隠し刀', 'Hidden sword', '숨겨진 칼') })
      .item('lowtable', 23.9, 16.8).item('lantern', 28.4, 18.4, 0, { size: [1, 1] })
      .item('pit', 31.5, 9.6, 0, { gm: true, size: [1.6, 1.6], label: T('落とし穴', 'Pit trap', '함정') })
      .item('toilet', 32.4, 21, 90)
      .item('lantern', 13.6, 25.6).item('rock', 15.6, 27.4).item('tree', 19, 25).item('tree', 31, 28.4).item('bush', 23.6, 29.6).item('bush', 0, 29.6)
      .item('well', 34.4, 24.4, 0, { size: [2, 2] }).item('tree', 35, 14);
    g.text(T('庭', 'Garden', '정원'), 25, 26.4, { size: 0.8, bold: true });

    const a = makeFloor(T('屋根裏', 'Attic', '다락'));
    a.room(T('屋根裏部屋', 'Attic room', '다락방'), 'storage', 8, 0, 16, 9, { gm: true, plName: '', note: T('外からは平屋に見える隠し二階。格子窓から表通りを見張れる', 'A hidden upper floor; from outside the house looks single-story. A slatted window watches the road', '밖에서는 단층집처럼 보이는 숨은 2층. 격자창으로 큰길을 감시한다') });
    a.wh(13, 0, 2, 'barred');
    a.item('stairs', 8.3, 3.4, 0, { size: [1.8, 3.6] }).item('ladder', 21.6, 5.2, 0, { size: [1.2, 2.6] })
      .item('futon', 14.4, 0.4, 90).item('chest', 18.6, 0.3).item('crate', 18.6, 6.6).item('knife', 15, 6.8).item('lantern', 12, 7.4, 0, { size: [1, 1] });
    return [g.f, a.f];
  }

  /* ---------- 洋風住宅（地下室・防音室・窓のない部屋） ---------- */

  function basementHouse() {
    const g = makeFloor('1F');
    g.room(T('キッチン', 'Kitchen', '주방'), 'kitchen', 0, 0, 9, 8)
      .room(T('ダイニング', 'Dining room', '다이닝룸'), 'kitchen', 0, 8, 9, 6, { ly: 2.2 })
      .room(N.hall, 'hall', 9, 0, 4, 14, { hideLabel: true })
      .room(N.living, 'living', 0, 14, 13, 8, { lx: 3, ly: 0.4 })
      .room(T('書斎', 'Study', '서재'), 'office', 13, 0, 15, 7)
      .room(T('防音室', 'Soundproof room', '방음실'), 'studio', 13, 7, 9, 9, { wall: 'sound', ly: -1.6 })
      .room(T('窓のない部屋', 'Windowless room', '창문 없는 방'), 'bedroom', 22, 7, 6, 9)
      .room(N.entrance, 'hall', 13, 16, 5, 6)
      .room(T('地下への階段', 'Basement stairs', '지하 계단'), 'hall', 18, 16, 6, 6, { hideLabel: true })
      .room(T('ポーチ', 'Porch', '포치'), 'porch', 13, 22, 5, 2, { hideLabel: true });
    g.dh(2, 8, 5, 1, 0, 'open')                  // キッチン ↔ ダイニング
      .dv(9, 2.5, 1.5, -1, 1)                    // キッチン
      .dv(9, 10, 1.5, -1, 0)                     // ダイニング
      .dh(10, 14, 2, 1, 0, 'open')               // 廊下 ↔ リビング
      .dv(13, 18, 2.5, -1, 0, 'open')            // 玄関 ↔ リビング
      .dh(14.75, 22, 1.5, -1, 0)                 // 玄関ドア
      .dv(13, 3, 1.5, 1, 0)                      // 書斎
      .dv(13, 10, 1.5, 1, 0)                     // 防音室（重い扉）
      .dh(24, 7, 1.5, 1, 0, 'locked')            // 窓のない部屋（書斎から）
      .dv(18, 19.75, 1.5, -1, 1)                 // 地下への階段
      .wh(2, 0, 3).wh(15, 0, 3).wh(22, 0, 3).wv(0, 2, 2).wv(0, 10, 2).wv(0, 16, 3).wh(3, 22, 3).wh(8, 22, 3).wv(28, 2, 2);
    g.item('kitchen', 0.05, 0.05, 0).item('fridge', 6.2, 0.05).item('cupboard', 0.05, 3.6, 270, { size: [3, 0.9] })
      .item('dining4', 3, 9.3, 90, { size: [3, 3.4] })
      .item('sofa3', 3, 19.9, 180).item('lowtable', 4.1, 16.6).item('tv', 3.6, 14.05).item('fireplace', 0.05, 16.4, 270, { size: [3, 1.2] }).item('armchair', 10.8, 19.8, 270)
      .item('office_desk', 23.6, 2.2).item('chair', 24.6, 1.1).item('bookshelf', 14, 0.05).item('bookshelf', 17.4, 0.05).item('safe', 26.6, 5.6)
      .item('rug', 15, 2.6, 0, { size: [4, 3] }).item('trapdoor', 16.2, 3.2, 0, { gm: true, size: [1.6, 1.6] })
      .item('piano', 18.6, 7.2, 0).item('drums', 13.6, 12.8).item('speaker', 13.2, 7.2).item('speaker', 20.6, 14.8).item('mixer', 17.6, 14.4, 180, { size: [2.6, 1.4] })
      .item('bed_single', 25.8, 11.8, 180).item('desk', 22.2, 13.9, 90, { size: [2.2, 1.2] }).item('candle', 26.8, 8).item('diary', 22.4, 8.4)
      .item('plant', 16.6, 16.3)
      .item('stairs_down', 21, 16.4);
    g.f.rooms[6].note = T('外から見ると窓があるはずの位置に窓がない。内側から壁で塞がれている', 'From outside there should be a window here; it was walled up from inside', '밖에서 보면 창문이 있어야 할 자리에 창이 없다. 안쪽에서 벽으로 막혔다');

    const b = makeFloor('B1');
    b.room(T('地下室', 'Cellar', '지하실'), 'storage', 12, 8, 12, 8)
      .room(T('地下への階段', 'Basement stairs', '지하 계단'), 'hall', 18, 16, 6, 6, { hideLabel: true })
      .room(T('ボイラー室', 'Boiler room', '보일러실'), 'garage', 24, 8, 6, 10)
      .room(T('隠し部屋', 'Hidden room', '비밀의 방'), 'special', 12, 0, 12, 8, { gm: true, plName: '', note: T('書斎の床の扉からはしごで下りる。地下室側は棚で隠された扉', 'Down a ladder from the trapdoor in the study; from the cellar the door is hidden behind a shelf', '서재 바닥 문에서 사다리로 내려간다. 지하실 쪽 문은 선반으로 가려져 있다') });
    b.dh(18.5, 16, 1.5, -1, 0)
      .dv(24, 9.5, 1.5, 1, 0)
      .dh(13, 8, 1.5, -1, 0, 'secret');
    b.item('stairs', 21, 16.4)
      .item('cabinet', 14.6, 8.05, 0, { size: [3, 0.9] }).item('crate', 12.4, 13.8).item('barrel', 14.4, 14.4).item('rack', 20, 8.2, 0, { size: [2, 1.4] }).item('washer', 22.4, 14.4, 180, { size: [1.4, 1.4] })
      .item('tank', 26.8, 12.4, 0, { size: [2.4, 2.4] }).item('crate', 24.4, 16.2, 0, { size: [1.4, 1.4] })
      .item('ladder', 16.4, 3, 0, { gm: true, size: [1.2, 2.4] }).item('magic_circle', 18.6, 1.2, 0, { gm: true, size: [4.6, 4.6] }).item('candle', 12.4, 0.4, 0, { gm: true }).item('photo', 22.6, 6.4, 0, { gm: true });
    return [b.f, g.f];
  }

  /* ---------- 交通・乗り物（T1） ---------- */

  /* (T1 のテンプレート関数はここ) */

  /* 交通・乗り物のテンプレートで参考にした定石:
   *  - 鉄道駅（地上駅）: 駅舎側に単式ホーム、跨線橋で島式ホームへ渡る「2面3線」。駅前広場→コンコース→改札→ホーム、
   *    駅員室は改札の脇で券売機の裏から補充する。線路の中心間は約3.5〜4m、ホームの端に点字ブロックと柵
   *  - 地下鉄駅: B1に改札階（改札・駅事務室・券売機・機械室・電気室）と出入口への地下通路、B2に島式ホームと両側の線路。
   *    階段・エスカレーター・EVは上下階で同じ位置、ホームの端に非常通路と非常階段、ポンプ室・換気機械室
   *  - 立体駐車場（自走式）: 1Fに入口と出口のゲート（発券機・精算機）と管理室、6mの車路の両側に幅2.5m×奥行5mの区画。
   *    スロープは階ごとに端が入れ替わり、車は左側通行。階段とEVは全階同じ位置、最上階は屋上駐車場
   *  - 地下駐車場: 広場の下に2層。道路からのスロープは1車線を信号で交互通行、柱の間隔8mに3台ずつ、車路6m。
   *    管理室・電気室・機械室（換気）・排水ポンプ室・受水槽室・消火設備室、階段とEVから離して非常階段
   *  - 船舶（客船）: 下甲板の船尾寄りに機関室と操舵機室、中央に船員区画、船首寄りに貨物庫と錨鎖庫。
   *    客室甲板は中廊下の両側に船室、舷側に乗船口。遊歩甲板は屋根付きの遊歩道で囲み、最上層の前端に操舵室と
   *    ウイング、後ろに救命艇。船体の外形と階段室は甲板ごとにそろえる
   *  - 高架橋: 複線（線路の中心間約4m、左側通行）の両側に点検通路とケーブルトラフ、架線柱。橋脚は約10mおきの
   *    2本柱、橋の下は倉庫・道路・駐車場に使われ、点検用の階段は柵と施錠された扉で囲う */

  /* 線路（レール）を横向きに敷く。y は線路の上端、長さ len ごとに区切る */
  function trRailsH(b, x0, x1, y, len) {
    for (let x = x0; x < x1; x += len) b.item('rail_track', x, y, 90, { size: [4, Math.min(len, x1 - x)] });
  }

  /* ホームの端の点字ブロック（横向き）。down: true でホームの下の端（線路が下側） */
  function trEdgeH(b, x0, x1, y, down) {
    for (let x = x0; x < x1; x += 16) b.item('platform_edge', x, y, down ? 180 : 0, { size: [Math.min(16, x1 - x), 1] });
  }

  /* ---------- 交通：鉄道駅（地上駅・2面3線、跨線橋） ---------- */

  function railStation() {
    const g = makeFloor('1F');
    g.room(T('3番線', 'Track 3', '3번선'), 'track', 0, 2, 72, 7, { lx: -32 })
      .room(T('2・3番線ホーム', 'Platform 2/3', '2·3번선 승강장'), 'platform', 4, 9, 64, 14, { lx: -24, ly: -4.5 })
      .room(T('2番線', 'Track 2', '2번선'), 'track', 0, 23, 72, 7, { lx: -32 })
      .room(T('1番線', 'Track 1', '1번선'), 'track', 0, 30, 72, 7, { lx: -32 })
      .room(T('1番線ホーム', 'Platform 1', '1번선 승강장'), 'platform', 4, 37, 64, 10, { lx: -22, ly: -1.5 })
      .room(T('ホーム待合室', 'Platform shelter', '승강장 대합실'), 'public', 12, 13, 12, 6, { wall: 'glass', ly: -1.6 })
      // 駅舎
      .room(T('駅員室', 'Station office', '역무실'), 'office', 8, 47, 12, 10, { ly: 1 })
      .room(T('休憩室', 'Staff rest room', '휴게실'), 'washitsu', 8, 57, 6, 8, { ly: -2 })
      .room(T('遺失物保管庫', 'Lost and found', '유실물 보관소'), 'storage', 14, 57, 6, 8, { ly: 1.4 })
      .room(T('改札内', 'Paid area', '개찰구 안'), 'public', 20, 47, 16, 7, { ly: -1.6 })
      .room(T('コンコース', 'Concourse', '콘코스'), 'public', 20, 54, 16, 11, { lx: 2, ly: 1.5 })
      .room(T('信号機器室', 'Signal equipment room', '신호 기기실'), 'garage', 36, 47, 10, 7)
      .room(T('旧手荷物室', 'Old baggage room', '옛 수하물실'), 'storage', 46, 47, 10, 7, { gm: true, plName: '', note: T('引き取り手のないトランクが何十年も置かれている。内側から引っかいた跡', 'Unclaimed trunks left for decades. Scratches on the inside of one lid', '찾아가지 않은 트렁크가 수십 년째 놓여 있다. 하나에는 안쪽에서 긁은 자국') })
      .room(T('待合室', 'Waiting room', '대합실'), 'public', 36, 54, 10, 11, { ly: 1 })
      .room(N.toilet, 'wet', 46, 54, 10, 11, { ly: 1 })
      // 駅の外
      .room(T('関係者駐車場', 'Staff parking', '관계자 주차장'), 'road', 0, 47, 8, 18, { hideLabel: true })
      .room(T('駐車場', 'Parking', '주차장'), 'road', 56, 47, 16, 18, { ly: -5 })
      .room(T('駅前広場', 'Station square', '역 앞 광장'), 'porch', 0, 65, 72, 5, { lx: -26 })
      .room(T('ロータリー', 'Bus & taxi loop', '로터리'), 'road', 0, 70, 72, 7, { lx: 22 });
    fillYard(g, 0, 0, 72, 77, T('線路脇', 'Trackside', '선로변'), 'dirt');
    // 柵（線路の外側・ホームの端・ホームの裏）
    g.wall(0, 0, 72, 0, 'fence')
      .wall(4, 9, 4, 23, 'fence').wall(68, 9, 68, 23, 'fence').wall(4, 37, 4, 47, 'fence').wall(68, 37, 68, 47, 'fence')
      .wall(0, 47, 8, 47, 'fence').wall(56, 47, 72, 47, 'fence')
      // ホームの階段の手すり
      .wall(34, 14, 54, 14, 'rail').wall(34, 18, 54, 18, 'rail').wall(34, 43, 54, 43, 'rail');
    g.dh(21, 47, 12, -1, 0, 'open')                 // 改札内 ↔ 1番線ホーム
      .dh(21, 54, 14, 1, 0, 'open')                  // 改札（改札機の脇に幅広の通路）
      .dh(26, 65, 4, -1, 0, 'auto')                  // 駅の入口
      .dh(15.5, 47, 1.5, -1, 1)                      // 駅員室 → ホーム（駅員用）
      .dv(20, 48, 1.5, 1, 0)                         // 駅員室 → 改札内
      .dv(8, 55, 1.5, -1, 1)                         // 駅員室 → 関係者駐車場
      .dh(10, 57, 1.5, 1, 0, 'sliding')              // 休憩室
      .dh(17.5, 57, 1.5, 1, 1)                       // 遺失物保管庫
      .dv(36, 51.5, 1.5, 1, 1, 'steel')              // 信号機器室
      .dv(56, 49.5, 1.5, 1, 0, 'locked')             // 旧手荷物室（外から）
      .dv(36, 60.5, 2, 1, 0, 'sliding')              // 待合室
      .dv(46, 62.5, 1.5, 1, 1)                       // トイレ
      .dh(17, 13, 2, -1, 0, 'sliding').dh(17, 19, 2, 1, 0, 'sliding')   // ホーム待合室
      .wh(11, 47, 3).wh(9, 65, 3).wv(8, 59, 2)
      .wh(21, 65, 4, 'window2').wh(31, 65, 4, 'window2')
      .wh(37.5, 65, 3, 'window2').wh(41.5, 65, 3, 'window2')
      .wv(56, 56.5, 2).wv(56, 60.5, 2);
    // 線路と列車（3番線に1両の普通列車が停車中）
    trRailsH(g, 0, 72, 3.5, 24);
    trRailsH(g, 0, 72, 24.5, 24);
    trRailsH(g, 0, 72, 31.5, 24);
    g.item('train_car', 14, 2.5, 90);
    trEdgeH(g, 4, 68, 9);
    trEdgeH(g, 4, 68, 22, true);
    trEdgeH(g, 4, 68, 37);
    // 跨線橋への階段とEV（2Fと同じ位置）
    g.item('stairs', 34, 14, 90, { size: [4, 20] }).item('elevator', 63, 14, 90)
      .item('stairs', 34, 43, 90, { size: [4, 20] }).item('elevator', 63, 43, 90);
    // 島式ホーム
    g.item('bench', 12.3, 13.2, 0, { size: [4.5, 1] }).item('bench', 12.3, 17.8, 180, { size: [4.5, 1] })
      .item('bench', 19.2, 13.2, 0, { size: [4.5, 1] }).item('bench', 19.2, 17.8, 180, { size: [4.5, 1] })
      .item('station_bench', 26, 15.5).item('station_bench', 5.6, 15.5)
      .item('station_sign', 30.5, 15.75).item('vending', 4.4, 11.6, 270, { size: [2, 1.4] })
      .item('extinguisher', 57.4, 15.7).item('cctv', 34.6, 10.4);
    // 1番線ホーム
    g.item('station_bench', 5, 45.8).item('station_bench', 57.2, 45.8)
      .item('station_sign', 24, 40.8).item('vending', 66.4, 38.6, 90, { size: [2, 1.4] }).item('cctv', 20.8, 46.2);
    // 駅員室
    g.item('monitor_wall', 8, 48.2, 270, { size: [5, 0.6] }).item('desk_island', 10.6, 49.2, 0, { size: [4.6, 4.6] })
      .item('counter', 18.8, 52.6, 90, { size: [4.2, 1.2] }).item('safe', 8.2, 53.6).item('radio', 12, 47.1, 0, { size: [1.6, 0.8] })
      .item('locker', 13.5, 56, 180, { size: [3.6, 0.9] }).item('filing', 17.6, 47.1);
    g.item('futon', 8.3, 60.6).item('zataku', 10.8, 61.2, 0, { size: [2.4, 1.8] }).item('tv', 11.2, 64.1, 180, { size: [2.4, 0.8] });
    g.item('supply_shelf', 19, 59.2, 90, { size: [5, 0.9] }).item('cardboard', 14.4, 63.8).item('cardboard', 15.7, 63.8);
    // 改札・券売機・売店
    g.item('ticket_gate', 23, 51).item('ticket_gate', 29, 51)
      .item('ticket_machine', 35, 47.5, 90, { label: T('精算機', 'Fare adj.', '정산기') })
      .item('ticket_machine', 20, 57.6, 270).item('ticket_machine', 20, 59.3, 270).item('ticket_machine', 20, 61, 270)
      .item('kiosk', 33.6, 55, 90).item('atm', 32.2, 63.9, 180).item('plant', 21.2, 63.6);
    g.item('rack', 37, 47.3).item('rack', 38.6, 47.3).item('rack', 40.2, 47.3).item('control_panel', 43.4, 47.1, 0, { size: [2.4, 0.8] })
      .item('dist_board', 44.2, 52.9, 180, { size: [1.6, 0.6] });
    g.item('chest', 47, 47.4).item('big_crate', 52.6, 47.4).item('crate', 47.2, 51.8).item('crate', 49, 52.2, 0, { size: [1.3, 1.3] })
      .item('drag_marks', 50.6, 49.2, 90, { size: [1.2, 3.4] }).item('cursed_item', 53.6, 51.2);
    g.item('bench', 36.4, 55.4, 0, { size: [5, 1] }).item('bench', 36.4, 59.2, 0, { size: [5, 1] })
      .item('bench', 44.6, 55.4, 90, { size: [5, 1] }).item('vending', 42, 63.4, 180, { size: [2, 1.4] }).item('plant', 44.6, 63.6);
    g.item('toilet', 47.2, 54.2).item('toilet', 49.4, 54.2).item('toilet', 51.6, 54.2).item('toilet', 53.8, 54.2)
      .item('washbasin', 54.8, 58, 90, { size: [1.6, 1.1] }).item('washbasin', 54.8, 60.2, 90, { size: [1.6, 1.1] });
    // 駐車場・駅前
    g.item('car', 1.6, 48.6)
      .item('parking_stall', 56.5, 54.5).item('parking_stall', 61.5, 54.5).item('parking_stall', 66.5, 54.5)
      .item('car', 57, 55, 0).item('suv', 66.9, 54.7, 0)
      .item('car', 12, 71.5, 90).item('car', 37, 71.5, 90).item('road_sign', 52, 68.6, 0, { label: T('バス', 'Bus', '버스') })
      .item('streetlight', 6, 68.6).item('streetlight', 44, 68.6).item('garden_bench', 54, 65.3)
      .item('bush', 2, 65.4).item('bush', 62, 65.4).item('tree', 66, 66.2, 0, { size: [2.6, 2.6] })
      .item('crosswalk', 24, 70.5, 90, { size: [6, 8] }).item('utility_pole', 70.4, 68.6);
    g.text(T('← 上り（市街方面）', '← To the city', '← 상행(시내 방면)'), 10, 1, { size: 0.6 })
      .text(T('下り（山側方面） →', 'To the mountains →', '하행(산 방면) →'), 62, 1, { size: 0.6 });

    const u = makeFloor('2F');
    u.room(T('跨線橋', 'Footbridge', '과선교'), 'hall', 56, 12, 6, 35)
      .room(N.stairs, 'hall', 34, 14, 22, 4, { hideLabel: true })
      .room(N.stairs, 'hall', 34, 43, 22, 4, { hideLabel: true })
      .room(T('EV', 'EV', 'EV'), 'hall', 62, 13, 5, 5, { hideLabel: true, noWall: true })
      .room(T('EV', 'EV', 'EV'), 'hall', 62, 42, 5, 5, { hideLabel: true, noWall: true });
    u.dv(56, 14, 4, 1, 0, 'open').dv(56, 43, 4, 1, 0, 'open')
      .wh(57.5, 12, 3)
      .wv(56, 20, 3).wv(56, 25.5, 3).wv(56, 31, 3).wv(56, 36.5, 3)
      .wv(62, 20, 3).wv(62, 25.5, 3).wv(62, 31, 3).wv(62, 36.5, 3);
    u.item('stairs', 34, 14, 90, { size: [4, 20] }).item('elevator', 63, 14, 90)
      .item('stairs', 34, 43, 90, { size: [4, 20] }).item('elevator', 63, 43, 90)
      .item('cctv', 56.3, 12.3).item('bench', 61, 28, 90, { size: [3, 0.8] });
    u.text(T('2・3番線', 'Platforms 2/3', '2·3번선'), 59, 19.6, { size: 0.55 })
      .text(T('1番線・改札', 'Platform 1 / gates', '1번선·개찰구'), 59, 41.4, { size: 0.55 });
    return [g.f, u.f];
  }

  /* ---------- 交通：地下鉄駅（B2 島式ホーム・B1 改札階・地上の出入口） ---------- */

  // 階段・エスカレーター・EV・柱（B1とB2で同じ位置）
  function subwayCore(b) {
    const es = T('エスカレーター', 'Escalator', '에스컬레이터');
    b.item('stairs', 22, 11, 270, { size: [4, 14] }).item('stairs', 22, 15.5, 270, { size: [3, 14], label: es })
      .item('stairs', 50, 11, 270, { size: [4, 14] }).item('stairs', 50, 15.5, 270, { size: [3, 14], label: es })
      .item('elevator', 41, 13, 90)
      .item('stairs_u', 82, 8, 0, { size: [5.6, 6] });
    [13, 39, 47, 70].forEach(x => b.item('pillar', x - 0.4, 9.4, 0, { size: [0.8, 0.8] }).item('pillar', x - 0.4, 19.3, 0, { size: [0.8, 0.8] }));
    // 階段・エスカレーターの手すり
    [22, 50].forEach(x => b.wall(x, 11, x + 14, 11, 'rail').wall(x, 18.5, x + 14, 18.5, 'rail'));
  }

  function subway() {
    const p = makeFloor('B2');
    p.room(T('1番線', 'Track 1', '1번선'), 'track', 0, 0, 88, 7, { lx: -39 })
      .room(T('1・2番線ホーム', 'Platform 1/2', '1·2번선 승강장'), 'platform', 10, 7, 66, 16, { lx: -18, ly: -5.6 })
      .room(T('2番線', 'Track 2', '2번선'), 'track', 0, 23, 88, 7, { lx: -39 })
      .room(T('排水ポンプ室', 'Drainage pump room', '배수 펌프실'), 'garage', 0, 7, 10, 8)
      .room(T('旧連絡通路', 'Old connecting tunnel', '옛 연결 통로'), 'stone', 0, 15, 10, 8, { wall: 'stone', gm: true, plName: '', note: T('戦前に計画され放棄された旧線のホームへ続く通路。封印扉の向こうで、ときどき電車の音がする', 'Leads to the platform of a line abandoned before the war. Beyond the sealed door, a train is sometimes heard', '전쟁 전에 계획되었다가 버려진 옛 노선의 승강장으로 이어진다. 봉인된 문 너머에서 가끔 열차 소리가 난다') })
      .room(T('非常通路', 'Emergency passage', '비상 통로'), 'hall', 76, 7, 4, 16, { ly: 3 })
      .room(T('非常階段', 'Emergency stairs', '비상계단'), 'hall', 80, 7, 8, 8, { hideLabel: true })
      .room(T('換気機械室', 'Ventilation room', '환기 기계실'), 'garage', 80, 15, 8, 8, { ly: 1.8 });
    p.wall(0, 0, 88, 0, 'ext').wall(0, 30, 88, 30, 'ext')
      .wall(22, 11, 22, 18.5, 'rail').wall(50, 11, 50, 18.5, 'rail');
    p.dv(10, 8.5, 1.5, -1, 0, 'steel')                // 排水ポンプ室
      .dh(4, 15, 1.5, 1, 0, 'secret')                  // ポンプ室 → 旧連絡通路
      .dv(0, 18, 2, 1, 0, 'sealed')                    // 旧線への封印扉
      .dv(76, 14, 2, 1, 0, 'firedoor')                 // ホーム → 非常通路
      .dh(77.5, 7, 1.5, -1, 0, 'steel').dh(77.5, 23, 1.5, 1, 0, 'steel')   // 線路への保守用扉
      .dv(80, 8.5, 1.5, 1, 1, 'steel')                 // 非常階段
      .dv(80, 19.5, 1.5, 1, 1, 'steel');               // 換気機械室
    trRailsH(p, 0, 88, 1.5, 22);
    trRailsH(p, 0, 88, 24.5, 22);
    trEdgeH(p, 10, 76, 7);
    trEdgeH(p, 10, 76, 22, true);
    subwayCore(p);
    p.item('train_car', 11, 23.5, 90, { size: [6, 32] }).item('train_car', 43.5, 23.5, 90, { size: [6, 32] })
      .item('station_bench', 11, 14.5).item('station_bench', 65.5, 14.5)
      .item('station_sign', 29, 0.1).item('station_sign', 57, 0.1).item('station_sign', 29, 29.5, 180).item('station_sign', 57, 29.5, 180)
      .item('vending', 74.6, 9, 90, { size: [2, 1.4] }).item('extinguisher', 37, 16.2).item('alarm', 46.6, 10.4).item('alarm', 46.6, 18.6)
      .item('cctv', 20.6, 10.2).item('cctv', 48.6, 10.2).item('hydrant', 75.5, 18.4, 90, { size: [1.2, 0.4] })
      .item('pump', 0.3, 7.4).item('pump', 2.6, 7.4).item('control_panel', 7, 7.2, 0, { size: [2.4, 0.8] }).item('pipe', 0.2, 13.8, 0, { size: [5, 0.4] }).item('puddle', 5, 10.4)
      .item('debris', 1, 19.8, 0, { size: [3, 2.4], gm: true }).item('station_sign', 5.4, 15.8, 0, { gm: true, label: T('旧駅名標', 'Old sign', '옛 역명판') })
      .item('bones', 6.8, 20.2, 0, { gm: true }).item('candle', 3.4, 17).item('footprints', 4.6, 17.6, 90, { gm: true, size: [1, 3] })
      .item('cable_rack', 76.2, 17.6, 90, { size: [4, 0.5] }).item('extinguisher', 79.2, 21.9)
      .item('vent_unit', 82, 15.6).item('vent_unit', 85.6, 15.6).item('duct', 81, 21.6, 0, { size: [6.6, 1] });
    p.text(T('← 都心方面', '← Downtown', '← 도심 방면'), 82, 3.5, { size: 0.6 })
      .text(T('郊外方面 →', 'To the suburbs →', '교외 방면 →'), 82, 26.5, { size: 0.6 });

    const c = makeFloor('B1');
    c.room(T('コンコース', 'Concourse', '콘코스'), 'public', 0, 0, 18, 30, { ly: 3 })
      .room(T('出入口A', 'Exit A', 'A 출입구'), 'hall', 0, -8, 18, 8, { ly: 2.2 })
      .room(T('EVホール', 'Elevator hall', '엘리베이터 홀'), 'hall', 18, -8, 8, 8, { hideLabel: true })
      .room(T('改札内コンコース', 'Paid concourse', '개찰구 안 콘코스'), 'public', 18, 8, 58, 14, { lx: -4, ly: -5.5 })
      .room(T('電気室', 'Electrical room', '전기실'), 'garage', 18, 0, 16, 8)
      .room(T('空調機械室', 'Air handling room', '공조 기계실'), 'garage', 34, 0, 20, 8)
      .room(T('信号通信機器室', 'Signal & comms room', '신호 통신 기기실'), 'garage', 54, 0, 16, 8)
      .room(T('倉庫', 'Storeroom', '창고'), 'storage', 70, 0, 18, 8)
      .room(T('非常階段', 'Emergency stairs', '비상계단'), 'hall', 76, 8, 12, 8, { lx: -3 })
      .room(T('換気機械室', 'Ventilation room', '환기 기계실'), 'garage', 76, 16, 12, 14)
      .room(T('駅事務室', 'Station office', '역무실'), 'office', 18, 22, 14, 8, { ly: 1.5 })
      .room(T('駅員休憩室', 'Staff rest room', '역무원 휴게실'), 'bedroom', 32, 22, 8, 8, { ly: 1.6 })
      .room(N.toilet, 'wet', 40, 22, 12, 8, { ly: 1.6 })
      .room(T('清掃用具庫', 'Janitor closet', '청소 도구실'), 'storage', 52, 22, 8, 8, { ly: 1.6 })
      .room(T('清掃員控室', 'Cleaners\' room', '청소원 대기실'), 'office', 60, 22, 8, 8, { ly: 1.6 })
      .room(T('消火ポンプ室', 'Fire pump room', '소화 펌프실'), 'garage', 68, 22, 8, 8, { ly: 1.6 })
      .room(T('地下通路', 'Underground passage', '지하 통로'), 'hall', -20, 22, 20, 6)
      .room(T('出入口B', 'Exit B', 'B 출입구'), 'hall', -20, 28, 18, 10, { ly: -2.6 });
    c.dh(1, 0, 16, 1, 0, 'open')                      // 出入口A ↔ コンコース
      .dv(18, -7, 6, 1, 0, 'open')                     // 出入口A ↔ EVホール
      .dv(18, 8, 14, 1, 0, 'open')                     // 改札（改札機の脇に幅広の通路）
      .dh(23, 22, 1.5, 1, 0)                           // 駅事務室（改札内から）
      .dv(18, 28, 1.5, -1, 1)                          // 駅事務室（コンコースから）
      .dv(32, 26, 1.5, 1, 0)                           // 駅員休憩室
      .dh(45, 22, 1.5, 1, 0).dh(55, 22, 1.5, 1, 0).dh(63, 22, 1.5, 1, 0).dh(71, 22, 1.5, 1, 1, 'steel')
      .dh(26, 8, 1.5, -1, 0, 'steel').dh(43, 8, 1.5, -1, 0, 'steel').dh(61, 8, 1.5, -1, 0, 'steel').dh(72, 8, 1.5, -1, 0)
      .dv(76, 11.5, 2, 1, 0, 'firedoor')               // 非常階段
      .dv(76, 18, 1.5, 1, 0, 'steel')                  // 換気機械室
      .dv(0, 22.5, 5, -1, 0, 'open')                   // コンコース ↔ 地下通路
      .dh(-19, 28, 8, 1, 0, 'open')                    // 地下通路 ↔ 出入口B
      .dv(-20, 23, 4, -1, 0, 'shutter');               // 百貨店の地下へ（夜間は閉鎖）
    subwayCore(c);
    c.wall(36, 11, 36, 18.5, 'rail').wall(64, 11, 64, 18.5, 'rail')
      .wall(1, -3, 13, -3, 'rail').wall(-18, 33, -6, 33, 'rail');
    // 出入口の階段（地上と同じ位置）と地上へのEV
    c.item('stairs', 1, -7, 90, { size: [4, 12] }).item('elevator', 21.5, -7, 90)
      .item('stairs', -18, 33, 90, { size: [4, 12] });
    c.item('ticket_gate', 18, 10, 90).item('ticket_gate', 18, 16, 90)
      .item('ticket_machine', 21.6, 8.1, 0, { label: T('精算機', 'Fare adj.', '정산기') })
      .item('kiosk', 64.5, 8.1).item('vending', 37, 20.6, 180, { size: [2, 1.4] }).item('cctv', 21.4, 21.2)
      .item('ticket_machine', 17, 22.3, 90).item('ticket_machine', 17, 23.95, 90).item('ticket_machine', 17, 25.6, 90)
      .item('atm', 0, 10.4, 270).item('locker', 0, 13.5, 270, { size: [5, 1] })
      .item('plant', 0.2, 28.6).item('vending', 6.4, 28.6, 180, { size: [2, 1.4] }).item('station_sign', 7.5, 0.2, 0, { label: T('路線図', 'Route map', '노선도') })
      .item('cctv', 0.2, -7.8).item('road_sign', 14.2, -1.4, 0, { label: T('A出口', 'Exit A', 'A출구') });
    c.item('office_desk', 18.5, 24.4, 270, { size: [2.4, 1.4] }).item('office_desk', 21.6, 26.8).item('monitor_wall', 24.4, 22.2, 0, { size: [5, 0.6] })
      .item('safe', 30.6, 28.6).item('locker', 26.4, 29.1, 180, { size: [3.6, 0.9] }).item('radio', 30, 22.2, 0, { size: [1.6, 0.8] }).item('control_panel', 22.8, 29.2, 180, { size: [2.4, 0.8] });
    c.item('bunk_bed', 35.8, 22.2, 90).item('locker', 32.2, 29.1, 180, { size: [3, 0.9] }).item('table', 36, 26.6, 0, { size: [2.4, 1.4] }).item('chair', 36.7, 28.1, 180);
    c.item('toilet', 46.6, 28.4, 180).item('toilet', 48.4, 28.4, 180).item('toilet', 50.4, 28.4, 180)
      .item('washbasin', 40.2, 26, 270, { size: [1.6, 1.1] }).item('washbasin', 40.2, 28, 270, { size: [1.6, 1.1] });
    c.item('supply_shelf', 52.2, 29.1, 180).item('hand_cart', 58.4, 25.2).item('cardboard', 56.6, 28.8)
      .item('table', 62.4, 26.4, 0, { size: [2.4, 1.4] }).item('chair', 63, 25.3).item('locker', 60.2, 29.1, 180, { size: [3, 0.9] })
      .item('pump', 68.4, 28.4).item('pump', 71, 28.4).item('valve', 74.6, 28.8)
      .item('dist_board', 18.4, 0.2, 0, { size: [2, 0.6] }).item('control_panel', 21, 0.2).item('control_panel', 24, 0.2).item('cable_rack', 28, 0.2, 0, { size: [5.6, 0.6] }).item('breaker', 32.6, 6.9, 180)
      .item('vent_unit', 35, 0.4).item('vent_unit', 38, 0.4).item('vent_unit', 49, 0.4).item('duct', 41, 0.6, 0, { size: [7, 1] })
      .item('rack', 54.5, 0.3).item('rack', 56.1, 0.3).item('rack', 57.7, 0.3).item('rack', 66, 0.3).item('control_panel', 59.6, 0.2)
      .item('supply_shelf', 75, 0.2).item('supply_shelf', 78.4, 0.2).item('cardboard', 84, 0.4).item('cardboard', 84, 1.6).item('pallet', 81.8, 4.6)
      .item('extinguisher', 77, 14.9).item('supply_shelf', 76.2, 8.2, 270, { size: [3, 0.8] })
      .item('vent_unit', 82, 20).item('vent_unit', 85.4, 20).item('em_generator', 80, 27.2).item('duct', 77, 16.2, 0, { size: [6, 1] });
    c.item('painting', -16, 22.1, 0, { label: T('ポスター', 'Posters', '포스터') }).item('painting', -9, 22.1, 0, { label: T('ポスター', 'Posters', '포스터') })
      .item('npc_sitting', -6, 26.2, 180).item('cctv', -19.8, 22.2).item('cctv', -19.8, 28.2)
      .item('road_sign', -3.6, 36.4, 0, { label: T('B出口', 'Exit B', 'B출구') });
    c.text(T('← 百貨店 地下（夜間閉鎖）', '← Department store (closed at night)', '← 백화점 지하(야간 폐쇄)'), -10, 23.4, { size: 0.5 });

    const s = makeFloor(T('地上', 'Street level', '지상'));
    s.room(T('オフィスビル', 'Office tower', '오피스 빌딩'), 'roof', -20, -16, 40, 6)
      .room(T('商業ビル', 'Shopping building', '상업 빌딩'), 'roof', 20, -16, 36, 6)
      .room(T('マンション', 'Apartments', '맨션'), 'roof', 56, -16, 32, 6)
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', -20, -10, 108, 10, { hideLabel: true })
      .room(T('中央通り', 'Main street', '중앙로'), 'road', -20, 0, 108, 30, { lx: 20, ly: -11 })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', -20, 30, 108, 10, { hideLabel: true })
      .room(T('百貨店', 'Department store', '백화점'), 'roof', -20, 40, 56, 6)
      .room(T('ホテル', 'Hotel', '호텔'), 'roof', 36, 40, 52, 6)
      .room(T('出入口A', 'Exit A', 'A 출입구'), 'hall', 0, -8, 15, 6, { hideLabel: true })
      .room(T('エレベーター', 'Elevator', '엘리베이터'), 'hall', 18, -8, 8, 6, { hideLabel: true })
      .room(T('出入口B', 'Exit B', 'B 출입구'), 'hall', -19, 32, 15, 6, { hideLabel: true });
    s.dv(15, -7, 4, 1, 0, 'shutter')                  // 出入口A（終電後はシャッター）
      .dv(18, -6.5, 3, -1, 0, 'auto')                   // エレベーター
      .dv(-4, 33, 4, 1, 0, 'shutter')                   // 出入口B
      .dh(-2, -10, 3, -1, 0, 'auto').dh(36, -10, 3, -1, 0, 'auto').dh(70, -10, 2, -1, 0, 'door2')
      .dh(4, 40, 4, 1, 0, 'auto').dh(58, 40, 3, 1, 0, 'auto')
      .wh(-14, -10, 6, 'window2').wh(8, -10, 6, 'window2').wh(24, -10, 6, 'window2').wh(44, -10, 6, 'window2').wh(60, -10, 4).wh(78, -10, 4)
      .wh(-14, 40, 8, 'window2').wh(16, 40, 8, 'window2').wh(44, 40, 6, 'window2').wh(70, 40, 6, 'window2');
    s.item('stairs', 1, -7, 90, { size: [4, 12] }).item('elevator', 21.5, -7, 90).item('stairs', -18, 33, 90, { size: [4, 12] })
      .item('road_sign', 15.4, -9.6, 0, { label: T('地下鉄', 'Metro', '지하철') }).item('road_sign', -3.4, 38.6, 0, { label: T('地下鉄', 'Metro', '지하철') })
      .item('vent_unit', 79, 33, 0, { size: [6, 4], label: T('換気塔', 'Vent shaft', '환기탑') })
      .item('crosswalk', 28, 0, 0, { size: [8, 30] })
      .item('traffic_light', 26.6, -1, 0).item('traffic_light', 36.2, 30.2, 180)
      .item('road_sign', 52, 30.6, 0, { label: T('バス停', 'Bus stop', '버스 정류장') }).item('bench', 54, 37.8, 0, { size: [3, 0.9] })
      .item('car', 6, 2.5, 90).item('van', 60, 9, 90).item('car', 44, 16.5, 270).item('truck', -12, 23, 270, { size: [4.6, 16] }).item('car', 64, 23.5, 270)
      .item('road_arrow', 40, 3, 90).item('road_arrow', 12, 10.5, 90).item('road_arrow', 50, 17, 270).item('road_arrow', 14, 25, 270)
      .item('manhole', 46, 11).item('manhole', 10, 19)
      .item('streetlight', -16, -1.2).item('streetlight', 30, -1.2).item('streetlight', 74, -1.2)
      .item('streetlight', -10, 30.2).item('streetlight', 30, 30.2).item('streetlight', 70, 30.2)
      .item('tree', 4, 34.2, 0, { size: [2.2, 2.2] }).item('tree', 20, 34.2, 0, { size: [2.2, 2.2] }).item('tree', 44, 34.2, 0, { size: [2.2, 2.2] }).item('tree', 64, 34.2, 0, { size: [2.2, 2.2] })
      .item('guardrail', -12, 0.1, 0, { size: [8, 0.5] }).item('guardrail', 44, 0.1, 0, { size: [10, 0.5] });
    s.wall(-20, 15, 28, 15, 'rail').wall(36, 15, 88, 15, 'rail');
    return [p.f, c.f, s.f];
  }

  /* ---------- 交通：立体駐車場（自走式・1F〜屋上） ---------- */

  // 区画に車を置く。pattern は 1 = 車あり、0 = 空き。rot 0 = 北の列、180 = 南の列、90 = 横向き
  function trParkCars(b, slots, pattern, seed) {
    const kinds = ['car', 'suv', 'car', 'van', 'car'];
    slots.forEach(([x, y, rot], i) => {
      if (pattern[i] !== '1') return;
      const t = kinds[(i + seed) % kinds.length];
      const a = M.ASSET[t];
      if (rot === 90) b.item(t, x + (10 - a.h) / 2, y + (5 - a.w) / 2, 90);
      else b.item(t, x + (5 - a.w) / 2, y + (10 - a.h) / 2, rot);
    });
  }

  // 各階に共通：階段・EV（全階同じ位置）、車路、北10台・南8台の区画、柱
  function towerParkDeck(b, cat, north, south, seed) {
    b.room(N.stairs, 'hall', 52, 0, 6, 10, { hideLabel: true })
      .room(N.evHall, 'hall', 58, 0, 6, 10, { hideLabel: true })
      .room(T('車路', 'Driving aisle', '차로'), cat, 0, 10, 64, 12, { lx: -24, ly: 0.2 });
    b.dh(53, 10, 1.5, 1, 0, 'steel').dh(59.5, 10, 3, 1, 0, 'auto');
    b.item('stairs_u', 52.5, 0.5, 0, { size: [5, 8] }).item('elevator', 59, 0.5).item('extinguisher', 57.2, 9.2);
    const nSlots = [], sSlots = [];
    for (let i = 0; i < 10; i++) { b.item('parking_stall', 1 + i * 5, 0); nSlots.push([1 + i * 5, 0, 0]); }
    for (let i = 0; i < 8; i++) { b.item('parking_stall', 12 + i * 5, 22, 180); sSlots.push([12 + i * 5, 22, 180]); }
    trParkCars(b, nSlots, north, seed);
    trParkCars(b, sSlots, south, seed + 2);
    [15.5, 30.5, 45.5].forEach(x => b.item('pillar', x, 0).item('pillar', x, 9));
    [11.5, 26.5, 41.5].forEach(x => b.item('pillar', x, 22).item('pillar', x, 31));
    // 左側通行：北側を東へ、南側を西へ
    b.item('road_arrow', 22, 10.6, 90).item('road_arrow', 36, 17.4, 270);
  }

  // スロープ。open = 'w' / 'e'（この階につながる端）。手すりで区切る
  function towerParkRamp(b, y, name, open) {
    b.room(name, 'road', 12, y, 40, 6, { lx: open === 'w' ? -10 : 10 });
    b.wall(open === 'w' ? 52 : 12, y, open === 'w' ? 52 : 12, y + 6, 'rail');
    b.item('road_arrow', open === 'w' ? 32 : 26, y + 1, open === 'w' ? 90 : 270);
  }

  function parkingTower() {
    const g = makeFloor('1F');
    towerParkDeck(g, 'road', '1101101011', '01101110', 0);
    towerParkRamp(g, 32, T('スロープ（2Fへ）', 'Ramp (to 2F)', '경사로(2층으로)'), 'w');
    g.room(T('倉庫', 'Storeroom', '창고'), 'storage', 12, 38, 18, 6, { lx: -3 })
      .room(T('旧ポンプ室', 'Old pump room', '옛 펌프실'), 'garage', 30, 38, 22, 6, { gm: true, plName: '', note: T('使われなくなったポンプ室。床の点検口の下に、誰かが寝泊まりしていた跡がある', 'A disused pump room. Below the floor hatch, signs that someone has been living there', '쓰이지 않게 된 펌프실. 바닥 점검구 아래에 누군가 지낸 흔적이 있다') })
      .room(T('管理室', 'Attendant booth', '관리실'), 'office', 56, 22, 8, 8, { ly: 1.4 })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 64, -4, 4, 52, { hideLabel: true })
      .room(T('道路', 'Street', '도로'), 'road', 68, -4, 10, 52, { ly: 14 });
    fillYard(g, 0, 0, 64, 44, T('駐車場', 'Parking', '주차장'), 'road');
    g.wall(0, 0, 52, 0, 'fence').wall(0, 0, 0, 44, 'fence').wall(0, 44, 12, 44, 'fence').wall(52, 44, 64, 44, 'fence').wall(64, 30, 64, 44, 'fence')
      .wall(12, 32, 52, 32, 'rail');
    g.dv(12, 40, 1.5, -1, 1)                           // 倉庫
      .dv(52, 40, 1.5, 1, 0, 'locked')                 // 旧ポンプ室
      .dv(56, 25.5, 1.5, -1, 0)                        // 管理室
      .dv(64, 5.5, 1.5, 1, 0)                          // EVホール → 歩道（歩行者の出入口）
      .wh(58.5, 22, 3).wv(64, 23.5, 2).wv(64, 26.5, 2);
    // 入口と出口：発券機・精算機・ゲート
    g.item('guardrail', 57.5, 15.7, 0, { size: [6, 0.6] })
      .item('ticket_machine', 61.4, 14.6, 180, { label: T('精算機', 'Pay', '정산기') })
      .item('ticket_machine', 58, 16.3, 0, { label: T('発券機', 'Ticket', '발권기') })
      .item('handrail', 63.4, 10.2, 90, { size: [5.4, 0.3] }).item('handrail', 57, 16.4, 90, { size: [5.4, 0.3] })
      .item('road_arrow', 54, 10.8, 90).item('road_arrow', 60.4, 17.6, 270)
      .item('parking_stall', 53, 33, 90).item('road_sign', 62.6, 38.6, 0, { label: T('車いす', 'Accessible', '휠체어') })
      .item('office_desk', 58.4, 27.6, 180).item('chair', 59.1, 26.4).item('monitor_wall', 63.3, 22.6, 90, { size: [3.6, 0.6] }).item('safe', 56.3, 22.3).item('cctv', 63.2, 9.2)
      .item('cardboard', 26.6, 38.3).item('cardboard', 27.8, 38.3).item('supply_shelf', 13, 43, 180, { size: [6, 0.9] }).item('cone', 20.6, 39.6).item('cone', 21.5, 39.6)
      .item('pump', 31, 38.4, 0, { gm: true }).item('pipe', 33.4, 38.4, 0, { size: [8, 0.4], gm: true }).item('trapdoor', 44, 40, 0, { gm: true, size: [1.6, 1.6] })
      .item('bag', 47, 42.4, 0, { gm: true }).item('black_stain', 38, 40.6, 0, { size: [3, 2], gm: true })
      .item('road_sign', 64.4, 9, 0, { label: T('P 空', 'P Vacant', 'P 빈자리') }).item('streetlight', 66.6, 30).item('vending', 64.3, 1.2, 90, { size: [2, 1.4] })
      .item('car', 70.5, 2, 180).item('car', 73.5, 30, 0);
    g.text(T('出口', 'OUT', '출구'), 60.6, 12.4, { size: 0.55 }).text(T('入口', 'IN', '입구'), 61, 20.6, { size: 0.55 });

    const f2 = makeFloor('2F');
    towerParkDeck(f2, 'rooftop', '0111011010', '11011011', 1);
    towerParkRamp(f2, 32, T('スロープ（1Fへ）', 'Ramp (to 1F)', '경사로(1층으로)'), 'e');
    towerParkRamp(f2, 38, T('スロープ（3Fへ）', 'Ramp (to 3F)', '경사로(3층으로)'), 'e');
    fillYard(f2, 0, 0, 64, 44, T('駐車場', 'Parking', '주차장'), 'rooftop');
    f2.wall(12, 32, 52, 32, 'rail').wall(12, 38, 52, 38, 'rail').wall(12, 44, 52, 44, 'rail');
    f2.item('parking_stall', 1, 33, 180).item('parking_stall', 6, 33, 180);
    trParkCars(f2, [[1, 33, 180], [6, 33, 180]], '10', 3);

    const f3 = makeFloor('3F');
    towerParkDeck(f3, 'rooftop', '0010010100', '01000110', 2);
    towerParkRamp(f3, 32, T('スロープ（屋上へ）', 'Ramp (to roof)', '경사로(옥상으로)'), 'w');
    towerParkRamp(f3, 38, T('スロープ（2Fへ）', 'Ramp (to 2F)', '경사로(2층으로)'), 'w');
    fillYard(f3, 0, 0, 64, 44, T('駐車場', 'Parking', '주차장'), 'rooftop');
    f3.wall(12, 32, 52, 32, 'rail').wall(12, 38, 52, 38, 'rail').wall(12, 44, 52, 44, 'rail');
    f3.item('parking_stall', 53, 33, 180).item('parking_stall', 58, 33, 180);
    trParkCars(f3, [[53, 33, 180], [58, 33, 180]], '01', 1);
    f3.item('cone', 30, 13).item('cone', 31.2, 13).item('tape', 26, 14.5, 0, { size: [6, 0.35] });

    const r = makeFloor(T('屋上', 'Roof', '옥상'));
    towerParkDeck(r, 'rooftop', '0000100001', '00010000', 3);
    towerParkRamp(r, 32, T('スロープ（3Fへ）', 'Ramp (to 3F)', '경사로(3층으로)'), 'e');
    r.room(T('屋上駐車場', 'Rooftop parking', '옥상 주차장'), 'rooftop', 0, 32, 12, 12, { hideLabel: true });
    fillYard(r, 0, 0, 64, 44, T('屋上駐車場', 'Rooftop parking', '옥상 주차장'), 'rooftop');
    r.wall(12, 32, 52, 32, 'rail').wall(12, 38, 52, 38, 'rail');
    r.item('parking_stall', 1, 33, 180).item('parking_stall', 6, 33, 180);
    trParkCars(r, [[1, 33, 180], [6, 33, 180]], '01', 4);
    // スロープ上の屋上は設備置き場
    r.item('streetlight', 15.5, 21).item('streetlight', 30.5, 21).item('streetlight', 45.5, 21).item('streetlight', 1, 29).item('streetlight', 62, 29)
      .item('antenna', 14, 40.6).item('vent_unit', 44, 40.6).item('vent_unit', 47, 40.6).item('ac_unit', 18, 43, 180).item('ac_unit', 20.2, 43, 180).item('vent_unit', 61.4, 41.4);
    r.text(T('屋上駐車場', 'Rooftop parking', '옥상 주차장'), 32, 41, { size: 0.6 });
    return [g.f, f2.f, f3.f, r.f];
  }

  /* ---------- 交通：地下駐車場（B2・B1・地上の出入口） ---------- */

  // B1・B2 共通：階段・EV・非常階段・駐車区画・柱・車路の矢印。pats = [北, 中央北, 中央南, 南] の駐車パターン
  function ugParkCore(b, pats, seed) {
    b.room(T('駐車場', 'Car park', '주차장'), 'industrial', 0, 0, 84, 64, { lx: -12, ly: -16 })
      .room(N.stairs, 'hall', 0, 0, 6, 10, { hideLabel: true })
      .room(N.evHall, 'hall', 6, 0, 6, 10, { hideLabel: true })
      .room(T('非常階段', 'Emergency stairs', '비상계단'), 'hall', 0, 54, 6, 10, { hideLabel: true });
    b.dh(1, 10, 1.5, -1, 0, 'steel').dh(7.5, 10, 3, 1, 0, 'auto').dh(1.5, 54, 2, 1, 0, 'firedoor');
    b.item('stairs_u', 0.5, 0.5, 0, { size: [5, 8] }).item('elevator', 7, 0.5).item('stairs_u', 0.5, 56, 180, { size: [5, 8] });
    // 柱スパン 8m（16マス）に 3 台ずつ。区画は幅 2.4m・奥行 5m
    [[0, 0], [22, 180], [32, 0], [54, 180]].forEach(([y, rot], r) => {
      const slots = [];
      [12, 28, 44].forEach(L => { for (let j = 0; j < 3; j++) slots.push([L + 0.8 + j * 4.8, y, rot]); });
      slots.forEach(([x]) => b.item('parking_stall', x, y, rot, { size: [4.8, 10] }));
      trParkCars(b, slots, pats[r], seed + r);
    });
    const col = { size: [1.2, 1.2] };
    [27.4, 43.4].forEach(x => b.item('pillar', x, 8.8, 0, col).item('pillar', x, 54, 0, col));
    [11.4, 27.4, 43.4, 59.4].forEach(x => b.item('pillar', x, 22, 0, col).item('pillar', x, 40.8, 0, col));
    // 左側通行の車路
    b.item('road_arrow', 20, 11, 90).item('road_arrow', 46, 11, 90).item('road_arrow', 30, 19, 270).item('road_arrow', 54, 19, 270)
      .item('road_arrow', 22, 43, 90).item('road_arrow', 40, 51, 270)
      .item('road_arrow', 1.5, 36, 0).item('road_arrow', 8.5, 28, 180).item('road_arrow', 61.5, 34, 0).item('road_arrow', 68.5, 28, 180);
    b.item('hydrant', 0, 30, 90, { size: [1.2, 0.4] }).item('extinguisher', 0.1, 32).item('hydrant', 27.6, 55.4, 0, { size: [1.2, 0.4] })
      .item('cctv', 12.3, 10.3).item('cctv', 59.1, 21.2).item('cctv', 0.2, 52.8).item('alarm', 5.4, 10.2);
  }

  function parkingUnderground() {
    const b2 = makeFloor('B2');
    ugParkCore(b2, ['000110010', '100010000', '000001101', '010000011'], 3);
    b2.room(T('排水ポンプ室', 'Drainage pump room', '배수 펌프실'), 'garage', 60, 0, 12, 10, { ly: -0.8 })
      .room(T('受水槽室', 'Water tank room', '수수조실'), 'garage', 72, 0, 12, 22, { ly: 3.6 })
      .room(T('消火設備室', 'Fire suppression room', '소화 설비실'), 'garage', 6, 54, 6, 10, { hideLabel: true })
      .room(T('スロープ（B1へ）', 'Ramp (to B1)', '경사로(B1로)'), 'road', 72, 22, 6, 42, { hideLabel: true })
      .room(T('封鎖区画', 'Sealed void', '봉쇄 구역'), 'garage', 78, 22, 6, 42, { gm: true, plName: '', ly: -6, note: T('地上へのスロープの真下にある点検用の空間。図面上は埋め戻したことになっているが、受水槽室の奥の扉から入れる。誰かがここに人を閉じ込めていた', 'The inspection void under the street ramp. The drawings say it was filled in, but a door at the back of the water tank room still opens. Someone has been keeping a person here', '지상 경사로 바로 아래의 점검용 공간. 도면상으로는 메웠다고 되어 있지만 수수조실 안쪽 문으로 들어갈 수 있다. 누군가 여기에 사람을 가둬 두고 있었다') });
    b2.wall(72, 64, 78, 64, 'ext');
    b2.dh(62, 10, 1.5, 1, 0, 'steel')                  // 排水ポンプ室
      .dv(72, 15, 1.5, 1, 0, 'steel')                  // 受水槽室
      .dh(80, 22, 1.5, -1, 0, 'locked')                // 受水槽室 → 封鎖区画
      .dh(8, 54, 1.5, -1, 0, 'steel')                  // 消火設備室
      .dv(72, 54, 10, 1, 0, 'open');                   // スロープの下端
    b2.item('pump', 60.4, 0.3).item('pump', 63, 0.3).item('pit', 68.6, 0.6, 0, { size: [2.4, 2.4] }).item('pipe', 65.4, 0.3, 0, { size: [3, 0.4] })
      .item('control_panel', 60.2, 6.4, 90, { size: [2.4, 0.8] }).item('valve', 69.6, 4.2).item('puddle', 64, 7.6)
      .item('big_tank', 72.6, 0.6).item('big_tank', 78.4, 0.6).item('pump', 80.6, 8.4).item('pipe', 77, 6.4, 90, { size: [5, 0.4] })
      .item('control_panel', 81, 18.8, 180, { size: [2.4, 0.8] }).item('valve', 76, 18.6)
      .item('ind_tank', 8.6, 60.6).item('control_panel', 6.2, 58, 90, { size: [2.4, 0.8] }).item('valve', 7, 62.8).item('pipe', 8.6, 55.6, 0, { size: [3, 0.4] })
      .item('gutter', 72, 52.6, 0, { size: [6, 0.6] }).item('road_arrow', 74, 36, 0).item('traffic_light', 76.4, 46, 90)
      .item('manhole', 50, 46).item('puddle', 36, 13)
      .item('drag_marks', 80.3, 25, 0, { gm: true }).item('cardboard', 82.4, 32).item('cardboard', 82.4, 33.2).item('blood', 79.6, 44, 0, { gm: true })
      .item('npc_bound', 80, 53, 0, { gm: true }).item('chains', 78.6, 56, 0, { gm: true }).item('bag', 82.2, 60.8, 0, { gm: true }).item('flashlight', 79, 61.6);
    b2.text(T('B1へ ↑', 'B1 ↑', 'B1로 ↑'), 75, 30, { size: 0.55 }).text(T('B2', 'B2', 'B2'), 30, 47.6, { size: 1 });

    const b1 = makeFloor('B1');
    ugParkCore(b1, ['101101110', '011011101', '110100110', '010011011'], 0);
    b1.room(T('管理室', 'Management office', '관리실'), 'office', 60, 0, 12, 10, { ly: 1 })
      .room(T('電気室', 'Electrical room', '전기실'), 'garage', 72, 0, 12, 10, { ly: 2.2 })
      .room(T('倉庫', 'Storeroom', '창고'), 'storage', 6, 54, 6, 10, { hideLabel: true })
      .room(T('機械室', 'Machine room', '기계실'), 'garage', 60, 54, 12, 10, { ly: -0.6 })
      .room(T('スロープ（B2へ）', 'Ramp (to B2)', '경사로(B2로)'), 'road', 72, 22, 6, 42, { hideLabel: true })
      .room(T('スロープ（地上へ）', 'Ramp (to street)', '경사로(지상으로)'), 'road', 78, 22, 6, 42, { hideLabel: true });
    b1.wall(78, 22, 78, 64, 'ext').wall(84, 22, 84, 64, 'ext').wall(72, 64, 78, 64, 'ext');
    b1.dh(62, 10, 1.5, 1, 0)                          // 管理室
      .dv(72, 6, 1.5, 1, 1, 'steel')                   // 管理室 → 電気室
      .dh(8, 54, 1.5, -1, 0)                           // 倉庫
      .dh(65, 54, 1.5, -1, 0, 'steel')                 // 機械室
      .dh(72, 22, 6, -1, 0, 'open').dh(78, 22, 6, -1, 0, 'open');
    // 管理室：防犯カメラのモニター・台帳・鍵箱
    b1.item('monitor_wall', 62.5, 0.2, 0, { size: [6, 0.6] }).item('office_desk', 63.8, 2).item('chair', 64.5, 3.6, 180)
      .item('locker', 60.2, 5.6, 90, { size: [3, 1] }).item('filing', 69.6, 0.3).item('safe', 70.6, 8.6).item('desk', 66.8, 7.4, 180, { size: [2.4, 1.2] })
      .item('dist_board', 74.4, 0.2).item('dist_board', 77, 0.2).item('breaker', 79.6, 0.2).item('control_panel', 75, 8.8, 180, { size: [3, 1] })
      .item('cable_rack', 83.2, 1, 90, { size: [6, 0.6] }).item('control_panel', 79.6, 8.8, 180, { size: [3, 1] })
      .item('supply_shelf', 10.9, 57.4, 90, { size: [3, 1] }).item('cone', 6.4, 61).item('cone', 6.4, 62.2).item('barricade', 8, 62.8, 0, { size: [3, 0.7] })
      .item('vent_unit', 60.6, 60.6, 0, { size: [2.6, 2.6] }).item('vent_unit', 63.6, 60.6, 0, { size: [2.6, 2.6] }).item('duct', 60.6, 56.4, 0, { size: [6, 1] })
      .item('em_generator', 67.4, 61.4).item('control_panel', 69.2, 55.2, 90, { size: [2.4, 0.8] })
      .item('road_arrow', 74, 32, 180).item('road_arrow', 80, 32, 0).item('traffic_light', 77, 24, 90).item('traffic_light', 82.8, 24, 90)
      .item('road_sign', 70.6, 11.2, 0, { label: T('出口', 'Exit', '출구') }).item('cone', 40, 13.4).item('puddle', 20, 45);
    b1.text(T('B2へ ↓', 'B2 ↓', 'B2로 ↓'), 75, 46, { size: 0.55 }).text(T('地上へ ↓', 'Street ↓', '지상 ↓'), 81, 46, { size: 0.55 })
      .text(T('B1', 'B1', 'B1'), 30, 47.6, { size: 1 });

    const g = makeFloor(T('地上', 'Street level', '지상'));
    g.room(T('出入口', 'Entrance', '출입구'), 'hall', 0, 0, 12, 10, { wall: 'glass', ly: 3.8 })
      .room(T('非常口', 'Emergency exit', '비상구'), 'hall', 0, 54, 6, 10, { hideLabel: true })
      .room(T('スロープ（B1へ）', 'Ramp (to B1)', '경사로(B1로)'), 'road', 78, 34, 6, 30, { hideLabel: true })
      .room(T('出入口ゲート', 'Car gate', '차량 게이트'), 'road', 72, 64, 12, 8, { hideLabel: true })
      .room(T('植え込み', 'Planting', '화단'), 'garden', 16, 16, 20, 10, { hideLabel: true })
      .room(T('植え込み', 'Planting', '화단'), 'garden', 44, 16, 20, 10, { hideLabel: true })
      .room(T('植え込み', 'Planting', '화단'), 'garden', 16, 38, 20, 10, { hideLabel: true })
      .room(T('植え込み', 'Planting', '화단'), 'garden', 44, 38, 20, 10, { hideLabel: true })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 0, 72, 84, 4, { hideLabel: true })
      .room(T('道路', 'Street', '도로'), 'road', 0, 76, 84, 10, { lx: -30, ly: 2.4 });
    fillYard(g, 0, 0, 84, 72, T('広場', 'Plaza', '광장'), 'porch');
    g.wall(12, 0, 84, 0, 'fence').wall(0, 10, 0, 54, 'fence').wall(0, 64, 0, 72, 'fence').wall(84, 0, 84, 72, 'fence')
      .wall(78, 34, 78, 64, 'rail').wall(78, 34, 84, 34, 'rail').wall(72, 64, 78, 64, 'rail').wall(72, 64, 72, 72, 'rail');
    g.dh(6, 10, 3, 1, 0, 'auto')                       // 出入口（階段・EV）
      .dh(1.5, 54, 2, -1, 0, 'firedoor');              // 非常口
    g.item('stairs_u', 0.5, 0.5, 0, { size: [5, 8] }).item('elevator', 7, 0.5).item('stairs_u', 0.5, 56, 180, { size: [5, 8] })
      // ゲート：入る車は西側、出る車は東側（左側通行）
      .item('guardrail', 77.6, 67, 90, { size: [4, 0.8] })
      .item('ticket_machine', 76.6, 67.6, 90, { label: T('発券機', 'Ticket', '발권기') })
      .item('ticket_machine', 78.4, 68.8, 270, { label: T('精算機', 'Pay', '정산기') })
      .item('handrail', 72.2, 66.4, 0, { size: [5.4, 0.3] }).item('handrail', 78.4, 71.2, 0, { size: [5.4, 0.3] })
      .item('traffic_light', 82.6, 62, 0).item('road_arrow', 80, 44, 0).item('cctv', 83.2, 64.3)
      .item('road_sign', 70.4, 70.6, 0, { label: T('P 地下駐車場', 'P Car park', 'P 지하 주차장') })
      .item('bollard_post', 70.6, 72.4).item('bollard_post', 1, 72.4).item('bollard_post', 13, 10.6)
      .item('vent_unit', 63, 56.6, 0, { size: [4, 4] })
      .item('manhole', 79, 5).item('manhole', 64, 4)
      .item('tree', 18, 17.5).item('tree', 30, 21).item('tree', 47, 17.5).item('tree', 59, 21).item('tree', 22, 41.5).item('tree', 52, 39.5)
      .item('bush', 33, 40).item('bush', 46, 45.6).item('bush', 17, 24)
      .item('garden_bench', 22, 13.4).item('garden_bench', 50, 13.4).item('garden_bench', 22, 49.4, 180).item('garden_bench', 50, 49.4, 180)
      .item('streetlight', 14, 30).item('streetlight', 66, 30).item('streetlight', 40, 60)
      .item('fountain', 38, 30).item('garden_bench', 33.6, 30.5, 90).item('garden_bench', 45.4, 30.5, 270)
      .item('vending', 12.4, 0.2).item('vending', 14.6, 0.2).item('kiosk', 66, 0.4).item('hedge', 22, 0.2).item('hedge', 40, 0.2)
      .item('car', 10, 76.6, 90).item('van', 52, 81.4, 270).item('utility_pole', 30, 72.6);
    g.text(T('↑ B1', '↑ B1', '↑ B1'), 81, 52, { size: 0.6 }).text(T('地下駐車場 入口', 'Car park entrance', '지하 주차장 입구'), 66, 68, { size: 0.55 });
    return [b2.f, b1.f, g.f];
  }

  /* ---------- 交通：客船（下甲板・客室甲板・遊歩甲板・ブリッジ甲板。船首は東） ---------- */

  // 通路沿いの2人部屋。north = 通路の北側（ドアは南の壁）。bunk = 2段ベッドとロッカー
  function shipCabin(b, x, w, north, bunk) {
    const top = north ? 0.3 : 19.7, rot = north ? 0 : 180;
    b.item(bunk ? 'bunk_bed' : 'bed_single', x + 0.3, top, rot);
    if (bunk) b.item('locker', x + w - 1.3, north ? 0.3 : 20.7, north ? 90 : 270, { size: [3, 1] });
    else b.item('bed_single', x + w - 2.3, top, rot);
    b.item('desk', x + w - 2.7, north ? 8.6 : 14.2, north ? 180 : 0, { size: [2.4, 1.2] });
    b.dh(x + 1, north ? 10 : 14, 1.5, north ? -1 : 1, 0)
      .wh(x + w / 2 - 1, north ? 0 : 24, 2);   // 丸窓
  }

  // 乗員用階段（全甲板で同じ位置）と客用階段（客室甲板から上）
  function shipStairs(b, crewY0, passenger) {
    b.room(T('乗員用階段', 'Crew stairs', '승무원 계단'), 'hall', 50, crewY0, 6, 10 - crewY0, { hideLabel: true })
      .dh(52, 10, 1.5, -1, 0)
      .item('stairs_u', 50.5, 4.5, 0, { size: [5, 4] });
    if (crewY0 === 0) b.item('locker', 51.5, 0.3, 0, { size: [3, 1] });
    if (passenger) b.item('stairs_u', 23, 10, 270, { size: [5, 5] });
  }

  function ship() {
    const NOTE_HOLD = T('木箱の陰の隠し扉の奥。乗客名簿にない誰かが、ここに身を潜めて航海している', 'Behind a secret door hidden by crates. Someone who is not on the passenger list is riding out the voyage here', '나무 상자 뒤에 숨겨진 비밀문 안쪽. 승객 명단에 없는 누군가가 여기 숨어서 항해하고 있다');

    // 下甲板：操舵機室・機関室・船員区画・貨物庫・錨鎖庫
    const d1 = makeFloor(T('下甲板', 'Lower deck', '하갑판'));
    d1.room(T('操舵機室', 'Steering gear room', '조타기실'), 'garage', 0, 0, 8, 24, { ly: -6 })
      .room(T('機関室', 'Engine room', '기관실'), 'industrial', 8, 0, 26, 24)
      .room(T('機関制御室', 'Engine control room', '기관 제어실'), 'office', 26, 0, 8, 8, { wall: 'glass', ly: 1.4 })
      .room(T('船員通路', 'Crew corridor', '선원 통로'), 'hall', 34, 10, 36, 4, { hideLabel: true })
      .room(T('船員食堂', 'Crew mess', '선원 식당'), 'public', 34, 0, 10, 10, { ly: 2.4 })
      .room(T('厨房', 'Galley', '주방'), 'kitchen', 44, 0, 6, 10)
      .room(T('船員室A', 'Crew cabin A', '선원실 A'), 'bedroom', 56, 0, 7, 10)
      .room(T('船員室B', 'Crew cabin B', '선원실 B'), 'bedroom', 63, 0, 7, 10)
      .room(T('船員室C', 'Crew cabin C', '선원실 C'), 'bedroom', 34, 14, 7, 10)
      .room(T('船員室D', 'Crew cabin D', '선원실 D'), 'bedroom', 41, 14, 7, 10)
      .room(T('シャワー室', 'Showers', '샤워실'), 'wet', 48, 14, 6, 10)
      .room(T('糧食庫', 'Provision store', '식량 창고'), 'storage', 54, 14, 8, 10)
      .room(T('甲板部倉庫', 'Deck stores', '갑판부 창고'), 'storage', 62, 14, 8, 10)
      .room(T('貨物庫', 'Cargo hold', '화물창'), 'industrial', 70, 0, 14, 24)
      .room(T('隠し区画', 'Hidden compartment', '숨겨진 구획'), 'storage', 70, 18, 5, 6, { gm: true, plName: '', hideLabel: true, note: NOTE_HOLD })
      .room(T('錨鎖庫', 'Chain locker', '닻줄 창고'), 'garage', 84, 3, 8, 18, { ly: -4 });
    shipStairs(d1, 0, false);
    [[56, true], [63, true], [34, false], [41, false]].forEach(([x, n]) => shipCabin(d1, x, 7, n, true));
    d1.dv(8, 11, 1.5, 1, 0, 'steel')                  // 操舵機室 → 機関室
      .dv(34, 11, 1.5, -1, 0, 'steel')                 // 船員通路 → 機関室
      .dh(28, 8, 1.5, 1, 0)                            // 機関制御室
      .dh(36, 10, 1.5, -1, 0).dv(44, 6, 1.5, -1, 0).dh(46, 10, 1.5, -1, 0)   // 食堂・厨房
      .dh(50, 14, 1.5, 1, 0).dh(56, 14, 1.5, 1, 0).dh(64, 14, 1.5, 1, 0)
      .dv(70, 11, 2, 1, 0, 'steel')                    // 貨物庫（水密扉）
      .dh(72, 18, 1.5, -1, 0, 'secret')                // 隠し区画
      .dv(84, 11, 1.5, 1, 0, 'steel')                  // 錨鎖庫
      .wh(38, 0, 2);
    d1.item('machine_tool', 2.6, 10.8, 0, { label: T('舵取機', 'Steering gear', '조타기') }).item('ind_tank', 4.6, 0.4).item('pump', 0.4, 18).item('control_panel', 4.6, 23, 180, { size: [2.4, 0.8] })
      .item('ship_engine', 11, 2.6, 90).item('ship_engine', 11, 15.4, 90).item('pipe', 8.2, 5.4, 0, { size: [2.8, 0.4] }).item('pipe', 8.2, 18.2, 0, { size: [2.8, 0.4] })
      .item('generator', 23, 9.4).item('generator', 23, 13.4).item('ind_tank', 28, 16.4).item('workbench', 27, 22.2).item('tool_shelf', 33, 15, 90, { size: [3, 1] })
      .item('dist_board', 8.4, 0.2).item('extinguisher', 9, 23.2)
      .item('console', 27, 0.3).item('chair', 28.3, 2, 180).item('dist_board', 31, 0.2).item('filing', 32.8, 6.6)
      .item('dining6', 36.6, 2.6).item('tv', 40.4, 0.2)
      .item('kitchen', 44.5, 0.2).item('fridge', 48.4, 6)
      .item('shower', 48.2, 22).item('shower', 50.2, 22).item('toilet', 52.8, 22.2, 180).item('washbasin', 52.2, 14.2).item('washer', 48.2, 18)
      .item('supply_shelf', 54.3, 22.8, 180).item('supply_shelf', 57.5, 22.8, 180).item('freezer', 60.2, 18).item('crate', 54.4, 18.6)
      .item('tool_shelf', 62.3, 22.8, 180).item('drum', 66, 22.4).item('drum', 67.4, 22.4).item('chains', 66.4, 17)
      .item('pallet_stack', 71, 0.6).item('pallet_stack', 73.4, 0.6).item('big_crate', 76, 0.6).item('big_crate', 79.4, 0.6).item('crate', 82.4, 0.6).item('crate', 82.4, 3.2)
      .item('pallet', 76.6, 21.6).item('big_crate', 79.2, 21.4).item('drum', 82.6, 20.4).item('drum', 82.6, 22.6).item('hand_cart', 82.4, 13.6)
      .item('crate', 70.3, 18.3, 0, { gm: true }).item('npc_lying', 73, 20, 0, { gm: true }).item('bag', 70.5, 22.4, 0, { gm: true })
      .item('chains', 88, 4, 90).item('chains', 88, 16, 90).item('pit', 87, 10.8);

    // 客室甲板：2等船室・エントランスホール（乗船口）・1等室・特等室・前甲板
    const d2 = makeFloor(T('客室甲板', 'Cabin deck', '객실 갑판'));
    const fore = T('前甲板', 'Foredeck', '앞갑판');
    d2.room(T('後部甲板', 'Aft deck', '후부 갑판'), 'shipdeck', 0, 0, 8, 24, { ly: -8 })
      .room(T('2等船室', 'Second-class room', '2등 선실'), 'washitsu', 8, 0, 14, 24, { ly: -2 })
      .room(T('エントランスホール', 'Entrance hall', '엔트런스 홀'), 'public', 22, 0, 12, 24, { ly: -8.6 })
      .room(T('客室通路', 'Cabin corridor', '객실 통로'), 'hall', 34, 10, 36, 4, { hideLabel: true })
      .room(T('1等室A', 'First class A', '1등실 A'), 'bedroom', 34, 0, 6, 10)
      .room(T('1等室B', 'First class B', '1등실 B'), 'bedroom', 40, 0, 6, 10)
      .room(T('リネン室', 'Linen room', '린넨실'), 'storage', 46, 0, 4, 10, { hideLabel: true })
      .room(T('1等室C', 'First class C', '1등실 C'), 'bedroom', 56, 0, 6, 10)
      .room(T('1等室D', 'First class D', '1등실 D'), 'bedroom', 62, 0, 8, 10)
      .room(T('売店', 'Shop', '매점'), 'public', 34, 14, 8, 10)
      .room(N.toilet, 'wet', 42, 14, 6, 10)
      .room(T('1等室E', 'First class E', '1등실 E'), 'bedroom', 48, 14, 8, 10)
      .room(T('特等室', 'Suite', '특등실'), 'bedroom', 56, 14, 14, 10)
      .room(fore, 'shipdeck', 70, 0, 14, 24, { ly: 6 })
      .room(fore, 'shipdeck', 84, 1, 4, 22, { hideLabel: true })
      .room(fore, 'shipdeck', 88, 3, 4, 18, { hideLabel: true })
      .room(fore, 'shipdeck', 92, 6, 4, 12, { hideLabel: true });
    shipStairs(d2, 0, true);
    [[34, 6, true], [40, 6, true], [56, 6, true], [62, 8, true], [48, 8, false]].forEach(([x, w, n]) => shipCabin(d2, x, w, n, false));
    d2.dv(8, 11, 2, -1, 0, 'steel')                   // 2等船室 → 後部甲板
      .dv(22, 3, 3, 1, 0, 'sliding2').dv(22, 18, 3, 1, 0, 'sliding2')
      .dh(29, 0, 3, 1, 0, 'door2').dh(29, 24, 3, -1, 0, 'door2')   // 乗船口（両舷）
      .dv(34, 10, 4, 1, 0, 'open')
      .dh(47, 10, 1.5, -1, 0)                          // リネン室
      .dh(36, 14, 1.5, 1, 0).dh(43, 14, 1.5, 1, 0).dh(57, 14, 1.5, 1, 0)
      .dv(70, 11, 2, 1, 0, 'steel')                    // 前甲板へ
      .wh(10, 0, 2).wh(16, 0, 2).wh(10, 24, 2).wh(16, 24, 2)
      .wh(59, 24, 3.5, 'window2').wv(70, 17, 3.5, 'window2').wv(70, 4, 2);
    d2.item('futon', 10, 2).item('futon', 13, 2).item('futon', 16, 2).item('futon', 10, 18, 180).item('futon', 13, 18, 180)
      .item('zataku', 12, 10.6).item('zataku', 16.6, 10.6).item('locker', 8.3, 2, 90, { size: [3, 1] }).item('tv', 20.8, 9.4, 90)
      .item('reception', 23.2, 20.4, 180, { label: T('案内所', 'Information', '안내소') }).item('chair', 24.6, 22.4)
      .item('vending', 32.4, 3, 90).item('bench', 31.4, 16, 90).item('plant', 22.4, 7.6).item('whiteboard', 33.4, 17, 90, { size: [3, 0.4] })
      .item('supply_shelf', 46.3, 1, 90)
      .item('store_shelf', 34.4, 22.2, 180).item('register', 38.6, 16).item('fridge_case', 40.6, 18, 270)
      .item('toilet', 44.4, 22.2, 180).item('toilet', 46.4, 22.2, 180).item('washbasin', 46.7, 15, 90)
      .item('bed_double', 64.6, 19.7, 180).item('nightstand', 63.5, 22.8).item('nightstand', 67.6, 22.8).item('sofa2', 56.3, 18, 270)
      .item('lowtable', 58.8, 18.5, 90).item('wardrobe', 60, 14.2).item('desk', 68.6, 15, 90, { size: [2.4, 1.2] })
      .item('bollard', 0.6, 0.6).item('bollard', 0.6, 22.4).item('bollard', 5.8, 0.6).item('bollard', 5.8, 22.4).item('liferaft', 0.4, 6).item('liferaft', 0.4, 15.6)
      .item('ship_hatch', 75, 9, 0, { size: [6, 6] }).item('ext_stairs', 71, 0.4).item('ext_stairs', 71, 17.6, 180)
      .item('anchor', 85, 1.4).item('anchor', 85, 20.2).item('machine_tool', 88.4, 10.8, 0, { label: T('揚錨機', 'Windlass', '양묘기') })
      .item('bollard', 71.4, 7.4).item('bollard', 71.4, 15.6).item('bollard', 82.2, 0.4).item('bollard', 82.2, 22.6);

    // 遊歩甲板：ラウンジ・パーティーホール・展望ラウンジ。周りは屋根付きの遊歩道
    const d3 = makeFloor(T('遊歩甲板', 'Promenade deck', '유보 갑판'));
    const prom = T('遊歩甲板', 'Promenade', '유보 갑판');
    d3.room(prom, 'shipdeck', 0, 0, 10, 24)
      .room(prom, 'shipdeck', 10, 0, 58, 4, { hideLabel: true })
      .room(prom, 'shipdeck', 10, 20, 58, 4, { hideLabel: true })
      .room(prom, 'shipdeck', 68, 0, 6, 24, { hideLabel: true })
      .room(T('ラウンジ', 'Lounge', '라운지'), 'public', 10, 4, 12, 16)
      .room(T('ロビー', 'Lobby', '로비'), 'hall', 22, 4, 8, 16, { ly: -5.4 })
      .room(T('パーティーホール', 'Party hall', '파티 홀'), 'public', 30, 4, 16, 16, { ly: 2 })
      .room(T('パントリー', 'Pantry', '팬트리'), 'kitchen', 46, 4, 4, 16, { hideLabel: true })
      .room(T('乗員通路', 'Crew passage', '승무원 통로'), 'hall', 50, 10, 6, 10, { hideLabel: true })
      .room(T('展望ラウンジ', 'Observation lounge', '전망 라운지'), 'public', 56, 4, 12, 16);
    shipStairs(d3, 4, true);
    d3.dv(10, 11, 2, -1, 0, 'steel').dv(22, 6, 2, 1, 0)   // ラウンジ
      .dh(26, 4, 1.5, -1, 0, 'steel').dh(26, 20, 1.5, 1, 0, 'steel')   // ロビー → 遊歩道
      .dv(30, 15.5, 3, 1, 0, 'door2')                  // パーティーホール
      .dv(46, 15, 1.5, -1, 0)                          // パントリー → ホール
      .dv(50, 16, 1.5, -1, 0).dh(53, 20, 1.5, 1, 0, 'steel')   // 乗員通路
      .dv(68, 11, 2, 1, 0, 'steel').dh(64, 4, 1.5, -1, 0, 'steel')   // 展望ラウンジ
      .wv(10, 5, 3.5, 'window2').wv(10, 15, 3.5, 'window2').wh(17, 4, 3.5, 'window2').wh(17, 20, 3.5, 'window2')
      .wh(31, 20, 3.5, 'window2').wh(41, 20, 3.5, 'window2').wh(36, 4, 3.5, 'window2')
      .wv(68, 5, 3.5, 'window2').wv(68, 15.5, 3.5, 'window2').wh(58, 4, 3.5, 'window2').wh(58, 20, 3.5, 'window2');
    d3.item('sofa3', 12, 4.3).item('lowtable', 13.1, 6.8).item('armchair', 11.8, 8.6, 180).item('armchair', 14.4, 8.6, 180)
      .item('sofa3', 12, 17.9, 180).item('lowtable', 13.1, 15.8).item('armchair', 11.8, 13.2).item('armchair', 14.4, 13.2)
      .item('counter', 20.4, 9, 270).item('stool', 19, 9.4).item('stool', 19, 11.4)
      .item('plant', 28.6, 4.4).item('bench', 23, 16.8)
      .item('stage', 34, 4.2, 0, { size: [8, 3] }).item('banquet_round', 31.6, 8.6, 0, { size: [4.6, 4.6] }).item('banquet_round', 39.4, 8.6, 0, { size: [4.6, 4.6] })
      .item('banquet_round', 35.4, 14.6, 0, { size: [4.6, 4.6] }).item('piano', 42.6, 4.2).item('speaker', 32.4, 4.4)
      .item('counter', 48.6, 4.4, 90).item('fridge', 48.4, 9).item('sink', 48.5, 11, 90).item('cupboard', 46.1, 5, 270).item('hand_cart', 54, 12)
      .item('sofa3', 60, 5.4, 270).item('lowtable', 62.6, 6.5, 90).item('sofa3', 60, 14, 270).item('lowtable', 62.6, 15.1, 90)
      .item('pedestal', 65.8, 7.8, 0, { label: T('双眼鏡', 'Binoculars', '쌍안경') }).item('plant', 66.6, 18.6)
      .item('deck_chair', 1, 4).item('deck_chair', 3, 4).item('deck_chair', 1, 16.4).item('deck_chair', 3, 16.4)
      .item('liferaft', 14, 0.3, 90).item('liferaft', 36, 0.3, 90).item('liferaft', 14, 22.1, 90).item('liferaft', 36, 22.1, 90).item('bench', 40, 0.2)
      .item('ext_stairs', 71, 0.4).item('ext_stairs', 71, 17.6, 180);
    d3.text(T('パントリー', 'Pantry', '팬트리'), 48, 14, { size: 0.45 });

    // ブリッジ甲板：操舵室・船長室・無線室。後ろ半分はサンデッキと救命艇
    const d4 = makeFloor(T('ブリッジ甲板', 'Bridge deck', '브리지 갑판'));
    d4.room(T('サンデッキ', 'Sun deck', '선 데크'), 'shipdeck', 10, 0, 30, 24, { lx: -9 })
      .room(T('左舷ウイング', 'Port wing', '좌현 윙'), 'shipdeck', 40, 0, 28, 4, { hideLabel: true })
      .room(T('右舷ウイング', 'Starboard wing', '우현 윙'), 'shipdeck', 40, 20, 28, 4, { hideLabel: true })
      .room(T('階段室', 'Stair house', '계단실'), 'hall', 22, 9, 8, 7, { hideLabel: true })
      .room(T('操舵室', 'Wheelhouse', '조타실'), 'office', 56, 4, 12, 16, { ly: 2.6 })
      .room(T('通路', 'Passage', '통로'), 'hall', 40, 10, 16, 4, { hideLabel: true })
      .room(T('無線室', 'Radio room', '무선실'), 'office', 40, 4, 4, 6, { ly: 0.8 })
      .room(T('航海士室', 'Officer\'s cabin', '항해사실'), 'bedroom', 44, 4, 6, 6, { ly: 1.6 })
      .room(T('機関長室', 'Chief engineer', '기관장실'), 'bedroom', 40, 14, 6, 6, { ly: -1.4 })
      .room(T('船長室', 'Captain\'s cabin', '선장실'), 'bedroom', 46, 14, 10, 6, { ly: -1.4 });
    shipStairs(d4, 4, true);
    d4.dv(30, 11.5, 2, 1, 0, 'steel')                 // 階段室
      .dv(40, 11, 2, -1, 0, 'steel')                   // 通路 → サンデッキ
      .dv(56, 11, 1.5, 1, 0)                           // 操舵室
      .dh(60, 4, 1.5, -1, 0, 'steel').dh(60, 20, 1.5, 1, 0, 'steel')   // ウイング
      .dh(41.5, 10, 1.5, -1, 0).dh(46, 10, 1.5, -1, 0).dh(42, 14, 1.5, 1, 0).dh(48, 14, 1.5, 1, 0)
      .wv(68, 4.5, 3.5, 'window2').wv(68, 10.25, 3.5, 'window2').wv(68, 16, 3.5, 'window2').wh(63, 4, 3.5, 'window2').wh(63, 20, 3.5, 'window2')
      .wh(46, 4, 2).wh(42, 20, 2).wh(50, 20, 2);
    d4.item('console', 66.4, 7, 90, { size: [10, 1.4] }).item('helm', 63.4, 11.2).item('radar', 63.4, 7.2, 90).item('pilot_seat', 61.2, 11.2, 270)
      .item('chart_table', 57.2, 17.6).item('radio', 57.2, 4.4)
      .item('radio', 40.3, 4.3).item('control_panel', 43, 4.4, 90, { size: [2.4, 0.8] })
      .item('bed_single', 44.4, 4.4, 90).item('desk', 47.4, 7, 0, { size: [2.4, 1.2] })
      .item('bed_single', 41.6, 17.6, 90).item('dresser', 43.8, 14.2)
      .item('bed_single', 51.6, 17.6, 90).item('desk', 46.4, 18.6, 180, { size: [2.4, 1.2] }).item('chair', 47.1, 17.5).item('wardrobe', 52.6, 14.2)
      .item('safe', 50, 18.6)
      .item('lifeboat', 12, 0.2, 90).item('lifeboat', 26, 0.2, 90).item('lifeboat', 12, 19.8, 90).item('lifeboat', 26, 19.8, 90)
      .item('deck_chair', 12, 6).item('deck_chair', 14, 6).item('deck_chair', 12, 14.4).item('deck_chair', 14, 14.4)
      .item('bench', 33, 6.4).item('vent_unit', 36, 15.6).item('antenna', 53, 0.6)
      .item('liferaft', 64.6, 0.3, 90).item('liferaft', 64.6, 22.1, 90);
    return [d1.f, d2.f, d3.f, d4.f];
  }

  /* ---------- 交通：鉄道の高架橋（橋下と高架上） ---------- */

  function viaduct() {
    // 橋下：橋脚は 10m おき。スパンごとに資材倉庫・市道・月極駐車場・野営地
    const u = makeFloor(T('橋下', 'Under the viaduct', '고가 아래'));
    const walk = T('歩道', 'Sidewalk', '보도'), side = T('側道', 'Frontage road', '측도');
    const canal = T('用水路', 'Irrigation canal', '용수로'), bank = T('土手', 'Embankment', '둑');
    u.room(walk, 'porch', 0, -12, 30, 4, { hideLabel: true })
      .room(walk, 'porch', 46, -12, 50, 4, { hideLabel: true })
      .room(side, 'road', 0, -8, 30, 8, { lx: -8 })
      .room(side, 'road', 46, -8, 50, 8, { hideLabel: true })
      .room(T('市道', 'Crossing road', '시도'), 'road', 30, -12, 16, 52, { ly: 4 })
      .room(T('資材倉庫', 'Materials depot', '자재 창고'), 'garage', 10, 0, 16, 22, { ly: -1.5 })
      .room(T('月極駐車場', 'Monthly parking', '월정액 주차장'), 'road', 49, 0, 18, 12, { hideLabel: true })
      .room(T('野営地', 'Encampment', '야영지'), 'dirt', 69, 0, 18, 22, { lx: -1, ly: 4 })
      .room(T('ブルーシート小屋', 'Tarp shack', '블루시트 오두막'), 'garage', 80, 12, 6, 7, { wall: 'thin', gm: true, plName: '', note: T('ブルーシートで囲った小屋。住人は毎晩2時13分に頭上を通る「時刻表にない列車」の記録を壁一面に貼っている。最後のメモは「今夜は止まる」', 'A shack walled with blue tarps. Its occupant has covered the walls with records of an unscheduled train that crosses overhead every night at 2:13. The last note reads: "Tonight it stops."', '블루시트로 둘러싼 오두막. 주인은 매일 밤 2시 13분에 머리 위를 지나는 "시각표에 없는 열차"의 기록을 벽 가득 붙여 두었다. 마지막 메모는 "오늘 밤은 멈춘다"') })
      .room(T('点検階段', 'Inspection stairs', '점검 계단'), 'gravel', 73, 22, 6, 9, { hideLabel: true })
      .room(canal, 'water', 0, 34, 30, 3, { lx: -9 })
      .room(canal, 'water', 46, 34, 50, 3, { hideLabel: true })
      .room(bank, 'dirt', 0, 37, 30, 3, { hideLabel: true })
      .room(bank, 'dirt', 46, 37, 50, 3, { hideLabel: true });
    fillYard(u, 0, 0, 96, 22, T('高架下', 'Under the viaduct', '고가 아래'), 'dirt');
    fillYard(u, 0, 22, 96, 34, T('草地', 'Grass', '풀밭'), 'garden');
    u.text(T('高架下', 'Under the viaduct', '고가 아래'), 4.5, 11, { size: 0.6 }).text(T('高架下', 'Under the viaduct', '고가 아래'), 92, 11, { size: 0.6 });
    // 柵：野営地の目隠しの柵（破れ目あり）、駐車場の奥、点検階段の囲い、用水路
    u.wall(69, 0, 87, 0, 'fence').wall(49, 12, 67, 12, 'fence')
      .wall(73, 22, 79, 22, 'fence').wall(73, 22, 73, 31, 'fence').wall(79, 22, 79, 31, 'fence').wall(73, 31, 79, 31, 'fence')
      .wall(0, 34, 30, 34, 'fence').wall(46, 34, 96, 34, 'fence').wall(30, 34, 30, 37, 'rail').wall(46, 34, 46, 37, 'rail');
    u.dh(12, 0, 5, -1, 0, 'shutter').dh(21, 0, 1.5, -1, 0, 'steel')   // 資材倉庫
      .wh(14, 22, 2).wh(20, 22, 2)
      .dh(84.5, 0, 2, 1, 0, 'hole')                    // 柵の破れ目
      .dh(81, 12, 1.5, -1, 0, 'sliding')               // 小屋
      .dh(74, 31, 2, 1, 0, 'locked');                  // 点検階段の施錠された扉
    [7, 27, 47, 67, 87].forEach(x => u.item('pillar', x, 1, 0, { size: [2, 2] }).item('pillar', x, 19, 0, { size: [2, 2] }));
    u.item('fire_escape', 73.5, 23.4, 0, { size: [5, 6] })
      // 資材倉庫
      .item('pallet_rack', 10.4, 19.4, 180, { size: [8, 2.2] }).item('building_materials', 17, 10).item('material_pile', 21.6, 16.6)
      .item('scaffold', 11, 7, 0, { size: [6, 2] }).item('forklift', 23.2, 2).item('cone', 11, 2.4).item('cone', 12, 2.4).item('barricade', 18.6, 3, 0, { size: [3, 0.7] })
      .item('tool_shelf', 10.2, 12, 90, { size: [3, 1] }).item('drum', 24.4, 20.4)
      // 市道・側道
      .item('road_arrow', 32, 8, 0).item('road_arrow', 42, 12, 180).item('road_arrow', 32, 24, 0).item('road_arrow', 42, -6, 180)
      .item('road_sign', 30.2, -1.4, 0, { label: T('高さ 3.8m', 'Clear 3.8 m', '높이 3.8m') }).item('road_sign', 44.8, 22.4, 0, { label: T('高さ 3.8m', 'Clear 3.8 m', '높이 3.8m') })
      .item('puddle', 37, 14).item('manhole', 38, 28)
      .item('road_arrow', 10, -7.4, 90).item('road_arrow', 60, -3, 270).item('van', 72, -4.4, 270)
      .item('utility_pole', 20, -11.6).item('utility_pole', 60, -11.6).item('utility_pole', 90, -11.6).item('streetlight', 50, -11.6)
      // 月極駐車場
      .item('parking_stall', 50.5, 0.6, 180).item('parking_stall', 55.5, 0.6, 180).item('parking_stall', 60.5, 0.6, 180)
      .item('road_sign', 66, 10.6, 0, { label: T('月極', 'Monthly', '월정액') });
    trParkCars(u, [[50.5, 0.6, 180], [55.5, 0.6, 180], [60.5, 0.6, 180]], '101', 1);
    // 野営地
    u.item('tent', 70.4, 2.4).item('tent', 70.4, 14.6).item('campfire', 76.8, 9.4).item('log', 76, 7.6).item('log', 76, 11.8)
      .item('drum', 79.6, 4).item('cardboard', 75.6, 2.4).item('cardboard', 76.9, 2.4).item('broken_furniture', 75, 18.6).item('bush', 85, 2.6).item('bush', 85, 6)
      .item('futon', 80.4, 14.6, 0, { gm: true }).item('photo', 83.4, 12.4, 0, { gm: true }).item('photo', 84.6, 12.4, 0, { gm: true })
      .item('papers', 83.6, 16.6, 0, { gm: true }).item('recorder', 84.8, 17.8, 0, { gm: true }).item('candle', 84.8, 13.8, 0, { gm: true })
      // 草地・土手
      .item('bush', 4, 25).item('bush', 14, 28).item('bush', 58, 24).item('bush', 90, 29).item('tree', 2, 29.6).item('tree', 88, 23.4)
      .item('debris', 52, 27).item('puddle', 64, 28);

    // 高架上：複線と両側の点検通路
    const d = makeFloor(T('高架上', 'On the viaduct', '고가 위'));
    const path = T('点検通路', 'Inspection walkway', '점검 통로');
    d.room(path, 'rooftop', 0, 0, 96, 3, { lx: -38 })
      .room(T('下り線', 'Down line', '하행선'), 'track', 0, 3, 96, 8, { lx: -40 })
      .room(T('上り線', 'Up line', '상행선'), 'track', 0, 11, 96, 8, { lx: -40 })
      .room(path, 'rooftop', 0, 19, 96, 3, { hideLabel: true })
      .room(T('点検階段', 'Inspection stairs', '점검 계단'), 'rooftop', 73, 22, 6, 9, { hideLabel: true });
    d.wall(73, 22, 79, 22, 'rail').dh(74.5, 22, 2, -1, 0, 'gate');
    trRailsH(d, 0, 96, 5, 24);
    trRailsH(d, 0, 96, 13, 24);
    for (let x = 0; x < 96; x += 12) d.item('cable_rack', x, 2.3, 0, { size: [12, 0.6] }).item('cable_rack', x, 19.1, 0, { size: [12, 0.6] });
    d.item('fire_escape', 73.5, 23.4, 0, { size: [5, 6] })
      .item('utility_pole', 17.5, 0.4).item('utility_pole', 57.5, 0.4).item('utility_pole', 37.5, 20.6).item('utility_pole', 89.5, 20.6)
      .item('traffic_light', 88, 1.2, 0, { label: T('信号', 'Signal', '신호') }).item('traffic_light', 6, 20.2, 180, { label: T('信号', 'Signal', '신호') })
      .item('tools', 44, 0.8).item('cone', 60.6, 20.6).item('cone', 61.6, 20.6)
      .item('footprints', 80.6, 20.4, 90, { gm: true, size: [1, 3] });
    d.text(T('郊外方面 →', 'Suburbs →', '교외 방면 →'), 86, 4.4, { size: 0.6 }).text(T('← 都心方面', '← Downtown', '← 도심 방면'), 86, 12.4, { size: 0.6 });
    return [u.f, d.f];
  }

  /* ---------- 産業・インフラ・屋上・廃工場（T2） ---------- */

  /* (T2 のテンプレート関数はここ) */
  /* 参考にした定石（産業・インフラ）:
   *  - 工事現場: 仮囲いとゲートは前面道路側。ゲートの内側にタイヤ洗い場、脇に現場事務所（プレハブ）・仮設トイレ・朝礼広場。
   *    重機と資材置場はゲートから建物までの動線に面し、建物の外周は足場で囲む
   *  - 建造中の建物: 6m スパンの柱と片寄せのコア（仮設階段・EVシャフト）。下の階ほど工程が進む（1Fは外壁と間仕切りの下地、最上階は打設直後）
   */

  /* 足場（6 × 2）を帯に沿って並べる。端は短い足場で埋める */
  function scaffoldRun(b, x, y, len, vertical) {
    for (let d = 0; d < len - 1e-6; d += 6) {
      const l = Math.min(6, len - d);
      if (vertical) b.item('scaffold', x, y + d, 90, { size: [l, 2] });
      else b.item('scaffold', x + d, y, 0, { size: [l, 2] });
    }
  }

  // 建造中の建物（スラブ 36 × 24 = 18m × 12m）の1フロア。ox, oy = スラブの左上。足場の帯を外周に付ける
  function wipFloor(b, ox, oy, level, slabName) {
    const p = placer(b, ox, oy, 36, 24);
    p.room(slabName, 'slab', 0, 0, 36, 24, { ly: 4 })
      .room(T('仮設階段', 'Temporary stairs', '가설 계단'), 'industrial', 30, 0, 6, 10, { ly: 3.4 })
      .room(T('EVシャフト', 'Elevator shaft', 'EV 샤프트'), 'danger', 25, 0, 5, 5, { ly: 4, note: T('扉のない開口。転落注意', 'An open shaft with no doors. Fall hazard', '문 없는 개구부. 추락 주의') });
    [[-2, -2, 40, 2], [-2, 24, 40, 2], [-2, 0, 2, 24], [36, 0, 2, 24]].forEach(([x, y, w, h]) => p.room(T('足場', 'Scaffolding', '비계'), 'balcony', x, y, w, h, { hideLabel: true }));
    scaffoldRun(p, -2, -2, 40, false);
    scaffoldRun(p, -2, 24, 40, false);
    scaffoldRun(p, -2, 0, 24, true);
    scaffoldRun(p, 36, 0, 24, true);
    p.dv(30, 6, 3, -1, 0, 'open')                 // 階段室の入口
      .dh(26, 5, 3, 1, 0, 'open');                // EVシャフト（扉はまだない）
    p.item('temp_stairs', 32.6, 1.6).item('danger', 28.4, 0.6);
    if (level < 3) p.wall(25.5, 5.4, 29.5, 5.4, 'rail');   // 開口部の養生（手すり）
    // 6m スパンの柱（コアの中の柱は壁に埋まる）
    [0, 11.3, 23.3].forEach(x => [0, 11.3, 22.6].forEach(y => p.item('pillar', x, y, 0, { size: [1.4, 1.4] })));
    [11.3, 22.6].forEach(y => p.item('pillar', 34.6, y, 0, { size: [1.4, 1.4] }));
    if (level === 1) {
      // 外壁が立ち上がり、間仕切りの下地（軽量鉄骨）が入りはじめた
      p.wall(0, 0, 4, 0, 'ext').wall(8, 0, 15, 0, 'ext').wall(19, 0, 25, 0, 'ext')
        .wall(0, 0, 0, 6, 'ext').wall(0, 10, 0, 17, 'ext').wall(0, 21, 0, 24, 'ext')
        .wall(0, 24, 8, 24, 'ext').wall(22, 24, 30, 24, 'ext')
        .wall(36, 10, 36, 15, 'ext')
        .wall(12, 13, 12, 24, 'thin').wall(0, 13, 6, 13, 'thin');
      p.item('material_pile', 2, 1.6).item('cardboard', 7, 1.4).item('cardboard', 8.4, 1.4).item('cardboard', 7.7, 2.5)
        .item('pallet_stack', 14.6, 2).item('hand_cart', 17.4, 2.2).item('dist_board', 30.6, 10.2)
        .item('generator', 2, 15.6).item('drum', 4, 15.6).item('tool_shelf', 1.4, 21.8, 180)
        .item('workbench', 25, 18, 0).item('tools', 26, 20.2).item('cable_rack', 15, 21.8, 180, { size: [5, 0.6] })
        .item('puddle', 6, 7.6).item('footprints', 19, 6.6, 90);
    } else if (level === 2) {
      // ブロック積みの途中の壁と、運び上げた資材
      p.wall(0, 0, 9, 0, 'broken').wall(0, 0, 0, 8, 'broken').wall(14, 13, 22, 13, 'broken');
      p.item('building_materials', 2, 3).item('building_materials', 2, 6.2).item('pallet_stack', 13.6, 2).item('pallet_stack', 16, 2)
        .item('material_pile', 3, 16).item('drum', 26, 20.6).item('drum', 27.4, 20.6)
        .item('hand_cart', 19, 18.4).item('generator', 31, 19.6).item('cable_rack', 15, 10.6, 0, { size: [6, 0.6] })
        .item('cardboard', 8.4, 19.6).item('cardboard', 8.4, 20.6).item('bench', 4.6, 22.2, 0, { size: [3, 0.8] }).item('cone', 24.2, 7).item('cone', 30.4, 6.6);
    } else {
      // 打設直後の最上階：柱の鉄筋と型枠、クレーンで吊り上げた資材
      p.item('building_materials', 3, 3, 0, { size: [8, 2] }).item('building_materials', 3, 6.4, 0, { size: [6, 2] }).item('material_pile', 15, 3)
        .item('material_pile', 26, 17).item('big_crate', 4, 16).item('pallet', 15.4, 19.4).item('pallet', 18, 19.4)
        .item('generator', 31.6, 20.4).item('tools', 9, 10).item('puddle', 9, 13.6).item('barricade', 21.4, 6.2, 90);
    }
    return p;
  }

  /* ---------- 工事現場（敷地図） ---------- */

  function construction() {
    const b = makeFloor('1F');
    b.room(T('重機エリア', 'Heavy machinery', '중장비 구역'), 'dirt', 2, 2, 34, 20, { ly: -1 })
      .room(T('資材置場', 'Material yard', '자재 적치장'), 'dirt', 2, 24, 26, 15, { ly: 3 })
      .room(T('現場事務所', 'Site office', '현장 사무소'), 'office', 2, 42, 16, 10, { wall: 'int', ly: 2.6 })
      .room(T('朝礼広場', 'Assembly area', '조례 광장'), 'dirt', 18, 40, 14, 8)
      .room(T('喫煙所', 'Smoking area', '흡연 구역'), 'dirt', 27, 48, 4, 5, { ly: -1.4 })
      .room(T('工事用通路（敷鉄板）', 'Site road (steel plates)', '공사용 통로(복공판)'), 'road', 32, 32, 10, 22, { ly: -4 })
      .room(T('掘削箇所（作業中止）', 'Excavation (work halted)', '굴착 구역(작업 중지)'), 'dirt', 50, 36, 28, 16, { lx: -6, ly: -6.4 })
      .room(T('古い石室', 'Ancient stone chamber', '오래된 석실'), 'stone', 66, 42, 9, 7, { wall: 'stone', gm: true, plName: '', note: T('掘削で突き当たった石室。中の石碑に触れた作業員が行方不明', 'A stone chamber the excavator broke into. The worker who touched the stele inside is missing', '굴착 중 뚫린 석실. 안의 비석을 만진 작업원이 실종됐다') })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 0, 54, 80, 3, { hideLabel: true })
      .room(T('前面道路', 'Street', '앞 도로'), 'road', 0, 57, 80, 10);
    ['A', 'B', 'C'].forEach((n, i) => {
      const x = 20 + i * 2;
      b.room(T(`仮設トイレ${n}`, `Portable toilet ${n}`, `간이 화장실${n}`), 'wet', x, 49, 2, 3, { wall: 'thin', hideLabel: true })
        .dh(x + 0.25, 49, 1.5, -1, 0)
        .item('toilet', x + 0.5, 50.35, 180, { size: [1, 1.5] });
    });
    wipFloor(b, 40, 6, 1, T('建設中区画', 'Building under construction', '건설 중 구역'));
    fillYard(b, 0, 0, 80, 54, T('現場', 'Site', '현장'), 'dirt');
    // 仮囲い（敷地の外周）とゲート
    b.wall(0, 0, 80, 0, 'fence').wall(0, 0, 0, 54, 'fence').wall(80, 0, 80, 54, 'fence').wall(0, 54, 80, 54, 'fence');
    b.dh(32, 54, 5, -1, 0, 'gate').dh(37, 54, 5, -1, 1, 'gate')   // 工事ゲート（内開き）
      .dh(19, 54, 2, -1, 0, 'gate')                              // 通用口
      .dv(18, 44, 1.5, -1, 0)                                    // 現場事務所
      .wh(4, 42, 3).wh(10, 42, 3).wh(4, 52, 3).wv(2, 45, 3).wh(13, 52, 2)
      .dh(67, 42, 2, 1, 0, 'hole');                              // 石室（重機で突き破った穴）
    // 重機エリア：ダンプ・ブルドーザー・クレーン車
    b.item('bulldozer', 3, 3).item('truck', 12, 3, 90).item('crane_truck', 14, 14.5, 90)
      .item('drum', 30.4, 3).item('drum', 31.8, 3).item('drum', 30.4, 4.4).item('em_generator', 30, 6.4, 90)
      .item('cone', 11, 13.6).item('cone', 11, 20.8);
    // 資材置場：鉄筋・鉄骨・木材、パレット、セメント袋
    b.item('building_materials', 3, 25).item('building_materials', 3, 28).item('building_materials', 3, 31)
      .item('material_pile', 12.5, 25.2).item('pallet_stack', 17.4, 25.2).item('pallet_stack', 19.8, 25.2).item('big_crate', 23.4, 25.4)
      .item('drum', 13, 31).item('drum', 14.4, 31).item('cardboard', 17.6, 30.6).item('cardboard', 19, 30.6)
      .item('hand_cart', 23.6, 31).item('tool_shelf', 3, 35.6).item('material_pile', 7, 34.6);
    // 現場事務所：事務机の島、打合せテーブル、工程表、ロッカー
    b.item('office_desk', 3, 43.6).item('office_desk', 5.4, 43.6).item('office_desk', 3, 45, 180).item('office_desk', 5.4, 45, 180)
      .item('chair', 3.7, 42.6, 0).item('chair', 6.1, 42.6, 0).item('chair', 3.7, 46.5, 180).item('chair', 6.1, 46.5, 180)
      .item('table', 9.6, 46.6, 0, { size: [3.2, 1.6] }).item('chair', 10.1, 45.5).item('chair', 11.7, 45.5).item('chair', 10.1, 48.3, 180).item('chair', 11.7, 48.3, 180)
      .item('whiteboard', 9.5, 42.05, 0, { size: [4, 0.4] }).item('locker', 2.1, 50.9, 180).item('filing', 14.6, 42.2).item('safe', 16.6, 50.6)
      .item('fridge', 14.8, 50.4).item('copier', 2.2, 47.8, 270);
    // 朝礼広場：安全掲示板、ヘルメット置き。喫煙所
    b.item('whiteboard', 20, 40.2, 0, { size: [5, 0.4] }).item('tool_shelf', 26.5, 40.2, 0, { size: [3, 0.8] })
      .item('bench', 27.4, 48.4, 90, { size: [3, 0.9] }).item('drum', 29.3, 51.3);
    // ゲート：タイヤ洗い場、警備員、カラーコーン
    b.item('grating', 33, 50.6).item('grating', 35.5, 50.6).item('grating', 38, 50.6)
      .item('cone', 31, 55.2).item('cone', 42.4, 55.2).item('barricade', 43.4, 54.8).item('npc_guard', 29.6, 55);
    // 掘削箇所：ショベルカー、土砂、穴、バリケード
    b.item('excavator', 52, 39.5).item('landslide', 62.4, 37.2).item('landslide', 59.4, 47)
      .item('pit', 61.5, 41, 0, { size: [3, 2.4] }).item('barricade', 67, 37.2).item('barricade', 71, 37.2).item('barricade', 76.6, 40, 90)
      .item('cone', 64, 50.8).item('cone', 73, 50.8).item('danger', 64.6, 44.2);
    b.item('stele', 69.5, 46.6, 180, { gm: true }).item('bones', 67.4, 44.2, 0, { gm: true }).item('offering', 72.6, 44, 0, { gm: true });
    // 前面道路：待機中のダンプ、電柱・街灯
    b.item('truck', 48, 58.6, 90).item('utility_pole', 10, 54.6).item('streetlight', 64, 54.6).item('utility_pole', 76, 54.6);
    b.text(T('仮設トイレ', 'Portable toilets', '간이 화장실'), 23, 48.4, { size: 0.42 })
      .text(T('工事ゲート', 'Site gate', '공사 게이트'), 37, 53.3, { size: 0.42 })
      .text(T('足場', 'Scaffolding', '비계'), 58, 2.6, { size: 0.5 });
    return [b.f];
  }

  /* ---------- 建造中の建物（1F〜3F） ---------- */

  function buildingWip() {
    const g = makeFloor('1F');
    wipFloor(g, 0, 0, 1, T('1階（内装工事中）', '1F (interior work)', '1층(내장 공사 중)'));
    fillYard(g, -6, -6, 42, 30, T('現場', 'Site', '현장'), 'dirt');
    g.item('drum', -5, 10).item('drum', -5, 11.4).item('building_materials', 4, -5.6).item('cone', 40.4, 12).item('cone', 40.4, 20)
      .item('barricade', 14, 27.2).item('generator', 39.6, -4.6);
    g.item('npc_lying', 25.6, 0.7, 0, { gm: true });
    g.f.rooms.find(r => r.name.ja === 'EVシャフト').note = T('ピットの底に作業員の遺体。3Fのバリケードがずらされていた', 'A worker\'s body at the bottom of the pit. The barricade on 3F had been moved aside', '피트 바닥에 작업원의 시신. 3층 바리케이드가 옮겨져 있었다');
    const u = makeFloor('2F');
    wipFloor(u, 0, 0, 2, T('2階（ブロック積み）', '2F (blockwork)', '2층(블록 쌓기)'));
    const t = makeFloor('3F');
    wipFloor(t, 0, 0, 3, T('3階（打設直後）', '3F (just poured)', '3층(타설 직후)'));
    t.item('footprints', 26.6, 6.4, 0, { gm: true, size: [1, 2.4] });
    t.f.rooms.find(r => r.name.ja === 'EVシャフト').note = T('開口の手すりが外され、バリケードが脇にずらされている', 'The guardrail is gone and the barricade has been pushed aside', '개구부 난간이 치워지고 바리케이드가 옆으로 밀려 있다');
    return [g.f, u.f, t.f];
  }

  /* ---------- 工場（1F 製造エリア・2F 事務所と中二階の制御室） ---------- */
  // 正面（南）に駐車場と2階建ての事務所棟、奥に工場棟。製造エリアはU字の流れ（倉庫 → 加工 → 組立 → 梱包 → 搬入口）。
  // 機械室と検査室は工場棟の隅、制御室は中二階から製造エリアを見下ろす。搬入口のシャッターにトラックを横付け

  function factory() {
    const g = makeFloor('1F');
    g.room(T('製造エリア', 'Production floor', '제조 구역'), 'industrial', 24, 0, 48, 44, { lx: 6, ly: -8.4 })
      .room(T('機械室', 'Machine room', '기계실'), 'garage', 24, 0, 12, 12, { ly: 2 })
      .room(T('検査室', 'Inspection room', '검사실'), 'medical', 24, 12, 12, 10, { ly: 2.4 })
      .room(T('倉庫', 'Warehouse', '창고'), 'storage', 72, 0, 24, 30, { ly: 9.6 })
      .room(T('搬入口', 'Loading bay', '반입구'), 'industrial', 72, 30, 24, 14, { ly: -2.4 })
      .room(T('食堂・休憩室', 'Canteen', '식당·휴게실'), 'kitchen', 0, 10, 12, 12, { ly: 3.6 })
      .room(T('更衣室（男）', 'Men\'s lockers', '남자 탈의실'), 'office', 12, 10, 6, 12)
      .room(T('更衣室（女）', 'Women\'s lockers', '여자 탈의실'), 'office', 18, 10, 6, 12)
      .room(N.corridor, 'hall', 0, 22, 24, 4, { hideLabel: true })
      .room(T('玄関ホール', 'Entrance hall', '현관 홀'), 'hall', 0, 26, 10, 18, { ly: 2 })
      .room(T('トイレ（男）', 'Men\'s WC', '남자 화장실'), 'wet', 10, 26, 6, 8, { ly: -1.6 })
      .room(T('トイレ（女）', 'Women\'s WC', '여자 화장실'), 'wet', 16, 26, 8, 8, { ly: -1.6 })
      .room(T('応接室', 'Reception room', '응접실'), 'office', 10, 34, 14, 10, { ly: 3.2 })
      .room(T('駐車場', 'Parking', '주차장'), 'road', 0, 44, 24, 16, { ly: 5.6 })
      .room(T('構内道路', 'Yard', '구내 도로'), 'road', 24, 44, 72, 16, { lx: -10, ly: 4 })
      .room(T('守衛所', 'Guardhouse', '경비실'), 'office', 40, 54, 6, 6, { ly: -1.6 });
    g.dh(9, 22, 1.5, -1, 1)                         // 食堂
      .dh(15, 22, 1.5, -1, 1).dh(19.5, 22, 1.5, -1, 0)   // 更衣室
      .dv(0, 22.5, 1.5, -1, 0, 'steel')                  // 非常口
      .dv(24, 22.5, 3, 1, 0, 'door2')                    // 廊下 → 製造エリア
      .dh(6, 26, 4, 1, 0, 'open')                        // 玄関ホール ↔ 廊下
      .dh(3, 44, 3, -1, 0, 'door2')                      // 正面玄関
      .dh(11, 26, 1.5, 1, 0).dh(22, 26, 1.5, 1, 1)       // トイレ
      .dv(10, 38, 1.5, 1, 0)                             // 応接室
      .dv(36, 9, 1.5, 1, 0, 'steel').dh(26, 0, 1.5, -1, 0, 'steel')   // 機械室（製造エリア側・外）
      .dh(30, 22, 1.5, 1, 0)                             // 検査室
      .dv(72, 12.5, 5, 1, 0, 'shutter')                  // 製造エリア → 倉庫
      .dv(72, 33, 6, 1, 0, 'open')                       // 製造エリア → 搬入口
      .dh(80, 30, 8, 1, 0, 'open')                       // 倉庫 ↔ 搬入口
      .dh(74, 44, 6, -1, 0, 'shutter').dh(86, 44, 6, -1, 0, 'shutter')   // 搬入口のシャッター
      .dv(96, 34, 1.5, 1, 0, 'steel')                    // 搬入口の通用口
      .dh(26, 44, 1.5, 1, 0, 'steel')                    // 製造エリアの通用口
      .dv(46, 56, 1.5, 1, 0)                             // 守衛所
      .wh(4, 10, 3).wv(0, 13, 3).wv(0, 17, 3).wh(13.5, 10, 2).wh(19.5, 10, 2).wv(0, 36, 3).wh(7, 44, 2)
      .wh(12, 44, 3).wh(19, 44, 3).wh(28, 0, 3).wh(40, 0, 3).wh(49, 0, 3).wh(58, 0, 3).wh(66, 0, 3)
      .wh(31, 44, 3).wh(44, 44, 3).wh(53, 44, 3).wh(62, 44, 3).wv(96, 6, 3).wh(42, 54, 2).wv(40, 56, 2);
    // 敷地の柵と門
    g.wall(0, 60, 96, 60, 'fence').wall(0, 44, 0, 60, 'fence').wall(96, 44, 96, 60, 'fence')
      .dh(48, 60, 6, -1, 0, 'gate').dh(54, 60, 6, -1, 1, 'gate');
    // 食堂・更衣室・トイレ・応接室・玄関
    g.item('vending', 0.2, 10.1, 0).item('vending', 2.4, 10.1, 0).item('fridge', 4.6, 10.1).item('sink', 7.8, 10.1)
      .item('dining6', 1, 13).item('dining6', 6.4, 13).item('dining6', 1, 17.8).item('tv', 11.1, 12.4, 90)
      .item('locker', 12, 10.6, 270).item('locker', 12, 13.6, 270).item('locker', 12, 16.6, 270).item('bench', 14.6, 12, 90, { size: [4, 0.9] })
      .item('locker', 23, 10.6, 90).item('locker', 23, 13.6, 90).item('locker', 23, 16.6, 90).item('bench', 20.4, 12, 90, { size: [4, 0.9] })
      .item('stairs_u', 0.5, 26.5, 0, { size: [5, 6] }).item('bench', 0.1, 35, 270).item('counter', 8.9, 32.8, 90, { size: [3, 1] }).item('plant', 0.3, 42.4)
      .item('toilet', 12.9, 32.3, 180).item('toilet', 14.7, 32.3, 180).item('washbasin', 10, 28.4, 270)
      .item('toilet', 18.6, 32.3, 180).item('toilet', 20.4, 32.3, 180).item('washbasin', 22.9, 28.6, 90)
      .item('sofa3', 13.4, 35.6).item('lowtable', 14.5, 38.1).item('sofa3', 13.4, 40.2, 180).item('display_case', 22.4, 35.4, 90).item('plant', 22.6, 42.6)
      .wall(13.8, 31.4, 13.8, 34, 'thin').wall(19.5, 31.4, 19.5, 34, 'thin');
    // 機械室：受変電・コンプレッサー・ボイラー・非常用発電機
    g.item('em_generator', 24.4, 7.6).item('boiler', 32.6, 0.4).item('pump', 29.6, 0.5).item('pump', 29.6, 2.4)
      .item('dist_board', 24.2, 1.6, 270).item('control_panel', 24.2, 4, 270, { size: [2.4, 0.8] }).item('pipe', 29, 5.4, 0, { size: [6.6, 0.4] });
    // 検査室：測定機と実験台
    g.item('lab_bench', 24.4, 12.3).item('microscope', 25.4, 14.2).item('machine_tool', 31, 12.3, 0, { size: [3, 2.4] }).item('desk', 24.2, 19.6, 180)
      .item('filing', 34.8, 17.4, 90).item('cabinet', 28.6, 12.1, 0, { size: [2, 0.9] });
    // 製造エリア：北の加工セル（工作機械2列）、中央の組立ライン、南の梱包・出荷準備
    [38.5, 43, 47.5, 52, 56.5, 61, 65.5].forEach(x => g.item('machine_tool', x, 0.4).item('machine_tool', x, 8.2, 180));
    [40.5, 50.5, 60.5].forEach(x => g.item('conveyor', x, 19.2));
    [41, 46, 51, 56, 61, 66].forEach(x => g.item('workbench', x, 16.6, 0, { size: [3.6, 1.4] }).item('stool', x + 1.4, 18.2).item('stool', x + 1.4, 21.4));
    g.item('supply_shelf', 41, 24.6, 180).item('supply_shelf', 52, 24.6, 180).item('supply_shelf', 63, 24.6, 180)
      .item('stairs', 35, 22.5, 90).item('ind_tank', 24.6, 34).item('ind_tank', 28, 34).item('drum', 24.6, 38).item('drum', 25.9, 38).item('drum', 24.6, 39.3)
      .item('tool_shelf', 31.6, 41.6, 180).item('control_panel', 33, 22.2, 0, { size: [2, 0.8] }).item('dist_board', 24.2, 28, 270)
      .item('pallet', 42, 33).item('pallet', 44.6, 33).item('pallet_stack', 42, 37.6).item('cardboard', 47.6, 33.4).item('cardboard', 49, 33.4).item('cardboard', 48.3, 34.4)
      .item('workbench', 54, 34, 0, { size: [4, 1.6] }).item('pallet', 60, 33).item('pallet', 62.6, 33).item('hand_cart', 66, 33.2).item('forklift', 64.4, 38, 90)
      .item('extinguisher', 36.6, 0.3).item('hydrant', 70.6, 26, 90).item('tape', 37, 11.4, 0, { size: [34, 0.3] }).item('tape', 37, 15.6, 0, { size: [34, 0.3] }).item('tape', 37, 28, 0, { size: [34, 0.3] });
    // 倉庫：パレットラック（背中合わせ）とフォークリフトの通路
    [72, 80, 88].forEach(x => g.item('pallet_rack', x, 0.1).item('pallet_rack', x, 7.8, 180).item('pallet_rack', x, 10).item('pallet_rack', x, 18, 180));
    g.item('forklift', 84, 13.6, 90).item('pallet_stack', 73, 21.6).item('pallet_stack', 75.4, 21.6).item('big_crate', 90.6, 21.8)
      .item('cardboard', 79.4, 22.4).item('cardboard', 80.8, 22.4);
    // 搬入口
    g.item('pallet', 73, 31).item('pallet_stack', 73, 34).item('cardboard', 89.4, 31).item('cardboard', 90.8, 31).item('hand_cart', 93.6, 31.4)
      .item('pallet', 81.4, 37).item('forklift', 84.6, 36.6, 90).item('control_panel', 93.8, 40.8, 90, { size: [2, 0.8] });
    // 屋外：トラック・乗用車・守衛所
    g.item('truck', 74.5, 44.2).item('car', 2, 46.4).item('car', 7.4, 46.4).item('car', 12.8, 46.4).item('car', 18.2, 46.4)
      .item('drum', 92.4, 45).item('drum', 93.8, 45).item('container', 56, 45, 90)
      .item('desk', 40.2, 54.2).item('chair', 41.2, 55.5, 180).item('cctv', 45.2, 54.2);
    g.f.rooms.find(r => r.name.ja === '機械室').note = T('受変電設備とコンプレッサー。夜間は機械の音がやまない', 'Substation and compressors. The machines never fall silent at night', '수변전 설비와 컴프레서. 밤에도 기계 소리가 멈추지 않는다');

    const u = makeFloor('2F');
    u.room(T('事務室', 'Office', '사무실'), 'office', 0, 10, 16, 12, { ly: 3.4 })
      .room(T('工場長室', 'Plant manager', '공장장실'), 'office', 16, 10, 8, 12, { ly: 3 })
      .room(N.corridor, 'hall', 0, 22, 24, 4, { hideLabel: true })
      .room(N.corridor, 'hall', 10, 26, 4, 18, { hideLabel: true })
      .room(N.stairHall, 'hall', 0, 26, 10, 8, { hideLabel: true })
      .room(T('給湯室', 'Kitchenette', '탕비실'), 'kitchen', 0, 34, 10, 5)
      .room(N.toilet, 'wet', 0, 39, 10, 5)
      .room(T('会議室', 'Meeting room', '회의실'), 'office', 14, 26, 10, 10, { ly: 3 })
      .room(T('資料室', 'Records room', '자료실'), 'storage', 14, 36, 10, 8)
      .room(T('制御室', 'Control room', '제어실'), 'office', 24, 12, 12, 10, { wall: 'glass', ly: 1.8 })
      .room(T('キャットウォーク', 'Catwalk', '캣워크'), 'grate', 24, 22, 16, 3, { wall: 'rail', lx: -2.6 });
    // 制御室は製造エリア側（東）だけガラス。ほかの面は壁
    u.wall(24, 12, 24, 25, 'ext').wall(24, 12, 36, 12, 'ext');
    u.dh(6, 26, 4, 1, 0, 'open').dh(10, 26, 4, 1, 0, 'open')
      .dh(5, 22, 1.5, -1, 0).dh(18, 22, 1.5, -1, 1)          // 事務室・工場長室
      .dv(10, 35.75, 1.5, -1, 0).dv(10, 40.75, 1.5, -1, 0)   // 給湯室・トイレ
      .dv(14, 28, 1.5, 1, 0).dv(14, 39, 1.5, 1, 0)           // 会議室・資料室
      .dv(24, 23, 1.5, 1, 0, 'steel')                        // 廊下 → キャットウォーク
      .dh(26, 22, 1.5, -1, 0)                                // 制御室
      .wh(2, 10, 3).wh(8, 10, 3).wh(19, 10, 3).wv(0, 13, 3).wv(0, 17, 3).wv(0, 35, 3).wh(16, 44, 3).wh(19, 44, 3)
      .wh(3, 44, 3);
    u.item('office_desk', 1.2, 12.6).item('office_desk', 3.6, 12.6).item('office_desk', 1.2, 14, 180).item('office_desk', 3.6, 14, 180)
      .item('office_desk', 7.8, 12.6).item('office_desk', 10.2, 12.6).item('office_desk', 7.8, 14, 180).item('office_desk', 10.2, 14, 180)
      .item('desk', 6, 18.4, 180, { size: [3, 1.4] }).item('chair', 7, 17.4).item('filing', 0.1, 20.6).item('filing', 1.3, 20.6).item('copier', 13.4, 10.2)
      .item('whiteboard', 14.6, 15, 90, { size: [3, 0.4] })
      .item('desk', 19.6, 11.4, 0, { size: [3, 1.4] }).item('chair', 20.6, 12.9, 180).item('bookshelf', 16.1, 11.4, 270, { size: [3, 0.8] })
      .item('sofa2', 18, 18.6, 180).item('lowtable', 18.5, 17).item('safe', 22.6, 20.6, 0, { gm: true })
      .item('stairs_u', 0.5, 26.5, 0, { size: [5, 6] })
      .item('sink', 0.1, 34.1).item('fridge', 2.4, 34.1).item('table', 5, 36.4, 0, { size: [2.4, 1.2] })
      .item('toilet', 1, 42.3, 180).item('washbasin', 4.4, 42.9, 180)
      .item('meeting6', 16.4, 29.6).item('whiteboard', 23.5, 28, 90, { size: [3, 0.4] })
      .item('bookshelf', 14.1, 41, 270, { size: [3, 0.8] }).item('filing', 22.8, 36.2).item('filing', 22.8, 37.6).item('filing', 22.8, 39).item('cabinet', 17, 43, 180, { size: [4, 1] })
      .item('console', 34.4, 13, 90).item('console', 34.4, 17, 90).item('chair', 33, 14.2, 270).item('chair', 33, 18.2, 270)
      .item('monitor_wall', 24.1, 14, 270).item('control_panel', 27, 12.1).item('control_panel', 29.8, 12.1).item('alarm', 24.2, 20.6)
      .item('stairs', 35, 22.5, 90);
    // 工場棟は吹き抜け。外壁と倉庫との間仕切りだけが2階の高さまで立ち上がる
    u.wall(24, 0, 96, 0, 'ext').wall(96, 0, 96, 44, 'ext').wall(24, 44, 96, 44, 'ext').wall(24, 0, 24, 12, 'ext').wall(72, 0, 72, 44, 'int');
    u.text(T('吹き抜け（製造エリア）', 'Open to the production floor', '뚫린 공간(제조 구역)'), 54, 30, { size: 0.7 })
      .text(T('吹き抜け（倉庫・搬入口）', 'Open to the warehouse', '뚫린 공간(창고·반입구)'), 84, 22, { size: 0.7 });
    u.f.rooms.find(r => r.name.ja === '工場長室').note = T('金庫に産業廃棄物の不法投棄の記録', 'The safe holds records of illegal waste dumping', '금고에 산업 폐기물 불법 투기 기록');
    return [g.f, u.f];
  }

  /* ---------- 物流倉庫（平屋・トラックバース4か所） ---------- */
  // トラックバースのシャッターを長辺に並べ、内側に荷捌き場、奥に保管エリア。パレットラックはバースに直角に
  // 背中合わせで並べ、間をフォークリフトの通路（幅3m）にする。事務所とドライバー控室は角にまとめ、控室は外から入る

  function warehouse() {
    const b = makeFloor('1F');
    b.room(T('保管エリア', 'Storage area', '보관 구역'), 'industrial', 0, 0, 76, 30, { lx: -1.4, ly: 13 })
      .room(T('冷蔵室', 'Cold room', '냉장실'), 'storage', 64, 0, 12, 12, { ly: 3.4 })
      .room(T('荷捌き場', 'Staging area', '하역장'), 'industrial', 14, 30, 62, 14, { lx: -1, ly: 0.2 })
      .room(T('事務所', 'Office', '사무소'), 'office', 0, 30, 14, 7, { ly: 1.6 })
      .room(T('ドライバー控室', 'Drivers\' room', '운전기사 대기실'), 'living', 0, 37, 9, 7, { ly: 2.4 })
      .room(N.toilet, 'wet', 9, 37, 5, 7, { ly: -1.6 })
      .room(T('トラックヤード', 'Truck yard', '트럭 야드'), 'road', 0, 44, 76, 24, { lx: -6, ly: 5 })
      .room(T('コンテナ（施錠）', 'Container (locked)', '컨테이너(잠김)'), 'storage', 66, 48, 5, 12, { wall: 'thin', gm: true, plName: '', hideLabel: true, note: T('中に密航者と木箱。外から南京錠', 'Stowaways and crates inside, padlocked from outside', '안에 밀항자와 나무 상자. 밖에서 자물쇠') })
      .room(T('守衛所', 'Guardhouse', '경비실'), 'office', 20, 62, 6, 6, { ly: -1.6 });
    b.dh(14, 30, 50, 1, 0, 'open').dh(64, 30, 12, 1, 0, 'open')   // 保管エリア ↔ 荷捌き場（壁なし）
      .dh(66, 12, 2, 1, 0, 'steel')                                // 冷蔵室
      .dh(10, 30, 1.5, -1, 0)                                      // 事務所 → 保管エリア
      .dv(14, 32, 1.5, 1, 0)                                       // 事務所 → 荷捌き場
      .dv(0, 32.5, 1.5, -1, 0)                                     // 事務所の通用口
      .dh(5, 37, 1.5, 1, 0)                                        // 事務所 ↔ 控室（受付窓口）
      .dh(3, 44, 1.5, 1, 1)                                        // 控室（ヤードから）
      .dv(9, 40, 1.5, 1, 0)                                        // トイレ
      .dh(18, 44, 6, -1, 0, 'shutter').dh(30, 44, 6, -1, 0, 'shutter').dh(42, 44, 6, -1, 0, 'shutter').dh(54, 44, 6, -1, 0, 'shutter')
      .dv(76, 38, 1.5, 1, 0, 'steel')                              // 荷捌き場の通用口
      .dh(67, 60, 3, 1, 0, 'door2')                                // コンテナの扉
      .dv(26, 64, 1.5, 1, 0)                                       // 守衛所
      .wv(0, 34, 2).wh(5.5, 44, 2).wh(11, 44, 2).wh(22, 62, 2).wv(20, 64, 2)
      .wh(6, 0, 3).wh(26, 0, 3).wh(46, 0, 3).wv(76, 16, 3).wv(76, 23, 3);
    // 敷地の柵と門
    b.wall(0, 68, 76, 68, 'fence').wall(0, 44, 0, 68, 'fence').wall(76, 44, 76, 68, 'fence')
      .dh(32, 68, 6, -1, 0, 'gate').dh(38, 68, 6, -1, 1, 'gate');
    // パレットラック：壁際は片面、ほかは背中合わせ。間は幅3mのフォークリフト通路
    [0.2, 60.4].forEach(x => [2, 10, 18].forEach(y => b.item('pallet_rack', x, y, 90)));
    [8.4, 18.8, 29.2, 39.6, 50].forEach(x => [2, 10, 18].forEach(y => b.item('pallet_rack', x, y, 270).item('pallet_rack', x + 2.2, y, 90)));
    b.item('forklift', 4.6, 12, 0).item('forklift', 25, 20, 180).item('hand_cart', 46, 4)
      .item('pallet', 64, 14).item('pallet', 66.6, 14).item('pallet_stack', 69.2, 14).item('pallet_stack', 71.6, 14).item('big_crate', 64.4, 18.6)
      .item('big_crate', 67.8, 18.6).item('cardboard', 71.6, 18.6).item('cardboard', 73, 18.6).item('cardboard', 72.3, 19.6).item('pallet', 64, 24).item('pallet', 66.6, 24)
      .item('extinguisher', 0.2, 0.2).item('hydrant', 75.4, 26.4, 90).item('cctv', 0.2, 29.2);
    // 冷蔵室
    b.item('supply_shelf', 64.2, 0.1).item('supply_shelf', 67.4, 0.1).item('supply_shelf', 70.6, 0.1).item('supply_shelf', 75, 4, 90)
      .item('pallet', 65, 5).item('pallet_stack', 68, 5).item('cardboard', 71, 5.4).item('cardboard', 71, 6.4);
    // 荷捌き場：バースごとの仮置き、ドックレベラー、フォークリフトの充電場所
    [18, 30, 42, 54].forEach(x => b.item('grating', x + 0.5, 42.2, 0, { size: [5, 1.8] }));
    b.item('pallet', 16, 33).item('pallet', 18.6, 33).item('pallet_stack', 21.2, 33).item('cardboard', 16.2, 36).item('cardboard', 17.6, 36)
      .item('pallet', 28, 33).item('pallet_stack', 30.6, 33).item('pallet', 33.2, 33).item('hand_cart', 36.2, 33.4)
      .item('pallet', 40, 33).item('pallet', 42.6, 33).item('cardboard', 45.4, 33.4).item('cardboard', 46.8, 33.4).item('cardboard', 46.1, 34.4)
      .item('workbench', 52, 33, 0, { size: [4, 1.6] }).item('pallet_stack', 56.6, 33)
      .item('forklift', 66, 35.2, 90).item('forklift', 66, 38.4, 90).item('dist_board', 75.3, 34, 90).item('hand_cart', 72.4, 40.4);
    // 事務所・控室・トイレ
    b.item('office_desk', 1, 31.6).item('office_desk', 3.4, 31.6).item('chair', 1.7, 33.1, 180).item('chair', 4.1, 33.1, 180)
      .item('filing', 12.8, 30.6, 90).item('whiteboard', 6.4, 30.1, 0, { size: [3, 0.4] }).item('copier', 11.4, 35.6, 180).item('safe', 0.2, 35.6)
      .item('bench', 0.2, 38.6, 270, { size: [3, 0.9] }).item('vending', 7.2, 38, 90).item('table', 2.4, 40, 0, { size: [2.4, 1.2] })
      .item('toilet', 11, 42.2, 180).item('washbasin', 12.8, 37.2, 90);
    // ヤード：バースに着いたトラック、コンテナ、乗用車
    b.item('truck', 18.5, 44.4).item('truck', 42.5, 44.4).item('container', 54.5, 44.4).item('container', 71, 48)
      .item('car', 2, 58.4, 90).item('drum', 62, 45).item('drum', 63.4, 45).item('cone', 31, 47).item('cone', 36, 47)
      .item('big_crate', 66.6, 48.6, 0, { gm: true }).item('npc_bound', 67.4, 52.6, 0, { gm: true }).item('drum', 69.4, 52.4, 0, { gm: true }).item('flashlight', 68, 56.2, 0, { gm: true })
      .item('desk', 20.2, 62.2).item('chair', 21.2, 63.5, 180);
    b.text(T('コンテナ', 'Container', '컨테이너'), 68.5, 61.2, { size: 0.45 });
    b.f.rooms.find(r => r.name.ja === '冷蔵室').note = T('室温マイナス20度。内側からは開かない扉', '−20 °C inside. The door does not open from within', '실내 영하 20도. 안에서는 열리지 않는 문');
    return [b.f];
  }

  /* ---------- 地下水路・下水道（B1 幹線と分岐・地上の道路） ---------- */
  // 幹線は道路の下を通り、中央の水路の両側に幅1mの歩廊と手すり。支線は横から合流し、歩廊はその上をグレーチングで渡る。
  // ポンプ場の機械室と水門操作室は幹線の脇、人孔（マンホール）は足掛け金物のはしごで地上の道路へ。
  // 歩廊と水路は屋外の部屋（壁なし）で並べ、トンネルの壁は手描きの壁で引く

  function sewer() {
    const b = makeFloor('B1');
    b.room(T('水路（幹線）', 'Main channel', '수로(간선)'), 'water', 0, 16, 80, 6, { lx: -12 })
      .room(T('北歩廊', 'North walkway', '북쪽 보도'), 'porch', 0, 14, 80, 2, { hideLabel: true })
      .room(T('南歩廊', 'South walkway', '남쪽 보도'), 'porch', 0, 22, 80, 2, { hideLabel: true })
      .room(T('分岐路の歩廊', 'Branch walkway', '분기로 보도'), 'porch', 18, 0, 2, 14, { hideLabel: true })
      .room(T('分岐路（北）', 'North branch', '분기로(북)'), 'water', 20, 0, 3, 14)
      .room(T('マンホールA', 'Manhole A', '맨홀 A'), 'industrial', 4, 10, 4, 4, { ly: 0.8 })
      .room(T('機械室', 'Pump room', '펌프실'), 'garage', 28, 2, 16, 12, { ly: 2 })
      .room(T('水門操作室', 'Sluice control', '수문 조작실'), 'garage', 50, 8, 8, 6, { ly: -0.4 })
      .room(T('マンホールB', 'Manhole B', '맨홀 B'), 'industrial', 70, 24, 4, 4, { ly: -0.8 })
      .room(T('旧水路', 'Old tunnel', '옛 수로'), 'porch', 60, 24, 4, 14, { hideLabel: true })
      .room(T('旧水路', 'Old tunnel', '옛 수로'), 'porch', 40, 34, 20, 4, { lx: -4 })
      .room(T('ねぐら', 'Lair', '소굴'), 'cave', 26, 28, 14, 12, { gm: true, plName: '', note: T('崩れた煉瓦の奥。下水に棲みついた何者かが、行方不明者の持ち物を溜め込んでいる', 'Behind the broken brickwork. Something that lives in the sewers hoards the belongings of the missing', '무너진 벽돌 안쪽. 하수도에 사는 무언가가 실종자들의 소지품을 모아 두었다') });
    // トンネルの壁（手描き）。部屋どうしが接するところは自動の壁に任せる
    b.wall(0, 14, 4, 14, 'ext').wall(8, 14, 18, 14, 'ext').wall(23, 14, 28, 14, 'ext').wall(44, 14, 50, 14, 'ext').wall(58, 14, 80, 14, 'ext')
      .wall(0, 24, 60, 24, 'ext').wall(64, 24, 70, 24, 'ext').wall(74, 24, 80, 24, 'ext')
      .wall(0, 14, 0, 16, 'ext').wall(0, 22, 0, 24, 'ext').wall(80, 14, 80, 16, 'ext').wall(80, 22, 80, 24, 'ext')
      .wall(0, 16, 0, 22, 'bars').wall(80, 16, 80, 22, 'bars')                 // 流入口・流出口の格子
      .wall(18, 0, 18, 14, 'ext').wall(23, 0, 23, 14, 'ext').wall(18, 0, 20, 0, 'ext').wall(20, 0, 23, 0, 'bars')
      .wall(60, 24, 64, 24, 'ext').wall(60, 24, 60, 34, 'ext').wall(64, 24, 64, 38, 'ext').wall(40, 38, 64, 38, 'ext').wall(40, 34, 60, 34, 'ext')
      .wall(40, 34, 40, 38, 'ext')
      .wall(4, 16, 48, 16, 'rail').wall(50, 16, 80, 16, 'rail').wall(0, 22, 10, 22, 'rail').wall(12, 22, 48, 22, 'rail').wall(50, 22, 80, 22, 'rail');
    b.dh(5, 14, 2, 1, 0, 'open')                  // マンホールA
      .dh(31, 14, 1.5, -1, 0, 'steel')            // 機械室
      .dh(51, 14, 1.5, -1, 0, 'steel')            // 水門操作室
      .dh(71, 24, 2, 1, 0, 'open')                // マンホールB
      .dh(61, 24, 2, 1, 0, 'gate')                // 旧水路の格子扉（錆びて施錠）
      .dv(40, 35, 2, -1, 0, 'hole');              // 崩れた煉瓦の穴
    // 歩廊・水路：渡りのグレーチング、水門、除塵スクリーンにかかったゴミ
    b.item('grating', 10, 16, 0, { size: [2, 6] }).item('grating', 48, 16, 0, { size: [2, 6] }).item('grating', 20, 14, 0, { size: [3, 2] })
      .item('sluice', 52, 16, 90).item('debris', 0.3, 16.6, 0, { size: [1.4, 4.6] }).item('debris', 78.4, 17, 0, { size: [1.4, 3.6] })
      .item('ladder', 5.4, 10.4, 0, { size: [1.2, 3] }).item('ladder', 18.4, 0.4, 0, { size: [1.2, 3] }).item('ladder', 71.4, 24.6, 0, { size: [1.2, 3] })
      .item('pipe', 30, 14.05, 0, { size: [10, 0.4] }).item('cable_rack', 60, 14.05, 0, { size: [10, 0.5] }).item('puddle', 14, 22.2, 0, { size: [2.4, 1.6] })
      .item('valve', 45.6, 14.4).item('puddle', 66, 14.3, 0, { size: [2.4, 1.4] }).item('drum', 36, 18.4).item('bones', 74.6, 14.4, 0, { size: [1.2, 1] });
    // 機械室：排水ポンプ・配管・制御盤、地上への階段
    b.item('stairs_u', 28.5, 2.5, 0, { size: [5, 6] }).item('dist_board', 34, 2.1).item('pump', 36.6, 2.6).item('pump', 39.2, 2.6).item('pump', 41.8, 2.6)
      .item('pipe_big', 36, 4.6).item('control_panel', 28.1, 10, 270).item('em_generator', 39.4, 10.4).item('tool_shelf', 34.4, 13, 180)
      .item('desk', 28.6, 12.6, 180, { size: [2.4, 1.2] }).item('valve', 34.6, 6.8);
    // 水門操作室・旧水路・ねぐら
    b.item('control_panel', 50.4, 8.1).item('valve', 53.4, 8.2).item('dist_board', 55.6, 8.1).item('desk', 55.4, 12.6, 180)
      .item('puddle', 60.6, 29.4, 0, { size: [2.4, 1.6] }).item('drag_marks', 61.4, 34.2, 0, { size: [1.2, 3] }).item('drag_marks', 50, 35.4, 90, { size: [1.2, 6] })
      .item('bones', 56, 34.6, 0, { size: [1.2, 1] }).item('debris', 41, 34.4, 0, { size: [2, 1.6] })
      .item('hay', 28, 30, 0, { gm: true }).item('bones', 31.6, 33.6, 0, { gm: true }).item('bones', 35.4, 30, 0, { gm: true }).item('bag', 29, 37.6, 0, { gm: true })
      .item('offering', 34, 37, 0, { gm: true }).item('candle', 37.6, 37.4, 0, { gm: true }).item('abyss', 31, 34.2, 0, { gm: true }).item('totem', 37.4, 28.8, 0, { gm: true });
    b.text(T('歩廊', 'Walkway', '보도'), 64, 15, { size: 0.42 }).text(T('歩廊', 'Walkway', '보도'), 30, 23, { size: 0.42 })
      .text(T('水門', 'Sluice gate', '수문'), 54.6, 19, { size: 0.45 })
      .text(T('除塵スクリーン', 'Trash screen', '제진 스크린'), 3.4, 21.1, { size: 0.36 });
    b.f.rooms.find(r => r.name.ja === '水門操作室').note = T('水門を閉じると下流の水位が下がり、旧水路の床が現れる', 'Closing the gate drops the water downstream and exposes the floor of the old tunnel', '수문을 닫으면 하류 수위가 내려가 옛 수로 바닥이 드러난다');

    const s = makeFloor(T('地上', 'Street level', '지상'));
    s.room(T('ポンプ場（管理棟）', 'Pump station', '펌프장(관리동)'), 'office', 28, 0, 18, 9, { lx: 3, ly: 1.4 })
      .room(T('雑居ビル', 'Office building', '상가 건물'), 'roof', 0, 0, 14, 9)
      .room(T('倉庫', 'Warehouse', '창고'), 'roof', 50, 0, 30, 9)
      .room(T('脇道', 'Side street', '골목길'), 'road', 14, 0, 14, 9, { hideLabel: true })
      .room(T('北の歩道', 'North sidewalk', '북쪽 보도'), 'porch', 0, 9, 80, 3, { hideLabel: true })
      .room(T('道路', 'Street', '도로'), 'road', 0, 12, 80, 14, { lx: -8 })
      .room(T('南の歩道', 'South sidewalk', '남쪽 보도'), 'porch', 0, 26, 80, 3, { hideLabel: true });
    fillYard(s, 46, 0, 50, 9, T('敷地', 'Lot', '부지'), 'dirt');
    s.dh(40, 9, 1.5, -1, 0)                        // ポンプ場の入口
      .wh(34, 9, 3).wh(43, 9, 2).wv(46, 3, 2)
      .dh(4, 9, 2, -1, 0, 'auto').dh(60, 9, 5, -1, 0, 'shutter');
    s.item('stairs_u', 28.5, 2.5, 0, { size: [5, 6] }).item('office_desk', 35, 0.4).item('chair', 35.7, 1.9, 180).item('locker', 42.8, 0.1)
      .item('control_panel', 45.1, 5.6, 90, { size: [2.4, 0.8] }).item('filing', 39.4, 0.2).item('whiteboard', 34.4, 8.5, 180, { size: [3, 0.4] })
      .item('manhole', 5.2, 10.6).item('manhole', 18.2, 0.4).item('manhole', 71.2, 24.8)
      .item('cone', 3.6, 10.1).item('cone', 7.2, 10.1).item('barricade', 4.4, 12.4).item('van', 8, 13.2, 90)
      .item('gutter', 20, 12.1).item('gutter', 50, 25.3).item('grating', 30, 12.1).item('grating', 64, 25.4)
      .item('utility_pole', 16, 9.2).item('utility_pole', 56, 26.2).item('streetlight', 30, 26.2).item('streetlight', 70, 9.2)
      .item('road_arrow', 36, 14.2, 90).item('road_arrow', 50, 21, 270);
    s.text(T('作業中のマンホール', 'Open manhole', '작업 중인 맨홀'), 11, 11, { size: 0.36 });
    return [b.f, s.f];
  }

  /* ---------- 廃工場（工場を廃墟化し、崩落と封鎖区画を足したもの） ---------- */

  function abandonedFactory() {
    const floors = decay(factory(), 4242, { remove: 4, blood: 7 });
    const [g, u] = floors;
    g.name = '1F';
    u.name = '2F';
    const put = (f, t, x, y, rot, extra) => {
      const a = M.ASSET[t];
      const e = { ...(extra || {}) };
      const w = e.size ? e.size[0] : a.w, h = e.size ? e.size[1] : a.h;
      delete e.size;
      const swap = rot === 90 || rot === 270;
      f.items.push({ t, x, y, w: swap ? h : w, h: swap ? w : h, rot: rot || 0, ...e });
    };
    // 屋外は舗装が割れて草が生え、車は1台だけ放置されている
    g.rooms.forEach(r => { if (r.cat === 'road') r.cat = 'dirt'; });
    g.items = g.items.filter(i => !['truck', 'car', 'container', 'forklift'].includes(i.t) || (i.t === 'car' && i.x < 3) || (i.t === 'forklift' && i.y > 36));
    // 封鎖区画（倉庫の奥）。ラックをどけて、封印した扉とテープで閉じる
    g.items = g.items.filter(i => !(i.x >= 88 && i.y < 14));
    g.rooms.push({ name: T('封鎖区画', 'Sealed area', '봉쇄 구역'), cat: 'danger', x: 88, y: 0, w: 8, h: 14, ly: -4.6, gm: true, plName: '', note: T('事故のあと封鎖された区画。床の亀裂から何かが這い出してくる', 'Sealed after the accident. Something crawls out of the crack in the floor', '사고 후 봉쇄된 구역. 바닥 균열에서 무언가가 기어 나온다') });
    g.openings.push({ kind: 'sealed', o: 'v', x: 88, y: 4, len: 2, side: 1, hinge: 0 });
    put(g, 'tape', 86.6, 2.8, 90, { size: [4.4, 0.35] });
    put(g, 'abyss', 91, 5, 0, { gm: true });
    put(g, 'flesh', 92.8, 10.4, 0, { gm: true });
    put(g, 'black_stain', 88.4, 9.4, 0, { gm: true });
    put(g, 'chains', 88.4, 1.4, 0, { gm: true });
    put(g, 'drum', 94.4, 2, 0, { gm: true });
    put(g, 'tendrils', 90.5, -0.65, 0, { gm: true, size: [4, 1.4] });
    // 崩落：製造エリアの屋根が抜けて瓦礫と水たまり、壁の崩れ
    put(g, 'debris', 56.8, 4.6); put(g, 'debris', 60.2, 4.4, 90); put(g, 'puddle', 63.4, 5); put(g, 'puddle', 44, 29.6);
    put(g, 'puddle', 30, 26); put(g, 'danger', 55.2, 5.4); put(g, 'broken_furniture', 26, 40.4);
    put(g, 'collapse_wall', 71.15, 22.3, 90); put(g, 'crack_wall', 2, 21.65); put(g, 'wall_hole', 59, 43.45);
    put(g, 'broken_furniture', 6.4, 17.4); put(g, 'puddle', 80, 26); put(g, 'bush', 30, 50);
    put(g, 'bush', 64, 56); put(g, 'bush', 8, 56); put(g, 'tree', 90, 54);
    g.openings.forEach(o => { if (o.kind === 'shutter' && o.x === 86) o.kind = 'hole'; });
    g.openings.push({ kind: 'hole', o: 'v', x: 72, y: 22.6, len: 2.4, side: 1, hinge: 0 });
    // 2F：キャットウォークの手すりが外れ、制御室のガラスが割れている
    put(u, 'danger', 38.6, 22.4); put(u, 'glass', 33.6, 20); put(u, 'collapse_wall', 15, 21.25);
    put(u, 'puddle', 4, 16.4); put(u, 'broken_furniture', 11, 18.6);
    u.openings.push({ kind: 'hole', o: 'h', x: 15, y: 22, len: 2, side: 1, hinge: 0 });
    return floors;
  }

  /* ---------- ビル屋上（塔屋・設備・非常階段・隣のビル） ---------- */
  // 外周はパラペット（腰壁）、その内側 0.5m に高いフェンス。出入口は階段室の塔屋の鉄扉（雨仕舞いのため外開き）。
  // 塔屋にEV機械室が並び、高架水槽・室外機・キュービクル（高圧受変電設備）は前に点検の空きをとって置く。
  // 非常階段は外壁に取り付き、フェンスの扉から屋上へ。隣のビルとは幅1.5mの路地を挟む

  function rooftop() {
    const b = makeFloor(T('屋上', 'Rooftop', '옥상'));
    b.room(T('屋上', 'Rooftop', '옥상'), 'rooftop', 6, 0, 52, 36, { lx: 2, ly: 2, note: T('フェンスの外の縁に新しい足跡。誰かがここから隣のビルへ飛び移った', 'Fresh footprints on the ledge outside the fence: someone jumped to the next building from here', '펜스 바깥 가장자리에 새 발자국. 누군가 여기서 옆 건물로 뛰어 건넜다') })
      .room(T('塔屋（階段室）', 'Stair penthouse', '옥탑(계단실)'), 'hall', 12, 0, 10, 12, { ly: 4 })
      .room(T('EV機械室', 'Elevator room', 'EV 기계실'), 'garage', 22, 0, 7, 12, { ly: 1.6 })
      .room(T('屋上倉庫', 'Rooftop storeroom', '옥상 창고'), 'storage', 29, 0, 5, 6, { ly: 2.2, gm: true, note: T('誰かが住み着いている。寝袋と食べ残し、壁一面にビルの利用者の隠し撮り写真', 'Someone is living here: a sleeping bag, leftover food, and the walls covered in hidden-camera photos of the building\'s tenants', '누군가 살고 있다. 침낭과 먹다 남은 음식, 벽 가득 건물 이용자의 몰래 찍은 사진') })
      .room(T('キュービクル', 'Switchgear cubicle', '큐비클'), 'danger', 40, 12, 12, 7, { wall: 'fence', ly: -2.4 })
      .room(T('非常階段', 'Fire escape', '비상계단'), 'balcony', 0, 22, 6, 8, { hideLabel: true })
      .room(T('隣のビルの屋上', 'Next-door rooftop', '옆 건물 옥상'), 'rooftop', 61, 10, 14, 26, { ly: -4 })
      .room(T('階段室', 'Stairwell', '계단실'), 'hall', 67, 28, 8, 8, { ly: -2.4 });
    b.dh(18.5, 12, 2, 1, 0, 'steel')          // 屋上出入口（外開き）
      .dv(22, 9.5, 1.5, 1, 0, 'steel')          // EV機械室（階段室から）
      .dh(30.5, 6, 1.5, 1, 0, 'locked')         // 屋上倉庫
      .dv(40, 14.5, 2, 1, 0, 'gate')            // キュービクルの扉
      .wv(12, 9, 2).wh(19, 0, 2).wh(25, 0, 2);
    // パラペットの内側のフェンス。非常階段の踊り場の前は外へ張り出して扉をつける
    b.wall(7, 1, 12, 1, 'fence').wall(34, 1, 57, 1, 'fence').wall(57, 1, 57, 35, 'fence').wall(7, 35, 57, 35, 'fence')
      .wall(7, 1, 7, 22, 'fence').wall(6, 22, 7, 22, 'fence').wall(6, 22, 6, 30, 'fence').wall(6, 30, 7, 30, 'fence').wall(7, 30, 7, 35, 'fence')
      .dv(6, 25, 2, 1, 0, 'gate')               // 非常階段への扉
      .dh(68, 28, 1.5, -1, 0, 'steel');         // 隣のビルの塔屋
    // 塔屋：階段・EV機械室（巻上機の点検口と制御盤）・倉庫
    b.item('stairs_u', 12.5, 0.5, 0, { size: [5, 8] }).item('extinguisher', 12.3, 11.1).item('dist_board', 21.4, 2, 90)
      .item('hatch', 23, 1).item('control_panel', 25.8, 0.2, 0, { size: [3, 0.8] }).item('control_panel', 28.2, 3, 90, { size: [3, 0.8] })
      .item('dist_board', 28.4, 8, 90).item('cable_rack', 22.2, 6.4, 0, { size: [4, 0.6] })
      .item('futon', 31.8, 0.2).item('bag', 29.3, 0.3).item('flashlight', 29.4, 1.6).item('photo', 29.4, 3).item('photo', 30.5, 3.3);
    // 高架水槽・アンテナ・換気・キュービクル
    b.item('water_tower', 46, 3.4).item('ladder', 50.4, 4).item('water_pipe', 34.4, 5.2, 0, { size: [11.6, 0.5] })
      .item('antenna', 36, 1.6).item('antenna', 39.4, 1.6).item('vent_unit', 23.4, 13.6).item('vent_unit', 26.6, 13.6)
      .item('control_panel', 43, 14.4, 0, { size: [4, 2] }).item('control_panel', 47.2, 14.4, 0, { size: [4, 2] }).item('danger', 50.6, 12.4);
    // 室外機置場：前を空けて3列
    [24.4, 28, 31.6].forEach(y => { for (let i = 0; i < 8; i++) b.item('ac_unit', 37 + i * 2.4, y); });
    // 喫煙所・排水口・非常階段
    b.item('garden_bench', 7.4, 13, 270).item('garden_bench', 7.4, 17, 270).item('plant', 7.6, 20.6)
      .item('grating', 7.6, 33.6, 0, { size: [1, 1] }).item('grating', 55.4, 33.6, 0, { size: [1, 1] }).item('puddle', 22, 29.4)
      .item('bush', 10, 33).item('bush', 12.2, 33).item('bush', 14.4, 33).item('bush', 16.6, 33).item('garden_bench', 11.6, 30.4, 180)
      .item('bird', 30, 24).item('bird', 31.4, 25).item('fire_escape', 0.5, 23)
      .item('footprints', 57.2, 16, 0, { gm: true, size: [0.6, 2.4] }).item('phone', 57.25, 19.4, 0, { gm: true });
    // 隣のビル（2m低い）
    b.item('ac_unit', 62.6, 11.4).item('ac_unit', 65, 11.4).item('ac_unit', 67.4, 11.4).item('antenna', 72, 11.2)
      .item('vent_unit', 71, 15).item('stairs', 69.6, 33.6, 90).item('puddle', 64, 26);
    b.text(T('室外機置場', 'AC units', '실외기 구역'), 46.3, 23.2, { size: 0.55 })
      .text(T('喫煙所', 'Smoking spot', '흡연 구역'), 11, 16.4, { size: 0.55 })
      .text(T('路地', 'Alley', '골목'), 59.5, 20, { size: 0.55 })
      .text(T('2m 低い', '2 m lower', '2m 낮음'), 68, 20.6, { size: 0.5 });
    return [b.f];
  }

  /* ---------- 歴史・和風・宗教・商業（T3） ---------- */

  /* (T3 のテンプレート関数はここ) */
  /* T3 で参考にした定石:
   *  - 武家屋敷: 通りに面した長屋門（中間部屋・物置）から前庭の延段を折れて式台のある玄関へ。玄関の間→次の間→座敷と奥へ進み、
   *    座敷は床の間を備えて南の庭園に縁側で面する。台所（土間とかまど）・茶の間・寝間・仏間・納戸は西と北、蔵は裏の勝手庭。
   *    床の間の脇に武者隠し、縁側の突き当たりに客用の厠。庭は池泉（石橋・飛び石・灯籠・松）と書院前の枯山水、竹垣と中門の奥の露地に茶室（躙口・水屋）
   *  - 寺院: 山門（仁王像）→参道（灯籠・手水舎・常香炉）→本堂の一直線。本堂は外陣・内陣（須弥壇と本尊）・余間と回り縁。
   *    庫裏は渡り廊下で本堂とつながり、玄関・寺務所・台所・住職の居室・客間。鐘楼は山門の脇、墓地は本堂の横、客間の前に枯山水
   *  - 教会: 正面（図では下）の拝廊から身廊（中央通路と側廊、柱、会衆席、告解室）を進み、内陣の祭壇へ。内陣の両脇に聖具室と事務室、
   *    正面の脇に鐘楼（螺旋階段で鐘室とオルガン席へ）、内陣の下に地下納骨堂
   *  - オフィスビル: センターコア（両端の階段で二方向避難・EV2基・トイレ）を全階同じ位置に置く。1F は風除室とロビー・セキュリティゲート・
   *    防災センター・通用口・荷捌き場、基準階はコアを囲むオープンオフィスと会議室・休憩室・サーバー室、役員階は秘書室の奥に社長室、屋上は塔屋と設備
   *  - コンビニ: 角の自動ドアの脇にレジ、正面の窓沿いに雑誌棚、中央にゴンドラ、奥の壁に飲料の冷蔵ケース（裏はウォークイン冷蔵庫）。
   *    レジの奥に事務スペース、バックヤードと搬入口は側面の通路側、前面に駐車場と車止め
   */

  /* ---------- 歴史：武家屋敷と日本庭園（長屋門・式台玄関・座敷・書院・蔵、池泉と露地の茶室） ---------- */

  function buke() {
    const b = makeFloor('1F');
    b.room(T('通り', 'Street', '거리'), 'road', 0, 0, 64, 5)
      .room(T('中間部屋', 'Servants\' room', '하인 방'), 'washitsu', 18, 5, 6, 6)
      .room(T('長屋門', 'Gatehouse', '나가야몬'), 'doma', 24, 5, 5, 6)
      .room(T('物置', 'Shed', '헛간'), 'storage', 29, 5, 5, 6)
      .room(T('延段', 'Stone path', '돌길'), 'porch', 24, 11, 5, 6, { hideLabel: true })
      .room(T('延段', 'Stone path', '돌길'), 'porch', 29, 14, 10, 3, { hideLabel: true })
      .room(T('玄関', 'Entrance', '현관'), 'doma', 34, 17, 5, 3)
      .room(T('式台', 'Shikidai', '시키다이'), 'engawa', 34, 20, 5, 2)
      .room(T('土間', 'Doma (earthen floor)', '흙바닥(도마)'), 'doma', 6, 22, 8, 12)
      .room(T('台所', 'Kitchen', '부엌'), 'kitchen', 14, 22, 7, 8, { ly: -2.6 })
      .room(T('寝間', 'Bedroom', '침실'), 'washitsu', 21, 22, 7, 8)
      .room(T('仏間', 'Altar room', '불간'), 'washitsu', 28, 22, 5, 8)
      .room(T('玄関の間', 'Reception room', '현관방'), 'washitsu', 33, 22, 7, 8)
      .room(T('武者隠し', 'Guard closet', '무사 은신처'), 'danger', 40, 22, 2, 8, { gm: true, plName: '', note: T('座敷の床の間の脇、隠し戸の奥。護衛が息をひそめた小部屋で、座敷の話し声が筒抜けになる', 'Behind a hidden door beside the alcove: a closet where guards waited, hearing every word in the zashiki', '도코노마 옆 숨은 문 뒤. 호위가 숨어 있던 작은 방으로, 자시키의 대화가 다 들린다') })
      .room(T('納戸', 'Storeroom', '광'), 'storage', 42, 22, 6, 8)
      .room(T('風呂', 'Bath', '목욕간'), 'wet', 6, 34, 4, 5)
      .room(T('厠', 'Toilet', '변소'), 'wet', 10, 34, 4, 5)
      .room(T('茶の間', 'Family room', '거실(차노마)'), 'washitsu', 14, 30, 7, 9, { ly: -2.6 })
      .room(T('書院', 'Shoin (study)', '서원'), 'washitsu', 21, 30, 9, 9)
      .room(T('次の間', 'Anteroom', '옆방'), 'washitsu', 30, 30, 8, 9)
      .room(T('座敷', 'Zashiki (guest hall)', '객실(자시키)'), 'washitsu', 38, 30, 10, 9, { ly: 2.6 })
      .room(T('縁側', 'Engawa', '툇마루'), 'engawa', 14, 39, 36, 2)
      .room(T('縁側', 'Engawa', '툇마루'), 'engawa', 48, 30, 2, 9, { hideLabel: true })
      .room(T('厠', 'Toilet', '변소'), 'wet', 48, 26, 3, 4, { hideLabel: true })
      .room(T('蔵', 'Kura (storehouse)', '곳간(쿠라)'), 'storage', 1, 8, 7, 10, { wall: 'stone' })
      .room(T('庭園', 'Garden', '정원'), 'garden', 0, 41, 50, 17, { lx: -8.5, ly: -1 })
      .room(T('枯山水', 'Dry garden', '가레산스이'), 'gravel', 20, 42, 9, 6, { ly: -1.8 })
      .room(T('池', 'Pond', '연못'), 'water', 33, 44, 13, 5, { lx: 2 })
      .room(T('池', 'Pond', '연못'), 'water', 30, 46, 3, 5, { hideLabel: true })
      .room(T('池', 'Pond', '연못'), 'water', 40, 49, 4, 3, { hideLabel: true })
      .room(T('露地', 'Tea garden (roji)', '로지(다정)'), 'garden', 50, 43, 14, 15, { ly: -5.5 })
      .room(T('茶室', 'Tea room', '다실'), 'washitsu', 54, 47, 6, 6, { ly: -2.2 })
      .room(T('水屋', 'Mizuya', '미즈야'), 'kitchen', 60, 47, 3, 6);
    fillYard(b, 0, 5, 64, 58, T('庭', 'Grounds', '마당'));
    // 屋敷を囲む土塀（長屋門の外壁と通用門で切れる）
    b.wall(0, 5, 18, 5, 'ext').wall(34, 5, 64, 5, 'ext').wall(0, 5, 0, 58, 'ext').wall(64, 5, 64, 58, 'ext').wall(0, 58, 64, 58, 'ext');
    b.dh(24, 5, 5, 1, 0, 'big2')                   // 長屋門の門扉
      .dh(24, 11, 5, 1, 0, 'open')
      .dv(24, 7.5, 1.5, -1, 0, 'sliding')          // 中間部屋
      .dv(29, 7.5, 1.5, 1, 0, 'sliding')           // 物置
      .dh(12.25, 5, 1.5, 1, 0)                     // 通用門（勝手庭へ）
      .dh(35, 17, 3, 1, 0, 'sliding2')             // 玄関の引き戸
      .dh(34, 20, 5, 1, 0, 'open')                 // 玄関 ↔ 式台
      .dh(34.5, 22, 4, 1, 0, 'sliding2')           // 式台 ↔ 玄関の間
      .dh(9, 22, 3, 1, 0, 'sliding2')              // 内玄関（土間の大戸）
      .dv(14, 23, 6, 1, 0, 'open')                 // 上がり框（土間 ↔ 台所）
      .dh(7.25, 34, 1.5, 1, 0, 'sliding').dh(11.25, 34, 1.5, 1, 0, 'sliding')   // 風呂・厠
      .dh(15.5, 30, 3, 1, 0, 'sliding2')           // 台所 ↔ 茶の間
      .dv(21, 24.5, 3, 1, 0, 'sliding2')           // 台所 ↔ 寝間
      .dv(28, 24.5, 3, 1, 0, 'sliding2')           // 寝間 ↔ 仏間
      .dv(33, 24.5, 3, 1, 0, 'sliding2')           // 仏間 ↔ 玄関の間
      .dh(23.5, 30, 3, 1, 0, 'sliding2')           // 寝間 ↔ 書院
      .dh(34.5, 30, 3, 1, 0, 'sliding2')           // 玄関の間 ↔ 次の間
      .dv(21, 33, 3, 1, 0, 'sliding2')             // 茶の間 ↔ 書院
      .dv(30, 32, 3, 1, 0, 'sliding2')             // 書院 ↔ 次の間
      .dv(38, 34.5, 4, 1, 0, 'sliding2')           // 次の間 ↔ 座敷
      .dh(43.5, 30, 3, 1, 0, 'sliding2')           // 座敷 ↔ 納戸（帳台構え）
      .dh(40.25, 30, 1.5, -1, 0, 'secret')         // 武者隠しの隠し戸
      .dv(42, 26, 1.5, -1, 0, 'sliding')           // 武者隠し ↔ 納戸
      .dh(15, 39, 5, 1, 0, 'sliding2').dh(22, 39, 7, 1, 0, 'sliding2').dh(31, 39, 6, 1, 0, 'sliding2').dh(39, 39, 8, 1, 0, 'sliding2')   // 障子
      .dv(48, 31, 7, 1, 0, 'sliding2')             // 座敷 ↔ 東の縁側
      .dh(48, 39, 2, 1, 0, 'open')                 // 縁側の曲がり角
      .dh(48.25, 30, 1.5, -1, 0, 'sliding')        // 客用の厠
      .dh(15, 41, 6, 1, 0, 'sliding2').dh(22.5, 41, 6, 1, 0, 'sliding2').dh(30, 41, 6, 1, 0, 'sliding2').dh(37.5, 41, 6, 1, 0, 'sliding2').dh(44.5, 41, 4, 1, 0, 'sliding2')   // 縁側の雨戸・ガラス戸
      .dv(50, 31, 7, 1, 0, 'sliding2')
      .dv(8, 14, 1.5, 1, 0, 'locked')              // 蔵の扉
      .dv(54, 50.5, 1.5, 1, 0, 'sliding')          // 躙口
      .dh(55.5, 47, 3, 1, 0, 'sliding2')           // 貴人口
      .dv(60, 49.5, 1.5, 1, 0, 'sliding')          // 茶道口
      .dh(60.75, 47, 1.5, 1, 0, 'sliding')         // 水屋の勝手口
      .wh(19.5, 5, 2, 'barred').wh(30.5, 11, 2)
      .wh(6.5, 22, 2).wh(14.5, 22, 2).wh(23.5, 22, 2.5).wh(45.5, 22, 2, 'barred')
      .wv(6, 35.5, 2).wh(11, 39, 1.5).wv(51, 27, 2)
      .wh(3.5, 8, 2, 'barred')
      .wv(54, 48, 1.5).wv(63, 50.5, 1.5);
    // 長屋門・前庭・勝手庭
    b.item('futon', 18.3, 8.7, 90).item('andon', 22.9, 5.5).item('chest', 18.4, 5.4)
      .item('crate', 32.1, 5.4).item('crate', 32.1, 7.2).item('barrel', 30.2, 9.6).item('log', 29.6, 5.3, 0, { size: [2.2, 0.8] })
      .item('bamboo_fence', 16.75, 11, 90, { size: [4, 0.5] }).item('bamboo_fence', 16.75, 17.4, 90, { size: [4.6, 0.5] })
      .item('well', 10.2, 13.2).item('log', 2.2, 19.4, 0, { size: [3, 0.8] }).item('tree', 11.6, 7.8, 0, { size: [2.6, 2.6] })
      .item('pine', 33.6, 11.2, 0, { size: [3.6, 3.6] }).item('lantern', 21.6, 13.2).item('garden_rock', 40, 18.4, 0, { size: [1.4, 1] })
      .item('bush', 30.6, 18.6).item('bush', 41.6, 15.6).item('tree', 45, 7).item('pine', 52, 13, 0, { size: [4.4, 4.4] })
      .item('hokora', 61.8, 5.6).item('bamboo', 60.6, 8.6).item('bamboo', 60.6, 12.2).item('bamboo', 60.8, 16)
      .item('tree', 55.6, 24.6).item('bush', 51.6, 22.4);
    // 母屋
    b.item('kamado', 6.05, 23.2, 270).item('sink', 6.05, 27, 270).item('barrel', 6.2, 29.5).item('barrel', 6.2, 30.9)
      .item('log', 12.9, 30.5, 90, { size: [3, 0.8] }).item('crate', 12.2, 22.3)
      .item('irori', 16.5, 25.5).item('cupboard', 17.5, 22.05)
      .item('futon', 22, 23).item('futon', 24.5, 23).item('dresser', 21.2, 29.05, 180).item('andon', 26.9, 22.3)
      .item('butsudan', 29.6, 22.05).item('zabuton', 30, 23.6).item('andon', 28.2, 28.9)
      .item('byobu', 35, 24, 0, { size: [3, 0.6] }).item('katanakake', 33.05, 27.7, 270).item('andon', 39.1, 29.1)
      .item('knife', 40.8, 24, 90, { label: T('刀', 'Sword', '칼') }).item('candle', 40.6, 22.4)
      .item('chest', 42.3, 22.4).item('chest', 44, 23.6).item('cabinet', 47.05, 23, 90, { size: [3, 0.9] })
      .item('bathtub', 8.2, 35.6).item('toilet', 11.5, 37.2, 180)
      .item('cupboard', 14.05, 31, 270, { size: [2.4, 0.8] }).item('zataku', 15.6, 35).item('zabuton', 16.5, 33.7).item('zabuton', 18.7, 35.4).item('zabuton', 14.3, 35.4).item('andon', 19.9, 37.1)
      .item('desk', 21.2, 30.05, 0, { size: [2, 1] }).item('zabuton', 21.6, 31.3).item('bookshelf', 27.3, 30.05, 0, { size: [2.4, 0.8] })
      .item('katanakake', 29.15, 35.6, 90).item('andon', 21.3, 37.1)
      .item('zabuton', 31.2, 36.8).item('zabuton', 32.8, 36.8).item('andon', 30.3, 30.3)
      .item('tokonoma', 38.05, 30.1, 270).item('zataku', 42.6, 32.6).item('zabuton', 43.5, 31.3).item('zabuton', 43.5, 34.7).item('andon', 47.1, 30.1)
      .item('toilet', 49, 26.2);
    // 蔵
    b.item('ladder', 1.5, 8.5, 0, { size: [1.2, 2.6] }).item('chest', 3.4, 8.5).item('chest', 5.6, 8.5)
      .item('cabinet', 1.4, 11.5, 270, { size: [3, 0.9] }).item('crate', 1.5, 15.7).item('crate', 3.4, 15.7)
      .item('trapdoor', 5.4, 14.8, 0, { gm: true, size: [1.4, 1.4], label: T('床下の隠し穴', 'Hidden pit', '마루 밑 구멍') });
    // 庭園：書院前の枯山水、座敷前の池と石橋、築山
    b.item('garden_rock', 24.8, 41.15, 0, { size: [1.4, 0.8] }).item('garden_rock', 42.5, 41.15, 0, { size: [1.4, 0.8] })
      .item('moss', 20.6, 43.8, 0, { size: [3, 2.2] }).item('garden_rock', 21, 44.2).item('garden_rock', 25.5, 45.4, 0, { size: [1.4, 1.1] }).item('garden_rock', 27, 43.6, 0, { size: [1.2, 0.9] })
      .item('stone_bridge', 36, 43, 0, { size: [2, 7] })
      .item('stepping', 38.2, 42.2, 90).item('stepping', 36.2, 50.4)
      .item('garden_rock', 31, 44.4, 0, { size: [1.6, 1.2] }).item('garden_rock', 46.2, 47.6, 0, { size: [1.4, 1.1] }).item('garden_rock', 39, 50.6, 0, { size: [1.2, 1] })
      .item('shishiodoshi', 44.4, 52.4).item('lantern', 46.4, 43.4)
      .item('pine', 2, 43, 0, { size: [4.4, 4.4] }).item('moss', 6, 49, 0, { size: [6, 4] }).item('garden_rock', 7, 50, 0, { size: [2, 1.6] }).item('pine', 9.5, 48.5, 0, { size: [3.6, 3.6] })
      .item('lantern', 13, 44).item('bush', 16, 52).item('bush', 18, 54.5)
      .item('pine', 30, 52.4, 0, { size: [4, 4] }).item('lantern', 38.6, 55.6).item('moss', 41, 54, 0, { size: [5, 3] }).item('tree', 46, 54.6)
      .item('tree', 1, 54.6).item('bamboo', 24, 54.6);
    // 外露地（腰掛待合）から中門、内露地（つくばい・踏石）から躙口へ
    b.item('stepping', 50.4, 36.4, 90).item('stepping', 52.2, 38)
      .item('garden_bench', 55.4, 39.4).item('lantern', 58.8, 39.4).item('pine', 59.6, 32.8, 0, { size: [4, 4] })
      .item('bamboo_fence', 50, 42.6, 0, { size: [2, 0.5] }).item('bamboo_fence', 54, 42.6).item('bamboo_fence', 60, 42.6, 0, { size: [4, 0.5] })
      .item('bamboo_fence', 49.6, 43.1, 90).item('bamboo_fence', 49.6, 49.1, 90).item('bamboo_fence', 49.6, 55.1, 90, { size: [2.9, 0.5] })
      .item('stepping', 52.2, 43.3, 0, { size: [1.6, 4.2] }).item('tsukubai', 51, 48).item('garden_rock', 52.6, 50.7, 0, { size: [1.2, 1] }).item('lantern', 51, 52.8)
      .item('moss', 55, 54, 0, { size: [4, 3] }).item('pine', 59.8, 54, 0, { size: [3.6, 3.6] })
      .item('tokonoma', 55, 51.95, 180, { size: [3, 1] }).item('irori', 57.3, 49.2, 0, { size: [1.2, 1.2] })
      .item('zabuton', 57.3, 50.6).item('zabuton', 55, 48.3).item('zabuton', 55, 49.7)
      .item('cupboard', 62.15, 48.1, 90, { size: [2.2, 0.8] }).item('sink', 61.65, 50.6, 90);
    b.text(T('中門', 'Middle gate', '중문'), 51, 42.1, { size: 0.45 })
      .text(T('勝手庭', 'Service yard', '뒷마당'), 13, 19.6, { size: 0.6, bold: true })
      .text(T('前庭', 'Front court', '앞뜰'), 46, 18.6, { size: 0.7, bold: true });
    // 母屋（屋内）と外観（敷地・長屋門・蔵・茶室）に分ける
    return splitBuilding(b.f, [[6, 22, 42, 17], [14, 39, 36, 2], [48, 26, 3, 4], [48, 30, 2, 9], [34, 17, 5, 5]],
      T('母屋', 'Main house', '안채'), T('外観', 'Exterior', '외관'), T('母屋', 'Main house', '안채'));
  }

  /* ---------- 歴史：寺院（山門・参道・本堂・庫裏・鐘楼・墓地・庭園） ---------- */

  function temple() {
    const b = makeFloor('1F');
    b.room(T('内陣', 'Inner sanctum', '내진'), 'special', 25, 4, 12, 9, { ly: 2.6 })
      .room(T('余間', 'Side chamber', '여간'), 'washitsu', 20, 4, 5, 9)
      .room(T('余間', 'Side chamber', '여간'), 'washitsu', 37, 7, 5, 6)
      .room(T('秘仏の間', 'Hidden buddha room', '비불의 방'), 'special', 37, 4, 5, 3, { gm: true, plName: '', note: T('須弥壇の脇の隠し戸の奥。一度も開帳されたことのない秘仏が祀られている', 'Behind a hidden door beside the altar: a secret buddha that has never been shown to anyone', '수미단 옆 숨은 문 뒤. 한 번도 공개된 적 없는 비불이 모셔져 있다') })
      .room(T('外陣', 'Worship hall', '외진'), 'washitsu', 20, 13, 22, 9, { ly: 1.6 })
      .room(T('回り縁', 'Veranda', '회랑 마루'), 'balcony', 18, 22, 26, 2, { lx: -8 })
      .room(T('回り縁', 'Veranda', '회랑 마루'), 'balcony', 18, 4, 2, 18, { hideLabel: true })
      .room(T('回り縁', 'Veranda', '회랑 마루'), 'balcony', 42, 4, 2, 18, { hideLabel: true })
      .room(T('渡り廊下', 'Covered walkway', '연결 복도'), 'balcony', 44, 10, 3, 3, { hideLabel: true })
      .room(T('台所', 'Kitchen', '부엌'), 'kitchen', 47, 4, 8, 6)
      .room(N.bath, 'wet', 55, 4, 4, 6)
      .room(T('便所', 'WC', '화장실'), 'wet', 59, 4, 4, 6)
      .room(N.corridor, 'hall', 47, 10, 16, 2, { hideLabel: true })
      .room(T('居間', 'Living room', '거실'), 'washitsu', 47, 12, 6, 7, { ly: -2 })
      .room(T('寺務所', 'Temple office', '사무소'), 'office', 47, 19, 6, 6, { ly: 2 })
      .room(T('玄関', 'Entrance', '현관'), 'doma', 47, 25, 6, 5)
      .room(N.corridor, 'hall', 53, 12, 2, 18, { hideLabel: true })
      .room(T('住職の部屋', 'Head priest\'s room', '주지 방'), 'washitsu', 55, 12, 8, 9, { ly: -1 })
      .room(T('客間', 'Guest room', '객실'), 'washitsu', 55, 21, 8, 9, { ly: -2.8 })
      .room(T('縁側', 'Engawa', '툇마루'), 'engawa', 55, 30, 8, 2, { hideLabel: true })
      .room(T('墓地', 'Graveyard', '묘지'), 'garden', 0, 0, 16, 32, { ly: 6.2 })
      .room(T('鐘楼', 'Bell tower', '종루'), 'porch', 4, 36, 8, 8, { ly: 3.2 })
      .room(T('参道', 'Approach', '참배길'), 'porch', 29, 24, 4, 22, { ly: 6 })
      .room(T('山門', 'Mountain gate', '산문'), 'doma', 25, 46, 12, 6)
      .room(T('庭園', 'Garden', '정원'), 'garden', 53, 32, 13, 14, { ly: 5.4 })
      .room(T('枯山水', 'Dry garden', '가레산스이'), 'gravel', 55, 33, 9, 8, { ly: 2.8 })
      .room(T('門前の道', 'Temple street', '절 앞길'), 'road', 0, 52, 66, 4);
    fillYard(b, 0, 0, 66, 52, T('境内', 'Temple grounds', '경내'));
    // 築地塀・墓地の柵・回り縁の高欄・山門の格子
    b.wall(0, 0, 66, 0, 'ext').wall(0, 0, 0, 52, 'ext').wall(66, 0, 66, 52, 'ext').wall(0, 52, 25, 52, 'ext').wall(37, 52, 66, 52, 'ext')
      .wall(16, 0, 16, 25, 'fence').wall(16, 29, 16, 32, 'fence').wall(0, 32, 16, 32, 'fence')
      .wall(18, 4, 18, 24, 'rail').wall(18, 4, 20, 4, 'rail').wall(42, 4, 44, 4, 'rail').wall(44, 4, 44, 10, 'rail').wall(44, 13, 44, 24, 'rail')
      .wall(18, 24, 29, 24, 'rail').wall(33, 24, 44, 24, 'rail').wall(44, 10, 47, 10, 'rail').wall(44, 13, 47, 13, 'rail')
      .wall(25, 13.6, 29.5, 13.6, 'rail').wall(32.5, 13.6, 37, 13.6, 'rail')                 // 内陣の結界
      .wall(29, 46.5, 29, 51.5, 'bars').wall(33, 46.5, 33, 51.5, 'bars');                   // 仁王像の格子
    b.dh(29, 52, 4, -1, 0, 'big2')                 // 山門の扉
      .dh(29, 46, 4, 1, 0, 'open')
      .dh(21, 22, 4, 1, 0, 'sliding2').dh(29, 22, 4, 1, 0, 'sliding2').dh(37, 22, 4, 1, 0, 'sliding2')   // 本堂の正面の戸
      .dv(20, 16, 3, 1, 0, 'sliding2').dv(42, 16, 3, 1, 0, 'sliding2')
      .dh(25, 13, 12, 1, 0, 'open')               // 外陣 ↔ 内陣
      .dh(21, 13, 3, 1, 0, 'sliding2').dh(38, 13, 3, 1, 0, 'sliding2')
      .dv(25, 8, 1.5, 1, 0, 'sliding').dv(37, 9, 1.5, -1, 0, 'sliding')
      .dv(37, 4.75, 1.5, 1, 0, 'secret')           // 秘仏の間
      .dv(47, 10.25, 1.5, 1, 0, 'sliding')         // 渡り廊下 → 庫裏
      .dh(49, 10, 3, -1, 0, 'sliding2').dh(56, 10, 1.5, -1, 0, 'sliding').dh(60, 10, 1.5, -1, 0)
      .dh(52, 4, 1.5, -1, 0, 'sliding')            // 台所の勝手口
      .dh(53, 12, 2, 1, 0, 'open')
      .dh(48.5, 12, 3, 1, 0, 'sliding2')           // 居間
      .dh(48, 25, 3, 1, 0, 'sliding2')             // 寺務所の受付（玄関から）
      .dv(53, 21, 1.5, 1, 0, 'sliding')
      .dh(48.5, 30, 3, 1, 0, 'sliding2')           // 庫裏の玄関
      .dv(53, 26, 3, 1, 0, 'open')                 // 上がり框
      .dv(55, 15, 3, 1, 0, 'sliding2').dv(55, 24, 3, 1, 0, 'sliding2')
      .dh(56, 30, 6, 1, 0, 'sliding2').dh(56, 32, 6, 1, 0, 'sliding2')
      .wh(48, 4, 3).wh(56.5, 4, 1.5).wv(63, 6, 1.5).wv(63, 14, 3).wv(47, 15, 2).wv(47, 21, 2)
      .wh(26, 4, 2).wh(34, 4, 2).wh(21.5, 4, 2);
    // 本堂
    b.item('buddha_altar', 28.5, 4.4, 0, { size: [5, 3] }).item('candle', 27.2, 5.4).item('candle', 34, 5.4)
      .item('offering', 30.3, 7.8).item('lowtable', 30.2, 9.2, 0, { size: [1.6, 1] })
      .item('butsudan', 21.3, 4.4, 0, { size: [2.4, 1.2] }).item('cabinet', 20.4, 7, 270, { size: [3, 0.8] })
      .item('cabinet', 38.5, 7.3, 0, { size: [3, 0.8] }).item('chest', 40.1, 10.4)
      .item('idol', 39, 5, 0, { label: T('秘仏', 'Secret buddha', '비불') }).item('candle', 40.8, 4.3)
      .item('saisen', 29.8, 22.95);
    [24, 26, 28, 33, 35, 37].forEach(x => b.item('zabuton', x - 0.6, 15.6).item('zabuton', x - 0.6, 17.8));
    b.item('candle', 20.4, 13.4).item('candle', 40.8, 13.4);
    // 参道・鐘楼・山門・境内
    b.item('cauldron', 30.2, 26.4, 0, { label: T('常香炉', 'Incense burner', '상향로') })
      .item('lantern', 27.4, 30).item('lantern', 33.4, 30).item('lantern', 27.4, 40).item('lantern', 33.4, 40)
      .item('temizuya', 35.6, 35.6)
      .item('pillar', 4.2, 36.2, 0, { size: [0.6, 0.6] }).item('pillar', 11.2, 36.2, 0, { size: [0.6, 0.6] })
      .item('pillar', 4.2, 43.2, 0, { size: [0.6, 0.6] }).item('pillar', 11.2, 43.2, 0, { size: [0.6, 0.6] })
      .item('bonsho', 6.5, 38.4).item('log', 6.9, 37.1, 0, { size: [2.2, 0.5] })
      .item('statue', 26, 48, 0, { size: [2, 2], label: T('仁王像', 'Nio guardian', '인왕상') }).item('statue', 34, 48, 0, { size: [2, 2], label: T('仁王像', 'Nio guardian', '인왕상') })
      .item('tree', 37.6, 26.6, 0, { size: [5, 5] }).item('pine', 19.6, 27, 0, { size: [4, 4] }).item('pine', 14, 45.6, 0, { size: [4, 4] })
      .item('tree', 43, 41, 0, { size: [3.4, 3.4] }).item('garden_bench', 37.4, 32.4).item('bush', 23.2, 43).item('bush', 39, 46.4).item('tree', 0.8, 46.6)
      .item('well', 44.6, 1.2, 0, { size: [1.8, 1.8] }).item('tree', 62.4, 0.6)
      .item('stele', 38.4, 49.6, 0, { size: [1, 2], label: T('寺号標', 'Temple name pillar', '사호 표석') });
    // 庫裏
    b.item('kitchen', 47.1, 4.05).item('fridge', 53.6, 4.05).item('dining4', 48.6, 5.8, 90).item('cupboard', 54.05, 6, 90)
      .item('bathtub', 55.5, 4.3, 90).item('toilet', 61.6, 4.3).item('washbasin', 61.85, 6.2, 90)
      .item('zataku', 48.6, 15).item('zabuton', 47.3, 15.4).item('zabuton', 51.8, 15.4).item('tv', 48.5, 18.05, 180)
      .item('office_desk', 48, 20.3).item('chair', 48.7, 21.8).item('filing', 47.05, 23.2).item('safe', 51.6, 19.2)
      .item('cabinet', 47.05, 26.5, 90, { size: [2.6, 0.6] })
      .item('desk', 61.95, 13.2, 90, { size: [2.2, 1] }).item('zabuton', 60.6, 13.7).item('bookshelf', 56.5, 12.05).item('futon', 57, 18.6, 90).item('andon', 55.4, 12.4)
      .item('tokonoma', 61.55, 21.2, 90).item('zataku', 57.5, 25).item('zabuton', 58.4, 23.7).item('zabuton', 58.4, 27.1).item('zabuton', 56.2, 25.4).item('zabuton', 60.7, 25.4);
    // 墓地：区画ごとの墓石（和型の角石）の列、水場・六地蔵・無縁塚、奥にGM用の古井戸
    [0.8, 3.8, 6.8, 9.8, 12.8].forEach(x => [1.2, 5.6, 10, 14.4].forEach(y => {
      b.wall(x, y + 2.4, x, y, 'rail').wall(x, y, x + 2.2, y, 'rail').wall(x + 2.2, y, x + 2.2, y + 2.4, 'rail')
        .item('pillar', x + 0.65, y + 0.35, 0, { size: [0.9, 0.9] });
    }));
    b.item('sink', 12.6, 21.2, 0, { size: [2, 1.2], label: T('水場', 'Water stand', '물터') })
      .item('stele', 1.4, 21.4, 0, { label: T('無縁塚', 'Mound of the unclaimed', '무연고 무덤') })
      .item('tree', 5.6, 23, 0, { size: [3.4, 3.4] })
      .item('well', 1.2, 27.4, 0, { gm: true, size: [1.8, 1.8], label: T('古井戸', 'Old well', '오래된 우물') });
    [3, 4.4, 5.8, 7.2, 8.6, 10].forEach(x => b.item('statue', x, 30.4, 0, { size: [1, 1] }));
    // 庭園：客間の前の枯山水と竹垣
    b.item('garden_rock', 57, 34.6, 0, { size: [2, 1.6] }).item('garden_rock', 59.2, 35.2, 0, { size: [1.2, 1] }).item('garden_rock', 61.6, 37.6, 0, { size: [1.6, 1.2] })
      .item('moss', 56.4, 34, 0, { size: [4.2, 3] }).item('moss', 60.8, 37, 0, { size: [3, 2.2] })
      .item('pine', 61.6, 41.6, 0, { size: [4, 4] }).item('lantern', 54.6, 42.6).item('bush', 58, 43.6)
      .item('bamboo_fence', 52.6, 32.2, 90).item('bamboo_fence', 52.6, 38.2, 90, { size: [5.6, 0.5] })
      .item('bamboo_fence', 55, 45.6, 0, { size: [11, 0.5] });
    b.f.rooms.find(r => r.name.ja === '墓地').note = T('奥の古井戸は封じられているはずだが、夜になると蓋がずれている', 'The old well at the back is supposed to be sealed, yet every night its lid has been moved', '안쪽의 오래된 우물은 봉인되어 있어야 하지만 밤마다 뚜껑이 어긋나 있다');
    return [b.f];
  }

  /* ---------- 歴史：教会（B1 地下納骨堂・1F 身廊と内陣・2F オルガン席と鐘室） ---------- */

  // 鐘楼の螺旋階段と、内陣の脇の納骨堂への階段（上下階で同じ位置）
  const CHURCH_TOWER = [28.6, 40.6];
  const CHURCH_CRYPT_STAIRS = [25, 9.3];

  function church() {
    const g = makeFloor('1F');
    g.room(T('身廊', 'Nave', '신랑'), 'public', 4, 14, 22, 26)
      .room(T('内陣', 'Chancel', '내진'), 'special', 8, 2, 14, 12, { ly: 2.4 })
      .room(N.office, 'office', 0, 6, 8, 8, { ly: 1.6 })
      .room(T('聖具室', 'Sacristy', '제의실'), 'office', 22, 2, 8, 7, { ly: 0.6 })
      .room(T('階段室', 'Stairwell', '계단실'), 'hall', 22, 9, 8, 5, { lx: -2.4, ly: 1.2 })
      .room(T('拝廊', 'Narthex', '배랑'), 'hall', 4, 40, 22, 5, { lx: 4.5 })
      .room(T('鐘楼', 'Bell tower', '종탑'), 'hall', 26, 38, 7, 7, { ly: -2.8 });
    g.wall(8, 13, 13.5, 13, 'rail').wall(16.5, 13, 22, 13, 'rail');           // 聖体拝領台
    g.dh(12.5, 45, 5, 1, 0, 'big2')                 // 正面の大扉
      .dh(13.5, 40, 3, -1, 0, 'door2').dh(6, 40, 1.5, -1, 0).dh(22.5, 40, 1.5, -1, 1)   // 拝廊 ↔ 身廊
      .dv(26, 42, 1.5, -1, 0)                      // 鐘楼
      .dh(8, 14, 14, 1, 0, 'open')                 // 身廊 ↔ 内陣
      .dh(5, 14, 1.5, -1, 0)                       // 事務室
      .dh(23.5, 14, 1.5, -1, 1)                    // 階段室
      .dv(22, 4, 1.5, 1, 0)                        // 内陣 ↔ 聖具室
      .dh(23, 9, 1.5, 1, 0)                        // 聖具室 ↔ 階段室
      .dv(0, 8, 1.5, -1, 0).dv(30, 3.5, 1.5, 1, 0)  // 事務室・聖具室の勝手口
      .wv(4, 16.5, 2).wv(4, 26, 2).wv(4, 35, 2).wv(26, 16.5, 2).wv(26, 21, 2).wv(26, 26, 2).wv(26, 31, 2).wv(26, 35.5, 2)
      .wv(8, 3, 2).wh(13.5, 2, 3).wh(1, 6, 2.5).wv(0, 11, 2).wh(26.5, 2, 2).wv(30, 6, 2)
      .wh(6, 45, 3).wh(21, 45, 3).wv(4, 42, 2).wv(33, 41, 2).wh(28.5, 38, 2);
    g.item('altar', 13, 4.2, 0, { size: [4, 1.6] }).item('statue', 14.4, 2.3, 0, { size: [1.2, 1.2], label: T('十字架', 'Crucifix', '십자가') })
      .item('candle', 11.8, 4.6).item('candle', 17.4, 4.6).item('cabinet', 19.2, 2.2, 0, { size: [1.6, 0.8], label: T('聖櫃', 'Tabernacle', '감실') })
      .item('rug', 10.5, 3.6, 0, { size: [9, 5] }).item('lectern', 9.2, 9.6)
      .item('chair', 20.6, 5.6, 270).item('chair', 20.6, 6.8, 270).item('chair', 20.6, 8, 270)
      .item('font', 9.4, 42.3).item('cabinet', 18.5, 40.15, 0, { size: [3, 0.6] }).item('bench', 4.2, 43.9, 0, { size: [3, 0.9] });
    for (let y = 19; y <= 37; y += 2) g.item('pew', 8.6, y, 180, { size: [5.4, 1.2] }).item('pew', 16, y, 180, { size: [5.4, 1.2] });
    [16, 20, 24, 28, 32, 36].forEach(y => g.item('pillar', 7.2, y, 0, { size: [0.8, 0.8] }).item('pillar', 22, y, 0, { size: [0.8, 0.8] }));
    g.item('confessional', 4.05, 20.5, 90).item('confessional', 4.05, 29.5, 90).item('candle', 23.6, 15).item('plant', 4.4, 15);
    g.item('office_desk', 1.2, 7.4).item('chair', 1.9, 8.9, 180).item('bookshelf', 4.6, 6.05).item('filing', 6.75, 7.4, 90).item('filing', 6.75, 8.8, 90).item('safe', 6.7, 11.2)
      .item('wardrobe', 23.6, 2.05, 0, { size: [3, 1] }).item('counter', 24.6, 6.8, 0, { size: [3, 1] }).item('safe', 28.6, 2.1).item('washbasin', 22.1, 6.6, 90)
      .item('stairs', CHURCH_CRYPT_STAIRS[0], CHURCH_CRYPT_STAIRS[1], 90)
      .item('spiral', CHURCH_TOWER[0], CHURCH_TOWER[1]);

    const u = makeFloor('2F');
    u.room(T('オルガン席', 'Organ loft', '오르간석'), 'public', 4, 36, 22, 9, { ly: 1.4 })
      .room(T('鐘室', 'Belfry', '종실'), 'stone', 26, 38, 7, 7, { ly: -2.8 });
    u.wall(4, 36.15, 26, 36.15, 'rail');               // 身廊を見下ろす手すり
    u.dh(4, 36, 22, 1, 0, 'open')
      .dv(26, 42, 1.5, -1, 0)
      .wh(6, 45, 3).wh(12.5, 45, 5, 'window2').wh(21, 45, 3).wv(4, 41, 2)
      .wv(33, 40, 2.5, 'boarded').wh(29, 45, 2.5, 'boarded').wh(29.5, 38, 2.5, 'boarded');
    u.item('organ', 13, 43.35, 180).item('bench', 14, 42.2, 0, { size: [2, 0.6] })
      .item('pew', 6, 37.6, 180, { size: [5.4, 1.2] }).item('pew', 6, 39.6, 180, { size: [5.4, 1.2] })
      .item('pew', 18.6, 37.6, 180, { size: [5.4, 1.2] }).item('pew', 18.6, 39.6, 180, { size: [5.4, 1.2] })
      .item('lectern', 14.1, 37.4, 180).item('cabinet', 4.1, 42.3, 270, { size: [2.4, 0.8] }).item('piano_up', 21, 43.6, 180)
      .item('bonsho', 26.3, 38.3, 0, { size: [2.4, 2.4], label: T('鐘', 'Bell', '종') })
      .item('spiral', CHURCH_TOWER[0], CHURCH_TOWER[1]);
    u.text(T('↑ 身廊の吹き抜け', '↑ Open to the nave', '↑ 신랑 위 트인 공간'), 15, 35.2, { size: 0.5 });

    const c = makeFloor('B1');
    c.room(T('地下納骨堂', 'Crypt', '지하 납골당'), 'stone', 8, 2, 14, 12, { wall: 'stone', ly: 1 })
      .room(T('納骨棚の部屋', 'Ossuary niches', '납골함 방'), 'stone', 22, 2, 8, 7, { wall: 'stone', ly: 0.8 })
      .room(T('階段室', 'Stairwell', '계단실'), 'hall', 22, 9, 8, 5, { wall: 'stone', lx: -2.4, ly: 1.2 })
      .room(T('封印された墓室', 'Sealed tomb', '봉인된 묘실'), 'danger', 0, 2, 8, 12, { wall: 'stone', ly: -0.6, gm: true, plName: '', note: T('初代司祭の墓と伝わる。封印の内側から、床を引っかいた跡が扉まで続いている', 'Said to be the founding priest\'s tomb. Scratch marks run across the floor from inside, up to the sealed door', '초대 사제의 무덤이라고 전해진다. 봉인 안쪽에서 문까지 바닥을 긁은 자국이 이어진다') });
    c.dv(22, 10.5, 2, -1, 0, 'gate')                // 納骨堂の格子扉
      .dh(23, 9, 1.5, -1, 0, 'gate')                // 納骨棚の部屋
      .dv(8, 11, 2, 1, 0, 'sealed');                // 封印扉
    c.item('altar', 8.05, 4.4, 270, { size: [3, 1.4] }).item('candle', 8.5, 2.6).item('candle', 8.5, 8)
      .item('sarcophagus', 11.4, 2.4).item('sarcophagus', 14.6, 2.4).item('sarcophagus', 17.8, 2.4)
      .item('sarcophagus', 11.4, 9.2).item('sarcophagus', 14.6, 9.2).item('pillar', 18.6, 9.6, 0, { size: [0.8, 0.8] }).item('pillar', 18.6, 12.6, 0, { size: [0.8, 0.8] })
      .item('cabinet', 22.7, 2.05, 0, { size: [6.6, 0.8], label: T('納骨棚', 'Niches', '납골함') }).item('cabinet', 29.15, 2.9, 90, { size: [5.5, 0.8] })
      .item('cabinet', 22.05, 3, 270, { size: [4, 0.8] }).item('bones', 25, 5.2).item('candle', 27.6, 7.6)
      .item('stairs', CHURCH_CRYPT_STAIRS[0], CHURCH_CRYPT_STAIRS[1], 90)
      .item('coffin', 3.1, 2.6).item('magic_circle', 1.5, 8.4, 0, { size: [5, 5] }).item('chains', 0.4, 3, 90, { size: [3, 0.6] })
      .item('idol', 3.6, 8.6).item('drag_marks', 5.4, 11.2, 90, { size: [1.4, 2.4] });
    return [c.f, g.f, u.f, churchOutside()];
  }

  // 教会の外観：建物は十字形の屋根（身廊・内陣・両翼）と尖塔の鐘楼。ドア・窓は1Fと同じ位置
  function churchOutside() {
    const o = makeFloor(T('外観', 'Exterior', '외관'));
    o.room(T('教会', 'Church', '교회'), 'roof', 4, 14, 22, 31, { ly: 3 })
      .room(T('内陣の屋根', 'Chancel roof', '내진 지붕'), 'roof', 8, 2, 14, 12, { hideLabel: true })
      .room(T('事務室の屋根', 'Office roof', '사무실 지붕'), 'roof', 0, 6, 8, 8, { hideLabel: true })
      .room(T('聖具室の屋根', 'Sacristy roof', '제의실 지붕'), 'roof', 22, 2, 8, 12, { hideLabel: true })
      .room(T('鐘楼（尖塔）', 'Bell tower (spire)', '종탑(첨탑)'), 'stone', 26, 38, 7, 7, { ly: -2.8 })
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 6, 45, 18, 4, { lx: 5.5 })
      .room(T('墓地', 'Churchyard', '교회 묘지'), 'garden', 28, 14, 10, 23, { ly: 1.5 });
    fillYard(o, 0, 0, 39, 50, T('敷地', 'Church grounds', '교회 부지'));
    o.wall(28, 14, 38, 14, 'fence').wall(38, 14, 38, 37, 'fence').wall(28, 37, 38, 37, 'fence').wall(28, 14, 28, 37, 'fence');
    o.dh(12.5, 45, 5, 1, 0, 'big2').dv(0, 8, 1.5, -1, 0).dv(30, 3.5, 1.5, 1, 0).dv(28, 24.5, 2, -1, 0, 'gate')
      .wv(4, 16.5, 2).wv(4, 26, 2).wv(4, 35, 2).wv(26, 16.5, 2).wv(26, 21, 2).wv(26, 26, 2).wv(26, 31, 2).wv(26, 35.5, 2)
      .wv(8, 3, 2).wh(13.5, 2, 3).wh(1, 6, 2.5).wv(0, 11, 2).wh(26.5, 2, 2).wv(30, 6, 2)
      .wh(6, 45, 3).wh(21, 45, 3).wv(4, 42, 2).wv(33, 41, 2);
    // 屋根の棟に十字架、正面にばら窓、尖塔の頂に十字架
    o.text('✝', 15, 26, { size: 4 }).text('✝', 15, 7.6, { size: 2.4 }).text('✝', 29.5, 41.5, { size: 2.4 });
    o.item('statue', 13.9, 42.2, 0, { size: [2.2, 2.2], label: T('ばら窓', 'Rose window', '장미창') });
    for (const [x, y] of [[29.4, 15.2], [32, 15.2], [34.6, 15.2], [29.4, 19.4], [32, 19.4], [34.6, 19.4], [29.4, 29], [32, 29], [34.6, 29], [29.4, 33.2], [32, 33.2], [34.6, 33.2]]) o.item('grave', x, y);
    o.item('tree', 34.6, 22.6, 0, { size: [2.8, 2.8] }).item('statue', 30.6, 22.6, 0, { size: [1.4, 1.4], label: T('天使像', 'Angel statue', '천사상') })
      .item('statue', 7, 45.6, 0, { size: [1.4, 1.4], label: T('聖母像', 'Madonna', '성모상') }).item('streetlight', 22.4, 47.6)
      .item('tree', 0.4, 29).item('tree', 0.6, 44.6, 0, { size: [2.6, 2.6] }).item('tree', 34.6, 45.4, 0, { size: [3, 3] }).item('bush', 2, 2).item('bush', 33, 2.4);
    return o.f;
  }

  /* ---------- 商業：オフィスビル（1F ロビー・2F オフィス・3F 役員・屋上、センターコア） ---------- */

  // コア：両端の階段（二方向避難）・EV2基・トイレ。全階で同じ位置。2F 以上の階段は南の廊下へ防火扉
  function officeCore(b, upper) {
    b.room(N.stairs, 'hall', 12, 11, 5, 10, { hideLabel: true })
      .room(N.evHall, 'hall', 17, 11, 10, 10, { ly: 2 })
      .room(T('男子トイレ', 'Men\'s WC', '남자 화장실'), 'wet', 27, 11, 4, 5)
      .room(T('女子トイレ', 'Women\'s WC', '여자 화장실'), 'wet', 27, 16, 4, 5)
      .room(N.stairs, 'hall', 31, 11, 5, 10, { hideLabel: true });
    b.dh(18, 21, 8, 1, 0, 'open')
      .dv(27, 12, 1.5, 1, 0).dv(27, 18.5, 1.5, 1, 1);
    if (upper) b.dh(13, 21, 2, -1, 0, 'firedoor').dh(33, 21, 2, -1, 1, 'firedoor');
    b.item('stairs_u', 12, 11.3).item('stairs_u', 31, 11.3)
      .item('elevator', 17.5, 11.1).item('elevator', 21.5, 11.1).item('plant', 25.9, 13.8, 0, { size: [1, 1] })
      .item('toilet', 29.35, 11.2, 90).item('toilet', 29.35, 12.6, 90).item('washbasin', 27.3, 14.75, 180)
      .item('toilet', 29.35, 18.2, 90).item('toilet', 29.35, 19.6, 90).item('washbasin', 27.3, 16.15);
  }

  // 役員室（12 × 8）。窓を背に机、手前に応接セット。入口は廊下側の端
  function execOffice(b, x0, name, doorRight) {
    b.room(name, 'office', x0, 0, 12, 8, { ly: 0.7 })
      .dh(doorRight ? x0 + 9.5 : x0 + 1, 8, 1.5, -1, doorRight ? 1 : 0)
      .wh(x0 + 4, 0, 4, 'window2');
    b.item('office_desk', x0 + 4.4, 2.1, 0, { size: [3.2, 1.4] }).item('chair', x0 + 5.5, 0.9)
      .item('sofa2', doorRight ? x0 + 0.8 : x0 + 7.6, 5.7, 180).item('lowtable', doorRight ? x0 + 1.3 : x0 + 8.1, 4.3)
      .item('bookshelf', doorRight ? x0 + 11.15 : x0 + 0.05, 0.5, doorRight ? 90 : 270)
      .item('plant', doorRight ? x0 + 10.6 : x0 + 0.4, 4.6, 0, { size: [1, 1] });
  }

  function officeBuilding() {
    const g = makeFloor('1F');
    officeCore(g, false);
    g.room(N.storeroom, 'storage', 0, 0, 12, 11)
      .room(T('電気室', 'Electrical room', '전기실'), 'garage', 12, 0, 12, 11)
      .room(T('荷捌き場', 'Loading bay', '하역장'), 'garage', 24, 0, 24, 11, { lx: 5 })
      .room(T('通用口', 'Staff entrance', '직원 출입구'), 'hall', 0, 11, 12, 10, { ly: -1.6 })
      .room(T('防災センター', 'Security office', '방재 센터'), 'office', 0, 21, 12, 11, { ly: 1.2 })
      .room(T('サービス通路', 'Service corridor', '서비스 통로'), 'hall', 36, 11, 3, 10, { hideLabel: true })
      .room(T('応接室', 'Visitor room', '응접실'), 'office', 39, 11, 9, 10, { ly: 3 })
      .room(T('ロビー', 'Lobby', '로비'), 'public', 12, 21, 36, 11, { lx: 9, ly: -2.6 })
      .room(T('風除室', 'Vestibule', '바람막이실'), 'hall', 18, 28, 8, 4)
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 0, 32, 48, 3, { hideLabel: true });
    g.dh(20.5, 32, 3, 1, 0, 'auto').dh(20.5, 28, 3, 1, 0, 'auto')   // 正面入口（風除室）
      .dv(0, 15, 1.5, -1, 0)                       // 通用口
      .dh(3, 11, 1.5, -1, 0)                       // 倉庫
      .dh(9, 21, 1.5, 1, 0)                        // 防災センター（通用口から）
      .dv(12, 23, 1.5, -1, 0)                      // 防災センター（ロビーから）
      .dv(12, 18.2, 2, 1, 0, 'firedoor')           // 階段（通用口から）
      .dv(36, 18.2, 2, -1, 0, 'firedoor')          // 階段（サービス通路から）
      .dh(36.5, 11, 2, -1, 0, 'steel')             // 荷捌き場 → サービス通路
      .dh(36.5, 21, 2, 1, 0)                       // サービス通路 → ロビー
      .dh(43, 21, 1.5, -1, 0)                      // 応接室
      .dv(24, 7, 1.5, -1, 0, 'steel')              // 電気室
      .dh(30, 0, 6, -1, 0, 'shutter')              // 荷捌き場のシャッター
      .wv(0, 24, 3).wh(3, 32, 3)
      .wh(13.5, 32, 3, 'window2').wh(28, 32, 4, 'window2').wh(33.5, 32, 4, 'window2').wh(39, 32, 4, 'window2').wh(44, 32, 3, 'window2')
      .wv(48, 23, 3, 'window2').wv(48, 27.5, 3, 'window2').wv(48, 14, 3).wh(5, 0, 2);
    g.item('ticket_gate', 19, 23.4, 0, { label: T('セキュリティゲート', 'Security gates', '보안 게이트') })
      .item('reception', 28, 24.6).item('chair', 30, 23.3).item('cctv', 26.6, 28.3)
      .item('locker', 12.1, 26.5, 90, { size: [3, 0.6], label: T('郵便受け', 'Mailboxes', '우편함') })
      .item('rug', 19, 28.8, 0, { size: [6, 2.4] })
      .item('sofa3', 39.5, 24, 0).item('lowtable', 40.6, 26.1).item('sofa3', 39.5, 27.6, 180).item('plant', 46.6, 21.4).item('plant', 46.6, 30.4).item('plant', 12.6, 30.4)
      .item('console', 3, 22.8, 0, { label: T('防災盤', 'Fire control panel', '방재반') }).item('monitor_wall', 2.6, 21.05).item('chair', 3.6, 24.4, 180).item('chair', 5.4, 24.4, 180)
      .item('cabinet', 11.15, 26, 90, { size: [1.6, 0.8], label: T('キーボックス', 'Key box', '열쇠함') })
      .item('locker', 0.05, 27.5, 270, { size: [3, 1] }).item('bed_single', 7.6, 29.8, 90).item('table', 4, 27.6, 0, { size: [2.4, 1.2] })
      .item('card_reader', 0.4, 14.5).item('locker', 5.5, 11.1, 0, { size: [3, 0.8] }).item('bench', 5.5, 20, 0, { size: [3, 0.8] }).item('extinguisher', 11.2, 11.3)
      .item('supply_shelf', 0.3, 0.2, 0, { size: [4.4, 1] }).item('supply_shelf', 7, 0.2, 0, { size: [4.6, 1] }).item('supply_shelf', 0.2, 2.6, 270, { size: [5, 1] })
      .item('cardboard', 5, 5).item('cardboard', 6.4, 5).item('cardboard', 5.6, 6.1).item('cardboard', 9.4, 3.2).item('hand_cart', 9.6, 6.4)
      .item('dist_board', 13, 0.1).item('dist_board', 15.4, 0.1).item('dist_board', 17.8, 0.1).item('control_panel', 20.4, 0.1)
      .item('em_generator', 13.2, 6.4).item('ind_tank', 19, 7.4, 0, { label: T('受水槽', 'Water tank', '저수조') }).item('pump', 19.4, 3.4)
      .item('van', 31, 0.8).item('pallet', 25, 1).item('pallet_stack', 27.6, 1).item('hand_cart', 38, 3.4).item('cardboard', 41, 1.2).item('cardboard', 42.4, 1.2)
      .item('pallet_stack', 45, 1).item('cctv', 47.2, 0.3).item('cone', 25.6, 8.6)
      .item('whiteboard', 40.5, 11.05).item('meeting6', 41.5, 14).item('plant', 46.6, 19.4)
      .item('bush', 1, 32.6).item('bush', 44.6, 32.6).item('bollard_post', 18.6, 33.4).item('bollard_post', 25.6, 33.4)
      .item('streetlight', 8, 33.4).item('streetlight', 38, 33.4);

    const o = makeFloor('2F');
    officeCore(o, true);
    o.room(T('オープンオフィス', 'Open-plan office', '오픈 오피스'), 'office', 0, 0, 36, 11, { ly: 3.4 })
      .room(T('オープンオフィス', 'Open-plan office', '오픈 오피스'), 'office', 0, 11, 12, 21, { hideLabel: true })
      .room(N.corridor, 'hall', 12, 21, 36, 3, { hideLabel: true })
      .room(T('休憩室', 'Break room', '휴게실'), 'living', 12, 24, 10, 8, { ly: 2.6 })
      .room(T('会議室A', 'Meeting room A', '회의실A'), 'office', 22, 24, 8, 8, { ly: 2.6 })
      .room(T('会議室B', 'Meeting room B', '회의실B'), 'office', 30, 24, 8, 8, { ly: 2.6 })
      .room(N.storeroom, 'storage', 38, 24, 10, 8)
      .room(T('サーバー室', 'Server room', '서버실'), 'tech', 36, 0, 12, 9, { ly: 0.3 })
      .room(T('大会議室', 'Conference room', '대회의실'), 'office', 36, 9, 12, 12, { ly: 3.2 });
    o.dh(0, 11, 12, 1, 0, 'open').dv(12, 21, 3, 1, 0, 'open')
      .dh(15, 24, 1.5, 1, 0).dv(12, 29, 1.5, 1, 0)   // 休憩室
      .dh(23.5, 24, 1.5, 1, 0).dh(31.5, 24, 1.5, 1, 0).dh(40, 24, 1.5, 1, 0)
      .dh(41, 21, 3, -1, 0, 'door2')               // 大会議室
      .dv(36, 4, 1.5, 1, 0, 'locked')              // サーバー室（カードキー）
      .wh(1.5, 0, 4, 'window2').wh(7.5, 0, 4, 'window2').wh(13.5, 0, 4, 'window2').wh(19.5, 0, 4, 'window2').wh(25.5, 0, 4, 'window2').wh(31, 0, 3)
      .wv(0, 2, 4, 'window2').wv(0, 8, 4, 'window2').wv(0, 14, 4, 'window2').wv(0, 20, 4, 'window2').wv(0, 26, 4, 'window2')
      .wh(2, 32, 4, 'window2').wh(7, 32, 3).wh(14, 32, 4, 'window2').wh(24, 32, 4, 'window2').wh(32, 32, 4, 'window2').wh(42, 32, 2)
      .wv(48, 12, 3, 'window2').wv(48, 16.5, 3, 'window2').wv(48, 21.75, 1.5);
    [1.5, 7.5, 13.5, 19.5, 25.5].forEach(x => o.item('desk_island', x, 1.2));
    o.item('office_desk', 31.4, 2.4).item('chair', 32.1, 1.1).item('filing', 34.6, 0.2).item('filing', 34.6, 1.5).item('copier', 34.4, 7.8)
      .item('whiteboard', 31, 10.4, 180).item('partition', 30.8, 1.4, 90, { size: [4, 0.3] })
      .item('desk_island', 1.2, 12.4).item('desk_island', 1.2, 18.4).item('locker', 10.9, 12.3, 90, { size: [4, 1] })
      .item('plant', 0.4, 30.6).item('copier', 9.6, 30.6).item('card_reader', 35.4, 3.5);
    roundTable(o, 7, 26.5);
    o.item('fridge', 12.2, 24.3).item('counter', 17.2, 24.05, 0, { label: T('給湯', 'Pantry', '탕비') }).item('dining4', 14.5, 27.2, 90).item('sofa2', 18.2, 27.4, 90).item('vending', 20, 30.5, 180)
      .item('meeting6', 23.6, 26.2).item('whiteboard', 29.55, 26, 90)
      .item('meeting6', 31.6, 26.2).item('whiteboard', 37.55, 26.2, 90)
      .item('supply_shelf', 42.5, 24.1, 0, { size: [5, 1] }).item('supply_shelf', 46.9, 26, 90, { size: [5, 1] }).item('supply_shelf', 38.3, 30.9, 0, { size: [5, 1] })
      .item('cardboard', 40.5, 27.6).item('cardboard', 41.9, 27.6).item('cardboard', 43.4, 28.6).item('filing', 44.6, 30.8)
      .item('rack', 38.2, 1).item('rack', 39.9, 1).item('rack', 41.6, 1).item('rack', 43.3, 1)
      .item('rack', 38.2, 5.2).item('rack', 39.9, 5.2).item('rack', 41.6, 5.2).item('rack', 43.3, 5.2)
      .item('vent_unit', 45.6, 0.4, 0, { label: T('空調機', 'Air handler', '공조기') }).item('dist_board', 45.4, 8.3, 0, { size: [2.4, 0.6] }).item('extinguisher', 37, 0.3)
      .item('monitor_wall', 39, 9.05).item('meeting6', 38.5, 13.2, 0, { size: [8, 3.6] }).item('plant', 46.6, 19.4);

    const x3 = makeFloor('3F');
    officeCore(x3, true);
    execOffice(x3, 0, T('役員室A', 'Executive office A', '임원실A'), true);
    execOffice(x3, 12, T('役員室B', 'Executive office B', '임원실B'), false);
    execOffice(x3, 24, T('役員室C', 'Executive office C', '임원실C'), false);
    x3.room(N.corridor, 'hall', 0, 8, 36, 3, { hideLabel: true })
      .room(N.corridor, 'hall', 9, 11, 3, 10, { hideLabel: true })
      .room(N.corridor, 'hall', 9, 21, 39, 3, { hideLabel: true })
      .room(T('社長室', 'President\'s office', '사장실'), 'office', 36, 0, 9, 13, { ly: 1.4 })
      .room(T('隠し部屋', 'Hidden room', '비밀의 방'), 'danger', 45, 0, 3, 13, { gm: true, plName: '', note: T('社長室の書棚の脇の隠し戸の奥。裏帳簿を収めた金庫と、見知らぬ神を祀る小さな祭壇がある', 'Behind a hidden panel beside the bookshelves in the president\'s office: a safe of off-book ledgers and a small altar to an unknown god', '사장실 책장 옆 숨은 문 뒤. 비자금 장부를 넣은 금고와 정체 모를 신을 모신 작은 제단') })
      .room(T('秘書室', 'Secretary\'s office', '비서실'), 'office', 36, 13, 12, 8, { ly: 1.6 })
      .room(T('役員会議室', 'Boardroom', '임원 회의실'), 'office', 0, 11, 9, 21)
      .room(T('給湯室', 'Pantry', '탕비실'), 'kitchen', 9, 24, 5, 8, { ly: 1.6 })
      .room(T('応接室', 'Reception room', '응접실'), 'living', 14, 24, 11, 8, { ly: 3 })
      .room(T('役員ラウンジ', 'Executive lounge', '임원 라운지'), 'living', 25, 24, 11, 8, { lx: -2.6, ly: 1.4 })
      .room(T('書庫', 'Archive', '서고'), 'storage', 36, 24, 12, 8, { ly: 2.6 });
    x3.dh(9, 11, 3, 1, 0, 'open').dh(9, 21, 3, 1, 0, 'open')
      .dh(39, 13, 3, -1, 0, 'door2')               // 秘書室 → 社長室
      .dv(45, 9.4, 1.5, 1, 1, 'secret')            // 隠し部屋
      .dh(37.5, 21, 1.5, -1, 0)                    // 秘書室
      .dv(9, 14, 3, -1, 0, 'door2')                // 役員会議室
      .dh(10, 24, 1.5, 1, 0).dh(15.5, 24, 1.5, 1, 0).dh(27, 24, 3, 1, 0, 'door2').dh(41, 24, 1.5, 1, 0)
      .wh(38.5, 0, 4, 'window2').wv(48, 15.5, 3, 'window2').wv(0, 8.75, 1.5).wv(48, 21.75, 1.5)
      .wv(0, 13, 4, 'window2').wv(0, 19, 4, 'window2').wv(0, 25, 4, 'window2')
      .wh(10.5, 32, 2).wh(17, 32, 4, 'window2').wh(27, 32, 6, 'window2').wh(42, 32, 2);
    x3.item('office_desk', 39, 2.4, 0, { size: [3.4, 1.6] }).item('chair', 40.2, 1.1).item('safe', 36.4, 0.4)
      .item('bookshelf', 44.15, 0.5, 90, { size: [8, 0.8] }).item('painting', 36.05, 4, 270)
      .item('sofa3', 37.2, 9.4, 180, { size: [3.6, 1.6] }).item('lowtable', 37.9, 8).item('armchair', 41.2, 7.6, 90, { size: [1.6, 1.6] }).item('plant', 43.4, 11.6, 0, { size: [1, 1] })
      .item('cabinet', 47.15, 0.5, 90, { size: [4, 0.8] }).item('safe', 45.4, 0.4).item('altar', 46.5, 5, 90, { size: [3, 1.4] }).item('candle', 45.4, 6.4).item('idol', 46.8, 8.6, 0, { size: [0.8, 0.8] })
      .item('office_desk', 37, 15.4).item('chair', 37.7, 16.9, 180).item('office_desk', 40.6, 15.4).item('chair', 41.3, 16.9, 180)
      .item('filing', 44.6, 13.2).item('filing', 45.7, 13.2).item('sofa2', 46.1, 16.2, 90).item('plant', 36.3, 19.8, 0, { size: [1, 1] })
      .item('meeting6', 2.7, 15, 90, { size: [12, 3.6] }).item('monitor_wall', 1.5, 31.3, 180, { size: [5, 0.6] }).item('cabinet', 0.2, 11.2, 0, { size: [3, 0.8] }).item('plant', 7.4, 30.4, 0, { size: [1, 1] })
      .item('sink', 9.05, 27, 270).item('cupboard', 13.05, 26, 90).item('fridge', 12.5, 30.5).item('counter', 9.05, 29.4, 270, { size: [2.4, 1] })
      .item('sofa3', 17.6, 25.6).item('lowtable', 18.7, 27.6).item('sofa3', 17.6, 29, 180).item('armchair', 15.2, 27.4, 270).item('armchair', 22.6, 27.4, 90).item('plant', 23.8, 24.4, 0, { size: [1, 1] })
      .item('sofaL', 29.6, 27.4).item('counter', 31.6, 24.3).item('stool', 32, 25.8).item('stool', 33.4, 25.8).item('stool', 34.8, 25.8).item('cupboard', 25.1, 26.5, 270, { size: [3, 0.9] })
      .item('bookstack', 38, 26.4, 0, { size: [8, 1.4] }).item('bookstack', 38, 29.4, 0, { size: [8, 1.4] }).item('filing', 46.7, 30.6).item('filing', 46.7, 25.2);

    const r = makeFloor('屋上');
    r.room(N.stairs, 'hall', 12, 11, 5, 10, { hideLabel: true })
      .room(T('EV機械室', 'Elevator machine room', 'EV 기계실'), 'garage', 17, 11, 14, 10, { ly: 2.2 })
      .room(N.stairs, 'hall', 31, 11, 5, 10, { hideLabel: true });
    fillYard(r, 0, 0, 48, 32, T('屋上', 'Rooftop', '옥상'), 'rooftop');
    r.dv(12, 18.2, 2, -1, 0, 'steel').dv(36, 18.2, 2, 1, 0, 'steel').dh(22.25, 21, 1.5, 1, 0, 'steel');
    r.item('stairs_u', 12, 11.3).item('stairs_u', 31, 11.3)
      .item('machine_tool', 18, 11.6, 0, { label: T('巻上機', 'Hoist', '권상기') }).item('machine_tool', 22, 11.6, 0, { label: T('巻上機', 'Hoist', '권상기') })
      .item('control_panel', 27.5, 11.1).item('dist_board', 28, 20.25)
      .item('water_tower', 2, 2).item('vent_unit', 8, 2.6).item('antenna', 44.4, 27.4).item('em_generator', 2, 27.2).item('bench', 4.6, 14.6, 0, { size: [3, 0.8] });
    [38, 40.4, 42.8, 45.2].forEach(x => r.item('ac_unit', x, 2).item('ac_unit', x, 4.4).item('ac_unit', x, 6.8));
    r.text(T('屋上', 'Rooftop', '옥상'), 24, 27, { size: 0.9, bold: true });
    return [g.f, o.f, x3.f, r.f];
  }

  // コンビニ：南に駐車場と道路、東の車路から搬入。冷蔵ケースは裏のウォークイン冷蔵庫から補充
  function familyRestaurant() {
    // 1Fは客席と厨房・レジ・トイレ・キッズスペース、外観は別フロア（敷地と駐車場）
    const b = makeFloor('1F');
    b.room(T('厨房', 'Kitchen', '주방'), 'kitchen', 0, 0, 12, 12, { lx: 0.5, ly: 0.8 })
      .room(T('食品庫', 'Food store', '식품 창고'), 'storage', 12, 0, 6, 6, { ly: 0.8 })
      .room(T('男子トイレ', 'Men\'s restroom', '남자 화장실'), 'wet', 18, 0, 5, 6, { ly: 1 })
      .room(T('女子トイレ', 'Women\'s restroom', '여자 화장실'), 'wet', 23, 0, 5, 6, { ly: 1 })
      .room(T('キッズスペース', 'Kids corner', '키즈 공간'), 'public', 28, 0, 12, 6, { ly: 1 })
      .room(T('客席', 'Dining hall', '객석'), 'public', 12, 6, 28, 18, { ly: 6.5 })
      .room(T('レジ・待合', 'Checkout & waiting area', '계산대·대기 공간'), 'public', 0, 12, 12, 12, { lx: 0.4, ly: 4.8 })
      .room(T('玄関ポーチ', 'Entrance porch', '현관 포치'), 'porch', 4, 24, 8, 2, { hideLabel: true });
    b.dh(5, 24, 3, 1, 0, 'auto')                  // 正面の自動ドア
      .dv(12, 17, 4, 1, 0, 'open')                // レジ・待合 ↔ 客席
      .dv(12, 6, 6, 1, 0, 'open')                 // 厨房の受け渡し口
      .dh(4, 12, 2, 1, 0, 'steel')                // 厨房 → レジ（従業員用）
      .dh(14, 6, 1.5, -1, 0)                      // 食品庫
      .dh(19, 6, 1.5, 1, 0)                       // 男子トイレ
      .dh(24, 6, 1.5, 1, 0)                       // 女子トイレ
      .dh(33, 6, 3, 1, 0, 'open')                 // キッズスペース ↔ 客席
      .wh(33, 0, 3, 'window2').wh(36, 0, 3, 'window2')
      .wh(14, 24, 4, 'window2').wh(22, 24, 4, 'window2').wh(30, 24, 4, 'window2')
      .wv(40, 8, 4, 'window2').wv(40, 14, 4, 'window2').wv(0, 14, 4, 'window');
    // 厨房：調理台・コンロ・シンク・冷蔵庫
    b.item('stove', 0.3, 0.3).item('sink', 2.8, 0.3).item('counter', 5, 0.3, 0, { size: [4, 1.2] })
      .item('fridge', 9.8, 0.3).item('fridge', 9.8, 2).item('counter', 0.3, 5.6, 0, { size: [4, 1.2] })
      .item('stove', 5, 5.8).item('counter', 0.3, 9.4, 0, { size: [4, 1.2], label: T('配膳', 'Serving', '배식') })
      .item('npc_worker', 6.6, 9.8, 0, { label: T('調理', 'Cook', '요리사') });
    // 食品庫・トイレ・キッズ
    b.item('supply_shelf', 12.3, 0.3, 0, { size: [4, 1], label: T('乾物', 'Dry goods', '건조식품') })
      .item('cardboard', 13, 3.5).item('hand_cart', 16, 3.6)
      .item('toilet', 18.6, 0.3).item('washbasin', 21.5, 0.3, 0)
      .item('toilet', 23.6, 0.3).item('washbasin', 26.5, 0.3, 0)
      .item('rug', 30, 1.5, 0, { size: [8, 4] }).item('tv', 36, 1, 0, { label: T('子ども向け動画', 'Kids video', '어린이 영상') })
      .item('plant', 39, 4.6);
    // 客席：丸テーブルと椅子、壁際のボックス席
    [14, 20, 26].forEach(x => {
      [9, 15].forEach(y => {
        b.item('table_round', x, y, 0);
        b.item('chair', x - 1.2, y + 0.4).item('chair', x + 1.9, y + 0.4);
        b.item('chair', x + 0.4, y - 1.2).item('chair', x + 0.4, y + 1.9);
      });
    });
    b.item('booth', 36.2, 8, 90).item('booth', 36.2, 14, 90)
      .item('plant', 13, 22).item('plant', 38.5, 22);
    // レジ・待合
    b.item('counter', 0.4, 13.6, 0, { size: [4, 1.2], label: T('レジ', 'Checkout', '계산대') })
      .item('register', 4.8, 13.9, 0)
      .item('sofa3', 0.5, 18, 0, { label: T('待合', 'Waiting', '대기') })
      .item('cctv', 0.3, 23).item('cctv', 11.4, 23.2);
    // 外観：建物は屋根として描き、ドア・窓は1Fと同じ位置
    const o = makeFloor(T('外観', 'Exterior', '외관'));
    o.room(T('店舗', 'Restaurant', '식당'), 'roof', 0, 0, 40, 24)
      .room(T('玄関ポーチ', 'Entrance porch', '현관 포치'), 'porch', 4, 24, 8, 2, { hideLabel: true })
      .room(T('駐車場', 'Parking lot', '주차장'), 'road', 0, 26, 44, 16, { ly: 3 })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 0, 42, 44, 2, { hideLabel: true })
      .room(T('道路', 'Road', '도로'), 'road', 0, 44, 44, 6, { ly: 0.4 });
    o.item('road_sign', 36.5, 0.5, 0, { label: T('店名看板', 'Store sign', '간판') })
      .item('vending', 1, 24.6).item('bollard_post', 25.6, 25.6)
      .item('parking_stall', 1, 28).item('parking_stall', 6, 28).item('parking_stall', 11, 28)
      .item('parking_stall', 16, 28).item('parking_stall', 21, 28).item('parking_stall', 26, 28)
      .item('car', 1.5, 28.5).item('car', 11.5, 28.5).item('car', 26.5, 28.5)
      .item('streetlight', 6, 44.5).item('road_arrow', 18, 46.5, 90);
    return [b.f, o.f];
  }

  function konbini() {
    const b = makeFloor('1F');
    b.room(T('トイレ', 'Restroom', '화장실'), 'wet', 0, 0, 5, 7, { ly: 1.4 })
      .room(T('ウォークイン冷蔵庫', 'Walk-in cooler', '워크인 냉장고'), 'storage', 5, 0, 14, 7, { ly: 1.2 })
      .room(T('バックヤード', 'Backroom', '백야드'), 'industrial', 19, 0, 11, 7, { ly: -1.3 })
      .room(T('搬入口', 'Delivery entrance', '반입구'), 'industrial', 30, 0, 6, 7, { ly: 0.6 })
      .room(T('売場', 'Sales floor', '매장'), 'public', 0, 7, 26, 17, { lx: 1, ly: 1.2 })
      .room(T('事務スペース', 'Staff office', '사무 공간'), 'office', 26, 7, 10, 7, { lx: 0.6, ly: 0.4 })
      .room(T('レジ', 'Checkout', '계산대'), 'office', 26, 14, 10, 10, { lx: 0.8, ly: 0.6 })
      .room(T('店先', 'Storefront', '가게 앞'), 'porch', 0, 24, 36, 3, { hideLabel: true })
      .room(T('搬入車路', 'Delivery lane', '반입 차로'), 'road', 36, 0, 8, 27, { hideLabel: true })
      .room(T('駐車場', 'Parking lot', '주차장'), 'road', 0, 27, 44, 17, { ly: 3 })
      .room(T('歩道', 'Sidewalk', '보도'), 'porch', 0, 44, 44, 2, { hideLabel: true })
      .room(T('道路', 'Road', '도로'), 'road', 0, 46, 44, 6, { ly: 0.4 });
    b.dh(21, 24, 3, 1, 0, 'auto')                 // 正面の自動ドア
      .dh(1, 7, 1.5, -1, 0)                        // トイレ
      .dh(20, 7, 1.5, -1, 0)                       // 売場 → バックヤード
      .dv(19, 1.5, 2, 1, 0, 'steel')               // ウォークイン冷蔵庫
      .dv(30, 1, 5, 1, 0, 'open')                  // バックヤード ↔ 搬入口
      .dv(36, 2, 3, 1, 0, 'door2')                 // 搬入口（車路へ）
      .dh(27.5, 7, 1.5, 1, 0)                      // バックヤード → 事務スペース
      .dh(33.5, 14, 1.5, -1, 1)                    // 事務スペース → レジ
      .dv(26, 15, 9, 1, 0, 'open')                 // レジカウンター（端に通路）
      .wh(1, 24, 4, 'window2').wh(6, 24, 4, 'window2').wh(11, 24, 4, 'window2').wh(16, 24, 4, 'window2')
      .wh(27.5, 24, 4, 'window2').wh(32, 24, 3, 'window2').wv(36, 9, 3);
    // 冷蔵ケース（裏から補充）と冷蔵庫内の棚
    [5.2, 9.2, 13.2].forEach(x => b.item('fridge_case', x, 7.05, 0, { label: T('ドリンク', 'Drinks', '음료') }));
    [5.6, 7.6, 9.6, 11.6, 13.6].forEach(x => b.item('rack', x, 0.3));
    b.item('cardboard', 6, 5).item('cardboard', 10.4, 4.9).item('hand_cart', 16, 3)
      .item('toilet', 3.4, 0.3).item('washbasin', 0.05, 2.2, 270);
    // 売場：壁際の冷蔵ケース・中央のゴンドラ・窓際の雑誌棚
    b.item('fridge_case', 0.05, 9, 90, { label: T('弁当', 'Bento', '도시락') }).item('fridge_case', 0.05, 13.2, 90, { label: T('惣菜', 'Deli', '반찬') })
      .item('freezer', 0.1, 17.6, 0, { size: [1.2, 3], label: T('アイス', 'Ice cream', '아이스크림') })
      // ゴンドラは横向きに3列。通路がレジ（東）へまっすぐ抜けて、レジから見通せる
      .item('store_shelf', 6, 10).item('store_shelf', 10, 10)
      .item('store_shelf', 6, 14).item('store_shelf', 10, 14, 0, { label: T('日用品', 'Sundries', '생활용품') })
      .item('store_shelf', 6, 18).item('store_shelf', 10, 18)
      .item('bookshelf', 1.2, 23.1, 0, { size: [12, 0.8], label: T('雑誌棚', 'Magazine rack', '잡지 진열대') })
      .item('copier', 14.2, 22.7, 0, { label: T('コピー機', 'Copier', '복사기') }).item('atm', 16.4, 22.95)
      .item('rug', 20.5, 22.3, 0, { size: [4, 1.5] }).item('cctv', 0.3, 7.3).item('cctv', 25.3, 23.3);
    // レジ：カウンター、背後にタバコ棚とコーヒー・ホットスナック
    b.item('register', 26.2, 15, 90).item('register', 26.2, 18.2, 90)
      .item('counter', 26.2, 21.2, 90, { size: [1.6, 1.4], label: T('ホットスナック', 'Hot snacks', '핫스낵') })
      .item('supply_shelf', 34.95, 15.2, 90, { size: [6, 1], label: T('タバコ棚', 'Cigarette shelf', '담배 진열장') })
      .item('counter', 28, 14.1, 0, { size: [3.6, 1], label: T('コーヒー', 'Coffee', '커피') })
      .item('npc_station', 28.6, 17.2, 270, { label: T('店員', 'Clerk', '점원') });
    // 事務スペース
    b.item('monitor_wall', 31.6, 7.05, 0, { size: [4, 0.5], label: T('防犯モニター', 'CCTV monitors', '방범 모니터') })
      .item('office_desk', 31.8, 8.3).item('chair', 32.5, 9.9, 180)
      .item('locker', 26.05, 8.8, 270, { size: [3, 1], label: T('ロッカー', 'Lockers', '사물함') })
      .item('safe', 26.4, 12.3).item('filing', 34.9, 11.4);
    // バックヤード（床下点検口はGM用）
    b.item('supply_shelf', 21.8, 0.2, 0, { size: [4, 1] }).item('supply_shelf', 26.2, 0.2, 0, { size: [3.6, 1] })
      .item('sink', 28.6, 2.6, 90, { label: T('掃除用シンク', 'Mop sink', '청소용 싱크') })
      .item('cardboard', 27.4, 5.2).item('crate', 25.6, 4.6, 0, { label: T('ゴミ', 'Trash', '쓰레기') })
      .item('trapdoor', 22.4, 3, 0, { gm: true, label: T('床下点検口', 'Floor hatch', '바닥 점검구') });
    b.item('pallet', 31, 0.4).item('pallet_stack', 33.6, 0.4).item('hand_cart', 31.4, 4.2).item('cardboard', 33.8, 4.8);
    // 屋外
    b.item('crate', 12, 24.5, 0, { size: [1.4, 1.4], label: T('ゴミ箱', 'Bins', '쓰레기통') }).item('crate', 13.6, 24.5, 0, { size: [1.4, 1.4], label: T('ゴミ箱', 'Bins', '쓰레기통') })
      .item('vending', 1, 24.6).item('vending', 3.2, 24.6).item('bollard_post', 25.6, 25.6)
      .item('ac_unit', 36.15, 19, 90).item('ac_unit', 36.15, 21.2, 90).item('cone', 42.4, 22)
      .item('truck', 38, 1);
    [1, 6, 11, 16, 21, 26, 31].forEach(x => b.item('parking_stall', x, 27));
    b.item('car', 1.5, 27.5).item('car', 11.5, 27.5).item('car', 26.5, 27.5)
      .item('road_arrow', 18, 39, 90).item('road_sign', 42.4, 42.6, 0, { label: T('店舗看板', 'Store sign', '간판') })
      .item('streetlight', 6, 44.5).item('utility_pole', 30, 44.5)
      .item('road_arrow', 8, 46.5, 90).item('road_arrow', 32, 49.5, 270);
    // 屋内（店舗）と屋外（店先・駐車場・搬入車路・道路）に分ける
    return splitBuilding(b.f, [[0, 0, 36, 24]], T('屋内', 'Indoors', '실내'), T('屋外', 'Outdoors', '실외'), T('コンビニ', 'Convenience store', '편의점'));
  }

  /* ---------- 研究・文化・軍事（T4） ---------- */

  /* (T4 のテンプレート関数はここ) */
  /* 参考にした定石:
   *  - 研究所: 中廊下型。北側に階段・EV・トイレのコアとサーバー室・倉庫、南側に玄関ホールと受付・監視室・事務室。
   *    上階に実験室（ドラフトチャンバーは壁際、実験台は島型、出入口は2か所）・細胞培養室・試料保管室・飼育室（窓なし）と研究員室。
   *    地下の秘密区画は清浄側（前室→更衣室→エアロックと除染シャワー）を通ってから汚染側の隔離区画へ入る。
   *    隔離室は通路側をガラスにして見張り、地下設備室（発電機・ボイラー・ポンプ）へは倉庫の奥の別の階段から
   */

  /* ---------- 研究所／秘密研究施設（B1・1F・2F） ---------- */

  // 階段・EV・トイレのコアと中廊下（どの階も同じ位置）
  function labCore(b) {
    b.room(N.stairs, 'hall', 22, 0, 6, 13, { hideLabel: true })
      .room(N.evHall, 'hall', 28, 0, 8, 13, { ly: 2.6 })
      .room(T('男子トイレ', 'Men\'s restroom', '남자 화장실'), 'wet', 36, 0, 4, 13, { hideLabel: true })
      .room(T('女子トイレ', 'Women\'s restroom', '여자 화장실'), 'wet', 40, 0, 4, 13, { hideLabel: true })
      .room(N.corridor, 'hall', 0, 13, 56, 4, { hideLabel: true })
      .dh(23, 13, 4, 1, 0, 'open').dh(29, 13, 6, 1, 0, 'open')
      .dh(36.25, 13, 1.5, -1, 0).dh(42.25, 13, 1.5, -1, 1)
      .item('stairs_u', 22.5, 0.5, 0, { size: [5, 9] })
      .item('elevator', 28.4, 0.2, 0, { size: [3.4, 4] }).item('elevator', 32.2, 0.2, 0, { size: [3.4, 4] })
      .item('toilet', 36.5, 0.2).item('toilet', 38.5, 0.2).wall(38, 0, 38, 2.4, 'thin').item('washbasin', 36, 7, 270)
      .item('toilet', 40.5, 0.2).item('toilet', 42.5, 0.2).wall(42, 0, 42, 2.4, 'thin').item('washbasin', 42.9, 7, 90)
      .item('extinguisher', 20.6, 13.1).item('hydrant', 34, 16.6, 180)
      .wh(23.5, 0, 3).wh(37.25, 0, 1.5).wh(41.25, 0, 1.5)
      .wv(0, 14.25, 1.5).wv(56, 14.25, 1.5);
  }

  function lab() {
    const g = makeFloor('1F');
    labCore(g);
    g.room(N.storeroom, 'storage', 0, 0, 10, 13, { lx: 2 })
      .room(T('地下への階段', 'Stairs down', '지하 계단'), 'hall', 0, 0, 4, 9, { hideLabel: true, note: T('「機械室」とだけ書かれた鉄扉。鍵は監視室のキーボックス', 'A steel door marked only "Machine room". The key is in the monitoring room key box.', '"기계실"이라고만 적힌 철문. 열쇠는 감시실 키박스에 있다') })
      .room(T('サーバー室', 'Server room', '서버실'), 'tech', 10, 0, 12, 13, { ly: 3.4 })
      .room(T('会議室', 'Meeting room', '회의실'), 'office', 44, 0, 12, 13, { ly: -3.6 })
      .room(N.office, 'office', 0, 17, 14, 15, { ly: 2.2 })
      .room(T('監視室', 'Monitoring room', '감시실'), 'office', 14, 17, 8, 15, { ly: 4.6 })
      .room(T('エントランスホール', 'Entrance hall', '엔트런스 홀'), 'public', 22, 17, 14, 15, { ly: 2 })
      .room(T('応接室', 'Reception room', '응접실'), 'living', 36, 17, 8, 15, { ly: -4 })
      .room(T('研究室1', 'Research room 1', '연구실1'), 'office', 44, 17, 12, 15, { ly: 1.6 })
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 24, 32, 10, 4, { hideLabel: true });
    g.dh(7.25, 13, 1.5, -1, 1)                   // 倉庫
      .dh(0.25, 9, 1.5, 1, 0, 'locked')          // 地下への階段（施錠）
      .dh(18.25, 13, 1.5, -1, 1, 'steel')        // サーバー室
      .dh(45, 13, 1.5, -1, 0)                    // 会議室
      .dh(1, 17, 1.5, 1, 0).dh(11, 17, 1.5, 1, 1)
      .dh(19.75, 17, 1.5, 1, 1)                  // 監視室（廊下から）
      .dv(22, 28.5, 1.5, -1, 1)                  // 監視室（ホールから）
      .dh(26, 17, 6, 1, 0, 'open')
      .dh(27.5, 32, 3, 1, 0, 'auto')             // 玄関
      .dh(37.25, 17, 1.5, 1, 0).dh(45, 17, 1.5, 1, 0)
      .wh(6, 0, 2).wh(47, 0, 3).wh(51.5, 0, 3).wv(56, 4, 3)
      .wv(0, 20, 3).wv(0, 26, 3)
      .wh(2, 32, 3).wh(8.5, 32, 3).wh(17, 32, 2)
      .wh(22.5, 32, 3.5, 'window2').wh(32, 32, 3.5, 'window2')
      .wh(38.5, 32, 3).wh(46, 32, 3).wh(51, 32, 3).wv(56, 20, 3).wv(56, 26, 3);
    // 倉庫と地下への階段
    g.item('stairs', 0.8, 0.6, 0, { size: [2.4, 7] })
      .item('supply_shelf', 4.5, 0.1).item('supply_shelf', 9, 0.6, 90).item('supply_shelf', 9, 4, 90)
      .item('cardboard', 4.8, 2.6).item('cardboard', 6.2, 2.6).item('cardboard', 5.4, 3.8).item('hand_cart', 6.6, 6.4)
      .item('cabinet', 4, 12, 180);
    // サーバー室：ラックは背中合わせの2列
    [11, 12.4, 13.8, 15.2, 16.6, 18].forEach(x => g.item('rack', x, 1.2).item('rack', x, 5.6, 180));
    g.item('vent_unit', 19.8, 0.3).item('dist_board', 10.05, 9, 270).item('desk', 20.8, 8.4, 90).item('chair', 19.7, 9.1, 270)
      .item('extinguisher', 16.8, 12.2).item('card_reader', 20, 13.1);
    g.item('meeting6', 45.6, 4.6).item('meeting6', 50.4, 4.6).item('whiteboard', 44.05, 5, 270).item('plant', 54.6, 0.3).item('cabinet', 51, 12, 180);
    // 事務室
    g.item('filing', 4, 17.1).item('filing', 5.1, 17.1).item('filing', 6.2, 17.1).item('copier', 7.6, 17.1)
      .item('desk_island', 1.5, 20).item('desk_island', 7.5, 20)
      .item('office_desk', 5.8, 26.4).item('chair', 6.5, 27.9, 180)
      .item('cabinet', 1, 31, 180).item('cabinet', 10, 31, 180);
    // 監視室：モニター壁と操作卓、記録装置
    g.item('monitor_wall', 14.05, 19.4, 270).item('console', 15.2, 20.6, 270).item('chair', 16.8, 21.4, 90).item('chair', 16.8, 23.2, 90)
      .item('desk', 20.8, 21.4, 90).item('chair', 19.7, 22.1, 270).item('rack', 14.2, 26.4).item('locker', 14.2, 31, 180)
      .item('cabinet', 19, 31.2, 180, { size: [2.4, 0.8] });
    // エントランスホール
    g.item('reception', 23.6, 21.5, 270).item('chair', 22.3, 22.6, 270).item('chair', 22.3, 24.6, 270)
      .item('ticket_gate', 27, 19.2, 0, { size: [4, 2] })
      .item('bench', 31.2, 25.4).item('bench', 31.2, 27.8).item('plant', 34.5, 30.5).item('plant', 25.6, 30.5)
      .item('cctv', 35.2, 17.2);
    // 応接室
    g.item('sofa3', 36.2, 23, 270).item('lowtable', 38.6, 24.1, 90).item('armchair', 40.6, 23.2, 90).item('armchair', 40.6, 25.4, 90)
      .item('cabinet', 43, 19.5, 90).item('plant', 42.6, 30.5).item('painting', 36, 18.8, 270);
    // 研究室1
    g.item('desk_island', 45.5, 20).item('desk_island', 50.8, 20)
      .item('table', 47, 27.4).item('chair', 47.4, 26.3).item('chair', 48.8, 26.3).item('chair', 47.4, 29.1, 180).item('chair', 48.8, 29.1, 180)
      .item('bookshelf', 55.2, 25.5, 90).item('whiteboard', 44.05, 26, 270).item('plant', 54.6, 30.6);

    const u = makeFloor('2F');
    labCore(u);
    u.room(T('試料保管室', 'Sample store', '시료 보관실'), 'storage', 0, 0, 10, 13, { ly: 2.6 })
      .room(T('細胞培養室', 'Cell culture lab', '세포 배양실'), 'medical', 10, 0, 12, 13, { ly: 2.4 })
      .room(T('所長室', 'Director\'s office', '소장실'), 'office', 44, 0, 12, 13, { lx: 2.6, ly: 0.6 })
      .room(T('実験室A', 'Laboratory A', '실험실A'), 'medical', 0, 17, 20, 15, { ly: 0.5 })
      .room(T('飼育室', 'Animal room', '사육실'), 'medical', 20, 17, 10, 15)
      .room(T('休憩室', 'Break room', '휴게실'), 'living', 30, 17, 8, 15, { ly: 2.6 })
      .room(T('研究員室', 'Researchers\' office', '연구원실'), 'office', 38, 17, 18, 15, { ly: 1.4 });
    u.dh(7.25, 13, 1.5, -1, 1, 'locked').dh(18.25, 13, 1.5, -1, 1).dh(45, 13, 1.5, -1, 0)
      .dh(1, 17, 1.5, 1, 0).dh(16.5, 17, 1.5, 1, 1)
      .dh(21, 17, 1.5, 1, 0).dh(31, 17, 1.5, 1, 0)
      .dh(39, 17, 1.5, 1, 0).dh(53.5, 17, 1.5, 1, 1)
      .wh(48.5, 0, 3.5, 'window2').wv(56, 8, 3)
      .wv(0, 20, 3).wv(0, 26, 3).wh(2, 32, 3).wh(8.5, 32, 3).wh(15, 32, 3)
      .wh(32.5, 32, 3).wh(40.5, 32, 3).wh(46, 32, 3).wh(51.5, 32, 3).wv(56, 20, 3).wv(56, 26, 3);
    // 試料保管室：超低温フリーザーが並ぶ
    [0.2, 1.9, 3.6, 5.3].forEach(x => u.item('freezer', x, 0.1));
    u.item('freezer', 0.1, 2.6, 270).item('freezer', 0.1, 4.4, 270).item('fridge', 7.4, 0.1)
      .item('supply_shelf', 9, 2, 90).item('supply_shelf', 9, 5.4, 90).item('cabinet', 3, 12, 180);
    // 細胞培養室：安全キャビネット・顕微鏡・インキュベーター
    u.item('fume_hood', 10.4, 0.1).item('fume_hood', 13.6, 0.1).item('microscope', 17.2, 0.3).item('microscope', 18.4, 0.3).item('freezer', 20.3, 0.1)
      .item('lab_bench', 11.5, 5.4).item('stool', 12.1, 4.4).item('stool', 14.1, 4.4).item('stool', 12.1, 7.1, 180).item('stool', 14.1, 7.1, 180)
      .item('sink', 20.7, 4, 90).item('fridge', 10.1, 11.5).item('fridge', 11.6, 11.5);
    // 所長室
    u.item('armchair', 50.4, 0.5).item('desk', 49.6, 2.6, 180, { size: [3.2, 1.4] })
      .item('sofa3', 45, 5).item('lowtable', 46.1, 7).item('sofa2', 45.6, 8.4, 180)
      .item('bookshelf', 55.2, 0.5, 90).item('bookshelf', 55.2, 3.6, 90).item('safe', 54.6, 11.6).item('plant', 44.3, 0.3);
    // 実験室A：壁際にドラフトチャンバー、島型の実験台
    u.item('fume_hood', 3.5, 17.1).item('fume_hood', 6.8, 17.1).item('fume_hood', 10.1, 17.1).item('extinguisher', 15.6, 17.2);
    [[3, 21.6], [10, 21.6], [3, 26.6], [10, 26.6]].forEach(([x, y]) => u.item('lab_bench', x, y)
      .item('stool', x + 0.6, y - 0.95).item('stool', x + 2.6, y - 0.95).item('stool', x + 0.6, y + 1.75, 180).item('stool', x + 2.6, y + 1.75, 180));
    u.item('sink', 18.7, 21.4, 90).item('med_cabinet', 19, 24.6, 90).item('shower', 17.9, 29.9);
    // 飼育室
    u.item('cage', 20.3, 20.4).item('cage', 20.3, 24.4).item('cage', 26.7, 20.4).item('cage', 26.7, 24.4)
      .item('sink', 24, 30.6, 180).item('supply_shelf', 20.3, 30.9, 180, { size: [2.6, 1] });
    // 休憩室
    u.item('dining4', 31, 22).item('vending', 36.6, 19.2, 90).item('fridge', 36.6, 21.6)
      .item('sink', 30, 26.6, 270).item('sofa2', 31.4, 29.9, 180).item('plant', 36.6, 30.6);
    // 研究員室
    u.item('desk_island', 39.5, 20).item('desk_island', 45, 20).item('desk_island', 50.5, 20)
      .item('meeting6', 45, 26.6).item('whiteboard', 38.05, 26.4, 270).item('copier', 54.4, 30.6).item('bookshelf', 55.2, 26.4, 90);

    const d = makeFloor('B1');
    d.room(T('地下設備室', 'Plant room', '지하 설비실'), 'garage', 0, 0, 18, 13, { lx: 2, ly: 1.4 })
      .room(T('制御室', 'Control room', '제어실'), 'office', 18, 0, 10, 13, { ly: 4.4 })
      .room(N.evHall, 'hall', 28, 0, 8, 13, { ly: 2.6, note: T('EVはカードキーをかざしたときだけ地下へ降りる', 'The elevator only goes down here when a key card is swiped', 'EV는 카드키를 댔을 때만 지하로 내려간다') })
      .room(T('前室', 'Checkpoint', '전실'), 'office', 36, 0, 10, 13, { ly: -3.4 })
      .room(T('更衣室', 'Changing room', '탈의실'), 'office', 46, 0, 10, 7, { ly: 1.6 })
      .room(T('エアロック', 'Airlock', '에어록'), 'danger', 46, 7, 10, 6, { lx: -2.6, ly: 1.2 })
      .room(T('隔離区画', 'Isolation ward', '격리 구역'), 'medical', 0, 13, 56, 4)
      .room(T('封鎖区画', 'Sealed section', '봉쇄 구역'), 'danger', 0, 17, 10, 12, { gm: true, plName: '', note: T('逃げ出した「被験体0号」が潜む。封印扉は内側から歪んでいる', 'Where "Subject Zero" hides after its escape. The sealed door is bent from the inside.', '탈출한 "피험체 0호"가 숨어 있다. 봉인문은 안쪽에서 휘어 있다') })
      .room(T('隔離室1', 'Isolation 1', '격리실1'), 'medical', 10, 17, 7, 12, { noWall: true, ly: -3.2 })
      .room(T('隔離室2', 'Isolation 2', '격리실2'), 'medical', 17, 17, 7, 12, { noWall: true, ly: -3.2 })
      .room(T('隔離室3', 'Isolation 3', '격리실3'), 'medical', 24, 17, 7, 12, { noWall: true, ly: -3.2 })
      .room(T('標本室', 'Specimen room', '표본실'), 'medical', 31, 17, 12, 12, { ly: 4.4 })
      .room(T('実験室', 'Laboratory', '실험실'), 'medical', 43, 17, 13, 12, { lx: -2.6, ly: -3.6 });
    // 隔離室：房の間は壁、通路側はガラス
    d.wall(10, 17, 10, 29).wall(17, 17, 17, 29).wall(24, 17, 24, 29).wall(31, 17, 31, 29).wall(10, 17, 31, 17, 'glass');
    d.dv(18, 9, 1.5, 1, 0, 'secret')            // 設備室 → 制御室（制御盤の裏）
      .dv(28, 9, 1.5, -1, 0)                    // 制御室
      .dv(36, 9, 1.5, 1, 0, 'steel')            // 前室（カードキー）
      .dv(46, 2.5, 1.5, 1, 0)                   // 更衣室
      .dh(47, 7, 1.5, 1, 0, 'steel')            // エアロック（清浄側）
      .dh(53, 13, 1.5, 1, 1, 'steel')           // エアロック（汚染側）
      .dh(3, 17, 2, 1, 0, 'sealed')             // 封鎖区画
      .dh(11, 17, 1.5, 1, 0, 'steel').dh(18, 17, 1.5, 1, 0, 'steel').dh(25, 17, 1.5, 1, 0, 'broken')
      .dh(32, 17, 1.5, 1, 0).dh(44.5, 17, 1.5, 1, 0);
    // 地下設備室
    d.item('stairs', 0.8, 0.6, 0, { size: [2.4, 7] })
      .item('em_generator', 4.6, 0.4).item('em_generator', 9.4, 0.4).item('boiler', 14.6, 0.3)
      .item('pipe', 4.6, 3.2).item('vent_unit', 14.8, 4.6).item('control_panel', 17.2, 5.6, 90)
      .item('ind_tank', 4.4, 9.6).item('pump', 8.6, 11.4).item('pump', 11, 11.4).item('drum', 14.6, 11.6).item('drum', 16, 11.6)
      .item('dist_board', 4.4, 5.4).item('valve', 10.6, 3.8);
    // 制御室：隔離区画のカメラ映像
    d.item('monitor_wall', 20, 0.1).item('console', 19.4, 1.8).item('console', 23.2, 1.8)
      .item('chair', 20.7, 3.5, 180).item('chair', 24.5, 3.5, 180)
      .item('table', 21.6, 7.2).item('chair', 22, 6.1).item('chair', 23.4, 6.1).item('rack', 26.5, 4.6).item('filing', 18.2, 11.6);
    d.item('elevator', 32.2, 0.2, 0, { size: [3.4, 4] }).item('card_reader', 35.6, 8.3, 90).item('cctv', 28.2, 4.6);
    // 前室：警備員の受付
    d.item('reception', 40, 4.6, 0, { size: [4, 1.2] }).item('chair', 41.5, 3.3).item('locker', 37.2, 12, 180)
      .item('bench', 37, 0.2, 0, { size: [3, 1] }).item('cctv', 45.2, 12.2).item('alarm', 45.3, 0.1);
    // 更衣室・エアロック
    d.item('locker', 48.2, 0.1).item('locker', 51.2, 0.1).item('locker', 55, 1, 90, { size: [4, 1] }).item('bench', 49, 3.4, 0, { size: [4, 0.8] })
      .item('decon_shower', 51, 8.8).item('alarm', 46.2, 12.5).item('danger', 54.4, 7.8);
    // 隔離区画（通路）
    d.item('cctv', 0.2, 13.2).item('cctv', 55.2, 13.2).item('alarm', 28.2, 16.5).item('drag_marks', 4.6, 14.3, 90);
    // 封鎖区画（GM）
    d.item('flesh', 6.4, 19.4, 0, { gm: true }).item('black_stain', 3.4, 25.6, 0, { gm: true }).item('pod', 0.6, 26.4, 0, { gm: true })
      .item('chains', 0.1, 19.4, 270, { gm: true }).item('bones', 1.6, 19.6, 0, { gm: true });
    // 隔離室
    [10, 17, 24].forEach(x => d.item('hospital_bed', x + 0.4, 24.6, 180).item('toilet', x + 5.6, 27.2, 180).item('washbasin', x + 5.9, 23.6, 90).item('cctv', x + 0.2, 17.3));
    d.item('iv_stand', 13, 24.4).item('npc_lying', 20.4, 20.6, 0, { gm: true }).item('glass', 24.3, 19.6).item('blood', 27, 21.4);
    // 標本室：人型の培養ポット
    [32.6, 35, 37.4, 39.8].forEach(x => d.item('pod', x, 20.4).item('pod', x, 24.2));
    d.item('control_panel', 42.2, 18.4, 90).item('freezer', 31.4, 27.5, 180).item('freezer', 33.2, 27.5, 180);
    // 実験室
    d.item('op_table', 48, 21).item('iv_stand', 51.4, 21.3).item('med_cabinet', 43, 19.6, 270)
      .item('fume_hood', 54.8, 18.4, 90).item('freezer', 54.6, 22.2, 90).item('cage', 52.8, 25.8)
      .item('lab_bench', 44.4, 27.3, 180).item('microscope', 49.2, 27.8).item('blood', 48.8, 25.6);
    return [d.f, g.f, u.f];
  }

  /* ---------- 博物館／美術館（B1 収蔵庫・1F・2F） ---------- */
  // 来館者はエントランスから左右の展示室と大階段へ。北側のバックヤードは通路でつなぎ、搬入口→荷解き室→荷物用EV→燻蒸室→収蔵庫

  // 職員階段・荷物用EVとバックヤード通路（どの階も同じ位置）
  function museumBack(b) {
    b.room(T('職員階段', 'Staff stairs', '직원 계단'), 'hall', 22, 0, 6, 10, { hideLabel: true })
      .room(T('荷物用EV', 'Freight elevator', '화물용 EV'), 'hall', 28, 0, 6, 10, { hideLabel: true })
      .room(T('バックヤード通路', 'Back corridor', '백야드 통로'), 'hall', 0, 10, 42, 4, { hideLabel: true })
      .dh(23, 10, 4, 1, 0, 'open').dh(29, 10, 4, 1, 0, 'open')
      .item('stairs_u', 22.5, 0.5, 0, { size: [5, 8] }).item('elevator', 28.5, 0.3, 0, { size: [5, 6], label: T('荷物用', 'Freight', '화물용') })
      .item('extinguisher', 21.2, 13.3).item('cctv', 41.2, 10.2);
  }

  // 来館者用の大階段・EV・トイレ（1F・2F 同じ位置）。エントランス／ロビーの中に置く
  function museumCore(b) {
    b.room(N.toilet, 'wet', 36, 14, 6, 8, { hideLabel: true })
      .dh(37.25, 22, 1.5, -1, 0)
      .item('elevator', 22.6, 14.2).item('stairs_u', 28, 14.4, 0, { size: [8, 10] })
      .item('toilet', 36.5, 14.2).item('toilet', 38.5, 14.2).item('toilet', 40.5, 14.2)
      .wall(38, 14, 38, 16.4, 'thin').wall(40, 14, 40, 16.4, 'thin')
      .item('washbasin', 40.9, 18.4, 90);
  }

  function museum() {
    const g = makeFloor('1F');
    museumBack(g);
    g.room(T('警備室', 'Security room', '경비실'), 'office', 0, 0, 10, 10, { ly: 2.6 })
      .room(T('学芸員室', 'Curators\' office', '학예사실'), 'office', 10, 0, 12, 10, { ly: 3.2 })
      .room(T('荷解き室', 'Unpacking room', '짐 푸는 방'), 'storage', 34, 0, 8, 10, { ly: 1.4 })
      .room(T('搬入口', 'Loading bay', '반입구'), 'garage', 42, 0, 22, 14, { lx: 6, ly: 1.8 })
      .room(T('展示室1（自然史）', 'Gallery 1 (Natural history)', '전시실1(자연사)'), 'public', 0, 14, 22, 26, { ly: 10.2 })
      .room(T('エントランス', 'Entrance hall', '엔트런스'), 'hall', 22, 14, 20, 26, { ly: 3.6 })
      .room(T('ショップ', 'Shop', '숍'), 'public', 35, 34, 7, 6, { ly: -0.2 })
      .room(T('展示室2（考古）', 'Gallery 2 (Archaeology)', '전시실2(고고)'), 'public', 42, 14, 22, 26, { ly: 10.2 })
      .room(T('前庭', 'Forecourt', '앞마당'), 'porch', 27, 40, 10, 4, { hideLabel: true });
    museumCore(g);
    g.dv(0, 11.25, 1.5, 1, 0, 'steel')           // 通用口
      .dh(7.5, 10, 1.5, -1, 1)                   // 警備室
      .dh(11, 10, 1.5, -1, 0)                    // 学芸員室
      .dh(35.5, 10, 3, -1, 0, 'door2')           // 荷解き室
      .dv(42, 3, 3, 1, 0, 'door2')               // 荷解き室 ↔ 搬入口
      .dv(42, 10.5, 3, 1, 0, 'door2')            // 通路 ↔ 搬入口
      .dv(64, 1.5, 6, 1, 0, 'shutter')           // トラックの搬入シャッター
      .dh(44, 0, 1.5, 1, 0, 'steel')
      .dh(16, 14, 3, 1, 0, 'door2')              // 通路 ↔ 展示室1（作品の出し入れ）
      .dv(22, 30, 5, -1, 0, 'open')              // エントランス ↔ 展示室1
      .dv(42, 24, 5, 1, 0, 'open')               // エントランス ↔ 展示室2
      .dv(35, 35, 4, -1, 0, 'open')              // ショップ
      .dh(30.5, 40, 3, 1, 0, 'auto')             // 正面玄関
      .wv(0, 2.5, 2).wh(12, 0, 3).wh(17, 0, 3).wh(24, 0, 2)
      .wh(22.75, 40, 3.5, 'window2').wh(26.5, 40, 3.5, 'window2').wh(37, 40, 3.5, 'window2');
    // 警備室：モニター壁と通用口の見張り
    g.item('radio', 0.2, 0.2).item('monitor_wall', 2.4, 0.1).item('console', 2.8, 1.6).item('chair', 3.6, 3.2, 180).item('chair', 5.2, 3.2, 180)
      .item('locker', 9, 3.4, 90).item('cabinet', 0.1, 5, 270, { size: [2, 0.6] }).item('table', 3.4, 6.2, 0, { size: [2.4, 1.4] }).item('chair', 4.1, 7.7, 180);
    // 学芸員室
    g.item('desk_island', 10.8, 0.6).item('desk_island', 16.2, 0.6)
      .item('bookshelf', 13.4, 9.2, 180).item('bookshelf', 16.6, 9.2, 180).item('cabinet', 21, 6, 90)
      .item('table', 10.6, 6.4, 0, { size: [2.4, 1.4] });
    // 荷解き室・搬入口
    g.item('big_crate', 34.3, 0.3).item('workbench', 37.6, 0.2).item('pallet', 34.4, 4.4).item('crate', 38.6, 3.4).item('hand_cart', 40.3, 7.4)
      .item('truck', 46.5, 2.5, 90).item('forklift', 45, 9.4, 90).item('pallet_stack', 52, 10.8).item('pallet', 54.6, 10.8)
      .item('cone', 62.8, 9).item('cone', 62.8, 10.4).item('cctv', 63.2, 0.2);
    // 展示室1：恐竜の骨格標本を中央に、壁際に展示ケース
    g.item('skeleton', 5, 23).item('rope_barrier', 5, 21.6).item('rope_barrier', 13, 21.6).item('rope_barrier', 5, 29.6).item('rope_barrier', 13, 29.6);
    [1, 4, 7, 10, 13].forEach(x => g.item('display_case', x, 14.2));
    [18, 22, 26, 30, 34].forEach(y => g.item('display_case', 0.2, y, 270));
    [4, 8, 12, 16].forEach(x => g.item('display_case', x, 38.2, 180));
    g.item('tank', 19.4, 16.6).item('pedestal', 19.6, 22).item('pedestal', 19.6, 25.4).item('bench', 9, 33).item('cctv', 21.2, 39.2);
    // エントランス
    g.item('reception', 24, 27.4).item('chair', 25, 26.2).item('chair', 27, 26.2)
      .item('locker', 22.1, 36.2, 270).item('bench', 37, 30).item('plant', 40.6, 22.6).item('plant', 22.4, 22.6).item('cctv', 41.2, 39.2)
      .item('register', 38.8, 34.2).item('store_shelf', 36.6, 37.6);
    // 展示室2：中央に石棺、壁際に展示ケースと台座
    g.item('sarcophagus', 51.8, 24.4).item('rope_barrier', 50.2, 24.4, 90).item('rope_barrier', 55.4, 24.4, 90);
    [44, 47.4, 50.8, 54.2, 57.6].forEach(x => g.item('display_case', x, 14.2));
    [17, 21, 25, 29, 33].forEach(y => g.item('display_case', 62.2, y, 90));
    [45, 49, 53, 57].forEach(x => g.item('display_case', x, 38.2, 180));
    g.item('display_case', 42.2, 31.6, 270).item('display_case', 42.2, 35, 270)
      .item('pedestal', 46, 20).item('pedestal', 46, 31.6).item('pedestal', 58.4, 20).item('pedestal', 58.4, 31.6)
      .item('stele', 52, 19.6).item('statue', 52.2, 32).item('bench', 51, 35.4, 0, { size: [3.4, 1] });

    const u = makeFloor('2F');
    museumBack(u);
    u.room(T('館長室', 'Director\'s office', '관장실'), 'office', 0, 0, 10, 10, { ly: 2.4 })
      .room(T('資料室', 'Archive', '자료실'), 'storage', 10, 0, 12, 10, { ly: 3.2 })
      .room(T('写真室', 'Photo studio', '사진실'), 'office', 34, 0, 8, 10, { ly: -2.6 })
      .room(T('修復室', 'Conservation studio', '수복실'), 'medical', 42, 0, 22, 14, { ly: 1.4 })
      .room(T('企画展示室', 'Special exhibition', '기획 전시실'), 'public', 0, 14, 22, 26, { ly: 5.6, note: T('特別展「海の底から来たもの」開催中。目玉の石碑は寄贈者不明', 'Special exhibition "What Came from the Deep". The star stele was donated anonymously.', '특별전 "바다 밑에서 온 것" 개최 중. 메인 석비는 기증자 불명') })
      .room(T('ロビー', 'Lobby', '로비'), 'hall', 22, 14, 20, 26, { lx: -3, ly: 3 })
      .room(T('カフェ', 'Café', '카페'), 'kitchen', 32, 31, 10, 9, { lx: 1.6, ly: -2.6 })
      .room(T('展示室3（美術）', 'Gallery 3 (Fine art)', '전시실3(미술)'), 'public', 42, 14, 22, 26, { ly: 9.4 });
    museumCore(u);
    u.wall(4, 27, 22, 27, 'thin');               // 企画展示室の順路の仕切り
    u.dh(7.5, 10, 1.5, -1, 1).dh(11, 10, 1.5, -1, 0).dh(36, 10, 1.5, -1, 0)
      .dv(42, 10.5, 3, 1, 0, 'door2')            // 修復室
      .dv(22, 33, 5, -1, 0, 'open')              // 企画展示室（入口）
      .dv(22, 19.5, 4, -1, 0, 'open')            // 企画展示室（出口）
      .dv(42, 24, 5, 1, 0, 'open')               // 展示室3
      .dh(33, 31, 8, -1, 0, 'open').dv(32, 32, 7, -1, 0, 'open')   // カフェ
      .wh(0.5, 0, 2.5).wh(24, 0, 2).wh(46, 0, 3).wh(52, 0, 3).wh(58, 0, 3)
      .wh(23, 40, 3.5, 'window2').wh(27, 40, 3.5, 'window2').wh(33, 40, 3.5, 'window2').wh(37.5, 40, 3.5, 'window2');
    // 館長室
    u.item('armchair', 3.6, 0.4).item('desk', 2.8, 2.4, 180, { size: [3.2, 1.4] })
      .item('lowtable', 0.8, 6).item('sofa2', 0.3, 7.6, 180).item('bookshelf', 9.2, 0.4, 90).item('bookshelf', 9.2, 3.6, 90).item('safe', 0.2, 3.4);
    // 資料室
    u.item('bookstack', 13, 1).item('bookstack', 17.4, 1).item('bookstack', 13, 4.2).item('bookstack', 17.4, 4.2)
      .item('bookshelf', 10.05, 0.5, 270).item('bookshelf', 10.05, 3.7, 270).item('table', 13.6, 7.2).item('filing', 20.8, 8.6);
    // 写真室
    u.item('partition', 35.4, 0.3).item('table', 36.6, 3.4).item('lamp', 34.4, 4.4).item('lamp', 40.6, 4.4).item('camera', 37.7, 6.2).item('cabinet', 41, 6.2, 90, { size: [2.4, 1] });
    // 修復室
    u.item('workbench', 44.6, 3.6).item('workbench', 50.4, 3.6).item('workbench', 56.2, 3.6)
      .item('fume_hood', 62.8, 1, 90).item('sink', 62.7, 5, 90).item('cabinet', 63, 8.4, 90)
      .item('painting', 46, 9.4).item('statue', 52, 9).item('table', 55.4, 9).item('microscope', 59.6, 9.4);
    // 企画展示室：仕切りで一筆書きの順路
    [3, 7, 11, 15].forEach(x => u.item('display_case', x, 38.2, 180));
    [6, 10, 14].forEach(x => u.item('display_case', x, 27.3).item('display_case', x, 25.1, 180));
    [2, 6, 10, 14].forEach(x => u.item('painting', x, 14.05));
    u.item('pedestal', 6, 32.6).item('pedestal', 15, 32.6).item('display_case', 0.2, 15.6, 270).item('display_case', 0.2, 35, 270)
      .item('stele', 9.5, 20).item('rope_barrier', 8.5, 18.8).item('rope_barrier', 8.5, 22);
    // ロビー・カフェ
    u.item('bench', 24, 27).item('bench', 24, 30).item('plant', 22.4, 38.6)
      .item('counter', 40.8, 32.4, 90).item('dining_round', 33, 32).item('dining_round', 33, 36.4).item('dining_round', 37, 36.4);
    // 展示室3：壁に絵画、中央にベンチと彫刻
    [44, 48.5, 53, 57.5].forEach(x => u.item('painting', x, 14.05));
    [17, 21.5, 26, 30.5, 35].forEach(y => u.item('painting', 63.65, y, 90));
    [45, 49.5, 54, 58.5].forEach(x => u.item('painting', x, 39.65, 180));
    [16, 32, 35.5].forEach(y => u.item('painting', 42.05, y, 270));
    u.item('bench', 49, 26.5).item('bench', 55, 26.5).item('pedestal', 47, 20).item('pedestal', 58, 20).item('pedestal', 47, 32.6).item('pedestal', 58, 32.6)
      .item('partition', 51, 20.6).item('partition', 51, 32.8).item('cctv', 63.2, 14.2);

    const d = makeFloor('B1');
    museumBack(d);
    d.room(T('機械室', 'Machine room', '기계실'), 'garage', 0, 0, 22, 10, { ly: 2.4 })
      .room(T('燻蒸室', 'Fumigation room', '훈증실'), 'danger', 34, 0, 8, 10, { ly: 1.4 })
      .room(T('特別収蔵庫', 'Special vault', '특별 수장고'), 'special', 42, 0, 10, 14, { ly: 4.6, gm: true, plName: '', note: T('台帳に載っていない収蔵品。封印の札を貼った石棺と、夜ごと増える引っかき傷', 'Holdings that appear in no register: a sarcophagus covered in seals, and scratch marks that multiply every night', '대장에 없는 수장품. 봉인 부적을 붙인 석관과 밤마다 늘어나는 긁힌 자국') })
      .room(T('収蔵庫1（美術）', 'Storage vault 1 (Art)', '수장고1(미술)'), 'storage', 0, 14, 20, 18, { ly: 2 })
      .room(T('収蔵庫2（考古・自然史）', 'Vault 2 (Archaeology)', '수장고2(고고·자연사)'), 'storage', 20, 14, 22, 18, { ly: -0.9 });
    d.dh(19, 10, 1.5, -1, 1)                     // 機械室
      .dh(36, 10, 2, -1, 0, 'steel')             // 燻蒸室（気密扉）
      .dv(42, 10.5, 2, 1, 0, 'sealed')           // 特別収蔵庫
      .dh(3, 14, 5, 1, 0, 'big2')                // 収蔵庫1
      .dh(30, 14, 5, 1, 0, 'big2');              // 収蔵庫2
    d.item('boiler', 0.4, 0.4).item('pump', 4, 0.4).item('pump', 6.4, 0.4).item('vent_unit', 9.2, 0.3).item('vent_unit', 11.6, 0.3)
      .item('duct', 14, 0.2).item('dist_board', 21.4, 2, 90).item('em_generator', 0.4, 7.4).item('control_panel', 6, 9.1, 180)
      .item('card_reader', 8.4, 13.6).item('card_reader', 35.4, 13.6);
    d.item('big_crate', 35, 0.4).item('crate', 38.6, 0.4).item('drum', 40.6, 0.3).item('drum', 40.6, 1.7).item('pallet', 35, 4.4)
      .item('control_panel', 41.2, 5.6, 90).item('danger', 38.8, 4.6);
    // 特別収蔵庫（GM）
    d.item('magic_circle', 44, 3.6, 0, { gm: true }).item('sarcophagus', 45.3, 3.9, 0, { gm: true }).item('stele', 49.8, 0.2, 0, { gm: true })
      .item('candle', 43, 3.4, 0, { gm: true }).item('candle', 49.4, 3.4, 0, { gm: true }).item('candle', 43, 8.4, 0, { gm: true }).item('candle', 49.4, 8.4, 0, { gm: true })
      .item('chains', 42.2, 0.2, 0, { gm: true }).item('crate', 50.2, 11.8, 0, { gm: true }).item('black_stain', 48.6, 9.4, 0, { gm: true });
    // 収蔵庫1：絵画ラックと梱包した作品
    [18.4, 22.4, 26.4].forEach(y => d.item('cabinet', 1.5, y, 0, { size: [6, 1.2] }).item('cabinet', 10.5, y, 0, { size: [6, 1.2] }));
    d.item('statue', 18, 17.4).item('big_crate', 16.6, 29.2).item('pedestal', 1, 29.8).item('display_case', 4, 30.2).item('crate', 10, 30);
    // 収蔵庫2：大型ラックと標本
    d.item('pallet_rack', 21, 18.5).item('pallet_rack', 33, 18.5).item('pallet_rack', 21, 23.5).item('pallet_rack', 33, 23.5)
      .item('sarcophagus', 21, 28.8, 90).item('cabinet', 27, 30.8, 180).item('cabinet', 30.2, 30.8, 180).item('tank', 38.6, 28.6).item('statue', 35.4, 29.6);
    return [d.f, g.f, u.f];
  }

  /* ---------- 地下シェルター／防空壕（B1・屋外） ---------- */
  // 入口の階段→防爆扉→除染室→隔壁の先に中央通路。北に通信室・居住区・トイレ、南に備蓄庫・食堂・医務室。
  // 発電・換気の機械区画は隔壁で分け、入口と反対の端に非常口（はしごで地上のハッチへ）

  function shelter() {
    const d = makeFloor('B1');
    d.room(T('入口', 'Entrance', '입구'), 'industrial', 0, 9, 8, 12, { lx: 0.4 })
      .room(T('除染室', 'Decon room', '제염실'), 'danger', 8, 11, 7, 8, { ly: -2 })
      .room(T('通路', 'Corridor', '통로'), 'industrial', 15, 13, 35, 4, { hideLabel: true })
      .room(T('通信室', 'Comms room', '통신실'), 'office', 15, 0, 10, 13, { ly: 2.6 })
      .room(T('居住区', 'Living quarters', '거주구'), 'bedroom', 25, 0, 18, 13, { ly: -1.2 })
      .room(T('トイレ・シャワー', 'WC & showers', '화장실·샤워'), 'wet', 43, 0, 7, 13, { ly: 2.6 })
      .room(T('備蓄庫', 'Supply store', '비축고'), 'storage', 15, 17, 12, 13, { ly: -1.1 })
      .room(T('食堂', 'Mess', '식당'), 'kitchen', 27, 17, 14, 13, { ly: -0.8 })
      .room(T('医務室', 'Infirmary', '의무실'), 'medical', 41, 17, 9, 13, { lx: -1.6 })
      .room(T('発電室', 'Generator room', '발전실'), 'garage', 50, 0, 12, 13, { ly: 1.4 })
      .room(T('機械区画通路', 'Plant corridor', '기계 구획 통로'), 'industrial', 50, 13, 12, 4, { hideLabel: true })
      .room(T('換気・浄水室', 'Air & water plant', '환기·정수실'), 'garage', 50, 17, 12, 13, { ly: -1.6 })
      .room(T('非常口', 'Emergency exit', '비상구'), 'industrial', 62, 12, 8, 6, { lx: -1.2 })
      .room(T('防空壕跡', 'Old air-raid tunnel', '옛 방공호'), 'cave', 20, 30, 16, 5, { gm: true, plName: '', note: T('戦時中の防空壕の跡。シェルターを造るときに見つかり、壁でふさがれた。奥の土砂の向こうから物音がする', 'A wartime air-raid tunnel found while building the shelter and walled off. Something scratches beyond the collapse at the far end.', '전쟁 때의 방공호 터. 셸터를 지을 때 발견되어 벽으로 막혔다. 안쪽 토사 너머에서 소리가 난다') });
    d.dv(8, 14, 2, -1, 0, 'steel')              // 防爆扉（外側へ開く）
      .dv(15, 14, 1.5, 1, 0, 'steel')           // 隔壁（除染室 → 通路）
      .dh(22, 13, 1.5, -1, 1)                   // 通信室
      .dh(26, 13, 1.5, -1, 0).dh(40, 13, 1.5, -1, 1)   // 居住区
      .dh(44, 13, 1.5, -1, 0)                   // トイレ・シャワー
      .dh(16, 17, 1.5, 1, 0)                    // 備蓄庫
      .dh(30.5, 17, 1.5, 1, 0).dh(37, 17, 1.5, 1, 1)   // 食堂
      .dh(42, 17, 1.5, 1, 0)                    // 医務室
      .dv(50, 14, 2, 1, 0, 'steel')             // 隔壁（機械区画）
      .dh(51, 13, 1.5, -1, 0)                   // 発電室
      .dh(51, 17, 1.5, 1, 0)                    // 換気・浄水室
      .dv(62, 14, 2, 1, 0, 'steel')             // 非常口
      .dh(24, 30, 1.5, 1, 0, 'secret');         // 防空壕跡（備蓄庫の棚の裏）
    d.text(T('防爆扉', 'Blast door', '방폭문'), 5.8, 13.2, { size: 0.5, bold: true });
    // 入口・除染室
    d.item('stairs', 0.6, 11, 0, { size: [2.4, 8] }).item('sandbags', 3.6, 19.6).item('extinguisher', 7.2, 9.3).item('cctv', 0.2, 20.2).item('alarm', 4.2, 9.1)
      .item('locker', 8.6, 11.1).item('drum', 13.6, 11.2).item('decon_shower', 10.6, 14).item('bench', 9.6, 17.9, 0, { size: [4, 0.8] });
    // 通信室
    d.item('radio', 15.4, 0.2).item('radio', 17.6, 0.2).item('console', 20.6, 0.2)
      .item('chair', 15.9, 1.4, 180).item('chair', 18.1, 1.4, 180).item('chair', 21.9, 1.8, 180)
      .item('monitor_wall', 15.05, 4.2, 270).item('table', 18.2, 6.2, 0, { size: [3.4, 2] }).item('chair', 19.4, 8.4, 180).item('rack', 23.4, 4.6);
    // 居住区：二段ベッドを並べる
    [25.4, 27.9, 30.4, 32.9, 35.4, 37.9, 40.4].forEach(x => d.item('bunk_bed', x, 0.2));
    [25.4, 27.9, 30.4, 35.4, 37.9, 40.4].forEach(x => d.item('bunk_bed', x, 6.4, 180));
    // トイレ・シャワー
    [43.5, 45.5, 47.5].forEach(x => d.item('toilet', x, 0.2));
    d.wall(45, 0, 45, 2.4, 'thin').wall(47, 0, 47, 2.4, 'thin').wall(49, 0, 49, 2.4, 'thin')
      .item('washbasin', 48.9, 4, 90).item('washbasin', 48.9, 5.8, 90).item('shower', 46.2, 11.1).item('shower', 48.1, 11.1);
    // 備蓄庫
    [20.2, 23.4, 26.6].forEach(y => d.item('supply_shelf', 16.2, y).item('supply_shelf', 19.4, y));
    d.item('drum', 23.6, 18.4).item('drum', 25, 18.4).item('drum', 23.6, 19.8).item('drum', 25, 19.8)
      .item('cardboard', 23.4, 22.4).item('cardboard', 24.8, 22.4).item('crate', 23.6, 25.6).item('supply_shelf', 22.6, 28.9, 180, { size: [1.2, 1] });
    // 食堂
    [19.8, 24.2].forEach(y => [28, 34.6].forEach(x => d.item('table', x, y, 0, { size: [5.6, 1.4] })
      .item('bench', x, y - 0.9, 0, { size: [5.6, 0.8] }).item('bench', x, y + 1.5, 0, { size: [5.6, 0.8] })));
    d.item('kitchen', 28, 28.7, 180).item('stove', 33.2, 28.7, 180).item('sink', 35.4, 28.7, 180).item('fridge', 37.6, 28.6).item('fridge', 39.2, 28.6);
    // 医務室
    d.item('hospital_bed', 47.6, 18.8).item('hospital_bed', 47.6, 24.2).item('iv_stand', 46.6, 23.4).item('curtain', 45.4, 23.6, 0, { size: [4.4, 0.3] })
      .item('med_cabinet', 41, 21.4, 270).item('desk', 42.2, 28.6, 180).item('chair', 43, 27.5).item('exam_bed', 41.2, 25.2, 90, { size: [1.2, 3] });
    // 発電室
    d.item('em_generator', 51, 0.6).item('em_generator', 56.5, 0.6).item('dist_board', 50.05, 4.4, 270).item('control_panel', 50.05, 7.6, 270)
      .item('drum', 60.6, 4.4).item('drum', 60.6, 5.8).item('drum', 60.6, 7.2).item('ind_tank', 58.6, 9.6).item('extinguisher', 54.6, 12.2);
    // 換気・浄水室
    d.item('vent_unit', 55, 17.3).item('vent_unit', 57.4, 17.3).item('duct', 55, 19.6, 0, { size: [6, 0.8] })
      .item('big_tank', 56.4, 24.4).item('pump', 50.4, 27.8).item('pump', 52.8, 27.8).item('valve', 54.8, 28.4).item('pipe', 50.2, 25.4, 0, { size: [5.6, 0.4] });
    // 機械区画通路・非常口
    d.item('alarm', 61.2, 13.1).item('ladder', 68.4, 13.5).item('flashlight', 63.2, 16.8).item('cctv', 62.2, 12.2);
    // 通路
    d.item('extinguisher', 33.6, 13.1).item('cctv', 15.2, 16.2).item('hydrant', 44.6, 16.6, 180);
    // 防空壕跡（GM）
    d.item('crate', 21, 30.6, 0, { gm: true }).item('bones', 27, 31.6, 0, { gm: true }).item('candle', 29.6, 30.4, 0, { gm: true })
      .item('stele', 30.4, 33.6, 0, { gm: true }).item('debris', 33, 30.6, 0, { gm: true, size: [3, 4] });

    // 地上：林の中の柵で囲った空き地。入口棟の階段・非常口のハッチ・換気塔・アンテナは地下の部屋の真上
    const o = makeFloor(OUTSIDE);
    o.room(T('入口棟', 'Entrance hut', '입구동'), 'industrial', 0, 9, 8, 12, { lx: 0.6, ly: 3.4 })
      .room(T('林道', 'Forest road', '임도'), 'dirt', -12, 3, 4, 6, { hideLabel: true })
      .room(T('構内の道', 'Access road', '구내 도로'), 'dirt', -8, 3, 16, 6, { lx: -2.4, ly: 1.4 })
      .room(T('点検路', 'Service path', '점검로'), 'dirt', 8, 6, 46, 2, { hideLabel: true })
      .room(T('点検路', 'Service path', '점검로'), 'dirt', 52, 8, 2, 13, { hideLabel: true });
    fillYard(o, -12, -4, 72, 37, T('空き地', 'Clearing', '공터'));
    o.wall(-8, -1, 62, -1, 'fence').wall(-8, -1, -8, 3, 'fence').wall(-8, 9, -8, 34, 'fence')
      .wall(62, -1, 62, 34, 'fence').wall(-8, 34, 62, 34, 'fence');
    o.dh(4, 9, 2, -1, 0, 'steel')               // 入口棟の扉
      .dv(-8, 3, 6, 1, 0, 'gate');               // 柵の門
    o.item('stairs', 0.6, 11, 0, { size: [2.4, 8] }).item('shed', 10, 10.4).item('streetlight', 8.4, 3.4).item('cone', 6.6, 7.6)
      .item('antenna', 19, 3.6).item('vent', 56, 4.4).item('vent_unit', 54, 22).item('vent_unit', 57, 22)
      .item('hatch', 68, 14).item('bush', 66, 11.4).item('bush', 70.2, 16.6).item('bush', 66.2, 16.8)
      .item('pit', 33.6, 31.2, 0, { gm: true, label: T('旧防空壕の口', 'Old tunnel mouth', '옛 방공호 입구') })
      .item('bush', 31.2, 30.6).item('bush', 36.4, 30.2).item('rock', 28.6, 31.8)
      .item('tree', 26, 12).item('tree', 40, 12).item('tree', 42, 25).item('tree', 18, 26).item('bush', 12, 30).item('bush', 46, 18).item('bush', 4, 27);
    // 柵の外は林
    [-12, -6, 0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66].forEach((x, i) => o.item('tree', x + (i % 2) * 0.8, -4).item('tree', x + ((i + 1) % 2) * 0.8, 34));
    [10, 16, 22, 28].forEach(y => o.item('tree', -11.6, y));
    [0, 6, 20, 26, 31].forEach((y, i) => o.item('tree', 63 + (i % 2) * 5, y));
    o.item('tree', 68.4, 9.4).item('tree', 63.4, 13.6).item('tree', 68.6, 19.2);
    o.text(T('関係者以外立入禁止', 'Authorized personnel only', '관계자 외 출입금지'), -2.4, 1.2, { size: 0.5, bold: true });
    return [d.f, o.f];
  }

  /* ---------- 軍事基地／地下司令部（1F 基地・B1 司令部） ---------- */
  // 外柵と正門・衛兵所。北に格納庫（ヘリ）・車両区画・本部棟、南にヘリポート・武器庫・兵舎。
  // 本部棟の階段とEVで地下司令部へ。保安ゲートの先の通路に通信室・司令官室・司令室・居住区・発電室

  // 本部棟と地下司令部で共通の階段・EVの位置
  const BASE_STAIRS = [74.5, 2.5], BASE_EV = [80.2, 2.2];

  function militaryBase() {
    const g = makeFloor('1F');
    // 建物
    g.room(T('格納庫', 'Hangar', '격납고'), 'industrial', 2, 2, 30, 28, { ly: 12 })
      .room(T('車両区画', 'Vehicle bay', '차량 구역'), 'garage', 34, 2, 28, 22, { ly: 8.6 })
      .room(N.office, 'office', 64, 2, 10, 11, { ly: 2.4 })
      .room(N.stairs, 'hall', 74, 2, 6, 11, { hideLabel: true })
      .room(N.evHall, 'hall', 80, 2, 4, 11, { hideLabel: true })
      .room(T('会議室', 'Meeting room', '회의실'), 'office', 84, 2, 10, 11, { ly: 3 })
      .room(T('当直室', 'Duty office', '당직실'), 'office', 64, 13, 8, 11, { ly: -1.4 })
      .room(T('本部棟 玄関', 'HQ lobby', '본부동 현관'), 'hall', 72, 13, 14, 11, { ly: 2.4 })
      .room(N.toilet, 'wet', 86, 13, 4, 11, { hideLabel: true })
      .room(N.storeroom, 'storage', 90, 13, 4, 11, { hideLabel: true })
      .room(T('受け渡し口', 'Issue counter', '불출구'), 'industrial', 46, 40, 12, 4)
      .room(T('武器庫', 'Armory', '무기고'), 'industrial', 46, 44, 12, 8, { ly: -1.4 })
      .room(T('衛兵所', 'Guard post', '위병소'), 'office', 38, 58, 6, 6, { ly: -1.6 })
      .room(T('居室1', 'Squad room 1', '거실1'), 'bedroom', 64, 36, 12, 11, { ly: 1.6 })
      .room(T('居室2', 'Squad room 2', '거실2'), 'bedroom', 76, 36, 12, 11, { ly: 1.6 })
      .room(T('班長室', 'Sergeant\'s room', '반장실'), 'bedroom', 88, 36, 6, 11, { ly: 2.4 })
      .room(T('兵舎 廊下', 'Barracks hall', '병사 복도'), 'hall', 64, 47, 30, 4, { hideLabel: true })
      .room(T('娯楽室', 'Day room', '오락실'), 'living', 64, 51, 12, 11, { ly: -0.6 })
      .room(T('洗面・浴室', 'Washroom', '세면·욕실'), 'wet', 76, 51, 8, 11, { ly: -0.4 })
      .room(N.toilet, 'wet', 84, 51, 4, 11, { hideLabel: true })
      .room(N.storeroom, 'storage', 88, 51, 6, 11, { ly: 2.6 })
      // 屋外
      .room(T('ヘリポート', 'Helipad', '헬리포트'), 'porch', 4, 36, 22, 22, { ly: 8.6 })
      .room(T('道路', 'Road', '도로'), 'road', 0, 64, 96, 6, { lx: 20 });
    fillYard(g, 0, 0, 96, 64, T('構内', 'Base grounds', '기지 구내'), 'road');
    // 外柵と正門
    g.wall(0, 0, 96, 0, 'fence').wall(0, 0, 0, 64, 'fence').wall(96, 0, 96, 64, 'fence')
      .wall(0, 64, 30, 64, 'fence').wall(44, 64, 96, 64, 'fence');
    g.dh(30, 64, 4, -1, 0, 'gate').dh(34, 64, 4, -1, 1, 'gate')         // 正門
      .dv(38, 58.75, 1.5, -1, 0)                // 衛兵所
      .dh(4, 30, 24, 1, 0, 'shutter')           // 格納庫の大扉
      .dv(32, 27, 1.5, 1, 1)                    // 格納庫の通用口
      .dh(35.5, 24, 8, 1, 0, 'shutter').dh(44.5, 24, 8, 1, 0, 'shutter').dh(53.5, 24, 8, 1, 0, 'shutter')
      .dv(34, 20, 1.5, -1, 0)                   // 車両区画の通用口
      .dh(77.5, 24, 3, 1, 0, 'door2')           // 本部棟の玄関
      .dh(72.25, 13, 1.5, -1, 0)                // 事務室
      .dh(75, 13, 4, 1, 0, 'open').dh(80.5, 13, 3, 1, 0, 'open')
      .dh(84.25, 13, 1.5, -1, 1)                // 会議室
      .dh(91.25, 13, 1.5, 1, 0)                 // 倉庫（会議室から）
      .dv(72, 20, 1.5, -1, 1)                   // 当直室
      .dv(86, 21.5, 1.5, 1, 1)                  // トイレ
      .dh(51.25, 40, 1.5, -1, 0, 'steel')       // 武器庫
      .dh(51, 44, 2, 1, 0, 'gate')              // 武器庫の格子扉
      .dv(64, 47.5, 3, -1, 0, 'door2')          // 兵舎の入口
      .dv(94, 48.25, 1.5, 1, 0)                 // 兵舎の裏口
      .dh(74, 47, 1.5, -1, 1).dh(78, 47, 1.5, -1, 0).dh(89, 47, 1.5, -1, 0)
      .dh(74, 51, 1.5, 1, 1).dh(80, 51, 1.5, 1, 0).dh(84.25, 51, 1.5, 1, 0).dh(91, 51, 1.5, 1, 0)
      .wh(66, 2, 3).wh(86, 2, 3).wh(90, 2, 3).wv(94, 6, 3).wh(66, 24, 3).wv(64, 17, 3)
      .wh(73, 24, 3).wh(82.5, 24, 3).wh(87, 24, 1.5)
      .wh(66, 36, 3).wh(71, 36, 3).wh(78, 36, 3).wh(83, 36, 3).wh(89.5, 36, 3)
      .wh(66, 62, 3).wh(71, 62, 3).wh(79, 62, 2).wh(90, 62, 2).wv(94, 40, 3).wv(94, 55, 3)
      .wv(38, 61, 2).wh(40, 58, 2).wv(44, 60, 2)
      .wv(2, 10, 3).wv(2, 18, 3).wh(10, 2, 4).wh(20, 2, 4);
    // 格納庫：ヘリコプターと整備用品
    g.item('helicopter', 6, 4).item('tool_shelf', 2.05, 6, 270).item('tool_shelf', 2.05, 14, 270).item('tool_shelf', 2.05, 22, 270)
      .item('workbench', 30.3, 6, 90).item('drum', 29.6, 2.3).item('drum', 30.8, 2.3).item('generator', 3, 26.6).item('cone', 29, 26.4).item('tools', 30.4, 11);
    // 車両区画：戦車1両とトラック2台
    g.item('tank_mil', 36, 3.4).item('truck', 46, 3).item('truck', 54.5, 3)
      .item('tool_shelf', 34.05, 4, 270).item('drum', 34.3, 16.4).item('drum', 34.3, 17.8).item('workbench', 60.3, 4, 90).item('tools', 52.2, 20);
    // 本部棟
    g.item('stairs_u', ...BASE_STAIRS, 0, { size: [5, 9] }).item('elevator', ...BASE_EV, 0, { size: [3.6, 4] }).item('card_reader', 83.5, 6.4, 90)
      .item('office_desk', 65, 4, 180).item('office_desk', 65, 5.4).item('office_desk', 67.6, 4, 180).item('office_desk', 67.6, 5.4)
      .item('filing', 72.8, 2.2).item('copier', 64.2, 11.6).item('whiteboard', 73.55, 6.6, 90)
      .item('meeting6', 86.6, 5).item('whiteboard', 84.05, 5, 270).item('banner', 92.6, 2.1, 0, { size: [1.4, 0.4] })
      .item('desk', 64.2, 14, 270).item('chair', 65.5, 14.7, 90).item('radio', 64.2, 16.8, 270).item('bed_single', 64.2, 19.6, 90).item('locker', 65.4, 23, 180, { size: [3, 0.9] })
      .item('reception', 81, 16, 90, { size: [4, 1.2] }).item('chair', 82.4, 17.4, 90).item('bench', 72.1, 15.4, 90, { size: [3.6, 0.9] }).item('plant', 72.3, 22.6).item('cctv', 85.3, 23.3)
      .item('toilet', 86.5, 13.2).item('toilet', 88.5, 13.2).wall(88, 13, 88, 15.4, 'thin').item('washbasin', 88.9, 19, 90)
      .item('supply_shelf', 93, 15.6, 90).item('supply_shelf', 93, 19, 90);
    // 武器庫：受け渡しカウンターと鉄格子の奥の銃架
    g.item('counter', 46.4, 41.2, 0, { size: [3.6, 1.2] }).item('chair', 47.6, 42.6, 180).item('cctv', 57.2, 40.2)
      .item('gun_rack', 46.05, 45, 270).item('gun_rack', 46.05, 48.4, 270).item('gun_rack', 57.15, 45, 90).item('gun_rack', 57.15, 48.4, 90)
      .item('gun_rack', 47.5, 51.15, 180).item('gun_rack', 51, 51.15, 180).item('gun_rack', 54.5, 51.15, 180)
      .item('crate', 49.6, 48.4).item('crate', 51.4, 48.4).item('safe', 55.2, 41)
      .item('sandbags', 46.6, 38.4).item('sandbags', 53.6, 38.4);
    // 衛兵所と正門
    g.item('desk', 38.2, 60.6, 270).item('chair', 39.6, 61.2, 90).item('radio', 41.8, 58.2).item('locker', 43, 60.6, 90, { size: [3, 1] })
      .item('barricade', 30.4, 55).item('barricade', 34.6, 52.4).item('sandbags', 25.6, 62.4).item('streetlight', 24.2, 62.8);
    // 兵舎
    [64.4, 66.8, 69.2, 71.6, 76.4, 78.8, 81.2, 83.6].forEach(x => g.item('bunk_bed', x, 36.2));
    g.item('locker', 64.4, 45.8, 180).item('locker', 67.6, 45.8, 180).item('locker', 79.6, 45.8, 180).item('locker', 82.8, 45.8, 180)
      .item('bed_single', 91.8, 36.2).item('desk', 88.2, 36.4, 270).item('locker', 88.2, 43, 270, { size: [2.4, 0.9] })
      .item('tv', 64.05, 53, 270).item('sofa3', 66.4, 52.4, 270).item('dining4', 69.6, 56.6).item('vending', 74.6, 56, 90).item('table', 70, 52.6, 0, { size: [2.4, 1.4] })
      .item('shower', 76.2, 60.1).item('shower', 78.1, 60.1).item('shower', 80, 60.1).item('shower', 81.9, 60.1)
      .item('washbasin', 76, 53, 270).item('washbasin', 76, 55, 270).item('washer', 82.6, 51.2)
      .item('toilet', 84.5, 60.2, 180).item('toilet', 86.5, 60.2, 180).wall(86, 59.6, 86, 62, 'thin')
      .item('supply_shelf', 88.2, 58.6, 270).item('supply_shelf', 93, 58.6, 90).item('crate', 90.2, 59.8)
      .item('extinguisher', 93.2, 47.2);
    // 屋外：ヘリポート・燃料・照明
    g.text('H', 15, 47, { size: 7, bold: true })
      .item('big_tank', 4.2, 58.8).item('big_tank', 10, 58.8).item('drum', 15.6, 61.6).item('drum', 17, 61.6).item('sandbags', 15.4, 59.4)
      .item('streetlight', 30.4, 31).item('streetlight', 62.6, 31).item('streetlight', 44, 54).item('streetlight', 94.4, 26)
      .item('suv', 87, 25.4).item('antenna', 61.8, 26.2).item('cone', 27.6, 34.2).item('cone', 27.6, 57.2);

    // 地下司令部（本部棟の真下）
    const d = makeFloor('B1');
    d.room(T('通信室', 'Comms room', '통신실'), 'office', 56, 2, 16, 11, { ly: 2.6 })
      .room(T('保安ゲート', 'Security gate', '보안 게이트'), 'hall', 72, 2, 16, 11, { lx: 4.6, ly: 1.8 })
      .room(T('司令官室', 'Commander\'s office', '사령관실'), 'office', 88, 2, 10, 11, { ly: 2.6 })
      .room(T('回収物保管庫', 'Recovered-object vault', '회수물 보관고'), 'danger', 98, 2, 8, 11, { gm: true, plName: '', note: T('作戦中に回収した「それ」を保管する。記録の上では存在しない部屋', 'Holds "it", recovered during an operation. On paper the room does not exist.', '작전 중 회수한 "그것"을 보관한다. 기록상으로는 존재하지 않는 방') })
      .room(N.corridor, 'hall', 56, 13, 42, 4, { hideLabel: true })
      .room(T('発電・換気室', 'Generator & air plant', '발전·환기실'), 'garage', 56, 17, 8, 10, { lx: 1, ly: -1 })
      .room(T('作戦会議室', 'Briefing room', '작전 회의실'), 'office', 56, 27, 8, 10, { ly: 3.2 })
      .room(T('司令室', 'Command room', '사령실'), 'tech', 64, 17, 24, 16, { lx: -7.6, ly: -6 })
      .room(T('居住区', 'Quarters', '거주구'), 'bedroom', 88, 17, 10, 12, { lx: -1.6, ly: 1.4 })
      .room(T('トイレ・シャワー', 'WC & showers', '화장실·샤워'), 'wet', 88, 29, 10, 8, { ly: -0.6 });
    d.dh(81, 13, 2, 1, 0, 'steel')              // 保安ゲート → 通路
      .dh(69, 13, 1.5, -1, 1)                   // 通信室
      .dh(89, 13, 1.5, -1, 0)                   // 司令官室
      .dv(98, 8, 1.5, 1, 0, 'secret')           // 回収物保管庫（本棚のあいだ）
      .dh(60.5, 17, 1.5, 1, 1, 'steel')         // 発電・換気室
      .dv(64, 31.5, 1.5, -1, 1)                 // 作戦会議室（司令室から）
      .dh(74.5, 17, 3, 1, 0, 'door2')           // 司令室
      .dh(89, 17, 1.5, 1, 0)                    // 居住区
      .dh(95, 29, 1.5, 1, 1);                   // トイレ・シャワー
    // 通信室
    d.item('radio', 56.4, 2.2).item('radio', 58.6, 2.2).item('radio', 60.8, 2.2).item('console', 63.4, 2.2)
      .item('chair', 56.9, 3.4, 180).item('chair', 59.1, 3.4, 180).item('chair', 61.3, 3.4, 180).item('chair', 64.7, 3.8, 180)
      .item('rack', 70.4, 2.2).item('rack', 70.4, 4.4).item('table', 58, 8, 0, { size: [3.4, 1.6] }).item('chair', 59.2, 9.8, 180).item('filing', 56.2, 11.6);
    // 保安ゲート（階段・EVを降りたところ）
    d.item('stairs_u', ...BASE_STAIRS, 0, { size: [5, 9] }).item('elevator', ...BASE_EV, 0, { size: [3.6, 4] })
      .item('reception', 85.6, 3, 90, { size: [4, 1.2] }).item('chair', 84.4, 3.6, 270).item('card_reader', 83.3, 12.6)
      .item('locker', 85, 12, 180).item('cctv', 72.2, 2.2).item('npc_soldier', 81.2, 9.8, 0, { gm: true });
    // 司令官室
    d.item('armchair', 92.2, 2.3).item('desk', 91.4, 4.3, 180, { size: [3.4, 1.4] }).item('bookshelf', 97.15, 4.8, 90).item('bookshelf', 97.15, 9.7, 90).item('safe', 96.6, 2.4)
      .item('sofa2', 88.2, 7.6, 270).item('lowtable', 90.2, 8.2, 90).item('banner', 88.2, 2.1, 0, { size: [1.6, 0.4] });
    // 回収物保管庫（GM）
    d.item('cage', 101.6, 2.4, 0, { gm: true }).item('tank', 98.6, 9.6, 0, { gm: true, size: [2, 2] }).item('cursed_item', 99.4, 3.4, 0, { gm: true })
      .item('chains', 104.8, 6, 90, { gm: true }).item('filing', 104.8, 11.6, 0, { gm: true }).item('black_stain', 101.4, 8.6, 0, { gm: true });
    // 発電・換気室
    d.item('em_generator', 56.2, 18.2, 90).item('vent_unit', 59, 24.6).item('dist_board', 63.35, 19.4, 90).item('drum', 61.6, 24.8).item('drum', 62.8, 23.4);
    // 作戦会議室
    d.item('meeting6', 57.6, 29.6, 90).item('monitor_wall', 56.05, 28.6, 270, { size: [5, 0.6] }).item('chair', 62.2, 28.4, 90);
    // 司令室：中央に作戦卓、南の壁にモニター、操作卓は2列でモニターを向く
    d.item('ops_table', 73.5, 19.2).item('desk', 83, 18, 0, { size: [3.6, 1.2] }).item('chair', 84.3, 19.3, 180);
    [66, 70, 74, 78, 82].forEach(x => d.item('console', x, 25).item('chair', x + 1.3, 23.8));
    [68, 72, 76, 80].forEach(x => d.item('console', x, 28.6).item('chair', x + 1.3, 27.4));
    [67, 73, 79].forEach(x => d.item('monitor_wall', x, 32.35, 180));
    // 居住区・トイレ
    [17.4, 19.8, 22.2, 24.6].forEach(y => d.item('bunk_bed', 93.8, y, 90));
    d.item('locker', 88.05, 20.4, 270).item('locker', 88.05, 24, 270).item('table', 90, 26.6, 0, { size: [2.4, 1.4] })
      .item('toilet', 88.5, 35.2, 180).item('toilet', 90.5, 35.2, 180).wall(90, 34.6, 90, 37, 'thin').wall(92, 34.6, 92, 37, 'thin')
      .item('shower', 92.4, 35.1).item('shower', 94.3, 35.1).item('washbasin', 88, 30.2, 270).item('washbasin', 96.9, 31, 90);
    d.item('cctv', 56.2, 16.2).item('alarm', 71.4, 13.1).item('extinguisher', 87.2, 13.1);
    return [d.f, g.f];
  }

  const TEMPLATES = [
    { id: '1ldk', build: oneLDK, group: 'home', tags: ['modern', 'residential', 'indoor'],
      name: T('1LDK アパート', '1LDK apartment', '1LDK 아파트'),
      desc: T('約44㎡。玄関脇に水回り、LDKと個室がバルコニーに面する定番の間取り', 'About 44 m². Wet rooms by the entrance; LDK and bedroom face the balcony.', '약 44㎡. 현관 옆 욕실, LDK와 방이 발코니를 향하는 정석 구조') },
    { id: '2ldk', build: twoLDK, group: 'home', tags: ['modern', 'residential', 'indoor'],
      name: T('2LDK マンション', '2LDK condo', '2LDK 맨션'),
      desc: T('約64㎡の中廊下型。北に洋室2つ、中央に水回り、南に広いLDK', 'About 64 m², center-corridor type: two bedrooms north, wet core in the middle, LDK south.', '약 64㎡ 중복도형. 북쪽 방 2개, 가운데 욕실, 남쪽 LDK') },
    { id: 'house', build: house, group: 'home', tags: ['modern', 'residential', 'outdoor'],
      name: T('一戸建て（2階建て・庭）', 'Two-story house with garden', '단독주택(2층·마당)'),
      desc: T('1Fに玄関ホールと階段・LDK・水回り、2Fに寝室4つ。階段は上下で同じ位置。屋外は庭・ウッドデッキ・駐車場', 'Entry hall, stairs, living and kitchen downstairs; four bedrooms upstairs. Stairs align between floors. Outside: garden, wood deck and parking.', '1층 현관 홀·계단·거실·주방, 2층 침실 4개. 계단 위치가 위아래로 일치. 옥외는 마당·우드 데크·주차장') },
    { id: 'mansion', build: mansion, group: 'home', tags: ['historic', 'residential', 'outdoor', 'underground', 'hidden', 'large'],
      name: T('洋館（地下1階・2階建て・屋外）', 'Mansion (B1–2F, outside)', '저택(지하1층~2층·옥외)'),
      desc: T('左右対称。大階段の玄関ホール、大広間、書斎・図書室・食堂・厨房、地下にワインセラーと隠し部屋。屋外は車寄せと噴水・薔薇園・温室・一族の墓所', 'Symmetrical plan: grand-stair hall, great hall, study, library, dining, kitchen; wine cellar and a hidden room below. Outside: carriage circle and fountain, rose garden, greenhouse, family graveyard.', '좌우 대칭. 대계단 현관 홀, 대연회장, 서재·도서실·식당, 지하 와인 저장고와 비밀의 방. 옥외는 회차로와 분수·장미 정원·온실·가족 묘지') },
    { id: 'basement', build: basementHouse, group: 'home', tags: ['modern', 'residential', 'underground', 'hidden'],
      name: T('地下室のある洋風住宅', 'House with a basement', '지하실이 있는 서양식 주택'),
      desc: T('防音室と窓のない部屋、地下への階段と地下室・ボイラー室。書斎の床の扉からGM用の隠し部屋へ', 'A soundproof music room, a windowless room, stairs down to the cellar and boiler room, and a trapdoor in the study to a GM-only hidden room.', '방음실과 창문 없는 방, 지하 계단과 지하실·보일러실. 서재 바닥 문에서 GM 전용 비밀의 방으로') },
    { id: 'apartment', build: apartment, group: 'home', tags: ['modern', 'residential', 'outdoor'],
      name: T('アパート（2階建て）', 'Apartment building', '아파트(2층 연립)'),
      desc: T('1K × 8戸の木造アパート。外廊下と鉄骨階段、1Fに駐車場とゴミ置場', 'Eight 1K units on two floors with an open-air walkway, outdoor stairs, parking and a garbage area.', '1K × 8세대 목조 연립. 외부 복도와 철골 계단, 1층 주차장과 쓰레기장') },
    { id: 'tower', build: tower, group: 'home', tags: ['modern', 'residential', 'large'],
      name: T('タワーマンション', 'High-rise condo', '타워 맨션'),
      desc: T('1Fはエントランス・コンシェルジュ・ラウンジ・ジムなどの共用部、基準階は内廊下を囲む8戸と中央のコア', 'Lobby floor with concierge, lounge, gym and party room; typical floor with eight units around an inner corridor and central core.', '1층은 엔트런스·컨시어지·라운지·짐 등 공용부, 기준층은 내복도를 둘러싼 8세대와 중앙 코어') },
    { id: 'hotel', build: hotel, group: 'lodging', tags: ['modern', 'commercial', 'large'],
      name: T('ホテル（5フロア）', 'Hotel (5 floors)', '호텔(5개 층)'),
      desc: T('1F ロビー・レストラン、2F 宴会場・チャペル、3F ジム・屋内プール・スパ、7F 客室階（14室）、8F スイートとスカイラウンジ', '1F lobby and restaurant, 2F ballroom and chapel, 3F gym, indoor pool and spa, 7F guest floor (14 rooms), 8F suite and sky lounge.', '1층 로비·레스토랑, 2층 연회장·채플, 3층 짐·실내 수영장·스파, 7층 객실층(14실), 8층 스위트와 스카이 라운지') },
    { id: 'hospital', build: hospital, group: 'medical', tags: ['modern', 'medical', 'public', 'large'],
      name: T('病院（外来・病棟）', 'Hospital (outpatient & ward)', '병원(외래·병동)'),
      desc: T('1Fは診察室・待合・薬局・霊安室、2Fは4床室と個室が並ぶ病棟とナースステーション', 'Outpatient floor with exam rooms, waiting hall, pharmacy and morgue; ward floor with 4-bed and private rooms around a nurse station.', '1층 진찰실·대기실·약국·영안실, 2층 4인실·1인실 병동과 간호사실') },
    { id: 'school', build: school, group: 'public', tags: ['modern', 'public'],
      name: T('学校（校舎2階建て）', 'School building', '학교(2층 교사)'),
      desc: T('北側廊下・南側教室の片廊下型。1Fに昇降口・職員室・校長室・保健室、2Fに教室・音楽室・理科室。屋上は塔屋と高架水槽、高いフェンス', 'Single-loaded corridor with classrooms facing south. Shoe lockers, staff room, principal and nurse on 1F; classrooms, music room and science lab on 2F; a fenced rooftop with the stair penthouse and water tank.', '북쪽 복도·남쪽 교실의 편복도형. 1층 신발장·교무실·교장실·보건실, 2층 교실·음악실·과학실. 옥상에 옥탑과 고가 수조, 높은 펜스') },
    { id: 'police', build: police, group: 'public', tags: ['modern', 'public'],
      name: T('警察署', 'Police station', '경찰서'),
      desc: T('1Fは交通課・会計課の窓口とロビー、地域課・当直室・車庫。2Fは捜査本部・刑事課・取調室（マジックミラー付き）・留置場', 'Service counters, lobby, patrol room, night duty room and garage on 1F; task force room, detectives, interrogation rooms with a one-way mirror and holding cells on 2F.', '1층 교통과·회계과 창구와 로비, 지역과·당직실·차고. 2층 수사본부·형사과·취조실(매직미러)·유치장') },
    { id: 'library', build: library, group: 'public', tags: ['modern', 'public', 'underground', 'hidden'],
      name: T('図書館（B1・1F）', 'Library (B1–1F)', '도서관(B1~1F)'),
      desc: T('1Fはカウンター・開架・閲覧席・児童コーナー・郷土資料室、B1は閉架書庫と貴重書庫。GM用の禁書庫つき', 'Counter, open stacks, reading area, children\'s corner and local history room on 1F; closed stacks and a rare book vault below, plus a GM-only forbidden archive.', '1층 카운터·개가·열람석·어린이 코너·향토 자료실, B1 폐가 서고와 귀중서고. GM 전용 금서고 포함') },
    { id: 'university', build: university, group: 'public', tags: ['modern', 'public', 'research'], also: ['medical'],
      name: T('大学（講義棟・研究棟）', 'University building', '대학(강의동·연구동)'),
      desc: T('1Fは固定席の大講義室・講義室・学生ラウンジ・教務課、2Fは教授の研究室・実験室・ゼミ室・院生室', 'Tiered lecture hall, classrooms, student lounge and academic office on 1F; faculty offices, lab, seminar room and grad room on 2F.', '1층 고정석 대강의실·강의실·학생 라운지·교무과, 2층 교수 연구실·실험실·세미나실·대학원생실') },
    { id: 'bar', build: bar, group: 'lodging', tags: ['modern', 'commercial', 'underground'],
      name: T('バー（地下1階）', 'Basement bar', '바(지하 1층)'),
      desc: T('階段を降りた地下のバー。カウンターとバックバー、ボックス席、ビリヤード台、厨房・倉庫・事務所と施錠された VIP ルーム', 'Down a flight of stairs: counter and back bar, booths, pool table, kitchen, storeroom, office and a locked VIP room.', '계단을 내려간 지하 바. 카운터와 백바, 박스석, 당구대, 주방·창고·사무실과 잠긴 VIP룸') },
    { id: 'livehouse', build: liveHouse, group: 'leisure', tags: ['modern', 'leisure', 'underground'],
      name: T('ライブハウス（地下1階）', 'Live music club', '라이브 하우스(지하 1층)'),
      desc: T('受付とロッカー、ステージとスタンディングのホール、PA卓・ドリンクカウンター。楽屋2室・機材倉庫・事務所', 'Reception and lockers, a standing floor facing the stage, PA booth and drink counter; two green rooms, gear storage and an office.', '접수와 로커, 스테이지와 스탠딩 홀, PA 부스·드링크 카운터. 대기실 2개·장비 창고·사무실') },
    { id: 'theatre', build: theatre, group: 'leisure', tags: ['modern', 'leisure', 'large'],
      name: T('劇場・コンサートホール', 'Theatre / concert hall', '극장·콘서트홀'),
      desc: T('舞台と上手・下手の袖、約420席の客席、ホワイエ。楽屋3室と楽屋口、大道具倉庫、客席を見下ろす調整室', 'Stage with wings, about 420 seats, foyer with box office; three dressing rooms, stage door, scene dock and a control booth overlooking the house.', '무대와 좌우 무대 옆, 약 420석 객석, 포이어. 분장실 3개와 무대 출입구, 대도구 창고, 객석을 내려다보는 조정실') },
    { id: 'haibyoin', build: abandonedHospital, group: 'horror', tags: ['modern', 'ruins', 'medical', 'underground', 'horror'],
      name: T('廃病院（B1〜2F）', 'Abandoned hospital (B1–2F)', '폐병원(B1~2F)'),
      desc: T('病院を廃墟化。割れた窓・壊れた扉・瓦礫、地下に解剖室・霊安室・封鎖区画', 'The hospital in ruins: broken windows and doors, debris; autopsy room, morgue and a sealed lab below.', '폐허가 된 병원. 깨진 창·부서진 문·잔해, 지하에 해부실·영안실·봉쇄 구역') },
    { id: 'haioku', build: abandonedHouse, group: 'horror', tags: ['modern', 'ruins', 'residential', 'horror'],
      name: T('廃屋（2階建て）', 'Abandoned house', '폐가(2층)'),
      desc: T('一戸建てが荒れ果てた状態。崩れた壁、板でふさいだ窓、残された家具', 'The two-story house after years of neglect: crumbling walls, boarded windows, leftover furniture.', '황폐해진 단독주택. 무너진 벽, 판자로 막은 창, 남겨진 가구') },
    { id: 'haibiru', build: abandonedBuilding, group: 'horror', tags: ['modern', 'ruins', 'commercial', 'horror'],
      name: T('廃ビル（雑居ビル）', 'Abandoned building', '폐건물(상가 건물)'),
      desc: T('1Fは店舗跡と管理人室、2Fは事務所跡と社長室、施錠された屋上には外れたフェンス。閉ざされたシャッターと止まったEV', 'Vacant shop and janitor room on 1F; abandoned office and president\'s office on 2F; a locked rooftop with a broken fence. Shutters down, elevator dead.', '1층 빈 점포와 관리인실, 2층 사무실 터와 사장실, 잠긴 옥상에는 떨어져 나간 펜스. 닫힌 셔터와 멈춘 EV') },
    { id: 'crime', build: crimeScene, group: 'horror', tags: ['modern', 'residential', 'danger', 'horror'],
      name: T('事件現場（1LDK）', 'Crime scene (1LDK)', '사건 현장(1LDK)'),
      desc: T('1LDKに人型の輪郭・血痕・証拠マーカー。GM用の隠し金庫とメモつき', '1LDK with a body outline, bloodstain and evidence markers, plus a GM-only safe and note.', '1LDK에 사람 윤곽·핏자국·증거 마커. GM 전용 금고와 메모 포함') },
    { id: 'speakeasy', build: speakeasy, group: 'lodging', tags: ['1920s', 'commercial', 'hidden'],
      name: T('もぐり酒場（禁酒法時代）', 'Speakeasy (Prohibition era)', '무허가 술집(금주법 시대)'),
      desc: T('表は理髪店。奥の部屋の「合言葉の扉」の先にバーカウンター・ボックス席・バンドの舞台。事務所・酒蔵・裏路地への隠し扉', 'A barbershop out front; past the password door in the back room, a bar, booths and a band stage. Boss\'s office, liquor store and a hidden exit to the alley.', '겉은 이발소. 안쪽 방의 "암호의 문" 너머에 바 카운터·박스석·밴드 무대. 사무실·술 창고·뒷골목으로 가는 비밀문') },
    { id: 'detective', build: detectiveOffice, group: 'commerce', tags: ['1920s', 'commercial', 'residential'],
      name: T('探偵事務所のある雑居ビル', 'Detective agency building', '탐정 사무소가 있는 건물'),
      desc: T('1Fはダイナーと質屋、2Fは待合室・所長室・暗室・資料室の探偵事務所と、探偵の住まい。階段は上下でそろう', 'Diner and pawnshop on 1F; on 2F the agency (waiting room, office, darkroom, records) and the detective\'s flat. Stairs align between floors.', '1층 다이너와 전당포, 2층 탐정 사무소(대기실·소장실·암실·자료실)와 탐정의 집. 계단 위치가 위아래로 일치') },
    { id: 'spaceship', build: spaceship, group: 'fantasy', tags: ['sf', 'research', 'machinery'],
      name: T('調査船（宇宙船）', 'Survey starship', '조사선(우주선)'),
      desc: T('船尾に動力炉の機関室、船首にブリッジ。中央通路の両側に乗員室・艦長室・研究室・医務室・冷凍睡眠室・食堂、貨物室とエアロック', 'Engine room with the reactor aft, bridge forward. Crew cabins, captain\'s cabin, lab, medbay, cryo bay and mess along the central corridor; cargo bay and airlock.', '선미에 동력로 기관실, 선수에 브리지. 중앙 통로 양쪽에 승무원실·함장실·연구실·의무실·냉동 수면실·식당, 화물실과 에어록') },
    { id: 'station', build: researchStation, group: 'fantasy', tags: ['sf', 'nearfuture', 'research'], also: ['medical'],
      name: T('月面研究基地', 'Lunar research base', '달 연구 기지'),
      desc: T('中央ハブから4本の通路で居住区・研究室・通信と発電・ローバー車庫とエアロックへ。研究室の奥にGM用の封鎖ラボ', 'A central hub with four tubes to quarters, labs, comms and power, and the rover garage with airlock. A GM-only sealed lab behind the labs.', '중앙 허브에서 4개의 통로로 거주구·연구실·통신과 발전·로버 차고와 에어록. 연구실 안쪽에 GM 전용 봉쇄 실험실') },
    { id: 'kominka', build: farmhouse, group: 'history', tags: ['historic', 'japanese', 'residential', 'outdoor'],
      name: T('古民家（農家）', 'Japanese farmhouse', '일본 고민가(농가)'),
      desc: T('土間とかまど、囲炉裏の間・台所・座敷・仏間の田の字型の母屋と縁側。庭に井戸・蔵・納屋・厠、裏に畑と田んぼ。蔵の奥にGM用の座敷牢', 'Earthen-floor doma with a kamado, four-room tatami layout with an irori hearth and engawa. Well, storehouse, barn and outhouse in the yard, fields behind; a GM-only hidden cell in the storehouse.', '흙바닥 도마와 아궁이, 이로리 방·부엌·객실·불간의 다(田)자형 안채와 툇마루. 마당에 우물·곳간·헛간·뒷간, 밭과 논. 곳간 안쪽에 GM 전용 감옥') },
    { id: 'ninja', build: ninjaHouse, group: 'history', tags: ['historic', 'japanese', 'residential', 'hidden'],
      name: T('忍者屋敷', 'Ninja house', '닌자 저택'),
      desc: T('平屋に見える武家屋敷。広縁と庭、仏間のどんでん返しの奥に隠し部屋、納戸の隠し階段から屋根裏、玄関の落とし穴、井戸への抜け道', 'Looks like a one-story samurai house: wide veranda and garden, a rotating wall in the altar room to a hidden room, hidden stairs to the attic, a pit trap at the entrance and a tunnel to the well.', '단층처럼 보이는 무가 저택. 넓은 툇마루와 정원, 불간 회전벽 뒤 숨은 방, 광의 숨은 계단으로 다락, 현관 함정, 우물로 가는 비밀 통로') },
    { id: 'shrine', build: shrine, group: 'history', tags: ['historic', 'japanese', 'religious', 'outdoor'],
      name: T('山あいの神社', 'Mountain shrine', '산골 신사'),
      desc: T('鳥居から参道、狛犬・灯籠・手水舎を抜けて拝殿・幣殿・本殿へ。神楽殿・宝物殿・社務所と、柵の奥にGM用の禁足地', 'From the torii up the approach past komainu, lanterns and the fountain to the worship hall and sanctuary. Kagura stage, treasure house, shrine office, and a GM-only forbidden grove.', '도리이에서 참배길, 고마이누·석등·데미즈야를 지나 배전·폐전·본전으로. 가구라전·보물전·사무소와 울타리 안쪽의 GM 전용 금족지') },
    { id: 'cave', build: cave, group: 'nature', tags: ['outdoor', 'underground', 'danger'],
      name: T('洞窟', 'Cave', '동굴'),
      desc: T('森の入口から細い通路を抜けて大空洞へ。地底湖のほとり、祭壇の間、獣の巣、下へ続く縦穴', 'From the forest mouth through a narrow passage to the great cavern; an underground lake, an altar chamber, a beast den and a shaft leading down.', '숲의 입구에서 좁은 통로를 지나 대공동으로. 지하 호숫가, 제단의 방, 짐승 굴, 아래로 이어진 수직굴') },
    { id: 'campsite', build: campsite, group: 'nature', tags: ['outdoor', 'waterside', 'leisure'],
      name: T('川沿いのキャンプ場', 'Riverside campsite', '강변 캠핑장'),
      desc: T('川と河原、テントサイト、キャンプファイヤー場、バンガロー3棟、炊事場、管理棟と駐車場。崖にはGM用の古い防空壕', 'River and bank, tent sites, campfire circle, three cabins, cooking shelter, office and parking. A GM-only old air-raid shelter in the cliff.', '강과 강가, 텐트 사이트, 캠프파이어장, 방갈로 3동, 취사장, 관리동과 주차장. 절벽에 GM 전용 오래된 방공호') },
    { id: 'tavern', build: tavern, group: 'fantasy', tags: ['fantasy', 'historic', 'commercial'], also: ['lodging'],
      name: T('冒険者の宿（酒場）', 'Adventurers\' tavern & inn', '모험가의 여관(주점)'),
      desc: T('1Fは依頼掲示板と暖炉のある酒場・厨房・食料庫・主人の部屋、裏庭と厩舎。2Fは客室5つと大部屋・湯浴み場', 'Tavern hall with a quest board and hearth, kitchen, pantry and innkeeper\'s room; back yard and stable. Upstairs: five rooms, a dormitory and a bathhouse.', '1층은 의뢰 게시판과 벽난로가 있는 주점·주방·식료품 창고·주인 방, 뒷마당과 마구간. 2층은 객실 5개와 다인실·목욕간') },
    { id: 'castle', build: castle, group: 'fantasy', tags: ['fantasy', 'historic', 'military', 'underground'], also: ['history'],
      name: T('城（地下牢つき）', 'Castle with dungeon', '성(지하 감옥)'),
      desc: T('堀と跳ね橋、城門から中庭へ。玉座の間・礼拝堂・王の私室・大広間・厨房・武器庫・兵舎・厩舎と2つの塔。地下に牢と拷問部屋、GM用の抜け穴', 'Moat and drawbridge, gatehouse to the courtyard; throne room, chapel, royal chamber, great hall, kitchen, armory, barracks, stable and two towers. Cells and a torture chamber below, with a GM-only escape tunnel.', '해자와 도개교, 성문에서 안뜰로. 왕좌의 방·예배당·왕의 침실·대연회장·주방·무기고·병영·마구간과 탑 2개. 지하에 감옥과 고문실, GM 전용 탈출 구멍') },
    { id: 'dungeon', build: dungeon, group: 'fantasy', tags: ['fantasy', 'underground', 'danger'], also: ['horror'],
      name: T('地下迷宮（ダンジョン）', 'Dungeon', '지하 미궁(던전)'),
      desc: T('入口の間から十字路へ。ゴブリンの巣、罠の回廊と崩れた横穴、鍵のかかった宝物庫、主の間。隠し扉の先にGM用の囚われの間', 'From the entry chamber to the crossroads: goblin den, trapped hall with a collapsed tunnel, locked treasure vault and the master\'s lair; a GM-only prisoner\'s cell behind a secret door.', '입구의 방에서 십자로로. 고블린 소굴, 함정 회랑과 무너진 옆굴, 잠긴 보물고, 주인의 방. 비밀문 너머 GM 전용 갇힌 자의 방') },
    { id: 'wizard', build: wizardTower, group: 'fantasy', tags: ['fantasy', 'research'],
      name: T('魔法使いの塔（B1〜3F）', 'Wizard\'s tower (B1–3F)', '마법사의 탑(B1~3F)'),
      desc: T('螺旋階段はどの階も同じ位置。1F 入口の間・台所・倉庫、2F 書庫と実験室、3F 天文台と寝室。倉庫の床の扉からGM用の封印の間', 'The spiral stair sits in the same place on every floor: entry hall, kitchen and storeroom; library and laboratory; observatory and bedroom. A trapdoor in the storeroom leads to a GM-only sealed vault.', '나선 계단은 모든 층에서 같은 위치. 1층 입구의 방·부엌·창고, 2층 서고와 실험실, 3층 천문대와 침실. 창고 바닥 문에서 GM 전용 봉인의 방') },

    /* (T1 交通・乗り物 の登録はここ) */
    { id: 'railstation', build: railStation, group: 'transport', tags: ['modern', 'public', 'transport', 'railway', 'outdoor', 'large'],
      name: T('鉄道駅（地上駅）', 'Railway station', '철도역(지상역)'),
      desc: T('駅前広場から駅舎のコンコース・券売機・改札へ。駅員室と遺失物保管庫、待合室。単式の1番線ホームから跨線橋（2F）で島式の2・3番線ホームへ。GM用の旧手荷物室つき', 'From the station square into the concourse with ticket machines and gates; station office, lost and found, waiting room. Platform 1 by the building, a footbridge (2F) to the island platform for tracks 2 and 3. A GM-only old baggage room.', '역 앞 광장에서 역사 콘코스·매표기·개찰구로. 역무실과 유실물 보관소, 대합실. 1번선 승강장에서 과선교(2F)를 건너 2·3번선 섬식 승강장으로. GM 전용 옛 수하물실 포함') },
    { id: 'subway', build: subway, group: 'transport', tags: ['modern', 'public', 'transport', 'railway', 'underground', 'hidden', 'large'],
      name: T('地下鉄駅（B2・B1・地上）', 'Subway station', '지하철역(B2·B1·지상)'),
      desc: T('地上の出入口A・BとEVから、B1の改札階（券売機・改札・駅事務室・機械室・百貨店への地下通路）へ。B2は島式ホームと両側の線路、階段・エスカレーター・EVは上下でそろう。ホームの端に非常通路と非常階段、ポンプ室の奥にGM用の旧連絡通路', 'Exits A and B and an elevator on the street lead down to the B1 ticket hall (machines, gates, station office, plant rooms, a passage to the department store). B2 has an island platform between two tracks; stairs, escalators and the elevator line up between levels. Emergency passage and stairs at the platform end, and a GM-only old tunnel behind the pump room.', '지상의 A·B 출입구와 엘리베이터에서 B1 개찰층(매표기·개찰구·역무실·기계실·백화점 지하 통로)으로. B2는 섬식 승강장과 양쪽 선로, 계단·에스컬레이터·EV는 위아래로 일치. 승강장 끝에 비상 통로와 비상계단, 펌프실 안쪽에 GM 전용 옛 연결 통로') },
    { id: 'parking_tower', build: parkingTower, group: 'transport', tags: ['modern', 'transport', 'commercial', 'outdoor', 'rooftop'],
      name: T('立体駐車場（1F〜屋上）', 'Multi-storey car park', '입체 주차장(1층~옥상)'),
      desc: T('1Fに入口と出口のゲート・発券機・精算機・管理室。各階は車路の両側に駐車区画、上り下りのスロープは階ごとに端が入れ替わる。階段とEVは全階同じ位置、最上階は屋上駐車場。スロープ下にGM用の旧ポンプ室', 'Entry and exit gates with ticket and pay machines and an attendant booth on 1F. Each deck has stalls on both sides of the aisle; the ramps switch ends floor by floor. Stairs and elevator stack on every floor, with rooftop parking on top. A GM-only old pump room under the ramp.', '1층에 입구·출구 게이트와 발권기·정산기·관리실. 각 층은 차로 양쪽에 주차 구획, 오르내리는 경사로는 층마다 끝이 바뀐다. 계단과 EV는 모든 층에서 같은 위치, 꼭대기는 옥상 주차장. 경사로 아래에 GM 전용 옛 펌프실') },
    { id: 'parking_ug', build: parkingUnderground, group: 'transport', tags: ['modern', 'transport', 'commercial', 'underground', 'hidden', 'large'],
      name: T('地下駐車場（B2・B1・地上）', 'Underground car park', '지하 주차장(B2·B1·지상)'),
      desc: T('地上の広場の下に2層の駐車場。柱スパンごとに3台ずつの区画、階段・EV・非常階段は上下でそろう。B1に管理室・電気室・機械室。地上へのスロープとB2へのスロープは1車線を信号で交互通行、地上の入口に発券機と精算機のゲート。B2に排水ポンプ室・受水槽室・消火設備室、スロープの下にGM用の封鎖区画', 'Two parking levels under a public plaza. Three stalls per column bay; stairs, elevator and emergency stairs line up between levels. B1 holds the management office, electrical room and machine room. The street ramp and the B2 ramp are single lanes run by traffic lights, with a ticket and pay gate at street level. B2 has the drainage pump room, water tank room and fire suppression room, and a GM-only sealed void under the ramp.', '지상 광장 아래의 2층 주차장. 기둥 스팬마다 3대씩의 구획, 계단·EV·비상계단은 위아래로 일치. B1에 관리실·전기실·기계실. 지상 경사로와 B2 경사로는 1차선을 신호로 교대 통행, 지상 입구에 발권기와 정산기 게이트. B2에 배수 펌프실·수수조실·소화 설비실, 경사로 아래에 GM 전용 봉쇄 구역') },
    { id: 'ship', build: ship, group: 'transport', tags: ['modern', 'transport', 'ship', 'onwater', 'machinery', 'large'],
      name: T('客船（4甲板）', 'Passenger ship (4 decks)', '여객선(4갑판)'),
      desc: T('全長48mほどの客船。船首は右（東）。下甲板に機関室・操舵機室・船員区画・貨物庫、客室甲板に乗船口のあるエントランスホールと2等船室・1等室・特等室・前甲板、遊歩甲板にラウンジとパーティーホールと展望ラウンジ、ブリッジ甲板に操舵室・船長室・無線室と救命艇。乗員用階段は全甲板、客用階段は客室甲板から上で同じ位置。貨物庫の奥にGM用の隠し区画', 'A passenger ship about 48 m long, bow to the right (east). The lower deck has the engine room, steering gear, crew quarters and cargo hold. The cabin deck has the boarding hall, second-class room, first-class cabins, suite and foredeck. The promenade deck has the lounge, party hall and observation lounge; the bridge deck has the wheelhouse, captain\'s cabin, radio room and lifeboats. Crew stairs run through every deck and passenger stairs from the cabin deck up. A GM-only hidden compartment in the cargo hold.', '전장 약 48m의 여객선. 선수는 오른쪽(동쪽). 하갑판에 기관실·조타기실·선원 구역·화물창, 객실 갑판에 승선구가 있는 엔트런스 홀과 2등 선실·1등실·특등실·앞갑판, 유보 갑판에 라운지·파티 홀·전망 라운지, 브리지 갑판에 조타실·선장실·무선실과 구명정. 승무원 계단은 모든 갑판, 승객 계단은 객실 갑판부터 위로 같은 위치. 화물창 안쪽에 GM 전용 숨겨진 구획') },
    { id: 'viaduct', build: viaduct, group: 'transport', tags: ['modern', 'transport', 'railway', 'outdoor', 'hidden'],
      name: T('鉄道の高架橋（橋下・高架上）', 'Railway viaduct', '철도 고가교(아래·위)'),
      desc: T('複線の高架橋を10mおきの橋脚ごとに区切った区間。橋下には資材倉庫・くぐる市道・月極駐車場と、柵の破れ目の奥の野営地。高架上は上下線と両側の点検通路で、施錠された点検階段が地上と結ぶ。野営地の奥にGM用のブルーシート小屋', 'A stretch of double-track viaduct with piers every 10 m. Under it: a materials depot, a road passing beneath, monthly parking, and an encampment behind a torn fence. On top: both tracks and inspection walkways, reached by a locked inspection stair. A GM-only tarp shack at the back of the encampment.', '10m 간격의 교각으로 나뉜 복선 고가교 구간. 아래에는 자재 창고·지나가는 시도·월정액 주차장, 찢어진 울타리 안쪽의 야영지. 위에는 상하행선과 양쪽 점검 통로, 잠긴 점검 계단이 지상과 연결된다. 야영지 안쪽에 GM 전용 블루시트 오두막') },

    /* (T2 産業・インフラ・屋上・廃工場 の登録はここ) */
    { id: 'haikoujou', build: abandonedFactory, group: 'horror', also: ['industry'], tags: ['modern', 'ruins', 'industrial', 'machinery', 'horror', 'danger'],
      name: T('廃工場', 'Abandoned factory', '폐공장'),
      desc: T('工場を廃墟化。屋根が抜けた製造エリアの瓦礫と水たまり、崩れた壁、壊れた機械、草の生えた構内。倉庫の奥に封印された扉の封鎖区画（GM用）', 'The factory in ruins: rubble and puddles under the broken roof, crumbling walls, wrecked machines, a weed-grown yard. Behind a sealed door in the warehouse, a GM-only sealed area.', '폐허가 된 공장. 지붕이 뚫린 제조 구역의 잔해와 물웅덩이, 무너진 벽, 부서진 기계, 풀이 자란 구내. 창고 안쪽 봉인된 문 너머에 GM 전용 봉쇄 구역') },
    { id: 'construction', build: construction, group: 'industry', tags: ['modern', 'industrial', 'outdoor', 'machinery', 'danger'],
      name: T('工事現場', 'Construction site', '공사 현장'),
      desc: T('仮囲いと工事ゲート、重機エリア（ショベルカー・クレーン車・ブルドーザー）、資材置場、プレハブの現場事務所と仮設トイレ・朝礼広場、足場に囲まれた建設中区画。作業中止の掘削箇所にGM用の古い石室', 'Hoarding and site gate, heavy machinery (excavator, crane truck, bulldozer), material yard, prefab site office with portable toilets and assembly area, and the building under construction inside its scaffolding. A halted excavation hides a GM-only ancient stone chamber.', '공사 가림막과 게이트, 중장비 구역(굴착기·크레인차·불도저), 자재 적치장, 조립식 현장 사무소와 간이 화장실·조례 광장, 비계에 둘러싸인 건설 중 구역. 작업이 중지된 굴착 구역에 GM 전용 오래된 석실') },
    { id: 'building_wip', build: buildingWip, group: 'industry', tags: ['modern', 'industrial', 'outdoor', 'danger'],
      name: T('建造中の建物（1F〜3F）', 'Building under construction (1F–3F)', '건설 중인 건물(1F~3F)'),
      desc: T('柱とスラブだけの3フロア。1Fは外壁と間仕切りの下地、2Fは積みかけのブロック壁、3Fは打設直後。外周に足場、各階同じ位置に仮設階段と扉のないEVシャフト', 'Three floors of bare slabs and columns: walls rising on 1F, half-built blockwork on 2F, a freshly poured slab on 3F. Scaffolding all around; temporary stairs and an open elevator shaft in the same place on every floor.', '기둥과 슬래브뿐인 3개 층. 1층은 외벽과 칸막이 골조, 2층은 쌓다 만 블록 벽, 3층은 타설 직후. 외곽에 비계, 각 층 같은 위치에 가설 계단과 문 없는 EV 샤프트') },
    { id: 'warehouse', build: warehouse, group: 'industry', tags: ['modern', 'industrial', 'large', 'outdoor', 'machinery'],
      name: T('物流倉庫', 'Logistics warehouse', '물류 창고'),
      desc: T('背中合わせのパレットラックとフォークリフトの通路、荷捌き場とシャッターのトラックバース4か所、冷蔵室、事務所とドライバー控室。ヤードにトラックとコンテナ、施錠されたコンテナの中はGM用', 'Back-to-back pallet racks with forklift aisles, a staging area behind four shuttered truck berths, a cold room, office and drivers\' room. Trucks and containers in the yard; the padlocked container is GM-only.', '맞붙은 팔레트 랙과 지게차 통로, 하역장과 셔터 트럭 베이 4곳, 냉장실, 사무소와 운전기사 대기실. 야드에 트럭과 컨테이너, 잠긴 컨테이너 안은 GM 전용') },
    { id: 'sewer', build: sewer, group: 'industry', tags: ['modern', 'underground', 'industrial', 'waterside', 'machinery', 'danger'],
      name: T('地下水路・下水道', 'Sewer tunnels', '지하 수로·하수도'),
      desc: T('道路の下の幹線水路と両側の歩廊、合流する分岐路、水門と水門操作室、排水ポンプの機械室。マンホールのはしごで地上の道路へ。錆びた格子扉の先の旧水路と、崩れた煉瓦の奥にGM用のねぐら', 'A main channel under the street with walkways on both sides, a branch tunnel, a sluice gate and its control room, and the pump room. Manhole ladders lead up to the street. Past a rusted grille gate, an old brick tunnel and, behind broken brickwork, a GM-only lair.', '도로 밑 간선 수로와 양쪽 보도, 합류하는 분기로, 수문과 수문 조작실, 배수 펌프 기계실. 맨홀 사다리로 지상 도로로. 녹슨 격자문 너머 옛 수로와 무너진 벽돌 안쪽에 GM 전용 소굴') },
    { id: 'factory', build: factory, group: 'industry', tags: ['modern', 'industrial', 'machinery', 'large', 'outdoor'],
      name: T('工場', 'Factory', '공장'),
      desc: T('工作機械と組立ラインの製造エリア、機械室・検査室、パレットラックの倉庫、シャッターの搬入口とトラック。2階建ての事務所棟（食堂・更衣室・事務室・工場長室）と、中二階から製造エリアを見下ろす制御室', 'Production floor with machine tools and an assembly line, machine room and inspection room, a racked warehouse, and a shuttered loading bay with a truck. A two-story office wing (canteen, lockers, office, plant manager) and a mezzanine control room overlooking the floor.', '공작 기계와 조립 라인의 제조 구역, 기계실·검사실, 팔레트 랙 창고, 셔터 반입구와 트럭. 2층 사무동(식당·탈의실·사무실·공장장실)과 중이층에서 제조 구역을 내려다보는 제어실') },
    { id: 'rooftop', build: rooftop, group: 'commerce', tags: ['modern', 'rooftop', 'outdoor', 'commercial'],
      name: T('ビル屋上', 'Building rooftop', '빌딩 옥상'),
      desc: T('階段室の塔屋とEV機械室、パラペットとフェンス、高架水槽・アンテナ・室外機置場・キュービクル、喫煙所。フェンスの扉から非常階段へ、路地を挟んで隣のビルの屋上。塔屋の倉庫はGM用', 'Stair penthouse and elevator machine room, parapet and fence, water tank, antennas, rows of AC units, a switchgear cubicle and a smoking spot. A gate in the fence to the fire escape; across a narrow alley, the next-door rooftop. The penthouse storeroom is GM-only.', '계단실 옥탑과 EV 기계실, 파라펫과 펜스, 고가 수조·안테나·실외기 구역·큐비클, 흡연 구역. 펜스 문에서 비상계단으로, 골목 건너 옆 건물 옥상. 옥탑 창고는 GM 전용') },

    /* (T3 歴史・宗教・商業 の登録はここ) */
    { id: 'buke', build: buke, group: 'history', tags: ['historic', 'japanese', 'residential', 'outdoor', 'garden', 'hidden'], also: ['home'],
      name: T('武家屋敷と日本庭園', 'Samurai residence & garden', '무가 저택과 일본 정원'),
      desc: T('長屋門から式台のある玄関へ。玄関の間・次の間・床の間つきの座敷・書院・寝間・仏間、土間の台所・茶の間・納戸と縁側、勝手庭に蔵。池と石橋・枯山水の庭園、竹垣の奥の露地に茶室と水屋。座敷の脇にGM用の武者隠し', 'Through the gatehouse to an entrance with a shikidai step: reception room, anteroom, zashiki with alcove, study, bedroom, altar room, earthen-floor kitchen, family room, storeroom and engawa; a storehouse in the service yard. A pond garden with a stone bridge, a dry garden, and a tea room with its prep room beyond a bamboo fence. A GM-only guard closet beside the zashiki.', '나가야몬에서 시키다이가 있는 현관으로. 현관방·옆방·도코노마가 있는 자시키·서원·침실·불간, 흙바닥 부엌·거실·광과 툇마루, 뒷마당에 곳간. 연못과 돌다리·가레산스이 정원, 대나무 울타리 너머 로지에 다실과 미즈야. 자시키 옆에 GM 전용 무사 은신처') },
    { id: 'temple', build: temple, group: 'history', tags: ['historic', 'japanese', 'religious', 'outdoor', 'garden', 'hidden'],
      name: T('寺院', 'Buddhist temple', '절(사원)'),
      desc: T('仁王像の山門から灯籠と手水舎の参道を抜けて本堂（外陣・内陣の須弥壇・余間と回り縁）へ。渡り廊下の先に庫裏（玄関・寺務所・台所・住職の部屋・客間）、鐘楼、墓地と水場、客間の前の枯山水。GM用の秘仏の間と墓地の古井戸', 'Through the Nio gate and up the lantern-lined approach past the purification fountain to the main hall (worship hall, inner sanctum with the altar, side chambers, veranda). A covered walkway to the priests\' quarters (entrance, temple office, kitchen, head priest\'s room, guest room); bell tower, graveyard and a dry garden. A GM-only hidden buddha room and an old well in the graveyard.', '인왕상 산문에서 석등과 데미즈야의 참배길을 지나 본당(외진·수미단의 내진·여간과 회랑 마루)으로. 연결 복도 너머 고리(현관·사무소·부엌·주지 방·객실), 종루, 묘지와 물터, 객실 앞 가레산스이. GM 전용 비불의 방과 묘지의 오래된 우물') },
    { id: 'church', build: church, group: 'history', tags: ['historic', 'religious', 'underground', 'outdoor', 'hidden', 'horror'],
      name: T('教会（地下納骨堂つき）', 'Church with crypt', '교회(지하 납골당)'),
      desc: T('拝廊から柱の並ぶ身廊（会衆席・告解室）を進み、内陣の祭壇へ。聖具室・事務室、鐘楼の螺旋階段で2Fのオルガン席と鐘室、教会墓地。階段室からB1の地下納骨堂と納骨棚、奥にGM用の封印された墓室', 'From the narthex up the pillared nave (pews, confessionals) to the altar in the chancel. Sacristy, parish office, a spiral stair in the bell tower to the organ loft and belfry, and a churchyard. Stairs down to the crypt and ossuary, with a GM-only sealed tomb beyond.', '배랑에서 기둥이 늘어선 신랑(신자석·고해실)을 지나 내진의 제단으로. 제의실·사무실, 종탑의 나선 계단으로 2층 오르간석과 종실, 교회 묘지. 계단실에서 지하 납골당과 납골함, 안쪽에 GM 전용 봉인된 묘실') },
    { id: 'office', build: officeBuilding, group: 'commerce', tags: ['modern', 'commercial', 'rooftop', 'hidden'],
      name: T('オフィスビル（3階建て・屋上）', 'Office building (3 floors & roof)', '오피스 빌딩(3층·옥상)'),
      desc: T('センターコア（両端の階段・EV2基・トイレ）は全階同じ位置。1F 風除室とロビー・セキュリティゲート・受付・防災センター・通用口・荷捌き場、2F オープンオフィス・会議室・休憩室・サーバー室・倉庫、3F 役員室・社長室と秘書室・役員会議室・応接室、屋上に塔屋と設備。社長室の奥にGM用の隠し部屋', 'A center core (two stairs, two elevators, restrooms) in the same place on every floor. 1F: vestibule, lobby with security gates and reception, security office, staff entrance, loading bay. 2F: open-plan office, meeting rooms, break room, server room, storage. 3F: executive offices, president\'s office behind the secretary, boardroom, reception room. Rooftop with stair and machine housings. A GM-only hidden room behind the president\'s office.', '센터 코어(양 끝 계단·EV 2대·화장실)는 모든 층에서 같은 위치. 1층 바람막이실과 로비·보안 게이트·접수·방재 센터·직원 출입구·하역장, 2층 오픈 오피스·회의실·휴게실·서버실·창고, 3층 임원실·비서실 안쪽의 사장실·임원 회의실·응접실, 옥상에 계단실과 설비. 사장실 안쪽에 GM 전용 비밀의 방') },
    { id: 'family_restaurant', build: familyRestaurant, group: 'commerce', tags: ['modern', 'commercial', 'outdoor', 'hidden'],
      name: T('ファミリーレストラン', 'Family restaurant', '패밀리 레스토랑'),
      desc: T('自動ドアから客席へ。厨房・食品庫・トイレ・キッズスペース、ボックス席と丸テーブル、レジと待合。外観は別フロアで、駐車場つき', 'Automatic doors lead to the dining hall: kitchen, food store, restrooms, kids corner, booths and round tables, checkout and waiting area. The exterior is a separate floor with a parking lot.', '자동문에서 객석으로: 주방, 식품 창고, 화장실, 키즈 공간, 부스석과 원형 테이블, 계산대와 대기 공간. 외관은 주차장이 있는 별도 층입니다.') },
    { id: 'konbini', build: konbini, group: 'commerce', tags: ['modern', 'commercial', 'outdoor', 'hidden'],
      name: T('コンビニ（小型店舗）', 'Convenience store', '편의점'),
      desc: T('自動ドアから売場へ。冷蔵ケース・弁当棚・ゴンドラ・雑誌棚・ATM、レジカウンターとタバコ棚。裏にウォークイン冷蔵庫・バックヤード・事務スペース（防犯モニター・金庫）・搬入口。前面に駐車場、横に搬入車路。バックヤードにGM用の床下点検口', 'Through the automatic doors onto the sales floor: refrigerated cases, bento shelves, gondolas, a magazine rack and an ATM, then the checkout counter with the cigarette shelf. Behind: a walk-in cooler, backroom, staff office (CCTV monitors, safe) and delivery entrance. A parking lot out front and a delivery lane at the side. A GM-only floor hatch in the backroom.', '자동문을 지나 매장으로. 냉장 쇼케이스·도시락 진열대·곤돌라·잡지 진열대·ATM, 계산대와 담배 진열장. 뒤쪽에 워크인 냉장고·백야드·사무 공간(방범 모니터·금고)·반입구. 앞에 주차장, 옆에 반입 차로. 백야드에 GM 전용 바닥 점검구') },

    /* (T4 研究・文化・軍事 の登録はここ) */
    { id: 'lab', build: lab, group: 'medical', tags: ['modern', 'research', 'medical', 'underground', 'hidden', 'danger'],
      name: T('研究所／秘密研究施設', 'Research institute / secret lab', '연구소／비밀 연구 시설'),
      desc: T('1Fは受付・監視室・サーバー室・倉庫、2Fは実験室・細胞培養室・試料保管室・飼育室・所長室。カードキーのEVで降りる地下には前室・エアロックと除染シャワー・ガラス張りの隔離室・培養ポットの標本室と地下設備室、封印扉の奥にGM用の封鎖区画', 'Reception, monitoring room, server room and storage on 1F; labs, cell culture, sample store, animal room and director\'s office on 2F. A key-card elevator leads down to a checkpoint, airlock with decon shower, glass-fronted isolation cells, a specimen room of pods and the plant room, with a GM-only sealed section behind a sealed door.', '1층 접수·감시실·서버실·창고, 2층 실험실·세포 배양실·시료 보관실·사육실·소장실. 카드키 EV로 내려가는 지하에 전실·에어록과 제염 샤워·유리벽 격리실·배양 포드 표본실과 지하 설비실, 봉인문 너머 GM 전용 봉쇄 구역') },
    { id: 'museum', build: museum, group: 'public', tags: ['modern', 'public', 'leisure', 'underground', 'hidden', 'large'],
      name: T('博物館／美術館', 'Museum / art gallery', '박물관／미술관'),
      desc: T('1Fはエントランスと恐竜の骨格の自然史展示室・石棺の考古展示室、警備室・学芸員室と搬入口。2Fは企画展示室・美術展示室・カフェ・修復室。B1は燻蒸室と収蔵庫、封印扉の奥にGM用の特別収蔵庫', 'Entrance hall, a natural history gallery with a dinosaur skeleton and an archaeology gallery with a sarcophagus, security room, curators\' office and loading bay on 1F; special exhibition, fine art gallery, café and conservation studio on 2F; fumigation room and storage vaults in B1, with a GM-only special vault behind a sealed door.', '1층 엔트런스와 공룡 골격의 자연사 전시실·석관의 고고 전시실, 경비실·학예사실과 반입구. 2층 기획 전시실·미술 전시실·카페·수복실. B1 훈증실과 수장고, 봉인문 너머 GM 전용 특별 수장고') },
    { id: 'military', build: militaryBase, group: 'military', tags: ['modern', 'military', 'outdoor', 'underground', 'large', 'hidden'],
      name: T('軍事基地／地下司令部', 'Military base / underground command', '군사 기지／지하 사령부'),
      desc: T('外柵と正門・衛兵所、ヘリコプターの格納庫、戦車とトラックの車両区画、本部棟、ヘリポート、格子扉の奥の武器庫、兵舎。本部棟の階段とEVで地下司令部へ降りると、保安ゲート・通信室・作戦卓とモニター壁の司令室・作戦会議室・居住区・発電室。司令官室の本棚のあいだの隠し扉からGM用の回収物保管庫', 'Perimeter fence, main gate and guard post, a helicopter hangar, a vehicle bay with a tank and trucks, HQ building, helipad, an armory behind a grille gate and barracks. Stairs and an elevator in the HQ lead down to the underground command: security gate, comms room, command room with an ops table and monitor wall, briefing room, quarters and generator room, plus a GM-only vault through a hidden door between the commander\'s bookcases.', '외곽 울타리와 정문·위병소, 헬기 격납고, 전차와 트럭의 차량 구역, 본부동, 헬리포트, 격자문 안쪽의 무기고, 병사. 본부동 계단과 EV로 지하 사령부에 내려가면 보안 게이트·통신실·작전 테이블과 모니터 벽의 사령실·작전 회의실·거주구·발전실. 사령관실 책장 사이의 비밀문 너머에 GM 전용 회수물 보관고') },
    { id: 'shelter', build: shelter, group: 'military', tags: ['modern', 'military', 'underground', 'outdoor', 'hidden'],
      name: T('地下シェルター／防空壕', 'Underground shelter', '지하 셸터／방공호'),
      desc: T('地上の入口棟から階段で降り、防爆扉と除染室を抜けて隔壁の中へ。通信室・二段ベッドの居住区・食堂・備蓄庫・医務室、隔壁の先に発電室と換気・浄水室、はしごで地上のハッチへ出る非常口。備蓄庫の棚の裏にGM用の古い防空壕跡', 'Down the stairs from the entrance hut, through the blast door and decon room into the bulkheaded shelter: comms room, bunk-bed quarters, mess, supply store and infirmary; generator and air/water plant past another bulkhead, and an emergency exit with a ladder up to a hatch. A GM-only wartime tunnel behind the supply shelves.', '지상 입구동에서 계단으로 내려가 방폭문과 제염실을 지나 격벽 안으로. 통신실·2층 침대 거주구·식당·비축고·의무실, 격벽 너머 발전실과 환기·정수실, 사다리로 지상 해치에 나가는 비상구. 비축고 선반 뒤에 GM 전용 옛 방공호') },

  ];

  const TEMPLATE_GROUPS = [
    { id: 'home', name: T('住宅・邸宅', 'Homes', '주택·저택') },
    { id: 'lodging', name: T('宿泊・飲食', 'Hotels & dining', '숙박·음식점') },
    { id: 'medical', name: T('医療・研究', 'Medical & research', '의료·연구') },
    { id: 'public', name: T('公共・教育', 'Public & schools', '공공·교육') },
    { id: 'commerce', name: T('商業・業務', 'Shops & offices', '상업·업무') },
    { id: 'leisure', name: T('娯楽・イベント', 'Entertainment', '오락·이벤트') },
    { id: 'transport', name: T('交通・乗り物', 'Transport', '교통·탈것') },
    { id: 'industry', name: T('産業・インフラ', 'Industry', '산업·인프라') },
    { id: 'military', name: T('軍事・保安', 'Military & security', '군사·보안') },
    { id: 'history', name: T('歴史・和風・宗教', 'Historic & religious', '역사·일본풍·종교') },
    { id: 'horror', name: T('廃墟・事件・ホラー', 'Ruins & horror', '폐허·사건·호러') },
    { id: 'fantasy', name: T('SF・ファンタジー・特殊', 'Sci-fi & fantasy', 'SF·판타지·특수') },
    { id: 'nature', name: T('自然・野外', 'Nature', '자연·야외') }
  ];

  /* ---------- 隠し手がかり（「隠し手がかり入りで読み込む」で足す） ----------
   * [階, 部屋名(日本語), 小物, 説明]。置き場所は部屋の中の空いているところを自動で探す。
   * 手がかりは clue: true になり、「隠し手がかり ON/OFF」で GM/PL表示とは別に隠せる。 */
  const C = (floor, room, t, text) => ({ floor, room, t, text });
  const SWING = M.SWING_KINDS;
  const CLUES = {
    '1ldk': [
      C('1F', '個室', 'diary', T('破れた日記', 'Torn diary', '찢긴 일기')),
      C('1F', '個室', 'phone', T('鳴るスマホ', 'Buzzing phone', '진동하는 폰')),
      C('1F', 'LDK', 'pills', T('ラベルのない薬', 'Unlabeled pills', '라벨 없는 약'))
    ],
    '2ldk': [
      C('1F', '洋室1', 'diary', T('鍵付きの日記', 'Locked diary', '잠긴 일기장')),
      C('1F', 'LDK', 'photo', T('切り抜かれた家族写真', 'Family photo, one face cut out', '한 명이 오려진 가족사진')),
      C('1F', 'LDK', 'phone', T('留守電が1件', 'One voicemail', '음성 메시지 1건')),
      C('1F', '洋室2', 'key', T('合鍵', 'Spare key', '여벌 열쇠'))
    ],
    house: [
      C('1F', 'リビング', 'photo', T('暖炉の上の古い写真', 'Old photo on the mantel', '벽난로 위의 오래된 사진')),
      C('1F', 'キッチン', 'knife', T('包丁が1本足りない', 'One kitchen knife missing', '식칼 한 자루가 없다')),
      C('1F', 'ダイニング', 'memo', T('テーブルのレシート', 'Receipt on the table', '테이블 위 영수증')),
      C('2F', '主寝室', 'diary', T('妻の日記', 'The wife\'s diary', '아내의 일기')),
      C('2F', '寝室3', 'clue', T('壁紙の裏の落書き', 'Scrawl behind the wallpaper', '벽지 뒤의 낙서')),
      C('2F', '寝室2', 'key', T('箱に隠された鍵', 'Key hidden in a box', '상자에 숨긴 열쇠')),
      C('屋外', '家庭菜園', 'clue', T('最近掘り返された土', 'Freshly turned soil', '최근에 파헤친 흙'))
    ],
    mansion: [
      C('B1', 'ワインセラー', 'clue', T('1本だけ埃のない瓶', 'One bottle free of dust', '먼지 없는 병 하나')),
      C('B1', 'ボイラー室', 'memo', T('燃え残った手紙', 'Half-burned letter', '타다 남은 편지')),
      C('屋外', '温室', 'pills', T('見慣れない植物の種', 'Seeds of an unknown plant', '처음 보는 식물의 씨앗')),
      C('屋外', '一族の墓所', 'clue', T('名前が削られた墓', 'A grave with the name chiseled off', '이름이 깎인 무덤')),
      C('1F', '書斎', 'diary', T('当主の手記', 'The master\'s journal', '당주의 수기')),
      C('1F', '図書室', 'clue', T('抜かれた本の隙間', 'Gap in the shelf', '책이 빠진 틈')),
      C('1F', '厨房', 'knife', T('研いだばかりの包丁', 'Freshly sharpened cleaver', '막 간 식칼')),
      C('2F', '主寝室', 'photo', T('顔を塗りつぶした写真', 'Photo with the face blacked out', '얼굴이 칠해진 사진')),
      C('2F', '子供部屋', 'idol', T('見知らぬ神像', 'Idol of an unknown god', '알 수 없는 신상')),
      C('2F', '音楽室', 'memo', T('楽譜に挟まれた暗号', 'Cipher tucked in sheet music', '악보에 끼운 암호'))
    ],
    apartment: [
      C('1F', '102号室', 'diary', T('隣人の観察日記', 'Diary watching the neighbors', '이웃 관찰 일기')),
      C('1F', '103号室', 'phone', T('鳴り続けるスマホ', 'Phone that keeps ringing', '계속 울리는 휴대폰')),
      C('1F', '共用廊下', 'memo', T('破られた手紙', 'Torn-up letter', '찢긴 편지')),
      C('1F', '駐車場', 'clue', T('新しいタイヤ痕', 'Fresh tire marks', '새로 생긴 타이어 자국')),
      C('2F', '204号室', 'photo', T('隠し撮り写真の束', 'Stack of candid photos', '몰래 찍은 사진 뭉치')),
      C('2F', '201号室', 'key', T('102号室の合鍵', 'Spare key to unit 102', '102호 여벌 열쇠'))
    ],
    tower: [
      C('1F', '防災センター', 'memo', T('監視カメラの記録メモ', 'CCTV log note', 'CCTV 기록 메모')),
      C('1F', 'ラウンジ', 'phone', T('置き忘れたスマホ', 'Forgotten phone', '두고 간 휴대폰')),
      C('1F', '管理事務室', 'key', T('マスターキー', 'Master key', '마스터키')),
      C('20F', '2001号室', 'diary', T('住人の手帳', 'Resident\'s planner', '주민의 수첩')),
      C('20F', '2003号室', 'pills', T('大量の睡眠薬', 'Far too many sleeping pills', '대량의 수면제')),
      C('20F', 'トランクルーム', 'clue', T('床を引きずった跡', 'Drag marks on the floor', '바닥을 끈 자국'))
    ],
    hotel: [
      C('1F', 'ロビー', 'memo', T('宿泊者名簿の写し', 'Copy of the guest list', '숙박자 명부 사본')),
      C('1F', '厨房', 'knife', T('刃こぼれした包丁', 'Chipped knife', '이가 빠진 칼')),
      C('2F', 'チャペル', 'idol', T('祭壇の奇妙な像', 'Strange idol by the altar', '제단의 기묘한 석상')),
      C('2F', '宴会厨房', 'clue', T('布をかけた大きな荷物', 'Large bundle under a sheet', '천을 덮은 큰 짐')),
      C('3F', '屋内プール', 'key', T('プールの底に沈んだ鍵', 'Key at the bottom of the pool', '수영장 바닥의 열쇠')),
      C('7F', '707', 'diary', T('宿泊客の日記', 'A guest\'s diary', '투숙객의 일기')),
      C('8F', '主寝室', 'photo', T('破られた写真', 'Torn photograph', '찢긴 사진')),
      C('8F', 'バーパントリー', 'pills', T('睡眠薬の空き瓶', 'Empty sleeping-pill bottle', '빈 수면제 병'))
    ],
    hospital: [
      C('1F', '診察室2', 'memo', T('書きかけのカルテ', 'Unfinished chart', '쓰다 만 차트')),
      C('1F', '薬局', 'pills', T('数の合わない劇薬', 'Controlled drugs don\'t add up', '수가 안 맞는 극약')),
      C('1F', '霊安室', 'clue', T('名札のない遺体袋', 'Body bag with no tag', '이름표 없는 시신 가방')),
      C('2F', '205（個室）', 'diary', T('患者の日記', 'Patient\'s diary', '환자의 일기')),
      C('2F', 'ナースステーション', 'key', T('薬品庫の鍵', 'Drug storage key', '약품고 열쇠')),
      C('2F', '汚物処理室', 'knife', T('血のついたメス', 'Bloodied scalpel', '피 묻은 메스'))
    ],
    school: [
      C('1F', '職員室', 'memo', T('書き換えた成績表', 'Altered grade sheet', '고쳐 쓴 성적표')),
      C('1F', '保健室', 'pills', T('来室記録と薬', 'Visit log and medicine', '방문 기록과 약')),
      C('1F', '校長室', 'key', T('旧校舎の鍵', 'Key to the old building', '구교사 열쇠')),
      C('2F', '音楽室', 'photo', T('肖像画の裏の写真', 'Photo behind a portrait', '초상화 뒤의 사진')),
      C('2F', '理科準備室', 'idol', T('棚の奥の奇妙な像', 'Strange idol on a shelf', '선반 안쪽의 기묘한 석상')),
      C('2F', '2年3組', 'diary', T('机の中の交換日記', 'Shared diary in a desk', '책상 속 교환 일기'))
    ],
    police: [
      C('1F', '当直室', 'memo', T('空白のある当直日誌', 'Duty log with a gap', '공백이 있는 당직 일지')),
      C('1F', '車庫', 'clue', T('タイヤについた赤土', 'Red clay on the tires', '타이어에 묻은 붉은 흙')),
      C('2F', '証拠品保管庫', 'knife', T('封の切られた証拠品', 'Evidence with a broken seal', '봉인이 뜯긴 증거품')),
      C('2F', '取調室2', 'diary', T('供述調書の写し', 'Copy of a statement', '진술 조서 사본')),
      C('2F', '資料室', 'photo', T('未解決事件の写真', 'Cold case photos', '미해결 사건 사진')),
      C('2F', '署長室', 'key', T('金庫の鍵', 'Safe key', '금고 열쇠')),
      C('2F', '留置室3', 'clue', T('壁の引っかき傷', 'Scratches on the wall', '벽의 긁힌 자국'))
    ],
    library: [
      C('B1', '貴重書庫', 'diary', T('鍵付きの古写本', 'Locked old manuscript', '잠긴 고사본')),
      C('B1', '閉架書庫', 'memo', T('貸出記録の切れ端', 'Scrap of a loan record', '대출 기록 조각')),
      C('B1', '機械室', 'clue', T('床下へ続く跡', 'Marks leading under the floor', '바닥 밑으로 이어진 흔적')),
      C('1F', '郷土資料室', 'photo', T('古い集合写真', 'Old group photo', '오래된 단체 사진')),
      C('1F', '児童コーナー', 'idol', T('誰のものでもない人形', 'A doll nobody owns', '주인 없는 인형')),
      C('1F', '事務室', 'key', T('閉架書庫の鍵', 'Closed stacks key', '폐가 서고 열쇠'))
    ],
    university: [
      C('1F', '大講義室', 'memo', T('黒板の消し残し', 'Half-erased blackboard', '덜 지운 칠판')),
      C('1F', '学生ラウンジ', 'phone', T('置き忘れたスマホ', 'Forgotten phone', '두고 간 휴대폰')),
      C('2F', '研究室3', 'diary', T('教授の研究ノート', 'Professor\'s notebook', '교수의 연구 노트')),
      C('2F', '研究室5', 'idol', T('出土品の像', 'Excavated idol', '출토품 석상')),
      C('2F', '実験室', 'pills', T('試薬の空き瓶', 'Empty reagent bottle', '빈 시약병')),
      C('2F', '院生室', 'key', T('研究室3の合鍵', 'Spare key to Office 3', '연구실3 여벌 열쇠'))
    ],
    bar: [
      C('B1', 'バー', 'memo', T('コースターの走り書き', 'Note on a coaster', '코스터의 메모')),
      C('B1', 'VIPルーム', 'photo', T('密会の写真', 'Photo of a secret meeting', '밀회 사진')),
      C('B1', 'キッチン', 'knife', T('隠されたナイフ', 'Hidden knife', '숨겨진 칼')),
      C('B1', '事務室', 'diary', T('裏帳簿', 'Second set of books', '이중 장부')),
      C('B1', '倉庫', 'key', T('VIPルームの鍵', 'VIP room key', 'VIP룸 열쇠'))
    ],
    livehouse: [
      C('B1', '受付', 'phone', T('落とし物のスマホ', 'Lost phone', '분실물 휴대폰')),
      C('B1', 'ホール', 'clue', T('床に落ちたピック', 'Guitar pick on the floor', '바닥에 떨어진 피크')),
      C('B1', '楽屋1', 'diary', T('ボーカルの手帳', 'Singer\'s notebook', '보컬의 수첩')),
      C('B1', '楽屋2', 'pills', T('楽屋の薬', 'Pills in the green room', '대기실의 약')),
      C('B1', '機材倉庫', 'knife', T('ケーブルを切った刃物', 'Blade that cut the cables', '케이블을 자른 칼날')),
      C('B1', '事務室', 'memo', T('脅迫状', 'Threatening letter', '협박장'))
    ],
    theatre: [
      C('1F', '舞台', 'clue', T('奈落の蓋のずれ', 'Trapdoor lid out of place', '어긋난 무대 함정 뚜껑')),
      C('1F', '客席', 'key', T('座席の下の鍵', 'Key under a seat', '좌석 밑의 열쇠')),
      C('1F', '楽屋2', 'photo', T('鏡に貼られた写真', 'Photo taped to the mirror', '거울에 붙은 사진')),
      C('1F', '楽屋3', 'memo', T('脅迫状', 'Threatening letter', '협박장')),
      C('1F', '大道具倉庫', 'knife', T('本物の短剣', 'A real dagger', '진짜 단검')),
      C('1F', '調整室', 'diary', T('キューシートの書き込み', 'Notes on the cue sheet', '큐시트의 메모'))
    ],
    haibyoin: [
      C('B1', '解剖室', 'knife', T('錆びたメス', 'Rusted scalpel', '녹슨 메스')),
      C('B1', 'カルテ庫', 'diary', T('消されたカルテ', 'Erased medical chart', '지워진 차트')),
      C('B1', '隔離病室', 'memo', T('壁に刻まれた日付', 'Dates carved into the wall', '벽에 새긴 날짜')),
      C('B1', '霊安室', 'key', T('遺体袋の中の鍵', 'Key inside a body bag', '시신 가방 속 열쇠')),
      C('1F', '受付・会計', 'phone', T('なぜか通じる電話', 'A phone that still works', '어째선지 연결되는 전화')),
      C('2F', '206（4床）', 'photo', T('看護師の集合写真', 'Group photo of the nurses', '간호사 단체 사진')),
      C('2F', '処置室', 'pills', T('残された薬瓶', 'Abandoned pill bottles', '남겨진 약병'))
    ],
    haioku: [
      C('1F', 'リビング', 'photo', T('1人だけ顔のない家族写真', 'Family photo, one face missing', '한 명만 얼굴 없는 가족사진')),
      C('1F', 'キッチン', 'memo', T('冷蔵庫に貼られたメモ', 'Note on the fridge', '냉장고에 붙은 메모')),
      C('1F', 'ファミリールーム', 'clue', T('床の黒い染み', 'Black stain on the floor', '바닥의 검은 얼룩')),
      C('2F', '主寝室', 'diary', T('母親の日記', 'The mother\'s diary', '어머니의 일기')),
      C('2F', '寝室3', 'idol', T('子供が作った人形', 'Doll a child made', '아이가 만든 인형')),
      C('2F', '寝室2', 'key', T('屋根裏の鍵', 'Attic key', '다락방 열쇠'))
    ],
    haibiru: [
      C('1F', '元テナント（店舗跡）', 'clue', T('シャッター裏の落書き', 'Graffiti behind the shutter', '셔터 뒤의 낙서')),
      C('1F', '管理人室', 'diary', T('管理人日誌', 'Janitor\'s logbook', '관리인 일지')),
      C('1F', '機械室', 'key', T('屋上の鍵', 'Rooftop key', '옥상 열쇠')),
      C('2F', '事務所跡', 'memo', T('シュレッダーの残り', 'Shredder leftovers', '파쇄기 잔해')),
      C('2F', '社長室', 'photo', T('破られた集合写真', 'Torn group photo', '찢긴 단체 사진')),
      C('2F', '倉庫', 'knife', T('隠された凶器', 'Hidden weapon', '숨겨진 흉기'))
    ],
    crime: [
      C('1F', '個室', 'diary', T('被害者の手帳', 'Victim\'s planner', '피해자의 수첩')),
      C('1F', 'バルコニー', 'phone', T('最後の発信履歴', 'Last outgoing call', '마지막 발신 기록'))
    ],
    speakeasy: [
      C('1F', '理髪店', 'memo', T('今週の合言葉', 'This week\'s password', '이번 주 암호')),
      C('1F', '奥の部屋', 'diary', T('裏帳簿', 'Secret ledger', '비밀 장부')),
      C('1F', 'もぐり酒場', 'photo', T('常連客の集合写真', 'Photo of the regulars', '단골손님 단체 사진')),
      C('1F', '厨房', 'key', T('港の倉庫の鍵', 'Key to a dockside warehouse', '항구 창고 열쇠')),
      C('1F', 'ボイラー室', 'idol', T('焼け残った奇妙な像', 'Half-burned idol', '타다 남은 기묘한 상'))
    ],
    detective: [
      C('2F', '探偵の部屋', 'diary', T('依頼人の手紙', 'Client\'s letter', '의뢰인의 편지')),
      C('2F', '所長室', 'photo', T('現像途中の写真', 'Half-developed photo', '현상 중인 사진')),
      C('2F', '待合室', 'memo', T('失踪者のファイル', 'Missing-person file', '실종자 파일')),
      C('1F', '質屋', 'key', T('質札の付いた鍵', 'Pawned key with a tag', '전당표가 붙은 열쇠')),
      C('1F', 'ダイナー', 'memo', T('ナプキンの走り書き', 'Note scrawled on a napkin', '냅킨에 휘갈긴 메모'))
    ],
    spaceship: [
      C('第1甲板', '艦長室', 'diary', T('艦長の航海日誌', 'Captain\'s log', '함장의 항해 일지')),
      C('第1甲板', '医務室', 'pills', T('鎮静剤の空き瓶', 'Empty sedative vial', '빈 진정제 병')),
      C('第1甲板', '機関室', 'memo', T('手書きの警告', 'Handwritten warning', '손으로 쓴 경고')),
      C('第1甲板', '研究室', 'memo', T('標本の観察記録', 'Specimen notes', '표본 관찰 기록')),
      C('第1甲板', '食堂', 'photo', T('知らない乗員の写真', 'Photo of an unknown crewman', '모르는 승무원 사진'))
    ],
    station: [
      C('基地', '通信室', 'memo', T('途切れた最後の通信', 'The last, broken transmission', '끊긴 마지막 통신')),
      C('基地', '研究室', 'diary', T('主任研究員の日誌', 'Lead scientist\'s journal', '책임 연구원의 일지')),
      C('基地', '個室3', 'photo', T('家族の写真', 'Family photo', '가족사진')),
      C('基地', 'ガレージ', 'key', T('封鎖ラボのカードキー', 'Sealed-lab keycard', '봉쇄 실험실 카드키')),
      C('基地', '中央ハブ', 'pills', T('睡眠薬', 'Sleeping pills', '수면제'))
    ],
    kominka: [
      C('1F', '仏間', 'photo', T('遺影の裏の書き付け', 'Writing behind a memorial photo', '영정 사진 뒤의 메모')),
      C('1F', '蔵', 'key', T('座敷牢の鍵', 'Key to the hidden cell', '숨겨진 감옥 열쇠')),
      C('1F', '台所', 'diary', T('祖母の日記', 'Grandmother\'s diary', '할머니의 일기')),
      C('1F', '土間', 'knife', T('錆びた鉈', 'Rusty hatchet', '녹슨 손도끼')),
      C('1F', '納屋', 'idol', T('藁人形', 'Straw effigy', '짚 인형'))
    ],
    shrine: [
      C('1F', '事務室', 'diary', T('先代宮司の日記', 'The former priest\'s diary', '선대 궁사의 일기')),
      C('1F', '宝物殿', 'key', T('本殿の鍵', 'Sanctuary key', '본전 열쇠')),
      C('1F', '拝殿', 'photo', T('奉納された古写真', 'Old photo left as an offering', '봉납된 옛 사진')),
      C('1F', '本殿', 'memo', T('古い祝詞の写し', 'Copy of an old prayer', '오래된 축사 사본'))
    ],
    cave: [
      C('1F', '大空洞', 'diary', T('前の探検隊の手帳', 'Notebook of the last expedition', '이전 탐험대의 수첩')),
      C('1F', '洞窟の入口', 'photo', T('水に濡れた写真', 'Water-soaked photo', '물에 젖은 사진')),
      C('1F', '祭壇の間', 'memo', T('岩に刻まれた文字', 'Letters carved in the rock', '바위에 새겨진 글자')),
      C('1F', '獣の巣', 'knife', T('折れたナイフ', 'Broken knife', '부러진 칼'))
    ],
    campsite: [
      C('1F', '受付・売店', 'diary', T('管理人の日誌', 'Caretaker\'s log', '관리인 일지')),
      C('1F', '駐車場', 'photo', T('前の宿泊客の写真', 'Photo of the last guests', '이전 숙박객 사진')),
      C('1F', '炊事場', 'knife', T('血の付いた包丁', 'Bloodied kitchen knife', '피 묻은 식칼')),
      C('1F', '河原', 'phone', T('落ちていたスマホ', 'Dropped smartphone', '떨어진 스마트폰')),
      C('1F', '古い防空壕', 'key', T('錆びた鍵', 'Rusty key', '녹슨 열쇠'))
    ],
    basement: [
      C('1F', '書斎', 'diary', T('家主の日記', 'The owner\'s diary', '집주인의 일기')),
      C('1F', '防音室', 'tape', T('録音テープ', 'Recorded tape', '녹음 테이프')),
      C('1F', 'キッチン', 'knife', T('洗ったばかりの包丁', 'Freshly washed knife', '막 씻은 식칼')),
      C('B1', '地下室', 'clue', T('床の引きずった跡', 'Drag marks on the floor', '바닥에 끈 자국'))
    ],
    ninja: [
      C('1F', '座敷', 'memo', T('掛け軸の裏の書付', 'Note behind the hanging scroll', '족자 뒤의 쪽지')),
      C('1F', '仏間', 'clue', T('仏壇の横の擦れた床', 'Worn floor beside the altar', '불단 옆의 닳은 마루')),
      C('1F', '台所', 'pills', T('痺れ薬の包み', 'Packet of numbing powder', '마비 약 봉지')),
      C('1F', '次の間', 'key', T('茶釜の中の鍵', 'Key inside the tea kettle', '찻솥 안의 열쇠'))
    ],
    tavern: [
      C('1F', '酒場', 'memo', T('酔客の噂話のメモ', 'Notes of a drunk\'s rumor', '취객의 소문 메모')),
      C('1F', '厨房', 'clue', T('樽の底の隠し蓋', 'False bottom in a barrel', '통 바닥의 숨은 뚜껑')),
      C('2F', '客室3', 'diary', T('前の宿泊客の日記', 'Last guest\'s diary', '이전 숙박객의 일기')),
      C('2F', '大部屋', 'key', T('古い塔の鍵', 'Key to the old tower', '오래된 탑의 열쇠'))
    ],
    castle: [
      C('1F', '王の私室', 'diary', T('王の密書', 'The king\'s secret letter', '왕의 밀서')),
      C('1F', '礼拝堂', 'idol', T('祭壇の裏の偶像', 'Idol behind the altar', '제단 뒤의 우상')),
      C('1F', '武器庫', 'clue', T('数の合わない剣', 'One sword missing from the rack', '수가 맞지 않는 검')),
      C('B1', '牢番の詰所', 'memo', T('囚人名簿', 'Prisoner roll', '죄수 명부'))
    ],
    dungeon: [
      C('B1', '罠の回廊', 'memo', T('壁の警告文', 'Warning scratched on the wall', '벽의 경고문')),
      C('B1', 'ゴブリンの巣', 'key', T('宝物庫の鍵', 'Vault key', '보물고 열쇠')),
      C('B1', '十字路', 'clue', T('床の古い足跡', 'Old footprints in the dust', '바닥의 오래된 발자국')),
      C('B1', '主の間', 'diary', T('主の研究記録', 'The master\'s research notes', '주인의 연구 기록'))
    ],
    wizard: [
      C('1F', '入口の間', 'memo', T('来客を拒む貼り紙', 'Notice turning visitors away', '방문객을 거부하는 쪽지')),
      C('2F', '書庫', 'diary', T('封印についての書物', 'Book on the seal', '봉인에 관한 책')),
      C('2F', '実験室', 'pills', T('光る薬瓶', 'Glowing vial', '빛나는 약병')),
      C('3F', '天文台', 'clue', T('星図に記された日付', 'A date marked on the star chart', '성도에 적힌 날짜'))
    ],

    /* (T1 の手がかりはここ) */
    railstation: [
      C('1F', '駅員室', 'file_folder', T('改札の通過記録', 'Ticket gate logs', '개찰구 통과 기록')),
      C('1F', '遺失物保管庫', 'bag', T('持ち主の現れない鞄', 'An unclaimed bag', '주인이 나타나지 않는 가방')),
      C('1F', '待合室', 'diary', T('ベンチに忘れられた手帳', 'Notebook left on a bench', '벤치에 두고 간 수첩')),
      C('1F', '2・3番線ホーム', 'phone', T('線路際に落ちた携帯電話', 'Phone dropped by the edge', '선로 가에 떨어진 휴대전화')),
      C('2F', '跨線橋', 'photo', T('窓に貼られた尋ね人の写真', 'Missing-person photo on the window', '창에 붙은 실종자 사진'))
    ],
    subway: [
      C('B1', '駅事務室', 'file_folder', T('防犯カメラの記録票', 'CCTV log sheet', 'CCTV 기록표')),
      C('B1', '地下通路', 'memo', T('壁に貼られた古い掲示', 'Old notice on the wall', '벽에 붙은 오래된 게시물')),
      C('B2', '1・2番線ホーム', 'camera', T('ベンチの下のカメラ', 'Camera under a bench', '벤치 아래의 카메라')),
      C('B2', '排水ポンプ室', 'key', T('旧連絡通路の鍵', 'Key to the old tunnel', '옛 연결 통로 열쇠'))
    ],
    parking_tower: [
      C('1F', '管理室', 'file_folder', T('入出庫の記録', 'Entry and exit log', '입출고 기록')),
      C('2F', '車路', 'wallet', T('落ちていた財布', 'A dropped wallet', '떨어져 있던 지갑')),
      C('3F', '車路', 'bag', T('柱の陰の紙袋', 'Paper bag by a pillar', '기둥 옆의 종이봉투')),
      C('屋上', '車路', 'phone', T('手すりのそばの携帯電話', 'Phone by the railing', '난간 옆의 휴대전화'))
    ],
    parking_ug: [
      C('B1', '管理室', 'file_folder', T('防犯カメラの録画記録', 'CCTV recording log', 'CCTV 녹화 기록')),
      C('B1', '駐車場', 'wallet', T('区画に落ちた財布', 'Wallet dropped in a bay', '구획에 떨어진 지갑')),
      C('B2', '駐車場', 'key', T('札の付いた古い鍵', 'Old key with a tag', '꼬리표 달린 낡은 열쇠')),
      C('B2', '排水ポンプ室', 'recorder', T('録音が残ったレコーダー', 'Recorder with a message', '녹음이 남은 녹음기'))
    ],
    ship: [
      C('ブリッジ甲板', '操舵室', 'papers', T('航海日誌の破られたページ', 'Torn-out log book pages', '찢겨 나간 항해일지')),
      C('ブリッジ甲板', '船長室', 'key', T('貨物庫の合鍵', 'Spare cargo hold key', '화물창 여벌 열쇠')),
      C('遊歩甲板', 'パーティーホール', 'photo', T('パーティーの集合写真', 'Group photo from the party', '파티 단체 사진')),
      C('客室甲板', '特等室', 'diary', T('乗客の日記', 'A passenger\'s diary', '승객의 일기')),
      C('下甲板', '貨物庫', 'clue', T('木箱をずらした跡', 'Marks of moved crates', '나무 상자를 옮긴 흔적'))
    ],
    viaduct: [
      C('橋下', '野営地', 'bag', T('置き去りのリュック', 'Abandoned backpack', '버려진 배낭')),
      C('橋下', '資材倉庫', 'papers', T('点検作業の日報', 'Inspection reports', '점검 작업 일보')),
      C('橋下', '月極駐車場', 'key', T('点検階段の鍵', 'Inspection stair key', '점검 계단 열쇠')),
      C('高架上', '点検通路', 'flashlight', T('点いたままの懐中電灯', 'A flashlight left on', '켜진 채 놓인 손전등'))
    ],

    /* (T2 の手がかりはここ) */
    construction: [
      C('1F', '現場事務所', 'file_folder', T('工程表と作業中止の指示書', 'Schedule and a stop-work order', '공정표와 작업 중지 지시서')),
      C('1F', '掘削箇所（作業中止）', 'photo', T('掘り出された石室の写真', 'Photo of the unearthed chamber', '발굴된 석실 사진')),
      C('1F', '資材置場', 'wallet', T('作業員の財布', 'A worker\'s wallet', '작업원의 지갑')),
      C('1F', '建設中区画', 'phone', T('鳴り続ける携帯', 'A phone that keeps ringing', '계속 울리는 휴대폰'))
    ],
    building_wip: [
      C('1F', '1階（内装工事中）', 'papers', T('部屋が1つ多い図面', 'Blueprint with one room too many', '방이 하나 더 많은 도면')),
      C('1F', '1階（内装工事中）', 'memo', T('「下から声がする」の走り書き', 'Scrawl: "voices from below"', '「아래에서 목소리가 난다」는 메모')),
      C('2F', '2階（ブロック積み）', 'flashlight', T('点いたままの懐中電灯', 'Flashlight still on', '켜진 채인 손전등')),
      C('3F', '3階（打設直後）', 'wallet', T('コンクリートに沈みかけた財布', 'Wallet half sunk in wet concrete', '콘크리트에 반쯤 잠긴 지갑'))
    ],
    factory: [
      C('1F', '検査室', 'papers', T('改ざんされた検査票', 'Falsified inspection sheets', '조작된 검사표')),
      C('1F', '更衣室（男）', 'key', T('ロッカーの合鍵', 'Spare locker key', '로커 여벌 열쇠')),
      C('1F', '守衛所', 'diary', T('守衛の夜勤日誌', 'Night guard\'s logbook', '경비원 야근 일지')),
      C('2F', '工場長室', 'file_folder', T('不良品の隠蔽記録', 'Records of covered-up defects', '불량품 은폐 기록')),
      C('2F', '制御室', 'recorder', T('事故当日の運転ログ', 'Operation log from the accident', '사고 당일의 운전 로그'))
    ],
    warehouse: [
      C('1F', '事務所', 'file_folder', T('偽の積荷目録', 'Forged cargo manifest', '위조된 적하 목록')),
      C('1F', 'ドライバー控室', 'phone', T('置き忘れたスマホ', 'A phone left behind', '두고 간 휴대폰')),
      C('1F', '冷蔵室', 'fingerprint', T('扉の内側の手形', 'Handprints inside the door', '문 안쪽의 손자국')),
      C('1F', '守衛所', 'laptop', T('深夜だけ欠けた録画', 'Footage missing after midnight', '심야만 빠진 녹화'))
    ],
    sewer: [
      C('B1', '機械室', 'diary', T('点検員の日誌「水位が勝手に下がる」', 'Inspector\'s log: "the water drops by itself"', '점검원 일지 「수위가 저절로 내려간다」')),
      C('B1', '水門操作室', 'key', T('格子扉の鍵', 'Key to the grille gate', '격자문 열쇠')),
      C('B1', '旧水路', 'bag', T('行方不明者の鞄', 'Missing person\'s bag', '실종자의 가방')),
      C('地上', 'ポンプ場（管理棟）', 'file_folder', T('図面にない水路の記録', 'Records of an unmapped tunnel', '도면에 없는 수로 기록'))
    ],
    haikoujou: [
      C('1F', '倉庫', 'photo', T('封鎖前の倉庫の写真', 'Photo from before the sealing', '봉쇄 전 창고 사진')),
      C('1F', '食堂・休憩室', 'memo', T('事故を報じる新聞記事', 'Clipping about the accident', '사고를 보도한 신문 기사')),
      C('1F', '守衛所', 'flashlight', T('最近の侵入者の懐中電灯', 'A recent intruder\'s flashlight', '최근 침입자의 손전등')),
      C('2F', '工場長室', 'diary', T('工場長の日記「あれを封じるしかない」', 'Manager\'s diary: "We must seal it in"', '공장장 일기 「그것을 봉인할 수밖에 없다」')),
      C('2F', '制御室', 'recorder', T('事故の瞬間の録音', 'Recording of the accident', '사고 순간의 녹음'))
    ],
    rooftop: [
      C('屋上', '塔屋（階段室）', 'memo', T('扉に挟まれたメモ', 'Note wedged in the door', '문틈에 끼워진 메모')),
      C('屋上', '屋上', 'casings', T('フェンス際の薬莢', 'Shell casings by the fence', '펜스 옆 탄피')),
      C('屋上', 'EV機械室', 'key', T('屋上倉庫の合鍵', 'Spare key to the storeroom', '옥상 창고 여벌 열쇠')),
      C('屋上', '隣のビルの屋上', 'camera', T('こちらを向いた望遠カメラ', 'Telephoto camera aimed this way', '이쪽을 향한 망원 카메라')),
      C('屋上', '階段室', 'bag', T('置き去りの鞄', 'Abandoned bag', '버려진 가방'))
    ],

    /* (T3 の手がかりはここ) */
    buke: [
      C('母屋', '書院', 'diary', T('当主の日記', 'The master\'s diary', '당주의 일기')),
      C('外観', '蔵', 'key', T('長持の鍵', 'Key to the chest', '궤짝 열쇠')),
      C('母屋', '仏間', 'papers', T('塗りつぶされた家系図', 'Family tree with names blacked out', '이름이 지워진 가계도')),
      C('母屋', '次の間', 'cursed_item', T('割れた茶碗', 'Cracked tea bowl', '깨진 찻사발')),
      C('母屋', '寝間', 'memo', T('奉公人の書き置き', 'A servant\'s note', '하인의 쪽지'))
    ],
    temple: [
      C('1F', '寺務所', 'file_folder', T('古い過去帳', 'Death register', '오래된 과거장')),
      C('1F', '住職の部屋', 'diary', T('住職の日記', 'Head priest\'s diary', '주지의 일기')),
      C('1F', '墓地', 'clue', T('掘り返された土', 'Freshly dug earth', '파헤친 흙')),
      C('1F', '内陣', 'key', T('秘仏の厨子の鍵', 'Key to the hidden shrine', '비불 감실 열쇠')),
      C('1F', '鐘楼', 'memo', T('鐘に貼られた古い札', 'Bell talisman', '종에 붙은 오래된 부적'))
    ],
    church: [
      C('1F', '事務室', 'file_folder', T('洗礼台帳', 'Baptismal register', '세례 대장')),
      C('1F', '聖具室', 'key', T('納骨堂の格子扉の鍵', 'Key to the crypt gate', '납골당 격자문 열쇠')),
      C('1F', '身廊', 'diary', T('置き忘れの祈祷書', 'Forgotten prayer book', '두고 간 기도서')),
      C('2F', 'オルガン席', 'papers', T('書き込みのある楽譜', 'Annotated sheet music', '메모가 적힌 악보')),
      C('B1', '地下納骨堂', 'clue', T('動かされた石棺の蓋', 'A sarcophagus lid moved aside', '밀려난 석관 뚜껑'))
    ],
    office: [
      C('1F', '防災センター', 'laptop', T('消された監視カメラの記録', 'Erased security camera footage', '지워진 CCTV 기록')),
      C('2F', 'サーバー室', 'papers', T('不審なアクセスログ', 'Suspicious access log', '수상한 접속 기록')),
      C('2F', '休憩室', 'phone', T('置き忘れのスマホ', 'Forgotten smartphone', '두고 간 스마트폰')),
      C('3F', '秘書室', 'key', T('社長室の合鍵', 'Spare key to the president\'s office', '사장실 여벌 열쇠')),
      C('3F', '社長室', 'diary', T('社長の手帳', 'The president\'s planner', '사장의 수첩'))
    ],
    konbini: [
      C('屋内', '事務スペース', 'laptop', T('深夜の防犯カメラ映像', 'Late-night CCTV footage', '심야 CCTV 영상')),
      C('屋内', 'レジ', 'papers', T('不自然なレシートの束', 'A bundle of odd receipts', '수상한 영수증 뭉치')),
      C('屋内', 'バックヤード', 'memo', T('夜勤の引き継ぎメモ', 'Night-shift memo', '야간 근무 인수인계 메모')),
      C('屋内', 'ウォークイン冷蔵庫', 'clue', T('血痕つきの段ボール', 'Bloodstained box', '핏자국 묻은 상자')),
      C('屋外', '駐車場', 'key', T('落ちていた車の鍵', 'A dropped car key', '떨어져 있던 자동차 열쇠'))
    ],

    /* (T4 の手がかりはここ) */
    lab: [
      C('1F', '監視室', 'file_folder', T('存在しないB1のカメラ記録', 'Camera log for a B1 that "doesn\'t exist"', '존재하지 않는 B1의 카메라 기록')),
      C('2F', '所長室', 'key', T('B1のカードキー', 'Key card marked B1', 'B1 카드키')),
      C('2F', '飼育室', 'memo', T('数の合わない飼育記録', 'Animal log that doesn\'t add up', '수가 맞지 않는 사육 기록')),
      C('B1', '制御室', 'recorder', T('最後の録音', 'The last recording', '마지막 녹음')),
      C('B1', '標本室', 'photo', T('被験者の顔写真', 'Photos of the test subjects', '피험자 얼굴 사진'))
    ],
    museum: [
      C('1F', '警備室', 'file_folder', T('閉館後の入館記録', 'After-hours entry log', '폐관 후 출입 기록')),
      C('1F', '学芸員室', 'diary', T('学芸員の研究ノート', 'A curator\'s research notes', '학예사의 연구 노트')),
      C('2F', '企画展示室', 'memo', T('寄贈者不明の展示札', 'Exhibit label: donor unknown', '기증자 불명의 전시 라벨')),
      C('2F', '館長室', 'key', T('特別収蔵庫の鍵', 'Key to the special vault', '특별 수장고 열쇠')),
      C('B1', '収蔵庫2（考古・自然史）', 'photo', T('台帳と違う収蔵品の写真', 'Photo that doesn\'t match the register', '대장과 다른 수장품 사진'))
    ],
    shelter: [
      C('B1', '通信室', 'recorder', T('途切れた最後の交信', 'The last transmission, cut off', '끊긴 마지막 교신')),
      C('B1', '居住区', 'diary', T('避難者の日記', 'An evacuee\'s diary', '피난자의 일기')),
      C('B1', '備蓄庫', 'memo', T('合わない在庫表', 'Inventory that doesn\'t add up', '맞지 않는 재고표')),
      C('B1', '医務室', 'pills', T('鎮静剤の空き瓶', 'Empty sedative bottle', '빈 진정제 병')),
      C('B1', '発電室', 'key', T('非常口の鍵', 'Emergency exit key', '비상구 열쇠'))
    ],
    military: [
      C('1F', '当直室', 'file_folder', T('書き換えられた当直日誌', 'Altered duty log', '고쳐 쓴 당직 일지')),
      C('1F', '武器庫', 'casings', T('数の合わない弾薬', 'Ammunition count is off', '수가 맞지 않는 탄약')),
      C('1F', '居室1', 'photo', T('隊員の家族写真と走り書き', 'A soldier\'s family photo and scrawl', '대원의 가족사진과 낙서')),
      C('B1', '通信室', 'recorder', T('暗号化された最後の通信', 'The last encrypted transmission', '암호화된 마지막 통신')),
      C('B1', '司令官室', 'key', T('保管庫のカードキー', 'Vault key card', '보관고 카드키'))
    ],

  };

  // 文字の幅（キャンバスで測る。測れないときは、日本語・韓国語は1文字 ≒ 文字サイズ、英数字は約0.6倍で見積もる）
  let measureCtx = null;
  function textWidth(str, size, weight = 600) {
    if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
    if (measureCtx && M.THEMES) {
      measureCtx.font = `${weight} 100px ${M.THEMES.clean.font}`;
      return (measureCtx.measureText(String(str)).width * size) / 100;
    }
    let w = 0;
    for (const ch of String(str)) w += /[\u3000-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? 1 : 0.6;
    return w * size;
  }

  // 長い説明を2行に分ける（英語は空白で、日本語・韓国語は真ん中あたりで）
  function wrapText(text) {
    const chars = Array.from(text);
    if (chars.length < 7) return text;
    const mid = chars.length / 2;
    let cut = -1;
    chars.forEach((ch, i) => { if ((ch === ' ' || ch === '、' || ch === ',') && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i; });
    if (cut > 0 && Math.abs(cut - mid) < chars.length * 0.3) {
      const keep = chars[cut] === ' ' ? 0 : 1;
      return `${chars.slice(0, cut + keep).join('').trim()}\n${chars.slice(cut + 1).join('').trim()}`;
    }
    const at = Math.ceil(mid);
    return `${chars.slice(0, at).join('')}\n${chars.slice(at).join('')}`;
  }

  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // 部屋の中で w×h の空いている場所を探す（家具・ドアの開く範囲・部屋名・ほかの文字を避け、部屋の中央寄りを選ぶ）
  function findSpot(f, room, w, h, lang) {
    const inset = 0.35, step = 0.25;
    const pad = (r, p) => ({ x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 });
    const blocks = [];
    f.items.forEach(i => { if (!(M.ASSET[i.t] && M.ASSET[i.t].under)) blocks.push(pad(i, 0.12)); });
    f.texts.forEach(t => {
      const s = t.size || 0.7;
      const tw = textWidth(M.pick(t.i18n || t.text, lang), s);
      blocks.push({ x: t.x - tw / 2 - 0.15, y: t.y - s * 0.75, w: tw + 0.3, h: s * 1.5 });
    });
    // ドア・窓の前は空けておく。開き戸は開く側を扉の幅だけ、反対側と引き戸・窓は少しだけ
    f.openings.forEach(o => {
      const swingDoor = SWING.has(o.kind);
      const near = M.OPEN[o.kind] && M.OPEN[o.kind].group === 'door' ? 0.6 : 0.4;
      const plus = swingDoor && (o.side || 1) > 0 ? o.len + 0.1 : near;
      const minus = swingDoor && (o.side || 1) < 0 ? o.len + 0.1 : near;
      blocks.push(o.o === 'h' ? { x: o.x - 0.1, y: o.y - minus, w: o.len + 0.2, h: minus + plus } : { x: o.x - minus, y: o.y - 0.1, w: minus + plus, h: o.len + 0.2 });
    });
    f.walls.forEach(wl => blocks.push(pad({ x: Math.min(wl.x1, wl.x2), y: Math.min(wl.y1, wl.y2), w: Math.abs(wl.x2 - wl.x1), h: Math.abs(wl.y2 - wl.y1) }, 0.25)));
    f.rooms.forEach(r => { if (r !== room && M.rectContains(room, r)) blocks.push(pad(r, 0.2)); });
    // 部屋名（面積の表示があってもなくても重ならないように）
    const named = { ...room, name: M.pick(room.name, lang) };
    if (measureCtx && M.labelMetrics) {
      ['none', 'm2'].forEach(showSize => {
        const label = M.labelMetrics(measureCtx, named, { lang, showSize }, M.THEMES.clean);
        if (label) blocks.push(pad(label.box, 0.2));
      });
    }
    const target = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
    let best = null;
    for (let y = room.y + inset; y + h <= room.y + room.h - inset + 1e-6; y += step) {
      for (let x = room.x + inset; x + w <= room.x + room.w - inset + 1e-6; x += step) {
        const r = { x, y, w, h };
        if (blocks.some(b => overlaps(r, b))) continue;
        const d = Math.hypot(x + w / 2 - target.x, y + h / 2 - target.y);
        if (!best || d < best.d) best = { x, y, d };
      }
    }
    return best;
  }

  function addClues(floors, id, lang) {
    (CLUES[id] || []).forEach(clue => {
      const f = floors.find(fl => M.pick(fl.name, 'ja') === clue.floor);
      const room = f && f.rooms.find(r => M.pick(r.name, 'ja') === clue.room);
      const a = M.ASSET[clue.t];
      if (!room || !a) return;
      const gap = 0.1;
      // 1行 → 2行に折り返し → 文字を小さく、の順で入る形を探す。どれも入らなければ、小物だけが入る場所に置く
      const one = M.pick(clue.text, lang), two = wrapText(one);
      const tries = [[one, 0.42], [two, 0.42], [one, 0.34], [two, 0.34]];
      let placed = null;
      for (const [text, size] of tries) {
        const lines = text.split('\n');
        const tw = Math.max(...lines.map(l => textWidth(l, size))) + 0.2;
        const bw = Math.max(a.w, tw), bh = a.h + gap + size * 1.25 * lines.length;
        const spot = findSpot(f, room, bw, bh, lang);
        if (spot) { placed = { spot, ox: (bw - a.w) / 2, text, size, lines: lines.length }; break; }
      }
      if (!placed) {
        const spot = findSpot(f, room, a.w, a.h, lang) || { x: room.x + room.w / 2 - a.w / 2, y: room.y + 0.4 };
        placed = { spot, ox: 0, text: two, size: 0.34, lines: two.split('\n').length };
      }
      const r2 = v => Math.round(v * 100) / 100;
      const ix = r2(placed.spot.x + placed.ox), iy = r2(placed.spot.y);
      f.items.push({ t: clue.t, x: ix, y: iy, w: a.w, h: a.h, rot: 0, clue: true });
      f.texts.push({ text: placed.text, x: r2(ix + a.w / 2), y: r2(iy + a.h + gap + (placed.size * 1.25 * placed.lines) / 2), size: placed.size, bold: false, clue: true });
    });
  }

  /* テンプレートを現在の言語でプロジェクト用のフロアに変換する */
  function instantiate(id, lang, options = {}) {
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return null;
    const floors = tpl.build();
    if (options.structureOnly) floors.forEach(f => { f.items = []; f.texts = []; });
    if (options.clues) addClues(floors, id, lang);
    return floors.map(f => ({
      id: M.uid('f'),
      name: M.pick(f.name, lang),
      rooms: f.rooms.map(r => ({ ...r, id: M.uid('r'), name: M.pick(r.name, lang), plName: M.pick(r.plName, lang), note: M.pick(r.note, lang) })),
      walls: f.walls.map(w => ({ ...w, id: M.uid('w') })),
      openings: f.openings.map(o => ({ ...o, id: M.uid('o') })),
      items: f.items.filter(i => M.ASSET[i.t]).map(i => {
        const out = { ...i, id: M.uid('i') };
        if (out.label) out.label = M.pick(out.label, lang);
        return out;
      }),
      texts: f.texts.map(t => {
        const out = { ...t, id: M.uid('t'), text: t.i18n ? M.pick(t.i18n, lang) : M.pick(t.text, lang) };
        delete out.i18n;
        return out;
      })
    }));
  }

  global.IMM = global.IMM || {};
  /* テンプレートのタグ：手で付けたタグに、複数フロア・GM専用を自動で足す */
  TEMPLATES.forEach(tp => {
    const floors = tp.build();
    const auto = [];
    if (floors.length > 1) auto.push('multifloor');
    if (floors.some(f => f.rooms.some(r => r.gm) || f.items.some(i => i.gm) || f.openings.some(o => o.kind === 'secret'))) auto.push('gm');
    tp.tags = Array.from(new Set([...(tp.tags || []), ...auto]));
    tp.floorCount = floors.length;
  });

  Object.assign(global.IMM, { TEMPLATES, TEMPLATE_GROUPS, TEMPLATE_CLUES: CLUES, instantiateTemplate: instantiate });
})(window);
