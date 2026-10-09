/*
 * 文字画像APNGメーカーEX — 初期値・テンプレート・プリセット
 */
(function (root) {
  'use strict';

  const BASE = {
    mode: 'message',
    text: '',
    subText: '',
    subPosition: 'below',
    width: 1280,
    height: 720,
    sizePreset: '1280x720',
    anchor: 'mc',
    marginX: 64,
    marginY: 56,
    offsetX: 0,
    offsetY: 0,
    writing: 'h',
    align: 'center',
    autoFit: true,
    wrapChars: 0,
    fontId: 'noto-serif-jp',
    weight: 700,
    italic: false,
    fontSize: 120,
    letterSpacing: 0.08,
    lineHeight: 1.5,
    subFontId: 'same',
    subWeight: 400,
    subItalic: false,
    subSize: 0.3,
    subLetterSpacing: 0.25,
    subGap: 0.3,
    fill: { type: 'solid', color: '#ffffff', color2: '#ffd76a', color3: '', dir: 'v' },
    fillOpacity: 1,
    stroke: { on: true, width: 5, color: '#1b1b1f' },
    stroke2: { on: false, width: 6, color: '#ffffff' },
    shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 5 },
    glow: { on: false, color: '#7fb4ff', size: 28, strength: 1 },
    subColorOn: false,
    subColor: '#ffffff',
    deco: {
      type: 'none', color: '#000000', opacity: 0.55, color2: '#ffffff', pad: 0.4, extend: 0.8, thickness: 3, outline: false, soft: 0.5, sideFade: 0.3, radius: 0.2, anim: 'grow', dur: 0.45,
      tapeColor: '#f5c400', tapeStripe: '#151515', tapeSize: 40, tapeSpeed: 90, tapeBlink: 0.5
    },
    bg: { type: 'none', color: '#000000', opacity: 0.45, sync: true },
    inFx: 'fade',
    inDur: 0.6,
    inStagger: 0,
    inOrder: 'forward',
    inEase: 'auto',
    inPower: 1,
    inDir: 'left',
    holdFx: 'none',
    hold: 1.5,
    holdPower: 1,
    // ノイズ（グリッチ）で左右にずれる2色
    glitchColor: '#ff285a',
    glitchColor2: '#28e6ff',
    outEnabled: true,
    outFx: 'fade',
    outDur: 0.6,
    outStagger: 0,
    outOrder: 'forward',
    outEase: 'auto',
    outPower: 1,
    outDir: 'left',
    subFx: 'same',
    subDelay: -0.2,
    startDelay: 0.1,
    endDelay: 0.3,
    reveal: 'char',
    cps: 12,
    glyphDur: 0.4,
    linePause: 0.35,
    punctPause: 0.25,
    lineInterval: 0.9,
    sweepDur: 1.2,
    pageSplit: true,
    pageGap: 0.3,
    cursor: false,
    cursorColor: '',
    scrollSpeed: 90,
    scrollFade: true,
    soloSize: 0.55,
    soloPause: 0.4,
    soloImpact: 1,
    spreadHold: 0.5,
    spreadDur: 0.9,
    // EXの演出。type: 'none' / 'lightning' / 'cyber' / 'katana' / 'frame' / 'crest' / 'gunshot'
    // tier：判定カットイン（'blade' / 'shot'）の結果の段階 'success' / 'special' / 'extreme' / 'critical' / 'failure' / 'fumble'
    sfx: { type: 'none', color: '#8fd3ff', color2: '#14040a', power: 1, word: 'WARNING', tier: 'success' },
    // EXの環境の演出（どのテンプレート・演出とも重ねられる）。type: 'none' / 'ash'（灰色の灰）/ 'ashBlack'（黒い灰）、density：量
    env: { type: 'none', density: 1 }
  };

  const T = (ja, en, ko) => ({ ja, en, ko });

  // 戦闘開始・戦闘終了は同じデザイン
  const BATTLE_PATCH = {
    fontId: 'shippori-mincho-b1', weight: 800, fontSize: 124, letterSpacing: 0.12,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.62,
    fill: { type: 'solid', color: '#ffffff' },
    stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.35, blur: 10, x: 0, y: 3 },
    glow: { on: false },
    deco: { type: 'frame', color: '#000000', opacity: 0, color2: '#ffffff', thickness: 3, pad: 0.28, extend: 12, anim: 'grow', dur: 0.6 },
    inFx: 'drop', inDur: 0.55, inStagger: 0.1, inPower: 1.1, hold: 1.4, outFx: 'zoomThrough', outDur: 0.5, subFx: 'fade', subDelay: -0.1
  };

  // 秘匿確認・秘匿処理中は同じ青いシステム画面
  const SECRET_PATCH = {
    fontId: 'biz-udpmincho', weight: 700, fontSize: 72, letterSpacing: 0.12,
    subPosition: 'above', subFontId: 'share-tech-mono', subWeight: 400, subSize: 0.32, subLetterSpacing: 0.35, subGap: 0.45,
    fill: { type: 'solid', color: '#ffffff' },
    stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#020b1a', opacity: 0.6, blur: 8, x: 0, y: 2 },
    glow: { on: true, color: '#3a8dff', size: 10, strength: 0.45 },
    subColorOn: true, subColor: '#8cc4ff',
    deco: { type: 'box', color: '#081a33', opacity: 0.85, color2: '#3a8dff', pad: 0.5, thickness: 2, radius: 0.14, anim: 'grow', dur: 0.4 },
    inFx: 'typewriter', inStagger: 0.05, hold: 2, outFx: 'fade', outDur: 0.45, subFx: 'fade', subDelay: -3
  };

  // ロールプレイをどうぞ：秘匿確認と同じシステム画面の緑版
  const ROLEPLAY_PATCH = {
    ...SECRET_PATCH,
    shadow: { on: true, color: '#021a0e', opacity: 0.6, blur: 8, x: 0, y: 2 },
    glow: { on: true, color: '#2fd07a', size: 10, strength: 0.45 },
    subColor: '#93ecb8',
    deco: { type: 'box', color: '#062a1a', opacity: 0.85, color2: '#2fd07a', pad: 0.5, thickness: 2, radius: 0.14, anim: 'grow', dur: 0.4 }
  };

  // ラウンド1〜5は同じデザイン（数字だけが違う）
  const ROUND_PATCH = {
    fontId: 'shippori-mincho-b1', weight: 800, fontSize: 124, letterSpacing: 0.16,
    fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.35, blur: 10, x: 0, y: 3 }, glow: { on: false },
    deco: { type: 'sides', color2: '#ffffff', pad: 0.5, extend: 1.6, thickness: 3, anim: 'grow', dur: 0.6 },
    inFx: 'drop', inDur: 0.55, inStagger: 0.1, inPower: 1.1, hold: 1.3, outFx: 'fade', outDur: 0.5
  };

  // 章タイトル・プロローグ・エピローグは同じデザイン（光と下線の色だけが違う）
  const CHAPTER_PATCH = {
    fontId: 'shippori-mincho-b1', weight: 800, fontSize: 128, letterSpacing: 0.22,
    subFontId: 'same', subWeight: 400, subSize: 0.3, subLetterSpacing: 0.15, subGap: 0.45,
    fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
    deco: { type: 'underline', color2: '#ffffff', pad: 0.3, extend: 0.5, thickness: 2, anim: 'grow', dur: 0.9 },
    inFx: 'blurIn', inDur: 1.0, inStagger: 0.15, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.2
  };

  // 一日目・最終日は同じデザイン
  const DAY_PATCH = {
    fontId: 'shippori-mincho-b1', weight: 800, fontSize: 150, letterSpacing: 0.3,
    subFontId: 'same', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.5, subGap: 0.5,
    fill: { type: 'solid', color: '#fff6e3' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.75, blur: 14, x: 0, y: 4 },
    glow: { on: true, color: '#ffcf7a', size: 22, strength: 0.45 },
    subColorOn: true, subColor: '#e8c27a',
    deco: { type: 'underline', color2: '#e0b35a', pad: 0.3, extend: 0.9, thickness: 2, anim: 'grow', dur: 0.9 },
    inFx: 'rise', inDur: 1.1, inStagger: 0.12, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.3
  };

  // 判定結果は「戦闘開始」と同じタイトル枠の中に出す。
  // 成功は度合いが上がるほど明るく派手に（白 → 青い光 → 水色の強い光 → 金の閃光 → 虹色）、失敗は暗く沈み、ファンブルはさらに暗い赤に
  const DICE_FRAME = {
    ...BATTLE_PATCH,
    subColorOn: true
  };
  const diceFrame = (line, fill = { color: '#000000', opacity: 0 }, thickness = 4.5) => ({ ...BATTLE_PATCH.deco, color2: line, color: fill.color, opacity: fill.opacity, thickness });
  const DICE_SUCCESS = {
    ...DICE_FRAME,
    fill: { type: 'solid', color: '#ffffff' },
    glow: { on: true, color: '#ffffff', size: 14, strength: 0.35 },
    subColor: '#e8eef8',
    deco: diceFrame('#ffffff')
  };
  const DICE_GOOD = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#ffffff', color2: '#e3f3ff', color3: '#9fd4ff', dir: 'v' },
    glow: { on: true, color: '#58b4ff', size: 22, strength: 0.7 },
    subColor: '#bfe3ff',
    deco: diceFrame('#9fd4ff'),
    holdFx: 'glow', holdPower: 0.5
  };
  const DICE_GREAT = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#ffffff', color2: '#dcfbff', color3: '#6fe3ff', dir: 'v' },
    shadow: { on: true, color: '#001a26', opacity: 0.45, blur: 10, x: 0, y: 3 },
    glow: { on: true, color: '#27d3ff', size: 32, strength: 1 },
    subColor: '#c8f6ff',
    deco: diceFrame('#7fe8ff'),
    inFx: 'zoomIn', inDur: 0.6, inStagger: 0, inPower: 1, holdFx: 'glow', holdPower: 0.8
  };
  const DICE_CRITICAL = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#fffef0', color2: '#ffe27a', color3: '#ffb300', dir: 'v' },
    stroke: { on: true, width: 1.5, color: '#5a3a00' },
    shadow: { on: true, color: '#2a1a00', opacity: 0.5, blur: 10, x: 0, y: 3 },
    glow: { on: true, color: '#ffc21a', size: 44, strength: 1.5 },
    subColor: '#ffe9a8',
    deco: diceFrame('#ffd24a', undefined, 5.5),
    inFx: 'flash', inDur: 0.8, inStagger: 0, inPower: 1, holdFx: 'glow', holdPower: 1.2, hold: 1.6
  };
  const DICE_BEYOND = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#fffbe0', color2: '#ff9ee6', color3: '#8f8bff', dir: 'v' },
    stroke: { on: true, width: 1.5, color: '#2a0f40' },
    shadow: { on: true, color: '#12002a', opacity: 0.5, blur: 10, x: 0, y: 3 },
    glow: { on: true, color: '#ff7ae0', size: 48, strength: 1.6 },
    subColor: '#ffd6f6',
    deco: diceFrame('#ffe6ff', undefined, 5.5),
    inFx: 'flash', inDur: 0.9, inStagger: 0, inPower: 1, holdFx: 'pulse', holdPower: 1, hold: 1.8
  };
  const DICE_FAILURE = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#ff9a9a', color2: '#e04848', color3: '#9e1f1f', dir: 'v' },
    shadow: { on: true, color: '#000000', opacity: 0.7, blur: 14, x: 0, y: 5 },
    subColor: '#e07a7a',
    deco: diceFrame('#8a2a2a', { color: '#120505', opacity: 0.55 }),
    outFx: 'sink', outDur: 0.7, outStagger: 0.06
  };
  const DICE_FUMBLE = {
    ...DICE_FRAME,
    fill: { type: 'gradient', color: '#ff5a5a', color2: '#b00000', color3: '#4a0000', dir: 'v' },
    stroke: { on: true, width: 2, color: '#1a0000' },
    shadow: { on: true, color: '#000000', opacity: 0.85, blur: 16, x: 0, y: 6 },
    glow: { on: true, color: '#c00000', size: 30, strength: 1 },
    subColor: '#ff7a7a',
    deco: diceFrame('#b00000', { color: '#0a0000', opacity: 0.72 }),
    inFx: 'glitch', inDur: 0.8, inStagger: 0, inPower: 1, holdFx: 'glitch', holdPower: 0.7, hold: 1.8, outFx: 'sink', outDur: 0.8, outStagger: 0.05
  };
  // 判定カットイン（抜刀・銃撃）：段階ごとの色。accent は演出の色、band は帯の色。
  // 成功は白、スペシャル（CoC7のハード成功）は水色、イクストリーム（極成功）は紫、決定的成功（クリティカル）は金、失敗は灰、致命的失敗（ファンブル）は赤
  const ROLL_LOOK = {
    success: {
      accent: '#dbe9ff', band: '#05070b',
      patch: { fill: { type: 'gradient', color: '#ffffff', color2: '#f2f6fb', color3: '#c9d8ea', dir: 'v' }, glow: { on: true, color: '#9cc4ff', size: 16, strength: 0.45 }, subColor: '#c9d8ea' }
    },
    special: {
      accent: '#4fd6ff', band: '#03080c',
      patch: { fill: { type: 'gradient', color: '#ffffff', color2: '#d4f6ff', color3: '#4fd6ff', dir: 'v' }, glow: { on: true, color: '#18c8ff', size: 26, strength: 0.9 }, subColor: '#a8ecff' }
    },
    extreme: {
      accent: '#b98cff', band: '#07040d',
      patch: {
        fill: { type: 'gradient', color: '#ffffff', color2: '#ece0ff', color3: '#a678ff', dir: 'v' },
        glow: { on: true, color: '#9358ff', size: 30, strength: 1.0 }, subColor: '#dccbff', hold: 1.9
      }
    },
    critical: {
      accent: '#ffc83d', band: '#0c0802',
      patch: {
        fill: { type: 'gradient', color: '#fffbe8', color2: '#ffe07a', color3: '#ffae00', dir: 'v' }, stroke: { on: true, width: 1.5, color: '#4a2f00' },
        glow: { on: true, color: '#ffbf1a', size: 40, strength: 1.4 }, subColor: '#ffe39a', holdFx: 'glow', holdPower: 0.8, hold: 2.0
      }
    },
    failure: {
      accent: '#8e96a3', band: '#08090b',
      patch: { fill: { type: 'gradient', color: '#d5d9df', color2: '#a9b0ba', color3: '#7c8491', dir: 'v' }, glow: { on: false }, subColor: '#8e96a3', inFx: 'fade', inDur: 0.4, hold: 2.0, outFx: 'sink', outDur: 0.8, outStagger: 0.05 }
    },
    fumble: {
      accent: '#e3263f', band: '#0e0205',
      patch: {
        fill: { type: 'gradient', color: '#ff7a7a', color2: '#d61a2e', color3: '#5c0010', dir: 'v' }, stroke: { on: true, width: 2, color: '#1a0004' },
        glow: { on: true, color: '#d0001c', size: 28, strength: 0.9 }, subColor: '#ff8a8a', holdFx: 'flicker', holdPower: 0.4, hold: 1.9
      }
    }
  };
  // 抜刀：装甲明朝に英語のサブ。退場は一閃と同じ向きに斬られて消える（失敗は沈む、致命的失敗は割れた下から落ちる）
  const BLADE_ROLL = {
    fontId: 'soukou-mincho', weight: 400, letterSpacing: 0.14,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.24, subLetterSpacing: 0.6, subGap: 0.42,
    stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.75, blur: 10, x: 0, y: 3 },
    subColorOn: true, deco: { type: 'none' },
    inFx: 'fade', inDur: 0.08, inStagger: 0, subFx: 'fade', subDelay: 0.05,
    hold: 1.7, outFx: 'split', outDur: 1.0
  };
  // 銃撃：太いゴシックに英語のサブ
  const SHOT_ROLL = {
    fontId: 'zen-kaku-gothic-new', weight: 900, letterSpacing: 0.1,
    subFontId: 'oxanium', subWeight: 700, subSize: 0.24, subLetterSpacing: 0.55, subGap: 0.36,
    stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.75, blur: 10, x: 0, y: 3 },
    subColorOn: true, deco: { type: 'none' },
    inFx: 'fade', inDur: 0.06, inStagger: 0, subFx: 'fade', subDelay: 0.05,
    hold: 1.7, outFx: 'fade', outDur: 0.5
  };
  const rollPatch = (kind, tier, fontSize) => {
    const look = ROLL_LOOK[tier];
    const base = kind === 'blade' ? BLADE_ROLL : SHOT_ROLL;
    const patch = { ...base, fontSize, ...look.patch, sfx: { type: kind, tier, color: look.accent, color2: look.band, power: 1 } };
    if (kind === 'blade' && tier === 'fumble') Object.assign(patch, { outFx: 'fade', outDur: 0.9 });
    if (kind === 'shot' && tier === 'fumble') Object.assign(patch, { inFx: 'glitch', inDur: 0.45 });
    // 銃撃の失敗の「失敗」は、抜刀の失敗と同じ装甲明朝にそろえる
    if (kind === 'shot' && tier === 'failure') Object.assign(patch, { fontId: BLADE_ROLL.fontId, weight: BLADE_ROLL.weight, letterSpacing: BLADE_ROLL.letterSpacing });
    return patch;
  };

  // 炎の試作を組み込んだテンプレート：装甲明朝。試作と同じ 960×540（炎は細かい模様が多く、書き出しの目安 5MB に収めるため）
  const FIRE_SIZE = { width: 960, height: 540, sizePreset: '960x540' };
  const FIRE_TITLE = {
    fontId: 'soukou-mincho', weight: 400, fontSize: 132, letterSpacing: 0.16,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
    fill: { type: 'gradient', color: '#ffffff', color2: '#fff1dc', color3: '#ffc890', dir: 'v' },
    stroke: { on: true, width: 2, color: '#2a0800' }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.75, blur: 12, x: 0, y: 3 },
    glow: { on: true, color: '#ff5a1a', size: 22, strength: 0.6 },
    subColorOn: true, subColor: '#ffe2c0', deco: { type: 'none' }
  };
  // 燃える文字：文字の画そのものが炎になる（色・縁取りの設定は使わない）。試作と同じく画像の高さの3割の大きさ
  const FIRE_TEXT = {
    fontId: 'soukou-mincho', weight: 400, fontSize: 162, letterSpacing: 0.06,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
    fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: false }, glow: { on: false }, subColorOn: true, subColor: '#ffe2c0', deco: { type: 'none' }
  };
  // 風に舞う灰：シーンの見出し（灰はどのテンプレートにも「環境」から重ねられる）。6秒で一周
  const ASH_TITLE = {
    fontId: 'shippori-mincho-b1', weight: 800, fontSize: 128, letterSpacing: 0.3,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.5,
    fill: { type: 'solid', color: '#f2ece4' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.85, blur: 16, x: 0, y: 4 },
    glow: { on: false }, subColorOn: true, subColor: '#c9bfb3',
    inFx: 'blurIn', inDur: 1.0, inStagger: 0.12, hold: 3.0, outFx: 'fade', outDur: 1.0, subFx: 'fade', subDelay: -0.3,
    startDelay: 0.1, endDelay: 0.5
  };

  // 判定の呼びかけ（共鳴判定・憑依判定など）
  const CHECK_CALL = {
    fontId: 'kaisei-decol', weight: 700, fontSize: 120, letterSpacing: 0.2,
    subFontId: 'cinzel', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.55, subGap: 0.4,
    fill: { type: 'gradient', color: '#ffffff', color2: '#e9ddff', color3: '#b89cff', dir: 'v' },
    stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#12002a', opacity: 0.7, blur: 12, x: 0, y: 4 },
    glow: { on: true, color: '#a57bff', size: 28, strength: 0.8 },
    subColorOn: true, subColor: '#d9c8ff',
    deco: { type: 'corners', color2: '#c9b3ff', pad: 0.45, thickness: 3, anim: 'grow', dur: 0.6 },
    inFx: 'emerge', inDur: 1.0, holdFx: 'glow', holdPower: 0.8, hold: 1.8, outFx: 'blurOut', outDur: 0.7, subFx: 'fade', subDelay: -0.2
  };
  // 共鳴判定は青系
  const RESONANCE_CALL = {
    ...CHECK_CALL,
    fill: { type: 'gradient', color: '#ffffff', color2: '#dcebff', color3: '#7fb0ff', dir: 'v' },
    shadow: { on: true, color: '#00102a', opacity: 0.7, blur: 12, x: 0, y: 4 },
    glow: { on: true, color: '#4d8dff', size: 28, strength: 0.8 },
    subColor: '#c6dcff',
    deco: { ...CHECK_CALL.deco, color2: '#9fc4ff' }
  };
  // フェイズの見出し（ダブルクロスのオープニング〜エンディング）
  const PHASE_TITLE = {
    fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 92, letterSpacing: 0.14,
    subFontId: 'orbitron', subWeight: 700, subSize: 0.26, subLetterSpacing: 0.55, subGap: 0.3,
    fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
    shadow: { on: true, color: '#000000', opacity: 0.6, blur: 8, x: 0, y: 3 },
    glow: { on: true, color: '#5ad1ff', size: 16, strength: 0.4 },
    subColorOn: true, subColor: '#7fe3ff',
    deco: { type: 'band', color: '#02060c', opacity: 0.72, pad: 0.45, soft: 0.2, sideFade: 0.2, anim: 'grow', dur: 0.45 },
    inFx: 'wipe', inDir: 'lr', inDur: 0.7, hold: 1.6, outFx: 'wipe', outDir: 'lr', outDur: 0.6
  };

  // メッセージのテンプレートの分類（テンプレート一覧の上のタブ）。systems があれば、その下にシステムの段を出す
  const TEMPLATE_GROUPS = {
    message: [
      { id: 'combat', label: T('戦闘', 'Combat', '전투') },
      { id: 'investigation', label: T('探索・事件', 'Investigation', '탐색·사건') },
      { id: 'gm', label: T('GM', 'GM', 'GM') },
      { id: 'scene', label: T('シーン・時間', 'Scene & Time', '장면·시간') },
      { id: 'dice', label: T('判定', 'Dice', '판정'), systems: [
        { id: 'coc6', label: T('CoC6', 'CoC 6e', 'CoC6') },
        { id: 'coc7', label: T('CoC7', 'CoC 7e', 'CoC7') },
        { id: 'cocBlade', label: T('CoC6 抜刀', 'CoC 6e Katana', 'CoC6 발도') },
        { id: 'cocGun', label: T('CoC6 銃撃', 'CoC 6e Gunfire', 'CoC6 총격') },
        { id: 'coc7Blade', label: T('CoC7 抜刀', 'CoC 7e Katana', 'CoC7 발도') },
        { id: 'coc7Gun', label: T('CoC7 銃撃', 'CoC 7e Gunfire', 'CoC7 총격') },
        { id: 'emoklore', label: T('エモクロア', 'Emoklore', '에모크로아') },
        { id: 'dx', label: T('ダブクロ', 'Double Cross', '더블크로스') }
      ] }
    ]
  };

  // 書き出しのループの初期値（テンプレートを選ぶと、この値になる）。ふだんは「1回再生」。
  // 画面に出したままにすることが多いGMの案内と判定の結果は「ずっとループ」。テンプレートに loop があればそれを使う
  const LOOP_BY_GROUP = { gm: 'infinite', dice: 'infinite' };

  const TEMPLATES = {
    message: [
      {
        id: 'battle', group: 'combat', icon: 'swords', label: T('戦闘開始', 'Battle Start', '전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'ENGAGE', 'BATTLE START'),
        patch: BATTLE_PATCH
      },
      {
        id: 'battleEnd', group: 'combat', icon: 'flag', label: T('戦闘終了', 'Battle End', '전투 종료'),
        text: T('戦闘終了', 'BATTLE END', '전투 종료'), subText: T('BATTLE END', 'DISENGAGE', 'BATTLE END'),
        patch: BATTLE_PATCH
      },
      {
        // EX：落雷とともに現れ、文字の上を電気が走り、もう一度の落雷で消える
        id: 'battleLightning', group: 'combat', icon: 'bolt', label: T('雷鳴の戦闘開始', 'Thunder Battle Start', '뇌명의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'ENGAGE', 'BATTLE START'),
        patch: {
          fontId: 'soukou-mincho', weight: 400, fontSize: 128, letterSpacing: 0.12,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.5,
          fill: { type: 'gradient', color: '#ffffff', color2: '#e3f4ff', color3: '#8fd3ff', dir: 'v' },
          stroke: { on: true, width: 2, color: '#0a1a33' }, stroke2: { on: false },
          shadow: { on: true, color: '#000814', opacity: 0.6, blur: 10, x: 0, y: 3 },
          glow: { on: true, color: '#4ab8ff', size: 26, strength: 0.9 },
          subColorOn: true, subColor: '#bfe6ff',
          sfx: { type: 'lightning', color: '#8fd3ff', power: 1 },
          inFx: 'flash', inDur: 0.6, hold: 2, outFx: 'fade', outDur: 0.45, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        // EX：走査線と回る照準・警告マーク・左右の表示が起動して点滅し、横一本の線につぶれて暗い帯に開き「ENGAGE」がグリッチで出る
        id: 'cyberWarning', group: 'combat', icon: 'warning', label: T('WARNING / ENGAGE', 'Warning / Engage', 'WARNING / ENGAGE'),
        text: T('ENGAGE', 'ENGAGE', 'ENGAGE'), subText: T('BATTLE START', 'BATTLE START', 'BATTLE START'),
        patch: {
          fontId: 'tektur', weight: 800, fontSize: 116, letterSpacing: 0.22,
          subFontId: 'kode-mono', subWeight: 400, subSize: 0.2, subLetterSpacing: 0.7, subGap: 0.42,
          fill: { type: 'gradient', color: '#ffffff', color2: '#fff0f2', color3: '#ff9aa8', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.5, blur: 10, x: 0, y: 2 }, glow: { on: true, color: '#ff1f3d', size: 16, strength: 0.5 },
          subColorOn: true, subColor: '#ff5a70',
          glitchColor: '#ff1f3d', glitchColor2: '#2af0ff',
          sfx: { type: 'cyber', color: '#ff2b4a', color2: '#12060a', power: 1, word: 'WARNING' },
          inFx: 'glitch', inDur: 0.55, holdFx: 'none', hold: 2.0, outFx: 'glitch', outDur: 0.45, subFx: 'typewriter', subDelay: -0.1
        }
      },
      {
        // EX：「戦闘開始」がそのまま出る → 中央を一閃が走って切れる → 上半分は右へ・下半分は左へずれて消える
        id: 'katanaSlash', group: 'combat', icon: 'katana', label: T('一閃の戦闘開始', 'Katana Battle Start', '일섬의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('', '', ''),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 136, letterSpacing: 0.14,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: true, width: 2, color: '#1b1b1f' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.55, blur: 10, x: 0, y: 4 },
          glow: { on: false },
          sfx: { type: 'katana', color: '#cfe6ff', power: 1 },
          inFx: 'fade', inDur: 0.45, hold: 1.2, outFx: 'split', outDur: 1.4
        }
      },
      {
        // EX：四隅の飾りから二重線の枠が伸び、字間が縮まりながら文字が出る。表示中は光が枠をなぞる
        id: 'battleFrame', group: 'combat', icon: 'frame', label: T('装飾枠の戦闘開始', 'Framed Battle Start', '장식 틀의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'ENGAGE', 'BATTLE START'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 116, letterSpacing: 0.22,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.55, subGap: 0.5,
          fill: { type: 'gradient', color: '#ffffff', color2: '#fff4d6', color3: '#e9c46a', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#1a1206', opacity: 0.6, blur: 10, x: 0, y: 3 },
          glow: { on: true, color: '#e2bd6b', size: 18, strength: 0.5 },
          subColorOn: true, subColor: '#f1d79a',
          sfx: { type: 'frame', color: '#e2bd6b', color2: '#fff1cf', power: 1 },
          inFx: 'tracking', inDur: 1.0, inPower: 0.6, hold: 1.8, outFx: 'fade', outDur: 0.7, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        // EX：金の細い線で描いた剣と盾の紋章。剣が交差して光り、盾の輪郭が引かれ、暗い帯が開いて「戦闘開始」
        id: 'battleCrest', group: 'combat', icon: 'shield', label: T('剣と盾の戦闘開始', 'Sword & Shield Battle Start', '검과 방패의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'ENGAGE', 'BATTLE START'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 108, letterSpacing: 0.3,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.24, subLetterSpacing: 0.6, subGap: 0.42,
          fill: { type: 'gradient', color: '#ffffff', color2: '#fdf6e6', color3: '#ead8a8', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.55, blur: 10, x: 0, y: 2 },
          glow: { on: false },
          subColorOn: true, subColor: '#d8b46a',
          sfx: { type: 'crest', color: '#d8b46a', color2: '#0b0e16', power: 1 },
          inFx: 'rise', inDur: 0.7, inStagger: 0.05, inPower: 0.35, hold: 1.8, outFx: 'fade', outDur: 0.6, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        // EX：四隅の照準が定まり、3発の曳光弾が着弾 → 斜めの赤い帯が走り込んで「戦闘開始」が叩きつけられる
        id: 'battleGunshot', group: 'combat', icon: 'crosshair', label: T('銃撃の戦闘開始', 'Gunfire Battle Start', '총격의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'OPEN FIRE', 'BATTLE START'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 120, letterSpacing: 0.06, italic: true,
          subFontId: 'oswald', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.45, subGap: 0.6, subItalic: true,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#0d0d10', opacity: 1, blur: 0, x: 5, y: 5 },
          glow: { on: false },
          subColorOn: true, subColor: '#ffffff',
          sfx: { type: 'gunshot', color: '#ff2e43', color2: '#0d0d10', power: 1 },
          inFx: 'slam', inDur: 0.55, inPower: 0.5, hold: 1.8, outFx: 'wipe', outDir: 'lr', outDur: 0.45, subFx: 'fade', subDelay: -0.25
        }
      },
      {
        // EX：赤と黒。消失点から手前へ太い線が伸び、「ROUND 1」が奥から斜めに大きくなりながら飛んできて止まる
        id: 'roundCall', group: 'combat', icon: 'badge', label: T('ROUND 1（赤と黒）', 'Round 1 (Red & Black)', 'ROUND 1（빨강과 검정）'),
        text: T('ROUND 1', 'ROUND 1', 'ROUND 1'), subText: T('', '', ''),
        patch: {
          fontId: 'anton', weight: 400, fontSize: 132, letterSpacing: 0.04,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: true, width: 3, color: '#0b0b0e' }, stroke2: { on: false },
          shadow: { on: true, color: '#e8112d', opacity: 1, blur: 0, x: 7, y: 7 },
          glow: { on: false },
          sfx: { type: 'p5round', color: '#e8112d', color2: '#0b0b0e', power: 1 },
          inFx: 'fade', inDur: 0.12, hold: 2.0, outFx: 'fade', outDur: 0.35
        }
      },
      {
        // EX：赤と黒 Ver2。奥から手前へ斜めに伸びる2本の線の間を「ROUND 1」が飛んできて止まる
        id: 'roundCall2', group: 'combat', icon: 'badge', label: T('ROUND 1 Ver2（2本の線）', 'Round 1 v2 (Two Lines)', 'ROUND 1 Ver2（두 줄의 선）'),
        text: T('ROUND 1', 'ROUND 1', 'ROUND 1'), subText: T('', '', ''),
        patch: {
          fontId: 'anton', weight: 400, fontSize: 200, letterSpacing: 0.06,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: true, width: 3, color: '#0b0b0e' }, stroke2: { on: false },
          shadow: { on: true, color: '#e8112d', opacity: 1, blur: 0, x: 6, y: 6 },
          glow: { on: false },
          sfx: { type: 'p5round2', color: '#e8112d', color2: '#0b0b0e', power: 1 },
          inFx: 'fade', inDur: 0.12, hold: 2.0, outFx: 'fade', outDur: 0.35
        }
      },
      {
        // EX：赤と黒。3発の銃弾が赤いギザギザの衝撃と弾痕を残し、斜めの黒い帯が走り込んで、赤と黒の札の上に1文字ずつ文字が飛び出す
        id: 'battleGunRedBlack', group: 'combat', icon: 'crosshair', label: T('戦闘開始＋銃弾（赤と黒）', 'Battle Start + Gunfire (Red & Black)', '전투 개시＋총탄（빨강과 검정）'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'TAKE AIM', 'BATTLE START'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 116, letterSpacing: 0.22,
          subFontId: 'anton', subWeight: 400, subSize: 0.24, subLetterSpacing: 0.4, subGap: 0.55,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: true, width: 2.5, color: '#0b0b0e' }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#ffffff',
          sfx: { type: 'p5gun', color: '#e8112d', color2: '#0b0b0e', power: 1 },
          inFx: 'pop', inDur: 0.4, hold: 1.8, outFx: 'fade', outDur: 0.4, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        // EX：導火線のような火が帯の下の線を左から右へ走り、燃えたところから暗い帯と「戦闘開始」が立ち上がる。最後は左から右へ燃えて消える
        id: 'battleFlame', group: 'combat', icon: 'flame', label: T('炎の戦闘開始', 'Flame Battle Start', '불꽃의 전투 개시'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('BATTLE START', 'IGNITE', 'BATTLE START'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 112, letterSpacing: 0.24,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.42,
          fill: { type: 'gradient', color: '#ffffff', color2: '#ffe4bc', color3: '#ff9a48', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.5, blur: 10, x: 0, y: 2 },
          glow: { on: true, color: '#ff5a1a', size: 20, strength: 0.55 },
          subColorOn: true, subColor: '#ffe2c0',
          sfx: { type: 'flame', color: '#ff7a2a', color2: '#ffd9a0', power: 1 },
          inFx: 'rise', inDur: 0.6, inPower: 0.4, hold: 2.0, outFx: 'burn', outDur: 1.3, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        // EX：文字の画そのものが燃える。左の字から順に燃え上がり、表示中は炎と火の粉が立ちのぼって、最後は冷えて消える
        id: 'fireText', group: 'combat', icon: 'flame', label: T('燃える文字', 'Burning Text', '불타는 글자'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('', '', ''), size: FIRE_SIZE, fps: 20,
        patch: {
          ...FIRE_TEXT,
          sfx: { type: 'fireText', color: '#ff7a2a', color2: '#ffb43a', power: 1 },
          inFx: 'fade', inDur: 0.2, hold: 2.1, outFx: 'fade', outDur: 0.6, subFx: 'fade', subDelay: 0.2, startDelay: 0.05, endDelay: 0
        }
      },
      {
        // EX：火炎ブレスが一瞬で走って字の右端で爆発 → 爆風が右から左へ燃え移り、白と金の縁取りの燃える文字に → 左から火の粉になって消える
        // （試作より燃えている時間を0.17秒短くして、書き出しの目安 5MB に余裕をもたせる）
        id: 'fireTextSeq', group: 'combat', icon: 'flame', label: T('燃える文字・演出', 'Burning Text (Sequence)', '불타는 글자·연출'),
        text: T('戦闘開始', 'BATTLE START', '전투 개시'), subText: T('', '', ''), size: FIRE_SIZE, fps: 20,
        patch: {
          ...FIRE_TEXT,
          sfx: { type: 'fireTextSeq', color: '#ff7a2a', color2: '#ffb43a', power: 1 },
          inFx: 'fade', inDur: 0.16, hold: 1.75, outFx: 'fade', outDur: 0.95, subFx: 'fade', subDelay: 0.2, startDelay: 0, endDelay: 0.05
        }
      },
      {
        // EX：画面の下で炎の壁がずっと燃える（継ぎ目なくループ）。文字は出たまま
        id: 'fireWall', group: 'combat', icon: 'flame', label: T('炎の壁', 'Wall of Fire', '불의 벽'),
        text: T('業火', 'INFERNO', '업화'), subText: T('INFERNO', 'HELLFIRE', 'INFERNO'), size: FIRE_SIZE, fps: 20, loop: 'infinite',
        patch: {
          ...FIRE_TITLE, fontSize: 150, letterSpacing: 0.3, offsetY: -40,
          sfx: { type: 'fireWall', color: '#ff7a2a', color2: '#ffd9a0', power: 1 },
          // 文字は最初のコマから出たまま（退場なし）。炎の壁の一周だけの長さ（2秒。試作の2.5秒では書き出しの目安 5MB を超えるため）にして、継ぎ目なくループさせる
          inFx: 'fade', inDur: 0, hold: 2, outEnabled: false, outFx: 'fade', subFx: 'same', subDelay: 0, startDelay: 0, endDelay: 0
        }
      },
      {
        // EX：左から炎が燃え広がり、文字が浮かぶ。退場では炎も左から順に消えていく（試作より燃えている時間を0.3秒短くして、書き出しの目安 5MB に収める）
        id: 'fireRun', group: 'combat', icon: 'flame', label: T('走る炎', 'Running Fire', '달리는 불길'),
        text: T('火の海', 'SEA OF FIRE', '불바다'), subText: T('SEA OF FIRE', 'ABLAZE', 'SEA OF FIRE'), size: FIRE_SIZE, fps: 20,
        patch: {
          ...FIRE_TITLE, fontSize: 140, letterSpacing: 0.3, offsetY: -40,
          sfx: { type: 'fireRun', color: '#ff7a2a', color2: '#ffd9a0', power: 1 },
          inFx: 'fade', inDur: 0.5, hold: 0.75, outFx: 'fade', outDur: 0.6, subFx: 'fade', subDelay: -0.5, startDelay: 0, endDelay: 0
        }
      },
      {
        // EX：炎の息が地面を走り、右端で爆発して燃え上がる。文字は爆発と同時に現れ、退場で炎の尾が左から抜けていく
        id: 'fireBreath', group: 'combat', icon: 'flame', label: T('火炎ブレス', 'Fire Breath', '화염 브레스'),
        text: T('ドラゴンブレス', 'DRAGON BREATH', '드래곤 브레스'), subText: T('FIRE BREATH', 'FIRE BREATH', 'FIRE BREATH'), size: FIRE_SIZE, fps: 24,
        patch: {
          ...FIRE_TITLE, fontSize: 104, letterSpacing: 0.12, offsetY: -70,
          sfx: { type: 'fireBreath', color: '#ff7a2a', color2: '#ffd9a0', power: 1 },
          inFx: 'fade', inDur: 0.3, hold: 0.63, outFx: 'fade', outDur: 0.6, subFx: 'fade', subDelay: -0.3, startDelay: 0, endDelay: 0.05
        }
      },
      {
        // サイバー風：ネオンの水色、デジタルな書体、グリッチで起動
        id: 'openCombat', group: 'combat', icon: 'chip', label: T('OPEN COMBAT', 'Open Combat', 'OPEN COMBAT'),
        text: T('OPEN COMBAT', 'OPEN COMBAT', 'OPEN COMBAT'), subText: T('戦闘開始', 'COMBAT MODE : ONLINE', '전투 개시'),
        patch: {
          fontId: 'orbitron', weight: 900, fontSize: 120, letterSpacing: 0.16,
          subFontId: 'share-tech-mono', subWeight: 400, subSize: 0.3, subLetterSpacing: 0.5, subGap: 0.45,
          fill: { type: 'gradient', color: '#ffffff', color2: '#b8f6ff', color3: '#3fd8ff', dir: 'v' },
          stroke: { on: true, width: 1.5, color: '#00e5ff' }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: true, color: '#00d9ff', size: 30, strength: 1.3 },
          subColorOn: true, subColor: '#6ff0ff',
          deco: { type: 'lines', color2: '#00e5ff', pad: 0.3, extend: 0.6, thickness: 2, anim: 'grow', dur: 0.45 },
          inFx: 'glitch', inDur: 0.8, holdFx: 'glitch', holdPower: 0.6, hold: 1.8, outFx: 'glitch', outDur: 0.5, subFx: 'typewriter', subDelay: -0.1
        }
      },
      {
        id: 'finalRound', group: 'combat', icon: 'flame', label: T('ファイナルラウンド', 'Final Round', '파이널 라운드'),
        text: T('FINAL ROUND', 'FINAL ROUND', 'FINAL ROUND'), subText: T('', '', ''),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 124, letterSpacing: 0.1,
          fill: { type: 'gradient', color: '#fff4e0', color2: '#ffc27a', color3: '#ff3b1f', dir: 'v' },
          stroke: { on: true, width: 2, color: '#3a0600' }, stroke2: { on: false },
          shadow: { on: true, color: '#1a0000', opacity: 0.7, blur: 12, x: 0, y: 4 },
          glow: { on: true, color: '#ff2a10', size: 34, strength: 1 },
          deco: { type: 'sides', color2: '#ff4a2a', pad: 0.45, extend: 1.0, thickness: 4, anim: 'grow', dur: 0.6 },
          inFx: 'slam', inDur: 0.7, holdFx: 'glitch', holdPower: 1, hold: 1.6, outFx: 'zoomThrough', outDur: 0.5
        }
      },
      {
        // ラウンドのチップは数字違いが並ぶので、アイコンなしで1列に収める
        id: 'round', group: 'combat', label: T('ラウンド1', 'Round 1', '라운드 1'),
        text: T('ROUND 1', 'ROUND 1', 'ROUND 1'), subText: T('', '', ''),
        patch: ROUND_PATCH
      },
      {
        id: 'round2', group: 'combat', label: T('ラウンド2', 'Round 2', '라운드 2'),
        text: T('ROUND 2', 'ROUND 2', 'ROUND 2'), subText: T('', '', ''),
        patch: ROUND_PATCH
      },
      {
        id: 'round3', group: 'combat', label: T('ラウンド3', 'Round 3', '라운드 3'),
        text: T('ROUND 3', 'ROUND 3', 'ROUND 3'), subText: T('', '', ''),
        patch: ROUND_PATCH
      },
      {
        id: 'round4', group: 'combat', label: T('ラウンド4', 'Round 4', '라운드 4'),
        text: T('ROUND 4', 'ROUND 4', 'ROUND 4'), subText: T('', '', ''),
        patch: ROUND_PATCH
      },
      {
        id: 'round5', group: 'combat', label: T('ラウンド5', 'Round 5', '라운드 5'),
        text: T('ROUND 5', 'ROUND 5', 'ROUND 5'), subText: T('', '', ''),
        patch: ROUND_PATCH
      },
      {
        // 赤と黒：黒い帯に赤い文字。ノイズ（グリッチ）の色ずれも赤と黒にして、画面全体の色を崩さない
        id: 'defeat', group: 'combat', icon: 'skull', label: T('敗北', 'Defeat', '패배'),
        text: T('敗北', 'DEFEAT', '패배'), subText: T('DEFEAT', 'BATTLE LOST', 'DEFEAT'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 150, letterSpacing: 0.3,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.9, subGap: 0.45,
          fill: { type: 'gradient', color: '#ff7070', color2: '#e41414', color3: '#780000', dir: 'v' },
          stroke: { on: true, width: 2, color: '#000000' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.9, blur: 14, x: 0, y: 5 },
          glow: { on: true, color: '#c80000', size: 30, strength: 1 },
          subColorOn: true, subColor: '#e03a3a',
          deco: { type: 'band', color: '#000000', opacity: 0.88, pad: 0.42, soft: 0.25, sideFade: 0.35, anim: 'grow', dur: 0.35 },
          glitchColor: '#ff2020', glitchColor2: '#000000',
          inFx: 'glitch', inDur: 0.9, holdFx: 'glitch', holdPower: 1, hold: 1.8, outFx: 'glitch', outDur: 0.8, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        id: 'explore', group: 'investigation', icon: 'search', label: T('探索開始', 'Exploration', '탐색 개시'),
        text: T('探索開始', 'EXPLORATION', '탐색 개시'), subText: T('EXPLORATION', '- PHASE 1 -', 'EXPLORATION'),
        patch: {
          fontId: 'shippori-mincho', weight: 800, fontSize: 116, letterSpacing: 0.28,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.5, subGap: 0.4,
          fill: { type: 'solid', color: '#f6f1e7' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 16, x: 0, y: 4 },
          glow: { on: true, color: '#9fc3ff', size: 26, strength: 0.7 },
          deco: { type: 'lines', color2: '#e8dcc0', pad: 0.35, extend: 1.2, thickness: 2, anim: 'grow', dur: 0.8 },
          inFx: 'tracking', inDur: 1.4, hold: 1.4, outFx: 'tracking', outDur: 1.0, subFx: 'fade', subDelay: -0.5
        }
      },
      {
        id: 'investigate', group: 'investigation', icon: 'badge', label: T('捜査開始', 'Investigation', '수사 개시'),
        text: T('捜査開始', 'INVESTIGATION', '수사 개시'), subText: T('- INVESTIGATION -', '- CASE OPEN -', '- INVESTIGATION -'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 112, letterSpacing: 0.24,
          subFontId: 'special-elite', subWeight: 400, subSize: 0.24, subLetterSpacing: 0.3, subGap: 0.22,
          fill: { type: 'solid', color: '#151515' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#151515',
          deco: { type: 'band', color: '#f3c613', opacity: 1, pad: 0.3, soft: 0, sideFade: 0, anim: 'grow', dur: 0.35 },
          inFx: 'typewriter', inStagger: 0.1, hold: 1.6, outFx: 'wipe', outDir: 'lr', outDur: 0.5, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        // 調査報告の見出し：黒一色のかっちりした明朝（和文タイプの印字のような字面）を1文字ずつ打ち込み、
        // 下に黒いラインを走らせて、タイプライター書体の RESEARCH を小さく添える。
        // 暗い背景でも読めるように、文字とラインに白い縁取り（4px）をつける
        id: 'research', group: 'investigation', icon: 'clipboard', label: T('調査開始', 'Research', '조사 개시'),
        text: T('調査開始', 'RESEARCH', '조사 개시'), subText: T('RESEARCH', 'FIELD NOTES', 'RESEARCH'),
        patch: {
          fontId: 'biz-udpmincho', weight: 700, fontSize: 116, letterSpacing: 0.3,
          subFontId: 'special-elite', subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.55,
          fill: { type: 'solid', color: '#111111' }, stroke: { on: true, width: 4, color: '#ffffff' }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#111111',
          deco: { type: 'underline', color2: '#111111', outline: true, pad: 0.2, extend: 0.4, thickness: 2.5, anim: 'grow', dur: 0.7 },
          inFx: 'typewriter', inStagger: 0.14, hold: 2, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: 0
        }
      },
      {
        id: 'emergency', group: 'investigation', icon: 'warning', label: T('緊急事態', 'Emergency', '긴급 사태'),
        text: T('緊急事態', 'EMERGENCY', '긴급 사태'), subText: T('EMERGENCY', 'WARNING', 'EMERGENCY'),
        patch: {
          fontId: 'noto-sans-jp', weight: 900, fontSize: 118, letterSpacing: 0.32,
          subFontId: 'oswald', subWeight: 700, subSize: 0.26, subLetterSpacing: 0.7, subGap: 0.32,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: true, width: 4, color: '#8a0000' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.65, blur: 8, x: 0, y: 3 }, glow: { on: false },
          subColorOn: true, subColor: '#f5c400',
          deco: { type: 'tape', pad: 0.3, anim: 'grow', dur: 0.55, tapeSize: 54, tapeSpeed: 110, tapeBlink: 0.55 },
          inFx: 'shutter', inDir: 'v', inDur: 0.45, hold: 1.8, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        // 現場写真：ファインダーの四隅の枠と、カメラのフラッシュ
        id: 'incident', group: 'investigation', icon: 'siren', label: T('事件発生', 'Incident', '사건 발생'),
        text: T('事件発生', 'INCIDENT', '사건 발생'), subText: T('CASE FILE No.013', 'CASE FILE No.013', 'CASE FILE No.013'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 120, letterSpacing: 0.3,
          subFontId: 'special-elite', subWeight: 400, subSize: 0.22, subLetterSpacing: 0.3, subGap: 0.42,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.7, blur: 10, x: 0, y: 3 }, glow: { on: false },
          subColorOn: true, subColor: '#ff4040',
          deco: { type: 'corners', color2: '#ffffff', pad: 0.5, thickness: 3, anim: 'grow', dur: 0.4 },
          inFx: 'flash', inDur: 0.8, hold: 1.8, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        // 疾走感：斜体の文字が左から一気に駆け込み、琥珀色の警告灯のように点滅して、右へ走り抜ける。上下の線が素早く伸びる
        id: 'chase', group: 'investigation', icon: 'dash', label: T('追跡開始', 'Chase', '추적 개시'),
        text: T('追跡開始', 'CHASE START', '추적 개시'), subText: T('CHASE START', 'IN PURSUIT', 'CHASE START'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 900, fontSize: 124, letterSpacing: 0.12, italic: true,
          subFontId: 'oswald', subWeight: 700, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.3, subItalic: true,
          fill: { type: 'gradient', color: '#ffffff', color2: '#ffe3a3', color3: '#ff9d1a', dir: 'v' },
          stroke: { on: true, width: 2, color: '#3a1400' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.6, blur: 8, x: 0, y: 3 },
          glow: { on: true, color: '#ff8a00', size: 22, strength: 0.8 },
          subColorOn: true, subColor: '#ffb347',
          deco: { type: 'lines', color2: '#ffb347', pad: 0.3, extend: 1.6, thickness: 3, anim: 'grow', dur: 0.25 },
          inFx: 'slide', inDir: 'left', inDur: 0.3, inStagger: 0.03, inPower: 2.5, holdFx: 'blink', holdPower: 1, hold: 2,
          outFx: 'slide', outDir: 'right', outDur: 0.3, outStagger: 0.02, outPower: 2.5, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        id: 'message', group: 'investigation', icon: 'mail', label: T('メッセージ受信', 'New Message', '메시지 수신'),
        text: T('メッセージが届きました', 'You have a new message', '메시지가 도착했습니다'), subText: T('新着メッセージ', 'NEW MESSAGE', '새 메시지'),
        patch: {
          fontId: 'noto-sans-jp', weight: 700, fontSize: 56, letterSpacing: 0.06,
          subPosition: 'above', subFontId: 'same', subWeight: 700, subSize: 0.46, subLetterSpacing: 0.12, subGap: 0.45,
          fill: { type: 'solid', color: '#1c2430' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#3a7bd5',
          deco: { type: 'box', color: '#ffffff', opacity: 0.96, color2: '#d0d7e2', pad: 0.55, thickness: 0, radius: 0.5, anim: 'fade', dur: 0.3 },
          inFx: 'emerge', inDur: 0.5, hold: 1.8, outFx: 'recede', outDur: 0.45
        }
      },
      {
        id: 'call', group: 'investigation', icon: 'phone', label: T('着信あり', 'Incoming Call', '착신'),
        text: T('着信あり', 'INCOMING CALL', '착신'), subText: T('非通知', 'Unknown Number', '발신자 표시 제한'),
        patch: {
          fontId: 'noto-sans-jp', weight: 700, fontSize: 84, letterSpacing: 0.1,
          subPosition: 'above', subFontId: 'same', subWeight: 400, subSize: 0.4, subLetterSpacing: 0.2, subGap: 0.4,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#3ddc84',
          deco: { type: 'box', color: '#0d1117', opacity: 0.9, color2: '#3ddc84', pad: 0.5, thickness: 3, radius: 0.6, anim: 'fade', dur: 0.3 },
          inFx: 'emerge', inDur: 0.45, holdFx: 'shake', holdPower: 0.35, hold: 2.2, outFx: 'recede', outDur: 0.4
        }
      },
      {
        // 白黒の帯に斜体の文字が左から一気に滑り込み、右へ抜けて消える
        id: 'missionClear', group: 'investigation', icon: 'checkCircle', label: T('ミッションクリア', 'Mission Clear', '미션 클리어'),
        text: T('MISSION CLEAR', 'MISSION CLEAR', 'MISSION CLEAR'), subText: T('ミッションクリア', 'ALL OBJECTIVES COMPLETE', '미션 클리어'),
        patch: {
          fontId: 'oswald', weight: 700, fontSize: 130, letterSpacing: 0.12, italic: true,
          subFontId: 'noto-sans-jp', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.28, subItalic: true,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#bdbdbd',
          deco: { type: 'band', color: '#000000', opacity: 0.9, pad: 0.3, soft: 0, sideFade: 0, anim: 'grow', dur: 0.25 },
          inFx: 'slide', inDir: 'left', inDur: 0.35, inStagger: 0.03, inPower: 2, hold: 1.6,
          outFx: 'wipe', outDir: 'lr', outDur: 0.35, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        id: 'secret', group: 'gm', icon: 'lock', label: T('秘匿を確認してください', 'Check Your Secret', '비닉 확인'),
        text: T('秘匿を確認してください', 'CHECK YOUR SECRET', '비닉을 확인해 주세요'), subText: T('SECRET HANDOUT', 'SECRET HANDOUT', 'SECRET HANDOUT'),
        patch: SECRET_PATCH
      },
      {
        id: 'processing', group: 'gm', icon: 'loader', label: T('秘匿処理中', 'Processing Secrets', '비닉 처리 중'),
        text: T('秘匿処理中...', 'PROCESSING SECRETS...', '비닉 처리 중...'), subText: T('SECRET HANDOUT', 'SECRET HANDOUT', 'SECRET HANDOUT'),
        patch: { ...SECRET_PATCH, inStagger: 0.07, holdFx: 'glow', holdPower: 1, hold: 2.2 }
      },
      {
        id: 'roleplay', group: 'gm', icon: 'mask', label: T('ロールプレイをどうぞ', 'Roleplay Time', '롤플레이 해 주세요'),
        text: T('ロールプレイをどうぞ', 'ROLEPLAY TIME', '롤플레이 해 주세요'), subText: T('ROLE PLAY', 'YOUR TURN', 'ROLE PLAY'),
        patch: ROLEPLAY_PATCH
      },
      {
        id: 'break', group: 'gm', icon: 'coffee', label: T('休憩中', 'On Break', '휴식 중'),
        text: T('休憩中', 'BREAK TIME', '휴식 중'), subText: T('BREAK TIME', 'Back in a few minutes', 'BREAK TIME'),
        patch: {
          fontId: 'zen-maru-gothic', weight: 900, fontSize: 140, letterSpacing: 0.14,
          subFontId: 'm-plus-rounded-1c', subWeight: 700, subSize: 0.24, subLetterSpacing: 0.35, subGap: 0.3,
          fill: { type: 'gradient', color: '#fffdf7', color2: '#ffe6bf', color3: '', dir: 'v' },
          stroke: { on: true, width: 7, color: '#6b3f1d' }, stroke2: { on: true, width: 6, color: '#ffffff' },
          shadow: { on: true, color: '#3a1f0a', opacity: 0.35, blur: 10, x: 0, y: 6 },
          glow: { on: false },
          subColorOn: true, subColor: '#6b3f1d',
          inFx: 'bounce', inDur: 0.9, inStagger: 0.1, holdFx: 'float', holdPower: 0.8, hold: 2.4, outFx: 'sink', outDur: 0.7, outStagger: 0.05, subFx: 'fade'
        }
      },
      {
        // セーフティツールのXカード：黒いカードに赤い文字と赤い縁
        id: 'xcard', group: 'gm', icon: 'xcard', label: T('Xカード', 'X-Card', 'X카드'),
        text: T('X-Card', 'X-Card', 'X-Card'), subText: T('一時中断をお願いします', 'Let’s pause for a moment', '잠시 중단해 주세요'),
        patch: {
          fontId: 'anton', weight: 400, fontSize: 150, letterSpacing: 0.08,
          subFontId: 'noto-sans-jp', subWeight: 700, subSize: 0.19, subLetterSpacing: 0.24, subGap: 0.42,
          fill: { type: 'solid', color: '#e8202f' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#ff6b73',
          deco: { type: 'box', color: '#0b0b0d', opacity: 0.95, color2: '#e8202f', pad: 0.5, thickness: 4, radius: 0.08, anim: 'grow', dur: 0.35 },
          inFx: 'pop', inDur: 0.5, inStagger: 0.05, hold: 2.2, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        id: 'loading', group: 'gm', icon: 'hourglass', label: T('Now Loading', 'Now Loading', 'Now Loading'),
        text: T('Now Loading...', 'Now Loading...', 'Now Loading...'), subText: T('しばらくお待ちください', 'Please wait a moment', '잠시만 기다려 주세요'),
        patch: {
          fontId: 'press-start-2p', weight: 400, fontSize: 64, letterSpacing: 0.04,
          subFontId: 'dotgothic16', subWeight: 400, subSize: 0.42, subLetterSpacing: 0.2, subGap: 0.5,
          fill: { type: 'solid', color: '#ffffff' },
          stroke: { on: true, width: 4, color: '#1b1b3a' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.55, blur: 0, x: 5, y: 5 },
          glow: { on: false },
          inFx: 'typewriter', inStagger: 0.07, holdFx: 'wave', holdPower: 1, hold: 2.4, outFx: 'fade', outDur: 0.4, subFx: 'fade', subDelay: 0
        }
      },
      {
        id: 'simple', group: 'gm', icon: 'type', label: T('シンプルテキスト', 'Simple Text', '심플 텍스트'),
        text: T('メッセージ', 'MESSAGE', '메시지'), subText: T('', '', ''),
        patch: {
          fontId: 'noto-sans-jp', weight: 700, fontSize: 110, letterSpacing: 0.08,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: true, width: 4, color: '#1b1b1f' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.5, blur: 10, x: 0, y: 4 }, glow: { on: false },
          inFx: 'fade', inDur: 0.6, hold: 1.6, outFx: 'fade', outDur: 0.6
        }
      },
      // シーン・時間：物語の構成（章・プロローグ・エピローグ・幕間・回想）→ 日付（一日目・一日後・最終日）→ 時刻（翌朝・真夜中・時間経過）
      {
        // EX：焼けた灰のかけらが風に乗って左下から右上へ舞う（灰は「環境」として、どのテンプレートにも重ねられる）。6秒で継ぎ目なくループ
        id: 'ashDrift', group: 'scene', icon: 'wave', label: T('風に舞う灰', 'Drifting Ash', '바람에 날리는 재'), loop: 'infinite',
        text: T('焦土', 'SCORCHED EARTH', '초토'), subText: T('SCORCHED EARTH', 'AFTER THE FIRE', 'SCORCHED EARTH'),
        patch: { ...ASH_TITLE, env: { type: 'ash', density: 1 } }
      },
      {
        // EX：上の黒い版。縁取りのない黒いかけら（明るい背景向け）。重いかけらは画面の下7割、ごく小さく軽いものだけが上まで昇る
        id: 'ashDriftBlack', group: 'scene', icon: 'wave', label: T('風に舞う灰（黒）', 'Drifting Ash (Black)', '바람에 날리는 재 (검정)'), loop: 'infinite',
        text: T('灰燼', 'ASHES', '잿더미'), subText: T('ASHES', 'NOTHING REMAINS', 'ASHES'),
        // 明るい背景向けなので、文字は墨色に白いにじみ（暗い背景でも読める）
        patch: {
          ...ASH_TITLE, fill: { type: 'solid', color: '#1c1916' },
          shadow: { on: true, color: '#ffffff', opacity: 0.8, blur: 12, x: 0, y: 0 }, subColor: '#2a2622',
          env: { type: 'ashBlack', density: 1 }
        }
      },
      {
        id: 'chapter', group: 'scene', icon: 'book', label: T('章タイトル', 'Chapter', '장 제목'),
        text: T('第一章', 'CHAPTER I', '제1장'), subText: T('「目覚めの夜」', '“The Night of Awakening”', '「각성의 밤」'),
        patch: CHAPTER_PATCH
      },
      {
        // 章タイトルの姉妹版：夜明け前のような青白い光
        id: 'prologue', group: 'scene', icon: 'feather', label: T('プロローグ', 'Prologue', '프롤로그'),
        text: T('プロローグ', 'PROLOGUE', '프롤로그'), subText: T('「すべての始まり」', '“Where It All Began”', '「모든 것의 시작」'),
        patch: { ...CHAPTER_PATCH, glow: { on: true, color: '#9fbaff', size: 22, strength: 0.5 }, deco: { ...CHAPTER_PATCH.deco, color2: '#c9d8ff' } }
      },
      {
        // 章タイトルの姉妹版：物語を閉じる温かい光
        id: 'epilogue', group: 'scene', icon: 'bookClosed', label: T('エピローグ', 'Epilogue', '에필로그'),
        text: T('エピローグ', 'EPILOGUE', '에필로그'), subText: T('「そして、夜が明ける」', '“And So the Night Ends”', '「그리고, 날이 밝는다」'),
        patch: { ...CHAPTER_PATCH, glow: { on: true, color: '#ffd59a', size: 22, strength: 0.5 }, deco: { ...CHAPTER_PATCH.deco, color2: '#f0d6a4' } }
      },
      {
        // 上下の細い金の線と欧文のサブで端正に
        id: 'intermission', group: 'scene', icon: 'curtain', label: T('幕間', 'Intermission', '막간'),
        text: T('幕間', 'INTERLUDE', '막간'), subText: T('INTERMISSION', 'BETWEEN THE ACTS', 'INTERMISSION'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 130, letterSpacing: 0.6,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.7, subGap: 0.5,
          fill: { type: 'solid', color: '#f7f1e3' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.75, blur: 14, x: 0, y: 4 }, glow: { on: false },
          subColorOn: true, subColor: '#d8c28a',
          deco: { type: 'lines', color2: '#d8c28a', pad: 0.35, extend: 0.9, thickness: 1.5, anim: 'grow', dur: 0.9 },
          inFx: 'fade', inDur: 1.0, inStagger: 0.2, hold: 1.8, outFx: 'fade', outDur: 0.9, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        // セピア色の文字がぼかしからにじみ出て、ぼやけながら消える
        id: 'flashback', group: 'scene', icon: 'history', label: T('回想', 'Flashback', '회상'),
        text: T('回想', 'FLASHBACK', '회상'), subText: T('FLASHBACK', 'YEARS AGO', 'FLASHBACK'),
        patch: {
          fontId: 'zen-old-mincho', weight: 700, fontSize: 140, letterSpacing: 0.5,
          subFontId: 'cinzel', subWeight: 400, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
          fill: { type: 'gradient', color: '#f6e7c8', color2: '#dcb983', color3: '#9a7446', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#1e1206', opacity: 0.7, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#c89b5a', size: 24, strength: 0.5 },
          subColorOn: true, subColor: '#d9bd8e',
          inFx: 'blurIn', inDur: 1.4, inStagger: 0.2, hold: 1.6, outFx: 'blurOut', outDur: 1.1, subFx: 'fade', subDelay: -0.4
        }
      },
      {
        id: 'day', group: 'scene', icon: 'calendar', label: T('一日目', 'Day 1', '첫째 날'),
        text: T('一日目', 'DAY 1', '첫째 날'), subText: T('DAY 1', 'THE FIRST DAY', 'DAY 1'),
        patch: DAY_PATCH
      },
      {
        // 映画の「ONE DAY LATER」：字間が縮まりながら現れる
        id: 'dayLater', group: 'scene', icon: 'calendarNext', label: T('一日後', 'One Day Later', '하루 뒤'),
        text: T('一日後', 'ONE DAY LATER', '하루 뒤'), subText: T('ONE DAY LATER', '24 HOURS LATER', 'ONE DAY LATER'),
        patch: {
          fontId: 'shippori-mincho', weight: 800, fontSize: 110, letterSpacing: 0.45,
          subFontId: 'cinzel', subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.45,
          fill: { type: 'solid', color: '#f2f2f2' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#ffffff', size: 18, strength: 0.3 },
          inFx: 'tracking', inDur: 1.6, hold: 1.4, outFx: 'tracking', outDur: 1.2, subFx: 'fade', subDelay: -0.6
        }
      },
      {
        id: 'finalDay', group: 'scene', icon: 'calendarFlag', label: T('最終日', 'Final Day', '마지막 날'),
        text: T('最終日', 'FINAL DAY', '마지막 날'), subText: T('FINAL DAY', 'THE LAST DAY', 'FINAL DAY'),
        patch: DAY_PATCH
      },
      {
        // 朝日：白から淡い金色に変わる文字と温かい光が、下からゆっくり浮かび上がる
        id: 'nextMorning', group: 'scene', icon: 'sunrise', label: T('翌朝', 'Next Morning', '다음 날 아침'),
        text: T('翌朝', 'MORNING', '다음 날 아침'), subText: T('THE NEXT MORNING', 'THE NEXT DAY', 'THE NEXT MORNING'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 150, letterSpacing: 0.4,
          subFontId: 'cinzel', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
          fill: { type: 'gradient', color: '#ffffff', color2: '#fff0c8', color3: '#ffcf73', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#3a2400', opacity: 0.5, blur: 12, x: 0, y: 4 },
          glow: { on: true, color: '#ffc15a', size: 34, strength: 0.8 },
          subColorOn: true, subColor: '#ffd98a',
          inFx: 'rise', inDur: 1.4, inStagger: 0.15, inPower: 0.8, holdFx: 'glow', holdPower: 0.5, hold: 1.6,
          outFx: 'fade', outDur: 1.0, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        // 月明かり：青白い文字がぼかしから現れ、表示中は光がかすかに揺らぐ
        id: 'midnight', group: 'scene', icon: 'moon', label: T('真夜中', 'Midnight', '한밤중'),
        text: T('午前零時', 'MIDNIGHT', '오전 0시'), subText: T('MIDNIGHT', '12:00 AM', 'MIDNIGHT'),
        patch: {
          fontId: 'shippori-mincho', weight: 700, fontSize: 110, letterSpacing: 0.4,
          subFontId: 'cinzel', subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.45,
          fill: { type: 'gradient', color: '#f2f7ff', color2: '#c9dbff', color3: '#8fb0f0', dir: 'v' },
          stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000814', opacity: 0.8, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#6f9bff', size: 28, strength: 0.8 },
          subColorOn: true, subColor: '#aac4ff',
          inFx: 'blurIn', inDur: 1.2, inStagger: 0.1, holdFx: 'glow', holdPower: 0.7, hold: 1.8,
          outFx: 'blurOut', outDur: 1.0, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        id: 'timeSkip', group: 'scene', icon: 'clock', label: T('時間経過', 'Time Skip', '시간 경과'),
        text: T('一時間経過', 'ONE HOUR LATER', '한 시간 후'), subText: T('ONE HOUR LATER', '', 'ONE HOUR LATER'),
        patch: {
          fontId: 'shippori-mincho', weight: 700, fontSize: 76, letterSpacing: 0.35,
          subFontId: 'cinzel', subWeight: 400, subSize: 0.26, subLetterSpacing: 0.5, subGap: 0.5,
          fill: { type: 'solid', color: '#f2f2f2' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 12, x: 0, y: 3 }, glow: { on: false },
          deco: { type: 'sides', color2: '#f2f2f2', pad: 0.55, extend: 2.6, thickness: 1.5, anim: 'grow', dur: 1.0 },
          inFx: 'fade', inDur: 1.0, inStagger: 0.06, hold: 1.5, outFx: 'fade', outDur: 0.9, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        id: 'coc6Success', group: 'dice', system: 'coc6', label: T('成功', 'Success', '성공'),
        text: T('成功', 'SUCCESS', '성공'), subText: T('SUCCESS', '', 'SUCCESS'),
        patch: DICE_SUCCESS
      },
      {
        id: 'coc6Failure', group: 'dice', system: 'coc6', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: DICE_FAILURE
      },
      {
        id: 'coc6Special', group: 'dice', system: 'coc6', label: T('スペシャル', 'Special', '스페셜'),
        text: T('スペシャル', 'SPECIAL', '스페셜'), subText: T('SPECIAL', '', 'SPECIAL'),
        patch: DICE_GREAT
      },
      {
        id: 'coc6Critical', group: 'dice', system: 'coc6', label: T('クリティカル', 'Critical', '크리티컬'),
        text: T('クリティカル', 'CRITICAL', '크리티컬'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: DICE_CRITICAL
      },
      {
        id: 'coc6Fumble', group: 'dice', system: 'coc6', label: T('ファンブル', 'Fumble', '펌블'),
        text: T('ファンブル', 'FUMBLE', '펌블'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: DICE_FUMBLE
      },
      {
        id: 'coc7Regular', group: 'dice', system: 'coc7', label: T('レギュラー成功', 'Regular Success', '보통 성공'),
        text: T('レギュラー成功', 'REGULAR SUCCESS', '보통 성공'), subText: T('REGULAR SUCCESS', '', 'REGULAR SUCCESS'),
        patch: DICE_SUCCESS
      },
      {
        id: 'coc7Hard', group: 'dice', system: 'coc7', label: T('ハード成功', 'Hard Success', '어려운 성공'),
        text: T('ハード成功', 'HARD SUCCESS', '어려운 성공'), subText: T('HARD SUCCESS', '', 'HARD SUCCESS'),
        patch: DICE_GOOD
      },
      {
        id: 'coc7Extreme', group: 'dice', system: 'coc7', label: T('イクストリーム成功', 'Extreme Success', '극단적 성공'),
        text: T('イクストリーム成功', 'EXTREME SUCCESS', '극단적 성공'), subText: T('EXTREME SUCCESS', '', 'EXTREME SUCCESS'),
        patch: DICE_GREAT
      },
      {
        id: 'coc7Critical', group: 'dice', system: 'coc7', label: T('クリティカル', 'Critical', '크리티컬'),
        text: T('クリティカル', 'CRITICAL', '크리티컬'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: DICE_CRITICAL
      },
      {
        id: 'coc7Failure', group: 'dice', system: 'coc7', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: DICE_FAILURE
      },
      {
        id: 'coc7Fumble', group: 'dice', system: 'coc7', label: T('ファンブル', 'Fumble', '펌블'),
        text: T('ファンブル', 'FUMBLE', '펌블'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: DICE_FUMBLE
      },
      // EX：クトゥルフ神話TRPGの判定結果のカットイン（抜刀・銃撃）。1回再生。まずCoC6版
      {
        id: 'cocBladeSuccess', group: 'dice', system: 'cocBlade', icon: 'katana', loop: 'once', label: T('成功', 'Success', '성공'),
        text: T('成功', 'SUCCESS', '성공'), subText: T('SUCCESS', '', 'SUCCESS'),
        patch: rollPatch('blade', 'success', 176)
      },
      {
        id: 'cocBladeSpecial', group: 'dice', system: 'cocBlade', icon: 'katana', loop: 'once', label: T('スペシャル', 'Special', '스페셜'),
        text: T('スペシャル', 'SPECIAL', '스페셜'), subText: T('SPECIAL', '', 'SPECIAL'),
        patch: rollPatch('blade', 'special', 144)
      },
      {
        id: 'cocBladeCritical', group: 'dice', system: 'cocBlade', icon: 'katana', loop: 'once', label: T('決定的成功', 'Critical', '결정적 성공'),
        text: T('決定的成功', 'CRITICAL', '결정적 성공'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: rollPatch('blade', 'critical', 144)
      },
      {
        id: 'cocBladeFailure', group: 'dice', system: 'cocBlade', icon: 'katana', loop: 'once', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: rollPatch('blade', 'failure', 176)
      },
      {
        id: 'cocBladeFumble', group: 'dice', system: 'cocBlade', icon: 'katana', loop: 'once', label: T('致命的失敗', 'Fumble', '치명적 실패'),
        text: T('致命的失敗', 'FUMBLE', '치명적 실패'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: rollPatch('blade', 'fumble', 144)
      },
      {
        id: 'cocGunSuccess', group: 'dice', system: 'cocGun', icon: 'crosshair', loop: 'once', label: T('成功', 'Success', '성공'),
        text: T('成功', 'SUCCESS', '성공'), subText: T('SUCCESS', '', 'SUCCESS'),
        patch: rollPatch('shot', 'success', 176)
      },
      {
        id: 'cocGunSpecial', group: 'dice', system: 'cocGun', icon: 'crosshair', loop: 'once', label: T('スペシャル', 'Special', '스페셜'),
        text: T('スペシャル', 'SPECIAL', '스페셜'), subText: T('SPECIAL', '', 'SPECIAL'),
        patch: rollPatch('shot', 'special', 140)
      },
      {
        id: 'cocGunCritical', group: 'dice', system: 'cocGun', icon: 'crosshair', loop: 'once', label: T('クリティカル', 'Critical', '크리티컬'),
        text: T('クリティカル', 'CRITICAL', '크리티컬'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: rollPatch('shot', 'critical', 130)
      },
      {
        id: 'cocGunFailure', group: 'dice', system: 'cocGun', icon: 'crosshair', loop: 'once', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: rollPatch('shot', 'failure', 176)
      },
      {
        id: 'cocGunFumble', group: 'dice', system: 'cocGun', icon: 'crosshair', loop: 'once', label: T('ファンブル', 'Fumble', '펌블'),
        text: T('ファンブル', 'FUMBLE', '펌블'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: rollPatch('shot', 'fumble', 140)
      },
      // CoC7版。抜刀は漢字（難成功・極成功）、銃撃はカタカナ（ハード成功・イクストリーム成功）
      {
        id: 'coc7BladeSuccess', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('成功', 'Success', '성공'),
        text: T('成功', 'SUCCESS', '성공'), subText: T('SUCCESS', '', 'SUCCESS'),
        patch: rollPatch('blade', 'success', 176)
      },
      {
        id: 'coc7BladeHard', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('難成功', 'Hard Success', '어려운 성공'),
        text: T('難成功', 'HARD SUCCESS', '어려운 성공'), subText: T('HARD SUCCESS', '', 'HARD SUCCESS'),
        patch: rollPatch('blade', 'special', 160)
      },
      {
        id: 'coc7BladeExtreme', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('極成功', 'Extreme Success', '극단적 성공'),
        text: T('極成功', 'EXTREME SUCCESS', '극단적 성공'), subText: T('EXTREME SUCCESS', '', 'EXTREME SUCCESS'),
        patch: rollPatch('blade', 'extreme', 160)
      },
      {
        id: 'coc7BladeCritical', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('決定的成功', 'Critical', '결정적 성공'),
        text: T('決定的成功', 'CRITICAL', '결정적 성공'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: rollPatch('blade', 'critical', 144)
      },
      {
        id: 'coc7BladeFailure', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: rollPatch('blade', 'failure', 176)
      },
      {
        id: 'coc7BladeFumble', group: 'dice', system: 'coc7Blade', icon: 'katana', loop: 'once', label: T('致命的失敗', 'Fumble', '치명적 실패'),
        text: T('致命的失敗', 'FUMBLE', '치명적 실패'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: rollPatch('blade', 'fumble', 144)
      },
      {
        id: 'coc7GunSuccess', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('成功', 'Success', '성공'),
        text: T('成功', 'SUCCESS', '성공'), subText: T('SUCCESS', '', 'SUCCESS'),
        patch: rollPatch('shot', 'success', 176)
      },
      {
        id: 'coc7GunHard', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('ハード成功', 'Hard Success', '어려운 성공'),
        text: T('ハード成功', 'HARD SUCCESS', '어려운 성공'), subText: T('HARD SUCCESS', '', 'HARD SUCCESS'),
        patch: rollPatch('shot', 'special', 136)
      },
      {
        id: 'coc7GunExtreme', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('イクストリーム成功', 'Extreme Success', '극단적 성공'),
        text: T('イクストリーム成功', 'EXTREME SUCCESS', '극단적 성공'), subText: T('EXTREME SUCCESS', '', 'EXTREME SUCCESS'),
        // 9文字と長いので文字を小さめにし、英語のサブは少し大きくする
        patch: { ...rollPatch('shot', 'extreme', 104), subSize: 0.3 }
      },
      {
        id: 'coc7GunCritical', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('クリティカル', 'Critical', '크리티컬'),
        text: T('クリティカル', 'CRITICAL', '크리티컬'), subText: T('CRITICAL', '', 'CRITICAL'),
        patch: rollPatch('shot', 'critical', 130)
      },
      {
        id: 'coc7GunFailure', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: rollPatch('shot', 'failure', 176)
      },
      {
        id: 'coc7GunFumble', group: 'dice', system: 'coc7Gun', icon: 'crosshair', loop: 'once', label: T('ファンブル', 'Fumble', '펌블'),
        text: T('ファンブル', 'FUMBLE', '펌블'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: rollPatch('shot', 'fumble', 140)
      },
      {
        id: 'emoSingle', group: 'dice', system: 'emoklore', label: T('シングル', 'Single', '싱글'),
        text: T('シングル', 'SINGLE', '싱글'), subText: T('SINGLE', '', 'SINGLE'),
        patch: DICE_SUCCESS
      },
      {
        id: 'emoDouble', group: 'dice', system: 'emoklore', label: T('ダブル', 'Double', '더블'),
        text: T('ダブル', 'DOUBLE', '더블'), subText: T('DOUBLE', '', 'DOUBLE'),
        patch: DICE_GOOD
      },
      {
        id: 'emoTriple', group: 'dice', system: 'emoklore', label: T('トリプル', 'Triple', '트리플'),
        text: T('トリプル', 'TRIPLE', '트리플'), subText: T('TRIPLE', '', 'TRIPLE'),
        patch: DICE_GREAT
      },
      {
        id: 'emoMiracle', group: 'dice', system: 'emoklore', label: T('ミラクル', 'Miracle', '미라클'),
        text: T('ミラクル', 'MIRACLE', '미라클'), subText: T('MIRACLE', '', 'MIRACLE'),
        patch: DICE_CRITICAL
      },
      {
        id: 'emoCatastrophe', group: 'dice', system: 'emoklore', label: T('カタストロフ', 'Catastrophe', '카타스트로프'),
        text: T('カタストロフ', 'CATASTROPHE', '카타스트로프'), subText: T('CATASTROPHE', '', 'CATASTROPHE'),
        patch: DICE_BEYOND
      },
      {
        id: 'emoFailure', group: 'dice', system: 'emoklore', label: T('失敗', 'Failure', '실패'),
        text: T('失敗', 'FAILURE', '실패'), subText: T('FAILURE', '', 'FAILURE'),
        patch: DICE_FAILURE
      },
      {
        id: 'emoFumble', group: 'dice', system: 'emoklore', label: T('ファンブル', 'Fumble', '펌블'),
        text: T('ファンブル', 'FUMBLE', '펌블'), subText: T('FUMBLE', '', 'FUMBLE'),
        patch: DICE_FUMBLE
      },
      {
        id: 'emoResonance', group: 'dice', system: 'emoklore', label: T('共鳴判定', 'Resonance Check', '공명 판정'),
        text: T('共鳴判定', 'RESONANCE CHECK', '공명 판정'), subText: T('RESONANCE CHECK', '', 'RESONANCE CHECK'),
        patch: RESONANCE_CALL
      },
      {
        id: 'emoPossession', group: 'dice', system: 'emoklore', label: T('憑依判定', 'Possession Check', '빙의 판정'),
        text: T('憑依判定', 'POSSESSION CHECK', '빙의 판정'), subText: T('POSSESSION CHECK', '', 'POSSESSION CHECK'),
        patch: CHECK_CALL
      },
      {
        id: 'dxOpening', group: 'dice', system: 'dx', label: T('オープニング', 'Opening', '오프닝'),
        text: T('オープニングフェイズ', 'OPENING PHASE', '오프닝 페이즈'), subText: T('OPENING PHASE', '', 'OPENING PHASE'),
        patch: PHASE_TITLE
      },
      {
        id: 'dxMiddle', group: 'dice', system: 'dx', label: T('ミドルフェイズ', 'Middle', '미들 페이즈'),
        text: T('ミドルフェイズ', 'MIDDLE PHASE', '미들 페이즈'), subText: T('MIDDLE PHASE', '', 'MIDDLE PHASE'),
        patch: PHASE_TITLE
      },
      {
        id: 'dxClimax', group: 'dice', system: 'dx', label: T('クライマックス', 'Climax', '클라이맥스'),
        text: T('クライマックスフェイズ', 'CLIMAX PHASE', '클라이맥스 페이즈'), subText: T('CLIMAX PHASE', '', 'CLIMAX PHASE'),
        patch: PHASE_TITLE
      },
      {
        id: 'dxEnding', group: 'dice', system: 'dx', label: T('エンディング', 'Ending', '엔딩'),
        text: T('エンディングフェイズ', 'ENDING PHASE', '엔딩 페이즈'), subText: T('ENDING PHASE', '', 'ENDING PHASE'),
        patch: PHASE_TITLE
      }
    ],
    trailer: [
      {
        // 見本はシャーロック・ホームズの有名な一節（不可能を消去して残ったものが真実）のもじり
        id: 'cinematic', icon: 'play', label: T('シネマティック', 'Cinematic', '시네마틱'),
        text: T('ありえないものを消し去ったとき――\n残ったのは、この世ならざる真実だった。',
          'Eliminate the impossible —\nand whatever remains is not of this world.', '불가능한 것을 모두 지웠을 때――\n남은 것은, 이 세상의 것이 아닌 진실이었다.'),
        patch: {
          fontId: 'shippori-mincho', weight: 700, fontSize: 46, lineHeight: 1.9, letterSpacing: 0.08,
          fill: { type: 'solid', color: '#f5f0e6' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 10, x: 0, y: 3 },
          glow: { on: true, color: '#8fb0ff', size: 18, strength: 0.6 },
          bg: { type: 'none' },
          reveal: 'char', cps: 12, glyphDur: 0.5, inFx: 'blurIn', hold: 1.6, outFx: 'fade', outDur: 0.8, wrapChars: 26, cursor: false
        }
      },
      {
        // 1文字ずつ画面の中央に大きく打ち出し、最後にタイトル全体をドンと出す（アニメのサブタイトル風）
        id: 'typewriter', icon: 'typewriter', label: T('タイプライター', 'Typewriter', '타자기'),
        text: T('霧の館の殺人', 'THE MISTY MANOR MURDER', '안개 저택 살인사건'),
        patch: {
          fontId: 'special-elite', weight: 400, fontSize: 120, lineHeight: 1.5, letterSpacing: 0.08, align: 'center',
          // 同じ色の細い縁取りで、打ち込んだ活字のように少し太らせる
          fill: { type: 'solid', color: '#f6f4ee' },
          stroke: { on: true, width: 0.9, color: '#f6f4ee' }, stroke2: { on: false }, shadow: { on: false }, glow: { on: false },
          bg: { type: 'solid', color: '#000000', opacity: 1, sync: true },
          reveal: 'solo', cps: 8, soloSize: 0.65, soloPause: 0.6, soloImpact: 1, inFx: 'typewriter', wrapChars: 20,
          cursor: false, hold: 2.2, outFx: 'fade', outDur: 0.5
        }
      },
      {
        id: 'syslog', icon: 'terminal', label: T('システムログ', 'System Log', '시스템 로그'),
        text: T('20XX年 X月X日\n調査記録 No.13\n\n対象の館では、夜ごと同じ時刻に\nピアノの音が聞こえるという。',
          'Date: 20XX / XX / XX\nInvestigation Log No.13\n\nEvery night at the same hour,\npiano music echoes through the mansion.', '20XX년 X월 X일\n조사 기록 No.13\n\n그 저택에서는 매일 밤 같은 시각에\n피아노 소리가 들린다고 한다.'),
        patch: {
          fontId: 'dotgothic16', weight: 400, fontSize: 40, lineHeight: 1.7, letterSpacing: 0.06, align: 'start',
          fill: { type: 'solid', color: '#d9ffe0' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: true, color: '#3cff7a', size: 14, strength: 0.7 },
          bg: { type: 'solid', color: '#000000', opacity: 0.55, sync: true },
          reveal: 'char', cps: 16, glyphDur: 0, inFx: 'typewriter', cursor: true, hold: 1.5, outFx: 'fade', outDur: 0.5, wrapChars: 26
        }
      },
      {
        id: 'lines', icon: 'rise', label: T('1行ずつ浮上', 'Line by Line', '한 줄씩 떠오름'),
        text: T('失われた記憶を辿り、\n彼らは再びあの村へ向かう。\n\n霧の向こうで、\n何かが目を覚まそうとしていた。',
          'Following their lost memories,\nthey return to that village once more.\n\nBeyond the fog,\nsomething was about to awaken.', '잃어버린 기억을 따라,\n그들은 다시 그 마을로 향한다.\n\n안개 너머에서,\n무언가가 깨어나려 하고 있었다.'),
        patch: {
          fontId: 'noto-serif-jp', weight: 700, fontSize: 48, lineHeight: 1.9, letterSpacing: 0.1,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.9, blur: 12, x: 0, y: 3 },
          bg: { type: 'none' },
          reveal: 'line', lineInterval: 1.1, glyphDur: 0.9, inFx: 'rise', hold: 1.6, outFx: 'fade', outDur: 0.7
        }
      },
      {
        id: 'sweep', icon: 'wave', label: T('流れるように', 'Smooth Sweep', '흐르듯이'),
        text: T('ここから先は、帰り道のない物語。\nそれでも、扉を開けますか。', 'Beyond this point lies a story with no way back.\nWill you still open the door?', '이 앞은, 돌아갈 길이 없는 이야기.\n그래도, 문을 열겠습니까.'),
        patch: {
          fontId: 'zen-old-mincho', weight: 700, fontSize: 50, lineHeight: 1.9, letterSpacing: 0.12,
          fill: { type: 'solid', color: '#f3eee4' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 12, x: 0, y: 3 },
          glow: { on: true, color: '#ffffff', size: 16, strength: 0.4 },
          reveal: 'sweep', sweepDur: 1.5, lineInterval: 1.4, glyphDur: 0.5, inFx: 'fade', hold: 1.8, outFx: 'fade', outDur: 0.9
        }
      },
      {
        // 文章の文字が中央で重なって現れ、扉が開くように左右へ広がって一文になる
        id: 'spread', icon: 'spreadOut', label: T('中央から左右', 'Center Spread', '중앙에서 좌우로'),
        text: T('閉ざされた扉が、いま開かれる。', 'The sealed door now swings open.', '닫혀 있던 문이, 지금 열린다.'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 64, lineHeight: 1.7, letterSpacing: 0.14,
          fill: { type: 'solid', color: '#f5efe3' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 12, x: 0, y: 3 },
          glow: { on: true, color: '#ffd9a0', size: 20, strength: 0.5 },
          bg: { type: 'none' },
          reveal: 'spread', spreadHold: 0.5, spreadDur: 0.9, inFx: 'fade', hold: 2, outFx: 'fade', outDur: 0.8
        }
      },
      {
        // EX：タイトルがふわっと現れ、左から右へ蛍のような光の粒になってほどけ、右へ漂って消える（「Opening」などの見出しに）
        id: 'fireflyTitle', icon: 'sparkle', label: T('光の粒になって消える', 'Dissolve into Light', '빛의 입자로 사라짐'),
        text: T('Opening', 'Opening', 'Opening'),
        patch: {
          fontId: 'cormorant-garamond', weight: 700, fontSize: 120, lineHeight: 1.4, letterSpacing: 0.16, align: 'center',
          fill: { type: 'solid', color: '#fffaf0' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.6, blur: 14, x: 0, y: 2 },
          glow: { on: true, color: '#ffdf8a', size: 24, strength: 0.75 },
          bg: { type: 'none' },
          reveal: 'all', glyphDur: 1.2, inFx: 'fade', hold: 1.6, outFx: 'firefly', outDur: 2.6
        }
      },
      {
        // EX：上の青い版。「ENDING」が現れ、青い光の粒になって右へ消える
        id: 'fireflyEnding', icon: 'sparkle', label: T('青い光の粒になって消える', 'Dissolve into Blue Light', '푸른 빛의 입자로 사라짐'),
        text: T('ENDING', 'ENDING', 'ENDING'),
        patch: {
          fontId: 'cormorant-garamond', weight: 700, fontSize: 120, lineHeight: 1.4, letterSpacing: 0.22, align: 'center',
          fill: { type: 'solid', color: '#f2f8ff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.6, blur: 14, x: 0, y: 2 },
          glow: { on: true, color: '#6fb8ff', size: 24, strength: 0.8 },
          bg: { type: 'none' },
          reveal: 'all', glyphDur: 1.2, inFx: 'fade', hold: 1.6, outFx: 'firefly', outDur: 2.6
        }
      },
      {
        // EX：「CLIMAX」が現れ、左から右へ火が燃え移って、焦げて赤く光る燃え際とともに炎・火の粉・煙を上げて燃え尽きる
        id: 'blazeClimax', icon: 'flame', label: T('炎で燃え尽きる', 'Burn Up in Flames', '불길에 타 버림'),
        text: T('CLIMAX', 'CLIMAX', 'CLIMAX'),
        patch: {
          fontId: 'cinzel', weight: 900, fontSize: 130, lineHeight: 1.4, letterSpacing: 0.16, align: 'center',
          fill: { type: 'gradient', color: '#fff6e6', color2: '#ffd9a0', color3: '#ff9a4a', dir: 'v' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.7, blur: 14, x: 0, y: 3 },
          glow: { on: true, color: '#ff6a1a', size: 26, strength: 0.8 },
          bg: { type: 'none' },
          reveal: 'all', glyphDur: 1.0, inFx: 'fade', hold: 1.6, outFx: 'blaze', outDur: 3.0
        }
      },
      {
        // 全文をぼかしから一度に浮かび上がらせる（ポスターのキャッチコピーのように）
        id: 'allAtOnce', icon: 'textAll', label: T('全文同時表示', 'All at Once', '전문 동시 표시'),
        text: T('真実は、いつも霧の向こうにある。\n――さあ、探索を始めよう。', 'The truth always lies beyond the fog.\n— Now, let the investigation begin.', '진실은 언제나 안개 너머에 있다.\n――자, 탐색을 시작하자.'),
        patch: {
          fontId: 'zen-old-mincho', weight: 700, fontSize: 52, lineHeight: 1.9, letterSpacing: 0.12,
          fill: { type: 'solid', color: '#f2f5fa' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 12, x: 0, y: 3 },
          glow: { on: true, color: '#a9c4ff', size: 18, strength: 0.5 },
          reveal: 'all', glyphDur: 1.4, inFx: 'blurIn', hold: 2.4, outFx: 'fade', outDur: 0.9
        }
      },
      {
        id: 'credits', icon: 'reel', label: T('エンドロール', 'End Credits', '엔드 롤'),
        text: T('STAFF\n\nシナリオ\n〇〇〇〇\n\nゲームマスター\n〇〇〇〇\n\n探索者\n〇〇〇〇\n〇〇〇〇\n〇〇〇〇\n\nThank you for playing!',
          'STAFF\n\nScenario\n〇〇〇〇\n\nGame Master\n〇〇〇〇\n\nInvestigators\n〇〇〇〇\n〇〇〇〇\n〇〇〇〇\n\nThank you for playing!', 'STAFF\n\n시나리오\n〇〇〇〇\n\n게임 마스터\n〇〇〇〇\n\n탐사자\n〇〇〇〇\n〇〇〇〇\n〇〇〇〇\n\nThank you for playing!'),
        patch: {
          fontId: 'noto-serif-jp', weight: 700, fontSize: 40, lineHeight: 1.8, letterSpacing: 0.12,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.9, blur: 10, x: 0, y: 3 },
          reveal: 'scroll', scrollSpeed: 80, scrollFade: true, inFx: 'fade', hold: 0, startDelay: 0, endDelay: 0
        }
      }
    ],
    caption: [
      {
        id: 'converge', icon: 'converge', label: T('上下から合流', 'Converge', '위아래에서 합류'),
        text: T('保健室', 'Infirmary', '보건실'), subText: T('放課後 16:30', 'After School — 4:30 PM', '방과 후 16:30'),
        patch: {
          fontId: 'noto-serif-jp', weight: 700, fontSize: 110, letterSpacing: 0.2,
          subFontId: 'same', subWeight: 400, subSize: 0.3, subLetterSpacing: 0.2, subGap: 0.35,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 14, x: 0, y: 4 },
          deco: { type: 'sides', color2: '#ffffff', pad: 0.45, extend: 1.2, thickness: 2, anim: 'grow', dur: 0.7 },
          inFx: 'converge', inDur: 0.9, inStagger: 0.12, hold: 1.6, outFx: 'fade', outDur: 0.7, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        id: 'float', icon: 'floatUp', label: T('浮かび上がる', 'Float Up', '떠오르기'),
        text: T('旧校舎 三階', 'Old Building, 3F', '구교사 3층'), subText: T('PM 7:45', '7:45 PM', 'PM 7:45'),
        patch: {
          fontId: 'zen-kaku-gothic-new', weight: 700, fontSize: 96, letterSpacing: 0.14,
          subFontId: 'same', subWeight: 400, subSize: 0.32, subLetterSpacing: 0.3,
          fill: { type: 'solid', color: '#f2f6ff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#9cc2ff', size: 22, strength: 0.6 },
          inFx: 'rise', inDur: 1.0, inStagger: 0.07, hold: 1.6, outFx: 'rise', outDur: 0.8, outStagger: 0.04, subFx: 'fade'
        }
      },
      {
        id: 'cinema', icon: 'spacing', label: T('字間シネマ', 'Cinematic Tracking', '자간 시네마'),
        text: T('TOKYO', 'TOKYO', 'TOKYO'), subText: T('2026.10.31 23:59', '2026.10.31 23:59', '2026.10.31 23:59'),
        patch: {
          fontId: 'cinzel', weight: 700, fontSize: 120, letterSpacing: 0.45,
          subFontId: 'same', subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.7, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#ffffff', size: 20, strength: 0.35 },
          inFx: 'tracking', inDur: 1.6, hold: 1.4, outFx: 'tracking', outDur: 1.2, subFx: 'fade', subDelay: -0.6
        }
      },
      {
        id: 'clock', icon: 'stopwatch', label: T('時刻表示', 'Time Stamp', '시각 표시'),
        text: T('23:59', '23:59', '23:59'), subText: T('2026.10.31 SAT', '2026.10.31 SAT', '2026.10.31 SAT'),
        patch: {
          fontId: 'orbitron', weight: 700, fontSize: 130, letterSpacing: 0.12,
          subFontId: 'same', subWeight: 400, subSize: 0.2, subLetterSpacing: 0.4,
          fill: { type: 'solid', color: '#dff9ff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: true, color: '#3ad7ff', size: 30, strength: 1 },
          deco: { type: 'corners', color2: '#8feaff', pad: 0.4, thickness: 3, anim: 'grow', dur: 0.5 },
          inFx: 'flicker', inDur: 0.8, inStagger: 0.05, hold: 2, outFx: 'flicker', outDur: 0.6, subFx: 'fade'
        }
      },
      {
        id: 'underline', icon: 'underline', label: T('下線スライド（左下）', 'Underline (Bottom Left)', '밑줄 슬라이드 (왼쪽 아래)'),
        text: T('図書室', 'Library', '도서실'), subText: T('午後 5時12分', '5:12 PM', '오후 5시 12분'),
        patch: {
          anchor: 'bl', align: 'start', marginX: 72, marginY: 64,
          fontId: 'noto-sans-jp', weight: 900, fontSize: 84, letterSpacing: 0.12,
          subFontId: 'same', subWeight: 400, subSize: 0.36, subLetterSpacing: 0.15, subGap: 0.45,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 10, x: 0, y: 3 },
          deco: { type: 'underline', color2: '#ffffff', pad: 0.2, extend: 0.3, thickness: 3, anim: 'grow', dur: 0.7 },
          inFx: 'slide', inDir: 'left', inDur: 0.7, inStagger: 0.05, hold: 1.8, outFx: 'fade', outDur: 0.6, subFx: 'fade'
        }
      },
      {
        id: 'vertical', icon: 'vertical', label: T('縦書き（右上）', 'Vertical (Top Right)', '세로쓰기 (오른쪽 위)'),
        text: T('神社の境内', 'Shrine Grounds', '신사 경내'), subText: T('深夜 二時', '2:00 AM', '심야 2시'),
        patch: {
          writing: 'v', anchor: 'tr', align: 'start', marginX: 72, marginY: 56,
          fontId: 'shippori-mincho', weight: 800, fontSize: 90, letterSpacing: 0.1,
          subFontId: 'same', subWeight: 400, subSize: 0.36, subLetterSpacing: 0.15, subGap: 0.35,
          fill: { type: 'solid', color: '#f4f1ea' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 12, x: 0, y: 3 },
          deco: { type: 'bar', color2: '#c9a24a', pad: 0.35, thickness: 3, anim: 'grow', dur: 0.6 },
          inFx: 'converge', inDur: 0.9, inStagger: 0.1, hold: 1.8, outFx: 'fade', outDur: 0.7, subFx: 'fade'
        }
      },
      {
        id: 'boxed', icon: 'frame', label: T('ボックス（左上）', 'Boxed (Top Left)', '박스 (왼쪽 위)'),
        text: T('第三研究棟 地下', 'Research Wing B1', '제3연구동 지하'), subText: T('B1F ― 立入禁止区域', 'B1F — Restricted Area', 'B1F ― 출입 금지 구역'),
        patch: {
          anchor: 'tl', align: 'start', marginX: 56, marginY: 48,
          fontId: 'zen-kaku-gothic-new', weight: 700, fontSize: 64, letterSpacing: 0.08,
          subFontId: 'same', subWeight: 400, subSize: 0.42, subLetterSpacing: 0.12, subGap: 0.3,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false },
          deco: { type: 'box', color: '#05070c', opacity: 0.6, color2: '#8fd3ff', pad: 0.45, radius: 0.12, thickness: 0, anim: 'grow', dur: 0.5 },
          inFx: 'blurIn', inDur: 0.7, inStagger: 0.04, hold: 1.8, outFx: 'fade', outDur: 0.6, subFx: 'fade'
        }
      }

    ]
  };

  const MODE_DEFAULTS = {
    message: { mode: 'message', fontSize: 130 },
    trailer: { mode: 'trailer', fontSize: 46, lineHeight: 1.9, subText: '' },
    caption: { mode: 'caption', fontSize: 110 }
  };

  const STYLE_PRESETS = [
    { id: 'plain', label: T('白＋黒縁', 'White + Outline', '흰색＋검은 테두리'), patch: {
      fill: { type: 'solid', color: '#ffffff' }, fillOpacity: 1, stroke: { on: true, width: 5, color: '#1b1b1f' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 5 }, glow: { on: false } } },
    { id: 'gold', label: T('金', 'Gold', '금색'), patch: {
      fill: { type: 'gradient', color: '#fffbe6', color2: '#ffd257', color3: '#b8860b', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 4, color: '#3b2500' }, stroke2: { on: true, width: 5, color: '#fff3c4' },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 14, x: 0, y: 6 }, glow: { on: true, color: '#ffd257', size: 34, strength: 1 } } },
    { id: 'silver', label: T('銀', 'Silver', '은색'), patch: {
      fill: { type: 'gradient', color: '#ffffff', color2: '#dfe6ee', color3: '#8f9cab', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 3, color: '#1d2430' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 4 }, glow: { on: true, color: '#bcd7ff', size: 22, strength: 0.8 } } },
    { id: 'blood', label: T('血', 'Blood', '피'), patch: {
      fill: { type: 'gradient', color: '#ff6a6a', color2: '#b30000', color3: '#4a0000', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 3, color: '#1a0000' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.85, blur: 20, x: 0, y: 6 }, glow: { on: true, color: '#ff1a1a', size: 40, strength: 1.1 } } },
    { id: 'neon', label: T('ネオン', 'Neon', '네온'), patch: {
      fill: { type: 'solid', color: '#f4fdff' }, fillOpacity: 1, stroke: { on: true, width: 2, color: '#00c8ff' }, stroke2: { on: false },
      shadow: { on: false }, glow: { on: true, color: '#00d9ff', size: 34, strength: 1.6 } } },
    { id: 'eerie', label: T('怪しい紫', 'Eerie Purple', '수상한 보라'), patch: {
      fill: { type: 'solid', color: '#ece6ff' }, fillOpacity: 1, stroke: { on: true, width: 3, color: '#12002a' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.7, blur: 16, x: 0, y: 5 }, glow: { on: true, color: '#8a4dff', size: 36, strength: 1.2 } } },
    { id: 'pop', label: T('ポップ', 'Pop', '팝'), patch: {
      fill: { type: 'gradient', color: '#fffbd1', color2: '#ffe14d', color3: '#ff9d00', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 7, color: '#6a2c00' }, stroke2: { on: true, width: 6, color: '#ffffff' },
      shadow: { on: true, color: '#000000', opacity: 0.5, blur: 8, x: 0, y: 6 }, glow: { on: false } } },
    { id: 'ghost', label: T('ゴースト', 'Ghost', '고스트'), patch: {
      fill: { type: 'solid', color: '#e9f3ff' }, fillOpacity: 0.85, stroke: { on: false }, stroke2: { on: false },
      shadow: { on: false }, glow: { on: true, color: '#9fd4ff', size: 30, strength: 1.2 } } },
    { id: 'ink', label: T('墨（明るい背景用）', 'Ink (for light BG)', '먹 (밝은 배경용)'), patch: {
      fill: { type: 'solid', color: '#141414' }, fillOpacity: 1, stroke: { on: false }, stroke2: { on: false },
      shadow: { on: true, color: '#ffffff', opacity: 0.8, blur: 10, x: 0, y: 0 }, glow: { on: false } } },
    { id: 'hollow', label: T('白抜き', 'Hollow', '속이 빈 글자'), patch: {
      fill: { type: 'solid', color: '#ffffff' }, fillOpacity: 0, stroke: { on: true, width: 3, color: '#ffffff' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 10, x: 0, y: 3 }, glow: { on: false } } }
  ];

  const GRADIENT_PRESETS = [
    { id: 'gold', colors: ['#fffbe6', '#ffd257', '#b8860b'] },
    { id: 'silver', colors: ['#ffffff', '#dfe6ee', '#8f9cab'] },
    { id: 'fire', colors: ['#ffffff', '#ffd76a', '#ff8a00'] },
    { id: 'ruby', colors: ['#ff9a9a', '#e0102f', '#5a0010'] },
    { id: 'sapphire', colors: ['#e6f4ff', '#58a6ff', '#1b3a8a'] },
    { id: 'emerald', colors: ['#eafff2', '#3ddc84', '#0b5e36'] },
    { id: 'violet', colors: ['#f3e8ff', '#b07cff', '#4b1d8f'] },
    { id: 'sunset', colors: ['#ffe29a', '#ff7a59', '#a4133c'] },
    { id: 'ice', colors: ['#ffffff', '#bdefff', '#4fb3d9'] },
    { id: 'sakura', colors: ['#ffffff', '#ffc4dd', '#ff6fa8'] }
  ];

  const SIZE_PRESETS = [
    { id: '1920x1080', w: 1920, h: 1080, label: T('1920 × 1080（16:9 FHD）', '1920 × 1080 (16:9 FHD)', '1920 × 1080 (16:9 FHD)') },
    { id: '1280x720', w: 1280, h: 720, label: T('1280 × 720（16:9 HD）', '1280 × 720 (16:9 HD)', '1280 × 720 (16:9 HD)') },
    { id: '960x540', w: 960, h: 540, label: T('960 × 540（16:9 軽量）', '960 × 540 (16:9 light)', '960 × 540 (16:9 경량)') },
    { id: '1280x360', w: 1280, h: 360, label: T('1280 × 360（横長の帯）', '1280 × 360 (wide strip)', '1280 × 360 (가로로 긴 띠)') },
    { id: '1024x256', w: 1024, h: 256, label: T('1024 × 256（テロップ帯）', '1024 × 256 (caption strip)', '1024 × 256 (자막 띠)') },
    { id: '1080x1080', w: 1080, h: 1080, label: T('1080 × 1080（正方形）', '1080 × 1080 (square)', '1080 × 1080 (정사각형)') },
    { id: '720x1280', w: 720, h: 1280, label: T('720 × 1280（縦長 9:16）', '720 × 1280 (portrait 9:16)', '720 × 1280 (세로 9:16)') },
    { id: 'custom', w: 0, h: 0, label: T('カスタム', 'Custom', '사용자 지정') }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  function deepMerge(target, patch) {
    Object.keys(patch || {}).forEach(key => {
      const value = patch[key];
      if (isPlainObject(value) && isPlainObject(target[key])) deepMerge(target[key], value);
      else target[key] = clone(value);
    });
    return target;
  }

  function defaultScene(mode, lang) {
    const scene = deepMerge(clone(BASE), MODE_DEFAULTS[mode] || {});
    const first = (TEMPLATES[mode] || [])[0];
    if (first) applyTemplate(scene, first, lang);
    return scene;
  }

  // テンプレートの見本の文章（key: 'text' / 'subText'）
  function sampleText(template, key, lang) {
    const value = template[key];
    return value ? (value[lang] ?? value.en ?? value.ja) : '';
  }

  // テンプレートはスタイル・動き・文章を初期値から組み立て直す（書き換えた文章を戻すのは呼び出し側）
  function applyTemplate(scene, template, lang) {
    const keep = { width: scene.width, height: scene.height, sizePreset: scene.sizePreset, outEnabled: scene.outEnabled };
    // 退場の有無を決めていたテンプレート（炎の壁）から切り替えたときは、退場ありに戻す
    const prev = (TEMPLATES[scene.mode] || []).find(t => t.id === scene.templateId);
    if (prev && prev.patch && 'outEnabled' in prev.patch) keep.outEnabled = true;
    const fresh = deepMerge(deepMerge(clone(BASE), MODE_DEFAULTS[scene.mode] || {}), template.patch);
    Object.keys(scene).forEach(key => delete scene[key]);
    Object.assign(scene, fresh);
    scene.width = keep.width || fresh.width;
    scene.height = keep.height || fresh.height;
    scene.sizePreset = keep.sizePreset || fresh.sizePreset;
    // 画像サイズを決めているテンプレート（炎の試作など）は、そのサイズにする
    if (template.size) Object.assign(scene, template.size);
    scene.templateId = template.id;
    // 退場の有無は利用者の選択なので、テンプレートを切り替えても引き継ぐ
    if (!('outEnabled' in template.patch)) scene.outEnabled = keep.outEnabled !== false;
    scene.text = sampleText(template, 'text', lang);
    scene.subText = sampleText(template, 'subText', lang);
    return scene;
  }

  // テンプレートの書き出しのループの初期値（'once' / 'infinite'）
  function exportLoop(template) {
    return (template && (template.loop || LOOP_BY_GROUP[template.group])) || 'once';
  }

  // 文章・サブテキストが、いずれかのテンプレートの見本のままか（書き換えた文章を覚える仕組みより前の保存データの引き継ぎに使う）
  function sampleState(mode, text, subText) {
    const texts = new Set();
    const subs = new Set();
    (TEMPLATES[mode] || []).forEach(tpl => ['ja', 'en', 'ko'].forEach(lang => {
      if (tpl.text && tpl.text[lang]) texts.add(tpl.text[lang]);
      if (tpl.subText && tpl.subText[lang]) subs.add(tpl.subText[lang]);
    }));
    const main = !String(text || '').trim() || texts.has(text);
    const sub = subs.has(subText) || (!String(subText || '').trim() && main);
    return { main, sub };
  }

  root.TextApngPresets = {
    BASE,
    TEMPLATES,
    TEMPLATE_GROUPS,
    MODE_DEFAULTS,
    STYLE_PRESETS,
    GRADIENT_PRESETS,
    SIZE_PRESETS,
    clone,
    deepMerge,
    defaultScene,
    applyTemplate,
    sampleText,
    sampleState,
    exportLoop
  };
})(window);
