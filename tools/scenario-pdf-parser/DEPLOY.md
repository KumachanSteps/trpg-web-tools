# 外部APIデプロイメモ v0.6.5

このフォルダは GitHub Pages UI から呼び出す高精度PDF解析APIとしても動作します。

## API仕様

### GET /api/health

接続テスト用です。

### POST /api/parse-pdf

multipart/form-data:

- file: PDF
- preset: 任意
- version: 任意

レスポンスには `text` と `privacy` 情報が含まれます。

## Dockerで起動

```bash
cd scenario_pdf_parser
docker build -t scenario-pdf-parser-api .
docker run --rm -p 8787:8787 scenario-pdf-parser-api
```

## GitHub Pages UIから外部APIを使う

ツール画面の「高精度API設定」にデプロイ先URLを入力します。

```text
https://your-api.example.com/api/parse-pdf
```

## セキュリティ方針

- PDFは一時ファイルとしてのみ保存します。
- `finally` で一時ファイルを削除します。
- PDFやTXTの公開URLは作りません。
- APIレスポンスとしてTXTを返すだけです。
- 本番運用ではアクセス制限、レート制限、ログ抑制を追加してください。

## CORS

現在は開発しやすさ優先で `allow_origins=["*"]` です。
本番では GitHub Pages のURLに限定することを推奨します。
