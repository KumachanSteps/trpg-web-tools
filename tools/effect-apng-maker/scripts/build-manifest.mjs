#!/usr/bin/env node
/*
 * 演出APNGメーカー — library/ 以下の asset.json を集めて検査し、library/manifest.json を書き出す。
 *   node tools/effect-apng-maker/scripts/build-manifest.mjs          … 書き出す
 *   node tools/effect-apng-maker/scripts/build-manifest.mjs --check  … 書き出さずに検査だけ（manifest.json が古ければ失敗）
 * 新しいアセットを足したら、このスクリプトを実行してから PR にする。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LIB = join(here, '..', 'library');
const OUT = join(LIB, 'manifest.json');

// ライブラリのカテゴリ（並び順）。新しいカテゴリはここに足す
const CATEGORIES = [
  { id: 'transition', name: { ja: '場面転換', en: 'Transitions', ko: '장면 전환' } },
  { id: 'weather', name: { ja: '天候', en: 'Weather', ko: '날씨' } },
  { id: 'element', name: { ja: '属性', en: 'Elements', ko: '속성' } },
  { id: 'horror', name: { ja: 'ホラー', en: 'Horror', ko: '호러' } },
  { id: 'visual', name: { ja: '視覚効果', en: 'Visual effects', ko: '시각 효과' } },
  { id: 'magic', name: { ja: '魔法・神秘', en: 'Magic', ko: '마법·신비' } },
  { id: 'combat', name: { ja: '戦闘', en: 'Combat', ko: '전투' } },
  { id: 'ambience', name: { ja: '環境・場所', en: 'Ambience', ko: '환경·장소' } },
  { id: 'emotion', name: { ja: '感情・コミカル', en: 'Emotion & comedy', ko: '감정·코믹' } },
  { id: 'scifi', name: { ja: 'サイバー', en: 'Sci-fi', ko: '사이버' } }
];
const CAT_IDS = CATEGORIES.map(c => c.id);
const LANGS = ['ja', 'en', 'ko'];
const PARAM_TYPES = ['range', 'color', 'select', 'toggle', 'point'];
const PLAYBACKS = ['loop', 'once'];
const STATUSES = ['draft', 'test', 'public'];
const MAX_SIDE = 1920;

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

function checkText(id, field, value) {
  if (!value || typeof value !== 'object') return fail(id, `${field} must be { ja, en, ko }`);
  LANGS.forEach(l => { if (!value[l] || typeof value[l] !== 'string') fail(id, `${field}.${l} is missing`); });
}

function checkParam(id, p, keys) {
  const where = `param "${p.key}"`;
  if (!p.key || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(p.key)) fail(id, `${where}: key must be letters and digits`);
  if (keys.has(p.key)) fail(id, `${where}: duplicate key`);
  keys.add(p.key);
  if (!PARAM_TYPES.includes(p.type)) fail(id, `${where}: type must be one of ${PARAM_TYPES.join(', ')}`);
  checkText(id, `${where}.label`, p.label);
  if (p.type === 'range') {
    ['min', 'max', 'step', 'default'].forEach(k => { if (typeof p[k] !== 'number') fail(id, `${where}: ${k} must be a number`); });
    if (p.default < p.min || p.default > p.max) fail(id, `${where}: default is outside min..max`);
  } else if (p.type === 'color') {
    if (!/^#[0-9a-fA-F]{6}$/.test(p.default)) fail(id, `${where}: default must be #rrggbb`);
  } else if (p.type === 'select') {
    if (!Array.isArray(p.options) || !p.options.length) fail(id, `${where}: options are missing`);
    else {
      p.options.forEach(o => checkText(id, `${where} option "${o.value}"`, o.label));
      if (!p.options.some(o => o.value === p.default)) fail(id, `${where}: default is not one of the options`);
    }
  } else if (p.type === 'toggle') {
    if (typeof p.default !== 'boolean') fail(id, `${where}: default must be true or false`);
  } else if (p.type === 'point') {
    const d = p.default || {};
    if (!(d.x >= 0 && d.x <= 1 && d.y >= 0 && d.y <= 1)) fail(id, `${where}: default must be { x, y } between 0 and 1`);
  }
}

function checkAsset(a, folder) {
  const id = a.id || folder;
  const [cat, slug] = folder.split('/');
  if (a.id !== `${cat}.${slug}`) fail(id, `id must be "${cat}.${slug}" to match its folder`);
  if (a.category !== cat) fail(id, `category must be "${cat}"`);
  if (!CAT_IDS.includes(cat)) fail(id, `unknown category "${cat}" (add it to CATEGORIES)`);
  if (!Number.isInteger(a.version) || a.version < 1) fail(id, 'version must be a whole number from 1');
  if (!STATUSES.includes(a.status)) fail(id, `status must be ${STATUSES.join(' / ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.added || '')) fail(id, 'added must be YYYY-MM-DD');
  if (!['procedural', 'combo', 'baked'].includes(a.kind)) fail(id, 'kind must be procedural / combo / baked');
  if (!['transition', 'effect'].includes(a.type)) fail(id, 'type must be transition / effect');
  checkText(id, 'name', a.name);
  checkText(id, 'desc', a.desc);
  if (!Array.isArray(a.tags)) fail(id, 'tags must be a list');
  const pb = a.playback || {};
  if (!Array.isArray(pb.allowed) || !pb.allowed.every(v => PLAYBACKS.includes(v))) fail(id, 'playback.allowed must list loop / once');
  else if (!pb.allowed.includes(pb.default)) fail(id, 'playback.default must be in playback.allowed');
  if (a.type === 'transition' && pb.default !== 'once') fail(id, 'transitions play once');
  const d = a.duration || {};
  if (!(d.min > 0 && d.min <= d.default && d.default <= d.max)) fail(id, 'duration needs min <= default <= max (seconds)');
  const keys = new Set();
  (a.params || []).forEach(p => checkParam(id, p, keys));
  const b = a.budget || {};
  if (!Array.isArray(b.size) || b.size.length !== 2 || b.size.some(v => !(v > 0 && v <= MAX_SIDE))) fail(id, `budget.size must be [width, height] up to ${MAX_SIDE}`);
  if (!(b.fps >= 5 && b.fps <= 30)) fail(id, 'budget.fps must be 5..30');
  if (![0, 32, 64, 128, 256].includes(b.colors)) fail(id, 'budget.colors must be 32 / 64 / 128 / 256 (0 = full colour)');
  if (!a.license || !a.license.type || !a.license.credit) fail(id, 'license.type and license.credit are required');
  if (a.kind === 'procedural' && !existsSync(join(LIB, folder, 'render.js'))) fail(id, 'procedural assets need render.js');
  if (a.kind === 'baked' && !existsSync(join(LIB, folder, a.frames || 'frames.png'))) fail(id, 'baked assets need their frames file');
}

const assets = [];
for (const cat of readdirSync(LIB)) {
  const catDir = join(LIB, cat);
  if (cat.startsWith('_') || !statSync(catDir).isDirectory()) continue;
  for (const slug of readdirSync(catDir)) {
    const file = join(catDir, slug, 'asset.json');
    if (!existsSync(file)) continue;
    let a;
    try {
      a = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      fail(`${cat}/${slug}`, `asset.json is not valid JSON (${error.message})`);
      continue;
    }
    checkAsset(a, `${cat}/${slug}`);
    assets.push({ ...a, path: `${cat}/${slug}` });
  }
}

const ids = new Set(assets.map(a => a.id));
assets.filter(a => a.kind === 'combo').forEach(a => {
  if (!Array.isArray(a.layers) || !a.layers.length) fail(a.id, 'combo assets need layers');
  else a.layers.forEach(l => {
    if (!ids.has(l.asset)) fail(a.id, `layer "${l.asset}" is not in the library`);
    Object.values(l.map || {}).forEach(k => { if (!(a.params || []).some(p => p.key === k)) fail(a.id, `layer map points to unknown param "${k}"`); });
  });
});

assets.sort((x, y) => CAT_IDS.indexOf(x.category) - CAT_IDS.indexOf(y.category) || (x.order ?? 999) - (y.order ?? 999) || x.added.localeCompare(y.added) || x.id.localeCompare(y.id));

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in library/:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}

const manifest = { version: 1, categories: CATEGORIES.filter(c => assets.some(a => a.category === c.id)), assets };
const text = JSON.stringify(manifest, null, 1) + '\n';

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== text) {
    console.error('✗ library/manifest.json is out of date. Run: node tools/effect-apng-maker/scripts/build-manifest.mjs');
    process.exit(1);
  }
  console.log(`✓ ${assets.length} assets OK, manifest.json is up to date`);
} else {
  writeFileSync(OUT, text);
  console.log(`✓ wrote library/manifest.json (${assets.length} assets, ${manifest.categories.length} categories)`);
}
