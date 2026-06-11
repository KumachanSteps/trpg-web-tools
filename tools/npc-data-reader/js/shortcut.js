/* NPCデータリーダー shortcut.js
   v1.467: shortcut drawer, usage drawer, keyboard shortcuts, and localized messages. */
(function(){
  const $ = (s) => document.querySelector(s);

  function toast(message){
    if (window.NPCDataReader && typeof window.NPCDataReader.toast === 'function') {
      window.NPCDataReader.toast(message);
      return;
    }
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1400);
  }

  function panel(id){ return $(id); }
  function isOpen(id){ return panel(id)?.classList.contains('open'); }

  function setPanel(id, btnId, open){
    const p = panel(id);
    const btn = $(btnId);
    if (!p) return;
    p.classList.toggle('open', open);
    p.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeAllPanels(){
    setPanel('#shortcutPanel', '#shortcutBtn', false);
    setPanel('#usageSlidePanel', '#usageJumpBtn', false);
  }

  function toggleShortcutPanel(){
    const next = !isOpen('#shortcutPanel');
    closeAllPanels();
    setPanel('#shortcutPanel', '#shortcutBtn', next);
  }

  function toggleUsagePanel(){
    const next = !isOpen('#usageSlidePanel');
    closeAllPanels();
    setPanel('#usageSlidePanel', '#usageJumpBtn', next);
  }

  function anyPanelOpen(){
    return isOpen('#shortcutPanel') || isOpen('#usageSlidePanel');
  }

  async function pasteNpcInfoFromClipboard(){
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast(window.NPCDataReaderLanguage?.t('noClipboardText') || 'クリップボードに貼り付け可能なテキストがありません');
        return;
      }
      const rawInput = $('#rawInput');
      if (!rawInput) return;
      rawInput.value = text;
      rawInput.focus();
      toast(window.NPCDataReaderLanguage?.t('clipboardPasted') || 'クリップボードのNPC情報を貼り付けました');
    } catch (error) {
      toast(window.NPCDataReaderLanguage?.t('clipboardError') || 'クリップボードを読み取れませんでした');
    }
  }

  function resetInputDataWithConfirm(){
    const ok = window.confirm(window.NPCDataReaderLanguage?.t('resetConfirm') || '入力データをリセットします。よろしいですか？');
    if (!ok) return;
    if (window.NPCDataReader && typeof window.NPCDataReader.resetToDefault === 'function') {
      window.NPCDataReader.resetToDefault();
    } else {
      const rawInput = $('#rawInput');
      if (rawInput) rawInput.value = '';
    }
    toast(window.NPCDataReaderLanguage?.t('resetDone') || '入力データをリセットしました');
  }

  document.addEventListener('click', function(e){
    if (e.target.closest('#shortcutBtn')) toggleShortcutPanel();
    if (e.target.closest('#shortcutCloseBtn')) setPanel('#shortcutPanel', '#shortcutBtn', false);
    if (e.target.closest('#usageJumpBtn')) toggleUsagePanel();
    if (e.target.closest('#usageCloseBtn')) setPanel('#usageSlidePanel', '#usageJumpBtn', false);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      if (anyPanelOpen()) {
        e.preventDefault();
        closeAllPanels();
      } else {
        e.preventDefault();
        resetInputDataWithConfirm();
      }
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod || !e.shiftKey) return;

    const key = e.key.toLowerCase();
    if (key === 'v') {
      e.preventDefault();
      pasteNpcInfoFromClipboard();
    }
    if (key === 't') {
      e.preventDefault();
      $('#themeBtn')?.click();
    }
    if (key === 'c') {
      e.preventDefault();
      $('#copyJsonBtn')?.click();
    }
  });

  window.NPCShortcutPanel = {
    open: () => setPanel('#shortcutPanel', '#shortcutBtn', true),
    close: () => setPanel('#shortcutPanel', '#shortcutBtn', false),
    toggle: toggleShortcutPanel
  };
  window.NPCUsagePanel = {
    open: () => setPanel('#usageSlidePanel', '#usageJumpBtn', true),
    close: () => setPanel('#usageSlidePanel', '#usageJumpBtn', false),
    toggle: toggleUsagePanel
  };
})();


// v1.47 X share button
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('xShareBtn');
    if (!btn) return;
    btn.addEventListener('click', function(){
      const lang = window.NPCDataReaderLanguage?.current || 'ja';
      const text = lang === 'en'
        ? 'I used NPC Data Reader, a TRPG support tool that turns scenario NPC data into chat palettes and CCFOLIA NPC character JSON.'
        : 'NPCデータリーダーを使って、シナリオNPC情報からチャットパレットとCCFOLIA用NPC駒JSONを作成しました。';
      const url = 'https://kumachansteps.github.io/trpg-web-tools/npc-data-reader/';
      const intent = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
      window.open(intent, '_blank', 'noopener,noreferrer,width=720,height=640');
    });
  });
})();
