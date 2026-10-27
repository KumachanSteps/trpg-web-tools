# BOOTH シナリオスクレイパー（Phase 0）

BOOTH で公開されている TRPG シナリオ商品の**公開メタデータ**を集め、SQLite に正規化して保存するための Python パッケージです。
今は Phase 0（スキーマ確定と少量プローブ）の段階で、大規模クロールはしません。

仕様: [docs/SCHEMA_SPEC.md](docs/SCHEMA_SPEC.md) / 引き継ぎ書: [docs/CODEX_PHASE0_HANDOFF.md](docs/CODEX_PHASE0_HANDOFF.md)

## セットアップ

```bash
cd scrapers/booth-scenario
python3 -m venv .venv && . .venv/bin/activate
pip install -e '.[test]'
pytest
```

## 使い方

```bash
booth-scenario init-db                     # data/booth.sqlite3 を作成・マイグレーション
booth-scenario probe-listing --pages 2     # 2カテゴリ × 最大2ページ
booth-scenario probe-detail                # サンプルIDから最大10件
booth-scenario probe-detail --ids 3403696 4604659
booth-scenario report                      # 項目ごとの取得率・エラー
booth-scenario export-catalog --out ../../data/catalog/v1   # Web ツール用カタログ（catalog/v1）を書き出す
booth-scenario discover-selectors data/snapshots/item_3403696.html --text "既知のタイトル"
```

取得した HTML/JSON は `data/snapshots/`、キャッシュは `data/cache/`、プローブ結果は `data/reports/` に保存されます。`data/` は git 管理外です。

## カタログの書き出し（catalog/v1）

`export-catalog` は `scenarios` テーブルの作品を、シナリオライブラリ・マイ本棚が読む JSON（`manifest.json` と `scenarios-NNN.json`）に書き出します。リポジトリの `data/catalog/v1/` に出力してコミットすると GitHub Pages から配信されます。

- 出すのは公開情報だけ（タイトル・別名・システム・人数・時間・価格・ショップ・商品 URL・表紙画像 URL）。説明文・根拠テキスト・購入記録は出しません。
- 表紙は `og:image` の URL だけを保存し、画像ファイルは保存・再配布しません（ブラウザが BOOTH から直接表示）。
- 分からない値は `null`。秘匿HOは HO 条件の記録があるときだけ `true`。
- ライセンスは CC BY 4.0。`manifest.json` の `attribution` が出典表記です。

## 安全ルール（コードで強制）

- 1件ずつ逐次取得、リクエスト間隔は既定 8 秒（最低 3 秒）
- robots.txt を尊重、ログイン・Cookie・回避策は使わない
- 403 / CAPTCHA / 429 の連続 / 接続エラーで即停止
- `https://booth.pm` のみ。ダウンロード・購入・アカウント系パスは拒否
- プローブ上限: 一覧は各カテゴリ2ページ、詳細は10件

## 「推測しない」設計

