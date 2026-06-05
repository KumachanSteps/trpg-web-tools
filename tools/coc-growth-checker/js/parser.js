const LF = "\n";
const TAB = "\t";
const THEME_STORAGE_KEY = "cocGrowthCheckerTheme";

const state = {
  allRolls: [],
  visibleCharacters: new Set(),
  showCharacterControls: false,
  currentTab: "summary",
  sessionName: "貼り付けログ",
  suppressAutoAnalyze: false,
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
const mythSkillPattern = /^(クトゥルフ神話|クトゥルフ神話技能|cthulhu mythos)$/i;
const parameterSkillPattern = /^(アイデア|知識|幸運|STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:[×xX*]\d+)?$/i;
const luckSkillPattern = /^(幸運|LUCK)$/i;

function prepareText(raw) {
  const source = String(raw || "");
  if (!looksLikeHtml(source)) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body) return source;
  const lines = extractHtmlLogLines(doc);
  return lines.length ? lines.join(LF) : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function extractHtmlLogLines(doc) {
  const selectors = ["p", "li", "tr", "div.MuiListItemText-root", "div[class*='message']"];
  for (const selector of selectors) {
    const rows = Array.from(doc.body.querySelectorAll(selector)).map(extractHtmlLogLine).filter(Boolean);
    if (rows.length) return rows;
  }
  return [];
}

function extractHtmlLogLine(node) {
  const spans = Array.from(node.querySelectorAll("span"))
    .map(span => cleanLine(decodeHtml(span.textContent || "")))
    .filter(Boolean);
  if (spans.length >= 3 && isTabLabel(spans[0])) {
    return `${spans[0]} ${spans[1]}：${spans.slice(2).join(" ")}`;
  }
  return cleanLine(decodeHtml(node.textContent || ""));
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
    const name = extractCharacterName(line);
    const usable = isUsableCharacterName(name);
    if (usable) currentCharacter = name;

    const values = extractRollsFromLine(line);
    values.forEach(value => {
      const character = usable ? name : (currentCharacter || tr("common.unknown", "不明"));
      const skill = extractSkillName(line);
      const target = extractTargetNumber(line);
      const classification = classifyRoll(value, target, line);
      rolls.push({
        value,
        target,
        skill,
        character,
        line: normalizeResultLine(line),
        lineNo: index + 1,
        classification,
        isMyth: isMythSkill(skill),
        isParameter: isParameterSkill(skill, line),
        isLuck: isLuckSkill(skill),
        isInitial: isInitialRoll(skill, line),
      });
    });
  });

  return rolls.filter(roll => !["normal", "unknown"].includes(roll.classification));
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
  const bracketSkills = [...text.matchAll(/【([^】]+)】/g)]
    .map(match => cleanSkillName(match[1]))
    .filter(Boolean);
  if (bracketSkills.length) return bracketSkills[bracketSkills.length - 1];

  const bookSkills = [...text.matchAll(/《([^》]+)》/g)]
    .map(match => cleanSkillName(match[1]))
    .filter(Boolean);
  if (bookSkills.length) return bookSkills[bookSkills.length - 1];

  const param = inferParameterSkill(text);
  if (param) return param;

  return tr("skill.unknown", "技能名不明");
}

function cleanSkillName(skill) {
  return String(skill || "")
    .replace(/[:：].*$/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\[\]【】〈〉《》\s]+|[\[\]【】〈〉《》\s]+$/g, "")
    .trim();
}

function inferParameterSkill(line) {
  if (/アイデア/i.test(line)) return "アイデア";
  if (/知識|KNOWLEDGE|KNOW/i.test(line)) return "知識";
  if (/幸運|LUCK/i.test(line)) return "幸運";
  const abilityMatch = line.match(/\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU)\b(?:\s*[×xX*]\s*\d+)?/i);
  if (abilityMatch) return abilityMatch[0].toUpperCase().replace(/\s+/g, "");
  return "";
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
  const text = String(line || "");
  const lower = text.toLowerCase();

  if (/決定的成功|クリティカル|critical|c決定的/i.test(text) || /\bcrit\b/i.test(text)) return "critical";
  if (/致命的失敗|ファンブル|fumble/i.test(text)) return "fumble";
  if (/スペシャル|special/i.test(text)) return "success";
  if (/成功|success/i.test(text)) return "success";
  if (/失敗|failure|failed|fail/i.test(lower)) return "fail";
  if (target !== null) return value <= target ? "success" : "fail";
  return "unknown";
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
    || ["＞", ">", "→", "#", "(", "（"].some(marker => text.startsWith(marker))
    || ["成功", "失敗", "決定的成功", "致命的失敗", "クリティカル", "ファンブル", "スペシャル"].some(word => text.startsWith(word))
    || lower.startsWith("success")
    || lower.startsWith("fail")
    || lower.startsWith("critical")
    || lower.startsWith("fumble");
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
  return hasAnyText(line, ["出目", "決定的成功", "致命的失敗", "ファンブル", "クリティカル", "成功", "失敗"]);
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

