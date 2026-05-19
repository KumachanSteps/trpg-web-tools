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

const STORAGE_KEY = "trpgScenarioSnippetBuilderBeta";

let cards = [];
let activeFilter = "all";
let searchMatches = [];
let currentSearchIndex = -1;

const appRoot = document.getElementById("appRoot");
const themeToggle = document.getElementById("themeToggle");
const showSourceBtn = document.getElementById("showSourceBtn");
const pasteText = document.getElementById("pasteText");
const parsedText = document.getElementById("parsedText");
const cardsList = document.getElementById("cardsList");
const statusEl = document.getElementById("status");
const newCardType = document.getElementById("newCardType");
const selectionCardType = document.getElementById("selectionCardType");
const typeFilterRow = document.getElementById("typeFilterRow");
const searchBox = document.getElementById("searchBox");
const searchCount = document.getElementById("searchCount");
const prevSearchBtn = document.getElementById("prevSearchBtn");
const nextSearchBtn = document.getElementById("nextSearchBtn");

themeToggle.addEventListener("click", toggleTheme);
showSourceBtn.addEventListener("click", showInputPanel);
document.getElementById("parseBtn").addEventListener("click", parseText);
document.getElementById("clearBtn").addEventListener("click", clearAll);
document.getElementById("addCardBtn").addEventListener("click", () => addCard({ type: newCardType.value || "scene" }));
document.getElementById("createFromSelectionBtn").addEventListener("click", createCardFromSelection);
document.getElementById("searchBtn").addEventListener("click", () => searchParsedText("first"));
prevSearchBtn.addEventListener("click", () => moveSearchResult(-1));
nextSearchBtn.addEventListener("click", () => moveSearchResult(1));

searchBox.addEventListener("input", updateSearchMatches);
searchBox.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    moveSearchResult(event.shiftKey ? -1 : 1);
  }
});

pasteText.addEventListener("input", saveState);

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

cardsList.addEventListener("input", event => {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  const card = cards.find(c => c.id === id);

  if (!card) return;

  if (action === "title") card.title = event.target.value;
  if (action === "extra") card.extra = event.target.value;
  if (action === "body") card.body = event.target.value;

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

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem(`${STORAGE_KEY}_theme`, nextTheme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function showInputPanel() {
  appRoot.classList.remove("source-hidden");
  saveState();
}

function hideInputPanel() {
  appRoot.classList.add("source-hidden");
  saveState();
}

function initTypeControls() {
  const optionsHtml = Object.entries(INFO_TYPES)
    .map(([key, info]) => `<option value="${key}">${info.marker} ${info.label}</option>`)
    .join("");

  newCardType.innerHTML = optionsHtml;
  selectionCardType.innerHTML = optionsHtml;
  newCardType.value = "scene";
  selectionCardType.value = "memo";

  renderTypeFilters();
}

function parseText() {
  const text = parseSourceText(pasteText.value || "");
  parsedText.value = text;
  updateSearchMatches();
  hideInputPanel();
  setStatus("本文を編集欄に反映しました。");
}

function addCard(initial = {}) {
  cards.push({
    id: createId(),
    type: INFO_TYPES[initial.type] ? initial.type : "scene",
    title: initial.title || "",
    body: initial.body || "",
    extra: initial.extra || ""
  });

  renderCards();
  saveState();
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

  if (searchMatches.length > 0) {
    currentSearchIndex = 0;
  }

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

  if (mode === "first") {
    currentSearchIndex = 0;
  }

  selectCurrentSearchResult();
}

function moveSearchResult(direction) {
  if (!searchBox.value) {
    setStatus("検索語を入力してください。");
    return;
  }

  if (searchMatches.length === 0) {
    updateSearchMatches();
  }

  if (searchMatches.length === 0) {
    setStatus("検索語が見つかりませんでした。");
    return;
  }

  currentSearchIndex = currentSearchIndex < 0 ? 0 : currentSearchIndex + direction;

  if (currentSearchIndex < 0) {
    currentSearchIndex = searchMatches.length - 1;
  }

  if (currentSearchIndex >= searchMatches.length) {
    currentSearchIndex = 0;
  }

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

function clearAll() {
  pasteText.value = "";
  parsedText.value = "";
  searchBox.value = "";

  searchMatches = [];
  currentSearchIndex = -1;
  cards = [];
  activeFilter = "all";

  appRoot.classList.remove("source-hidden");
  localStorage.removeItem(STORAGE_KEY);

  updateSearchCount();
  renderTypeFilters();
  renderCards();
  setStatus("内容をクリアしました。");
}

function saveState() {
  const state = {
    pasteText: pasteText.value,
    parsedText: parsedText.value,
    cards,
    activeFilter,
    newCardType: newCardType.value,
    selectionCardType: selectionCardType.value
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    setStatus("自動保存に失敗しました。");
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return;

  try {
    const state = JSON.parse(raw);

    pasteText.value = state.pasteText || "";
    parsedText.value = state.parsedText || "";
    cards = sanitizeCards(state.cards);
    activeFilter = state.activeFilter === "all" || INFO_TYPES[state.activeFilter] ? state.activeFilter : "all";

    if (state.newCardType && INFO_TYPES[state.newCardType]) {
      newCardType.value = state.newCardType;
    }

    if (state.selectionCardType && INFO_TYPES[state.selectionCardType]) {
      selectionCardType.value = state.selectionCardType;
    }

    appRoot.classList.remove("source-hidden");
    updateSearchMatches();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function sanitizeCards(value) {
  if (!Array.isArray(value)) return [];

  return value.map(card => ({
    id: card?.id ? String(card.id) : createId(),
    type: card && INFO_TYPES[card.type] ? card.type : "memo",
    title: card?.title ? String(card.title) : "",
    body: card?.body ? String(card.body) : "",
    extra: card?.extra ? String(card.extra) : ""
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
renderTypeFilters();
renderCards();
