
# TRPG WEBツール観測所

TRPGセッション準備・ログ解析・卓報告作成・シナリオ情報整理を支援するためのWebツール集です。

This repository contains a collection of lightweight browser-based tools for TRPG session preparation, log analysis, report generation, scenario organization, and GM/KP support.

## Site

GitHub Pages:

```text
https://kumachansteps.github.io/trpg-web-tools/
````

## Repository Structure

```text
trpg-web-tools/
├─ index.html
├─ terms.html
├─ privacy.html
├─ changelog.html
├─ contact.html
├─ assets/
│  ├─ css/
│  │  └─ portal.css
│  ├─ js/
│  │  ├─ i18n.js
│  │  ├─ language.js
│  │  └─ portal.js
│  └─ img/
│     └─ kuma_icon.ico
└─ tools/
   ├─ dice-stat-analyst/
   ├─ growth-checker/
   ├─ session-report-generator/
   ├─ scenario-snippet-builder/
   ├─ trpg-hashtag-searcher/
   └─ ...
```

## Tools

### 使用可能 / Available

| Tool              | Description                                             |
| ----------------- | ------------------------------------------------------- |
| Dice Stat Analyst | セッションログHTML / テキストから、探索者ごとの成功率・クリティカル・ファンブル・出目分布を解析します。 |

### 開発中 / In Development

| Tool                          | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| CoC 6e/7e Growth Checker      | セッションログから、CoC 6版・7版の成長チェック対象技能をハウスルール別に抽出・整理します。        |
| Session Report Generator      | KP・PL・PC情報を入力し、X/Twitter向けの卓報告文を生成・編集・プレビューします。         |
| Scenario Info Snippet Builder | シナリオ情報、探索箇所、資料、技能成功情報などをCCFOLIA / Discord向けに整形します。      |
| 使えるハッシュタグ検索                   | TRPG配信や卓報告に使えるハッシュタグを、シナリオ名・配信名・関連語句から探しやすくする検索支援ツールです。 |

### アイデア / Ideas

| Tool                    | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| チャットパレット整形ツール           | CoC 6版・7版のチャットパレットを判定し、読みやすい形式へ整形するツール構想です。                           |
| キャラメモ抽出ツール              | いあきゃらのキャラクター情報から、キャラメモやコマ用データを生成するツール構想です。                            |
| TRPG配信観測所               | YouTubeのTRPG配信予定を整理し、シナリオ・チャンネル・GM/KP/PL・ハッシュタグから検索、Fav管理する観測ツール構想です。 |
| TRPG Scenario Organizer | BOOTHやPixivなどで見つけたTRPGシナリオを、システム・人数・時間・秘匿有無・テーマなどで整理、検索するデータベース構想です。  |
| GM Charashi Viewer      | KP / GM向けに、複数のキャラクターシートを一画面で確認・管理するビューア構想です。                          |

## Features

* Static HTML / CSS / JavaScript tools
* GitHub Pages compatible
* No server-side processing required
* Japanese / English language support
* Dawn Mode / Deep Space Mode theme support
* Shared portal layout for all tools
* Tool status management through `assets/js/i18n.js`

## Development Policy

This repository is designed as a static web tool portal.

Each tool should ideally be self-contained under:

```text
tools/tool-name/
├─ index.html
├─ css/
│  └─ style.css
└─ js/
   └─ main.js
```

Shared portal assets should be placed under:

```text
assets/
├─ css/
├─ js/
└─ img/
```

## Adding a New Tool to the Portal

Tool information is managed in:

```text
assets/js/i18n.js
```

Add a new object to the `tools` array:

```javascript
{
  id: "example-tool",
  icon: "🛠️",
  status: "production",
  category: "scenarioPrep",
  href: "./tools/example-tool/",
  name: {
    ja: "サンプルツール",
    en: "Example Tool",
  },
  description: {
    ja: "ツールの日本語説明文です。",
    en: "English description of the tool.",
  },
}
```

Available status values:

```text
available
production
idea
```

Available category values:

```text
logAnalysis
reportWriting
scenarioPrep
characterUtility
haishinTracking
gmSupport
```

## GitHub Pages

This project is intended to be published through GitHub Pages.

Recommended Pages settings:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

## Notes

Some tools may still be in development or idea stage.
The portal may show design previews or placeholder cards before the actual tool implementation is complete.

## Disclaimer

These tools are unofficial fan-made utilities for TRPG session support.

They are not affiliated with any official TRPG publisher, platform, or character sheet service unless explicitly stated.
Users are responsible for checking the rules, licenses, and terms of use of any TRPG system, platform, or external service they use together with these tools.

## License

License undecided.

If you plan to reuse or modify this project, please check the repository owner’s latest license notice.

```
```
