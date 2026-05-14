const LANGUAGE_STORAGE_KEY = "diceStatAnalystLanguage";

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";

function getCurrentLanguage() {
  return currentLanguage;
}

function setLanguage(language) {
  if (!I18N[language]) return;

  currentLanguage = language;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

  applyTranslations();

  document.dispatchEvent(new CustomEvent("languagechange", {
    detail: { language }
  }));
}

function t(key, fallback = "", vars = {}) {
  const dictionary = I18N[currentLanguage] || I18N.ja || {};
  let text = dictionary[key] || fallback || key;

  return String(text).replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{${name}}`;
  });
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key, element.textContent);
  });

  document.querySelectorAll("[data-i18n-html]").forEach(element => {
    const key = element.getAttribute("data-i18n-html");
    element.innerHTML = t(key, element.innerHTML);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.setAttribute("placeholder", t(key, element.getAttribute("placeholder") || ""));
  });

  document.querySelectorAll("[data-i18n-title]").forEach(element => {
    const key = element.getAttribute("data-i18n-title");
    element.setAttribute("title", t(key, element.getAttribute("title") || ""));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    const key = element.getAttribute("data-i18n-aria-label");
    element.setAttribute("aria-label", t(key, element.getAttribute("aria-label") || ""));
  });
}

function applyLanguage() {
  const lang = state.lang || 'ja';

  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!key) return;

    const text = window.tDiceStat
      ? window.tDiceStat(key, lang)
      : key;

    if (el.classList.contains('input-help')) {
      el.textContent = text;
    } else {
      el.textContent = text;
    }
  });

  const rawInput = $('rawInput');
  if (rawInput) {
    rawInput.placeholder = window.tDiceStat
      ? window.tDiceStat('pastePlaceholder', lang)
      : 'HTMLまたはテキストログを貼り付け';
  }

  const langBtn = $('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = window.tDiceStat
      ? window.tDiceStat('langToggle', lang)
      : 'JP / EN';
  }

  const characterBtn = $('characterControlToggleBtn');
  if (characterBtn) {
    const openText = window.tDiceStat
      ? window.tDiceStat('openCharacterSettings', lang)
      : '表示キャラ設定を開く';

    const closeText = window.tDiceStat
      ? window.tDiceStat('closeCharacterSettings', lang)
      : '表示キャラ設定を隠す';

    characterBtn.textContent = state.showCharacterControls
      ? `${closeText}▲`
      : `${openText}▼`;
  }
}