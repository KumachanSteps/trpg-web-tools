/* ============================================================
   シナリオ一覧：履歴 + カレンダー予定 + 所持データ

   Calendar transition (grouped by session title/run):
   - first date is after today -> planning
   - first date <= today <= last date -> current
   - all dates are before today -> not planning/current
   - past PL -> played / past GM roles -> gmAble
   ============================================================ */

const SCENARIO_CATEGORIES = {
  all:      { label: "すべて",      sub: "ALL" },
  planning: { label: "プレイ予定",  sub: "PLANNING TO PLAY" },
  current:  { label: "現行",        sub: "CURRENTLY PLAYING" },
  played:   { label: "プレイ済",    sub: "PLAYED" },
  gmAble:   { label: "GM可能",      sub: "AVAILABLE TO GM" },
  owned:    { label: "所持",        sub: "OWNED" }
};

const CATEGORY_ORDER = ["planning", "current", "played", "gmAble", "owned"];
const GM_ROLES = new Set(["GM", "KP", "DL", "SKP"]);

function scenarioEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scenarioIcon(name) {
  const icons = {
    eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.1A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.2 15.2 0 0 1-3 3.5M6.3 6.4C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.2-.5"/><path d="M9.9 9.9A3 3 0 0 0 14.1 14"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.9-10.9-4-4L4 16Z"/><path d="m13.8 6.2 4 4"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>`
  };
  return icons[name] || "";
}

function isScenarioEditorActive() {
  return document.body.classList.contains("is-editor-mode");
}

function canonicalScenario(value) {
  return typeof window.normalizeScenarioCountKey === "function"
    ? window.normalizeScenarioCountKey(value)
    : String(value || "").trim();
}

function normalizeScenarioTitle(value) {
  return canonicalScenario(value).normalize("NFKC").trim().toLocaleLowerCase("ja");
}

function stripCalendarSessionMarkers(value) {
  const marker = "(?:☀️?|🌃|🌙|☾|🌞|🌜|⭐️?|★️?)";
  const leading = new RegExp(`^(?:\\s*[【[(（]?\\s*${marker}\\s*[】\\])）]?\\s*)+`, "u");
  const trailing = new RegExp(`(?:\\s*[【[(（]?\\s*${marker}\\s*[】\\])）]?\\s*)+$`, "u");
  return String(value || "")
    .replace(leading, "")
    .replace(trailing, "")
    .replace(/[\t　 ]{2,}/g, " ")
    .trim();
}

function stripCalendarDayDetails(value) {
  let text = String(value || "").trim();
  let previous = "";
  while (text && text !== previous) {
    previous = text;
    text = text
      .replace(/\s*(?:yobibi|予備日)\s*$/iu, "")
      .replace(/\s*[（(【\[]\s*(?:終日|終日卓|昼|昼卓|夜|夜卓)\s*[）)】\]]\s*$/u, "")
      .replace(/\s*\d+\s*日目(?:\s*[-–—〜~]\s*\d+\s*日目)?\s*$/u, "")
      .trim();
  }
  return text;
}

function stripCalendarRunSuffix(value) {
  return stripCalendarDayDetails(value)
    .replace(/\s*第\s*\d+\s*(?:陣|回)\s*$/u, "")
    .trim();
}

function fallbackScenarioId(title) {
  const normalized = normalizeScenarioTitle(title);
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index++) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `scenario_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeOverrideEntry(entry) {
  if (typeof entry === "string") return { title: canonicalScenario(entry), systems: [], note: "" };
  if (!entry || typeof entry !== "object") return null;
  return {
    id: String(entry.id || ""),
    title: canonicalScenario(entry.title),
    systems: Array.isArray(entry.systems)
      ? entry.systems.filter(Boolean).map(String)
      : (entry.system ? [String(entry.system)] : []),
    note: String(entry.note || "").trim()
  };
}

function localDateValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  return match ? Number(`${match[1]}${match[2]}${match[3]}`) : NaN;
}

function todayValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return Number(`${value.year}${value.month}${value.day}`);
}

function isCancelledEvent(event) {
  return /中止|キャンセル|cancel/i.test(String(event.status || ""));
}

