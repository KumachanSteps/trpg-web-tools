/* ============================================================
   星図 Editor Data Layer v1.4

   Data priority:
   1. Unsynced local draft
   2. Firestore cloud data
   3. published-data.js fallback

   Editor writes locally first, then syncs to Firestore when an authorized
   Google account is connected. This prevents data loss during network errors.
   ============================================================ */

window.STAR_MAP_PUBLISHED_DATA = window.STAR_MAP_PUBLISHED_DATA || {
  version: 1,
  updatedAt: "",
  events: [],
  ownedScenarios: [],
  scenarioOverrides: []
};

(() => {
  const DRAFT_KEY = "kuma-star-map-editor-draft-v1";
  const LEGACY_EVENT_KEY = "kuma-star-map-events-v1";
  let cloudData = null;
  let syncSequence = 0;

  const clone = value => JSON.parse(JSON.stringify(value));

  function cleanData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      version: 1,
      updatedAt: String(source.updatedAt || ""),
      events: Array.isArray(source.events) ? source.events.filter(Boolean) : [],
      ownedScenarios: Array.isArray(source.ownedScenarios) ? source.ownedScenarios.filter(Boolean) : [],
      scenarioOverrides: Array.isArray(source.scenarioOverrides) ? source.scenarioOverrides.filter(Boolean) : []
    };
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? cleanData(JSON.parse(raw)) : null;
    } catch (error) {
      console.warn("Editor draft could not be loaded.", error);
      return null;
    }
  }

  function readLegacyEvents() {
    try {
      const rows = JSON.parse(localStorage.getItem(LEGACY_EVENT_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch (_error) {
      return [];
    }
  }

  function publishedData() {
    return cleanData(window.STAR_MAP_PUBLISHED_DATA);
  }

  function activeData() {
    const draft = readDraft();
    if (draft) return draft;
    if (cloudData) return cleanData(cloudData);
    const published = publishedData();
    const legacyEvents = readLegacyEvents();
    if (legacyEvents.length && !published.events.length) return { ...published, events: legacyEvents };
    return published;
  }

  function dispatch(data, source = "local") {
    window.dispatchEvent(new CustomEvent("star-map-data-changed", {
      detail: { ...clone(data), source }
    }));
  }

  function writeLocalDraft(next) {
    const clean = cleanData(next);
    clean.updatedAt = new Date().toISOString();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(clean));
    localStorage.removeItem(LEGACY_EVENT_KEY);
    dispatch(clean, "local-draft");
    return clean;
  }

  async function syncDraftToCloud(clean) {
    const cloud = window.StarMapCloud;
    const state = cloud?.getState?.();
    if (!cloud || !state?.configured || !state?.authorized) return clean;

    const requestId = ++syncSequence;
    window.dispatchEvent(new CustomEvent("star-map-sync-status", {
      detail: { status: "syncing", message: "Firestoreへ保存中…" }
    }));
    try {
      const saved = cleanData(await cloud.saveData(clean));
      if (requestId !== syncSequence) return saved;
      cloudData = saved;
      localStorage.removeItem(DRAFT_KEY);
      dispatch(saved, "cloud-save");
      window.dispatchEvent(new CustomEvent("star-map-sync-status", {
        detail: { status: "saved", message: "Firestoreへ保存しました。" }
      }));
      return saved;
    } catch (error) {
      console.error("Cloud save failed. Local draft retained.", error);
      window.dispatchEvent(new CustomEvent("star-map-sync-status", {
        detail: { status: "error", message: `Cloud保存失敗：${error.message || error}` }
      }));
      return clean;
    }
  }

  function writeDraft(next) {
    const clean = writeLocalDraft(next);
    void syncDraftToCloud(clean);
    return clean;
  }

  function ensureDraft() {
    return readDraft() || writeLocalDraft(activeData());
  }

  function fileSafeJson(value) {
    return JSON.stringify(value, null, 2).replace(/<\//g, "<\\/");
  }

  function downloadText(filename, text, type = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  window.applyStarMapCloudData = raw => {
    cloudData = cleanData(raw);
    if (!readDraft()) dispatch(cloudData, "cloud-read");
  };

  window.getStarMapData = () => clone(activeData());
  window.getStarMapEvents = () => clone(activeData().events);
  window.getOwnedScenarios = () => clone(activeData().ownedScenarios);
  window.getScenarioOverrides = () => clone(activeData().scenarioOverrides);
  window.hasStarMapDraft = () => Boolean(readDraft());

  window.updateStarMapEvents = events => {
    const draft = ensureDraft();
    draft.events = Array.isArray(events) ? events : [];
    return writeDraft(draft);
  };

  window.updateOwnedScenarios = scenarios => {
    const draft = ensureDraft();
    draft.ownedScenarios = Array.isArray(scenarios) ? scenarios : [];
    return writeDraft(draft);
  };

  window.updateScenarioOverrides = overrides => {
    const draft = ensureDraft();
    draft.scenarioOverrides = Array.isArray(overrides) ? overrides : [];
    return writeDraft(draft);
  };

  window.replaceStarMapData = data => writeDraft(cleanData(data));

  window.pushStarMapDraftToCloud = async () => {
    const data = readDraft() || activeData();
    return syncDraftToCloud(data);
  };

  window.resetStarMapDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LEGACY_EVENT_KEY);
    dispatch(activeData(), cloudData ? "cloud-read" : "published");
  };

  window.exportStarMapPublishFile = () => {
    const data = activeData();
    const content = `/* Publicly deployed calendar and manual scenario data. */\nwindow.STAR_MAP_PUBLISHED_DATA = ${fileSafeJson(data)};\n`;
    downloadText("published-data.js", content, "text/javascript;charset=utf-8");
  };

  window.exportStarMapBackup = () => {
    downloadText("kuma-star-map-editor-backup.json", fileSafeJson(activeData()), "application/json;charset=utf-8");
  };

  window.importStarMapBackup = async file => {
    const parsed = JSON.parse(await file.text());
    return writeDraft(cleanData(parsed));
  };
})();
