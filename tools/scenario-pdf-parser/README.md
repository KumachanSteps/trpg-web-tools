# シナリオPDF整形機 v0.6.6

v0.6 では、高精度モードを **Layout解析エンジン** に更新しています。

## 起動方法

```bash
cd scenario_pdf_parser
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python run_local_server.py
```

Windows:

```bash
cd scenario_pdf_parser
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
python run_local_server.py
```

ブラウザで開くURL：

```text
http://127.0.0.1:8787/
```

## v0.6 の主な変更

- `pdfplumber` を追加
- `opencv-python-headless` を追加
- `numpy` / `Pillow` を追加
- PyMuPDFでページ画像化
- OpenCVで水平線・垂直線を検出
- pdfplumberでPDF内の線オブジェクトも補助的に取得
- ページをY方向の band に分割
- bandごとに `full` / `twoColumn` を判定
- `twoColumn` bandは左カラム全体 → 右カラム全体の順で出力
- ページヘッダー・ページ番号除去を継続
- 能力値などの数字分断補正を継続
- 抽出行デバッグに band 情報、水平線、垂直線、カラム判定を表示

## 構成

```text
scenario_pdf_parser/
├─ index.html
├─ css/
│  └─ pdf-parser-style.css
├─ js/
│  ├─ main.js
│  ├─ i18l.js
│  ├─ language.js
│  └─ sample-data.js
├─ backend/
│  ├─ server.py
│  └─ requirements.txt
└─ run_local_server.py
```

## 注意

GitHub Pages上ではPython APIが動かないため、高精度Layout解析は使えません。
ローカルサーバーまたは外部APIサーバーとして起動してください。


## v0.6.5 notes

- GitHub Pages UI + 外部Python API運用を想定した版です。
- UIに「高精度API設定」を追加しました。
- API URLをユーザー側で入力・保存できます。
- API接続テストを追加しました。
- 外部API利用時の注意文を追加しました。
- APIが使えない場合はブラウザ抽出へフォールバックします。
- `/api/health` を追加しました。
- APIレスポンスに privacy 情報を追加しました。
- Dockerfile と DEPLOY.md を追加しました。


## v0.6.6 notes

- 2カラム部分で、同じY座標にある左右カラム行を1行に結合してしまう問題を修正しました。
- カラム見出し下の横線をband分割の根拠にしすぎないよう変更しました。
- 2カラムbandでは、左カラム全体 → 右カラム全体の順で出力する処理を強化しました。
- `●禁止事項` と `●ネタバレについて` が同じ高さにあるページで、右カラムが左カラム途中へ割り込む問題を抑制しました。
