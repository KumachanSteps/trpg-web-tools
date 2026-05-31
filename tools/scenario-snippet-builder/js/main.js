const INFO_TYPES = {
  scene: { label: "シーン", marker: "◆", color: "#5865f2" },
  location: { label: "探索箇所", marker: "▼", color: "#16a34a" },
  document: { label: "資料情報", marker: "■", color: "#ca8a04" },
  npc: { label: "NPC情報", marker: "◇", color: "#eab308" },
  skill: { label: "技能成功", marker: "●", color: "#dc2626" },
  memo: { label: "メモ", marker: "・", color: "#64748b" },
  item: { label: "アイテム", marker: "◈", color: "#0891b2" },
  rule: { label: "ルール", marker: "※", color: "#0f766e" },
  ho1: { label: "HO1", marker: "◎", color: "#db2777" },
  ho2: { label: "HO2", marker: "〓", color: "#ea580c" },
  ho3: { label: "HO3", marker: "△", color: "#2563eb" },
  ho4: { label: "HO4", marker: "❖", color: "#7c3aed" }
};

const STORAGE_KEY = "trpgScenarioSnippetBuilder_v2_7";
const BRIDGE_KEY = "scenarioSnippetBuilder.importText";

let cards = [];
let activeFilter = "all";
let searchMatches = [];
let currentSearchIndex = -1;
let draggingCardId = null;

const appRoot = document.getElementById("appRoot");
const themeToggle = document.getElementById("themeToggle");
const openTxtBtn = document.getElementById("openTxtBtn");
const clearTextBtn = document.getElementById("clearTextBtn");
const txtFileInput = document.getElementById("txtFileInput");
const parsedText = document.getElementById("parsedText");
const cardsList = document.getElementById("cardsList");
const cardsScrollUpBtn = document.getElementById("cardsScrollUpBtn");
const cardsScrollDownBtn = document.getElementById("cardsScrollDownBtn");
const statusEl = document.getElementById("status");
const newCardType = document.getElementById("newCardType");
const selectionCardType = document.getElementById("selectionCardType");
const typeFilterRow = document.getElementById("typeFilterRow");
const searchBox = document.getElementById("searchBox");
const searchCount = document.getElementById("searchCount");
const projectNameInput = document.getElementById("projectNameInput");
const saveProjectBtn = document.getElementById("saveProjectBtn");
const savedProjectSelect = document.getElementById("savedProjectSelect");
const loadProjectBtn = document.getElementById("loadProjectBtn");
const copyCcfDeckBtn = document.getElementById("copyCcfDeckBtn");
const exportProjectBtn = document.getElementById("exportProjectBtn");
const importProjectBtn = document.getElementById("importProjectBtn");
const importProjectInput = document.getElementById("importProjectInput");
const prevSearchBtn = document.getElementById("prevSearchBtn");
const nextSearchBtn = document.getElementById("nextSearchBtn");
const bridgeNote = document.getElementById("bridgeNote");

themeToggle.addEventListener("click", toggleTheme);
saveProjectBtn.addEventListener("click", saveNamedProject);
savedProjectSelect.addEventListener("change", handleSavedProjectSelect);
loadProjectBtn.addEventListener("click", loadNamedProject);
copyCcfDeckBtn.addEventListener("click", copyCcfDeckPayload);
exportProjectBtn.addEventListener("click", exportProjectJson);
importProjectBtn.addEventListener("click", () => importProjectInput.click());
importProjectInput.addEventListener("change", importProjectJson);
projectNameInput.addEventListener("input", saveState);
openTxtBtn.addEventListener("click", () => txtFileInput.click());
clearTextBtn.addEventListener("click", clearTextOnly);
txtFileInput.addEventListener("change", openTxtFile);
document.getElementById("addCardBtn").addEventListener("click", () => addCard({ type: newCardType.value || "scene" }));
document.getElementById("createFromSelectionBtn").addEventListener("click", createCardFromSelection);
document.getElementById("searchBtn").addEventListener("click", () => searchParsedText("first"));
prevSearchBtn.addEventListener("click", () => moveSearchResult(-1));
nextSearchBtn.addEventListener("click", () => moveSearchResult(1));
cardsScrollUpBtn.addEventListener("click", () => scrollCardsByPage(-1));
cardsScrollDownBtn.addEventListener("click", () => scrollCardsByPage(1));

