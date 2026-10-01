# CoCハウスルール表メーカー / CoC House Rule Table Prepper

クトゥルフ神話TRPG 6版・7版の卓で使うハウスルールを表にまとめ、PNG・テキスト・Markdownで書き出すツール。画面は日本語・英語・韓国語。

## ファイル

- `js/rules.js` — ルールのテンプレート（6版・7版・版共通）。1行 = `r(id, カテゴリ, 名前, ひとこと説明, 選択肢, ルールブック準拠の値, よくある卓の値, 最初から表に載せるか)`。選択肢の最後には自動で「※（変更あり）」が付く。数値つきの選択肢は `n(id, ラベル（{n} が数値になる）, 初期値, 最小, 最大)`。
- `js/i18n.js` — 画面の文言（ja / en / ko）。
- `js/exporter.js` — 書き出し。`toText` / `toMarkdown` / `renderPng`（canvasに直接描く。横長960px・縦長600px、2倍解像度）。
- `js/app.js` — 編集画面、プリセット、自動保存（localStorage `houseRuleTable.v1`）、ファイル保存・読込（`.hrt.json`）、スマホのスワイプ操作。

## ルールを足すとき

`rules.js` の該当する版の配列に `r(...)` を1行足す。`id` は版の中で重複しないこと（保存データのキーになるので、公開後は変えない）。カテゴリは `CATS` のキー。

## 公開状態

クローズドテスト中: `tools.json` は `status: "idea"`・`href: ""`、`index.html` に `noindex`。一般公開時は `href` を入れ、`noindex` を外し、changelog に追記する。
