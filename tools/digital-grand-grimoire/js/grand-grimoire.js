import { loadInitialData, saveAllData, loadTheme, saveTheme } from "./storage.js";
import { filterItems, buildFilterOptions } from "./search.js";
import { openItemEditor, createNewItem } from "./editor.js";
import { findScenarioItem, renderScenarioEditor, collectScenarioEditor, upsertScenarioItem } from "./scenario-editor.js";
import { buildCopyText, copyToClipboard, typeLabel } from "./copy-output.js";
import { exportBackup, exportSingleItem, importBackupFromFile } from "./import-export.js";
import { TYPE_ICONS } from "./sample-data.js";

const state = {
  items: [],
  scenarioSets: [],
  categories: {},
  tags: [],
  sources: [],
  filters: {
    query: "",
    type: "all",
    category: "all",
    tag: "all"
  },
  selectedId: null,
  selectedType: null
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  applyInitialTheme();
  Object.assign(state, await loadInitialData());
  if (state.items.length) selectItem(state.items[0]);
  bindEvents();
  renderAll();
  toast("電子版グランド・グリモア v0.2 を読み込みました");
}

function bindElements() {
  Object.assign(els, {
    itemList: document.getElementById("itemList"),
    detailHeader: document.getElementById("detailHeader"),
    detailBody: document.getElementById("detailBody"),
    searchInput: document.getElementById("searchInput"),
    typeSelect: document.getElementById("typeSelect"),
    categorySelect: document.getElementById("categorySelect"),
    tagSelect: document.getElementById("tagSelect"),
    resultCount: document.getElementById("resultCount"),
    countAll: document.getElementById("countAll"),
    countSpell: document.getElementById("countSpell"),
    countGrimoire: document.getElementById("countGrimoire"),
    countArtifact: document.getElementById("countArtifact"),
    saveDataBtn: document.getElementById("saveDataBtn"),
    importDataBtn: document.getElementById("importDataBtn"),
    exportDataBtn: document.getElementById("exportDataBtn"),
    jsonFileInput: document.getElementById("jsonFileInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    saveScenarioBtn: document.getElementById("saveScenarioBtn"),
    copyScenarioBtn: document.getElementById("copyScenarioBtn"),
    copyOutput: document.getElementById("copyOutput"),
    themeToggle: document.getElementById("themeToggle"),
    toast: document.getElementById("toast")
  });
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    state.filters.query = els.searchInput.value;
    renderList();
  });
  els.typeSelect.addEventListener("change", () => {
    state.filters.type = els.typeSelect.value;
    syncTypeButtons();
    renderList();
  });
  els.categorySelect.addEventListener("change", () => {
    state.filters.category = els.categorySelect.value;
    renderList();
  });
  els.tagSelect.addEventListener("change", () => {
    state.filters.tag = els.tagSelect.value;
    renderList();
  });
  els.clearSearchBtn.addEventListener("click", clearFilters);
  els.saveDataBtn.addEventListener("click", () => {
    saveAllData(state);
    toast("localStorageに保存しました");
  });
  els.exportDataBtn.addEventListener("click", () => exportBackup(state));
  els.importDataBtn.addEventListener("click", () => els.jsonFileInput.click());
  els.jsonFileInput.addEventListener("change", handleImportFile);
  els.saveScenarioBtn.addEventListener("click", saveCurrentScenarioItem);
  els.copyScenarioBtn.addEventListener("click", () => copyCurrent("scenario"));
  els.themeToggle.addEventListener("click", toggleTheme);

  document.querySelectorAll(".type-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.type = button.dataset.type;
      els.typeSelect.value = state.filters.type;
      syncTypeButtons();
      renderList();
    });
  });

  document.querySelectorAll("[data-type-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.type = button.dataset.typeFilter;
      els.typeSelect.value = state.filters.type;
      syncTypeButtons();
      renderList();
    });
  });

  document.querySelectorAll("[data-action='new-item']").forEach((button) => {
    button.addEventListener("click", () => openNewItemEditor());
  });

  document.querySelectorAll("[data-copy-format]").forEach((button) => {
    button.addEventListener("click", () => copyCurrent(button.dataset.copyFormat));
  });

  document.getElementById("headerJsonBtn").addEventListener("click", () => exportBackup(state));
  document.getElementById("headerSearchBtn").addEventListener("click", () => els.searchInput.focus());
}

function renderAll() {
  renderFilterOptions();
  renderCounts();
  renderList();
  renderDetail();
  renderCurrentScenarioEditor();
}

function renderCounts() {
  els.countAll.textContent = state.items.length;
  els.countSpell.textContent = state.items.filter((item) => item.type === "spell").length;
  els.countGrimoire.textContent = state.items.filter((item) => item.type === "grimoire").length;
  els.countArtifact.textContent = state.items.filter((item) => item.type === "artifact").length;
}

