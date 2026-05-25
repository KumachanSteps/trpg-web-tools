const DEFAULT_PROFILE_TEXT = [
  "職業: 未取得",
  "年齢: 未取得 / 性別: 未取得",
  "身長: 未取得 / 体重: 未取得",
  "カラーコード: #008080"
].join("\n");

const state = {
  data: null,
  edition: "",
  paletteText: "",
  generatedMemo: "",
  generatedJson: "",
  txtText: "",
  txtData: null,
  options: {
    includeWeapons: true,
    includeItems: true,
    includeKnowledge: true,
    includeTxtMemo: true,
    formatPalette: true
  }
};

const $ = (id) => document.getElementById(id);

function init() {
  bindEvents();
  updateAll();
}

function bindEvents() {
  $("jsonInput").addEventListener("input", updateAll);
  $("manualProfile").addEventListener("input", updateAll);
  $("memoEditor").addEventListener("input", updateGeneratedJsonOnly);
  $("themeToggle").addEventListener("click", toggleTheme);
  $("languageToggle").addEventListener("click", toggleLanguage);
  $("helpToggle").addEventListener("click", () => togglePanel("helpPanel"));
  $("shortcutToggle").addEventListener("click", () => togglePanel("shortcutPanel"));
  $("openTxtButton").addEventListener("click", () => $("txtFileInput").click());
  $("resetTxtButton").addEventListener("click", resetTxtFile);
  $("txtFileInput").addEventListener("change", handleTxtFileSelect);
  $("regenMemoButton").addEventListener("click", regenerateMemo);
  $("copyMemoButton").addEventListener("click", () => copyText($("memoEditor").value, "メモ"));
  $("copyPaletteButton").addEventListener("click", () => copyText($("palettePreview").value, "パレット"));
  $("copyJsonButton").addEventListener("click", () => copyText($("generatedJson").value, "駒JSON"));
  $("clearButton").addEventListener("click", clearAll);
  document.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => toggleOption(button));
  });
  document.addEventListener("keydown", handleKeydown);
}

function toggleLanguage() {
  const next = window.CharamemoLanguage ? window.CharamemoLanguage.toggle() : "ja";
  setStatus(`Language: ${next.toUpperCase()}`);
}

function togglePanel(id) {
  const target = $(id);
  const other = id === "helpPanel" ? $("shortcutPanel") : $("helpPanel");
  other.classList.add("hidden");
  target.classList.toggle("hidden");
}

function closePanels() {
  $("helpPanel").classList.add("hidden");
  $("shortcutPanel").classList.add("hidden");
}

function toggleTheme() {
  document.body.classList.toggle("theme-light");
  document.body.classList.toggle("theme-night");
  const isLight = document.body.classList.contains("theme-light");
  $("themeToggle").textContent = isLight ? "☀ ライトモード" : "☾ ナイトモード";
}

function toggleOption(button) {
  const key = button.dataset.option;
  state.options[key] = !state.options[key];
  button.classList.toggle("active", state.options[key]);
  updateAll(false);
}

function handleKeydown(event) {
  if (event.key === "Escape") closePanels();
  if (event.altKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    toggleTheme();
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyText($("generatedJson").value, "駒JSON");
  }
}

function updateAll(clearEditedMemo = true) {
  const parsed = CharamemoParser.parseKomaJson($("jsonInput").value);
  updateError(parsed);
  state.data = parsed.ok ? parsed.data : null;
  if (clearEditedMemo) $("memoEditor").dataset.edited = "";
  const params = normalizeParams(state.data?.params || []);
  const commandText = String(state.data?.commands || "");
  const txtCommands = state.txtData ? buildCommandsFromTxtData(state.txtData) : "";
  const commandSource = commandText || txtCommands;
  state.edition = commandSource ? CharamemoParser.detectEdition(commandSource, params) : detectTxtEdition(state.txtData);
  state.paletteText = commandSource ? (state.options.formatPalette ? CharamemoParser.buildPaletteOutput(commandSource, state.edition) : CharamemoParser.normalizeText(commandSource)) : "";
  state.generatedMemo = buildMemo(state.data, $("manualProfile").value, state.options, state.txtData);
  if (!$("memoEditor").dataset.edited) $("memoEditor").value = state.generatedMemo;
  renderSummary();
  renderPalette();
  updateGeneratedJsonOnly();
}

function updateGeneratedJsonOnly() {
  const memo = $("memoEditor").value;
  if (document.activeElement === $("memoEditor")) $("memoEditor").dataset.edited = "1";
  state.generatedJson = generateKomaJson(state.data, memo, state.paletteText);
  $("generatedJson").value = state.generatedJson;
}

