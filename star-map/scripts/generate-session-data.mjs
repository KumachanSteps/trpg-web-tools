#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [, , inputPath, outputDirectory = path.resolve("star-map/js")] = process.argv;

if (!inputPath) {
  console.error("Usage: node star-map/scripts/generate-session-data.mjs <session-log.json> [output-directory]");
  process.exit(1);
}

const aliases = Object.freeze({
  "オルタナティブダブル": "オルタナティヴダブル",
  "オルタナティブ・ダブル": "オルタナティヴダブル",
  "オルタナティヴダブル": "オルタナティヴダブル",
  "虚構水銀注射-Mercurius Injection-": "虚構水銀注射 -𝐌𝐞𝐫𝐜𝐮𝐫𝐢𝐮𝐬 𝐈𝐧𝐣𝐞𝐜𝐭𝐢𝐨𝐧-",
  "虚構水銀注射": "虚構水銀注射 -𝐌𝐞𝐫𝐜𝐮𝐫𝐢𝐮𝐬 𝐈𝐧𝐣𝐞𝐜𝐭𝐢𝐨𝐧-",
  "虚構水銀注射 -𝐌𝐞𝐫𝐜𝐮𝐫𝐢𝐮𝐬 𝐈𝐧𝐣𝐞𝐜𝐭𝐢𝐨𝐧-": "虚構水銀注射 -𝐌𝐞𝐫𝐜𝐮𝐫𝐢𝐮𝐬 𝐈𝐧𝐣𝐞𝐜𝐭𝐢𝐨𝐧-",
  SHADOWCODE: "SHADOW CODE",
  SHADOWCODE継続: "SHADOW CODE",
  "SHADOW CODE": "SHADOW CODE",
  "Bye-bye-Summer-days": "Bye-Bye Summer Days",
  "Bye-Bye Summer Days": "Bye-Bye Summer Days",
  "Call the Name of your fate.": "Call the Name of Your Fate.",
  "Call the Name of Your fate.": "Call the Name of Your Fate.",
  "Call the Name of Your Fate.": "Call the Name of Your Fate."
});

const aliasEntries = Object.entries(aliases).map(([alias, canonical]) => [
  alias.normalize("NFKC").toLocaleLowerCase("ja"),
  canonical
]);

function normalizeScenarioCountKey(value) {
  const text = String(value || "").trim();
  const normalized = text.normalize("NFKC").toLocaleLowerCase("ja");
  return aliasEntries.find(([alias]) => alias === normalized)?.[1] || text;
}

function inferScenarioCountKey(row) {
  const supplied = String(row.scenarioCountKey || "").trim();
  const inferred = supplied || String(row.scenario || "").replace(/\s*第\d+陣\s*$/u, "").trim();
  return normalizeScenarioCountKey(inferred);
}

function addUnique(target, value) {
  if (value && !target.includes(value)) target.push(value);
}

const payload = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
if (!Array.isArray(payload.rows)) throw new Error("Input JSON must contain a rows array.");

const rows = payload.rows.map(row => ({
  ...row,
  scenarioCountKey: inferScenarioCountKey(row)
}));

const grouped = new Map();
for (const row of rows) {
  const title = row.scenarioCountKey;
  if (!title) continue;
  let item = grouped.get(title);
  if (!item) {
    item = {
      id: `scenario_${crypto.createHash("sha1").update(title).digest("hex").slice(0, 10)}`,
      title,
      systems: [],
      categories: [],
      roles: [],
      playCount: 0,
      gmCount: 0,
      sessionCount: 0,
      dateCount: 0,
      firstDate: "",
      lastDate: "",
      scenarioNames: [],
      scenarioCountKey: title,
      _dates: new Set()
    };
    grouped.set(title, item);
  }

  addUnique(item.systems, String(row.system || "").trim());
  const role = String(row.role || "").trim().toUpperCase();
  addUnique(item.roles, role);
  addUnique(item.scenarioNames, String(row.scenario || "").trim());

  item.sessionCount += 1;
  if (role === "PL") {
    item.playCount += 1;
    addUnique(item.categories, "played");
  } else if (["GM", "KP", "DL"].includes(role)) {
    item.gmCount += 1;
    addUnique(item.categories, "gmAble");
  }

  const dates = Array.isArray(row.dates) && row.dates.length ? row.dates : [row.date];
  const validDates = dates.map(String).filter(Boolean);
  for (const date of validDates) {
    item._dates.add(date);
    if (!item.firstDate || date < item.firstDate) item.firstDate = date;
    if (!item.lastDate || date > item.lastDate) item.lastDate = date;
  }
}

const scenarios = [...grouped.values()];
for (const item of scenarios) {
  item.dateCount = item._dates.size;
  delete item._dates;
}
scenarios.sort((a, b) => {
  const left = a.title.toLocaleLowerCase("ja");
  const right = b.title.toLocaleLowerCase("ja");
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index];
  }
  return leftPoints.length - rightPoints.length;
});
const aliasesJson = JSON.stringify(aliases);
const normalizationSource = `/* Scenario title normalization shared by record/scenario views. */\nwindow.SCENARIO_COUNT_KEY_ALIASES = window.SCENARIO_COUNT_KEY_ALIASES || Object.freeze(${aliasesJson});\nwindow.normalizeScenarioCountKey = window.normalizeScenarioCountKey || function(value) {\n  const text = String(value || "").trim();\n  const normalized = text.normalize("NFKC").toLocaleLowerCase("ja");\n  const entries = Object.entries(window.SCENARIO_COUNT_KEY_ALIASES);\n  const match = entries.find(([alias]) => alias.normalize("NFKC").toLocaleLowerCase("ja") === normalized);\n  return match ? match[1] : text;\n};`;

const sessionsSource = `/* ============================================================\n   卓ログトラッカーJSONから生成したセッションデータ\n   scenarioCountKey は表記揺れを正規化済みです。\n   ============================================================ */\n\n${normalizationSource}\n\nconst SESSION_LOG = ${JSON.stringify(rows)};\n`;

const scenariosSource = `/* ============================================================\n   sessions-data.js から生成したシナリオ分類データ\n\n   自動分類:\n   - role === "PL"       -> played  （プレイ済）\n   - role in GM/KP/DL    -> gmAble  （GM可能）\n\n   手動分類:\n   - planning （プレイ予定）\n   - current  （現行）\n   - owned    （所持）\n   ============================================================ */\n\n${normalizationSource}\n\nconst SCENARIO_CATEGORY_OVERRIDES = {\n  "planning": [],\n  "current": [],\n  "owned": []\n};\n\nconst SCENARIO_DATA = ${JSON.stringify(scenarios)};\n`;

fs.mkdirSync(path.resolve(outputDirectory), { recursive: true });
fs.writeFileSync(path.join(path.resolve(outputDirectory), "sessions-data.js"), sessionsSource);
fs.writeFileSync(path.join(path.resolve(outputDirectory), "scenario-data.js"), scenariosSource);

console.log(`Generated ${rows.length} sessions and ${scenarios.length} scenarios.`);