function normalizeResultLine(line) {
  return String(line || "")
    .replaceAll("＞", ">")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMythSkill(skill) {
  return mythSkillPattern.test(String(skill || "").trim());
}

function isLuckSkill(skill) {
  const normalized = String(skill || "")
    .trim()
    .toUpperCase()
    .replace(/[〈〉《》【】\[\]\s]/g, "");
  return luckSkillPattern.test(normalized);
}

function isParameterSkill(skill, line = "") {
  const normalized = String(skill || "").trim().toUpperCase().replace(/\s+/g, "");
  const jp = String(skill || "").trim();
  if (/^(アイデア|知識|幸運)$/.test(jp)) return true;
  if (parameterSkillPattern.test(normalized)) return true;
  return /アイデア|知識|幸運|\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU|LUCK)\b/i.test(`${skill} ${line}`);
}

function isInitialRoll(skill, line) {
  return /初期値/i.test(`${skill} ${line}`);
}

function getRuleMode() {
  return document.querySelector('input[name="ruleMode"]:checked')?.value || "rulebook";
}

function getRuleLabel(mode = getRuleMode()) {
  return t(`ruleLabel.${mode}`, mode);
}

function includeParameterRolls() {
  return Boolean($("includeParamRolls")?.checked);
}

function analyze() {
  const raw = $("rawInput")?.value || "";
  const output = $("growthOutput");
  if (!raw.trim()) {
    state.allRolls = [];
    state.visibleCharacters = new Set();
    if (output) output.value = t("summary.emptyOutput", "ログを読み込むと、ここに成長候補が表示されます。");
    renderAll();
    return;
  }

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

function shouldIncludeRollForGrowth(roll, mode, successSeen) {
  if (roll.isMyth) return null;

  // 全選択ルール共通：〈幸運〉は「1クリティカル」の時だけ成長候補に出力する。
  // 通常成功・ファンブル・2以上のクリティカル表記は出力対象外。
  if (roll.isLuck) {
    return roll.classification === "critical" && roll.value === 1
      ? { ...roll, reason: "critical" }
      : null;
  }

  if (roll.isParameter && !includeParameterRolls()) return null;
  if (roll.isParameter && !["critical", "fumble"].includes(roll.classification) && !roll.isInitial) return null;

  const successKey = `${roll.character}///${roll.skill}`;

  if (mode === "rulebook") {
    if (roll.isParameter) return null;
    if (["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason: "success" };
    }
    return null;
  }

  if (mode === "critFumble") {
    if (roll.classification === "critical") return { ...roll, reason: "critical" };
    if (roll.classification === "fumble") return { ...roll, reason: "fumble" };
    if (roll.isInitial) return { ...roll, reason: "initial" };
    return null;
  }

  if (mode === "both") {
    if (roll.classification === "critical") return { ...roll, reason: "critical" };
    if (roll.classification === "fumble") return { ...roll, reason: "fumble" };
    if (!roll.isParameter && ["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason: "success" };
    }
    return null;
  }

  if (mode === "bothPrime") {
    if (roll.classification === "critical") return { ...roll, reason: "critical" };
    if (!roll.isParameter && ["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason: "success" };
    }
    return null;
  }

  return null;
}

function buildGrowthCandidates(rolls) {
  const mode = getRuleMode();
  const candidates = [];
  const successSeen = new Set();
  rolls.forEach(roll => {
    const item = shouldIncludeRollForGrowth(roll, mode, successSeen);
    if (item) candidates.push(item);
  });
  return candidates;
}

function buildGrowthOutput(candidates) {
  const lines = [`[セッション名：${state.sessionName || "貼り付けログ"}][選択ルール：${getRuleLabel()}]`];
  const grouped = groupByCharacter(candidates);
  const characters = Object.keys(grouped);
  if (!characters.length) {
    lines.push("", "表示対象の成長判定候補はありません。");
    return lines.join(LF);
  }

  characters.forEach(character => {
    const items = grouped[character];
    const skills = [...new Set(items.map(item => item.skill).filter(Boolean))];
    lines.push("", `【${character}】【成長判定候補：${skills.join("、") || "なし"}】`);
    items.forEach(item => lines.push(item.line));
  });

  return lines.join(LF);
}

function groupByCharacter(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.character]) acc[item.character] = [];
    acc[item.character].push(item);
    return acc;
  }, {});
}

function renderAll() {
  applyTranslations();
  renderCharacterControls();
  renderSummaryOutput();
  renderCandidatesTable();
  renderRollTable();
}

