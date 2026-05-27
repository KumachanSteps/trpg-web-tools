export function buildCopyText(item, scenarioItem, format = "keeper") {
  if (!item) return "";
  const scenarioName = scenarioItem?.scenarioName || item.name;
  const scenarioPlayer = scenarioItem?.playerText || item.pl_note || "";
  const scenarioKeeper = scenarioItem?.keeperText || item.keeper_note || "";

  switch (format) {
    case "player":
      return scenarioPlayer || item.effect_summary || item.name;
    case "discord":
      return `# 【${typeLabel(item.type)}】${scenarioName}\n\n> ${item.effect_summary || ""}\n\n\`\`\`text\nカテゴリ：${item.category || ""}\nタグ：${(item.tags || []).join(" / ")}\n出典：${item.source || ""} ${item.edition || ""} ${item.page || ""}\n\`\`\`\n\n${scenarioPlayer}`.trim();
    case "scenario":
      return `●《${item.category || "神話知識"}》成功：\n${scenarioPlayer || item.effect_summary || "情報を開示する。"}\n\n成功時：\n${scenarioItem?.successText || ""}\n\n失敗時：\n${scenarioItem?.failureText || ""}`.trim();
    case "keeper":
    default:
      return `【${typeLabel(item.type)}】${scenarioName}\nカテゴリ：${item.category || ""}\nタグ：${(item.tags || []).join(" / ")}\n出典：${item.source || ""} ${item.edition || ""} ${item.page || ""}\n\n効果概要：\n${item.effect_summary || ""}\n\nコスト概要：\n${item.cost_summary || ""}\n\n発動・使用時間概要：\n${item.casting_time_summary || item.reading_time_summary || item.activation_summary || ""}\n\nKeeper Note：\n${scenarioKeeper}\n\nPL Note：\n${scenarioPlayer}`.trim();
  }
}

export function typeLabel(type) {
  return {
    spell: "呪文",
    grimoire: "魔導書",
    artifact: "アーティファクト"
  }[type] || "データ";
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
