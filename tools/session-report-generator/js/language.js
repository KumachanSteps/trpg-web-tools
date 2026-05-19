function initLanguageToggle() {
  const saved = localStorage.getItem('sessionReportGeneratorLang') || 'ja';
  applyI18l(saved);
  document.querySelectorAll('[data-lang-button]').forEach(button => {
    button.classList.toggle('active', button.dataset.langButton === saved);
    button.addEventListener('click', () => {
      const lang = button.dataset.langButton;
      localStorage.setItem('sessionReportGeneratorLang', lang);
      applyI18l(lang);
      document.querySelectorAll('[data-lang-button]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.langButton === lang);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initLanguageToggle);
