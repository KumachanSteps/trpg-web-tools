let lastRawGeneratedText = '';
let isResetting = false;

const $ = id => document.getElementById(id);

const fontVariantMaps = {
  sansBoldItalic: { upper: 0x1D63C, lower: 0x1D656, digit: 0x1D7EC },
  sansBold: { upper: 0x1D5D4, lower: 0x1D5EE, digit: 0x1D7EC },
  sansItalic: { upper: 0x1D608, lower: 0x1D622, digit: null },
  serifBoldItalic: { upper: 0x1D468, lower: 0x1D482, digit: 0x1D7CE },
  serifBold: { upper: 0x1D400, lower: 0x1D41A, digit: 0x1D7CE },
  serifItalic: { upper: 0x1D434, lower: 0x1D44E, digit: null, lowerExceptions: { h: 'ℎ' } },
  smallCaps: {
    chars: {
      A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ꜰ', G: 'ɢ', H: 'ʜ', I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ꞯ', R: 'ʀ', S: 'ꜱ', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ',
      a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ꞯ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
    }
  },
  typewriter: { upper: 0x1D670, lower: 0x1D68A, digit: 0x1D7F6 },
  modernSans: { upper: 0x1D5A0, lower: 0x1D5BA, digit: 0x1D7E2 }
};

const systemMaps = {
  normal: {
    call_of_cthulhu: 'Call of Cthulhu',
    coc: 'CoC',
    coc6: 'CoC6',
    coc7: 'CoC7',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー',
    shinobigami: 'シノビガミ',
    insane: 'インセイン',
    double_cross: 'ダブルクロス The 3rd Edition',
    sword_world_25: 'ソード・ワールド2.5',
    futari_sousa: 'フタリソウサ',
    custom: '自由入力'
  },
  lower: {
    call_of_cthulhu: 'ᴄᴀʟʟ ᴏꜰ ᴄᴛʜᴜʟʜᴜ',
    coc: 'ᴄᴏᴄ',
    coc6: 'ᴄᴏᴄ𝟨',
    coc7: 'ᴄᴏᴄ𝟩',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー',
    shinobigami: 'シノビガミ',
    insane: 'インセイン',
    double_cross: 'ダブルクロス The 3rd Edition',
    sword_world_25: 'ソード・ワールド2.5',
    futari_sousa: 'フタリソウサ',
    custom: '自由入力'
  },
  bold: {
    call_of_cthulhu: '𝐂𝐚𝐥𝐥 𝐨𝐟 𝐂𝐭𝐡𝐮𝐥𝐡𝐮',
    coc: '𝐂𝐨𝐂',
    coc6: '𝐂𝐨𝐂𝟔',
    coc7: '𝐂𝐨𝐂𝟕',
    new_coc: '新クトゥルフ神話TRPG',
    emoklore_en: 'emoklore-trpg',
    emoklore_ja: 'エモクロアTRPG',
    madamisu: 'マーダーミステリー',
    shinobigami: 'シノビガミ',
    insane: 'インセイン',
    double_cross: 'ダブルクロス The 3rd Edition',
    sword_world_25: 'ソード・ワールド2.5',
    futari_sousa: 'フタリソウサ',
    custom: '自由入力'
  }
};

const protectedTokens = [
  '探索者A', '探索者B', 'PL名A', 'PL名B', 'KP名', 'KPC名', '作者名',
  '新クトゥルフ神話TRPG', 'エモクロアTRPG', 'emoklore-trpg', 'マーダーミステリー',
  'シノビガミ', 'インセイン', 'ダブルクロス The 3rd Edition', 'ソード・ワールド2.5', 'フタリソウサ',
  '◤￣￣￣￣￣￣￣￣￣', '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣', '＿＿＿＿＿＿＿＿＿◢', '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢'
];

