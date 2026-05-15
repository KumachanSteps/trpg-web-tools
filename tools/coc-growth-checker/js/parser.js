const LF = "\n";
const TAB = "\t";
const THEME_STORAGE_KEY = "cocGrowthCheckerTheme";

const state = {
  allRolls: [],
  visibleCharacters: new Set(),
  showCharacterControls: false,
  currentTab: "summary",
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

const includedTabs = ["main", "メイン", "ho"];
const excludedTabs = ["雑談", "other", "info", "おはらい", "お祓い", "運試し"];

function prepareText(raw) {
  const source = String(raw || "");
  if (!looksLikeHtml(source)) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body) return source;
  const lines = extractHtmlLogLines(doc);
  return lines.length ? lines.join(LF) : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function extractHtmlLogLines(doc) {
  return Array.from(doc.body.querySelectorAll("p")).map(extractHtmlLogLine).filter(Boolean);
}

function extractHtmlLogLine(paragraph) {
  const spans = Array.from(paragraph.querySelectorAll("span"))
    .map(span => cleanLine(decodeHtml(span.textContent || "")))
    .filter(Boolean);
  return spans.length >= 3 && isTabLabel(spans[0])
    ? `${spans[0]} ${spans[1]}：${spans.slice(2).join(" ")}`
    : cleanLine(decodeHtml(paragraph.textContent || ""));
}

function filterLines(lines) {
  return lines.filter(line => {
    if (isRuleExplanationLine(line)) return false;
    if ($("dropTabs")?.checked && !shouldKeepTabLine(line)) return false;
    if ($("onlyD100")?.checked && !looksLikeD100Roll(line)) return false;
    return true;
  });
}

function shouldKeepTabLine(line) {
  const tab = extractLeadingTab(line);
  return !tab || isIncludedTab(tab);
}

function isIncludedTab(tab) {
  const normalized = normalizeTabName(tab);
  if (!normalized) return true;
  if (excludedTabs.some(word => normalized.includes(normalizeTabName(word)))) return false;
  if (normalized === "ho" || normalized.startsWith("ho")) return true;
  return includedTabs.some(word => {
    const item = normalizeTabName(word);
    return normalized === item || normalized.startsWith(item) || normalized.includes(item);
  });
}

function extractRollData(lines) {
  const rolls = [];
  let currentCharacter = "";

  lines.forEach((line, index) => {
    const name = extractCharacterName(line);
    const usable = isUsableCharacterName(name);
    if (usable) currentCharacter = name;

    const values = extractRollsFromLine(line);
    values.forEach(value => {
      const character = usable ? name : (currentCharacter || tr("common.unknown", "不明"));
      const skill = extractSkillName(line);
      const target = extractTargetNumber(line);
      rolls.push({
        value,
        target,
        skill,
        character,
        line,
        lineNo: index + 1,
        classification: classifyRoll(value, target, line),
      });
    });
  });

  return rolls;
}

function extractCharacterName(line) {
  const text = String(line || "").trim();
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return tr("common.unknown", "不明");
  let before = text.slice(0, diceIndex).trim();
  if (!before) return tr("common.unknown", "不明");
  before = trimTrailingSeparators(trimTrailingRollPrefix(removeLeadingTab(before)));
  return cleanCharacterName(before);
}

function extractSkillName(line) {
  const text = String(line || "");
  const bracketPatterns = [
    /【([^】]+)】/,
    /《([^》]+)》/,
    /\[([^\]]+)\]/,
  ];
  for (const pattern of bracketPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && !isTabLabel(match[0])) return cleanLine(match[1]);
  }
  return tr("skill.unknown", "技能名不明");
}

