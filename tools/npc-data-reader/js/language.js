/* NPCデータリーダー language.js
   v1.472: JP/EN UI switch. Translation data is defined in i18l.js. */
(function(){
  const STORAGE_KEY = 'npc-data-reader-lang';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const dictRoot = window.NPC_DATA_READER_I18L || { ja: {}, en: {} };

  function currentLang(){
    return window.NPCDataReaderLanguage?.current || 'ja';
  }
  function t(key){
    const lang = currentLang();
    return (dictRoot[lang] && dictRoot[lang][key]) || (dictRoot.ja && dictRoot.ja[key]) || key;
  }
  function setText(selector, key){
    const el = $(selector);
    if (el) el.textContent = t(key);
  }
  function setAllText(selector, keys){
    const els = $$(selector);
    els.forEach((el, i) => { if (keys[i]) el.textContent = t(keys[i]); });
  }
  function setAttr(selector, attr, key){
    const el = $(selector);
    if (el) el.setAttribute(attr, t(key));
  }

  function applyStaticTranslations(){
    document.title = t('pageTitle');
    setText('h1', 'appTitle');
    setText('.sub', 'appSubtitle');
    setText('#usageJumpBtn', 'usage');
    setText('#shortcutBtn', 'shortcuts');
    setText('#themeBtn', 'theme');
    setAttr('#xShareBtn', 'title', 'xShareTitle');

    setText('#shortcutPanel .shortcut-title', 'shortcuts');
    setText('#shortcutPanel .shortcut-sub', 'shortcutSub');
    setAttr('#shortcutCloseBtn', 'aria-label', 'closeShortcutLabel');
    setAllText('#shortcutPanel .shortcut-item span', ['scEsc', 'scPaste', 'scTheme', 'scCopyJson']);

    setText('#usageSlidePanel .shortcut-title', 'usage');
    setText('#usageSlidePanel .shortcut-sub', 'usageSub');
    setAttr('#usageCloseBtn', 'aria-label', 'closeUsageLabel');
    const usageBlocks = $$('#usageSlidePanel .usage-slide-block');
    if (usageBlocks[0]) {
      usageBlocks[0].querySelector('h2').textContent = t('usageBasicTitle');
      usageBlocks[0].querySelector('ol').innerHTML = `
        <li>${t('usageBasic1')}</li>
        <li><strong>${t('usageBasic2Prefix')}</strong> ${t('usageBasic2')}</li>
        <li>${t('usageBasic3')}</li>
        <li>${t('usageBasic4')} <code>commands</code> ${t('usageBasic4Suffix')}</li>
        <li><strong>${t('usageBasic5Prefix')}</strong> ${t('usageBasic5Middle')} <strong>${t('usageBasic5Json')}</strong> ${t('usageBasic5Suffix')}</li>`;
    }
    if (usageBlocks[1]) {
      usageBlocks[1].querySelector('h2').textContent = t('usageSafetyTitle');
      usageBlocks[1].innerHTML = `<h2>${t('usageSafetyTitle')}</h2><p>${t('usageSafety1')} <code>memo</code> ${t('usageSafety1Suffix')}</p><p>${t('usageSafety2')}</p>`;
    }
    if (usageBlocks[2]) {
      usageBlocks[2].innerHTML = `<h2>${t('usageNotationTitle')}</h2><p>${t('usageNotation1')}</p>`;
    }

    const cardTitles = $$('.card-title');
    const titleKeys = ['leftTitle', 'usage', 'editTitle', 'paletteTitle', 'jsonTitle'];
    cardTitles.forEach((el, i) => { if (titleKeys[i]) el.textContent = t(titleKeys[i]); });
    setText('.left-input-card .pill', 'pdfTxt');
    setAttr('#rawInput', 'placeholder', 'rawPlaceholder');
    setText('#parseBtn', 'parse');
    setText('#sampleBtn', 'sample');
    setText('#clearBtn', 'clear');
    setText('.left-input-card .hint', 'leftHint');
    setAllText('.usage-card .usage li', ['usageList1', 'usageList2', 'usageList3', 'usageList4', 'usageList5', 'usageList6']);

    setAllText('#middleCol label', ['npcName', 'npcTitle', 'system', 'resolved', 'hp', 'mp', 'san', 'db', 'build', 'move', 'STR', 'CON', 'SIZ', 'DEX', 'APP', 'POW', 'INT', 'EDU']);
    const options = $$('#systemMode option');
    ['autoMode', 'coc7', 'coc6', 'generic'].forEach((key, i) => { if (options[i]) options[i].textContent = t(key); });
    setAllText('#middleCol .section-label', ['status', 'abilities', 'combat', 'armor', 'skills', 'charMemo']);
    const ths = $$('#middleCol th');
    ['combatName', 'rate', 'damageMemo', '', 'skillName', 'rate', ''].forEach((key, i) => { if (ths[i] && key) ths[i].textContent = t(key); });
    setText('#addCombatBtn', 'addCombat');
    setText('#addSkillBtn', 'addSkill');
    setText('#middleCol .card-body > .hint:last-child', 'memoHint');

    setText('#copyPaletteBtn', 'copy');
    setText('#copyJsonBtn', 'npcJsonCopy');
    setText('#chatPaletteCard .output-note', 'paletteNote');
    setText('#jsonCard .output-note', 'jsonNote');

    const usageNotice = $('#usageNoticePanel');
    if (usageNotice) {
      const linkHtml = '<a href="https://x.com/KumachanSteps" target="_blank" rel="noopener noreferrer">@KumachanSteps</a>';
      const title = usageNotice.querySelector('.usage-notice-title');
      const ps = usageNotice.querySelectorAll('p');
      if (title) title.textContent = t('footerTitle');
      if (ps[0]) ps[0].innerHTML = `${t('footerNotice1Prefix')} ${linkHtml} ${t('footerNotice1Suffix')}`;
      if (ps[1]) ps[1].innerHTML = `${t('footerNotice2Prefix')} ${linkHtml} ${t('footerNotice2Suffix')}`;
    }

    if (window.NPCDataReader && typeof window.NPCDataReader.render === 'function') {
      window.NPCDataReader.render();
    }
  }

  window.NPCDataReaderLanguage = {
    current: localStorage.getItem(STORAGE_KEY) || 'ja',
    t,
    set(lang){
      this.current = lang === 'en' ? 'en' : 'ja';
      localStorage.setItem(STORAGE_KEY, this.current);
      document.documentElement.lang = this.current === 'en' ? 'en' : 'ja';
      applyStaticTranslations();
    },
    toggle(){
      this.set(this.current === 'ja' ? 'en' : 'ja');
      if (window.NPCDataReaderToast) window.NPCDataReaderToast(t('languageChanged'));
      if (window.NPCDataReader && typeof window.NPCDataReader.toast === 'function') window.NPCDataReader.toast(t('languageChanged'));
    },
    apply: applyStaticTranslations
  };

  document.addEventListener('click', function(e){
    if (e.target && e.target.id === 'langBtn') {
      window.NPCDataReaderLanguage.toggle();
    }
  });

  document.addEventListener('DOMContentLoaded', function(){
    window.NPCDataReaderLanguage.set(window.NPCDataReaderLanguage.current);
  });
})();
