(function(){
  const STORAGE_KEY = "sessionLogTool.state.v1";
  const APP_VERSION = "v1.69";
  const REPORT_GENERATOR_URL = "../session-report-generator/index.html";
  const REPORT_PENDING_IMPORT_KEY = "trpgWebTools.sessionReportGenerator.pendingImport";
  const SELF_NAMES_KEY = "sessionLogTool.selfNames.v1";
  const DEFAULT_SELF_NAMES = ["自分", "自分自身", "GM", "KP", "DL", "くま。", "Kuma", "KumachanSteps"];
  const SYSTEM_OPTIONS = ["CoC 7版", "CoC 6版", "エモクロア", "マダミス"];
  const ROLE_OPTIONS = ["PL", "KP", "GM", "DL"];
  const STATUS_OPTIONS = ["新規", "継続", "完結", "中止", "予定"];
  const SURVIVAL_OPTIONS = ["", "生還", "ロスト", "全生還", "全ロスト", "継続", "不明"];
  const COLUMN_DEFAULT_WIDTHS = {
    reported: 78,
    fav: 72,
    date: 136,
    scenario: 310,
    system: 124,
    role: 96,
    gm: 124,
    players: 170,
    pc: 170,
    status: 120,
    time: 84,
    note: 250,
    report: 116
  };
  const COLUMN_MIN_WIDTHS = {
    reported: 66,
    fav: 56,
    date: 112,
    scenario: 180,
    system: 108,
    role: 78,
    gm: 96,
    players: 110,
    pc: 110,
    status: 108,
    time: 72,
    note: 160,
    report: 116
  };
  const TABLE_TEXT_LIMITS = { scenario: 30, players: 15, pc: 15, note: 20 };
  const TABLE_TEXT_LIMIT_MAX = { scenario: 80, players: 60, pc: 60, note: 80 };

  const defaultRows = [
    { id: cryptoId(), date: "2026-05-13", dates: ["2026-05-13"], scenario: "サンプルシナリオA", system: "CoC 6版", role: "PL", gm: "GMサンプル01", players: "PL-A、PL-B", pc: "PC-A", status: "新規", time: "4h", note: "初回セッション。導入と探索中心。", longNote: "◆ 好きなシーン\n\n◆ 好きなRP\n\n◆ キャラクター変化\n\n◆ 公開コメント下書き\n" },
    { id: cryptoId(), date: "2026-04-20", dates: ["2026-04-20"], scenario: "サンプルシナリオB", system: "CoC 7版", role: "KP", gm: "自分", players: "PL-C、PL-D、PL-E", pc: "PC-B / PC-C / PC-D", status: "新規", time: "5h", note: "日程調整済み。次回は中盤から再開。", longNote: "" },
    { id: cryptoId(), date: "2026-03-15", dates: ["2026-03-15"], scenario: "サンプルシナリオC", system: "エモクロア", role: "DL", gm: "自分", players: "PL-F、PL-G", pc: "共鳴者A / 共鳴者B", status: "継続", time: "3.5h", note: "継続キャラクターで参加。感想メモあり。", longNote: "" },
    { id: cryptoId(), date: "2026-02-28", dates: ["2026-02-28"], scenario: "サンプルキャンペーン 第2話", system: "マダミス", role: "PL", gm: "GMサンプル02", players: "PL-H、PL-I、PL-J", pc: "PC-E", status: "継続", time: "6h", note: "キャンペーン進行中。公開用メモは別途作成予定。", longNote: "" }
  ];
  const defaultColumns = [
    { key: "reported", label: "卓報告", locked: true, hideFixedLabel: true },
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
    { key: "fav", label: "お気に入り", desc: "任意のお気に入りマーカー" },
    { key: "ho", label: "HO", desc: "HO番号・PC番号" },
    { key: "ending", label: "エンディング", desc: "エンディング名・ルート" },
    { key: "survival", label: "生還 / ロスト", desc: "CoCの生還・ロスト結果" },
    { key: "campaign", label: "キャンペーン", desc: "キャンペーン・シリーズ名" },
    { key: "hashtag", label: "ハッシュタグ", desc: "卓報告・検索用ハッシュタグ" },
    { key: "sessionUrl", label: "セッションURL", desc: "ログ、ふせったー、note、X投稿" },
    { key: "scenarioUrl", label: "シナリオURL", desc: "Booth・公式ページ" },
    { key: "kansouUrl", label: "感想URL", desc: "公開感想リンク" }
  ];

  let state = loadState();
  let activeId = state.rows[0]?.id || null;
  let draggingKey = null;
  let dragOverKey = null;
  let dragInsertSide = "before";
  let resizingColumn = null;
  let editingId = null;
  const EXPORT_MODES = ["all", "system", "role", "sessions"];
  let exportMode = "all";
  let exportQuery = "";

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init(){
    collectElements();
    bindEvents();
    renderAll();
    exposeApi();
  }

  function collectElements(){
    ["tableHead","tableBody","searchInput","systemFilter","roleFilter","sortSelect","toggleFieldPanelBtn","toggleRemoveFieldPanelBtn","fieldPanel","removeFieldPanel","closeFieldPanelBtn","closeRemoveFieldPanelBtn","optionalFieldsList","visibleFieldsList","createCustomFieldBtn","resetFieldsBtn","jsonFileInput","importJsonBtn","exportJsonBtn","exportTextBtn","importDialog","closeImportDialogBtn","cancelImportBtn","runImportBtn","selfNameInput","downloadTemplateBtn","sheetPasteInput","sheetMapArea","sheetMapGrid","importPreviewArea","importPreviewCount","importPreviewTable","sheetParseMsg","reportPasteInput","reportParseMsg","ccfoliaFileInput","pickCcfoliaBtn","ccfoliaFileName","ccfoliaForm","ccScenario","ccDate","ccSystem","ccSpeakers","ccfoliaParseMsg","pickJsonBtn","jsonFileName","dupSkipInput","dupSkipWrap","textExportOutput","exportSearchInput","exportSearchClearBtn","exportCopyBtn","exportSearchHint","kansouTab","drawerOverlay","kansouDrawer","drawerContent","closeDrawerBtn","sessionDialog","sessionForm","sessionFormFields","longNoteInput","sessionDialogTitle","deleteSessionBtn","addSessionTopBtn","floatingAddBtn","shortcutPanel"].forEach(id=>{
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents(){
    els.searchInput.addEventListener("input", renderTable);
    els.systemFilter.addEventListener("change", renderTable);
    els.roleFilter.addEventListener("change", renderTable);
    els.sortSelect.addEventListener("change", renderTable);
    els.toggleFieldPanelBtn.addEventListener("click",()=>toggleFieldPanel("add"));
    els.toggleRemoveFieldPanelBtn.addEventListener("click",()=>toggleFieldPanel("remove"));
    els.closeFieldPanelBtn.addEventListener("click",()=>{ els.fieldPanel.hidden = true; });
    els.closeRemoveFieldPanelBtn.addEventListener("click",()=>{ els.removeFieldPanel.hidden = true; });
    document.querySelector(".table-scroll")?.addEventListener("scroll", updateReportStickyState);
    document.getElementById("usageHelpBtn")?.addEventListener("click",()=>toggleHelpPanel("usagePanel"));
    document.getElementById("closeUsageBtn")?.addEventListener("click",()=>toggleHelpPanel("usagePanel", false));
    document.getElementById("themeToggleBtn")?.addEventListener("click",()=>document.body.classList.toggle("night-mode"));
    document.addEventListener("keydown", event=>{ if(event.key === "Escape") closePopups(); });
    els.createCustomFieldBtn.addEventListener("click", createCustomField);
    els.resetFieldsBtn.addEventListener("click",()=>{ state.columns = clone(defaultColumns); state.hiddenColumns = []; saveAndRender(); });
    els.importJsonBtn.addEventListener("click", openImportDialog);
    els.jsonFileInput.addEventListener("change", handleJsonFilePicked);
    els.closeImportDialogBtn?.addEventListener("click",()=>els.importDialog.close());
    els.cancelImportBtn?.addEventListener("click",()=>els.importDialog.close());
    els.runImportBtn?.addEventListener("click", runImport);
    els.pickJsonBtn?.addEventListener("click",()=>els.jsonFileInput.click());
    els.downloadTemplateBtn?.addEventListener("click", downloadImportTemplate);
    els.selfNameInput?.addEventListener("change",()=>{ setSelfNames(els.selfNameInput.value); refreshActivePreview(); });
    els.sheetPasteInput?.addEventListener("input", scheduleSheetParse);
    els.reportPasteInput?.addEventListener("input", scheduleReportParse);
    els.pickCcfoliaBtn?.addEventListener("click",()=>els.ccfoliaFileInput.click());
    els.ccfoliaFileInput?.addEventListener("change", handleCcfoliaFiles);
    ["ccScenario", "ccDate", "ccSystem"].forEach(id=>els[id]?.addEventListener("input",()=>{
      importCcfolia.scenario = els.ccScenario.value;
      importCcfolia.date = els.ccDate.value;
      importCcfolia.system = els.ccSystem.value;
      renderCcfoliaPreview();
    }));
    els.ccSpeakers?.addEventListener("change", event=>{
      const select = event.target.closest("select[data-speaker]");
      if(!select) return;
      const sp = importCcfolia.speakers[Number(select.dataset.speaker)];
      if(sp) sp.role = select.value;
      renderCcfoliaPreview();
    });
    els.sheetMapGrid?.addEventListener("change", event=>{
      const select = event.target.closest("select[data-src-index]");
      if(!select) return;
      importSheet.mapping[Number(select.dataset.srcIndex)] = select.value;
      refreshSheetPreview();
    });
    els.dupSkipInput?.addEventListener("change", refreshActivePreview);
    document.querySelectorAll('input[name="importTarget"]').forEach(radio=>radio.addEventListener("change", refreshActivePreview));
    els.importDialog?.querySelectorAll(".import-tab").forEach(tab=>tab.addEventListener("click",()=>switchImportTab(tab.dataset.importTab)));
    els.importDialog?.addEventListener("close", resetImportState);
    els.exportModeButtons = [...document.querySelectorAll("[data-export-mode]")];
    els.exportModeButtons.forEach(btn=>btn.addEventListener("click",()=>setExportMode(btn.dataset.exportMode)));
    els.exportTextBtn.addEventListener("click",()=>{
      renderExport();
      els.textExportOutput?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    els.exportSearchInput?.addEventListener("input",()=>{ exportQuery = els.exportSearchInput.value; renderExport(); });
    els.exportSearchClearBtn?.addEventListener("click",()=>{
      exportQuery = "";
      if(els.exportSearchInput) els.exportSearchInput.value = "";
      renderExport();
      els.exportSearchInput?.focus();
    });
    els.exportCopyBtn?.addEventListener("click", copyExportOutput);
    els.kansouTab.addEventListener("click", openDrawer);
    els.closeDrawerBtn.addEventListener("click", closeDrawer);
    els.drawerOverlay.addEventListener("click", closeDrawer);
    els.addSessionTopBtn?.addEventListener("click",()=>openSessionDialog());
    els.floatingAddBtn?.addEventListener("click",()=>openSessionDialog());
    els.sessionForm.addEventListener("submit", handleSessionSave);
    els.sessionForm.addEventListener("click", handleDateFieldClick);
    els.sessionForm.addEventListener("change", handleSessionFormChange);
    document.getElementById("closeSessionDialogBtn")?.addEventListener("click",()=>els.sessionDialog.close());
    els.deleteSessionBtn.addEventListener("click", deleteEditingSession);
  }

  function renderAll(){
    normalizeState();
    renderFilters();
    renderOptionalFields();
    renderVisibleFields();
    renderStats();
    renderTable();
    renderDrawer();
    renderExport();
  }

  function normalizeState(){
    if(!Array.isArray(state.columns)) state.columns = clone(defaultColumns);
    if(!Array.isArray(state.hiddenColumns)) state.hiddenColumns = [];
    if(!Array.isArray(state.customColumns)) state.customColumns = [];

    state.columns = state.columns.map(col=>{
      const normalized = { ...col, label: getColumnLabel(col) };
      normalized.width = clampColumnWidth(normalized.key, Number(normalized.width) || COLUMN_DEFAULT_WIDTHS[normalized.key] || 140);
      return normalized;
    });

    if(!state.migrations?.v14ColumnWidths){
      state.columns = state.columns.map(col=>{
        if(["scenario","players","pc","note"].includes(col.key)){
          return { ...col, width: COLUMN_DEFAULT_WIDTHS[col.key] };
        }
        return col;
      });
      state.migrations = { ...(state.migrations || {}), v14ColumnWidths: true };
      saveState();
    }

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
    if(!state.migrations?.reportedColumn){
      if(!state.columns.some(col=>col.key === "reported")){
        state.columns.unshift({ key: "reported", label: "卓報告", locked: true, hideFixedLabel: true, width: COLUMN_DEFAULT_WIDTHS.reported });
      }
      state.rows.forEach(row=>{ if(typeof row.reported === "undefined") row.reported = false; });
      state.migrations = { ...(state.migrations || {}), reportedColumn: true };
      saveState();
    }
    if(!state.migrations?.timeUnitStripped){
      state.rows.forEach(row=>{ if(row.time) row.time = normalizeTimeValue(row.time); });
      state.migrations = { ...(state.migrations || {}), timeUnitStripped: true };
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
    getAllExtraColumns().forEach(col=>{
      const already = state.columns.some(c=>c.key===col.key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "optional-field-button";
      button.disabled = already;
      button.innerHTML = `<span><strong>${escapeHtml(col.label)}</strong><small>${escapeHtml(col.desc)}</small></span><span class="add-chip">${already ? "追加済" : "追加"}</span>`;
      button.addEventListener("click",()=>{
        if(already) return;
        showColumn(col);
        saveAndRender();
      });
      els.optionalFieldsList.appendChild(button);
    });
  }

  function renderVisibleFields(){
    if(!els.visibleFieldsList) return;
    els.visibleFieldsList.innerHTML = "";
    state.columns.filter(col=>!col.locked).forEach(col=>{
      const label = document.createElement("label");
      label.className = "visible-field-check";
      label.innerHTML = `<input type="checkbox" checked data-column-key="${escapeAttr(col.key)}" /><span>${escapeHtml(col.label)}</span>`;
      label.querySelector("input").addEventListener("change", event=>{
        if(!event.target.checked) hideColumn(col.key);
      });
      els.visibleFieldsList.appendChild(label);
    });
  }

  function toggleFieldPanel(mode){
    const add = mode === "add";
    els.fieldPanel.hidden = !add ? true : !els.fieldPanel.hidden;
    els.removeFieldPanel.hidden = add ? true : !els.removeFieldPanel.hidden;
  }

  function closePopups(){
    if(els.fieldPanel) els.fieldPanel.hidden = true;
    if(els.removeFieldPanel) els.removeFieldPanel.hidden = true;
    toggleHelpPanel("usagePanel", false);
    toggleHelpPanel("shortcutPanel", false);
  }

  function toggleHelpPanel(id, force){
    const panel = document.getElementById(id);
    if(!panel) return;
    const willOpen = typeof force === "boolean" ? force : panel.hidden || !panel.classList.contains("open");
    panel.hidden = !willOpen;
    requestAnimationFrame(()=>panel.classList.toggle("open", willOpen));
  }

  function showColumn(col){
    const reportIndex = state.columns.findIndex(c=>c.key === "report");
    const next = { ...col, width: clampColumnWidth(col.key, Number(col.width) || COLUMN_DEFAULT_WIDTHS[col.key] || 140) };
    if(reportIndex >= 0) state.columns.splice(reportIndex, 0, next);
    else state.columns.push(next);
    state.hiddenColumns = state.hiddenColumns.filter(c=>c.key !== col.key);
  }

  function hideColumn(key){
    const index = state.columns.findIndex(col=>col.key === key && !col.locked);
    if(index < 0) return;
    const [removed] = state.columns.splice(index, 1);
    if(!state.hiddenColumns.some(col=>col.key === key)) state.hiddenColumns.push(removed);
    saveAndRender();
  }

  function renderTable(){
    const rows = getFilteredRows();
    renderTableHead();
    requestAnimationFrame(updateReportStickyState);
    els.tableBody.innerHTML = "";
    rows.forEach(row=>{
      const tr = document.createElement("tr");
      tr.className = row.id === activeId ? "selected-row" : "";
      tr.addEventListener("click",()=>{ activeId = row.id; renderTable(); renderDrawer(); });
      tr.addEventListener("dblclick",()=>openSessionDialog(row.id));
      state.columns.forEach(col=>{
        const td = document.createElement("td");
        td.className = getCellClass(col.key);
        applyColumnWidth(td, col);
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
      th.draggable = false;
      th.className = `${col.locked ? "" : "draggable-header"} column-${cssSafeKey(col.key)}`.trim();
      th.title = col.locked ? "この列は固定です" : "⋮⋮ をドラッグして項目を並び替え / 右端をドラッグして幅を変更";
      applyColumnWidth(th, col);
      th.innerHTML = `
        <span class="header-content">
          ${col.locked ? "" : '<span class="drag-handle" draggable="true" title="ドラッグで項目を並び替え">⋮⋮</span>'}
          <span class="header-label">${escapeHtml(col.label)}</span>
          ${col.locked && !col.hideFixedLabel ? '<span class="fixed-label">固定</span>' : ""}
        </span>
        ${col.locked ? "" : '<span class="col-resizer" title="ドラッグで列幅を変更"></span>'}
      `;

      const dragHandle = th.querySelector(".drag-handle");
      dragHandle?.addEventListener("dragstart",event=>handleDragStart(event,col.key,th));
      dragHandle?.addEventListener("dragend",handleDragEnd);
      th.addEventListener("dragover",event=>handleDragOver(event,col.key,th));
      th.addEventListener("dragleave",event=>handleDragLeave(event,th));
      th.addEventListener("drop",event=>handleDrop(event,col.key,th));

      const resizer = th.querySelector(".col-resizer");
      resizer?.addEventListener("mousedown",event=>startColumnResize(event, col.key, th));
      tr.appendChild(th);
    });
    els.tableHead.innerHTML = "";
    els.tableHead.appendChild(tr);
  }

  function cellContent(row,col){
    if(col.key === "date") return html(`<span class="date-cell truncate-cell" title="${escapeAttr(getDateTitle(row))}">${escapeHtml(getDateDisplay(row))}</span>`);
    if(col.key === "scenario") return textCell(row.scenario, "cell-scenario", getDynamicTextLimit(col));
    if(col.key === "players") return textCell(row.players, "", getDynamicTextLimit(col));
    if(col.key === "pc") return textCell(row.pc, "", getDynamicTextLimit(col));
    if(col.key === "note") return textCell(row.note, "", getDynamicTextLimit(col));
    if(col.key === "system") return html(`<span class="system-pill ${systemClass(row.system)}">${escapeHtml(row.system || "")}</span>`);
    if(col.key === "role") return html(`<span class="role-pill ${roleClass(row.role)}">${escapeHtml(row.role || "")}</span>`);
    if(col.key === "hashtag") return textCell(row.hashtag, "hashtag-cell", 18);
    if(col.key === "fav") return html(`<span>${row.fav ? "★" : "☆"}</span>`);
    if(col.key === "time") return document.createTextNode(timeDisplay(row.time));
    if(col.key === "reported"){
      const label = document.createElement("label");
      label.className = "reported-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(row.reported);
      checkbox.title = row.reported ? "卓報告済み" : "卓報告 未";
      checkbox.setAttribute("aria-label", "卓報告済み");
      checkbox.addEventListener("click", event=>event.stopPropagation());
      checkbox.addEventListener("change", event=>{
        row.reported = event.target.checked;
        checkbox.title = row.reported ? "卓報告済み" : "卓報告 未";
        saveState();
      });
      label.appendChild(checkbox);
      return label;
    }
    if(col.key === "report"){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "report-button";
      btn.innerHTML = `<span class="report-button-arrow" aria-hidden="true">➜</span><span class="report-button-full">卓報告ジェネレーターへ送る</span>`;
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
          <div>時 ${escapeHtml(timeDisplay(row.time))}</div>
          <div>札 ${escapeHtml(row.system || "")}</div>
          <div>役 ${escapeHtml(row.role || "")}</div>
        </div>
      </div>
      <div class="drawer-card"><p class="drawer-label">日程</p><strong>${escapeHtml(getDateTitle(row) || "未設定")}</strong></div>
      <div class="drawer-card"><p class="drawer-label">GM / KP / DL</p><strong>${escapeHtml(row.gm || "")}</strong></div>
      <div class="drawer-card"><p class="drawer-label">PL / PC</p><strong>${escapeHtml(row.players || "")}</strong><p>${escapeHtml(row.pc || "")}</p></div>
      <div class="drawer-card"><p class="drawer-label">短いメモ</p><p>${escapeHtml(row.note || "")}</p><p class="drawer-muted">ハッシュタグは「＋ 項目追加」から任意項目として追加できます。</p></div>
      <div class="drawer-card"><p class="drawer-label">長文感想</p><textarea id="drawerLongNote">${escapeHtml(row.longNote || "")}</textarea></div>
      <div class="drawer-card report-link-card"><strong>卓報告ジェネレーター連携</strong><p>この行のシナリオ / システム / GM / PL / PC情報を卓報告ジェネレーターに渡す想定です。ハッシュタグなどの任意項目も追加して渡せます。</p><button id="drawerReportBtn" type="button">卓報告ジェネレーターへ送る</button></div>
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

    const columns = getDialogColumns();
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

  function handleSessionFormChange(event){
    if(event.target.matches("[data-system-select]")){
      const input = event.target.parentElement.querySelector("[data-system-custom]");
      if(input) input.hidden = event.target.value !== "__custom";
      if(input && !input.hidden) input.focus();
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
    getDialogColumns().filter(c=>c.key !== "date").forEach(col=>{
      if(col.key === "system") row.system = form.get("system") === "__custom" ? (form.get("systemCustom") || "") : (form.get("system") || "");
      else if(col.key === "fav") row.fav = form.get("fav") ? "★" : "";
      else if(col.key === "time") row.time = normalizeTimeValue(form.get("time") || "");
      else row[col.key] = form.get(col.key) || "";
    });
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
    const copy = { ...row, id: cryptoId(), scenario: `${row.scenario || ""} Copy`, reported: false };
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
    const column = {key,label,width:COLUMN_DEFAULT_WIDTHS[key] || 140, custom:true};
    state.customColumns.push(column);
    state.columns.splice(Math.max(state.columns.length-1,0),0,column);
    saveAndRender();
  }

  function handleDragStart(event,key,headerEl){
    const col = state.columns.find(c=>c.key===key);
    if(col?.locked || resizingColumn){ event.preventDefault(); return; }
    draggingKey = key;
    dragOverKey = null;
    dragInsertSide = "before";
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain",key);
    headerEl?.classList.add("dragging");
  }

  function handleDragOver(event,key,headerEl){
    if(!draggingKey || draggingKey === key || resizingColumn) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = headerEl.getBoundingClientRect();
    const side = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    if(dragOverKey !== key || dragInsertSide !== side){
      document.querySelectorAll("#tableHead th.drag-over-before, #tableHead th.drag-over-after").forEach(el=>el.classList.remove("drag-over-before","drag-over-after"));
      dragOverKey = key;
      dragInsertSide = side;
      headerEl?.classList.add(side === "before" ? "drag-over-before" : "drag-over-after");
    }
  }

  function handleDragLeave(event,headerEl){
    const related = event.relatedTarget;
    if(related && headerEl?.contains(related)) return;
    headerEl?.classList.remove("drag-over-before","drag-over-after");
  }

  function handleDrop(event,targetKey,headerEl){
    event.preventDefault();
    const sourceKey = event.dataTransfer.getData("text/plain") || draggingKey;
    const rect = headerEl?.getBoundingClientRect();
    const side = rect && event.clientX >= rect.left + rect.width / 2 ? "after" : "before";
    headerEl?.classList.remove("drag-over-before","drag-over-after");
    if(sourceKey && targetKey && sourceKey !== targetKey){
      const sourceIndex = state.columns.findIndex(c=>c.key===sourceKey);
      const targetIndex = state.columns.findIndex(c=>c.key===targetKey);
      const sourceColumn = state.columns[sourceIndex];
      if(sourceIndex >= 0 && targetIndex >= 0 && !sourceColumn?.locked){
        const [moved] = state.columns.splice(sourceIndex,1);
        let insertIndex = state.columns.findIndex(c=>c.key===targetKey);
        if(side === "after") insertIndex += 1;
        const firstUnlockedIndex = state.columns.findIndex(c=>!c.locked);
        if(firstUnlockedIndex > 0) insertIndex = Math.max(insertIndex, firstUnlockedIndex);
        const trailingLockedIndex = state.columns.findIndex(c=>c.locked && c.key !== "reported");
        if(trailingLockedIndex >= 0) insertIndex = Math.min(insertIndex, trailingLockedIndex);
        state.columns.splice(Math.max(insertIndex,0),0,moved);
        saveState();
      }
    }
    handleDragEnd();
    renderTable();
  }

  function handleDragEnd(){
    draggingKey = null;
    dragOverKey = null;
    dragInsertSide = "before";
    document.querySelectorAll("#tableHead th.dragging, #tableHead th.drag-over-before, #tableHead th.drag-over-after").forEach(el=>el.classList.remove("dragging","drag-over-before","drag-over-after"));
  }

  function startColumnResize(event,key,headerEl){
    event.preventDefault();
    event.stopPropagation();
    const column = state.columns.find(c=>c.key === key);
    if(!column || column.locked) return;
    resizingColumn = {
      key,
      startX: event.clientX,
      startWidth: Number(column.width) || headerEl.getBoundingClientRect().width
    };
    document.body.classList.add("is-resizing-column");
    document.addEventListener("mousemove",handleColumnResizeMove);
    document.addEventListener("mouseup",stopColumnResize,{ once:true });
  }

  function handleColumnResizeMove(event){
    if(!resizingColumn) return;
    const column = state.columns.find(c=>c.key === resizingColumn.key);
    if(!column) return;
    const delta = event.clientX - resizingColumn.startX;
    column.width = clampColumnWidth(column.key, resizingColumn.startWidth + delta);
    renderTable();
  }

  function stopColumnResize(){
    if(resizingColumn){
      resizingColumn = null;
      document.body.classList.remove("is-resizing-column");
      document.removeEventListener("mousemove",handleColumnResizeMove);
      saveState();
    }
  }

  function openDrawer(){ els.kansouDrawer.classList.add("open"); els.drawerOverlay.hidden = false; els.kansouDrawer.setAttribute("aria-hidden","false"); els.kansouTab.classList.add("hide"); renderDrawer(); }
  function closeDrawer(){ els.kansouDrawer.classList.remove("open"); els.drawerOverlay.hidden = true; els.kansouDrawer.setAttribute("aria-hidden","true"); els.kansouTab.classList.remove("hide"); }

  function openReportGenerator(row){
    if(!row) return;
    const willOverwrite = hasPendingReportImport();
    const confirmed = confirm([
      "卓報告ジェネレーターへ送る",
      "",
      "この卓ログをもとに、卓報告ジェネレーター用の入力データを作成します。",
      willOverwrite ? "未取り込みの卓報告データがあるため、この操作で上書きします。" : "",
      "",
      "送信される情報：",
      "・シナリオ名",
      "・セッション日",
      "・システム",
      "・GM / KP",
      "・PL / PC",
      "・メモ",
      "・関連URL",
      "",
      "保存後、卓報告ジェネレーターを開きます。ジェネレーター側で内容を確認・編集してから投稿文を生成できます。"
    ].filter(Boolean).join("\n"));
    if(!confirmed) return;

    const payload = createReportPendingImport(row);
    try{
      localStorage.setItem(REPORT_PENDING_IMPORT_KEY, JSON.stringify(payload));
    }catch(error){
      console.error(error);
      alert("ブラウザの保存領域に書き込めませんでした。\n代わりにJSONをコピーして、卓報告ジェネレーター側で読み込んでください。\n\n" + JSON.stringify(payload, null, 2));
      return;
    }

    window.open(REPORT_GENERATOR_URL, "_blank", "noopener,noreferrer");
  }

  function hasPendingReportImport(){
    try{ return Boolean(localStorage.getItem(REPORT_PENDING_IMPORT_KEY)); }
    catch(_error){ return false; }
  }

  function createReportPendingImport(row){
    return {
      source: "session-log-tracker",
      version: "1.0",
      createdAt: new Date().toISOString(),
      items: [createReportImportItem(row)]
    };
  }

  function createReportImportItem(row){
    normalizeRowDates(row);
    const dates = Array.isArray(row.dates) ? row.dates : [];
    return {
      id: `report_import_${Date.now()}`,
      sourceLogId: row.id || "",
      reported: Boolean(row.reported),
      scenario: row.scenario || row.title || "",
      system: row.system || "",
      dates,
      latestDate: dates[dates.length - 1] || row.date || "",
      sessionCount: Math.max(dates.length, 1),
      gm: row.gm || row.keeper || "",
      players: pairPlayers(row.players, row.pc).map(([pl, pc])=>({ pl, pc, characterUrl: "" })),
      format: normalizeSessionFormat(row.format || row.sessionFormat || ""),
      status: normalizeSessionStatus(row.status || ""),
      memo: [row.note, row.longNote].map(v=>String(v || "").trim()).filter(Boolean).join("\n\n"),
      links: createReportLinks(row),
      hashtags: splitTags(row.hashtag || row.hashtags || row.tags || "")
    };
  }

  function pairPlayers(playersValue, pcValue){
    const pls = splitPeople(playersValue);
    const pcs = splitPeople(pcValue);
    const length = Math.max(pls.length, pcs.length, 1);
    return Array.from({ length }, (_, index)=>[pls[index] || "", pcs[index] || ""]);
  }

  function splitTags(value){
    if(Array.isArray(value)) return value.map(v=>String(v || "").replace(/^#/, "").trim()).filter(Boolean);
    return String(value || "").split(/[\s、,，]+/).map(v=>v.replace(/^#/, "").trim()).filter(Boolean);
  }

  function createReportLinks(row){
    return [
      { label: "Session", url: row.sessionUrl || "" },
      { label: "Scenario", url: row.scenarioUrl || "" },
      { label: "Kansou", url: row.kansouUrl || "" }
    ].filter(link=>link.url || ["Session", "Scenario"].includes(link.label));
  }

  function normalizeSessionFormat(value){
    const text = String(value || "").toLowerCase();
    if(text.includes("voice") || text.includes("ボイ") || text.includes("通話")) return "voice";
    if(text.includes("text") || text.includes("テキ")) return "text";
    if(text.includes("semi") || text.includes("半")) return "semi-text";
    return "";
  }

  function normalizeSessionStatus(value){
    const text = String(value || "");
    if(/完|済|end|completed/i.test(text)) return "completed";
    if(/継続|途中|予定|ongoing/i.test(text)) return "ongoing";
    return text;
  }

  function exportJson(){
    const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `session-log-tool-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ===== インポート（スプレッドシート / JSON）=====

  const SHEET_TARGET_FIELDS = [
    ["date", "日付"],
    ["scenario", "シナリオ名"],
    ["system", "システム"],
    ["role", "ロール (PL/KP/GM/DL)"],
    ["gm", "GM / KP / DL"],
    ["players", "PL（同卓者）"],
    ["pc", "PC（探索者）"],
    ["status", "状態（新規/継続/完結…）"],
    ["time", "プレイ時間（時間数・数値のみ）"],
    ["note", "メモ・短い感想"],
    ["longNote", "長文感想"],
    ["campaign", "キャンペーン"],
    ["hashtag", "ハッシュタグ"],
    ["ending", "エンディング"],
    ["survival", "生還 / ロスト"],
    ["sessionUrl", "セッションURL"],
    ["scenarioUrl", "シナリオURL"],
    ["kansouUrl", "感想URL"],
    ["scenarioCountKey", "シナリオ集計キー"]
  ];
  const SHEET_HEADER_ALIASES = {
    date: ["日付", "日時", "開催日", "プレイ日", "セッション日", "date"],
    scenario: ["シナリオ", "シナリオ名", "題名", "タイトル", "作品名", "scenario", "title"],
    system: ["システム", "システム名", "ゲームシステム", "ルール", "system"],
    role: ["ロール", "役割", "立場", "role", "plkp"],
    gm: ["gm", "kp", "dl", "キーパー", "ゲームマスター", "マスター", "gmkp", "進行役"],
    players: ["pl", "プレイヤー", "同卓者", "参加者", "メンバー", "players"],
    pc: ["pc", "探索者", "キャラ", "キャラクター", "探索者名", "pc名"],
    status: ["状態", "ステータス", "進捗", "新規継続", "status"],
    time: ["時間", "所要時間", "プレイ時間", "time", "hours"],
    note: ["メモ", "備考", "ノート", "コメント", "note", "memo"],
    longNote: ["長文感想", "詳細メモ", "感想", "longnote"],
    campaign: ["キャンペーン", "シリーズ", "campaign"],
    hashtag: ["ハッシュタグ", "タグ", "hashtag", "tag", "tags"],
    ending: ["エンディング", "結末", "ルート", "ending", "end"],
    survival: ["生還", "生死", "ロスト", "survival"],
    sessionurl: ["セッションurl", "ログurl", "ログ", "セッションリンク", "sessionurl"],
    scenariourl: ["シナリオurl", "配布ページ", "boothurl", "scenariourl"],
    kansoururl: ["感想url", "感想リンク", "kansoururl"],
    scenariocountkey: ["シナリオキー", "集計キー", "scenariocountkey"]
  };

  const importSheet = { columns: [], rows: [], hasHeader: false, mapping: [] };
  const importReport = { rows: [] };
  const importCcfolia = { scenario: "", date: "", system: "", speakers: [] };
  let jsonImportPayload = null;
  let sheetParseTimer = null;
  let reportParseTimer = null;

  function openImportDialog(){
    resetImportState();
    if(els.selfNameInput) els.selfNameInput.value = localStorage.getItem(SELF_NAMES_KEY) || "";
    switchImportTab("sheet");
    if(typeof els.importDialog.showModal === "function") els.importDialog.showModal();
    else els.importDialog.setAttribute("open", "");
  }

  function resetImportState(){
    importSheet.columns = [];
    importSheet.rows = [];
    importSheet.hasHeader = false;
    importSheet.mapping = [];
    importReport.rows = [];
    importCcfolia.scenario = "";
    importCcfolia.date = "";
    importCcfolia.system = "";
    importCcfolia.speakers = [];
    jsonImportPayload = null;
    if(els.sheetPasteInput) els.sheetPasteInput.value = "";
    if(els.reportPasteInput) els.reportPasteInput.value = "";
    if(els.sheetMapArea) els.sheetMapArea.hidden = true;
    if(els.importPreviewArea) els.importPreviewArea.hidden = true;
    if(els.sheetParseMsg){ els.sheetParseMsg.hidden = true; els.sheetParseMsg.textContent = ""; }
    if(els.reportParseMsg){ els.reportParseMsg.hidden = true; els.reportParseMsg.textContent = ""; }
    if(els.ccfoliaParseMsg){ els.ccfoliaParseMsg.hidden = true; els.ccfoliaParseMsg.textContent = ""; }
    if(els.ccfoliaForm) els.ccfoliaForm.hidden = true;
    if(els.ccfoliaFileName) els.ccfoliaFileName.textContent = "";
    if(els.ccfoliaFileInput) els.ccfoliaFileInput.value = "";
    ["ccScenario", "ccDate", "ccSystem"].forEach(id=>{ if(els[id]) els[id].value = ""; });
    if(els.jsonFileName) els.jsonFileName.textContent = "";
    if(els.jsonFileInput) els.jsonFileInput.value = "";
    if(els.runImportBtn) els.runImportBtn.disabled = true;
  }

  function switchImportTab(tab){
    els.importDialog?.querySelectorAll(".import-tab").forEach(btn=>{
      btn.classList.toggle("is-active", btn.dataset.importTab === tab);
    });
    els.importDialog?.querySelectorAll(".import-tabpanel").forEach(panel=>{
      panel.hidden = panel.dataset.importPanel !== tab;
    });
    if(els.importPreviewArea) els.importPreviewArea.hidden = true;
    refreshActivePreview();
    updateRunImportEnabled();
  }

  function activeImportTab(){
    return els.importDialog?.querySelector(".import-tab.is-active")?.dataset.importTab || "sheet";
  }

  function getImportTarget(){
    return document.querySelector('input[name="importTarget"]:checked')?.value || "append";
  }

  function updateRunImportEnabled(){
    if(!els.runImportBtn) return;
    const tab = activeImportTab();
    let ready = false;
    if(tab === "json") ready = Boolean(jsonImportPayload);
    else if(tab === "text") ready = importReport.rows.length > 0;
    else if(tab === "ccfolia") ready = Boolean(ccfoliaRow());
    else ready = sheetDataRows().length > 0 && importSheet.mapping.some(Boolean);
    els.runImportBtn.disabled = !ready;
  }

  function refreshActivePreview(){
    const tab = activeImportTab();
    if(tab === "sheet") refreshSheetPreview();
    else if(tab === "text") renderReportPreview();
    else if(tab === "ccfolia") renderCcfoliaPreview();
    else if(els.importPreviewArea) els.importPreviewArea.hidden = true;
  }

  function scheduleSheetParse(){
    clearTimeout(sheetParseTimer);
    sheetParseTimer = setTimeout(parseSheetInput, 180);
  }

  function scheduleReportParse(){
    clearTimeout(reportParseTimer);
    reportParseTimer = setTimeout(parseReportInput, 220);
  }

  function parseDelimitedText(text){
    const normalized = String(text || "").replace(/\r\n?/g, "\n").replace(/\n+$/,"");
    if(!normalized.trim()) return [];
    const firstLine = normalized.split("\n")[0];
    if(firstLine.includes("\t")){
      return normalized.split("\n").map(line=>line.split("\t"));
    }
    return parseCsvRows(normalized);
  }

  function parseCsvRows(text){
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(inQuotes){
        if(ch === '"'){
          if(text[i + 1] === '"'){ field += '"'; i++; }
          else inQuotes = false;
        }else field += ch;
      }else if(ch === '"'){ inQuotes = true; }
      else if(ch === ','){ row.push(field); field = ""; }
      else if(ch === '\n'){ row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
    row.push(field);
    rows.push(row);
    return rows;
  }

  function normalizeHeaderCell(value){
    return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s　_・／/]+/g, "").replace(/[()（）]/g, "");
  }

  function guessFieldForHeader(headerCell){
    const key = normalizeHeaderCell(headerCell);
    if(!key) return "";
    const canonical = field => ({ sessionurl: "sessionUrl", scenariourl: "scenarioUrl", kansoururl: "kansouUrl", scenariocountkey: "scenarioCountKey" }[field] || field);
    const entries = Object.entries(SHEET_HEADER_ALIASES);
    for(const [field, aliases] of entries){
      if(aliases.includes(key)) return canonical(field);
    }
    for(const [field, aliases] of entries){
      if(aliases.some(alias=>alias.length >= 2 && key.includes(alias))) return canonical(field);
    }
    return "";
  }

  function parseSheetInput(){
    const grid = parseDelimitedText(els.sheetPasteInput.value)
      .map(cells=>cells.map(cell=>String(cell).trim()))
      .filter(cells=>cells.some(Boolean));
    if(!grid.length){
      importSheet.columns = [];
      importSheet.rows = [];
      importSheet.mapping = [];
      els.sheetMapArea.hidden = true;
      els.importPreviewArea.hidden = true;
      els.sheetParseMsg.hidden = true;
      updateRunImportEnabled();
      return;
    }
    const width = Math.max(...grid.map(r=>r.length));
    grid.forEach(r=>{ while(r.length < width) r.push(""); });

    const firstRowGuesses = grid[0].map(guessFieldForHeader);
    const hasHeader = firstRowGuesses.filter(Boolean).length >= Math.min(2, width);

    importSheet.hasHeader = hasHeader;
    importSheet.rows = grid;
    importSheet.columns = hasHeader
      ? grid[0].map((cell, i)=>cell || `列${i + 1}`)
      : grid[0].map((_, i)=>`列${i + 1}`);
    importSheet.mapping = hasHeader
      ? firstRowGuesses.slice()
      : new Array(width).fill("");

    renderSheetMapping();
    refreshSheetPreview();

    els.sheetParseMsg.hidden = false;
    els.sheetParseMsg.textContent = hasHeader
      ? `見出し行を認識しました（${sheetDataRows().length} 行のデータ）。`
      : `見出しが見つかりませんでした。すべての行をデータとして扱います（${sheetDataRows().length} 行）。下で列を割り当ててください。`;
  }

  function sheetDataRows(){
    if(!importSheet.rows.length) return [];
    return importSheet.rows.slice(importSheet.hasHeader ? 1 : 0);
  }

  function renderSheetMapping(){
    els.sheetMapArea.hidden = false;
    els.sheetMapGrid.innerHTML = "";
    importSheet.columns.forEach((name, index)=>{
      const wrap = document.createElement("label");
      wrap.className = "sheet-map-row";
      const options = [`<option value="">取り込まない</option>`]
        .concat(SHEET_TARGET_FIELDS.map(([key, label])=>`<option value="${escapeAttr(key)}" ${importSheet.mapping[index] === key ? "selected" : ""}>${escapeHtml(label)}</option>`))
        .join("");
      wrap.innerHTML = `<span class="sheet-map-src">${escapeHtml(name)}</span><select data-src-index="${index}">${options}</select>`;
      els.sheetMapGrid.appendChild(wrap);
    });
  }

  function buildRowFromCells(cells){
    const row = {};
    importSheet.mapping.forEach((key, i)=>{
      if(!key) return;
      const value = (cells[i] || "").trim();
      if(!value) return;
      row[key] = row[key] ? `${row[key]} / ${value}` : value;
    });
    return row;
  }

  function toIsoDatePart(part){
    const m = String(part || "").trim().normalize("NFKC").match(/(\d{4})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})/);
    if(!m) return "";
    return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  }

  function splitImportDates(value){
    return String(value || "").split(/[、,，;；\s]+/).map(toIsoDatePart).filter(Boolean);
  }

  const IMPORT_SYSTEM_MAP = {
    "エモクロアtrpg": "エモクロア", "エモクロア": "エモクロア",
    "マーダーミステリー": "マダミス", "マダミス": "マダミス", "マルチシステム": "マダミス",
    "新クトゥルフ神話trpg": "CoC 7版", "新クトゥルフ": "CoC 7版",
    "クトゥルフ神話trpg": "CoC 6版",
    "coc6": "CoC 6版", "coc 6": "CoC 6版", "coc6版": "CoC 6版", "coc 6版": "CoC 6版",
    "coc7": "CoC 7版", "coc 7": "CoC 7版", "coc7版": "CoC 7版", "coc 7版": "CoC 7版"
  };
  const IMPORT_ROLE_MAP = {
    "キーパー": "KP", "kp": "KP", "ゲームマスター": "GM", "マスター": "GM", "gm": "GM",
    "ディーラー": "DL", "dl": "DL", "プレイヤー": "PL", "pl": "PL"
  };

  function coerceImportValues(row){
    if(row.date && (!Array.isArray(row.dates) || !row.dates.length)){
      const iso = splitImportDates(row.date);
      if(iso.length){ row.dates = iso.slice().sort(); row.date = row.dates[0]; }
    }
    if(row.system){
      const key = row.system.normalize("NFKC").trim().toLowerCase();
      if(IMPORT_SYSTEM_MAP[key]) row.system = IMPORT_SYSTEM_MAP[key];
    }
    if(row.role){
      const raw = row.role.normalize("NFKC").trim();
      row.role = IMPORT_ROLE_MAP[raw] || IMPORT_ROLE_MAP[raw.toLowerCase()] || (ROLE_OPTIONS.includes(raw.toUpperCase()) ? raw.toUpperCase() : row.role);
    }
    if(row.time) row.time = normalizeTimeValue(row.time);
    return row;
  }

  function applySelfRole(row){
    if(row.role) return row;
    const selfNames = getSelfNames();
    if(row.players && splitPeople(row.players).some(name=>selfNames.has(normalizePersonName(name)))){
      row.role = "PL";
      return row;
    }
    if(!row.gm) return row;
    const gmNames = splitPeople(row.gm);
    if(gmNames.length && gmNames.every(name=>selfNames.has(normalizePersonName(name)))) row.role = "KP";
    else row.role = "PL";
    return row;
  }

  function sessionDupKey(row){
    normalizeRowDates(row);
    const date = (row.dates && row.dates[0]) || row.date || "";
    const scenario = normalizeScenarioForCount(row.scenario || "").normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, "");
    return date && scenario ? `${date}|${scenario}` : "";
  }

  function buildSheetRows(){
    return sheetDataRows()
      .map(cells=>normalizeImportedRow(applySelfRole(coerceImportValues(buildRowFromCells(cells)))))
      .filter(row=>row.scenario || row.date || row.pc || row.gm);
  }

  function buildReportRows(){
    return importReport.rows
      .map(partial=>normalizeImportedRow(applySelfRole(coerceImportValues({ ...partial }))))
      .filter(row=>row.scenario || row.date || row.pc || row.gm);
  }

  function refreshSheetPreview(){
    if(!importSheet.rows.length){
      if(els.importPreviewArea) els.importPreviewArea.hidden = true;
      updateRunImportEnabled();
      return;
    }
    renderImportPreview(buildSheetRows());
  }

  function renderReportPreview(){
    if(!importReport.rows.length){
      if(els.importPreviewArea) els.importPreviewArea.hidden = true;
      updateRunImportEnabled();
      return;
    }
    renderImportPreview(buildReportRows());
  }

  function renderImportPreview(built){
    const target = getImportTarget();
    const skipDup = Boolean(els.dupSkipInput?.checked);
    const existingKeys = new Set(target === "overwrite" ? [] : state.rows.map(sessionDupKey).filter(Boolean));
    const dupSet = new Set(existingKeys);
    let dupCount = 0;
    built.forEach(row=>{
      const k = sessionDupKey(row);
      if(!k) return;
      if(dupSet.has(k)) dupCount++;
      else dupSet.add(k);
    });
    const willImport = skipDup ? built.length - dupCount : built.length;

    els.importPreviewArea.hidden = false;
    els.importPreviewCount.textContent =
      `${willImport} 件を取り込み` +
      (target === "overwrite" ? "（既存データは全消去）" : "") +
      (dupCount ? ` / 重複 ${dupCount} 件を${skipDup ? "スキップ" : "そのまま追加"}` : "");

    const cols = ["date", "scenario", "system", "role", "gm", "players", "pc"];
    const head = `<tr><th></th>${cols.map(c=>`<th>${escapeHtml((SHEET_TARGET_FIELDS.find(f=>f[0] === c) || [c, c])[1].split(/[ (（]/)[0])}</th>`).join("")}</tr>`;
    const body = built.slice(0, 10).map(row=>{
      const dup = existingKeys.has(sessionDupKey(row));
      const cells = cols.map(c=>`<td>${escapeHtml(c === "date" ? getDateDisplay(row) : (c === "time" ? timeDisplay(row.time) : (row[c] || "")))}</td>`).join("");
      return `<tr class="${dup ? "is-dup" : ""}"><td class="dup-mark">${dup ? "重複" : ""}</td>${cells}</tr>`;
    }).join("");
    els.importPreviewTable.innerHTML = head + body + (built.length > 10 ? `<tr><td></td><td colspan="${cols.length}" class="preview-more">ほか ${built.length - 10} 件…</td></tr>` : "");

    updateRunImportEnabled();
  }

  // ----- 卓報告テキスト / テキスト一覧のパース -----

  const REPORT_SYSTEM_PATTERNS = [
    [/新クトゥルフ神話trpg|新クトゥルフ|new\s*coc|coc\s*7版?|coc7/i, "CoC 7版"],
    [/クトゥルフ神話trpg|coc\s*6版?|coc6/i, "CoC 6版"],
    [/call of cthulhu|クトゥルフ|coc(?![0-9])/i, "CoC 7版"],
    [/エモクロア|emoklore/i, "エモクロア"],
    [/マーダーミステリー|マダミス|murder\s*mystery/i, "マダミス"],
    [/シノビガミ/i, "シノビガミ"],
    [/インセイン/i, "インセイン"],
    [/ダブルクロス|double\s*cross/i, "ダブルクロス The 3rd Edition"],
    [/ソード・?ワールド|sword\s*world/i, "ソード・ワールド2.5"],
    [/フタリソウサ/i, "フタリソウサ"]
  ];

  const SMALL_CAPS_MAP = { "ᴀ":"A","ʙ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʜ":"H","ɪ":"I","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ᴘ":"P","ꞯ":"Q","ʀ":"R","ꜱ":"S","ᴛ":"T","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z" };

  const SMALL_CAPS_RE = new RegExp(`[${Object.keys(SMALL_CAPS_MAP).join("")}]`, "g");
  function desmallcaps(text){
    return String(text || "").replace(SMALL_CAPS_RE, ch=>SMALL_CAPS_MAP[ch] || ch);
  }

  function detectSystemFromText(text){
    const t = desmallcaps(String(text || "")).normalize("NFKC");
    for(const [re, name] of REPORT_SYSTEM_PATTERNS){ if(re.test(t)) return name; }
    return "";
  }

  function stripReportLine(line){
    return String(line)
      .replace(/^[\s　|｜┊┗▹▸▶►▷➜➤‣・･\-–—―━─=*✦✧✼⟡◤◢◈❖◇◆‖†✩⋆★☆✮✯⚝⛦≛▮▎ᐧ.·°˖˚₊‧꙳⌜⌟୨୧꒰꒱ঌ໒⧉]+/u, "")
      .replace(/[\s　|｜┊◤◢⌜⌟୨୧‧₊˚꙳・.·°˖ ─—―━=✦✧]+$/u, "")
      .trim();
  }

  function parseReportInput(){
    importReport.rows = parseReportText(els.reportPasteInput.value);
    renderReportPreview();
    if(!els.reportParseMsg) return;
    els.reportParseMsg.hidden = false;
    els.reportParseMsg.textContent = importReport.rows.length
      ? `${importReport.rows.length} 件を認識しました。プレビューで確認し、取り込み後に細部を編集できます。`
      : "認識できませんでした。1件ずつ空行2つ以上（または --- 行）で区切り、システム名・「シナリオ名」・日付が含まれているか確認してください。";
  }

  function parseReportText(text){
    const raw = String(text || "").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
    if(!raw) return [];
    const bodyLines = raw.split("\n").map(l=>l.trim()).filter(Boolean);
    const numbered = bodyLines.filter(l=>/^\d+[.．)]\s*\S/.test(l)).length;
    if(numbered >= 3 && numbered >= bodyLines.length * 0.4) return parseListExport(raw);

    const blocks = raw
      .split(/\n[ \t　]*\n[ \t　]*\n+|\n[ \t　]*[-=—―━─_]{3,}[ \t　]*\n/)
      .map(b=>b.trim())
      .filter(Boolean);
    return blocks.map(parseReportBlock).filter(row=>row && (row.scenario || row.gm || row.players || row.date));
  }

  const REPORT_ROLE_RE = /^(kpc\s*[\/／]\s*kp|作\s*[\/／]\s*kp|kpc|skp|kp|dl|gm|進行|ゲームマスター|キーパー)\s*(?:[：:┊|｜・\/／]|\s)\s*(.+)$/i;

  function parseParticipants(lines, headerIdx){
    const bareHeader = headerIdx >= 0 ? lines[headerIdx].replace(/\s/g, "").toLowerCase() : "";
    let plFirst = /^pl/.test(bareHeader);
    let orderResolved = headerIdx >= 0;
    const pcs = [], pls = [], hos = [];
    const honor = /(さん|様|氏|ｻﾝ)\s*$/;
    const stopRe = /(^|\s)#|(20|19)\d{2}\s*[\/年.\-]|end\b|エンド|エンディング|クリア|scenario\s*clear|全?生還|全?ロスト|グッドエンド|✧\s*$/i;
    for(let i = (headerIdx >= 0 ? headerIdx + 1 : 0); i < lines.length; i++){
      const line = lines[i];
      if(REPORT_ROLE_RE.test(line)){ if(pcs.length && headerIdx < 0) break; continue; }
      const hoM = line.match(/^(ho|pc)\s*(\d+)/i);
      const cleaned = line
        .replace(/^(ho\s*\d+|pc\s*\d+|pc|ho|自由)\s*[:：]?\s*/i, "")
        .replace(/^[┗▹▸➤‣・\-\s]+/, "")
        .trim();
      if(stopRe.test(cleaned)){ if(pcs.length || pls.length) break; continue; }
      const parts = cleaned.split(/\s*[\/／|｜┊]\s*/).map(p=>p.trim()).filter(Boolean);
      if(parts.length !== 2){ if((pcs.length || pls.length) && headerIdx < 0) break; continue; }
      if(headerIdx < 0 && !hoM && !pcs.length && !honor.test(parts[0]) && !honor.test(parts[1])) continue;
      if(!orderResolved){
        const l0 = honor.test(parts[0]), l1 = honor.test(parts[1]);
        if(l1 && !l0) plFirst = false;
        else if(l0 && !l1) plFirst = true;
        orderResolved = true;
      }
      if(plFirst){ pls.push(parts[0]); pcs.push(parts[1]); }
      else { pcs.push(parts[0]); pls.push(parts[1]); }
      if(hoM) hos.push(`${(hoM[1] || "HO").toUpperCase()}${hoM[2]}`);
    }
    return { pcs, pls, hos };
  }

  function parseReportBlock(block){
    const row = { longNote: block.trim() };
    const norm = desmallcaps(block).normalize("NFKC");
    const lines = norm.split("\n").map(stripReportLine).filter(Boolean);
    const joined = norm;

    const tags = joined.match(/#[^\s#、,，。]+/g) || [];
    if(tags.length) row.hashtag = [...new Set(tags)].join(" ");

    const dm = joined.match(/(20\d{2}|19\d{2})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})/);
    if(dm) row.date = `${dm[1]}-${String(dm[2]).padStart(2, "0")}-${String(dm[3]).padStart(2, "0")}`;

    row.system = detectSystemFromText(joined);

    for(const line of lines){
      const bm = line.match(/[「『【《〈](.+?)[」』】》〉]/);
      if(bm){
        const s = bm[1].trim();
        if(s && !detectSystemFromText(s) && !/^(kp|dl|gm|pl|pc|ho\d|end|作)/i.test(s)){ row.scenario = s; break; }
      }
    }
    if(!row.scenario){
      const sysIdx = lines.findIndex(l=>detectSystemFromText(l) && l.length < 30);
      if(sysIdx >= 0 && lines[sysIdx + 1]) row.scenario = lines[sysIdx + 1].replace(/[「『【《〈」』】》〉]/g, "").trim();
    }

    const gmNames = [];
    const participantHeaderRe = l=>{
      const bare = l.replace(/\s/g, "").toLowerCase();
      return /^(pc|pl)[・.:：/／┊|｜](pl|pc)/.test(bare) || bare === "pcpl" || bare === "plpc";
    };
    lines.forEach((line, i)=>{
      if(participantHeaderRe(line)) return;
      const m = line.match(REPORT_ROLE_RE);
      if(m){
        m[2].split(/[、,，\/／|｜]/).map(n=>n.replace(/(様|さん|氏)\s*$/, "").trim())
          .filter(n=>n && n.length < 24 && !REPORT_ROLE_RE.test(n) && !detectSystemFromText(n))
          .forEach(n=>gmNames.push(n));
      }
    });
    lines.forEach((line, i)=>{
      if(/^(kp|dl|gm|キーパー|ゲームマスター)…?\s*$/i.test(line) && lines[i + 1] && !REPORT_ROLE_RE.test(lines[i + 1]) && !/[「『]/.test(lines[i + 1]) && !participantHeaderRe(lines[i + 1])){
        const n = lines[i + 1].replace(/(様|さん|氏)\s*$/, "").trim();
        if(n && n.length < 24 && !detectSystemFromText(n)) gmNames.push(n);
      }
    });
    if(gmNames.length) row.gm = [...new Set(gmNames)].join("、");

    const headerIdx = lines.findIndex(participantHeaderRe);
    const { pcs, pls, hos } = parseParticipants(lines, headerIdx);
    if(pcs.length) row.pc = [...new Set(pcs.filter(Boolean))].join(" / ");
    if(pls.length) row.players = [...new Set(pls.filter(Boolean))].join("、");
    if(hos.length) row.ho = [...new Set(hos)].join(" ");

    const resLine = lines.find(l=>/(end\b|エンド|クリア|scenario\s*clear|生還|ロスト|グッドエンド|ゲームクリア)/i.test(l) && l.length < 48 && !/[「『【]/.test(l));
    if(resLine){
      row.ending = resLine.replace(/^[-–—―─\s]+|[-–—―─\s]+$/g, "").trim();
      const s = resLine.match(/全生還|全ロスト|生還|ロスト/);
      if(s) row.survival = s[0];
    }

    return row;
  }

  function parseListExport(raw){
    const rows = [];
    let groupSystem = "", groupGm = "", groupRole = "";
    raw.split("\n").map(l=>l.trim()).forEach(line=>{
      if(!line) return;
      const gh = line.match(/^【\s*(.+?)\s*】$/);
      if(gh){
        const g = gh[1];
        const sys = detectSystemFromText(g);
        if(sys) groupSystem = sys;
        else if(/^(pl|kp|gm|dl)/i.test(g)) groupRole = g.toUpperCase().slice(0, 2);
        else groupGm = g;
        return;
      }
      if(/^[◼◻■□▪▫◾◽]?\s*GM(した|担当)/.test(line)){ groupRole = "KP"; return; }
      const countHead = line.match(/^[◼◻■□▪▫◾◽]?[︎\s]*(\d+)\s*(pl|人)/i);
      if(countHead){ groupRole = ""; return; }
      const m = line.match(/^\d+[.．)]\s*(.+)$/);
      if(!m) return;
      const parts = m[1].split(/\s*[\/／]\s*/).map(p=>p.trim());
      const row = { scenario: parts[0].replace(/[「『【《〈」』】》〉]/g, "").trim() };
      if(parts[1]) row.system = detectSystemFromText(parts[1]) || parts[1];
      if(parts[2] && /^(pl|kp|gm|dl)$/i.test(parts[2])) row.role = parts[2].toUpperCase();
      if(parts[3]) row.date = parts[3];
      if(!row.system && groupSystem) row.system = groupSystem;
      if(!row.role && groupRole) row.role = groupRole;
      if(!row.gm && groupGm) row.gm = groupGm;
      if(row.scenario) rows.push(row);
    });
    return rows;
  }

  // ----- CCFOLIA 部屋データ / チャットログ -----

  const DICE_RE = /\b\d{0,2}[dD]\d{1,3}\b|ccb?<=|\bscc?\b|1d100|→\s*(決定的成功|致命的失敗|クリティカル|ファンブル|スペシャル|成功|失敗)|【\s*(判定|技能|SAN)/i;

  function walkJson(node, cb, depth){
    depth = depth || 0;
    if(node == null || depth > 8) return;
    if(Array.isArray(node)){ if(node.length < 4000) node.forEach(n=>walkJson(n, cb, depth + 1)); return; }
    if(typeof node === "object"){ cb(node, depth); Object.values(node).forEach(v=>walkJson(v, cb, depth + 1)); }
  }

  function cleanRoomName(name){
    return String(name || "")
      .replace(/[【\[（(]\s*(coc|coc6|coc7|新?クトゥルフ[^\]】）)]*|エモクロア|マダミス|シノビガミ|インセイン|dx3?|ダブルクロス|sw2\.?5?|ソード・?ワールド)\s*[】\]）)]/gi, "")
      .replace(/\s*[\/／|｜]\s*(kp|dl|gm)\s*[:：].*/i, "")
      .replace(/\s*(kp|dl|gm)\s*[:：]\s*\S+\s*$/i, "")
      .replace(/\s*[:：]?\s*(募集中?|満卓|クローズ|進行中|終了|済|完走).*/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function collectCharacterNames(data, into){
    walkJson(data, node=>{
      if((node.kind === "character" || node.type === "character") && node.data && typeof node.data.name === "string"){
        into.add(node.data.name.trim());
      }
      if(Array.isArray(node.characters)){
        node.characters.forEach(c=>{ if(c && typeof c.name === "string" && c.name.trim()) into.add(c.name.trim()); });
      }
    });
  }

  function findRoomName(data){
    let found = "";
    walkJson(data, node=>{
      if(found) return;
      if(node.kind === "room" && node.data && typeof node.data.name === "string"){ found = node.data.name; return; }
      if(typeof node.name === "string" && node.name.trim() && node.name.length < 120 &&
        (Array.isArray(node.characters) || node.mediaList || node.screenName || node.roomId || node.bgmUrl !== undefined)){
        found = node.name;
      }
    });
    if(!found && data && data.data && typeof data.data.name === "string") found = data.data.name;
    return found.trim();
  }

  function chatLogLines(text, name){
    if(/<(p|body|html|div|table)\b/i.test(text)){
      const doc = new DOMParser().parseFromString(text, "text/html");
      const title = doc.querySelector("title")?.textContent?.trim();
      const rows = [...doc.querySelectorAll("p, tr, div.log, .p-log__row")].map(el=>{
        const spans = [...el.querySelectorAll("span")];
        if(spans.length >= 2){
          const nameSpan = spans[spans.length >= 3 ? 1 : 0];
          const nm = (spans.length >= 3 ? spans[1] : spans[spans.length - 1]).textContent.trim();
          return { name: nm, text: el.textContent.replace(/\s+/g, " ").trim() };
        }
        return { name: "", text: el.textContent.replace(/\s+/g, " ").trim() };
      }).filter(r=>r.text);
      return { title, rows };
    }
    return {
      title: "",
      rows: text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>({ name: "", text: l }))
    };
  }

  async function handleCcfoliaFiles(event){
    const files = [...(event.target.files || [])];
    if(!files.length) return;
    els.ccfoliaFileName.textContent = files.map(f=>f.name).join("、");
    const loaded = await Promise.all(files.map(f=>f.text().then(text=>({ name: f.name, text, mtime: f.lastModified || 0 }))));

    let scenario = "", system = "", date = "";
    let latestMtime = 0;
    const speakers = new Map();
    const timestampRe = /(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/;

    for(const { name, text, mtime } of loaded){
      latestMtime = Math.max(latestMtime, mtime);
      const looksJson = /\.json$/i.test(name) || /^\s*\{[\s\S]{0,600}"(kind|data|characters|name|params)"/.test(text);
      if(looksJson){
        try{
          const data = JSON.parse(text);
          const room = findRoomName(data);
          if(room && !scenario){ scenario = cleanRoomName(room); if(!system) system = detectSystemFromText(room); }
          const names = new Set();
          collectCharacterNames(data, names);
          names.forEach(nm=>{
            if(!nm || nm.length > 24) return;
            if(!speakers.has(nm)) speakers.set(nm, { name: nm, msgCount: 0, diceCount: 0, fromJson: true });
            else speakers.get(nm).fromJson = true;
          });
        }catch(_error){ /* not valid json, ignore */ }
        continue;
      }
      const { title, rows } = chatLogLines(text, name);
      if(title && !scenario){ scenario = cleanRoomName(title); if(!system) system = detectSystemFromText(title); }
      rows.forEach(({ name: spName, text: body })=>{
        if(!date){ const m = body.match(timestampRe); if(m) date = `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`; }
        let nm = spName;
        let msg = body;
        if(!nm){
          const cleaned = body
            .replace(/^\s*\[[^\]]*\]\s*/, "")
            .replace(/^\s*［[^］]*］\s*/, "")
            .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*/, "");
          const m = cleaned.match(/^([^:：\n]{1,24}?)\s*[:：]\s+(\S.*)$/);
          if(!m) return;
          nm = m[1].trim();
          msg = m[2];
        }
        if(!nm || nm.length > 24 || /^(system|システム|bcdice|dicebot|ダイス(ロール)?|情報|メイン|全体|雑談|log)$/i.test(nm)) return;
        if(!speakers.has(nm)) speakers.set(nm, { name: nm, msgCount: 0, diceCount: 0 });
        const s = speakers.get(nm);
        s.msgCount++;
        if(DICE_RE.test(msg)) s.diceCount++;
      });
    }

    importCcfolia.scenario = scenario;
    importCcfolia.system = system;
    importCcfolia.date = date || (latestMtime ? new Date(latestMtime).toISOString().slice(0, 10) : "");
    importCcfolia.speakers = [...speakers.values()].sort((a, b)=> (b.diceCount - a.diceCount) || (b.msgCount - a.msgCount) || (b.fromJson ? 1 : 0) - (a.fromJson ? 1 : 0));
    autoAssignSpeakers();

    els.ccScenario.value = importCcfolia.scenario;
    els.ccDate.value = importCcfolia.date;
    els.ccSystem.value = importCcfolia.system;
    els.ccfoliaForm.hidden = false;
    renderSpeakerList();
    renderCcfoliaPreview();

    els.ccfoliaParseMsg.hidden = false;
    els.ccfoliaParseMsg.textContent = importCcfolia.speakers.length
      ? `発言者 ${importCcfolia.speakers.length} 名を検出。ダイス回数の多い順に PC を割り当てました。シナリオ名・日付・割り当てを確認してください。`
      : "キャラ名・発言者を検出できませんでした。部屋データ（.json）かチャットログ（.html）か確認してください。";
    els.ccfoliaFileInput.value = "";
  }

  function autoAssignSpeakers(){
    const selfNames = getSelfNames();
    const list = importCcfolia.speakers;
    const maxDice = Math.max(0, ...list.map(s=>s.diceCount));
    list.forEach((s, i)=>{
      const isSelf = selfNames.has(normalizePersonName(s.name));
      if(/\bNPC\b|ＮＰＣ|モブ|背景|エキストラ/i.test(s.name)){ s.role = ""; return; }
      if(isSelf && (s.diceCount === 0 || s.diceCount * 3 < maxDice)){ s.role = "kp"; return; }
      if(s.fromJson || s.diceCount > 0){ s.role = "pc"; return; }
      s.role = (i < 5 && s.msgCount >= 2) ? "pc" : "";
    });
  }

  function renderSpeakerList(){
    if(!els.ccSpeakers) return;
    els.ccSpeakers.innerHTML = importCcfolia.speakers.map((s, i)=>{
      const opts = [["pc", "PC"], ["pl", "PL"], ["kp", "KP / GM"], ["", "除外"]]
        .map(([v, label])=>`<option value="${v}" ${s.role === v ? "selected" : ""}>${label}</option>`).join("");
      const parts = [];
      if(s.fromJson) parts.push("駒");
      if(s.msgCount) parts.push(`発言${s.msgCount}`);
      if(s.diceCount) parts.push(`ダイス${s.diceCount}`);
      const meta = parts.join("・") || "—";
      return `<label class="cc-speaker"><span class="cc-speaker-name">${escapeHtml(s.name)}</span><span class="cc-speaker-meta">${meta}</span><select data-speaker="${i}">${opts}</select></label>`;
    }).join("");
  }

  function ccfoliaRow(){
    const pcs = importCcfolia.speakers.filter(s=>s.role === "pc").map(s=>s.name);
    const pls = importCcfolia.speakers.filter(s=>s.role === "pl").map(s=>s.name);
    const kps = importCcfolia.speakers.filter(s=>s.role === "kp").map(s=>s.name);
    const scenario = (els.ccScenario?.value || importCcfolia.scenario || "").trim();
    if(!scenario && !pcs.length && !kps.length) return null;
    const row = {
      scenario,
      date: (els.ccDate?.value || importCcfolia.date || "").trim(),
      system: (els.ccSystem?.value || importCcfolia.system || "").trim(),
      pc: pcs.join(" / "),
      players: pls.join("、"),
      gm: kps.join("、")
    };
    return row;
  }

  function renderCcfoliaPreview(){
    const row = ccfoliaRow();
    if(!row){
      if(els.importPreviewArea) els.importPreviewArea.hidden = true;
      updateRunImportEnabled();
      return;
    }
    renderImportPreview([normalizeImportedRow(applySelfRole(coerceImportValues({ ...row })))]);
  }

  function handleJsonFilePicked(event){
    const file = event.target.files?.[0];
    if(!file){ jsonImportPayload = null; updateRunImportEnabled(); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const parsed = JSON.parse(String(reader.result));
        if(!parsed || !Array.isArray(parsed.rows)) throw new Error("no rows");
        jsonImportPayload = parsed;
        if(els.jsonFileName) els.jsonFileName.textContent = `${file.name}（${parsed.rows.length} 行）`;
      }catch(error){
        console.error(error);
        jsonImportPayload = null;
        if(els.jsonFileName) els.jsonFileName.textContent = "読み込みに失敗しました。JSON出力で作成したファイルを選んでください。";
      }
      updateRunImportEnabled();
    };
    reader.readAsText(file);
  }

  function ensureColumnsForKeys(keys){
    keys.forEach(key=>{
      if(state.columns.some(col=>col.key === key)) return;
      const optional = optionalColumns.find(col=>col.key === key);
      if(optional) showColumn(optional);
    });
  }

  function runImport(){
    const target = getImportTarget();
    const tab = activeImportTab();
    let importedRows = [];
    let importedColumns = null;

    if(tab === "json"){
      if(!jsonImportPayload) return;
      importedRows = jsonImportPayload.rows.map(row=>normalizeImportedRow(row));
      importedColumns = Array.isArray(jsonImportPayload.columns) ? jsonImportPayload.columns : null;
    }else if(tab === "text"){
      importedRows = buildReportRows().map(row=>({ ...row, id: cryptoId() }));
      if(!importedRows.length){ alert("取り込める卓報告がありません。"); return; }
    }else if(tab === "ccfolia"){
      const row = ccfoliaRow();
      if(!row){ alert("取り込める内容がありません。"); return; }
      importedRows = [{ ...normalizeImportedRow(applySelfRole(coerceImportValues(row))), id: cryptoId() }];
    }else{
      importedRows = buildSheetRows().map(row=>({ ...row, id: cryptoId() }));
      if(!importedRows.length){ alert("取り込める行がありません。"); return; }
    }

    if(els.dupSkipInput?.checked){
      const seen = new Set(target === "overwrite" ? [] : state.rows.map(sessionDupKey).filter(Boolean));
      importedRows = importedRows.filter(row=>{
        const k = sessionDupKey(row);
        if(!k) return true;
        if(seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    if(target === "overwrite"){
      state = {
        rows: importedRows.map(row=>({ ...row, id: row.id || cryptoId() })),
        columns: importedColumns && importedColumns.length ? importedColumns : clone(defaultColumns),
        migrations: { ...(state.migrations || {}), hashtagOptional: true, reportedColumn: true }
      };
    }else{
      state.rows = [...state.rows, ...importedRows.map(row=>({ ...row, id: row.id || cryptoId() }))];
      if(importedColumns) state.columns = mergeColumns(state.columns, importedColumns);
    }

    if(tab === "sheet"){
      ensureColumnsForKeys([...new Set(importSheet.mapping.filter(Boolean))]);
    }else if(tab === "text"){
      const keys = new Set();
      importedRows.forEach(row=>["hashtag", "ending", "survival", "campaign", "ho"].forEach(k=>{ if(row[k]) keys.add(k); }));
      ensureColumnsForKeys([...keys]);
    }

    activeId = state.rows[0]?.id || null;
    saveAndRender();
    els.importDialog.close();
    alert(`${importedRows.length} 件を取り込みました。`);
  }

  function downloadImportTemplate(){
    const headers = SHEET_TARGET_FIELDS
      .filter(([key])=>!["longNote", "scenarioCountKey"].includes(key))
      .map(([, label])=>label.split(/[ (（]/)[0]);
    const examples = [
      ["2024-01-06", "悪霊の家", "CoC 6版", "PL", "のあ", "くま。、とこ", "御堂 蓮", "完結", "4", "初回。導入〜脱出まで。", "", "#CoC #卓報告", "END A", "生還", "", "", ""],
      ["2024/2/10, 2024/2/17", "塔の中", "CoC 7版", "KP", "自分", "A、B、C", "", "継続", "6", "2週にわけて実施。", "塔シリーズ", "", "", "", "", "", ""]
    ];
    const csv = "﻿" + [headers, ...examples].map(cells=>cells.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "session-log-import-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function csvCell(value){
    const text = String(value == null ? "" : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
        const insertColumn = { ...column, width: clampColumnWidth(column.key, Number(column.width) || COLUMN_DEFAULT_WIDTHS[column.key] || 140) };
        if(reportIndex >= 0) merged.splice(reportIndex,0,insertColumn);
        else merged.push(insertColumn);
      }
    });
    return merged;
  }

  const SYSTEM_SORT_PRIORITY = ["CoC 6版", "CoC 7版", "エモクロア", "マダミス"];

  function setExportMode(mode){
    if(!EXPORT_MODES.includes(mode)) return;
    exportMode = mode;
    (els.exportModeButtons || []).forEach(btn=>btn.classList.toggle("is-active", btn.dataset.exportMode === mode));
    renderExport();
  }

  function renderExport(){
    if(!els.textExportOutput) return;
    const rows = getExportRows();
    let output = "";
    if(exportMode === "system") output = buildSystemText(rows);
    else if(exportMode === "role") output = buildRoleText(rows);
    else if(exportMode === "sessions") output = buildSessionsText(rows);
    else output = buildAllScenarioText(rows);
    els.textExportOutput.value = output;
    updateExportHint(rows);
  }

  function getExportRows(){
    const q = String(exportQuery || "").trim().toLocaleLowerCase("ja");
    const rows = state.rows.filter(row=>{
      if(!q) return true;
      return [row.scenario, row.gm, row.players, row.pc, row.note, row.campaign]
        .some(value=>String(value || "").toLocaleLowerCase("ja").includes(q));
    });
    return rows.sort((a,b)=>exportPrimaryDate(a).localeCompare(exportPrimaryDate(b)));
  }

  function exportPrimaryDate(row){
    return getPrimaryDate(row) || "9999-99-99";
  }

  function updateExportHint(rows){
    if(!els.exportSearchHint) return;
    const q = String(exportQuery || "").trim();
    if(!q){ els.exportSearchHint.textContent = ""; return; }
    if(!rows.length){ els.exportSearchHint.textContent = `「${q}」に一致するセッションはありません。`; return; }
    els.exportSearchHint.textContent = `「${q}」に一致：${rows.length} セッション / ${uniqueScenarioList(rows).length} シナリオ`;
  }

  function displayScenarioName(row){
    return normalizeScenarioForCount(row.scenario) || String(row.scenario || "").trim() || "未設定";
  }

  function plCountLabel(row){
    return `${Math.max(splitPeople(row.players).length, 1)}PL`;
  }

  function roleGroupLabel(row){
    const group = normalizeRoleGroup(row.role);
    if(group === "GM") return "KP / GM";
    if(group === "PL") return "PL";
    return "その他";
  }

  // Collapse rows to unique scenarios (keyed by scenarioCountKey), keeping the
  // earliest-date row as representative and counting how many times it was played.
  function uniqueScenarioList(rows){
    const map = new Map();
    rows.forEach(row=>{
      const key = scenarioCountKey(row).toLocaleLowerCase("ja");
      if(!key) return;
      const date = exportPrimaryDate(row);
      const existing = map.get(key);
      if(!existing){
        map.set(key, { row, count: 1, firstDate: date });
      }else{
        existing.count += 1;
        if(date < existing.firstDate){ existing.firstDate = date; existing.row = row; }
      }
    });
    return [...map.values()].sort((a,b)=>a.firstDate.localeCompare(b.firstDate));
  }

  function groupBy(items, keyFn){
    const groups = new Map();
    items.forEach(item=>{
      const key = keyFn(item) || "未設定";
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return groups;
  }

  function sortedSystemGroups(groups){
    return [...groups.entries()].sort((a,b)=>{
      const ia = SYSTEM_SORT_PRIORITY.indexOf(a[0]);
      const ib = SYSTEM_SORT_PRIORITY.indexOf(b[0]);
      if(ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return String(a[0]).localeCompare(String(b[0]), "ja");
    });
  }

  function plCountSections(entries){
    const byCount = groupBy(entries, entry=>plCountLabel(entry.row));
    return [...byCount.entries()]
      .sort((a,b)=>parseInt(a[0], 10) - parseInt(b[0], 10))
      .map(([count, items])=>{
        const lines = items.map((entry, index)=>`　　${index + 1}. ${displayScenarioName(entry.row)}`).join("\n");
        return `　${count}\n${lines}`;
      }).join("\n");
  }

  function buildAllScenarioText(rows){
    const list = uniqueScenarioList(rows);
    if(!list.length) return "";
    const header = `【全シナリオ】計 ${list.length} 本（${rows.length} 卓）`;
    const lines = list.map((entry, index)=>{
      const times = entry.count > 1 ? `（×${entry.count}）` : "";
      return `${index + 1}. ${displayScenarioName(entry.row)}${times}　${entry.firstDate}`;
    });
    return `${header}\n\n${lines.join("\n")}`;
  }

  function buildSystemText(rows){
    const list = uniqueScenarioList(rows);
    if(!list.length) return "";
    const bySystem = groupBy(list, entry=>entry.row.system || "システム未設定");
    return sortedSystemGroups(bySystem)
      .map(([system, entries])=>`【${system}】計 ${entries.length} 本\n${plCountSections(entries)}`)
      .join("\n\n");
  }

  function buildRoleText(rows){
    const byRole = groupBy(rows, roleGroupLabel);
    const order = ["PL", "KP / GM", "その他"];
    return order
      .filter(roleKey=>byRole.get(roleKey)?.length)
      .map(roleKey=>{
        const list = uniqueScenarioList(byRole.get(roleKey));
        const bySystem = groupBy(list, entry=>entry.row.system || "システム未設定");
        const body = sortedSystemGroups(bySystem)
          .map(([system, entries])=>`【${system}】\n${plCountSections(entries)}`)
          .join("\n\n");
        return `■ ${roleKey} で通過（${list.length} 本）\n${body}`;
      }).join("\n\n\n");
  }

  function buildSessionsText(rows){
    if(!rows.length) return "";
    const header = `【セッション一覧】${rows.length} 卓`;
    const blocks = rows.map((row, index)=>{
      const date = getDateDisplay(row) || "日付未設定";
      const role = normalizeRoleGroup(row.role) === "GM" ? "KP/GM" : (row.role || "-");
      const head = `${index + 1}. ${date}　${row.system || "-"}　${role}　${String(row.scenario || "").trim() || "未設定"}`;
      const people = [];
      if(row.gm) people.push(`KP/GM: ${row.gm}`);
      if(row.players) people.push(`PL: ${row.players}`);
      if(row.pc) people.push(`PC: ${row.pc}`);
      return people.length ? `${head}\n　${people.join(" ／ ")}` : head;
    });
    return `${header}\n\n${blocks.join("\n")}`;
  }

  async function copyExportOutput(){
    const text = els.textExportOutput?.value || "";
    if(!text) return;
    try{
      await navigator.clipboard.writeText(text);
    }catch(_error){
      els.textExportOutput.select();
      document.execCommand("copy");
    }
    flashButtonLabel(els.exportCopyBtn, "コピーしました");
  }

  function flashButtonLabel(button, message){
    if(!button) return;
    if(!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
    button.textContent = message;
    clearTimeout(button._flashTimer);
    button._flashTimer = setTimeout(()=>{ button.textContent = button.dataset.originalLabel; }, 1400);
  }

  function getAllExtraColumns(){
    const map = new Map();
    [...optionalColumns, ...(state.customColumns || []), ...(state.hiddenColumns || []).filter(col=>col.custom)].forEach(col=>map.set(col.key, col));
    return [...map.values()];
  }

  function getDialogColumns(){
    const map = new Map();
    defaultColumns.filter(col=>col.key !== "report" && col.key !== "reported").forEach(col=>map.set(col.key, col));
    getAllExtraColumns().forEach(col=>map.set(col.key, col));
    state.columns.filter(col=>!col.locked).forEach(col=>map.set(col.key, col));
    return [...map.values()];
  }

  function getColumnLabel(col){
    const defaultColumn = defaultColumns.find(item=>item.key === col.key);
    const extraColumn = optionalColumns.find(item=>item.key === col.key);
    return extraColumn?.label || defaultColumn?.label || col.label || col.key;
  }

  function isUrlColumn(key){ return /Url$/.test(String(key || "")); }

  function updateReportStickyState(){
    const scroll = document.querySelector(".table-scroll");
    if(!scroll) return;
    const atEnd = Math.ceil(scroll.scrollLeft + scroll.clientWidth) >= scroll.scrollWidth - 8;
    scroll.classList.toggle("is-scrolled-end", atEnd);
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
    // 「、」「,」を主な区切りとして扱う。中黒「・」「･」は
    // 「ジョン・スミス」のような英名・カナ名の一部に使われることがあるため、
    // PL / PC / GM の人数を誤って分割しないよう区切り文字から除外する。
    return String(value || "")
      .split(/[、,，\/／&＆＋+;；\n\r]+|\s+と\s+|\s+and\s+/i)
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
    if(col.key === "date") return dateInputsMarkup(row);
    if(col.key === "system"){
      const isKnown = SYSTEM_OPTIONS.includes(value);
      const options = SYSTEM_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
      return `<select name="system" data-system-select><option value="__custom" ${!isKnown && value ? "selected" : ""}>自由入力</option>${options}</select><input name="systemCustom" data-system-custom value="${escapeAttr(isKnown ? "" : value)}" placeholder="システム名を入力" ${isKnown || !value ? "hidden" : ""} />`;
    }
    if(col.key === "role") return `<select name="${escapeAttr(col.key)}">${ROLE_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
    if(col.key === "status") return `<select name="status">${STATUS_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
    if(col.key === "survival") return `<select name="survival">${SURVIVAL_OPTIONS.map(option=>`<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option || "未設定")}</option>`).join("")}</select>`;
    if(col.key === "fav") return `<label class="fav-input"><input type="checkbox" name="fav" value="★" ${value ? "checked" : ""} /> <span>☆ / ★</span></label>`;
    if(col.key === "time") return `<span class="field-with-unit"><input name="time" type="text" inputmode="decimal" value="${escapeAttr(normalizeTimeValue(value))}" placeholder="例：4" /><span class="field-unit">時間</span></span>`;
    if(isUrlColumn(col.key)) return `<input type="url" name="${escapeAttr(col.key)}" value="${escapeAttr(value)}" placeholder="https://" />`;
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
    const dates = row.dates || [];
    return dates.length ? dates[dates.length - 1] : (row.date || "");
  }

  function getDateDisplay(row){
    normalizeRowDates(row);
    const dates = row.dates || [];
    if(!dates.length) return "";
    const latest = dates[dates.length - 1];
    return dates.length === 1 ? latest : `${latest} 他${dates.length - 1}日`;
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
      .normalize("NFKC")
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

  function normalizeTimeValue(value){
    const text = String(value == null ? "" : value).trim().normalize("NFKC");
    if(!text) return "";
    const hm = text.match(/^(\d+)\s*[:：時]\s*(\d{1,2})\s*分?$/);
    if(hm){
      const hours = Number(hm[1]) + Number(hm[2]) / 60;
      return String(Math.round(hours * 100) / 100);
    }
    const num = text.match(/\d+(?:\.\d+)?/);
    return num ? num[0] : "";
  }

  function timeDisplay(value){
    const num = normalizeTimeValue(value);
    return num ? `${num}時間` : "";
  }
  function getCellClass(key){ return `cell-${cssSafeKey(key)} ${["scenario","players","pc","note","hashtag","date"].includes(key) ? "truncate-td" : ""}`.trim(); }

  function applyColumnWidth(element,col){
    const width = clampColumnWidth(col.key, Number(col.width) || COLUMN_DEFAULT_WIDTHS[col.key] || 140);
    element.style.width = `${width}px`;
    element.style.minWidth = `${width}px`;
    element.style.maxWidth = `${width}px`;
  }

  function clampColumnWidth(key,width){
    const min = COLUMN_MIN_WIDTHS[key] || 72;
    const max = key === "scenario" || key === "note" ? 520 : 360;
    return Math.max(min, Math.min(max, Math.round(width)));
  }

  function getDynamicTextLimit(col){
    const key = col?.key;
    const base = TABLE_TEXT_LIMITS[key] || 0;
    if(!base) return 0;
    const defaultWidth = COLUMN_DEFAULT_WIDTHS[key] || 140;
    const width = Number(col.width) || defaultWidth;
    const limit = Math.floor(base * Math.max(1, width / defaultWidth));
    return Math.min(TABLE_TEXT_LIMIT_MAX[key] || limit, Math.max(base, limit));
  }

  function textCell(value,className="",limit=0){
    const raw = String(value || "");
    const span = document.createElement("span");
    span.className = `${className} truncate-cell`.trim();
    span.title = raw;
    span.textContent = limit ? truncateText(raw, limit) : raw;
    return span;
  }

  function truncateText(value,limit){
    const text = String(value || "");
    return [...text].length > limit ? `${[...text].slice(0, limit).join("")}…` : text;
  }

  function cssSafeKey(key){ return String(key || "").replace(/[^a-zA-Z0-9_-]/g,"-"); }
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
    window.SessionLogApp = { exportJson, openSessionDialog, closeDrawer, setSelfNames, openImportDialog };
  }
})();
