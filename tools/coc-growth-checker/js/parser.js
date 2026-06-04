const LF = "\n";
const TAB = "\t";
const THEME_STORAGE_KEY = "cocGrowthCheckerTheme";

const state = {
  allRolls: [],
  visibleCharacters: new Set(),
  showCharacterControls: false,
  currentTab: "summary",
  sessionName: "未設定",
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

const SKILL_INITIAL_VALUES = {
  "こぶし": 50,
  "キック": 25,
  "組み付き": 25,
  "頭突き": 10,
  "投擲": 25,
  "マーシャルアーツ": 1,
  "拳銃": 20,
  "サブマシンガン": 15,
  "ショットガン": 30,
  "マシンガン": 15,
  "ライフル": 25,
  "応急手当": 30,
  "鍵開け": 1,
  "隠す": 15,
  "隠れる": 10,
  "忍び歩き": 10,
  "写真術": 10,
  "精神分析": 1,
  "追跡": 10,
  "登攀": 40,
  "運転": 20,
  "機械修理": 20,
  "重機械操作": 1,
  "乗馬": 5,
  "水泳": 25,
  "製作": 5,
  "操縦": 1,
  "跳躍": 25,
  "電気修理": 10,
  "ナビゲート": 10,
  "変装": 1,
  "言いくるめ": 5,
  "信用": 15,
  "説得": 15,
  "値切り": 5,
  "医学": 5,
  "オカルト": 5,
  "化学": 1,
  "芸術": 5,
  "経理": 10,
  "考古学": 1,
  "コンピューター": 1,
  "心理学": 5,
  "人類学": 1,
  "生物学": 1,
  "地質学": 1,
  "電子工学": 1,
  "天文学": 1,
  "博物学": 10,
  "物理学": 1,
  "法律": 5,
  "薬学": 1,
  "歴史": 20,
};

const PARAM_SKILLS = new Set([
  "アイデア", "知識", "幸運",
  "STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU",
  "STR×5", "CON×5", "POW×5", "DEX×5", "APP×5", "SIZ×5", "INT×5", "EDU×5",
  "STR*5", "CON*5", "POW*5", "DEX*5", "APP*5", "SIZ*5", "INT*5", "EDU*5",
  "IDEA", "KNOW", "KNOWLEDGE", "LUCK"
]);

function prepareText(raw) {
  const source = String(raw || "");
  if (!looksLikeHtml(source)) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body) return source;
  const lines = extractHtmlLogLines(doc);
  return lines.length ? lines.join(LF) : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function extractHtmlLogLines(doc) {
  const selectorGroups = [
    "p",
    "div.MuiListItemText-root",
    "div[class*='message']",
    "li",
    "tr"
  ];

  for (const selector of selectorGroups) {
    const lines = Array.from(doc.body.querySelectorAll(selector))
      .map(extractHtmlLogLine)
      .filter(Boolean);
    if (lines.some(looksLikeD100Roll)) return lines;
  }

  return [];
}

function extractHtmlLogLine(element) {
  const spans = Array.from(element.querySelectorAll("span"))
    .map(span => cleanLine(decodeHtml(span.textContent || "")))
    .filter(Boolean);

  if (spans.length >= 3 && isTabLabel(spans[0])) {
    return `${spans[0]} ${spans[1]}：${spans.slice(2).join(" ")}`;
  }

  return cleanLine(decodeHtml(element.textContent || ""));
}

function filterLines(lines) {
  return lines.filter(line => {
    if (isRuleExplanationLine(line)) return false;
    if (!shouldKeepTabLine(line)) return false;
    if (!looksLikeD100Roll(line)) return false;
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
    const normalized = normalizeLine(line);
    const name = extractCharacterName(normalized);
    const usable = isUsableCharacterName(name);
    if (usable) currentCharacter = name;

    const rollChunks = extractRollChunks(normalized);
    rollChunks.forEach((chunk, chunkIndex) => {
      const character = usable ? name : (currentCharacter || tr("common.unknown", "不明"));
      const skill = extractSkillName(normalized);
      const target = extractTargetNumber(normalized);
      const classification = classifyRoll(chunk.value, target, normalized, chunk.text);

      if (!["critical", "fumble", "special", "success", "fail"].includes(classification)) return;

      rolls.push({
        id: `${index + 1}-${chunkIndex}`,
        value: chunk.value,
        target,
        skill,
        character,
        line: normalized,
        lineNo: index + 1,
        rawChunk: chunk.text,
        classification,
        isSan: isSanSkill(skill, normalized),
        isParam: isParameterSkill(skill),
        isMythos: isMythosSkill(skill),
        isInitial: isInitialSkillRoll(skill, target, classification),
      });
    });
  });

  return rolls;
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/\u00a0/g, " ")
    .replace(/[：]/g, ":")
    .replace(/[＜]/g, "<")
    .replace(/[＝]/g, "=")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[＞]/g, ">")
    .replace(/[［]/g, "[")
    .replace(/[］]/g, "]")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCharacterName(line) {
  const text = removeLeadingTab(String(line || "").trim());
  const diceIndex = findDiceCommandIndex(text);
  if (diceIndex < 0) return tr("common.unknown", "不明");
  const beforeDice = text.slice(0, diceIndex).trim();
  if (!beforeDice) return tr("common.unknown", "不明");

  const colonIndex = Math.max(beforeDice.lastIndexOf(":"), beforeDice.lastIndexOf("："));
  const rawName = colonIndex >= 0 ? beforeDice.slice(0, colonIndex) : beforeDice;
  return cleanCharacterName(trimTrailingSeparators(trimTrailingRollPrefix(rawName)));
}

