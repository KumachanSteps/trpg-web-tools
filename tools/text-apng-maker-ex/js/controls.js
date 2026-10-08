/*
 * 文字画像APNGメーカーEX — 設定パネル（宣言的なスキーマからUIを生成）
 */
(function (root) {
  'use strict';

  const E = root.TextApngEngine;
  const F = root.TextApngFonts;
  const P = root.TextApngPresets;
  const T = (ja, en, ko) => ({ ja, en, ko });

  /* ---------- 効果名 ---------- */

  const FX_LABELS = {
    in: {
      fade: T('フェード', 'Fade', '페이드'),
      rise: T('浮かび上がる', 'Rise', '떠오르기'),
      drop: T('降りてくる', 'Drop', '내려오기'),
      converge: T('上下から合流', 'Converge', '위아래에서 합류'),
      slide: T('スライド', 'Slide', '슬라이드'),
      tracking: T('字間が縮まる', 'Tracking in', '자간이 좁혀짐'),
      spread: T('中央から左右に広がる', 'Spread from center', '중앙에서 좌우로 펼쳐짐'),
      blurIn: T('ぼかし解除', 'Blur in', '흐림 해제'),
      pop: T('ポップ', 'Pop', '팝'),
      shrinkIn: T('大きい所から', 'Shrink in', '크게 시작해 축소'),
      spin: T('回転', 'Spin', '회전'),
      flip: T('めくれる', 'Flip', '넘겨지기'),
      bounce: T('落下バウンド', 'Bounce', '낙하 바운드'),
      scatter: T('集合', 'Assemble', '집합'),
      typewriter: T('タイプライター', 'Typewriter', '타자기'),
      flicker: T('明滅', 'Flicker', '명멸'),
      slam: T('叩きつけ', 'Slam', '내리치기'),
      zoomIn: T('迫ってくる', 'Zoom in', '다가오기'),
      emerge: T('奥から現れる', 'Emerge', '안쪽에서 나타나기'),
      wipe: T('ワイプ', 'Wipe', '와이프'),
      shutter: T('展開', 'Unfold', '펼치기'),
      glitch: T('グリッチ', 'Glitch', '글리치'),
      flash: T('閃光', 'Flash', '섬광')
    },
    out: {
      none: T('消さない', 'Keep', '지우지 않음'),
      fade: T('フェード', 'Fade', '페이드'),
      rise: T('上へ消える', 'Float away', '위로 사라짐'),
      sink: T('下へ沈む', 'Sink', '아래로 가라앉음'),
      diverge: T('上下に分かれる', 'Diverge', '위아래로 갈라짐'),
      slide: T('スライド', 'Slide', '슬라이드'),
      tracking: T('字間が広がる', 'Tracking out', '자간이 넓어짐'),
      blurOut: T('ぼやける', 'Blur out', '흐려짐'),
      growOut: T('膨らんで消える', 'Grow out', '부풀며 사라짐'),
      shrink: T('縮んで消える', 'Shrink', '줄어들며 사라짐'),
      scatter: T('飛び散る', 'Scatter', '흩어짐'),
      erase: T('1文字ずつ消去', 'Erase', '한 글자씩 지우기'),
      flicker: T('明滅', 'Flicker', '명멸'),
      zoomThrough: T('迫って消える', 'Zoom through', '다가오며 사라짐'),
      recede: T('遠ざかる', 'Recede', '멀어짐'),
      wipe: T('ワイプ', 'Wipe', '와이프'),
      shutter: T('閉じる', 'Fold', '닫기'),
      glitch: T('グリッチ', 'Glitch', '글리치'),
      split: T('斬られて左右へ', 'Sliced apart', '베여서 좌우로'),
      burn: T('燃えて消える', 'Burn away', '불타 사라지기')
    },
    hold: {
      none: T('なし', 'None', '없음'),
      float: T('ふわふわ', 'Float', '둥실둥실'),
      wave: T('波打つ', 'Wave', '물결'),
      pulse: T('鼓動', 'Heartbeat', '고동'),
      shake: T('震え', 'Tremble', '떨림'),
      glow: T('発光の明滅', 'Glow pulse', '발광 명멸'),
      flicker: T('ちらつき', 'Flicker', '깜박거림'),
      blink: T('点滅', 'Blink', '점멸'),
      glitch: T('時々ノイズ', 'Glitch bursts', '가끔 노이즈')
    }
  };

  const OPT = {
    order: [
      { value: 'forward', label: T('先頭から', 'From the start', '처음부터') },
      { value: 'reverse', label: T('末尾から', 'From the end', '끝에서부터') },
      { value: 'center', label: T('中央から', 'From the center', '중앙에서부터') },
      { value: 'edges', label: T('両端から', 'From the edges', '양 끝에서부터') },
      { value: 'random', label: T('ランダム', 'Random', '랜덤') }
    ],
    ease: [
      { value: 'auto', label: T('おまかせ', 'Auto', '자동') },
      { value: 'out', label: T('減速', 'Ease out', '감속') },
      { value: 'strong', label: T('強い減速', 'Strong ease out', '강한 감속') },
      { value: 'smooth', label: T('なめらか', 'Smooth', '부드럽게') },
      { value: 'back', label: T('行き過ぎて戻る', 'Back', '지나쳤다 돌아옴') },
      { value: 'elastic', label: T('バネ', 'Elastic', '스프링') },
      { value: 'bounce', label: T('バウンド', 'Bounce', '바운드') },
      { value: 'linear', label: T('一定', 'Linear', '일정') },
      { value: 'in', label: T('加速', 'Ease in', '가속') }
    ],
    dirs: {
      left: T('左', 'Left', '왼쪽'), right: T('右', 'Right', '오른쪽'), up: T('上', 'Up', '위'), down: T('下', 'Down', '아래'),
      lr: T('左 → 右', 'Left → Right', '왼쪽 → 오른쪽'), rl: T('右 → 左', 'Right → Left', '오른쪽 → 왼쪽'), tb: T('上 → 下', 'Top → Bottom', '위 → 아래'), bt: T('下 → 上', 'Bottom → Top', '아래 → 위'),
      center: T('中央から', 'From center', '중앙에서'), v: T('上下に', 'Vertical', '위아래로'), h: T('左右に', 'Horizontal', '좌우로')
    },
    reveal: [
      { value: 'char', label: T('1文字ずつ', 'Per character', '한 글자씩') },
      { value: 'solo', label: T('中央に1文字ずつ', 'Per character at center', '중앙에 한 글자씩') },
      { value: 'spread', label: T('中央から左右に広がる', 'Spread from center', '중앙에서 좌우로 펼쳐짐') },
      { value: 'line', label: T('1行ずつ', 'Per line', '한 줄씩') },
      { value: 'sweep', label: T('なめらかに流れる', 'Smooth sweep', '부드럽게 흐름') },
      { value: 'all', label: T('全体を同時に', 'All at once', '전체를 동시에') },
      { value: 'scroll', label: T('スクロール', 'Scroll', '스크롤') }
    ],
    subFx: [
      { value: 'same', label: T('メインと同じ', 'Same as main', '메인과 같음') },
      { value: 'fade', label: T('フェード', 'Fade', '페이드') },
      { value: 'rise', label: T('浮かび上がる', 'Rise', '떠오르기') },
      { value: 'blurIn', label: T('ぼかし解除', 'Blur in', '흐림 해제') },
      { value: 'tracking', label: T('字間が縮まる', 'Tracking in', '자간이 좁혀짐') },
      { value: 'typewriter', label: T('タイプライター', 'Typewriter', '타자기') },
      { value: 'slide', label: T('スライド', 'Slide', '슬라이드') }
    ],
    deco: [
      { value: 'none', label: T('なし', 'None', '없음') },
      { value: 'band', label: T('帯', 'Band', '띠') },
      { value: 'tape', label: T('虎柄テープ', 'Caution tape', '경고 테이프') },
      { value: 'box', label: T('ボックス', 'Box', '박스') },
      { value: 'frame', label: T('タイトル枠', 'Title frame', '타이틀 틀') },
      { value: 'lines', label: T('上下ライン', 'Lines', '위아래 라인') },
      { value: 'underline', label: T('下線', 'Underline', '밑줄') },
      { value: 'sides', label: T('サイドライン', 'Side lines', '사이드 라인') },
      { value: 'bar', label: T('アクセントバー', 'Accent bar', '악센트 바') },
      { value: 'corners', label: T('コーナー枠', 'Corners', '코너 틀') }
    ],
    decoAnim: [
      { value: 'grow', label: T('伸びる', 'Grow', '늘어나기') },
      { value: 'fade', label: T('フェード', 'Fade', '페이드') },
      { value: 'none', label: T('なし', 'None', '없음') }
    ],
    bg: [
      { value: 'none', label: T('なし（透明）', 'None (clear)', '없음 (투명)') },
      { value: 'solid', label: T('単色', 'Solid', '단색') },
      { value: 'vignette', label: T('ビネット', 'Vignette', '비네트') },
      { value: 'bottom', label: T('下からグラデ', 'Bottom fade', '아래에서 그라데이션') },
      { value: 'top', label: T('上からグラデ', 'Top fade', '위에서 그라데이션') }
    ],
    writing: [
      { value: 'h', label: T('横書き', 'Horizontal', '가로쓰기') },
      { value: 'v', label: T('縦書き', 'Vertical', '세로쓰기') }
    ],
    fillType: [
      { value: 'solid', label: T('単色', 'Solid', '단색') },
      { value: 'gradient', label: T('グラデーション', 'Gradient', '그라데이션') }
    ],
    gradDir: [
      { value: 'v', label: T('縦（1行ごと）', 'Vertical (per line)', '세로 (한 줄마다)') },
      { value: 'h', label: T('横（全体）', 'Horizontal (whole)', '가로 (전체)') },
      { value: 'd', label: T('斜め（全体）', 'Diagonal (whole)', '대각선 (전체)') }
    ]
  };

  const FORMATS = {
    s: { digits: 2, suffix: T('秒', 's', '초') },
    sSigned: { digits: 2, suffix: T('秒', 's', '초') },
    px: { digits: 0, suffix: T('px', 'px', 'px') },
    pct: { digits: 0, suffix: T('%', '%', '%'), mul: 100 },
    x: { digits: 2, suffix: T('倍', '×', '배') },
    em: { digits: 2, suffix: T('em', 'em', 'em') },
    cps: { digits: 0, suffix: T('字/秒', 'chars/s', '자/초') },
    pxs: { digits: 0, suffix: T('px/秒', 'px/s', 'px/초') },
    chars: { digits: 0, suffix: T('字', 'chars', '자') }
  };

  const isTrailer = s => s.mode === 'trailer';
  const notTrailer = s => s.mode !== 'trailer';
  const inDef = s => E.IN_MAP[s.inFx] || E.IN_MAP.fade;
  const outDef = s => E.OUT_MAP[s.outFx] || E.OUT_MAP.fade;
  const decoIs = (...types) => s => types.includes(s.deco.type);

  function fontWeightOptions(fontId) {
    const font = F.get(fontId) || F.get('noto-sans-jp');
    const names = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
    return (font.weights || [400]).map(w => ({ value: w, label: T(`${w}（${names[w] || w}）`, `${w} (${names[w] || w})`, `${w} (${names[w] || w})`) }));
  }

  function fontSelectOptions(includeSame) {
    const opts = [];
    if (includeSame) opts.push({ value: 'same', label: T('メインと同じ', 'Same as main', '메인과 같음') });
    F.CATEGORIES.forEach(cat => {
      const fonts = F.list().filter(f => f.cat === cat.id);
      if (!fonts.length) return;
      opts.push({ group: cat.label, options: fonts.map(f => ({ value: f.id, label: T(f.label || f.family, f.label || f.family, f.label || f.family) })) });
    });
    return opts;
  }

  const SCHEMA = {
    text: [
      { type: 'textarea', bind: 'text', id: 'mainTextInput', label: s => (isTrailer(s) ? T('本文', 'Body text', '본문') : T('メインテキスト', 'Main text', '메인 텍스트')), rows: s => (isTrailer(s) ? 8 : 2) },
      { type: 'note', when: isTrailer, text: T('改行はそのまま反映されます。何も書かない行（空行）でページを区切れます。', 'Line breaks are kept. A blank line starts a new page.', '줄바꿈은 그대로 반영됩니다. 아무것도 쓰지 않은 줄(빈 줄)로 페이지를 나눌 수 있습니다.') },
      { type: 'text', bind: 'subText', when: notTrailer, label: T('サブテキスト（任意）', 'Sub text (optional)', '서브 텍스트 (선택)'), placeholder: T('例：BATTLE START ／ 放課後 16:30', 'e.g. BATTLE START / 4:30 PM', '예: BATTLE START / 방과 후 16:30') },
      { type: 'segment', bind: 'subPosition', when: notTrailer, label: T('サブテキストの位置', 'Sub text position', '서브 텍스트 위치'),
        options: s => (s.writing === 'v'
          ? [{ value: 'above', label: T('右（前）', 'Right (before)', '오른쪽 (앞)') }, { value: 'below', label: T('左（後）', 'Left (after)', '왼쪽 (뒤)') }]
          : [{ value: 'above', label: T('上', 'Above', '위') }, { value: 'below', label: T('下', 'Below', '아래') }]) },
      { type: 'segment', bind: 'writing', label: T('書字方向', 'Writing direction', '쓰기 방향'), options: OPT.writing },
      { type: 'segment', bind: 'align', label: T('揃え', 'Alignment', '정렬'),
        options: s => (s.writing === 'v'
          ? [{ value: 'start', label: T('上', 'Top', '위') }, { value: 'center', label: T('中央', 'Center', '중앙') }, { value: 'end', label: T('下', 'Bottom', '아래') }]
          : [{ value: 'start', label: T('左', 'Left', '왼쪽') }, { value: 'center', label: T('中央', 'Center', '중앙') }, { value: 'end', label: T('右', 'Right', '오른쪽') }]) },
      { type: 'range', bind: 'wrapChars', when: isTrailer, label: T('自動改行（1行の最大文字数・0で改行しない）', 'Auto wrap (max chars per line, 0 = off)', '자동 줄바꿈 (한 줄 최대 글자 수, 0이면 줄바꿈 안 함)'), min: 0, max: 60, step: 1, format: 'chars' },
      { type: 'toggle', bind: 'pageSplit', when: s => isTrailer(s) && s.reveal !== 'scroll', label: T('空行でページを分ける', 'Split pages at blank lines', '빈 줄에서 페이지 나누기') },
      { type: 'toggle', bind: 'autoFit', label: T('はみ出す場合は自動で縮小する', 'Shrink automatically when the text overflows', '넘칠 경우 자동으로 축소') },
      { type: 'dynamicNote', key: 'autoFit' }
    ],
    font: [
      { type: 'fontPicker', bind: 'fontId', label: T('フォント', 'Font', '폰트') },
      { type: 'select', bind: 'weight', label: T('太さ', 'Weight', '굵기'), options: s => fontWeightOptions(s.fontId), numeric: true },
      { type: 'toggle', bind: 'italic', label: T('斜体（イタリック）にする', 'Italic', '기울임꼴(이탤릭)로 하기') },
      { type: 'colors', items: [
        { bind: 'fill.color', label: s => (s.fill.type === 'gradient' ? T('文字の色1', 'Text color 1', '글자 색 1') : T('文字の色', 'Text color', '글자 색')) },
        { bind: 'fill.color2', label: T('文字の色2', 'Text color 2', '글자 색 2'), when: s => s.fill.type === 'gradient' },
        { bind: 'fill.color3', label: T('文字の色3', 'Text color 3', '글자 색 3'), when: s => s.fill.type === 'gradient', optional: true }
      ] },
      { type: 'note', text: T('グラデーション・縁取り・影は「装飾」タブで設定できます', 'Gradients, outlines and shadows are in the Style tab', '그라데이션·테두리·그림자는 「장식」 탭에서 설정할 수 있습니다') },
      { type: 'range', bind: 'fontSize', label: T('文字サイズ', 'Font size', '글자 크기'), min: 12, max: 400, step: 1, format: 'px' },
      { type: 'range', bind: 'letterSpacing', label: T('字間', 'Letter spacing', '자간'), min: -0.2, max: 1.2, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'lineHeight', label: T('行間', 'Line height', '행간'), min: 0.9, max: 3.2, step: 0.05, format: 'x' },
      { type: 'heading', when: notTrailer, label: T('サブテキスト', 'Sub text', '서브 텍스트') },
      { type: 'select', bind: 'subFontId', when: notTrailer, label: T('サブのフォント', 'Sub font', '서브 폰트'), options: () => fontSelectOptions(true) },
      { type: 'select', bind: 'subWeight', when: notTrailer, label: T('サブの太さ', 'Sub weight', '서브 굵기'), options: s => fontWeightOptions(s.subFontId === 'same' ? s.fontId : s.subFontId), numeric: true },
      { type: 'toggle', bind: 'subItalic', when: notTrailer, label: T('サブを斜体（イタリック）にする', 'Italic sub text', '서브를 기울임꼴(이탤릭)로 하기') },
      { type: 'toggle', bind: 'subColorOn', when: notTrailer, label: T('サブテキストを別の色にする', 'Different color for sub text', '서브 텍스트를 다른 색으로 하기') },
      { type: 'colors', when: s => notTrailer(s) && s.subColorOn, items: [{ bind: 'subColor', label: T('サブの色', 'Sub text color', '서브 색') }] },
      { type: 'range', bind: 'subSize', when: notTrailer, label: T('サブの大きさ（メイン比）', 'Sub size (vs. main)', '서브 크기 (메인 대비)'), min: 0.1, max: 0.9, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'subLetterSpacing', when: notTrailer, label: T('サブの字間', 'Sub letter spacing', '서브 자간'), min: -0.2, max: 1.5, step: 0.01, format: 'pct' },
      { type: 'range', bind: 'subGap', when: notTrailer, label: T('メインとの間隔', 'Gap from the main text', '메인과의 간격'), min: 0, max: 1.5, step: 0.01, format: 'em' }
    ],
    motion: [
      { type: 'section', when: isTrailer, label: T('表示の流れ', 'Reveal flow', '표시 흐름'), children: [
        { type: 'chips', bind: 'reveal', options: OPT.reveal },
        { type: 'note', when: s => s.reveal === 'solo', text: T('1文字ずつ画面の中央に大きく出したあと、全文を一度に出します', 'Each character flashes big at the center, then the whole text lands at once', '한 글자씩 화면 중앙에 크게 보여 준 뒤, 전문을 한 번에 표시합니다') },
        { type: 'note', when: s => s.reveal === 'spread', text: T('全文の文字を中央に重ねて出したあと、左右に広げて並べます（縦書きは上下）', 'All characters appear stacked at the center, then spread out into the full text', '전문의 글자를 중앙에 겹쳐 보여 준 뒤, 좌우로 펼쳐 나열합니다 (세로쓰기는 위아래)') },
        { type: 'range', bind: 'spreadHold', when: s => s.reveal === 'spread', label: T('重ねて見せる時間', 'Time shown stacked', '겹쳐 보여 주는 시간'), min: 0, max: 3, step: 0.05, format: 's' },
        { type: 'range', bind: 'spreadDur', when: s => s.reveal === 'spread', label: T('広がる時間', 'Spread time', '펼쳐지는 시간'), min: 0.1, max: 3, step: 0.05, format: 's' },
        { type: 'range', bind: 'cps', when: s => s.reveal === 'char' || s.reveal === 'solo', label: T('表示スピード', 'Speed', '표시 속도'), min: 2, max: 40, step: 1, format: 'cps' },
        { type: 'range', bind: 'soloSize', when: s => s.reveal === 'solo', label: T('中央の文字の大きさ（画像の短い辺に対して）', 'Center letter size (vs. the shorter side)', '중앙 글자 크기 (이미지의 짧은 변 대비)'), min: 0.15, max: 0.9, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'soloPause', when: s => s.reveal === 'solo', label: T('全文を出す前のタメ（何も出ない間）', 'Pause before the whole text (blank)', '전문 표시 전의 뜸 (아무것도 나오지 않는 시간)'), min: 0, max: 2, step: 0.05, format: 's' },
        { type: 'range', bind: 'soloImpact', when: s => s.reveal === 'solo', label: T('全文が出る瞬間の衝撃', 'Impact when the whole text lands', '전문이 나오는 순간의 충격'), min: 0, max: 2, step: 0.05, format: 'x' },
        { type: 'range', bind: 'glyphDur', when: s => !['scroll', 'solo', 'spread'].includes(s.reveal) && s.inFx !== 'typewriter', label: T('1文字が現れるまでの時間', 'Fade time per character', '한 글자가 나타나기까지의 시간'), min: 0, max: 2, step: 0.05, format: 's' },
        { type: 'range', bind: 'punctPause', when: s => s.reveal === 'char', label: T('句読点での間', 'Pause at punctuation', '문장 부호에서의 간격'), min: 0, max: 1.5, step: 0.05, format: 's' },
        { type: 'range', bind: 'linePause', when: s => s.reveal === 'char', label: T('改行での間', 'Pause at line breaks', '줄바꿈에서의 간격'), min: 0, max: 2, step: 0.05, format: 's' },
        { type: 'range', bind: 'lineInterval', when: s => s.reveal === 'line' || s.reveal === 'sweep', label: T('次の行までの時間', 'Time between lines', '다음 줄까지의 시간'), min: 0.1, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'sweepDur', when: s => s.reveal === 'sweep', label: T('1行が流れる時間', 'Sweep time per line', '한 줄이 흐르는 시간'), min: 0.2, max: 5, step: 0.05, format: 's' },
        { type: 'range', bind: 'scrollSpeed', when: s => s.reveal === 'scroll', label: T('スクロール速度', 'Scroll speed', '스크롤 속도'), min: 10, max: 400, step: 5, format: 'pxs' },
        { type: 'toggle', bind: 'scrollFade', when: s => s.reveal === 'scroll', label: T('画面の端でフェードさせる', 'Fade near the edges', '화면 끝에서 페이드') },
        { type: 'toggle', bind: 'cursor', when: s => s.reveal === 'char', label: T('入力カーソルを表示', 'Show a typing cursor', '입력 커서 표시') },
        { type: 'range', bind: 'pageGap', when: s => s.reveal !== 'scroll' && s.pageSplit, label: T('ページ間の空白', 'Gap between pages', '페이지 사이 공백'), min: 0, max: 3, step: 0.05, format: 's' }
      ] },
      { type: 'section', label: T('演出（EX）', 'Scene effects (EX)', '연출 (EX)'), children: [
        { type: 'chips', bind: 'sfx.type', options: [
          { value: 'none', label: T('なし', 'None', '없음') },
          { value: 'lightning', label: T('雷', 'Lightning', '번개') },
          { value: 'cyber', label: T('サイバー警告', 'Cyber warning', '사이버 경고') },
          { value: 'katana', label: T('刀の一閃', 'Katana slash', '칼의 일섬') },
          { value: 'frame', label: T('装飾枠', 'Ornate frame', '장식 틀') },
          { value: 'crest', label: T('剣と盾', 'Sword & shield', '검과 방패') },
          { value: 'gunshot', label: T('銃撃', 'Gunfire', '총격') },
          { value: 'flame', label: T('炎', 'Flame', '불꽃') },
          { value: 'p5round', label: T('ラウンド表示（赤と黒）', 'Round call (red & black)', '라운드 표시（빨강과 검정）') },
          { value: 'p5round2', label: T('ラウンド表示 Ver2（2本の線）', 'Round call v2 (two lines)', '라운드 표시 Ver2（두 줄의 선）') },
          { value: 'p5gun', label: T('銃弾（赤と黒）', 'Gunfire (red & black)', '총탄（빨강과 검정）') },
          { value: 'blade', label: T('抜刀の判定', 'Katana roll', '발도 판정') },
          { value: 'shot', label: T('銃撃の判定', 'Gunfire roll', '총격 판정') }
        ] },
        { type: 'chips', bind: 'sfx.tier', when: s => s.sfx.type === 'blade' || s.sfx.type === 'shot', label: T('判定の結果', 'Roll result', '판정 결과'), options: s => [
          { value: 'success', label: T('成功', 'Success', '성공') },
          { value: 'special', label: s.sfx.type === 'blade' ? T('スペシャル・難成功', 'Special / Hard', '스페셜·어려운 성공') : T('スペシャル・ハード', 'Special / Hard', '스페셜·어려운 성공') },
          { value: 'extreme', label: s.sfx.type === 'blade' ? T('極成功', 'Extreme', '극단적 성공') : T('イクストリーム', 'Extreme', '극단적 성공') },
          { value: 'critical', label: s.sfx.type === 'blade' ? T('決定的成功', 'Critical', '결정적 성공') : T('クリティカル', 'Critical', '크리티컬') },
          { value: 'failure', label: T('失敗', 'Failure', '실패') },
          { value: 'fumble', label: s.sfx.type === 'blade' ? T('致命的失敗', 'Fumble', '치명적 실패') : T('ファンブル', 'Fumble', '펌블') }
        ] },
        { type: 'note', when: s => s.sfx.type === 'blade', text: T('一閃の通り道に細い線がのび、刀が画面を斬り抜けた瞬間に文字が現れます。成功は一閃、スペシャル・難成功は十字の二閃、極成功は三閃と集中線、決定的成功は三閃のあと円月が文字を囲み、集中線と金の火花が散ります。失敗は先に帯と文字が出て、刀が文字の角をかすめて空を斬り、帯に跡が残ります。致命的失敗は刃が中央で折れて砕け、文字が斜めに割れます。退場を「斬られて左右へ」にすると、最初の一閃と同じ向きに斬られて消えます', 'A faint line traces the blade’s path, and the text appears the instant the katana cuts across. Success is one slash, Special / Hard a cross of two, Extreme three slashes with speed lines, and Critical three slashes followed by a full circle around the text with speed lines and gold sparks. On Failure the band and text appear first, then the blade grazes past the text and leaves a scar on the band. Fumble snaps the blade in the middle, scattering shards and cracking the text diagonally. With the “Sliced apart” exit, the text is cut along the first slash', '일섬이 지나갈 길에 가는 선이 뻗고, 칼이 화면을 베고 지나가는 순간 글자가 나타납니다. 성공은 일섬, 스페셜·어려운 성공은 십자의 이섬, 극단적 성공은 삼섬과 집중선, 결정적 성공은 삼섬 뒤 원월이 글자를 감싸며 집중선과 금빛 불꽃이 튑니다. 실패는 띠와 글자가 먼저 나온 뒤 칼이 글자 모서리를 스치며 허공을 베고, 띠에 자국이 남습니다. 치명적 실패는 칼날이 가운데서 부러져 흩어지며 글자가 비스듬히 갈라집니다. 퇴장을 「베여서 좌우로」로 하면 첫 일섬과 같은 방향으로 베이며 사라집니다') },
        { type: 'note', when: s => s.sfx.type === 'shot', text: T('照準が回りながら飛び込んで定まり、撃ち抜いた瞬間に文字が現れます。成功は一発、スペシャル・ハードは二連射、イクストリームは外側の目盛りでロックオンして三点射、クリティカルは外側の目盛りと四隅の照準でロックオンして三点射のあとトドメの一発、集中線と金の火花が散ります。失敗は先に帯と文字が出て、照準が文字から逸れ、弾は文字の横の帯に当たって弾痕が残ります。ファンブルは弾が出ずに照準が砕けて落ちます', 'A reticle spins in and locks on, and the text appears the instant the shot hits. Success is one shot, Special / Hard a double tap, Extreme locks on with an outer ring and fires a three-round burst, and Critical adds corner brackets and a final shot, with speed lines and gold sparks. On Failure the band and text appear first, the reticle drifts off and the shot hits the band beside the text, leaving a bullet hole. Fumble jams and the reticle shatters and falls', '조준이 돌며 날아와 고정되고, 명중하는 순간 글자가 나타납니다. 성공은 한 발, 스페셜·어려운 성공은 2연사, 극단적 성공은 바깥 눈금으로 록온해 3점사, 크리티컬은 네 모서리 조준까지 더해 3점사 뒤 마무리 한 발, 집중선과 금빛 불꽃이 튑니다. 실패는 띠와 글자가 먼저 나온 뒤 조준이 글자에서 벗어나고, 탄이 글자 옆의 띠에 맞아 탄흔이 남습니다. 펌블은 탄이 나가지 않고 조준이 부서져 떨어집니다') },
        { type: 'note', when: s => s.sfx.type === 'flame', text: T('導火線のような火が帯の下の線を左から右へ走り、燃えたところから暗い帯が現れて、文字が1文字ずつ立ち上がります。表示中は下の線から炎が立ちのぼってゆらぎ、火の粉が昇ります。退場を「燃えて消える」にすると、光る燃え際が左から右へ進んで帯も文字も燃え尽きます', 'A fuse-like fire runs left to right along the line under the band; the dark band appears behind it and each character rises up. Flames rise and flicker from the bottom line and embers drift up while shown. With the “Burn away” exit, a glowing edge sweeps left to right and burns away the band and text', '도화선 같은 불이 띠 아래 선을 따라 왼쪽에서 오른쪽으로 달리고, 불이 지나간 자리에 어두운 띠가 나타나며 글자가 한 글자씩 솟아오릅니다. 표시 중에는 아래 선에서 불꽃이 피어올라 일렁이고 불티가 솟아오릅니다. 퇴장을 「불타 사라지기」로 하면 빛나는 경계가 왼쪽에서 오른쪽으로 지나가며 띠와 글자가 타 버립니다') },
        { type: 'note', when: s => s.sfx.type === 'p5round', text: T('画面の奥の一点から、赤と黒の太い線が手前へ伸び、細いすじが飛んできます。文字はその一点の近くから斜めに大きくなりながら飛んできて、黒い札と赤い影の上で止まります。退場では文字も線も手前へ抜けます', 'Thick red and black lines shoot toward the viewer from a vanishing point, with streaks flying past. The text flies in from near that point, growing and tilting, and lands on a black plate with a red shadow. On exit everything rushes past the viewer', '화면 안쪽의 한 점에서 빨강과 검정의 굵은 선이 앞으로 뻗고, 가는 줄기가 날아옵니다. 글자는 그 점 근처에서 비스듬히 커지며 날아와 검은 판과 빨간 그림자 위에 멈춥니다. 퇴장할 때는 글자도 선도 앞으로 빠져나갑니다') },
        { type: 'note', when: s => s.sfx.type === 'p5round2', text: T('画面の奥の一点から、赤と黒の2本の線が斜めに手前へ伸び、その間を文字が奥から飛んできて止まります。表示中は線の上を白い光が手前へ流れ、退場では文字が手前へ抜けて線も消えていきます', 'Two red and black lines extend diagonally toward the viewer from a vanishing point, and the text flies in between them and stops. White light runs along the lines while shown; on exit the text rushes forward and the lines fade away', '화면 안쪽의 한 점에서 빨강과 검정의 두 선이 비스듬히 앞으로 뻗고, 그 사이로 글자가 안쪽에서 날아와 멈춥니다. 표시 중에는 선 위를 하얀 빛이 앞으로 흐르고, 퇴장할 때는 글자가 앞으로 빠지며 선도 사라집니다') },
        { type: 'note', when: s => s.sfx.type === 'p5gun', text: T('画面の外から3発の銃弾が飛び、着弾のたびに赤いギザギザの衝撃と弾痕が残って画面が揺れます。斜めの黒い帯が走り込み、1文字ずつ赤と黒の札が傾いて飛び出します。退場では帯も文字も左へ抜けます', 'Three shots fly in from off-screen; each hit leaves a jagged red impact and a bullet hole and shakes the image. A slanted black band slides in and each character pops out on a tilted red or black card. On exit the band and text dash off to the left', '화면 밖에서 세 발의 총탄이 날아와, 착탄할 때마다 빨간 톱니 모양 충격과 탄흔이 남고 화면이 흔들립니다. 비스듬한 검은 띠가 들어오고, 한 글자씩 빨강과 검정의 카드가 기울어져 튀어나옵니다. 퇴장할 때는 띠도 글자도 왼쪽으로 빠집니다') },
        { type: 'note', when: s => s.sfx.type === 'frame', text: T('四隅の飾りが現れ、二重線の枠が角から伸びて文字を囲みます。表示中は光が枠をなぞり、退場では線が角へ戻ります', 'Corner ornaments appear and a double-line frame grows from the corners around the text. Light traces the frame while shown, and the lines pull back into the corners on exit', '네 모서리 장식이 나타나고 이중선 틀이 모서리에서 뻗어 글자를 감쌉니다. 표시 중에는 빛이 틀을 따라 돌고, 퇴장할 때 선이 모서리로 돌아갑니다') },
        { type: 'note', when: s => s.sfx.type === 'crest', text: T('金の細い線で描いた剣と盾の紋章が文字の上に現れます。剣が交差して光り、盾の輪郭が引かれてから、暗い帯が左右に開いて文字が出ます。表示中は光が盾の縁から帯の線へ流れます', 'A gold line-art crest of crossed swords and a shield draws in above the text. The swords cross with a glint, the shield outline traces in, then a dark band opens behind the text. Light runs down the shield edge into the band line while shown', '금색 가는 선으로 그린 검과 방패 문장이 글자 위에 나타납니다. 검이 교차하며 빛나고 방패 윤곽이 그려진 뒤, 어두운 띠가 좌우로 열리며 글자가 나타납니다. 표시 중에는 빛이 방패 가장자리에서 띠의 선으로 흐릅니다') },
        { type: 'note', when: s => s.sfx.type === 'gunshot', text: T('四隅の照準が定まり、3発の曳光弾が着弾して弾痕が残ってから、斜めの赤い帯が走り込んで文字が出ます。退場では帯も文字と一緒に右へ抜けます', 'Corner brackets lock on, three tracer rounds leave bullet holes, then a slanted red band slides in behind the text. On exit the band wipes out to the right with the text', '네 모서리 조준이 고정되고 세 발의 예광탄이 착탄해 탄흔이 남은 뒤, 비스듬한 빨간 띠가 들어오며 글자가 나타납니다. 퇴장할 때는 띠도 글자와 함께 오른쪽으로 빠집니다') },
        { type: 'note', when: s => s.sfx.type === 'lightning', text: T('左右から電気が横に走って中央で大きな火花が散り、文字が現れます。表示中は文字の上を電気が走り、退場の直前にもう一度落雷します', 'Electricity races in from both sides and bursts into a big spark at the center, bringing the text in. Arcs crackle over it while shown, and a second strike hits right before it fades out', '좌우에서 전기가 가로로 달려와 중앙에서 큰 불꽃이 튀며 글자가 나타납니다. 표시 중에는 글자 위로 전기가 흐르고, 퇴장 직전에 다시 한번 낙뢰가 칩니다') },
        { type: 'note', when: s => s.sfx.type === 'cyber', text: T('画面が暗くなって走査線が流れ、中央に回る照準と警告マーク、左右の表示、「WARNING」が組み上がって点滅します。マークが横一本の線につぶれて暗い帯に開き、文字がグリッチで現れます。表示中は帯の上下に小さく警告の文字が流れ、最後は帯が線に閉じて消えます', 'The image dims with scanlines, and a HUD (rotating reticle, warning sign, side readouts and "WARNING") boots up and blinks. The sign collapses into a single line that opens into a dark band, and the text glitches in. Small warning text scrolls above and below the band, which closes back into a line at the end', '화면이 어두워지며 주사선이 흐르고, 중앙에 회전하는 조준과 경고 마크, 좌우 표시, 「WARNING」이 조립되어 깜박입니다. 마크가 가로 한 줄로 찌그러져 어두운 띠로 열리고, 글자가 글리치로 나타납니다. 표시 중에는 띠 위아래에 작은 경고 문자가 흐르고, 마지막에 띠가 선으로 닫히며 사라집니다') },
        { type: 'note', when: s => s.sfx.type === 'katana', text: T('文字がそのまま現れたあと、退場の始めに中央を一閃が走って文字が切れます。退場を「斬られて左右へ」にすると、そのあと上半分は右へ・下半分は左へずれて消えます', 'The text appears whole, then a slash crosses the center at the start of the exit and cuts it. With the “Sliced apart” exit, the top half then slides right and the bottom half left as they fade', '글자가 그대로 나타난 뒤, 퇴장이 시작될 때 중앙에 일섬이 지나가며 글자가 베입니다. 퇴장을 「베여서 좌우로」로 하면 그 뒤 위쪽 절반은 오른쪽으로, 아래쪽 절반은 왼쪽으로 어긋나며 사라집니다') },
        { type: 'colors', when: s => s.sfx.type !== 'none', items: [
          { bind: 'sfx.color', label: T('演出の色', 'Effect color', '연출 색') },
          { bind: 'sfx.color2', label: s => ({
            cyber: T('帯の地の色', 'Band color', '띠 바탕색'),
            frame: T('内側の線の色', 'Inner line color', '안쪽 선 색'),
            crest: T('盾と帯の色', 'Shield & band color', '방패와 띠 색'),
            gunshot: T('影と弾痕の色', 'Shadow & bullet hole color', '그림자와 탄흔 색'),
            flame: T('炎の芯の色', 'Flame core color', '불꽃 심지 색'),
            p5round: T('黒の色', 'Black color', '검정 색'),
            p5round2: T('黒の色', 'Black color', '검정 색'),
            p5gun: T('黒の色', 'Black color', '검정 색'),
            blade: T('帯の色', 'Band color', '띠 색'),
            shot: T('帯の色', 'Band color', '띠 색')
          }[s.sfx.type] || T('色2', 'Color 2', '색 2')), when: s => ['cyber', 'frame', 'crest', 'gunshot', 'flame', 'p5round', 'p5round2', 'p5gun', 'blade', 'shot'].includes(s.sfx.type) }
        ] },
        { type: 'text', bind: 'sfx.word', when: s => s.sfx.type === 'cyber', label: T('警告の文字', 'Warning text', '경고 문자'), placeholder: T('WARNING', 'WARNING', 'WARNING') },
        { type: 'range', bind: 'sfx.power', when: s => s.sfx.type !== 'none', label: T('強さ', 'Strength', '강도'), min: 0.2, max: 2, step: 0.05, format: 'x' }
      ] },
      { type: 'section', when: s => !(isTrailer(s) && ['solo', 'spread'].includes(s.reveal)), label: s => (isTrailer(s) ? T('1文字の現れ方', 'How each character appears', '한 글자가 나타나는 방식') : T('登場', 'In', '등장')), children: [
        { type: 'effects', phase: 'in' },
        { type: 'select', bind: 'inDir', when: s => Boolean(inDef(s).dirs), label: T('方向', 'Direction', '방향'), options: s => (inDef(s).dirs || []).map(d => ({ value: d, label: OPT.dirs[d] })) },
        { type: 'range', bind: 'inDur', when: s => notTrailer(s) && s.inFx !== 'typewriter', label: T('時間', 'Duration', '시간'), min: 0.05, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'inStagger', when: s => notTrailer(s) && inDef(s).level === 'glyph', label: T('文字ごとのずらし', 'Delay between characters', '글자마다의 시간차'), min: 0, max: 0.6, step: 0.01, format: 's' },
        { type: 'select', bind: 'inOrder', when: s => notTrailer(s) && inDef(s).level === 'glyph', label: T('順番', 'Order', '순서'), options: OPT.order },
        { type: 'select', bind: 'inEase', when: s => s.inFx !== 'typewriter', label: T('動きのカーブ', 'Easing', '움직임 곡선'), options: OPT.ease },
        { type: 'range', bind: 'inPower', when: s => !['fade', 'typewriter'].includes(s.inFx), label: T('強さ', 'Strength', '강도'), min: 0.2, max: 2.5, step: 0.05, format: 'x' }
      ] },
      { type: 'section', label: s => (isTrailer(s) && s.reveal !== 'scroll' ? T('表示中（各ページ）', 'Hold (each page)', '표시 중 (각 페이지)') : T('表示中', 'Hold', '표시 중')), children: [
        { type: 'range', bind: 'hold', when: s => !(isTrailer(s) && s.reveal === 'scroll'), label: T('表示時間', 'Hold time', '표시 시간'), min: 0, max: 10, step: 0.1, format: 's' },
        { type: 'chips', bind: 'holdFx', options: Object.keys(FX_LABELS.hold).map(id => ({ value: id, label: FX_LABELS.hold[id] })) },
        { type: 'range', bind: 'holdPower', when: s => s.holdFx !== 'none', label: T('強さ', 'Strength', '강도'), min: 0.2, max: 3, step: 0.05, format: 'x' },
        { type: 'dynamicNote', key: 'hold' }
      ] },
      { type: 'section', when: s => !(isTrailer(s) && s.reveal === 'scroll'), toggle: 'outEnabled', label: s => (isTrailer(s) ? T('退場（各ページ）', 'Out (each page)', '퇴장 (각 페이지)') : T('退場', 'Out', '퇴장')), children: [
        { type: 'effects', phase: 'out' },
        { type: 'select', bind: 'outDir', when: s => Boolean(outDef(s).dirs), label: T('方向', 'Direction', '방향'), options: s => (outDef(s).dirs || []).map(d => ({ value: d, label: OPT.dirs[d] })) },
        { type: 'range', bind: 'outDur', when: s => !['none', 'erase'].includes(s.outFx), label: T('時間', 'Duration', '시간'), min: 0.05, max: 4, step: 0.05, format: 's' },
        { type: 'range', bind: 'outStagger', when: s => outDef(s).level === 'glyph', label: T('文字ごとのずらし', 'Delay between characters', '글자마다의 시간차'), min: 0, max: 0.6, step: 0.01, format: 's' },
        { type: 'select', bind: 'outOrder', when: s => outDef(s).level === 'glyph', label: T('順番', 'Order', '순서'), options: OPT.order },
        { type: 'select', bind: 'outEase', when: s => !['none', 'erase'].includes(s.outFx), label: T('動きのカーブ', 'Easing', '움직임 곡선'), options: OPT.ease },
        { type: 'range', bind: 'outPower', when: s => !['none', 'fade', 'erase'].includes(s.outFx), label: T('強さ', 'Strength', '강도'), min: 0.2, max: 2.5, step: 0.05, format: 'x' }
      ] },
      { type: 'section', label: T('タイミング', 'Timing', '타이밍'), children: [
        { type: 'select', bind: 'subFx', when: notTrailer, label: T('サブテキストの登場', 'Sub text entrance', '서브 텍스트 등장'), options: OPT.subFx },
        { type: 'range', bind: 'subDelay', when: notTrailer, label: T('サブの登場（メイン登場完了からの差）', 'Sub text timing (after main finishes)', '서브 등장 (메인 등장 완료 후 시간차)'), min: -2, max: 2, step: 0.05, format: 'sSigned' },
        { type: 'range', bind: 'startDelay', label: T('開始前の空白', 'Blank time before', '시작 전 공백'), min: 0, max: 3, step: 0.05, format: 's' },
        { type: 'range', bind: 'endDelay', label: T('終了後の空白', 'Blank time after', '종료 후 공백'), min: 0, max: 5, step: 0.05, format: 's' },
        { type: 'dynamicNote', key: 'duration' }
      ] }
    ],
    style: [
      { type: 'stylePresets', label: T('スタイルプリセット', 'Style presets', '스타일 프리셋') },
      { type: 'section', label: T('文字の塗り', 'Fill', '글자 채우기'), children: [
        { type: 'segment', bind: 'fill.type', options: OPT.fillType },
        { type: 'colors', items: [
          { bind: 'fill.color', label: s => (s.fill.type === 'gradient' ? T('色1', 'Color 1', '색 1') : T('色', 'Color', '색')) },
          { bind: 'fill.color2', label: T('色2', 'Color 2', '색 2'), when: s => s.fill.type === 'gradient' },
          { bind: 'fill.color3', label: T('色3', 'Color 3', '색 3'), when: s => s.fill.type === 'gradient', optional: true }
        ] },
        { type: 'segment', bind: 'fill.dir', when: s => s.fill.type === 'gradient', label: T('グラデーションの向き', 'Gradient direction', '그라데이션 방향'), options: OPT.gradDir },
        { type: 'gradientPresets', when: s => s.fill.type === 'gradient' },
        { type: 'range', bind: 'fillOpacity', label: T('塗りの不透明度', 'Fill opacity', '채우기 불투명도'), min: 0, max: 1, step: 0.01, format: 'pct' }
      ] },
      { type: 'section', label: T('縁取り', 'Outline', '테두리'), toggle: 'stroke.on', children: [
        { type: 'colors', items: [{ bind: 'stroke.color', label: T('色', 'Color', '색') }] },
        { type: 'range', bind: 'stroke.width', label: T('太さ', 'Width', '굵기'), min: 0.5, max: 30, step: 0.5, format: 'px' }
      ] },
      { type: 'section', label: T('外側の縁取り', 'Outer outline', '바깥 테두리'), toggle: 'stroke2.on', children: [
        { type: 'colors', items: [{ bind: 'stroke2.color', label: T('色', 'Color', '색') }] },
        { type: 'range', bind: 'stroke2.width', label: T('太さ', 'Width', '굵기'), min: 0.5, max: 40, step: 0.5, format: 'px' }
      ] },
      { type: 'section', label: T('影', 'Shadow', '그림자'), toggle: 'shadow.on', children: [
        { type: 'colors', items: [{ bind: 'shadow.color', label: T('色', 'Color', '색') }] },
        { type: 'range', bind: 'shadow.opacity', label: T('濃さ', 'Opacity', '농도'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'shadow.blur', label: T('ぼかし', 'Blur', '흐림'), min: 0, max: 80, step: 1, format: 'px' },
        { type: 'range', bind: 'shadow.x', label: T('横のずれ', 'Offset X', '가로 어긋남'), min: -60, max: 60, step: 1, format: 'px' },
        { type: 'range', bind: 'shadow.y', label: T('縦のずれ', 'Offset Y', '세로 어긋남'), min: -60, max: 60, step: 1, format: 'px' }
      ] },
      { type: 'section', label: T('光彩（グロー）', 'Glow', '광채 (글로우)'), toggle: 'glow.on', children: [
        { type: 'colors', items: [{ bind: 'glow.color', label: T('色', 'Color', '색') }] },
        { type: 'range', bind: 'glow.size', label: T('広がり', 'Size', '퍼짐'), min: 2, max: 150, step: 1, format: 'px' },
        { type: 'range', bind: 'glow.strength', label: T('強さ', 'Strength', '강도'), min: 0.2, max: 3, step: 0.05, format: 'x' }
      ] },
      { type: 'section', when: s => [s.inFx, s.holdFx, s.outFx].includes('glitch'), label: T('ノイズの色', 'Noise colors', '노이즈 색'), children: [
        { type: 'colors', items: [
          { bind: 'glitchColor', label: T('色1', 'Color 1', '색 1') },
          { bind: 'glitchColor2', label: T('色2', 'Color 2', '색 2') }
        ] }
      ] },
      { type: 'section', when: notTrailer, label: T('サブテキストを別の色にする', 'Different color for sub text', '서브 텍스트를 다른 색으로 하기'), toggle: 'subColorOn', children: [
        { type: 'colors', items: [{ bind: 'subColor', label: T('色', 'Color', '색') }] }
      ] },
      { type: 'section', when: s => isTrailer(s) && s.cursor, label: T('カーソル', 'Cursor', '커서'), children: [
        { type: 'colors', items: [{ bind: 'cursorColor', label: T('色（空欄で文字色）', 'Color (blank = text color)', '색 (비워 두면 글자 색)'), optional: true }] }
      ] }
    ],
    layout: [
      { type: 'section', label: T('装飾', 'Decoration', '장식'), children: [
        { type: 'chips', bind: 'deco.type', options: OPT.deco },
        { type: 'colors', when: s => s.deco.type !== 'none', items: [
          { bind: 'deco.color', label: T('塗り', 'Fill', '채우기'), when: decoIs('band', 'box', 'frame') },
          { bind: 'deco.color2', label: T('線', 'Line', '선'), when: decoIs('box', 'frame', 'lines', 'underline', 'sides', 'bar', 'corners') },
          { bind: 'deco.tapeColor', label: T('テープ', 'Tape', '테이프'), when: decoIs('tape') },
          { bind: 'deco.tapeStripe', label: T('しま模様', 'Stripes', '줄무늬'), when: decoIs('tape') }
        ] },
        { type: 'range', bind: 'deco.opacity', when: decoIs('band', 'box', 'frame'), label: T('塗りの濃さ', 'Fill opacity', '채우기 농도'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.thickness', when: decoIs('box', 'frame', 'lines', 'underline', 'sides', 'bar', 'corners'), label: s => (['box', 'frame'].includes(s.deco.type) ? T('枠線の太さ（0で枠なし）', 'Border width (0 = none)', '테두리 굵기 (0이면 테두리 없음)') : T('線の太さ', 'Line width', '선 굵기')), min: 0, max: 16, step: 0.5, format: 'px' },
        { type: 'toggle', bind: 'deco.outline', when: s => decoIs('frame', 'lines', 'underline', 'sides', 'bar', 'corners')(s) && (s.stroke.on || s.stroke2.on), label: T('線にも文字と同じ縁取りをつける', 'Outline the lines like the text', '선에도 글자와 같은 테두리 달기') },
        { type: 'range', bind: 'deco.tapeSize', when: decoIs('tape'), label: T('テープの太さ', 'Tape width', '테이프 굵기'), min: 8, max: 120, step: 1, format: 'px' },
        { type: 'range', bind: 'deco.tapeSpeed', when: decoIs('tape'), label: T('テープの流れる速さ（0で止まる）', 'Tape speed (0 = still)', '테이프가 흐르는 속도 (0이면 멈춤)'), min: 0, max: 400, step: 5, format: 'pxs' },
        { type: 'range', bind: 'deco.tapeBlink', when: decoIs('tape'), label: T('テープの点滅（0で点滅しない）', 'Tape blink (0 = none)', '테이프 점멸 (0이면 점멸 안 함)'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.pad', when: s => s.deco.type !== 'none', label: T('文字との余白', 'Padding', '글자와의 여백'), min: 0, max: 2, step: 0.01, format: 'em' },
        { type: 'range', bind: 'deco.extend', when: decoIs('lines', 'underline', 'sides'), label: T('線の長さ', 'Line length', '선 길이'), min: 0, max: 4, step: 0.05, format: 'em' },
        { type: 'range', bind: 'deco.extend', when: decoIs('frame'), label: T('枠の広がり（画面の端で止まります）', 'Frame extension (stops at the image edge)', '틀의 확장 (화면 끝에서 멈춥니다)'), min: 0, max: 12, step: 0.1, format: 'em' },
        { type: 'range', bind: 'deco.soft', when: decoIs('band'), label: T('ふちのぼかし', 'Edge softness', '가장자리 흐림'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.sideFade', when: decoIs('band'), label: T('両端のフェード', 'End fade', '양 끝 페이드'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'range', bind: 'deco.radius', when: decoIs('box'), label: T('角の丸み', 'Corner radius', '모서리 둥글기'), min: 0, max: 1, step: 0.01, format: 'em' },
        { type: 'segment', bind: 'deco.anim', when: s => s.deco.type !== 'none', label: T('装飾のアニメーション', 'Decoration animation', '장식 애니메이션'), options: OPT.decoAnim },
        { type: 'range', bind: 'deco.dur', when: s => s.deco.type !== 'none' && s.deco.anim !== 'none', label: T('装飾のアニメーション時間', 'Decoration animation time', '장식 애니메이션 시간'), min: 0.1, max: 2.5, step: 0.05, format: 's' }
      ] },
      { type: 'section', label: T('背景（画像全体）', 'Background (whole image)', '배경 (이미지 전체)'), children: [
        { type: 'chips', bind: 'bg.type', options: OPT.bg },
        { type: 'colors', when: s => s.bg.type !== 'none', items: [{ bind: 'bg.color', label: T('色', 'Color', '색') }] },
        { type: 'range', bind: 'bg.opacity', when: s => s.bg.type !== 'none', label: T('濃さ', 'Opacity', '농도'), min: 0, max: 1, step: 0.01, format: 'pct' },
        { type: 'toggle', bind: 'bg.sync', when: s => s.bg.type !== 'none', label: T('文字の登場・退場に合わせてフェード', 'Fade with the text', '글자의 등장·퇴장에 맞춰 페이드') }
      ] },
      { type: 'section', label: T('画像サイズ', 'Image size', '이미지 크기'), children: [
        { type: 'size' }
      ] },
      { type: 'section', label: T('配置', 'Position', '배치'), children: [
        { type: 'anchor', bind: 'anchor', label: T('基準位置', 'Anchor', '기준 위치') },
        { type: 'range', bind: 'marginX', label: T('左右の余白', 'Side margin', '좌우 여백'), min: 0, max: 400, step: 1, format: 'px' },
        { type: 'range', bind: 'marginY', label: T('上下の余白', 'Top/bottom margin', '상하 여백'), min: 0, max: 400, step: 1, format: 'px' },
        { type: 'range', bind: 'offsetX', label: T('横の微調整', 'Nudge X', '가로 미세 조정'), min: -800, max: 800, step: 1, format: 'px' },
        { type: 'range', bind: 'offsetY', label: T('縦の微調整', 'Nudge Y', '세로 미세 조정'), min: -800, max: 800, step: 1, format: 'px' }
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

    // 日本語・英語・韓国語の3つから、今の言語の文言を選ぶ
    pick(ja, en, ko) {
      return this.L(T(ja, en, ko));
    }

    L(label) {
      if (!label) return '';
      const value = typeof label === 'function' ? label(this.getScene()) : label;
      if (typeof value === 'string') return value;
      return value[this.getLang()] ?? value.en ?? value.ja;
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
      const fmt = FORMATS[item.format] || { digits: 2, suffix: T('', '', '') };
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
          hex.textContent = v ? String(v).toUpperCase() : this.pick('未使用', 'Not used', '사용 안 함');
          if (clear) clear.textContent = v ? '×' : '+';
          if (clear) clear.setAttribute('aria-label', v ? this.pick('色を外す', 'Remove color', '색 제거') : this.pick('色を追加', 'Add color', '색 추가'));
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
            if (mode === 'trailer' && phase === 'in' && (fx.level === 'block' || fx.noTrailer)) return;
            // 「消さない」は退場スイッチ（outEnabled）で切り替えるため、カードには出さない
            if (phase === 'out' && fx.level === 'none') return;
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
          badge.textContent = fx.level === 'block' ? this.pick('全体', 'Whole', '전체') : (fx.level === 'glyph' ? this.pick('1文字ずつ', 'Per char', '한 글자씩') : '');
          badge.hidden = !badge.textContent;
        });
        grid.setAttribute('aria-label', this.L(phase === 'in' ? T('登場エフェクト', 'Entrance effects', '등장 효과') : T('退場エフェクト', 'Exit effects', '퇴장 효과')));
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
      // 自作フォントの登録はいつでも押せるよう、一覧の外に置く
      const upload = el('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2', class: 'visually-hidden', id: nextId('font-file') });
      const uploadBtn = el('label', { class: 'mini-button font-register', for: upload.id });
      const uploadNote = el('span', { class: 'font-register-note' });
      const register = el('div', { class: 'font-register-row' }, [uploadBtn, upload, uploadNote]);
      const localInput = el('input', { type: 'text', class: 'text-input', spellcheck: 'false' });
      const localBtn = el('button', { type: 'button', class: 'mini-button' });
      const extras = el('div', { class: 'font-extras' }, [
        el('div', { class: 'font-extra-row' }, [localInput, localBtn])
      ]);
      const panel = el('div', { class: 'font-panel', hidden: true }, [cats, grid, extras]);
      const label = el('span', { class: 'field-label' });
      const node = el('div', { class: 'field field-wide font-picker' }, [label, toggle, register, panel]);

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
          if (font.user) {
            // 登録の解除は、誤操作を防ぐため2回押しで行う
            const unregister = this.pick('登録を解除', 'Remove', '등록 해제');
            const remove = el('button', { type: 'button', class: 'font-remove', 'data-remove': font.id, text: '×', title: this.pick('登録を解除', 'Remove from My Fonts', '마이 폰트에서 해제'), 'aria-label': `${unregister}: ${font.label || font.family}` });
            let armed = 0;
            remove.addEventListener('click', event => {
              event.stopPropagation();
              if (!armed) {
                remove.classList.add('is-armed');
                remove.textContent = this.pick('解除する', 'Remove?', '해제할까요?');
                armed = setTimeout(() => { armed = 0; remove.classList.remove('is-armed'); remove.textContent = '×'; }, 3000);
                return;
              }
              clearTimeout(armed);
              this.onAction('removeFont', { id: font.id });
            });
            grid.appendChild(el('div', { class: 'font-card-wrap' }, [card, remove]));
          } else {
            grid.appendChild(card);
          }
          if (observer && !font.user) observer.observe(card);
          else if (!font.user) F.loadPreview(font).then(alias => { if (alias) card.querySelector('.font-card-sample').style.fontFamily = `"${alias}"`; });
        });
      };

      const buildCats = () => {
        cats.innerHTML = '';
        [{ id: 'all', label: T('すべて', 'All', '전체') }].concat(F.CATEGORIES).forEach(cat => {
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
        uploadBtn.textContent = this.L(T('＋ 自作フォントを登録（TTF / OTF / WOFF）', '+ Add your own font (TTF / OTF / WOFF)', '＋ 직접 만든 폰트 등록 (TTF / OTF / WOFF)'));
        uploadNote.textContent = this.L(T('登録したフォントはこのブラウザに保存され、次回も「マイフォント」から選べます（外部には送信されません）', 'Saved in this browser only and listed under “My Fonts” next time (never uploaded)', '등록한 폰트는 이 브라우저에 저장되어 다음에도 「마이 폰트」에서 고를 수 있습니다 (외부로 전송되지 않습니다)'));
        sample.style.fontStyle = scene.italic ? 'italic' : 'normal';
        localInput.placeholder = this.L(T('PCにあるフォント名（例：游明朝）', 'Installed font name (e.g. Georgia)', 'PC에 설치된 폰트 이름 (예: 맑은 고딕)'));
        localBtn.textContent = this.L(T('使う', 'Use', '사용'));
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
        tl: T('左上', 'Top left', '왼쪽 위'), tc: T('上', 'Top', '위'), tr: T('右上', 'Top right', '오른쪽 위'),
        ml: T('左', 'Left', '왼쪽'), mc: T('中央', 'Center', '중앙'), mr: T('右', 'Right', '오른쪽'),
        bl: T('左下', 'Bottom left', '왼쪽 아래'), bc: T('下', 'Bottom', '아래'), br: T('右下', 'Bottom right', '오른쪽 아래')
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
        label.textContent = this.L(T('サイズ', 'Size', '크기'));
        this.fillOptions(select, P.SIZE_PRESETS.map(p => ({ value: p.id, label: p.label })));
        select.value = scene.sizePreset || 'custom';
        if (document.activeElement !== w) w.value = scene.width;
        if (document.activeElement !== h) h.value = scene.height;
        custom.hidden = scene.sizePreset !== 'custom';
        w.setAttribute('aria-label', this.L(T('幅', 'Width', '너비')));
        h.setAttribute('aria-label', this.L(T('高さ', 'Height', '높이')));
      });
      return el('div', { class: 'field field-wide' }, [label, select, custom]);
    }
  }

  root.TextApngControls = { ControlPanel, FX_LABELS, SCHEMA, getPath, setPath, OPT };
})(window);
