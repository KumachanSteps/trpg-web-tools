const DICE_STAT_ANALYST_URL = "../dice-stat-analyst/index.html";

const I18N = {
  ja: {
    documentTitle: "CoC6版/7版成長ツール",
    htmlLang: "ja",

    portalLink: "← TRPG Web ツール観測所",
    portalTooltip: "TRPG Web Tools ポータルに戻る",
    tagDiceInput: "ダイスログ入力",
    tagEdition: "CoC 6版 / 7版",
    tagDiceStatLink: "ダイス統計アナライザーと連携",

    toolIcon: "✦",
    pageTitle: "CoC6版/7版成長ツール",
    pageDescription: "セッションログから、探索者ごとの「成長チェック候補技能」を抽出します。CoC6版・7版のハウスルール運用に合わせて、成功・クリティカル・ファンブルの表示条件を切り替えできます。",
    shortcutTip: "Shortcut: Ctrl / Cmd + O でファイル選択、Ctrl / Cmd + Enter で解析、Ctrl / Cmd + Shift + M でナイトモード切替。",

    languageButton: "EN",
    shortcutButton: "ショートカット",

    inputTitle: "入力欄",
    collapseInputTitle: "入力パネルを折りたたむ",
    expandInputTitle: "入力パネルを開く",
    inputPlaceholder: "セッションログHTML / テキストをコピー＆ペーストしてください",
    openFileButton: "📂 ファイルを開く",
    analyzeButton: "成長チェックを抽出",
    clearButton: "入力をクリア",

    growthRuleTitle: "成長チェック候補の表示ルール",
    rulebookName: "Rulebook",
    rulebookDescription: "成功・スペシャル・クリティカルを技能ごとに1回だけ表示",
    critFumbleName: "Critical / Fumble",
    critFumbleDescription: "クリティカル・ファンブルをすべて表示。同じ技能の重複も表示",
    bothName: "Both",
    bothDescription: "クリティカル・ファンブルはすべて、通常成功・スペシャルは技能ごとに1回だけ表示",
    bothPrimeName: "Both'",
    bothPrimeDescription: "クリティカルはすべて、通常成功・スペシャルは技能ごとに1回だけ表示。ファンブルは除外",

    excludeRuleTitle: "除外ルール",
    excludeSanLabel: "SANチェック / 正気度ロールを除外",
    excludeParamsLabel: "知識・アイデア・幸運・能力値ロールを除外",
    excludeParamsDescription: "STR / CON / POW / DEX / APP / SIZ / INT / EDU / アイデア / 知識 / 幸運など",

    characterDisplayTitle: "キャラクター表示",
    minRollsLabel: "NPC除外しきい値：",
    minRollsNote: "この回数未満のキャラクターは初期状態で非表示になります。",

    copyTextButton: "テキストコピー",
    copyDoneButton: "コピー完了",
    copyFailedButton: "コピー失敗",
    showAllButton: "全員表示",
    thresholdOnlyButton: "しきい値以上のみ",
    diceStatButton: "ダイス統計アナライザー →",
    diceStatTooltip: "ダイス統計アナライザーへ移動しますか？",

    emptyInitial: "ログを入力して「成長チェックを抽出」を押してください。",
    emptyNoRolls: "ダイスロールを検出できませんでした。CC / CCB / RESB / CBRB 形式、またはキャラクター名：コマンド形式のログか確認してください。",
    emptyAfterFilters: "除外ルール適用後に表示できるダイスロールがありません。",
    emptyNoVisibleCharacter: "表示対象のキャラクターがありません。キャラクター表示チェックをONにしてください。",
    noGrowthCandidates: "成長チェック候補はありません。",
    showOrganizedLog: "整理済みダイスログを表示",

    summaryCharacters: "検出キャラクター",
    summaryVisibleCharacters: "表示中キャラクター",
    summaryGrowthCandidates: "成長チェック候補",
    summaryCritFumble: "Critical / Fumble",

    tableSkill: "技能",
    tableResult: "結果",
    tableRoll: "出目",
    tableRawLog: "元ログ",

    thresholdAbove: "しきい値以上",
    thresholdBelow: "しきい値未満",
    rollsLabel: "rolls",
    checksLabel: "checks",

    chancePow: "Chance to grow <POW>",
    textOutputTitle: "CoC 成長チェック候補",
    textOutputRolls: "ロール数",
    textOutputGrowthChecks: "成長チェック候補",
    textOutputNoGrowth: "- 成長チェック候補なし",

    shortcutAlert: [
      "ショートカット一覧",
      "",
      "Ctrl / Cmd + O：ファイルを開く",
      "Ctrl / Cmd + Enter：解析実行",
      "Ctrl / Cmd + Shift + M：ナイトモード切替",
      "Esc：入力パネルを折りたたむ / 開く"
    ]
  },

  en: {
    documentTitle: "CoC 6e/7e Growth Checker",
    htmlLang: "en",

    portalLink: "← TRPG Web Tools　Portal",
    portalTooltip: "Return to TRPG Web Tools Portal",
    tagDiceInput: "Dice Log Input",
    tagEdition: "CoC 6e / 7e",
    tagDiceStatLink: "Linked with Dice Stat Analyst",

    toolIcon: "✦",
    pageTitle: "CoC 6e/7e Growth Checker",
    pageDescription: "Extract skill growth check candidates for each character from a session log. Switch output rules based on your CoC 6e / 7e house rules for successes, criticals, and fumbles.",
    shortcutTip: "Shortcuts: Ctrl / Cmd + O to open a file, Ctrl / Cmd + Enter to analyze, Ctrl / Cmd + Shift + M to toggle night mode.",

    languageButton: "JP",
    shortcutButton: "Shortcuts",

    inputTitle: "Input",
    collapseInputTitle: "Collapse input panel",
    expandInputTitle: "Open input panel",
    inputPlaceholder: "Paste your session log HTML or plain text here",
    openFileButton: "📂 Open File",
    analyzeButton: "Extract Growth Checks",
    clearButton: "Clear Input",

    growthRuleTitle: "Growth Check Rule",
    rulebookName: "Rulebook",
    rulebookDescription: "List successes, specials, and criticals once per skill.",
    critFumbleName: "Critical / Fumble",
    critFumbleDescription: "List all criticals and fumbles. Duplicate skills are allowed.",
    bothName: "Both",
    bothDescription: "List all criticals and fumbles. Regular successes and specials appear once per skill.",
    bothPrimeName: "Both'",
    bothPrimeDescription: "List all criticals. Regular successes and specials appear once per skill. Fumbles are excluded.",

    excludeRuleTitle: "Exclusion Rules",
    excludeSanLabel: "Exclude SAN checks / sanity rolls",
    excludeParamsLabel: "Exclude Knowledge, Idea, Luck, and ability rolls",
    excludeParamsDescription: "STR / CON / POW / DEX / APP / SIZ / INT / EDU / Idea / Knowledge / Luck, etc.",

    characterDisplayTitle: "Character Display",
    minRollsLabel: "NPC filter threshold:",
    minRollsNote: "Characters below this roll count are hidden by default.",

    copyTextButton: "Copy Text",
    copyDoneButton: "Copied!",
    copyFailedButton: "Copy Failed",
    showAllButton: "Show All",
    thresholdOnlyButton: "Above Threshold Only",
    diceStatButton: "Dice Stat Analyst →",
    diceStatTooltip: "Do you want to move to Dice Stat Analyst?",

    emptyInitial: "Paste a log and click “Extract Growth Checks.”",
    emptyNoRolls: "No dice rolls were detected. Please check whether the log uses CC / CCB / RESB / CBRB format or character-name command format.",
    emptyAfterFilters: "No dice rolls remain after applying the exclusion filters.",
    emptyNoVisibleCharacter: "No characters are currently visible. Turn on at least one character checkbox.",
    noGrowthCandidates: "No growth check candidates.",
    showOrganizedLog: "Show organized dice log",

    summaryCharacters: "Detected Characters",
    summaryVisibleCharacters: "Visible Characters",
    summaryGrowthCandidates: "Growth Candidates",
    summaryCritFumble: "Critical / Fumble",

    tableSkill: "Skill",
    tableResult: "Result",
    tableRoll: "Roll",
    tableRawLog: "Raw Log",

    thresholdAbove: "Above Threshold",
    thresholdBelow: "Below Threshold",
    rollsLabel: "rolls",
    checksLabel: "checks",

    chancePow: "Chance to grow <POW>",
    textOutputTitle: "CoC Growth Check Candidates",
    textOutputRolls: "Rolls",
    textOutputGrowthChecks: "Growth Checks",
    textOutputNoGrowth: "- No growth check candidates",

    shortcutAlert: [
      "Shortcut List",
      "",
      "Ctrl / Cmd + O: Open file",
      "Ctrl / Cmd + Enter: Analyze",
      "Ctrl / Cmd + Shift + M: Toggle night mode",
      "Esc: Collapse / open input panel"
    ]
  }
};

