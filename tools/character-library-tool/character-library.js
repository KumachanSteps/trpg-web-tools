/* =========================================================
   Character Library JS
   Gallery filtering + Detail rendering
   ========================================================= */

const SYSTEM_LABELS = {
  coc6: "CoC 6版",
  coc7: "CoC 7版",
  emoklore: "エモクロア",
};

const SYSTEM_DOTS = {
  coc6: "6",
  coc7: "7",
  emoklore: "E",
};

const STATUS_LABELS = {
  active: "Active",
  lost: "Lost",
  retire: "Retire",
};

const state = {
  query: "",
  filters: {
    system: "all",
    status: "all",
    stat: null,
    skill: null,
    tag: null,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  bindGlobalPanels();

  if (page === "gallery") {
    initGallery();
  }

  if (page === "detail") {
    initDetail();
  }
});

function bindGlobalPanels() {
  const helpPanel = document.getElementById("helpPanel");
  const shortcutPanel = document.getElementById("shortcutPanel");

  document.querySelectorAll("[data-action='show-help']").forEach((button) => {
    button.addEventListener("click", () => {
      helpPanel?.classList.toggle("hidden");
      shortcutPanel?.classList.add("hidden");
    });
  });

  document.querySelectorAll("[data-action='show-shortcuts']").forEach((button) => {
    button.addEventListener("click", () => {
      shortcutPanel?.classList.toggle("hidden");
      helpPanel?.classList.add("hidden");
    });
  });

  document.querySelectorAll("[data-close-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".info-panel")?.classList.add("hidden");
    });
  });

  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? event.metaKey : event.ctrlKey;

    if (event.key === "Escape") {
      helpPanel?.classList.add("hidden");
      shortcutPanel?.classList.add("hidden");
    }

    if (mod && event.key.toLowerCase() === "f") {
      const input = document.getElementById("searchInput");
      if (input) {
        event.preventDefault();
        input.focus();
      }
    }

    if (mod && event.shiftKey && event.key.toLowerCase() === "f") {
      const panel = document.getElementById("filterPanel");
      if (panel) {
        event.preventDefault();
        toggleFilterPanel();
      }
    }
  });
}

function initGallery() {
  renderCounts();
  animateCounts();

  const toggleButton = document.getElementById("toggleFilterBtn");
  toggleButton?.addEventListener("click", toggleFilterPanel);

  const searchInput = document.getElementById("searchInput");
  searchInput?.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderGallery();
  });

  document.querySelectorAll("[data-filter-group]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter-value]");
      if (!button) return;

      const groupName = group.dataset.filterGroup;
      const value = button.dataset.filterValue;

      if (groupName === "system" || groupName === "status") {
        state.filters[groupName] = value;
        group.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
        button.classList.add("active");
      } else {
        const alreadyActive = button.classList.contains("active");
        group.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
        state.filters[groupName] = alreadyActive ? null : value;
        if (!alreadyActive) button.classList.add("active");
      }

      renderGallery();
    });
  });

  renderGallery();
}

function toggleFilterPanel() {
  const panel = document.getElementById("filterPanel");
  const button = document.getElementById("toggleFilterBtn");
  if (!panel || !button) return;

  panel.classList.toggle("collapsed");
  const collapsed = panel.classList.contains("collapsed");
  button.textContent = collapsed ? "＋" : "×";
  button.title = collapsed ? "詳細フィルターを開く" : "パネルを閉じる";
}

function renderCounts() {
  const counts = {
    total: CHARACTERS.length,
    coc6: CHARACTERS.filter((c) => c.system === "coc6").length,
    coc7: CHARACTERS.filter((c) => c.system === "coc7").length,
    emoklore: CHARACTERS.filter((c) => c.system === "emoklore").length,
  };

  document.querySelectorAll("[data-count-key]").forEach((el) => {
    const key = el.dataset.countKey;
    el.dataset.target = counts[key] ?? 0;
  });
}

