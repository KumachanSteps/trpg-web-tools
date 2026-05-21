import { I18N } from './i18l.js';
let currentLanguage = 'ja';
export function setLanguage(lang) { if (I18N[lang]) currentLanguage = lang; }
export function getText(key) { return I18N[currentLanguage]?.[key] || I18N.ja[key] || key; }
