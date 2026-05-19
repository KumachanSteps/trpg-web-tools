function applyLanguage(lang){
  const dict=(window.I18L&&window.I18L[lang])||window.I18L.ja;
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18l]').forEach(el=>{
    const key=el.dataset.i18l;
    if(dict[key]) el.textContent=dict[key];
  });
  document.querySelectorAll('[data-lang-button]').forEach(btn=>btn.classList.toggle('active',btn.dataset.langButton===lang));
  localStorage.setItem('sessionReportLang',lang);
}
window.addEventListener('DOMContentLoaded',()=>{
  const lang=localStorage.getItem('sessionReportLang')||'ja';
  document.querySelectorAll('[data-lang-button]').forEach(btn=>btn.addEventListener('click',()=>applyLanguage(btn.dataset.langButton)));
  applyLanguage(lang);
});
