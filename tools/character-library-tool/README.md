# Character Library / キャラクターライブラリ

TRPGキャラクターを一覧・検索・個別表示する静的Webツールです。

## ファイル構成

```text
character-library-tool/
├── index.html
├── character.html
├── character-library.css
├── character-library.js
├── data/
│   └── characters.js
└── README.md
```

## 使い方

1. `index.html` をブラウザで開きます。
2. キャラクターアイコンをクリックすると `character.html?id=...` で個別ページが開きます。
3. キャラクター情報は `data/characters.js` の `CHARACTERS` 配列に追加します。

## 主な機能

- アイコン中心のキャラクターギャラリー
- 名前・シナリオ・タグ・技能名検索
- システム / 状態 / 能力値 / 技能値 / タグによる絞り込み
- 登録数カードのカウントアップ演出
- ホバー時のキャラクタープレビュー
- 個別ページ
  - 左：フルボディ立ち絵風表示、名前、版、いあきゃらリンク、職業、年齢/性別/身長、テーマカラー
  - 右：parameter / skills / weapons-items / character memo
- メモタブ
- 秘匿 / KPメモの表示・非表示

## データ追加例

```js
{
  id: "sample-character",
  name: "探索者名",
  reading: "たんさくしゃめい",
  system: "coc6",
  status: "active",
  editionLabel: "CoC 6版",
  icon: "◆",
  favorite: false,
  hasHitoku: true,
  scenario: "シナリオ名",
  occupation: "職業",
  age: "20歳",
  gender: "男性",
  height: "170cm",
  themeColor: "#3B6EA8",
  themeLabel: "#3B6EA8 / Blue",
  iacharaUrl: "https://iachara.com/char/view/xxxx",
  summary: "簡単な説明。",
  tags: ["探偵", "hitoku ari"],
  variants: ["通常", "戦闘"],
  params: { STR: 10, CON: 10, POW: 10, DEX: 10, APP: 10, SIZ: 10, INT: 10, EDU: 10, HP: 10, MP: 10, SAN: 50, "幸運": 50, DB: "0" },
  skills: [
    { name: "目星", value: 70, category: "探索", note: "よく使う技能。" }
  ],
  items: [
    { name: "所持品", type: "item", description: "説明", stats: ["item"] }
  ],
  memo: {
    "概要": "公開メモ",
    "秘匿": "秘匿メモ",
    "KPメモ": "KP向けメモ"
  }
}
```

## メモ

- 画像ファイルを使う場合は、`assets/characters/` に配置し、CSS/JS側で実画像表示に差し替えてください。
- 現在の立ち絵はモック表示です。
