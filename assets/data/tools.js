window.TRPG_PORTAL_TOOLS = [
    {
      id: "dice-stat-analyst",
      icon: "📊",
      status: "available",
      category: "logAnalysis",
      href: "./tools/dice-stat-analyst/",
      name: {
        ja: "ダイス解析アナライザー",
        en: "Dice Stat Analyst",
      },
      description: {
        ja: "セッションログHTML / テキストから、探索者ごとの成功率・クリティカル・ファンブル・出目分布を解析します。",
        en: "Analyze session logs and review each character’s success rate, criticals, fumbles, and dice roll distribution.",
      },
    },
    {
      id: "session-report-generator",
      icon: "📝",
      status: "available",
      category: "reportWriting",
      href: "./tools/session-report-generator/",
      name: {
        ja: "卓報告ジェネレーター",
        en: "Session Report Generator",
      },
      description: {
        ja: "KP・PL・PC情報を入力し、X/Twitter向けの卓報告文を生成・編集・プレビューします。",
        en: "Generate, edit, and preview session report posts for X/Twitter by entering KP, PL, and PC information.",
      },
    },
    {
      id: "chat-palette-formatter",
      icon: "💬",
      status: "available",
      category: "characterUtility",
      href: "./tools/chat-palette-formatter/",
      name: {
        ja: "チャットパレット整形ツール",
        en: "Chat Palette Formatter",
      },
      description: {
        ja: "CoC 6版・7版のチャットパレットを判定し、読みやすい形式へ整形するツールです。",
        en: "A tool for formatting CoC 6e/7e chat palettes into a cleaner and more readable structure.",
      },
    },
    {
      id: "charamemo-generator",
      icon: "📋",
      status: "available",
      category: "characterUtility",
      href: "./tools/iachara-charamemo-creator/",
      name: {
        ja: "いあキャラMEMOジェネレータ",
        en: "Charamemo Generator",
      },
      description: {
        ja: "いあきゃらのキャラクター情報から、キャラメモやコマ用データを生成するツールです。",
        en: "A tool for generating character memo and token-ready data from Iachara character information.",
      },
    },
    {
      id: "coc-growth-checker",
      icon: "🌱",
      status: "available",
      category: "logAnalysis",
      href: "./tools/coc-growth-checker/",
      name: {
        ja: "CoC 6版/7版 成長チェッカー",
        en: "CoC 6e/7e Growth Checker",
      },
      description: {
        ja: "セッションログから、CoC 6版・7版の成長チェック対象技能をハウスルール別に抽出・整理します。",
        en: "Extract and organize CoC 6e/7e growth check candidates from session logs according to selected house rules.",
      },
    },
    {
      id: "gm-charashi-viewer",
      icon: "👥",
      status: "available",
      category: "gmSupport",
      href: "./tools/gm-charashi-viewer/",
      name: {
        ja: "GM用キャラシビューワー",
        en: "GM Character Sheet Viewer",
      },
      description: {
        ja: "KP / GM向けに、複数のキャラクターシートを一画面で確認・管理するビューアです。",
        en: "A GM/KP support tool for viewing and managing multiple character sheets on one screen.",
      },
    },
    {
      id: "trpg-hashtag-searcher",
      icon: "#️⃣",
      status: "available",
      category: "infoGathering",
      href: "./tools/trpg-hashtag-searcher/",
      name: {
        ja: "使えるハッシュタグ検索",
        en: "Usable Hashtag Finder",
      },
      description: {
        ja: "TRPG配信や卓報告に使えるハッシュタグを、シナリオ名・配信名・関連語句から探しやすくする検索支援ツールです。",
        en: "A hashtag search support tool for finding usable hashtags for TRPG livestreams, session reports, scenarios, and related keywords.",
      },
    },
    {
      id: "scenario-info-snippet-builder",
      icon: "✂️",
      status: "production",
      category: "scenarioPrep",
      href: "./tools/scenario-snippet-builder/",
      name: {
        ja: "シナリオ情報カードビルダー",
        en: "Scenario Info Snippet Builder",
      },
      description: {
        ja: "シナリオ情報、探索箇所、資料、技能成功情報などをCCFOLIA / Discord向けに整形します。",
        en: "Format scenario information, investigation points, documents, and skill-success snippets for CCFOLIA or Discord.",
      },
    },
    {
      id: "npc-data-reader",
      icon: "🧾",
      status: "available",
      category: "gmSupport",
      href: "./tools/npc-data-reader/",
      name: {
        ja: "NPCデータリーダー",
        en: "NPC Data Reader",
      },
      description: {
        ja: "NPCデータやステータス情報を読み取り、セッション中に確認しやすい形式へ整理するGM/KP向け補助ツールです。",
        en: "A GM/KP support tool for reading NPC data and organizing stats into an easier-to-reference format during sessions.",
      },
    },
    {
      id: "chara-sabun-kanri-tool",
      icon: "🎭",
      status: "available",
      category: "characterUtility",
      href: "./tools/chara-sabun-kanri-tool/",
      name: {
        ja: "キャラ差分管理ツール",
        en: "Character Expression Manager",
      },
      description: {
        ja: "キャラクター立ち絵の表情差分や画像差分を整理し、TRPGセッションや配信用に管理しやすくするツールです。",
        en: "A tool for organizing character expression and portrait variations for TRPG sessions and streaming use.",
      },
    },
    {
      id: "kantan-icon-maker",
      icon: "🖼️",
      status: "production",
      category: "characterUtility",
      href: "./tools/kantan-icon-maker/",
      name: {
        ja: "かんたんアイコンメーカー",
        en: "Kantan Icon Maker",
      },
      description: {
        ja: "キャラクター立ち絵PNGから、TRPG用の1:1アイコンをかんたんに作成するツールです。",
        en: "A simple tool for creating 1:1 TRPG icons from character standing PNG images.",
      },
    },
    {
      id: "session-log-tool",
      icon: "🗒️",
      status: "production",
      category: "reportWriting",
      href: "./tools/session-log-tool/",
      name: {
        ja: "卓ログトラッカー",
        en: "Session Log Tracker",
      },
      description: {
        ja: "遊んだ卓を記録し、感想・卓報告・プレイ済みリストへつなげるログ管理ツール。テーブルで履歴を整理し、各行から「卓報告ジェネレーター」へ連携できます。",
        en: "A session log management tool for recording played sessions and connecting them to reflections, session reports, and played-session lists.",
      },
    },
    {
      id: "chara-libra-tool",
      icon: "🧑‍🚀",
      status: "production",
      category: "characterUtility",
      href: "./tools/chara-libra-tool/",
      name: {
        ja: "キャラクタ星間図",
        en: "Chara Libra",
      },
      description: {
        ja: "TRPGキャラクターを一覧化し、立ち絵・プロフィール・技能・メモなどを整理して管理するためのキャラクターアーカイブツールです。",
        en: "A character archive tool for organizing TRPG characters with portraits, profiles, skills, notes, and related information.",
      },
    },
    {
      id: "scenario-dtp-designer",
      icon: "📐",
      status: "production",
      category: "scenarioPrep",
      href: "./tools/scenario-dtp-designer/",
      name: {
        ja: "シナリオDTPデザイナー",
        en: "Scenario DTP Designer",
      },
      description: {
        ja: "シナリオ本文を見やすいレイアウトに整え、PDF化や配布用テキストの下準備を支援するDTP補助ツールです。",
        en: "A DTP support tool for arranging scenario text into a readable layout and preparing it for PDF or distribution-ready formatting.",
      },
    },
    {
      id: "scenario-pdf-parser",
      icon: "📄",
      status: "production",
      category: "scenarioPrep",
      href: "./tools/scenario-pdf-parser/",
      name: {
        ja: "シナリオPDFパーサー",
        en: "Scenario PDF Parser",
      },
      description: {
        ja: "シナリオPDFをTXT形式に変換し、コピペしやすいテキストとして整理するためのツールです。",
        en: "A tool for parsing scenario PDFs into TXT format for easier copying and pasting.",
      },
    },
    {
      id: "trpg-haishin-observatory",
      icon: "🔭",
      status: "idea",
      category: "haishinTracking",
      href: "",
      name: {
        ja: "TRPG配信観測所",
        en: "TRPG Haishin Observatory",
      },
      description: {
        ja: "YouTubeのTRPG配信予定を整理し、シナリオ・チャンネル・GM/KP/PL・ハッシュタグから検索、Fav管理する観測ツール構想です。",
        en: "A future observatory tool for tracking TRPG livestream schedules and filtering by scenario, channel, GM/KP/PL, hashtag, and favorites.",
      },
    },
    {
      id: "trpg-scenario-organizer",
      icon: "🗂️",
      status: "idea",
      category: "infoGathering",
      href: "",
      name: {
        ja: "TRPGシナリオ データベース",
        en: "TRPG Scenario Organizer",
      },
      description: {
        ja: "BOOTHやPixivなどで見つけたTRPGシナリオを、システム・人数・時間・秘匿有無・テーマなどで整理、検索するデータベース構想です。",
        en: "A future database concept for organizing TRPG scenarios by system, player count, playtime, hidden handouts, themes, and favorites.",
      },
    },
    {
      id: "dice-table-tool",
      icon: "🎲",
      status: "production",
      category: "scenarioPrep",
      href: "./tools/dice-table-tool/",
      name: {
        ja: "ダイス表ツール",
        en: "Dice Table Tool",
      },
      description: {
        ja: "食事・飲み物・NPC特徴・イベントなど、TRPGで使えるオリジナルダイス表を作成・管理するツールです。",
        en: "A tool for creating and managing original TRPG dice tables, such as food, drinks, NPC traits, and random events.",
      },
    },
  ];
