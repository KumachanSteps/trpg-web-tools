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
    AUTHOR: 'author'
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
      KPC: 'ᴋᴘᴄ',
      'KP/KPC': 'ᴋᴘ/ᴋᴘᴄ',
      SGM: 'ꜱɢᴍ',
      DPC: 'ᴅᴘᴄ',
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
    // 先頭PLの「枠」で PL/PC・PC/PL が明示されていればそれを優先。
    // それ以外は「名前入力順」メニュー (nameOrder) に従う。
    if (slot === 'PL/PC') return 'PL/PC';
    if (slot === 'PC/PL') return 'PC/PL';
    if (data.nameOrder === 'plpc') return 'PL/PC';
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

  // テンプレートの囲み線。装飾パネルの「罫線」タブも同じものを使い、長さを揃える
  const FRAME_LINES = Object.freeze({
    lineSandwich: '⟡.· ⎯⎯⎯⎯⎯⎯⎯⎯ ⟡.·',
    thinRule: '────────────',
    heavyRule: '━━━╋━━━━╋━━━',
    star: '✦   ┈┈┈┈┈┈┈┈┈┈   ✦',
    doubleLine: '══════════════',
    cornerTop: '◤￣￣￣￣￣￣￣￣￣',
    cornerBottom: '＿＿＿＿＿＿＿＿＿◢',
    heart: 'ෆ・┈・┈・⊹ ・┈・┈・ෆ',
    moonStar: '─── ･ ｡☆*☽*☆ﾟ.─────',
    asterisk: '✼••┈┈••✼••┈┈••✼',
    dotFrame: '⟡.·*.··················⟡.·*.',
    handwritten: '┈┈┈┈┈┈┈┈┈',
    handwrittenEnd: '┈┈┈┈┈┈┈┈┈ᝰ✍︎ ꙳⋆'
  });

  // ---- 15種のテンプレート（囲み装飾つき） ----
  // 日付・タグ・敬称略の注記は入れない。感想は renderParts で囲みの外に付ける。

  const sys = data => part(TARGET_TYPES.SYSTEM, data.system);
  const scen = data => part(TARGET_TYPES.SCENARIO, data.scenario);
  const end = data => part(TARGET_TYPES.END, data.result);

  function gmLines(data, { indent = '', separator = '：', small = false } = {}) {
    const out = [];
    data.gms.forEach(gm => out.push(fixed(indent), ...roleParts(gm, { small, separator }), lineBreak()));
    return out;
  }

  function playerLines(data, { indent = '', slotSep = '：', nameSep = ' / ', withSlot = true } = {}) {
    const out = [];
    data.players.forEach(player => {
      out.push(fixed(indent));
      const slot = withSlot ? slotParts(player) : [];
      if (slot.length) out.push(...slot, fixed(slotSep));
      out.push(...playerNameParts(player, data, nameSep), lineBreak());
    });
    return out;
  }

  function slotHeaderValue(data) {
    const shown = data.players.find(shouldShowSlot);
    const mode = participantHeaderValue(data).replace('/', ' / ');
    if (!shown) return mode;
    const prefix = String(shown.slot).replace(/\d+$/, '');
    return `${prefix} / ${mode}`;
  }

  // ｜KP ↵ 　名前 のようにラベルと名前を2行にする
  function labeledGmLines(data, { mark = '｜', indent = '　', small = false } = {}) {
    const out = [];
    data.gms.forEach(gm => out.push(fixed(mark), part(TARGET_TYPES.ROLE, small ? smallRole(gm.role) : gm.role), lineBreak(), fixed(indent), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    return out;
  }

  function lineSandwichBuild(data) {
    const line = FRAME_LINES.lineSandwich;
    return lineJoin([
      sys(data), lineBreak(), fixed('『'), scen(data), fixed('』'), lineBreak(),
      fixed(line + '\n'), ...gmLines(data),
      part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data),
      fixed(line + '\n'), end(data)
    ]);
  }

  function thinRuleBuild(data) {
    const line = FRAME_LINES.thinRule;
    return lineJoin([
      fixed(line + '\n'), sys(data), lineBreak(), fixed('「'), scen(data), fixed('」'), blankLine(),
      ...gmLines(data),
      part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data), lineBreak(),
      end(data), lineBreak(), fixed(line)
    ]);
  }

  function heavyRuleBuild(data) {
    const line = FRAME_LINES.heavyRule;
    return lineJoin([
      fixed(line + '\n'), sys(data), fixed('『'), scen(data), fixed('』'), lineBreak(),
      ...gmLines(data), lineBreak(),
      part(TARGET_TYPES.PARTICIPANT_HEADER, slotHeaderValue(data)), lineBreak(),
      ...playerLines(data, { slotSep: ' ┊ ' }),
      fixed(line + '\n'), end(data)
    ]);
  }

  function starFrameBuild(data) {
    const line = FRAME_LINES.star;
    return lineJoin([
      fixed(line + '\n'), fixed('　'), sys(data), lineBreak(), fixed('　　'), scen(data), blankLine(),
      ...gmLines(data, { indent: '　', separator: '┊' }),
      fixed('　'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'bar')), lineBreak(),
      ...playerLines(data, { indent: '　', slotSep: ' ', nameSep: ' | ' }),
      fixed('　── '), end(data), fixed(' ──\n'), fixed(line)
    ]);
  }

  function doubleLineBuild(data) {
    const line = FRAME_LINES.doubleLine;
    return lineJoin([
      fixed(line + '\n'), fixed('　'), sys(data), lineBreak(), fixed('　『'), scen(data), fixed('』'), lineBreak(), fixed(line + '\n'),
      ...gmLines(data),
      ...playerLines(data), lineBreak(),
      end(data)
    ]);
  }

  function cornerBuild(data) {
    return lineJoin([
      // 囲みはシステム名とタイトルだけ。参加者は囲みの下に字下げで並べる
      fixed(FRAME_LINES.cornerTop + '\n'), fixed('　'), sys(data), lineBreak(), fixed('　　『'), scen(data), fixed('』'), lineBreak(),
      fixed(FRAME_LINES.cornerBottom), blankLine(),
      ...gmLines(data, { indent: '　' }),
      ...playerLines(data, { indent: '　' }), lineBreak(),
      end(data)
    ]);
  }

  function heartLineBuild(data) {
    const line = FRAME_LINES.heart;
    return lineJoin([
      sys(data), lineBreak(), fixed(line + '\n'), fixed('【 '), scen(data), fixed(' 】'), blankLine(),
      ...labeledGmLines(data),
      fixed('｜'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'dot')), lineBreak(),
      ...playerLines(data, { indent: '　', slotSep: ' ' }), lineBreak(),
      fixed(line + '\n'), end(data)
    ]);
  }

  function labelBuild(data) {
    const out = [fixed('⧉ '), sys(data), lineBreak(), fixed('.　'), scen(data), lineBreak()];
    if (data.author) out.push(fixed('.　'), part(TARGET_TYPES.AUTHOR, data.author), lineBreak());
    out.push(lineBreak(), ...labeledGmLines(data),
      fixed('｜'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data, 'dot')), lineBreak(),
      ...playerLines(data, { indent: '　', slotSep: ' ' }), lineBreak(),
      fixed('　- '), end(data), fixed(' -'));
    return lineJoin(out);
  }

  function titleBracketBuild(data) {
    const out = [sys(data), lineBreak(), fixed('◣ '), scen(data), fixed(' ◥'), blankLine()];
    data.gms.forEach(gm => out.push(fixed('- '), ...roleParts(gm, { separator: ' ' }), lineBreak()));
    out.push(...playerLines(data, { indent: '- ', slotSep: ' ', nameSep: '　' }), lineBreak(), fixed('➤ '), end(data));
    return lineJoin(out);
  }

  function ribbonBuild(data) {
    const out = [sys(data), lineBreak(), fixed('‧₊˚ ୨ '), scen(data), fixed(' ୧ ˚₊'), blankLine()];
    data.gms.forEach(gm => out.push(part(TARGET_TYPES.ROLE, gm.role), fixed('…\n　'), part(TARGET_TYPES.GM_NAME, gm.name), lineBreak()));
    out.push(part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), fixed('…\n'),
      ...playerLines(data, { indent: '　', slotSep: ' ' }), lineBreak(),
      fixed('‧₊˚ '), end(data), fixed(' ˚₊'));
    return lineJoin(out);
  }

  function moonStarBuild(data) {
    const line = FRAME_LINES.moonStar;
    return lineJoin([
      fixed(line + '\n'), fixed('　'), sys(data), lineBreak(), fixed('　『'), scen(data), fixed('』'), blankLine(),
      ...gmLines(data, { indent: '　' }),
      fixed('　'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data, { indent: '　' }), lineBreak(),
      fixed('　'), end(data), lineBreak(), fixed(line)
    ]);
  }

  function asteriskBuild(data) {
    const line = FRAME_LINES.asterisk;
    return lineJoin([
      fixed(line + '\n'), fixed('　'), sys(data), lineBreak(), fixed('　'), scen(data), lineBreak(), fixed(line + '\n'),
      ...gmLines(data),
      part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data), lineBreak(),
      end(data)
    ]);
  }

  function dotFrameBuild(data) {
    const line = FRAME_LINES.dotFrame;
    return lineJoin([
      fixed(line + '\n'), fixed(' '), sys(data), lineBreak(), fixed('　◤ '), scen(data), fixed(' ◢'), blankLine(),
      ...gmLines(data, { indent: ' ', separator: ' ' }),
      fixed(' '), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data, { indent: ' ┗ ', slotSep: ' ', nameSep: ' | ' }), lineBreak(),
      fixed(' '), end(data), lineBreak(), fixed(line)
    ]);
  }

  function handwrittenBuild(data) {
    const line = FRAME_LINES.handwritten;
    return lineJoin([
      sys(data), lineBreak(), fixed('⌜ '), scen(data), fixed(' ⌟'), lineBreak(), fixed(line + '\n'),
      ...labeledGmLines(data, { mark: '✧', indent: '　▹' }),
      fixed('✧'), part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data, { indent: '　▹', slotSep: ' ' }), lineBreak(),
      fixed('✧'), end(data), lineBreak(), fixed(FRAME_LINES.handwrittenEnd)
    ]);
  }

  function blockBuild(data) {
    return lineJoin([
      fixed('▮　'), sys(data), fixed('　▮'), blankLine(), fixed('　『 '), scen(data), fixed(' 』'), blankLine(),
      ...gmLines(data, { separator: ' ' }),
      part(TARGET_TYPES.PARTICIPANT_HEADER, participantHeaderValue(data)), lineBreak(),
      ...playerLines(data, { indent: '　', slotSep: ' ', nameSep: '｜' }), lineBreak(),
      fixed('▮ '), end(data)
    ]);
  }

  const REPORT_STYLES = [
    { id: 'line-sandwich', label: '⟡ ライン挟み：⟡.· ⎯⎯⎯ ⟡.·', build: lineSandwichBuild },
    { id: 'thin-rule', label: '─ 細罫線囲み：────', build: thinRuleBuild },
    { id: 'heavy-rule', label: '━╋━ 太罫線：HO ┊ PC / PL', build: heavyRuleBuild },
    { id: 'star-frame', label: '✦ スター囲み：✦ ┈┈┈ ✦', build: starFrameBuild },
    { id: 'double-line', label: '═ 二重線タイトル枠：════', build: doubleLineBuild },
    { id: 'corner', label: '◤ ◢ コーナー囲み：◤￣￣ ＿＿◢', build: cornerBuild },
    { id: 'heart-line', label: 'ෆ ハートライン：ෆ・┈・┈・ෆ', build: heartLineBuild },
    { id: 'label', label: '⧉ ｜ ラベル見出し：⧉ ｜KP ｜PC・PL', build: labelBuild },
    { id: 'title-bracket', label: '◣ ◥ タイトル括り：◣ タイトル ◥ ➤', build: titleBracketBuild },
    { id: 'ribbon', label: '୨୧ リボン：‧₊˚ ୨ タイトル ୧ ˚₊', build: ribbonBuild },
    { id: 'moon-star', label: '☽ 月星ライン囲み：─── ･ ｡☆*☽*☆ﾟ.───', build: moonStarBuild },
    { id: 'asterisk', label: '✼ アスタリスク囲み：✼••┈┈••✼', build: asteriskBuild },
    { id: 'dot-frame', label: '⟡ ドット囲み：⟡.·*.·····⟡.·*.', build: dotFrameBuild },
    { id: 'handwritten', label: '⌜ ⌟ 手書き見出し：⌜ タイトル ⌟ ✧ ▹', build: handwrittenBuild },
    { id: 'block', label: '▮ ▮ ブロック：▮ システム ▮', build: blockBuild }
  ];

  // 装飾パネル。mode: line=独立した1行で挿入 / wrap=選択範囲を左右から挟む / 省略=カーソル位置に挿入
  // 端末によって表示が崩れやすい文字（他言語の結合記号・絵文字化する記号・異体字セレクタ付き）は入れない
  const ASCII_ART_COLLECTION = {
    line: {
      label: '罫線',
      mode: 'line',
      items: [
        { label: '⟡ ⎯⎯ ⟡', value: FRAME_LINES.lineSandwich },
        { label: '────', value: FRAME_LINES.thinRule },
        { label: '━╋━╋━', value: FRAME_LINES.heavyRule },
        { label: '✦ ┈┈ ✦', value: FRAME_LINES.star },
        { label: '════', value: FRAME_LINES.doubleLine },
        { label: '◤￣￣', value: FRAME_LINES.cornerTop },
        { label: '＿＿◢', value: FRAME_LINES.cornerBottom },
        { label: 'ෆ・┈・ෆ', value: FRAME_LINES.heart },
        { label: '─ ☆*☽*☆ ─', value: FRAME_LINES.moonStar },
        { label: '✼••┈┈••✼', value: FRAME_LINES.asterisk },
        { label: '⟡.·*.···⟡', value: FRAME_LINES.dotFrame },
        { label: '┈┈┈┈', value: FRAME_LINES.handwritten },
        { label: '┈┈ᝰ✍︎', value: FRAME_LINES.handwrittenEnd },
        { label: '─ ⋅ ✩ ⋅ ─', value: '──────── ⋅ ✩ ⋅ ────────' },
        { label: '꒰ঌ ┈┈ ໒꒱', value: '꒰ঌ ┈┈┈┈┈┈┈┈ ໒꒱' },
        { label: '◈ ━━ ◈', value: '◈ ━━━━━━━━━━━━━━ ◈' },
        { label: '°.✩┈┈✩.°', value: '°.✩┈┈∘*┈୨୧┈*∘┈┈✩.°' },
        { label: '──⋆.˚✧', value: '──⋆.˚✧        ✧⋆.˚──' },
        { label: '₊˚‿︵୨୧', value: '. ₊˚ ‿︵‿୨୧ · ♡ · ୨୧‿︵‿ ˚₊ .' },
        { label: '☾ ˖°˖☆ ˖°˖☽', value: 'ᐧᐧᐧᐧᐧ☾ ˖°˖☆ ˖°˖☽ᐧᐧᐧᐧᐧ' }
      ]
    },
    bracket: {
      label: '括弧',
      mode: 'wrap',
      items: [
        { label: '『 』', open: '『', close: '』' },
        { label: '「 」', open: '「', close: '」' },
        { label: '【 】', open: '【 ', close: ' 】' },
        { label: '〔 〕', open: '〔', close: '〕' },
        { label: '⌜ ⌟', open: '⌜ ', close: ' ⌟' },
        { label: '◣ ◥', open: '◣ ', close: ' ◥' },
        { label: '◤ ◢', open: '◤ ', close: ' ◢' },
        { label: '୨ ୧', open: '୨ ', close: ' ୧' },
        { label: '‧₊˚ ୨ ୧ ˚₊', open: '‧₊˚ ୨ ', close: ' ୧ ˚₊' },
        { label: '▮ ▮', open: '▮　', close: '　▮' },
        { label: '- -', open: '- ', close: ' -' }
      ]
    },
    mark: {
      label: '見出し記号',
      items: ['▸', '▹', '➤', '┗', '┊', '｜', '⧉', '✧', '✦', '⟡', '◆', '◈', '❖', '❏', '▮', '†', '◎', '⋆', '✼', 'ෆ', '★', '☆']
        .map(value => ({ label: value, value }))
    },
    accent: {
      label: 'ワンポイント',
      items: [
        { label: '.+:ﾟ+｡.☆', value: '.+:ﾟ+｡.☆' },
        { label: '✧･ﾟ:*', value: '✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧' },
        { label: '✦⋆˙₊⟡', value: '✦⋆˙₊⟡' },
        { label: '✩.*･｡ﾟ', value: '✩.*･｡ﾟ' },
        { label: '*:.｡..｡.:*･ﾟ', value: '*:.｡..｡.:*･ﾟ' },
        { label: '⋆˙⟡', value: '⋆˙⟡' },
        { label: '☆彡', value: '☆彡' },
        { label: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ', value: 'Cᵃˡˡ ᵒᶠ Cᵗʰᵘˡʰᵘ' }
      ]
    }
  };

  function renderParts(data) {
    const style = REPORT_STYLES.find(item => item.id === data.style) || REPORT_STYLES[0];
    const parts = style.build(data);
    const targets = new Set(style.styleTargets || COMMON_STYLE_TARGETS);
    const body = parts.map(item => {
      if (!item || item.value == null) return '';
      if (targets.has(item.type) && data.styleText) return data.styleText(item.value, data.fontVariant);
      return item.value;
    }).join('').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
    // 感想は囲みの外（末尾）に付ける。未入力のときは〔感想〕の目印を置き、プレビュー上で書き換えられるようにする
    const memo = String(data.memo || '').trim() || String(data.memoPlaceholder || '').trim();
    return memo ? `${body}\n\n${memo}` : body;
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
