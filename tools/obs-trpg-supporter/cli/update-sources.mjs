#!/usr/bin/env node
/**
 * OBS TRPG Supporter (Node version): exact-name Browser Source URL / Custom CSS / size updater.
 * The browser version (../index.html) does the same without Node.js and can export this config.json.
 * Defaults to read-only preview; --apply explicitly writes changes.
 * Prerequisite: OBS Studio 28+ with authenticated obs-websocket v5 enabled.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function usage() {
  console.log(`Usage: node update-sources.mjs [--config config.json] [--apply]\n\n` +
    `Default is PREVIEW (read-only). Use --apply to update matching browser sources.\n` +
    `Set OBS_WEBSOCKET_PASSWORD in your environment; never store it in a shared config.`);
}

function parseArguments(argv) {
  const out = { config: 'config.json', apply: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--apply') out.apply = true;
    else if (arg === '--config' && argv[i + 1]) out.config = argv[++i];
    else throw new Error(`Unknown / incomplete argument: ${arg}`);
  }
  return out;
}

function assertValidConfig(config) {
  if (!config || !Array.isArray(config.sources) || !config.sources.length) {
    throw new Error('Config must contain a non-empty sources array.');
  }
  if (!config.websocket?.address?.startsWith('ws://127.0.0.1:') &&
      !config.websocket?.address?.startsWith('ws://localhost:')) {
    throw new Error('This starter intentionally permits ONLY localhost OBS WebSocket addresses.');
  }
  if (!config.websocket?.passwordEnv) throw new Error('Missing websocket.passwordEnv.');
  const needsRoom = config.sources.some(item => String(item.urlTemplate || '').includes('{roomId}'));
  if (needsRoom && (!config.ccfolia?.roomId || config.ccfolia.roomId === 'YOUR_ROOM_ID')) {
    throw new Error('Set ccfolia.roomId to your actual room ID in config.json.');
  }
  const names = new Set();
  for (const item of config.sources) {
    if (!item.inputName || !item.urlTemplate) throw new Error('Each source needs inputName and urlTemplate.');
    if (names.has(item.inputName)) throw new Error(`Duplicate inputName: ${item.inputName}`);
    names.add(item.inputName);
    if (item.css != null && item.cssFile != null) {
      throw new Error(`${item.inputName}: choose one of css or cssFile, not both.`);
    }
  }
}

function renderUrl(item, config) {
  const roomId = encodeURIComponent(config.ccfolia?.roomId ?? '');
  const characterId = item.characterId ? encodeURIComponent(item.characterId) : null;
  let url = item.urlTemplate.replaceAll('{roomId}', roomId);
  if (url.includes('{characterId}')) {
    if (!characterId || characterId === 'YOUR_CHARACTER_ID') {
      throw new Error(`${item.inputName}: set a real characterId.`);
    }
    url = url.replaceAll('{characterId}', characterId);
  }
  if (/\{[^{}]+\}/.test(url)) throw new Error(`${item.inputName}: unreplaced template variable`);
  if (!isAllowedUrl(url)) {
    throw new Error(`${item.inputName}: only https://ccfolia.com/rooms/..., https://streamkit.discord.com/overlay/... ` +
      `and the OBS TRPG Supporter overlay URL are permitted.`);
  }
  return url;
}

// Same allowlist as the browser version (js/model.js checkUrl).
const OVERLAY_URL = 'https://kumachansteps.github.io/trpg-web-tools/tools/obs-trpg-supporter/overlay.html';

function isAllowedUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.username || parsed.password || parsed.protocol !== 'https:') return false;
  if (parsed.hostname === 'ccfolia.com') return parsed.pathname.startsWith('/rooms/');
  if (parsed.hostname === 'streamkit.discord.com') return parsed.pathname.startsWith('/overlay/');
  return `${parsed.origin}${parsed.pathname}` === OVERLAY_URL;
}

function toSize(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 8192 ? n : null;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) return usage();
  const configPath = path.resolve(args.config);
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  assertValidConfig(config);
  const password = process.env[config.websocket.passwordEnv];
  if (!password) throw new Error(`Set the environment variable ${config.websocket.passwordEnv}.`);

  // Dynamically load the package after validating options/config.
  const { default: OBSWebSocket } = await import('obs-websocket-js');
  const obs = new OBSWebSocket();
  let connected = false;
  try {
    await obs.connect(config.websocket.address, password);
    connected = true;
    const { inputs } = await obs.call('GetInputList');
    // Settings left at their defaults are omitted by GetInputSettings, so compare against the defaults too.
    let defaults = {};
    try {
      ({ defaultInputSettings: defaults } = await obs.call('GetInputDefaultSettings', { inputKind: 'browser_source' }));
    } catch {
      defaults = {};
    }
    const existing = new Map(inputs.map(x => [x.inputName, x]));
    const changes = [];

    // Build and validate complete plan before changing anything.
    for (const item of config.sources) {
      const input = existing.get(item.inputName);
      if (!input) throw new Error(`Missing OBS source: ${item.inputName}`);
      if (input.inputKind !== 'browser_source') {
        throw new Error(`${item.inputName} is '${input.inputKind}', not a Browser Source.`);
      }
      const { inputSettings } = await obs.call('GetInputSettings', { inputName: item.inputName });
      const next = { url: renderUrl(item, config) };
      if (typeof item.css === 'string') next.css = item.css;
      if (item.cssFile) {
        const resolved = path.resolve(path.dirname(configPath), item.cssFile);
        next.css = await fs.readFile(resolved, 'utf8');
      }
      if (toSize(item.width)) next.width = toSize(item.width);
      if (toSize(item.height)) next.height = toSize(item.height);
      const previous = Object.fromEntries(Object.keys(next).map(k => [k, inputSettings[k] ?? defaults?.[k] ?? '']));
      const changed = Object.keys(next).some(key => String(previous[key]) !== String(next[key]));
      changes.push({ name: item.inputName, previous, next, changed });
    }

    console.log(`Mode: ${args.apply ? 'APPLY' : 'PREVIEW ONLY'} | Browser Sources: ${changes.length}`);
    for (const c of changes) {
      console.log(`${c.changed ? 'CHANGE' : 'UNCHANGED'} | ${c.name}`);
      if (c.changed) console.log(`   URL: ${c.previous.url || '(none)'} => ${c.next.url}`);
      if (c.changed && c.next.css != null) console.log('   CSS: configured (content hidden from log)');
      if (c.changed && (c.next.width || c.next.height)) console.log(`   Size: ${c.next.width ?? c.previous.width}x${c.next.height ?? c.previous.height}`);
    }
    if (!args.apply) return console.log('No changes written. Rerun with --apply to apply.');

    const applied = [];
    try {
      for (const c of changes.filter(x => x.changed)) {
        await obs.call('SetInputSettings', {
          inputName: c.name,
          inputSettings: c.next,
          overlay: true
        });
        applied.push(c);
      }
      console.log(`Applied ${applied.length} source update(s).`);
    } catch (error) {
      console.error(`Apply failed. Attempting to restore ${applied.length} changed sources.`);
      for (const c of applied.reverse()) {
        try {
          const restore = { ...c.previous };
          await obs.call('SetInputSettings', {
            inputName: c.name, inputSettings: restore, overlay: true
          });
        } catch (rollbackError) {
          console.error(`Manual restoration may be required for ${c.name}: ${rollbackError.message}`);
        }
      }
      throw error;
    }
  } finally {
    if (connected) await obs.disconnect();
  }
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
