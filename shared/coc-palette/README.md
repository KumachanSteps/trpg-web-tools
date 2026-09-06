# shared/coc-palette

CoC（クトゥルフ神話TRPG）のキャラ駒データ解析とチャットパレット整形の共通ロジック。
複数ツールから `<script>` で読み込んで使う（ビルド不要・依存なし）。

## ファイル

| ファイル | グローバル | 役割 |
|---|---|---|
| `parser.js` | `window.ChatPaletteParser` | 技能名の正規化、`buildOutput(text, edition, options)` によるチャパレ整形、`analyzePalette()` |
| `sources.js` | `window.ChatPaletteSources` | 入力元（いあきゃら / キャラッシュ / Charaeno / キャラクター保管庫）の自動判定 |
| `schema.js` | `window.ChatPaletteSchema` | 共通 Character スキーマへの正規化（`buildCharacter`）、CCFOLIA こま形式JSONへの変換（`toKomaJson`、`shouldExportKoma`）。`parser.js` / `sources.js` を先に読み込むこと |

いずれも Node では `module.exports` される（`require` 時は先に `globalThis.window` を用意）。

## 読み込み順

```html
<script src="../../shared/coc-palette/parser.js"></script>
<script src="../../shared/coc-palette/sources.js"></script>
<script src="../../shared/coc-palette/schema.js"></script>
```

## `buildOutput` のオプション

| キー | 既定 | 説明 |
|---|---|---|
| `initialToCategory` | `false` | `true` で、値が初期値と一致する技能もカテゴリに残す（既定は初期値セクションへ集約） |
| `injectMotherTongue` | `false` | `true` で `母国語：(要編集)` を EDU から補完（GM用キャラシビューアーで使用） |
| `eduValue` | — | `injectMotherTongue` 時に母国語の数値へ使う EDU 値（未指定ならパレット本文から推定） |

## 利用ツール

- `tools/chat-palette-formatter/` — CoCチャパレ整形ツールv2
- `tools/gm-charashi-viewer/` — GM用キャラシビューアー（`js/charashi-cards.js` がカード表示、整形は本ライブラリへ委譲）

## テスト

`tools/chat-palette-formatter/tests/run.mjs`（`node tests/run.mjs`）が本ライブラリを
`require` して検証する。`parser.js` 末尾の `runSelfTests()` はブラウザ読み込み時にも走る。

設計の詳細は [`character-schema.md`](./character-schema.md)。
