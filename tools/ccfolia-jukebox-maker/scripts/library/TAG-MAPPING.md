# Music Library タグ変換表（レビュー用）

`libmap.py` の中身を表にしたもの。2026-11-18 の改修（ジャンルから雰囲気を推定しない、タグと棚の所属を分ける）を反映。試聴して確かめたタグはまだなく、状態は「仮」（provisional）か「候補」（suggested）だけ。候補は検索に使わない。

## 旧タブ（v0.50 の24タブ）

| 旧タブ | 公開棚（仮の所属） | タグ（情報源 legacy_shelf・仮） | 音楽スタイル |
|---|---|---|---|
| intro | 導入 | Scene: 導入 | — |
| explore | 探索 | Scene: 探索 | — |
| deduction | 推理 | Scene: 推理 | — |
| tension | 緊迫 | Scene: 緊迫 / Tone: 緊迫 | — |
| climax | クライマックス | — | — |
| epilogue | エピローグ | Scene: 終幕 | — |
| daily | 日常 | Scene: 日常 | — |
| comic | コミカル | Scene: コミカル / Tone: コミカル | — |
| moving | 感動 | Scene: 感動 / Tone: 感動 | — |
| sad | 悲しい | Scene: 悲しい / Tone: 悲哀 | — |
| unease | 不穏 | Scene: 不穏 / Tone: 不穏 | — |
| horror | 不穏 | Scene: 不穏 / Tone: 恐怖 | — |
| digital | — | — | デジタル |
| mansion | — | Setting: 洋館・古城 | — |
| wafu | — | Setting: 和風 | 和楽器・和風 |
| fantasy | — | Setting: ファンタジー | — |
| celtic | — | — | ケルト |
| ethnic | — | — | 民族系 |
| adult | — | — | ラウンジ・クラブ |
| jazz | — | — | ジャズ |
| piano | — | — | ピアノ |
| classical | — | — | クラシック |
| ncs | — | — | EDM・NCS |
| jingle | （外す） | — | — |

## OpenTracks の雰囲気・リズムタグ（情報源 provider_tag）

| コード | OpenTracks の表記 | タグ | 状態 |
|---|---|---|---|
| m01 | 明るい | Tone: 軽快 | 仮 |
| m02 | 楽しい | Tone: 軽快 | 仮 |
| m03 | 温かい | Tone: 穏やか | 仮 |
| m04 | 穏やか | Tone: 穏やか | 仮 |
| m05 | 優しい | Tone: 穏やか | 仮 |
| m06 | 懐かしい | Tone: 郷愁 | 仮 |
| m07 | 不思議 | Tone: 幻想 | 候補 |
| m09 | 可愛い | Tone: 軽快 | 仮 |
| m12 | 慎ましい | Tone: 静か | 仮 |
| m13 | 寂しい | Tone: 孤独 | 仮 |
| m14 | 切ない | Tone: 悲哀 | 仮 |
| m15 | 冷たい | Tone: 無機質 | 仮 |
| m16 | 暗い | Tone: 陰鬱 | 仮 |
| m17 | 悲しい | Tone: 悲哀 | 仮 |
| m18 | 怒り | Tone: 激しい | 仮 |
| m19 | 恐ろしい | Tone: 恐怖 | 仮 |
| m20 | 激しい | Tone: 激しい | 仮 |
| m21 | サイバー | Setting: サイバー | 仮 |
| m22 | ファンタジー | Setting: ファンタジー | 仮 |
| m23 | コメディー | Tone: コミカル | 仮 |
| m24 | 悪意 | Tone: 不穏 | 仮 |
| m25 | 怪しい | Tone: 不穏 | 仮 |
| m26 | 絶望 | Tone: 絶望 | 仮 |
| m27 | 希望 | Tone: 希望 | 仮 |
| m29 | 虚無 | Tone: 無機質 | 候補 |
| m30 | 爽やか | Tone: 爽やか | 仮 |
| m31 | お洒落 | Tone: 優雅 | 仮 |
| m32 | 力強い | Tone: 勇壮 | 候補 |
| m34 | 緊張感 | Tone: 緊迫 | 仮 |
| m35 | 日常 | Scene: 日常 | 仮 |
| m36 | 情熱 | Tone: 高揚 | 候補 |
| m38 | 淡白 | Tone: 静か | 仮 |
| r06 | 速い | Tone: 疾走 | 候補 |
| r10 | 軽快 | Tone: 軽快 | 仮 |
| r11 | 鈍重 | Tone: 重厚 | 仮 |
| r23 | 和風 | Setting: 和風 | 仮 |
| r29 | 壮大 | Tone: 壮大 | 仮 |