const asciiGroups = {
  LINE: [
    ['✦ line', '✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦'],
    ['⟡ line', '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·'],
    ['✤ line', '✤─────✤─────✤'],
    ['○● line', '○●————————————————-●○'],
    ['plain line', '──────────────────'],
    ['─ ⋅ ✩ ⋅ ─ line', '──────── ⋅ ✩ ⋅ ────────'],
    ['꒰ঌ line ໒꒱', '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱'],
    ['⋆⸜ line ⸝⋆', '⋆⸜ ┈┈┈┈┈┈┈┈ ⸝⋆'],
    ['◇ line', '◇─◇──◇────◇──◇─◇'],
    ['◆◇ line', '◆◇◆◇◆◇◆◇◆◇◆◇◆'],
    ['◈ line', '◈ ━━━━━━━━━━━━━━ ◈'],
    ['▣ line', '▣──────────────▣'],
    ['╋ line', '╋━━━━━━━━━━━━━━╋']
  ],
  'SINGLE CHARACTER': [
    ['❏', '❏'],
    ['✦', '✦'],
    ['✧', '✧'],
    ['┗', '┗ '],
    ['┊', '┊'],
    ['▎', '▎'],
    ['◤', '◤'],
    ['◢', '◢']
  ],
  ARTS: [
    ['.+:ﾟ+｡.☆', '.+:ﾟ+｡.☆'],
    ['｡:+* ﾟ', '｡:+* ﾟ ゜ﾟ *+:｡:+* ﾟ ゜ﾟ *+:｡'],
    ['✧･ﾟ:*', '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧'],
    ['✦⋆｡˚', '✦⋆｡˚ ⋆｡˚ ✦ ⋆｡˚ ⋆｡˚✦'],
    ['𓂃𓈒𓏸', '𓂃𓈒𓏸︎︎︎︎ 🕊'],
    ['✦⋆˙₊⟡', '✦⋆˙₊⟡'],
    ['⊹₊⋆ ✦. ݁', '⊹₊⋆ ✦. ݁'],
    ['Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ'],
    ['◤￣￣', '◤￣￣￣￣￣￣￣￣￣￣￣￣￣￣'],
    ['＿＿◢', '＿＿＿＿＿＿＿＿＿＿＿＿＿＿◢']
  ]
};

const templates = {
  classic: generateClassic,
  minimal: generateMinimal,
  frame: generateFrame,
  'asterisk-frame': generateAsteriskFrame,
  fancy: generateFancy,
  block: generateBlock,
  'ho-focus': generateHOFocus,
  'kpc-pair': generateKpcPair,
  emoklore: generateEmoklore,
  'wide-title': generateWideTitle,
  zigzag: generateZigzag,
  'corner-frame': generateCornerFrame,
  'triangle-heading': generateTriangleHeading,
  'scenario-clear': generateScenarioClear,
  'handwritten-title': generateHandwrittenTitle,
  'double-line': generateDoubleLine,
  'ribbon-title': generateRibbonTitle
};

function renderAsciiOptions() {
  const root = $('asciiOptions');
  if (!root) return;
  root.innerHTML = '';

  Object.entries(asciiGroups).forEach(([title, items]) => {
    const group = document.createElement('div');
    group.className = 'ascii-group';
    group.innerHTML = `<div class="ascii-group-title">${title}</div><div class="btns"></div>`;

    const buttonBox = group.querySelector('.btns');
    items.forEach(([label, value]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.decoration = value;
      button.addEventListener('click', () => addDecoration(value));
      buttonBox.appendChild(button);
    });

    root.appendChild(group);
  });
}

function cp(ch, start, base) {
  return base === null ? ch : String.fromCodePoint(base + ch.charCodeAt(0) - start);
}

function styleText(text, variant) {
  const map = fontVariantMaps[variant];
  if (!map || variant === 'plain') return text;

  return Array.from(text.normalize('NFKD')).map(ch => {
    if (map.chars) return map.chars[ch] || ch;
    if (/[A-Z]/.test(ch)) return cp(ch, 65, map.upper);
    if (/[a-z]/.test(ch)) return map.lowerExceptions?.[ch] || cp(ch, 97, map.lower);
    if (/[0-9]/.test(ch)) return cp(ch, 48, map.digit);
    return ch;
  }).join('');
}

function styleTextPreservingSamples(text, variant) {
  let t = text;
  const marks = [];

  protectedTokens.forEach((token, i) => {
    const marker = `__KEEP_${i}__`;
    marks.push([marker, token]);
    t = t.split(token).join(marker);
  });

  let styled = styleText(t, variant);
  marks.forEach(([marker, token]) => {
    styled = styled.split(styleText(marker, variant)).join(token).split(marker).join(token);
  });

  return styled;
}

function suffixName(name, suffix) {
  const t = String(name).trim();
  return !t || suffix === 'none' || t.endsWith(suffix) ? t : `${t}${suffix}`;
}

function getSelectedSuffix() {
  return document.querySelector('input[name="suffixChoice"]:checked')?.value || 'none';
}

function selectSuffix(target) {
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.checked = input === target;
  });

  if (!target.checked) target.checked = true;
  previewSelectedStyle();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSystemText(mode = 'normal') {
  const key = $('systemSelect').value;
  if (key === 'custom') return $('customSystemText').value.trim() || 'システム名';
  return systemMaps[mode]?.[key] || systemMaps.normal[key] || key;
}

