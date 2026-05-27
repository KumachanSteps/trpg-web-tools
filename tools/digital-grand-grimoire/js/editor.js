import { EMPTY_ITEM, TYPE_ICONS, TYPE_LABELS } from "./sample-data.js";

const COMMON_FIELDS = [
  ["type", "種別", "select", false],
  ["name", "名称", "text", false],
  ["alternative_names", "別名・原題（カンマ区切り）", "text", false],
  ["category", "カテゴリ", "text", false],
  ["tags", "タグ（カンマ区切り）", "text", false],
  ["source", "出典", "text", false],
  ["edition", "版 / Edition", "text", false],
  ["page", "ページ", "text", false]
];

const TYPE_FIELDS = {
  spell: [
    ["cost_summary", "コスト概要", "textarea", true],
    ["casting_time_summary", "発動時間概要", "textarea", true],
    ["effect_summary", "効果概要", "textarea", true],
    ["keeper_note", "Keeper Note", "textarea", true],
    ["pl_note", "PL Note", "textarea", true],
    ["audience", "想定読者（カンマ区切り）", "text", false],
    ["full_text", "本文控え（任意 / 空欄推奨）", "textarea", true]
  ],
  grimoire: [
    ["language_summary", "言語・判読概要", "textarea", true],
    ["reading_time_summary", "読了・研究時間概要", "textarea", true],
    ["contents_summary", "収録内容概要", "textarea", true],
    ["included_spells", "収録呪文ID（カンマ区切り）", "text", false],
    ["effect_summary", "効果概要", "textarea", true],
    ["keeper_note", "Keeper Note", "textarea", true],
    ["pl_note", "PL Note", "textarea", true],
    ["audience", "想定読者（カンマ区切り）", "text", false],
    ["full_text", "本文控え（任意 / 空欄推奨）", "textarea", true]
  ],
  artifact: [
    ["appearance_summary", "外見概要", "textarea", true],
    ["activation_summary", "使用・起動条件概要", "textarea", true],
    ["cost_summary", "コスト概要", "textarea", true],
    ["effect_summary", "効果概要", "textarea", true],
    ["risk_summary", "リスク概要", "textarea", true],
    ["destruction_summary", "破壊・無効化概要", "textarea", true],
    ["keeper_note", "Keeper Note", "textarea", true],
    ["pl_note", "PL Note", "textarea", true],
    ["audience", "想定読者（カンマ区切り）", "text", false],
    ["full_text", "本文控え（任意 / 空欄推奨）", "textarea", true]
  ]
};

const META_FIELDS = [
  ["favorite", "お気に入り", "checkbox", false],
  ["scenarioEdited", "シナリオ編集あり", "checkbox", false]
];

export function createNewItem(type = "spell") {
  const now = new Date().toISOString();
  return {
    ...structuredClone(EMPTY_ITEM[type] || EMPTY_ITEM.spell),
    id: `${type}_${Date.now()}`,
    type,
    typeLabel: TYPE_LABELS[type] || "データ",
    icon: TYPE_ICONS[type] || "◇",
    updatedAt: now
  };
}

export function openItemEditor({ item, onSave }) {
  const dialog = document.getElementById("editorDialog");
  const title = document.getElementById("editorTitle");
  const fields = document.getElementById("editorFields");
  const applyBtn = document.getElementById("applyEditorBtn");
  let editing = normalizeItemForEditor(item);

  title.textContent = item.id ? "データ編集" : "新規登録";
  renderEditorFields(fields, editing);
  fields.onchange = (event) => {
    if (event.target?.name === "type") {
      editing = normalizeItemForEditor({ ...editing, type: event.target.value });
      renderEditorFields(fields, editing);
    }
  };

  applyBtn.onclick = (event) => {
    event.preventDefault();
    const next = collectFormValues(fields, editing);
    next.typeLabel = TYPE_LABELS[next.type] || next.typeLabel || "データ";
    next.icon = TYPE_ICONS[next.type] || next.icon || "◇";
    next.updatedAt = new Date().toISOString();
    if (!next.id) next.id = `${next.type}_${Date.now()}`;
    onSave(next);
    dialog.close();
  };

  dialog.showModal();
}

function renderEditorFields(fields, editing) {
  const config = [...COMMON_FIELDS, ...(TYPE_FIELDS[editing.type] || TYPE_FIELDS.spell), ...META_FIELDS];
  fields.innerHTML = config.map(([key, label, inputType, wide]) => renderField(key, label, inputType, editing, wide)).join("");
}

function normalizeItemForEditor(item) {
  const type = item.type || "spell";
  return {
    ...structuredClone(EMPTY_ITEM[type] || EMPTY_ITEM.spell),
    ...item,
    type,
    typeLabel: item.typeLabel || TYPE_LABELS[type] || "データ",
    icon: item.icon || TYPE_ICONS[type] || "◇",
    favorite: item.favorite ?? item.isFavorite ?? false,
    scenarioEdited: item.scenarioEdited ?? false,
    alternative_names: item.alternative_names || (item.originalName ? [item.originalName] : []),
    effect_summary: item.effect_summary ?? item.summary ?? "",
    keeper_note: item.keeper_note ?? item.keeperMemo ?? "",
    pl_note: item.pl_note ?? item.playerText ?? "",
    full_text: item.full_text ?? item.description ?? ""
  };
}

function renderField(key, label, inputType, item, wide) {
  const value = item[key];
  const wideClass = wide ? " wide" : "";
  if (inputType === "select") {
    return `<label class="${wideClass}">${label}<select name="${key}">
      <option value="spell" ${item.type === "spell" ? "selected" : ""}>呪文</option>
      <option value="grimoire" ${item.type === "grimoire" ? "selected" : ""}>魔導書</option>
      <option value="artifact" ${item.type === "artifact" ? "selected" : ""}>アーティファクト</option>
    </select></label>`;
  }
  if (inputType === "textarea") {
    return `<label class="${wideClass}">${label}<textarea name="${key}">${escapeHtml(value || "")}</textarea></label>`;
  }
  if (inputType === "checkbox") {
    return `<label class="${wideClass}">${label}<select name="${key}"><option value="false" ${!value ? "selected" : ""}>いいえ</option><option value="true" ${value ? "selected" : ""}>はい</option></select></label>`;
  }
  const renderedValue = Array.isArray(value) ? value.join(", ") : (value || "");
  return `<label class="${wideClass}">${label}<input name="${key}" value="${escapeHtml(renderedValue)}" /></label>`;
}

function collectFormValues(root, original) {
  const next = { ...original };
  const config = [...COMMON_FIELDS, ...(TYPE_FIELDS[original.type] || TYPE_FIELDS.spell), ...META_FIELDS];
  config.forEach(([key, _label, inputType]) => {
    const el = root.querySelector(`[name="${key}"]`);
    if (!el) return;
    if (["tags", "alternative_names", "audience", "included_spells"].includes(key)) {
      next[key] = el.value.split(",").map((value) => value.trim()).filter(Boolean);
    } else if (inputType === "checkbox") {
      next[key] = el.value === "true";
    } else {
      next[key] = el.value;
    }
  });
  return next;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
