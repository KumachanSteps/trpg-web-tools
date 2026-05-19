const I18L_DICTIONARY = {
  ja: {
    appTitle: '卓報告ジェネレーター',
    appLead: 'SNSの卓報告パターンをもとに、複数スタイルのX向け報告文を生成できます。',
    inputTitle: '入力',
    sampleList: '卓報告サンプルリスト',
    sampleHint: 'SNS実例の構造だけを参考にしたテンプレートです。',
    fontStyle: '文字スタイル',
    fontHint: '英数字のみ変換します。日本語・記号・装飾はそのままです。',
    system: 'システム',
    author: '作者 / 作',
    scenarioTitle: 'シナリオ名',
    result: '通過 / END / 結果',
    gmSection: 'GM / KP / DL / その他',
    honorific: '敬称',
    players: 'HO / PC / PL',
    nameOrder: 'PC名・PL名の入力順',
    date: '日付',
    quote: 'セリフ / 一言',
    hashtags: 'ハッシュタグ',
    asciiArt: 'アスキーアート / 装飾',
    previewTitle: 'X風プレビュー / 編集'
  },
  en: {
    appTitle: 'Session Report Generator',
    appLead: 'Create X-ready TRPG session report posts from multiple sample styles.',
    inputTitle: 'Input',
    sampleList: 'Session Report Sample List',
    sampleHint: 'These templates only reference the structure of public SNS examples.',
    fontStyle: 'Text Style',
    fontHint: 'Only English letters and numbers are converted. Japanese, symbols, and decorations stay unchanged.',
    system: 'System',
    author: 'Author / By',
    scenarioTitle: 'Scenario Title',
    result: 'Clear / END / Result',
    gmSection: 'GM / KP / DL / Other',
    honorific: 'Honorific',
    players: 'HO / PC / PL',
    nameOrder: 'PC / PL Input Order',
    date: 'Date',
    quote: 'Quote / Short comment',
    hashtags: 'Hashtags',
    asciiArt: 'ASCII Art / Decorations',
    previewTitle: 'X-style Preview / Edit'
  }
};

function applyI18l(lang = 'ja') {
  const dict = I18L_DICTIONARY[lang] || I18L_DICTIONARY.ja;
  document.documentElement.lang = lang === 'en' ? 'en' : 'ja';
  document.querySelectorAll('[data-i18l]').forEach(el => {
    const key = el.dataset.i18l;
    if (dict[key]) el.textContent = dict[key];
  });
}
