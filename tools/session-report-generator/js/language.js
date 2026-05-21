window.ReportGenLanguage = window.ReportGenLanguage || {
  current: 'ja',
  set(lang) {
    this.current = lang || 'ja';
  },
  t(key) {
    return window.REPORT_GEN_I18N?.[this.current]?.[key] || key;
  }
};
