# CoCチャパレ整形ツールv2 — 共通スキーマ / Parser設計

このドキュメントは、チャパレ整形ツールを「既存チャパレの再整形」から
「各キャラシサービスのデータ → 共通形式 → チャパレ生成」へ段階的に作り替えるための設計メモです。

開発順（全体像）:

1. 対応形式のサンプル収集
2. 共通 Character Data Schema
3. 入力元の自動判定
4. サービス別 Parser
5. 既存チャパレロジックの統合
6. テストデータセット / 回帰テスト
7. 共通 Parser ライブラリ化（`shared/` へ）
8. 他ツール（GMキャラシビューワー / いあきゃらメモジェネレーター / Chara Libra 等）へ展開

このファイルが対象にするのは **2・3・6** の土台部分です（PR1）。
Parser本体（4）や出力オプション（5）は後続PRで追加します。

---

## 1. 入力エンベロープの実態

キャラッシュ / いあきゃら / キャラエノ は、いずれも CCFOLIA 系クリップボード形式
（"こま" 形式）で出力されます。

```json
{ "kind": "character", "data": { /* サービス依存 */ } }
```

`data` に共通で入るキー:

| キー | 内容 | 例 |
|---|---|---|
| `name` | キャラクター名（ふりがな込みのことがある） | `"幽谷 糾（鑑識課時代） (ゆうこく ただす)"` |
| `initiative` | DEX 相当のイニシアチブ値 | `13` |
| `externalUrl` | 元キャラシのURL。**サービス判定の主キー** | `"https://iachara.com/view/14244662"` |
| `iconUrl` | アイコン画像URL（無いことがある） | |
| `commands` | チャパレ本文（改行区切り文字列）。**サービスごとに記法が違う** | |
| `status` | `[{label,value,max}]`。`HP` / `MP` / `SAN` | |
| `params` | `[{label,value}]`。`STR`..`EDU`、`DB`、`MOV`、`ビルド` 等 | |
| `memo` | 職業・ふりがな等のフリーテキスト（キャラッシュ / キャラエノ） | |
| `color` / `faces` | 表示用。パース対象外 | |

キャラクター保管所は **JSONではなくプレーンテキストのシート**、
または末尾のバレット無しコマンド群のみ、という2パターンがあります。

---

## 2. 共通 Character Data Schema

サービス依存データを一度この形へ正規化し、以降のチャパレ生成は入力元に依存させません。
（PR1ではフィールド定義のみ。生成側の利用は後続PR）

```jsonc
{
  "meta": {
    "service": "iachara" | "charash" | "charaeno" | "character-storage" | "generic-palette" | "unknown",
    "sourceUrl": "https://iachara.com/view/14244662" | null,
    "edition": "6e" | "7e" | "unknown",   // 判定根拠は §4
    "editionSource": "url" | "command" | "skill" | "manual" | "fallback",
    "name": "幽谷 糾（鑑識課時代）",
    "ruby": "ゆうこく ただす" | null,
    "occupation": "鑑識課" | null,
    "warnings": [ { "code": "SKILL_VALUE_MISSING", "detail": "…" } ]
  },

  "abilities": {                 // すべて最終合計値。未取得は null（0 と区別する）
    "STR": 10, "CON": 9, "POW": 17, "DEX": 13,
    "APP": 8, "SIZ": 15, "INT": 15, "EDU": 17
  },
  "derived": {
    "HP":  { "value": 13, "max": 13 },
    "MP":  { "value": 17, "max": 17 },
    "SAN": { "value": 96, "max": 96, "start": null },
    "MOV": 7 | null,
    "DB":  "+1D4" | null,
    "build": 1 | null,
    "idea": 75 | null, "luck": 85 | null, "knowledge": 85 | null
  },

  "skills": [
    {
      "name": "図書館",            // §3 で正規化済みの表示名
      "raw": "〈図書館〉",         // 元表記（デバッグ用）
      "category": "explore",      // §3 のカテゴリ
      "value": 77,                // 最終値。未取得は null
      "initial": 25,              // その版の初期値（分かる場合）
      "isInitial": false,         // value === initial かどうか（初期値セクション振り分け用）
      "specialization": null      // 例: 射撃 → "拳銃"
    }
  ],

  "weapons": [
    {
      "name": "木刀",
      "skill": "近接戦闘：刀剣" | null,
      "damage": "1D6+{DB}" | null,
      "range": null, "attacks": null, "ammo": null, "durability": null,
      "note": null
    }
  ],

  "profile": { "age": "26", "sex": "男", "height": "174", "weight": "62", "notesText": "…" }
}
```

