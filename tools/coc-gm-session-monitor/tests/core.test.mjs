// node --test tools/coc-gm-session-monitor/tests/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
globalThis.window = globalThis.window || {};
const P = require("../../../shared/coc-palette/parser.js");
require("../../../shared/coc-palette/sources.js");
const S = require("../../../shared/coc-palette/schema.js");
const C = require("../js/core.js");
const FIX = join(HERE, "../../chat-palette-formatter/tests/fixtures");
const TABLES = { INITIAL_6E: P.INITIAL_6E, INITIAL_7E: P.INITIAL_7E, categorize: P.categorize };

function entry(edition, ab, extra = {}) {
  return Object.assign({ edition, abilities: ab }, extra);
}

test("GM-01 6版STR15と7版STR65: 6版の方が大きい、原値は維持", () => {
  const t = C.buildAbilityTable([entry("6e", { STR: 15 }), entry("7e", { STR: 65 })]);
  assert.equal(t.rows[0].cells.STR.text, "15");
  assert.equal(t.rows[1].cells.STR.text, "65");
  assert.equal(t.rows[1].cells.STR.sub, "13");
  assert.equal(t.rows[0].cells.STR.star, true);
  assert.notEqual(t.rows[1].cells.STR.star, true);
});

test("GM-02 7版STR63は12.6、比較で丸めない", () => {
  const t = C.buildAbilityTable([entry("6e", { STR: 13 }), entry("7e", { STR: 63 })]);
  assert.equal(t.rows[1].cells.STR.sub, "12.6");
  assert.equal(t.rows[1].cells.STR.compare, 12.6);
  assert.equal(t.rows[0].cells.STR.star, true);
});

test("合計/平均: 欠損があれば比較しない", () => {
  const full = { STR: 7, CON: 11, POW: 13, DEX: 12, APP: 13, SIZ: 13, INT: 13, EDU: 21 };
  const t = C.buildAbilityTable([entry("6e", full), entry("6e", { STR: 10 })]);
  assert.equal(t.rows[0].cells.SUM.text, "103");
  assert.equal(t.rows[0].cells.AVG.text, "12.9");
  assert.equal(t.rows[0].cells.AVG.compare, 12.875);
  assert.equal(t.rows[1].cells.SUM.compare, null);
  assert.match(t.rows[1].cells.SUM.sub, /1\/8項目/);
});

test("GM-03 技能70同士は5倍・1/5にしない", () => {
  const chars = [
    { id: "a", edition: "6e", abilities: {}, skills: [{ name: "目星", value: 70, category: "explore" }] },
    { id: "b", edition: "7e", abilities: {}, skills: [{ name: "目星", value: 70, category: "explore" }] }
  ];
  const t = C.buildSkillTable(chars, TABLES, { fill: true });
  const row = t.rows.find(r => r.key === "目星");
  assert.equal(row.cells.a.value, 70);
  assert.equal(row.cells.b.value, 70);
  assert.ok(row.cells.a.star && row.cells.b.star);
});

test("GM-04 名称差は同じ行（注記つき）、版固有・分割技能は別行で非対応", () => {
  const chars = [
    { id: "a", edition: "6e", abilities: { DEX: 12 }, skills: [{ name: "博物学", value: 40 }, { name: "マーシャルアーツ", value: 50 }, { name: "こぶし：パンチ", value: 60 }] },
    { id: "b", edition: "7e", abilities: { DEX: 60 }, skills: [{ name: "自然", value: 30 }, { name: "近接戦闘：格闘", value: 55 }] }
  ];
  const t = C.buildSkillTable(chars, TABLES, { fill: true });
  const nature = t.rows.find(r => r.key === "自然");
  assert.equal(nature.note, "6版：博物学");
  assert.equal(nature.cells.a.value, 40);
  assert.equal(nature.cells.b.value, 30);
  const ma = t.rows.find(r => r.key === "マーシャルアーツ");
  assert.equal(ma.cells.b.state, "na");
  assert.equal(ma.cells.b.text, "—");
  const fist = t.rows.find(r => r.key === "こぶし：パンチ");
  assert.equal(fist.cells.b.state, "na");
  const melee = t.rows.find(r => r.key === "近接戦闘：格闘");
  assert.equal(melee.cells.a.state, "na");
  assert.ok(!t.rows.some(r => r.key === "博物学"));
});

