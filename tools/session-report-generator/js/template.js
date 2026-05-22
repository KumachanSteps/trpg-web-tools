(() => {
  const TARGET_TYPES = Object.freeze({
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
    HASHTAG: 'hashtag',
    FIXED: 'fixed'
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

  const NEVER_STYLE_NAME_TARGETS = [
    TARGET_TYPES.GM_NAME,
    TARGET_TYPES.PC_NAME,
    TARGET_TYPES.PL_NAME
  ];

  const p = (type, value = '') => ({ type, value: value ?? '' });
  const fixed = value => p(TARGET_TYPES.FIXED, value);
  const br = () => fixed('\n');
  const blank = () => fixed('\n\n');

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
    const parts = text.replaceAll('｜', '/').replaceAll('|', '/').split('/').map(x => x.trim()).filter(Boolean);
    return parts.length > 1 ? parts.join(' | ') : text;
  }

  function labelOf(player) {
    const slot = player.slot === '自由' ? '' : player.slot;
    return slot && player.ho ? `${slot} ${player.ho}` : slot;
  }

  function splitSlotAndHo(player) {
    const slot = player.slot === '自由' ? '' : player.slot;
    return { slot, ho: player.ho || '' };
  }

  function addGms(parts, data, options = {}) {
    const sep = options.sep ?? ': ';
    const roleTransform = options.roleTransform || (role => role);
    const prefix = options.prefix || '';
    const suffix = options.suffix || '';
    data.gms.forEach(gm => {
      parts.push(fixed(prefix));
      parts.push(p(TARGET_TYPES.ROLE, roleTransform(gm.role)));
      parts.push(fixed(sep));
      parts.push(p(TARGET_TYPES.GM_NAME, gm.name));
      parts.push(fixed(suffix));
      parts.push(br());
    });
  }

  function addPlayers(parts, data, mode = 'classic') {
    data.players.forEach(player => {
      const { slot, ho } = splitSlotAndHo(player);
      const label = labelOf(player);

      if (mode === 'pipe') {
        if (slot) parts.push(p(TARGET_TYPES.SLOT, slot), fixed(ho ? ' ' : ''));
        if (ho) parts.push(p(TARGET_TYPES.HO, ho), fixed(' '));
        parts.push(p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' | '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        return;
      }

      if (mode === 'plain') {
        parts.push(p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        return;
      }

      if (mode === 'arrow') {
        parts.push(fixed('┗ '));
        if (slot) parts.push(p(TARGET_TYPES.SLOT, slot), fixed(ho ? ' ' : ''));
        if (ho) parts.push(p(TARGET_TYPES.HO, ho), fixed(' '));
        parts.push(p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' | '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        return;
      }

      if (mode === 'dash') {
        parts.push(p(TARGET_TYPES.SLOT, label || 'PC'), br(), fixed('　　- '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        return;
      }

      if (slot) parts.push(p(TARGET_TYPES.SLOT, slot));
      if (ho) parts.push(fixed(' '), p(TARGET_TYPES.HO, ho));
      if (slot || ho) parts.push(fixed(': '));
      parts.push(p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
    });
  }

  function lineJoinParts(parts) {
    return parts;
  }

  function renderParts(parts, styleTargets, styleText) {
    const targets = new Set(styleTargets || []);
    return parts.map(part => {
      const value = String(part.value ?? '');
      return targets.has(part.type) ? styleText(value) : value;
    }).join('').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  const REPORT_STYLES = [
    {
      id: 'classic',
      label: 'クラシック：標準・読みやすい',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [
          p(TARGET_TYPES.SYSTEM, data.system),
          br(),
          fixed('「'),
          p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'),
          fixed('」'),
          blank()
        ];
        addGms(parts, data);
        parts.push(blank(), p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), br());
        addPlayers(parts, data, 'classic');
        parts.push(blank(), p(TARGET_TYPES.END, data.result), blank(), p(TARGET_TYPES.DATE, data.date), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'minimal',
      label: 'ミニマル：短文シンプル',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('『'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('』'), blank()];
        addGms(parts, data, { sep: '：' });
        addPlayers(parts, data, 'classic');
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'frame',
      label: '✦フレーム：✦ ┈┈┈┈┈┈ ✦',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n      '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('   　　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), blank()];
        addGms(parts, data, { sep: '┊', prefix: '  　', roleTransform: smallRole });
        parts.push(fixed('  　'), p(TARGET_TYPES.PARTICIPANT_HEADER, 'ᴘᴄ┊ᴘʟ'), br());
        data.players.forEach(player => {
          parts.push(fixed('  　'));
          addPlayers(parts, { players: [player] }, 'pipe');
        });
        parts.push(p(TARGET_TYPES.END, data.result ? `  　── ${data.result} ──` : ''), br(), fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦'), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'asterisk-frame',
      label: '✼フレーム：✼••┈┈••✼••┈┈••✼',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '✼••┈┈••✼••┈┈••✼';
        const parts = [fixed(border + '\n    '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), br(), fixed(border), br()];
        addGms(parts, data);
        parts.push(blank(), p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), br());
        addPlayers(parts, data, 'classic');
        parts.push(blank(), p(TARGET_TYPES.END, data.result || 'END'), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'fancy',
      label: '⟡フレーム：⟡.·*.·····················⟡.·*.',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('⟡.·*.····························⟡.·*.\n '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　     ◤ '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' ◢'), blank()];
        addGms(parts, data, { sep: ' ', prefix: ' ' });
        data.players.forEach(player => {
          parts.push(fixed(' '), p(TARGET_TYPES.SLOT, boldLabel(labelOf(player) || 'PC')), br(), fixed(' ┗ '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' | '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        });
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'block',
      label: '▮ ブロック：▮ システム名 ▮',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('▮     '), p(TARGET_TYPES.SYSTEM, data.system), fixed('     ▮'), blank(), fixed('  『  '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('  』'), blank()];
        addGms(parts, data, { sep: ' ', roleTransform: smallRole });
        parts.push(p(TARGET_TYPES.PARTICIPANT_HEADER, 'ᴘʟᴘᴄ'), br());
        data.players.forEach(player => {
          parts.push(fixed('   '));
          addPlayers(parts, { players: [player] }, 'pipe');
        });
        parts.push(p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'ho-focus',
      label: 'HO一覧スタイル：HO一覧重視',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('『 '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' 』'), blank()];
        addGms(parts, data, { sep: ' ' });
        parts.push(p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), br());
        addPlayers(parts, data, 'dash');
        parts.push(blank(), p(TARGET_TYPES.END, data.result ? '-　' + data.result + '　-' : ''), blank(), p(TARGET_TYPES.DATE, data.date), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'kpc-pair',
      label: 'KPCタイマン：| ᴋᴘᴄ・ᴋᴘ ＆ | ᴘᴄ・ᴘʟ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const gm = data.gms[0];
        const player = data.players[0];
        return [
          p(TARGET_TYPES.SYSTEM, data.system), br(),
          fixed('【 '), p(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), fixed(' 】'), blank(),
          fixed('| '), p(TARGET_TYPES.ROLE, 'ᴋᴘᴄ・ᴋᴘ'), br(),
          fixed('  '), p(TARGET_TYPES.GM_NAME, normalizeKpcName(gm ? gm.name : 'KPC名 | KP名')), br(),
          fixed('| '), p(TARGET_TYPES.PARTICIPANT_HEADER, 'ᴘᴄ・ᴘʟ'), br(),
          fixed('  '), p(TARGET_TYPES.PC_NAME, player ? player.pc || '探索者A' : '探索者A'), fixed(' | '), p(TARGET_TYPES.PL_NAME, player ? player.pl || 'PL名A' : 'PL名A'), blank(),
          p(TARGET_TYPES.DATE, data.date), br(),
          p(TARGET_TYPES.HASHTAG, data.hashtags)
        ];
      }
    },
    {
      id: 'emoklore',
      label: '✧上下囲み：✧　　　　　　　　✧',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('✧\n   '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('     「 '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' 」'), br()];
        if (data.date) parts.push(fixed(' 　　    Date. '), p(TARGET_TYPES.DATE, data.date), br());
        parts.push(blank());
        addGms(parts, data, { sep: ' ' });
        parts.push(p(TARGET_TYPES.PARTICIPANT_HEADER, 'PcᐟPL'), br());
        addPlayers(parts, data, 'arrow');
        parts.push(blank(), p(TARGET_TYPES.END, data.result ? '✧ ' + data.result : ''), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'wide-title',
      label: '◤ シナリオ名 ◢ ɢᴍ: ᴘʟ/ᴘᴄ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('◤　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('　◢'), blank()];
        addGms(parts, data, { sep: '：' });
        parts.push(blank(), p(TARGET_TYPES.PARTICIPANT_HEADER, 'PL/PC'), br());
        addPlayers(parts, data, 'classic');
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.DATE, data.date), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'zigzag',
      label: '◢◤◢ シナリオ名 ◢◤◢',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '◢◤◢◤◢◤◢◤◢◤◢';
        const parts = [fixed(border + '\n　'), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　　　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), blank(), fixed(border), br()];
        addGms(parts, data, { sep: ' ' });
        parts.push(p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), br());
        data.players.forEach(player => {
          parts.push(p(TARGET_TYPES.SLOT, labelOf(player) || 'PC'), br(), fixed('  - '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        });
        parts.push(blank(), p(TARGET_TYPES.END, data.result ? '- ' + data.result + ' -' : ''), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'corner-frame',
      label: '◤￣￣￣ title ＿＿＿◢',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('◤￣￣￣￣￣￣￣￣￣\n '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('        '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), blank(), fixed('＿＿＿＿＿＿＿＿＿◢'), br()];
        addGms(parts, data);
        parts.push(blank(), p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), br());
        data.players.forEach(player => {
          parts.push(fixed(' '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
        });
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'triangle-heading',
      label: '▸ system ▸ ɢᴍ: ▸ ᴘᴄ/ᴘʟ:',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('▸ '), p(TARGET_TYPES.SYSTEM, data.system), blank(), fixed('- '), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' -'), blank()];
        data.gms.forEach(gm => {
          parts.push(fixed('▸ '), p(TARGET_TYPES.ROLE, gm.role), fixed(': '), p(TARGET_TYPES.GM_NAME, gm.name), br());
        });
        if (data.players.length) {
          const first = data.players[0];
          parts.push(fixed('▸ '), p(TARGET_TYPES.PARTICIPANT_HEADER, 'PC/PL'), fixed(': '), p(TARGET_TYPES.PC_NAME, first.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, first.pl || 'PL未入力'), br());
          data.players.slice(1).forEach(player => {
            parts.push(fixed('               '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), br());
          });
        }
        parts.push(blank(), fixed('▸ '), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'scenario-clear',
      label: '⧉ system |ɢᴍ |ᴘᴄ・ᴘʟ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('⧉ '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('.　　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'Title'), br()];
        if (data.author) parts.push(fixed('.　　　　'), p(TARGET_TYPES.AUTHOR, data.author), br());
        parts.push(br());
        data.gms.forEach(gm => {
          parts.push(fixed('｜'), p(TARGET_TYPES.ROLE, smallRole(gm.role)), br(), fixed('　'), p(TARGET_TYPES.GM_NAME, gm.name), blank());
        });
        parts.push(fixed('｜'), p(TARGET_TYPES.PARTICIPANT_HEADER, 'ᴘᴄ・ᴘʟ'), br());
        data.players.forEach(player => {
          parts.push(fixed('　'), p(TARGET_TYPES.PC_NAME, player.pc || 'Tansakusha'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL name'), br());
        });
        parts.push(blank(), p(TARGET_TYPES.END, '　- ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ -'), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'handwritten-title',
      label: '⌜ TITLE ⌟ / ✧𝐊𝐏・✧𝐏𝐋',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '┈┈┈┈┈┈┈┈┈';
        const parts = [p(TARGET_TYPES.SYSTEM, '𝐜𝐚𝐥𝐥 𝐨𝐟 𝐜𝐭𝐡𝐮𝐥𝐡𝐮'), br(), fixed('⌜ '), p(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), fixed(' ⌟'), br(), fixed(border), br(), fixed('✧'), p(TARGET_TYPES.ROLE, '𝐊𝐏'), br()];
        data.gms.forEach(gm => parts.push(fixed('  ▹'), p(TARGET_TYPES.GM_NAME, gm.name), br()));
        parts.push(blank(), fixed('✧'), p(TARGET_TYPES.PARTICIPANT_HEADER, '𝐏𝐋'), br());
        data.players.forEach(player => {
          parts.push(fixed('  ▹'), p(TARGET_TYPES.SLOT, boldLabel(labelOf(player) || 'PC')), fixed(' '), p(TARGET_TYPES.HO, player.ho || 'HO name'), fixed('   '), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), br());
        });
        parts.push(blank(), fixed('✧'), p(TARGET_TYPES.END, '𝐄𝐍𝐃 ' + (data.result || 'title')), br(), fixed(border + 'ᝰ✍︎ ꙳⋆'), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'double-line',
      label: '════════ / ᴋᴘ・ʜᴏ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '══════════════';
        const parts = [fixed(border), br(), fixed('   '), p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), br(), fixed(border), blank()];
        addGms(parts, data, { sep: '：', roleTransform: smallRole });
        data.players.forEach(player => {
          parts.push(p(TARGET_TYPES.SLOT, (labelOf(player) || 'ʜᴏ').toLowerCase()), fixed(' '), p(TARGET_TYPES.HO, player.ho || 'HO name'), br(), fixed('　　 '), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), br());
        });
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.DATE, data.date), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    },
    {
      id: 'ribbon-title',
      label: '‧₊˚ ୨ Title ୧ ˚₊ 𝗞𝗣…𝗣𝗖/𝗣𝗟…',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), br(), fixed('　‧₊˚ ୨  '), p(TARGET_TYPES.SCENARIO, data.scenario || 'title'), fixed('  ୧ ˚₊'), blank(), p(TARGET_TYPES.ROLE, '𝗞𝗣'), fixed('…'), br()];
        data.gms.forEach(gm => parts.push(fixed('　'), p(TARGET_TYPES.GM_NAME, gm.name), br()));
        parts.push(blank(), p(TARGET_TYPES.PARTICIPANT_HEADER, '𝗣𝗖/𝗣𝗟'), fixed('…'), br());
        data.players.forEach(player => parts.push(fixed('　'), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), br()));
        parts.push(blank(), p(TARGET_TYPES.END, data.result), br(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoinParts(parts);
      }
    }
  ];

  const ASCII_ART_COLLECTION = {
    line: {
      label: 'LINE',
      items: [
        { label: '✦ line', value: '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦' },
        { label: '⟡ line', value: '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·' },
        { label: 'plain line', value: '──────────────────' },
        { label: '─ ⋅ ✩ ⋅ ─ line', value: '──────── ⋅ ✩ ⋅ ────────' },
        { label: '꒰ঌ line ໒꒱', value: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱' },
        { label: '◈ line', value: '◈ ━━━━━━━━━━━━━━ ◈' },
        { label: '╋ line', value: '╋━━━━━━━━━━━━━━╋' }
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
        { label: '｡:+* ﾟ', value: '｡:+* ﾟ ゜ﾟ *+:｡:+* ﾟ ゜ﾟ *+:｡' },
        { label: '✧･ﾟ:*', value: '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧' },
        { label: '✦⋆˙₊⟡', value: '✦⋆˙₊⟡' },
        { label: '⊹₊⋆ ✦. ݁', value: '⊹₊⋆ ✦. ݁' },
        { label: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', value: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ' },
        { label: '◤￣￣', value: '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣' },
        { label: '＿＿◢', value: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢' },
        { label: '𓂃𓈒𓏸', value: '𓂃𓈒𓏸︎︎︎︎ 🕊' }
      ]
    }
  };

  function render(data, styleText) {
    const style = REPORT_STYLES.find(item => item.id === data.style) || REPORT_STYLES[0];
    const parts = style.build(data);
    return renderParts(parts, style.styleTargets, styleText || (value => value));
  }

  window.ReportTemplate = {
    TARGET_TYPES,
    COMMON_STYLE_TARGETS,
    NEVER_STYLE_NAME_TARGETS,
    REPORT_STYLES,
    ASCII_ART_COLLECTION,
    render
  };
})();
