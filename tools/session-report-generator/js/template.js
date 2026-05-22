(() => {
  const TARGET_TYPES = Object.freeze({
    SYSTEM: 'system',
    ROLE: 'role',
    GM_NAME: 'gmName',
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
    TARGET_TYPES.GM_NAME,
    TARGET_TYPES.SLOT,
    TARGET_TYPES.HO,
    TARGET_TYPES.PC_NAME,
    TARGET_TYPES.PL_NAME,
    TARGET_TYPES.END,
    TARGET_TYPES.DATE
  ];

  const ASCII_ART_COLLECTION = {
    line: {
      label: 'LINE',
      items: [
        { label: '✦ line', value: '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦' },
        { label: '⟡ line', value: '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·' },
        { label: '✤ line', value: '✤─────✤─────✤' },
        { label: '○● line', value: '○●————————————————-●○' },
        { label: 'plain line', value: '──────────────────' },
        { label: '─ ⋅ ✩ ⋅ ─ line', value: '──────── ⋅ ✩ ⋅ ────────' },
        { label: '꒰ঌ line ໒꒱', value: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱' },
        { label: '⋆⸜ line ⸝⋆', value: '⋆⸜ ┈┈┈┈┈┈┈┈ ⸝⋆' },
        { label: '◇ line', value: '◇─◇──◇────◇──◇─◇' },
        { label: '◆◇ line', value: '◆◇◆◇◆◇◆◇◆◇◆◇◆' },
        { label: '◈ line', value: '◈ ━━━━━━━━━━━━━━ ◈' },
        { label: '▣ line', value: '▣──────────────▣' },
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
        { label: '✦⋆｡˚', value: '✦⋆｡˚ ⋆｡˚ ✦ ⋆｡˚ ⋆｡˚✦' },
        { label: '𓂃𓈒𓏸', value: '𓂃𓈒𓏸︎︎︎︎ 🕊' },
        { label: '✦⋆˙₊⟡', value: '✦⋆˙₊⟡' },
        { label: '⊹₊⋆ ✦. ݁', value: '⊹₊⋆ ✦. ݁' },
        { label: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', value: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ' },
        { label: '◤￣￣', value: '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣' },
        { label: '＿＿◢', value: '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢' }
      ]
    }
  };

  function p(type, value) {
    return { type, value: value == null ? '' : String(value) };
  }

  function lineBreak() { return p(TARGET_TYPES.FIXED, '\n'); }
  function blankLine() { return p(TARGET_TYPES.FIXED, '\n\n'); }
  function text(value) { return p(TARGET_TYPES.FIXED, value); }
  function lineJoin(parts) {
    return parts;
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
    const textValue = String(name || '').trim();
    if (!textValue || textValue === 'KP名') return 'KPC名 | KP名';
    const parts = textValue.replaceAll('｜', '/').replaceAll('|', '/').split('/').map(x => x.trim()).filter(Boolean);
    return parts.length > 1 ? parts.join(' | ') : textValue;
  }

  function playerLabel(player) {
    const slot = player.slot === '自由' ? '' : player.slot;
    return slot && player.ho ? `${slot} ${player.ho}` : slot;
  }

  function playerParts(player, mode = 'classic') {
    const label = playerLabel(player);
    const pc = player.pc || 'PC未入力';
    const pl = player.pl || 'PL未入力';
    const parts = [];

    if (mode === 'plain') {
      parts.push(p(TARGET_TYPES.PC_NAME, pc), text(' / '), p(TARGET_TYPES.PL_NAME, pl));
      return parts;
    }
    if (mode === 'pipe') {
      if (label) parts.push(p(TARGET_TYPES.SLOT, label), text(' '));
      parts.push(p(TARGET_TYPES.PC_NAME, pc), text(' | '), p(TARGET_TYPES.PL_NAME, pl));
      return parts;
    }
    if (mode === 'arrow') {
      parts.push(text('┗ '));
      if (label) parts.push(p(TARGET_TYPES.SLOT, label), text(' '));
      parts.push(p(TARGET_TYPES.PC_NAME, pc), text(' | '), p(TARGET_TYPES.PL_NAME, pl));
      return parts;
    }
    if (mode === 'dash') {
      parts.push(p(TARGET_TYPES.SLOT, label || 'PC'), text('\n　　- '), p(TARGET_TYPES.PC_NAME, pc), text(' / '), p(TARGET_TYPES.PL_NAME, pl));
      return parts;
    }

    if (label) parts.push(p(TARGET_TYPES.SLOT, label), text(': '));
    parts.push(p(TARGET_TYPES.PC_NAME, pc), text(' / '), p(TARGET_TYPES.PL_NAME, pl));
    return parts;
  }

  function addPlayers(parts, data, mode = 'classic', prefix = '') {
    data.players.forEach(player => {
      if (prefix) parts.push(text(prefix));
      parts.push(...playerParts(player, mode), lineBreak());
    });
  }

  function addGMs(parts, data, mode = 'colon', prefix = '') {
    data.gms.forEach(gm => {
      if (prefix) parts.push(text(prefix));
      const roleValue = mode === 'small' ? smallRole(gm.role) : gm.role;
      parts.push(p(TARGET_TYPES.ROLE, roleValue));
      parts.push(text(mode === 'space' ? ' ' : mode === 'pipe' ? '┊' : mode === 'jpcolon' ? '：' : ': '));
      parts.push(p(TARGET_TYPES.GM_NAME, gm.name), lineBreak());
    });
  }

  const REPORT_STYLES = [
    {
      id: 'classic',
      label: 'クラシック：標準・読みやすい',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), lineBreak(), text('「'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), text('」'), blankLine()];
        addGMs(parts, data);
        parts.push(blankLine(), text('PC/PL'), lineBreak());
        addPlayers(parts, data, 'classic');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), blankLine(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'minimal',
      label: 'ミニマル：短文シンプル',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), lineBreak(), text('『'), p(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), text('』'), blankLine()];
        addGMs(parts, data, 'jpcolon');
        addPlayers(parts, data, 'classic');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'frame',
      label: '✦フレーム：✦ ┈┈┈┈┈┈ ✦',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n      '), p(TARGET_TYPES.SYSTEM, data.system), text('\n   　　'), p(TARGET_TYPES.SCENARIO, data.scenario), blankLine()];
        addGMs(parts, data, 'small', '  　');
        parts.push(text('  　ᴘᴄ┊ᴘʟ\n'));
        addPlayers(parts, data, 'pipe', '  　');
        parts.push(p(TARGET_TYPES.END, data.result ? '  　── ' + data.result + ' ──' : ''), lineBreak(), text('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦'), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'asterisk-frame',
      label: '✼フレーム：✼••┈┈••✼••┈┈••✼',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '✼••┈┈••✼••┈┈••✼';
        const parts = [text(border + '\n    '), p(TARGET_TYPES.SYSTEM, data.system), text('\n　'), p(TARGET_TYPES.SCENARIO, data.scenario), text('\n' + border + '\n')];
        addGMs(parts, data);
        parts.push(blankLine(), text('PC/PL\n'));
        addPlayers(parts, data, 'classic');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result || 'END'), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'fancy',
      label: '⟡フレーム：⟡.·*.·····················⟡.·*.',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('⟡.·*.····························⟡.·*.\n '), p(TARGET_TYPES.SYSTEM, data.system), text('\n　     ◤ '), p(TARGET_TYPES.SCENARIO, data.scenario), text(' ◢\n\n')];
        data.gms.forEach(gm => parts.push(text(' '), p(TARGET_TYPES.ROLE, gm.role), text(' '), p(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
        data.players.forEach(player => {
          parts.push(text(' '), p(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), lineBreak(), text(' ┗ '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), text(' | '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), lineBreak());
        });
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'block',
      label: '▮ ブロック：▮ システム名 ▮',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('▮     '), p(TARGET_TYPES.SYSTEM, data.system), text('     ▮\n\n  『  '), p(TARGET_TYPES.SCENARIO, data.scenario), text('  』\n\n')];
        addGMs(parts, data, 'small');
        parts.push(text('ᴘʟᴘᴄ\n'));
        addPlayers(parts, data, 'pipe', '   ');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'ho-focus',
      label: 'HO一覧スタイル：HO一覧重視',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), lineBreak(), text('『 '), p(TARGET_TYPES.SCENARIO, data.scenario), text(' 』'), blankLine()];
        addGMs(parts, data, 'space');
        parts.push(text('PC/PL\n'));
        addPlayers(parts, data, 'dash');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result ? '-　' + data.result + '　-' : ''), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'kpc-pair',
      label: 'KPCタイマン：| ᴋᴘᴄ・ᴋᴘ ＆ | ᴘᴄ・ᴘʟ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const gm = data.gms[0];
        const player = data.players[0];
        return lineJoin([p(TARGET_TYPES.SYSTEM, data.system), lineBreak(), text('【 '), p(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), text(' 】\n\n| ᴋᴘᴄ・ᴋᴘ\n  '), p(TARGET_TYPES.GM_NAME, normalizeKpcName(gm ? gm.name : 'KPC名 | KP名')), text('\n| ᴘᴄ・ᴘʟ\n  '), p(TARGET_TYPES.PC_NAME, player ? player.pc : '探索者A'), text(' | '), p(TARGET_TYPES.PL_NAME, player ? player.pl : 'PL名A'), blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags)]);
      }
    },
    {
      id: 'emoklore',
      label: '✧上下囲み：✧　　　　　　　　✧',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('✧\n   '), p(TARGET_TYPES.SYSTEM, data.system), text('\n     「 '), p(TARGET_TYPES.SCENARIO, data.scenario), text(' 」\n'), p(TARGET_TYPES.DATE, data.date ? ' 　　    Date. ' + data.date : ''), blankLine()];
        addGMs(parts, data, 'space');
        parts.push(text('PcᐟPL\n'));
        addPlayers(parts, data, 'arrow');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result ? '✧ ' + data.result : ''), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'wide-title',
      label: '◤ シナリオ名 ◢ ɢᴍ: ᴘʟ/ᴘᴄ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), lineBreak(), text('◤　'), p(TARGET_TYPES.SCENARIO, data.scenario), text('　◢\n\n')];
        addGMs(parts, data, 'jpcolon');
        parts.push(blankLine(), text('PL/PC\n'));
        addPlayers(parts, data, 'classic');
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'zigzag',
      label: '◢◤◢ シナリオ名 ◢◤◢',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '◢◤◢◤◢◤◢◤◢◤◢';
        const parts = [text(border + '\n　'), p(TARGET_TYPES.SYSTEM, data.system), text('\n　　　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), text('\n\n' + border + '\n')];
        addGMs(parts, data, 'space');
        parts.push(text('PC/PL\n'));
        data.players.forEach(player => parts.push(p(TARGET_TYPES.SLOT, playerLabel(player) || 'PC'), lineBreak(), text('  - '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result ? '- ' + data.result + ' -' : ''), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'corner-frame',
      label: '◤￣￣￣ title ＿＿＿◢',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('◤￣￣￣￣￣￣￣￣￣\n '), p(TARGET_TYPES.SYSTEM, data.system), text('\n        '), p(TARGET_TYPES.SCENARIO, data.scenario), text('\n\n＿＿＿＿＿＿＿＿＿◢\n')];
        addGMs(parts, data);
        parts.push(blankLine(), text('PC/PL\n'));
        data.players.forEach(player => parts.push(text(' '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'triangle-heading',
      label: '▸ system ▸ ɢᴍ: ▸ ᴘᴄ/ᴘʟ:',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('▸ '), p(TARGET_TYPES.SYSTEM, data.system), blankLine(), text('- '), p(TARGET_TYPES.SCENARIO, data.scenario), text(' -\n\n')];
        data.gms.forEach(gm => parts.push(text('▸ '), p(TARGET_TYPES.ROLE, gm.role), text(': '), p(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
        if (data.players.length) {
          const first = data.players[0];
          parts.push(text('▸ PC/PL: '), p(TARGET_TYPES.PC_NAME, first.pc || 'PC未入力'), text(' / '), p(TARGET_TYPES.PL_NAME, first.pl || 'PL未入力'), lineBreak());
          data.players.slice(1).forEach(player => parts.push(text('               '), p(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), lineBreak()));
        }
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result ? '▸ ' + data.result : ''), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'scenario-clear',
      label: '⧉ system |ɢᴍ |ᴘᴄ・ᴘʟ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [text('⧉ '), p(TARGET_TYPES.SYSTEM, data.system), text('\n.　　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'Title'), lineBreak(), data.author ? p(TARGET_TYPES.AUTHOR, '.　　　　' + data.author) : text(''), blankLine()];
        data.gms.forEach(gm => parts.push(text('｜'), p(TARGET_TYPES.ROLE, smallRole(gm.role)), lineBreak(), text('　'), p(TARGET_TYPES.GM_NAME, gm.name), blankLine()));
        parts.push(text('｜ᴘᴄ・ᴘʟ\n'));
        data.players.forEach(player => parts.push(text('　'), p(TARGET_TYPES.PC_NAME, player.pc || 'Tansakusha'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL name'), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.END, '　- ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ -'), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'handwritten-title',
      label: '⌜ TITLE ⌟ / ✧𝐊𝐏・✧𝐏𝐋',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '┈┈┈┈┈┈┈┈┈';
        const parts = [p(TARGET_TYPES.SYSTEM, 'call of cthulhu'), lineBreak(), text('⌜ '), p(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), text(' ⌟\n'), text(border + '\n✧'), p(TARGET_TYPES.ROLE, 'KP'), lineBreak()];
        data.gms.forEach(gm => parts.push(text('  ▹'), p(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
        parts.push(blankLine(), text('✧'), p(TARGET_TYPES.ROLE, 'PL'), lineBreak());
        data.players.forEach(player => parts.push(text('  ▹'), p(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), text(' '), p(TARGET_TYPES.HO, player.ho || 'HO name'), text('   '), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), lineBreak()));
        parts.push(blankLine(), text('✧'), p(TARGET_TYPES.END, 'END ' + (data.result || 'title')), lineBreak(), text(border + 'ᝰ✍︎ ꙳⋆'), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'double-line',
      label: '════════ / ᴋᴘ・ʜᴏ',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const border = '══════════════';
        const parts = [text(border + '\n   '), p(TARGET_TYPES.SYSTEM, data.system), text('\n　'), p(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), text('\n' + border + '\n\n')];
        data.gms.forEach(gm => parts.push(p(TARGET_TYPES.ROLE, smallRole(gm.role)), text('：'), p(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
        data.players.forEach(player => parts.push(p(TARGET_TYPES.SLOT, (playerLabel(player) || 'ʜᴏ').toLowerCase()), text(' '), p(TARGET_TYPES.HO, player.ho || 'HO name'), lineBreak(), text('　　 '), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    },
    {
      id: 'ribbon-title',
      label: '‧₊˚ ୨ Title ୧ ˚₊ 𝗞𝗣…𝗣𝗖/𝗣𝗟…',
      styleTargets: COMMON_STYLE_TARGETS,
      build(data) {
        const parts = [p(TARGET_TYPES.SYSTEM, data.system), text('\n　‧₊˚ ୨  '), p(TARGET_TYPES.SCENARIO, data.scenario || 'title'), text('  ୧ ˚₊\n\n'), p(TARGET_TYPES.ROLE, 'KP'), text('…\n')];
        data.gms.forEach(gm => parts.push(text('　'), p(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.ROLE, 'PC/PL'), text('…\n'));
        data.players.forEach(player => parts.push(text('　'), p(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), text(' / '), p(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), lineBreak()));
        parts.push(blankLine(), p(TARGET_TYPES.END, data.result), lineBreak(), p(TARGET_TYPES.DATE, data.date), lineBreak(), p(TARGET_TYPES.HASHTAG, data.hashtags));
        return lineJoin(parts);
      }
    }
  ];

  function cleanOutput(textValue) {
    return String(textValue).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function renderParts(parts, styleTargets, fontVariant, styleText) {
    const targets = new Set(styleTargets || COMMON_STYLE_TARGETS);
    return cleanOutput(parts.map(part => {
      const value = part && part.value != null ? String(part.value) : '';
      if (!value) return '';
      return targets.has(part.type) ? styleText(value, fontVariant) : value;
    }).join(''));
  }

  function getStyle(id) {
    return REPORT_STYLES.find(style => style.id === id) || REPORT_STYLES[0];
  }

  function render(data, fontVariant, styleText) {
    const style = getStyle(data.style);
    return renderParts(style.build(data), style.styleTargets, fontVariant, styleText);
  }

  window.ReportTemplate = {
    TARGET_TYPES,
    COMMON_STYLE_TARGETS,
    REPORT_STYLES,
    ASCII_ART_COLLECTION,
    getStyle,
    render,
    renderParts,
    playerLabel,
    smallRole
  };
})();
