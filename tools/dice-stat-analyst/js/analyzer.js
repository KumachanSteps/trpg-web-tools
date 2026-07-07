function classifyRoll(roll) {
  if (roll && roll.outcome) {
    return shouldDowngradeCriticalFumble(roll)
      ? downgradeCriticalFumble(roll)
      : roll.outcome;
  }

  const target = roll && Number.isInteger(roll.target)
    ? roll.target
    : extractTargetNumber(roll ? roll.line : '');

  return target !== null && roll
    ? roll.value <= target ? 'Success' : 'Fail'
    : 'Normal';
}

function shouldDowngradeCriticalFumble(roll) {
  if (!roll || (roll.outcome !== 'Critical' && roll.outcome !== 'Fumble')) return false;

  if (roll.isSanityRoll && !isCheckedOption('includeSanityCritFumble')) return true;
  if (roll.isPlainD100Roll && !isCheckedOption('includePlainD100CritFumble')) return true;

  return false;
}

function isCheckedOption(id) {
  const element = $(id);
  return !!element && !!element.checked;
}

function downgradeCriticalFumble(roll) {
  if (roll.outcome === 'Critical') {
    const target = Number.isInteger(roll.target) ? roll.target : extractTargetNumber(roll.line || '');
    return target !== null ? 'Success' : 'Normal';
  }

  if (roll.outcome === 'Fumble') {
    const target = Number.isInteger(roll.target) ? roll.target : extractTargetNumber(roll.line || '');
    return target !== null ? 'Fail' : 'Normal';
  }

  return roll.outcome || 'Normal';
}

function extractTargetNumber(line) {
  const text = String(line || '')
    .replaceAll('＜=', '<=')
    .replaceAll('≦', '<=')
    .replaceAll('＝', '=')
    .toUpperCase();

  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return null;

  const part = text.slice(diceIndex, diceIndex + 120);
  let operatorIndex = part.indexOf('<=');
  let offset = 2;

  if (operatorIndex < 0) {
    operatorIndex = part.indexOf('<');
    offset = 1;
  }

  if (operatorIndex < 0) return null;

  const value = readNumberFrom(part, operatorIndex + offset);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : null;
}

function getOutcomeCounts(rolls) {
  const counts = {
    critical: 0,
    fumble: 0,
    success: 0,
    fail: 0,
    normal: 0
  };

  rolls.forEach(roll => {
    const label = classifyRoll(roll);

    if (label === 'Critical') {
      counts.critical++;
      counts.success++;
    } else if (label === 'Fumble') {
      counts.fumble++;
      counts.fail++;
    } else if (label === 'Success') {
      counts.success++;
    } else if (label === 'Fail') {
      counts.fail++;
    } else {
      counts.normal++;
    }
  });

  return counts;
}

function classificationOrder(label) {
  return {
    Critical: 1,
    Success: 2,
    Normal: 3,
    Fail: 4,
    Fumble: 5
  }[label] || 99;
}

function applyDefaultCharacterVisibility(rolls) {
  const characters = getDetectedCharactersFromRolls(rolls);
  const grouped = groupRollsByCharacter(rolls);
  const threshold = clamp(Number($('autoHideMaxRolls').value || 15), 0, 999);
  const hidden = new Set();

  characters.forEach(name => {
    const count = grouped[name] ? grouped[name].length : 0;
    if (count <= threshold) hidden.add(name);
  });

  state.hiddenCharacters = hidden;
}

function getVisibleRolls() {
  return state.rolls.filter(roll => !state.hiddenCharacters.has(roll.character || '不明'));
}

function getDetectedCharacters() {
  return getDetectedCharactersFromRolls(state.rolls);
}

function getDetectedCharactersFromRolls(rolls) {
  return [...new Set(rolls.map(roll => roll.character || '不明'))]
    .sort(compareCharacterNames);
}

function groupRollsByCharacter(rolls) {
  return rolls.reduce((acc, roll) => {
    const name = roll.character || '不明';
    (acc[name] ||= []).push(roll);
    return acc;
  }, {});
}

function compareCharacterNames(a, b) {
  if (a === '不明') return 1;
  if (b === '不明') return -1;
  return String(a).localeCompare(String(b), 'ja');
}
