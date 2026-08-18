/* ============================================================
   共通スクリプト：ナビ開閉 ＋ カレンダー描画 ＋ 年月ピッカー
   これからの予定を追加・編集したいときは、このファイル内の
   「EVENTS（編集はここだけでOK）」の配列を書き換えてください。
   これまでの記録（プレイ済みログ）は js/sessions-data.js の
   SESSION_LOG を参照しています（卓ログトラッカーからの書き出し）。
   ============================================================ */

/* ---------- 予定データ（編集はここだけでOK） ----------
   date  : "YYYY-MM-DD"
   title : セッション名・シナリオ名など
   system: 使用システム（CoC / DX3rd / SW2.5 など）
   role  : "PL" または "GM"
   status: "確定" "調整中" など、任意の表示文字列
------------------------------------------------------------ */
let EVENTS = typeof window.getStarMapEvents === "function" ? window.getStarMapEvents() : [];

function scenarioIdFromTitle(value) {
  const canonical = typeof window.normalizeScenarioCountKey === "function"
    ? window.normalizeScenarioCountKey(value)
    : String(value || "").trim();
  const normalized = canonical.normalize("NFKC").toLocaleLowerCase("ja");
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index++) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `scenario_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function resolveScenarioId(title) {
  const normalized = String(typeof window.normalizeScenarioCountKey === "function"
    ? window.normalizeScenarioCountKey(title)
    : title || "").normalize("NFKC").toLocaleLowerCase("ja").trim();
  const known = typeof SCENARIO_DATA !== "undefined"
    ? SCENARIO_DATA.find(item => String(item.scenarioCountKey || item.title || "").normalize("NFKC").toLocaleLowerCase("ja").trim() === normalized)
    : null;
  return known?.id || scenarioIdFromTitle(title);
}

const MONTH_NAMES = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_NAMES_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const SESSION_TYPES = {
  day: { icon: "☀", label: "昼卓", className: "session-day" },
  night: { icon: "☾", label: "夜卓", className: "session-night" },
  allDay: { icon: "★", label: "終日卓", className: "session-all-day" }
};

function normalizeSessionType(value) {
  return Object.prototype.hasOwnProperty.call(SESSION_TYPES, value) ? value : "day";
}

function sessionIndicator(event) {
  const type = normalizeSessionType(event.sessionType);
  const meta = SESSION_TYPES[type];
  return `<span class="cal-session-symbol ${meta.className}" title="${meta.label}" aria-label="${meta.label}">${meta.icon}</span>`;
}

function formatEventTime(event) {
  if (normalizeSessionType(event.sessionType) === "allDay") return "終日";
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime}`;
  return event.startTime || "";
}

function canonicalScenarioTitle(row) {
  const raw = row?.scenarioCountKey || row?.scenarioTitle || row?.scenario || row?.title || "";
  return typeof window.normalizeScenarioCountKey === "function"
    ? window.normalizeScenarioCountKey(raw)
    : String(raw).trim();
}

function escapePageHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function isGmRole(role) {
  return ["GM", "KP", "DL"].includes(String(role || "").toUpperCase());
}

/* ---------- 過去の記録（SESSION_LOG）を日付ごとに整理 ----------
   sessions-data.js が読み込まれていないページでも壊れないようガード
------------------------------------------------------------ */
const RECORD_BY_DATE = (() => {
  const map = new Map();
  if (typeof SESSION_LOG === "undefined") return map;
  SESSION_LOG.forEach(row => {
    (row.dates || []).forEach(d => {
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(row);
    });
  });
  return map;
})();

/* カレンダーの現在の表示状態（前月/翌月ボタン・ピッカーで共有） */
const calState = { year: null, month: null };

