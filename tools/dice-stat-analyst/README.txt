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


v1.366 X share / footer update:
- Changed the X header button from opening the developer profile to opening an X/Twitter intent tweet for this tool.
- Linked @KumachanSteps in the footer disclaimer to the user page.
- Changed footer text alignment from centered to left aligned.
- Updated version stamp to v1.366 2026/06/12.


v1.367 session log transfer:
- Added import support for URLs such as ?import=session-log&from=coc-growth-checker&transfer=localStorage.
- The Dice Stat Analyst reads transferred logs from localStorage/sessionStorage and inserts them into rawInput, then analyzes automatically.
- Added multiple compatible storage keys plus fallback scanning for session-log transfer keys.
- Updated the Growth Checker link to ?import=session-log&from=dice-stat-analyst&transfer=localStorage.
- Clicking the Growth Checker link now saves the current rawInput session log to localStorage/sessionStorage before navigation.
- Updated version stamp to v1.367 2026/06/12.


v1.368 footer spacing:
- Added a small 8px margin above the footer panel so it sits a few pixels below the main app panel group.
- Updated version stamp to v1.368 2026/06/12.


v1.369 tag / toggle / footer update:
- Changed the header pill text from ダイスログインプット to セッションログインプット.
- Reintroduced the same sun/moon symbols used on the switch track inside the toggle thumb:
  - Light mode: ☀
  - Dark mode: ☾
- Increased the footer top margin from v1.368's 8px to 14px.
- Updated version stamp to v1.369 2026/06/12.


v1.37 dark toggle moon visibility fix:
- Fixed the dark-mode toggle thumb so the ☾ symbol is visible when night mode is on.
- Overrode the earlier display:none state from v1.365 for the active toggle icon.
- Removed the old CSS-drawn crescent pseudo-element and renders a simple text ☾ above the thumb.
- Updated version stamp to v1.37 2026/06/12.


v1.371 night mode thumb moon visibility fix:
- Based on the v1.37 rollback version.
- Added explicit ☾ text inside the moon span as a fallback.
- Added a minimal CSS override so the thumb shows ☀ in light mode and ☾ in dark mode.
- Disabled pseudo-element moon rendering to avoid overlap.
- Updated version stamp to v1.371 2026/06/12.


v1.372 light toggle double-sun fix:
- Fixed the light-mode toggle thumb showing the sun symbol twice.
- Disabled pseudo-element icon rendering for both sun and moon.
- Uses only the literal ☀ / ☾ text inside the thumb icon spans.
- Updated version stamp to v1.372 2026/06/12.


v1.373 session log transfer newline fix:
- Fixed the issue where repeated transfers between the Growth Checker and Dice Stat Analyst accumulated literal escaped newlines such as \\n / \\\\n.
- Added transfer-time normalization that converts escaped newline sequences back into real line breaks before saving/importing.
- Normalization is applied on both outgoing transfer to Growth Checker and incoming transfer from Growth Checker.
- Updated version stamp to v1.373 2026/06/12.


v1.374 roll-count parser fix:
- Fixed character attribution by reading the speaker part of CCFOLIA lines before the message body.
- Removed the previous currentCharacter carry-over behavior that could misattribute rolls.
- Fixed multi-result d100 extraction so x2/x3/x6 CCB and similar rolls count every d100 result, not only the first result in the line.
- Added support for multi-d100 list outputs such as 5D100 ... [53,2,67,1,63] and 5B100 ... 78,71,58,98,11.
- Updated tab filtering so custom secret tabs are included unless explicitly excluded; [other], [info], [雑談], [ダイス] remain excluded by default.
- Updated version stamp to v1.374 2026/06/12.

- Added a guard against double-counting single CoC7/BP outputs such as CC<=70 ... > 66 > 66; these now count as one roll unless the line has xN/#N multi-roll segments.


v1.375 parser correction:
- Fixed CCFOLIA HTML extraction so line breaks inside a single <p> message are normalized into one parser line.
  This prevents x2/#1/#2 continuation lines from losing the original speaker and being assigned to 不明.
- Excluded plain non-check d100 rolls such as 1D100 (1D100) ＞ 56.
- Excluded multi-d100 list commands such as 5D100 / 5B100.
- Kept multi-check rolls such as x2 CCB / x6 CCB counted by actual d100 result count.
- Updated version stamp to v1.375 2026/06/27.


v1.376 dice counting rule update:
- Counts d100 rolls without 【】 skill brackets, such as CCB<=85 アイデア.
- Counts plain single 1D100 / D100 rolls as Normal rolls when they have an actual result marker.
- Keeps excluding multi-d100 list commands such as 5D100 / 5B100.
- Counts SAN値 / 正気度ロール entries like other d100 rolls.
- Counts CBR / CBRB as multiple judgment rolls; CBR(87,80) with one d100 result now outputs two roll rows with separate targets and success/fail labels.
- Critical/fumble classification no longer uses numeric thresholds. CoC 6e-style rolls count only 決定的成功 / 致命的失敗, and CoC 7e-style rolls count only クリティカル / ファンブル from the log result text.
- Removed the critical/fumble threshold controls from the input panel.
- Updated version stamp to v1.376 2026/07/06.


v1.377 critical/fumble statistics options:
- Added two left-panel statistics options:
  - Include sanity rolls in critical/fumble statistics.
  - Include 1D100 rolls in critical/fumble statistics.
- Both options are off by default.
- Sanity rolls such as SAN値 / 正気度ロール and plain 1D100-family rolls are still counted as rolls, but their Critical/Fumble labels are downgraded to Success/Fail/Normal for statistics unless the relevant option is enabled.
- Toggling either option re-renders the current analysis without requiring a re-analyze.
- Updated version stamp to v1.377 2026/07/06.


v1.378 input option UI polish:
- Grouped the left-panel analysis options into a dedicated subpanel.
- Changed the auto-hide roll count control to a compact label + number input row.
- Grouped the critical/fumble statistics checkboxes into a nested statistics card with a short explanatory note.
- Added light/dark mode styling for the new option panel.
- Updated version stamp to v1.378 2026/07/06.


v1.379 statistics option color update:
- Changed the light-mode background of the statistics options card to a light green tone.
- Kept the dark-mode statistics options card styling unchanged.
- Updated version stamp to v1.379 2026/07/06.


v1.380 input help readability / statistics card color:
- Reworked the input help text into a compact structured block with examples and short bullet notes.
- Switched the help text rendering to HTML-aware translation so the structure remains readable in JP/EN.
- Changed the light-mode statistics options card background from light green to a pale bright blue.
- Updated version stamp to v1.380 2026/07/06.


v1.381 input help height adjustment:
- Changed the left input panel to a vertical flex layout so the help block can use the remaining panel height.
- Removed the fixed max-height cap from the help block and replaced it with responsive minimum heights.
- Kept the help block's internal scrolling for long content while allowing its visible area to extend closer to the panel bottom.
- Updated version stamp to v1.381 2026/07/06.
