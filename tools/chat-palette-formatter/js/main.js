let editionMode = "auto";
let detectedEdition = "";

function t(key) {
  return window.ChatPaletteLanguage?.t(key) || key;
}

function editionLabel(edition) {
  return edition === "6e" ? t("edition6") : t("edition7");
}

function setStatus(message, type) {
  const status = document.getElementById("statusMessage");
  if (!status) return;

  status.textContent = message;
  status.style.color = type === "error" ? "#9f3a3a" : "#526b86";
  status.style.background = type === "error" ? "rgba(255, 245, 245, 0.78)" : "rgba(255,255,255,0.68)";
  status.style.borderColor = type === "error" ? "rgba(190, 70, 70, 0.35)" : "rgba(180, 197, 216, 0.58)";
}

function updateEditionToggleActive(mode) {
  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.classList.toggle("active", button.dataset.edition === mode);
  });
}

function setEditionMode(mode) {
  editionMode = mode;
  updateEditionToggleActive(mode);

  if (mode === "auto") {
    handleInputChange();
    return;
  }

  setStatus(t("manualModePrefix") + editionLabel(mode) + t("manualModeSuffix"));
}

function handleInputChange() {
  const input = document.getElementById("input");
  const output = document.getElementById("output");

  renderAnalysis(input.value);

  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);

  if (!extracted.text) {
    detectedEdition = "";
    if (output) output.value = "";
    setStatus(t("initialStatus"));
    if (editionMode === "auto") updateEditionToggleActive("auto");
    return;
  }

  detectedEdition = window.ChatPaletteParser.detectEdition(extracted.text);

  if (editionMode === "auto") {
    setStatus(t("detectPrefix") + editionLabel(detectedEdition) + t("detectSuffix"));
  }

  formatPalette();
}

function getSelectedEdition(text) {
  if (editionMode === "6e" || editionMode === "7e") return editionMode;

  detectedEdition = window.ChatPaletteParser.detectEdition(text);
  return detectedEdition;
}

function shouldAddCommands() {
  return Boolean(document.getElementById("commandAddToggle")?.checked);
}

function buildCommandAddPrefix(edition) {
  const commands = [":HP-", ":SAN-"];

  if (edition === "6e") {
    commands.push("RESB(X-Y)", "CBRB(x, y)");
  }

  return commands.join("\n");
}

function applyCommandAdd(formattedText, edition) {
  if (!shouldAddCommands()) return formattedText;

  const prefix = buildCommandAddPrefix(edition);
  return prefix + "\n\n" + formattedText;
}

function formatPalette() {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const extracted = window.ChatPaletteParser.extractPaletteText(input.value);

  if (!extracted.text) {
    output.value = "";
    setStatus(t("extractError"), "error");
    return;
  }

  const edition = getSelectedEdition(extracted.text);

  if (editionMode === "auto") {
    updateEditionToggleActive(edition);
  }

  output.value = applyCommandAdd(window.ChatPaletteParser.buildOutput(extracted.text, edition), edition);
}

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
  detectedEdition = "";
  renderAnalysis("");
  setEditionMode("auto");
  setStatus(t("cleared"));
}

const ANALYSIS_SERVICE_LABELS = {
  iachara: "いあきゃら",
  charash: "キャラッシュ",
  charaeno: "Charaeno",
  "character-storage": "キャラクター保管庫",
  "generic-palette": "チャットパレット",
  unknown: "判定不可"
};

const ANALYSIS_EDITION_SOURCE = {
  url: "（URLから）",
  palette: "（技能から）",
  manual: "（手動）",
  unknown: ""
};

function analysisText(value) {
  return document.createTextNode(value);
}

function analysisStrong(value) {
  const el = document.createElement("b");
  el.textContent = value;
  return el;
}