- CSS セレクタは [selectors.json](src/booth_scenario/selectors.json) で全て `null / verified:false` から始まります。実スナップショットで確認したものだけ `verified:true` にします。未確認の間、一覧ページからは商品リンクの ID とページ番号しか取りません。
- 詳細ページは og:title / canonical / JSON-LD などの Web 標準タグのみ読みます。`og:description` は SEO 用の要約として別保存し、本文扱いしません。
- `/ja/items/<id>.json` という公開 JSON の存在とキー名は**未検証の候補**です。プローブがあるかどうか・どのキーがあるかを記録します。
- 分からない値は NULL（いいね数 0、価格 0、空文字にしない）。「BGMなし」など明示的な否定は `EXPLICITLY_ABSENT` として保存。
- 本文からのルール抽出（人数・プレイ時間・システム・素材）は全て根拠行を `extraction_evidence` に残します。
- レビューで決めた既定値（2026-10-21 TK）:
  - プレイ時間はテキセ／半テキの指定がなければ `VOICE`。「2時間~」「15時間以上」のような上限なしは +1時間（120-180）。キャンペーンは各章と合計の両方を記録。
  - 進行役は CoC なら `KP`、エモクロアなら `DL`。KPレス／DLレスは `NONE/NONE`。
  - タイマンは `KP/KPC`・`DL/DPC`。それ以外（ソロ・複数PL）は本文に KPC/DPC がなければ同行者 `NONE`。KPありで KPC なしの1人用は `SOLO`、タイマンだけ `ONE_ON_ONE`。
  - 「2PL KPレス」は `GMLESS_MULTI`（migration 005）。
  - 秘匿／秘匿HOとあれば人数の各行に `SECRET`（migration 006、`secret_handouts`）。「秘匿なし」は除く。
  - 「2、3人」「2、3時間」は 2-3 の範囲。「タイマンは推奨しない」「タイマン不可」などはタイマンとして数えない。
  - 人数の上限なし（「1人から」「1人~捌けるだけ」）は上限4人、「3人前後」は 2-4。漢数字（四人固定、PL三名）も読む。翻訳文（中文）の人数は使わない。
  - 本文に人数がない単品は、商品名の【CoCソロシナリオ】などから読み、それもなければ `MULTI_PL 2-4`（「探索者たち」も同じ）。アンソロジーや素材にはこの推定を付けない。
  - ソロとタイマンには `SECRET` を付けない。「KPCかNPCかで前後する」のような注記はタイマンの根拠にしない。
  - 価格はシナリオ本体を買えるバリエーション全部の最安-最高（素材のみ・試し読みは除く）。
  - 「これは、シナリオではない」「…はシナリオではなく補助ツール」と本文にあれば `ASSET_ONLY`。「初心者向けのシナリオではありません」のような傾向の説明は除く。
  - 章ごとの時間（其ノ一・第1話・Act1）は `EPISODE`、それらの合計に近い時間は `ALL_EPISODES`。アンソロジーの「1~6時間の短編7本収録」のような要約行は使わない。
  - 単品の作品名は商品名から【CoCシナリオ】や SPLL 番号などを除いたもの（「」『』があればその中）。
  - 権利表記の行（「『クトゥルフ神話TRPG』の二次創作物」など）はシステム判定に使わない。本文にシステムが書いてあればタイトル・タグからは足さない。

### シナリオの傾向（`tendency.py`、migration 009）

本文から次を `scenario_conditions` に記録します（アンソロジーは商品単位の証拠のみ）。レビュー表では各列のツール判定を確認します。

- **推奨技能・ステータス**（`SKILL` / `STATUS`）: 「推奨技能」「準推奨技能」「必須技能」「推奨：」の後ろの一覧（次の行や「、」で続く行も）。「振る機会がある技能」「使える技能」は準推奨。「非推奨：低SAN値」は `NOT_RECOMMENDED`。「なし」「HOごとに記載」も記録。「推奨能力値」「SAN50以上」なども `STATUS` として原文で。
- **ロスト率**（`LOSS`）: ラベル付きの値だけ（「ロスト率：中~高」「【ロスト】あり」「ロスト率：■■」）。`NONE` / `LOW` / `MID` / `HIGH` / `VERY_HIGH`（幅は `LOW-MID`）、`POSSIBLE`（ありとだけ）、`HIDDEN`（伏せ字）、`VARIABLE`（展開次第）。「ロスト救済」「NPCロスト率」は使わない。
- ロスト率の記載がなければ「難易度：低」などをロスト率として使う（KP難易度・PL難易度は除く）。
- **改変**（`MODIFICATION`）: `ALLOWED` / `CONDITIONAL` / `FORBIDDEN`。許可と禁止が両方ある・範囲の条件付きは `CONDITIONAL`。「改変データの配布」など再配布の話は数えない。
- **地雷・注意要素**（`CONTENT_WARNING`）: 「含まれる要素」「以下の要素」「これらの要素を含む」の一覧は要素をすべて原文で、「注意事項」などの下は注意すべき話題（グロ・自殺・PvP など）を含む要素だけ。R-15G なども。検索用に `GORE` / `PVP` などのタグも付け、採点はタグで比べる。
- **公開日**（`products.published_at`）: 商品 JSON の `published_at`。それ以前に取得した商品は再取得で埋まります。

傾向だけを確認する表: `export-review --fields skills lost_rate modification content_warnings`。取り込むと既存のラベルに追加されます。

## スキーマからの変更点

