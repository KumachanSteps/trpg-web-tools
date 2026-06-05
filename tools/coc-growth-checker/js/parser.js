const THEME_STORAGE_KEY = "cocGrowthCheckerTheme";

const state = {
  allRolls: [],
  visibleCharacters: new Set(),
  showCharacterControls: false,
  sessionName: "",
  hasAnalyzed: false,
  debounceTimer: null,
};

const EXCLUDED_TABS = ["雑談", "other", "info", "お祓い", "おはらい", "運試し"];
const MYTH_SKILL_PATTERN = /クトゥルフ\s*神話(?:技能)?|cthulhu\s*mythos/i;
const LUCK_SKILL_PATTERN = /^(?:幸運|〈幸運〉|《幸運》|LUCK)$/i;
const PARAM_SKILL_PATTERN = /^(?:アイデア|知識|STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:[×xX*]\d+)?$/i;
const DICE_COMMAND_PATTERN = /(?:S?CCB\d*|S?CC\d*|S?CBR\d*|S?RESB|RESB|CBR\d*|1D100|D100|S1D100|SD100|D%|D％)/i;

function $(id){ return document.getElementById(id); }

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanLine(value){
  return String(value || "")
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

function decodeHtml(value){
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function clampNumber(value, min, max, fallback){
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function getSelectedRuleMode(){
  return document.querySelector('input[name="ruleMode"]:checked')?.value || "rulebook";
}

function getSelectedRuleLabel(){
  return t(`ruleLabel.${getSelectedRuleMode()}`, "基本ルルブ準拠");
}

function updateDynamicTexts(){
  const guide = $("summaryGuideText");
  if (!guide) return;
  const rule = getSelectedRuleLabel();
  guide.textContent = state.hasAnalyzed
    ? t("message.after", "現在は「{rule}」の設定でログを解析、成長判定が可能な技能を出力しました。\n\n他の出力ルールをご使用の場合は左のパネルからご希望の出力ルールをお選びください。", { rule })
    : t("message.before", "現在は「{rule}」の設定でログを解析、成長判定が可能な技能をリストします。\n\n他の出力ルールをご使用の場合は左のパネルからご希望の出力ルールをお選びください。", { rule });
}

function prepareText(raw){
  const source = String(raw || "");
  if (!looksLikeHtml(source)) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  if (!doc.body) return source;
  const lines = extractHtmlLogLines(doc);
  return lines.length ? lines.join("\n") : decodeHtml(doc.body.innerText || doc.body.textContent || source);
}

function looksLikeHtml(value){
  const source = String(value || "").toLowerCase();
  return ["<html", "<body", "<p", "<span", "<div", "<br", "<li", "<tr", "&lt;"].some(token => source.includes(token));
}

function extractHtmlLogLines(doc){
  const selectors = ["p", "li", "tr", "div.MuiListItemText-root", "div[class*='message']"];
  for (const selector of selectors) {
    const lines = Array.from(doc.body.querySelectorAll(selector))
      .map(extractHtmlLogLine)
      .filter(Boolean);
    if (lines.some(line => DICE_COMMAND_PATTERN.test(line))) return lines;
  }
  return (doc.body.innerText || doc.body.textContent || "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
}

function extractHtmlLogLine(node){
  const spans = Array.from(node.querySelectorAll("span"))
    .map(span => cleanLine(decodeHtml(span.textContent || "")))
    .filter(Boolean);
  if (spans.length >= 3 && /^\[[^\]]+\]$/.test(spans[0])) {
    return `${spans[0]} ${spans[1]}: ${spans.slice(2).join(" ")}`;
  }
  return cleanLine(decodeHtml(node.textContent || ""));
}

function shouldDropLine(line){
  if (!line) return true;
  const tab = line.match(/^\[([^\]]+)\]/)?.[1]?.trim().toLowerCase() || "";
  if (tab && EXCLUDED_TABS.some(item => tab.includes(item.toLowerCase()))) return true;
  if (/^(ルール説明|【?7版ルール|◆7版ルール)/.test(line)) return true;
  return false;
}

function parseRolls(raw){
  const text = prepareText(raw);
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean).filter(line => !shouldDropLine(line));
  const rolls = [];
  let currentCharacter = "";

  lines.forEach((line, index) => {
    if (!DICE_COMMAND_PATTERN.test(line) && !/(出目|クリティカル|ファンブル|決定的成功|致命的失敗|成功|失敗)/.test(line)) return;
    const character = extractCharacterName(line);
    if (character) currentCharacter = character;
    const parsedCharacter = character || currentCharacter || t("common.unknown", "不明");
    const skill = normalizeSkillName(extractSkillName(line));
    const target = extractTargetNumber(line);
    const values = extractRollValues(line);
    values.forEach((value, i) => {
      rolls.push({
        id: `${index + 1}-${i}`,
        character: parsedCharacter,
        skill,
        target,
        value,
        classification: classifyRoll(value, target, line),
        line: normalizeOutputLine(line),
        lineNo: index + 1,
        isMyth: MYTH_SKILL_PATTERN.test(skill),
        isLuck: LUCK_SKILL_PATTERN.test(skill),
        isParam: isParamSkill(skill),
      });
    });
  });

  return rolls;
}

function normalizeOutputLine(line){
  return cleanLine(line).replace(/\s*>\s*/g, " > ");
}

function extractCharacterName(line){
  const noTab = String(line || "").replace(/^\[[^\]]+\]\s*/, "").trim();
  const diceIndex = findDiceIndex(noTab);
  if (diceIndex < 0) return "";
  const before = noTab.slice(0, diceIndex).trim();
  const colonIndex = Math.max(before.lastIndexOf(":"), before.lastIndexOf("："));
  if (colonIndex < 0) return "";
  const name = before.slice(0, colonIndex).replace(/[\[\]【】「」『』]/g, "").trim();
  if (!name || name.length > 80) return "";
  if (/^(system|info|ルール|メモ)$/i.test(name)) return "";
  return name;
}