function sessionPlayerCount(row) {
  const raw = Array.isArray(row?.players) ? row.players : String(row?.players || "").split(/[、,，\n]+/u);
  const players = raw.map(value => String(value).trim()).filter(value => value && value !== "-" && value !== "なし");
  return players.length;
}

function eventAlreadyInSessionLog(event, canonicalTitle) {
  if (typeof SESSION_LOG === "undefined") return false;
  const role = String(event.role || "").toUpperCase();
  return SESSION_LOG.some(row => {
    if (normalizeScenarioTitle(row.scenarioCountKey || row.scenario) !== normalizeScenarioTitle(canonicalTitle)) return false;
    if (!(row.dates || []).includes(event.date)) return false;
    const rowRole = String(row.role || "").toUpperCase();
    if (role === "PL") return rowRole === "PL";
    if (GM_ROLES.has(role)) return GM_ROLES.has(rowRole);
    return role === rowRole;
  });
}

function updateDateRange(item, date) {
  if (!date) return;
  if (!item.firstDate || date < item.firstDate) item.firstDate = date;
  if (!item.lastDate || date > item.lastDate) item.lastDate = date;
}

function buildScenarioArchive() {
  const source = typeof SCENARIO_DATA === "undefined" ? [] : SCENARIO_DATA;
  const archive = source.map(item => ({
    ...item,
    title: canonicalScenario(item.scenarioCountKey || item.title),
    scenarioCountKey: canonicalScenario(item.scenarioCountKey || item.title),
    categories: [...new Set(item.categories || [])],
    systems: [...new Set(item.systems || [])],
    roles: [...new Set(item.roles || [])],
    playerCounts: [...new Set(item.playerCounts || [])],
    note: item.note || "",
    _overrideKey: String(item.id || fallbackScenarioId(item.scenarioCountKey || item.title)),
    isHidden: false,
    isDeleted: false
  }));
  const byTitle = new Map(archive.map(item => [normalizeScenarioTitle(item.title), item]));
  const byId = new Map(archive.map(item => [item.id, item]));

  function registerKnownTitles(item) {
    [item.title, item.scenarioCountKey, ...(item.scenarioNames || [])].filter(Boolean).forEach(title => {
      const cleaned = stripCalendarSessionMarkers(title);
      byTitle.set(normalizeScenarioTitle(cleaned), item);
    });
  }
  archive.forEach(registerKnownTitles);

  function getOrCreate(entry) {
    const title = canonicalScenario(entry.title);
    const key = normalizeScenarioTitle(title);
    let item = (entry.id && byId.get(entry.id)) || byTitle.get(key);
    if (!item) {
      item = {
        id: entry.id || fallbackScenarioId(title),
        title,
        scenarioCountKey: title,
        systems: [], categories: [], roles: [], playerCounts: [],
        playCount: 0, gmCount: 0, sessionCount: 0, dateCount: 0,
        firstDate: "", lastDate: "", scenarioNames: [title], note: "",
        _overrideKey: entry.id || fallbackScenarioId(title),
        isHidden: false, isDeleted: false
      };
      archive.push(item);
      byTitle.set(key, item);
      byId.set(item.id, item);
      registerKnownTitles(item);
    }
    return item;
  }

  function findKnownCalendarScenario(title) {
    const key = normalizeScenarioTitle(title);
    const exact = byTitle.get(key);
    if (exact || key.length < 3) return exact || null;

    const prefixMatches = new Set();
    byTitle.forEach((item, knownKey) => {
      if (knownKey.startsWith(key) || key.startsWith(knownKey)) prefixMatches.add(item);
    });
    return prefixMatches.size === 1 ? [...prefixMatches][0] : null;
  }

  function resolveCalendarScenario(event) {
    const rawTitle = stripCalendarSessionMarkers(event.scenarioTitle || event.title);
    const runTitle = stripCalendarDayDetails(rawTitle);
    const baseTitle = stripCalendarRunSuffix(runTitle);
    const known = (event.scenarioId && byId.get(String(event.scenarioId)))
      || findKnownCalendarScenario(rawTitle)
      || findKnownCalendarScenario(runTitle)
      || findKnownCalendarScenario(baseTitle);
    return {
      item: known || null,
      rawTitle,
      runTitle: runTitle || rawTitle,
      baseTitle: canonicalScenario(baseTitle || runTitle || rawTitle),
      scenarioId: String(event.scenarioId || "")
    };
  }

  const overrides = typeof SCENARIO_CATEGORY_OVERRIDES === "undefined" ? {} : SCENARIO_CATEGORY_OVERRIDES;
  ["planning", "current", "owned"].forEach(category => {
    (overrides[category] || []).forEach(raw => {
      const entry = normalizeOverrideEntry(raw);
      if (!entry?.title) return;
      const item = getOrCreate(entry);
      item.categories = [...new Set([...item.categories, category])];
      item.systems = [...new Set([...item.systems, ...entry.systems])];
      if (entry.note) item.note = entry.note;
    });
  });

  const events = typeof window.getStarMapEvents === "function" ? window.getStarMapEvents() : [];
  const calendarRuns = new Map();
  events.filter(event => event?.date && event?.title && !isCancelledEvent(event)).forEach(event => {
    const resolved = resolveCalendarScenario(event);
    const role = String(event.role || "").toUpperCase();
    const runKey = [
      normalizeScenarioTitle(resolved.runTitle),
      role,
      String(event.googleCalendarId || event.calendarId || "")
    ].join("|");

    if (!calendarRuns.has(runKey)) calendarRuns.set(runKey, { ...resolved, events: [] });
    calendarRuns.get(runKey).events.push(event);
  });

  const nowValue = todayValue();
  calendarRuns.forEach(run => {
    const validEvents = run.events
      .filter(event => Number.isFinite(localDateValue(event.date)))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!validEvents.length) return;

    const firstValue = localDateValue(validEvents[0].date);
    const lastValue = localDateValue(validEvents[validEvents.length - 1].date);
    const isCurrent = firstValue <= nowValue && lastValue >= nowValue;
    const isPlanning = firstValue > nowValue;

    // A fully past calendar label that does not match the registered archive
    // must not create a standalone scenario card.
    if (!run.item && !isCurrent && !isPlanning) return;

    const item = run.item || getOrCreate({
      id: run.scenarioId,
      title: run.baseTitle
    });

    validEvents.forEach(event => {
      const role = String(event.role || "").toUpperCase();
      item.systems = [...new Set([...item.systems, ...([event.system].filter(Boolean))])];
      item.roles = [...new Set([...item.roles, ...([role].filter(Boolean))])];
      if (event.note && !item.note) item.note = event.note;
    });

    if (isCurrent) {
      item.categories = [...new Set([...item.categories, "current"])];
    } else if (isPlanning) {
      item.categories = [...new Set([...item.categories, "planning"])];
    }

    if (lastValue >= nowValue) return;

    validEvents.forEach(event => {
      const role = String(event.role || "").toUpperCase();
      if (role === "PL") item.categories = [...new Set([...item.categories, "played"])];
      if (GM_ROLES.has(role)) item.categories = [...new Set([...item.categories, "gmAble"])];

      if (!eventAlreadyInSessionLog(event, item.title)) {
        item.sessionCount += 1;
        item.dateCount += 1;
        if (role === "PL") item.playCount += 1;
        if (GM_ROLES.has(role)) item.gmCount += 1;
        updateDateRange(item, event.date);
      }
    });
  });

  const ownedRows = typeof window.getOwnedScenarios === "function" ? window.getOwnedScenarios() : [];
  ownedRows.forEach(raw => {
    const entry = normalizeOverrideEntry(raw);
    if (!entry?.title) return;
    const item = getOrCreate(entry);
    item.categories = [...new Set([...item.categories, "owned"])];
    item.systems = [...new Set([...item.systems, ...entry.systems])];
    if (entry.note) item.note = entry.note;
  });

  // 卓ログの実参加者数を、リスト表示の「PL数」として利用する。
  if (typeof SESSION_LOG !== "undefined") {
    SESSION_LOG.forEach(row => {
      const title = canonicalScenario(row.scenarioCountKey || row.scenario || "");
      if (!title) return;
      const item = byTitle.get(normalizeScenarioTitle(title));
      const playerCount = sessionPlayerCount(row);
      if (!item || !playerCount) return;
      item.playerCounts = [...new Set([...(item.playerCounts || []), playerCount])].sort((a, b) => a - b);
    });
  }

  const scenarioOverrides = typeof window.getScenarioOverrides === "function" ? window.getScenarioOverrides() : [];
  scenarioOverrides.forEach(raw => {
    if (!raw || typeof raw !== "object") return;
    const key = String(raw.key || raw.scenarioId || "");
    const normalizedTitle = normalizeScenarioTitle(raw.sourceTitle || raw.title || "");
    const item = archive.find(candidate =>
      String(candidate._overrideKey || candidate.id) === key ||
      String(candidate.id) === key ||
      (normalizedTitle && normalizeScenarioTitle(candidate.title) === normalizedTitle)
    );
    if (!item) return;
    item._overrideKey = key || item._overrideKey || item.id;
    if (typeof raw.title === "string" && raw.title.trim()) {
      item.title = canonicalScenario(raw.title);
      item.scenarioCountKey = item.title;
    }
    if (typeof raw.scenarioId === "string" && raw.scenarioId.trim()) item.id = raw.scenarioId.trim();
    if (Array.isArray(raw.systems)) item.systems = [...new Set(raw.systems.map(String).map(v => v.trim()).filter(Boolean))];
    if (Object.prototype.hasOwnProperty.call(raw, "note")) item.note = String(raw.note || "").trim();
    item.isHidden = Boolean(raw.hidden);
    item.isDeleted = Boolean(raw.deleted);
  });

  return archive;
}

