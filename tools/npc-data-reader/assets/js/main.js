const SAMPLE_TEXT = `カルティスト、名もなき神の信者
STR 60　CON 70　SIZ 60　DEX 60　INT 50
APP 35　POW 50　EDU 60　正気度 0　耐久力 13
DB：+0　ビルド：0　移動：8　MP：10
近接戦闘（格闘）60%（30/12）、ダメージ 1D3+1+DB（ナイフ）
首を絞める（mnvr）、ダメージ 1D3+DB（素手）
回避 30%（15/6）`;

const ABILITIES = ["STR", "CON", "SIZ", "DEX", "APP", "POW", "INT", "EDU"];
const state = {
  name: "カルティスト",
  title: "名もなき神の信者",
  systemMode: "auto",
  resolvedSystem: "coc7",
  status: { hp: "13", mp: "10", san: "0", db: "+0", build: "0", move: "8" },
  abilities: { STR: "60", CON: "70", SIZ: "60", DEX: "60", INT: "50", APP: "35", POW: "50", EDU: "60" },
  combat: [
    { name: "近接戦闘（格闘）", value: "60", damage: "1D3+1+DB（ナイフ）", raw: false },
    { name: "首を絞める（mnvr）", value: "", damage: "1D3+DB（素手）", raw: true },
    { name: "回避", value: "30", damage: "", raw: false }
  ],
  armor: "",
  skills: [],
  memo: "カルティスト",
  paletteManuallyEdited: false
};

const $ = (id) => document.getElementById(id);

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0]/g, " ")
    .replace(/[　]+/g, " ")
    .replace(/[：]/g, ":")
    .replace(/[％]/g, "%")
    .replace(/[＋]/g, "+")
    .replace(/[／]/g, "/")
    .replace(/[，]/g, "、")
    .replace(/[．]/g, "。")
    .replace(/\s+%/g, "%")
    .trim();
}

function stripHardExtreme(text) {
  return String(text || "").replace(/[（(]\s*\d+\s*\/\s*\d+\s*[）)]/g, "");
}

function cleanTrailing(text) {
  return String(text || "").trim().replace(/[。．.]+$/g, "").trim();
}

function extractNameAndTitle(firstLine) {
  const line = cleanTrailing(firstLine || "NPC").replace(/^名前\s*[:：]\s*/, "").trim();
  const m = line.match(/^(.+?)(?:[（(](.+?)[）)](?:[、,]\s*(.+))?|[、,]\s*(.+))$/);
  if (!m) return { name: line || "NPC", title: "" };
  const name = (m[1] || "NPC").trim();
  const titleParts = [m[2], m[3], m[4]].filter(Boolean).map(s => s.trim());
  return { name, title: titleParts.join("、") };
}

