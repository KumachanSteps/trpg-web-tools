#!/usr/bin/env node
/*
 * 演出APNGメーカー — すべてのアセットを初期設定で書き出して、容量を確かめる（Playwright が必要）。
 *   node tools/effect-apng-maker/scripts/check-sizes.mjs [アセットID,アセットID…]
 * 3MB を超えたら注意、4MB を超えたら失敗にする。新しいアセットを足したら PR の前に実行する。
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const OK = 3 * 1024 * 1024;
const MAX = 4 * 1024 * 1024;

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (error) {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const port = server.address().port;

const only = process.argv[2] ? process.argv[2].split(',') : null;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${port}/tools/effect-apng-maker/`);
await page.waitForFunction(() => window.__effectApngMaker && window.__effectApngMaker.app.manifest);
const ids = await page.evaluate(() => window.__effectApngMaker.app.manifest.assets.map(a => a.id));

let failed = 0;
for (const id of ids) {
  if (only && !only.includes(id)) continue;
  const r = await page.evaluate(async id => {
    const S = window.__effectApngMaker;
    S.selectAsset(id);
    const done = new Promise(resolve => {
      const orig = URL.createObjectURL;
      URL.createObjectURL = blob => { URL.createObjectURL = orig; resolve(blob.size); return orig(blob); };
    });
    await S.exportFile('apng');
    return { size: await done, out: S.SIZES[S.app.output.size].join('×'), fps: S.app.output.fps, colors: S.app.output.colors };
  }, id);
  const mb = (r.size / 1024 / 1024).toFixed(2);
  const mark = r.size > MAX ? '✗' : r.size > OK ? '△' : '✓';
  if (r.size > MAX) failed++;
  console.log(`${mark} ${id.padEnd(28)} ${mb.padStart(5)} MB  (${r.out}, ${r.fps} fps, ${r.colors || 'full'} colours)`);
}
await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
if (failed) { console.error(`✗ ${failed} asset(s) over 4 MB at their default settings`); process.exit(1); }
console.log('✓ every asset is 4 MB or less at its default settings');
