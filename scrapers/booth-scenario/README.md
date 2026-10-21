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
booth-scenario discover-selectors data/snapshots/item_3403696.html --text "既知のタイトル"
```

取得した HTML/JSON は `data/snapshots/`、キャッシュは `data/cache/`、プローブ結果は `data/reports/` に保存されます。`data/` は git 管理外です。

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
- 本文からのルール抽出（人数・プレイ時間・システム・素材）は全て根拠行を `extraction_evidence` に残します。`1PL` だけでは SOLO にせず `ONE_PLAYER_UNSPECIFIED`。

## スキーマからの変更点

- `002_nullable_product_title.sql`: 一覧で ID だけ見つかった段階ではタイトルが未確認なので、`products.title` を NULL 許可にしました。

## Phase 0 の未解決事項（2026-10-21 プローブ結果）

一覧プローブは 2カテゴリ × 2ページ（計240カード）を取得済み。詳細プローブは1件目で停止（下記）したため、詳細ページ側の項目はまだ未検証です。

| 質問 | 状態 |
| --- | --- |
| いいね数は一覧カード / 詳細ページ / 構造化データのどこにあるか | 一覧: **無い**（確認済）。カードには JS で後から描画される空の `div.js-item-card-wish-list-button` だけ。詳細ページ・JSON は未検証 |
| バリエーションは初期 HTML にあり、ID で対応付けられるか | 一覧: 価格が `N JPY~` のカード（240中43、約18%）が複数バリエーション、N は最安値。詳細 HTML の構造は未検証 |
| カテゴリのページングリンクは安定か、1ページのカード数は | **確認済**: 1ページ 60 カード（`li.item-card[data-product-id]`、position 0–59、カード外の商品リンク無し、4ページ間で重複0）。`div.pager a[rel=next]` と `<link rel=next>` あり。Tabletop RPG は最終 page=395、「Results 23,693 件」と一致 |
| 画像 alt や SEO スニペットは信頼できるか | 一覧: サムネイルは `<a>` の background-image で alt 無し。`img alt` はショップアイコンのみ（= ショップ名）。商品名は `data-product-name` 属性とタイトルリンクで取れる。og 系は詳細未取得のため未検証 |
| 商品説明本文を囲む要素（おすすめ欄を除外）は | 未検証（詳細ページ未取得） |

**詳細プローブの停止について:** `CAPTCHA/challenge page on https://booth.pm/ja/items/3403696` で停止しましたが、誤検知の可能性が高いです。検知が `challenge-platform` という文字列を見ていたところ、BOOTH の通常ページはすべて Cloudflare の受動スクリプト `/cdn-cgi/challenge-platform/scripts/jsd/main.js` を読み込んでいます（一覧4ページすべてに存在。一覧は 200KB 超で検査範囲外だったため止まらなかった）。検知をチャレンジ画面専用のマーカーに絞り、停止時はページを `data/cache/*.stopped.html` に残すよう修正しました。再実行は未実施です。

---

**English summary:** Python package that collects public BOOTH TRPG scenario metadata into the normalized SQLite schema from `docs/SCHEMA_SPEC.md`. Phase 0 = migrations, a polite sequential fetcher (8 s delay, robots.txt, hard stop on 403/CAPTCHA/repeated 429), small capped probes, rule-based extraction with evidence, three-valued availability/ownership projections, and tests. No CSS selector is assumed: all start unverified and are filled from real snapshots. Real pages are kept out of git.
