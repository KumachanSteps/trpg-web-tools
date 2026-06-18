/* NPCデータリーダー parser.js
   v1.509: parser rule notes for official + doujin scenario formats.
   The active parser implementation currently lives in main.js and reads these
   rule notes as project documentation for future parser extraction. */
window.NPC_DATA_READER_PARSER_RULES = window.NPC_DATA_READER_PARSER_RULES || [];
window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-dot-name-furigana-stat-lines-v1',
  version: 'v1.489',
  scenario: '誰が為のソティラス',
  notes: [
    '・名前(読み) 形式をNPC見出しとして認識する。',
    'この形式ではNPC名から読み括弧を外し、名前のみをCCFOLIA駒名候補にする。',
    'HP/MP/MOV が同一行にある表記を解析する。',
    'MOVを移動、BLDをビルドとして取得する。',
    'DB:1D4 のようなプラス記号なしのDBを +1D4 に正規化する。',
    '拳銃、近接戦闘(格闘)、回避を戦闘欄に分類する。',
    '複数NPCブロックが貼り付けられた場合は、現行UIでは先頭NPCブロックを解析対象にする。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-direct-command-enemy-v1',
  version: 'v1.490',
  scenario: 'DIAMOND RIP TRIP',
  notes: [
    '【エネミー:名前(説明)】形式をNPC見出しとして認識する。',
    '既存の CCB<= / CC<= / 1D100<= 行を保持しつつ、CCB<=40 鉱石化 を CCB<=40 【鉱石化】形式に整形する。',
    '1d3 (DEXにダメージ) を 1D3 【DEXにダメージ】形式に整形する。',
    '耐久値50(人数) をHP 50として取得し、耐久値なし＋装甲説明は装甲/メモとして保持する。',
    '括弧だけの注意書きは戦闘補足として保持する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-kedamono-kutsu-deity-ability-section-v1',
  version: 'v1.491',
  scenario: 'けだもの窟に吠ゆる頃に',
  notes: [
    '技能値のない特殊能力は // ▼ 能力 セクションとして出力する。',
    '呪文セクションがある場合、// ▼ 呪文 の後に // ▼ 能力 を出力する。',
    '怒りの「叫び」は能力として保持し、POWロール失敗時の行動不能メモと1D6正気度喪失コマンドを出力する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'official-like-multiple-name-age-title-pdf-wrap-v1',
  version: 'v1.492',
  scenario: 'けだもの窟に吠ゆる頃に',
  notes: [
    'NPC名(年齢)、肩書き 形式を複数NPC区切りとして認識する。',
    '複数NPCが連続する場合、現行UIでは先頭NPCブロックを解析対象にする。',
    '主な技能 : を技能ブロック開始として認識する。',
    'PDF由来の改行で クトゥル / フ神話 のように分割された技能名をクトゥルフ神話に復元する。',
    '近接戦闘(格闘)60%(30/12)、ダメージ1D3+DB と 回避35%(17/7) を戦闘欄へ分類する。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-bespoke-land-mixed-npc-staff-v1',
  version: 'v1.493',
  scenario: 'ビスポークランドでなにがあったか？',
  notes: [
    '●名前 形式の主要NPCブロックに対応する。',
    '英字名 - 肩書き の2行目から説明/肩書きを取得する。',
    '[能力値] と [技能] ブロックの6版能力値・技能を解析する。',
    '技能名（65%）や同一行に複数並ぶ技能を解析する。',
    '▼スタッフ / ▼警備員 などの簡易エネミー見出しをNPC区切りとして認識する。',
    '組み付き25％ 回避50% のようなスペース区切り複数技能に対応する。',
    '拳銃30％（ダメージ1d10）や投擲25％（ダメージ1d4）の括弧内ダメージを技能ダメージとして取得する。',
    '[武器] ブロックの ダメージXdY 表記を戦闘補足として保持する。',
    '装甲:5 / 装甲:8 を装甲欄として取得する。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-bespoke-land-staff-inline-skill-fix-v1',
  version: 'v1.494',
  scenario: 'ビスポークランドでなにがあったか？',
  notes: [
    '▼スタッフ のような簡易見出しでは、[能力値] や [技能] 以降を説明/肩書きとして誤取得しない。',
    '組み付き25％ 回避50% 目星25％ のような同一行複数技能を個別に分解する。',
    '戦闘欄には組み付き・回避など戦闘技能のみを出し、目星など通常技能は技能欄へ分類する。',
    '複数技能行の末尾全体を1つの技能名として拾う誤検出を防止する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'bespoke-land-compact-enemy-weapon-block-fix-v1',
  version: 'v1.495',
  scenario: 'ビスポークランドでなにがあったか？',
  notes: [
    '▼警備員などの簡易敵データで、[技能] の同一行複数技能を個別に分解する。',
    '[武器] ブロックの武器名を技能名へ結合しない。',
    '技能行に拳銃30％（ダメージ1d10）がある場合は、拳銃の判定と拳銃・ダメージとして出力する。',
    '[武器] ブロックの同一ダメージは重複させず、武器補足として保持する。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'consolidated-regression-fixes-v1',
  version: 'v1.496',
  scenario: 'multiple confirmed samples through ビスポークランドでなにがあったか？',
  notes: [
    'index.html のCSS/JS参照を css/ と js/ の現在フォルダ構成に固定し、キャッシュ対策のクエリを付与する。',
    '呪文:《A》《B》、ほかに... のような同一行複数呪文を分割して // ▼ 呪文 に出力する。',
    '移動:9/飛行 12 のような複合移動値を保持する。',
    '近接戦闘80%、ダメージ4D6 のような読点区切りダメージを技能ダメージとして取得する。',
    '1ラウンドの攻撃回数 や (mnvr) を含む戦闘補足行を戦闘欄に保持する。',
    '▼スタッフ/▼警備員 の簡易敵データでは、目星など非戦闘技能を戦闘欄へ混入させない。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'official-comma-heading-combat-mnvr-guard-v1',
  version: 'v1.497',
  scenario: '汎用公式系NPCデータ',
  notes: [
    'NPC名、肩書き 形式の先頭行をNPC見出しとして認識する。',
    '首を絞める（mnvr）のような戦闘補足行をNPC見出しとして誤認しない。',
    '解析開始時に前回の解析状態をリセットし、古い名前・DB・HPなどが残らないようにする。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'doujin-bespoke-parenthetical-note-not-heading-v1',
  version: 'v1.498',
  scenario: 'ビスポークランドでなにがあったか？',
  notes: [
    '（※HO1にのみ...）のような括弧だけの注釈行をNPC見出しとして扱わない。',
    '●名前形式のNPCブロックで、注釈行の後に続く[能力値]/[技能]まで同一NPCとして解析する。',
    '技能ブロック内の回避・キック・拳銃・クラヴマガを戦闘欄、応急手当・聞き耳・図書館などを技能欄へ分類する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'bespoke-land-prose-heading-guard-v1',
  version: 'v1.500',
  scenario: 'ビスポークランドでなにがあったか？',
  notes: [
    '長い本文説明中の読点をNPC見出しとして誤認しない。',
    '●名前（R）のようなコードネーム括弧は読み仮名として削除しない。',
    '[能力値]と[技能]が本文説明の後ろにある場合も同一NPCブロックとして解析する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'ui-status-extra-fields-v1',
  version: 'v1.501',
  scenario: 'UI / CCFOLIA JSON status handling',
  notes: [
    'NPCデータ編集のステータス欄に 装甲・残弾・武器耐久 を追加する。',
    'HP/MP/SAN は空欄の場合、CCFOLIA用NPC駒データの status に出力しない。',
    'ビルド・移動・装甲・残弾・武器耐久 は入力値がある場合、status に value のみで出力し、max は付けない。',
    'DBはチャットパレットの{DB}参照用として params に保持する。',
    '装甲:5、装弾数6、武器耐久 などの表記を対応するステータス欄へ反映する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'ui-status-extra-fields-v1',
  version: 'v1.502',
  scenario: 'UI / CCFOLIA JSON status output',
  notes: [
    'NPCデータ編集のステータス欄に装甲・残弾・武器耐久を追加する。',
    'HP/MP/SANは空欄ならCCFOLIA用NPC駒データのstatusへ出力しない。',
    'ビルド・移動・装甲・残弾・武器耐久は値がある場合だけstatusへ出力し、maxは付与しない。',
    'DBは従来通りparamsに残す。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'ui-status-ability-layout-v1',
  version: 'v1.503',
  scenario: 'UI layout correction',
  notes: [
    'NPCデータ編集のステータス欄を3列×3行に固定する。',
    'ステータス欄の並びは HP/耐久力・MP・SAN/正気度、DB・ビルド・移動、装甲・残弾・武器耐久。',
    '能力値欄を4列×2行に固定し、STR・CON・POW・DEX、APP・SIZ・INT・EDU の順で表示する。',
    'ヘッダーバージョンとCSS/JSキャッシュキーを v1.503 に更新する。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'ui-status-ability-label-order-v1-507',
  version: 'v1.508',
  scenario: 'UI修正',
  notes: [
    'language.jsのラベル配列を、ステータス9項目+能力値8項目のDOM順に合わせる。',
    'ステータス欄は HP/耐久力・MP・SAN/正気度、DB・ビルド・移動、装甲・残弾・武器耐久。',
    '能力値欄は STR・CON・POW・DEX、APP・SIZ・INT・EDU。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'diamond-rip-trip-direct-command-enemy-v2',
  version: 'v1.510',
  scenario: 'DIAMOND RIP TRIP',
  notes: [
    '【エネミー:名前(説明)】直後の CCB<= 行をNPC見出しとして誤認しない。',
    'CCB<=40/2 鉱石化(従者の妨害後) のような既存コマンドを保持して整形する。',
    '1d3 (DEXにダメージ) を 1D3 【DEXにダメージ】 として保持する。',
    '※付き注釈と後続の説明文を戦闘補足として保持する。',
    '耐久値なし、装甲が厚い等の説明を装甲欄へ保持する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'the-clear-water-pdf-long-description-v2',
  version: 'v1.511',
  scenario: 'The Clear Water',
  notes: [
    '§名前 形式のPDFコピー由来NPCデータに対応する。',
    '本文説明中の読点行をNPC区切りとして誤認しないようにする。',
    '能力値: 以降をステータス・戦闘・技能解析対象として優先する。',
    '能力値:STR 50 CON 65... の同一行能力値に対応する。',
    '耐久度をHPとして取得する。',
    'ビルド 1 / 移動8 のようなコロンなし表記に対応する。',
    '技能名:40% ダメージ:1d6 / ダメージ;1d10 の揺れに対応する。',
    '読点区切りの 回避:31%、応急手当:37%、仲間を庇う:40% を個別解析する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'last-rouge-status-example-skill-filter-v1',
  version: 'v1.515',
  scenario: 'ラストルージュ',
  notes: [
    '◎ステータス例:STR17 のようなステータス例行を技能として誤取得しない。',
    '◆名前 形式のNPCで、能力値例の後に直接続く山括弧技能を解析する。',
    'ヘッダーのバージョン表記とCSS/JSキャッシュキーを v1.515 に更新する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'the-clear-water-pdf-long-description-v3-ben-henderson',
  version: 'v1.519',
  scenario: 'The Clear Water',
  notes: [
    '§名前 形式の長文説明中にある読点付き本文行をNPC区切りとして誤認しないよう、読点見出し判定を人物名らしい先頭行に限定する。',
    'ダメージ・ボーナス 1d4 のような中黒入り表記をDBとして取得し、+1D4に正規化する。',
    '近接格闘(格闘):70%、回避:51%、 のような読点区切り複数戦闘技能を個別解析する。',
    '近接格闘(大きな棍棒):70%、射撃(拳銃):70%、射撃(ショットガン):70% を戦闘欄に分類する。'
  ]
});


window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'the-clear-water-equipment-armor-weapons-v1',
  version: 'v1.520',
  scenario: 'The Clear Water',
  notes: [
    '装備: ブロックを解析し、ケプラーベスト等の装甲行を装甲欄とCCFOLIA statusの装甲へ反映する。',
    '銃撃に対する装甲 8 / 格闘ダメージに対する装甲4 のような行を装甲メモとして保持する。',
    '12ゲージショットガン、44口径マグナム・リボルバー、接触型スタンガン等の武器名を戦闘補足としてチャットパレットへ保持する。'
  ]
});

window.NPC_DATA_READER_PARSER_RULES.push({
  id: 'the-clear-water-equipment-block-v1',
  version: 'v1.521',
  scenario: 'The Clear Water',
  notes: [
    '装備: ブロックを戦闘・技能抽出対象から除外する。',
    'ケプラーベスト ※銃撃に対する装甲 8 のような装甲装備を // ▼ 装甲 に保持する。',
    '12ゲージショットガン、44口径マグナム・リボルバー、接触型スタンガンを // ▼ 装備 に分離する。'
  ]
});
