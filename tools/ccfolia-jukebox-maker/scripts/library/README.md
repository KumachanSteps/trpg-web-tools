# Music Library のデータ作成スクリプト

`js/library-data.js`（曲マスタと初期の15の棚）を書き出すための作業用スクリプト。ツールの動作には使わない。

1. `node dumpcat.js <旧 shelf-data.js> <oEmbed のキャッシュ> > catalog.json`：旧24タブの曲一覧（v0.50 の `js/shelf-data.js` から。チャンネル名は YouTube oEmbed の author_name / author_url）
2. `LIB_WORK=<作業フォルダ> python3 otharvest.py catalog.json <作業フォルダ>/otout`、続けて `python3 otpass2.py <作業フォルダ>`：OpenTracks の曲ページ（埋め込みの YouTube ID が一致するもの）から作曲者・検索タグ・長さを集める
3. `bash ptfast.sh <作業フォルダ>`：PeriTune のタグページを全部たどり、曲ごとのタグを集める（`pttag.sh` と同じキャッシュ）
4. `python3 -I buildlib.py <作業フォルダ> <ツールのフォルダ> [<レビュー用フォルダ>]`：`libmap.py` の変換表でタグ（情報源・状態つき）・音楽スタイル・棚の所属（仮／候補）を決めて `js/library-data.js` を書き出す。レビュー用フォルダを渡すと、曲一覧・タグ集計・棚集計・レビュー待ちの4つの CSV も書き出す
5. `python3 -I migreport.py <作業フォルダ> <レビュー用フォルダ>`：移行レポート（music-library-migration-report.md）。v0.51 初版の結果 `libreport-v051.json` と比べる
6. `python3 -I mapdoc.py <作業フォルダ> > TAG-MAPPING.md`：変換表の説明を作り直す

変換表の中身は [TAG-MAPPING.md](TAG-MAPPING.md)。タグは試聴していない仮のもの。配布元タグと旧タブ由来は「仮」（provisional）、あいまいな配布元タグと曲名のキーワード由来は「候補」（suggested、検索に使わない）。楽器・ジャンルはタグにせず音楽スタイルに分ける。