function findValue(text, labels) {
  const labelPattern = labels.map(escapeRegExp).join("|");
  const re = new RegExp(`(?:${labelPattern})\\s*[:：]?\\s*([+\-]?\\d+D\\d+|[+\-]?\\d+)`, "i");
  const m = text.match(re);
  return m ? m[1] : "";
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseAbilities(text) {
  const abilities = {};
  for (const ab of ABILITIES) {
    const re = new RegExp(`${ab}\\s*[:：]?\\s*([+\-]?\\d+)`, "i");
    const m = text.match(re);
    if (m) abilities[ab] = m[1];
  }
  return abilities;
}

function detectSystem(parsed, text) {
  if (parsed.systemMode === "coc7" || parsed.systemMode === "coc6" || parsed.systemMode === "generic") return parsed.systemMode;
  const values = Object.values(parsed.abilities || {}).map(v => Number(v)).filter(Number.isFinite);
  const highCount = values.filter(v => v >= 20).length;
  const has7Terms = /ビルド|移動|耐久力|正気度/.test(text);
  if (has7Terms || highCount >= 3) return "coc7";
  if (values.length && values.every(v => v >= 1 && v <= 18)) return "coc6";
  return "generic";
}

function splitSections(text) {
  const armorMatch = text.match(/装甲\s*[:：]/);
  const skillMatch = text.match(/技能\s*[:：]/);
  const armorIndex = armorMatch ? armorMatch.index : -1;
  const skillIndex = skillMatch ? skillMatch.index : -1;
  let beforeArmorSkill = text;
  let armor = "";
  let skillText = "";

  const firstSectionIndex = [armorIndex, skillIndex].filter(i => i >= 0).sort((a, b) => a - b)[0];
  if (firstSectionIndex !== undefined) beforeArmorSkill = text.slice(0, firstSectionIndex);

  if (armorIndex >= 0) {
    const start = armorIndex + text.slice(armorIndex).match(/装甲\s*[:：]/)[0].length;
    const end = skillIndex > armorIndex ? skillIndex : text.length;
    armor = cleanTrailing(text.slice(start, end).replace(/\n+/g, " "));
  }
  if (skillIndex >= 0) {
    const start = skillIndex + text.slice(skillIndex).match(/技能\s*[:：]/)[0].length;
    skillText = text.slice(start).replace(/\n+/g, " ");
  }
  return { beforeArmorSkill, armor, skillText };
}

function parseCombat(beforeText) {
  const lines = beforeText.split("\n").map(l => cleanTrailing(stripHardExtreme(l))).filter(Boolean);
  const combat = [];
  const skipLine = /^(名前|STR\b|CON\b|SIZ\b|DEX\b|APP\b|POW\b|INT\b|EDU\b|DB\b|ビルド|移動|MP\b|正気度|耐久力)/i;
  for (const line of lines) {
    if (skipLine.test(line)) continue;
    const normalized = line.replace(/\s+/g, " ").trim();
    const percentMatch = normalized.match(/^(.+?)\s*(\d{1,3})%\s*(?:、\s*ダメージ\s*(.+))?$/);
    if (percentMatch) {
      combat.push({
        name: cleanTrailing(percentMatch[1]),
        value: percentMatch[2],
        damage: percentMatch[3] ? cleanTrailing(percentMatch[3]) : "",
        raw: false
      });
      continue;
    }

    const rawDamageMatch = normalized.match(/^(.+?)\s*、\s*ダメージ\s*(.+)$/);
    if (rawDamageMatch) {
      combat.push({
        name: cleanTrailing(rawDamageMatch[1]),
        value: "",
        damage: cleanTrailing(rawDamageMatch[2]),
        raw: true
      });
      continue;
    }

    if (/ダメージ|mnvr|攻撃|噛みつき|かぎ爪|組みつき|かぶせる|絞める|ナイフ|特殊|1ラウンド/i.test(normalized)) {
      combat.push({ name: normalized, value: "", damage: "", raw: true });
    }
  }
  return combat;
}

function parseSkills(skillText) {
  const normalized = cleanTrailing(skillText).replace(/。/g, "、");
  const parts = normalized.split(/[、,]/).map(s => cleanTrailing(stripHardExtreme(s))).filter(Boolean);
  const skills = [];
  for (const part of parts) {
    const m = part.match(/^(.+?)\s*(\d{1,3})%?$/);
    if (m) skills.push({ name: cleanTrailing(m[1]), value: m[2] });
  }
  return skills;
}

function parseNpcText(raw) {
  const text = normalizeText(raw);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "NPC";
  const { name, title } = extractNameAndTitle(firstLine);
  const sections = splitSections(text);
  const parsed = {
    name,
    title,
    systemMode: $("systemMode")?.value || "auto",
    status: {
      hp: findValue(text, ["耐久力", "HP"]),
      mp: findValue(text, ["MP"]),
      san: findValue(text, ["正気度", "SAN"]),
      db: findValue(text, ["DB"]),
      build: findValue(text, ["ビルド", "BUILD"]),
      move: findValue(text, ["移動", "MOV"])
    },
    abilities: parseAbilities(text),
    combat: parseCombat(sections.beforeArmorSkill),
    armor: sections.armor,
    skills: parseSkills(sections.skillText),
    memo: name
  };
  parsed.resolvedSystem = detectSystem(parsed, text);
  return parsed;
}

function commandPrefix() {
  const sys = state.resolvedSystem;
  if (sys === "coc7") return "CC<=";
  if (sys === "coc6") return "CCB<=";
  return "1D100<=";
}

function systemLabel() {
  if (state.resolvedSystem === "coc7") return "7版NPC";
  if (state.resolvedSystem === "coc6") return "6版NPC";
  return "汎用NPC";
}

function formatDamageCommand(damage) {
  if (!damage) return "";
  let d = String(damage).replace(/DB/g, "{DB}").replace(/\s+/g, "").trim();
  let label = "ダメージ";
  const note = d.match(/[（(]([^（）()]+)[）)]$/);
  if (note) {
    label = `ダメージ（${note[1]}）`;
    d = d.replace(/[（(][^（）()]+[）)]$/, "");
  }
  return `${d} 【${label}】`;
}

function generatePalette() {
  const prefix = commandPrefix();
  const lines = [];
  const combatLines = [];

  for (const row of state.combat) {
    const name = cleanTrailing(row.name);
    const value = cleanTrailing(row.value);
    const damage = cleanTrailing(row.damage);
    if (!name && !value && !damage) continue;
    if (value) combatLines.push(`${prefix}${value} 【${name}】`);
    else if (name) combatLines.push(name);
    if (damage) combatLines.push(formatDamageCommand(damage));
  }
  if (combatLines.length) lines.push("// ▼ 戦闘", ...combatLines);

  if (state.armor && state.armor.trim()) {
    if (lines.length) lines.push("");
    lines.push("// ▼ 装甲", state.armor.trim());
  }

  const skillLines = [];
  for (const skill of state.skills) {
    if (!skill.name || !skill.value) continue;
    skillLines.push(`${prefix}${skill.value} 【${skill.name}】`);
  }
  if (skillLines.length) {
    if (lines.length) lines.push("");
    lines.push("// ▼ 技能", ...skillLines);
  }

  const abilityLines = [];
  for (const ab of ABILITIES) {
    const value = state.abilities[ab];
    if (value !== undefined && value !== "") abilityLines.push(`${prefix}${value} 【${ab}】`);
  }
  if (abilityLines.length) {
    if (lines.length) lines.push("");
    lines.push("// ▼ 能力値", ...abilityLines);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function toNumberOrString(value) {
  const s = String(value ?? "").trim();
  if (s === "") return "";
  const n = Number(s);
  return Number.isFinite(n) && /^-?\d+(?:\.\d+)?$/.test(s) ? n : s;
}

function getDisplayName() {
  const name = String(state.name || "NPC").trim();
  const title = String(state.title || "").trim();
  return title ? `${name} / ${title}` : name;
}

function generateJson(commands) {
  const status = [];
  if (state.status.hp !== "") status.push({ label: "HP", value: toNumberOrString(state.status.hp), max: toNumberOrString(state.status.hp) });
  if (state.status.mp !== "") status.push({ label: "MP", value: toNumberOrString(state.status.mp), max: toNumberOrString(state.status.mp) });
  if (state.status.san !== "") status.push({ label: "SAN", value: toNumberOrString(state.status.san), max: toNumberOrString(state.status.san) });

  const params = [];
  for (const ab of ABILITIES) {
    if (state.abilities[ab] !== undefined && state.abilities[ab] !== "") {
      params.push({ label: ab, value: String(state.abilities[ab]) });
    }
  }
  if (state.status.db !== "") params.push({ label: "DB", value: String(state.status.db) });
  if (state.status.build !== "") params.push({ label: "ビルド", value: String(state.status.build) });
  if (state.status.move !== "") params.push({ label: "移動", value: String(state.status.move) });

  const dex = Number(state.abilities.DEX);
  const data = {
    kind: "character",
    data: {
      name: getDisplayName(),
      initiative: Number.isFinite(dex) ? dex : 0,
      memo: state.memo || state.name || "NPC",
      status,
      params,
      commands
    }
  };
  return JSON.stringify(data, null, 2);
}

function renderCombatRows() {
  const body = $("combatBody");
  body.innerHTML = "";
  state.combat.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${escapeHtml(row.name || "")}" data-combat-index="${idx}" data-combat-field="name"></td>
      <td class="combat-rate"><input value="${escapeHtml(row.value || "")}" data-combat-index="${idx}" data-combat-field="value"></td>
      <td class="combat-damage"><input value="${escapeHtml(row.damage || "")}" data-combat-index="${idx}" data-combat-field="damage"></td>
      <td class="del"><button type="button" class="small-btn" data-delete-combat="${idx}">×</button></td>`;
    body.appendChild(tr);
  });
}

function renderSkillRows() {
  const body = $("skillBody");
  body.innerHTML = "";
  state.skills.forEach((row, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${escapeHtml(row.name || "")}" data-skill-index="${idx}" data-skill-field="name"></td>
      <td class="skill-value"><input value="${escapeHtml(row.value || "")}" data-skill-index="${idx}" data-skill-field="value"></td>
      <td class="del"><button type="button" class="small-btn" data-delete-skill="${idx}">×</button></td>`;
    body.appendChild(tr);
  });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function syncStateToForm() {
  $("npcName").value = state.name || "";
  $("npcTitle").value = state.title || "";
  $("systemMode").value = state.systemMode || "auto";
  $("resolvedSystem").value = systemLabel();
  $("systemBadge").textContent = `自動判定: ${systemLabel()}`;
  $("npcTabName").textContent = getDisplayName() || "NPC";
  for (const [key, value] of Object.entries(state.status)) {
    const el = document.querySelector(`[data-status="${key}"]`);
    if (el) el.value = value || "";
  }
  for (const ab of ABILITIES) {
    const el = document.querySelector(`[data-ability="${ab}"]`);
    if (el) el.value = state.abilities[ab] || "";
  }
  $("armorText").value = state.armor || "";
  $("memoText").value = state.memo || state.name || "";
  renderCombatRows();
  renderSkillRows();
}

function syncFormToState(eventTarget) {
  if (!eventTarget) return;
  if (eventTarget.id === "npcName") {
    const oldMemo = state.memo;
    state.name = eventTarget.value;
    if (!oldMemo || oldMemo === $("memoText").defaultValue || oldMemo === state.memo) {
      // Preserve manual memo edits where possible; default safety value remains name on parse.
    }
  }
  if (eventTarget.id === "npcTitle") state.title = eventTarget.value;
  if (eventTarget.id === "systemMode") {
    state.systemMode = eventTarget.value;
    state.resolvedSystem = detectSystem(state, $("rawInput").value || "");
  }
  if (eventTarget.dataset.status) state.status[eventTarget.dataset.status] = eventTarget.value;
  if (eventTarget.dataset.ability) state.abilities[eventTarget.dataset.ability] = eventTarget.value;
  if (eventTarget.id === "armorText") state.armor = eventTarget.value;
  if (eventTarget.id === "memoText") state.memo = eventTarget.value;
  if (eventTarget.dataset.combatIndex) {
    const i = Number(eventTarget.dataset.combatIndex);
    const f = eventTarget.dataset.combatField;
    state.combat[i][f] = eventTarget.value;
  }
  if (eventTarget.dataset.skillIndex) {
    const i = Number(eventTarget.dataset.skillIndex);
    const f = eventTarget.dataset.skillField;
    state.skills[i][f] = eventTarget.value;
  }
}

function refreshOutputs({ regeneratePalette = true } = {}) {
  state.resolvedSystem = detectSystem(state, $("rawInput").value || "");
  $("resolvedSystem").value = systemLabel();
  $("systemBadge").textContent = `${state.systemMode === "auto" ? "自動判定" : "指定"}: ${systemLabel()}`;
  $("npcTabName").textContent = getDisplayName() || "NPC";
  if (regeneratePalette) {
    state.paletteManuallyEdited = false;
    $("paletteOutput").value = generatePalette();
  }
  $("jsonOutput").value = generateJson($("paletteOutput").value);
  syncRightJsonPanelHeight();
}

function applyParsed(parsed) {
  Object.assign(state, parsed);
  state.systemMode = $("systemMode").value || "auto";
  state.resolvedSystem = detectSystem(state, $("rawInput").value || "");
  state.memo = state.name || "NPC";
  syncStateToForm();
  refreshOutputs({ regeneratePalette: true });
}

function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => showToast(`${label}をコピーしました`)).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast(`${label}をコピーしました`);
  });
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function getFlexGapPx(el) {
  if (!el) return 0;
  const style = getComputedStyle(el);
  return parseFloat(style.rowGap || style.gap || "0") || 0;
}

