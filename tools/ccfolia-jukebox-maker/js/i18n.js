/* KPレス・ジュークボックスメーカー — 画面の文言（日本語 / English / 한국어） */
(function (global) {
  'use strict';

  const X_LINK = '<a href="https://x.com/KumachanSteps" target="_blank" rel="noopener noreferrer">@KumachanSteps</a>';

  const ja = {
    meta: {
      title: 'KPレス・ジュークボックスメーカー｜TRPG WEBツール観測所',
      description: 'ココフォリアのクリックアクションと /scene コマンドで動く、KPがいなくても使えるジュークボックス部屋を作るツールです。シーンとマーカーパネルのつながりを線で一覧できます。'
    },
    title: 'KPレス・ジュークボックスメーカー',
    portal: '←TRPG WEBツール観測所',
    portalShort: '←観測所',
    langGroup: '言語切替',
    help: '使い方',
    close: '閉じる',
    helpItems: [
      '1. 左の「ジュークボックスの設定」で、レコードの枚数・曲名（＝シーン名）・ラベルの色・BGMを決めます。',
      '2. 「シーンのつながり」の大きな盤面に、選んだシーン（最初は部屋の開始シーン）が表示されます。盤面のパネルから右の「シーン一覧」のサムネイルへ伸びる線は「このパネルをクリックすると、このシーンに切り替わる」という意味です。一覧のサムネイルをクリックすると、そのシーンが大きく表示されます。',
      '3. 「テストプレイ」で、ココフォリアと同じようにレコードをクリックしてシーンを切り替えて試せます。',
      '4. 「ルームZIPを書き出す」で、ココフォリアに読み込めるルームデータ（ZIP）を作ります。ココフォリアの部屋にZIPをドラッグ＆ドロップすると読み込めます。',
      '5. ココフォリアから書き出したルームZIPを「ZIPを読み込む」で開くと、ほかの部屋のシーンとパネルのつながりも線で確認できます。'
    ],
    helpNotes: [
      'ココフォリアでは「/scene シーン名」の実行はルームマスターとサブルームマスターだけができます。KPなしで遊ぶときは、参加者をサブルームマスターにしてください。',
      'クリックアクションはキャラクターを選んだ状態でパネルをクリックすると、そのキャラクターの発言として送信されます。',
      'BGMはURL（YouTubeなど）か音声ファイルを指定できます。音声ファイルはZIPに入るので、ファイルサイズに気をつけてください。',
      '「シーン一覧」「シーンのつながり」「ジュークボックスの設定」の3つの欄は、見出しの左のつまみをドラッグして並べ替えられます。',
      '入力した設定はこのブラウザに自動で保存されます（音声ファイルは保存されません）。'
    ],
    layout: { drag: 'ドラッグで並べ替え（←→キーでも移動）', reset: '並びを元に戻す' },
    bar: {
      importZip: 'ZIPを読み込む',
      backToJukebox: 'ジュークボックスに戻る',
      play: 'テストプレイ',
      export: 'ルームZIPを書き出す'
    },
    set: {
      heading: 'ジュークボックスの設定',
      roomName: '部屋の名前',
      roomNameDefault: 'KPレス・ジュークボックス',
      stopName: '停止中のシーン名',
      stopNameDefault: '停止中',
      count: 'レコードの枚数',
      disks: 'レコード（曲名がシーン名になります）',
      diskName: '曲名',
      color: 'ラベルの色',
      bgmUrl: 'BGMのURL',
      bgmUrlPh: 'https://… （空欄でもOK）',
      bgmFile: '音声ファイル',
      bgmFileClear: '外す',
      playingLabel: 'NOW PLAYING',
      stopLabel: 'STOP',
      reset: '最初の設定に戻す',
      resetConfirm: 'ジュークボックスの設定を最初の状態に戻しますか？'
    },
    colors: {
      cream: 'クリーム', red: '赤', orange: 'オレンジ', yellow: '黄', green: '緑',
      teal: '青緑', blue: '青', purple: '紫', pink: 'ピンク', gray: 'グレー'
    },
    defaultNames: ['日常', '戦闘', '緊迫', '楽しい', '探索', '不穏', '悲しい', '狂気', '感動', '休憩'],
    graph: {
      heading: 'シーンのつながり',
      hint: '大きな盤面のパネルから、クリックで切り替わる先のシーンへ線を引いています。一覧のシーンをクリックすると表示が切り替わります。',
      showAll: 'すべての線',
      showSelected: '選んだパネルの線だけ',
      list: 'シーン一覧',
      start: '開始',
      current: '今の盤面',
      links: '{n}本の線',
      shared: 'スクリーンパネル（全シーン共通）'
    },
    insp: {
      heading: 'パネルの中身',
      none: 'パネルをクリックすると、クリックアクションが表示されます。',
      action: 'クリックアクション（チャットに送信）',
      actionNone: 'なし',
      jumpsTo: '→ シーン「{name}」に切り替え',
      missing: '→ シーン「{name}」は見つかりません',
      text: 'メモ／テキスト',
      edit: 'クリックアクションを編集',
      jukeboxNote: 'ジュークボックスのパネルは、左の設定から自動で作られます。'
    },
    warn: {
      heading: '確認してください',
      duplicate: 'シーン名「{name}」が重複しています。/scene で正しく切り替わりません。',
      empty: '名前が空のシーンがあります。',
      missing: '「{from}」のパネルが、存在しないシーン「{name}」を呼び出しています。',
      spaces: 'シーン名「{name}」の前後に空白があります。'
    },
    play: {
      heading: 'テストプレイ',
      scene: '今のシーン: {name}',
      chat: 'チャット送信: {text}',
      bgm: '♪ {name}',
      noBgm: 'BGMなし',
      restart: '最初のシーンに戻す'
    },
    io: {
      exporting: 'ルームZIPを作っています…',
      exported: 'ルームZIPを書き出しました。ココフォリアの部屋にドラッグ＆ドロップしてください。',
      exportFailed: 'ZIPの書き出しに失敗しました。',
      importing: 'ZIPを読み込んでいます…',
      imported: '{n}シーンを読み込みました。',
      learned: 'このZIPのクリックアクションの形を覚えました。以後の書き出しに使います。',
      importFailed: 'ルームZIPとして読み込めませんでした（__data.json が見つかりません）。',
      jszip: 'ZIPライブラリを読み込めませんでした。ネット接続を確認してください。',
      shapeGuess: 'クリックアクションの形: ココフォリアで動作確認済み',
      shapeLearned: 'クリックアクションの形: 読み込んだZIPの形を使用中',
      shapeReset: '確認済みの形に戻す',
      importedTitle: '読み込んだ部屋',
      importedNote: 'クリックアクションを編集して書き出すと、元のZIPのほかの中身はそのまま残ります。'
    },
    footer: {
      title: '利用上の注意',
      note1: 'ココフォリアのルームデータ（ZIP）の形式は公開されていないため、このツールの書き出しは非公式です。読み込めない・動きが違う場合は ' + X_LINK + ' までお知らせください。',
      note2: 'レコードとプレーヤーの画像は、このツールで作る部屋の中で自由に使えます。画像だけの再配布はしないでください。',
      note3: 'このツールはココフォリア（CCFOLIA）の公式ツールではありません。'
    }
  };

  const en = {
    meta: {
      title: 'KP-less Jukebox Maker | TRPG Web Tools Observatory',
      description: 'Build a CCFOLIA jukebox room that works without a GM, using click actions and the /scene command. See how every marker panel links to every scene at a glance.'
    },
    title: 'KP-less Jukebox Maker',
    portal: '← TRPG Web Tools Observatory',
    portalShort: '← Portal',
    langGroup: 'Language',
    help: 'How to use',
    close: 'Close',
    helpItems: [
      '1. In "Jukebox settings" on the left, choose how many records, each record\'s title (it becomes the scene name), label color and BGM.',
      '2. The large board in "Scene links" shows the selected scene (the room\'s start scene at first). A line from a panel to a thumbnail in the "Scenes" list means "clicking this panel switches to that scene". Click a thumbnail to show that scene on the large board.',
      '3. "Test play" lets you click records and switch scenes just like in CCFOLIA.',
      '4. "Export room ZIP" makes room data you can load into CCFOLIA. Drag and drop the ZIP onto your CCFOLIA room.',
      '5. Open a room ZIP exported from CCFOLIA with "Open ZIP" to see the scene-to-panel links of any room.'
    ],
    helpNotes: [
      'In CCFOLIA, only the room master and sub room masters can run "/scene name". To play without a GM, make the players sub room masters.',
      'A click action is sent as the selected character\'s message when you click the panel.',
      'BGM can be a URL (such as YouTube) or an audio file. Audio files go inside the ZIP, so watch the file size.',
      'Drag the grip at the left of each heading to rearrange the Scenes, Scene links and Jukebox settings panels.',
      'Your settings are saved in this browser automatically (audio files are not).'
    ],
    layout: { drag: 'Drag to rearrange (or use ← → keys)', reset: 'Reset layout' },
    bar: { importZip: 'Open ZIP', backToJukebox: 'Back to jukebox', play: 'Test play', export: 'Export room ZIP' },
    set: {
      heading: 'Jukebox settings',
      roomName: 'Room name',
      roomNameDefault: 'KP-less Jukebox',
      stopName: 'Stopped scene name',
      stopNameDefault: 'Stopped',
      count: 'Number of records',
      disks: 'Records (the title becomes the scene name)',
      diskName: 'Title',
      color: 'Label color',
      bgmUrl: 'BGM URL',
      bgmUrlPh: 'https://… (optional)',
      bgmFile: 'Audio file',
      bgmFileClear: 'Remove',
      playingLabel: 'NOW PLAYING',
      stopLabel: 'STOP',
      reset: 'Reset settings',
      resetConfirm: 'Reset the jukebox settings to the defaults?'
    },
    colors: {
      cream: 'Cream', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green',
      teal: 'Teal', blue: 'Blue', purple: 'Purple', pink: 'Pink', gray: 'Gray'
    },
    defaultNames: ['Daily', 'Battle', 'Tension', 'Cheerful', 'Explore', 'Uneasy', 'Sorrow', 'Madness', 'Moving', 'Break'],
    graph: {
      heading: 'Scene links',
      hint: 'Lines run from each panel on the large board to the scene a click switches to. Click a scene in the list to show it.',
      showAll: 'All lines',
      showSelected: 'Selected panel only',
      list: 'Scenes',
      start: 'Start',
      current: 'Current',
      links: '{n} lines',
      shared: 'Screen panels (all scenes)'
    },
    insp: {
      heading: 'Panel details',
      none: 'Click a panel to see its click action.',
      action: 'Click action (send to chat)',
      actionNone: 'None',
      jumpsTo: '→ switches to scene "{name}"',
      missing: '→ scene "{name}" not found',
      text: 'Memo / text',
      edit: 'Edit click action',
      jukeboxNote: 'Jukebox panels are generated from the settings on the left.'
    },
    warn: {
      heading: 'Please check',
      duplicate: 'Scene name "{name}" is used more than once. /scene will not switch correctly.',
      empty: 'A scene has an empty name.',
      missing: 'A panel in "{from}" calls scene "{name}", which does not exist.',
      spaces: 'Scene name "{name}" has leading or trailing spaces.'
    },
    play: {
      heading: 'Test play',
      scene: 'Current scene: {name}',
      chat: 'Sent to chat: {text}',
      bgm: '♪ {name}',
      noBgm: 'No BGM',
      restart: 'Back to first scene'
    },
    io: {
      exporting: 'Building the room ZIP…',
      exported: 'Exported the room ZIP. Drag and drop it onto your CCFOLIA room.',
      exportFailed: 'Could not export the ZIP.',
      importing: 'Reading the ZIP…',
      imported: 'Loaded {n} scenes.',
      learned: 'Learned the click action format from this ZIP. Exports will use it from now on.',
      importFailed: 'This is not a room ZIP (no __data.json found).',
      jszip: 'Could not load the ZIP library. Check your internet connection.',
      shapeGuess: 'Click action format: verified in CCFOLIA',
      shapeLearned: 'Click action format: using the one from a loaded ZIP',
      shapeReset: 'Back to verified format',
      importedTitle: 'Loaded room',
      importedNote: 'When you edit click actions and export, everything else in the original ZIP stays as it was.'
    },
    footer: {
      title: 'Notes',
      note1: 'CCFOLIA\'s room data (ZIP) format is not public, so this export is unofficial. If it does not load or behaves differently, please tell ' + X_LINK + '.',
      note2: 'The record and player images may be used freely inside rooms made with this tool. Please do not redistribute the images on their own.',
      note3: 'This tool is not an official CCFOLIA tool.'
    }
  };

  const ko = {
    meta: {
      title: 'KP리스 주크박스 메이커｜TRPG WEB 툴 관측소',
      description: '코코포리아의 클릭 액션과 /scene 명령으로 움직이는, KP 없이도 쓸 수 있는 주크박스 방을 만드는 툴입니다. 장면과 마커 패널의 연결을 선으로 한눈에 볼 수 있습니다.'
    },
    title: 'KP리스 주크박스 메이커',
    portal: '←TRPG WEB 툴 관측소',
    portalShort: '←관측소',
    langGroup: '언어 전환',
    help: '사용 방법',
    close: '닫기',
    helpItems: [
      '1. 왼쪽 "주크박스 설정"에서 레코드 장수, 곡명(＝장면 이름), 라벨 색, BGM을 정합니다.',
      '2. "장면 연결"의 큰 보드에 선택한 장면(처음에는 방의 시작 장면)이 표시됩니다. 보드의 패널에서 오른쪽 "장면 목록" 썸네일로 이어지는 선은 "이 패널을 클릭하면 이 장면으로 바뀐다"는 뜻입니다. 목록의 썸네일을 클릭하면 그 장면이 크게 표시됩니다.',
      '3. "테스트 플레이"에서 코코포리아처럼 레코드를 클릭해 장면을 바꿔 볼 수 있습니다.',
      '4. "룸 ZIP 내보내기"로 코코포리아에 불러올 수 있는 룸 데이터(ZIP)를 만듭니다. 코코포리아 방에 ZIP을 드래그 앤 드롭하면 불러옵니다.',
      '5. 코코포리아에서 내보낸 룸 ZIP을 "ZIP 열기"로 열면 다른 방의 장면과 패널 연결도 선으로 확인할 수 있습니다.'
    ],
    helpNotes: [
      '코코포리아에서 "/scene 장면 이름"은 룸 마스터와 서브 룸 마스터만 실행할 수 있습니다. KP 없이 놀 때는 참가자를 서브 룸 마스터로 지정해 주세요.',
      '클릭 액션은 캐릭터를 선택한 상태에서 패널을 클릭하면 그 캐릭터의 발언으로 전송됩니다.',
      'BGM은 URL(YouTube 등)이나 음성 파일을 지정할 수 있습니다. 음성 파일은 ZIP에 들어가므로 파일 크기에 주의해 주세요.',
      '"장면 목록", "장면 연결", "주크박스 설정" 세 칸은 제목 왼쪽의 손잡이를 드래그해 순서를 바꿀 수 있습니다.',
      '입력한 설정은 이 브라우저에 자동 저장됩니다(음성 파일은 저장되지 않습니다).'
    ],
    layout: { drag: '드래그로 순서 바꾸기 (← → 키로도 이동)', reset: '배치 초기화' },
    bar: { importZip: 'ZIP 열기', backToJukebox: '주크박스로 돌아가기', play: '테스트 플레이', export: '룸 ZIP 내보내기' },
    set: {
      heading: '주크박스 설정',
      roomName: '방 이름',
      roomNameDefault: 'KP리스 주크박스',
      stopName: '정지 장면 이름',
      stopNameDefault: '정지',
      count: '레코드 장수',
      disks: '레코드 (곡명이 장면 이름이 됩니다)',
      diskName: '곡명',
      color: '라벨 색',
      bgmUrl: 'BGM URL',
      bgmUrlPh: 'https://… (비워도 OK)',
      bgmFile: '음성 파일',
      bgmFileClear: '빼기',
      playingLabel: 'NOW PLAYING',
      stopLabel: 'STOP',
      reset: '처음 설정으로',
      resetConfirm: '주크박스 설정을 처음 상태로 되돌릴까요?'
    },
    colors: {
      cream: '크림', red: '빨강', orange: '주황', yellow: '노랑', green: '초록',
      teal: '청록', blue: '파랑', purple: '보라', pink: '분홍', gray: '회색'
    },
    defaultNames: ['일상', '전투', '긴박', '즐거움', '탐색', '불온', '슬픔', '광기', '감동', '휴식'],
    graph: {
      heading: '장면 연결',
      hint: '큰 보드의 패널에서 클릭하면 바뀌는 장면으로 선을 그립니다. 목록의 장면을 클릭하면 표시가 바뀝니다.',
      showAll: '모든 선',
      showSelected: '선택한 패널의 선만',
      list: '장면 목록',
      start: '시작',
      current: '현재',
      links: '선 {n}개',
      shared: '스크린 패널 (모든 장면 공통)'
    },
    insp: {
      heading: '패널 내용',
      none: '패널을 클릭하면 클릭 액션이 표시됩니다.',
      action: '클릭 액션 (채팅으로 전송)',
      actionNone: '없음',
      jumpsTo: '→ 장면 "{name}"(으)로 전환',
      missing: '→ 장면 "{name}"을(를) 찾을 수 없습니다',
      text: '메모／텍스트',
      edit: '클릭 액션 편집',
      jukeboxNote: '주크박스 패널은 왼쪽 설정에서 자동으로 만들어집니다.'
    },
    warn: {
      heading: '확인해 주세요',
      duplicate: '장면 이름 "{name}"이(가) 중복됩니다. /scene으로 제대로 전환되지 않습니다.',
      empty: '이름이 비어 있는 장면이 있습니다.',
      missing: '"{from}"의 패널이 존재하지 않는 장면 "{name}"을(를) 호출합니다.',
      spaces: '장면 이름 "{name}" 앞뒤에 공백이 있습니다.'
    },
    play: {
      heading: '테스트 플레이',
      scene: '현재 장면: {name}',
      chat: '채팅 전송: {text}',
      bgm: '♪ {name}',
      noBgm: 'BGM 없음',
      restart: '첫 장면으로'
    },
    io: {
      exporting: '룸 ZIP을 만드는 중…',
      exported: '룸 ZIP을 내보냈습니다. 코코포리아 방에 드래그 앤 드롭해 주세요.',
      exportFailed: 'ZIP 내보내기에 실패했습니다.',
      importing: 'ZIP을 읽는 중…',
      imported: '장면 {n}개를 불러왔습니다.',
      learned: '이 ZIP의 클릭 액션 형식을 학습했습니다. 이후 내보내기에 사용합니다.',
      importFailed: '룸 ZIP으로 읽을 수 없습니다(__data.json이 없습니다).',
      jszip: 'ZIP 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.',
      shapeGuess: '클릭 액션 형식: 코코포리아에서 동작 확인됨',
      shapeLearned: '클릭 액션 형식: 불러온 ZIP의 형식 사용 중',
      shapeReset: '확인된 형식으로 되돌리기',
      importedTitle: '불러온 방',
      importedNote: '클릭 액션을 편집해 내보내면 원래 ZIP의 다른 내용은 그대로 남습니다.'
    },
    footer: {
      title: '이용 시 주의',
      note1: '코코포리아의 룸 데이터(ZIP) 형식은 공개되어 있지 않아 이 툴의 내보내기는 비공식입니다. 불러오지 못하거나 다르게 동작하면 ' + X_LINK + ' 으로 알려 주세요.',
      note2: '레코드와 플레이어 이미지는 이 툴로 만든 방 안에서 자유롭게 쓸 수 있습니다. 이미지만 재배포하지는 말아 주세요.',
      note3: '이 툴은 코코포리아(CCFOLIA)의 공식 툴이 아닙니다.'
    }
  };

  global.I18N = { ja, en, ko };
})(window);
