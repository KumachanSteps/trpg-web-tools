(function () {
  window.CharamemoLanguage = {
    current: "ja",
    toggle() {
      this.current = this.current === "ja" ? "en" : "ja";
      return this.current;
    }
  };
})();
