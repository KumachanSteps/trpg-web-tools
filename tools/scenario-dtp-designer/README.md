# シナリオDTPデザイナー v1.1

TRPGシナリオ本文をA4縦・本文2カラム・右KPメモ欄のDTP風レイアウトへ配置する静的HTML版です。

## v1.1更新点

- `index.html` に Google tag / 共通favicon / 指定titleを追加
- CSSパスを `./css/dtp-designer-style.css` に変更
- A4縦表示へ変更
- 本文エリアを2カラム想定に変更
- 右KPメモ欄をページ右端に配置し、右マージン0に調整
- プレビューをドラッグでパン移動可能に
- 通常スクロールで複数ページ移動可能に
- Cmd/Ctrl + スクロールで拡大縮小可能に
- Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y のUndo/Redo対応
- Delete/Backspaceで選択ブロック削除
- ヘッダーにショートカットボタンを追加
- ショートカットパネルをヘッダー下にスライド表示
- 左側カラムを2分割
  - 左カラム①：TXTファイルを開く/ドラッグ＆ドロップ、本文編集、プレビュー読込、クリア
  - 左カラム②：ページ一覧、ブロック追加、素材サムネイル
- ページ名を編集可能に
- ブロック追加ボタンにシンプルアイコンを追加
- 画像素材のサムネイル表示

## フォルダ構成

```text
scenario-dtp-designer-v1.1/
├── index.html
├── css/
│   └── dtp-designer-style.css
├── js/
│   ├── main.js
│   └── shortcut.js
├── assets/
│   └── img/
└── README.md
```

## GitHub Pages配置例

```text
trpg-web-tools/
└── tools/
    └── scenario-dtp-designer/
        ├── index.html
        ├── css/
        │   └── dtp-designer-style.css
        ├── js/
        │   ├── main.js
        │   └── shortcut.js
        └── assets/
            └── img/
```
