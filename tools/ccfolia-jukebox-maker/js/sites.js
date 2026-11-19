/* KPレス・ジュークボックスメーカー — 「BGM素材サイト紹介」タブのデータ
   紹介文と特徴タグは目安です（サイトの全曲に当てはまるわけではありません）。
   利用規約のURLは 2026-11-18 に各サイトの公開ページで確認したもの。専用ページが見つからなかったサイトは terms を null にしています。
   このタブはリンクを並べるだけで、音源の取得・ダウンロード・中継はしません。 */
(function (global) {
  'use strict';

  // 特徴タグ（ja / en / ko）
  const FEATURES = {
    daily: ['日常', 'Everyday', '일상'],
    calm: ['穏やか', 'Calm', '잔잔함'],
    talk: ['会話', 'Conversation', '대화'],
    sorrow: ['悲哀', 'Sorrow', '비애'],
    moving: ['感動', 'Moving', '감동'],
    serious: ['シリアス', 'Serious', '진지함'],
    battle: ['戦闘', 'Battle', '전투'],
    rock: ['ロック', 'Rock', '록'],
    piano: ['ピアノ', 'Piano', '피아노'],
    fantasy: ['ファンタジー', 'Fantasy', '판타지'],
    epic: ['壮大', 'Epic', '웅장함'],
    hiphop: ['ヒップホップ', 'Hip-hop', '힙합'],
    explore: ['探索', 'Exploration', '탐색'],
    uneasy: ['不穏', 'Uneasy', '불온'],
    tense: ['緊迫', 'Tense', '긴박'],
    urban: ['都市', 'Urban', '도시'],
    horror: ['ホラー', 'Horror', '호러'],
    electroswing: ['エレクトロスウィング', 'Electro swing', '일렉트로 스윙'],
    accordion: ['アコーディオン', 'Accordion', '아코디언'],
    eerie: ['怪しい', 'Eerie', '수상함'],
    musicbox: ['オルゴール', 'Music box', '오르골']
  };

  const SITES = [
    {
      id: 'musmus', name: 'MusMus', url: 'https://musmus.main.jp/',
      terms: { url: 'https://musmus.main.jp/info.html', label: ['利用規約', 'Terms of use', '이용 규약'] },
      features: ['daily', 'calm', 'talk'],
      intro: [
        '日常や穏やかな場面、会話シーンに使いやすいフリーBGMがそろうサイトです。',
        'A free BGM site with many tracks that suit everyday scenes, calm moments and conversations.',
        '일상이나 잔잔한 장면, 대화 장면에 쓰기 좋은 무료 BGM이 모인 사이트입니다.'
      ]
    },
    {
      id: 'amacha', name: '甘茶の音楽工房', url: 'https://amachamusic.chagasi.com/index.html',
      terms: { url: 'https://amachamusic.chagasi.com/terms.html', label: ['利用規約', 'Terms of use', '이용 규약'] },
      features: ['sorrow', 'moving', 'serious'],
      intro: [
        '幅広いジャンルのフリーBGMを公開しているサイトです。悲しい場面や感動の場面、シリアスな場面の曲を探すときに。',
        'A site with free BGM in many genres. Worth a look for sad, moving or serious scenes.',
        '다양한 장르의 무료 BGM을 공개하는 사이트입니다. 슬픈 장면, 감동적인 장면, 진지한 장면의 곡을 찾을 때 좋습니다.'
      ]
    },
    {
      id: 'maou', name: '魔王魂', url: 'https://maou.audio/category/bgm/',
      terms: { url: 'https://maou.audio/rule/', label: ['音楽利用のルール', 'Music usage rules', '음악 이용 규칙'] },
      features: ['battle', 'rock', 'piano'],
      intro: [
        'ロックやオーケストラ、ピアノなどカテゴリ別にフリーBGMを探せるサイトです。戦闘向きの曲も多めです。',
        'A free BGM site you can browse by category, such as rock, orchestra and piano, with plenty of battle tracks.',
        '록, 오케스트라, 피아노 등 카테고리별로 무료 BGM을 찾을 수 있는 사이트입니다. 전투에 어울리는 곡도 많습니다.'
      ]
    },
    {
      id: 'peritune', name: 'PeriTune', url: 'https://peritune.com/',
      terms: { url: 'https://peritune.com/about/', label: ['ご利用について', 'About using the music', '이용 안내'] },
      features: ['fantasy', 'epic', 'battle'],
      intro: [
        'ファンタジーやRPG風の曲を中心にしたフリー音楽素材のサイトです。壮大な曲や戦闘曲を探すときに。',
        'A free music site centred on fantasy and RPG-style tracks. Good for epic pieces and battle themes.',
        '판타지와 RPG풍 곡을 중심으로 한 무료 음악 소재 사이트입니다. 웅장한 곡이나 전투곡을 찾을 때 좋습니다.'
      ]
    },
    {
      id: 'howling', name: 'Howling-Indicator', url: 'https://howlingindicator.net/hiphop/',
      terms: { url: 'https://howlingindicator.net/tos/', label: ['利用規約', 'Terms of use', '이용 규약'] },
      features: ['hiphop', 'explore', 'uneasy'],
      intro: [
        'ヒップホップのフリーBGMをまとめたページです。探索や、少し不穏な場面の下地に。',
        'A page of free hip-hop BGM. Useful under exploration or slightly uneasy scenes.',
        '힙합 무료 BGM을 모은 페이지입니다. 탐색이나 조금 불온한 장면의 바탕으로 쓰기 좋습니다.'
      ]
    },
    {
      id: 'delf', name: 'D-elf', url: 'https://www.d-elf.com/archives/11105.html',
      terms: { url: 'https://www.d-elf.com/free-bgm', label: ['フリーBGMのご使用について', 'Using the free BGM', '무료 BGM 사용 안내'] },
      features: ['hiphop', 'tense', 'urban'],
      intro: [
        'ヒップホップのループ素材を紹介しているページです。緊迫した場面や、都市が舞台のシナリオに。',
        'A page introducing hip-hop loop tracks. Fits tense scenes and scenarios set in a city.',
        '힙합 루프 소재를 소개하는 페이지입니다. 긴박한 장면이나 도시가 무대인 시나리오에 어울립니다.'
      ]
    },
    {
      id: 'bgmemon', name: 'びじえもんのフリーBGM', url: 'https://bgmemon.com/',
      terms: { url: 'https://bgmemon.com/terms-of-use/', label: ['利用規約', 'Terms of use', '이용 규약'] },
      features: ['horror', 'uneasy', 'electroswing'],
      intro: [
        '不気味な曲や不思議な雰囲気の曲が多いフリーBGMのサイトです。ホラーや不穏な場面、エレクトロスウィングを探すときに。',
        'A free BGM site with many eerie and mysterious tracks. Look here for horror, uneasy scenes or electro swing.',
        '으스스하거나 신비로운 분위기의 곡이 많은 무료 BGM 사이트입니다. 호러, 불온한 장면, 일렉트로 스윙을 찾을 때 좋습니다.'
      ]
    },
    {
      id: 'mirymusic', name: 'MiryMusic', url: 'https://note.com/m0chikinak0m0chi/m/m310570105416',
      terms: null,
      termsNote: [
        '専用の利用規約ページは見つかりませんでした。マガジンと各記事の説明で利用条件を確認してください。',
        'No dedicated terms page was found. Check the conditions in the magazine and in each post.',
        '전용 이용 규약 페이지는 찾지 못했습니다. 매거진과 각 글의 설명에서 이용 조건을 확인해 주세요.'
      ],
      features: ['explore', 'accordion', 'eerie'],
      intro: [
        'noteのマガジンで公開されているフリーBGMです。アコーディオンなどを使った、怪しげで気だるい雰囲気の曲があります。',
        'Free BGM published in a note magazine, including eerie, languid pieces with accordion and other instruments.',
        'note 매거진에서 공개하는 무료 BGM입니다. 아코디언 등을 쓴 수상하고 나른한 분위기의 곡이 있습니다.'
      ]
    },
    {
      id: 'nagumorizu', name: 'なぐもりずの音楽室', url: 'https://nagumorizu.com/tag/%e3%82%aa%e3%83%ab%e3%82%b4%e3%83%bc%e3%83%ab/page/3/',
      terms: { url: 'https://nagumorizu.com/tos/', label: ['楽曲利用規約', 'Music terms of use', '악곡 이용 규약'] },
      features: ['fantasy', 'musicbox', 'sorrow'],
      intro: [
        'フリーBGMを公開しているサイトのオルゴール曲のページです。ファンタジーや、もの悲しい場面に。',
        'The music-box page of a free BGM site. Suits fantasy and wistful scenes.',
        '무료 BGM 사이트의 오르골 곡 페이지입니다. 판타지나 서글픈 장면에 어울립니다.'
      ]
    }
  ];

  global.JukeboxSites = { FEATURES, SITES };
})(window);
