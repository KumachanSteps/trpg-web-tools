window.CharamemoLanguage = (() => {
  let current = "ja";

  function get() {
    return current;
  }

  function set(lang) {
    if (!window.CharamemoI18L || !window.CharamemoI18L[lang]) return current;
    current = lang;
    return current;
  }

  function t(key) {
    const dict = window.CharamemoI18L && window.CharamemoI18L[current] ? window.CharamemoI18L[current] : {};
    return dict[key] || key;
  }

  return { get, set, t };
})();
