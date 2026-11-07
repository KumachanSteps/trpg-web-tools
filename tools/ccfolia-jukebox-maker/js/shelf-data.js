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
      ['Vh7_Tzav8Qs', 'BGM177_Fireworks'],
      ['lPYMqGa_xT4', '儚く透明な色（DOVA-SYNDROME）', 2],
      ['0mbmvlg8iZU', 'fairy tale（DOVA-SYNDROME）', 2],
      ['k8wX3elrsbE', '不可解な事件簿的なBGM（DOVA-SYNDROME）', 2],
      ['7VfFDhFGHFw', '不思議な森（DOVA-SYNDROME）', 2]
    ] },
    { id: 'unease', tracks: [
      ['Nfq8trmYyYo', '不穏（DOVA-SYNDROME）'],
      ['IQcUAwpCfrY', '不穏の続き Op.61'],
      ['5Q1XCz5BLow', '不穏な探索'],
      ['Lq0-hoae0OU', '霧の思考'],
      ['biayjoKoIN8', 'Dark cave（DOVA-SYNDROME）', 2],
      ['_hrqKpdZw2Y', '不可解な謎（1時間・もみじばミュージック）', 2],
      ['owBxeiw6pgI', '思考の牢（1時間）', 2],
      ['LlyNqUHQI-I', '策謀（DOVA-SYNDROME）', 2],
      ['dguMK2aSuvY', '不吉な森（DOVA-SYNDROME）', 2],
      ['IBgpHazjeHM', 'コールドフィッシュ（DOVA-SYNDROME）', 2],
      ['0KRrv75t8sU', 'クリスタルコア（DOVA-SYNDROME）', 2],
      ['XWsWn7Iuh_8', 'Flutter（DOVA-SYNDROME）', 2],
      ['ZTgbzcta0LU', '不穏ROOM（DOVA-SYNDROME）', 2],
      ['bG6WnM8ultE', '誰もいない風景（DOVA-SYNDROME）', 2]
    ] },
    { id: 'comic', tracks: [
      ['Nf_lqAWh-mE', 'コミカルな日常（DOVA-SYNDROME）'],
      ['JNUWDIaxqOo', 'ドジっこハプニング'],
      ['7JhjnxhO7YY', 'ぽかぽか日和'],
      ['DzY-e-cNFt0', '怪しい魔法薬（1時間）', 2],
      ['fDtc6_c9VgQ', '探偵事務所（DOVA-SYNDROME）', 2],
      ['JGzLOY7M0yE', '自宅にて（DOVA-SYNDROME）', 2],
      ['hS6NUgyGFkg', 'ensolarado（DOVA-SYNDROME）', 2],
      ['uSdtzlqVdVw', '青空空港（DOVA-SYNDROME）', 2],
      ['eo7w_Pnctvg', 'なんでしょう？（DOVA-SYNDROME）', 2],
      ['f2yOXZA0dp0', '収穫祭（DOVA-SYNDROME）', 2],
      ['KKzSCyV5H0E', 'ジョゼフは今日もご機嫌（DOVA-SYNDROME）', 2]
    ] },
    { id: 'deduction', tracks: [
      ['3pfQ3bDq0Wc', 'プロセス'],
      ['hPZd9QDIlZo', '思考する化石'],
      ['9-Nfb9lWSQQ', '私立探偵と不可解な古文書'],
      ['bCO6umFZ8VI', '大正浪漫探偵'],
      ['DJf-wqjuwwM', 'Investigation（DOVA-SYNDROME）', 2],
      ['A_Tlq2opviQ', 'Thief\'s Time（DOVA-SYNDROME）', 2],
      ['GsIrInVSe-A', '時計図書館（DOVA-SYNDROME）', 2],
      ['hEQ5q006NXs', '違和感（1時間・もみじばミュージック）', 2],
      ['JYm6-WvtM6M', '謎発生（もみじばミュージック）', 2],
      ['X_UDyB4WaNM', '消えた絵画（1時間）', 2],
      ['5fiqDbPPMaE', '出口のない迷路（1時間）', 2],
      ['7SUohkp8bFw', '推理BGM1（1時間）', 2],
      ['TipFijm1l6U', '推理BGM2（1時間）', 2],
      ['BshNcJVCPhc', '作戦会議（DOVA-SYNDROME）', 2],
      ['jzhBKLjP0o4', '作戦会議2（DOVA-SYNDROME）', 2],
      ['VH8r_CYjGbI', 'Mystic Room（DOVA-SYNDROME）', 2],
      ['Siga1GQDcEA', '会議延長（DOVA-SYNDROME）', 2],
      ['GbR-off3SaE', '探偵は喫茶にいる的なBGM（DOVA-SYNDROME）', 2],
      ['hudWFBPXeH4', 'ミラージュ（DOVA-SYNDROME）', 2],
      ['gQVWawCveAI', 'funky session（DOVA-SYNDROME）', 2],
      ['9EzV0w-UUGY', '日没廃校（DOVA-SYNDROME）', 2]
    ] },
    { id: 'moving', tracks: [
      ['dc0oRjmZtQs', 'BGM193_Glory'],
      ['B14YckVIJwU', 'BGM285_Homeward'],
      ['jhm0or_mdHw', 'BGM279_Prelude'],
      ['Dt9eBjJdTjc', '神隠しの真相（DOVA-SYNDROME）', 2],
      ['YndjimG6X5g', 'ステラと塔の物語（DOVA-SYNDROME）', 2],
      ['NHfopv9no38', 'ワスレナグサ（DOVA-SYNDROME）', 2],
      ['SOmJcGLxk5w', '露草（DOVA-SYNDROME）', 2],
      ['_bJr0OjB8g4', 'stream（DOVA-SYNDROME）', 2],
      ['16Bj6aPi1A8', '2:23AM（DOVA-SYNDROME）', 2],
      ['olxbmbavH5w', 'ムスカリの花（DOVA-SYNDROME）', 2],
      ['P626a-2Tip8', '真実（DOVA-SYNDROME）', 2],
      ['nALEcCgFN1s', 'ゴーゴー探偵事務所（DOVA-SYNDROME）', 2],
      ['_6VxTpU1-Z8', 'ローファイ少女は今日も寝不足（DOVA-SYNDROME）', 2],
      ['CVi8ZStKBTc', '朝露喫煙所（DOVA-SYNDROME）', 2],
      ['MfIWpMnEBbM', 'On The Moon（DOVA-SYNDROME）', 2]
    ] },
    { id: 'sad', tracks: [
      ['G80jLc37jAo', '雪解けを待つ'],
      ['K58XkKv6Qso', '雨にうたれて'],
      ['2Q4y93LvoeQ', '夢想世界'],
      ['geHgfGdO4iU', '曇り空'],
      ['PbV8D4DYWv4', '水中流星群（DOVA-SYNDROME）', 2],
      ['vIOyAFZXg_0', '記憶を辿る旋律（もみじばミュージック）', 2],
      ['AMA6cyrRCyI', '閉ざした心の奥（もみじばミュージック）', 2],
      ['tr_Gc4_zGlQ', 'えんとつワルツ（もみじばミュージック）', 2],
      ['UzC5tpXFeQk', '雨だれの街（30分）', 2]
    ] },
    { id: 'tension', tracks: [
      ['TLIZfSg1qeA', '緊迫 -will be Arrested...!（DOVA-SYNDROME）'],
      ['J6Fxuc0veos', 'BGM003-緊張、切迫1（DOVA-SYNDROME）'],
      ['vxMIQiE2Cig', 'まるでサスペンスドラマ～犯人は語る～（DOVA-SYNDROME）'],
      ['EB2XjA8oiyc', '毎日がサスペンス'],
      ['V_6j2x4fjYs', 'Evil Dance（DOVA-SYNDROME）', 2],
      ['lWBUXp2TEus', '事件が発生した的なBGM（DOVA-SYNDROME）', 2],
      ['F4zE_7JCybQ', '捜査会議（DOVA-SYNDROME）', 2],
      ['mt9O1CgqPrc', '古い実験施設（DOVA-SYNDROME）', 2],
      ['rqhgH4oZQSg', 'Ice is wall（DOVA-SYNDROME）', 2],
      ['NhpYAtmA-mk', 'Investigation3（PeriTune）', 2],
      ['ZrE7sdgkwj4', '危機（DOVA-SYNDROME）', 2],
      ['nru0SQvo6U0', '目を光らせて（DOVA-SYNDROME）', 2],
      ['JsMDr41OXL0', '基地出撃５分前（DOVA-SYNDROME）', 2]
    ] },
    { id: 'climax', tracks: [
      ['ISHbwrrNTeM', '決戦（DOVA-SYNDROME）'],
      ['jHSQ2vCIRcc', 'The Final Confrontation'],
      ['asKyymlaleE', 'Bound to Fate'],
      ['vHINNBwmbBE', 'Flap（PeriTune）', 2]
    ] },
    { id: 'mansion', tracks: [
      ['KhjjEh6T33w', 'ホラーゲームの洋館'],
      ['uQYnymedaE8', '奇妙な案内人'],
      ['I9_yZH7nSzA', '月は知っている（60分）'],
      ['OxX9Zi1Vydo', '無記名の招待状'],
      ['_tMnO_Pnfwg', 'すきま風の声（DOVA-SYNDROME）', 2],
      ['bSc0BC_FHnc', 'Lonely Lily（DOVA-SYNDROME）', 2],
      ['jiPmnkrWfyU', '心淵の扉（もみじばミュージック）', 2],
      ['wzSKRexrfpc', '教会（もみじばミュージック）', 2],
      ['FKMLeiZrpZo', 'ハロウィンハウス（もみじばミュージック）', 2],
      ['ReKrMQKoazY', '魔女の小部屋（1時間）', 2],
      ['69fBHoRYdMg', 'かぼちゃの館（1時間）', 2],
      ['DbogJZ7POjA', 'TaishoRoman_Theme2（PeriTune）', 2],
      ['_MLZ9q1KZAE', '厳格な石の鳥篭（DOVA-SYNDROME）', 2],
      ['GYjV6x0XJsg', '忘れられた図書館（DOVA-SYNDROME）', 2],
      ['eoZLBoqhsEU', '怪しい館（DOVA-SYNDROME）', 2],
      ['iZji1SLIj9o', 'Mystery_Detective（PeriTune）', 2],
      ['1EkQUC4DK8o', 'Suspense8（PeriTune）', 2],
      ['MM7zV8Lf-c8', 'ワイングラスと私（DOVA-SYNDROME）', 2],
      ['pR2TyMCkfBM', '紫煙（DOVA-SYNDROME）', 2]
    ] },
    { id: 'horror', tracks: [
      ['EhmXo0S81ts', '生暖かい空気 -Tepid air-'],
      ['54EVnRk494A', '壊れたオルゴール（1時間）'],
      ['A1fdlha_zB0', 'その村、立ち入るべからず。（30分）'],
      ['Vw7b30JzwlA', 'Crystal thorn（DOVA-SYNDROME）', 2],
      ['g-v-4cA-VNo', 'おどろ通り（1時間・もみじばミュージック）', 2],
      ['SQFXE086VuQ', 'イビツ（DOVA-SYNDROME）', 2],
      ['PVsGwTRHDwo', 'だれもいないはずだった（DOVA-SYNDROME）', 2]
    ] },
    { id: 'digital', tracks: [
      ['_wwur8OsNd8', 'cyber'],
      ['9YWKyezOcg0', 'Cybernetic'],
      ['IRQuR8KuriE', 'サイバー32（魔王魂）'],
      ['vu8Qq8G_bl4', 'NEON VELOCITY'],
      ['EXxv41Umk5o', 'Polygonic Artifact（DOVA-SYNDROME）', 2],
      ['3F-2QY1H2Hw', '夜の病室エレクトロ（DOVA-SYNDROME）', 2],
      ['0i8L4oN4SWg', '星空と衛星（DOVA-SYNDROME）', 2]
    ] }
  ];

  // 初期の曲を足したら上げる。曲の3つ目の数字は、その曲を足したときの版
  const VERSION = 2;

  window.JukeboxShelf = {
    VERSION,
    // 毎回まっさらなコピーを返す（画面側で書き換えるため）
    defaults() {
      return TABS.map(tab => ({ id: tab.id, name: '', tracks: tab.tracks.map(([yt, title]) => ({ yt, title })) }));
    },
    // 前に保存した棚（版 from）より後に足した初期の曲を、タブごとに返す
    additions(from) {
      return TABS.map(tab => ({ id: tab.id, tracks: tab.tracks.filter(tr => (tr[2] || 1) > from).map(([yt, title]) => ({ yt, title })) }));
    }
  };
})();
