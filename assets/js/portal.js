const portalI18n = window.TRPG_PORTAL_I18N;
let tools = Array.isArray(portalI18n.tools) ? portalI18n.tools : [];
const statusMeta = portalI18n.statuses;

let currentCategory = "all";
let currentQuery = "";

const toolsGrid = document.getElementById("toolsGrid");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.getElementById("categoryButtons");
const availableCount = document.getElementById("availableCount");
const productionCount = document.getElementById("productionCount");
const ideaCount = document.getElementById("ideaCount");
const modeToggle = document.getElementById("modeToggle");
const modeIcon = document.getElementById("modeIcon");
const modeText = document.getElementById("modeText");
const twinkleStarsContainer = document.getElementById("twinkleStars");

const themeStorageKey = "trpgPortalThemeV2";
const devToolsStorageKey = "trpgPortalDevToolsDraftV1";
const toolsDataUrl = "./assets/data/tools.json";
const isDeveloperMode = document.body.dataset.portalMode === "developer";
const devSaveButton = document.getElementById("devSaveButton");
const devExportButton = document.getElementById("devExportButton");
const devResetButton = document.getElementById("devResetButton");

const twinkleStars = [
  { top: "8%", left: "12%", size: 3, delay: "0s", duration: "3.8s" },
  { top: "14%", left: "28%", size: 2, delay: "1.2s", duration: "4.6s" },
  { top: "10%", left: "46%", size: 4, delay: "0.8s", duration: "5.2s" },
  { top: "18%", left: "64%", size: 3, delay: "2.4s", duration: "4.2s" },
  { top: "12%", left: "82%", size: 2, delay: "1.8s", duration: "5.4s" },
  { top: "26%", left: "18%", size: 2, delay: "0.4s", duration: "4.8s" },
  { top: "30%", left: "36%", size: 3, delay: "2.1s", duration: "3.9s" },
  { top: "24%", left: "58%", size: 2, delay: "1.1s", duration: "5.8s" },
  { top: "34%", left: "76%", size: 4, delay: "3s", duration: "4.4s" },
  { top: "42%", left: "10%", size: 2, delay: "2.7s", duration: "5.1s" },
  { top: "46%", left: "30%", size: 3, delay: "0.9s", duration: "4.7s" },
  { top: "40%", left: "52%", size: 2, delay: "1.7s", duration: "5.5s" },
  { top: "52%", left: "70%", size: 3, delay: "2.9s", duration: "4.3s" },
  { top: "60%", left: "22%", size: 2, delay: "1.4s", duration: "5.6s" },
  { top: "66%", left: "48%", size: 4, delay: "0.6s", duration: "4.1s" },
  { top: "72%", left: "84%", size: 3, delay: "2.2s", duration: "4.9s" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLanguage() {
  if (window.TRPGLanguage && typeof window.TRPGLanguage.getLanguage === "function") {
    return window.TRPGLanguage.getLanguage();
  }

  return portalI18n.defaultLanguage || "ja";
}

function t(path) {
  if (window.TRPGLanguage && typeof window.TRPGLanguage.t === "function") {
    return window.TRPGLanguage.t(path);
  }

  return path;
}

function getLocalizedValue(value) {
  const language = getLanguage();

  if (window.TRPGLanguage && typeof window.TRPGLanguage.getLocalizedValue === "function") {
    return window.TRPGLanguage.getLocalizedValue(value, language);
  }

  if (value && typeof value === "object") {
    return value[language] || value.ja || value.en || "";
  }

  return value || "";
}

async function loadToolsData() {
  try {
    const response = await fetch(toolsDataUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load ${toolsDataUrl}: ${response.status}`);
    }

    tools = await response.json();
  } catch (error) {
    console.warn(error);
    tools = Array.isArray(portalI18n.tools) ? portalI18n.tools : [];
  }

  if (isDeveloperMode) {
    loadDeveloperDraft();
  }
}

function loadDeveloperDraft() {
  const savedDraft = localStorage.getItem(devToolsStorageKey);

  if (!savedDraft) {
    return;
  }

  try {
    const draftTools = JSON.parse(savedDraft);

    if (Array.isArray(draftTools)) {
      tools = draftTools;
    }
  } catch (error) {
    console.warn("Failed to load developer tools draft", error);
  }
}

function saveDeveloperDraft() {
  if (!isDeveloperMode) {
    return;
  }

  localStorage.setItem(devToolsStorageKey, JSON.stringify(tools, null, 2));
}

function downloadDeveloperToolsJson() {
  const json = JSON.stringify(tools, null, 2) + "\n";
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tools.json";
  link.click();
  URL.revokeObjectURL(url);
}

function createTwinkleStars() {
  if (!twinkleStarsContainer || twinkleStarsContainer.dataset.ready === "true") {
    return;
  }

  twinkleStars.forEach((star) => {
    const element = document.createElement("span");
    element.className = "twinkle-star";
    element.style.top = star.top;
    element.style.left = star.left;
    element.style.width = `${star.size}px`;
    element.style.height = `${star.size}px`;
    element.style.animationDelay = star.delay;
    element.style.animationDuration = star.duration;
    twinkleStarsContainer.appendChild(element);
  });

  twinkleStarsContainer.dataset.ready = "true";
}

function updateDeveloperChrome() {
  if (!isDeveloperMode) {
    return;
  }

  document.title = `${t("dev.bannerTitle")} | ${t("meta.title")}`;
}

function updateStatusCounts() {
  const counts = tools.reduce((acc, tool) => {
    acc[tool.status] = (acc[tool.status] || 0) + 1;
    return acc;
  }, {});

  availableCount.textContent = counts.available || 0;
  productionCount.textContent = counts.production || 0;
  ideaCount.textContent = counts.idea || 0;
}

function isDevTool(tool) {
  return tool.status === "idea" || Boolean(tool.devHref) || Boolean(tool.devStage);
}

function getToolHref(tool) {
  if (isDeveloperMode && tool.devHref) {
    return tool.devHref;
  }

  return tool.href || "";
}

function getDevStageLabel(stage) {
  return stage ? t(`dev.stages.${stage}`) : "";
}

function getFilteredTools() {
  const normalizedQuery = currentQuery.trim().toLowerCase();

  return tools.filter((tool) => {
    const badges = Array.isArray(tool.badges) ? tool.badges : [];
    const legacyKeywords = Array.isArray(tool.legacyKeywords) ? tool.legacyKeywords : [];
    const matchesCategory =
      currentCategory === "all" ||
      (currentCategory === "devOnly" && isDeveloperMode && isDevTool(tool)) ||
      badges.includes(currentCategory);

    const searchableText = [
      getLocalizedValue(tool.name),
      getLocalizedValue(tool.description),
      getLocalizedValue(tool.devNote),
      getDevStageLabel(tool.devStage),
      ...badges.map((badge) => t(`categories.${badge}`)),
      ...legacyKeywords,
      t(`status.${tool.status}`),
      tool.id,
      tool.category,
      tool.status,
      tool.devStage,
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery =
      !normalizedQuery || searchableText.includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

function updateToolById(toolId, updater) {
  const toolIndex = tools.findIndex((tool) => tool.id === toolId);

  if (toolIndex === -1) {
    return;
  }

  tools[toolIndex] = updater({ ...tools[toolIndex] });
  saveDeveloperDraft();
  updateStatusCounts();
  renderTools();
}

function createDeveloperEditor(tool) {
  if (!isDeveloperMode) {
    return "";
  }

  const statusOptions = ["available", "production", "idea"]
    .map((status) => `<option value="${escapeHtml(status)}" ${tool.status === status ? "selected" : ""}>${escapeHtml(t(`status.${status}`))}</option>`)
    .join("");
  const stageOptions = ["concept", "mockup", "prototype", "testing"]
    .map((stage) => `<option value="${escapeHtml(stage)}" ${tool.devStage === stage ? "selected" : ""}>${escapeHtml(getDevStageLabel(stage))}</option>`)
    .join("");
  const devNote = getLocalizedValue(tool.devNote);

  return `
    <div class="dev-editor" data-dev-editor="${escapeHtml(tool.id)}">
      <label>
        <span>Status</span>
        <select data-dev-field="status">
          ${statusOptions}
        </select>
      </label>
      <label>
        <span>${escapeHtml(t("dev.stageLabel"))}</span>
        <select data-dev-field="devStage">
          ${stageOptions}
        </select>
      </label>
      <label class="dev-editor-note">
        <span>${escapeHtml(t("dev.memoLabel"))}</span>
        <textarea data-dev-field="devNote" rows="3">${escapeHtml(devNote)}</textarea>
      </label>
    </div>
  `;
}

function createToolCard(tool, index) {
  const meta = statusMeta[tool.status] || statusMeta.idea;
  const effectiveHref = getToolHref(tool);
  const isDisabled = !effectiveHref || (!isDeveloperMode && tool.status === "idea");
  const isDevelopment = tool.status === "production";
  const tagName = isDisabled ? "article" : "a";

  const toolName = getLocalizedValue(tool.name);
  const toolDescription = getLocalizedValue(tool.description);
  const badges = Array.isArray(tool.badges) ? tool.badges : [];
  const statusLabel = t(`status.${tool.status}`);
  const developmentPreviewText = t("toolAction.developmentPreview");
  const devStageLabel = isDeveloperMode ? getDevStageLabel(tool.devStage) : "";
  const devNote = isDeveloperMode ? getLocalizedValue(tool.devNote) : "";

  const card = document.createElement(tagName);
  card.className = [
    "tool-card",
    `tool-card-status-${tool.status}`,
    isDisabled ? "is-disabled" : "",
    isDevelopment ? "is-development" : "",
    isDeveloperMode ? "is-dev-editable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  card.style.animationDelay = `${index * 0.045}s`;
  card.dataset.toolId = tool.id;

  if (isDeveloperMode) {
    card.draggable = true;
  }

  if (isDevelopment) {
    card.setAttribute("data-hover-message", developmentPreviewText);
  }

  if (!isDisabled) {
    card.href = effectiveHref;
    card.setAttribute("aria-label", `${t("toolAction.open")} ${toolName}`);
  } else {
    card.setAttribute("aria-label", `${toolName}, ${t("toolAction.comingSoon")}`);
  }

  card.innerHTML = `
    <div class="tool-card-top">
      <div class="tool-icon" aria-hidden="true">${escapeHtml(tool.icon)}</div>
      <span class="status-badge ${escapeHtml(meta.className)}">
        <span aria-hidden="true">${escapeHtml(meta.icon)}</span>
        ${escapeHtml(statusLabel)}
      </span>
    </div>

    <div class="tool-badges" aria-label="${escapeHtml(t("categories.badgeLabel"))}">
      ${badges
        .map((badge) => `<span class="tool-badge">${escapeHtml(t(`categories.${badge}`))}</span>`)
        .join("")}
    </div>
    <h2>${escapeHtml(toolName)}</h2>
    <p class="tool-description">${escapeHtml(toolDescription)}</p>

    ${
      isDeveloperMode && (devStageLabel || devNote)
        ? `<div class="dev-tool-meta">
            ${devStageLabel ? `<span class="dev-stage-pill">${escapeHtml(t("dev.stageLabel"))}: ${escapeHtml(devStageLabel)}</span>` : ""}
            ${devNote ? `<p><strong>${escapeHtml(t("dev.memoLabel"))}:</strong> ${escapeHtml(devNote)}</p>` : ""}
          </div>`
        : ""
    }

    ${createDeveloperEditor(tool)}

    <div class="open-text">
      ${isDisabled ? escapeHtml(t("toolAction.comingSoon")) : escapeHtml(t("toolAction.open"))}
    </div>

    ${
      isDevelopment
        ? `<div class="tool-hover-message">${escapeHtml(developmentPreviewText)}</div>`
        : ""
    }
  `;

  return card;
}

function renderTools() {
  const filteredTools = getFilteredTools();
  toolsGrid.innerHTML = "";

  if (filteredTools.length === 0) {
    toolsGrid.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">${escapeHtml(t("empty.title"))}</p>
        <p class="empty-text">${escapeHtml(t("empty.text"))}</p>
      </div>
    `;
    return;
  }

  filteredTools.forEach((tool, index) => {
    toolsGrid.appendChild(createToolCard(tool, index));
  });

  bindDeveloperEditors();
}

function bindDeveloperEditors() {
  if (!isDeveloperMode) {
    return;
  }

  toolsGrid.querySelectorAll(".tool-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", card.dataset.toolId);
      card.classList.add("is-dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("is-drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drag-over");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("is-drag-over");
      const sourceId = event.dataTransfer.getData("text/plain");
      const targetId = card.dataset.toolId;

      if (!sourceId || !targetId || sourceId === targetId) {
        return;
      }

      const sourceIndex = tools.findIndex((tool) => tool.id === sourceId);
      const targetIndex = tools.findIndex((tool) => tool.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return;
      }

      const [movedTool] = tools.splice(sourceIndex, 1);
      tools.splice(targetIndex, 0, movedTool);
      saveDeveloperDraft();
      renderTools();
    });
  });

  toolsGrid.querySelectorAll("[data-dev-editor]").forEach((editor) => {
    const toolId = editor.dataset.devEditor;

    editor.querySelectorAll("[data-dev-field]").forEach((field) => {
      field.addEventListener("change", () => {
        updateToolById(toolId, (tool) => {
          if (field.dataset.devField === "devNote") {
            tool.devNote = { ...(tool.devNote || {}), [getLanguage()]: field.value };
          } else {
            tool[field.dataset.devField] = field.value;
          }

          return tool;
        });
      });
    });
  });
}

