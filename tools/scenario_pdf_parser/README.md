# シナリオPDF整形機 v0.5

v0.5 では、標準のPDF抽出を PyMuPDF4LLM API 方式に変更しています。

## 起動方法

```bash
cd scenario_pdf_parser
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python run_local_server.py
```

ブラウザで開くURL：

```text
http://127.0.0.1:8787/
```

このURLから開くと、PDFを選択した際に `/api/parse-pdf` へPDFを送信し、PyMuPDF4LLMで高精度TXT化します。

## GitHub Pagesで使う場合

GitHub PagesだけではPython APIを動かせないため、PyMuPDF4LLMモードは使えません。
その場合は自動的にブラウザ内 pdf.js 抽出へフォールバックします。

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