function lineJoin(lines) {
  return lines.join('\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

function addGM(value = '', role = 'KP') {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <div>
      <label>役割</label>
      <select class="gm-role">
        <option value="KP">KP</option>
        <option value="DL">DL</option>
        <option value="GM">GM</option>
        <option value="KPC/KP">KPC/KP</option>
        <option value="SKP">SKP</option>
        <option value="作/KP">作/KP</option>
        <option value="進行">進行</option>
      </select>
    </div>
    <div>
      <label>名前</label>
      <input class="gm-name" value="${escapeHtml(value)}" placeholder="例：KPC名 / KP名">
    </div>
    <button class="icon-button add-inline" type="button" aria-label="進行役を追加" title="進行役を追加">＋</button>
    <button class="icon-button danger-inline" type="button" aria-label="削除" title="削除">×</button>
  `;

  $('gmContainer').appendChild(row);
  row.querySelector('.gm-role').value = role;
  row.querySelector('.add-inline').addEventListener('click', () => addGM());
  row.querySelector('.danger-inline').addEventListener('click', () => {
    row.remove();
    previewSelectedStyle();
  });
}

function getParticipantBaseSlot() {
  return document.querySelector('#playerContainer .participant-row .player-slot')?.value || 'PC1';
}

function getParticipantSlotForIndex(i) {
  const base = getParticipantBaseSlot();
  if (/^PC[0-9]+$/i.test(base)) return `PC${i}`;
  if (/^HO[0-9]+$/i.test(base)) return `HO${i}`;
  return base;
}

function buildSlotOptions(selected = 'PC1', isFirst = false) {
  const options = isFirst ? ['PC', 'PC1', 'HO1', 'PC/PL', 'PL/PC', '自由'] : [selected];
  return options.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`).join('');
}

function syncParticipantSlots() {
  [...document.querySelectorAll('#playerContainer .participant-row')].forEach((row, i) => {
    const sel = row.querySelector('.player-slot');
    if (!sel) return;

    if (i === 0) {
      sel.innerHTML = buildSlotOptions(sel.value || 'PC1', true);
      sel.disabled = false;
    } else {
      const slot = getParticipantSlotForIndex(i + 1);
      sel.innerHTML = buildSlotOptions(slot);
      sel.value = slot;
      sel.disabled = true;
    }
  });
}

function onFirstParticipantSlotChange() {
  syncParticipantSlots();
  previewSelectedStyle();
}

function addPlayer(pl = '', pc = '', slot = '', ho = '') {
  const container = $('playerContainer');
  const idx = container.querySelectorAll('.participant-row').length + 1;
  const isFirst = idx === 1;
  const selected = slot || getParticipantSlotForIndex(idx);
  const row = document.createElement('div');

  row.className = `participant-row name-order-${$('nameInputOrder')?.value || 'pcpl'}`;
  row.innerHTML = `
    <div class="slot-field">
      <label>枠</label>
      <select class="player-slot" ${isFirst ? '' : 'disabled'}>${buildSlotOptions(selected, isFirst)}</select>
    </div>
    <div class="ho-field">
      <label>HO補足</label>
      <input class="ho-name" value="${escapeHtml(ho)}" placeholder="通常は空欄でOK">
    </div>
    <div class="pc-field">
      <label>PC名</label>
      <input class="pc-name" value="${escapeHtml(pc)}" placeholder="例：探索者名">
    </div>
    <div class="pl-field">
      <label>PL名</label>
      <input class="pl-name" value="${escapeHtml(pl)}" placeholder="例：佐藤">
    </div>
    <button class="danger delete-field" type="button">×</button>
  `;

  container.appendChild(row);
  row.querySelector('.player-slot').addEventListener('change', onFirstParticipantSlotChange);
  row.querySelector('.delete-field').addEventListener('click', () => {
    row.remove();
    syncParticipantSlots();
    previewSelectedStyle();
  });

  syncParticipantSlots();
  updateNameInputOrder();
}

function updateNameInputOrder() {
  const order = $('nameInputOrder')?.value || 'pcpl';
  document.querySelectorAll('.participant-row').forEach(row => {
    row.classList.toggle('name-order-plpc', order === 'plpc');
    row.classList.toggle('name-order-pcpl', order === 'pcpl');
  });
}

function samplePlayerName(index, type) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const letter = letters[index] || String(index + 1);
  return type === 'pc' ? `探索者${letter}` : `PL名${letter}`;
}