function findDiceIndex(text){
  const match = String(text || "").match(DICE_COMMAND_PATTERN);
  return match ? match.index : -1;
}

function extractSkillName(line){
  const text = String(line || "");
  const brackets = [...text.matchAll(/【([^】]+)】|〈([^〉]+)〉|《([^》]+)》/g)]
    .map(match => match[1] || match[2] || match[3])
    .filter(Boolean);
  if (brackets.length) return brackets[brackets.length - 1];
  if (/アイデア/i.test(text)) return "アイデア";
  if (/知識|KNOWLEDGE|KNOW/i.test(text)) return "知識";
  if (/幸運|LUCK/i.test(text)) return "幸運";
  const ability = text.match(/\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU)\b(?:\s*[×xX*]\s*\d+)?/i);
  if (ability) return ability[0].toUpperCase().replace(/\s+/g, "");
  return "技能名不明";
}

function normalizeSkillName(skill){
  return String(skill || "")
    .replace(/[:：].*$/, "")
    .replace(/[\[\]【】〈〉《》]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "技能名不明";
}

function extractTargetNumber(line){
  const afterDice = String(line || "").slice(Math.max(0, findDiceIndex(line)));
  const match = afterDice.match(/(?:<=|≦|=<)\s*(\d{1,3})/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 100 ? value : null;
}

function extractRollValues(line){
  const text = String(line || "");
  const values = [];
  const resultMarkers = /[>→]\s*(\d{1,3})(?!\s*[dDＤｄ])/g;
  let match;
  while ((match = resultMarkers.exec(text)) !== null) {
    const value = Number(match[1]);
    if (value >= 1 && value <= 100) values.push(value);
  }
  if (values.length) return [values[0]];
  const fallback = text.match(/(?:出目|roll|result)\D{0,8}(\d{1,3})/i) || text.match(/(?:1D100|D100)\s*(?:<=\s*\d+)?\D+(\d{1,3})/i);
  if (fallback) {
    const value = Number(fallback[1]);
    if (value >= 1 && value <= 100) return [value];
  }
  return [];
}

function classifyRoll(value, target, line){
  const text = String(line || "");
  const lower = text.toLowerCase();
  if (/決定的成功|クリティカル|critical/.test(text) || /\bcrit\b/.test(lower)) return "critical";
  if (/致命的失敗|ファンブル|fumble/.test(text)) return "fumble";
  if (/スペシャル|special/i.test(text)) return "critical";
  if (/成功|success/i.test(text)) return "success";
  if (/失敗|failure|failed|fail/i.test(text)) return "fail";
  if (target !== null) return value <= target ? "success" : "fail";
  if (value <= 5) return "critical";
  if (value >= 96) return "fumble";
  return "normal";
}

function isParamSkill(skill){
  const normalized = String(skill || "").toUpperCase().replace(/\s+/g, "").trim();
  if (/^(アイデア|知識)$/.test(skill)) return true;
  if (PARAM_SKILL_PATTERN.test(normalized)) return true;
  return false;
}

function isEligibleForGrowth(roll, mode, successSeen, includeParamRolls){
  if (!roll || roll.isMyth) return null;

  if (roll.isLuck) {
    return roll.classification === "critical" && roll.value === 1
      ? { ...roll, reason:"critical" }
      : null;
  }

  if (roll.isParam) {
    if (!includeParamRolls) return null;
    if (mode === "rulebook" || mode === "bothPrime") {
      return roll.classification === "critical" ? { ...roll, reason:"critical" } : null;
    }
    if (mode === "critFumble" || mode === "both") {
      if (roll.classification === "critical") return { ...roll, reason:"critical" };
      if (roll.classification === "fumble") return { ...roll, reason:"fumble" };
    }
    return null;
  }

  const successKey = `${roll.character}///${roll.skill}`;

  if (mode === "rulebook") {
    if (["success", "critical"].includes(roll.classification) && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason:"success" };
    }
    return null;
  }

  if (mode === "critFumble") {
    if (roll.classification === "critical") return { ...roll, reason:"critical" };
    if (roll.classification === "fumble") return { ...roll, reason:"fumble" };
    return null;
  }

  if (mode === "both") {
    if (roll.classification === "critical") return { ...roll, reason:"critical" };
    if (roll.classification === "fumble") return { ...roll, reason:"fumble" };
    if (roll.classification === "success" && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason:"success" };
    }
    return null;
  }

  if (mode === "bothPrime") {
    if (roll.classification === "critical") return { ...roll, reason:"critical" };
    if (roll.classification === "success" && !successSeen.has(successKey)) {
      successSeen.add(successKey);
      return { ...roll, reason:"success" };
    }
  }
  return null;
}

