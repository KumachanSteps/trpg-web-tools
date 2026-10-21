# OBS TRPGサポーター

TRPGの録画・配信で使うOBSのブラウザソース（CCFOLIAの盤面・ステータス・メッセージ欄など）のURLとカスタムCSSを、ルームやPCが変わるたびにまとめて切り替えるツールです。開発中（v0.1）。元になった仕様草案は「OBS TRPG Supporter Starter v0.1」（README / DESIGN）です。

- **OBSに接続**：ブラウザから obs-websocket v5 に直接つなぎます（Node.js不要）。接続先は `ws://127.0.0.1` / `ws://localhost` / `ws://[::1]` だけ。パスワードはメモリ上でだけ使い、保存しません。Chrome・Edge・Firefox、またはOBSの「カスタムブラウザドック」で動きます。Safariはhttpsのページからローカルへの接続を止めることがあります。
- **ルームとPC**：CCFOLIAのルームURL（またはID）と、PCごとの名前・キャラクターID・色。URLを貼るとIDだけを取り出します。「画面ではIDを伏せる」がオンのときは、画面上のURLを `••••` で表示します（コピーされるのは本物）。
- **ブラウザソース**：OBSのソース名（完全一致）と役割（盤面 / 背景 / メッセージ欄 / ステータス（PC） / オーバーレイ / Discord StreamKit / URL指定）、大きさ、カスタムCSS（変更しない / このCSSにする）。
- **確認して適用**：「差分を確認」は読み取りだけ（`GetInputList` / `GetInputDefaultSettings` / `GetInputSettings`）。変わる項目だけを `SetInputSettings`（overlay: true）で送ります。途中で失敗したら、それまでに変えたソースを元に戻します。「元に戻す」は直前の適用を戻し、「変更前の設定を保存」はその内容をJSONで保存します。確認のあとで設定を変えると、もう一度確認するまで適用できません。
- **オーバーレイ**：`overlay.html` を1920×1080のブラウザソースで開くと、背景透過の枠・タイトル・シーン名・PCの名札・休憩画面を出します。レイアウトは 標準 / ノベル / 戦闘 / 休憩・待機、色は ノワール / アーカイブ / ミニマル / ネオン。設定はURLのパラメーターで渡すので、サーバーには何も保存しません。
- **設定ファイル**：自分用（ルームIDつき）、テンプレート（ID抜き）、Node版の `config.json` を書き出せます。読み込みは自分用・テンプレート・Node版の `config.json` のどれでも可。
- **配信・録画前のチェック**：秘匿情報の映り込み、音の二重、MKV録画、参加者の同意などのチェックリスト（このブラウザに保存）。

画面表示は日本語・英語・韓国語に対応しています。

## 安全のための決まり

- 接続はローカルのOBSだけ。ほかのサーバーとは通信しません（GitHub Pagesからページを読むのと、アクセス解析を除く）。
- 設定できるURLは `https://ccfolia.com/rooms/…`、`https://streamkit.discord.com/overlay/…`、このツールの `overlay.html` だけ。
- 変更するのは、名前が完全一致するブラウザソース（`browser_source`）だけ。ほかの種類のソースは変更しません。
- ルームIDなどはこのブラウザの localStorage にだけ保存します。リポジトリやGitHub Pagesに `config.json` を置かないでください。
- CCFOLIAのCSSは同梱していません。公開されているCSSを使うときは、作者の利用条件を確認して貼ってください。CCFOLIAの更新で効かなくなることがあります。

## ファイル構成

```text
tools/obs-trpg-supporter/
├─ index.html              画面
├─ overlay.html            OBSのブラウザソースで開くオーバーレイ（背景透過）
├─ css/
│  ├─ obs-trpg-supporter.css  観測所の共通デザイン（TRPG室内図メーカーと同じ）＋カード・ソース一覧
│  └─ overlay.css             オーバーレイ（OBS 28 の古いChromiumでも動くよう color-mix() を使わない）
├─ js/
│  ├─ model.js       データの形、レイアウトの座標、色、URLの組み立てと許可リスト、書き出し（画面とオーバーレイで共用）
│  ├─ obs-client.js  obs-websocket v5 の最小クライアント（Hello → Identify（SHA-256認証）→ Request）
│  ├─ i18n.js        画面文言（日本語 / English / 한국어）
│  ├─ app.js         画面本体（接続、入力、差分の確認・適用・元に戻す、設定ファイル）
│  └─ overlay.js     オーバーレイの描画
└─ cli/              Node.js版（update-sources.mjs）。Starter v0.1 の同梱スクリプトに、オーバーレイ・DiscordのURL、大きさ、初期値に戻すときの扱いを足したもの
```

## Node.js版（cli/）

1. `cli/config.example.json` を `config.json` にコピーするか、画面の「Node版の config.json」で書き出す。
2. `npm install`
3. パスワードを環境変数に入れる（PowerShell: `$env:OBS_WEBSOCKET_PASSWORD = '...'`、macOS/Linux: `export OBS_WEBSOCKET_PASSWORD='...'`）。
4. `npm run preview` で差分を表示（変更しない）、`npm run apply` で適用。

`cssFile` に `config.json` からの相対パスを書くと、そのファイルの中身をカスタムCSSにします（`css` と同時には使えません）。

## 仕組みのメモ

- OBSの `GetInputSettings` は初期値のままの項目を返さないので、今の値は `GetInputDefaultSettings`（browser_source）の値で補ってから比べます。元に戻すときも、その値を送ります。
- ステータス用のURL `https://ccfolia.com/rooms/{roomId}/characters/{characterId}` は Starter の仕様草案のとおりです。CCFOLIA側の仕様が変わったら `model.js` の `ROLES` を直してください（「URL指定」の役割なら画面から好きな形にできます）。
- オーバーレイの座標は `model.js` の `LAYOUTS`（1920×1080）にあり、画面の「配置の目安」とオーバーレイの両方がここを読みます。

## 次の段階（仕様草案より）

- レイアウトに合わせて、OBSのシーン内のソースの位置・大きさも設定する（`SetSceneItemTransform`）
- シーンの切り替え（標準 → 戦闘 → 休憩）、緊急時の秘匿シーン
- 録画開始・章の切り替えのタイムコード記録（動画のチャプター用）
- OBS本体のテーマ（.ovt）の書き出し
