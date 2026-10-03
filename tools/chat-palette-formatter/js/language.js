window.ChatPaletteLanguage = (() => {
  const STORAGE_KEY = "chatPaletteFormatterLanguage";
  const LANGUAGES = ["ja", "en", "ko"];
  let currentLanguage = window.CHAT_PALETTE_I18N?.[localStorage.getItem(STORAGE_KEY)]
    ? localStorage.getItem(STORAGE_KEY)
    : "ja";

  function t(key, vars = {}) {
    const dictionary = window.CHAT_PALETTE_I18N?.[currentLanguage] || window.CHAT_PALETTE_I18N.ja;
    const fallback = window.CHAT_PALETTE_I18N?.ja?.[key] || key;
    return String(dictionary[key] || fallback).replace(/\{(\w+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`);
  }

  function setLanguage(language) {
    if (!window.CHAT_PALETTE_I18N?.[language]) return;
    currentLanguage = language;
    localStorage.setItem(STORAGE_KEY, language);
    applyTranslations();
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
  }

  function getLanguage() {
    return currentLanguage;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLanguage;
    document.title = t("meta.title");
    document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => { element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder)); });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(element => { element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel)); });
    document.querySelectorAll("[data-i18n-title]").forEach(element => { element.setAttribute("title", t(element.dataset.i18nTitle)); });
    document.querySelectorAll("[data-language]").forEach(button => {
      const active = button.dataset.language === currentLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    document.querySelectorAll("[data-language]").forEach(button => {
      button.addEventListener("click", () => setLanguage(button.dataset.language));
    });
  });

  return {
    t,
    setLanguage,
    getLanguage,
    applyTranslations
  };
})();
