const DEFAULT_LANGUAGE = "ja";

function getCurrentLanguage() {
  return localStorage.getItem("scenarioSnippetBuilderLanguage") || DEFAULT_LANGUAGE;
}

function setCurrentLanguage(lang) {
  localStorage.setItem("scenarioSnippetBuilderLanguage", lang);
}
