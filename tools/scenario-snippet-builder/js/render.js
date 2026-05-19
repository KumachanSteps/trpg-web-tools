function renderTypeFilters() {
  const allButton = `
    <button
      class="type-filter-btn ${activeFilter === "all" ? "active" : ""}"
      style="--icon-color: #334155;"
      data-filter="all"
    >All</button>
  `;

  const typeButtons = Object.entries(INFO_TYPES)
    .map(([key, info]) => `
      <button
        class="type-filter-btn ${activeFilter === key ? "active" : ""} ${key.startsWith("ho") ? "ho-filter" : ""}"
        style="--icon-color: ${info.color};"
        data-filter="${key}"
        title="${info.label}"
      >${info.marker} ${info.label}</button>
    `)
    .join("");

  typeFilterRow.innerHTML = allButton + typeButtons;
}

function renderCards() {
  cardsList.innerHTML = "";

  const visibleCards = activeFilter === "all"
    ? cards
    : cards.filter(card => card.type === activeFilter);

  visibleCards.forEach(card => {
    const typeInfo = INFO_TYPES[card.type] || INFO_TYPES.memo;
    const cardEl = document.createElement("div");

    cardEl.className = "card";
    cardEl.style.setProperty("--card-color", typeInfo.color);

    cardEl.innerHTML = `
      <div class="card-header">
        <div class="card-type-label">${typeInfo.marker} ${getCardHeaderLabel(card.type)}</div>
        <button class="card-copy-btn" data-action="copy" data-id="${escapeAttribute(card.id)}">コピー</button>
      </div>

      <div class="type-icon-row">
        ${Object.entries(INFO_TYPES).map(([key, info]) => `
          <button
            class="type-icon-btn ${key === card.type ? "active" : ""}"
            style="--icon-color: ${info.color};"
            title="${info.label}"
            data-action="typeIcon"
            data-type="${key}"
            data-id="${escapeAttribute(card.id)}"
          >${info.marker}</button>
        `).join("")}
      </div>

      <div class="card-title-row ${card.type === "skill" ? "skill-title-row" : ""}">
        <div class="card-title-marker">${typeInfo.marker}</div>
        <span class="card-title-prefix">${getTitlePrefix(card.type)}</span>
        <input
          class="card-title-input"
          type="text"
          data-action="title"
          data-id="${escapeAttribute(card.id)}"
          value="${escapeAttribute(card.title)}"
          placeholder="${getTitlePlaceholder(card.type)}"
        >
        <span class="card-title-suffix">${getTitleSuffix(card.type)}</span>
        ${card.type === "skill" ? `
          <input
            class="card-title-input"
            type="text"
            data-action="extra"
            data-id="${escapeAttribute(card.id)}"
            value="${escapeAttribute(card.extra || "")}"
            placeholder="成功時見出し"
          >
        ` : ""}
      </div>

      <textarea
        class="card-body-textarea"
        data-action="body"
        data-id="${escapeAttribute(card.id)}"
        placeholder="情報本文"
      >${escapeHtml(card.body)}</textarea>

      <div class="card-actions">
        <button data-action="duplicate" data-id="${escapeAttribute(card.id)}">複製</button>
        <button class="danger" data-action="delete" data-id="${escapeAttribute(card.id)}">削除</button>
      </div>
    `;

    cardsList.appendChild(cardEl);
  });
}

function buildCardOutput(card) {
  const typeInfo = INFO_TYPES[card.type] || INFO_TYPES.memo;
  const title = (card.title || typeInfo.label).trim();
  const body = (card.body || "").trim();

  if (card.type === "document") {
    return `${typeInfo.marker} 資料：「${title}」\n\n${body}`;
  }

  if (card.type === "location") {
    return `${typeInfo.marker}【${title}】\n\n${body}`;
  }

  if (card.type === "skill") {
    return `${typeInfo.marker}《${title}》成功：${(card.extra || "").trim()}\n\n${body}`;
  }

  if (card.type === "npc") {
    return `${typeInfo.marker} ${title}\n\n${body}`;
  }

  if (["ho1", "ho2", "ho3", "ho4"].includes(card.type)) {
    return `${typeInfo.marker}${getHoPrefix(card.type)}${title}\n\n${body}`;
  }

  return `${typeInfo.marker}${title}\n\n${body}`;
}

function getCardHeaderLabel(type) {
  if (type === "scene") return "シーン描写";

  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) {
    return `${type.replace("ho", "HO")}秘匿`;
  }

  return (INFO_TYPES[type] || INFO_TYPES.memo).label;
}

function getTitlePrefix(type) {
  if (type === "document") return "資料：「";
  if (type === "location") return "【";
  if (type === "skill") return "《";

  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) {
    return getHoPrefix(type);
  }

  return "";
}

function getTitleSuffix(type) {
  if (type === "document") return "」";
  if (type === "location") return "】";
  if (type === "skill") return "》成功：";

  return "";
}

function getTitlePlaceholder(type) {
  if (type === "document") return "資料タイトル";
  if (type === "location") return "Location";
  if (type === "skill") return "Skill Name";
  if (type === "npc") return "NPC名 / 情報タイトル";

  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) {
    return "Title";
  }

  return "カードタイトル";
}

function getHoPrefix(type) {
  return `${type.replace("ho", "HO")}秘匿：`;
}