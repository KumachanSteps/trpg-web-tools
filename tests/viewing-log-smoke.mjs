import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("tools/viewing-log/index.html", root), "utf8");
const shell = readFileSync(new URL("shared/hub/shell.js", root), "utf8");
const app = readFileSync(new URL("tools/viewing-log/app.js", root), "utf8");
const backupManager = readFileSync(new URL("tools/viewing-log/backup-manager.js", root), "utf8");
const dataSource = readFileSync(new URL("tools/viewing-log/data/videos-data.js", root), "utf8");
const payload = JSON.parse(readFileSync(new URL("tools/viewing-log/data/videos.json", root), "utf8"));

const context = vm.createContext({ window: {} });
vm.runInContext(dataSource, context);
const embedded = context.window.TRPG_DATA;

if (!html.includes('data-hub-tool="watch"') || !html.includes('id="reviewPreset"')) {
  throw new Error("Viewing-log shell or review presets are missing");
}
if (!shell.includes('{ id: "watch", name: "配信視聴ログ", icon: "▶", url: "../viewing-log/index.html" }')) {
  throw new Error("The shared tool rail does not link to the viewing log");
}
if (!app.includes("matchesReviewPreset") || !app.includes("applyReviewPreset")) {
  throw new Error("Review queue was not migrated to log filter presets");
}
if (!app.includes('$$(".view-switcher [data-view]")')) {
  throw new Error("Viewing database switcher is not wired");
}
for (const required of ['class="site-header"', 'id="kpiGrid"', 'id="backupPanel"', 'class="view-switcher"', 'data-view="log"', 'data-view="scenarios"', 'data-view="channels"']) {
  if (!html.includes(required)) throw new Error(`Paper viewing-log layout is missing: ${required}`);
}
if (html.includes('id="dashboardView"') || html.includes('id="reviewView"') || html.includes('class="utility-strip"') || !backupManager.includes("showDirectoryPicker")) {
  throw new Error("The viewing-log page still has legacy panels or lacks automatic backup support");
}
if (payload.videos.length !== 2399 || embedded?.videos?.length !== payload.videos.length) {
  throw new Error("The migrated viewing-log dataset is incomplete");
}
if (payload.viewingLogSalvageImport?.addedVideos !== 13 || payload.viewingLogSalvageImport?.uniqueVideoIds !== 1704) {
  throw new Error("The 2026-10-22 salvage metadata is inconsistent");
}

const active = payload.videos.filter((video) => !video.deleted);
const latest = active.map((video) => video.lastWatchedAt).filter(Boolean).sort().at(-1);
const deleted = payload.videos.filter((video) => video.deleted).length;
const related = active.filter((video) => video.classification === "Related").length;
const expectedNewIds = ["Mw_6RwtxGno", "_dajJRXe5d0", "6QlqNGsfCsQ", "lbJ6kczKhzg", "-OL0lWvSpfw", "iEyF5OMlCHk", "CAFf64pr2nY", "BXXosJjqmfk", "UWQRbmd7aJ4", "8NQNPgRhfeA", "WAyGGlsrjHE", "QwIrNWDF0VY", "_dJyx8fjexU", "ecPUff5wRJ4", "GCAbPTJs60U", "bqFhrLLa0rA", "kyt49VAP4xA", "16XTtIKOBVw", "1gZBcZlBqWg", "RwaNy7cCa84"];

if (latest !== "2026-11-10 12:00:00" || deleted !== 342 || related !== 179) {
  throw new Error("Migrated counts or latest viewing date changed unexpectedly");
}
if (payload.aiMetadataReview?.customRecordsAdded !== 7 || payload.aiMetadataReview?.aiReviewedRecords !== 182 || payload.aiMetadataReview?.fieldsFilled?.pl !== 104) {
  throw new Error("The 2026-11-10 backup or AI metadata review is incomplete");
}
for (const id of expectedNewIds) {
  if (!payload.videos.some((video) => video.id === id && !video.deleted)) throw new Error(`Missing salvaged video: ${id}`);
}

console.log(`viewing-log smoke passed: ${payload.videos.length} videos, latest ${latest.slice(0, 10)}`);