function renderFilterOptions() {
  const { categories, tags } = buildFilterOptions(state.items);
  fillSelect(els.categorySelect, categories, "すべて");
  fillSelect(els.tagSelect, tags, "すべて");
}

function fillSelect(select, values, defaultText) {
  const current = select.value || "all";
  select.innerHTML = `<option value="all">${defaultText}</option>` + values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  select.value = [...values, "all"].includes(current) ? current : "all";
}

function renderList() {
  const filtered = filterItems(state.items, state.filters);
  els.resultCount.textContent = `全${filtered.length}件`;
  if (!filtered.length) {
    els.itemList.innerHTML = `<div class="info-block"><h2>該当データなし</h2><div>検索条件を変更するか、新規登録してください。</div></div>`;
    return;
  }

  els.itemList.innerHTML = filtered.map(renderItemCard).join("");
  els.itemList.querySelectorAll(".item-card").forEach((card) => {
    card.addEventListener("click", () => {
      const item = state.items.find((entry) => entry.id === card.dataset.id && entry.type === card.dataset.type);
      if (item) {
        selectItem(item);
        renderList();
        renderDetail();
        renderCurrentScenarioEditor();
      }
    });
  });
}

function renderItemCard(item) {
  const active = item.id === state.selectedId && item.type === state.selectedType;
  const iconClass = `icon-${item.type}`;
  const badges = [
    (item.favorite ?? item.isFavorite) ? `<span class="badge badge-gold">お気に入り</span>` : "",
    (item.scenarioEdited || findScenarioItem(state, item)) ? `<span class="badge badge-teal">シナリオ編集あり</span>` : ""
  ].filter(Boolean).join("");

  return `
    <button class="item-card ${active ? "active" : ""}" data-id="${escapeAttr(item.id)}" data-type="${escapeAttr(item.type)}">
      <div class="item-card-main">
        <div class="item-icon ${iconClass}">${item.icon || TYPE_ICONS[item.type] || "◇"}</div>
        <div class="item-content">
          <div class="item-title-row">
            <h3>【${typeLabel(item.type)}】${escapeHtml(item.name)}</h3>
            ${(item.favorite ?? item.isFavorite) ? `<span class="favorite-star">★</span>` : ""}
          </div>
          <p>カテゴリ：${escapeHtml(item.category || "未分類")}</p>
          <div class="tag-row">${(item.tags || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          <p>出典：${escapeHtml(item.source || "未設定")}</p>
          <div class="item-footer">
            <span class="badge-row">${badges}</span>
            <span>${formatDate(item.updatedAt)}</span>
          </div>
        </div>
      </div>
    </button>
  `;
}

function renderDetail() {
  const item = getSelectedItem();
  if (!item) {
    els.detailHeader.innerHTML = `<div class="detail-title-wrap"><div><h1 class="detail-title">データ未選択</h1></div></div>`;
    els.detailBody.innerHTML = "";
    return;
  }

  els.detailHeader.innerHTML = `
    <div class="detail-title-wrap">
      <div class="detail-icon icon-${item.type}">${item.icon || TYPE_ICONS[item.type] || "◇"}</div>
      <div>
        <div class="detail-kicker">【${typeLabel(item.type)}】 ${escapeHtml(item.category || "未分類")}</div>
        <h1 class="detail-title">${escapeHtml(item.name)}</h1>
        <div class="tag-row">${(item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="detail-meta">出典：${escapeHtml(item.source || "未設定")}　|　${escapeHtml(item.edition || "")}　|　${escapeHtml(item.page || "")}　|　更新日：${formatDate(item.updatedAt)}</div>
      </div>
    </div>
    <div class="detail-actions">
      <button class="gold-btn" id="editCurrentBtn">✎ 編集</button>
      <button class="primary-btn" id="makeScenarioCopyBtn">⧉ シナリオ用コピー</button>
      <button class="utility-btn" id="detailCopyBtn">⧉ コピー出力</button>
      <button class="utility-btn" id="detailJsonBtn">&lt;/&gt; JSON出力</button>
    </div>
  `;

  els.detailBody.innerHTML = buildDetailBlocks(item);

  document.getElementById("editCurrentBtn").addEventListener("click", () => openExistingItemEditor(item));
  document.getElementById("makeScenarioCopyBtn").addEventListener("click", saveCurrentScenarioItem);
  document.getElementById("detailCopyBtn").addEventListener("click", () => copyCurrent("keeper"));
  document.getElementById("detailJsonBtn").addEventListener("click", () => exportSingleItem(item));
}

