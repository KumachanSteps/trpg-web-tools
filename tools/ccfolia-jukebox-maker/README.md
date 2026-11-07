# KPレス・ジュークボックスメーカー

ココフォリア（CCFOLIA）のクリックアクションと `/scene シーン名` を使って、KPがいなくても動くジュークボックス部屋を作るツール。全シーンを並べ、マーカーパネルのクリックアクションを呼び出し先のシーンへの線として描く。

## できること

- ジュークボックスのテンプレート：プレーヤー1台＋レコード1〜12枚（初期値12枚）。レコードごとにテーマ（＝シーン名）・BGMの曲名・ラベル色・BGM（URLか音声ファイル）を決める。棚の札とプレーヤーの下の札には、テーマとBGMの曲名を2段で出す（曲名が空欄ならテーマだけ）。
- ページでBGMを鳴らす：レコードの「▶」で試聴。「♪ BGMを鳴らす」をオンにすると、シーンを選ぶたびにそのシーンのBGMがページで流れる（停止中のシーンでは止まる）。音声ファイル・音声ファイルのURL・YouTube（見えない埋め込みプレーヤー）に対応。音声ファイルはブラウザの IndexedDB に保存し、次に開いたときも残る。
  - シーン「停止中」＋レコードごとのシーン。各シーンでは、そのレコードがプレーヤーに載り、棚の同じ位置は空きになる。
  - 棚のレコードのクリックアクション：`/scene テーマ`。プレーヤーに載ったレコード：`/scene 停止中`。
  - プレーヤーは3枚のマーカーパネルを重ねる：本体（アームなし `player-base.png`）→ レコード → トーンアーム。停止中はアームが休み位置（`tonearm-rest.png`）。再生中はレコードがラベルの回るAPNG（`disk-<色>-spin.png`、33⅓回転、ループ）になり、アームは0.6秒止まってから0.8秒で盤面に下りるAPNG（`tonearm-drop.png`、1回だけ再生）。再生中はアームを押しても停止する。
  - 棚のレコードはジャケット（`assets/sleeve.png`）から直径の3割だけはみ出す。ジャケットはプリセット写真（下記の12枚）か見本デザイン（白・ラベル色・グラデーション・ライン・サンバースト・ドット・リング）から選ぶか、画像を開く／ドラッグ＆ドロップして、ドラッグで移動・ホイール（2本指）で拡大縮小して切り抜く。切り抜いた画像はJPEGでブラウザに保存する。
  - 初期設定はマーダーミステリー向けの12テーマ：導入・ハンドアウト・調査・密談・調査2・議論・休憩・最終議論・考察・クライマックス・感想戦・エピローグ。それぞれラベル色とプリセット写真のジャケット付き。
  - 「ジャケットを表示する」をオフにすると、棚にはレコードだけが並ぶ（シーンの画面・シーン一覧・書き出すZIPのすべて）。
- 前景と背景：各シーンの前景は、そのシーンのレコード（ジャケットあり・なし）と曲名の絵（ココフォリアのシーン一覧のサムネイルで見分けるため）。盤面では、前景と同じ大きさのマーカーパネル（棚の絵、z=1）で前景を覆う。部屋の外側の背景は、選んだ画像（長辺1920pxのJPEGにしてブラウザに保存）か、作った暗いレコード模様。選んだ画像はZIPにそのまま入るので、配布するときは画像のライセンスに注意。
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
- `assets/covers/` … プリセット写真のジャケット（538×520に切り抜いたJPEG）
- `assets/` … プレーヤー（本体・トーンアーム）とレコード12色の画像（茶・紺はグレーのラベルを塗り替えたもの）、回るレコードと針が下りるAPNG

## 写真のクレジット

`assets/covers/` の写真は [Unsplash](https://unsplash.com) の写真で、[Unsplash License](https://unsplash.com/license) で使っています（ジャケットの大きさに切り抜き）。Unsplash+ の写真は使っていません。

| テーマ | 写真 | 撮影 |
|---|---|---|
| 導入 | [a chair sitting in the middle of a room](https://unsplash.com/photos/a-chair-sitting-in-the-middle-of-a-room-0lfMluAw8wk) | [Andy Luo](https://unsplash.com/@andy8647) |
| ハンドアウト | [a wax stamp on a piece of paper](https://unsplash.com/photos/a-wax-stamp-on-a-piece-of-paper-KGDVTn9lYDE) | [mk. s](https://unsplash.com/@mk__s) |
| 調査 | [brown pencil on white book beside black eyeglasses](https://unsplash.com/photos/brown-pencil-on-white-book-beside-black-eyeglasses-dvK_CT1Wg78) | [Dariusz Sankowski](https://unsplash.com/@dariuszsankowski) |
| 密談 | [two silhouettes are holding hands in the darkness](https://unsplash.com/photos/two-silhouettes-are-holding-hands-in-the-darkness-xVAEsUhEGTc) | [lhon karwan](https://unsplash.com/@lhonkarwanhamasalih) |
| 調査2 | [investigation board with red string connecting photos and documents](https://unsplash.com/photos/investigation-board-with-red-string-connecting-photos-and-documents-y13Sg2MLI40)（人物の写真が入らない部分を切り抜き） | [Veer Mickey Shah](https://unsplash.com/@veermickey) |
| 議論 | [a wooden chess board with chess pieces on it](https://unsplash.com/photos/a-wooden-chess-board-with-chess-pieces-on-it-yXAuWd4nX6c) | [Kevin Hessey](https://unsplash.com/@kevinhessey) |
| 休憩 | [a drink sitting next to a sign that says have a break](https://unsplash.com/photos/a-drink-sitting-next-to-a-sign-that-says-have-a-break-mJZn0eZUzh0) | [Alexas_Fotos](https://unsplash.com/@alexas_fotos) |
| 最終議論 | [the pawn triumphs over the fallen king](https://unsplash.com/photos/the-pawn-triumphs-over-the-fallen-king-b_NUj9eklsk) | [Daniele Franchi](https://unsplash.com/@daniele_franchi) |
| 考察 | [text](https://unsplash.com/photos/text-BQLw0OrA6F4) | [Saad Ahmad](https://unsplash.com/@saadahmad_umn) |
| クライマックス | [orange and yellow fire illustration](https://unsplash.com/photos/orange-and-yellow-fire-illustration-y3RFJh6-r0Q) | [Quilia](https://unsplash.com/@heyquilia) |
| 感想戦 | [colorful game tiles scattered on a grid](https://unsplash.com/photos/colorful-game-tiles-scattered-on-a-grid-RxAyATWag6A) | [Parinaz Mirhosseini](https://unsplash.com/@parinaz_mhs) |
| エピローグ | [an empty theater with red curtains and seats](https://unsplash.com/photos/an-empty-theater-with-red-curtains-and-seats-25OeoEKoNP8) | [Richard Heinen](https://unsplash.com/@richard_he) |
