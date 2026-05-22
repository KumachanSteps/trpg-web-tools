(() => {
  const TARGET_TYPES = {
    SYSTEM: 'system',
    ROLE: 'role',
    GM_NAME: 'gmName',
    PARTICIPANT_HEADER: 'participantHeader',
    SLOT: 'slot',
    HO: 'ho',
    PC_NAME: 'pcName',
    PL_NAME: 'plName',
    END: 'end',
    DATE: 'date',
    SCENARIO: 'scenario',
    AUTHOR: 'author',
    HASHTAG: 'hashtag',
    FIXED: 'fixed'
  };

  const COMMON_STYLE_TARGETS = [
    TARGET_TYPES.SYSTEM,
    TARGET_TYPES.ROLE,
    TARGET_TYPES.PARTICIPANT_HEADER,
    TARGET_TYPES.SLOT,
    TARGET_TYPES.HO,
    TARGET_TYPES.END,
    TARGET_TYPES.DATE
  ];

  const NAME_TYPES = [
    TARGET_TYPES.GM_NAME,
    TARGET_TYPES.PC_NAME,
    TARGET_TYPES.PL_NAME
  ];

  function part(type, value = '') {
    return { type, value: value == null ? '' : String(value) };
  }

  function fixed(value = '') {
    return part(TARGET_TYPES.FIXED, value);
  }

  function br() {
    return fixed('\n');
  }

  function blank() {
    return fixed('\n\n');
  }

  function normalizeParts(parts) {
    return parts
      .filter(p => p && p.value !== undefined && p.value !== null)
      .map(p => ({ type: p.type || TARGET_TYPES.FIXED, value: String(p.value) }));
  }

  function lineJoin(parts) {
    const raw = normalizeParts(parts)
      .map(p => p.value)
      .join('')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return [{ type: TARGET_TYPES.FIXED, value: raw }];
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

  function boldLabel(label) {
    return String(label || 'PC')
      .replace(/^HO([0-9])$/i, (_, n) => '𝐇𝐎' + String.fromCodePoint(0x1D7CE + Number(n)))
      .replace(/^PC([0-9])$/i, (_, n) => '𝐏𝐂' + String.fromCodePoint(0x1D7CE + Number(n)))
      .replace(/^HO/i, '𝐇𝐎')
      .replace(/^PC/i, '𝐏𝐂');
  }

  function normalizeKpcName(name) {
    const text = String(name || '').trim();
    if (!text || text === 'KP名') return 'KPC名 | KP名';
    const parts = text
      .replaceAll('｜', '/')
      .replaceAll('|', '/')
      .split('/')
      .map(x => x.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts.join(' | ') : text;
  }

  function isParticipantHeaderSlot(slot) {
    return slot === 'PC/PL' || slot === 'PL/PC';
  }

  function playerLabel(player) {
    const slot = player.slot === '自由' || isParticipantHeaderSlot(player.slot) ? '' : player.slot;
    return slot && player.ho ? `${slot} ${player.ho}` : slot;
  }

  function playerNameOrder(player) {
    return player.slot === 'PL/PC' ? 'plpc' : 'pcpl';
  }

  function addPlayerNamePair(parts, player, separator = ' / ') {
    if (playerNameOrder(player) === 'plpc') {
      parts.push(part(TARGET_TYPES.PL_NAME, player.pl), fixed(separator), part(TARGET_TYPES.PC_NAME, player.pc));
    } else {
      parts.push(part(TARGET_TYPES.PC_NAME, player.pc), fixed(separator), part(TARGET_TYPES.PL_NAME, player.pl));
    }
  }

  function participantHeader(data, defaultValue = 'PC/PL') {
    const selected = data.participantHeader === 'PL/PC' || data.participantHeader === 'PC/PL'
      ? data.participantHeader
      : '';
    if (!selected) return defaultValue;

    const map = {
      'PC/PL': { pcpl: 'PC/PL', plpc: 'PL/PC' },
      'PL/PC': { pcpl: 'PC/PL', plpc: 'PL/PC' },
      'ᴘᴄ┊ᴘʟ': { pcpl: 'ᴘᴄ┊ᴘʟ', plpc: 'ᴘʟ┊ᴘᴄ' },
      'ᴘᴄ・ᴘʟ': { pcpl: 'ᴘᴄ・ᴘʟ', plpc: 'ᴘʟ・ᴘᴄ' },
      'PcᐟPL': { pcpl: 'PcᐟPL', plpc: 'PLᐟPc' },
      'ᴘʟᴘᴄ': { pcpl: 'ᴘᴄᴘʟ', plpc: 'ᴘʟᴘᴄ' },
      'PL/PC': { pcpl: 'PC/PL', plpc: 'PL/PC' },
      '𝐏𝐋': { pcpl: '𝐏𝐂/𝐏𝐋', plpc: '𝐏𝐋/𝐏𝐂' },
      '𝗣𝗖/𝗣𝗟': { pcpl: '𝗣𝗖/𝗣𝗟', plpc: '𝗣𝗟/𝗣𝗖' }
    };

    const entry = map[defaultValue];
    if (!entry) return selected;
    return selected === 'PL/PC' ? entry.plpc : entry.pcpl;
  }

  function addGMs(parts, data, options = {}) {
    const sep = options.sep ?? ': ';
    const roleTransform = options.roleTransform || (role => role);
    data.gms.forEach(gm => {
      parts.push(
        part(TARGET_TYPES.ROLE, roleTransform(gm.role)),
        fixed(sep),
        part(TARGET_TYPES.GM_NAME, gm.name),
        br()
      );
    });
  }

  function addPlayers(parts, data, mode = 'classic') {
    data.players.forEach(player => {
      const label = playerLabel(player);
      const slotType = TARGET_TYPES.SLOT;
      const hoType = TARGET_TYPES.HO;

      if (mode === 'pipe') {
        if (label) parts.push(part(slotType, label), fixed(' '));
        addPlayerNamePair(parts, player, ' | ');
        parts.push(br());
        return;
      }

      if (mode === 'plain') {
        addPlayerNamePair(parts, player, ' / ');
        parts.push(br());
        return;
      }

      if (mode === 'arrow') {
        parts.push(fixed('┗ '));
        if (label) parts.push(part(slotType, label), fixed(' '));
        addPlayerNamePair(parts, player, ' | ');
        parts.push(br());
        return;
      }

      if (mode === 'dash') {
        parts.push(part(slotType, label || 'PC'), br(), fixed('　　- '));
        addPlayerNamePair(parts, player, ' / ');
        parts.push(br());
        return;
      }

      if (mode === 'fancy') {
        parts.push(part(slotType, boldLabel(label || 'PC')), br(), fixed(' ┗ '));
        addPlayerNamePair(parts, player, ' | ');
        parts.push(br());
        return;
      }

      if (mode === 'split-ho') {
        parts.push(part(slotType, label || 'PC'), fixed(' '), part(hoType, player.ho || 'HO name'), br(), fixed('　　 '));
        addPlayerNamePair(parts, player, ' / ');
        parts.push(br());
        return;
      }

      if (label) parts.push(part(slotType, label), fixed(': '));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
  }

  function buildClassic(data) {
    const parts = [
      part(TARGET_TYPES.SYSTEM, data.system), br(),
      fixed('「'), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('」'), blank()
    ];
    addGMs(parts, data);
    parts.push(blank(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), br());
    addPlayers(parts, data, 'classic');
    parts.push(blank(), part(TARGET_TYPES.END, data.result), blank(), part(TARGET_TYPES.DATE, data.date), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildMinimal(data) {
    const parts = [
      part(TARGET_TYPES.SYSTEM, data.system), br(),
      fixed('『'), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('』'), blank()
    ];
    addGMs(parts, data, { sep: '：' });
    addPlayers(parts, data, 'classic');
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildFrame(data) {
    const parts = [
      fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n      '),
      part(TARGET_TYPES.SYSTEM, data.system), br(),
      fixed('  　　'), part(TARGET_TYPES.SCENARIO, data.scenario), blank()
    ];
    addGMs(parts, data, { sep: '┊', roleTransform: smallRole });
    parts.push(fixed('  　'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'ᴘᴄ┊ᴘʟ')), br());
    data.players.forEach(player => {
      parts.push(fixed('  　'));
      const label = playerLabel(player);
      if (label) parts.push(part(TARGET_TYPES.SLOT, label), fixed(' '));
      addPlayerNamePair(parts, player, ' | ');
      parts.push(br());
    });
    parts.push(fixed('  　── '), part(TARGET_TYPES.END, data.result), fixed(' ──'), blank(), fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦'), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildAsteriskFrame(data) {
    const border = '✼••┈┈••✼••┈┈••✼';
    const parts = [fixed(border), br(), fixed('    '), part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　'), part(TARGET_TYPES.SCENARIO, data.scenario), br(), fixed(border), br()];
    addGMs(parts, data);
    parts.push(blank(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), br());
    addPlayers(parts, data, 'classic');
    parts.push(blank(), part(TARGET_TYPES.END, data.result || 'END'), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildFancy(data) {
    const parts = [
      fixed('⟡.·*.····························⟡.·*.\n '),
      part(TARGET_TYPES.SYSTEM, data.system), br(),
      fixed('　     ◤ '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' ◢'), blank()
    ];
    data.gms.forEach(gm => parts.push(fixed(' '), part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    data.players.forEach(player => {
      parts.push(fixed(' '), part(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), br(), fixed(' ┗ '), part(TARGET_TYPES.PC_NAME, player.pc), fixed(' | '), part(TARGET_TYPES.PL_NAME, player.pl), br());
    });
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildBlock(data) {
    const parts = [
      fixed('▮     '), part(TARGET_TYPES.SYSTEM, data.system), fixed('     ▮'), blank(),
      fixed('  『  '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('  』'), blank()
    ];
    data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, smallRole(gm.role)), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'ᴘʟᴘᴄ')), br());
    data.players.forEach(player => {
      parts.push(fixed('   '));
      const label = playerLabel(player);
      if (label) parts.push(part(TARGET_TYPES.SLOT, label), fixed(' '));
      addPlayerNamePair(parts, player, ' | ');
      parts.push(br());
    });
    parts.push(br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildHoFocus(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('『 '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' 』'), blank()];
    addGMs(parts, data, { sep: ' ' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), br());
    addPlayers(parts, data, 'dash');
    parts.push(blank(), fixed('-　'), part(TARGET_TYPES.END, data.result), fixed('　-'), blank(), part(TARGET_TYPES.DATE, data.date), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildKpcPair(data) {
    const gm = data.gms[0] || { name: 'KPC名 | KP名' };
    const player = data.players[0] || { pc: '探索者A', pl: 'PL名A', slot: 'PC/PL' };
    const parts = [
      part(TARGET_TYPES.SYSTEM, data.system), br(),
      fixed('【 '), part(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), fixed(' 】'), blank(),
      fixed('| '), part(TARGET_TYPES.ROLE, 'ᴋᴘᴄ・ᴋᴘ'), br(),
      fixed('  '), part(TARGET_TYPES.GM_NAME, normalizeKpcName(gm.name)), br(),
      fixed('| '), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'ᴘᴄ・ᴘʟ')), br(),
      fixed('  ')
    ];
    addPlayerNamePair(parts, player, ' | ');
    parts.push(blank(), part(TARGET_TYPES.DATE, data.date), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildEmoklore(data) {
    const parts = [fixed('✧\n   '), part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('     「 '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' 」'), br(), fixed(' 　　    Date. '), part(TARGET_TYPES.DATE, data.date), blank()];
    addGMs(parts, data, { sep: ' ' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PcᐟPL')), br());
    addPlayers(parts, data, 'arrow');
    parts.push(blank(), fixed('✧ '), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildWideTitle(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('◤　'), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('　◢'), blank()];
    addGMs(parts, data, { sep: '：' });
    parts.push(blank(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PL/PC')), br());
    addPlayers(parts, data, 'classic');
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.DATE, data.date), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildZigzag(data) {
    const border = '◢◤◢◤◢◤◢◤◢◤◢';
    const parts = [fixed(border), br(), fixed('　'), part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　　　'), part(TARGET_TYPES.SCENARIO, data.scenario), blank(), fixed(border), br()];
    addGMs(parts, data, { sep: ' ' });
    parts.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), br());
    data.players.forEach(player => {
      parts.push(part(TARGET_TYPES.SLOT, playerLabel(player) || 'PC'), br(), fixed('  - '));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
    parts.push(blank(), fixed('- '), part(TARGET_TYPES.END, data.result), fixed(' -'), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildCornerFrame(data) {
    const parts = [fixed('◤￣￣￣￣￣￣￣￣￣\n '), part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('        '), part(TARGET_TYPES.SCENARIO, data.scenario), blank(), fixed('＿＿＿＿＿＿＿＿＿◢\n')];
    addGMs(parts, data);
    parts.push(blank(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), br());
    data.players.forEach(player => {
      parts.push(fixed(' '));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildTriangleHeading(data) {
    const parts = [fixed('▸ '), part(TARGET_TYPES.SYSTEM, data.system), blank(), fixed('- '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' -'), blank()];
    data.gms.forEach(gm => parts.push(fixed('▸ '), part(TARGET_TYPES.ROLE, gm.role), fixed(': '), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    if (data.players.length) {
      const [first, ...rest] = data.players;
      parts.push(fixed('▸ '), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'PC/PL')), fixed(': ')); addPlayerNamePair(parts, first, ' / '); parts.push(br());
      rest.forEach(player => {
        parts.push(fixed('               '));
        addPlayerNamePair(parts, player, ' / ');
        parts.push(br());
      });
    }
    parts.push(blank(), fixed('▸ '), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildScenarioClear(data) {
    const parts = [fixed('⧉ '), part(TARGET_TYPES.SYSTEM, 'ᴄᴏᴄ 𝟨ᴛʜ'), br(), fixed('.　　'), part(TARGET_TYPES.SCENARIO, data.scenario), br()];
    if (data.author) parts.push(fixed('.　　　　'), part(TARGET_TYPES.AUTHOR, data.author), br());
    parts.push(br());
    data.gms.forEach(gm => parts.push(fixed('｜'), part(TARGET_TYPES.ROLE, smallRole(gm.role)), br(), fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), blank()));
    parts.push(fixed('｜'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, 'ᴘᴄ・ᴘʟ')), br());
    data.players.forEach(player => {
      parts.push(fixed('　'));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
    parts.push(blank(), fixed('　- '), part(TARGET_TYPES.END, 'ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ'), fixed(' -'), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildHandwrittenTitle(data) {
    const border = '┈┈┈┈┈┈┈┈┈';
    const parts = [part(TARGET_TYPES.SYSTEM, '𝐜𝐚𝐥𝐥 𝐨𝐟 𝐜𝐭𝐡𝐮𝐥𝐡𝐮'), br(), fixed('⌜ '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed(' ⌟'), br(), fixed(border), br(), fixed('✧'), part(TARGET_TYPES.ROLE, '𝐊𝐏'), br()];
    data.gms.forEach(gm => parts.push(fixed('  ▹'), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    parts.push(blank(), fixed('✧'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, '𝐏𝐋')), br());
    data.players.forEach(player => {
      parts.push(fixed('  ▹'), part(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), fixed(' '), part(TARGET_TYPES.HO, player.ho || 'HO name'), fixed('   '));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
    parts.push(blank(), fixed('✧'), part(TARGET_TYPES.END, '𝐄𝐍𝐃 ' + (data.result || 'title')), br(), fixed(border + 'ᝰ✍︎ ꙳⋆'), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildDoubleLine(data) {
    const border = '══════════════';
    const parts = [fixed(border), br(), fixed('   '), part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　'), part(TARGET_TYPES.SCENARIO, data.scenario), br(), fixed(border), blank()];
    data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, smallRole(gm.role)), fixed('：'), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    addPlayers(parts, data, 'split-ho');
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.DATE, data.date), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  function buildRibbonTitle(data) {
    const parts = [part(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　‧₊˚ ୨  '), part(TARGET_TYPES.SCENARIO, data.scenario), fixed('  ୧ ˚₊'), blank(), part(TARGET_TYPES.ROLE, '𝗞𝗣'), fixed('…'), br()];
    data.gms.forEach(gm => parts.push(fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), br()));
    parts.push(blank(), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeader(data, '𝗣𝗖/𝗣𝗟')), fixed('…'), br());
    data.players.forEach(player => {
      parts.push(fixed('　'));
      addPlayerNamePair(parts, player, ' / ');
      parts.push(br());
    });
    parts.push(blank(), part(TARGET_TYPES.END, data.result), br(), part(TARGET_TYPES.HASHTAG, data.hashtags));
    return normalizeParts(parts);
  }

  const REPORT_STYLES = [
    { id: 'classic', label: 'クラシック：標準・読みやすい', styleTargets: COMMON_STYLE_TARGETS, build: buildClassic },
    { id: 'minimal', label: 'ミニマル：短文シンプル', styleTargets: COMMON_STYLE_TARGETS, build: buildMinimal },
    { id: 'frame', label: '✦フレーム：✦ ┈┈┈┈┈┈ ✦', styleTargets: COMMON_STYLE_TARGETS, build: buildFrame },
    { id: 'asterisk-frame', label: '✼フレーム：✼••┈┈••✼••┈┈••✼', styleTargets: COMMON_STYLE_TARGETS, build: buildAsteriskFrame },
    { id: 'fancy', label: '⟡フレーム：⟡.·*.·····················⟡.·*.', styleTargets: COMMON_STYLE_TARGETS, build: buildFancy },
    { id: 'block', label: '▮ ブロック：▮ システム名 ▮', styleTargets: COMMON_STYLE_TARGETS, build: buildBlock },
    { id: 'ho-focus', label: 'HO一覧スタイル：HO一覧重視', styleTargets: COMMON_STYLE_TARGETS, build: buildHoFocus },
    { id: 'kpc-pair', label: 'KPCタイマン：| ᴋᴘᴄ・ᴋᴘ ＆ | ᴘᴄ・ᴘʟ', styleTargets: COMMON_STYLE_TARGETS, build: buildKpcPair },
    { id: 'emoklore', label: '✧上下囲み：✧　　　　　　　　✧', styleTargets: COMMON_STYLE_TARGETS, build: buildEmoklore },
    { id: 'wide-title', label: '◤ シナリオ名 ◢ ɢᴍ: ᴘʟ/ᴘᴄ', styleTargets: COMMON_STYLE_TARGETS, build: buildWideTitle },
    { id: 'zigzag', label: '◢◤◢ シナリオ名 ◢◤◢', styleTargets: COMMON_STYLE_TARGETS, build: buildZigzag },
    { id: 'corner-frame', label: '◤￣￣￣ title ＿＿＿◢', styleTargets: COMMON_STYLE_TARGETS, build: buildCornerFrame },
    { id: 'triangle-heading', label: '▸ system ▸ ɢᴍ: ▸ ᴘᴄ/ᴘʟ:', styleTargets: COMMON_STYLE_TARGETS, build: buildTriangleHeading },
    { id: 'scenario-clear', label: '⧉ system |ɢᴍ |ᴘᴄ・ᴘʟ', styleTargets: COMMON_STYLE_TARGETS, build: buildScenarioClear },
    { id: 'handwritten-title', label: '⌜ TITLE ⌟ / ✧𝐊𝐏・✧𝐏𝐋', styleTargets: COMMON_STYLE_TARGETS, build: buildHandwrittenTitle },
    { id: 'double-line', label: '════════ / ᴋᴘ・ʜᴏ', styleTargets: COMMON_STYLE_TARGETS, build: buildDoubleLine },
    { id: 'ribbon-title', label: '‧₊˚ ୨ Title ୧ ˚₊ 𝗞𝗣…𝗣𝗖/𝗣𝗟…', styleTargets: COMMON_STYLE_TARGETS, build: buildRibbonTitle }
  ];

  const ASCII_ART_COLLECTION = {
    line: {
      label: 'LINE',
      items: [
        { label: '✦ line', value: '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦' },
        { label: '⟡ line', value: '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·' },
        { label: 'plain line', value: '──────────────────' },
        { label: '─ ⋅ ✩ ⋅ ─ line', value: '──────── ⋅ ✩ ⋅ ────────' },
        { label: '꒰ঌ line ໒꒱', display: 'wing line', tooltip: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱', value: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱' },
        { label: '◇ line', display: '◇ line', tooltip: '◇─◇──◇────◇──◇─◇', value: '◇─◇──◇────◇──◇─◇' },
        { label: '◆◇ line', display: '◆◇ line', tooltip: '◆◇◆◇◆◇◆◇◆◇◆◇◆', value: '◆◇◆◇◆◇◆◇◆◇◆◇◆' },
        { label: '◈ line', value: '◈ ━━━━━━━━━━━━━━ ◈' },
        { label: '▣ line', display: 'square line', tooltip: '▣──────────────▣', value: '▣──────────────▣' },
        { label: '╋ line', display: 'cross line', tooltip: '╋━━━━━━━━━━━━━━╋', value: '╋━━━━━━━━━━━━━━╋' }
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
        { label: '｡:+* ﾟ', display: 'star dust', tooltip: '｡:+* ﾟ ゜ﾟ *+:｡:+* ﾟ ゜ﾟ *+:｡', value: '｡:+* ﾟ ゜ﾟ *+:｡:+* ﾟ ゜ﾟ *+:｡' },
        { label: '✧･ﾟ:*', display: 'glitter', tooltip: '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧', value: '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧' },
        { label: '✦⋆˙₊⟡', display: 'sparkle', tooltip: '✦⋆˙₊⟡', value: '✦⋆˙₊⟡' },
        { label: '⊹₊⋆ ✦. ݁', display: 'stardust', tooltip: '⊹₊⋆ ✦. ݁', value: '⊹₊⋆ ✦. ݁' },
        { label: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', display: 'Call of Cthulhu', tooltip: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', value: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ' },
        { label: '◤￣￣', value: '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣' },
        { label: '＿＿◢', value: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢' },
        { label: '𓂃𓈒𓏸', display: 'trail', tooltip: '𓂃𓈒𓏸︎︎︎︎ 🕊', value: '𓂃𓈒𓏸︎︎︎︎ 🕊' }
      ]
    }
  };

  function getStyle(id) {
    return REPORT_STYLES.find(style => style.id === id) || REPORT_STYLES[0];
  }

  function renderParts(data, styleTextFn) {
    const style = getStyle(data.style);
    const targets = new Set(style.styleTargets || []);
    const parts = normalizeParts(style.build(data));
    return parts
      .map(current => targets.has(current.type) ? styleTextFn(current.value, data.fontVariant) : current.value)
      .join('')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  window.ReportTemplate = {
    TARGET_TYPES,
    COMMON_STYLE_TARGETS,
    NAME_TYPES,
    REPORT_STYLES,
    ASCII_ART_COLLECTION,
    getStyle,
    renderParts
  };
})();
