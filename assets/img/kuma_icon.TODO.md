# kuma_icon.ico — 要差し替え（暫定ファイル）

現在の `assets/img/kuma_icon.ico`（および同内容の `/favicon.ico`）は **暫定ファイル** です。
`tools/chara-sabun-kanri-tool/assets/img/kuma_icon.ico` から流用した 16/32/48px の ICO で、
**サイト用に用意した本来のくまアイコンではありません。**

## 経緯
元の `assets/img/kuma_icon.ico` はリポジトリ初期から「1300×1175 の PNG に `.ico`
拡張子を付けただけ」のファイルで、GitHub Pages が `image/vnd.microsoft.icon` で配信する一方
中身が ICO ではないため、ブラウザがファビコンとして拒否し全ページのタブアイコンが消えていた。
2026-09-08 (`37354f3`) に上記の正しい ICO へ暫定差し替え。

## TODO
- サイト用に用意した本来のアイコン画像から、16 / 32 / 48（できれば +64 / 128）を含む
  **正しい `.ico`** を書き出す。
- `assets/img/kuma_icon.ico` と ルートの `favicon.ico` を差し替える。
- 差し替え後、`git status` に旧 524KB PNG が復活していないか確認（過去に作業ツリーへ
  書き戻された事例あり）。
