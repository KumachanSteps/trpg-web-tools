(function () {
  'use strict';

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, '');
  }

  function getStatNumber(character, key) {
    const raw = character.stats && character.stats[key];
    const value = raw && typeof raw === 'object' ? raw.value : raw;
    const num = Number(value);
    return Number.isFinite(num) ? num : -Infinity;
  }

  function matches(character, filters) {
    const q = normalize(filters.query);
    if (q) {
      const haystack = normalize([
        character.name,
        character.reading,
        character.system,
        character.edition,
        character.occupation,
        ...(character.tags || []),
      ].join(' '));
      if (!haystack.includes(q)) return false;
    }

    if (filters.system) {
      const wanted = normalize(filters.system);
      const edition = normalize(character.edition);
      const system = normalize(character.system);
      if (!edition.includes(wanted) && !system.includes(wanted)) return false;
    }

    if (filters.lifeStatus && character.lifeStatus !== filters.lifeStatus) return false;

    if (filters.tag) {
      const wantedTags = String(filters.tag).split(',').map((x) => normalize(x)).filter(Boolean);
      const current = (character.tags || []).map(normalize);
      if (wantedTags.length && !wantedTags.some((tag) => current.some((x) => x.includes(tag)))) return false;
    }

    if (filters.occupation) {
      if (!normalize(character.occupation).includes(normalize(filters.occupation))) return false;
    }

    return true;
  }

  function sort(characters, sortKey) {
    const copy = [...characters];
    const dateValue = (value) => value ? new Date(value).getTime() || 0 : 0;
    copy.sort((a, b) => {
      if (sortKey === 'updatedAsc') return dateValue(a.timestamps?.updatedAt) - dateValue(b.timestamps?.updatedAt);
      if (sortKey === 'nameAsc') return String(a.name).localeCompare(String(b.name), 'ja');
      if (sortKey === 'createdDesc') return dateValue(b.timestamps?.createdAt) - dateValue(a.timestamps?.createdAt);
      if (sortKey === 'sanDesc') return getStatNumber(b, 'SAN') - getStatNumber(a, 'SAN');
      if (sortKey === 'sanAsc') return getStatNumber(a, 'SAN') - getStatNumber(b, 'SAN');
      if (sortKey === 'hpDesc') return getStatNumber(b, 'HP') - getStatNumber(a, 'HP');
      if (sortKey === 'skillsDesc') return (b.skills || []).length - (a.skills || []).length;
      return dateValue(b.timestamps?.updatedAt) - dateValue(a.timestamps?.updatedAt);
    });
    return copy;
  }

  window.CharaLibraFilters = { matches, sort, getStatNumber };
})();
