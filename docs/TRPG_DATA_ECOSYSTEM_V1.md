# TRPG個人データ・エコシステム規格 v1

## 目的

卓ログトラッカーを中心に、卓準備カレンダー、シナリオライブラリ、マイ本棚、配信ログキーパー、嗜好アナライザーが同じ事実を安全に参照できるようにする。ブラウザの一時的な保存領域を唯一の正本にせず、利用者が所有・移行できるデータを正本とする。

この規格は次の2形態を同時に扱う。

1. 個人運用: 1人が自分のMac、Google Drive、ローカルMCPなどを使い、非公開データをまとめて管理する。
2. 第三者運用: 各利用者が自分の端末・クラウド・サーバーに同じ規格を実装し、作者へ個人データを渡さず利用する。

## 基本原則

- **利用者所有**: JSON一式をいつでもエクスポート・復元できる。
- **ローカルファースト**: 編集はオフラインでも成立し、同期は追加機能とする。
- **正本を明示**: ブラウザ保存はキャッシュ。接続ファイル、個人Drive、または個人DBのいずれかを正本に指定する。
- **安定IDで接続**: 表示名ではなくIDでシナリオ、セッション、人物、所持品を結ぶ。
- **由来を保持**: 手入力、Takeout、配信ログ、PDF解析など、値の出所と確度を残す。
- **非破壊同期**: 削除は直ちに消去せず tombstone（`deletedAt`）として同期し、一定期間後に整理する。
- **最小公開**: 感想、人物名、キャラクターURL、購入情報は既定で private とする。

## データ層

### 1. Vault（正本）

`trpg-vault.json`、Google Drive上の専用ファイル、SQLite/D1等。全ツールがここへ直接書き込むのではなく、Vault APIまたはローカルMCPを介する。

### 2. App Store（端末キャッシュ）

各ツールの IndexedDB / localStorage。高速表示とオフライン編集に使う。消えてもVaultから再生成できるものとする。

### 3. Backup（復旧用）

日時付きスナップショットと、接続済み外部JSONへの自動保存。最低30世代、または30日を推奨する。バックアップを同期競合の正本として直接編集しない。

## 共通エンベロープ

```json
{
  "$schema": "https://example.net/schemas/trpg-ecosystem-package.v1.schema.json",
  "format": "trpg.personal-data-package",
  "formatVersion": "1.0.0",
  "packageId": "urn:uuid:...",
  "ownerId": "local:installation-id",
  "exportedAt": "2026-11-08T12:00:00Z",
  "generator": { "app": "session-log-tool", "version": "1.103" },
  "entities": { "sessions": [], "scenarios": [], "people": [], "characters": [], "assets": [] },
  "links": [],
  "tombstones": []
}
```

`formatVersion` はセマンティックバージョニング。未知の追加フィールドは破棄せず保持する。メジャー番号が同じなら後方互換とする。

## エンティティと責務

| エンティティ | 正式な事実 | 主に編集するツール |
| --- | --- | --- |
| `scenario` | シナリオ名、システム、作者/サークル、PL人数、タグ | シナリオライブラリ |
| `session` | 実際に遊んだ卓、日程、役割、参加者、PC、結果 | 卓ログトラッカー |
| `plan` | 予定、候補日、準備タスク、部屋準備状況 | 卓準備カレンダー |
| `viewing` | 視聴した配信・動画と視聴イベント | 配信ログキーパー |
| `ownership` | 所持形態、購入元、ファイル/本棚参照 | マイ本棚 |
| `person` | 同一人物の別名と公開プロフィール | 共通人物台帳 |
| `character` | PC/KPC、キャラシURL、継続可否 | キャラクター台帳 |
| `preferenceSignal` | 嗜好分析用に匿名化・集計した特徴量 | 嗜好アナライザー |

### 必須共通フィールド

すべてのエンティティは以下を持つ。

```json
{
  "id": "urn:trpg-data:session:550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-11-08T12:00:00Z",
  "updatedAt": "2026-11-08T12:00:00Z",
  "revision": 1,
  "visibility": "private",
  "provenance": [{ "source": "manual", "recordedAt": "2026-11-08T12:00:00Z", "confidence": 1.0 }]
}
```

IDはUUIDを推奨し、表示名の変更で変えない。既存の `session_...` IDは移行時に保持し、必要なら `legacyIds` に入れる。

