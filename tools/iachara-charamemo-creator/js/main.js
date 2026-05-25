(() => {
  const NL = "\n";
  const state = {
    theme: "night",
    includeWeapons: true,
    includeItems: true,
    includeKnowledgeExperience: true,
    includeTxtMemo: true,
    formatPalette: true,
    parsedJson: { ok: false, error: "" },
    parsedTxt: emptyTxtResult(),
    memoTouched: false,
    paletteTouched: false,
    generatedJson: ""
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", () => {
    bindElements();
    bindEvents();
    restoreTheme();
    render();
  });

  function bindElements() {
    el.appShell = document.getElementById("appShell");
    el.themeToggle = document.getElementById("themeToggle");
    el.languageToggle = document.getElementById("languageToggle");
    el.usageToggle = document.getElementById("usageToggle");
    el.shortcutToggle = document.getElementById("shortcutToggle");
    el.usagePanel = document.getElementById("usagePanel");
    el.shortcutPanel = document.getElementById("shortcutPanel");

    el.komaJsonInput = document.getElementById("komaJsonInput");
    el.jsonError = document.getElementById("jsonError");

    el.txtFileBtn = document.getElementById("txtFileBtn");
    el.txtFileInput = document.getElementById("txtFileInput");
    el.txtClearBtn = document.getElementById("txtClearBtn");
    el.iacharaTxtInput = document.getElementById("iacharaTxtInput");
    el.txtMessage = document.getElementById("txtMessage");

    el.includeWeaponsToggle = document.getElementById("includeWeaponsToggle");
    el.includeItemsToggle = document.getElementById("includeItemsToggle");
    el.includeKnowledgeExperienceToggle = document.getElementById("includeKnowledgeExperienceToggle");
    el.includeTxtMemoToggle = document.getElementById("includeTxtMemoToggle");
    el.formatPaletteToggle = document.getElementById("formatPaletteToggle");

    el.iconPreview = document.getElementById("iconPreview");
    el.iconPlaceholder = document.getElementById("iconPlaceholder");
    el.characterNameView = document.getElementById("characterNameView");
    el.editionBadge = document.getElementById("editionBadge");
    el.externalUrlSummary = document.getElementById("externalUrlSummary");
    el.statusChips = document.getElementById("statusChips");
    el.paramsGrid = document.getElementById("paramsGrid");

    el.regenerateMemoBtn = document.getElementById("regenerateMemoBtn");
    el.copyMemoBtn = document.getElementById("copyMemoBtn");
    el.memoEditor = document.getElementById("memoEditor");

    el.regeneratePaletteBtn = document.getElementById("regeneratePaletteBtn");
    el.palettePreview = document.getElementById("palettePreview");
    el.editionView = document.getElementById("editionView");
    el.copyPaletteBtn = document.getElementById("copyPaletteBtn");

    el.generatedJson = document.getElementById("generatedJson");
    el.copyJsonBtn = document.getElementById("copyJsonBtn");
    el.clearInputBtn = document.getElementById("clearInputBtn");
    el.statusMessage = document.getElementById("statusMessage");
  }

  function bindEvents() {
    el.komaJsonInput.addEventListener("input", () => {
      state.memoTouched = false;
      state.paletteTouched = false;
      render();
    });

    el.iacharaTxtInput.addEventListener("input", () => {
      state.memoTouched = false;
      state.paletteTouched = false;
      el.txtMessage.textContent = "";
      render();
    });

    el.txtFileBtn.addEventListener("click", () => el.txtFileInput.click());
    el.txtFileInput.addEventListener("change", handleTxtFile);

    el.txtClearBtn.addEventListener("click", () => {
      el.iacharaTxtInput.value = "";
      el.txtFileInput.value = "";
      state.memoTouched = false;
      state.paletteTouched = false;
      el.txtMessage.textContent = "TXT入力をクリアしました";
      render();
    });

    bindToggle(el.includeWeaponsToggle, "includeWeapons", render);
    bindToggle(el.includeItemsToggle, "includeItems", render);
    bindToggle(el.includeKnowledgeExperienceToggle, "includeKnowledgeExperience", render);
    bindToggle(el.includeTxtMemoToggle, "includeTxtMemo", render);
    bindToggle(el.formatPaletteToggle, "formatPalette", () => {
      state.paletteTouched = false;
      render();
    });

    el.memoEditor.addEventListener("input", () => {
      state.memoTouched = true;
      renderGeneratedOnly();
    });

    el.palettePreview.addEventListener("input", () => {
      state.paletteTouched = true;
      renderGeneratedOnly();
    });

    el.regenerateMemoBtn.addEventListener("click", () => {
      el.memoEditor.value = generateMemo();
      state.memoTouched = true;
      renderGeneratedOnly();
    });

    el.regeneratePaletteBtn.addEventListener("click", () => {
      el.palettePreview.value = generatePalette();
      state.paletteTouched = true;
      renderGeneratedOnly();
    });

    el.copyMemoBtn.addEventListener("click", () => copyText(el.memoEditor.value, "メモ"));
    el.copyPaletteBtn.addEventListener("click", () => copyText(el.palettePreview.value, "チャットパレット"));
    el.copyJsonBtn.addEventListener("click", () => copyText(state.generatedJson, "生成駒JSONデータ"));
    el.clearInputBtn.addEventListener("click", clearAll);

    el.themeToggle.addEventListener("click", toggleTheme);
    el.usageToggle.addEventListener("click", () => toggleInfoPanel(el.usagePanel));
    el.shortcutToggle.addEventListener("click", () => toggleInfoPanel(el.shortcutPanel));
    el.languageToggle.addEventListener("click", toggleLanguageLabel);

    document.addEventListener("keydown", (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        el.usagePanel.classList.add("hidden");
        el.shortcutPanel.classList.add("hidden");
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyText(state.generatedJson, "生成駒JSONデータ");
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        clearAll();
      }
    });
  }

  function bindToggle(button, key, afterChange) {
    button.addEventListener("click", () => {
      state[key] = !state[key];
      renderSwitch(button, state[key]);
      if (afterChange) afterChange();
    });
  }

  function renderSwitch(button, active) {
    button.classList.toggle("is-active", active);
    const track = button.querySelector(".switch-track");
    if (track) track.classList.toggle("is-on", active);
  }

  async function handleTxtFile() {
    const file = el.txtFileInput.files && el.txtFileInput.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      el.txtMessage.textContent = ".txtファイルを選択してください";
      return;
    }
    const text = await file.text();
    el.iacharaTxtInput.value = text;
    state.memoTouched = false;
    state.paletteTouched = false;
    el.txtMessage.textContent = `${file.name} を読み込みました`;
    render();
  }

  function render() {
    state.parsedJson = parseKomaJson(el.komaJsonInput.value);
    state.parsedTxt = parseIacharaTxt(el.iacharaTxtInput.value);
    renderError();
    renderSummary();
    renderMemo();
    renderPalette();
    renderGeneratedOnly();
  }

  function renderError() {
    const hasInput = el.komaJsonInput.value.trim().length > 0;
    const shouldShow = hasInput && state.parsedJson && !state.parsedJson.ok;
    el.jsonError.classList.toggle("hidden", !shouldShow);
    el.jsonError.textContent = shouldShow ? `JSON解析エラー: ${state.parsedJson.error}` : "";
  }

  function currentData() {
    return state.parsedJson.ok ? state.parsedJson.data : createKomaDataFromTxt(state.parsedTxt);
  }

  function renderSummary() {
    const data = currentData();
    const txt = state.parsedTxt;
    const iconUrl = txt.icons[0] || data?.iconUrl || "";
    const name = txt.profile.name || data?.name || "未解析";
    const subline = data?.externalUrl || (txt.found ? "いあきゃらTXTから解析" : "externalUrl 未検出");
    const edition = detectEdition();

    el.characterNameView.textContent = name;
    el.externalUrlSummary.textContent = subline;

    el.iconPreview.removeAttribute("src");
    el.iconPreview.parentElement.classList.remove("has-image");
    if (iconUrl) {
      el.iconPreview.src = iconUrl;
      el.iconPreview.parentElement.classList.add("has-image");
    }

    if (edition) {
      el.editionBadge.textContent = edition === "7e" ? "7版" : "6版";
      el.editionBadge.className = `edition-badge ${edition === "7e" ? "edition-7e" : "edition-6e"}`;
      el.editionBadge.classList.remove("hidden");
    } else {
      el.editionBadge.className = "edition-badge hidden";
      el.editionBadge.textContent = "";
    }

    renderStatusChips(data, txt);
    renderParams(data, txt);
  }

  function renderStatusChips(data, txt) {
    const status = getStatusCards(data, txt);
    el.statusChips.innerHTML = "";
    const displayStatus = status.length ? status : [
      { label: "HP", value: "--" },
      { label: "MP", value: "--" },
      { label: "SAN", value: "--" },
      { label: "幸運", value: "--" }
    ];
    for (const item of displayStatus) {
      const chip = document.createElement("span");
      chip.className = "status-chip";
      chip.textContent = `${item.label} ${item.value}`;
      el.statusChips.appendChild(chip);
    }
  }

  function renderParams(data, txt) {
    const params = getParamCards(data, txt);
    el.paramsGrid.innerHTML = "";
    const displayParams = params.length ? params : [
      { label: "STR", value: "--" },
      { label: "CON", value: "--" },
      { label: "POW", value: "--" },
      { label: "DEX", value: "--" },
      { label: "APP", value: "--" },
      { label: "SIZ", value: "--" },
      { label: "INT", value: "--" },
      { label: "EDU", value: "--" }
    ];
    for (const item of displayParams) {
      const chip = document.createElement("div");
      chip.className = "param-chip";
      chip.innerHTML = `<span class="param-label">${escapeHtml(item.label)}</span><span class="param-value">${escapeHtml(item.value)}</span>`;
      el.paramsGrid.appendChild(chip);
    }
  }

  function renderMemo() {
    if (!state.memoTouched) el.memoEditor.value = generateMemo();
  }

  function renderPalette() {
    if (!state.paletteTouched) el.palettePreview.value = generatePalette();
    const edition = detectEdition();
    el.editionView.textContent = `自動判定: ${edition ? editionLabel(edition) : "未判定"}`;
  }

  function renderGeneratedOnly() {
    const data = currentData();
    state.generatedJson = generateKomaJson(data);
    if (el.generatedJson) el.generatedJson.value = state.generatedJson;
  }

  function generateMemo() {
    const data = currentData();
    const txt = state.parsedTxt;
    if (!data && !txt.found) return "";

    const parts = [];
    const profileLines = buildProfileLines(data, txt);
    if (profileLines.length) parts.push(["【プロフィール】", ...profileLines].join(NL));
    if (state.includeWeapons && txt.weapons.length) parts.push(["【戦闘・武器・防具】", ...txt.weapons].join(NL));
    if (state.includeItems && txt.items.length) parts.push(["【所持品】", ...txt.items].join(NL));
    if (state.includeKnowledgeExperience && txt.scenarioHistory) parts.push(["【新たに得た知識・経験】", txt.scenarioHistory].join(NL));
    if (txt.backstory) parts.push(["【バックストーリー】", txt.backstory].join(NL));
    if (state.includeTxtMemo && txt.memo) parts.push(["【メモ】", txt.memo].join(NL));
    if (data?.memo && !txt.memo.includes(data.memo)) parts.push(["【既存駒メモ】", data.memo].join(NL));
    return parts.filter(Boolean).join(NL + NL);
  }

  function generatePalette() {
    const data = state.parsedJson.ok ? state.parsedJson.data : null;
    const source = data?.commands || buildCommandsFromIacharaTxt(state.parsedTxt);
    if (!source) return "";
    if (!state.formatPalette) return normalizeText(source);
    return formatCommands(source, detectEdition());
  }

  function generateKomaJson(data) {
    if (!data) return "";
    const nextData = { ...data };
    nextData.memo = el.memoEditor.value;
    nextData.commands = el.palettePreview.value;
    if (state.parsedTxt.icons[0]) nextData.iconUrl = state.parsedTxt.icons[0];
    return JSON.stringify({ kind: "character", data: nextData });
  }

  function parseKomaJson(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return { ok: false, error: "" };
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || parsed.kind !== "character" || !parsed.data || typeof parsed.data !== "object") {
        return { ok: false, error: "kind:'character' と data を持つCCFOLIA駒JSONではありません" };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : "JSONを解析できませんでした" };
    }
  }

  function parseIacharaTxt(text) {
    const src = normalizeText(text);
    const sections = splitSections(src);
    const profile = parseProfile(sections["基本情報"] || "");
    const icons = extractUrls(sections["アイコン"] || "");
    const abilities = parseAbilities(sections["能力値"] || "");
    const skills = parseSkills(sections["技能値"] || "");
    const weapons = parseSimpleList(sections["戦闘・武器・防具"] || "");
    const items = parseItemsFromText(sections["所持品"] || "", sections["メモ"] || "");
    const backstory = cleanupBlock(sections["バックストーリー"] || "");
    const scenarioHistory = cleanupBlock(sections["通過したシナリオ名"] || "");
    const memo = cleanupBlock(sections["メモ"] || "");
    const edition = detectEditionFromRawTxt(src);
    const found = Boolean(profile.name || icons.length || Object.keys(abilities).length || skills.length || weapons.length || items.length || backstory || scenarioHistory || memo);
    return { found, raw: src, edition, profile, icons, abilities, skills, weapons, items, backstory, scenarioHistory, memo, sections };
  }

  function emptyTxtResult() {
    return { found: false, raw: "", edition: "", profile: {}, icons: [], abilities: {}, skills: [], weapons: [], items: [], backstory: "", scenarioHistory: "", memo: "", sections: {} };
  }

  function splitSections(text) {
    const sections = {};
    let current = "";
    for (const line of normalizeText(text).split(NL)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("【") && trimmed.endsWith("】") && trimmed.length > 2) {
        current = trimmed.slice(1, -1).trim();
        sections[current] = "";
        continue;
      }
      if (current) sections[current] += line + NL;
    }
    return sections;
  }

  function parseProfile(text) {
    const name = pickLineValue(text, "名前");
    const tag = pickLineValue(text, "タグ");
    const occupation = pickLineValue(text, "職業");
    const birthday = pickLineValue(text, "誕生日");
    const ageGenderHeight = findLine(text, "年齢");
    const weightOrigin = findLine(text, "体重");
    const appearanceLine = findLine(text, "髪の色");
    return {
      name,
      tag,
      occupation,
      birthday,
      age: pickInline(ageGenderHeight, "年齢"),
      gender: pickInline(ageGenderHeight, "性別"),
      height: pickInline(ageGenderHeight, "身長"),
      weight: pickInline(weightOrigin, "体重"),
      origin: pickInline(weightOrigin, "出身"),
      hair: pickInline(appearanceLine, "髪の色"),
      eyes: pickInline(appearanceLine, "瞳の色"),
      skin: pickInline(appearanceLine, "肌の色")
    };
  }

  function parseAbilities(text) {
    const result = {};
    const names = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU", "HP", "MP", "SAN", "IDE", "幸運", "知識"];
    for (const line of normalizeText(text).split(NL)) {
      const trimmed = line.trim();
      const name = names.find((key) => trimmed.startsWith(key));
      if (!name) continue;
      const tokens = trimmed.slice(name.length).trim().split(/\s+/).filter(Boolean);
      if (tokens[0]) result[name] = tokens[0];
    }
    const sanLine = normalizeText(text).split(NL).find((line) => line.includes("現在SAN値")) || "";
    const sanParts = sanLine.replace("現在SAN値", "").trim().split("/").map((part) => part.trim()).filter(Boolean);
    if (sanParts[0]) result.SAN = sanParts[0];
    return result;
  }

  function parseSkills(text) {
    const skills = [];
    let currentCategory = "";
    for (const rawLine of normalizeText(text).split(NL)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("『") && line.endsWith("』")) {
        currentCategory = line.slice(1, -1).trim();
        continue;
      }
      if (line.startsWith("技能名") || line.includes("職業ポイント") || line.includes("興味ポイント")) continue;
      const parsed = parseSkillTableLine(line);
      if (parsed) skills.push({ ...parsed, category: currentCategory });
    }
    return skills;
  }

  function parseSkillTableLine(line) {
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return null;
    const numericStart = tokens.findIndex((token) => isNumericToken(token));
    if (numericStart <= 0) return null;
    const name = cleanupValue(tokens.slice(0, numericStart).join(" "));
    const value = tokens[numericStart];
    if (!name || !value) return null;
    return { name: normalizeSkillNameForPalette(name), value };
  }

  function isNumericToken(token) {
    const text = String(token || "").trim();
    if (!text) return false;
    return text.split("").every((char) => char >= "0" && char <= "9");
  }

  function parseItemsFromText(itemSection, memoSection) {
    const source = [itemSection, extractMarkedSubsection(memoSection, "所持品")].filter(Boolean).join(NL);
    return parseSimpleList(source).filter((line) => !line.includes("名称") && !line.includes("単価") && !line.includes("現在の所持金") && !line.includes("借金"));
  }

  function parseSimpleList(text) {
    return normalizeText(text)
      .split(NL)
      .map((line) => line.trim())
      .filter((line) => line && !isDividerLine(line) && !line.includes("名前                        成功率"))
      .slice(0, 80);
  }

  function isDividerLine(line) {
    const chars = line.trim().split("");
    if (!chars.length) return true;
    const dividerChars = new Set(["-", "━", "ー", "─", " "]);
    return chars.every((char) => dividerChars.has(char));
  }

  function extractMarkedSubsection(text, label) {
    const src = normalizeText(text);
    const startPattern = `■【${label}】`;
    const start = src.indexOf(startPattern);
    if (start < 0) return "";
    const rest = src.slice(start + startPattern.length);
    const candidates = [rest.indexOf(NL + "■【"), rest.indexOf(NL + "["), rest.indexOf(NL + "【")].filter((index) => index >= 0);
    const end = candidates.length ? Math.min(...candidates) : -1;
    return cleanupBlock(end >= 0 ? rest.slice(0, end) : rest);
  }

  function buildProfileLines(data, txt) {
    const p = txt.profile || {};
    const lines = [];
    const name = p.name || data?.name || "";
    if (name) lines.push(`名前：${name}`);
    if (p.occupation) lines.push(`職業：${p.occupation}`);
    if (p.age || p.gender) lines.push(`年齢／性別：${p.age || ""}${p.age && p.gender ? "／" : ""}${p.gender || ""}`);
    if (p.height || p.weight) lines.push(`身長／体重：${p.height || ""}${p.height && p.weight ? "／" : ""}${p.weight || ""}`);
    if (p.birthday) lines.push(`誕生日：${p.birthday}`);
    if (p.tag) lines.push(`タグ：${p.tag}`);
    return lines.filter(Boolean);
  }

  function detectEdition() {
    if (state.parsedTxt.edition) return state.parsedTxt.edition;
    if (state.parsedJson.ok && state.parsedJson.data?.commands) return detectEditionFromCommands(state.parsedJson.data.commands);
    return "";
  }

  function detectEditionFromRawTxt(text) {
    const head = normalizeText(text).slice(0, 300);
    if (head.includes("7版") || head.includes("7th")) return "7e";
    if (head.includes("6版") || head.includes("6th")) return "6e";
    return "";
  }

  function detectEditionFromCommands(text) {
    const normalized = normalizeText(text);
    if (normalized.includes("近接戦闘") || normalized.includes("射撃（") || normalized.includes("射撃(")) return "7e";
    if (normalized.includes("CCB<=") || normalized.includes("こぶし") || normalized.includes("忍び歩き")) return "6e";
    return normalized.includes("CC<=") ? "7e" : "6e";
  }

  function getStatusCards(data, txt) {
    const source = txt.abilities || {};
    const fromTxt = ["HP", "MP", "SAN", "幸運"].map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return (data?.status || []).slice(0, 4).map((item) => ({ label: item.label, value: item.value }));
  }

  function getParamCards(data, txt) {
    const source = txt.abilities || {};
    const stats = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"];
    const fromTxt = stats.map((label) => ({ label, value: source[label] })).filter((item) => item.value);
    if (fromTxt.length) return fromTxt;
    return (data?.params || []).map((item) => ({ label: item.label, value: item.value }));
  }

  function formatCommands(commands, edition) {
    const command = edition === "6e" ? "CCB" : "CC";
    const source = window.CharamemoParser && window.CharamemoParser.buildPaletteOutput
      ? window.CharamemoParser.buildPaletteOutput(commands, edition || "7e")
      : normalizeText(commands);
    return normalizeText(source)
      .split(NL)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => replaceCommandPrefix(line, command))
      .join(NL);
  }

  function replaceCommandPrefix(line, command) {
    const prefixes = ["sCCB<=", "sCC<=", "CCB<=", "CC<=", "1d100<=", "1D100<="];
    const hit = prefixes.find((prefix) => line.startsWith(prefix));
    if (!hit) return line;
    return command + "<=" + line.slice(hit.length);
  }

  function buildCommandsFromIacharaTxt(txt) {
    if (!txt?.found) return "";
    const edition = txt.edition || "7e";
    const command = edition === "6e" ? "CCB" : "CC";
    const lines = [];
    if (txt.abilities.SAN) lines.push(`1d100<=${txt.abilities.SAN} 【正気度ロール】`);
    if (txt.abilities.IDE) lines.push(`${command}<=${txt.abilities.IDE} 【アイデア】`);
    if (txt.abilities["幸運"]) lines.push(`${command}<=${txt.abilities["幸運"]} 【幸運】`);
    if (txt.abilities["知識"]) lines.push(`${command}<=${txt.abilities["知識"]} 【知識】`);
    for (const skill of txt.skills || []) lines.push(`${command}<=${skill.value} 【${skill.name}】`);
    for (const stat of ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"]) {
      if (txt.abilities[stat]) lines.push(`${command}<={${stat}} 【${stat}】`);
    }
    return lines.join(NL);
  }

  function createKomaDataFromTxt(txt) {
    if (!txt?.found) return null;
    const name = txt.profile.name || "いあきゃらTXTキャラクター";
    const status = ["HP", "MP", "SAN", "幸運"].filter((key) => txt.abilities[key]).map((key) => ({ label: key, value: numberOrText(txt.abilities[key]), max: numberOrText(txt.abilities[key]) }));
    const params = ["STR", "CON", "POW", "DEX", "APP", "SIZ", "INT", "EDU"].filter((key) => txt.abilities[key]).map((key) => ({ label: key, value: String(txt.abilities[key]) }));
    return { name, initiative: Number(txt.abilities.DEX) || 0, externalUrl: "", iconUrl: txt.icons[0] || "", commands: buildCommandsFromIacharaTxt(txt), status, params, color: "#008080" };
  }

  function numberOrText(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }

  function normalizeSkillNameForPalette(name) {
    return String(name || "").trim().replaceAll("(", "（").replaceAll(")", "）");
  }

  function findLine(text, key) {
    return normalizeText(text).split(NL).find((line) => line.includes(key + ":")) || "";
  }

  function pickLineValue(text, key) {
    const line = findLine(text, key);
    return cleanupValue(line.replace(key + ":", ""));
  }

  function pickInline(line, key) {
    const source = String(line || "");
    const start = source.indexOf(key + ":");
    if (start < 0) return "";
    const rest = source.slice(start + key.length + 1);
    const nextKeys = ["年齢:", "性別:", "身長:", "体重:", "出身:", "髪の色:", "瞳の色:", "肌の色:"];
    const candidates = nextKeys.map((marker) => rest.indexOf(marker)).filter((index) => index > 0);
    const slashIndex = rest.indexOf("/");
    if (slashIndex > 0) candidates.push(slashIndex);
    const end = candidates.length ? Math.min(...candidates) : -1;
    return cleanupValue(end >= 0 ? rest.slice(0, end) : rest);
  }

  function extractUrls(text) {
    const result = [];
    for (const token of String(text || "").split(/\s+/)) {
      const trimmed = token.trim();
      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) continue;
      result.push(trimUrlTail(trimmed));
    }
    return result;
  }

  function trimUrlTail(value) {
    let text = String(value || "");
    const tails = ["]", ")", "）", ",", ".", "、", "。"];
    while (text && tails.includes(text.slice(-1))) text = text.slice(0, -1);
    return text;
  }

  function normalizeText(text) {
    return String(text || "").replaceAll("\\n", NL).replace(/\r\n/g, NL).replace(/\r/g, NL);
  }

  function cleanupValue(value) {
    let text = String(value || "").trim();
    while (text.startsWith(":") || text.startsWith("：")) text = text.slice(1).trim();
    return text;
  }

  function cleanupBlock(value) {
    let text = normalizeText(value).trim();
    while (text.includes(NL + NL + NL)) text = text.replaceAll(NL + NL + NL, NL + NL);
    return text;
  }

  function editionLabel(edition) {
    return edition === "6e" ? "CoC 6版" : "CoC 7版";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function copyText(text, label) {
    if (!text) {
      showStatus("コピーする内容がありません", true);
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => showStatus(`${label}をコピーしました`, false),
        () => fallbackCopy(text, label)
      );
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const success = document.execCommand("copy");
      showStatus(success ? `${label}をコピーしました` : "コピーできませんでした。手動でコピーしてください", !success);
    } catch {
      showStatus("コピーできませんでした。手動でコピーしてください", true);
    }
    document.body.removeChild(textarea);
  }

  function showStatus(message, isError) {
    el.statusMessage.textContent = message;
    el.statusMessage.style.color = isError ? "#fca5a5" : "#6ee7b7";
    window.clearTimeout(showStatus.timer);
    showStatus.timer = window.setTimeout(() => {
      el.statusMessage.textContent = "";
    }, 2500);
  }

  function clearAll() {
    el.komaJsonInput.value = "";
    el.iacharaTxtInput.value = "";
    el.txtFileInput.value = "";
    el.memoEditor.value = "";
    el.palettePreview.value = "";
    el.txtMessage.textContent = "";
    state.memoTouched = false;
    state.paletteTouched = false;
    showStatus("入力をクリアしました", false);
    render();
  }

  function restoreTheme() {
    const saved = localStorage.getItem("iacharaCharamemoTheme");
    state.theme = saved === "light" ? "light" : "night";
    applyTheme();
  }

  function toggleTheme() {
    state.theme = state.theme === "night" ? "light" : "night";
    localStorage.setItem("iacharaCharamemoTheme", state.theme);
    applyTheme();
  }

  function applyTheme() {
    el.appShell.classList.toggle("theme-night", state.theme === "night");
    el.appShell.classList.toggle("theme-light", state.theme === "light");
    el.themeToggle.textContent = state.theme === "night" ? "🌙 ナイトモード" : "☀️ ライトモード";
  }

  function toggleInfoPanel(panel) {
    const isHidden = panel.classList.contains("hidden");
    el.usagePanel.classList.add("hidden");
    el.shortcutPanel.classList.add("hidden");
    if (isHidden) panel.classList.remove("hidden");
  }

  function toggleLanguageLabel() {
    const current = window.CharamemoLanguage && window.CharamemoLanguage.get ? window.CharamemoLanguage.get() : "ja";
    const next = current === "ja" ? "en" : "ja";
    if (window.CharamemoLanguage && window.CharamemoLanguage.set) window.CharamemoLanguage.set(next);
    el.languageToggle.textContent = next === "ja" ? "EN/JP" : "JP/EN";
  }
})();
