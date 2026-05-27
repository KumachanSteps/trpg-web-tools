const STORAGE_KEYS = {
  items: "digitalGrandGrimoire.items.v0_2",
  scenarioSets: "digitalGrandGrimoire.scenarioSets.v0_2",
  categories: "digitalGrandGrimoire.categories.v0_2",
  tags: "digitalGrandGrimoire.tags.v0_2",
  sources: "digitalGrandGrimoire.sources.v0_2",
  theme: "digitalGrandGrimoire.theme.v0_2"
};

const LEGACY_STORAGE_KEYS = {
  items: "digitalGrandGrimoire.items.v0_1",
  scenarioSets: "digitalGrandGrimoire.scenarioSets.v0_1",
  categories: "digitalGrandGrimoire.categories.v0_1",
  tags: "digitalGrandGrimoire.tags.v0_1",
  sources: "digitalGrandGrimoire.sources.v0_1",
  theme: "digitalGrandGrimoire.theme.v0_1"
};

async function safeFetchJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`Could not load ${path}.`, error);
    return fallback;
  }
}

function readLocal(key, fallback, legacyKey = null) {
  try {
    const raw = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Could not read localStorage key ${key}.`, error);
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function loadInitialData() {
  const [spells, grimoires, artifacts, scenarioSets, tags, sources, categories] = await Promise.all([
    safeFetchJson("./data/spells.json", []),
    safeFetchJson("./data/grimoires.json", []),
    safeFetchJson("./data/artifacts.json", []),
    safeFetchJson("./data/scenario_sets.json", []),
    safeFetchJson("./data/tags.json", []),
    safeFetchJson("./data/sources.json", []),
    safeFetchJson("./data/categories.json", {})
  ]);

  const fileItems = [...spells, ...grimoires, ...artifacts].map(normalizeItem);
  return {
    items: readLocal(STORAGE_KEYS.items, fileItems, LEGACY_STORAGE_KEYS.items).map(normalizeItem),
    scenarioSets: readLocal(STORAGE_KEYS.scenarioSets, scenarioSets, LEGACY_STORAGE_KEYS.scenarioSets),
    categories: readLocal(STORAGE_KEYS.categories, categories, LEGACY_STORAGE_KEYS.categories),
    tags: readLocal(STORAGE_KEYS.tags, tags, LEGACY_STORAGE_KEYS.tags),
    sources: readLocal(STORAGE_KEYS.sources, sources, LEGACY_STORAGE_KEYS.sources)
  };
}

export function saveAllData(state) {
  writeLocal(STORAGE_KEYS.items, state.items.map(normalizeItem));
  writeLocal(STORAGE_KEYS.scenarioSets, state.scenarioSets);
  writeLocal(STORAGE_KEYS.categories, state.categories);
  writeLocal(STORAGE_KEYS.tags, state.tags);
  writeLocal(STORAGE_KEYS.sources, state.sources);
}

export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || localStorage.getItem(LEGACY_STORAGE_KEYS.theme) || "dark";
}

export function clearSavedData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

function normalizeItem(item) {
  const type = item.type || "spell";
  const typeLabel = item.typeLabel || { spell: "呪文", grimoire: "魔導書", artifact: "アーティファクト" }[type] || "データ";
  const icon = item.icon || { spell: "✦", grimoire: "▣", artifact: "◆" }[type] || "◇";
  return {
    ...item,
    type,
    typeLabel,
    icon,
    alternative_names: item.alternative_names || (item.originalName ? [item.originalName] : []),
    effect_summary: item.effect_summary ?? item.summary ?? "",
    keeper_note: item.keeper_note ?? item.keeperMemo ?? "",
    pl_note: item.pl_note ?? item.playerText ?? "",
    full_text: item.full_text ?? item.description ?? "",
    favorite: item.favorite ?? item.isFavorite ?? false,
    scenarioEdited: item.scenarioEdited ?? false,
    audience: item.audience || ["keeper"]
  };
}
