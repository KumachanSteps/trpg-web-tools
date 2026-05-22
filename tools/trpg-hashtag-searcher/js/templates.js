window.HASHTAG_TEMPLATES = (() => {
  const systemQueries = {
    CoC: '("CoC" OR "CoC6" OR "CoC7" OR "Call of Cthulhu" OR "Call of Cthulhu 6th" OR "クトゥルフ神話TRPG" OR "新クトゥルフ神話TRPG" OR "クトゥルフTRPG" OR "新クトゥルフTRPG" OR "クトゥルフ" OR "6版" OR "7版")',
    CoC6: '("CoC" OR "CoC6" OR "Call of Cthulhu 6th" OR "Call of Cthulhu" OR "クトゥルフ神話TRPG" OR "クトゥルフTRPG" OR "クトゥルフ" OR "6版") -("CoC7" OR "新クトゥルフ神話TRPG" OR "Call of Cthulhu 7th" OR "新クトゥルフTRPG" OR "7版")',
    CoC7: '("CoC7" OR "新クトゥルフ神話TRPG" OR "Call of Cthulhu 7th" OR "新クトゥルフTRPG" OR "7版") -("CoC6" OR "Call of Cthulhu 6th" OR "6版")',
    エモクロア: '("エモクロア" OR "エモクロアTRPG" OR "Emoklore")',
    ガイアケア: '("ガイアケア" OR "Gaiakea")',
    マダミス: '("マダミス" OR "マーダーミステリー")',
    インセイン: '("インセイン" OR "inSane" OR "マルチジャンル・ホラーRPG インセイン")',
    ソードワールド: '("ソード・ワールド" OR "ソードワールド" OR "Sword World" OR "SW2.5" OR "SW2.0")',
    "D&D": '("D&D" OR "DnD" OR "Dungeons & Dragons" OR "ダンジョンズ＆ドラゴンズ" OR "ダンジョンズ&ドラゴンズ" OR "ダンドラ")',
    シノビガミ: '("シノビガミ" OR "忍術バトルRPG シノビガミ" OR "Shinobigami")',
    ダブルクロス: '("ダブルクロス" OR "ダブルクロスThe 3rd Edition" OR "ダブルクロス3rd" OR "DX3rd" OR "DX3")',
  };

  const wordQueries = {
    PL募集: "#PL募集",
    KP募集: "#KP募集",
    GM募集: "#GM募集",
    ソロ: '"ソロ"',
    タイマン: '("タイマン" OR "KPC")',
    "2PL": '"2PL"',
    "3PL": '"3PL"',
    "4PL": '"4PL"',
    テストプレイ: '"テストプレイ"',
    "ルームZIP付き": '("ココフォリア部屋付き" OR "部屋付きセット" OR "部屋データ付き" OR "ココフォリア部屋zip" OR "サウンドマスター対応" OR "ココフォリア部屋（前景・NPC駒付）" OR "投げるだけルームzipつき" OR "ココフォリア部屋・NPC立ち絵・背景画像同梱" OR "ココフォリア部屋セット")',
  };

  const excludeQueries = {
    "-現行未通過": '-("現行未通過" OR "現未" OR "現行" OR "げんみ")',
  };

  const modes = ["卓募集", "素材探し", "シナリオ探し", "プリセット検索カード"];
  const modeVisualWordMap = { 卓募集: ["PL募集", "KP募集", "GM募集"] };

  const modePresets = {
    卓募集: {
      words: [],
      filters: ["lang:ja"],
      excludes: [],
      extra: ["(#PL募集 OR #KP募集 OR #GM募集)"],
    },
    素材探し: {
      words: [],
      filters: ["filter:images", "filter:links", "lang:ja"],
      excludes: [],
      extra: [
        '("ココフォリア素材" OR "部屋素材" OR #ココフォリア素材 OR #TRPG素材 OR #背景素材)',
        '-("シナリオ" OR "トレーラー" OR "回れる")',
        '-("で購入しました！" OR "ご依頼" OR #TRPG自己紹介シート OR #立ち絵素材)',
        '-("サウンドマスター対応" OR "シーン設定済み" OR "BGMやNPCなど")',
        '-("ココフォリア部屋付き" OR "部屋付きセット" OR "部屋データ付き" OR "ココフォリア部屋（前景・NPC駒付）" OR "ココフォリア部屋・NPC立ち絵・背景画像同梱" OR "ココフォリア部屋セット")',
        '-("素材付き" OR "素材（テキスト込み）" OR "素材追加" OR "素材zipファイルを追加" OR "素材+テキスト" OR "素材が追加" OR "素材制作" OR "制作実績" OR "素材担当" OR "お部屋素材付き" OR "素材＆NPC画像" OR "素材（NPC")',
      ],
    },
  };

  const addWords = ["ソロ", "タイマン", "2PL", "3PL", "4PL", "PL募集", "KP募集", "GM募集", "テストプレイ", "初心者歓迎", "ボイセ", "テキセ", "BOOTH", "ココフォリア", "部屋素材", "ルームZIP付き"];
  const filters = ["filter:images", "filter:videos", "filter:links", "filter:media", "filter:verified", "min_faves:50", "min_faves:100", "min_faves:500", "lang:ja", "from:", "since:1day", "since:3days", "since:1week", "since:1month"];
  const excludes = ["-ネタバレ", "-現行未通過", "-R18", "-R18G", "-募集終了"];

  const chipDescriptions = {
    ソロ: '検索文には "ソロ" を追加します。一人用・ソロ系の投稿を探す用途です。',
    タイマン: '検索文には ("タイマン" OR "KPC") を追加します。タイマン・KPC関連の表記ゆれを拾います。',
    "2PL": '検索文には "2PL" を追加します。2人用シナリオや募集を探す用途です。',
    "3PL": '検索文には "3PL" を追加します。3人用シナリオや募集を探す用途です。',
    "4PL": '検索文には "4PL" を追加します。4人用シナリオや募集を探す用途です。',
    PL募集: "検索文には #PL募集 を追加します。プレイヤー募集を含む投稿を探します。",
    KP募集: "検索文には #KP募集 を追加します。KP募集を含む投稿を探します。",
    GM募集: "検索文には #GM募集 を追加します。GM募集を含む投稿を探します。",
    テストプレイ: "テストプレイ募集・試遊募集に関する投稿を探します。",
    初心者歓迎: "初心者歓迎の募集を探しやすくします。",
    ボイセ: "ボイスセッション関連の投稿を探します。",
    テキセ: "テキストセッション関連の投稿を探します。",
    BOOTH: "BOOTHの商品・シナリオ告知に絞りやすくします。",
    ココフォリア: "ココフォリア部屋や素材関連の投稿を探します。",
    部屋素材: "部屋作成向けの素材投稿を探します。",
    ルームZIP付き: "ココフォリア部屋付き・部屋データ付き・投げるだけルームzipつき等の表記ゆれをまとめて検索します。",
    "filter:images": "画像付き投稿だけを検索します。",
    "filter:videos": "動画付き投稿だけを検索します。",
    "filter:links": "リンク付き投稿だけを検索します。",
    "filter:media": "画像または動画付き投稿を検索します。",
    "filter:verified": "認証済みアカウントの投稿を検索します。",
    "min_faves:50": "いいね数50以上の投稿を検索します。",
    "min_faves:100": "いいね数100以上の投稿を検索します。",
    "min_faves:500": "いいね数500以上の投稿を検索します。",
    "lang:ja": "日本語投稿を優先して検索します。",
    "from:": "特定アカウントからの投稿に絞ります。例：from:username",
    "since:1day": "今日から1日前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:3days": "今日から3日前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:1week": "今日から1週間前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:1month": "今日から1か月前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "-ネタバレ": "『ネタバレ』を含む投稿を検索結果から除外します。",
    "-現行未通過": "『現行未通過』『現未』『現行』『げんみ』を含む投稿を除外します。",
    "-R18": "R18表記を含む投稿を除外します。",
    "-R18G": "R18G表記を含む投稿を除外します。",
    "-募集終了": "募集終了済みの投稿を除外します。",
    CoC: "CoC全般を、6版・7版両方の表記ゆれ込みで検索します。",
    CoC6: "CoC 6版系の表記ゆれをまとめ、7版系の表記を除外して検索します。",
    CoC7: "CoC 7版・新クトゥルフ神話TRPG系の表記ゆれをまとめ、6版系の表記を除外して検索します。",
    エモクロア: "エモクロアTRPG関連の表記ゆれをまとめて検索します。",
    ガイアケア: "Gaiakea / ガイアケア関連の投稿を検索します。",
    マダミス: "マダミス・マーダーミステリー関連の表記ゆれをまとめて検索します。",
    インセイン: "インセイン関連の表記ゆれをまとめて検索します。",
    ソードワールド: "ソード・ワールド関連の表記ゆれをまとめて検索します。",
    "D&D": "D&D / ダンジョンズ＆ドラゴンズ関連の表記ゆれをまとめて検索します。",
    シノビガミ: "シノビガミ関連の表記ゆれをまとめて検索します。",
    ダブルクロス: "ダブルクロス関連の表記ゆれをまとめて検索します。",
  };

  const defaultFavorites = [
    { label: "#さけひよダカーポ filter:images lang:ja", query: "#さけひよダカーポ filter:images lang:ja" },
    { label: "#繋がらなくていいから俺のココフォリア部屋を見てくれ filter:images", query: '("# 繋がらなくていいから俺のココフォリア部屋を見てくれ" OR "#繋がらなくていいから俺のココフォリア部屋を見てくれ" OR "繋がらなくていいから俺のココフォリア部屋を見てくれ") filter:images' },
    { label: "ココフォ部屋グッドデザイン賞 filter:images", query: "ココフォ部屋グッドデザイン賞 filter:images" },
    { label: "ルームZIP付き filter:images", query: `${wordQueries["ルームZIP付き"]} filter:images` },
  ];

  const defaultPresets = [
    { title: "最新 CoC PL募集", desc: "直近3日以内のCoC系PL募集を探す基本セット", query: `(#PL募集 OR "PL募集") ("CoC" OR #CoC OR "CoC6" OR #CoC6 OR "CoC7" OR #CoC7 OR "Call of Cthulhu" OR "クトゥルフ神話TRPG" OR "新クトゥルフ神話TRPG" OR "クトゥルフTRPG" OR "新クトゥルフTRPG" OR "クトゥルフ" OR "6版" OR "7版") __SINCE_3DAYS__ lang:ja`, tag: "Recruit" },
    { title: "ココフォ部屋グッドデザイン賞", desc: "ココフォリア部屋の受賞・参考デザイン画像を探す", query: '("ココフォ部屋グッドデザイン賞" OR "#ココフォ部屋グッドデザイン賞2022" OR "#ココフォ部屋グッドデザイン賞2023" OR "#ココフォ部屋グッドデザイン賞2024" OR "#ココフォ部屋グッドデザイン賞2025") filter:images lang:ja', tag: "Images" },
    { title: "最新 エモクロア PL募集", desc: "直近3日以内のエモクロア系PL募集を探す基本セット", query: `(#PL募集 OR "PL募集") ("エモクロア" OR "エモクロアTRPG" OR #エモクロア OR #エモクロアTRPG OR "Emoklore") __SINCE_3DAYS__ lang:ja`, tag: "Recruit" },
    { title: "立ち絵閲覧ハッシュタグ", desc: "癖を詰め込んだ最高の女性・男性立ち絵タグの画像検索", query: "(#あなたの癖を詰め込んだ最高の女性を見せてください OR #あなたの癖を詰め込んだ最高の男性を見せてください) filter:images lang:ja", tag: "Tachie" },
    { title: "新作シナリオ検索", desc: "直近1か月以内の新作シナリオ告知を探す", query: "シナリオ (filter:images OR filter:links) lang:ja __SINCE_1MONTH__", tag: "Scenario" },
    { title: "最新 TRPG配信", desc: "直近3日以内のTRPG配信・告知を探す", query: "TRPG配信 (filter:images OR filter:links OR filter:videos) __SINCE_3DAYS__", tag: "Stream" },
  ];

  const defaultScenarioSearches = [
    { label: "感想", query: '"星環のダ・カーポ" lang:ja 感想 (fusetter OR poipiku)' },
    { label: "立ち絵", query: '"星環のダ・カーポ" filter:images ("CoC" OR "Call of Cthulhu" OR "HO" OR "クトゥルフ神話TRPG" OR 立ち絵)' },
    { label: "お部屋", query: '"星環のダ・カーポ" filter:images 部屋' },
  ];

  return { systemQueries, wordQueries, excludeQueries, modes, modeVisualWordMap, modePresets, addWords, filters, excludes, chipDescriptions, defaultFavorites, defaultPresets, defaultScenarioSearches };
})();
