# シナリオDTPデザイナー v1.0 static prototype

TRPGシナリオ本文を、A4横・本文2カラム・右KPメモ欄のDTP風レイアウトへ配置する静的HTML版の試作です。

## フォルダ構成

```text
scenario-dtp-designer/
├── index.html
├── style.css
├── js/
│   ├── main.js
│   └── shortcut.js
├── assets/
│   └── img/
└── README.md
```

## 使い方

1. `index.html` をブラウザで開く
2. 左パネルのテキスト欄にシナリオ本文を貼り付け
3. 「自動ブロック化」を押す
4. 中央キャンバス上のブロックをクリック・ドラッグして調整
5. 右パネルでフォントサイズなどを編集
6. JSON保存、PDF出力、PNG出力を行う

## ショートカット

```text
Ctrl / Cmd + S          JSON保存
Ctrl / Cmd + O          JSON読込
Ctrl / Cmd + Shift + P  PDF出力
Ctrl / Cmd + Shift + E  PNG出力
Ctrl / Cmd + Shift + I  画像追加
Esc                     選択解除 / 使い方パネルを閉じる
```

## GitHub Pages配置例

```text
trpg-web-tools/
└── tools/
    └── scenario-dtp-designer/
        ├── index.html
        ├── style.css
        ├── js/
        │   ├── main.js
        │   └── shortcut.js
        ├── assets/
        │   └── img/
        └── README.md
```

## 備考

- PNG出力は `html2canvas` CDN を利用しています。
- PDF出力はブラウザ印刷機能を利用します。
- 保存データはJSONとしてダウンロードできます。
- ブラウザ内のlocalStorageにも自動保存されます。