/* ---------- カレンダー描画 ---------- */
function renderCalendar(year, month /* 0-indexed */) {
  const grid = document.getElementById("cal-grid");
  const label = document.getElementById("cal-label");
  if (!grid || !label) return;

  calState.year = year;
  calState.month = month;

  label.innerHTML = `${year}年 ${month + 1}月<small>${MONTH_NAMES[month]} ${year}</small>`;

  const dowRow = ["日","月","火","水","木","金","土"];
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = new Date().toISOString().slice(0, 10);

  let html = "";
  dowRow.forEach(d => { html += `<div class="cal-dow">${d}</div>`; });

  for (let i = 0; i < startDow; i++) {
    html += `<div class="cal-cell is-blank"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const classes = ["cal-cell"];
    const records = RECORD_BY_DATE.get(dateStr);
    let title = "";

    if (records && records.length) {
      classes.push("has-record");
      title = records.map(canonicalScenarioTitle).join(" / ");
    }
    const plans = EVENTS.filter(e => e.date === dateStr);
    if (plans.length) {
      classes.push("has-event");
      const planTitles = plans.map(e => e.title).join(" / ");
      title = title ? `${title} / ${planTitles}` : planTitles;
    }
    if (dateStr === todayStr) classes.push("is-today");

    const titleAttr = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
    if (title) classes.push("is-clickable");
    const symbols = plans.slice(0, 4).map(sessionIndicator).join("");
    const extra = plans.length > 4 ? `<span class="cal-session-extra">+${plans.length - 4}</span>` : "";
    html += `<button type="button" class="${classes.join(" ")}" data-date="${dateStr}"${titleAttr}><span class="cal-day-number">${d}</span><span class="cal-session-symbols">${symbols}${extra}</span></button>`;
  }

  grid.innerHTML = html;
}


/* ---------- カレンダー日付詳細POP ---------- */
function initCalendarPopup() {
  const grid = document.getElementById("cal-grid");
  if (!grid) return;

  const popup = document.createElement("div");
  popup.className = "calendar-popover";
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-hidden", "true");
  popup.setAttribute("aria-live", "polite");
  document.body.appendChild(popup);

  let trackingEnabled = false;
  let activeDate = "";

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  function closePopup() {
    trackingEnabled = false;
    activeDate = "";
    popup.classList.remove("is-open", "is-multi", "is-dense");
    popup.setAttribute("aria-hidden", "true");
  }

  function detailRows(row) {
    const details = [
      ["SYSTEM", row.system], ["ROLE", row.role], ["GM/KP", row.gm],
      ["PC", row.pc], ["PLAYERS", row.players], ["TIME", row.time ? `${row.time}h` : ""],
      ["STATUS", row.status]
    ].filter(([, value]) => value && value !== "-");
    return details.map(([label, value]) =>
      `<div class="calendar-popover-row"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`
    ).join("");
  }

  function positionPopup(anchor, clientX, clientY) {
    const margin = 12;
    const anchorRect = anchor.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const pointerPosition = Number.isFinite(clientX) && Number.isFinite(clientY);

    let left = pointerPosition ? clientX + margin : anchorRect.right + margin;
    let top = pointerPosition ? clientY + margin : anchorRect.top;

    if (left + popupRect.width > window.innerWidth - margin) {
      left = anchorRect.left - popupRect.width - margin;
    }
    if (left < margin) {
      left = Math.max(margin, (window.innerWidth - popupRect.width) / 2);
    }
    if (top + popupRect.height > window.innerHeight - margin) {
      top = window.innerHeight - popupRect.height - margin;
    }

    popup.style.left = `${Math.max(margin, left)}px`;
    popup.style.top = `${Math.max(margin, top)}px`;
  }

  function renderDateDetails(cell, date, clientX, clientY, enableTracking = false) {
    const records = RECORD_BY_DATE.get(date) || [];
    const plans = EVENTS.filter(item => item.date === date);
    const itemCount = records.length + plans.length;
    if (!itemCount) return;

    const recordHtml = records.map(row => `
      <article class="calendar-popover-item is-record">
        <p class="calendar-popover-type">SESSION LOG</p>
        <h4>${escapeHtml(canonicalScenarioTitle(row))}</h4>
        ${detailRows(row)}
      </article>`).join("");

    const planHtml = plans.map(row => {
      const type = SESSION_TYPES[normalizeSessionType(row.sessionType)];
      const time = formatEventTime(row);
      return `
      <article class="calendar-popover-item is-plan">
        <p class="calendar-popover-type"><span class="popover-session-icon ${type.className}">${type.icon}</span> ${escapeHtml(type.label)}</p>
        <h4>${escapeHtml(row.title)}</h4>
        ${time ? `<div class="calendar-popover-row"><span>TIME</span><strong>${escapeHtml(time)}</strong></div>` : ""}
        ${row.system ? `<div class="calendar-popover-row"><span>SYSTEM</span><strong>${escapeHtml(row.system)}</strong></div>` : ""}
        ${row.role ? `<div class="calendar-popover-row"><span>ROLE</span><strong>${escapeHtml(row.role)}</strong></div>` : ""}
        ${row.status ? `<div class="calendar-popover-row"><span>STATUS</span><strong>${escapeHtml(row.status)}</strong></div>` : ""}
      </article>`;
    }).join("");

    popup.classList.toggle("is-multi", itemCount > 1);
    popup.classList.toggle("is-dense", itemCount > 4);
    popup.innerHTML = `
      <div class="calendar-popover-head">
        <div><small>DATE</small><strong>${escapeHtml(date)}</strong></div>
        <div class="calendar-popover-summary">
          <span>${itemCount} SESSION${itemCount === 1 ? "" : "S"}</span>
          <button type="button" class="calendar-popover-close" aria-label="閉じる">×</button>
        </div>
      </div>
      <div class="calendar-popover-body">${planHtml}${recordHtml}</div>`;

    if (enableTracking) trackingEnabled = true;
    activeDate = date;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
    positionPopup(cell, clientX, clientY);
  }

  grid.addEventListener("click", event => {
    const cell = event.target.closest(".cal-cell[data-date]");
    if (!cell || !cell.classList.contains("is-clickable")) return;
    event.stopPropagation();
    renderDateDetails(cell, cell.dataset.date, event.clientX, event.clientY, true);
  });

  grid.addEventListener("pointerover", event => {
    if (!trackingEnabled || !popup.classList.contains("is-open")) return;
    const cell = event.target.closest(".cal-cell[data-date]");
    if (!cell || !cell.classList.contains("is-clickable")) return;
    if (cell.contains(event.relatedTarget) || cell.dataset.date === activeDate) return;
    renderDateDetails(cell, cell.dataset.date, undefined, undefined, false);
  });

  grid.addEventListener("focusin", event => {
    if (!trackingEnabled || !popup.classList.contains("is-open")) return;
    const cell = event.target.closest(".cal-cell[data-date]");
    if (!cell || !cell.classList.contains("is-clickable") || cell.dataset.date === activeDate) return;
    renderDateDetails(cell, cell.dataset.date, undefined, undefined, false);
  });

  popup.addEventListener("click", event => {
    event.stopPropagation();
    if (event.target.closest(".calendar-popover-close")) closePopup();
  });
  document.addEventListener("click", closePopup);
  window.addEventListener("resize", closePopup);
  window.addEventListener("scroll", closePopup, true);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closePopup(); });
}


/* ---------- これからの予定リスト描画 ---------- */
function renderUpcoming() {
  const list = document.getElementById("upcoming-list");
  if (!list) return;

  const today = new Date(); today.setHours(0,0,0,0);

  const limitAttr = list.dataset.limit;
  const limit = limitAttr === undefined ? 4 : parseInt(limitAttr, 10);

  let upcoming = EVENTS
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (limit > 0) upcoming = upcoming.slice(0, limit);

  if (upcoming.length === 0) {
    list.innerHTML = `<p style="color:var(--moon-silver); font-size:0.9rem;">現在、予定されているセッションはありません。</p>`;
    return;
  }

  list.innerHTML = upcoming.map(e => {
    const dt = new Date(e.date);
    const roleClass = e.role === "GM" ? "role-gm" : "role-pl";
    return `
      <div class="upcoming-card panel">
        <div class="upcoming-date">
          <span class="d">${dt.getDate()}</span>
          <span class="m">${MONTH_NAMES[dt.getMonth()]}</span>
          ${sessionIndicator(e)}
        </div>
        <div class="upcoming-info">
          <p class="title">${escapePageHtml(e.title)}</p>
          <div class="meta">
            <span class="tag ${roleClass}">${e.role}</span>
            <span>${escapePageHtml(e.system)}</span>
          </div>
        </div>
        <div class="upcoming-status">${escapePageHtml(e.status)}</div>
      </div>`;
  }).join("");
}


/* ---------- 管理者用：予定の手動登録／Google Calendar ICS取込 ---------- */
function saveEvents() {
  if (typeof window.updateStarMapEvents === "function") window.updateStarMapEvents(EVENTS);
}

function refreshEventViews() {
  renderCalendar(calState.year ?? new Date().getFullYear(), calState.month ?? new Date().getMonth());
  renderUpcoming();
  renderHomeStats();
  renderEventManagerList();
}

function normalizeIcsDate(value) {
  if (!value) return "";
  const compact = value.trim();
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function unescapeIcs(value = "") {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function parseIcsEvents(text) {
  const blocks = unfoldIcs(text).split("BEGIN:VEVENT").slice(1).map(part => part.split("END:VEVENT")[0]);
  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/);
    const fieldLine = name => lines.find(item => item.startsWith(name + ":") || item.startsWith(name + ";")) || "";
    const field = name => {
      const line = fieldLine(name);
      return line ? line.slice(line.indexOf(":") + 1) : "";
    };
    const summary = unescapeIcs(field("SUMMARY"));
    const description = unescapeIcs(field("DESCRIPTION"));
    const location = unescapeIcs(field("LOCATION"));
    const startLine = fieldLine("DTSTART");
    const startRaw = field("DTSTART");
    const endRaw = field("DTEND");
    const date = normalizeIcsDate(startRaw);
    if (!date || !summary) return null;
    const isAllDay = /VALUE=DATE/i.test(startLine) || /^\d{8}$/.test(startRaw.trim());
    const timeMatch = startRaw.match(/T(\d{2})(\d{2})/);
    const endMatch = endRaw.match(/T(\d{2})(\d{2})/);
    const startHour = timeMatch ? Number(timeMatch[1]) : null;
    const sessionType = isAllDay ? "allDay" : (startHour >= 18 || startHour < 6) ? "night" : "day";
    const startTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : "";
    const endTime = endMatch ? `${endMatch[1]}:${endMatch[2]}` : "";
    const combined = `${summary} ${description}`;
    const role = /\b(KP|GM|DL)\b|キーパー|ゲームマスター/i.test(combined) ? "GM" : /\bPL\b|プレイヤー/i.test(combined) ? "PL" : "";
    const system = /エモクロア/i.test(combined) ? "エモクロア" : /CoC|クトゥルフ/i.test(combined) ? "クトゥルフ神話TRPG" : "";
    return {
      id: `ics-${date}-${index}-${Date.now()}`, date, title: summary, system, role,
      status: "予定", note: [description, location].filter(Boolean).join(" / "),
      source: "Google Calendar", sessionType, startTime, endTime
    };
  }).filter(Boolean);
}

function renderEventManagerList() {
  const list = document.getElementById("event-manager-list");
  if (!list) return;
  const sorted = [...EVENTS].sort((a,b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    list.innerHTML = '<p class="manager-empty">登録済みの予定はありません。</p>';
    return;
  }
  list.innerHTML = sorted.map(item => `
    <div class="manager-event-row">
      <div>
        <strong>${escapePageHtml(item.date)} ${SESSION_TYPES[normalizeSessionType(item.sessionType)].icon}</strong>
        <span>${escapePageHtml(item.title)}${formatEventTime(item) ? ` · ${escapePageHtml(formatEventTime(item))}` : ""}</span>
        <small>${escapePageHtml(item.scenarioId || resolveScenarioId(item.title))} · ${escapePageHtml(item.role || "ROLE未設定")}</small>
      </div>
      <span class="manager-row-actions">
        ${item.googleHtmlLink ? `<a class="manager-source-link" href="${escapePageHtml(item.googleHtmlLink)}" target="_blank" rel="noopener">Google側を開く ↗</a>` : ""}
        <button type="button" data-edit-event="${escapePageHtml(item.id)}">編集</button>
        <button type="button" data-delete-event="${escapePageHtml(item.id)}" class="is-delete">削除</button>
      </span>
    </div>`).join("");
}


/* ---------- Google Calendar API：カレンダー選択 + Import Preview ---------- */
const CALENDAR_SELECTION_KEY = "kuma-star-map-selected-calendars-v1";
let GOOGLE_IMPORT_PREVIEW = [];

function simpleStableHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function isoDateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultCalendarRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return { start: isoDateOnly(start), end: isoDateOnly(end) };
}

function calendarTimeBoundary(value, endOfDay = false) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return date.toISOString();
}

function guessRole(text) {
  const source = String(text || "");
  if (/\bSKP\b/i.test(source)) return "SKP";
  if (/\bKP\b|キーパー/i.test(source)) return "KP";
  if (/\bGM\b|ゲームマスター/i.test(source)) return "GM";
  if (/\bDL\b|ディーラー|デッドループ/i.test(source)) return "DL";
  if (/\bPL\b|プレイヤー/i.test(source)) return "PL";
  return "";
}

function guessSystem(text) {
  const source = String(text || "");
  if (/エモクロア/i.test(source)) return "エモクロア";
  if (/CoC\s*7|クトゥルフ.*7版|新クトゥルフ/i.test(source)) return "CoC 7版";
  if (/CoC\s*6|クトゥルフ.*6版/i.test(source)) return "CoC 6版";
  if (/CoC|クトゥルフ/i.test(source)) return "クトゥルフ神話TRPG";
  if (/マーダーミステリー|マダミス/i.test(source)) return "マダミス";
  return "";
}

function googleEventToPreview(raw, calendar) {
  if (!raw || raw.status === "cancelled" || !raw.summary || !raw.start) return null;
  const allDay = Boolean(raw.start.date);
  const date = raw.start.date || String(raw.start.dateTime || "").slice(0, 10);
  if (!date) return null;
  const startTime = allDay ? "" : String(raw.start.dateTime || "").slice(11, 16);
  const endTime = allDay ? "" : String(raw.end?.dateTime || "").slice(11, 16);
  const startHour = startTime ? Number(startTime.slice(0, 2)) : null;
  const sessionType = allDay ? "allDay" : (startHour >= 18 || startHour < 6 ? "night" : "day");
  const combined = [raw.summary, raw.description, raw.location, calendar.summary].filter(Boolean).join(" ");
  const sourceKey = `${calendar.id}|${raw.id}|${raw.originalStartTime?.dateTime || raw.originalStartTime?.date || raw.start.dateTime || raw.start.date}`;
  const existing = EVENTS.find(item => item.googleSourceKey === sourceKey)
    || EVENTS.find(item => item.googleCalendarId === calendar.id && item.googleEventId === raw.id && item.date === date);
  const title = canonicalScenarioTitle({ title: raw.summary });
  return {
    selected: true,
    mode: existing ? "update" : "new",
    id: existing?.id || `gcal-${simpleStableHash(sourceKey)}`,
    scenarioId: existing?.scenarioId || resolveScenarioId(title),
    date,
    title,
    scenarioTitle: title,
    system: existing?.system || guessSystem(combined),
    role: existing?.role || guessRole(combined),
    sessionType,
    startTime,
    endTime,
    status: existing?.status || "確定",
    note: existing?.note || [raw.description, raw.location].filter(Boolean).join(" / "),
    source: "google-calendar",
    googleCalendarId: calendar.id,
    googleCalendarName: calendar.summary,
    googleEventId: raw.id,
    googleRecurringEventId: raw.recurringEventId || "",
    googleOriginalStartTime: raw.originalStartTime?.dateTime || raw.originalStartTime?.date || "",
    googleUpdatedAt: raw.updated || "",
    googleHtmlLink: raw.htmlLink || "",
    googleSourceKey: sourceKey
  };
}

function readSelectedCalendarIds() {
  try {
    const rows = JSON.parse(localStorage.getItem(CALENDAR_SELECTION_KEY) || "[]");
    return new Set(Array.isArray(rows) ? rows : []);
  } catch (_error) {
    return new Set();
  }
}

function writeSelectedCalendarIds(ids) {
  localStorage.setItem(CALENDAR_SELECTION_KEY, JSON.stringify([...ids]));
}

function initGoogleCalendarImporter(setManagerStatus) {
  const cloud = window.StarMapCloud;
  const connectButton = document.getElementById("connect-google-calendar");
  const reloadButton = document.getElementById("reload-google-calendars");
  const previewButton = document.getElementById("preview-google-events");
  const importButton = document.getElementById("import-google-events");
  const calendarList = document.getElementById("google-calendar-list");
  const previewList = document.getElementById("google-event-preview");
  const previewSection = document.getElementById("google-event-preview-section");
  const previewCount = document.getElementById("google-preview-count");
  const selectedCount = document.getElementById("selected-calendar-count");
  const fromInput = document.getElementById("calendar-import-from");
  const toInput = document.getElementById("calendar-import-to");
  const summary = document.getElementById("cloud-connection-summary");
  if (!connectButton || !calendarList || !cloud) return;

  const range = defaultCalendarRange();
  if (fromInput && !fromInput.value) fromInput.value = range.start;
  if (toInput && !toInput.value) toInput.value = range.end;

  let calendars = [];
  let selected = readSelectedCalendarIds();

  function setStatus(message) {
    if (typeof setManagerStatus === "function") setManagerStatus(message);
  }

  function updateSummary(state = cloud.getState()) {
    const title = !state.configured
      ? "Cloud設定前：Calendar Client IDを設定してください"
      : !state.signedIn
        ? "Google Editorへサインインしてください"
        : !state.authorized
          ? "ログイン済みですが編集権限がありません"
          : state.calendarConnected
            ? "Google Calendar接続済み"
            : "Editor認証済み・Calendar未接続";
    const sub = state.user?.email || state.cloudStatus || "Firebase / Google Calendar";
    if (summary) {
      summary.classList.toggle("is-connected", Boolean(state.calendarConnected));
      summary.classList.toggle("is-denied", Boolean(state.signedIn && !state.authorized));
      summary.querySelector("strong").textContent = title;
      summary.querySelector("small").textContent = sub;
    }
    connectButton.disabled = state.configured && !state.authorized;
    connectButton.textContent = state.calendarConnected ? "Calendar権限を再接続" : "Google Calendarへ接続";
  }

  function renderCalendars() {
    const availableIds = new Set(calendars.map(item => item.id));
    selected = new Set([...selected].filter(id => availableIds.has(id)));
    if (!calendars.length) {
      calendarList.innerHTML = '<p class="manager-empty">選択可能なカレンダーがありません。</p>';
      previewButton.disabled = true;
      if (selectedCount) selectedCount.textContent = "0 SELECTED";
      return;
    }
    calendarList.innerHTML = calendars.map((item, index) => {
      const checked = selected.has(item.id) || (!selected.size && (item.primary || item.selected));
      if (checked) selected.add(item.id);
      return `
        <label class="google-calendar-row">
          <input type="checkbox" data-calendar-index="${index}" ${checked ? "checked" : ""}>
          <i style="--calendar-color:${escapePageHtml(item.backgroundColor || "#8a76c9")}"></i>
          <span><strong>${escapePageHtml(item.summary)}</strong><small>${escapePageHtml(item.primary ? "PRIMARY CALENDAR" : item.accessRole)}</small></span>
        </label>`;
    }).join("");
    writeSelectedCalendarIds(selected);
    if (selectedCount) selectedCount.textContent = `${selected.size} SELECTED`;
    previewButton.disabled = selected.size === 0;
  }

  async function loadCalendars() {
    setStatus("カレンダー一覧を読み込んでいます…");
    calendarList.innerHTML = '<p class="manager-empty">Loading calendars…</p>';
    try {
      calendars = await cloud.listCalendars();
      renderCalendars();
      reloadButton.disabled = false;
      setStatus(`${calendars.length}件のカレンダーを読み込みました。`);
    } catch (error) {
      console.error(error);
      calendarList.innerHTML = `<p class="manager-empty">${escapePageHtml(error.message || String(error))}</p>`;
      setStatus("カレンダー一覧を読み込めませんでした。");
    }
  }

  function renderPreview() {
    if (!GOOGLE_IMPORT_PREVIEW.length) {
      previewSection.hidden = false;
      previewList.innerHTML = '<p class="manager-empty">指定期間内に予定がありません。</p>';
      previewCount.textContent = "0 EVENTS";
      importButton.disabled = true;
      return;
    }
    previewSection.hidden = false;
    previewCount.textContent = `${GOOGLE_IMPORT_PREVIEW.length} EVENTS`;
    importButton.disabled = false;
    previewList.innerHTML = GOOGLE_IMPORT_PREVIEW.map((item, index) => `
      <article class="google-preview-row ${item.mode === "update" ? "is-update" : ""}" data-preview-index="${index}">
        <label class="google-preview-check"><input type="checkbox" data-preview-field="selected" ${item.selected ? "checked" : ""}><span>${item.mode === "update" ? "UPDATE" : "NEW"}</span></label>
        <div class="google-preview-main">
          <div class="google-preview-source"><b>${escapePageHtml(item.googleCalendarName)}</b><span><time>${escapePageHtml(item.date)} ${escapePageHtml(formatEventTime(item))}</time>${item.googleHtmlLink ? ` <a href="${escapePageHtml(item.googleHtmlLink)}" target="_blank" rel="noopener">Google側を開く ↗</a>` : ""}</span></div>
          <label>シナリオ名<input type="text" data-preview-field="title" value="${escapePageHtml(item.title)}"></label>
          <div class="google-preview-pair">
            <label>Scenario ID<input type="text" data-preview-field="scenarioId" value="${escapePageHtml(item.scenarioId)}"></label>
            <label>日付<input type="date" data-preview-field="date" value="${escapePageHtml(item.date)}"></label>
          </div>
          <div class="google-preview-pair">
            <label>役割<select data-preview-field="role">
              <option value="">未設定</option>${["PL","KP","GM","DL","SKP"].map(role => `<option ${item.role === role ? "selected" : ""}>${role}</option>`).join("")}
            </select></label>
            <label>システム<input type="text" data-preview-field="system" value="${escapePageHtml(item.system)}"></label>
          </div>
          <div class="google-preview-pair">
            <label>状態<select data-preview-field="status">${["予定","調整中","確定","現行","中止"].map(status => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
            <label>時間帯<select data-preview-field="sessionType">
              <option value="day" ${item.sessionType === "day" ? "selected" : ""}>☀ 昼卓</option>
              <option value="night" ${item.sessionType === "night" ? "selected" : ""}>☾ 夜卓</option>
              <option value="allDay" ${item.sessionType === "allDay" ? "selected" : ""}>★ 終日卓</option>
            </select></label>
          </div>
        </div>
      </article>`).join("");
  }

  connectButton.addEventListener("click", async () => {
    try {
      setStatus("Google Calendarの読み取り権限を確認しています…");
      await cloud.connectCalendar({ prompt: "consent" });
      await loadCalendars();
    } catch (error) {
      console.error(error);
      setStatus(error.message || String(error));
    }
  });

  reloadButton.addEventListener("click", loadCalendars);

  calendarList.addEventListener("change", event => {
    const checkbox = event.target.closest("[data-calendar-index]");
    if (!checkbox) return;
    const item = calendars[Number(checkbox.dataset.calendarIndex)];
    if (!item) return;
    if (checkbox.checked) selected.add(item.id); else selected.delete(item.id);
    writeSelectedCalendarIds(selected);
    selectedCount.textContent = `${selected.size} SELECTED`;
    previewButton.disabled = selected.size === 0;
  });

  previewButton.addEventListener("click", async () => {
    const chosen = calendars.filter(item => selected.has(item.id));
    if (!chosen.length) return;
    const timeMin = calendarTimeBoundary(fromInput.value, false);
    const timeMax = calendarTimeBoundary(toInput.value, true);
    if (!timeMin || !timeMax) {
      setStatus("取り込み期間を指定してください。");
      return;
    }
    previewButton.disabled = true;
    setStatus(`${chosen.length}件のカレンダーから予定を取得しています…`);
    try {
      const groups = await Promise.all(chosen.map(async calendar => {
        const rows = await cloud.listCalendarEvents(calendar.id, { timeMin, timeMax });
        return rows.map(row => googleEventToPreview(row, calendar)).filter(Boolean);
      }));
      GOOGLE_IMPORT_PREVIEW = groups.flat().sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
      renderPreview();
      setStatus(`${GOOGLE_IMPORT_PREVIEW.length}件の予定をプレビューしています。`);
    } catch (error) {
      console.error(error);
      setStatus(error.message || String(error));
    } finally {
      previewButton.disabled = false;
    }
  });

  previewList.addEventListener("input", event => {
    const row = event.target.closest("[data-preview-index]");
    const field = event.target.dataset.previewField;
    if (!row || !field) return;
    const item = GOOGLE_IMPORT_PREVIEW[Number(row.dataset.previewIndex)];
    if (!item) return;
    item[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (field === "title") {
      item.title = canonicalScenarioTitle({ title: item.title });
      const idInput = row.querySelector('[data-preview-field="scenarioId"]');
      if (idInput && !idInput.dataset.manual) {
        item.scenarioId = resolveScenarioId(item.title);
        idInput.value = item.scenarioId;
      }
    }
    if (field === "scenarioId") event.target.dataset.manual = "true";
  });

  importButton.addEventListener("click", () => {
    const selectedRows = GOOGLE_IMPORT_PREVIEW.filter(item => item.selected);
    const invalid = selectedRows.filter(item => !item.date || !item.title || !item.scenarioId || !item.role);
    if (invalid.length) {
      setStatus(`${invalid.length}件にシナリオ名・ID・日付・役割の未入力があります。`);
      return;
    }
    let added = 0;
    let updated = 0;
    selectedRows.forEach(item => {
      const cleanItem = { ...item };
      delete cleanItem.selected;
      delete cleanItem.mode;
      cleanItem.scenarioTitle = canonicalScenarioTitle({ title: cleanItem.title });
      cleanItem.title = cleanItem.scenarioTitle;
      const index = EVENTS.findIndex(row => row.googleSourceKey === cleanItem.googleSourceKey || row.id === cleanItem.id);
      if (index >= 0) { EVENTS[index] = { ...EVENTS[index], ...cleanItem }; updated += 1; }
      else { EVENTS.push(cleanItem); added += 1; }
    });
    saveEvents();
    refreshEventViews();
    setStatus(`${added}件を追加、${updated}件を更新しました。`);
    GOOGLE_IMPORT_PREVIEW = [];
    previewSection.hidden = true;
  });

  cloud.subscribe(updateSummary);
  updateSummary();
}


function initQuickEventManager() {
  const form = document.getElementById("quick-event-form");
  if (!form) return;

  const titleInput = form.elements.namedItem("title");
  const scenarioIdInput = form.elements.namedItem("scenarioId");
  const dateInput = form.elements.namedItem("date");
  const statusEl = document.getElementById("quick-event-status");

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function syncScenarioId(force = false) {
    if (!titleInput || !scenarioIdInput) return;
    if (!force && scenarioIdInput.dataset.manual === "true") return;
    scenarioIdInput.value = resolveScenarioId(titleInput.value);
  }

  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = isoDateOnly(tomorrow);
  }

  titleInput?.addEventListener("input", () => syncScenarioId(false));
  scenarioIdInput?.addEventListener("input", () => { scenarioIdInput.dataset.manual = "true"; });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const date = String(data.get("date") || "").trim();
    const role = String(data.get("role") || "").trim();
    if (!date || !title || !role) {
      setStatus("日付・シナリオ名・役割を入力してください。");
      return;
    }

    const scenarioId = String(data.get("scenarioId") || "").trim() || resolveScenarioId(title);
    const item = {
      id: `event-${Date.now()}`,
      scenarioId,
      date,
      title,
      scenarioTitle: title,
      system: String(data.get("system") || "").trim(),
      role,
      sessionType: normalizeSessionType(String(data.get("sessionType") || "day")),
      startTime: String(data.get("startTime") || "").trim(),
      endTime: String(data.get("endTime") || "").trim(),
      status: String(data.get("status") || "予定").trim(),
      note: String(data.get("note") || "").trim(),
      source: "manual"
    };

    EVENTS.push(item);
    saveEvents();
    refreshEventViews();

    const savedDate = item.date;
    form.reset();
    if (scenarioIdInput) {
      scenarioIdInput.value = "";
      scenarioIdInput.dataset.manual = "false";
    }
    if (dateInput) dateInput.value = savedDate;
    setStatus(`「${item.title}」を追加しました。`);
  });
}


function initEventManager() {
  const form = document.getElementById("event-form");
  const fileInput = document.getElementById("google-ics-file");
  const backupInput = document.getElementById("editor-backup-file");
  const clearBtn = document.getElementById("clear-events");
  const status = document.getElementById("event-manager-status");
  const scenarioTitleInput = form?.elements?.namedItem("title");
  const scenarioIdInput = form?.elements?.namedItem("scenarioId");
  const eventIdInput = form?.elements?.namedItem("eventId");
  const cancelEditButton = document.getElementById("cancel-event-edit");
  const submitButton = document.getElementById("event-submit-button");
  if (!form) return;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  initGoogleCalendarImporter(setStatus);

  function syncScenarioId(force = false) {
    if (!scenarioTitleInput || !scenarioIdInput) return;
    if (!force && scenarioIdInput.dataset.manual === "true") return;
    scenarioIdInput.value = resolveScenarioId(scenarioTitleInput.value);
  }

  function resetEditorForm(message = "") {
    form.reset();
    if (eventIdInput) eventIdInput.value = "";
    if (scenarioIdInput) {
      scenarioIdInput.value = "";
      scenarioIdInput.dataset.manual = "false";
    }
    if (submitButton) submitButton.textContent = "予定を保存";
    if (cancelEditButton) cancelEditButton.hidden = true;
    if (message) setStatus(message);
  }

  scenarioTitleInput?.addEventListener("input", () => syncScenarioId(false));
  scenarioIdInput?.addEventListener("input", () => { scenarioIdInput.dataset.manual = "true"; });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const scenarioId = String(data.get("scenarioId") || "").trim() || resolveScenarioId(title);
    const existingId = String(data.get("eventId") || "").trim();
    const item = {
      id: existingId || `event-${Date.now()}`,
      scenarioId,
      date: String(data.get("date") || ""),
      title,
      scenarioTitle: title,
      system: String(data.get("system") || "").trim(),
      role: String(data.get("role") || "").trim(),
      sessionType: normalizeSessionType(String(data.get("sessionType") || "day")),
      startTime: String(data.get("startTime") || "").trim(),
      endTime: String(data.get("endTime") || "").trim(),
      status: String(data.get("status") || "予定").trim(),
      note: String(data.get("note") || "").trim(),
      source: existingId ? (EVENTS.find(row => row.id === existingId)?.source || "manual") : "manual"
    };
    if (!item.date || !item.title || !item.role) return;
    const index = EVENTS.findIndex(row => row.id === item.id);
    if (index >= 0) EVENTS[index] = item;
    else EVENTS.push(item);
    saveEvents();
    resetEditorForm(index >= 0 ? "予定を更新しました。" : "予定を保存しました。");
    refreshEventViews();
  });

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const imported = parseIcsEvents(await file.text()).map(item => ({
      ...item,
      scenarioId: resolveScenarioId(item.title),
      scenarioTitle: item.title
    }));
    const existing = new Set(EVENTS.map(item => `${item.date}|${canonicalScenarioTitle(item)}|${item.role}`));
    const fresh = imported.filter(item => !existing.has(`${item.date}|${canonicalScenarioTitle(item)}|${item.role}`));
    EVENTS.push(...fresh);
    saveEvents();
    setStatus(`${fresh.length}件の予定を取り込みました。`);
    fileInput.value = "";
    refreshEventViews();
  });

  document.getElementById("event-manager-list")?.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-event]");
    if (editButton) {
      const item = EVENTS.find(row => row.id === editButton.dataset.editEvent);
      if (!item) return;
      form.elements.namedItem("eventId").value = item.id || "";
      form.elements.namedItem("date").value = item.date || "";
      form.elements.namedItem("title").value = item.title || "";
      form.elements.namedItem("scenarioId").value = item.scenarioId || resolveScenarioId(item.title);
      form.elements.namedItem("scenarioId").dataset.manual = "false";
      form.elements.namedItem("system").value = item.system || "";
      form.elements.namedItem("role").value = item.role || "";
      form.elements.namedItem("sessionType").value = normalizeSessionType(item.sessionType);
      form.elements.namedItem("startTime").value = item.startTime || "";
      form.elements.namedItem("endTime").value = item.endTime || "";
      form.elements.namedItem("status").value = item.status || "予定";
      form.elements.namedItem("note").value = item.note || "";
      if (submitButton) submitButton.textContent = "変更を保存";
      if (cancelEditButton) cancelEditButton.hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const deleteButton = event.target.closest("[data-delete-event]");
    if (!deleteButton) return;
    const item = EVENTS.find(row => row.id === deleteButton.dataset.deleteEvent);
    if (!item || !window.confirm(`「${item.title}」の予定を削除しますか？`)) return;
    EVENTS = EVENTS.filter(row => row.id !== item.id);
    saveEvents();
    resetEditorForm("予定を削除しました。");
    refreshEventViews();
  });

  cancelEditButton?.addEventListener("click", () => resetEditorForm("編集をキャンセルしました。"));

  clearBtn?.addEventListener("click", () => {
    if (!window.confirm("ブラウザに保存した予定をすべて削除しますか？")) return;
    EVENTS = [];
    saveEvents();
    resetEditorForm("予定をすべて削除しました。");
    refreshEventViews();
  });

  document.getElementById("export-publish-data")?.addEventListener("click", () => window.exportStarMapPublishFile?.());
  document.getElementById("export-editor-backup")?.addEventListener("click", () => window.exportStarMapBackup?.());
  document.getElementById("reset-editor-draft")?.addEventListener("click", () => {
    if (!window.confirm("ローカル編集内容を破棄し、公開中データへ戻しますか？")) return;
    window.resetStarMapDraft?.();
    EVENTS = window.getStarMapEvents?.() || [];
    resetEditorForm("公開中データへ戻しました。");
    refreshEventViews();
  });
  document.getElementById("sync-cloud-data")?.addEventListener("click", async () => {
    const syncStatus = document.getElementById("cloud-sync-status");
    if (syncStatus) syncStatus.textContent = "Firestoreへ同期しています…";
    try {
      await window.pushStarMapDraftToCloud?.();
      if (syncStatus) syncStatus.textContent = "Firestoreへの同期を実行しました。";
    } catch (error) {
      if (syncStatus) syncStatus.textContent = `同期できませんでした：${error.message || error}`;
    }
  });
  window.addEventListener("star-map-sync-status", event => {
    const syncStatus = document.getElementById("cloud-sync-status");
    if (syncStatus) syncStatus.textContent = event.detail?.message || "";
  });

  backupInput?.addEventListener("change", async () => {
    const file = backupInput.files?.[0];
    if (!file) return;
    try {
      await window.importStarMapBackup?.(file);
      EVENTS = window.getStarMapEvents?.() || [];
      setStatus("バックアップを読み込みました。");
      refreshEventViews();
    } catch (error) {
      console.error(error);
      setStatus("バックアップを読み込めませんでした。");
    }
    backupInput.value = "";
  });

  renderEventManagerList();
}

/* ---------- モバイルナビ開閉 ---------- */
function initNavToggle() {
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", nav.classList.contains("is-open") ? "true" : "false");
  });
}

/* ---------- カレンダー：前月／翌月ボタン ---------- */
function initCalendarNav() {
  const prevBtn = document.getElementById("cal-prev");
  const nextBtn = document.getElementById("cal-next");
  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", () => {
    let { year, month } = calState;
    month--;
    if (month < 0) { month = 11; year--; }
    renderCalendar(year, month);
  });
  nextBtn.addEventListener("click", () => {
    let { year, month } = calState;
    month++;
    if (month > 11) { month = 0; year++; }
    renderCalendar(year, month);
  });
}

/* ---------- 年月ピッカー（カレンダー見出しをクリックして開く） ---------- */
function initMonthPicker() {
  const label = document.getElementById("cal-label");
  if (!label) return;

  label.classList.add("is-clickable");
  label.setAttribute("role", "button");
  label.setAttribute("tabindex", "0");
  label.setAttribute("aria-label", "表示する年月を選択");

  let overlay = null;
  let pickerYear = calState.year;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "cal-picker-overlay";
    overlay.innerHTML = `
      <div class="cal-picker panel" role="dialog" aria-modal="true" aria-label="年月選択">
        <button class="cal-picker-close" aria-label="閉じる">×</button>
        <div class="cal-picker-year">
          <button class="cal-nav-btn" data-dir="-1" aria-label="前の年">‹</button>
          <span class="cal-picker-year-label"></span>
          <button class="cal-nav-btn" data-dir="1" aria-label="次の年">›</button>
        </div>
        <div class="cal-picker-months"></div>
        <button class="cal-picker-today">今月へ</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });
    overlay.querySelector(".cal-picker-close").addEventListener("click", closeOverlay);
    overlay.querySelector(".cal-picker-today").addEventListener("click", () => {
      const now = new Date();
      renderCalendar(now.getFullYear(), now.getMonth());
      closeOverlay();
    });
    overlay.querySelectorAll(".cal-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        pickerYear += parseInt(btn.dataset.dir, 10);
        refreshOverlay();
      });
    });

    document.addEventListener("keydown", onKeydown);
  }

  function onKeydown(e) {
    if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) closeOverlay();
  }

  function refreshOverlay() {
    overlay.querySelector(".cal-picker-year-label").textContent = `${pickerYear}年`;
    const monthsWrap = overlay.querySelector(".cal-picker-months");
    monthsWrap.innerHTML = MONTH_NAMES_JA.map((m, i) => {
      const isActive = pickerYear === calState.year && i === calState.month;
      return `<button class="cal-picker-month${isActive ? " is-active" : ""}" data-month="${i}">${m}</button>`;
    }).join("");
    monthsWrap.querySelectorAll(".cal-picker-month").forEach(btn => {
      btn.addEventListener("click", () => {
        renderCalendar(pickerYear, parseInt(btn.dataset.month, 10));
        closeOverlay();
      });
    });
  }

  function openOverlay() {
    if (!overlay) buildOverlay();
    pickerYear = calState.year;
    refreshOverlay();
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
  }

  label.addEventListener("click", openOverlay);
  label.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openOverlay(); }
  });
}

