window.ChatPaletteLanguage = (() => {
  let currentLanguage = "ja";

  function t(key) {
    const dictionary = window.CHAT_PALETTE_I18N?.[currentLanguage] || window.CHAT_PALETTE_I18N.ja;
    return dictionary[key] || key;
  }

  function setLanguage(language) {
    if (!window.CHAT_PALETTE_I18N?.[language]) return;
    currentLanguage = language;
  }

  function getLanguage() {
    return currentLanguage;
  }

  return {
    t,
    setLanguage,
    getLanguage
  };
})();
