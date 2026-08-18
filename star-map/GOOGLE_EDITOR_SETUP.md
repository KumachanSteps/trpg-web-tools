# Google Editor / Calendar API 初期設定

## 1. Firebaseプロジェクト

1. Firebase Consoleでプロジェクトを作成
2. Web Appを追加
3. Authentication → Sign-in method → Googleを有効化
4. Firestore Databaseを作成
5. Web AppのFirebase Configを`js/firebase-config.js`へ貼り付け
6. Authentication → Settings → Authorized domainsへ次を追加
   - `kumachansteps.github.io`
   - localhostで試す場合は`localhost`

## 2. Editorアカウント

現在は`authorizedEditorEmails`へ編集者のGoogleメールアドレスを設定済みです。将来UIDへ切り替える場合は次の形式を使います。

```js
authorizedEditorEmails: ["your-address@gmail.com"]
```

一度ログインすると、右下ボタンを右クリックしてFirebase UIDを確認できます。長期運用ではUIDも設定してください。

```js
authorizedEditorUids: ["YOUR_FIREBASE_UID"]
```

## 3. Firestore Rules

`firebase/firestore.rules` に既存のレポート機能と共存する星図用ルールを追加済みです。リポジトリ直下から次を実行します。

```bash
firebase deploy --only firestore:rules
```

ConsoleのFirestore Rules画面へ貼り付けても構いません。

## 4. Google Calendar API

Google Cloud Consoleで、Firebaseと同じGoogle Cloudプロジェクトを開きます。

1. Google Calendar APIを有効化
2. OAuth consent screenを設定
3. OAuth Client IDを作成
4. Application typeはWeb application
5. Authorized JavaScript originsへ追加
   - `https://kumachansteps.github.io`
   - localhostテスト時：`http://localhost:8000`
6. Client IDを`googleOAuthClientId`へ貼り付け

要求する権限は読み取り専用です。

```text
https://www.googleapis.com/auth/calendar.readonly
```

## 5. localhostテスト

ZIPを展開したフォルダで、例としてPythonを使用します。

```bash
python -m http.server 8000
```

ブラウザで次を開きます。

```text
http://localhost:8000/plans.html
```

`file://` でHTMLを直接開いた場合、FirebaseのGoogleログインは利用できません。必ずGitHub PagesまたはlocalhostのHTTP URLで開いてください。

## 6. SIGN INが開かない場合

1. Firebase Console → Authentication → Sign-in method で Google が有効か確認
2. Authentication → Settings → Authorized domains に次があるか確認
   - `kumachansteps.github.io`
   - localhost検証を行う場合は `localhost`
3. ブラウザのポップアップを許可して再試行
4. アカウントパネルの「ページ移動でログイン」を試す
5. アプリ内ブラウザで開いている場合は、通常のChrome・Safari・Firefoxで同じURLを開く

## 7. 本番前

Cloud同期が正常に動いたら、`js/firebase-config.js`の次を変更します。

```js
allowLocalEditorFallback: false
```

これにより、認証されていない閲覧者がローカルEditor Modeを開く経路も無効になります。
