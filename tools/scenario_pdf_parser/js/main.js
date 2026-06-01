const SNIPPET_TOOL_URL = "../scenario-info-snippet-tool/index.html";
const BRIDGE_TEXT_KEY = "scenarioInfoSnippet.importText";
const BRIDGE_PAYLOAD_KEY = "scenarioInfoSnippet.importPayload";

function i18n(key) {
  return window.SCENARIO_PDF_PARSER_LANGUAGE?.t(key) || key;
}

const presetData = [
  { id: "balanced", labelKey: "preset.balanced.label", descKey: "preset.balanced.desc" },
  { id: "ccfolia", labelKey: "preset.ccfolia.label", descKey: "preset.ccfolia.desc" },
  { id: "scenario", labelKey: "preset.scenario.label", descKey: "preset.scenario.desc" },
  { id: "minimal", labelKey: "preset.minimal.label", descKey: "preset.minimal.desc" },
];

const optionData = [
  { key: "removePageNumbers", labelKey: "option.removePageNumbers" },
  { key: "joinBrokenLines", labelKey: "option.joinBrokenLines" },
  { key: "keepDialogueBreaks", labelKey: "option.keepDialogueBreaks" },
  { key: "normalizeSpaces", labelKey: "option.normalizeSpaces" },
  { key: "removeHeaders", labelKey: "option.removeHeaders" },
  { key: "splitSections", labelKey: "option.splitSections" },
  { key: "markSkillChecks", labelKey: "option.markSkillChecks" },
  { key: "markHandouts", labelKey: "option.markHandouts" },
  { key: "fixMergedHeadings", labelKey: "option.fixMergedHeadings" },
  { key: "keepScenarioMetaLines", labelKey: "option.keepScenarioMetaLines" },
  { key: "preservePdfParagraphBreaks", labelKey: "option.preservePdfParagraphBreaks" },
  { key: "removeDuplicateLines", labelKey: "option.removeDuplicateLines" },
  { key: "replaceRoleTokens", labelKey: "option.replaceRoleTokens" },
];

function getPresets() {
  return presetData.map((item) => ({ ...item, label: i18n(item.labelKey), desc: i18n(item.descKey) }));
}

function getCleanupOptions() {
  return optionData.map((item) => ({ ...item, label: i18n(item.labelKey) }));
}

const state = {
  preset: "scenario",
  rawText: window.SCENARIO_PDF_PARSER_SAMPLE_TEXT || "",
  formattedText: "",
  outputText: "",
  searchTerm: "",
  replaceTerm: "",
  fileName: "scenario_parsed_text.txt",
  activeMatchIndex: 0,
  matches: [],
  options: {
    removePageNumbers: true,
    joinBrokenLines: true,
    keepDialogueBreaks: true,
    normalizeSpaces: true,
    removeHeaders: false,
    splitSections: true,
    markSkillChecks: true,
    markHandouts: true,
    fixMergedHeadings: true,
    keepScenarioMetaLines: true,
    preservePdfParagraphBreaks: false,
    removeDuplicateLines: true,
    replaceRoleTokens: false,
  },
};

