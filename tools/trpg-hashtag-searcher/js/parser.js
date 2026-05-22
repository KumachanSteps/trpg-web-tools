window.HASHTAG_PARSER = (() => {
  function formatDateForXSearch(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function getRelativeSinceQuery(filter) {
    const date = new Date();
    if (filter === "since:1day") date.setDate(date.getDate() - 1);
    if (filter === "since:3days") date.setDate(date.getDate() - 3);
    if (filter === "since:1week") date.setDate(date.getDate() - 7);
    if (filter === "since:1month") date.setMonth(date.getMonth() - 1);
    return `since:${formatDateForXSearch(date)}`;
  }
  function resolveDynamicQuery(query) {
    return String(query || "")
      .replaceAll("__SINCE_1DAY__", getRelativeSinceQuery("since:1day"))
      .replaceAll("__SINCE_3DAYS__", getRelativeSinceQuery("since:3days"))
      .replaceAll("__SINCE_1WEEK__", getRelativeSinceQuery("since:1week"))
      .replaceAll("__SINCE_1MONTH__", getRelativeSinceQuery("since:1month"));
  }
  function normalizeSpaces(text) { return String(text || "").replace(/\s+/g, " ").trim(); }
  function buildXSearchUrl(query, latest = false) { return `https://x.com/search?q=${encodeURIComponent(query)}${latest ? "&f=live" : ""}&src=typed_query`; }
  function normalizeFavorite(item) {
    if (typeof item === "string") return { label: item, query: item };
    if (item && typeof item.label === "string" && typeof item.query === "string") return { label: item.label, query: item.query };
    return null;
  }
  function normalizePreset(item, index) {
    if (!item || typeof item !== "object") return null;
    const title = typeof item.title === "string" ? item.title : "新しい検索カード";
    const desc = typeof item.desc === "string" ? item.desc : "";
    const query = typeof item.query === "string" ? item.query : "";
    const tag = typeof item.tag === "string" ? item.tag : "Custom";
    const id = typeof item.id === "string" ? item.id : `preset-${index}-${Date.now()}`;
    return { id, title, desc, query, tag };
  }
  function buildQueryFromState(state, templates) {
    const baseQuery = state.isSystemChoiceDisabled ? "" : templates.systemQueries[state.selectedSystem] || "";
    const selectedWordQueries = state.selectedWords.map((word) => templates.wordQueries[word] || word);
    const selectedFilterQueries = state.selectedFilters.filter((filter) => filter !== "最新順").map((filter) => (filter.startsWith("since:1") || filter === "since:3days" ? getRelativeSinceQuery(filter) : filter));
    const selectedExcludeQueries = state.selectedExcludes.map((exclude) => templates.excludeQueries[exclude] || exclude);
    return normalizeSpaces([baseQuery, ...selectedWordQueries, ...selectedFilterQueries, ...state.modeQueryParts, ...selectedExcludeQueries].filter(Boolean).join(" "));
  }
  return { formatDateForXSearch, getRelativeSinceQuery, resolveDynamicQuery, normalizeSpaces, buildXSearchUrl, normalizeFavorite, normalizePreset, buildQueryFromState };
})();
