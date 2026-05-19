(function(){
  function isMac(){ return navigator.platform.toUpperCase().includes("MAC"); }
  function isMod(event){ return isMac() ? event.metaKey : event.ctrlKey; }

  function openShortcutModal(){
    document.getElementById("shortcutModal")?.showModal();
  }
  function closeShortcutModal(){
    const modal = document.getElementById("shortcutModal");
    if(modal?.open) modal.close();
  }

  window.SessionLogShortcuts = { openShortcutModal, closeShortcutModal };

  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("shortcutHelpBtn")?.addEventListener("click", openShortcutModal);
    document.getElementById("closeShortcutBtn")?.addEventListener("click", closeShortcutModal);

    document.addEventListener("keydown",(event)=>{
      const key = event.key.toLowerCase();
      if(event.key === "Escape"){
        closeShortcutModal();
        window.SessionLogApp?.closeDrawer?.();
        return;
      }
      if(!isMod(event)) return;

      if(key === "j"){
        event.preventDefault();
        document.getElementById("jsonFileInput")?.click();
      }
      if(key === "e"){
        event.preventDefault();
        window.SessionLogApp?.exportJson?.();
      }
      if(key === "n"){
        event.preventDefault();
        window.SessionLogApp?.openSessionDialog?.();
      }
      if(key === "k"){
        event.preventDefault();
        document.getElementById("searchInput")?.focus();
      }
    });
  });
})();