function syncRightJsonPanelHeight() {
  const mq = window.matchMedia("(min-width: 1181px)");
  const middleCard = document.querySelector(".middle-col > .card");
  const rightCol = document.querySelector(".right-col");
  const chatCard = $("chatPaletteCard");
  const jsonCard = $("jsonCard");
  const jsonOutput = $("jsonOutput");

  if (!jsonCard || !jsonOutput) return;

  if (!mq.matches) {
    jsonCard.style.removeProperty("height");
    jsonOutput.style.removeProperty("height");
    document.documentElement.style.removeProperty("--json-card-height");
    document.documentElement.style.removeProperty("--json-output-height");
    return;
  }

  requestAnimationFrame(() => {
    const middleHeight = middleCard?.offsetHeight || 0;
    const chatHeight = chatCard?.offsetHeight || 0;
    const gap = getFlexGapPx(rightCol);
    if (!middleHeight || !chatHeight) return;

    const jsonCardHeight = Math.max(260, Math.floor(middleHeight - chatHeight - gap));
    jsonCard.style.height = `${jsonCardHeight}px`;
    document.documentElement.style.setProperty("--json-card-height", `${jsonCardHeight}px`);

    const head = jsonCard.querySelector(".card-head");
    const body = jsonCard.querySelector(".card-body");
    const note = jsonCard.querySelector(".output-note");
    const bodyStyle = body ? getComputedStyle(body) : null;
    const noteStyle = note ? getComputedStyle(note) : null;
    const bodyPadding = bodyStyle ? (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0) : 0;
    const noteMargin = noteStyle ? (parseFloat(noteStyle.marginTop) || 0) + (parseFloat(noteStyle.marginBottom) || 0) : 0;
    const fixed = (head?.offsetHeight || 0) + bodyPadding + (note?.offsetHeight || 0) + noteMargin;
    const jsonOutputHeight = Math.max(180, Math.floor(jsonCardHeight - fixed));
    jsonOutput.style.height = `${jsonOutputHeight}px`;
    document.documentElement.style.setProperty("--json-output-height", `${jsonOutputHeight}px`);
  });
}

