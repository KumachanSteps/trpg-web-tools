# KPレス・ジュークボックスメーカー

ココフォリア（CCFOLIA）のクリックアクションと `/scene シーン名` を使って、KPがいなくても動くジュークボックス部屋を作るツール。全シーンを並べ、マーカーパネルのクリックアクションを呼び出し先のシーンへの線として描く。

## できること

- ジュークボックスのテンプレート：プレーヤー1台＋レコード1〜12枚（初期値9枚）。レコードごとにテーマ（＝シーン名）・BGMの曲名・ラベル色・BGM（URLか音声ファイル）を決める。棚の札とプレーヤーの下の札には、テーマとBGMの曲名を2段で出す（曲名が空欄ならテーマだけ）。
  - シーン「停止中」＋レコードごとのシーン。各シーンでは、そのレコードがプレーヤーに載り、棚の同じ位置は空きになる。
  - 棚のレコードのクリックアクション：`/scene テーマ`。プレーヤーに載ったレコード：`/scene 停止中`。
  - 棚のレコードはジャケット（`assets/sleeve.png`）から直径の3割だけはみ出す。ジャケットは見本デザイン（白・ラベル色・グラデーション・ライン・サンバースト・ドット・リング）から選ぶか、画像を開く／ドラッグ＆ドロップして、ドラッグで移動・ホイール（2本指）で拡大縮小して切り抜く。切り抜いた画像はJPEGでブラウザに保存する。
  - 「ジャケットを表示する」をオフにすると、棚にはレコードだけが並ぶ（シーンの画面・シーン一覧・書き出すZIPのすべて）。
- シーンのつながり：全シーンを一覧し、クリックアクションの `/scene` を線で表示。重複したシーン名・存在しないシーンの呼び出しを警告。
- テストプレイ：ブラウザ上でレコードをクリックしてシーンを切り替えて試す。
- ルームZIPの書き出し・読み込み。読み込んだZIPのクリックアクションを編集して書き戻せる（ほかの中身はそのまま）。

## ルームZIPの形式（調べた範囲）

公式の資料はない。コミュニティの解析と既存ツールから確認できたこと：

```
__data.json  { meta: { version: '1.1.0' },
               entities: { room, items, decks, characters, effects, scenes },
               resources: { '<sha256>.png': { type: 'image/png' } } }
.token       '0.' + sha256(__data.json のバイト列)
<sha256>.<ext>  画像・音声。ファイル名は中身の SHA-256
```

- `entities.scenes[id]`：`name, backgroundUrl, foregroundUrl, fieldObjectFit, fieldWidth, fieldHeight, displayGrid, gridSize, markers, text, soundUrl, soundName, soundVolume, soundRepeat, media*, locked, order`
- マーカー（`room.markers` / `scene.markers` のキーは16進の文字列）：`x, y, z, width, height, locked, freezed, text, imageUrl, clickAction`。座標はマス単位、原点は盤面の中央。
- スクリーンパネル（`entities.items[id]`）にも `clickAction` がある。

**`clickAction` の中身：** 未設定のときは `null` か `''`。「チャットに送信」は `{ type: 'message', text: '/scene 名前' }` で書き出す（`js/ccfolia.js` の `DEFAULT_SHAPE`）。2026-11-04 にココフォリアでZIPの読み込みと、マーカーパネルのクリックでシーンが切り替わることを確認済み。別の形のZIPを読み込んだときは、その形を覚えて以後の書き出しに使う。

## ファイル

- `js/ccfolia.js` … ルームZIPの読み書き、クリックアクションの形
- `js/jukebox.js` … テンプレート（配置・画像の生成）
- `js/app.js` … 画面（つながりの線・テストプレイ）
- `js/i18n.js` … 日本語・英語・韓国語
- `assets/` … プレーヤーとレコード12色の画像（茶・紺はグレーのラベルを塗り替えたもの）
