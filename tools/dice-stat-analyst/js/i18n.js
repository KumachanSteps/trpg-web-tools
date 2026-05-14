/* =========================================================
   Dice Stat Analyst - i18n
   日本語 / English 表示文言
   ========================================================= */

window.DICE_STAT_I18N = {
  ja: {
    appTitle: 'Dice Stat Analyst',
    appDescription:
      'セッションログHTML / テキストからd100ロールを抽出し、キャラクター別にクリティカル・ファンブル率、10刻み分布を生成します。',

    langToggle: 'JP / EN',

    inputTitle: '入力',
    fileLabel: 'セッションログHTMLファイル',
    pasteLabel: 'またはログ本文を貼り付け',
    pastePlaceholder: 'HTMLまたはテキストログを貼り付け',

    thresholdTitle: '判定範囲',
    criticalMax: 'クリティカル上限',
    fumbleMin: 'ファンブル下限',

    checklistTitle: 'ダイスログ解析チェックリスト',
    dropTabs: '[雑談] / [other] / [info] 系の行を除外する',
    onlyD100: 'd100系ロールのみ抽出する',
    autoHide: '自動非表示にする総ロール数',

    analyze: '分析する',
    clear: 'クリア',

    inputHelp:
      '対応例：CCB<=80、CC<=60、1d100<=55、RESB(10-16)、D100 など。\n' +
      'キャラクター名は「名前：CC」や「[main] 名前：CCB」形式から自動検出します。\n' +
      '[雑談] / [other] / [info] 系は除外できます。少数ロールのキャラは初期状態で非表示になります。',

    tabSummary: 'キャラクター別サマリー',
    tabChart: '分布チャート',
    tabRolls: '抽出ロール',
    screenshotView: '📷 スクショ表示',
    exitScreenshotView: '通常表示に戻す',

    characterSummaryTitle: 'キャラクター別サマリー',
    openCharacterSettings: '表示キャラ設定を開く',
    closeCharacterSettings: '表示キャラ設定を隠す',

    overallSummaryTitle: '全体サマリー',
    totalRolls: '総ロール数',
    totalRollsSub: 'd100として抽出された件数',
    successFail: '成功 / 失敗',
    criticalFumble: 'クリティカル / ファンブル',
    averageRoll: '平均出目',
    averageRollSub: '抽出値の平均',

    memoTitle: 'メモ',
    initialMemo: 'ログを入力して「分析する」を押してください。',
    noRollsMemo: 'ログデータを選択ください。',
    noVisibleRollsMemo: '表示対象のロールがありません。キャラクターのチェックを戻してください。',

    detectedMemoPrefix: '検出した',
    detectedMemoMiddle: '件のd100ロールのうち、表示対象',
    detectedMemoSuffix: '件を集計しました。',
    detectedCharacters: '検出キャラクター数',
    hiddenRolls: '非表示ロール数',
    autoHiddenNotePrefix: '総ロール数',
    autoHiddenNoteSuffix: '以下のキャラクターは初期状態で非表示です。',
    criticalRule: 'クリティカル判定',
    fumbleRule: 'ファンブル判定',

    chartTitle: '出目分布：10刻み',

    rollsTitle: '抽出ロール一覧',
    tableIndex: '#',
    tableCharacter: 'キャラクター',
    tableValue: '出目',
    tableClassification: '分類',
    tableSourceLine: '元ログ行',

    noVisibleCharacters: '表示対象のキャラクターがありません。キャラクターのチェックを戻してください。',

    statTotalRolls: '総ロール',
    statAverageRoll: '平均出目',
    statSuccessFail: '成功 / 失敗',
    statCriticalFumble: 'クリティカル / ファンブル',

    countUnit: '件',

    classificationCritical: 'Critical',
    classificationSuccess: 'Success',
    classificationNormal: 'Normal',
    classificationFail: 'Fail',
    classificationFumble: 'Fumble',

    shortcutTitle: 'ショートカット一覧',
    shortcutFile: 'ファイル選択',
    shortcutTheme: 'ナイトモード / ライトモード切替',
    shortcutScreenshot: 'スクショ表示 / 通常表示切替',
    shortcutEscScreenshot: 'スクショ表示中：通常表示に戻る',
    shortcutEscNormal: '通常表示中：入力内容・分析結果をクリア'
  },

  en: {
    appTitle: 'Dice Stat Analyst',
    appDescription:
      'Extract d100 rolls from session log HTML or text, then summarize criticals, fumbles, and roll distribution by character.',

    langToggle: 'EN / JP',

    inputTitle: 'Input',
    fileLabel: 'Session Log HTML File',
    pasteLabel: 'Or paste log text',
    pastePlaceholder: 'Paste HTML or text log here',

    thresholdTitle: 'Roll Thresholds',
    criticalMax: 'Critical Maximum',
    fumbleMin: 'Fumble Minimum',

    checklistTitle: 'Dice Log Analysis Options',
    dropTabs: 'Exclude [雑談] / [other] / [info] style lines',
    onlyD100: 'Extract only d100-style rolls',
    autoHide: 'Auto-hide characters with total rolls up to',

    analyze: 'Analyze',
    clear: 'Clear',

    inputHelp:
      'Examples: CCB<=80, CC<=60, 1d100<=55, RESB(10-16), or D100.\n' +
      'Character names are detected from formats like “Name: CC” or “[main] Name: CCB”.\n' +
      'Chat/info tabs can be excluded. Characters with few rolls are hidden by default.',

    tabSummary: 'Character Summary',
    tabChart: 'Distribution Chart',
    tabRolls: 'Extracted Rolls',
    screenshotView: '📷 Screenshot View',
    exitScreenshotView: 'Back to Normal View',

    characterSummaryTitle: 'Character Summary',
    openCharacterSettings: 'Open Character Display Settings',
    closeCharacterSettings: 'Hide Character Display Settings',

    overallSummaryTitle: 'Overall Summary',
    totalRolls: 'Total Rolls',
    totalRollsSub: 'Number of extracted d100 rolls',
    successFail: 'Success / Failure',
    criticalFumble: 'Critical / Fumble',
    averageRoll: 'Average Roll',
    averageRollSub: 'Average of extracted values',

    memoTitle: 'Memo',
    initialMemo: 'Paste or load a log, then click “Analyze”.',
    noRollsMemo: 'Please select or paste log data.',
    noVisibleRollsMemo: 'No visible rolls. Re-enable characters in the display settings.',

    detectedMemoPrefix: 'Detected ',
    detectedMemoMiddle: ' d100 rolls; ',
    detectedMemoSuffix: ' rolls are currently displayed.',
    detectedCharacters: 'Detected characters',
    hiddenRolls: 'Hidden rolls',
    autoHiddenNotePrefix: 'Characters with ',
    autoHiddenNoteSuffix: ' rolls or fewer are hidden by default.',
    criticalRule: 'Critical threshold',
    fumbleRule: 'Fumble threshold',

    chartTitle: 'Roll Distribution: 10-point Bins',

    rollsTitle: 'Extracted Roll List',
    tableIndex: '#',
    tableCharacter: 'Character',
    tableValue: 'Roll',
    tableClassification: 'Classification',
    tableSourceLine: 'Source Line',

    noVisibleCharacters: 'No visible characters. Re-enable characters in the display settings.',

    statTotalRolls: 'Total Rolls',
    statAverageRoll: 'Average Roll',
    statSuccessFail: 'Success / Failure',
    statCriticalFumble: 'Critical / Fumble',

    countUnit: 'rolls',

    classificationCritical: 'Critical',
    classificationSuccess: 'Success',
    classificationNormal: 'Normal',
    classificationFail: 'Fail',
    classificationFumble: 'Fumble',

    shortcutTitle: 'Keyboard Shortcuts',
    shortcutFile: 'Choose File',
    shortcutTheme: 'Toggle Night / Light Mode',
    shortcutScreenshot: 'Toggle Screenshot View',
    shortcutEscScreenshot: 'In screenshot view: return to normal view',
    shortcutEscNormal: 'In normal view: clear input and analysis results'
  }
};

/**
 * 現在言語の辞書を取得
 * @param {string} lang - "ja" or "en"
 * @returns {object}
 */
window.getDiceStatI18n = function getDiceStatI18n(lang) {
  const safeLang = window.DICE_STAT_I18N[lang] ? lang : 'ja';
  return window.DICE_STAT_I18N[safeLang];
};

/**
 * 指定キーの翻訳文を取得
 * @param {string} key
 * @param {string} lang
 * @returns {string}
 */
window.tDiceStat = function tDiceStat(key, lang) {
  const dict = window.getDiceStatI18n(lang);
  return dict[key] || window.DICE_STAT_I18N.ja[key] || key;
};