function extractTargetNumber(line) {
  const text = String(line || "");
  const diceIndex = findDiceCommandIndex(text);
  const targetSource = diceIndex >= 0 ? text.slice(diceIndex) : text;
  const match = targetSource.match(/(?:<=|＜＝|≦)\s*(\d{1,3})/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 100 ? value : null;
}

function classifyRoll(value, target, line) {
  const critMax = clampNumber($("critMax")?.value, 1, 100, 5);
  const fumbleMin = clampNumber($("fumbleMin")?.value, 1, 100, 96);
  const text = String(line || "").toLowerCase();

  if (value <= critMax || text.includes("決定的成功") || text.includes("critical") || text.includes("クリティカル")) return "critical";
  if (value >= fumbleMin || text.includes("致命的失敗") || text.includes("fumble") || text.includes("ファンブル")) return "fumble";
  if (target !== null) return value <= target ? "success" : "fail";
  if (text.includes("成功") || text.includes("success")) return "success";
  if (text.includes("失敗") || text.includes("fail")) return "fail";
  return "normal";
}

function extractRollsFromLine(line) {
  const text = String(line || "");
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return [];
  const afterCommand = text.slice(diceIndex);
  const numbers = extractNumbersAfterResultMarkers(afterCommand);
  if (numbers.length) return [numbers[0]];
  return extractNumbersAfterWords(afterCommand, ["出目"]).slice(0, 1);
}

function findDiceCommandIndex(text) {
  const source = String(text || "");
  const upper = source.toUpperCase();
  const indexes = [];
  const commandPatterns = [
    /SRESB/i, /RESB/i,
    /SCCB\d*/i, /SCBR\d*/i, /SCC\d*/i,
    /CCB\d*/i, /CBR\d*/i, /CC\d*/i,
    /S1D100/i, /1D100/i, /SD100/i, /D100/i, /D％/i, /D%/i,
  ];

  commandPatterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    while ((match = regex.exec(source)) !== null) {
      const index = match.index;
      const command = match[0];
      const prev = index > 0 ? upper[index - 1] : "";
      const next = upper[index + command.length] || "";
      const validPrev = !prev || !isAsciiAlphaNumber(prev);
      const validNext = !next || !isAsciiAlphaNumber(next);
      if (validPrev && validNext) indexes.push(index);
    }
  });
  return indexes.length ? Math.min(...indexes) : -1;
}

function isAsciiAlphaNumber(character) {
  return /[A-Z0-9_]/i.test(character || "");
}

function extractNumbersAfterResultMarkers(text) {
  const values = [];
  const markers = ["＞", ">", "→"];
  for (let i = 0; i < text.length; i++) {
    if (!markers.includes(text[i])) continue;
    const number = readRollResultNumberFrom(text, i + 1);
    if (number !== null && number >= 1 && number <= 100) values.push(number);
  }
  return values;
}

function readRollResultNumberFrom(text, start) {
  let i = start;
  while (i < text.length && isWhitespace(text[i])) i++;
  if (i >= text.length || text[i] < "0" || text[i] > "9") return null;
  let digits = "";
  while (i < text.length && text[i] >= "0" && text[i] <= "9") digits += text[i++];
  if (["d", "D", "Ｄ", "ｄ"].includes(text[i] || "")) return null;
  return isValidRollResultTail(text.slice(i)) ? Number(digits) : null;
}

function isValidRollResultTail(tail) {
  const text = String(tail || "").trim();
  const lower = text.toLowerCase();
  return !text
    || ["＞", ">", "→", "#"].some(marker => text.startsWith(marker))
    || ["成功", "失敗", "決定的成功", "致命的失敗", "クリティカル", "ファンブル"].some(word => text.startsWith(word))
    || lower.startsWith("success")
    || lower.startsWith("fail");
}

function extractNumbersAfterWords(text, words) {
  const lower = String(text || "").toLowerCase();
  const values = [];
  words.forEach(word => {
    const index = lower.indexOf(String(word).toLowerCase());
    if (index < 0) return;
    const number = readNumberFrom(text, index + String(word).length);
    if (number !== null && number >= 1 && number <= 100) values.push(number);
  });
  return values;
}

function readNumberFrom(text, start) {
  let i = start;
  while (i < text.length && !/[0-9]/.test(text[i])) i++;
  if (i >= text.length) return null;
  let digits = "";
  while (i < text.length && /[0-9]/.test(text[i])) digits += text[i++];
  return digits ? Number(digits) : null;
}

function isWhitespace(character) {
  return /\s/.test(character || "");
}

function looksLikeHtml(value) {
  const source = String(value || "").toLowerCase();
  return ["<html", "<body", "<p", "<span", "<div", "<br", "&lt;", "&gt;"].some(token => source.includes(token));
}

function looksLikeD100Roll(line) {
  if (isRuleExplanationLine(line)) return false;
  if (findDiceCommandIndex(line) >= 0 && hasRollResultMarker(line)) return true;
  return hasAnyText(line, ["出目", "決定的成功", "致命的失敗", "ファンブル", "クリティカル"]);
}

function hasAnyText(line, words) {
  return words.some(word => String(line || "").includes(word));
}

