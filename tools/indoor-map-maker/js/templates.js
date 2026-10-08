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
    return [g.f, u.f];
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
    return [towerLobby(), towerTypical()];
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
    return [g.f, u.f];
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
    { id: 'apartment', build: apartment, group: 'home',
      name: T('アパート（2階建て）', 'Apartment building', '아파트(2층 연립)'),
      desc: T('1K × 8戸の木造アパート。外廊下と鉄骨階段、1Fに駐車場とゴミ置場', 'Eight 1K units on two floors with an open-air walkway, outdoor stairs, parking and a garbage area.', '1K × 8세대 목조 연립. 외부 복도와 철골 계단, 1층 주차장과 쓰레기장') },
    { id: 'tower', build: tower, group: 'home',
      name: T('タワーマンション', 'High-rise condo', '타워 맨션'),
      desc: T('1Fはエントランス・コンシェルジュ・ラウンジ・ジムなどの共用部、基準階は内廊下を囲む8戸と中央のコア', 'Lobby floor with concierge, lounge, gym and party room; typical floor with eight units around an inner corridor and central core.', '1층은 엔트런스·컨시어지·라운지·짐 등 공용부, 기준층은 내복도를 둘러싼 8세대와 중앙 코어') },
    { id: 'hotel', build: hotel, group: 'facility',
      name: T('ホテル（5フロア）', 'Hotel (5 floors)', '호텔(5개 층)'),
      desc: T('1F ロビー・レストラン、2F 宴会場・チャペル、3F ジム・屋内プール・スパ、7F 客室階（14室）、8F スイートとスカイラウンジ', '1F lobby and restaurant, 2F ballroom and chapel, 3F gym, indoor pool and spa, 7F guest floor (14 rooms), 8F suite and sky lounge.', '1층 로비·레스토랑, 2층 연회장·채플, 3층 짐·실내 수영장·스파, 7층 객실층(14실), 8층 스위트와 스카이 라운지') },
    { id: 'hospital', build: hospital, group: 'facility',
      name: T('病院（外来・病棟）', 'Hospital (outpatient & ward)', '병원(외래·병동)'),
      desc: T('1Fは診察室・待合・薬局・霊安室、2Fは4床室と個室が並ぶ病棟とナースステーション', 'Outpatient floor with exam rooms, waiting hall, pharmacy and morgue; ward floor with 4-bed and private rooms around a nurse station.', '1층 진찰실·대기실·약국·영안실, 2층 4인실·1인실 병동과 간호사실') },
    { id: 'school', build: school, group: 'public',
      name: T('学校（校舎2階建て）', 'School building', '학교(2층 교사)'),
      desc: T('北側廊下・南側教室の片廊下型。1Fに昇降口・職員室・校長室・保健室、2Fに教室・音楽室・理科室', 'Single-loaded corridor with classrooms facing south. Shoe lockers, staff room, principal and nurse on 1F; classrooms, music room and science lab on 2F.', '북쪽 복도·남쪽 교실의 편복도형. 1층 신발장·교무실·교장실·보건실, 2층 교실·음악실·과학실') },
    { id: 'police', build: police, group: 'public',
      name: T('警察署', 'Police station', '경찰서'),
      desc: T('1Fは交通課・会計課の窓口とロビー、地域課・当直室・車庫。2Fは捜査本部・刑事課・取調室（マジックミラー付き）・留置場', 'Service counters, lobby, patrol room, night duty room and garage on 1F; task force room, detectives, interrogation rooms with a one-way mirror and holding cells on 2F.', '1층 교통과·회계과 창구와 로비, 지역과·당직실·차고. 2층 수사본부·형사과·취조실(매직미러)·유치장') },
    { id: 'library', build: library, group: 'public',
      name: T('図書館（B1・1F）', 'Library (B1–1F)', '도서관(B1~1F)'),
      desc: T('1Fはカウンター・開架・閲覧席・児童コーナー・郷土資料室、B1は閉架書庫と貴重書庫。GM用の禁書庫つき', 'Counter, open stacks, reading area, children\'s corner and local history room on 1F; closed stacks and a rare book vault below, plus a GM-only forbidden archive.', '1층 카운터·개가·열람석·어린이 코너·향토 자료실, B1 폐가 서고와 귀중서고. GM 전용 금서고 포함') },
    { id: 'university', build: university, group: 'public',
      name: T('大学（講義棟・研究棟）', 'University building', '대학(강의동·연구동)'),
      desc: T('1Fは固定席の大講義室・講義室・学生ラウンジ・教務課、2Fは教授の研究室・実験室・ゼミ室・院生室', 'Tiered lecture hall, classrooms, student lounge and academic office on 1F; faculty offices, lab, seminar room and grad room on 2F.', '1층 고정석 대강의실·강의실·학생 라운지·교무과, 2층 교수 연구실·실험실·세미나실·대학원생실') },
    { id: 'bar', build: bar, group: 'leisure',
      name: T('バー（地下1階）', 'Basement bar', '바(지하 1층)'),
      desc: T('階段を降りた地下のバー。カウンターとバックバー、ボックス席、ビリヤード台、厨房・倉庫・事務所と施錠された VIP ルーム', 'Down a flight of stairs: counter and back bar, booths, pool table, kitchen, storeroom, office and a locked VIP room.', '계단을 내려간 지하 바. 카운터와 백바, 박스석, 당구대, 주방·창고·사무실과 잠긴 VIP룸') },
    { id: 'livehouse', build: liveHouse, group: 'leisure',
      name: T('ライブハウス（地下1階）', 'Live music club', '라이브 하우스(지하 1층)'),
      desc: T('受付とロッカー、ステージとスタンディングのホール、PA卓・ドリンクカウンター。楽屋2室・機材倉庫・事務所', 'Reception and lockers, a standing floor facing the stage, PA booth and drink counter; two green rooms, gear storage and an office.', '접수와 로커, 스테이지와 스탠딩 홀, PA 부스·드링크 카운터. 대기실 2개·장비 창고·사무실') },
    { id: 'theatre', build: theatre, group: 'leisure',
      name: T('劇場・コンサートホール', 'Theatre / concert hall', '극장·콘서트홀'),
      desc: T('舞台と上手・下手の袖、約420席の客席、ホワイエ。楽屋3室と楽屋口、大道具倉庫、客席を見下ろす調整室', 'Stage with wings, about 420 seats, foyer with box office; three dressing rooms, stage door, scene dock and a control booth overlooking the house.', '무대와 좌우 무대 옆, 약 420석 객석, 포이어. 분장실 3개와 무대 출입구, 대도구 창고, 객석을 내려다보는 조정실') },
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
      desc: T('1LDKに人型の輪郭・血痕・証拠マーカー。GM用の隠し金庫とメモつき', '1LDK with a body outline, bloodstain and evidence markers, plus a GM-only safe and note.', '1LDK에 사람 윤곽·핏자국·증거 마커. GM 전용 금고와 메모 포함') },
    { id: 'speakeasy', build: speakeasy, group: '1920s',
      name: T('もぐり酒場（禁酒法時代）', 'Speakeasy (Prohibition era)', '무허가 술집(금주법 시대)'),
      desc: T('表は理髪店。奥の部屋の「合言葉の扉」の先にバーカウンター・ボックス席・バンドの舞台。事務所・酒蔵・裏路地への隠し扉', 'A barbershop out front; past the password door in the back room, a bar, booths and a band stage. Boss\'s office, liquor store and a hidden exit to the alley.', '겉은 이발소. 안쪽 방의 "암호의 문" 너머에 바 카운터·박스석·밴드 무대. 사무실·술 창고·뒷골목으로 가는 비밀문') },
    { id: 'detective', build: detectiveOffice, group: '1920s',
      name: T('探偵事務所のある雑居ビル', 'Detective agency building', '탐정 사무소가 있는 건물'),
      desc: T('1Fはダイナーと質屋、2Fは待合室・所長室・暗室・資料室の探偵事務所と、探偵の住まい。階段は上下でそろう', 'Diner and pawnshop on 1F; on 2F the agency (waiting room, office, darkroom, records) and the detective\'s flat. Stairs align between floors.', '1층 다이너와 전당포, 2층 탐정 사무소(대기실·소장실·암실·자료실)와 탐정의 집. 계단 위치가 위아래로 일치') },
    { id: 'spaceship', build: spaceship, group: 'sf',
      name: T('調査船（宇宙船）', 'Survey starship', '조사선(우주선)'),
      desc: T('船尾に動力炉の機関室、船首にブリッジ。中央通路の両側に乗員室・艦長室・研究室・医務室・冷凍睡眠室・食堂、貨物室とエアロック', 'Engine room with the reactor aft, bridge forward. Crew cabins, captain\'s cabin, lab, medbay, cryo bay and mess along the central corridor; cargo bay and airlock.', '선미에 동력로 기관실, 선수에 브리지. 중앙 통로 양쪽에 승무원실·함장실·연구실·의무실·냉동 수면실·식당, 화물실과 에어록') },
    { id: 'station', build: researchStation, group: 'sf',
      name: T('月面研究基地', 'Lunar research base', '달 연구 기지'),
      desc: T('中央ハブから4本の通路で居住区・研究室・通信と発電・ローバー車庫とエアロックへ。研究室の奥にGM用の封鎖ラボ', 'A central hub with four tubes to quarters, labs, comms and power, and the rover garage with airlock. A GM-only sealed lab behind the labs.', '중앙 허브에서 4개의 통로로 거주구·연구실·통신과 발전·로버 차고와 에어록. 연구실 안쪽에 GM 전용 봉쇄 실험실') },
    { id: 'kominka', build: farmhouse, group: 'village',
      name: T('古民家（農家）', 'Japanese farmhouse', '일본 고민가(농가)'),
      desc: T('土間とかまど、囲炉裏の間・台所・座敷・仏間の田の字型の母屋と縁側。庭に井戸・蔵・納屋・厠、裏に畑と田んぼ。蔵の奥にGM用の座敷牢', 'Earthen-floor doma with a kamado, four-room tatami layout with an irori hearth and engawa. Well, storehouse, barn and outhouse in the yard, fields behind; a GM-only hidden cell in the storehouse.', '흙바닥 도마와 아궁이, 이로리 방·부엌·객실·불간의 다(田)자형 안채와 툇마루. 마당에 우물·곳간·헛간·뒷간, 밭과 논. 곳간 안쪽에 GM 전용 감옥') },
    { id: 'shrine', build: shrine, group: 'village',
      name: T('山あいの神社', 'Mountain shrine', '산골 신사'),
      desc: T('鳥居から参道、狛犬・灯籠・手水舎を抜けて拝殿・幣殿・本殿へ。神楽殿・宝物殿・社務所と、柵の奥にGM用の禁足地', 'From the torii up the approach past komainu, lanterns and the fountain to the worship hall and sanctuary. Kagura stage, treasure house, shrine office, and a GM-only forbidden grove.', '도리이에서 참배길, 고마이누·석등·데미즈야를 지나 배전·폐전·본전으로. 가구라전·보물전·사무소와 울타리 안쪽의 GM 전용 금족지') },
    { id: 'cave', build: cave, group: 'nature',
      name: T('洞窟', 'Cave', '동굴'),
      desc: T('森の入口から細い通路を抜けて大空洞へ。地底湖のほとり、祭壇の間、獣の巣、下へ続く縦穴', 'From the forest mouth through a narrow passage to the great cavern; an underground lake, an altar chamber, a beast den and a shaft leading down.', '숲의 입구에서 좁은 통로를 지나 대공동으로. 지하 호숫가, 제단의 방, 짐승 굴, 아래로 이어진 수직굴') },
    { id: 'campsite', build: campsite, group: 'nature',
      name: T('川沿いのキャンプ場', 'Riverside campsite', '강변 캠핑장'),
      desc: T('川と河原、テントサイト、キャンプファイヤー場、バンガロー3棟、炊事場、管理棟と駐車場。崖にはGM用の古い防空壕', 'River and bank, tent sites, campfire circle, three cabins, cooking shelter, office and parking. A GM-only old air-raid shelter in the cliff.', '강과 강가, 텐트 사이트, 캠프파이어장, 방갈로 3동, 취사장, 관리동과 주차장. 절벽에 GM 전용 오래된 방공호') }
  ];

  const TEMPLATE_GROUPS = [
    { id: 'home', name: T('住宅', 'Homes', '주택') },
    { id: 'facility', name: T('宿泊・医療', 'Hotels & hospitals', '숙박·의료') },
    { id: 'public', name: T('公共・学校', 'Public & schools', '공공·학교') },
    { id: 'leisure', name: T('娯楽施設', 'Entertainment', '오락 시설') },
    { id: 'horror', name: T('廃墟・事件', 'Ruins & crime', '폐허·사건') },
    { id: '1920s', name: T('1920年代', '1920s', '1920년대') },
    { id: 'sf', name: T('SF', 'Sci-fi', 'SF') },
    { id: 'village', name: T('村・和風', 'Village', '마을·일본풍') },
    { id: 'nature', name: T('自然・野外', 'Nature', '자연·야외') }
  ];

  /* ---------- 隠し手がかり（「隠し手がかり入りで読み込む」で足す） ----------
   * [階, 部屋名(日本語), 小物, 説明]。置き場所は部屋の中の空いているところを自動で探す。
   * 手がかりは clue: true になり、「隠し手がかり ON/OFF」で GM/PL表示とは別に隠せる。 */
  const C = (floor, room, t, text) => ({ floor, room, t, text });
  const SWING = new Set(['door', 'door2', 'locked', 'secret', 'broken']);
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
      C('2F', '寝室2', 'key', T('箱に隠された鍵', 'Key hidden in a box', '상자에 숨긴 열쇠'))
    ],
    mansion: [
      C('B1', 'ワインセラー', 'clue', T('1本だけ埃のない瓶', 'One bottle free of dust', '먼지 없는 병 하나')),
      C('B1', 'ボイラー室', 'memo', T('燃え残った手紙', 'Half-burned letter', '타다 남은 편지')),
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
    ]
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
      items: f.items.filter(i => M.ASSET[i.t]).map(i => ({ ...i, id: M.uid('i') })),
      texts: f.texts.map(t => {
        const out = { ...t, id: M.uid('t'), text: t.i18n ? M.pick(t.i18n, lang) : M.pick(t.text, lang) };
        delete out.i18n;
        return out;
      })
    }));
  }

  global.IMM = global.IMM || {};
  Object.assign(global.IMM, { TEMPLATES, TEMPLATE_GROUPS, TEMPLATE_CLUES: CLUES, instantiateTemplate: instantiate });
})(window);