searchBox.addEventListener("input", updateSearchMatches);
searchBox.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    moveSearchResult(event.shiftKey ? -1 : 1);
  }
});

parsedText.addEventListener("input", () => {
  updateSearchMatches();
  saveState();
});

newCardType.addEventListener("change", saveState);
selectionCardType.addEventListener("change", saveState);
document.addEventListener("keydown", handleShortcuts);

typeFilterRow.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeFilter = button.dataset.filter;
  renderTypeFilters();
  renderCards();
  cardsList.scrollTop = 0;
  saveState();
});


cardsList.addEventListener("dragstart", event => {
  const handle = event.target.closest(".card-drag-handle");
  if (!handle) {
    event.preventDefault();
    return;
  }

  const cardEl = handle.closest(".card");
  if (!cardEl) {
    event.preventDefault();
    return;
  }

  draggingCardId = cardEl.dataset.cardId;
  cardEl.classList.add("dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggingCardId);
  }
});

cardsList.addEventListener("dragend", () => {
  draggingCardId = null;
  clearCardDragState();
});

cardsList.addEventListener("dragover", event => {
  if (!draggingCardId) return;

  const overCard = event.target.closest(".card");
  if (!overCard || overCard.dataset.cardId === draggingCardId) return;

  event.preventDefault();
  clearCardDragOverState();
  overCard.classList.add("drag-over");

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
});

cardsList.addEventListener("dragleave", event => {
  const overCard = event.target.closest(".card");
  if (overCard) {
    overCard.classList.remove("drag-over");
  }
});

cardsList.addEventListener("drop", event => {
  if (!draggingCardId) return;

  const targetCard = event.target.closest(".card");
  if (!targetCard || targetCard.dataset.cardId === draggingCardId) return;

  event.preventDefault();
  reorderCardByDrop(draggingCardId, targetCard.dataset.cardId);
  draggingCardId = null;
  clearCardDragState();
});

cardsList.addEventListener("input", event => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  const card = cards.find(c => c.id === id);

  if (!card) return;

  if (action === "title") card.title = event.target.value;
  if (action === "extra") card.extra = event.target.value;
  if (action === "body") {
    card.body = event.target.value;
    adjustCardTextareaHeight(event.target);
  }

  saveState();
});

cardsList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;
  const card = cards.find(c => c.id === id);

  if (!action || !id) return;

  if (action === "typeIcon") {
    if (!card) return;
    card.type = INFO_TYPES[target.dataset.type] ? target.dataset.type : card.type;
    renderCards();
    saveState();
    setStatus("カードタイプを変更しました。");
    return;
  }

  if (action === "copy") {
    copyCard(id);
    return;
  }

  if (action === "ccfoliaCard") {
    copyCcfCardPayload(id);
    return;
  }

  if (action === "delete") {
    cards = cards.filter(c => c.id !== id);
    renderCards();
    saveState();
    setStatus("カードを削除しました。");
    return;
  }

  if (action === "duplicate") {
    if (!card) return;
    cards.push({
      id: createId(),
      type: card.type,
      title: `${card.title} コピー`,
      body: card.body,
      extra: card.extra || ""
    });
    renderCards();
    saveState();
    setStatus("カードを複製しました。");
  }
});




function setProjectNameFromSourceFile(fileName) {
  if (getCurrentProjectName()) return;

  const baseName = String(fileName || "")
    .replace(/\.[^/.]+$/, "")
    .trim();

  if (baseName) {
    projectNameInput.value = baseName;
  }
}

function refreshSavedProjectSelect() {
  if (!savedProjectSelect) return;

  const prefix = "scenarioSnippetBuilder.project.";
  const names = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      names.push(key.slice(prefix.length));
    }
  }

  names.sort((a, b) => a.localeCompare(b, "ja"));
  savedProjectSelect.innerHTML = '<option value="">保存一覧</option>' + names
    .map(name => `<option value="${escapeAttribute(name)}">${escapeHtml(name)}</option>`)
    .join("");
}

function handleSavedProjectSelect() {
  const selectedName = savedProjectSelect.value;
  if (!selectedName) return;

  projectNameInput.value = selectedName;
  loadNamedProject();
}