function hasRollResultMarker(line) {
  const text = String(line || "");
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return false;
  return extractNumbersAfterResultMarkers(text.slice(diceIndex)).length > 0;
}

function isRuleExplanationLine(line) {
  const text = String(line || "").trim();
  const tab = normalizeTabName(extractLeadingTab(text));
  const body = removeLeadingTab(text).trim();
  const compact = normalizeTabName(body);
  if (!text) return true;
  if (tab === "info" || tab.includes("info")) return true;
  if (tab.includes("ルール") || tab.includes("rule")) return true;
  if (body.startsWith("ルール説明：") || body.startsWith("ルール説明:")) return true;
  if (body.startsWith("【7版ルール】") || body.startsWith("[7版ルール]")) return true;
  if (compact.startsWith("ルール説明") || compact.startsWith("7版ルール") || compact.startsWith("◆7版ルール")) return true;
  return false;
}

function isTabLabel(value) {
  const source = String(value || "").trim();
  return source.startsWith("[") && source.endsWith("]");
}

function extractLeadingTab(line) {
  const source = String(line || "").trim();
  if (!source.startsWith("[")) return "";
  const end = source.indexOf("]");
  return end >= 0 ? source.slice(1, end) : "";
}

function normalizeTabName(tab) {
  return String(tab || "").trim().toLowerCase().replaceAll(" ", "").replaceAll("　", "").replaceAll(TAB, "");
}

function removeLeadingTab(value) {
  const source = String(value || "").trim();
  if (!source.startsWith("[")) return source;
  const end = source.indexOf("]");
  return end >= 0 ? source.slice(end + 1).trim() : source;
}

function trimTrailingSeparators(value) {
  let source = String(value || "").trim();
  const separators = [":", "：", "-", "―", "＞", ">", "(", "（"];
  while (source && separators.includes(source[source.length - 1])) source = source.slice(0, -1).trim();
  return source;
}

function trimTrailingRollPrefix(value) {
  let source = String(value || "").trim().replaceAll("×", "x").replaceAll("Ｘ", "x").replaceAll("ｘ", "x");
  const lower = source.toLowerCase();
  const index = lower.lastIndexOf("x");
  if (index < 0) return source;
  const tail = lower.slice(index + 1).trim();
  if (!tail || tail.split("").some(character => character < "0" || character > "9")) return source;
  return trimTrailingSeparators(source.slice(0, index).trim()) || source;
}

function cleanCharacterName(name) {
  let source = String(name || "");
  ["[", "]", "「", "」", "『", "』", "【", "】"].forEach(character => { source = source.replaceAll(character, ""); });
  return source.trim() || tr("common.unknown", "不明");
}

function isUsableCharacterName(name) {
  const source = String(name || "").trim();
  if (!source || source === "不明" || source === "Unknown") return false;
  if (["(", ")", "（", "）"].includes(source)) return false;
  return source.replaceAll("(", "").replaceAll(")", "").replaceAll("（", "").replaceAll("）", "").trim() !== "";
}

function analyze() {
  const raw = $("rawInput")?.value || "";
  const prepared = prepareText(raw);
  const lines = filterLines(prepared.split(/\r?\n/).map(cleanLine).filter(Boolean));
  const rolls = extractRollData(lines);
  state.allRolls = rolls;

  const counts = countByCharacter(rolls);
  const autoHideMax = clampNumber($("autoHideMaxRolls")?.value, 0, 999, 15);
  state.visibleCharacters = new Set(
    Object.entries(counts)
      .filter(([, count]) => count > autoHideMax)
      .map(([character]) => character)
  );
  if (state.visibleCharacters.size === 0) {
    Object.keys(counts).forEach(character => state.visibleCharacters.add(character));
  }

  renderAll();
}

function countByCharacter(rolls) {
  return rolls.reduce((acc, roll) => {
    acc[roll.character] = (acc[roll.character] || 0) + 1;
    return acc;
  }, {});
}

function getVisibleRolls() {
  return state.allRolls.filter(roll => state.visibleCharacters.has(roll.character));
}

