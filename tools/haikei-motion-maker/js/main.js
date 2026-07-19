(() => {
  'use strict';

  const els = {
    body: document.body,
    toastHost: document.getElementById('toastHost'),
    helpBtn: document.getElementById('helpBtn'),
    shortcutBtn: document.getElementById('shortcutBtn'),
    languageSwitcher: document.getElementById('languageSwitcher'),
    langButtons: document.querySelectorAll('[data-lang-choice]'),
    themeBtn: document.getElementById('themeBtn'),
    helpDrawer: document.getElementById('helpDrawer'),
    shortcutDrawer: document.getElementById('shortcutDrawer'),
    drawerCloseButtons: document.querySelectorAll('[data-close-drawer]'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    imageInfo: document.getElementById('imageInfo'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    effectGrid: document.getElementById('effectGrid'),
    motionTab: document.getElementById('motionTab'),
    imageEditTab: document.getElementById('imageEditTab'),
    motionPanel: document.getElementById('motionPanel'),
    imageEditPanel: document.getElementById('imageEditPanel'),
    imageEditGrid: document.getElementById('imageEditGrid'),
    previewCanvas: document.getElementById('previewCanvas'),
    canvasPlaceholder: document.getElementById('canvasPlaceholder'),
    transitionThumbPanel: document.getElementById('transitionThumbPanel'),
    transitionThumbList: document.getElementById('transitionThumbList'),
    fileNameInput: document.getElementById('fileNameInput'),
    secondsInput: document.getElementById('secondsInput'),
    qualityInput: document.getElementById('qualityInput'),
    sizeInput: document.getElementById('sizeInput'),
    loopInput: document.getElementById('loopInput'),
    playBtn: document.getElementById('playBtn'),
    exportWebpBtn: document.getElementById('exportWebpBtn'),
    exportWebp30Btn: document.getElementById('exportWebp30Btn'),
    exportWebp60Btn: document.getElementById('exportWebp60Btn'),
    exportNote: document.querySelector('.export-note'),
    exportStatus: document.getElementById('exportStatus'),
    previewPanel: document.querySelector('.preview-panel'),
    previewControls: document.getElementById('previewControls'),
    downloadLink: document.getElementById('downloadLink'),
    clearOutputBtn: document.getElementById('clearOutputBtn')
  };

  const ctx = els.previewCanvas.getContext('2d');
  const analytics = window.ToolAnalytics || null;
  const state = {
    image: null,
    images: [],
    imageFiles: [],
    imageName: '',
    sourceBaseName: '',
    imageWidth: 0,
    imageHeight: 0,
    effect: 'quakeY2',
    imageFilter: 'none',
    playing: false,
    rafId: null,
    playStart: 0,
    stillFrameTime: 0,
    draggedThumbIndex: null,
    fadeOrder: ['image', 'fill'],
    isExporting: false,
    cancelExportRequested: false,
    stillDownloadUrl: '',
    stillDownloadName: '',
    sourceHasTransparency: false,
    lastOutputAnalytics: null
  };

  const DEV_SAMPLE_IMAGE_PATH = './assets/sample/sample_and_juliet.jpeg';
  const DEV_SAMPLE_IMAGE_NAME = 'sample_and_juliet.jpeg';
  const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
  const AUTO_LIGHT_FILE_BYTES = 1 * 1024 * 1024;
  const AUTO_PRESET_FILE_BYTES = 3 * 1024 * 1024;
  const AUTO_MINIMUM_FILE_BYTES = 6 * 1024 * 1024;
  const exportSizePresets = [
    { key: '16:9', value: '1280x720', baseLabel: '16：9' },
    { key: '8:5', value: '1280x800', baseLabel: '8：5' },
    { key: '4:3', value: '1024x768', baseLabel: '4：3' },
    { key: '3:2', value: '1200x800', baseLabel: '3：2' },
    { key: '1:1', value: '1024x1024', baseLabel: '1：1' }
  ];

  const qualitySettings = {
    minimum: {
      fps: 24,
      quality: 24,
      apngColors: 32,
      webpQuality: 0.62,
      label: '最小',
      sizeMap: {
        '16:9': { width: 768, height: 432 },
        '8:5': { width: 768, height: 480 },
        '4:3': { width: 640, height: 480 },
        '3:2': { width: 720, height: 480 },
        '1:1': { width: 640, height: 640 }
      }
    },
    light: {
      fps: 24,
      quality: 18,
      apngColors: 64,
      webpQuality: 0.72,
      label: '軽量',
      sizeMap: {
        '16:9': { width: 960, height: 540 },
        '8:5': { width: 960, height: 600 },
        '4:3': { width: 800, height: 600 },
        '3:2': { width: 900, height: 600 },
        '1:1': { width: 800, height: 800 }
      }
    },
    standard: {
      fps: 24,
      quality: 12,
      apngColors: 128,
      webpQuality: 0.82,
      label: '標準',
      sizeMap: {
        '16:9': { width: 1280, height: 720 },
        '8:5': { width: 1280, height: 800 },
        '4:3': { width: 1024, height: 768 },
        '3:2': { width: 1200, height: 800 },
        '1:1': { width: 1024, height: 1024 }
      }
    },
    high: {
      fps: 24,
      quality: 8,
      apngColors: 256,
      webpQuality: 0.92,
      label: '高品質',
      sizeMap: {
        '16:9': { width: 1920, height: 1080 },
        '8:5': { width: 1920, height: 1200 },
        '4:3': { width: 1600, height: 1200 },
        '3:2': { width: 1800, height: 1200 },
        '1:1': { width: 1600, height: 1600 }
      }
    }
  };

  const effectLabels = {
    none: 'モーションなし',
    quakeY: '縦揺れ',
    quakeX: '横揺れ',
    quakeXY: '全体揺れ',
    quakeY2: '縦揺れ',
    quakeX2: '横揺れ',
    quakeXY2: '全体揺れ',
    drunk: '千鳥足',
    breathe: '呼吸',
    panX: '左右パン',
    wave: '水面揺れ',
    fadeBlack: 'フェード・黒',
    fadeWhite: 'フェード・白',
    fadeTransparent: 'フェード・透明',
    transition: 'トランジション①（フェード）',
    transitionHardcut: 'トランジション②（ハードカット）',
    transitionWipe: 'トランジション③（ワイプ）',
    spinFallBlack: '回転落下・黒',
    suckInWhite: '吸い込み・白',
    suckInBlack: '吸い込み・黒',
    rise: '上昇',
    descend: '下降',
    zoomIn: 'ズームイン',
    zoomInWhite: 'ズームイン＋白',
    zoomInBlack: 'ズームイン＋黒',
    zoomOut: 'ズームアウト',
    zoomOutWhite: 'ズームアウト＋白',
    zoomOutBlack: 'ズームアウト＋黒'
  };

  const effectFileLabels = {
    none: 'モーションなし',
    quakeY: '縦揺れ',
    quakeX: '横揺れ',
    quakeXY: '全体揺れ',
    quakeY2: '縦揺れ',
    quakeX2: '横揺れ',
    quakeXY2: '全体揺れ',
    drunk: '千鳥足',
    breathe: '呼吸',
    panX: '左右パン',
    wave: '水面揺れ',
    fadeBlack: 'フェード黒',
    fadeWhite: 'フェード白',
    fadeTransparent: 'フェード透明',
    transition: 'トランジションクロスフェード',
    transitionHardcut: 'トランジション②ハードカット',
    transitionWipe: 'トランジション③ワイプ',
    spinFallBlack: '回転落下黒',
    suckInWhite: '吸い込み白',
    suckInBlack: '吸い込み黒',
    rise: '上昇',
    descend: '下降',
    zoomIn: 'ズームイン',
    zoomInWhite: 'ズームイン白',
    zoomInBlack: 'ズームイン黒',
    zoomOut: 'ズームアウト',
    zoomOutWhite: 'ズームアウト白',
    zoomOutBlack: 'ズームアウト黒'
  };

  const imageFilterLabels = {
    none: 'なし',
    grayscale: 'グレースケール',
    sepia: 'セピア',
    posterize: 'ポスタライズ',
    contrastBoost: 'コントラスト強調',
    softFocus: 'ソフトフォーカス',
    sharpen: 'シャープ',
    lineExtract: '線画抽出',
    whiteLineExtract: '白線抽出',
    sumiInk: '墨絵',
    pixelate: 'ドット化',
    noiseBoost: 'ノイズ強調',
    crt: 'CRT',
    vignette: 'ビネット',
    chromaticAberration: '色収差',
    morning: '朝',
    midday: '昼',
    evening: '夕方',
    night: '夜',
    deepNight: '深夜',
    moonlight: '月明かり',
    horror: 'ホラー',
    fog: '霧',
    cyber: 'サイバー',
    underwater: '水中',
    dream: '夢',
    vintagePhoto: '古写真'
  };

  const LANG_STORAGE_KEY = 'haikeiMotionMakerLang';

  const i18n = {
    ja: {
      htmlLang: 'ja',
      documentTitle: '背景モーションメーカー｜TRPG WEBツール観測所',
      langButton: 'EN',
      quality: { minimum: '最小', light: '軽量', standard: '標準', high: '高品質' },
      qualityRecommendation: ' ※標準以上の設定の場合、WebP出力をおすすめします。',
      exportNote: '※ 5MB以内でWebPファイルが出力されるように設定を調整してください。超過する場合は画質・画像サイズ・秒数を下げるか、30FPS / 60FPSでの出力ではなく、デフォルトの24FPSで出力してください。',
      staticText: {
        portalName: 'TRPG WEBツール観測所',
        title: '背景モーションメーカー',
        lead: 'アップロードした背景画像を揺らす・近づける・遠ざける。TRPG用の動く背景素材を作成します。',
        portalLink: '←TRPG WEBツール観測所',
        help: '使い方',
        shortcuts: 'ショートカット',
        helpTitle: '使い方',
        shortcutTitle: 'ショートカット一覧',
        uploadTitle: '画像アップロード',
        dropStrong: '画像をドラッグ＆ドロップ',
        dropSmall: 'またはクリックして PNG / JPG / WebP を開く（複数選択可）',
        sampleButton: 'サンプル画像を呼び出す',
        effectsTitle: 'エフェクト選択',
        motionTab: 'モーション',
        imageEditTab: '画像加工',
        previewTitle: 'プレビュー・出力',
        placeholder: '画像を読み込むとプレビューが表示されます',
        transitionOrder: 'トランジション順',
        transitionHint: 'サムネイルをドラッグして順番を変更できます',
        fadeOrder: 'フェード順',
        fadeHint: 'サムネイルをドラッグしてフェード方向を変更できます',
        fileName: 'ファイル名',
        seconds: '秒数',
        qualityLabel: '画質',
        imageSize: '画像サイズ',
        loop: 'ループする',
        play: 'プレビュー再生',
        stop: 'プレビュー停止',
        webp: '24FPSで出力',
        webp30: '30FPSで出力',
        webp60: '60FPSで出力',
        download: 'ダウンロード',
        clear: 'クリア',
        cancelExport: '出力をキャンセル',
        footerTitle: '利用上の注意',
        footer1: '本ツールは、開発者 @KumachanSteps による個人制作の非公式TRPG支援ツールです。 各TRPGシステム、シナリオ、外部サービスの利用規約・権利表記については、利用者自身でご確認ください。',
        footer2: '不具合報告や要望は、Xの @KumachanSteps 宛のDMにてお送りください。 ただし、すべての報告や要望に返信・対応できるとは限りません。'
      },
      helpSteps: [
        '1. 画像ファイルを選択、またはアップロード枠にドラッグ＆ドロップします。トランジションでは複数画像をまとめて読み込めます。',
        '2. エフェクトを選び、秒数・画質・画像サイズ・ループ設定を調整します。',
        '3. プレビューで動きを確認し、24FPS / 30FPS / 60FPS のWebPとして出力します。',
        '4. 通常は24FPS出力がおすすめです。より滑らかにしたい場合は30FPSや60FPSを試してください。'
      ],
      shortcutLabels: [
        '使い方/ショートカット展開中は閉じる。それ以外は画像をリセット',
        '画像を開く',
        'プレビュー再生/停止',
        '30FPS WebP出力',
        '60FPS WebP出力',
        '24FPS WebP出力',
        'ライトモード/ナイトモード切り替え'
      ],
      effectLabels: {
        none: 'モーションなし',
        quakeY: '縦揺れ',
        quakeX: '横揺れ',
        quakeXY: '全体揺れ',
        quakeY2: '縦揺れ',
        quakeX2: '横揺れ',
        quakeXY2: '全体揺れ',
        drunk: '千鳥足',
        breathe: '呼吸',
        panX: '左右パン',
        wave: '水面揺れ',
        fadeBlack: 'フェード・黒',
    fadeWhite: 'フェード・白',
    fadeTransparent: 'フェード・透明',
    transition: 'トランジション①（フェード）',
        transitionHardcut: 'トランジション②（ハードカット）',
        transitionWipe: 'トランジション③（ワイプ）',
        spinFallBlack: '回転落下・黒',
        suckInWhite: '吸い込み・白',
        suckInBlack: '吸い込み・黒',
        rise: '上昇',
        descend: '下降',
        zoomIn: 'ズームイン',
        zoomInWhite: 'ズームイン＋白',
        zoomInBlack: 'ズームイン＋黒',
        zoomOut: 'ズームアウト',
        zoomOutWhite: 'ズームアウト＋白',
        zoomOutBlack: 'ズームアウト＋黒'
      },
      effectFileLabels: {
        none: 'モーションなし',
        quakeY: '縦揺れ',
        quakeX: '横揺れ',
        quakeXY: '全体揺れ',
        quakeY2: '縦揺れ',
        quakeX2: '横揺れ',
        quakeXY2: '全体揺れ',
        drunk: '千鳥足',
        breathe: '呼吸',
        panX: '左右パン',
        wave: '水面揺れ',
        fadeBlack: 'フェード黒',
    fadeWhite: 'フェード白',
    fadeTransparent: 'フェード透明',
    transition: 'トランジションクロスフェード',
        transitionHardcut: 'トランジション②ハードカット',
        transitionWipe: 'トランジション③ワイプ',
        spinFallBlack: '回転落下黒',
        suckInWhite: '吸い込み白',
        suckInBlack: '吸い込み黒',
        rise: '上昇',
        descend: '下降',
        zoomIn: 'ズームイン',
        zoomInWhite: 'ズームイン白',
        zoomInBlack: 'ズームイン黒',
        zoomOut: 'ズームアウト',
        zoomOutWhite: 'ズームアウト白',
        zoomOutBlack: 'ズームアウト黒'
      },
      effectSubLabels: {
        quakeY2: 'No Zoom / Tate',
        quakeX2: 'No Zoom / Yoko',
        quakeXY2: 'No Zoom / All',
        drunk: 'Chidoriashi',
        breathe: 'Breathing',
        panX: 'Slow Pan',
        spinFallBlack: 'Spin Fall + Black',
        suckInWhite: 'Suck In + White',
        suckInBlack: 'Suck In + Black',
        wave: 'Wave',
        rise: 'Rise',
        descend: 'Descend',
        zoomIn: 'Zoom-in',
        zoomInWhite: 'Zoom-in + White',
        zoomInBlack: 'Zoom-in + Black',
        zoomOut: 'Zoom-out',
        zoomOutWhite: 'Zoom-out + White',
        zoomOutBlack: 'Zoom-out + Black',
        fadeBlack: 'To/from Black',
        fadeWhite: 'To/from White',
        fadeTransparent: 'To/from Transparent',
        transition: 'Crossfade',
        transitionHardcut: 'Hard Cut',
        transitionWipe: 'Wipe'
      },
      filterLabels: {
        none: 'なし',
        grayscale: 'グレースケール',
        sepia: 'セピア',
        posterize: 'ポスタライズ',
        contrastBoost: 'コントラスト強調',
        softFocus: 'ソフトフォーカス',
        sharpen: 'シャープ',
        lineExtract: '線画抽出',
        whiteLineExtract: '白線抽出',
        sumiInk: '墨絵',
        pixelate: 'ドット化',
        noiseBoost: 'ノイズ強調',
        crt: 'CRT',
        vignette: 'ビネット',
        chromaticAberration: '色収差',
        morning: '朝',
        midday: '昼',
        evening: '夕方',
        night: '夜',
        deepNight: '深夜',
        moonlight: '月明かり',
        horror: 'ホラー',
        fog: '霧',
        cyber: 'サイバー',
        underwater: '水中',
        dream: '夢',
        vintagePhoto: '古写真'
      },
      filterDescriptions: {
        none: '元画像の色味を維持',
        grayscale: '白黒写真風に変換',
        sepia: '古写真のような暖色の色味',
        posterize: '色数を抑えてイラスト調に',
        contrastBoost: '陰影と輪郭を少し強める',
        softFocus: 'やわらかな光で幻想的に',
        sharpen: '輪郭感を少し強く見せる',
        lineExtract: '輪郭だけを黒線で抽出',
        whiteLineExtract: '暗背景に白い輪郭を表示',
        sumiInk: '濃淡と線を活かした和風調',
        pixelate: '低解像度のピクセル調へ',
        noiseBoost: 'ざらつきを強めた映像風',
        crt: '走査線と色ずれの旧モニター風',
        vignette: '周辺減光で視線を中央へ',
        chromaticAberration: 'RGBのずれを強めに演出',
        morning: '淡い暖色と柔らかな朝の光',
        midday: '自然で明るい日中の光',
        evening: '暖色の夕景と少し長い影',
        night: '青みを残した夜の雰囲気',
        deepNight: 'さらに暗い深夜の空気感',
        moonlight: '冷たい月光の差す夜',
        horror: '不穏な彩度と暗部の圧迫感',
        fog: 'コントラストを落とした霞む景色',
        cyber: 'ネオン風の青紫カラー',
        underwater: '水の中のような青緑の空気感',
        dream: '淡い光とぼかしで幻想的に',
        vintagePhoto: '退色と粒子感のある古写真調'
      },
      filterSections: ['基本加工', '時間帯', '雰囲気加工'],
      imageEditNote: '※画像加工はCanvasベースの演出処理です。AIによる空の差し替えや本格的な昼夜変換ではなく、TRPG背景向けに雰囲気を変える加工として利用できます。',
      tooltip: {
        webp: 'ココフォリアで使いやすい軽量な動く画像として出力します。通常はこちらがおすすめです。',
        webp30: 'WebPを30FPSで出力します。より滑らかですが、ファイルサイズは大きくなりやすいです。',
        webp60: 'WebPを60FPSで出力します。最も滑らかですが、ファイルサイズはかなり大きくなりやすいです。'
      },
      messages: {
        sizeLimit: bytes => `推奨上限：${bytes}以内`,
        sizeWarning: bytes => `警告：出力ファイルは ${bytes} です。5MBを超えるため、ココフォリア等にアップロードできない可能性があります。画質・画像サイズ・秒数を下げて再出力してください。`,
        exportTooLarge: kind => `${kind}出力が完了しました。ファイルサイズが大きすぎます。\n設定を変更して、再度出力をお願いします。`,
        exportReady: kind => `${kind}出力が完了しました。ダウンロード可能です。`,
        selectImage: '画像ファイルを選択してください。',
        imageLoadFailed: '画像を読み込めませんでした。別のファイルを試してください。',
        imagesLoadedTransition: (count, extra) => `${count}枚の画像を読み込みました。トランジションで順番に切り替えられます。${extra}`,
        imageLoaded: extra => `画像を読み込みました。エフェクトを選んでプレビューできます。${extra}`,
        autoLightQuality: ' 元画像が1MB以上のため、画質は軽量を自動選択しました。画像サイズはオリジナルです。',
        autoLightPresetQuality: label => ` 元画像が3MB以上のため、画質は軽量、画像サイズは ${label} を自動選択しました。`,
        autoMinimumQuality: label => ` 元画像が6MB以上のため、画質は最小、画像サイズは ${label} を自動選択しました。`,
        autoStandardQuality: ' 元画像が1MB未満のため、画質は標準を自動選択しました。画像サイズはオリジナルです。',
        sampleLoaded: 'サンプル画像を読み込みました。',
        sampleFailedStatus: 'サンプル画像を読み込めませんでした。assets/sample/sample_and_juliet.jpeg を確認してください。',
        sampleFailedToast: 'サンプル画像を読み込めませんでした。',
        emptyImageInfo: 'まだ画像が読み込まれていません。',
        approxKb: kb => `約 ${kb.toLocaleString()} KB`,
        multiImageInfo: (count, w, h, kb, names, more) => `<strong>${count}枚の画像を読み込み済み</strong><br>先頭画像: ${w} × ${h}px<br>合計 約 ${kb.toLocaleString()} KB<br><br>${names}${more}`,
        moreImages: count => `<br>…ほか ${count} 枚`,
        noMotionPreview: 'モーションなしの静止プレビューを表示しています。',
        noMotionSelected: extra => `モーションなしにしました。静止画像としてプレビュー・出力できます。${extra}`,
        imageReset: '画像をリセットしました。',
        transitionOrderChanged: (count, verb, extra) => `トランジション順序を変更しました。${count}枚の画像を順番に${verb}します。${extra}`,
        transitionHintImages: (count, verb) => ` ${count}枚の画像を順番に${verb}します。1ループは最後の画像までの一方向です。`,
        transitionHintNeedImages: ' トランジション系は2枚以上の画像で使用できます。',
        effectSelected: (effect, loop, hint, extra) => `${effect}を選択しました。出力設定は${loop ? 'ループ' : '非ループ'}です。${hint}${extra}`,
        filterSelected: (filter, extra) => `画像加工：${filter}を選択しました。${extra}`,
        needImage: '先に画像を読み込んでください。',
        pngZipLibraryMissing: 'PNG連番ZIP出力ライブラリを読み込めませんでした。ネットワーク接続を確認してください。',
        pngZipStart: (frames, limit) => `PNG連番ZIP生成中... 0 / ${frames} frames / ${limit}`,
        pngZipProgress: (done, frames) => `PNG連番ZIP生成中... ${done} / ${frames} frames`,
        pngZipComplete: (name, size, effect, seconds, quality, sizeLabel, warning) => `PNG連番ZIP出力完了：${name} / ${size} / ${effect} / ${seconds}秒 / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        pngZipError: 'PNG連番ZIP出力中にエラーが発生しました。5MB以内を目安に、画像サイズ・秒数・画質を下げて試してください。',
        webpStart: fpsLabel => fpsLabel ? `${fpsLabel} WebP出力を開始しました。しばらくお待ちください。` : 'WebP出力を開始しました。しばらくお待ちください。',
        webpProgressStart: (fpsLabel, frames, limit) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP生成中... 0 / ${frames} frames / ${limit}`,
        webpProgress: (fpsLabel, done, frames) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP生成中... ${done} / ${frames} frames`,
        webpComplete: (fpsLabel, name, size, effect, loop, seconds, fps, quality, sizeLabel, warning) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP出力完了：${name} / ${size} / ${effect} / ${loop ? 'ループ' : '非ループ'} / ${seconds}秒 / ${fps}FPS / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        webpError: 'WebP出力中にエラーが発生しました。ブラウザがWebP書き出しに対応しているか確認し、5MB以内を目安に画像サイズ・画質・秒数を下げて試してください。',
        downloadFirst: '出力ボタンでまず画像を書き出してください。',
        downloadDone: 'ダウンロードが完了しました。',
        webpPlaybackNote: '※ WebPは再生環境によってプレビュー速度が実際より遅く表示される場合があります。ココフォリア等の実際に使用する環境で再生確認することをおすすめします。',
        exportCancelling: '出力をキャンセルしています。しばらくお待ちください。',
        exportCancelled: '出力をキャンセルしました。',
        lightMode: 'ライトモード',
        darkMode: 'ナイトモード',
        loop: 'ループ',
        noLoop: '非ループ',
        original: 'オリジナル'
      },
      fadeFillLabels: {
        image: '画像',
        fadeBlack: '黒',
        fadeWhite: '白',
        fadeTransparent: '透明'
      },
      transitionVerb: {
        transition: 'クロスフェード',
        transitionHardcut: 'ハードカット',
        transitionWipe: 'ワイプ'
      }
    },
    en: {
      htmlLang: 'en',
      documentTitle: 'Background Motion Maker | TRPG WEB Tools Observatory',
      langButton: 'JP',
      quality: { minimum: 'Minimum', light: 'Light', standard: 'Standard', high: 'High Quality' },
      qualityRecommendation: ' For standard or higher settings, WebP output is recommended.',
      exportNote: 'Adjust the settings so the WebP file stays under 5 MB. If it exceeds the limit, lower the quality, image size, or duration, or use the default 24 FPS output instead of 30 FPS or 60 FPS.',
      staticText: {
        portalName: 'TRPG WEB Tools Observatory',
        title: 'Background Motion Maker',
        lead: 'Add motion to uploaded background images: shake, zoom, pan, transition, and export animated TRPG background assets.',
        portalLink: '←TRPG WEB Tools Observatory',
        help: 'How to Use',
        shortcuts: 'Shortcuts',
        helpTitle: 'How to Use',
        shortcutTitle: 'Shortcut List',
        uploadTitle: 'Image Upload',
        dropStrong: 'Drag & drop images',
        dropSmall: 'or click to open PNG / JPG / WebP files. Multiple images are supported.',
        sampleButton: 'Load sample image',
        effectsTitle: 'Effect Selection',
        motionTab: 'Motion',
        imageEditTab: 'Image Edit',
        previewTitle: 'Preview & Export',
        placeholder: 'Load an image to show the preview',
        transitionOrder: 'Transition Order',
        transitionHint: 'Drag thumbnails to reorder them',
        fadeOrder: 'Fade Order',
        fadeHint: 'Drag thumbnails to switch between fade-out and fade-in',
        fileName: 'File Name',
        seconds: 'Duration',
        qualityLabel: 'Quality',
        imageSize: 'Image Size',
        loop: 'Loop',
        play: 'Play Preview',
        stop: 'Stop Preview',
        webp: 'Export at 24 FPS',
        webp30: 'Export at 30 FPS',
        webp60: 'Export at 60 FPS',
        download: 'Download',
        clear: 'Clear',
        cancelExport: 'Cancel Export',
        footerTitle: 'Notice',
        footer1: 'This is an unofficial personal TRPG support tool created by @KumachanSteps. Please check the terms and rights notices for each TRPG system, scenario, and external service yourself.',
        footer2: 'For bug reports or feature requests, please send a DM to @KumachanSteps on X. Replies and fixes are not guaranteed for every request.'
      },
      helpSteps: [
        '1. Select image files or drag and drop them into the upload area. Transition effects can use multiple images.',
        '2. Choose an effect, then adjust duration, quality, image size, and loop settings.',
        '3. Check the motion in the preview, then export as WebP at 24 FPS, 30 FPS, or 60 FPS.',
        '4. 24 FPS is recommended for normal use. Try 30 FPS or 60 FPS when you want smoother motion.'
      ],
      shortcutLabels: [
        'Close Help/Shortcuts when open. Otherwise reset the image.',
        'Open image file',
        'Play / stop preview',
        'Export 30 FPS WebP',
        'Export 60 FPS WebP',
        'Export 24 FPS WebP',
        'Toggle light / night mode'
      ],
      effectLabels: {
        none: 'No Motion',
        quakeY: 'Vertical Shake',
        quakeX: 'Horizontal Shake',
        quakeXY: 'Full Shake',
        quakeY2: 'Vertical Shake',
        quakeX2: 'Horizontal Shake',
        quakeXY2: 'Full Shake',
        drunk: 'Stagger',
        breathe: 'Breathing',
        panX: 'Horizontal Pan',
        wave: 'Water Ripple',
        fadeBlack: 'Fade Black',
        fadeWhite: 'Fade White',
        fadeTransparent: 'Fade Transparent',
        transition: 'Transition 1 (Fade)',
        transitionHardcut: 'Transition 2 (Hardcut)',
        transitionWipe: 'Transition 3 (Wipe)',
        spinFallBlack: 'Spin Fall + Black',
        suckInWhite: 'Suck In + White',
        suckInBlack: 'Suck In + Black',
        rise: 'Rise',
        descend: 'Descend',
        zoomIn: 'Zoom In',
        zoomInWhite: 'Zoom In + White',
        zoomInBlack: 'Zoom In + Black',
        zoomOut: 'Zoom Out',
        zoomOutWhite: 'Zoom Out + White',
        zoomOutBlack: 'Zoom Out + Black'
      },
      effectFileLabels: {
        none: 'NoMotion',
        quakeY: 'VerticalShake',
        quakeX: 'HorizontalShake',
        quakeXY: 'FullShake',
        quakeY2: 'VerticalShake',
        quakeX2: 'HorizontalShake',
        quakeXY2: 'FullShake',
        drunk: 'Stagger',
        breathe: 'Breathing',
        panX: 'HorizontalPan',
        wave: 'WaterRipple',
        fadeBlack: 'FadeBlack',
        fadeWhite: 'FadeWhite',
        fadeTransparent: 'FadeTransparent',
        transition: 'TransitionCrossfade',
        transitionHardcut: 'Transition2Hardcut',
        transitionWipe: 'Transition3Wipe',
        spinFallBlack: 'SpinFallBlack',
        suckInWhite: 'SuckInWhite',
        suckInBlack: 'SuckInBlack',
        rise: 'Rise',
        descend: 'Descend',
        zoomIn: 'ZoomIn',
        zoomInWhite: 'ZoomInWhite',
        zoomInBlack: 'ZoomInBlack',
        zoomOut: 'ZoomOut',
        zoomOutWhite: 'ZoomOutWhite',
        zoomOutBlack: 'ZoomOutBlack'
      },
      effectSubLabels: {
        quakeY2: 'No Zoom / Vertical',
        quakeX2: 'No Zoom / Horizontal',
        quakeXY2: 'No Zoom / Full',
        drunk: 'Unsteady camera motion',
        breathe: 'Slow organic zoom',
        panX: 'Slow side pan',
        spinFallBlack: 'Spin fall + fade',
        suckInWhite: 'Pull-in + white',
        suckInBlack: 'Pull-in + black',
        wave: 'Water-like distortion',
        rise: 'Move upward',
        descend: 'Move downward',
        zoomIn: 'Zoom in',
        zoomInWhite: 'Zoom in + white',
        zoomInBlack: 'Zoom in + black',
        zoomOut: 'Zoom out',
        zoomOutWhite: 'Zoom out + white',
        zoomOutBlack: 'Zoom out + black',
        fadeBlack: 'To/from black',
        fadeWhite: 'To/from white',
        fadeTransparent: 'To/from transparent',
        transition: 'Crossfade',
        transitionHardcut: 'Hard cut',
        transitionWipe: 'Wipe'
      },
      filterLabels: {
        none: 'None',
        grayscale: 'Grayscale',
        sepia: 'Sepia',
        posterize: 'Posterize',
        contrastBoost: 'Contrast Boost',
        softFocus: 'Soft Focus',
        sharpen: 'Sharpen',
        lineExtract: 'Line Extract',
        whiteLineExtract: 'White Line',
        sumiInk: 'Ink Wash',
        pixelate: 'Pixelate',
        noiseBoost: 'Noise Boost',
        crt: 'CRT',
        vignette: 'Vignette',
        chromaticAberration: 'Chromatic Aberration',
        morning: 'Morning',
        midday: 'Midday',
        evening: 'Evening',
        night: 'Night',
        deepNight: 'Late Night',
        moonlight: 'Moonlight',
        horror: 'Horror',
        fog: 'Fog',
        cyber: 'Cyber',
        underwater: 'Underwater',
        dream: 'Dream',
        vintagePhoto: 'Vintage Photo'
      },
      filterDescriptions: {
        none: 'Keep the original colors',
        grayscale: 'Convert to a monochrome photo look',
        sepia: 'Warm old-photo color tone',
        posterize: 'Reduce colors for an illustrated look',
        contrastBoost: 'Strengthen shadows and edges',
        softFocus: 'Add soft, dreamy light',
        sharpen: 'Make edges slightly clearer',
        lineExtract: 'Extract dark outline lines',
        whiteLineExtract: 'Show white outlines on a dark base',
        sumiInk: 'Japanese ink-wash inspired tone',
        pixelate: 'Low-resolution pixel look',
        noiseBoost: 'Add rough video-like grain',
        crt: 'Old monitor scanline effect',
        vignette: 'Darken edges to focus the center',
        chromaticAberration: 'Stronger RGB shift effect',
        morning: 'Soft warm morning light',
        midday: 'Natural bright daylight',
        evening: 'Warm sunset and longer shadows',
        night: 'Cool blue night atmosphere',
        deepNight: 'Darker late-night mood',
        moonlight: 'Cold moonlit night',
        horror: 'Uneasy color and oppressive shadows',
        fog: 'Lower contrast for a hazy view',
        cyber: 'Neon blue-purple tone',
        underwater: 'Blue-green underwater mood',
        dream: 'Soft blur and pale light',
        vintagePhoto: 'Faded color and photo grain'
      },
      filterSections: ['Basic Edits', 'Time of Day', 'Atmosphere'],
      imageEditNote: 'Image edits are Canvas-based visual effects. They do not replace the sky or perform full day/night conversion with AI; use them as quick mood adjustments for TRPG backgrounds.',
      tooltip: {
        webp: 'Exports a lightweight animated image that is easy to use in CCFOLIA. Recommended for normal use.',
        webp30: 'Exports WebP at 30 FPS. Motion is smoother, but the file size is more likely to increase.',
        webp60: 'Exports WebP at 60 FPS. Motion is the smoothest, but the file size is much more likely to increase.'
      },
      messages: {
        sizeLimit: bytes => `Recommended limit: under ${bytes}`,
        sizeWarning: bytes => `Warning: output file is ${bytes}. It may exceed the 5 MB upload limit for services such as CCFOLIA. Lower quality, image size, or duration and export again.`,
        exportTooLarge: kind => `${kind} export finished, but the file is too large.\nPlease adjust the settings and export again.`,
        exportReady: kind => `${kind} export finished. Ready to download.`,
        selectImage: 'Please select an image file.',
        imageLoadFailed: 'Could not load the image. Try another file.',
        imagesLoadedTransition: (count, extra) => `${count} images loaded. Transition effects will switch through them in order.${extra}`,
        imageLoaded: extra => `Image loaded. Choose an effect and preview the motion.${extra}`,
        autoLightQuality: ' The source image is 1 MB or larger, so quality was automatically set to Light. Image size remains Original.',
        autoLightPresetQuality: label => ` The source image is 3 MB or larger, so quality was automatically set to Light and image size was automatically set to ${label}.`,
        autoMinimumQuality: label => ` The source image is 6 MB or larger, so quality was automatically set to Minimum and image size was automatically set to ${label}.`,
        autoStandardQuality: ' The source image is smaller than 1 MB, so quality was automatically set to Standard. Image size remains Original.',
        sampleLoaded: 'Sample image loaded.',
        sampleFailedStatus: 'Could not load the sample image. Check assets/sample/sample_and_juliet.jpeg.',
        sampleFailedToast: 'Could not load the sample image.',
        emptyImageInfo: 'No image loaded yet.',
        approxKb: kb => `about ${kb.toLocaleString()} KB`,
        multiImageInfo: (count, w, h, kb, names, more) => `<strong>${count} images loaded</strong><br>First image: ${w} × ${h}px<br>Total about ${kb.toLocaleString()} KB<br><br>${names}${more}`,
        moreImages: count => `<br>…and ${count} more`,
        noMotionPreview: 'Showing a still preview with no motion.',
        noMotionSelected: extra => `No motion selected. You can preview and export a still image.${extra}`,
        imageReset: 'Image reset.',
        transitionOrderChanged: (count, verb, extra) => `Transition order updated. ${count} images will ${verb} in order.${extra}`,
        fadeOrderChanged: extra => `Fade order changed.${extra}`,
        fadeOrderHint: ' Drag thumbnails to switch between fade-out and fade-in.',
        transitionHintImages: (count, verb) => ` ${count} images will ${verb} in order. One loop runs one-way through the last image.`,
        transitionHintSingleFilter: filter => ` The selected transition will change one image from the original to ${filter}.`,
        transitionHintNeedImages: ' Transition effects require at least two images.',
        effectSelected: (effect, loop, hint, extra) => `${effect} selected. Output setting: ${loop ? 'loop' : 'no loop'}.${hint}${extra}`,
        filterSelected: (filter, extra) => `Image edit: ${filter} selected.${extra}`,
        needImage: 'Load an image first.',
        pngZipLibraryMissing: 'Could not load the PNG Sequence ZIP library. Check your network connection.',
        pngZipStart: (frames, limit) => `Generating PNG Sequence ZIP... 0 / ${frames} frames / ${limit}`,
        pngZipProgress: (done, frames) => `Generating PNG Sequence ZIP... ${done} / ${frames} frames`,
        pngZipComplete: (name, size, effect, seconds, quality, sizeLabel, warning) => `PNG Sequence ZIP complete: ${name} / ${size} / ${effect} / ${seconds}s / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        pngZipError: 'PNG Sequence ZIP export failed. Try lowering image size, duration, or quality to stay under 5 MB.',
        webpStart: fpsLabel => fpsLabel ? `${fpsLabel} WebP export started. Please wait.` : 'WebP export started. Please wait.',
        webpProgressStart: (fpsLabel, frames, limit) => `${fpsLabel ? `${fpsLabel} ` : ''}Generating WebP... 0 / ${frames} frames / ${limit}`,
        webpProgress: (fpsLabel, done, frames) => `${fpsLabel ? `${fpsLabel} ` : ''}Generating WebP... ${done} / ${frames} frames`,
        webpComplete: (fpsLabel, name, size, effect, loop, seconds, fps, quality, sizeLabel, warning) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP complete: ${name} / ${size} / ${effect} / ${loop ? 'loop' : 'no loop'} / ${seconds}s / ${fps}FPS / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        webpError: 'WebP export failed. Check that your browser supports WebP export, then lower image size, quality, or duration and try again.',
        downloadFirst: 'Export an image first, then download it.',
        downloadDone: 'Download complete.',
        webpPlaybackNote: 'WebP preview speed may appear slower than the actual motion depending on the playback environment. We recommend checking playback in your actual destination environment, such as CCFOLIA.',
        exportCancelling: 'Cancelling the export. Please wait.',
        exportCancelled: 'Export cancelled.',
        lightMode: 'Light mode',
        darkMode: 'Night mode',
        loop: 'Loop',
        noLoop: 'No Loop',
        original: 'Original'
      },
      fadeFillLabels: {
        image: 'Image',
        fadeBlack: 'Black',
        fadeWhite: 'White',
        fadeTransparent: 'Transparent'
      },
      transitionVerb: {
        transition: 'crossfade',
        transitionHardcut: 'hard cut',
        transitionWipe: 'wipe'
      }
    },
    ko: {
      htmlLang: 'ko',
      documentTitle: '배경 모션 메이커｜TRPG WEB 도구 관측소',
      quality: { minimum: '최소', light: '경량', standard: '표준', high: '고화질' },
      qualityRecommendation: ' ※표준 이상의 설정에서는 WebP 출력을 권장합니다.',
      exportNote: '※ WebP 파일이 5MB 이내가 되도록 설정을 조정해 주세요. 초과하는 경우 화질, 이미지 크기 또는 재생 시간을 낮추거나 30FPS / 60FPS 대신 기본 24FPS로 출력해 주세요.',
      staticText: {
        portalName: 'TRPG WEB 도구 관측소',
        title: '배경 모션 메이커',
        lead: '업로드한 배경 이미지에 흔들림, 줌, 팬, 전환 효과를 적용해 TRPG용 움직이는 배경 소재를 만듭니다.',
        portalLink: '←TRPG WEB 도구 관측소',
        help: '사용법',
        shortcuts: '단축키',
        helpTitle: '사용법',
        shortcutTitle: '단축키 목록',
        uploadTitle: '이미지 업로드',
        dropStrong: '이미지를 드래그 앤 드롭',
        dropSmall: '또는 클릭하여 PNG / JPG / WebP 파일 열기 (여러 장 선택 가능)',
        sampleButton: '샘플 이미지 불러오기',
        effectsTitle: '효과 선택',
        motionTab: '모션',
        imageEditTab: '이미지 편집',
        previewTitle: '미리보기·출력',
        placeholder: '이미지를 불러오면 미리보기가 표시됩니다',
        transitionOrder: '전환 순서',
        transitionHint: '썸네일을 드래그하여 순서를 변경할 수 있습니다',
        fadeOrder: '페이드 순서',
        fadeHint: '썸네일을 드래그하여 페이드 인/아웃 방향을 변경할 수 있습니다',
        fileName: '파일명',
        seconds: '재생 시간',
        qualityLabel: '화질',
        imageSize: '이미지 크기',
        loop: '반복 재생',
        play: '미리보기 재생',
        stop: '미리보기 정지',
        webp: '24FPS로 출력',
        webp30: '30FPS로 출력',
        webp60: '60FPS로 출력',
        download: '다운로드',
        clear: '초기화',
        cancelExport: '출력 취소',
        footerTitle: '이용 안내',
        footer1: '이 도구는 개발자 @KumachanSteps가 개인 제작한 비공식 TRPG 지원 도구입니다. 각 TRPG 시스템, 시나리오 및 외부 서비스의 이용 약관과 권리 표기는 이용자가 직접 확인해 주세요.',
        footer2: '오류 제보 및 기능 요청은 X의 @KumachanSteps 계정으로 DM을 보내 주세요. 모든 제보와 요청에 답변하거나 대응할 수 있는 것은 아닙니다.'
      },
      helpSteps: [
        '1. 이미지 파일을 선택하거나 업로드 영역에 드래그 앤 드롭합니다. 전환 효과에서는 여러 이미지를 한 번에 불러올 수 있습니다.',
        '2. 효과를 선택한 뒤 재생 시간, 화질, 이미지 크기 및 반복 설정을 조정합니다.',
        '3. 미리보기에서 움직임을 확인하고 24FPS / 30FPS / 60FPS WebP로 출력합니다.',
        '4. 일반적으로 24FPS 출력을 권장합니다. 더 부드러운 움직임이 필요하면 30FPS 또는 60FPS를 사용해 보세요.'
      ],
      shortcutLabels: [
        '사용법/단축키 패널이 열려 있으면 닫고, 그렇지 않으면 이미지를 초기화',
        '이미지 파일 열기',
        '미리보기 재생/정지',
        '30FPS WebP 출력',
        '60FPS WebP 출력',
        '24FPS WebP 출력',
        '라이트 모드/나이트 모드 전환'
      ],
      effectLabels: {
        none: '모션 없음',
        quakeY: '세로 흔들림',
        quakeX: '가로 흔들림',
        quakeXY: '전체 흔들림',
        quakeY2: '세로 흔들림',
        quakeX2: '가로 흔들림',
        quakeXY2: '전체 흔들림',
        drunk: '비틀거림',
        breathe: '호흡',
        panX: '좌우 팬',
        wave: '수면 흔들림',
        fadeBlack: '검정 페이드',
        fadeWhite: '흰색 페이드',
        fadeTransparent: '투명 페이드',
        transition: '전환(크로스페이드)',
        transitionHardcut: '전환②(하드 컷)',
        transitionWipe: '전환③(와이프)',
        spinFallBlack: '회전 낙하·검정',
        suckInWhite: '흡입·흰색',
        suckInBlack: '흡입·검정',
        rise: '상승',
        descend: '하강',
        zoomIn: '줌 인',
        zoomInWhite: '줌 인＋흰색',
        zoomInBlack: '줌 인＋검정',
        zoomOut: '줌 아웃',
        zoomOutWhite: '줌 아웃＋흰색',
        zoomOutBlack: '줌 아웃＋검정'
      },
      effectFileLabels: {
        none: '모션없음',
        quakeY: '세로흔들림',
        quakeX: '가로흔들림',
        quakeXY: '전체흔들림',
        quakeY2: '세로흔들림',
        quakeX2: '가로흔들림',
        quakeXY2: '전체흔들림',
        drunk: '비틀거림',
        breathe: '호흡',
        panX: '좌우팬',
        wave: '수면흔들림',
        fadeBlack: '검정페이드',
        fadeWhite: '흰색페이드',
        fadeTransparent: '투명페이드',
        transition: '전환크로스페이드',
        transitionHardcut: '전환2하드컷',
        transitionWipe: '전환3와이프',
        spinFallBlack: '회전낙하검정',
        suckInWhite: '흡입흰색',
        suckInBlack: '흡입검정',
        rise: '상승',
        descend: '하강',
        zoomIn: '줌인',
        zoomInWhite: '줌인흰색',
        zoomInBlack: '줌인검정',
        zoomOut: '줌아웃',
        zoomOutWhite: '줌아웃흰색',
        zoomOutBlack: '줌아웃검정'
      },
      effectSubLabels: {
        quakeY2: '확대 없음 / 세로',
        quakeX2: '확대 없음 / 가로',
        quakeXY2: '확대 없음 / 전체',
        drunk: '불안정한 카메라 움직임',
        breathe: '느린 호흡형 줌',
        panX: '느린 좌우 이동',
        spinFallBlack: '회전 낙하＋페이드',
        suckInWhite: '흡입＋흰색',
        suckInBlack: '흡입＋검정',
        wave: '물결처럼 일렁임',
        rise: '위로 이동',
        descend: '아래로 이동',
        zoomIn: '확대',
        zoomInWhite: '확대＋흰색',
        zoomInBlack: '확대＋검정',
        zoomOut: '축소',
        zoomOutWhite: '축소＋흰색',
        zoomOutBlack: '축소＋검정',
        fadeBlack: '검정으로/검정에서',
        fadeWhite: '흰색으로/흰색에서',
        fadeTransparent: '투명으로/투명에서',
        transition: '크로스페이드',
        transitionHardcut: '하드 컷',
        transitionWipe: '와이프'
      },
      filterLabels: {
        none: '없음',
        grayscale: '그레이스케일',
        sepia: '세피아',
        posterize: '포스터라이즈',
        contrastBoost: '대비 강조',
        softFocus: '소프트 포커스',
        sharpen: '선명하게',
        lineExtract: '선화 추출',
        whiteLineExtract: '흰선 추출',
        sumiInk: '수묵화',
        pixelate: '픽셀화',
        noiseBoost: '노이즈 강화',
        crt: 'CRT',
        vignette: '비네트',
        chromaticAberration: '색수차',
        morning: '아침',
        midday: '낮',
        evening: '저녁',
        night: '밤',
        deepNight: '심야',
        moonlight: '달빛',
        horror: '호러',
        fog: '안개',
        cyber: '사이버',
        underwater: '수중',
        dream: '꿈',
        vintagePhoto: '빈티지 사진'
      },
      filterDescriptions: {
        none: '원본 이미지의 색감을 유지',
        grayscale: '흑백 사진 느낌으로 변환',
        sepia: '오래된 사진 같은 따뜻한 색감',
        posterize: '색상 수를 줄여 일러스트 느낌으로',
        contrastBoost: '그림자와 윤곽을 강조',
        softFocus: '부드럽고 몽환적인 빛 추가',
        sharpen: '윤곽을 조금 더 선명하게',
        lineExtract: '어두운 윤곽선을 추출',
        whiteLineExtract: '어두운 바탕에 흰 윤곽선 표시',
        sumiInk: '일본식 수묵화 느낌의 색조',
        pixelate: '저해상도 픽셀 스타일',
        noiseBoost: '거친 영상풍 노이즈 추가',
        crt: '구형 모니터 주사선 효과',
        vignette: '가장자리를 어둡게 하여 중앙에 시선 집중',
        chromaticAberration: '강한 RGB 색 어긋남 효과',
        morning: '은은하고 따뜻한 아침 햇빛',
        midday: '자연스럽고 밝은 낮의 빛',
        evening: '따뜻한 노을과 길어진 그림자',
        night: '푸른 기운이 남은 밤의 분위기',
        deepNight: '더 어두운 심야의 분위기',
        moonlight: '차가운 달빛이 비치는 밤',
        horror: '불안한 색감과 압박감 있는 어둠',
        fog: '대비를 낮춰 안개 낀 풍경으로',
        cyber: '네온 블루·퍼플 색조',
        underwater: '푸른빛이 도는 수중 분위기',
        dream: '옅은 빛과 흐림으로 몽환적으로',
        vintagePhoto: '바랜 색감과 입자가 있는 오래된 사진풍'
      },
      filterSections: ['기본 편집', '시간대', '분위기'],
      imageEditNote: '이미지 편집은 Canvas 기반의 간단한 시각 효과입니다. 하늘을 교체하거나 AI로 완전한 낮/밤 변환을 수행하지는 않으며, TRPG 배경의 분위기를 빠르게 조정하는 용도로 사용해 주세요.',
      tooltip: {
        webp: 'CCFOLIA에서 사용하기 쉬운 가벼운 움직이는 이미지로 출력합니다. 일반적으로 이 설정을 권장합니다.',
        webp30: 'WebP를 30FPS로 출력합니다. 움직임이 더 부드럽지만 파일 크기가 커질 수 있습니다.',
        webp60: 'WebP를 60FPS로 출력합니다. 가장 부드럽지만 파일 크기가 크게 증가할 수 있습니다.'
      },
      messages: {
        sizeLimit: bytes => `권장 제한: ${bytes} 미만`,
        sizeWarning: bytes => `경고: 출력 파일은 ${bytes}입니다. CCFOLIA 등의 5MB 업로드 제한을 초과할 수 있습니다. 화질, 이미지 크기 또는 재생 시간을 낮춘 뒤 다시 출력해 주세요.`,
        exportTooLarge: kind => `${kind} 출력이 완료되었지만 파일 크기가 너무 큽니다.\n설정을 변경한 뒤 다시 출력해 주세요.`,
        exportReady: kind => `${kind} 출력이 완료되었습니다. 다운로드할 수 있습니다.`,
        selectImage: '이미지 파일을 선택해 주세요.',
        imageLoadFailed: '이미지를 불러올 수 없습니다. 다른 파일을 사용해 주세요.',
        imagesLoadedTransition: (count, extra) => `${count}장의 이미지를 불러왔습니다. 전환 효과로 순서대로 변경할 수 있습니다.${extra}`,
        imageLoaded: extra => `이미지를 불러왔습니다. 효과를 선택해 미리볼 수 있습니다.${extra}`,
        autoLightQuality: ' 원본 이미지가 1MB 이상이므로 화질을 경량으로 자동 설정했습니다. 이미지 크기는 원본 비율입니다.',
        autoLightPresetQuality: label => ` 원본 이미지가 3MB 이상이므로 화질을 경량, 이미지 크기를 ${label}(으)로 자동 설정했습니다.`,
        autoMinimumQuality: label => ` 원본 이미지가 6MB 이상이므로 화질을 최소, 이미지 크기를 ${label}(으)로 자동 설정했습니다.`,
        autoStandardQuality: ' 원본 이미지가 1MB 미만이므로 화질을 표준으로 자동 설정했습니다. 이미지 크기는 원본 비율입니다.',
        sampleLoaded: '샘플 이미지를 불러왔습니다.',
        sampleFailedStatus: '샘플 이미지를 불러올 수 없습니다. assets/sample/sample_and_juliet.jpeg를 확인해 주세요.',
        sampleFailedToast: '샘플 이미지를 불러올 수 없습니다.',
        emptyImageInfo: '아직 이미지를 불러오지 않았습니다.',
        approxKb: kb => `약 ${kb.toLocaleString()} KB`,
        multiImageInfo: (count, w, h, kb, names, more) => `<strong>${count}장의 이미지를 불러옴</strong><br>첫 이미지: ${w} × ${h}px<br>합계 약 ${kb.toLocaleString()} KB<br><br>${names}${more}`,
        moreImages: count => `<br>…외 ${count}장`,
        noMotionPreview: '모션 없이 정지 이미지를 미리보기 중입니다.',
        noMotionSelected: extra => `모션이 선택되지 않았습니다. 정지 이미지로 미리보기 및 출력할 수 있습니다.${extra}`,
        imageReset: '이미지를 초기화했습니다.',
        transitionOrderChanged: (count, verb, extra) => `전환 순서를 변경했습니다. ${count}장의 이미지를 순서대로 ${verb}합니다.${extra}`,
        fadeOrderChanged: extra => `페이드 순서를 변경했습니다.${extra}`,
        fadeOrderHint: ' 썸네일을 드래그하면 페이드 인/아웃 방향을 변경할 수 있습니다.',
        transitionHintImages: (count, verb) => ` ${count}장의 이미지를 순서대로 ${verb}합니다. 한 번의 루프는 마지막 이미지까지 한 방향으로 진행됩니다.`,
        transitionHintSingleFilter: filter => ` 선택한 전환은 한 이미지를 원본에서 ${filter}(으)로 변경합니다.`,
        transitionHintNeedImages: ' 전환 효과에는 이미지가 최소 2장 필요합니다.',
        effectSelected: (effect, loop, hint, extra) => `${effect} 선택됨. 출력 설정: ${loop ? '반복' : '반복 없음'}.${hint}${extra}`,
        filterSelected: (filter, extra) => `이미지 편집: ${filter} 선택됨.${extra}`,
        needImage: '먼저 이미지를 불러와 주세요.',
        pngZipLibraryMissing: 'PNG 연속 이미지 ZIP 라이브러리를 불러올 수 없습니다. 네트워크 연결을 확인해 주세요.',
        pngZipStart: (frames, limit) => `PNG 연속 이미지 ZIP 생성 중... 0 / ${frames}프레임 / ${limit}`,
        pngZipProgress: (done, frames) => `PNG 연속 이미지 ZIP 생성 중... ${done} / ${frames}프레임`,
        pngZipComplete: (name, size, effect, seconds, quality, sizeLabel, warning) => `PNG 연속 이미지 ZIP 완료: ${name} / ${size} / ${effect} / ${seconds}초 / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        pngZipError: 'PNG 연속 이미지 ZIP 출력에 실패했습니다. 5MB 이내가 되도록 이미지 크기, 재생 시간 또는 화질을 낮춰 주세요.',
        webpStart: fpsLabel => fpsLabel ? `${fpsLabel} WebP 출력을 시작했습니다. 잠시 기다려 주세요.` : 'WebP 출력을 시작했습니다. 잠시 기다려 주세요.',
        webpProgressStart: (fpsLabel, frames, limit) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP 생성 중... 0 / ${frames}프레임 / ${limit}`,
        webpProgress: (fpsLabel, done, frames) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP 생성 중... ${done} / ${frames}프레임`,
        webpComplete: (fpsLabel, name, size, effect, loop, seconds, fps, quality, sizeLabel, warning) => `${fpsLabel ? `${fpsLabel} ` : ''}WebP 완료: ${name} / ${size} / ${effect} / ${loop ? '반복' : '반복 없음'} / ${seconds}초 / ${fps}FPS / ${quality} / ${sizeLabel}${warning ? ` / ${warning}` : ''}`,
        webpError: 'WebP 출력에 실패했습니다. 브라우저의 WebP 출력 지원 여부를 확인하고 이미지 크기, 화질 또는 재생 시간을 낮춘 뒤 다시 시도해 주세요.',
        downloadFirst: '먼저 이미지를 출력한 뒤 다운로드해 주세요.',
        downloadDone: '다운로드가 완료되었습니다.',
        webpPlaybackNote: '재생 환경에 따라 WebP 미리보기 속도가 실제보다 느리게 보일 수 있습니다. CCFOLIA 등 실제 사용 환경에서 재생을 확인하는 것을 권장합니다.',
        exportCancelling: '출력을 취소하는 중입니다. 잠시 기다려 주세요.',
        exportCancelled: '출력을 취소했습니다.',
        lightMode: '라이트 모드',
        darkMode: '나이트 모드',
        loop: '반복',
        noLoop: '반복 없음',
        original: '원본'
      },
      fadeFillLabels: {
        image: '이미지',
        fadeBlack: '검정',
        fadeWhite: '흰색',
        fadeTransparent: '투명'
      },
      transitionVerb: {
        transition: '크로스페이드',
        transitionHardcut: '하드 컷',
        transitionWipe: '와이프'
      }
    }
  };

  function getDefaultLanguage() {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ja' || saved === 'en' || saved === 'ko') return saved;
    const browserLang = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('ko')) return 'ko';
    return 'en';
  }

  function dict() {
    return i18n[state.lang] || i18n.ja;
  }

  function setText(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function applyLabelMaps() {
    const d = dict();
    Object.assign(effectLabels, d.effectLabels);
    Object.assign(effectFileLabels, d.effectFileLabels);
    Object.assign(imageFilterLabels, d.filterLabels);
    qualitySettings.minimum.label = d.quality.minimum;
    qualitySettings.light.label = d.quality.light;
    qualitySettings.standard.label = d.quality.standard;
    qualitySettings.high.label = d.quality.high;
  }

  function applyLanguage(lang, options = {}) {
    state.lang = ['ja', 'en', 'ko'].includes(lang) ? lang : 'ja';
    const d = dict();
    const s = d.staticText;

    document.documentElement.lang = d.htmlLang;
    document.body.dataset.lang = state.lang;
    document.title = d.documentTitle;
    applyLabelMaps();

    setText('.eyebrow', s.portalName);
    setText('.title-block h1', s.title);
    setText('.title-block .lead', s.lead);
    setText('.portal-link', s.portalLink);
    if (els.languageSwitcher) {
      const switcherLabel = state.lang === 'ja' ? '言語切替' : state.lang === 'ko' ? '언어 전환' : 'Language';
      els.languageSwitcher.setAttribute('aria-label', switcherLabel);
    }
    els.langButtons.forEach(button => {
      const active = button.dataset.langChoice === state.lang;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    els.helpBtn.textContent = s.help;
    els.shortcutBtn.textContent = s.shortcuts;
    setText('#helpDrawer h2', s.helpTitle);
    setText('#shortcutDrawer h2', s.shortcutTitle);
    document.querySelectorAll('[data-close-drawer]').forEach(button => button.setAttribute('aria-label', state.lang === 'ja' ? '閉じる' : state.lang === 'ko' ? '닫기' : 'Close'));

    document.querySelectorAll('#helpDrawer .guide-list p').forEach((p, index) => {
      if (d.helpSteps[index]) p.textContent = d.helpSteps[index];
    });
    document.querySelectorAll('#shortcutDrawer .shortcut-grid span').forEach((span, index) => {
      if (d.shortcutLabels[index]) span.textContent = d.shortcutLabels[index];
    });

    setText('.upload-panel .panel-heading h2', s.uploadTitle);
    setText('#dropZone strong', s.dropStrong);
    setText('#dropZone small', s.dropSmall);
    if (els.loadSampleBtn) els.loadSampleBtn.textContent = s.sampleButton;
    setText('.effects-panel .effects-heading-row h2', s.effectsTitle);
    els.motionTab.textContent = s.motionTab;
    els.imageEditTab.textContent = s.imageEditTab;
    els.effectGrid.setAttribute('aria-label', state.lang === 'ja' ? 'エフェクト一覧' : state.lang === 'ko' ? '효과 목록' : 'Effect list');
    document.querySelector('.effect-tabs')?.setAttribute('aria-label', state.lang === 'ja' ? 'エフェクト種別' : state.lang === 'ko' ? '효과 종류' : 'Effect type');

    document.querySelectorAll('.effect-card').forEach(card => {
      const key = card.dataset.effect;
      const strong = card.querySelector('strong');
      const small = card.querySelector('small');
      if (strong && d.effectLabels[key]) strong.textContent = d.effectLabels[key];
      if (small && d.effectSubLabels[key]) small.textContent = d.effectSubLabels[key];
    });

    document.querySelectorAll('#imageEditPanel .image-edit-section-title').forEach((title, index) => {
      if (d.filterSections[index]) title.textContent = d.filterSections[index];
    });
    document.querySelectorAll('.image-edit-card').forEach(card => {
      const key = card.dataset.filter;
      const span = card.querySelector('span');
      const small = card.querySelector('small');
      if (span && d.filterLabels[key]) span.textContent = d.filterLabels[key];
      if (small && d.filterDescriptions[key]) small.textContent = d.filterDescriptions[key];
    });
    setText('.image-edit-note', d.imageEditNote);

    setText('.preview-panel .panel-heading h2', s.previewTitle);
    if (els.canvasPlaceholder) els.canvasPlaceholder.textContent = s.placeholder;
    updateThumbPanelText();

    els.fileNameInput.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(s.fileName));
    els.secondsInput.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(s.seconds));
    els.qualityInput.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(s.qualityLabel));
    els.sizeInput.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(s.imageSize));
    els.loopInput.closest('label')?.querySelector('span')?.replaceChildren(document.createTextNode(s.loop));

    [...els.qualityInput.options].forEach(option => {
      if (d.quality[option.value]) option.textContent = d.quality[option.value];
    });
    refreshSizeInputLabels();

    els.playBtn.textContent = state.playing ? s.stop : s.play;
    els.exportWebpBtn.textContent = s.webp;
    els.exportWebp30Btn.textContent = s.webp30;
    if (els.exportWebp60Btn) els.exportWebp60Btn.textContent = s.webp60;

    els.exportWebpBtn.dataset.tooltip = d.tooltip.webp;
    els.exportWebp30Btn.dataset.tooltip = d.tooltip.webp30;
    if (els.exportWebp60Btn) els.exportWebp60Btn.dataset.tooltip = d.tooltip.webp60;
    els.exportWebpBtn.setAttribute('aria-label', `${s.webp}. ${d.tooltip.webp}`);
    els.exportWebp30Btn.setAttribute('aria-label', `${s.webp30}. ${d.tooltip.webp30}`);
    if (els.exportWebp60Btn) els.exportWebp60Btn.setAttribute('aria-label', `${s.webp60}. ${d.tooltip.webp60}`);

    els.downloadLink.textContent = s.download;
    els.clearOutputBtn.textContent = state.isExporting ? s.cancelExport : s.clear;
    updateQualityRecommendation();

    setText('.legal-footer h2', s.footerTitle);
    const footerParagraphs = document.querySelectorAll('.legal-footer p');
    if (footerParagraphs[0]) footerParagraphs[0].innerHTML = s.footer1.replace('@KumachanSteps', '<a href="https://x.com/KumachanSteps" target="_blank" rel="noopener noreferrer">@KumachanSteps</a>');
    if (footerParagraphs[1]) footerParagraphs[1].innerHTML = s.footer2.replace('@KumachanSteps', '<a href="https://x.com/KumachanSteps" target="_blank" rel="noopener noreferrer">@KumachanSteps</a>');

    syncThemeButton();
    updateOutputFileName();
    if (!state.imageFiles.length) updateImageInfo([]);
    if (!options.silent) setStatus('');
  }

  function switchLanguage(next) {
    if (!['ja', 'en', 'ko'].includes(next)) return;
    localStorage.setItem(LANG_STORAGE_KEY, next);
    applyLanguage(next);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getSeconds() {
    const value = Number.parseFloat(els.secondsInput.value);
    return clamp(Number.isFinite(value) ? value : 3, 0.5, 12);
  }

  function getEffectDefaultSeconds(effect) {
    switch (effect) {
      case 'quakeY2':
      case 'quakeX2':
      case 'quakeXY2':
        return 2.5;
      case 'panX':
        return 4;
      case 'spinFallBlack':
      case 'fadeBlack':
      case 'fadeWhite':
      case 'fadeTransparent':
        return 2;
      case 'rise':
      case 'descend':
        return 1.5;
      default:
        return 3;
    }
  }

  function getLoopDefault(effect) {
    return !['zoomIn', 'zoomInWhite', 'zoomInBlack', 'zoomOut', 'zoomOutWhite', 'zoomOutBlack', 'spinFallBlack', 'suckInWhite', 'suckInBlack', 'rise', 'descend', 'fadeBlack', 'fadeWhite', 'fadeTransparent'].includes(effect);
  }

  function formatFileSize(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb >= 9.95 ? 1 : 2)}MB`;
  }

  function getBlobSizeWarning(blob) {
    if (blob.size > MAX_OUTPUT_BYTES) {
      return dict().messages.sizeWarning(formatFileSize(blob.size));
    }
    return '';
  }

  function getSizeLimitLabel() {
    return dict().messages.sizeLimit(formatFileSize(MAX_OUTPUT_BYTES));
  }

  function buildFrameDelaySequence(totalFrames, totalDurationMs) {
    const frames = Math.max(1, Number(totalFrames) || 1);
    const durationMs = Math.max(frames, Math.round(Number(totalDurationMs) || 0));
    const baseDelay = Math.floor(durationMs / frames);
    let remainder = durationMs - (baseDelay * frames);
    const delays = new Array(frames).fill(baseDelay);
    for (let i = 0; i < frames && remainder > 0; i += 1, remainder -= 1) {
      delays[i] += 1;
    }
    return delays;
  }



  function getCurrentQualitySetting() {
    return qualitySettings[els.qualityInput.value] || qualitySettings.standard;
  }

  function getCurrentSizeCatalog() {
    const quality = getCurrentQualitySetting();
    return exportSizePresets.map(preset => {
      const dims = quality.sizeMap[preset.key];
      return {
        ...preset,
        width: dims.width,
        height: dims.height,
        label: `${preset.baseLabel}（${dims.width} × ${dims.height}）`
      };
    });
  }

  function getSizePresetByValue(value) {
    return getCurrentSizeCatalog().find(preset => preset.value === value) || null;
  }

  function refreshSizeInputLabels() {
    const selected = els.sizeInput.value;
    const catalog = getCurrentSizeCatalog();
    [...els.sizeInput.options].forEach(option => {
      if (option.value === 'original') {
        option.textContent = dict().messages.original;
        return;
      }
      const preset = catalog.find(item => item.value === option.value);
      if (preset) option.textContent = preset.label;
    });
    els.sizeInput.value = selected;
  }


  function pickRecommendedSizePreset(sourceW, sourceH) {
    if (!sourceW || !sourceH) return null;
    const sourceAspect = sourceW / sourceH;
    const sourceArea = sourceW * sourceH;

    const candidates = getCurrentSizeCatalog().map(preset => {
      const aspect = preset.width / preset.height;
      const area = preset.width * preset.height;
      const aspectDiff = Math.abs(aspect - sourceAspect);
      const upscalePenalty = area > sourceArea ? 5 : 0;
      const areaPenalty = Math.abs(area - Math.min(sourceArea, 1024 * 1024)) / (1024 * 1024);
      return { ...preset, score: aspectDiff * 10 + areaPenalty + upscalePenalty };
    }).sort((a, b) => a.score - b.score);

    return candidates[0] || getCurrentSizeCatalog()[0] || null;
  }

  function applyRecommendedOutputSettingsForFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return { recommendedSize: null, autoQuality: null, maxFileSize: 0 };
    const maxFileSize = list.reduce((max, file) => Math.max(max, file?.size || 0), 0);
    const result = { recommendedSize: null, autoQuality: null, maxFileSize };
    const preset = pickRecommendedSizePreset(state.imageWidth, state.imageHeight);

    els.sizeInput.value = 'original';

    if (maxFileSize >= AUTO_MINIMUM_FILE_BYTES) {
      result.autoQuality = 'minimum';
      els.qualityInput.value = 'minimum';
      if (preset) {
        els.sizeInput.value = preset.value;
        result.recommendedSize = preset;
      }
      return result;
    }

    if (maxFileSize >= AUTO_PRESET_FILE_BYTES) {
      result.autoQuality = 'light';
      els.qualityInput.value = 'light';
      if (preset) {
        els.sizeInput.value = preset.value;
        result.recommendedSize = preset;
      }
      return result;
    }

    if (maxFileSize >= AUTO_LIGHT_FILE_BYTES) {
      result.autoQuality = 'light';
      els.qualityInput.value = 'light';
      return result;
    }

    result.autoQuality = 'standard';
    els.qualityInput.value = 'standard';
    return result;
  }




  function showToast(message, type = 'info', duration = 3600) {
    if (!els.toastHost) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
    toast.textContent = message;
    els.toastHost.appendChild(toast);

    window.requestAnimationFrame(() => toast.classList.add('is-visible'));

    const timeout = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      window.setTimeout(() => toast.remove(), 500);
    }, duration);

    toast.addEventListener('click', () => {
      window.clearTimeout(timeout);
      toast.classList.remove('is-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    });
  }

  function showExportSizeToast(kind, blob) {
    if (blob && blob.size > MAX_OUTPUT_BYTES) {
      showToast(dict().messages.exportTooLarge(kind), 'warning', 7200);
      return;
    }
    showToast(dict().messages.exportReady(kind), 'success', 4400);
  }

  function getOriginalBaseName() {
    return sanitizeFileName(state.sourceBaseName || 'haikei_motion');
  }

  function buildOutputBaseName() {
    const original = getOriginalBaseName();
    const effectName = sanitizeFileName(effectFileLabels[state.effect] || effectLabels[state.effect] || 'motion');
    const filterName = sanitizeFileName(imageFilterLabels[state.imageFilter] || dict().filterLabels.none);
    const loopName = els.loopInput.checked ? dict().messages.loop : dict().messages.noLoop;
    return sanitizeFileName(`${original}_${effectName}_${filterName}_${loopName}`);
  }

  function updateOutputFileName() {
    els.fileNameInput.value = buildOutputBaseName();
  }

  function sanitizeFileName(name) {
    const fallback = 'haikei_motion';
    return (name || fallback)
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_') || fallback;
  }

  function setStatus(message) {
    els.exportStatus.textContent = message || '';
    requestPreviewPanelLayoutSync();
  }


  function getQualityRecommendationText() {
    const quality = els.qualityInput.value;
    return quality === 'standard' || quality === 'high' ? dict().qualityRecommendation : '';
  }

  function updateQualityRecommendation() {
    if (!els.exportNote) return;
    els.exportNote.textContent = dict().exportNote;
  }

  function isTransitionEffect(effect = state.effect) {
    return ['transition', 'transitionHardcut', 'transitionWipe'].includes(effect);
  }

  function isFadeEffect(effect = state.effect) {
    return ['fadeBlack', 'fadeWhite', 'fadeTransparent'].includes(effect);
  }

  function isTransparentFadeEffect(effect = state.effect) {
    return effect === 'fadeTransparent';
  }

  function normalizeFadeOrder() {
    if (!Array.isArray(state.fadeOrder) || state.fadeOrder.length !== 2 || !state.fadeOrder.includes('image') || !state.fadeOrder.includes('fill')) {
      state.fadeOrder = ['image', 'fill'];
    }
    return state.fadeOrder;
  }

  function getFadeFillColor(effect = state.effect) {
    if (effect === 'fadeWhite') return '#ffffff';
    if (effect === 'fadeBlack') return '#000000';
    return null;
  }

  function getFadeFillLabel(effect = state.effect) {
    return dict().fadeFillLabels?.[effect] || effect;
  }

  function getFadeMotionAlphas(progress) {
    const mix = smootherStep(progress);
    const order = normalizeFadeOrder();
    const imageFirst = order[0] === 'image';
    return {
      imageAlpha: imageFirst ? 1 - mix : mix,
      fillAlpha: imageFirst ? mix : 1 - mix
    };
  }

  function stabilizeTransparentFadeAlphas(imageAlpha, fillAlpha, progress) {
    const fadeOut = normalizeFadeOrder()[0] === 'image';
    const endSnapThreshold = 0.985;
    let nextImageAlpha = imageAlpha;
    let nextFillAlpha = fillAlpha;

    if (fadeOut) {
      if (progress >= endSnapThreshold) {
        return { imageAlpha: 0, fillAlpha: 1 };
      }
      if (nextImageAlpha <= 0.06) nextImageAlpha = 0;
      else if (nextImageAlpha >= 0.995) nextImageAlpha = 1;
      if (nextFillAlpha <= 0.005) nextFillAlpha = 0;
      else if (nextFillAlpha >= 0.94) nextFillAlpha = 1;
    } else {
      if (progress >= endSnapThreshold) {
        return { imageAlpha: 1, fillAlpha: 0 };
      }
      if (nextImageAlpha <= 0.005) nextImageAlpha = 0;
      else if (nextImageAlpha >= 0.94) nextImageAlpha = 1;
      if (nextFillAlpha <= 0.06) nextFillAlpha = 0;
      else if (nextFillAlpha >= 0.995) nextFillAlpha = 1;
    }

    return {
      imageAlpha: Math.max(0, Math.min(1, nextImageAlpha)),
      fillAlpha: Math.max(0, Math.min(1, nextFillAlpha))
    };
  }

  function updateThumbPanelText() {
    const s = dict().staticText;
    const isFade = isFadeEffect(state.effect);
    setText('.transition-thumb-head strong', isFade ? s.fadeOrder : s.transitionOrder);
    setText('.transition-thumb-head span', isFade ? s.fadeHint : s.transitionHint);
    els.transitionThumbList?.setAttribute('aria-label', isFade
      ? (state.lang === 'ja' ? 'フェード順サムネイル' : state.lang === 'ko' ? '페이드 순서 썸네일' : 'Fade order thumbnails')
      : (state.lang === 'ja' ? 'トランジション順サムネイル' : state.lang === 'ko' ? '전환 순서 썸네일' : 'Transition order thumbnails'));
  }

  function getTransitionVerb(effect = state.effect) {
    return dict().transitionVerb[effect] || dict().transitionVerb.transition;
  }

  function setEffectSelectionStatus() {
    const messages = dict().messages;
    const orderHint = isTransitionEffect(state.effect)
      ? (state.images.length >= 2
          ? messages.transitionHintImages(state.images.length, getTransitionVerb(state.effect))
          : (shouldUseSingleImageFilterTransition()
              ? messages.transitionHintSingleFilter(imageFilterLabels[state.imageFilter])
              : messages.transitionHintNeedImages))
      : (isFadeEffect(state.effect) && state.image ? messages.fadeOrderHint : '');
    setStatus(messages.effectSelected(effectLabels[state.effect], els.loopInput.checked, orderHint, getQualityRecommendationText()));
  }


  function hideDownload() {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    if (state.stillDownloadUrl) URL.revokeObjectURL(state.stillDownloadUrl);
    state.downloadUrl = '';
    state.downloadName = '';
    state.stillDownloadUrl = '';
    state.stillDownloadName = '';
    els.downloadLink.classList.add('is-disabled');
    els.downloadLink.setAttribute('aria-disabled', 'true');
  }


  function clearOutputDisplay() {
    hideDownload();
    setStatus('');
    drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    return true;
  }

  function stopPreview() {
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.playing = false;
    state.rafId = null;
    state.playStart = 0;
    els.playBtn.textContent = dict().staticText.play;
  }

  function resetImage(triggerType = 'button') {
    stopPreview();
    hideDownload();
    state.image = null;
    state.images = [];
    state.imageFiles = [];
    state.imageName = '';
    state.sourceBaseName = '';
    state.imageWidth = 0;
    state.imageHeight = 0;
    state.stillFrameTime = 0;
    state.imageFilter = 'none';
    state.draggedThumbIndex = null;
    state.fadeOrder = ['image', 'fill'];
    state.sourceHasTransparency = false;
    state.lastOutputAnalytics = null;
    analytics?.resetOutputTracking();
    if (els.imageEditGrid) {
      [...els.imageEditGrid.querySelectorAll('.image-edit-card')].forEach(card => card.classList.toggle('is-active', card.dataset.filter === 'none'));
    }
    els.fileInput.value = '';
    els.fileNameInput.value = 'haikei_motion';
    els.canvasPlaceholder.classList.remove('is-hidden');
    els.imageInfo.innerHTML = `<p class="empty-note">${dict().messages.emptyImageInfo}</p>`;
    updateTransitionThumbs();
    updateTransitionThumbs();
    syncPreviewCanvasSize();
    drawFrame(0, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    setStatus(dict().messages.imageReset);
    analytics?.sendReset({ reset_scope: 'all', trigger_type: triggerType });
    return true;
  }

  function toggleDrawer(drawer) {
    const willOpen = drawer.hidden;
    els.helpDrawer.hidden = true;
    els.shortcutDrawer.hidden = true;
    drawer.hidden = !willOpen;
  }

  function closeDrawers() {
    els.helpDrawer.hidden = true;
    els.shortcutDrawer.hidden = true;
    return true;
  }

  function syncPreviewCanvasSize() {
    const rect = els.previewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    const nextWidth = Math.max(320, Math.round(rect.width * dpr));
    const nextHeight = Math.max(180, Math.round(rect.height * dpr));

    if (els.previewCanvas.width !== nextWidth || els.previewCanvas.height !== nextHeight) {
      els.previewCanvas.width = nextWidth;
      els.previewCanvas.height = nextHeight;
      drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    }
  }

  function makeThumbDataUrl(image, width = 104, height = 58) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const thumbCtx = canvas.getContext('2d');
    thumbCtx.imageSmoothingEnabled = true;
    thumbCtx.imageSmoothingQuality = 'high';
    thumbCtx.fillStyle = '#000';
    thumbCtx.fillRect(0, 0, width, height);
    const naturalW = image.naturalWidth || image.width || width;
    const naturalH = image.naturalHeight || image.height || height;
    const ratio = Math.max(width / naturalW, height / naturalH);
    const drawW = naturalW * ratio;
    const drawH = naturalH * ratio;
    thumbCtx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  function shouldShowTransitionThumbs() {
    return (isTransitionEffect(state.effect) && state.images && state.images.length >= 2)
      || (isFadeEffect(state.effect) && Boolean(state.image));
  }

  function shouldUseSingleImageFilterTransition(effect = state.effect) {
    const imageCount = state.images?.length || (state.image ? 1 : 0);
    return isTransitionEffect(effect) && imageCount === 1 && state.imageFilter && state.imageFilter !== 'none';
  }

  function updateTransitionThumbs() {
    if (!els.transitionThumbPanel || !els.transitionThumbList) return;
    updateThumbPanelText();
    const show = shouldShowTransitionThumbs();
    els.transitionThumbPanel.hidden = !show;
    els.transitionThumbPanel.classList.toggle('is-visible', show);
    if (!show) {
      els.transitionThumbList.innerHTML = '';
      requestPreviewPanelLayoutSync();
      return;
    }

    if (isFadeEffect(state.effect)) {
      const order = normalizeFadeOrder();
      const file = state.imageFiles[0];
      const imageName = escapeHtml(file?.name || state.imageName || 'image');
      const imageSrc = makeThumbDataUrl(state.image, 150, 84);
      const fillLabel = escapeHtml(getFadeFillLabel(state.effect));
      els.transitionThumbList.innerHTML = order.map((kind, index) => {
        const isImage = kind === 'image';
        const title = isImage ? imageName : fillLabel;
        const visual = isImage
          ? `<img src="${imageSrc}" alt="${title}" draggable="false" />`
          : `<span class="fade-thumb-fill ${state.effect === 'fadeBlack' ? 'fade-thumb-black' : state.effect === 'fadeWhite' ? 'fade-thumb-white' : 'fade-thumb-transparent'}" aria-hidden="true"></span>`;
        return `
          <button class="transition-thumb-card" type="button" draggable="true" data-index="${index}" title="${title}">
            <span class="thumb-order">${index + 1}</span>
            ${visual}
            <span class="thumb-name">${title}</span>
          </button>
        `;
      }).join('');
      requestPreviewPanelLayoutSync();
      return;
    }

    els.transitionThumbList.innerHTML = state.images.map((image, index) => {
      const file = state.imageFiles[index];
      const name = escapeHtml(file?.name || `image_${index + 1}`);
      const src = makeThumbDataUrl(image, 150, 84);
      return `
        <button class="transition-thumb-card" type="button" draggable="true" data-index="${index}" title="${name}">
          <span class="thumb-order">${index + 1}</span>
          <img src="${src}" alt="${name}" draggable="false" />
          <span class="thumb-name">${name}</span>
        </button>
      `;
    }).join('');
    requestPreviewPanelLayoutSync();
  }

  function reorderTransitionImages(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    if (isFadeEffect(state.effect)) {
      const order = normalizeFadeOrder();
      if (fromIndex >= order.length || toIndex >= order.length) return;
      const [item] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, item);
      state.fadeOrder = order;
      updateTransitionThumbs();
      drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
      hideDownload();
      setStatus(dict().messages.fadeOrderChanged(getQualityRecommendationText()));
      analytics?.markInputChanged();
      analytics?.sendFeature('frame_order', 'fade_order', 'reorder', state.fadeOrder[0] === 'image' ? 'image_to_fill' : 'fill_to_image');
      return;
    }

    if (fromIndex >= state.images.length || toIndex >= state.images.length) return;

    const [image] = state.images.splice(fromIndex, 1);
    state.images.splice(toIndex, 0, image);
    const [file] = state.imageFiles.splice(fromIndex, 1);
    state.imageFiles.splice(toIndex, 0, file);
    state.image = state.images[0] || null;
    state.imageWidth = state.image?.naturalWidth || 0;
    state.imageHeight = state.image?.naturalHeight || 0;
    updateImageInfo(state.imageFiles);
    updateTransitionThumbs();
    drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    hideDownload();
    setStatus(dict().messages.transitionOrderChanged(state.images.length, getTransitionVerb(state.effect), getQualityRecommendationText()));
    analytics?.markInputChanged();
    analytics?.sendFeature('frame_order', 'transition_order', 'reorder', 'uploaded_sequence');
  }

  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !String(file.type || '').startsWith('image/')) {
        reject(new Error('invalid-image'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ file, img });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`load-failed:${file.name || ''}`));
      };
      img.src = url;
    });
  }

  function detectImageTransparency(images) {
    return images.some(image => {
      try {
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 48;
        sampleCanvas.height = 48;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        sampleCtx.clearRect(0, 0, 48, 48);
        sampleCtx.drawImage(image, 0, 0, 48, 48);
        const pixels = sampleCtx.getImageData(0, 0, 48, 48).data;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 250) return true;
        }
      } catch (_) {
        return false;
      }
      return false;
    });
  }

  function getByteBucket(bytes) {
    if (bytes < 500 * 1024) return 'under_500kb';
    if (bytes < 1 * 1024 * 1024) return '500kb_to_1mb';
    if (bytes < 3 * 1024 * 1024) return '1mb_to_3mb';
    if (bytes < 6 * 1024 * 1024) return '3mb_to_6mb';
    if (bytes < 10 * 1024 * 1024) return '6mb_to_10mb';
    return 'over_10mb';
  }

  function getOutputByteBucket(bytes) {
    if (bytes < 1 * 1024 * 1024) return 'under_1mb';
    if (bytes < 3 * 1024 * 1024) return '1mb_to_3mb';
    if (bytes < 4 * 1024 * 1024) return '3mb_to_4mb';
    if (bytes < 5 * 1024 * 1024) return '4mb_to_5mb';
    if (bytes < 6 * 1024 * 1024) return '5mb_to_6mb';
    if (bytes < 8 * 1024 * 1024) return '6mb_to_8mb';
    if (bytes < 10 * 1024 * 1024) return '8mb_to_10mb';
    return 'over_10mb';
  }

  function getMegapixelBucket(width, height) {
    const megapixels = (Math.max(0, width) * Math.max(0, height)) / 1000000;
    if (megapixels < 1) return 'under_1mp';
    if (megapixels < 2) return '1mp_to_2mp';
    if (megapixels < 4) return '2mp_to_4mp';
    if (megapixels < 8) return '4mp_to_8mp';
    if (megapixels < 16) return '8mp_to_16mp';
    return 'over_16mp';
  }

  function getDurationBucket(seconds) {
    if (seconds < 1) return 'under_1_sec';
    if (seconds < 2) return '1_to_2_sec';
    if (seconds < 3) return '2_to_3_sec';
    if (seconds < 5) return '3_to_5_sec';
    if (seconds < 8) return '5_to_8_sec';
    return 'over_8_sec';
  }

  function getOutputSizeAnalyticsId() {
    const value = String(els.sizeInput.value || 'original');
    if (value === 'original') return 'original';
    const preset = getSizePresetByValue(value);
    return preset ? preset.key.replace(':', '_') : 'custom';
  }

  function getSourceFormatGroup(files) {
    const formats = new Set(Array.from(files || []).map(file => {
      const type = String(file?.type || '').toLowerCase();
      if (type.includes('png')) return 'png';
      if (type.includes('jpeg') || type.includes('jpg')) return 'jpeg';
      if (type.includes('webp')) return 'webp';
      return 'other';
    }));
    if (formats.size === 1) return [...formats][0];
    return formats.size > 1 ? 'mixed' : 'unknown';
  }

  function toAnalyticsId(value) {
    return String(value || 'none')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'none';
  }

  function getRatioBucket(outputBytes, sourceBytes) {
    if (!sourceBytes) return 'unknown';
    const ratio = outputBytes / sourceBytes;
    if (ratio < 0.5) return 'under_0_5x';
    if (ratio < 1) return '0_5x_to_1x';
    if (ratio < 2) return '1x_to_2x';
    if (ratio < 4) return '2x_to_4x';
    return 'over_4x';
  }

  function getOverageRatioBucket(outputBytes) {
    const ratio = outputBytes / MAX_OUTPUT_BYTES;
    if (ratio < 1) return 'under_limit';
    if (ratio < 1.1) return '100_to_110_percent';
    if (ratio < 1.25) return '110_to_125_percent';
    if (ratio < 1.5) return '125_to_150_percent';
    if (ratio < 2) return '150_to_200_percent';
    return 'over_200_percent';
  }

  async function loadFiles(fileList, importType = 'image_upload') {
    const files = Array.from(fileList || []).filter(file => file && String(file.type || '').startsWith('image/'));
    if (!files.length) {
      setStatus(dict().messages.selectImage);
      analytics?.sendImport({ import_type: importType, file_type: 'image', item_count: 0, import_success: false });
      analytics?.sendError({ error_code: 'no_valid_image', error_stage: 'image_import', feature_id: 'image_import', recoverable: true });
      return;
    }

    try {
      const loaded = await Promise.all(files.map(loadImageFile));
      state.images = loaded.map(entry => entry.img);
      state.imageFiles = loaded.map(entry => entry.file);
      state.sourceHasTransparency = detectImageTransparency(state.images);
      state.lastOutputAnalytics = null;
      analytics?.resetOutputTracking();
state.image = state.images[0] || null;
      state.imageName = loaded.length === 1 ? loaded[0].file.name : `${loaded[0].file.name.replace(/\.[^/.]+$/, '')}_and_${loaded.length - 1}_more`;
      state.sourceBaseName = loaded.length === 1
        ? loaded[0].file.name.replace(/\.[^/.]+$/, '')
        : `${loaded[0].file.name.replace(/\.[^/.]+$/, '')}_and_${loaded.length - 1}_more`;
      state.imageWidth = state.image?.naturalWidth || 0;
      state.imageHeight = state.image?.naturalHeight || 0;
      state.stillFrameTime = 0;
      state.fadeOrder = ['image', 'fill'];

      const autoSettings = applyRecommendedOutputSettingsForFiles(state.imageFiles);
      const recommendedSize = autoSettings.recommendedSize;
      updateOutputFileName();
      els.canvasPlaceholder.classList.add('is-hidden');
      updateImageInfo(state.imageFiles);
      updateTransitionThumbs();
      updateTransitionThumbs();
      syncPreviewCanvasSize();
      drawFrame(0, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
      const autoMessages = autoSettings.autoQuality === 'minimum'
        ? dict().messages.autoMinimumQuality(autoSettings.recommendedSize ? autoSettings.recommendedSize.label : dict().messages.original)
        : autoSettings.autoQuality === 'light' && autoSettings.recommendedSize
          ? dict().messages.autoLightPresetQuality(autoSettings.recommendedSize.label)
          : autoSettings.autoQuality === 'light'
            ? dict().messages.autoLightQuality
            : autoSettings.autoQuality === 'standard'
              ? dict().messages.autoStandardQuality
              : '';
      setStatus(loaded.length >= 2
        ? dict().messages.imagesLoadedTransition(loaded.length, autoMessages)
        : dict().messages.imageLoaded(autoMessages));
      hideDownload();
      analytics?.markInputStarted({ input_type: 'image', input_method: importType });
      analytics?.markInputChanged();
      analytics?.sendImport({ import_type: importType, file_type: 'image', item_count: loaded.length, import_success: true });
      analytics?.sendFeature('auto_output_setting', 'auto_output_setting', 'apply', autoSettings.autoQuality || 'standard');
    } catch (error) {
      console.error(error);
      setStatus(dict().messages.imageLoadFailed);
      analytics?.sendImport({ import_type: importType, file_type: 'image', item_count: files.length, import_success: false });
      analytics?.sendError({ error_code: 'image_load_failed', error_stage: 'image_import', feature_id: 'image_import', recoverable: true });
    }
  }

  function loadImageFromUrl(src, name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          img,
          file: {
            name,
            type: 'image/jpeg',
            size: 0
          }
        });
      };
      img.onerror = () => reject(new Error(`Sample image could not be loaded: ${src}`));
      img.src = src;
    });
  }

  async function loadSampleImageForDev() {
    let importedByLoadFiles = false;
    try {
      let file;
      try {
        const response = await fetch(DEV_SAMPLE_IMAGE_PATH);
        if (!response.ok) throw new Error(`Sample fetch failed: ${response.status}`);
        const blob = await response.blob();
        file = new File([blob], DEV_SAMPLE_IMAGE_NAME, { type: blob.type || 'image/jpeg' });
        await loadFiles([file], 'sample_image');
        importedByLoadFiles = true;
      } catch (fetchError) {
        console.warn('Sample fetch failed; falling back to image element loading:', fetchError);
        const loaded = await loadImageFromUrl(DEV_SAMPLE_IMAGE_PATH, DEV_SAMPLE_IMAGE_NAME);
        state.images = [loaded.img];
        state.imageFiles = [loaded.file];
        state.sourceHasTransparency = detectImageTransparency([loaded.img]);
        state.lastOutputAnalytics = null;
        analytics?.resetOutputTracking();
        state.image = loaded.img;
        state.imageName = DEV_SAMPLE_IMAGE_NAME;
        state.sourceBaseName = DEV_SAMPLE_IMAGE_NAME.replace(/\.[^/.]+$/, '');
        state.imageWidth = loaded.img.naturalWidth || loaded.img.width || 0;
        state.imageHeight = loaded.img.naturalHeight || loaded.img.height || 0;
        state.stillFrameTime = 0;
        applyRecommendedOutputSettingsForFiles(state.imageFiles);
        updateOutputFileName();
        els.canvasPlaceholder.classList.add('is-hidden');
        updateImageInfo(state.imageFiles);
        updateTransitionThumbs();
        syncPreviewCanvasSize();
        drawFrame(0, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
        hideDownload();
      }
      if (!importedByLoadFiles) {
        analytics?.markInputStarted({ input_type: 'image', input_method: 'sample_image' });
        analytics?.markInputChanged();
        analytics?.sendImport({ import_type: 'sample_image', file_type: 'image', item_count: 1, import_success: true });
      }
      setStatus(dict().messages.sampleLoaded);
    } catch (error) {
      console.warn('Sample image could not be loaded:', error);
      setStatus(dict().messages.sampleFailedStatus);
      showToast(dict().messages.sampleFailedToast, 'warning', 4200);
      analytics?.sendImport({ import_type: 'sample_image', file_type: 'image', item_count: 0, import_success: false });
      analytics?.sendError({ error_code: 'sample_load_failed', error_stage: 'sample_import', feature_id: 'sample_image', recoverable: true });
    }
  }

  function updateImageInfo(files) {
    const list = Array.from(files || []);
    const messages = dict().messages;
    if (!list.length) {
      els.imageInfo.innerHTML = `<p class="empty-note">${messages.emptyImageInfo}</p>`;
      updateTransitionThumbs();
      return;
    }

    const totalKb = Math.max(1, Math.round(list.reduce((sum, file) => sum + (file.size || 0), 0) / 1024));
    if (list.length === 1) {
      const file = list[0];
      els.imageInfo.innerHTML = `
        <strong>${escapeHtml(file.name)}</strong><br>
        ${state.imageWidth} × ${state.imageHeight}px<br>
        ${messages.approxKb(totalKb)}
      `;
      return;
    }

    const previewNames = list.slice(0, 3).map(file => escapeHtml(file.name)).join('<br>');
    const moreLabel = list.length > 3 ? messages.moreImages(list.length - 3) : '';
    els.imageInfo.innerHTML = messages.multiImageInfo(list.length, state.imageWidth, state.imageHeight, totalKb, previewNames, moreLabel);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function smootherStep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function getTransitionPair(progress) {
    const images = state.images && state.images.length ? state.images : (state.image ? [state.image] : []);
    if (!images.length) {
      return { current: null, next: null, mix: 0, index: 0, nextIndex: 0 };
    }
    if (images.length === 1) {
      return {
        current: images[0],
        next: images[0],
        mix: shouldUseSingleImageFilterTransition() ? smootherStep(progress) : 0,
        index: 0,
        nextIndex: 0,
        singleFilterTransition: shouldUseSingleImageFilterTransition()
      };
    }

    // v0.97: one transition loop is one-way through the uploaded order.
    // 2 images: A -> B, not A -> B -> A.
    // 3 images: A -> B -> C, not A -> B -> C -> A.
    const segmentCount = Math.max(1, images.length - 1);
    const clampedProgress = Math.min(Math.max(progress, 0), 1);

    if (clampedProgress >= 1) {
      const lastIndex = images.length - 1;
      return {
        current: images[lastIndex - 1],
        next: images[lastIndex],
        mix: 1,
        index: lastIndex - 1,
        nextIndex: lastIndex
      };
    }

    const raw = clampedProgress * segmentCount;
    const index = Math.min(segmentCount - 1, Math.floor(raw));
    const local = raw - index;
    const nextIndex = Math.min(images.length - 1, index + 1);

    return {
      current: images[index],
      next: images[nextIndex],
      mix: smootherStep(local),
      index,
      nextIndex
    };
  }

  function getMotion(effect, progress) {
    const eased = easeInOut(progress);
    const t = progress * Math.PI * 2;
    const loopWave = Math.sin(t);
    const breath = (1 - Math.cos(t)) / 2;

    const motion = { x: 0, y: 0, scale: 1, rotate: 0, overlay: null, overlayAlpha: 0, mode: null, amount: 0, cropScale: 1 };

    switch (effect) {
      case 'quakeY':
        motion.y = loopWave * 14 + Math.sin(progress * Math.PI * 18) * 4;
        motion.scale = 1.035;
        break;
      case 'quakeX':
        motion.x = loopWave * 16 + Math.sin(progress * Math.PI * 20) * 5;
        motion.scale = 1.035;
        break;
      case 'quakeXY':
        motion.x = Math.sin(t * 4) * 10 + Math.sin(t * 9) * 4;
        motion.y = Math.cos(t * 3) * 8 + Math.sin(t * 7) * 3;
        motion.rotate = Math.sin(t * 3) * 0.012;
        motion.scale = 1.055;
        break;
      case 'quakeY2':
        motion.y = loopWave * 14 + Math.sin(progress * Math.PI * 18) * 4;
        motion.mode = 'shakeNoZoom';
        break;
      case 'quakeX2':
        motion.x = loopWave * 16 + Math.sin(progress * Math.PI * 20) * 5;
        motion.mode = 'shakeNoZoom';
        break;
      case 'quakeXY2':
        motion.x = Math.sin(t * 4) * 10 + Math.sin(t * 9) * 4;
        motion.y = Math.cos(t * 3) * 8 + Math.sin(t * 7) * 3;
        motion.rotate = Math.sin(t * 3) * 0.012;
        motion.mode = 'shakeNoZoom';
        break;
      case 'drunk':
        motion.x = Math.sin(t) * 7 + Math.sin(t * 2 + 0.6) * 2.5;
        motion.y = Math.cos(t - 0.4) * 5 + Math.sin(t * 3) * 1.8;
        motion.rotate = Math.sin(t - 0.8) * 0.018;
        motion.mode = 'shakeNoZoom';
        break;
      case 'breathe':
        motion.scale = 1 + breath * 0.04;
        motion.y = -breath * 2;
        break;
      case 'panX':
        motion.x = Math.sin(t) * 54;
        motion.mode = 'shakeNoZoom';
        break;
      case 'wave':
        motion.scale = 1.05;
        motion.mode = 'wave';
        motion.amount = progress;
        break;
      case 'fadeBlack':
      case 'fadeWhite':
      case 'fadeTransparent': {
        let fade = getFadeMotionAlphas(progress);
        if (effect === 'fadeTransparent') {
          fade = stabilizeTransparentFadeAlphas(fade.imageAlpha, fade.fillAlpha, progress);
        }
        motion.mode = 'fadeFill';
        motion.imageAlpha = fade.imageAlpha;
        motion.fillAlpha = fade.fillAlpha;
        motion.fillColor = getFadeFillColor(effect);
        motion.scale = 1;
        motion.cropScale = 1;
        motion.progress = progress;
        break;
      }
      case 'transition': {
        const pair = getTransitionPair(progress);
        motion.mode = 'transition';
        motion.currentImage = pair.current;
        motion.nextImage = pair.next;
        motion.mix = pair.mix;
        motion.scale = 1.01;
        motion.cropScale = 1.02;
        break;
      }
      case 'transitionHardcut': {
        const pair = getTransitionPair(progress);
        motion.mode = 'transitionHardcut';
        motion.currentImage = pair.current;
        motion.nextImage = pair.next;
        motion.mix = pair.mix;
        motion.scale = 1.01;
        motion.cropScale = 1.02;
        break;
      }
      case 'transitionWipe': {
        const pair = getTransitionPair(progress);
        motion.mode = 'transitionWipe';
        motion.currentImage = pair.current;
        motion.nextImage = pair.next;
        motion.mix = pair.mix;
        motion.scale = 1.01;
        motion.cropScale = 1.02;
        break;
      }
      case 'spinFallBlack':
        motion.scale = 1.02;
        motion.cropScale = 1 - eased * 0.78;
        motion.rotate = eased * 1.18;
        motion.y = eased * 52;
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'suckInWhite':
        motion.scale = 1 + eased * 0.52;
        motion.rotate = eased * 0.20;
        motion.overlay = '#ffffff';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'suckInBlack':
        motion.scale = 1 + eased * 0.52;
        motion.rotate = eased * 0.20;
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'rise':
        motion.y = -eased * 130;
        motion.mode = 'shakeNoZoom';
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'descend':
        motion.y = eased * 130;
        motion.mode = 'shakeNoZoom';
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'zoomIn':
        motion.scale = 1 + eased * 0.30;
        break;
      case 'zoomInWhite':
        motion.scale = 1 + eased * 0.34;
        motion.overlay = '#ffffff';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'zoomInBlack':
        motion.scale = 1 + eased * 0.34;
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'zoomOut':
        motion.scale = 1.34 - eased * 0.34;
        break;
      case 'zoomOutWhite':
        motion.scale = 1.36 - eased * 0.36;
        motion.overlay = '#ffffff';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      case 'zoomOutBlack':
        motion.scale = 1.36 - eased * 0.36;
        motion.overlay = '#000000';
        motion.overlayAlpha = fadeEnd(progress);
        break;
      default:
        break;
    }

    return motion;
  }

  function getEffectBounds(effect) {
    switch (effect) {
      case 'quakeY':
        return { maxScale: 1.035, maxX: 0, maxY: 18, padding: 0 };
      case 'quakeX':
        return { maxScale: 1.035, maxX: 21, maxY: 0, padding: 0 };
      case 'quakeXY':
        return { maxScale: 1.055, maxX: 18, maxY: 14, padding: 0 };
      case 'quakeY2':
        return { maxScale: 1.0, maxX: 0, maxY: 18, padding: 0 };
      case 'quakeX2':
        return { maxScale: 1.0, maxX: 21, maxY: 0, padding: 0 };
      case 'quakeXY2':
        return { maxScale: 1.0, maxX: 18, maxY: 14, padding: 0 };
      case 'drunk':
        return { maxScale: 1.0, maxX: 12, maxY: 9, padding: 0 };
      case 'breathe':
        return { maxScale: 1.04, maxX: 0, maxY: 2, padding: 0 };
      case 'panX':
        return { maxScale: 1.0, maxX: 58, maxY: 0, padding: 0 };
      case 'wave':
        return { maxScale: 1.05, maxX: 18, maxY: 0, padding: 0 };
      case 'transition':
      case 'transitionHardcut':
      case 'transitionWipe':
        return { maxScale: 1.03, maxX: 0, maxY: 0, padding: 0 };
      case 'spinFallBlack':
        return { maxScale: 1.02, maxX: 0, maxY: 54, padding: 0 };
      case 'suckInWhite':
      case 'suckInBlack':
        return { maxScale: 1.52, maxX: 0, maxY: 0, padding: 0 };
      case 'rise':
      case 'descend':
        return { maxScale: 1.0, maxX: 0, maxY: 145, padding: 0 };
      case 'zoomIn':
        return { maxScale: 1.30, maxX: 0, maxY: 0, padding: 0 };
      case 'zoomInWhite':
      case 'zoomInBlack':
      case 'zoomOut':
      case 'zoomOutWhite':
      case 'zoomOutBlack':
        return { maxScale: 1.36, maxX: 0, maxY: 0, padding: 0 };
      default:
        return { maxScale: 1.0, maxX: 0, maxY: 0, padding: 0 };
    }
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function fadeEnd(t) {
    return clamp((t - 0.68) / 0.32, 0, 1);
  }

  function getPreviewExportRect(canvasW, canvasH) {
    const { width, height } = getExportSize();
    const ratio = width / height;
    const outerPad = 32;
    const maxW = Math.max(1, canvasW - outerPad * 2);
    const maxH = Math.max(1, canvasH - outerPad * 2);

    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }

    return {
      x: (canvasW - drawW) / 2,
      y: (canvasH - drawH) / 2,
      width: drawW,
      height: drawH
    };
  }

  function drawWaveImage(targetCtx, progress, base) {
    const strips = 72;
    const srcSliceH = state.imageHeight / strips;
    const destSliceH = base.drawH / strips;
    const amp = base.drawW * 0.018;
    const phase = progress * Math.PI * 2;

    for (let i = 0; i < strips; i++) {
      const v = i / (strips - 1);
      const xOffset = amp * Math.sin(v * Math.PI * 6 + phase) + amp * 0.35 * Math.sin(v * Math.PI * 12 - phase * 1.2);
      targetCtx.drawImage(
        state.image,
        0,
        srcSliceH * i,
        state.imageWidth,
        srcSliceH + 1,
        -base.drawW / 2 + xOffset,
        -base.drawH / 2 + destSliceH * i,
        base.drawW,
        destSliceH + 1.5
      );
    }
  }


  function addRectOverlay(targetCtx, frameRect, color, alpha) {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = color;
    targetCtx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.restore();
  }

  function addDirectionalGradient(targetCtx, frameRect, fromColor, toColor, alpha, mode = 'vertical') {
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    const grad = mode === 'diagonal'
      ? targetCtx.createLinearGradient(frameRect.x, frameRect.y, frameRect.x + frameRect.width, frameRect.y + frameRect.height)
      : targetCtx.createLinearGradient(frameRect.x, frameRect.y, frameRect.x, frameRect.y + frameRect.height);
    grad.addColorStop(0, fromColor);
    grad.addColorStop(1, toColor);
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.restore();
  }

  function addVignetteOverlay(targetCtx, frameRect, strength = 0.28, color = '0, 0, 0') {
    targetCtx.save();
    const cx = frameRect.x + frameRect.width / 2;
    const cy = frameRect.y + frameRect.height / 2;
    const radius = Math.max(frameRect.width, frameRect.height) * 0.74;
    const grad = targetCtx.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius);
    grad.addColorStop(0, `rgba(${color}, 0)`);
    grad.addColorStop(0.68, `rgba(${color}, 0.02)`);
    grad.addColorStop(1, `rgba(${color}, ${strength})`);
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.restore();
  }

  function addGlowBlob(targetCtx, frameRect, cxRatio, cyRatio, radiusRatio, color, alpha) {
    targetCtx.save();
    const cx = frameRect.x + frameRect.width * cxRatio;
    const cy = frameRect.y + frameRect.height * cyRatio;
    const radius = Math.max(frameRect.width, frameRect.height) * radiusRatio;
    const grad = targetCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    targetCtx.globalAlpha = alpha;
    targetCtx.fillStyle = grad;
    targetCtx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.restore();
  }

  function createRegionCanvas(targetCtx, frameRect) {
    const x = Math.max(0, Math.round(frameRect.x));
    const y = Math.max(0, Math.round(frameRect.y));
    const w = Math.max(1, Math.round(frameRect.width));
    const h = Math.max(1, Math.round(frameRect.height));
    const region = document.createElement('canvas');
    region.width = w;
    region.height = h;
    region.getContext('2d').drawImage(targetCtx.canvas, x, y, w, h, 0, 0, w, h);
    return { region, x, y, w, h };
  }

  function addFilmGrainNoise(targetCtx, frameRect, amount = 18, mono = true) {
    const x = Math.max(0, Math.round(frameRect.x));
    const y = Math.max(0, Math.round(frameRect.y));
    const w = Math.max(1, Math.round(frameRect.width));
    const h = Math.max(1, Math.round(frameRect.height));
    let imageData;
    try {
      imageData = targetCtx.getImageData(x, y, w, h);
    } catch (error) {
      console.warn('Grain skipped:', error);
      return;
    }
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (mono) {
        const noise = (Math.random() - 0.5) * amount;
        data[i] = clamp(Math.round(data[i] + noise), 0, 255);
        data[i + 1] = clamp(Math.round(data[i + 1] + noise), 0, 255);
        data[i + 2] = clamp(Math.round(data[i + 2] + noise), 0, 255);
      } else {
        data[i] = clamp(Math.round(data[i] + (Math.random() - 0.5) * amount), 0, 255);
        data[i + 1] = clamp(Math.round(data[i + 1] + (Math.random() - 0.5) * amount), 0, 255);
        data[i + 2] = clamp(Math.round(data[i + 2] + (Math.random() - 0.5) * amount), 0, 255);
      }
    }
    targetCtx.putImageData(imageData, x, y);
  }

  function addChromaticAberration(targetCtx, frameRect, offset = 3) {
    const x = Math.max(0, Math.round(frameRect.x));
    const y = Math.max(0, Math.round(frameRect.y));
    const w = Math.max(1, Math.round(frameRect.width));
    const h = Math.max(1, Math.round(frameRect.height));
    let original;
    try {
      original = targetCtx.getImageData(x, y, w, h);
    } catch (error) {
      console.warn('Chromatic aberration skipped:', error);
      return;
    }
    const src = original.data;
    const out = new Uint8ClampedArray(src);
    for (let yy = 0; yy < h; yy += 1) {
      for (let xx = 0; xx < w; xx += 1) {
        const idx = (yy * w + xx) * 4;
        const leftX = clamp(xx - offset, 0, w - 1);
        const rightX = clamp(xx + offset, 0, w - 1);
        const upY = clamp(yy - Math.max(1, Math.floor(offset / 2)), 0, h - 1);
        const leftIdx = (yy * w + leftX) * 4;
        const rightIdx = (yy * w + rightX) * 4;
        const upIdx = (upY * w + xx) * 4;
        out[idx] = src[leftIdx];
        out[idx + 1] = src[upIdx + 1];
        out[idx + 2] = src[rightIdx + 2];
      }
    }
    targetCtx.putImageData(new ImageData(out, w, h), x, y);
  }

  function overlayBlurredRegion(targetCtx, frameRect, blurPx = 4, alpha = 0.35, brightness = 1.04) {
    const { region, x, y, w, h } = createRegionCanvas(targetCtx, frameRect);
    const temp = document.createElement('canvas');
    temp.width = w; temp.height = h;
    const tctx = temp.getContext('2d');
    tctx.filter = `blur(${blurPx}px) brightness(${brightness})`;
    tctx.drawImage(region, 0, 0);
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.drawImage(temp, x, y);
    targetCtx.restore();
  }

  function applyConvolutionRegion(targetCtx, frameRect, kernel, divisor = 1, offset = 0, mix = 1) {
    const x = Math.max(0, Math.round(frameRect.x));
    const y = Math.max(0, Math.round(frameRect.y));
    const w = Math.max(1, Math.round(frameRect.width));
    const h = Math.max(1, Math.round(frameRect.height));
    let imageData;
    try {
      imageData = targetCtx.getImageData(x, y, w, h);
    } catch (error) {
      console.warn('Convolution skipped:', error);
      return;
    }
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const size = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(size / 2);
    for (let yy = 0; yy < h; yy += 1) {
      for (let xx = 0; xx < w; xx += 1) {
        const idx = (yy * w + xx) * 4;
        for (let c = 0; c < 3; c += 1) {
          let sum = 0;
          for (let ky = 0; ky < size; ky += 1) {
            for (let kx = 0; kx < size; kx += 1) {
              const px = clamp(xx + kx - half, 0, w - 1);
              const py = clamp(yy + ky - half, 0, h - 1);
              const pidx = (py * w + px) * 4 + c;
              sum += src[pidx] * kernel[ky * size + kx];
            }
          }
          const conv = clamp(Math.round(sum / divisor + offset), 0, 255);
          out[idx + c] = clamp(Math.round(src[idx + c] * (1 - mix) + conv * mix), 0, 255);
        }
      }
    }
    targetCtx.putImageData(new ImageData(out, w, h), x, y);
  }

  function addRainStreaks(targetCtx, frameRect, count = 24) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.clip();
    targetCtx.strokeStyle = 'rgba(190, 215, 255, 0.12)';
    targetCtx.lineWidth = 1.2;
    for (let i = 0; i < count; i += 1) {
      const sx = frameRect.x + Math.random() * frameRect.width;
      const sy = frameRect.y + Math.random() * frameRect.height;
      const len = 12 + Math.random() * 18;
      targetCtx.beginPath();
      targetCtx.moveTo(sx, sy);
      targetCtx.lineTo(sx - len * 0.22, sy + len);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }


  function applyPixelateRegion(targetCtx, frameRect, pixelSize = 8) {
    const { region, x, y, w, h } = createRegionCanvas(targetCtx, frameRect);
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(w / pixelSize));
    small.height = Math.max(1, Math.round(h / pixelSize));
    const sctx = small.getContext('2d');
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'low';
    sctx.clearRect(0, 0, small.width, small.height);
    sctx.drawImage(region, 0, 0, small.width, small.height);
    targetCtx.save();
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.clearRect(x, y, w, h);
    targetCtx.drawImage(small, 0, 0, small.width, small.height, x, y, w, h);
    targetCtx.restore();
  }

  function buildEdgeCanvas(region, options = {}) {
    const w = region.width;
    const h = region.height;
    const rctx = region.getContext('2d');
    const srcData = rctx.getImageData(0, 0, w, h);
    const src = srcData.data;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const octx = outCanvas.getContext('2d');
    const outData = octx.createImageData(w, h);
    const out = outData.data;
    const invert = !!options.invert;
    const threshold = options.threshold ?? 26;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4;
        const here = src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114;
        const rx = Math.min(w - 1, x + 1);
        const by = Math.min(h - 1, y + 1);
        const ridx = (y * w + rx) * 4;
        const bidx = (by * w + x) * 4;
        const right = src[ridx] * 0.299 + src[ridx + 1] * 0.587 + src[ridx + 2] * 0.114;
        const down = src[bidx] * 0.299 + src[bidx + 1] * 0.587 + src[bidx + 2] * 0.114;
        const edge = Math.abs(here - right) + Math.abs(here - down);
        const edgeStrength = clamp((edge - threshold) * 3.2, 0, 255);
        const base = invert ? 0 : 255;
        const lineVal = invert ? edgeStrength : 255 - edgeStrength;
        out[idx] = invert ? lineVal : Math.min(base, lineVal);
        out[idx + 1] = invert ? lineVal : Math.min(base, lineVal);
        out[idx + 2] = invert ? lineVal : Math.min(base, lineVal);
        out[idx + 3] = 255;
      }
    }
    octx.putImageData(outData, 0, 0);
    return outCanvas;
  }

  function replaceWithEdgeCanvas(targetCtx, frameRect, options = {}) {
    const { region, x, y } = createRegionCanvas(targetCtx, frameRect);
    const edgeCanvas = buildEdgeCanvas(region, options);
    targetCtx.drawImage(edgeCanvas, x, y);
  }

  function overlayEdgeLines(targetCtx, frameRect, options = {}) {
    const { region, x, y } = createRegionCanvas(targetCtx, frameRect);
    const edgeCanvas = buildEdgeCanvas(region, options);
    targetCtx.save();
    targetCtx.globalAlpha = options.alpha ?? 0.85;
    targetCtx.globalCompositeOperation = options.blend || 'multiply';
    targetCtx.drawImage(edgeCanvas, x, y);
    targetCtx.restore();
  }

  function addScanlines(targetCtx, frameRect, alpha = 0.14, gap = 3) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.clip();
    targetCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    for (let y = Math.round(frameRect.y); y < frameRect.y + frameRect.height; y += gap) {
      targetCtx.fillRect(frameRect.x, y, frameRect.width, 1);
    }
    targetCtx.restore();
  }

  function applyImageFilterToCanvas(targetCtx, frameRect, filter) {
    if (!filter || filter === 'none') return;
    const x = Math.max(0, Math.round(frameRect.x));
    const y = Math.max(0, Math.round(frameRect.y));
    const w = Math.max(1, Math.round(frameRect.width));
    const h = Math.max(1, Math.round(frameRect.height));
    let imageData;
    try {
      imageData = targetCtx.getImageData(x, y, w, h);
    } catch (error) {
      console.warn('Image filter skipped:', error);
      return;
    }
    const data = imageData.data;
    const posterizeStep = 64;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const luma = r * 0.299 + g * 0.587 + b * 0.114;
      const highlight = clamp((luma - 112) / 143, 0, 1);
      const shadow = clamp((132 - luma) / 132, 0, 1);
      const satCenter = (r + g + b) / 3;
      const contrast = 1.18;

      if (filter === 'posterize') {
        r = Math.round(r / posterizeStep) * posterizeStep;
        g = Math.round(g / posterizeStep) * posterizeStep;
        b = Math.round(b / posterizeStep) * posterizeStep;
      } else if (filter === 'grayscale') {
        const gray = luma; r = g = b = gray;
      } else if (filter === 'sepia') {
        const nr = r * 0.393 + g * 0.769 + b * 0.189;
        const ng = r * 0.349 + g * 0.686 + b * 0.168;
        const nb = r * 0.272 + g * 0.534 + b * 0.131; r = nr; g = ng; b = nb;
      } else if (filter === 'contrastBoost') {
        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;
      } else if (filter === 'softFocus') {
        r = r * 1.02 + 6;
        g = g * 1.02 + 6;
        b = b * 1.03 + 8;
      } else if (filter === 'sharpen') {
        r = (r - 128) * 1.06 + 128;
        g = (g - 128) * 1.06 + 128;
        b = (b - 128) * 1.06 + 128;
      } else if (filter === 'sumiInk') {
        const gray = luma;
        r = gray * 0.95;
        g = gray * 0.95;
        b = gray * 0.95;
      } else if (filter === 'noiseBoost') {
        r = (r - 128) * 1.10 + 128;
        g = (g - 128) * 1.10 + 128;
        b = (b - 128) * 1.10 + 128;
      } else if (filter === 'crt') {
        r = r * 0.90 + 10;
        g = g * 0.98 + 14;
        b = b * 0.92 + 12;
      } else if (filter === 'vignette') {
        r = (r - satCenter) * 1.08 + satCenter;
        g = (g - satCenter) * 1.08 + satCenter;
        b = (b - satCenter) * 1.08 + satCenter;
      } else if (filter === 'chromaticAberration') {
        r = (r - 128) * 1.04 + 128;
        g = (g - 128) * 1.01 + 128;
        b = (b - 128) * 1.04 + 128;
      } else if (filter === 'morning') {
        r = r * 1.08 + 18;
        g = g * 1.04 + 10;
        b = b * 0.95 + 4;
      } else if (filter === 'midday') {
        r = r * 1.04 + 8;
        g = g * 1.04 + 8;
        b = b * 1.02 + 4;
      } else if (filter === 'evening') {
        r = r * 1.02 + 34 * highlight + 10;
        g = g * 0.97 + 12 * highlight + 2;
        b = b * 0.84 - 12 * highlight + 8 * shadow;
      } else if (filter === 'night') {
        r = r * 0.42 + luma * 0.05 + 2;
        g = g * 0.50 + luma * 0.07 + 4;
        b = b * 0.78 + 16 + luma * 0.03;
      } else if (filter === 'deepNight') {
        r = r * 0.24 + 1;
        g = g * 0.32 + 2;
        b = b * 0.62 + 16;
      } else if (filter === 'moonlight') {
        r = r * 0.48 + luma * 0.06 + 8;
        g = g * 0.58 + luma * 0.08 + 10;
        b = b * 0.88 + 22;
        if (highlight > 0.55) b += 10 * highlight;
      } else if (filter === 'horror') {
        const gray = luma;
        r = gray * 0.72 + r * 0.18 + 22 * highlight;
        g = gray * 0.84 + g * 0.20 + 6;
        b = gray * 0.72 + b * 0.10 + 10 * shadow;
      } else if (filter === 'fog') {
        r = (r - 128) * 0.78 + 150;
        g = (g - 128) * 0.78 + 154;
        b = (b - 128) * 0.78 + 160;
      } else if (filter === 'cyber') {
        r = r * 0.88 + 18 * highlight + 8;
        g = g * 0.86 + 10;
        b = b * 1.08 + 22;
      } else if (filter === 'underwater') {
        r = r * 0.55 + 6;
        g = g * 0.88 + 14;
        b = b * 1.02 + 16;
      } else if (filter === 'dream') {
        r = r * 1.03 + 12;
        g = g * 1.01 + 8;
        b = b * 1.06 + 14;
      } else if (filter === 'vintagePhoto') {
        const nr = r * 0.393 + g * 0.769 + b * 0.189;
        const ng = r * 0.349 + g * 0.686 + b * 0.168;
        const nb = r * 0.272 + g * 0.534 + b * 0.131;
        r = nr * 0.92 + 8;
        g = ng * 0.90 + 6;
        b = nb * 0.82 + 2;
      }

      data[i] = clamp(Math.round(r), 0, 255);
      data[i + 1] = clamp(Math.round(g), 0, 255);
      data[i + 2] = clamp(Math.round(b), 0, 255);
    }

    targetCtx.putImageData(imageData, x, y);

    if (filter === 'softFocus') {
      overlayBlurredRegion(targetCtx, frameRect, 5, 0.30, 1.05);
      addGlowBlob(targetCtx, frameRect, 0.5, 0.4, 0.42, 'rgba(255,245,230,1)', 0.10);
    } else if (filter === 'sharpen') {
      applyConvolutionRegion(targetCtx, frameRect, [0,-1,0,-1,5,-1,0,-1,0], 1, 0, 0.50);
    } else if (filter === 'lineExtract') {
      replaceWithEdgeCanvas(targetCtx, frameRect, { invert: false, threshold: 24 });
    } else if (filter === 'whiteLineExtract') {
      replaceWithEdgeCanvas(targetCtx, frameRect, { invert: true, threshold: 22 });
    } else if (filter === 'sumiInk') {
      applyConvolutionRegion(targetCtx, frameRect, [0,-1,0,-1,5,-1,0,-1,0], 1, 0, 0.32);
      overlayEdgeLines(targetCtx, frameRect, { invert: false, threshold: 22, alpha: 0.72, blend: 'multiply' });
      addVignetteOverlay(targetCtx, frameRect, 0.16, '20, 20, 20');
    } else if (filter === 'pixelate') {
      applyPixelateRegion(targetCtx, frameRect, 10);
    } else if (filter === 'noiseBoost') {
      addFilmGrainNoise(targetCtx, frameRect, 34, false);
      addVignetteOverlay(targetCtx, frameRect, 0.14, '10, 10, 10');
    } else if (filter === 'crt') {
      addChromaticAberration(targetCtx, frameRect, 3);
      addScanlines(targetCtx, frameRect, 0.16, 3);
      addRectOverlay(targetCtx, frameRect, '#0d1208', 0.05);
      addVignetteOverlay(targetCtx, frameRect, 0.22, '0, 0, 0');
    } else if (filter === 'vignette') {
      addVignetteOverlay(targetCtx, frameRect, 0.54, '0, 0, 0');
    } else if (filter === 'chromaticAberration') {
      addChromaticAberration(targetCtx, frameRect, 4);
      addVignetteOverlay(targetCtx, frameRect, 0.18, '10, 10, 10');
    } else if (filter === 'morning') {
      addRectOverlay(targetCtx, frameRect, '#fff3cf', 0.08);
      addGlowBlob(targetCtx, frameRect, 0.78, 0.22, 0.30, 'rgba(255,242,204,1)', 0.14);
    } else if (filter === 'midday') {
      addRectOverlay(targetCtx, frameRect, '#ffffff', 0.03);
    } else if (filter === 'evening') {
      addDirectionalGradient(targetCtx, frameRect, 'rgba(255,196,122,0.95)', 'rgba(44,44,96,0.00)', 0.22, 'vertical');
      addDirectionalGradient(targetCtx, frameRect, 'rgba(255,154,82,0.65)', 'rgba(0,0,0,0)', 0.14, 'diagonal');
      addVignetteOverlay(targetCtx, frameRect, 0.18, '50, 18, 0');
    } else if (filter === 'night') {
      addRectOverlay(targetCtx, frameRect, '#0a1733', 0.12);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(36,62,132,0.50)', 'rgba(5,10,22,0.12)', 0.14, 'vertical');
      addVignetteOverlay(targetCtx, frameRect, 0.26, '3, 7, 18');
    } else if (filter === 'deepNight') {
      addRectOverlay(targetCtx, frameRect, '#050d1f', 0.22);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(24,42,92,0.50)', 'rgba(0,0,0,0.12)', 0.16, 'vertical');
      addVignetteOverlay(targetCtx, frameRect, 0.40, '2, 5, 14');
    } else if (filter === 'moonlight') {
      addGlowBlob(targetCtx, frameRect, 0.76, 0.18, 0.32, 'rgba(196,224,255,1)', 0.18);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(128,160,224,0.55)', 'rgba(8,14,28,0.00)', 0.14, 'diagonal');
      addVignetteOverlay(targetCtx, frameRect, 0.24, '4, 9, 20');
    } else if (filter === 'horror') {
      addRectOverlay(targetCtx, frameRect, '#182014', 0.10);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(98,12,12,0.45)', 'rgba(0,0,0,0)', 0.12, 'diagonal');
      addVignetteOverlay(targetCtx, frameRect, 0.36, '6, 2, 2');
      addFilmGrainNoise(targetCtx, frameRect, 10);
    } else if (filter === 'fog') {
      addRectOverlay(targetCtx, frameRect, '#e8edf3', 0.10);
      addGlowBlob(targetCtx, frameRect, 0.24, 0.66, 0.42, 'rgba(255,255,255,1)', 0.14);
      addGlowBlob(targetCtx, frameRect, 0.72, 0.34, 0.38, 'rgba(255,255,255,1)', 0.12);
      addVignetteOverlay(targetCtx, frameRect, 0.12, '180, 190, 200');
    } else if (filter === 'cyber') {
      addDirectionalGradient(targetCtx, frameRect, 'rgba(255,0,140,0.24)', 'rgba(0,0,0,0)', 0.20, 'diagonal');
      addDirectionalGradient(targetCtx, frameRect, 'rgba(0,224,255,0.26)', 'rgba(0,0,0,0)', 0.18, 'vertical');
      addChromaticAberration(targetCtx, frameRect, 3);
      addVignetteOverlay(targetCtx, frameRect, 0.18, '5, 5, 12');
    } else if (filter === 'underwater') {
      addRectOverlay(targetCtx, frameRect, '#0b6b7e', 0.08);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(135,255,244,0.16)', 'rgba(0,0,0,0)', 0.12, 'vertical');
      overlayBlurredRegion(targetCtx, frameRect, 2.8, 0.12, 1.00);
      addVignetteOverlay(targetCtx, frameRect, 0.18, '2, 24, 28');
    } else if (filter === 'dream') {
      overlayBlurredRegion(targetCtx, frameRect, 6, 0.34, 1.06);
      addGlowBlob(targetCtx, frameRect, 0.48, 0.38, 0.48, 'rgba(255,236,252,1)', 0.16);
      addDirectionalGradient(targetCtx, frameRect, 'rgba(255,221,244,0.22)', 'rgba(196,218,255,0.00)', 0.16, 'diagonal');
      addVignetteOverlay(targetCtx, frameRect, 0.12, '120, 110, 160');
    } else if (filter === 'vintagePhoto') {
      addFilmGrainNoise(targetCtx, frameRect, 16);
      addRectOverlay(targetCtx, frameRect, '#f5e2c2', 0.08);
      addVignetteOverlay(targetCtx, frameRect, 0.30, '40, 24, 6');
    }
  }


  function syncCardTabIndex(container, selector, activeButton) {
    if (!container) return;
    const buttons = [...container.querySelectorAll(selector)];
    const fallback = activeButton || buttons.find(button => !button.disabled) || null;
    buttons.forEach(button => {
      button.tabIndex = button === fallback ? 0 : -1;
    });
  }

  function getGridColumnCount(container) {
    if (!container) return 1;
    const style = window.getComputedStyle(container);
    const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length;
    return Math.max(1, cols || 1);
  }

  function moveCardSelection(container, selector, currentButton, step) {
    if (!container || !currentButton) return;
    const buttons = [...container.querySelectorAll(selector)].filter(button => !button.disabled);
    if (!buttons.length) return;
    const currentIndex = Math.max(0, buttons.indexOf(currentButton));
    const nextIndex = clamp(currentIndex + step, 0, buttons.length - 1);
    const nextButton = buttons[nextIndex];
    if (!nextButton || nextButton === currentButton) return;
    nextButton.focus();
    nextButton.click();
  }

  function attachCardKeyboardNavigation(container, selector) {
    if (!container) return;
    container.addEventListener('keydown', event => {
      const button = event.target.closest(selector);
      if (!button) return;
      const cols = getGridColumnCount(container);

      if (event.key === 'Tab') {
        event.preventDefault();
        moveCardSelection(container, selector, button, event.shiftKey ? -1 : 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveCardSelection(container, selector, button, -1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveCardSelection(container, selector, button, 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveCardSelection(container, selector, button, -cols);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveCardSelection(container, selector, button, cols);
      }
    });
  }

  function updateExportNoteVisibility() {
    if (!els.exportNote) return;
    const hideForTransition = isTransitionEffect(state.effect);
    els.exportNote.hidden = hideForTransition;
    els.exportNote.classList.toggle('is-hidden', hideForTransition);
  }

  function syncPreviewPanelLayout() {
    const panel = els.previewPanel;
    const canvasWrap = els.previewCanvas?.closest('.canvas-wrap');
    const controls = els.previewControls;
    const heading = panel?.querySelector('.panel-heading');
    const transitionPanel = els.transitionThumbPanel;
    if (!panel || !canvasWrap || !controls || !heading) return;

    const isStackedLayout = window.matchMedia('(max-width: 1180px)').matches;

    if (isStackedLayout) {
      canvasWrap.style.height = '';
      canvasWrap.style.minHeight = '';
      controls.style.maxHeight = '';
      panel.style.removeProperty('--preview-controls-height');
      return;
    }

    const style = window.getComputedStyle(panel);
    const panelPaddingTop = parseFloat(style.paddingTop || '0');
    const panelPaddingBottom = parseFloat(style.paddingBottom || '0');
    const gap = parseFloat(style.rowGap || style.gap || '0');
    const isTransitionVisible = transitionPanel && !transitionPanel.hidden;
    const visibleBlocks = [heading, canvasWrap, controls].filter(Boolean).length + (isTransitionVisible ? 1 : 0);
    const gapTotal = Math.max(0, visibleBlocks - 1) * gap;
    const shortLaptop = window.matchMedia('(max-height: 820px)').matches;
    const minPreviewHeight = shortLaptop ? 240 : 300;

    const fullControlsHeight = controls.scrollHeight || controls.offsetHeight;
    const transitionHeight = isTransitionVisible ? transitionPanel.offsetHeight : 0;
    const reserved = panelPaddingTop + panelPaddingBottom + heading.offsetHeight + transitionHeight + gapTotal;
    const available = panel.clientHeight - reserved;

    if (!Number.isFinite(available) || available <= 0) return;

    const controlsMaxHeight = Math.max(210, Math.min(fullControlsHeight, available - minPreviewHeight));
    const nextHeight = Math.max(minPreviewHeight, available - controlsMaxHeight);

    const nextControlsHeight = `${Math.floor(controlsMaxHeight)}px`;
    const nextCanvasHeight = `${Math.floor(nextHeight)}px`;

    if (controls.style.maxHeight !== nextControlsHeight) {
      controls.style.maxHeight = nextControlsHeight;
    }
    if (canvasWrap.style.height !== nextCanvasHeight) {
      canvasWrap.style.height = nextCanvasHeight;
      canvasWrap.style.minHeight = nextCanvasHeight;
    }
    panel.style.setProperty('--preview-controls-height', `${Math.ceil(controlsMaxHeight)}px`);
  }

  let previewLayoutSyncPending = false;

  function requestPreviewPanelLayoutSync() {
    if (previewLayoutSyncPending) return;
    previewLayoutSyncPending = true;
    window.requestAnimationFrame(() => {
      previewLayoutSyncPending = false;
      syncPreviewCanvasSize();
      syncPreviewPanelLayout();
      drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    });
  }

  function setActiveTab(panelName) {
    const showMotion = panelName !== 'imageEdit';
    els.motionTab?.classList.toggle('is-active', showMotion);
    els.imageEditTab?.classList.toggle('is-active', !showMotion);
    els.motionTab?.setAttribute('aria-selected', String(showMotion));
    els.imageEditTab?.setAttribute('aria-selected', String(!showMotion));
    if (els.motionPanel) { els.motionPanel.hidden = !showMotion; els.motionPanel.classList.toggle('is-active', showMotion); }
    if (els.imageEditPanel) { els.imageEditPanel.hidden = showMotion; els.imageEditPanel.classList.toggle('is-active', !showMotion); }
  }

  function selectImageFilter(button) {
    if (!button || button.disabled) return;
    state.imageFilter = button.dataset.filter || 'none';
    [...els.imageEditGrid.querySelectorAll('.image-edit-card')].forEach(card => card.classList.remove('is-active'));
    button.classList.add('is-active');
    syncCardTabIndex(els.imageEditGrid, '.image-edit-card', button);
    updateOutputFileName();
    drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    const singleTransitionHint = shouldUseSingleImageFilterTransition()
      ? dict().messages.transitionHintSingleFilter(imageFilterLabels[state.imageFilter] || dict().filterLabels.none)
      : '';
    setStatus(dict().messages.filterSelected(imageFilterLabels[state.imageFilter] || dict().filterLabels.none, `${singleTransitionHint}${getQualityRecommendationText()}`));
    hideDownload();
  }

  function drawCoverImage(targetCtx, image, drawWidth, drawHeight, scale = 1, alpha = 1) {
    if (!image) return;
    const naturalW = image.naturalWidth || image.width || state.imageWidth;
    const naturalH = image.naturalHeight || image.height || state.imageHeight;
    const base = coverRect(naturalW, naturalH, drawWidth, drawHeight, scale);
    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.drawImage(image, -base.drawW / 2, -base.drawH / 2, base.drawW, base.drawH);
    targetCtx.restore();
  }

  function drawFilteredCoverImage(targetCtx, image, drawWidth, drawHeight, scale = 1, alpha = 1) {
    if (!image || !state.imageFilter || state.imageFilter === 'none') return;
    const tempW = Math.max(1, Math.ceil(drawWidth));
    const tempH = Math.max(1, Math.ceil(drawHeight));
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempW;
    tempCanvas.height = tempH;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, tempW, tempH);
    tempCtx.save();
    tempCtx.translate(tempW / 2, tempH / 2);
    drawCoverImage(tempCtx, image, tempW, tempH, scale, 1);
    tempCtx.restore();
    applyImageFilterToCanvas(tempCtx, { x: 0, y: 0, width: tempW, height: tempH }, state.imageFilter);

    targetCtx.save();
    targetCtx.globalAlpha = alpha;
    targetCtx.drawImage(tempCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    targetCtx.restore();
  }

  function drawTransparencyChecker(targetCtx, rect, size = 16) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(rect.x, rect.y, rect.width, rect.height);
    targetCtx.clip();
    for (let y = rect.y; y < rect.y + rect.height; y += size) {
      for (let x = rect.x; x < rect.x + rect.width; x += size) {
        const alt = ((Math.floor((x - rect.x) / size) + Math.floor((y - rect.y) / size)) % 2) === 0;
        targetCtx.fillStyle = alt ? 'rgba(255,255,255,0.36)' : 'rgba(148,163,184,0.28)';
        targetCtx.fillRect(x, y, size, size);
      }
    }
    targetCtx.restore();
  }

  function postprocessTransparentFadeFrame(targetCtx, rect, progress) {
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const fadeOut = normalizeFadeOrder()[0] === 'image';

    if (fadeOut && progress >= 0.992) {
      targetCtx.clearRect(x, y, w, h);
      return;
    }

    const imageData = targetCtx.getImageData(x, y, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        continue;
      }

      if (fadeOut) {
        if (alpha <= 20) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else if (alpha <= 144) {
          const factor = Math.pow(alpha / 255, 1.35);
          data[i] = Math.round(data[i] * factor);
          data[i + 1] = Math.round(data[i + 1] * factor);
          data[i + 2] = Math.round(data[i + 2] * factor);
        } else if (alpha >= 250) {
          data[i + 3] = 255;
        }
      } else {
        if (alpha <= 8) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else if (alpha <= 36) {
          const factor = alpha / 255;
          data[i] = Math.round(data[i] * factor);
          data[i + 1] = Math.round(data[i + 1] * factor);
          data[i + 2] = Math.round(data[i + 2] * factor);
        } else if (alpha >= 245) {
          data[i + 3] = 255;
        }
      }
    }
    targetCtx.putImageData(imageData, x, y);
  }

  function drawFrame(progress, targetCtx, width, height, options = {}) {
    const previewMode = Boolean(options.preview);
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.clearRect(0, 0, width, height);

    const frameRect = previewMode
      ? getPreviewExportRect(width, height)
      : { x: 0, y: 0, width, height };

    const transparentCanvasMode = isTransparentFadeEffect(state.effect);
    if (!transparentCanvasMode) {
      targetCtx.fillStyle = '#000000';
      targetCtx.fillRect(0, 0, width, height);
    } else if (previewMode) {
      drawTransparencyChecker(targetCtx, frameRect);
    }

    if (!state.image && !(state.images && state.images.length)) {
      if (previewMode) {
        targetCtx.save();
        targetCtx.strokeStyle = 'rgba(255,255,255,0.55)';
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
        targetCtx.restore();
      }
      return;
    }

    const motion = getMotion(state.effect, progress);
    const singleFilterTransition = shouldUseSingleImageFilterTransition(state.effect);
    const bounds = getEffectBounds(state.effect);
    const requiredW = Math.max(1, frameRect.width + (bounds.maxX * 2) + (bounds.padding * 2));
    const requiredH = Math.max(1, frameRect.height + (bounds.maxY * 2) + (bounds.padding * 2));
    const referenceImage = ['transition', 'transitionHardcut', 'transitionWipe'].includes(motion.mode) ? (motion.currentImage || state.image || state.images[0]) : state.image;
    const useNoZoomBase = motion.mode === 'shakeNoZoom';
    const base = coverRect(
      referenceImage?.naturalWidth || state.imageWidth,
      referenceImage?.naturalHeight || state.imageHeight,
      useNoZoomBase ? frameRect.width : requiredW,
      useNoZoomBase ? frameRect.height : requiredH,
      motion.scale * (motion.cropScale || 1)
    );

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
    targetCtx.clip();
    targetCtx.translate(frameRect.x + frameRect.width / 2 + motion.x, frameRect.y + frameRect.height / 2 + motion.y);
    targetCtx.rotate(motion.rotate);
    if (motion.mode === 'wave') {
      drawWaveImage(targetCtx, motion.amount, base);
    } else if (motion.mode === 'fadeFill') {
      const transparentFade = isTransparentFadeEffect(state.effect);
      if (motion.fillColor && motion.fillAlpha > 0) {
        targetCtx.save();
        targetCtx.globalAlpha = motion.fillAlpha;
        targetCtx.fillStyle = motion.fillColor;
        targetCtx.fillRect(-requiredW / 2, -requiredH / 2, requiredW, requiredH);
        targetCtx.restore();
      }
      if (motion.imageAlpha > 0 && (!transparentFade || motion.imageAlpha > 0.02)) {
        drawCoverImage(targetCtx, state.image || state.images[0], requiredW, requiredH, motion.scale * (motion.cropScale || 1), motion.imageAlpha);
      }
    } else if (motion.mode === 'transition') {
      const currentScale = motion.scale * (motion.cropScale || 1) * (1 + (1 - motion.mix) * 0.012);
      const nextScale = motion.scale * (motion.cropScale || 1) * (1 + motion.mix * 0.012);
      const currentImage = motion.currentImage || state.image || state.images[0];
      const nextImage = motion.nextImage || currentImage;
      drawCoverImage(targetCtx, currentImage, requiredW, requiredH, currentScale, 1 - motion.mix);
      if (singleFilterTransition) {
        drawFilteredCoverImage(targetCtx, currentImage, requiredW, requiredH, nextScale, motion.mix);
      } else {
        drawCoverImage(targetCtx, nextImage, requiredW, requiredH, nextScale, motion.mix);
      }
    } else if (motion.mode === 'transitionHardcut') {
      const currentImage = motion.currentImage || state.image || state.images[0];
      const nextImage = motion.nextImage || currentImage;
      if (singleFilterTransition && motion.mix >= 0.5) {
        drawFilteredCoverImage(targetCtx, currentImage, requiredW, requiredH, motion.scale * (motion.cropScale || 1), 1);
      } else {
        const cutImage = motion.mix < 0.5 ? currentImage : nextImage;
        drawCoverImage(targetCtx, cutImage, requiredW, requiredH, motion.scale * (motion.cropScale || 1), 1);
      }
    } else if (motion.mode === 'transitionWipe') {
      const currentScale = motion.scale * (motion.cropScale || 1);
      const nextScale = motion.scale * (motion.cropScale || 1);
      const currentImage = motion.currentImage || state.image || state.images[0];
      const nextImage = motion.nextImage || currentImage;
      drawCoverImage(targetCtx, currentImage, requiredW, requiredH, currentScale, 1);
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.rect(-requiredW / 2, -requiredH / 2, requiredW * motion.mix, requiredH);
      targetCtx.clip();
      if (singleFilterTransition) {
        drawFilteredCoverImage(targetCtx, currentImage, requiredW, requiredH, nextScale, 1);
      } else {
        drawCoverImage(targetCtx, nextImage, requiredW, requiredH, nextScale, 1);
      }
      targetCtx.restore();
    } else {
      targetCtx.drawImage(
        state.image,
        -base.drawW / 2,
        -base.drawH / 2,
        base.drawW,
        base.drawH
      );
    }
    targetCtx.restore();

    if (!singleFilterTransition && !isTransparentFadeEffect(state.effect)) {
      applyImageFilterToCanvas(targetCtx, frameRect, state.imageFilter);
    }

    if (!previewMode && isTransparentFadeEffect(state.effect)) {
      postprocessTransparentFadeFrame(targetCtx, frameRect, progress);
    }

    if (motion.overlay && motion.overlayAlpha > 0) {
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
      targetCtx.clip();
      targetCtx.globalAlpha = motion.overlayAlpha;
      targetCtx.fillStyle = motion.overlay;
      targetCtx.fillRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
      targetCtx.restore();
    }

    if (previewMode) {
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(255,255,255,0.72)';
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
      targetCtx.restore();
    }
  }

  function coverRect(imgW, imgH, canvasW, canvasH, scale = 1) {
    const canvasRatio = canvasW / canvasH;
    const imageRatio = imgW / imgH;
    let drawW;
    let drawH;

    if (imageRatio > canvasRatio) {
      drawH = canvasH * scale;
      drawW = drawH * imageRatio;
    } else {
      drawW = canvasW * scale;
      drawH = drawW / imageRatio;
    }

    return { drawW, drawH };
  }

  function animate(now) {
    if (!state.playing) return;

    if (!state.playStart) state.playStart = now;
    const seconds = getSeconds();
    const elapsed = (now - state.playStart) / 1000;
    let progress = (elapsed % seconds) / seconds;


    state.stillFrameTime = progress;
    drawFrame(progress, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    state.rafId = requestAnimationFrame(animate);
  }

  function togglePlay() {
    if (!state.image && !(state.images && state.images.length)) {
      setStatus(dict().messages.needImage);
      return;
    }

    if (state.effect === 'none') {
      stopPreview();
      drawFrame(0, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
      setStatus(dict().messages.noMotionPreview);
      return;
    }

    state.playing = !state.playing;
    if (state.playing) {
      state.playStart = 0;
      els.playBtn.textContent = dict().staticText.stop;
      state.rafId = requestAnimationFrame(animate);
    } else {
      stopPreview();
    }
  }

  function selectEffect(button) {
    if (!button || button.disabled) return;

    const wasActive = button.classList.contains('is-active');

    if (wasActive) {
      state.effect = 'none';
      [...els.effectGrid.querySelectorAll('.effect-card')].forEach(card => card.classList.remove('is-active'));
      syncCardTabIndex(els.effectGrid, '.effect-card', null);
      updateOutputFileName();
      updateTransitionThumbs();
      updateExportNoteVisibility();
      hideDownload();
      stopPreview();
      drawFrame(0, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
      setStatus(dict().messages.noMotionSelected(getQualityRecommendationText()));
      return;
    }

    state.effect = button.dataset.effect;
    if (isFadeEffect(state.effect)) {
      state.fadeOrder = ['image', 'fill'];
    }
    [...els.effectGrid.querySelectorAll('.effect-card')].forEach(card => card.classList.remove('is-active'));
    button.classList.add('is-active');
    syncCardTabIndex(els.effectGrid, '.effect-card', button);
    els.loopInput.checked = getLoopDefault(state.effect);
    els.secondsInput.value = String(getEffectDefaultSeconds(state.effect));
    updateOutputFileName();
    updateTransitionThumbs();
    drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
    setEffectSelectionStatus();
    updateTransitionThumbs();
    updateExportNoteVisibility();
    hideDownload();

    if (state.image) {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.playing = true;
      state.playStart = 0;
      els.playBtn.textContent = dict().staticText.stop;
      state.rafId = requestAnimationFrame(animate);
    }
  }

  function getClosestSizeMapEntryForSource(sizeMap, sourceW, sourceH) {
    const entries = Object.values(sizeMap || {});
    if (!entries.length || !sourceW || !sourceH) return null;
    const sourceAspect = sourceW / sourceH;
    return entries
      .map(entry => ({
        ...entry,
        score: Math.abs((entry.width / entry.height) - sourceAspect)
      }))
      .sort((a, b) => a.score - b.score)[0] || null;
  }

  function scaleOriginalToQualityBounds(sourceW, sourceH, targetW, targetH) {
    if (!sourceW || !sourceH || !targetW || !targetH) {
      return { width: sourceW || 1280, height: sourceH || 720 };
    }
    const scale = Math.min(targetW / sourceW, targetH / sourceH, 1);
    return {
      width: Math.max(2, Math.round(sourceW * scale)),
      height: Math.max(2, Math.round(sourceH * scale))
    };
  }

  function getExportSize() {
    const selected = els.sizeInput.value;
    const sourceW = state.imageWidth || 1280;
    const sourceH = state.imageHeight || 720;
    const setting = qualitySettings[els.qualityInput.value] || qualitySettings.standard;

    if (selected === 'original') {
      if (els.qualityInput.value === 'high') {
        return { width: sourceW, height: sourceH, label: dict().messages.original };
      }

      const closestBounds = getClosestSizeMapEntryForSource(setting.sizeMap, sourceW, sourceH);
      if (closestBounds) {
        const scaled = scaleOriginalToQualityBounds(sourceW, sourceH, closestBounds.width, closestBounds.height);
        return {
          width: scaled.width,
          height: scaled.height,
          label: `${dict().messages.original}比率（${scaled.width} × ${scaled.height}）`
        };
      }

      return { width: sourceW, height: sourceH, label: dict().messages.original };
    }

    const preset = getSizePresetByValue(selected);
    if (preset) {
      return {
        width: preset.width,
        height: preset.height,
        label: preset.label
      };
    }

    return { width: sourceW, height: sourceH, label: dict().messages.original };
  }

  /* APNG output is temporarily disabled from v0.80.
    async function exportApng() {
      showToast('APNG出力を開始しました。しばらくお待ちください。', 'info', 3200);
      if (!state.image && !(state.images && state.images.length)) {
        setStatus(dict().messages.needImage);
        return;
      }
      if (typeof UPNG === 'undefined') {
        setStatus('APNG出力ライブラリを読み込めませんでした。ネットワーク接続を確認してください。');
        return;
      }
  
      if (state.playing) togglePlay();
      hideDownload();
  
      const seconds = getSeconds();
      const setting = qualitySettings[els.qualityInput.value] || qualitySettings.standard;
      const { width, height, label: sizeLabel } = getExportSize();
      const frames = Math.max(2, Math.round(seconds * setting.fps));
      const delay = Math.round(1000 / setting.fps);
      const safeName = buildOutputBaseName();
  
      setExportRunning(true);
      setStatus(`APNG生成中... 0 / ${frames} frames / ${getSizeLimitLabel()}`);
  
      const frameBuffers = [];
        const colors = setting.apngColors || 128;
  
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  
      for (let i = 0; i < frames; i++) {
        checkExportCancelled();
        const progress = frames === 1 ? 1 : i / (frames - 1);
        drawFrame(progress, offCtx, width, height);
        const imageData = offCtx.getImageData(0, 0, width, height);
        frameBuffers.push(new Uint8Array(imageData.data).buffer);
        if (i % 4 === 0 || i === frames - 1) {
          setStatus(`APNG生成中... ${i + 1} / ${frames} frames`);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
  
      try {
        setStatus('APNGエンコード中...');
        const arrayBuffer = UPNG.encode(frameBuffers, width, height, colors, delays);
        const patchedBuffer = patchApngLoopCount(arrayBuffer, els.loopInput.checked);
        const blob = new Blob([patchedBuffer], { type: 'image/apng' });
        const url = URL.createObjectURL(blob);
        const sizeWarning = getBlobSizeWarning(blob);
        const outputName = `${safeName}.png`;
        const outputSize = formatFileSize(blob.size);
        state.downloadUrl = url;
        state.downloadName = outputName;
        els.downloadLink.textContent = 'ダウンロード';
        els.downloadLink.classList.remove('is-disabled');
        els.downloadLink.setAttribute('aria-disabled', 'false');
        showExportSizeToast('APNG', blob);
        setStatus(`APNG出力完了：${outputName} / ${outputSize} / ${effectLabels[state.effect]} / ${els.loopInput.checked ? 'ループ' : '非ループ'} / ${seconds}秒 / ${setting.label} / ${sizeLabel}${sizeWarning ? ` / ${sizeWarning}` : ''}`);
      } catch (error) {
        if (error && error.code === 'EXPORT_CANCELLED') {
          setStatus(dict().messages.exportCancelled);
          showToast(dict().messages.exportCancelled, 'warning', 2800);
        } else {
          console.error(error);
          setStatus('APNG出力中にエラーが発生しました。5MB以内を目安に、画像サイズ・画質・秒数を下げるか、PNG連番ZIP / WebP出力を試してください。');
        }
      } finally {
        setExportRunning(false);
      }
    }
  */
  function setExportButtonsDisabled(disabled) {
    els.exportWebpBtn.disabled = disabled;
    if (els.exportWebp30Btn) els.exportWebp30Btn.disabled = disabled;
    if (els.exportWebp60Btn) els.exportWebp60Btn.disabled = disabled;
    els.playBtn.disabled = disabled;
  }

  function updateClearButtonState() {
    els.clearOutputBtn.disabled = false;
    els.clearOutputBtn.textContent = state.isExporting ? dict().staticText.cancelExport : dict().staticText.clear;
    els.clearOutputBtn.classList.toggle('is-cancel', state.isExporting);
  }

  function setExportRunning(running) {
    state.isExporting = running;
    if (!running) state.cancelExportRequested = false;
    setExportButtonsDisabled(running);
    updateClearButtonState();
  }

  function checkExportCancelled() {
    if (state.cancelExportRequested) {
      const error = new Error('EXPORT_CANCELLED');
      error.code = 'EXPORT_CANCELLED';
      throw error;
    }
  }

  function cancelCurrentExport() {
    if (!state.isExporting) return;
    state.cancelExportRequested = true;
    setStatus(dict().messages.exportCancelling);
    showToast(dict().messages.exportCancelling, 'warning', 2600);
  }

  async function canvasToWebpBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('WebP frame encoding failed.'));
      }, 'image/webp', quality);
    });
  }

  async function blobToUint8Array(blob) {
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('PNG frame encoding failed.'));
      }, 'image/png');
    });
  }

  function writeAscii(target, offset, text) {
    for (let i = 0; i < text.length; i++) target[offset + i] = text.charCodeAt(i);
  }

  function writeUint16LE(target, offset, value) {
    target[offset] = value & 255;
    target[offset + 1] = (value >> 8) & 255;
  }

  function writeUint24LE(target, offset, value) {
    target[offset] = value & 255;
    target[offset + 1] = (value >> 8) & 255;
    target[offset + 2] = (value >> 16) & 255;
  }

  function writeUint32LE(target, offset, value) {
    target[offset] = value & 255;
    target[offset + 1] = (value >> 8) & 255;
    target[offset + 2] = (value >> 16) & 255;
    target[offset + 3] = (value >> 24) & 255;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes, start, length) {
    let crc = 0xffffffff;
    for (let i = start; i < start + length; i++) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function readUint32BE(bytes, offset) {
    return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  }

  function writeUint32BE(target, offset, value) {
    target[offset] = (value >>> 24) & 255;
    target[offset + 1] = (value >>> 16) & 255;
    target[offset + 2] = (value >>> 8) & 255;
    target[offset + 3] = value & 255;
  }

  function patchApngLoopCount(arrayBuffer, loop) {
    const bytes = new Uint8Array(arrayBuffer.slice(0));
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = readUint32BE(bytes, offset);
      const typeOffset = offset + 4;
      const type = String.fromCharCode(bytes[typeOffset], bytes[typeOffset + 1], bytes[typeOffset + 2], bytes[typeOffset + 3]);
      const dataOffset = offset + 8;
      if (type === 'acTL' && length >= 8) {
        writeUint32BE(bytes, dataOffset + 4, loop ? 0 : 1);
        const crc = crc32(bytes, typeOffset, 4 + length);
        writeUint32BE(bytes, dataOffset + length, crc);
        return bytes.buffer;
      }
      offset += 12 + length;
    }
    return arrayBuffer;
  }

  function makeChunk(name, payload) {
    const pad = payload.length % 2;
    const out = new Uint8Array(8 + payload.length + pad);
    writeAscii(out, 0, name);
    writeUint32LE(out, 4, payload.length);
    out.set(payload, 8);
    return out;
  }

  function extractWebpImageChunks(webpBytes) {
    const riff = String.fromCharCode(...webpBytes.slice(0, 4));
    const webp = String.fromCharCode(...webpBytes.slice(8, 12));
    if (riff !== 'RIFF' || webp !== 'WEBP') throw new Error('Invalid WebP frame.');
    let offset = 12;
    const chunks = [];
    while (offset + 8 <= webpBytes.length) {
      const name = String.fromCharCode(...webpBytes.slice(offset, offset + 4));
      const size = webpBytes[offset + 4] | (webpBytes[offset + 5] << 8) | (webpBytes[offset + 6] << 16) | (webpBytes[offset + 7] << 24);
      const padded = size + (size % 2);
      if (name === 'VP8 ' || name === 'VP8L' || name === 'ALPH') {
        chunks.push(webpBytes.slice(offset, offset + 8 + padded));
      }
      offset += 8 + padded;
    }
    if (!chunks.length) throw new Error('No WebP image chunks were found.');
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new Uint8Array(total);
    let cursor = 0;
    chunks.forEach(chunk => { out.set(chunk, cursor); cursor += chunk.length; });
    return out;
  }

  function concatUint8(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach(part => { out.set(part, offset); offset += part.length; });
    return out;
  }

  function buildAnimatedWebp(frameChunks, width, height, delays, loop) {
    const vp8x = new Uint8Array(10);
    vp8x[0] = 0x02;
    writeUint24LE(vp8x, 4, width - 1);
    writeUint24LE(vp8x, 7, height - 1);

    const anim = new Uint8Array(6);
    anim[0] = 0x11; anim[1] = 0x18; anim[2] = 0x27; anim[3] = 0xff;
    writeUint16LE(anim, 4, loop ? 0 : 1);

    const chunks = [makeChunk('VP8X', vp8x), makeChunk('ANIM', anim)];
    frameChunks.forEach((imageData, index) => {
      const header = new Uint8Array(16);
      writeUint24LE(header, 0, 0);
      writeUint24LE(header, 3, 0);
      writeUint24LE(header, 6, width - 1);
      writeUint24LE(header, 9, height - 1);
      writeUint24LE(header, 12, Math.max(10, delays[index] || 100));
      header[15] = 0x02;
      chunks.push(makeChunk('ANMF', concatUint8([header, imageData])));
    });

    const payload = concatUint8(chunks);
    const riff = new Uint8Array(12 + payload.length);
    writeAscii(riff, 0, 'RIFF');
    writeUint32LE(riff, 4, 4 + payload.length);
    writeAscii(riff, 8, 'WEBP');
    riff.set(payload, 12);
    return riff;
  }


  async function exportPngZip() {
    if (!state.image && !(state.images && state.images.length)) {
      setStatus(dict().messages.needImage);
      return;
    }
    if (typeof JSZip === 'undefined') {
      setStatus(dict().messages.pngZipLibraryMissing);
      return;
    }

    if (state.playing) togglePlay();
    hideDownload();

    const seconds = getSeconds();
    const setting = qualitySettings[els.qualityInput.value] || qualitySettings.standard;
    const { width, height, label: sizeLabel } = getExportSize();
    const frames = Math.max(2, Math.round(seconds * setting.fps));
    const safeName = buildOutputBaseName();
    const zip = new JSZip();
    const folder = zip.folder(safeName);

    setExportRunning(true);
    setStatus(dict().messages.pngZipStart(frames, getSizeLimitLabel()));

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    const padLength = String(frames).length;

    try {
      for (let i = 0; i < frames; i++) {
        checkExportCancelled();
        const progress = frames === 1 ? 1 : i / (frames - 1);
        drawFrame(progress, offCtx, width, height);
        const blob = await canvasToPngBlob(offscreen);
        checkExportCancelled();
        const fileName = `frame_${String(i + 1).padStart(padLength, '0')}.png`;
        folder.file(fileName, blob);
        if (i % 3 === 0 || i === frames - 1) {
          setStatus(dict().messages.pngZipProgress(i + 1, frames));
          await new Promise(resolve => setTimeout(resolve, 0));
          checkExportCancelled();
        }
      }

      checkExportCancelled();
      setStatus('PNG連番ZIP圧縮中...');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const outputName = `${safeName}_PNG連番.zip`;
      const outputSize = formatFileSize(blob.size);
      const sizeWarning = getBlobSizeWarning(blob);
      state.downloadUrl = url;
      state.downloadName = outputName;
      els.downloadLink.textContent = 'ダウンロード';
      els.downloadLink.classList.remove('is-disabled');
      els.downloadLink.setAttribute('aria-disabled', 'false');
      setStatus(dict().messages.pngZipComplete(outputName, outputSize, effectLabels[state.effect], seconds, setting.label, sizeLabel, sizeWarning));
    } catch (error) {
      if (error && error.code === 'EXPORT_CANCELLED') {
        setStatus(dict().messages.exportCancelled);
        showToast(dict().messages.exportCancelled, 'warning', 2800);
      } else {
        console.error(error);
        setStatus(dict().messages.pngZipError);
      }
    } finally {
      setExportRunning(false);
    }
  }

  async function exportWebp(options = {}) {
    const fpsOverride = options.fpsOverride || null;
    const fpsLabel = options.fpsLabel || null;
    showToast(dict().messages.webpStart(fpsLabel), 'info', 3200);
    if (!state.image && !(state.images && state.images.length)) {
      setStatus(dict().messages.needImage);
      analytics?.sendError({ error_code: 'missing_image', error_stage: 'webp_generation', feature_id: 'webp_generation', recoverable: true });
      return;
    }

    const processingStartedAt = performance.now();
    analytics?.sendFeature('webp_generation', 'webp_generation', 'execute', String(fpsOverride || 24));

    if (state.playing) togglePlay();
    hideDownload();

    const seconds = getSeconds();
    const setting = qualitySettings[els.qualityInput.value] || qualitySettings.standard;
    const outputFps = fpsOverride || setting.fps;
    const { width, height, label: sizeLabel } = getExportSize();
    const frames = Math.max(2, Math.round(seconds * outputFps));
    const totalDurationMs = Math.max(1, Math.round(seconds * 1000));
    const delays = buildFrameDelaySequence(frames, totalDurationMs);
    const safeName = buildOutputBaseName();
    const webpQuality = setting.webpQuality ?? 0.82;

    setExportRunning(true);
    setStatus(dict().messages.webpProgressStart(fpsLabel, frames, getSizeLimitLabel()));

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    const frameChunks = [];

    try {
      for (let i = 0; i < frames; i++) {
        checkExportCancelled();
        const progress = frames === 1 ? 1 : i / (frames - 1);
        drawFrame(progress, offCtx, width, height);
        const blob = await canvasToWebpBlob(offscreen, webpQuality);
        checkExportCancelled();
        const bytes = await blobToUint8Array(blob);
        checkExportCancelled();
        frameChunks.push(extractWebpImageChunks(bytes));
        if (i % 4 === 0 || i === frames - 1) {
          setStatus(dict().messages.webpProgress(fpsLabel, i + 1, frames));
          await new Promise(resolve => setTimeout(resolve, 0));
          checkExportCancelled();
        }
      }

      checkExportCancelled();
      const animatedBytes = buildAnimatedWebp(frameChunks, width, height, delays, els.loopInput.checked);
      const blob = new Blob([animatedBytes], { type: 'image/webp' });
      const url = URL.createObjectURL(blob);

      drawFrame(0, offCtx, width, height);
      const stillBlob = await canvasToPngBlob(offscreen);
      const stillUrl = URL.createObjectURL(stillBlob);

      const sizeWarning = getBlobSizeWarning(blob);
      const outputName = `${safeName}.webp`;
      const outputSize = formatFileSize(blob.size);
      state.downloadUrl = url;
      state.downloadName = outputName;
      state.stillDownloadUrl = stillUrl;
      state.stillDownloadName = `${safeName}_frame01.png`;
      els.downloadLink.textContent = 'ダウンロード';
      els.downloadLink.classList.remove('is-disabled');
      els.downloadLink.setAttribute('aria-disabled', 'false');
      showExportSizeToast(fpsLabel ? `${fpsLabel} WebP` : 'WebP', blob);
      setStatus(`${dict().messages.webpComplete(fpsLabel, outputName, outputSize, effectLabels[state.effect], els.loopInput.checked, seconds, outputFps, setting.label, sizeLabel, sizeWarning)} ${dict().messages.webpPlaybackNote}`);
      const sourceTotalBytes = state.imageFiles.reduce((sum, file) => sum + Math.max(0, Number(file?.size) || 0), 0);
      const sourceMaxBytes = state.imageFiles.reduce((max, file) => Math.max(max, Math.max(0, Number(file?.size) || 0)), 0);
      const sourceMaxDimensions = state.images.reduce((current, image) => {
        const widthValue = image?.naturalWidth || image?.width || 0;
        const heightValue = image?.naturalHeight || image?.height || 0;
        return widthValue * heightValue > current.width * current.height
          ? { width: widthValue, height: heightValue }
          : current;
      }, { width: state.imageWidth || 0, height: state.imageHeight || 0 });
      const outputAnalytics = {
        process_type: 'animated_webp',
        result_type: 'webp',
        motion_id: toAnalyticsId(state.effect),
        image_effect_id: toAnalyticsId(state.imageFilter),
        image_effect_used: state.imageFilter !== 'none',
        output_fps: outputFps,
        quality_id: els.qualityInput.value,
        output_size_id: getOutputSizeAnalyticsId(),
        output_width: width,
        output_height: height,
        output_megapixel_bucket: getMegapixelBucket(width, height),
        duration_seconds: seconds,
        duration_bucket: getDurationBucket(seconds),
        loop_enabled: els.loopInput.checked,
        input_count: state.images?.length || (state.image ? 1 : 0),
        output_count: 2,
        processing_time_ms: Math.max(0, Math.round(performance.now() - processingStartedAt)),
        source_total_bytes: sourceTotalBytes,
        source_max_bytes: sourceMaxBytes,
        source_total_size_bucket: getByteBucket(sourceTotalBytes),
        source_max_size_bucket: getByteBucket(sourceMaxBytes),
        source_megapixel_bucket: getMegapixelBucket(sourceMaxDimensions.width, sourceMaxDimensions.height),
        source_format_group: getSourceFormatGroup(state.imageFiles),
        source_has_transparency: Boolean(state.sourceHasTransparency),
        output_bytes: blob.size,
        output_size_bucket: getOutputByteBucket(blob.size),
        output_to_source_ratio_bucket: getRatioBucket(blob.size, sourceTotalBytes),
        exceeds_5mb: blob.size > MAX_OUTPUT_BYTES,
        has_warning: Boolean(sizeWarning),
        limit_bytes: MAX_OUTPUT_BYTES,
        overage_bytes: Math.max(0, blob.size - MAX_OUTPUT_BYTES),
        overage_ratio_bucket: getOverageRatioBucket(blob.size)
      };
      state.lastOutputAnalytics = outputAnalytics;
      analytics?.recordOutputResult(outputAnalytics);
      analytics?.sendSuccessOnce(`animated_webp_${outputFps}`, outputAnalytics);
    } catch (error) {
      if (error && error.code === 'EXPORT_CANCELLED') {
        setStatus(dict().messages.exportCancelled);
        showToast(dict().messages.exportCancelled, 'warning', 2800);
      } else {
        console.error(error);
        setStatus(dict().messages.webpError);
        analytics?.sendError({ error_code: 'webp_generation_failed', error_stage: 'webp_generation', feature_id: 'webp_generation', recoverable: true });
      }
    } finally {
      setExportRunning(false);
    }
  }


  els.loopInput.checked = getLoopDefault(state.effect);
  updateOutputFileName();
  updateClearButtonState();

  function hideFloatingTooltip() {
    const tooltip = document.querySelector('.floating-tooltip');
    if (tooltip) tooltip.remove();
  }

  function showFloatingTooltip(button) {
    const text = button?.dataset.tooltip;
    if (!text) return;

    hideFloatingTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'floating-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = button.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const margin = 12;
    const preferredTop = rect.top - tipRect.height - 12;
    const top = preferredTop >= margin
      ? preferredTop
      : Math.min(window.innerHeight - tipRect.height - margin, rect.bottom + 12);
    const left = Math.min(
      window.innerWidth - tipRect.width - margin,
      Math.max(margin, rect.left + rect.width / 2 - tipRect.width / 2)
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
    window.requestAnimationFrame(() => tooltip.classList.add('is-visible'));
  }

  function bindFloatingTooltips() {
    document.querySelectorAll('.has-tooltip').forEach(button => {
      button.addEventListener('mouseenter', () => showFloatingTooltip(button));
      button.addEventListener('focus', () => showFloatingTooltip(button));
      button.addEventListener('mouseleave', hideFloatingTooltip);
      button.addEventListener('blur', hideFloatingTooltip);
    });
    window.addEventListener('scroll', hideFloatingTooltip, true);
    window.addEventListener('resize', hideFloatingTooltip);
  }

  applyLanguage(getDefaultLanguage(), { silent: true });
  updateQualityRecommendation();
  updateExportNoteVisibility();

  els.helpBtn.addEventListener('click', () => toggleDrawer(els.helpDrawer));
  els.shortcutBtn.addEventListener('click', () => toggleDrawer(els.shortcutDrawer));
  els.langButtons.forEach(button => button.addEventListener('click', () => switchLanguage(button.dataset.langChoice)));
  els.drawerCloseButtons.forEach(button => button.addEventListener('click', closeDrawers));
  bindFloatingTooltips();
  function syncThemeButton() {
    const isDark = els.body.classList.contains('is-dark');
    const thumb = els.themeBtn.querySelector('.theme-toggle-thumb');
    if (thumb) thumb.textContent = isDark ? '☾' : '☀️';
    els.themeBtn.setAttribute('aria-label', isDark ? dict().messages.darkMode : dict().messages.lightMode);
    els.themeBtn.setAttribute('title', isDark ? dict().messages.darkMode : dict().messages.lightMode);
    els.themeBtn.setAttribute('aria-pressed', String(isDark));
  }

  els.themeBtn.addEventListener('click', () => {
    els.body.classList.toggle('is-dark');
    syncThemeButton();
  });

  els.dropZone.addEventListener('dragover', event => {
    event.preventDefault();
    els.dropZone.classList.add('is-dragover');
  });
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('is-dragover'));
  els.dropZone.addEventListener('drop', event => {
    event.preventDefault();
    els.dropZone.classList.remove('is-dragover');
    const files = Array.from(event.dataTransfer.files || []);
    loadFiles(files);
  });
  els.fileInput.addEventListener('change', event => loadFiles(Array.from(event.target.files || [])));

  els.loadSampleBtn?.addEventListener('click', () => {
    loadSampleImageForDev();
  });


  els.motionTab?.addEventListener('click', () => setActiveTab('motion'));
  els.imageEditTab?.addEventListener('click', () => setActiveTab('imageEdit'));

  els.imageEditGrid?.addEventListener('click', event => {
    const button = event.target.closest('.image-edit-card');
    selectImageFilter(button);
  });

  els.effectGrid.addEventListener('click', event => {
    const button = event.target.closest('.effect-card');
    selectEffect(button);
  });

  attachCardKeyboardNavigation(els.effectGrid, '.effect-card');
  attachCardKeyboardNavigation(els.imageEditGrid, '.image-edit-card');

  els.transitionThumbList?.addEventListener('dragstart', event => {
    const button = event.target.closest('.transition-thumb-card');
    if (!button) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', button.dataset.index || '0');
    button.classList.add('is-dragging');
  });

  els.transitionThumbList?.addEventListener('dragend', event => {
    event.target.closest('.transition-thumb-card')?.classList.remove('is-dragging');
  });

  els.transitionThumbList?.addEventListener('dragover', event => {
    const button = event.target.closest('.transition-thumb-card');
    if (!button) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  els.transitionThumbList?.addEventListener('drop', event => {
    const button = event.target.closest('.transition-thumb-card');
    if (!button) return;
    event.preventDefault();
    const fromIndex = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
    const toIndex = Number.parseInt(button.dataset.index || '0', 10);
    reorderTransitionImages(fromIndex, toIndex);
  });

  els.downloadLink.addEventListener('click', event => {
    event.preventDefault();
    const disabled = els.downloadLink.classList.contains('is-disabled') || !state.downloadUrl;
    if (disabled) {
      showToast(dict().messages.downloadFirst, 'warning', 4200);
      return;
    }

    const downloadTargets = [];
    if (state.stillDownloadUrl) {
      downloadTargets.push({ url: state.stillDownloadUrl, name: state.stillDownloadName || 'haikei_motion_frame01.png' });
    }
    downloadTargets.push({ url: state.downloadUrl, name: state.downloadName || 'haikei_motion' });

    downloadTargets.forEach(target => {
      const tempLink = document.createElement('a');
      tempLink.href = target.url;
      tempLink.download = target.name;
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    });
    showToast(dict().messages.downloadDone, 'success', 3200);
    analytics?.sendExport({
      export_type: 'webp_and_png',
      content_type: 'animation_and_still',
      item_count: downloadTargets.length,
      export_success: true,
      motion_id: state.lastOutputAnalytics?.motion_id || toAnalyticsId(state.effect),
      image_effect_id: state.lastOutputAnalytics?.image_effect_id || toAnalyticsId(state.imageFilter),
      image_effect_used: state.lastOutputAnalytics?.image_effect_used ?? (state.imageFilter !== 'none'),
      output_fps: state.lastOutputAnalytics?.output_fps || 0,
      output_size_bucket: state.lastOutputAnalytics?.output_size_bucket || 'unknown',
      exceeds_5mb: state.lastOutputAnalytics?.exceeds_5mb || false
    });
  });

  els.playBtn.addEventListener('click', togglePlay);
  els.exportWebpBtn.addEventListener('click', () => exportWebp({ fpsOverride: 24, fpsLabel: '24FPS' }));
  els.exportWebp30Btn?.addEventListener('click', () => exportWebp({ fpsOverride: 30, fpsLabel: '30FPS' }));
  els.exportWebp60Btn?.addEventListener('click', () => exportWebp({ fpsOverride: 60, fpsLabel: '60FPS' }));
  els.clearOutputBtn.addEventListener('click', () => {
    if (state.isExporting) {
      cancelCurrentExport();
      return;
    }
    resetImage('button');
  });

  [els.secondsInput, els.qualityInput, els.sizeInput, els.loopInput].forEach(input => {
    input.addEventListener('input', event => {
      if (event.currentTarget === els.qualityInput) {
        refreshSizeInputLabels();
      }
      updateOutputFileName();
      syncPreviewCanvasSize();
      drawFrame(state.stillFrameTime, ctx, els.previewCanvas.width, els.previewCanvas.height, { preview: true });
      hideDownload();
    });
  });

  window.addEventListener('resize', () => {
    requestPreviewPanelLayoutSync();
  });

  function clickShortcutButton(button) {
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }

  const shortcutApi = {
    openFile: () => {
      if (!els.fileInput) return false;
      closeDrawers();
      els.fileInput.value = '';
      if (typeof els.fileInput.showPicker === 'function') {
        els.fileInput.showPicker();
      } else {
        els.fileInput.click();
      }
      return true;
    },
    togglePlay: () => clickShortcutButton(els.playBtn),
    exportWebp: () => clickShortcutButton(els.exportWebpBtn),
    exportWebp30: () => clickShortcutButton(els.exportWebp30Btn),
    exportWebp60: () => clickShortcutButton(els.exportWebp60Btn),
    closeDrawers,
    clearOutputDisplay,
    resetImage: () => resetImage('shortcut'),
    toggleTheme: () => clickShortcutButton(els.themeBtn),
    isDrawerOpen: () => Boolean((els.helpDrawer && !els.helpDrawer.hidden) || (els.shortcutDrawer && !els.shortcutDrawer.hidden))
  };
  window.HaikeiMotionMaker = shortcutApi;
  globalThis.HaikeiMotionMaker = shortcutApi;

  if (window.ResizeObserver) {
    const previewLayoutObserver = new ResizeObserver(() => {
      requestPreviewPanelLayoutSync();
    });
    if (els.previewPanel) previewLayoutObserver.observe(els.previewPanel);
    if (els.previewControls) previewLayoutObserver.observe(els.previewControls);
    if (els.transitionThumbPanel) previewLayoutObserver.observe(els.transitionThumbPanel);
  }

  refreshSizeInputLabels();
  syncCardTabIndex(els.effectGrid, '.effect-card', els.effectGrid?.querySelector('.effect-card.is-active'));
  syncCardTabIndex(els.imageEditGrid, '.image-edit-card', els.imageEditGrid?.querySelector('.image-edit-card.is-active'));
  updateTransitionThumbs();
  requestPreviewPanelLayoutSync();
})();