test("GM-05 明示0・補完・算出不能・非対応を区別", () => {
  const chars = [
    { id: "a", edition: "6e", abilities: {}, skills: [{ name: "目星", value: 0 }, { name: "威圧", value: 30 }] },
    { id: "b", edition: "7e", abilities: {}, skills: [] }
  ];
  const t = C.buildSkillTable(chars, TABLES, { fill: true });
  const eye = t.rows.find(r => r.key === "目星");
  assert.equal(eye.cells.a.state, "explicit");
  assert.equal(eye.cells.a.value, 0);
  assert.equal(eye.cells.b.state, "filled");
  assert.equal(eye.cells.b.value, 25);
  const intim = t.rows.find(r => r.key === "威圧");
  assert.equal(intim.cells.b.value, 15);
  // 回避は DEX 不明なら算出不能
  const t2 = C.buildSkillTable([{ id: "x", edition: "6e", abilities: {}, skills: [{ name: "回避", value: 40 }] }, { id: "y", edition: "6e", abilities: {}, skills: [] }], TABLES, { fill: true });
  assert.equal(t2.rows[0].cells.y.state, "unknown");
  // 補完OFFなら隠れる
  const t3 = C.buildSkillTable(chars, TABLES, { fill: false });
  assert.equal(t3.rows.find(r => r.key === "目星").cells.b.hidden, true);
});

test("回避・母国語の初期値は能力値から計算", () => {
  assert.equal(C.initialValue("回避", "6e", { DEX: 13 }, TABLES).value, 26);
  assert.equal(C.initialValue("回避", "7e", { DEX: 65 }, TABLES).value, 32);
  assert.equal(C.initialValue("母国語：日本語", "6e", { EDU: 15 }, TABLES).value, 75);
  assert.equal(C.initialValue("母国語：日本語", "7e", { EDU: 70 }, TABLES).value, 70);
  assert.equal(C.initialValue("科学：薬学", "7e", {}, TABLES).value, 1);
  assert.equal(C.initialValue("芸術/製作：写真", "7e", {}, TABLES).value, 5);
});

test("技能の検索・タグ・強調", () => {
  const chars = [
    { id: "a", edition: "6e", abilities: {}, skills: [{ name: "目星", value: 80 }, { name: "医学", value: 50 }] },
    { id: "b", edition: "7e", abilities: {}, skills: [{ name: "聞き耳", value: 60 }] }
  ];
  const q = C.buildSkillTable(chars, TABLES, { fill: true, query: "目星, 聞き耳" });
  assert.deepEqual(q.rows.map(r => r.key).sort(), ["目星", "聞き耳"].sort());
  const tag = C.buildSkillTable(chars, TABLES, { fill: true, tag: "生物知識" });
  assert.deepEqual(tag.rows.map(r => r.key), ["医学"]);
  const high = C.buildSkillTable(chars, TABLES, { fill: true, filter: "high", threshold: 70 });
  assert.deepEqual(high.rows.map(r => r.key), ["目星"]);
});

test("GM-07 基準86から18減少でSAN68が不定ライン", () => {
  const info = C.sanInfo(86, 68);
  assert.equal(info.threshold, 18);
  assert.equal(info.line, 68);
  assert.equal(info.reached, true);
  assert.equal(C.sanInfo(52, 52).threshold, 11);
  assert.equal(C.sanInfo(45, 45).threshold, 9);
  assert.equal(C.sanInfo(86, 69).reached, false);
});

test("一時的狂気の目安: 1回で5以上", () => {
  assert.equal(C.isTempInsanityDrop(50, 45), true);
  assert.equal(C.isTempInsanityDrop(50, 46), false);
});

test("GM-08 MP回復: 1時間ずつと一括で同じ、上限遵守", () => {
  const rate = C.mpRatePerHour("6e", 13);
  let s = { mp: 5, frac: 0 };
  for (let i = 0; i < 5; i++) s = C.advanceMp(s.mp, 13, s.frac, rate, 1);
  const bulk = C.advanceMp(5, 13, 0, rate, 5);
  assert.equal(s.mp, bulk.mp);
  assert.ok(Math.abs(s.frac - bulk.frac) < 1e-9);
  assert.equal(bulk.mp, 7); // 13/24*5 = 2.708
  const full = C.advanceMp(12, 13, 0.5, rate, 10);
  assert.equal(full.mp, 13);
  assert.equal(full.frac, 0);
  assert.equal(C.mpRatePerHour("7e", 50), 1);
  assert.equal(C.advanceMp(3, 10, 0, 1, 2.5).mp, 5);
});