function extractSkillName(line) {
  const text = String(line || "");
  const bracketSkills = [...text.matchAll(/【([^】]+)】/g)]
    .map(match => cleanSkillName(match[1]))
    .filter(Boolean);
  if (bracketSkills.length) return bracketSkills[bracketSkills.length - 1];

  const sanSkill = inferSanSkill(text);
  if (sanSkill) return sanSkill;

  const parameterSkill = inferParameterSkill(text);
  if (parameterSkill) return parameterSkill;

  const commandSkill = inferSkillAfterCommand(text);
  if (commandSkill) return commandSkill;

  return tr("skill.unknown", "技能名不明");
}

function cleanSkillName(skill) {
  return String(skill || "")
    .replace(/[:：].*$/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\[\]【】\s]+|[\[\]【】\s]+$/g, "")
    .trim();
}

function inferSanSkill(line) {
  return /SAN|SANC|正気度|正気度ロール|SAN値|SANチェック/i.test(line) ? "正気度ロール" : "";
}

function inferParameterSkill(line) {
  if (/アイデア/i.test(line)) return "アイデア";
  if (/知識|KNOWLEDGE|KNOW/i.test(line)) return "知識";
  if (/幸運|LUCK/i.test(line)) return "幸運";
  const abilityMatch = line.match(/\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU)\b(?:\s*[×xX*]\s*\d+)?/i);
  if (abilityMatch) return abilityMatch[0].toUpperCase().replace(/\s+/g, "");
  return "";
}

