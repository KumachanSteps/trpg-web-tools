# Music Library のデータ作成スクリプト

`js/library-data.js`（曲マスタと初期の12の棚）を書き出すための作業用スクリプト。ツールの動作には使わない。

1. `node dumpcat.js <旧 shelf-data.js> <oEmbed のキャッシュ> > catalog.json`：旧24タブの曲一覧（v0.50 の `js/shelf-data.js` から。チャンネル名は YouTube oEmbed の author_name / author_url）
2. `LIB_WORK=<作業フォルダ> python3 otharvest.py catalog.json <作業フォルダ>/otout`、続けて `python3 otpass2.py <作業フォルダ>`：OpenTracks の曲ページ（埋め込みの YouTube ID が一致するもの）から作曲者・検索タグ・長さを集める
3. `bash ptfast.sh <作業フォルダ>`：PeriTune のタグページを全部たどり、曲ごとのタグを集める（`pttag.sh` と同じキャッシュ）
4. `python3 -I buildlib.py <作業フォルダ> <ツールのフォルダ> [<レビュー用フォルダ>]`：`libmap.py` の変換表でタグ（情報源・状態つき）・音楽スタイル・棚の所属（仮／候補）を決めて `js/library-data.js` を書き出す。レビュー用フォルダを渡すと、曲一覧・タグ集計・棚集計・レビュー待ちの4つの CSV も書き出す
5. `python3 -I migreport.py <作業フォルダ> <レビュー用フォルダ>`：移行レポート（music-library-migration-report.md）。v0.51 初版の結果 `libreport-v051.json` と比べる
6. `python3 -I mapdoc.py <作業フォルダ> > TAG-MAPPING.md`：変換表の説明を作り直す
7. `python3 -I reportv2.py <作業フォルダ> <レビュー用フォルダ>`：v2 のレビュー用 CSV（`music-library-tracks-v2.csv`・`music-library-review-queue-v2.csv`、Review グループ A〜F）と集計 `summary-v2.json`。比べる元は、修正前の `js/library-data.js` を書き出した `baseline-v051.json`

v0.52 で足したこと（2026-11-19）：
- OpenTracks の曲ページで、反対の雰囲気タグ（明るい×暗い、希望×絶望など7組。`libmap.py` の `OT_OPPOSED`）が2組以上同時に付いている曲は「一括付与」とみなす。その曲の OpenTracks 由来タグは候補（suggested）に下げ、ジャンル・楽器も音楽スタイルにしない。1組だけなら、その2つのコードだけを候補に下げる。タグ数の上限は使わない
- 作曲者の補完は `composers.tsv`（公式動画の概要欄・タイトル、配布ページに書かれた名前と、その根拠）。チャンネルや配布サイトの運営者を作曲者とはみなさない

v0.56 で足したこと（2026-11-23）：
- OpenTracks の曲ページのコメント（作曲者の説明。`otout/ot.json` の `comment`、390曲すべてにある）からタグを拾う。変換表は `libmap.py` の `COMMENT`。情報源 `provider_comment`（library-data.js では `c`）、状態は仮。すぐ後に否定が続く言葉は拾わない（`COMMENT_NEG`）。一括付与で候補に下げたタグは、コメントに同じことが書いてあれば仮に戻る。コメントだけでは公開棚に入れない（候補の棚には使う）
- `COMMENT` のタグ ID が Scene・Tone・Setting の一覧にあるかを `libmap.py` を読み込むときに確かめる

変換表の中身は [TAG-MAPPING.md](TAG-MAPPING.md)。タグは試聴していない仮のもの。配布元タグと旧タブ由来は「仮」（provisional）、あいまいな配布元タグと曲名のキーワード由来は「候補」（suggested、検索に使わない）。楽器・ジャンルはタグにせず音楽スタイルに分ける。

v0.53 で変えたこと（2026-11-19、TK さんの指定）：
- 棚は12（導入・日常・コミカル・探索・推理・不穏・緊迫・戦闘・悲しい・感動・クライマックス・エピローグ）。ホラーの旧タブは不穏へ、会話・交流と密談・駆け引きは外した
- Scene は17（導入・日常・コミカル・探索・推理・潜入・不穏・緊迫・戦闘・儀式・パニック・回想・悲しい・感動・真相・休憩・終幕）。旧タブのコミカル・不穏・ホラー・緊迫・悲しい・感動は Scene にも付ける（Tone はそのまま）。曲名のキーワードは チェイス・騒動→パニック、異変→不穏、別れ→悲しい、再会→感動 に読み替え、交流・移動・駆け引き・決断は外した
- 戦闘の棚は旧タブがないので、配布元の戦闘タグ（PeriTune の fight、仮）の曲を公開する（`PUBLIC_BY_PROVIDER_SCENE`）
