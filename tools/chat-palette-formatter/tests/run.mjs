/*
 * CoCチャパレ整形ツールv2 — 回帰テストハーネス
 *
 *   node tests/run.mjs            … 検証（サービス判定 + buildOutput スナップショット）
 *   node tests/run.mjs --update   … スナップショットを現在の出力で更新
 *
 * 依存ゼロ（Node 18+ の標準モジュールのみ）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "fixtures");
const SNAPSHOTS = join(HERE, "snapshots");
const UPDATE = process.argv.includes("--update");

// parser.js / sources.js はブラウザ前提（bare `window`）なので最小限のシムを張る。
globalThis.window = globalThis.window || {};

const ChatPaletteParser = require("../js/parser.js");
const ChatPaletteSources = require("../js/sources.js");

// フィクスチャ名 → 期待するサービス判定
const EXPECTED_SERVICE = {
  "charash-6e": "charash",
  "iachara-6e-learned": "iachara",
  "iachara-6e-allskills": "iachara",
  "charaeno-7e": "charaeno",
  "character-storage-sheet": "character-storage",
  "character-storage-commands": "character-storage"
};

if (!existsSync(SNAPSHOTS)) mkdirSync(SNAPSHOTS, { recursive: true });

const fixtures = readdirSync(FIXTURES)
  .filter(file => /\.(json|txt)$/.test(file))
  .sort();

let failed = 0;
let updated = 0;

for (const file of fixtures) {
  const name = basename(file).replace(/\.(json|txt)$/, "");
  const raw = readFileSync(join(FIXTURES, file), "utf8");

  const detectedService = ChatPaletteSources.detectService(raw);
  const extracted = ChatPaletteParser.extractPaletteText(raw);
  const edition = extracted.text ? ChatPaletteParser.detectEdition(extracted.text) : "unknown";
  const output = extracted.text ? ChatPaletteParser.buildOutput(extracted.text, edition) : "";

  const snapshot = [
    `service: ${detectedService}`,
    `edition: ${edition}`,
    "----------------------------------------",
    output,
    ""
  ].join("\n");

  const snapPath = join(SNAPSHOTS, `${name}.snap.txt`);

  // --- サービス判定チェック ---
  const expected = EXPECTED_SERVICE[name];

  if (expected && detectedService !== expected) {
    console.error(`✗ ${name}: service判定 expected=${expected} actual=${detectedService}`);
    failed++;
  } else if (!expected) {
    console.error(`✗ ${name}: EXPECTED_SERVICE に期待値がありません`);
    failed++;
  }

  // --- スナップショットチェック ---
  if (UPDATE || !existsSync(snapPath)) {
    writeFileSync(snapPath, snapshot);
    updated++;
    console.log(`${UPDATE ? "↻" : "+"} ${name}: snapshot ${UPDATE ? "updated" : "created"}`);
    continue;
  }

  const previous = readFileSync(snapPath, "utf8");

  if (previous === snapshot) {
    console.log(`✓ ${name} (service=${detectedService}, edition=${edition})`);
    continue;
  }

  failed++;
  const prevLines = previous.split("\n");
  const nextLines = snapshot.split("\n");
  const at = prevLines.findIndex((line, i) => line !== nextLines[i]);

  console.error(`✗ ${name}: snapshot 不一致 (line ${at + 1})`);
  console.error(`    - ${JSON.stringify(prevLines[at])}`);
  console.error(`    + ${JSON.stringify(nextLines[at])}`);
}

// parser.js 内蔵の self-test（console.assert）が黙って落ちていないか
console.log("");
if (failed === 0) {
  console.log(`PASS — ${fixtures.length} fixtures${updated ? `, ${updated} snapshot(s) written` : ""}`);
  process.exit(0);
} else {
  console.error(`FAIL — ${failed} check(s) failed`);
  process.exit(1);
}
