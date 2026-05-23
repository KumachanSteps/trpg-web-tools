# いあキャラMEMOジェネレータ externalUrl fetch setup

## 配置先

この一式は `trpg-web-tools` レポジトリ直下へ配置する想定です。

```text
trpg-web-tools/
├── tools/
│   └── iachara-charamemo-creator/
│       ├── index.html
│       ├── css/
│       │   └── charamemo-creator-style.css
│       └── js/
│           ├── i18l.js
│           ├── language.js
│           ├── parser.js
│           ├── iachara-parser.js
│           ├── iachara-fetcher.js
│           └── main.js
└── workers/
    └── iachara-proxy/
        ├── worker.js
        └── wrangler.toml
```

## GitHub Pages側

`tools/iachara-charamemo-creator/index.html` をそのまま開きます。

`2. URL取得設定` の Proxy URL 欄へ、Cloudflare Worker のURLを入れてください。

```text
https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/?url=
```

## Cloudflare Worker

`trpg-web-tools/workers/iachara-proxy/` へ移動してデプロイします。

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

デプロイ後に表示される `https://...workers.dev` を、ツールの Proxy URL 欄へ入れます。

## なぜProxyが必要か

GitHub Pages上のブラウザJavaScriptから `https://iachara.com/view/...` を直接fetchすると、CORSによりHTML本文を読めない場合があります。

このWorkerはサーバー側で `iachara.com/view/...` のHTMLを取得し、CORSヘッダーを付けてツールへ返します。

## セキュリティ

Workerは以下だけ許可しています。

- hostname: `iachara.com` / `www.iachara.com`
- path: `/view/...`

オープンProxy化を避けるため、この制限は外さないでください。
