# KPレス・ジュークボックスメーカー

ココフォリア（CCFOLIA）のクリックアクションと `/scene シーン名` を使って、KPがいなくても動くジュークボックス部屋を作るツール。全シーンを並べ、マーカーパネルのクリックアクションを呼び出し先のシーンへの線として描く。

## できること

- ジュークボックスのテンプレート：プレーヤー1台＋レコード1〜10枚（初期値9枚）。レコードごとに曲名（＝シーン名）・ラベル色・BGM（URLか音声ファイル）を決める。
  - シーン「停止中」＋レコードごとのシーン。各シーンでは、そのレコードがプレーヤーに載り、棚の同じ位置は空きになる。
  - 棚のレコードのクリックアクション：`/scene 曲名`。プレーヤーに載ったレコード：`/scene 停止中`。
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

**未確認：`clickAction` の中身。** 未設定のときは `null` か `''`。設定したときの形は資料が見つからず、`{ type: 'message', text: '/scene 名前' }` と推測して書き出している（`js/ccfolia.js` の `DEFAULT_SHAPE`）。ココフォリアで書き出した、クリックアクション入りのルームZIPをこのツールで読み込むと、その形を覚えて以後の書き出しに使う。

## ファイル

- `js/ccfolia.js` … ルームZIPの読み書き、クリックアクションの形
- `js/jukebox.js` … テンプレート（配置・画像の生成）
- `js/app.js` … 画面（つながりの線・テストプレイ）
- `js/i18n.js` … 日本語・英語・韓国語
- `assets/` … プレーヤーとレコード10色の画像
