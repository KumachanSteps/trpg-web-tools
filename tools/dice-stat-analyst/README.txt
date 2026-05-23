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


Footer / portal tooltip update:
- .tool-footer-note p を display:block に変更し、2つ目の<p>が改行表示されるように調整。
- [← TRPG Webツール観測所] に hover/focus tooltip「TRPG Webツール観測所 に戻る」を追加。


Screenshot action update:
- Screenshot view hides the memo card.
- Floating screenshot buttons added: Xに投稿 / ダウンロード / コピー＆ペースト / 通常表示に戻す.
- Download uses client-side PNG generation.
- Copy uses ClipboardItem image/png when browser-supported.
- X post copies the screenshot when possible, then opens the X compose screen. Due to browser security, automatic image attachment is not possible; paste/attach on X when needed.


Screenshot capture reliability update:
- Replaced the fragile SVG foreignObject capture path with html2canvas 1.4.1.
- index.html now loads html2canvas from jsDelivr before local JS files.
- Download should now generate a PNG from the screenshot view more reliably.
- Clipboard image copy still depends on browser support and HTTPS. Chrome / Edge are recommended.
- X posting opens the X compose window; browser security does not allow automatic image attachment, so the copied/downloaded image may need to be pasted/attached manually.


Screenshot view exit-only update:
- Removed X post / download / copy buttons from screenshot view.
- Removed related event listeners and screenshot capture helper functions.
- Removed html2canvas CDN loading because image generation is no longer used.
- Screenshot view now only shows the "通常表示に戻す" button.
- Memo card remains hidden in screenshot view.
