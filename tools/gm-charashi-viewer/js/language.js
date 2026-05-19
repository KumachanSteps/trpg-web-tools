(function () {
  const DEFAULT_LANG = "ja";
  let currentLang = localStorage.getItem("charashi-viewer:lang") || DEFAULT_LANG;

  function t(key) {
    const dict = window.CHARASHI_I18L || {};
    return (dict[currentLang] && dict[currentLang][key]) ||
      (dict[DEFAULT_LANG] && dict[DEFAULT_LANG][key]) ||
      key;
  }

  function setLanguage(lang) {
    const dict = window.CHARASHI_I18L || {};
    currentLang = dict[lang] ? lang : DEFAULT_LANG;
    localStorage.setItem("charashi-viewer:lang", currentLang);
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(element => {
      element.title = t(element.dataset.i18nTitle);
    });
    document.title = t("pageTitle");
  }

  window.CharashiLang = {
    t,
    setLanguage,
    getLanguage: () => currentLang
  };

  document.addEventListener("DOMContentLoaded", () => setLanguage(currentLang));
})();