/* ---------- ページ遷移（フェード＆スライド） ---------- */
function initPageTransitions() {
  // ページ表示時：スッとフェードイン
  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });

  // 同一サイト内のリンクをクリックしたら、フェードアウトしてから遷移
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;

    // 同じページ内アンカーは対象外（TOPページの #plans-preview など）
    if (href.includes("#") && href.split("#")[0] === "") return;

    e.preventDefault();
    document.body.classList.remove("is-ready");
    document.body.classList.add("is-leaving");
    window.setTimeout(() => { window.location.href = href; }, 260);
  });
}


/* ---------- トップページ統計：卓ログと予定から自動集計 ---------- */
function renderHomeStats() {
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = EVENTS.filter(e => new Date(e.date + "T00:00:00") >= today);
  const log = typeof SESSION_LOG === "undefined" ? [] : SESSION_LOG;
  // シナリオ総数：役割を問わず、正規化済み scenarioCountKey のユニーク数。
  const scenarioTotal = new Set(
    log.map(canonicalScenarioTitle).filter(Boolean)
  );

  // セッション数：1行を1卓ではなく、各行の dates に含まれる「卓日」を合計。
  // 同じ日に複数の別セッションがある場合も、各行ごとに1回ずつ加算される。
  const sessionDayCount = log.reduce((total, row) => {
    const dates = Array.isArray(row.dates) && row.dates.length
      ? row.dates
      : (row.date ? [row.date] : []);
    const completedDates = dates.filter(date => {
      const parsed = new Date(String(date) + "T00:00:00");
      return !Number.isNaN(parsed.getTime()) && parsed < today;
    });
    return total + completedDates.length;
  }, 0);

  setText("stat-active", new Set(upcoming.map(e => e.title)).size);
  setText("stat-upcoming", upcoming.length);
  setText("stat-sessions", sessionDayCount);
  setText("stat-scenarios", scenarioTotal.size);
}

