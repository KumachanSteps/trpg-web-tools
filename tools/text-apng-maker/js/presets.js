/*
 * 文字画像APNGメーカー — 初期値・テンプレート・プリセット
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
      type: 'none', color: '#000000', opacity: 0.55, color2: '#ffffff', pad: 0.4, extend: 0.8, thickness: 3, soft: 0.5, sideFade: 0.3, radius: 0.2, anim: 'grow', dur: 0.45,
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
    spreadDur: 0.9
  };

  const T = (ja, en) => ({ ja, en });

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

  // ロールプレイどうぞ：秘匿確認と同じシステム画面の緑版
  const ROLEPLAY_PATCH = {
    ...SECRET_PATCH,
    shadow: { on: true, color: '#021a0e', opacity: 0.6, blur: 8, x: 0, y: 2 },
    glow: { on: true, color: '#2fd07a', size: 10, strength: 0.45 },
    subColor: '#93ecb8',
    deco: { type: 'box', color: '#062a1a', opacity: 0.85, color2: '#2fd07a', pad: 0.5, thickness: 2, radius: 0.14, anim: 'grow', dur: 0.4 }
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
      { id: 'combat', label: T('戦闘', 'Combat') },
      { id: 'investigation', label: T('探索・事件', 'Investigation') },
      { id: 'gm', label: T('GM', 'GM') },
      { id: 'scene', label: T('シーン・時間', 'Scene & Time') },
      { id: 'dice', label: T('判定', 'Dice'), systems: [
        { id: 'coc6', label: T('CoC6', 'CoC 6e') },
        { id: 'coc7', label: T('CoC7', 'CoC 7e') },
        { id: 'emoklore', label: T('エモクロア', 'Emoklore') },
        { id: 'dx', label: T('ダブクロ', 'Double Cross') }
      ] }
    ]
  };

  const TEMPLATES = {
    message: [
      {
        id: 'battle', group: 'combat', icon: 'swords', label: T('戦闘開始', 'Battle Start'),
        text: T('戦闘開始', 'BATTLE START'), subText: T('BATTLE START', 'ENGAGE'),
        patch: BATTLE_PATCH
      },
      {
        id: 'battleEnd', group: 'combat', icon: 'flag', label: T('戦闘終了', 'Battle End'),
        text: T('戦闘終了', 'BATTLE END'), subText: T('BATTLE END', 'DISENGAGE'),
        patch: BATTLE_PATCH
      },
      {
        // サイバー風：ネオンの水色、デジタルな書体、グリッチで起動
        id: 'openCombat', group: 'combat', icon: 'chip', label: T('OPEN COMBAT', 'Open Combat'),
        text: T('OPEN COMBAT', 'OPEN COMBAT'), subText: T('戦闘開始', 'COMBAT MODE : ONLINE'),
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
        id: 'round', group: 'combat', icon: 'bell', label: T('ラウンド', 'Round'),
        text: T('ROUND 1', 'ROUND 1'), subText: T('', ''),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 124, letterSpacing: 0.16,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.35, blur: 10, x: 0, y: 3 }, glow: { on: false },
          deco: { type: 'sides', color2: '#ffffff', pad: 0.5, extend: 1.6, thickness: 3, anim: 'grow', dur: 0.6 },
          inFx: 'drop', inDur: 0.55, inStagger: 0.1, inPower: 1.1, hold: 1.3, outFx: 'fade', outDur: 0.5
        }
      },
      {
        id: 'finalRound', group: 'combat', icon: 'flame', label: T('ファイナルラウンド', 'Final Round'),
        text: T('FINAL ROUND', 'FINAL ROUND'), subText: T('', ''),
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
        id: 'explore', group: 'investigation', icon: 'search', label: T('探索開始', 'Exploration'),
        text: T('探索開始', 'EXPLORATION'), subText: T('EXPLORATION', '- PHASE 1 -'),
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
        id: 'investigate', group: 'investigation', icon: 'badge', label: T('捜査開始', 'Investigation'),
        text: T('捜査開始', 'INVESTIGATION'), subText: T('- INVESTIGATION -', '- CASE OPEN -'),
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
        // 調査ノート：古い記録を手でなぞるように、左から書かれていく
        id: 'research', group: 'investigation', icon: 'clipboard', label: T('調査開始', 'Research'),
        text: T('調査開始', 'RESEARCH'), subText: T('- RESEARCH -', '- FIELD NOTES -'),
        patch: {
          fontId: 'kaisei-tokumin', weight: 800, fontSize: 116, letterSpacing: 0.2,
          subFontId: 'special-elite', subWeight: 400, subSize: 0.24, subLetterSpacing: 0.3, subGap: 0.5,
          fill: { type: 'solid', color: '#f3ead8' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#1a1206', opacity: 0.8, blur: 12, x: 0, y: 4 }, glow: { on: false },
          subColorOn: true, subColor: '#e0b45c',
          deco: { type: 'underline', color2: '#d9a441', pad: 0.18, extend: 0.6, thickness: 3, anim: 'grow', dur: 0.8 },
          inFx: 'wipe', inDir: 'lr', inDur: 1.0, hold: 1.8, outFx: 'fade', outDur: 0.6, subFx: 'typewriter', subDelay: -0.2
        }
      },
      {
        id: 'emergency', group: 'investigation', icon: 'warning', label: T('緊急事態', 'Emergency'),
        text: T('緊急事態', 'EMERGENCY'), subText: T('EMERGENCY', 'WARNING'),
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
        id: 'incident', group: 'investigation', icon: 'siren', label: T('事件発生', 'Incident'),
        text: T('事件発生', 'INCIDENT'), subText: T('CASE FILE No.013', 'CASE FILE No.013'),
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
        id: 'message', group: 'investigation', icon: 'mail', label: T('メッセージ受信', 'New Message'),
        text: T('メッセージが届きました', 'You have a new message'), subText: T('新着メッセージ', 'NEW MESSAGE'),
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
        id: 'call', group: 'investigation', icon: 'phone', label: T('着信あり', 'Incoming Call'),
        text: T('着信あり', 'INCOMING CALL'), subText: T('非通知', 'Unknown Number'),
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
        id: 'missionClear', group: 'investigation', icon: 'checkCircle', label: T('ミッションクリア', 'Mission Clear'),
        text: T('MISSION CLEAR', 'MISSION CLEAR'), subText: T('ミッションクリア', 'ALL OBJECTIVES COMPLETE'),
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
        id: 'secret', group: 'gm', icon: 'lock', label: T('秘匿を確認してください', 'Check Your Secret'),
        text: T('秘匿を確認してください', 'CHECK YOUR SECRET'), subText: T('SECRET HANDOUT', 'SECRET HANDOUT'),
        patch: SECRET_PATCH
      },
      {
        id: 'processing', group: 'gm', icon: 'loader', label: T('秘匿処理中', 'Processing Secrets'),
        text: T('秘匿処理中...', 'PROCESSING SECRETS...'), subText: T('SECRET HANDOUT', 'SECRET HANDOUT'),
        patch: { ...SECRET_PATCH, inStagger: 0.07, holdFx: 'glow', holdPower: 1, hold: 2.2 }
      },
      {
        id: 'roleplay', group: 'gm', icon: 'mask', label: T('ロールプレイどうぞ', 'Roleplay Time'),
        text: T('ロールプレイどうぞ', 'ROLEPLAY TIME'), subText: T('ROLE PLAY', 'YOUR TURN'),
        patch: ROLEPLAY_PATCH
      },
      {
        id: 'break', group: 'gm', icon: 'coffee', label: T('休憩中', 'On Break'),
        text: T('休憩中', 'BREAK TIME'), subText: T('BREAK TIME', 'Back in a few minutes'),
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
        // セーフティツールのXカード：白いカードに赤い文字
        id: 'xcard', group: 'gm', icon: 'xcard', label: T('Xカード', 'X-Card'),
        text: T('X-Card', 'X-Card'), subText: T('一時中断をお願いします', 'Let’s pause for a moment'),
        patch: {
          fontId: 'anton', weight: 400, fontSize: 150, letterSpacing: 0.08,
          subFontId: 'noto-sans-jp', subWeight: 700, subSize: 0.19, subLetterSpacing: 0.24, subGap: 0.42,
          fill: { type: 'solid', color: '#e8202f' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: false },
          subColorOn: true, subColor: '#3b3b3b',
          deco: { type: 'box', color: '#ffffff', opacity: 0.97, color2: '#e8202f', pad: 0.5, thickness: 4, radius: 0.08, anim: 'grow', dur: 0.35 },
          inFx: 'pop', inDur: 0.5, inStagger: 0.05, hold: 2.2, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: -0.1
        }
      },
      {
        id: 'loading', group: 'gm', icon: 'hourglass', label: T('Now Loading', 'Now Loading'),
        text: T('Now Loading...', 'Now Loading...'), subText: T('しばらくお待ちください', 'Please wait a moment'),
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
        id: 'simple', group: 'gm', icon: 'type', label: T('シンプル', 'Simple'),
        text: T('メッセージ', 'MESSAGE'), subText: T('', ''),
        patch: {
          fontId: 'noto-sans-jp', weight: 700, fontSize: 110, letterSpacing: 0.08,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: true, width: 4, color: '#1b1b1f' }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.5, blur: 10, x: 0, y: 4 }, glow: { on: false },
          inFx: 'fade', inDur: 0.6, hold: 1.6, outFx: 'fade', outDur: 0.6
        }
      },
      {
        id: 'chapter', group: 'scene', icon: 'book', label: T('章タイトル', 'Chapter'),
        text: T('第一章', 'CHAPTER I'), subText: T('「目覚めの夜」', '“The Night of Awakening”'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 128, letterSpacing: 0.22,
          subFontId: 'same', subWeight: 400, subSize: 0.3, subLetterSpacing: 0.15, subGap: 0.45,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
          deco: { type: 'underline', color2: '#ffffff', pad: 0.3, extend: 0.5, thickness: 2, anim: 'grow', dur: 0.9 },
          inFx: 'blurIn', inDur: 1.0, inStagger: 0.15, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.2
        }
      },
      {
        id: 'day', group: 'scene', icon: 'calendar', label: T('一日目', 'Day 1'),
        text: T('一日目', 'DAY 1'), subText: T('DAY 1', 'THE FIRST DAY'),
        patch: {
          fontId: 'shippori-mincho-b1', weight: 800, fontSize: 150, letterSpacing: 0.3,
          subFontId: 'same', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.5, subGap: 0.5,
          fill: { type: 'solid', color: '#fff6e3' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.75, blur: 14, x: 0, y: 4 },
          glow: { on: true, color: '#ffcf7a', size: 22, strength: 0.45 },
          subColorOn: true, subColor: '#e8c27a',
          deco: { type: 'underline', color2: '#e0b35a', pad: 0.3, extend: 0.9, thickness: 2, anim: 'grow', dur: 0.9 },
          inFx: 'rise', inDur: 1.1, inStagger: 0.12, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.3
        }
      },
      {
        id: 'timeSkip', group: 'scene', icon: 'clock', label: T('時間経過', 'Time Skip'),
        text: T('一時間経過', 'ONE HOUR LATER'), subText: T('ONE HOUR LATER', ''),
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
        id: 'coc6Success', group: 'dice', system: 'coc6', label: T('成功', 'Success'),
        text: T('成功', 'SUCCESS'), subText: T('SUCCESS', ''),
        patch: DICE_SUCCESS
      },
      {
        id: 'coc6Failure', group: 'dice', system: 'coc6', label: T('失敗', 'Failure'),
        text: T('失敗', 'FAILURE'), subText: T('FAILURE', ''),
        patch: DICE_FAILURE
      },
      {
        id: 'coc6Special', group: 'dice', system: 'coc6', label: T('スペシャル', 'Special'),
        text: T('スペシャル', 'SPECIAL'), subText: T('SPECIAL', ''),
        patch: DICE_GREAT
      },
      {
        id: 'coc6Critical', group: 'dice', system: 'coc6', label: T('クリティカル', 'Critical'),
        text: T('クリティカル', 'CRITICAL'), subText: T('CRITICAL', ''),
        patch: DICE_CRITICAL
      },
      {
        id: 'coc6Fumble', group: 'dice', system: 'coc6', label: T('ファンブル', 'Fumble'),
        text: T('ファンブル', 'FUMBLE'), subText: T('FUMBLE', ''),
        patch: DICE_FUMBLE
      },
      {
        id: 'coc7Regular', group: 'dice', system: 'coc7', label: T('レギュラー成功', 'Regular Success'),
        text: T('レギュラー成功', 'REGULAR SUCCESS'), subText: T('REGULAR SUCCESS', ''),
        patch: DICE_SUCCESS
      },
      {
        id: 'coc7Hard', group: 'dice', system: 'coc7', label: T('ハード成功', 'Hard Success'),
        text: T('ハード成功', 'HARD SUCCESS'), subText: T('HARD SUCCESS', ''),
        patch: DICE_GOOD
      },
      {
        id: 'coc7Extreme', group: 'dice', system: 'coc7', label: T('イクストリーム成功', 'Extreme Success'),
        text: T('イクストリーム成功', 'EXTREME SUCCESS'), subText: T('EXTREME SUCCESS', ''),
        patch: DICE_GREAT
      },
      {
        id: 'coc7Critical', group: 'dice', system: 'coc7', label: T('クリティカル', 'Critical'),
        text: T('クリティカル', 'CRITICAL'), subText: T('CRITICAL', ''),
        patch: DICE_CRITICAL
      },
      {
        id: 'coc7Failure', group: 'dice', system: 'coc7', label: T('失敗', 'Failure'),
        text: T('失敗', 'FAILURE'), subText: T('FAILURE', ''),
        patch: DICE_FAILURE
      },
      {
        id: 'coc7Fumble', group: 'dice', system: 'coc7', label: T('ファンブル', 'Fumble'),
        text: T('ファンブル', 'FUMBLE'), subText: T('FUMBLE', ''),
        patch: DICE_FUMBLE
      },
      {
        id: 'emoSingle', group: 'dice', system: 'emoklore', label: T('シングル', 'Single'),
        text: T('シングル', 'SINGLE'), subText: T('SINGLE', ''),
        patch: DICE_SUCCESS
      },
      {
        id: 'emoDouble', group: 'dice', system: 'emoklore', label: T('ダブル', 'Double'),
        text: T('ダブル', 'DOUBLE'), subText: T('DOUBLE', ''),
        patch: DICE_GOOD
      },
      {
        id: 'emoTriple', group: 'dice', system: 'emoklore', label: T('トリプル', 'Triple'),
        text: T('トリプル', 'TRIPLE'), subText: T('TRIPLE', ''),
        patch: DICE_GREAT
      },
      {
        id: 'emoMiracle', group: 'dice', system: 'emoklore', label: T('ミラクル', 'Miracle'),
        text: T('ミラクル', 'MIRACLE'), subText: T('MIRACLE', ''),
        patch: DICE_CRITICAL
      },
      {
        id: 'emoCatastrophe', group: 'dice', system: 'emoklore', label: T('カタストロフ', 'Catastrophe'),
        text: T('カタストロフ', 'CATASTROPHE'), subText: T('CATASTROPHE', ''),
        patch: DICE_BEYOND
      },
      {
        id: 'emoFailure', group: 'dice', system: 'emoklore', label: T('失敗', 'Failure'),
        text: T('失敗', 'FAILURE'), subText: T('FAILURE', ''),
        patch: DICE_FAILURE
      },
      {
        id: 'emoFumble', group: 'dice', system: 'emoklore', label: T('ファンブル', 'Fumble'),
        text: T('ファンブル', 'FUMBLE'), subText: T('FUMBLE', ''),
        patch: DICE_FUMBLE
      },
      {
        id: 'emoResonance', group: 'dice', system: 'emoklore', label: T('共鳴判定', 'Resonance Check'),
        text: T('共鳴判定', 'RESONANCE CHECK'), subText: T('RESONANCE CHECK', ''),
        patch: RESONANCE_CALL
      },
      {
        id: 'emoPossession', group: 'dice', system: 'emoklore', label: T('憑依判定', 'Possession Check'),
        text: T('憑依判定', 'POSSESSION CHECK'), subText: T('POSSESSION CHECK', ''),
        patch: CHECK_CALL
      },
      {
        id: 'dxOpening', group: 'dice', system: 'dx', label: T('オープニング', 'Opening'),
        text: T('オープニングフェイズ', 'OPENING PHASE'), subText: T('OPENING PHASE', ''),
        patch: PHASE_TITLE
      },
      {
        id: 'dxMiddle', group: 'dice', system: 'dx', label: T('ミドルフェイズ', 'Middle'),
        text: T('ミドルフェイズ', 'MIDDLE PHASE'), subText: T('MIDDLE PHASE', ''),
        patch: PHASE_TITLE
      },
      {
        id: 'dxClimax', group: 'dice', system: 'dx', label: T('クライマックス', 'Climax'),
        text: T('クライマックスフェイズ', 'CLIMAX PHASE'), subText: T('CLIMAX PHASE', ''),
        patch: PHASE_TITLE
      },
      {
        id: 'dxEnding', group: 'dice', system: 'dx', label: T('エンディング', 'Ending'),
        text: T('エンディングフェイズ', 'ENDING PHASE'), subText: T('ENDING PHASE', ''),
        patch: PHASE_TITLE
      }
    ],
    trailer: [
      {
        id: 'cinematic', icon: 'play', label: T('シネマティック', 'Cinematic'),
        text: T('その夜、町からひとつの灯りが消えた。\n誰も気づかないまま、時計の針だけが進んでいく。\n\n――真実を知る覚悟はあるか。',
          'That night, a single light vanished from the town.\nNo one noticed, and only the clock kept moving.\n\n— Are you ready to face the truth?'),
        patch: {
          fontId: 'shippori-mincho', weight: 700, fontSize: 46, lineHeight: 1.9, letterSpacing: 0.08,
          fill: { type: 'solid', color: '#f5f0e6' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 10, x: 0, y: 3 },
          glow: { on: true, color: '#8fb0ff', size: 18, strength: 0.6 },
          bg: { type: 'vignette', color: '#000000', opacity: 0.6, sync: true },
          reveal: 'char', cps: 12, glyphDur: 0.5, inFx: 'blurIn', hold: 1.6, outFx: 'fade', outDur: 0.8, wrapChars: 26, cursor: false
        }
      },
      {
        // 1文字ずつ画面の中央に大きく打ち出し、最後にタイトル全体をドンと出す（アニメのサブタイトル風）
        id: 'typewriter', icon: 'typewriter', label: T('タイプライター', 'Typewriter'),
        text: T('霧の館の殺人', 'THE MISTY MANOR MURDER'),
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
        id: 'syslog', icon: 'terminal', label: T('システムログ', 'System Log'),
        text: T('20XX年 X月X日\n調査記録 No.13\n\n対象の館では、夜ごと同じ時刻に\nピアノの音が聞こえるという。',
          'Date: 20XX / XX / XX\nInvestigation Log No.13\n\nEvery night at the same hour,\npiano music echoes through the mansion.'),
        patch: {
          fontId: 'dotgothic16', weight: 400, fontSize: 40, lineHeight: 1.7, letterSpacing: 0.06, align: 'start',
          fill: { type: 'solid', color: '#d9ffe0' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: false }, glow: { on: true, color: '#3cff7a', size: 14, strength: 0.7 },
          bg: { type: 'solid', color: '#000000', opacity: 0.55, sync: true },
          reveal: 'char', cps: 16, glyphDur: 0, inFx: 'typewriter', cursor: true, hold: 1.5, outFx: 'fade', outDur: 0.5, wrapChars: 26
        }
      },
      {
        id: 'lines', icon: 'rise', label: T('1行ずつ浮上', 'Line by Line'),
        text: T('失われた記憶を辿り、\n彼らは再びあの村へ向かう。\n\n霧の向こうで、\n何かが目を覚まそうとしていた。',
          'Following their lost memories,\nthey return to that village once more.\n\nBeyond the fog,\nsomething was about to awaken.'),
        patch: {
          fontId: 'noto-serif-jp', weight: 700, fontSize: 48, lineHeight: 1.9, letterSpacing: 0.1,
          fill: { type: 'solid', color: '#ffffff' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.9, blur: 12, x: 0, y: 3 },
          bg: { type: 'bottom', color: '#000000', opacity: 0.7, sync: true },
          reveal: 'line', lineInterval: 1.1, glyphDur: 0.9, inFx: 'rise', hold: 1.6, outFx: 'fade', outDur: 0.7
        }
      },
      {
        id: 'sweep', icon: 'wave', label: T('流れるように', 'Smooth Sweep'),
        text: T('ここから先は、帰り道のない物語。\nそれでも、扉を開けますか。', 'Beyond this point lies a story with no way back.\nWill you still open the door?'),
        patch: {
          fontId: 'zen-old-mincho', weight: 700, fontSize: 50, lineHeight: 1.9, letterSpacing: 0.12,
          fill: { type: 'solid', color: '#f3eee4' }, stroke: { on: false }, stroke2: { on: false },
          shadow: { on: true, color: '#000000', opacity: 0.85, blur: 12, x: 0, y: 3 },
          glow: { on: true, color: '#ffffff', size: 16, strength: 0.4 },
          reveal: 'sweep', sweepDur: 1.5, lineInterval: 1.4, glyphDur: 0.5, inFx: 'fade', hold: 1.8, outFx: 'fade', outDur: 0.9
        }
      },
      {
        id: 'credits', icon: 'reel', label: T('エンドロール', 'End Credits'),
        text: T('STAFF\n\nシナリオ\n〇〇〇〇\n\nゲームマスター\n〇〇〇〇\n\n探索者\n〇〇〇〇\n〇〇〇〇\n〇〇〇〇\n\nThank you for playing!',
          'STAFF\n\nScenario\n〇〇〇〇\n\nGame Master\n〇〇〇〇\n\nInvestigators\n〇〇〇〇\n〇〇〇〇\n〇〇〇〇\n\nThank you for playing!'),
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
        id: 'converge', icon: 'converge', label: T('上下から合流', 'Converge'),
        text: T('保健室', 'Infirmary'), subText: T('放課後 16:30', 'After School — 4:30 PM'),
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
        id: 'float', icon: 'floatUp', label: T('浮かび上がる', 'Float Up'),
        text: T('旧校舎 三階', 'Old Building, 3F'), subText: T('PM 7:45', '7:45 PM'),
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
        id: 'cinema', icon: 'spacing', label: T('字間シネマ', 'Cinematic Tracking'),
        text: T('TOKYO', 'TOKYO'), subText: T('2026.10.31 23:59', '2026.10.31 23:59'),
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
        id: 'clock', icon: 'stopwatch', label: T('時刻表示', 'Time Stamp'),
        text: T('23:59', '23:59'), subText: T('2026.10.31 SAT', '2026.10.31 SAT'),
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
        id: 'underline', icon: 'underline', label: T('下線スライド（左下）', 'Underline (Bottom Left)'),
        text: T('図書室', 'Library'), subText: T('午後 5時12分', '5:12 PM'),
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
        id: 'vertical', icon: 'vertical', label: T('縦書き（右上）', 'Vertical (Top Right)'),
        text: T('神社の境内', 'Shrine Grounds'), subText: T('深夜 二時', '2:00 AM'),
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
        id: 'boxed', icon: 'frame', label: T('ボックス（左上）', 'Boxed (Top Left)'),
        text: T('第三研究棟 地下', 'Research Wing B1'), subText: T('B1F ― 立入禁止区域', 'B1F — Restricted Area'),
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
    { id: 'plain', label: T('白＋黒縁', 'White + Outline'), patch: {
      fill: { type: 'solid', color: '#ffffff' }, fillOpacity: 1, stroke: { on: true, width: 5, color: '#1b1b1f' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 5 }, glow: { on: false } } },
    { id: 'gold', label: T('金', 'Gold'), patch: {
      fill: { type: 'gradient', color: '#fffbe6', color2: '#ffd257', color3: '#b8860b', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 4, color: '#3b2500' }, stroke2: { on: true, width: 5, color: '#fff3c4' },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 14, x: 0, y: 6 }, glow: { on: true, color: '#ffd257', size: 34, strength: 1 } } },
    { id: 'silver', label: T('銀', 'Silver'), patch: {
      fill: { type: 'gradient', color: '#ffffff', color2: '#dfe6ee', color3: '#8f9cab', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 3, color: '#1d2430' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 4 }, glow: { on: true, color: '#bcd7ff', size: 22, strength: 0.8 } } },
    { id: 'blood', label: T('血', 'Blood'), patch: {
      fill: { type: 'gradient', color: '#ff6a6a', color2: '#b30000', color3: '#4a0000', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 3, color: '#1a0000' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.85, blur: 20, x: 0, y: 6 }, glow: { on: true, color: '#ff1a1a', size: 40, strength: 1.1 } } },
    { id: 'neon', label: T('ネオン', 'Neon'), patch: {
      fill: { type: 'solid', color: '#f4fdff' }, fillOpacity: 1, stroke: { on: true, width: 2, color: '#00c8ff' }, stroke2: { on: false },
      shadow: { on: false }, glow: { on: true, color: '#00d9ff', size: 34, strength: 1.6 } } },
    { id: 'eerie', label: T('怪しい紫', 'Eerie Purple'), patch: {
      fill: { type: 'solid', color: '#ece6ff' }, fillOpacity: 1, stroke: { on: true, width: 3, color: '#12002a' }, stroke2: { on: false },
      shadow: { on: true, color: '#000000', opacity: 0.7, blur: 16, x: 0, y: 5 }, glow: { on: true, color: '#8a4dff', size: 36, strength: 1.2 } } },
    { id: 'pop', label: T('ポップ', 'Pop'), patch: {
      fill: { type: 'gradient', color: '#fffbd1', color2: '#ffe14d', color3: '#ff9d00', dir: 'v' }, fillOpacity: 1,
      stroke: { on: true, width: 7, color: '#6a2c00' }, stroke2: { on: true, width: 6, color: '#ffffff' },
      shadow: { on: true, color: '#000000', opacity: 0.5, blur: 8, x: 0, y: 6 }, glow: { on: false } } },
    { id: 'ghost', label: T('ゴースト', 'Ghost'), patch: {
      fill: { type: 'solid', color: '#e9f3ff' }, fillOpacity: 0.85, stroke: { on: false }, stroke2: { on: false },
      shadow: { on: false }, glow: { on: true, color: '#9fd4ff', size: 30, strength: 1.2 } } },
    { id: 'ink', label: T('墨（明るい背景用）', 'Ink (for light BG)'), patch: {
      fill: { type: 'solid', color: '#141414' }, fillOpacity: 1, stroke: { on: false }, stroke2: { on: false },
      shadow: { on: true, color: '#ffffff', opacity: 0.8, blur: 10, x: 0, y: 0 }, glow: { on: false } } },
    { id: 'hollow', label: T('白抜き', 'Hollow'), patch: {
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
    { id: '1920x1080', w: 1920, h: 1080, label: T('1920 × 1080（16:9 FHD）', '1920 × 1080 (16:9 FHD)') },
    { id: '1280x720', w: 1280, h: 720, label: T('1280 × 720（16:9 HD）', '1280 × 720 (16:9 HD)') },
    { id: '960x540', w: 960, h: 540, label: T('960 × 540（16:9 軽量）', '960 × 540 (16:9 light)') },
    { id: '1280x360', w: 1280, h: 360, label: T('1280 × 360（横長の帯）', '1280 × 360 (wide strip)') },
    { id: '1024x256', w: 1024, h: 256, label: T('1024 × 256（テロップ帯）', '1024 × 256 (caption strip)') },
    { id: '1080x1080', w: 1080, h: 1080, label: T('1080 × 1080（正方形）', '1080 × 1080 (square)') },
    { id: '720x1280', w: 720, h: 1280, label: T('720 × 1280（縦長 9:16）', '720 × 1280 (portrait 9:16)') },
    { id: 'custom', w: 0, h: 0, label: T('カスタム', 'Custom') }
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
    return value ? (value[lang] ?? value.ja) : '';
  }

  // テンプレートはスタイル・動き・文章を初期値から組み立て直す（書き換えた文章を戻すのは呼び出し側）
  function applyTemplate(scene, template, lang) {
    const keep = { width: scene.width, height: scene.height, sizePreset: scene.sizePreset, outEnabled: scene.outEnabled };
    const fresh = deepMerge(deepMerge(clone(BASE), MODE_DEFAULTS[scene.mode] || {}), template.patch);
    Object.keys(scene).forEach(key => delete scene[key]);
    Object.assign(scene, fresh);
    scene.width = keep.width || fresh.width;
    scene.height = keep.height || fresh.height;
    scene.sizePreset = keep.sizePreset || fresh.sizePreset;
    scene.templateId = template.id;
    // 退場の有無は利用者の選択なので、テンプレートを切り替えても引き継ぐ
    if (!('outEnabled' in template.patch)) scene.outEnabled = keep.outEnabled !== false;
    scene.text = sampleText(template, 'text', lang);
    scene.subText = sampleText(template, 'subText', lang);
    return scene;
  }

  // 文章・サブテキストが、いずれかのテンプレートの見本のままか（書き換えた文章を覚える仕組みより前の保存データの引き継ぎに使う）
  function sampleState(mode, text, subText) {
    const texts = new Set();
    const subs = new Set();
    (TEMPLATES[mode] || []).forEach(tpl => ['ja', 'en'].forEach(lang => {
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
    sampleState
  };
})(window);