function inferSkillAfterCommand(line) {
  const commandMatch = line.match(diceCommandRegex());
  if (!commandMatch) return "";
  const afterCommand = line.slice(commandMatch.index + commandMatch[0].length);
  const candidate = afterCommand
    .replace(/^\s*(?:\([^)]*\)|<=\s*\d+|[<>=\d+\-*/×x\s]+)*/, "")
    .split(/[>]/)[0]
    .replace(/#\d+.*$/, "")
    .replace(/\(1D100.*$/i, "")
    .trim();
  return cleanSkillName(candidate);
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

function extractRollChunks(line) {
  const text = String(line || "");
  const chunks = [];
  const commandIndex = findDiceCommandIndex(text);
  if (commandIndex < 0) return chunks;

  const afterCommand = text.slice(commandIndex);
  const arrowRegex = /(?:>|→)\s*(\d{1,3})\s*(?:>|→)\s*([^#]+)/g;
  let match;
  while ((match = arrowRegex.exec(afterCommand)) !== null) {
    const value = Number(match[1]);
    if (!isValidD100(value)) continue;
    chunks.push({ value, text: match[0].trim() });
  }

  if (chunks.length) return chunks;

  const resultWords = ["出目", "結果", "roll"];
  for (const word of resultWords) {
    const index = afterCommand.toLowerCase().indexOf(word.toLowerCase());
    if (index < 0) continue;
    const value = readNumberFrom(afterCommand, index + word.length);
    if (isValidD100(value)) return [{ value, text: afterCommand }];
  }

  const fallback = afterCommand.match(/\b(\d{1,3})\b/);
  if (fallback) {
    const value = Number(fallback[1]);
    if (isValidD100(value)) return [{ value, text: afterCommand }];
  }

  return chunks;
}

function classifyRoll(value, target, line, chunkText = "") {
  const text = `${line || ""} ${chunkText || ""}`.toLowerCase();

  if (/決定的成功|クリティカル|critical|\bcrit\b|c決定的/.test(text)) return "critical";
  if (/致命的失敗|ファンブル|fumble/.test(text)) return "fumble";
  if (/スペシャル|special/.test(text)) return "special";
  if (/成功|success/.test(text)) return "success";
  if (/失敗|failure|failed|fail/.test(text)) return "fail";
  if (target !== null) return value <= target ? "success" : "fail";
  return "normal";
}

function isInitialSkillRoll(skill, target, classification) {
  if (!["success", "critical", "special"].includes(classification)) return false;
  if (!Number.isFinite(Number(target))) return false;
  const initial = SKILL_INITIAL_VALUES[normalizeSkillKey(skill)];
  return Number.isFinite(initial) && Number(target) <= initial;
}

function normalizeSkillKey(skill) {
  return String(skill || "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/[:：].*$/, "")
    .replace(/技能/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function isMythosSkill(skill) {
  const normalized = normalizeSkillKey(skill);
  return normalized === "クトゥルフ神話" || normalized === "クトゥルフ神話技能" || /cthulhu\s*mythos/i.test(String(skill || ""));
}

function isSanSkill(skill, line) {
  return /SAN|SANC|正気度|正気度ロール|SAN値|SANチェック/i.test(`${skill} ${line}`);
}

function isParameterSkill(skill) {
  const normalized = String(skill || "").toUpperCase().replace(/\s+/g, "").trim();
  const jp = String(skill || "").trim();
  if (PARAM_SKILLS.has(jp)) return true;
  if (PARAM_SKILLS.has(normalized)) return true;
  if (/^(STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:[×X*]\d+)?$/.test(normalized)) return true;
  if (/^(アイデア|知識|幸運)$/.test(jp)) return true;
  return false;
}

function buildGrowthCandidates(rolls) {
  const mode = getSelectedRuleMode();
  const includeParamRolls = Boolean($("includeParamRolls")?.checked);
  const candidates = [];
  const successSeen = new Set();

  rolls.forEach(roll => {
    if (roll.isMythos || roll.isSan) return;

    if (roll.isParam) {
      if (!includeParamRolls) return;
      if (shouldIncludeParameterRoll(roll, mode)) candidates.push({ ...roll, reason: roll.classification });
      return;
    }

    const successKey = `${roll.character}///${normalizeSkillKey(roll.skill)}`;
    const isSuccessLike = ["success", "critical", "special"].includes(roll.classification);

    if (mode === "rulebook") {
      if (isSuccessLike && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...roll, reason: "success" });
      }
      return;
    }

    if (mode === "critFumble") {
      if (roll.classification === "critical") candidates.push({ ...roll, reason: "critical" });
      if (roll.classification === "fumble") candidates.push({ ...roll, reason: "fumble" });
      if (roll.isInitial) candidates.push({ ...roll, reason: "initial" });
      return;
    }

    if (mode === "both") {
      if (roll.classification === "critical") candidates.push({ ...roll, reason: "critical" });
      if (roll.classification === "fumble") candidates.push({ ...roll, reason: "fumble" });
      if (isSuccessLike && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...roll, reason: "success" });
      }
      return;
    }

    if (mode === "bothPrime") {
      if (roll.classification === "critical") candidates.push({ ...roll, reason: "critical" });
      if (isSuccessLike && !successSeen.has(successKey)) {
        successSeen.add(successKey);
        candidates.push({ ...roll, reason: "success" });
      }
    }
  });

  return dedupeCandidateRows(candidates);
}

function shouldIncludeParameterRoll(roll, mode) {
  if (mode === "rulebook" || mode === "bothPrime") return roll.classification === "critical";
  if (mode === "critFumble" || mode === "both") return ["critical", "fumble"].includes(roll.classification);
  return false;
}

function dedupeCandidateRows(candidates) {
  const seen = new Set();
  const result = [];
  candidates.forEach(item => {
    const key = `${item.id}///${item.reason}///${item.skill}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function getSelectedRuleMode() {
  return document.querySelector('input[name="ruleMode"]:checked')?.value || "rulebook";
}

function getRuleLabel(mode = getSelectedRuleMode()) {
  return t(`ruleLabel.${mode}`, mode);
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
  if (state.visibleCharacters.size === 0) Object.keys(counts).forEach(character => state.visibleCharacters.add(character));

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
  const output = buildGrowthSummaryText(candidates);
  const outputBox = $("growthSummaryOutput");
  if (outputBox) outputBox.value = output;
}

function buildGrowthSummaryText(candidates) {
  const sessionName = state.sessionName || "未設定";
  const ruleLabel = getRuleLabel();

  if (!state.allRolls.length) {
    return `[セッション名：${sessionName}][選択ルール：${ruleLabel}]\n\nログを入力して「成長候補を抽出」を押してください。`;
  }

  if (!candidates.length) {
    return `[セッション名：${sessionName}][選択ルール：${ruleLabel}]\n\n表示対象の成長判定候補はありません。`;
  }

  const grouped = candidates.reduce((acc, item) => {
    if (!acc[item.character]) acc[item.character] = [];
    acc[item.character].push(item);
    return acc;
  }, {});

  const blocks = Object.entries(grouped).map(([character, items]) => {
    const skills = unique(items.map(item => item.skill)).join("、");
    const lines = items.map(item => item.line).join(LF);
    return `【${character}】【成長判定候補：${skills}】\n${lines}`;
  });

  return `[セッション名：${sessionName}][選択ルール：${ruleLabel}]\n\n${blocks.join("\n\n")}`;
}

function unique(values) {
  const seen = new Set();
  const result = [];
  values.forEach(value => {
    const normalized = normalizeSkillKey(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(value);
  });
  return result;
}

function renderCandidatesTable() {
  const candidates = buildGrowthCandidates(getVisibleRolls());
  const tbody = $("candidateTableBody");
  if (!tbody) return;
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
  if (!tbody) return;
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
  if (!controls || !button) return;
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

function copyGrowthSummary() {
  const output = $("growthSummaryOutput");
  if (!output) return;
  output.select();
  output.setSelectionRange(0, output.value.length);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(output.value).catch(() => document.execCommand("copy"));
  else document.execCommand("copy");
}

function deleteGrowthSummary() {
  const output = $("growthSummaryOutput");
  if (output) output.value = "";
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
  state.sessionName = "未設定";
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
  if ($("languageToggleBtn")) $("languageToggleBtn").textContent = getCurrentLanguage() === "ja" ? "EN" : "JP";

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
  $("copySummaryBtn")?.addEventListener("click", copyGrowthSummary);
  $("deleteSummaryBtn")?.addEventListener("click", deleteGrowthSummary);
  $("includeParamRolls")?.addEventListener("change", renderAll);
  $("autoHideMaxRolls")?.addEventListener("change", analyze);
  document.querySelectorAll('input[name="ruleMode"]').forEach(input => input.addEventListener("change", renderAll));

  $("fileInput")?.addEventListener("change", async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    state.sessionName = file.name;
    $("rawInput").value = await file.text();
  });

  $("rawInput")?.addEventListener("input", () => {
    if (!$("fileInput")?.files?.length) state.sessionName = "貼り付けログ";
  });

  document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => switchTab(button)));

  renderAll();
}

function diceCommandRegex() {
  return /SRESB|RESB|SCCB\d*|SCBR\d*|SCC\d*|CCB\d*|CBR\d*|CC\d*|S1D100|1D100|SD100|D100|D％|D%/i;
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
      const validPrev = !prev || !/[A-Z0-9_]/i.test(prev);
      const validNext = !next || !/[A-Z0-9_]/i.test(next);
      if (validPrev && validNext) indexes.push(index);
    }
  });
  return indexes.length ? Math.min(...indexes) : -1;
}

function looksLikeHtml(value) {
  const source = String(value || "").toLowerCase();
  return ["<html", "<body", "<p", "<span", "<div", "<br", "&lt;", "&gt;", "<tr", "<td"].some(token => source.includes(token));
}

function looksLikeD100Roll(line) {
  if (isRuleExplanationLine(line)) return false;
  return findDiceCommandIndex(line) >= 0 || /出目|決定的成功|致命的失敗|ファンブル|クリティカル/.test(String(line || ""));
}

function isValidD100(value) {
  return Number.isInteger(value) && value >= 1 && value <= 100;
}

function readNumberFrom(text, start) {
  let i = start;
  while (i < text.length && !/[0-9]/.test(text[i])) i++;
  if (i >= text.length) return null;
  let digits = "";
  while (i < text.length && /[0-9]/.test(text[i])) digits += text[i++];
  return digits ? Number(digits) : null;
}

function isRuleExplanationLine(line) {
  const text = String(line || "").trim();
  const tab = normalizeTabName(extractLeadingTab(text));
  const body = removeLeadingTab(text).trim();
  const compact = normalizeTabName(body);
  if (!text) return true;
  if (tab === "info" || tab.includes("info")) return true;
  if (tab.includes("ルール") || tab.includes("rule")) return true;
  if (body.startsWith("ルール説明:") || body.startsWith("【7版ルール】") || body.startsWith("[7版ルール]")) return true;
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

document.addEventListener("DOMContentLoaded", initializeGrowthChecker);
