(function () {
  const storageKey = "trpgPortalLanguage";
  const listeners = [];

  function getI18n() {
    return window.TRPG_PORTAL_I18N || null;
  }

  function getDefaultLanguage() {
    const i18n = getI18n();
    return i18n?.defaultLanguage || "ja";
  }

  function isSupportedLanguage(language) {
    const i18n = getI18n();
    return Boolean(i18n?.ui?.[language]);
  }

  function getLanguage() {
    const savedLanguage = localStorage.getItem(storageKey);

    if (savedLanguage && isSupportedLanguage(savedLanguage)) {
      return savedLanguage;
    }

    return getDefaultLanguage();
  }

  function getLocalizedValue(value, language = getLanguage()) {
    if (value && typeof value === "object") {
      return value[language] || value.ja || value.en || "";
    }

    return value || "";
  }

  function resolvePath(source, path) {
    return path.split(".").reduce((current, key) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      return current[key];
    }, source);
  }

  function t(path) {
    const i18n = getI18n();

    if (!i18n) {
      return path;
    }

    const language = getLanguage();
    const defaultLanguage = getDefaultLanguage();
    const currentValue = resolvePath(i18n.ui[language], path);
    const fallbackValue = resolvePath(i18n.ui[defaultLanguage], path);

    return currentValue || fallbackValue || path;
  }

  function updateMetaTags() {
    document.documentElement.lang = getLanguage();
    document.title = t("meta.title");

    const metaDescription = document.querySelector('meta[name="description"]');

    if (metaDescription) {
      metaDescription.setAttribute("content", t("meta.description"));
    }
  }

  function updateTextElements() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
  }

  function updatePlaceholderElements() {
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
  }

  function updateAriaLabelElements() {
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
  }

  function updateLanguageButtons() {
    const language = getLanguage();

    document.querySelectorAll(".language-button[data-lang]").forEach((button) => {
      const isActive = button.dataset.lang === language;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function applyLanguage() {
    updateMetaTags();
    updateTextElements();
    updatePlaceholderElements();
    updateAriaLabelElements();
    updateLanguageButtons();
  }

  function setLanguage(language) {
    if (!isSupportedLanguage(language)) {
      return;
    }

    localStorage.setItem(storageKey, language);
    applyLanguage();

    listeners.forEach((listener) => {
      listener(language);
    });
  }

  function onChange(listener) {
    if (typeof listener !== "function") {
      return;
    }

    listeners.push(listener);
  }

  function initLanguageButtons() {
    document.querySelectorAll(".language-button[data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        setLanguage(button.dataset.lang);
      });
    });
  }

  window.TRPGLanguage = {
    getLanguage,
    setLanguage,
    getLocalizedValue,
    t,
    applyLanguage,
    onChange,
  };

  document.addEventListener("DOMContentLoaded", () => {
    initLanguageButtons();
    applyLanguage();
  });
})();