function buildGrowthCandidates(rolls) {
  const mode = $("ruleMode")?.value || "rulebook";
  const candidates = [];
  const successSeen = new Set();

  rolls.forEach(roll => {
    const base = { ...roll };
    const successKey = `${roll.character}///${roll.skill}`;

    if (mode === "rulebook") {
      if (["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...base, reason: "success" });
      }
      return;
    }

    if (mode === "critFumble") {
      if (roll.classification === "critical") candidates.push({ ...base, reason: "critical" });
      if (roll.classification === "fumble") candidates.push({ ...base, reason: "fumble" });
      return;
    }

    if (mode === "both") {
      if (roll.classification === "critical") candidates.push({ ...base, reason: "critical" });
      if (roll.classification === "fumble") candidates.push({ ...base, reason: "fumble" });
      if (["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...base, reason: "success" });
      }
      return;
    }

    if (mode === "bothPrime") {
      if (roll.classification === "critical") candidates.push({ ...base, reason: "critical" });
      if (["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...base, reason: "success" });
      }
    }
  });

  return candidates;
}

function renderAll() {
  applyTranslations();
  renderCharacterControls();
  renderSummary();
  renderCandidatesTable();
  renderRollTable();
}

function renderSummary() {
  const visibleRolls = getVisibleRolls();
  const candidates = buildGrowthCandidates(visibleRolls);
  const counts = countByCharacter(state.allRolls);
  const autoHideMax = clampNumber($("autoHideMaxRolls")?.value, 0, 999, 15);

  $("totalRolls").textContent = String(state.allRolls.length);
  $("candidateCount").textContent = String(candidates.length);
  $("characterCount").textContent = String(Object.keys(counts).length);
  $("ruleModeLabel").textContent = t(`ruleLabel.${$("ruleMode")?.value || "rulebook"}`, "-");

  const hidden = state.allRolls.length - visibleRolls.length;
  $("summaryMemo").textContent = state.allRolls.length
    ? t("summary.memo", "", {
        all: state.allRolls.length,
        visible: visibleRolls.length,
        candidates: candidates.length,
        characters: Object.keys(counts).length,
        hidden,
        threshold: autoHideMax,
        critMax: $("critMax")?.value || 5,
        fumbleMin: $("fumbleMin")?.value || 96,
      })
    : t("summary.selectLog", "ログを入力して「成長候補を抽出」を押してください。");

  renderCandidateCards(candidates);
}

function renderCandidateCards(candidates) {
  const container = $("candidateSummary");
  const grouped = candidates.reduce((acc, item) => {
    if (!acc[item.character]) acc[item.character] = [];
    acc[item.character].push(item);
    return acc;
  }, {});

  if (!candidates.length) {
    container.innerHTML = `<div class="card"><p class="note">${escapeHtml(t("summary.noCandidates", "表示対象の成長候補はありません。"))}</p></div>`;
    return;
  }

  container.innerHTML = Object.entries(grouped).map(([character, items]) => {
    const chips = items.slice(0, 18).map(item => {
      return `<span class="candidate-chip reason-${item.reason}">${escapeHtml(item.skill)} <small>${escapeHtml(t(`reason.${item.reason}`, item.reason))}</small></span>`;
    }).join("");
    const more = items.length > 18 ? `<span class="candidate-chip">+${items.length - 18}</span>` : "";
    return `<div class="card candidate-card"><h3>${escapeHtml(character)} <span class="note">${items.length}</span></h3><div class="candidate-list">${chips}${more}</div></div>`;
  }).join("");
}

function renderCandidatesTable() {
  const candidates = buildGrowthCandidates(getVisibleRolls());
  const tbody = $("candidateTableBody");
  tbody.innerHTML = candidates.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.character)}</td>
      <td>${escapeHtml(item.skill)}</td>
      <td><span class="pill ${item.reason === "fumble" ? "fumble" : "success"}">${escapeHtml(t(`reason.${item.reason}`, item.reason))}</span></td>
      <td>${item.value}</td>
      <td>${escapeHtml(item.line)}</td>
    </tr>
  `).join("");
}

function renderRollTable() {
  const tbody = $("rollTableBody");
  const rolls = getVisibleRolls();
  tbody.innerHTML = rolls.map((roll, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(roll.character)}</td>
      <td>${escapeHtml(roll.skill)}</td>
      <td>${roll.value}</td>
      <td><span class="pill ${roll.classification}">${escapeHtml(t(`classification.${roll.classification}`, roll.classification))}</span></td>
      <td>${escapeHtml(roll.line)}</td>
    </tr>
  `).join("");
}