function getFieldValue(id, useSample, sampleValue) {
  const value = $(id).value.trim();
  return value || (useSample ? sampleValue : '');
}

function collectData(useSample = false) {
  const suffix = getSelectedSuffix();
  const gmDefault = 'KP';
  const gmRows = [...document.querySelectorAll('#gmContainer .row')];
  const playerRows = [...document.querySelectorAll('#playerContainer .participant-row')];

  let gms = gmRows.map((row, index) => {
    const rawName = row.querySelector('.gm-name').value.trim();
    return {
      role: row.querySelector('.gm-role').value || gmDefault,
      name: suffixName(rawName || (useSample && index === 0 ? 'KP名' : ''), suffix)
    };
  }).filter(x => x.name);

  let players = playerRows.map((row, index) => {
    const rawPc = row.querySelector('.pc-name').value.trim();
    const rawPl = row.querySelector('.pl-name').value.trim();
    const rawHo = row.querySelector('.ho-name').value.trim();
    return {
      slot: row.querySelector('.player-slot').value,
      ho: rawHo,
      pc: rawPc || (useSample ? samplePlayerName(index, 'pc') : ''),
      pl: suffixName(rawPl || (useSample ? samplePlayerName(index, 'pl') : ''), suffix)
    };
  }).filter(x => x.pl || x.pc || x.ho);

  if (useSample) {
    if (!gms.length) gms = [{ role: gmDefault, name: 'KP名' }];
    if (!players.length) {
      players = [
        { slot: 'HO1', ho: '', pc: '探索者A', pl: 'PL名A' },
        { slot: 'HO2', ho: '', pc: '探索者B', pl: 'PL名B' }
      ];
    }
  }

  return {
    style: $('reportStyle').value,
    fontVariant: $('fontVariant').value,
    system: getSystemText(),
    systemShort: getSystemText('normal'),
    systemLower: getSystemText('lower'),
    systemBold: getSystemText('bold'),
    scenario: getFieldValue('scenarioTitle', useSample, 'シナリオ名'),
    result: getFieldValue('resultText', useSample, 'END A 両生還'),
    author: getFieldValue('authorText', useSample, '作者名 様'),
    date: getFieldValue('dateText', useSample, $('dateText').placeholder || getTodayString()),
    quote: getFieldValue('quoteText', useSample, '「忘れられない卓でした」'),
    hashtags: $('hashtagText').value.trim(),
    comment: '',
    gms,
    players
  };
}

function hasUserInput() {
  return ['scenarioTitle', 'resultText', 'authorText', 'dateText', 'quoteText', 'hashtagText', 'customSystemText']
    .some(id => $(id)?.value.trim())
    || [...document.querySelectorAll('#gmContainer input,#playerContainer input')].some(i => i.value.trim());
}

function gmLines(data, sep = '：') {
  return data.gms.map(x => `${x.role}${sep}${sep === ':' ? ' ' : ''}${x.name}`);
}

function playerLabel(x) {
  const slot = x.slot === '自由' ? '' : x.slot;
  return slot && x.ho ? `${slot} ${x.ho}` : slot;
}

function formatFancyLabel(label) {
  return String(label)
    .replace(/^HO([0-9])$/i, (_, n) => '𝐇𝐎' + String.fromCodePoint(0x1D7CE + Number(n)))
    .replace(/^PC([0-9])$/i, (_, n) => '𝐏𝐂' + String.fromCodePoint(0x1D7CE + Number(n)))
    .replace(/^HO$/i, '𝐇𝐎')
    .replace(/^PC$/i, '𝐏𝐂')
    .replace(/^PL\/PC$/i, '𝐏𝐋/𝐏𝐂')
    .replace(/^PC\/PL$/i, '𝐏𝐂/𝐏𝐋');
}

