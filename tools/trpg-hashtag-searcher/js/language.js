window.HASHTAG_LANGUAGE = (() => {
  let currentLanguage = "ja";
  function getLanguage() { return currentLanguage; }
  function setLanguage(lang) { currentLanguage = lang === "en" ? "en" : "ja"; document.documentElement.lang = currentLanguage; }
  function toggleLanguage() { setLanguage(currentLanguage === "ja" ? "en" : "ja"); return currentLanguage; }
  return { getLanguage, setLanguage, toggleLanguage };
})();
