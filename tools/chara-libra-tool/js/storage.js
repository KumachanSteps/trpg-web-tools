(function () {
  'use strict';

  const STORAGE_KEY = 'trpg-chara-libra-v1';

  function loadCharacters() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.characters) ? parsed.characters : [];
    } catch (error) {
      console.warn('Failed to load Chara Libra storage:', error);
      return [];
    }
  }

  function saveCharacters(characters) {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      characters,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function exportLibrary(characters) {
    return JSON.stringify({
      tool: 'Chara Libra',
      version: 1,
      exportedAt: new Date().toISOString(),
      characters,
    }, null, 2);
  }

  function importLibrary(text) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.characters)) return parsed.characters;
    throw new Error('ライブラリーJSONとして読み込めませんでした。');
  }

  window.CharaLibraStorage = {
    STORAGE_KEY,
    loadCharacters,
    saveCharacters,
    exportLibrary,
    importLibrary,
  };
})();