function renderCharacterControls() {
  const controls = $("characterControls");
  const button = $("characterControlToggleBtn");
  const counts = countByCharacter(state.allRolls);
  controls.classList.toggle("visible", state.showCharacterControls);
  button.textContent = state.showCharacterControls
    ? t("button.hideCharacterControls", "表示キャラ設定を隠す▲")
    : t("button.showCharacterControls", "表示キャラ設定を開く▼");

  controls.innerHTML = Object.entries(counts).map(([character, count]) => {
    const checked = state.visibleCharacters.has(character) ? "checked" : "";
    return `<label class="character-toggle"><input type="checkbox" data-character="${escapeHtml(character)}" ${checked}>${escapeHtml(character)} <span class="note">${count}</span></label>`;
  }).join("");

  controls.querySelectorAll("input[data-character]").forEach(input => {
    input.addEventListener("change", () => {
      const character = input.getAttribute("data-character");
      if (input.checked) state.visibleCharacters.add(character);
      else state.visibleCharacters.delete(character);
      renderSummary();
      renderCandidatesTable();
      renderRollTable();
    });
  });
}

function switchTab(button) {
  const tabName = button.dataset.tab;
  if (!tabName) return;
  state.currentTab = tabName;
  document.querySelectorAll(".tab-button").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === tabName));
}

function toggleInputPanel() {
  const layout = $("appLayout");
  layout.classList.toggle("input-collapsed");
  const collapsed = layout.classList.contains("input-collapsed");
  $("inputToggleBtn").textContent = collapsed ? "⇥" : "⇤";
  $("inputToggleBtn").setAttribute("aria-label", collapsed ? t("button.openInputPanel", "入力パネルを開く") : t("button.collapseInputPanel", "入力パネルを畳む"));
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains("dark");
  const button = $("themeToggleBtn");
  if (!button) return;
  button.setAttribute("aria-pressed", String(isDark));
  button.setAttribute("aria-label", isDark ? t("theme.switchToLight", "ライトモードに切替") : t("theme.switchToDark", "ナイトモードに切替"));
  button.setAttribute("title", isDark ? t("theme.switchToLight", "ライトモードに切替") : t("theme.switchToDark", "ナイトモードに切替"));
}

function openShortcutModal() {
  $("shortcutModal")?.classList.add("open");
  $("shortcutModal")?.setAttribute("aria-hidden", "false");
}

function closeShortcutModal() {
  $("shortcutModal")?.classList.remove("open");
  $("shortcutModal")?.setAttribute("aria-hidden", "true");
}

function isShortcutModalOpen() {
  return $("shortcutModal")?.classList.contains("open");
}

function clearAll() {
  if ($("rawInput")) $("rawInput").value = "";
  if ($("fileInput")) $("fileInput").value = "";
  state.allRolls = [];
  state.visibleCharacters = new Set();
  renderAll();
}

function initializeGrowthChecker() {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") document.body.classList.add("dark");

  applyTranslations();
  updateThemeButton();

  $("languageToggleBtn")?.addEventListener("click", () => setLanguage(getCurrentLanguage() === "ja" ? "en" : "ja"));
  document.addEventListener("languagechange", () => {
    $("languageToggleBtn").textContent = getCurrentLanguage() === "ja" ? "EN" : "JP";
    updateThemeButton();
    renderAll();
  });
  $("languageToggleBtn").textContent = getCurrentLanguage() === "ja" ? "EN" : "JP";

  $("themeToggleBtn")?.addEventListener("click", toggleTheme);
  $("shortcutHelpBtn")?.addEventListener("click", openShortcutModal);
  $("shortcutModalCloseBtn")?.addEventListener("click", closeShortcutModal);
  $("shortcutModalBackdrop")?.addEventListener("click", closeShortcutModal);
  $("screenshotExitBtn")?.addEventListener("click", () => document.body.classList.remove("screenshot-mode"));
  $("summaryShotBtn")?.addEventListener("click", () => document.body.classList.add("screenshot-mode"));
  $("inputToggleBtn")?.addEventListener("click", toggleInputPanel);
  $("characterControlToggleBtn")?.addEventListener("click", () => {
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
  });
  $("analyzeBtn")?.addEventListener("click", analyze);
  $("clearBtn")?.addEventListener("click", () => {
    if (window.confirm(t("confirm.clear", "入力内容と抽出結果をクリアします。よろしいですか？"))) clearAll();
  });
  $("ruleMode")?.addEventListener("change", renderAll);

  $("fileInput")?.addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    $("rawInput").value = await file.text();
  });

  document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => switchTab(button)));

  renderAll();
}

document.addEventListener("DOMContentLoaded", initializeGrowthChecker);