function buildGrowthCandidates(rolls){
  const mode = getSelectedRuleMode();
  const includeParamRolls = Boolean($("includeParamRolls")?.checked);
  const successSeen = new Set();
  const candidates = [];
  rolls.forEach(roll => {
    const candidate = isEligibleForGrowth(roll, mode, successSeen, includeParamRolls);
    if (candidate) candidates.push(candidate);
  });
  return candidates;
}

function countByCharacter(rolls){
  return rolls.reduce((acc, roll) => {
    acc[roll.character] = (acc[roll.character] || 0) + 1;
    return acc;
  }, {});
}

function getVisibleRolls(){
  return state.allRolls.filter(roll => state.visibleCharacters.has(roll.character));
}

function applyAutoVisibility(){
  const counts = countByCharacter(state.allRolls);
  const autoHideMax = clampNumber($("autoHideMaxRolls")?.value, 0, 999, 15);
  state.visibleCharacters = new Set(Object.entries(counts).filter(([, count]) => count > autoHideMax).map(([character]) => character));
  if (!state.visibleCharacters.size) Object.keys(counts).forEach(character => state.visibleCharacters.add(character));
}

function analyze(){
  const raw = $("rawInput")?.value || "";
  state.allRolls = parseRolls(raw);
  state.hasAnalyzed = raw.trim().length > 0 || state.allRolls.length > 0;
  applyAutoVisibility();
  renderAll();
}

function renderAll(){
  renderCharacterControls();
  renderSummaryText();
  updateDynamicTexts();
}

function renderCharacterControls(){
  const controls = $("characterControls");
  const button = $("characterControlToggleBtn");
  if (!controls || !button) return;
  const counts = countByCharacter(state.allRolls);
  controls.classList.toggle("visible", state.showCharacterControls);
  button.textContent = state.showCharacterControls ? t("button.hideCharacterControls") : t("button.showCharacterControls");
  controls.innerHTML = Object.entries(counts).map(([character, count]) => {
    const checked = state.visibleCharacters.has(character) ? "checked" : "";
    return `<label class="character-toggle"><input type="checkbox" data-character="${escapeHtml(character)}" ${checked}>${escapeHtml(character)} <span class="note">${count}</span></label>`;
  }).join("");
  controls.querySelectorAll("input[data-character]").forEach(input => {
    input.addEventListener("change", event => {
      const character = event.currentTarget.getAttribute("data-character");
      if (event.currentTarget.checked) state.visibleCharacters.add(character);
      else state.visibleCharacters.delete(character);
      renderSummaryText();
    });
  });
}

