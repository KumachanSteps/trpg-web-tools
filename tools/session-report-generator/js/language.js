window.REPORT_GEN_LANGUAGE = (() => {
  const STORAGE_KEY = 'sessionReportGeneratorLanguage';
  const languages = ['ja', 'en', 'ko'];
  let current = window.REPORT_GEN_I18N?.[localStorage.getItem(STORAGE_KEY)]
    ? localStorage.getItem(STORAGE_KEY)
    : 'ja';

  function t(key, vars = {}) {
    const dictionary = window.REPORT_GEN_I18N?.[current] || window.REPORT_GEN_I18N.ja;
    const value = dictionary[key] || window.REPORT_GEN_I18N?.ja?.[key] || key;
    return String(value).replace(/\{(\w+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`);
  }

  function applyTranslations() {
    document.documentElement.lang = current;
    document.title = t('meta.title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.setAttribute('title', t(el.dataset.i18nTitle)); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === current;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setLanguage(language) {
    if (!window.REPORT_GEN_I18N?.[language]) return;
    current = language;
    localStorage.setItem(STORAGE_KEY, language);
    applyTranslations();
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    document.querySelectorAll('[data-language]').forEach(button => {
      button.addEventListener('click', () => setLanguage(button.dataset.language));
    });
  });

  return { get current() { return current; }, t, setLanguage, applyTranslations };
})();
