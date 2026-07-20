# TRPG WEBツール観測所 共通報告ページ

GitHub Pages 配置用の雛形です。

## 追加ページ

```text
/trpg-web-tools/report/
/trpg-web-tools/admin/reports/
```

## ファイル構成

```text
trpg-web-tools-report-pages/
├─ report/
│  ├─ index.html
│  └─ report.js
├─ admin/
│  └─ reports/
│     ├─ index.html
│     └─ admin-reports.js
├─ shared/
│  └─ reporting/
│     ├─ reporting.css
│     ├─ firebase-config.example.js
│     └─ firebase-config.js  // 自分で作成
└─ firebase/
   ├─ firestore.rules
   └─ storage.rules
```

## 配置手順

1. この中身を GitHub Pages の `trpg-web-tools/` 直下へ配置する。
2. `shared/reporting/firebase-config.example.js` をコピーして `shared/reporting/firebase-config.js` を作る。
3. Firebase Console から Web App config を取得して `firebase-config.js` に貼る。
4. Firebase Authentication / Firestore / Storage を設定する。
5. 各ツールの報告ボタンから以下のようにリンクする。

```js
const params = new URLSearchParams({
  toolId: "dice-stat-analyst",
  toolName: "ダイス解析アナライザー",
  version: "v1.38",
  updated: "2026.06.13",
  sourceUrl: location.href
});
location.href = `/trpg-web-tools/report/?${params.toString()}`;
```

## Firebase Authentication 設定手順

1. Firebase Console でプロジェクトを作成する。
2. Web App を追加し、表示される Firebase config をコピーする。
3. Build > Authentication > Sign-in method を開く。
4. Google provider を有効化する。
5. Authorized domains に GitHub Pages のドメインを追加する。
   - 例: `kumachansteps.github.io`
   - カスタムドメインを使う場合はそのドメインも追加する。
6. `shared/reporting/firebase-config.js` の `allowedAdminEmails` に開発者Googleアカウントを追加する。

## Firestore 設定手順

1. Build > Firestore Database を開く。
2. データベースを作成する。
3. Rules に `firebase/firestore.rules` の内容を貼り付けて Publish する。
4. `/admin/reports/` に一度ログインする。
5. Firebase Console > Authentication > Users で自分の UID を確認する。
6. Firestore に `admins` コレクションを作り、自分の UID と同じドキュメントIDを追加する。

例:

```text
admins/{YOUR_UID}
  email: "your-google-account@example.com"
  role: "owner"
```

## Storage 設定手順

1. Build > Storage を開く。
2. Storage bucket を作成する。
3. Rules に `firebase/storage.rules` の内容を貼り付けて Publish する。

## 注意

- service account key や secret key はフロントエンドに置かない。
- 一般ユーザーは `reports` の作成のみ可能。
- 一般ユーザーは他の報告を読めない。
- Developer は Googleログイン必須。
- Firestore の `admins/{uid}` に登録されたユーザーだけが報告を読める。
- 添付ファイルも Developer のみ閲覧可能。
- Storage の `getDownloadURL()` はダウンロードURLを発行するため、管理者以外へURLを共有しない運用にする。