test("GM-11 choice: 候補なし・過大・特殊文字はエラー", () => {
  assert.equal(C.choiceCommand([], 1).ok, false);
  assert.equal(C.choiceCommand(["A", "B"], 3).ok, false);
  assert.equal(C.choiceCommand(["A,B", "C"], 1).ok, false);
  assert.equal(C.choiceCommand(["A]", "C"], 1).ok, false);
  assert.equal(C.choiceCommand(["A\nB", "C"], 1).ok, false);
  assert.equal(C.choiceCommand(["津奈木 担子", "小竹 練珠", "幟 一哲"], 1).command, "choice[津奈木 担子,小竹 練珠,幟 一哲]");
  assert.equal(C.choiceCommand(["A", "B", "C"], 2, true, "誰が気づく？").command, "Schoice2[A,B,C] 誰が気づく？");
});

test("GM-12 ダイス表: 空行除去、重複は残す", () => {
  const items = C.parseDiceTableLines("水\n\n 緑茶 \n水\n");
  assert.deepEqual(items, ["水", "緑茶", "水"]);
  assert.equal(C.diceTableText("飲み物表", items), "飲み物表\n1D3\n1:水\n2:緑茶\n3:水");
  assert.equal(C.diceTableText("x", []), "");
});

test("GM-13 チェックリスト: 見出しは分母外、個別/全体", () => {
  const items = [
    { kind: "heading", text: "導入" },
    { kind: "check", text: "a", value: true, byChar: { p1: true } },
    { kind: "choice", text: "q", options: ["A", "B"], value: "", byChar: { p1: "A", p2: "B" } }
  ];
  assert.deepEqual(C.checklistProgress(items, false, []), { done: 1, total: 2 });
  assert.deepEqual(C.checklistProgress(items, true, ["p1", "p2"]), { done: 3, total: 4 });
  assert.deepEqual(C.parseChecklistLine("質問 | A | B"), { kind: "choice", text: "質問", options: ["A", "B"] });
  assert.equal(C.parseChecklistLine("# 導入").kind, "heading");
  assert.equal(C.parseChecklistLine("鍵を見つけた").kind, "check");
});

test("取込: 連結されたこまJSONを分割", () => {
  const a = readFileSync(join(FIX, "charash-6e.json"), "utf8").trim();
  const b = readFileSync(join(FIX, "charaeno-7e.json"), "utf8").trim();
  const chunks = C.splitImportChunks(a + "\n\n" + b);
  assert.equal(chunks.length, 2);
  const chars = chunks.map(S.buildCharacter);
  assert.equal(chars[0].meta.edition, "6e");
  assert.equal(chars[1].meta.edition, "7e");
  assert.equal(C.splitImportChunks(readFileSync(join(FIX, "character-storage-sheet.txt"), "utf8")).length, 1);
});

test("卓報告: テキストとpendingImport形式", () => {
  const ps = [{ name: "津奈木 担子", pl: "朱石", edition: "6e" }, { name: "幟 一哲", edition: "7e", ho: "HO2" }];
  assert.equal(C.reportText({ scenario: "悪霊の家", kp: "K", participants: ps }), "CoC「悪霊の家」\nKP：K\n津奈木 担子（朱石）\nHO2 幟 一哲");
  const p = C.reportPendingImport({ scenario: "悪霊の家", kp: "K", participants: ps, date: "2026-11-28" }, "2026-11-28T00:00:00.000Z");
  assert.equal(p.items[0].system, "CoC 6版");
  assert.deepEqual(p.items[0].players[0], { pl: "朱石", pc: "津奈木 担子", characterUrl: "" });
  assert.equal(JSON.stringify(p).includes("SAN"), false);
});

test("幸運: パレット値、6版はPOW×5を算出扱い", () => {
  assert.deepEqual(C.resolveLuck({ edition: "6e", abilities: { POW: 13 }, skills: [] }), { value: 65, derived: true });
  assert.deepEqual(C.resolveLuck({ edition: "7e", abilities: { POW: 50 }, skills: [{ name: "幸運", value: 60 }] }), { value: 60, derived: false });
  assert.deepEqual(C.resolveLuck({ edition: "7e", abilities: { POW: 50 }, skills: [] }), { value: null, derived: false });
});

test("実データ: 6版と7版のフィクスチャで技能表が組める", () => {
  const raw = ["charash-6e.json", "charaeno-7e.json"].map(f => S.buildCharacter(readFileSync(join(FIX, f), "utf8")));
  const chars = raw.map((c, i) => ({ id: "c" + i, edition: c.meta.edition, abilities: c.abilities, skills: c.skills }));
  const t = C.buildSkillTable(chars, TABLES, { fill: true });
  assert.ok(t.rows.length > 20);
  assert.ok(!t.rows.some(r => r.key === "アイデア" || r.key === "幸運"));
  const dodge = t.rows.find(r => r.key === "回避");
  assert.equal(dodge.cells.c0.value, 60);
  assert.equal(dodge.cells.c1.value, 58);
});
