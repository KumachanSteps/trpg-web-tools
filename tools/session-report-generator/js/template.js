(function () {
  function lineJoin(lines) {
    return lines
      .filter(v => v !== undefined && v !== null && v !== '')
      .join('\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

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

  function roleLabel(role) {
    return String(role || 'KP');
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
    const parts = text
      .replaceAll('｜', '/')
      .replaceAll('|', '/')
      .split('/')
      .map(x => x.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts.join(' | ') : text;
  }

  function playerLines(data, mode = 'classic') {
    return data.players.map(player => {
      const label = playerLabel(player);
      const pc = player.pc || 'PC未入力';
      const pl = player.pl || 'PL未入力';

      if (mode === 'pipe') return `${label ? label + ' ' : ''}${pc} | ${pl}`;
      if (mode === 'plain') return `${pc} / ${pl}`;
      if (mode === 'arrow') return `┗ ${label ? label + ' ' : ''}${pc} | ${pl}`;
      if (mode === 'dash') return `${label || 'PC'}\n　　- ${pc} / ${pl}`;
      if (mode === 'no-label-indent') return `　${pc} / ${pl}`;

      return `${label ? label + ': ' : ''}${pc} / ${pl}`;
    });
  }

  function classicTemplate(data) {
    return lineJoin([
      data.system,
      `「${data.scenario || 'シナリオ名'}」`,
      '',
      ...data.gms.map(gm => `${roleLabel(gm.role)}: ${gm.name}`),
      '',
      'PC/PL',
      ...playerLines(data, 'classic'),
      '',
      data.result,
      data.date,
      data.hashtags
    ]);
  }

  function minimalTemplate(data) {
    return lineJoin([
      data.system,
      `『${data.scenario || 'シナリオ名'}』`,
      '',
      ...data.gms.map(gm => `${roleLabel(gm.role)}：${gm.name}`),
      ...playerLines(data, 'classic'),
      '',
      data.result,
      data.hashtags
    ]);
  }

  function frameTemplate(data) {
    return lineJoin([
      '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦',
      `      ${data.system}`,
      `   　　${data.scenario || 'シナリオ名'}`,
      '',
      ...data.gms.map(gm => `  　${roleSmall(gm.role)}┊${gm.name}`),
      '  　ᴘᴄ┊ᴘʟ',
      ...playerLines(data, 'pipe').map(line => `  　${line}`),
      data.result ? `  　── ${data.result} ──` : '',
      '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦',
      data.hashtags
    ]);
  }

  function asteriskFrameTemplate(data) {
    const border = '✼••┈┈••✼••┈┈••✼';
    return lineJoin([
      border,
      `    ${data.system}`,
      `　${data.scenario || 'シナリオ名'}`,
      border,
      ...data.gms.map(gm => `${roleLabel(gm.role)}: ${gm.name}`),
      '',
      'PC/PL',
      ...playerLines(data, 'classic'),
      '',
      data.result || 'END',
      data.hashtags
    ]);
  }

  function fancyTemplate(data) {
    const lines = [
      '⟡.·*.····························⟡.·*.',
      ` ${data.system}`,
      `　     ◤ ${data.scenario || 'シナリオ名'} ◢`,
      '',
      ...data.gms.map(gm => ` ${roleLabel(gm.role)} ${gm.name}`)
    ];

    data.players.forEach(player => {
      lines.push(
        ` ${boldLabel(playerLabel(player) || 'PC')}`,
        ` ┗ ${player.pc || 'PC未入力'} | ${player.pl || 'PL未入力'}`
      );
    });

    lines.push('', data.result, data.hashtags);
    return lineJoin(lines);
  }

  function blockTemplate(data) {
    return lineJoin([
      `▮     ${data.system}     ▮`,
      '',
      `  『  ${data.scenario || 'シナリオ名'}  』`,
      '',
      ...data.gms.map(gm => `${roleSmall(gm.role)} ${gm.name}`),
      'ᴘʟᴘᴄ',
      ...playerLines(data, 'pipe').map(line => `   ${line}`),
      data.hashtags
    ]);
  }

  function hoFocusTemplate(data) {
    return lineJoin([
      data.system,
      `『 ${data.scenario || 'シナリオ名'} 』`,
      '',
      ...data.gms.map(gm => `${roleLabel(gm.role)} ${gm.name}`),
      'PC/PL',
      ...playerLines(data, 'dash'),
      '',
      data.result ? `-　${data.result}　-` : '',
      data.date,
      data.hashtags
    ]);
  }

  function kpcPairTemplate(data) {
    const gm = data.gms[0];
    const player = data.players[0];
    return lineJoin([
      data.system,
      `【 ${data.scenario || 'タイトル'} 】`,
      '',
      '| ᴋᴘᴄ・ᴋᴘ',
      `  ${normalizeKpcName(gm ? gm.name : 'KPC名 | KP名')}`,
      '| ᴘᴄ・ᴘʟ',
      `  ${player ? `${player.pc || '探索者A'} | ${player.pl || 'PL名A'}` : '探索者A | PL名A'}`,
      '',
      data.date,
      data.hashtags
    ]);
  }

  function emokloreTemplate(data) {
    return lineJoin([
      '✧',
      `   ${data.system}`,
      `     「 ${data.scenario || 'シナリオ名'} 」`,
      data.date ? ` 　　    Date. ${data.date}` : '',
      '',
      ...data.gms.map(gm => `${roleLabel(gm.role)} ${gm.name}`),
      'PcᐟPL',
      ...playerLines(data, 'arrow'),
      '',
      data.result ? `✧ ${data.result}` : '',
      data.hashtags
    ]);
  }

  function wideTitleTemplate(data) {
    return lineJoin([
      data.system,
      `◤　${data.scenario || 'シナリオ名'}　◢`,
      '',
      ...data.gms.map(gm => `${roleLabel(gm.role)}：${gm.name}`),
      '',
      'PL/PC',
      ...playerLines(data, 'classic'),
      '',
      data.result,
      data.date,
      data.hashtags
    ]);
  }

  function zigzagTemplate(data) {
    const border = '◢◤◢◤◢◤◢◤◢◤◢';
    return lineJoin([
      border,
      `　${data.system}`,
      `　　　${data.scenario || 'タイトル'}`,
      '',
      border,
      ...data.gms.map(gm => `${roleLabel(gm.role)} ${gm.name}`),
      'PC/PL',
      ...data.players.flatMap(player => [
        playerLabel(player) || 'PC',
        `  - ${player.pc || 'PC未入力'} / ${player.pl || 'PL未入力'}`
      ]),
      '',
      data.result ? `- ${data.result} -` : '',
      data.hashtags
    ]);
  }

  function cornerFrameTemplate(data) {
    return lineJoin([
      '◤￣￣￣￣￣￣￣￣￣',
      ` ${data.system}`,
      `        ${data.scenario || 'シナリオ名'}`,
      '',
      '＿＿＿＿＿＿＿＿＿◢',
      ...data.gms.map(gm => `${roleLabel(gm.role)}: ${gm.name}`),
      '',
      'PC/PL',
      ...playerLines(data, 'no-label-indent'),
      '',
      data.result,
      data.hashtags
    ]);
  }

  function triangleHeadingTemplate(data) {
    const lines = [
      `▸ ${data.system}`,
      '',
      `- ${data.scenario || 'シナリオ名'} -`,
      '',
      ...data.gms.map(gm => `▸ ${roleLabel(gm.role)}: ${gm.name}`)
    ];

    if (data.players.length) {
      lines.push(`▸ PC/PL: ${data.players[0].pc || 'PC未入力'} / ${data.players[0].pl || 'PL未入力'}`);
      data.players.slice(1).forEach(player => {
        lines.push(`               ${player.pc || 'PC未入力'} / ${player.pl || 'PL未入力'}`);
      });
    }

    lines.push('', data.result ? `▸ ${data.result}` : '', data.hashtags);
    return lineJoin(lines);
  }

  function scenarioClearTemplate(data) {
    return lineJoin([
      '⧉ ᴄᴏᴄ 𝟨ᴛʜ',
      `.　　${data.scenario || 'Title'}`,
      data.author ? `.　　　　${data.author}` : '',
      '',
      ...data.gms.flatMap(gm => [`｜${roleSmall(gm.role)}`, `　${gm.name}`, '']),
      '｜ᴘᴄ・ᴘʟ',
      ...data.players.map(player => `　${player.pc || 'Tansakusha'} / ${player.pl || 'PL name'}`),
      '',
      '　- ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ -',
      data.hashtags
    ]);
  }

  function handwrittenTitleTemplate(data) {
    const border = '┈┈┈┈┈┈┈┈┈';
    return lineJoin([
      '𝐜𝐚𝐥𝐥 𝐨𝐟 𝐜𝐭𝐡𝐮𝐥𝐡𝐮',
      `⌜ ${data.scenario || 'TITLE'} ⌟`,
      border,
      '✧𝐊𝐏',
      ...data.gms.map(gm => `  ▹${gm.name}`),
      '',
      '✧𝐏𝐋',
      ...data.players.map(player =>
        `  ▹${boldLabel(playerLabel(player) || 'PC')} ${player.ho || 'HO name'}   ${player.pc || 'Character Name'} / ${player.pl || 'PL Name'}`
      ),
      '',
      `✧𝐄𝐍𝐃 ${data.result || 'title'}`,
      `${border}ᝰ✍︎ ꙳⋆`,
      data.hashtags
    ]);
  }

  function doubleLineTemplate(data) {
    const border = '══════════════';
    return lineJoin([
      border,
      `   ${data.system}`,
      `　${data.scenario || 'TITLE'}`,
      border,
      '',
      ...data.gms.map(gm => `${roleSmall(gm.role)}：${gm.name}`),
      ...data.players.flatMap(player => [
        `${(playerLabel(player) || 'ʜᴏ').toLowerCase()} ${player.ho || 'HO name'}`,
        `　　 ${player.pc || 'Character Name'} / ${player.pl || 'PL Name'}`
      ]),
      '',
      data.result,
      data.date,
      data.hashtags
    ]);
  }

  function ribbonTitleTemplate(data) {
    return lineJoin([
      data.system,
      `　‧₊˚ ୨  ${data.scenario || 'title'}  ୧ ˚₊`,
      '',
      '𝗞𝗣…',
      ...data.gms.map(gm => `　${gm.name}`),
      '',
      '𝗣𝗖/𝗣𝗟…',
      ...data.players.map(player => `　${player.pc || 'Character Name'} / ${player.pl || 'PL Name'}`),
      '',
      data.result,
      data.hashtags
    ]);
  }

  const TEMPLATE_MAP = {
    classic: classicTemplate,
    minimal: minimalTemplate,
    frame: frameTemplate,
    'asterisk-frame': asteriskFrameTemplate,
    fancy: fancyTemplate,
    block: blockTemplate,
    'ho-focus': hoFocusTemplate,
    'kpc-pair': kpcPairTemplate,
    emoklore: emokloreTemplate,
    'wide-title': wideTitleTemplate,
    zigzag: zigzagTemplate,
    'corner-frame': cornerFrameTemplate,
    'triangle-heading': triangleHeadingTemplate,
    'scenario-clear': scenarioClearTemplate,
    'handwritten-title': handwrittenTitleTemplate,
    'double-line': doubleLineTemplate,
    'ribbon-title': ribbonTitleTemplate
  };

  window.ReportTemplate = {
    render(data) {
      return (TEMPLATE_MAP[data.style] || classicTemplate)(data);
    },
    TEMPLATE_MAP
  };
})();
