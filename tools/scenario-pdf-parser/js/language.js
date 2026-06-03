window.SCENARIO_PDF_PARSER_LANGUAGE = (() => {
  const storageKey = "scenarioPdfParser.language";
  const dictionaries = window.SCENARIO_PDF_PARSER_I18L || {};
  let current = localStorage.getItem(storageKey) || "ja";

  function t(key) {
    return dictionaries[current]?.[key] || dictionaries.ja?.[key] || key;
  }

  function getLanguage() {
    return current;
  }

  function setLanguage(nextLanguage) {
    current = dictionaries[nextLanguage] ? nextLanguage : "ja";
    localStorage.setItem(storageKey, current);
    applyLanguage();
    window.dispatchEvent(new CustomEvent("scenario-pdf-parser-language-change", { detail: { language: current } }));
  }

  function toggleLanguage() {
    setLanguage(current === "ja" ? "en" : "ja");
  }

  function applyLanguage() {
    document.documentElement.lang = current;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.placeholder = t(element.dataset.i18nPlaceholder);
    });
  }

  document.addEventListener("DOMContentLoaded", applyLanguage);

  return {
    t,
    getLanguage,
    setLanguage,
    toggleLanguage,
    applyLanguage,
  };
})();
