export function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

export function filterItems(items, filters) {
  const query = normalizeText(filters.query);
  return items.filter((item) => {
    if (filters.type && filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.tag && filters.tag !== "all" && !(item.tags || []).includes(filters.tag)) return false;

    if (!query) return true;
    const haystack = [
      item.name,
      ...(item.alternative_names || []),
      item.category,
      item.source,
      item.edition,
      item.page,
      item.cost_summary,
      item.casting_time_summary,
      item.effect_summary,
      item.keeper_note,
      item.pl_note,
      item.full_text,
      item.language_summary,
      item.reading_time_summary,
      item.contents_summary,
      item.appearance_summary,
      item.activation_summary,
      item.risk_summary,
      item.destruction_summary,
      ...(item.included_spells || []),
      ...(item.tags || [])
    ].map(normalizeText).join(" ");

    return haystack.includes(query);
  }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export function buildFilterOptions(items) {
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort();
  const tags = [...new Set(items.flatMap((item) => item.tags || []))].sort();
  return { categories, tags };
}