- `002_nullable_product_title.sql`: 一覧で ID だけ見つかった段階ではタイトルが未確認なので、`products.title` を NULL 許可にしました。
- `005_gmless_multi.sql`: `scenario_session_modes.mode` に `GMLESS_MULTI` を追加。

## Phase 0 の未解決事項（2026-10-21 プローブ結果）

一覧 2カテゴリ × 2ページ（240カード）と、詳細 10件（HTML + `/ja/items/<id>.json`）を取得して確認しました。根拠は [selectors.json](src/booth_scenario/selectors.json) の `evidence` にあります。

| 質問 | 結果 |
| --- | --- |
| いいね数は一覧カード / 詳細ページ / 構造化データのどこにあるか | **商品 JSON の `wish_lists_count` のみ**（10/10）。一覧 HTML・詳細 HTML のどちらにも数値は無い（JS で後から描画） |
| バリエーションは初期 HTML にあり、ID で対応付けられるか | **ある**。`ul#variations li.variation-item` が JSON の `variations` と同順・同名（10/10）。ID（`data-product-variant`）はカートボタンのある行だけで、無料DL・在庫切れの行には無い（26行中9行）→ ID は JSON から取り、HTML 行は名前で対応付け。一覧の `N JPY~` は複数バリエーションの最安値 |
| カテゴリのページングリンクは安定か、1ページのカード数は | **1ページ 60 カード**（`li.item-card[data-product-id]`、カード外の商品リンク無し、4ページ間で重複0）。`div.pager a[rel=next]` あり。Tabletop RPG は最終 page=395 =「Results 23,693 件」 |
| 画像 alt や SEO スニペットは信頼できるか | **補助のみ**。画像 alt は商品名かショップ名の繰り返しで内容情報は無い。`og:description` は JSON `description` の先頭を切ったもの（最大約290字）。`og:title` は「商品名 - ショップ名 - BOOTH」。JSON-LD は単一価格か `AggregateOffer` の最安〜最高のみ |
| 商品説明本文を囲む要素（おすすめ欄を除外）は | 本文は `div.js-market-item-detail-description p`（JSON `description` と完全一致）。**さらに 8/10 件にショップ独自の見出し付きセクション `section.shop__text` があり、JSON には入っていない**。システム・人数・時間はここに書かれることが多く、両方を合わせるとルール抽出のヒットが 9 → 63 に増えた。おすすめ欄は `detail.main` の外 |

**検知処理の修正:** 初回の詳細プローブは `CAPTCHA/challenge` で停止しましたが誤検知でした。BOOTH の通常ページはすべて Cloudflare の受動スクリプト `/cdn-cgi/challenge-platform/scripts/jsd/main.js` を読み込んでおり、検知がその文字列に反応していました。チャレンジ画面専用のマーカーに絞り、停止時はページを `data/cache/*.stopped.html` に残すようにしました。修正後の再実行では 10件すべて 200 で停止なし（21リクエスト）。

**この結果に合わせたコード変更:** 説明文は HTML の本文＋セクションを結合して保存し、ルール抽出もそれを使う（JSON の短い説明で上書きしない）。バリエーションは HTML 行を JSON の ID 付き行に統合（重複なし）。JSON の `status` 実測値 `addable_to_cart` / `free_download` → AVAILABLE、`restock_not_requested` → SOLD_OUT を追加。

## Phase 1: 正解データ・シナリオ整理・継続収集

```bash
# 正解データ（50件）
booth-scenario pick-review-set --n 50        # サンプル27件 + 一覧から種類が偏らないよう選ぶ
booth-scenario fetch-items --review-set      # 未取得分を取得（最大60件、8秒間隔）
booth-scenario organize                      # 商品を分類してシナリオを作る
booth-scenario export-review                 # data/review/review_table.xlsx (--out x.csv for CSV)
#  → 黄色の ok_* 列に正しい値を書く（合っていれば空欄、「なし」は -）
booth-scenario import-review data/review/review_table.xlsx
booth-scenario organize                      # 修正した分類（MANUAL）を反映
booth-scenario evaluate                      # 項目ごとの正解率と外れ一覧

# 継続収集（中断しても続きから）
booth-scenario crawl-listing --category "Tabletop RPG" --max-pages 50
booth-scenario crawl-details --limit 200 --max-minutes 60
booth-scenario crawl-details --refresh-older-than-days 30   # 古いものを取り直す
```

