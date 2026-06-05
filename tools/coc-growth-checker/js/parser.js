const THEME_STORAGE_KEY = "cocGrowthCheckerTheme";
const LF = "\n";

const state = {
  allRolls: [],
  candidates: [],
  visibleCharacters: new Set(),
  hiddenCharacters: new Set(),
  currentFileName: "ログ本文",
  hasOutput: false,
  currentTab: "summary",
};

function $(id){ return document.getElementById(id); }
function cleanLine(v){ return String(v || "").replace(/\s+/g, " ").trim(); }
function escapeHtml(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function clampNumber(value, min, max, fallback){ const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; }

const EXCLUDED_TABS = ["雑談", "other", "info", "お祓い", "おはらい", "運試し"];
const MYTHOS_SKILLS = ["クトゥルフ神話", "クトゥルフ神話技能", "cthulhu mythos"];
const PARAM_PAT = /^(アイデア|知識|STR|CON|POW|DEX|APP|SIZ|INT|EDU)(?:[×xX*]\d+)?$|^(IDEA|KNOW|KNOWLEDGE|STR|CON|POW|DEX|APP|SIZ|INT|EDU)$/i;

function prepareText(raw){
  const source = String(raw || "");
  if (!/<(?:html|body|p|div|span|br|table|tr|td)\b/i.test(source)) return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  const lines = [];
  doc.body?.querySelectorAll("p, li, tr, div[class*='message'], div.MuiListItemText-root").forEach(node => {
    const text = cleanLine(node.textContent || "");
    if (text) lines.push(text);
  });
  return lines.length ? lines.join(LF) : (doc.body?.innerText || doc.body?.textContent || source);
}

function normalizeLine(line){
  return String(line || "")
    .replace(/\u00a0/g, " ")
    .replace(/[：]/g, ":")
    .replace(/[＜]/g, "<")
    .replace(/[＝]/g, "=")
    .replace(/[＞]/g, ">")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[［]/g, "[")
    .replace(/[］]/g, "]")
    .replace(/\s+/g, " ")
    .trim();
}
function getLeadingTab(line){ const m = String(line||"").trim().match(/^\[([^\]]+)\]/); return m ? m[1].trim() : ""; }
function shouldDropLine(line){
  const tab = getLeadingTab(line).toLowerCase().replace(/\s/g, "");
  return EXCLUDED_TABS.some(x => tab.includes(String(x).toLowerCase().replace(/\s/g, "")));
}
function containsDice(line){ return /\b(?:S?CCB?\d*|S?CBR\d*|S?RESB|RESB|1D100|D100)\b/i.test(line); }

function parseRolls(rawInput){
  const text = prepareText(rawInput);
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const rolls = [];
  let currentCharacter = "";
  lines.forEach((line, i) => {
    if (shouldDropLine(line) || !containsDice(line)) return;
    const character = extractCharacter(line) || currentCharacter || "不明";
    if (character !== "不明") currentCharacter = character;
    const skill = extractSkill(line);
    const target = extractTarget(line);
    const values = extractRollValues(line);
    values.forEach((value, idx) => {
      const result = classifyRoll(line, value, target);
      if (result === "unknown") return;
      rolls.push({
        id: `${i+1}-${idx}`,
        lineNo: i + 1,
        character,
        skill,
        target,
        value,
        result,
        raw: line,
        isMythos: isMythosSkill(skill),
        isLuck: isLuckSkill(skill),
        isParam: isParamSkill(skill),
        isInitial: target !== null && value > target,
      });
    });
  });
  return rolls;
}