function animateCounts() {
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function animateCount(el) {
    const target = Number(el.dataset.target || 0);
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.round(target * easeOutCubic(progress));
      el.textContent = value.toLocaleString("ja-JP");

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  document.querySelectorAll(".count-up").forEach((el, index) => {
    setTimeout(() => animateCount(el), index * 90);
  });
}

function renderGallery() {
  const grid = document.getElementById("characterGrid");
  const emptyState = document.getElementById("emptyState");
  const shownCount = document.getElementById("shownCount");
  if (!grid) return;

  const filtered = CHARACTERS.filter((character) => matchesFilters(character));

  grid.innerHTML = filtered.map((character, index) => renderIconCard(character, index)).join("");

  if (shownCount) {
    shownCount.textContent = `${filtered.length}件表示中`;
  }

  emptyState?.classList.toggle("hidden", filtered.length > 0);
}

function matchesFilters(character) {
  const { system, status, stat, skill, tag } = state.filters;

  if (system !== "all" && character.system !== system) return false;
  if (status !== "all" && character.status !== status) return false;

  if (tag && !character.tags.includes(tag)) return false;

  if (stat) {
    if (stat === "db") {
      if (!character.params.DB || character.params.DB === "0" || character.params.DB === "-") return false;
    } else if (stat === "luck") {
      const luck = Number(character.params["幸運"] ?? character.params.luck ?? 0);
      if (luck < 60) return false;
    } else {
      const value = Number(character.params[stat] ?? 0);
      const threshold = character.system === "coc7" ? 60 : 12;
      if (value < threshold) return false;
    }
  }

  if (skill) {
    if (skill === "combat") {
      if (!character.skills.some((s) => s.category === "戦闘" && Number(s.value) >= 1)) return false;
    } else if (skill === "social") {
      if (!character.skills.some((s) => s.category === "交渉" && Number(s.value) >= 1)) return false;
    } else {
      if (!character.skills.some((s) => s.name.includes(skill) && Number(s.value) >= 70)) return false;
    }
  }

  if (state.query) {
    const haystack = [
      character.name,
      character.reading,
      character.scenario,
      character.occupation,
      character.summary,
      ...character.tags,
      ...character.skills.map((s) => `${s.name} ${s.category} ${s.note}`),
    ].join(" ").toLowerCase();

    if (!haystack.includes(state.query)) return false;
  }

  return true;
}

function renderIconCard(character, index) {
  const statusClass = character.status === "lost" ? "lost" : character.status === "retire" ? "retire" : "";
  const previewSkills = character.skills.slice(0, 3);
  const href = `./character.html?id=${encodeURIComponent(character.id)}`;

  return `
    <a class="icon-card" href="${href}" style="animation-delay: ${Math.min(index * 35, 420)}ms">
      <div class="system-dot">${SYSTEM_DOTS[character.system] ?? "?"}</div>
      <div class="fav">${character.favorite ? "★" : "☆"}</div>
      <div class="icon-portrait">${character.icon}</div>
      <div class="icon-status ${statusClass}">${STATUS_LABELS[character.status] ?? character.status}</div>
      <div class="icon-name">${escapeHtml(character.name)}</div>
      <div class="hover-preview">
        <h4>${escapeHtml(character.name)}</h4>
        <div class="sub">${escapeHtml(character.editionLabel)} / ${escapeHtml(character.scenario)}</div>
        <p>${escapeHtml(character.summary)}</p>
        <div class="preview-stats">
          ${previewSkills.map((skill) => `
            <div class="preview-stat">
              <strong>${escapeHtml(String(skill.value))}</strong>
              <span>${escapeHtml(skill.name)}</span>
            </div>
          `).join("")}
        </div>
        <div class="tag-row">
          ${character.tags.slice(0, 3).map((tag) => `<span class="mini-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="open">個別ページを開く →</div>
      </div>
    </a>
  `;
}

function initDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || CHARACTERS[0]?.id;
  const character = CHARACTERS.find((item) => item.id === id) || CHARACTERS[0];

  if (!character) return;

  document.documentElement.style.setProperty("--theme-color", character.themeColor || "#e46f4f");
  document.title = `${character.name} | キャラクターライブラリ`;

  setText("detailName", character.name);
  setText("detailReading", character.reading);
  setText("detailEdition", character.editionLabel);
  setText("detailOccupation", character.occupation);
  setText("detailAge", character.age);
  setText("detailGender", character.gender);
  setText("detailHeight", character.height);
  setText("detailThemeLabel", character.themeLabel);
  setText("detailSummary", character.summary);
  setText("parameterLabel", `${character.editionLabel} / 能力値・副能力値`);

  const colorChip = document.getElementById("detailColorChip");
  if (colorChip) colorChip.style.backgroundColor = character.themeColor;

  const iacharaLink = document.getElementById("iacharaLink");
  if (iacharaLink) iacharaLink.href = character.iacharaUrl || "#";

  const tachie = document.getElementById("mockTachie");
  if (tachie) tachie.dataset.icon = character.icon;

  renderVariantTabs(character);
  renderDetailBadges(character);
  renderParameters(character);
  renderSkills(character);
  renderItems(character);
  renderMemo(character);
}

function renderVariantTabs(character) {
  const container = document.getElementById("variantTabs");
  if (!container) return;

  container.innerHTML = (character.variants || ["通常"]).map((variant, index) => `
    <button class="${index === 0 ? "active" : ""}" type="button">${escapeHtml(variant)}</button>
  `).join("");

  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    container.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
}

function renderDetailBadges(character) {
  const container = document.getElementById("detailBadges");
  if (!container) return;

  container.innerHTML = `
    <span class="small-pill active">${escapeHtml(character.editionLabel)}</span>
    <span class="small-pill">${escapeHtml(STATUS_LABELS[character.status] ?? character.status)}</span>
    <span class="small-pill">${character.hasHitoku ? "hitoku ari" : "hitoku nashi"}</span>
  `;
}

function renderParameters(character) {
  const container = document.getElementById("parameterGrid");
  if (!container) return;

  const subKeys = new Set(["HP", "MP", "SAN", "IDEA", "幸運", "知識", "DB", "Move", "共鳴"]);

  container.innerHTML = Object.entries(character.params || {}).map(([key, value]) => `
    <div class="param-card ${subKeys.has(key) ? "sub" : ""}">
      <span>${escapeHtml(key)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `).join("");
}

function renderSkills(character) {
  const container = document.getElementById("skillsTable");
  if (!container) return;

  container.innerHTML = (character.skills || []).map((skill) => `
    <div class="skill-row">
      <div class="skill-name">${escapeHtml(skill.name)}</div>
      <div class="skill-value">${escapeHtml(String(skill.value))}</div>
      <div class="skill-category">${escapeHtml(skill.category)}</div>
      <div class="skill-note">${escapeHtml(skill.note || "")}</div>
    </div>
  `).join("");
}

function renderItems(character) {
  const container = document.getElementById("itemList");
  if (!container) return;

  const items = character.items || [];
  if (!items.length) {
    container.innerHTML = `<div class="item-card"><div><h4>登録なし</h4><p>武器・所持品はまだ登録されていません。</p></div></div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="item-card">
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.description || "")}</p>
      </div>
      <div class="item-stat">
        ${(item.stats || [item.type]).map((stat) => `<span>${escapeHtml(stat)}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

function renderMemo(character) {
  const tabs = document.getElementById("memoTabs");
  const body = document.getElementById("memoBody");
  const hideSecretBtn = document.getElementById("hideSecretBtn");
  const publicModeBtn = document.getElementById("publicModeBtn");
  const publicModeStatus = document.getElementById("publicModeStatus");

  if (!tabs || !body) return;

  let hideSecret = false;
  const entries = Object.entries(character.memo || { "概要": "メモはまだ登録されていません。" });

  function visibleEntries() {
    return entries.filter(([label]) => {
      if (!hideSecret) return true;
      return label !== "秘匿" && label !== "KPメモ";
    });
  }

  function draw(activeLabel) {
    const visible = visibleEntries();
    const chosen = visible.find(([label]) => label === activeLabel) || visible[0];

    tabs.innerHTML = visible.map(([label]) => {
      const locked = label === "秘匿" || label === "KPメモ";
      const active = chosen && chosen[0] === label;
      return `<button class="memo-tab ${active ? "active" : ""} ${locked ? "locked" : ""}" type="button" data-memo-label="${escapeHtml(label)}">${locked ? "🔒 " : ""}${escapeHtml(label)}</button>`;
    }).join("");

    body.innerHTML = `
      <strong>${escapeHtml(chosen?.[0] || "メモ")}：</strong><br />
      ${escapeHtml(chosen?.[1] || "").replace(/\n/g, "<br />")}
      ${chosen && (chosen[0] === "秘匿" || chosen[0] === "KPメモ")
        ? `<div class="secret-warning">🔒 秘匿・ネタバレ情報を表示中です。公開用表示では非表示にできます。</div>`
        : ""}
    `;
  }

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-memo-label]");
    if (!button) return;
    draw(button.dataset.memoLabel);
  });

  hideSecretBtn?.addEventListener("click", () => {
    hideSecret = !hideSecret;
    hideSecretBtn.classList.toggle("active", hideSecret);
    hideSecretBtn.textContent = hideSecret ? "秘匿を表示" : "秘匿を隠す";
    if (publicModeStatus) publicModeStatus.textContent = hideSecret ? "公開用表示" : "通常表示";
    draw("概要");
  });

  publicModeBtn?.addEventListener("click", () => {
    hideSecret = true;
    hideSecretBtn?.classList.add("active");
    if (hideSecretBtn) hideSecretBtn.textContent = "秘匿を表示";
    if (publicModeStatus) publicModeStatus.textContent = "公開用表示";
    draw("概要");
  });

  draw("概要");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
