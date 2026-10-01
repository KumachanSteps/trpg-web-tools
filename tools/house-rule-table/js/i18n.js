/* CoCハウスルール表メーカー — 画面の文言（日本語 / English / 한국어） */
(function (global) {
  'use strict';

  const X_LINK = '<a href="https://x.com/KumachanSteps" target="_blank" rel="noopener noreferrer">@KumachanSteps</a>';

  const ja = {
    meta: {
      title: 'CoCハウスルール表メーカー｜TRPG WEBツール観測所',
      description: 'クトゥルフ神話TRPG（6版・7版）の卓で使うハウスルールを、よくあるルールから選んで表にまとめ、画像（PNG）・テキスト・Markdownで書き出せるツールです。'
    },
    eyebrow: 'TRPG WEBツール観測所',
    title: 'CoCハウスルール表メーカー',
    lead: 'クトゥルフ神話TRPG 6版・7版の卓で使うルールを、よくあるハウスルールから選んで表にまとめます。DiscordやX、募集文に貼れる画像・テキストで書き出せます。',
    portal: '←TRPG WEBツール観測所',
    share: 'X / Twitterで共有',
    shareText: 'CoCハウスルール表メーカー｜TRPG WEBツール観測所 でハウスルール表を作りました',
    langGroup: '言語切替',
    help: '使い方',
    themeLight: 'ライトモード（クリックでナイトモード）',
    themeDark: 'ナイトモード（クリックでライトモード）',
    close: '閉じる',
    credit: 'CoCハウスルール表メーカー / くま。TRPG WEBツール観測所',
    helpItems: [
      '1. 「6版／7版／両方」で、表にする版を選びます。版共通のルールはどの版でも表示されます。',
      '2. 迷ったら「プリセット」から「ルールブック準拠」か「よくある卓」を選ぶと、全部のルールにひと通り値が入ります。',
      '3. 各ルールの ○ ／ × ／ 選択肢 をタップして設定します。「※」はルールブックから変更していることを表す印です。※を選んだら、注記欄に変更内容を書きます。',
      '4. 目のアイコンで、そのルールを表に載せるかどうかを切り替えます。薄く表示されている行は表に載らず、書き出しにも入りません。',
      '5. 各カテゴリの「＋ルールを追加」で卓独自のルールを足せます。ルール名は文字をタップすると書き換えられます。',
      '6. 「書き出す」から画像（PNG）・テキスト・Markdownで出力します。Discordにはテキストか画像がおすすめです（DiscordではMarkdownの表は表示されません）。'
    ],
    helpNotes: [
      '入力した内容はこのブラウザに自動で保存されます。別の端末で続きを作るときは「保存」でファイルに書き出し、「開く」で読み込んでください。',
      'スマートフォンでは、行を右にスワイプすると表に載せる／載せないを切り替え、追加したルールは左にスワイプで削除できます。',
      'ルール名と選択肢は一般的な呼び方をもとにしています。卓での呼び方に合わせて自由に書き換えてください。'
    ],
    bar: {
      edition: '版',
      ed6: '6版',
      ed7: '7版',
      both: '両方',
      preset: 'プリセット',
      presetTitle: 'プリセットを選ぶ',
      presetRaw: 'ルールブック準拠',
      presetRawNote: 'ルールブックどおりの値を入れ、よく使うルールだけを表に載せます。',
      presetPop: 'よくある卓',
      presetPopNote: 'オンセでよく見るハウスルール（CCB・SANチェックのクリティカル/ファンブル適用・技能上限など）を入れます。',
      presetClear: '全部未設定に戻す',
      presetClearNote: '値と注記を空にします。追加したルールは残ります。',
      save: '保存',
      open: '開く',
      export: '書き出す'
    },
    info: {
      heading: '表の情報',
      titlePh: 'ハウスルール表',
      kp: 'KP名',
      system: '対象システム',
      scenario: '適用シナリオ',
      date: '更新日',
      remarks: 'その他・備考',
      remarksPh: '表のいちばん下に載せたい補足（任意）',
      optional: '空欄の項目は表に出ません'
    },
    cols: { rule: 'ルール', value: '適用・設定', note: '説明・注記' },
    row: {
      show: '表に載せる',
      hide: '表に載せない',
      remove: 'このルールを削除',
      notePh: '説明・注記',
      noteModPh: '変更内容を書いてください',
      namePh: 'ルール名',
      resetName: '元の名前に戻す',
      unset: '未設定',
      free: '自由記述',
      freePh: '設定の内容',
      count: '{a}/{b}件を表示',
      showAll: 'すべて表に載せる',
      hideAll: 'すべて表から外す',
      add: '＋ルールを追加',
      newRule: '新しいルール',
      collapse: '折りたたむ／開く'
    },
    exp: {
      title: '書き出す',
      png: '画像（PNG）',
      txt: 'テキスト',
      md: 'Markdown',
      theme: '色',
      light: 'ライト',
      dark: 'ナイト',
      layout: 'レイアウト',
      wide: '横長（PC向け）',
      narrow: '縦長（スマホ向け）',
      legend: '凡例を入れる',
      notes: '注記を入れる',
      savePng: 'PNGを保存',
      copyImg: '画像をコピー',
      copy: 'コピー',
      download: 'ダウンロード',
      discordTxt: 'Discordに貼るならこの形式がおすすめです。',
      discordMd: 'GitHubやNotionなど、Markdownの表が表示される場所向けです。Discordでは表として表示されません。',
      empty: '表に載せるルールがありません。目のアイコンでルールを表に載せてください。'
    },
    legend: '○ 採用　× 不採用　※ 変更あり（注記を参照）',
    unset: '—',
    systemAuto: { 6: 'クトゥルフ神話TRPG（6版）', 7: '新クトゥルフ神話TRPG（7版）', both: 'クトゥルフ神話TRPG（6版・7版）' },
    toast: {
      preset: '「{name}」を適用しました',
      undo: '元に戻す',
      removed: 'ルールを削除しました',
      shown: '表に載せました',
      hidden: '表から外しました',
      saved: 'ファイルに保存しました',
      loaded: 'ファイルを読み込みました',
      loadError: 'このファイルは読み込めませんでした',
      copied: 'コピーしました',
      copyError: 'コピーできませんでした。ダウンロードをお使いください',
      downloaded: 'ダウンロードしました'
    },
    footer: {
      title: '利用上の注意',
      note1: `本ツールは、開発者 ${X_LINK} による個人制作の非公式TRPG支援ツールです。Chaosium Inc.および株式会社KADOKAWAとは関係ありません。入力した内容はすべてブラウザ内で処理され、サーバーには送信されません。`,
      note2: '作成した表は、セッション・募集・配信・シナリオ配布などに自由に使えます（申請・報告は不要です）。ルールの正式な内容は、お手元のルールブック・サプリメントでご確認ください。',
      note3: `不具合報告や要望は、Xの ${X_LINK} 宛のDMにてお送りください。ただし、すべての報告や要望に返信・対応できるとは限りません。`
    }
  };

  const en = {
    meta: {
      title: 'CoC House Rule Table Prepper | TRPG Web Tools Observatory',
      description: 'Pick the house rules your Call of Cthulhu (6th/7th edition) table uses from a list of common ones, and export them as a PNG image, plain text or Markdown.'
    },
    eyebrow: 'TRPG Web Tools Observatory',
    title: 'CoC House Rule Table Prepper',
    lead: 'Put together the rules your Call of Cthulhu 6th/7th edition table uses, starting from common house rules. Export an image or text ready for Discord, X or a recruitment post.',
    portal: '← TRPG Web Tools Observatory',
    share: 'Share on X / Twitter',
    shareText: 'I made a house rule table with CoC House Rule Table Prepper | TRPG Web Tools Observatory',
    langGroup: 'Language',
    help: 'How to use',
    themeLight: 'Light mode (click for night mode)',
    themeDark: 'Night mode (click for light mode)',
    close: 'Close',
    credit: 'CoC House Rule Table Prepper / TRPG Web Tools Observatory',
    helpItems: [
      '1. Choose 6th, 7th or Both to pick which edition the table covers. Common rules show for every edition.',
      '2. Not sure where to start? Pick "As written" or "Typical table" under Presets to fill in every rule at once.',
      '3. Tap ○ / × or an option to set each rule. ※ marks a rule you changed from the rulebook; when you pick ※, describe the change in the note.',
      '4. The eye icon decides whether a rule appears in the table. Faded rows are left out of the table and every export.',
      '5. Use "+ Add rule" in any category for your own rules. Tap a rule name to rename it.',
      '6. Export as a PNG image, plain text or Markdown. For Discord, use text or the image (Discord does not render Markdown tables).'
    ],
    helpNotes: [
      'Your work is saved automatically in this browser. To continue on another device, use Save to download a file and Open to load it.',
      'On a phone, swipe a row right to show or hide it; swipe a rule you added left to delete it.',
      'Rule names and options follow common Japanese table usage. Rename anything to match how your table talks.'
    ],
    bar: {
      edition: 'Edition',
      ed6: '6th',
      ed7: '7th',
      both: 'Both',
      preset: 'Presets',
      presetTitle: 'Choose a preset',
      presetRaw: 'As written',
      presetRawNote: 'Fills in rulebook values and shows only the most-used rules.',
      presetPop: 'Typical table',
      presetPopNote: 'Fills in house rules often seen in online play (CCB, crits/fumbles on Sanity rolls, a skill cap and so on).',
      presetClear: 'Clear everything',
      presetClearNote: 'Empties every value and note. Rules you added stay.',
      save: 'Save',
      open: 'Open',
      export: 'Export'
    },
    info: {
      heading: 'Table details',
      titlePh: 'House Rules',
      kp: 'Keeper',
      system: 'System',
      scenario: 'Scenario',
      date: 'Updated',
      remarks: 'Other notes',
      remarksPh: 'Anything to add at the bottom of the table (optional)',
      optional: 'Empty fields are left out of the table'
    },
    cols: { rule: 'Rule', value: 'Setting', note: 'Notes' },
    row: {
      show: 'Show in table',
      hide: 'Leave out of table',
      remove: 'Delete this rule',
      notePh: 'Notes',
      noteModPh: 'Describe the change',
      namePh: 'Rule name',
      resetName: 'Restore the original name',
      unset: 'Not set',
      free: 'Free text',
      freePh: 'Setting',
      count: '{a}/{b} shown',
      showAll: 'Show all',
      hideAll: 'Hide all',
      add: '+ Add rule',
      newRule: 'New rule',
      collapse: 'Collapse / expand'
    },
    exp: {
      title: 'Export',
      png: 'Image (PNG)',
      txt: 'Text',
      md: 'Markdown',
      theme: 'Colors',
      light: 'Light',
      dark: 'Night',
      layout: 'Layout',
      wide: 'Wide (desktop)',
      narrow: 'Tall (phone)',
      legend: 'Include legend',
      notes: 'Include notes',
      savePng: 'Save PNG',
      copyImg: 'Copy image',
      copy: 'Copy',
      download: 'Download',
      discordTxt: 'Best for pasting into Discord.',
      discordMd: 'For places that render Markdown tables, such as GitHub or Notion. Discord shows it as plain text.',
      empty: 'No rules are shown in the table yet. Use the eye icon to add some.'
    },
    legend: '○ Used   × Not used   ※ Modified (see note)',
    unset: '—',
    systemAuto: { 6: 'Call of Cthulhu 6th Edition', 7: 'Call of Cthulhu 7th Edition', both: 'Call of Cthulhu 6th & 7th Edition' },
    toast: {
      preset: 'Applied "{name}"',
      undo: 'Undo',
      removed: 'Rule deleted',
      shown: 'Shown in table',
      hidden: 'Left out of table',
      saved: 'Saved to a file',
      loaded: 'File loaded',
      loadError: 'This file could not be loaded',
      copied: 'Copied',
      copyError: 'Could not copy. Please use Download instead',
      downloaded: 'Downloaded'
    },
    footer: {
      title: 'Notes',
      note1: `This is an unofficial, personal TRPG support tool made by ${X_LINK}. It is not affiliated with Chaosium Inc. or KADOKAWA. Everything you enter is processed in your browser and never sent to a server.`,
      note2: 'Tables you make are free to use for sessions, recruitment, streams and published scenarios, with no need to ask or report. Check your own rulebooks and supplements for the exact wording of each rule.',
      note3: `Send bug reports and requests by DM to ${X_LINK} on X. Not every report or request can be answered.`
    }
  };

  const ko = {
    meta: {
      title: 'CoC 하우스 룰 표 메이커｜TRPG WEB 툴 관측소',
      description: '크툴루의 부름 TRPG(6판・7판) 탁에서 쓰는 하우스 룰을 자주 쓰이는 룰 중에서 골라 표로 정리하고, 이미지(PNG)・텍스트・Markdown으로 내보낼 수 있는 툴입니다.'
    },
    eyebrow: 'TRPG WEB 툴 관측소',
    title: 'CoC 하우스 룰 표 메이커',
    lead: '크툴루의 부름 6판・7판 탁에서 쓰는 룰을 자주 쓰이는 하우스 룰 중에서 골라 표로 정리합니다. Discord나 X, 모집글에 붙일 수 있는 이미지・텍스트로 내보낼 수 있습니다.',
    portal: '←TRPG WEB 툴 관측소',
    share: 'X / Twitter로 공유',
    shareText: 'CoC 하우스 룰 표 메이커｜TRPG WEB 툴 관측소에서 하우스 룰 표를 만들었습니다',
    langGroup: '언어 전환',
    help: '사용법',
    themeLight: '라이트 모드(클릭하면 나이트 모드)',
    themeDark: '나이트 모드(클릭하면 라이트 모드)',
    close: '닫기',
    credit: 'CoC 하우스 룰 표 메이커 / TRPG WEB 툴 관측소',
    helpItems: [
      '1. 「6판／7판／둘 다」에서 표로 만들 판을 고릅니다. 공통 룰은 어느 판에서도 표시됩니다.',
      '2. 잘 모르겠다면 「프리셋」에서 「룰북 기준」이나 「자주 쓰는 탁」을 고르면 모든 룰에 값이 한 번에 들어갑니다.',
      '3. 각 룰의 ○ ／ × ／ 선택지를 탭해서 설정합니다. 「※」는 룰북에서 변경했다는 표시입니다. ※를 고르면 주석란에 변경 내용을 적어 주세요.',
      '4. 눈 아이콘으로 그 룰을 표에 넣을지 정합니다. 흐리게 보이는 행은 표와 내보내기에 들어가지 않습니다.',
      '5. 각 카테고리의 「＋룰 추가」로 탁만의 룰을 더할 수 있습니다. 룰 이름은 글자를 탭하면 바꿀 수 있습니다.',
      '6. 「내보내기」에서 이미지(PNG)・텍스트・Markdown으로 출력합니다. Discord에는 텍스트나 이미지를 추천합니다(Discord는 Markdown 표를 표시하지 않습니다).'
    ],
    helpNotes: [
      '입력한 내용은 이 브라우저에 자동 저장됩니다. 다른 기기에서 이어서 만들 때는 「저장」으로 파일을 내려받고 「열기」로 불러오세요.',
      '스마트폰에서는 행을 오른쪽으로 밀면 표에 넣기／빼기가 바뀌고, 추가한 룰은 왼쪽으로 밀어 삭제할 수 있습니다.',
      '룰 이름과 선택지는 일반적인 호칭을 바탕으로 했습니다. 탁에서 쓰는 이름에 맞춰 자유롭게 바꾸세요.'
    ],
    bar: {
      edition: '판',
      ed6: '6판',
      ed7: '7판',
      both: '둘 다',
      preset: '프리셋',
      presetTitle: '프리셋 선택',
      presetRaw: '룰북 기준',
      presetRawNote: '룰북대로의 값을 넣고, 자주 쓰는 룰만 표에 넣습니다.',
      presetPop: '자주 쓰는 탁',
      presetPopNote: '온라인 세션에서 자주 보는 하우스 룰(CCB, 이성 판정 크리티컬/펌블 적용, 기능 상한 등)을 넣습니다.',
      presetClear: '전부 미설정으로',
      presetClearNote: '값과 주석을 비웁니다. 추가한 룰은 남습니다.',
      save: '저장',
      open: '열기',
      export: '내보내기'
    },
    info: {
      heading: '표 정보',
      titlePh: '하우스 룰 표',
      kp: 'KP 이름',
      system: '대상 시스템',
      scenario: '적용 시나리오',
      date: '갱신일',
      remarks: '기타・비고',
      remarksPh: '표 맨 아래에 넣을 보충 설명(선택)',
      optional: '빈 항목은 표에 나오지 않습니다'
    },
    cols: { rule: '룰', value: '적용・설정', note: '설명・주석' },
    row: {
      show: '표에 넣기',
      hide: '표에서 빼기',
      remove: '이 룰 삭제',
      notePh: '설명・주석',
      noteModPh: '변경 내용을 적어 주세요',
      namePh: '룰 이름',
      resetName: '원래 이름으로 되돌리기',
      unset: '미설정',
      free: '자유 기술',
      freePh: '설정 내용',
      count: '{a}/{b}개 표시',
      showAll: '모두 표에 넣기',
      hideAll: '모두 표에서 빼기',
      add: '＋룰 추가',
      newRule: '새 룰',
      collapse: '접기／펼치기'
    },
    exp: {
      title: '내보내기',
      png: '이미지(PNG)',
      txt: '텍스트',
      md: 'Markdown',
      theme: '색',
      light: '라이트',
      dark: '나이트',
      layout: '레이아웃',
      wide: '가로형(PC용)',
      narrow: '세로형(스마트폰용)',
      legend: '범례 넣기',
      notes: '주석 넣기',
      savePng: 'PNG 저장',
      copyImg: '이미지 복사',
      copy: '복사',
      download: '다운로드',
      discordTxt: 'Discord에 붙일 때 추천하는 형식입니다.',
      discordMd: 'GitHub나 Notion 등 Markdown 표가 표시되는 곳용입니다. Discord에서는 표로 보이지 않습니다.',
      empty: '표에 넣은 룰이 없습니다. 눈 아이콘으로 룰을 표에 넣어 주세요.'
    },
    legend: '○ 사용　× 미사용　※ 변경 있음(주석 참조)',
    unset: '—',
    systemAuto: { 6: '크툴루의 부름 6판', 7: '크툴루의 부름 7판', both: '크툴루의 부름 6판・7판' },
    toast: {
      preset: '「{name}」을(를) 적용했습니다',
      undo: '되돌리기',
      removed: '룰을 삭제했습니다',
      shown: '표에 넣었습니다',
      hidden: '표에서 뺐습니다',
      saved: '파일로 저장했습니다',
      loaded: '파일을 불러왔습니다',
      loadError: '이 파일은 불러올 수 없습니다',
      copied: '복사했습니다',
      copyError: '복사하지 못했습니다. 다운로드를 이용해 주세요',
      downloaded: '다운로드했습니다'
    },
    footer: {
      title: '이용 시 주의',
      note1: `이 툴은 개발자 ${X_LINK}가 개인적으로 만든 비공식 TRPG 지원 툴입니다. Chaosium Inc. 및 KADOKAWA와는 관계가 없습니다. 입력한 내용은 모두 브라우저 안에서 처리되며 서버로 전송되지 않습니다.`,
      note2: '만든 표는 세션・모집・방송・시나리오 배포 등에 자유롭게 쓸 수 있습니다(신청・보고 불필요). 룰의 정확한 내용은 가지고 계신 룰북・서플리먼트에서 확인해 주세요.',
      note3: `버그 제보와 요청은 X의 ${X_LINK} 앞으로 DM을 보내 주세요. 모든 제보와 요청에 답변・대응할 수 있는 것은 아닙니다.`
    }
  };

  global.HRT_I18N = { ja, en, ko };
})(window);
