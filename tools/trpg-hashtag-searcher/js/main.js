(() => {
  const templates = window.HASHTAG_TEMPLATES;
  const parser = window.HASHTAG_PARSER;

  const storageKeys = {
    favorites: "tsukaeru-hashtag-favorites",
    presets: "tsukaeru-hashtag-preset-cards",
    scenarios: "tsukaeru-hashtag-scenario-searches",
  };

  const state = {
    activeMode: "卓募集",
    selectedSystem: "CoC6",
    selectedWords: ["PL募集", "初心者歓迎"],
    selectedFilters: ["filter:images", "lang:ja"],
    selectedExcludes: ["-ネタバレ", "-現行未通過"],
    modeQueryParts: [],
    favorites: structuredClone(templates.defaultFavorites),
    presetCards: templates.defaultPresets.map((preset, index) => ({ ...preset, query: parser.resolveDynamicQuery(preset.query), id: `default-${index}` })),
    scenarioSearchInput: "星環のダ・カーポ",
    scenarioSearches: [],
    scenarioCollapsed: false,
    generatedQuery: "",
    showShortcutPanel: false,
    theme: "night",
    showHowToPanel: false,
    favoriteCopyStatus: "",
  };

  const els = {};
  const $ = (id) => document.getElementById(id);

  const scenarioQueryTemplates = [
    {
      label: "感想",
      build: (name) => `${quoteScenarioName(name)} lang:ja 感想 (fusetter OR poipiku)`,
    },
    {
      label: "立ち絵",
      build: (name) => `${quoteScenarioName(name)} filter:images ("CoC" OR "Call of Cthulhu" OR "HO" OR "クトゥルフ神話TRPG" OR 立ち絵)`,
    },
    {
      label: "お部屋",
      build: (name) => `${quoteScenarioName(name)} filter:images 部屋`,
    },
  ];

  function normalizeScenarioName(value) {
    return String(value || "")
      .trim()
      .replace(/^["“”「『]+/, "")
      .replace(/["“”」』]+$/, "");
  }

  function quoteScenarioName(value) {
    const name = normalizeScenarioName(value);
    return name ? `"${name}"` : '""';
  }

  function buildScenarioSearches(name) {
    return scenarioQueryTemplates.map((template) => ({
      label: template.label,
      query: template.build(name),
      auto: true,
    }));
  }


  function cacheElements() {
    [
      "howToButton", "howToCloseButton", "howToPanel", "shortcutButton", "shortcutCloseButton", "shortcutPanel", "themeToggleButton", "modeButtons", "favoriteList", "favoriteCount",
      "systemButtons", "baseQueryDisplay", "addWordButtons", "filterButtons", "excludeButtons", "generatedQuery",
      "resetButton", "openXButton", "copyQueryButton", "saveFavoriteButton", "scenarioPanel", "scenarioSearchInput",
      "addScenarioSearchButton", "scenarioSearchList", "scenarioToggleButton", "addWordsSection", "composerPanel",
      "presetCardsSection", "presetCardList", "addPresetButton", "languageButton"
    ].forEach((id) => { els[id] = $(id); });
  }

  async function copyTextToClipboard(text) {
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try { return document.execCommand("copy"); }
      finally { document.body.removeChild(textarea); }
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { return fallbackCopy(); }
    return fallbackCopy();
  }

  function loadFavorites() {
    try {
      const stored = localStorage.getItem(storageKeys.favorites);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map(parser.normalizeFavorite).filter(Boolean);
      if (normalized.length > 0) state.favorites = normalized;
    } catch {}
  }

  function loadPresetCards() {
    try {
      const stored = localStorage.getItem(storageKeys.presets);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map(parser.normalizePreset).filter(Boolean).map((preset) => ({ ...preset, query: parser.resolveDynamicQuery(preset.query) }));
      if (normalized.length > 0) state.presetCards = normalized;
    } catch {}
  }

  function loadScenarioSearches() {
    state.scenarioSearches = buildScenarioSearches(state.scenarioSearchInput);
  }

  function saveFavorites() { try { localStorage.setItem(storageKeys.favorites, JSON.stringify(state.favorites)); } catch {} }
  function savePresetCards() { try { localStorage.setItem(storageKeys.presets, JSON.stringify(state.presetCards)); } catch {} }
  function saveScenarioSearches() { try { localStorage.setItem(storageKeys.scenarios, JSON.stringify(state.scenarioSearches)); } catch {} }

  function isSystemChoiceDisabled() {
    return ["素材探し", "シナリオ探し"].includes(state.activeMode);
  }

  function computeGeneratedQuery() {
    return parser.buildQueryFromState({
      selectedSystem: state.selectedSystem,
      selectedWords: state.selectedWords,
      selectedFilters: state.selectedFilters,
      selectedExcludes: state.selectedExcludes,
      modeQueryParts: state.modeQueryParts,
      isSystemChoiceDisabled: isSystemChoiceDisabled(),
    }, templates);
  }

  function setGeneratedQueryFromState() {
    state.generatedQuery = computeGeneratedQuery();
    els.generatedQuery.value = state.generatedQuery;
  }

  function openXSearch(query, latest = false) {
    const trimmed = parser.normalizeSpaces(query);
    if (!trimmed) return;
    window.open(parser.buildXSearchUrl(trimmed, latest), "_blank", "noopener,noreferrer");
  }

  function scrollToElement(element, block = "start") {
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block }), 0);
  }

  function toggleItem(list, item) {
    return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
  }

  function createTooltip(text) {
    const tooltip = document.createElement("span");
    tooltip.className = "chip-tooltip";
    tooltip.textContent = text || "このワードを検索文に追加します。";
    return tooltip;
  }

  function createChip(label, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${options.active ? "is-active" : ""} ${options.variant || ""}`;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(options.active));
    button.appendChild(createTooltip(options.description));
    if (options.disabled) {
      button.disabled = true;
      button.classList.add("is-disabled");
    }
    button.addEventListener("click", () => {
      if (!button.disabled) options.onClick?.(label);
    });
    return button;
  }

  function renderModeButtons() {
    els.modeButtons.innerHTML = "";
    templates.modes.forEach((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `mode-button ${state.activeMode === mode ? "is-active" : ""}`;
      button.textContent = mode;
      button.setAttribute("aria-pressed", String(state.activeMode === mode));
      button.addEventListener("click", () => applySearchMode(mode));
      els.modeButtons.appendChild(button);
    });
  }

  function renderSystemButtons() {
    els.systemButtons.innerHTML = "";
    const disabled = isSystemChoiceDisabled();
    Object.keys(templates.systemQueries).forEach((system) => {
      const chip = createChip(system, {
        active: state.selectedSystem === system && !disabled,
        disabled,
        description: templates.chipDescriptions[system],
        onClick: () => {
          state.selectedSystem = state.selectedSystem === system ? "" : system;
          updateQueryAndRender();
        },
      });
      els.systemButtons.appendChild(chip);
    });
    els.baseQueryDisplay.querySelector("span").textContent = disabled ? "" : templates.systemQueries[state.selectedSystem] || "";
  }

  function renderChipSections() {
    const visualWords = templates.modeVisualWordMap[state.activeMode] || [];

    els.addWordButtons.innerHTML = "";
    templates.addWords.forEach((word) => {
      const visuallySelected = visualWords.includes(word);
      const selected = state.selectedWords.includes(word) || visuallySelected;
      const chip = createChip(word, {
        active: selected,
        description: templates.chipDescriptions[word],
        onClick: () => {
          if (visuallySelected && !state.selectedWords.includes(word)) return;
          state.selectedWords = toggleItem(state.selectedWords, word);
          updateQueryAndRender();
        },
      });
      els.addWordButtons.appendChild(chip);
    });

    els.filterButtons.innerHTML = "";
    templates.filters.forEach((filter) => {
      const chip = createChip(filter, {
        active: state.selectedFilters.includes(filter),
        variant: "chip-cyan",
        description: templates.chipDescriptions[filter],
        onClick: () => {
          state.selectedFilters = toggleItem(state.selectedFilters, filter);
          updateQueryAndRender();
        },
      });
      els.filterButtons.appendChild(chip);
    });

    els.excludeButtons.innerHTML = "";
    templates.excludes.forEach((exclude) => {
      const chip = createChip(exclude, {
        active: state.selectedExcludes.includes(exclude),
        variant: "chip-danger",
        description: templates.chipDescriptions[exclude],
        onClick: () => {
          state.selectedExcludes = toggleItem(state.selectedExcludes, exclude);
          updateQueryAndRender();
        },
      });
      els.excludeButtons.appendChild(chip);
    });
  }

  function renderFavorites() {
    els.favoriteCount.textContent = String(state.favorites.length);
    els.favoriteList.innerHTML = "";
    state.favorites.forEach((fav) => {
      const card = document.createElement("article");
      card.className = "favorite-card";

      const label = document.createElement("p");
      label.className = "favorite-label";
      label.textContent = fav.label;
      card.appendChild(label);

      if (fav.label !== fav.query) {
        const query = document.createElement("p");
        query.className = "favorite-query";
        query.textContent = fav.query;
        card.appendChild(query);
      }

      const actions = document.createElement("div");
      actions.className = "favorite-actions";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "mini-button cyan-mini";
      open.textContent = "開く";
      open.addEventListener("click", () => openXSearch(fav.query));
      actions.appendChild(open);

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "mini-button";
      copy.textContent = state.favoriteCopyStatus === fav.query ? "コピー済" : state.favoriteCopyStatus === "コピー失敗" ? "失敗" : "コピー";
      copy.addEventListener("click", async () => {
        const copied = await copyTextToClipboard(fav.query);
        state.favoriteCopyStatus = copied ? fav.query : "コピー失敗";
        renderFavorites();
        window.setTimeout(() => {
          state.favoriteCopyStatus = "";
          renderFavorites();
        }, 1600);
      });
      actions.appendChild(copy);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "mini-button danger-mini";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        state.favorites = state.favorites.filter((item) => item.query !== fav.query);
        saveFavorites();
        renderFavorites();
      });
      actions.appendChild(del);

      card.appendChild(actions);
      els.favoriteList.appendChild(card);
    });
  }

  function renderScenarioSearches() {
    els.scenarioSearchInput.value = state.scenarioSearchInput;
    els.scenarioSearchList.classList.toggle("is-hidden", state.scenarioCollapsed);
    els.scenarioToggleButton.textContent = state.scenarioCollapsed ? "▽ 展開" : "△ 最小化";
    els.scenarioToggleButton.setAttribute("aria-expanded", String(!state.scenarioCollapsed));
    els.scenarioSearchList.innerHTML = "";

    state.scenarioSearches.forEach((item, index) => {
      const current = typeof item === "string" ? { label: "検索", query: item, auto: false } : item;
      const row = document.createElement("article");
      row.className = "scenario-search-row";

      const top = document.createElement("div");
      top.className = "scenario-row-top";

      const label = document.createElement("span");
      label.className = "scenario-row-label";
      label.textContent = current.label || "検索";
      top.appendChild(label);

      const input = document.createElement("input");
      input.className = "scenario-row-input";
      input.value = current.query || "";
      input.spellcheck = false;
      input.addEventListener("input", () => {
        state.scenarioSearches[index] = { ...current, query: input.value, auto: false };
        saveScenarioSearches();
      });
      top.appendChild(input);

      row.appendChild(top);

      const actions = document.createElement("div");
      actions.className = "scenario-row-actions";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "mini-button cyan-mini";
      open.textContent = "開く";
      open.addEventListener("click", () => openXSearch(input.value));
      actions.appendChild(open);

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "mini-button";
      copy.textContent = "コピー";
      copy.addEventListener("click", async () => {
        const copied = await copyTextToClipboard(input.value);
        copy.textContent = copied ? "コピー済" : "失敗";
        window.setTimeout(() => { copy.textContent = "コピー"; }, 1600);
      });
      actions.appendChild(copy);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "mini-button danger-mini";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        state.scenarioSearches.splice(index, 1);
        saveScenarioSearches();
        renderScenarioSearches();
      });
      actions.appendChild(del);

      row.appendChild(actions);
      els.scenarioSearchList.appendChild(row);
    });
  }

  function renderPresetCards() {
    els.presetCardList.innerHTML = "";
    state.presetCards.forEach((preset) => {
      const card = document.createElement("article");
      card.className = "preset-card";

      const title = document.createElement("input");
      title.className = "preset-title-input";
      title.value = preset.title;
      title.placeholder = "検索カード名";
      title.addEventListener("input", () => {
        preset.title = title.value;
        savePresetCards();
      });
      card.appendChild(title);

      const desc = document.createElement("input");
      desc.className = "preset-desc-input";
      desc.value = preset.desc;
      desc.placeholder = "説明文";
      desc.addEventListener("input", () => {
        preset.desc = desc.value;
        savePresetCards();
      });
      card.appendChild(desc);

      const query = document.createElement("textarea");
      query.className = "preset-query-input";
      query.value = preset.query;
      query.placeholder = "検索文を入力";
      query.spellcheck = false;
      query.addEventListener("input", () => {
        preset.query = query.value;
        savePresetCards();
      });
      card.appendChild(query);

      const actions = document.createElement("div");
      actions.className = "preset-actions";

      const search = document.createElement("button");
      search.type = "button";
      search.className = "mini-button primary-mini";
      search.textContent = "検索 →";
      search.addEventListener("click", () => openXSearch(preset.query));
      actions.appendChild(search);

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "mini-button";
      copy.textContent = "コピー";
      copy.addEventListener("click", async () => {
        const copied = await copyTextToClipboard(preset.query);
        copy.textContent = copied ? "コピー済" : "失敗";
        window.setTimeout(() => { copy.textContent = "コピー"; }, 1600);
      });
      actions.appendChild(copy);

      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "mini-button violet-mini";
      favorite.textContent = "お気に入り";
      favorite.addEventListener("click", () => {
        const trimmed = parser.normalizeSpaces(preset.query);
        if (!trimmed) return;
        if (!state.favorites.some((item) => item.query === trimmed)) {
          state.favorites = [{ label: preset.title || trimmed, query: trimmed }, ...state.favorites];
          saveFavorites();
          renderFavorites();
        }
      });
      actions.appendChild(favorite);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "mini-button danger-mini";
      del.textContent = "削除";
      del.addEventListener("click", () => {
        state.presetCards = state.presetCards.filter((item) => item.id !== preset.id);
        savePresetCards();
        renderPresetCards();
      });
      actions.appendChild(del);

      card.appendChild(actions);
      els.presetCardList.appendChild(card);
    });
  }

  function renderHowToPanel() {
    els.howToPanel.classList.toggle("is-hidden", !state.showHowToPanel);
    els.howToButton.setAttribute("aria-expanded", String(state.showHowToPanel));
  }

  function renderTheme() {
    const isLightMode = state.theme === "light";
    document.body.classList.toggle("light-mode", isLightMode);
    document.documentElement.classList.toggle("light-mode", isLightMode);
    els.themeToggleButton.textContent = isLightMode ? "ナイトモード" : "ライトモード";
    els.themeToggleButton.setAttribute("aria-pressed", String(isLightMode));
    try {
      localStorage.setItem("tsukaeru-hashtag-theme", state.theme);
    } catch {}
  }

  function renderShortcutPanel() {
    els.shortcutPanel.classList.toggle("is-hidden", !state.showShortcutPanel);
    els.shortcutButton.setAttribute("aria-expanded", String(state.showShortcutPanel));
  }

  function updateQueryAndRender() {
    renderModeButtons();
    renderSystemButtons();
    renderChipSections();
    setGeneratedQueryFromState();
  }

  function renderAll() {
    renderModeButtons();
    renderSystemButtons();
    renderChipSections();
    renderFavorites();
    renderScenarioSearches();
    renderPresetCards();
    renderHowToPanel();
    renderShortcutPanel();
    renderTheme();
    setGeneratedQueryFromState();
  }

  function applySearchMode(mode) {
    state.activeMode = mode;
    if (["素材探し", "シナリオ探し"].includes(mode)) state.selectedSystem = "";

    if (mode === "シナリオ探し") {
      updateQueryAndRender();
      scrollToElement(els.scenarioPanel);
      return;
    }

    if (mode === "素材探し") scrollToElement(els.addWordsSection);
    if (mode === "卓募集") scrollToElement(els.composerPanel);
    if (mode === "プリセット検索カード") scrollToElement(els.presetCardsSection);

    const preset = templates.modePresets[mode];
    if (preset) {
      state.selectedWords = [...preset.words];
      state.selectedFilters = [...preset.filters];
      state.selectedExcludes = [...preset.excludes];
      state.modeQueryParts = [...preset.extra];
    }

    updateQueryAndRender();
  }

  function setupEvents() {
    els.generatedQuery.addEventListener("input", () => {
      state.generatedQuery = els.generatedQuery.value;
    });

    els.scenarioSearchInput.addEventListener("input", () => {
      state.scenarioSearchInput = els.scenarioSearchInput.value;
      state.scenarioSearches = buildScenarioSearches(state.scenarioSearchInput);
      saveScenarioSearches();
      renderScenarioSearches();
    });

    els.scenarioToggleButton.addEventListener("click", () => {
      state.scenarioCollapsed = !state.scenarioCollapsed;
      renderScenarioSearches();
    });

    els.addScenarioSearchButton.addEventListener("click", () => {
      const query = quoteScenarioName(state.scenarioSearchInput);
      if (!normalizeScenarioName(state.scenarioSearchInput)) return;
      state.scenarioSearches.push({ label: "追加", query, auto: false });
      saveScenarioSearches();
      renderScenarioSearches();
    });

    els.resetButton.addEventListener("click", () => {
      state.activeMode = "";
      state.selectedSystem = "";
      state.selectedWords = [];
      state.selectedFilters = [];
      state.selectedExcludes = [];
      state.modeQueryParts = [];
      updateQueryAndRender();
    });

    els.openXButton.addEventListener("click", () => openXSearch(state.generatedQuery, state.selectedFilters.includes("最新順")));

    els.copyQueryButton.addEventListener("click", async () => {
      const copied = await copyTextToClipboard(state.generatedQuery);
      els.copyQueryButton.textContent = copied ? "コピーしました" : "コピー失敗";
      window.setTimeout(() => { els.copyQueryButton.textContent = "検索文をコピー"; }, 1600);
    });

    els.saveFavoriteButton.addEventListener("click", () => {
      const query = parser.normalizeSpaces(state.generatedQuery);
      if (!query) return;
      if (!state.favorites.some((item) => item.query === query)) {
        state.favorites = [{ label: query, query }, ...state.favorites];
        saveFavorites();
        renderFavorites();
      }
      els.saveFavoriteButton.textContent = "保存しました";
      window.setTimeout(() => { els.saveFavoriteButton.textContent = "お気に入りに保存"; }, 1600);
    });

    els.addPresetButton.addEventListener("click", () => {
      state.presetCards.push({ id: `custom-${Date.now()}`, title: "新しい検索カード", desc: "自由に編集できる検索カードです", query: "", tag: "Custom" });
      savePresetCards();
      renderPresetCards();
      scrollToElement(els.presetCardsSection, "end");
    });

    els.howToButton.addEventListener("click", () => {
      state.showHowToPanel = !state.showHowToPanel;
      if (state.showHowToPanel) state.showShortcutPanel = false;
      renderHowToPanel();
      renderShortcutPanel();
    });

    els.howToCloseButton.addEventListener("click", () => {
      state.showHowToPanel = false;
      renderHowToPanel();
    });

    els.shortcutButton.addEventListener("click", () => {
      state.showShortcutPanel = !state.showShortcutPanel;
      if (state.showShortcutPanel) state.showHowToPanel = false;
      renderShortcutPanel();
      renderHowToPanel();
    });

    els.shortcutCloseButton.addEventListener("click", () => {
      state.showShortcutPanel = false;
      renderShortcutPanel();
    });

    els.themeToggleButton.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "night" : "light";
      renderTheme();
    });

    els.languageButton.addEventListener("click", () => {
      const lang = window.HASHTAG_LANGUAGE.toggleLanguage();
      els.languageButton.textContent = lang === "ja" ? "JP / EN" : "EN / JP";
    });

    window.HASHTAG_SHORTCUTS.setupShortcuts({
      toggleShortcutPanel: () => {
        state.showShortcutPanel = !state.showShortcutPanel;
        renderShortcutPanel();
      },
      closeShortcutPanel: () => {
        state.showShortcutPanel = false;
        state.showHowToPanel = false;
        renderShortcutPanel();
        renderHowToPanel();
      },
      openGeneratedQuery: () => openXSearch(state.generatedQuery, state.selectedFilters.includes("最新順")),
      copyGeneratedQuery: async () => {
        const copied = await copyTextToClipboard(state.generatedQuery);
        els.copyQueryButton.textContent = copied ? "コピーしました" : "コピー失敗";
        window.setTimeout(() => { els.copyQueryButton.textContent = "検索文をコピー"; }, 1600);
      },
    });
  }

  function init() {
    cacheElements();
    try {
      const storedTheme = localStorage.getItem("tsukaeru-hashtag-theme");
      if (storedTheme === "light" || storedTheme === "night") state.theme = storedTheme;
    } catch {}
    loadFavorites();
    loadPresetCards();
    loadScenarioSearches();
    renderAll();
    setupEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
