function renderTypeSelectOptions() {
  const optionsHtml = Object.entries(INFO_TYPES)
    .map(([key, info]) => `<option value="${key}">${info.marker} ${info.label}</option>`)
    .join("");

  newCardType.innerHTML = optionsHtml;
  selectionCardType.innerHTML = optionsHtml;

  if (!newCardType.value || !INFO_TYPES[newCardType.value]) newCardType.value = "scene";
  if (!selectionCardType.value || !INFO_TYPES[selectionCardType.value]) selectionCardType.value = "memo";
}

function renderTypeFilters() {
  const allButton = `
    <button
      class="type-filter-btn ${activeFilter === "all" ? "active" : ""}"
      style="--icon-color: #334155;"
      data-filter="all"
      type="button"
    >All</button>
  `;

  const typeButtons = Object.entries(INFO_TYPES)
    .map(([key, info]) => `
      <button
        class="type-filter-btn ${activeFilter === key ? "active" : ""} ${key.startsWith("ho") ? "ho-filter" : ""}"
        style="--icon-color: ${info.color};"
        data-filter="${key}"
        title="${info.label}"
        type="button"
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
        <div class="card-copy-group">
          <button class="card-copy-btn" data-action="copy" data-id="${escapeAttribute(card.id)}" type="button">コピー</button>
          <button
            class="card-mini-btn"
            data-action="ccfoliaChat"
            data-id="${escapeAttribute(card.id)}"
            title="CCFOLIAチャットへコピー"
            type="button"
          >チャット用</button>
          <button
            class="card-mini-btn"
            data-action="ccfoliaText"
            data-id="${escapeAttribute(card.id)}"
            title="CCFOLIAテキストへコピー"
            type="button"
          >テキスト用</button>
        </div>
      </div>

      <div class="card-utility-row">
        <div class="type-icon-row">
          ${Object.entries(INFO_TYPES).map(([key, info]) => `
            <button
              class="type-icon-btn ${key === card.type ? "active" : ""}"
              style="--icon-color: ${info.color};"
              title="${info.label}"
              data-action="typeIcon"
              data-type="${key}"
              data-id="${escapeAttribute(card.id)}"
              type="button"
            >${info.marker}</button>
          `).join("")}
        </div>
        <div class="card-actions">
          <button data-action="duplicate" data-id="${escapeAttribute(card.id)}" type="button">複製</button>
          <button class="danger" data-action="delete" data-id="${escapeAttribute(card.id)}" type="button">削除</button>
        </div>
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
        rows="4"
      >${escapeHtml(card.body)}</textarea>
    `;

    cardsList.appendChild(cardEl);

    const bodyTextarea = cardEl.querySelector(".card-body-textarea");
    if (bodyTextarea) adjustCardTextareaHeight(bodyTextarea);
  });
}

function adjustCardTextareaHeight(textarea) {
  if (!textarea) return;

  textarea.style.height = "auto";

  const computed = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(computed.lineHeight) || 17.4;
  const paddingTop = parseFloat(computed.paddingTop) || 0;
  const paddingBottom = parseFloat(computed.paddingBottom) || 0;
  const minHeight = lineHeight * 4 + paddingTop + paddingBottom;
  const maxHeight = lineHeight * 6 + paddingTop + paddingBottom;
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function buildCardOutput(card) {
  const typeInfo = INFO_TYPES[card.type] || INFO_TYPES.memo;
  const title = (card.title || typeInfo.label).trim();
  const body = (card.body || "").trim();

  if (card.type === "document") return `${typeInfo.marker} 資料：「${title}」\n\n${body}`;
  if (card.type === "location") return `${typeInfo.marker}【${title}】\n\n${body}`;
  if (card.type === "skill") return `${typeInfo.marker}《${title}》成功：${(card.extra || "").trim()}\n\n${body}`;
  if (card.type === "npc") return `${typeInfo.marker} ${title}\n\n${body}`;
  if (["ho1", "ho2", "ho3", "ho4"].includes(card.type)) return `${typeInfo.marker}${getHoPrefix(card.type)}${title}\n\n${body}`;

  return `${typeInfo.marker}${title}\n\n${body}`;
}

function buildCcfPayload(card, mode) {
  const title = getCcfTitle(card);
  const text = getCcfText(card);

  if (mode === "chat") {
    return {
      source: "scenario-snippet-builder",
      mode: "chat",
      sender: title,
      message: text
    };
  }

  return {
    source: "scenario-snippet-builder",
    mode: "text",
    title,
    text
  };
}

function getCcfTitle(card) {
  const typeInfo = INFO_TYPES[card.type] || INFO_TYPES.memo;
  return (card.title || typeInfo.label).trim();
}

function getCcfText(card) {
  return (card.body || "").trim();
}

function getCardHeaderLabel(type) {
  if (type === "scene") return "シーン描写";
  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) return `${type.replace("ho", "HO")}秘匿`;
  return (INFO_TYPES[type] || INFO_TYPES.memo).label;
}

function getTitlePrefix(type) {
  if (type === "document") return "資料：「";
  if (type === "location") return "【";
  if (type === "skill") return "《";
  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) return getHoPrefix(type);
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
  if (["ho1", "ho2", "ho3", "ho4"].includes(type)) return "Title";
  return "カードタイトル";
}

function getHoPrefix(type) {
  return `${type.replace("ho", "HO")}秘匿：`;
}