function updateError(parsed) {
  const errorBox = $("jsonError");
  if ($("jsonInput").value.trim() && !parsed.ok) {
    errorBox.textContent = `JSON解析エラー: ${parsed.error}`;
    errorBox.classList.remove("hidden");
  } else {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }
}

async function handleTxtFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = parseIacharaTxt(text);
    if (!parsed.found) {
      state.txtText = "";
      state.txtData = null;
      setTxtStatus("TXTの解析に失敗しました。いあきゃらTXT形式か確認してください。", "error");
      updateAll();
      return;
    }
    state.txtText = text;
    state.txtData = parsed;
    $("manualProfile").value = buildManualProfileFromTxt(parsed.profile);
    $("memoEditor").dataset.edited = "";
    setTxtStatus(`${file.name} を読み込みました。`, "info");
    updateAll();
  } catch (error) {
    state.txtText = "";
    state.txtData = null;
    setTxtStatus("TXTファイルの読み込みに失敗しました。", "error");
    updateAll();
  } finally {
    event.target.value = "";
  }
}

function resetTxtFile() {
  state.txtText = "";
  state.txtData = null;
  $("manualProfile").value = DEFAULT_PROFILE_TEXT;
  $("memoEditor").dataset.edited = "";
  setTxtStatus("いあきゃらTXT情報をリセットしました。", "info");
  updateAll();
}

function setTxtStatus(message, type = "info") {
  const status = $("txtLoadStatus");
  status.textContent = message;
  status.className = type === "error" ? "txt-load-status is-error" : "txt-load-status is-success";
}

function parseIacharaTxt(text) {
  const normalized = normalizeText(text);
  const sections = splitSections(normalized);
  const profile = parseBasicProfile(sections["基本情報"] || "");
  const abilities = parseAbilities(sections["能力値"] || "");
  const skills = parseSkills(sections["技能値"] || "");
  const icons = extractUrls(sections["アイコン"] || "");
  const found = Boolean(profile.name || profile.occupation || Object.keys(sections).length || skills.length || Object.keys(abilities).length);
  return { found, raw: normalized, sections, profile, abilities, skills, icons };
}

function splitSections(text) {
  const sections = {};
  let current = "";
  normalizeText(text).split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("【") && trimmed.endsWith("】")) {
      current = trimmed.slice(1, -1).trim();
      sections[current] = "";
    } else if (current) {
      sections[current] += line + "\n";
    }
  });
  return sections;
}

function parseBasicProfile(text) {
  const profile = {
    name: pickLineValue(text, "名前"),
    occupation: pickLineValue(text, "職業"),
    age: "",
    gender: "",
    height: "",
    weight: ""
  };
  normalizeText(text).split("\n").forEach((line) => {
    const normalized = line.replaceAll("：", ":");
    if (normalized.includes("年齢:")) profile.age = pickInlineValue(normalized, "年齢");
    if (normalized.includes("性別:")) profile.gender = pickInlineValue(normalized, "性別");
    if (normalized.includes("身長:")) profile.height = pickInlineValue(normalized, "身長");
    if (normalized.includes("体重:")) profile.weight = pickInlineValue(normalized, "体重");
  });
  return profile;
}

function pickLineValue(text, key) {
  const line = normalizeText(text).split("\n").find((row) => row.trim().replaceAll("：", ":").startsWith(`${key}:`));
  if (!line) return "";
  return line.replaceAll("：", ":").slice(key.length + 1).trim();
}

function pickInlineValue(line, key) {
  const index = line.indexOf(`${key}:`);
  if (index < 0) return "";
  const rest = line.slice(index + key.length + 1);
  const slash = rest.indexOf("/");
  return (slash >= 0 ? rest.slice(0, slash) : rest).trim();
}

function parseAbilities(text) {
  const abilities = {};
  normalizeText(text).split("\n").forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(STR|CON|POW|DEX|APP|SIZ|INT|EDU|HP|MP|SAN|IDE|幸運|知識)\s+([0-9]+)/i);
    if (match) abilities[match[1].toUpperCase ? match[1].toUpperCase() : match[1]] = match[2];
    if (trimmed.startsWith("現在SAN値")) {
      const sanMatch = trimmed.match(/現在SAN値\s+([0-9]+)/);
      if (sanMatch) abilities.SAN = sanMatch[1];
    }
  });
  return abilities;
}