function fitLeftColumnHeight() {
  const mq = window.matchMedia("(min-width: 1181px)");
  const leftCol = document.querySelector(".col:first-child");
  const inputCard = leftCol?.querySelector(".card:first-child");
  const inputHead = inputCard?.querySelector(".card-head");
  const inputBody = inputCard?.querySelector(".card-body");
  const usageCard = $("usageCard");
  const raw = $("rawInput");
  const actions = inputCard?.querySelector(".actions");
  const hint = inputCard?.querySelector(".hint");
  if (!leftCol || !inputCard || !inputHead || !inputBody || !usageCard || !raw || !actions || !hint) return;

  const palette = $("paletteOutput");
  const chatCard = $("chatPaletteCard");

  if (!mq.matches) {
    raw.style.removeProperty("height");
    inputCard.style.removeProperty("height");
    if (palette) palette.style.removeProperty("height");
    if (chatCard) chatCard.style.removeProperty("height");
    syncRightJsonPanelHeight();
    document.documentElement.style.removeProperty("--left-input-height");
    document.documentElement.style.removeProperty("--left-input-card-height");
    document.documentElement.style.removeProperty("--palette-output-height");
    document.documentElement.style.removeProperty("--chat-palette-card-height");
    return;
  }

  requestAnimationFrame(() => {
    const colStyle = getComputedStyle(leftCol);
    const gap = parseFloat(colStyle.rowGap || colStyle.gap || "0") || 0;
    const leftHeight = leftCol.clientHeight;
    const usageHeight = usageCard.offsetHeight;

    const inputCardHeight = Math.max(260, Math.floor(leftHeight - usageHeight - gap));
    inputCard.style.height = `${inputCardHeight}px`;
    document.documentElement.style.setProperty("--left-input-card-height", `${inputCardHeight}px`);

    const bodyStyle = getComputedStyle(inputBody);
    const bodyPadding = (parseFloat(bodyStyle.paddingTop) || 0) + (parseFloat(bodyStyle.paddingBottom) || 0);
    const actionsStyle = getComputedStyle(actions);
    const hintStyle = getComputedStyle(hint);
    const actionsMarginTop = parseFloat(actionsStyle.marginTop) || 0;
    const hintMarginTop = parseFloat(hintStyle.marginTop) || 0;
    const fixedInside = inputHead.offsetHeight + bodyPadding + actions.offsetHeight + actionsMarginTop + hint.offsetHeight + hintMarginTop;
    const rawHeight = Math.max(150, Math.floor(inputCardHeight - fixedInside));

    raw.style.height = `${rawHeight}px`;
    document.documentElement.style.setProperty("--left-input-height", `${rawHeight}px`);

    if (palette) {
      palette.style.height = `${rawHeight}px`;
      document.documentElement.style.setProperty("--palette-output-height", `${rawHeight}px`);
    }
    if (chatCard) {
      chatCard.style.height = `${inputCardHeight}px`;
      document.documentElement.style.setProperty("--chat-palette-card-height", `${inputCardHeight}px`);
    }
    syncRightJsonPanelHeight();
  });
}

