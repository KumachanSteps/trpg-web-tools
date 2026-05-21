(function () {
  const STORAGE_KEY = "tsukaeru-hashtag-language";

  function getLanguage() {
    return localStorage.getItem(STORAGE_KEY) || "ja";
  }

  function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    const dictionary = window.HASHTAG_SEARCHER_I18N?.[lang] || window.HASHTAG_SEARCHER_I18N?.ja || {};
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (dictionary[key]) element.textContent = dictionary[key];
    });
  }

  window.HashtagLanguage = { getLanguage, setLanguage };

  document.addEventListener("DOMContentLoaded", () => {
    setLanguage(getLanguage());
    const toggle = document.getElementById("languageToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const next = getLanguage() === "ja" ? "en" : "ja";
        setLanguage(next);
      });
    }
  });
})();
