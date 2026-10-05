/*
 * 文字画像APNGメーカー — フォント管理
 *  - Google Fonts（選択時にだけCSSを読み込み、使う文字のサブセットだけを取得）
 *  - フォントファイルの登録（TTF / OTF / WOFF / WOFF2）。ファイルはこのブラウザの IndexedDB に保存し、次回も使える
 *  - PCにインストール済みのフォント名を指定（名前だけを覚える）
 *  - 日本語フォントに無い文字（ハングル・簡体字）は、近い雰囲気のフォントで自動的に表示する
 */
(function (root) {
  'use strict';

  const CATEGORIES = [
    { id: 'gothic', label: { ja: 'ゴシック', en: 'Gothic / Sans', ko: '고딕', zh: '黑体' } },
    { id: 'mincho', label: { ja: '明朝', en: 'Mincho / Serif', ko: '명조', zh: '明朝体' } },
    { id: 'round', label: { ja: '丸ゴ・ポップ', en: 'Rounded / Pop', ko: '둥근 고딕·팝', zh: '圆体·波普' } },
    { id: 'display', label: { ja: 'デザイン', en: 'Display', ko: '디자인', zh: '设计字体' } },
    { id: 'brush', label: { ja: '筆・手書き', en: 'Brush / Handwritten', ko: '붓·손글씨', zh: '毛笔·手写' } },
    { id: 'korean', label: { ja: '韓国語（ハングル）', en: 'Korean (Hangul)', ko: '한글', zh: '韩文' } },
    { id: 'chinese', label: { ja: '中国語（簡体字）', en: 'Chinese (Simplified)', ko: '중국어 (간체)', zh: '中文（简体）' } },
    { id: 'latin', label: { ja: '欧文', en: 'Latin', ko: '영문', zh: '西文' } },
    { id: 'user', label: { ja: 'マイフォント', en: 'My Fonts', ko: '마이 폰트', zh: '我的字体' } }
  ];

  // jp: 欧文フォントで日本語を表示するときの代替フォント
  // ハングル・簡体字は日本語フォントに無いため、代替フォントを KO_BY_* / ZH_BY_* で分類・フォントごとに決める
  const CATALOG = [
    { id: 'noto-sans-jp', family: 'Noto Sans JP', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'zen-kaku-gothic-new', family: 'Zen Kaku Gothic New', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'zen-kaku-gothic-antique', family: 'Zen Kaku Gothic Antique', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'm-plus-1p', family: 'M PLUS 1p', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'murecho', family: 'Murecho', weights: [400, 700, 900], cat: 'gothic', generic: 'sans-serif' },
    { id: 'biz-udpgothic', family: 'BIZ UDPGothic', weights: [400, 700], cat: 'gothic', generic: 'sans-serif' },
    { id: 'sawarabi-gothic', family: 'Sawarabi Gothic', weights: [400], cat: 'gothic', generic: 'sans-serif' },

    { id: 'noto-serif-jp', family: 'Noto Serif JP', weights: [400, 700, 900], cat: 'mincho', generic: 'serif' },
    { id: 'shippori-mincho', family: 'Shippori Mincho', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'shippori-mincho-b1', family: 'Shippori Mincho B1', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'zen-old-mincho', family: 'Zen Old Mincho', weights: [400, 700, 900], cat: 'mincho', generic: 'serif' },
    { id: 'kaisei-tokumin', family: 'Kaisei Tokumin', weights: [400, 700, 800], cat: 'mincho', generic: 'serif' },
    { id: 'kaisei-opti', family: 'Kaisei Opti', weights: [400, 700], cat: 'mincho', generic: 'serif' },
    { id: 'hina-mincho', family: 'Hina Mincho', weights: [400], cat: 'mincho', generic: 'serif' },
    { id: 'biz-udpmincho', family: 'BIZ UDPMincho', weights: [400, 700], cat: 'mincho', generic: 'serif' },
    { id: 'sawarabi-mincho', family: 'Sawarabi Mincho', weights: [400], cat: 'mincho', generic: 'serif' },

    { id: 'm-plus-rounded-1c', family: 'M PLUS Rounded 1c', weights: [400, 700, 900], cat: 'round', generic: 'sans-serif' },
    { id: 'zen-maru-gothic', family: 'Zen Maru Gothic', weights: [400, 700, 900], cat: 'round', generic: 'sans-serif' },
    { id: 'kosugi-maru', family: 'Kosugi Maru', weights: [400], cat: 'round', generic: 'sans-serif' },
    { id: 'kiwi-maru', family: 'Kiwi Maru', weights: [400, 500], cat: 'round', generic: 'serif' },
    { id: 'mochiy-pop-one', family: 'Mochiy Pop One', weights: [400], cat: 'round', generic: 'sans-serif' },
    { id: 'hachi-maru-pop', family: 'Hachi Maru Pop', weights: [400], cat: 'round', generic: 'cursive' },
    { id: 'potta-one', family: 'Potta One', weights: [400], cat: 'round', generic: 'cursive' },

    { id: 'dela-gothic-one', family: 'Dela Gothic One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'rocknroll-one', family: 'RocknRoll One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'reggae-one', family: 'Reggae One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'rampart-one', family: 'Rampart One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'train-one', family: 'Train One', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'stick', family: 'Stick', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'dotgothic16', family: 'DotGothic16', weights: [400], cat: 'display', generic: 'monospace' },
    { id: 'kaisei-decol', family: 'Kaisei Decol', weights: [400, 700], cat: 'display', generic: 'serif' },
    { id: 'zen-antique', family: 'Zen Antique', weights: [400], cat: 'display', generic: 'serif' },
    { id: 'shippori-antique', family: 'Shippori Antique', weights: [400], cat: 'display', generic: 'sans-serif' },
    { id: 'new-tegomin', family: 'New Tegomin', weights: [400], cat: 'display', generic: 'serif' },
    { id: 'darumadrop-one', family: 'Darumadrop One', weights: [400], cat: 'display', generic: 'cursive', jp: 'mochiy-pop-one' },

    { id: 'yuji-syuku', family: 'Yuji Syuku', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'yuji-mai', family: 'Yuji Mai', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'yuji-boku', family: 'Yuji Boku', weights: [400], cat: 'brush', generic: 'serif' },
    { id: 'klee-one', family: 'Klee One', weights: [400, 600], cat: 'brush', generic: 'cursive' },
    { id: 'yomogi', family: 'Yomogi', weights: [400], cat: 'brush', generic: 'cursive' },
    { id: 'zen-kurenaido', family: 'Zen Kurenaido', weights: [400], cat: 'brush', generic: 'cursive' },
    { id: 'yusei-magic', family: 'Yusei Magic', weights: [400], cat: 'brush', generic: 'cursive' },

    { id: 'noto-sans-kr', family: 'Noto Sans KR', weights: [400, 700, 900], cat: 'korean', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'gothic-a1', family: 'Gothic A1', weights: [400, 700, 900], cat: 'korean', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'nanum-gothic', family: 'Nanum Gothic', weights: [400, 700, 800], cat: 'korean', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'ibm-plex-sans-kr', family: 'IBM Plex Sans KR', weights: [400, 700], cat: 'korean', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'noto-serif-kr', family: 'Noto Serif KR', weights: [400, 700, 900], cat: 'korean', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'nanum-myeongjo', family: 'Nanum Myeongjo', weights: [400, 700, 800], cat: 'korean', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'gowun-batang', family: 'Gowun Batang', weights: [400, 700], cat: 'korean', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'hahmlet', family: 'Hahmlet', weights: [400, 700, 900], cat: 'korean', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'song-myung', family: 'Song Myung', weights: [400], cat: 'korean', generic: 'serif', jp: 'zen-old-mincho' },
    { id: 'gowun-dodum', family: 'Gowun Dodum', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'zen-maru-gothic' },
    { id: 'jua', family: 'Jua', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'mochiy-pop-one' },
    { id: 'do-hyeon', family: 'Do Hyeon', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'black-han-sans', family: 'Black Han Sans', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'gugi', family: 'Gugi', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'rocknroll-one' },
    { id: 'bagel-fat-one', family: 'Bagel Fat One', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'mochiy-pop-one' },
    { id: 'gasoek-one', family: 'Gasoek One', weights: [400], cat: 'korean', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'nanum-brush-script', family: 'Nanum Brush Script', weights: [400], cat: 'korean', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'east-sea-dokdo', family: 'East Sea Dokdo', weights: [400], cat: 'korean', generic: 'cursive', jp: 'yuji-boku' },
    { id: 'nanum-pen-script', family: 'Nanum Pen Script', weights: [400], cat: 'korean', generic: 'cursive', jp: 'klee-one' },
    { id: 'gaegu', family: 'Gaegu', weights: [400, 700], cat: 'korean', generic: 'cursive', jp: 'yomogi' },
    { id: 'nanum-gothic-coding', family: 'Nanum Gothic Coding', weights: [400, 700], cat: 'korean', generic: 'monospace', jp: 'dotgothic16' },

    { id: 'noto-sans-sc', family: 'Noto Sans SC', weights: [400, 700, 900], cat: 'chinese', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'noto-serif-sc', family: 'Noto Serif SC', weights: [400, 700, 900], cat: 'chinese', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'zcool-xiaowei', family: 'ZCOOL XiaoWei', weights: [400], cat: 'chinese', generic: 'serif', jp: 'shippori-mincho' },
    { id: 'zcool-qingke-huangyou', family: 'ZCOOL QingKe HuangYou', weights: [400], cat: 'chinese', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'zcool-kuaile', family: 'ZCOOL KuaiLe', weights: [400], cat: 'chinese', generic: 'sans-serif', jp: 'mochiy-pop-one' },
    { id: 'ma-shan-zheng', family: 'Ma Shan Zheng', weights: [400], cat: 'chinese', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'zhi-mang-xing', family: 'Zhi Mang Xing', weights: [400], cat: 'chinese', generic: 'cursive', jp: 'yuji-mai' },
    { id: 'liu-jian-mao-cao', family: 'Liu Jian Mao Cao', weights: [400], cat: 'chinese', generic: 'cursive', jp: 'yuji-boku' },
    { id: 'long-cang', family: 'Long Cang', weights: [400], cat: 'chinese', generic: 'cursive', jp: 'klee-one' },

    { id: 'cinzel', family: 'Cinzel', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'cinzel-decorative', family: 'Cinzel Decorative', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'playfair-display', family: 'Playfair Display', weights: [400, 700, 900], cat: 'latin', generic: 'serif', jp: 'noto-serif-jp' },
    { id: 'cormorant-garamond', family: 'Cormorant Garamond', weights: [400, 700], cat: 'latin', generic: 'serif', jp: 'shippori-mincho' },
    { id: 'im-fell-english', family: 'IM Fell English', weights: [400], cat: 'latin', generic: 'serif', jp: 'zen-old-mincho' },
    { id: 'unifraktur-maguntia', family: 'UnifrakturMaguntia', weights: [400], cat: 'latin', generic: 'serif', jp: 'zen-antique' },
    { id: 'bebas-neue', family: 'Bebas Neue', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'oswald', family: 'Oswald', weights: [400, 700], cat: 'latin', generic: 'sans-serif', jp: 'noto-sans-jp' },
    { id: 'anton', family: 'Anton', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'orbitron', family: 'Orbitron', weights: [400, 700, 900], cat: 'latin', generic: 'sans-serif', jp: 'zen-kaku-gothic-new' },
    { id: 'audiowide', family: 'Audiowide', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'zen-kaku-gothic-new' },
    { id: 'russo-one', family: 'Russo One', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'black-ops-one', family: 'Black Ops One', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'special-elite', family: 'Special Elite', weights: [400], cat: 'latin', generic: 'monospace', jp: 'new-tegomin' },
    { id: 'share-tech-mono', family: 'Share Tech Mono', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'vt323', family: 'VT323', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'press-start-2p', family: 'Press Start 2P', weights: [400], cat: 'latin', generic: 'monospace', jp: 'dotgothic16' },
    { id: 'creepster', family: 'Creepster', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'nosifer', family: 'Nosifer', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'butcherman', family: 'Butcherman', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'eater', family: 'Eater', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-syuku' },
    { id: 'rubik-glitch', family: 'Rubik Glitch', weights: [400], cat: 'latin', generic: 'sans-serif', jp: 'dela-gothic-one' },
    { id: 'metal-mania', family: 'Metal Mania', weights: [400], cat: 'latin', generic: 'cursive', jp: 'zen-antique' },
    { id: 'great-vibes', family: 'Great Vibes', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-mai' },
    { id: 'pinyon-script', family: 'Pinyon Script', weights: [400], cat: 'latin', generic: 'cursive', jp: 'yuji-mai' }
  ];

  const byId = new Map(CATALOG.map(font => [font.id, font]));

  // 日本語フォント・欧文フォントでハングルを表示するときの代替フォント（分類ごと。等幅・筆書きなどは個別に上書き）
  const KO_BY_CAT = { gothic: 'noto-sans-kr', mincho: 'noto-serif-kr', round: 'jua', display: 'do-hyeon', brush: 'nanum-brush-script', latin: 'noto-sans-kr', user: 'noto-sans-kr' };
  const KO_BY_FONT = {
    'kaisei-opti': 'gowun-batang', 'hina-mincho': 'gowun-batang', 'zen-maru-gothic': 'gowun-dodum', 'kosugi-maru': 'gowun-dodum', 'kiwi-maru': 'gowun-dodum',
    'hachi-maru-pop': 'gaegu', 'dela-gothic-one': 'black-han-sans', 'rampart-one': 'black-han-sans', 'reggae-one': 'black-han-sans', 'dotgothic16': 'nanum-gothic-coding',
    'zen-antique': 'song-myung', 'shippori-antique': 'song-myung', 'kaisei-decol': 'gowun-batang', 'new-tegomin': 'song-myung',
    'klee-one': 'nanum-pen-script', 'yomogi': 'nanum-pen-script', 'zen-kurenaido': 'nanum-pen-script', 'yusei-magic': 'gaegu', 'yuji-boku': 'east-sea-dokdo'
  };

  // ハングルの代替フォント（ハングルを持つフォントは null）
  function koFallback(font) {
    if (!font || font.cat === 'korean') return null;
    // 中国語のフォントは、日本語を表示するときの代替フォントに合わせる
    if (font.cat === 'chinese' && font.jp && byId.has(font.jp)) return koFallback(byId.get(font.jp));
    if (KO_BY_FONT[font.id]) return byId.get(KO_BY_FONT[font.id]);
    if (font.jp && KO_BY_FONT[font.jp]) return byId.get(KO_BY_FONT[font.jp]);
    if (font.cat === 'latin') {
      if (font.generic === 'serif') return byId.get('noto-serif-kr');
      if (font.generic === 'monospace') return byId.get('nanum-gothic-coding');
      if (font.generic === 'cursive') return byId.get(font.jp === 'yuji-mai' ? 'nanum-pen-script' : 'nanum-brush-script');
      if (font.jp === 'dela-gothic-one') return byId.get('black-han-sans');
    }
    return byId.get(KO_BY_CAT[font.cat] || 'noto-sans-kr');
  }

  const HANGUL = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/;

  // 日本語フォント・欧文フォントで中国語（簡体字）を表示するときの代替フォント（分類ごと。雰囲気の違うものは個別に上書き）
  const ZH_BY_CAT = { gothic: 'noto-sans-sc', mincho: 'noto-serif-sc', round: 'noto-sans-sc', display: 'zcool-qingke-huangyou', brush: 'ma-shan-zheng', user: 'noto-sans-sc' };
  const ZH_BY_FONT = {
    'kaisei-opti': 'zcool-xiaowei', 'hina-mincho': 'zcool-xiaowei', 'kaisei-decol': 'zcool-xiaowei',
    'mochiy-pop-one': 'zcool-kuaile', 'hachi-maru-pop': 'zcool-kuaile', 'potta-one': 'zcool-kuaile', 'rocknroll-one': 'zcool-kuaile', 'darumadrop-one': 'zcool-kuaile', 'yusei-magic': 'zcool-kuaile',
    'stick': 'noto-sans-sc', 'dotgothic16': 'noto-sans-sc', 'shippori-antique': 'noto-sans-sc', 'zen-antique': 'noto-serif-sc', 'new-tegomin': 'noto-serif-sc',
    'yuji-mai': 'zhi-mang-xing', 'klee-one': 'long-cang', 'yomogi': 'long-cang', 'zen-kurenaido': 'long-cang'
  };

  // 簡体字の代替フォント（簡体字を持つフォントは null）。欧文・韓国語のフォントは、日本語を表示するときの代替フォントに合わせる
  function zhFallback(font) {
    if (!font || font.cat === 'chinese') return null;
    if (ZH_BY_FONT[font.id]) return byId.get(ZH_BY_FONT[font.id]);
    if (font.jp && byId.has(font.jp)) return zhFallback(byId.get(font.jp));
    return byId.get(ZH_BY_CAT[font.cat] || 'noto-sans-sc');
  }

  // 中国語（簡体字）らしい漢字の表：GB2312 の漢字のうち、日本語フォントが持つ JIS X 0208 の漢字に無いもの（3,433字）。
  // U+4E00 から1文字1ビット（下位ビットから）で並べて base64 にしたもの
  const ZH_ONLY_BITS = [
    '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',
    'AI4A'
  ].join('');
  const ZH_BASE = 0x4e00;
  let zhOnlyTable = null;
  // かな（ひらがな・カタカナ。長音符「ー」と中黒「・」は除く）
  const KANA = /[\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fd-\u30ff\u31f0-\u31ff\uff66-\uff9d]/;

  // 中国語の文章か：日本語フォントに無い簡体字を含み、かなを含まない。
  // 中国語の文章では、日本語フォントにある漢字と無い簡体字とで字形が混ざらないよう、近い中国語フォントを先に使う
  function isChineseText(text) {
    const str = String(text || '');
    if (!str || KANA.test(str)) return false;
    if (!zhOnlyTable) {
      const bin = atob(ZH_ONLY_BITS);
      zhOnlyTable = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) zhOnlyTable[i] = bin.charCodeAt(i);
    }
    for (let i = 0; i < str.length; i++) {
      const n = str.charCodeAt(i) - ZH_BASE;
      if (n >= 0 && (n >> 3) < zhOnlyTable.length && (zhOnlyTable[n >> 3] & (1 << (n & 7)))) return true;
    }
    return false;
  }

  const userFonts = new Map();
  const cssPromises = new Map();
  const previewPromises = new Map();
  let uploadCounter = 0;

  /* ---------- 登録したフォント（マイフォント）の保存 ----------
   * 一覧（ID・フォント名・表示名）は localStorage に、フォントファイルの中身は IndexedDB に保存する。
   * 一覧は起動時にすぐ読めるので、保存済みの場面が登録フォントを指していても初期フォントに戻らない。 */
  const SAVED_KEY = 'textApngMakerFonts.v1';
  const DB_NAME = 'textApngMakerFonts';
  const DB_STORE = 'files';
  let dbPromise = null;
  let restoring = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = root.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE, { keyPath: 'id' }); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('blocked'));
      } catch (error) {
        reject(error);
      }
    });
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
  }

  function dbRun(mode, run) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const req = run(tx.objectStore(DB_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  function writeSaved() {
    const list = Array.from(userFonts.values()).filter(f => f.saved)
      .map(f => ({ id: f.id, family: f.family, label: f.label, bytes: f.bytes || 0, local: Boolean(f.local) }));
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (error) { /* 保存できなくても今回は使える */ }
  }

  (function readSaved() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (error) { list = []; }
    if (!Array.isArray(list)) return;
    list.forEach(entry => {
      if (!entry || typeof entry.id !== 'string' || typeof entry.family !== 'string') return;
      const label = String(entry.label || entry.family);
      if (entry.local && entry.id === `local:${entry.family}`) {
        userFonts.set(entry.id, { id: entry.id, family: entry.family, weights: [400, 700], cat: 'user', generic: 'sans-serif', user: true, local: true, saved: true, label });
      } else if (!entry.local && entry.id === `upload:${entry.family}`) {
        // ファイルの中身は restoreSaved() で読み戻す
        userFonts.set(entry.id, { id: entry.id, family: entry.family, weights: [400], cat: 'user', generic: 'sans-serif', user: true, upload: true, saved: true, pending: true, label, bytes: Number(entry.bytes) || 0 });
      }
    });
  })();

  // 登録したフォントファイルを IndexedDB から読み戻して使えるようにする（何度呼んでも1回だけ）
  function restoreSaved() {
    if (restoring) return restoring;
    const pending = Array.from(userFonts.values()).filter(f => f.pending);
    restoring = (async () => {
      const loaded = [];
      if (!pending.length) return loaded;
      let dbReady = true;
      try { await openDb(); } catch (error) { dbReady = false; }
      for (const font of pending) {
        if (!dbReady) { userFonts.delete(font.id); continue; }
        try {
          const rec = await dbRun('readonly', store => store.get(font.id));
          if (!rec || !rec.data) {
            // 中身が消えていた登録は一覧からも外す
            userFonts.delete(font.id);
            continue;
          }
          const face = new FontFace(font.family, rec.data, { weight: '1 1000', style: 'normal' });
          await face.load();
          document.fonts.add(face);
          font.face = face;
          font.pending = false;
          loaded.push(font);
        } catch (error) {
          userFonts.delete(font.id);
        }
      }
      // 保存領域を開けなかったとき（プライベートモードなど）は一覧を残し、次回また試す
      if (dbReady) writeSaved();
      return loaded;
    })();
    return restoring;
  }

  function googleCssUrl(font, extra = '') {
    const family = encodeURIComponent(font.family).replace(/%20/g, '+');
    const weights = font.weights || [400];
    const spec = weights.length === 1 && weights[0] === 400 ? '' : `:wght@${weights.join(';')}`;
    return `https://fonts.googleapis.com/css2?family=${family}${spec}${extra}&display=swap`;
  }

  function ensureCss(font) {
    if (!font || !font.family || font.user) return Promise.resolve(true);
    if (cssPromises.has(font.id)) return cssPromises.get(font.id);
    const promise = new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = googleCssUrl(font);
      link.dataset.fontId = font.id;
      link.onload = () => resolve(true);
      link.onerror = () => resolve(false);
      document.head.appendChild(link);
      setTimeout(() => resolve(false), 12000);
    });
    cssPromises.set(font.id, promise);
    return promise;
  }

  function get(id) {
    if (!id) return byId.get('noto-sans-jp');
    if (byId.has(id)) return byId.get(id);
    if (userFonts.has(id)) return userFonts.get(id);
    if (id.startsWith('local:')) {
      const name = id.slice(6);
      const font = { id, family: name, weights: [400, 700], cat: 'user', generic: 'sans-serif', user: true, local: true, label: name };
      userFonts.set(id, font);
      return font;
    }
    return null;
  }

  // 描画に使うフォントの並び（先にあるフォントから、その文字を持つものが使われる）。
  // text：描く文章（場面のメインとサブ）。中国語の文章では、簡体字の代替フォントを日本語フォントより先に置く
  //       （欧文フォント・登録したフォントは、そのフォントのすぐ後ろ。欧文・登録したフォントの字形はそのまま使う）
  function families(id, text) {
    const font = get(id) || byId.get('noto-sans-jp');
    const list = [font.family];
    if (font.jp && byId.has(font.jp)) list.push(byId.get(font.jp).family);
    if (font.user) list.push('Noto Sans JP');
    const ko = koFallback(font);
    if (ko) list.push(ko.family);
    list.push(font.generic || 'sans-serif');
    const zh = isChineseText(text) ? zhFallback(font) : null;
    if (zh) list.splice(font.cat === 'latin' || font.user ? 1 : 0, 0, zh.family);
    return list;
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
  }

  // 指定したテキストの描画に必要なフォントを読み込む。
  // sceneText：代替フォントの並びを決める場面の文章（families に渡すのと同じもの。省略時は text）
  async function load(id, weight, text, sceneText) {
    if (get(id) && get(id).pending) await restoreSaved();
    const font = get(id) || byId.get('noto-sans-jp');
    const context = sceneText === undefined ? text : sceneText;
    const tasks = [ensureCss(font)];
    if (font.jp && byId.has(font.jp)) tasks.push(ensureCss(byId.get(font.jp)));
    if (font.user) tasks.push(ensureCss(byId.get('noto-sans-jp')));
    // ハングルの代替フォントは、ハングルを使うときだけ読み込む
    const ko = koFallback(font);
    if (ko && HANGUL.test(String(text || ''))) tasks.push(ensureCss(ko));
    // 簡体字の代替フォントは、中国語の文章のときだけ読み込む
    const zh = isChineseText(context) ? zhFallback(font) : null;
    if (zh) tasks.push(ensureCss(zh));
    await Promise.all(tasks);
    if (!document.fonts || !document.fonts.load) return;
    const fam = root.TextApngEngine ? root.TextApngEngine.cssFontFamily(families(font.id, context)) : `"${font.family}"`;
    const sample = String(text || '').replace(/\s+/g, '') || 'あA';
    const w = nearestWeight(font, weight);
    try {
      await withTimeout(document.fonts.load(`${w} 48px ${fam}`, sample), 15000);
    } catch (error) {
      // フォントが読めない場合も代替フォントで描画を続ける
    }
  }

  function nearestWeight(font, weight) {
    const weights = (font && font.weights) || [400];
    let best = weights[0];
    weights.forEach(w => { if (Math.abs(w - weight) < Math.abs(best - weight)) best = w; });
    return best;
  }

  // フォントファイルを登録する。saved: このブラウザに保存できたか（できなければ今回だけ使える）
  async function addFontFile(file) {
    const buffer = await file.arrayBuffer();
    const label = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '');
    // 同じファイルをもう一度選んだときは、登録済みのものを使う
    const same = Array.from(userFonts.values()).find(f => f.upload && !f.pending && f.label === label && f.bytes === buffer.byteLength);
    if (same) return { font: same, saved: Boolean(same.saved), existing: true };
    uploadCounter += 1;
    const family = `TAM Upload ${Date.now().toString(36)}${uploadCounter}`;
    const face = new FontFace(family, buffer.slice(0), { weight: '1 1000', style: 'normal' });
    await face.load();
    document.fonts.add(face);
    const id = `upload:${family}`;
    const font = { id, family, weights: [400], cat: 'user', generic: 'sans-serif', user: true, upload: true, label, bytes: buffer.byteLength, face };
    userFonts.set(id, font);
    try {
      await dbRun('readwrite', store => store.put({ id, family, label, bytes: buffer.byteLength, data: buffer, added: Date.now() }));
      font.saved = true;
      writeSaved();
    } catch (error) {
      font.saved = false;
    }
    return { font, saved: font.saved, existing: false };
  }

  // PCのフォント名を「マイフォント」に覚える
  function saveLocalFont(id) {
    const font = get(id);
    if (!font || !font.local) return false;
    font.saved = true;
    writeSaved();
    return true;
  }

  // 登録を解除する（フォントファイルもこのブラウザから消す）
  async function removeFont(id) {
    const font = userFonts.get(id);
    if (!font) return false;
    userFonts.delete(id);
    if (font.face) {
      try { document.fonts.delete(font.face); } catch (error) { /* 表示中の文字は代替フォントになる */ }
    }
    writeSaved();
    if (font.upload) {
      try { await dbRun('readwrite', store => store.delete(id)); } catch (error) { /* 次回の読み戻しで一覧から外れる */ }
    }
    return true;
  }

  // インストール済みフォントかどうかを文字幅の違いで推定
  function isLocalFontAvailable(name) {
    const clean = String(name || '').trim();
    if (!clean) return false;
    const ctx = document.createElement('canvas').getContext('2d');
    const sample = 'あいう永AaBbWwIi0123';
    return ['monospace', 'serif', 'sans-serif'].some(generic => {
      ctx.font = `48px ${generic}`;
      const base = ctx.measureText(sample).width;
      ctx.font = `48px "${clean.replace(/"/g, '')}", ${generic}`;
      return Math.abs(ctx.measureText(sample).width - base) > 0.5;
    });
  }

  function previewSample(font) {
    if (font.cat === 'latin') return 'Aa Bb 123';
    if (font.cat === 'chinese') return '汉字 Aa';
    return font.cat === 'korean' ? '한글 Aa' : 'あア永 Aa';
  }

  // フォント選択パネル用：フォント名の見本だけを小さなサブセットで取得（別名で登録）
  function loadPreview(font) {
    if (!font || font.user) return Promise.resolve(font ? font.family : null);
    if (previewPromises.has(font.id)) return previewPromises.get(font.id);
    const alias = `TAM Preview ${font.id}`;
    const weight = nearestWeight(font, 700);
    const promise = (async () => {
      try {
        const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family).replace(/%20/g, '+')}${font.weights.length === 1 && font.weights[0] === 400 ? '' : `:wght@${weight}`}&text=${encodeURIComponent(previewSample(font).replace(/\s/g, ''))}`;
        const css = await (await fetch(url)).text();
        const match = /src:\s*url\(([^)]+)\)/.exec(css);
        if (!match) return null;
        const face = new FontFace(alias, `url(${match[1].replace(/['"]/g, '')})`, { weight: String(weight) });
        await face.load();
        document.fonts.add(face);
        return alias;
      } catch (error) {
        return null;
      }
    })();
    previewPromises.set(font.id, promise);
    return promise;
  }

  function list() {
    return CATALOG.concat(Array.from(userFonts.values()).filter(f => f.upload || f.local));
  }

  root.TextApngFonts = {
    CATEGORIES,
    CATALOG,
    get,
    list,
    families,
    isChineseText,
    load,
    ensureCss,
    nearestWeight,
    addFontFile,
    saveLocalFont,
    removeFont,
    restoreSaved,
    isLocalFontAvailable,
    loadPreview,
    previewSample
  };
})(window);
