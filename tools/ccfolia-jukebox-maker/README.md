# KPレス・ジュークボックスメーカー

ココフォリア（CCFOLIA）のクリックアクションと `/scene シーン名` を使って、KPがいなくても動くジュークボックス部屋を作るツール。全シーンを並べ、マーカーパネルのクリックアクションを呼び出し先のシーンへの線として描く。

## できること

- ジュークボックスのテンプレート：プレーヤー1台＋レコード1〜12枚（初期値12枚）。レコードごとにテーマ（＝シーン名）・BGMの曲名・ラベル色・BGM（URLか音声ファイル）を決める。棚の札とプレーヤーの下の札には、テーマとBGMの曲名を2段で出す（曲名が空欄ならテーマだけ）。
- ページでBGMを鳴らす：レコードの「▶」で試聴。ヘッダーのBGM ON/OFFと音量で、ONのあいだはシーンを選ぶたびにそのシーンのBGMがページで流れる（停止中のシーンでは止まる。初期値はON）。音声ファイル・音声ファイルのURL・YouTube（見えない埋め込みプレーヤー）に対応。音声ファイルはブラウザの IndexedDB に保存し、次に開いたときも残る。
  - シーン「停止中」＋レコードごとのシーン。各シーンでは、そのレコードがプレーヤーに載り、棚の同じ位置は空きになる。
  - 棚のレコードのクリックアクション：`/scene テーマ`。プレーヤーに載ったレコード：`/scene 停止中`。
  - プレーヤーは3枚のマーカーパネルを重ねる：本体（アームなし `player-base.png`）→ レコード → トーンアーム。停止中はアームが休み位置（`tonearm-rest.png`）。再生中はレコードがラベルの回るAPNG（`disk-<色>-spin.png`、33⅓回転、ループ）になり、アームは0.6秒止まってから0.8秒で盤面に下りるAPNG（`tonearm-drop.png`、1回だけ再生）。再生中はアームを押しても停止する。
  - 棚のレコードはジャケット（`assets/sleeve.png`）から直径の3割だけはみ出す。ジャケットはプリセット写真（下記の12枚）か見本デザイン（白・ラベル色・グラデーション・ライン・サンバースト・ドット・リング）から選ぶか、画像を開く／ドラッグ＆ドロップして、ドラッグで移動・ホイール（2本指）で拡大縮小して切り抜く。切り抜いた画像はJPEGでブラウザに保存する。
  - 初期設定はマーダーミステリー向けの12テーマ：導入・ハンドアウト・調査・密談・調査2・議論・休憩・最終議論・考察・クライマックス・エピローグ・感想戦。それぞれラベル色とプリセット写真のジャケット、YouTubeのフリーBGM（URL）付き。
  - 「ジャケットを表示する」をオフにすると、棚にはレコードだけが並ぶ（シーンの画面・シーン一覧・書き出すZIPのすべて）。