function playerLines(data, format = 'pcpl') {
  return data.players.map(x => {
    const label = playerLabel(x);
    const colon = label ? `${label}：` : '';
    const space = label ? `${label} ` : '';

    if (format === 'classic') return `${label ? `${label}: ` : ''}${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;
    if (format === 'frame') return `${space}${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'plain-pipe') return `${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'emoklore-arrow') return `┗ ${space}${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`;
    if (format === 'ho-dash') return `${label || 'PC'}\n　　- ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;

    return `${colon}${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`;
  });
}

function withTail(lines, data, keys) {
  keys.forEach(k => {
    if (data[k]) lines.push('', data[k]);
  });
  return lineJoin(lines);
}

function generateClassic(d) {
  const l = [d.systemShort, `「${d.scenario || 'シナリオ名'}」`, '', ...gmLines(d, ':')];
  if (d.players.length) l.push('', 'PC/PL', ...playerLines(d, 'classic'));
  return withTail(l, d, ['result', 'quote', 'date', 'hashtags']);
}

function generateMinimal(d) {
  const l = [d.systemShort, `『${d.scenario || 'シナリオ名'}』`, '', ...gmLines(d)];
  if (d.players.length) l.push(...playerLines(d));
  return withTail(l, d, ['result', 'hashtags']);
}

function frameRoleLabel(role) {
  return {
    KP: 'ᴋᴘ',
    DL: 'ᴅʟ',
    GM: 'ɢᴍ',
    'KPC/KP': 'ᴋᴘᴄ/ᴋᴘ',
    SKP: 'ꜱᴋᴘ',
    '作/KP': '作/ᴋᴘ',
    進行: '進行'
  }[role] || role.toLowerCase();
}

function generateFrame(d) {
  const l = ['✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦', `      ${d.systemShort}`, `   　　${d.scenario || 'シナリオ名'}`, ''];
  d.gms.forEach(x => l.push(`  　${frameRoleLabel(x.role)}┊${x.name}`));
  if (d.players.length) l.push('  　ᴘᴄ┊ᴘʟ', ...playerLines(d, 'frame').map(x => `  　${x}`));
  if (d.result) l.push(`  　── ${d.result} ──`);
  if (d.quote) l.push('', `　 ${d.quote}`);
  l.push('✦   ┈┈┈┈┈┈┈┈┈┈┈┈   ✦');
  if (d.hashtags) l.push('', d.hashtags);
  return lineJoin(l);
}

function generateAsteriskFrame(d) {
  const border = '✼••┈┈••✼••┈┈••✼';
  const l = [border, `    ${d.systemShort}`, `　${d.scenario || 'シナリオ名'}`, border];
  d.gms.forEach(x => l.push(`${x.role}: ${x.name}`));
  if (d.players.length) l.push('', 'PC/PL', ...playerLines(d, 'classic'));
  l.push('', d.result || 'END');
  return lineJoin(l);
}

function generateFancy(d) {
  const l = ['⟡.·*.····························⟡.·*.', ` ${d.systemBold}`, `　     ◤ ${d.scenario || 'シナリオ名'} ◢`, ''];
  l.push(...d.gms.map(x => ` ${x.role} ${x.name}`));
  if (d.players.length) {
    d.players.forEach(x => {
      const label = formatFancyLabel(playerLabel(x) || 'PC');
      l.push(` ${label}`, ` ┗ ${x.pc || 'PC未入力'} | ${x.pl || 'PL未入力'}`);
    });
  }
  if (d.result) l.push('', ` ${d.result}`);
  if (d.quote) l.push('', d.quote);
  if (d.hashtags) l.push('', d.hashtags);
  return lineJoin(l);
}

function generateBlock(d) {
  const l = [`▮     ${d.systemLower}     ▮`, '', `  『  ${d.scenario || 'シナリオ名'}  』`, ''];
  d.gms.forEach(x => l.push(`${frameRoleLabel(x.role)} ${x.name}`));
  if (d.players.length) {
    l.push('ᴘʟᴘᴄ');
    playerLines(d, 'frame').forEach(x => l.push(`   ${x}`));
  }
  return withTail(l, d, ['quote', 'hashtags']);
}

function generateHOFocus(d) {
  const l = [d.systemBold, `『 ${d.scenario || 'シナリオ名'} 』`, '', ...gmLines(d, ' '), '𝐏𝐂/𝐏𝐋', ...playerLines(d, 'ho-dash')];
  if (d.result) l.push('', `-　${d.result}　-`);
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function normalizeKpcPairName(name) {
  const text = String(name || '').trim();
  if (!text || text === 'KP名') return 'KPC名 | KP名';
  const parts = text.replaceAll('｜', '/').replaceAll('|', '/').split('/').map(x => x.trim()).filter(Boolean);
  return parts.length > 1 ? parts.join(' | ') : text;
}

function generateKpcPair(d) {
  const l = [d.systemLower, `【 ${d.scenario || 'タイトル'} 】`, ''];
  if (d.gms.length) l.push('| ᴋᴘᴄ・ᴋᴘ', `  ${normalizeKpcPairName(d.gms[0].name)}`);
  if (d.players.length) l.push('| ᴘᴄ・ᴘʟ', `  ${playerLines(d, 'plain-pipe')[0]}`);
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function generateEmoklore(d) {
  const l = ['✧', `   ${d.systemShort}`, `     「 ${d.scenario || 'シナリオ名'} 」`];
  if (d.date) l.push(` 　　    Date. ${d.date}`);
  l.push('');
  d.gms.forEach(x => l.push(`${x.role} ${x.name}`));
  if (d.players.length) l.push('PcᐟPL', ...playerLines(d, 'emoklore-arrow'));
  if (d.result) l.push('', `✧ ${d.result}`);
  return withTail(l, d, ['quote', 'hashtags']);
}

function generateWideTitle(d) {
  const l = [d.systemShort, `◤　${d.scenario || 'シナリオ名'}　◢`];
  if (d.author) l.push(`作者：${d.author}`);
  l.push('', ...gmLines(d));
  if (d.players.length) l.push('𝗣𝗟/𝗣𝗖', ...playerLines(d));
  return withTail(l, d, ['result', 'quote', 'date', 'hashtags']);
}

function generateZigzag(d) {
  const border = '◢◤◢◤◢◤◢◤◢◤◢';
  const l = [border, `　${d.systemShort}`, `　　　${d.scenario || 'タイトル'}`, '', border];
  d.gms.forEach(x => l.push(`${x.role} ${x.name}`));
  if (d.players.length) {
    l.push('PC/PL');
    d.players.forEach(x => l.push(playerLabel(x) || 'PC', `  - ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`));
  }
  if (d.result) l.push('', `- ${d.result} -`);
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function generateCornerFrame(d) {
  const l = ['◤￣￣￣￣￣￣￣￣￣', ` ${d.systemShort}`, `        ${d.scenario || 'シナリオ名'}`, '', '＿＿＿＿＿＿＿＿＿◢'];
  d.gms.forEach(x => l.push(`${x.role}: ${x.name}`));
  if (d.players.length) l.push('', 'PC/PL', ...d.players.map(x => ` ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`));
  return withTail(l, d, ['result', 'quote', 'date', 'hashtags']);
}

function generateTriangleHeading(d) {
  const l = [`▸ ${d.systemShort}`, '', `- ${d.scenario || 'シナリオ名'} -`, ''];
  d.gms.forEach(x => l.push(`▸ ${x.role}: ${x.name}`));
  if (d.players.length) {
    const first = d.players[0];
    l.push(`▸ PC/PL: ${first.pc || 'PC未入力'} / ${first.pl || 'PL未入力'}`);
    d.players.slice(1).forEach(x => l.push(`               ${x.pc || 'PC未入力'} / ${x.pl || 'PL未入力'}`));
  }
  if (d.result) l.push('', `▸ ${d.result}`);
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function generateScenarioClear(d) {
  const l = ['⧉ ᴄᴏᴄ 𝟨ᴛʜ', `.　　${d.scenario || 'Title'}`];
  if (d.author) l.push(`.　　　　${d.author}`);
  l.push('');
  d.gms.forEach(x => l.push(`｜${frameRoleLabel(x.role)}`, `　${x.name}`, ''));
  if (d.players.length) {
    l.push('｜ᴘᴄ・ᴘʟ');
    d.players.forEach(x => l.push(`　${x.pc || 'Tansakusha'} / ${x.pl || 'PL name'}`));
    l.push('');
  }
  l.push('　- ꜱᴄᴇɴᴀʀɪᴏ ᴄʟᴇᴀʀ -');
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function generateHandwrittenTitle(d) {
  const border = '┈┈┈┈┈┈┈┈┈';
  const l = ['𝐜𝐚𝐥𝐥 𝐨𝐟 𝐜𝐭𝐡𝐮𝐥𝐡𝐮', `⌜ ${d.scenario || 'TITLE'} ⌟`, border];
  if (d.gms.length) {
    l.push('✧𝐊𝐏');
    d.gms.forEach(x => l.push(`  ▹${x.name}`));
    l.push('');
  }
  if (d.players.length) {
    l.push('✧𝐏𝐋');
    d.players.forEach(x => {
      const label = formatFancyLabel(playerLabel(x) || 'PC');
      l.push(`  ▹${label} ${x.ho || 'HO name'}   ${x.pc || 'Character Name'} / ${x.pl || 'PL Name'}`);
    });
    l.push('');
  }
  l.push(`✧𝐄𝐍𝐃 ${d.result || 'title'}`, `${border}ᝰ✍︎ ꙳⋆`);
  return withTail(l, d, ['quote', 'date', 'hashtags']);
}

function generateDoubleLine(d) {
  const border = '══════════════';
  const l = [border, `   ${d.systemShort}`, `　${d.scenario || 'TITLE'}`, border, ''];
  d.gms.forEach(x => l.push(`${frameRoleLabel(x.role)}：${x.name}`));
  if (d.players.length) {
    d.players.forEach(x => {
      const label = playerLabel(x) || 'ʜᴏ';
      l.push(`${label.toLowerCase()} ${x.ho || 'HO name'}`, `　　 ${x.pc || 'Character Name'} / ${x.pl || 'PL Name'}`);
    });
  }
  return withTail(l, d, ['result', 'quote', 'date', 'hashtags']);
}

function generateRibbonTitle(d) {
  const l = [d.systemBold, `　‧₊˚ ୨  ${d.scenario || 'title'}  ୧ ˚₊`];
  if (d.gms.length) {
    l.push('', '𝗞𝗣…');
    d.gms.forEach(x => l.push(`　${x.name}`));
  }
  if (d.players.length) {
    l.push('', '𝗣𝗖/𝗣𝗟…');
    d.players.forEach(x => l.push(`　${x.pc || 'Character Name'} / ${x.pl || 'PL Name'}`));
  }
  return withTail(l, d, ['result', 'quote', 'date', 'hashtags']);
}

function composeRawPreview() {
  return lastRawGeneratedText;
}

function renderPreview() {
  const d = collectData(!hasUserInput());
  const variant = d.style === 'minimal' ? 'plain' : d.fontVariant;
  $('tweetPreview').value = styleTextPreservingSamples(composeRawPreview(), variant);
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function generateTweet(options = {}) {
  const d = collectData(Boolean(options.useSampleFallback));
  lastRawGeneratedText = (templates[d.style] || generateClassic)(d);
  renderPreview();
}

function applyStyleInputDefaults() {
  if ($('reportStyle').value !== 'ho-focus') return;
  const first = document.querySelector('#playerContainer .participant-row .player-slot');
  if (first && first.value !== 'HO1') {
    first.value = 'HO1';
    syncParticipantSlots();
  }
}

function previewSelectedStyle() {
  if (isResetting) return;
  applyStyleInputDefaults();
  generateTweet({ useSampleFallback: true });
}

function addDecoration(text) {
  const preview = $('tweetPreview');
  const start = preview.selectionStart ?? preview.value.length;
  const end = preview.selectionEnd ?? preview.value.length;
  preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);
  preview.focus();
  preview.selectionStart = preview.selectionEnd = start + text.length;
  lastRawGeneratedText = preview.value;
  updateCount();
  requestAnimationFrame(fitPreviewTextBox);
}

function insertAtCursor(text) {
  const preview = $('tweetPreview');
  const start = preview.selectionStart;
  const end = preview.selectionEnd;
  preview.value = preview.value.slice(0, start) + text + preview.value.slice(end);
  preview.focus();
  preview.selectionStart = preview.selectionEnd = start + text.length;
  lastRawGeneratedText = preview.value;
  updateCount();
}

function clearPreview() {
  lastRawGeneratedText = '';
  $('tweetPreview').value = '';
  updateCount();
  $('tweetPreview').focus();
}

async function copyTweet() {
  try {
    await navigator.clipboard.writeText($('tweetPreview').value);
    alert('コピーしました。');
  } catch (e) {
    $('tweetPreview').select();
    document.execCommand('copy');
    alert('コピーしました。');
  }
}

function getTweetWeightedLength(text) {
  let total = 0;
  for (const ch of Array.from(text.normalize('NFC'))) {
    const code = ch.codePointAt(0);
    if (code === 0x0A || code === 0x0D) { total += 1; continue; }
    if (code >= 0x0000 && code <= 0x10FF) { total += 1; continue; }
    if (code >= 0x2000 && code <= 0x200D) { total += 1; continue; }
    if (code >= 0x2010 && code <= 0x201F) { total += 1; continue; }
    if (code >= 0x2032 && code <= 0x2037) { total += 1; continue; }
    total += 2;
  }
  return total;
}

function updateCount() {
  const n = getTweetWeightedLength($('tweetPreview').value);
  const status = $('limitStatus');
  $('charCount').textContent = `${n} / 280`;
  status.textContent = n <= 280 ? 'OK' : `${n - 280}字オーバー`;
  status.className = n <= 280 ? 'count-ok' : 'count-bad';
}

function fitPreviewTextBox() {
  const panel = document.querySelector('.preview-panel');
  const card = document.querySelector('.twitter-card');
  const text = $('tweetPreview');
  if (!panel || !card || !text || window.innerWidth <= 1120) return;

  const h2 = panel.querySelector('h2');
  const head = card.querySelector('.tweet-head');
  const count = card.querySelector('.count-line');
  const buttons = card.querySelector('.preview-actions');
  const cardChrome = 32 + (head?.offsetHeight || 0) + (count?.offsetHeight || 0) + (buttons?.offsetHeight || 0);
  const available = panel.clientHeight - (h2?.offsetHeight || 0) - cardChrome - 58;
  const minH = window.innerHeight < 760 ? 150 : 180;
  const defaultH = 360;
  text.style.height = `${Math.max(minH, Math.min(defaultH, available))}px`;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function setTodayPlaceholder() {
  $('dateText').placeholder = getTodayString();
}

function updateCustomSystemInput() {
  $('customSystemText')?.classList.toggle('is-active', $('systemSelect').value === 'custom');
}

function resetFormState() {
  isResetting = true;
  document.querySelectorAll('.input-panel input:not([type="checkbox"]), .input-panel textarea').forEach(el => { el.value = ''; });
  $('systemSelect').value = 'call_of_cthulhu';
  $('reportStyle').value = 'classic';
  $('fontVariant').value = 'sansBoldItalic';
  $('nameInputOrder').value = 'pcpl';
  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => { input.checked = input.value === 'none'; });
  $('gmContainer').innerHTML = '';
  $('playerContainer').innerHTML = '';
  lastRawGeneratedText = '';
  $('tweetPreview').value = '';
  updateCount();
  addGM();
  addPlayer();
  addPlayer();
  setTodayPlaceholder();
  updateCustomSystemInput();
  isResetting = false;
}

function clearAll() {
  resetFormState();
}

window.clearAll = clearAll;

function runSelfTests() {
  console.assert(typeof addGM === 'function', 'addGM exists');
  console.assert(typeof addPlayer === 'function', 'addPlayer exists');
  console.assert(Object.prototype.hasOwnProperty.call(templates, 'ribbon-title'), 'ribbon template registered');
  console.assert(styleText('h', 'serifItalic') === 'ℎ', 'serif italic h fixed');
  console.assert(styleText('Call of Cthulhu', 'smallCaps') === 'ᴄᴀʟʟ ᴏꜰ ᴄᴛʜᴜʟʜᴜ', 'small caps works');
  console.assert(styleText('ABC123', 'typewriter') === '𝙰𝙱𝙲𝟷𝟸𝟹', 'typewriter works');
  console.assert(styleText('ABC123', 'modernSans') === '𝖠𝖡𝖢𝟣𝟤𝟥', 'modern sans works');
}

function bindEvents() {
  window.addEventListener('resize', fitPreviewTextBox);

  document.querySelectorAll('input[name="suffixChoice"]').forEach(input => {
    input.addEventListener('change', () => selectSuffix(input));
  });

  $('addPlayerButton').addEventListener('click', () => addPlayer());
  $('generateButton').addEventListener('click', () => generateTweet());
  $('clearAllButton').addEventListener('click', clearAll);
  $('copyButton').addEventListener('click', copyTweet);
  $('newlineButton').addEventListener('click', () => insertAtCursor('\n'));
  $('spaceButton').addEventListener('click', () => insertAtCursor(' '));
  $('clearPreviewButton').addEventListener('click', clearPreview);
  $('tweetPreview').addEventListener('input', () => {
    lastRawGeneratedText = $('tweetPreview').value;
    updateCount();
  });

  $('reportStyle').addEventListener('change', previewSelectedStyle);
  $('fontVariant').addEventListener('change', renderPreview);
  $('nameInputOrder').addEventListener('change', () => {
    updateNameInputOrder();
    previewSelectedStyle();
  });

  document.querySelector('.input-panel').addEventListener('input', e => {
    if (!isResetting && e.target.id !== 'tweetPreview') previewSelectedStyle();
  });

  document.querySelector('.input-panel').addEventListener('change', e => {
    if (isResetting) return;
    if (!['reportStyle', 'fontVariant', 'nameInputOrder', 'systemSelect'].includes(e.target.id)) previewSelectedStyle();
  });

  $('systemSelect').addEventListener('change', () => {
    updateCustomSystemInput();
    if (['emoklore_en', 'emoklore_ja'].includes($('systemSelect').value)) {
      document.querySelectorAll('#gmContainer .gm-role').forEach(role => { role.value = 'DL'; });
    }
    previewSelectedStyle();
  });
}

bindEvents();
renderAsciiOptions();
addGM();
addPlayer();
addPlayer();
setTodayPlaceholder();
updateCustomSystemInput();
runSelfTests();
previewSelectedStyle();
