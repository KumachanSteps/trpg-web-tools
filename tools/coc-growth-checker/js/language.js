const LANGUAGE_STORAGE_KEY = "cocGrowthCheckerLanguage";
let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";

function getCurrentLanguage(){ return currentLanguage; }
function t(key, fallback = "", vars = {}){
  const dict = I18N[currentLanguage] || I18N.ja || {};
  let text = dict[key] || fallback || key;
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
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key, el.textContent);
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key, el.innerHTML);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key, el.getAttribute("placeholder") || ""));
  });
  const btn = document.getElementById("languageToggleBtn");
  if (btn) btn.textContent = currentLanguage === "ja" ? "EN" : "JP";
}
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  document.getElementById("languageToggleBtn")?.addEventListener("click", () => setLanguage(currentLanguage === "ja" ? "en" : "ja"));
});