## ツール間リンク

リンクはタイトル文字列ではなくIDで表す。

```json
{
  "id": "urn:uuid:...",
  "type": "session-plays-scenario",
  "from": "urn:trpg-data:session:...",
  "to": "urn:trpg-data:scenario:...",
  "createdAt": "2026-11-08T12:00:00Z",
  "provenance": { "source": "manual", "confidence": 1.0 }
}
```

主な関係は `session-plays-scenario`、`plan-prepares-scenario`、`viewing-features-scenario`、`ownership-owns-scenario`、`session-uses-character`、`person-participates-in-session` とする。

## 嗜好アナライザーへの受け渡し

嗜好アナライザーは生の感想や人物名を既定で受け取らない。各ツール側またはVault APIで次の派生シグナルに変換する。

- シナリオタグ（ホラー、秘匿、バディ、継続向け等）
- プレイ/視聴/所持の種別と回数
- お気に入り、再訪、完走、中断
- GM/PL/DL等の役割
- セッション時間帯・長さ（個人特定につながらない粒度）
- 評価値と、分析利用を許可した短い理由

`analysisConsent` を `none | aggregate | full` で保持し、既定値は `aggregate`。第三者環境では集計を端末内で完結できる。

## 同期規則

1. `id` が同じレコードだけを同一とみなす。タイトル一致は統合候補に留める。
2. `revision` が大きい方を優先するが、双方更新時は `updatedAt` だけで自動上書きせず競合として提示する。
3. 配列は原則ID単位でマージする。文字列配列（タグ等）は和集合にできる。
4. 削除は `{ "id":"...", "deletedAt":"...", "revision":n }` を同期する。
5. インポート前に現在の正本をスナップショットする。
6. アダプターは未知フィールドを round-trip で保持する。

## 個人運用の推奨構成

```text
各Webツール
  ↕ localhost MCP / Vault API
個人Vault（ローカルJSONまたはSQLite）
  ↕ 自動同期
個人Google Drive / iCloud / Time Machine
```

- VaultはGitHub Pagesへ置かない。
- MCPは `127.0.0.1` のみで待受け、ランダムトークンを要求する。
- Drive上ではアプリ専用フォルダを使い、共有リンクを作らない。
- 自動バックアップは最低1つ、端末外にも置く。

## 第三者運用の推奨構成

### サーバー不要モード

利用者が外部JSONを接続し、各ツールが File System Access API を通して更新する。対応外ブラウザでは明示的なエクスポート/インポートを使う。

### セルフホストモード

利用者自身がVault APIをDocker/Node等で起動する。最低限のAPIは以下。

- `GET /v1/export` — 全体パッケージ取得
- `POST /v1/import?mode=merge|replace` — 検証付き取り込み
- `GET /v1/entities/{type}?updatedSince=...` — 差分取得
- `PUT /v1/entities/{type}/{id}` — `If-Match: revision` 付き更新
- `DELETE /v1/entities/{type}/{id}` — tombstone作成
- `GET /v1/changes?cursor=...` — 増分同期

認証は端末内トークン、OIDC等を運用者が選ぶ。公式ホストへ個人データを送信することを前提にしない。

## 実装ロードマップ

1. 卓ログトラッカー: localStorage + IndexedDB 30世代 + 接続JSON自動保存（v1.103）。
2. 全ツール: 共通ID、`createdAt` / `updatedAt` / `revision` / `provenance` を追加。
3. シナリオライブラリを scenario ID の発行元にし、文字列照合候補を確認UIで結び直す。
4. `trpg-vault` ローカルMCPを正本化し、各ツールは読み書きツールを共通利用する。
5. カレンダー、本棚、配信ログ、嗜好分析を共通リンク規格へ移行する。
6. 第三者向けにJSON Schema、サンプルデータ、移行CLI、セルフホスト手順を公開する。

## 現行卓ログ形式との互換性

卓ログトラッカー v1.103 のJSONは `schemas/session-log.v1.schema.json` に従い、従来どおり `rows` と `columns` をルートに持つ。`$schema`、`formatVersion`、`exportedAt`、`source` は追加メタデータであり、旧インポーターは無視できる。次期Vault移行では各 `row` を `session` エンティティへ変換する。