function getProjectKey(name) { return `scenarioSnippetBuilder.project.${name.trim()}`; }
function getCurrentProjectName() { return (projectNameInput.value || "").trim(); }
function buildProjectPayload() {
  return { version: "2.7", projectName: getCurrentProjectName(), savedAt: new Date().toISOString(), parsedText: parsedText.value, cards, activeFilter, newCardType: newCardType.value, selectionCardType: selectionCardType.value };
}
function saveNamedProject() {
  const name = getCurrentProjectName();
  if (!name) { setStatus("プロジェクト名 / シナリオ名を入力してください。"); projectNameInput.focus(); return; }
  try { localStorage.setItem(getProjectKey(name), JSON.stringify(buildProjectPayload())); refreshSavedProjectSelect();
    savedProjectSelect.value = name;
    setStatus(`プロジェクトを保存しました: ${name}`); }
  catch (error) { console.error(error); setStatus("プロジェクト保存に失敗しました。"); }
}
function loadNamedProject() {
  const name = getCurrentProjectName();
  if (!name) { setStatus("読み込むプロジェクト名 / シナリオ名を入力してください。"); projectNameInput.focus(); return; }
  const raw = localStorage.getItem(getProjectKey(name));
  if (!raw) { setStatus(`保存済みプロジェクトが見つかりません: ${name}`); return; }
  try { applyProjectPayload(JSON.parse(raw)); setStatus(`プロジェクトを読み込みました: ${name}`); }
  catch (error) { console.error(error); setStatus("プロジェクト読込に失敗しました。"); }
}
function exportProjectJson() {
  const payload = buildProjectPayload();
  const safeName = (payload.projectName || "scenario-snippet-project").replace(/[\\/:*?"<>|]/g, "_");
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `${safeName}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  setStatus("プロジェクトJSONを書き出しました。");
}
async function importProjectJson(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try { applyProjectPayload(JSON.parse(await file.text())); setStatus(`プロジェクトJSONを読み込みました: ${file.name}`); }
  catch (error) { console.error(error); setStatus("プロジェクトJSONの読み込みに失敗しました。"); }
  finally { importProjectInput.value = ""; }
}
function applyProjectPayload(payload) {
  projectNameInput.value = payload.projectName || projectNameInput.value || "";
  parsedText.value = payload.parsedText || "";
  cards = sanitizeCards(payload.cards);
  activeFilter = payload.activeFilter === "all" || INFO_TYPES[payload.activeFilter] ? payload.activeFilter : "all";
  if (payload.newCardType && INFO_TYPES[payload.newCardType]) newCardType.value = payload.newCardType;
  if (payload.selectionCardType && INFO_TYPES[payload.selectionCardType]) selectionCardType.value = payload.selectionCardType;
  updateSearchMatches(); renderTypeFilters(); renderCards(); saveState();
}

function reorderCardByDrop(sourceId, targetId) {
  const sourceIndex = cards.findIndex(card => card.id === sourceId);
  const targetIndex = cards.findIndex(card => card.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

  const scrollBefore = cardsList.scrollTop;
  const [movedCard] = cards.splice(sourceIndex, 1);
  const adjustedTargetIndex = cards.findIndex(card => card.id === targetId);

  cards.splice(adjustedTargetIndex, 0, movedCard);
  renderCards();
  cardsList.scrollTop = scrollBefore;
  saveState();
  focusCard(sourceId, { focusTitle: false, block: "nearest" });
  setStatus("カードの順番を変更しました。");
}

function clearCardDragState() {
  cardsList.querySelectorAll(".card.dragging, .card.drag-over").forEach(card => {
    card.classList.remove("dragging", "drag-over");
  });
}

function clearCardDragOverState() {
  cardsList.querySelectorAll(".card.drag-over").forEach(card => {
    card.classList.remove("drag-over");
  });
}



function focusCard(cardId, options = {}) {
  window.requestAnimationFrame(() => {
    const cardEl = cardsList.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
    if (!cardEl) return;

    cardEl.scrollIntoView({
      behavior: "smooth",
      block: options.block || "center"
    });

    cardEl.classList.add("card-focus-flash");
    window.setTimeout(() => {
      cardEl.classList.remove("card-focus-flash");
    }, 900);

    if (options.focusTitle) {
      const titleInput = cardEl.querySelector('[data-action="title"]');
      if (titleInput) {
        titleInput.focus({ preventScroll: true });
        titleInput.select();
      }
    }
  });
}

function scrollCardsByPage(direction) {
  const distance = Math.max(280, Math.floor(cardsList.clientHeight * 1.25));
  cardsList.scrollBy({
    top: distance * direction,
    behavior: "smooth"
  });
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(`${STORAGE_KEY}_theme`, nextTheme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

async function openTxtFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    setProjectNameFromSourceFile(file.name);
    importSourceText(text, {
      source: "txt",
      sourceName: file.name,
      autoParse: true,
      clearBridge: false
    });
    setStatus(`TXTファイルを読み込みました: ${file.name}`);
  } catch (error) {
    console.error(error);
    setStatus("TXTファイルの読み込みに失敗しました。");
  } finally {
    txtFileInput.value = "";
  }
}

function detectBridgeImport() {
  const raw = localStorage.getItem(BRIDGE_KEY);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    const text = typeof payload === "string" ? payload : payload.text || payload.importText || "";
    const autoParse = payload.autoParse !== false;
    const sourceName = payload.sourceName || payload.source || "PDF Parser";

    if (!text) {
      localStorage.removeItem(BRIDGE_KEY);
      return false;
    }

    importSourceText(text, {
      source: "bridge",
      sourceName,
      autoParse,
      clearBridge: true
    });
    return true;
  } catch (error) {
    console.error(error);
    localStorage.removeItem(BRIDGE_KEY);
    return false;
  }
}

function importSourceText(text, options = {}) {
  const importedText = options.autoParse === false ? text : parseSourceText(text);
  parsedText.value = importedText;
  updateSearchMatches();
  saveState();

  if (options.clearBridge) {
    localStorage.removeItem(BRIDGE_KEY);
  }

  const label = options.source === "bridge" ? "PDF Parserから本文を受け取りました。" : "本文を読み込みました。";
  bridgeNote.textContent = options.sourceName ? `${label}（${options.sourceName}）` : label;
}

function initTypeControls() {
  renderTypeSelectOptions();
  renderTypeFilters();
}

function addCard(initial = {}) {
  const newCard = {
    id: createId(),
    type: INFO_TYPES[initial.type] ? initial.type : "scene",
    title: initial.title || "",
    body: initial.body || "",
    extra: initial.extra || ""
  };

  cards.push(newCard);

  renderCards();
  saveState();
  focusCard(newCard.id, { focusTitle: true });
  setStatus("新しいカードを作成しました。");
}

function createCardFromSelection() {
  const start = parsedText.selectionStart;
  const end = parsedText.selectionEnd;

  if (start === end) {
    setStatus("カード化したい本文を選択してください。");
    return;
  }

  const selected = parsedText.value.slice(start, end).trim();

  if (!selected) {
    setStatus("選択範囲が空です。");
    return;
  }

  const parts = splitSelectionIntoTitleAndBody(selected);
  const selectedType = selectionCardType.value || "memo";

  addCard({
    type: selectedType,
    title: selectedType === "skill" ? "" : parts.title,
    extra: selectedType === "skill" ? parts.title : "",
    body: parts.body
  });
}

async function copyCard(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;

  const output = buildCardOutput(card);

  try {
    await navigator.clipboard.writeText(output);
  } catch {
    fallbackCopy(output);
  }

  setStatus("カード内容をコピーしました。");
}

async function copyCcfCardPayload(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;

  const payload = buildCcfCardPayload(card);
  const output = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(output);
  } catch {
    fallbackCopy(output);
  }

  setStatus("CCFOLIA入力用データをコピーしました。");
}

async function copyCcfDeckPayload() {
  if (!cards.length) {
    setStatus("コピーできる情報カードがありません。");
    return;
  }

  const payload = buildCcfDeckPayload();
  const output = JSON.stringify(payload, null, 2);

  try {
    await navigator.clipboard.writeText(output);
  } catch {
    fallbackCopy(output);
  }

  setStatus("CCFOLIAカードセットをコピーしました。");
}

function fallbackCopy(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}

function updateSearchMatches() {
  const query = searchBox.value;
  const text = parsedText.value;

  searchMatches = [];
  currentSearchIndex = -1;

  if (!query) {
    updateSearchCount();
    return;
  }

  let startIndex = 0;

  while (startIndex <= text.length) {
    const index = text.indexOf(query, startIndex);
    if (index === -1) break;

    searchMatches.push({ start: index, end: index + query.length });
    startIndex = index + Math.max(query.length, 1);
  }

  if (searchMatches.length > 0) currentSearchIndex = 0;

  updateSearchCount();
}

function searchParsedText(mode = "first") {
  updateSearchMatches();

  if (!searchBox.value) {
    setStatus("検索語を入力してください。");
    return;
  }

  if (searchMatches.length === 0) {
    setStatus("検索語が見つかりませんでした。");
    return;
  }

  if (mode === "first") currentSearchIndex = 0;

  selectCurrentSearchResult();
}

function moveSearchResult(direction) {
  if (!searchBox.value) {
    setStatus("検索語を入力してください。");
    return;
  }

  if (searchMatches.length === 0) updateSearchMatches();

  if (searchMatches.length === 0) {
    setStatus("検索語が見つかりませんでした。");
    return;
  }

  currentSearchIndex = currentSearchIndex < 0 ? 0 : currentSearchIndex + direction;

  if (currentSearchIndex < 0) currentSearchIndex = searchMatches.length - 1;
  if (currentSearchIndex >= searchMatches.length) currentSearchIndex = 0;

  selectCurrentSearchResult();
}

function selectCurrentSearchResult() {
  const match = searchMatches[currentSearchIndex];
  if (!match) return;

  parsedText.focus({ preventScroll: true });
  scrollParsedTextToIndex(match.start);
  parsedText.setSelectionRange(match.start, match.end, "forward");
  flashSearchHighlight();
  updateSearchCount();

  window.requestAnimationFrame(() => {
    parsedText.focus({ preventScroll: true });
    parsedText.setSelectionRange(match.start, match.end, "forward");
  });
}

function flashSearchHighlight() {
  parsedText.classList.add("search-active");
  window.clearTimeout(flashSearchHighlight.timer);
  flashSearchHighlight.timer = window.setTimeout(() => {
    parsedText.classList.remove("search-active");
  }, 650);
}

function scrollParsedTextToIndex(index) {
  const lineNumber = parsedText.value.slice(0, index).split("\n").length - 1;
  const lineHeight = parseFloat(window.getComputedStyle(parsedText).lineHeight) || 20;
  parsedText.scrollTop = Math.max(0, lineNumber * lineHeight - parsedText.clientHeight / 2);
}

function updateSearchCount() {
  searchCount.textContent = !searchBox.value || searchMatches.length === 0 || currentSearchIndex < 0
    ? "0 / 0"
    : `${currentSearchIndex + 1} / ${searchMatches.length}`;
}

function clearTextOnly() {
  parsedText.value = "";
  updateSearchMatches();
  saveState();
  bridgeNote.textContent = "本文をクリアしました。PDF Parserから送るか、TXTファイルを開いてください。";
  setStatus("本文をクリアしました。");
}

function saveState() {
  const state = {
    projectName: projectNameInput.value,
    parsedText: parsedText.value,
    cards,
    activeFilter,
    newCardType: newCardType.value,
    selectionCardType: selectionCardType.value
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error(error);
    setStatus("自動保存に失敗しました。");
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    projectNameInput.value = state.projectName || "";
    parsedText.value = state.parsedText || "";
    cards = sanitizeCards(state.cards);
    activeFilter = state.activeFilter === "all" || INFO_TYPES[state.activeFilter] ? state.activeFilter : "all";

    if (state.newCardType && INFO_TYPES[state.newCardType]) newCardType.value = state.newCardType;
    if (state.selectionCardType && INFO_TYPES[state.selectionCardType]) selectionCardType.value = state.selectionCardType;

    updateSearchMatches();
  } catch (error) {
    console.error(error);
    localStorage.removeItem(STORAGE_KEY);
  }
}

function sanitizeCards(value) {
  if (!Array.isArray(value)) return [];

  return value.map(card => ({
    id: card && card.id ? String(card.id) : createId(),
    type: card && INFO_TYPES[card.type] ? card.type : "memo",
    title: card && card.title ? String(card.title) : "",
    body: card && card.body ? String(card.body) : "",
    extra: card && card.extra ? String(card.extra) : ""
  }));
}

function setStatus(message) {
  statusEl.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    statusEl.textContent = "";
  }, 2500);
}

function createId() {
  return window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : `card_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

applyTheme(localStorage.getItem(`${STORAGE_KEY}_theme`) || "light");
initTypeControls();
loadState();
detectBridgeImport();
refreshSavedProjectSelect();
renderTypeFilters();
renderCards();
