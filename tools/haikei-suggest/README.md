# TRPG背景サジェストツール / TRPG Background Suggester

手元の背景画像フォルダをタグ付け・分類し、シナリオ本文に合う背景をシーンごとに提案するツール。画面は日本語・英語・韓国語。見た目はCoCハウスルール表メーカーと同じフラットなダークグレー＋黄色。

## 外部通信をしない

- `analytics.js`・CDN・外部フォントは読み込まない。
- `index.html` の CSP で `connect-src 'none'` などを指定し、ページ側で通信そのものを禁止している。画像は File / blob URL でだけ扱う。
- クラシックスクリプト（ES Modules なし）なので、ZIPで配って `index.html` を直接開いても動く。

## ファイル

- `js/vocab.js` — タグ辞書（分類・日英韓の名前・本文用の語句・ファイル名だけで使う語句・色のヒント）。タグを足すときはここに1行足す。`id` は保存データのキーになるので公開後は変えない。
- `js/engine.js` — ファイル名からのタグ推定、色解析（明るさ・色相）、シーン分割、本文のタグ抽出、スコア付け。画面に依存しないので node でも試せる。
- `js/store.js` — IndexedDB（タグデータ・サムネイルと色解析のキャッシュ・前回のフォルダ）と、フォルダの読み書き。Chrome・Edge は `showDirectoryPicker` で開き、`haikei-tags.json` をフォルダ内に保存できる。他のブラウザは `<input webkitdirectory>` で読み込み、ブラウザ内保存と JSON 書き出し。
- `js/i18n.js` — 画面の文言（ja / en / ko）。
- `js/app.js` — ライブラリ（絞り込み・複数選択・タグ編集）とサジェスト画面。

## AI追加パック（任意）

画像の中身からもタグを付けるための別配布パック。ツール本体には含めず、利用者がZIPを展開したフォルダを「AIパック」から選ぶ。読み込みも推論もブラウザ内で行い、通信はしない（パックのファイルは blob URL と ArrayBuffer で渡すため、CSP に `blob:` と `'wasm-unsafe-eval'` を足している。`connect-src 'none'` はそのまま）。

- 作り方: `python3 ai-pack/build_pack.py --out ai-pack/dist`（Hugging Face から Xenova/clip-vit-base-patch32 の量子化モデルを取得し、npm から onnxruntime-web を取得する）。`--dummy` で動作確認用のダミーパックを作れる。
- 中身: `manifest.json`、`ort/`（ONNX Runtime Web の UMD 版と wasm）、`model/vision_model.onnx`（CLIP の画像側）、`tags.json`（タグ文の特徴量。パック作成時に CLIP の文章側で計算）。
- タグの決め方（`js/ai.js`）: 分類（場所・時間帯・天気・雰囲気・様式）ごとに、画像の特徴量とタグ文の特徴量の近さを確率にし、しきい値を超えたものを付ける。「どれでもない」を表す文が勝てば付けない。しきい値は `build_pack.py` の `GROUPS` で決め、パックに入る。
- 画像の特徴量はサムネイルのキャッシュと一緒に保存するので、2回目以降は計算しない。

## スコアの考え方

本文のシーンから読み取ったタグごとに `(1 + log2(出現回数)) × 分類の重み` を足す。画像がそのタグを持っていれば満点、色のヒント（夜→暗い・青など）だけ一致なら 0.35 倍。ファイル名・フォルダ名・メモの語が本文にそのまま出てきたら加点。色だけの一致は 20% 未満なら出さない。

## 公開状態

観測所に「開発中」（`status: "production"`）として掲載。