/* ---------- Records / これまでの記録 ---------- */
function renderRecordsPage() {
  const list = document.getElementById("record-list");
  if (!list) return;

  const log = typeof SESSION_LOG === "undefined" ? [] : SESSION_LOG;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = EVENTS.filter(event => new Date(event.date + "T00:00:00") >= today);
  const isCurrent = event => /現行|進行中|currently playing|genkou/i.test(String(event.status || ""));

  const playedKeys = new Set(log
    .filter(row => String(row.role || "").toUpperCase() === "PL")
    .map(canonicalScenarioTitle).filter(Boolean));
  const gmKeys = new Set(log
    .filter(row => isGmRole(row.role))
    .map(canonicalScenarioTitle).filter(Boolean));

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  setText("record-stat-current", new Set(upcoming.filter(isCurrent).map(event => event.title)).size);
  setText("record-stat-planning", new Set(upcoming.filter(event => !isCurrent(event)).map(event => event.title)).size);
  setText("record-stat-played", playedKeys.size);
  setText("record-stat-gm", gmKeys.size);

  const filters = document.querySelectorAll("[data-record-filter]");
  const result = document.getElementById("record-result-count");
  const loadMore = document.getElementById("record-load-more");
  let activeFilter = "all";
  let visibleLimit = 60;

  const lastDate = row => {
    const dates = Array.isArray(row.dates) && row.dates.length ? row.dates : [row.date];
    return dates.filter(Boolean).sort().at(-1) || "";
  };

  const sorted = [...log].sort((a, b) => {
    const dateCompare = lastDate(b).localeCompare(lastDate(a));
    if (dateCompare) return dateCompare;
    return canonicalScenarioTitle(a).localeCompare(canonicalScenarioTitle(b), "ja");
  });

  function render() {
    const filtered = sorted.filter(row => {
      if (activeFilter === "pl") return String(row.role || "").toUpperCase() === "PL";
      if (activeFilter === "gm") return isGmRole(row.role);
      return true;
    });

    const visible = filtered.slice(0, visibleLimit);
    list.innerHTML = visible.map(row => {
      const date = lastDate(row);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      const day = match ? match[3] : "--";
      const month = match ? MONTH_NAMES[Number(match[2]) - 1] : "---";
      const role = String(row.role || "-").toUpperCase();
      const roleClass = isGmRole(role) ? "role-gm" : "role-pl";
      const details = [
        row.pc && row.pc !== "-" ? `PC: ${row.pc}` : "",
        row.gm && row.gm !== "-" ? `GM/KP: ${row.gm}` : "",
        row.note || ""
      ].filter(Boolean);
      const status = row.time ? `${row.time}h` : (row.status || "記録");
      return `
        <article class="upcoming-card panel record-card">
          <div class="upcoming-date"><span class="d">${escapePageHtml(day)}</span><span class="m">${escapePageHtml(month)}</span></div>
          <div class="upcoming-info">
            <p class="title">${escapePageHtml(canonicalScenarioTitle(row))}</p>
            <div class="meta"><span class="tag ${roleClass}">${escapePageHtml(role)}</span><span>${escapePageHtml(row.system || "SYSTEM未設定")}</span></div>
            ${details.length ? `<p class="record-details">${details.map(escapePageHtml).join(" · ")}</p>` : ""}
          </div>
          <div class="upcoming-status">${escapePageHtml(status)}</div>
        </article>`;
    }).join("");

    if (result) result.textContent = `${visible.length} / ${filtered.length} RECORDS`;
    if (loadMore) {
      loadMore.hidden = visible.length >= filtered.length;
      loadMore.textContent = `さらに表示（残り ${Math.max(0, filtered.length - visible.length)}件）`;
    }
  }

  filters.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.recordFilter || "all";
      visibleLimit = 60;
      filters.forEach(item => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  loadMore?.addEventListener("click", () => {
    visibleLimit += 60;
    render();
  });

  render();
}

window.addEventListener("star-map-data-changed", () => {
  EVENTS = typeof window.getStarMapEvents === "function" ? window.getStarMapEvents() : EVENTS;
  refreshEventViews();
});

document.addEventListener("DOMContentLoaded", () => {
  initPageTransitions();
  initNavToggle();
  const now = new Date();
  renderCalendar(now.getFullYear(), now.getMonth());
  initCalendarNav();
  initCalendarPopup();
  initMonthPicker();
  renderUpcoming();
  renderHomeStats();
  renderRecordsPage();
  initEventManager();
  initQuickEventManager();
});

// ブラウザの「戻る」でキャッシュから復元された場合も、確実にフェードインさせる
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    document.body.classList.remove("is-leaving");
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  }
});
