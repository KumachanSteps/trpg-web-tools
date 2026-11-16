#!/usr/bin/env node
/*
 * 演出APNGメーカー — 一覧のサムネイル画像（library/<カテゴリ>/<id>/thumb.webp）を作る（Playwright が必要）。
 *   node tools/effect-apng-maker/scripts/build-thumbs.mjs [アセットID,アセットID…]
 * ページを開くたびに67本ぶんの演出をその場で描くと重いので、前もって画像にしておく。
 * アセットを足したり、見た目の初期設定を変えたりしたら実行し、そのあと build-manifest.mjs を実行する。
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    // GitHub Pages（Jekyll）と同じく、_ や . で始まるファイル・フォルダは公開されないものとして扱う
    if (path.split('/').some(seg => /^[_.]/.test(seg))) throw new Error('not published');
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
const list = await page.evaluate(() => window.__effectApngMaker.app.manifest.assets.map(a => [a.id, a.path]));

let n = 0;
for (const [id, path] of list) {
  if (only && !only.includes(id)) continue;
  const dataUrl = await page.evaluate(async id => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 144;
    c.dataset.thumb = id;
    await window.__effectApngMaker.drawPoster(c);
    return c.toDataURL('image/webp', 0.86);
  }, id);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(join(ROOT, 'tools/effect-apng-maker/library', path, 'thumb.webp'), buf);
  n++;
  console.log(`✓ ${id.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
}
await browser.close();
server.close();
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
console.log(`wrote ${n} thumbnail(s)`);
