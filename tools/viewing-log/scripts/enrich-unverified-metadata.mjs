import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const dataPath = resolve(root, "tools/viewing-log/data/videos.json");
const embeddedPath = resolve(root, "tools/viewing-log/data/videos-data.js");
const args = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value, all[index + 1]?.startsWith("--") ? true : all[index + 1]] : [value, value]));
const backupPath = args.get("--backup");
const write = args.has("--write");
const reportPath = resolve(root, "tools/viewing-log/data/review/ai-metadata-review-20261110.json");
const dryReportPath = args.get("--report") && args.get("--report") !== true ? resolve(String(args.get("--report"))) : null;

if (!backupPath || backupPath === true) throw new Error("--backup <path> is required");

const payload = JSON.parse(readFileSync(dataPath, "utf8"));
const backup = JSON.parse(readFileSync(resolve(String(backupPath)), "utf8"));
const videosById = new Map(payload.videos.map((video) => [video.id, video]));
const changes = [];
const protectedRelated = [];
let backupRecordsApplied = 0;
let backupCustomAdded = 0;

const CORE_FIELDS = ["system", "scenario", "gmKpDl", "pl"];
const CANONICAL_FIELDS = [...CORE_FIELDS, "scenarioUrl", "scenarioAuthor"];
const RECORD_FIELDS = ["reviewStatus", "quality", "notes", "deleted", "deletedAt"];

