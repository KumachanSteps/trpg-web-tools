# TRPG WEBツール観測所 共通報告ページ v1 Free

Firebase Spark / 無料運用向けの報告フォームです。v1では Firebase Storage を使いません。添付ファイルは直接アップロードせず、「スクリーンショット・ログ共有URL 任意」欄で受け取ります。

## 配置先

このZIPの中身を `trpg-web-tools/` 直下に配置してください。

```text
/trpg-web-tools/report/
/trpg-web-tools/admin/reports/
```

## 必要なFirebase機能

```text
Firebase Authentication
Firestore Database
```

Storage は不要です。

## firebase-config.js

`shared/reporting/firebase-config.example.js` をコピーして、`shared/reporting/firebase-config.js` を作成してください。

```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const allowedAdminEmails = [
  "your-google-account@example.com"
];
```

## Firestore Rules

Firebase Console > Firestore Database > Rules に `firebase/firestore.rules` の内容を貼って Publish してください。

## Developer登録

1. `/admin/reports/` でGoogleログイン
2. Firebase Console > Authentication > Users で自分の UID を確認
3. Firestore に `admins` コレクションを作成
4. `admins/{YOUR_UID}` ドキュメントを作成

例:

```text
admins/{YOUR_UID}
  email: "your-google-account@example.com"
  role: "owner"
```

## 各ツールの報告ボタン

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
