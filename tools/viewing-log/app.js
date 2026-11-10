const DATA_URL = "data/videos.json";
const STORAGE_KEY = "trpg-log-keeper-overrides-v1";
const THEME_KEY = "trpg-log-keeper-theme";
const PAGE_SIZE = 30;
const OWN_CHANNEL_ID = "UCBDpabQnpX8TTtZPQNPdtcw";
const OWN_CHANNEL_NAME = "くま。KumaSteps";

const state = {
  videos: [],
  channelProfiles: [],
  channelMetadata: [],
  manualImport: null,
  generatedAt: "",
  overrides: { records: {}, edits: [], customRecords: [] },
  currentView: "dashboard",
  logPage: 1,
  reviewPage: 1,
  reviewPriority: "All",
  includeOwnVideos: false,
  scenarioSort: "count",
  channelSort: "count",
  selectedScenario: null,
  selectedChannel: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const fmt = new Intl.NumberFormat("ja-JP");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateLabel(value) {
  if (!value) return "日付不明";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function shortDate(value) {
  if (!value) return { main: "--", sub: "----" };
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return { main: String(value).slice(5, 10), sub: String(value).slice(0, 4) };
  return {
    main: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
    sub: String(date.getFullYear()),
  };
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function canonicalSystemName(value) {
  return normalize(value) === "emoklore" ? "エモクロア" : value;
}

const GM_NAME_CHANNEL_RULES = [
  ["まだら牛 【山とかTRPGとか】", "まだら牛"],
  ["むつー / mutuu gaming", "むつー"],
  ["四宮 伊織 / SHINOMIYA Iori", "四宮 伊織"],
  ["くま。KumaSteps", "くま。"],
  ["九畝くぜ【TRPG】", "九畝くぜ"],
  ["川犬 [ TRPG | ゲーム実況 ]", "川犬"],
  ["高音　超子@没落貴族系vtuber", "高音超子"],
  ["月田桜菜 -Tsukita Sana-", "月田桜菜"],
  ["てけてけさん", "てけてけ"],
  ["諸星めぐる Megu.ch【書店員VTuber】", "諸星めぐる"],
  ["ニコライ・ボルコフ@日本語読めない卓", "ニコライ・ボルコフ"],
  ["ねむさん", "ねむ"],
  ["超高音", "超高音子"],
  ["七転骰子 -Nanakorobi Dice- Ch.", "七転骰子"],
  ["辛咲こまど👑🌹", "辛咲こまど"],
  ["シオンさん HO公安:ゆきな(右) HO刑事:ミヤさん(左) ※HO公安視点", "シオン"],
  ["一橋綾人 / Hitotsubashi Ayato【にじさんじ】", "一橋綾人"],
  ["すずきさんち", "すずき"],
  ["高生紳士の実家", "高生紳士"],
  ["さんびょうしんさん", "さんびょうしん"],
  ["まるたさん", "まるた"],
  ["たまさん", "たま"],
  ["天井音らむね / Amaine Ramune", "天井音らむね"],
  ["Sig Ch.【秋雨 時雨（あきさめ しぐ）】", "秋雨時雨"],
  ["もすい。/こりかん", "もすい。"],
  ["うたかたさん", "うたかた"],
  ["椎名さん / Studio Stardust", "椎名さん"],
  ["ローゼアトの研究室", "ローゼアト"],
  ["SatouHolmes Ch.佐藤ホームズ", "佐藤ホームズ"],
  ["たいやき（たいやき屋）", "たいやき屋"],
  ["エンマ / シュラさん", "エンマ・シュラ"],
  ["Amoko Ch. 甘乃あもこ", "甘乃あもこ"],
  ["星見まどかの宇宙情報室", "星見まどか"],
  ["ぱぱびっぷTRPG", "ぱぱびっぷ"],
  ["天使代行ラングドシャchannel", "ラングドシャ"],
  ["たまさん / HO1:くま。 / HO2:みおさん", "たま"],
  ["あいる実況ch", "あいる"],
  ["八魂りつき🎱🔥", "八魂りつき"],
  ["seinąのチャンネル", "seiną"],
  ["もこめめ*channel", "もこ田めめ"],
  ["MonsterZ MATE", "コーサカ"],
  ["ジャック", "霧島ジャック"],
  ["雪車町ルイ*SORIMACHI RUY", "雪車町ルイ"],
  ["ココロニ ･ ノンノ / Kokoroni Nonno Ch.", "ココロニ ･ ノンノ"],
  ["まだら牛 3", "まだら牛"],
  ["すいそChannel/すいそのへや", "すいそ"],
  ["御影ウツリinさわやか卓", "御影ウツリ"],
  ["怪崎ショウ子 / KaizakiShoko", "怪崎ショウ子"],
  ["周央 サンゴ / Suo Sango【にじさんじ】", "周央サンゴ"],
  ["ジャック、健屋花那", "霧島ジャック、健屋花那"],
];
const GM_NAME_BY_CHANNEL = new Map(GM_NAME_CHANNEL_RULES.map(([channel, gm]) => [normalize(channel), gm]));

function gmNameFromChannel(channelName) {
  return GM_NAME_BY_CHANNEL.get(normalize(channelName)) || channelName;
}

function splitPeople(value) {
  if (!value) return [];
  return [...new Set(String(value).split(/\s*(?:\/|／|,|、|\||・{2,})\s*/).map((item) => item.trim()).filter(Boolean))];
}

function isOwnChannelVideo(video) {
  return video.channelId === OWN_CHANNEL_ID || normalize(video.channelName) === normalize(OWN_CHANNEL_NAME);
}

function displayVideos() {
  return state.videos.filter((video) => state.includeOwnVideos || !isOwnChannelVideo(video));
}

function availableVideos() {
  return displayVideos().filter((video) => !video.deleted);
}

function isSessionVideo(video) {
  return video.classification === "Session";
}

function contentLabel(video) {
  if (isSessionVideo(video)) return video.canonical.scenario || "シナリオ不明";
  if (video.classification === "Related") return video.relatedType || "関連動画";
  if (video.classification === "Non-TRPG") return "TRPG対象外";
  return video.canonical.scenario || "分類要確認";
}

function activeVideos() {
  return availableVideos().filter((video) => video.reviewStatus !== "Excluded" && isSessionVideo(video));
}

function reviewProgressStats() {
  const sessions = availableVideos().filter(isSessionVideo);
  const excluded = sessions.filter((video) => video.reviewStatus === "Excluded").length;
  const eligible = sessions.filter((video) => video.reviewStatus !== "Excluded");
  const verified = eligible.filter((video) => ["Verified", "Corrected"].includes(video.reviewStatus)).length;
  const partial = eligible.filter((video) => video.reviewStatus === "Partial").length;
  const open = eligible.filter((video) => video.reviewStatus === "Open").length;
  return {
    total: eligible.length,
    verified,
    partial,
    open,
    excluded,
    percent: Math.round(verified / (eligible.length || 1) * 100),
  };
}

function applyGmPlaceholder(video, saved = {}) {
  video.gmKpDlProvisional = false;
  if (!isSessionVideo(video)) return;
  if (saved.gmKpDl) {
    if (normalize(saved.gmKpDl) === normalize(video.channelName)) {
      video.canonical.gmKpDl = gmNameFromChannel(video.channelName);
    }
    video.gmKpDlProvisional = saved.gmKpDlConfirmed === false;
    return;
  }
  const current = normalize(video.canonical.gmKpDl);
  const gmIsUnknown = !current || current === "不明" || current.includes("gm/kp/dl 不明") || current.includes("gm・kp・dl 不明") || current === "unknown";
  if (gmIsUnknown && video.channelName && video.channelName !== "チャンネル不明") {
    video.canonical.gmKpDl = gmNameFromChannel(video.channelName);
    video.source.gmKpDl = "Placeholder";
    video.gmKpDlProvisional = true;
  }
}

function scenarioIdentity(value) {
  return normalize(value)
    .replace(/[\s「」『』【】()[\]（）_＿・、,，。．.!！?？~〜～\-—–―:：'"“”/／|｜]/g, "");
}

function scenarioKey(video) {
  const name = video.canonical.scenario || video.scenarioMasterName || "";
  return name ? `name:${scenarioIdentity(name)}` : video.scenarioId || `video:${video.id}`;
}

function channelProfileFor(videoOrChannel) {
  const channelId = videoOrChannel.channelId || videoOrChannel.profileId;
  const channelName = videoOrChannel.channelName || videoOrChannel.name;
  return state.channelProfiles.find((profile) => profile.id === channelId || profile.title === channelName) || null;
}

function channelMetadataFor(videoOrChannel) {
  const channelId = videoOrChannel.channelId || videoOrChannel.metadataId;
  const channelName = videoOrChannel.channelName || videoOrChannel.name;
  return state.channelMetadata.find((item) => item.channelId === channelId || item.name === channelName) || null;
}

function isOwnedChannel(video) {
  return Boolean(channelProfileFor(video));
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size;
}

function countBy(items, getter) {
  const counts = new Map();
  items.forEach((item) => {
    const key = getter(item) || "不明";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const SYSTEM_BUCKET_ORDER = ["CoC6", "CoC7", "エモクロア", "マダミス", "システム不明", "その他"];

function systemBucket(system) {
  const value = normalize(system);
  if (value === "coc6") return "CoC6";
  if (value === "coc7") return "CoC7";
  if (value === "エモクロア" || value === "emoklore") return "エモクロア";
  if (value === "マダミス" || value === "murder mystery") return "マダミス";
  if (!value || value === "不明" || value === "system不明" || value.includes("unknown")) return "システム不明";
  return "その他";
}

function countSessionsBySystem(videos) {
  const sessionVotes = new Map();
  videos.forEach((video) => {
    if (!isSessionVideo(video)) return;
    const sessionKey = video.sessionId || `video:${video.id}`;
    const bucket = systemBucket(video.canonical.system);
    if (!sessionVotes.has(sessionKey)) sessionVotes.set(sessionKey, new Map());
    const votes = sessionVotes.get(sessionKey);
    votes.set(bucket, (votes.get(bucket) || 0) + 1);
  });
  const counts = new Map(SYSTEM_BUCKET_ORDER.map((bucket) => [bucket, 0]));
  sessionVotes.forEach((votes) => {
    const bucket = [...votes].sort((a, b) => b[1] - a[1] || SYSTEM_BUCKET_ORDER.indexOf(a[0]) - SYSTEM_BUCKET_ORDER.indexOf(b[0]))[0][0];
    counts.set(bucket, counts.get(bucket) + 1);
  });
  return SYSTEM_BUCKET_ORDER.map((bucket) => [bucket, counts.get(bucket)]);
}

function sortVideosForDisplay(videos) {
  const sessionLatest = new Map();
  videos.forEach((video) => {
    const sessionKey = video.sessionId || `video:${video.id}`;
    const watchedAt = String(video.lastWatchedAt || video.firstWatchedAt || "");
    if (!sessionLatest.has(sessionKey) || watchedAt > sessionLatest.get(sessionKey)) {
      sessionLatest.set(sessionKey, watchedAt);
    }
  });

  return [...videos].sort((a, b) => {
    const aSession = a.sessionId || `video:${a.id}`;
    const bSession = b.sessionId || `video:${b.id}`;
    const sessionOrder = String(sessionLatest.get(bSession)).localeCompare(String(sessionLatest.get(aSession)));
    if (sessionOrder) return sessionOrder;

    if (aSession !== bSession) return aSession.localeCompare(bSession);

    const aWatched = String(a.lastWatchedAt || a.firstWatchedAt || "");
    const bWatched = String(b.lastWatchedAt || b.firstWatchedAt || "");
    return aWatched.localeCompare(bWatched) || String(a.id).localeCompare(String(b.id));
  });
}

function loadOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.records && saved?.edits) state.overrides = { ...saved, customRecords: Array.isArray(saved.customRecords) ? saved.customRecords : [] };
  } catch (error) {
    console.warn("Saved overrides could not be loaded", error);
  }
}

function applySavedOverride(video) {
  video._sourceClassification = video.classification;
  video._sourceReviewStatus = video.reviewStatus;
  video._sourceRelatedType = video.relatedType || "";
  video._sourceDeleted = Boolean(video.deleted);
  video._sourceDeletedAt = video.deletedAt || null;
  video.canonical.system = canonicalSystemName(video.canonical.system);
  video.baseCanonical = { ...video.canonical };
  video.baseSource = { ...video.source };
  const saved = state.overrides.records[video.id] || {};
  const fields = ["system", "scenario", "gmKpDl", "pl", "scenarioUrl", "scenarioAuthor"];
  fields.forEach((field) => {
    if (saved[field] !== undefined && saved[field] !== null && saved[field] !== "") {
      video.canonical[field] = field === "system" ? canonicalSystemName(saved[field]) : saved[field];
      video.source[field] = "Override";
    }
  });
  if (saved.classification && !video.curatedRelated) video.classification = saved.classification;
  if (saved.relatedType !== undefined && !video.curatedRelated) video.relatedType = saved.relatedType;
  if (video.curatedRelated) video.classification = "Related";
  if (video.classification === "Related") {
    video.canonical.system = "その他";
    video.canonical.scenario = "";
    video.source.system = "Content type: non-session related content";
    video.source.scenario = "Not applicable: Related";
  }
  if (saved.reviewStatus) video.reviewStatus = saved.reviewStatus;
  if (saved.quality) video.quality = saved.quality;
  if (saved.notes !== undefined) video.notes = saved.notes;
  video.deleted = saved.deleted !== undefined ? Boolean(saved.deleted) : video._sourceDeleted;
  video.deletedAt = saved.deletedAt !== undefined ? saved.deletedAt : video._sourceDeletedAt;
  applyGmPlaceholder(video, saved);
  return video;
}

async function initialize() {
  loadOverrides();
  let payload = window.TRPG_DATA;
  if (!payload) {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`データを読み込めませんでした (${response.status})`);
    payload = await response.json();
  }
  state.channelProfiles = payload.channelProfiles || [];
  state.channelMetadata = payload.channelMetadata || [];
  state.manualImport = payload.manualImport || null;
  const sourceIds = new Set(payload.videos.map((video) => video.id));
  const customRecords = state.overrides.customRecords.filter((video) => video?.id && !sourceIds.has(video.id));
  state.videos = [...payload.videos, ...customRecords].map(applySavedOverride);
  state.generatedAt = payload.generatedAt || "ローカルデータ";
  updateDatasetVersion();
  populateFilters();
  bindEvents();
  applyTheme();
  renderAll();
}

function populateFilters() {
  const current = $("#systemFilter").value;
  const systems = [...new Set(state.videos.map((v) => v.canonical.system).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
  $("#systemFilter").innerHTML = `<option value="">すべて</option>${systems.map((system) => `<option>${escapeHtml(system)}</option>`).join("")}`;
  $("#systemFilter").value = systems.includes(current) ? current : "";
}

function bindEvents() {
  $$(".nav-item[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  $$('[data-go]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.go)));
  $("#globalSearch").addEventListener("input", () => {
    state.logPage = 1;
    renderLog();
    renderScenarios();
    renderChannels();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("#globalSearch").focus();
    }
    if (event.key === "Escape" && !$("#deleteConfirmDialog").open && !$("#addRecordDialog").open) closeEditor();
  });
  $("#filterToggle").addEventListener("click", () => $("#filterPanel").classList.toggle("open"));
  ["reviewPreset", "systemFilter", "reviewFilter", "qualityFilter", "classificationFilter", "subscribedFilter", "deletedFilter"].forEach((id) => {
    $("#" + id).addEventListener("change", () => { state.logPage = 1; renderLog(); });
  });
  $$('[data-review-preset]').forEach((button) => button.addEventListener("click", () => applyReviewPreset(button.dataset.reviewPreset)));
  $("#ownedFilter").addEventListener("change", () => {
    if ($("#ownedFilter").checked) {
      state.includeOwnVideos = true;
      $("#showOwnVideosFilter").checked = true;
    }
    state.logPage = 1;
    renderAll();
  });
  $("#showOwnVideosFilter").addEventListener("change", () => {
    state.includeOwnVideos = $("#showOwnVideosFilter").checked;
    if (!state.includeOwnVideos) $("#ownedFilter").checked = false;
    state.logPage = 1;
    renderAll();
  });
  $("#clearFilters").addEventListener("click", clearFilters);
  $$("[data-export]").forEach((button) => button.addEventListener("click", () => exportData(button.dataset.export)));
  $$("[data-priority]").forEach((button) => button.addEventListener("click", () => {
    state.reviewPriority = button.dataset.priority;
    state.reviewPage = 1;
    $$("[data-priority]").forEach((item) => item.classList.toggle("active", item === button));
    renderReview();
  }));
  $("#scenarioSearch").addEventListener("input", renderScenarios);
  $("#channelSearch").addEventListener("input", renderChannels);
  $("#scenarioSort").addEventListener("change", (event) => {
    state.scenarioSort = event.target.value;
    renderScenarios();
  });
  $("#channelSort").addEventListener("change", (event) => {
    state.channelSort = event.target.value;
    renderChannels();
  });
  $("#closeDrawer").addEventListener("click", closeEditor);
  $("#drawerBackdrop").addEventListener("click", closeEditor);
  $("#backupButton").addEventListener("click", backupOverrides);
  $("#unifiedExportButton").addEventListener("click", exportUnifiedJson);
  $("#copyBackupButton").addEventListener("click", copyBackupToClipboard);
  $("#restoreButton").addEventListener("click", () => $("#restoreInput").click());
  $("#restoreInput").addEventListener("change", restoreOverrides);
  $("#themeButton").addEventListener("click", toggleTheme);
  $("#addRecordButton").addEventListener("click", openAddRecordDialog);
  $("#closeAddRecord").addEventListener("click", closeAddRecordDialog);
  $("#cancelAddRecord").addEventListener("click", closeAddRecordDialog);
  $("#cancelDeleteRecord").addEventListener("click", closeDeleteConfirmation);
  $("#confirmDeleteRecord").addEventListener("click", confirmDeleteVideo);
  $("#deleteConfirmDialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDeleteConfirmation();
  });
  $("#deleteConfirmDialog").addEventListener("click", (event) => {
    if (event.target === $("#deleteConfirmDialog")) closeDeleteConfirmation();
  });
  $("#addUrlForm").addEventListener("submit", fetchNewRecordMetadata);
  $("#addRecordForm").addEventListener("submit", registerNewRecord);
}

function applyTheme() {
  document.body.classList.toggle("dark", localStorage.getItem(THEME_KEY) === "dark");
}

function toggleTheme() {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme();
}

function switchView(view) {
  state.currentView = view;
  $$(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}View`));
  $$(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#mainContent").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (view === "log") renderLog();
  if (view === "review") renderReview();
  if (view === "scenarios") renderScenarios();
  if (view === "channels") renderChannels();
}

function renderAll() {
  renderDashboard();
  renderLog();
  renderReview();
  renderScenarios();
  renderChannels();
  const open = reviewItems().length;
  $("#reviewBadge").textContent = fmt.format(open);
}

function updateDatasetVersion() {
  $("#datasetVersion").textContent = `${state.generatedAt} / ${fmt.format(state.videos.length)}件`;
}

function renderDashboard() {
  const active = activeVideos();
  const available = availableVideos();
  const sessions = uniqueCount(active, "sessionId");
  const scenarioCount = new Set(active.filter((v) => v.canonical.scenario).map(scenarioKey)).size;
  const channelCount = new Set(active.map((v) => v.channelName).filter((name) => name && name !== "チャンネル不明")).size;
  const watches = active.reduce((sum, v) => sum + Number(v.watchCount || 0), 0);
  const ownedVideos = active.filter(isOwnedChannel).length;
  const cards = [
    ["視聴した動画", fmt.format(active.length), `累計 ${fmt.format(watches)} 回の視聴イベント${state.manualImport ? ` · 手動ログから ${fmt.format(state.manualImport.addedVideos)}本追加` : ""}`],
    ["視聴した卓", fmt.format(sessions), `${fmt.format(active.length - sessions)} 本は同卓の続編・別POV`],
    ["シナリオ", fmt.format(scenarioCount), "Canonical名で重複を集約"],
    ["チャンネル", fmt.format(channelCount), `所有チャンネルの配信 ${fmt.format(ownedVideos)}本を識別`],
  ];
  $("#kpiGrid").innerHTML = cards.map(([label, value, note]) => `<article class="kpi-card"><span class="kpi-label">${label}</span><div class="kpi-value">${value}</div><span class="kpi-note">${note}</span></article>`).join("");

  const systemRows = countSessionsBySystem(active);
  const max = Math.max(...systemRows.map(([, count]) => count), 1);
  $("#systemChart").innerHTML = systemRows.map(([label, count]) => `<div class="bar-row"><span class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div><span class="bar-value">${fmt.format(count)}卓</span></div>`).join("");

  const quality = Object.fromEntries(countBy(available, (v) => v.quality));
  const total = available.length || 1;
  const high = quality.High || 0;
  const medium = quality.Medium || 0;
  const low = quality.Low || 0;
  const highPct = high / total * 100;
  const mediumPct = medium / total * 100;
  $("#qualityChart").innerHTML = `<div class="donut" style="background:conic-gradient(var(--success) 0 ${highPct}%, var(--warning) ${highPct}% ${highPct + mediumPct}%, var(--danger) ${highPct + mediumPct}% 100%)"></div><div class="chart-legend">${qualityLegend("High", high, "var(--success)")}${qualityLegend("Medium", medium, "var(--warning)")}${qualityLegend("Low", low, "var(--danger)")}</div>`;

  const recent = sortVideosForDisplay(active).slice(0, 5);
  $("#recentList").innerHTML = recent.map((v) => `<button class="recent-item" type="button" data-video-id="${v.id}"><span class="recent-marker"></span><span class="recent-copy"><strong>${escapeHtml(v.canonical.scenario || v.title)}</strong><small>${escapeHtml(v.canonical.system || "System不明")} · ${escapeHtml(v.channelName)}</small></span><span class="recent-date">${dateLabel(v.lastWatchedAt)}</span></button>`).join("");
  $$("[data-video-id]", $("#recentList")).forEach((item) => item.addEventListener("click", () => openEditor(item.dataset.videoId)));

  const reviewStats = reviewProgressStats();
  const next = reviewItems()[0];
  $("#reviewSummary").innerHTML = `<div class="progress-ring-row"><div class="progress-ring" style="--value:${reviewStats.percent}" data-label="${reviewStats.percent}%"></div><div class="summary-lines"><div class="summary-line"><span>確認済み</span><strong>${fmt.format(reviewStats.verified)}</strong></div><div class="summary-line"><span>一部確認</span><strong>${fmt.format(reviewStats.partial)}</strong></div><div class="summary-line"><span>未確認</span><strong>${fmt.format(reviewStats.open)}</strong></div></div></div>${next ? `<button class="queue-preview" type="button" data-next-review="${next.id}"><strong>次の確認候補</strong><br>${escapeHtml(next.canonical.scenario || "シナリオ不明")} · ${escapeHtml(priorityInfo(next).missing.join("、"))}</button>` : ""}`;
  $("[data-next-review]")?.addEventListener("click", (event) => openEditor(event.currentTarget.dataset.nextReview));
}

function qualityLegend(label, value, color) {
  return `<div class="legend-row"><span class="legend-swatch" style="background:${color}"></span><span>${label}</span><strong>${fmt.format(value)}</strong></div>`;
}

function matchesReviewPreset(video, preset) {
  if (!preset) return true;
  if (preset === "needs-review") return isSessionVideo(video) && ["Open", "Partial"].includes(video.reviewStatus);
  if (preset === "unreviewed") return video.reviewStatus === "Open";
  if (preset === "session-incomplete") {
    return isSessionVideo(video) && (!video.canonical.scenario || !video.canonical.system
      || String(video.canonical.system).includes("Unknown") || !video.canonical.gmKpDl || !video.canonical.pl);
  }
  if (preset === "provisional") return Boolean(video.gmKpDlProvisional);
  if (preset === "related") return video.classification === "Related";
  if (preset === "deleted") return Boolean(video.deleted);
  if (preset === "low-quality") return video.quality === "Low";
  return true;
}

function applyReviewPreset(preset) {
  switchView("log");
  $("#reviewPreset").value = preset || "";
  $("#deletedFilter").checked = preset === "deleted";
  $("#filterPanel").classList.add("open");
  state.logPage = 1;
  renderLog();
}

function filteredVideos() {
  const query = normalize($("#globalSearch").value);
  const preset = $("#reviewPreset").value;
  const system = $("#systemFilter").value;
  const review = $("#reviewFilter").value;
  const quality = $("#qualityFilter").value;
  const classification = $("#classificationFilter").value;
  const subscribed = $("#subscribedFilter").checked;
  const owned = $("#ownedFilter").checked;
  const deleted = preset === "deleted" || $("#deletedFilter").checked;
  return sortVideosForDisplay(displayVideos().filter((video) => {
    const searchable = normalize([video.title, video.channelName, video.canonical.system, video.canonical.scenario, video.canonical.gmKpDl, video.canonical.pl].join(" "));
    return (deleted ? video.deleted : !video.deleted)
      && (!query || searchable.includes(query))
      && (!system || video.canonical.system === system)
      && (!review || video.reviewStatus === review)
      && (!quality || video.quality === quality)
      && (!classification || video.classification === classification)
      && matchesReviewPreset(video, preset)
      && (!subscribed || video.subscribed)
      && (!owned || isOwnedChannel(video));
  }));
}

function clearFilters() {
  $("#reviewPreset").value = "";
  $("#systemFilter").value = "";
  $("#reviewFilter").value = "";
  $("#qualityFilter").value = "";
  $("#classificationFilter").value = "";
  $("#subscribedFilter").checked = false;
  $("#ownedFilter").checked = false;
  $("#showOwnVideosFilter").checked = false;
  $("#deletedFilter").checked = false;
  state.includeOwnVideos = false;
  state.logPage = 1;
  renderAll();
}

function renderLog() {
  if (!state.videos.length) return;
  const videos = filteredVideos();
  const pages = Math.max(1, Math.ceil(videos.length / PAGE_SIZE));
  state.logPage = Math.min(state.logPage, pages);
  const start = (state.logPage - 1) * PAGE_SIZE;
  const pageRows = videos.slice(start, start + PAGE_SIZE);
  $("#logCount").textContent = `${fmt.format(availableVideos().length)}件中 ${fmt.format(videos.length)}件を表示${$("#deletedFilter").checked ? "（削除済み）" : ""}`;
  $("#logTableBody").innerHTML = pageRows.length ? pageRows.map(logRow).join("") : `<tr><td colspan="8"><div class="empty-state"><p><strong>一致する記録がありません</strong>検索語や絞り込み条件を変更してください。</p></div></td></tr>`;
  $$('[data-open-editor]', $("#logTableBody")).forEach((row) => row.addEventListener("click", () => openEditor(row.dataset.openEditor)));
  $$('[data-confirm-gm]', $("#logTableBody")).forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmProvisionalGm(state.videos.find((video) => video.id === button.dataset.confirmGm));
  }));
  renderPagination($("#logPagination"), state.logPage, pages, videos.length, (next) => { state.logPage = next; renderLog(); });
}

function logRow(video) {
  const date = shortDate(video.lastWatchedAt);
  const provisional = video.gmKpDlProvisional ? `<span class="provisional-badge">仮</span><button class="confirm-inline" type="button" data-confirm-gm="${video.id}">確定</button>` : "";
  const manualBadge = video.manualSource ? `<span class="manual-badge">${video.manualSource.status === "added" ? "手動追加" : "手動補完"}</span>` : "";
  const peopleCell = isSessionVideo(video)
    ? `<span class="cell-primary gm-cell">${escapeHtml(video.canonical.gmKpDl || "GM/KP/DL 不明")} ${provisional}</span><span class="cell-secondary">PL: ${escapeHtml(video.canonical.pl || "不明")}</span>`
    : `<span class="cell-primary">セッション情報なし</span><span class="cell-secondary">${video.relatedScenario ? `参照: ${escapeHtml(video.relatedScenario)}` : "Scenario該当なし"}</span>`;
  return `<tr class="${video.deleted ? "deleted-row" : ""}" data-open-editor="${video.id}"><td><span class="date-cell"><strong>${date.main}</strong>${date.sub}</span></td><td><span class="cell-primary">${escapeHtml(contentLabel(video))} ${manualBadge}</span><span class="cell-secondary">${escapeHtml(video.canonical.system || "System不明")} · ${escapeHtml(video.title)}</span></td><td>${peopleCell}</td><td><span class="cell-primary">${escapeHtml(video.channelName)}</span><span class="cell-secondary">${video.subscribed ? "登録チャンネル" : "未登録"}</span></td><td><span class="watch-count">▶ ${fmt.format(video.watchCount)}回</span></td><td><span class="pill ${video.deleted ? "excluded" : video.reviewStatus.toLowerCase()}">${video.deleted ? "Deleted" : escapeHtml(video.reviewStatus)}</span></td><td><span class="pill ${video.quality.toLowerCase()}">${escapeHtml(video.quality)}</span></td><td><button class="row-action" type="button" aria-label="編集">•••</button></td></tr>`;
}

function renderPagination(container, current, pages, count, onChange) {
  const start = count ? (current - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(current * PAGE_SIZE, count);
  container.innerHTML = `<span>${fmt.format(start)}–${fmt.format(end)} / ${fmt.format(count)}件</span><div class="pagination-controls"><button type="button" data-page="prev" ${current === 1 ? "disabled" : ""} aria-label="前のページ">‹</button><button type="button" disabled>${current} / ${pages}</button><button type="button" data-page="next" ${current === pages ? "disabled" : ""} aria-label="次のページ">›</button></div>`;
  $("[data-page='prev']", container)?.addEventListener("click", () => onChange(current - 1));
  $("[data-page='next']", container)?.addEventListener("click", () => onChange(current + 1));
}

function priorityInfo(video) {
  const missing = [];
  if (!video.canonical.scenario) missing.push("シナリオ不明");
  if (!video.canonical.system || video.canonical.system.includes("Unknown")) missing.push("System不明");
  if (!video.canonical.gmKpDl) missing.push("GM/KP/DL不足");
  else if (video.gmKpDlProvisional) missing.push("GM/KP/DL仮登録");
  if (!video.canonical.pl) missing.push("PL不足");
  if (!video.canonical.scenarioAuthor) missing.push("作者不明");
  if (!video.canonical.scenarioUrl) missing.push("配布URL不明");
  let priority = "Low";
  if (!video.canonical.scenario || video.classification === "Review") priority = "Critical";
  else if (!video.canonical.system || video.canonical.system.includes("Unknown") || !video.canonical.gmKpDl || video.gmKpDlProvisional || !video.canonical.pl) priority = "High";
  else if (!video.canonical.scenarioAuthor || !video.canonical.scenarioUrl) priority = "Medium";
  return { priority, missing };
}

function reviewItems() {
  return availableVideos().filter((video) => isSessionVideo(video) && ["Open", "Partial"].includes(video.reviewStatus)).sort((a, b) => {
    const ranks = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return ranks[priorityInfo(a).priority] - ranks[priorityInfo(b).priority] || String(b.lastWatchedAt).localeCompare(String(a.lastWatchedAt));
  });
}

function renderReview() {
  if (!state.videos.length) return;
  const all = reviewItems();
  const items = state.reviewPriority === "All" ? all : all.filter((v) => priorityInfo(v).priority === state.reviewPriority);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  state.reviewPage = Math.min(state.reviewPage, pages);
  const start = (state.reviewPage - 1) * PAGE_SIZE;
  $("#reviewQueue").innerHTML = items.slice(start, start + PAGE_SIZE).map((video) => {
    const info = priorityInfo(video);
    return `<article class="queue-card" data-review-id="${video.id}"><span class="queue-accent ${info.priority.toLowerCase()}"></span><div class="queue-copy"><div class="queue-top"><span class="priority ${info.priority.toLowerCase()}">${info.priority}</span><h3>${escapeHtml(video.canonical.scenario || "シナリオ不明")}</h3></div><div class="queue-meta"><span>System: ${escapeHtml(video.canonical.system || "不明")}</span><span>GM/KP: ${escapeHtml(video.canonical.gmKpDl || "不明")} ${video.gmKpDlProvisional ? '<span class="provisional-badge">仮</span>' : ""}</span><span>PL: ${escapeHtml(video.canonical.pl || "不明")}</span><span>${escapeHtml(video.channelName)}</span></div><p class="missing-list">不足: ${escapeHtml(info.missing.join(" / ") || "表記確認")}</p></div><span class="queue-open">確認する →</span></article>`;
  }).join("") || `<div class="panel empty-state"><p><strong>該当するレビューはありません</strong>別の優先度を選択してください。</p></div>`;
  $$('[data-review-id]').forEach((card) => card.addEventListener("click", () => openEditor(card.dataset.reviewId)));
  renderPagination($("#reviewPagination"), state.reviewPage, pages, items.length, (next) => { state.reviewPage = next; renderReview(); });
  const stats = reviewProgressStats();
  $("#reviewProgress").innerHTML = `<div class="progress-stat"><span>確認済み</span><strong>${fmt.format(stats.verified)}<small> / ${fmt.format(stats.total)}</small></strong></div><div class="progress-track"><div class="progress-fill" style="width:${stats.percent}%"></div></div><div class="review-progress-breakdown"><span>一部確認 ${fmt.format(stats.partial)}</span><span>未確認 ${fmt.format(stats.open)}</span>${stats.excluded ? `<span>対象外 ${fmt.format(stats.excluded)}</span>` : ""}</div><p class="source-note">Sessionのみ · 削除済み／対象外／自分の動画を分母から除外</p>`;
}

function compareEntityNames(a, b) {
  return a.name.localeCompare(b.name, ["ja", "en"], { numeric: true, sensitivity: "base" });
}

function sortEntityItems(items, mode) {
  return [...items].sort(mode === "name"
    ? compareEntityNames
    : (a, b) => b.sessions.size - a.sessions.size || compareEntityNames(a, b));
}

function aggregateScenarios() {
  const map = new Map();
  activeVideos().forEach((video) => {
    const name = video.canonical.scenario || video.scenarioMasterName || "シナリオ不明";
    const key = scenarioKey(video);
    if (!map.has(key)) map.set(key, { key, name, videos: [], sessions: new Set(), channels: new Set(), people: new Set(), watches: 0, systems: new Set() });
    const item = map.get(key);
    item.videos.push(video);
    if (video.sessionId) item.sessions.add(video.sessionId);
    if (video.channelName) item.channels.add(video.channelName);
    if (video.canonical.system) item.systems.add(video.canonical.system);
    [...splitPeople(video.canonical.gmKpDl), ...splitPeople(video.canonical.pl)].forEach((person) => item.people.add(person));
    item.watches += Number(video.watchCount || 0);
  });
  return [...map.values()];
}

function aggregateChannels() {
  const map = new Map();
  activeVideos().forEach((video) => {
    const name = video.channelName || "チャンネル不明";
    if (!map.has(name)) map.set(name, { name, channelId: video.channelId, videos: [], sessions: new Set(), scenarios: new Set(), watches: 0, subscribed: false, profile: channelProfileFor(video), metadata: channelMetadataFor(video) });
    const item = map.get(name);
    if (!item.channelId && video.channelId) item.channelId = video.channelId;
    if (!item.metadata) item.metadata = channelMetadataFor(video);
    item.videos.push(video);
    if (video.sessionId) item.sessions.add(video.sessionId);
    if (video.canonical.scenario) item.scenarios.add(video.canonical.scenario);
    item.watches += Number(video.watchCount || 0);
    item.subscribed ||= video.subscribed;
  });
  return [...map.values()];
}

function renderScenarios() {
  if (!state.videos.length) return;
  const query = normalize($("#scenarioSearch").value || $("#globalSearch").value);
  const items = sortEntityItems(aggregateScenarios().filter((item) => !query || normalize([item.name, ...item.people, ...item.channels].join(" ")).includes(query)), state.scenarioSort);
  if (!items.some((item) => item.key === state.selectedScenario)) state.selectedScenario = items[0]?.key || null;
  $("#scenarioList").innerHTML = items.slice(0, 400).map((item) => `<button class="entity-list-item ${item.key === state.selectedScenario ? "active" : ""}" type="button" data-scenario="${escapeHtml(item.key)}"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([...item.systems].join(" / ") || "System不明")} · ${fmt.format(item.videos.length)}動画</small></span><span class="entity-count">${fmt.format(item.sessions.size)}</span></button>`).join("") || `<div class="empty-state">一致するシナリオがありません</div>`;
  $$('[data-scenario]').forEach((button) => button.addEventListener("click", () => { state.selectedScenario = button.dataset.scenario; renderScenarios(); }));
  const selected = items.find((item) => item.key === state.selectedScenario);
  $("#scenarioDetail").innerHTML = selected ? scenarioDetail(selected) : emptyEntity("シナリオを選択してください");
  bindDetailVideoRows($("#scenarioDetail"));
}

function scenarioDetail(item) {
  return `<div class="entity-hero"><p class="eyebrow">SCENARIO DETAIL</p><h2>${escapeHtml(item.name)}</h2><p class="source-note">${escapeHtml([...item.systems].join(" / ") || "System不明")}</p></div>${entityKpis([["視聴卓", item.sessions.size], ["動画", item.videos.length], ["視聴イベント", item.watches], ["チャンネル", item.channels.size]])}<section class="detail-section"><h3>参加者</h3><div class="participant-chips">${[...item.people].slice(0, 30).map((person) => `<span class="participant-chip">${escapeHtml(person)}</span>`).join("") || "<span class='source-note'>参加者情報なし</span>"}</div></section>${watchedVideoTable(item.videos)}`;
}

function watchedVideoTable(videos) {
  const ordered = sortVideosForDisplay(videos);
  return `<section class="detail-section"><div class="detail-section-heading"><h3>視聴した卓と動画</h3><span class="source-note">全${fmt.format(ordered.length)}件・クリックして編集</span></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>視聴日</th><th>チャンネル</th><th>GM/KP/DL</th><th>PL</th><th>動画</th></tr></thead><tbody>${ordered.map((v) => `<tr data-detail-video="${v.id}" tabindex="0"><td>${dateLabel(v.lastWatchedAt)}</td><td>${escapeHtml(v.channelName)}</td><td>${escapeHtml(v.canonical.gmKpDl || "不明")}</td><td>${escapeHtml(v.canonical.pl || "不明")}</td><td>${escapeHtml(v.title)}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function renderChannels() {
  if (!state.videos.length) return;
  const query = normalize($("#channelSearch").value || $("#globalSearch").value);
  const items = sortEntityItems(aggregateChannels().filter((item) => !query || normalize([item.name, ...item.scenarios].join(" ")).includes(query)), state.channelSort);
  if (!items.some((item) => item.name === state.selectedChannel)) state.selectedChannel = items[0]?.name || null;
  $("#channelList").innerHTML = items.map((item) => {
    const imageUrl = item.profile?.imageUrl || item.metadata?.imageUrl;
    const icon = imageUrl ? `<img class="channel-list-icon" src="${escapeHtml(imageUrl)}" alt="" referrerpolicy="no-referrer">` : `<span class="channel-list-placeholder">${escapeHtml(item.name.slice(0, 1))}</span>`;
    return `<button class="entity-list-item channel-list-item ${item.name === state.selectedChannel ? "active" : ""}" type="button" data-channel="${escapeHtml(item.name)}">${icon}<span class="entity-list-copy"><strong>${escapeHtml(item.name)}</strong><small>${item.profile ? "所有チャンネル" : item.subscribed ? "登録チャンネル" : item.metadata?.statusKnown ? "未登録" : "登録状態未確認"} · ${fmt.format(item.scenarios.size)}シナリオ</small></span><span class="entity-count">${fmt.format(item.sessions.size)}</span></button>`;
  }).join("") || `<div class="empty-state">一致するチャンネルがありません</div>`;
  $$('[data-channel]').forEach((button) => button.addEventListener("click", () => { state.selectedChannel = button.dataset.channel; renderChannels(); }));
  const selected = items.find((item) => item.name === state.selectedChannel);
  $("#channelDetail").innerHTML = selected ? channelDetail(selected) : emptyEntity("チャンネルを選択してください");
  bindDetailVideoRows($("#channelDetail"));
}

function bindDetailVideoRows(container) {
  $$('[data-detail-video]', container).forEach((row) => {
    row.addEventListener("click", () => openEditor(row.dataset.detailVideo));
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openEditor(row.dataset.detailVideo);
    });
  });
}

function channelDetail(item) {
  const scenarioMap = new Map();
  item.videos.forEach((video) => {
    const name = video.canonical.scenario || "シナリオ不明";
    if (!scenarioMap.has(name)) scenarioMap.set(name, { videos: 0, sessions: new Set(), watches: 0, system: video.canonical.system });
    const row = scenarioMap.get(name);
    row.videos += 1;
    row.watches += Number(video.watchCount || 0);
    if (video.sessionId) row.sessions.add(video.sessionId);
  });
  const rows = [...scenarioMap.entries()].sort((a, b) => state.channelSort === "name"
    ? compareEntityNames({ name: a[0] }, { name: b[0] })
    : b[1].sessions.size - a[1].sessions.size || compareEntityNames({ name: a[0] }, { name: b[0] }));
  const profile = item.profile;
  const metadata = item.metadata;
  const channelUrl = profile ? `https://www.youtube.com/channel/${encodeURIComponent(profile.id)}` : item.videos.find((video) => video.channelUrl)?.channelUrl;
  const imageUrl = profile?.imageUrl || metadata?.imageUrl;
  const statusText = profile ? "所有チャンネル · Google Takeoutで確認" : metadata?.statusKnown ? `${metadata.subscribed ? "登録済みチャンネル" : "未登録チャンネル"} · YouTubeで確認` : item.subscribed ? "登録済みチャンネル" : "登録状態未確認";
  const profileMarkup = profile ? `<section class="detail-section takeout-profile"><div class="takeout-heading"><div><p class="eyebrow">GOOGLE TAKEOUT</p><h3>所有チャンネル情報</h3></div><span class="owned-badge">Channel ID一致</span></div><dl><div><dt>公開状態</dt><dd>${profile.visibility === "Public" ? "公開" : escapeHtml(profile.visibility || "不明")}</dd></div><div><dt>Vanity URL</dt><dd>${escapeHtml(profile.vanityUrl || "未設定")}</dd></div><div><dt>コメント既定値</dt><dd>${escapeHtml(commentPolicyLabel(profile.defaultComments))}</dd></div></dl></section>` : "";
  return `<div class="entity-hero channel-hero"><div class="channel-identity">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}のチャンネル画像" referrerpolicy="no-referrer">` : `<span class="channel-placeholder">${escapeHtml(item.name.slice(0, 1))}</span>`}<div><p class="eyebrow">CHANNEL DETAIL</p><h2>${escapeHtml(item.name)}</h2><p class="source-note">${escapeHtml(statusText)}${channelUrl ? ` · <a href="${escapeHtml(channelUrl)}" target="_blank" rel="noreferrer">YouTubeを開く ↗</a>` : ""}</p></div></div></div>${entityKpis([["視聴卓", item.sessions.size], ["動画", item.videos.length], ["シナリオ", item.scenarios.size], ["視聴イベント", item.watches]])}${profileMarkup}<section class="detail-section"><h3>シナリオ別の記録</h3><div class="table-wrap"><table class="detail-table"><thead><tr><th>シナリオ</th><th>System</th><th>卓</th><th>動画</th><th>視聴</th></tr></thead><tbody>${rows.map(([name, row]) => `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(row.system || "不明")}</td><td>${fmt.format(row.sessions.size)}</td><td>${fmt.format(row.videos)}</td><td>${fmt.format(row.watches)}</td></tr>`).join("")}</tbody></table></div></section>${watchedVideoTable(item.videos)}`;
}

function commentPolicyLabel(value) {
  const labels = {
    "Hold potentially inappropriate comments for review": "不適切な可能性のあるコメントを保留",
  };
  return labels[value] || value || "未設定";
}

function entityKpis(items) {
  return `<div class="entity-kpis">${items.map(([label, value]) => `<div class="entity-kpi"><span>${label}</span><strong>${fmt.format(value)}</strong></div>`).join("")}</div>`;
}

function emptyEntity(message) {
  return `<div class="empty-state"><p><strong>${escapeHtml(message)}</strong>左の一覧から項目を選ぶと詳細が表示されます。</p></div>`;
}

let addRecordFetchController = null;

function youtubeVideoIdFromUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (["youtu.be", "www.youtu.be"].includes(url.hostname)) return url.pathname.split("/").filter(Boolean)[0] || "";
    if (!url.hostname.endsWith("youtube.com")) return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    return url.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]+)/)?.[1] || "";
  } catch {
    return "";
  }
}

function inferSystemFromTitle(title) {
  const text = String(title || "").normalize("NFKC");
  if (/新クトゥルフ神話TRPG|CoC\s*7/i.test(text)) return "CoC7";
  if (/エモクロアTRPG/i.test(text)) return "エモクロア";
  if (/マーダーミステリー|マダミス/i.test(text)) return "マダミス";
  if (/CoC(?:TRPG)?|クトゥルフ神話TRPG|クトゥルフ/i.test(text)) return "CoC6";
  return "";
}

function inferScenarioFromTitle(title) {
  const text = String(title || "").normalize("NFKC").trim();
  const quoted = text.match(/(?:TRPG|CoC\s*[67]?|マダミス|マーダーミステリー)[^『「]{0,18}[『「]([^』」]+)[』」]/i);
  if (quoted) return quoted[1].trim();
  const withoutPrefix = text
    .replace(/^\s*[【\[][^】\]]*(?:TRPG|CoC|クトゥルフ|エモクロア|マダミス|マーダーミステリー)[^】\]]*[】\]]\s*/i, "")
    .replace(/^\s*(?:新?クトゥルフ神話TRPG|エモクロアTRPG|マーダーミステリー|マダミス|CoC\s*[67]?)\s*/i, "");
  const candidate = withoutPrefix.split(/\s*(?:[#＃]|[／/]\s*(?:PL|GM|KP|DL)|(?:PL|GM|KP|DL)\s*[:：])/i)[0]
    .replace(/^[『「【\[]|[』」】\]]$/g, "").trim();
  return candidate.length <= 80 ? candidate : "";
}

function inferRoleFromTitle(title, rolePattern) {
  const text = String(title || "").normalize("NFKC");
  const match = text.match(new RegExp(`(?:${rolePattern})\\s*[:：]\\s*([^#＃【】\\n]+)`, "i"));
  if (!match) return "";
  return match[1].split(/\s+(?=(?:GM|KP|DL|PL)\s*[:：])/i)[0].trim();
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function youtubeIdForVideo(video) {
  return video?.youtubeVideoId || youtubeVideoIdFromUrl(video?.url || "") || video?.id || "";
}

function findExistingVideoByYoutubeId(videoId) {
  return state.videos.find((video) => youtubeIdForVideo(video) === videoId) || null;
}

function localViewingRecordId(videoId) {
  let id;
  do {
    id = `LOCAL-${videoId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (state.videos.some((video) => video.id === id));
  return id;
}

function fillAddRecordForm({ videoId, metadata = null, existing = null }) {
  const form = $("#addRecordForm");
  const title = existing?.title || metadata?.title || "";
  const channelName = existing?.channelName || metadata?.author_name || "";
  const classification = existing?.classification || (/TRPG|CoC|クトゥルフ|エモクロア|マダミス|マーダーミステリー/i.test(title) ? "Session" : "Related");
  form.elements.url.value = `https://www.youtube.com/watch?v=${videoId}`;
  form.elements.videoId.value = videoId;
  form.elements.channelUrl.value = existing?.channelUrl || metadata?.author_url || "";
  form.elements.existingRecordId.value = existing?.id || "";
  form.elements.title.value = title;
  form.elements.channelName.value = channelName;
  form.elements.watchedAt.value = localDateValue();
  form.elements.system.value = existing?.canonical?.system || inferSystemFromTitle(title);
  form.elements.scenario.value = existing?.canonical?.scenario || (classification === "Session" ? inferScenarioFromTitle(title) : "");
  form.elements.gmKpDl.value = existing?.canonical?.gmKpDl || inferRoleFromTitle(title, "GM|KP|DL");
  form.elements.pl.value = existing?.canonical?.pl || inferRoleFromTitle(title, "PL");
  form.elements.classification.value = classification;
  form.elements.reviewStatus.value = existing?.reviewStatus || "Partial";
  form.elements.notes.value = existing ? "再視聴として追加" : "";
  $("#addPreviewTitle").textContent = title || "タイトルを手動入力してください";
  $("#addPreviewChannel").textContent = channelName || "チャンネル名を手動入力してください";
  const thumbnail = $("#addVideoThumbnail");
  thumbnail.src = metadata?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  thumbnail.hidden = false;
  $("#submitAddRecord").textContent = existing ? "本日の視聴として追加" : "この内容で本登録";
  form.hidden = false;
  return form;
}

function openAddRecordDialog() {
  addRecordFetchController?.abort();
  $("#addUrlForm").reset();
  $("#addRecordForm").reset();
  $("#addRecordForm").hidden = true;
  $("#submitAddRecord").textContent = "この内容で本登録";
  $("#addVideoThumbnail").hidden = true;
  $("#addFetchStatus").className = "fetch-status";
  $("#addFetchStatus").textContent = "URLを入力すると、動画タイトルとチャンネル情報を取得します。";
  $("#addRecordDialog").showModal();
  $("#addVideoUrl").focus();
}

function closeAddRecordDialog() {
  addRecordFetchController?.abort();
  if ($("#addRecordDialog").open) $("#addRecordDialog").close();
  const toast = $("#toast");
  if (toast.parentElement !== document.body) document.body.append(toast);
}

async function fetchNewRecordMetadata(event) {
  event.preventDefault();
  const url = String(new FormData(event.currentTarget).get("url") || "").trim();
  const videoId = youtubeVideoIdFromUrl(url);
  if (!videoId) return showToast("有効なYouTube動画URLを入力してください。");
  const existing = findExistingVideoByYoutubeId(videoId);
  if (existing) {
    const form = fillAddRecordForm({ videoId, existing });
    $("#addFetchStatus").className = "fetch-status warning";
    $("#addFetchStatus").textContent = `この動画は${dateLabel(existing.lastWatchedAt)}に登録済みです。既存情報を引き継ぎ、視聴日を本日にして別の視聴ログとして追加できます。`;
    showToast("登録済みの動画です。既存情報をフォームに表示しました。");
    form.elements.watchedAt.focus();
    return;
  }

  addRecordFetchController?.abort();
  addRecordFetchController = new AbortController();
  const timeout = setTimeout(() => addRecordFetchController.abort(), 12000);
  const button = $("#fetchVideoMetadata");
  button.disabled = true;
  button.textContent = "取得中…";
  $("#addFetchStatus").className = "fetch-status loading";
  $("#addFetchStatus").textContent = "YouTubeから公開情報を取得しています。";

  let metadata = null;
  let fetchError = null;
  const endpoints = [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
  ];
  try {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { signal: addRecordFetchController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const candidate = await response.json();
        if (candidate.title && candidate.author_name) {
          metadata = candidate;
          break;
        }
      } catch (error) {
        fetchError = error;
        if (error.name === "AbortError") break;
      }
    }
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = "情報を再取得";
  }

  const title = metadata?.title || "";
  const form = fillAddRecordForm({ videoId, metadata });
  $("#addFetchStatus").className = `fetch-status ${metadata ? "success" : "warning"}`;
  $("#addFetchStatus").textContent = metadata
    ? "自動取得しました。内容を確認・編集してから本登録してください。"
    : `公開情報を取得できませんでした。各項目を手動入力できます。${fetchError?.name === "AbortError" ? "（タイムアウト）" : ""}`;
  form.elements[metadata ? "scenario" : "title"].focus();
}

function registerNewRecord(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const videoId = String(form.get("videoId") || "");
  if (!videoId) return showToast("動画IDを確認できませんでした。");
  const existingRecordId = String(form.get("existingRecordId") || "");
  const existing = existingRecordId ? state.videos.find((video) => video.id === existingRecordId) : null;
  if (!existingRecordId && findExistingVideoByYoutubeId(videoId)) return showToast("登録状態が変わりました。URLからもう一度情報を取得してください。");
  if (existingRecordId && !existing) return showToast("元の登録データを確認できませんでした。URLからもう一度情報を取得してください。");
  const recordId = existing ? localViewingRecordId(videoId) : videoId;
  const title = String(form.get("title") || "").trim();
  const channelName = String(form.get("channelName") || "").trim();
  const watchedDate = String(form.get("watchedAt") || localDateValue());
  const canonical = {
    system: canonicalSystemName(String(form.get("system") || "").trim()),
    scenario: String(form.get("scenario") || "").trim(),
    gmKpDl: String(form.get("gmKpDl") || "").trim(),
    pl: String(form.get("pl") || "").trim(),
    scenarioUrl: existing?.canonical?.scenarioUrl || null,
    scenarioAuthor: existing?.canonical?.scenarioAuthor || null,
  };
  const knownChannel = state.channelMetadata.find((item) => item.name === channelName);
  const createdAt = new Date().toISOString();
  const completeFields = [canonical.system, canonical.scenario, canonical.gmKpDl, canonical.pl].filter(Boolean).length;
  const record = {
    ...(existing ? structuredClone(existing) : {}),
    id: recordId,
    youtubeVideoId: videoId,
    sessionId: existing?.sessionId || `LOCAL-${videoId}`,
    scenarioId: existing?.scenarioId || null,
    scenarioMasterName: existing?.scenarioMasterName || null,
    scenarioMappingSource: existing?.scenarioMappingSource || "Local registration",
    originalClassification: form.get("classification"),
    classification: form.get("classification"),
    classificationReason: "Local registration confirmed by user",
    channelId: knownChannel?.channelId || existing?.channelId || null,
    channelName,
    channelUrl: knownChannel ? `https://www.youtube.com/channel/${knownChannel.channelId}` : String(form.get("channelUrl") || existing?.channelUrl || ""),
    subscribed: knownChannel ? Boolean(knownChannel.statusKnown && knownChannel.subscribed) : Boolean(existing?.subscribed),
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    watchCount: 1,
    firstWatchedAt: `${watchedDate} 12:00:00`,
    lastWatchedAt: `${watchedDate} 12:00:00`,
    publishedAt: existing?.publishedAt || null,
    description: existing?.description || null,
    tags: existing?.tags || null,
    reviewStatus: form.get("reviewStatus"),
    quality: completeFields === 4 ? "High" : completeFields >= 2 ? "Medium" : "Low",
    reviewReason: existing ? "登録済み動画を再視聴として追加" : "URLから新規登録",
    notes: String(form.get("notes") || "").trim(),
    raw: existing?.raw ? structuredClone(existing.raw) : { system: canonical.system, scenario: canonical.scenario, gm: canonical.gmKpDl, kp: null, dl: null, pl: canonical.pl, cast: null, scenarioUrl: null, scenarioAuthor: null },
    parsed: { ...canonical },
    canonical: { ...canonical },
    source: { ...(existing?.source || {}), system: "URL auto-fetch / user confirmation", scenario: "URL auto-fetch / user confirmation", gmKpDl: "URL auto-fetch / user confirmation", pl: "URL auto-fetch / user confirmation", scenarioUrl: existing?.source?.scenarioUrl || "Missing", scenarioAuthor: existing?.source?.scenarioAuthor || "Missing" },
    deleted: false,
    localEntry: { createdAt, source: existing ? "Repeat viewing registration" : "YouTube URL registration", originalRecordId: existing?.id || null },
  };
  delete record.baseCanonical;
  delete record.baseSource;
  delete record.gmKpDlProvisional;
  state.overrides.customRecords.push(structuredClone(record));
  state.overrides.edits.push({ videoId: recordId, field: "*", oldValue: null, newValue: "local record", editedAt: createdAt, note: existing ? "Repeat viewing log registered" : "New viewing log registered" });
  state.videos.push(applySavedOverride(record));
  persistOverrides();
  populateFilters();
  updateDatasetVersion();
  state.logPage = 1;
  closeAddRecordDialog();
  switchView("log");
  renderAll();
  showToast(existing ? "本日の視聴ログとして追加し、集計へ反映しました。" : "視聴データを本登録し、すべての集計へ反映しました。");
}

function openEditor(id) {
  const video = state.videos.find((item) => item.id === id);
  if (!video) return;
  const saved = state.overrides.records[id] || {};
  $("#editorTitle").textContent = contentLabel(video);
  $("#editorContent").innerHTML = editorMarkup(video, saved);
  $("#drawerBackdrop").hidden = false;
  $("#editorDrawer").classList.add("open");
  $("#editorDrawer").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $("#editorForm").addEventListener("submit", (event) => saveEditor(event, video));
  $("#resetOverride").addEventListener("click", () => resetOverride(video));
  $("#confirmPlaceholderGm")?.addEventListener("click", () => confirmProvisionalGm(video));
  $("#deleteRecord")?.addEventListener("click", (event) => openDeleteConfirmation(video, event.currentTarget, event));
  $("#restoreRecord")?.addEventListener("click", () => restoreVideo(video));
}

function editorMarkup(video, saved) {
  const base = video.baseCanonical;
  const parsed = video.parsed;
  const manualRows = video.manualSource?.rows.map((row) => typeof row === "string" ? row : `${row.sheet}!${row.row}`) || [];
  const manualNotice = video.manualSource ? `<div class="manual-notice"><span class="manual-badge">${video.manualSource.status === "added" ? "手動追加" : "手動補完"}</span><span>出典: 視聴済配信リスト_感想トラッカー.xlsx（${manualRows.map(escapeHtml).join("、")}）</span></div>` : "";
  const videoLink = video.url ? `<p class="source-note"><a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">YouTubeで動画を開く ↗</a></p>` : "";
  const provisionalNotice = video.gmKpDlProvisional ? `<div class="provisional-notice"><div><span class="provisional-badge">仮</span><strong>GM / KP / DLをチャンネル主で仮登録</strong><p>「${escapeHtml(video.channelName)}」から人物名「${escapeHtml(video.canonical.gmKpDl)}」を候補として表示しています。</p></div><button id="confirmPlaceholderGm" class="button secondary" type="button">このGMで確定</button></div>` : "";
  const recordAction = video.deleted
    ? `<button id="restoreRecord" class="button secondary" type="button">削除を取り消す</button>`
    : `<button id="deleteRecord" class="button danger" type="button">視聴ログから削除</button>`;
  return `<div class="evidence-block"><h3>Evidence</h3><div class="evidence-title">${escapeHtml(video.title)}</div>${video.description ? `<pre class="evidence-description">${escapeHtml(video.description)}</pre>` : `<p class="source-note">概要欄メタデータは未保存です。タイトルと既存抽出値を根拠に表示しています。</p>`}${videoLink}</div>${manualNotice}<div class="layer-grid"><div class="layer-card"><span>Raw / Existing</span><strong>${escapeHtml(video.raw.scenario || "なし")}</strong></div><div class="layer-card"><span>Parsed</span><strong>${escapeHtml(parsed.scenario || "なし")}</strong></div><div class="layer-card"><span>Canonical</span><strong>${escapeHtml(video.canonical.scenario || "該当なし")}</strong></div></div>${provisionalNotice}<form id="editorForm" class="editor-form"><div class="editor-pair">${editorField("system", "System", saved.system, base.system, video.source.system)}${editorField("scenario", "Scenario", saved.scenario, base.scenario, video.source.scenario)}</div><div class="editor-pair">${editorField("gmKpDl", "GM / KP / DL", video.canonical.gmKpDl, base.gmKpDl, video.source.gmKpDl)}${editorField("pl", "PL", saved.pl, base.pl, video.source.pl)}</div><div class="editor-pair">${editorField("scenarioAuthor", "Scenario Author", saved.scenarioAuthor, base.scenarioAuthor, video.source.scenarioAuthor)}${editorField("scenarioUrl", "Scenario URL", saved.scenarioUrl, base.scenarioUrl, video.source.scenarioUrl, "url")}</div><div class="editor-pair"><label class="editor-field"><span>カウント区分 <em>Session＝卓として集計</em></span><select name="classification">${selectOptions(["Session", "Review", "Related", "Non-TRPG"], saved.classification || video.classification)}</select></label><label class="editor-field"><span>関連動画種別 <em>Related用</em></span><select name="relatedType">${selectOptions(["", "雑談・感想", "企画・バラエティ", "紹介・告知", "解説・ガイド", "映像・朗読", "その他の関連動画"], saved.relatedType ?? video.relatedType ?? "")}</select></label></div><label class="editor-field"><span>Review Status <em>手動</em></span><select name="reviewStatus">${selectOptions(["Open", "Partial", "Verified", "Corrected", "Excluded"], saved.reviewStatus || video.reviewStatus)}</select></label><label class="editor-field"><span>メモ <em>このブラウザに保存</em></span><textarea name="notes" placeholder="修正理由や確認内容">${escapeHtml(saved.notes ?? video.notes ?? "")}</textarea></label><p class="source-note">卓数・シナリオ・チャンネル集計に含まれるのはカウント区分がSessionの記録だけです。RelatedではScenarioを該当なしとして扱い、関連動画種別で内容を整理します。</p><div class="editor-actions">${recordAction}<span class="editor-action-spacer"></span><button id="resetOverride" class="button ghost" type="button">Overrideを解除</button><button class="button primary" type="submit">修正を保存</button></div></form>`;
}

function editorField(name, label, value, placeholder, source, type = "text") {
  return `<label class="editor-field"><span>${label}<em>現在: ${escapeHtml(source || "Missing")}</em></span><input name="${name}" type="${type}" value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(placeholder || "未設定")}"></label>`;
}

function selectOptions(values, current) {
  return values.map((value) => `<option ${value === current ? "selected" : ""}>${value}</option>`).join("");
}

function saveEditor(event, video) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const previous = state.overrides.records[video.id] || {};
  const next = {
    system: canonicalSystemName(String(form.get("system") || "").trim()),
    scenario: String(form.get("scenario") || "").trim(),
    gmKpDl: String(form.get("gmKpDl") || "").trim(),
    pl: String(form.get("pl") || "").trim(),
    scenarioAuthor: String(form.get("scenarioAuthor") || "").trim(),
    scenarioUrl: String(form.get("scenarioUrl") || "").trim(),
    classification: form.get("classification"),
    relatedType: String(form.get("relatedType") || "").trim(),
    reviewStatus: form.get("reviewStatus"),
    notes: String(form.get("notes") || "").trim(),
    gmKpDlConfirmed: Boolean(String(form.get("gmKpDl") || "").trim()),
    deleted: Boolean(previous.deleted),
    deletedAt: previous.deletedAt || null,
    editedAt: new Date().toISOString(),
  };
  state.overrides.records[video.id] = next;
  Object.keys(next).forEach((field) => {
    if (field !== "editedAt" && previous[field] !== next[field]) state.overrides.edits.push({ videoId: video.id, field, oldValue: previous[field] ?? null, newValue: next[field], editedAt: next.editedAt });
  });
  persistOverrides();
  applyOverrideToVideo(video, next);
  closeEditor();
  renderAll();
  showToast("修正を保存し、Canonical値と集計を更新しました。");
}

function applyOverrideToVideo(video, saved) {
  video.canonical = { ...video.baseCanonical };
  video.source = { ...video.baseSource };
  ["system", "scenario", "gmKpDl", "pl", "scenarioUrl", "scenarioAuthor"].forEach((field) => {
    if (saved[field]) {
      video.canonical[field] = field === "system" ? canonicalSystemName(saved[field]) : saved[field];
      video.source[field] = "Override";
    }
  });
  video.classification = video.curatedRelated ? "Related" : saved.classification || video._sourceClassification;
  video.relatedType = video.curatedRelated ? video._sourceRelatedType : saved.relatedType ?? video._sourceRelatedType;
  if (video.classification === "Related") {
    video.canonical.system = "その他";
    video.canonical.scenario = "";
    video.source.system = "Content type: non-session related content";
    video.source.scenario = "Not applicable: Related";
  }
  video.reviewStatus = saved.reviewStatus || video._sourceReviewStatus;
  video.notes = saved.notes || "";
  video.deleted = saved.deleted !== undefined ? Boolean(saved.deleted) : video._sourceDeleted;
  video.deletedAt = saved.deletedAt !== undefined ? saved.deletedAt : video._sourceDeletedAt;
  applyGmPlaceholder(video, saved);
}

function confirmProvisionalGm(video) {
  if (!video || !video.gmKpDlProvisional || !video.canonical.gmKpDl) return;
  const previous = state.overrides.records[video.id] || {};
  const editedAt = new Date().toISOString();
  const next = { ...previous, gmKpDl: video.canonical.gmKpDl, gmKpDlConfirmed: true, editedAt };
  state.overrides.records[video.id] = next;
  state.overrides.edits.push({ videoId: video.id, field: "gmKpDlConfirmed", oldValue: false, newValue: true, editedAt, note: "Channel owner placeholder confirmed" });
  persistOverrides();
  applyOverrideToVideo(video, next);
  closeEditor();
  renderAll();
  showToast(`GM / KP / DLを「${video.canonical.gmKpDl}」で確定しました。`);
}

let pendingDeleteVideo = null;
let deleteConfirmReturnFocus = null;

function openDeleteConfirmation(video, trigger, pointerEvent) {
  if (!video) return;
  const dialog = $("#deleteConfirmDialog");
  const confirmButton = $("#confirmDeleteRecord");
  pendingDeleteVideo = video;
  deleteConfirmReturnFocus = trigger || document.activeElement;
  $("#deleteConfirmVideo").textContent = contentLabel(video) || video.title || "選択した視聴ログ";

  const triggerRect = trigger?.getBoundingClientRect();
  const targetX = Number.isFinite(pointerEvent?.clientX) && pointerEvent.clientX > 0
    ? pointerEvent.clientX
    : (triggerRect?.left || window.innerWidth / 2) + (triggerRect?.width || 0) / 2;
  const targetY = Number.isFinite(pointerEvent?.clientY) && pointerEvent.clientY > 0
    ? pointerEvent.clientY
    : (triggerRect?.top || window.innerHeight / 2) + (triggerRect?.height || 0) / 2;

  dialog.style.visibility = "hidden";
  dialog.style.left = "0px";
  dialog.style.top = "0px";
  dialog.showModal();

  const dialogRect = dialog.getBoundingClientRect();
  const confirmRect = confirmButton.getBoundingClientRect();
  const confirmCenterX = confirmRect.left - dialogRect.left + confirmRect.width / 2;
  const confirmCenterY = confirmRect.top - dialogRect.top + confirmRect.height / 2;
  const gutter = 12;
  const left = Math.min(Math.max(gutter, targetX - confirmCenterX), window.innerWidth - dialogRect.width - gutter);
  const top = Math.min(Math.max(gutter, targetY - confirmCenterY), window.innerHeight - dialogRect.height - gutter);
  dialog.style.left = `${Math.max(gutter, left)}px`;
  dialog.style.top = `${Math.max(gutter, top)}px`;
  dialog.style.visibility = "visible";
  requestAnimationFrame(() => confirmButton.focus({ preventScroll: true }));
}

function closeDeleteConfirmation() {
  const dialog = $("#deleteConfirmDialog");
  if (dialog.open) dialog.close();
  const returnFocus = deleteConfirmReturnFocus;
  pendingDeleteVideo = null;
  deleteConfirmReturnFocus = null;
  returnFocus?.focus({ preventScroll: true });
}

function confirmDeleteVideo() {
  const video = pendingDeleteVideo;
  if (!video) return;
  const dialog = $("#deleteConfirmDialog");
  if (dialog.open) dialog.close();
  pendingDeleteVideo = null;
  deleteConfirmReturnFocus = null;
  deleteVideo(video);
}

function deleteVideo(video) {
  if (!video) return;
  const previous = state.overrides.records[video.id] || {};
  const editedAt = new Date().toISOString();
  const next = { ...previous, deleted: true, deletedAt: editedAt, editedAt };
  state.overrides.records[video.id] = next;
  state.overrides.edits.push({ videoId: video.id, field: "deleted", oldValue: Boolean(previous.deleted), newValue: true, editedAt, note: "Not actually watched" });
  persistOverrides();
  applyOverrideToVideo(video, next);
  closeEditor();
  renderAll();
  showToast("視聴ログから削除しました。絞り込みの「削除済みを表示」から戻せます。");
}

function restoreVideo(video) {
  if (!video) return;
  const previous = state.overrides.records[video.id] || {};
  const editedAt = new Date().toISOString();
  const next = { ...previous, deleted: false, deletedAt: null, editedAt };
  state.overrides.records[video.id] = next;
  state.overrides.edits.push({ videoId: video.id, field: "deleted", oldValue: true, newValue: false, editedAt, note: "Deletion restored" });
  persistOverrides();
  applyOverrideToVideo(video, next);
  closeEditor();
  renderAll();
  showToast("削除を取り消し、視聴ログへ戻しました。");
}

function resetOverride(video) {
  if (!state.overrides.records[video.id]) {
    showToast("この記録にはOverrideがありません。");
    return;
  }
  delete state.overrides.records[video.id];
  state.overrides.edits.push({ videoId: video.id, field: "*", oldValue: "override", newValue: null, editedAt: new Date().toISOString(), note: "Override reset" });
  persistOverrides();
  video.canonical = { ...video.baseCanonical };
  video.source = { ...video.baseSource };
  video.classification = video._sourceClassification || video.classification;
  video.relatedType = video._sourceRelatedType || "";
  video.reviewStatus = video._sourceReviewStatus || "Open";
  video.notes = "";
  video.deleted = video._sourceDeleted;
  video.deletedAt = video._sourceDeletedAt;
  applyGmPlaceholder(video);
  closeEditor();
  renderAll();
  showToast("Overrideを解除しました。");
}

function persistOverrides() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.overrides));
}

function closeEditor() {
  $("#editorDrawer").classList.remove("open");
  $("#editorDrawer").setAttribute("aria-hidden", "true");
  $("#drawerBackdrop").hidden = true;
  document.body.style.overflow = "";
}

function backupOverrides() {
  downloadBlob(new Blob([JSON.stringify({ app: "TRPG配信ログキーパー", version: 2, exportedAt: new Date().toISOString(), ...state.overrides }, null, 2)], { type: "application/json" }), `trpg-log-keeper-backup-${todayStamp()}.json`);
  showToast("修正データのバックアップを書き出しました。");
}

async function copyBackupToClipboard() {
  const payload = { app: "TRPG配信ログキーパー", version: 2, exportedAt: new Date().toISOString(), ...state.overrides };
  const json = JSON.stringify(payload, null, 2);
  $("#backupPayload").textContent = json;
  try {
    await navigator.clipboard.writeText(json);
    showToast("ブラウザ内の修正データをクリップボードへコピーしました。");
  } catch {
    showToast("コピーできませんでした。バックアップ書き出しをご利用ください。");
  }
}

function unifiedExportRecord(video) {
  return {
    id: video.id,
    youtubeVideoId: video.youtubeVideoId || video.id,
    title: video.title || "",
    url: video.url || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : ""),
    classification: video.classification || "",
    relatedType: video.relatedType || null,
    relatedScenario: video.relatedScenario || null,
    deleted: Boolean(video.deleted),
    sessionId: video.sessionId || null,
    scenarioId: video.scenarioId || null,
    scenarioMasterName: video.scenarioMasterName || null,
    watchCount: Number(video.watchCount || 0),
    firstWatchedAt: video.firstWatchedAt || null,
    lastWatchedAt: video.lastWatchedAt || null,
    publishedAt: video.publishedAt || null,
    channel: {
      id: video.channelId || null,
      name: video.channelName || "チャンネル不明",
      url: video.channelUrl || null,
      subscribed: Boolean(video.subscribed),
      owned: isOwnedChannel(video),
      ownChannel: isOwnChannelVideo(video),
    },
    canonical: {
      system: canonicalSystemName(video.canonical?.system || null),
      scenario: video.canonical?.scenario || null,
      gmKpDl: video.canonical?.gmKpDl || null,
      pl: video.canonical?.pl || null,
      scenarioUrl: video.canonical?.scenarioUrl || null,
      scenarioAuthor: video.canonical?.scenarioAuthor || null,
    },
    provenance: {
      reviewStatus: video.reviewStatus || null,
      quality: video.quality || null,
      source: video.source || {},
      notes: video.notes || "",
      gmKpDlProvisional: Boolean(video.gmKpDlProvisional),
    },
  };
}

function buildUnifiedExportPayload() {
  const videos = state.videos.map(unifiedExportRecord);
  const activeSessions = videos.filter((video) => !video.deleted && video.classification === "Session" && video.provenance.reviewStatus !== "Excluded");
  return {
    app: "TRPG配信ログキーパー",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    datasetGeneratedAt: state.generatedAt || null,
    stats: {
      videos: videos.length,
      activeSessionVideos: activeSessions.length,
      watchEvents: activeSessions.reduce((sum, video) => sum + video.watchCount, 0),
      scenarios: new Set(activeSessions.map((video) => video.scenarioId || video.canonical.scenario).filter(Boolean)).size,
      channels: new Set(activeSessions.map((video) => video.channel.name).filter(Boolean)).size,
      deletedVideos: videos.filter((video) => video.deleted).length,
    },
    videos,
  };
}

async function syncUnifiedExportWithMcp(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch("http://127.0.0.1:4783/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function exportUnifiedJson() {
  const payload = buildUnifiedExportPayload();
  const json = JSON.stringify(payload, null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `trpg-log-keeper-unified-${todayStamp()}.json`);
  const synced = await syncUnifiedExportWithMcp(payload);
  showToast(synced
    ? `${fmt.format(payload.videos.length)}件の統合JSONを書き出し、MCPへ同期しました。`
    : `${fmt.format(payload.videos.length)}件の統合JSONを書き出しました。`);
}

async function restoreOverrides(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed.records || !parsed.edits) throw new Error("形式が異なります");
    state.overrides = { records: parsed.records, edits: parsed.edits, customRecords: Array.isArray(parsed.customRecords) ? parsed.customRecords : [] };
    persistOverrides();
    location.reload();
  } catch (error) {
    showToast(`復元できませんでした: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function exportRows() {
  return filteredVideos().map((video) => ({
    last_watched_at: video.lastWatchedAt,
    canonical_system: video.canonical.system,
    canonical_scenario: video.canonical.scenario,
    canonical_gm_kp_dl: video.canonical.gmKpDl,
    gm_kp_dl_provisional: video.gmKpDlProvisional,
    canonical_pl: video.canonical.pl,
    channel_name: video.channelName,
    published_at: video.publishedAt,
    watch_count: video.watchCount,
    review_status: video.reviewStatus,
    metadata_quality: video.quality,
    classification: video.classification,
    related_type: video.relatedType || "",
    related_scenario_reference: video.relatedScenario || "",
    subscribed_channel: video.subscribed,
    owned_channel: isOwnedChannel(video),
    channel_id: video.channelId,
    video_title: video.title,
    video_url: video.url,
    video_id: video.id,
    session_group_id: video.sessionId,
  }));
}

function exportData(format) {
  const rows = exportRows();
  if (!rows.length) return showToast("出力できる記録がありません。");
  const stamp = todayStamp();
  if (format === "json") {
    downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }), `trpg-viewing-log-${stamp}.json`);
  } else if (format === "csv") {
    const headers = Object.keys(rows[0]);
    const csv = "\ufeff" + [headers, ...rows.map((row) => headers.map((key) => row[key]))].map((line) => line.map(csvCell).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `trpg-viewing-log-${stamp}.csv`);
  } else {
    exportXlsx(rows, `trpg-viewing-log-${stamp}.xlsx`);
  }
  $(".export-menu").removeAttribute("open");
  showToast(`${fmt.format(rows.length)}件を${format.toUpperCase()}で書き出しました。`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function todayStamp() {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportXlsx(rows, filename) {
  const headers = Object.keys(rows[0]);
  const table = [headers, ...rows.map((row) => headers.map((key) => row[key]))];
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${headers.map((header, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(42, Math.max(11, header.length + 3))}" customWidth="1"/>`).join("")}</cols><sheetData>${table.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => xlsxCell(value, r + 1, c + 1, r === 0)).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:${columnName(headers.length)}${table.length}"/></worksheet>`;
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Viewing Log" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF245E57"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`,
    "xl/worksheets/sheet1.xml": sheetXml,
  };
  downloadBlob(createZip(files), filename);
}

function xlsxCell(value, row, column, header) {
  const ref = `${columnName(column)}${row}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"${header ? ' s="1"' : ""}><v>${value}</v></c>`;
  const text = value === true ? "TRUE" : value === false ? "FALSE" : String(value ?? "");
  return `<c r="${ref}" t="inlineStr"${header ? ' s="1"' : ""}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) { index -= 1; name = String.fromCharCode(65 + index % 26) + name; index = Math.floor(index / 26); }
  return name;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function createZip(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  });
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centrals.length, true);
  endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => { crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8); });
  return (crc ^ 0xffffffff) >>> 0;
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  const topLayer = [$("#deleteConfirmDialog"), $("#addRecordDialog")].find((dialog) => dialog?.open);
  if (topLayer && toast.parentElement !== topLayer) topLayer.append(toast);
  if (!topLayer && toast.parentElement !== document.body) document.body.append(toast);
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    if (toast.parentElement !== document.body) document.body.append(toast);
  }, 4200);
}

initialize().catch((error) => {
  console.error(error);
  $("#mainContent").innerHTML = `<section class="panel empty-state"><p><strong>データを読み込めませんでした</strong>${escapeHtml(error.message)}<br>READMEの手順どおり、HTTPサーバーから開いてください。</p></section>`;
});