function formatScenarioDate(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
}

function scenarioCard(item) {
  const categoryBadges = CATEGORY_ORDER
    .filter(category => item.categories.includes(category))
    .map(category => {
      const meta = SCENARIO_CATEGORIES[category];
      return `<span class="scenario-category-badge category-${category}">${scenarioEscape(meta.label)}</span>`;
    }).join("");

  const systemTags = (item.systems || []).length
    ? item.systems.map(system => `<span class="tag">${scenarioEscape(system)}</span>`).join("")
    : `<span class="tag is-muted">SYSTEM未設定</span>`;

  const history = [];
  if (item.playCount) history.push(`<span><b>PL</b> ${item.playCount}回</span>`);
  if (item.gmCount) history.push(`<span><b>GM</b> ${item.gmCount}回</span>`);
  if (item.dateCount) history.push(`<span><b>卓日</b> ${item.dateCount}日</span>`);

  const dateRange = item.firstDate && item.lastDate
    ? (item.firstDate === item.lastDate
      ? formatScenarioDate(item.lastDate)
      : `${formatScenarioDate(item.firstDate)} — ${formatScenarioDate(item.lastDate)}`)
    : "";

  const visibilityLabel = item.isHidden ? "公開表示に戻す" : "公開ページで非表示にする";
  const hiddenBadge = item.isHidden ? `<span class="scenario-hidden-badge">非公開</span>` : "";

  return `
    <article class="panel scenario-card${item.isHidden ? " is-scenario-hidden" : ""}" data-scenario-id="${scenarioEscape(item.id)}" data-override-key="${scenarioEscape(item._overrideKey || item.id)}">
      <div class="scenario-card-editor-actions" aria-label="シナリオ編集操作">
        <button type="button" class="scenario-card-action visibility-action${item.isHidden ? " is-off" : ""}" data-toggle-scenario-visibility title="${visibilityLabel}" aria-label="${visibilityLabel}">
          ${scenarioIcon(item.isHidden ? "eyeOff" : "eye")}
        </button>
        <button type="button" class="scenario-card-action" data-edit-scenario-card title="編集" aria-label="シナリオを編集">${scenarioIcon("edit")}</button>
        <button type="button" class="scenario-card-action is-delete" data-delete-scenario-card title="削除" aria-label="シナリオを削除">${scenarioIcon("trash")}</button>
      </div>
      <div class="scenario-card-head">
        <div class="scenario-category-badges">${hiddenBadge}${categoryBadges}</div>
        ${dateRange ? `<time class="scenario-last-date">${scenarioEscape(dateRange)}</time>` : ""}
      </div>
      <h2>${scenarioEscape(item.title)}</h2>
      <small class="scenario-card-id">${scenarioEscape(item.id)}</small>
      <div class="scenario-system-tags">${systemTags}</div>
      ${history.length ? `<div class="scenario-history">${history.join("")}</div>` : ""}
      ${item.note ? `<p class="scenario-note">${scenarioEscape(item.note)}</p>` : ""}
    </article>`;
}

