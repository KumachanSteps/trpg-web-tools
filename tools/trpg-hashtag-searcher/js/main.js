(function () {
  const systemQueries = {
    CoC: '("CoC" OR "CoC6" OR "CoC7" OR "Call of Cthulhu" OR "Call of Cthulhu 6th" OR "クトゥルフ神話TRPG" OR "新クトゥルフ神話TRPG" OR "クトゥルフTRPG" OR "新クトゥルフTRPG" OR "クトゥルフ" OR "6版" OR "7版")',
    CoC6: '("CoC" OR "CoC6" OR "Call of Cthulhu 6th" OR "Call of Cthulhu" OR "クトゥルフ神話TRPG" OR "クトゥルフTRPG" OR "クトゥルフ" OR "6版") -("CoC7" OR "新クトゥルフ神話TRPG" OR "Call of Cthulhu 7th" OR "新クトゥルフTRPG" OR "7版")',
    CoC7: '("CoC7" OR "新クトゥルフ神話TRPG" OR "Call of Cthulhu 7th" OR "新クトゥルフTRPG" OR "7版") -("CoC6" OR "Call of Cthulhu 6th" OR "6版")',
    Emoklore: '("エモクロア" OR "エモクロアTRPG" OR "Emoklore")',
    Gaiakea: '("ガイアケア" OR "Gaiakea")',
    madamiss: '("マダミス" OR "マーダーミステリー")',
    inSane: '("インセイン" OR "inSane" OR "マルチジャンル・ホラーRPG インセイン")',
    "Sword World": '("ソード・ワールド" OR "ソードワールド" OR "Sword World" OR "SW2.5" OR "SW2.0")',
    "Dungeon&Dragon": '("D&D" OR "DnD" OR "Dungeons & Dragons" OR "ダンジョンズ＆ドラゴンズ" OR "ダンジョンズ&ドラゴンズ" OR "ダンドラ")'
  };

  const wordQueries = {
    PL募集: "#PL募集",
    KP募集: "#KP募集",
    GM募集: "#GM募集",
    ソロ: '"ソロ"',
    タイマン: '("タイマン" OR "KPC")',
    "2PL": '"2PL"',
    "3PL": '"3PL"',
    "4PL": '"4PL"',
    "ルームZIP付き": '("ココフォリア部屋付き" OR "部屋付きセット" OR "部屋データ付き" OR "ココフォリア部屋zip" OR "サウンドマスター対応" OR "ココフォリア部屋（前景・NPC駒付）" OR "投げるだけルームzipつき" OR "ココフォリア部屋・NPC立ち絵・背景画像同梱" OR "ココフォリア部屋セット")'
  };

  const excludeQueries = {
    "-現行未通過": '-("現行未通過" OR "現未" OR "現行" OR "げんみ")'
  };

  const modes = ["今日の巡回", "卓募集", "素材探し", "シナリオ探し", "プリセット検索カード"];
  const addWords = ["ソロ", "タイマン", "2PL", "3PL", "4PL", "PL募集", "KP募集", "GM募集", "卓募集", "初心者歓迎", "ボイセ", "テキセ", "BOOTH", "ココフォリア", "部屋素材", "ルームZIP付き"];
  const filters = ["filter:images", "filter:videos", "filter:links", "filter:media", "filter:verified", "-filter:retweets", "min_faves:50", "min_faves:100", "min_faves:500", "min_faves:1000", "lang:ja", "from:", "until:", "since:", "since:1day", "since:3days", "since:1week", "since:1month"];
  const excludes = ["-ネタバレ", "-現行未通過", "-R18", "-R18G", "-募集終了"];

  const chipDescriptions = {
    PL募集: "検索文には #PL募集 を追加します。プレイヤー募集を含む投稿を探します。",
    KP募集: "検索文には #KP募集 を追加します。KP募集を含む投稿を探します。",
    GM募集: "検索文には #GM募集 を追加します。GM募集を含む投稿を探します。",
    卓募集: "TRPG卓の募集全般を探します。",
    初心者歓迎: "初心者歓迎の募集を探しやすくします。",
    ソロ: "検索文には \"ソロ\" を追加します。一人用・ソロ系の投稿を探す用途です。",
    タイマン: "検索文には (\"タイマン\" OR \"KPC\") を追加します。タイマン・KPC関連の表記ゆれを拾います。",
    "2PL": "検索文には \"2PL\" を追加します。2人用シナリオや募集を探す用途です。",
    "3PL": "検索文には \"3PL\" を追加します。3人用シナリオや募集を探す用途です。",
    "4PL": "検索文には \"4PL\" を追加します。4人用シナリオや募集を探す用途です。",
    ボイセ: "ボイスセッション関連の投稿を探します。",
    テキセ: "テキストセッション関連の投稿を探します。",
    BOOTH: "BOOTHの商品・シナリオ告知に絞りやすくします。",
    ココフォリア: "ココフォリア部屋や素材関連の投稿を探します。",
    部屋素材: "部屋作成向けの素材投稿を探します。",
    ルームZIP付き: "ココフォリア部屋付き・部屋データ付き・投げるだけルームzipつき等の表記ゆれをまとめて検索します。",
    "filter:images": "画像付き投稿だけを検索します。部屋・素材・卓報告探しに便利です。",
    "filter:videos": "動画付き投稿だけを検索します。配信や切り抜き探しに便利です。",
    "filter:links": "リンク付き投稿だけを検索します。BOOTHや配信URL探しに便利です。",
    "filter:media": "画像または動画付き投稿を検索します。",
    "filter:verified": "認証済みアカウントの投稿を検索します。",
    "-filter:retweets": "リポストを除外して、元投稿を見つけやすくします。",
    "min_faves:50": "いいね数50以上の投稿を検索します。",
    "min_faves:100": "いいね数100以上の投稿を検索します。",
    "min_faves:500": "いいね数500以上の投稿を検索します。",
    "min_faves:1000": "いいね数1000以上の投稿を検索します。",
    "lang:ja": "日本語投稿を優先して検索します。",
    "from:": "特定アカウントからの投稿に絞ります。例：from:username",
    "until:": "指定日より前の投稿に絞ります。例：until:2026-01-01",
    "since:": "指定日以降の投稿に絞ります。例：since:2026-01-01",
    "since:1day": "今日から1日前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:3days": "今日から3日前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:1week": "今日から1週間前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "since:1month": "今日から1か月前の日付を自動計算し、since:YYYY-MM-DD として検索文に追加します。",
    "-ネタバレ": "『ネタバレ』を含む投稿を検索結果から除外します。",
    "-現行未通過": "『現行未通過』『現未』『現行』『げんみ』を含む投稿を除外します。",
    "-R18": "R18表記を含む投稿を除外します。",
    "-R18G": "R18G表記を含む投稿を除外します。",
    "-募集終了": "募集終了済みの投稿を除外します。",
    CoC: "CoC全般を、6版・7版両方の表記ゆれ込みで検索します。",
    CoC6: "CoC 6版系の表記ゆれをまとめ、7版系の表記を除外して検索します。",
    CoC7: "CoC 7版・新クトゥルフ神話TRPG系の表記ゆれをまとめ、6版系の表記を除外して検索します。",
    Emoklore: "エモクロアTRPG関連の表記ゆれをまとめて検索します。",
    Gaiakea: "Gaiakea / ガイアケア関連の投稿を検索します。",
    madamiss: "マダミス・マーダーミステリー関連の表記ゆれをまとめて検索します。",
    inSane: "インセイン関連の表記ゆれをまとめて検索します。",
    "Sword World": "ソード・ワールド関連の表記ゆれをまとめて検索します。",
    "Dungeon&Dragon": "D&D / ダンジョンズ＆ドラゴンズ関連の表記ゆれをまとめて検索します。"
  };

  const materialDefaultExtra = [
    '("ココフォリア素材" OR "部屋素材" OR #ココフォリア素材 OR #TRPG素材 OR #背景素材)',
    '-("シナリオ" OR "トレーラー" OR "回れる")',
    '-("で購入しました！" OR "ご依頼" OR #TRPG自己紹介シート OR #立ち絵素材)',
    '-("サウンドマスター対応" OR "シーン設定済み" OR "BGMやNPCなど")',
    '-("ココフォリア部屋付き" OR "部屋付きセット" OR "部屋データ付き" OR "ココフォリア部屋（前景・NPC駒付）" OR "ココフォリア部屋・NPC立ち絵・背景画像同梱" OR "ココフォリア部屋セット")',
    '-("素材付き" OR "素材（テキスト込み）" OR "素材追加" OR "素材zipファイルを追加" OR "素材+テキスト" OR "素材が追加" OR "素材制作" OR "制作実績" OR "素材担当" OR "お部屋素材付き" OR "素材＆NPC画像" OR "素材（NPC")'
  ];

  const modePresets = {
    卓募集: { words: [], filters: ["lang:ja"], excludes: [], extra: ["(#PL募集 OR #KP募集 OR #GM募集)"] },
    素材探し: { words: [], filters: ["filter:images", "filter:links", "lang:ja"], excludes: [], extra: materialDefaultExtra }
  };

  const defaultFavorites = [
    { label: "#さけひよダカーポ filter:images lang:ja", query: "#さけひよダカーポ filter:images lang:ja" },
    { label: "#繋がらなくていいから俺のココフォリア部屋を見てくれ filter:images", query: '("# 繋がらなくていいから俺のココフォリア部屋を見てくれ" OR "#繋がらなくていいから俺のココフォリア部屋を見てくれ" OR "繋がらなくていいから俺のココフォリア部屋を見てくれ") filter:images' },
    { label: "ココフォ部屋グッドデザイン賞 filter:images", query: "ココフォ部屋グッドデザイン賞 filter:images" },
    { label: "ルームZIP付き filter:images", query: `${wordQueries["ルームZIP付き"]} filter:images` }
  ];

  const presets = [
    { title: "CoC PL募集", desc: "CoCのPL募集を探す基本セット", query: "#CoC PL募集 lang:ja -募集終了", tag: "Recruit" },
    { title: "ココフォ部屋グッドデザイン賞", desc: "ココフォリア部屋の受賞・参考デザイン画像を探す", query: '("ココフォ部屋グッドデザイン賞" OR "#ココフォ部屋グッドデザイン賞2022" OR "#ココフォ部屋グッドデザイン賞2023" OR "#ココフォ部屋グッドデザイン賞2024" OR "#ココフォ部屋グッドデザイン賞2025") filter:images lang:ja', tag: "Images" },
    { title: "CoC Scenario Search", desc: "BOOTH系のCoCシナリオを探す", query: "#CoCシナリオ BOOTH -ネタバレ lang:ja", tag: "Scenario" },
    { title: "TRPG Materials", desc: "背景・素材・部屋作り用の画像検索", query: "#TRPG素材 filter:images lang:ja", tag: "Material" },
    { title: "Session Reports", desc: "卓報告やセッション後の画像投稿を見る", query: "#卓報告 CoC filter:images lang:ja", tag: "Report" },
    { title: "TRPG Streaming", desc: "TRPG配信やアーカイブを探す", query: "#TRPG配信 CoC filter:videos lang:ja", tag: "Stream" }
  ];

  const state = {
    activeMode: "今日の巡回",
    selectedSystem: "CoC6",
    selectedWords: ["PL募集", "初心者歓迎"],
    selectedFilters: ["filter:images", "lang:ja"],
    selectedExcludes: ["-ネタバレ", "-現行未通過"],
    modeQueryParts: [],
    favorites: defaultFavorites.slice(),
    favoriteCopyStatus: ""
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    loadFavorites();
    renderAll();
    bindEvents();
  }

  function cacheElements() {
    ["modeList", "favoriteList", "favoriteCount", "systemButtons", "baseQueryText", "addWordButtons", "filterButtons", "excludeButtons", "generatedQuery", "scenarioLines", "dailyGrid", "presetGrid", "resetButton", "openSearchButton", "copyQueryButton", "saveFavoriteButton", "copyPresetMarkdown", "shortcutButton", "shortcutModal", "closeShortcutModal", "scenarioPanel", "addWordsAnchor", "composerPanel", "presetCardsPanel"].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.generatedQuery.addEventListener("input", () => {});
    els.resetButton.addEventListener("click", resetQuery);
    els.openSearchButton.addEventListener("click", () => openXSearch(els.generatedQuery.value));
    els.copyQueryButton.addEventListener("click", copyGeneratedQuery);
    els.saveFavoriteButton.addEventListener("click", saveGeneratedQueryToFavorites);
    els.copyPresetMarkdown.addEventListener("click", () => copyText(presets.map((preset) => `${preset.title}\n${preset.query}`).join("\n\n"), els.copyPresetMarkdown, "コピーしました", "選択項目をMarkdownでコピー"));
    els.shortcutButton.addEventListener("click", () => { els.shortcutModal.hidden = false; });
    els.closeShortcutModal.addEventListener("click", () => { els.shortcutModal.hidden = true; });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") els.shortcutModal.hidden = true;
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") openXSearch(els.generatedQuery.value);
    });
  }

  function renderAll() {
    renderModes();
    renderFavorites();
    renderSystems();
    renderChipGroup(els.addWordButtons, addWords, state.selectedWords, "word", (chip) => toggleChip(chip, "selectedWords"), state.activeMode === "卓募集" ? ["PL募集", "KP募集", "GM募集"] : []);
    renderChipGroup(els.filterButtons, filters, state.selectedFilters, "filter", (chip) => toggleChip(chip, "selectedFilters"));
    renderChipGroup(els.excludeButtons, excludes, state.selectedExcludes, "exclude", (chip) => toggleChip(chip, "selectedExcludes"));
    renderGeneratedQuery();
    renderScenarioLines();
    renderDailyGrid();
    renderPresets();
  }

  function renderModes() {
    els.modeList.innerHTML = "";
    modes.forEach((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `mode-button${state.activeMode === mode ? " active" : ""}`;
      button.textContent = mode;
      button.setAttribute("aria-pressed", String(state.activeMode === mode));
      button.addEventListener("click", () => applySearchMode(mode));
      els.modeList.appendChild(button);
    });
  }

  function renderFavorites() {
    els.favoriteCount.textContent = String(state.favorites.length);
    els.favoriteList.innerHTML = "";
    state.favorites.forEach((favorite) => {
      const card = document.createElement("div");
      card.className = "favorite-card";
      const label = document.createElement("p");
      label.className = "favorite-label";
      label.textContent = favorite.label;
      card.appendChild(label);
      if (favorite.label !== favorite.query) {
        const query = document.createElement("p");
        query.className = "favorite-query";
        query.textContent = favorite.query;
        card.appendChild(query);
      }
      const actions = document.createElement("div");
      actions.className = "favorite-actions";
      const openButton = makeButton("開く", "btn btn-cyan-soft btn-compact", () => openXSearch(favorite.query));
      const copyButton = makeButton(state.favoriteCopyStatus === favorite.query ? "コピー済" : state.favoriteCopyStatus === "コピー失敗" ? "失敗" : "コピー", "btn btn-soft btn-compact", () => copyFavorite(favorite.query));
      actions.append(openButton, copyButton);
      card.appendChild(actions);
      els.favoriteList.appendChild(card);
    });
  }

  function renderSystems() {
    const disabled = isSystemChoiceDisabled();
    els.systemButtons.innerHTML = "";
    Object.keys(systemQueries).forEach((system) => {
      const button = document.createElement("button");
      button.type = "button";
      const active = state.selectedSystem === system;
      button.className = `chip ${disabled ? "disabled" : active ? "active filter" : ""}`;
      button.disabled = disabled;
      button.textContent = system;
      button.setAttribute("aria-pressed", String(active));
      button.appendChild(makeTooltip(chipDescriptions[system] || "このシステムの表記ゆれを検索します。"));
      button.addEventListener("click", () => {
        if (disabled) return;
        state.selectedSystem = active ? "" : system;
        renderAll();
      });
      els.systemButtons.appendChild(button);
    });
    els.baseQueryText.textContent = getBaseQuery();
  }

  function renderChipGroup(container, chips, selected, type, onToggle, visuallySelected = []) {
    container.innerHTML = "";
    chips.forEach((chip) => {
      const button = document.createElement("button");
      button.type = "button";
      const active = selected.includes(chip) || visuallySelected.includes(chip);
      button.className = `chip${active ? ` active ${type}` : ""}`;
      button.textContent = chip;
      button.setAttribute("aria-pressed", String(active));
      button.appendChild(makeTooltip(chipDescriptions[chip] || "このワードを検索文に追加します。"));
      button.addEventListener("click", () => onToggle(chip));
      container.appendChild(button);
    });
  }

  function renderGeneratedQuery() {
    els.generatedQuery.value = computeQuery();
  }

  function renderScenarioLines() {
    const lines = ['"星環のダ・カーポ"', '"星環のダ・カーポ" filter:images', '"星環のダ・カーポ" 卓報告', '"星環のダ・カーポ" -ネタバレ'];
    els.scenarioLines.innerHTML = "";
    lines.forEach((text) => els.scenarioLines.appendChild(makeSearchLine(text)));
  }

  function renderDailyGrid() {
    const base = getBaseQuery();
    const items = [
      ["卓募集を見る", `${base} 卓募集 lang:ja -募集終了`],
      ["部屋参考を見る", "#GoodCocofoliaOheya2025 filter:images lang:ja"],
      ["素材を見る", "#TRPG素材 filter:images lang:ja"],
      ["配信を見る", `${base} 配信 filter:videos lang:ja`],
      ["卓報告を見る", `${base} 卓報告 filter:images lang:ja`],
      ["シナリオを見る", `${base} シナリオ BOOTH lang:ja -ネタバレ`]
    ];
    els.dailyGrid.innerHTML = "";
    items.forEach(([label, query]) => {
      const button = document.createElement("button");
      button.className = "daily-button";
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => openXSearch(query.trim()));
      els.dailyGrid.appendChild(button);
    });
  }

  function renderPresets() {
    els.presetGrid.innerHTML = "";
    presets.forEach((preset) => {
      const article = document.createElement("article");
      article.className = "preset-card";
      article.innerHTML = `<div class="preset-card-header"><div><h3 class="preset-title"></h3><p class="preset-description"></p></div><span class="preset-tag"></span></div><p class="preset-query"></p><div class="preset-actions"></div>`;
      article.querySelector(".preset-title").textContent = preset.title;
      article.querySelector(".preset-description").textContent = preset.desc;
      article.querySelector(".preset-tag").textContent = preset.tag;
      article.querySelector(".preset-query").textContent = preset.query;
      const actions = article.querySelector(".preset-actions");
      actions.append(
        makeButton("検索 →", "btn btn-primary btn-compact", () => openXSearch(preset.query)),
        makeButton("コピー", "btn btn-soft btn-compact", () => copyFavorite(preset.query)),
        makeButton("お気に入り", "btn btn-violet-soft btn-compact", () => addFavorite({ label: preset.title, query: preset.query }))
      );
      els.presetGrid.appendChild(article);
    });
  }

  function makeButton(text, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  function makeTooltip(text) {
    const span = document.createElement("span");
    span.className = "chip-tooltip";
    span.textContent = text;
    return span;
  }

  function makeSearchLine(text) {
    const line = document.createElement("div");
    line.className = "search-line";
    const span = document.createElement("span");
    span.textContent = text;
    const button = makeButton("開く", "btn btn-soft btn-compact", () => openXSearch(text));
    line.append(span, button);
    return line;
  }

  function isSystemChoiceDisabled() {
    return ["素材探し", "シナリオ探し"].includes(state.activeMode);
  }

  function getBaseQuery() {
    return isSystemChoiceDisabled() ? "" : systemQueries[state.selectedSystem] || "";
  }

  function computeQuery() {
    const words = state.selectedWords.map((word) => wordQueries[word] || word);
    const filterQueries = state.selectedFilters.map((filter) => {
      if (["since:1day", "since:3days", "since:1week", "since:1month"].includes(filter)) return window.HashtagParser.getRelativeSinceQuery(filter);
      return filter;
    });
    const excludeQuery = state.selectedExcludes.map((exclude) => excludeQueries[exclude] || exclude);
    return [getBaseQuery(), ...words, ...filterQueries, ...state.modeQueryParts, ...excludeQuery].filter(Boolean).join(" ").trim();
  }

  function applySearchMode(mode) {
    state.activeMode = mode;
    if (["素材探し", "シナリオ探し"].includes(mode)) state.selectedSystem = "";

    if (mode === "シナリオ探し") {
      renderAll();
      scrollTo(els.scenarioPanel);
      return;
    }

    const preset = modePresets[mode];
    if (preset) {
      state.selectedWords = preset.words.slice();
      state.selectedFilters = preset.filters.slice();
      state.selectedExcludes = preset.excludes.slice();
      state.modeQueryParts = preset.extra.slice();
    }

    renderAll();

    if (mode === "素材探し") scrollTo(els.addWordsAnchor);
    if (mode === "卓募集") scrollTo(els.composerPanel);
    if (mode === "プリセット検索カード") scrollTo(els.presetCardsPanel);
  }

  function scrollTo(element) {
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function toggleChip(chip, key) {
    const current = state[key];
    state[key] = current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip];
    renderAll();
  }

  function resetQuery() {
    state.activeMode = "";
    state.selectedSystem = "";
    state.selectedWords = [];
    state.selectedFilters = [];
    state.selectedExcludes = [];
    state.modeQueryParts = [];
    renderAll();
  }

  async function copyText(text, button, successText, defaultText) {
    const copied = await window.HashtagParser.copyTextToClipboard(text);
    button.textContent = copied ? successText : "失敗";
    window.setTimeout(() => { button.textContent = defaultText; }, 1600);
  }

  async function copyGeneratedQuery() {
    await copyText(els.generatedQuery.value, els.copyQueryButton, "コピーしました", "検索文をコピー");
  }

  async function copyFavorite(text) {
    const copied = await window.HashtagParser.copyTextToClipboard(text);
    state.favoriteCopyStatus = copied ? text : "コピー失敗";
    renderFavorites();
    window.setTimeout(() => {
      state.favoriteCopyStatus = "";
      renderFavorites();
    }, 1600);
  }

  function saveGeneratedQueryToFavorites() {
    const query = els.generatedQuery.value.trim();
    if (!query) return;
    addFavorite({ label: query, query });
    els.saveFavoriteButton.textContent = "保存しました";
    window.setTimeout(() => { els.saveFavoriteButton.textContent = "お気に入りに保存"; }, 1600);
  }

  function addFavorite(favorite) {
    if (!state.favorites.some((item) => item.query === favorite.query)) {
      state.favorites = [favorite, ...state.favorites];
      saveFavorites();
      renderFavorites();
    }
  }

  function loadFavorites() {
    try {
      const stored = localStorage.getItem("tsukaeru-hashtag-favorites");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.map((item) => {
        if (typeof item === "string") return { label: item, query: item };
        if (item && typeof item.label === "string" && typeof item.query === "string") return item;
        return null;
      }).filter(Boolean).filter((item) => item.query !== "#GoodCocofoliaOheya2025 filter:images" && item.query !== "#CoCシナリオ BOOTH -ネタバレ");
      const merged = defaultFavorites.slice();
      normalized.forEach((item) => {
        if (!merged.some((favorite) => favorite.query === item.query)) merged.push(item);
      });
      state.favorites = merged;
    } catch {
      state.favorites = defaultFavorites.slice();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem("tsukaeru-hashtag-favorites", JSON.stringify(state.favorites));
    } catch {}
  }

  function openXSearch(query) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const latest = trimmed === els.generatedQuery.value.trim() && state.selectedFilters.includes("最新順");
    window.open(window.HashtagParser.buildXSearchUrl(trimmed, latest), "_blank", "noopener,noreferrer");
  }
})();