function bindEvents() {
  $("parseBtn").addEventListener("click", () => applyParsed(parseNpcText($("rawInput").value)));
  $("sampleBtn").addEventListener("click", () => {
    $("rawInput").value = SAMPLE_TEXT;
    applyParsed(parseNpcText(SAMPLE_TEXT));
  });
  $("clearBtn").addEventListener("click", () => {
    $("rawInput").value = "";
    showToast("入力欄をクリアしました");
  });
  $("copyPaletteBtn").addEventListener("click", () => copyText($("paletteOutput").value, "チャットパレット"));
  $("copyJsonBtn").addEventListener("click", () => copyText($("jsonOutput").value, "JSON"));
  $("themeBtn").addEventListener("click", () => {
    document.documentElement.classList.toggle("light");
    fitLeftColumnHeight();
  });
  $("usageJumpBtn").addEventListener("click", () => $("usageCard").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("shortcutBtn").addEventListener("click", () => showToast("Ctrl/Cmd+Enter: 解析 / Ctrl/Cmd+C: 各コピー欄の選択中テキストをコピー"));
  $("langBtn").addEventListener("click", () => showToast("JP / EN切替は今後実装予定です"));

  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "paletteOutput") {
      state.paletteManuallyEdited = true;
      refreshOutputs({ regeneratePalette: false });
      return;
    }
    if (t.closest && t.closest(".card-body")) {
      syncFormToState(t);
      refreshOutputs({ regeneratePalette: true });
    }
  });

  document.addEventListener("click", (e) => {
    const combatDel = e.target.dataset?.deleteCombat;
    const skillDel = e.target.dataset?.deleteSkill;
    if (combatDel !== undefined) {
      state.combat.splice(Number(combatDel), 1);
      renderCombatRows();
      refreshOutputs({ regeneratePalette: true });
    }
    if (skillDel !== undefined) {
      state.skills.splice(Number(skillDel), 1);
      renderSkillRows();
      refreshOutputs({ regeneratePalette: true });
    }
  });

  $("addCombatBtn").addEventListener("click", () => {
    state.combat.push({ name: "", value: "", damage: "", raw: false });
    renderCombatRows();
    syncRightJsonPanelHeight();
  });
  $("addSkillBtn").addEventListener("click", () => {
    state.skills.push({ name: "", value: "" });
    renderSkillRows();
    syncRightJsonPanelHeight();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      applyParsed(parseNpcText($("rawInput").value));
    }
  });

  window.addEventListener("resize", fitLeftColumnHeight);
}


function init() {
  $("rawInput").value = SAMPLE_TEXT;
  bindEvents();
  applyParsed(parseNpcText(SAMPLE_TEXT));
  fitLeftColumnHeight();
  setTimeout(fitLeftColumnHeight, 50);
}


document.addEventListener("DOMContentLoaded", init);
