(() => {
  "use strict";

  const BASE_OCCUPATIONS = Array.isArray(window.OCCUPATIONS) ? window.OCCUPATIONS : [];
  const EXTRA_7E_OCCUPATIONS = Array.isArray(window.OCCUPATIONS_7E_EXTRA) ? window.OCCUPATIONS_7E_EXTRA : [];
  const OCCUPATIONS = [...BASE_OCCUPATIONS, ...EXTRA_7E_OCCUPATIONS];
  const FEATURES = window.FEATURES || [];
  const EXPERIENCE_PACKAGES = window.EXPERIENCE_PACKAGES || [];

  const SOURCES = [
    "すべて",
    "6版・基本ルールブック",
    "クトゥルフ2010",
    "クトゥルフ2015",
    "7版・基本ルールブック",
    "クトゥルフ2020",
    "プレイングガイド",
    "幻夢境",
    "クトゥルフと帝国",
    "クトゥルフ・バイ・ガスライト",
    "比叡山炎上",
    "パルプクトゥルフ",
  ];

  const SKILL_CHIPS_BY_RULE = {
    all: [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "MA", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠す", "隠密", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "値切り", "母国語", "他の言語",
      "医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "生物学", "地質学", "電子工学", "天文学", "自然", "博物学", "物理学", "法律", "薬学", "歴史", "サバイバル",
    ],
    "6e": [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "MA", "射撃", "投擲",
      "応急手当", "鍵開け", "隠す", "隠れる", "忍び歩き", "写真術", "精神分析", "追跡", "跳躍",
      "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "値切り", "母国語", "他の言語",
      "医学", "オカルト", "化学", "芸術", "経理", "考古学", "コンピューター", "人類学", "生物学", "地質学", "電子工学", "天文学", "博物学", "物理学", "法律", "薬学", "歴史", "サバイバル",
    ],
    "7e": [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠密", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "母国語", "他の言語",
      "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル",
    ],
    pulp: [
      "目星", "聞き耳", "図書館", "心理学", "回避", "近接戦闘", "射撃", "投擲",
      "応急手当", "鍵開け", "手さばき", "隠密", "写真術", "精神分析", "追跡", "登攀", "跳躍",
      "鑑定", "運転", "乗馬", "水泳", "製作", "操縦", "ナビゲート", "変装", "機械修理", "重機械操作", "電気修理",
      "言いくるめ", "信用", "説得", "威圧", "魅惑", "母国語", "他の言語",
      "医学", "オカルト", "芸術", "経理", "考古学", "コンピューター", "科学", "人類学", "電子工学", "自然", "法律", "歴史", "サバイバル",
    ],
  };

  const SKILL_ALIASES = {
    近接戦闘: ["近接戦闘", "近接格闘", "キック", "組み付き", "こぶし（パンチ）", "こぶし", "頭突き"],
    MA: ["MA", "マーシャルアーツ"],
    射撃: ["射撃", "拳銃", "サブマシンガン", "ショットガン", "マシンガン", "ライフル"],
    手さばき: ["手さばき", "隠す"],
    隠密: ["隠密", "隠れる", "忍び歩き"],
    他の言語: ["他の言語", "ほかの言語", "別の言語"],
  };

  const state = {
    tab: "occupation",
    ruleType: "all",
    query: "",
    source: "すべて",
    selectedSkills: new Set(["目星", "心理学"]),
    selectedOccupationId: OCCUPATIONS[0]?.id || "",
    selectedPackageId: EXPERIENCE_PACKAGES[0]?.id || "",
    selectedFeatureId: FEATURES[0]?.id || "",
    featureCount: 3,
    rolledFeatures: [],
    skillExpanded: false,
    theme: "light",
  };

  const el = {
    usageToggle: document.getElementById("usageToggle"),
    shortcutToggle: document.getElementById("shortcutToggle"),
    usagePanel: document.getElementById("usagePanel"),
    shortcutPanel: document.getElementById("shortcutPanel"),
    themeToggle: document.getElementById("themeToggle"),
    sourceSelect: document.getElementById("sourceSelect"),
    keywordInput: document.getElementById("keywordInput"),
    skillChipTitle: document.getElementById("skillChipTitle"),
    skillExpandToggle: document.getElementById("skillExpandToggle"),
    skillChipArea: document.getElementById("skillChipArea"),
    clearSkillsButton: document.getElementById("clearSkillsButton"),
    occupationList: document.getElementById("occupationList"),
    occupationDetail: document.getElementById("occupationDetail"),
    featureResults: document.getElementById("featureResults"),
    featureDetail: document.getElementById("featureDetail"),
    rollFeaturesButton: document.getElementById("rollFeaturesButton"),
    packageList: document.getElementById("packageList"),
    packageDetail: document.getElementById("packageDetail"),
    outputText: document.getElementById("outputText"),
    copyOutputButton: document.getElementById("copyOutputButton"),
    clearOutputButton: document.getElementById("clearOutputButton"),
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sourceLabel(item) {
    return `${item.sourceShort || item.source || ""} ${item.page || ""}`.trim();
  }

  function skillOptionText(option) {
    if (typeof option === "string") return option;
    if (!option || typeof option !== "object") return "";
    const label = option.label || "";
    const options = Array.isArray(option.options) ? option.options.join(" / ") : "";
    return options ? `${label}：${options}` : label;
  }

  function getSkillOptionSearchTexts(item) {
    if (!Array.isArray(item.skillOptions)) return [];
    return item.skillOptions.flatMap((option) => {
      if (typeof option === "string") return [option];
      if (!option || typeof option !== "object") return [];
      return [option.label || "", ...(Array.isArray(option.options) ? option.options : [])].filter(Boolean);
    });
  }

  function getOccupationSkillTexts(item) {
    return [...(item.skills || []), ...getSkillOptionSearchTexts(item)];
  }

  function formatOccupation(item) {
    if (!item) return "";
    const lines = [];
    lines.push(`職業サンプル：${item.name} （${sourceLabel(item)}）`);
    lines.push(`職業技能：${(item.skills || []).join("、")}`);
    if (item.skillOptions?.length) lines.push(`選択技能：${item.skillOptions.map(skillOptionText).filter(Boolean).join("、")}`);
    lines.push(`職業技能ポイント：${item.pointFormula || ""}`);
    if (item.ruleType === "6e" && item.special) lines.push(`職業特記：${item.special}`);
    if ((item.ruleType === "7e" || item.ruleType === "pulp") && item.credit) lines.push(`信用：${item.credit}`);
    if (item.ruleType === "pulp" && item.alliesExample) lines.push(`協力者の例：${item.alliesExample}`);
    if (item.note) lines.push(`備考：${item.note}`);
    return lines.join("\n");
  }

  function formatFeature(item) {
    if (!item) return "";
    const lines = [`[${item.dice}]  ${item.name}`, `効果：${item.effect || ""}`];
    if (item.note) lines.push(`注記：${item.note}`);
    return lines.join("\n");
  }

  function isIndentedPackageNote(note) {
    return /^(一般兵士|士官|運転（|応急手当|医学、|人類学、|科学（|伝承（夢）|ほかの言語（夢語）|夢見)/.test(note);
  }

  function formatPackageNoteLine(note) {
    return `${isIndentedPackageNote(note) ? "　" : ""}・${note}`;
  }

  function formatPackage(item) {
    if (!item) return "";
    const notes = (item.notes || []).map(formatPackageNoteLine).join("\n");
    return `【経験パッケージ：${item.name}】
内容：${item.description || ""}
備考：
${notes}`;
  }

  function appendOutput(text) {
    const current = el.outputText.value.trim();
    el.outputText.value = current ? `${current}\n\n${text}` : text;
  }

  function getMetaLines(item) {
    const lines = [];
    if (item.ruleType === "6e" && item.special) lines.push(["職業特記", item.special]);
    if ((item.ruleType === "7e" || item.ruleType === "pulp") && item.credit) lines.push(["信用", item.credit]);
    if (item.ruleType === "pulp" && item.alliesExample) lines.push(["協力者の例", item.alliesExample]);
    return lines;
  }

  function getRuleLabel() {
    if (state.ruleType === "all") return "全て";
    if (state.ruleType === "6e") return "6版";
    if (state.ruleType === "7e") return "7版";
    return "パルプ";
  }

  function getFilteredOccupations() {
    const query = state.query.trim().toLowerCase();
    return OCCUPATIONS
      .filter((item) => state.ruleType === "all" || item.ruleType === state.ruleType)
      .filter((item) => state.source === "すべて" || item.source === state.source || item.sourceShort === state.source)
      .filter((item) => {
        if (!query) return true;
        const text = [item.name, item.description, item.source, item.sourceShort, ...(item.skills || []), ...getSkillOptionSearchTexts(item), ...(item.keywords || []), ...(item.ruleLabels || [])].join(" ").toLowerCase();
        return text.includes(query);
      })
      .map((item) => ({
        ...item,
        score: [...state.selectedSkills].filter((skill) => {
          const aliases = SKILL_ALIASES[skill] || [skill];
          return getOccupationSkillTexts(item).some((s) => aliases.some((alias) => s.includes(alias) || alias.includes(s)));
        }).length,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"));
  }

  function renderSources() {
    el.sourceSelect.innerHTML = SOURCES.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("");
    el.sourceSelect.value = state.source;
  }

  function renderSkillChips() {
    const chips = SKILL_CHIPS_BY_RULE[state.ruleType] || SKILL_CHIPS_BY_RULE.all;
    el.skillChipTitle.textContent = `技能チップ検索（${getRuleLabel()}）`;
    el.skillExpandToggle.textContent = state.skillExpanded ? "△ 最小化" : "▽ 展開";
    el.skillChipArea.classList.toggle("is-expanded", state.skillExpanded);
    el.skillChipArea.classList.toggle("is-collapsed", !state.skillExpanded);
    el.skillChipArea.innerHTML = chips.map((skill) => {
      const active = state.selectedSkills.has(skill) ? " is-active" : "";
      return `<button class="skill-chip${active}" type="button" data-skill="${escapeHtml(skill)}">${escapeHtml(skill)}</button>`;
    }).join("");
  }

  function renderRuleButtons() {
    document.querySelectorAll(".rule-button").forEach((button) => button.classList.toggle("is-active", button.dataset.rule === state.ruleType));
  }

  function renderTabs() {
    document.querySelectorAll(".tab-button").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === state.tab));
    document.getElementById("occupationTab").classList.toggle("is-hidden", state.tab !== "occupation");
    document.getElementById("featureTab").classList.toggle("is-hidden", state.tab !== "feature");
    document.getElementById("packageTab").classList.toggle("is-hidden", state.tab !== "package");
    el.occupationDetail.classList.toggle("is-hidden", state.tab !== "occupation");
    el.featureDetail.classList.toggle("is-hidden", state.tab !== "feature");
    el.packageDetail.classList.toggle("is-hidden", state.tab !== "package");
  }

  function renderOccupationList() {
    const items = getFilteredOccupations();
    if (!items.length) {
      el.occupationList.innerHTML = `<div class="occupation-card"><p class="card-text">条件に一致する職業サンプルがありません。</p></div>`;
      return;
    }
    el.occupationList.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedOccupationId ? " is-selected" : "";
      const meta = getMetaLines(item).map(([label, value]) => `<p class="extra-line">${escapeHtml(label)}：${escapeHtml(value)}</p>`).join("");
      const score = item.score > 0 ? `<span class="score-badge">技能一致 ${item.score}</span>` : "";
      return `
        <button class="occupation-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row"><h3 class="card-title">${escapeHtml(item.name)}</h3><span class="source-line">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span>${score}</div>
          <div class="card-content occupation-content">
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">技能：${escapeHtml((item.skills || []).join(" / "))}</p>
            ${item.skillOptions?.length ? `<p class="card-text">選択技能：${escapeHtml(item.skillOptions.map(skillOptionText).filter(Boolean).join(" / "))}</p>` : ""}
            ${meta}
            <p class="card-text">職業P：${escapeHtml(item.pointFormula || "")}</p>
          </div>
        </button>`;
    }).join("");
  }

  function renderOccupationDetail() {
    const item = OCCUPATIONS.find((occ) => occ.id === state.selectedOccupationId) || OCCUPATIONS[0];
    if (!item) { el.occupationDetail.innerHTML = ""; return; }
    const meta = getMetaLines(item).map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</p>`).join("");
    const skillOptions = item.skillOptions?.length ? `<p><strong>選択技能</strong><br>${escapeHtml(item.skillOptions.map(skillOptionText).filter(Boolean).join(" / "))}</p>` : "";
    el.occupationDetail.innerHTML = `
      <div class="card-title-row"><h2>${escapeHtml(item.name)} <span class="source-line">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span></h2><span class="score-badge">詳細</span></div>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <p class="detail-text">${escapeHtml(item.description || "")}</p>
      <div class="detail-box occupation-detail-box">
        <p><strong>職業技能</strong><br>${escapeHtml((item.skills || []).join(" / "))}</p>
        ${skillOptions}
        <p><strong>職業技能ポイント</strong><br>${escapeHtml(item.pointFormula || "")}</p>
        ${meta}
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary" id="addOccupationButton" type="button">出力に追加</button>
        <button class="btn btn-soft" id="copySkillsButton" type="button">この職業技能をコピー</button>
      </div>`;
    document.getElementById("addOccupationButton")?.addEventListener("click", () => appendOutput(formatOccupation(item)));
    document.getElementById("copySkillsButton")?.addEventListener("click", () => copyText(getOccupationSkillTexts(item).join("、")));
  }

  function rollFeatureDice() {
    const d6 = Math.floor(Math.random() * 6) + 1;
    const d10 = Math.floor(Math.random() * 10) + 1;
    return `${d6}-${d10}`;
  }

  function rollUniqueFeatures(count) {
    const results = [];
    const used = new Set();
    let guard = 0;
    while (results.length < count && guard < 300) {
      guard += 1;
      const dice = rollFeatureDice();
      if (used.has(dice)) continue;
      const feature = FEATURES.find((item) => item.dice === dice);
      if (!feature) continue;
      used.add(dice);
      results.push(feature);
    }
    if (results.length < count) {
      FEATURES.forEach((feature) => {
        if (results.length < count && !used.has(feature.dice)) results.push(feature);
      });
    }
    return results;
  }

  function renderFeatureCountButtons() {
    document.querySelectorAll(".count-button").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.count) === state.featureCount));
  }

  function renderFeatures() {
    const items = state.rolledFeatures.length ? state.rolledFeatures : FEATURES.slice(0, state.featureCount);
    if (!state.selectedFeatureId && items[0]) state.selectedFeatureId = items[0].id;
    el.featureResults.innerHTML = items.map((item) => {
      const selected = item.id === state.selectedFeatureId ? " is-selected" : "";
      const note = item.note ? `<p class="feature-note">${escapeHtml(item.note)}</p>` : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
      return `
        <div class="feature-card${selected}" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row"><h3 class="card-title">[${escapeHtml(item.dice)}] ${escapeHtml(item.name)}</h3><span class="source-line">${escapeHtml(sourceLabel(item))}</span>${tags}</div>
          <div class="card-content feature-content">
            <p class="card-text">効果：${escapeHtml(item.effect || "")}</p>
            ${note}
          </div>
          <button class="btn btn-soft add-feature-button" type="button" data-id="${escapeHtml(item.id)}">出力に追加</button>
        </div>`;
    }).join("");
  }

  function renderPackageList() {
    if (!EXPERIENCE_PACKAGES.length) {
      el.packageList.innerHTML = `<div class="package-card"><p class="card-text">経験パッケージデータがありません。</p></div>`;
      return;
    }
    el.packageList.innerHTML = EXPERIENCE_PACKAGES.map((item) => {
      const selected = item.id === state.selectedPackageId ? " is-selected" : "";
      const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
      return `
        <button class="package-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
          <div class="card-title-row"><h3 class="card-title">${escapeHtml(item.name)}</h3>${tags}</div>
          <div class="card-content package-content">
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">内容：${escapeHtml(item.description || "")}</p>
          </div>
        </button>`;
    }).join("");
  }

  function renderFeatureDetail() {
    const item = FEATURES.find((feature) => feature.id === state.selectedFeatureId) || state.rolledFeatures[0] || FEATURES[0];
    if (!item) { el.featureDetail.innerHTML = ""; return; }
    state.selectedFeatureId = item.id;
    const note = item.note ? `<p class="feature-note feature-note-detail">${escapeHtml(item.note)}</p>` : "";
    const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
    el.featureDetail.innerHTML = `
      <div class="card-title-row"><h2>[${escapeHtml(item.dice)}] ${escapeHtml(item.name)}</h2>${tags}</div>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <div class="detail-box feature-detail-box">
        <p class="detail-text">効果：${escapeHtml(item.effect || "")}</p>
        ${note}
      </div>
      <button class="btn btn-primary" type="button" id="addFeatureDetailButton">出力に追加</button>`;
    document.getElementById("addFeatureDetailButton")?.addEventListener("click", () => appendOutput(formatFeature(item)));
  }

  function renderPackageDetail() {
    const item = EXPERIENCE_PACKAGES.find((pack) => pack.id === state.selectedPackageId) || EXPERIENCE_PACKAGES[0];
    if (!item) { el.packageDetail.innerHTML = ""; return; }
    const notes = (item.notes || []).map((note) => `
      <div class="package-note${isIndentedPackageNote(note) ? " is-indented" : ""}">
        <span class="package-note-bullet">・</span>
        <span class="package-note-text">${escapeHtml(note)}</span>
      </div>`).join("");
    el.packageDetail.innerHTML = `
      <h2>${escapeHtml(item.name)}</h2>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <div class="detail-box package-detail-box">
        <p class="detail-text">内容：${escapeHtml(item.description || "")}</p>
        <div class="package-note-list">${notes}</div>
      </div>
      <button class="btn btn-primary" type="button" id="addPackageButton">出力に追加</button>`;
    document.getElementById("addPackageButton")?.addEventListener("click", () => appendOutput(formatPackage(item)));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }
  }

  function render() {
    renderTabs();
    renderRuleButtons();
    renderSkillChips();
    renderOccupationList();
    renderOccupationDetail();
    renderFeatureCountButtons();
    renderFeatures();
    renderFeatureDetail();
    renderPackageList();
    renderPackageDetail();
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => { state.tab = button.dataset.tab; render(); });
    });
    document.querySelectorAll(".rule-button").forEach((button) => {
      button.addEventListener("click", () => { state.ruleType = button.dataset.rule; state.selectedSkills.clear(); render(); });
    });
    el.sourceSelect.addEventListener("change", () => { state.source = el.sourceSelect.value; render(); });
    el.keywordInput.addEventListener("input", () => { state.query = el.keywordInput.value; render(); });
    el.skillExpandToggle.addEventListener("click", () => { state.skillExpanded = !state.skillExpanded; renderSkillChips(); });
    el.clearSkillsButton.addEventListener("click", () => { state.selectedSkills.clear(); render(); });
    el.skillChipArea.addEventListener("click", (event) => {
      const button = event.target.closest(".skill-chip");
      if (!button) return;
      const skill = button.dataset.skill;
      if (state.selectedSkills.has(skill)) state.selectedSkills.delete(skill);
      else state.selectedSkills.add(skill);
      render();
    });
    el.occupationList.addEventListener("click", (event) => {
      const card = event.target.closest(".occupation-card[data-id]");
      if (!card) return;
      state.selectedOccupationId = card.dataset.id;
      render();
    });
    document.querySelectorAll(".count-button").forEach((button) => {
      button.addEventListener("click", () => { state.featureCount = Number(button.dataset.count); renderFeatureCountButtons(); });
    });
    el.rollFeaturesButton.addEventListener("click", () => {
      state.rolledFeatures = rollUniqueFeatures(state.featureCount);
      state.selectedFeatureId = state.rolledFeatures[0]?.id || FEATURES[0]?.id || "";
      render();
    });
    el.featureResults.addEventListener("click", (event) => {
      const addButton = event.target.closest(".add-feature-button");
      if (addButton) {
        const item = FEATURES.find((feature) => feature.id === addButton.dataset.id);
        appendOutput(formatFeature(item));
        return;
      }
      const card = event.target.closest(".feature-card[data-id]");
      if (!card) return;
      state.selectedFeatureId = card.dataset.id;
      render();
    });
    el.packageList.addEventListener("click", (event) => {
      const card = event.target.closest(".package-card[data-id]");
      if (!card) return;
      state.selectedPackageId = card.dataset.id;
      render();
    });
    el.copyOutputButton.addEventListener("click", () => copyText(el.outputText.value));
    el.clearOutputButton.addEventListener("click", () => { el.outputText.value = ""; });
    el.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.body.classList.toggle("theme-dark", state.theme === "dark");
      document.body.classList.toggle("theme-light", state.theme === "light");
      el.themeToggle.textContent = state.theme === "dark" ? "ライトモード" : "ナイトモード";
    });
    el.usageToggle.addEventListener("click", () => { el.usagePanel.classList.toggle("is-hidden"); el.shortcutPanel.classList.add("is-hidden"); });
    el.shortcutToggle.addEventListener("click", () => { el.shortcutPanel.classList.toggle("is-hidden"); el.usagePanel.classList.add("is-hidden"); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { el.usagePanel.classList.add("is-hidden"); el.shortcutPanel.classList.add("is-hidden"); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") copyText(el.outputText.value);
    });
  }

  function init() {
    renderSources();
    if (OCCUPATIONS[0]) el.outputText.value = formatOccupation(OCCUPATIONS[0]);
    bindEvents();
    render();
  }

  init();
})();
