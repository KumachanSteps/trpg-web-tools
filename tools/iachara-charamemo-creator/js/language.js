window.CharamemoLanguage = (() => {
  let current = "ja";
  function toggle() {
    current = current === "ja" ? "en" : "ja";
    return current;
  }
  function get() {
    return current;
  }
  return { toggle, get };
})();