function clean(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(value) {
  return clean(value).toLowerCase().replace(/[\s\-‐‑‒–—―~〜～・･,，、.!！?？:：'"“”‘’「」『』【】()（）\[\]]+/g, "");
}

function hasValue(value) {
  const text = clean(value);
  return Boolean(text) && !/^(unknown|不明|未設定|n\/a)$/i.test(text) && !text.includes("Unknown");
}

function recordChange(video, field, before, after, reason, confidence = "high") {
  if (!hasValue(after) || clean(before) === clean(after)) return false;
  changes.push({ id: video.id, title: video.title, field, before: before ?? null, after, reason, confidence });
  return true;
}

function setCanonical(video, field, value, reason, confidence = "high") {
  const next = clean(value).replace(/^[/|｜:：]+|[/|｜:：]+$/g, "").trim();
  if (!hasValue(next) || hasValue(video.canonical?.[field])) return false;
  const before = video.canonical?.[field] ?? null;
  video.canonical ||= {};
  video.parsed ||= {};
  video.source ||= {};
  video.canonical[field] = next;
  video.parsed[field] = next;
  video.source[field] = `AI title review: ${reason}`;
  return recordChange(video, field, before, next, reason, confidence);
}

function applyBackupRecord(video, override) {
  if (!video || !override) return;
  const curatedRelated = video.classification === "Related" || video.curatedRelated;
  for (const field of CANONICAL_FIELDS) {
    if (!hasValue(override[field])) continue;
    const before = video.canonical?.[field] ?? null;
    video.canonical ||= {};
    video.source ||= {};
    video.canonical[field] = clean(override[field]);
    video.source[field] = `User backup ${backup.exportedAt}`;
    recordChange(video, field, before, video.canonical[field], "user backup", "user");
  }
  for (const field of RECORD_FIELDS) {
    if (override[field] === undefined) continue;
    const before = video[field];
    video[field] = override[field];
    recordChange(video, field, before, video[field], "user backup", "user");
  }
  if (override.classification && !(curatedRelated && override.classification !== "Related")) {
    const before = video.classification;
    video.classification = override.classification;
    recordChange(video, "classification", before, video.classification, "user backup", "user");
  } else if (curatedRelated && override.classification && override.classification !== "Related") {
    protectedRelated.push(video.id);
  }
  if (override.reviewStatus) video.reviewStatus = override.reviewStatus;
  if (override.gmKpDlConfirmed !== undefined) video.gmKpDlConfirmed = override.gmKpDlConfirmed;
  video.webToolEditedAt = override.editedAt || backup.exportedAt;
  backupRecordsApplied += 1;
}

for (const [id, override] of Object.entries(backup.records || {})) applyBackupRecord(videosById.get(id), override);
for (const custom of backup.customRecords || []) {
  if (!custom?.id || videosById.has(custom.id)) continue;
  const clone = JSON.parse(JSON.stringify(custom));
  clone.source ||= {};
  for (const field of CANONICAL_FIELDS) if (hasValue(clone.canonical?.[field])) clone.source[field] = `User backup ${backup.exportedAt}`;
  clone.webToolEditedAt = backup.exportedAt;
  payload.videos.push(clone);
  videosById.set(clone.id, clone);
  backupCustomAdded += 1;
}

function detectSystem(title) {
  const text = clean(title);
  if (/\bnew\s+call of cthulhu\b/i.test(text) || /新クトゥルフ神話TRPG/i.test(text)) return "CoC7";
  if (/\bcall of cthulhu\b/i.test(text) || /\bCoC\d*\b/i.test(text) || /CoC\s*TRPG/i.test(text) || /クトゥルフ神話TRPG|ｸﾄｩﾙﾌ神話TRPG|クトゥルフ/i.test(text)) return "CoC6";
  if (/エモクロア(?:TRPG)?/i.test(text)) return "エモクロア";
  if (/マーダーミステリー|マダミス/i.test(text)) return "マダミス";
  return "";
}

function cleanPeople(value) {
  return clean(value)
    .replace(/^[\s/／|｜:：,，、\-ー]+/, "")
    .replace(/^with\s*/i, "")
    .replace(/^(?:PL|PLAYER|プレイヤー)\s*[/／:：]?\s*/i, "")
    .replace(/[\s/／|｜:：,，、]+$/, "")
    .replace(/\s*(?:#|＃).*/, "")
    .replace(/\s*[【\[《（(].*$/, "")
    .replace(/\s*(?:前編|中編|後編|Day\s*\d+|\d+日目).*$/i, "")
    .replace(/\s*(?:KP|GM|DL|KPC|SKP)\s*[:：]?\s*.*$/i, "")
    .replace(/と踊$/, "")
    .replace(/(?:さん|氏)?\s*(?:視点|卓)$/i, "")
    .trim();
}

function extractRole(title, role) {
  const text = clean(title);
  const label = role === "pl" ? "PL|PLAYER|プレイヤー" : "KP(?:\/作)?|GM|DL";
  const stop = role === "pl" ? "KP(?:\/作)?|GM|DL|KPC|SKP" : "PL|PLAYER|プレイヤー|PC";
  const pattern = new RegExp(`(?:^|[\\s/／|｜【《（(』」])(?:${label})\\s*[/／:：]?\\s*(.+?)(?=\\s*(?:${stop})\\s*[/／:：]?|[】》）)]|[#＃]|$)`, "i");
  const match = text.match(pattern);
  return match ? cleanPeople(match[1]) : "";
}

function extractHoPlayers(title) {
  const names = [...clean(title).matchAll(/HO\s*\d+\s*[:：]\s*([^、,／/|｜【】#＃]+)/gi)].map((match) => cleanPeople(match[1])).filter(hasValue);
  return names.length ? [...new Set(names)].join(" / ") : "";
}

function extractQuotedSuffixPlayers(title) {
  const text = clean(title);
  const match = text.match(/[』」]\s*([^#＃【】]+)$/);
  if (!match) return "";
  const candidate = cleanPeople(match[1]);
  if (!candidate || /^(?:前編|中編|後編|Day|第\d|chapter|part|配信|セッション)/i.test(candidate)) return "";
  if (!/[、,／/]/.test(candidate) && !/(?:さん|くん|ちゃん|氏)$/.test(candidate)) return "";
  return candidate;
}

function extractBracketPlayers(title) {
  const text = clean(title);
  const systemLeading = /^【\s*(?:新)?(?:クトゥルフ|エモクロア|マーダーミステリー|マダミス|CoC)/i.test(text);
  const candidates = [...text.matchAll(/【([^】]+)】/g)].map((match) => ({ value: cleanPeople(match[1]), index: match.index, raw: match[1] }));
  return candidates.reverse().find((candidate) => {
    if (!candidate.value || /^[#＃]/.test(candidate.value)) return false;
    if (/TRPG|CoC|クトゥルフ|エモクロア|マダミス|マーダーミステリー|視点|セッション|七伏市奇譚/i.test(candidate.value)) return false;
    const explicitPl = /^\s*(?:PL|PLAYER|プレイヤー)\s*[:：/]?/i.test(candidate.raw);
    const followsHashtag = /[#＃]/.test(text.slice(0, candidate.index));
    if (!systemLeading && !explicitPl && !followsHashtag) return false;
    return /[、,／/]/.test(candidate.value);
  })?.value || "";
}

function extractWithPlayer(title) {
  const match = clean(title).match(/(?:^|[｜|])?with\s*([^#＃【】]{2,40})$/i);
  return match ? cleanPeople(match[1]) : "";
}

function hashtags(title) {
  return [...clean(title).matchAll(/[#＃]([^\s#＃【】]+)/g)].map((match) => normalized(match[1])).filter((tag) => tag.length >= 4);
}

const target = payload.videos.filter((video) => !video.deleted && video.classification === "Session" && !["Verified", "Corrected"].includes(video.reviewStatus));

for (const video of target) {
  setCanonical(video, "system", detectSystem(video.title), "explicit system name", "high");
  setCanonical(video, "gmKpDl", extractRole(video.title, "gm"), "explicit KP/GM/DL label", "high");
  const players = extractRole(video.title, "pl") || extractHoPlayers(video.title) || extractQuotedSuffixPlayers(video.title) || extractBracketPlayers(video.title) || extractWithPlayer(video.title);
  setCanonical(video, "pl", players, "explicit cast in title", "high");
}

// A canonical scenario with one established system is safe to reuse for missing records of the same scenario.
const systemsByScenario = new Map();
for (const video of payload.videos.filter((item) => !item.deleted && item.classification === "Session")) {
  if (!hasValue(video.canonical?.scenario) || !hasValue(video.canonical?.system)) continue;
  const key = normalized(video.canonical.scenario);
  const systems = systemsByScenario.get(key) || new Set();
  systems.add(clean(video.canonical.system));
  systemsByScenario.set(key, systems);
}
for (const video of target) {
  const systems = systemsByScenario.get(normalized(video.canonical?.scenario));
  if (systems?.size === 1) setCanonical(video, "system", [...systems][0], "same canonical scenario", "high");
}

// Same scenario, channel and hashtag denotes the same streamed table. Propagate only a single unambiguous value.
for (const field of ["gmKpDl", "pl"]) {
  const groups = new Map();
  for (const video of payload.videos.filter((item) => !item.deleted && item.classification === "Session")) {
    for (const tag of hashtags(video.title)) {
      const key = [normalized(video.canonical?.scenario), normalized(video.channelName), tag].join("|");
      if (!key.startsWith("|")) groups.set(key, [...(groups.get(key) || []), video]);
    }
  }
  for (const group of groups.values()) {
    const known = [...new Set(group.map((video) => clean(video.canonical?.[field])).filter(hasValue))];
    if (known.length !== 1) continue;
    for (const video of group) {
      if (!["Verified", "Corrected"].includes(video.reviewStatus)) setCanonical(video, field, known[0], "same scenario/channel/hashtag", "high");
    }
  }
}

const changedIds = new Set(changes.filter((change) => change.reason !== "user backup").map((change) => change.id));
for (const video of target) {
  if (!changedIds.has(video.id)) continue;
  if (video.reviewStatus === "Open") video.reviewStatus = "Partial";
  video.reviewReason = "AI-assisted title review 2026-11-10; explicit title evidence applied; human verification still required";
  video.aiReviewedAt = "2026-11-10";
}

const activeUnverified = payload.videos.filter((video) => !video.deleted && video.classification === "Session" && !["Verified", "Corrected"].includes(video.reviewStatus));
const missing = Object.fromEntries(CORE_FIELDS.map((field) => [field, activeUnverified.filter((video) => !hasValue(video.canonical?.[field])).length]));
const countsByField = Object.fromEntries([...new Set(changes.map((change) => change.field))].sort().map((field) => [field, changes.filter((change) => change.field === field).length]));
const report = {
  generatedAt: new Date().toISOString(),
  backup: { source: basename(resolve(String(backupPath))), exportedAt: backup.exportedAt, recordsApplied: backupRecordsApplied, customRecordsAdded: backupCustomAdded, relatedClassificationsProtected: protectedRelated.length },
  scope: { videos: payload.videos.length, activeUnverifiedSessions: activeUnverified.length },
  changes: { total: changes.length, aiReviewedRecords: changedIds.size, byField: countsByField },
  remainingMissing: missing,
  policy: "Only explicit title labels, cast brackets, quoted-title suffixes, and unambiguous same-hashtag table propagation are applied. AI-reviewed records remain Partial until human verification.",
  items: changes,
};

payload.generatedAt = "2026-11-10";
payload.aiMetadataReview = {
  appliedAt: "2026-11-10",
  sourceBackup: "trpg-log-keeper-backup-20261110.json",
  backupExportedAt: backup.exportedAt,
  recordsApplied: backupRecordsApplied,
  customRecordsAdded: backupCustomAdded,
  aiReviewedRecords: changedIds.size,
  fieldsFilled: countsByField,
  remainingMissing: missing,
  verificationPolicy: report.policy,
};

console.log(JSON.stringify({ backup: report.backup, scope: report.scope, changes: report.changes, remainingMissing: report.remainingMissing }, null, 2));
console.log("\nSample AI changes:");
console.log(changes.filter((change) => change.reason !== "user backup").slice(0, 30).map((change) => `${change.id}\t${change.field}\t${change.after}\t${change.reason}`).join("\n"));

if (write) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(payload));
  writeFileSync(embeddedPath, `window.TRPG_DATA=${JSON.stringify(payload)};`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nUpdated ${dataPath}, ${embeddedPath}, and ${reportPath}`);
} else {
  if (dryReportPath) writeFileSync(dryReportPath, JSON.stringify(report, null, 2) + "\n");
  console.log("\nDry run only. Add --write to update data files.");
}