使わないコード: m08 騒々しい、m10 渋い、m28 ｼﾘｱｽ、m33 弱々しい、m37 冷静。ジャンル（r12〜r35 の一部）と楽器（i01〜i26）は、サイトの表記のまま音楽スタイルに入れる。

## PeriTune のタグ（情報源 provider_tag）

| タグ | タグ | 状態 | 音楽スタイル |
|---|---|---|---|
| beautiful | Tone: 優雅 | 仮 | — |
| chillin | Tone: 穏やか | 仮 | — |
| cold | Tone: 無機質 | 仮 | — |
| comical | Tone: コミカル | 仮 | — |
| cute | Tone: 軽快 | 仮 | — |
| doleful | Tone: 悲哀 | 仮 | — |
| dreary | Tone: 陰鬱 | 仮 | — |
| everyday | Scene: 日常 | 仮 | — |
| fairy-tale | Tone: 幻想 | 仮 | — |
| fancy | Tone: 幻想 | 候補 | — |
| fantasy | Setting: ファンタジー | 仮 | — |
| fierce | Tone: 激しい | 仮 | — |
| fight | Scene: 戦闘 | 仮 | — |
| fun | Tone: 軽快 | 仮 | — |
| gentle | Tone: 穏やか | 仮 | — |
| gorgeous | Tone: 優雅 | 仮 | — |
| gothic | Setting: 西洋古典 | 候補 | ゴシック |
| healing | Tone: 穏やか | 仮 | ヒーリング |
| hope | Tone: 希望 | 仮 | — |
| horror | Tone: 恐怖 | 仮 | — |
| hot | Tone: 高揚 | 候補 | — |
| japanese_style | Setting: 和風 | 仮 | 和風 |
| kind | Tone: 穏やか | 仮 | — |
| magnificent | Tone: 壮大 | 仮 | — |
| natural | Setting: 自然・野外 | 仮 | — |
| powerful | Tone: 勇壮 | 候補 | — |
| quiet | Tone: 静か | 仮 | — |
| refreshing | Tone: 爽やか | 仮 | — |
| sad | Tone: 悲哀 | 仮 | — |
| scary | Tone: 恐怖 | 仮 | — |
| stately | Tone: 重厚 | 仮 | — |
| suspicious | Tone: 不穏 | 仮 | — |
| wonder | Tone: 幻想 | 候補 | — |
| medieval | Setting: ファンタジー | 候補 | 中世風 |
| 中世 | Setting: ファンタジー | 候補 | 中世風 |
| ambient | — | — | アンビエント |
| celtic | — | — | ケルト |
| chamber | — | — | 室内楽 |
| cinematic | — | — | シネマ |
| classical | — | — | クラシック |
| baroque | — | — | バロック |
| folk | — | — | フォーク |
| folk-music | — | — | 民族音楽 |
| hard_rock | — | — | ハードロック |
| orchestra | — | — | オーケストラ |
| piano | — | — | ピアノ |
| pop | — | — | ポップ |
| tango | — | — | タンゴ |
| minimal | — | — | ミニマル |
| electronica | — | — | エレクトロニカ |
| cyber | Setting: サイバー | 仮 | — |
| asian | — | — | アジア風 |
| コーラス | — | — | コーラス |
| レトロゲーム | — | — | レトロゲーム |
| vocal | — | — | ボーカル |
| ハロウィン | — | — | — |
| halloween | — | — | — |
| cool | — | — | — |
| jingle | — | — | — |

## 曲名のキーワード（情報源 title_keyword・すべて候補）