- **商品の分類** (`product_classifications`): `SINGLE`（単品。PDF版/部屋付きなど形式違いは1作品）、`COLLECTION`（アンソロジー・シナリオ集）、`SAME_PAGE_VARIANTS`（同じページでセットと単品を販売）、`ASSET_ONLY`（素材のみ）、`UNDETERMINED`（要確認）。レビューで直した分類は `MANUAL` として優先されます。
- **シナリオIDの安定性**: 再実行しても同じ商品・同じ収録作には同じIDが付きます（`scenario_keys`）。
- **別商品との関連**: アンソロジー収録作と単品販売が同じ作品らしい組は `scenario_link_candidates` に候補として入るだけで、自動では統合しません。`CONFIRMED` にしてから `apply-links` で統合します。
- **差分更新**: 一覧のタイトル・価格が前回と変わった商品だけ詳細を取り直します。途中で止まっても `listing_progress` / `crawl_queue` から再開します。失敗した商品は間隔をあけて最大3回まで再試行し、その後は `REVIEW` に回します。

## Phase 2: 定期テストバッチ（TK の PC で実行）

2026-10-24 の決定: 収集は TK の PC で定期的に行い、届いた試験データで採点とルール修正を繰り返す。対象はまず CoC・エモクロア・マダミス。優先項目（作品名・システム・人数・プレイ時間・価格）はなるべく空にしない。

```bash
booth-scenario test-batch --n 50 --out ~/booth-batches   # 約15〜20分（8秒間隔）
```

- 対象ごとに件数を均等に分け（50件なら 17/17/16）、各対象の一覧から**無作為のページ**を選び、1ページ最大5件ずつ**まだ取得していない商品**を取ります。
- 結果は `batch_<日時>/` に `review_table.xlsx`（レビュー表）・`batch.json`（抽出条件と seed）・`booth.sqlite3`（採点用のコピー）として出ます。このフォルダを送ってください。
- 403・CAPTCHA・429 が出たらその場で止まり、そこまでの分だけでフォルダを作ります。
- 対象を絞るときは `--scope coc --scope madamis` のように指定します。

**定期実行の例**

- Windows（タスク スケジューラ）: 「基本タスクの作成」→ 毎週 → 操作「プログラムの開始」に `booth-scenario`、引数に `test-batch --n 50 --out %USERPROFILE%\booth-batches`
- Mac / Linux（cron）: `0 21 * * 6 cd ~/trpg-web-tools/scrapers/booth-scenario && .venv/bin/booth-scenario test-batch --n 50 --out ~/booth-batches`

**採点の流れ（こちらで実行）**

```bash
booth-scenario import-review batch_20261025-2100/review_table.xlsx --batch 20261025-2100 --split test
booth-scenario evaluate --split test      # 正確さ（accuracy / precision）と埋まり具合（coverage）を項目ごとに表示
booth-scenario set-split 20261025-2100 train   # ルール修正に使ったら学習用へ移す
```

- `split=test` のラベルは採点専用です。外れを見てルールを直したら `train` に移し、次の採点は新しいバッチで行います（同じ問題で何度も測らない）。
- 採点項目に価格（`price`）と秘匿HO（`secret_ho`）を追加。プレイ時間は ±1時間を正解とします。
- 一覧の収集も対象ごとにできます: `booth-scenario crawl-listing --scope emoklore --scope madamis --max-pages 50`
- マーダーミステリーはシステム `MADAMIS`、進行役の既定は `GM`（migration 008）。本文・タグでシステムが分からないときは、見つかった一覧のタグ（例: エモクロアTRPG）で補います。

---

**English summary:** Python package that collects public BOOTH TRPG scenario metadata into the normalized SQLite schema from `docs/SCHEMA_SPEC.md`. Phase 0 = migrations, a polite sequential fetcher (8 s delay, robots.txt, hard stop on 403/CAPTCHA/repeated 429), small capped probes, rule-based extraction with evidence, three-valued availability/ownership projections, and tests. No CSS selector is assumed: all start unverified and are filled from real snapshots. Real pages are kept out of git.
