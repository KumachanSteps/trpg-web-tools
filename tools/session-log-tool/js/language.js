(function(){
  const KEY = "sessionLogTool.language";

  function getLanguage(){
    return localStorage.getItem(KEY) || "ja";
  }

  function setLanguage(lang){
    localStorage.setItem(KEY, lang);
    applyLanguage(lang);
  }

  function applyLanguage(lang){
    const dict = window.SESSION_LOG_I18N?.[lang] || window.SESSION_LOG_I18N.ja;
    document.documentElement.lang = lang === "en" ? "en" : "ja";
    document.querySelectorAll("[data-i18n]").forEach((el)=>{
      const key = el.dataset.i18n;
      if(dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el)=>{
      const key = el.dataset.i18nPlaceholder;
      if(dict[key]) el.placeholder = dict[key];
    });
    const toggle = document.getElementById("languageToggleBtn");
    if(toggle) toggle.textContent = lang === "ja" ? "JP/EN" : "EN/JP";
  }

  window.SessionLogLanguage = { getLanguage, setLanguage, applyLanguage };

  document.addEventListener("DOMContentLoaded",()=>{
    applyLanguage(getLanguage());
    document.getElementById("languageToggleBtn")?.addEventListener("click",()=>{
      setLanguage(getLanguage() === "ja" ? "en" : "ja");
    });
  });
})();
