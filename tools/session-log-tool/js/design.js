/*
 * 新・旧デザインの切り替え
 * - <html data-design="paper|classic"> を切り替えるだけで、DOM と保存データ（sessionLogTool.state.v1）には触れない
 * - 選んだデザインは sessionLogTool.design に保存（初期値は新デザイン）
 */
(function(){
  const KEY = "sessionLogTool.design";
  const root = document.documentElement;

  function current(){ return root.getAttribute("data-design") === "classic" ? "classic" : "paper"; }

  function updateButton(btn){
    const paper = current() === "paper";
    btn.textContent = paper ? "旧デザイン" : "新デザイン";
    btn.title = paper ? "以前のデザインに切り替えます（データはそのまま）" : "紙の手帳風の新デザインに切り替えます（データはそのまま）";
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // shell.js が復元した Night 設定を、旧デザインの night-mode にもそろえる
    if(root.getAttribute("data-theme") === "night") document.body.classList.add("night-mode");
    const btn = document.getElementById("designToggleBtn");
    if(!btn) return;
    updateButton(btn);
    btn.addEventListener("click", ()=>{
      const next = current() === "paper" ? "classic" : "paper";
      root.setAttribute("data-design", next);
      try{ localStorage.setItem(KEY, next); }catch(e){ /* 保存できなくても表示は切り替える */ }
      updateButton(btn);
    });
  });
})();
