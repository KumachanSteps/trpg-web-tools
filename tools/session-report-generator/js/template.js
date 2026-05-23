(function () {
  'use strict';

  const TARGET_TYPES = Object.freeze({
    FIXED: 'fixed',
    SYSTEM: 'system',
    ROLE: 'role',
    GM_NAME: 'gmName',
    PARTICIPANT_HEADER: 'participantHeader',
    SLOT: 'slot',
    HO: 'ho',
    PC_NAME: 'pcName',
    PL_NAME: 'plName',
    END: 'end',
    SCENARIO: 'scenario',
    DATE: 'date',
    AUTHOR: 'author',
    HASHTAG: 'hashtag'
  });

  const COMMON_STYLE_TARGETS = [
    TARGET_TYPES.SYSTEM,
    TARGET_TYPES.ROLE,
    TARGET_TYPES.PARTICIPANT_HEADER,
    TARGET_TYPES.SLOT,
    TARGET_TYPES.HO,
    TARGET_TYPES.END,
    TARGET_TYPES.DATE
  ];

  const NAME_LOCKED_TARGETS = [
    TARGET_TYPES.GM_NAME,
    TARGET_TYPES.PC_NAME,
    TARGET_TYPES.PL_NAME
  ];

  function part(type, value) {
    return { type, value: value == null ? '' : String(value) };
  }

  function fixed(value) {
    return part(TARGET_TYPES.FIXED, value);
  }

  function lineBreak() {
    return fixed('\n');
  }

  function blankLine() {
    return fixed('\n\n');
  }

  function lineJoin(parts) {
    return parts
      .map(x => typeof x === 'string' ? fixed(x) : x)
      .filter(x => x && x.value !== undefined && x.value !== null && x.value !== '')
      .reduce((acc, x) => {
        acc.push(x);
        return acc;
      }, []);
  }

  function smallRole(role) {
    return {
      KP: 'ᴋᴘ',
      DL: 'ᴅʟ',
      GM: 'ɢᴍ',
      'KPC/KP': 'ᴋᴘᴄ/ᴋᴘ',
      SKP: 'ꜱᴋᴘ',
      '作/KP': '作/ᴋᴘ',
      進行: '進行'
    }[role] || String(role || '').toLowerCase();
  }

  function roleParts(gm, options = {}) {
    const role = options.small ? smallRole(gm.role) : gm.role;
    return [
      part(TARGET_TYPES.ROLE, role),
      fixed(options.separator ?? ': '),
      part(TARGET_TYPES.GM_NAME, gm.name)
    ];
  }

  function primaryParticipantMode(data) {
    const first = data.players && data.players[0];
    const slot = first ? String(first.slot || '') : '';
    if (slot === 'PL/PC') return 'PL/PC';
    if (slot === 'PC/PL') return 'PC/PL';
    return 'PC/PL';
  }

  function participantHeaderValue(data, style = 'slash') {
    const mode = primaryParticipantMode(data);
    if (style === 'bar') return mode === 'PL/PC' ? 'PL┊PC' : 'PC┊PL';
    if (style === 'dot') return mode === 'PL/PC' ? 'PL・PC' : 'PC・PL';
    if (style === 'small-bar') return mode === 'PL/PC' ? 'ᴘʟ┊ᴘᴄ' : 'ᴘᴄ┊ᴘʟ';
    if (style === 'small-dot') return mode === 'PL/PC' ? 'ᴘʟ・ᴘᴄ' : 'ᴘᴄ・ᴘʟ';
    if (style === 'small-slash') return mode === 'PL/PC' ? 'ᴘʟ/ᴘᴄ' : 'ᴘᴄ/ᴘʟ';
    return mode;
  }

  function shouldShowSlot(player) {
    return !['PC/PL', 'PL/PC', '自由'].includes(String(player.slot || ''));
  }

  function playerNameParts(player, data, separator = ' / ') {
    const mode = primaryParticipantMode(data);
    if (mode === 'PL/PC') {
      return [
        part(TARGET_TYPES.PL_NAME, player.pl),
        fixed(separator),
        part(TARGET_TYPES.PC_NAME, player.pc)
      ];
    }
    return [
      part(TARGET_TYPES.PC_NAME, player.pc),
      fixed(separator),
      part(TARGET_TYPES.PL_NAME, player.pl)
    ];
  }

  function slotParts(player) {
    if (!shouldShowSlot(player)) return [];
    const out = [part(TARGET_TYPES.SLOT, player.slot)];
    if (player.ho) out.push(fixed(' '), part(TARGET_TYPES.HO, player.ho));
    return out;
  }

  function addGMs(parts, data, options = {}) {
    data.gms.forEach((gm, index) => {
      if (index > 0 && options.joiner) parts.push(fixed(options.joiner));
      parts.push(...roleParts(gm, options));
      if (!options.noLineBreak) parts.push(lineBreak());
    });
  }

  function addPlayers(parts, data, options = {}) {
    const separator = options.separator ?? ' / ';
    data.players.forEach(player => {
      const slot = slotParts(player);
      if (options.arrow) parts.push(fixed(options.arrow));
      if (slot.length) parts.push(...slot, fixed(options.afterSlot ?? ': '));
      parts.push(...playerNameParts(player, data, separator), lineBreak());
    });
  }

  function simpleTitle(data, quote = '「', endQuote = '」') {
    return [
      part(TARGET_TYPES.SYSTEM, data.system),
      lineBreak(),
      fixed(quote),
      part(TARGET_TYPES.SCENARIO, data.scenario),
      fixed(endQuote),
      blankLine()
    ];
  }

  function classicBuild(data) {
    const parts = [...simpleTitle(data)];
    addGMs(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    addPlayers(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), blankLine(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function minimalBuild(data) {
    const parts = [
      part(TARGET_TYPES.SYSTEM, data.system),
      lineBreak(),
      fixed('『'),
      part(TARGET_TYPES.SCENARIO, data.scenario),
      fixed('』'),
      blankLine()
    ];
    addGMs(parts, data, { separator: '：' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    addPlayers(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function frameBuild(data) {
    const parts = [
      fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n'),
      fixed('      '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(),
      fixed('   　　'), part(TARGET_TYPES.SCENARIO, data.scenario), blankLine()
    ];
    data.gms.forEach(gm => parts.push(fixed('  　'), part(TARGET_TYPES.ROLE, smallRole(gm.role)), fixed('┊'), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(fixed('  　'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'small-bar')), lineBreak());
    data.players.forEach(player => {
      parts.push(fixed('  　'));
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, fixed(' '));
      parts.push(...playerNameParts(player, data, ' | '), lineBreak());
    });
    parts.push(fixed('  　── '), part(TARGET_TYPES.END, data.result), fixed(' ──\n'), part(TARGET_TYPES.DATE, data.date), lineBreak(), fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n'), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function asteriskFrameBuild(data) {
    const border = '✼••┈┈••✼••┈┈••✼';
    const parts = [fixed(border + '\n    '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('　'), part(TARGET_TYPES.SCENARIO, data.scenario), lineBreak(), fixed(border + '\n')];
    addGMs(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    addPlayers(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result || 'END'), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function fancyBuild(data) {
    const parts = [fixed('⟡.·*.····························⟡.·*.\n '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('　     ◤ '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' ◢\n\n')];
    data.gms.forEach(gm => parts.push(fixed(' '), part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    data.players.forEach(player => {
      const slot = slotParts(player);
      if (slot.length) parts.push(fixed(' '), ...slot, lineBreak());
      parts.push(fixed(' ┗ '), ...playerNameParts(player, data, ' | '), lineBreak());
    });
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function blockBuild(data) {
    const parts = [fixed('▮     '), part(TARGET_TYPES.SYSTEM, data.system), fixed('     ▮\n\n  『  '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('  』\n\n')];
    addGMs(parts, data, { small: true, separator: ' ' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'small-slash')), lineBreak());
    data.players.forEach(player => {
      parts.push(fixed('   '));
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, fixed(' '));
      parts.push(...playerNameParts(player, data, '｜'), lineBreak());
    });
    parts.push(lineBreak(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function hoFocusBuild(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('『 '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' 』\n\n')];
    data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    data.players.forEach(player => {
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, lineBreak(), fixed('　　- '));
      parts.push(...playerNameParts(player, data), lineBreak());
    });
    parts.push(blankLine(), fixed('-　'), part(TARGET_TYPES.END, data.result), fixed('　-\n'), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function kpcPairBuild(data) {
    const firstGm = data.gms[0] || { name: 'KPC名 | KP名' };
    const firstPlayer = data.players[0] || { pc: '探索者A', pl: 'PL名A', slot: 'PC/PL' };
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('【 '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' 】\n\n| '), part(TARGET_TYPES.PARTICIPANT_HEADER, 'ᴋᴘᴄ・ᴋᴘ'), lineBreak(), fixed('  '), part(TARGET_TYPES.GM_NAME, firstGm.name), lineBreak(), fixed('| '), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'small-dot')), lineBreak(), fixed('  '), ...playerNameParts(firstPlayer, data, ' | '), blankLine(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags)];
    return lineJoin(parts);
  }

  function emokloreBuild(data) {
    const parts = [fixed('✧\n   '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('     「 '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' 」\n'), fixed(' 　　    Date. '), part(TARGET_TYPES.DATE, data.date), blankLine()];
    data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    addPlayers(parts, data, { arrow: '┗ ', afterSlot: ' ', separator: ' | ' });
    parts.push(blankLine(), fixed('✧ '), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function wideTitleBuild(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('◤　'), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('　◢\n\n')];
    addGMs(parts, data, { separator: '：' });
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    addPlayers(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function zigzagBuild(data) {
    const border = '◢◤◢◤◢◤◢◤◢◤◢';
    const parts = [fixed(border + '\n　'), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('　　　'), part(TARGET_TYPES.SCENARIO, data.scenario), blankLine(), fixed(border + '\n')];
    addGMs(parts, data, { separator: ' ' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    data.players.forEach(player => {
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, lineBreak(), fixed('  - '));
      parts.push(...playerNameParts(player, data), lineBreak());
    });
    parts.push(blankLine(), fixed('- '), part(TARGET_TYPES.END, data.result), fixed(' -\n'), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function cornerFrameBuild(data) {
    const parts = [fixed('◤￣￣￣￣￣￣￣￣￣\n '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('        '), part(TARGET_TYPES.SCENARIO, data.scenario), blankLine(), fixed('＿＿＿＿＿＿＿＿＿◢\n')];
    addGMs(parts, data);
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak());
    data.players.forEach(player => parts.push(fixed(' '), ...playerNameParts(player, data), lineBreak()));
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function triangleHeadingBuild(data) {
    const parts = [fixed('▸ '), part(TARGET_TYPES.SYSTEM, data.system), blankLine(), fixed('- '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' -\n\n')];
    data.gms.forEach(gm => parts.push(fixed('▸ '), part(TARGET_TYPES.ROLE, gm.role), fixed(': '), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(fixed('▸ '), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), fixed(': '));
    data.players.forEach((player, index) => {
      if (index > 0) parts.push(lineBreak(), fixed('               '));
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, fixed(' '));
      parts.push(...playerNameParts(player, data));
    });
    parts.push(blankLine(), fixed('▸ '), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function scenarioClearBuild(data) {
    const parts = [fixed('⧉ '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('.　　'), part(TARGET_TYPES.SCENARIO, data.scenario), lineBreak()];
    if (data.author) parts.push(fixed('.　　　　'), part(TARGET_TYPES.AUTHOR, data.author), lineBreak());
    parts.push(lineBreak());
    data.gms.forEach(gm => parts.push(fixed('｜'), part(TARGET_TYPES.ROLE, smallRole(gm.role)), lineBreak(), fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), blankLine()));
    parts.push(fixed('｜'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'small-dot')), lineBreak());
    data.players.forEach(player => parts.push(fixed('　'), ...playerNameParts(player, data), lineBreak()));
    parts.push(blankLine(), fixed('　- '), part(TARGET_TYPES.END, data.result || 'scenario clear'), fixed(' -\n'), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function handwrittenTitleBuild(data) {
    const border = '┈┈┈┈┈┈┈┈┈';
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('⌜ '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' ⌟\n'), fixed(border + '\n'), fixed('✧'), part(TARGET_TYPES.ROLE, 'KP'), lineBreak()];
    data.gms.forEach(gm => parts.push(fixed('  ▹'), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(blankLine(), fixed('✧'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data).replace('/', '')), lineBreak());
    data.players.forEach(player => {
      parts.push(fixed('  ▹'));
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, fixed(' '));
      parts.push(...playerNameParts(player, data, ' / '), lineBreak());
    });
    parts.push(blankLine(), fixed('✧'), part(TARGET_TYPES.END, data.result), lineBreak(), fixed(border + 'ᝰ✍︎ ꙳⋆\n'), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function doubleLineBuild(data) {
    const border = '══════════════';
    const parts = [fixed(border + '\n   '), part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('　'), part(TARGET_TYPES.SCENARIO, data.scenario), lineBreak(), fixed(border + '\n\n')];
    data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, smallRole(gm.role)), fixed('：'), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    data.players.forEach(player => {
      const slot = slotParts(player);
      if (slot.length) parts.push(...slot, lineBreak());
      parts.push(fixed('　　 '), ...playerNameParts(player, data), lineBreak());
    });
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  function ribbonTitleBuild(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), lineBreak(), fixed('　‧₊˚ ୨  '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('  ୧ ˚₊\n\n'), part(TARGET_TYPES.ROLE, 'KP'), fixed('…\n')];
    data.gms.forEach(gm => parts.push(fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    parts.push(blankLine(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), fixed('…\n'));
    data.players.forEach(player => parts.push(fixed('　'), ...playerNameParts(player, data), lineBreak()));
    parts.push(blankLine(), part(TARGET_TYPES.END, data.result), lineBreak(), part(TARGET_TYPES.DATE, data.date), lineBreak(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return lineJoin(parts);
  }

  const REPORT_STYLES = [
    { id: 'classic', label: 'クラシック：標準・読みやすい', styleTargets: COMMON_STYLE_TARGETS, build: classicBuild },
    { id: 'minimal', label: 'ミニマル：短文シンプル', styleTargets: COMMON_STYLE_TARGETS, build: minimalBuild },
    { id: 'frame', label: '✦フレーム：✦ ┈┈┈┈┈┈ ✦', styleTargets: COMMON_STYLE_TARGETS, build: frameBuild },
    { id: 'asterisk-frame', label: '✼フレーム：✼••┈┈••✼••┈┈••✼', styleTargets: COMMON_STYLE_TARGETS, build: asteriskFrameBuild },
    { id: 'fancy', label: '⟡フレーム：⟡.·*.·····················⟡.·*.', styleTargets: COMMON_STYLE_TARGETS, build: fancyBuild },
    { id: 'block', label: '▮ ブロック：▮ システム名 ▮', styleTargets: COMMON_STYLE_TARGETS, build: blockBuild },
    { id: 'ho-focus', label: 'HO一覧スタイル：HO一覧重視', styleTargets: COMMON_STYLE_TARGETS, build: hoFocusBuild },
    { id: 'kpc-pair', label: 'KPCタイマン：| ᴋᴘᴄ・ᴋᴘ ＆ | ᴘᴄ・ᴘʟ', styleTargets: COMMON_STYLE_TARGETS, build: kpcPairBuild },
    { id: 'emoklore', label: '✧上下囲み：✧　　　　　　　　✧', styleTargets: COMMON_STYLE_TARGETS, build: emokloreBuild },
    { id: 'wide-title', label: '◤ シナリオ名 ◢ ɢᴍ: ᴘʟ/ᴘᴄ', styleTargets: COMMON_STYLE_TARGETS, build: wideTitleBuild },
    { id: 'zigzag', label: '◢◤◢ シナリオ名 ◢◤◢', styleTargets: COMMON_STYLE_TARGETS, build: zigzagBuild },
    { id: 'corner-frame', label: '◤￣￣￣ title ＿＿＿◢', styleTargets: COMMON_STYLE_TARGETS, build: cornerFrameBuild },
    { id: 'triangle-heading', label: '▸ system ▸ ɢᴍ: ▸ ᴘᴄ/ᴘʟ:', styleTargets: COMMON_STYLE_TARGETS, build: triangleHeadingBuild },
    { id: 'scenario-clear', label: '⧉ system |ɢᴍ |ᴘᴄ・ᴘʟ', styleTargets: COMMON_STYLE_TARGETS, build: scenarioClearBuild },
    { id: 'handwritten-title', label: '⌜ TITLE ⌟ / ✧𝐊𝐏・✧𝐏𝐋', styleTargets: COMMON_STYLE_TARGETS, build: handwrittenTitleBuild },
    { id: 'double-line', label: '════════ / ᴋᴘ・ʜᴏ', styleTargets: COMMON_STYLE_TARGETS, build: doubleLineBuild },
    { id: 'ribbon-title', label: '‧₊˚ ୨ Title ୧ ˚₊ 𝗞𝗣…𝗣𝗖/𝗣𝗟…', styleTargets: COMMON_STYLE_TARGETS, build: ribbonTitleBuild }
  ];

  const ASCII_ART_COLLECTION = {
    line: {
      label: 'LINE',
      items: [
        { label: '✦ ┈┈ ✦', value: '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦' },
        { label: '⟡ ⎯⎯ ⟡', value: '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·' },
        { label: '──────', value: '──────────────────' },
        { label: '─ ⋅ ✩ ⋅ ─', value: '──────── ⋅ ✩ ⋅ ────────' },
        { label: '꒰ঌ ┈┈ ໒꒱', value: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱' },
        { label: '◈ ━━ ◈', value: '◈ ━━━━━━━━━━━━━━ ◈' },
        { label: '╋━━╋', value: '╋━━━━━━━━━━━━━━╋' }
      ]
    },
    single: {
      label: 'SINGLE CHARACTER',
      items: [
        { label: '❏', value: '❏' },
        { label: '✦', value: '✦' },
        { label: '✧', value: '✧' },
        { label: '┗', value: '┗ ' },
        { label: '┊', value: '┊' },
        { label: '▎', value: '▎' },
        { label: '◤', value: '◤' },
        { label: '◢', value: '◢' }
      ]
    },
    designs: {
      label: 'DESIGNS',
      items: [
        { label: '.+:ﾟ+｡.☆', value: '.+:ﾟ+｡.☆' },
        { label: '✧･ﾟ:*', value: '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧' },
        { label: '✦⋆˙₊⟡', value: '✦⋆˙₊⟡' },
        { label: '⊹₊⋆ ✦', value: '⊹₊⋆ ✦. ݁' },
        { label: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', value: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ' },
        { label: '◤￣￣', value: '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣' },
        { label: '＿＿◢', value: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢' }
      ]
    }
  };

  function renderParts(data) {
    const style = REPORT_STYLES.find(item => item.id === data.style) || REPORT_STYLES[0];
    const parts = style.build(data);
    const targets = new Set(style.styleTargets || COMMON_STYLE_TARGETS);
    return parts.map(item => {
      if (!item || item.value == null) return '';
      if (targets.has(item.type) && data.styleText) return data.styleText(item.value, data.fontVariant);
      return item.value;
    }).join('').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  window.ReportTemplate = {
    TARGET_TYPES,
    COMMON_STYLE_TARGETS,
    NAME_LOCKED_TARGETS,
    REPORT_STYLES,
    ASCII_ART_COLLECTION,
    renderParts
  };
})();
