/*
 * 文字画像APNGメーカー — 設定パネル（宣言的なスキーマからUIを生成）
 */
(function (root) {
  'use strict';

  const E = root.TextApngEngine;
  const F = root.TextApngFonts;
  const P = root.TextApngPresets;
  const T = (ja, en) => ({ ja, en });

  /* ---------- 効果名 ---------- */

  const FX_LABELS = {
    in: {
      fade: T('フェード', 'Fade'),
      rise: T('浮かび上がる', 'Rise'),
      drop: T('降りてくる', 'Drop'),
      converge: T('上下から合流', 'Converge'),
      slide: T('スライド', 'Slide'),
      tracking: T('字間が縮まる', 'Tracking in'),
      blurIn: T('ぼかし解除', 'Blur in'),
      pop: T('ポップ', 'Pop'),
      shrinkIn: T('大きい所から', 'Shrink in'),
      spin: T('回転', 'Spin'),
      flip: T('めくれる', 'Flip'),
      bounce: T('落下バウンド', 'Bounce'),
      scatter: T('集合', 'Assemble'),
      typewriter: T('タイプライター', 'Typewriter'),
      flicker: T('明滅', 'Flicker'),
      slam: T('叩きつけ', 'Slam'),
      zoomIn: T('迫ってくる', 'Zoom in'),
      emerge: T('奥から現れる', 'Emerge'),
      wipe: T('ワイプ', 'Wipe'),
      shutter: T('展開', 'Unfold'),
      glitch: T('グリッチ', 'Glitch'),
      flash: T('閃光', 'Flash')
    },
    out: {
      none: T('消さない', 'Keep'),
      fade: T('フェード', 'Fade'),
      rise: T('上へ消える', 'Float away'),
      sink: T('下へ沈む', 'Sink'),
      diverge: T('上下に分かれる', 'Diverge'),
      slide: T('スライド', 'Slide'),
      tracking: T('字間が広がる', 'Tracking out'),
      blurOut: T('ぼやける', 'Blur out'),
      growOut: T('膨らんで消える', 'Grow out'),
      shrink: T('縮んで消える', 'Shrink'),
      scatter: T('飛び散る', 'Scatter'),
      erase: T('1文字ずつ消去', 'Erase'),
      flicker: T('明滅', 'Flicker'),
      zoomThrough: T('迫って消える', 'Zoom through'),
      recede: T('遠ざかる', 'Recede'),
      wipe: T('ワイプ', 'Wipe'),
      shutter: T('閉じる', 'Fold'),
      glitch: T('グリッチ', 'Glitch')
    },
    hold: {
      none: T('なし', 'None'),
      float: T('ふわふわ', 'Float'),
      wave: T('波打つ', 'Wave'),
      pulse: T('鼓動', 'Heartbeat'),
      shake: T('震え', 'Tremble'),
      glow: T('発光の明滅', 'Glow pulse'),
      flicker: T('ちらつき', 'Flicker'),
      glitch: T('時々ノイズ', 'Glitch bursts')
    }
  };

  const OPT = {
    order: [
      { value: 'forward', label: T('先頭から', 'From the start') },
      { value: 'reverse', label: T('末尾から', 'From the end') },
      { value: 'center', label: T('中央から', 'From the center') },
      { value: 'edges', label: T('両端から', 'From the edges') },
      { value: 'random', label: T('ランダム', 'Random') }
    ],
    ease: [
      { value: 'auto', label: T('おまかせ', 'Auto') },
      { value: 'out', label: T('減速', 'Ease out') },
      { value: 'strong', label: T('強い減速', 'Strong ease out') },
      { value: 'smooth', label: T('なめらか', 'Smooth') },
      { value: 'back', label: T('行き過ぎて戻る', 'Back') },
      { value: 'elastic', label: T('バネ', 'Elastic') },
      { value: 'bounce', label: T('バウンド', 'Bounce') },
      { value: 'linear', label: T('一定', 'Linear') },
      { value: 'in', label: T('加速', 'Ease in') }
    ],
    dirs: {
      left: T('左', 'Left'), right: T('右', 'Right'), up: T('上', 'Up'), down: T('下', 'Down'),
      lr: T('左 → 右', 'Left → Right'), rl: T('右 → 左', 'Right → Left'), tb: T('上 → 下', 'Top → Bottom'), bt: T('下 → 上', 'Bottom → Top'),
      center: T('中央から', 'From center'), v: T('上下に', 'Vertical'), h: T('左右に', 'Horizontal')
    },
    reveal: [
      { value: 'char', label: T('1文字ずつ', 'Per character') },
      { value: 'line', label: T('1行ずつ', 'Per line') },
      { value: 'sweep', label: T('なめらかに流れる', 'Smooth sweep') },
      { value: 'all', label: T('全体を同時に', 'All at once') },
      { value: 'scroll', label: T('スクロール', 'Scroll') }
    ],
    subFx: [
      { value: 'same', label: T('メインと同じ', 'Same as main') },
      { value: 'fade', label: T('フェード', 'Fade') },
      { value: 'rise', label: T('浮かび上がる', 'Rise') },
      { value: 'blurIn', label: T('ぼかし解除', 'Blur in') },
      { value: 'tracking', label: T('字間が縮まる', 'Tracking in') },
      { value: 'typewriter', label: T('タイプライター', 'Typewriter') },
      { value: 'slide', label: T('スライド', 'Slide') }
    ],
    deco: [
      { value: 'none', label: T('なし', 'None') },
      { value: 'band', label: T('帯', 'Band') },
      { value: 'box', label: T('ボックス', 'Box') },
      { value: 'lines', label: T('上下ライン', 'Lines') },
      { value: 'underline', label: T('下線', 'Underline') },
      { value: 'sides', label: T('サイドライン', 'Side lines') },
      { value: 'bar', label: T('アクセントバー', 'Accent bar') },
      { value: 'corners', label: T('コーナー枠', 'Corners') }
    ],
    decoAnim: [
      { value: 'grow', label: T('伸びる', 'Grow') },
      { value: 'fade', label: T('フェード', 'Fade') },
      { value: 'none', label: T('なし', 'None') }
    ],
    bg: [
      { value: 'none', label: T('なし（透明）', 'None (clear)') },
      { value: 'solid', label: T('単色', 'Solid') },
      { value: 'vignette', label: T('ビネット', 'Vignette') },
      { value: 'bottom', label: T('下からグラデ', 'Bottom fade') },
      { value: 'top', label: T('上からグラデ', 'Top fade') }
    ],
    writing: [
      { value: 'h', label: T('横書き', 'Horizontal') },
      { value: 'v', label: T('縦書き', 'Vertical') }
    ],
    fillType: [
      { value: 'solid', label: T('単色', 'Solid') },
      { value: 'gradient', label: T('グラデーション', 'Gradient') }
    ],
    gradDir: [
      { value: 'v', label: T('縦（1行ごと）', 'Vertical (per line)') },
      { value: 'h', label: T('横（全体）', 'Horizontal (whole)') },
      { value: 'd', label: T('斜め（全体）', 'Diagonal (whole)') }
    ]
  };

  const FORMATS = {
    s: { digits: 2, suffix: T('秒', 's') },
    sSigned: { digits: 2, suffix: T('秒', 's') },
    px: { digits: 0, suffix: T('px', 'px') },
    pct: { digits: 0, suffix: T('%', '%'), mul: 100 },
    x: { digits: 2, suffix: T('倍', '×') },
    em: { digits: 2, suffix: T('em', 'em') },
    cps: { digits: 0, suffix: T('字/秒', 'chars/s') },
    pxs: { digits: 0, suffix: T('px/秒', 'px/s') },
    chars: { digits: 0, suffix: T('字', 'chars') }
  };

  const isTrailer = s => s.mode === 'trailer';
  const notTrailer = s => s.mode !== 'trailer';
  const inDef = s => E.IN_MAP[s.inFx] || E.IN_MAP.fade;
  const outDef = s => E.OUT_MAP[s.outFx] || E.OUT_MAP.fade;
  const decoIs = (...types) => s => types.includes(s.deco.type);

  function fontWeightOptions(fontId) {
    const font = F.get(fontId) || F.get('noto-sans-jp');
    const names = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
    return (font.weights || [400]).map(w => ({ value: w, label: T(`${w}（${names[w] || w}）`, `${w} (${names[w] || w})`) }));
  }

  function fontSelectOptions(includeSame) {
    const opts = [];
    if (includeSame) opts.push({ value: 'same', label: T('メインと同じ', 'Same as main') });
    F.CATEGORIES.forEach(cat => {
      const fonts = F.list().filter(f => f.cat === cat.id);
      if (!fonts.length) return;
      opts.push({ group: cat.label, options: fonts.map(f => ({ value: f.id, label: T(f.label || f.family, f.label || f.family) })) });
    });
    return opts;
  }

  const SCHEMA = {
    text: [
      { type: 'textarea', bind: 'text', id: 'mainTextInput', label: s => (isTrailer(s) ? T('本文', 'Body text') : T('メインテキスト', 'Main text')), rows: s => (isTrailer(s) ? 8 : 2) },
      { type: 'note', when: isTrailer, text: T('改行はそのまま反映されます。何も書かない行（空行）でページを区切れます。', 'Line breaks are kept. A blank line starts a new page.') },
      { type: 'text', bind: 'subText', when: notTrailer, label: T('サブテキスト（任意）', 'Sub text (optional)'), placeholder: T('例：BATTLE START ／ 放課後 16:30', 'e.g. BATTLE START / 4:30 PM') },
      { type: 'segment', bind: 'subPosition', when: notTrailer, label: T('サブテキストの位置', 'Sub text position'),
        options: s => (s.writing === 'v'
          ? [{ value: 'above', label: T('右（前）', 'Right (before)') }, { value: 'below', label: T('左（後）', 'Left (after)') }]
          : [{ value: 'above', label: T('上', 'Above') }, { value: 'below', label: T('下', 'Below') }]) },
      { type: 'segment', bind: 'writing', label: T('書字方向', 'Writing direction'), options: OPT.writing },
      { type: 'segment', bind: 'align', label: T('揃え', 'Alignment'),
        options: s => (s.writing === 'v'
          ? [{ value: 'start', label: T('上', 'Top') }, { value: 'center', label: T('中央', 'Center') }, { value: 'end', label: T('下', 'Bottom') }]
          : [{ value: 'start', label: T('左', 'Left') }, { value: 'center', label: T('中央', 'Center') }, { value: 'end', label: T('右', 'Right') }]) },
      { type: 'range', bind: 'wrapChars', when: isTrailer, label: T('自動改行（1行の最大文字数・0で改行しない）', 'Auto wrap (max chars per line, 0 = off)'), min: 0, max: 60, step: 1, format: 'chars' },
      { type: 'toggle', bind: 'pageSplit', when: s => isTrailer(s) && s.reveal !== 'scroll', label: T('空行でページを分ける', 'Split pages at blank lines') },
      { type: 'toggle', bind: 'autoFit', label: T('はみ出す場合は自動で縮小する', 'Shrink automatically when the text overflows') },
      { type: 'dynamicNote', key: 'autoFit' }
    ],
    font: [
      { type: 'fontPicker', bind: 'fontId', label: T('フォント', 'Font') },
      { type: 'select', bind: 'weight', label: T('太さ', 'Weight'), options: s => fontWeightOptions(s.fontId), numeric: true },
      { type: 'range', bind: 'fontSize', label: T('文字サイズ', 'Font size'), min: 12, max: 400, step: 1, format: 'px' },
      { type: 'range', bind: 'letterSpacing', label: T('字間', 'Letter spacing'), min: -0.2, max: 1.2, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'lineHeight', label: T('行間', 'Line height'), min: 0.9, max: 3.2, step: 0.05, format: 'x' },
      { type: 'heading', when: notTrailer, label: T('サブテキスト', 'Sub text') },
      { type: 'select', bind: 'subFontId', when: notTrailer, label: T('サブのフォント', 'Sub font'), options: () => fontSelectOptions(true) },
      { type: 'select', bind: 'subWeight', when: notTrailer, label: T('サブの太さ', 'Sub weight'), options: s => fontWeightOptions(s.subFontId === 'same' ? s.fontId : s.subFontId), numeric: true },
      { type: 'range', bind: 'subSize', when: notTrailer, label: T('サブの大きさ（メイン比）', 'Sub size (vs. main)'), min: 0.1, max: 0.9, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'subLetterSpacing', when: notTrailer, label: T('サブの字間', 'Sub letter spacing'), min: -0.2, max: 1.5, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'subGap', when: notTrailer, label: T('メインとの間隔', 'Gap from the main text'), min: 0, max: 1.5, step: 0.01, format: 'em' }
    ],
    motion: [
      { type: 'section', when: isTrailer, label: T('表示の流れ', 'Reveal flow'), children: [
        { type: 'chips', bind: 'reveal', options: OPT.reveal },
        { type: 'range', bind: 'cps', when: s => s.reveal === 'char', label: T('表示スピード', 'Speed'), min: 2, max: 40, step: 1, format: 'cps' },
        { type: 'range', bind: 'glyphDur', when: s => s.reveal !== 'scroll' && s.inFx !== 'typewriter', label: T('1文字が現れるまでの時間', 'Fade time per character'), min: 0, max: 2, step: 0.05, format: 's' },
        { type: 'range', bind: 'punctPause', when: s => s.reveal === 'char', label: T('句読点での間', 'Pause at punctuation'), min: 0, max: 1.5, step: 0.05, format: 's' },
        { type: 'range', bind: 'linePause', when: s => s.reveal === 'char', label: T('改行での間', 'Pause at line breaks'), min: 0, max: 2, step: 0.05, format: 's' },
        { type: 'range', bind: 'lineInterval', when: s => s.reveal === 'line' || s.reveal === 'sweep', label: T('次の行までの時間', 'Time between lines'), min: 0.1, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'sweepDur', when: s => s.reveal === 'sweep', label: T('1行が流れる時間', 'Sweep time per line'), min: 0.2, max: 5, step: 0.05, format: 's' },
        { type: 'range', bind: 'scrollSpeed', when: s => s.reveal === 'scroll', label: T('スクロール速度', 'Scroll speed'), min: 10, max: 400, step: 5, format: 'pxs' },
        { type: 'toggle', bind: 'scrollFade', when: s => s.reveal === 'scroll', label: T('画面の端でフェードさせる', 'Fade near the edges') },
        { type: 'toggle', bind: 'cursor', when: s => s.reveal === 'char', label: T('入力カーソルを表示', 'Show a typing cursor') },
        { type: 'range', bind: 'pageGap', when: s => s.reveal !== 'scroll' && s.pageSplit, label: T('ページ間の空白', 'Gap between pages'), min: 0, max: 3, step: 0.05, format: 's' }
      ] },
      { type: 'section', label: s => (isTrailer(s) ? T('1文字の現れ方', 'How each character appears') : T('登場', 'In')), children: [
        { type: 'effects', phase: 'in' },
        { type: 'select', bind: 'inDir', when: s => Boolean(inDef(s).dirs), label: T('方向', 'Direction'), options: s => (inDef(s).dirs || []).map(d => ({ value: d, label: OPT.dirs[d] })) },
        { type: 'range', bind: 'inDur', when: s => notTrailer(s) && s.inFx !== 'typewriter', label: T('時間', 'Duration'), min: 0.05, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'inStagger', when: s => notTrailer(s) && inDef(s).level === 'glyph', label: T('文字ごとのずらし', 'Delay between characters'), min: 0, max: 0.6, step: 0.01, format: 's' },
        { type: 'select', bind: 'inOrder', when: s => notTrailer(s) && inDef(s).level === 'glyph', label: T('順番', 'Order'), options: OPT.order },
        { type: 'select', bind: 'inEase', when: s => s.inFx !== 'typewriter', label: T('動きのカーブ', 'Easing'), options: OPT.ease },
        { type: 'range', bind: 'inPower', when: s => !['fade', 'typewriter'].includes(s.inFx), label: T('強さ', 'Strength'), min: 0.2, max: 2.5, step: 0.05, format: 'x' }
      ] },
      { type: 'section', label: s => (isTrailer(s) && s.reveal !== 'scroll' ? T('表示中（各ページ）', 'Hold (each page)') : T('表示中', 'Hold')), children: [
        { type: 'range', bind: 'hold', when: s => !(isTrailer(s) && s.reveal === 'scroll'), label: T('表示時間', 'Hold time'), min: 0, max: 10, step: 0.1, format: 's' },
        { type: 'chips', bind: 'holdFx', options: Object.keys(FX_LABELS.hold).map(id => ({ value: id, label: FX_LABELS.hold[id] })) },
        { type: 'range', bind: 'holdPower', when: s => s.holdFx !== 'none', label: T('強さ', 'Strength'), min: 0.2, max: 3, step: 0.05, format: 'x' },
        { type: 'dynamicNote', key: 'hold' }
      ] },
      { type: 'section', when: s => !(isTrailer(s) && s.reveal === 'scroll'), label: s => (isTrailer(s) ? T('退場（各ページ）', 'Out (each page)') : T('退場', 'Out')), children: [
        { type: 'effects', phase: 'out' },
        { type: 'select', bind: 'outDir', when: s => Boolean(outDef(s).dirs), label: T('方向', 'Direction'), options: s => (outDef(s).dirs || []).map(d => ({ value: d, label: OPT.dirs[d] })) },
        { type: 'range', bind: 'outDur', when: s => !['none', 'erase'].includes(s.outFx), label: T('時間', 'Duration'), min: 0.05, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'outStagger', when: s => outDef(s).level === 'glyph', label: T('文字ごとのずらし', 'Delay between characters'), min: 0, max: 0.6, step: 0.01, format: 's' },
        { type: 'select', bind: 'outOrder', when: s => outDef(s).level === 'glyph', label: T('順番', 'Order'), options: OPT.order },
        { type: 'select', bind: 'outEase', when: s => !['none', 'erase'].includes(s.outFx), label: T('動きのカーブ', 'Easing'), options: OPT.ease },
        { type: 'range', bind: 'outPower', when: s => !['none', 'fade', 'erase'].includes(s.outFx), label: T('強さ', 'Strength'), min: 0.2, max: 2.5, step: 0.05, format: 'x' }
      ] },
      { type: 'section', label: T('タイミング', 'Timing'), children: [
        { type: 'select', bind: 'subFx', when: notTrailer, label: T('サブテキストの登場', 'Sub text entrance'), options: OPT.subFx },
        { type: 'range', bind: 'subDelay', when: notTrailer, label: T('サブの登場（メイン登場完了からの差）', 'Sub text timing (after main finishes)'), min: -2, max: 2, step: 0.05, format: 'sSigned' },
        { type: 'range', bind: 'startDelay', label: T('開始前の空白', 'Blank time before'), min: 0, max: 3, step: 0.05, format: 's' },
        { type: 'range', bind: 'endDelay', label: T('終了後の空白', 'Blank time after'), min: 0, max: 5, step: 0.05, format: 's' },
        { type: 'dynamicNote', key: 'duration' }
      ] }
    ],
    style: [
      { type: 'stylePresets', label: T('スタイルプリセット', 'Style presets') },
      { type: 'section', label: T('文字の塗り', 'Fill'), children: [
        { type: 'segment', bind: 'fill.type', options: OPT.fillType },
        { type: 'colors', items: [
          { bind: 'fill.color', label: s => (s.fill.type === 'gradient' ? T('色1', 'Color 1') : T('色', 'Color')) },
          { bind: 'fill.color2', label: T('色2', 'Color 2'), when: s => s.fill.type === 'gradient' },
          { bind: 'fill.color3', label: T('色3', 'Color 3'), when: s => s.fill.type === 'gradient', optional: true }
        ] },
        { type: 'segment', bind: 'fill.dir', when: s => s.fill.type === 'gradient', label: T('グラデーションの向き', 'Gradient direction'), options: OPT.gradDir },
        { type: 'gradientPresets', when: s => s.fill.type === 'gradient' },
        { type: 'range', bind: 'fillOpacity', label: T('塗りの不透明度', 'Fill opacity'), min: 0, max: 1, step: 0.01, format: 'pct' }
      ] },
      { type: 'section', label: T('縁取り', 'Outline'), toggle: 'stroke.on', children: [
        { type: 'colors', items: [{ bind: 'stroke.color', label: T('色', 'Color') }] },
        { type: 'range', bind: 'stroke.width', label: T('太さ', 'Width'), min: 0.5, max: 30, step: 0.5, format: 'px' }
      ] },
      { type: 'section', label: T('外側の縁取り', 'Outer outline'), toggle: 'stroke2.on', children: [
        { type: 'colors', items: [{ bind: 'stroke2.color', label: T('色', 'Color') }] },
        { type: 'range', bind: 'stroke2.width', label: T('太さ', 'Width'), min: 0.5, max: 40, step: 0.5, format: 'px' }
      ] },
      { type: 'section', label: T('影', 'Shadow'), toggle: 'shadow.on', children: [
        { type: 'colors', items: [{ bind: 'shadow.color', label: T('色', 'Color') }] },
        { type: 'range', bind: 'shadow.opacity', label: T('濃さ', 'Opacity'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'shadow.blur', label: T('ぼかし', 'Blur'), min: 0, max: 80, step: 1, format: 'px' },
        { type: 'range', bind: 'shadow.x', label: T('横のずれ', 'Offset X'), min: -60, max: 60, step: 1, format: 'px' },
        { type: 'range', bind: 'shadow.y', label: T('縦のずれ', 'Offset Y'), min: -60, max: 60, step: 1, format: 'px' }
      ] },
      { type: 'section', label: T('光彩（グロー）', 'Glow'), toggle: 'glow.on', children: [
        { type: 'colors', items: [{ bind: 'glow.color', label: T('色', 'Color') }] },
        { type: 'range', bind: 'glow.size', label: T('広がり', 'Size'), min: 2, max: 150, step: 1, format: 'px' },
        { type: 'range', bind: 'glow.strength', label: T('強さ', 'Strength'), min: 0.2, max: 3, step: 0.05, format: 'x' }
      ] },
      { type: 'section', when: notTrailer, label: T('サブテキストを別の色にする', 'Different color for sub text'), toggle: 'subColorOn', children: [
        { type: 'colors', items: [{ bind: 'subColor', label: T('色', 'Color') }] }
      ] },
      { type: 'section', when: s => isTrailer(s) && s.cursor, label: T('カーソル', 'Cursor'), children: [
        { type: 'colors', items: [{ bind: 'cursorColor', label: T('色（空欄で文字色）', 'Color (blank = text color)'), optional: true }] }
      ] }
    ],
    layout: [
      { type: 'section', label: T('装飾', 'Decoration'), children: [
        { type: 'chips', bind: 'deco.type', options: OPT.deco },
        { type: 'colors', when: s => s.deco.type !== 'none', items: [
          { bind: 'deco.color', label: T('塗り', 'Fill'), when: decoIs('band', 'box') },
          { bind: 'deco.color2', label: T('線', 'Line'), when: decoIs('box', 'lines', 'underline', 'sides', 'bar', 'corners') }
        ] },
        { type: 'range', bind: 'deco.opacity', when: decoIs('band', 'box'), label: T('塗りの濃さ', 'Fill opacity'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.thickness', when: decoIs('box', 'lines', 'underline', 'sides', 'bar', 'corners'), label: s => (s.deco.type === 'box' ? T('枠線の太さ（0で枠なし）', 'Border width (0 = none)') : T('線の太さ', 'Line width')), min: 0, max: 16, step: 0.5, format: 'px' },
        { type: 'range', bind: 'deco.pad', when: s => s.deco.type !== 'none', label: T('文字との余白', 'Padding'), min: 0, max: 2, step: 0.01, format: 'em' },
        { type: 'range', bind: 'deco.extend', when: decoIs('lines', 'underline', 'sides'), label: T('線の長さ', 'Line length'), min: 0, max: 4, step: 0.05, format: 'em' },
        { type: 'range', bind: 'deco.soft', when: decoIs('band'), label: T('ふちのぼかし', 'Edge softness'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.sideFade', when: decoIs('band'), label: T('両端のフェード', 'End fade'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.radius', when: decoIs('box'), label: T('角の丸み', 'Corner radius'), min: 0, max: 1, step: 0.01, format: 'em' },
        { type: 'segment', bind: 'deco.anim', when: s => s.deco.type !== 'none', label: T('装飾のアニメーション', 'Decoration animation'), options: OPT.decoAnim },
        { type: 'range', bind: 'deco.dur', when: s => s.deco.type !== 'none' && s.deco.anim !== 'none', label: T('装飾のアニメーション時間', 'Decoration animation time'), min: 0.1, max: 2.5, step: 0.05, format: 's' }
      ] },
      { type: 'section', label: T('背景（画像全体）', 'Background (whole image)'), children: [
        { type: 'chips', bind: 'bg.type', options: OPT.bg },
        { type: 'colors', when: s => s.bg.type !== 'none', items: [{ bind: 'bg.color', label: T('色', 'Color') }] },
        { type: 'range', bind: 'bg.opacity', when: s => s.bg.type !== 'none', label: T('濃さ', 'Opacity'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'toggle', bind: 'bg.sync', when: s => s.bg.type !== 'none', label: T('文字の登場・退場に合わせてフェード', 'Fade with the text') }
      ] },
      { type: 'section', label: T('画像サイズ', 'Image size'), children: [
        { type: 'size' }
      ] },
      { type: 'section', label: T('配置', 'Position'), children: [
        { type: 'anchor', bind: 'anchor', label: T('基準位置', 'Anchor') },
        { type: 'range', bind: 'marginX', label: T('左右の余白', 'Side margin'), min: 0, max: 400, step: 1, format: 'px' },
        { type: 'range', bind: 'marginY', label: T('上下の余白', 'Top/bottom margin'), min: 0, max: 400, step: 1, format: 'px' },
        { type: 'range', bind: 'offsetX', label: T('横の微調整', 'Nudge X'), min: -800, max: 800, step: 1, format: 'px' },
        { type: 'range', bind: 'offsetY', label: T('縦の微調整', 'Nudge Y'), min: -800, max: 800, step: 1, format: 'px' }
      ] }
    ]
  };

  /* ---------- 小さなヘルパー ---------- */

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach(k => {
      if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  let uid = 0;
  const nextId = prefix => `${prefix}-${++uid}`;

  /* ---------- 効果カードの小さなプレビュー ---------- */

  class MiniPreviews {
    constructor(getScene) {
      this.getScene = getScene;
      this.renderer = new E.TextRenderer({ resolveFont: id => F.families(id) });
      this.canvas = document.createElement('canvas');
      this.canvas.width = 320;
      this.canvas.height = 180;
      this.ctx = this.canvas.getContext('2d');
      this.cards = [];
      this.active = null;
      this.raf = 0;
      this.timer = 0;
    }

    register(card, canvas, phase, fxId) {
      const entry = { card, canvas, phase, fxId };
      this.cards.push(entry);
      const start = () => this.play(entry);
      const stop = () => this.stop(entry);
      card.addEventListener('mouseenter', start);
      card.addEventListener('focus', start);
      card.addEventListener('mouseleave', stop);
      card.addEventListener('blur', stop);
      return entry;
    }

    clear() {
      this.stop();
      this.cards = [];
    }

    sceneFor(phase, fxId) {
      const base = this.getScene();
      const chars = E.graphemes(String(base.text || '').replace(/\s+/g, '')).slice(0, 3).join('') || 'あA';
      const scene = P.deepMerge(P.clone(P.BASE), {
        mode: 'message', text: chars, subText: '', width: 320, height: 180, marginX: 18, marginY: 12,
        fontId: base.fontId, weight: base.weight, fontSize: 70, letterSpacing: 0.04, writing: 'h',
        fill: { type: 'solid', color: '#ffffff' }, fillOpacity: 1,
        stroke: { on: true, width: 4, color: '#1b1b1f' }, stroke2: { on: false },
        shadow: { on: true, color: '#000000', opacity: 0.45, blur: 6, x: 0, y: 3 }, glow: { on: false },
        deco: { type: 'none' }, bg: { type: 'none' }, holdFx: 'none', startDelay: 0.15, endDelay: 0.35, subFx: 'same'
      });
      if (phase === 'in') {
        const fx = E.IN_MAP[fxId] || E.IN_MAP.fade;
        Object.assign(scene, {
          inFx: fx.id, inDur: fx.dur, inStagger: fx.level === 'glyph' ? Math.max(fx.stagger || 0, fx.id === 'typewriter' ? 0.18 : 0.08) : 0,
          inDir: (fx.dirs || [])[0], hold: 0.7, outFx: 'fade', outDur: 0.25
        });
      } else {
        const fx = E.OUT_MAP[fxId] || E.OUT_MAP.fade;
        Object.assign(scene, {
          inFx: 'fade', inDur: 0.25, hold: 0.55, outFx: fx.id, outDur: fx.dur || 0,
          outStagger: fx.level === 'glyph' ? Math.max(fx.stagger || 0, fx.id === 'erase' ? 0.15 : 0.08) : 0,
          outOrder: fx.id === 'erase' ? 'reverse' : 'forward', outDir: (fx.dirs || [])[0]
        });
      }
      return scene;
    }

    staticTime(phase, prepared) {
      const T = prepared.timeline;
      const pg = T.pages[0];
      if (!pg) return 0;
      if (phase === 'in') {
        const span = pg.inEnd - pg.textStart;
        return pg.textStart + span * 0.55;
      }
      const span = Number.isFinite(pg.outEnd) ? pg.outEnd - pg.holdEnd : 0;
      return pg.holdEnd + span * 0.45;
    }

    drawEntry(entry, t) {
      const prepared = this.renderer.prepare(this.sceneFor(entry.phase, entry.fxId));
      const time = t === undefined ? this.staticTime(entry.phase, prepared) : t;
      this.renderer.render(this.ctx, time, { scale: 1 });
      const c = entry.canvas;
      const cctx = c.getContext('2d');
      cctx.clearRect(0, 0, c.width, c.height);
      cctx.drawImage(this.canvas, 0, 0, c.width, c.height);
      return prepared;
    }

    refreshAll() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.cards.forEach(entry => {
          if (entry !== this.active && entry.canvas.isConnected) this.drawEntry(entry);
        });
      }, 60);
    }

    play(entry) {
      this.stop();
      this.active = entry;
      const prepared = this.renderer.prepare(this.sceneFor(entry.phase, entry.fxId));
      const loopDur = prepared.timeline.duration + 0.25;
      const start = performance.now();
      const step = now => {
        if (this.active !== entry) return;
        const t = ((now - start) / 1000) % loopDur;
        this.drawEntry(entry, Math.min(t, prepared.timeline.duration));
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }

    stop(entry) {
      if (entry && this.active !== entry) return;
      const prev = this.active;
      this.active = null;
      cancelAnimationFrame(this.raf);
      if (prev && prev.canvas.isConnected) this.drawEntry(prev);
    }
  }

  /* ---------- パネル生成 ---------- */

  class ControlPanel {
    constructor(options) {
      this.getScene = options.getScene;
      this.getLang = options.getLang;
      this.onChange = options.onChange;
      this.onAction = options.onAction;
      this.getInfo = options.getInfo;
      this.bindings = [];
      this.mini = new MiniPreviews(this.getScene);
      this.fontPanelOpen = false;
      this.fontCategory = 'all';
    }

    L(label) {
      if (!label) return '';
      const value = typeof label === 'function' ? label(this.getScene()) : label;
      if (typeof value === 'string') return value;
      return value[this.getLang()] ?? value.ja;
    }

    add(refresh) {
      this.bindings.push(refresh);
      return refresh;
    }

    set(path, value, meta) {
      this.onChange(path, value, meta || {});
    }

    render(tabId, container) {
      this.bindings = [];
      this.mini.clear();
      container.innerHTML = '';
      (SCHEMA[tabId] || []).forEach(item => container.appendChild(this.build(item)));
      this.refresh();
    }

    refresh() {
      const scene = this.getScene();
      this.bindings.forEach(fn => fn(scene));
    }

    withVisibility(node, item) {
      if (!item.when) return node;
      this.add(scene => { node.hidden = !item.when(scene); });
      return node;
    }

    field(item, control, extraClass = '') {
      const id = control.id || nextId('ctl');
      control.id = id;
      const label = el('label', { class: 'field-label', for: id });
      this.add(() => { label.textContent = this.L(item.label); });
      const node = el('div', { class: `field ${extraClass}`.trim() }, [label, control]);
      return this.withVisibility(node, item);
    }

    build(item) {
      switch (item.type) {
        case 'section': return this.buildSection(item);
        case 'heading': {
          const node = el('h3', { class: 'field-heading' });
          this.add(() => { node.textContent = this.L(item.label); });
          return this.withVisibility(node, item);
        }
        case 'note': {
          const node = el('p', { class: 'field-note' });
          this.add(() => { node.textContent = this.L(item.text); });
          return this.withVisibility(node, item);
        }
        case 'dynamicNote': {
          const node = el('p', { class: 'field-note is-dynamic' });
          this.add(() => {
            const text = this.getInfo ? this.getInfo(item.key) : '';
            node.textContent = text || '';
            node.hidden = !text;
          });
          return node;
        }
        case 'textarea': return this.buildTextarea(item);
        case 'text': return this.buildText(item);
        case 'range': return this.buildRange(item);
        case 'select': return this.buildSelect(item);
        case 'segment': return this.buildSegment(item, 'segment');
        case 'chips': return this.buildSegment(item, 'chips');
        case 'toggle': return this.buildToggle(item);
        case 'colors': return this.buildColors(item);
        case 'effects': return this.buildEffects(item);
        case 'fontPicker': return this.buildFontPicker(item);
        case 'stylePresets': return this.buildStylePresets(item);
        case 'gradientPresets': return this.buildGradientPresets(item);
        case 'anchor': return this.buildAnchor(item);
        case 'size': return this.buildSize(item);
        default: return el('div');
      }
    }

    buildSection(item) {
      const title = el('h3', { class: 'section-title' });
      const head = el('div', { class: 'section-head' }, [title]);
      const body = el('div', { class: 'section-body' });
      const node = el('section', { class: 'control-section' }, [head, body]);
      this.add(() => { title.textContent = this.L(item.label); });
      if (item.toggle) {
        const input = el('input', { type: 'checkbox', class: 'switch-input' });
        const sw = el('label', { class: 'switch' }, [input, el('span', { class: 'switch-track', 'aria-hidden': 'true' })]);
        input.addEventListener('change', () => this.set(item.toggle, input.checked));
        head.appendChild(sw);
        this.add(scene => {
          const on = Boolean(getPath(scene, item.toggle));
          input.checked = on;
          input.setAttribute('aria-label', this.L(item.label));
          body.hidden = !on;
          node.classList.toggle('is-off', !on);
        });
      }
      item.children.forEach(child => body.appendChild(this.build(child)));
      return this.withVisibility(node, item);
    }

    buildTextarea(item) {
      const ta = el('textarea', { class: 'text-input', id: item.id, spellcheck: 'false' });
      ta.addEventListener('input', () => this.set(item.bind, ta.value, { text: true }));
      this.add(scene => {
        const v = getPath(scene, item.bind) ?? '';
        if (ta.value !== v) ta.value = v;
        ta.rows = typeof item.rows === 'function' ? item.rows(scene) : (item.rows || 3);
      });
      return this.field(item, ta, 'field-wide');
    }

    buildText(item) {
      const input = el('input', { type: 'text', class: 'text-input', spellcheck: 'false' });
      input.addEventListener('input', () => this.set(item.bind, input.value, { text: true }));
      this.add(scene => {
        const v = getPath(scene, item.bind) ?? '';
        if (input.value !== v) input.value = v;
        input.placeholder = this.L(item.placeholder);
      });
      return this.field(item, input, 'field-wide');
    }

    buildRange(item) {
      const fmt = FORMATS[item.format] || { digits: 2, suffix: T('', '') };
      const mul = fmt.mul || 1;
      const range = el('input', { type: 'range', class: 'range-input', min: item.min, max: item.max, step: item.step });
      const number = el('input', { type: 'number', class: 'number-input', min: item.min * mul, max: item.max * mul, step: item.step * mul, inputmode: 'decimal' });
      const suffix = el('span', { class: 'number-suffix' });
      const id = nextId('rng');
      range.id = id;
      number.setAttribute('aria-labelledby', `${id}-label`);
      const commit = (raw, fromNumber) => {
        let v = Number(raw);
        if (!Number.isFinite(v)) return;
        if (fromNumber) v /= mul;
        const precision = String(item.step).split('.')[1];
        v = Number(v.toFixed(precision ? precision.length : 0));
        this.set(item.bind, v, { live: !fromNumber });
      };
      range.addEventListener('input', () => commit(range.value, false));
      number.addEventListener('change', () => commit(number.value, true));
      const label = el('label', { class: 'field-label', for: id, id: `${id}-label` });
      const valueBox = el('span', { class: 'number-box' }, [number, suffix]);
      const node = el('div', { class: 'field field-range' }, [el('div', { class: 'field-row' }, [label, valueBox]), range]);
      this.add(scene => {
        label.textContent = this.L(item.label);
        suffix.textContent = this.L(fmt.suffix);
        const v = Number(getPath(scene, item.bind) ?? 0);
        if (document.activeElement !== range) range.value = String(v);
        if (document.activeElement !== number) number.value = (v * mul).toFixed(fmt.digits);
      });
      return this.withVisibility(node, item);
    }

    fillOptions(select, options) {
      const key = JSON.stringify(options.map(o => (o.group ? [this.L(o.group), o.options.map(x => x.value)] : [o.value, this.L(o.label)])));
      if (select.dataset.key === key) return;
      select.dataset.key = key;
      select.innerHTML = '';
      options.forEach(o => {
        if (o.group) {
          const g = el('optgroup', { label: this.L(o.group) });
          o.options.forEach(x => g.appendChild(el('option', { value: x.value, text: this.L(x.label) })));
          select.appendChild(g);
        } else {
          select.appendChild(el('option', { value: o.value, text: this.L(o.label) }));
        }
      });
    }

    buildSelect(item) {
      const select = el('select', { class: 'select-input' });
      select.addEventListener('change', () => this.set(item.bind, item.numeric ? Number(select.value) : select.value));
      this.add(scene => {
        const options = typeof item.options === 'function' ? item.options(scene) : item.options;
        this.fillOptions(select, options);
        const v = getPath(scene, item.bind);
        select.value = String(v);
        if (select.selectedIndex < 0 && select.options.length) select.selectedIndex = 0;
      });
      return this.field(item, select);
    }

    buildSegment(item, kind) {
      const group = el('div', { class: kind === 'chips' ? 'chip-group' : 'segment-group', role: 'group' });
      let lastKey = '';
      this.add(scene => {
        const options = typeof item.options === 'function' ? item.options(scene) : item.options;
        const key = JSON.stringify(options.map(o => [o.value, this.L(o.label)]));
        if (key !== lastKey) {
          lastKey = key;
          group.innerHTML = '';
          options.forEach(o => {
            const btn = el('button', { type: 'button', class: kind === 'chips' ? 'chip' : 'segment', 'data-value': o.value, text: this.L(o.label) });
            btn.addEventListener('click', () => this.set(item.bind, o.value));
            group.appendChild(btn);
          });
        }
        const v = String(getPath(scene, item.bind));
        group.querySelectorAll('button').forEach(btn => {
          const on = btn.dataset.value === v;
          btn.classList.toggle('is-active', on);
          btn.setAttribute('aria-pressed', String(on));
        });
        group.setAttribute('aria-label', this.L(item.label) || '');
      });
      if (!item.label) return this.withVisibility(el('div', { class: 'field field-wide' }, [group]), item);
      const label = el('span', { class: 'field-label' });
      this.add(() => { label.textContent = this.L(item.label); });
      return this.withVisibility(el('div', { class: 'field field-wide' }, [label, group]), item);
    }

    buildToggle(item) {
      const input = el('input', { type: 'checkbox', class: 'switch-input' });
      const text = el('span', { class: 'toggle-text' });
      const node = el('label', { class: 'field toggle-field' }, [el('span', { class: 'switch' }, [input, el('span', { class: 'switch-track', 'aria-hidden': 'true' })]), text]);
      input.addEventListener('change', () => this.set(item.bind, input.checked));
      this.add(scene => {
        input.checked = Boolean(getPath(scene, item.bind));
        text.textContent = this.L(item.label);
      });
      return this.withVisibility(node, item);
    }

    buildColors(item) {
      const row = el('div', { class: 'color-row' });
      item.items.forEach(ci => {
        const input = el('input', { type: 'color', class: 'color-input' });
        const hex = el('span', { class: 'color-hex' });
        const text = el('span', { class: 'color-label' });
        const wrap = el('label', { class: 'color-field' }, [input, el('span', { class: 'color-meta' }, [text, hex])]);
        input.addEventListener('input', () => this.set(ci.bind, input.value, { live: true }));
        input.addEventListener('change', () => this.set(ci.bind, input.value));
        let clear = null;
        if (ci.optional) {
          clear = el('button', { type: 'button', class: 'color-clear' });
          clear.addEventListener('click', event => {
            event.preventDefault();
            const cur = this.getScene();
            this.set(ci.bind, getPath(cur, ci.bind) ? '' : '#ffffff');
          });
          wrap.appendChild(clear);
        }
        row.appendChild(wrap);
        this.add(scene => {
          const v = getPath(scene, ci.bind);
          const visible = !ci.when || ci.when(scene);
          wrap.hidden = !visible;
          text.textContent = this.L(ci.label);
          wrap.classList.toggle('is-empty', !v);
          if (v) input.value = v;
          hex.textContent = v ? String(v).toUpperCase() : (this.getLang() === 'en' ? 'Not used' : '未使用');
          if (clear) clear.textContent = v ? '×' : '+';
          if (clear) clear.setAttribute('aria-label', v ? (this.getLang() === 'en' ? 'Remove color' : '色を外す') : (this.getLang() === 'en' ? 'Add color' : '色を追加'));
        });
      });
      return this.withVisibility(el('div', { class: 'field field-wide' }, [row]), item);
    }

    buildEffects(item) {
      const phase = item.phase;
      const grid = el('div', { class: 'effect-grid', role: 'group' });
      const list = phase === 'in' ? E.IN_EFFECTS : E.OUT_EFFECTS;
      let lastMode = '';
      this.add(scene => {
        const mode = scene.mode;
        if (mode !== lastMode || !grid.childElementCount) {
          lastMode = mode;
          grid.innerHTML = '';
          list.forEach(fx => {
            if (mode === 'trailer' && phase === 'in' && fx.level === 'block') return;
            const canvas = el('canvas', { width: 160, height: 90, class: 'effect-canvas', 'aria-hidden': 'true' });
            const name = el('span', { class: 'effect-name' });
            const badge = el('span', { class: 'effect-badge' });
            const card = el('button', { type: 'button', class: 'effect-card', 'data-fx': fx.id }, [canvas, el('span', { class: 'effect-meta' }, [name, badge])]);
            card.addEventListener('click', () => this.onAction('selectEffect', { phase, id: fx.id }));
            grid.appendChild(card);
            this.mini.register(card, canvas, phase, fx.id);
          });
          this.mini.refreshAll();
        }
        const current = phase === 'in' ? scene.inFx : scene.outFx;
        grid.querySelectorAll('.effect-card').forEach(card => {
          const fx = (phase === 'in' ? E.IN_MAP : E.OUT_MAP)[card.dataset.fx];
          const on = card.dataset.fx === current;
          card.classList.toggle('is-active', on);
          card.setAttribute('aria-pressed', String(on));
          card.querySelector('.effect-name').textContent = this.L(FX_LABELS[phase][card.dataset.fx]);
          const badge = card.querySelector('.effect-badge');
          badge.textContent = fx.level === 'block' ? (this.getLang() === 'en' ? 'Whole' : '全体') : (fx.level === 'glyph' ? (this.getLang() === 'en' ? 'Per char' : '1文字ずつ') : '');
          badge.hidden = !badge.textContent;
        });
        grid.setAttribute('aria-label', this.L(phase === 'in' ? T('登場エフェクト', 'Entrance effects') : T('退場エフェクト', 'Exit effects')));
      });
      return el('div', { class: 'field field-wide' }, [grid]);
    }

    buildFontPicker(item) {
      const current = el('span', { class: 'font-current-name' });
      const sample = el('span', { class: 'font-current-sample' });
      const toggle = el('button', { type: 'button', class: 'font-current', 'aria-expanded': 'false' }, [
        el('span', { class: 'font-current-text' }, [current, sample]), el('span', { class: 'font-caret', 'aria-hidden': 'true', text: '▾' })
      ]);
      const cats = el('div', { class: 'chip-group font-cats', role: 'group' });
      const grid = el('div', { class: 'font-grid', role: 'listbox' });
      const upload = el('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2', class: 'visually-hidden', id: nextId('font-file') });
      const uploadBtn = el('label', { class: 'mini-button', for: upload.id });
      const localInput = el('input', { type: 'text', class: 'text-input', spellcheck: 'false' });
      const localBtn = el('button', { type: 'button', class: 'mini-button' });
      const extras = el('div', { class: 'font-extras' }, [
        el('div', { class: 'font-extra-row' }, [uploadBtn, upload]),
        el('div', { class: 'font-extra-row' }, [localInput, localBtn])
      ]);
      const panel = el('div', { class: 'font-panel', hidden: true }, [cats, grid, extras]);
      const label = el('span', { class: 'field-label' });
      const node = el('div', { class: 'field field-wide font-picker' }, [label, toggle, panel]);

      const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const font = F.get(entry.target.dataset.font);
          const sampleEl = entry.target.querySelector('.font-card-sample');
          F.loadPreview(font).then(alias => {
            if (alias) sampleEl.style.fontFamily = `"${alias}", ${font.generic || 'sans-serif'}`;
            entry.target.classList.add('is-loaded');
          });
        });
      }, { root: grid, rootMargin: '120px' }) : null;

      const buildGrid = () => {
        grid.innerHTML = '';
        const scene = this.getScene();
        F.list().filter(f => this.fontCategory === 'all' || f.cat === this.fontCategory).forEach(font => {
          const card = el('button', { type: 'button', class: 'font-card', role: 'option', 'data-font': font.id }, [
            el('span', { class: 'font-card-sample', text: font.user ? (font.label || font.family) : F.previewSample(font) }),
            el('span', { class: 'font-card-name', text: font.label || font.family })
          ]);
          if (font.user) card.querySelector('.font-card-sample').style.fontFamily = `"${font.family}", sans-serif`;
          const on = font.id === scene.fontId;
          card.classList.toggle('is-active', on);
          card.setAttribute('aria-selected', String(on));
          card.addEventListener('click', () => {
            this.set(item.bind, font.id);
            this.fontPanelOpen = false;
            panel.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
          });
          grid.appendChild(card);
          if (observer && !font.user) observer.observe(card);
          else if (!font.user) F.loadPreview(font).then(alias => { if (alias) card.querySelector('.font-card-sample').style.fontFamily = `"${alias}"`; });
        });
      };

      const buildCats = () => {
        cats.innerHTML = '';
        [{ id: 'all', label: T('すべて', 'All') }].concat(F.CATEGORIES).forEach(cat => {
          if (cat.id === 'user' && !F.list().some(f => f.cat === 'user')) return;
          const btn = el('button', { type: 'button', class: 'chip', text: this.L(cat.label) });
          btn.classList.toggle('is-active', this.fontCategory === cat.id);
          btn.addEventListener('click', () => {
            this.fontCategory = cat.id;
            buildCats();
            buildGrid();
          });
          cats.appendChild(btn);
        });
      };

      toggle.addEventListener('click', () => {
        this.fontPanelOpen = !this.fontPanelOpen;
        panel.hidden = !this.fontPanelOpen;
        toggle.setAttribute('aria-expanded', String(this.fontPanelOpen));
        if (this.fontPanelOpen) { buildCats(); buildGrid(); }
      });
      upload.addEventListener('change', async () => {
        const file = upload.files && upload.files[0];
        upload.value = '';
        if (!file) return;
        this.onAction('uploadFont', { file, bind: item.bind });
      });
      const applyLocal = () => {
        const name = localInput.value.trim();
        if (name) this.onAction('localFont', { name, bind: item.bind });
      };
      localBtn.addEventListener('click', applyLocal);
      localInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyLocal(); } });

      this.add(scene => {
        const font = F.get(scene.fontId) || F.get('noto-sans-jp');
        label.textContent = this.L(item.label);
        current.textContent = font.label || font.family;
        sample.textContent = font.cat === 'latin' ? 'Aa Bb 123' : 'あア永 Aa';
        sample.style.fontFamily = E.cssFontFamily(F.families(font.id));
        sample.style.fontWeight = String(scene.weight || 400);
        uploadBtn.textContent = this.L(T('フォントファイルを読み込む（TTF / OTF / WOFF）', 'Load a font file (TTF / OTF / WOFF)'));
        localInput.placeholder = this.L(T('PCにあるフォント名（例：游明朝）', 'Installed font name (e.g. Georgia)'));
        localBtn.textContent = this.L(T('使う', 'Use'));
        panel.hidden = !this.fontPanelOpen;
        toggle.setAttribute('aria-expanded', String(this.fontPanelOpen));
        if (this.fontPanelOpen) {
          if (!grid.childElementCount) { buildCats(); buildGrid(); }
          grid.querySelectorAll('.font-card').forEach(card => {
            const on = card.dataset.font === scene.fontId;
            card.classList.toggle('is-active', on);
            card.setAttribute('aria-selected', String(on));
          });
        }
      });
      return node;
    }

    buildStylePresets(item) {
      const group = el('div', { class: 'chip-group style-presets' });
      const label = el('span', { class: 'field-label' });
      P.STYLE_PRESETS.forEach(preset => {
        const btn = el('button', { type: 'button', class: 'chip', 'data-preset': preset.id });
        btn.addEventListener('click', () => this.onAction('stylePreset', { id: preset.id }));
        group.appendChild(btn);
      });
      this.add(() => {
        label.textContent = this.L(item.label);
        group.querySelectorAll('button').forEach(btn => {
          const preset = P.STYLE_PRESETS.find(p => p.id === btn.dataset.preset);
          btn.textContent = this.L(preset.label);
        });
      });
      return el('div', { class: 'field field-wide' }, [label, group]);
    }

    buildGradientPresets(item) {
      const group = el('div', { class: 'swatch-group' });
      P.GRADIENT_PRESETS.forEach(preset => {
        const btn = el('button', { type: 'button', class: 'swatch', title: preset.id, 'aria-label': preset.id });
        btn.style.background = `linear-gradient(180deg, ${preset.colors.join(', ')})`;
        btn.addEventListener('click', () => this.onAction('gradientPreset', { colors: preset.colors }));
        group.appendChild(btn);
      });
      return this.withVisibility(el('div', { class: 'field field-wide' }, [group]), item);
    }

    buildAnchor(item) {
      const grid = el('div', { class: 'anchor-grid', role: 'group' });
      const names = {
        tl: T('左上', 'Top left'), tc: T('上', 'Top'), tr: T('右上', 'Top right'),
        ml: T('左', 'Left'), mc: T('中央', 'Center'), mr: T('右', 'Right'),
        bl: T('左下', 'Bottom left'), bc: T('下', 'Bottom'), br: T('右下', 'Bottom right')
      };
      ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'].forEach(key => {
        const btn = el('button', { type: 'button', class: 'anchor-cell', 'data-value': key }, [el('span', { class: 'anchor-dot', 'aria-hidden': 'true' })]);
        btn.addEventListener('click', () => this.set(item.bind, key));
        grid.appendChild(btn);
      });
      const label = el('span', { class: 'field-label' });
      this.add(scene => {
        label.textContent = this.L(item.label);
        grid.setAttribute('aria-label', this.L(item.label));
        grid.querySelectorAll('button').forEach(btn => {
          const on = btn.dataset.value === scene.anchor;
          btn.classList.toggle('is-active', on);
          btn.setAttribute('aria-pressed', String(on));
          btn.setAttribute('aria-label', this.L(names[btn.dataset.value]));
          btn.title = this.L(names[btn.dataset.value]);
        });
      });
      return el('div', { class: 'field field-wide anchor-field' }, [label, grid]);
    }

    buildSize() {
      const select = el('select', { class: 'select-input' });
      const w = el('input', { type: 'number', class: 'number-input', min: 32, max: 3840, step: 1 });
      const h = el('input', { type: 'number', class: 'number-input', min: 32, max: 3840, step: 1 });
      const custom = el('div', { class: 'size-custom' }, [w, el('span', { text: '×' }), h, el('span', { class: 'number-suffix', text: 'px' })]);
      const label = el('label', { class: 'field-label' });
      const id = nextId('size');
      select.id = id;
      label.setAttribute('for', id);
      select.addEventListener('change', () => this.onAction('sizePreset', { id: select.value }));
      const commit = () => this.onAction('customSize', { width: Number(w.value), height: Number(h.value) });
      w.addEventListener('change', commit);
      h.addEventListener('change', commit);
      this.add(scene => {
        label.textContent = this.L(T('サイズ', 'Size'));
        this.fillOptions(select, P.SIZE_PRESETS.map(p => ({ value: p.id, label: p.label })));
        select.value = scene.sizePreset || 'custom';
        if (document.activeElement !== w) w.value = scene.width;
        if (document.activeElement !== h) h.value = scene.height;
        custom.hidden = scene.sizePreset !== 'custom';
        w.setAttribute('aria-label', this.L(T('幅', 'Width')));
        h.setAttribute('aria-label', this.L(T('高さ', 'Height')));
      });
      return el('div', { class: 'field field-wide' }, [label, select, custom]);
    }
  }

  root.TextApngControls = { ControlPanel, FX_LABELS, SCHEMA, getPath, setPath, OPT };
})(window);
