/* TRPG室内図メーカー — テンプレート（実在の間取りの定石に沿って手作りした見取り図）
 * 1マス = 0.5m。部屋・ドア・窓・家具の位置はすべてマス単位。
 * 参考にした定石:
 *  - 1LDK/2LDK: 北側に共用廊下と玄関、水回りは中央にまとめ、LDKは南のバルコニー側（中廊下型・田の字型）
 *  - 一戸建て: 1Fに玄関ホール＋階段・LDK・水回り、2Fに寝室。階段の位置は上下階でそろえる
 *  - 洋館: 左右対称。中央に玄関ホールと大階段、奥に大広間、両翼に書斎・食堂・厨房、地下にワインセラー
 *  - ホテル: 中廊下の両側に同じ客室を並べ、中央にEV・階段のコア。客室は入口脇に浴室、奥に窓とベッド
 *  - 病院: 病棟は中廊下の両側に4床室・個室、中央にナースステーションとEV、端に非常階段
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
      .dv(6, 7.75, 1.5, -1, 0)                  // 洗面室
      .dv(3, 7.75, 1.5, -1, 1, 'folding')       // 浴室
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
      .item('bathtub', 0, 7.2, 90)
      .item('washbasin', 3, 7, 270).item('washer', 3.1, 8.7, 180)
      .item('toilet', 9.5, 8.4, 180)
      .item('cabinet', 11.2, 9, 180, { size: [3.5, 1] })
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
      .wh(2, 17, 3).wh(7, 17, 3).wh(19, 17, 3).wh(24, 17, 3)
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
    return [g.f, u.f];
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
      .room(T('リネン室', 'Linen room', '린넨실'), 'storage', 34, 5, 6, 4)
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
      .dh(36, 9, 1.5, -1, 0)                   // リネン
      .dh(36, 5, 1.5, -1, 0)                   // 浴室（リネン室経由ではなく廊下から → 下の扉）
      .dh(6, 12, 1.5, 1, 0).dh(11, 12, 1.5, 1, 0).dv(14, 19, 1.5, -1, 1)
      .dh(27, 12, 1.5, 1, 0).dv(26, 19, 1.5, 1, 1).dv(30, 14, 1.5, 1, 0)
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
      .room(N.storeroom, 'storage', 34, 6, 6, 6)
      .room(T('ボイラー室', 'Boiler room', '보일러실'), 'garage', 26, 10, 8, 6)
      .room(T('隠し部屋', 'Hidden room', '비밀의 방'), 'special', 18, 2, 8, 8, { gm: true, plName: '', note: T('ワインセラーの棚の裏に隠し扉', 'Secret door behind the wine rack', '와인 선반 뒤에 비밀문') });
    bm.dv(34, 3, 1.5, -1, 1)
      .dh(36, 6, 1.5, 1, 0)
      .dh(29, 10, 1.5, 1, 0)
      .dv(26, 5, 1.5, -1, 0, 'secret');
    bm.item('stairs', 35, 0, 90)
      .item('bookshelf', 26.2, 0, 0, { size: [7.5, 0.9] }).item('bookshelf', 26.2, 4, 0, { size: [6, 0.9] }).item('bookshelf', 26.2, 6.6, 0, { size: [6, 0.9] })
      .item('barrel', 32.4, 8.4).item('barrel', 31, 8.6).item('table', 27, 8.5, 0, { size: [2.4, 1.2] })
      .item('crate', 34.3, 10.2).item('crate', 36, 10.2).item('crate', 38.2, 8.6)
      .item('rack', 26.3, 13.8, 90, { size: [1.4, 2] }).item('tank', 30.5, 12.5)
      .item('magic_circle', 19.5, 3.5, 0, { gm: true }).item('altar', 20.5, 2, 0, { gm: true }).item('candle', 18.3, 2.3, 0, { gm: true }).item('candle', 25, 2.3, 0, { gm: true })
      .item('bookshelf', 18, 9.1, 180, { size: [4, 0.9], gm: true }).item('safe', 24.6, 8.6, 0, { gm: true });
    return [bm.f, g.f, u.f];
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
    it('toilet', 0.2, 8, 0);
    it('washbasin', 1.35, 8, 0);
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
      .room(T('車寄せ', 'Porte-cochère', '차량 승하차장'), 'porch', 23, 27, 10, 4);
    lobby.dh(26.5, 27, 3, 1, 0, 'auto')        // 正面入口
      .dv(14, 17, 4, 1, 0, 'door2')            // レストラン
      .dh(9, 8, 1.5, 1, 0)                     // 厨房 ↔ レストラン
      .dh(3, 0, 1.5, -1, 0)                    // 厨房の搬入口
      .dh(18, 12, 1.5, -1, 0)                  // 事務室
      .dh(22, 12, 7, 1, 0, 'open')             // EVホール
      .dh(31, 12, 1.5, -1, 0)                  // 階段
      .dh(37.5, 12, 1.5, -1, 0)                // 化粧室
      .dh(47, 12, 3, -1, 0, 'door2')           // 会議室
      .dv(42, 15, 9, 1, 0, 'open')             // ラウンジ
      .wv(0, 10, 3, 'window2').wv(0, 15, 3, 'window2').wv(0, 20, 3, 'window2')
      .wh(2, 27, 4, 'window2').wh(8, 27, 4, 'window2')
      .wh(16, 27, 5, 'window2').wh(35, 27, 5, 'window2')
      .wh(44, 27, 4, 'window2').wh(50, 27, 4, 'window2').wv(56, 15, 4, 'window2').wv(56, 21, 4, 'window2')
      .wh(45, 0, 3).wh(51, 0, 3).wh(16, 0, 2);
    lobby.item('kitchen', 1, 0).item('stove', 6.5, 0, 0, { size: [3, 1.3] }).item('fridge', 12.6, 0).item('fridge', 11, 0)
      .item('island', 3, 3.6, 0, { size: [6, 2] }).item('counter', 10, 6.8, 180)
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
      .item('piano', 44, 21.8, 90).item('plant', 54.4, 25.2);

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
    return [lobby.f, floor.f];
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
      .room(T('風除室', 'Vestibule', '방풍실'), 'porch', 24, 29, 8, 3);
    g.dh(19, 12, 3, -1, 0, 'sliding2')
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
    g.item('exam_bed', 18.4, 0.3).item('exam_bed', 21.8, 0.3).item('med_cabinet', 18, 10.9, 180, { size: [3, 1] }).item('iv_stand', 20.6, 4.6)
      .item('elevator', 24.5, 0, 0, { size: [3.4, 4] }).item('elevator', 28.1, 0, 0, { size: [3.4, 4] })
      .item('stairs_u', 32, 0.5)
      .item('lab_bench', 37, 0).item('lab_bench', 39.5, 5, 90, { size: [4, 1.6] }).item('filing', 42.8, 9.5)
      .item('exam_bed', 47.4, 3, 0, { size: [1.4, 3.6] }).item('rack', 44.2, 0.3, 0, { size: [1.4, 2] })
      .item('locker', 52, 0, 0, { size: [6, 1] }).item('bench', 53, 5.5, 0, { size: [4, 1] })
      .item('bench', 1, 12.2, 0, { size: [5, 1] }).item('bench', 7, 12.2, 0, { size: [5, 1] }).item('bench', 13, 12.2, 0, { size: [4, 1] })
      .item('counter', 0.5, 17.2, 0, { size: [7, 1.2] }).item('med_cabinet', 0, 27.9, 180, { size: [4, 1] }).item('med_cabinet', 4, 27.9, 180, { size: [4, 1] }).item('office_desk', 2.8, 22.5)
      .item('reception', 8.5, 17.2, 0, { size: [7, 1.4] }).item('office_desk', 9, 21.6).item('office_desk', 12.5, 21.6).item('filing', 15, 27.8, 180).item('copier', 8.1, 27.6)
      .item('bench', 18, 21, 0, { size: [6, 1] }).item('bench', 18, 24, 0, { size: [6, 1] }).item('bench', 32, 21, 0, { size: [6, 1] }).item('bench', 32, 24, 0, { size: [6, 1] })
      .item('plant', 16.3, 27.6).item('plant', 38.5, 27.6).item('vending', 25, 17.8, 0, { size: [2, 1.4] })
      .item('toilet', 40.5, 26.4, 180).item('toilet', 42, 26.4, 180).item('toilet', 43.5, 26.4, 180).item('washbasin', 44.9, 20, 90).item('washbasin', 44.9, 22, 90)
      .item('cabinet', 46, 27.9, 180, { size: [6, 1] }).item('counter', 50.8, 20, 90, { size: [4, 1.2] })
      .item('morgue', 52, 26.6, 180, { size: [4.4, 2.4] }).item('exam_bed', 54.2, 20.5, 0, { size: [1.4, 3.6] }).item('candle', 52.4, 21.4);
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
      .room(T('非常階段', 'Fire stairs', '비상계단'), 'hall', 52, 17, 6, 12);
    w.dh(25, 12, 6, 1, 0, 'open').dh(33, 12, 1.5, -1, 0)
      .dh(1, 17, 8, 1, 0, 'open')
      .dh(23, 17, 8, 1, 0, 'open')
      .dh(26, 25, 1.5, 1, 0)
      .dh(34, 17, 2, 1, 0, 'sliding').dh(39.25, 17, 1.5, 1, 0).dh(43.25, 17, 1.5, 1, 0).dh(48, 17, 2, 1, 0, 'sliding')
      .dh(54.25, 17, 1.5, 1, 0)
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
      .item('stairs_u', 52.5, 22, 180);
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
      .dv(24, 3, 1.5, 1, 0, 'broken')
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
      .room(N.toilet, 'wet', 24, 6, 8, 6)
      .room(N.storeroom, 'storage', 24, 12, 8, 8);
    u.dh(17.5, 6, 2, 1, 0, 'open')
      .dh(21.25, 6, 2.5, 1, 0, 'sliding2')
      .dv(16, 8, 1.5, -1, 0, 'broken')
      .dv(16, 15, 1.5, -1, 1, 'locked')
      .dv(9, 15.5, 1.5, -1, 0)
      .dh(3, 12, 1.5, 1, 0, 'broken')
      .dv(24, 2, 1.5, 1, 0).dv(24, 8, 1.5, 1, 0).dv(24, 15, 1.5, 1, 0)
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
    return [g.f, u.f];
  }

  const TEMPLATES = [
    { id: '1ldk', build: oneLDK, group: 'home',
      name: T('1LDK アパート', '1LDK apartment', '1LDK 아파트'),
      desc: T('約44㎡。玄関脇に水回り、LDKと個室がバルコニーに面する定番の間取り', 'About 44 m². Wet rooms by the entrance; LDK and bedroom face the balcony.', '약 44㎡. 현관 옆 욕실, LDK와 방이 발코니를 향하는 정석 구조') },
    { id: '2ldk', build: twoLDK, group: 'home',
      name: T('2LDK マンション', '2LDK condo', '2LDK 맨션'),
      desc: T('約64㎡の中廊下型。北に洋室2つ、中央に水回り、南に広いLDK', 'About 64 m², center-corridor type: two bedrooms north, wet core in the middle, LDK south.', '약 64㎡ 중복도형. 북쪽 방 2개, 가운데 욕실, 남쪽 LDK') },
    { id: 'house', build: house, group: 'home',
      name: T('一戸建て（2階建て）', 'Two-story house', '단독주택(2층)'),
      desc: T('1Fに玄関ホールと階段・LDK・水回り、2Fに寝室4つ。階段は上下で同じ位置', 'Entry hall, stairs, living and kitchen downstairs; four bedrooms upstairs. Stairs align between floors.', '1층 현관 홀·계단·거실·주방, 2층 침실 4개. 계단 위치가 위아래로 일치') },
    { id: 'mansion', build: mansion, group: 'home',
      name: T('洋館（地下1階・2階建て）', 'Mansion (B1–2F)', '저택(지하1층~2층)'),
      desc: T('左右対称。大階段の玄関ホール、大広間、書斎・図書室・食堂・厨房、地下にワインセラーと隠し部屋', 'Symmetrical plan: grand-stair hall, great hall, study, library, dining, kitchen; wine cellar and a hidden room below.', '좌우 대칭. 대계단 현관 홀, 대연회장, 서재·도서실·식당, 지하 와인 저장고와 비밀의 방') },
    { id: 'hotel', build: hotel, group: 'facility',
      name: T('ホテル（ロビー階・客室階）', 'Hotel (lobby & guest floor)', '호텔(로비층·객실층)'),
      desc: T('客室階は中廊下の両側に14室、中央にEVと階段。ロビー階はフロント・レストラン・ラウンジ', 'Guest floor with 14 rooms on a central corridor around an elevator core; lobby floor with front desk, restaurant and lounge.', '객실층은 중복도 양쪽 14실과 중앙 EV·계단. 로비층은 프런트·레스토랑·라운지') },
    { id: 'hospital', build: hospital, group: 'facility',
      name: T('病院（外来・病棟）', 'Hospital (outpatient & ward)', '병원(외래·병동)'),
      desc: T('1Fは診察室・待合・薬局・霊安室、2Fは4床室と個室が並ぶ病棟とナースステーション', 'Outpatient floor with exam rooms, waiting hall, pharmacy and morgue; ward floor with 4-bed and private rooms around a nurse station.', '1층 진찰실·대기실·약국·영안실, 2층 4인실·1인실 병동과 간호사실') },
    { id: 'haibyoin', build: abandonedHospital, group: 'horror',
      name: T('廃病院（B1〜2F）', 'Abandoned hospital (B1–2F)', '폐병원(B1~2F)'),
      desc: T('病院を廃墟化。割れた窓・壊れた扉・瓦礫、地下に解剖室・霊安室・封鎖区画', 'The hospital in ruins: broken windows and doors, debris; autopsy room, morgue and a sealed lab below.', '폐허가 된 병원. 깨진 창·부서진 문·잔해, 지하에 해부실·영안실·봉쇄 구역') },
    { id: 'haioku', build: abandonedHouse, group: 'horror',
      name: T('廃屋（2階建て）', 'Abandoned house', '폐가(2층)'),
      desc: T('一戸建てが荒れ果てた状態。崩れた壁、板でふさいだ窓、残された家具', 'The two-story house after years of neglect: crumbling walls, boarded windows, leftover furniture.', '황폐해진 단독주택. 무너진 벽, 판자로 막은 창, 남겨진 가구') },
    { id: 'haibiru', build: abandonedBuilding, group: 'horror',
      name: T('廃ビル（雑居ビル）', 'Abandoned building', '폐건물(상가 건물)'),
      desc: T('1Fは店舗跡と管理人室、2Fは事務所跡と社長室。閉ざされたシャッターと止まったEV', 'Vacant shop and janitor room on 1F; abandoned office and president\'s office on 2F; shutters down, elevator dead.', '1층 빈 점포와 관리인실, 2층 사무실 터와 사장실. 닫힌 셔터와 멈춘 EV') },
    { id: 'crime', build: crimeScene, group: 'horror',
      name: T('事件現場（1LDK）', 'Crime scene (1LDK)', '사건 현장(1LDK)'),
      desc: T('1LDKに人型の輪郭・血痕・証拠マーカー。GM用の隠し金庫とメモつき', '1LDK with a body outline, bloodstain and evidence markers, plus a GM-only safe and note.', '1LDK에 사람 윤곽·핏자국·증거 마커. GM 전용 금고와 메모 포함') }
  ];

  const TEMPLATE_GROUPS = [
    { id: 'home', name: T('住宅', 'Homes', '주택') },
    { id: 'facility', name: T('施設', 'Facilities', '시설') },
    { id: 'horror', name: T('廃墟・事件', 'Ruins & crime', '폐허·사건') }
  ];

  /* テンプレートを現在の言語でプロジェクト用のフロアに変換する */
  function instantiate(id, lang, options = {}) {
    const tpl = TEMPLATES.find(t => t.id === id);
    if (!tpl) return null;
    const floors = tpl.build();
    return floors.map(f => ({
      id: M.uid('f'),
      name: M.pick(f.name, lang),
      rooms: f.rooms.map(r => ({ ...r, id: M.uid('r'), name: M.pick(r.name, lang), plName: M.pick(r.plName, lang), note: M.pick(r.note, lang) })),
      walls: f.walls.map(w => ({ ...w, id: M.uid('w') })),
      openings: f.openings.map(o => ({ ...o, id: M.uid('o') })),
      items: options.structureOnly ? [] : f.items.filter(i => M.ASSET[i.t]).map(i => ({ ...i, id: M.uid('i') })),
      texts: options.structureOnly ? [] : f.texts.map(t => {
        const out = { ...t, id: M.uid('t'), text: t.i18n ? M.pick(t.i18n, lang) : M.pick(t.text, lang) };
        delete out.i18n;
        return out;
      })
    }));
  }

  global.IMM = global.IMM || {};
  Object.assign(global.IMM, { TEMPLATES, TEMPLATE_GROUPS, instantiateTemplate: instantiate });
})(window);