function parseSkills(text) {
  const skills = [];
  normalizeText(text).split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("『") || trimmed.startsWith("技能名") || trimmed.includes("ポイント")) return;
    const match = trimmed.match(/^(.+?)\s+([0-9]+)\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+[0-9]+\s+[0-9]+\s*$/);
    if (!match) return;
    skills.push({ name: normalizeSkillNameForTxt(match[1].trim()), value: match[2] });
  });
  return skills;
}

function normalizeSkillNameForTxt(name) {
  return String(name || "").trim().replaceAll("（", "(").replaceAll("）", ")").replace(/\((.+?)\)/g, "：$1");
}

function extractUrls(text) {
  return normalizeText(text).split("\n").map((line) => line.trim().replace(/^:/, "")).filter((line) => line.startsWith("http"));
}

function buildManualProfileFromTxt(profile) {
  return [
    `職業: ${profile.occupation || "未取得"}`,
    `年齢: ${profile.age || "未取得"} / 性別: ${profile.gender || "未取得"}`,
    `身長: ${profile.height || "未取得"} / 体重: ${profile.weight || "未取得"}`,
    "カラーコード: #008080"
  ].join("\n");
}

function buildCommandsFromTxtData(txtData) {
  if (!txtData || !Array.isArray(txtData.skills)) return "";
  const command = detectTxtEdition(txtData) === "7e" ? "CC" : "CCB";
  const lines = [];
  if (txtData.abilities?.SAN) lines.push(`${command}<=${txtData.abilities.SAN} 【正気度ロール】`);
  if (txtData.abilities?.IDE) lines.push(`${command}<=${txtData.abilities.IDE} 【アイデア】`);
  if (txtData.abilities?.幸運) lines.push(`${command}<=${txtData.abilities.幸運} 【幸運】`);
  if (txtData.abilities?.知識) lines.push(`${command}<=${txtData.abilities.知識} 【知識】`);
  txtData.skills.forEach((skill) => lines.push(`${command}<=${skill.value} 【${skill.name}】`));
  return lines.join("\n");
}

function detectTxtEdition(txtData) {
  if (!txtData) return "";
  const header = txtData.raw.split("\n").slice(0, 3).join(" ");
  if (header.includes("7版")) return "7e";
  if (header.includes("6版")) return "6e";
  const bigStats = Object.values(txtData.abilities || {}).some((value) => Number(value) > 30);
  const has7eSkill = (txtData.skills || []).some((skill) => ["近接戦闘", "手さばき", "隠密", "鑑定", "自然", "サバイバル", "威圧", "魅惑"].some((word) => skill.name.includes(word)));
  return bigStats || has7eSkill ? "7e" : "6e";
}

function sectionText(txtData, sectionName) {
  if (!txtData?.sections?.[sectionName]) return "";
  return cleanSectionText(txtData.sections[sectionName]);
}

function cleanSectionText(text) {
  return normalizeText(text).split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

function renderSummary() {
  const data = state.data;
  const txt = state.txtData;
  $("summaryName").textContent = data?.name || txt?.profile?.name || "未解析";
  renderIcon(data?.iconUrl || txt?.icons?.[0] || "");
  renderEditionBadge(state.edition);
  renderSheetLink(data?.externalUrl || "");
  renderStatusChips(data?.status || statusFromTxt(txt));
  renderParams(data?.params || paramsFromTxt(txt));
}

function statusFromTxt(txtData) {
  if (!txtData?.abilities) return [];
  return ["HP", "MP", "SAN", "幸運"].filter((key) => txtData.abilities[key]).map((key) => ({ label: key, value: txtData.abilities[key] }));
}

function paramsFromTxt(txtData) {
  if (!txtData?.abilities) return [];
  return ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].filter((key) => txtData.abilities[key]).map((key) => ({ label: key, value: txtData.abilities[key] }));
}

function renderIcon(iconUrl) {
  const box = $("summaryIcon");
  box.innerHTML = "";
  if (iconUrl) {
    const img = document.createElement("img");
    img.src = iconUrl;
    img.alt = "character icon";
    box.appendChild(img);
    box.classList.add("has-image");
  } else {
    const span = document.createElement("span");
    span.className = "icon-placeholder";
    span.textContent = "▧";
    box.appendChild(span);
    box.classList.remove("has-image");
  }
}

function renderEditionBadge(edition) {
  const badge = $("editionBadge");
  badge.className = "edition-badge";
  if (edition === "6e") {
    badge.classList.add("edition-6");
    badge.textContent = "6版";
  } else if (edition === "7e") {
    badge.classList.add("edition-7");
    badge.textContent = "7版";
  } else {
    badge.classList.add("edition-empty");
    badge.textContent = "未判定";
  }
}

