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


v1.31 header refresh:
- Header panel width aligned with main application panel width.
- Header top-right controls changed to X / JP/EN / 使い方 / ショートカット / theme switch.
- Header control buttons reduced in size.
- Added subtle bottom-right version stamp: v1.31 2026/06/12.


v1.31 header button size fix:
- Unified the top-right header controls to the same visual size based on the 使い方 button.
- Applied the same width/height to X, JP/EN, 使い方, ショートカット, and the theme switch.


v1.32 header button design refresh:
- Updated [X] [JP/EN] [使い方] [ショートカット] [ライト/ナイトモード] styling based on growth_checker_style.css.
- Restored the reference-style varied min-widths and compact 26px button height.
- Updated version stamp to v1.32 2026/06/12.


v1.33 header button alignment fix:
- Unified header button height for X / JP-EN / 使い方 / ショートカット / theme switch row.
- Adjusted JP/EN and ショートカット to match the 使い方 button size.
- Fixed dark-mode theme switch thumb so it stays inside the 78px switch track.
- Updated version stamp to v1.33 2026/06/12.


v1.34 header control size unification:
- Unified the visual height and font size of X / JP-EN / 使い方 / ショートカット / theme switch.
- Set all header controls to a 28px visual height and 11px font baseline.
- Adjusted the theme switch to a 76px × 28px track with a 22px thumb.
- Fixed dark-mode thumb translation to stay inside the switch track.
- Updated version stamp to v1.34 2026/06/12.


v1.35 header width / centering / moon icon fix:
- Unified header panel width with the main application width using shared CSS variables.
- Re-centered text inside X / JP-EN / 使い方 / ショートカット buttons.
- Re-centered the theme switch thumb vertically.
- Added moon emblem display inside the toggle thumb during dark mode.
- Updated version stamp to v1.35 2026/06/12.


v1.36 app shell / default filters / auto thresholds:
- Wrapped the header panel and main app panel in a shared .dsa-page-shell so their displayed width is matched from the same parent group.
- Removed the visible checklist items for excluding [雑談]/[other]/[info] lines and extracting only d100 rolls.
- Those two filters now behave as default-on when the checkboxes are absent.
- Added automatic critical/fumble threshold switching on analysis:
  - CCB/SCCB-dominant logs: 6th edition thresholds, 5 / 96.
  - CC/SCC-dominant logs: 7th edition thresholds, 1 / 100.
- Updated version stamp to v1.36 2026/06/12.


v1.361 width alignment:
- Removed the visible outer padding from main inside .dsa-page-shell so the input/output panel edges align with the header panel edges.
- Unified header, main panel group, and footer widths using the same CSS variables.
- Tightened the gap between the header panel and main app panels.
- Updated version stamp to v1.361 2026/06/12.


v1.362 slide-down help / shortcut panels:
- Changed the 使い方 and ショートカット buttons to open slide-down panels directly under the header.
- Added a clearer three-step How to Use panel based on the requested 3-block layout.
- Added a slide-down Shortcuts panel with commonly used key commands.
- Kept Escape support compatible by closing the slide panels first.
- Simplified the dark-mode toggle thumb to show a simple moon symbol on the purple thumb.
- Updated version stamp to v1.362 2026/06/12.


v1.363 header-main gap fix:
- Fixed the large default gap between the header panel and the main app panels.
- The closed slide-down panels now have no padding, border, background, or height.
- Tightened the default .dsa-page-shell gap to 8px.
- Updated version stamp to v1.363 2026/06/12.


v1.364 dark toggle emblem update:
- Changed the dark-mode toggle thumb emblem from a moon/crescent to ✨.
- Added overrides to suppress any previous CSS-drawn crescent pseudo-element.
- Updated version stamp to v1.364 2026/06/12.


v1.365 dark toggle emblem removal:
- Removed all sun/moon/sparkle emblems from the theme toggle thumb.
- The toggle now moves without showing any emblem inside the thumb.
- Updated version stamp to v1.365 2026/06/12.