### 2.1 設計上の約束

- **未取得と 0 と空欄を区別する**: 取得できなかった値は `null`。`0` は「実際に 0」。
- `skills[].value` は初期値・職業P・興味P・成長分を織り込んだ **最終値のみ** を持つ
  （内訳を持つサービスは将来 `breakdown` を追加）。
- 版に依存する初期値表・カテゴリ表は `parser.js` の
  `INITIAL_6E` / `INITIAL_7E` / `CATEGORY_6E` / `CATEGORY_7E` を単一のソースとして使う。
- スキーマは前方互換。フィールド追加は可、既存キーの意味変更は不可。

---

## 3. サービス別 Parser の契約

`js/sources.js`（PR1で追加）が入口。各 Parser は次を満たすオブジェクトを1つ公開します。

```js
{
  id: "iachara",
  label: "いあきゃら",
  // 構造シグネチャで「自分の形式か」を判定。0..1 のスコアを返す（0 = 非該当）
  detect(rawInput, parsedJson /* JSON.parse 成功時のみ */) { return 0.0; },
  // 共通スキーマを返す。PR1時点では未実装（generic-palette のみ実装）
  parse(rawInput, parsedJson) { return /* Character */; }
}
```

`ChatPaletteSources.detectService(rawInput)` は全 Parser の `detect()` を評価し、
最高スコアの `id` を返します。同点/全 0 のときは `"unknown"`。
UI 側は自動判定を既定にし、判定不能・誤判定時のみ手動選択させます（後続PR）。

### 3.1 サービス判定シグネチャ（実装済みの検出根拠）

| service | 主シグネチャ | 補助シグネチャ |
|---|---|---|
| `charash` | `data.externalUrl` ホストが `charash.jp` | `commands` が `〈…〉` で技能名を囲む / `／` 区切り / `[STR×5]` |
| `iachara` | `data.externalUrl` ホストが `iachara.com` | `commands` が `【…】` / `（…）` / 末尾に空行 |
| `charaeno` | `data.externalUrl` ホストが `charaeno.com` | パスが `/7th/` or `/6th/`（版判定にも使用）/ 技能名にブラケット無し / `（（注記））` |
| `character-storage` | JSONでない かつ `■能力値■` / `■技能■` / `■簡易用■` を含む | `《技能》` 表記 / `------ ○○系技能 ------` 罫線 / `:HP+` `:MP-` `:SAN-` コマンド群 |
| `generic-palette` | 上記いずれでもないが `CC` / `CCB` / `1d100<=` 行を含む | 現行v2.55の挙動（＝フォールバック） |
| `unknown` | どれにも当てはまらない | UI で手動選択を促す |

### 3.2 技能名の正規化（サービス差の吸収）

> **実装状況（PR2）**: `parser.js` の `canonicalizePaletteText()` が、ロール行を
> `コマンド<=閾値 【技能名】` の正規形へ揃える（`〈〉`『《》』`[]`・囲みなし・末尾 `((注記))` に対応）。
> `extractPaletteText()` / `detectEdition()` / `buildOutput()` の入口で適用。
> これで キャラッシュ・Charaeno の技能も既存の分類ロジックに乗る。
> `《》` だけで書かれた保管庫の技能テーブル本体（コマンド無し）は対象外（PR3-4）。