function renderAnalysis(rawInput) {
  const box = document.getElementById("analysisPreview");

  if (!box || !window.ChatPaletteSchema) return;

  if (!String(rawInput || "").trim()) {
    box.hidden = true;
    scheduleMainFit();
    return;
  }

  let character;

  try {
    character = window.ChatPaletteSchema.buildCharacter(rawInput);
  } catch (error) {
    console.warn("buildCharacter failed", error);
    box.hidden = true;
    scheduleMainFit();
    return;
  }

  const meta = character.meta;

  box.hidden = false;

  document.getElementById("apService").textContent = ANALYSIS_SERVICE_LABELS[meta.service] || meta.service;

  const editionEl = document.getElementById("apEdition");

  editionEl.textContent = (meta.edition === "6e" || meta.edition === "7e")
    ? editionLabel(meta.edition) + (ANALYSIS_EDITION_SOURCE[meta.editionSource] || "")
    : t("apEditionUnknown");

  const nameEl = document.getElementById("apName");
  nameEl.textContent = "";

  if (meta.name) {
    nameEl.append(analysisText(meta.name));

    if (meta.ruby) {
      const ruby = document.createElement("span");
      ruby.className = "analysis-ruby";
      ruby.textContent = meta.ruby;
      nameEl.append(ruby);
    }
  }

  if (meta.occupation) {
    const occ = document.createElement("span");
    occ.className = "analysis-occupation";
    occ.textContent = (meta.name ? "／" : "") + meta.occupation;
    nameEl.append(occ);
  }

  const abilitiesEl = document.getElementById("apAbilities");
  abilitiesEl.textContent = "";

  if (character.counts.abilities > 0) {
    abilitiesEl.hidden = false;

    for (const key of window.ChatPaletteSchema.ABILITY_KEYS) {
      const value = character.abilities[key];
      const cell = document.createElement("span");

      if (value === null) cell.dataset.missing = "1";

      const amount = document.createElement("b");
      amount.textContent = value === null ? "—" : String(value);

      const label = document.createElement("i");
      label.textContent = key;

      cell.append(amount, label);
      abilitiesEl.append(cell);
    }
  } else {
    abilitiesEl.hidden = true;
  }

  const derivedEl = document.getElementById("apDerived");
  const derived = character.derived;
  const derivedParts = [];

  for (const [label, entry] of [["HP", derived.HP], ["MP", derived.MP], ["SAN", derived.SAN]]) {
    if (entry && (entry.value !== null || entry.max !== null)) {
      const shown = entry.value === null ? "?" : entry.value;
      derivedParts.push(entry.max !== null ? `${label} ${shown}/${entry.max}` : `${label} ${shown}`);
    }
  }

  if (derived.DB) derivedParts.push("DB " + derived.DB);
  if (derived.MOV !== null) derivedParts.push("MOV " + derived.MOV);
  if (derived.build !== null) derivedParts.push("ビルド " + derived.build);

  derivedEl.textContent = derivedParts.join("　");
  derivedEl.hidden = derivedParts.length === 0;

  const countsEl = document.getElementById("apCounts");
  const counts = character.counts;
  countsEl.textContent = "";
  countsEl.append(
    analysisText("技能 "),
    analysisStrong(String(counts.skills)),
    analysisText(` 件（初期値 ${counts.skillsInitial}）　武器・ダメージ行 `),
    analysisStrong(String(counts.weapons)),
    analysisText(" 件")
  );

  const warnEl = document.getElementById("apWarn");

  if (meta.warnings.length) {
    warnEl.textContent = meta.warnings.map(warning => "・" + warning.detail).join("\n");
    warnEl.hidden = false;
  } else {
    warnEl.hidden = true;
  }

  scheduleMainFit();
}

async function copyOutput() {
  const output = document.getElementById("output");

  if (!output.value) {
    setStatus(t("copyEmpty"), "error");
    return;
  }

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(output.value);
      setStatus(t("copied"));
      return;
    }
  } catch (error) {
    console.warn("Clipboard API copy failed. Falling back to document.execCommand.", error);
  }

  fallbackCopy(output);
}


function fitMainToViewport() {
  const main = document.querySelector(".main");
  if (!main) return;

  if (window.matchMedia("(max-width: 760px)").matches) {
    main.style.removeProperty("--main-fit-height");
    return;
  }

  const rect = main.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const bottomMargin = 14;
  const availableHeight = Math.floor(viewportHeight - rect.top - bottomMargin);
  const safeHeight = Math.max(300, availableHeight);

  main.style.setProperty("--main-fit-height", safeHeight + "px");
}

function scheduleMainFit() {
  window.requestAnimationFrame(fitMainToViewport);
}

function fallbackCopy(output) {
  output.focus();
  output.select();

  try {
    const success = document.execCommand("copy");

    if (success) {
      setStatus(t("copied"));
    } else {
      setStatus(t("copyManual"), "error");
    }
  } catch (error) {
    console.warn("Fallback copy failed.", error);
    setStatus(t("copyManual"), "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("input", handleInputChange);
  document.getElementById("formatButton").addEventListener("click", formatPalette);
  document.getElementById("copyButton").addEventListener("click", copyOutput);
  document.getElementById("clearButton").addEventListener("click", clearAll);

  document.getElementById("commandAddToggle")?.addEventListener("change", () => {
    if (document.getElementById("input")?.value.trim()) {
      formatPalette();
    }
  });

  document.querySelectorAll(".edition-toggle button").forEach(button => {
    button.addEventListener("click", () => {
      setEditionMode(button.dataset.edition);
    });
  });

  scheduleMainFit();
  window.addEventListener("resize", scheduleMainFit);
  window.addEventListener("orientationchange", scheduleMainFit);

  if (typeof ResizeObserver === "function") {
    const layoutObserver = new ResizeObserver(scheduleMainFit);
    document.querySelectorAll(".site-header, .status-note, .analysis-preview").forEach(el => layoutObserver.observe(el));
  }

  renderAnalysis(document.getElementById("input").value);
  setStatus(t("initialStatus"));
});
