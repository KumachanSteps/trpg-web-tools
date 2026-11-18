# Music Library のデータ作成スクリプト

`js/library-data.js`（曲マスタと初期の15の棚）を書き出すための作業用スクリプト。ツールの動作には使わない。

1. `node dumpcat.js <旧 shelf-data.js> <oEmbed のキャッシュ> > catalog.json`：旧24タブの曲一覧（v0.50 の `js/shelf-data.js` から。チャンネル名は YouTube oEmbed の author_name / author_url）
2. `LIB_WORK=<作業フォルダ> python3 otharvest.py catalog.json <作業フォルダ>/otout`、続けて `python3 otpass2.py <作業フォルダ>`：OpenTracks の曲ページ（埋め込みの YouTube ID が一致するもの）から作曲者・検索タグ・長さを集める
3. `bash ptfast.sh <作業フォルダ>`：PeriTune のタグページを全部たどり、曲ごとのタグを集める（`pttag.sh` と同じキャッシュ）
4. `python3 buildlib.py <作業フォルダ> <ツールのフォルダ>`：`libmap.py` の変換表でタグと棚を決めて `js/library-data.js` を書き出す

変換表の中身は [TAG-MAPPING.md](TAG-MAPPING.md)。タグは試聴していない仮のもの（配布元タグ由来は `s`、旧タブと曲名だけは `p`）。