function findDiceIndex(line){
  const m = line.match(/\b(?:S?CCB?\d*|S?CBR\d*|S?RESB|RESB|1D100|D100)\b/i);
  return m ? m.index : -1;
}
function removeLeadingTab(line){ return String(line||"").replace(/^\[[^\]]+\]\s*/, "").trim(); }
function extractCharacter(line){
  const body = removeLeadingTab(line);
  const diceIndex = findDiceIndex(body);
  if (diceIndex < 0) return "";
  let before = body.slice(0, diceIndex).trim();
  const colon = Math.max(before.lastIndexOf(":"), before.lastIndexOf("："));
  if (colon >= 0) before = before.slice(0, colon);
  before = before.replace(/[\[\]【】]/g, "").replace(/[\s\-–—・:：>＞]+$/g, "").trim();
  if (!before || before.length > 80) return "";
  if (/^(system|info|ルール|メモ)$/i.test(before)) return "";
  return before;
}
function extractSkill(line){
  const bracket = [...String(line).matchAll(/【([^】]+)】|《([^》]+)》/g)].map(m => m[1] || m[2]).filter(Boolean);
  if (bracket.length) return cleanSkillName(bracket[bracket.length - 1]);
  if (/SAN|SANC|正気度/i.test(line)) return "正気度ロール";
  if (/アイデア|IDEA/i.test(line)) return "アイデア";
  if (/知識|KNOWLEDGE|KNOW/i.test(line)) return "知識";
  if (/幸運|LUCK/i.test(line)) return "幸運";
  const ability = line.match(/\b(STR|CON|POW|DEX|APP|SIZ|INT|EDU)\b(?:\s*[×xX*]\s*\d+)?/i);
  if (ability) return ability[0].toUpperCase().replace(/\s/g, "");
  return "技能名不明";
}
function cleanSkillName(skill){ return cleanLine(skill).replace(/[:：].*$/, "").replace(/^〈(.+)〉$/, "$1").replace(/^《(.+)》$/, "$1"); }
function extractTarget(line){
  const m = String(line).match(/(?:<=|=<|≦)\s*(\d{1,3})/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 100 ? n : null;
}
function extractRollValues(line){
  const vals = [];
  let m;
  const patterns = [/>\s*(\d{1,3})\s*>/g, /[＞→]\s*(\d{1,3})/g, /(?:出目|ROLL)\D*(\d{1,3})/gi];
  patterns.forEach(re => {
    while ((m = re.exec(line)) !== null) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 100) vals.push(n);
    }
  });
  if (!vals.length) {
    const fallback = line.match(/(?:1D100|D100)\s*(?:<=\s*\d+)?\D+(\d{1,3})/i);
    if (fallback) {
      const n = Number(fallback[1]);
      if (n >= 1 && n <= 100) vals.push(n);
    }
  }
  return vals.slice(0, 1);
}
function classifyRoll(line, value, target){
  const text = String(line || "").toLowerCase();
  if (/決定的成功|クリティカル|critical|\bcrit\b/.test(text)) return "critical";
  if (/致命的失敗|ファンブル|fumble/.test(text)) return "fumble";
  if (/スペシャル|special/.test(text)) return "special";
  if (/成功|success/.test(text)) return "success";
  if (/失敗|failure|failed|fail/.test(text)) return "failure";
  if (target !== null) return value <= target ? "success" : "failure";
  if (value <= 5) return "critical";
  if (value >= 96) return "fumble";
  return "unknown";
}
function normalizedSkill(skill){ return String(skill||"").toLowerCase().replace(/[〈〉《》【】\s]/g, "").trim(); }
function isMythosSkill(skill){ const n = normalizedSkill(skill); return MYTHOS_SKILLS.some(x => n === normalizedSkill(x)); }
function isLuckSkill(skill){ return /^(幸運|luck)$/i.test(normalizedSkill(skill)); }
function isParamSkill(skill){ const s = String(skill || "").replace(/[〈〉《》【】\s]/g, ""); return PARAM_PAT.test(s); }
function isGrowthSkillRoll(roll){ return !roll.isMythos && !roll.isParam && !/正気度|SAN|SANC/i.test(roll.skill); }
function canIncludeParamRoll(roll, ruleMode, includeParam){
  if (!includeParam || !roll.isParam) return false;
  if (isLuckSkill(roll.skill)) return roll.result === "critical" && roll.value === 1;
  if (ruleMode === "rulebook") return false;
  if (ruleMode === "bothPrime") return roll.result === "critical";
  return roll.result === "critical" || roll.result === "fumble" || roll.isInitial;
}
function canIncludeLuckRoll(roll){ return roll.isLuck && roll.result === "critical" && roll.value === 1; }
function getRuleMode(){ return document.querySelector('input[name="ruleMode"]:checked')?.value || "rulebook"; }
function getRuleLabel(mode = getRuleMode()){
  const map = {
    rulebook: "基本ルルブ準拠",
    critFumble: "クリティカル / ファンブル / 初期値",
    both: "合算① クリファン全件 + 成功技能1回づつ",
    bothPrime: "合算② クリティカル全件 + 成功技能1回づつ",
  };
  return map[mode] || map.rulebook;
}
function candidateReason(roll){
  if (roll.isInitial) return "初期値";
  if (roll.result === "critical") return "クリティカル";
  if (roll.result === "fumble") return "ファンブル";
  if (roll.result === "special") return "スペシャル";
  if (roll.result === "success") return "成功";
  return roll.result;
}
function getCandidateRolls(rolls){
  const mode = getRuleMode();
  const includeParam = $("includeParamRolls")?.checked || false;
  const byCharSkillSuccess = new Set();
  const candidates = [];

  rolls.forEach(roll => {
    if (roll.isMythos) return;
    if (roll.isLuck && !canIncludeLuckRoll(roll)) return;
    const baseGrowth = isGrowthSkillRoll(roll) || canIncludeLuckRoll(roll);
    const paramGrowth = canIncludeParamRoll(roll, mode, includeParam);
    if (!baseGrowth && !paramGrowth) return;

    if (mode === "rulebook") {
      if (!(roll.result === "success" || roll.result === "critical" || roll.result === "special" || canIncludeLuckRoll(roll))) return;
      const key = `${roll.character}|||${roll.skill}`;
      if (byCharSkillSuccess.has(key)) return;
      byCharSkillSuccess.add(key);
      candidates.push(roll);
      return;
    }

    if (mode === "critFumble") {
      if (roll.result === "critical" || roll.result === "fumble" || roll.isInitial || canIncludeLuckRoll(roll)) candidates.push(roll);
      return;
    }

    if (mode === "both") {
      if (roll.result === "critical" || roll.result === "fumble" || canIncludeLuckRoll(roll)) { candidates.push(roll); return; }
      if (roll.result === "success" || roll.result === "special") {
        const key = `${roll.character}|||${roll.skill}`;
        if (!byCharSkillSuccess.has(key)) { byCharSkillSuccess.add(key); candidates.push(roll); }
      }
      return;
    }

    if (mode === "bothPrime") {
      if (roll.result === "critical" || canIncludeLuckRoll(roll)) { candidates.push(roll); return; }
      if (roll.result === "success" || roll.result === "special") {
        const key = `${roll.character}|||${roll.skill}`;
        if (!byCharSkillSuccess.has(key)) { byCharSkillSuccess.add(key); candidates.push(roll); }
      }
    }
  });
  return candidates;
}

