/* NPCデータリーダー checked-scenario.js
   Parser behavior confirmed with user-provided scenario NPC samples. */
window.NPC_DATA_READER_CHECKED_SCENARIOS = [
  {
    title: '誰が為のソティラス',
    formatType: 'doujin',
    checkedVersion: 'v1.509',
    checkedAt: '2026-06-17',
    notes: [
      '・名前(読み) 形式のNPC区切りに対応',
      'HP/MP/MOV の同一行ステータスに対応',
      'MOVを移動、BLDをビルドとして取得',
      'DB:1D4を+1D4へ正規化',
      '拳銃・近接戦闘・回避を戦闘欄へ分類'
    ]
  }
  ,{
    title: 'DIAMOND RIP TRIP',
    formatType: 'doujin-direct-command-enemy',
    checkedVersion: 'v1.510',
    checkedAt: '2026-06-17',
    notes: [
      '【エネミー:名前(説明)】形式に対応',
      '既存CCBコマンドをチャットパレット向けに整形',
      '1d3 (DEXにダメージ) 形式のダメージ対象注釈に対応',
      '耐久値50(人数) をHPとして取得',
      '耐久値なし＋装甲説明を補足として保持'
    ]
  }
  ,{
    title: 'けだもの窟に吠ゆる頃に',
    formatType: 'doujin-deity-long-description',
    checkedVersion: 'v1.491',
    checkedAt: '2026-06-17',
    notes: [
      '長文説明後の能力値・戦闘・装甲・呪文を解析',
      '技能値のない特殊能力を // ▼ 能力 として出力',
      '怒りの「叫び」を能力セクションへ配置',
      '呪文セクションの後に能力セクションを出力'
    ]
  }
  ,{
    title: 'ビスポークランドでなにがあったか？',
    formatType: 'doujin-mixed-npc-staff-enemy',
    checkedVersion: 'v1.494',
    checkedAt: '2026-06-17',
    notes: [
      '▼スタッフの説明/肩書き誤取得を修正',
      '同一行複数技能を個別分解し、組み付き・回避のみ戦闘欄へ分類',
      '●名前 形式の主要NPCデータに対応',
      '英字名 - 肩書き行から説明/肩書きを取得',
      '[能力値] / [技能] ブロックを解析',
      '▼スタッフ / ▼警備員 などの簡易エネミー見出しに対応',
      '同一行に複数並ぶ技能値と括弧内ダメージに対応',
      '装甲と武器ブロックを戦闘用情報として保持'
    ]
  }
  ,
  {
    title: 'ビスポークランドでなにがあったか？',
    formatType: 'doujin-compact-enemy-weapon-block',
    checkedVersion: 'v1.496',
    checkedAt: '2026-06-17',
    notes: [
      '▼スタッフ/▼警備員などの簡易敵データに対応',
      '[技能] の同一行複数技能を個別分解',
      '[武器] ブロックの武器名を技能名へ誤結合しない',
      '拳銃30％（ダメージ1d10）を拳銃判定＋拳銃・ダメージへ整形'
    ]
  }
  ,
  {
    title: 'UI/CSS regression check',
    formatType: 'layout-resource-path',
    checkedVersion: 'v1.496',
    checkedAt: '2026-06-17',
    notes: [
      'index.html が css/style.css を参照することを確認',
      'js/main.js 等の現在フォルダ構成を参照することを確認',
      'v1.496 のキャッシュ対策クエリをCSS/JSに付与'
    ]
  }

  ,{
    title: '汎用公式系NPCデータ',
    formatType: 'official-comma-heading',
    checkedVersion: 'v1.497',
    checkedAt: '2026-06-17',
    notes: [
      'NPC名、肩書き 形式の見出しに対応',
      'mnvr行をNPC見出しとして誤認しないよう修正',
      '解析ごとに状態を初期化し、前回データ混入を防止'
    ]
  }

  ,{
    title: 'ビスポークランドでなにがあったか？',
    formatType: 'doujin-bespoke-npc-blocks',
    checkedVersion: 'v1.500',
    checkedAt: '2026-06-17',
    notes: [
      '●名前形式の主要NPCブロックに対応',
      '英字名 - 肩書き行から説明/肩書きを取得',
      '括弧だけの注釈行をNPC区切りとして誤認しないよう修正',
      '[能力値]/[技能]ブロックを注釈行の後まで継続解析'
    ]
  },
  {
    title: 'UI / CCFOLIA JSON status handling',
    formatType: 'ui-json-output',
    checkedVersion: 'v1.501',
    checkedAt: '2026-06-17',
    notes: [
      'ステータス欄に 装甲・残弾・武器耐久 を追加',
      '空欄のHP/MP/SANをJSON statusから除外',
      'ビルド・移動・装甲・残弾・武器耐久をvalueのみのstatusとして出力',
      'DBはparamsに保持'
    ]
  }

  ,{
    title: 'UI / CCFOLIA JSON status output',
    formatType: 'ui-json-status-fields',
    checkedVersion: 'v1.502',
    checkedAt: '2026-06-17',
    notes: [
      'ステータス欄に装甲・残弾・武器耐久を追加',
      'HP/MP/SANは空欄ならstatusへ出力しない',
      'ビルド・移動・装甲・残弾・武器耐久は値がある場合のみstatusへ出力しmaxを付けない'
    ]
  }

  ,{
    title: 'UI layout correction v1.503',
    formatType: 'ui-layout',
    checkedVersion: 'v1.503',
    checkedAt: '2026-06-17',
    notes: [
      'ステータス欄を3列×3行で表示',
      '装甲・残弾・武器耐久をステータス欄3行目に配置',
      '能力値欄をSTR/CON/POW/DEX、APP/SIZ/INT/EDUの順で表示',
      'ヘッダーのバージョン表記をv1.503へ更新'
    ]
  }
  ,{
    title: 'The Clear Water',
    formatType: 'doujin-pdf-long-description',
    checkedVersion: 'v1.511',
    checkedAt: '2026-06-17',
    notes: [
      '§名前 形式のNPC見出しに対応',
      'PDFコピー由来の長い本文説明を能力値ブロックまでスキップ',
      '本文説明中の読点をNPC区切りとして誤認しないよう修正',
      '能力値:STR 50 CON 65... の同一行形式に対応',
      '耐久度をHPとして取得',
      '移動8 の詰まった表記に対応',
      'ダメージ;式 のセミコロン表記に対応',
      '読点区切りの複数技能に対応'
    ]
  },
  {
    title: 'ラストルージュ',
    formatType: 'doujin-status-example-skills',
    checkedVersion: 'v1.515',
    checkedAt: '2026-06-17',
    notes: [
      '◆ロイド・ブラッド形式を確認',
      '◎ステータス例:STR17 を技能として出力しない',
      '山括弧技能を戦闘/技能へ分類'
    ]
  }
  ,{
    title: 'The Clear Water',
    formatType: 'doujin-pdf-long-description-ben-henderson',
    checkedVersion: 'v1.519',
    checkedAt: '2026-06-17',
    notes: [
      '§ベン・ヘンダーソン形式を確認',
      '本文中の読点行をNPC区切りとして誤認しないよう修正',
      'ダメージ・ボーナスをDBとして取得',
      '近接格闘・射撃・回避の読点区切り戦闘技能を個別解析'
    ]
  }


  ,{
    title: 'The Clear Water',
    formatType: 'doujin-pdf-long-description-equipment',
    checkedVersion: 'v1.520',
    checkedAt: '2026-06-17',
    notes: [
      '§ベン・ヘンダーソンの装備ブロックを確認',
      '銃撃/格闘装甲を装甲欄とstatus装甲へ反映',
      'ショットガン、マグナム・リボルバー、スタンガンをチャットパレットの戦闘補足へ保持'
    ]
  }

  ,
  {
    title: 'The Clear Water 装備ブロック',
    formatType: 'doujin-pdf-equipment-block',
    checkedVersion: 'v1.521',
    checkedAt: '2026-06-17',
    notes: ['装備ブロックを装甲と装備に分離', '装備内の装甲値を技能として誤取得しない', '武器名を // ▼ 装備 に出力']
  }
];