| キーワード（正規表現） | タグ |
|---|---|
| `戦い / 戦闘 / 合戦 / 決戦 / 対決 / バトル / battle / fight / combat / duel` | Scene: 戦闘 |
| `追跡 / 逃走 / 逃げ / チェイス / chase / escape / pursuit` | Scene: パニック |
| `儀式 / ritual / 魔術 / 召喚` | Scene: 儀式 |
| `回想 / 追憶 / 記憶 / 思い出 / memor / remini` | Scene: 回想 |
| `真相 / 真実 / truth / reveal` | Scene: 真相 |
| `休憩 / ティータイム / tea ?time / coffee / cafe / カフェ / 喫茶` | Scene: 休憩 |
| `潜入 / 隠密 / sneak / stealth / infiltrat` | Scene: 潜入 |
| `異変 / 異常 / 怪異 / anomal` | Scene: 不穏 |
| `別れ / 別離 / さよなら / farewell / goodbye / 弔 / 葬 / requiem / レクイエム` | Scene: 悲しい |
| `再会 / reunion` | Scene: 感動 |
| `騒動 / ドタバタ / ハプニング / 混乱 / panic / chaos` | Scene: パニック |
| `エンディング / ending / epilogue / 終幕 / 後日` | Scene: 終幕 |
| `夜会 / 舞踏 / ワルツ / waltz / masquerade` | Setting: 洋館・古城 |
| `館 / 屋敷 / 洋館 / 城 / castle / mansion / manor` | Setting: 洋館・古城 |
| `聖 / 教会 / 大聖堂 / church / cathedral / pray / 祈り / 賛美 / hymn / chapel` | Setting: 聖堂・宗教施設 |
| `学校 / 学園 / 放課後 / 教室 / school / campus` | Setting: 学園 |
| `遺跡 / 洞窟 / 地下 / 迷宮 / ruins / cave / dungeon / labyrinth` | Setting: 遺跡・地下 |
| `森 / 草原 / forest / prairie / meadow / 川 / 湖 / lake / river` | Setting: 自然・野外 |
| `宇宙 / space / galaxy / cosmo / 星間` | Setting: SF・宇宙 |
| `サイバー / cyber / 電脳 / hacker / ハッカー` | Setting: サイバー |
| `スチーム / steam / 歯車 / 蒸気` | Setting: スチームパンク |
| `クトゥルフ / cthulhu / 旧支配者 / 深淵 / abyss / 邪神 / ネクロノミコン` | Setting: クトゥルフ神話 |
| `終末 / 荒廃 / 廃墟 / apocalyp / wasteland` | Setting: 終末・荒廃 |
| `狂気 / madness / insan / lunatic` | Tone: 狂気 |
| `恋 / love / romance / ロマンス` | Tone: ロマンチック |
| `孤独 / lonely / alone` | Tone: 孤独 |
| `絶望 / despair` | Tone: 絶望 |

## 候補の棚（公開しない。レビュー用）

- Scene タグから: 導入 → 導入、日常 → 日常、コミカル → コミカル、探索 → 探索、推理 → 推理、不穏 → 不穏、緊迫 → 緊迫、戦闘 → 戦闘、悲しい → 悲しい、感動 → 感動、終幕 → エピローグ（状態を問わず）
- 公開棚がない曲だけ、Tone タグ（仮）に合ったものすべて: 恐怖 → 不穏、不穏 → 不穏、緊迫 → 緊迫、絶望 → 悲しい、悲哀 → 悲しい、感動 → 感動、希望 → 感動、コミカル → コミカル

## 作曲者

OpenTracks の曲ページに載っている作曲者か、1人で運営しているチャンネル（下の表）の曲だけ入れる。それ以外は空欄（推測しない）。

| チャンネル | 作曲者 |
|---|---|
| https://www.youtube.com/@peritune | PeriTune |
| https://www.youtube.com/@koichi_maou | 森田交一 |
| https://www.youtube.com/@yuconishi | コニシユカ |
| https://www.youtube.com/@matsubgm | MATSU |
| https://www.youtube.com/@tak_mfk | Tak_mfk |
| https://www.youtube.com/@zukisuzukibgm | zukisuzuki |
| https://www.youtube.com/@hmixbgm | 秋山裕和 |
| https://www.youtube.com/@bgmusicjp | たう |
| https://www.youtube.com/@zippysound | zippy |
| https://www.youtube.com/@sharou | しゃろう |
| https://www.youtube.com/@imatakumusic | imataku |
| https://www.youtube.com/@ushirokazutaka | 宇城和孝 |
| https://www.youtube.com/@hareno3368 | Hareno |
| https://www.youtube.com/@nanigashisuzuki | 鈴木何某 |
| https://www.youtube.com/@ryo_lion | 音獅子 |

## 結果の数（640曲）

| 棚 | 公開（仮） | 候補 |
|---|---:|---:|
| 導入 | 26 | 0 |
| 日常 | 28 | 96 |
| コミカル | 27 | 12 |
| 探索 | 20 | 0 |
| 推理 | 41 | 0 |
| 不穏 | 66 | 49 |
| 緊迫 | 33 | 38 |
| 戦闘 | 19 | 3 |
| 悲しい | 31 | 83 |
| 感動 | 35 | 38 |
| クライマックス | 29 | 0 |
| エピローグ | 20 | 1 |

タグの状態（曲ごと）: provisional 580、suggested 5、untagged 55
