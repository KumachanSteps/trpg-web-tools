export function exportBackup(state) {
  const payload = {
    app: "digital-grand-grimoire",
    version: "0.2.0",
    exportedAt: new Date().toISOString(),
    items: state.items,
    scenarioSets: state.scenarioSets,
    categories: state.categories,
    tags: state.tags,
    sources: state.sources
  };
  downloadJson(payload, `digital-grand-grimoire-backup-${dateStamp()}.json`);
}

export function exportSingleItem(item) {
  downloadJson(item, `${item.id || "grand-grimoire-item"}.json`);
}

export async function importBackupFromFile(file) {
  const text = await file.text();
  const payload = JSON.parse(text);

  if (Array.isArray(payload)) {
    return { items: payload };
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : undefined,
    scenarioSets: Array.isArray(payload.scenarioSets) ? payload.scenarioSets : undefined,
    categories: payload.categories && typeof payload.categories === "object" ? payload.categories : undefined,
    tags: Array.isArray(payload.tags) ? payload.tags : undefined,
    sources: Array.isArray(payload.sources) ? payload.sources : undefined
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
