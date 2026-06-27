const diceCommands = [
  'SRESB',
  'RESB',
  'SCCB',
  'SCBR',
  'SCC',
  'CCB',
  'CBR',
  'CC',
  'S1D100',
  '1D100',
  'SD100',
  'D100',
  'D％',
  'D%'
];

const includedTabs = ['main', 'メイン', 'ho'];
const excludedTabs = ['雑談', 'other', 'info', 'ダイス', 'dice', 'おはらい', 'お祓い', '運試し'];

function prepareText(raw) {
  const source = String(raw || '');
  if (!looksLikeHtml(source)) return source;

  const doc = new DOMParser().parseFromString(source, 'text/html');
  if (!doc.body) return source;

  const lines = extractHtmlLogLines(doc);

  return lines.length
    ? lines.join(LF)
    : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function extractHtmlLogLines(doc) {
  return Array.from(doc.body.querySelectorAll('p'))
    .map(extractHtmlLogLine)
    .filter(Boolean);
}

function extractHtmlLogLine(paragraph) {
  const spans = Array.from(paragraph.querySelectorAll('span'))
    .map(span => normalizeInlineLogText(decodeHtml(span.textContent || '')))
    .filter(Boolean);

  return spans.length >= 3 && isTabLabel(spans[0])
    ? `${spans[0]} ${spans[1]}：${normalizeInlineLogText(spans.slice(2).join(' '))}`
    : normalizeInlineLogText(decodeHtml(paragraph.textContent || ''));
}

function normalizeInlineLogText(value) {
  return normalizeNewlines(value)
    .split(LF)
    .map(part => cleanLine(part))
    .filter(Boolean)
    .join(' ');
}

function filterLines(lines) {
  return lines.filter(line => {
    if (isRuleExplanationLine(line)) return false;

    const dropTabs = $('dropTabs');
    const onlyD100 = $('onlyD100');

    const shouldDropTabs = !dropTabs || dropTabs.checked;
    const shouldOnlyD100 = !onlyD100 || onlyD100.checked;

    if (shouldDropTabs && !shouldKeepTabLine(line)) return false;
    if (shouldOnlyD100 && !looksLikeD100Roll(line)) return false;
    return true;
  });
}

function shouldKeepTabLine(line) {
  const tab = extractLeadingTab(line);
  return !tab || isIncludedTab(tab);
}

function isIncludedTab(tab) {
  const normalized = normalizeTabName(tab);
  if (!normalized) return true;

  if (excludedTabs.some(word => normalized.includes(normalizeTabName(word)))) return false;
  if (normalized === 'ho' || normalized.startsWith('ho')) return true;

  if (includedTabs.some(word => {
    const item = normalizeTabName(word);
    return normalized === item || normalized.startsWith(item) || normalized.includes(item);
  })) {
    return true;
  }

  /*
    CCFOLIAの秘匿タブは [鬼] [魔女] [天使] [狼] のような
    任意名になりやすい。明示的な除外タブ以外は秘匿候補として保持する。
  */
  return true;
}

function extractRollData(lines) {
  const rolls = [];

  lines.forEach((line, index) => {
    const name = extractCharacterName(line);
    const usable = isUsableCharacterName(name);
    const values = extractRollsFromLine(line);

    values.forEach(value => {
      rolls.push({
        value,
        character: usable ? name : '不明',
        line,
        lineNo: index + 1
      });
    });
  });

  return rolls;
}

function extractStructuredLineParts(line) {
  const source = String(line || '').trim();
  const tab = extractLeadingTab(source);

  let rest = source;

  if (tab) {
    const end = source.indexOf(']');
    rest = end >= 0 ? source.slice(end + 1).trim() : source;
  }

  const colonIndexes = ['：', ':']
    .map(separator => rest.indexOf(separator))
    .filter(index => index >= 0);

  if (!colonIndexes.length) {
    return { tab, speaker: '', body: rest };
  }

  const colonIndex = Math.min(...colonIndexes);
  const speaker = rest.slice(0, colonIndex).trim();
  const body = rest.slice(colonIndex + 1).trim();

  return { tab, speaker, body };
}

function extractCharacterName(line) {
  const parts = extractStructuredLineParts(line);

  if (parts.speaker) {
    return cleanCharacterName(parts.speaker);
  }

  const text = String(line || '').trim();
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return '不明';

  let before = text.slice(0, diceIndex).trim();
  if (!before) return '不明';

  before = trimTrailingSeparators(trimTrailingRollPrefix(removeLeadingTab(before)));
  return cleanCharacterName(before);
}

function extractRollsFromLine(line) {
  const text = String(line || '');
  const parts = extractStructuredLineParts(text);
  const body = parts.body || text;

  if (isExcludedD100Command(body) || !hasOutcomeOrThresholdD100(body)) return [];

  const diceIndex = findDiceCommandIndex(body);

  if (diceIndex < 0) return [];

  const afterCommand = body.slice(diceIndex);

  const d100ListValues = extractD100ListValues(afterCommand);
  if (d100ListValues.length) return d100ListValues;

  const numbers = extractNumbersAfterResultMarkers(afterCommand);
  if (numbers.length) return normalizeD100ResultNumbers(afterCommand, numbers);

  return extractNumbersAfterWords(afterCommand, ['出目']);
}

function normalizeD100ResultNumbers(text, numbers) {
  if (!Array.isArray(numbers) || numbers.length <= 1) return numbers || [];

  const source = String(text || '');

  /*
    x2 CCB ... #1 / #2 のような複数判定は全結果を数える。
    一方、CoC7のボーナス・ペナルティ出力など
    CC<=70 ... > 66 > 66 > レギュラー成功
    のように1判定内で複数の結果マーカーが出る場合は最終値のみを数える。
  */
  if (/#\s*\d+/i.test(source)) return numbers;
  if (/^\s*[xｘ×]\s*\d+/i.test(source)) return numbers;

  return [numbers[numbers.length - 1]];
}

function extractD100ListValues(text) {
  /*
    v1.375:
    5D100 / 5B100 のような複数d100リストは
    成功/失敗の判定ロールではないため集計しない。
  */
  return [];
}

function findDiceCommandIndex(text) {
  const source = String(text || '');
  const upper = source.toUpperCase();
  const indexes = [];

  /*
    CC1 / CC2 / CCB1 / SCC1 など、CoC 7版の
    ボーナス・ペナルティダイス付きコマンドも
    CC / CCB / SCC と同じ系列のダイスコマンドとして扱う。
  */
  const commandPatterns = [
    /SRESB/i,
    /RESB/i,

    /SCCB\d*/i,
    /SCBR\d*/i,
    /SCC\d*/i,

    /CCB\d*/i,
    /CBR\d*/i,
    /CC\d*/i,

    /S1D100/i,
    /1D100/i,
    /SD100/i,
    /D100/i,
    /D％/i,
    /D%/i
  ];

  commandPatterns.forEach(pattern => {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const regex = new RegExp(pattern.source, flags);
    let match;

    while ((match = regex.exec(source)) !== null) {
      const index = match.index;
      const command = match[0];

      const prev = index > 0 ? upper[index - 1] : '';
      const next = upper[index + command.length] || '';

      const validPrev = !prev || !isAsciiAlphaNumber(prev);
      const validNext = !next || !isAsciiAlphaNumber(next);

      if (validPrev && validNext) indexes.push(index);
    }
  });

  return indexes.length ? Math.min(...indexes) : -1;
}

function extractNumbersAfterResultMarkers(text) {
  const values = [];
  const markers = ['＞', '>', '→'];

  for (let i = 0; i < text.length; i++) {
    if (!markers.includes(text[i])) continue;

    const number = readRollResultNumberFrom(text, i + 1);
    if (number !== null && number >= 1 && number <= 100) {
      values.push(number);
    }
  }

  return values;
}

function readRollResultNumberFrom(text, start) {
  let i = start;

  while (i < text.length && isWhitespace(text[i])) i++;
  if (i >= text.length || text[i] < '0' || text[i] > '9') return null;

  let digits = '';

  while (i < text.length && text[i] >= '0' && text[i] <= '9') {
    digits += text[i++];
  }

  if (['d', 'D', 'Ｄ', 'ｄ'].includes(text[i] || '')) return null;

  return isValidRollResultTail(text.slice(i)) ? Number(digits) : null;
}

function isValidRollResultTail(tail) {
  const text = String(tail || '').trim();
  const lower = text.toLowerCase();

  return !text
    || ['＞', '>', '→', '#'].some(marker => text.startsWith(marker))
    || ['成功', '失敗', '決定的成功', '致命的失敗', 'クリティカル', 'ファンブル'].some(word => text.startsWith(word))
    || lower.startsWith('success')
    || lower.startsWith('fail');
}

function extractNumbersAfterWords(text, words) {
  const lower = String(text || '').toLowerCase();
  const values = [];

  words.forEach(word => {
    const index = lower.indexOf(String(word).toLowerCase());
    if (index < 0) return;

    const number = readNumberFrom(text, index + String(word).length);
    if (number !== null && number >= 1 && number <= 100) {
      values.push(number);
    }
  });

  return values;
}

function looksLikeHtml(value) {
  const source = String(value || '').toLowerCase();
  return ['<html', '<body', '<p', '<span', '<div', '<br', '&lt;', '&gt;']
    .some(token => source.includes(token));
}

function looksLikeD100Roll(line) {
  if (isRuleExplanationLine(line)) return false;

  const parts = typeof extractStructuredLineParts === 'function'
    ? extractStructuredLineParts(line)
    : { body: String(line || '') };
  const body = parts.body || String(line || '');

  if (isExcludedD100Command(body)) return false;
  if (!hasOutcomeOrThresholdD100(body)) return false;

  return findDiceCommandIndex(body) >= 0 && hasRollResultMarker(body);
}

function hasRollResultMarker(line) {
  const text = String(line || '');
  const diceIndex = findDiceCommandIndex(text);

  if (diceIndex < 0) return false;

  return extractNumbersAfterResultMarkers(text.slice(diceIndex)).length > 0;
}

function isExcludedD100Command(text) {
  const source = String(text || '');

  /*
    5D100 / 5B100 のような複数d100リストは
    成功/失敗判定ではないため、統計対象から除外する。
  */
  return /(^|[^A-Za-z0-9])(?:[2-9]\d*)\s*[DBＢｄｂ]100([^A-Za-z0-9]|$)/i.test(source);
}

function hasOutcomeOrThresholdD100(text) {
  const source = String(text || '');
  const lower = source.toLowerCase();

  const hasOutcome = [
    '成功',
    '失敗',
    '決定的',
    '致命的',
    'スペシャル',
    'クリティカル',
    'ファンブル'
  ].some(word => source.includes(word))
    || lower.includes('success')
    || lower.includes('failure')
    || lower.includes('fail')
    || lower.includes('regular')
    || lower.includes('hard')
    || lower.includes('extreme');

  const hasThreshold = /(?:S?CCB\d*|S?CC\d*|CBR\d*|SCBR\d*|S?1D100|1D100|D100|D％|D%)\s*(?:<=|=<|<|≤)/i.test(source)
    || /\(\s*1D100\s*(?:<=|=<|<|≤)/i.test(source);

  /*
    1D100 (1D100) ＞ 56 のような単なる運試し/無目的ロールは除外し、
    CCB<= / CC<= / 1D100<= のような判定ロールだけを残す。
  */
  return hasOutcome || hasThreshold;
}

function isRuleExplanationLine(line) {
  const text = String(line || '').trim();
  const tab = normalizeTabName(extractLeadingTab(text));
  const body = removeLeadingTab(text).trim();
  const compact = normalizeTabName(body);

  if (!text) return true;
  if (tab === 'info' || tab.includes('info')) return true;
  if (tab.includes('ルール') || tab.includes('rule')) return true;
  if (body.startsWith('ルール説明：') || body.startsWith('ルール説明:')) return true;
  if (body.startsWith('【7版ルール】') || body.startsWith('[7版ルール]')) return true;
  if (compact.startsWith('ルール説明')) return true;
  if (compact.startsWith('7版ルール')) return true;
  if (compact.startsWith('◆7版ルール')) return true;

  return false;
}

function isTabLabel(value) {
  const source = String(value || '').trim();
  return source.startsWith('[') && source.endsWith(']');
}

function extractLeadingTab(line) {
  const source = String(line || '').trim();

  if (!source.startsWith('[')) return '';

  const end = source.indexOf(']');
  return end >= 0 ? source.slice(1, end) : '';
}

function normalizeTabName(tab) {
  return String(tab || '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '')
    .replaceAll('　', '')
    .replaceAll(TAB, '');
}

function removeLeadingTab(value) {
  const source = String(value || '').trim();

  if (!source.startsWith('[')) return source;

  const end = source.indexOf(']');
  return end >= 0 ? source.slice(end + 1).trim() : source;
}

function trimTrailingSeparators(value) {
  let source = String(value || '').trim();
  const separators = [':', '：', '-', '―', '＞', '>', '(', '（'];

  while (source && separators.includes(source[source.length - 1])) {
    source = source.slice(0, -1).trim();
  }

  return source;
}

function trimTrailingRollPrefix(value) {
  let source = String(value || '')
    .trim()
    .replaceAll('×', 'x')
    .replaceAll('Ｘ', 'x')
    .replaceAll('ｘ', 'x');

  const lower = source.toLowerCase();
  const index = lower.lastIndexOf('x');

  if (index < 0) return source;

  const tail = lower.slice(index + 1).trim();

  if (!tail || tail.split('').some(character => character < '0' || character > '9')) {
    return source;
  }

  return trimTrailingSeparators(source.slice(0, index).trim()) || source;
}

function cleanCharacterName(name) {
  let source = String(name || '');

  ['[', ']', '「', '」', '『', '』', '【', '】'].forEach(character => {
    source = source.replaceAll(character, '');
  });

  return source.trim() || '不明';
}

function isUsableCharacterName(name) {
  const source = String(name || '').trim();

  if (!source || source === '不明') return false;
  if (['(', ')', '（', '）'].includes(source)) return false;

  return source
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('（', '')
    .replaceAll('）', '')
    .trim() !== '';
}
