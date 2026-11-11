# TRPG Calendar iCal Proxy

卓準備カレンダーから、非公開Google CalendarのシークレットiCalフィードを読み取るための専用Cloudflare Workerです。

## セキュリティ境界

- `https://calendar.google.com/calendar/ical/.../basic.ics` だけを中継します。
- シークレットURLはクエリ文字列ではなくPOST本文で受け取ります。
- 応答は常に `Cache-Control: no-store` です。
- 既定では `https://kumachansteps.github.io` からのブラウザ要求だけを許可します。
- リクエスト本文、シークレットURL、iCal本文をWorker側へ保存しません。

## デプロイ

```sh
cd workers/calendar-ical-proxy
npx wrangler deploy
```

別環境で利用する場合は `wrangler.toml` の `ALLOWED_ORIGINS` と、卓準備カレンダー側の `GOOGLE_ICAL_PROXY_URL` を自分のURLへ変更してください。

Google CalendarのシークレットURLが漏洩した場合は、Google Calendarの「設定と共有」からURLをリセットしてください。
