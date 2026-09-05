# tests

チャパレ整形ツールの回帰テスト。ビルド不要、Node 18+ の標準モジュールのみ。

```bash
cd tools/chat-palette-formatter
node tests/run.mjs            # 検証
node tests/run.mjs --update   # スナップショットを現在の出力で更新
```

## 何を見ているか

- `sources.js` の `detectService()` が各フィクスチャで期待どおりのサービスを返すか
  （期待値は `run.mjs` の `EXPECTED_SERVICE`）
- `parser.js` の `buildOutput()` の出力が `snapshots/*.snap.txt` と一致するか
  （＝リファクタで既存の整形結果が変わっていないことの確認）

## ディレクトリ

```
fixtures/    各サービスの実サンプル（*.json / *.txt）
snapshots/   buildOutput() の現行出力。コミット対象。差分が出たら意図的か確認する
run.mjs      ハーネス
```

## フィクスチャ

| ファイル | 由来 | 備考 |
|---|---|---|
| `charash-6e.json` | キャラッシュ こま形式 | `〈技能〉` 記法、`／` 区切り、`coc6` URL |
| `iachara-6e-learned.json` | いあきゃら こま形式 | 習得技能のみ出力 |
| `iachara-6e-allskills.json` | いあきゃら こま形式 | 全技能出力（初期値セクション振り分けの検証用 ← 後続PRで挙動追加予定） |
| `charaeno-7e.json` | Charaeno こま形式 | ブラケット無し技能名、`（（注記））`、`/7th/` URL |
| `character-storage-sheet.txt` | キャラクター保管庫 テキストシート | `■`セクション / `《技能》` / 罫線。長文の過去・Q&Aは容量のため一部省略 |
| `character-storage-commands.txt` | キャラクター保管庫 末尾コマンド群のみ | `:HP+` `:SAN-` を含む |

新しい Parser を追加する PR では、対応するフィクスチャとスナップショットを足すこと。
既存スナップショットが変わる場合は、その差分を PR 説明に明記する。
