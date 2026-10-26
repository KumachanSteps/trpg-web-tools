/* TRPG背景サジェストツール — 画面の文言（日本語 / English / 한국어） */
(function (global) {
  'use strict';

  const ja = {
    meta: {
      title: 'TRPG背景サジェストツール｜TRPG WEBツール観測所',
      description: 'パソコンの中の背景画像フォルダをタグ付け・分類し、シナリオ本文に合う背景をシーンごとに提案するツールです。外部との通信は一切行いません。'
    },
    title: 'TRPG背景サジェストツール',
    portal: '←TRPG WEBツール観測所',
    portalShort: '←観測所',
    langGroup: '言語切替',
    help: '使い方',
    close: '閉じる',
    offlineBadge: '通信なし',
    offlineBadgeTitle: 'このツールは外部と一切通信しません',
    bar: {
      openFolder: 'フォルダを開く',
      reopen: '前回のフォルダ',
      views: '表示切替',
      library: 'ライブラリ',
      suggest: 'サジェスト',
      saveFolder: 'フォルダに保存',
      savingFolder: 'フォルダに自動保存中',
      exportTags: 'タグを書き出す',
      importTags: 'タグを読み込む'
    },
    status: {
      scanning: 'フォルダを読み込み中… {n}枚',
      analyzing: '画像を解析中 {done} / {total}',
      ready: '{n}枚',
      noFolder: 'フォルダ未選択'
    },
    empty: {
      heading: '背景画像のフォルダを選んでください',
      lead: 'フォルダの中の画像（サブフォルダも含む）を読み込み、ファイル名・フォルダ名・色からタグを自動で付けます。タグを整えたら「サジェスト」でシナリオ本文を貼り付けると、シーンごとに合う背景を提案します。',
      offline: 'このツールは外部と一切通信しません。画像やタグ、本文はこのブラウザの中だけで扱い、どこにも送信されません。',
      pick: 'フォルダを開く',
      formats: '対応形式：PNG / JPEG / WebP / GIF / AVIF / BMP',
      fallbackNote: 'このブラウザではフォルダへの直接保存ができないため、タグはブラウザ内に保存されます。別の端末へ移すときは「タグを書き出す」を使ってください（Chrome・Edge ではフォルダ内に保存できます）。'
    },
    lib: {
      search: 'ファイル名で絞り込み',
      untagged: 'タグなしだけ',
      filters: 'タグで絞り込み',
      clearFilter: '絞り込みを解除',
      selectAll: '表示中をすべて選択',
      selectNone: '選択を解除',
      shown: '{n}枚を表示',
      more: 'さらに表示',
      noMatch: '条件に合う画像がありません。',
      notAnalyzed: '解析待ち'
    },
    insp: {
      none: '画像を選ぶと、ここでタグを編集できます。Ctrl（⌘）・Shiftキーやチェックボックスで複数選択すると、まとめてタグを付けられます。',
      many: '{n}枚を選択中',
      tags: 'タグ',
      addPh: 'タグを追加（Enter）',
      add: '追加',
      auto: '自動',
      autoTitle: 'ファイル名・フォルダ名・色から自動で付いたタグです。×で外せます。',
      partial: '一部',
      palette: 'タグ一覧から付ける',
      paletteNote: 'タップで付ける／外す。複数選択中は、全員に付いていれば外し、そうでなければ全員に付けます。',
      resetAuto: '外した自動タグを戻す',
      preview: '大きく表示',
      note: 'メモ',
      notePh: '使いたい場面など（サジェストの照合にも使われます）',
      deleteCustom: 'マイタグ「{tag}」を削除',
      deleteCustomConfirm: 'もう一度押すと、マイタグ「{tag}」をすべての画像から削除します'
    },
    sug: {
      textLabel: 'シナリオ本文',
      textPh: 'シナリオ本文やシーンのメモを貼り付けてください。「■」「【】」「第1章」「シーン1」などの見出しでシーンを分けます。',
      loadText: 'テキストを読み込む',
      clear: 'クリア',
      split: 'シーンの分け方',
      splitHeading: '見出し',
      splitParagraph: '段落',
      splitWhole: '全文',
      perScene: '1シーンの候補数',
      needFolder: '先にフォルダを開いてください。',
      needText: '本文を入れると、ここにシーンごとの候補が出ます。',
      scene: 'シーン{n}',
      detected: '読み取ったタグ',
      detectedNote: 'タップで、このシーンの照合から外す／戻す',
      noTags: 'このシーンからタグを読み取れませんでした。場所・時間帯・天気などの言葉があると候補が出やすくなります。',
      noResult: '合う背景が見つかりませんでした。ライブラリでタグを付けると候補に出てきます。',
      why: '一致',
      whyPartial: '色が近い',
      whyWord: '名前が一致',
      chars: '{n}文字'
    },
    modal: {
      copyPath: 'パスをコピー',
      copyName: 'ファイル名をコピー',
      showInLibrary: 'ライブラリで編集',
      copied: 'コピーしました'
    },
    toast: {
      noImages: 'このフォルダには画像が見つかりませんでした。',
      unsupported: 'このブラウザはフォルダの読み込みに対応していません。',
      savedFolder: 'フォルダに haikei-tags.json を保存しました。',
      saveFolderFailed: 'フォルダに保存できませんでした。書き込みを許可してください。',
      loadedFolderFile: 'フォルダ内の haikei-tags.json からタグを読み込みました。',
      exported: 'タグを書き出しました。',
      imported: 'タグを読み込みました（{n}枚分）。',
      importFailed: 'ファイルを読み込めませんでした。',
      reopenFailed: '前回のフォルダを開けませんでした。もう一度「フォルダを開く」から選んでください。',
      textLoaded: '{name} を読み込みました。'
    },
    helpItems: [
      '1. 「フォルダを開く」で背景画像が入ったフォルダを選びます。サブフォルダの画像もまとめて読み込みます。',
      '2. ファイル名・フォルダ名（例：「洋館/夜_廊下.png」→ 洋館・廊下・夜）と画像の色（暗い・赤・青など）から、タグが自動で付きます。点線のタグが自動タグです。',
      '3. 「ライブラリ」で画像を選び、タグを追加・削除します。Ctrl（⌘）・Shiftキーやチェックボックスで複数選ぶと、まとめて付けられます。一覧にない言葉は「マイタグ」として追加できます。',
      '4. 「サジェスト」にシナリオ本文を貼り付けるか、テキストファイルを読み込みます。見出しや段落でシーンに分け、シーンごとに合う背景を提案します。',
      '5. 候補をクリックすると大きく表示され、パスやファイル名をコピーできます。ココフォリアなどに背景を登録するときに使ってください。'
    ],
    helpNotes: [
      'このツールは外部と一切通信しません（ページ自体が通信を禁止する設定になっています）。画像・タグ・本文はこのブラウザの中だけで扱います。',
      'Chrome・Edge では「フォルダに保存」でタグを haikei-tags.json としてフォルダ内に保存でき、次回フォルダを開くと自動で読み込みます。その他のブラウザではブラウザ内に保存されるので、「タグを書き出す」でバックアップしてください。',
      'ファイル名を変えたり移動したりしても、同じ名前・同じサイズの画像ならタグを引き継ぎます。'
    ],
    footer: {
      title: '利用上の注意',
      note1: '読み込んだ画像・本文・タグは、外部のサーバーへ送信されません。データはお使いのブラウザ（と、保存を選んだ場合は選んだフォルダ）にだけ保存されます。',
      note2: '自動タグはファイル名と色からの推定です。画像の内容を読み取っているわけではないので、必要に応じて手で整えてください。',
      note3: '背景素材は、それぞれの素材の利用規約に従ってお使いください。'
    }
  };

  const en = {
    meta: {
      title: 'TRPG Background Suggester | TRPG Web Tools Observatory',
      description: 'Tag and sort the background images in a folder on your computer, then get background suggestions for each scene of your scenario text. Makes no external connections at all.'
    },
    title: 'TRPG Background Suggester',
    portal: '← TRPG Web Tools Observatory',
    portalShort: '← Observatory',
    langGroup: 'Language',
    help: 'How to use',
    close: 'Close',
    offlineBadge: 'Offline',
    offlineBadgeTitle: 'This tool makes no external connections',
    bar: {
      openFolder: 'Open folder',
      reopen: 'Last folder',
      views: 'View',
      library: 'Library',
      suggest: 'Suggest',
      saveFolder: 'Save to folder',
      savingFolder: 'Auto-saving to folder',
      exportTags: 'Export tags',
      importTags: 'Import tags'
    },
    status: {
      scanning: 'Reading folder… {n} images',
      analyzing: 'Analyzing images {done} / {total}',
      ready: '{n} images',
      noFolder: 'No folder selected'
    },
    empty: {
      heading: 'Choose your background image folder',
      lead: 'The tool reads every image in the folder (subfolders included) and tags it automatically from its file name, folder name and colors. Then paste your scenario text in Suggest to get matching backgrounds for each scene.',
      offline: 'This tool makes no external connections. Images, tags and text stay inside this browser and are never sent anywhere.',
      pick: 'Open folder',
      formats: 'Supported: PNG / JPEG / WebP / GIF / AVIF / BMP',
      fallbackNote: 'This browser cannot save into the folder itself, so tags are stored in the browser. Use "Export tags" to move them to another device (Chrome and Edge can save inside the folder).'
    },
    lib: {
      search: 'Filter by file name',
      untagged: 'Untagged only',
      filters: 'Filter by tag',
      clearFilter: 'Clear filters',
      selectAll: 'Select all shown',
      selectNone: 'Clear selection',
      shown: '{n} shown',
      more: 'Show more',
      noMatch: 'No images match.',
      notAnalyzed: 'Waiting'
    },
    insp: {
      none: 'Select an image to edit its tags here. Select several with Ctrl (⌘), Shift or the checkboxes to tag them together.',
      many: '{n} selected',
      tags: 'Tags',
      addPh: 'Add a tag (Enter)',
      add: 'Add',
      auto: 'auto',
      autoTitle: 'Added automatically from the file name, folder name or colors. Remove it with ×.',
      partial: 'some',
      palette: 'Pick from the tag list',
      paletteNote: 'Tap to add or remove. With several images selected, a tag is removed if all have it and added to all otherwise.',
      resetAuto: 'Restore removed auto tags',
      preview: 'View large',
      note: 'Note',
      notePh: 'Scenes you want it for, etc. (also used for matching)',
      deleteCustom: 'Delete my tag "{tag}"',
      deleteCustomConfirm: 'Press again to remove my tag "{tag}" from every image'
    },
    sug: {
      textLabel: 'Scenario text',
      textPh: 'Paste your scenario text or scene notes. Headings such as "■", "【】", "Chapter 1" or "Scene 1" split it into scenes.',
      loadText: 'Load text file',
      clear: 'Clear',
      split: 'Split scenes by',
      splitHeading: 'Headings',
      splitParagraph: 'Paragraphs',
      splitWhole: 'Whole text',
      perScene: 'Candidates per scene',
      needFolder: 'Open a folder first.',
      needText: 'Enter some text to see candidates for each scene here.',
      scene: 'Scene {n}',
      detected: 'Detected tags',
      detectedNote: 'Tap to leave a tag out of this scene, or bring it back',
      noTags: 'No tags were found in this scene. Words for places, time of day or weather help.',
      noResult: 'No matching background found. Tag images in the Library to have them suggested.',
      why: 'match',
      whyPartial: 'similar color',
      whyWord: 'name match',
      chars: '{n} chars'
    },
    modal: {
      copyPath: 'Copy path',
      copyName: 'Copy file name',
      showInLibrary: 'Edit in Library',
      copied: 'Copied'
    },
    toast: {
      noImages: 'No images were found in this folder.',
      unsupported: 'This browser cannot read folders.',
      savedFolder: 'Saved haikei-tags.json to the folder.',
      saveFolderFailed: 'Could not save to the folder. Please allow writing.',
      loadedFolderFile: 'Loaded tags from haikei-tags.json in the folder.',
      exported: 'Tags exported.',
      imported: 'Tags imported ({n} images).',
      importFailed: 'Could not read the file.',
      reopenFailed: 'Could not open the last folder. Please choose it again with "Open folder".',
      textLoaded: 'Loaded {name}.'
    },
    helpItems: [
      '1. Choose a folder of background images with "Open folder". Images in subfolders are read too.',
      '2. Tags are added automatically from file and folder names (e.g. "mansion/night_hallway.png" → mansion, hallway, night) and from colors (dark, red, blue…). Dotted tags are automatic.',
      '3. In the Library, select images and add or remove tags. Select several with Ctrl (⌘), Shift or the checkboxes to tag them at once. Words not in the list become "My tags".',
      '4. In Suggest, paste your scenario text or load a text file. It is split into scenes by headings or paragraphs, and matching backgrounds are suggested for each scene.',
      '5. Click a candidate to view it large and copy its path or file name, for example when adding the background to CCFOLIA.'
    ],
    helpNotes: [
      'This tool makes no external connections (the page itself is set to block them). Images, tags and text are handled only inside this browser.',
      'In Chrome and Edge, "Save to folder" stores tags as haikei-tags.json inside the folder and reads it back next time. Other browsers keep tags in the browser, so back them up with "Export tags".',
      'Renamed or moved images keep their tags as long as the file name and size stay the same.'
    ],
    footer: {
      title: 'Notes',
      note1: 'Images, text and tags you load are never sent to any server. Data is stored only in your browser (and in the folder, if you choose to save there).',
      note2: 'Automatic tags are guesses from file names and colors; the tool does not look at what the image shows, so adjust them by hand as needed.',
      note3: 'Use background assets according to each asset\'s terms of use.'
    }
  };

  const ko = {
    meta: {
      title: 'TRPG 배경 추천 도구｜TRPG WEB 도구 관측소',
      description: '컴퓨터 안의 배경 이미지 폴더에 태그를 붙여 분류하고, 시나리오 본문에 맞는 배경을 장면별로 추천하는 도구입니다. 외부와 일절 통신하지 않습니다.'
    },
    title: 'TRPG 배경 추천 도구',
    portal: '←TRPG WEB 도구 관측소',
    portalShort: '←관측소',
    langGroup: '언어 전환',
    help: '사용법',
    close: '닫기',
    offlineBadge: '통신 없음',
    offlineBadgeTitle: '이 도구는 외부와 일절 통신하지 않습니다',
    bar: {
      openFolder: '폴더 열기',
      reopen: '지난 폴더',
      views: '보기 전환',
      library: '라이브러리',
      suggest: '추천',
      saveFolder: '폴더에 저장',
      savingFolder: '폴더에 자동 저장 중',
      exportTags: '태그 내보내기',
      importTags: '태그 불러오기'
    },
    status: {
      scanning: '폴더 읽는 중… {n}장',
      analyzing: '이미지 분석 중 {done} / {total}',
      ready: '{n}장',
      noFolder: '폴더 미선택'
    },
    empty: {
      heading: '배경 이미지 폴더를 선택해 주세요',
      lead: '폴더 안의 이미지(하위 폴더 포함)를 읽어 파일 이름·폴더 이름·색에서 태그를 자동으로 붙입니다. 태그를 정리한 뒤 「추천」에 시나리오 본문을 붙여 넣으면 장면별로 어울리는 배경을 추천합니다.',
      offline: '이 도구는 외부와 일절 통신하지 않습니다. 이미지·태그·본문은 이 브라우저 안에서만 다루며 어디에도 전송되지 않습니다.',
      pick: '폴더 열기',
      formats: '지원 형식: PNG / JPEG / WebP / GIF / AVIF / BMP',
      fallbackNote: '이 브라우저에서는 폴더에 직접 저장할 수 없어 태그는 브라우저 안에 저장됩니다. 다른 기기로 옮길 때는 「태그 내보내기」를 사용해 주세요(Chrome·Edge에서는 폴더 안에 저장할 수 있습니다).'
    },
    lib: {
      search: '파일 이름으로 좁히기',
      untagged: '태그 없는 것만',
      filters: '태그로 좁히기',
      clearFilter: '좁히기 해제',
      selectAll: '표시 중인 것 모두 선택',
      selectNone: '선택 해제',
      shown: '{n}장 표시',
      more: '더 보기',
      noMatch: '조건에 맞는 이미지가 없습니다.',
      notAnalyzed: '분석 대기'
    },
    insp: {
      none: '이미지를 선택하면 여기서 태그를 편집할 수 있습니다. Ctrl(⌘)·Shift 키나 체크박스로 여러 장을 선택하면 한꺼번에 태그를 붙일 수 있습니다.',
      many: '{n}장 선택 중',
      tags: '태그',
      addPh: '태그 추가(Enter)',
      add: '추가',
      auto: '자동',
      autoTitle: '파일 이름·폴더 이름·색에서 자동으로 붙은 태그입니다. ×로 뗄 수 있습니다.',
      partial: '일부',
      palette: '태그 목록에서 붙이기',
      paletteNote: '탭하면 붙이기/떼기. 여러 장 선택 중에는 모두에게 붙어 있으면 떼고, 아니면 모두에게 붙입니다.',
      resetAuto: '뗀 자동 태그 되돌리기',
      preview: '크게 보기',
      note: '메모',
      notePh: '쓰고 싶은 장면 등(추천 대조에도 사용됩니다)',
      deleteCustom: '내 태그 「{tag}」 삭제',
      deleteCustomConfirm: '한 번 더 누르면 내 태그 「{tag}」를 모든 이미지에서 삭제합니다'
    },
    sug: {
      textLabel: '시나리오 본문',
      textPh: '시나리오 본문이나 장면 메모를 붙여 넣어 주세요. 「■」「【】」「제1장」「씬1」 같은 제목으로 장면을 나눕니다.',
      loadText: '텍스트 불러오기',
      clear: '지우기',
      split: '장면 나누는 방법',
      splitHeading: '제목',
      splitParagraph: '단락',
      splitWhole: '전체',
      perScene: '장면당 후보 수',
      needFolder: '먼저 폴더를 열어 주세요.',
      needText: '본문을 넣으면 여기에 장면별 후보가 표시됩니다.',
      scene: '장면 {n}',
      detected: '읽어 낸 태그',
      detectedNote: '탭하면 이 장면의 대조에서 빼기/되돌리기',
      noTags: '이 장면에서 태그를 읽어 내지 못했습니다. 장소·시간대·날씨 같은 말이 있으면 후보가 잘 나옵니다.',
      noResult: '어울리는 배경을 찾지 못했습니다. 라이브러리에서 태그를 붙이면 후보에 나옵니다.',
      why: '일치',
      whyPartial: '색이 비슷함',
      whyWord: '이름 일치',
      chars: '{n}자'
    },
    modal: {
      copyPath: '경로 복사',
      copyName: '파일 이름 복사',
      showInLibrary: '라이브러리에서 편집',
      copied: '복사했습니다'
    },
    toast: {
      noImages: '이 폴더에서 이미지를 찾지 못했습니다.',
      unsupported: '이 브라우저는 폴더 읽기를 지원하지 않습니다.',
      savedFolder: '폴더에 haikei-tags.json을 저장했습니다.',
      saveFolderFailed: '폴더에 저장하지 못했습니다. 쓰기를 허용해 주세요.',
      loadedFolderFile: '폴더 안의 haikei-tags.json에서 태그를 불러왔습니다.',
      exported: '태그를 내보냈습니다.',
      imported: '태그를 불러왔습니다({n}장 분량).',
      importFailed: '파일을 읽지 못했습니다.',
      reopenFailed: '지난 폴더를 열지 못했습니다. 「폴더 열기」에서 다시 선택해 주세요.',
      textLoaded: '{name}을(를) 불러왔습니다.'
    },
    helpItems: [
      '1. 「폴더 열기」로 배경 이미지가 든 폴더를 선택합니다. 하위 폴더의 이미지도 함께 읽습니다.',
      '2. 파일 이름·폴더 이름(예: 「저택/밤_복도.png」→ 저택·복도·밤)과 이미지의 색(어두움·빨강·파랑 등)에서 태그가 자동으로 붙습니다. 점선 태그가 자동 태그입니다.',
      '3. 「라이브러리」에서 이미지를 선택해 태그를 추가·삭제합니다. Ctrl(⌘)·Shift 키나 체크박스로 여러 장을 고르면 한꺼번에 붙일 수 있습니다. 목록에 없는 말은 「내 태그」로 추가할 수 있습니다.',
      '4. 「추천」에 시나리오 본문을 붙여 넣거나 텍스트 파일을 불러옵니다. 제목이나 단락으로 장면을 나누고 장면별로 어울리는 배경을 추천합니다.',
      '5. 후보를 클릭하면 크게 표시되고 경로나 파일 이름을 복사할 수 있습니다. 코코포리아 등에 배경을 등록할 때 사용해 주세요.'
    ],
    helpNotes: [
      '이 도구는 외부와 일절 통신하지 않습니다(페이지 자체가 통신을 막도록 설정되어 있습니다). 이미지·태그·본문은 이 브라우저 안에서만 다룹니다.',
      'Chrome·Edge에서는 「폴더에 저장」으로 태그를 haikei-tags.json으로 폴더 안에 저장할 수 있고, 다음에 폴더를 열면 자동으로 불러옵니다. 그 밖의 브라우저에서는 브라우저 안에 저장되므로 「태그 내보내기」로 백업해 주세요.',
      '파일 이름을 바꾸거나 옮겨도 같은 이름·같은 크기의 이미지라면 태그를 이어받습니다.'
    ],
    footer: {
      title: '이용 시 주의',
      note1: '불러온 이미지·본문·태그는 외부 서버로 전송되지 않습니다. 데이터는 사용 중인 브라우저(저장을 선택한 경우 선택한 폴더)에만 저장됩니다.',
      note2: '자동 태그는 파일 이름과 색에서 추정한 것입니다. 이미지의 내용을 읽는 것은 아니므로 필요에 따라 직접 다듬어 주세요.',
      note3: '배경 소재는 각 소재의 이용 약관에 따라 사용해 주세요.'
    }
  };

  global.HaikeiI18n = { ja, en, ko };
})(window);
