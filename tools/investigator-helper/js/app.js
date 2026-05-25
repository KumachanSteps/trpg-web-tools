(() => {
  "use strict";

  const OCCUPATIONS = window.OCCUPATIONS || [];
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
      "目星",
      "聞き耳",
      "図書館",
      "心理学",
      "回避",
      "近接戦闘",
      "MA",
      "射撃",
      "投擲",
      "応急手当",
      "鍵開け",
      "手さばき",
      "隠す",
      "隠密",
      "隠れる",
      "忍び歩き",
      "写真術",
      "精神分析",
      "追跡",
      "登攀",
      "跳躍",
      "鑑定",
      "運転",
      "乗馬",
      "水泳",
      "製作",
      "操縦",
      "ナビゲート",
      "変装",
      "機械修理",
      "重機械操作",
      "電気修理",
      "言いくるめ",
      "信用",
      "説得",
      "威圧",
      "魅惑",
      "値切り",
      "母国語",
      "他の言語",
      "医学",
      "オカルト",
      "化学",
      "芸術",
      "経理",
      "考古学",
      "コンピューター",
      "科学",
      "人類学",
      "生物学",
      "地質学",
      "電子工学",
      "天文学",
      "自然",
      "博物学",
      "物理学",
      "法律",
      "薬学",
      "歴史",
      "サバイバル",
    ],
    "6e": [
      "目星",
      "聞き耳",
      "図書館",
      "心理学",
      "回避",
      "近接戦闘",
      "MA",
      "射撃",
      "投擲",
      "応急手当",
      "鍵開け",
      "隠す",
      "隠れる",
      "忍び歩き",
      "写真術",
      "精神分析",
      "追跡",
      "跳躍",
      "運転",
      "乗馬",
      "水泳",
      "製作",
      "操縦",
      "ナビゲート",
      "変装",
      "機械修理",
      "重機械操作",
      "電気修理",
      "言いくるめ",
      "信用",
      "説得",
      "値切り",
      "母国語",
      "他の言語",
      "医学",
      "オカルト",
      "化学",
      "芸術",
      "経理",
      "考古学",
      "コンピューター",
      "人類学",
      "生物学",
      "地質学",
      "電子工学",
      "天文学",
      "博物学",
      "物理学",
      "法律",
      "薬学",
      "歴史",
      "サバイバル",
    ],
    "7e": [
      "目星",
      "聞き耳",
      "図書館",
      "心理学",
      "回避",
      "近接戦闘",
      "射撃",
      "投擲",
      "応急手当",
      "鍵開け",
      "手さばき",
      "隠密",
      "写真術",
      "精神分析",
      "追跡",
      "登攀",
      "跳躍",
      "鑑定",
      "運転",
      "乗馬",
      "水泳",
      "製作",
      "操縦",
      "ナビゲート",
      "変装",
      "機械修理",
      "重機械操作",
      "電気修理",
      "言いくるめ",
      "信用",
      "説得",
      "威圧",
      "魅惑",
      "母国語",
      "他の言語",
      "医学",
      "オカルト",
      "芸術",
      "経理",
      "考古学",
      "コンピューター",
      "科学",
      "人類学",
      "電子工学",
      "自然",
      "法律",
      "歴史",
      "サバイバル",
    ],
    pulp: [
      "目星",
      "聞き耳",
      "図書館",
      "心理学",
      "回避",
      "近接戦闘",
      "射撃",
      "投擲",
      "応急手当",
      "鍵開け",
      "手さばき",
      "隠密",
      "写真術",
      "精神分析",
      "追跡",
      "登攀",
      "跳躍",
      "鑑定",
      "運転",
      "乗馬",
      "水泳",
      "製作",
      "操縦",
      "ナビゲート",
      "変装",
      "機械修理",
      "重機械操作",
      "電気修理",
      "言いくるめ",
      "信用",
      "説得",
      "威圧",
      "魅惑",
      "母国語",
      "他の言語",
      "医学",
      "オカルト",
      "芸術",
      "経理",
      "考古学",
      "コンピューター",
      "科学",
      "人類学",
      "電子工学",
      "自然",
      "法律",
      "歴史",
      "サバイバル",
    ],
  };

  const SKILL_ALIASES = {
    近接戦闘: ["近接戦闘", "キック", "組み付き", "こぶし（パンチ）", "こぶし", "頭突き"],
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
    featureCount: 3,
    rolledFeatures: [],
    skillExpanded: false,
    theme: "light",
  };

  const el = {
    appRoot: document.getElementById("appRoot"),
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
    rollFeaturesButton: document.getElementById("rollFeaturesButton"),
    featureCountButtons: document.getElementById("featureCountButtons"),
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

  function formatOccupation(item) {
    if (!item) return "";
    const lines = [];
    lines.push(`職業サンプル：${item.name} （${sourceLabel(item)}）`);
    lines.push(`職業技能：${(item.skills || []).join("、")}`);
    if (item.skillOptions?.length) lines.push(`選択技能：${item.skillOptions.join("、")}`);
    lines.push(`職業技能ポイント：${item.pointFormula || ""}`);
    if (item.ruleType === "6e" && item.special) lines.push(`職業特記：${item.special}`);
    if ((item.ruleType === "7e" || item.ruleType === "pulp") && item.credit) lines.push(`信用：${item.credit}`);
    if (item.ruleType === "pulp" && item.alliesExample) lines.push(`協力者の例：${item.alliesExample}`);
    if (item.note) lines.push(`備考：${item.note}`);
    return lines.join("\n");
  }

  function formatFeature(item) {
    if (!item) return "";
    return `[${item.dice}]  ${item.name}\n効果：${item.effect}`;
  }

  function formatPackage(item) {
    if (!item) return "";
    const notes = (item.notes || []).map((note) => `・${note}`).join("\n");
    return `【経験パッケージ：${item.name}】\n内容：${item.description || ""}\n備考：\n${notes}`;
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

  function getFilteredOccupations() {
    const query = state.query.trim().toLowerCase();
    return OCCUPATIONS
      .filter((item) => state.ruleType === "all" || item.ruleType === state.ruleType)
      .filter((item) => state.source === "すべて" || item.source === state.source)
      .filter((item) => {
        if (!query) return true;
        const text = [
          item.name,
          item.description,
          item.source,
          item.sourceShort,
          ...(item.skills || []),
          ...(item.skillOptions || []),
          ...(item.keywords || []),
          ...(item.ruleLabels || []),
        ].join(" ").toLowerCase();
        return text.includes(query);
      })
      .map((item) => ({
        ...item,
        score: [...state.selectedSkills].filter((skill) => {
          const aliases = SKILL_ALIASES[skill] || [skill];
          return (item.skills || []).some((s) => aliases.some((alias) => s.includes(alias) || alias.includes(s)));
        }).length,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"));
  }

  function renderSources() {
    el.sourceSelect.innerHTML = SOURCES.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("");
    el.sourceSelect.value = state.source;
  }

  function getRuleLabel() {
    if (state.ruleType === "all") return "全て";
    if (state.ruleType === "6e") return "6版";
    if (state.ruleType === "7e") return "7版";
    return "パルプ";
  }

  function renderSkillChips() {
    const chips = SKILL_CHIPS_BY_RULE[state.ruleType] || SKILL_CHIPS_BY_RULE.all;
    el.skillChipTitle.textContent = `技能チップ検索（${getRuleLabel()}）`;
    el.skillExpandToggle.textContent = state.skillExpanded ? "△ 最小化" : "▽ 展開";
    el.skillChipArea.classList.toggle("is-expanded", state.skillExpanded);
    el.skillChipArea.classList.toggle("is-collapsed", !state.skillExpanded);
    el.skillChipArea.innerHTML = chips
      .map((skill) => {
        const active = state.selectedSkills.has(skill) ? " is-active" : "";
        return `<button class="skill-chip${active}" type="button" data-skill="${escapeHtml(skill)}">${escapeHtml(skill)}</button>`;
      })
      .join("");
  }

  function renderRuleButtons() {
    document.querySelectorAll(".rule-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.rule === state.ruleType);
    });
  }

  function renderTabs() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === state.tab);
    });

    document.getElementById("occupationTab").classList.toggle("is-hidden", state.tab !== "occupation");
    document.getElementById("featureTab").classList.toggle("is-hidden", state.tab !== "feature");
    document.getElementById("packageTab").classList.toggle("is-hidden", state.tab !== "package");

    el.occupationDetail.classList.toggle("is-hidden", state.tab !== "occupation");
    el.packageDetail.classList.toggle("is-hidden", state.tab !== "package");
  }

  function renderOccupationList() {
    const items = getFilteredOccupations();
    if (!items.length) {
      el.occupationList.innerHTML = `<div class="occupation-card"><p class="card-text">条件に一致する職業サンプルがありません。</p></div>`;
      return;
    }

    el.occupationList.innerHTML = items
      .map((item) => {
        const selected = item.id === state.selectedOccupationId ? " is-selected" : "";
        const meta = getMetaLines(item)
          .map(([label, value]) => `<p class="extra-line">${escapeHtml(label)}：${escapeHtml(value)}</p>`)
          .join("");
        const score = item.score > 0 ? `<span class="score-badge">技能一致 ${item.score}</span>` : "";
        return `
          <button class="occupation-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
            <div class="card-title-row">
              <h3 class="card-title">${escapeHtml(item.name)}</h3>
              <span class="rule-label">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span>
              ${score}
            </div>
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">技能：${escapeHtml((item.skills || []).join(" / "))}</p>
            ${meta}
            <p class="point-line">職業P：${escapeHtml(item.pointFormula || "")}</p>
          </button>
        `;
      })
      .join("");
  }

  function renderOccupationDetail() {
    const item = OCCUPATIONS.find((occupation) => occupation.id === state.selectedOccupationId) || OCCUPATIONS[0];
    if (!item) {
      el.occupationDetail.innerHTML = "";
      return;
    }

    const meta = getMetaLines(item)
      .map(
        ([label, value]) => `
          <div>
            <p class="detail-item-label">${escapeHtml(label)}</p>
            <p class="detail-item-value extra-line">${escapeHtml(value)}</p>
          </div>
        `,
      )
      .join("");

    el.occupationDetail.innerHTML = `
      <div class="detail-top">
        <div>
          <h2>${escapeHtml(item.name)} <span class="rule-label">[${escapeHtml((item.ruleLabels || []).join("/"))}]</span></h2>
          <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
        </div>
        <span class="score-badge">詳細</span>
      </div>
      <p class="detail-text">${escapeHtml(item.description || "")}</p>
      <div class="detail-box">
        <div>
          <p class="detail-item-label">職業技能</p>
          <p class="detail-item-value">${escapeHtml((item.skills || []).join(" / "))}</p>
        </div>
        <div>
          <p class="detail-item-label">職業技能ポイント</p>
          <p class="detail-item-value">${escapeHtml(item.pointFormula || "")}</p>
        </div>
        ${meta}
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary" type="button" id="addOccupationButton">出力に追加</button>
        <button class="btn btn-soft" type="button" id="copyOccupationSkillsButton">この職業技能をコピー</button>
      </div>
    `;

    document.getElementById("addOccupationButton")?.addEventListener("click", () => appendOutput(formatOccupation(item)));
    document.getElementById("copyOccupationSkillsButton")?.addEventListener("click", async () => {
      const skillsText = (item.skills || []).join("、");
      await copyText(skillsText);
    });
  }

  function rollFeatureDice() {
    const d6 = Math.floor(Math.random() * 6) + 1;
    const d10 = Math.floor(Math.random() * 10) + 1;
    return `${d6}-${d10}`;
  }

  function rollUniqueFeatures(count) {
    const results = [];
    const usedDice = new Set();
    const maxAttempts = 200;
    let attempts = 0;

    while (results.length < count && attempts < maxAttempts) {
      attempts += 1;
      const dice = rollFeatureDice();
      if (usedDice.has(dice)) continue;
      const feature = FEATURES.find((item) => item.dice === dice);
      if (!feature) continue;
      usedDice.add(dice);
      results.push(feature);
    }

    if (results.length < count) {
      const remaining = FEATURES.filter((item) => !usedDice.has(item.dice)).slice(0, count - results.length);
      results.push(...remaining);
    }

    return results;
  }

  function renderFeatures() {
    if (!state.rolledFeatures.length) state.rolledFeatures = FEATURES.slice(0, state.featureCount);

    el.featureResults.innerHTML = state.rolledFeatures
      .map(
        (item) => `
        <div class="feature-card">
          <div class="feature-card-header">
            <h3 class="feature-card-title">[${escapeHtml(item.dice)}] ${escapeHtml(item.name)}</h3>
            <span class="source-line">${escapeHtml(sourceLabel(item))}</span>
          </div>
          <p class="card-text">効果：${escapeHtml(item.effect)}</p>
          <button class="btn btn-soft btn-mini add-feature-button" type="button" data-id="${escapeHtml(item.id)}">出力に追加</button>
        </div>
      `,
      )
      .join("");
  }

  function renderFeatureCountButtons() {
    document.querySelectorAll(".count-button").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.count) === state.featureCount);
    });
  }

  function renderPackageList() {
    if (!EXPERIENCE_PACKAGES.length) {
      el.packageList.innerHTML = `<div class="package-card"><p class="card-text">経験パッケージデータがありません。</p></div>`;
      return;
    }

    el.packageList.innerHTML = EXPERIENCE_PACKAGES
      .map((item) => {
        const selected = item.id === state.selectedPackageId ? " is-selected" : "";
        const tags = (item.tags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("");
        return `
          <button class="package-card${selected}" type="button" data-id="${escapeHtml(item.id)}">
            <div class="card-title-row">
              <h3 class="card-title">${escapeHtml(item.name)}</h3>
              ${tags}
            </div>
            <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
            <p class="card-text">内容：${escapeHtml(item.description || "")}</p>
          </button>
        `;
      })
      .join("");
  }

  function renderPackageDetail() {
    const item = EXPERIENCE_PACKAGES.find((pack) => pack.id === state.selectedPackageId) || EXPERIENCE_PACKAGES[0];
    if (!item) {
      el.packageDetail.innerHTML = "";
      return;
    }

    const notes = (item.notes || []).map((note) => `<li>・${escapeHtml(note)}</li>`).join("");
    el.packageDetail.innerHTML = `
      <h2>${escapeHtml(item.name)}</h2>
      <p class="source-line">出典：${escapeHtml(sourceLabel(item))}</p>
      <p class="detail-text">内容：${escapeHtml(item.description || "")}</p>
      <ul class="detail-text">${notes}</ul>
      <button class="btn btn-primary" type="button" id="addPackageButton">出力に追加</button>
    `;

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
    renderPackageList();
    renderPackageDetail();
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.tab = button.dataset.tab;
        render();
      });
    });

    document.querySelectorAll(".rule-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.ruleType = button.dataset.rule;
        state.selectedSkills.clear();
        const firstVisible = getFilteredOccupations()[0];
        if (firstVisible) state.selectedOccupationId = firstVisible.id;
        render();
      });
    });

    el.keywordInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderOccupationList();
    });

    el.sourceSelect.addEventListener("change", (event) => {
      state.source = event.target.value;
      const firstVisible = getFilteredOccupations()[0];
      if (firstVisible) state.selectedOccupationId = firstVisible.id;
      renderOccupationList();
      renderOccupationDetail();
    });

    el.skillExpandToggle.addEventListener("click", () => {
      state.skillExpanded = !state.skillExpanded;
      renderSkillChips();
    });

    el.clearSkillsButton.addEventListener("click", () => {
      state.selectedSkills.clear();
      renderSkillChips();
      renderOccupationList();
    });

    el.skillChipArea.addEventListener("click", (event) => {
      const button = event.target.closest(".skill-chip");
      if (!button) return;
      const skill = button.dataset.skill;
      if (state.selectedSkills.has(skill)) state.selectedSkills.delete(skill);
      else state.selectedSkills.add(skill);
      renderSkillChips();
      renderOccupationList();
    });

    el.occupationList.addEventListener("click", (event) => {
      const card = event.target.closest(".occupation-card");
      if (!card) return;
      state.selectedOccupationId = card.dataset.id;
      renderOccupationList();
      renderOccupationDetail();
    });

    el.featureCountButtons.addEventListener("click", (event) => {
      const button = event.target.closest(".count-button");
      if (!button) return;
      state.featureCount = Number(button.dataset.count);
      renderFeatureCountButtons();
    });

    el.rollFeaturesButton.addEventListener("click", () => {
      state.rolledFeatures = rollUniqueFeatures(state.featureCount);
      renderFeatures();
    });

    el.featureResults.addEventListener("click", (event) => {
      const button = event.target.closest(".add-feature-button");
      if (!button) return;
      const feature = FEATURES.find((item) => item.id === button.dataset.id);
      appendOutput(formatFeature(feature));
    });

    el.packageList.addEventListener("click", (event) => {
      const card = event.target.closest(".package-card");
      if (!card) return;
      state.selectedPackageId = card.dataset.id;
      renderPackageList();
      renderPackageDetail();
    });

    el.copyOutputButton.addEventListener("click", () => copyText(el.outputText.value));
    el.clearOutputButton.addEventListener("click", () => {
      el.outputText.value = "";
    });

    el.themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "night" : "light";
      el.appRoot.dataset.theme = state.theme;
      el.themeToggle.textContent = state.theme === "light" ? "ナイトモード" : "ライトモード";
    });

    el.usageToggle.addEventListener("click", () => {
      el.usagePanel.classList.toggle("is-hidden");
      el.shortcutPanel.classList.add("is-hidden");
    });

    el.shortcutToggle.addEventListener("click", () => {
      el.shortcutPanel.classList.toggle("is-hidden");
      el.usagePanel.classList.add("is-hidden");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      el.usagePanel.classList.add("is-hidden");
      el.shortcutPanel.classList.add("is-hidden");
    });
  }

  function init() {
    renderSources();
    const initialOccupation = OCCUPATIONS.find((item) => item.id === state.selectedOccupationId);
    el.outputText.value = formatOccupation(initialOccupation);
    bindEvents();
    render();
  }

  init();
})();
