(() => {
  window.CharashiLanguage = {
    getCurrentLanguage() {
      return I18L.current || "ja";
    },
    setLanguage(lang) {
      I18L.current = I18L.messages[lang] ? lang : "ja";
    }
  };
})();