- 前景と背景：各シーンの前景は、そのシーンのレコード（ジャケットあり・なし）と曲名の絵（ココフォリアのシーン一覧のサムネイルで見分けるため）。盤面では、前景と同じ大きさのマーカーパネル（棚の絵、z=1）で前景を覆う。部屋の外側の背景は、選んだ画像（長辺1920pxのJPEGにしてブラウザに保存）か、作った暗いレコード模様。選んだ画像はZIPにそのまま入るので、配布するときは画像のライセンスに注意。
- シーンプレビュー：全シーンを一覧し、クリックアクションの `/scene` を線で表示。重複したシーン名・存在しないシーンの呼び出しを警告。
- レコード棚：真ん中の欄の見出しで「シーンプレビュー」と切り替える。YouTubeのフリーBGMを16のタブ（導入・不穏・コミカル・推理・感動・悲しい・緊迫・クライマックス・館・ホラー・デジタル・ケルト・ファンタジー・ジャズ・ピアノ・ハウス）に並べ、ジャケットか「レコードへ」の右の ▶︎ を押すと音声だけを試聴（再生中は ■ で止める）。「レコードへ」でレコードのBGMに入れる、URLをコピー、YouTubeで開く。曲ごとにURLの右へ小さなメモ（100文字まで）を書ける。曲（YouTubeのURL）とタブは追加・名前変更・並べ替え・削除でき、ブラウザに保存（初期の曲は `js/shelf-data.js`）。
- 版権元：ヘッダーの「使い方」の右にある「版権元」で、ジャケット写真（Unsplash・撮影者）と BGM の配布元（公式サイト・YouTubeチャンネル・曲数）をタブで切り替えて確認できる。BGMの配布元の一覧は `js/credits.js`。
- プレイリスト：設定欄の「プレイリスト ▾」で、今の設定（部屋の名前・レコードのシーン名と色・BGMのURLと曲名・ジャケット・背景画像）に名前を付けて保存、上書き保存、ファイル（`.jukebox.json`）への書き出しと読み込み。一覧は真ん中の欄の3つめ「プレイリスト」で、読み込む・名前変更・複製・書き出す・削除ができる。読み込む前に、保存していない変更があれば確認し、切り替え前の状態を1つ控えて「元に戻す」で戻せる。音声ファイルは入らない。端末内の保存は IndexedDB（`ccfoliaJukebox` の `playlists`）。「プリセット」タブから9種（汎用マダミス・館もの・デジタル・ホラー・本格ミステリ・日常コメディ・クトゥルフ神話・青春・ロマンス）で始められる。プリセットは未保存の新しいプレイリストとして開き、真ん中の欄はシーンプレビューに切り替わる。中身は `js/presets.js`（シーン名・ラベル色・ジャケット・レコード棚の曲。写真がまだないジャケットは模様で代用）。
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
- `js/app.js` … 画面（つながりの線・テストプレイ・レコード棚）
- `js/shelf-data.js` … レコード棚の初期の曲（YouTubeのフリーBGM）
- `js/presets.js` … プリセット8種（汎用マダミスは最初の設定と同じなので app.js 側）
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
| エピローグ | [an empty theater with red curtains and seats](https://unsplash.com/photos/an-empty-theater-with-red-curtains-and-seats-25OeoEKoNP8) | [Richard Heinen](https://unsplash.com/@richard_he) |
| 感想戦 | [colorful game tiles scattered on a grid](https://unsplash.com/photos/colorful-game-tiles-scattered-on-a-grid-RxAyATWag6A) | [Parinaz Mirhosseini](https://unsplash.com/@parinaz_mhs) |

プリセット用の写真（プリセットとジャケット選びで使います。写真がまだない場面は模様のジャケットです）

| プリセット・場面 | 写真 | 撮影者 |
| --- | --- | --- |
| 館もの・晩餐 | [a candle illuminates a formal dinner table setting](https://unsplash.com/photos/a-candle-illuminates-a-formal-dinner-table-setting-_6u9TEcD6NM) | [Alexander Mass](https://unsplash.com/@alexandermassph) |
| 館もの・異変 | [dark hallway with light reflecting on floor](https://unsplash.com/photos/dark-hallway-with-light-reflecting-on-floor-e8xSjQTk9bw) | [Yaqing Wei](https://unsplash.com/@yunwuwanzi) |
| 本格ミステリ・調査 | [shallow focus photo of white paper sheet mounted on cork board](https://unsplash.com/photos/shallow-focus-photo-of-white-paper-sheet-mounted-on-cork-board-ZT9gjcJog6U) | [Volodymyr Hryshchenko](https://unsplash.com/@lunarts) |
| クトゥルフ神話・異変 | [a foggy city street at night with street lights](https://unsplash.com/photos/a-foggy-city-street-at-night-with-street-lights-2rMuzqQr5aE) | [Oleg Zarevennyi](https://unsplash.com/@olegolegoleg) |
| クトゥルフ神話・調査 | [white and brown house near mountain under white clouds during daytime](https://unsplash.com/photos/white-and-brown-house-near-mountain-under-white-clouds-during-daytime-LLYsih4byQQ) | [Polina Kuzovkova](https://unsplash.com/@p_kuzovkova) |
| クトゥルフ神話・狂気 | [abstract geometric pattern with sharp angles and shadows](https://unsplash.com/photos/abstract-geometric-pattern-with-sharp-angles-and-shadows-vAq8q0vw8Es) | [Valiant Lambda](https://unsplash.com/@valiant_lambda) |
| クトゥルフ神話・神話的恐怖 | [dark ominous storm clouds gather in the sky](https://unsplash.com/photos/dark-ominous-storm-clouds-gather-in-the-sky-_Epm8if8JFM) | [Mustafi Numann](https://unsplash.com/@mustafijpg) |
| 青春・学園生活 | [empty classroom with desks and chalkboard](https://unsplash.com/photos/empty-classroom-with-desks-and-chalkboard-PDRFeeDniCk) | [Ivan Aleksic](https://unsplash.com/@ivalex) |
| 青春・青春の日々 | [an empty soccer field with a sky background](https://unsplash.com/photos/an-empty-soccer-field-with-a-sky-background-C2v6EeGXVQM) | [Susmitha Veganosaurus](https://unsplash.com/@veganosaurus) |
| 青春・クライマックス | [a grassy field with a building in the background](https://unsplash.com/photos/a-grassy-field-with-a-building-in-the-background-7cSmlMP7-ho) | [Ricky LK](https://unsplash.com/@rickyrynselo) |
| ロマンス・出会い | [cherry blossoms bloom over a busy city street](https://unsplash.com/photos/cherry-blossoms-bloom-over-a-busy-city-street-esumwtMcwgI) | [Huang Lin](https://unsplash.com/@habobo) |
| ロマンス・穏やかな日々 | [sunlight streams through a window onto a cafe table](https://unsplash.com/photos/sunlight-streams-through-a-window-onto-a-cafe-table-6_Yye5kmEkM) | [Long Chung](https://unsplash.com/@chungj07) |
| ロマンス・二人の時間 | [a man and woman sitting on a bench at sunset](https://unsplash.com/photos/a-man-and-woman-sitting-on-a-bench-at-sunset-5HifIYdqtXE) | [Richard Sagredo](https://unsplash.com/@sagredophotography) |
| ロマンス・別離 | [an empty train station at night](https://unsplash.com/photos/an-empty-train-station-at-night-So1gBE5ayQw) | [Ben Kupke](https://unsplash.com/@benkupke) |
