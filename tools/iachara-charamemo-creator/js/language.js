window.CharamemoLanguage = (() => {
  let current = localStorage.getItem("charamemo-language") || "ja";

  function applyLanguage(lang) {
    current = lang === "en" ? "en" : "ja";
    localStorage.setItem("charamemo-language", current);
    const dict = window.CHARAMEMO_I18N[current] || window.CHARAMEMO_I18N.ja;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    document.documentElement.lang = current === "en" ? "en" : "ja";
  }

  function toggleLanguage() {
    applyLanguage(current === "ja" ? "en" : "ja");
  }

  function getLanguage() {
    return current;
  }

  return { applyLanguage, toggleLanguage, getLanguage };
})();