function renderSheetLink(url) {
  const badge = $("sheetLinkBadge");
  const parent = badge.parentElement;
  const replacement = url ? document.createElement("a") : document.createElement("span");
  replacement.id = "sheetLinkBadge";
  replacement.className = url ? "sheet-link-badge" : "sheet-link-badge is-disabled";
  replacement.textContent = url ? "🔗 キャラシリンク" : "🔗 未検出";
  if (url) {
    replacement.href = url;
    replacement.target = "_blank";
    replacement.rel = "noreferrer";
  }
  parent.replaceChild(replacement, badge);
}

function renderStatusChips(status) {
  const box = $("statusChips");
  box.innerHTML = "";
  const rows = Array.isArray(status) ? status.slice(0, 4) : [];
  rows.forEach((item) => {
    const span = document.createElement("span");
    span.textContent = `${item.label || "-"} ${currentValue(item)}`;
    box.appendChild(span);
  });
}

function renderParams(params) {
  const box = $("paramsGrid");
  box.innerHTML = "";
  const rows = Array.isArray(params) ? params : [];
  rows.forEach((item) => {
    const div = document.createElement("div");
    div.className = "param-chip";
    const label = document.createElement("span");
    label.textContent = item.label || "-";
    const value = document.createElement("strong");
    value.textContent = currentValue(item);
    div.append(label, value);
    box.appendChild(div);
  });
}

function renderPalette() {
  $("palettePreview").value = state.paletteText;
  $("editionStatus").textContent = `自動判定: ${state.edition ? CharamemoParser.editionLabel(state.edition) : "未判定"}`;
}

function normalizeParams(params) {
  const result = {};
  if (!Array.isArray(params)) return result;
  params.forEach((item) => {
    if (!item || !item.label) return;
    result[item.label] = currentValue(item);
  });
  return result;
}

function currentValue(item) {
  if (!item || typeof item !== "object") return "-";
  return item.value ?? item.current ?? item.max ?? "-";
}

function buildMemo(data, manualProfile, options, txtData) {
  if (!data && !txtData) return "";
  const parts = [];
  const name = data?.name || txtData?.profile?.name || "";
  parts.push(`名前: ${name}\n${manualProfile}`.trim());
  if (options.includeWeapons) parts.push(buildSectionBlock("戦闘・武器・防具", sectionText(txtData, "戦闘・武器・防具"), "※ いあきゃらTXTやキャラシ情報から追記してください。"));
  if (options.includeItems) parts.push(buildSectionBlock("所持品", sectionText(txtData, "所持品"), "※ いあきゃらTXTやキャラシ情報から追記してください。"));
  if (options.includeKnowledge) parts.push(buildSectionBlock("新たに得た知識・経験", sectionText(txtData, "通過したシナリオ名"), "※ 通過シナリオや成長メモを追記してください。"));
  if (options.includeTxtMemo) parts.push(buildSectionBlock("TXT内メモ", sectionText(txtData, "メモ"), "※ TXT内メモがある場合はここへ反映してください。"));
  if (data?.memo) parts.push(`【既存メモ】\n${data.memo}`);
  return parts.filter(Boolean).join("\n\n");
}

function buildSectionBlock(label, content, fallback) {
  return `【${label}】\n${content || fallback}`;
}

function generateKomaJson(data, memo, commands) {
  if (!data) return "";
  return JSON.stringify({ kind: "character", data: { ...data, memo, commands } });
}

function regenerateMemo() {
  $("memoEditor").dataset.edited = "";
  $("memoEditor").value = state.generatedMemo;
  updateGeneratedJsonOnly();
}

function clearAll() {
  $("jsonInput").value = "";
  $("memoEditor").value = "";
  $("memoEditor").dataset.edited = "";
  resetTxtFile();
  setStatus("入力欄をクリアしました。", "info");
}

async function copyText(text, label) {
  if (!text) {
    setStatus("コピーする内容がありません。", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`${label}をコピーしました。`, "info");
  } catch (error) {
    fallbackCopyText(text);
    setStatus(`${label}を選択コピー用に準備しました。`, "info");
  }
}

function fallbackCopyText(text) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  try { document.execCommand("copy"); } catch (error) { console.warn(error); }
  temp.remove();
}

function setStatus(message, type = "info") {
  const status = $("statusMessage");
  status.textContent = message;
  status.style.color = type === "error" ? "#fecaca" : "#6ee7b7";
  if (message) window.setTimeout(() => { if (status.textContent === message) status.textContent = ""; }, 2600);
}

document.addEventListener("DOMContentLoaded", init);
