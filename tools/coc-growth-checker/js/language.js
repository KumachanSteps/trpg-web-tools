const LANGUAGE_STORAGE_KEY = "cocGrowthCheckerLanguage";
let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";

function getCurrentLanguage(){ return currentLanguage; }

function t(key, fallback = "", vars = {}){
  const dictionary = I18N[currentLanguage] || I18N.ja || {};
  let text = dictionary[key] || fallback || key;
  return String(text).replace(/\{(\w+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`);
}

function tr(key, fallback = "", vars = {}){ return t(key, fallback, vars); }

function setLanguage(language){
  if (!I18N[language]) return;
  currentLanguage = language;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  applyTranslations();
  document.dispatchEvent(new CustomEvent("languagechange", { detail:{ language } }));
}

function applyTranslations(){
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    if (element.dataset.dynamic === "true") return;
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key, element.textContent);
  });
  document.querySelectorAll("[data-i18n-html]").forEach(element => {
    if (element.dataset.dynamic === "true") return;
    const key = element.getAttribute("data-i18n-html");
    element.innerHTML = t(key, element.innerHTML);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.setAttribute("placeholder", t(key, element.getAttribute("placeholder") || ""));
  });
  const languageToggle = document.getElementById("languageToggleBtn");
  if (languageToggle) {
    languageToggle.textContent = currentLanguage === "ja" ? "EN" : "JP";
    languageToggle.setAttribute("aria-label", currentLanguage === "ja" ? t("language.switchToEnglish") : t("language.switchToJapanese"));
  }
  updateDynamicTexts?.();
}

document.addEventListener("DOMContentLoaded", () => applyTranslations());
