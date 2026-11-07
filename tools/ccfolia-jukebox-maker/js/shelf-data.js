/* KPレス・ジュークボックスメーカー — レコード棚の初期の曲
 * YouTube で「フリーBGM」として公開されている曲を、雰囲気ごとのタブに分けて並べる。
 * 曲そのものはこのツールに含めず、YouTube の埋め込みで音声だけを流す。
 * 使える範囲（商用・クレジット表記など）は曲ごとに違うので、各動画の概要欄で確かめてもらう。 */
(function () {
  'use strict';

  const TABS = [
    { id: 'intro', tracks: [
      ['CQyZ0x0GxMM', '物語の始まり（DOVA-SYNDROME）'],
      ['6fwxJqoLJMk', 'Spectacular World'],
      ['Vh7_Tzav8Qs', 'BGM177_Fireworks']
    ] },
    { id: 'unease', tracks: [
      ['Nfq8trmYyYo', '不穏（DOVA-SYNDROME）'],
      ['IQcUAwpCfrY', '不穏の続き Op.61'],
      ['5Q1XCz5BLow', '不穏な探索'],
      ['Lq0-hoae0OU', '霧の思考']
    ] },
    { id: 'comic', tracks: [
      ['Nf_lqAWh-mE', 'コミカルな日常（DOVA-SYNDROME）'],
      ['JNUWDIaxqOo', 'ドジっこハプニング'],
      ['7JhjnxhO7YY', 'ぽかぽか日和']
    ] },
    { id: 'deduction', tracks: [
      ['3pfQ3bDq0Wc', 'プロセス'],
      ['hPZd9QDIlZo', '思考する化石'],
      ['9-Nfb9lWSQQ', '私立探偵と不可解な古文書'],
      ['bCO6umFZ8VI', '大正浪漫探偵']
    ] },
    { id: 'moving', tracks: [
      ['dc0oRjmZtQs', 'BGM193_Glory'],
      ['B14YckVIJwU', 'BGM285_Homeward'],
      ['jhm0or_mdHw', 'BGM279_Prelude']
    ] },
    { id: 'sad', tracks: [
      ['G80jLc37jAo', '雪解けを待つ'],
      ['K58XkKv6Qso', '雨にうたれて'],
      ['2Q4y93LvoeQ', '夢想世界'],
      ['geHgfGdO4iU', '曇り空']
    ] },
    { id: 'tension', tracks: [
      ['TLIZfSg1qeA', '緊迫 -will be Arrested...!（DOVA-SYNDROME）'],
      ['J6Fxuc0veos', 'BGM003-緊張、切迫1（DOVA-SYNDROME）'],
      ['vxMIQiE2Cig', 'まるでサスペンスドラマ～犯人は語る～（DOVA-SYNDROME）'],
      ['EB2XjA8oiyc', '毎日がサスペンス']
    ] },
    { id: 'climax', tracks: [
      ['ISHbwrrNTeM', '決戦（DOVA-SYNDROME）'],
      ['jHSQ2vCIRcc', 'The Final Confrontation'],
      ['asKyymlaleE', 'Bound to Fate']
    ] },
    { id: 'mansion', tracks: [
      ['KhjjEh6T33w', 'ホラーゲームの洋館'],
      ['uQYnymedaE8', '奇妙な案内人'],
      ['I9_yZH7nSzA', '月は知っている（60分）'],
      ['OxX9Zi1Vydo', '無記名の招待状']
    ] },
    { id: 'horror', tracks: [
      ['EhmXo0S81ts', '生暖かい空気 -Tepid air-'],
      ['54EVnRk494A', '壊れたオルゴール（1時間）'],
      ['A1fdlha_zB0', 'その村、立ち入るべからず。（30分）']
    ] },
    { id: 'digital', tracks: [
      ['_wwur8OsNd8', 'cyber'],
      ['9YWKyezOcg0', 'Cybernetic'],
      ['IRQuR8KuriE', 'サイバー32（魔王魂）'],
      ['vu8Qq8G_bl4', 'NEON VELOCITY']
    ] }
  ];

  window.JukeboxShelf = {
    // 毎回まっさらなコピーを返す（画面側で書き換えるため）
    defaults() {
      return TABS.map(tab => ({ id: tab.id, name: '', tracks: tab.tracks.map(([yt, title]) => ({ yt, title })) }));
    }
  };
})();