function updateCategoryButtons() {
  const buttons = categoryButtons.querySelectorAll(".category-button");

  buttons.forEach((button) => {
    const isActive = button.dataset.category === currentCategory;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setMode(mode) {
  const isDawnMode = mode === "dawn";

  document.body.classList.toggle("theme-dawn", isDawnMode);

  modeIcon.textContent = isDawnMode ? "☾" : "☀";
  modeText.textContent = isDawnMode
    ? t("mode.switchToDeepSpace")
    : t("mode.switchToDawn");

  modeToggle.setAttribute(
    "aria-label",
    isDawnMode ? t("mode.ariaToDeepSpace") : t("mode.ariaToDawn")
  );

  localStorage.setItem(themeStorageKey, isDawnMode ? "dawn" : "deep-space");
}

function getCurrentMode() {
  return document.body.classList.contains("theme-dawn") ? "dawn" : "deep-space";
}

function initMode() {
  const savedMode = localStorage.getItem(themeStorageKey);

  if (savedMode === "deep-space") {
    setMode("deep-space");
    return;
  }

  setMode("dawn");
}

searchInput.addEventListener("input", (event) => {
  currentQuery = event.target.value;
  renderTools();
});

categoryButtons.addEventListener("click", (event) => {
  const button = event.target.closest(".category-button");

  if (!button) {
    return;
  }

  currentCategory = button.dataset.category || "all";
  updateCategoryButtons();
  renderTools();
});

if (devSaveButton) {
  devSaveButton.addEventListener("click", () => {
    saveDeveloperDraft();
  });
}

if (devExportButton) {
  devExportButton.addEventListener("click", () => {
    downloadDeveloperToolsJson();
  });
}

if (devResetButton) {
  devResetButton.addEventListener("click", () => {
    localStorage.removeItem(devToolsStorageKey);
    loadToolsData().then(() => {
      updateStatusCounts();
      renderTools();
    });
  });
}

modeToggle.addEventListener("click", () => {
  const currentMode = getCurrentMode();
  setMode(currentMode === "dawn" ? "deep-space" : "dawn");
});

if (window.TRPGLanguage && typeof window.TRPGLanguage.onChange === "function") {
  window.TRPGLanguage.onChange(() => {
    updateDeveloperChrome();
    updateStatusCounts();
    updateCategoryButtons();
    setMode(getCurrentMode());
    renderTools();
  });
}

async function initPortal() {
  createTwinkleStars();
  await loadToolsData();
  updateDeveloperChrome();
  updateStatusCounts();
  updateCategoryButtons();
  initMode();
  renderTools();
}

initPortal();