Parser は技能名を以下へ寄せてから共通スキーマに載せます（既存 `normalizeSkillName` を土台に拡張）:

- 囲み記号を除去: `〈技能〉` `《技能》` `【技能】` `[技能]` `技能` → `技能`
- 副種別区切りを日本語コロンへ: `射撃（拳銃）` `射撃(拳銃)` `射撃:拳銃` `射撃／拳銃` → `射撃：拳銃`
- `こぶし／パンチ` `こぶし（パンチ）` → `こぶし：パンチ`（副種別として保持）
- `母国語（日本語）` `母国語(日本語)` → `母国語：日本語`
- `クトゥルフ神話` → `クトゥルフ神話技能`
- 7版時は `MELEE_ALIAS_7E` で近接戦闘へ寄せる（既存ロジック）

### 3.3 コマンド記法の認識

`commands` 行から `<コマンド> <閾値> <技能名>` を取り出す際に許容する形:

- コマンド: `CC` `CCB` `sCC` `sCCB` `CBRB` `1d100<=` `1D100<=`（大文字小文字・全角混在可）
- 閾値: 数値 / `{SAN}` `{STR}*5` など変数 / 空（`CCB<= SAN値` のように欠落）
- 技能名: `【】` `〈〉` `《》` `[]` 囲み、または裸のテキスト（行末まで）
- ダメージ行: `1D6+{DB} 素手` `1D3{DB} キック` `1d6+1D4 【ダメージ判定】`

---

## 4. 版（6版 / 7版）判定

優先順:

1. `externalUrl` パス（`charaeno.com/7th/…` → 7e、`charash.jp/view/…/coc6` → 6e）… `editionSource: "url"`
2. コマンド種別（`CC<=` 主体 → 7e、`CCB<=` 主体 → 6e）… `"command"`
3. 技能名の版シグネチャ（既存 `detectEdition`: `近接戦闘`/`射撃：` 等 → 7e、`こぶし`/`忍び歩き` 等 → 6e）… `"skill"`
4. 手動指定 … `"manual"`（最優先。UIトグル）
5. どれも決まらなければ `6e` … `"fallback"`

混在時（6版キャラシに7版技能が紛れる等）は多数決。判定結果と根拠を
解析結果プレビュー（後続PR）に出して誤判定に気づけるようにします。

---

## 5. 「全技能出力」への対応（初期値セクション振り分け）

キャラシによっては未成長の技能もすべて `commands` に出力されます
（例: いあきゃらの全技能出力、キャラクター保管所シート）。この場合:

- `skills[].value` が **その版の初期値と一致** する技能は `isInitial: true`
- チャパレ生成時、`isInitial` の技能は各カテゴリではなく
  `========初期値========` セクションへ回す（現行の `buildInitialLines` を、
  「入力に存在する初期値技能」も拾うよう拡張する ← 後続PR）
- ただし探索技能（目星 / 聞き耳 / 図書館）と回避・近接戦闘は初期値でも各セクションに残す

---

## 6. テスト

`tests/` に各サービスのフィクスチャと、現行出力のスナップショットを置きます。

```
tools/chat-palette-formatter/tests/
├── fixtures/          # 実サンプル（サービス別・版別・全技能あり/なし）
├── snapshots/         # 現行 buildOutput() の出力（回帰の基準線）
├── run.mjs            # node tests/run.mjs で実行
└── README.md
```

`run.mjs` は:

- `sources.js` の `detectService()` が各フィクスチャで期待サービスを返すか
- `parser.js` の `buildOutput()` の出力がスナップショットと一致するか（＝挙動非退行）

を検証します。Parser を足す各 PR ではフィクスチャとスナップショットを追加し、
既存スナップショットが変わる場合は差分を PR 説明で明示します。
