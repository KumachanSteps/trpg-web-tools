const diceCommands = [
  'SRESB',
  'RESB',
  'SCCB',
  'SCBRB',
  'SCBR',
  'SCC',
  'CCB',
  'CBRB',
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
    const extractedRolls = extractRollsFromLine(line);

    extractedRolls.forEach((roll, rollIndex) => {
      rolls.push({
        ...roll,
        value: Number(roll.value),
        character: usable ? name : '不明',
        line,
        lineNo: index + 1,
        rollIndex: rollIndex + 1
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

  if (isExcludedD100Command(body)) return [];

  const diceIndex = findDiceCommandIndex(body);

  if (diceIndex < 0) return [];

  const afterCommand = body.slice(diceIndex);

  if (!hasRollResultMarker(afterCommand)) return [];
  if (isCbrCommand(afterCommand)) return extractCbrRolls(afterCommand);

  return extractStandardD100Rolls(afterCommand);
}

function extractStandardD100Rolls(text) {
  const source = String(text || '');
  const edition = detectRollEdition(source);
  const target = extractTargetNumberFromText(source);
  const segments = splitMultiRollSegments(source);

  return segments
    .map(segment => {
      const numbers = extractNumbersAfterResultMarkers(segment);
      const normalizedNumbers = normalizeD100ResultNumbers(segment, numbers);
      const value = normalizedNumbers.length ? normalizedNumbers[0] : null;
      const segmentTarget = extractTargetNumberFromText(segment);

      if (value === null) return null;

      return buildRollObject({
        value,
        target: segmentTarget !== null ? segmentTarget : target,
        text: segment,
        context: source,
        edition,
        command: extractDiceCommandName(source)
      });
    })
    .filter(Boolean);
}

function splitMultiRollSegments(text) {
  const source = String(text || '');
  if (!/#\s*\d+/i.test(source)) return [source];

  const matches = source.match(/#\s*\d+[\s\S]*?(?=#\s*\d+|$)/g);
  return matches && matches.length ? matches : [source];
}

function isCbrCommand(text) {
  return /^\s*S?CBRB?\s*\(/i.test(String(text || ''));
}

function extractCbrRolls(text) {
  const source = String(text || '');
  const command = extractDiceCommandName(source);
  const edition = detectRollEdition(source);
  const targets = extractCbrTargets(source);
  const result = extractCbrSharedResult(source);

  if (!result || !targets.length) return [];

  return targets.map((target, index) => {
    const resultText = result.labels[index] || result.labels[0] || source;

    return buildRollObject({
      value: result.value,
      target,
      text: resultText,
      context: source,
      edition,
      command,
      resultText
    });
  });
}

function extractCbrTargets(text) {
  const source = String(text || '');
  const commandMatch = source.match(/S?CBRB?\s*\(([^)]*)\)/i);
  const targetSource = commandMatch
    ? commandMatch[1]
    : (source.match(/\(\s*1D100\s*(?:<=|=<|<|≤)\s*([^)]+)\)/i) || [])[1] || '';

  return targetSource
    .split(',')
    .map(item => Number(String(item).replace(/[^0-9]/g, '')))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 100);
}

function extractCbrSharedResult(text) {
  const source = String(text || '');
  const bracketMatch = source.match(/[＞>→]\s*(\d{1,3})\s*\[([^\]]+)\]/);

  if (bracketMatch) {
    const value = Number(bracketMatch[1]);
    if (!Number.isInteger(value) || value < 1 || value > 100) return null;

    return {
      value,
      labels: bracketMatch[2].split(',').map(item => item.trim()).filter(Boolean)
    };
  }

  const numbers = extractNumbersAfterResultMarkers(source);
  const normalizedNumbers = normalizeD100ResultNumbers(source, numbers);
  const value = normalizedNumbers.length ? normalizedNumbers[0] : null;

  return value === null ? null : { value, labels: [source] };
}

function buildRollObject({ value, target = null, text = '', context = '', edition = 'unknown', command = '', resultText = '' }) {
  const outcome = detectOutcomeFromText(text, edition, target, value);

  return {
    value,
    target,
    outcome,
    edition,
    command,
    isSanityRoll: isSanityRollText(`${context} ${text}`),
    isPlainD100Roll: isPlainD100Command(command),
    resultText: resultText || text
  };
}

function isSanityRollText(text) {
  const source = String(text || '');
  return /SAN値|SANチェック|SAN\s*値|SAN\s*CHECK|正気度ロール|正気度チェック|正気度/i.test(source);
}

function isPlainD100Command(command) {
  return /^(S?1D100|SD100|D100|D％|D%)$/i.test(String(command || ''));
}

function detectOutcomeFromText(text, edition = 'unknown', target = null, value = null) {
  const source = String(text || '');
  const lower = source.toLowerCase();

  if (edition === '6e' || edition === 'unknown') {
    if (source.includes('決定的成功')) return 'Critical';
    if (source.includes('致命的失敗')) return 'Fumble';
  }

  if (edition === '7e' || edition === 'unknown') {
    if (source.includes('クリティカル') || lower.includes('critical')) return 'Critical';
    if (source.includes('ファンブル') || lower.includes('fumble')) return 'Fumble';
  }

  const fail = source.includes('失敗')
    || lower.includes('failure')
    || lower.includes('fail');

  const success = source.includes('成功')
    || source.includes('スペシャル')
    || source.includes('イクストリーム')
    || source.includes('ハード')
    || source.includes('レギュラー')
    || lower.includes('success')
    || lower.includes('regular')
    || lower.includes('hard')
    || lower.includes('extreme');

  if (fail) return 'Fail';
  if (success) return 'Success';

  if (target !== null && value !== null) {
    return value <= target ? 'Success' : 'Fail';
  }

  return 'Normal';
}

function detectRollEdition(text) {
  const command = extractDiceCommandName(text).toUpperCase();

  if (/^S?CCB\d*$/.test(command) || /^S?CBRB?$/.test(command)) return '6e';
  if (/^S?CC\d*$/.test(command)) return '7e';

  return 'unknown';
}

function extractDiceCommandName(text) {
  const source = String(text || '');
  const match = source.match(/S?CBRB?|S?CCB\d*|S?CC\d*|S?1D100|SD100|D100|D％|D%|S?RESB/i);
  return match ? match[0] : '';
}

function extractTargetNumberFromText(text) {
  const source = String(text || '')
    .replaceAll('＜=', '<=')
    .replaceAll('≦', '<=')
    .replaceAll('≤', '<=')
    .replaceAll('＝', '=');

  const match = source.match(/(?:<=|=<|<)\s*(\d{1,3})/);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
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
    v1.376:
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
    /SCBRB/i,
    /SCBR\d*/i,
    /SCC\d*/i,

    /CCB\d*/i,
    /CBRB/i,
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
    || ['＞', '>', '→', '#', '['].some(marker => text.startsWith(marker))
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