function scenarioListView(items) {
  const groups = new Map();

  items.forEach(item => {
    const systems = (item.systems || []).length ? item.systems : ["SYSTEM未設定"];
    const playerCounts = (item.playerCounts || []).length ? item.playerCounts : [null];
    systems.forEach(system => {
      playerCounts.forEach(playerCount => {
        const key = `${system}\u0000${playerCount ?? "unknown"}`;
        if (!groups.has(key)) groups.set(key, { system, playerCount, items: [] });
        groups.get(key).items.push(item);
      });
    });
  });

  return [...groups.values()]
    .sort((a, b) => {
      const systemOrder = a.system.localeCompare(b.system, "ja", { numeric: true });
      if (systemOrder) return systemOrder;
      if (a.playerCount === null) return 1;
      if (b.playerCount === null) return -1;
      return a.playerCount - b.playerCount;
    })
    .map(group => {
      const rows = group.items
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title, "ja", { numeric: true }))
        .map(item => `
          <li${item.isHidden ? ' class="is-scenario-hidden"' : ""}>
            <span>${scenarioEscape(item.title)}</span>
            ${item.isHidden ? '<small>非公開</small>' : ""}
          </li>`).join("");
      const playerLabel = group.playerCount === null ? "PL数未設定" : `PL ${group.playerCount}人`;
      return `
        <section class="scenario-list-group">
          <header>
            <div><strong>${scenarioEscape(group.system)}</strong><span>${scenarioEscape(playerLabel)}</span></div>
            <small>${group.items.length} SCENARIOS</small>
          </header>
          <ul>${rows}</ul>
        </section>`;
    }).join("");
}