function renderSummaryOutput() {
  const candidates = buildGrowthCandidates(getVisibleRolls());
  const output = $("growthOutput");
  const guide = $("growthEmptyGuide");
  const hasResults = state.allRolls.length > 0;

  if (output) {
    output.value = hasResults
      ? buildGrowthOutput(candidates)
      : t("summary.emptyOutput", "ログを読み込むと、ここに成長候補が表示されます。");
    output.classList.toggle("has-results", hasResults);
  }

  if (guide) {
    guide.classList.toggle("is-hidden", hasResults);
  }
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
    return `<label class="character-toggle"><input type="checkbox" data-character="${escapeHtml(character)}" ${checked}> ${escapeHtml(character)} <span class="note">${count}</span></label>`;
  }).join("");

  controls.querySelectorAll("input[data-character]").forEach(input => {
    input.addEventListener("change", () => {
      const character = input.getAttribute("data-character");
      if (input.checked) state.visibleCharacters.add(character);
      else state.visibleCharacters.delete(character);
      renderSummaryOutput();
      renderCandidatesTable();
      renderRollTable();
    });
  });
}

function switchTab(button) {
  const tabName = button.dataset.tab;
  if (!tabName) return;
  state.currentTab = tabName;
  document.querySelectorAll(".tab-button").forEach(btn => btn.classList.toggle("active", btn === button));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === tabName));
}

function toggleInputPanel() {
  const layout = $("appLayout");
  if (!layout) return;
  layout.classList.toggle("input-collapsed");
  const button = $("inputToggleBtn");
  if (button) button.textContent = layout.classList.contains("input-collapsed") ? "⇥" : "⇤";
}

function clearAll() {
  state.suppressAutoAnalyze = true;
  if ($("rawInput")) $("rawInput").value = "";
  if ($("fileInput")) $("fileInput").value = "";
  state.sessionName = "貼り付けログ";
  state.allRolls = [];
  state.visibleCharacters = new Set();
  if ($("growthOutput")) $("growthOutput").value = t("summary.emptyOutput", "ログを読み込むと、ここに成長候補が表示されます。");
  renderAll();
  state.suppressAutoAnalyze = false;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_STORAGE_KEY, document.body.classList.contains("dark") ? "dark" : "light");
}

function openShortcutModal() {
  const drawer = $("shortcutDrawer");
  if (!drawer) return;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeShortcutModal() {
  const drawer = $("shortcutDrawer");
  if (!drawer) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function isShortcutModalOpen() {
  return Boolean($("shortcutDrawer")?.classList.contains("open"));
}

function setupAutoAnalyze() {
  let timer = 0;
  const runSoon = () => {
    if (state.suppressAutoAnalyze) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => analyze(), 350);
  };

  $("rawInput")?.addEventListener("input", () => {
    state.sessionName = "貼り付けログ";
    runSoon();
  });

  $("fileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.sessionName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      if ($("rawInput")) $("rawInput").value = String(reader.result || "");
      analyze();
    };
    reader.readAsText(file);
  });

  document.querySelectorAll('input[name="ruleMode"], #includeParamRolls, #autoHideMaxRolls').forEach(element => {
    element.addEventListener("change", () => {
      if (state.allRolls.length || $("rawInput")?.value.trim()) analyze();
      else renderAll();
    });
  });
}

function setupUi() {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") document.body.classList.add("dark");

  document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => switchTab(button)));
  $("analyzeBtn")?.addEventListener("click", analyze);
  $("clearBtn")?.addEventListener("click", () => {
    if (window.confirm(t("confirm.clear", "入力内容と抽出結果をクリアします。よろしいですか？"))) clearAll();
  });
  $("inputToggleBtn")?.addEventListener("click", toggleInputPanel);
  $("characterControlToggleBtn")?.addEventListener("click", () => {
    state.showCharacterControls = !state.showCharacterControls;
    renderCharacterControls();
  });
  $("themeToggleBtn")?.addEventListener("click", toggleTheme);
  $("languageToggleBtn")?.addEventListener("click", () => {
    const next = getCurrentLanguage && getCurrentLanguage() === "ja" ? "en" : "ja";
    setLanguage(next);
    const button = $("languageToggleBtn");
    if (button) button.textContent = next === "ja" ? "EN" : "JP";
    renderAll();
  });
  $("shortcutHelpBtn")?.addEventListener("click", () => isShortcutModalOpen() ? closeShortcutModal() : openShortcutModal());
  $("shortcutDrawerCloseBtn")?.addEventListener("click", closeShortcutModal);
  $("summaryShotBtn")?.addEventListener("click", () => document.body.classList.add("screenshot-mode"));
  $("screenshotExitBtn")?.addEventListener("click", () => document.body.classList.remove("screenshot-mode"));
  $("copySummaryBtn")?.addEventListener("click", async () => {
    const value = $("growthOutput")?.value || "";
    try {
      await navigator.clipboard.writeText(value);
      $("copySummaryBtn").textContent = t("button.copied", "コピー済み");
      window.setTimeout(() => $("copySummaryBtn").textContent = t("button.copy", "コピー"), 1200);
    } catch {
      $("growthOutput")?.select();
      document.execCommand("copy");
    }
  });
  $("deleteSummaryBtn")?.addEventListener("click", () => {
    if ($("growthOutput")) $("growthOutput").value = "";
  });

  setupAutoAnalyze();
  renderAll();
}

document.addEventListener("DOMContentLoaded", setupUi);
