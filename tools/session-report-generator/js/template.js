(function () {
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

  const DEFAULT_STYLE_TARGETS = [
    TARGET_TYPES.SYSTEM,
    TARGET_TYPES.ROLE,
    TARGET_TYPES.SLOT,
    TARGET_TYPES.HO,
    TARGET_TYPES.PC_NAME,
    TARGET_TYPES.PL_NAME,
    TARGET_TYPES.END
  ];

  function part(type, value) {
    return { type, value: value ?? '' };
  }

  function fixed(value) { return part(TARGET_TYPES.FIXED, value); }
  function newline(count = 1) { return fixed('\n'.repeat(count)); }

  function roleSmall(role) {
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

  function playerLabel(player) {
    const slot = player.slot === '自由' ? '' : player.slot;
    return slot && player.ho ? `${slot} ${player.ho}` : slot;
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
    const parts = text.replaceAll('｜', '/').replaceAll('|', '/').split('/').map(v => v.trim()).filter(Boolean);
    return parts.length > 1 ? parts.join(' | ') : text;
  }

  function clean(parts) {
    return parts.filter(p => p && p.value !== undefined && p.value !== null && p.value !== '');
  }

  function appendGms(parts, data, separator = ': ') {
    data.gms.forEach(gm => {
      parts.push(part(TARGET_TYPES.ROLE, gm.role), fixed(separator), part(TARGET_TYPES.GM_NAME, gm.name), newline());
    });
  }

  function appendPlayers(parts, data, mode = 'classic') {
    data.players.forEach(player => {
      const label = playerLabel(player);
      const pc = player.pc || 'PC未入力';
      const pl = player.pl || 'PL未入力';

      if (mode === 'pipe') {
        if (label) parts.push(part(TARGET_TYPES.SLOT, label), fixed(' '));
        parts.push(part(TARGET_TYPES.PC_NAME, pc), fixed(' | '), part(TARGET_TYPES.PL_NAME, pl), newline());
        return;
      }

      if (mode === 'plain') {
        parts.push(part(TARGET_TYPES.PC_NAME, pc), fixed(' / '), part(TARGET_TYPES.PL_NAME, pl), newline());
        return;
      }

      if (mode === 'arrow') {
        parts.push(fixed('┗ '));
        if (label) parts.push(part(TARGET_TYPES.SLOT, label), fixed(' '));
        parts.push(part(TARGET_TYPES.PC_NAME, pc), fixed(' | '), part(TARGET_TYPES.PL_NAME, pl), newline());
        return;
      }

      if (mode === 'dash') {
        parts.push(part(TARGET_TYPES.SLOT, label || 'PC'), newline(), fixed('　　- '), part(TARGET_TYPES.PC_NAME, pc), fixed(' / '), part(TARGET_TYPES.PL_NAME, pl), newline());
        return;
      }

      if (label) parts.push(part(TARGET_TYPES.SLOT, label), fixed(': '));
      parts.push(part(TARGET_TYPES.PC_NAME, pc), fixed(' / '), part(TARGET_TYPES.PL_NAME, pl), newline());
    });
  }

  const REPORT_STYLES = [
    {
      id: 'classic',
      label: 'クラシック：標準・読みやすい',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const parts = [part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('「'), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('」'), newline(2)];
        appendGms(parts, data, ': ');
        parts.push(newline(), fixed('PC/PL'), newline());
        appendPlayers(parts, data);
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.DATE, data.date), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'minimal',
      label: 'ミニマル：短文シンプル',
      styleTargets: [],
      build(data) {
        const parts = [part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('『'), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('』'), newline(2)];
        appendGms(parts, data, '：');
        appendPlayers(parts, data);
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'frame',
      label: '✦フレーム：✦ ┈┈┈┈┈┈ ✦',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.END],
      build(data) {
        const parts = [fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦\n      '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n  　　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), newline(2)];
        data.gms.forEach(gm => parts.push(fixed('  　'), part(TARGET_TYPES.ROLE, roleSmall(gm.role)), fixed('┊'), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(fixed('  　ᴘᴄ┊ᴘʟ'), newline());
        appendPlayers(parts, data, 'pipe');
        if (data.result) parts.push(fixed('  　── '), part(TARGET_TYPES.END, data.result), fixed(' ──'), newline(2));
        parts.push(fixed('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦'), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'asterisk-frame',
      label: '✼フレーム：✼••┈┈••✼••┈┈••✼',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const border = '✼••┈┈••✼••┈┈••✼';
        const parts = [fixed(border + '\n    '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('\n' + border), newline()];
        appendGms(parts, data, ': ');
        parts.push(newline(), fixed('PC/PL'), newline());
        appendPlayers(parts, data);
        parts.push(newline(), part(TARGET_TYPES.END, data.result || 'END'), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'fancy',
      label: '⟡フレーム：⟡.·*.·····················⟡.·*.',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.SLOT, TARGET_TYPES.END],
      build(data) {
        const parts = [fixed('⟡.·*.····························⟡.·*.\n '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n　     ◤ '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' ◢'), newline(2)];
        data.gms.forEach(gm => parts.push(fixed(' '), part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        data.players.forEach(player => parts.push(fixed(' '), part(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), newline(), fixed(' ┗ '), part(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' | '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), newline()));
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'block',
      label: '▮ ブロック：▮ システム名 ▮',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.SLOT],
      build(data) {
        const parts = [fixed('▮     '), part(TARGET_TYPES.SYSTEM, data.system), fixed('     ▮'), newline(2), fixed('  『  '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('  』'), newline(2)];
        data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, roleSmall(gm.role)), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(fixed('ᴘʟᴘᴄ'), newline());
        appendPlayers(parts, data, 'pipe');
        parts.push(part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'ho-focus',
      label: 'HO一覧スタイル：HO一覧重視',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const parts = [part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('『 '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' 』'), newline(2)];
        appendGms(parts, data, ' ');
        parts.push(fixed('PC/PL'), newline());
        appendPlayers(parts, data, 'dash');
        parts.push(newline(), data.result ? fixed('-　') : fixed(''), part(TARGET_TYPES.END, data.result), data.result ? fixed('　-') : fixed(''), newline(), part(TARGET_TYPES.DATE, data.date), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'kpc-pair',
      label: 'KPCタイマン：| ᴋᴘᴄ・ᴋᴘ ＆ | ᴘᴄ・ᴘʟ',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME],
      build(data) {
        const gm = data.gms[0];
        const player = data.players[0];
        return clean([
          part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('【 '), part(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), fixed(' 】'), newline(2),
          fixed('| ᴋᴘᴄ・ᴋᴘ\n  '), part(TARGET_TYPES.GM_NAME, normalizeKpcName(gm ? gm.name : 'KPC名 | KP名')), newline(),
          fixed('| ᴘᴄ・ᴘʟ\n  '), part(TARGET_TYPES.PC_NAME, player ? player.pc || '探索者A' : '探索者A'), fixed(' | '), part(TARGET_TYPES.PL_NAME, player ? player.pl || 'PL名A' : 'PL名A'), newline(2),
          part(TARGET_TYPES.DATE, data.date), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags)
        ]);
      }
    },
    {
      id: 'emoklore',
      label: '✧上下囲み：✧　　　　　　　　✧',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.SLOT, TARGET_TYPES.END],
      build(data) {
        const parts = [fixed('✧\n   '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n     「 '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' 」'), data.date ? fixed('\n 　　    Date. ') : fixed(''), part(TARGET_TYPES.DATE, data.date), newline(2)];
        data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(fixed('PcᐟPL'), newline());
        appendPlayers(parts, data, 'arrow');
        parts.push(newline(), data.result ? fixed('✧ ') : fixed(''), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'wide-title',
      label: '◤ シナリオ名 ◢ ɢᴍ: ᴘʟ/ᴘᴄ',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const parts = [part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('◤　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed('　◢'), newline(2)];
        appendGms(parts, data, '：');
        parts.push(newline(), fixed('PL/PC'), newline());
        appendPlayers(parts, data);
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.DATE, data.date), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'zigzag',
      label: '◢◤◢ シナリオ名 ◢◤◢',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.SLOT, TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME, TARGET_TYPES.END],
      build(data) {
        const border = '◢◤◢◤◢◤◢◤◢◤◢';
        const parts = [fixed(border + '\n　'), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n　　　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'タイトル'), newline(2), fixed(border), newline()];
        data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, gm.role), fixed(' '), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(fixed('PC/PL'), newline());
        data.players.forEach(player => parts.push(part(TARGET_TYPES.SLOT, playerLabel(player) || 'PC'), newline(), fixed('  - '), part(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), newline()));
        parts.push(newline(), data.result ? fixed('- ') : fixed(''), part(TARGET_TYPES.END, data.result), data.result ? fixed(' -') : fixed(''), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'corner-frame',
      label: '◤￣￣￣ title ＿＿＿◢',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('◤￣￣￣￣￣￣￣￣￣\n '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n        '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), newline(2), fixed('＿＿＿＿＿＿＿＿＿◢'), newline()];
        appendGms(parts, data, ': ');
        parts.push(newline(), fixed('PC/PL'), newline());
        appendPlayers(parts, data, 'plain');
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'triangle-heading',
      label: '▸ system ▸ ɢᴍ: ▸ ᴘᴄ/ᴘʟ:',
      styleTargets: DEFAULT_STYLE_TARGETS,
      build(data) {
        const parts = [fixed('▸ '), part(TARGET_TYPES.SYSTEM, data.system), newline(2), fixed('- '), part(TARGET_TYPES.SCENARIO, data.scenario || 'シナリオ名'), fixed(' -'), newline(2)];
        data.gms.forEach(gm => parts.push(fixed('▸ '), part(TARGET_TYPES.ROLE, gm.role), fixed(': '), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        if (data.players.length) {
          const first = data.players[0];
          parts.push(fixed('▸ PC/PL: '), part(TARGET_TYPES.PC_NAME, first.pc || 'PC未入力'), fixed(' / '), part(TARGET_TYPES.PL_NAME, first.pl || 'PL未入力'), newline());
          data.players.slice(1).forEach(player => parts.push(fixed('               '), part(TARGET_TYPES.PC_NAME, player.pc || 'PC未入力'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL未入力'), newline()));
        }
        parts.push(newline(), data.result ? fixed('▸ ') : fixed(''), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'scenario-clear',
      label: '⧉ system |ɢᴍ |ᴘᴄ・ᴘʟ',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME],
      build(data) {
        const parts = [fixed('⧉ ᴄᴏᴄ 𝟨ᴛʜ\n.　　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'Title')];
        if (data.author) parts.push(newline(), fixed('.　　　　'), part(TARGET_TYPES.AUTHOR, data.author));
        parts.push(newline(2));
        data.gms.forEach(gm => parts.push(fixed('｜'), part(TARGET_TYPES.ROLE, roleSmall(gm.role)), newline(), fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), newline(2)));
        parts.push(fixed('｜ᴘᴄ・ᴘʟ'), newline());
        data.players.forEach(player => parts.push(fixed('　'), part(TARGET_TYPES.PC_NAME, player.pc || 'Tansakusha'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL name'), newline()));
        parts.push(newline(), fixed('　- ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ -'), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'handwritten-title',
      label: '⌜ TITLE ⌟ / ✧𝐊𝐏・✧𝐏𝐋',
      styleTargets: [TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME, TARGET_TYPES.END],
      build(data) {
        const border = '┈┈┈┈┈┈┈┈┈';
        const parts = [fixed('𝐜𝐚𝐥𝐥 𝐨𝐟 𝐜𝐭𝐡𝐮𝐥𝐡𝐮\n⌜ '), part(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), fixed(' ⌟\n' + border + '\n')];
        parts.push(fixed('✧𝐊𝐏'), newline());
        data.gms.forEach(gm => parts.push(fixed('  ▹'), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(newline(), fixed('✧𝐏𝐋'), newline());
        data.players.forEach(player => parts.push(fixed('  ▹'), part(TARGET_TYPES.SLOT, boldLabel(playerLabel(player) || 'PC')), fixed(' '), part(TARGET_TYPES.HO, player.ho || 'HO name'), fixed('   '), part(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), newline()));
        parts.push(newline(), fixed('✧𝐄𝐍𝐃 '), part(TARGET_TYPES.END, data.result || 'title'), newline(), fixed(border + 'ᝰ✍︎ ꙳⋆'), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'double-line',
      label: '════════ / ᴋᴘ・ʜᴏ',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.ROLE, TARGET_TYPES.SLOT, TARGET_TYPES.HO, TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME, TARGET_TYPES.END],
      build(data) {
        const border = '══════════════';
        const parts = [fixed(border + '\n   '), part(TARGET_TYPES.SYSTEM, data.system), fixed('\n　'), part(TARGET_TYPES.SCENARIO, data.scenario || 'TITLE'), fixed('\n' + border), newline(2)];
        data.gms.forEach(gm => parts.push(part(TARGET_TYPES.ROLE, roleSmall(gm.role)), fixed('：'), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        data.players.forEach(player => parts.push(part(TARGET_TYPES.SLOT, (playerLabel(player) || 'ʜᴏ').toLowerCase()), fixed(' '), part(TARGET_TYPES.HO, player.ho || 'HO name'), newline(), fixed('　　 '), part(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), newline()));
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.DATE, data.date), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    },
    {
      id: 'ribbon-title',
      label: '‧₊˚ ୨ Title ୧ ˚₊ 𝗞𝗣…𝗣𝗖/𝗣𝗟…',
      styleTargets: [TARGET_TYPES.SYSTEM, TARGET_TYPES.PC_NAME, TARGET_TYPES.PL_NAME, TARGET_TYPES.END],
      build(data) {
        const parts = [part(TARGET_TYPES.SYSTEM, data.system), newline(), fixed('　‧₊˚ ୨  '), part(TARGET_TYPES.SCENARIO, data.scenario || 'title'), fixed('  ୧ ˚₊'), newline(2), fixed('𝗞𝗣…'), newline()];
        data.gms.forEach(gm => parts.push(fixed('　'), part(TARGET_TYPES.GM_NAME, gm.name), newline()));
        parts.push(newline(), fixed('𝗣𝗖/𝗣𝗟…'), newline());
        data.players.forEach(player => parts.push(fixed('　'), part(TARGET_TYPES.PC_NAME, player.pc || 'Character Name'), fixed(' / '), part(TARGET_TYPES.PL_NAME, player.pl || 'PL Name'), newline()));
        parts.push(newline(), part(TARGET_TYPES.END, data.result), newline(), part(TARGET_TYPES.HASHTAG, data.hashtags));
        return clean(parts);
      }
    }
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

  function renderTemplate(data, styleTextFn) {
    const style = REPORT_STYLES.find(item => item.id === data.style) || REPORT_STYLES[0];
    const targets = new Set(style.styleTargets || DEFAULT_STYLE_TARGETS);
    const fontVariant = data.style === 'minimal' ? 'plain' : data.fontVariant;
    const parts = style.build(data);
    return parts.map(item => {
      const value = String(item.value || '');
      return targets.has(item.type) && typeof styleTextFn === 'function' ? styleTextFn(value, fontVariant) : value;
    }).join('').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  window.ReportTemplate = {
    TARGET_TYPES,
    DEFAULT_STYLE_TARGETS,
    REPORT_STYLES,
    ASCII_ART_COLLECTION,
    renderTemplate
  };
})();