function initOwnedScenarioManager(refreshArchive) {
  const form = document.getElementById("owned-scenario-form");
  const list = document.getElementById("owned-scenario-manager-list");
  const status = document.getElementById("owned-scenario-status");
  if (!form || !list) return;

  let rows = typeof window.getOwnedScenarios === "function" ? window.getOwnedScenarios() : [];
  const idField = form.elements.namedItem("ownedId");
  const titleField = form.elements.namedItem("title");
  const scenarioIdField = form.elements.namedItem("scenarioId");
  const submit = document.getElementById("owned-submit-button");
  const cancel = document.getElementById("cancel-owned-edit");

  function setStatus(message) { if (status) status.textContent = message; }
  function resolveId(title) {
    const archive = buildScenarioArchive();
    const existing = archive.find(item => normalizeScenarioTitle(item.title) === normalizeScenarioTitle(title));
    return existing?.id || fallbackScenarioId(title);
  }
  function syncId() {
    if (!scenarioIdField.dataset.manual) scenarioIdField.value = resolveId(titleField.value);
  }
  function resetForm(message = "") {
    form.reset();
    idField.value = "";
    scenarioIdField.value = "";
    scenarioIdField.dataset.manual = "";
    submit.textContent = "所持シナリオを保存";
    cancel.hidden = true;
    setStatus(message);
  }
  function save() {
    window.updateOwnedScenarios?.(rows);
    refreshArchive();
    renderList();
  }
  function renderList() {
    rows = typeof window.getOwnedScenarios === "function" ? window.getOwnedScenarios() : rows;
    if (!rows.length) {
      list.innerHTML = '<p class="manager-empty">手動登録した所持シナリオはありません。</p>';
      return;
    }
    list.innerHTML = rows.slice().sort((a,b) => String(a.title).localeCompare(String(b.title), "ja")).map(item => `
      <div class="manager-event-row">
        <div><strong>${scenarioEscape(item.system || "SYSTEM未設定")}</strong><span>${scenarioEscape(item.title)}</span><small>${scenarioEscape(item.id)}</small></div>
        <span class="manager-row-actions">
          <button type="button" data-edit-owned="${scenarioEscape(item.id)}">編集</button>
          <button type="button" data-delete-owned="${scenarioEscape(item.id)}" class="is-delete">削除</button>
        </span>
      </div>`).join("");
  }

  titleField.addEventListener("input", syncId);
  scenarioIdField.addEventListener("input", () => { scenarioIdField.dataset.manual = "true"; });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const title = canonicalScenario(data.get("title"));
    const id = String(data.get("scenarioId") || "").trim() || resolveId(title);
    const previousId = String(data.get("ownedId") || "");
    const item = {
      id,
      title,
      systems: [String(data.get("system") || "").trim()].filter(Boolean),
      note: String(data.get("note") || "").trim()
    };
    const index = rows.findIndex(row => row.id === previousId || normalizeScenarioTitle(row.title) === normalizeScenarioTitle(title));
    if (index >= 0) rows[index] = item;
    else rows.push(item);
    save();
    resetForm(index >= 0 ? "所持シナリオを更新しました。" : "所持シナリオを追加しました。");
  });

  list.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-owned]");
    if (edit) {
      const item = rows.find(row => row.id === edit.dataset.editOwned);
      if (!item) return;
      idField.value = item.id;
      titleField.value = item.title;
      scenarioIdField.value = item.id;
      scenarioIdField.dataset.manual = "";
      form.elements.namedItem("system").value = item.systems?.[0] || "";
      form.elements.namedItem("note").value = item.note || "";
      submit.textContent = "変更を保存";
      cancel.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const remove = event.target.closest("[data-delete-owned]");
    if (!remove) return;
    const item = rows.find(row => row.id === remove.dataset.deleteOwned);
    if (!item || !confirm(`「${item.title}」を所持から削除しますか？`)) return;
    rows = rows.filter(row => row.id !== item.id);
    save();
    resetForm("所持分類を削除しました。シナリオ履歴自体は残ります。");
  });

  cancel.addEventListener("click", () => resetForm("編集をキャンセルしました。"));
  renderList();
}

