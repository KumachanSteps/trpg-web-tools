import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("tools/viewing-log/index.html", root), "utf8");
const shell = readFileSync(new URL("shared/hub/shell.js", root), "utf8");
const app = readFileSync(new URL("tools/viewing-log/app.js", root), "utf8");
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
if (payload.videos.length !== 2392 || embedded?.videos?.length !== payload.videos.length) {
  throw new Error("The migrated viewing-log dataset is incomplete");
}
if (payload.viewingLogSalvageImport?.addedVideos !== 13 || payload.viewingLogSalvageImport?.uniqueVideoIds !== 1704) {
  throw new Error("The 2026-10-22 salvage metadata is inconsistent");
}

const active = payload.videos.filter((video) => !video.deleted);
const latest = active.map((video) => video.lastWatchedAt).filter(Boolean).sort().at(-1);
const deleted = payload.videos.filter((video) => video.deleted).length;
const related = active.filter((video) => video.classification === "Related").length;
const expectedNewIds = ["Mw_6RwtxGno", "_dajJRXe5d0", "6QlqNGsfCsQ", "lbJ6kczKhzg", "-OL0lWvSpfw", "iEyF5OMlCHk", "CAFf64pr2nY", "BXXosJjqmfk", "UWQRbmd7aJ4", "8NQNPgRhfeA", "WAyGGlsrjHE", "QwIrNWDF0VY", "_dJyx8fjexU"];

if (latest !== "2026-10-20 12:00:00" || deleted !== 341 || related !== 179) {
  throw new Error("Migrated counts or latest viewing date changed unexpectedly");
}
for (const id of expectedNewIds) {
  if (!payload.videos.some((video) => video.id === id && !video.deleted)) throw new Error(`Missing salvaged video: ${id}`);
}

console.log(`viewing-log smoke passed: ${payload.videos.length} videos, latest ${latest.slice(0, 10)}`);
