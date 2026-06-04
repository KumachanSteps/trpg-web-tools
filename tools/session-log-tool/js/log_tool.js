(function(){
  const STORAGE_KEY = "sessionLogTool.state.v1";
  const APP_VERSION = "v1.3";
  const REPORT_GENERATOR_URL = "../session-report-generator/index.html";
  const SELF_NAMES_KEY = "sessionLogTool.selfNames.v1";
  const DEFAULT_SELF_NAMES = ["自分", "自分自身", "GM", "KP", "DL", "くま。", "Kuma", "KumachanSteps"];
  const SYSTEM_OPTIONS = ["CoC 7版", "CoC 6版", "エモクロア", "マダミス"];
  const ROLE_OPTIONS = ["PL", "KP", "GM", "DL"];

  const defaultRows = [
    { id: cryptoId(), date: "2026-05-13", dates: ["2026-05-13"], scenario: "サンプルシナリオA", system: "CoC 6版", role: "PL", gm: "GMサンプル01", players: "PL-A、PL-B", pc: "PC-A", status: "新規", time: "4h", note: "初回セッション。導入と探索中心。", longNote: "◆ 好きなシーン\n\n◆ 好きなRP\n\n◆ キャラクター変化\n\n◆ 公開コメント下書き\n" },
    { id: cryptoId(), date: "2026-04-20", dates: ["2026-04-20"], scenario: "サンプルシナリオB", system: "CoC 7版", role: "KP", gm: "自分", players: "PL-C、PL-D、PL-E", pc: "PC-B / PC-C / PC-D", status: "新規", time: "5h", note: "日程調整済み。次回は中盤から再開。", longNote: "" },
    { id: cryptoId(), date: "2026-03-15", dates: ["2026-03-15"], scenario: "サンプルシナリオC", system: "エモクロア", role: "DL", gm: "自分", players: "PL-F、PL-G", pc: "共鳴者A / 共鳴者B", status: "継続", time: "3.5h", note: "継続キャラクターで参加。感想メモあり。", longNote: "" },
    { id: cryptoId(), date: "2026-02-28", dates: ["2026-02-28"], scenario: "サンプルキャンペーン 第2話", system: "マダミス", role: "PL", gm: "GMサンプル02", players: "PL-H、PL-I、PL-J", pc: "PC-E", status: "継続", time: "6h", note: "キャンペーン進行中。公開用メモは別途作成予定。", longNote: "" }
  ];
  const defaultColumns = [
    { key: "date", label: "日付", type: "date" },
    { key: "scenario", label: "シナリオ" },
    { key: "system", label: "システム" },
    { key: "role", label: "ロール" },
    { key: "gm", label: "GM" },
    { key: "players", label: "PL" },
    { key: "pc", label: "PC" },
    { key: "status", label: "新規 / 継続" },
    { key: "time", label: "時間" },
    { key: "note", label: "メモ" },
    { key: "report", label: "卓報告", locked: true }
  ];

  const optionalColumns = [
    { key: "fav", label: "Fav", desc: "任意のお気に入りマーカー" },
    { key: "ho", label: "HO", desc: "HO番号・PC番号" },
    { key: "ending", label: "Ending", desc: "エンディング名・ルート" },
    { key: "survival", label: "Lost / Survived", desc: "CoCの生還・ロスト結果" },
    { key: "campaign", label: "Campaign", desc: "キャンペーン・シリーズ名" },
    { key: "hashtag", label: "Hashtag", desc: "卓報告・検索用ハッシュタグ" },
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
    ["tableHead","tableBody","searchInput","systemFilter","roleFilter","sortSelect","toggleFieldPanelBtn","fieldPanel","closeFieldPanelBtn","optionalFieldsList","createCustomFieldBtn","resetFieldsBtn","jsonFileInput","importJsonBtn","exportJsonBtn","exportTextBtn","textExportOutput","kansouTab","drawerOverlay","kansouDrawer","drawerContent","closeDrawerBtn","sessionDialog","sessionForm","sessionFormFields","longNoteInput","sessionDialogTitle","deleteSessionBtn","addSessionTopBtn","floatingAddBtn","shortcutPanel"].forEach(id=>{
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
    els.addSessionTopBtn?.addEventListener("click",()=>openSessionDialog());
    els.floatingAddBtn?.addEventListener("click",()=>openSessionDialog());
    els.sessionForm.addEventListener("submit", handleSessionSave);
    els.sessionForm.addEventListener("click", handleDateFieldClick);
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
    if(!Array.isArray(state.columns)) state.columns = clone(defaultColumns);

    state.columns = state.columns.map(col=>{
      if(col.key === "role") return { ...col, label: "ロール" };
      return col;
    });

    state.rows.forEach(row=>{
      normalizeRowDates(row);
      if(row.system === "エモクロアTRPG") row.system = "エモクロア";
      if(row.system === "マルチシステム") row.system = "マダミス";
      if(row.role && normalizeRoleGroup(row.role) === "GM" && !ROLE_OPTIONS.includes(row.role)) row.role = "GM";
    });

    if(!state.migrations?.hashtagOptional){
      state.columns = state.columns.filter(col=>col.key !== "hashtag");
      state.migrations = { ...(state.migrations || {}), hashtagOptional: true };
      saveState();
    }
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
    const systems = unique([...SYSTEM_OPTIONS, ...state.rows.map(row=>row.system).filter(Boolean)]);
    els.systemFilter.innerHTML = `<option value="">${t("allSystems")}</option>` + systems.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    els.roleFilter.innerHTML = `
      <option value="">${t("allRoles")}</option>
      <option value="PL">PL</option>
      <option value="GM">GM / KP / DL</option>
    `;
    els.systemFilter.value = systems.includes(systemValue) ? systemValue : "";
    els.roleFilter.value = ["", "PL", "GM"].includes(roleValue) ? roleValue : "";
  }

  function renderStats(){
    animateStat("statSessions", countSessionDates(state.rows));
    animateStat("statScenarios", countUniqueScenarios(state.rows));
    animateStat("statPlayedTime", sumHours(state.rows), "h");
    animateStat("statPlayedWith", countCoPlayers(state.rows));
  }

  function animateStat(id, target, suffix=""){
    const el = document.getElementById(id);
    if(!el) return;
    const numericTarget = Number(target) || 0;
    const last = Number(el.dataset.lastTarget);
    if(last === numericTarget && el.textContent) return;
    el.dataset.lastTarget = String(numericTarget);
    const duration = 700;
    const start = 0;
    const startedAt = performance.now();
    const hasDecimal = !Number.isInteger(numericTarget);
    function tick(now){
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + (numericTarget - start) * eased;
      el.textContent = `${hasDecimal ? value.toFixed(1).replace(/\.0$/, "") : Math.round(value)}${suffix}`;
      if(progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
      th.className = col.locked ? "" : "draggable-header";
      th.title = col.locked ? "この列は固定です" : "ドラッグで項目を並び替え";
      th.innerHTML = `${col.locked ? "" : '<span class="drag-handle" draggable="true">⋮⋮</span>'}<span>${escapeHtml(col.label)}</span>${col.locked ? '<span class="fixed-label">固定</span>' : ""}`;

      const dragHandle = th.querySelector(".drag-handle") || th;
      dragHandle.addEventListener("dragstart",event=>handleDragStart(event,col.key,th));
      th.addEventListener("dragover",event=>handleDragOver(event,col.key,th));
      th.addEventListener("dragleave",event=>handleDragLeave(event,th));
      th.addEventListener("drop",event=>handleDrop(event,col.key,th));
      th.addEventListener("dragend",handleDragEnd);
      tr.appendChild(th);
    });
    els.tableHead.innerHTML = "";
    els.tableHead.appendChild(tr);
  }

  function cellContent(row,col){
    if(col.key === "date") return html(`<span class="date-cell" title="${escapeAttr(getDateTitle(row))}">${escapeHtml(getDateDisplay(row))}</span>`);
    if(col.key === "scenario") return html(`<span class="cell-scenario">${escapeHtml(row.scenario || "")}</span>`);
    if(col.key === "system") return html(`<span class="system-pill ${systemClass(row.system)}">${escapeHtml(row.system || "")}</span>`);
    if(col.key === "role") return html(`<span class="role-pill ${roleClass(row.role)}">${escapeHtml(row.role || "")}</span>`);
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
          <div>日 ${escapeHtml(getDateDisplay(row))}</div>
          <div>時 ${escapeHtml(row.time || "")}</div>
          <div>札 ${escapeHtml(row.system || "")}</div>
          <div>役 ${escapeHtml(row.role || "")}</div>
        </div>
      </div>
      <div class="drawer-card"><p class="drawer-label">日程</p><strong>${escapeHtml(getDateTitle(row) || "未設定")}</strong></div>
      <div class="drawer-card"><p class="drawer-label">GM / KP / DL</p><strong>${escapeHtml(row.gm || "")}</strong></div>
      <div class="drawer-card"><p class="drawer-label">PL / PC</p><strong>${escapeHtml(row.players || "")}</strong><p>${escapeHtml(row.pc || "")}</p></div>
      <div class="drawer-card"><p class="drawer-label">短いメモ</p><p>${escapeHtml(row.note || "")}</p><p class="drawer-muted">ハッシュタグは「＋ 項目追加」から任意項目として追加できます。</p></div>
      <div class="drawer-card"><p class="drawer-label">長文感想</p><textarea id="drawerLongNote">${escapeHtml(row.longNote || "")}</textarea></div>
      <div class="drawer-card report-link-card"><strong>卓報告ジェネレーター連携</strong><p>この行のシナリオ / システム / GM / PL / PC情報を卓報告ジェネレーターに渡す想定です。ハッシュタグなどの任意項目も追加して渡せます。</p><button id="drawerReportBtn" type="button">卓報告ジェネレーターを開く ›</button></div>
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
      if(role && normalizeRoleGroup(row.role) !== role) return false;
      if(!q) return true;
      return Object.values(row).join(" ").toLowerCase().includes(q);
    });
    rows.sort((a,b)=>{
      const sort = els.sortSelect.value;
      if(sort === "oldest") return getPrimaryDate(a).localeCompare(getPrimaryDate(b));
      if(sort === "scenario") return String(a.scenario).localeCompare(String(b.scenario),"ja");
      if(sort === "gm") return String(a.gm).localeCompare(String(b.gm),"ja");
      return getPrimaryDate(b).localeCompare(getPrimaryDate(a));
    });
    return rows;
  }

  function openSessionDialog(id){
    editingId = id || null;
    const today = new Date().toISOString().slice(0,10);
    const row = id ? state.rows.find(r=>r.id===id) : { id: cryptoId(), date: today, dates: [today], scenario:"", system:"CoC 6版", role:"PL", gm:"", players:"", pc:"", status:"新規", time:"", note:"", hashtag:"", longNote:"" };
    normalizeRowDates(row);
    els.sessionDialogTitle.textContent = id ? "卓情報を編集" : "卓を追加";
    els.deleteSessionBtn.hidden = !id;
    els.sessionFormFields.innerHTML = "";

    const columns = state.columns.filter(c=>c.key !== "report");
    const groups = [
      { title: "基本情報", keys: ["date", "scenario", "system", "role", "status", "time"] },
      { title: "参加者", keys: ["gm", "players", "pc"] },
      { title: "メモ・任意項目", keys: ["note"] }
    ];
    const used = new Set(groups.flatMap(group=>group.keys));
    const extraColumns = columns.filter(col=>!used.has(col.key));
    if(extraColumns.length) groups.push({ title: "追加項目", columns: extraColumns });

    groups.forEach(group=>{
      const fieldset = document.createElement("fieldset");
      fieldset.className = "dialog-fieldset";
      fieldset.innerHTML = `<legend>${escapeHtml(group.title)}</legend><div class="dialog-fieldset-grid"></div>`;
      const grid = fieldset.querySelector(".dialog-fieldset-grid");
      const groupColumns = group.columns || group.keys.map(key=>columns.find(col=>col.key===key)).filter(Boolean);
      groupColumns.forEach(col=>{
        const label = document.createElement("label");
        label.className = ["note", "pc"].includes(col.key) ? "wide-field" : "";
        label.innerHTML = `<span>${escapeHtml(col.label)}</span>${fieldInputMarkup(col, row)}`;
        grid.appendChild(label);
      });
      els.sessionFormFields.appendChild(fieldset);
    });
    els.longNoteInput.value = row.longNote || "";
    els.sessionDialog.showModal();
  }

  function handleDateFieldClick(event){
    const addBtn = event.target.closest("[data-add-date]");
    if(addBtn){
      const container = addBtn.closest("[data-multi-date-field]");
      const row = document.createElement("div");
      row.className = "date-input-row";
      row.innerHTML = `<input type="date" name="dates" value="" /><button type="button" class="date-remove-button" data-remove-date>削除</button>`;
      container.insertBefore(row, addBtn);
      updateDateRemoveButtons(container);
      row.querySelector("input")?.focus();
      return;
    }
    const removeBtn = event.target.closest("[data-remove-date]");
    if(removeBtn){
      const container = removeBtn.closest("[data-multi-date-field]");
      const rows = [...container.querySelectorAll(".date-input-row")];
      if(rows.length > 1){
        removeBtn.closest(".date-input-row")?.remove();
        updateDateRemoveButtons(container);
      }
    }
  }

  function updateDateRemoveButtons(container){
    const rows = [...container.querySelectorAll(".date-input-row")];
    rows.forEach(row=>{
      const button = row.querySelector("[data-remove-date]");
      if(button) button.disabled = rows.length <= 1;
    });
  }

  function handleSessionSave(event){
    event.preventDefault();
    const form = new FormData(els.sessionForm);
    const row = editingId ? state.rows.find(r=>r.id===editingId) : { id: cryptoId() };
    state.columns.filter(c=>c.key !== "report" && c.key !== "date").forEach(col=>{ row[col.key] = form.get(col.key) || ""; });
    const dates = form.getAll("dates").map(v=>String(v || "").trim()).filter(Boolean).sort();
    row.dates = unique(dates);
    row.date = row.dates[0] || "";
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

  function handleDragStart(event,key,headerEl){
    const col = state.columns.find(c=>c.key===key);
    if(col?.locked){ event.preventDefault(); return; }
    draggingKey = key;
    dragOverKey = null;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain",key);
    headerEl?.classList.add("dragging");
  }

  function handleDragOver(event,key,headerEl){
    if(!draggingKey || draggingKey === key) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if(dragOverKey !== key){
      document.querySelectorAll("#tableHead th.drag-over").forEach(el=>el.classList.remove("drag-over"));
      dragOverKey = key;
      headerEl?.classList.add("drag-over");
    }
  }

  function handleDragLeave(event,headerEl){
    const related = event.relatedTarget;
    if(related && headerEl?.contains(related)) return;
    headerEl?.classList.remove("drag-over");
  }

  function handleDrop(event,targetKey,headerEl){
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
    headerEl?.classList.remove("drag-over");
    if(sourceKey && targetKey && sourceKey !== targetKey){
      const sourceIndex = state.columns.findIndex(c=>c.key===sourceKey);
      const targetIndex = state.columns.findIndex(c=>c.key===targetKey);
      const targetColumn = state.columns[targetIndex];
      if(sourceIndex >= 0 && targetIndex >= 0 && !targetColumn?.locked){
        const [moved] = state.columns.splice(sourceIndex,1);
        const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        state.columns.splice(adjustedTargetIndex,0,moved);
        saveState();
      }
    }
    handleDragEnd();
    renderTable();
  }

  function handleDragEnd(){
    draggingKey = null;
    dragOverKey = null;
    document.querySelectorAll("#tableHead th.dragging, #tableHead th.drag-over").forEach(el=>el.classList.remove("dragging","drag-over"));
  }

  function openDrawer(){ els.kansouDrawer.classList.add("open"); els.drawerOverlay.hidden = false; els.kansouDrawer.setAttribute("aria-hidden","false"); els.kansouTab.classList.add("hide"); renderDrawer(); }
  function closeDrawer(){ els.kansouDrawer.classList.remove("open"); els.drawerOverlay.hidden = true; els.kansouDrawer.setAttribute("aria-hidden","true"); els.kansouTab.classList.remove("hide"); }

  function openReportGenerator(row){
    const params = new URLSearchParams({ scenario: row.scenario || "", system: row.system || "", gm: row.gm || "", pl: row.players || "", pc: row.pc || "", date: getDateTitle(row) || row.date || "", hashtag: row.hashtag || "", note: row.note || "" });
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

    const mode = chooseImportMode();
    if(!mode){
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const imported = JSON.parse(String(reader.result));
        const importedRows = Array.isArray(imported.rows) ? imported.rows.map(row=>normalizeImportedRow(row)) : [];
        const importedColumns = Array.isArray(imported.columns) ? imported.columns : clone(defaultColumns);

        if(mode === "overwrite"){
          state = {
            rows: importedRows,
            columns: importedColumns.length ? importedColumns : clone(defaultColumns),
            migrations: { ...(imported.migrations || {}), hashtagOptional: true }
          };
        }else{
          state.rows = [...state.rows, ...importedRows.map(row=>({ ...row, id: cryptoId() }))];
          state.columns = mergeColumns(state.columns, importedColumns);
          state.migrations = { ...(state.migrations || {}), hashtagOptional: true };
        }

        activeId = state.rows[0]?.id || null;
        saveAndRender();
        alert(mode === "overwrite" ? "JSONを上書きインポートしました。" : "JSONを追加インポートしました。");
      }catch(error){
        console.error(error);
        alert("JSONの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function chooseImportMode(){
    const message = [
      "JSON入力方法を選択してください。",
      "",
      "1: 上書きインポート（現在のデータを置き換え）",
      "2: 追加インポート（現在のデータに追加）"
    ].join("\n");
    const answer = prompt(message, "1");
    if(answer === null) return null;
    const value = String(answer).trim();
    if(value === "1" || value === "上書き" || value.toLowerCase() === "overwrite") return "overwrite";
    if(value === "2" || value === "追加" || value.toLowerCase() === "append") return "append";
    alert("1 または 2 を入力してください。");
    return chooseImportMode();
  }

  function normalizeImportedRow(row){
    const next = { ...row };
    if(!next.id) next.id = cryptoId();
    normalizeRowDates(next);
    if(!next.status) next.status = "新規";
    if(next.system === "エモクロアTRPG") next.system = "エモクロア";
    if(next.system === "マルチシステム") next.system = "マダミス";
    if(next.role && normalizeRoleGroup(next.role) === "GM" && !ROLE_OPTIONS.includes(next.role)) next.role = "GM";
    return next;
  }

  function mergeColumns(currentColumns, importedColumns){
    const merged = Array.isArray(currentColumns) && currentColumns.length ? [...currentColumns] : clone(defaultColumns);
    importedColumns.forEach(column=>{
      if(!column || !column.key) return;
      if(column.key === "hashtag") return;
      if(!merged.some(existing=>existing.key === column.key)){
        const reportIndex = merged.findIndex(existing=>existing.key === "report");
        const insertColumn = { ...column };
        if(reportIndex >= 0) merged.splice(reportIndex,0,insertColumn);
        else merged.push(insertColumn);
      }
    });
    return merged;
  }

  function exportText(mode){
    const rows = getFilteredRows();
    let output = "";
    if(mode === "date") output = rows.map((r,i)=>`${i+1}. ${r.scenario} / ${r.system} / ${r.role} / ${getDateDisplay(r)}`).join("\n");
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

  function getSelfNames(){
    const stored = localStorage.getItem(SELF_NAMES_KEY);
    const userNames = stored ? stored.split(/[、,\/\n]/).map(normalizePersonName).filter(Boolean) : [];
    return new Set([...DEFAULT_SELF_NAMES.map(normalizePersonName), ...userNames]);
  }

  function normalizePersonName(value){
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/[\s　]+/g, "")
      .replace(/[。．.]+$/g, "。");
  }

  function splitPeople(value){
    return String(value || "")
      .split(/[、,，\/／&＆＋+・;；\n\r]+|\s+と\s+|\s+and\s+/i)
      .map(v=>v.trim())
      .filter(Boolean);
  }

  function countCoPlayers(rows){
    const selfNames = getSelfNames();
    const people = new Set();
    rows.forEach(row=>{
      // Count both GM/KP/DL and PL fields as people played with.
      // Example: GM=「のあ」, PL=「くま。、とこ」 and self=「くま。」 => counts 「のあ」 and 「とこ」.
      [row.gm, row.players].forEach(fieldValue=>{
        splitPeople(fieldValue).forEach(name=>{
          const normalized = normalizePersonName(name);
          if(normalized && !selfNames.has(normalized)) people.add(normalized);
        });
      });
    });
    return people.size;
  }


  function fieldInputMarkup(col, row){
    const value = row[col.key] || "";
    if(col.key === "date"){
      return dateInputsMarkup(row);
    }
    if(col.key === "system"){
      return `<select name="${escapeAttr(col.key)}">${SYSTEM_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
    }
    if(col.key === "role"){
      return `<select name="${escapeAttr(col.key)}">${ROLE_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
    }
    return `<input name="${escapeAttr(col.key)}" value="${escapeAttr(value)}" />`;
  }

  function normalizeRoleGroup(role){
    const value = String(role || "").trim().toUpperCase();
    if(["GM", "KP", "DL"].includes(value)) return "GM";
    if(value === "PL") return "PL";
    return value;
  }

  function roleClass(role){
    return normalizeRoleGroup(role) === "GM" ? "role-gm" : normalizeRoleGroup(role) === "PL" ? "role-pl" : "role-other";
  }

  function systemClass(system){
    const value = String(system || "").trim();
    if(value === "CoC 6版") return "system-coc6";
    if(value === "CoC 7版") return "system-coc7";
    if(value === "エモクロア") return "system-emoklore";
    if(value === "マダミス") return "system-madamisu";
    return "system-other";
  }


  function normalizeRowDates(row){
    let dates = Array.isArray(row.dates) ? row.dates : [];
    if(!dates.length && row.date) dates = parseDateList(row.date);
    dates = unique(dates.map(v=>String(v || "").trim()).filter(isIsoDate)).sort();
    row.dates = dates;
    row.date = dates[0] || (isIsoDate(row.date) ? row.date : "");
  }

  function parseDateList(value){
    return String(value || "")
      .split(/[、,，/／・;；\n\r]+/)
      .map(v=>v.trim().replace(/\//g,"-"))
      .filter(Boolean);
  }

  function isIsoDate(value){
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function getPrimaryDate(row){
    normalizeRowDates(row);
    return row.dates?.[0] || row.date || "";
  }

  function getDateDisplay(row){
    normalizeRowDates(row);
    const dates = row.dates || [];
    if(!dates.length) return "";
    return dates.length === 1 ? dates[0] : `${dates[0]} 他${dates.length - 1}日`;
  }

  function getDateTitle(row){
    normalizeRowDates(row);
    return (row.dates || []).join(" / ");
  }

  function countUniqueScenarios(rows){
    return unique(rows.map(row=>scenarioCountKey(row)).filter(Boolean)).length;
  }

  function scenarioCountKey(row){
    const explicit = String(row.scenarioCountKey || "").trim();
    if(explicit) return explicit;
    return normalizeScenarioForCount(row.scenario);
  }

  function normalizeScenarioForCount(value){
    return String(value || "")
      .replace(/[＿_]/g," ")
      .replace(/第\s*[0-9０-９一二三四五六七八九十百]+\s*陣/g,"")
      .replace(/[0-9０-９一二三四五六七八九十百]+\s*日目/g,"")
      .replace(/前編|後編|上巻|下巻|作成会|キャラシ作成会/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function countSessionDates(rows){
    return rows.reduce((sum,row)=>{
      normalizeRowDates(row);
      return sum + Math.max((row.dates || []).length, row.date ? 1 : 0);
    },0);
  }

  function dateInputsMarkup(row){
    normalizeRowDates(row);
    const dates = row.dates?.length ? row.dates : [new Date().toISOString().slice(0,10)];
    const inputs = dates.map((date,index)=>`
      <div class="date-input-row">
        <input type="date" name="dates" value="${escapeAttr(date)}" />
        <button type="button" class="date-remove-button" data-remove-date ${dates.length <= 1 ? "disabled" : ""}>削除</button>
      </div>`).join("");
    return `<div class="multi-date-field" data-multi-date-field>${inputs}<button type="button" class="date-add-button" data-add-date>＋日付を追加</button></div>`;
  }

  function sumHours(rows){ return rows.reduce((sum,row)=>sum + (parseFloat(String(row.time||"").match(/[\d.]+/)?.[0] || "0") || 0),0); }
  function getCellClass(key){ return key === "note" ? "note-cell" : ""; }
  function html(markup){ const span = document.createElement("span"); span.innerHTML = markup; return span; }
  function escapeHtml(value){ return String(value).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  function escapeAttr(value){ return escapeHtml(value).replace(/'/g,"&#039;"); }
  function t(key){
    const lang = window.SessionLogLanguage?.getLanguage?.() || "ja";
    return window.SESSION_LOG_I18N?.[lang]?.[key] || window.SESSION_LOG_I18N?.ja?.[key] || key;
  }

  function setSelfNames(names){
    const value = Array.isArray(names) ? names.join("、") : String(names || "");
    localStorage.setItem(SELF_NAMES_KEY, value);
    renderStats();
  }

  function exposeApi(){
    window.SessionLogApp = { exportJson, openSessionDialog, closeDrawer, setSelfNames };
  }
})();