function initScenarioCardEditor(getArchive, refreshArchive) {
  const root = document.getElementById("scenario-archive");
  const dialog = document.getElementById("scenario-edit-dialog");
  const form = document.getElementById("scenario-card-edit-form");
  if (!root || !dialog || !form) return;

  function getOverrides() {
    return typeof window.getScenarioOverrides === "function" ? window.getScenarioOverrides() : [];
  }

  function updateOverride(key, patch, item) {
    const rows = getOverrides();
    const index = rows.findIndex(row => String(row.key || row.scenarioId || "") === String(key));
    const existing = index >= 0 ? rows[index] : {};
    const next = {
      ...existing,
      key: String(key),
      sourceTitle: existing.sourceTitle || item?.scenarioCountKey || item?.title || "",
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) rows[index] = next;
    else rows.push(next);
    window.updateScenarioOverrides?.(rows);
  }

  function findItem(card) {
    const key = card?.dataset.overrideKey;
    return getArchive().find(item => String(item._overrideKey || item.id) === String(key));
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  root.addEventListener("click", event => {
    if (!isScenarioEditorActive()) return;
    const card = event.target.closest(".scenario-card");
    if (!card) return;
    const item = findItem(card);
    if (!item) return;
    const key = item._overrideKey || item.id;

    if (event.target.closest("[data-toggle-scenario-visibility]")) {
      updateOverride(key, { hidden: !item.isHidden, deleted: false }, item);
      return;
    }

    if (event.target.closest("[data-edit-scenario-card]")) {
      form.elements.namedItem("overrideKey").value = key;
      form.elements.namedItem("title").value = item.title || "";
      form.elements.namedItem("scenarioId").value = item.id || "";
      form.elements.namedItem("systems").value = (item.systems || []).join(", ");
      form.elements.namedItem("note").value = item.note || "";
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      return;
    }

    if (event.target.closest("[data-delete-scenario-card]")) {
      const message = `「${item.title}」をシナリオ一覧から削除しますか？\n\n卓ログやカレンダーの元データは削除せず、一覧から除外する設定を保存します。`;
      if (!window.confirm(message)) return;
      updateOverride(key, { deleted: true, hidden: true }, item);
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const key = String(data.get("overrideKey") || "");
    const item = getArchive().find(candidate => String(candidate._overrideKey || candidate.id) === key);
    const systems = String(data.get("systems") || "")
      .split(/[,、]/).map(value => value.trim()).filter(Boolean);
    updateOverride(key, {
      title: canonicalScenario(data.get("title")),
      scenarioId: String(data.get("scenarioId") || "").trim(),
      systems,
      note: String(data.get("note") || "").trim(),
      deleted: false
    }, item);
    closeDialog();
  });

  dialog.querySelectorAll("[data-close-scenario-dialog]").forEach(button => {
    button.addEventListener("click", closeDialog);
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });
}

function initScenarioArchive() {
  const root = document.getElementById("scenario-archive");
  const filterWrap = document.getElementById("scenario-filters");
  const search = document.getElementById("scenario-search");
  const viewSwitch = document.getElementById("scenario-view-switch");
  const resultCount = document.getElementById("scenario-result-count");
  const empty = document.getElementById("scenario-empty");
  if (!root || !filterWrap) return;

  let archive = [];
  let activeCategory = "all";
  let query = "";
  let viewMode = "card";
  try {
    if (localStorage.getItem("kuma-scenario-view") === "list") viewMode = "list";
  } catch (_) {}

  function visibleArchive() {
    const editorActive = isScenarioEditorActive();
    return archive.filter(item => !item.isDeleted && (editorActive || !item.isHidden));
  }

  function countFor(category) {
    const rows = visibleArchive();
    if (category === "all") return rows.length;
    return rows.filter(item => item.categories.includes(category)).length;
  }

  function renderFilters() {
    filterWrap.innerHTML = Object.entries(SCENARIO_CATEGORIES).map(([key, meta]) => `
      <button type="button" class="filter-pill scenario-filter${key === activeCategory ? " is-active" : ""}" data-category="${key}">
        <span>${scenarioEscape(meta.label)}</span>
        <small>${scenarioEscape(meta.sub)}</small>
        <b>${countFor(key)}</b>
      </button>`).join("");
  }

  function render() {
    archive = buildScenarioArchive();
    renderFilters();
    const normalizedQuery = normalizeScenarioTitle(query);
    const available = visibleArchive();
    const filtered = available.filter(item => {
      const matchesCategory = activeCategory === "all" || item.categories.includes(activeCategory);
      const haystack = normalizeScenarioTitle([
        item.title, item.id, ...(item.systems || []), ...(item.roles || []), item.note || ""
      ].join(" "));
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    }).sort((a, b) => {
      if (a.lastDate !== b.lastDate) return String(b.lastDate).localeCompare(String(a.lastDate));
      return a.title.localeCompare(b.title, "ja");
    });

    root.className = viewMode === "list" ? "scenario-list-view" : "scenario-grid";
    root.innerHTML = viewMode === "list" ? scenarioListView(filtered) : filtered.map(scenarioCard).join("");
    viewSwitch?.querySelectorAll("[data-scenario-view]").forEach(button => {
      const active = button.dataset.scenarioView === viewMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (resultCount) resultCount.textContent = `${filtered.length} / ${available.length} SCENARIOS`;
    if (empty) empty.hidden = filtered.length > 0;
  }

  filterWrap.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category || "all";
    render();
  });

  search?.addEventListener("input", () => {
    query = search.value;
    render();
  });

  viewSwitch?.addEventListener("click", event => {
    const button = event.target.closest("[data-scenario-view]");
    if (!button || button.dataset.scenarioView === viewMode) return;
    viewMode = button.dataset.scenarioView === "list" ? "list" : "card";
    try { localStorage.setItem("kuma-scenario-view", viewMode); } catch (_) {}
    render();
  });

  window.addEventListener("star-map-data-changed", render);
  window.addEventListener("star-map-editor-mode", render);
  window.refreshScenarioArchive = render;
  initOwnedScenarioManager(render);
  initScenarioCardEditor(() => archive, render);
  render();
}

document.addEventListener("DOMContentLoaded", initScenarioArchive);