function renderSummaryText(){
  const output = $("growthSummaryOutput");
  if (!output) return;
  const rule = getSelectedRuleLabel();
  const session = state.sessionName || t("message.sessionUnknown", "未読込");

  if (!state.hasAnalyzed) {
    output.value = t("message.empty", "[セッション名：未読込][選択ルール：{rule}]\n\nログを貼り付けるか、HTML / txtファイルを選択してください。", { rule });
    updateDynamicTexts();
    return;
  }

  const visibleRolls = getVisibleRolls();
  const candidates = buildGrowthCandidates(visibleRolls);
  if (!candidates.length) {
    output.value = t("message.noCandidates", "[セッション名：{session}][選択ルール：{rule}]\n\n表示対象の成長判定候補はありません。", { session, rule });
    updateDynamicTexts();
    return;
  }

  const grouped = candidates.reduce((acc, item) => {
    if (!acc[item.character]) acc[item.character] = [];
    acc[item.character].push(item);
    return acc;
  }, {});

  const lines = [`[セッション名：${session}][選択ルール：${rule}]`, ""];
  Object.entries(grouped).forEach(([character, items], groupIndex) => {
    const skills = [...new Set(items.map(item => item.skill))];
    if (groupIndex > 0) lines.push("");
    lines.push(`【${character}】【成長判定候補：${skills.join("、")}】`);
    items.forEach(item => lines.push(item.line));
  });
  output.value = lines.join("\n");
  updateDynamicTexts();
}

function clearAll(){
  if ($("rawInput")) $("rawInput").value = "";
  if ($("fileInput")) $("fileInput").value = "";
  state.allRolls = [];
  state.visibleCharacters = new Set();
  state.sessionName = "";
  state.hasAnalyzed = false;
  state.showCharacterControls = false;
  renderAll();
}

function scheduleAnalyze(delay = 350){
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => analyze(), delay);
}

function copySummary(){
  const output = $("growthSummaryOutput");
  if (!output) return;
  output.select();
  navigator.clipboard?.writeText(output.value).catch(() => document.execCommand("copy"));
}

function deleteSummary(){
  const output = $("growthSummaryOutput");
  if (output) output.value = "";
}

function toggleInputPanel(){
  const layout = $("appLayout");
  const button = $("inputToggleBtn");
  layout?.classList.toggle("input-collapsed");
  const collapsed = layout?.classList.contains("input-collapsed");
  if (button) button.textContent = collapsed ? "⇥" : "⇤";
}

function toggleTheme(){
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  const button = $("themeToggleBtn");
  if (button) {
    button.setAttribute("aria-pressed", isDark ? "true" : "false");
    button.setAttribute("title", isDark ? t("theme.switchToLight") : t("theme.switchToDark"));
  }
}

function setupFileInput(){
  const fileInput = $("fileInput");
  if (!fileInput) return;
  fileInput.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.sessionName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      if ($("rawInput")) $("rawInput").value = String(reader.result || "");
      analyze();
    };
    reader.readAsText(file, "UTF-8");
  });
}

function setupEvents(){
  $("analyzeBtn")?.addEventListener("click", analyze);
  $("clearBtn")?.addEventListener("click", () => { if (window.confirm(t("confirm.clear"))) clearAll(); });
  $("rawInput")?.addEventListener("input", () => { state.sessionName = state.sessionName || "貼り付けログ"; scheduleAnalyze(); });
  $("autoHideMaxRolls")?.addEventListener("input", () => { applyAutoVisibility(); renderAll(); });
  $("includeParamRolls")?.addEventListener("change", renderSummaryText);
  document.querySelectorAll('input[name="ruleMode"]').forEach(input => input.addEventListener("change", renderSummaryText));
  $("copySummaryBtn")?.addEventListener("click", copySummary);
  $("deleteSummaryBtn")?.addEventListener("click", deleteSummary);
  $("inputToggleBtn")?.addEventListener("click", toggleInputPanel);
  $("characterControlToggleBtn")?.addEventListener("click", () => { state.showCharacterControls = !state.showCharacterControls; renderCharacterControls(); });
  $("summaryShotBtn")?.addEventListener("click", () => document.body.classList.add("screenshot-mode"));
  $("screenshotExitBtn")?.addEventListener("click", () => document.body.classList.remove("screenshot-mode"));
  $("themeToggleBtn")?.addEventListener("click", toggleTheme);
  $("languageToggleBtn")?.addEventListener("click", () => setLanguage(getCurrentLanguage() === "ja" ? "en" : "ja"));
  setupFileInput();
}

function init(){
  if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") document.body.classList.add("dark");
  setupEvents();
  applyTranslations();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
