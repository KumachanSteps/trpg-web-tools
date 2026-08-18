# くま。卓の星図 v1.7

個人用TRPGホームページ。GitHub Pagesで公開できる静的サイトに、Googleログイン・Firestore・Google Calendar選択インポートのテスト実装を追加した版です。


## v1.7 GitHub Pages配置・計測設定

- 配置先を `trpg-web-tools/star-map/` として運用
- `index.html` にGoogle Analytics（`G-NJD5JZML31`）を追加
- `index.html` に共通favicon `../assets/img/kuma_icon.ico` を追加
- 公開URL：`https://kumachansteps.github.io/trpg-web-tools/star-map/`


## v1.6 Characters表示修正

- Chara Libraの保存領域から同じ探索者が複数候補として検出された場合、探索者名を基準に1件へ統合
- 「引退」または `retired` ステータスのキャラクターを表示対象から除外
- `updatedAt` / `modifiedAt` / Firebase Timestampなどを解釈し、更新日時の新しい順で表示
- オブジェクト型タグを適切なラベルへ変換し、`[object Object]` 表示を防止


## v1.5 カレンダー詳細表示

- 過去ログ・今後の予定とも、カレンダー詳細カードから `NOTE` 行を除外
- 表示項目は `STATUS` までに整理し、複数セッション時も画面内に収まりやすく調整

## このZIPをそのまま開いた場合

Firebase設定値がプレースホルダーのため、右下のボタンは `LOCAL EDITOR` として動作します。

- 手動予定の追加・編集・削除
- ICSファイル取込
- 所持シナリオ管理
- JSONバックアップ
- 公開用 `published-data.js` 書き出し

は従来どおり試せます。

GoogleログインとCalendar APIを試すには、`GOOGLE_EDITOR_SETUP.md`に沿って設定してください。

## trpg-web-toolsへの配置

このディレクトリはリポジトリ直下の `star-map/` に配置します。`main`に反映されると、GitHub Pagesの現在の公開設定から次のURLで配信されます。

```text
https://kumachansteps.github.io/trpg-web-tools/star-map/
```

Firebaseは既存の `trpg-web-tool` Web Appと編集者メールを設定済みです。Calendar連携もFirebaseのGoogle Providerを再利用するため、別のOAuth Client IDは不要です。Google Cloud側ではCalendar APIを有効化してください。

## Characters公開データ

Charactersページは次の順でデータを読みます。

1. `data/characters.json` の公開データ
2. 同一ブラウザの Chara Libra 正式保存キー `trpg-chara-libra-v1`
3. 旧バージョン用の IndexedDB / localStorage 互換探索

公開訪問者にもキャラクターを見せる場合は、Chara Libraの「ライブラリーJSONを書き出し」で得たJSONを `data/characters.json` として置き換えます。管理者本人のブラウザでは Chara Libra のローカル更新も併せて反映されます。

## Editor Mode

### Cloud設定後

1. 右下の `✦ SIGN IN` を押す
2. Googleアカウントでログイン
3. `js/firebase-config.js`に登録されたUIDまたはメールと一致するとEditor認証
4. 右下の `✦ EDITOR` を押してEditor Modeを開始

右クリックまたはShift+クリックで、Googleアカウント、Firebase UID、Firestore接続状態を確認できます。

### Cloud設定前

本番用の `allowLocalEditorFallback` は `false` に設定済みです。Cloudのないローカル検証で編集UIが必要な場合だけ、一時的に `true` へ変更してください。

## Google Calendar固定同期パイプライン

`PLANs`ページのEditor Modeに次の機能を追加しています。

1. `tkoide2021@gmail.com`でEditorログイン
2. Google Calendarへ読み取り専用で接続
3. 取得期間を指定
4. 「指定範囲を読み込み・サイトへ反映」を押す
5. 固定された「TRPG」「とこちゃん」のイベントを取得
6. APIレスポンスとブラウザ変換の双方で日本時間（`Asia/Tokyo`）を使用
7. GoogleイベントIDを基準に追加・更新し、指定期間内で削除された予定もサイトから除去
8. 必要なイベントだけシナリオ名、Scenario ID、役割、システム、状態、時間帯を修正して再保存

インポート済みイベントには次のGoogle識別情報を保持します。

- `googleCalendarId`
- `googleEventId`
- `googleRecurringEventId`
- `googleOriginalStartTime`
- `googleSourceKey`
- `googleUpdatedAt`
- `googleTimeZone`（常に `Asia/Tokyo`）

同じGoogleイベントを再取得した場合は、日付・タイトルだけで重複判定せず、Google側のIDを使って既存予定を更新します。

## Firestoreデータ

