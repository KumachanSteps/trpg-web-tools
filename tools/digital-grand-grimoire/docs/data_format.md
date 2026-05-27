# 電子版グランド・グリモア v0.2 データ形式

このフォルダは、GitHub Pagesでそのままテストできる静的Webツール用の構成です。

v0.2では、呪文データを `effect_summary / keeper_note / pl_note` を中心に再整理しました。
公式本文をそのまま格納するのではなく、**個人用の目録・検索・シナリオ準備メモ**として扱いやすい短い要約を基本にします。

## 重要なメモ項目

```text
effect_summary:
Short mechanical/functional summary.
“What does this spell basically do?”

keeper_note:
How the Keeper may use it in a scenario.
“When is this useful dramatically?”

pl_note:
Player-facing paraphrased clue, handout, or lore text.
“What can I safely give to PCs during play?”
```

## フォルダ構成

```text
digital-grand-grimoire/
├─ index.html
├─ css/
│  └─ grand-grimoire.css
├─ js/
│  ├─ grand-grimoire.js
│  ├─ storage.js
│  ├─ search.js
│  ├─ editor.js
│  ├─ scenario-editor.js
│  ├─ import-export.js
│  ├─ copy-output.js
│  └─ sample-data.js
├─ data/
│  ├─ spells.json
│  ├─ grimoires.json
│  ├─ artifacts.json
│  ├─ scenario_sets.json
│  ├─ tags.json
│  ├─ sources.json
│  └─ categories.json
└─ docs/
   └─ data_format.md
```

## 共通コア項目

呪文・魔導書・アーティファクトは、検索・一覧表示・コピー出力のために、以下の共通項目を持ちます。

```json
{
  "id": "",
  "type": "spell | grimoire | artifact",
  "typeLabel": "呪文 | 魔導書 | アーティファクト",
  "icon": "✦ | ▣ | ◆",
  "name": "",
  "alternative_names": [],
  "category": "",
  "source": "",
  "edition": "",
  "page": "",
  "effect_summary": "",
  "keeper_note": "",
  "pl_note": "",
  "tags": [],
  "audience": ["keeper"],
  "full_text": "",
  "updatedAt": "",
  "favorite": false,
  "scenarioEdited": false
}
```

## spells.json

呪文データは、共通コア項目に加えて `cost_summary` と `casting_time_summary` を持ちます。

```json
{
  "id": "",
  "type": "spell",
  "typeLabel": "呪文",
  "icon": "✦",
  "name": "",
  "alternative_names": [],
  "category": "",
  "source": "",
  "edition": "",
  "page": "",
  "cost_summary": "",
  "casting_time_summary": "",
  "effect_summary": "",
  "keeper_note": "",
  "pl_note": "",
  "tags": [],
  "audience": ["keeper"],
  "full_text": "",
  "updatedAt": "",
  "favorite": false,
  "scenarioEdited": false
}
```

### spells.json 項目メモ

```text
cost_summary:
Exact costではなく、MP・SAN・素材・儀式代償などの概要。
詳細数値は所持資料を参照する前提。

casting_time_summary:
発動に必要な時間・儀式準備・状況条件の短い概要。

effect_summary:
Short mechanical/functional summary.
“What does this spell basically do?”

keeper_note:
How the Keeper may use it in a scenario.
“When is this useful dramatically?”

pl_note:
Player-facing paraphrased clue, handout, or lore text.
“What can I safely give to PCs during play?”
```

## grimoires.json

魔導書データは、共通コア項目に加えて、読解・収録内容・収録呪文に関する概要を持ちます。

```json
{
  "id": "",
  "type": "grimoire",
  "typeLabel": "魔導書",
  "icon": "▣",
  "name": "",
  "alternative_names": [],
  "category": "",
  "source": "",
  "edition": "",
  "page": "",
  "language_summary": "",
  "reading_time_summary": "",
  "contents_summary": "",
  "included_spells": [],
  "effect_summary": "",
  "keeper_note": "",
  "pl_note": "",
  "tags": [],
  "audience": ["keeper"],
  "full_text": "",
  "updatedAt": "",
  "favorite": false,
  "scenarioEdited": false
}
```

### grimoire向けの解釈

```text
effect_summary:
読解・研究によって得られる機能的な効果や、シナリオ上の役割。
例：呪文の手がかりを得る、特定神格の情報を得る、儀式条件を知る。

keeper_note:
どの場面で魔導書を置くとドラマになるか。
例：展示品、遺品、禁書庫の中心資料、NPCの研究対象。

pl_note:
PCに渡せる安全な解読文・手がかり・ハンドアウト文。
```

## artifacts.json

アーティファクトデータは、共通コア項目に加えて、外見・起動条件・リスク・破壊方法の概要を持ちます。

```json
{
  "id": "",
  "type": "artifact",
  "typeLabel": "アーティファクト",
  "icon": "◆",
  "name": "",
  "alternative_names": [],
  "category": "",
  "source": "",
  "edition": "",
  "page": "",
  "appearance_summary": "",
  "activation_summary": "",
  "cost_summary": "",
  "effect_summary": "",
  "risk_summary": "",
  "destruction_summary": "",
  "keeper_note": "",
  "pl_note": "",
  "tags": [],
  "audience": ["keeper"],
  "full_text": "",
  "updatedAt": "",
  "favorite": false,
  "scenarioEdited": false
}
```

### artifact向けの解釈

```text
effect_summary:
そのアイテムが機能的に何をするか。
例：儀式の焦点具、封印の鍵、神話存在との接点、戦闘用の特殊武器。

keeper_note:
どの場面で出すとシナリオが面白くなるか。
例：キーアイテム、代償の肩代わり、NPC変質の証拠、クライマックスの選択肢。

pl_note:
PCに見せられる外見描写・鑑定結果・不穏な手がかり。
```

## type

```text
spell      呪文
grimoire   魔導書
artifact   アーティファクト
```

## scenario_sets.json

シナリオ用編集は、元データを直接上書きせず、シナリオセット内の派生データとして保存します。

```json
{
  "id": "scenario_001",
  "name": "黒き嵐が来る前に",
  "summary": "博物館を舞台にしたシナリオ。",
  "items": [
    {
      "id": "scenario_item_001",
      "baseType": "spell",
      "baseId": "spell_001",
      "scenarioName": "冥界王の召喚儀式",
      "playerText": "PLに開示する説明",
      "keeperText": "KP用の真相メモ",
      "successText": "成功時の処理",
      "failureText": "失敗時の処理",
      "memo": "運用メモ"
    }
  ]
}
```

## データ保存方針

- 初期表示データは `data/*.json` から読み込みます。
- ツール上で編集・登録したデータは `localStorage` に保存されます。
- `JSONエクスポート` でバックアップJSONをダウンロードできます。
- `JSONインポート` でバックアップJSONを復元できます。
- v0.1以前の `summary / description / keeperMemo / playerText / isFavorite` は、読み込み時にv0.2形式へ簡易変換されます。

## GitHub Pagesでの注意

`fetch()` で `data/*.json` を読み込むため、ローカルで `index.html` を直接開くよりも、GitHub Pagesや簡易ローカルサーバーで確認するのがおすすめです。

```bash
python -m http.server 8000
```

```text
http://localhost:8000/digital-grand-grimoire/
```
