export function findScenarioItem(state, item) {
  if (!item) return null;
  for (const scenarioSet of state.scenarioSets || []) {
    const found = (scenarioSet.items || []).find((entry) => entry.baseId === item.id && entry.baseType === item.type);
    if (found) return { ...found, scenarioSetName: scenarioSet.name };
  }
  return null;
}

export function createScenarioItem(item) {
  return {
    id: `scenario_item_${Date.now()}`,
    baseType: item.type,
    baseId: item.id,
    scenarioName: item.name,
    playerText: item.pl_note || item.playerText || "",
    keeperText: item.keeper_note || item.keeperMemo || "",
    successText: "",
    failureText: "",
    memo: item.scenario_note || item.scenarioMemo || "",
    updatedAt: new Date().toISOString(),
    author: "GM"
  };
}

export function ensureScenarioSet(state, name = "未分類シナリオセット") {
  if (!state.scenarioSets.length) {
    state.scenarioSets.push({
      id: `scenario_${Date.now()}`,
      name,
      summary: "",
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return state.scenarioSets[0];
}

export function renderScenarioEditor(item, scenarioItem) {
  const form = document.getElementById("scenarioEditorForm");
  const meta = document.getElementById("scenarioMeta");
  if (!item) {
    form.innerHTML = "<p>一覧からデータを選択してください。</p>";
    meta.textContent = "";
    return;
  }

  const entry = scenarioItem || createScenarioItem(item);
  form.innerHTML = `
    ${field("scenarioName", "シナリオ内名称", entry.scenarioName, "input")}
    ${field("playerText", "PL開示用", entry.playerText, "textarea")}
    ${field("keeperText", "KP用真相メモ", entry.keeperText, "textarea")}
    ${field("successText", "成功時", entry.successText, "textarea")}
    ${field("failureText", "失敗時", entry.failureText, "textarea")}
    ${field("memo", "シナリオ用メモ", entry.memo, "textarea")}
  `;

  meta.innerHTML = `更新日：${formatDate(entry.updatedAt)}<br>作成者：${entry.author || "GM"}<br>所属セット：${entry.scenarioSetName || "未保存"}`;
}

export function collectScenarioEditor(item, previous) {
  const form = document.getElementById("scenarioEditorForm");
  const base = previous || createScenarioItem(item);
  return {
    ...base,
    scenarioName: getValue(form, "scenarioName"),
    playerText: getValue(form, "playerText"),
    keeperText: getValue(form, "keeperText"),
    successText: getValue(form, "successText"),
    failureText: getValue(form, "failureText"),
    memo: getValue(form, "memo"),
    updatedAt: new Date().toISOString()
  };
}

export function upsertScenarioItem(state, scenarioItem) {
  const set = ensureScenarioSet(state, "未分類シナリオセット");
  const index = set.items.findIndex((entry) => entry.id === scenarioItem.id || (entry.baseId === scenarioItem.baseId && entry.baseType === scenarioItem.baseType));
  if (index >= 0) set.items[index] = scenarioItem;
  else set.items.push(scenarioItem);
  set.updatedAt = new Date().toISOString();
}

function field(name, label, value, type) {
  if (type === "textarea") {
    return `<label class="form-label">${label}<textarea name="${name}">${escapeHtml(value || "")}</textarea></label>`;
  }
  return `<label class="form-label">${label}<input name="${name}" value="${escapeHtml(value || "")}" /></label>`;
}

function getValue(root, name) {
  return root.querySelector(`[name="${name}"]`)?.value || "";
}

function formatDate(value) {
  if (!value) return "未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ja-JP");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
