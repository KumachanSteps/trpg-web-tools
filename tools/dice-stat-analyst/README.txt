Dice Stat Analyst full files

反映先:
trpg-web-tools/tools/dice-stat-analyst/

含まれる変更:
- <title> を「ダイス統計アナライザー｜TRPG Webツール観測所」に更新
- ヘッダーリンク表記を「← TRPG Webツール観測所」に更新
- ヘッダーリンクのマウスオーバーポップアップを追加
- Google tag と favicon を index.html に追加
- フッター「利用上の注意」を index.html に追加
- CC1 / CC2 / CCB1 などのダイスコマンドを CC 系として扱う parser 修正を含む

配置:
index.html
css/dice-stat-analyst.css
js/*.js


Current rollback point:
- Screenshot mode keeps align-items:flex-start / justify-content:flex-start.
- main, section, and #summary are height:auto with min-height:0 / max-height:none.
- Summary memo card bottom margin is removed.
- Footer minimalization changes are not applied in this package.


UI adjustment applied:
- Header description is kept on one line on desktop using white-space: nowrap / ellipsis.
- Shortcut button Japanese label changed to ショートカット一覧.
- Favicon path confirmed: ../../assets/img/kuma_icon.ico.
- Footer note is now a minimal low-height panel shown below the main viewport area.
- Main input/output panels use the initial viewport height on desktop, so footer appears after scrolling.
