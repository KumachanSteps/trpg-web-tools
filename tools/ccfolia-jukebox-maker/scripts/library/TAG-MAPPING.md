# Music Library タグ変換表（レビュー用）

v0.51（PR）で使った変換ルール。試聴していないため、すべて「仮」の扱い（配布元タグから変換した曲は status `s`、旧タブと曲名だけの曲は `p`）。ChatGPT や TK さんの確認で直す前提の表。

## 結果の数

- 曲数 640（ジングル8曲を除外）。配布元タグあり 494、仮タグのみ 146。
- 作曲者が入った曲 554（OpenTracks は曲ページの作曲者、ほかは1人のチャンネルだけ）。
- どの棚にも入らない曲 85（ALL と、次の段階の Search で探す）。タグが1つもない曲 6。
- 棚ごとの曲数：導入 26、日常 43、コミカル 29、会話・交流 44、探索 20、推理・議論 41、密談・駆け引き 31、不穏・謎 48、ホラー・恐怖 53、緊迫・危機 45、戦闘・対決 61、悲しい・切ない 75、感動・希望 59、クライマックス 29、エピローグ 20

## 1. 旧タブ → 新しい棚と基本タグ

| 旧タブ | 新しい棚 | 付けるタグ |
|---|---|---|
| intro | 導入 | Scene: 導入 |
| explore | 探索 | Scene: 探索 |
| deduction | 推理・議論 | Scene: 推理 |
| tension | 緊迫・危機 | Tone: 緊迫 |
| climax | クライマックス | （なし） |
| epilogue | エピローグ | Scene: 終幕 |
| daily | 日常 | Scene: 日常 |
| comic | コミカル | Tone: コミカル |
| moving | 感動・希望 | Tone: 感動 |
| sad | 悲しい・切ない | Tone: 悲哀 |
| unease | 不穏・謎 | Tone: 不穏 |
| horror | ホラー・恐怖 | Tone: 恐怖 |
| digital | （なし） | Setting: サイバー |
| mansion | （なし） | Setting: 洋館・古城 |
| wafu | （なし） | Setting: 和風 |
| fantasy | （なし） | Setting: ファンタジー |
| celtic | （なし） | Tone: 郷愁 / Setting: 自然・野外 |
| ethnic | （なし） | （なし） |
| adult | 会話・交流 | Scene: 交流 / Tone: 優雅 / Setting: 都市・裏社会 |
| jazz | 会話・交流 | Scene: 交流 / Tone: 優雅 / Setting: 都市・裏社会 |
| piano | （なし） | Tone: 静か |
| classical | （なし） | Tone: 優雅 / Setting: 西洋古典 |
| ncs | （なし） | Tone: 疾走 |

## 2. OpenTracks の検索タグ → タグ

曲ページの「検索タグ」（m=ムード、r=リズム・ジャンル）。楽器タグは使っていない。

| コード | OpenTracks | 付けるタグ |
|---|---|---|
| m01 | 明るい | Tone: 軽快 |
| m02 | 楽しい | Tone: 軽快 |
| m03 | 温かい | Tone: 穏やか |
| m04 | 穏やか | Tone: 穏やか |
| m05 | 優しい | Tone: 穏やか |
| m06 | 懐かしい | Tone: 郷愁 |
| m07 | 不思議 | Tone: 幻想 |
| m09 | 可愛い | Tone: 軽快 |
| m12 | 慎ましい | Tone: 静か |
| m13 | 寂しい | Tone: 孤独 |
| m14 | 切ない | Tone: 悲哀 |
| m15 | 冷たい | Tone: 無機質 |
| m16 | 暗い | Tone: 陰鬱 |
| m17 | 悲しい | Tone: 悲哀 |
| m18 | 怒り | Tone: 激しい |
| m19 | 恐ろしい | Tone: 恐怖 |
| m20 | 激しい | Tone: 激しい |
| m21 | サイバー | Setting: サイバー |
| m22 | ファンタジー | Tone: 幻想 / Setting: ファンタジー |
| m23 | コメディー | Tone: コミカル |
| m24 | 悪意 | Tone: 不穏 |
| m25 | 怪しい | Tone: 不穏 |
| m26 | 絶望 | Tone: 絶望 |
| m27 | 希望 | Tone: 希望 |
| m29 | 虚無 | Tone: 無機質 |
| m30 | 爽やか | Tone: 爽やか |
| m31 | お洒落 | Tone: 優雅 |
| m32 | 力強い | Tone: 勇壮 |
| m34 | 緊張感 | Tone: 緊迫 |
| m35 | 日常 | Scene: 日常 |
| m36 | 情熱 | Tone: 高揚 |
| m38 | 淡白 | Tone: 静か |
| r06 | 速い | Tone: 疾走 |
| r10 | 軽快 | Tone: 軽快 |
| r11 | 鈍重 | Tone: 重厚 |
| r22 | ヒーリング | Tone: 穏やか |
| r23 | 和風 | Setting: 和風 |
| r29 | 壮大 | Tone: 壮大 |
| m08 / m10 / m28 / m33 / m37 | 騒々しい / 渋い / シリアス / 弱々しい / 冷静 | 単独では付けない（m10・m37 は下の「組み合わせ」で使う） |