let currentLang = localStorage.getItem("cocGrowthCheckerLang") || "ja";

const DICE_PARSER_FALLBACK_MESSAGE = "parser.js が読み込まれていません。index.html で parser.js を growth_checker.js より先に読み込んでください。";

const state = {
  rawInput: "",
  rolls: [],
  characters: new Map(),
  visibleCharacters: new Set(),
  lastTextOutput: ""
};

const el = {
  body: document.body,
  mainLayout: document.getElementById("mainLayout"),
  inputToggleBtn: document.getElementById("inputToggleBtn"),
  languageToggleBtn: document.getElementById("languageToggleBtn"),
  shortcutHelpBtn: document.getElementById("shortcutHelpBtn"),
  inputLog: document.getElementById("inputLog"),
  fileInput: document.getElementById("fileInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  clearBtn: document.getElementById("clearBtn"),
  themeBtn: document.getElementById("themeBtn"),
  jumpDiceStatBtn: document.getElementById("jumpDiceStatBtn"),
  copyTextBtn: document.getElementById("copyTextBtn"),
  selectAllCharsBtn: document.getElementById("selectAllCharsBtn"),
  thresholdCharsBtn: document.getElementById("thresholdCharsBtn"),
  summary: document.getElementById("summary"),
  characterFilter: document.getElementById("characterFilter"),
  results: document.getElementById("results"),
  minRolls: document.getElementById("minRolls"),
  excludeSan: document.getElementById("excludeSan"),
  excludeParams: document.getElementById("excludeParams")
};

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.ja[key] ?? key;
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("cocGrowthCheckerLang", lang);

  document.documentElement.lang = t("htmlLang");
  document.title = t("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach(node => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
    const key = node.dataset.i18nPlaceholder;
    node.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach(node => {
    const key = node.dataset.i18nTitle;
    node.title = t(key);
  });

  document.querySelectorAll("[data-i18n-tooltip]").forEach(node => {
    const key = node.dataset.i18nTooltip;
    node.dataset.tooltip = t(key);
  });

  if (el.languageToggleBtn) {
    el.languageToggleBtn.textContent = t("languageButton");
  }

  if (!state.rolls.length && el.results.classList.contains("empty")) {
    el.results.innerHTML = t("emptyInitial");
  }

  if (state.rolls.length) {
    renderAll(false);
  }
}

function getCurrentRule() {
  return document.querySelector('input[name="growthRule"]:checked')?.value || "rulebook";
}

function getFilteredRolls() {
  const excludeSan = el.excludeSan.checked;
  const excludeParams = el.excludeParams.checked;

  return state.rolls.filter(roll => {
    if (excludeSan && roll.isSan) return false;
    if (excludeParams && roll.isParam && !roll.isLuckCritical) return false;
    return true;
  });
}

function groupCharacters(rolls) {
  const map = new Map();

  for (const roll of rolls) {
    if (!map.has(roll.character)) {
      map.set(roll.character, {
        name: roll.character,
        rolls: [],
        growth: []
      });
    }

    map.get(roll.character).rolls.push(roll);
  }

  return map;
}

function buildGrowthCandidates(charRolls, rule) {
  const candidates = [];
  const regularSeen = new Set();

  for (const roll of charRolls) {
    const isRegularSuccess = roll.result === "success" || roll.result === "special";
    const isCritical = roll.result === "critical";
    const isFumble = roll.result === "fumble";

    if (roll.isLuckCritical) {
      candidates.push({
        ...roll,
        note: t("chancePow")
      });
      continue;
    }

    if (rule === "rulebook") {
      if ((isRegularSuccess || isCritical) && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
      continue;
    }

    if (rule === "critFumble") {
      if (isCritical || isFumble) {
        candidates.push(roll);
      }
      continue;
    }

    if (rule === "both") {
      if (isCritical || isFumble) {
        candidates.push(roll);
      } else if (isRegularSuccess && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
      continue;
    }

    if (rule === "bothPrime") {
      if (isCritical) {
        candidates.push(roll);
      } else if (isRegularSuccess && !regularSeen.has(roll.skill)) {
        candidates.push(roll);
        regularSeen.add(roll.skill);
      }
    }
  }

  return candidates;
}

function sortCharacters(chars, minRolls) {
  return [...chars.values()].sort((a, b) => {
    const aPass = a.rolls.length >= minRolls ? 0 : 1;
    const bPass = b.rolls.length >= minRolls ? 0 : 1;

    if (aPass !== bPass) return aPass - bPass;

    return a.name.localeCompare(b.name, currentLang === "ja" ? "ja" : "en");
  });
}

function analyze() {
  state.rawInput = el.inputLog.value;

  if (!window.CocDiceParser || typeof window.CocDiceParser.parse !== "function") {
    el.results.className = "empty";
    el.results.innerHTML = DICE_PARSER_FALLBACK_MESSAGE;
    return;
  }

  state.rolls = window.CocDiceParser.parse(state.rawInput);
  renderAll(true);
}

function renderAll(resetVisible = false) {
  const rule = getCurrentRule();
  const minRolls = Number(el.minRolls.value || 0);
  const filteredRolls = getFilteredRolls();

  state.characters = groupCharacters(filteredRolls);

  for (const char of state.characters.values()) {
    char.growth = buildGrowthCandidates(char.rolls, rule);
  }

  const sorted = sortCharacters(state.characters, minRolls);

  if (resetVisible) {
    state.visibleCharacters = new Set(
      sorted
        .filter(char => char.rolls.length >= minRolls)
        .map(char => char.name)
    );
  } else {
    const remainingVisible = [...state.visibleCharacters]
      .filter(name => state.characters.has(name));

    state.visibleCharacters = new Set(remainingVisible);
  }

  renderSummary(sorted, filteredRolls);
  renderCharacterFilter(sorted, minRolls);
  renderResults(sorted, minRolls);
}

function renderSummary(chars, filteredRolls) {
  const totalCandidates = chars.reduce((sum, char) => sum + char.growth.length, 0);
  const shownChars = chars.filter(char => state.visibleCharacters.has(char.name)).length;
  const crits = filteredRolls.filter(roll => roll.result === "critical").length;
  const fumbles = filteredRolls.filter(roll => roll.result === "fumble").length;

  el.summary.innerHTML = `
    <div class="stat"><b>${chars.length}</b><span>${t("summaryCharacters")}</span></div>
    <div class="stat"><b>${shownChars}</b><span>${t("summaryVisibleCharacters")}</span></div>
    <div class="stat"><b>${totalCandidates}</b><span>${t("summaryGrowthCandidates")}</span></div>
    <div class="stat"><b>${crits} / ${fumbles}</b><span>${t("summaryCritFumble")}</span></div>
  `;
}

function renderCharacterFilter(chars, minRolls) {
  if (!chars.length) {
    el.characterFilter.hidden = true;
    el.characterFilter.innerHTML = "";
    return;
  }

  el.characterFilter.hidden = false;

  el.characterFilter.innerHTML = chars.map(char => {
    const checked = state.visibleCharacters.has(char.name) ? "checked" : "";
    const cls = char.rolls.length < minRolls ? "below-threshold" : "";

    return `
      <label class="filter-row ${cls}">
        <input type="checkbox" data-char="${escapeAttr(char.name)}" ${checked}>
        <span>${escapeHtml(char.name)}</span>
        <span class="pill">${char.rolls.length} ${t("rollsLabel")} / ${char.growth.length} ${t("checksLabel")}</span>
      </label>
    `;
  }).join("");

  el.characterFilter.querySelectorAll("input[data-char]").forEach(box => {
    box.addEventListener("change", event => {
      const name = event.currentTarget.dataset.char;

      if (event.currentTarget.checked) {
        state.visibleCharacters.add(name);
      } else {
        state.visibleCharacters.delete(name);
      }

      const minRolls = Number(el.minRolls.value || 0);
      const sorted = sortCharacters(state.characters, minRolls);

      renderResults(sorted, minRolls);
      renderSummary(sorted, getFilteredRolls());
    });
  });
}

function renderResults(chars, minRolls) {
  if (!state.rolls.length) {
    el.results.className = "empty";
    el.results.innerHTML = t("emptyNoRolls");
    state.lastTextOutput = "";
    return;
  }

  if (!chars.length) {
    el.results.className = "empty";
    el.results.innerHTML = t("emptyAfterFilters");
    state.lastTextOutput = "";
    return;
  }

  const visible = chars.filter(char => state.visibleCharacters.has(char.name));

  if (!visible.length) {
    el.results.className = "empty";
    el.results.innerHTML = t("emptyNoVisibleCharacter");
    state.lastTextOutput = "";
    return;
  }

  el.results.className = "";
  el.results.innerHTML = visible
    .map(char => renderCharacterCard(char, minRolls))
    .join("");

  state.lastTextOutput = buildTextOutput(visible);
}

function renderCharacterCard(char, minRolls) {
  const growthHtml = char.growth.length
    ? `<div class="growth-list">${char.growth.map(renderGrowthItem).join("")}</div>`
    : `<div class="empty">${t("noGrowthCandidates")}</div>`;

  const logRows = char.rolls.map(roll => `
    <tr>
      <td>${escapeHtml(roll.skill)}</td>
      <td>${renderResultTag(roll.result)}</td>
      <td>${roll.rollValue ?? "-"}</td>
      <td class="raw-line">${escapeHtml(roll.raw)}</td>
    </tr>
  `).join("");

  const thresholdPill = char.rolls.length >= minRolls
    ? `<span class="pill">${t("thresholdAbove")}</span>`
    : `<span class="pill">${t("thresholdBelow")}</span>`;

  return `
    <article class="char-card">
      <div class="char-head">
        <h3>${escapeHtml(char.name)}</h3>
        <div class="char-meta">
          ${thresholdPill}
          <span class="pill">${char.rolls.length} ${t("rollsLabel")}</span>
          <span class="pill">${char.growth.length} ${t("checksLabel")}</span>
        </div>
      </div>
      <div class="char-body">
        ${growthHtml}
        <details>
          <summary>${t("showOrganizedLog")}</summary>
          <table class="log-table">
            <thead>
              <tr>
                <th>${t("tableSkill")}</th>
                <th>${t("tableResult")}</th>
                <th>${t("tableRoll")}</th>
                <th>${t("tableRawLog")}</th>
              </tr>
            </thead>
            <tbody>${logRows}</tbody>
          </table>
        </details>
      </div>
    </article>
  `;
}

function renderGrowthItem(roll) {
  const note = roll.note ? `<span class="tag pow">${escapeHtml(roll.note)}</span>` : "";

  return `
    <div class="growth-item">
      <strong>${escapeHtml(roll.skill)}</strong>
      ${renderResultTag(roll.result)}
      ${roll.rollValue !== null ? `<span class="tag">${t("tableRoll")} ${roll.rollValue}</span>` : ""}
      ${note}
      <div class="raw-line">${escapeHtml(roll.raw)}</div>
    </div>
  `;
}

function renderResultTag(result) {
  const label = {
    critical: "CRITICAL",
    fumble: "FUMBLE",
    special: "SPECIAL",
    success: "SUCCESS",
    failure: "FAILURE",
    unknown: "UNKNOWN"
  }[result] || result;

  const cls = ["critical", "fumble", "special", "success"].includes(result)
    ? result
    : "";

  return `<span class="tag ${cls}">${label}</span>`;
}

function buildTextOutput(chars) {
  const lines = [];

  lines.push(t("textOutputTitle"));
  lines.push("================================");
  lines.push("");

  for (const char of chars) {
    lines.push(`■ ${char.name}`);
    lines.push(`${t("textOutputRolls")}: ${char.rolls.length} / ${t("textOutputGrowthChecks")}: ${char.growth.length}`);

    if (!char.growth.length) {
      lines.push(t("textOutputNoGrowth"));
    } else {
      for (const roll of char.growth) {
        const note = roll.note ? ` / ${roll.note}` : "";
        const value = roll.rollValue !== null ? ` / ${roll.rollValue}` : "";
        lines.push(`- ${roll.skill} [${roll.result.toUpperCase()}${value}${note}]`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

async function copyToClipboard(text) {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand("copy");
    temp.remove();
    return ok;
  }
}

function sendToDiceStatAnalyst() {
  const log = el.inputLog.value || state.rawInput || "";

  localStorage.setItem("diceStatAnalystInput", log);
  localStorage.setItem("cocDiceLogSharedInput", log);
  localStorage.setItem("cocGrowthCheckerLastInput", log);

  window.location.href = DICE_STAT_ANALYST_URL;
}

el.fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];

  if (!file) return;

  const text = await file.text();

  el.inputLog.value = text;
  analyze();
});

el.analyzeBtn.addEventListener("click", analyze);

el.clearBtn.addEventListener("click", () => {
  el.inputLog.value = "";
  state.rawInput = "";
  state.rolls = [];
  state.characters = new Map();
  state.visibleCharacters = new Set();
  state.lastTextOutput = "";

  el.summary.innerHTML = "";
  el.characterFilter.hidden = true;
  el.characterFilter.innerHTML = "";
  el.results.className = "empty";
  el.results.innerHTML = t("emptyInitial");
  el.fileInput.value = "";
});

el.themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("cocGrowthCheckerTheme", isDark ? "dark" : "light");
});

el.inputToggleBtn.addEventListener("click", () => {
  el.mainLayout.classList.toggle("input-collapsed");

  const isCollapsed = el.mainLayout.classList.contains("input-collapsed");

  el.inputToggleBtn.textContent = isCollapsed ? "▶" : "◀";
  el.inputToggleBtn.title = isCollapsed ? t("expandInputTitle") : t("collapseInputTitle");
});

el.shortcutHelpBtn.addEventListener("click", () => {
  alert(t("shortcutAlert").join("\n"));
});

el.languageToggleBtn.addEventListener("click", () => {
  applyLanguage(currentLang === "ja" ? "en" : "ja");
});

el.copyTextBtn.addEventListener("click", async () => {
  const ok = await copyToClipboard(state.lastTextOutput);

  el.copyTextBtn.textContent = ok ? t("copyDoneButton") : t("copyFailedButton");

  setTimeout(() => {
    el.copyTextBtn.textContent = t("copyTextButton");
  }, 1200);
});

el.selectAllCharsBtn.addEventListener("click", () => {
  state.visibleCharacters = new Set([...state.characters.keys()]);
  renderAll(false);
});

el.thresholdCharsBtn.addEventListener("click", () => {
  const minRolls = Number(el.minRolls.value || 0);

  state.visibleCharacters = new Set(
    [...state.characters.values()]
      .filter(char => char.rolls.length >= minRolls)
      .map(char => char.name)
  );

  renderAll(false);
});

el.jumpDiceStatBtn.addEventListener("click", sendToDiceStatAnalyst);

document.querySelectorAll('input[name="growthRule"], #excludeSan, #excludeParams').forEach(control => {
  control.addEventListener("change", () => renderAll(false));
});

el.minRolls.addEventListener("change", () => {
  const minRolls = Number(el.minRolls.value || 0);

  state.visibleCharacters = new Set(
    [...state.characters.values()]
      .filter(char => char.rolls.length >= minRolls)
      .map(char => char.name)
  );

  renderAll(false);
});

document.addEventListener("keydown", event => {
  const mod = event.ctrlKey || event.metaKey;

  if (mod && event.key.toLowerCase() === "o") {
    event.preventDefault();
    el.fileInput.click();
  }

  if (mod && event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    el.themeBtn.click();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    el.inputToggleBtn.click();
  }

  if (mod && event.key === "Enter") {
    event.preventDefault();
    analyze();
  }
});

const savedTheme = localStorage.getItem("cocGrowthCheckerTheme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

const sharedInput = localStorage.getItem("cocGrowthCheckerLastInput") || localStorage.getItem("cocDiceLogSharedInput") || "";

if (sharedInput) {
  el.inputLog.value = sharedInput;
}

applyLanguage(currentLang);