function buildDetailBlocks(item) {
  const common = [
    infoBlock("別名・原題", (item.alternative_names || []).join(" / ")),
    infoBlock("効果概要", item.effect_summary),
    infoBlock("Keeper Note", item.keeper_note),
    infoBlock("PL Note", item.pl_note)
  ];

  const typeSpecific = {
    spell: [
      infoBlock("コスト概要", item.cost_summary),
      infoBlock("発動時間概要", item.casting_time_summary)
    ],
    grimoire: [
      infoBlock("言語・判読概要", item.language_summary),
      infoBlock("読了・研究時間概要", item.reading_time_summary),
      infoBlock("収録内容概要", item.contents_summary),
      infoBlock("収録呪文ID", (item.included_spells || []).join(" / "))
    ],
    artifact: [
      infoBlock("外見概要", item.appearance_summary),
      infoBlock("使用・起動条件概要", item.activation_summary),
      infoBlock("コスト概要", item.cost_summary),
      infoBlock("リスク概要", item.risk_summary),
      infoBlock("破壊・無効化概要", item.destruction_summary)
    ]
  }[item.type] || [];

  return [
    ...common.slice(0, 1),
    ...typeSpecific,
    ...common.slice(1),
    infoBlock("関連タグ", (item.tags || []).join(" / ")),
    infoBlock("想定読者", (item.audience || []).join(" / ")),
    infoBlock("出典・ページ", `${item.source || ""} ${item.edition || ""} ${item.page || ""}`),
    infoBlock("本文控え", item.full_text || "未登録")
  ].join("");
}

function infoBlock(title, value) {
  return `<section class="info-block"><h2>${escapeHtml(title)}</h2><div>${escapeHtml(value || "未設定")}</div></section>`;
}

function renderCurrentScenarioEditor() {
  const item = getSelectedItem();
  renderScenarioEditor(item, findScenarioItem(state, item));
}

function saveCurrentScenarioItem() {
  const item = getSelectedItem();
  if (!item) return;
  const previous = findScenarioItem(state, item);
  const next = collectScenarioEditor(item, previous);
  upsertScenarioItem(state, next);
  saveAllData(state);
  renderList();
  renderCurrentScenarioEditor();
  toast("シナリオ用編集を保存しました");
}

function copyCurrent(format) {
  const item = getSelectedItem();
  if (!item) return;
  const scenarioItem = findScenarioItem(state, item) || collectScenarioEditor(item, null);
  const text = buildCopyText(item, scenarioItem, format);
  els.copyOutput.value = text;
  copyToClipboard(text).then((ok) => toast(ok ? "コピーしました" : "出力欄に生成しました"));
}

function openNewItemEditor() {
  const type = state.filters.type && state.filters.type !== "all" ? state.filters.type : "spell";
  const item = createNewItem(type);
  openItemEditor({
    item,
    onSave: (next) => {
      state.items.unshift(next);
      selectItem(next);
      saveAllData(state);
      renderAll();
      toast("新規データを登録しました");
    }
  });
}

function openExistingItemEditor(item) {
  openItemEditor({
    item,
    onSave: (next) => {
      const index = state.items.findIndex((entry) => entry.id === item.id && entry.type === item.type);
      if (index >= 0) state.items[index] = next;
      selectItem(next);
      saveAllData(state);
      renderAll();
      toast("データを更新しました");
    }
  });
}

async function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = await importBackupFromFile(file);
    if (imported.items) state.items = imported.items;
    if (imported.scenarioSets) state.scenarioSets = imported.scenarioSets;
    if (imported.categories) state.categories = imported.categories;
    if (imported.tags) state.tags = imported.tags;
    if (imported.sources) state.sources = imported.sources;
    if (state.items.length) selectItem(state.items[0]);
    saveAllData(state);
    renderAll();
    toast("JSONをインポートしました");
  } catch (error) {
    console.error(error);
    toast("JSONインポートに失敗しました");
  } finally {
    event.target.value = "";
  }
}

function clearFilters() {
  state.filters = { query: "", type: "all", category: "all", tag: "all" };
  els.searchInput.value = "";
  els.typeSelect.value = "all";
  els.categorySelect.value = "all";
  els.tagSelect.value = "all";
  syncTypeButtons();
  renderList();
}

function selectItem(item) {
  state.selectedId = item.id;
  state.selectedType = item.type;
}

function getSelectedItem() {
  return state.items.find((item) => item.id === state.selectedId && item.type === state.selectedType) || state.items[0] || null;
}

function syncTypeButtons() {
  document.querySelectorAll(".type-filter").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === state.filters.type);
  });
}

function applyInitialTheme() {
  const theme = loadTheme();
  document.body.classList.toggle("light", theme === "light");
}

function toggleTheme() {
  const next = document.body.classList.toggle("light") ? "light" : "dark";
  saveTheme(next);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function formatDate(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ja-JP");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#039;");
}