function analyze(){
  const raw = $("rawInput")?.value || "";
  if (!raw.trim()) {
    state.allRolls = [];
    state.candidates = [];
    state.hasOutput = false;
    renderAll();
    return;
  }
  state.allRolls = parseRolls(raw);
  const counts = new Map();
  state.allRolls.forEach(r => counts.set(r.character, (counts.get(r.character) || 0) + 1));
  const threshold = clampNumber($("autoHideMaxRolls")?.value, 0, 999, 15);
  if (!state.visibleCharacters.size) {
    state.visibleCharacters = new Set([...counts.entries()].filter(([, c]) => c > threshold).map(([name]) => name));
    if (!state.visibleCharacters.size) state.visibleCharacters = new Set([...counts.keys()]);
  }
  const visibleRolls = state.allRolls.filter(r => state.visibleCharacters.has(r.character));
  state.candidates = getCandidateRolls(visibleRolls);
  state.hasOutput = true;
  renderAll();
}
function renderAll(){ renderCharacterControls(); renderSummaryOutput(); renderRollTable(); renderGuidePanel(); }
function renderCharacterControls(){
  const box = $("characterControls");
  if (!box) return;
  const names = [...new Set(state.allRolls.map(r => r.character))];
  if (!names.length) { box.innerHTML = ""; return; }
  box.innerHTML = names.map(name => `<label class="character-toggle"><input type="checkbox" data-character="${escapeHtml(name)}" ${state.visibleCharacters.has(name) ? "checked" : ""}> ${escapeHtml(name)}</label>`).join("");
  box.querySelectorAll("input[data-character]").forEach(input => {
    input.addEventListener("change", () => {
      const name = input.getAttribute("data-character");
      if (input.checked) state.visibleCharacters.add(name); else state.visibleCharacters.delete(name);
      state.candidates = getCandidateRolls(state.allRolls.filter(r => state.visibleCharacters.has(r.character)));
      renderSummaryOutput(); renderRollTable(); renderGuidePanel();
    });
  });
}
function buildSummaryText(){
  const session = state.currentFileName || "ログ本文";
  const rule = getRuleLabel();
  if (!state.hasOutput) return "";
  const lines = [`[セッション名：${session}][選択ルール：${rule}]`, ""];
  const byChar = new Map();
  state.candidates.forEach(r => {
    if (!byChar.has(r.character)) byChar.set(r.character, []);
    byChar.get(r.character).push(r);
  });
  if (!byChar.size) {
    lines.push("成長判定候補はありませんでした。");
    return lines.join(LF);
  }
  byChar.forEach((rolls, character) => {
    const skills = [...new Set(rolls.map(r => r.skill))].join("、");
    lines.push(`【${character}】【成長判定候補：${skills}】`);
    rolls.forEach(r => lines.push(r.raw));
    lines.push("");
  });
  return lines.join(LF).trimEnd();
}
function renderSummaryOutput(){ const out = $("summaryOutput"); if (out) out.value = buildSummaryText(); }
function renderGuidePanel(){
  const guide = $("summaryGuide");
  if (!guide) return;
  const rule = getRuleLabel();
  const first = state.hasOutput
    ? `現在は「${rule}」の設定でログを解析、成長判定が可能な技能を出力しました。`
    : `現在は「${rule}」の設定でログを解析、成長判定が可能な技能をリストします。`;
  guide.textContent = `${first}\n\n他の出力ルールをご使用の場合は左のパネルからご希望の出力ルールをお選びください。`;
}
function renderRollTable(){
  const tbody = $("rollTableBody");
  if (!tbody) return;
  tbody.innerHTML = state.allRolls.map((r, i) => `<tr><td>${i+1}</td><td>${escapeHtml(r.character)}</td><td>${escapeHtml(r.skill)}</td><td>${r.value}</td><td><span class="pill ${escapeHtml(r.result)}">${escapeHtml(candidateReason(r))}</span></td><td>${escapeHtml(r.raw)}</td></tr>`).join("");
}
function clearAll(){
  if ($("rawInput")) $("rawInput").value = "";
  if ($("fileInput")) $("fileInput").value = "";
  state.allRolls = []; state.candidates = []; state.visibleCharacters = new Set(); state.currentFileName = "ログ本文"; state.hasOutput = false;
  renderAll();
}
function copyOutput(){ const out = $("summaryOutput"); if (out) navigator.clipboard?.writeText(out.value); }
function deleteOutput(){ const out = $("summaryOutput"); if (out) out.value = ""; }
function switchTab(name){
  state.currentTab = name;
  document.querySelectorAll(".tab-button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === name));
}
function toggleInputPanel(){ $("appLayout")?.classList.toggle("input-collapsed"); }
function toggleTheme(){ const dark = !document.body.classList.contains("dark"); document.body.classList.toggle("dark", dark); localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light"); }
function enterScreenshotMode(){ document.body.classList.add("screenshot-mode"); window.scrollTo(0,0); }
function exitScreenshotMode(){ document.body.classList.remove("screenshot-mode"); }
function scheduleAutoAnalyze(){ clearTimeout(scheduleAutoAnalyze.timer); scheduleAutoAnalyze.timer = setTimeout(() => analyze(), 250); }

function init(){
  if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") document.body.classList.add("dark");
  $("analyzeBtn")?.addEventListener("click", analyze);
  $("clearBtn")?.addEventListener("click", clearAll);
  $("copyOutputBtn")?.addEventListener("click", copyOutput);
  $("deleteOutputBtn")?.addEventListener("click", deleteOutput);
  $("inputToggleBtn")?.addEventListener("click", toggleInputPanel);
  $("themeToggleBtn")?.addEventListener("click", toggleTheme);
  $("summaryShotBtn")?.addEventListener("click", enterScreenshotMode);
  $("screenshotExitBtn")?.addEventListener("click", exitScreenshotMode);
  $("characterControlToggleBtn")?.addEventListener("click", () => {
    const controls = $("characterControls");
    controls?.classList.toggle("visible");
    const opened = controls?.classList.contains("visible");
    $("characterControlToggleBtn").textContent = opened ? "表示キャラ設定を隠す▲" : "表示キャラ設定を開く▼";
  });
  document.querySelectorAll(".tab-button").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('input[name="ruleMode"], #includeParamRolls, #autoHideMaxRolls').forEach(el => el.addEventListener("change", () => {
    state.visibleCharacters = new Set();
    if (($("rawInput")?.value || "").trim()) analyze(); else renderGuidePanel();
  }));
  $("rawInput")?.addEventListener("input", () => {
    state.currentFileName = "ログ本文";
    state.visibleCharacters = new Set();
    scheduleAutoAnalyze();
  });
  $("fileInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.currentFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      if ($("rawInput")) $("rawInput").value = String(reader.result || "");
      state.visibleCharacters = new Set();
      analyze();
    };
    reader.readAsText(file);
  });
  renderGuidePanel();
}
document.addEventListener("DOMContentLoaded", init);
