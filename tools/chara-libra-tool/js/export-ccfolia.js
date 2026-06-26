(function () {
  'use strict';

  function statusToArray(stats) {
    return ['HP', 'MP', 'SAN'].filter((key) => stats[key] !== undefined).map((key) => {
      const value = stats[key];
      if (value && typeof value === 'object') {
        return { label: key, value: value.value ?? '', max: value.max ?? value.value ?? '' };
      }
      return { label: key, value, max: value };
    });
  }

  function paramsToArray(stats) {
    const excluded = new Set(['HP', 'MP', 'SAN']);
    return Object.entries(stats || {})
      .filter(([key]) => !excluded.has(key))
      .map(([key, value]) => ({ label: key, value: value && typeof value === 'object' ? value.value : value }));
  }

  function build(character) {
    const base = character.source && character.source.ccfoliaRaw && typeof character.source.ccfoliaRaw === 'object'
      ? { ...character.source.ccfoliaRaw }
      : {};

    base.name = character.name;
    base.initiative = character.initiative ?? base.initiative ?? '';
    base.externalUrl = character.externalUrl || base.externalUrl || '';
    base.iconUrl = character.iconUrl || base.iconUrl || '';
    base.commands = character.commands || '';
    base.memo = character.memo || '';
    base.status = statusToArray(character.stats || {});
    base.params = paramsToArray(character.stats || {});
    return base;
  }

  function stringify(character) {
    return JSON.stringify(build(character), null, 2);
  }

  window.CharaLibraExport = { build, stringify };
})();