## 3. PeriTune のタグ → タグ

| タグ | 付けるタグ |
|---|---|
| ambient | Tone: 静か |
| beautiful | Tone: 優雅 |
| celtic | Tone: 郷愁 / Setting: 自然・野外 |
| chamber | Tone: 優雅 |
| chillin | Tone: 穏やか |
| cinematic | Tone: 壮大 |
| cold | Tone: 無機質 |
| comical | Tone: コミカル |
| cute | Tone: 軽快 |
| doleful | Tone: 悲哀 |
| dreary | Tone: 陰鬱 |
| everyday | Scene: 日常 |
| fairy-tale | Tone: 幻想 |
| fancy | Tone: 幻想 |
| fantasy | Tone: 幻想 / Setting: ファンタジー |
| fierce | Tone: 激しい |
| fight | Scene: 戦闘 / Tone: 激しい |
| folk-music | Tone: 郷愁 |
| folk | Tone: 郷愁 |
| fun | Tone: 軽快 |
| gentle | Tone: 穏やか |
| gorgeous | Tone: 優雅 |
| gothic | Setting: 洋館・古城、西洋古典 |
| hard_rock | Tone: 激しい |
| healing | Tone: 穏やか |
| hope | Tone: 希望 |
| horror | Tone: 恐怖 |
| hot | Tone: 高揚 |
| japanese_style | Setting: 和風 |
| kind | Tone: 穏やか |
| magnificent | Tone: 壮大 |
| natural | Setting: 自然・野外 |
| pop | Tone: 軽快 |
| powerful | Tone: 勇壮 |
| quiet | Tone: 静か |
| refreshing | Tone: 爽やか |
| sad | Tone: 悲哀 |
| scary | Tone: 恐怖 |
| stately | Tone: 重厚 |
| suspicious | Tone: 不穏 |
| wonder | Tone: 幻想 |
| baroque | Setting: 西洋古典 |
| christmas | Tone: 高揚 |
| halloween | Tone: コミカル |
| sf | Setting: SF・宇宙 |
| cyber | Setting: サイバー |
| battle | Scene: 戦闘 / Tone: 激しい |
| church | Setting: 聖堂・宗教施設 |
| organ | （なし） |
| asian | （なし） |
| chinese | （なし） |
| arabian | （なし） |
| medieval | Setting: ファンタジー |
| tango | Tone: 優雅、ロマンチック |
| minimal | Tone: 静か |
| electronica | （なし） |
| jingle | （なし） |
| vocal | （なし） |
| orchestra | （なし） |
| piano | （なし） |
| classical | （なし） |
| cool | （なし） |

## 4. 曲名のキーワード → タグ