編集可能なデータだけを1つの公開ドキュメントに保存します。

```text
starMapData/public
├─ events
├─ ownedScenarios
├─ scenarioOverrides
├─ updatedAt
└─ version
```

過去の653セッション履歴とシナリオ集計は、引き続き静的ファイルに保持します。

- `js/sessions-data.js`
- `js/scenario-data.js`

Firestoreへ移す必要はありません。

## データ保存の優先順位

1. Firestoreへ未送信のローカル下書き
2. Firestore上の公開データ
3. `js/published-data.js`

編集時は最初にローカルへ保存し、認証済みならFirestoreへ自動同期します。ネットワークやRulesの問題で保存に失敗した場合も、ローカル下書きは残ります。

## シナリオページへの反映

- 未来の日付：Planning to Play
- 当日または「現行」：Currently Playing
- 過去 + PL：Played
- 過去 + KP / GM / DL / SKP：Available to GM
- 手動所持登録：Owned
- 中止：自動分類しない

## 主な追加ファイル

- `js/firebase-config.js` — Firebase / OAuth / Editor設定
- `js/cloud-editor.js` — Firebase Auth、Firestore、Calendar API
- `firestore.rules` — 公開読取・Editor限定書込Rulesの雛形
- `firebase.json` — Firestore Rules用設定
- `GOOGLE_EDITOR_SETUP.md` — 初期設定手順

## 注意

- Google OAuthは`file://`で正しく動作しません。GitHub PagesまたはlocalhostのHTTPサーバー上でテストしてください。
- Firebase Web ConfigやOAuth Client IDは公開される識別子です。編集保護はFirestore Rulesで行います。
- `allowLocalEditorFallback`は本番用に `false` のまま運用します。
## v1.1 Editor visibility update

- `characters.html` の「Chara Libraから自動読込」パネルと注意書きは、Editor Modeが有効な場合のみ表示されます。
- TOPページのカレンダー下に、Editor Mode専用の「今後のセッションを追加」フォームを追加しました。
- 登録した予定はカレンダー、今後の予定、統計、シナリオ分類に即時反映されます。
- 詳細な編集・削除・Google Calendar取込は `plans.html?editor=1` から利用できます。


## v1.2 TOP About Me preview

- TOPページに「この星図の管理人」セクションを追加しました。
- About Meの概要、ハンドルネーム、主なTRPGシステムをコンパクトに表示します。
- セクション見出しとカード全体の両方から `about.html` へ移動できます。
- PC・スマートフォンの両方でレイアウトが自然に切り替わります。


## v1.3 Ursa Minor + Scenario card editor

- TOPページ「この星図の管理人」のアイコンを、北極星を含むこぐま座（Ursa Minor）の星座モチーフへ変更しました。
- Scenarioページの各カードに、Editor Mode専用の表示・編集・削除ボタンを追加しました。
- 目のアイコンを押すと斜線付きアイコンへ切り替わり、通常閲覧時にはそのカードを非表示にします。
- 非公開カードはEditor Mode中のみ半透明で表示され、再度目のアイコンを押すと公開へ戻せます。
- 編集では表示名、Scenario ID、システム、表示メモを変更できます。卓回数と分類は引き続きログ・カレンダーから自動算出します。
- 削除は元の卓ログを消さず、Scenario一覧から除外する上書き設定として保存されます。
- これらの設定は `scenarioOverrides` としてローカル下書き、Firestore、公開用 `published-data.js` に含まれます。


## v1.4 Persistence verification + historical calendar popover

### Editor interactions and storage

All editable interactions use the same data document shape:

```text
events             — manual / Google Calendar session plans
ownedScenarios     — manually registered Owned scenarios
scenarioOverrides  — scenario-card title, ID, system, note, hidden, deleted settings
```

Saving follows this order:

1. The change is written to `localStorage` as `kuma-star-map-editor-draft-v1`.
2. If an authorized Google editor is connected, the complete editable dataset is automatically written to Firestore document `starMapData/public`.
3. After Firestore confirms the save, the local draft is removed.
4. If Cloud saving fails, the local draft remains and can be synchronized again later.
5. Without Cloud configuration, `published-data.js` can be exported and committed for public deployment.

Historical `sessions-data.js` and generated `scenario-data.js` are read-only source files and are not rewritten by browser editing.

### Historical calendar details

- Clicking a date with sessions activates the detail popover.
- Dates with multiple records open a wider responsive panel using multiple columns.
- The header displays the number of sessions represented.
- After the first click, hovering or keyboard-focusing another date with records replaces the open panel with that date’s details.
- Clicking outside, pressing Escape, scrolling, or resizing closes the panel and ends hover tracking.
