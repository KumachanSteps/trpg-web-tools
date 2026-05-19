(function(){
  const STORAGE_KEY = "sessionLogTool.state.v1";
  const REPORT_GENERATOR_URL = "../session-report-generator/index.html";

  const defaultRows = [
    { id: cryptoId(), date: "2026-05-13", scenario: "星環のダ・カーポ", system: "CoC 6版", role: "PL", gm: "さけひよ", players: "Kuma / Pino", pc: "HO2 星の探究者", status: "新規", time: "4h", note: "DAY3。宇宙への恐怖とRPの噛み合いが最高。", hashtag: "#さけひよダカーポ", longNote: "◆ 好きなシーン\n\n◆ 好きなRP\n\n◆ キャラクター変化\n\n◆ 公開コメント下書き\n" },
    { id: cryptoId(), date: "2026-04-20", scenario: "Good-bye, John･Doe", system: "CoC 6版", role: "PL", gm: "Pino", players: "Kuma / Hoshimi", pc: "HO2 法医学探索者", status: "継続", time: "4h", note: "短時間で鮮烈にテーマが刺さるシナリオ。", hashtag: "#GoodbyeJohnDoe", longNote: "" },
    { id: cryptoId(), date: "2026-03-15", scenario: "累卵", system: "エモクロアTRPG", role: "DL", gm: "自分", players: "Pino / Madoka", pc: "女子高生と人外探索者", status: "新規", time: "6h", note: "刀を振るう女子高生と怪異のコンビが美しい。", hashtag: "#累卵", longNote: "" },
    { id: cryptoId(), date: "2026-02-28", scenario: "黒き嵐が来る前に", system: "CoC 7版", role: "KP", gm: "自分", players: "Test PLs", pc: "博物館探索者たち", status: "新規", time: "3h", note: "黒きファラオ召喚導線のテストプレイ。", hashtag: "#黒き嵐が来る前に", longNote: "" }
  ];

  const defaultColumns = [
    { key: "date", label: "日付", type: "date" },
    { key: "scenario", label: "シナリオ" },
    { key: "system", label: "システム" },
    { key: "role", label: "役割" },
    { key: "gm", label: "GM" },
    { key: "players", label: "PL" },
    { key: "pc", label: "PC" },
    { key: "status", label: "新規 / 継続" },
    { key: "time", label: "時間" },
    { key: "hashtag", label: "ハッシュタグ" },
    { key: "note", label: "メモ" },
    { key: "report", label: "卓報告", locked: true }
  ];

  const optionalColumns = [
    { key: "fav", label: "Fav", desc: "任意のお気に入りマーカー" },
    { key: "ho", label: "HO", desc: "HO番号・PC番号" },
    { key: "ending", label: "Ending", desc: "エンディング名・ルート" },
    { key: "survival", label: "Lost / Survived", desc: "CoCの生還・ロスト結果" },
    { key: "campaign", label: "Campaign", desc: "キャンペーン・シリーズ名" },
    { key: "sessionUrl", label: "Session URL", desc: "ログ、ふせったー、note、X投稿" },
    { key: "scenarioUrl", label: "Scenario URL", desc: "Booth・公式ページ" },
    { key: "kansouUrl", label: "Kansou URL", desc: "公開感想リンク" }
  ];

  let state = loadState();
  let activeId = state.rows[0]?.id || null;
  let draggingKey = null;
  let dragOverKey = null;
  let editingId = null;

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    collectElements();
    bindEvents();
    renderAll();
    exposeApi();
  }

  function collectElements(){
    ["tableHead","tableBody","searchInput","systemFilter","roleFilter","sortSelect","toggleFieldPanelBtn","fieldPanel","closeFieldPanelBtn","optionalFieldsList","createCustomFieldBtn","resetFieldsBtn","jsonFileInput","importJsonBtn","exportJsonBtn","exportTextBtn","textExportOutput","kansouTab","drawerOverlay","kansouDrawer","drawerContent","closeDrawerBtn","sessionDialog","sessionForm","sessionFormFields","longNoteInput","sessionDialogTitle","deleteSessionBtn","addSessionTopBtn"].forEach(id=>{
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents(){
    els.searchInput.addEventListener("input", renderTable);
    els.systemFilter.addEventListener("change", renderTable);
    els.roleFilter.addEventListener("change", renderTable);
    els.sortSelect.addEventListener("change", renderTable);
    els.toggleFieldPanelBtn.addEventListener("click",()=>{ els.fieldPanel.hidden = !els.fieldPanel.hidden; });
    els.closeFieldPanelBtn.addEventListener("click",()=>{ els.fieldPanel.hidden = true; });
    els.createCustomFieldBtn.addEventListener("click", createCustomField);
    els.resetFieldsBtn.addEventListener("click",()=>{ state.columns = clone(defaultColumns); saveAndRender(); });
    els.importJsonBtn.addEventListener("click",()=>els.jsonFileInput.click());
    els.jsonFileInput.addEventListener("change", handleJsonImport);
    els.exportJsonBtn.addEventListener("click", exportJson);
    els.exportTextBtn.addEventListener("click",()=>exportText("date"));
    document.querySelectorAll("[data-export-mode]").forEach(btn=>btn.addEventListener("click",()=>exportText(btn.dataset.exportMode)));
    els.kansouTab.addEventListener("click", openDrawer);
    els.closeDrawerBtn.addEventListener("click", closeDrawer);
    els.drawerOverlay.addEventListener("click", closeDrawer);
    els.addSessionTopBtn.addEventListener("click",()=>openSessionDialog());
    els.sessionForm.addEventListener("submit", handleSessionSave);
    document.getElementById("closeSessionDialogBtn")?.addEventListener("click",()=>els.sessionDialog.close());
    els.deleteSessionBtn.addEventListener("click", deleteEditingSession);
  }

  function renderAll(){
    normalizeState();
    renderFilters();
    renderOptionalFields();
    renderStats();
    renderTable();
    renderDrawer();
  }

  function normalizeState(){
    if(!state.rows.length){
      state.rows = [];
      activeId = null;
    } else if(!activeId || !state.rows.some(row=>row.id===activeId)){
      activeId = state.rows[0].id;
    }
  }

  function renderFilters(){
    const systemValue = els.systemFilter.value;
    const roleValue = els.roleFilter.value;
    const systems = unique(state.rows.map(row=>row.system).filter(Boolean));
    const roles = unique(state.rows.map(row=>row.role).filter(Boolean));
    els.systemFilter.innerHTML = `<option value="">${t("allSystems")}</option>` + systems.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    els.roleFilter.innerHTML = `<option value="">${t("allRoles")}</option>` + roles.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    els.systemFilter.value = systemValue;
    els.roleFilter.value = roleValue;
  }

  function renderStats(){
    document.getElementById("statSessions").textContent = String(state.rows.length);
    document.getElementById("statScenarios").textContent = String(unique(state.rows.map(r=>r.scenario).filter(Boolean)).length);
    document.getElementById("statPlayedTime").textContent = `${sumHours(state.rows)}h`;
    const people = new Set();
    state.rows.forEach(row=>splitPeople(row.players).concat(splitPeople(row.gm)).forEach(p=>p && people.add(p)));
    document.getElementById("statPlayedWith").textContent = String(people.size);
  }

  function renderOptionalFields(){
    els.optionalFieldsList.innerHTML = "";
    optionalColumns.forEach(col=>{
      const already = state.columns.some(c=>c.key===col.key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "optional-field-button";
      button.disabled = already;
      button.innerHTML = `<span><strong>${escapeHtml(col.label)}</strong><small>${escapeHtml(col.desc)}</small></span><span class="add-chip">${already ? "追加済" : "追加"}</span>`;
      button.addEventListener("click",()=>{
        if(already) return;
        state.columns.splice(Math.max(state.columns.length-1,0),0,{ key: col.key, label: col.label });
        saveAndRender();
      });
      els.optionalFieldsList.appendChild(button);
    });
  }

  function renderTable(){
    const rows = getFilteredRows();
    renderTableHead();
    els.tableBody.innerHTML = "";
    rows.forEach(row=>{
      const tr = document.createElement("tr");
      tr.className = row.id === activeId ? "selected-row" : "";
      tr.addEventListener("click",()=>{ activeId = row.id; renderTable(); renderDrawer(); });
      tr.addEventListener("dblclick",()=>openSessionDialog(row.id));
      state.columns.forEach(col=>{
        const td = document.createElement("td");
        td.className = getCellClass(col.key);
        td.appendChild(cellContent(row,col));
        tr.appendChild(td);
      });
      els.tableBody.appendChild(tr);
    });

    const addTr = document.createElement("tr");
    addTr.innerHTML = `<td class="add-row-cell" colspan="${state.columns.length}"><button class="add-row-button" type="button"><span>＋</span><span>${t("addSession")}</span></button></td>`;
    addTr.querySelector("button").addEventListener("click",()=>openSessionDialog());
    els.tableBody.appendChild(addTr);
  }

  function renderTableHead(){
    const tr = document.createElement("tr");
    state.columns.forEach(col=>{
      const th = document.createElement("th");
      th.dataset.key = col.key;
      th.draggable = !col.locked;
      th.className = `${col.locked ? "" : "draggable-header"} ${draggingKey===col.key ? "dragging" : ""} ${dragOverKey===col.key ? "drag-over" : ""}`;
      th.title = col.locked ? "この列は固定です" : "ドラッグで項目を並び替え";
      th.innerHTML = `${col.locked ? "" : '<span class="drag-handle">⋮⋮</span>'}<span>${escapeHtml(col.label)}</span>${col.locked ? '<span class="fixed-label">固定</span>' : ""}`;
      th.addEventListener("dragstart",event=>handleDragStart(event,col.key));
      th.addEventListener("dragover",event=>handleDragOver(event,col.key));
      th.addEventListener("drop",event=>handleDrop(event,col.key));
      th.addEventListener("dragend",handleDragEnd);
      tr.appendChild(th);
    });
    els.tableHead.innerHTML = "";
    els.tableHead.appendChild(tr);
  }

  function cellContent(row,col){
    if(col.key === "scenario") return html(`<span class="cell-scenario">${escapeHtml(row.scenario || "")}</span>`);
    if(col.key === "system") return html(`<span class="system-pill">${escapeHtml(row.system || "")}</span>`);
    if(col.key === "hashtag") return html(`<span class="hashtag-cell">${escapeHtml(row.hashtag || "")}</span>`);
    if(col.key === "fav") return html(`<span>${row.fav ? "★" : "☆"}</span>`);
    if(col.key === "report"){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "report-button";
      btn.textContent = "卓報告 ↗";
      btn.addEventListener("click",event=>{ event.stopPropagation(); openReportGenerator(row); });
      return btn;
    }
    return document.createTextNode(row[col.key] || "");
  }

  function renderDrawer(){
    const row = state.rows.find(r=>r.id===activeId);
    if(!row){
      els.drawerContent.innerHTML = `<p>選択中の卓はありません。</p>`;
      return;
    }
    els.drawerContent.innerHTML = `
      <div class="drawer-card dark">
        <p class="drawer-label">選択中の卓</p>
        <h3>${escapeHtml(row.scenario || "")}</h3>
        <div class="drawer-meta">
          <div>日 ${escapeHtml(row.date || "")}</div>
          <div>時 ${escapeHtml(row.time || "")}</div>
          <div>札 ${escapeHtml(row.system || "")}</div>
          <div>役 ${escapeHtml(row.role || "")}</div>
        </div>
      </div>
      <div class="drawer-card"><p class="drawer-label">GM / KP / DL</p><strong>${escapeHtml(row.gm || "")}</strong></div>
      <div class="drawer-card"><p class="drawer-label">PL / PC</p><strong>${escapeHtml(row.players || "")}</strong><p>${escapeHtml(row.pc || "")}</p></div>
      <div class="drawer-card"><p class="drawer-label">短いメモ</p><p>${escapeHtml(row.note || "")}</p><p class="hashtag-cell">卓報告用ハッシュタグ: ${escapeHtml(row.hashtag || "")}</p></div>
      <div class="drawer-card"><p class="drawer-label">長文感想</p><textarea id="drawerLongNote">${escapeHtml(row.longNote || "")}</textarea></div>
      <div class="drawer-card report-link-card"><strong>卓報告ジェネレーター連携</strong><p>この行のシナリオ / システム / GM / PL / PC / ハッシュタグ情報を卓報告ジェネレーターに渡す想定です。</p><button id="drawerReportBtn" type="button">卓報告ジェネレーターを開く ›</button></div>
      <div class="drawer-actions"><button id="drawerDuplicateBtn" type="button">複製</button><button id="drawerDeleteBtn" class="danger-soft" type="button">⌫ 削除</button></div>
    `;
    document.getElementById("drawerLongNote")?.addEventListener("input",event=>{
      row.longNote = event.target.value;
      saveState();
    });
    document.getElementById("drawerReportBtn")?.addEventListener("click",()=>openReportGenerator(row));
    document.getElementById("drawerDuplicateBtn")?.addEventListener("click",()=>duplicateRow(row.id));
    document.getElementById("drawerDeleteBtn")?.addEventListener("click",()=>deleteRow(row.id));
  }

  function getFilteredRows(){
    const q = (els.searchInput.value || "").trim().toLowerCase();
    const system = els.systemFilter.value;
    const role = els.roleFilter.value;
    let rows = [...state.rows].filter(row=>{
      if(system && row.system !== system) return false;
      if(role && row.role !== role) return false;
      if(!q) return true;
      return Object.values(row).join(" ").toLowerCase().includes(q);
    });
    rows.sort((a,b)=>{
      const sort = els.sortSelect.value;
      if(sort === "oldest") return String(a.date).localeCompare(String(b.date));
      if(sort === "scenario") return String(a.scenario).localeCompare(String(b.scenario),"ja");
      if(sort === "gm") return String(a.gm).localeCompare(String(b.gm),"ja");
      return String(b.date).localeCompare(String(a.date));
    });
    return rows;
  }

  function openSessionDialog(id){
    editingId = id || null;
    const row = id ? state.rows.find(r=>r.id===id) : { id: cryptoId(), date: new Date().toISOString().slice(0,10), scenario:"", system:"CoC 6版", role:"PL", gm:"", players:"", pc:"", status:"新規", time:"", note:"", hashtag:"", longNote:"" };
    els.sessionDialogTitle.textContent = id ? "卓情報を編集" : "卓を追加";
    els.deleteSessionBtn.hidden = !id;
    els.sessionFormFields.innerHTML = "";
    state.columns.filter(c=>c.key !== "report").forEach(col=>{
      const label = document.createElement("label");
      label.innerHTML = `<span>${escapeHtml(col.label)}</span><input name="${escapeHtml(col.key)}" value="${escapeAttr(row[col.key] || "")}" />`;
      els.sessionFormFields.appendChild(label);
    });
    els.longNoteInput.value = row.longNote || "";
    els.sessionDialog.showModal();
  }

  function handleSessionSave(event){
    event.preventDefault();
    const form = new FormData(els.sessionForm);
    const row = editingId ? state.rows.find(r=>r.id===editingId) : { id: cryptoId() };
    state.columns.filter(c=>c.key !== "report").forEach(col=>{ row[col.key] = form.get(col.key) || ""; });
    row.longNote = els.longNoteInput.value;
    if(!editingId) state.rows.push(row);
    activeId = row.id;
    els.sessionDialog.close();
    saveAndRender();
  }

  function deleteEditingSession(){
    if(editingId) deleteRow(editingId);
    els.sessionDialog.close();
  }

  function duplicateRow(id){
    const row = state.rows.find(r=>r.id===id);
    if(!row) return;
    const copy = { ...row, id: cryptoId(), scenario: `${row.scenario || ""} Copy` };
    state.rows.push(copy);
    activeId = copy.id;
    saveAndRender();
  }

  function deleteRow(id){
    if(!confirm("この卓ログを削除しますか？")) return;
    state.rows = state.rows.filter(r=>r.id!==id);
    if(activeId === id) activeId = state.rows[0]?.id || null;
    saveAndRender();
  }

  function createCustomField(){
    const label = prompt("追加する項目名を入力してください");
    if(!label) return;
    const key = `custom_${Date.now()}`;
    state.columns.splice(Math.max(state.columns.length-1,0),0,{key,label});
    saveAndRender();
  }

  function handleDragStart(event,key){
    const col = state.columns.find(c=>c.key===key);
    if(col?.locked){ event.preventDefault(); return; }
    draggingKey = key;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain",key);
    renderTableHead();
  }
  function handleDragOver(event,key){
    event.preventDefault();
    dragOverKey = key;
    renderTableHead();
  }
  function handleDrop(event,targetKey){
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
    if(sourceKey && targetKey && sourceKey !== targetKey){
      const sourceIndex = state.columns.findIndex(c=>c.key===sourceKey);
      const targetIndex = state.columns.findIndex(c=>c.key===targetKey);
      if(sourceIndex >= 0 && targetIndex >= 0){
        const [moved] = state.columns.splice(sourceIndex,1);
        state.columns.splice(targetIndex,0,moved);
        saveState();
      }
    }
    handleDragEnd();
    renderTable();
  }
  function handleDragEnd(){ draggingKey = null; dragOverKey = null; renderTableHead(); }

  function openDrawer(){ els.kansouDrawer.classList.add("open"); els.drawerOverlay.hidden = false; els.kansouDrawer.setAttribute("aria-hidden","false"); els.kansouTab.classList.add("hide"); renderDrawer(); }
  function closeDrawer(){ els.kansouDrawer.classList.remove("open"); els.drawerOverlay.hidden = true; els.kansouDrawer.setAttribute("aria-hidden","true"); els.kansouTab.classList.remove("hide"); }

  function openReportGenerator(row){
    const params = new URLSearchParams({ scenario: row.scenario || "", system: row.system || "", gm: row.gm || "", pl: row.players || "", pc: row.pc || "", date: row.date || "", hashtag: row.hashtag || "", note: row.note || "" });
    window.open(`${REPORT_GENERATOR_URL}?${params.toString()}`,"_blank");
  }

  function exportJson(){
    const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `session-log-tool-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleJsonImport(event){
    const file = event.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const imported = JSON.parse(String(reader.result));
        state = { rows: imported.rows || [], columns: imported.columns || clone(defaultColumns) };
        activeId = state.rows[0]?.id || null;
        saveAndRender();
      }catch(error){ alert("JSONの読み込みに失敗しました。"); }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function exportText(mode){
    const rows = getFilteredRows();
    let output = "";
    if(mode === "date") output = rows.map((r,i)=>`${i+1}. ${r.scenario} / ${r.system} / ${r.role} / ${r.date}`).join("\n");
    if(mode === "system") output = groupedText(rows,"system");
    if(mode === "gm") output = groupedText(rows,"gm");
    if(mode === "players") output = groupedText(rows,"players");
    els.textExportOutput.value = output;
  }

  function groupedText(rows,key){
    const groups = {};
    rows.forEach(row=>{
      const group = row[key] || "未設定";
      if(!groups[group]) groups[group] = [];
      groups[group].push(row);
    });
    return Object.entries(groups).map(([group,items])=>`【${group}】\n${items.map((r,i)=>`${i+1}. ${r.scenario}`).join("\n")}`).join("\n\n");
  }

  function saveAndRender(){ saveState(); renderAll(); }
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(_error){}
    return { rows: clone(defaultRows), columns: clone(defaultColumns) };
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function cryptoId(){ return `session_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
  function unique(values){ return [...new Set(values)]; }
  function splitPeople(value){ return String(value||"").split(/[、,\/]/).map(v=>v.trim()).filter(Boolean); }
  function sumHours(rows){ return rows.reduce((sum,row)=>sum + (parseFloat(String(row.time||"").match(/[\d.]+/)?.[0] || "0") || 0),0); }
  function getCellClass(key){ return key === "note" ? "note-cell" : ""; }
  function html(markup){ const span = document.createElement("span"); span.innerHTML = markup; return span; }
  function escapeHtml(value){ return String(value).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/'/g,"&#039;"); }
  function t(key){
    const lang = window.SessionLogLanguage?.getLanguage?.() || "ja";
    return window.SESSION_LOG_I18N?.[lang]?.[key] || window.SESSION_LOG_I18N?.ja?.[key] || key;
  }

  function exposeApi(){
    window.SessionLogApp = { exportJson, openSessionDialog, closeDrawer };
  }
})();