| 曲名に含む語（正規表現、大文字小文字は区別しない） | 付けるタグ |
|---|---|
| `戦い¦戦闘¦合戦¦決戦¦対決¦バトル¦battle¦fight¦combat¦duel` | Scene: 戦闘 |
| `追跡¦逃走¦逃げ¦チェイス¦chase¦escape¦pursuit` | Scene: チェイス |
| `儀式¦ritual¦魔術¦召喚` | Scene: 儀式 |
| `回想¦追憶¦記憶¦思い出¦memor¦remini` | Scene: 回想 |
| `真相¦真実¦truth¦reveal` | Scene: 真相 |
| `休憩¦ティータイム¦tea ?time¦coffee¦cafe¦カフェ¦喫茶` | Scene: 休憩 |
| `潜入¦隠密¦sneak¦stealth¦infiltrat` | Scene: 潜入 |
| `旅¦journey¦travel¦街角¦町¦town¦street¦散歩¦walk` | Scene: 移動 |
| `密談¦交渉¦取引¦駆け引き¦deal¦casino¦poker¦陰謀¦conspir` | Scene: 駆け引き |
| `異変¦異常¦怪異¦anomal` | Scene: 異変 |
| `別れ¦別離¦さよなら¦farewell¦goodbye¦弔¦葬¦requiem¦レクイエム` | Scene: 別離 |
| `再会¦reunion` | Scene: 再会 |
| `決断¦決意¦覚悟¦resolve¦decision` | Scene: 決断 |
| `騒動¦ドタバタ¦ハプニング¦混乱¦panic¦chaos` | Scene: 騒動 |
| `エンディング¦ending¦epilogue¦終幕¦後日` | Scene: 終幕 |
| `会話¦談笑¦おしゃべり¦talk¦chat¦lounge¦ラウンジ¦bar\b¦バー` | Scene: 交流 |
| `夜会¦舞踏¦ワルツ¦waltz¦masquerade¦仮面舞踏` | Tone: 優雅 / Setting: 洋館・古城 |
| `館¦屋敷¦洋館¦城¦castle¦mansion¦manor` | Setting: 洋館・古城 |
| `聖¦教会¦大聖堂¦church¦cathedral¦pray¦祈り¦賛美¦hymn¦chapel` | Setting: 聖堂・宗教施設 |
| `学校¦学園¦放課後¦教室¦school¦campus` | Setting: 学園 |
| `遺跡¦洞窟¦地下¦迷宮¦ruins¦cave¦dungeon¦labyrinth` | Setting: 遺跡・地下 |
| `森¦草原¦forest¦prairie¦meadow¦山¦海¦river¦川¦湖¦lake` | Setting: 自然・野外 |
| `宇宙¦space¦galaxy¦cosmo¦星間` | Setting: SF・宇宙 |
| `サイバー¦cyber¦電脳¦hacker¦ハッカー` | Setting: サイバー |
| `スチーム¦steam¦歯車¦蒸気` | Setting: スチームパンク |
| `クトゥルフ¦cthulhu¦旧支配者¦深淵¦abyss¦邪神¦ネクロノミコン` | Setting: クトゥルフ神話 |
| `終末¦荒廃¦廃墟¦apocalyp¦wasteland¦ruined` | Setting: 終末・荒廃 |
| `狂気¦狂¦madness¦insan¦lunatic` | Tone: 狂気 |
| `壮大¦epic¦荘厳¦majest` | Tone: 壮大 |
| `恋¦love¦romance¦ロマンス¦ロマンチック` | Tone: ロマンチック |
| `希望¦hope` | Tone: 希望 |
| `祭¦festival¦祝¦celebrat¦フェスタ¦fiesta` | Tone: 高揚 |
| `ハロウィン¦halloween¦spook` | Tone: コミカル |
| `孤独¦lonely¦alone¦ひとり` | Tone: 孤独 |
| `絶望¦despair` | Tone: 絶望 |
| `ヴァンパイア¦吸血鬼¦vampire¦ゴシック¦gothic` | Setting: 洋館・古城、西洋古典 |

## 5. 組み合わせ（Scene を足す）

- 戦闘：旧タブがクライマックス・緊迫・デジタル・ファンタジー・和風・クラシック・NCS・ホラーで、Tone「激しい」があり、さらに「勇壮」か OpenTracks の 壮大・ロック・メタル・速い のどれか。
- 駆け引き：旧タブが推理・不穏・緊迫・アダルト・ジャズで、Tone「不穏」があり、OpenTracks の 冷静・お洒落・渋い のどれか。

## 6. 棚に入れる規則

1. 旧タブに対応する棚があれば、その棚。
2. Scene が 戦闘 / 駆け引き / 交流 の曲は、それぞれ 戦闘・対決 / 密談・駆け引き / 会話・交流 の棚にも入れる（複数の棚に入る）。
3. 旧タブに対応する棚がない曲（館もの・ケルト・デジタル・ジャズ以外のジャンル系など）は、次の順で最初に当たった1つの棚へ：
   - 戦闘（scene） → 戦闘・対決
   - 駆け引き（scene） → 密談・駆け引き
   - 交流（scene） → 会話・交流
   - 恐怖（tone） → ホラー・恐怖
   - 狂気（tone） → ホラー・恐怖
   - 不穏（tone） → 不穏・謎
   - 緊迫（tone） → 緊迫・危機
   - 絶望（tone） → 悲しい・切ない
   - 悲哀（tone） → 悲しい・切ない
   - 感動（tone） → 感動・希望
   - 希望（tone） → 感動・希望
   - コミカル（tone） → コミカル
   - 日常（scene） → 日常
   - 探索（scene） → 探索
4. どれにも当たらない曲は棚なし（ALL と Search で見つける）。

## 7. 気になっている点（確認してほしいところ）

- OpenTracks の「不思議」を Tone「幻想」にしているため、幻想が多い（227曲）。ミステリーの「謎めいた」寄りの曲も含まれる。
- 「冷たい」「虚無」を Tone「無機質」にしている。「虚無」は「絶望」や「孤独」の方が近い可能性。
- 「力強い」→「勇壮」、「情熱」→「高揚」の当て方。
- Scene の 移動・潜入・異変・儀式・騒動・回想・別離・再会・真相・決断・休憩 は曲名からしか付かず、数が少ない（配布元にシーンのタグがほぼない）。
- 旧「館もの」の曲は Setting「洋館・古城」だけで、多くは棚なし（ALL から探す）。