const elements = {
  pdfInput: document.getElementById("pdfInput"),
  dropZone: document.getElementById("dropZone"),
  fileStatus: document.getElementById("fileStatus"),
  filenameInput: document.getElementById("filenameInput"),
  presetList: document.getElementById("presetList"),
  optionList: document.getElementById("optionList"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  sendSnippetBtn: document.getElementById("sendSnippetBtn"),
  searchInput: document.getElementById("searchInput"),
  replaceInput: document.getElementById("replaceInput"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  replaceBtn: document.getElementById("replaceBtn"),
  replaceAllBtn: document.getElementById("replaceAllBtn"),
  resetReplaceBtn: document.getElementById("resetReplaceBtn"),
  matchCounter: document.getElementById("matchCounter"),
  outputBox: document.getElementById("outputBox"),
  charCount: document.getElementById("charCount"),
  lineCount: document.getElementById("lineCount"),
  blockCount: document.getElementById("blockCount"),
  presetName: document.getElementById("presetName"),
  languageToggleBtn: document.getElementById("languageToggleBtn"),
  usageToggleBtn: document.getElementById("usageToggleBtn"),
  shortcutToggleBtn: document.getElementById("shortcutToggleBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  usagePanel: document.getElementById("usagePanel"),
  shortcutPanel: document.getElementById("shortcutPanel"),
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}
function isHeaderPanelOpen() {
  return elements.usagePanel.classList.contains("is-open") || elements.shortcutPanel.classList.contains("is-open");
}

function setHeaderPanel(panelName) {
  const usageOpen = elements.usagePanel.classList.contains("is-open");
  const shortcutOpen = elements.shortcutPanel.classList.contains("is-open");
  elements.usagePanel.classList.remove("is-open");
  elements.shortcutPanel.classList.remove("is-open");
  if (panelName === "usage" && !usageOpen) elements.usagePanel.classList.add("is-open");
  if (panelName === "shortcut" && !shortcutOpen) elements.shortcutPanel.classList.add("is-open");
}

function closeHeaderPanels() {
  elements.usagePanel.classList.remove("is-open");
  elements.shortcutPanel.classList.remove("is-open");
}

function applyTheme(theme) {
  const nextTheme = theme === "night" ? "night" : "light";
  document.body.classList.toggle("theme-night", nextTheme === "night");
  document.body.classList.toggle("theme-light", nextTheme === "light");
  localStorage.setItem("scenarioPdfParser.theme", nextTheme);
  elements.themeToggleBtn.textContent = nextTheme === "night" ? i18n("button.lightMode") : i18n("button.nightMode");
}

function toggleTheme() {
  const current = document.body.classList.contains("theme-night") ? "night" : "light";
  applyTheme(current === "night" ? "light" : "night");
}


function normalizeJapaneseText(text) {
  return (text || "")
    .normalize("NFKC")
    .replace(/‧/g, "・")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/([●○・･]?\s*(?:人数|プレイ人数|時間|ロスト率|必須技能|推奨|推奨技能|想定時間|舞台|備考|公開HO|公HO|職業ポイント|職業技能|特記|必須条件|能力値|技能|武器|装甲|探索箇所|追加探索箇所)):/g, "$1：")
    .replace(/!/g, "！")
    .replace(/\?/g, "？");
}


function removeHeaderFooterCandidates(text) {
  const lines = text.split("\n");
  return lines
    .filter((line) => {
      const trimmed = line.trim();
      if (/^\d{1,3}$/.test(trimmed)) return false;
      if (/^Page\s+\d+\s*(\/\s*\d+)?$/i.test(trimmed)) return false;
      if (/^[-_―─]{3,}$/.test(trimmed)) return false;
      return true;
    })
    .join("\n");
}

function removeNearDuplicateLines(text) {
  const lines = text.split("\n");
  const result = [];
  const recent = [];

  for (const line of lines) {
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) {
      result.push(line);
      continue;
    }

    if (recent.includes(normalized)) continue;

    result.push(line);
    recent.push(normalized);
    if (recent.length > 10) recent.shift();
  }

  return result.join("\n");
}

function replaceRoleTokens(text) {
  return text.replace(/\b(KPC|PC|HO\d*|HO)\b/g, (match) => {
    if (match === "KPC") return "{KPC}";
    if (match === "PC") return "{PC}";
    if (/^HO\d*$/.test(match)) return `{${match}}`;
    return match;
  });
}

function isMajorHeading(line) {
  return /^(【[^】]+】|\d{2}[.．][^\n]+|[■◆]([^\n]{1,40})|#{1,6}\s+.+)$/.test(line.trim());
}

function isStructuralStart(line) {
  const current = line.trim();
  if (!current) return true;
  if (/^(【[^】]+】|\d{2}[.．]|#{1,6}\s)/.test(current)) return true;
  if (/^[■◆◇▼●○◎※★▶→↓]/.test(current)) return true;
  if (/^[・･]\S/.test(current)) return true;
  if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(current)) return true;
  if (/^[QＱAＡ]\d*[.．]/.test(current)) return true;
  if (/^\[[^\]]+\]$/.test(current)) return true;
  if (/^［[^］]+］$/.test(current)) return true;
  if (/^\[(能力値|技能|武器)\]/.test(current)) return true;
  if (/^［(探索箇所|図書館情報|追加探索箇所)］/.test(current)) return true;
  if (/^([●○・･]\s*)?(公開HO|公HO|HO\d+|KP情報|シナリオ背景|登場アイテム|NPC|エネミー一覧|シナリオの流れ)$/.test(current)) return true;
  return false;
}

function isDialogueStart(line) {
  return /^[「『]/.test(line.trim());
}

function isClosingQuoteOnly(line) {
  return /^[」』]$/.test(line.trim());
}

function isOpenDialogue(line) {
  const trimmed = line.trim();
  if (!/^[「『]/.test(trimmed)) return false;
  return !/[」』]$/.test(trimmed);
}

function isScenarioMetaLine(line) {
  return /^([●○・･]\s*)?(人数|プレイ人数|時間|ロスト率|必須技能|推奨|推奨技能|想定時間|舞台|備考|公開HO|公HO|職業ポイント|職業技能|特記|必須条件|能力値|技能|武器|装甲|探索箇所|追加探索箇所)([:：]|$)/.test(line.trim());
}

function isDanglingContinuation(line) {
  const current = line.trim();
  if (!current) return false;
  if (/^(固定|の?ため|する|ている|である|ない|となる|だろう|だった|ました|ください|お願い|よう|こと|もの|場合|以上|以下|など|そして|また|ただし|しかし|そのため|これら|上記|現在|今回|今|あなた|彼|彼女|自身|自分|探索者|PC|PL|KP|HO\d*)/.test(current)) return true;
  if (/^[ぁ-んァ-ヶ一-龠]/.test(current) && current.length <= 38 && !isStructuralStart(current) && !isDialogueStart(current)) return true;
  return false;
}

function isCompactMetaBullet(line) {
  return /^([●○・･]\s*)?(人数|プレイ人数|時間|ロスト率|必須技能|推奨|推奨技能|想定時間|舞台|備考)([:：]|$)/.test(line.trim());
}

function isSectionBlockHeading(line) {
  const current = line.trim();
  if (!current) return false;
  if (isMajorHeading(current)) return true;
  if (isCompactMetaBullet(current)) return false;
  if (/^●\s*(公開HO|公HO|禁止事項|プレイ・改変について|ネタバレについて|探索者の作成方法|フロア移動処理)/.test(current)) return true;
  if (/^[●○]\s*[「『].{1,40}/.test(current)) return true;
  if (/^[●○]\s*[^\n]{1,36}(について|とミッション|と命令|一覧|解説|情報|テスト|処理|イベント|探索|戦闘|ルール)$/.test(current)) return true;
  if (/^[▼★]\s*[^\n]{1,44}/.test(current)) return true;
  return false;
}

function isHardContinuation(line) {
  const current = line.trim();
  return /^(固定|の?ため|する|ている|である|ない|となる|だろう|だった|ました|ください|お願い|よう|こと|もの|場合|以上|以下|など|そして|また|ただし|しかし|そのため|これら|上記)/.test(current);
}

function shouldKeepBlankBefore(line) {
  const current = line.trim();
  if (!current) return false;
  if (/^▶/.test(current)) return false;
  return isSectionBlockHeading(current);
}


function concatLines(previous, current) {
  const prev = previous.trimEnd();
  const next = current.trimStart();
  if (!prev) return next;
  if (!next) return prev;
  if (isClosingQuoteOnly(next)) return prev + next;
  if (/[「『（(［\[]$/.test(prev)) return prev + next;
  if (/^[、。，．！？!?：:；;）」』）\]］]/.test(next)) return prev + next;
  if (/[A-Za-z0-9]$/.test(prev) && /^[A-Za-z0-9]/.test(next)) return prev + " " + next;
  return prev + next;
}

function fixMergedHeadings(text) {
  return text
    .replace(/([^\n])([■◆◇▼●○◎※★▶])/g, "$1\n$2")
    .replace(/([^\n])(【[^】]+】)/g, "$1\n\n$2")
    .replace(/(【[^】]+】)([^\n])/g, "$1\n$2")
    .replace(/([^\n])(\d{2}[.．][^\n]+)/g, "$1\n\n$2")
    .replace(/\n+[」』]/g, (match) => match.endsWith("』") ? "』" : "」");
}

function joinJapaneseBrokenLines(text, options) {
  const sourceLines = text.split("\n").map((line) => line.trim()).filter((line, index, array) => {
    if (line) return true;
    return array[index - 1]?.trim() && array[index + 1]?.trim();
  });
  const result = [];

  for (const rawLine of sourceLines) {
    const current = rawLine.trim();
    if (!current) {
      if (result[result.length - 1] !== "") result.push("");
      continue;
    }

    const previous = result[result.length - 1] || "";
    const previousTrimmed = previous.trim();
    const previousIsOpenDialogue = options.keepDialogueBreaks && isOpenDialogue(previousTrimmed);
    const currentStartsDialogue = options.keepDialogueBreaks && isDialogueStart(current);
    const currentStructural = isStructuralStart(current);
    const previousStructural = isStructuralStart(previousTrimmed);
    const currentMeta = options.keepScenarioMetaLines && isScenarioMetaLine(current);
    const previousMeta = options.keepScenarioMetaLines && isScenarioMetaLine(previousTrimmed);
    const previousShortSection = /^[●○■◆▼]\s*[^:：]{1,24}$/.test(previousTrimmed);
    const previousEndsHard = /[。！？!?」』）)]$/.test(previousTrimmed);

    let shouldJoin = false;

    if (previousTrimmed) {
      if (isClosingQuoteOnly(current)) {
        shouldJoin = true;
      } else if (previousIsOpenDialogue) {
        shouldJoin = true;
      } else if (currentStartsDialogue) {
        shouldJoin = false;
      } else if (currentStructural) {
        shouldJoin = false;
      } else if (previousShortSection && !isDanglingContinuation(current)) {
        shouldJoin = false;
      } else if (previousMeta && isDanglingContinuation(current) && (!previousEndsHard || /[:：]$/.test(previousTrimmed))) {
        shouldJoin = true;
      } else if (previousMeta && previousEndsHard) {
        shouldJoin = false;
      } else if (previousStructural && !previousMeta && !isDanglingContinuation(current)) {
        shouldJoin = false;
      } else if (currentMeta) {
        shouldJoin = false;
      } else if (!previousEndsHard) {
        shouldJoin = true;
      } else if (isHardContinuation(current)) {
        shouldJoin = true;
      } else if (!options.keepDialogueBreaks && !currentStructural) {
        shouldJoin = true;
      }
    }

    if (shouldJoin) {
      result[result.length - 1] = concatLines(previous, current);
    } else {
      if (shouldKeepBlankBefore(current) && result.length && result[result.length - 1] !== "") {
        result.push("");
      }
      result.push(current);
    }
  }

  return result.join("\n");
}

function splitSections(text) {
  const lines = text.split("\n");
  const result = [];

  for (const line of lines) {
    const current = line.trim();
    if (!current) {
      if (result[result.length - 1] !== "") result.push("");
      continue;
    }

    if (isSectionBlockHeading(current) && result.length && result[result.length - 1] !== "") {
      result.push("");
    }
    result.push(current);
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n");
}



function splitMergedStructuralTokens(text) {
  return text
    .replace(/([^\n])(●(?:舞台|プレイ人数|必須技能|推奨技能|推奨|想定時間|備考|公開HO|公HO|禁止事項|プレイ・改変について|ネタバレについて|探索者の作成方法|「|『))/g, "$1\n$2")
    .replace(/([^\n])(■(?:概要|共通注意事項|シナリオ利用について|シナリオ背景|登場アイテム|NPC|エネミー一覧|シナリオ内での戦闘処理|シナリオの流れ|導入|グループテスト|ミニテスト|会議室探索|最上階イベント))/g, "$1\n$2")
    .replace(/([^\n])(▼(?:ここで|事前情報|棚|窓の外|スタッフ|警備員|研究員|CIC|最終戦闘))/g, "$1\n$2")
    .replace(/([^\n])(▶(?:更に|「|マルクス|持ち込み|PL|KP|全員|戻る|〈))/g, "$1\n$2")
    .replace(/([^\n])(★(?:HO|拳銃))/g, "$1\n$2")
    .replace(/(。)(上記に相当する行為を固く禁じます。)/g, "$1\n$2")
    .replace(/(。)(ただし卓報告のスクリーンショット)/g, "$1\n$2")
    .replace(/(。)(これらが含まれるものは)/g, "$1\n$2")
    .replace(/(。)(次のページからKP情報記載。)/g, "$1\n$2")
    .replace(/(）)(あなた|彼|それ|現在|今回|主に|イタリア|「Jeans」|マルクス氏|この計画)/g, "$1\n$2");
}

function normalizeScenarioHeadings(text) {
  return text
    .replace(/^([0-9]{2})[.．]([^\n]+)$/gm, "【$1.$2】")
    .replace(/^■\s+/gm, "■")
    .replace(/^●\s+/gm, "●")
    .replace(/^○\s+/gm, "○")
    .replace(/^▼\s+/gm, "▼")
    .replace(/^▶\s+/gm, "▶")
    .replace(/^([・･])\s+/gm, "・")
    .replace(/^HO(\d*)([^\n]*テーラー)$/gm, "HO$1$2")
    .replace(/^●公開HO\s+(HO\d*)/gm, "●公開HO\n$1")
    .replace(/^(●(?:舞台|プレイ人数|必須技能|推奨技能|推奨|想定時間|備考))[:：]?/gm, "$1：");
}

function reduceExcessBlankLines(text) {
  const lines = text.split("\n");
  const result = [];
  for (const line of lines) {
    const current = line.trim();
    const previous = result[result.length - 1] || "";
    if (!current) {
      if (previous && result[result.length - 2] !== "") result.push("");
      continue;
    }
    const previousIsCompactMeta = isCompactMetaBullet(previous);
    const currentIsCompactMeta = isCompactMetaBullet(current) || /^●(?:公開HO|公HO)$/.test(current);
    if (previous === "" && previousIsCompactMeta && currentIsCompactMeta) result.pop();
    result.push(current);
  }
  return result.join("\n").replace(/\n{3,}/g, "\n\n");
}

function repairCommonJapanesePdfBreaks(text) {
  return text
    .replace(/([ァ-ヶ一-龠])\n([ぁ-んァ-ヶ一-龠]{1,3})(機関|構成|地位|星|ント|れた|する|ンを|者|グループ|ランド|ツ|的|り|て|で|に|を|は|が|の)/g, "$1$2$3")
    .replace(/([A-Za-z0-9])\n([A-Za-z0-9])/g, "$1 $2")
    .replace(/([、，])\n/g, "$1")
    .replace(/([（(［\[][^\n]{0,80})\n([^\n]{1,80}[）)］\]])/g, "$1$2")
    .replace(/(職業技能：[^\n]+)\n（任意）/g, "$1（任意）")
    .replace(/目\n星/g, "目星")
    .replace(/社\n会/g, "社会")
    .replace(/ア\nクセサリー/g, "アクセサリー")
    .replace(/ポイ\nント/g, "ポイント")
    .replace(/スパ\nイ/g, "スパイ")
    .replace(/マ\nルクス/g, "マルクス")
    .replace(/グ\nループ/g, "グループ")
    .replace(/ビスポー\nク/g, "ビスポーク")
    .replace(/セッショ\nン/g, "セッション");
}

function formatText(input, preset, options) {
  let text = normalizeJapaneseText(input || "");

  if (options.removePageNumbers || options.removeHeaders) {
    text = removeHeaderFooterCandidates(text);
  }

  text = splitMergedStructuralTokens(text);

  if (options.fixMergedHeadings) {
    text = fixMergedHeadings(text);
  }

  if (options.removeDuplicateLines) {
    text = removeNearDuplicateLines(text);
  }

  if (options.joinBrokenLines) {
    text = joinJapaneseBrokenLines(text, options);
    text = repairCommonJapanesePdfBreaks(text);
    text = splitMergedStructuralTokens(text);
  }

  if (options.replaceRoleTokens) {
    text = replaceRoleTokens(text);
  }

  if (options.markSkillChecks) {
    text = text.replace(/[<＜]([^>＞]+)[>＞]/g, "●《$1》");
    text = text.replace(/^成功[:：]/gm, "● 成功：");
    text = text.replace(/^失敗[:：]/gm, "○ 失敗：");
  }

  if (options.markHandouts) {
    text = text.replace(/^資料[:：](.+)$/gm, "■ 資料情報：$1");
    text = text.replace(/^・([^\n]{1,40}について)$/gm, "■ 資料情報：$1");
  }

  if (options.splitSections || preset === "scenario") {
    text = splitSections(text);
  }

  if (preset === "ccfolia") {
    text = text.replace(/\n{3,}/g, "\n\n").replace(/(【描写】)/g, "◆ シーン描写\n");
  }

  if (preset === "scenario") {
    text = text
      .replace(/^第(.+)$/gm, "# 第$1")
      .replace(/^■\s*(.+)$/gm, "■$1")
      .replace(/【描写】/g, "◆ シーン描写");
  }

  if (preset === "minimal") {
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(^|\n)■\s+/g, "$1■")
    .replace(/(^|\n)(●\s*(?:舞台|プレイ人数|必須技能|推奨技能|推奨|想定時間|備考))[:：]?/g, (match, lead, label) => `${lead}${label.replace(/\s+/g, "")}：`)
    .replace(/(^|\n)(●\s*(?:公開HO|公HO))[:：]?/g, (match, lead, label) => `${lead}${label.replace(/\s+/g, "")}`);

  return text.trim();
}

function getMatches(text, term) {
  if (!term) return [];
  const regex = new RegExp(escapeRegExp(term), "gi");
  return Array.from(text.matchAll(regex), (match) => ({ index: match.index || 0, text: match[0] }));
}

function renderHighlightedOutput() {
  const text = state.outputText || i18n("output.empty");
  const term = state.searchTerm;
  state.matches = getMatches(state.outputText, term);

  if (!term || !state.matches.length) {
    elements.outputBox.textContent = text;
    elements.matchCounter.textContent = term ? `0/0` : `0/0`;
    return;
  }

  const regex = new RegExp(escapeRegExp(term), "gi");
  let lastIndex = 0;
  let matchIndex = 0;
  let html = "";

  for (const match of state.outputText.matchAll(regex)) {
    const index = match.index || 0;
    html += escapeHtml(state.outputText.slice(lastIndex, index));
    const activeClass = matchIndex === state.activeMatchIndex ? " class=\"active-match\"" : "";
    html += `<mark${activeClass}>${escapeHtml(match[0])}</mark>`;
    lastIndex = index + match[0].length;
    matchIndex += 1;
  }

  html += escapeHtml(state.outputText.slice(lastIndex));
  elements.outputBox.innerHTML = html;
  elements.matchCounter.textContent = `${Math.min(state.activeMatchIndex + 1, state.matches.length)}/${state.matches.length}`;

  const active = elements.outputBox.querySelector("mark.active-match");
  if (active) {
    elements.outputBox.focus();
    active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }
}

function updateStats() {
  const text = state.outputText;
  elements.charCount.textContent = text.length.toLocaleString();
  elements.lineCount.textContent = text ? text.split("\n").length.toLocaleString() : "0";
  elements.blockCount.textContent = text ? text.split(/\n{2,}/).filter(Boolean).length.toLocaleString() : "0";
  elements.presetName.textContent = getPresets().find((item) => item.id === state.preset)?.label || "-";
}

function renderAll() {
  renderPresetList();
  renderOptionList();
  renderHighlightedOutput();
  updateStats();
}

function applyFormat() {
  state.formattedText = formatText(state.rawText, state.preset, state.options);
  state.outputText = state.formattedText;
  state.activeMatchIndex = 0;
  renderAll();
}

function renderPresetList() {
  elements.presetList.innerHTML = getPresets().map((preset) => `
    <button class="preset-button ${preset.id === state.preset ? "active" : ""}" data-preset="${preset.id}">
      <strong>${preset.label}</strong>
      <span>${preset.desc}</span>
    </button>
  `).join("");
}

function renderOptionList() {
  elements.optionList.innerHTML = getCleanupOptions().map((option) => `
    <label class="option-row">
      <span>${option.label}</span>
      <input type="checkbox" data-option="${option.key}" ${state.options[option.key] ? "checked" : ""} />
    </label>
  `).join("");
}

async function copyOutput() {
  if (!state.outputText) return;
  try {
    await navigator.clipboard.writeText(state.outputText);
    showToast(i18n("toast.copySuccess"));
  } catch {
    showToast(i18n("toast.copyFail"));
  }
}

function sanitizeTxtFileName(value) {
  const fallback = "scenario_parsed_text.txt";
  const cleaned = (value || fallback).trim().replace(/[\/:*?"<>|]/g, "_");
  if (!cleaned) return fallback;
  return cleaned.toLowerCase().endsWith(".txt") ? cleaned : `${cleaned}.txt`;
}

function setOutputFileName(fileName) {
  state.fileName = sanitizeTxtFileName(fileName);
  if (elements.filenameInput) elements.filenameInput.value = state.fileName;
}

function deriveTxtFileNameFromPdf(fileName) {
  return sanitizeTxtFileName((fileName || "scenario_parsed_text").replace(/\.pdf$/i, "") + ".txt");
}

function downloadText() {
  const blob = new Blob([state.outputText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeTxtFileName(state.fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sendToSnippetTool() {
  const payload = {
    source: "scenario_pdf_parser",
    version: "0.4.6",
    text: state.outputText,
    preset: state.preset,
    options: state.options,
    fileName: sanitizeTxtFileName(state.fileName),
    exportedAt: new Date().toISOString(),
  };

  localStorage.setItem(BRIDGE_TEXT_KEY, state.outputText);
  localStorage.setItem(BRIDGE_PAYLOAD_KEY, JSON.stringify(payload));
  showToast(i18n("toast.bridge"));
  window.setTimeout(() => {
    window.location.href = SNIPPET_TOOL_URL;
  }, 700);
}

function replaceCurrent() {
  if (!state.searchTerm || !state.matches.length) return;
  const match = state.matches[Math.min(state.activeMatchIndex, state.matches.length - 1)];
  state.outputText = state.outputText.slice(0, match.index) + state.replaceTerm + state.outputText.slice(match.index + match.text.length);
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function replaceAll() {
  if (!state.searchTerm) return;
  const regex = new RegExp(escapeRegExp(state.searchTerm), "gi");
  state.outputText = state.outputText.replace(regex, state.replaceTerm);
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function resetReplace() {
  state.outputText = state.formattedText;
  state.activeMatchIndex = 0;
  renderHighlightedOutput();
  updateStats();
}

function goMatch(direction) {
  if (!state.matches.length) return;
  state.activeMatchIndex = (state.activeMatchIndex + direction + state.matches.length) % state.matches.length;
  renderHighlightedOutput();
}

function makeTextItem(item) {
  const transform = item.transform || [1, 0, 0, 1, 0, 0];
  return {
    text: item.str || "",
    x: transform[4] || 0,
    y: transform[5] || 0,
    width: item.width || 0,
    height: item.height || Math.abs(transform[3]) || 10,
  };
}

function splitRowIntoSegments(row, pageWidth) {
  const lineItems = row.items.sort((a, b) => a.x - b.x);
  const segments = [];
  let currentSegment = [];
  let lastRight = null;
  const width = pageWidth || 0;
  const mid = width / 2;
  const columnGap = Math.max(54, width * 0.075);

  for (const item of lineItems) {
    const current = item.text.trim();
    if (!current) continue;
    const gap = lastRight === null ? 0 : item.x - lastRight;
    const previousSegmentLeft = currentSegment.length ? Math.min(...currentSegment.map((entry) => entry.x)) : item.x;
    const crossesIntoRightColumn = width && currentSegment.length && previousSegmentLeft < mid * 0.92 && item.x > mid * 0.92;
    const hasColumnGap = currentSegment.length && gap > columnGap;

    if (hasColumnGap || crossesIntoRightColumn) {
      segments.push(currentSegment);
      currentSegment = [];
    }

    currentSegment.push(item);
    lastRight = item.x + item.width;
  }

  if (currentSegment.length) segments.push(currentSegment);
  return segments;
}

function buildSegmentText(segment) {
  let text = "";
  let lastRight = null;
  let minX = Infinity;
  let maxX = -Infinity;
  let totalHeight = 0;

  for (const item of segment) {
    const current = item.text.trim();
    if (!current) continue;
    minX = Math.min(minX, item.x);
    maxX = Math.max(maxX, item.x + item.width);
    totalHeight += item.height || 10;

    if (!text) {
      text = current;
    } else {
      const gap = lastRight === null ? 0 : item.x - lastRight;
      const needsSpace = gap > Math.max(4, (item.height || 10) * 0.45) && !/^[、。，．！？!?：:；;）」』）\]］]/.test(current);
      text += needsSpace ? ` ${current}` : current;
    }
    lastRight = item.x + item.width;
  }

  return {
    text: normalizeJapaneseText(text).trim(),
    minX,
    maxX,
    centerX: (minX + maxX) / 2,
    height: segment.length ? totalHeight / segment.length : 10,
  };
}

function buildRowsFromItems(items, pageWidth) {
  const sorted = items
    .map(makeTextItem)
    .filter((item) => item.text && item.text.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const rawRows = [];

  for (const item of sorted) {
    const tolerance = Math.max(2.5, item.height * 0.45);
    let row = rawRows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!row) {
      row = { y: item.y, items: [], height: item.height || 10 };
      rawRows.push(row);
    }
    row.items.push(item);
    row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
    row.height = Math.max(row.height, item.height || 10);
  }

  const rows = [];
  for (const row of rawRows) {
    const segments = splitRowIntoSegments(row, pageWidth);
    for (const segment of segments) {
      const built = buildSegmentText(segment);
      if (!built.text) continue;
      rows.push({ ...built, y: row.y, rowHeight: row.height });
    }
  }

  return rows.sort((a, b) => b.y - a.y || a.minX - b.minX);
}

function rowsToText(rows, preserveGaps = false) {
  const ordered = [...rows].sort((a, b) => b.y - a.y || a.minX - b.minX);
  if (!ordered.length) return "";
  const averageHeight = ordered.reduce((sum, row) => sum + (row.rowHeight || row.height || 10), 0) / ordered.length;
  const gapThreshold = Math.max(18, averageHeight * 1.75);
  const lines = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const row = ordered[index];
    const previous = ordered[index - 1];
    if (preserveGaps && previous) {
      const verticalGap = Math.abs(previous.y - row.y);
      if (verticalGap > gapThreshold && lines[lines.length - 1] !== "") {
        lines.push("");
      }
    }
    lines.push(row.text);
  }

  return lines.join("\n");
}

function isFullWidthRow(row, pageWidth) {
  const width = row.maxX - row.minX;
  const mid = pageWidth / 2;
  const text = row.text.trim();
  const leftEdge = pageWidth * 0.16;
  const rightEdge = pageWidth * 0.76;
  const centered = Math.abs(row.centerX - mid) < pageWidth * 0.18;
  const spansMainTextArea = row.minX < leftEdge && row.maxX > rightEdge;
  const veryWide = width > pageWidth * 0.62;
  const centeredWide = centered && width > pageWidth * 0.24 && !/^[●○・･▶→↓▼]/.test(text);

  if (/^(【[^】]+】|\d{2}[.．][^\n]+|次のページから)/.test(text)) return true;
  if (/^■[^\n]{1,48}$/.test(text) && (row.minX < leftEdge || centered)) return true;
  if (/^※/.test(text) && row.minX < leftEdge) return true;
  if (spansMainTextArea || veryWide) return true;
  if (centeredWide) return true;
  return false;
}
function lineGapValue(previous, current) {
  if (!previous || !current) return 0;
  return Math.abs((previous.y || 0) - (current.y || 0));
}

function rowsToTextBlock(rows, preserveGaps = false) {
  const ordered = [...rows].sort((a, b) => b.y - a.y || a.minX - b.minX);
  if (!ordered.length) return "";
  const averageHeight = ordered.reduce((sum, row) => sum + (row.rowHeight || row.height || 10), 0) / ordered.length;
  const gapThreshold = Math.max(18, averageHeight * 1.75);
  const lines = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const row = ordered[index];
    const previous = ordered[index - 1];
    if (preserveGaps && previous && lineGapValue(previous, row) > gapThreshold && lines[lines.length - 1] !== "") {
      lines.push("");
    }
    lines.push(row.text);
  }

  return lines.join("\n");
}

function groupRowsByVerticalContinuity(rows) {
  const ordered = [...rows].sort((a, b) => b.y - a.y || a.minX - b.minX);
  if (!ordered.length) return [];
  const averageHeight = ordered.reduce((sum, row) => sum + (row.rowHeight || row.height || 10), 0) / ordered.length;
  const splitGap = Math.max(32, averageHeight * 2.7);
  const groups = [];
  let currentGroup = [];

  for (const row of ordered) {
    const previous = currentGroup[currentGroup.length - 1];
    if (previous && lineGapValue(previous, row) > splitGap) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(row);
  }

  if (currentGroup.length) groups.push(currentGroup);
  return groups;
}

function columnRowsToText(rows, pageWidth, options = {}) {
  if (!rows.length) return "";
  const mid = pageWidth / 2;
  const left = [];
  const right = [];

  for (const row of rows) {
    if (row.centerX < mid) left.push(row);
    else right.push(row);
  }

  const hasTwoColumns = left.length >= 2 && right.length >= 2;
  if (!hasTwoColumns) return rowsToTextBlock(rows, options.preservePdfParagraphBreaks);

  const chunks = [];
  const leftText = rowsToTextBlock(left, options.preservePdfParagraphBreaks).trim();
  const rightText = rowsToTextBlock(right, options.preservePdfParagraphBreaks).trim();
  if (leftText) chunks.push(leftText);
  if (rightText) chunks.push(rightText);
  return chunks.join("\n\n");
}

function orderRowsForReading(rows, pageWidth, options = {}) {
  if (!pageWidth || rows.length < 8) return rowsToText(rows, options.preservePdfParagraphBreaks);

  const sortedRows = [...rows].sort((a, b) => b.y - a.y || a.minX - b.minX);
  const mid = pageWidth / 2;
  const leftCount = sortedRows.filter((row) => !isFullWidthRow(row, pageWidth) && row.centerX < mid).length;
  const rightCount = sortedRows.filter((row) => !isFullWidthRow(row, pageWidth) && row.centerX >= mid).length;
  const hasTwoColumns = leftCount >= 3 && rightCount >= 3;
  if (!hasTwoColumns) return rowsToText(rows, options.preservePdfParagraphBreaks);

  const chunks = [];
  let columnBuffer = [];

  const pushText = (text) => {
    const chunk = text.trim();
    if (!chunk) return;
    chunks.push(chunk);
  };

  const flushColumnBuffer = () => {
    if (!columnBuffer.length) return;
    pushText(columnRowsToText(columnBuffer, pageWidth, options));
    columnBuffer = [];
  };

  for (const row of sortedRows) {
    if (isFullWidthRow(row, pageWidth)) {
      flushColumnBuffer();
      pushText(rowsToTextBlock([row], options.preservePdfParagraphBreaks));
    } else {
      columnBuffer.push(row);
    }
  }

  flushColumnBuffer();
  return chunks.join("\n");
}


async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) {
    throw new Error("pdf.jsが読み込まれていません。");
  }

  const arrayBuffer = await file.arrayBuffer();
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
    const rows = buildRowsFromItems(content.items || [], viewport.width);
    const pageText = orderRowsForReading(rows, viewport.width, state.options);
    if (pageText.trim()) pages.push(pageText);
  }

  return pages.join("\n\n");
}

async function handlePdfFile(file) {
  if (!file || file.type !== "application/pdf") {
    showToast(i18n("toast.pdfOnly"));
    return;
  }

  elements.fileStatus.textContent = `${i18n("file.loading")}${file.name}`;
  try {
    state.rawText = await extractTextFromPdf(file);
    setOutputFileName(deriveTxtFileNameFromPdf(file.name));
    elements.fileStatus.textContent = `${i18n("file.loaded")}${file.name}`;
    applyFormat();
    showToast(i18n("toast.pdfSuccess"));
  } catch (error) {
    console.error(error);
    elements.fileStatus.textContent = `${i18n("file.failed")}${file.name}`;
    showToast(i18n("toast.pdfFail"));
  }
}

function resetToolWithConfirm() {
  if (!window.confirm(i18n("confirm.resetAll"))) return;
  state.rawText = "";
  state.formattedText = "";
  state.outputText = "";
  state.searchTerm = "";
  state.replaceTerm = "";
  state.activeMatchIndex = 0;
  state.matches = [];
  elements.searchInput.value = "";
  elements.replaceInput.value = "";
  elements.pdfInput.value = "";
  elements.fileStatus.textContent = i18n("pdf.noFileStatus");
  setOutputFileName("scenario_parsed_text.txt");
  renderHighlightedOutput();
  updateStats();
}

function bindEvents() {
  elements.languageToggleBtn.addEventListener("click", () => {
    window.SCENARIO_PDF_PARSER_LANGUAGE?.toggleLanguage();
  });

  window.addEventListener("scenario-pdf-parser-language-change", () => {
    renderAll();
    applyTheme(localStorage.getItem("scenarioPdfParser.theme") || (document.body.classList.contains("theme-night") ? "night" : "light"));
  });

  elements.usageToggleBtn.addEventListener("click", () => setHeaderPanel("usage"));
  elements.shortcutToggleBtn.addEventListener("click", () => setHeaderPanel("shortcut"));
  elements.themeToggleBtn.addEventListener("click", toggleTheme);
  elements.copyBtn.addEventListener("click", copyOutput);
  elements.downloadBtn.addEventListener("click", downloadText);
  elements.sendSnippetBtn.addEventListener("click", sendToSnippetTool);
  elements.filenameInput.addEventListener("input", (event) => {
    state.fileName = event.target.value;
  });
  elements.filenameInput.addEventListener("blur", () => setOutputFileName(state.fileName));

  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    state.activeMatchIndex = 0;
    renderHighlightedOutput();
  });

  elements.replaceInput.addEventListener("input", (event) => {
    state.replaceTerm = event.target.value;
  });

  elements.prevBtn.addEventListener("click", () => goMatch(-1));
  elements.nextBtn.addEventListener("click", () => goMatch(1));
  elements.replaceBtn.addEventListener("click", replaceCurrent);
  elements.replaceAllBtn.addEventListener("click", replaceAll);
  elements.resetReplaceBtn.addEventListener("click", resetReplace);

  elements.presetList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (!button) return;
    state.preset = button.dataset.preset;
    applyFormat();
  });

  elements.optionList.addEventListener("change", (event) => {
    const input = event.target.closest("[data-option]");
    if (!input) return;
    state.options[input.dataset.option] = input.checked;
    applyFormat();
  });

  elements.pdfInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    handlePdfFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
    });
  });

  elements.dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files?.[0];
    handlePdfFile(file);
  });

  document.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === "Escape") {
      event.preventDefault();
      if (isHeaderPanelOpen()) {
        closeHeaderPanels();
      } else {
        resetToolWithConfirm();
      }
      return;
    }

    if (!modifier) return;

    if (key === "o" && !event.shiftKey) {
      event.preventDefault();
      elements.pdfInput.click();
    } else if (event.shiftKey && key === "f") {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    } else if (event.shiftKey && key === "t") {
      event.preventDefault();
      toggleTheme();
    } else if (event.shiftKey && key === "c") {
      event.preventDefault();
      copyOutput();
    } else if (event.shiftKey && key === "s") {
      event.preventDefault();
      downloadText();
    } else if (event.key === "Enter") {
      event.preventDefault();
      applyFormat();
    }
  });
}

bindEvents();
setOutputFileName(state.fileName);
applyTheme(localStorage.getItem("scenarioPdfParser.theme") || "light");
applyFormat();
